import fs from 'fs';
import path from 'path';
import { resolveFromRoot } from './project-paths.js';

class Logger {
  constructor() {
    this.logDir = resolveFromRoot('logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  _write(level, message, data) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    console.log(`[${timestamp}] ${level}: ${message}`, data || '');

    const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }

  info(message, data) {
    this._write('INFO', message, data);
  }

  error(message, data) {
    this._write('ERROR', message, data);
  }

  warn(message, data) {
    this._write('WARN', message, data);
  }

  debug(message, data) {
    this._write('DEBUG', message, data);
  }
}

export default new Logger();
