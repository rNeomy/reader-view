/**
    Reader View - Strips away clutter

    Copyright (C) 2014-2021 [@rNeomy](https://add0n.com/chrome-reader-view.html)

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
    Homepage: https://add0n.com/chrome-reader-view.html
*/

'use strict';

// iframe issue
if (window.top !== window) {
  chrome = top.chrome;
}

// do not load config when possible
if (typeof config === 'undefined') {
  const config = {
    callbacks: [], // will be called when prefs are ready,
    onChanged: []
  };
  window.config = config;
  config.prefs = {
    'embedded': false,
    'font-size': 13,
    'font': 'sans-serif',
    'width': 600,
    'line-height': 0,
    'reader-mode': false,
    'show-icon': true,
    'tts-delay': 300,
    'tts-maxlength': 160,
    'tts-minlength': 60,
    'tts-separator': '\n!\n',
    'tts-scroll': 'center',
    'mail-to': 'email@example.com',
    'mail-max': 1500,
    'mail-ending': `

--
Original Page: [URL]`,
    'faqs': true,
    'version': null,
    'guide': 3, // guide height is n times font-size; zero means no guide
    'guide-timeout': 2000, // ms
    'mode': localStorage.getItem('mode') || 'sepia',
    'printing-button': localStorage.getItem('printing-button') !== 'false',
    'mail-button': localStorage.getItem('mail-button') !== 'false',
    'save-button': localStorage.getItem('save-button') !== 'false',
    'fullscreen-button': localStorage.getItem('fullscreen-button') !== 'false',
    'speech-button': localStorage.getItem('speech-button') !== 'false',
    'images-button': localStorage.getItem('images-button') !== 'false',
    'highlight-button': localStorage.getItem('highlight-button') !== 'false',
    'design-mode-button': localStorage.getItem('design-mode-button') !== 'false',
    'show-images': localStorage.getItem('show-images') !== 'false',
    'navigate-buttons': localStorage.getItem('navigate-buttons') !== 'false',
    'toggle-toolbar': localStorage.getItem('toggle-toolbar') !== 'false',
    'top-css': localStorage.getItem('top-css') || '',
    'cache-highlights': true,
    'highlights-count': 20, // number of highlighted persistent highlighted websites
    'highlights-keys': [],
    'highlights-objects': {},
    'user-action': [],
    'user-css': localStorage.getItem('user-css') || `body {
  padding-bottom: 64px;
}
a:visited {
  color: #d33bf0;
}
a:link, a:link:hover, a:link:active, a:link * {
  color: #0095dd;
}
a:link {
  text-decoration: none;
  font-weight: normal;
}
pre {
  white-space: pre-wrap;
}
pre code {
  background-color: #eff0f1;
  color: #393318;
  font-family: monospace;
  display: block;
  padding: 5px 10px;
}
body[data-mode="dark"] pre code {
  background-color: #585858;
  color: #e8e8e8;
}

/* CSS for sans-serif fonts */
body[data-font=sans-serif] {}
/* CSS for serif fonts */
body[data-font=serif] {}

/* CSS for "sepia" theme */
body[data-mode=sepia] {
}
/* CSS for "light" theme */
body[data-mode=light] {}
/* CSS for "dark" theme */
body[data-mode=dark] {}`,
    'context-open-in-reader-view': false,
    'context-open-in-reader-view-bg': false,
    'context-switch-to-reader-view': true,
    'shortcuts': {
      'print': ['Ctrl/Command', 'KeyP'],
      'email': ['Ctrl/Command', 'Shift', 'KeyE'],
      'save': ['Ctrl/Command', 'KeyS'],
      'fullscreen': ['F9'],
      'design-mode': ['Ctrl/Command', 'Shift', 'KeyD'],
      'speech': ['Ctrl/Command', 'Shift', 'KeyS'],
      'speech-previous': ['Ctrl/Command', 'Shift', 'KeyZ'],
      'speech-next': ['Ctrl/Command', 'Shift', 'KeyC'],
      'speech-play': ['Ctrl/Command', 'Shift', 'KeyX'],
      'images': ['Ctrl/Command', 'Shift', 'KeyI'],
      'highlight': ['Ctrl/Command', 'Shift', 'KeyH'],
      'next-page': ['Ctrl/Command', 'Shift', 'ArrowRight'],
      'previous-page': ['Ctrl/Command', 'Shift', 'ArrowLeft'],
      'toggle-toolbar': ['Ctrl/Command', 'Shift', 'KeyY']
    }
  };

  chrome.storage.onChanged.addListener(prefs => {
    Object.keys(prefs).forEach(key => config.prefs[key] = prefs[key].newValue);
    config.onChanged.forEach(c => c(prefs));
  });

  chrome.storage.local.get(config.prefs, prefs => {
    Object.assign(config.prefs, prefs);
    config.ready = true;
    config.callbacks.forEach(c => c());
  });
  config.load = c => {
    if (config.ready) {
      c();
    }
    else {
      config.callbacks.push(c);
    }
  };
}

