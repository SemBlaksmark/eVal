let info = Object.fromEntries(location.search.substr(1).split('&').map(entry => entry.split('=')));
document.title = `eVal ${info.host}`;

chrome.runtime.onMessage.addListener(m => {
  switch (m.command) {
    case 'addCall':
      addCall(m.call);
      break;
  }
});

window.addEventListener('load', windowLoaded);
function windowLoaded() {
  let callsEl = document.querySelector('#calls');
  let layersEl = document.querySelector('#layers');
  callsEl.addEventListener('click', e => alert(e.target.textContent));
  callsEl.addEventListener('mouseover', e => {
    layersEl.style.display = 'flex';
    layersEl.textContent = e.target.dataset.layers || 'no text';
  });
}

function addCall(call) {
  var el = document.createElement('button');
  el.textContent = call.type;
  el.dataset.layers = Object.keys(call);
  document.querySelector('#calls').append(el);
}
