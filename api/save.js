const fs = require('fs');
const path = require('path');

const DEFAULT_STATE = {
  username: '',
  password: '',
  server: '',
  autoLogin: true,
  savedAt: null
};

function getStoragePath() {
  return path.join(process.cwd(), 'saved.json');
}

function readState() {
  try {
    const file = getStoragePath();
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(DEFAULT_STATE, null, 2));
      return { ...DEFAULT_STATE };
    }
    const raw = fs.readFileSync(file, 'utf8');
    return { ...DEFAULT_STATE, ...JSON.parse(raw || '{}') };
  } catch (_) {
    return { ...DEFAULT_STATE };
  }
}

function writeState(input) {
  const state = { ...DEFAULT_STATE, ...input, savedAt: new Date().toISOString() };
  const file = getStoragePath();
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
  return state;
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json(readState());
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const state = writeState(parsed);
        return res.status(200).json({ ok: true, data: state });
      } catch (err) {
        return res.status(400).json({ ok: false, error: 'Invalid JSON payload' });
      }
    });
    return;
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};
