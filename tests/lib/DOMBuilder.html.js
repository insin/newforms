(function(__global__) {

// --------------------------------------------------------------- Utilities ---

var modules = !!(typeof module !== 'undefined' && module.exports)
  , DOMBuilder = (modules ? require('./DOMBuilder') : __global__.DOMBuilder)
  // Native functions
  , hasOwn = Object.prototype.hasOwnProperty
  , splice = Array.prototype.splice
  // DOMBuilder utilities
  , EVENT_ATTRS = DOMBuilder.util.EVENT_ATTRS
  , FRAGMENT_NAME = DOMBuilder.util.FRAGMENT_NAME
  , JQUERY_AVAILABLE = DOMBuilder.util.JQUERY_AVAILABLE
  , TAG_NAMES = DOMBuilder.util.TAG_NAMES
  , extend = DOMBuilder.util.extend
  , inheritFrom = DOMBuilder.util.inheritFrom
  , lookup = DOMBuilder.util.lookup
  , setInnerHTML = DOMBuilder.util.setInnerHTML
  /**
   * Lookup for known tag names.
   * @const
   * @type {Object.<string, boolean>}
   */
  , TAG_NAME_LOOKUP = lookup(TAG_NAMES)
  /**
   * Lookup for tags defined as EMPTY in the HTML 4.01 Strict and Frameset DTDs
   * and in the HTML5 spec.
   * @const
   * @type {Object.<string, boolean>}
   */
  , EMPTY_TAGS = lookup(('area base br col command embed frame hr input img ' +
                         'keygen link meta param source track wbr').split(' '))
  /**
   * Cross-browser event registration.
   * @param {string} id
   * @param {string} event
   * @param {Function} handler
   */
  , addEvent = (JQUERY_AVAILABLE
      ? function(id, event, handler) { jQuery('#' + id)[event](handler); }
      : function(id, event, handler) {
          document.getElementById(id)['on' + event] = handler;
        });

// ----------------------------------------------------------- HTML Escaping ---

/**
 * String subclass which marks the given string as safe for inclusion
 * without escaping.
 * @constructor
 * @extends {String}
 * @param {string} value
 */
function SafeString(value) {
  this.value = value;
}
inheritFrom(SafeString, String);

/**
 * @return {string}
 */
SafeString.prototype.toString = SafeString.prototype.valueOf = function() {
  return this.value;
};

/**
 * Marks a string as safe
 * @param {string} value
 * @return {SafeString}
 */
function markSafe(value) {
  return new SafeString(value);
}

/**
 * Determines if a string is safe.
 * @param {string|SafeString} value
 * @return {boolean}
 */
function isSafe(value) {
  return (value instanceof SafeString);
}

/**
 * Escapes sensitive HTML characters.
 * @param {string} s
 * @return {string}
 */
function escapeHTML(s) {
  return s.split('&').join('&amp;')
           .split('<').join('&lt;')
            .split('>').join('&gt;')
             .split('"').join('&quot;')
              .split("'").join('&#39;');
}

/**
 * If the given input is a SafeString, returns its value; otherwise, coerces
 * to String and escapes.
 * @param {*} html
 * @return {string}
 */
function conditionalEscape(html) {
  if (html instanceof SafeString) {
    return html.value;
  }
  return escapeHTML(''+html);
}

// ------------------------------------------------------- Mock DOM Elements ---

/**
 * Partially emulates a DOM Node for HTML generation.
 * @constructor
 * @param {Array=} childNodes
 */
function HTMLNode(childNodes) {
  /**
   * @type {Array}
   */
  this.childNodes = childNodes || [];

  // Ensure MockFragment contents are inlined, as if this object's child
  // nodes were appended one-by-one.
  this._inlineFragments();
}
inheritFrom(HTMLNode, Object);

/**
 * Replaces any MockFragment objects in child nodes with their own
 * child nodes and empties the fragment.
 * @private
 */
HTMLNode.prototype._inlineFragments = function() {
  for (var i = 0, l = this.childNodes.length, child; i < l; i++) {
    child = this.childNodes[i];
    if (child instanceof MockFragment) {
      // Replace the fragment with its contents
      splice.apply(this.childNodes, [i, 1].concat(child.childNodes));
      // Clear the fragment on append, as per DocumentFragment
      child.childNodes = [];
    }
  }
};

/**
 * Emulates appendChild, inserting fragment child node contents and
 * emptying the fragment if one is given.
 * @param {*} node
 */
HTMLNode.prototype.appendChild = function(node) {
  if (node instanceof MockFragment) {
    this.childNodes = this.childNodes.concat(node.childNodes);
    // Clear the fragment on append, as per DocumentFragment
    node.childNodes = [];
  }
  else {
    this.childNodes.push(node);
  }
};

/**
 * Emulates cloneNode so cloning of MockFragment objects works
 * as expected.
 * @param {boolean} deep
 * @return {HTMLNode}
 */
HTMLNode.prototype.cloneNode = function(deep) {
  var clone = this._clone();
  if (deep === true)
  {
    for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
      node = this.childNodes[i];
      if (node instanceof MockElement) {
        clone.childNodes.push(node.cloneNode(deep));
      }
      else {
        clone.childNodes.push(node);
      }
    }
  }
  return clone;
};

/**
 * Creates the object to be used for deep cloning.
 * @protected
 */
HTMLNode.prototype._clone = function() {
  return new Node();
};

/**
 * Partially emulates a DOM Element for HTML generation.
 * @constructor
 * @extends {HTMLNode}
 * @param {string} tagName
 * @param {Object=} attributes
 * @param {Array=} childNodes
 */
function MockElement(tagName, attributes, childNodes) {
  HTMLNode.call(this, childNodes);
  /** @type {string} */
  this.tagName = this.nodeName = tagName.toLowerCase();
  /** @type {Object} */
  this.attributes = attributes || {};
}
inheritFrom(MockElement, HTMLNode);
/** @type {number} */
MockElement.eventTrackerId = 1;
/** @type {number} */
MockElement.prototype.nodeType = 1;
/**
 * @protected
 * @return {MockElement}
 */
MockElement.prototype._clone = function() {
  return new MockElement(this.tagName, extend({}, this.attributes));
};

/**
 * Creates an HTML representation of an MockElement.
 *
 * If true is passed as an argument and any event attributes are found, this
 * method will ensure the resulting element has an id so  the handlers for the
 * event attributes can be registered after the element has been inserted into
 * the document via innerHTML.
 *
 * If necessary, a unique id will be generated.
 *
 * @param {boolean=} trackEvents
 * @return {string}
 */
MockElement.prototype.toString = function(trackEvents) {
  trackEvents = (typeof trackEvents != 'undefined' ? trackEvents : false);
  var tagName = (TAG_NAME_LOOKUP[this.tagName]
                 ? this.tagName
                 : conditionalEscape(this.tagName))
      // Opening tag
    , parts = ['<' + tagName]
    , attr;
  // Tag attributes
  for (attr in this.attributes) {
    // innerHTML is a special case, as we can use it to (perhaps
    // inadvisedly) specify entire contents as a string.
    if (attr === 'innerHTML') {
      continue;
    }
    // Don't create attributes which wouldn't make sense in HTML mode when the
    // DOM is available - they can be dealt with after insertion using
    // addEvents().
    if (EVENT_ATTRS[attr]) {
      if (trackEvents === true && !this.eventsFound) {
        /** @type {boolean|undefined} */
        this.eventsFound = true;
      }
      continue;
    }
    parts.push(' ' + conditionalEscape(attr.toLowerCase()) + '="' +
               conditionalEscape(this.attributes[attr]) + '"');
  }
  if (this.eventsFound && !hasOwn.call(this.attributes, 'id')) {
    // Ensure an id is present so we can grab this element later
    this.id = '__DB' + MockElement.eventTrackerId++ + '__';
    parts.push(' id="' + this.id + '"');
  }
  parts.push('>');

  if (EMPTY_TAGS[tagName]) {
    return parts.join('');
  }

  // If innerHTML was given, use it exclusively for the contents
  if (hasOwn.call(this.attributes, 'innerHTML')) {
    parts.push(this.attributes.innerHTML);
  }
  else {
    for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
      node = this.childNodes[i];
      if (node instanceof MockElement || node instanceof SafeString) {
        parts.push(node.toString(trackEvents));
      }
      else {
        // Coerce to string and escape
        parts.push(escapeHTML(''+node));
      }
    }
  }

  // Closing tag
  parts.push('</' + tagName + '>');
  return parts.join('');
};

/**
 * If event attributes were found when toString(true) was called, this
 * method will retrieve the resulting DOM Element by id, attach event handlers
 * to it and call addEvents on any MockElement children.
 */
MockElement.prototype.addEvents = function() {
  if (this.eventsFound) {
    var id = (hasOwn.call(this.attributes, 'id')
              ? conditionalEscape(this.attributes.id)
              : this.id)
      , attr;
    for (attr in this.attributes) {
      if (EVENT_ATTRS[attr]) {
        addEvent(id, attr, this.attributes[attr]);
      }
    }
    delete this.eventsFound;
    delete this.id;
  }

  for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
    node = this.childNodes[i];
    if (node instanceof MockElement) {
      node.addEvents();
    }
  }
};

/**
 * @param {Element} el
 */
MockElement.prototype.insertWithEvents = function(el) {
  setInnerHTML(el, this.toString(true));
  this.addEvents();
};

/**
 * Partially emulates a DOM DocumentFragment for HTML generation.
 * @constructor
 * @extends {HTMLNode}
 * @param {Array=} childNodes
 */
function MockFragment(childNodes) {
  HTMLNode.call(this, childNodes);
}
inheritFrom(MockFragment, HTMLNode);
/**
 * @protected
 * @return {MockFragment}
 */
MockFragment.prototype._clone = function() {
  return new MockFragment();
};
/** @type {number} */
MockFragment.prototype.nodeType = 11;
/** @type {string} */
MockFragment.prototype.nodeName = FRAGMENT_NAME;

/**
 * Creates an HTML representation of an MockFragment.
 *
 * If true is passed as an argument, it will be passed on to
 * any child MockElements when their toString() is called.
 *
 * @param {boolean=} trackEvents
 * @return {string}
 */
MockFragment.prototype.toString = function(trackEvents) {
  trackEvents = (typeof trackEvents != 'undefined' ? trackEvents : false);
  var parts = [];
  // Contents
  for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
    node = this.childNodes[i];
    if (node instanceof MockElement || node instanceof SafeString) {
      parts.push(node.toString(trackEvents));
    }
    else {
      // Coerce to string and escape
      parts.push(escapeHTML(''+node));
    }
  }

  return parts.join('');
};

/**
 * Calls addEvents() on any MockElement children.
 */
MockFragment.prototype.addEvents = function() {
  for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
    node = this.childNodes[i];
    if (node instanceof MockElement) {
      node.addEvents();
    }
  }
};

/**
 * @param {Element} el
 */
MockFragment.prototype.insertWithEvents = function(el) {
  setInnerHTML(el, this.toString(true));
  this.addEvents();
};

// === Register mode plugin ====================================================

DOMBuilder.addMode({
  name: 'html'
, createElement: function(tagName, attributes, children) {
    return new MockElement(tagName, attributes, children);
  }
, fragment: function(children) {
    return new MockFragment(children);
  }
, isModeObject: function(obj) {
    return (obj instanceof HTMLNode ||
            obj instanceof SafeString);
  }
, api: {
    conditionalEscape: conditionalEscape
  , isSafe: isSafe
  , markSafe: markSafe
  , SafeString: SafeString
  , HTMLNode: HTMLNode
  , MockElement: MockElement
  , MockFragment: MockFragment
  }
, apply: {
    isSafe: isSafe
  , markSafe: markSafe
  }
});

})(this);
