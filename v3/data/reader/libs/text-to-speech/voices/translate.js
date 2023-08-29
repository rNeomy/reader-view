speechSynthesis.getVoices = new Proxy(speechSynthesis.getVoices, {
  apply(target, self, args) {
    const voices = Reflect.apply(target, self, args);
    const [b] = args;
    if (voices.length === 0 && !b) {
      return voices;
    }

    const build = (o, text) => {
      const args = new URLSearchParams();
      args.set('ie', 'UTF-8');
      args.set('tl', o.lang);
      args.set('total', 1);
      args.set('textlen', text.length);
      args.set('client', 'tw-ob');
      args.delete('q');
      args.set('q', text);

      return Promise.resolve(o.permission + '?' + args.toString());
    };

    voices.push(...[
      {'name': 'Translate Afrikaans', 'lang': 'af'},
      {'name': 'Translate Albanian', 'lang': 'sq'},
      {'name': 'Translate Arabic', 'lang': 'ar'},
      {'name': 'Translate Armenian', 'lang': 'hy'},
      {'name': 'Translate Bengali', 'lang': 'bn'},
      {'name': 'Translate Bosnian', 'lang': 'bs'},
      {'name': 'Translate Catalan', 'lang': 'ca'},
      {'name': 'Translate Chinese', 'lang': 'zh-CN'},
      {'name': 'Translate Croatian', 'lang': 'hr'},
      {'name': 'Translate Czech', 'lang': 'cs'},
      {'name': 'Translate Danish', 'lang': 'da'},
      {'name': 'Translate Dutch', 'lang': 'nl'},
      {'name': 'Translate English', 'lang': 'en'},
      {'name': 'Translate Esperanto', 'lang': 'eo'},
      {'name': 'Translate Filipino', 'lang': 'fil'},
      {'name': 'Translate Finnish', 'lang': 'fi'},
      {'name': 'Translate French', 'lang': 'fr'},
      {'name': 'Translate German', 'lang': 'de'},
      {'name': 'Translate Greek', 'lang': 'el'},
      {'name': 'Translate Hebrew', 'lang': 'he'},
      {'name': 'Translate Hindi', 'lang': 'hi'},
      {'name': 'Translate Hungarian', 'lang': 'hu'},
      {'name': 'Translate Icelandic', 'lang': 'is'},
      {'name': 'Translate Indonesian', 'lang': 'id'},
      {'name': 'Translate Italian', 'lang': 'it'},
      {'name': 'Translate Japanese', 'lang': 'ja'},
      {'name': 'Translate Khmer', 'lang': 'km'},
      {'name': 'Translate Korean', 'lang': 'ko'},
      {'name': 'Translate Latin', 'lang': 'la'},
      {'name': 'Translate Latvian', 'lang': 'lv'},
      {'name': 'Translate Macedonian', 'lang': 'mk'},
      {'name': 'Translate Malayalam', 'lang': 'ml'},
      {'name': 'Translate Nepali', 'lang': 'ne'},
      {'name': 'Translate Norwegian', 'lang': 'no'},
      {'name': 'Translate Polish', 'lang': 'pl'},
      {'name': 'Translate Portuguese', 'lang': 'pt'},
      {'name': 'Translate Romanian', 'lang': 'ro'},
      {'name': 'Translate Russian', 'lang': 'ru'},
      {'name': 'Translate Serbian', 'lang': 'sr'},
      {'name': 'Translate Sinhala', 'lang': 'si'},
      {'name': 'Translate Slovak', 'lang': 'sk'},
      {'name': 'Translate Spanish', 'lang': 'es'},
      {'name': 'Translate Swahili', 'lang': 'sw'},
      {'name': 'Translate Swedish', 'lang': 'sv'},
      {'name': 'Translate Tagalog', 'lang': 'tl'},
      {'name': 'Translate Tamil', 'lang': 'ta'},
      {'name': 'Translate Telugu', 'lang': 'te'},
      {'name': 'Translate Thai', 'lang': 'th'},
      {'name': 'Translate Turkish', 'lang': 'tr'},
      {'name': 'Translate Ukrainian', 'lang': 'uk'},
      {'name': 'Translate Vietnamese', 'lang': 'vi'},
      {'name': 'Translate Welsh', 'lang': 'cy'}
    ].map(o => {
      Object.assign(o, {
        default: false,
        localService: false,
        voiceURI: 'audio',
        permission: 'https://translate.google.com/translate_tts',
        referer: 'https://translate.google.com/',
        origin: 'https://translate.google.com'
      });
      return {
        ...o,
        build: build.bind(this, o)
      };
    }));

    return voices;
  }
});
