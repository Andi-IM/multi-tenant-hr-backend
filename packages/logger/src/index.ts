import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

const sensitiveFields = [
  "password",
  "passwordHash",
  "token",
  "refreshToken",
  "secret",
  "authorization",
];

function maskSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (
      sensitiveFields.some((field) =>
        key.toLowerCase().includes(field.toLowerCase()),
      )
    ) {
      masked[key] = "[REDACTED]";
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      masked[key] = maskSensitive(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    log: (obj) => {
      return maskSensitive(obj as Record<string, unknown>);
    },
  },
});

export const createChildLogger = (service: string) => {
  return logger.child({ service });
};

export const auditLogger = pino({
  level: "info",
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});
