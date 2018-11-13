/* globals iframe, config, isFirefox */
'use strict';

var synth = window.speechSynthesis;

// rate
{
  const rate = document.querySelector('#speech [type=range]');
  rate.addEventListener('change', e => {
    speech.instance.rate = e.target.value;
    chrome.storage.local.set({
      'speech-rate': e.target.value
    });
  });
  rate.value = config.prefs['speech-rate'];
}

synth.onvoiceschanged = () => {
  const voices = synth.getVoices();
  const langs = {};
  voices.forEach(o => {
    langs[o.lang] = langs[o.lang] || [];
    langs[o.lang].push(o);
  });
  const select = document.querySelector('#speech select');
  select.addEventListener('change', () => {
    const [lang, name, uri] = select.value.split('/');
    select.closest('label').dataset.value = lang;
    select.closest('label').title = name;
    chrome.storage.local.set({
      'speech-voice': uri
    }, () => {
      if (speech.element) {
        synth.pause();
        speech.queue.unshift(speech.element);
        delete speech.element.dataset.crvurd;
        speech.speak();
      }
    });
  });
  Object.entries(langs).forEach(([key, voices]) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = key;
    voices.forEach(voice => {
      const option = document.createElement('option');
      option.textContent = voice.name;
      option.value = `${key}/${voice.name}/${voice.voiceURI}`;
      if (config.prefs['speech-voice'] === voice.voiceURI) {
        option.selected = true;
        select.closest('label').dataset.value = key;
        select.closest('label').title = voice.name;
      }
      optgroup.appendChild(option);
      select.appendChild(optgroup);
    });
  });
};

var speech = {};

speech.elements = {
  play: document.querySelector('#speech [data-cmd=play]')
};

speech.speak = () => {
  [...iframe.contentDocument.querySelectorAll('.speech')].forEach(e => e.classList.remove('speech'));
  window.clearTimeout(speech.id);
  const e = speech.queue.shift();
  speech.element = e;
  if (e && e.closest('[data-crvurd]') === null) {
    if (typeof speech.instance !== 'undefined') {
      delete speech.instance.onend;
    }
    const instance = speech.instance = new SpeechSynthesisUtterance();

    instance.onstart = () => speech.elements.play.dataset.cmd = 'pause';
    instance.onresume = () => speech.elements.play.dataset.cmd = 'pause';
    instance.onpause = () => speech.elements.play.dataset.cmd = 'resume';
    instance.onend = () => {
      speech.elements.play.dataset.cmd = 'play';
      if (synth.speaking === false && synth.busy !== true) {
        speech.id = window.setTimeout(speech.speak, 200);
      }
    };

    e.classList.add('speech');
    e.dataset.crvurd = true;
    e.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });

    const lang = e.closest('[lang]');
    if (lang && lang.lang) {
      instance.lang = lang.lang;
    }

    instance.text = e.textContent;
    instance.pitch = config.prefs['speech-pitch'];
    instance.rate = config.prefs['speech-rate'];
    if (config.prefs['speech-voice'] !== 'default') {
      const voice = synth.getVoices().filter(o => o.voiceURI === config.prefs['speech-voice']).shift();
      if (voice) {
        instance.voice = voice;
      }
    }
    synth.busy = true;
    synth.cancel();
    if (isFirefox) {
      synth.pause();
      synth.resume();
    }
    synth.speak(instance);
    window.setTimeout(() => synth.busy = false, 300);
  }
  else if (e) { // already read; skipping
    speech.speak();
  }
  else {
    document.querySelector('#speech [data-cmd=close-speech]').click();
  }
};
speech.queue = [];
speech._queue = []; // persistent list; used for accessing already read elements

document.addEventListener('click', async({target}) => {
  const cmd = target.dataset.cmd;

  if (cmd === 'pause') {
    synth.pause();
    speech.elements.play.dataset.cmd = 'resume'; // redundant; due to a Chrome bug
  }
  else if (cmd === 'resume') {
    synth.resume();
    speech.elements.play.dataset.cmd = 'pause'; // redundant; due to a Chrome bug
  }
  else if (cmd === 'close-speech') {
    synth.pause();
    synth.cancel();
    speech.queue = [];
    delete speech.element;
  }
  else if (cmd === 'play') {
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
      speech._queue.unshift(e);
      nodes = nodes.filter(n => e.contains(n) === false);
    }
    speech.speak();
  }
  else if (cmd === 'previous' && speech.element) {
    const index = speech._queue.indexOf(speech.element);
    delete speech.element.dataset.crvurd;
    speech.queue.unshift(speech.element);
    if (index !== -1 && index !== 0) {
      delete speech._queue[index - 1].dataset.crvurd;
      speech.queue.unshift(speech._queue[index - 1]);
    }
    synth.pause();
    speech.speak();
  }
  else if (cmd === 'next') {
    synth.cancel();
  }
});

window.addEventListener('beforeunload', () => synth.cancel());
