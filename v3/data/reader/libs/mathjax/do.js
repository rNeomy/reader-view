/* global SRE */
'use strict';

if (document.querySelector('math')) {
  const s = document.createElement('script');
  s.onload = () => {
    for (const math of document.querySelectorAll('math')) {
      try {
        const text = SRE.toSpeech(math.outerHTML);
        const p = document.createElement('p');
        p.textContent = text;
        math.after(p);
      }
      catch (e) {}
    }
  };
  s.src = 'libs/mathjax/sre/sre_browser.js';
  document.body.append(s);
}

