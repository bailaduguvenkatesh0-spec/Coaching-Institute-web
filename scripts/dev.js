import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('\n======================================================');
console.log('  TEAM B COACHING INSTITUTE — AI AUTOMATION PLATFORM  ');
console.log('======================================================');
console.log('Starting API Server (:4000) & Vite Web App (:5173)...\n');

const api = spawn(npmCmd, ['run', 'dev:api'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

const web = spawn(npmCmd, ['run', 'dev:web'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

function handleExit() {
  try {
    api.kill();
  } catch {}
  try {
    web.kill();
  } catch {}
  process.exit();
}

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
