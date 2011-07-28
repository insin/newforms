(function(__global__, undefined) {

// Pull in dependencies appropriately depending on the execution environment
var modules = !!(typeof module !== 'undefined' && module.exports)
  , DOMBuilder = modules ? require('DOMBuilder') : __global__.DOMBuilder;

var time = (function() {
  /**
   * Maps directive codes to regular expression patterns which will capture the
   * data the directive corresponds to, or in the case of locale-dependent
   * directives, a function which takes a locale and generates a regular
   * expression pattern.
   */
var parserDirectives = {
      // Locale's abbreviated month name
      'b': function(l) { return '(' + l.b.join('|') + ')'; }
      // Locale's full month name
    , 'B': function(l) { return '(' + l.B.join('|') + ')'; }
      // Locale's equivalent of either AM or PM.
    , 'p': function(l) { return '(' + l.AM + '|' + l.PM + ')'; }
    , 'd': '(\\d\\d?)' // Day of the month as a decimal number [01,31]
    , 'H': '(\\d\\d?)' // Hour (24-hour clock) as a decimal number [00,23]
    , 'I': '(\\d\\d?)' // Hour (12-hour clock) as a decimal number [01,12]
    , 'm': '(\\d\\d?)' // Month as a decimal number [01,12]
    , 'M': '(\\d\\d?)' // Minute as a decimal number [00,59]
    , 'S': '(\\d\\d?)' // Second as a decimal number [00,59]
    , 'y': '(\\d\\d?)' // Year without century as a decimal number [00,99]
    , 'Y': '(\\d{4})'  // Year with century as a decimal number
    , '%': '%'         // A literal '%' character
    }
  /**
   * Maps directive codes to functions which take the date to be formatted and
   * locale details (if required), returning an appropriate formatted value.
   */
  , formatterDirectives = {
      'a': function(d, l) { return l.a[d.getDay()]; }
    , 'A': function(d, l) { return l.A[d.getDay()]; }
    , 'b': function(d, l) { return l.b[d.getMonth()]; }
    , 'B': function(d, l) { return l.B[d.getMonth()]; }
    , 'd': function(d) { return pad(d.getDate(), 2); }
    , 'H': function(d) { return pad(d.getHours(), 2); }
    , 'M': function(d) { return pad(d.getMinutes(), 2); }
    , 'm': function(d) { return pad(d.getMonth() + 1, 2); }
    , 'S': function(d) { return pad(d.getSeconds(), 2); }
    , 'w': function(d) { return d.getDay(); }
    , 'Y': function(d) { return d.getFullYear(); }
    , '%': function(d) { return '%'; }
    }
  /** Test for hanging percentage symbols. */
  , strftimeFormatCheck = /[^%]%$/;

function isFunction(o) {
  return (Object.prototype.toString.call(o) == '[object Function]');
}

/**
 * Pads a number with a leading zero if necessary.
 */
function pad(number) {
  return (number < 10 ? '0' + number : number);
}

/**
 * Returns the index of item in list, or -1 if it's not in list.
 */
function indexOf(item, list) {
  for (var i = 0, l = list.length; i < l; i++) {
    if (item === list[i]) {
      return i;
    }
  }
  return -1;
}

/**
 * A partial implementation of strptime which parses time details from a string,
 * based on a format string.
 *
 * This implementation largely takes its cue from the documentation for Python's
 * time module, as documented at http://docs.python.org/lib/module-time.html;
 * with the exception of seconds formatting, which is restricted to the range
 * [00,59] rather than [00,61].
 *
 * Supported formatting directives are:
 * <table>
 * <thead>
 *   <tr>
 *     <th>Directive</th>
 *     <th>Meaning</th>
 *   </tr>
 * </thead>
 * <tbody>
 *   <tr>
 *     <td><code>%b</code></td>
 *     <td>Locale's abbreviated month name.</td>
 *   </tr>
 *   <tr>
 *     <td><code>%B</code></td>
 *     <td>Locale's full month name.</td>
 *   </tr>
 *   <tr>
 *     <td><code>%d</code></td>
 *     <td>Day of the month as a decimal number [01,31].</td>
 *   </tr>
 *   <tr>
 *     <td><code>%H</code></td>
 *     <td>Hour (24-hour clock) as a decimal number [00,23].</td>
 *   </tr>
 *   <tr>
 *     <td><code>%I</code></td>
 *     <td>Hour (12-hour clock) as a decimal number [00,12].</td>
 *   </tr>
 *   <tr>
 *     <td><code>%m</code></td>
 *     <td>Month as a decimal number [01,12].</td>
 *   </tr>
 *   <tr>
 *     <td><code>%M</code></td>
 *     <td>Minute as a decimal number [00,59].</td>
 *   </tr>
 *   <tr>
 *     <td><code>%p</code></td>
 *     <td>
 *       Locale's equivalent of either AM or PM (only affects the output hour
 *       field if the <code>%I</code> directive is used to parse the hour).
 *     </td>
 *   </tr>
 *   <tr>
 *     <td><code>%S</code></td>
 *     <td>Second as a decimal number [00,59].</td>
 *   </tr>
 *   <tr>
 *     <td><code>%y</code></td>
 *     <td>Year without century as a decimal number [00,99].</td>
 *   </tr>
 *   <tr>
 *     <td><code>%Y</code></td>
 *     <td>Year with century as a decimal number.</td>
 *   </tr>
 *   <tr>
 *     <td><code>%%</code></td>
 *     <td>A literal <code>%</code> character.</td>
 *   </tr>
 * </tbody>
 * </table>
 *
 * @param {String} format a string specifying formatting directives.
 * @param {Object} locale the locale object to be used to create this parser.
 */
function TimeParser(format, locale) {
  this.format = format;
  this.locale = locale;
  var cachedPattern = TimeParser._cache[locale.name + '|' + format];
  if (cachedPattern !== undefined) {
    this.re = cachedPattern[0];
    this.matchOrder = cachedPattern[1];
  }
  else {
    this.compilePattern();
  }
}

/**
 * Cache RegExps and match orders generated per locale/format string combo.
 */
TimeParser._cache = {};

TimeParser.prototype.compilePattern = function() {
  // Normalise whitespace before further processing
  var format = this.format.split(/(?:\s|\t|\n)+/).join(' ')
    , pattern = []
    , matchOrder = []
    , c
    , directive;

  for (var i = 0, l = format.length; i < l; i++) {
    c = format.charAt(i);
    if (c != '%') {
      if (c === ' ') {
        pattern.push(' +');
      }
      else {
        pattern.push(c);
      }
      continue;
    }

    if (i == l - 1) {
      throw new Error('strptime format ends with raw %');
    }

    c = format.charAt(++i);
    directive = parserDirectives[c];
    if (directive === undefined) {
      throw new Error('strptime format contains an unknown directive: %' + c);
    }
    else if (isFunction(directive)) {
      pattern.push(directive(this.locale));
    }
    else {
      pattern.push(directive);
    }

    if (c != '%') {
       matchOrder.push(c);
    }
  }

  this.re = new RegExp('^' + pattern.join('') + '$');
  this.matchOrder = matchOrder;
  TimeParser._cache[this.locale.name + '|' + this.format] = [this.re, matchOrder];
};

/**
 * Attempts to extract date and time details from the given input.
 *
 * Time fields in this method's result are as follows:
 * <table>
 * <thead>
 *   <tr>
 *     <th>Index</th>
 *     <th>Represents</th>
 *     <th>Values</th>
 *   </tr>
 * </thead>
 * <tbody>
 *   <tr>
 *     <td><code>0</code></td>
 *     <td>Year</td>
 *     <td>(for example, 1993)</td>
 *   </tr>
 *   <tr>
 *     <td><code>1</code></td>
 *     <td>Month</td>
 *     <td>range [1,12]</td>
 *   </tr>
 *   <tr>
 *     <td><code>2</code></td>
 *     <td>Day</td>
 *     <td>range [1,31]</td>
 *   </tr>
 *   <tr>
 *     <td><code>3</code></td>
 *     <td>Hour</td>
 *     <td>range [0,23]</td>
 *   </tr>
 *   <tr>
 *     <td><code>4</code></td>
 *     <td>Minute</td>
 *     <td>range [0,59]</td>
 *   </tr>
 *   <tr>
 *     <td><code>5</code></td>
 *     <td>Second</td>
 *     <td>range [0,59]</td>
 *   </tr>
 *   <tr>
 *     <td><code>6</code></td>
 *     <td>Day of week (not implemented - always <code>0</code>)</td>
 *     <td>range [0,6], Monday is 0</td>
 *   </tr>
 *   <tr>
 *     <td><code>7</code></td>
 *     <td>Day of year (not implemented - always <code>1</code>)</td>
 *     <td>range [1,366]</td>
 *   </tr>
 *   <tr>
 *     <td><code>8</code></td>
 *     <td>Daylight savings flag (not implemented - always <code>-1</code>)</td>
 *     <td>0, 1 or -1</td>
 *   </tr>
 * </tbody>
 * </table>
 *
 * @param {String} input the time string to be parsed.
 *
 * @return a list of 9 integers, each corresponding to a time field.
 */
TimeParser.prototype.parse = function(input) {
  var matches = this.re.exec(input);
  if (matches === null) {
    throw new Error('Time data did not match format: data=' + input +
                    ', format=' + this.format);
  }

    // Default values for when more accurate values cannot be inferred
  var time = [1900, 1, 1, 0, 0, 0, 0, 1, -1]
    // Matched time data, keyed by directive code
    , data = {};

  for (var i = 1, l = matches.length; i < l; i++) {
    data[this.matchOrder[i - 1]] = matches[i];
  }

  // Extract year
  if ('Y' in data) {
    time[0] = parseInt(data.Y, 10);
  }
  else if ('y' in data) {
    var year = parseInt(data.y, 10);
    if (year < 68) {
        year = 2000 + year;
    }
    else if (year < 100) {
        year = 1900 + year;
    }
    time[0] = year;
  }

  // Extract month
  if ('m' in data) {
    var month = parseInt(data.m, 10);
    if (month < 1 || month > 12) {
      throw new Error('Month is out of range: ' + month);
    }
    time[1] = month;
  }
  else if ('B' in data) {
    time[1] = indexOf(data.B, this.locale.B) + 1;
  }
  else if ('b' in data) {
    time[1] = indexOf(data.b, this.locale.b) + 1;
  }

  // Extract day of month
  if ('d' in data) {
    var day = parseInt(data.d, 10);
    if (day < 1 || day > 31) {
      throw new Error('Day is out of range: ' + day);
    }
    time[2] = day;
  }

  // Extract hour
  if ('H' in data) {
    var hour = parseInt(data.H, 10);
    if (hour > 23) {
      throw new Error('Hour is out of range: ' + hour);
    }
    time[3] = hour;
  }
  else if ('I' in data) {
    var hour = parseInt(data.I, 10);
    if (hour < 1 || hour > 12) {
      throw new Error('Hour is out of range: ' + hour);
    }

    // If we don't get any more information, we'll assume this time is
    // a.m. - 12 a.m. is midnight.
    if (hour == 12) {
        hour = 0;
    }

    time[3] = hour;

    if ('p' in data) {
      if (data.p == this.locale.PM) {
        // We've already handled the midnight special case, so it's
        // safe to bump the time by 12 hours without further checks.
        time[3] = time[3] + 12;
      }
    }
  }

  // Extract minute
  if ('M' in data) {
    var minute = parseInt(data.M, 10);
    if (minute > 59) {
        throw new Error('Minute is out of range: ' + minute);
    }
    time[4] = minute;
  }

  // Extract seconds
  if ('S' in data) {
    var second = parseInt(data.S, 10);
    if (second > 59) {
      throw new Error('Second is out of range: ' + second);
    }
    time[5] = second;
  }

  // Validate day of month
  var day = time[2], month = time[1], year = time[0];
  if (((month == 4 || month == 6 || month == 9 || month == 11) &&
      day > 30) ||
      (month == 2 && day > ((year % 4 == 0 && year % 100 != 0 ||
                             year % 400 == 0) ? 29 : 28))) {
    throw new Error('Day is out of range: ' + day);
  }

  return time;
};

var time = {
  /**
   * Default locale name - must always exist in time.locales.
   */
  defaultLocale: 'en'

  /**
   * Locale details.
   */
, locales: {
    en: {
      name: 'en'
    , a: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    , A: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
          'Friday', 'Saturday']
    , AM: 'AM'
    , b: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
          'Oct', 'Nov', 'Dec']
    , B: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December']
    , PM: 'PM'
    }
  }

  /**
   * Retrieves the locale with the given name, falling back to just the
   * language code finally to the default locale if a locale can't be found;
   * retrieves the default locale when called without arguments
   *
   * Locale names can consist of a language code (e.g. 'en') or a language
   * and region code (e.g. 'en-GB').
   */
, getLocale: function(code) {
    if (code) {
      if (code in this.locales) {
        return this.locales[code];
      }
      else if (code.length > 2) {
        // If we appear to have more than a language code, try the
        // language code on its own.
        var languageCode = code.substring(0, 2);
        if (languageCode in this.locales) {
          return this.locales[languageCode];
        }
      }
    }
    return this.locales[this.defaultLocale];
  }

  /**
   * Parses time details from a string, based on a format string.
   *
   * @param {String} input the time string to be parsed.
   * @param {String} format the format to attempt to parse - see
   *                        {@link TimeParser} for further details.
   * @param {String} [locale] a locale name.
   *
   * @return a list of 9 integers, each corresponding to a time field - see
   *         {@link TimeParser#parse()} for further details.
   */
, strptime: function(input, format, locale) {
    return new TimeParser(format, this.getLocale(locale)).parse(input);
  }

  /**
   * Convenience wrapper around time.strptime which returns a JavaScript Date.
   */
, strpdate: function(input, format, locale) {
    var t = this.strptime(input, format, locale);
    return new Date(t[0], t[1] - 1, t[2], t[3], t[4], t[5]);
  }

  /**
   * A partial implementation of <code>strftime</code>, which formats a date
   * according to a format string. An Error will be thrown if an invalid
   * format string is given.
   *
   * Supported formatting directives are:
   * <table>
   * <thead>
   *   <tr>
   *     <th>Directive</th>
   *     <th>Meaning</th>
   *   </tr>
   * </thead>
   * <tbody>
   *   <tr>
   *     <td><code>%a</code></td>
   *     <td>Locale's abbreviated weekday name.</td>
   *   </tr>
   *   <tr>
   *     <td><code>%A</code></td>
   *     <td>Locale's full weekday name.</td>
   *   </tr>
   *   <tr>
   *     <td><code>%b</code></td>
   *     <td>Locale's abbreviated month name.</td>
   *   </tr>
   *   <tr>
   *     <td><code>%B</code></td>
   *     <td>Locale's full month name.</td>
   *   </tr>
   *   <tr>
   *     <td><code>%d</code></td>
   *     <td>Day of the month as a decimal number [01,31].</td>
   *   </tr>
   *   <tr>
   *     <td><code>%H</code></td>
   *     <td>Hour (24-hour clock) as a decimal number [00,23].</td>
   *   </tr>
   *   <tr>
   *     <td><code>%m</code></td>
   *     <td>Month as a decimal number [01,12].</td>
   *   </tr>
   *   <tr>
   *     <td><code>%M</code></td>
   *     <td>Minute as a decimal number [00,59].</td>
   *   </tr>
   *   <tr>
   *     <td><code>%S</code></td>
   *     <td>Second as a decimal number [00,59].</td>
   *   </tr>
   *   <tr>
   *     <td><code>%w</code></td>
   *     <td>Weekday as a decimal number [0(Sunday),6].</td>
   *   </tr>
   *   <tr>
   *     <td><code>%Y</code></td>
   *     <td>Year with century as a decimal number.</td>
   *   </tr>
   *   <tr>
   *     <td><code>%%</code></td>
   *     <td>A literal <code>%</code> character.</td>
   *   </tr>
   * </tbody>
   * </table>
   *
   * @param {Date} date the date to be formatted.
   * @param {String} format a string specifying how the date should be
   *                        formatted.
   * @param {String} [locale] a locale name - if not supplied, the default
   *                          locale will be used.
   *
   * @return a formatted version of the given date.
   */
, strftime: function(date, format, locale)
  {
    if (strftimeFormatCheck.test(format)) {
      throw new Error('strftime format ends with raw %');
    }
    locale = this.getLocale(locale);
    return format.replace(/(%.)/g, function(s, f) {
      var code = f.charAt(1);
      if (typeof formatterDirectives[code] == 'undefined') {
        throw new Error('strftime format contains an unknown directive: ' + f);
      }
      return formatterDirectives[code](date, locale);
    });
  }
};

return time;

})();

var toString = Object.prototype.toString;

function isArray(o) {
  return (toString.call(o) == '[object Array]');
}

function isFunction(o) {
  return (toString.call(o) == '[object Function]');
}

function isNumber(o) {
  return (toString.call(o) == '[object Number]');
}

function isObject(o) {
  return (toString.call(o) == '[object Object]');
}

function isString(o) {
  return (toString.call(o) == '[object String]');
}

function isCallable(o) {
  return (isFunction(o) || isFunction(o.__call__));
}

function callValidator(v, value) {
  if (isFunction(v)) {
    v(value);
  }
  else if (isFunction(v.__call__)) {
    v.__call__(value);
  }
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
function extend(destination, var_args) {
  for (var i = 1, l = arguments.length; i < l; i++) {
    var source = arguments[i];
    for (var property in source) {
      if (source.hasOwnProperty(property)) {
        destination[property] = source[property];
      }
    }
  }
  return destination;
}

/**
 * Creates a list of [name, value] pairs from an object's properties.
 */
function objectItems(obj) {
  var result = [];
  for (var name in obj) {
    if (obj.hasOwnProperty(name)) {
      result.push([name, obj[name]]);
    }
  }
  return result;
}

/**
 * Creates an object from a list of [name, value] pairs.
 */
function itemsToObject(items) {
  var obj = {};
  for (var i = 0, l = items.length; i < l; i++) {
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
function inheritFrom(child, parent) {
  function F() {};
  F.prototype = parent.prototype;
  child.prototype = new F();
  child.prototype.constructor = child;
}

/**
 * Creates a lookup object from an array, casting each item to a string.
 */
function createLookup(a) {
  var obj = {};
  for (var i = 0, l = a.length; i < l; i++) {
    obj[''+a[i]] = true;
  }
  return obj;
}

/**
 * Converts 'firstName' and 'first_name' to 'First name', and
 * 'SHOUTING_LIKE_THIS' to 'SHOUTING LIKE THIS'.
 */
var prettyName = (function() {
  var capsRE = /([A-Z]+)/g
    , splitRE = /[ _]+/
    , trimRE = /(^ +| +$)/g
    , allCapsRE = /^[A-Z][A-Z0-9]+$/;

  return function(name) {
    // Prefix sequences of caps with spaces and split on all space
    // characters.
    var parts = name.replace(capsRE, ' $1').split(splitRE);

    // If we had an initial cap...
    if (parts[0] === '') {
      parts.splice(0, 1);
    }

    // Give the first word an initial cap and all subsequent words an
    // initial lowercase if not all caps.
    for (var i = 0, l = parts.length; i < l; i++) {
      if (i == 0) {
        parts[0] = parts[0].charAt(0).toUpperCase() +
                   parts[0].substr(1);
      }
      else if (!allCapsRE.test(parts[i])) {
        parts[i] = parts[i].charAt(0).toLowerCase() +
                   parts[i].substr(1);
      }
    }

    return parts.join(' ');
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
var format = (function() {
  // Closure for accessing a context object from the replacement function
  var replacer = function(context) {
    return function(s, name) {
      return context[name];
    };
  };

  return function(input, context) {
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
function formData(form) {
  var data = {};
  if (isString(form)) {
    form = document.forms[form] || document.getElementById(form);
  }
  if (!form) {
    return data;
  }

  for (var i = 0, l = form.elements.length; i < l; i++) {
    var element = form.elements[i]
      , type = element.type
      , value = null;

    // Retrieve the element's value (or values)
    if (type == 'hidden' || type == 'password' || type == 'text' ||
        type == 'textarea' || ((type == 'checkbox' ||
                                type == 'radio') && element.checked)) {
      value = element.value;
    }
    else if (type == 'select-one') {
      value = element.options[element.selectedIndex].value;
    }
    else if (type == 'select-multiple') {
      value = [];
      for (var j = 0, m = element.options.length; j < m; j++) {
        if (element.options[j].selected) {
          value[value.length] = element.options[j].value;
        }
      }
      if (value.length == 0) {
        value = null;
      }
    }

    // Add any value obtained to the data object
    if (value !== null) {
      if (data.hasOwnProperty(element.name)) {
        if (isArray(data[element.name])) {
          data[element.name] = data[element.name].concat(value);
        }
        else {
          data[element.name] = [data[element.name], value];
        }
      }
      else {
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
function getDefault(o, prop, defaultValue) {
  if (typeof o[prop] != 'undefined') {
    return o[prop];
  }
  return defaultValue;
}

/**
 * Coerces to string and strips leading and trailing spaces.
 */
function strip(s) {
  return (''+s).replace(/(^\s+|\s+$)/g, '');
}

/**
 * A collection of errors that knows how to display itself in various formats.
 *
 * This object's properties are the field names, and corresponding values are
 * the errors.
 *
 * @constructor
 */
function ErrorObject(errors) {
  if (!(this instanceof ErrorObject)) return new ErrorObject(errors);
  this.errors = errors || {};
}

ErrorObject.prototype.set = function(name, error) {
  this.errors[name] = error;
};

ErrorObject.prototype.get = function(name) {
  return this.errors[name];
};

ErrorObject.prototype.toString = function() {
  return ''+this.defaultRendering();
};

ErrorObject.prototype.defaultRendering = function() {
  return this.asUL();
};

/**
 * Determines if any errors are present.
 *
 * @return {Boolean} <code>true</code> if this object has had any properties
 *                   set, <code>false</code> otherwise.
 */
ErrorObject.prototype.isPopulated = function() {
  for (var name in this.errors) {
    if (this.errors.hasOwnProperty(name)) {
      return true;
    }
  }
  return false;
};

/**
 * Displays error details as a list.
 */
ErrorObject.prototype.asUL = function() {
  var items = [];
  for (var name in this.errors) {
    if (this.errors.hasOwnProperty(name)) {
      items.push(DOMBuilder.createElement('li', {},
                     [name, this.errors[name].defaultRendering()]));
    }
  }
  if (!items.length) {
    return DOMBuilder.fragment();
  }
  return DOMBuilder.createElement('ul', {'class': 'errorlist'}, items);
};

/**
 * Displays error details as text.
 */
ErrorObject.prototype.asText = function() {
  var items = [];
  for (var name in this.errors) {
    if (this.errors.hasOwnProperty(name)) {
      items.push('* ' + name);
      var errorList = this.errors[name];
      for (var i = 0, l = errorList.errors.length; i < l; i++) {
        items.push('  * ' + errorList.errors[i]);
      }
    }
  }
  return items.join('\n');
};

/**
 * A list of errors which knows how to display itself in various formats.
 *
 * @param {Array} [errors] a list of errors.
 * @constructor
 */
function ErrorList(errors) {
  if (!(this instanceof ErrorList)) return new ErrorList(errors);
  this.errors = errors || [];
}

ErrorList.prototype.toString = function() {
  return ''+this.defaultRendering();
};

ErrorList.prototype.defaultRendering = function() {
  return this.asUL();
};

/**
 * Adds errors from another ErrorList.
 *
 * @param {ErrorList} errorList an ErrorList whose errors should be added.
 */
ErrorList.prototype.extend = function(errorList) {
  this.errors = this.errors.concat(errorList.errors);
};

/**
 * Displays errors as a list.
 */
ErrorList.prototype.asUL = function() {
  return DOMBuilder.createElement('ul', {'class': 'errorlist'},
      DOMBuilder.map('li', {}, this.errors));
};

/**
 * Displays errors as text.
 */
ErrorList.prototype.asText = function() {
  var items = [];
  for (var i = 0, l = this.errors.length; i < l; i++) {
    items.push('* ' + this.errors[i]);
  }
  return items.join('\n');
};

/**
 * Determines if any errors are present.
 *
 * @return {Boolean} <code>true</code> if this object contains any errors
 *                   <code>false</code> otherwise.
 */
ErrorList.prototype.isPopulated = function() {
  return this.errors.length > 0;
};

/**
 * A validation error, containing a list of messages. Single messages
 * (e.g. those produced by validators may have an associated error code
 * and parameters to allow customisation by fields.
 */
function ValidationError(message, kwargs) {
  if (!(this instanceof ValidationError)) return new ValidationError(message, kwargs);
  kwargs = extend({code: null, params: null}, kwargs || {});
  if (isArray(message)) {
    this.messages = message;
  }
  else {
    this.code = kwargs.code;
    this.params = kwargs.params;
    this.messages = [message];
  }
}

ValidationError.prototype.toString = function() {
  return ('ValidationError: ' + this.messages.join('; '));
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
    if (typeof allow_fragments == 'undefined') {
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
    var thisPass = this;
    this.recursiveDeepCopy = function(source) {
      return thisPass.deepCopy(source);
    };
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
  };

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
var EMPTY_VALUES = [null, undefined, '']
  , URL_VALIDATOR_USER_AGENT = 'newforms (https://github.com/insin/newforms/)';

/**
 * Validates that input matches a regular expression.
 */
function RegexValidator(regex, message, code) {
  if (!(this instanceof RegexValidator)) {
    return new RegexValidator(regex, message, code);
  }
  if (regex) {
    this.regex = regex;
  }
  if (message) {
    this.message = message;
  }
  if (code) {
    this.code = code;
  }
  if (isString(this.regex)) {
    this.regex = new RegExp(this.regex);
  }
}
RegexValidator.prototype.regex = '';
RegexValidator.prototype.message = 'Enter a valid value.';
RegexValidator.prototype.code = 'invalid';

RegexValidator.prototype.__call__ = function(value) {
  if (!this.regex.test(value)) {
    throw ValidationError(this.message, {code: this.code});
  }
};

/**
 * Validates that input looks like a valid URL.
 */
function URLValidator(kwargs) {
  if (!(this instanceof URLValidator)) return new URLValidator(kwargs);
  RegexValidator.call(this);
  kwargs = extend({
    verifyExists: false, validatorUserAgent: URL_VALIDATOR_USER_AGENT
  }, kwargs || {});
  this.verifyExists = kwargs.verifyExists;
  this.userAgent = kwargs.validatorUserAgent;
}
inheritFrom(URLValidator, RegexValidator);
URLValidator.prototype.regex = new RegExp(
  // http:// or https://
  '^(?:http|ftp)s?://' +
  // Domain...
  '(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\\.)+' +
      '(?:[A-Z]{2,6}\\.?|[A-Z0-9-]{2,}\\.?)|' +
  // localhost...
  'localhost|' + // localhost...
  // ...or IP
  '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})' +
  // Optional port
  '(?::\\d+)?' +
  '(?:/?|[/?]\\S+)$',
  'i');

URLValidator.prototype.__call__ = function(value) {
  var url = value;
  try {
    RegexValidator.prototype.__call__.call(this, url);
  }
  catch (e) {
    if (!(e instanceof ValidationError) || !value) {
      throw e;
    }
    // TODO Implement retrying validation after IDNA encoding
    throw e;
  }

  // TODO Plug in URL verification when newforms can run on the backend
  //if (this.verifyExists === true) {}
};

function EmailValidator(regex, message, code) {
  if (!(this instanceof EmailValidator)) return new EmailValidator(regex, message, code);
  RegexValidator.call(this, regex, message, code);
}
inheritFrom(EmailValidator, RegexValidator);

EmailValidator.prototype.__call__ = function(value) {
  try {
    RegexValidator.prototype.__call__.call(this, value);
  }
  catch (e) {
    if (!(e instanceof ValidationError) ||
        !value ||
        value.indexOf("@") == -1) {
      throw e;
    }
    // TODO Implement retrying validation after IDNA encoding
    throw e;
  }
};

var EMAIL_RE = new RegExp(
    // Dot-atom
    "(^[-!#$%&'*+/=?^_`{}|~0-9A-Z]+(\\.[-!#$%&'*+/=?^_`{}|~0-9A-Z]+)*" +
     // Quoted-string
    '|^"([\\001-\\010\\013\\014\\016-\\037!#-\\[\\]-\\177]|\\\\[\\001-011\\013\\014\\016-\\177])*"' +
    // Domain
    ')@((?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\\.)+[A-Z]{2,6}\\.?$)' +
    // Literal form, ipv4 address (SMTP 4.1.3)
    '|\\[(25[0-5]|2[0-4]\\d|[0-1]?\\d?\\d)(\\.(25[0-5]|2[0-4]\\d|[0-1]?\\d?\\d)){3}\\]$',
    // Ignore case
    'i')
  /** Validates that input looks like a valid e-mail address. */
  , validateEmail = EmailValidator(EMAIL_RE,
                                   'Enter a valid e-mail address.',
                                   'invalid')
  , SLUG_RE = /^[-\w]+$/
  /** Validates that input is a valid slug. */
  , validateSlug = RegexValidator(SLUG_RE,
      'Enter a valid "slug" consisting of letters, numbers, underscores or hyphens.',
      'invalid')
  , IPV4_RE = /^(25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3}$/
  /** Validates that input is a valid IPv4 address. */
  , validateIPV4Address = RegexValidator(IPV4_RE,
                                         'Enter a valid IPv4 address.',
                                         'invalid')
  , COMMA_SEPARATED_INT_LIST_RE = /^[\d,]+$/
  /** Validates that input is a comma-separated list of integers. */
  , validateCommaSeparatedIntegerList =
      RegexValidator(COMMA_SEPARATED_INT_LIST_RE,
                     'Enter only digits separated by commas.',
                     'invalid');

/**
 * Base for validators which compare input against a given value.
 */
function BaseValidator(limitValue) {
  if (!(this instanceof BaseValidator)) return new BaseValidator(limitValue);
  this.limitValue = limitValue;
}
extend(BaseValidator.prototype, {
  compare: function(a, b) { return a !== b; }
, clean: function(x) { return x; }
, message: 'Ensure this value is %(limitValue)s (it is %(showValue)s).'
, code: 'limitValue'
});

BaseValidator.prototype.__call__ = function(value) {
  var cleaned = this.clean(value)
    , params = {limitValue: this.limitValue, showValue: cleaned};
  if (this.compare(cleaned, this.limitValue)) {
    throw ValidationError(format(this.message, params),
                          {code: this.code, params: params});
  }
};

/**
 * Validates that input is less than or equal to a given value.
 */
function MaxValueValidator(limitValue) {
  if (!(this instanceof MaxValueValidator)) return new MaxValueValidator(limitValue);
  BaseValidator.call(this, limitValue);
}
inheritFrom(MaxValueValidator, BaseValidator);
extend(MaxValueValidator.prototype, {
  compare: function(a, b) { return a > b; }
, message: 'Ensure this value is less than or equal to %(limitValue)s.'
, code: 'maxValue'
});

/**
 * Validates that input is greater than or equal to a given value.
 */
function MinValueValidator(limitValue) {
  if (!(this instanceof MinValueValidator)) return new MinValueValidator(limitValue);
  BaseValidator.call(this, limitValue);
}
inheritFrom(MinValueValidator, BaseValidator);
extend(MinValueValidator.prototype, {
  compare: function(a, b) { return a < b; }
, message: 'Ensure this value is greater than or equal to %(limitValue)s.'
, code: 'minValue'
});

/**
 * Validates that input is at least a given length.
 */
function MinLengthValidator(limitValue) {
  if (!(this instanceof MinLengthValidator)) return new MinLengthValidator(limitValue);
  BaseValidator.call(this, limitValue);
}
inheritFrom(MinLengthValidator, BaseValidator);
extend(MinLengthValidator.prototype, {
  compare: function(a, b) { return a < b; }
, clean: function(x) { return x.length; }
, message: 'Ensure this value has at least %(limitValue)d characters (it has %(showValue)d).'
, code: 'minLength'
});

/**
 * Validates that input is at most a given length;
 */
function MaxLengthValidator(limitValue) {
  if (!(this instanceof MaxLengthValidator)) return new MaxLengthValidator(limitValue);
  BaseValidator.call(this, limitValue);
}
inheritFrom(MaxLengthValidator, BaseValidator);
extend(MaxLengthValidator.prototype, {
  compare: function(a, b) { return a > b; }
, clean: function(x) { return x.length; }
, message: 'Ensure this value has at most %(limitValue)d characters (it has %(showValue)d).'
, code: 'maxLength'
});

/**
 * An HTML form widget.
 *
 * A widget handles the rendering of HTML, and the extraction of data from an
 * object that corresponds to the widget.
 *
 * @param {Object} [kwargs] Configuration options.
 * @config {Object} [attrs] HTML attributes for the rendered widget.
 * @constructor
 */
function Widget(kwargs) {
  kwargs = extend({attrs: null}, kwargs || {});
  this.attrs = extend({}, kwargs.attrs || {});
}
/** Determines whether this corresponds to an &lt;input type="hidden"&gt;. */
Widget.prototype.isHidden = false;
/** Determines whether this widget needs a multipart-encrypted form. */
Widget.prototype.needsMultipartForm = false;
Widget.prototype.isRequired = false;

/**
 * Returns this Widget rendered as HTML.
 *
 * The 'value' given is not guaranteed to be valid input, so subclass
 * implementations should program defensively.
 */
Widget.prototype.render = function(value, kwargs) {
  throw new Error('Widget subclasses must implement a render() method.');
};

/**
 * Helper function for building an attribute dictionary.
 */
Widget.prototype.buildAttrs = function(extraAttrs, kwargs) {
  var attrs = extend({}, this.attrs, kwargs || {}, extraAttrs || {});
  return attrs;
};

/**
 * Retrieves a value for this widget from the given data.
 *
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {String} name the field name to be used to retrieve data.
 *
 * @return a value for this widget, or <code>null</code> if no value was
 *         provided.
 */
Widget.prototype.valueFromData = function(data, files, name) {
  return getDefault(data, name, null);
};

/**
 * Determines if data has changed from initial.
 */
Widget.prototype._hasChanged = function(initial, data) {
  // For purposes of seeing whether something has changed, null is the same
  // as an empty string, if the data or inital value we get is null, replace
  // it with ''.
  var dataValue = (data === null ? '' : data);
  var initialValue = (initial === null ? '' : initial);
  return (''+initialValue != ''+dataValue);
};

/**
 * Determines the HTML <code>id</code> attribute of this Widget for use by a
 * <code>&lt;label&gt;</code>, given the id of the field.
 *
 * This hook is necessary because some widgets have multiple HTML elements and,
 * thus, multiple ids. In that case, this method should return an ID value that
 * corresponds to the first id in the widget's tags.
 *
 * @param {String} id a field id.
 *
 * @return the id which should be used by a <code>&lt;label&gt;</code> for this
 *         Widget.
 */
Widget.prototype.idForLabel = function(id) {
  return id;
};

/**
 * An HTML <code>&lt;input&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Widget}.
 * @constructor
 */
function Input(kwargs) {
  if (!(this instanceof Widget)) return new Input(kwargs);
  Widget.call(this, kwargs);
}
inheritFrom(Input, Widget);
/** The type of this input. */
Input.prototype.inputType = null;

Input.prototype.render = function(name, value, kwargs) {
  kwargs = extend({attrs: null}, kwargs || {});
  if (value === null) {
    value = '';
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: this.inputType,
                                                  name: name});
  if (value !== '') {
    // Only add the value attribute if value is non-empty
    finalAttrs.value = value;
  }
  return DOMBuilder.createElement('input', finalAttrs);
};

/**
 * An HTML <code>&lt;input type="text"&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Input}.
 * @constructor
 */
function TextInput(kwargs) {
  if (!(this instanceof Widget)) return new TextInput(kwargs);
  Input.call(this, kwargs);
}
inheritFrom(TextInput, Input);
TextInput.prototype.inputType = 'text';

/**
 * An HTML <code>&lt;input type="password"&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Input}.
 * @config {Boolean} [renderValue] if <code>false</code> a value will not be
 *                                 rendered for this field - defaults to
 *                                 <code>false</code>.
 * @constructor
 */
function PasswordInput(kwargs) {
  if (!(this instanceof Widget)) return new PasswordInput(kwargs);
  kwargs = extend({renderValue: false}, kwargs || {});
  Input.call(this, kwargs);
  this.renderValue = kwargs.renderValue;
}
inheritFrom(PasswordInput, Input);
PasswordInput.prototype.inputType = 'password';

PasswordInput.prototype.render = function(name, value, kwargs) {
  if (!this.renderValue) {
    value = '';
  }
  return Input.prototype.render.call(this, name, value, kwargs);
};

/**
 * An HTML <code>&lt;input type="hidden"&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Input}.
 * @constructor
 */
function HiddenInput(kwargs) {
  if (!(this instanceof Widget)) return new HiddenInput(kwargs);
  Input.call(this, kwargs);
}
inheritFrom(HiddenInput, Input);
HiddenInput.prototype.inputType = 'hidden';
HiddenInput.prototype.isHidden = true;

/**
 * A widget that handles <code>&lt;input type="hidden"&gt;</code> for fields
 * that have a list of values.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link HiddenInput}.
 * @constructor
 */
function MultipleHiddenInput(kwargs) {
  if (!(this instanceof Widget)) return new MultipleHiddenInput(kwargs);
  HiddenInput.call(this, kwargs);
}
inheritFrom(MultipleHiddenInput, HiddenInput);

MultipleHiddenInput.prototype.render = function(name, value, kwargs) {
  kwargs = extend({attrs: null}, kwargs || {});
  if (value === null) {
    value = [];
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: this.inputType,
                                                  name: name})
    , id = getDefault(finalAttrs, 'id', null)
    , inputs = [];
  for (var i = 0, l = value.length; i < l; i++) {
    var inputAttrs = extend({}, finalAttrs, {value: value[i]});
    if (id) {
      // An ID attribute was given. Add a numeric index as a suffix
      // so that the inputs don't all have the same ID attribute.
      inputAttrs.id = format('%(id)s_%(i)s', {id: id, i: i});
    }
    inputs.push(DOMBuilder.createElement('input', inputAttrs));
  }
  return DOMBuilder.fragment(inputs);
};

MultipleHiddenInput.prototype.valueFromData = function(data, files, name) {
  if (typeof data[name] != 'undefined') {
    return [].concat(data[name]);
  }
  return null;
};

/**
 * An HTML <code>&lt;input type="file"&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Input}.
 * @constructor
 */
function FileInput(kwargs) {
  if (!(this instanceof Widget)) return new FileInput(kwargs);
  Input.call(this, kwargs);
}
inheritFrom(FileInput, Input);
FileInput.prototype.inputType = 'file';
FileInput.prototype.needsMultipartForm = true;

FileInput.prototype.render = function(name, value, kwargs) {
  return Input.prototype.render.call(this, name, null, kwargs);
};

/**
 * File widgets take data from <code>files</code>, not <code>data</code>.
 */
FileInput.prototype.valueFromData = function(data, files, name) {
  return getDefault(files, name, null);
};

FileInput.prototype._hasChanged = function(initial, data) {
  if (data === null) {
    return false;
  }
  return true;
};

var FILE_INPUT_CONTRADICTION = {};

/**
 * @constructor.
 */
function ClearableFileInput(kwargs) {
  if (!(this instanceof Widget)) return new ClearableFileInput(kwargs);
  FileInput.call(this, kwargs);
}
inheritFrom(ClearableFileInput, FileInput);
ClearableFileInput.prototype.initialText = 'Currently';
ClearableFileInput.prototype.inputText = 'Change';
ClearableFileInput.prototype.clearCheckboxLabel = 'Clear';

/**
 * Given the name of the file input, return the name of the clear checkbox
 * input.
 */
ClearableFileInput.prototype.clearCheckboxName = function(name) {
  return name + '-clear';
};

/**
 * Given the name of the clear checkbox input, return the HTML id for it.
 */
ClearableFileInput.prototype.clearCheckboxId = function(name) {
  return name + '_id';
};

ClearableFileInput.prototype.render = function(name, value, kwargs) {
  var input = FileInput.prototype.render.call(this, name, value, kwargs);
  if (value && typeof value.url != 'undefined') {
    var contents = [
      this.initialText, ': '
    , DOMBuilder.createElement('a', {href: value.url}, [''+value]), ' '
    ];
    if (!this.isRequired) {
      var clearCheckboxName = this.clearCheckboxName(name);
      var clearCheckboxId = this.clearCheckboxId(clearCheckboxName);
      contents = contents.concat([
        CheckboxInput().render(
            clearCheckboxName, false, {attrs: {'id': clearCheckboxId}})
      , ' '
      , DOMBuilder.createElement('label', {'for': clearCheckboxId},
                                 [this.clearCheckboxLabel])
      ]);
    }
    contents = contents.concat([
      DOMBuilder.createElement('br')
    , this.inputText, ': '
    , input
    ]);
    return DOMBuilder.fragment(contents);
  }
  else {
      return input;
  }
};

ClearableFileInput.prototype.valueFromData = function(data, files, name) {
  var upload = FileInput.prototype.valueFromData(data, files, name);
  if (!this.isRequired &&
      CheckboxInput().valueFromData(data, files,
                                    this.clearCheckboxName(name))) {
    if (upload) {
      // If the user contradicts themselves (uploads a new file AND
      // checks the "clear" checkbox), we return a unique marker
      // object that FileField will turn into a ValidationError.
      return FILE_INPUT_CONTRADICTION;
    }
    // false signals to clear any existing value, as opposed to just null
    return false;
  }
  return upload;
};

/**
 * An HTML <code>&lt;textarea&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Widget}.
 * @config {Object} [attrs] HTML attributes for the rendered widget. Default
 *                          rows and cols attributes will be used if not
 *                          provided.
 * @constructor
 */
function Textarea(kwargs) {
  if (!(this instanceof Widget)) return new Textarea(kwargs);
  // Ensure we have something in attrs
  kwargs = extend({attrs: null}, kwargs || {});
  // Provide default 'cols' and 'rows' attributes
  kwargs.attrs = extend({rows: '10', cols: '40'}, kwargs.attrs || {});
  Widget.call(this, kwargs);
}
inheritFrom(Textarea, Widget);

Textarea.prototype.render = function(name, value, kwargs) {
  kwargs = extend({attrs: null}, kwargs || {});
  if (value === null) {
    value = '';
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name});
  return DOMBuilder.createElement('textarea', finalAttrs, [value]);
};

/**
 * A <code>&lt;input type="text"&gt;</code> which, if given a <code>Date</code>
 * object to display, formats it as an appropriate date <code>String</code>.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Input}.
 * @config {String} [format] a {@link time.strftime} format string.
 * @constructor
 */
function DateInput(kwargs) {
  if (!(this instanceof Widget)) return new DateInput(kwargs);
  kwargs = extend({format: null}, kwargs || {});
  Input.call(this, kwargs);
  if (kwargs.format !== null) {
    this.format = kwargs.format;
  }
  else {
    this.format = DEFAULT_DATE_INPUT_FORMATS[0];
  }
}
inheritFrom(DateInput, Input);
DateInput.prototype.inputType = 'text';

DateInput.prototype._formatValue = function(value) {
  if (value instanceof Date) {
    return time.strftime(value, this.format);
  }
  return value;
};

DateInput.prototype.render = function(name, value, kwargs) {
  value = this._formatValue(value);
  return Input.prototype.render.call(this, name, value, kwargs);
};

DateInput.prototype._hasChanged = function(initial, data) {
  return Input.prototype._hasChanged.call(this, this._formatValue(initial), data);
};

/**
 * A <code>&lt;input type="text"&gt;</code> which, if given a <code>Date</code>
 * object to display, formats it as an appropriate datetime <code>String</code>.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Input}.
 * @config {String} [format] a {@link time.strftime} format string.
 * @constructor
 */
function DateTimeInput(kwargs) {
  if (!(this instanceof Widget)) return new DateTimeInput(kwargs);
  kwargs = extend({format: null}, kwargs || {});
  Input.call(this, kwargs);
  if (kwargs.format !== null) {
    this.format = kwargs.format;
  }
  else {
    this.format = DEFAULT_DATETIME_INPUT_FORMATS[0];
  }
}
inheritFrom(DateTimeInput, Input);
DateTimeInput.prototype.inputType = 'text';

DateTimeInput.prototype._formatValue = function(value) {
  if (value instanceof Date) {
    return time.strftime(value, this.format);
  }
  return value;
};

DateTimeInput.prototype.render = function(name, value, kwargs) {
  value = this._formatValue(value);
  return Input.prototype.render.call(this, name, value, kwargs);
};

DateTimeInput.prototype._hasChanged = function(initial, data) {
  return Input.prototype._hasChanged.call(this, this._formatValue(initial), data);
};

/**
 * A <code>&lt;input type="text"&gt;</code> which, if given a <code>Date</code>
 * object to display, formats it as an appropriate time <code>String</code>.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Input}.
 * @config {String} [format] a {@link time.strftime} format string.
 * @constructor
 */
function TimeInput(kwargs) {
  if (!(this instanceof Widget)) return new TimeInput(kwargs);
  kwargs = extend({format: null}, kwargs || {});
  Input.call(this, kwargs);
  if (kwargs.format !== null) {
    this.format = kwargs.format;
  }
  else {
    this.format = DEFAULT_TIME_INPUT_FORMATS[0];
  }
}
inheritFrom(TimeInput, Input);
TimeInput.prototype.inputType = 'text';

TimeInput.prototype._formatValue = function(value) {
  if (value instanceof Date) {
    return time.strftime(value, this.format);
  }
  return value;
};

TimeInput.prototype.render = function(name, value, kwargs) {
  value = this._formatValue(value);
  return Input.prototype.render.call(this, name, value, kwargs);
};

TimeInput.prototype._hasChanged = function(initial, data) {
  return Input.prototype._hasChanged.call(this, this._formatValue(initial), data);
};

/**
 * An HTML <code>&lt;input type="checkbox"&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Widget}.
 * @config {Function} [checkTest] a function which takes a value and returns
 *                                <code>true</code> if the checkbox should be
 *                                checked for that value.
 * @constructor
 */
function CheckboxInput(kwargs) {
  if (!(this instanceof Widget)) return new CheckboxInput(kwargs);
  kwargs = extend({checkTest: Boolean}, kwargs || {});
  Widget.call(this, kwargs);
  this.checkTest = kwargs.checkTest;
}
inheritFrom(CheckboxInput, Widget);

CheckboxInput.prototype.render = function(name, value, kwargs) {
  kwargs = extend({attrs: null}, kwargs || {});
  var checked;
  try {
    checked = this.checkTest(value);
  }
  catch (e) {
    // Silently catch exceptions
    checked = false;
  }

  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: 'checkbox',
                                                  name: name});
  if (value !== '' && value !== true && value !== false && value !== null &&
      value !== undefined) {
    // Only add the value attribute if value is non-empty
    finalAttrs.value = value;
  }
  if (checked) {
    finalAttrs.checked = 'checked';
  }
  return DOMBuilder.createElement('input', finalAttrs);
};

CheckboxInput.prototype.valueFromData = function(data, files, name) {
  if (typeof data[name] == 'undefined') {
    //  A missing value means False because HTML form submission does not
    // send results for unselected checkboxes.
    return false;
  }
  var value = data[name]
    , values = {'true': true, 'false': false};
  // Translate true and false strings to boolean values
  if (isString(value)) {
    value = getDefault(values, value.toLowerCase(), value);
  }
  return value;
};

CheckboxInput.prototype._hasChanged = function(initial, data) {
  // Sometimes data or initial could be null or '' which should be the same
  // thing as false.
  return (Boolean(initial) != Boolean(data));
};

/**
 * An HTML <code>&lt;select&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Widget}.
 * @config {Array} [choices] choices to be used when rendering the widget,
 *                           with each choice specified as an <code>Array</code>
 *                           in <code>[value, text]</code> format.
 * @constructor
 */
function Select(kwargs) {
  if (!(this instanceof Widget)) return new Select(kwargs);
  kwargs = extend({choices: []}, kwargs || {});
  Widget.call(this, kwargs);
  this.choices = kwargs.choices || [];
}
inheritFrom(Select, Widget);

/**
 * Renders the widget.
 *
 * @param {String} name the field name.
 * @param selectedValue the value of an option which should be marked as
 *                      selected, or <code>null</code> if no value is selected -
 *                      will be normalised to a <code>String</code> for
 *                      comparison with choice values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 * @param {Array} [choices] choices to be used when rendering the widget, in
 *                          addition to those already held by the widget itself.
 *
 * @return a <code>&lt;select&gt;</code> element.
 */
Select.prototype.render = function(name, selectedValue, kwargs) {
  kwargs = extend({attrs: null, choices: []}, kwargs || {});
  if (selectedValue === null) {
    selectedValue = '';
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name});
  var options = this.renderOptions(kwargs.choices, [selectedValue]);
  options.push('\n');
  return DOMBuilder.createElement('select', finalAttrs, options);
};

Select.prototype.renderOptions = function(choices, selectedValues) {
  // Normalise to strings
  var selectedValuesLookup = {};
  // We don't duck type passing of a String instead, as index access to
  // characters isn't part of the spec.
  var selectedValueString = (isString(selectedValues));
  for (var i = 0, l = selectedValues.length; i < l; i++) {
    selectedValuesLookup[''+(selectedValueString ?
                             selectedValues.charAt(i) :
                             selectedValues[i])] = true;
  }

  var options = []
    , finalChoices = this.choices.concat(choices || []);
  for (var i = 0, l = finalChoices.length; i < l; i++) {
    if (isArray(finalChoices[i][1])) {
      var optgroupOptions = []
        , optgroupChoices = finalChoices[i][1];
      for (var j = 0, k = optgroupChoices.length; j < k; j++) {
        optgroupOptions.push('\n');
        optgroupOptions.push(this.renderOption(selectedValuesLookup,
                                               optgroupChoices[j][0],
                                               optgroupChoices[j][1]));
      }
      options.push('\n');
      optgroupOptions.push('\n');
      options.push(DOMBuilder.createElement(
          'optgroup', {label: finalChoices[i][0]}, optgroupOptions));
    }
    else {
      options.push('\n');
      options.push(this.renderOption(selectedValuesLookup,
                                     finalChoices[i][0],
                                     finalChoices[i][1]));
    }
  }
  return options;
};

Select.prototype.renderOption = function(selectedValuesLookup, optValue,
                                         optLabel) {
  optValue = ''+optValue;
  var attrs = {value: optValue};
  if (typeof selectedValuesLookup[optValue] != 'undefined') {
    attrs['selected'] = 'selected';
  }
  return DOMBuilder.createElement('option', attrs, [optLabel]);
};

/**
 * A <code>&lt;select&gt;</code> widget intended to be used with
 * {@link NullBooleanField}.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Select}. Any choices configuration provided
 *                          will be overrridden with the specific choices this
 *                          widget requires.
 * @constructor
 */
function NullBooleanSelect(kwargs) {
  if (!(this instanceof Widget)) return new NullBooleanSelect(kwargs);
  kwargs = kwargs || {};
  // Set or overrride choices
  kwargs.choices = [['1', 'Unknown'], ['2', 'Yes'], ['3', 'No']];
  Select.call(this, kwargs);
}
inheritFrom(NullBooleanSelect, Select);

NullBooleanSelect.prototype.render = function(name, value, kwargs) {
  if (value === true || value == '2') {
      value = '2';
  }
  else if (value === false || value == '3') {
      value = '3';
  }
  else {
      value = '1';
  }
  return Select.prototype.render.call(this, name, value, kwargs);
};

NullBooleanSelect.prototype.valueFromData = function(data, files, name) {
  var value = null;
  if (typeof data[name] != 'undefined') {
    var dataValue = data[name];
    if (dataValue === true || dataValue == 'True' || dataValue == 'true' ||
        dataValue == '2') {
      value = true;
    }
    else if (dataValue === false || dataValue == 'False' ||
             dataValue == 'false' || dataValue == '3') {
      value = false;
    }
  }
  return value;
};

NullBooleanSelect.prototype._hasChanged = function(initial, data) {
  // For a NullBooleanSelect, null (unknown) and false (No)
  //are not the same
  if (initial !== null) {
      initial = Boolean(initial);
  }
  if (data !== null) {
      data = Boolean(data);
  }
  return initial != data;
};

/**
 * An HTML <code>&lt;select&gt;</code> widget which allows multiple selections.
 *
 * @param {Object} [kwargs] configuration parameters, as specified in
 *                          {@link Select}.
 * @constructor
 */
function SelectMultiple(kwargs) {
  if (!(this instanceof Widget)) return new SelectMultiple(kwargs);
  Select.call(this, kwargs);
}
inheritFrom(SelectMultiple, Select);

/**
 * Renders the widget.
 *
 * @param {String} name the field name.
 * @param {Array} selectedValues the values of options which should be marked as
 *                               selected, or <code>null</code> if no values
 *                               are selected - these will be normalised to
 *                               <code>String</code>s for comparison with choice
 *                               values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 * @param {Array} [choices] choices to be used when rendering the widget, in
 *                          addition to those already held by the widget itself.
 *
 * @return a <code>&lt;select&gt;</code> element which allows multiple
 *         selections.
 */
SelectMultiple.prototype.render = function(name, selectedValues, kwargs) {
  kwargs = extend({attrs: null, choices: []}, kwargs || {});
  if (selectedValues === null) {
    selectedValues = [];
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name,
                                                  multiple: 'multiple'})
    , options = this.renderOptions(kwargs.choices, selectedValues);
  options.push('\n');
  return DOMBuilder.createElement('select', finalAttrs, options);
};

/**
 * Retrieves values for this widget from the given data.
 *
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {String} name the field name to be used to retrieve data.
 *
 * @return {Array} values for this widget, or <code>null</code> if no values
 *                 were provided.
 */
SelectMultiple.prototype.valueFromData = function(data, files, name) {
  if (typeof data[name] != 'undefined') {
    return [].concat(data[name]);
  }
  return null;
};

SelectMultiple.prototype._hasChanged = function(initial, data) {
  if (initial === null) {
    initial = [];
  }
  if (data === null) {
    data = [];
  }
  if (initial.length != data.length) {
    return true;
  }
  var dataLookup = createLookup(data);
  for (var i = 0, l = initial.length; i < l; i++) {
    if (typeof dataLookup[''+initial[i]] == 'undefined') {
      return true;
    }
  }
  return false;
};

/**
 * An object used by {@link RadioFieldRenderer} that represents a single
 * <code>&lt;input type="radio"&gt;</code>.
 *
 * @param {String} name the field name.
 * @param {String} value the selected value.
 * @param {Object} attrs HTML attributes for the widget.
 * @param {Array} choice choice details to be used when rendering the widget,
 *                specified as an <code>Array</code> in
 *                <code>[value, text]</code> format.
 * @param {Number} index the index of the radio button this widget represents.
 * @constructor
 */
function RadioInput(name, value, attrs, choice, index) {
  if (!(this instanceof RadioInput)) return new RadioInput(name, value, attrs, choice, index);
  this.name = name;
  this.value = value;
  this.attrs = attrs;
  this.choiceValue = ''+choice[0];
  this.choiceLabel = choice[1];
  this.index = index;
}

/**
 * Renders a <code>&lt;label&gt;</code> enclosing the radio widget and its label
 * text.
 */
RadioInput.prototype.labelTag = function() {
  var labelAttrs = {};
  if (typeof this.attrs.id != 'undefined') {
    labelAttrs['for'] = this.attrs.id + '_' + this.index;
  }
  return DOMBuilder.createElement('label', labelAttrs,
                                  [this.tag(), ' ', this.choiceLabel]);
};

RadioInput.prototype.toString = function() {
  return ''+this.labelTag();
};

RadioInput.prototype.isChecked = function() {
  return this.value === this.choiceValue;
};

/**
 * Renders the <code>&lt;input type="radio"&gt;</code> portion of the widget.
 */
RadioInput.prototype.tag = function() {
  var finalAttrs = extend({}, this.attrs, {
                     type: 'radio', name: this.name, value: this.choiceValue
                   });
  if (typeof finalAttrs.id != 'undefined') {
    finalAttrs.id = finalAttrs.id + '_' + this.index;
  }
  if (this.isChecked()) {
    finalAttrs.checked = 'checked';
  }
  return DOMBuilder.createElement('input', finalAttrs);
};

/**
 * An object used by {@link RadioSelect} to enable customisation of radio
 * widgets.
 *
 * @param {String} name the field name.
 * @param {String} value the selected value.
 * @param {Object} attrs HTML attributes for the widget.
 * @param {Array} choices choices to be used when rendering the widget, with
 *                        each choice specified as an <code>Array</code> in
 *                        <code>[value, text]</code> format.
 * @constructor
 */
function RadioFieldRenderer(name, value, attrs, choices) {
  if (!(this instanceof RadioFieldRenderer)) return RadioFieldRenderer(name, value, attrs, choices);
  this.name = name;
  this.value = value;
  this.attrs = attrs;
  this.choices = choices;
}

RadioFieldRenderer.prototype.radioInputs = function() {
  var inputs = [];
  for (var i = 0, l = this.choices.length; i < l; i++) {
    inputs.push(RadioInput(this.name, this.value,
                           extend({}, this.attrs),
                           this.choices[i], i));
  }
  return inputs;
};

RadioFieldRenderer.prototype.radioInput = function(i) {
  if (i >= this.choices.length) {
    throw new Error('Index out of bounds');
  }
  return RadioInput(this.name, this.value, extend({}, this.attrs),
                    this.choices[i], i);
};

/**
 * Outputs a &lt;ul&gt; for this set of radio fields.
 */
RadioFieldRenderer.prototype.render = function() {
  var inputs = this.radioInputs();
  var items = [];
  for (var i = 0, l = inputs.length; i < l; i++) {
      items.push('\n');
      items.push(DOMBuilder.createElement('li', {}, [inputs[i].labelTag()]));
  }
  items.push('\n');
  return DOMBuilder.createElement('ul', {}, items);
};

/**
 * Renders a single select as a list of <code>&lt;input type="radio"&gt;</code>
 * elements.
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Select}.
 * @config {Function} [renderer] a custom RadioFieldRenderer constructor.
 * @constructor
 */
function RadioSelect(kwargs) {
  if (!(this instanceof Widget)) return new RadioSelect(kwargs);
  kwargs = extend({renderer: null}, kwargs || {});
  // Override the default renderer if we were passed one
  if (kwargs.renderer !== null) {
    this.renderer = kwargs.renderer;
  }
  Select.call(this, kwargs);
}
inheritFrom(RadioSelect, Select);
RadioSelect.prototype.renderer = RadioFieldRenderer;

/**
 * @return an instance of the renderer to be used to render this widget.
 */
RadioSelect.prototype.getRenderer = function(name, value, kwargs) {
  kwargs = extend({attrs: null, choices: []}, kwargs || {});
  value = (value === null ? '' : ''+value);
  var finalAttrs = this.buildAttrs(kwargs.attrs)
    , choices = this.choices.concat(kwargs.choices || []);
  return new this.renderer(name, value, finalAttrs, choices);
};

RadioSelect.prototype.render = function(name, value, kwargs) {
  return this.getRenderer(name, value, kwargs).render();
};

/**
 * RadioSelect is represented by multiple <input type="radio"> fields,
 * each of which has a distinct ID. The IDs are made distinct by a '_X'
 * suffix, where X is the zero-based index of the radio field. Thus, the
 * label for a RadioSelect should reference the first one ('_0').
 */
RadioSelect.prototype.idForLabel = function(id) {
  if (id) {
      id += '_0';
  }
  return id;
};

/**
 * Multiple selections represented as a list of
 * <code>&lt;input type="checkbox"&gt;</code> widgets.
 *
 * @param {Object} [kwargs] configuration parameters, as specified in
 *                          {@link SelectMultiple}.
 * @constructor
 */
function CheckboxSelectMultiple(kwargs) {
  if (!(this instanceof Widget)) return new CheckboxSelectMultiple(kwargs);
  SelectMultiple.call(this, kwargs);
}
inheritFrom(CheckboxSelectMultiple, SelectMultiple);

CheckboxSelectMultiple.prototype.render = function(name, selectedValues, kwargs) {
  kwargs = extend({attrs: null, choices: []}, kwargs || {});
  if (selectedValues === null) {
    selectedValues = [];
  }
  var hasId = (kwargs.attrs !== null && typeof kwargs.attrs.id != 'undefined')
    , finalAttrs = this.buildAttrs(kwargs.attrs)
    , selectedValuesLookup = createLookup(selectedValues)
    , checkTest = function(value) {
        return (typeof selectedValuesLookup[''+value] != 'undefined');
      }
    , items = []
    , finalChoices = this.choices.concat(kwargs.choices);
  for (var i = 0, l = finalChoices.length; i < l; i++) {
    var optValue = '' + finalChoices[i][0]
      , optLabel = finalChoices[i][1]
      , checkboxAttrs = extend({}, finalAttrs)
      , labelAttrs = {};
    // If an ID attribute was given, add a numeric index as a suffix, so
    // that the checkboxes don't all have the same ID attribute.
    if (hasId) {
      extend(checkboxAttrs, {id: kwargs.attrs.id + '_' + i});
      labelAttrs['for'] = checkboxAttrs.id;
    }

    var cb = CheckboxInput({attrs: checkboxAttrs, checkTest: checkTest});
    items.push('\n');
    items.push(
        DOMBuilder.createElement('li', {},
            [DOMBuilder.createElement('label', labelAttrs,
                                      [cb.render(name, optValue), ' ',
                                       optLabel])]));
  }
  items.push('\n');
  return DOMBuilder.createElement('ul', {}, items);
};

CheckboxSelectMultiple.prototype.idForLabel = function(id) {
  if (id) {
    id += '_0';
  }
  return id;
};

/**
 * A widget that is composed of multiple widgets.
 *
 * You'll probably want to use this class with {@link MultiValueField}.
 *
 * @param {Array} widgets the list of widgets composing this widget.
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Widget}.
 * @constructor
 */
function MultiWidget(widgets, kwargs) {
  if (!(this instanceof Widget)) return new MultiWidget(widgets, kwargs);
  this.widgets = [];
  for (var i = 0, l = widgets.length; i < l; i++) {
    this.widgets.push(widgets[i] instanceof Widget
                      ? widgets[i]
                      : new widgets[i]);
  }
  Widget.call(this, kwargs);
}
inheritFrom(MultiWidget, Widget);

/**
 * This method is different than other widgets', because it has to figure out
 * how to split a single value for display in multiple widgets.
 *
 * If the given value is NOT a list, it will first be "decompressed" into a list
 * before it is rendered by calling the {@link MultiWidget#decompress} method.
 *
 * Each value in the list is rendered  with the corresponding widget -- the
 * first value is rendered in the first widget, the second value is rendered in
 * the second widget, and so on.
 *
 * @param {String} name the field name.
 * @param value a list of values, or a normal value (e.g., a <code>String</code>
 *              that has been "compressed" from a list of values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 *
 * @return a rendered collection of widgets.
 */
MultiWidget.prototype.render = function(name, value, kwargs) {
  kwargs = extend({attrs: null}, kwargs || {});
  if (!(isArray(value))) {
    value = this.decompress(value);
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs)
    , id = (typeof finalAttrs.id != 'undefined' ? finalAttrs.id : null)
    , renderedWidgets = [];
  for (var i = 0, l = this.widgets.length; i < l; i++) {
    var widget = this.widgets[i]
      , widgetValue = null;
    if (typeof value[i] != 'undefined') {
      widgetValue = value[i];
    }
    if (id) {
      finalAttrs.id = id + '_' + i;
    }
    renderedWidgets.push(
        widget.render(name + '_' + i, widgetValue, {attrs: finalAttrs}));
  }
  return this.formatOutput(renderedWidgets);
};

MultiWidget.prototype.idForLabel = function(id) {
  if (id) {
    id += '_0';
  }
  return id;
};

MultiWidget.prototype.valueFromData = function(data, files, name) {
  var values = [];
  for (var i = 0, l = this.widgets.length; i < l; i++) {
    values[i] = this.widgets[i].valueFromData(data, files, name + '_' + i);
  }
  return values;
};

MultiWidget.prototype._hasChanged = function(initial, data) {
  if (initial === null) {
    initial = [];
    for (var i = 0, l = data.length; i < l; i++) {
      initial.push('');
    }
  }
  else if (!(isArray(initial))) {
    initial = this.decompress(initial);
  }

  for (var i = 0, l = this.widgets.length; i < l; i++) {
    if (this.widgets[i]._hasChanged(initial[i], data[i])) {
      return true;
    }
  }
  return false;
};

/**
 * Creates an element containing a given list of rendered widgets.
 *
 * This hook allows you to format the HTML design of the widgets, if needed.
 *
 * @param {Array} renderedWidgets a list of rendered widgets.
 * @return a fragment containing the rendered widgets.
 */
MultiWidget.prototype.formatOutput = function(renderedWidgets) {
  return DOMBuilder.fragment(renderedWidgets);
};

/**
 * Creates a list of decompressed values for the given compressed value.
 *
 * @param value a compressed value, which can be assumed to be valid, but not
 *              necessarily non-empty.
 *
 * @return a list of decompressed values for the given compressed value.
 */
MultiWidget.prototype.decompress = function(value) {
  throw new Error('MultiWidget subclasses must implement a decompress() method.');
};

/**
 * Splits <code>Date</code> input into two
 * <code>&lt;input type="text"&gt;</code> elements.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link MultiWidget}.
 * @param {String} [dateFormat] a {@link time.strftime} format string for
 *                              formatting the date.
 * @param {String} [timeFormat] a {@link time.strftime} format string for
 *                              formatting the time.
 * @constructor
 */
function SplitDateTimeWidget(kwargs) {
  if (!(this instanceof Widget)) return new SplitDateTimeWidget(kwargs);
  kwargs = extend({dateFormat: null, timeFormat: null}, kwargs || {});
  var widgets = [
    DateInput({attrs: kwargs.attrs, format: kwargs.dateFormat})
  , TimeInput({attrs: kwargs.attrs, format: kwargs.timeFormat})
  ];
  MultiWidget.call(this, widgets, kwargs.attrs);
}
inheritFrom(SplitDateTimeWidget, MultiWidget);

SplitDateTimeWidget.prototype.decompress = function(value) {
  if (value) {
    return [
      new Date(value.getFullYear(), value.getMonth(), value.getDate())
    , new Date(1900, 0, 1, value.getHours(), value.getMinutes(), value.getSeconds())
    ];
  }
  return [null, null];
};

/**
 * Splits <code>Date</code> input into two
 * <code>&lt;input type="hidden"&gt;</code> elements.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link SplitHiddenDateTimeWidget}.
 * @constructor
 */
function SplitHiddenDateTimeWidget(kwargs) {
  if (!(this instanceof Widget)) return new SplitHiddenDateTimeWidget(kwargs);
  SplitDateTimeWidget.call(this, kwargs);
  for (var i = 0, l = this.widgets.length; i < l; i++) {
    this.widgets[i].inputType = 'hidden';
    this.widgets[i].isHidden = true;
  }
}
inheritFrom(SplitHiddenDateTimeWidget, SplitDateTimeWidget);
SplitHiddenDateTimeWidget.prototype.isHidden = true;

var DEFAULT_DATE_INPUT_FORMATS = [
        '%Y-%m-%d',              // '2006-10-25'
        '%m/%d/%Y', '%m/%d/%y',  // '10/25/2006', '10/25/06'
        '%b %d %Y', '%b %d, %Y', // 'Oct 25 2006', 'Oct 25, 2006'
        '%d %b %Y', '%d %b, %Y', // '25 Oct 2006', '25 Oct, 2006'
        '%B %d %Y', '%B %d, %Y', // 'October 25 2006', 'October 25, 2006'
        '%d %B %Y', '%d %B, %Y'  // '25 October 2006', '25 October, 2006'
    ]
  , DEFAULT_TIME_INPUT_FORMATS = [
        '%H:%M:%S', // '14:30:59'
        '%H:%M'     // '14:30'
    ]
  , DEFAULT_DATETIME_INPUT_FORMATS = [
        '%Y-%m-%d %H:%M:%S', // '2006-10-25 14:30:59'
        '%Y-%m-%d %H:%M',    // '2006-10-25 14:30'
        '%Y-%m-%d',          // '2006-10-25'
        '%m/%d/%Y %H:%M:%S', // '10/25/2006 14:30:59'
        '%m/%d/%Y %H:%M',    // '10/25/2006 14:30'
        '%m/%d/%Y',          // '10/25/2006'
        '%m/%d/%y %H:%M:%S', // '10/25/06 14:30:59'
        '%m/%d/%y %H:%M',    // '10/25/06 14:30'
        '%m/%d/%y'           // '10/25/06'
    ];

/**
 * An object that is responsible for doing validation and normalisation, or
 * "cleaning", for example: an {@link EmailField} makes sure its data is a valid
 * e-mail address and makes sure that acceptable "blank" values all have the
 * same representation.
 *
 * @param {Object} [kwargs] configuration options.
 * @config {Boolean} [required] determines if the field is required - defaults
 *                              to <code>true</code>.
 * @config {Widget} [widget] overrides the widget used to render the field - if
 *                           not provided, the field's default will be used.
 * @config {String} [label] the label to be displayed for the field - if not
 *                          provided, will be generated from the field's name.
 * @config [initial] an initial value for the field to be used if none is
 *                   specified by the field's form.
 * @config {String} [helpText] help text for the field.
 * @config {Object} [errorMessages] custom error messages for the field.
 * @config {Boolean} [showHiddenInitial] specifies if it is necessary to render
 *                                       a hidden widget with initial value
 *                                       after the widget.
 * @config {Array} [validators] list of addtional validators to use
 * @constructor
 */
function Field(kwargs) {
  kwargs = extend({
    required: true, widget: null, label: null, initial: null,
    helpText: null, errorMessages: null, showHiddenInitial: false,
    validators: []
  }, kwargs || {});
  this.required = kwargs.required;
  this.label = kwargs.label;
  this.initial = kwargs.initial;
  this.showHiddenInitial = kwargs.showHiddenInitial;
  this.helpText = kwargs.helpText || '';

  var widget = kwargs.widget || this.widget;
  if (!(widget instanceof Widget)) {
    // We must have a Widget constructor, so construct with it
    widget = new widget();
  }
  // Let the widget know whether it should display as required
  widget.isRequired = this.required;
  // Hook into this.widgetAttrs() for any Field-specific HTML attributes
  extend(widget.attrs, this.widgetAttrs(widget));
  this.widget = widget;

  // Increment the creation counter and save our local copy
  this.creationCounter = Field.creationCounter++;

  // Copy error messages for this instance into a new object and override
  // with any provided error messages.
  this.errorMessages =
      extend({}, this.defaultErrorMessages, kwargs.errorMessages || {});

  this.validators = this.defaultValidators.concat(kwargs.validators);
}
/**
 * Tracks each time a Field instance is created; used to retain order.
 */
Field.creationCounter = 0;
/**
 * Default widget to use when rendering this type of Field.
 */
Field.prototype.widget = TextInput;
/**
 * Default widget to use when rendering this type of field as hidden.
 */
Field.prototype.hiddenWidget = HiddenInput;
/**
 * Default set of validators.
 */
Field.prototype.defaultValidators = [];
/**
 * Default error messages.
 */
Field.prototype.defaultErrorMessages = {
  required: 'This field is required.'
, invalid: 'Enter a valid value.'
};

Field.prototype.prepareValue = function(value) {
  return value;
};

Field.prototype.toJavaScript = function(value) {
  return value;
};

Field.prototype.validate = function(value) {
  if (this.required && contains(EMPTY_VALUES, value)) {
    throw ValidationError(this.errorMessages.required);
  }
};

Field.prototype.runValidators = function(value) {
  if (contains(EMPTY_VALUES, value)) {
    return;
  }
  var errors = [];
  for (var i = 0, l = this.validators.length; i < l; i++) {
    try {
      callValidator(this.validators[i], value);
    }
    catch (e) {
      if (!(e instanceof ValidationError)) {
        throw e;
      }
      if (typeof e.code != 'undefined' &&
          typeof this.errorMessages[e.code] != 'undefined') {
        var message = this.errorMessages[e.code];
        if (typeof e.params != 'undefined') {
          message = format(message, e.params);
        }
        errors.push(message);
      }
      else {
        errors = errors.concat(e.messages);
      }
    }
  }
  if (errors.length > 0) {
    throw ValidationError(errors);
  }
};

/**
 * Validates the given value and returns its "cleaned" value as an appropriate
 * JavaScript object.
 *
 * Raises ValidationError for any errors.
 *
 * @param {String} value the value to be validated.
 */
Field.prototype.clean = function(value) {
  value = this.toJavaScript(value);
  this.validate(value);
  this.runValidators(value);
  return value;
};

/**
 * Return the value that should be shown for this field on render of a bound
 * form, given the submitted POST data for the field and the initial data, if
 * any.
 *
 * For most fields, this will simply be data; FileFields need to handle it a bit
 * differently.
 */
Field.prototype.boundData = function(data, initial) {
  return data;
};

/**
 * Specifies HTML attributes which should be added to a given widget for this
 * field.
 *
 * @param {Widget} widget a widget.
 * @return an object specifying HTML attributes that should be added to the
 *         given widget, based on this field.
 */
Field.prototype.widgetAttrs = function(widget) {
  return {};
};

/**
 * Django has dropped this method, but we still need to it perform the change
 * check for certain Field types.
 */
Field.prototype._hasChanged = function(initial, data) {
  return this.widget._hasChanged(initial, data);
};

/**
 * Validates that its input is a valid string.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Number} [maxLength] a maximum valid length for the input string.
 * @config {Number} [minLength] a minimum valid length for the input string.
 * @constructor
 */
function CharField(kwargs) {
  if (!(this instanceof Field)) return new CharField(kwargs);
  kwargs = extend({
    maxLength: null, minLength: null
  }, kwargs || {});
  this.maxLength = kwargs.maxLength;
  this.minLength = kwargs.minLength;
  Field.call(this, kwargs);
  if (this.minLength !== null) {
    this.validators.push(MinLengthValidator(this.minLength));
  }
  if (this.maxLength !== null) {
    this.validators.push(MaxLengthValidator(this.maxLength));
  }
}
inheritFrom(CharField, Field);

CharField.prototype.toJavaScript = function(value) {
  if (contains(EMPTY_VALUES, value)) {
    return '';
  }
  return ''+value;
};

/**
 * If this field is configured to enforce a maximum length, adds a suitable
 * <code>maxlength</code> attribute to text input fields.
 *
 * @param {Widget} widget the widget being used to render this field's value.
 *
 * @return additional attributes which should be added to the given widget.
 */
CharField.prototype.widgetAttrs = function(widget)
{
    var attrs = {};
    if (this.maxLength !== null && (widget instanceof TextInput ||
                                    widget instanceof PasswordInput))
    {
        attrs.maxlength = this.maxLength.toString();
    }
    return attrs;
};

/**
 * Validates that its input is a valid integer.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Number} [maxValue] a maximum value for the input.
 * @config {Number} [minValue] a minimum value for the input.
 */
function IntegerField(kwargs) {
  if (!(this instanceof Field)) return new IntegerField(kwargs);
  kwargs = extend({
    maxValue: null, minValue: null
  }, kwargs || {});
  this.maxValue = kwargs.maxValue;
  this.minValue = kwargs.minValue;
  Field.call(this, kwargs);

  if (this.minValue !== null) {
    this.validators.push(MinValueValidator(this.minValue));
  }
  if (this.maxValue !== null) {
    this.validators.push(MaxValueValidator(this.maxValue));
  }
}
inheritFrom(IntegerField, Field);
IntegerField.prototype.defaultErrorMessages =
    extend({}, IntegerField.prototype.defaultErrorMessages, {
      invalid: 'Enter a whole number.'
    , maxValue: 'Ensure this value is less than or equal to %(limitValue)s.'
    , minValue: 'Ensure this value is greater than or equal to %(limitValue)s.'
    });

/**
 * Validates that Number() can be called on the input with a result that isn't
 * NaN and doesn't contain any decimal points.
 *
 * @param value the value to be val idated.
 * @return the result of Number(), or <code>null</code> for empty values.
 */
IntegerField.prototype.toJavaScript = function(value) {
  value = Field.prototype.toJavaScript.call(this, value);
  if (contains(EMPTY_VALUES, value)) {
    return null;
  }
  value = Number(value);
  if (isNaN(value) || value.toString().indexOf('.') != -1) {
    throw ValidationError(this.errorMessages.invalid);
  }
  return value;
};

/**
 * Validates that its input is a valid float.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Number} [maxValue] a maximum value for the input.
 * @config {Number} [minValue] a minimum value for the input.
 * @constructor
 */
function FloatField(kwargs) {
  if (!(this instanceof Field)) return new FloatField(kwargs);
  IntegerField.call(this, kwargs);
}
inheritFrom(FloatField, IntegerField);
/** Float validation regular expression, as parseFloat() is too forgiving. */
FloatField.FLOAT_REGEXP = /^[-+]?(?:\d+(?:\.\d+)?|(?:\d+)?\.\d+)$/;
FloatField.prototype.defaultErrorMessages =
    extend({}, FloatField.prototype.defaultErrorMessages, {
      invalid: 'Enter a number.'
    });

/**
 * Validates that the input looks like valid input for parseFloat() and the
 * result of calling it isn't NaN.
 *
 * @param value the value to be validated.
 *
 * @return a Number obtained from parseFloat(), or <code>null</code> for empty
 *         values.
 */
FloatField.prototype.toJavaScript = function(value) {
  value = Field.prototype.toJavaScript.call(this, value);
  if (contains(EMPTY_VALUES, value)) {
    return null;
  }
  value = strip(value);
  if (!FloatField.FLOAT_REGEXP.test(value)) {
    throw ValidationError(this.errorMessages.invalid);
  }
  value = parseFloat(value);
  if (isNaN(value)) {
    throw ValidationError(this.errorMessages.invalid);
  }
  return value;
};

/**
* Determines if data has changed from initial. In JavaScript, trailing zeroes
* in floats are dropped when a float is coerced to a String, so e.g., an
* initial value of 1.0 would not match a data value of '1.0' if we were to use
* the Widget object's _hasChanged, which checks coerced String values.
*
* @type Boolean
*/
FloatField.prototype._hasChanged = function(initial, data) {
  // For purposes of seeing whether something has changed, null is the same
  // as an empty string, if the data or inital value we get is null, replace
  // it with ''.
  var dataValue = (data === null ? '' : data);
  var initialValue = (initial === null ? '' : initial);
  return (parseFloat(''+data) != parseFloat(''+dataValue));
};

/**
 * Validates that its input is a decimal number.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Number} maxValue a maximum value for the input.
 * @config {Number} minValue a minimum value for the input.
 * @config {Number} maxDigits the maximum number of digits the input may
 *                            contain.
 * @config {Number} decimalPlaces the maximum number of decimal places the input
 *                                may contain.
 * @constructor
 */
function DecimalField(kwargs) {
  if (!(this instanceof Field)) return new DecimalField(kwargs);
  kwargs = extend({
    maxValue: null, minValue: null, maxDigits: null, decimalPlaces: null
  }, kwargs || {});
  this.maxValue = kwargs.maxValue;
  this.minValue = kwargs.minValue;
  this.maxDigits = kwargs.maxDigits;
  this.decimalPlaces = kwargs.decimalPlaces;
  Field.call(this, kwargs);

  if (this.minValue !== null) {
    this.validators.push(MinValueValidator(this.minValue));
  }
  if (this.maxValue !== null) {
    this.validators.push(MaxValueValidator(this.maxValue));
  }
}
inheritFrom(DecimalField, Field);
/** Decimal validation regular expression, in lieu of a Decimal type. */
DecimalField.DECIMAL_REGEXP = /^[-+]?(?:\d+(?:\.\d+)?|(?:\d+)?\.\d+)$/;
DecimalField.prototype.defaultErrorMessages =
    extend({}, DecimalField.prototype.defaultErrorMessages, {
      invalid: 'Enter a number.'
    , maxValue: 'Ensure this value is less than or equal to %(limitValue)s.'
    , minValue: 'Ensure this value is greater than or equal to %(limitValue)s.'
    , maxDigits: 'Ensure that there are no more than %(maxDigits)s digits in total.'
    , maxDecimalPlaces: 'Ensure that there are no more than %(maxDecimalPlaces)s decimal places.'
    , maxWholeDigits: 'Ensure that there are no more than %(maxWholeDigits)s digits before the decimal point.'
    });

/**
 * DecimalField overrides the clean() method as it performs its own validation
 * against a different value than that given to any defined validators, due to
 * JavaScript lacking a built-in Decimal type. Decimal format and component size
 * checks will be performed against a normalised string representation of the
 * input, whereas Validators will be passed a float version of teh value for
 * min/max checking.
 * @param {string|Number} value
 * @return {string} a normalised version of the input.
 */
DecimalField.prototype.clean = function(value) {
  // Take care of empty, required validation
  Field.prototype.validate.call(this, value);
  if (contains(EMPTY_VALUES, value)) {
    return null;
  }

  // Coerce to string and validate that it looks Decimal-like
  value = strip(''+value);
  if (!DecimalField.DECIMAL_REGEXP.test(value)) {
    throw ValidationError(this.errorMessages.invalid);
  }

  // In lieu of a Decimal type, DecimalField validates against a string
  // representation of a Decimal, in which:
  // * Any leading sign has been stripped
  var negative = false;
  if (value.charAt(0) == '+' || value.charAt(0) == '-') {
    negative = (value.charAt(0) == '-');
    value = value.substr(1);
  }
  // * Leading zeros have been stripped from digits before the decimal point,
  //   but trailing digits are retained after the decimal point.
  value = value.replace(/^0+/, '');

  // Perform own validation
  var pieces = value.split('.')
    , wholeDigits = pieces[0].length
    , decimals = (pieces.length == 2 ? pieces[1].length : 0)
    , digits = wholeDigits + decimals;
  if (this.maxDigits !== null && digits > this.maxDigits) {
    throw ValidationError(format(this.errorMessages.maxDigits,
                                 {maxDigits: this.maxDigits}));
  }
  if (this.decimalPlaces !== null && decimals > this.decimalPlaces) {
    throw ValidationError(format(this.errorMessages.maxDecimalPlaces,
                                 {maxDecimalPlaces: this.decimalPlaces}));
  }
  if (this.maxDigits !== null &&
      this.decimalPlaces !== null &&
      wholeDigits > (this.maxDigits - this.decimalPlaces)) {
    throw ValidationError(format(this.errorMessages.maxWholeDigits,
                                 {maxWholeDigits: (
                                  this.maxDigits - this.decimalPlaces)}));
  }

  // * Values which did not have a leading zero gain a single leading zero
  if (value.charAt(0) == '.') {
    value = '0' + value;
  }
  // Restore sign if necessary
  if (negative) {
    value = '-' + value;
  }

  // Validate against a float value - best we can do in the meantime
  this.runValidators(parseFloat(value));

  // Return the normalited String representation
  return value;
};

/**
 * Base field for fields which validate that their input is a date or time.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs configuration options additional to those specified
 *     in {@link Field}.
 * @config {Array=} inputFormats a list of time.strptime input formats which are
 *     considered valid.
 */
function BaseTemporalField(kwargs) {
  kwargs = extend({inputFormats: null}, kwargs || {});
  Field.call(this, kwargs);
  if (kwargs.inputFormats !== null) {
    this.inputFormats = kwargs.inputFormats;
  }
}
inheritFrom(BaseTemporalField, Field);

/**
 * Validates that its input is a valid date or time.
 * @param {String|Date}
 * @return {Date}
 */
BaseTemporalField.prototype.toJavaScript = function(value) {
  if (!(value instanceof Date)) {
    value = strip(value)
  }
  if (isString(value)) {
    for (var i = 0, l = this.inputFormats.length; i < l; i++) {
      try {
        return this.strpdate(value, this.inputFormats[i]);
      }
      catch (e) {
        continue;
      }
    }
  }
  throw ValidationError(this.errorMessages.invalid);
};

/**
 * Creates a Date from the given input if it's valid based on a format.
 * @param {String} value
 * @param {String} format
 * @return {Date}
 */
BaseTemporalField.prototype.strpdate = function(value, format) {
  return time.strpdate(value, format);
};

/**
 * Validates that its input is a date.
 * @constructor
 * @extends {BaseTemporalField}
 */
function DateField(kwargs) {
  if (!(this instanceof Field)) return new DateField(kwargs);
  BaseTemporalField.call(this, kwargs);
}
inheritFrom(DateField, BaseTemporalField);
DateField.prototype.widget = DateInput;
DateField.prototype.inputFormats = DEFAULT_DATE_INPUT_FORMATS;
DateField.prototype.defaultErrorMessages =
    extend({}, DateField.prototype.defaultErrorMessages, {
      invalid: 'Enter a valid date.'
    });

/**
 * Validates that the input can be converted to a date.
 * @param {String|Date} value the value to be validated.
 * @return {?Date} a with its year, month and day attributes set, or null for
 *     empty values when they are allowed.
 */
DateField.prototype.toJavaScript = function(value) {
  if (contains(EMPTY_VALUES, value)) {
    return null;
  }
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  return BaseTemporalField.prototype.toJavaScript.call(this, value);
};

/**
 * Validates that its input is a time.
 * @constructor
 * @extends {BaseTemporalField}
 */
function TimeField(kwargs) {
  if (!(this instanceof Field)) return new TimeField(kwargs);
  BaseTemporalField.call(this, kwargs);
}
inheritFrom(TimeField, BaseTemporalField);
TimeField.prototype.widget = TimeInput;
TimeField.prototype.inputFormats = DEFAULT_TIME_INPUT_FORMATS;
TimeField.prototype.defaultErrorMessages =
    extend({}, TimeField.prototype.defaultErrorMessages, {
      invalid: 'Enter a valid time.'
    });

/**
 * Validates that the input can be converted to a time.
 * @param {String|Date} value the value to be validated.
 * @return {?Date} a Date with its hour, minute and second attributes set, or
 *     null for empty values when they are allowed.
 */
TimeField.prototype.toJavaScript = function(value) {
  if (contains(EMPTY_VALUES, value)) {
    return null;
  }
  if (value instanceof Date) {
    return new Date(1900, 0, 1, value.getHours(), value.getMinutes(), value.getSeconds());
  }
  return BaseTemporalField.prototype.toJavaScript.call(this, value);
};

/**
 * Creates a Date representing a time from the given input if it's valid based
 * on the format.
 * @param {String} value
 * @param {String} format
 * @return {Date}
 */
TimeField.prototype.strpdate = function(value, format) {
  var t = time.strptime(value, format);
  return new Date(1900, 0, 1, t[3], t[4], t[5]);
};

/**
 * Validates that its input is a date/time.
 * @constructor
 * @extends {BaseTemporalField}
 */
function DateTimeField(kwargs) {
  if (!(this instanceof Field)) return new DateTimeField(kwargs);
  BaseTemporalField.call(this, kwargs);
}
inheritFrom(DateTimeField, BaseTemporalField);
DateTimeField.prototype.widget = DateTimeInput;
DateTimeField.prototype.inputFormats = DEFAULT_DATETIME_INPUT_FORMATS;
DateTimeField.prototype.defaultErrorMessages =
    extend({}, DateTimeField.prototype.defaultErrorMessages, {
      invalid: 'Enter a valid date/time.'
    });

/**
 * @param {String|Date|Array.<Date>}
 * @return {?Date}
 */
DateTimeField.prototype.toJavaScript = function(value) {
  if (contains(EMPTY_VALUES, value)) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (isArray(value)) {
    // Input comes from a SplitDateTimeWidget, for example, so it's two
    // components: date and time.
    if (value.length != 2) {
      throw ValidationError(this.errorMessages.invalid);
    }
    if (contains(EMPTY_VALUES, value[0]) &&
        contains(EMPTY_VALUES, value[1])) {
      return null;
    }
    value = value.join(' ');
  }
  return BaseTemporalField.prototype.toJavaScript.call(this, value);
};

/**
 * Validates that its input matches a given regular expression.
 *
 * @param regex a <code>RegExp</code> or a <code>String</code> containing a
 *              pattern. If a <code>String</code> is given, it will be compiled
 *              to a <code>RegExp</code>.
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Field} and {@link CharField}.
 * @constructor
 */
function RegexField(regex, kwargs) {
  if (!(this instanceof Field)) return new RegexField(regex, kwargs);
  CharField.call(this, kwargs);
  if (isString(regex)) {
    regex = new RegExp(regex);
  }
  this.regex = regex;
  this.validators.push(RegexValidator(this.regex));
}
inheritFrom(RegexField, CharField);

/**
 * Validates that its input appears to be a valid e-mail address.
 *
 * @constructor
 */
function EmailField(kwargs) {
  if (!(this instanceof Field)) return new EmailField(kwargs);
  CharField.call(this, kwargs);
}
inheritFrom(EmailField, CharField);
EmailField.prototype.defaultValidators = [validateEmail];
EmailField.prototype.defaultErrorMessages =
    extend({}, EmailField.prototype.defaultErrorMessages, {
      invalid: 'Enter a valid e-mail address.'
    });

EmailField.prototype.clean = function(value) {
  value = strip(this.toJavaScript(value));
  return CharField.prototype.clean.call(this, value);
};

/**
 * Validates that its input is a valid uploaded file.
 *
 * This field is mostly meaningless on the client-side, but is included for
 * future use in any future server-side implementation.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Field}.
 * @config {Boolean} [allowEmptyFile] <code>true</code> if empty files are
 *                                    allowed = defaults to <code>false</code>.
 * @constructor
 */
function FileField(kwargs) {
  if (!(this instanceof Field)) return new FileField(kwargs);
  kwargs = extend({maxLength: null, allowEmptyFile: false}, kwargs);
  this.maxLength = kwargs.maxLength;
  this.allowEmptyFile = kwargs.allowEmptyFile;
  delete kwargs.maxLength;
  Field.call(this, kwargs);
}
inheritFrom(FileField, Field);
FileField.prototype.widget = ClearableFileInput;
FileField.prototype.defaultErrorMessages =
    extend({}, FileField.prototype.defaultErrorMessages, {
      invalid: 'No file was submitted. Check the encoding type on the form.'
    , missing: 'No file was submitted.'
    , empty: 'The submitted file is empty.'
    , maxLength: 'Ensure this filename has at most %(max)d characters (it has %(length)d).'
    , contradicton: 'Please either submit a file or check the clear checkbox, not both.'
    });

FileField.prototype.toJavaScript = function(data, initial) {
  if (contains(EMPTY_VALUES, data)) {
    return null;
  }
  // UploadedFile objects should have name and size attributes
  if (typeof data.name == 'undefined' || typeof data.size == 'undefined') {
    throw ValidationError(this.errorMessages.invalid);
  }

  var fileName = data.name
    , fileSize = data.size;

  if (this.maxLength !== null && fileName.length > this.maxLength) {
    throw ValidationError(format(this.errorMessages.maxLength, {
                            max: this.maxLength
                          , length: fileName.length
                          }));
  }
  if (!fileName) {
    throw ValidationError(this.errorMessages.invalid);
  }
  if (!this.allowEmptyFile && !fileSize) {
    throw ValidationError(this.errorMessages.empty);
  }
  return data;
};

FileField.prototype.clean = function(data, initial) {
  // If the widget got contradictory inputs, we raise a validation error
  if (data === FILE_INPUT_CONTRADICTION) {
    throw ValidationError(this.errorMessages.contradiction);
  }
  // false means the field value should be cleared; further validation is
  // not needed.
  if (data === false) {
    if (!this.required) {
      return false;
    }
    // If the field is required, clearing is not possible (the widget
    // shouldn't return false data in that case anyway). False is not
    // in EMPTY_VALUES; if a False value makes it this far it should be
    // validated from here on out as null (so it will be caught by the
    // required check).
    data = null;
  }
  if (!data && initial) {
    return initial;
  }
  return CharField.prototype.clean.call(this, data);
};

FileField.prototype.boundData = function(data, initial) {
  if (data === null || data === FILE_INPUT_CONTRADICTION) {
    return initial;
  }
  return data;
};

/**
 * Validates that its input is a valid uploaded image.
 *
 * This field is mostly meaningless on the client-side, but is included for
 * future use in any future server-side implementation.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link FileField}.
 * @constructor
 */
function ImageField(kwargs) {
  if (!(this instanceof Field)) return new ImageField(kwargs);
  FileField.call(this, kwargs);
}
inheritFrom(ImageField, FileField);
ImageField.prototype.defaultErrorMessages =
    extend({}, ImageField.prototype.defaultErrorMessages, {
      invalidImage: 'Upload a valid image. The file you uploaded was either not an image or a corrupted image.'
    });

/**
 * Checks that the file-upload field data contains a valid image.
 */
ImageField.prototype.toJavaScript = function(data, initial) {
  var f = FileField.prototype.toJavaScript.call(this, data, initial);
  if (f === null) {
    return null;
  }

  // TODO Plug in image processing code when newforms can be run on the backend

  return f;
};

/**
 * Validates that its input appears to be a valid URL.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link CharField}.
 * @config {Boolean} [verifyExists] should the field attempt to verify if the
 *                                  address exists by accessing it? Defaults to
 *                                  <code>false</code>.
 * @config {String} [userAgent] the user agent string to use when attempting URL
 *                              verification.
 * @constructor
 */
function URLField(kwargs) {
  if (!(this instanceof Field)) return new URLField(kwargs);
  kwargs = extend({
    verifyExists: false, validatorUserAgent: URL_VALIDATOR_USER_AGENT
  }, kwargs || {});
  CharField.call(this, kwargs);
  this.validators.push(URLValidator({
                         verifyExists: kwargs.verifyExists
                       , validatorUserAgent: kwargs.validatorUserAgent
                       }));
}
inheritFrom(URLField, CharField);
URLField.prototype.defaultErrorMessages =
    extend({}, URLField.prototype.defaultErrorMessages, {
      invalid: 'Enter a valid URL.'
    , invalidLink: 'This URL appears to be a broken link.'
    });

URLField.prototype.toJavaScript = function(value) {
  if (value) {
    var urlFields = urlparse.urlsplit(value);
    if (!urlFields.scheme) {
      // If no URL scheme given, assume http://
      urlFields.scheme = 'http';
    }
    if (!urlFields.netloc) {
      // Assume that if no domain is provided, that the path segment
      // contains the domain.
      urlFields.netloc = urlFields.path;
      urlFields.path = '';
      // Rebuild the urlFields list, since the domain segment may now
      // contain the path too.
      value = urlparse.urlunsplit(urlFields);
      urlFields = urlparse.urlsplit(value);
    }
    if (!urlFields.path) {
      // the path portion may need to be added before query params
      urlFields.path = '/';
    }
    value = urlparse.urlunsplit(urlFields);
  }
  return CharField.prototype.toJavaScript.call(this, value);
};

/**
 * Normalises its input to a <code>Boolean</code> primitive.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Field}.
 * @constructor
 */
function BooleanField(kwargs) {
  if (!(this instanceof Field)) return new BooleanField(kwargs);
  Field.call(this, kwargs);
}
inheritFrom(BooleanField, Field);
BooleanField.prototype.widget = CheckboxInput;

BooleanField.prototype.toJavaScript = function(value) {
  // Explicitly check for a 'false' string, which is what a hidden field will
  // submit for false. Also check for '0', since this is what RadioSelect will
  // provide. Because Boolean('anything') == true, we don't need to handle that
  // explicitly.
  if (isString(value) && (value.toLowerCase() == 'false' || value == '0')) {
    value = false;
  }
  else {
    value = Boolean(value);
  }
  value = Field.prototype.toJavaScript.call(this, value);
  if (!value && this.required) {
    throw ValidationError(this.errorMessages.required);
  }
  return value;
};

/**
 * A field whose valid values are <code>null</code>, <code>true</code> and
 * <code>false</code>. Invalid values are cleaned to <code>null</code>.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link BooleanField}.
 * @constructor
 */
function NullBooleanField(kwargs) {
  if (!(this instanceof Field)) return new NullBooleanField(kwargs);
  BooleanField.call(this, kwargs);
}
inheritFrom(NullBooleanField, BooleanField);
NullBooleanField.prototype.widget = NullBooleanSelect;

NullBooleanField.prototype.toJavaScript = function(value) {
  // Explicitly checks for the string 'True' and 'False', which is what a
  // hidden field will submit for true and false, and for '1' and '0', which
  // is what a RadioField will submit. Unlike the Booleanfield we also need
  // to check for true, because we are not using Boolean() function.
  if (value === true || value == 'True' || value == 'true' || value == '1') {
    return true;
  }
  else if (value === false || value == 'False' || value == 'false' || value == '0') {
    return false;
  }
  return null;
};

NullBooleanField.prototype.validate = function(value) {};

/**
 * Validates that its input is one of a valid list of choices.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Array} [choices] a list of choices - each choice should be specified
 *                           as a list containing two items; the first item is
 *                           a value which should be validated against, the
 *                           second item is a display value for that choice, for
 *                           example:
 *                           <code>{choices: [[1, 'One'], [2, 'Two']]}</code>.
 *                           Defaults to an empty <code>Array</code>.
 * @constructor
 */
function ChoiceField(kwargs) {
  if (!(this instanceof Field)) return new ChoiceField(kwargs);
  kwargs = extend({choices: []}, kwargs || {});
  Field.call(this, kwargs);
  this.setChoices(kwargs.choices);
}
inheritFrom(ChoiceField, Field);
ChoiceField.prototype.widget = Select;
ChoiceField.prototype.defaultErrorMessages =
    extend({}, ChoiceField.prototype.defaultErrorMessages, {
      invalidChoice: 'Select a valid choice. %(value)s is not one of the available choices.'
    });
ChoiceField.prototype.choices = function() { return this._choices; };
ChoiceField.prototype.setChoices = function(choices) {
  // Setting choices also sets the choices on the widget
  this._choices = this.widget.choices = choices;
};

ChoiceField.prototype.toJavaScript = function(value) {
  if (contains(EMPTY_VALUES, value)) {
    return '';
  }
  return ''+value;
};

/**
 * Validates that the given value is in this field's choices.
 */
ChoiceField.prototype.validate = function(value) {
  Field.prototype.validate.call(this, value);
  if (value && !this.validValue(value)) {
    throw ValidationError(
        format(this.errorMessages.invalidChoice, {value: value}));
  }
};

/**
 * Checks to see if the provided value is a valid choice.
 *
 * @param {String} value the value to be validated.
 */
ChoiceField.prototype.validValue = function(value) {
  var choices = this.choices();
  for (var i = 0, l = choices.length; i < l; i++) {
    if (isArray(choices[i][1])) {
      // This is an optgroup, so look inside the group for options
      var optgroupChoices = choices[i][1];
      for (var j = 0, k = optgroupChoices.length; j < k; j++) {
        if (value === ''+optgroupChoices[j][0]) {
          return true;
        }
      }
    }
    else if (value === ''+choices[i][0]) {
      return true;
    }
  }
  return false;
};

/**
 * A {@link ChoiceField} which returns a value coerced by some provided
 * function.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link ChoiceField}.
 * @config {Function} [coerce] a function which takes the String value output by
 *                             ChoiceField's clean method and coerces it to
 *                             another type - defaults to a function which
 *                             returns the given value unaltered.
 * @config {Object} [emptyValue] the value which should be returned if the
 *                               selected value can be validly empty - defaults
 *                               to an empty string.
 * @constructor
 */
function TypedChoiceField(kwargs) {
  if (!(this instanceof Field)) return new TypedChoiceField(kwargs);
  kwargs = extend({
    coerce: function(val) { return val; }, emptyValue: ''
  }, kwargs || {});
  this.coerce = kwargs.coerce;
  this.emptyValue = kwargs.emptyValue;
  delete kwargs.coerce;
  delete kwargs.emptyValue;
  ChoiceField.call(this, kwargs);
}
inheritFrom(TypedChoiceField, ChoiceField);

TypedChoiceField.prototype.toJavaScript = function(value) {
  var value = ChoiceField.prototype.toJavaScript.call(this, value);
  ChoiceField.prototype.validate.call(this, value);
  if (value === this.emptyValue || contains(EMPTY_VALUES, value)) {
    return this.emptyValue;
  }
  try {
    value = this.coerce(value);
  }
  catch (e) {
    throw ValidationError(
        format(this.errorMessages.invalidChoice, {value: value}));
  }
  return value;
};

TypedChoiceField.prototype.validate = function(value) {};

/**
 * Validates that its input is one or more of a valid list of choices.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link ChoiceField}.
 * @constructor
 */
function MultipleChoiceField(kwargs) {
  if (!(this instanceof Field)) return new MultipleChoiceField(kwargs);
  ChoiceField.call(this, kwargs);
}
inheritFrom(MultipleChoiceField, ChoiceField);
MultipleChoiceField.prototype.widget = SelectMultiple;
MultipleChoiceField.prototype.hiddenWidget = MultipleHiddenInput;
MultipleChoiceField.prototype.defaultErrorMessages =
    extend({}, MultipleChoiceField.prototype.defaultErrorMessages, {
      invalidChoice: 'Select a valid choice. %(value)s is not one of the available choices.'
    , invalidList: 'Enter a list of values.'
    });

MultipleChoiceField.prototype.toJavaScript = function(value) {
  if (!value) {
    return [];
  }
  else if (!(isArray(value))) {
    throw ValidationError(this.errorMessages.invalidList);
  }
  var stringValues = [];
  for (var i = 0, l = value.length; i < l; i++) {
    stringValues.push(''+value[i]);
  }
  return stringValues;
};

/**
 * Validates that the input is a list and that each item is in this field's
 * choices.
 */
MultipleChoiceField.prototype.validate = function(value) {
  if (this.required && !value.length) {
    throw ValidationError(this.errorMessages.required);
  }
  for (var i = 0, l = value.length; i < l; i++) {
    if (!this.validValue(value[i])) {
      throw ValidationError(
          format(this.errorMessages.invalidChoice, {value: value[i]}));
    }
  }
};

/**
 * A {@link MultipleChoiceField} which returns values coerced by some provided
 * function.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link MultipleChoiceField}.
 * @config {Function} [coerce] a function which takes the String values output
 *                             by MultipleChoiceField's toJavaScript method and
 *                             coerces it to another type - defaults to a
 *                             function which returns the given value unaltered.
 * @config {Object} [emptyValue] the value which should be returned if the
 *                               selected value can be validly empty - defaults
 *                               to an empty string.
 * @constructor
 */
function TypedMultipleChoiceField(kwargs) {
  if (!(this instanceof Field)) return new TypedMultipleChoiceField(kwargs);
  kwargs = extend({
    coerce: function(val) { return val; }, emptyValue: []
  }, kwargs || {});
  this.coerce = kwargs.coerce;
  this.emptyValue = kwargs.emptyValue;
  delete kwargs.coerce;
  delete kwargs.emptyValue;
  MultipleChoiceField.call(this, kwargs);
}
inheritFrom(TypedMultipleChoiceField, MultipleChoiceField);

TypedMultipleChoiceField.prototype.toJavaScript = function(value) {
  value = MultipleChoiceField.prototype.toJavaScript.call(this, value);
  MultipleChoiceField.prototype.validate.call(this, value);
  if (value === this.emptyValue || contains(EMPTY_VALUES, value) ||
      (isArray(value) && !value.length)) {
    return this.emptyValue;
  }
  var newValue = [];
  for (var i = 0, l = value.length; i < l; i++) {
    try {
      newValue.push(this.coerce(value[i]));
    }
    catch (e) {
      throw ValidationError(
          format(this.errorMessages.invalidChoice, {value: value[i]}));
    }
  }
  return newValue;
};

TypedMultipleChoiceField.prototype.validate = function(value) {};

/**
 * A Field whose <code>clean()</code> method calls multiple Field
 * <code>clean()</code> methods.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Array} [fields] fields which will be used to perform cleaning in the
 *                          order they're given in.
 * @constructor
 */
function ComboField(kwargs) {
  if (!(this instanceof Field)) return new ComboField(kwargs);
  kwargs = extend({fields: []}, kwargs || {});
  Field.call(this, kwargs);
  // Set required to False on the individual fields, because the required
  // validation will be handled by ComboField, not by those individual fields.
  for (var i = 0, l = kwargs.fields.length; i < l; i++) {
    kwargs.fields[i].required = false;
  }
  this.fields = kwargs.fields;
}
inheritFrom(ComboField, Field);

ComboField.prototype.clean = function(value) {
  Field.prototype.clean.call(this, value);
  for (var i = 0, l = this.fields.length; i < l; i++) {
    value = this.fields[i].clean(value);
  }
  return value;
};

/**
 * A Field that aggregates the logic of multiple Fields.
 *
 * Its <code>clean()</code> method takes a "decompressed" list of values, which
 * are then cleaned into a single value according to <code>this.fields</code>.
 * Each value in this list is cleaned by the corresponding field -- the first
 * value is cleaned by the first field, the second value is cleaned by the
 * second field, etc. Once all fields are cleaned, the list of clean values is
 * "compressed" into a single value.
 *
 * Subclasses should not have to implement <code>clean()</code>. Instead, they
 * must implement <code>compress()</code>, which takes a list of valid values
 * and returns a "compressed" version of those values -- a single value.
 *
 * You'll probably want to use this with {@link MultiWidget}.
 *
 * @param {Object} [kwargs] configuration options additional to those supplied
 *                          in {@link Field}.
 * @config {Array} [fields] a list of fields to be used to clean a
 *                          "decompressed" list of values.
 * @constructor
 */
function MultiValueField(kwargs) {
  if (!(this instanceof Field)) return new MultiValueField(kwargs);
  kwargs = extend({fields: []}, kwargs || {});
  Field.call(this, kwargs);
  // Set required to false on the individual fields, because the required
  // validation will be handled by MultiValueField, not by those individual
  // fields.
  for (var i = 0, l = kwargs.fields.length; i < l; i++) {
    kwargs.fields[i].required = false;
  }
  this.fields = kwargs.fields;
}
inheritFrom(MultiValueField, Field);
MultiValueField.prototype.defaultErrorMessages =
    extend({}, MultiValueField.prototype.defaultErrorMessages, {
      invalid: 'Enter a list of values.'
    });

MultiValueField.prototype.validate = function() {};

/**
 * Validates every value in the given list. A value is validated against the
 * corresponding Field in <code>this.fields</code>.
 *
 * For example, if this MultiValueField was instantiated with
 * <code>{fields: [forms.DateField(), forms.TimeField()]}, <code>clean()</code>
 * would call <code>DateField.clean(value[0])</code> and
 * <code>TimeField.clean(value[1])<code>.
 *
 * @param {Array} value the input to be validated.
 *
 * @return the result of calling <code>compress()</code> on the cleaned input.
 */
MultiValueField.prototype.clean = function(value) {
  var cleanData = []
    , errors = [];

  if (!value || isArray(value)) {
    var allValuesEmpty = true;
    if (isArray(value)) {
      for (var i = 0, l = value.length; i < l; i++) {
        if (value[i]) {
          allValuesEmpty = false;
          break;
        }
      }
    }

    if (!value || allValuesEmpty) {
      if (this.required) {
        throw ValidationError(this.errorMessages.required);
      }
      else {
        return this.compress([]);
      }
    }
  }
  else {
    throw ValidationError(this.errorMessages.invalid);
  }

  for (var i = 0, l = this.fields.length; i < l; i++) {
    var field = this.fields[i]
      , fieldValue = value[i];
    if (fieldValue === undefined) {
      fieldValue = null;
    }
    if (this.required && contains(EMPTY_VALUES, fieldValue)) {
      throw ValidationError(this.errorMessages.required);
    }
    try {
      cleanData.push(field.clean(fieldValue));
    }
    catch (e) {
      if (!(e instanceof ValidationError)) {
        throw e;
      }
      errors = errors.concat(e.messages);
    }
  }

  if (errors.length !== 0) {
    throw ValidationError(errors);
  }

  var out = this.compress(cleanData);
  this.validate(out);
  return out;
};

/**
 * Returns a single value for the given list of values. The values can be
 * assumed to be valid.
 *
 * For example, if this MultiValueField was instantiated with
 * <code>{fields: [forms.DateField(), forms.TimeField()]}</code>, this might
 * return a <code>Date</code> object created by combining the date and time in
 * <code>dataList</code>.
 *
 * @param {Array} dataList
 */
MultiValueField.prototype.compress = function(dataList) {
  throw new Error('Subclasses must implement this method.');
};

/**
 * Allows choosing from files inside a certain directory.
 *
 * @param {String} path The absolute path to the directory whose contents you
 *                      want listed - this directory must exist.
 * @param {Object} [kwargs] configuration options additional to those supplied
 *                          in {@link ChoiceField}.
 * @config {String} [match] a regular expression pattern - if provided, only
 *                          files with names matching this expression will be
 *                          allowed as choices.
 * @config {Boolean} [recursive] if <code>true</code>, the directory will be
 *                               descended into recursively and all descendants
 *                               will be listed as choices - defaults to
 *                               <code>false</code>.
 * @constructor
 */
function FilePathField(path, kwargs) {
  if (!(this instanceof Field)) return new FilePathField(path, kwargs);
  kwargs = extend({
    match: null, recursive: false, required: true, widget: null,
    label: null, initial: null, helpText: null
  }, kwargs);

  this.path = path;
  this.match = kwargs.match;
  this.recursive = kwargs.recursive;
  delete kwargs.match;
  delete kwargs.recursive;

  kwargs.choices = [];
  ChoiceField.call(this, kwargs);

  if (this.required) {
    this.setChoices([]);
  }
  else {
    this.setChoices([['', '---------']]);
  }
  if (this.match !== null) {
    this.matchRE = new RegExp(this.match);
  }

  // TODO Plug in file paths when newforms can be run on the backend

  this.widget.choices = this.choices();
}
inheritFrom(FilePathField, ChoiceField);

/**
 * A {@link MultiValueField} consisting of a {@link DateField} and a
 * {@link TimeField}.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Field} and {@link MultiValueField}.
 * @constructor
 */
function SplitDateTimeField(kwargs) {
  if (!(this instanceof Field)) return new SplitDateTimeField(kwargs);
  kwargs = extend({
    inputDateFormats: null, inputTimeFormats: null
  }, kwargs || {});
  var errors = extend({}, this.defaultErrorMessages);
  if (typeof kwargs.errorMessages != 'undefined') {
    extend(errors, kwargs.errorMessages);
  }
  kwargs.fields = [
    DateField({inputFormats: kwargs.inputDateFormats,
               errorMessages: {invalid: errors.invalidDate}})
  , TimeField({inputFormats: kwargs.inputDateFormats,
               errorMessages: {invalid: errors.invalidTime}})
  ];
  MultiValueField.call(this, kwargs);
}
inheritFrom(SplitDateTimeField, MultiValueField);
SplitDateTimeField.prototype.widget = SplitDateTimeWidget;
SplitDateTimeField.prototype.hiddenWidget = SplitHiddenDateTimeWidget;
SplitDateTimeField.prototype.defaultErrorMessages =
    extend({}, SplitDateTimeField.prototype.defaultErrorMessages, {
      invalidDate: 'Enter a valid date.'
    , invalidTime: 'Enter a valid time.'
    });

/**
 * Validates that, if given, its input does not contain empty values.
 *
 * @param {Array} [dataList] a two-item list consisting of two <code>Date</code>
 *                           objects, the first of which represents a date, the
 *                           second a time.
 *
 * @return a <code>Date</code> object representing the given date and time, or
 *         <code>null</code> for empty values.
 */
SplitDateTimeField.prototype.compress = function(dataList) {
  if (isArray(dataList) && dataList.length > 0) {
    var d = dataList[0], t = dataList[1];
    // Raise a validation error if date or time is empty (possible if
    // SplitDateTimeField has required == false).
    if (contains(EMPTY_VALUES, d)) {
      throw ValidationError(this.errorMessages.invalidDate);
    }
    if (contains(EMPTY_VALUES, t)) {
      throw ValidationError(this.errorMessages.invalidTime);
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(),
                    t.getHours(), t.getMinutes(), t.getSeconds());
  }
  return null;
};

/**
 * Validates that its input is a valid IPv4 address.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Field} and {@link CharField}.
 * @constructor
 */
function IPAddressField(kwargs) {
  if (!(this instanceof Field)) return new IPAddressField(kwargs);
  CharField.call(this, kwargs);
}
inheritFrom(IPAddressField, CharField);
IPAddressField.prototype.defaultValidators = [validateIPV4Address];
IPAddressField.prototype.defaultErrorMessages =
    extend({}, IPAddressField.prototype.defaultErrorMessages, {
      invalid: 'Enter a valid IPv4 address.'
    });

/**
 * Validates that its input is a valid slug.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Field} and {@link CharField}.
 * @constructor
 */
function SlugField(kwargs) {
  if (!(this instanceof Field)) return new SlugField(kwargs);
  CharField.call(this, kwargs);
}
inheritFrom(SlugField, CharField);
SlugField.prototype.defaultValidators = [validateSlug];
SlugField.prototype.defaultErrorMessages =
    extend({}, SlugField.prototype.defaultErrorMessages, {
      invalid: "Enter a valid 'slug' consisting of letters, numbers, underscores or hyphens."
    });

/** Property under which non-field-specific errors are stored. */
var NON_FIELD_ERRORS = '__all__';

/**
 * A field and its associated data.
 *
 * @param {Form} form a form.
 * @param {Field} field one of the form's fields.
 * @param {String} name the name under which the field is held in the form.
 * @constructor
 */
function BoundField(form, field, name) {
  if (!(this instanceof BoundField)) return new BoundField(form, field, name);
  this.form = form;
  this.field = field;
  this.name = name;
  this.htmlName = form.addPrefix(name);
  this.htmlInitialName = form.addInitialPrefix(name);
  this.htmlInitialId = form.addInitialPrefix(this.autoId());
  this.label = this.field.label !== null ? this.field.label : prettyName(name);
  this.helpText = field.helpText || '';
}

BoundField.prototype = {
  /*get */errors: function() {
    return this.form.errors(this.name) || new this.form.errorConstructor();
  }

, /*get */isHidden: function() {
    return this.field.widget.isHidden;
  }

  /**
   * Calculates and returns the <code>id</code> attribute for this BoundFIeld
   * if the associated form has an autoId. Returns an empty string otherwise.
   */
, /*get */autoId: function() {
    var autoId = this.form.autoId;
    if (autoId) {
      autoId = ''+autoId;
      if (autoId.indexOf('%(name)s') != -1) {
        return format(autoId, {name: this.htmlName});
      }
      return this.htmlName;
    }
    return '';
  }

  /**
   * Returns the data for this BoundFIeld, or <code>null</code> if it wasn't
   * given.
   */
, /*get */data: function() {
    return this.field.widget.valueFromData(this.form.data,
                                           this.form.files,
                                           this.htmlName);
  }

  /**
   * Wrapper around the field widget's <code>idForLabel</code> method.
   * Useful, for example, for focusing on this field regardless of whether
   * it has a single widget or a MutiWidget.
   */
, /*get */idForLabel: function() {
    var widget = this.field.widget
      , id = getDefault(widget.attrs, 'id', this.autoId());
    return widget.idForLabel(id);
  }
};

/**
 * Assuming this method will only be used when DOMBuilder is configured to
 * generate HTML.
 */
BoundField.prototype.toString = function() {
  return ''+this.defaultRendering();
};

BoundField.prototype.defaultRendering = function() {
  if (this.field.showHiddenInitial) {
    return DOMBuilder.fragment(this.asWidget(),
                               this.asHidden({onlyInitial: true}));
  }
  return this.asWidget();
};

/**
 * Renders a widget for the field.
 *
 * @param {Object} [kwargs] configuration options
 * @config {Widget} [widget] an override for the widget used to render the field
 *                           - if not provided, the field's configured widget
 *                           will be used
 * @config {Object} [attrs] additional attributes to be added to the field's
 *                          widget.
 */
BoundField.prototype.asWidget = function(kwargs) {
  kwargs = extend({
    widget: null, attrs: null, onlyInitial: false
  }, kwargs || {});
  var widget = (kwargs.widget !== null ? kwargs.widget : this.field.widget)
    , attrs = (kwargs.attrs !== null ? kwargs.attrs : {})
    , autoId = this.autoId()
    , name = !kwargs.onlyInitial ? this.htmlName : this.htmlInitialName;
  if (autoId &&
      typeof attrs.id == 'undefined' &&
      typeof widget.attrs.id == 'undefined') {
    attrs.id = (!kwargs.onlyInitial ? autoId : this.htmlInitialId);
  }

  return widget.render(name, this.value(), {attrs: attrs});
};

/**
 * Renders the field as a text input.
 *
 * @param {Object} [kwargs] widget options.
 */
BoundField.prototype.asText = function(kwargs) {
  kwargs = extend({}, kwargs || {}, {widget: TextInput()});
  return this.asWidget(kwargs);
};

/**
 * Renders the field as a textarea.
 *
 * @param {Object} [kwargs] widget options.
 */
BoundField.prototype.asTextarea = function(kwargs) {
  kwargs = extend({}, kwargs || {}, {widget: Textarea()});
  return this.asWidget(kwargs);
};

/**
 * Renders the field as a hidden field.
 *
 * @param {Object} [attrs] additional attributes to be added to the field's
 *                         widget.
 */
BoundField.prototype.asHidden = function(kwargs) {
  kwargs = extend({}, kwargs || {}, {widget: new this.field.hiddenWidget()});
  return this.asWidget(kwargs);
};

/**
 * Returns the value for this BoundField, using the initial value if the form
 * is not bound or the data otherwise.
 */
BoundField.prototype.value = function() {
  var data;
  if (!this.form.isBound) {
    data = getDefault(this.form.initial, this.name, this.field.initial);
    if (isFunction(data)) {
      data = data();
    }
  }
  else {
    data = this.field.boundData(this.data(),
                                getDefault(this.form.initial,
                                           this.name,
                                           this.field.initial));
  }
  return this.field.prepareValue(data);
};

/**
 * Wraps the given contents in a &lt;label&gt;, if the field has an ID
 * attribute. Does not HTML-escape the contents. If contents aren't given, uses
 * the field's HTML-escaped label.
 *
 * If attrs are given, they're used as HTML attributes on the <label> tag.
 *
 * @param {Object} [kwargs] configuration options.
 * @config {String} [contents] contents for the label - if not provided, label
 *                             contents will be generated from the field itself.
 * @config {Object} [attrs] additional attributes to be added to the label.
 */
BoundField.prototype.labelTag = function(kwargs) {
  kwargs = extend({contents: null, attrs: null}, kwargs || {});
  var contents, widget = this.field.widget, id, attrs;
  if (kwargs.contents !== null) {
    contents = kwargs.contents;
  }
  else {
    contents = this.label;
  }

  id = getDefault(widget.attrs, 'id', this.autoId());
  if (id) {
    attrs = extend(kwargs.attrs || {},
                   {'for': widget.idForLabel(id)});
    contents = DOMBuilder.createElement('label', attrs, [contents]);
  }
  return contents;
};

/**
 * Returns a string of space-separated CSS classes for this field.
 */
BoundField.prototype.cssClasses = function(extraClasses) {
  extraClasses = extraClasses || null;
  if (extraClasses !== null && isFunction(extraClasses.split)) {
    extraClasses = extraClasses.split();
  }
  extraClasses = extraClasses || [];
  if (this.errors().isPopulated() &&
      typeof this.form.errorCssClass != 'undefined') {
    extraClasses.push(this.form.errorCssClass);
  }
  if (this.field.required && typeof this.form.requiredCssClass != 'undefined') {
    extraClasses.push(this.form.requiredCssClass);
  }
  return extraClasses.join(' ');
};

/**
 * A collection of Fields that knows how to validate and display itself.
 *
 * @param {Object} [kwargs] configuration options.
 * @config {Object} [data] input form data, where property names are field
 *                         names.
 * @config {Object} [files] input file data - this is meaningless on the
 *                          client-side, but is included for future use in any
 *                          future server-side implementation.
 * @config {String} [autoId] a template for use when automatically generating
 *                           <code>id</code> attributes for fields, which should
 *                           contain a <code>%(name)s</code> placeholder for
 *                           the field name - defaults to
 *                           <code>id_%(name)s</code>.
 * @config {String} [prefix] a prefix to be applied to the name of each field in
 *                           this instance of the form - using a prefix allows
 *                           you to easily work with multiple instances of the
 *                           same Form object in the same HTML
 *                           <code>&lt;form&gt;</code>, or to safely mix Form
 *                           objects which have fields with the same names.
 * @config {Object} [initial] initial form data, where property names are field
 *                            names - if a field's value is not specified in
 *                            <code>data</code>, these values will be used when
 *                            rendering field widgets.
 * @config {Function} [errorConstructor] the constructor function to be used
 *                                       when creating error details - defaults
 *                                       to {@link ErrorList}.
 * @config {String} [labelSuffix] a suffix to be used when generating labels
 *                                in one of the convenience method which renders
 *                                the entire Form - defaults to
 *                                <code>:</code>.
 * @config {Boolean} [emptyPermitted] if <code>true</code>, the form is allowed
 *                                    to be empty - defaults to
 *                                    <code>false</code>.
 * @constructor
 */
function BaseForm(kwargs) {
  kwargs = extend({
    data: null, files: null, autoId: 'id_%(name)s', prefix: null,
    initial: null, errorConstructor: ErrorList, labelSuffix: ':',
    emptyPermitted: false
  }, kwargs || {});
  this.isBound = kwargs.data !== null || kwargs.files !== null;
  this.data = kwargs.data || {};
  this.files = kwargs.files || {};
  this.autoId = kwargs.autoId;
  this.prefix = kwargs.prefix;
  this.initial = kwargs.initial || {};
  this.errorConstructor = kwargs.errorConstructor;
  this.labelSuffix = kwargs.labelSuffix;
  this.emptyPermitted = kwargs.emptyPermitted;
  this._errors = null; // Stores errors after clean() has been called
  this._changedData = null;

  // The baseFields  attribute is the *prototype-wide* definition of fields.
  // Because a particular *instance* might want to alter this.fields, we
  // create this.fields here by deep copying baseFields. Instances should
  // always modify this.fields; they should not modify baseFields.
  this.fields = copy.deepCopy(this.baseFields);
}

BaseForm.prototype = {
  /**
   * Getter for errors, which first cleans the form if there are no errors
   * defined yet.
   *
   * @return errors for the data provided for the form.
   */
  /*get */errors: function(name) {
    if (this._errors === null) {
      this.fullClean();
    }
    if (name) {
      return this._errors.get(name);
    }
    return this._errors;
  }

, /*get */changedData: function() {
    if (this._changedData === null) {
      this._changedData = [];
      // XXX: For now we're asking the individual fields whether or not
      // the data has changed. It would probably be more efficient to hash
      // the initial data, store it in a hidden field, and compare a hash
      // of the submitted data, but we'd need a way to easily get the
      // string value for a given field. Right now, that logic is embedded
      // in the render method of each field's widget.
      for (var name in this.fields) {
        if (!this.fields.hasOwnProperty(name)) {
          continue;
        }

        var field = this.fields[name]
          , prefixedName = this.addPrefix(name)
          , dataValue = field.widget.valueFromData(this.data,
                                                   this.files,
                                                   prefixedName)
          , initialValue = getDefault(this.initial, name,
                                      field.initial);

        if (field.showHiddenInitial) {
          var initialPrefixedName = this.addInitialPrefix(name)
            , hiddenWidget = new field.hiddenWidget()
            , initialValue = hiddenWidget.valueFromData(
                  this.data, this.files, initialPrefixedName);
        }

        if (field._hasChanged(initialValue, dataValue)) {
          this._changedData.push(name);
        }
      }
    }
    return this._changedData;
  }

  // TODO Implement Media functionality
, /*get */media: function() {}
};

BaseForm.prototype.toString = function() {
  return ''+this.defaultRendering();
};

BaseForm.prototype.defaultRendering = function() {
  return this.asTable();
};

/**
 * In lieu of __iter__, creates a {@link BoundField} for each field in the form,
 * in the order in which the fields were created.
 *
 * @param {Function} [test] if provided, this function will be called with
 *                          <var>field</var> and <var>name</var> arguments -
 *                          BoundFields will only be generated for fields for
 *                          which <code>true</code> is returned.
 *
 * @return a list of <code>BoundField</code> objects - one for each field in
 *         the form, in the order in which the fields were created.
 */
BaseForm.prototype.boundFields = function(test) {
  test = test || function() { return true; };

  var fields = [];
  for (var name in this.fields) {
    if (this.fields.hasOwnProperty(name) &&
        test(this.fields[name], name) === true) {
      fields.push(BoundField(this, this.fields[name], name));
    }
  }
  return fields;
};

/**
 * In lieu of __getitem__, creates a {@link BoundField} for the field with the
 * given name.
 *
 * @param {String} name a field name.
 *
 * @return a <code>BoundField</code> for the field with the given name, if one
 *         exists.
 */
BaseForm.prototype.boundField = function(name) {
  if (!this.fields.hasOwnProperty(name)) {
    throw new Error("Form does not have a '" + name + "' field.");
  }
  return BoundField(this, this.fields[name], name);
};

/**
 * Determines whether or not the form has errors.
 *
 * @return <code>true</code> if the form has no errors, <code>false</code>
 *         otherwise. If errors are being ignored, returns <code>false</code>.
 */
BaseForm.prototype.isValid = function() {
  if (!this.isBound) {
    return false;
  }
  return !this.errors().isPopulated();
};

/**
 * Returns the field name with a prefix appended, if this Form has a prefix set.
 *
 * @param {String} fieldName a field name.
 *
 * @return a field name with a prefix appended, if this Form has a prefix set,
 *         otherwise <code>fieldName</code> is returned as-is.
 */
BaseForm.prototype.addPrefix = function(fieldName) {
  if (this.prefix !== null) {
      return format('%(prefix)s-%(fieldName)s',
                    {prefix: this.prefix, fieldName: fieldName});
  }
  return fieldName;
};

/**
 * Add an initial prefix for checking dynamic initial values.
 */
BaseForm.prototype.addInitialPrefix = function(fieldName) {
  return format('initial-%(fieldName)s',
                {fieldName: this.addPrefix(fieldName)});
};

/**
 * Helper function for outputting HTML.
 *
 * @param {Function} normalRow a function which produces a normal row.
 * @param {Function} errorRow a function which produces an error row.
 * @param {Boolean} errorsOnSeparateRow determines if errors are placed in their
 *                                      own row, or in the row for the field
 *                                      they are related to.
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 *
 * @return if we're operating in DOM mode returns a list of DOM elements
 *         representing rows, otherwise returns an HTML string, with rows
 *         separated by linebreaks.
 */
BaseForm.prototype._htmlOutput = function(normalRow, errorRow, errorsOnSeparateRow,
                                      doNotCoerce) {
  // Errors that should be displayed above all fields
  var topErrors = this.nonFieldErrors()
    , rows = []
    , hiddenFields = []
    , htmlClassAttr = null
    , cssClasses = null
    , hiddenBoundFields = this.hiddenFields()
    , visibleBoundFields = this.visibleFields()
    , bf, bfErrors;

  for (var i = 0, l = hiddenBoundFields.length; i < l; i++) {
    bf = hiddenBoundFields[i];
    bfErrors = bf.errors();
    if (bfErrors.isPopulated()) {
      for (var j = 0, m = bfErrors.errors.length; j < m; j++) {
        topErrors.errors.push('(Hidden field ' + bf.name + ') ' +
                              bfErrors.errors[j]);
      }
    }
    hiddenFields.push(bf.defaultRendering());
  }

  for (var i = 0, l = visibleBoundFields.length; i < l; i++) {
    bf = visibleBoundFields[i];
    htmlClassAttr = '';
    cssClasses = bf.cssClasses();
    if (cssClasses) {
      htmlClassAttr = cssClasses;
    }

    // Variables which can be optional in each row
    var errors = null
      , label = null
      , helpText = null
      , extraContent = null;

    bfErrors = bf.errors();
    if (bfErrors.isPopulated()) {
      errors = new this.errorConstructor();
      for (var j = 0, m = bfErrors.errors.length; j < m; j++) {
        errors.errors.push(bfErrors.errors[j]);
      }

      if (errorsOnSeparateRow === true) {
        rows.push(errorRow(errors.defaultRendering()));
        errors = null;
      }
    }

    if (bf.label) {
      var isSafe = DOMBuilder.html && DOMBuilder.html.isSafe(bf.label);
      label = ''+bf.label;
      // Only add the suffix if the label does not end in punctuation
      if (this.labelSuffix &&
          ':?.!'.indexOf(label.charAt(label.length - 1)) == -1) {
        label += this.labelSuffix;
      }
      if (isSafe) {
        label = DOMBuilder.html.markSafe(label);
      }
      label = bf.labelTag({contents: label}) || '';
    }

    if (bf.field.helpText) {
      helpText = bf.field.helpText;
    }

    // If this is the last row, it should include any hidden fields
    if (i == l - 1 && hiddenFields.length > 0) {
      extraContent = hiddenFields;
    }
    if (errors !== null) {
      errors = errors.defaultRendering();
    }
    rows.push(normalRow(label, bf.defaultRendering(), helpText, errors,
                        htmlClassAttr, extraContent));
  }

  if (topErrors.isPopulated()) {
    // Add hidden fields to the top error row if it's being displayed and
    // there are no other rows.
    var extraContent = null;
    if (hiddenFields.length > 0 && rows.length == 0) {
      extraContent = hiddenFields;
    }
    rows.splice(0, 0, errorRow(topErrors.defaultRendering(), extraContent));
  }

  // Put hidden fields in their own error row if there were no rows to
  // display.
  if (hiddenFields.length > 0 && rows.length == 0) {
    rows.push(errorRow('', hiddenFields));
  }
  if (doNotCoerce === true || DOMBuilder.mode == 'dom') {
    return rows;
  }
  else {
    return rows.join('\n');
  }
};

/**
 * Returns this form rendered as HTML &lt;tr&gt;s - excluding the
 * &lt;table&gt;&lt;/table&gt;.
 *
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 */
BaseForm.prototype.asTable = (function() {
  var normalRow = function(label, field, helpText, errors, htmlClassAttr,
                           extraContent) {
    var contents = [];
    if (errors) {
      contents.push(errors);
    }
    contents.push(field);
    if (helpText) {
      contents.push(DOMBuilder.createElement('br'));
      contents.push(helpText);
    }
    if (extraContent) {
      contents = contents.concat(extraContent);
    }

    var rowAttrs = {};
    if (htmlClassAttr) {
      rowAttrs['class'] = htmlClassAttr;
    }
    return DOMBuilder.createElement('tr', rowAttrs, [
      DOMBuilder.createElement('th', {}, [label]),
      DOMBuilder.createElement('td', {}, contents)
    ]);
  };

  var errorRow = function(errors, extraContent) {
    var contents = [errors];
    if (extraContent) {
      contents = contents.concat(extraContent);
    }
    return DOMBuilder.createElement('tr', {}, [
      DOMBuilder.createElement('td', {colSpan: 2}, contents)
    ]);
  };

  return function(doNotCoerce) {
    return this._htmlOutput(normalRow, errorRow, false, doNotCoerce);
  };
})();

/**
 * Returns this form rendered as HTML &lt;li&gt;s - excluding the
 * &lt;ul&gt;&lt;/ul&gt;.
 *
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 */
BaseForm.prototype.asUL = (function() {
  var normalRow = function(label, field, helpText, errors, htmlClassAttr,
                           extraContent) {
    var contents = [];
    if (errors) {
      contents.push(errors);
    }
    if (label) {
      contents.push(label);
    }
    contents.push(' ');
    contents.push(field);
    if (helpText) {
      contents.push(' ');
      contents.push(helpText);
    }
    if (extraContent) {
      contents = contents.concat(extraContent);
    }

    var rowAttrs = {};
    if (htmlClassAttr) {
      rowAttrs['class'] = htmlClassAttr;
    }
    return DOMBuilder.createElement('li', rowAttrs, contents);
  };

  var errorRow = function(errors, extraContent) {
    var contents = [errors];
    if (extraContent) {
      contents = contents.concat(extraContent);
    }
    return DOMBuilder.createElement('li', {}, contents);
  };

  return function(doNotCoerce) {
    return this._htmlOutput(normalRow, errorRow, false, doNotCoerce);
  };
})();

/**
 * Returns this form rendered as HTML &lt;p&gt;s.
 *
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 */
BaseForm.prototype.asP = (function() {
  var normalRow = function(label, field, helpText, errors, htmlClassAttr,
                           extraContent) {
    var contents = [];
    if (label) {
      contents.push(label);
    }
    contents.push(' ');
    contents.push(field);
    if (helpText) {
      contents.push(' ');
      contents.push(helpText);
    }
    if (extraContent) {
      contents = contents.concat(extraContent);
    }

    var rowAttrs = {};
    if (htmlClassAttr) {
      rowAttrs['class'] = htmlClassAttr;
    }
    return DOMBuilder.createElement('p', rowAttrs, contents);
  };

  var errorRow = function(errors, extraContent) {
    if (extraContent) {
      // When provided extraContent is usually hidden fields, so we need
      // to give it a block scope wrapper in this case for HTML validity.
      return DOMBuilder.createElement('div', {}, [errors].concat(extraContent));
    }
    // Otherwise, just display errors as they are
    return errors;
  };

  return function(doNotCoerce) {
    return this._htmlOutput(normalRow, errorRow, true, doNotCoerce);
  };
})();

/**
 * Returns errors that aren't associated with a particular field.
 *
 * @return errors that aren't associated with a particular field - i.e., errors
 *         generated by <code>clean()</code>. Will be empty if there are none.
 */
BaseForm.prototype.nonFieldErrors = function() {
  return (this.errors(NON_FIELD_ERRORS) || new this.errorConstructor());
};

/**
 * Returns the raw value for a particular field name. This is just a convenient
 * wrapper around widget.valueFromData.
 */
BaseForm.prototype._rawValue = function(fieldname) {
  var field = this.fields[fieldname]
    , prefix = this.addPrefix(fieldname);
  return field.widget.valueFromData(this.data, this.files, prefix);
};

/**
 * Cleans all of <code>data</code> and populates <code>_errors</code> and
 * <code>cleanedData</code>.
 */
BaseForm.prototype.fullClean = function() {
  this._errors = ErrorObject();
  if (!this.isBound) {
    return; // Stop further processing
  }

  this.cleanedData = {};

  // If the form is permitted to be empty, and none of the form data has
  // changed from the initial data, short circuit any validation.
  if (this.emptyPermitted && !this.hasChanged()) {
    return;
  }

  this._cleanFields();
  this._cleanForm();
  this._postClean();

  if (this._errors.isPopulated()) {
    delete this.cleanedData;
  }
};

BaseForm.prototype._cleanFields = function() {
  for (var name in this.fields)
  {
    if (!this.fields.hasOwnProperty(name)) {
      continue;
    }

    var field = this.fields[name]
        // valueFromData() gets the data from the data objects.
        // Each widget type knows how to retrieve its own data, because some
        // widgets split data over several HTML fields.
      , value = field.widget.valueFromData(this.data, this.files,
                                           this.addPrefix(name));
    try {
      if (field instanceof FileField) {
        var initial = getDefault(this.initial, name, field.initial);
        value = field.clean(value, initial);
      }
      else {
        value = field.clean(value);
      }
      this.cleanedData[name] = value;

      // Try clean_name
      var customClean = 'clean_' + name;
      if (typeof this[customClean] != 'undefined' &&
          isFunction(this[customClean])) {
         this.cleanedData[name] = this[customClean]();
         continue;
      }

      // Try cleanName
      customClean = 'clean' + name.charAt(0).toUpperCase() +
                    name.substr(1);
      if (typeof this[customClean] != 'undefined' &&
          isFunction(this[customClean])) {
        this.cleanedData[name] = this[customClean]();
      }
    }
    catch (e) {
      if (!(e instanceof ValidationError)) {
        throw e;
      }
      this._errors.set(name, new this.errorConstructor(e.messages));
      if (typeof this.cleanedData[name] != 'undefined') {
        delete this.cleanedData[name];
      }
    }
  }
};

BaseForm.prototype._cleanForm = function() {
  try {
    this.cleanedData = this.clean();
  }
  catch (e) {
    if (!(e instanceof ValidationError)) {
      throw e;
    }
    this._errors.set(NON_FIELD_ERRORS,
                     new this.errorConstructor(e.messages));
  }
};

/**
 * An internal hook for performing additional cleaning after form cleaning is
 * complete.
 */
BaseForm.prototype._postClean = function() {};

/**
 * Hook for doing any extra form-wide cleaning after each Field's
 * <code>clean()</code> has been called. Any {@link ValidationError} raised by
 * this method will not be associated with a particular field; it will have a
 * special-case association with the field named <code>__all__</code>.
 *
 * @return validated, cleaned data.
 */
BaseForm.prototype.clean = function() {
  return this.cleanedData;
};

/**
 * Determines if data differs from initial.
 */
BaseForm.prototype.hasChanged = function() {
  return (this.changedData().length > 0);
};

/**
 * Determines if the form needs to be multipart-encrypted, in other words, if it
 * has a {@link FileInput}.
 *
 * @return <code>true</code> if the form needs to be multipart-encrypted,
 *         <code>false</code> otherwise.
 */
BaseForm.prototype.isMultipart = function() {
  for (var name in this.fields) {
    if (this.fields.hasOwnProperty(name)) {
      if (this.fields[name].widget.needsMultipartForm) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Returns a list of all the {@link BoundField} objects that correspond to
 * hidden fields. Useful for manual form layout.
 */
BaseForm.prototype.hiddenFields = function() {
  return this.boundFields(function(field) {
    return field.widget.isHidden;
  });
};

/**
 * Returns a list of {@link BoundField} objects that do not correspond to
 * hidden fields. The opposite of the hiddenFields() method.
 */
BaseForm.prototype.visibleFields = function()
{
    return this.boundFields(function(field)
    {
        return !field.widget.isHidden;
    });
};

/**
 * Creates a new form constructor, eliminating some of the steps required when
 * manually defining a new form class and wiring up convenience hooks into the
 * form initialisation process.
 *
 * @param {Object} kwargs arguments defining options for the created form
 *     constructor. Arguments which are <code>Field</code> instances will
 *     contribute towards the form's <code>baseFields</code>. All remaining
 *     arguments other than those defined below will be added to the new form
 *     constructor's <code>prototype</code>, so this object can also be used to
 *     define new methods on the resulting form, such as custom
 *     <code>clean</code> and <code>cleanFieldName</code> methods.
 * @config {Function|Array} [form] the Form constructor which will provide the
 *     prototype for the new Form constructor - defaults to
 *     <code>BaseForm</code>.
 * @config {Function} [preInit] if provided, this function will be invoked with
 *     any keyword arguments which are passed when a new instance of the form is
 *     being created, *before* fields have been created and the prototype
 *     constructor called - if a value is returned from the function, it will be
 *     used as the kwargs object for further processing, so typical usage of
 *     this argument would be to set default kwarg arguments or pop and store
 *     kwargs as properties of the form object being created.
 * @config {Function} [postInit] if provided, this function will be invoked with
 *     any keyword arguments which are passed when a new instance of the form is
 *     being created, *after* fields have been created and the prototype
 *     constructor called - typical usage of this function would be to
 *     dynamically alter the form fields which have just been created or to
 *     add/remove fields by altering <code>this.fields</code>.
 */
function Form(kwargs) {
  kwargs = extend({
    form: BaseForm, preInit: null, postInit: null
  }, kwargs || {});

  // Create references to special kwargs which will be closed over by the
  // new form constructor.
  var bases = isArray(kwargs.form) ? kwargs.form : [kwargs.form]
    , preInit = kwargs.preInit
    , postInit = kwargs.postInit;

  // Deliberately shadowing the outer function's kwargs so it won't be
  // accessible.
  var formConstructor = function(kwargs) {
    // Allow the form to be instantiated without the 'new' operator
    if (!(this instanceof bases[0])) return new formConstructor(kwargs);

    if (preInit !== null) {
      // If the preInit function returns anything, use the returned value
      // as the kwargs object for further processing.
      kwargs = preInit.call(this, kwargs) || kwargs;
    }

    // Instantiate using the first base form we were given
    bases[0].call(this, kwargs);

    if (postInit !== null) {
      postInit.call(this, kwargs);
    }
  };

  // *Really* inherit from the first base form we were passed
  inheritFrom(formConstructor, bases[0]);

  // Borrow methods from any additional base forms - this is a bit of a hack
  // to fake multiple inheritance, using any additonal base forms as mixins.
  // We can only use instanceof for the form we really inherited from, but we
  // can access methods from all our 'parents'.
  for (var i = 1, l = bases.length; i < l; i++) {
    extend(formConstructor.prototype, bases[i].prototype);
  }

  // Pop fields from kwargs to contribute towards baseFields.
  var fields = [];
  for (var name in kwargs) {
    if (kwargs.hasOwnProperty(name) && kwargs[name] instanceof Field) {
      fields.push([name, kwargs[name]]);
      delete kwargs[name];
    }
  }
  fields.sort(function(a, b) {
    return a[1].creationCounter - b[1].creationCounter;
  });
  // Note that we loop over the base forms in *reverse* to preserve the
  // correct order of fields. Fields from any given base forms will be first,
  // in the order they were given; fields from kwargs will be last.
  for (var i = bases.length - 1; i >= 0; i--) {
    if (typeof bases[i].prototype.baseFields != 'undefined') {
      fields = objectItems(bases[i].prototype.baseFields).concat(fields);
    }
  }
  // Instantiate baseFields from our list of [name, field] pairs
  formConstructor.prototype.baseFields = itemsToObject(fields);

  // Remove any 'special' properties from kwargs, as they will now be used to
  // add remaining properties to the new prototype.
  delete kwargs.form;
  delete kwargs.preInit;
  delete kwargs.postInit;
  // Anything else defined in kwargs should take precedence
  extend(formConstructor.prototype, kwargs);

  return formConstructor;
}

// Special field names
var TOTAL_FORM_COUNT = 'TOTAL_FORMS'
  , INITIAL_FORM_COUNT = 'INITIAL_FORMS'
    MAX_NUM_FORM_COUNT = 'MAX_NUM_FORMS'
    ORDERING_FIELD_NAME = 'ORDER'
  , DELETION_FIELD_NAME = 'DELETE';

/**
 * ManagementForm is used to keep track of how many form instances are displayed
 * on the page. If adding new forms via javascript, you should increment the
 * count field of this form as well.
 * @constructor
 */
var ManagementForm = (function() {
  var fields = {};
  fields[TOTAL_FORM_COUNT] = IntegerField({widget: HiddenInput});
  fields[INITIAL_FORM_COUNT] = IntegerField({widget: HiddenInput});
  fields[MAX_NUM_FORM_COUNT] = IntegerField({required: false, widget: HiddenInput});
  return Form(fields);
})();

/**
 * A collection of instances of the same Form.
 *
 * @param {Object} [kwargs] configuration options.
 * @config {Object} [data] input form data, where property names are field
 *                         names.
 * @config {Object} [files] input file data - this is meaningless on the
 *                          client-side, but is included for future use in any
 *                          future server-side implementation.
 * @config {String} [autoId] a template for use when automatically generating
 *                           <code>id</code> attributes for fields, which should
 *                           contain a <code>%(name)s</code> placeholder for
 *                           the field name - defaults to
 *                           <code>id_%(name)s</code>.
 * @config {String} [prefix] a prefix to be applied to the name of each field in
 *                           each form instance.
 * @config {Object} [initial] a list of initial form data objects, where
 *                            property names are field names - if a field's
 *                            value is not specified in <code>data</code>, these
 *                            values will be used when rendering field widgets.
 * @config {Function} [errorConstructor] the constructor function to be used
 *                                       when creating error details - defaults
 *                                       to {@link ErrorList}.
 * @constructor
 */
function BaseFormSet(kwargs) {
  kwargs = extend({
    data: null, files: null, autoId: 'id_%(name)s', prefix: null,
    initial: null, errorConstructor: ErrorList
  }, kwargs || {});
  this.isBound = kwargs.data !== null || kwargs.files !== null;
  this.prefix = kwargs.prefix || BaseFormSet.getDefaultPrefix();
  this.autoId = kwargs.autoId;
  this.data = kwargs.data || {};
  this.files = kwargs.files || {};
  this.initial = kwargs.initial;
  this.errorConstructor = kwargs.errorConstructor;
  this._errors = null;
  this._nonFormErrors = null;

  // Construct the forms in the formset
  this._constructForms();
}
BaseFormSet.getDefaultPrefix = function() { return 'form'; };

BaseFormSet.prototype = {
  /**
   * Returns the ManagementForm instance for this FormSet.
   */
  /*get */managementForm: function() {
    if (this.isBound) {
      var form = ManagementForm({data: this.data, autoId: this.autoId,
                                 prefix: this.prefix});
      if (!form.isValid()) {
        throw ValidationError('ManagementForm data is missing or has been tampered with');
      }
    }
    else {
      var initial = {};
      initial[TOTAL_FORM_COUNT] = this.totalFormCount();
      initial[INITIAL_FORM_COUNT] = this.initialFormCount();
      initial[MAX_NUM_FORM_COUNT] = this.maxNum;
      var form = ManagementForm({autoId: this.autoId,
                                 prefix: this.prefix,
                                 initial: initial});
    }
    return form;
  }

, /*get */initialForms: function() {
    return this.forms.slice(0, this.initialFormCount());
  }

, /*get */extraForms: function() {
    return this.forms.slice(this.initialFormCount());
  }

, /*get */emptyForm: function(kwargs) {
    var defaults = {
      autoId: this.autoId,
      prefix: this.addPrefix('__prefix__'),
      emptyPermitted: true
    };
    var formKwargs = extend(defaults, kwargs || {});
    var form = new this.form(formKwargs);
    this.addFields(form, null);
    return form;
  }

  /**
   * Returns a list of form.cleanedData objects for every form in this.forms.
   */
, /*get */cleanedData: function() {
    if (!this.isValid()) {
      throw new Error(this.constructor.name +
                      " object has no attribute 'cleanedData'");
    }
    var cleaned = [];
    for (var i = 0, l = this.forms.length; i < l; i++) {
      cleaned.push(this.forms[i].cleanedData);
    }
    return cleaned;
  }

  /**
   * Returns a list of forms that have been marked for deletion. Throws an
   * error if deletion is not allowed.
   */
, /*get */deletedForms: function() {
    if (!this.isValid() || !this.canDelete) {
      throw new Error(this.constructor.name +
                      " object has no attribute 'deletedForms'");
    }

    // Construct _deletedFormIndexes, which is just a list of form indexes
    // that have had their deletion widget set to true.
    if (typeof this._deletedFormIndexes == 'undefined') {
      this._deletedFormIndexes = [];
      var totalFormCount = this.totalFormCount();
      for (var i = 0; i < totalFormCount; i++) {
        var form = this.forms[i];
        // If this is an extra form and hasn't changed, ignore it
        if (i >= this.initialFormCount() && !form.hasChanged()) {
          continue;
        }
        if (this._shouldDeleteForm(form)) {
          this._deletedFormIndexes.push(i);
        }
      }
    }

    var deletedForms = [];
    for (var i = 0, l = this._deletedFormIndexes.length; i < l; i++) {
      deletedForms.push(this.forms[this._deletedFormIndexes[i]]);
    }
    return deletedForms;
  }

  /**
   * Returns a list of forms in the order specified by the incoming data.
   * Throws an Error if ordering is not allowed.
   */
, /*get */orderedForms: function() {
    if (!this.isValid() || !this.canOrder) {
      throw new Error(this.constructor.name +
                      " object has no attribute 'orderedForms'");
    }

    // Construct _ordering, which is a list of [form index, orderFieldValue]
    // pairs. After constructing this list, we'll sort it by orderFieldValue
    // so we have a way to get to the form indexes in the order specified by
    // the form data.
    if (typeof this._ordering == 'undefined') {
      this._ordering = [];
      var totalFormCount = this.totalFormCount();
      for (var i = 0; i < totalFormCount; i++) {
        var form = this.forms[i];
        // If this is an extra form and hasn't changed, ignore it
        if (i >= this.initialFormCount() && !form.hasChanged()) {
          continue;
        }
        // Don't add data marked for deletion
        if (this.canDelete && this._shouldDeleteForm(form)) {
          continue;
        }
        this._ordering.push([i, form.cleanedData[ORDERING_FIELD_NAME]]);
      }

      // Null should be sorted below anything else. Allowing null as a
      // comparison value makes it so we can leave ordering fields blank.
      this._ordering.sort(function(x, y) {
        if (x[1] === null && y[1] === null) {
          // Sort by form index if both order field values are null
          return x[0] - y[0];
        }
        if (x[1] === null) {
          return 1;
        }
        if (y[1] === null) {
          return -1;
        }
        return x[1] - y[1];
      });
    }

    var orderedForms = [];
    for (var i = 0, l = this._ordering.length; i < l; i++) {
      orderedForms.push(this.forms[this._ordering[i][0]]);
    }
    return orderedForms;
  }

  /**
   * Returns a list of form.errors for every form in this.forms.
   */
, /*get */errors: function() {
    if (this._errors === null) {
      this.fullClean();
    }
    return this._errors;
  }
};

BaseFormSet.prototype.toString = function() {
  return ''+this.defaultRendering();
};

BaseFormSet.prototype.defaultRendering = function() {
  return this.asTable();
};

/**
 * Determines the number of form instances this formset contains, based on
 * either submitted management data or initial configuration, as appropriate.
 */
BaseFormSet.prototype.totalFormCount = function() {
  if (this.isBound) {
    return this.managementForm().cleanedData[TOTAL_FORM_COUNT];
  }
  else {
    var initialForms = this.initialFormCount()
      , totalForms = this.initialFormCount() + this.extra;
    // Allow all existing related objects/inlines to be displayed, but don't
    // allow extra beyond max_num.
    if (this.maxNum !== null &&
        initialForms > this.maxNum &&
        this.maxNum >= 0) {
      totalForms = initialForms;
    }
    if (this.maxNum !== null &&
        totalForms > this.maxNum &&
        this.maxNum >= 0) {
      totalForms = this.maxNum;
    }
    return totalForms;
  }
};

/**
 * Determines the number of initial form instances this formset contains, based
 * on either submitted management data or initial configuration, as appropriate.
 */
BaseFormSet.prototype.initialFormCount = function() {
  if (this.isBound) {
    return this.managementForm().cleanedData[INITIAL_FORM_COUNT];
  }
  else {
    // Use the length of the inital data if it's there, 0 otherwise.
    var initialForms = (this.initial !== null && this.initial.length > 0
                        ? this.initial.length
                        : 0);
    if (this.maxNum !== null &&
        initialForms > this.maxNum &&
        this.maxNum >= 0) {
      initialForms = this.maxNum;
    }
    return initialForms;
  }
};

/**
 * Instantiates all the forms and put them in <code>this.forms</code>.
 */
BaseFormSet.prototype._constructForms = function() {
  this.forms = [];
  var totalFormCount = this.totalFormCount();
  for (var i = 0; i < totalFormCount; i++) {
    this.forms.push(this._constructForm(i));
  }
};

/**
 * Instantiates and returns the <code>i</code>th form instance in the formset.
 */
BaseFormSet.prototype._constructForm = function(i, kwargs) {
  var defaults = {autoId: this.autoId, prefix: this.addPrefix(i)};

  if (this.isBound) {
    defaults['data'] = this.data;
    defaults['files'] = this.files;
  }

  if (this.initial !== null && this.initial.length > 0) {
    if (typeof this.initial[i] != 'undefined') {
      defaults['initial'] = this.initial[i];
    }
  }

  // Allow extra forms to be empty
  if (i >= this.initialFormCount()) {
    defaults['emptyPermitted'] = true;
  }

  var formKwargs = extend(defaults, kwargs || {});
  var form = new this.form(formKwargs);
  this.addFields(form, i);
  return form;
};

/**
 * Returns an ErrorList of errors that aren't associated with a particular
 * form -- i.e., from <code>formset.clean()</code>. Returns an empty ErrorList
 * if there are none.
 */
BaseFormSet.prototype.nonFormErrors = function() {
  if (this._nonFormErrors !== null) {
    return this._nonFormErrors;
  }
  return new this.errorConstructor();
};

BaseFormSet.prototype._shouldDeleteForm = function(form) {
  // The way we lookup the value of the deletion field here takes
  // more code than we'd like, but the form's cleanedData will not
  // exist if the form is invalid.
  var field = form.fields[DELETION_FIELD_NAME]
    , rawValue = form._rawValue(DELETION_FIELD_NAME)
    , shouldDelete = field.clean(rawValue);
  return shouldDelete;
};

/**
 * Returns <code>true</code> if <code>form.errors</code> is empty for every form
 * in <code>this.forms</code>
 */
BaseFormSet.prototype.isValid = function() {
  if (!this.isBound) {
    return false;
  }

  // We loop over every form.errors here rather than short circuiting on the
  // first failure to make sure validation gets triggered for every form.
  var formsValid = true
    , errors = this.errors() // Triggers fullClean()
    , totalFormCount = this.totalFormCount();
  for (var i = 0; i < totalFormCount; i++) {
    var form = this.forms[i];
    if (this.canDelete && this._shouldDeleteForm(form)) {
      // This form is going to be deleted so any of its errors should
      // not cause the entire formset to be invalid.
      continue;
    }
    if (errors[i].isPopulated()) {
      formsValid = false;
    }
  }

  return (formsValid && !this.nonFormErrors().isPopulated());
};

/**
 * Cleans all of <code>this.data</code> and populates <code>this._errors</code>.
 */
BaseFormSet.prototype.fullClean = function() {
  this._errors = [];
  if (!this.isBound) {
    return; // Stop further processing
  }

  var totalFormCount = this.totalFormCount();
  for (var i = 0; i < totalFormCount; i++) {
    var form = this.forms[i];
    this._errors.push(form.errors());
  }

  // Give this.clean() a chance to do cross-form validation.
  try {
    this.clean();
  }
  catch (e) {
    if (!(e instanceof ValidationError)) {
      throw e;
    }
    this._nonFormErrors = new this.errorConstructor(e.messages);
  }
};

/**
 * Hook for doing any extra formset-wide cleaning after Form.clean() has been
 * called on every form. Any ValidationError raised by this method will not be
 * associated with a particular form; it will be accesible via
 * formset.nonFormErrors()
 */
BaseFormSet.prototype.clean = function() {};

/**
 * A hook for adding extra fields on to each form instance.
 *
 * @param {Form} form the form fields are to be added to.
 * @param {Number} index the index of the given form in the formset.
 */
BaseFormSet.prototype.addFields = function(form, index) {
  if (this.canOrder) {
    // Only pre-fill the ordering field for initial forms
    if (index !== null && index < this.initialFormCount()) {
      form.fields[ORDERING_FIELD_NAME] =
          IntegerField({label: 'Order', initial: index + 1,
                        required: false});
    }
    else {
      form.fields[ORDERING_FIELD_NAME] =
          IntegerField({label: 'Order', required: false});
    }
  }

  if (this.canDelete) {
    form.fields[DELETION_FIELD_NAME] =
        BooleanField({label: 'Delete', required: false});
  }
};

/**
 * Returns the formset prefix with the form index appended.
 *
 * @param {Number} index the index of a form in the formset.
 */
BaseFormSet.prototype.addPrefix = function(index) {
  return this.prefix + '-' + index;
};

/**
 * Returns <code>true</code> if the formset needs to be multipart-encrypted,
 * i.e. it has FileInput. Otherwise, <code>false</code>.
 */
BaseFormSet.prototype.isMultipart = function() {
  return (this.forms.length > 0 && this.forms[0].isMultipart());
};

/**
 * Returns this formset rendered as HTML &lt;tr&gt;s - excluding the
 * &lt;table&gt;&lt;/table&gt;.
 *
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 */
BaseFormSet.prototype.asTable = function(doNotCoerce) {
  // XXX: there is no semantic division between forms here, there probably
  // should be. It might make sense to render each form as a table row with
  // each field as a td.
  var rows = this.managementForm().asTable(true);
  for (var i = 0, l = this.forms.length; i < l; i++) {
    rows = rows.concat(this.forms[i].asTable(true));
  }
  if (doNotCoerce === true || DOMBuilder.mode == 'dom') {
    return rows;
  }
  return rows.join('\n');
};

BaseFormSet.prototype.asP = function(doNotCoerce) {
  var rows = this.managementForm().asP(true);
  for (var i = 0, l = this.forms.length; i < l; i++) {
    rows = rows.concat(this.forms[i].asP(true));
  }
  if (doNotCoerce === true || DOMBuilder.mode == 'dom') {
    return rows;
  }
  return rows.join('\n');
};

BaseFormSet.prototype.asUL = function(doNotCoerce) {
  var rows = this.managementForm().asUL(true);
  for (var i = 0, l = this.forms.length; i < l; i++) {
    rows = rows.concat(this.forms[i].asUL(true));
  }
  if (doNotCoerce === true || DOMBuilder.mode == 'dom') {
    return rows;
  }
  return rows.join('\n');
};

/**
 * Returns a FormSet constructor for the given Form constructor.
 *
 * @param {Form} form the constructor for the Form to be managed.
 * @param {Object} [kwargs] arguments defining options for the created FormSet
 *     constructor - all arguments other than those defined below will be added
 *     to the new formset constructor's <code>prototype</code>, so this object
 *     can also be used to define new methods on the resulting formset, such as
 *     a custom <code>clean</code> method.
 * @config {Function} [formset] the constructuer which will provide the
 *     prototype for the created FormSet constructor - defaults to
 *     <code>BaseFormSet</code>.
 * @config {Number} [extra] the number of extra forms to be displayed - defaults
 *                          to <code>1</code>.
 * @config {Boolean} [canOrder] if <code>true</code>, forms can be ordered -
 *                              defaults to <code>false</code>.
 * @config {Boolean} [canDelete] if <code>true</code>, forms can be deleted -
 *                               defaults to <code>false</code>.
 * @config {Number} [maxNum] the maximum number of forms to be displayed -
 *                           defaults to <code>0</code>.
 */
function FormSet(form, kwargs) {
  kwargs = extend({
    formset: BaseFormSet, extra: 1, canOrder: false, canDelete: false,
    maxNum: null
  }, kwargs || {});

  var formset = kwargs.formset
    , extra = kwargs.extra
    , canOrder = kwargs.canOrder
    , canDelete = kwargs.canDelete
    , maxNum = kwargs.maxNum;

  var formsetConstructor = function(kwargs) {
    if (!(this instanceof formset)) return new formsetConstructor(kwargs);
    this.form = form;
    this.extra = extra;
    this.canOrder = canOrder;
    this.canDelete = canDelete;
    this.maxNum = maxNum;
    formset.call(this, kwargs);
  };
  inheritFrom(formsetConstructor, formset);

  // Remove special properties from kwargs, as they will now be used to add
  // properties to the prototype.
  delete kwargs.formset;
  delete kwargs.extra;
  delete kwargs.canOrder;
  delete kwargs.canDelete;
  delete kwargs.maxNum;

  extend(formsetConstructor.prototype, kwargs);

  return formsetConstructor;
}

/**
 * Returns <code>true</code> if every formset in formsets is valid.
 */
function allValid(formsets) {
  var valid = true;
  for (var i = 0, l = formsets.length; i < l; i++) {
    if (!formsets[i].isValid()) {
        valid = false;
    }
  }
  return valid;
}


// Newforms API
var forms = {
  version: '0.0.3'
  // util.js utilities end users may want to make use of
, callValidator: callValidator
, ErrorObject: ErrorObject
, ErrorList: ErrorList
, formData: formData
, inheritFrom: inheritFrom
, ValidationError: ValidationError
  // util.js and other utilities used when implementing newforms
, util: {
    contains: contains
  , copy: copy
  , createLookup: createLookup
  , extend: extend
  , format: format
  , getDefault: getDefault
  , isArray: isArray
  , isCallable: isCallable
  , isFunction: isFunction
  , isNumber: isNumber
  , isObject: isObject
  , isString: isString
  , itemsToObject: itemsToObject
  , objectItems: objectItems
  , prettyName: prettyName
  , strip: strip
  , time: time
  , urlparse: urlparse
  }
  // validators.js
, EMPTY_VALUES: EMPTY_VALUES
, URL_VALIDATOR_USER_AGENT: URL_VALIDATOR_USER_AGENT
, RegexValidator: RegexValidator
, URLValidator: URLValidator
, EmailValidator: EmailValidator
, validateEmail: validateEmail
, validateSlug: validateSlug
, validateIPV4Address: validateIPV4Address
, validateCommaSeparatedIntegerList: validateCommaSeparatedIntegerList
, BaseValidator: BaseValidator
, MaxValueValidator: MaxValueValidator
, MinValueValidator: MinValueValidator
, MaxLengthValidator: MaxLengthValidator
, MinLengthValidator: MinLengthValidator
  // widgets.js
, Widget: Widget
, Input: Input
, TextInput: TextInput
, PasswordInput: PasswordInput
, HiddenInput: HiddenInput
, MultipleHiddenInput: MultipleHiddenInput
, FileInput: FileInput
, ClearableFileInput: ClearableFileInput
, Textarea: Textarea
, DateInput: DateInput
, DateTimeInput: DateTimeInput
, TimeInput: TimeInput
, CheckboxInput: CheckboxInput
, Select: Select
, NullBooleanSelect: NullBooleanSelect
, SelectMultiple: SelectMultiple
, RadioInput: RadioInput
, RadioFieldRenderer: RadioFieldRenderer
, RadioSelect: RadioSelect
, CheckboxSelectMultiple: CheckboxSelectMultiple
, MultiWidget: MultiWidget
, SplitDateTimeWidget: SplitDateTimeWidget
, SplitHiddenDateTimeWidget: SplitHiddenDateTimeWidget
  // fields.js
, DEFAULT_DATE_INPUT_FORMATS: DEFAULT_DATE_INPUT_FORMATS
, DEFAULT_TIME_INPUT_FORMATS: DEFAULT_TIME_INPUT_FORMATS
, DEFAULT_DATETIME_INPUT_FORMATS: DEFAULT_DATETIME_INPUT_FORMATS
, Field: Field
, CharField: CharField
, IntegerField: IntegerField
, FloatField: FloatField
, DecimalField: DecimalField
, DateField: DateField
, TimeField: TimeField
, DateTimeField: DateTimeField
, RegexField: RegexField
, EmailField: EmailField
, FileField: FileField
, ImageField: ImageField
, URLField: URLField
, BooleanField: BooleanField
, NullBooleanField: NullBooleanField
, ChoiceField: ChoiceField
, TypedChoiceField: TypedChoiceField
, MultipleChoiceField: MultipleChoiceField
, TypedMultipleChoiceField: TypedMultipleChoiceField
, ComboField: ComboField
, MultiValueField: MultiValueField
, FilePathField: FilePathField
, SplitDateTimeField: SplitDateTimeField
, IPAddressField: IPAddressField
, SlugField: SlugField
  // forms.js
, NON_FIELD_ERRORS: NON_FIELD_ERRORS
, BoundField: BoundField
, BaseForm: BaseForm
, Form: Form
  // formsets.js
, TOTAL_FORM_COUNT: TOTAL_FORM_COUNT
, INITIAL_FORM_COUNT: INITIAL_FORM_COUNT
, MAX_NUM_FORM_COUNT: MAX_NUM_FORM_COUNT
, ORDERING_FIELD_NAME: ORDERING_FIELD_NAME
, DELETION_FIELD_NAME: DELETION_FIELD_NAME
, ManagementForm: ManagementForm
, BaseFormSet: BaseFormSet
, FormSet: FormSet
, allValid: allValid
};

// Expose newforms to the outside world
if (modules) {
  extend(module.exports, forms);
}
else {
  __global__.forms = forms;
}
})(this);