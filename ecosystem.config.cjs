const fs = require('fs');
const path = require('path');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
    .reduce((acc, line) => {
      const index = line.indexOf('=');
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      if (key) {
        acc[key] = value;
      }
      return acc;
    }, {});
}

const rootDir = __dirname;
const envFromFile = readEnvFile(path.join(rootDir, '.env'));

module.exports = {
  apps: [
    {
      name: 'ai-game',
      cwd: rootDir,
      script: './src/server.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      time: true,
      max_restarts: 10,
      restart_delay: 5000,
      kill_timeout: 10000,
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
      env: {
        ...envFromFile,
        NODE_ENV: 'production',
        HOST: envFromFile.HOST || '0.0.0.0'
      }
    }
  ]
};
