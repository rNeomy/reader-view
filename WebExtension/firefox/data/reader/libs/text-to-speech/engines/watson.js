// overwrites to support custom voices
{
  function build(text) {
    return 'https://text-to-speech-demo.ng.bluemix.net/api/v1/synthesize?text=' + encodeURIComponent(text) +
      '&voice=' + encodeURIComponent(this.lang + '_' + this.key + 'Voice') +
      '&download=true&accept=' + encodeURIComponent('audio/ogg');
  }
  const getVoices = speechSynthesis.getVoices;
  speechSynthesis.getVoices = function(loaded = false) {
    const s = getVoices.call(speechSynthesis, loaded);
    if (s.length || loaded) {
      return [...s, ...[
        {'key': 'Omar', 'name': 'IBM Watson Arabic (Omar)', 'lang': 'ar-AR'},
        {'key': 'Allison', 'name': 'IBM Watson American English (Allison)', 'lang': 'en-US'},
        {'key': 'AllisonV2', 'name': 'IBM Watson American English (AllisonV2)', 'lang': 'en-US'},
        {'key': 'Lisa', 'name': 'IBM Watson American English (Lisa)', 'lang': 'en-US'},
        {'key': 'LisaV2', 'name': 'IBM Watson American English (LisaV2)', 'lang': 'en-US'},
        {'key': 'Michael', 'name': 'IBM Watson American English (Michael)', 'lang': 'en-US'},
        {'key': 'MichaelV2', 'name': 'IBM Watson American English (MichaelV2)', 'lang': 'en-US'},
        {'key': 'Kate', 'name': 'IBM Watson British English (Kate)', 'lang': 'en-GB'},
        {'key': 'Enrique', 'name': 'IBM Watson Castilian Spanish (Enrique)', 'lang': 'es-ES'},
        {'key': 'Laura', 'name': 'IBM Watson Castilian Spanish (Laura)', 'lang': 'es-ES'},
        {'key': 'Sofia', 'name': 'IBM Watson Latin American Spanish (Sofia)', 'lang': 'es-LA'},
        {'key': 'Sofia', 'name': 'IBM Watson North American Spanish (Sofia)', 'lang': 'es-US'},
        {'key': 'Dieter', 'name': 'IBM Watson German (Dieter)', 'lang': 'de-DE'},
        {'key': 'Birgit', 'name': 'IBM Watson German (Birgit)', 'lang': 'de-DE'},
        {'key': 'Renee', 'name': 'IBM Watson French (Renee)', 'lang': 'fr-FR'},
        {'key': 'Francesca', 'name': 'IBM Watson Italian (Francesca)', 'lang': 'it-IT'},
        {'key': 'FrancescaV2', 'name': 'IBM Watson Italian (FrancescaV2)', 'lang': 'it-IT'},
        {'key': 'Emi', 'name': 'IBM Watson Japanese (Emi)', 'lang': 'ja-JP'},
        {'key': 'Isabela', 'name': 'IBM Watson Brazilian Portuguese (Isabela)', 'lang': 'pt-BR'}
      ].map(o => Object.assign(o, {
        default: false,
        localService: false,
        voiceURI: 'custom',
        build
      }))];
    }
    else {
      return [];
    }
  };
}
