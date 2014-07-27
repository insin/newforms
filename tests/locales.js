void function() {

var _defaultLocale

QUnit.module("locales", {
  setup: function() {
    _defaultLocale = forms.locales.getDefaultLocale()
  }
, teardown: function() {
    forms.setDefaultLocale(_defaultLocale)
  }
})

QUnit.test('Adding and using a new locale', function() {
  // Use addLocale to add a new locale with a language code. This should contain
  // date/time and input format settings.
  forms.addLocale('fr', {
    b: 'janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.'.split('_')
  , B: 'janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre'.split('_')
  , DATE_INPUT_FORMATS: [
      '%d/%m/%Y', '%d/%m/%y'
    , '%d %b %Y', '%d %b %y'
    , '%d %B %Y', '%d %B %y'
    ]
  , DATETIME_INPUT_FORMATS: [
      '%d/%m/%Y %H:%M:%S'
    , '%d/%m/%Y %H:%M'
    , '%d/%m/%Y'
    ]
  })

  // Set the default locale with setDefaultLocale
  forms.setDefaultLocale('fr')

  var w = forms.DateInput()
  var d = new Date(2014, 4, 17)
  reactHTMLEqual(w.render("date", d),
    "<input type=\"text\" name=\"date\" value=\"17/05/2014\">",
    "Date widget renders with first localised date format")
  w = forms.DateInput({format: '%d %b %Y'})
  reactHTMLEqual(w.render("date", d),
    "<input type=\"text\" name=\"date\" value=\"17 mai 2014\">",
    "Date widget renders localised month with custom date format")

  var f = forms.DateField()
  var expected = new Date(2006, 9, 25).valueOf()
  strictEqual(f.clean("25/10/2006").valueOf(), expected, 'localised date/month order parses')
  cleanErrorEqual(f, "Enter a valid date.", "10/25/2005") // default locale's month/date order no longer parses
  strictEqual(f.clean("25 octobre 2006").valueOf(), expected, 'localised month parses')
  strictEqual(f.clean("25 oct. 2006").valueOf(), expected, 'localised month abbreviation parses')
  strictEqual(f.clean("2006-10-25").valueOf(), expected, 'ISO format parses')

  f = forms.DateField({input_formats: ['%d %b %Y']})
})

}()
