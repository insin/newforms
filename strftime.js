/**
 * @fileOverview A partial implementation of <code>strftime</code>, as required
 *               to support the default date and time formats used by Django's
 *               newforms library.
 */

/**
 * Formats a date according to a format string.
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
 * @param {String} format the format string.
 * @param {Object} [locale] an object containing locale-specific settings.
 *
 * @return a formatted version of the given date.
 * @type String
 * @function
 */
var strftime = function()
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
    var DIRECTIVES =
    {
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
                if (typeof DIRECTIVES[c] == "function")
                {
                    formatted[formatted.length] = DIRECTIVES[c](date, locale);
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
