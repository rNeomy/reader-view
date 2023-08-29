class ttsComponent extends HTMLElement {
  #timeout;
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --fg: #202124;
          --bg-one: #fff;
          --bg-two: #f2f2f2;
          --bg-three: #f4f4f4;
          --link: #0095dd;
          --scheme: #7c6d6d;
          --gap: 5px;
          --width: 400px;
          --top: 10px;
          --right: 10px;

          position: fixed;
          top: var(--top);
          right: var(--right);
          display: block;
          overflow: hidden;
          width: var(--width);
          accent-color: var(--scheme);
          fill: var(--scheme);
          font-size: 13px;
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          color: var(--fg);
        }
        input,
        select {
          color: inherit;
          font-size: inherit;
        }
        input[type=button] {
          cursor: pointer;
        }
        button {
          width: 32px;
          height: 32px;
          outline: none;
          border: none;
          cursor: pointer;
          background-color: var(--bg-three);
        }
        button svg {
          pointer-events: none;
        }
        button:disabled, input[type=button]:disabled {
          opacity: 0.3;
          cursor: default;
        }
        select {
          -webkit-appearance: none;
          border: none;
          outline: none;
          cursor: pointer;
          background-color: var(--bg-three);
          height: 24px;
          padding: var(--gap);
        }
        #play:not(.playing) svg:last-of-type {
          display: none;
        }
        #play.playing svg:first-of-type {
          display: none;
        }
        #body {
          border: solid 1px var(--bg-three);
        }
        #body.minimized #one {
          display: flex;
          padding: 0;
        }
        #body.minimized #controls,
        #body.minimized #voices,
        #body.minimized #two,
        #body.minimized #three {
           display: none;
        }
        #body > div {
          padding-inline: calc(2 * var(--gap));
        }
        #tools {
          display: flex;
          align-items: center;
        }
        #tools input {
          border: none;
        }
        #one {
          background-color: var(--bg-two);
          display: grid;
          align-items: center;
          grid-template-columns: 7ch 1fr min-content;
        }
        #controls {
          display: flex;
          gap: var(--gap);
          align-items: center;
          justify-content: center;
        }
        #two {
          display: grid;
          grid-template-columns: min-content 1fr 3ch;
          grid-gap: var(--gap);
          align-items: center;
          background-color: var(--bg-one);
          padding-block: calc(2 * var(--gap));
        }
        #two span.display {
          text-align: center;
        }
        #three {
          background-color: var(--bg-two);
          display: grid;
          grid-template-columns: min-content min-content 10fr;
          grid-gap: var(--gap);
          align-items: center;
          overflow: hidden;
        }
        #three > span {
          padding: calc(var(--gap) * 2) var(--gap);
        }
        #msg {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: end;
          white-space: nowrap;
        }
        #shortcuts[href] {
          text-decoration: none;
          color: var(--link);
        }
      </style>
      <div id="body">
        <div id="one">
          <select id="voices">
            <option disabled selected>Loading...</option>
          </select>
          <div id="controls">
            <button id="previous-paragraph" disabled title="Previous Paragraph (command)">
              <svg viewBox="0 0 512 512">
                <path class="st0" d="M75.7,96h8.1c6.7,0,12.2,5,12.2,11.7v113.5L283.1,98.7c2.5-1.7,5.1-2.3,8.1-2.3c8.3,0,15.4,7,15.4,17v63.1  l118.5-78.2c2.5-1.7,5-2.3,8.1-2.3c8.3,0,14.9,7.4,14.9,17.4v286c0,10-6.7,16.5-15,16.5c-3.1,0-5.4-1.2-8.2-2.9l-118.3-77.6v64  c0,10-7.2,16.5-15.5,16.5c-3.1,0-5.5-1.2-8.2-2.9L96,290.8v113c0,6.7-5.4,12.2-12.2,12.2h-8.1c-6.7,0-11.7-5.5-11.7-12.2V107.7  C64,101,68.9,96,75.7,96z"></path>
              </svg>
            </button>
            <button id="previous-line" disabled title="Previous Line">
              <svg viewBox="0 0 32 32" width="16">
                <path d="M25.46,2.11a1,1,0,0,0-1,.08L8,14V3A1,1,0,0,0,6,3V29a1,1,0,0,0,2,0V18L24.41,29.81A1,1,0,0,0,26,29V3A1,1,0,0,0,25.46,2.11Z"/>
              </svg>
            </button>
            <button id="play" disabled title="Play/Pause (command)" class="paused">
              <svg viewBox="0 0 512 512">
                <path d="M405.2,232.9L126.8,67.2c-3.4-2-6.9-3.2-10.9-3.2c-10.9,0-19.8,9-19.8,20H96v344h0.1c0,11,8.9,20,19.8,20  c4.1,0,7.5-1.4,11.2-3.4l278.1-165.5c6.6-5.5,10.8-13.8,10.8-23.1C416,246.7,411.8,238.5,405.2,232.9z"></path>
              </svg>
              <svg viewBox="0 0 512 512">
                <rect height="320" width="79" x="128" y="96"></rect><rect height="320" width="79" x="305" y="96"></rect>
              </svg>
            </button>
            <button id="next-line" disabled title="Next Line">
              <svg viewBox="0 0 32 32" width="16">
                <path d="M25,2a1,1,0,0,0-1,1V14L7.59,2.19A1,1,0,0,0,6,3V29a1,1,0,0,0,1.59.81L24,18V29a1,1,0,0,0,2,0V3A1,1,0,0,0,25,2Z"/>
              </svg>
            </button>
            <button id="next-paragraph" disabled title="Next Paragraph (command)">
              <svg viewBox="0 0 512 512">
                <path class="st0" d="M436.3,96h-8.1c-6.7,0-12.2,5-12.2,11.7v113.5L228.9,98.7c-2.5-1.7-5.1-2.3-8.1-2.3c-8.3,0-15.4,7-15.4,17v63.1  L86.9,98.3c-2.5-1.7-5.1-2.3-8.1-2.3c-8.3,0-14.9,7.4-14.9,17.4v286c0,10,6.7,16.5,15,16.5c3.1,0,5.4-1.2,8.2-2.9l118.3-77.6v64  c0,10,7.2,16.5,15.5,16.5c3.1,0,5.5-1.2,8.2-2.9L416,290.8v113c0,6.7,5.4,12.2,12.2,12.2h8.1c6.7,0,11.7-5.5,11.7-12.2V107.7  C448,101,443.1,96,436.3,96z"></path>
              </svg>
            </button>
            <button id="stop" disabled title="Stop">
              <svg viewBox="0 0 512 512">
                <path d="M437.4,64H74.6C68.7,64,64,68.7,64,74.6v362.8c0,5.9,4.7,10.6,10.6,10.6h362.8c5.8,0,10.6-4.7,10.6-10.6V74.6  C448,68.7,443.2,64,437.4,64z"></path>
              </svg>
            </button>
            <button id="relocate" title="Select a text then press this button to start reading from the start of selected area">
              <svg viewBox="0 0 16 16">
                <path d="M8 1a.5.5 0 0 1 .5.5V6h-1V1.5A.5.5 0 0 1 8 1zm0 14a.5.5 0 0 1-.5-.5V10h1v4.5a.5.5 0 0 1-.5.5zM2 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7z"/>
              </svg>
            </button>
          </div>
          <div id="tools">
            <input type="button" value="-" id="min" title="toggle minimized"/>
            <input type="button" value="×" id="close"/>
          </div>
        </div>
        <datalist id="steplist-volume">
          <option>0.2</option>
          <option>0.4</option>
          <option>0.6</option>
          <option>0.8</option>
        </datalist>
        <datalist id="steplist-rate">
          <option>0.5</option>
          <option>1.0</option>
          <option>1.5</option>
          <option>2.0</option>
          <option>2.5</option>
        </datalist>
        <datalist id="steplist-pitch">
          <option>0.5</option>
          <option>1.0</option>
          <option>1.5</option>
        </datalist>
        <div id="two">
          <span>Volume</span>
          <input min="0.1" max="1" step="0.1" type="range" id="volume" list="steplist-volume">
          <span id="volume-span" class="display">1.00</span>
          <span>Speed</span>
          <input min="0.1" max="3" step="0.1" type="range" id="rate" list="steplist-rate">
          <span id="rate-span" class="display">1.00</span>
          <span>Pitch</span>
          <input min="0.1" max="2" step="0.1" type="range" id="pitch" list="steplist-pitch">
          <span id="pitch-span" class="display">1.00</span>
        </div>
        <div id="three">
          <span id="version">...</span>
          <a id="shortcuts" target=_blank>Shortcuts</a>
          <span id="msg"></span>
        </div>
      </div>
    `;
  }
  connectedCallback() {
    this.shadowRoot.getElementById('min').onclick = e => {
      const body = this.shadowRoot.getElementById('body');
      body.classList.toggle('minimized');
      this.style.width = body.classList.contains('minimized') ? 'unset' : 'var(--width)';
      e.target.value = body.classList.contains('minimized') ? '□' : '-';
    };
    this.shadowRoot.getElementById('close').onclick = () => {
      this.destroy();
      this.remove();
    };
    this.shadowRoot.getElementById('play').onclick = () => {
      this.toggle();
    };
    this.shadowRoot.getElementById('stop').onclick = () => this.stop();
    this.shadowRoot.getElementById('relocate').onclick = () => this.relocate();
    this.shadowRoot.getElementById('previous-paragraph').onclick = () => this.paragraph('backward');
    this.shadowRoot.getElementById('next-paragraph').onclick = () => this.paragraph('forward');
    this.shadowRoot.getElementById('previous-line').onclick = () => this.line('backward');
    this.shadowRoot.getElementById('next-line').onclick = () => this.line('forward');
    this.shadowRoot.getElementById('voices').onchange = e => this.voice(JSON.parse(e.target.value));
    this.shadowRoot.getElementById('volume').oninput = e => {
      this.shadowRoot.getElementById('volume-span').textContent = e.target.valueAsNumber.toFixed(2);
      this.volume(e.target.valueAsNumber, e);
    };
    this.shadowRoot.getElementById('rate').oninput = e => {
      this.shadowRoot.getElementById('rate-span').textContent = e.target.valueAsNumber.toFixed(2);
      this.rate(e.target.valueAsNumber, e);
    };
    this.shadowRoot.getElementById('pitch').oninput = e => {
      this.shadowRoot.getElementById('pitch-span').textContent = e.target.valueAsNumber.toFixed(2);
      this.pitch(e.target.valueAsNumber, e);
    };
  }
  active(enabled = true) {
    this.shadowRoot.getElementById('play').disabled = enabled === false;
    this.shadowRoot.getElementById('stop').disabled = enabled === false;
    this.shadowRoot.getElementById('previous-paragraph').disabled = enabled === false;
    this.shadowRoot.getElementById('previous-line').disabled = enabled === false;
    this.shadowRoot.getElementById('next-line').disabled = enabled === false;
    this.shadowRoot.getElementById('next-paragraph').disabled = enabled === false;
  }
  state(playing) {
    this.shadowRoot.getElementById('play').classList[playing ? 'add' : 'remove']('playing');
  }
  version(v) {
    this.shadowRoot.getElementById('version').textContent = v;
  }
  toggle() {
    const e = this.shadowRoot.getElementById('play');
    e.classList.contains('playing') ? this.pause() : this.play();
  }
  $(id) {
    return this.shadowRoot.getElementById(id);
  }
  shortcuts(href) {
    this.shadowRoot.getElementById('shortcuts').href = href;
  }
  message(msg, timeout = -1) {
    this.shadowRoot.getElementById('msg').textContent = msg;
    clearTimeout(this.#timeout);
    if (timeout !== -1) {
      setTimeout(() => {
        this.shadowRoot.getElementById('msg').textContent = '';
      }, timeout);
    }
  }
  voices(voices, def) {
    this.shadowRoot.getElementById('voices').textContent = '';

    const langs = {};
    for (const voice of voices) {
      const lang = voice.lang.split('-')[0];
      langs[lang] = langs[lang] || [];
      langs[lang].push(voice);
    }
    for (const voices of Object.values(langs)) {
      voices.sort((a, b) => (a.lang + ' ' + a.name).localeCompare(b.lang + ' ' + b.name));
    }
    for (const [lang, voices] of Object.entries(langs)) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = lang;
      for (const voice of voices) {
        const option = document.createElement('option');
        option.value = JSON.stringify({
          name: voice.name,
          lang: voice.lang,
          voiceURI: voice.voiceURI
        });
        let tag = 'Local';
        if (voice.voiceURI === 'audio') {
          tag = 'Custom';
        }
        else if (voice.localService === false) {
          tag = 'Remote';
        }

        if (def && voice.name === def.name && voice.lang === def.lang && voice.voiceURI === def.voiceURI) {
          option.selected = true;
        }
        if (!def && voice.default) {
          option.selected = true;
        }
        option.textContent = voice.lang + ' - ' + voice.name + ' - ' + tag;
        optgroup.append(option);
      }
      this.shadowRoot.getElementById('voices').append(optgroup);
    }
  }
  configure(name, value) {
    this.shadowRoot.getElementById(name).value = value;
    this.shadowRoot.getElementById(name).dispatchEvent(new Event('input'));
  }
  play() {
    console.info('play clicked');
  }
  pause() {
    console.info('pause clicked');
  }
  stop() {
    console.info('stop clicked');
  }
  relocate() {
    console.info('relocate clicked');
  }
  line(direction) {
    console.info('line clicked', direction);
  }
  paragraph(direction) {
    console.info('paragraph clicked', direction);
  }
  voice(voice) {
    console.info('voice changed', voice);
  }
  volume(value) {
    console.info('volume changed', value);
  }
  rate(value) {
    console.info('rate changed', value);
  }
  pitch(value) {
    console.info('pitch changed', value);
  }
  destroy() {
    console.info('destroy');
  }
}

customElements.define('tts-component', ttsComponent);
