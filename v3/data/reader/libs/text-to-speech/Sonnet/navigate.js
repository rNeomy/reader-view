/* global Highlight */

// ---------------------------------------------------------------------------
// Rewrite notes
// ---------------------------------------------------------------------------
// The previous implementation used `selection.modify('extend', dir,
// 'sentenceboundary' | 'paragraphboundary')`. Firefox never implemented
// those granularities, so sentence/paragraph navigation silently did
// nothing there.
//
// This version replaces that browser-native call with a manual text model:
//   1. `TextModel` walks the DOM once, concatenating every text node into a
//      single plain-text string while remembering which (node, offset)
//      range each character came from.
//   2. Paragraphs are approximated as runs of text that share the same
//      nearest block-level ancestor (Intl.Segmenter has no "paragraph"
//      granularity, since paragraphs are a layout concept, not a text one).
//   3. Sentences *within* a paragraph are found with
//      `new Intl.Segmenter(locale, {granularity: 'sentence'})`, which is
//      supported in every modern engine (Chrome, Firefox, Safari).
//   4. Segment offsets are mapped back to real DOM Ranges via the model,
//      so the rest of the library (highlighting, scrolling, prefetching)
//      keeps working exactly as before.
//
// `<math>` elements are treated as a single atomic unit while building the
// model (their combined textContent is fed to the segmenter as one chunk,
// but any offset that lands inside them resolves to a Range around the
// whole element). That fully replaces the old NavL2 "#fix" hack, which is
// kept below as a thin, now-empty layer purely so the class names/hierarchy
// stay familiar to anything importing this file.
// ---------------------------------------------------------------------------

class TextModel {
  constructor(root) {
    this.root = root;
    this.nodes = [];       // ordered: {kind: 'text'|'math', node, start, end}
    this.text = '';        // flattened plain-text projection of root
    this.paragraphs = [];  // {start, end, sentences?}
    this.#build();
  }

  // skip text that isn't actually visible (display:none, visibility:hidden)
  #visible(el) {
    if (typeof el.checkVisibility === 'function') {
      return el.checkVisibility({checkOpacity: false, checkVisibilityCSS: true});
    }
    let node = el;
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
      if (node === this.root) {
        break;
      }
      node = node.parentElement;
    }
    return true;
  }
  #blockAncestor(node) {
    let el = node.parentElement;
    while (el && el !== this.root) {
      const display = getComputedStyle(el).display;
      if (display && !['inline', 'inline-block', 'contents'].includes(display)) {
        return el;
      }
      el = el.parentElement;
    }
    return this.root;
  }
  // true if line breaks inside this element are meaningful content
  // (<pre>, or any white-space value that preserves newlines) rather than
  // source-formatting noise
  #preformatted(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    if (el.tagName === 'PRE') {
      return true;
    }
    const ws = getComputedStyle(el).whiteSpace;
    return ws === 'pre' || ws === 'pre-wrap' || ws === 'pre-line' || ws === 'break-spaces';
  }

  #build() {
    const walker = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!this.#visible(parent)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let lastBlock = null;
    let lastMath = null;
    let paragraph = null;
    let node;

    const openParagraph = (start, block) => {
      if (paragraph) {
        this.paragraphs.push(paragraph);
      }
      paragraph = {start, end: start, pre: this.#preformatted(block)};
    };

    while ((node = walker.nextNode())) {
      const math = node.parentElement.closest('math');

      if (math) {
        if (math === lastMath) {
          continue; // already represented this <math> as one atomic unit
        }
        lastMath = math;

        if (!this.#visible(math)) {
          continue;
        }

        // math indentation/newlines are source noise, never meaningful
        // content, so these always get collapsed regardless of context
        const value = (math.textContent || '').replace(/\s+/g, ' ').trim() || ' ';
        const start = this.text.length;
        this.text += value;
        const end = this.text.length;
        this.nodes.push({kind: 'math', node: math, start, end});

        const block = this.#blockAncestor(math);
        if (block !== lastBlock) {
          openParagraph(start, block);
          lastBlock = block;
        }
        paragraph.end = end;
        continue;
      }
      lastMath = null;

      const value = node.nodeValue;
      if (!value) {
        continue;
      }
      const start = this.text.length;
      this.text += value;
      const end = this.text.length;
      this.nodes.push({kind: 'text', node, start, end});

      const block = this.#blockAncestor(node);
      if (block !== lastBlock) {
        openParagraph(start, block);
        lastBlock = block;
      }
      paragraph.end = end;
    }
    if (paragraph) {
      this.paragraphs.push(paragraph);
    }

    // drop paragraphs that turned out to be whitespace-only
    this.paragraphs = this.paragraphs.filter(p => this.text.slice(p.start, p.end).trim().length > 0);
  }

  // resolve a global text offset to a concrete DOM point
  //
  // Neighbouring entries share a boundary (a.end === b.start). A range START
  // must resolve into the entry that BEGINS there and a range END into the
  // entry that ENDS there. Otherwise the range leaks backwards over whatever
  // sits between the two text nodes (e.g. the <img> in front of a
  // <figcaption>) and that content gets selected/scrolled to as well.
  offsetToPoint(offset, isEnd = false) {
    offset = Math.max(0, Math.min(offset, this.text.length));

    const strict = isEnd
      ? e => offset > e.start && offset <= e.end
      : e => offset >= e.start && offset < e.end;
    const entry = this.nodes.find(strict) ||
      this.nodes.find(e => offset >= e.start && offset <= e.end);

    if (entry) {
      if (entry.kind === 'math') {
        const parent = entry.node.parentNode;
        const idx = Array.prototype.indexOf.call(parent.childNodes, entry.node);
        return {node: parent, offset: isEnd ? idx + 1 : idx};
      }
      return {node: entry.node, offset: offset - entry.start};
    }

    const last = this.nodes[this.nodes.length - 1];
    if (!last) {
      return {node: this.root, offset: 0};
    }
    if (last.kind === 'math') {
      const parent = last.node.parentNode;
      const idx = Array.prototype.indexOf.call(parent.childNodes, last.node);
      return {node: parent, offset: idx + 1};
    }
    return {node: last.node, offset: last.end - last.start};
  }

  rangeFor(start, end) {
    const range = new Range();
    const s = this.offsetToPoint(start, false);
    range.setStart(s.node, s.offset);
    if (start === end) {
      range.collapse(true);
      return range;
    }
    const e = this.offsetToPoint(end, true);
    range.setEnd(e.node, e.offset);
    return range;
  }

  // reverse of offsetToPoint: DOM point -> global text offset (best effort)
  offsetOfPoint(node, nodeOffset) {
    if (node.nodeType === Node.TEXT_NODE) {
      const entry = this.nodes.find(e => e.kind === 'text' && e.node === node);
      if (entry) {
        return entry.start + Math.min(nodeOffset, entry.end - entry.start);
      }
      const math = node.parentElement && node.parentElement.closest('math');
      if (math) {
        const mathEntry = this.nodes.find(e => e.kind === 'math' && e.node === math);
        if (mathEntry) {
          return mathEntry.start;
        }
      }
    }

    let point;
    try {
      point = new Range();
      point.setStart(node, nodeOffset);
      point.collapse(true);
    }
    catch {
      return 0;
    }

    let result = 0;
    for (const entry of this.nodes) {
      const entryStart = new Range();
      if (entry.kind === 'math') {
        entryStart.selectNode(entry.node);
      }
      else {
        entryStart.setStart(entry.node, 0);
      }
      entryStart.collapse(true);

      if (entryStart.compareBoundaryPoints(Range.START_TO_START, point) <= 0) {
        result = entry.start;
      }
      else {
        break;
      }
    }
    return result;
  }

  paragraphIndexAt(offset) {
    for (let n = 0; n < this.paragraphs.length; n += 1) {
      const p = this.paragraphs[n];
      if (offset >= p.start && offset <= p.end) {
        return n;
      }
    }
    if (!this.paragraphs.length) {
      return -1;
    }
    return offset < this.paragraphs[0].start ? 0 : this.paragraphs.length - 1;
  }
}

// lets subclasses save/restore the navigator position (private state)
const SNAPSHOT = Symbol('snapshot');
const RESTORE = Symbol('restore');

const locale = () => document.documentElement.lang || navigator.language || 'en';

// base navigator: paragraph/sentence movement via Intl.Segmenter
class NavL1 {
  // set nav.debug = false to silence, or window.NAV_DEBUG = false before
  // construction. Logged on every selection change: which paragraph/sentence
  // index was picked, its text offsets, the resolved DOM containers, and an
  // incrementing call counter - useful for spotting a handler firing twice
  // per click (counter jumps by 2, identical text logged back-to-back) vs.
  // genuinely duplicate content in the page (different start/end offsets,
  // different container nodes, but equal text).
  debug = typeof window !== 'undefined' && window.NAV_DEBUG === true ? true : false;

  #model;
  #paragraphIndex = 0;
  #sentenceIndex = 0;
  #callCount = 0;

  constructor(win = window, root = document.body) {
    this.selection = win.getSelection();
    this.root = root;
    this.window = win;
    this.#model = new TextModel(root);

    const empty = this.selection.toString().trim() === '';
    this.relocate(empty);
  }
  string() {
    return this.range ? this.range.toString() : '';
  }
  [SNAPSHOT]() {
    return {
      paragraphIndex: this.#paragraphIndex,
      sentenceIndex: this.#sentenceIndex,
      range: this.range
    };
  }
  [RESTORE](snapshot) {
    this.#paragraphIndex = snapshot.paragraphIndex;
    this.#sentenceIndex = snapshot.sentenceIndex;
    this.range = snapshot.range;
    this.selection.removeAllRanges();
    this.selection.addRange(this.range);
  }
  #sentencesFor(paragraphIndex) {
    const p = this.#model.paragraphs[paragraphIndex];
    if (!p) {
      return [];
    }
    if (!p.sentences) {
      const raw = this.#model.text.slice(p.start, p.end);

      if (p.pre) {
        // preformatted content (<pre>, white-space: pre*): each physical
        // line is one navigable unit, verbatim - no sentence detection.
        p.sentences = [];
        let cursor = p.start;
        for (const line of raw.split('\n')) {
          const start = cursor;
          const end = cursor + line.length;
          if (line.trim().length > 0) {
            p.sentences.push({start, end});
          }
          cursor = end + 1; // +1 for the '\n' consumed by split()
        }
      }
      else {
        // Raw DOM text can carry source-formatting whitespace that was
        // never meant to be read as content - indentation inside <math>,
        // multiple blank lines between text nodes, etc. Feeding that
        // straight into Intl.Segmenter makes it treat every such gap as a
        // sentence break, producing lots of tiny bogus "sentences". So
        // sentence boundaries are found on a whitespace-collapsed copy of
        // the paragraph text, then mapped back to the original raw offsets
        // (via `map`) so the resulting Range still points at the real DOM
        // positions untouched.
        let normalized = '';
        const map = [];
        let inWhitespace = false;
        for (let n = 0; n < raw.length; n += 1) {
          const ch = raw[n];
          // citation markers such as "[1]" make Intl.Segmenter break right
          // after the "[" ("pages.[" | "1] Before ..."), so hide them from
          // the segmenter (they stay inside the neighbouring sentence)
          if (ch === '[') {
            const m = /^\[\d{1,4}\]/.exec(raw.slice(n, n + 6));
            if (m) {
              n += m[0].length - 1;
              continue;
            }
          }
          if (/\s/.test(ch)) {
            if (!inWhitespace) {
              normalized += ' ';
              map.push(n);
              inWhitespace = true;
            }
          }
          else {
            normalized += ch;
            map.push(n);
            inWhitespace = false;
          }
        }
        map.push(raw.length);

        const segmenter = new Intl.Segmenter(locale(), {granularity: 'sentence'});
        p.sentences = [...segmenter.segment(normalized)]
          .map(s => {
            const startNorm = s.index;
            const endNorm = s.index + s.segment.length;
            return {
              start: p.start + map[startNorm],
              end: p.start + (map[endNorm] ?? raw.length)
            };
          })
          .filter(s => this.#model.text.slice(s.start, s.end).trim().length > 0);
      }

      if (!p.sentences.length) {
        p.sentences.push({start: p.start, end: p.end});
      }
    }
    return p.sentences;
  }
  #apply(reason = 'apply') {
    const sentences = this.#sentencesFor(this.#paragraphIndex);
    const s = sentences[this.#sentenceIndex] || {start: 0, end: 0};
    this.range = this.#model.rangeFor(s.start, s.end);
    this.selection.removeAllRanges();
    this.selection.addRange(this.range);
    this.#log(reason, s);
  }
  #log(reason, s) {
    if (this.debug === false) {
      return;
    }
    this.#callCount += 1;
    const text = this.#model.text.slice(s.start, s.end);
    console.log('[Navigate]', {
      call: this.#callCount,
      reason,
      paragraphIndex: this.#paragraphIndex,
      sentenceIndex: this.#sentenceIndex,
      start: s.start,
      end: s.end,
      length: s.end - s.start,
      text: text.length > 80 ? `${text.slice(0, 80)}…` : text,
      startContainer: this.range?.startContainer?.nodeName,
      startContainerParent: this.range?.startContainer?.parentElement?.outerHTML?.slice(0, 60),
      endContainer: this.range?.endContainer?.nodeName
    });
  }
  relocate(top = true) {
    const model = this.#model;

    if (!model.paragraphs.length) {
      this.range = model.rangeFor(0, 0);
      return;
    }

    // Like the original lib, relocate() does NOT select anything: it parks a
    // collapsed cursor right BEFORE the matched sentence. The next
    // line('forward') call then selects that matched sentence itself.
    // Internally that means storing the position of the sentence *previous*
    // to the match, since forward = "advance, then select".
    let anchorOffset = 0;

    if (top) {
      this.#paragraphIndex = 0;
      this.#sentenceIndex = -1; // "before the first sentence"
    }
    else {
      let domRange = null;
      try {
        domRange = this.selection.getRangeAt(0);
      }
      catch {
        domRange = null;
      }
      const offset = domRange
        ? model.offsetOfPoint(domRange.startContainer, domRange.startOffset)
        : 0;

      const p = Math.max(0, model.paragraphIndexAt(offset));
      const sentences = this.#sentencesFor(p);

      // Sentences/lines aren't always contiguous (e.g. <pre> lines have gaps
      // where the newline was), so pick the last one starting at/before the
      // selection start.
      let s = -1;
      for (let n = 0; n < sentences.length; n += 1) {
        if (sentences[n].start <= offset) {
          s = n;
        }
        else {
          break;
        }
      }
      if (s === -1) {
        s = 0;
      }
      anchorOffset = sentences[s].start;

      // step back one position so forward() lands on the match
      if (s > 0) {
        this.#paragraphIndex = p;
        this.#sentenceIndex = s - 1;
      }
      else if (p > 0) {
        this.#paragraphIndex = p - 1;
        this.#sentenceIndex = this.#sentencesFor(p - 1).length - 1;
      }
      else {
        this.#paragraphIndex = 0;
        this.#sentenceIndex = -1;
      }

      if (this.debug !== false) {
        console.log('[Navigate] relocate:selection debug', {
          selectedText: this.selection.toString().slice(0, 80),
          computedOffset: offset,
          matchedParagraphIndex: p,
          matchedSentenceIndex: s,
          matchedSentenceText: model.text.slice(sentences[s].start, sentences[s].end).slice(0, 80),
          storedParagraphIndex: this.#paragraphIndex,
          storedSentenceIndex: this.#sentenceIndex
        });
      }
    }

    this.range = model.rangeFor(anchorOffset, anchorOffset);
    this.selection.removeAllRanges();
    this.selection.addRange(this.range);
    this.#log(top ? 'relocate:top' : 'relocate:selection', {start: anchorOffset, end: anchorOffset});
  }
  paragraph(direction = 'forward') {
    const paragraphs = this.#model.paragraphs;

    if (direction === 'forward') {
      if (this.#paragraphIndex + 1 >= paragraphs.length) {
        return 'END_OF_FILE';
      }
      this.#paragraphIndex += 1;
    }
    else {
      if (this.#paragraphIndex - 1 < 0) {
        return 'START_OF_FILE';
      }
      this.#paragraphIndex -= 1;
    }
    this.#sentenceIndex = 0;
    this.#apply(`paragraph:${direction}`);
    return false;
  }
  line(direction = 'forward') {
    const sentences = this.#sentencesFor(this.#paragraphIndex);

    if (direction === 'forward') {
      if (this.#sentenceIndex + 1 < sentences.length) {
        this.#sentenceIndex += 1;
      }
      else if (this.#paragraphIndex + 1 < this.#model.paragraphs.length) {
        this.#paragraphIndex += 1;
        this.#sentenceIndex = 0;
      }
      else {
        return 'END_OF_FILE';
      }
    }
    else if (direction === 'backward') {
      if (this.#sentenceIndex - 1 >= 0) {
        this.#sentenceIndex -= 1;
      }
      else if (this.#paragraphIndex - 1 >= 0) {
        this.#paragraphIndex -= 1;
        const prev = this.#sentencesFor(this.#paragraphIndex);
        this.#sentenceIndex = Math.max(0, prev.length - 1);
      }
      else {
        return 'START_OF_FILE';
      }
    }
    this.#apply(`line:${direction}`);
    return false;
  }
  destroy() {}
}

// math handling is now baked directly into TextModel (atomic <math> units),
// so this layer is kept only for naming/hierarchy parity with the old code.
class NavL2 extends NavL1 {}

// predict next matching line string
// this is useful to prefetch player
class NavL3 extends NavL2 {
  line(...args) {
    const r = super.line(...args);
    if (r === 'END_OF_FILE') {
      this['next_matched_string'] = '';
    }
    else {
      this.#predict();
    }
    return r;
  }
  paragraph(...args) {
    const r = super.paragraph(...args);
    if (r === 'END_OF_FILE') {
      this['next_matched_string'] = '';
    }
    else {
      this.#predict();
    }
    return r;
  }
  #predict() {
    // only predict if this.predict === true
    if (!this.predict) {
      return;
    }

    // store the full navigator position (indices + range), not just the
    // range - the indices are what line('forward') advances from
    const snapshot = this[SNAPSHOT]();
    const debug = this.debug;
    this.debug = false; // don't spam the selection log with look-ahead steps

    try {
      for (let n = 0; n < 5; n += 1) {
        const j = super.line('forward');

        if (j === 'END_OF_FILE') {
          this['next_matched_string'] = '';
          break;
        }
        else {
          const s = this.string();
          if (s && s.trim()) {
            this['next_matched_string'] = s;
            break;
          }
        }
      }
    }
    finally {
      // revert
      this.debug = debug;
      this[RESTORE](snapshot);
    }
  }
}
// scroll into the view
class NavL4 extends NavL3 {
  #span;
  constructor(...args) {
    super(...args);

    this.#span = document.createElement('div');
    this.#span.style = `
      position: absolute;
      left: 0;
      right: 0;
      box-shadow: 0 0 0 200vmax rgba(128,128, 128, 0.1);
      display: none;
      pointer-events: none;
    `;

    this.window.document.documentElement.append(this.#span);
  }
  #scroll(block = 'center') {
    // Get the bounding rectangle of the Range object
    const rect = this.range.getBoundingClientRect();
    this.#span.style.top = CSS.px(rect.top + this.window.scrollY || this.window.pageYOffset);
    this.#span.style.height = CSS.px(rect.height);
    this.#span.style.display = rect.height ? 'block' : 'none';

    // Create an IntersectionObserver instance
    const observer = new IntersectionObserver(entries => {
      const inViewport = entries.some(entry => entry.intersectionRatio > 0.9);
      if (!inViewport) {
        this.#span.scrollIntoView({
          behavior: 'auto', // smooth
          block
        });
      }
      observer.disconnect();
    });
    observer.observe(this.#span);
  }
  paragraph(direction = 'forward', block) {
    const r = super.paragraph(direction);
    if (!r) {
      this.#scroll(block);
    }
    return r;
  }
  line(direction = 'forward', block) {
    const r = super.line(direction);
    if (!r) {
      this.#scroll(block);
    }
    return r;
  }
  destroy() {
    super.destroy();
    this.#span.remove();
  }
}
// use highlighter
class NavL5 extends NavL4 {
  #name = 'tts-sentence-highlight';
  #text = '';
  #use = false;
  #style;

  constructor(...args) {
    super(...args);

    this.#style = document.createElement('style');
    this.#style.textContent = `
      ::highlight(${this.#name}) {
        color: var(--tts-bg, #000);
        background-color: var(--tts-fg, #fff740);
      }
    `;
    this.root.append(this.#style);
  }
  highlight(range = this.range, name = this.#name) {
    const highlight = new Highlight(range);
    this.window.CSS.highlights.set(name, highlight);
  }
  paragraph(...args) {
    this.#use = false;
    const r = super.paragraph(...args);
    this.highlight();
    this.#text = this.string();
    this.selection.removeAllRanges();
    this.#use = true;
    return r;
  }
  line(...args) {
    this.#use = false;
    const r = super.line(...args);
    this.highlight();
    this.#text = this.string();
    this.selection.removeAllRanges();
    this.#use = true;
    return r;
  }
  string() {
    if (this.#use === false) {
      return super.string();
    }
    return this.#text;
  }
  relocate(...args) {
    this.window.CSS.highlights.clear();
    return super.relocate(...args);
  }
  destroy() {
    super.destroy();
    this.window.CSS.highlights.clear();
    this.#style.remove();
  }
}

window.Navigate = NavL5;
