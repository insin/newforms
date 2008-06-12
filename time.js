/**
 * @fileOverview Utilities for working with times and locales.
 */

/** @namespace */
var time = {};

/**
 * Default locale name - this must always contain the name of a locale name
 * which is available in {@link time.locales}, as it will be used in cases
 * where when a locale was not specified or a specified locale could not be
 * found.
 *
 * @type String
 */
time.locale = "en";

/**
 * Maps locale names to locale objects.
 *
 * @type Object
 */
time.locales =
{
    "en":
    {
        name: "en",
        a: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        A: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
            "Saturday"],
        AM: "AM",
        b: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct",
            "Nov", "Dec"],
        B: ["January", "February", "March", "April", "May", "June", "July",
            "August", "September", "October", "November", "December"],
        PM: "PM"
    }
};

/**
 * Retrieves the locale with the given name, falling back to the default locale
 * if it can't be found; retrieves the default locale when called without
 * arguments.
 *
 * @param {String} [locale] a locale name.
 *
 * @return a locale object.
 * @type Object
 */
time.getLocale = function(locale)
{
    return time.locales[locale || time.locale] || time.locales[time.locale];
};

/**
 * A partial implementation of <code>strptime</code>, which parses time details
 * from a string, based on a format string.
 * <p>
 * This implementation largely takes its cue from the documentation for Python's
 * <code>time</code> module, as documented at
 * http://docs.python.org/lib/module-time.html; with the exception of seconds
 * formatting, which is restricted to the range [00,59] rather than [00,61].
 * <p>
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
 *     <td>A literal "<tt>%</tt>" character.</td>
 *   </tr>
 * </tbody>
 * </table>
 *
 * @param {String} format a string specifying formatting directives.
 * @param {Object} locale the locale object to be used to create this parser.
 * @constructor
 */
time.TimeParser = function(format, locale)
{
    /**
     * The original formatting string which was given.
     *
     * @type String
     */
    this.format = format;

    // Normalise whitespace before further processing
    format = format.split(/(?:\s|%t|%n)+/).join(" ");
    var pattern = [];
    var expected = [];
    var c;

    for (var i = 0, l = format.length; i < l; i++)
    {
        c = format.charAt(i);
        if (c == "%")
        {
            if (i == l - 1)
            {
                throw new Error("strptime format ends with raw %");
            }

            c = format.charAt(++i);
            var directiveType = typeof time.TimeParser.DIRECTIVE_PATTERNS[c];
            if (directiveType == "undefined")
            {
                throw new Error("strptime format contains a bad directive: '%" +
                                c + "'")
            }
            else if (directiveType == "function")
            {
                pattern[pattern.length] =
                    time.TimeParser.DIRECTIVE_PATTERNS[c](locale);
            }
            else
            {
                pattern[pattern.length] = time.TimeParser.DIRECTIVE_PATTERNS[c];
            }
            expected = expected.concat(time.TimeParser.EXPECTED_DATA_TYPES[c]);
        }
        else
        {
            pattern[pattern.length] = c;
        }
    }

    /**
     * The locale object which was used to create this parser.
     *
     * @type Object
     */
    this.locale = locale;

    /**
     * The regular expression generated for the format this parser was created
     * to parse.
     *
     * @type RegExp
     */
    this.regexp = new RegExp("^" + pattern.join("") + "$");

    /**
     * A list of expected formatting directives code which will be matched by
     * this parser's <code>regexp</code>, in the order the matches are expected
     * to take place.
     *
     * @type Array
     */
    this.expected = expected;
};

/**
 * Maps directive codes to regular expression pattern fragments which will
 * capture the data the directive corresponds to, or in the case of
 * locale-dependent directives, a function which takes a locale and generates
 * a regular expression pattern fragment.
 *
 * @type Object
 */
time.TimeParser.DIRECTIVE_PATTERNS =
{
    // Locale's abbreviated month name
    "b": function(l) { return "(" + l.b.join("|") + ")"; },
    // Locale's full month name
    "B": function(l) { return "(" + l.B.join("|") + ")"; },
    // Locale's equivalent of either AM or PM.
    "p": function(l) { return "(" + l.AM + "|" + l.PM + ")"; },

    "d": "(\\d\\d?)",      // Day of the month as a decimal number [01,31]
    "H": "(\\d\\d?)",      // Hour (24-hour clock) as a decimal number [00,23]
    "I": "(\\d\\d?)",      // Hour (12-hour clock) as a decimal number [01,12]
    "m": "(\\d\\d?)",      // Month as a decimal number [01,12]
    "M": "(\\d\\d?)",      // Minute as a decimal number [00,59]
    "S": "(\\d\\d?)",      // Second as a decimal number [00,59]
    "y": "(\\d\\d?)",      // Year without century as a decimal number [00,99]
    "Y": "(\\d\\d\\d\\d)", // Year with century as a decimal number
    "%": "%"               // A literal "%" character
};

/**
 * Maps directive codes to expected captured directive codes for each
 * directive - specified as lists as some directives can contain multiple
 * data items.
 *
 * @type Object
 */
time.TimeParser.EXPECTED_DATA_TYPES =
{
    "b": ["b"],
    "B": ["B"],
    "d": ["d"],
    "H": ["H"],
    "I": ["I"],
    "m": ["m"],
    "M": ["M"],
    "p": ["p"],
    "S": ["S"],
    "y": ["y"],
    "Y": ["Y"],
    "%": []
};

time.TimeParser.prototype =
{
    /**
     * Attempts to extract date and time details from the given input.
     * <p>
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
     * @type Array
     */
    parse: function(input)
    {
        var matches = this.regexp.exec(input);
        if (matches === null)
        {
            throw new Error("Time data did not match format: data=" + input +
                            ", format=" + this.format);
        }

        // Collect matches in an object under properties corresponding to their
        // data types.
        var data = {};
        for (var i = 1, l = matches.length; i < l; i++)
        {
            data[this.expected[i -1]] = matches[i];
        }

        // Default values for when more accurate values cannot be inferred
        var time = [1900, 1, 1, 0, 0, 0, 0, 1, -1];

        // Extract year
        if (typeof data["Y"] != "undefined")
        {
            time[0] = parseInt(data["Y"], 10);
        }
        else if (typeof data["y"] != "undefined")
        {
            var year = parseInt(data["y"], 10);
            if (year < 68)
            {
                year = 2000 + year;
            }
            else if (year < 100)
            {
                year = 1900 + year;
            }
            time[0] = year;
        }

        // Extract month
        if (typeof data["m"] != "undefined")
        {
            var month = parseInt(data["m"], 10);
            if (month < 1 || month > 12)
            {
                throw new Error("Month is out of range: " + month);
            }
            time[1] = month;
        }
        else if (typeof data["B"] != "undefined")
        {
            time[1] = this._indexOf(data["B"], this.locale.B) + 1;
        }
        else if (typeof data["b"] != "undefined")
        {
            time[1] = this._indexOf(data["b"], this.locale.b) + 1;
        }

        // Extract day of month
        if (typeof data["d"] != "undefined")
        {
            var day = parseInt(data["d"], 10);
            if (day < 1 || day > 31)
            {
                throw new Error("Day is out of range: " + day);
            }
            time[2] = day;
        }

        // Extract hour
        if (typeof data["H"] != "undefined")
        {
            var hour = parseInt(data["H"], 10);
            if (hour > 23)
            {
                throw new Error("Hour is out of range: " + hour);
            }
            time[3] = hour;
        }
        else if (typeof data["I"] != "undefined")
        {
            var hour = parseInt(data["I"], 10);
            if (hour < 1 || hour > 12)
            {
                throw new Error("Hour is out of range: " + hour);
            }

            // If we don't get any more information, we'll assume this time is
            // a.m. - 12 a.m. is midnight.
            if (hour == 12)
            {
                hour = 0;
            }

            time[3] = hour;

            if (typeof data["p"] != "undefined")
            {
                if (data["p"] == this.locale.PM)
                {
                    // We've already handled the midnight special case, so it's
                    // safe to bump the time by 12 hours without further checks.
                    time[3] = time[3] + 12;
                }
            }
        }

        // Extract minute
        if (typeof data["M"] != "undefined")
        {
            var minute = parseInt(data["M"], 10);
            if (minute > 59)
            {
                throw new Error("Minute is out of range: " + minute);
            }
            time[4] = minute;
        }

        // Extract seconds
        if (typeof data["S"] != "undefined")
        {
            var second = parseInt(data["S"], 10);
            if (second > 59)
            {
                throw new Error("Second is out of range: " + second);
            }
            time[5] = second;
        }

        // Validate day of month
        var day = time[2], month = time[1], year = time[0];
        if (((month == 4 || month == 6 || month == 9 || month == 11) &&
            day > 30)
            ||
            (month == 2 && day > ((year % 4 == 0 && year % 100 != 0 ||
                                   year % 400 == 0) ? 29 : 28)))
        {
            throw new Error("Day " + day + " is out of range for month " + month);
        }

        return time;
    },

    _indexOf: function(item, list)
    {
        for (var i = 0, l = list.length; i < l; i++)
        {
            if (item === list[i])
            {
                return i;
            }
        }
        return -1;
    }
};

/**
 * Parses time details from a string, based on a format string.
 *
 * @param {String} input the time string to be parsed.
 * @param {String} format the format to attempt to parse - see
 *                        {@link time.TimeParser} for further details.
 * @param {String} [locale] a locale name.
 *
 * @return a list of 9 integers, each corresponding to a time field - see
 *         {@link time.TimeParser#parse()} for further details.
 * @type Array
 */
time.strptime = function(input, format, locale)
{
    return new time.TimeParser(format, time.getLocale(locale)).parse(input);
};

/**
 * A partial implementation of <code>strftime</code>, which formats a date
 * according to a format string.
 * <p>
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
 *     <td><code>%Y</code></td>
 *     <td>Year with century as a decimal number.</td>
 *   </tr>
 *   <tr>
 *     <td><code>%%</code></td>
 *     <td>A literal "<tt class="character">%</tt>" character.</td>
 *   </tr>
 * </tbody>
 * </table>
 *
 * @param {Date} date the date to be formatted.
 * @param {String} format a string specifying how the date should be formatted.
 * @param {String} [locale] a locale name - if not supplied, the default locale
 *                          will be used.
 *
 * @return a formatted version of the given date.
 * @type String
 * @function
 */
time.strftime = function()
{
    /**
     * Pads a number to a given size with a given string.
     *
     * @param {Number} number the number to be padded.
     * @param {Number} size the size the given number should be padded to.
     * @param {String} [padding] the string to be used to pad the number -
     *                           defaults to <code>"0"</code>.
     *
     * @return a padded version of the given number.
     * @type String
     */
    function pad(number, size, padding)
    {
        var padded = "" + number;
        padding = padding || "0";
        while (padded.length < size)
        {
            padded = padding + padded;
        }
        return padded;
    };

    /**
     * Maps directive codes to functions which take the date to be formatted and
     * locale details (if required), returning an appropriate formatted value.
     */
    var directives =
    {
        "a": function(d, l) { return l.a[d.getDay()]; },
        "A": function(d, l) { return l.A[d.getDay()]; },
        "b": function(d, l) { return l.b[d.getMonth()]; },
        "B": function(d, l) { return l.B[d.getMonth()]; },
        "d": function(d) { return pad(d.getDate(), 2); },
        "H": function(d) { return pad(d.getHours(), 2); },
        "M": function(d) { return pad(d.getMinutes(), 2); },
        "m": function(d) { return pad(d.getMonth() + 1, 2); },
        "S": function(d) { return pad(d.getSeconds(), 2); },
        "Y": function(d) { return d.getFullYear(); },
        "%": function(d) { return "%"; }
    };

    return function(date, format, locale)
    {
        locale = time.getLocale(locale);
        var formatted = [];
        var c;

        for (var i = 0, l = format.length; i < l; i++)
        {
            c = format.charAt(i);
            if (c == "%")
            {
                if (i == l - 1)
                {
                    throw new Error("strftime format ends with raw %");
                }

                c = format.charAt(++i);
                if (typeof directives[c] == "function")
                {
                    formatted[formatted.length] = directives[c](date, locale);
                }
            }
            else
            {
                formatted[formatted.length] = c;
            }
        }

        return formatted.join("");
    }
}();
