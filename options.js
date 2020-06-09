import { makeEl, makeIcon } from './markupBuilders.js';

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const accountsEl = $('#accounts');
const profilesEl = $('#profiles');
const configsEl = $('#configs');
const addAccountBtn = $('#add-account');
const addAccountInp = $('#add-account-input');
const addProfileBtn = $('#add-profile');
const addProfileInp = $('#add-profile-input');

let config;
(async function () {
  config = await new Promise(resolve => {
    chrome.storage.local.get('config', stored => {
      resolve(JSON.parse(stored['config']));
    });
  });
  accountsEl.addEventListener('click', selectAccount);
  addAccountBtn.addEventListener('click', showInput);
  addAccountInp.addEventListener('blur', blurInput);
  addAccountInp.addEventListener('keyup', addAccount);
  profilesEl.addEventListener('click', selectProfile);
  addProfileBtn.addEventListener('click', showInput);
  addProfileInp.addEventListener('blur', blurInput);
  Object.keys(config).forEach(key => {
    accountsEl.insertBefore(makeEl('button', null, ['account'], key), addAccountBtn);
  });
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
  Object.keys(config[e.target.textContent]).forEach(key => {
    profilesEl.insertBefore(makeEl('button', null, ['profile'], key), addProfileBtn);
  });
  profilesEl.querySelector('.profile').click();
}

function addAccount(e) {
  if (e.key === 'Enter' && addAccountInp.value) {
    try {
      createAccount(addAccountInp.value);
      accountsEl.insertBefore(makeEl('button', null, ['account'], addAccountInp.value), addAccountBtn);
      addAccountInp.classList.add('hidden');
      addAccountInp.classList.remove('error');
      addAccountBtn.classList.remove('hidden');
      addAccountInp.value = '';
    } catch (err) {
      addAccountInp.classList.add('error');
    }
  }
}

function selectProfile(e) {
  if (!e.target.classList.contains('profile')) return;
  profilesEl.querySelector('.selected')?.classList.toggle('selected');
  e.target.classList.toggle('selected');
}

function createAccount(name) {
  config[name] = JSON.parse(JSON.stringify(config.default));
  chrome.storage.local.set({config: JSON.stringify(config)});
}