const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function normalizeToSupabase(input) {
  const state = { ...DEFAULT_STATE, ...input };
  return {
    id: 'default',
    username: state.username || '',
    password: state.password || '',
    server: state.server || '',
    auto_login: !!state.autoLogin,
    saved_at: state.savedAt || new Date().toISOString()
  };
}

function normalizeFromSupabase(row) {
  if (!row) return { ...DEFAULT_STATE };
  return {
    username: row.username || '',
    password: row.password || '',
    server: row.server || '',
    autoLogin: row.auto_login !== false,
    savedAt: row.saved_at || null
  };
}

async function readSupabaseState() {
  const client = getSupabaseClient();
  if (!client) return readState();

  const { data, error } = await client
    .from('saved_auth')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (error || !data) {
    return readState();
  }

  return normalizeFromSupabase(data);
}

async function writeSupabaseState(input) {
  const client = getSupabaseClient();
  if (!client) return writeState(input);

  const row = normalizeToSupabase(input);
  const { error } = await client
    .from('saved_auth')
    .upsert(row, { onConflict: 'id' });

  if (error) {
    return writeState(input);
  }

  return normalizeFromSupabase(row);
}

module.exports = {
  DEFAULT_STATE,
  readState,
  writeState,
  readSupabaseState,
  writeSupabaseState,
  getStoragePath,
  getSupabaseClient
};
