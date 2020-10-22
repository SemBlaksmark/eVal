const embed = () => {
  let tealiumNode;
  let call = {};
  const selector = 'script[src*="/utag.js"]';
  const observer = new MutationObserver(records => {
    const nodes = records.flatMap(record => [...record.addedNodes]);
    for (const node of nodes) {
      tealiumNode = node.matches?.(selector) ? node : node.querySelector?.(selector);
      if (tealiumNode) {
        call.utag_data = JSON.parse(JSON.stringify(utag_data));
        tealiumNode.onload = tealiumLoaded;
        observer.disconnect();
        break;
      }
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });

  async function tealiumLoaded() {
    call['utag.data'] = JSON.parse(JSON.stringify(utag.data));
    const db = new PromiseIDB('eVal', 'calls');
    if (!sessionStorage.eVal) {
      await db.clear();
      sessionStorage.eVal = true;
    }

    window.addEventListener('load', e => processCall());

    /* Override utag.loader.LOAD */
    utag.loader.LOAD_eVal = utag.loader.LOAD;
    utag.loader.LOAD = function (tag) {
      if (utag.sender[tag]) {
        utag.sender[tag].send_eVal = utag.sender[tag].send;
        utag.sender[tag].send = function (a, b) {
          call[tag] = JSON.parse(JSON.stringify(b));
          utag.sender[tag].send_eVal.apply(this, arguments);
        }
      }
      utag.loader.LOAD_eVal.apply(this, arguments);
    }

    /* Override utag.track */
    utag.track_eVal = utag.track;
    utag.track = function (a, b) {
      call.type = a.event || a;
      call.data = JSON.parse(JSON.stringify(a.data || b));
      utag.track_eVal.apply(this, arguments);
      processCall();
    }

    function processCall() {
      db.store(JSON.parse(JSON.stringify(call))).then(result => console.log(result));
      call = {};
    }
  }
}
const scriptNode = document.createElement('script');
scriptNode.id = 'eVal';
scriptNode.textContent = `(${embed.toString()})()\n${PromiseIDB.toString()}`;
document.documentElement.append(scriptNode);

/*function main() {
  chrome.runtime.onMessage.addListener(uiListener);
  embedPageScript();
  embeddedListener();

  function embedPageScript() {
    let embed = document.createElement('script');
    embed.id = 'eVal';
    embed.text = pageScript.toString().replace(/function .+?\{(.+)\}$/s, '$1');
    document.documentElement.append(embed);
  }

  function pageScript() {
    window.eValCalls = sessionStorage.eValCalls && JSON.parse(sessionStorage.eValCalls) || [];
    let callIndex = eValCalls.reduce((max, call) => Math.max(max, call.id), 0);

    window.addEventListener('message', e => {
      if (!e.data.eVal) return;
      switch (e.data.eVal) {
        case 'load':
          eValCalls.forEach(call => window.postMessage({ eVal: 'call', call: call }));
          break;
        case 'deleteCall':
          eValCalls = eValCalls.filter(call => call.id != e.data.id);
          sessionStorage.eValCalls = JSON.stringify(eValCalls);
          break;
        case 'clearStored':
          sessionStorage.removeItem('eValCalls');
          break;
      }
    });

    if (window.utag) tealiumOverride();
    else {
      let tealiumScript = document.querySelector('script[src*="utag.js"]');
      tealiumScript.addEventListener('load', tealiumOverride);
    }
    function tealiumOverride() {
      let call = {
        tags: {
          udo: window.utag_data,
          dataLayer: window.utag.data
        },
        type: 'page',
      };

      // Override utag.loader.LOAD
      utag.loader.LOAD_old = utag.loader.LOAD;
      utag.loader.LOAD = function (tag) {
        if (utag.sender[tag]) {
          utag.sender[tag].send_old = utag.sender[tag].send;
          utag.sender[tag].send = function (a, b) {
            call.tags[tag] = b;
            utag.sender[tag].send_old.apply(this, arguments);
          }
        }
        utag.loader.LOAD_old.apply(this, arguments);
      }

      // Override utag.track
      utag.track_old = utag.track;
      utag.track = function (a, b) {
        call.type = a.event || a;
        call.tags.dataLayer = b || a.data;
        utag.track_old.apply(this, arguments);
        processCall();
      }

      // Override utag.loader.END
      if (utag.loader.ended) processCall();
      else {
        utag.loader.END_old = utag.loader.END;
        utag.loader.END = function () {
          utag.loader.END_old.apply(this, arguments);
          processCall();
        }
      }

      function processCall() {
        call.id = ++callIndex;
        Object.entries(call.tags).forEach(([tagId, tag]) => {
          Object.entries(tag).forEach(([key, value]) => {
            tag[key] = typeof value === 'undefined' ? null : value;
          });
        });
        eValCalls.push(call);
        sessionStorage.eValCalls = JSON.stringify(eValCalls);
        window.postMessage({ eVal: 'call', call: call });
        call = { tags: {} };
      }
    }
  }

  function uiListener(m, sender, sendResponse) {
    switch (m.command) {
      case 'tealium':
        sendResponse(!!tealium);
        break;
      case 'init':
        let [match, account, profile] = tealium.src.match(/\/([^/]+)\/([^/]+)\/(?:prod|dev|qa)\/utag\.js/);
        sendResponse([account, profile]);
        break;
      case 'load':
        window.postMessage({ eVal: 'load' });
        break;
      case 'deleteCall':
        window.postMessage({ eVal: 'deleteCall', id: m.id });
        break;
      case 'clearStored':
        window.postMessage({ eVal: 'clearStored' });
        break;
    }
  }

  function embeddedListener() {
    window.addEventListener('message', e => {
      if (!e.data.eVal) return;
      switch (e.data.eVal) {
        case 'call':
          chrome.runtime.sendMessage({ command: 'call', call: e.data.call });
          break;
      }
    });
  }
}*/

function PromiseIDB(dbName, storeName = 'objectStore', config = { keyPath: 'id', autoIncrement: true }) {
  const db = open(dbName);
  async function open(name) {
    const openRequest = indexedDB.open(name);
    openRequest.onupgradeneeded = e => {
      e.target.result.createObjectStore(storeName, config);
    }

    return new Promise((resolve, reject) => {
      openRequest.onsuccess = e => {
        resolve(e.target.result)
      };
      openRequest.onerror = e => reject(undefined);
    });
  };

  this.store = async function (layer) {
    const transaction = (await db).transaction([storeName], 'readwrite');
    return new Promise((resolve, reject) => {
      const request = transaction.objectStore(storeName).add(layer);
      request.onsuccess = e => resolve(true);
      request.onerror = e => reject(false);

    });
  };

  this.retrieve = async function (id) {
    const transaction = (await db).transaction([storeName], 'readwrite');
    return new Promise((resolve, reject) => {
      const request = transaction.objectStore(storeName).get(id);

      request.onsuccess = e => resolve(e.target.result);
      request.onerror = e => reject(null);
    });
  };

  this.clear = async function () {
    const transaction = (await db).transaction([storeName], 'readwrite');
    return new Promise((resolve, reject) => {
      transaction.oncomplete = e => resolve(true);
      transaction.onerror = e => reject(false);
      transaction.objectStore(storeName).clear();
    });
  }

  this.destroy = async function () {
    (await db).close();
    indexedDB.deleteDatabase(dbName);
  }
}
/*
function parseLog() {
  let state = 'findTag';
  let candidate;
  let layers = [];
  for (let [index, value] of Object.entries(utag.db_log)) {
    switch (state) {
      case 'findTag':
        if (/^SENDING/.test(value)) state = 'inTag';
        break;
      case 'inTag':
        if (value['ut.profile'])
    }
  }


let logSlices = [];
Object.entries(utag.db_log).filter(([i, line]) => /^SENDING/.test(line))*/