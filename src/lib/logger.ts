type LogLevel = "INFO" | "WARN" | "ERROR";

type LogContext = Record<string, unknown>;

const toPayload = (level: LogLevel, message: string, context?: LogContext, error?: unknown) => {
  const payload: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (context) {
    payload.context = context;
  }

  if (error) {
    payload.error = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;
  }

  return payload;
};

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(toPayload("INFO", message, context));
  },

  warn(message: string, context?: LogContext) {
    console.warn(toPayload("WARN", message, context));
  },

  error(message: string, error?: unknown, context?: LogContext) {
    console.error(toPayload("ERROR", message, context, error));
  },
};
