let sessions = [];

/* Listen for event */
chrome.runtime.onMessage.addListener(commandListener);
chrome.tabs.onRemoved.addListener(onTabClose);
chrome.tabs.onUpdated.addListener(onTabUpdated);
async function commandListener(m, sender, sendResponse) {
  let session;
  switch (m.command) {
    case 'init':
      session = sessions.find(session => session.pageTab === sender.tab.id);
      if (!session) {
        session = { pageTab: sender.tab.id };
        let tab = await new Promise(resolve => chrome.tabs.create({ url: `ui.html?host=${m.host}&account=${m.account}&profile=${m.profile}`, index: sender.tab.index + 1, active: false }, tab => resolve(tab)));
        session.validatorTab = tab.id;
        session.loaded = false;
        sessions.push(session);
      }
      sendResponse(true);
      break;
    case 'load':
      session = sessions.find(session => session.pageTab === sender.tab.id);
      if (!session.loaded) {
        m.calls.forEach(call => {
          chrome.tabs.sendMessage(session.validatorTab, { command: 'addCall', call: call });
        });
        session.loaded = true;
      }
      break;
    case 'call':
      session = sessions.find(session => session.pageTab === sender.tab.id);
      if (session) chrome.tabs.sendMessage(session.validatorTab, { command: 'addCall', call: m.call });
      break;
    case 'deleteCall':
      session = sessions.find(session => session.validatorTab === sender.tab.id);
      chrome.tabs.sendMessage(session.pageTab, { command: 'deleteCall', id: m.id });
      break;
    case 'clearStored':
      session = sessions.find(session => session.validatorTab === sender.tab.id);
      chrome.tabs.sendMessage(session.pageTab, { command: 'clearStored' });
      break;
  }
}

function onTabClose(tabId) {
  sessions = sessions.filter(session => {
    if (session.pageTab === tabId) {
      chrome.tabs.remove(session.validatorTab);
      return false;
    }
    else if (session.validatorTab === tabId) return false;
    return true;
  });
}

function onTabUpdated(tabId, changeInfo) {
  sessions = sessions.filter(session => !(session.initialized && session.validatorTab === tabId && changeInfo.url));
}