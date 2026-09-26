/* global args */

class TTSL1 {
  #timeout;
  #live = false;
  #config = {
    pitch: 1,
    rate: 1,
    volume: 1
  };

  constructor() {
    this.version = '0.1.1';
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
    // always re-speak the current utterance (restarts it when it was playing)
    const text = this.instance?.text;

    clearTimeout(this.#timeout);

    if (text) {
      this.#play({
        text
      }, true);
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
      this.#live = false;
      this.state();
      this.play({
        automated: true
      }, 'forward', false, true);
    };
    instance.onerror = e => {
      this.#live = false;
      this.error(e);
      this.state();
    };
    instance.onpause = () => this.state();
    instance.onresume = () => {
      this.#live = true;
      this.state();
    };
    instance.onstart = e => {
      this.#live = true;
      this.state(true);
    };
    instance.onboundary = e => this.boundary(e);

    if (play) {
      this.#live = false;
      // engine flags can lie after a reload mid-speech, but they only matter
      // for deciding whether a settle delay is needed
      const busy = speechSynthesis.speaking || speechSynthesis.pending;
      try {
        speechSynthesis.resume(); // un-deadlock a paused engine; no-op when idle
        speechSynthesis.cancel(); // unconditional flush is safe
      }
      catch (e) {}
      const speak = () => {
        try {
          speechSynthesis.speak(instance);
        }
        catch (e) {
          setTimeout(() => speechSynthesis.speak(instance), 200);
        }
      };
      if (busy) {
        // Chrome swallows a speak() issued in the same tick as cancel()
        this.#timeout = setTimeout(speak, 100);
      }
      else {
        speak();
      }
    }
  }
  // options is passed to the this.get; use it to provide options; this method only overwrites "automated" property
  play(options = {}, direction = 'forward', resume = true) {
    clearTimeout(this.#timeout);

    // only resume when it is our own live utterance; engine-only flags
    // (zombie after a reload) must not prevent starting a fresh chain
    if (resume && this.#live && speechSynthesis.paused) {
      speechSynthesis.resume();
      return;
    }
    this.content(options, direction).then(segment => { // segment = {text, 'next-text', delay}
      if (segment) {
        const delay = segment.delay ? (this.voice?.localService ? segment.delay.local : segment.delay.remote) : 0;
        this.#timeout = setTimeout(() => this.#play(segment), delay || 0);
      }
      else {
        // no segment to play (e.g. start/end of the document); stop the cycle
        this.stop();
        this.state(false);
      }
    }).catch(e => this.error(e));
  }
  pause() {
    clearTimeout(this.#timeout);
    if (this.#live && speechSynthesis.paused === false && speechSynthesis.speaking) {
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
    this.#live = false;
    clearTimeout(this.#timeout);
    speechSynthesis.destroy();
  }
  stop() {
    this.#live = false;
    clearTimeout(this.#timeout);
    try {
      // pulling the engine out of a paused/deadlocked state first;
      // resume() is a no-op when idle
      speechSynthesis.resume();
    }
    catch (e) {}
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
    console.info('boundary', e);
  }
  state() {
    console.info('state changed');
  }
}

window.TextToSpeech = TTSL1;
