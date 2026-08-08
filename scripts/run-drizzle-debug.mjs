import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import 'dotenv/config';

const url = process.env.DATABASE_URL;
console.log('DATABASE_URL present:', !!url);
if (url) {
  console.log('DATABASE_URL length:', url.length);
  try {
    const parsed = new URL(url);
    console.log('DATABASE_URL host:', parsed.host);
    console.log('DATABASE_URL database:', parsed.pathname.replace(/^\//, ''));
  } catch (err) {
    console.error('DATABASE_URL parse error:', err.message);
  }
}

const drizzleBin = resolve('node_modules', '.bin', 'drizzle-kit.cmd');
console.log('drizzle path:', drizzleBin);
console.log('drizzle exists:', existsSync(drizzleBin));

if (!existsSync(drizzleBin)) {
  console.error('drizzle-bin missing');
  process.exit(1);
}

const child = spawn(drizzleBin, ['migrate', '--config', 'drizzle.config.ts'], {
  env: { ...process.env, DATABASE_URL: url },
  cwd: process.cwd(),
  shell: false,
});

child.stdout.on('data', (chunk) => process.stdout.write(`STDOUT: ${chunk}`));
child.stderr.on('data', (chunk) => process.stderr.write(`STDERR: ${chunk}`));
child.on('close', (code) => {
  console.log('drizzle exit code:', code);
  process.exit(code ?? 0);
});
child.on('error', (err) => {
  console.error('spawn error:', err);
  process.exit(2);
});
