const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

let pageTab;
let config;

//let calls = {};

(async () => {
  pageTab = await new Promise(resolve => chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0])));
  chrome.tabs.getCurrent(tab => chrome.tabs.update(tab.id, {active: true}));
  try {
    config = await new Promise((resolve, reject) => chrome.tabs.sendMessage(pageTab.id, { command: 'init' }, response => {
      if (response) getConfig(response).then(found => resolve(found)).catch(error => reject(error));
      else reject('No response');
    }));
  } catch (e) {}
  chrome.runtime.onMessage.addListener(messageListener);
  chrome.tabs.sendMessage(pageTab.id, {command: 'load'});
  document.title = `eVal ${pageTab.url.match(/\/\/(.+?)\//)?.[1]}`;

  let calls = $('#calls');
  calls.addEventListener('click', e => selectCall(e.target));
  calls.addEventListener('keyup', e => { if (e.keyCode === 46) deleteCall(e.target) });
  $('#tags').addEventListener('click', e => selectTag(e.target));
})();

function messageListener(m, sender) {
  if(sender.tab?.id !== pageTab.id) return;
  switch (m.command) {
    case 'call':
      addCall(m.call);
      break;
  }
}

function getConfig([account, profile]) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('config', stored => {
      let fullCfg = stored['config'];

      let accountCfg = fullCfg && JSON.parse(fullCfg)[account];

      if (accountCfg && accountCfg.default) {
        Object.values(accountCfg).forEach(profile => {
          Object.values(profile.keyGroups).forEach(group => {
            group.keys = group.keys.map(key => {
              let m = key.match(/^\/(.+)\/$/)?.[1];
              return m ? new RegExp(m) : key;
            });
          });
        });
        if (accountCfg[profile]) resolve(accountCfg[profile].override ? accountCfg[profile] : Object.assign(accountCfg.default, accountCfg[profile]));
        else resolve(config = accountCfg.default);
      }
      reject('No config');
    });
  });
}

function addCall(call) {
  /*calls[id] =*/ processCall(call);

  createDetails(call);
  createTags(call);
  createCall(call);

  selectCall($(`.call[id="${call.id}"]`));
}

function processCall(call) {
  call.pageName = call.tags.dataLayer[config.pageNameKey];
  call.tags = Object.fromEntries(Object.entries(call.tags).map(processTags));
  call.events = processEvents(call.tags.dataLayer);
  return call;
}
function processTags([tagId, tag]) {
  let matched = {};
  let processed = Object.fromEntries(Object.entries(config.keyGroups).map(([groupName, groupDefinition]) => {
    let group = { ...groupDefinition };
    group.keys = {};
    for (let groupKey of groupDefinition.keys) {
      if (groupKey instanceof RegExp) {
        Object.entries(tag).forEach(([key, value]) => {
          if (groupKey.test(key)) {
            matched[key] = true;
            group.keys[key] = value;
          }
        });
      } else {
        if (tag.hasOwnProperty(groupKey)) {
          group.keys[groupKey] = tag[groupKey];
          matched[groupKey] = true;
        } else {
          group.keys[groupKey] = new NoKey('nokey');
        }
      }
    };
    if (Object.values(group.keys).some(value => !(value instanceof NoKey))) {
      group.hasData = true;
    } else {
      group.hasData = false;
      group.hidden = true;
    }
    return [groupName, group];
  }));
  let unmatched = Object.entries(tag).filter(([key, value]) => !matched[key]);
  if (unmatched.length > 0) processed.unknown = { hidden: false, keys: Object.fromEntries(unmatched), hasData: true };
  return [tagId, processed];
}
function processEvents(dataLayer) {
  if (config.events.isGroup) {
    let eventGroup = dataLayer[config.events.key].keys;
    return Object.values(eventGroup).reduce((list, events) => {
      if (events && !(events instanceof NoKey)) {
        if (Array.isArray(events)) {
          list.push(...events);
        } else if (/string|number|bigint/.test(typeof events)) {
          list.push(events);
        }
      }
      return list;
    }, []);
  }
  else {
    for (let group in dataLayer) {
      let events = dataLayer[group][config.events.key];
      if (events && !(events instanceof NoKey)) return Array.isArray(events.value) ? events.value : [events.value];
    }
  }
  return [];
}

function createCall(call) {
  let el = makeEl('button', call.id, ['call', call.type]);
  let header = makeEl('div', null, ['header']);
  header.append(makeIcon(call.type));
  header.append(makeEl('h2', null, null, call.pageName || `<${call.type}>`));
  el.append(header);
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
      Object.entries(group.keys).forEach(([key, value]) => {
        let status = getKeyStatus(value);
        let keyEl = makeEl('div', null, ['key', ...status]);
        keyEl.append(makeEl('div', null, null, key));
        if (!~status.indexOf('empty') && ~status.indexOf('array')) keyEl.append(makeEl('div', null, ['array-size'], value.length));
        content.append(keyEl);
        let valueEl = makeEl('div', null, ['value', ...status]);
        if (!~status.indexOf('nokey') && !~status.indexOf('missing')) {
          if (~status.indexOf('empty') || ~status.indexOf('object')) {
            valueEl.append(document.createTextNode(JSON.stringify(value)));
          } else if (~status.indexOf('array')) {
            //valueEl.append(makeEl('div', null, ['array-size', 'value', ...status], value.length));
            value.forEach(entry => {
              let entryStatus = getKeyStatus(entry);
              if (~entryStatus.indexOf('empty') || ~entryStatus.indexOf('object')) {
                valueEl.append(makeEl('div', null, ['array-item', 'value', ...entryStatus], JSON.stringify(entry)));
              } else {
                valueEl.append(makeEl('div', null, ['array-item', 'value', ...entryStatus], entry));
              }
            });
          } else {
            valueEl.append(document.createTextNode(value));
          }
        }
        content.append(valueEl);
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
function makeIcon(name) {
  const NS = 'http://www.w3.org/2000/svg';
  let icon = document.createElementNS(NS, 'svg');
  icon.classList.add('icon');
  icon.classList.add(name);
  icon.innerHTML = `<use href="icons.svg#${name}"></use>`
  return icon;
}
function getKeyStatus(value, isNested) {
  let status = [];
  if (value instanceof NoKey) {
    status.push('nokey');
  } else if (value === null) {
    status.push('missing');
  } else {
    let type = typeof value;
    if (value.length === 0 || (type === 'object' && Object.keys(value).length === 0)) status.push('empty');
    if (Array.isArray(value)) {
      status.push('array');
    }
    else status.push(type);
  }
  return status;
}

function deleteCall(el) {
  let id = el.id;
  $$(`.call[id="${id}"], .tagSelector[data-call-id="${id}"], .detail[data-call-id="${id}"]`).forEach(part => part.remove());
  chrome.tabs.sendMessage(pageTab.id, { command: 'deleteCall', id: id });
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

class NoKey {
  constructor(status) {
    this.status = status;
  }
}
