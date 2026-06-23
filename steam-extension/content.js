// Listens for rename commands from the popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_FRIENDS') {
    sendResponse(getFriends());
    return true;
  }
  if (msg.type === 'RENAME') {
    renameFriend(msg.steamId, msg.nickname)
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // async
  }
});

function getFriends() {
  // Works on https://steamcommunity.com/id/<vanity>/friends
  // and       https://steamcommunity.com/profiles/<id>/friends
  const items = document.querySelectorAll('.friendBlock');
  const friends = [];
  for (const el of items) {
    const link = el.querySelector('a.friendBlockLinkOverlay');
    const nameEl = el.querySelector('.friendBlockContent');
    if (!link || !nameEl) continue;
    const href = link.href ?? '';
    const steamId = href.match(/profiles\/(\d+)/)?.[1] ?? null;
    const vanity  = href.match(/id\/([^/]+)/)?.[1] ?? null;
    const name = nameEl.childNodes[0]?.textContent?.trim() ?? '';
    friends.push({ steamId, vanity, name, href });
  }
  return friends;
}

async function renameFriend(steamId, nickname) {
  // Steam's internal AJAX endpoint for setting a friend nickname
  const sessionId = getCookie('sessionid');
  if (!sessionId) return { ok: false, error: 'No sessionid cookie — make sure you are logged in to Steam.' };

  const res = await fetch('https://steamcommunity.com/actions/SetNickname', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ sessionid: sessionId, steamid: steamId, nickname }),
  });

  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

  try {
    const json = await res.json();
    if (json.success === 1) return { ok: true };
    return { ok: false, error: JSON.stringify(json) };
  } catch {
    return { ok: false, error: 'Unexpected response from Steam' };
  }
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}
