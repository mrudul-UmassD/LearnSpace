import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const parsedBaseUrl = new URL(baseUrl);
const port = Number(process.env.SMOKE_PORT ?? parsedBaseUrl.port ?? 3000);
const shouldStartServer = process.env.SMOKE_NO_START !== 'true';
const smokeMode = process.env.SMOKE_MODE ?? 'dev';

function npmBin() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function spawnNpm(args, options) {
  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/d', '/s', '/c', npmBin(), ...args], options);
  }
  return spawn(npmBin(), args, options);
}

async function prismaGenerate(schemaPath) {
  await new Promise((resolvePromise, rejectPromise) => {
    const proc = spawnNpm(['exec', '--', 'prisma', 'generate', '--schema', schemaPath], {
      stdio: 'inherit',
      env: process.env,
    });
    proc.on('error', rejectPromise);
    proc.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`prisma generate failed with exit code ${code}`));
    });
  });
}

async function killProcessTree(proc) {
  if (!proc?.pid) return;

  if (process.platform === 'win32') {
    await new Promise((resolvePromise) => {
      const killer = spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F'], {
        stdio: 'ignore',
      });
      killer.on('exit', () => resolvePromise());
      killer.on('error', () => resolvePromise());
    });
    return;
  }

  try {
    process.kill(-proc.pid, 'SIGTERM');
  } catch {
    try {
      proc.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
}

function cookieHeaderFromJar(jar) {
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function splitSetCookieHeader(value) {
  const cookies = [];
  const lower = value.toLowerCase();
  let start = 0;
  let inExpires = false;

  for (let i = 0; i < value.length; i++) {
    if (!inExpires && lower.startsWith('expires=', i)) {
      inExpires = true;
      continue;
    }
    if (inExpires && value[i] === ';') {
      inExpires = false;
      continue;
    }
    if (!inExpires && value[i] === ',') {
      const part = value.slice(start, i).trim();
      if (part) cookies.push(part);
      start = i + 1;
    }
  }

  const last = value.slice(start).trim();
  if (last) cookies.push(last);
  return cookies;
}

function updateJarFromResponse(jar, response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  let setCookies = typeof getSetCookie === 'function' ? getSetCookie() : [];
  if (setCookies.length === 0) {
    const combined = response.headers.get('set-cookie');
    if (combined) setCookies = splitSetCookieHeader(combined);
  }

  for (const cookie of setCookies) {
    const firstPart = cookie.split(';', 1)[0];
    const eq = firstPart.indexOf('=');
    if (eq <= 0) continue;
    const name = firstPart.slice(0, eq).trim();
    const value = firstPart.slice(eq + 1);
    jar.set(name, value);
  }
}

async function fetchWithJar(url, init, jar) {
  const headers = new Headers(init?.headers ?? undefined);
  const cookie = cookieHeaderFromJar(jar);
  if (cookie) headers.set('cookie', cookie);

  const response = await fetch(url, { ...init, headers });
  updateJarFromResponse(jar, response);
  return response;
}

async function waitForHealthy(url, timeoutMs = 60_000) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return;
      lastError = new Error(`Health returned ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await delay(750);
  }
  throw new Error(`Timed out waiting for server health: ${lastError?.message ?? 'unknown error'}`);
}

function formEncode(obj) {
  return new URLSearchParams(Object.entries(obj).map(([k, v]) => [k, String(v)])).toString();
}

let child;
const jar = new Map();
let stoppingServer = false;

async function main() {
  if (shouldStartServer) {
    const schemaPath = smokeMode === 'prod' ? 'prisma/schema.postgres.prisma' : 'prisma/schema.prisma';
    await prismaGenerate(schemaPath);

    if (smokeMode === 'prod') {
      const standaloneServer = resolve('.next/standalone/server.js');
      if (!existsSync(standaloneServer)) {
        throw new Error(
          'SMOKE_MODE=prod requires a standalone build. Run `npm run build:prod` first.'
        );
      }

      child = spawn(process.execPath, [standaloneServer], {
        stdio: 'inherit',
        detached: process.platform !== 'win32',
        env: {
          ...process.env,
          PORT: String(port),
          HOSTNAME: '127.0.0.1',
          NODE_ENV: 'production',
          NEXTAUTH_URL: baseUrl,
        },
      });
    } else {
      try {
        rmSync(resolve('.next/dev/lock'), { force: true });
      } catch {
        // ignore
      }
      const args = ['run', 'dev', '--', '-p', String(port)];
      child = spawnNpm(args, {
        stdio: 'inherit',
        detached: process.platform !== 'win32',
        env: {
          ...process.env,
          PORT: String(port),
          NODE_ENV: 'development',
          NEXTAUTH_URL: baseUrl,
        },
      });
    }

    child.on('exit', (code) => {
      if (!stoppingServer && code && code !== 0) {
        console.error(`[auth-smoke] server process exited with code ${code}`);
      }
    });
  }

  const healthUrl = new URL('/api/health', parsedBaseUrl);
  await waitForHealthy(healthUrl.toString());

  const email = `smoke.${Date.now()}@pyquest.dev`;
  const password = 'password123';
  const name = 'Smoke Test';

  const signupUrl = new URL('/api/auth/signup', parsedBaseUrl);
  const signupRes = await fetchWithJar(
    signupUrl,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    },
    jar
  );
  if (!signupRes.ok) {
    const body = await signupRes.text().catch(() => '');
    throw new Error(`Signup failed (${signupRes.status}): ${body}`);
  }

  const csrfUrl = new URL('/api/auth/csrf', parsedBaseUrl);
  const csrfRes = await fetchWithJar(csrfUrl, { method: 'GET' }, jar);
  if (!csrfRes.ok) {
    throw new Error(`CSRF failed (${csrfRes.status})`);
  }
  const { csrfToken } = await csrfRes.json();
  if (!csrfToken) throw new Error('CSRF token missing in response');

  const callbackUrl = new URL('/dashboard', parsedBaseUrl).toString();
  const signInUrl = new URL('/api/auth/callback/credentials', parsedBaseUrl);
  const signInRes = await fetchWithJar(
    signInUrl,
    {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formEncode({ csrfToken, email, password, callbackUrl, json: 'true' }),
    },
    jar
  );

  if (!(signInRes.status === 302 || signInRes.status === 303)) {
    const body = await signInRes.text().catch(() => '');
    throw new Error(`Sign-in failed (${signInRes.status}): ${body}`);
  }

  const sessionUrl = new URL('/api/auth/session', parsedBaseUrl);
  const sessionRes = await fetchWithJar(sessionUrl, { method: 'GET' }, jar);
  if (!sessionRes.ok) {
    throw new Error(`Session check failed (${sessionRes.status})`);
  }
  const session = await sessionRes.json();
  if (!session?.user?.email) {
    throw new Error(`Session missing user after login: ${JSON.stringify(session)}`);
  }
  if (session.user.email !== email) {
    throw new Error(`Session email mismatch (expected ${email}, got ${session.user.email})`);
  }

  const dashboardUrl = new URL('/dashboard', parsedBaseUrl);
  const dashRes = await fetchWithJar(dashboardUrl, { method: 'GET', redirect: 'manual' }, jar);
  if (!dashRes.ok) {
    throw new Error(`Dashboard check failed (${dashRes.status})`);
  }

  const csrfRes2 = await fetchWithJar(csrfUrl, { method: 'GET' }, jar);
  const { csrfToken: csrfToken2 } = await csrfRes2.json();
  if (!csrfToken2) throw new Error('Second CSRF token missing');

  const signOutUrl = new URL('/api/auth/signout', parsedBaseUrl);
  const signOutRes = await fetchWithJar(
    signOutUrl,
    {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formEncode({ csrfToken: csrfToken2, callbackUrl: new URL('/auth/signin', parsedBaseUrl).toString(), json: 'true' }),
    },
    jar
  );
  if (!(signOutRes.status === 302 || signOutRes.status === 303)) {
    const body = await signOutRes.text().catch(() => '');
    throw new Error(`Sign-out failed (${signOutRes.status}): ${body}`);
  }

  const sessionAfterRes = await fetchWithJar(sessionUrl, { method: 'GET' }, jar);
  const sessionAfter = await sessionAfterRes.json().catch(() => null);
  if (sessionAfter?.user) {
    throw new Error(`Expected no session after logout, got: ${JSON.stringify(sessionAfter)}`);
  }
}

try {
  await main();
  console.log('[auth-smoke] OK');
  process.exitCode = 0;
} catch (err) {
  console.error('[auth-smoke] FAIL:', err?.stack || err);
  process.exitCode = 1;
} finally {
  if (child) {
    stoppingServer = true;
    await killProcessTree(child);
  }
}
