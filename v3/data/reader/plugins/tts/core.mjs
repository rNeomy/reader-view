/**
    Reader View - Strips away clutter

    Copyright (C) 2014-2022 [@rNeomy]

    This program is free software: you can redistribute it and/or modify
    it under the terms of the Mozilla Public License as published by
    the Mozilla Foundation, either version 2 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    Mozilla Public License for more details.
    You should have received a copy of the Mozilla Public License
    along with this program.  If not, see {https://www.mozilla.org/en-US/MPL/}.

    GitHub: https://github.com/rNeomy/reader-view/
    Homepage: https://webextension.org/listing/chrome-reader-view.html
*/

/* global config, add Navigate TextToSpeech iframe splitText shortcuts scrollbar */
'use strict';

const prefs = {
  length: {
    max: 160,
    min: 60
  },
  delay: {
    sentences: {
      local: 600,
      remote: 50
    },
    same: {
      local: 100,
      remote: 0
    },
    from(config = {}) {
      const n = Math.max(0, Number(config['tts-delay']) || 0);
      this.sentences.local = n || 600;
      return this;
    }
  }
};

let player;

function enable() {
  // we insert this button on load to prevent toolbar rearrangement
  let span = document.getElementById('speech-button');
  if (!span) {
    span = document.createElement('span');
    span.id = 'speech-button';
    span.classList.add('icon-speech');
    span.title = chrome.i18n.getMessage('rd_speech');

    const print = document.querySelector('#toolbar .icon-print');
    document.getElementById('toolbar').insertBefore(span, print);
  }

  if (config.prefs['speech-button'] === false) {
    span.classList.add('hidden');
  }

  span.onclick = async () => {
    if (typeof TextToSpeech === 'undefined') {
      await add('libs/text-to-speech/voices/translate.js');
      if (localStorage.getItem('tts-v1-watson-beta') === 'true') {
        await add('libs/text-to-speech/voices/watson.js');
      }
      await add('libs/text-to-speech/custom-speech-synthesis.js');
      await add('libs/text-to-speech/text-to-speech.js');
      await add('libs/text-to-speech/navigate.js');
      await add('libs/text-to-speech/player.js');
      await add('libs/text-to-speech/example/helper.js');
    }

    if (document.body.dataset.speech === 'true') {
      return player.destroy();
    }
    else if (!player) {
      // document.querySelector('#speech [data-id=msg-speech]').textContent = 'Loading Resources...';

      const ps = await new Promise(resolve => chrome.storage.local.get({
        'tts-scroll': 'center',
        'tts-delay': defaults['tts-delay']
      }, resolve));
      prefs.delay.from(ps);

      player = document.createElement('tts-component');

      // reposition if there is an scrollbar
      try {
        if (scrollbar.has()) {
          player.style.right = CSS.px(scrollbar.width() + 10);
        }
      }
      catch (e) {}

      // overwrite the default toggle
      player.toggle = () => {
        if (player.dataset.mode === 'play') {
          player.pause();
          player.message('');
        }
        else {
          player.play();
        }
      };
      player.shortcuts(chrome.runtime.getManifest().homepage_url + '#faq7');
      document.body.append(player);

      /* shortcuts */
      shortcuts.set(player.$('previous-paragraph'), {
        id: 'speech-previous',
        action: () => player?.paragraph('backward')
      });
      shortcuts.set(player.$('next-paragraph'), {
        id: 'speech-next',
        action: () => player?.paragraph('forward')
      });
      shortcuts.set(player.$('play'), {
        id: 'speech-play',
        action: () => player?.toggle()
      });
      shortcuts.render([
        player.$('previous-paragraph'),
        player.$('next-paragraph'),
        player.$('play')
      ]);

      const nav = new class extends Navigate {
      }(iframe.contentWindow, iframe.contentDocument.getElementById('readability-page-1'));

      // only enable prediction for audio voices
      nav.predict = (localStorage.getItem('tts-v1-object') || '').includes('"voiceURI":"audio"');

      const speech = new class extends TextToSpeech {
        content(options, direction) {
          const {length, delay} = prefs;

          if (!options.automated) {
            speech.cache.length = 0;
            speech.ncache = '';
          }

          return new Promise(resolve => {
            // read from cache
            const text = speech.cache.shift();

            if (text) {
              player.message('Preparing...');
              resolve({
                text,
                'delay': delay.same,
                'next-text': speech.cache.length ? speech.cache[0] : speech.ncache
              });
            }
            else {
              let text = '';
              for (let n = 0; n < 10; n += 1) {
                const r = nav[options.type || 'line'](direction, ps['tts-scroll']);

                if (r === 'START_OF_FILE') {
                  player.message('Start of Document', 1000);
                  nav.relocate(true);
                  return resolve(null);
                }
                else if (r === 'END_OF_FILE') {
                  player.message('End of Document', 1000);
                  nav.relocate(true);
                  return resolve(null);
                }
                text = nav.string();

                if (text.trim().length) {
                  break;
                }
              }

              if (text.length > length.max) {
                const texts = splitText(text, length.max, length.min);

                text = texts.shift();
                speech.cache = texts;
              }

              speech.ncache = nav['next_matched_string'];
              if (speech.ncache?.length > length.max) {
                speech.ncache = splitText(speech.ncache, length.max, length.min)[0];
              }
              // console.log(text, ' -> ', speech.ncache);

              player.message('Preparing...');
              resolve({
                text,
                'delay': options.automated ? delay.sentences : 0,
                'next-text': speech.cache.length ? speech.cache[0] : speech.ncache
              });
            }
          });
        }
      }();
      speech.play = new Proxy(speech.play, {
        apply(target, self, args) {
          return Reflect.apply(target, self, args);
        }
      });
      speech.cache = [];
      speech.ncache = '';
      speech.failures = 0;
      speech.error = e => {
        console.warn('speech error', e);
        if (player) {
          if (e.error === 'interrupted' || e.error === 'canceled') {
            // regular control flow (stop/relocate/next)
            return;
          }
          if (e.target?.nodeName === 'AUDIO' || e.error) {
            speech.failures = (speech.failures || 0) + 1;
            if (speech.failures >= 2) {
              // the selected voice is definitely broken; revert to a local one
              speech.failures = 0;
              const d = speech.voices.find(v => v.default && v.localService !== false) ||
                speech.voices.find(v => v.default) ||
                speech.voices[0];
              if (d) {
                player.dataset.mode = 'stop';
                const o = {
                  name: d.name,
                  lang: d.lang,
                  voiceURI: d.voiceURI
                };
                localStorage.setItem('tts-v1-object', JSON.stringify(o));
                nav.predict = false;
                player.voices(speech.voices, o);
                player.message('Cannot use this voice. Reverted to: ' + d.name, 3000);
                player.voice(o, false);
              }
              else {
                player.message('Cannot use this voice. Please choice another one!');
                player.dataset.mode = 'stop';
              }
            }
            else {
              player.message('Cannot use this voice. Please choice another one!');
              player.dataset.mode = 'stop';
            }
          }
        }
      };
      speech.boundary = () => {};

      player.version('v' + speech.version);
      speech.ready().then(async () => {
        if (speech.voices.length) {
          player.active(true);
          const vv = localStorage.getItem('tts-v1-volume');
          if (vv) {
            player.configure('volume', vv);
          }
          const vr = localStorage.getItem('tts-v1-rate');
          if (vr) {
            player.configure('rate', vr);
          }
          const vp = localStorage.getItem('tts-v1-pitch');
          if (vp) {
            player.configure('pitch', vp);
          }

          const v = localStorage.getItem('tts-v1-object');
          if (v) {
            try {
              const o = JSON.parse(v);
              // only restore if the voice still exists; otherwise fall back silently
              const exists = speech.voices.some(e => {
                return e.name === o.name && e.lang === o.lang && e.voiceURI === o.voiceURI;
              });
              player.voices(speech.voices, exists ? o : undefined);
              if (exists) {
                player.voice(o, false);
              }
              else {
                localStorage.removeItem('tts-v1-object');
                speech.configure();
                // stale voice; start with the default one
                player.play(false);
              }
            }
            catch (e) {
              console.warn('cannot restore the saved voice', e);
              player.voices(speech.voices);
              player.play(false);
            }
          }
          else {
            player.voices(speech.voices);
          }
        }
        else {
          player.message('no TTS voice!');
        }
      });

      /* controls */
      player.voice = (voice, save = true) => {
        player.message('Applying voice...');
        speech.configure(voice);

        const v = speech.voice;

        const apply = () => {
          player.message('');
          if (player.dataset.mode === 'stop' || player.dataset.mode === 'paused') {
            // keep silence; the new voice is ready for the next play
            speech.stop();
            return;
          }
          if (speech.instance?.text) {
            // replay the current sentence (no second content() -> no skip)
            speech.reset();
            return;
          }
          if (player.dataset.mode === 'play') {
            // nothing was consumed yet; start reading from the current position
            player.play(false);
          }
        };
        const next = () => {
          if (save) {
            nav.predict = voice?.voiceURI === `audio`;
            localStorage.setItem('tts-v1-object', JSON.stringify(voice));
          }
          const cv = speech.voice;
          if (cv?.referer && cv?.origin) {
            chrome.runtime.sendMessage({
              cmd: 'prepare-tts-network',
              referer: cv.referer,
              origin: cv.origin
            }, () => {
              void chrome.runtime.lastError;
              apply();
            });
          }
          else {
            apply();
          }
        };
        const fallback = () => {
          // revert to the default voice but keep the previously saved one
          nav.predict = false;
          speech.configure();
          apply();
        };

        if (v?.permission) {
          chrome.permissions.contains({
            origins: [v.permission]
          }, granted => {
            if (granted === true) {
              next();
            }
            else {
              // request() needs a user gesture; skip silently when restoring on load
              if (save === false) {
                fallback();
                return;
              }
              chrome.permissions.request({
                origins: [v.permission]
              }, g => {
                if (chrome.runtime.lastError || g !== true) {
                  player.message('Permission is denied. Reverting to the default voice', 3000);
                  fallback();
                }
                else {
                  next();
                }
              });
            }
          });
        }
        else if (v) {
          next();
        }
        else {
          player.message('Voice not found. Using the default voice', 3000);
          fallback();
        }
      };
      player.play = (resume = true) => {
        player.dataset.mode = 'play';
        speech.play(undefined, undefined, resume);
      };
      player.pause = () => {
        player.dataset.mode = 'paused';
        speech.pause();
        // for "Google Remote" voices
        speech.state(false);
      };
      player.line = direction => {
        speech[direction === 'forward' ? 'next' : 'previous']();
      };
      player.paragraph = direction => {
        speech[direction === 'forward' ? 'next' : 'previous']({
          type: 'paragraph'
        });
      };
      player.stop = () => {
        player.dataset.mode = 'stop';
        speech.stop();
        speech.cache.length = 0;
        speech.ncache = '';
        speech.failures = 0;
        nav.relocate(true);
        player.message('');
      };
      player.relocate = () => {
        speech.stop();
        speech.cache.length = 0;
        speech.ncache = '';

        // do not use nav.string() since it returns string from this.range;
        nav.relocate(nav.selection.toString() ? false : true);
        player.play(false);
      };
      player.volume = (value, e) => {
        if (e?.isTrusted) {
          localStorage.setItem('tts-v1-volume', value);
        }
        speech.volume(value);
      };
      player.rate = (value, e) => {
        if (e?.isTrusted) {
          localStorage.setItem('tts-v1-rate', value);
        }
        speech.rate(value);
      };
      player.pitch = (value, e) => {
        if (e?.isTrusted) {
          localStorage.setItem('tts-v1-pitch', value);
        }
        speech.pitch(value);
      };
      player.destroy = () => {
        player.dataset.mode = 'stop';
        player.stop();
        player.remove();
        speech.destroy();
        nav.destroy();
        player = undefined;
        document.body.dataset.speech = false;
        iframe.contentDocument.body.dataset.speech = false;
      };
      speech.state = playing => {
        playing = playing ?? (speechSynthesis.speaking && !speechSynthesis.paused);

        if (playing) {
          player.message('');
          // a working voice resets the failure counter
          speech.failures = 0;
        }
        player?.state(playing);
      };
    }
    document.body.dataset.speech = true;
    iframe.contentDocument.body.dataset.speech = true;
    player.message('Please wait...');
    player.dataset.mode = 'play';
    // with a saved voice, defer the start until the voice is applied to
    // prevent consuming the first sentence twice (see the restore path)
    if (localStorage.getItem('tts-v1-object') === null) {
      player.play(true);
    }
  };

  shortcuts.set(span, {
    id: 'speech',
    action: span.onclick
  });
  shortcuts.render([span]);
}
function disable() {
  try {
    player.destroy();
  }
  catch (e) {}
  document.getElementById('speech-button').remove();
}

export {
  enable,
  disable
};
