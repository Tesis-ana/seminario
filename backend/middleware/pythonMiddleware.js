const { spawn } = require('child_process');
const path = require('path');

function runPython(req, res, next) {
  const scriptPath = path.join(__dirname, '..', '..', 'categorizador', 'PWAT.py');
  const python = spawn('python3', [scriptPath]);

  let stdout = '';
  let stderr = '';

  python.stdout.on('data', data => {
    stdout += data.toString();
  });

  python.stderr.on('data', data => {
    stderr += data.toString();
  });

  python.on('close', code => {
    if (code !== 0) {
      req.pythonError = stderr || `Python process exited with code ${code}`;
    } else {
      req.pythonOutput = stdout.trim();
    }
    next();
  });
}

module.exports = runPython;
