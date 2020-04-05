let config;
(async function () {
    try {
        config = await new Promise((resolve, reject) => {
            chrome.storage.local.get('config', stored => {
                if (Object.keys(stored).length) resolve(stored);
                else reject('value not found');
            });
        })
    } catch (e) { 
        config = defaultConfig;
    }
})()