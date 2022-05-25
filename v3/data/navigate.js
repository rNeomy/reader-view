document.addEventListener('DOMContentLoaded', () => {
  const next = () => {
    setTimeout(() => chrome.runtime.sendMessage({
      cmd: 'switch-to-reader-view'
    }), 0);
  };

  chrome.storage.local.get({
    'auto-rules': []
  }, prefs => {
    for (const rule of prefs['auto-rules']) {
      if (rule.startsWith('r:')) {
        try {
          const r = new RegExp(rule.substr(2), 'i');
          if (r.test(location.href)) {
            next();
            break;
          }
        }
        catch (e) {
          console.warn('Cannot create regexp from', rule);
          return '';
        }
      }
      else {
        if (location.hostname === rule) {
          next();
          break;
        }
      }
    }
  });
});
