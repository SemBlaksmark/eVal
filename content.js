let observer = new MutationObserver(observerCallback);
observer.observe(document.documentElement, { subtree: true, childList: true });
function observerCallback(mutationRecords) {
  let info;
  loop1:
  for (let record of mutationRecords) {
    for (let node of record.addedNodes) {
      let match = node.src && node.src.match(/utag\/(.+?)\/(.+?)\/(?:prod|qa|dev)\/utag\.js/);
      if (match) {
        info = {
          account: match[1],
          profile: match[2],
          host: location.host
        };
        observer.disconnect();
        break loop1;
      }
    }
  }
  if (info) chrome.runtime.sendMessage({ command: 'init', ...info }, response => main());
}

function main() {
  embedPageScript();
  addBackgroundScriptCommunication();
  addEmbeddedScriptCommunication();

  function embedPageScript() {
    let embed = document.createElement('script');
    embed.id = 'eVal';
    embed.text = pageScript.toString().replace(/function .+?\{(.+)\}$/s, '$1');
    document.documentElement.append(embed);
  }

  function pageScript() {
    window.eValCalls = localStorage.eValCalls && JSON.parse(localStorage.eValCalls) || [];
    let callIndex = eValCalls.reduce((max, call) => Math.max(max, call.id), 0);
    window.postMessage({ eVal: 'load', calls: eValCalls });
    window.addEventListener('message', e => {
      if (!e.data.eVal) return;
      switch (e.data.eVal) {
        case 'deleteCall':
          eValCalls = eValCalls.filter(call => call.id != e.data.id);
          localStorage.eValCalls = JSON.stringify(eValCalls);
          break;
        case 'clearStored':
          localStorage.removeItem('eValCalls');
          break;
      }
    });

    var tealiumScript = document.querySelector('script[src*="utag.js"]');
    tealiumScript.addEventListener('load', tealiumOverride);
    function tealiumOverride() {
      let call = {
        tags: {
          udo: window.utag_data,
          dataLayer: window.utag.data
        },
        type: 'page',
      };

      /* Override utag.loader.LOAD */
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

      /* Override utag.track */
      utag.track_old = utag.track;
      utag.track = function (a, b) {
        call.type = a.event || a;
        call.tags.dataLayer =  b || a.data;
        utag.track_old.apply(this, arguments);
        processCall();
      }

      /* Override utag.loader.END */
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
        localStorage.eValCalls = JSON.stringify(eValCalls);
        window.postMessage({ eVal: 'call', call: call });
        call = { tags: {} };
      }
    }
  }

  function addBackgroundScriptCommunication() {
    chrome.runtime.onMessage.addListener(m => {
      switch (m.command) {
        case 'deleteCall':
          window.postMessage({ eVal: 'deleteCall', id: m.id });
          break;
        case 'clearStored':
          window.postMessage({ eVal: 'clearStored' });
          break;
      }
    });
  }

  function addEmbeddedScriptCommunication() {
    window.addEventListener('message', e => {
      if (!e.data.eVal) return;
      switch (e.data.eVal) {
        case 'load':
          chrome.runtime.sendMessage({ command: 'load', calls: e.data.calls });
          break;
        case 'call':
          chrome.runtime.sendMessage({ command: 'call', call: e.data.call });
          break;
      }
    });
  }
}