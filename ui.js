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
    Object.values(accountCfg).forEach(profile => {
      Object.values(profile.keyGroups).forEach(group => {
        group.keys = group.keys.map(key => {
          let m = key.match(/^\/(.+)\/$/)?.[1];
          return m ? new RegExp(m) : key;
        });
      });
    });
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
  $('#tags').addEventListener('click', e => selectTag(e.target));
}

function addCall(call) {
  let id = callIndex++;
  /*calls[id] =*/ processCall(id, call);

  createDetails(call);
  createTags(call);
  createCall(call);

  selectCall($(`#calls [id="${id}"]`));
}

function processCall(id, call) {
  call.id = id;
  for (let tagId in call.tags) {
    for (let key of call.tags[tagId].undefKeys) call.tags[tagId].data[key] = undefined;
  }
  call.tags = Object.fromEntries(Object.entries(call.tags).map(processTags));
  call.events = processEvents(call.tags.dataLayer);
  return call;
}
function processTags([tagId, tag]) {
  let keyPairs = Object.fromEntries(Object.entries(tag.data).map(processKeyPair));
  let matched = {};
  let processed = Object.fromEntries(Object.entries(config.keyGroups).map(([groupName, groupDefinition]) => {
    let group = { ...groupDefinition };
    group.keys = {};
    for (let key of groupDefinition.keys) {
      if (key instanceof RegExp) {
        Object.entries(keyPairs).forEach(([pairKey, pairValue]) => {
          if (key.test(pairKey)) {
            matched[pairKey] = true;
            group.keys[pairKey] = pairValue;
          }
        });
      } else {
        if (keyPairs.hasOwnProperty(key)) {
          group.keys[key] = keyPairs[key];
          matched[key] = true;
        } else {
          group.keys[key] = { value: undefined, status: ['nokey'] };
        }
      }
    };
    if (Object.values(group.keys).some(value => !~value.status.indexOf('nokey'))) {
      group.hasData = true;
    } else {
      group.hasData = false;
      group.hidden = true;
    }
    return [groupName, group];
  }));
  let unmatched = Object.entries(keyPairs).filter(([key, value]) => !matched[key]);
  if (unmatched.length > 0) processed.unknown = { hidden: false, keys: Object.fromEntries(unmatched), hasData: true };
  return [tagId, processed];
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
    let eventGroup = dataLayer[config.events.key].keys;
    return Object.values(eventGroup).reduce((list, eventKey) => {
      if (eventKey.value) {
        if (Array.isArray(eventKey.value)) {
          list.push(...eventKey.value);
        } else if (/string|number|bigint/.test(typeof eventKey.value)) {
          list.push(eventKey.value);
        }
      }
      return list;
    }, []);
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
function createTags(call) {
  let container = makeEl('div', null, ['tagSelector']);
  container.dataset.callId = call.id;
  Object.keys(call.tags).forEach(tagID => {
    let el = makeEl('div', null, ['tag']);
    el.dataset.tagId = tagID;
    el.dataset.callId = call.id;

    el.append(makeEl('div', null, null, tagID));
    //el.append(makeEl('div', null, null, 'name '));
    container.append(el);
  });
  $('#tags').append(container);
}
function createDetails(call) {
  let fragment = document.createDocumentFragment();
  Object.entries(call.tags).forEach(([tagId, tag]) => {
    let el = makeEl('div', null, ['detail']);
    el.dataset.tagId = tagId;
    el.dataset.callId = call.id;

    let head = makeEl('div', null, ['head']);
    head.addEventListener('click', e => toggleGroup(e.target));
    let body = makeEl('div', null, ['body']);
    Object.entries(tag).forEach(([groupName, group]) => {
      let groupControl = makeEl('h2', null, ['groupControl'], groupName);
      if (!group.hidden) groupControl.classList.add('active');
      if (!group.hasData) groupControl.classList.add('nodata');
      groupControl.dataset.callId = call.id;
      groupControl.dataset.tagId = tagId;
      groupControl.dataset.groupName = groupName;
      head.append(groupControl);
      let content = makeEl('div', null, ['group', groupName]);
      if (group.hidden) content.classList.add('hidden');
      content.append(makeEl('h2', null, null, groupName));
      Object.entries(group.keys).forEach(([key, valueObj]) => {
        content.append(makeEl('div', null, ['key', ...valueObj.status], key));
        content.append(makeEl('div', null, ['value', ...valueObj.status], JSON.stringify(valueObj.value)));
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
  $('#tags').querySelector('.tagSelector.selected')?.classList.toggle('selected');
  let container = $(`#tags .tagSelector[data-call-id="${el.id}"`);
  if (container) {
    container.classList.toggle('selected');
    selectTag(container.querySelector('.tag.selected') || container.querySelector('.tag[data-tag-id="dataLayer"]'));
  }
}

function selectTag(el) {
  if (!el.matches('.tag')) return;
  el.parentElement.querySelector('.selected')?.classList.toggle('selected');
  el.classList.add('selected');
  $$('.detail').forEach(detail => {
    if (detail.dataset.callId === el.dataset.callId && detail.dataset.tagId === el.dataset.tagId) detail.classList.add('selected');
    else detail.classList.remove('selected');
  });
}

function toggleGroup(el) {
  if (!el.classList.contains('groupControl')) return;
  el.classList.toggle('active');
  $(`#inspect .detail[data-call-id="${el.dataset.callId}"][data-tag-id="${el.dataset.tagId}"] .group.${el.dataset.groupName}`)?.classList.toggle('hidden');
}