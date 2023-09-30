/* global args */

class TTSL1 {
  #timeout;
  #config = {
    pitch: 1,
    rate: 1,
    volume: 1
  };

  constructor() {
    this.version = '0.1.0';
  }
  // get the next or previous segment to play
  content() {
    return Promise.resolve({
      text: 'this is a sample text',
      delay: {
        local: 0,
        remote: 0
      }
    });
  }
  ready() {
    this.voices = speechSynthesis.getVoices();

    if (this.voices.length) {
      this.ready = () => Promise.resolve();
      return Promise.resolve();
    }
    else {
      return Promise.race([
        new Promise(resolve => speechSynthesis.addEventListener('voiceschanged', resolve, {
          once: true
        })),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]).then(() => {
        this.voices = speechSynthesis.getVoices(true);
        this.ready = () => Promise.resolve();
      });
    }
  }
  configure(voice) { // {name, lang, voiceURI}
    if (voice) {
      this.voice = this.voices.filter(e => {
        return e.name === voice.name && e.lang === voice.lang && e.voiceURI === voice.voiceURI;
      }).shift();
    }
    this.voice = this.voice || this.voices.filter(e => e.default).shift();
  }
  reset() {
    const play = speechSynthesis.speaking && !speechSynthesis.paused;
    const text = this.instance?.text;

    if (text) {
      this.#play({
        text
      }, play);
    }
  }
  #play(segment, play = true) {
    const instance = this.instance = new SpeechSynthesisUtterance();
    instance.name(args.get('id') || 'tts-storage');
    instance.text = segment.text;
    instance['next-text'] = segment['next-text'];
    instance.voice = this.voice;
    instance.pitch = this.#config.pitch;
    instance.rate = this.#config.rate;
    instance.volume = this.#config.volume;

    instance.onend = () => {
      this.state();
      this.play({
        automated: true
      }, 'forward', false, true);
    };
    instance.onerror = e => {
      this.error(e);
      this.state();
    };
    instance.onpause = () => this.state();
    instance.onresume = () => this.state();
    instance.onstart = () => this.state();
    instance.onboundary = e => this.boundary(e);

    speechSynthesis.cancel();
    if (play) {
      speechSynthesis.speak(instance);
    }
  }
  // options is passed to the this.get; use it to provide options; this method only overwrites "automated" property
  play(options = {}, direction = 'forward', resume = true) {
    clearTimeout(this.#timeout);

    if (resume && speechSynthesis.speaking && speechSynthesis.paused) {
      speechSynthesis.resume();
      return;
    }
    this.content(options, direction).then(segment => { // segment = {text, 'next-text', delay}
      if (segment) {
        const delay = segment.delay ? (this.voice?.localService ? segment.delay.local : segment.delay.remote) : 0;

        this.#timeout = setTimeout(() => this.#play(segment), delay || 0);
      }
      else {
        console.warn('empty segment');
      }
    }).catch(e => this.error(e));
  }
  pause() {
    clearTimeout(this.#timeout);
    if (speechSynthesis.paused === false && speechSynthesis.speaking) {
      speechSynthesis.pause();
    }
  }
  next(options = {}) {
    this.play(options, 'forward', false, false);
  }
  previous(options = {}) {
    this.play(options, 'backward', false, false);
  }
  destroy() {
    speechSynthesis.destroy();
  }
  stop() {
    clearTimeout(this.#timeout);
    speechSynthesis.cancel();
  }
  #adjust(method = 'volume', value = 1) {
    this.#config[method] = value;
    if (this.instance) {
      this.instance[method] = value;
    }
  }
  volume(value) {
    value = Math.min(1, Math.max(value, 0)) ?? 1;
    this.#adjust('volume', value);
  }
  pitch(value) {
    value = Math.min(2, Math.max(value, 0.1)) ?? 1;
    this.#adjust('pitch', value);
  }
  rate(value) {
    value = Math.min(10, Math.max(value, 0.1)) ?? 1;
    this.#adjust('rate', value);
  }
  error(e) {
    console.error('error', e);
  }
  boundary(e) {
    console.log('boundary', e);
  }
  state() {
    console.log('state changed');
  }
}

window.TextToSpeech = TTSL1;
