const { DEFAULT_STATE, readState, writeSupabaseState } = require('./store');

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
        const parsed = JSON.parse(body || '{}');
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
