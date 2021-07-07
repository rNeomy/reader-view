/* global tokenizer */
// overwrites to support custom voices
{
  const sentences = str => {
    const list = [];
    const max = 160;
    for (const s of tokenizer.sentences(str)) {
      if (s && s.length < max) {
        list.push(s);
      }
      else if (s) {
        const words = str.split(/\s+/g);
        let t = '';

        for (const word of words) {
          if (t.length + word.length < max) {
            t += ' ' + word;
          }
          else {
            list.push(t.trim());
            t = word;
          }
        }
        list.push(t.trim());
      }
    }
    return list.filter(a => a);
  };

  function build(text) {
    const args = new URLSearchParams();
    args.set('ie', 'UTF-8');
    args.set('tl', this.lang);
    args.set('total', 1);
    args.set('textlen', text.length);
    args.set('client', 'tw-ob');

    return sentences(text).map(text => {
      args.delete('q');
      args.set('q', text);

      return this.permission + '?' + args.toString();
    });
  };
  const getVoices = speechSynthesis.getVoices;
  speechSynthesis.getVoices = function(loaded = false) {
    const s = getVoices.call(speechSynthesis, loaded);
    if (s.length || loaded) {
      return [...s, ...[
        {'name': 'Translate Afrikaans (beta)', 'lang': 'af'},
        {'name': 'Translate Albanian (beta)', 'lang': 'sq'},
        {'name': 'Translate Arabic (beta)', 'lang': 'ar'},
        {'name': 'Translate Armenian (beta)', 'lang': 'hy'},
        {'name': 'Translate Bengali (beta)', 'lang': 'bn'},
        {'name': 'Translate Bosnian (beta)', 'lang': 'bs'},
        {'name': 'Translate Catalan (beta)', 'lang': 'ca'},
        {'name': 'Translate Chinese (beta)', 'lang': 'zh-CN'},
        {'name': 'Translate Croatian (beta)', 'lang': 'hr'},
        {'name': 'Translate Czech (beta)', 'lang': 'cs'},
        {'name': 'Translate Danish (beta)', 'lang': 'da'},
        {'name': 'Translate Dutch (beta)', 'lang': 'nl'},
        {'name': 'Translate English (beta)', 'lang': 'en'},
        {'name': 'Translate Esperanto (beta)', 'lang': 'eo'},
        {'name': 'Translate Filipino (beta)', 'lang': 'fil'},
        {'name': 'Translate Finnish (beta)', 'lang': 'fi'},
        {'name': 'Translate French (beta)', 'lang': 'fr'},
        {'name': 'Translate German (beta)', 'lang': 'de'},
        {'name': 'Translate Greek (beta)', 'lang': 'el'},
        {'name': 'Translate Hebrew (beta)', 'lang': 'he'},
        {'name': 'Translate Hindi (beta)', 'lang': 'hi'},
        {'name': 'Translate Hungarian (beta)', 'lang': 'hu'},
        {'name': 'Translate Icelandic (beta)', 'lang': 'is'},
        {'name': 'Translate Indonesian (beta)', 'lang': 'id'},
        {'name': 'Translate Italian (beta)', 'lang': 'it'},
        {'name': 'Translate Japanese (beta)', 'lang': 'ja'},
        {'name': 'Translate Khmer (beta)', 'lang': 'km'},
        {'name': 'Translate Korean (beta)', 'lang': 'ko'},
        {'name': 'Translate Latin (beta)', 'lang': 'la'},
        {'name': 'Translate Latvian (beta)', 'lang': 'lv'},
        {'name': 'Translate Macedonian (beta)', 'lang': 'mk'},
        {'name': 'Translate Malayalam (beta)', 'lang': 'ml'},
        {'name': 'Translate Nepali (beta)', 'lang': 'ne'},
        {'name': 'Translate Norwegian (beta)', 'lang': 'no'},
        {'name': 'Translate Polish (beta)', 'lang': 'pl'},
        {'name': 'Translate Portuguese (beta)', 'lang': 'pt'},
        {'name': 'Translate Romanian (beta)', 'lang': 'ro'},
        {'name': 'Translate Russian (beta)', 'lang': 'ru'},
        {'name': 'Translate Serbian (beta)', 'lang': 'sr'},
        {'name': 'Translate Sinhala (beta)', 'lang': 'si'},
        {'name': 'Translate Slovak (beta)', 'lang': 'sk'},
        {'name': 'Translate Spanish (beta)', 'lang': 'es'},
        {'name': 'Translate Swahili (beta)', 'lang': 'sw'},
        {'name': 'Translate Swedish (beta)', 'lang': 'sv'},
        {'name': 'Translate Tagalog (beta)', 'lang': 'tl'},
        {'name': 'Translate Tamil (beta)', 'lang': 'ta'},
        {'name': 'Translate Telugu (beta)', 'lang': 'te'},
        {'name': 'Translate Thai (beta)', 'lang': 'th'},
        {'name': 'Translate Turkish (beta)', 'lang': 'tr'},
        {'name': 'Translate Ukrainian (beta)', 'lang': 'uk'},
        {'name': 'Translate Vietnamese (beta)', 'lang': 'vi'},
        {'name': 'Translate Welsh (beta)', 'lang': 'cy'}
      ].map(o => Object.assign(o, {
        default: false,
        localService: false,
        voiceURI: 'custom',
        build,
        permission: 'https://translate.google.com/translate_tts'
      }))];
    }
    else {
      return [];
    }
  };
}

