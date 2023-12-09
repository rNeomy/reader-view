/* global Highlight */
class NavL1 {
  #startRange;
  constructor(win = window, root = document.body) {
    this.selection = win.getSelection();
    this.root = root;
    this.window = win;

    const b = this.selection.toString().trim() === '';
    this.relocate(b);
  }
  string() {
    return this.selection.toString();
  }
  relocate(top = true) {
    const {selection, root} = this;

    // reset to top
    if (top) {
      const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      for (let n = 0; n < 10; n += 1) {
        node = treeWalker.nextNode();
        if (node.nodeValue.trim()) {
          break;
        }
      }

      const range = this.range = new Range();
      range.selectNodeContents(node || root);
      range.collapse(true);
      selection.addRange(range);
      this.#startRange = range;
    }
    // find the container sentence of the current range
    else {
      selection.modify('extend', 'backward', 'sentenceboundary');
      selection.collapseToStart();
      selection.modify('extend', 'forward', 'sentenceboundary');
      selection.collapseToStart();
      this.range = selection.getRangeAt(0);
    }
  }
  #valid(direction) {
    if (direction === 'backward' && this.#startRange && this.range) {
      const compare = this.#startRange.compareBoundaryPoints(Range.START_TO_START, this.range);
      return compare !== 1;
    }
    return true;
  }
  paragraph(direction = 'forward') {
    const {selection} = this;

    if (!this.#valid(direction)) {
      return 'START_OF_FILE';
    }

    selection.removeAllRanges();
    selection.addRange(this.range);

    if (direction === 'forward') {
      selection.modify('move', 'forward', 'paragraphboundary');
      selection.modify('extend', 'forward', 'character');
      selection.modify('extend', 'forward', 'sentenceboundary');
    }
    else if (direction === 'backward') {
      selection.modify('move', 'backward', 'paragraphboundary');
      selection.modify('extend', 'backward', 'character');
      selection.modify('extend', 'backward', 'paragraphboundary');
      selection.collapseToStart();
      selection.modify('extend', 'forward', 'sentenceboundary');
    }

    this.range = selection.getRangeAt(0);
    // EOF
    return this.range.collapsed ? 'END_OF_FILE' : false;
  }
  line(direction = 'forward') {
    const {selection} = this;

    if (!this.#valid(direction)) {
      return 'START_OF_FILE';
    }

    selection.removeAllRanges();
    selection.addRange(this.range);

    selection[direction === 'forward' ? 'collapseToEnd' : 'collapseToStart']();
    selection.modify('extend', direction, 'sentenceboundary');

    if (this.string().trim().length === 0) {
      selection.modify('extend', direction, 'character');
      selection.modify('extend', direction, 'sentenceboundary');
    }
    this.range = selection.getRangeAt(0);
    // EOF
    return this.range.collapsed ? 'END_OF_FILE' : false;
  }
  destroy() {}
}
// select the entire math container
class NavL2 extends NavL1 {
  #fix(container) {
    if (container.nodeType === Node.TEXT_NODE) {
      const math = container.parentElement.closest('math');
      if (math) {
        const range = this.range = document.createRange();
        range.selectNodeContents(math);
        this.selection.removeAllRanges();
        this.selection.addRange(range);
      }
    }
  }
  paragraph(direction = 'forward') {
    const r = super.paragraph(direction);
    if (!r) {
      this.#fix(this.range[direction === 'forward' ? 'endContainer' : 'startContainer']);
    }
    return r;
  }
  line(direction = 'forward') {
    const r = super.line(direction);
    if (!r) {
      this.#fix(this.range[direction === 'forward' ? 'endContainer' : 'startContainer']);
    }
    return r;
  }
}
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
    // store current range
    const {range, predict} = this;

    // only predict if this.predict === true
    if (!predict) {
      return;
    }

    // run next
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
    // revert
    this.range = range;
    this.selection.removeAllRanges();
    this.selection.addRange(this.range);
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
    this.#text = this.selection.toString();
    this.selection.removeAllRanges();
    this.#use = true;
    return r;
  }
  line(...args) {
    this.#use = false;
    const r = super.line(...args);
    this.highlight();
    this.#text = this.selection.toString();
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
