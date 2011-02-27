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
