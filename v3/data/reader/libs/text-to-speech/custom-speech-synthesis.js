{
  const audio = new Audio();
  audio.preservesPitch = true;
  let voice;

  /* custom SpeechSynthesisUtterance */
  class CustomSpeechSynthesisUtterance extends SpeechSynthesisUtterance {
    constructor(...args) {
      super(...args);
    }
    set voice(v) {
      if (v?.voiceURI === 'audio') {
        voice = v;
      }
      else {
        voice = undefined;
        super.voice = v;
      }
    }
    set volume(v) {
      super.volume = v;
      audio.volume = super.volume;
    }
    get volume() {
      return super.volume;
    }
    set rate(v) {
      super.rate = v;
      audio.playbackRate = super.rate;
    }
    get rate() {
      return super.rate;
    }
    name(name) {
      this.cache = name;
    }
  }
  self.SpeechSynthesisUtterance = CustomSpeechSynthesisUtterance;

  /* custom speechSynthesis */
  speechSynthesis.speak = new Proxy(speechSynthesis.speak, {
    apply(target, self, args) {
      const [instance] = args;

      if (voice) {
        return caches.open(this.cache).then(async cache => {
          // cache next text
          const nt = instance['next-text'];
          if (nt && nt.trim()) {
            voice.build(nt).then(src => {
              cache.match(src).then(r => {
                if (!r) {
                  cache.add(src).catch(e => console.info('failed to cache', e));
                }
              });
            });
          }

          const src = await voice.build(instance.text);
          const r = await cache.match(src);
          if (r) {
            if (audio.src && audio.src.startsWith('blob:')) {
              URL.revokeObjectURL(audio.src);
            }
            const b = await r.blob();
            audio.src = URL.createObjectURL(b);
          }
          else {
            // To-Do; save the audio to cache
            audio.src = src;
          }
          audio.playbackRate = instance.rate || 1;

          audio.onended = instance.onend;
          audio.onerror = instance.onerror;
          audio.onplaying = instance.onstart;
          audio.onpause = instance.onpause;

          audio.play().catch(e => instance.onerror(e));

          return audio;
        }).catch(e => instance.onerror(e));
      }
      else {
        return Reflect.apply(target, self, args);
      }
    }
  });
  speechSynthesis.cancel = new Proxy(speechSynthesis.cancel, {
    apply(target, self, args) {
      audio.pause();
      return Reflect.apply(target, self, args);
    }
  });
  speechSynthesis.pause = new Proxy(speechSynthesis.pause, {
    apply(target, self, args) {
      audio.pause();
      return Reflect.apply(target, self, args);
    }
  });
  speechSynthesis.resume = new Proxy(speechSynthesis.resume, {
    apply(target, self, args) {
      if (voice) {
        audio.play();
      }
      else {
        return Reflect.apply(target, self, args);
      }
    }
  });
  speechSynthesis.destroy = () => {
    audio.src = '';
  };

  const synthProxy = new Proxy(speechSynthesis, {
    get(target, prop, receiver) {
      const value = target[prop];

      if (value instanceof Function) {
        return function(...args) {
          return value.apply(this === receiver ? target : this, args);
        };
      }
      if (voice && prop === 'speaking') {
        return audio.error ? false : true;
      }
      if (voice && prop === 'paused') {
        return audio.paused;
      }
      return value;
    }
  });
  Object.defineProperty(self, 'speechSynthesis', {
    get() {
      return synthProxy;
    }
  });
}
