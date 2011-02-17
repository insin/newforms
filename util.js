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
        v(value)
    else if (isFunction(v.__call__))
        v.__call__(value);
}

/**
 * Updates an object's properties with other objects' properties.
 *
 * @param {Object} destination the object to be updated.
 * @param {Object} [source] all further arguments will have their properties
 *                          copied to the <code>destination</code> object in the
 *                          order given.
 *
 * @return the <code>destination</code> object.
 */
function extend(destination)
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
        /**
         * A replacement function which looks up replacements for a named
         * placeholder.
         *
         * See http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:String:replace#Specifying_a_function_as_a_parameter
         *
         * @param {String} s the matched substring to be replaced.
         * @param {String} name the name of a placeholder.
         *
         * @return the replacement for the placeholder with the given name.
         */
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
function ErrorObject()
{
}

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
    for (var name in this)
        if (this.hasOwnProperty(name))
            return true;
    return false;
};

/**
 * Displays error details as a list.
 */
ErrorObject.prototype.asUL = function()
{
    var items = [];
    for (var name in this)
        if (this.hasOwnProperty(name))
            items.push(DOMBuilder.createElement("li", {}, [name, this[name].asUL()]));

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
    for (var name in this)
    {
        if (this.hasOwnProperty(name))
        {
            items.push("* " + name);
            var errorList = this[name];
            for (var i = 0, l = errorList.errors.length; i < l; i++)
            {
                items.push("  * " + errorList.errors[i]);
            }
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
    if (errors instanceof ErrorList)
        console.log("Got error list!");
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
    var items = [];
    for (var i = 0, l = this.errors.length; i < l; i++)
        items.push(DOMBuilder.createElement("li", {}, [this.errors[i]]));
    return DOMBuilder.createElement("ul", {"class": "errorlist"}, items);
};

/**
 * Displays errors as text.
 */
ErrorList.prototype.asText = function()
{
    var items = [];
    for (var i = 0, l = this.errors.length; i < l; i++)
        items.push( "* " + this.errors[i]);
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
 * A validation error.
 */
function ValidationError(message, kwargs)
{
    kwargs = extend({code: null, params: null}, kwargs || {});
    if (isArray(message))
    {
        this.messages = new ErrorList(message);
    }
    else
    {
        this.code = kwargs.code;
        this.params = kwargs.params;
        this.messages = new ErrorList([message]);
    }
}

// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

function parseUri (str) {
    var o   = parseUri.options,
        m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i   = 14;

    while (i--) uri[o.key[i]] = m[i] || "";

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
    });

    return uri;
};

parseUri.options = {
    strictMode: false,
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q:   {
        name:   "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
};

/*
 * Copyright (c) 2010 Nick Galbreath
 * http://code.google.com/p/stringencoders/source/browse/#svn/trunk/javascript
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
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
        o.port = parseInt(parts[4],10) || '';
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

    o.path =  parts[1] || '';
    o.query = parts[2] || '';

    if (allow_fragments) {
        o.fragment = parts[3] || '';
    } else {
        o.fragment = '';
    }

    return o;
}

urlparse.urlunsplit = function(o) {
    var s = '';
    if (o.scheme) {
        s += o.scheme + '://';
    }

    if (o.netloc) {
        if (s == '') {
            s += '//';
        }
        s +=  o.netloc;
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
}

/*
 * From http://stackoverflow.com/questions/183485/can-anyone-recommend-a-good-free-javascript-for-punycode-to-unicode-conversion
 * Javascript Punycode converter derived from example in RFC3492.
 * This implementation is created by some@domain.name and released into public domain.
 *
 * Disclaimer and license
 *
 * Regarding this entire document or any portion of it (including the
 * pseudocode and C code), the author makes no guarantees and is not
 * responsible for any damage resulting from its use. The author grants
 * irrevocable permission to anyone to use, modify, and distribute it in
 * any way that does not diminish the rights of anyone else to use,
 * modify, and distribute it, provided that redistributed derivative works do not contain misleading author or version information. Derivative works need not be licensed under similar terms.
 */
var punycode = new function Punycode() {
    // This object converts to and from puny-code used in IDN
    //
    // punycode.ToASCII ( domain )
    //
    // Returns a puny coded representation of "domain".
    // It only converts the part of the domain name that
    // has non ASCII characters. I.e. it dosent matter if
    // you call it with a domain that already is in ASCII.
    //
    // punycode.ToUnicode (domain)
    //
    // Converts a puny-coded domain name to unicode.
    // It only converts the puny-coded parts of the domain name.
    // I.e. it dosent matter if you call it on a string
    // that already has been converted to unicode.
    //
    //
    this.utf16 = {
        // The utf16-class is necessary to convert from javascripts internal character representation to unicode and back.
        decode:function(input){
            var output = [], i=0, len=input.length,value,extra;
            while (i < len) {
                value = input.charCodeAt(i++);
                if ((value & 0xF800) === 0xD800) {
                    extra = input.charCodeAt(i++);
                    if ( ((value & 0xFC00) !== 0xD800) || ((extra & 0xFC00) !== 0xDC00) ) {
                        throw new RangeError("UTF-16(decode): Illegal UTF-16 sequence");
                    }
                    value = ((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;
                }
                output.push(value);
            }
            return output;
        },
        encode:function(input){
            var output = [], i=0, len=input.length,value;
            while (i < len) {
                value = input[i++];
                if ( (value & 0xF800) === 0xD800 ) {
                    throw new RangeError("UTF-16(encode): Illegal UTF-16 value");
                }
                if (value > 0xFFFF) {
                    value -= 0x10000;
                    output.push(String.fromCharCode(((value >>>10) & 0x3FF) | 0xD800));
                    value = 0xDC00 | (value & 0x3FF);
                }
                output.push(String.fromCharCode(value));
            }
            return output.join("");
        }
    }

    //Default parameters
    var initial_n = 0x80;
    var initial_bias = 72;
    var delimiter = "\x2D";
    var base = 36;
    var damp = 700;
    var tmin=1;
    var tmax=26;
    var skew=38;
    var maxint = 0x7FFFFFFF;

    // decode_digit(cp) returns the numeric value of a basic code
    // point (for use in representing integers) in the range 0 to
    // base-1, or base if cp is does not represent a value.

    function decode_digit(cp) {
        return cp - 48 < 10 ? cp - 22 : cp - 65 < 26 ? cp - 65 : cp - 97 < 26 ? cp - 97 : base;
    }

    // encode_digit(d,flag) returns the basic code point whose value
    // (when used for representing integers) is d, which needs to be in
    // the range 0 to base-1. The lowercase form is used unless flag is
    // nonzero, in which case the uppercase form is used. The behavior
    // is undefined if flag is nonzero and digit d has no uppercase form.

    function encode_digit(d, flag) {
        return d + 22 + 75 * (d < 26) - ((flag != 0) << 5);
        //  0..25 map to ASCII a..z or A..Z
        // 26..35 map to ASCII 0..9
    }
    //** Bias adaptation function **
    function adapt(delta, numpoints, firsttime ) {
        var k;
        delta = firsttime ? Math.floor(delta / damp) : (delta >> 1);
        delta += Math.floor(delta / numpoints);

        for (k = 0; delta > (((base - tmin) * tmax) >> 1); k += base) {
                delta = Math.floor(delta / ( base - tmin ));
        }
        return Math.floor(k + (base - tmin + 1) * delta / (delta + skew));
    }

    // encode_basic(bcp,flag) forces a basic code point to lowercase if flag is zero,
    // uppercase if flag is nonzero, and returns the resulting code point.
    // The code point is unchanged if it is caseless.
    // The behavior is undefined if bcp is not a basic code point.

    function encode_basic(bcp, flag) {
        bcp -= (bcp - 97 < 26) << 5;
        return bcp + ((!flag && (bcp - 65 < 26)) << 5);
    }

    // Main decode
    this.decode=function(input,preserveCase) {
        // Dont use utf16
        var output=[];
        var case_flags=[];
        var input_length = input.length;

        var n, out, i, bias, basic, j, ic, oldi, w, k, digit, t, len;

        // Initialize the state:

        n = initial_n;
        i = 0;
        bias = initial_bias;

        // Handle the basic code points: Let basic be the number of input code
        // points before the last delimiter, or 0 if there is none, then
        // copy the first basic code points to the output.

        basic = input.lastIndexOf(delimiter);
        if (basic < 0) basic = 0;

        for (j = 0; j < basic; ++j) {
            if(preserveCase) case_flags[output.length] = ( input.charCodeAt(j) -65 < 26);
            if ( input.charCodeAt(j) >= 0x80) {
                throw new RangeError("Illegal input >= 0x80");
            }
            output.push( input.charCodeAt(j) );
        }

        // Main decoding loop: Start just after the last delimiter if any
        // basic code points were copied; start at the beginning otherwise.

        for (ic = basic > 0 ? basic + 1 : 0; ic < input_length; ) {

            // ic is the index of the next character to be consumed,

            // Decode a generalized variable-length integer into delta,
            // which gets added to i. The overflow checking is easier
            // if we increase i as we go, then subtract off its starting
            // value at the end to obtain delta.
            for (oldi = i, w = 1, k = base; ; k += base) {
                    if (ic >= input_length) {
                        throw RangeError ("punycode_bad_input(1)");
                    }
                    digit = decode_digit(input.charCodeAt(ic++));

                    if (digit >= base) {
                        throw RangeError("punycode_bad_input(2)");
                    }
                    if (digit > Math.floor((maxint - i) / w)) {
                        throw RangeError ("punycode_overflow(1)");
                    }
                    i += digit * w;
                    t = k <= bias ? tmin : k >= bias + tmax ? tmax : k - bias;
                    if (digit < t) { break; }
                    if (w > Math.floor(maxint / (base - t))) {
                        throw RangeError("punycode_overflow(2)");
                    }
                    w *= (base - t);
            }

            out = output.length + 1;
            bias = adapt(i - oldi, out, oldi === 0);

            // i was supposed to wrap around from out to 0,
            // incrementing n each time, so we'll fix that now:
            if ( Math.floor(i / out) > maxint - n) {
                throw RangeError("punycode_overflow(3)");
            }
            n += Math.floor( i / out ) ;
            i %= out;

            // Insert n at position i of the output:
            // Case of last character determines uppercase flag:
            if (preserveCase) { case_flags.splice(i, 0, input.charCodeAt(ic -1) -65 < 26);}

            output.splice(i, 0, n);
            i++;
        }
        if (preserveCase) {
            for (i = 0, len = output.length; i < len; i++) {
                if (case_flags[i]) {
                    output[i] = (String.fromCharCode(output[i]).toUpperCase()).charCodeAt(0);
                }
            }
        }
        return this.utf16.encode(output);
    };

    //** Main encode function **

    this.encode = function (input,preserveCase) {
        //** Bias adaptation function **

        var n, delta, h, b, bias, j, m, q, k, t, ijv, case_flags;

        if (preserveCase) {
            // Preserve case, step1 of 2: Get a list of the unaltered string
            case_flags = this.utf16.decode(input);
        }
        // Converts the input in UTF-16 to Unicode
        input = this.utf16.decode(input.toLowerCase());

        var input_length = input.length; // Cache the length

        if (preserveCase) {
            // Preserve case, step2 of 2: Modify the list to true/false
            for (j=0; j < input_length; j++) {
                case_flags[j] = input[j] != case_flags[j];
            }
        }

        var output=[];


        // Initialize the state:
        n = initial_n;
        delta = 0;
        bias = initial_bias;

        // Handle the basic code points:
        for (j = 0; j < input_length; ++j) {
            if ( input[j] < 0x80) {
                output.push(
                    String.fromCharCode(
                        case_flags ? encode_basic(input[j], case_flags[j]) : input[j]
                    )
                );
            }
        }

        h = b = output.length;

        // h is the number of code points that have been handled, b is the
        // number of basic code points

        if (b > 0) output.push(delimiter);

        // Main encoding loop:
        //
        while (h < input_length) {
            // All non-basic code points < n have been
            // handled already. Find the next larger one:

            for (m = maxint, j = 0; j < input_length; ++j) {
                ijv = input[j];
                if (ijv >= n && ijv < m) m = ijv;
            }

            // Increase delta enough to advance the decoder's
            // <n,i> state to <m,0>, but guard against overflow:

            if (m - n > Math.floor((maxint - delta) / (h + 1))) {
                throw RangeError("punycode_overflow (1)");
            }
            delta += (m - n) * (h + 1);
            n = m;

            for (j = 0; j < input_length; ++j) {
                ijv = input[j];

                if (ijv < n ) {
                    if (++delta > maxint) return Error("punycode_overflow(2)");
                }

                if (ijv == n) {
                    // Represent delta as a generalized variable-length integer:
                    for (q = delta, k = base; ; k += base) {
                        t = k <= bias ? tmin : k >= bias + tmax ? tmax : k - bias;
                        if (q < t) break;
                        output.push( String.fromCharCode(encode_digit(t + (q - t) % (base - t), 0)) );
                        q = Math.floor( (q - t) / (base - t) );
                    }
                    output.push( String.fromCharCode(encode_digit(q, preserveCase && case_flags[j] ? 1:0 )));
                    bias = adapt(delta, h + 1, h == b);
                    delta = 0;
                    ++h;
                }
            }

            ++delta, ++n;
        }
        return output.join("");
    }

    this.ToASCII = function ( domain ) {
        var domain_array = domain.split(".");
        var out = [];
        for (var i=0; i < domain_array.length; ++i) {
            var s = domain_array[i];
            out.push(
                s.match(/[^A-Za-z0-9-]/) ?
                "xn--" + punycode.encode(s) :
                s
            );
        }
        return out.join(".");
    }
    this.ToUnicode = function ( domain ) {
        var domain_array = domain.split(".");
        var out = [];
        for (var i=0; i < domain_array.length; ++i) {
            var s = domain_array[i];
            out.push(
                s.match(/^xn--/) ?
                punycode.decode(s.slice(4)) :
                s
            );
        }
        return out.join(".");
    }
}();
