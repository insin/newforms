/**
 * @fileOverview Miscellaneous utility functions and objects.
 */

var toString = Object.prototype.toString;

function isArray(o)
{
    return (toString.call(o) === "[object Array]");
}

function isFunction(o)
{
    return (toString.call(o) === "[object Function]");
}

function isNumber(o)
{
    return (toString.call(o) === "[object Number]");
}

function isObject(o)
{
    return (toString.call(o) === "[object Object]");
}

function isString(o)
{
    return (toString.call(o) === "[object String]");
}

function isCallable(o)
{
    return (isFunction(o) || isFunction(o.__call__));
}

function callValidator(v, value)
{
    if (isFunction(v))
        v(value);
    else if (isFunction(v.__call__))
        v.__call__(value);
}

/**
 * Updates an object's properties with other objects' properties.
 *
 * @param {Object} destination the object to be updated.
 * @param {...Object} var_args all further arguments will have their properties
 *                             copied to the <code>destination</code> object in
 *                             the order given.
 *
 * @return the <code>destination</code> object.
 */
function extend(destination, var_args)
{
    for (var i = 1, l = arguments.length; i < l; i++)
    {
        var source = arguments[i];
        for (var property in source)
        {
            if (source.hasOwnProperty(property))
            {
                destination[property] = source[property];
            }
        }
    }
    return destination;
}

/**
 * Creates a list of [name, value] pairs from an object's properties.
 */
function objectItems(obj)
{
    var result = [];
    for (var name in obj)
    {
        if (obj.hasOwnProperty(name))
        {
            result.push([name, obj[name]]);
        }
    }
    return result;
}

/**
 * Creates an object from a list of [name, value] pairs.
 */
function itemsToObject(items)
{
    var obj = {};
    for (var i = 0, l = items.length; i < l; i++)
    {
        obj[items[i][0]] = items[i][1];
    }
    return obj;
}

/**
 * Uses a dummy constructor to make a child constructor inherit from a
 * parent constructor.
 *
 * @param {Function} child the child constructor.
 * @param {Function} parent the parent constructor.
 */
function inheritFrom(child, parent)
{
    function F() {};
    F.prototype = parent.prototype;
    child.prototype = new F();
    child.prototype.constructor = child;
}

/**
 * Creates a lookup object from an array, casting each item to a string.
 */
function createLookup(a)
{
    var obj = {};
    for (var i = 0, l = a.length; i < l; i++)
    {
        obj[""+a[i]] = true;
    }
    return obj;
}

/**
 * Converts "firstName" and "first_name" to "First name", and
 * "SHOUTING_LIKE_THIS" to "SHOUTING LIKE THIS".
 */
var prettyName = (function()
{
    var capsRE = /([A-Z]+)/g,
        splitRE = /[ _]+/,
        trimRE = /(^ +| +$)/g,
        allCapsRE = /^[A-Z][A-Z0-9]+$/;

    return function(name)
    {
        // Prefix sequences of caps with spaces and split on all space
        // characters.
        var parts = name.replace(capsRE, " $1").split(splitRE);

        // If we had an initial cap...
        if (parts[0] === "")
            parts.splice(0, 1);

        // Give the first word an initial cap and all subsequent words an
        // initial lowercase if not all caps.
        for (var i = 0, l = parts.length; i < l; i++)
        {
            if (i == 0)
                parts[0] = parts[0].charAt(0).toUpperCase() +
                           parts[0].substr(1);
            else if (!allCapsRE.test(parts[i]))
                parts[i] = parts[i].charAt(0).toLowerCase() +
                           parts[i].substr(1);
        }

        return parts.join(" ");
    };
})();

/**
 * Performs replacement of named placeholders in a String, specified in
 * <code>%(placeholder)s</code> format.
 *
 * @param {String} input the String to be formatted.
 * @param {Object} context an object specifying formatting context attributes.
 *
 * @return a formatted version of the given String.
 */
var format = (function()
{
    // Closure for accessing a context object from the replacement function
    var replacer = function(context)
    {
        return function(s, name)
        {
            return context[name];
        };
    };

    return function(input, context)
    {
        return input.replace(/%\((\w+)\)([ds])/g, replacer(context));
    };
})();

/**
 * Creates an object representing the data held in a form.
 *
 * @param form a form object or a <code>String</code> specifying a form's
 *        <code>name</code> or <code>id</code> attribute. If a
 *        <code>String</code> is given, name is tried before id when attempting
 *        to find the form.
 *
 * @return an object representing the data present in the form. If the form
 *         could not be found, this object will be empty.
 */
function formData(form)
{
    var data = {};

    if (isString(form))
    {
        form = document.forms[form] || document.getElementById(form);
    }

    if (!form)
    {
        return data;
    }

    for (var i = 0, l = form.elements.length; i < l; i++)
    {
        var element = form.elements[i],
            type = element.type,
            value = null;

        // Retrieve the element's value (or values)
        if (type == "hidden" || type == "password" || type == "text" ||
            type == "textarea" || ((type == "checkbox" ||
                                    type == "radio") && element.checked))
        {
            value = element.value;
        }
        else if (type == "select-one")
        {
            value = element.options[element.selectedIndex].value;
        }
        else if (type == "select-multiple")
        {
            value = [];
            for (var j = 0, m = element.options.length; j < m; j++)
            {
                if (element.options[j].selected)
                {
                    value[value.length] = element.options[j].value;
                }
            }
            if (value.length == 0)
            {
                value = null;
            }
        }

        // Add any value obtained to the data object
        if (value !== null)
        {
            if (data.hasOwnProperty(element.name))
            {
                if (isArray(data[element.name]))
                {
                    data[element.name] = data[element.name].concat(value);
                }
                else
                {
                    data[element.name] = [data[element.name], value];
                }
            }
            else
            {
                data[element.name] = value;
            }
        }
    }

    return data;
}

/**
 * Utility method for determining if:
 * <ul>
 * <li>an item is contained in an <code>Array</code></li>
 * <li>a substring is contained within a <code>String</code></li>
 * </ul>
 *
 * @param container an <code>Array</code> or <code>String</code>.
 * @param item an item which might be contained in an <code>Array</code>, or a
 *             <code>String</code>.
 *
 * @return <code>true</code> if the container contains the item,
 *         <code>false</code> otherwise.
 */
function contains(container, item)
{
    if (isArray(container))
    {
        for (var i = 0, l = container.length; i < l; i++)
        {
            if (item === container[i])
            {
                return true;
            }
        }
    }
    else if (isString(container))
    {
        return (container.indexOf(item) != -1);
    }
    return false;
}

/**
 * Returns the value of a property if it is defined in the given object,
 * otherwise returns the given default value.
 */
function getDefault(o, prop, defaultValue)
{
    if (typeof o[prop] != "undefined")
        return o[prop];
    return defaultValue;
}

/**
 * Coerces to string and strips leading and trailing spaces.
 */
function strip(s)
{
    return (""+s).replace(/(^\s+|\s+$)/g, "");
}

/**
 * A collection of errors that knows how to display itself in various formats.
 *
 * This object's properties are the field names, and corresponding values are
 * the errors.
 *
 * @constructor
 */
function ErrorObject(errors)
{
    this.errors = errors || {};
}

ErrorObject.prototype.set = function(name, error)
{
    this.errors[name] = error;
};

ErrorObject.prototype.get = function(name)
{
    return this.errors[name];
};

ErrorObject.prototype.toString = function()
{
    return ""+this.defaultRendering();
};

ErrorObject.prototype.defaultRendering = function()
{
    return this.asUL();
};

/**
 * Determines if any errors are present.
 *
 * @return {Boolean} <code>true</code> if this object has had any properties
 *                   set, <code>false</code> otherwise.
 */
ErrorObject.prototype.isPopulated = function()
{
    for (var name in this.errors)
        if (this.errors.hasOwnProperty(name))
            return true;
    return false;
};

/**
 * Displays error details as a list.
 */
ErrorObject.prototype.asUL = function()
{
    var items = [];
    for (var name in this.errors)
        if (this.errors.hasOwnProperty(name))
            items.push(DOMBuilder.createElement("li", {},
                           [name, this.errors[name].defaultRendering()]));

    if (items.length === 0)
        return DOMBuilder.fragment();
    return DOMBuilder.createElement("ul", {"class": "errorlist"}, items);
};

/**
 * Displays error details as text.
 */
ErrorObject.prototype.asText = function()
{
    var items = [];
    for (var name in this.errors)
    {
        if (this.errors.hasOwnProperty(name))
        {
            items.push("* " + name);
            var errorList = this.errors[name];
            for (var i = 0, l = errorList.errors.length; i < l; i++)
                items.push("  * " + errorList.errors[i]);
        }
    }
    return items.join("\n");
};

/**
 * A list of errors which knows how to display itself in various formats.
 *
 * @param {Array} [errors] a list of errors.
 * @constructor
 */
function ErrorList(errors)
{
    this.errors = errors || [];
}

ErrorList.prototype.toString = function()
{
    return ""+this.defaultRendering();
};

ErrorList.prototype.defaultRendering = function()
{
    return this.asUL();
};

/**
 * Adds errors from another ErrorList.
 *
 * @param {ErrorList} errorList an ErrorList whose errors should be added.
 */
ErrorList.prototype.extend = function(errorList)
{
    this.errors = this.errors.concat(errorList.errors);
};

/**
 * Displays errors as a list.
 */
ErrorList.prototype.asUL = function()
{
    return DOMBuilder.createElement("ul", {"class": "errorlist"},
        DOMBuilder.map("li", this.errors));
};

/**
 * Displays errors as text.
 */
ErrorList.prototype.asText = function()
{
    var items = [];
    for (var i = 0, l = this.errors.length; i < l; i++)
        items.push("* " + this.errors[i]);
    return items.join("\n");
};

/**
 * Determines if any errors are present.
 *
 * @return {Boolean} <code>true</code> if this object contains any errors
 *                   <code>false</code> otherwise.
 */
ErrorList.prototype.isPopulated = function()
{
    return this.errors.length > 0;
};

/**
 * A validation error, containing a list of messages. Single messages
 * (e.g. those produced by validators may have an associated error code
 * and parameters to allow customisation by fields.
 */
function ValidationError(message, kwargs)
{
    kwargs = extend({code: null, params: null}, kwargs || {});
    if (isArray(message))
    {
        this.messages = message;
    }
    else
    {
        this.code = kwargs.code;
        this.params = kwargs.params;
        this.messages = [message];
    }
}

ValidationError.prototype.toString = function()
{
    return ("ValidationError: " + this.messages.join("; "));
};

/**
 * Copyright (c) 2010 Nick Galbreath
 * http://code.google.com/p/stringencoders/source/browse/#svn/trunk/javascript
 * See LICENSE for license.
 */
var urlparse = {};

urlparse.urlsplit = function(url, default_scheme, allow_fragments)
{
    var leftover;
    if (typeof allow_fragments === 'undefined') {
        allow_fragments = true;
    }

    // scheme (optional), host, port
    var fullurl = /^([A-Za-z]+)?(:?\/\/)([0-9.\-A-Za-z]*)(?::(\d+))?(.*)$/;
    // path, query, fragment
    var parse_leftovers = /([^?#]*)?(?:\?([^#]*))?(?:#(.*))?$/;

    var o = {};

    var parts = url.match(fullurl);
    if (parts) {
        o.scheme = parts[1] || default_scheme || '';
        o.hostname = parts[3].toLowerCase() || '';
        o.port = parseInt(parts[4], 10) || '';
        // Probably should grab the netloc from regexp
        //  and then parse again for hostname/port

        o.netloc = parts[3];
        if (parts[4]) {
            o.netloc += ':' + parts[4];
        }

        leftover = parts[5];
    } else {
        o.scheme = default_scheme || '';
        o.netloc = '';
        o.hostname = '';
        leftover = url;
    }
    o.scheme = o.scheme.toLowerCase();

    parts = leftover.match(parse_leftovers);

    o.path = parts[1] || '';
    o.query = parts[2] || '';

    if (allow_fragments) {
        o.fragment = parts[3] || '';
    } else {
        o.fragment = '';
    }

    return o;
};

urlparse.urlunsplit = function(o) {
    var s = '';
    if (o.scheme) {
        s += o.scheme + '://';
    }

    if (o.netloc) {
        if (s == '') {
            s += '//';
        }
        s += o.netloc;
    } else if (o.hostname) {
        // extension.  Python only uses netloc
        if (s == '') {
            s += '//';
        }
        s += o.hostname;
        if (o.port) {
            s += ':' + o.port;
        }
    }

    if (o.path) {
        s += o.path;
    }

    if (o.query) {
        s += '?' + o.query;
    }
    if (o.fragment) {
        s += '#' + o.fragment;
    }
    return s;
};

/* This file is part of OWL JavaScript Utilities.

OWL JavaScript Utilities is free software: you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public License
as published by the Free Software Foundation, either version 3 of
the License, or (at your option) any later version.

OWL JavaScript Utilities is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public
License along with OWL JavaScript Utilities.  If not, see
<http://www.gnu.org/licenses/>.
*/
var copy = (function() {

  // the re-usable constructor function used by clone().
  function Clone() {}

  // clone objects, skip other types.
  function clone(target) {
    if ( typeof target == 'object' ) {
      Clone.prototype = target;
      return new Clone();
    } else {
      return target;
    }
  }


  // Shallow Copy
  function copy(target) {
    if (typeof target !== 'object' ) {
      return target;  // non-object have value sematics, so target is already a copy.
    } else {
      var value = target.valueOf();
      if (target != value) {
        // the object is a standard object wrapper for a native type, say String.
        // we can make a copy by instantiating a new object around the value.
        return new target.constructor(value);
      } else {
        // ok, we have a normal object. If possible, we'll clone the original's prototype
        // (not the original) to get an empty object with the same prototype chain as
        // the original.  If just copy the instance properties.  Otherwise, we have to
        // copy the whole thing, property-by-property.
        if ( target instanceof target.constructor && target.constructor !== Object ) {
          var c = clone(target.constructor.prototype);

          // give the copy all the instance properties of target.  It has the same
          // prototype as target, so inherited properties are already there.
          for ( var property in target) {
            if (target.hasOwnProperty(property)) {
              c[property] = target[property];
            }
          }
        } else {
          var c = {};
          for ( var property in target ) c[property] = target[property];
        }

        return c;
      }
    }
  }

  // Deep Copy
  var deepCopiers = [];

  function DeepCopier(config) {
    for ( var key in config ) this[key] = config[key];
  }
  DeepCopier.prototype = {
    constructor: DeepCopier,

    // determines if this DeepCopier can handle the given object.
    canCopy: function(source) { return false; },

    // starts the deep copying process by creating the copy object.  You
    // can initialize any properties you want, but you can't call recursively
    // into the DeeopCopyAlgorithm.
    create: function(source) { },

    // Completes the deep copy of the source object by populating any properties
    // that need to be recursively deep copied.  You can do this by using the
    // provided deepCopyAlgorithm instance's deepCopy() method.  This will handle
    // cyclic references for objects already deepCopied, including the source object
    // itself.  The "result" passed in is the object returned from create().
    populate: function(deepCopyAlgorithm, source, result) {}
  };

  function DeepCopyAlgorithm() {
    // copiedObjects keeps track of objects already copied by this
    // deepCopy operation, so we can correctly handle cyclic references.
    this.copiedObjects = [];
    thisPass = this;
    this.recursiveDeepCopy = function(source) {
      return thisPass.deepCopy(source);
    }
    this.depth = 0;
  }
  DeepCopyAlgorithm.prototype = {
    constructor: DeepCopyAlgorithm,

    maxDepth: 256,

    // add an object to the cache.  No attempt is made to filter duplicates;
    // we always check getCachedResult() before calling it.
    cacheResult: function(source, result) {
      this.copiedObjects.push([source, result]);
    },

    // Returns the cached copy of a given object, or undefined if it's an
    // object we haven't seen before.
    getCachedResult: function(source) {
      var copiedObjects = this.copiedObjects;
      var length = copiedObjects.length;
      for ( var i=0; i<length; i++ ) {
        if ( copiedObjects[i][0] === source ) {
          return copiedObjects[i][1];
        }
      }
      return undefined;
    },

    // deepCopy handles the simple cases itself: non-objects and object's we've seen before.
    // For complex cases, it first identifies an appropriate DeepCopier, then calls
    // applyDeepCopier() to delegate the details of copying the object to that DeepCopier.
    deepCopy: function(source) {
      // null is a special case: it's the only value of type 'object' without properties.
      if ( source === null ) return null;

      // All non-objects use value semantics and don't need explict copying.
      if ( typeof source !== 'object' ) return source;

      var cachedResult = this.getCachedResult(source);

      // we've already seen this object during this deep copy operation
      // so can immediately return the result.  This preserves the cyclic
      // reference structure and protects us from infinite recursion.
      if ( cachedResult ) return cachedResult;

      // objects may need special handling depending on their class.  There is
      // a class of handlers call "DeepCopiers"  that know how to copy certain
      // objects.  There is also a final, generic deep copier that can handle any object.
      for ( var i=0; i<deepCopiers.length; i++ ) {
        var deepCopier = deepCopiers[i];
        if ( deepCopier.canCopy(source) ) {
          return this.applyDeepCopier(deepCopier, source);
        }
      }
      // the generic copier can handle anything, so we should never reach this line.
      throw new Error("no DeepCopier is able to copy " + source);
    },

    // once we've identified which DeepCopier to use, we need to call it in a very
    // particular order: create, cache, populate.  This is the key to detecting cycles.
    // We also keep track of recursion depth when calling the potentially recursive
    // populate(): this is a fail-fast to prevent an infinite loop from consuming all
    // available memory and crashing or slowing down the browser.
    applyDeepCopier: function(deepCopier, source) {
      // Start by creating a stub object that represents the copy.
      var result = deepCopier.create(source);

      // we now know the deep copy of source should always be result, so if we encounter
      // source again during this deep copy we can immediately use result instead of
      // descending into it recursively.
      this.cacheResult(source, result);

      // only DeepCopier::populate() can recursively deep copy.  So, to keep track
      // of recursion depth, we increment this shared counter before calling it,
      // and decrement it afterwards.
      this.depth++;
      if ( this.depth > this.maxDepth ) {
        throw new Error("Exceeded max recursion depth in deep copy.");
      }

      // It's now safe to let the deepCopier recursively deep copy its properties.
      deepCopier.populate(this.recursiveDeepCopy, source, result);

      this.depth--;

      return result;
    }
  };

  // entry point for deep copy.
  //   source is the object to be deep copied.
  //   maxDepth is an optional recursion limit. Defaults to 256.
  function deepCopy(source, maxDepth) {
    var deepCopyAlgorithm = new DeepCopyAlgorithm();
    if ( maxDepth ) deepCopyAlgorithm.maxDepth = maxDepth;
    return deepCopyAlgorithm.deepCopy(source);
  }

  // publicly expose the DeepCopier class.
  deepCopy.DeepCopier = DeepCopier;

  // publicly expose the list of deepCopiers.
  deepCopy.deepCopiers = deepCopiers;

  // make deepCopy() extensible by allowing others to
  // register their own custom DeepCopiers.
  deepCopy.register = function(deepCopier) {
    if ( !(deepCopier instanceof DeepCopier) ) {
      deepCopier = new DeepCopier(deepCopier);
    }
    deepCopiers.unshift(deepCopier);
  }

  // Generic Object copier
  // the ultimate fallback DeepCopier, which tries to handle the generic case.  This
  // should work for base Objects and many user-defined classes.
  deepCopy.register({
    canCopy: function(source) { return true; },

    create: function(source) {
      if ( source instanceof source.constructor ) {
        return clone(source.constructor.prototype);
      } else {
        return {};
      }
    },

    populate: function(deepCopy, source, result) {
      for ( var key in source ) {
        if ( source.hasOwnProperty(key) ) {
          result[key] = deepCopy(source[key]);
        }
      }
      return result;
    }
  });

  // Array copier
  deepCopy.register({
    canCopy: function(source) {
      return ( source instanceof Array );
    },

    create: function(source) {
      return new source.constructor();
    },

    populate: function(deepCopy, source, result) {
      for ( var i=0; i<source.length; i++) {
        result.push( deepCopy(source[i]) );
      }
      return result;
    }
  });

  // Date copier
  deepCopy.register({
    canCopy: function(source) {
      return ( source instanceof Date );
    },

    create: function(source) {
      return new Date(source);
    }
  });

  // RegExp copier
  deepCopy.register({
    canCopy: function(source) {
      return ( source instanceof RegExp );
    },

    create: function(source) {
      return source;
    }
  });

  return {
    DeepCopyAlgorithm: DeepCopyAlgorithm,
    copy: copy,
    clone: clone,
    deepCopy: deepCopy
  };
})();