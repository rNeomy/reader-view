/**
    Reader View - Strips away clutter

    Copyright (C) 2014-2022 [@rNeomy]

    This program is free software: you can redistribute it and/or modify
    it under the terms of the Mozilla Public License as published by
    the Mozilla Foundation, either version 2 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    Mozilla Public License for more details.
    You should have received a copy of the Mozilla Public License
    along with this program.  If not, see {https://www.mozilla.org/en-US/MPL/}.

    GitHub: https://github.com/rNeomy/reader-view/
    Homepage: https://webextension.org/listing/chrome-reader-view.html
*/

/* global iframe */

function enable() {
  // expose "qr" for other usages
  self.qr = (parent, text, cell = 4) => new Promise(resolve => {
    const next = () => {
      const qr = self.qrcode(0, 'M'); // Create a QR code object
      qr.addData(text); // Add data to the QR code
      qr.make(); // Generate the QR code

      const img = new Image();
      img.src = qr.createDataURL(cell);
      parent.append(img);
    };

    if (typeof qrcode !== 'undefined') {
      next();
    }
    else {
      const s = document.createElement('script');
      s.src = 'plugins/qr-code/qrcode.js';
      s.onload = () => {
        s.remove();
        next();
      };
      document.body.append(s);
    }
  });
  const link = iframe.contentDocument.getElementById('reader-domain');

  const input = document.createElement('button');
  input.id = 'qr-button';
  input.style = `
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
  `;
  input.onclick = e => {
    e.preventDefault();
    e.stopPropagation();

    const div = document.createElement('div');
    div.id = 'qr-container';
    div.style = `
      display: grid;
      place-content: center;
      padding-block-start: 10px;
      cursor: pointer;
    `;
    div.title = 'Click to switch to the compact mode';
    div.onclick = () => {
      input.classList.remove('hidden');
      div.remove();
      link.dataset.mode = 'compact';
    };
    link.after(div);
    self.qr(div, link.href);
    input.classList.add('hidden');
    link.dataset.mode = 'qr-code';
  };
  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style = `
    width: 24px;
    fill: var(--fg);
    pointer-events: none;
  `;
  svg.setAttribute('viewBox', '0 0 256 256');

  const rect2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect2.setAttribute('height', '80');
  rect2.setAttribute('rx', '16');
  rect2.setAttribute('width', '80');
  rect2.setAttribute('x', '40');
  rect2.setAttribute('y', '40');

  const rect3 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect3.setAttribute('height', '80');
  rect3.setAttribute('rx', '16');
  rect3.setAttribute('width', '80');
  rect3.setAttribute('x', '40');
  rect3.setAttribute('y', '136');

  const rect4 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect4.setAttribute('height', '80');
  rect4.setAttribute('rx', '16');
  rect4.setAttribute('width', '80');
  rect4.setAttribute('x', '136');
  rect4.setAttribute('y', '40');

  // Create path elements
  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path1.setAttribute('d', 'M144,184a8,8,0,0,0,8-8V144a8,8,0,0,0-16,0v32A8,8,0,0,0,144,184Z');

  const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path2.setAttribute('d', 'M208,152H184v-8a8,8,0,0,0-16,0v56H144a8,8,0,0,0,0,16h32a8,8,0,0,0,8-8V168h24a8,8,0,0,0,0-16Z');

  const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path3.setAttribute('d', 'M208,184a8,8,0,0,0-8,8v16a8,8,0,0,0,16,0V192A8,8,0,0,0,208,184Z');

  // Append elements to SVG
  svg.append(rect2, rect3, rect4, path1, path2, path3);
  input.append(svg);
  link.prepend(input);
}
function disable() {
  delete self.qr;
  iframe.contentDocument.getElementById('qr-button')?.remove();
  iframe.contentDocument.getElementById('qr-container')?.remove();
}

export {
  enable,
  disable
};
