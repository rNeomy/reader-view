/* plug-in system */
chrome.storage.local.get({
  './plugins/tip/core.js': true,
  './plugins/doi/core.js': true
}, prefs => {
  if (prefs['./plugins/tip/core.js']) {
    import('./plugins/tip/core.js').then(o => o.enable());
  }
  if (prefs['./plugins/doi/core.js']) {
    import('./plugins/doi/core.js').then(o => o.enable());
  }
});
chrome.storage.onChanged.addListener(ps => {
  // AMO does not like dynamic imports
  if ('./plugins/tip/core.js' in ps) {
    import('./plugins/tip/core.js').then(o => o[ps['./plugins/tip/core.js'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/doi/core.js' in ps) {
    import('./plugins/doi/core.js').then(o => o[ps['./plugins/doi/core.js'].newValue ? 'enable' : 'disable']());
  }
});
