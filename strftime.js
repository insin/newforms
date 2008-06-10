/**
 * @fileOverview A partial implementation of <code>strftime</code>, as required
 *               to support the default date and time formats used by Django's
 *               newforms library.
 */

/**
 * Formats a date according to a format string.
 *
 * @param {Date} date the date to be formatted.
 * @param {String} format the format string.
 * @param {Object} [locale] an object containing locale-specific settings.
 *
 * @return a formatted version of the given date.
 * @type String
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

    return function(date, format, locale)
    {
        var directiveRegExp = /%\w|%%|./g;
        var formatted = [];

        while ((matches = directiveRegExp.exec(format)) !== null)
        {
            var part;
            switch (matches[0])
            {
                case "%d":
                    part = pad(date.getDate(), 2);
                    break;

                case "%H":
                    part = pad(date.getHours(), 2);
                    break;

                case "%M":
                    part = pad(date.getMinutes(), 2);
                    break;

                case "%m":
                    part = pad(date.getMonth() + 1, 2);
                    break;

                case "%S":
                    part = pad(date.getSeconds(), 2);
                    break;

                case "%Y":
                    part = date.getFullYear();
                    break;

                default:
                    part = matches[0];
                    break
            }
            formatted[formatted.length] = part;
        }

        return formatted.join("");
    }
}();
