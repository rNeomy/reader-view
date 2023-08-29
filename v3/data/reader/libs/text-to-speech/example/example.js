/* global splitText, Navigate, TextToSpeech */

const config = {
  length: {
    max: 160,
    min: 60
  },
  delay: {
    sentences: 2000,
    same: 300
  }
};

const nav = new Navigate();
const speech = new class extends TextToSpeech {
  content(options, direction) {
    const {length, delay} = config;

    return new Promise(resolve => {
      if (direction === 'backward') {
        speech.cache.length = 0;
      }
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

speech.ready().then(() => {
  speech.configure();

  if (speech.voices.length) {
    document.getElementById('play').disabled = false;
  }
  else {
    alert('There is no voice to use');
  }
});
document.getElementById('play').onclick = () => speech.play();
document.getElementById('pause').onclick = () => speech.pause();
document.getElementById('previous-line').onclick = () => speech.previous();
document.getElementById('previous-paragraph').onclick = () => speech.previous({
  type: 'paragraph'
});
document.getElementById('next-line').onclick = () => {
  speech.cache.length = 0;
  speech.next();
};
document.getElementById('next-paragraph').onclick = () => {
  speech.cache.length = 0;
  speech.next({
    type: 'paragraph'
  });
};
document.getElementById('stop').onclick = () => {
  speech.stop();
  speech.cache.length = 0;
  nav.relocate(true);
};
document.getElementById('relocate').onclick = () => {
  speech.stop();
  speech.cache.length = 0;
  nav.relocate(nav.string() ? false : true);
};

document.getElementById('volume').oninput = e => speech.volume(e.target.valueAsNumber);
document.getElementById('pitch').oninput = e => speech.pitch(e.target.valueAsNumber);
document.getElementById('rate').oninput = e => speech.rate(e.target.valueAsNumber);
