
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private static formatMessage(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const dataString = data ? `\n${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataString}`;
  }

  info(message: string, data?: any) {
    console.log(Logger.formatMessage('info', message, data));
  }

  warn(message: string, data?: any) {
    console.warn(Logger.formatMessage('warn', message, data));
  }

  error(message: string, error?: any) {
    const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    console.error(Logger.formatMessage('error', message, errorDetails));
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(Logger.formatMessage('debug', message, data));
    }
  }
}

export const logger = new Logger();
