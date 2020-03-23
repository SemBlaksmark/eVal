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
    let definition = { ...groupDefinition };
    definition.keys = Object.fromEntries(groupDefinition.keys.map(key => [key, keyPairs[key] || { value: keyPairs[key], status: ['nokey'] }]));
    if (Object.values(definition.keys).some(value => !~value.status.indexOf('nokey'))) {
      definition.hasData = true;
    } else {
      definition.hasData = false;
      definition.hidden = true;
    }
    return [groupName, definition];
  }));
  return [id, processed];
}
function processKeyPair([key, value]) {
  let status = [];
  if (value === null) status = 'missing';
  else if (Array.isArray(value)) {
    status.push('array');
    if (value.length === 0) status.push('empty');
  }
  else {
    let type = typeof value;
    if (type === 'undefined') status.push('missing');
    else if (type === 'object') {
      status.push('object');
      if (Object.keys(value).length === 0) status.push('empty');
    } else {
      status.push(type);
      if (type === 'string' && value.length === 0) status.push('empty');
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
    let el = makeEl('div', null, ['layer']);
    el.dataset.layerId = layerId;
    el.dataset.callId = call.id;

    el.append(makeEl('div', null, null, layerId));
    el.append(makeEl('div', null, null, 'name '));
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
    head.addEventListener('click', e => toggleGroup(e.target));
    let body = makeEl('div', null, ['body']);
    Object.entries(layer).forEach(([groupName, group]) => {
      let groupControl = makeEl('div', null, ['groupControl'], groupName);
      if (!group.hidden) groupControl.classList.add('active');
      if (!group.hasData) groupControl.classList.add('nodata');
      groupControl.dataset.callId = call.id;
      groupControl.dataset.layerId = layerId;
      groupControl.dataset.groupName = groupName;
      head.append(groupControl);
      let content = makeEl('div', null, ['group', groupName]);
      if (group.hidden) content.classList.add('hidden');
      content.append(makeEl('h2', null, null, groupName));
      Object.entries(group.keys).forEach(([key, valueObj]) => {
        content.append(makeEl('div', null, ['keyPair', ...valueObj.status], `${key}: ${valueObj.value}`));
      });
      body.append(content);
    });
    el.append(head);
    el.append(body);
    fragment.append(el);
  });
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
  if (!el.matches('.call') || el.matches('.selected')) return;
  el.parentElement.querySelector('.selected')?.classList.toggle('selected');
  el.classList.toggle('selected');
  $('#layers').querySelector('.layersContainer.selected')?.classList.toggle('selected');
  let container = $(`#layers .layersContainer[data-call-id="${el.id}"`);
  if (container) {
    container.classList.toggle('selected');
    selectLayer(container.querySelector('.layer.selected') || container.querySelector('.layer[data-layer-id="dataLayer"]'));
  }
}

function selectLayer(el) {
  if (!el.matches('.layer')) return;
  el.parentElement.querySelector('.selected')?.classList.toggle('selected');
  el.classList.add('selected');
  $$('.detail').forEach(detail => {
    if (detail.dataset.callId === el.dataset.callId && detail.dataset.layerId === el.dataset.layerId) detail.classList.add('selected');
    else detail.classList.remove('selected');
  });
}

function toggleGroup(el) {
  if (!el.classList.contains('groupControl')) return;
  el.classList.toggle('active');
  $(`#inspect .detail[data-call-id="${el.dataset.callId}"][data-layer-id="${el.dataset.layerId}"] .group.${el.dataset.groupName}`)?.classList.toggle('hidden');
}