const { DEFAULT_STATE, readState, writeSupabaseState } = require('./store');

function parsePayload(rawBody) {
  const text = (rawBody || '').toString().trim();
  if (!text) return {};

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (_) {}

  try {
    const obj = {};
    const pairs = text.split(/[&;]/);
    for (const pair of pairs) {
      if (!pair) continue;
      const index = pair.indexOf('=');
      const key = index >= 0 ? decodeURIComponent(pair.slice(0, index)) : decodeURIComponent(pair);
      const value = index >= 0 ? decodeURIComponent(pair.slice(index + 1)) : '';
      if (key) obj[key] = value;
    }
    if (Object.keys(obj).length) {
      return obj;
    }
  } catch (_) {}

  const cleaned = text.replace(/^\/login\s+/i, '').trim();
  if (cleaned) {
    return { password: cleaned };
  }

  return {};
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
    req.on('end', async () => {
      try {
        const parsed = parsePayload(body);
        const state = await writeSupabaseState(parsed);
        return res.status(200).json({ ok: true, data: state });
      } catch (err) {
        return res.status(400).json({ ok: false, error: 'Invalid JSON payload' });
      }
    });
    return;
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};
