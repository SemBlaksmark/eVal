let info = Object.fromEntries(location.search.substr(1).split('&').map(entry => entry.split('=')));
document.title = `eVal ${info.host}`;

const profileConfig = getConfig(info.account, info.profile);
if (!profileConfig.default) alert('no default account configuration found');

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

function getConfig(account, profile) {
  let config;
  (async () => { config = await storageFetch('config'); })();

  config = config[account];
  if (config && config.default) {
    if (config[profile]) return config[profile].override ? config[profile] : Object.assign(config.default, config[profile]);
    return config.default;
  }
  return {};

  /* Helper function */
  async function storageFetch(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, stored => resolve(stored[key]));
    });
  }
}

function addCall(call) {
  var el = document.createElement('button');
  el.textContent = call.type;
  el.dataset.layers = Object.keys(call);
  document.querySelector('#calls').append(el);
}
