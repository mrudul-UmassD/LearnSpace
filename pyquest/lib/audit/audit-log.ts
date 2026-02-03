import fs from 'fs/promises';
import path from 'path';

export type AuditEvent = {
  ts: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  requestId?: string;
  route?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  questId?: string;
  runnerStatus?: number;
  errorCode?: string;
  message?: string;
  meta?: Record<string, unknown>;
};

function shouldWriteToFile() {
  return process.env.AUDIT_LOG_TO_FILE === 'true';
}

function auditLogPath() {
  return process.env.AUDIT_LOG_PATH || path.join(process.cwd(), 'logs', 'audit-runner-errors.log');
}

export async function writeAuditEvent(event: AuditEvent): Promise<void> {
  const line = JSON.stringify(event);

  // Always emit to server logs (structured).
  if (event.level === 'error') {
    console.error(line);
  } else if (event.level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }

  if (!shouldWriteToFile()) return;

  try {
    const filePath = auditLogPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, line + '\n', 'utf8');
  } catch {
    // Ignore file logging errors; console logging already happened.
  }
}
