const fs = require('fs');
const path = require('path');

const defaultState = {
  username: '',
  password: '',
  server: '',
  autoLogin: false,
  savedAt: null
};

function getAuthFilePath() {
  return path.join(process.cwd(), 'data', 'auth.json');
}

function readState() {
  const filePath = getAuthFilePath();
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultState, null, 2));
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return { ...defaultState, ...parsed };
  } catch (err) {
    return { ...defaultState };
  }
}

function writeState(nextState) {
  const filePath = getAuthFilePath();
  const state = {
    ...defaultState,
    ...nextState,
    savedAt: new Date().toISOString()
  };

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  return state;
}

module.exports = async function handler(req, res) {
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
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }

      const parsed = body ? JSON.parse(body) : {};
      const state = writeState(parsed);
      return res.status(200).json({ ok: true, data: state });
    } catch (err) {
      return res.status(400).json({ ok: false, error: 'Invalid JSON payload' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};
