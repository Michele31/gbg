const listEl       = document.getElementById('list');
const btnRename    = document.getElementById('btnRename');
const btnClear     = document.getElementById('btnClear');
const statusEl     = document.getElementById('status');
const logEl        = document.getElementById('log');
const friendCount  = document.getElementById('friendCount');

// Persist the list across popup opens
chrome.storage.local.get('nicklist', ({ nicklist }) => {
  if (nicklist) listEl.value = nicklist;
});
listEl.addEventListener('input', () => {
  chrome.storage.local.set({ nicklist: listEl.value });
});

btnClear.addEventListener('click', () => {
  listEl.value = '';
  chrome.storage.local.remove('nicklist');
  setStatus('Cleared.', 'info');
  logEl.style.display = 'none';
  logEl.innerHTML = '';
});

btnRename.addEventListener('click', async () => {
  const entries = parseList(listEl.value);
  if (entries.length === 0) {
    setStatus('❌ No valid entries found.', 'err');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes('steamcommunity.com')) {
    setStatus('❌ Please open a Steam page first (steamcommunity.com).', 'err');
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
      addLog(`❌ ${steamId} → ${nickname}  (${result?.error ?? 'unknown error'})`, 'err');
    }
    // Small delay to avoid hammering Steam's API
    await sleep(400);
  }

  setStatus(`Done — ✅ ${ok} renamed, ❌ ${fail} failed.`, ok > 0 ? 'ok' : 'err');
  btnRename.disabled = false;
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseList(raw) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const sep = line.includes('|') ? '|' : ',';
      const [id, ...rest] = line.split(sep);
      const steamId = id.trim();
      const nickname = rest.join(sep).trim();
      if (!steamId || !nickname) return null;
      // Must be a 17-digit SteamID64
      if (!/^\d{17}$/.test(steamId)) return null;
      return { steamId, nickname };
    })
    .filter(Boolean);
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
