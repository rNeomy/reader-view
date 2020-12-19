'use strict';

[...document.querySelectorAll('.edit-toolbar')].forEach(e => e.remove());

{
  const toolbar = document.createElement('iframe');
  const doc = iframe.contentDocument;

  const unload = (report = true) => {
    window.onmessage = '';
    toolbar.remove();
    chrome.runtime.onMessage.removeListener(onmessage);
    if (report) {
      if (doc.designMode === 'on') {
        top.document.getElementById('design-mode-button').click();
      }
    }
  };

  window.onmessage = e => {
    const command = e.data.method;
    const stop = () => {
      e.preventDefault();
      e.stopPropagation();
    };

    if (
      command === 'bold' || command === 'italic' || command === 'insertorderedlist' || command === 'removeformat' ||
      command === 'insertunorderedlist' || command === 'indent' || command === 'outdent'
    ) {
      doc.execCommand(command);
      stop();
    }
    else if (command === 'link') {
      const href = prompt('Enter a URL (keep blank to remove link):', '');
      if (href) {
        doc.execCommand('createlink', false, href);
      }
      else {
        doc.execCommand('unlink');
      }
      stop();
    }
    else if (command === 'insertimage') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          doc.execCommand('insertimage', false, reader.result);
        };
        if (file) {
          reader.readAsDataURL(file);
        }
      };
      input.click();

      stop();
    }
    else if (command === 'heading-0') {
      doc.execCommand('formatBlock', false, 'p');
      stop();
    }
    else if (command === 'heading-1') {
      doc.execCommand('formatBlock', false, 'h1');
      stop();
    }
    else if (command === 'heading-2') {
      doc.execCommand('formatBlock', false, 'h2');
      stop();
    }
    else if (command === 'heading-3') {
      doc.execCommand('formatBlock', false, 'h3');
      stop();
    }
    else if (command === 'blockquote') {
      doc.execCommand('formatBlock', false, 'blockquote');
      stop();
    }
    else if (command === 'move') {
      toolbar.style.left = (parseInt(toolbar.style.left) + e.data.data.dx) + 'px';
      toolbar.style.top = (parseInt(toolbar.style.top) + e.data.data.dy) + 'px';
      stop();
    }
    else if (command === 'close') {
      unload();
      stop();
    }
  };

  toolbar.src = chrome.runtime.getURL('/data/reader/libs/design-mode/index.html');
  toolbar.classList.add('edit-toolbar');
  toolbar.style = `
    z-index: 1000000000000;
    position: fixed;
    top: 10px;
    right: 10px;
    width: 476px;
    height: 38px;
    border: none;
  `;
  document.documentElement.appendChild(toolbar);

  const onmessage = request => {
    if (request.method === 'unload') {
      unload(false);
    }
  };

  chrome.runtime.onMessage.addListener(onmessage);
}
