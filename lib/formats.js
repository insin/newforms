'use strict';

var object = require('isomorph/object')

var locales = require('./locales')

/**
 * Standard input formats which will always be accepted.
 */
var ISO_INPUT_FORMATS = {
  'DATE_INPUT_FORMATS': ['%Y-%m-%d']
, 'TIME_INPUT_FORMATS': ['%H:%M:%S', '%H:%M']
, 'DATETIME_INPUT_FORMATS': [
    '%Y-%m-%d %H:%M:%S'
  , '%Y-%m-%d %H:%M'
  , '%Y-%m-%d'
  ]
}

var formatCache = {}

/**
 * Gets all acceptable formats of a certain type (e.g. DATE_INPUT_FORMATS) for a
 * particular language code. All date/time formats will have the applicable ISO
 * formats added as lowest-precedence.
 * If an unknown language code is given, the default locale's formats will be
 * used instead.
 * If the locale doesn't have configuration for the format type, only the ISO
 * formats will be returned.
 * @param {string} formatType
 * @param {string=} lang language code - if not given, the default locale's
 *   formats will be returned.
 * @return {Array.<string>} a list of formats
 */
function getFormat(formatType, lang) {
  if (!lang) {
    lang = locales.getDefaultLocale()
  }
  var cacheKey = formatType + ':' + lang
  if (!object.hasOwn(formatCache, cacheKey)) {
    var langLocales = locales.getLocales(lang)
    var localeFormats = []
    for (var i = 0, l = langLocales.length; i < l; i++) {
      var locale = langLocales[i]
      if (object.hasOwn(locale, formatType)) {
        // Copy locale-specific formats, as we may be adding to them
        localeFormats = locale[formatType].slice()
        break
      }
    }
    if (object.hasOwn(ISO_INPUT_FORMATS, formatType)) {
      var isoFormats = ISO_INPUT_FORMATS[formatType]
      for (var j = 0, m = isoFormats.length; j < m; j++) {
        var isoFormat = isoFormats[j]
        if (localeFormats.indexOf(isoFormat) == -1) {
          localeFormats.push(isoFormat)
        }
      }
    }
    formatCache[cacheKey] = localeFormats
  }
  return formatCache[cacheKey]
}

module.exports = {
  getFormat: getFormat
}
