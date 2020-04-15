function makeEl(type, id, classes, text) {
  var el = document.createElement(type);
  if (id || id === 0) el.id = id;
  if (classes) el.classList.add(...classes);
  if (text !== null && text !== undefined) el.append(document.createTextNode(text));
  return el;
}

function makeIcon(name) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const linkNS = 'http://www.w3.org/1999/xlink';
  let icon = document.createElementNS(svgNS, 'svg');
  let use = document.createElementNS(svgNS, 'use');
  use.setAttributeNS(linkNS, 'href', `icons.svg#${name}`);
  icon.append(use);
  icon.classList.add('icon', name);
  return icon;
}

export { makeEl, makeIcon };