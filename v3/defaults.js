self.defaults = {
  'embedded': false,
  'auto-fullscreen': false,
  'auto-rules': [],
  'font-size': 15,
  'os-sync': false,
  'display-loader': true,
  'max-wait-for-page-load': 3, // seconds
  'preferred-dark-mode': 'groove-dark',
  'preferred-light-mode': 'sepia',
  'font': 'Helvetica, Arial, sans-serif',
  'supported-fonts': [{
    name: 'Sans-serif',
    value: `Helvetica, Arial, sans-serif`
  }, {
    name: `Serif`,
    value: `Georgia, 'Times New Roman', serif`
  }, {
    name: `Helvetica`,
    value: `'Helvetica', sans-serif`
  }, {
    name: `Times New Roman`,
    value: `'Times New Roman', serif`
  }, {
    name: `Georgia`,
    value: `'Georgia', serif`
  }, {
    name: `Verdana`,
    value: `'Verdana', sans-serif`
  }, {
    name: `Tahoma`,
    value: `'Tahoma', sans-serif`
  }, {
    name: `Open Sans`,
    value: `'Open Sans', sans-serif`
  }, {
    name: `Poppins`,
    value: `Poppins, sans-serif`
  }, {
    name: `Comic Neue`,
    value: `'Comic Neue', Arial, sans-serif`
  }, {
    name: `Lexend Deca`,
    value: `'Lexend Deca', Arial, sans-serif`
  }],
  'width': 600,
  'line-height': 32,
  'column-count': 1,
  'text-align': true,
  'fixation-point': 0, // 0: off, 1-5 (text-vide)
  'reader-mode': false,
  'show-icon': true,
  'title': '[ORIGINAL] :: [BRAND]',
  'tts-delay': 300,
  'tts-maxlength': 160,
  'tts-minlength': 60,
  'tts-separator': '\n!\n',
  'tts-scroll': 'center',
  'ask-for-favicon': true,
  'mail-to': 'email@example.com',
  'mail-max': 1500,
  'mail-ending': `

--
Original Page: [URL]`,
  'faqs': true,
  'version': null,
  'guide': 3, // guide height is n times font-size; zero means no guide
  'guide-timeout': 2000, // ms
  'mode': 'sepia',
  'printing-button': true,
  'screenshot-button': false,
  'note-button': true,
  'mail-button': true,
  'save-button': true,
  'fullscreen-button': true,
  'speech-button': true,
  'images-button': true,
  'highlight-button': true,
  'design-mode-button': true,
  'show-images': true,
  'navigate-buttons': true,
  'toggle-toolbar': true,
  'top-css': '',
  'cache-highlights': true,
  'highlights-count': 20, // number of highlighted persistent highlighted websites
  'highlights-keys': [],
  'highlights-objects': {},
  'user-action': [],
  'user-css': `body {
  padding-bottom: 64px;
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
  overflow: hidden;
}
blockquote {
  padding: 0;
  padding-inline-start: 2ch;
  border-inline-start: 2px solid var(--bd);
}
aside {
  color: color-mix(in srgb, var(--fg), var(--bg) 20%);
}
body[data-mode="dark"] pre code {
  background-color: #eff0f1;
  color: #393318;
}

/* CSS for sans-serif fonts */
body[data-font=sans-serif] {}
/* CSS for serif fonts */
body[data-font=serif] {}

/* CSS for "sepia" theme */
html[data-mode=sepia] body {}
/* CSS for "light" theme */
html[data-mode=light] body {}
/* CSS for "dark" theme */
html[data-mode=dark] body {}`,
  'context-open-in-reader-view': false,
  'context-open-in-reader-view-bg': false,
  'context-switch-to-reader-view': true,
  'shortcuts': {
    'print': ['Ctrl/Command', 'KeyP'],
    'screenshot': ['Ctrl/Command', 'KeyO'],
    'note': ['Ctrl/Command', 'Shift', 'KeyB'],
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
    'previous-chapter': ['Ctrl/Command', 'PageUp'],
    'next-chapter': ['Ctrl/Command', 'PageDown'],
    'toggle-toolbar': ['Ctrl/Command', 'Shift', 'KeyY']
  },
  './plugins/tip/core.mjs': true,
  './plugins/doi/core.mjs': true,
  './plugins/note/core.mjs': true,
  './plugins/notify/core.mjs': true,
  './plugins/health/core.mjs': true,
  './plugins/tts/core.mjs': true,
  './plugins/chapters/core.mjs': true,
  './plugins/multiple-articles/core.mjs': true,
  './plugins/qr-code/core.mjs': true
};

