/* global tokenizer */
'use strict';

const isFirefox = /Firefox/.test(navigator.userAgent) || typeof InstallTrigger !== 'undefined';

{
  class Emitter {
    constructor() {
      this.events = {};
    }
    on(name, callback) {
      this.events[name] = this.events[name] || [];
      this.events[name].push(callback);
    }
    emit(name, ...data) {
      (this.events[name] || []).forEach(c => {
        c(...data);
      });
    }
  }

  window.addEventListener('unload', () => speechSynthesis.cancel());

  const LAZY = Symbol();
  const CALC = Symbol();
  const TEXT = Symbol();
  const SRC = Symbol();

  class SimpleTTS extends Emitter {
    constructor(doc = document, options = {
      separator: '\n!\n',
      delay: 300,
      maxlength: 160,
      minlength: 60,
      scroll: 'center'
    }) {
      super();
      this.doc = doc;

      this.SEPARATOR = options.separator; // this is used to combine multiple sections on local voice case
      this.DELAY = options.delay; // delay between sections
      this.MAXLENGTH = options.maxlength; // max possible length for each section
      this.MINLENGTH = options.minlength; // min possible length for each section

      this.postponed = []; // functions that need to be called when voices are ready
      this.sections = [];
      this.local = true;
      this.dead = false;
      this.offset = 0;
      this.state = 'stop';

      // for local voices, use separator to detect when a new section is played
      this.on('instance-boundary', e => {
        if (e.charIndex && e.target.text.substr(e.charIndex - 1, 3) === this.SEPARATOR) {
          const passed = e.target.text.substr(0, e.charIndex - 1);
          if (passed.endsWith(this.sections[this.offset].textContent)) {
            this.offset += 1;
            this.emit('section', this.offset);
          }
        }
      });
      // delete the audio element when idle is emitted
      this.on('idle', () => delete this.audio);
      // for remote voices use end event to detect when a new section is played
      this.on('instance-end', () => {
        if (this.local === false) {
          if (this.sections.length > this.offset + 1 && this.dead === false) {
            this.offset += 1;
            this.emit('section', this.offset);
            this.instance.text = this[TEXT]();
            // delay only if there is a section
            const timeout = this.sections[this.offset].target === this.sections[this.offset - 1].target ?
              0 : this.DELAY;
            this[LAZY](() => this.speak(), timeout);
          }
          else {
            if (this.sections.length === this.offset + 1) {
              this.emit('idle');
            }
            this.emit('end');
          }
        }
        else {
          this.emit('idle');
          this.emit('end');
        }
      });
      this.on('instance-start', () => this.emit('section', this.offset));

      this.voices = speechSynthesis.getVoices();
      if (this.voices.length === 0) {
        Promise.race([
          new Promise(resolve => speechSynthesis.addEventListener('voiceschanged', resolve)),
          new Promise(resolve => window.setTimeout(resolve, 1000))
        ]).then(() => {
          this.voices = speechSynthesis.getVoices(true);
          this.postponed.forEach(c => c());
        });
      }
    }
    [LAZY](callback, timeout = this.DELAY) {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(callback, timeout);
    }
    ready() {
      return this.voices.length ? Promise.resolve() : new Promise(resolve => this.postponed.push(resolve));
    }
    create() {
      const instance = new SpeechSynthesisUtterance();
      instance.onstart = () => this.emit('instance-start');
      instance.onresume = () => this.emit('instance-resume');
      instance.onpause = () => this.emit('instance-pause');
      instance.onboundary = e => this.emit('instance-boundary', e);
      instance.onend = () => this.emit('instance-end');
      this.instance = instance;

      if (this.audio) {
        this.audio.pause();
      }
      this.audio = new Audio();
      let s = false;
      this.audio.addEventListener('pause', () => {
        if (this.audio) {
          instance.onpause();
        }
        else {
          instance.onend();
        }
      });
      this.audio.addEventListener('ended', async () => {
        const {srcs} = this.audio;
        if (Array.isArray(srcs)) {
          const src = srcs.shift();
          if (src) {
            this.audio.src = await this.convert(src);
            this.audio.play();
            return;
          }
        }
        instance.onend();
      });
      this.audio.addEventListener('canplay', () => {
        if (s === false) {
          instance.onstart();
          s = true;
        }
      });
      this.audio.addEventListener('playing', () => {
        if (s === true) {
          instance.onresume();
          s = true;
        }
      });
      this.audio.addEventListener('error', e => {
        console.warn('TTS Error', e);
        this.emit('error', e.message || 'tts.js: Cannot decode this audio. Please use another voice.');
        this.emit('status', 'error');
      });
    }
    voice(voice) {
      this.local = voice.localService;

      delete this._voice;
      if (speechSynthesis.speaking && voice.voiceURI === 'custom') {
        speechSynthesis.cancel();
      }
      if (voice.voiceURI === 'custom') {
        this._voice = voice;
      }
      else {
        this.instance.voice = voice;
      }
    }
    stop() {
      this.state = 'stop';
      window.clearTimeout(this.timer);
      // already playing
      const speaking = speechSynthesis.speaking || (this.audio ? !this.audio.paused : false);
      if (speaking) {
        this.dead = true;
        speechSynthesis.cancel();
        if (/Firefox/.test(navigator.userAgent)) {
          speechSynthesis.pause();
          speechSynthesis.resume();
        }
      }
      if (this.audio) {
        this.audio.pause();
      }
    }
    record() {

    }
    [TEXT](offset = this.offset) {
      if (this.local) {
        return this.sections.slice(offset).map(e => e.textContent).join(this.SEPARATOR);
      }
      else {
        const section = this.sections[offset];
        return section ? section.textContent : '';
      }
    }
    start(offset = 0) {
      this.state = 'play';
      this.offset = offset;
      if (speechSynthesis.speaking) {
        this.stop();
      }
      // initiate
      this.instance.text = this[TEXT]();

      this.dead = false;
      this.speak();
    }
    [SRC](text) {
      return this._voice.build(text);
    }
    convert(src) {
      return Promise.resolve(src);
    }
    async speak() {
      this.state = 'play';
      if (this._voice) {
        const src = await this[SRC](this.instance.text);
        this.audio.srcs = src;
        this.emit('status', 'buffering');
        if (Array.isArray(src)) {
          const s = src.shift();
          this.audio.src = await this.convert(s);
        }
        else {
          this.audio.src = await this.convert(src);
        }
        this.audio.play();
      }
      else {
        speechSynthesis.speak(this.instance);
      }
    }
    resume() {
      this.state = 'play';
      if (this._voice) {
        this.audio.play();
      }
      else {
        speechSynthesis.resume();
      }
      // bug; remote voice does not trigger resume event
      if (this.local === false) {
        this.emit('instance-resume');
      }
    }
    pause() {
      this.state = 'pause';
      // bug; remote voice does not trigger pause event
      if (this.local === false) {
        this.emit('instance-pause');
      }

      if (this._voice) {
        this.audio.pause();
      }
      else {
        speechSynthesis.pause();
      }
    }
  }
  class PreLoadTTS extends SimpleTTS {
    constructor(...args) {
      super(...args);
      this.CACHE = Math.random().toString(36).substring(7);

      if (isFirefox) {
        const rs = {};
        window.caches.open = new Proxy(window.caches.open, {
          apply() {
            return {
              match(src) {
                return Promise.resolve(rs[src]);
              },
              async add(src) {
                const blob = await fetch(src).then(r => r.blob());
                rs[src] = {
                  blob() {
                    return blob;
                  }
                };
              }
            };
          }
        });
      }
    }
    create() {
      super.create();
      this.audio.addEventListener('canplaythrough', async () => {
        const c = await caches.open(this.CACHE);
        const add = async srcs => {
          for (const src of srcs) {
            try {
              (await c.match(src)) || await c.add(src);
            }
            catch (e) {
              console.warn('Failed to cache a request', e);
            }
          }
        };

        // store next (part 1)
        const p1 = this[TEXT](this.offset + 1);
        if (p1 && typeof caches !== 'undefined') {
          // only add src if it is not available
          const srcs = [await super[SRC](p1)].flat();
          await add(srcs);
        }
        // store current
        const current = this[TEXT]();
        if (current && typeof caches !== 'undefined') {
          // only add src if it is not available
          const srcs = [await super[SRC](current)].flat();
          await add(srcs);
        }
        // store next (part 2)
        const p2 = this[TEXT](this.offset + 2);
        if (p2 && typeof caches !== 'undefined') {
          // only add src if it is not available
          const srcs = [await super[SRC](p2)].flat();
          await add(srcs);
        }
      });
    }
    async convert(src) {
      try {
        const c = await caches.open(this.CACHE);
        const r = await c.match(src);

        if (r) {
          const b = await r.blob();
          console.log(b);
          return URL.createObjectURL(b);
        }
      }
      catch (e) {}
      return src;
    }
  }
  class Parser extends PreLoadTTS {
    feed(...parents) {
      // "target" attribute conflicts with the internal naming
      for (const parent of parents) {
        for (const a of [...parent.querySelectorAll('[target]')]) {
          a.removeAttribute('target');
        }
      }

      let nodes = [];
      const texts = node => {
        if (!node) {
          return;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          nodes.unshift(node);
        }
        else {
          const iterator = document.createNodeIterator(node, NodeFilter.SHOW_TEXT);
          let c;
          while (c = iterator.nextNode()) {
            nodes.unshift(c);
          }
        }
      };
      parents.forEach(page => texts(page));

      const sections = [];
      while (nodes.length) {
        const node = nodes.shift();
        if (node.nodeValue) {
          const e = node.parentElement;
          if (e.offsetParent !== null) { // is element hidden
            sections.unshift(e);
          }
          nodes = nodes.filter(n => e.contains(n) === false);
        }
      }

      // if a section is already included, remove it;
      const toBeRemoved = [];
      sections.forEach((e, i) => {
        for (const section of sections.slice(Math.max(0, i - 10), i)) {
          if (section.contains(e)) {
            toBeRemoved.push(e);
          }
        }
      });
      for (const e of toBeRemoved) {
        const index = sections.indexOf(e);
        sections.splice(index, 1);
      }
      // marge small sections
      for (let i = 0; i < sections.length; i += 1) {
        const a = sections[i];
        const b = sections[i + 1];
        if (
          a.textContent.length < this.MINLENGTH && b &&
          a.textContent.length + b.textContent.length < this.MAXLENGTH
        ) {
          const o = {
            textContent: a.textContent + this.SEPARATOR + b.textContent,
            targets: [a.targets ? a.targets : (a.target || a), b.targets ? b.targets : (b.target || b)].flat()
          };
          o.target = o.targets[0];
          sections.splice(i, 2, o);
          i -= 1;
        }
      }
      // split by [.,]
      for (const section of sections) {
        if (section.textContent.length < this.MAXLENGTH || section.targets) {
          this.sections.push(section);
        }
        else {
          const parts = [];
          if (typeof tokenizer === 'object') {
            parts.push(...tokenizer.sentences(section.textContent, {}));
          }
          else {
            let offset = 0;
            for (const i of [...section.textContent.matchAll(/[.,]\s/g), {
              index: section.textContent.length
            }].map(m => m.index)) {
              const p = section.textContent.substring(offset, i + 1).replace(/\u00A0/g, ' ');
              parts.push(p);
              offset = i + 2;
            }
          }
          const combined = [];
          let length = 0;
          let cache = [];
          for (const part of parts) {
            if (length > this.MAXLENGTH) {
              combined.push(cache.join(' '));
              cache = [part];
              length = part.length;
            }
            else {
              cache.push(part);
              length += part.length;
            }
          }
          if (cache.length !== 0) {
            combined.push(cache.join(' '));
          }
          let offset = 0;
          const textContent = section.textContent.replace(/\u00A0/g, ' ');
          for (const content of combined) {
            let pos = textContent.indexOf(content, offset);
            if (pos === -1) {
              pos = textContent.indexOf(content.split(/[,.]\s/)[0], offset);
            }
            if (pos === -1) {
              pos = textContent.indexOf(content.split('\n')[0].trim(), offset);
            }
            if (pos === -1) {
              offset = 0;
              console.warn('cannot detect a part', content.slice(0, 20), section);
            }
            else {
              offset = pos;
            }
            const s = {
              target: section,
              textContent: content,
              offset
            };
            this.sections.push(s);
          }
        }
      }
    }
  }
  class Styling extends Parser {
    constructor(doc, options) {
      super(doc, options);

      const box = document.createElement('div');
      box.classList.add('tts-box', 'hidden');
      doc.body.appendChild(box);

      const find = (word, offset, target) => {
        let node;
        let no = 0; // current node offset
        const walk = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, null, false);
        node = walk.nextNode();

        const range = new Range();

        const locate = (ch, node) => {
          const p = node.nodeValue.slice(no).indexOf(ch);

          return p === -1 ? p : p + no;
        };

        for (let x = 0; x < offset + word.length; x += 1) {
          const ch = (target.innerText || target.textContent)[x];

          while (node) {
            const index = locate(ch, node);
            if (index === -1) {
              node = walk.nextNode();
              no = 0;
            }
            else {
              if (x === offset) {
                range.setStart(node, index);
              }
              if (x === offset + word.length - 1) {
                range.setEnd(node, index + 1);

                const s = this.doc.defaultView.getSelection();
                s.removeAllRanges();
                s.addRange(range);
                if (visible(range) === false) {
                  node.parentElement.scrollIntoView({
                    block: options.scroll,
                    inline: 'nearest'
                  });
                }
              }
              no = index + 1;
              break;
            }
          }
        }
      };
      {
        let offset = 0;
        this.on('instance-boundary', e => {
          if (e.name === 'word') {
            const word = e.target.text.slice(e.charIndex, e.charIndex + e.charLength);
            if (word === this.SEPARATOR.trim()) {
              return;
            }
            const section = this.sections[this.offset];
            const target = section.target || section;
            const targets = section.targets || [target];

            let o = 0;
            for (const target of targets) {
              // <text>This is a sample text</text>
              const content = target.innerText || target.textContent;

              const p = content.indexOf(word, offset - o);

              if (p !== -1) {
                offset = p + o + 1;

                find(word, p, target);
                break;
              }
              o += content.length;
            }
          }
        });
        this.on('section', () => {
          offset = this.sections[this.offset].offset;
        });
        this.on('instance-start', () => {
          offset = 0;
        });
        this.on('instance-resume', () => {
          offset = 0;
        });
      }

      const visible = e => {
        const rect = e.getBoundingClientRect();
        return rect.top >= 0 &&
               rect.bottom <= (this.doc.defaultView.innerHeight || this.doc.documentElement.clientHeight) - 50;
      };

      this.on('section', n => {
        const section = this.sections[n];
        const es = section.targets ? section.targets : [section.target || section];

        const boxes = es.map(e => e.getBoundingClientRect());
        const top = Math.min(...boxes.map(r => r.top)) - 5;

        const vr = doc.body.getBoundingClientRect();

        box.style.top = (top - vr.top) + 'px';
        box.style.height = (Math.max(...boxes.map(r => r.bottom)) - top + 5) + 'px';
        box.classList.remove('hidden');

        // Only scroll if word selection is not controlling scroll
        if (visible(es[0]) === false && this.local === false) {
          es[0].scrollIntoView({
            block: options.scroll,
            inline: 'nearest'
          });
        }
      });
      this.on('instance-start', () => this.emit('status', 'play'));
      this.on('instance-resume', () => this.emit('status', 'play'));
      this.on('instance-pause', () => this.emit('status', 'pause'));
      this.on('end', () => this.emit('status', 'stop'));
      this.on('end', () => {
        box.classList.add('hidden');
      });
    }
    start(...args) {
      try {
        this.doc.defaultView.getSelection().collapse(this.doc, 0);
      }
      catch (e) {}

      return super.start(...args);
    }
  }
  class Navigate extends Styling {
    [CALC](direction = 'forward') {
      const offset = this.offset;
      let jump = 1;
      if (direction === 'forward' && this.sections[offset].target) {
        const {target} = this.sections[offset];
        for (const section of this.sections.slice(offset + 1)) {
          if (section.target !== target) {
            break;
          }
          else {
            jump += 1;
          }
        }
      }
      if (direction === 'backward' && this.sections[offset].target) {
        const target = this.sections[offset].target;
        for (const section of this.sections.slice(0, offset).reverse()) {
          if (section.target !== target) {
            break;
          }
          else {
            jump += 1;
          }
        }
      }
      if (direction === 'backward' && offset - jump > 0 && this.sections[offset - jump].target) {
        const target = this.sections[offset - jump].target;
        for (const section of this.sections.slice(0, offset - jump).reverse()) {
          if (section.target !== target) {
            break;
          }
          else {
            jump += 1;
          }
        }
      }
      return jump;
    }
    validate(direction = 'forward') {
      const offset = this.offset;
      const jump = this[CALC](direction);
      if (
        (direction === 'forward' && offset + jump < this.sections.length) ||
        (direction === 'backward' && offset - jump >= 0)
      ) {
        return offset + (direction === 'forward' ? jump : -1 * jump);
      }
      throw Error('out of range');
    }
    navigate(direction = 'forward', offset) {
      try {
        offset = typeof offset === 'undefined' ? this.validate(direction) : offset;
        this.stop();
        this.create();
        this.offset = offset;

        this[LAZY](() => this.start(this.offset));
      }
      catch (e) {
        console.warn('navigate request ignored');
      }
    }
  }
  class Options extends Navigate {
    constructor(doc, options) {
      super(doc, options);
      this.options = {
        get pitch() {
          return Number(localStorage.getItem('tts-pitch') || '1');
        },
        set pitch(val) {
          localStorage.setItem('tts-pitch', val);
        },
        get volume() {
          return Number(localStorage.getItem('tts-volume') || '1');
        },
        set volume(val) {
          localStorage.setItem('tts-volume', val);
        },
        get rate() {
          return Number(localStorage.getItem('tts-rate') || '1');
        },
        set rate(val) {
          localStorage.setItem('tts-rate', val);
        }
      };
    }
    create() {
      super.create();
      this.instance.pitch = this.options.pitch;
      this.instance.rate = this.options.rate;
      this.instance.lang = this.options.lang;
      this.instance.volume = this.options.volume;
      if (this.audio) {
        this.audio.addEventListener('playing', () => {
          this.audio.volume = this.options.volume;
          this.audio.playbackRate = this.options.rate;
        });
      }
    }
  }
  class Intractive extends Options {
    async attach(parent) {
      const iframe = document.createElement('iframe');
      iframe.style = `
        border: none;
        width: 300px;
        height: 100px;
        opacity: 0;
      `;
      iframe.srcdoc = `
<html>
  <head>
    <style>
      body {
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 10px;
      }
      body,
      table {
        font-size: 13px;
        font-family: Arial,"Helvetica Neue",Helvetica,sans-serif;
      }
      [data-id=controls] {
        display: flex;
        align-items: center;
      }
      button {
        width: 32px;
        height: 32px;
        outline: none;
        border: none;
        cursor: pointer;
        background-size: 24px;
        background-position: center center;
        background-repeat: no-repeat;
        background-color: transparent;
        opacity: 0.7;
      }
      button:hover,
      input[type=button]:hover {
        opacity: 1;
      }
      button:active,
      input[type=button]:active {
        opacity: 0.3;
      }
      button:disabled,
      input[type=button]:disabled {
        opacity: 0.3;
        cursor: default;
      }
      select {
        -webkit-appearance: none;
        -moz-appearance: none;
        width: 100%;
        opacity: 0;
        background-size: 35px;
        text-indent: 100px;
        border: none;
        outline: none;
        cursor: pointer;
        background-color: transparent;
        height: 24px;
      }
      label {
        position: relative;
        flex: 1;
      }
      label::before {
        content: attr(data-value);
        position: absolute;
        pointer-events: none;
        height: 100%;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(0, 0, 0, 0.05);
      }
      table div {
        display: flex;
        align-items: center;
      }
      table input {
        flex: 1;
        margin-right: 5px;
      }
      input[type="range"] + span {
        background-color: rgba(0, 0, 0, 0.1);
        min-width: 20px;
        text-align: center;
        padding: 0 5px;
      }
      .play svg:last-child {
        display: none;
      }
      .pause svg:first-child {
        display: none;
      }
      .record {
        display: none;
      }
      .record[data-active=true] {
        fill: red;
      }
    </style>
  </head>
  <body>
    <div data-id="controls">
      <label data-id="lang">
        <select></select>
      </label>
      <button disabled="true" class="previous">
        <svg viewBox="0 0 512 512">
          <path class="st0" d="M75.7,96h8.1c6.7,0,12.2,5,12.2,11.7v113.5L283.1,98.7c2.5-1.7,5.1-2.3,8.1-2.3c8.3,0,15.4,7,15.4,17v63.1  l118.5-78.2c2.5-1.7,5-2.3,8.1-2.3c8.3,0,14.9,7.4,14.9,17.4v286c0,10-6.7,16.5-15,16.5c-3.1,0-5.4-1.2-8.2-2.9l-118.3-77.6v64  c0,10-7.2,16.5-15.5,16.5c-3.1,0-5.5-1.2-8.2-2.9L96,290.8v113c0,6.7-5.4,12.2-12.2,12.2h-8.1c-6.7,0-11.7-5.5-11.7-12.2V107.7  C64,101,68.9,96,75.7,96z"/>
        </svg>
      </button>
      <button disabled="true" class="play">
        <svg viewBox="0 0 512 512">
          <path d="M405.2,232.9L126.8,67.2c-3.4-2-6.9-3.2-10.9-3.2c-10.9,0-19.8,9-19.8,20H96v344h0.1c0,11,8.9,20,19.8,20  c4.1,0,7.5-1.4,11.2-3.4l278.1-165.5c6.6-5.5,10.8-13.8,10.8-23.1C416,246.7,411.8,238.5,405.2,232.9z"/>
        </svg>
        <svg viewBox="0 0 512 512">
          <rect height="320" width="79" x="128" y="96"/><rect height="320" width="79" x="305" y="96"/>
        </svg>
      </button>
      <button disabled="true" class="next">
        <svg viewBox="0 0 512 512">
          <path class="st0" d="M436.3,96h-8.1c-6.7,0-12.2,5-12.2,11.7v113.5L228.9,98.7c-2.5-1.7-5.1-2.3-8.1-2.3c-8.3,0-15.4,7-15.4,17v63.1  L86.9,98.3c-2.5-1.7-5.1-2.3-8.1-2.3c-8.3,0-14.9,7.4-14.9,17.4v286c0,10,6.7,16.5,15,16.5c3.1,0,5.4-1.2,8.2-2.9l118.3-77.6v64  c0,10,7.2,16.5,15.5,16.5c3.1,0,5.5-1.2,8.2-2.9L416,290.8v113c0,6.7,5.4,12.2,12.2,12.2h8.1c6.7,0,11.7-5.5,11.7-12.2V107.7  C448,101,443.1,96,436.3,96z"/>
        </svg>
      </button>
      <button disabled="true" class="record">
        <svg viewBox="0 0 512 512">
            <circle cx="256" cy="256" r="220"/>
        </svg>
      </button>
      <button disabled="true" class="stop">
        <svg viewBox="0 0 512 512">
          <path d="M437.4,64H74.6C68.7,64,64,68.7,64,74.6v362.8c0,5.9,4.7,10.6,10.6,10.6h362.8c5.8,0,10.6-4.7,10.6-10.6V74.6  C448,68.7,443.2,64,437.4,64z"/>
        </svg>
      </button>
    </div>
    <table width="100%">
      <colgroup>
        <col width=60px>
        <col>
      </colgroup>
      <tbody>
        <tr title="Represents the volume value, between 0 (lowest) and 1 (highest).">
          <td>Volume</td>
          <td>
            <div>
              <input min="0.1" max="1" step="0.1" type="range" id="volume"><span>1</span>
            </div>
          </td>
        </tr>
        <tr title="Represents the rate value. It can range between 0.5 (lowest) and 3 (highest), with 1 being the default. Note that for some voices, the maximum acceptable value is 2.">
          <td>Speed</td>
          <td>
            <div>
              <input min="0.1" max="3" step="0.1" type="range" id="rate"><span>1</span>
            </div>
          </td>
        </tr>
        <tr style="display: none" title="Represents the pitch value. It can range between 0 (lowest) and 2 (highest), with 1 being the default pitch for the current platform or voice.">
          <td>Pitch</td>
          <td>
            <div>
              <input min="0.1" max="2" step="0.1" type="range" id="pitch"><span>1</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
      `;
      parent.appendChild(iframe);
      await new Promise(resolve => iframe.onload = resolve);
      // iframe.removeAttribute('srcdoc');
      Object.assign(iframe.style, {
        opacity: 1,
        width: iframe.contentDocument.body.clientWidth + 'px',
        height: iframe.contentDocument.body.clientHeight + 'px'
      });
      const div = iframe.contentDocument.querySelector('div');
      // voice
      const select = div.querySelector('select');
      const label = div.querySelector('label');
      select.addEventListener('change', e => {
        const parts = select.value.split('/');
        [label.dataset.value, label.title] = parts;

        const next = () => {
          localStorage.setItem('tts-selected', select.value);
          if (this.instance) {
            this.voice(select.selectedOptions[0].voice);
            if ((speechSynthesis.speaking && speechSynthesis.paused === false) || this.audio) {
              this.navigate(undefined, this.offset);
            }
          }
        };
        const voice = select.selectedOptions[0].voice;
        if (voice.permission) {
          chrome.permissions.request({
            origins: [voice.permission]
          }, granted => {
            if (granted) {
              next();
            }
            else {
              const alt = [...select.selectedOptions[0].parentElement.children]
                .filter(e => e.voice && e.voice.localService).shift();
              if (alt) {
                alt.selected = true;
                this.voice(alt.voice);
                select.dispatchEvent(new Event('change'));
                return;
              }
              else {
                next();
              }
            }
          });
        }
        else {
          next();
        }
      });
      // controls
      const previous = div.querySelector('.previous');
      previous.addEventListener('click', () => this.navigate('backward'));
      const play = div.querySelector('.play');
      play.addEventListener('click', () => {
        if (speechSynthesis.speaking === false && !this.audio) {
          this.create();
          this.start();
        }
        else if (this.state === 'pause') {
          this.resume();
        }
        else {
          this.pause();
        }
      });
      const next = div.querySelector('.next');
      next.addEventListener('click', () => this.navigate('forward'));
      const stop = div.querySelector('.stop');
      stop.addEventListener('click', () => {
        this.stop();
        this.emit('idle');
      });
      const record = div.querySelector('.record');
      record.addEventListener('click', () => {
        //
      });

      this.ready().then(() => {
        play.disabled = false;

        let value;
        const langs = {};
        for (const o of this.voices) {
          const lang = o.lang.split('-')[0];
          langs[lang] = langs[lang] || [];
          langs[lang].push(o);
        }

        for (const [lang, os] of Object.entries(langs).sort()) {
          const optgroup = document.createElement('optgroup');
          optgroup.label = lang;
          os.forEach(o => {
            const option = document.createElement('option');
            option.textContent = `[${o.lang}] ` + o.name;
            option.value = lang + '/' + o.name;
            option.voice = o;
            if (o.default) {
              value = option.value;
            }
            optgroup.appendChild(option);
          });
          select.appendChild(optgroup);
        }

        if (select.options.length) {
          select.value = localStorage.getItem('tts-selected') || value || select.options[0].value;
          if (!select.value) {
            select.value = value || select.options[0].value;
          }
          select.dispatchEvent(new Event('change'));
        }
        else {
          console.warn('there is no TTS voice available');
        }
      });

      const calc = () => {
        try {
          this.validate('forward');
          next.disabled = false;
        }
        catch (e) {
          next.disabled = true;
        }
        try {
          this.validate('backward');
          previous.disabled = false;
        }
        catch (e) {
          previous.disabled = true;
        }
      };
      this.on('end', () => {
        record.disabled = stop.disabled = true;
        next.disabled = true;
        previous.disabled = true;
      });
      this.on('status', s => {
        if (s === 'stop' || s === 'pause') {
          play.classList.remove('pause');
          play.classList.add('play');
          record.disabled = stop.disabled = s === 'stop' ? true : false;
          next.disabled = true;
          previous.disabled = true;
        }
        else if (s === 'buffering') {
          play.disabled = true;
          next.disabled = true;
          previous.disabled = true;
          record.disabled = stop.disabled = false;
        }
        else if (s === 'error') {
          play.disabled = false;
          next.disabled = true;
          previous.disabled = true;
          record.disabled = stop.disabled = true;
        }
        else { // play
          play.classList.add('pause');
          play.classList.remove('play');
          record.disabled = stop.disabled = false;
          play.disabled = false;
          calc();
        }
      });
      this.on('section', calc);
      this.controls = {};

      const doc = iframe.contentDocument;
      // volume
      {
        const input = doc.getElementById('volume');
        const span = input.nextElementSibling;
        span.textContent = input.value = this.options.volume;
        input.addEventListener('input', () => {
          this.options.volume = input.value;
          span.textContent = input.value;
          if (this.instance) {
            this.instance.volume = input.value;
            if (this.audio) {
              this.audio.volume = input.value;
            }
          }
        });
        this.controls.volume = input;
      }
      // pitch
      {
        const input = doc.getElementById('pitch');
        const span = input.nextElementSibling;
        span.textContent = input.value = this.options.pitch;
        input.addEventListener('input', () => {
          this.options.pitch = input.value;
          span.textContent = input.value;
          if (this.instance) {
            this.instance.pitch = input.value;
          }
        });
        this.controls.pitch = input;
      }
      // rate
      {
        const input = doc.getElementById('rate');
        const span = input.nextElementSibling;
        span.textContent = input.value = this.options.rate;
        input.addEventListener('input', () => {
          this.options.rate = input.value;
          span.textContent = input.value;

          if (this.instance) {
            this.instance.rate = input.value;
            if (this.audio) {
              this.audio.playbackRate = input.value;
            }
          }
        });
        this.controls.rate = input;
      }

      this.buttons = {
        select,
        previous,
        play,
        next,
        stop
      };
    }
    create() {
      super.create();
      const selected = this.buttons.select.selectedOptions[0];
      if (selected) {
        this.voice(selected.voice);
      }
    }
    reset() {
      this.controls.rate.value = 1;
      this.controls.rate.dispatchEvent(new Event('input'));
      this.controls.volume.value = 1;
      this.controls.volume.dispatchEvent(new Event('input'));
      this.controls.pitch.value = 1;
      this.controls.pitch.dispatchEvent(new Event('input'));
    }
  }

  window.TTS = Intractive;
}
