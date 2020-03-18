const info = Object.fromEntries(location.search.substr(1).split('&').map(entry => entry.split('=')));
let config;

(async () => {
  document.title = `eVal ${info.host}`;

  config = await getConfig(info.account, info.profile);
  if (Object.keys(config).length === 0) alert('something\'s wrong');

  chrome.runtime.onMessage.addListener(m => {
    switch (m.command) {
      case 'addCall':
        addCall(m.call);
        break;
    }
  });

  window.addEventListener('load', windowLoaded);
  function windowLoaded() {
    let callsEl = document.querySelector('#calls');
    let layersEl = document.querySelector('#layers');
    callsEl.addEventListener('click', e => alert(e.target.textContent));
    callsEl.addEventListener('mouseover', e => {
      layersEl.style.display = 'flex';
      layersEl.textContent = e.target.dataset.layers || 'no text';
    });
  }
})();

async function getConfig(account, profile) {
  let stored = await storageFetch('config');
  let accountCfg = stored && stored[account];

  if (accountCfg && accountCfg.default) {
    if (accountCfg[profile]) return accountCfg[profile].override ? accountCfg[profile] : Object.assign(accountCfg.default, accountCfg[profile]);
    return accountCfg.default;
  }
  return {};
}

async function storageFetch(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, stored => resolve(stored[key]));
  });
}

function addCall(call) {
  var el = document.createElement('button');
  el.textContent = call.type;
  el.dataset.layers = Object.keys(call);
  document.querySelector('#calls').append(el);
}
