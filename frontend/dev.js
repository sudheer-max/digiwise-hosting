import { spawn } from 'child_process';

const args = process.argv.slice(2);
const filteredArgs = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--host') {
    if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
      i++;
    }
    continue;
  }
  if (args[i].startsWith('--host=')) {
    continue;
  }
  filteredArgs.push(args[i]);
}

if (!filteredArgs.includes('dev')) {
  filteredArgs.unshift('dev');
}

if (!filteredArgs.includes('-p') && !filteredArgs.includes('--port')) {
  filteredArgs.push('-p', '3000');
}

if (!filteredArgs.includes('-H') && !filteredArgs.includes('--hostname')) {
  filteredArgs.push('-H', '0.0.0.0');
}

console.log('[Dev Wrapper] Launching next with args:', filteredArgs);

const child = spawn('npx', ['next', ...filteredArgs], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
