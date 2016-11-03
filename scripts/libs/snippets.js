'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// from Material Design Lite website
// @see https://getmdl.io/assets/snippets.js
/* eslint-env browser */
var MaterialComponentsSnippets = function () {
  function MaterialComponentsSnippets() {
    _classCallCheck(this, MaterialComponentsSnippets);

    this.snippets = document.querySelectorAll('code.language-markup');
  }

  _createClass(MaterialComponentsSnippets, [{
    key: 'init',
    value: function init() {
      for (var i = 0; i < this.snippets.length; i++) {
        var snippet = this.snippets[i];
        snippet.addEventListener('click', this.onMouseClickHandler(snippet));
        snippet.addEventListener('mouseout', this.onMouseOutHandler(snippet));
      }
    }
  }, {
    key: 'copyToClipboard',
    value: function copyToClipboard(snippet) {
      var selection = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(snippet);
      selection.removeAllRanges();
      selection.addRange(range);
      var successful = false;
      try {
        successful = document.execCommand('copy');
      } catch (err) {
        successful = false;
      }
      selection.removeAllRanges();
      return successful;
    }
  }, {
    key: 'onMouseClickHandler',
    value: function onMouseClickHandler(snippet) {
      var _this = this;

      return function () {
        if (!(window.getSelection().toString().length > 0)) {
          var successful = _this.copyToClipboard(snippet);
          snippet.classList.add(successful ? MaterialComponentsSnippets.CssClasses_.COPIED : MaterialComponentsSnippets.CssClasses_.NOT_SUPPORTED);
        }
      };
    }
  }, {
    key: 'onMouseOutHandler',
    value: function onMouseOutHandler(snippet) {
      return function () {
        snippet.classList.remove(MaterialComponentsSnippets.CssClasses_.COPIED);
      };
    }
  }], [{
    key: 'CssClasses_',
    get: function get() {
      return {
        COPIED: 'copied',
        NOT_SUPPORTED: 'nosupport'
      };
    }
  }]);

  return MaterialComponentsSnippets;
}();

window.MaterialComponentsSnippets = MaterialComponentsSnippets;