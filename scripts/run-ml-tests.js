'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const mlDir = path.join(__dirname, '..', 'ml-service');
const env = {
  ...process.env,
  PYTHONPATH: path.join(mlDir, 'src'),
  PYTEST_DISABLE_PLUGIN_AUTOLOAD: '1'
};

const isWin = process.platform === 'win32';
const candidates = isWin
  ? [
      ['py', ['-3', '-m', 'pytest', 'tests', '-q']],
      ['python', ['-m', 'pytest', 'tests', '-q']],
      ['python3', ['-m', 'pytest', 'tests', '-q']]
    ]
  : [
      ['python3', ['-m', 'pytest', 'tests', '-q']],
      ['python', ['-m', 'pytest', 'tests', '-q']]
    ];

let last = { status: 1, error: { code: 'ENOENT' } };
for (const [cmd, args] of candidates) {
  last = spawnSync(cmd, args, { cwd: mlDir, env, stdio: 'inherit' });
  if (last.error && last.error.code === 'ENOENT') continue;
  if (last.status === 0) process.exit(0);
}

if (last.error && last.error.code === 'ENOENT') {
  console.error('No Python interpreter found. Install Python 3 and pytest (pip install -r ml-service/requirements-dev.txt).');
  process.exit(1);
}

process.exit(last.status === null ? 1 : last.status);
