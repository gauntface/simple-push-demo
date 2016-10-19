// from Material Design Lite website
// @see https://getmdl.io/assets/snippets.js
/* eslint-env browser */
class MaterialComponentsSnippets {
  constructor() {
    this.snippets = document.querySelectorAll('code.language-markup');
  }

  init() {
    for (let i = 0; i < this.snippets.length; i++) {
      let snippet = this.snippets[i];
      snippet.addEventListener('click', this.onMouseClickHandler(snippet));
      snippet.addEventListener('mouseout', this.onMouseOutHandler(snippet));
    }
  }

  static get CssClasses_() {
    return {
      COPIED: 'copied',
      NOT_SUPPORTED: 'nosupport',
    };
  }

  copyToClipboard(snippet) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(snippet);
    selection.removeAllRanges();
    selection.addRange(range);
    let successful = false;
    try {
      successful = document.execCommand('copy');
    } catch (err) {
      successful = false;
    }
    selection.removeAllRanges();
    return successful;
  }

  onMouseClickHandler(snippet) {
    return () => {
      if (!(window.getSelection().toString().length > 0)) {
        const successful = this.copyToClipboard(snippet);
        snippet.classList.add(successful ?
          MaterialComponentsSnippets.CssClasses_.COPIED :
          MaterialComponentsSnippets.CssClasses_.NOT_SUPPORTED);
      }
    };
  }

  onMouseOutHandler(snippet) {
    return () => {
      snippet.classList.remove(MaterialComponentsSnippets.CssClasses_.COPIED);
    };
  }
}

window.MaterialComponentsSnippets = MaterialComponentsSnippets;
