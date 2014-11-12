// Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
// This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
// The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
// The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
// Code distributed by Google as part of the polymer project is also
// subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

(function() {
  var thisFile = 'load.js';
  var libLocation = '';

  function write(inSrc) {
    document.write('<script src="' + libLocation + inSrc + '"></script>');
  }

  var script = document.querySelector('script[src*="' + thisFile + '"]');
  if (script)
    libLocation = script.src.slice(0, script.src.indexOf(thisFile));

  document.write('<link rel="stylesheet" href="' +
      libLocation + 'src/template_element.css">');

  write('../observe-js/src/observe.js');
  write('../NodeBind/src/NodeBind.js');
  if (window.WCT && (WCT.util.getParam('build') === 'min' || WCT.util.getParam('build') === 'min/')) {
    write('TemplateBinding.min.js');
  } else {
    write('src/TemplateBinding.js');
  }
})();
