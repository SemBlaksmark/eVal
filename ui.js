const info = Object.fromEntries(location.search.substr(1).split('&').map(entry => entry.split('=')));
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

let config;

(async () => {
  document.title = `eVal ${info.host}`;

  config = await getConfig(info.account, info.profile);
  if (Object.keys(config).length === 0) alert('something\'s wrong');

  chrome.runtime.onMessage.addListener(messageListener);
  window.addEventListener('load', windowLoaded);
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

function messageListener(m) {
  switch (m.command) {
    case 'addCall':
      addCall(m.call);
      break;
  }
}

function windowLoaded() {
  let callsEl = $('#calls');
  let layersEl = $('#layers');
  callsEl.addEventListener('click', e => alert(e.target.textContent));
  callsEl.addEventListener('mouseover', e => {
    layersEl.style.display = 'flex';
    layersEl.textContent = e.target.dataset.layers || 'no text';
  });
}

function addCall(call) {
  var el = makeEl('div', null, ['call', call.type]);

  [call.type, ...getEvents(call)].forEach(text => {
    el.append(makeEl('div', null, null, text));
  })

  el.dataset.layers = Object.keys(call);
  $('#calls').append(el);
}

function makeEl(type, id, classes, text) {
  var el = document.createElement(type);
  if (id) el.id = id;
  if (classes) classes.forEach(c => el.classList.add(c));
  if (text) el.append(document.createTextNode(text));
  return el;
}

function getEvents(call) {
  if (config.events.isGroup) {
    return config.keyGroups[config.events.key].keys.reduce((events, key) => {
      let value = call.dataLayer[key];
      Array.isArray(value) ? events.push(...value) : events.push(value);
      return events;
     }, [])
  }
  else {
    let value = call.dataLayer[key];
    return Array.isArray(value) ? value : [value];
  }
}