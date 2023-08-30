'use strict';

{
  const CLASS = 'hghlght';
  class SimpleHighlight {
    // extract all text nodes that overlap with the range object
    extract(range) {
      const nodes = [];
      const iterator = document.createNodeIterator(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
      while (iterator.nextNode()) {
        if (range.intersectsNode(iterator.referenceNode)) {
          nodes.push(iterator.referenceNode);
        }
        else if (nodes.length) {
          break;
        }
      }
      // remove the fist node if it is empty
      {
        const node = nodes[0];
        if (range.startOffset && range.startContainer === node && node.nodeValue.length === range.startOffset) {
          nodes.shift();
        }
      }
      return nodes;
    }
    // split start and end nodes to adjust to the range boundaries
    adjust(range, nodes) {
      const {startOffset, endOffset, startContainer, endContainer} = range;
      {
        const node = nodes[nodes.length - 1];
        if (endOffset && node === endContainer) {
          node.splitText(endOffset);
        }
      }
      {
        const node = nodes[0];
        if (startContainer === node && startOffset) {
          nodes[0] = node.splitText(startOffset);
        }
      }
    }
    append(range, nodes) {
      // only append mark element to the nodes that are not yet highlighted
      nodes = nodes.filter(n => n.parentNode.classList.contains(CLASS) === false);
      for (const node of nodes) {
        const mark = document.createElement('mark');
        mark.classList.add(CLASS);
        node.replaceWith(mark);
        mark.appendChild(node);
      }
      // concat marks
      const next = () => {
        return [...range.commonAncestorContainer.querySelectorAll(`mark.${CLASS} + mark.${CLASS}`)].filter(m => {
          return m.previousSibling.nodeType == Element.ELEMENT_NODE;
        })[0];
      };
      let mark;
      while (mark = next()) {
        while (mark.childNodes.length) {
          mark.previousElementSibling.appendChild(mark.childNodes[0]);
        }
        mark.remove();
      }
      // concat text nodes
      range.commonAncestorContainer.normalize();
    }
    remove(range) {
      let parent = range.commonAncestorContainer;
      if (parent.nodeType !== Element.ELEMENT_NODE) {
        parent = parent.parentNode;
      }
      const next = () => {
        const m = [...parent.querySelectorAll(`mark.${CLASS}`)]
          .filter(m => range.intersectsNode(m));
        return m[0];
      };
      const remove = mark => {
        const f = document.createDocumentFragment();
        while (mark.childNodes.length > 0) {
          f.appendChild(mark.childNodes[0]);
        }
        mark.replaceWith(f);
      };
      let mark;
      while (mark = next()) {
        remove(mark);
      }
      if (parent.classList.contains(CLASS)) {
        const p = parent.parentElement;
        remove(parent);
        parent = p;
      }
      parent.normalize();
    }
  }
  class EasyHighlight extends SimpleHighlight {
    constructor() {
      super();
    }
    ranges() {
      const s = window.getSelection();
      return Array.from({
        length: s.rangeCount
      }).map((u, i) => s.getRangeAt(i));
    }
    append(ranges = this.ranges()) {
      for (const range of ranges) {
        const nodes = super.extract(range);
        super.adjust(range, nodes);
        super.append(range, nodes);
      }
    }
    remove(ranges = this.ranges()) {
      for (const range of ranges) {
        super.remove(range);
      }
    }
    toggle() {
      const white = [];
      const black = [];
      for (const range of this.ranges()) {
        const nodes = super.extract(range);
        if (nodes.every(node => node.parentNode.classList.contains(CLASS))) {
          black.push(range);
        }
        else {
          white.push(range);
        }
      }
      this.append(white);
      this.remove(black);
      for (const range of this.ranges()) {
        range.collapse();
      }
    }
  }
  class Stats extends EasyHighlight {
    constructor() {
      super();
    }
    xPath(element) {
      if (!element) {
        return null;
      }
      if (element.nodeType === Element.TEXT_NODE) {
        element = element.parentNode;
      }
      if (element.id) {
        return `//*[@id="${element.id}"]`;
      }
      else if (element.tagName === 'BODY') {
        return '/html/body';
      }
      else {
        const sameTagSiblings = Array.from(element.parentNode.childNodes)
          .filter(e => e.nodeName === element.nodeName);
        const idx = sameTagSiblings.indexOf(element);

        return this.xPath(element.parentNode) +
          '/' +
          element.tagName.toLowerCase() +
          (sameTagSiblings.length > 1 ? `[${idx + 1}]` : '');
      }
    }
    export() {
      return [...document.querySelectorAll(`mark.${CLASS}`)].map(m => {
        let offset = 0;
        for (const n of m.parentElement.childNodes) {
          if (n === m) {
            break;
          }
          else {
            offset += n.textContent.length;
          }
        }
        return {
          content: m.textContent,
          xPath: this.xPath(m).replace(/\/mark(\[\d+\])*/, ''),
          offset
        };
      });
    }
    import(arr) {
      for (const o of arr) {
        const e = document.evaluate(o.xPath, document.body).iterateNext();
        if (e) {
          const iterator = document.createNodeIterator(e, NodeFilter.SHOW_TEXT);
          let offset = 0;
          while (iterator.nextNode()) {
            offset += iterator.referenceNode.nodeValue.length;
            if (offset > o.offset) {
              const range = document.createRange();
              range.selectNode(iterator.referenceNode);
              const start = o.offset - offset + iterator.referenceNode.nodeValue.length;
              range.setStart(iterator.referenceNode, start);
              range.setEnd(iterator.referenceNode, start + o.content.length);

              super.append([range]);
              break;
            }
          }
        }
        else {
          console.warn('Cannot import', o);
        }
      }
    }
  }
  window.TextHighlight = Stats;
}
