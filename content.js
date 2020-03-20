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
        break loop1;
      }
    }
  }
  if (info) main(info);
}

function main(info) {
  embedPageScript();
  addBackgroundScriptCommunication();
  addEmbeddedScriptCommunication();
  chrome.runtime.sendMessage({command: 'init', ...info});

  function embedPageScript() {
    let embed = document.createElement('script');
    embed.id = 'eVal';
    embed.text = pageScript.toString().replace(/function .+?\{(.+)\}$/s, '$1');
    document.documentElement.append(embed);
  }

  function pageScript() {
    window.eValCalls = localStorage.eValCalls && JSON.parse(localStorage.eValCalls) || [];
    window.postMessage({ eVal: 'load', calls: eValCalls });
    window.addEventListener('message', e => {
      if (!e.data.eVal) return;
      switch (e.data.eVal) {
        case 'clearStored':
          localStorage.removeItem('eValCalls');
          break;
      }
    })

    var tealiumScript = document.querySelector('script[src*="utag.js"]');
    console.log('Tealium script found');
    tealiumScript.addEventListener('load', e => {
      let call = {
        type: 'pageView',
        data: {
          udo: window.utag_data,
          dataLayer: window.utag.data,
        }
      };

      /* Override utag.loader.LOAD */
      utag.loader.LOAD_old = utag.loader.LOAD;
      utag.loader.LOAD = function (tag) {
        if (utag.sender[tag]) {
          utag.sender[tag].send_old = utag.sender[tag].send;
          utag.sender[tag].send = function (a, b) {
            call.data[tag] = b;
            utag.sender[tag].send_old.apply(this, arguments);
          }
        }
        utag.loader.LOAD_old.apply(this, arguments);
      }

      /* Override utag.track */
      utag.track_old = utag.track;
      utag.track = function (a, b) {
        call.type = a.event || a;
        call.data.dataLayer = b || a.data;
        utag.track_old.apply(this, arguments);
        processCall();
      }

      /* Override utag.loader.END */
      utag.loader.END_old = utag.loader.END;
      utag.loader.END = function () {
        utag.loader.END_old.apply(this, arguments);
        processCall();
      }

      function processCall() {
        console.log('call');
        window.postMessage({ eVal: 'call', call: call });
        eValCalls.push(call);
        localStorage.eValCalls = JSON.stringify(eValCalls);
        call = { data: {} };
      }
    });
  }

  function addBackgroundScriptCommunication() {
    chrome.runtime.onMessage.addListener((m, sender, sendResponse) => {
      switch (m.command) {
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

