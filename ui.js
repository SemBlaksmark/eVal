const info = Object.fromEntries(location.search.substr(1).split('&').map(entry => entry.split('=')));
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

let callIndex = 0;
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
  $('#calls').addEventListener('click', e => selectCall(e.target));
  $('#layers').addEventListener('click', e => selectLayer(e.target));
}

function addCall(call) {
  let id = callIndex++;
  call.layers = Object.fromEntries(Object.entries(call.layers).map(([id, layer]) =>
    [id, Object.fromEntries(Object.entries(config.keyGroups).map(([name, groupObj]) =>
      [name, Object.fromEntries(groupObj.keys.map(key => [key, layer[key]]))]))]));

  let layerContainerEl = makeEl('div', null, ['layersContainer']);
  let detailViewFragment = document.createDocumentFragment();
  layerContainerEl.dataset.callId = id;
  Object.entries(call.layers).forEach(([layerId, layer]) => {
    layerContainerEl.append(makeLayerElement(layerId, id));
    detailViewFragment.append(makeDetailElement(layer, layerId, id));
  });

  let callEl = makeCallElement(call, id);

  $('#inspect').append(detailViewFragment);
  $('#layers').append(layerContainerEl);
  $('#calls').append(callEl);
  selectCall(callEl);
}
function makeCallElement(call, id) {
  let el = makeEl('div', id, ['call', call.type]);
  el.append(makeEl('h2', null, null, call.type));
  getEvents(call.layers.dataLayer).forEach(text => {
    el.append(makeEl('div', null, null, text));
  });
  return el;
}

function makeLayerElement(id, callId) {
  let el = makeEl('div', null, ['layer'], id);
  el.dataset.layerId = id;
  el.dataset.callId = callId;
  return el;
}

function makeDetailElement(layer, layerId, callId) {
  let el = makeEl('div', null, ['detail'], JSON.stringify(layer));
  el.dataset.layerId = layerId;
  el.dataset.callId = callId;


  return el;
}

function makeEl(type, id, classes, text) {
  var el = document.createElement(type);
  if (id || id === 0) el.id = id;
  if (classes) classes.forEach(c => el.classList.add(c));
  if (text !== null && text !== undefined) el.append(document.createTextNode(text));
  return el;
}

function getEvents(dataLayer) {
  if (config.events.isGroup) {
    let events = dataLayer[config.events.key];
    if (events) return Object.values(events).reduce((list, event) => Array.isArray(event) ? [...list, ...event] : [...list, event], []);
  }
  else {
    for (let group in dataLayer) {
      let key = dataLayer[group][config.events.key];
      if (key) return Array.isArray(key) ? key : [key];
    }
  }
  return [];
}

function selectCall(el) {
  if (el.classList.contains('selected')) return;
  $('#calls .call.selected')?.classList.toggle('selected');
  el.classList.add('selected');
  $('#layers').querySelector('.layersContainer.selected')?.classList.toggle('selected');
  let container = $('#layers').querySelector(`.layersContainer[data-call-id="${el.id}"`);
  if (container) {
    container.classList.toggle('selected');
    selectLayer(container.querySelector('.layer.selected') || container.querySelector('.layer[data-layer-id="dataLayer"]'));
  }
}

function selectLayer(el) {
  let container = $(`#layers .layersContainer[data-call-id="${el.dataset.callId}"`);
  if (!el.classList.contains('selected')) {
    container.querySelector('.layer.selected')?.classList.toggle('selected');
    el.classList.add('selected');
  }
  $$('.detail').forEach(detail => {
    if (detail.dataset.callId === el.dataset.callId && detail.dataset.layerId === el.dataset.layerId) detail.classList.add('selected');
    else detail.classList.remove('selected');
  });
}