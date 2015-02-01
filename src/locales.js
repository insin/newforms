'use strict';

var object = require('isomorph/object')
var time = require('isomorph/time')

var defaultLocale = {lang: 'en'}

var localeCache = {
  en: {
    DATE_INPUT_FORMATS: [
      '%Y-%m-%d'                        // '2006-10-25'
    , '%m/%d/%Y', '%m/%d/%y'            // '10/25/2006', '10/25/06'
    , '%b %d %Y', '%b %d, %Y'           // 'Oct 25 2006', 'Oct 25, 2006'
    , '%d %b %Y', '%d %b, %Y'           // '25 Oct 2006', '25 Oct, 2006'
    , '%B %d %Y', '%B %d, %Y'           // 'October 25 2006', 'October 25, 2006'
    , '%d %B %Y', '%d %B, %Y'           // '25 October 2006', '25 October, 2006'
    ]
  , DATETIME_INPUT_FORMATS: [
      '%Y-%m-%d %H:%M:%S'               // '2006-10-25 14:30:59'
    , '%Y-%m-%d %H:%M'                  // '2006-10-25 14:30'
    , '%Y-%m-%d'                        // '2006-10-25'
    , '%m/%d/%Y %H:%M:%S'               // '10/25/2006 14:30:59'
    , '%m/%d/%Y %H:%M'                  // '10/25/2006 14:30'
    , '%m/%d/%Y'                        // '10/25/2006'
    , '%m/%d/%y %H:%M:%S'               // '10/25/06 14:30:59'
    , '%m/%d/%y %H:%M'                  // '10/25/06 14:30'
    , '%m/%d/%y'                        // '10/25/06'
    ]
  }
, en_GB: {
    DATE_INPUT_FORMATS: [
      '%d/%m/%Y', '%d/%m/%y'            // '25/10/2006', '25/10/06'
    , '%b %d %Y', '%b %d, %Y'           // 'Oct 25 2006', 'Oct 25, 2006'
    , '%d %b %Y', '%d %b, %Y'           // '25 Oct 2006', '25 Oct, 2006'
    , '%B %d %Y', '%B %d, %Y'           // 'October 25 2006', 'October 25, 2006'
    , '%d %B %Y', '%d %B, %Y'           // '25 October 2006', '25 October, 2006'
    ]
  , DATETIME_INPUT_FORMATS: [
      '%Y-%m-%d %H:%M:%S'               // '2006-10-25 14:30:59'
    , '%Y-%m-%d %H:%M'                  // '2006-10-25 14:30'
    , '%Y-%m-%d'                        // '2006-10-25'
    , '%d/%m/%Y %H:%M:%S'               // '25/10/2006 14:30:59'
    , '%d/%m/%Y %H:%M'                  // '25/10/2006 14:30'
    , '%d/%m/%Y'                        // '25/10/2006'
    , '%d/%m/%y %H:%M:%S'               // '25/10/06 14:30:59'
    , '%d/%m/%y %H:%M'                  // '25/10/06 14:30'
    , '%d/%m/%y'                        // '25/10/06'
    ]
  }
}

/**
 * Adds a locale object to our own cache (for formats) and isomorph.time's cache
 * (for time parsing/formatting).
 * @param {string} lang
 * @param {string=} locale
 */
function addLocale(lang, locale) {
  localeCache[lang] = locale
  time.locales[lang] = locale
}

/**
 * Gets the most applicable locale, falling back to the language code if
 * necessary and to the default locale if no matching locale was found.
 * @param {string=} lang
 */
function getLocale(lang) {
  if (lang) {
    if (object.hasOwn(localeCache, lang)) {
      return localeCache[lang]
    }
    if (lang.indexOf('_') != -1) {
      lang = lang.split('_')[0]
      if (object.hasOwn(localeCache, lang)) {
        return localeCache[lang]
      }
    }
  }
  return localeCache[defaultLocale.lang]
}

/**
 * Gets all applicable locales, with the most specific first, falling back to
 * the default locale if necessary.
 * @param {string=} lang
 * @return {Array.<Object>}
 */
function getLocales(lang) {
  if (lang) {
    var locales = []
    if (object.hasOwn(localeCache, lang)) {
       locales.push(localeCache[lang])
    }
    if (lang.indexOf('_') != -1) {
      lang = lang.split('_')[0]
      if (object.hasOwn(localeCache, lang)) {
        locales.push(localeCache[lang])
      }
    }
    if (locales.length) {
      return locales
    }
  }
  return [localeCache[defaultLocale.lang]]
}

/**
 * Sets the language code for the default locale.
 * @param {string} lang
 */
function setDefaultLocale(lang) {
  if (!object.hasOwn(localeCache, lang)) {
    throw new Error('Unknown locale: ' + lang)
  }
  defaultLocale.lang = lang
}

/**
 * @return {string} the language code for the default locale.
 */
function getDefaultLocale() {
  return defaultLocale.lang
}

module.exports = {
  addLocale: addLocale
, getDefaultLocale: getDefaultLocale
, getLocale: getLocale
, getLocales: getLocales
, setDefaultLocale: setDefaultLocale
}
