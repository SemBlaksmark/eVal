(async function () {
  const config = await new Promise(resolve => {
    chrome.storage.local.get('config', stored => {
      resolve(JSON.parse(stored['config']));
    });
  });
  let accounts = Object.keys(config).slice(1);

  if (accounts.length > 0) {
    document.querySelector('#for-accounts ul').innerHTML = accounts.map(key => /*HTML*/`<li>${key}</li>`).join('');
    document.querySelector('#for-profiles ul').innerHTML = Object.keys(config[accounts[0]]).map(key => /*HTML*/`<li>${key}</li>`).join('');
  }
  const dropdownToggle = e => e.currentTarget.classList.toggle('open');
  document.querySelectorAll('.dropdown').forEach(btn => {
    btn.addEventListener('focus', dropdownToggle);
    btn.addEventListener('blur', dropdownToggle);
  });
  document.querySelector('#for-accounts ul').addEventListener('click', e => {
    if (e.target.tagName !== 'LI') return;
    const selected = e.target.textContent;
    const btn = e.target.parentElement.parentElement;
    btn.querySelector('.selected').textContent = selected;
    document.querySelector('#for-profiles ul').innerHTML = Object.keys(config[selected]).map(key => /*HTML*/`<li>${key}</li>`).join('');
    btn.blur();
  });
  document.querySelector('#for-profiles ul').addEventListener('click', e => {
    if (e.target.tagName !== 'LI') return;
    const selected = e.target.textContent;
    const btn = e.target.parentElement.parentElement;
    btn.querySelector('.selected').textContent = selected;
    //TODO Something
    btn.blur();
  });


  document.querySelector('#configuration').innerHTML = JSON.stringify(config), null, 1;

  function createAccount(name) {
    config[name] = JSON.parse(JSON.stringify(config.default));
    chrome.storage.local.set({ config: JSON.stringify(config) });
  }
})()


