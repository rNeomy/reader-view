/* global Navigate TextToSpeech splitText */

const config = {
  length: {
    max: 160,
    min: 60
  },
  delay: {
    sentences: 600,
    same: 300
  }
};
const player = document.createElement('tts-component');
document.body.append(player);

const nav = new Navigate();
const speech = new class extends TextToSpeech {
  content(options, direction) {
    const {length, delay} = config;

    return new Promise(resolve => {
      // read from cache
      const text = speech.cache.shift();
      if (text) {
        resolve({
          text,
          delay: delay.same
        });
      }
      else {
        let text = '';
        for (let n = 0; n < 10; n += 1) {
          const eof = nav[options.type || 'line'](direction);

          if (eof) {
            player.state(false);
            player.message('End of Document');
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

        resolve({
          text,
          delay: options.automated ? delay.sentences : 0
        });
      }
    });
  }
}();
speech.cache = [];
speech.error = () => {};
speech.boundary = () => {};

player.version('v' + speech.version);
speech.ready().then(() => {
  if (speech.voices.length) {
    player.active(true);
    player.voices(speech.voices);
  }
  else {
    player.message('no TTS voice!');
  }
});

/* controls */
player.voice = voice => {
  speech.configure(voice);
  speech.reset();
};
player.play = () => {
  player.message('');
  player.state(true);
  speech.play();
};
player.pause = () => {
  speech.pause();
  player.state(false);
};
player.line = direction => {
  speech[direction === 'forward' ? 'next' : 'previous']();
};
player.paragraph = direction => {
  speech.cache.length = 0;
  speech[direction === 'forward' ? 'next' : 'previous']({
    type: 'paragraph'
  });
};
player.stop = () => {
  speech.stop();
  speech.cache.length = 0;
  nav.relocate(true);
  player.state(false);
};
player.relocate = () => {
  speech.stop();
  speech.cache.length = 0;
  nav.relocate(nav.string() ? false : true);
  player.play();
};
player.volume = value => speech.volume(value);
player.rate = value => speech.rate(value);
player.pitch = value => speech.pitch(value);
