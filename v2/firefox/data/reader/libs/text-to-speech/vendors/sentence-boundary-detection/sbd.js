(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.tokenizer = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var abbreviations;

var englishAbbreviations = [
    "al",
    "adj",
    "assn",
    "Ave",
    "BSc", "MSc",
    "Cell",
    "Ch",
    "Co",
    "cc",
    "Corp",
    "Dem",
    "Dept",
    "ed",
    "eg",
    "Eq",
    "Eqs",
    "est",
    "est",
    "etc",
    "Ex",
    "ext", // + number?
    "Fig",
    "fig",
    "Figs",
    "figs",
    "i.e",
    "ie",
    "Inc",
    "inc",
    "Jan","Feb","Mar","Apr","Jun","Jul","Aug","Sep","Sept","Oct","Nov","Dec",
    "jr",
    "mi",
    "Miss", "Mrs", "Mr", "Ms",
    "Mol",
    "mt",
    "mts",
    "no",
    "Nos",
    "PhD", "MD", "BA", "MA", "MM",
    "pl",
    "pop",
    "pp",
    "Prof", "Dr",
    "pt",
    "Ref",
    "Refs",
    "Rep",
    "repr",
    "rev",
    "Sec",
    "Secs",
    "Sgt", "Col", "Gen", "Rep", "Sen",'Gov', "Lt", "Maj", "Capt","St",
    "Sr", "sr", "Jr", "jr", "Rev",
    "Sun","Mon","Tu","Tue","Tues","Wed","Th","Thu","Thur","Thurs","Fri","Sat",
    "trans",
    "Univ",
    "Viz",
    "Vol",
    "vs",
    "v",
];

exports.setAbbreviations = function(abbr) {
    if (abbr) {
        abbreviations = abbr;
    } else {
        abbreviations = englishAbbreviations;
    }
}

var isCapitalized = exports.isCapitalized = function(str) {
    return /^[A-Z][a-z].*/.test(str) || isNumber(str);
}

// Start with opening quotes or capitalized letter
exports.isSentenceStarter = function(str) {
    return isCapitalized(str) || /``|"|'/.test(str.substring(0,2));
}

exports.isCommonAbbreviation = function(str) {
    var noSymbols = str.replace(/[-'`~!@#$%^&*()_|+=?;:'",.<>\{\}\[\]\\\/]/gi, "");

    return ~abbreviations.indexOf(noSymbols);
}

// This is going towards too much rule based
exports.isTimeAbbreviation = function(word, next) {
    if (word === "a.m." || word === "p.m.") {
        var tmp = next.replace(/\W+/g, '').slice(-3).toLowerCase();

        if (tmp === "day") {
            return true;
        }
    }

    return false;
}

exports.isDottedAbbreviation = function(word) {
    var matches = word.replace(/[\(\)\[\]\{\}]/g, '').match(/(.\.)*/);
    return matches && matches[0].length > 0;
}

// TODO look for next words, if multiple are capitalized,
// then it's probably not a sentence ending
exports.isCustomAbbreviation = function(str) {
    if (str.length <= 3) {
        return true;
    }

    return isCapitalized(str);
}

// Uses current word count in sentence and next few words to check if it is
// more likely an abbreviation + name or new sentence.
exports.isNameAbbreviation = function(wordCount, words) {
    if (words.length > 0) {
        if (wordCount < 5 && words[0].length < 6 && isCapitalized(words[0])) {
            return true;
        }

        var capitalized = words.filter(function(str) {
            return /[A-Z]/.test(str.charAt(0));
        });

        return capitalized.length >= 3;
    }

    return false;
}

var isNumber = exports.isNumber = function(str, dotPos) {
    if (dotPos) {
        str = str.slice(dotPos-1, dotPos+2);
    }

    return !isNaN(str);
};

// Phone number matching
// http://stackoverflow.com/a/123666/951517
exports.isPhoneNr = function(str) {
    return str.match(/^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/);
};

// Match urls / emails
// http://stackoverflow.com/a/3809435/951517
exports.isURL = function(str) {
    return str.match(/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/);
};

// Starting a new sentence if beginning with capital letter
// Exception: The word is enclosed in brackets
exports.isConcatenated = function(word) {
    var i = 0;

    if ((i = word.indexOf(".")) > -1 ||
        (i = word.indexOf("!")) > -1 ||
        (i = word.indexOf("?")) > -1)
    {
        var c = word.charAt(i + 1);

        // Check if the next word starts with a letter
        if (c.match(/[a-zA-Z].*/)) {
            return [word.slice(0, i), word.slice(i+1)];
        }
    }

    return false;
};

exports.isBoundaryChar = function(word) {
    return word === "." ||
           word === "!" ||
           word === "?";
};

},{}],2:[function(require,module,exports){

module.exports = function sanitizeHtml(text, opts) {
  // Strip HTML from Text using browser HTML parser
  if ((typeof text == 'string' || text instanceof String) && typeof document !== "undefined") {
    var $div = document.createElement("DIV");
    $div.innerHTML = text;
    text = ($div.textContent || '').trim();
  }
  //DOM Object
  else if (typeof text === 'object' && text.textContent) {
    text = (text.textContent || '').trim();
  }

  return text;
};

},{}],3:[function(require,module,exports){

exports.endsWithChar = function ends_with_char(word, c) {
    if (c.length > 1) {
        return c.indexOf(word.slice(-1)) > -1;
    }

    return word.slice(-1) === c;
};

exports.endsWith = function ends_with(word, end) {
    return word.slice(word.length - end.length) === end;
};
},{}],4:[function(require,module,exports){
/*jshint node:true, laxcomma:true */

var sanitizeHtml = require("sanitize-html");

var stringHelper = require("./stringHelper");
var Match  = require("./Match");

var newline_placeholder = " @~@ ";
var newline_placeholder_t = newline_placeholder.trim();


var whiteSpaceCheck = new RegExp("\\S", "");
var addNewLineBoundaries = new RegExp("\\n+|[-#=_+*]{4,}", "g");
var splitIntoWords = new RegExp("\\S+|\\n", "g");


// Split the entry into sentences.
exports.sentences = function(text, user_options) {
    if (!text || typeof text !== "string" || !text.length) {
        return [];
    }

    if (!whiteSpaceCheck.test(text)) {
      // whitespace-only string has no sentences
      return [];
    }

    var options = {
        "newline_boundaries"  : false,
        "html_boundaries"     : false,
        "html_boundaries_tags": ["p","div","ul","ol"],
        "sanitize"            : false,
        "allowed_tags"        : false,
        "preserve_whitespace" : false,
        "abbreviations"       : null
    };

    if (typeof user_options === "boolean") {
        // Deprecated quick option
        options.newline_boundaries = true;
    }
    else {
        // Extend options
        for (var k in user_options) {
            options[k] = user_options[k];
        }
    }

    Match.setAbbreviations(options.abbreviations);

    if (options.newline_boundaries) {
        text = text.replace(addNewLineBoundaries, newline_placeholder);
    }

    if (options.html_boundaries) {
        var html_boundaries_regexp = "(<br\\s*\\/?>|<\\/(" + options.html_boundaries_tags.join("|") + ")>)";
        var re = new RegExp(html_boundaries_regexp, "g");
        text = text.replace(re, "$1" + newline_placeholder);
    }

    if (options.sanitize || options.allowed_tags) {
        if (! options.allowed_tags) {
            options.allowed_tags = [""];
        }

        text = sanitizeHtml(text, { "allowedTags" : options.allowed_tags });
    }


    // Split the text into words
    var words;
    var tokens;

    // Split the text into words
    if (options.preserve_whitespace) {
        // <br> tags are the odd man out, as whitespace is allowed inside the tag
        tokens = text.split(/(<br\s*\/?>|\S+|\n+)/);

        // every other token is a word
        words = tokens.filter(function (token, ii) {
          return ii % 2;
        });
    }
    else {
        // - see http://blog.tompawlak.org/split-string-into-tokens-javascript
        words = text.trim().match(splitIntoWords);
    }


    var wordCount = 0;
    var index = 0;
    var temp  = [];
    var sentences = [];
    var current   = [];

    // If given text is only whitespace (or nothing of \S+)
    if (!words || !words.length) {
        return [];
    }

    for (var i=0, L=words.length; i < L; i++) {
        wordCount++;

        // Add the word to current sentence
        current.push(words[i]);

        // Sub-sentences, reset counter
        if (~words[i].indexOf(",")) {
            wordCount = 0;
        }

        if (Match.isBoundaryChar(words[i]) || stringHelper.endsWithChar(words[i], "?!") || words[i] === newline_placeholder_t) {
            if ((options.newline_boundaries || options.html_boundaries) && words[i] === newline_placeholder_t) {
                current.pop();
            }

            sentences.push(current);

            wordCount = 0;
            current   = [];

            continue;
        }


        if (stringHelper.endsWithChar(words[i], "\"") || stringHelper.endsWithChar(words[i], "”")) {
            words[i] = words[i].slice(0, -1);
        }

        // A dot might indicate the end sentences
        // Exception: The next sentence starts with a word (non abbreviation)
        //            that has a capital letter.
        if (stringHelper.endsWithChar(words[i], ".")) {
            // Check if there is a next word
            // This probably needs to be improved with machine learning
            if (i+1 < L) {
                // Single character abbr.
                if (words[i].length === 2 && isNaN(words[i].charAt(0))) {
                    continue;
                }

                // Common abbr. that often do not end sentences
                if (Match.isCommonAbbreviation(words[i])) {
                    continue;
                }

                // Next word starts with capital word, but current sentence is
                // quite short
                if (Match.isSentenceStarter(words[i+1])) {
                    if (Match.isTimeAbbreviation(words[i], words[i+1])) {
                        continue;
                    }

                    // Dealing with names at the start of sentences
                    if (Match.isNameAbbreviation(wordCount, words.slice(i, 6))) {
                        continue;
                    }

                    if (Match.isNumber(words[i+1])) {
                        if (Match.isCustomAbbreviation(words[i])) {
                            continue;
                        }
                    }
                }
                else {
                    // Skip ellipsis
                    if (stringHelper.endsWith(words[i], "..")) {
                        continue;
                    }

                    //// Skip abbreviations
                    // Short words + dot or a dot after each letter
                    if (Match.isDottedAbbreviation(words[i])) {
                        continue;
                    }

                    if (Match.isNameAbbreviation(wordCount, words.slice(i, 5))) {
                        continue;
                    }
                }
            }

            sentences.push(current);
            current   = [];
            wordCount = 0;

            continue;
        }

        // Check if the word has a dot in it
        if ((index = words[i].indexOf(".")) > -1) {
            if (Match.isNumber(words[i], index)) {
                continue;
            }

            // Custom dotted abbreviations (like K.L.M or I.C.T)
            if (Match.isDottedAbbreviation(words[i])) {
                continue;
            }

            // Skip urls / emails and the like
            if (Match.isURL(words[i]) || Match.isPhoneNr(words[i])) {
                continue;
            }
        }

        if (temp = Match.isConcatenated(words[i])) {
            current.pop();
            current.push(temp[0]);
            sentences.push(current);

            current = [];
            wordCount = 0;
            current.push(temp[1]);
        }
    }

    if (current.length) {
        sentences.push(current);
    }


    // Clear "empty" sentences
    sentences = sentences.filter(function(s) {
        return s.length > 0;
    });

    var result = sentences.slice(1).reduce(function (out, sentence) {
      var lastSentence = out[out.length - 1];

      // Single words, could be "enumeration lists"
      if (lastSentence.length === 1 && /^.{1,2}[.]$/.test(lastSentence[0])) {
          // Check if there is a next sentence
          // It should not be another list item
          if (!/[.]/.test(sentence[0])) {
              out.pop()
              out.push(lastSentence.concat(sentence));
              return out;
          }
      }

      out.push(sentence);

      return out;
    }, [ sentences[0] ]);

    // join tokens back together
    return result.map(function (sentence, ii) {
      if (options.preserve_whitespace && !options.newline_boundaries && !options.html_boundaries) {
        // tokens looks like so: [leading-space token, non-space token, space
        // token, non-space token, space token... ]. In other words, the first
        // item is the leading space (or the empty string), and the rest of
        // the tokens are [non-space, space] token pairs.
        var tokenCount = sentence.length * 2;

        if (ii === 0) {
          tokenCount += 1;
        }

        return tokens.splice(0, tokenCount).join("");
      }

      return sentence.join(" ");
    });
};

},{"./Match":1,"./stringHelper":3,"sanitize-html":2}]},{},[4])(4)
});
