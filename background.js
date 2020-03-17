let sessions = [];
let config; (async () => { config = await storageFetch('config'); })();

/* Listen for event */
chrome.tabs.onRemoved.addListener(tabId => sessions = sessions.filter(session => session.pageTab !== tabId && session.validatorTab !== tabId));
chrome.runtime.onMessage.addListener(commandListener);

async function storageFetch(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, stored => resolve(stored[key]));
  });
}

function commandListener(m, sender) {
  let session;
  switch (m.command) {
    case 'init':
      session = sessions.find(session => session.pageTab === sender.tab.id);
      if (!session) session = { pageTab: sender.tab.id };
      if (!session.validatorTab) {
        chrome.tabs.create({ url: `ui.html?host=${m.host}&account=${m.account}&profile=${m.profile}`, index: sender.tab.index + 1, active: false }, tab => {
          session.validatorTab = tab.id;
          session.initialized = false;
          sessions.push(session);
        });
      }
      break;
    case 'load':
      session = sessions.find(session => session.pageTab === sender.tab.id);
      if (!session.initialized) {
        m.calls.forEach(call => {
          chrome.tabs.sendMessage(session.validatorTab, { command: 'addCall', call: call });
        });
        session.initialized = true;
      }
      break;
    case 'call':
      session = sessions.find(session => session.pageTab === sender.tab.id);
      chrome.tabs.sendMessage(session.validatorTab, { command: 'addCall', call: m.call });
      break;
    case 'clearStored':
      session = sessions.find(session => session.validatorTab === sender.tab.id);
      chrome.tabs.sendMessage(session.pageTab, { command: 'clearStored' });
      break;
  }
}