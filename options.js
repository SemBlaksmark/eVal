const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const accountsEl = $('#accounts');
const profilesEl = $('#profiles');
const configurationEl = $('#configuration');

let config;
(async function () {
  config = await new Promise(resolve => {
    chrome.storage.local.get('config', stored => {
      resolve(JSON.parse(stored['config']));
    });
  });
  const accountButton = accountsEl.querySelector('button.add');
  const accountInput = accountsEl.querySelector('input.add');
  accountsEl.addEventListener('click', selectAccount);
  accountButton.addEventListener('click', showInput);
  accountInput.addEventListener('blur', blurInput);
  accountInput.addEventListener('keyup', addAccount);
  profilesEl.addEventListener('click', selectProfile);
  profilesEl.querySelector('input.add').addEventListener('blur', blurInput);
  accountButton.insertAdjacentHTML('beforeBegin', Object.keys(config).filter(key => key !== 'default').map(key => /*html*/`
    <button class="account">${key}</button>
  `).join(''));
})()

function showInput(e) {
  const input = e.target.parentElement.querySelector('input');
  input.classList.remove('hidden');
  e.target.classList.add('hidden');
  input.focus();
}

function blurInput(e) {
  const button = e.target.parentElement.querySelector('.control');
  e.target.classList.add('hidden');
  e.target.classList.remove('error');
  button.classList.remove('hidden');
  e.target.value = '';
}

function selectAccount(e) {
  if (!e.target.classList.contains('account')) return;
  accountsEl.querySelector('.selected')?.classList.toggle('selected');
  e.target.classList.toggle('selected');
  profilesEl.querySelectorAll('.profile').forEach(el => el.remove());
  profilesEl.querySelector('button.add').insertAdjacentHTML('beforeBegin', Object.keys(config[e.target.textContent]).map(key => /*html*/`
    <button class="profile">${key}</button>
  `).join(''));
  profilesEl.querySelector('.profile').click();
}

function addAccount(e) {
  const accountButton = accountsEl.querySelector('button.add');
  const accountInput = accountsEl.querySelector('input.add');
  if (e.key === 'Enter' && accountInput.value) {
    try {
      createAccount(accountInput.value);
      accountButton.insertAdjacentHTML('beforeBegin', /*html*/`<button class="account">${accountInput.value}</button>`);
      accountInput.classList.add('hidden');
      accountInput.classList.remove('error');
      accountButton.classList.remove('hidden');
      accountInput.value = '';
    } catch (err) {
      accountInput.classList.add('error');
    }
  }
}

function selectProfile(e) {
  if (!e.target.classList.contains('profile')) return;
  const profile = config[accountsEl.querySelector('.selected').textContent][e.target.textContent];
  profilesEl.querySelector('.selected')?.classList.remove('selected');
  e.target.classList.add('selected');
  configurationEl.innerHTML = /*html*/`
    <h2>Chosen: ${e.target.textContent}</h2>
    <div>Override: ${profile.override}</div>
    <div>Page name variable: ${profile.pageNameKey}<div>
    <div>Event group or variable name: ${profile.events.key}<div>
    <div>Events is a group: ${profile.events.isGroup}<div>
    ${Object.entries(profile.keyGroups).map(([name, group]) => '<div>' + name + '<div>').join('')}
  `;
}

function createAccount(name) {
  config[name] = JSON.parse(JSON.stringify(config.default));
  chrome.storage.local.set({ config: JSON.stringify(config) });
}