const { spawn } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const rootDir = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

function createLogger(tag, color) {
  return function (data) {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim().length > 0) {
        console.log(`${color}${colors.bold}[${tag}]${colors.reset} ${line}`);
      }
    });
  };
}

console.log(`${colors.green}${colors.bold}🚀 Starting SACODECO Construction ERP (API + Web Frontend)...${colors.reset}\n`);

// 1. Spawn NestJS API
const apiLog = createLogger('API', colors.cyan);
const apiProcess = spawn(npmCmd, ['--prefix', 'apps/api', 'run', 'start:dev'], {
  cwd: rootDir,
  shell: true,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, FORCE_COLOR: '1' },
});

apiProcess.stdout.on('data', apiLog);
apiProcess.stderr.on('data', apiLog);

apiProcess.on('error', (err) => {
  console.error(`${colors.red}${colors.bold}[API ERROR]${colors.reset}`, err);
});

apiProcess.on('exit', (code, signal) => {
  if (code !== 0 && code !== null) {
    console.error(`${colors.red}${colors.bold}[API EXITED]${colors.reset} Process terminated with code: ${code}, signal: ${signal}`);
  } else {
    console.log(`${colors.yellow}[API SHUTDOWN]${colors.reset} API process exited normally.`);
  }
});

// 2. Spawn Vite Web Frontend
const webLog = createLogger('WEB', colors.magenta);
const webProcess = spawn(npmCmd, ['--prefix', 'apps/web', 'run', 'dev'], {
  cwd: rootDir,
  shell: true,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, FORCE_COLOR: '1' },
});

webProcess.stdout.on('data', webLog);
webProcess.stderr.on('data', webLog);

webProcess.on('error', (err) => {
  console.error(`${colors.red}${colors.bold}[WEB ERROR]${colors.reset}`, err);
});

webProcess.on('exit', (code, signal) => {
  if (code !== 0 && code !== null) {
    console.error(`${colors.red}${colors.bold}[WEB EXITED]${colors.reset} Process terminated with code: ${code}, signal: ${signal}`);
  } else {
    console.log(`${colors.yellow}[WEB SHUTDOWN]${colors.reset} Web process exited normally.`);
  }
});

// Graceful termination
function cleanup() {
  console.log(`\n${colors.yellow}Shutting down processes gracefully...${colors.reset}`);
  try {
    if (isWindows) {
      if (apiProcess.pid) spawn('taskkill', ['/pid', apiProcess.pid, '/f', '/t']);
      if (webProcess.pid) spawn('taskkill', ['/pid', webProcess.pid, '/f', '/t']);
    } else {
      apiProcess.kill('SIGTERM');
      webProcess.kill('SIGTERM');
    }
  } catch (e) {
    // ignore
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
