let sessions = [];

chrome.browserAction.onClicked.addListener(openTab)
function openTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    let tab = tabs[0];
    if (tab) {
      let session = { page: tab.id };
      sessions.push(session);
      chrome.tabs.create({ url: 'ui.html', index: tabs[0]?.index + 1, active: false }, ui => {
      });
    }
  });
}
//chrome.tabs.onUpdated.addListener(onTabUpdated);

function onTabUpdated(tabId, changeInfo) {
  sessions = sessions.filter(session => !(session.initialized && session.validatorTab === tabId && changeInfo.url));
}