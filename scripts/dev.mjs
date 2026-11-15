import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

import net from 'net';
import os from 'os';

function getLocalIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }
  return addresses;
}

function checkPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') resolve(true);
        else resolve(false);
      })
      .once('listening', () => {
        tester.once('close', () => resolve(false)).close();
      })
      .listen(port);
  });
}

const apiPort = parseInt(process.env.PORT || '4000', 10);
const webPort = parseInt(process.env.FRONTEND_PORT || '5173', 10);

console.log('\n======================================================');
console.log('  TEAM B COACHING INSTITUTE — AI AUTOMATION PLATFORM  ');
console.log('======================================================');

const isApiOccupied = await checkPortInUse(apiPort);
if (isApiOccupied) {
  console.warn(`⚠️  Notice: Port ${apiPort} appears to be in use by another process.`);
  console.warn(`    If a previous API instance is already running, dev:api will warn or fail.`);
  console.warn(`    To use a custom port, set PORT in your .env file.\n`);
}

const isWebOccupied = await checkPortInUse(webPort);
if (isWebOccupied) {
  console.warn(`⚠️  Notice: Port ${webPort} is currently in use.`);
  console.warn(`    Vite will automatically bind to the next available port.\n`);
}

console.log(`Starting API Server (:${apiPort}) & Vite Web App (:${webPort})...\n`);

const localIPs = getLocalIPv4Addresses();
console.log('  ➜  Localhost Access (This Laptop):');
console.log(`     • Web App:      http://localhost:${webPort}`);
console.log(`     • Backend API:  http://localhost:${apiPort}/api/health`);
if (localIPs.length > 0) {
  console.log('\n  ➜  Network Access (Same Wi-Fi Phones / Devices):');
  for (const item of localIPs) {
    console.log(`     • [${item.name}]: http://${item.address}:${webPort}`);
  }
}
console.log('\n======================================================\n');

const api = spawn(npmCmd, ['run', 'dev:api'], {
  cwd: rootDir,
  stdio: ['ignore', 'inherit', 'inherit'],
  shell: true,
});

const web = spawn(npmCmd, ['run', 'dev:web'], {
  cwd: rootDir,
  stdio: ['ignore', 'inherit', 'inherit'],
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
