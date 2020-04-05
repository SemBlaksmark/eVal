chrome.storage.local.get('config', stored => {
  if (!Object.keys(stored).length) import("/defaultConfig.js").then(imported => chrome.storage.local.set({config: JSON.stringify(imported.default)}));
});

chrome.browserAction.onClicked.addListener(openTab);
function openTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    let tab = tabs[0];
    if (tab) {
      chrome.tabs.sendMessage(tab.id, {command: 'tealium'}, flag => {
        if (flag) chrome.tabs.create({ url: 'ui.html', index: tab.index + 1, active: false });
      });
    }
  });
}