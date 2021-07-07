// overwrites to support custom voices
{
  function build(text) {
    // const r = new RegExp(this.SEPARATOR.replace(/\//g, '//'), 'g');
    // text = text.replace(text, `<break strength="strong"/>`);
    return this.permission + 'api/v3/synthesize?text=' + encodeURIComponent(text) +
      '&voice=' + encodeURIComponent(this.lang + '_' + this.key + 'Voice') +
      '&download=true&accept=' + encodeURIComponent('audio/ogg;codec=opus');
  }
  const getVoices = speechSynthesis.getVoices;
  speechSynthesis.getVoices = function(loaded = false) {
    const s = getVoices.call(speechSynthesis, loaded);
    if (s.length || loaded) {
      return [...s, ...[
        {key: 'Allison', name: 'Allison (female, expressive, transformable) (Watson)', lang: 'en-US'},
        {key: 'AllisonV3', name: 'AllisonV3 (female, enhanced dnn) (Watson)', lang: 'en-US'},
        {key: 'EmilyV3', name: 'EmilyV3 (female, enhanced dnn) (Watson)', lang: 'en-US'},
        {key: 'HenryV3', name: 'HenryV3 (male, enhanced dnn) (Watson)', lang: 'en-US'},
        {key: 'KevinV3', name: 'KevinV3 (male, enhanced dnn) (Watson)', lang: 'en-US'},
        {key: 'Lisa', name: 'Lisa (female, transformable) (Watson)', lang: 'en-US'},
        {key: 'LisaV3', name: 'LisaV3 (female, enhanced dnn) (Watson)', lang: 'en-US'},
        {key: 'Michael', name: 'Michael (male, transformable) (Watson)', lang: 'en-US'},
        {key: 'MichaelV3', name: 'MichaelV3 (male, enhanced dnn) (Watson)', lang: 'en-US'},
        {key: 'OliviaV3', name: 'OliviaV3 (female, enhanced dnn) (Watson)', lang: 'en-US'},
        {key: 'Omar', name: 'Omar (male) (Watson)', lang: 'ar-AR'},
        {key: 'Isabela', name: 'Isabela (female) (Watson)', lang: 'pt-BR'},
        {key: 'IsabelaV3', name: 'IsabelaV3 (female, enhanced dnn) (Watson)', lang: 'pt-BR'},
        {key: 'CharlotteV3', name: 'CharlotteV3 (female, enhanced dnn) (Watson)', lang: 'en-GB'},
        {key: 'JamesV3', name: 'JamesV3 (male, enhanced dnn) (Watson)', lang: 'en-GB'},
        {key: 'Kate', name: 'Kate (female) (Watson)', lang: 'en-GB'},
        {key: 'KateV3', name: 'KateV3 (female, enhanced dnn) (Watson)', lang: 'en-GB'},
        {key: 'Enrique', name: 'Enrique (male) (Watson)', lang: 'es-ES'},
        {key: 'EnriqueV3', name: 'EnriqueV3 (male, enhanced dnn) (Watson)', lang: 'es-ES'},
        {key: 'Laura', name: 'Laura (female) (Watson)', lang: 'es-ES'},
        {key: 'LauraV3', name: 'LauraV3 (female, enhanced dnn) (Watson)', lang: 'es-ES'},
        {key: 'LiNa', name: 'LiNa (female) (Watson)', lang: 'zh-CN'},
        {key: 'WangWei', name: 'WangWei (Male) (Watson)', lang: 'zh-CN'},
        {key: 'ZhangJing', name: 'ZhangJing (female) (Watson)', lang: 'zh-CN'},
        {key: 'Emma', name: 'Emma (female) (Watson)', lang: 'nl-NL'},
        {key: 'Liam', name: 'Liam (male) (Watson)', lang: 'nl-NL'},
        {key: 'NicolasV3', name: 'NicolasV3 (male, enhanced dnn) (Watson)', lang: 'fr-FR'},
        {key: 'Renee', name: 'Renee (female) (Watson)', lang: 'fr-FR'},
        {key: 'ReneeV3', name: 'ReneeV3 (female, enhanced dnn) (Watson)', lang: 'fr-FR'},
        {key: 'Birgit', name: 'Birgit (female) (Watson)', lang: 'de-DE'},
        {key: 'BirgitV3', name: 'BirgitV3 (female, enhanced dnn) (Watson)', lang: 'de-DE'},
        {key: 'Dieter', name: 'Dieter (male) (Watson)', lang: 'de-DE'},
        {key: 'DieterV3', name: 'DieterV3 (male, enhanced dnn) (Watson)', lang: 'de-DE'},
        {key: 'ErikaV3', name: 'ErikaV3 (female, enhanced dnn) (Watson)', lang: 'de-DE'},
        {key: 'Francesca', name: 'Francesca (female) (Watson)', lang: 'it-IT'},
        {key: 'FrancescaV3', name: 'FrancescaV3 (female, enhanced dnn) (Watson)', lang: 'it-IT'},
        {key: 'Emi', name: 'Emi (female) (Watson)', lang: 'ja-JP'},
        {key: 'EmiV3', name: 'EmiV3 (female, enhanced dnn) (Watson)', lang: 'ja-JP'},
        {key: 'Youngmi', name: 'Youngmi (female) (Watson)', lang: 'ko-KR'},
        {key: 'Yuna', name: 'Yuna (female) (Watson)', lang: 'ko-KR'},
        {key: 'Sofia', name: 'Sofia (female) (Watson)', lang: 'es-LA'},
        {key: 'SofiaV3', name: 'SofiaV3 (female, enhanced dnn) (Watson)', lang: 'es-LA'},
        {key: 'Sofia', name: 'Sofia (female) (Watson)', lang: 'es-US'},
        {key: 'SofiaV3', name: 'SofiaV3 (female, enhanced dnn) (Watson)', lang: 'es-US'}
      ].map(o => Object.assign(o, {
        default: false,
        localService: false,
        voiceURI: 'custom',
        build,
        permission: 'https://text-to-speech-demo.ng.bluemix.net/'
      }))];
    }
    else {
      return [];
    }
  };
}
