// overwrites to support custom voices
{
  const sha256 = async text => {
    const buffer = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    const arr = Array.from(new Uint8Array(hash));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const m = new Map();

  const guid = async text => {
    const hash = await sha256(text);

    if (m.has(hash)) {
      return m.get(hash);
    }

    const id = [4, 2, 2, 2, 6].map(n => {
      const ab = new Uint8Array(n);
      crypto.getRandomValues(ab);

      return ab;
    }).map(ab => [...ab].map(byte => byte.toString(16).padStart(2, '0')).join('')).join('-');

    m.set(hash, id);
    return id;
  };

  const n = new Map();

  // eslint-disable-next-line no-inner-declarations
  async function build(text) {
    const sessionID = await guid(text + this.key);

    if (n.has(sessionID)) {
      return n.get(sessionID);
    }

    const prosody = document.createElement('prosody');
    prosody.setAttribute('pitch', '0%');
    prosody.setAttribute('rate', '-0%');
    prosody.textContent = text;

    const r = await fetch('https://www.ibm.com/demos/live/tts-demo/api/tts/store', {
      method: 'POST',
      headers: {
        'content-type': 'application/json;charset=UTF-8'
      },
      body: JSON.stringify({
        sessionID,
        ssmlText: prosody.outerHTML
      })
    });
    const j = await r.json();
    if (j.status === 'success') {
      const href = 'https://www.ibm.com/demos/live/tts-demo/api/tts/newSynthesize?voice=' + this.key + '&id=' + sessionID;

      n.set(sessionID, href);
      return href;
    }
    throw Error('Server status is ' + j.status);
  }

  const getVoices = speechSynthesis.getVoices;
  speechSynthesis.getVoices = function(loaded = false) {
    const s = getVoices.call(speechSynthesis, loaded);
    if (s.length || loaded) {
      return [...s, ...[
        {key: 'ar-AR_OmarVoice', name: 'Arabic Omar (Watson)', lang: 'ar-AR'},

        {key: 'zh-CN_WangWeiVoice', name: 'Chinese WangWei (Watson)', lang: 'zh-CN'},
        {key: 'zh-CN_ZhangJingVoice', name: 'Chinese ZhangJing (Watson)', lang: 'zh-CN'},
        {key: 'zh-CN_LiNaVoice', name: 'Chinese LiNa (Watson)', lang: 'zh-CN'},

        {key: 'cs-CZ_AlenaVoice', name: 'Czech Alena (Watson)', lang: 'cs-CZ'},

        {key: 'nl-BE_AdeleVoice', name: 'Dutch Adele (Watson)', lang: 'nl-BE'},
        {key: 'nl-BE_BramVoice', name: 'Dutch Bram (Watson)', lang: 'nl-BE'},
        {key: 'nl-NL_EmmaVoice', name: 'Dutch Emma (Watson)', lang: 'nl-NL'},
        {key: 'nl-NL_LiamVoice', name: 'Dutch Liam (Watson)', lang: 'nl-NL'},


        {key: 'en-US_EmmaExpressive', name: 'English Emma Expressive(Watson)', lang: 'en-US'},
        {key: 'en-US_LisaExpressive', name: 'English Lisa Expressive(Watson)', lang: 'en-US'},
        {key: 'en-US_MichaelExpressive', name: 'English Michael Expressive(Watson)', lang: 'en-US'},
        {key: 'en-US_AllisonV3Voice', name: 'English Allison (Watson)', lang: 'en-US'},
        {key: 'en-US_EmilyV3Voice', name: 'English Emily (Watson)', lang: 'en-US'},
        {key: 'en-US_HenryV3Voice', name: 'English Henry (Watson)', lang: 'en-US'},
        {key: 'en-US_KevinV3Voice', name: 'English Kevin (Watson)', lang: 'en-US'},
        {key: 'en-US_OliviaV3Voice', name: 'English Olivia (Watson)', lang: 'en-US'},

        {key: 'en-AU_CraigVoice', name: 'English Craig (Watson)', lang: 'en-AU'},
        {key: 'en-AU_MadisonVoice', name: 'English Madison (Watson)', lang: 'en-AU'},
        {key: 'en-AU_SteveVoice', name: 'English Steve (Watson)', lang: 'en-AU'},

        {key: 'en-GB_KateV3Voice', name: 'English Kate (Watson)', lang: 'en-GB'},
        {key: 'en-GB_CharlotteV3Voice', name: 'English Charlotte (Watson)', lang: 'en-GB'},
        {key: 'en-GB_JamesV3Voice', name: 'English James (Watson)', lang: 'en-GB'},

        {key: 'fr-CA_LouiseV3Voice', name: 'French Louise (Watson)', lang: 'fr-CA'},
        {key: 'fr-FR_ReneeV3Voice', name: 'French Renee (Watson)', lang: 'fr-FR'},
        {key: 'fr-FR_NicolasV3Voice', name: 'French Nicolas (Watson)', lang: 'fr-FR'},

        {key: 'de-DE_BirgitV3Voice', name: 'German Birgit (Watson)', lang: 'de-DE'},
        {key: 'de-DE_DieterV3Voice', name: 'German Dieter (Watson)', lang: 'de-DE'},
        {key: 'de-DE_ErikaV3Voice', name: 'German Erika (Watson)', lang: 'de-DE'},

        {key: 'it-IT_FrancescaV3Voice', name: 'Italian Francesca (Watson)', lang: 'it-IT'},

        {key: 'ja-JP_EmiV3Voice', name: 'Japanese Emi (Watson)', lang: 'ja-JP'},

        {key: 'ko-KR_HyunjunVoice', name: 'Korean Hyunjun (Watson)', lang: 'ko-KR'},
        {key: 'ko-KR_SiWooVoice', name: 'Korean SiWoo (Watson)', lang: 'ko-KR'},
        {key: 'ko-KR_YunaVoice', name: 'Korean Yuna (Watson)', lang: 'ko-KR'},
        {key: 'ko-KR_YoungmiVoice', name: 'Korean Youngmi (Watson)', lang: 'ko-KR'},

        {key: 'pt-BR_IsabelaV3Voice', name: 'Portuguese Isabela (Watson)', lang: 'pt-BR'},

        {key: 'es-ES_EnriqueV3Voice', name: 'Spanish Enrique (Watson)', lang: 'es-ES'},
        {key: 'es-ES_LauraV3Voice', name: 'Spanish Laura (Watson)', lang: 'es-ES'},
        {key: 'es-LA_SofiaV3Voice', name: 'Spanish Sofia (Watson)', lang: 'es-LA'},
        {key: 'es-US_SofiaV3Voice', name: 'Spanish Sofia (Watson)', lang: 'es-US'},

        {key: 'sv-SE_IngridVoice', name: 'Swedish Ingrid (Watson)', lang: 'sv-SE'}
      ].map(o => Object.assign(o, {
        default: false,
        localService: false,
        voiceURI: 'custom',
        build,
        permission: 'https://www.ibm.com/demos/'
      }))];
    }
    else {
      return [];
    }
  };
}
