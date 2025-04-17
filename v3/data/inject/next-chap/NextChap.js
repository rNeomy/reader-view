'use strict';
/**
 *  @author: Shrulik <https://github.com/Shrulik/reader-view> for feature suggestions and bug reports
 */
{
  class UrlUtils {
    // I assume anything over 4 digits is not a chapter number.
    static chapterNumberSuffix = /(?:chapter|chap|c|page|[_-]|\b)(\d{1,4}$)/;
    static boundary_or_non_number = /(?:\D|\b)?/;
    static chapterNumberAnywhere = new RegExp(
      UrlUtils.boundary_or_non_number.source +
        '(\\d{1,4})' +
        UrlUtils.boundary_or_non_number.source,
      'g'
    );

    /**
     * I invented a new word. Cnum is a chapter number. Even Co-pilot got it.
     * @param {*} str
     * @return {int[]} found potential chapter numbers in the passed string
     */
    static extractAnyCnumFromString(str) {
      const matches = [...str.matchAll(UrlUtils.chapterNumberAnywhere)];

      if (!matches || !matches.length) return null;

      return matches.map(match => parseInt(match[1]));
    }

    static extractNumberSuffixFromString(str) {
      // Doesn't have to be matchAll because the regex isn't global. I want the last number, can't be many of them
      const matches = str.match(UrlUtils.chapterNumberSuffix);
      return matches ? parseInt(matches[1]) : null;
    }

    /**
     * Splits the URL to path segments and decodes each segment with decodeURIComponent
     * ,so we don't have irrelevant numbers (%20, etc.).
     * @param {HTMLHyperlinkElementUtils} url
     * @return {string[]|null}
     */
    static toDecodedPathSegments(url) {
      return url ? url.href.split('/').slice(1).map(decodeURIComponent) : null;
    }

    /**
     *
     * @param { NodeListOf<HTMLHyperlinkElementUtils> } links
     * @param {Location} location
     * @return {HTMLHyperlinkElementUtils[]} - A list of unique links converted to relative form that are
     * not parents of other links.
     */
    static processLinks(links, location) {
      const curOriginLinks = UrlUtils.filterOtherOrigins(
        links,
        location.origin
      );
      const realLinks = UrlUtils.removeBogusLinks(curOriginLinks, location);
      return UrlUtils.removeDuplicates(realLinks);
    }

    static filterOtherOrigins(links, origin) {
      return Array.from(links).filter(link => link.origin === origin);
    }

    /**
     * Handles duplicate links so only a single candidate is left.
     * The HTML of duplicate links is retained as a comment on the first found instance of the link for keyword checks
     * or other possible uses.
     * @param {HTMLHyperlinkElementUtils} linkNodes
     * @return {HTMLHyperlinkElementUtils[]}
     */
    static removeDuplicates(linkNodes) {
      const hrefsToLinks = new Map();

      linkNodes.forEach(link => {
        const href = link.href;
        if (!hrefsToLinks.has(href)) {
          hrefsToLinks.set(href, link);
        }
        else {
          const duplicatedLink = hrefsToLinks.get(href);
          duplicatedLink.innerHTML += `<!--${link.outerHTML}-->`;
          duplicatedLink.nextChap_copies =
            (duplicatedLink.nextChap_copies || 1) + 1;
        }
      });

      return [...hrefsToLinks.values()];
    }

    /**
     * This method removes all links that don't have anything useful or easily comprehensible in the href attribute
     * or refere to elements in the current page.
     * For example, just have 'href="#"', 'href="#top"' or 'href="javascript:void(0);"'
     * @param {HTMLHyperlinkElementUtils[]} links - links to filter
     * @param {HTMLHyperlinkElementUtils} curURL - the current page URL
     * @return {HTMLHyperlinkElementUtils[]} http/https links that are more likely to be to a different page
     */
    static removeBogusLinks(links, curURL) {
      /**
       * This just removes links with href="#"
       * In theory, an anchor link leads to a different page fragment on the same page, not another page by definition
       * so any #something should be removed, but it isn't uncommon http://host.com/chap#5 is the way actual page loading is handled via JS
       * or server side rendering or something. I remove just the "#" links because they are too generic. Hard to guess
       * and will confuse the code.
       * @param {HTMLHyperlinkElementUtils} link
       * @return {boolean}
       */
      function isAnchorLink(link) {
        return link.href === curURL.href + '#';
      }

      /**
       * Validate a reall http/https link, and not something weird like a javascript:void(0); or mailto:
       * @param {HTMLHyperlinkElementUtils} link
       * @return {boolean}
       */
      function isHttpLink(link) {
        return !(link.href.includes(':') && !link.href.startsWith('http'));
      }

      return Array.from(links).filter(
        link =>
          isHttpLink(link) && !isAnchorLink(link) && link.href !== curURL.href
      );
    }
  }

  // This is a fake enum, the symbols inside aren't actually of type NavType, but the namespace helps
  const NavType = {
    PREV: Symbol('prev'),
    NEXT: Symbol('next'),
    INVALID: Symbol('invalid')
  };

  class NavigationLocator {
    #weight;

    constructor(weight = 1) {
      if (new.target === NavigationLocator) {
        throw new TypeError(
          'NavigationLocator is an abstract class not meant to be instantiated.'
        );
      }
      this.#weight = weight;
    }

    get weight() {
      return this.#weight;
    }

    /**
     *
     * @param {Location} _url - The url of the current page
     * @param {HTMLHyperlinkElementUtils[]} _elements - An array of anchor elements from which the navigation
     * candidate links will be found.
     * returns {NavigationCandidates} - candidates for next and prev links
     */
    locate(_url, _elements) {
      throw new Error('locate method must be implemented');
    }
  }

  /**
   * This locator looks for links with rel=next/prev which is the way a webpage is supposed to mark the next/prev links.
   * We will start with trusting webpages that have a rel=next/prev attribute. If there is zero or one of each then this
   * locator results will be picked.
   */
  class RelLocator extends NavigationLocator {
    constructor(weight = 10) {
      super(weight);
    }

    locate(url, elements) {
      const nextLinks = [];
      const prevLinks = [];
      for (const link of elements) {
        if (link.rel === 'next') {
          nextLinks.push(link);
        }
        else if (link.rel === 'prev') {
          prevLinks.push(link);
        }
      }

      const atLeastOne = nextLinks.length === 1 || prevLinks.length === 1;
      const atMostOneEach = nextLinks.length <= 1 && prevLinks.length <= 1;

      return atLeastOne && atMostOneEach ?
        NavigationCandidates.nonAmbiguousCandidates(
          prevLinks?.[0],
          nextLinks?.[0],
          this.weight
        ) :
        NavigationCandidates.similarityBased(
          url,
          prevLinks,
          nextLinks,
          this.weight
        );
    }
  }

  class KeywordLocator extends NavigationLocator {
    constructor(
      weight = 0.5,
      navTypeToKeyword = {
        [NavType.NEXT]: [
          'next',
          'siguiente',
          'التالي',
          'suivant',
          'следующая',
          'nächste',
          'próximo',
          'successivo',
          '次の'
        ],
        [NavType.PREV]: [
          'previous',
          'предыдущая',
          'anterior',
          'précédent',
          'vorherige',
          '前の',
          'precedente'
        ]
      }
    ) {
      super(weight);
      this.navTypeToKeyword = navTypeToKeyword;
    }

    locate(url, elements) {
      const navTypeToLinkCandidates = new Map();
      Object.getOwnPropertySymbols(this.navTypeToKeyword).forEach(navType => {
        const keywords = this.navTypeToKeyword[navType];

        const elemToTotalKWCount = KeywordLocator.mapElemToKeywordCount(
          elements,
          keywords
        );

        if (elemToTotalKWCount.size === 0) return;

        const sumAppearnces = [...elemToTotalKWCount.values()].reduce(
          (acc, val) => acc + val,
          0
        );

        const candidates = [...elemToTotalKWCount.entries()].map(
          ([elem, allKWCount]) =>
            new CandidateLink(
              elem,
              navType,
              (allKWCount * (elem.nextChap_copies ?? 1)) / sumAppearnces
            )
        );

        navTypeToLinkCandidates.set(navType, candidates);
      });

      return NavigationCandidates.fromMap(navTypeToLinkCandidates, this.weight);
    }

    static mapElemToKeywordCount(elements, keywords) {
      const elemToKWCount = new Map();

      elements.forEach(element => {
        keywords.forEach(keyword => {
          const count = this.caseInsensitiveOccurrences(
            element.outerHTML,
            keyword
          );
          if (count > 0) {
            if (elemToKWCount.has(element)) {
              const curCount = elemToKWCount.get(element);
              elemToKWCount.set(element, curCount + count);
            }
            else {
              elemToKWCount.set(element, count);
            }
          }
        });
      });

      return elemToKWCount;
    }

    static caseInsensitiveOccurrences(string, substring) {
      string = string.toLowerCase();
      substring = substring.toLowerCase();
      return this.occurrences(string, substring);
    }

    static occurrences(string, substring) {
      let count = 0;
      let index = string.indexOf(substring);

      while (index !== -1) {
        count++;
        index = string.indexOf(substring, index + 1);
      }
      return count;
    }
  }

  class Navigation {
    /**
     * @param {CandidateLink} prevInput
     * @param {CandidateLink} nextInput
     */
    constructor(prevInput, nextInput) {
      this.prev = prevInput;
      this.next = nextInput;
    }

    linksFound() {
      return this.prev || this.next;
    }

    toLinks() {
      return {
        nextLink: Navigation.toLink(this.next),
        prevLink: Navigation.toLink(this.prev)
      };
    }

    static toLink(input) {
      if (input instanceof CandidateLink) return input.link.href;

      if (input instanceof String) return input;

      if (!input) return undefined;

      throw new Error(
        `The passed value ${input} is of an unexpected type. Accepting CandidateLink|String|null|undefined`
      );
    }
  }

  /**
   * Represents a list of CandidateLink of multiple types for a single url, which is not included.
   * Currently, supports just the prev/next types.
   */
  class NavigationCandidates {
    /**
     * @param {CandidateLink[]} prevCandidates
     * @param {CandidateLink[]} nextCandidates
     * @param {number} weight - weight of the navigation candidates. Used later in deciding the best candidate.
     */
    constructor(prevCandidates, nextCandidates, weight = 1) {
      if (
        !Array.isArray(prevCandidates) ||
        !prevCandidates.every(candidate => candidate instanceof CandidateLink)
      ) {
        throw new Error(
          'prevCandidates parameter must be an array of CandidateLinks'
        );
      }

      if (
        !Array.isArray(nextCandidates) ||
        !nextCandidates.every(candidate => candidate instanceof CandidateLink)
      ) {
        throw new Error(
          'nextCandidates parameter must be an array of CandidateLinks'
        );
      }

      this.next = nextCandidates;
      this.prev = prevCandidates;
      this.weight = weight;
    }

    toString() {
      const reduceCandidatesToStr = (str, linkCandidate) => {
        return `${str}\n\t(Conf: ${linkCandidate.confidence},  ${linkCandidate.link})`;
      };
      const nextOutput =
        this.next.reduce(reduceCandidatesToStr, '') || '\n\tNone';
      const prevOutput =
        this.prev.reduce(reduceCandidatesToStr, '') || '\n\tNone';

      return `Next:${nextOutput}\nPrev:${prevOutput}`;
    }

    static fromMap(navTypeToCandidates, weight = 1) {
      return new NavigationCandidates(
        navTypeToCandidates.get(NavType.PREV) || [],
        navTypeToCandidates.get(NavType.NEXT) || [],
        weight
      );
    }

    static nonAmbiguousCandidates(prevLink, nextLink, weight) {
      if (!prevLink && !nextLink) {
        throw new Error(
          'At least one of prevLink or nextLink must be provided'
        );
      }

      return new NavigationCandidates(
        prevLink ? [new CandidateLink(prevLink, NavType.PREV, 1)] : [],
        nextLink ? [new CandidateLink(nextLink, NavType.NEXT, 1)] : [],
        weight
      );
    }

    /**
     *
     * @param {HTMLHyperlinkElementUtils} baseUrl -  url of the current page
     * @param {HTMLHyperlinkElementUtils[]} prevLinks - link array of candidates for previous link
     * @param {HTMLHyperlinkElementUtils[]} nextLinks - link array of candidates for next link
     * @param {number} weight - weight of the navigation candidates
     * @return {NavigationCandidates}
     */
    static similarityBased(baseUrl, prevLinks, nextLinks, weight) {
      return new NavigationCandidates(
        similarityBasedConfidenceCandidates(baseUrl, prevLinks, NavType.PREV),
        similarityBasedConfidenceCandidates(baseUrl, nextLinks, NavType.NEXT),
        weight
      );
    }

    /**
     * Merges multiple instances of NavigationCandidates, summing up the confidence of link candidates
     * that appear in multiple instances for the same type.
     *
     * @param {NavigationCandidates[]} navCandidatesArray - an array of NavigationCandidates arrays.
     * Each representing a result from some Locator
     * @return {NavigationCandidates} the best NavigationCandidates taking into account all passed in LinkCandidates
     */
    static mergeNavigationCandidates(navCandidatesArray) {
      const navTypeToMergedCandidatesMap = new Map([
        [NavType.PREV, new Map()],
        [NavType.NEXT, new Map()]
      ]);

      navCandidatesArray.reduce(
        (navTypeToMergedCandidatesMap, navCandidates) => {
          if (!(navCandidates instanceof NavigationCandidates)) {
            throw new Error(
              'navCandidates must be an array of NavigationCandidates'
            );
          }

          this.reduceNavigationCandidates(
            navTypeToMergedCandidatesMap.get(NavType.PREV),
            navCandidates.prev,
            navCandidates.weight
          );
          this.reduceNavigationCandidates(
            navTypeToMergedCandidatesMap.get(NavType.NEXT),
            navCandidates.next,
            navCandidates.weight
          );

          return navTypeToMergedCandidatesMap;
        },
        navTypeToMergedCandidatesMap
      );

      return new NavigationCandidates(
        [...navTypeToMergedCandidatesMap.get(NavType.PREV).values()],
        [...navTypeToMergedCandidatesMap.get(NavType.NEXT).values()],
        1
      );
    }

    /**
     * Returns the best candidate by confidence.
     * If singleBest is true, then if the highest confidence is shared between multiple candidates,
     * no candidate is returned. It means we couldn't pick and would rather not guess. Depends on UI.
     *
     * @param {CandidateLink[]} candidatesLinks
     * @param {boolean} singleBest
     * @return {CandidateLink} - Best candidate or null
     */
    static findBestCandidateLink(candidatesLinks, singleBest = true) {
      let maxCount = -1;

      const bestCandidateLink = candidatesLinks.reduce(
        (max, candidateLink) => {
          if (candidateLink.confidence > max.confidence) {
            maxCount = 1;
            return candidateLink;
          }
          else {
            if (candidateLink.confidence === max.confidence) {
              maxCount++;
            }
            return max;
          }
        },
        new CandidateLink(null, NavType.INVALID, -1)
      );

      if ((singleBest && maxCount > 1) || maxCount === -1) return null;
      return bestCandidateLink;
    }

    /**
     *
     * @param {Map<HTMLHyperlinkElementUtils, CandidateLink>} linkToMergedCandidateLink - An existing Map
     * of a link to candidate link
     * @param {CandidateLink[]} newCandidateLinks - An array of candidateLinks
     * @param {number} weight - The weight that should be applied to the confidence of the passed candidateLinks
     * @return {Map<string, CandidateLink>} - A Map of a link to a candidate link with an updated confidence
     */
    static reduceNavigationCandidates(
      linkToMergedCandidateLink,
      newCandidateLinks,
      weight
    ) {
      return newCandidateLinks.reduce((linkToCandidateLink, newCandidate) => {
        const link = newCandidate.link;

        if (linkToCandidateLink.has(link)) {
          const existingCandidate = linkToCandidateLink.get(link);
          existingCandidate.confidence += newCandidate.confidence * weight;
        }
        else {
          linkToCandidateLink.set(
            link,
            new CandidateLink(
              link,
              newCandidate.navType,
              newCandidate.confidence * weight
            )
          );
        }
        return linkToCandidateLink;
      }, linkToMergedCandidateLink);
    }

    /**
     * Returns true if some of the candidates are higher than the passed confidenceThreshold
     * @param {number} confidenceThreshold
     * @return {boolean}
     */
    areHighConfidenceCandidates(confidenceThreshold = 0.7) {
      return (
        this?.prev?.some(
          candidate => candidate.confidence >= confidenceThreshold
        ) &&
        this?.next?.some(
          candidate => candidate.confidence >= confidenceThreshold
        )
      );
    }

    /**
     * Returns the best candidate of each NavType as a Navigation instance.
     * If singleBest is true and no single highest confidence CandidateLink can be found of a NavType,
     * nothing is returned for it.
     *
     * If a candidate does not pass the confidenceThreshold, it isn't returned
     *
     * @param {number} confidenceThreshold - confidence threshold, if no candidate is above then nothing is returned.
     * @param {boolean} singleBest
     * @return {Navigation}
     */
    bestCandidates(confidenceThreshold = 0.7, singleBest = true) {
      let bestPrev = NavigationCandidates.findBestCandidateLink(
        this.prev,
        singleBest
      );
      let bestNext = NavigationCandidates.findBestCandidateLink(
        this.next,
        singleBest
      );

      if (bestPrev) {
        console.info(
          `Previous candidate, conf: ${bestPrev.confidence} link: ${bestPrev.link}`
        );
        bestPrev = bestPrev.confidence > confidenceThreshold ? bestPrev : null;
      }

      if (bestNext) {
        console.info(
          `Next candidate, conf: ${bestNext.confidence} link: ${bestNext.link}`
        );
        bestNext = bestNext.confidence > confidenceThreshold ? bestNext : null;
      }

      return new Navigation(bestPrev, bestNext);
    }
  }

  class CandidateLink {
    /**
     * Class represents that a link is of type chapOffset and the confidence it is true.
     * The offset is relative to an original url that isn't included here.
     *
     * @param {HTMLHyperlinkElementUtils} link
     * @param {NavType} navType
     * @param {number} confidence
     */
    constructor(link, navType, confidence) {
      this.link = link;
      this.navType = navType;
      this.confidence = confidence;
    }
  }

  /**
   * This locator finds the next and previous chapter links by looking for numbers
   * differing by one in the current url and a link url. This locator focuses on the last
   * part of a string being a number, somehting like /chapter-1/ or /chapter1/. It would also
   * catch /chapter/10 .
   *
   * It differs only slightly from the PageNumberAnywhereLocator as that one looks for a number
   * anywhere.
   */
  class PageNumberSuffixLocator extends NavigationLocator {
    constructor(weight = 1) {
      super(weight);
    }

    locate(url, links) {
      const prevLinks = [];
      const nextLinks = [];

      // TODO: Split query parameters as well ?
      const curPathSegments = UrlUtils.toDecodedPathSegments(url);

      links.forEach(link => {
        const linkPath = UrlUtils.toDecodedPathSegments(link);

        for (let i = 0; i < linkPath.length; i++) {
          if (curPathSegments?.[i] === linkPath[i]) continue;

          if (!curPathSegments?.[i]) {
            // TODO: Should I handle extra segment of chapter only on the link ? Anywhere sort of does that.
            continue;
          }

          if (curPathSegments[i].length + 1 >= linkPath[i].length) {
            const curPathNumber = UrlUtils.extractNumberSuffixFromString(
              curPathSegments[i]
            );
            const linkChapNumber = UrlUtils.extractNumberSuffixFromString(
              linkPath[i]
            );

            if (!curPathNumber || !linkChapNumber) continue;

            switch (offsetToNavType(curPathNumber, linkChapNumber)) {
            case NavType.NEXT:
              nextLinks.push(link);
              break;
            case NavType.PREV:
              prevLinks.push(link);
              break;
            }
          }
        }
      });

      return NavigationCandidates.similarityBased(
        url,
        prevLinks,
        nextLinks,
        this.weight
      );
    }
  }

  /**
   * This locator finds the next and previous chapter links by looking for numbers
   * differing by one in the current url and a link url. This locator looks for the number everywhere
   * so it will catch things like /chapter-1-chapter-name or /2-chapter-name
   *
   * This locator will just ignore a link if there are multiple numbers in the link that are offset
   * by one from the passed URL. The idea is we can't trivially make a judgement and since this
   * locator is relatively permissive, we just ignore it.
   *
   * This locator also handles the case where the current page has no number, but
   * there is a link to a next page with a number of 0,1 or 2 implying a pseudo chapter
   * number of -1,0 or 1 for the current page. In the case where I find a link to a next of 1 and 2,
   * I prefer the 1.
   */
  class PageNumberAnywhereLocator extends NavigationLocator {
    constructor(weight = 0.5) {
      super(weight);
    }

    locate(url, links) {
      const prevLinks = [];
      const nextLinks = [];

      if (!links || links.length < 1) {
        throw new Error(`links must be a non empty array of HTMLHyperlinkElementUtils`);
      }

      links.forEach(link => {
        const offset = PageNumberAnywhereLocator.findCnumAnywhereInPath(
          url,
          new URL(link.href)
        );

        switch (offset) {
        case NavType.NEXT:
          nextLinks.push(link);
          break;
        case NavType.PREV:
          prevLinks.push(link);
          break;
        }
      });
      return NavigationCandidates.similarityBased(
        url,
        prevLinks,
        nextLinks,
        this.weight
      );
    }

    /**
     * I'm only going to use this strategy if I find a single matching segment, otherwise
     * things get too convoluted for this phase of link detection.
     *
     * @param {Location} curURL
     * @param {URL} testLink
     * @return {NavType} - returns of the Symbols inside NavType to indicate the link might have such relation to curURL
     */
    static findCnumAnywhereInPath(curURL, testLink) {
      if (!curURL || !testLink) return NavType.INVALID;

      const curSegments = UrlUtils.toDecodedPathSegments(curURL);
      const testSegments = UrlUtils.toDecodedPathSegments(testLink);

      const pathType = [];

      let checkedSegmentsMatchOrExtra = true;
      zip('', curSegments, testSegments).forEach(([curSeg, testSeg]) => {
        if (curSeg === testSeg) return;

        const curNumbers = UrlUtils.extractAnyCnumFromString(curSeg);
        const testNumbers =
          testSeg && UrlUtils.extractAnyCnumFromString(testSeg);

        if (curNumbers?.length === 1 && testNumbers?.length === 1) {
          const segOffset = offsetToNavType(curNumbers[0], testNumbers[0]);
          segOffset !== NavType.INVALID && pathType.push(segOffset);
        }

        // Sometimes the main/first page of a website will have no number.
        // The next page will then be either 0/1/2.
        // To limit spurious matches, I'm only going to look for pages where the
        // main page is substring of the next page.
        if (
          checkedSegmentsMatchOrExtra &&
          !curNumbers &&
          testNumbers?.length === 1
        ) {
          // This is the case we are on the non numbered main page and looking for the first numbered page.
          for (const pseudoMainPageNum of [0, 1, -1]) {
            const segOffset = offsetToNavType(
              pseudoMainPageNum,
              testNumbers[0]
            );
            if (segOffset !== NavType.INVALID) {
              pathType.push(segOffset);
              break; // only one pseudoMainPageNumber is correct.
            }
          }
        }

        if (
          checkedSegmentsMatchOrExtra &&
          !testNumbers &&
          curNumbers?.length === 1
        ) {
          // Opposite case. We are on the first numbered page and looking for the non numbered main page.
          for (const pseudoMainPageNum of [0, 1, -1]) {
            const segOffset = offsetToNavType(curNumbers[0], pseudoMainPageNum);
            if (segOffset !== NavType.INVALID) {
              pathType.push(segOffset);
              break; // only one pseudoMainPageNumber is correct.
            }
          }
        }

        if (curSeg && testSeg) checkedSegmentsMatchOrExtra = false;
      });

      return pathType.length === 1 ? pathType[0] : NavType.INVALID;
    }
  }

  /**
   * Zips over multiple arrays and fills the gaps with the fillValue passed as the first parameter.
   *
   * @param {any} fillValue
   * @param {any[][]} arrays
   * @return {any[][]} - An array where element i is an array of all the i elements of the passed
   * arrays or a fill value for the shorter arrays.
   */
  function zip(fillValue, ...arrays) {
    const longest = arrays.reduce(function(a, b) {
      return a.length > b.length ? a : b;
    }, []);

    return longest.map(function(_, i) {
      return arrays.map(function(array) {
        return array[i] || fillValue;
      });
    });
  }

  /**
   *
   * Converts the passed array of links to an CandidateLink[] where the confidence of each candidate
   * is determined by the similarity of the link to the current URL. Note, identical links have been
   * filtered out beforehand.
   *
   * @param {URL} originalURL
   * @param {HTMLHyperlinkElementUtils[]} links
   * @param {NavType} navType
   * @return {CandidateLink[]}
   */
  function similarityBasedConfidenceCandidates(originalURL, links, navType) {
    if (!links?.length) return [];

    if (!navType || !Object.values(NavType).includes(navType)) {
      throw new Error('navType must be a value of type NavType');
    }

    return links.map(link => {
      const editDistance = self.levenshtein.distance(
        originalURL.href,
        link.href
      );
      return new CandidateLink(
        link,
        navType,
        editDistance === 1 ?
          1 :
          editDistance === 2 ?
            0.7 :
            Math.min(0.2, 1 / links.length) + 1 / editDistance
      );
    });
  }

  function offsetToNavType(a, b) {
    if (a - b === -1) {
      return NavType.NEXT;
    }
    else if (a - b === 1) {
      return NavType.PREV;
    }
    else {
      return NavType.INVALID;
    }
  }

  /**
   *
   * Extracts all potential links.
   *
   * @param {Document} doc
   * @return {HTMLHyperlinkElementUtils[]} links - The next and previous chapter links.
   */
  function extractPotentialLinks(doc) {
    const allLinks = doc.querySelectorAll(
      'a[href]:not([href="javascript:void(0)"])'
    );

    if (allLinks.length === 0) {
      console.warn('No links found for next/prev chapter. Extend strategy.');
      return [];
    }

    return UrlUtils.processLinks(allLinks, doc.location);
  }

  /**
   * Extracts the next and previous chapter links for the passed document.
   *
   * @param {Document} doc
   * @param {number} confidenceThreshold - If the best candidate has a lower confidence than
   * this value, nothing will be returned
   * @return {{nextLink: string | undefined, prevLink: string | undefined}} - The next and previous chapter links.
   */
  function extractChapLinks(doc, confidenceThreshold = 0.5) {
    const links = extractPotentialLinks(doc);

    if (!(links?.length > 1)) {
      return {next: null, prev: null};
    }

    const curLocation = doc.location;
    const relLocator = new RelLocator();
    const relCandidates = relLocator.locate(curLocation, links);
    const relNavigation = relCandidates.bestCandidates(0.7, true);

    if (relNavigation.linksFound()) return relNavigation.toLinks();

    const suffixNumberLocator = new PageNumberSuffixLocator();
    const suffixCandidates = suffixNumberLocator.locate(curLocation, links);

    const chapterNumberAnywhereLocator = new PageNumberAnywhereLocator();
    const anywhereCandidates = chapterNumberAnywhereLocator.locate(
      curLocation,
      links
    );

    const keywordLocator = new KeywordLocator();
    const keywordCandidates = keywordLocator.locate(null, links);

    const mergedCandidates = NavigationCandidates.mergeNavigationCandidates([
      suffixCandidates,
      anywhereCandidates,
      keywordCandidates
    ]);
    return mergedCandidates.bestCandidates(confidenceThreshold, true).toLinks();
  }

  if (typeof self !== 'undefined') self.extractChapLinks = extractChapLinks;

  if (
    typeof module !== 'undefined' &&
    module !== null &&
    typeof exports !== 'undefined' &&
    module.exports === exports
  ) {
    module.exports = {
      PageNumberSuffixLocator,
      PageNumberAnywhereLocator,
      KeywordLocator,
      extractPotentialLinks,
      UrlUtils,
      extractChapLinks
    };
  }
}

// eslint-disable-next-line semi
''
