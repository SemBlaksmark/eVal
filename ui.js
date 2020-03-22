const info = Object.fromEntries(location.search.substr(1).split('&').map(entry => entry.split('=')));
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

let callIndex = 0;
//let calls = {};
let config;

(async () => {
  document.title = `eVal ${info.host}`;

  config = await getConfig(info.account, info.profile);
  if (Object.keys(config).length === 0) alert('something\'s wrong');

  chrome.runtime.onMessage.addListener(messageListener);
  if (document.readyState === 'complete') DOMReady();
  else document.addEventListener('DOMContentLoaded', DOMReady);
})();

async function getConfig(account, profile) {
  let stored = await storageFetch('config');
  let accountCfg = stored && JSON.parse(stored)[account];

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

function DOMReady() {
  $('#calls').addEventListener('click', e => selectCall(e.target));
  $('#layers').addEventListener('click', e => selectLayer(e.target));
}

function addCall(call) {
  let id = callIndex++;
  /*calls[id] =*/ processCall(id, call);

  createDetails(call);
  createLayers(call);
  createCall(call);

  selectCall($(`#calls [id="${id}"]`));
}

function processCall(id, call) {
  call.id = id;
  call.layers = Object.fromEntries(Object.entries(call.layers).map(processLayer));
  call.events = processEvents(call.layers.dataLayer);
  return call;
}
function processLayer([id, layer]) {
  let keyPairs = Object.fromEntries(Object.entries(layer).map(processKeyPair));
  let processed = Object.fromEntries(Object.entries(config.keyGroups).map(([groupName, groupDefinition]) => {
    let definition = { visibility: groupDefinition.hidden ? 'hidden' : 'visible' };
    definition.keys = Object.fromEntries(groupDefinition.keys.map(key => [key, keyPairs[key] || { value: keyPairs[key], status: 'nokey' }]));
    if (Object.values(definition.keys).some(value => value.status !== 'nokey')) definition.status = 'ok';
    else {
      definition.status = 'nokeys';
      definition.visibility = 'hidden';
    }
    return [groupName, definition];
  }));
  return [id, processed];
}
function processKeyPair([key, value]) {
  let status;
  if (value === null) status = 'missing';
  else if (Array.isArray(value)) status = value.length > 0 ? 'array' : 'empty';
  else {
    let type = typeof value;
    if (type === 'undefined') status = 'missing';
    else if (type === 'object') {
      status = Object.keys(value).length > 0 ? 'object' : 'empty';
    } else {
      status = type === 'string' && value.length === 0 ? 'empty' : type;
    }
  }
  return [key, { value: value, status: status }]
}
function processEvents(dataLayer) {
  if (config.events.isGroup) {
    let events = dataLayer[config.events.key].keys;
    if (events) return Object.values(events).reduce((list, event) => Array.isArray(event) ? [...list, ...event.value] : [...list, event.value], []);
  }
  else {
    for (let group in dataLayer) {
      let key = dataLayer[group][config.events.key];
      if (key.value) return Array.isArray(key.value) ? key.value : [key.value];
    }
  }
  return [];
}

function createCall(call) {
  let el = makeEl('div', call.id, ['call', call.type]);
  el.append(makeEl('h2', null, null, call.type));
  call.events.forEach(text => {
    el.append(makeEl('div', null, null, text));
  });
  $('#calls').append(el);
}
function createLayers(call) {
  let container = makeEl('div', null, ['layersContainer']);
  container.dataset.callId = call.id;
  Object.keys(call.layers).forEach(layerId => {
    let el = makeEl('div', null, ['layer'], layerId);
    el.dataset.layerId = layerId;
    el.dataset.callId = call.id;
    container.append(el);
  });
  $('#layers').append(container);
}
function createDetails(call) {
  let fragment = document.createDocumentFragment();
  Object.entries(call.layers).forEach(([layerId, layer]) => {
    let el = makeEl('div', null, ['detail']);
    el.dataset.layerId = layerId;
    el.dataset.callId = call.id;

    let head = makeEl('div', null, ['head']);
    let body = makeEl('div', null, ['body']);
    Object.entries(layer).forEach(([groupName, group]) => {
      head.append(makeEl('div', null, null, groupName));
      let content = makeEl('div', null, [group.visibility])
      content.append(makeEl('h2', null, null, groupName));
      Object.entries(group.keys).forEach(([key, valueObj]) => {
        content.append(makeEl('div', null, null, `${key}: ${valueObj.value}`));
      });
      body.append(content);
    });
    el.append(head);
    el.append(body);
    fragment.append(el);
  })
  $('#inspect').append(fragment);
}
function makeEl(type, id, classes, text) {
  var el = document.createElement(type);
  if (id || id === 0) el.id = id;
  if (classes) classes.forEach(c => el.classList.add(c));
  if (text !== null && text !== undefined) el.append(document.createTextNode(text));
  return el;
}

function selectCall(el) {
  if (el.matches('#calls, .selected')) return;
  $('#calls .call.selected')?.classList.toggle('selected');
  el.classList.add('selected');
  $('#layers').querySelector('.layersContainer.selected')?.classList.toggle('selected');
  let container = $(`#layers .layersContainer[data-call-id="${el.id}"`);
  if (container) {
    container.classList.toggle('selected');
    selectLayer(container.querySelector('.layer.selected') || container.querySelector('.layer[data-layer-id="dataLayer"]'));
  }
}

function selectLayer(el) {
  let container = $(`#layers .layersContainer[data-call-id="${el.dataset.callId}"`);
  if (!container) return;
  if (!el.classList.contains('selected')) {
    container.querySelector('.layer.selected')?.classList.toggle('selected');
    el.classList.add('selected');
  }
  $$('.detail').forEach(detail => {
    if (detail.dataset.callId === el.dataset.callId && detail.dataset.layerId === el.dataset.layerId) detail.classList.add('selected');
    else detail.classList.remove('selected');
  });
}