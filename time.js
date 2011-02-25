(function(window)
{
/**
 * Maps directive codes to regular expression patterns which will capture the
 * data the directive corresponds to, or in the case of locale-dependent
 * directives, a function which takes a locale and generates a regular
 * expression pattern.
 */
var parserDirectives = {
        // Locale's abbreviated month name
        "b": function(l) { return "(" + l.b.join("|") + ")"; },
        // Locale's full month name
        "B": function(l) { return "(" + l.B.join("|") + ")"; },
        // Locale's equivalent of either AM or PM.
        "p": function(l) { return "(" + l.AM + "|" + l.PM + ")"; },
        "d": "(\\d\\d?)",  // Day of the month as a decimal number [01,31]
        "H": "(\\d\\d?)",  // Hour (24-hour clock) as a decimal number [00,23]
        "I": "(\\d\\d?)",  // Hour (12-hour clock) as a decimal number [01,12]
        "m": "(\\d\\d?)",  // Month as a decimal number [01,12]
        "M": "(\\d\\d?)",  // Minute as a decimal number [00,59]
        "S": "(\\d\\d?)",  // Second as a decimal number [00,59]
        "y": "(\\d\\d?)",  // Year without century as a decimal number [00,99]
        "Y": "(\\d{4})",   // Year with century as a decimal number
        "%": "%"           // A literal "%" character
    },
    /**
     * Maps directive codes to functions which take the date to be formatted and
     * locale details (if required), returning an appropriate formatted value.
     */
    formatterDirectives = {
        "a": function(d, l) { return l.a[d.getDay()]; },
        "A": function(d, l) { return l.A[d.getDay()]; },
        "b": function(d, l) { return l.b[d.getMonth()]; },
        "B": function(d, l) { return l.B[d.getMonth()]; },
        "d": function(d) { return pad(d.getDate(), 2); },
        "H": function(d) { return pad(d.getHours(), 2); },
        "M": function(d) { return pad(d.getMinutes(), 2); },
        "m": function(d) { return pad(d.getMonth() + 1, 2); },
        "S": function(d) { return pad(d.getSeconds(), 2); },
        "w": function(d) { return d.getDay(); },
        "Y": function(d) { return d.getFullYear(); },
        "%": function(d) { return "%"; }
    },
    /** Test for hanging percentage symbols. */
    strftimeFormatCheck = /[^%]%$/;

function isFunction(o)
{
    return (Object.prototype.toString.call(o) === "[object Function]");
}

/**
 * Pads a number with a leading zero if necessary.
 */
function pad(number)
{
    return (number < 10 ?  "0" + number : number);
}

/**
 * Returns the index of item in list, or -1 if it's not in list.
 */
function indexOf(item, list)
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
 *     <td>A literal "<tt>%</tt>" character.</td>
 *   </tr>
 * </tbody>
 * </table>
 *
 * @param {String} format a string specifying formatting directives.
 * @param {Object} locale the locale object to be used to create this parser.
 */
function TimeParser(format, locale)
{
    this.format = format;
    this.locale = locale;
    var cachedPattern = TimeParser._cache[locale.name + "|" + format];
    if (cachedPattern !== undefined)
    {
        this.re = cachedPattern[0];
        this.matchOrder = cachedPattern[1];
    }
    else
    {
        this.compilePattern();
    }
}

/**
 * Cache RegExps and match orders generated per locale/format string combo.
 */
TimeParser._cache = {};

TimeParser.prototype.compilePattern = function()
{
    // Normalise whitespace before further processing
    var format = this.format.split(/(?:\s|\t|\n)+/).join(" "),
        pattern = [],
        matchOrder = [],
        c,
        directive;

    for (var i = 0, l = format.length; i < l; i++)
    {
        c = format.charAt(i);
        if (c != "%")
        {
            pattern.push(c);
            continue;
        }

        if (i == l - 1)
        {
            throw new Error("strptime format ends with raw %");
        }

        c = format.charAt(++i);
        directive = parserDirectives[c];
        if (directive === undefined)
        {
            throw new Error("strptime format contains an unknown directive: '%" +
                            c + "'")
        }
        else if (isFunction(directive))
        {
            pattern.push(directive(this.locale));
        }
        else
        {
            pattern.push(directive);
        }

        if (c != "%")
        {
           matchOrder.push(c);
        }
    }

    this.re = new RegExp("^" + pattern.join("") + "$");
    this.matchOrder = matchOrder;
    TimeParser._cache[this.locale.name + "|" + this.format] = [this.re, matchOrder];
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
TimeParser.prototype.parse = function(input)
{
    var matches = this.re.exec(input);
    if (matches === null)
    {
        throw new Error("Time data did not match format: data=" + input +
                        ", format=" + this.format);
    }

        // Default values for when more accurate values cannot be inferred
    var time = [1900, 1, 1, 0, 0, 0, 0, 1, -1],
        // Matched time data, keyed by directive code
        data = {},
        // Data variables for extraction
        year, month, day, hour, month, second;
    for (var i = 1, l = matches.length; i < l; i++)
    {
        data[this.matchOrder[i - 1]] = matches[i];
    }

    // Extract year
    if ("Y" in data)
    {
        time[0] = parseInt(data.Y, 10);
    }
    else if ("y" in data)
    {
        var year = parseInt(data.y, 10);
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
    if ("m" in data)
    {
        var month = parseInt(data.m, 10);
        if (month < 1 || month > 12)
        {
            throw new Error("Month is out of range: " + month);
        }
        time[1] = month;
    }
    else if ("B" in data)
    {
        time[1] = indexOf(data.B, this.locale.B) + 1;
    }
    else if ("b" in data)
    {
        time[1] = indexOf(data.b, this.locale.b) + 1;
    }

    // Extract day of month
    if ("d" in data)
    {
        var day = parseInt(data.d, 10);
        if (day < 1 || day > 31)
        {
            throw new Error("Day is out of range: " + day);
        }
        time[2] = day;
    }

    // Extract hour
    if ("H" in data)
    {
        var hour = parseInt(data.H, 10);
        if (hour > 23)
        {
            throw new Error("Hour is out of range: " + hour);
        }
        time[3] = hour;
    }
    else if ("I" in data)
    {
        var hour = parseInt(data.I, 10);
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

        if ("p" in data)
        {
            if (data.p == this.locale.PM)
            {
                // We've already handled the midnight special case, so it's
                // safe to bump the time by 12 hours without further checks.
                time[3] = time[3] + 12;
            }
        }
    }

    // Extract minute
    if ("M" in data)
    {
        var minute = parseInt(data.M, 10);
        if (minute > 59)
        {
            throw new Error("Minute is out of range: " + minute);
        }
        time[4] = minute;
    }

    // Extract seconds
    if ("S" in data)
    {
        var second = parseInt(data.S, 10);
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
};

var time = {
    /**
     * Default locale name - must always exist in time.locales.
     */
    defaultLocale: "en",

    /**
     * Locale details.
     */
    locales: {
        "en": {
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
    },

    /**
     * Retrieves the locale with the given name, falling back to just the language
     * code finally to the default locale if a locale can't be found; retrieves the
     * default locale when called without arguments
     *
     * Locale names can consist of a language code (e.g. ``"en"``) or a language and
     * region code (e.g. ``"en-GB"``).
     */
    getLocale: function(code)
    {
        if (code)
        {
            if (code in this.locales)
            {
                return this.locales[code];
            }
            else if (code.length > 2)
            {
                // If we appear to have more than a language code, try the language
                // code on its own.
                var languageCode = code.substring(0, 2);
                if (languageCode in this.locales)
                {
                    return this.locales[languageCode];
                }
            }
        }
        return this.locales[this.defaultLocale];
    },

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
    strptime: function(input, format, locale)
    {
        return new TimeParser(format, this.getLocale(locale)).parse(input);
    },

    /**
     * Convenience wrapper around time.strptime which returns a JavaScript Date.
     */
    strpdate: function(input, format, locale)
    {
        var t = this.strptime(input, format, locale);
        return new Date(t[0], t[1] - 1, t[2], t[3], t[4], t[5]);
    },

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
     */
    strftime: function(date, format, locale)
    {
        if (strftimeFormatCheck.test(format)) {
            throw new Error("strftime format ends with raw %");
        }
        locale = this.getLocale(locale);
        return format.replace(/(%.)/g, function(s, f)
        {
            var code = f.charAt(1);
            if (typeof formatterDirectives[code] == "undefined") {
                throw new Error("Invalid format string");
            }
            return formatterDirectives[code](date, locale);
        });
    }
};

window.time = time;

})(window);
