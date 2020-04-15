import { makeEl, makeIcon } from './markupBuilders.js';
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

let config;
(async function () {
  config = await new Promise(resolve => {
    chrome.storage.local.get('config', stored => {
      resolve(JSON.parse(stored['config']));
    });
  });
  let accounts = $('#accounts');
  Object.keys(config).forEach(key => {
    accounts.append(makeEl('div', null, null, key));
  });
})()