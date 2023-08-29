/* global TextToSpeech */

const speech = new class extends TextToSpeech {
  content(options, direction) {
    const text = 'this is a sample text ' + Math.round(Math.random() * 100);

    return Promise.resolve({
      text,
      delay: options.automated ? 0 : 300
    });
  }
}();

speech.ready().then(() => {
  if (speech.voices.length) {
    document.getElementById('play').disabled = false;
  }
  else {
    alert('There is no voice to use');
  }
});

document.getElementById('play').onclick = () => speech.play();
document.getElementById('pause').onclick = () => speech.pause();
document.getElementById('previous').onclick = () => speech.previous();
document.getElementById('next').onclick = () => speech.next();

speech.ready().then(() => {
  const langs = {};
  for (const voice of speech.voices) {
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

      option.selected = voice.default;
      option.textContent = voice.lang + ' -> ' + voice.name + ' - ' + tag;
      optgroup.append(option);
    }
    document.getElementById('voices').append(optgroup);
  }
});

document.getElementById('voices').onchange = e => {
  speech.configure(JSON.parse(e.target.value));
  speech.reset();
};

