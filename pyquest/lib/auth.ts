import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db/prisma';
import { assertRequiredServerEnv } from '@/lib/env';
import bcrypt from 'bcryptjs';
import type { NextAuthConfig } from 'next-auth';

if (process.env.NEXT_RUNTIME === 'nodejs') {
  assertRequiredServerEnv();
}

const authAdapter = PrismaAdapter(prisma);

const authDebug = process.env.NEXTAUTH_DEBUG === 'true';
const authUrl = process.env.NEXTAUTH_URL;
const hasSecret = !!process.env.NEXTAUTH_SECRET;
const useSecureCookies = (authUrl?.startsWith('https://') ?? false) || process.env.NODE_ENV === 'production';

if (authDebug) {
  console.info('[auth][config] NEXTAUTH_DEBUG enabled');
  console.info('[auth][config] NEXTAUTH_URL:', authUrl || 'missing');
  console.info('[auth][config] NEXTAUTH_SECRET present:', hasSecret);
  console.info('[auth][config] DATABASE_URL prefix:', (process.env.DATABASE_URL || '').split(':')[0] || 'missing');
  console.info('[auth][config] adapter: PrismaAdapter');
}

export const authConfig: NextAuthConfig = {
  adapter: authAdapter,
  trustHost: true,
  useSecureCookies,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          if (authDebug) console.warn('[auth][authorize] Missing credentials');
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email as string,
            },
          });

          if (!user || !user.password) {
            if (authDebug) console.warn('[auth][authorize] User not found or missing password');
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isPasswordValid) {
            if (authDebug) console.warn('[auth][authorize] Invalid password');
            return null;
          }

          if (authDebug) console.info('[auth][authorize] Success for', user.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error('[auth][authorize] Error querying user', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  debug: authDebug,
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  logger: {
    error(error) {
      console.error('[auth][logger][error]', error);
    },
    warn(code) {
      console.warn('[auth][logger][warn]', code);
    },
    debug(message, metadata) {
      if (authDebug) console.debug('[auth][logger][debug]', message, metadata);
    },
  },
  events: {
    async signIn(message) {
      if (authDebug) console.info('[auth][event][signIn]', message?.user?.email || 'unknown');
    },
    async createUser(message) {
      if (authDebug) console.info('[auth][event][createUser]', message?.user?.email || 'unknown');
    },
    async session(message) {
      if (authDebug) console.info('[auth][event][session]', message?.session?.user?.email || 'unknown');
    },
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;

      try {
        const parsed = new URL(url);
        const baseOrigin = new URL(baseUrl).origin;
        if (parsed.origin === baseOrigin) return url;
      } catch {
        // ignore
      }

      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      if (authDebug) console.info('[auth][callback][jwt]', { hasUser: !!user, userId: token.id });
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      if (authDebug) console.info('[auth][callback][session]', { userId: session.user?.id });
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Export authOptions for compatibility with getServerSession
export const authOptions = authConfig;
