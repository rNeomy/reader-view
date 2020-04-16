// overwrites to support custom voices
{
  function build(text) {
    return new Promise((resolve) => {
      getGoogleTranslateToken(text).then((tk) => {
        console.log(tk);
        // https://translate.google.com/translate_tts?ie=UTF-8&q=%D8%AA%D8%AD%D9%85%D9%8A%D9%84%20%D9%83%D8%AA%D8%A7%D8%A8%20%D8%AA%D8%A7%D8%B1%D9%8A%D8%AE%20%D8%A7%D9%84%D8%AC%D8%B2%D8%A7%D8%A6%D8%B1%20%D9%81%D9%8A%20%D8%A7%D9%84%D9%82%D8%AF%D9%8A%D9%85%20%D9%88%D8%A7%D9%84%D8%AD%D8%AF%D9%8A%D8%AB%20%D9%84%D9%80%20%D9%85%D8%A8%D8%A7%D8%B1%D9%83%20%D8%A7%D9%84%D9%85%D9%8A%D9%84%D9%8A%20pdf.&tl=ar&total=1&idx=0&textlen=63&tk=308070.133480&client=t&prev=input
        resolve(
          'https://translate.google.com/translate_tts?ie=UTF-8&q=' +
            encodeURIComponent(text) +
            '&tl=' +
            this.lang +
            '&total=1&idx=0&textlen=' +
            text.length +
            '&tk=' +
            tk.value +
            '&client=t&prev=input'
        );
      });
    });
  }
  const getVoices = speechSynthesis.getVoices;
  speechSynthesis.getVoices = function (loaded = false) {
    const s = getVoices.call(speechSynthesis, loaded);
    if (s.length || loaded) {
      return [
        ...s,
        ...[
          {
            key: 'ar-GoogleTranslate',
            name: 'Google Translate AR',
            lang: 'ar',
          },
          {
            key: 'fr-GoogleTranslate',
            name: 'Google Translate FR',
            lang: 'fr',
          },
          {
            key: 'en-GoogleTranslate',
            name: 'Google Translate EN',
            lang: 'en',
          },
          {
            key: 'it-GoogleTranslate',
            name: 'Google Translate it',
            lang: 'it',
          },
        ].map((o) =>
          Object.assign(o, {
            default: false,
            localService: false,
            voiceURI: 'custom',
            build,
          })
        ),
      ];
    } else {
      return [];
    }
  };
}
(function () {
  function r(e, n, t) {
    function o(i, f) {
      if (!n[i]) {
        if (!e[i]) {
          var c = 'function' == typeof require && require;
          if (!f && c) return c(i, !0);
          if (u) return u(i, !0);
          var a = new Error("Cannot find module '" + i + "'");
          throw ((a.code = 'MODULE_NOT_FOUND'), a);
        }
        var p = (n[i] = { exports: {} });
        e[i][0].call(
          p.exports,
          function (r) {
            var n = e[i][1][r];
            return o(n || r);
          },
          p,
          p.exports,
          r,
          e,
          n,
          t
        );
      }
      return n[i].exports;
    }
    for (
      var u = 'function' == typeof require && require, i = 0;
      i < t.length;
      i++
    )
      o(t[i]);
    return o;
  }
  return r;
})()(
  {
    1: [
      function (require, module, exports) {
        exports.got = function (url) {
          return new Promise(function (fulfill, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function () {
              if (xhr.readyState == XMLHttpRequest.DONE) {
                if (xhr.status == 200) fulfill({ body: xhr.responseText });
                else reject(new Error(xhr.responseText));
              }
            };
            xhr.send(null);
          });
        };

        exports.Configstore = function () {
          this.get = function (name) {
            return localStorage.getItem(name);
          };
          this.set = function (name, value) {
            localStorage.setItem(name, value);
          };
        };
      },
      {},
    ],
    2: [
      function (require, module, exports) {
        window.getGoogleTranslateToken = require('./index.js').get;
      },
      { './index.js': 3 },
    ],
    3: [
      function (require, module, exports) {
        /**
         * Last update: 2016/06/26
         * https://translate.google.com/translate/releases/twsfe_w_20160620_RC00/r/js/desktop_module_main.js
         *
         * Everything between 'BEGIN' and 'END' was copied from the url above.
         */

        var got = require('./deps.js').got;
        var Configstore = require('./deps.js').Configstore;

        /* eslint-disable */
        // BEGIN

        function sM(a) {
          var b;
          if (null !== yr) b = yr;
          else {
            b = wr(String.fromCharCode(84));
            var c = wr(String.fromCharCode(75));
            b = [b(), b()];
            b[1] = c();
            b = (yr = window[b.join(c())] || '') || '';
          }
          var d = wr(String.fromCharCode(116)),
            c = wr(String.fromCharCode(107)),
            d = [d(), d()];
          d[1] = c();
          c = '&' + d.join('') + '=';
          d = b.split('.');
          b = Number(d[0]) || 0;
          for (var e = [], f = 0, g = 0; g < a.length; g++) {
            var l = a.charCodeAt(g);
            128 > l
              ? (e[f++] = l)
              : (2048 > l
                  ? (e[f++] = (l >> 6) | 192)
                  : (55296 == (l & 64512) &&
                    g + 1 < a.length &&
                    56320 == (a.charCodeAt(g + 1) & 64512)
                      ? ((l =
                          65536 +
                          ((l & 1023) << 10) +
                          (a.charCodeAt(++g) & 1023)),
                        (e[f++] = (l >> 18) | 240),
                        (e[f++] = ((l >> 12) & 63) | 128))
                      : (e[f++] = (l >> 12) | 224),
                    (e[f++] = ((l >> 6) & 63) | 128)),
                (e[f++] = (l & 63) | 128));
          }
          a = b;
          for (f = 0; f < e.length; f++) (a += e[f]), (a = xr(a, '+-a^+6'));
          a = xr(a, '+-3^+b+-f');
          a ^= Number(d[1]) || 0;
          0 > a && (a = (a & 2147483647) + 2147483648);
          a %= 1e6;
          return c + (a.toString() + '.' + (a ^ b));
        }

        var yr = null;
        var wr = function (a) {
            return function () {
              return a;
            };
          },
          xr = function (a, b) {
            for (var c = 0; c < b.length - 2; c += 3) {
              var d = b.charAt(c + 2),
                d = 'a' <= d ? d.charCodeAt(0) - 87 : Number(d),
                d = '+' == b.charAt(c + 1) ? a >>> d : a << d;
              a = '+' == b.charAt(c) ? (a + d) & 4294967295 : a ^ d;
            }
            return a;
          };

        // END
        /* eslint-enable */

        var config = new Configstore('google-translate-api');

        var window = {
          TKK: config.get('TKK') || '0',
        };

        function updateTKK() {
          return new Promise(function (resolve, reject) {
            var now = Math.floor(Date.now() / 3600000);

            if (Number(window.TKK.split('.')[0]) === now) {
              resolve();
            } else {
              got('https://translate.google.com')
                .then(function (res) {
                  var code =
                    res.body.match(/TKK='(.*?)';/) ||
                    res.body.match(/tkk:'(.*?)'/);

                  if (code) {
                    TKK = code[1];
                    /* eslint-disable no-undef */
                    if (typeof TKK !== 'undefined') {
                      window.TKK = TKK;
                      config.set('TKK', TKK);
                    }
                    /* eslint-enable no-undef */
                  } else throw new Error('Google has changed the algorithm');

                  /**
                   * Note: If the regex or the eval fail, there is no need to worry. The server will accept
                   * relatively old seeds.
                   */

                  resolve();
                })
                .catch(function (err) {
                  var e = new Error();
                  e.code = 'BAD_NETWORK';
                  e.message = err.message;
                  reject(e);
                });
            }
          });
        }

        function get(text) {
          return updateTKK()
            .then(function () {
              var tk = sM(text);
              tk = tk.replace('&tk=', '');
              return { name: 'tk', value: tk };
            })
            .catch(function (err) {
              throw err;
            });
        }

        module.exports.get = get;
      },
      { './deps.js': 1 },
    ],
  },
  {},
  [2]
);
