/* global defaults, ready */
/* plug-in system */

chrome.storage.local.get({
  './plugins/health/core.mjs': defaults['./plugins/health/core.mjs']
}, prefs => {
  if (prefs['./plugins/health/core.mjs']) {
    import('./plugins/health/core.mjs').then(o => o.enable());
  }
});

ready().then(() => chrome.storage.local.get({
  './plugins/tip/core.mjs': defaults['./plugins/tip/core.mjs'],
  './plugins/doi/core.mjs': defaults['./plugins/doi/core.mjs'],
  './plugins/note/core.mjs': defaults['./plugins/note/core.mjs'],
  './plugins/notify/core.mjs': defaults['./plugins/notify/core.mjs'],
  './plugins/tts/core.mjs': defaults['./plugins/tts/core.mjs'],
  './plugins/chapters/core.mjs': defaults['./plugins/chapters/core.mjs']

}, prefs => {
  if (prefs['./plugins/tip/core.mjs']) {
    import('./plugins/tip/core.mjs').then(o => o.enable());
  }
  if (prefs['./plugins/doi/core.mjs']) {
    import('./plugins/doi/core.mjs').then(o => o.enable());
  }
  if (prefs['./plugins/note/core.mjs']) {
    import('./plugins/note/core.mjs').then(o => o.enable());
  }
  if (prefs['./plugins/notify/core.mjs']) {
    import('./plugins/notify/core.mjs').then(o => o.enable());
  }
  if (prefs['./plugins/tts/core.mjs']) {
    import('./plugins/tts/core.mjs').then(o => o.enable());
  }
  if (prefs['./plugins/chapters/core.mjs']) {
    import('./plugins/chapters/core.mjs').then(o => o.enable());
  }
}));
chrome.storage.onChanged.addListener(ps => {
  // AMO does not like dynamic imports
  if ('./plugins/tip/core.mjs' in ps) {
    import('./plugins/tip/core.mjs').then(o => o[ps['./plugins/tip/core.mjs'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/doi/core.mjs' in ps) {
    import('./plugins/doi/core.mjs').then(o => o[ps['./plugins/doi/core.mjs'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/note/core.mjs' in ps) {
    import('./plugins/note/core.mjs').then(o => o[ps['./plugins/note/core.mjs'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/notify/core.mjs' in ps) {
    import('./plugins/notify/core.mjs').then(o => o[ps['./plugins/notify/core.mjs'].newValue ? 'enable' : 'disable']());
  }
  if ('.plugins/health/core.mjs' in ps) {
    import('.plugins/health/core.mjs').then(o => o[ps['.plugins/health/core.mjs'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/tts/core.mjs' in ps) {
    import('./plugins/tts/core.mjs').then(o => o[ps['./plugins/tts/core.mjs'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/chapters/core.mjs' in ps) {
    import('./plugins/chapters/core.mjs').then(o => o[ps['./plugins/chapters/core.mjs'].newValue ? 'enable' : 'disable']());
  }
});

