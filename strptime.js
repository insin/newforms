/**
 * @fileOverview A partial implementation of <code>strptime</code>, as required
 *               to support the default valid date and time formats used by
 *               Django's newforms library.
 *
 * This implementation is based on a sample implementation found at
 * http://effbot.org/librarybook/time.htm and largely takes its cue from the
 * documentation for Python's <code>time</code> module, as documented at
 * http://docs.python.org/lib/module-time.html - with the exception of seconds
 * formatting, which is restricted to the range [00,59] rather than Python's
 * [00,61].
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
    this.format = format;
    format = format.split(/(?:\s|%t|%n)+/).join(" ");
    var pattern = [];
    var expected = [];
    var directiveRegExp = /%\w|%%|./g;
    var matches;

    while ((matches = directiveRegExp.exec(format)) !== null)
    {
        if (matches[0].charAt(0) == "%")
        {
            if (typeof TimeParser.DIRECTIVE_FORMATS[matches[0]] != "undefined")
            {
                pattern[pattern.length] = TimeParser.DIRECTIVE_FORMATS[matches[0]];
                expected = expected.concat(TimeParser.EXPECTED_DATA_TYPES[matches[0]]);
            }
            else
            {
                throw new Error("Unknown directive: " + matches[0]);
            }
        }
        else
        {
            pattern[pattern.length] = matches[0];
        }
    }

    this.locale = locale || TimeParser.DEFAULT_LOCALE;
    this.pattern = new RegExp(pattern.join(""), "i");
    this.expected = expected;
}

/**
 * Maps directive codes to regular expression fragments which will capture the
 * data the directive corresponds to.
 */
TimeParser.DIRECTIVE_FORMATS =
{
    "%b": "(.+)",           // Locale's abbreviated month name
    "%B": "(.+)",           // Locale's full month name
    "%d": "(\\d\\d?)",      // Day of the month as a decimal number [01,31]
    "%H": "(\\d\\d?)",      // Hour (24-hour clock) as a decimal number [00,23]
    "%m": "(\\d\\d?)",      // Month as a decimal number [01,12]
    "%M": "(\\d\\d?)",      // Minute as a decimal number [00,59]
    "%S": "(\\d\\d?)",      // Second as a decimal number [00,59]
    "%y": "(\\d\\d?)",      // Year without century as a decimal number [00,99]
    "%Y": "(\\d\\d\\d\\d)", // Year with century as a decimal number
    "%%": "%"               // A literal "%" character
};

/**
 * Data types identified by directives.
 */
TimeParser.DATA_TYPES =
{
    ABBREVIATED_MONTH_NAME: 0,
    DAY_OF_MONTH: 1,
    FULL_MONTH_NAME: 2,
    HOUR24: 3,
    MINUTE: 4,
    MONTH: 5,
    SECOND: 6,
    YEAR: 7,
    YEAR_NO_CENTURY: 8
};

/**
 * Maps directive codes to expected captured data types for each directive -
 * specified as lists as some directives can contain multiple data items.
 */
TimeParser.EXPECTED_DATA_TYPES =
{
    "%b": [TimeParser.DATA_TYPES.ABBREVIATED_MONTH_NAME],
    "%B": [TimeParser.DATA_TYPES.FULL_MONTH_NAME],
    "%d": [TimeParser.DATA_TYPES.DAY_OF_MONTH],
    "%H": [TimeParser.DATA_TYPES.HOUR24],
    "%m": [TimeParser.DATA_TYPES.MONTH],
    "%M": [TimeParser.DATA_TYPES.MINUTE],
    "%S": [TimeParser.DATA_TYPES.SECOND],
    "%y": [TimeParser.DATA_TYPES.YEAR_NO_CENTURY],
    "%Y": [TimeParser.DATA_TYPES.YEAR],
    "%%": []
};

/**
 * Default English locale.
 */
TimeParser.DEFAULT_LOCALE =
{
    NAME: "English",

    ABBREVIATED_MONTHS:
    {
        "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7,
        "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
    },

    FULL_MONTHS:
    {
        "January": 1, "February": 2, "March": 3, "April": 4, "May": 5,
        "June": 6, "July": 7, "August": 8, "September": 9, "October": 10,
        "November": 11, "December": 12
    }
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
     *     <td>Day of week (not implmented - always <code>0</code>)</td>
     *     <td>range [0,6], Monday is 0</td>
     *   </tr>
     *   <tr>
     *     <td><code>7</code></td>
     *     <td>Day of year (not implmented - always <code>1</code>)</td>
     *     <td>range [1,366]</td>
     *   </tr>
     *   <tr>
     *     <td><code>8</code></td>
     *     <td>Daylight savings flag (not implmented - always <code>-1</code>)</td>
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

        // Default values for when more accurate values cannot be inferred
        var time = [1900, 1, 1, 0, 0, 0, 0, 1, -1];

        for (var i = 1; i < matches.length; i++)
        {
            var match = matches[i];
            switch (this.expected[i - 1])
            {
                case TimeParser.DATA_TYPES.ABBREVIATED_MONTH_NAME:
                    if (typeof this.locale.ABBREVIATED_MONTHS[match] == "undefined")
                    {
                        throw new Error("Unknown abbreviated month name for " +
                                        this.locale.NAME + " locale: " + match);
                    }
                    time[1] = this.locale.ABBREVIATED_MONTHS[match];
                    break;

                case TimeParser.DATA_TYPES.DAY_OF_MONTH:
                    var day = parseInt(match, 10);
                    if (day < 1 || day > 31)
                    {
                        throw new Error("Day is out of range: " + day);
                    }
                    time[2] = day;
                    break;

                case TimeParser.DATA_TYPES.FULL_MONTH_NAME:
                    if (typeof this.locale.FULL_MONTHS[match] == "undefined")
                    {
                        throw new Error("Unknown full month name for " +
                                        this.locale.NAME + " locale: " + match);
                    }
                    time[1] = this.locale.FULL_MONTHS[match];
                    break;

                case TimeParser.DATA_TYPES.HOUR24:
                    var hour = parseInt(match, 10);
                    if (hour > 23)
                    {
                        throw new Error("Hour is out of range: " + hour);
                    }
                    time[3] = hour;
                    break;

                case TimeParser.DATA_TYPES.MINUTE:
                    var minute = parseInt(match, 10);
                    if (minute > 59)
                    {
                        throw new Error("Minute is out of range: " + minute);
                    }
                    time[4] = minute;
                    break;

                case TimeParser.DATA_TYPES.MONTH:
                    var month = parseInt(match, 10);
                    if (month < 1 || month > 12)
                    {
                        throw new Error("Month is out of range: " + month);
                    }
                    time[1] = month;
                    break;

                case TimeParser.DATA_TYPES.SECOND:
                    var second = parseInt(match, 10);
                    if (second > 59)
                    {
                        throw new Error("Second is out of range: " + second);
                    }
                    time[5] = second;
                    break;

                case TimeParser.DATA_TYPES.YEAR:
                    time[0] = parseInt(match, 10);
                    break;

                case TimeParser.DATA_TYPES.YEAR_NO_CENTURY:
                    var year = parseInt(match, 10);
                    if (year < 68)
                    {
                        year = 2000 + year;
                    }
                    else if (year < 100)
                    {
                        year = 1900 + year;
                    }
                    time[0] = year;
                    break;

                default:
                    throw new Error("Unknown data type: " + this.expected[i - 1]);
            }
        }

        // Validate day of month
        var day = time[2];
        var month = time[1];
        var year = time[0];
        if (((month == 4 || month == 6 || month == 9 || month == 11) &&
            day > 30)
            ||
            (month == 2 && day > ((year % 4 == 0 && year % 100 != 0 ||
                                   year % 400 == 0) ? 29 : 28)))
        {
            throw new Error("Day " + day + " is out of range for month " + month);
        }

        return time;
    }
};

/**
 * Parse a string representing a time according to a format.
 * <p>
 * See <code>TimeParser</code> for further details on the <code>format</code>
 * and <code>locale</code> arguments.
 * <p>
 * See <code>TimeParser.parse()</code> for further details on this function's
 * result.
 *
 * @param {String} input the string to be parsed.
 * @param {String} format the format to attempt to parse.
 * @param {Object} [locale] an object containing locale-specific settings.
 *
 * @return a list of 9 integers, each corresponding to a time field.
 * @type Array
 */
function strptime(input, format, locale)
{
    return new TimeParser(format,
                          locale || TimeParser.DEFAULT_LOCALE).parse(input);
}
