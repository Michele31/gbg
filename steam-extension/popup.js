const listEl      = document.getElementById('list');
const btnRename   = document.getElementById('btnRename');
const btnClear    = document.getElementById('btnClear');
const btnFetch    = document.getElementById('btnFetch');
const btnSettings = document.getElementById('btnSettings');
const btnSave     = document.getElementById('btnSaveSettings');
const btnBack     = document.getElementById('btnBackFromSettings');
const statusEl    = document.getElementById('status');
const logEl       = document.getElementById('log');
const apiUrlEl    = document.getElementById('apiUrl');
const apiKeyEl    = document.getElementById('apiKey');
const prefixEl    = document.getElementById('prefix');
const mainPanel   = document.getElementById('mainPanel');
const settingsPanel = document.getElementById('settingsPanel');

// ── Load saved settings ───────────────────────────────────────────────────────
chrome.storage.local.get(['nicklist', 'apiUrl', 'apiKey', 'prefix'], (data) => {
  if (data.nicklist) listEl.value = data.nicklist;
  if (data.apiUrl)   apiUrlEl.value = data.apiUrl;
  if (data.apiKey)   apiKeyEl.value = data.apiKey;
  if (data.prefix !== undefined) prefixEl.value = data.prefix;
});

listEl.addEventListener('input', () => chrome.storage.local.set({ nicklist: listEl.value }));

// ── Settings panel ────────────────────────────────────────────────────────────
btnSettings.addEventListener('click', () => {
  mainPanel.classList.add('hidden');
  settingsPanel.classList.add('open');
});

btnBack.addEventListener('click', () => {
  mainPanel.classList.remove('hidden');
  settingsPanel.classList.remove('open');
});

btnSave.addEventListener('click', () => {
  chrome.storage.local.set({
    apiUrl:  apiUrlEl.value.trim().replace(/\/$/, ''),
    apiKey:  apiKeyEl.value.trim(),
    prefix:  prefixEl.value,
  });
  mainPanel.classList.remove('hidden');
  settingsPanel.classList.remove('open');
  setStatus('✅ Settings saved.', 'ok');
});

// ── Fetch roster from bot API ─────────────────────────────────────────────────
btnFetch.addEventListener('click', async () => {
  const { apiUrl, apiKey, prefix } = await getSettings();
  if (!apiUrl) {
    setStatus('❌ Set the Bot API URL in settings (🔧) first.', 'err');
    return;
  }

  btnFetch.disabled = true;
  setStatus('⏳ Fetching roster…', 'info');

  try {
    const res = await fetch(`${apiUrl}/roster`, {
      headers: apiKey ? { 'x-api-key': apiKey } : {},
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const players = await res.json();

    if (!players.length) {
      setStatus('⚠️ Roster is empty — no members registered yet.', 'info');
      btnFetch.disabled = false;
      return;
    }

    // Build the list: only players whose steam URL contains a SteamID64
    const lines = [];
    const skipped = [];

    for (const p of players) {
      const id = extractSteamId(p.steam);
      const nick = (prefix ?? 'GBG.') + p.username;
      if (id) {
        lines.push(`${id} | ${nick}`);
      } else {
        skipped.push(p.username);
      }
    }

    listEl.value = lines.join('\n');
    chrome.storage.local.set({ nicklist: listEl.value });

    const msg = skipped.length
      ? `✅ ${lines.length} fetched. ⚠️ ${skipped.length} skipped (no SteamID64): ${skipped.join(', ')}`
      : `✅ ${lines.length} members loaded from roster.`;
    setStatus(msg, 'ok');
  } catch (e) {
    setStatus(`❌ Failed to fetch: ${e.message}`, 'err');
  }

  btnFetch.disabled = false;
});

// ── Clear ─────────────────────────────────────────────────────────────────────
btnClear.addEventListener('click', () => {
  listEl.value = '';
  chrome.storage.local.remove('nicklist');
  logEl.style.display = 'none';
  logEl.innerHTML = '';
  setStatus('Cleared.', 'info');
});

// ── Rename ────────────────────────────────────────────────────────────────────
btnRename.addEventListener('click', async () => {
  const entries = parseList(listEl.value);
  if (!entries.length) {
    setStatus('❌ No valid entries. Make sure to use SteamID64 (17 digits).', 'err');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes('steamcommunity.com')) {
    setStatus('❌ Open any steamcommunity.com page first, then try again.', 'err');
    return;
  }

  btnRename.disabled = true;
  logEl.style.display = 'block';
  logEl.innerHTML = '';
  setStatus(`⏳ Renaming ${entries.length} friend(s)…`, 'info');

  let ok = 0, fail = 0;

  for (const { steamId, nickname } of entries) {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'RENAME', steamId, nickname });
    if (result?.ok) {
      ok++;
      addLog(`✅ ${steamId} → ${nickname}`, 'ok');
    } else {
      fail++;
      addLog(`❌ ${steamId} — ${result?.error ?? 'unknown error'}`, 'err');
    }
    await sleep(400);
  }

  setStatus(`Done — ✅ ${ok} renamed  ❌ ${fail} failed`, ok > 0 ? 'ok' : 'err');
  btnRename.disabled = false;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractSteamId(steamUrl) {
  const m = steamUrl.match(/profiles\/(\d{17})/);
  return m ? m[1] : null;
}

function parseList(raw) {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [id, ...rest] = l.split('|');
      const steamId  = id.trim();
      const nickname = rest.join('|').trim();
      if (!/^\d{17}$/.test(steamId) || !nickname) return null;
      return { steamId, nickname };
    })
    .filter(Boolean);
}

function getSettings() {
  return new Promise((resolve) =>
    chrome.storage.local.get(['apiUrl', 'apiKey', 'prefix'], resolve),
  );
}

function setStatus(msg, cls) {
  statusEl.textContent = msg;
  statusEl.className = cls;
}

function addLog(msg, cls) {
  const p = document.createElement('p');
  p.textContent = msg;
  p.className = cls;
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
