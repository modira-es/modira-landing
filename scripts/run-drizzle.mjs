import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is missing. Check .env or your environment.');
  process.exit(1);
}

const drizzlePath = resolve('node_modules', '.bin', 'drizzle-kit.cmd');
console.log('Using DATABASE_URL:', url.startsWith('postgresql://') ? '[redacted]' : url);
console.log('Running drizzle-kit from', drizzlePath);

const child = spawn('cmd.exe', ['/c', drizzlePath, 'migrate', '--config', 'drizzle.config.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: url,
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('Failed to spawn drizzle-kit:', error);
  process.exit(2);
});
