(function(__global__) {

// --------------------------------------------------------------- Utilities ---

var modules = !!(typeof module != 'undefined' && module.exports)
  // Native functions
  , toString = Object.prototype.toString
  , slice = Array.prototype.slice
  , splice = Array.prototype.splice
  /**
   * @const
   * @type {boolean}
   */
  , JQUERY_AVAILABLE = (typeof jQuery != 'undefined')
  /**
   * Attribute names corresponding to event handlers.
   * @const
   * @type {Object.<string, boolean>}
   */
  , EVENT_ATTRS = (JQUERY_AVAILABLE
        ? jQuery.attrFn
        : lookup(('blur focus focusin focusout load resize scroll unload ' +
                  'click dblclick mousedown mouseup mousemove mouseover ' +
                  'mouseout mouseenter mouseleave change select submit ' +
                  'keydown keypress keyup error').split(' ')))
  /**
   * Element name for fragments.
   * @const
   * @type {string}
   */
  , FRAGMENT_NAME = '#document-fragment'
  /**
   * Tag names defined in the HTML 4.01 Strict and Frameset DTDs and new elements
   * from HTML5.
   * @const
   * @type {Array.<string>}
   */
  , TAG_NAMES = ('a abbr acronym address area article aside audio b bdi bdo big ' +
    'blockquote body br button canvas caption cite code col colgroup command ' +
    'datalist dd del details dfn div dl dt em embed fieldset figcaption figure ' +
    'footer form frame frameset h1 h2 h3 h4 h5 h6 hr head header hgroup html i ' +
    'iframe img input ins kbd keygen label legend li link map mark meta meter ' +
    'nav noscript ' /* :) */ + 'object ol optgroup option output p param pre ' +
    'progress q rp rt ruby samp script section select small source span strong ' +
    'style sub summary sup table tbody td textarea tfoot th thead time title tr ' +
    'track tt ul var video wbr').split(' ')
  /**
   * Cross-browser means of setting innerHTML on a DOM Element.
   * @param {Element} el
   * @param {string} html
   */
  , setInnerHTML = (JQUERY_AVAILABLE
        ? function(el, html) { jQuery(el).html(html); }
        : function(el, html) {
            try {
              el.innerHTML = html;
            } catch (e) {
              var div = document.createElement('div');
              div.innerHTML = html;
              while (el.firstChild)
                el.removeChild(el.firstChild);
              while (div.firstChild)
                el.appendChild(div.firstChild);
            }
          });

/**
 * Naively copies properties from one Object to another.
 * @param {Object} dest the destination Object.
 * @param {Object} source the source Object.
 * @return {Object} dest the destination Object.
 */
function extend(dest, source) {
  for (var name in source) {
    dest[name] = source[name];
  }
  return dest;
}

/**
 * Creates a lookup Object from an Array of Strings.
 * @param {Array.<string>} a
 * @return {Object.<string, boolean>}
 */
function lookup(a) {
  var obj = {}
    , i = 0
    , l = a.length;
  for (; i < l; i++) {
    obj[a[i]] = true;
  }
  return obj;
}

/**
 * Uses a dummy constructor to make a child constructor inherit from a
 * parent constructor.
 * @param {Function} child
 * @param {Function} parent
 */
function inheritFrom(child, parent) {
  /** @constructor */
  function F() {};
  F.prototype = parent.prototype;
  child.prototype = new F();
  child.prototype.constructor = child;
}

/**
 * @param {*} o
 * @return {boolean} true if the given object is an Array.
 */
function isArray(o) {
  return (toString.call(o) == '[object Array]');
}

/**
 * @param {*} o
 * @return {boolean} true if the given object is a Function.
 */
function isFunction(o) {
  return (toString.call(o) == '[object Function]');
}

/**
 * @param {*} o
 * @return {boolean} true if the given object is a String.
 */
function isString(o) {
  return (toString.call(o) == '[object String]');
}

/**
 * Flattens an Array in-place, replacing any Arrays it contains with their
 * contents, and flattening their contents in turn.
 * @param {Array} a
 * @return {Array} the flattened array.
 */
function flatten(a) {
  for (var i = 0, l = a.length, c; i < l; i++) {
    c = a[i];
    if (isArray(c)) {
      // Make sure we loop to the Array's new length
      l += c.length - 1;
      // Replace the current item with its contents
      splice.apply(a, [i, 1].concat(c));
      // Stay on the current index so we continue looping at the first
      // element of the array we just spliced in or removed.
      i--;
    }
  }
  // We flattened in-place, but return for chaining
  return a;
}

// ---------------------------------------------------------- Core utilities ---

/**
 * Distinguishes between Objects which represent attributes and Objects which
 * are created by output modes as elements.
 * @param {*} o the potential Object to be checked.
 * @param {?string=} mode the current mode being used to create content.
 * @return {boolean} false if given something which is not an Object or is an
 *    Object created by an ouput mode.
 */
function isPlainObject(o, mode) {
  return (!!o &&
          toString.call(o) == '[object Object]' &&
          (!mode || !DOMBuilder.modes[mode].isModeObject(o)));
}

/**
 * Distinguishes between Arrays which represent elements and Arrays which
 * represent their contents.
 * @param {*} o the potential Array to be checked.
 * @return {boolean} false if given something which is not an Array or is an
 *    Array which represents an element.
 */
function isPlainArray(o) {
  return (toString.call(o) == '[object Array]' &&
          typeof o.isElement == 'undefined');
}

/**
 * Adds a property to an Array indicating that it represents an element.
 * @param {Array} a
 * @return {Array} the given array.
 */
function elementArray(a) {
  a.isElement = true;
  return a;
}

// ---------------------------------- Element Creation Convenience Functions ---

/**
 * Creates on Object containing element creation functions with the given fixed
 * mode, if one is given.
 * @param {?string=} mode
 * @return {Object.<string, Function>}
 */
function createElementFunctions(mode) {
  var obj = {};
  for (var i = 0, tag; tag = TAG_NAMES[i]; i++) {
    obj[tag.toUpperCase()] = createElementFunction(tag, mode);
  }
  return obj;
}

/**
 * Creates a function which, when called, uses DOMBuilder to create an element
 * with the given tagName.
 *
 * The resulting function will also have a map function which calls
 * DOMBuilder.map with the given tagName and mode, if one is provided.
 *
 * @param {string} tag
 * @param {?string=} fixedMode
 * @return {function(...[*])}
 */
function createElementFunction(tag, fixedMode) {
  var elementFunction = function() {
    if (!arguments.length) {
      var mode = (typeof fixedMode != 'undefined'
                  ? fixedMode
                  : DOMBuilder.mode);
      // Short circuit if there are no arguments, to avoid further
      // argument inspection.
      if (mode) {
        return DOMBuilder.modes[mode].createElement(tag, {}, []);
      }
      return elementArray([tag]);
    }
    else {
      return createElementFromArguments(tag, fixedMode, slice.call(arguments));
    }
  };

  elementFunction.map = function() {
    return mapElementFromArguments(tag, fixedMode, slice.call(arguments));
  };

  return elementFunction;
}

/**
 * Normalises a list of arguments in order to create a new element using
 * DOMBuilder.createElement. Supported argument formats are:
 *
 * (attributes, child1, ...)
 *    an attributes object followed by an arbitrary number of children.
 * (attributes, [child1, ...])
 *    an attributes object and an Array of children.
 * (child1, ...)
 *    an arbitrary number of children.
 * ([child1, ...])
 *    an Array of children.
 *
 * At least one argument *must* be provided.
 *
 * @param {string} tagName
 * @param {string|null|undefined} fixedMode
 * @param {Array} args
 * @return {*}
 */
function createElementFromArguments(tagName, fixedMode, args) {
  var attributes
    , children
      // The short circuit in createElementFunction ensures we will
      // always have at least one argument when called via element creation
      // functions.
    , argsLength = args.length
    , firstArg = args[0];

  if (argsLength === 1 &&
      isPlainArray(firstArg)) {
    children = firstArg; // ([child1, ...])
  }
  else if (isPlainObject(firstArg, (typeof fixedMode != 'undefined'
                                    ? fixedMode
                                    : DOMBuilder.mode))) {
    attributes = firstArg;
    children = (argsLength == 2 && isPlainArray(args[1])
                ? args[1]         // (attributes, [child1, ...])
                : args.slice(1)); // (attributes, child1, ...)
  }
  else {
    children = args; // (child1, ...)
  }

  return DOMBuilder.createElement(tagName, attributes, children, fixedMode);
}

/**
 * Normalises a list of arguments in order to create new elements using
 * DOMBuilder.map.
 *
 * Supported argument formats are:
 *
 * (defaultAttributes, [item1, ...], mappingFunction)
 *    a default attributes attributes object, a list of items and a mapping
 *    Function.
 * ([item1, ...], mappingFunction)
 *    a list of items and a mapping Function.
 *
 * @param {string} tagName
 * @param {string|null|undefined} fixedMode
 * @param {Array} args
 * @return {Array}
 */
function mapElementFromArguments(tagName, fixedMode, args) {
  if (isPlainArray(args[0])) { // (items, func)
    var defaultAttrs = {}
      , items = args[0]
      , func = (isFunction(args[1]) ? args[1] : null);
  }
  else { // (attrs, items, func)
    var defaultAttrs = args[0]
      , items = args[1]
      , func = (isFunction(args[2]) ? args[2] : null);
  }

  return DOMBuilder.map(tagName, defaultAttrs, items, func, fixedMode);
}

/**
 * Creates an object with loops status details based on the current index and
 * total length.
 * @param {number} i
 * @param {number} l
 * @return {Object}
 */
function loopStatus(i, l) {
  return {
    index: i
  , first: i == 0
  , last: i == l - 1
  };
}

// === DOMBuilder API ==========================================================

var DOMBuilder = {
  version: '2.0.1'

// ------------------------------------------------------------------- Modes ---

  /**
   * Determines which mode content creation functions will operate in by
   * default.
   * @type {string}
   */
, mode: null

  /**
   * Additional modes registered using addMode.
   * @type {Object.<string, Object>}
   */
, modes: {}

  /**
   * Adds a new mode and exposes an API for it on the DOMBuilder object with the
   * mode's name.
   *
   * Modes are defined as an Object with the following properties.
   *
   * name
   *    the mode's name.
   * createElement(tagName, attributes, children)
   *    a Function which takes a tag name, attributes object and list of children
   *    and returns a content object.
   * fragment(children)
   *    a Function which takes a list of children and returns a content fragment.
   * isModeObject(object) (optional)
   *    a Function which can be used to eliminate false positives when DOMBuilder
   *    is trying to determine whether or not an attributes object was given - it
   *    should return true if given a mode-created content object.
   * api (optional)
   *    an Object defining a public API for the mode's implementation, exposing
   *    variables, functions and constructors used in implementation which may be
   *    of interest to anyone who wants to make use of the mode's internals.
   * apply (optional)
   *    an Object defining additional properties to be added to the object
   *    DOMBuilder creates for easy access to mode-specific element functions.
   * @param {Object} mode
   */
, addMode: function(mode) {
    mode = extend({
      isModeObject: function() { return false; }, api: {}, apply: {}
    }, mode);
    // Store the mode for later use of its content creation functions
    this.modes[mode.name] = mode;
    // Expose mode-specific element creation functions and the mode's exported
    // API as a DOMBuilder.<mode name> property.
    this[mode.name] = extend(createElementFunctions(mode.name), mode.apply);
    // If there is no default mode set, use the first mode added as the default
    if (this.mode === null) {
      this.mode = mode.name;
    }
  }

  /**
   * Calls a function using DOMBuilder temporarily in the given mode and
   * returns its output. Any additional arguments provided will be passed to
   * the function when it is called.
   * @param {string} mode
   * @param {Function} func
   * @return {*}
   */
, withMode: function(mode, func) {
    var originalMode = this.mode;
    this.mode = mode;
    try {
      return func.apply(null, slice.call(arguments, 2));
    }
    finally {
      this.mode = originalMode;
    }
  }

  /**
   * Element creation functions which create contents according to
   * DOMBuilder.mode.
   * @type {Object.<string, Object>}
   */
, elements: createElementFunctions()

  /**
   * Element creation functions which create nested Array contents.
   * @type {Object.<string, Object>}
   */
, array: createElementFunctions(null)

  /**
   * Adds element functions to a given context Object. If a valid mode argument
   * is given, mode-specific element functions are added, as well as any
   * additional functions specified for application by the mode.
   * @param {Object} context
   * @param {string=} mode
   * @return {Object} the object the functions were added to.
   */
, apply: function(context, mode) {
    if (mode && this.modes[mode]) {
      extend(context, this[mode]);
    }
    else {
      extend(context, this.elements);
    }
    return context;
  }

// -------------------------------------------------------- Content Creation ---

  /**
   * Generates content from a nested list using the given output mode, where
   * each list item and nested child item must be in one of the following
   * formats:
   *
   * [tagName[, attributes], child1, ...]
   *    a tag name, optional attributes Object and an arbitrary number of
   *    child elements.
   * ['#document-fragment', child1, ...]
   *    a fragment name and an arbitrary number of child elements.
   *
   * @param {Array} content
   * @param {string=} mode
   * @return {*}
   */
, build: function(content, mode) {
    mode = mode || this.mode;
    var elementName = content[0]
      , isFragment = (elementName == FRAGMENT_NAME)
      , attrs = (!isFragment && isPlainObject(content[1], mode)
                 ? content[1]
                 : null)
      , childStartIndex = (attrs === null ? 1 : 2)
      , l = content.length
      , built = []
      , item;
    for (var i = childStartIndex; i < l; i++) {
      item = content[i];
      if (isArray(item)) {
        built.push(this.build(item, mode));
      }
      else {
        built.push(item);
      }
    }
    return (isFragment
            ? this.modes[mode].fragment(built)
            : this.modes[mode].createElement(elementName, attrs, built));
  }

  /**
   * Creates an element with the given tag name and, optionally, the given
   * attributes and children.
   * @param {string} tagName
   * @param {Object} attributes
   * @param {Array} children
   * @param {string=} mode
   */
, createElement: function(tagName, attributes, children, mode) {
    attributes = attributes || {};
    children = children || [];
    mode = (typeof mode != 'undefined' ? mode : this.mode);
    if (mode) {
      flatten(children);
      return this.modes[mode].createElement(tagName, attributes, children);
    }
    else {
      var arrayOutput = [tagName];
      for (var attr in attributes) {
        arrayOutput.push(attributes);
        break;
      }
      if (children.length) {
        arrayOutput = arrayOutput.concat(children);
      }
      return elementArray(arrayOutput);
    }
  }

  /**
   * Creates an element for (potentially) every item in a list.
   *
   * Arguments are as follows:
   *
   * tagName
   *    the name of the element to create for each item in the list.
   * defaultAttrs
   *    default attributes for the element.
   * items
   *    the list of items to use as the basis for creating elements.
   * mappingFunction (optional)
   *    a function to be called with each item in the list to provide
   *    contents for the element which will be created for that item.
   *
   *    If provided, the function will be called with the following
   *    arguments::
   *
   *       mappingFunction(item, attributes, loopsStatus)
   *    Contents returned by the mapping function can consist of a single
   *    value or a mixed Array.
   *
   *    Attributes on the element which will be created can be altered by
   *    modifying the attributes argument, which will initially contain
   *    the contents of defaultAttributes, if it was provided.
   *
   *    The loopStatus argument is an Object with the following properties:
   *
   *       index
   *          0-based index of the current item in the list.
   *       first``
   *         true if the current item is the first in the list.
   *       last
   *         true if the current item is the last in the list.
   *
   *    The mapping function can prevent an element being generated for a
   *    given item by returning null.
   *
   *    If a mapping function is not provided, a new element will be created
   *    for each item in the list and the item itself will be used as the
   *    contents.
   * mode (optional)
   *    an override for the DOMBuilder mode used for this call.
   *
   * @param {string} tagName
   * @param {Object} defaultAttrs
   * @param {Array} items
   * @param {Function=} func
   * @param {string=} mode
   */
, map: function(tagName, defaultAttrs, items, func, mode) {
    var results = [];
    for (var i = 0, l = items.length, attrs, children; i < l; i++) {
      attrs = extend({}, defaultAttrs);
      // If we were given a mapping function, call it and use the
      // return value as the contents, unless the function specifies
      // that the item shouldn't generate an element by explicity
      // returning null.
      if (func != null) {
        if (typeof mode != 'undefined') {
          children = DOMBuilder.withMode(mode, func, items[i], attrs,
                                         loopStatus(i, l));
        }
        else {
          children = func(items[i], attrs, loopStatus(i, l));
        }
        if (children === null) {
          continue;
        }
      }
      else {
        // If we weren't given a mapping function, use the item as the
        // contents.
        var children = items[i];
      }

      // Ensure children are in an Array, as required by createElement
      if (!isPlainArray(children)) {
        children = [children];
      }

      results.push(this.createElement(tagName, attrs, children, mode));
    }
    return results;
  }

  /**
   * Creates a fragment with the given children. Supported argument formats are:
   *
   * (child1, ...)
   *    an arbitrary number of children.
   * ([child1, ...])
   *    an Array of children.
   *
   * In DOM mode, a DocumentFragment conveniently allows you to append its
   * contents with a single call. If you're thinking of adding a wrapper
   * <div> solely to be able to insert a number of sibling elements at the
   * same time, a DocumentFragment will do the same job without the need for
   * the redundant wrapper element.
   *
   * See http://ejohn.org/blog/dom-documentfragments/ for more information
   * about DocumentFragment objects.
   *
   * @param {...[*]} args
   * @return {*}
   */
, fragment: (function() {
    var fragment = function() {
      var children;
      if (arguments.length === 1 &&
          isPlainArray(arguments[0])) {
        children = arguments[0]; // ([child1, ...])
      }
      else {
        children = slice.call(arguments); // (child1, ...)
      }

      if (this.mode) {
        // Inline the contents of any child Arrays
        flatten(children);
        return this.modes[this.mode].fragment(children);
      }
      else {
        return elementArray([FRAGMENT_NAME].concat(children));
      }
    };

    /**
     * Creates a fragment wrapping content created for every item in a
     * list.
     *
     * Arguments are as follows:
     *
     * items
     *    the list of items to use as the basis for creating fragment
     *    contents.
     * mappingFunction
     *    a function to be called with each item in the list, to provide
     *    contents for the fragment.
     *
     *    Contents can consist of a single value or a mixed Array.
     *
     *    The function will be called with the following arguments::
     *
     *       func(item, itemIndex)
     *
     *    The function can indicate that the given item shouldn't generate
     *    any content for the fragment by returning null.
     *
     * @param {Array} items
     * @param {Function=} func
     */
    fragment.map = function(items, func) {
      // If we weren't given a mapping function, the user may as well just
      // have created a fragment directly, as we're just wrapping content
      // here, not creating it.
      if (!isFunction(func)) {
        return DOMBuilder.fragment(items);
      }

      var results = [];
      for (var i = 0, l = items.length, children; i < l; i++) {
        // Call the mapping function and add the return value to the
        // fragment contents, unless the function specifies that the item
        // shouldn't generate content by explicity returning null.
        children = func(items[i], loopStatus(i, l));
        if (children === null) {
          continue;
        }
        results = results.concat(children);
      }
      return DOMBuilder.fragment(results);
    };

    return fragment;
  })()

  /* Exposes utilities for use in mode plugins. */
, util: {
    EVENT_ATTRS: EVENT_ATTRS
  , FRAGMENT_NAME: FRAGMENT_NAME
  , JQUERY_AVAILABLE: JQUERY_AVAILABLE
  , TAG_NAMES: TAG_NAMES
  , extend: extend
  , lookup: lookup
  , inheritFrom: inheritFrom
  , isArray: isArray
  , isFunction: isFunction
  , isString: isString
  , flatten: flatten
  , setInnerHTML: setInnerHTML
  }
};

// Export DOMBuilder or expose it to the global object
if (modules) {
  module.exports = DOMBuilder;
}
else {
  __global__.DOMBuilder = DOMBuilder;
}

})(this);
