/* globals iframe, config, isFirefox */
'use strict';

var synth = window.speechSynthesis;
var speech = {};

speech.speak = () => {
  [...iframe.contentDocument.querySelectorAll('.speech')].forEach(e => e.classList.remove('speech'));
  window.clearTimeout(speech.id);
  const e = speech.queue.shift();
  if (e && e.closest('[data-crvurd]') === null) {
    const instance = new SpeechSynthesisUtterance();
    instance.onend = () => {
      speech.id = window.setTimeout(speech.speak, 100);
    };
    e.classList.add('speech');
    e.dataset.crvurd = true;
    e.scrollIntoViewIfNeeded();

    const lang = e.closest('[lang]');
    if (lang && lang.lang) {
      instance.lang = lang.lang;
    }

    instance.text = e.textContent;
    instance.pitch = config.prefs['speech-pitch'];
    instance.rate = config.prefs['speech-rate'];
    if (config.prefs['speech-voice'] !== 'default') {
      const voice = speechSynthesis.getVoices().filter(o => o.voiceURI === config.prefs['speech-voice']).shift();
      if (voice) {
        instance.voice = voice;
      }
    }
    synth.cancel();
    if (isFirefox) {
      synth.pause();
      synth.resume();
    }
    synth.speak(instance);
  }
  else if (e) { // already read; skipping
    speech.speak();
  }
  else {
    document.querySelector('#speech [data-cmd=close-speech]').click();
  }
};
speech.queue = [];

document.addEventListener('click', async({target}) => {
  const cmd = target.dataset.cmd;

  if (cmd === 'pause') {
    synth.pause();
    target.dataset.cmd = 'resume';
  }
  else if (cmd === 'resume') {
    synth.resume();
    target.dataset.cmd = 'pause';
  }
  else if (cmd === 'close-speech') {
    synth.pause();
    synth.cancel();
    speech.queue = [];
    document.querySelector('#speech [data-cmd]').dataset.cmd = 'play';
  }
  else if (cmd === 'play') {
    target.dataset.cmd = 'pause';

    // clear read data
    iframe.contentDocument.querySelectorAll('[data-crvurd]').forEach(e => delete e.dataset.crvurd);

    let nodes = [];
    const texts = node => {
      for (node = node.firstChild; node; node = node.nextSibling) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (node.nodeValue.trim()) {
            nodes.unshift(node);
          }
        }
        else {
          texts(node);
        }
      }
    };

    [...iframe.contentDocument.querySelectorAll('.page')]
      .forEach(page => texts(page));

    while(nodes.length) {
      const node = nodes.shift();
      const e = node.parentElement;
      speech.queue.unshift(e);
      nodes = nodes.filter(n => e.contains(n) === false);
    }

    speech.speak();
  }
  else if (cmd === 'open-speech') {
    document.querySelector('#speech [data-cmd]').click();
  }
  else if (cmd === 'next') {
    synth.cancel();
  }
});

window.addEventListener('beforeunload', () => synth.cancel());
