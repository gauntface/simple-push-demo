// Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
// This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
// The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
// The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
// Code distributed by Google as part of the polymer project is also
// subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

function Window() {}

var window = new Window();

function Event(type) {
  this.type = type;
}
Event.prototype = {
  initMouseEvent: function() {}
}

function Node(owner) {
  this.ownerDocument = owner;
  this.parentNode = null;
  this.nextSibling = null;
  this.previousSibling = null;
  this.firstChild = null;
  this.lastChild = null;
}
Node.prototype = {
  addEventListener: function() {},
  set textContent(content) {
    this.data = content;
  },
  get textContent() {
    return this.data;
  },
  dispatchEvent: function() {},
  appendChild: function(node) {
    if (node instanceof DocumentFragment) {
      while (node.firstChild) {
        this.appendChild(node.firstChild);
      }

      return;
    }

    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }

    node.parentNode = this;
    if (!this.firstChild) {
      this.firstChild = node;
      this.lastChild = node;
    } else {
      this.lastChild.nextSibling = node;
      node.previousSibling = this.lastChild;
      this.lastChild = node;
    }

    return node;
  },

  removeChild: function(node) {
    if (node.parentNode != this) {
      throw Error('NotFoundError');
    }
    if (!node.previousSibling && !node.nextSibling) {
      this.firstChild = null;
      this.lastChild = null;
    } else if (!node.previousSibling) {
      this.firstChild = node.nextSibling;
      node.nextSibling.previousSibling = null;
    } else if (!node.nextSibling) {
      this.lastChild = node.previousSibling;
      node.previousSibling.nextSibling = null;
    } else {
      node.previousSibling.nextSibling = node.nextSibling;
      node.nextSibling.previousSibling = node.previousSibling;
    }

    node.parentNode = null;
    node.previousSibling = null;
    node.nextSibling = null;

    return node;
  },
  insertBefore: function(node, otherNode) {
    if (node.parentNode)
      node.parentNode.removeChild(node);
    if (node instanceof DocumentFragment) {
      while (node.firstChild) {
        this.insertBefore(node.firstChild, otherNode);
      }
      return node;
    }
    if (!otherNode || otherNode.parentNode !== this)
      return this.appendChild(node);
    if (!otherNode.previousSibling) {
      otherNode.previousSibling = node;
      node.previousSibling = null;
      node.nextSibling = otherNode;
      this.firstChild = node;
    } else {
      otherNode.previousSibling.nextSibling = node;
      node.previousSibling = node.previousSibling;
      node.nextSibling = otherNode;
      otherNode.previousSibling = node;
    }
    node.parentNode = this;
    return node;
  },
  cloneNode: function(deep) {
    var clone = this.cloneNode_();
    if (deep) {
      for (var child = this.firstChild; child; child = child.nextSibling) {
        var c = child.cloneNode(deep);
        clone.appendChild(c);
      }
    }
    return clone;
  },

  get childNodes() {
    var retval = [];
    for (var child = this.firstChild; child; child = child.nextSibling)
      retval.push(child);
    return retval;
  },

  set innerHTML(_) {
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
  },

  dump: function(pre) {
    var prefix = '';
    for (var i = 0; i < pre; i++)
      prefix += ' ';
    print(prefix + this.toString());
    for (var child = this.firstChild; child; child = child.nextSibling)
      child.dump(pre + 2);
  }
}

Node.ELEMENT_NODE = 1;
Node.TEXT_NODE = 3;
Node.DOCUMENT_FRAGMENT_NODE = 11;
Node.DOCUMENT_NODE = 9;

function Document(defaultView) {
  Node.call(this, null);
  this.defaultView = defaultView;
  this.templateContentsOwnerDocument = defaultView ? new Document() : this;
}
Document.prototype = {
  __proto__: Node.prototype,
  nodeType: Node.DOCUMENT_NODE,
  implementation: {
    createHTMLDocument: function() {
      var doc = new Document();
      var html = doc.appendChild(doc.createElement('HTML'));
      var head = html.appendChild(doc.createElement('HEAD'));
      doc.head = head;
      var body = html.appendChild(doc.createElement('BODY'));
      doc.body = body;

      return doc;
    }
  },
  importNode: function(node) {
    var clone = node.cloneNode(false);
    clone.ownerDocument = this;
    return clone;
  },
  createElement: function(tagName) {
    var n = this.createElement_(tagName);
    return n;
  },
  createElement_: function(tagName) {
    tagName = tagName.toUpperCase();
    switch(tagName) {
      case 'DIV':
        return new HTMLDivElement(this, tagName);
      case 'INPUT':
        return new HTMLInputElement(this, tagName);
      case 'P':
        return new HTMLParagraphElement(this, tagName);
      case 'SPAN':
        return new HTMLSpanElement(this, tagName);
      case 'H1':
      case 'H2':
        return new HTMLHeadingElement(this, tagName);
      case 'TEMPLATE':
        return new HTMLTemplateElement(this, tagName);
      case 'HTML':
        return new HTMLHtmlElement(this, tagName);
      case 'HEAD':
        return new HTMLHeadElement(this, tagName);
      case 'BODY':
        return new HTMLBodyElement(this, tagName);
      case 'BASE':
        return new HTMLBaseElement(this, tagName)
      default:
        throw Error('Unknown tag: ' + tagName);
    }
  },
  createEvent: function(type) {
    return new Event(type);
  },
  createDocumentFragment: function() {
    return new DocumentFragment();
  },
  createTextNode: function(data) {
    return new Text(this, data);
  }
}
var document = new Document(window);

function DocumentFragment(owner) {
  Node.call(this, owner);
}
DocumentFragment.prototype = {
  __proto__: Node.prototype,
  nodeType: Node.DOCUMENT_FRAGMENT_NODE,
  cloneNode_: function() {
    return new DocumentFragment(this.ownerDocument);
  },
  toString: function() {
    return '#document-fragment';
  },
  querySelectorAll: function() {
    return [];
  }
};


function Text(owner, data) {
  Node.call(this, owner);
  this.data = data;
}
Text.prototype = {
  __proto__: Node.prototype,
  nodeType: Node.TEXT_NODE,
  cloneNode_: function() {
    return new Text(this.ownerDocument, this.data);
  },
  toString: function() {
    return '#text: ' + this.data;
  }
};

function Element(owner, tagName) {
  Node.call(this, owner);
  this.tagName = tagName;
  this.attributes = [];
};

Element.prototype = {
  __proto__: Node.prototype,
  nodeType: Node.ELEMENT_NODE,
  cloneNode_: function() {
    var c = this.ownerDocument.createElement(this.tagName);
    for (var i = 0; i < this.attributes.length; i++)
      c.attributes.push(this.attributes[i]);
    return c;
  },
  setAttribute: function(name, value) {
    this.attributes.push({ name: name, value: value });
  },
  getAttribute: function(name) {
    var count = this.attributes.length;
    while (count-- > 0) {
      if (this.attributes[count].name === name)
        return this.attributes[count].value;
    }
    return null;
  },
  hasAttribute: function(name) {
    var count = this.attributes.length;
    while (count-- > 0) {
      if (this.attributes[count].name === name)
        return true;
    }

    return false;
  },
  toString: function() {
    var string = '<' + this.tagName + '>[';
    var attrs = {};
    var count = this.attributes.length;
    while (count-- > 0) {
      var attr = this.attributes[count];
      if (attrs[attr.name])
        continue;
      string += attr.name + '=' + attr.value + ', ';
      attrs[attr.name] = true;
    }
    string += ']';
    return string;
  },
};

function HTMLElement(owner, tagName) {
  Element.call(this, owner, tagName);
}
HTMLElement.prototype = {
  __proto__: Element.prototype
};

function HTMLDivElement(owner, tagName) {
  HTMLElement.call(this, owner, tagName);
}
HTMLDivElement.prototype = {
  __proto__: HTMLElement.prototype
};

function HTMLInputElement(owner, tagName) {
  HTMLElement.call(this, owner, tagName);
}
HTMLInputElement.prototype = {
  __proto__: HTMLElement.prototype
};

function HTMLTextAreaElement(owner, tagName) {
  HTMLElement.call(this, owner, tagName);
}
HTMLTextAreaElement.prototype = {
  __proto__: HTMLElement.prototype
};

function HTMLOptionElement(owner, tagName) {
  HTMLElement.call(this, owner, tagName);
}
HTMLOptionElement.prototype = {
  __proto__: HTMLElement.prototype
};

function HTMLSelectElement(owner, tagName) {
  HTMLElement.call(this, owner, tagName);
}
HTMLSelectElement.prototype = {
  __proto__: HTMLElement.prototype
};

function HTMLParagraphElement(owner, tagName) {
  HTMLElement.call(this, owner, tagName);
}
HTMLParagraphElement.prototype = {
  __proto__: HTMLElement.prototype
};

function HTMLSpanElement(owner, tagName) {
  HTMLElement.call(this, owner, tagName);
}
HTMLSpanElement.prototype = {
  __proto__: HTMLElement.prototype
};

function HTMLHeadingElement(owner, tagName) {
  HTMLElement.call(this, owner, tagName);
}
HTMLHeadingElement.prototype = {
  __proto__: HTMLElement.prototype
};

function HTMLTemplateElement(owner, tagName) {
  HTMLElement.call(this, owner, tagName);
  this.content = new DocumentFragment(owner.templateContentsOwnerDocument);
}
HTMLTemplateElement.prototype = {
  __proto__: HTMLElement.prototype,
};

function HTMLHtmlElement(owner, tagName) {
  HTMLElement.call(this, owner, tagName);
}
HTMLHtmlElement.prototype = {
  __proto__: HTMLElement.prototype
};

function HTMLHeadElement(owner, tagName) {
  HTMLElement.call(this, owner, tagName);
}
HTMLHeadElement.prototype = {
  __proto__: HTMLElement.prototype
};

function HTMLBodyElement(owner, tagName) {
  HTMLElement.call(this, owner, tagName);
}
HTMLBodyElement.prototype = {
  __proto__: HTMLElement.prototype
};

function HTMLBaseElement(owner, tagName) {
  HTMLElement.call(this, owner, tagName);
}
HTMLBaseElement.prototype = {
  __proto__: HTMLElement.prototype
};
