{
  const audio = new Audio();
  audio.preservesPitch = true;
  let voice;
  let cacheName;
  // any speak/cancel/destroy request advances the generation;
  // out-dated async pipelines (build/fetch) are abandoned
  let generation = 0;
  /* detach audio handlers and clean the state for the next utterance */
  const release = () => {
    audio.onended = null;
    audio.onerror = null;
    audio.onplaying = null;
    audio.onpause = null;
    if (audio.src && audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(audio.src);
    }
    audio.src = '';
  };
  const buildWithTimeout = text => {
    return new Promise((resolve, reject) => {
      const id = setTimeout(() => reject(Error('timeout')), 10000);
      voice.build(text).then(src => {
        clearTimeout(id);
        resolve(src);
      }).catch(e => {
        clearTimeout(id);
        reject(e);
      });
    });
  };

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
        const g = ++generation;
        cacheName = instance.cache || cacheName || 'tts-storage';
        return caches.open(cacheName).then(async cache => {
          // cache next text
          const nt = instance['next-text'];
          if (nt && nt.trim()) {
            voice.build(nt).then(src => {
              cache.match(src).then(r => {
                if (!r) {
                  cache.add(src).catch(e => console.info('failed to cache', e));
                }
              });
            }).catch(() => {});
          }

          let src;
          try {
            src = await buildWithTimeout(instance.text);
          }
          catch (e) {
            if (g !== generation) {
              return;
            }
            try {
              // single retry; several endpoints are rate-limited
              src = await buildWithTimeout(instance.text);
            }
            catch (ee) {
              console.warn('build failed', ee);
              if (g !== generation) {
                return;
              }
              release();
              return instance.onerror({
                target: audio,
                error: 'audio'
              });
            }
          }
          if (g !== generation) {
            return;
          }
          const r = await cache.match(src);
          if (r) {
            if (g !== generation) {
              return;
            }
            release();
            const b = await r.blob();
            if (g !== generation) {
              return;
            }
            audio.src = URL.createObjectURL(b);
          }
          else {
            // To-Do; save the audio to cache
            if (g !== generation) {
              return;
            }
            release();
            audio.src = src;
          }
          if (g !== generation) {
            return;
          }
          audio.playbackRate = instance.rate || 1;

          audio.onended = instance.onend;
          audio.onerror = event => {
            if (g !== generation) {
              return;
            }
            release();
            instance.onerror({
              target: audio,
              error: 'audio'
            });
          };
          audio.onplaying = e => {
            if (g === generation && instance.onstart) {
              instance.onstart(e);
            }
          };
          audio.onpause = e => {
            if (g === generation && instance.onpause) {
              instance.onpause(e);
            }
          };

          audio.play().catch(e => {
            if (g === generation) {
              release();
              instance.onerror({
                target: audio,
                error: 'audio-not-allowed'
              });
            }
          });

          return audio;
        }).catch(e => {
          if (g !== generation) {
            return;
          }
          instance.onerror(e);
        });
      }
      else {
        // switching to a regular voice; detach all custom audio leftovers
        generation += 1;
        release();
        return Reflect.apply(target, self, args);
      }
    }
  });
  speechSynthesis.cancel = new Proxy(speechSynthesis.cancel, {
    apply(target, self, args) {
      generation += 1;
      release();
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
      // only resume actual live audio (an ended track would restart)
      if (voice && audio.src && !audio.ended) {
        audio.play();
      }
      else {
        return Reflect.apply(target, self, args);
      }
    }
  });
  speechSynthesis.destroy = () => {
    generation += 1;
    release();
    if (cacheName) {
      caches.delete(cacheName).catch(() => {});
      cacheName = undefined;
    }
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
        return audio.error ? false : Boolean(audio.src && !audio.ended);
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
