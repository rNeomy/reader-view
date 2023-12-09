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
    }
  }
};

let player;

function enable() {
  const span = document.createElement('span');
  span.title = chrome.i18n.getMessage('rd_speech');
  span.classList.add('icon-speech');
  if (config.prefs['speech-button'] === false) {
    span.classList.add('hidden');
  }
  span.id = 'speech-button';
  const print = document.querySelector('#toolbar .icon-print');
  document.getElementById('toolbar').insertBefore(span, print);

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
        'tts-scroll': 'center'
      }, resolve));

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
                  return nav.relocate(true);
                }
                else if (r === 'END_OF_FILE') {
                  player.message('End of Document', 1000);
                  return nav.relocate(true);
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
      speech.error = e => {
        if (e.target?.nodeName === 'AUDIO' && player) {
          player.message('Cannot use this voice. Please choice another one!');
          player.dataset.mode = 'stop';
        }
      };
      speech.boundary = () => {};

      player.version('v' + speech.version);
      speech.ready().then(() => {
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
            const o = JSON.parse(v);
            player.voices(speech.voices, o);
            player.voice(o, false);
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

        if (save) {
          nav.predict = voice.voiceURI === `audio`;
          localStorage.setItem('tts-v1-object', JSON.stringify(voice));
        }

        if (v.permission) {
          chrome.permissions.request({
            origins: [v.permission]
          }, granted => {
            if (granted) {
              if (v.referer && v.origin) {
                chrome.runtime.sendMessage({
                  cmd: 'prepare-tts-network',
                  referer: v.referer,
                  origin: v.origin
                }, () => speech.reset());
              }
              else {
                speech.reset();
              }
            }
            else {
              speech.configure();
              speech.reset();
            }
          });
        }
        else {
          speech.reset();
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
        }
        player?.state(playing);
      };
    }
    document.body.dataset.speech = true;
    iframe.contentDocument.body.dataset.speech = true;
    player.message('Please wait...');
    player.play();
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
