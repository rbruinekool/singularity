import pino from 'pino';

// Determine log level from environment variable, default to 'info'
const getLogLevel = () => {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  if (['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(level || '')) {
    return level;
  }
  return 'info'; // default
};

// Create logger with pretty printing for development
export const logger = pino({
  level: getLogLevel(),
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      messageFormat: '{msg}',
    }
  }
});

// Helper function to create context-specific loggers
export const createLogger = (context: string) => {
  return logger.child({ context });
};

// Helper function to change log level at runtime
export const setLogLevel = (level: string) => {
  logger.level = level;
};
