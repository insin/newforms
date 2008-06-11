/**
 * @fileOverview A partial implementation of <code>strptime</code>.
 *
 * This implementation largely takes its cue from the documentation for Python's
 * <code>time</code> module, as documented at
 * http://docs.python.org/lib/module-time.html - with the exception of seconds
 * formatting, which is restricted to the range [00,59] rather than [00,61].
 */

/**
 * Parses time details from a string using a given strptime format string and
 * optionally, an object specifying locale details.
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
 * @param {String} a strptime format string.
 * @param {Object} [locale] an object containing locale-specific settings.
 * @config {String} NAME the locale's name.
 * @config {Object} ABBREVIATED_MONTHS an object mapping abbreviated locale
 *                                     month names to corresponding month
 *                                     numbers [1-12].
 * @config {Object} FULL_MONTHS an object mapping full locale month names to
 *                              corresponding month numbers [1-12].
 * @constructor
 */
function TimeParser(format, locale)
{
    locale = locale || TimeParser.DEFAULT_LOCALE;
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
                throw new Error("stray % in format '" + format + "'");
            }

            c = format.charAt(++i);
            var directiveType = typeof TimeParser.DIRECTIVE_PATTERNS[c];
            if (directiveType == "undefined")
            {
                throw new Error(c + " is a bad directive in format %" + c);
            }
            else if (directiveType == "function")
            {
                pattern[pattern.length] =
                    TimeParser.DIRECTIVE_PATTERNS[c](locale);
            }
            else
            {
                pattern[pattern.length] = TimeParser.DIRECTIVE_PATTERNS[c];
            }
            expected = expected.concat(TimeParser.EXPECTED_DATA_TYPES[c]);
        }
        else
        {
            pattern[pattern.length] = c;
        }
    }

    this.locale = locale;
    this.pattern = new RegExp("^" + pattern.join("") + "$");
    this.expected = expected;
}

/**
 * Maps directive codes to regular expression pattern fragments which will
 * capture the data the directive corresponds to, or in the case of
 * locale-dependent directives, a function which takes a locale and generates
 * a regular expression pattern fragment.
 */
TimeParser.DIRECTIVE_PATTERNS =
{
    // Locale's abbreviated month name
    "b": function(l) { return "(" + l.ABBREVIATED_MONTHS.join("|") + ")"; },
    // Locale's full month name
    "B": function(l) { return "(" + l.FULL_MONTHS.join("|") + ")"; },
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
 * Data types identified by directives.
 */
TimeParser.DATA_TYPES =
{
    ABBREVIATED_MONTH_NAME: 0,
    AMPM: 1,
    DAY_OF_MONTH: 2,
    FULL_MONTH_NAME: 3,
    HOUR12: 4,
    HOUR24: 5,
    MINUTE: 6,
    MONTH: 7,
    SECOND: 8,
    YEAR: 9,
    YEAR_NO_CENTURY: 10
};

/**
 * Maps directive codes to expected captured data types for each directive -
 * specified as lists as some directives can contain multiple data items.
 */
TimeParser.EXPECTED_DATA_TYPES =
{
    "b": [TimeParser.DATA_TYPES.ABBREVIATED_MONTH_NAME],
    "B": [TimeParser.DATA_TYPES.FULL_MONTH_NAME],
    "d": [TimeParser.DATA_TYPES.DAY_OF_MONTH],
    "H": [TimeParser.DATA_TYPES.HOUR24],
    "I": [TimeParser.DATA_TYPES.HOUR12],
    "m": [TimeParser.DATA_TYPES.MONTH],
    "M": [TimeParser.DATA_TYPES.MINUTE],
    "p": [TimeParser.DATA_TYPES.AMPM],
    "S": [TimeParser.DATA_TYPES.SECOND],
    "y": [TimeParser.DATA_TYPES.YEAR_NO_CENTURY],
    "Y": [TimeParser.DATA_TYPES.YEAR],
    "%": []
};

/**
 * Default English locale.
 */
TimeParser.DEFAULT_LOCALE =
{
    NAME: "English",
    AM: "AM",
    ABBREVIATED_MONTHS: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                         "Sep", "Oct", "Nov", "Dec"],
    FULL_MONTHS: ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November",
                  "December"],
    PM: "PM"
};

TimeParser.prototype =
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
        var matches = this.pattern.exec(input);
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
        if (typeof data[TimeParser.DATA_TYPES.YEAR] != "undefined")
        {
            time[0] = parseInt(data[TimeParser.DATA_TYPES.YEAR], 10);
        }
        else if (typeof data[TimeParser.DATA_TYPES.YEAR_NO_CENTURY] != "undefined")
        {
            var year = parseInt(data[TimeParser.DATA_TYPES.YEAR_NO_CENTURY], 10);
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
        if (typeof data[TimeParser.DATA_TYPES.MONTH] != "undefined")
        {
            var month = parseInt(data[TimeParser.DATA_TYPES.MONTH], 10);
            if (month < 1 || month > 12)
            {
                throw new Error("Month is out of range: " + month);
            }
            time[1] = month;
        }
        else if (typeof data[TimeParser.DATA_TYPES.FULL_MONTH_NAME] != "undefined")
        {
            time[1] = this._indexOf(data[TimeParser.DATA_TYPES.FULL_MONTH_NAME],
                                    this.locale.FULL_MONTHS) + 1;
        }
        else if (typeof data[TimeParser.DATA_TYPES.ABBREVIATED_MONTH_NAME] != "undefined")
        {
            time[1] = this._indexOf(data[TimeParser.DATA_TYPES.ABBREVIATED_MONTH_NAME],
                                    this.locale.ABBREVIATED_MONTHS) + 1;
        }

        // Extract day of month
        if (typeof data[TimeParser.DATA_TYPES.DAY_OF_MONTH] != "undefined")
        {
            var day = parseInt(data[TimeParser.DATA_TYPES.DAY_OF_MONTH], 10);
            if (day < 1 || day > 31)
            {
                throw new Error("Day is out of range: " + day);
            }
            time[2] = day;
        }

        // Extract hour
        if (typeof data[TimeParser.DATA_TYPES.HOUR24] != "undefined")
        {
            var hour = parseInt(data[TimeParser.DATA_TYPES.HOUR24], 10);
            if (hour > 23)
            {
                throw new Error("Hour is out of range: " + hour);
            }
            time[3] = hour;
        }
        else if (typeof data[TimeParser.DATA_TYPES.HOUR12] != "undefined")
        {
            var hour = parseInt(data[TimeParser.DATA_TYPES.HOUR12], 10);
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

            if (typeof data[TimeParser.DATA_TYPES.AMPM] != "undefined")
            {
                if (data[TimeParser.DATA_TYPES.AMPM] == this.locale.PM)
                {
                    // We've already handled the midnight special case, so it's
                    // safe to bump the time by 12 hours without further checks.
                    time[3] = time[3] + 12;
                }
            }
        }

        // Extract minute
        if (typeof data[TimeParser.DATA_TYPES.MINUTE] != "undefined")
        {
            var minute = parseInt(data[TimeParser.DATA_TYPES.MINUTE], 10);
            if (minute > 59)
            {
                throw new Error("Minute is out of range: " + minute);
            }
            time[4] = minute;
        }

        // Extract seconds
        if (typeof data[TimeParser.DATA_TYPES.SECOND] != "undefined")
        {
            var second = parseInt(data[TimeParser.DATA_TYPES.SECOND], 10);
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
 * Parse a string representing a time according to a format.
 *
 * @param {String} input the string to be parsed.
 * @param {String} format the format to attempt to parse - see
 *                        {@link TimeParser} for further details.
 * @param {Object} [locale] an object containing locale-specific settings - see
 *                          {@link TimeParser} for further details.
 *
 * @return a list of 9 integers, each corresponding to a time field - see
 *         {@link TimeParser#parse()} for further details.
 * @type Array
 */
function strptime(input, format, locale)
{
    return new TimeParser(format,
                          locale || TimeParser.DEFAULT_LOCALE).parse(input);
}
