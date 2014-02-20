QUnit.module("fields")

;(function() {

function widgetRendersTo(field, expectedHTML) {
  var _Form  = forms.Form.extend({f: field})
  reactHTMLEqual(function() { return new _Form().boundField('f').render() }, expectedHTML)
}

QUnit.test("Field sets widget isRequired", 2, function() {
  strictEqual(new forms.Field({required: true}).widget.isRequired, true)
  strictEqual(new forms.Field({required: false}).widget.isRequired, false)
})

QUnit.test("CharField", 34, function() {
  var f = forms.CharField()
  strictEqual(f.clean(1), "1")
  equal(f.clean("hello"), "hello")
  cleanErrorEqual(f, "This field is required.", null)
  cleanErrorEqual(f, "This field is required.", "")
  strictEqual(f.clean([1, 2, 3]), "1,2,3")
  strictEqual(f.maxLength, null)
  strictEqual(f.minLength, null)

  f = forms.CharField({required: false})
  strictEqual(f.clean(1), "1")
  equal(f.clean("hello"), "hello")
  strictEqual(f.clean(null), "")
  strictEqual(f.clean(""), "")
  strictEqual(f.clean([1, 2, 3]), "1,2,3")
  strictEqual(f.maxLength, null)
  strictEqual(f.minLength, null)

  // CharField accepts an optional maxLength parameter
  f = forms.CharField({maxLength: 10, required: false})
  equal(f.clean("12345"), "12345")
  equal(f.clean("1234567890"), "1234567890")
  cleanErrorEqual(f, "Ensure this value has at most 10 characters (it has 11).", "1234567890a")
  strictEqual(f.maxLength, 10)
  strictEqual(f.minLength, null)

  // CharField accepts an optional minLength parameter
  f = forms.CharField({minLength: 10, required: false})
  cleanErrorEqual(f, "Ensure this value has at least 10 characters (it has 5).", "12345")
  equal(f.clean("1234567890"), "1234567890")
  equal(f.clean("1234567890a"), "1234567890a")
  strictEqual(f.maxLength, null)
  strictEqual(f.minLength, 10)

  f = forms.CharField({minLength: 10, required: true})
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "Ensure this value has at least 10 characters (it has 5).", "12345")
  equal(f.clean("1234567890"), "1234567890")
  equal(f.clean("1234567890a"), "1234567890a")
  strictEqual(f.maxLength, null)
  strictEqual(f.minLength, 10)

  // Widget attrs
  // Return an empty object if maxLength is none...
  f = forms.CharField()
  deepEqual(f.widgetAttrs(forms.TextInput()), {})

  // ...or if the widget is not TextInput or PasswordInput
  f = forms.CharField({maxLength: 10})
  deepEqual(f.widgetAttrs(forms.HiddenInput()), {})

  // Otherwise, return a maxLength attribute equal to maxLength
  deepEqual(f.widgetAttrs(forms.TextInput()), {maxLength: '10'})
  deepEqual(f.widgetAttrs(forms.PasswordInput()), {maxLength: '10'})
})

QUnit.test("IntegerField", 55, function() {
  var f = forms.IntegerField()
  widgetRendersTo(f, "<input type=\"number\" name=\"f\" id=\"id_f\">" )
  cleanErrorEqual(f, "This field is required.", null)
  cleanErrorEqual(f, "This field is required.", "")
  strictEqual(f.clean("1"), 1)
  strictEqual(Object.prototype.toString.call(f.clean("1")), '[object Number]')
  strictEqual(f.clean("23"), 23)
  cleanErrorEqual(f, "Enter a whole number.", "a")
  strictEqual(f.clean(42), 42)
  cleanErrorEqual(f, "Enter a whole number.", 3.14)
  strictEqual(f.clean("1 "), 1)
  strictEqual(f.clean(" 1"), 1)
  strictEqual(f.clean(" 1 "), 1)
  cleanErrorEqual(f, "Enter a whole number.", "1a")
  strictEqual(f.maxValue, null)
  strictEqual(f.minValue, null)

  f = forms.IntegerField({required: false})
  strictEqual(f.clean(""), null)
  strictEqual(f.clean(null), null)
  strictEqual(f.clean("1"), 1)
  strictEqual(f.clean("23"), 23)
  cleanErrorEqual(f, "Enter a whole number.", "a")
  strictEqual(f.clean("1 "), 1)
  strictEqual(f.clean(" 1"), 1)
  strictEqual(f.clean(" 1 "), 1)
  cleanErrorEqual(f, "Enter a whole number.", "1a")
  strictEqual(f.maxValue, null)
  strictEqual(f.minValue, null)

  // IntegerField accepts an optional maxValue parameter
  f = forms.IntegerField({maxValue: 10})
  widgetRendersTo(f, "<input max=\"10\" type=\"number\" name=\"f\" id=\"id_f\">" )
  cleanErrorEqual(f, "This field is required.", null)
  strictEqual(f.clean(1), 1)
  strictEqual(f.clean(10), 10)
  cleanErrorEqual(f, "Ensure this value is less than or equal to 10.", 11)
  strictEqual(f.clean("10"), 10)
  cleanErrorEqual(f, "Ensure this value is less than or equal to 10.", "11")
  strictEqual(f.maxValue, 10)
  strictEqual(f.minValue, null)

  // IntegerField accepts an optional minValue parameter
  f = forms.IntegerField({minValue: 10})
  widgetRendersTo(f, "<input min=\"10\" type=\"number\" name=\"f\" id=\"id_f\">" )
  cleanErrorEqual(f, "This field is required.", null)
  cleanErrorEqual(f, "Ensure this value is greater than or equal to 10.", 1)
  strictEqual(f.clean(10), 10)
  strictEqual(f.clean(11), 11)
  strictEqual(f.clean("10"), 10)
  strictEqual(f.clean("11"), 11)
  strictEqual(f.maxValue, null)
  strictEqual(f.minValue, 10)

  // minValue and maxValue can be used together
  f = forms.IntegerField({minValue: 10, maxValue: 20})
  widgetRendersTo(f, "<input min=\"10\" max=\"20\" type=\"number\" name=\"f\" id=\"id_f\">")
  cleanErrorEqual(f, "This field is required.", null)
  cleanErrorEqual(f, "Ensure this value is greater than or equal to 10.", 1)
  strictEqual(f.clean(10), 10)
  strictEqual(f.clean(11), 11)
  strictEqual(f.clean("10"), 10)
  strictEqual(f.clean("11"), 11)
  strictEqual(f.clean(20), 20)
  cleanErrorEqual(f, "Ensure this value is less than or equal to 20.", 21)
  strictEqual(f.maxValue, 20)
  strictEqual(f.minValue, 10)
})

QUnit.test("FloatField", 38, function() {
  var f = forms.FloatField()
  widgetRendersTo(f, "<input step=\"any\" type=\"number\" name=\"f\" id=\"id_f\">" )
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", null)
  strictEqual(f.clean(1), 1.0)
  strictEqual(f.clean(23), 23.0)
  strictEqual(f.clean("3.14"), 3.1400000000000001)
  strictEqual(f.clean(3.14), 3.1400000000000001)
  strictEqual(f.clean(42), 42.0)
  cleanErrorEqual(f, "Enter a number.", "a")
  strictEqual(f.clean("1.0 "), 1.0)
  strictEqual(f.clean(" 1.0"), 1.0)
  strictEqual(f.clean(" 1.0 "), 1.0)
  cleanErrorEqual(f, "Enter a number.", "1.0a")
  strictEqual(f.maxValue, null)
  strictEqual(f.minValue, null)

  f = forms.FloatField({required: false})
  strictEqual(f.clean(""), null)
  strictEqual(f.clean(null), null)
  strictEqual(f.clean("1"), 1.0)
  strictEqual(f.maxValue, null)
  strictEqual(f.minValue, null)

  // FloatField accepts minValue and maxValue just like forms.IntegerField
  f = forms.FloatField({maxValue: 1.5, minValue: 0.5})
  widgetRendersTo(f, "<input min=\"0.5\" max=\"1.5\" step=\"any\" type=\"number\" name=\"f\" id=\"id_f\">" )
  cleanErrorEqual(f, "Ensure this value is less than or equal to 1.5.", "1.6")
  cleanErrorEqual(f, "Ensure this value is greater than or equal to 0.5.", "0.4")
  strictEqual(f.clean("1.5"), 1.5)
  strictEqual(f.clean("0.5"), 0.5)
  strictEqual(f.maxValue, 1.5)
  strictEqual(f.minValue, 0.5)

  f = forms.FloatField({
    widget: forms.NumberInput({attrs: {step: '0.01', max: '1.0', min: '0.0'}})
  })
  widgetRendersTo(f, "<input step=\"0.01\" max=\"1.0\" min=\"0.0\" type=\"number\" name=\"f\" id=\"id_f\">")

  // FloatField implements its own _hasChanged due to String coercion issues
  // in JavaScript.
  strictEqual(f._hasChanged(null, ''), false)
  strictEqual(f._hasChanged('', ''), false)
  strictEqual(f._hasChanged('', null), false)
  strictEqual(f._hasChanged(null, 0), true)
  strictEqual(f._hasChanged('', 0), true)
  strictEqual(f._hasChanged("0.0", 1.0), true)
  strictEqual(f._hasChanged("1.0", 0.0), true)
  strictEqual(f._hasChanged("0.0", 0.0), false)
  strictEqual(f._hasChanged("1.0", 1.0), false)

  f = forms.FloatField()
  var n = 4.35
  strictEqual(f._hasChanged(n, '4.3500'), false)
})

QUnit.test("DecimalField", 65, function() {
  var f = forms.DecimalField({maxDigits: 4, decimalPlaces: 2})
  widgetRendersTo(f, "<input step=\"0.01\" type=\"number\" name=\"f\" id=\"id_f\">")
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", null)
  strictEqual(f.clean("1"), "1")
  strictEqual(Object.prototype.toString.call(f.clean("1")), '[object String]')
  strictEqual(f.clean("23"), "23")
  strictEqual(f.clean("3.14"), "3.14")
  strictEqual(f.clean(3.14), "3.14")
  cleanErrorEqual(f, "Enter a number.", "NaN")
  cleanErrorEqual(f, "Enter a number.", "Infinity")
  cleanErrorEqual(f, "Enter a number.", "-Infinity")
  cleanErrorEqual(f, "Enter a number.", "a")
  cleanErrorEqual(f, "Enter a number.", "????")
  strictEqual(f.clean("1.0 "), "1.0")
  strictEqual(f.clean(" 1.0"), "1.0")
  strictEqual(f.clean(" 1.0 "), "1.0")
  cleanErrorEqual(f, "Enter a number.", "1.0a")
  cleanErrorEqual(f, "Ensure that there are no more than 4 digits in total.", "123.45")
  cleanErrorEqual(f, "Ensure that there are no more than 2 decimal places.", "1.234")
  cleanErrorEqual(f, "Ensure that there are no more than 2 digits before the decimal point.", "123.4")
  strictEqual(f.clean("-12.34"), "-12.34")
  cleanErrorEqual(f, "Ensure that there are no more than 4 digits in total.", "-123.45")
  strictEqual(f.clean("-.12"), "-0.12")
  strictEqual(f.clean("-00.12"), "-0.12")
  strictEqual(f.clean("-000.12"), "-0.12")
  cleanErrorEqual(f, "Ensure that there are no more than 2 decimal places.", "-000.123")
  cleanErrorEqual(f, "Ensure that there are no more than 2 decimal places.", "-000.1234")
  cleanErrorEqual(f, "Ensure that there are no more than 4 digits in total.", "-000.12345")
  cleanErrorEqual(f, "Enter a number.", "--0.12")
  strictEqual(f.maxDigits, 4)
  strictEqual(f.decimalPlaces, 2)
  strictEqual(f.maxValue, null)
  strictEqual(f.minValue, null)

  f = forms.DecimalField({maxDigits: 4, decimalPlaces: 2, required: false})
  strictEqual(f.clean(""), null)
  strictEqual(f.clean(null), null)
  strictEqual(f.clean(1), "1")
  strictEqual(f.maxDigits, 4)
  strictEqual(f.decimalPlaces, 2)
  strictEqual(f.maxValue, null)
  strictEqual(f.minValue, null)

  // DecimalField accepts min_value and max_value just like IntegerField
  f = forms.DecimalField({maxDigits: 4, decimalPlaces: 2, maxValue: 1.5, minValue: 0.5})
  widgetRendersTo(f, "<input min=\"0.5\" max=\"1.5\" step=\"0.01\" type=\"number\" name=\"f\" id=\"id_f\">" )
  cleanErrorEqual(f, "Ensure this value is less than or equal to 1.5.", "1.6")
  cleanErrorEqual(f, "Ensure this value is greater than or equal to 0.5.", "0.4")
  strictEqual(f.clean("1.5"), "1.5")
  strictEqual(f.clean("0.5"), "0.5")
  strictEqual(f.clean(".5"), "0.5")
  strictEqual(f.clean("00.50"), "0.50")
  strictEqual(f.maxDigits, 4)
  strictEqual(f.decimalPlaces, 2)
  strictEqual(f.maxValue, 1.5)
  strictEqual(f.minValue, 0.5)

  f = forms.DecimalField({decimalPlaces: 2})
  cleanErrorEqual(f, "Ensure that there are no more than 2 decimal places.", "0.00000001")

  f = forms.DecimalField({maxDigits: 3})
  // Leading whole zeros "collapse" to one digit.
  equal(f.clean("0000000.10"), "0.10")
  // But a leading 0 before the . doesn"t count towards max_digits
  equal(f.clean("0000000.100"), "0.100")
  // Only leading whole zeros "collapse" to one digit.
  equal(f.clean("000000.02"), "0.02")
  cleanErrorEqual(f, "Ensure that there are no more than 3 digits in total.", "000000.0002")
  equal(f.clean(".002"), "0.002")

  f = forms.DecimalField({maxDigits: 2, decimalPlaces: 2})
  equal(f.clean(".01"), "0.01")
  cleanErrorEqual(f, "Ensure that there are no more than 0 digits before the decimal point.", "1.1")

  // Widget attrs
  f = forms.DecimalField({maxDigits: 6, decimalPlaces: 2})
  deepEqual(f.widgetAttrs(forms.Widget()), {})
  deepEqual(f.widgetAttrs(forms.NumberInput()), {step: '0.01'})
  f = forms.DecimalField({maxDigits: 10, decimalPlaces: 0})
  deepEqual(f.widgetAttrs(forms.NumberInput()), {step: '1'})
  f = forms.DecimalField({maxDigits: 19, decimalPlaces: 19})
  deepEqual(f.widgetAttrs(forms.NumberInput()), {step: '1e-19'})
  f = forms.DecimalField({maxDigits: 20})
  deepEqual(f.widgetAttrs(forms.NumberInput()), {step: 'any'})
  f = forms.DecimalField({maxDigits: 6, widget: forms.NumberInput({attrs: {step: '0.01'}})})
  widgetRendersTo(f, "<input step=\"0.01\" type=\"number\" name=\"f\" id=\"id_f\">")

  // Let's wait for a native decimal type...
  // f = forms.DecimalField({maxDigits: 2, decimalPlaces: 2})
  // var d = 0.1
  // strictEqual(f._hasChanged(d, '0.10'), false)
  // strictEqual(f._hasChanged(d, '0.101'), true)
})

QUnit.test("DateField", 33, function() {
  var f = forms.DateField()
  var expected = new Date(2006, 9, 25).valueOf()
  strictEqual(f.clean(new Date(2006, 9, 25)).valueOf(), expected)
  strictEqual(f.clean(new Date(2006, 9, 25, 14, 30)).valueOf(), expected)
  strictEqual(f.clean(new Date(2006, 9, 25, 14, 30, 59)).valueOf(), expected)
  strictEqual(f.clean(new Date(2006, 9, 25, 14, 30, 59, 200)).valueOf(), expected)
  strictEqual(f.clean("2006-10-25").valueOf(), expected)
  strictEqual(f.clean("10/25/2006").valueOf(), expected)
  strictEqual(f.clean("10/25/06").valueOf(), expected)
  strictEqual(f.clean("Oct 25 2006").valueOf(), expected)
  strictEqual(f.clean("October 25 2006").valueOf(), expected)
  strictEqual(f.clean("October 25, 2006").valueOf(), expected)
  strictEqual(f.clean("25 October 2006").valueOf(), expected)
  strictEqual(f.clean("25 October, 2006").valueOf(), expected)
  cleanErrorEqual(f, "Enter a valid date.", "2006-4-31")
  cleanErrorEqual(f, "Enter a valid date.", "200a-10-25")
  cleanErrorEqual(f, "Enter a valid date.", "25/10/06")
  cleanErrorEqual(f, "This field is required.", null)

  f = forms.DateField({required: false})
  strictEqual(f.clean(null), null)
  strictEqual(f.clean(""), null)

  // DateField accepts an optional inputFormats parameter
  f = forms.DateField({inputFormats: ["%Y %m %d"]})
  strictEqual(f.clean(new Date(2006, 9, 25)).valueOf(), expected)
  strictEqual(f.clean(new Date(2006, 9, 25, 14, 30)).valueOf(), expected)
  strictEqual(f.clean("2006 10 25").valueOf(), expected)

  // The input_formats parameter overrides all default input formats, so the
  // default formats won't work unless you specify them.
  cleanErrorEqual(f, "Enter a valid date.", "2006-10-25")
  cleanErrorEqual(f, "Enter a valid date.", "10/25/2006")
  cleanErrorEqual(f, "Enter a valid date.", "10/25/06")

  // Test whitespace stripping behaviour
  f = forms.DateField()
  strictEqual(f.clean(" 10/25/2006 ").valueOf(), expected)
  strictEqual(f.clean(" 10/25/06 ").valueOf(), expected)
  strictEqual(f.clean(" Oct 25   2006 ").valueOf(), expected)
  strictEqual(f.clean(" October  25 2006 ").valueOf(), expected)
  strictEqual(f.clean(" October 25, 2006 ").valueOf(), expected)
  strictEqual(f.clean(" 25 October 2006 ").valueOf(), expected)
  cleanErrorEqual(f, "Enter a valid date.", "   ")

  f = forms.DateField({inputFormats: ["%d/%m/%Y"]})
  var d = new Date(2007, 8, 17)
  strictEqual(f._hasChanged(d, "17/09/2007"), false)
  strictEqual(f._hasChanged("17/09/2007", "17/09/2007"), false)
})

QUnit.test("TimeField", 17, function() {
  var f = forms.TimeField()
  strictEqual(f.clean(new Date(1900, 0, 1, 14, 25)).valueOf(), new Date(1900, 0, 1, 14, 25).valueOf())
  strictEqual(f.clean(new Date(1900, 0, 1, 14, 25, 59)).valueOf(), new Date(1900, 0, 1, 14, 25, 59).valueOf())
  strictEqual(f.clean("14:25").valueOf(), new Date(1900, 0, 1, 14, 25).valueOf())
  strictEqual(f.clean("14:25:59").valueOf(), new Date(1900, 0, 1, 14, 25, 59).valueOf())
  cleanErrorEqual(f, "Enter a valid time.", "hello")
  cleanErrorEqual(f, "Enter a valid time.", "1:24 p.m.")

  // TimeField accepts an optional inputFormats parameter
  f = forms.TimeField({inputFormats: ["%I:%M %p"]})
  strictEqual(f.clean(new Date(1900, 0, 1, 14, 25)).valueOf(), new Date(1900, 0, 1, 14, 25).valueOf())
  strictEqual(f.clean(new Date(1900, 0, 1, 14, 25, 59)).valueOf(), new Date(1900, 0, 1, 14, 25, 59).valueOf())
  strictEqual(f.clean("4:25 AM").valueOf(), new Date(1900, 0, 1, 4, 25).valueOf())
  strictEqual(f.clean("4:25 PM").valueOf(), new Date(1900, 0, 1, 16, 25).valueOf())

  // The inputFormats parameter overrides all default input formats, so the
  // default formats won't work unless you specify them.
  cleanErrorEqual(f, "Enter a valid time.", "14:30:45")

  // Test whitespace stripping behaviour
  f = forms.TimeField()
  strictEqual(f.clean("  14:25  ").valueOf(), new Date(1900, 0, 1, 14, 25).valueOf())
  strictEqual(f.clean("  14:25:59  ").valueOf(), new Date(1900, 0, 1, 14, 25, 59).valueOf())
  cleanErrorEqual(f, "Enter a valid time.", "   ")

  f = forms.TimeField({inputFormats: ["%H:%M"]})
  strictEqual(f._hasChanged(new Date(1900, 0, 1, 12, 51, 34), "12:51"), true)
  strictEqual(f._hasChanged(new Date(1900, 0, 1, 12, 51), "12:51"), false)

  f = forms.TimeField({inputFormats: ["%I:%M %p"]})
  strictEqual(f._hasChanged("12:51 PM", "12:51 PM"), false)
})

QUnit.test("DateTimeField", 36, function() {
  var f = forms.DateTimeField()
  strictEqual(f.clean(new Date(2006, 9, 25)).valueOf(), new Date(2006, 9, 25).valueOf())
  strictEqual(f.clean(new Date(2006, 9, 25, 14, 30)).valueOf(), new Date(2006, 9, 25, 14, 30).valueOf())
  strictEqual(f.clean(new Date(2006, 9, 25, 14, 30, 59)).valueOf(), new Date(2006, 9, 25, 14, 30, 59).valueOf())
  strictEqual(f.clean(new Date(2006, 9, 25, 14, 30, 59, 200)).valueOf(), new Date(2006, 9, 25, 14, 30, 59, 200).valueOf())
  strictEqual(f.clean("2006-10-25 14:30:45").valueOf(), new Date(2006, 9, 25, 14, 30, 45).valueOf())
  strictEqual(f.clean("2006-10-25 14:30:00").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf())
  strictEqual(f.clean("2006-10-25 14:30").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf())
  strictEqual(f.clean("2006-10-25").valueOf(), new Date(2006, 9, 25).valueOf())
  strictEqual(f.clean("10/25/2006 14:30:45").valueOf(), new Date(2006, 9, 25, 14, 30, 45).valueOf())
  strictEqual(f.clean("10/25/2006 14:30:00").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf())
  strictEqual(f.clean("10/25/2006 14:30").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf())
  strictEqual(f.clean("10/25/2006").valueOf(), new Date(2006, 9, 25).valueOf())
  strictEqual(f.clean("10/25/06 14:30:45").valueOf(), new Date(2006, 9, 25, 14, 30, 45).valueOf())
  strictEqual(f.clean("10/25/06 14:30:00").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf())
  strictEqual(f.clean("10/25/06 14:30").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf())
  strictEqual(f.clean("10/25/06").valueOf(), new Date(2006, 9, 25).valueOf())
  cleanErrorEqual(f, "Enter a valid date/time.", "hello")
  cleanErrorEqual(f, "Enter a valid date/time.", "2006-10-25 4:30 p.m.")

  // DateField accepts an optional input_formats parameter
  f = forms.DateTimeField({inputFormats: ["%Y %m %d %I:%M %p"]})
  strictEqual(f.clean(new Date(2006, 9, 25)).valueOf(), new Date(2006, 9, 25).valueOf())
  strictEqual(f.clean(new Date(2006, 9, 25, 14, 30)).valueOf(), new Date(2006, 9, 25, 14, 30).valueOf())
  strictEqual(f.clean(new Date(2006, 9, 25, 14, 30, 59)).valueOf(), new Date(2006, 9, 25, 14, 30, 59).valueOf())
  strictEqual(f.clean(new Date(2006, 9, 25, 14, 30, 59, 200)).valueOf(), new Date(2006, 9, 25, 14, 30, 59, 200).valueOf())
  strictEqual(f.clean("2006 10 25 2:30 PM").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf())

  // The inputFormats parameter overrides all default input formats, so the
  // default formats won't work unless you specify them
  cleanErrorEqual(f, "Enter a valid date/time.", "2006-10-25 14:30:45")

  f = forms.DateTimeField({required: false})
  strictEqual(f.clean(null), null)
  strictEqual(f.clean(""), null)

  // Test whitespace stripping behaviour
  f = forms.DateTimeField()
  strictEqual(f.clean(" 2006-10-25   14:30:45 ").valueOf(), new Date(2006, 9, 25, 14, 30, 45).valueOf())
  strictEqual(f.clean(" 2006-10-25 ").valueOf(), new Date(2006, 9, 25).valueOf())
  strictEqual(f.clean(" 10/25/2006 14:30:45 ").valueOf(), new Date(2006, 9, 25, 14, 30, 45).valueOf())
  strictEqual(f.clean(" 10/25/2006 14:30 ").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf())
  strictEqual(f.clean(" 10/25/2006 ").valueOf(), new Date(2006, 9, 25).valueOf())
  strictEqual(f.clean(" 10/25/06 14:30:45 ").valueOf(), new Date(2006, 9, 25, 14, 30, 45).valueOf())
  strictEqual(f.clean(" 10/25/06 ").valueOf(), new Date(2006, 9, 25).valueOf())
  cleanErrorEqual(f, "Enter a valid date/time.", "   ")

  f = forms.DateTimeField({inputFormats: ["%Y %m %d %I:%M %p"]})
  var d = new Date(2006, 9, 17, 14, 30, 0)
  strictEqual(f._hasChanged(d, "2006 10 17 2:30 PM"), false)
  // Initial value may be a string from a hidden input
  strictEqual(f._hasChanged("2006 10 17 2:30 PM", "2006 10 17 2:30 PM"), false)
})

QUnit.test("RegexField", 24, function() {
  var f = forms.RegexField("^\\d[A-F]\\d$")
  equal(f.clean("2A2"), "2A2")
  equal(f.clean("3F3"), "3F3")
  cleanErrorEqual(f, "Enter a valid value.", "3G3")
  cleanErrorEqual(f, "Enter a valid value.", " 2A2")
  cleanErrorEqual(f, "Enter a valid value.", "2A2 ")
  cleanErrorEqual(f, "This field is required.", "")

  f = forms.RegexField("^\\d[A-F]\\d$", {required: false})
  equal(f.clean("2A2"), "2A2")
  equal(f.clean("3F3"), "3F3")
  cleanErrorEqual(f, "Enter a valid value.", "3G3")
  equal(f.clean(""), "")

  // Alternatively, RegexField can take a compiled regular expression
  f = forms.RegexField(/^\d[A-F]\d$/)
  equal(f.clean("2A2"), "2A2")
  equal(f.clean("3F3"), "3F3")
  cleanErrorEqual(f, "Enter a valid value.", "3G3")
  cleanErrorEqual(f, "Enter a valid value.", " 2A2")
  cleanErrorEqual(f, "Enter a valid value.", "2A2 ")

  f = forms.RegexField("^\\d\\d\\d\\d$", {errorMessages: {invalid: 'Enter a four-digit number.'}})
  equal(f.clean("1234"), "1234")
  cleanErrorEqual(f, "Enter a four-digit number.", "123")
  cleanErrorEqual(f, "Enter a four-digit number.", "abcd")

  // RegexField also has minLength and maxLength parameters, for convenience
  f = forms.RegexField("^\\d+$", {minLength: 5, maxLength: 10})
  cleanErrorEqual(f, "Ensure this value has at least 5 characters (it has 3).", "123")
  cleanErrorEqual(f, ["Ensure this value has at least 5 characters (it has 3).", "Enter a valid value."], "abc")
  equal(f.clean("12345"), "12345")
  equal(f.clean("1234567890"), "1234567890")
  cleanErrorEqual(f, "Ensure this value has at most 10 characters (it has 11).", "12345678901")
  cleanErrorEqual(f, "Enter a valid value.", "12345a")

  // TODO test_change_regex_after_init
})

QUnit.test("EmailField", 25, function() {
  var f = forms.EmailField()
  widgetRendersTo(f, "<input type=\"email\" name=\"f\" id=\"id_f\">")
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", null)
  equal(f.clean("person@example.com"), "person@example.com")
  cleanErrorEqual(f, "Enter a valid email address.", "foo")
  cleanErrorEqual(f, "Enter a valid email address.", "foo@")
  cleanErrorEqual(f, "Enter a valid email address.", "foo@bar")
  cleanErrorEqual(f, "Enter a valid email address.", "example@invalid-.com")
  cleanErrorEqual(f, "Enter a valid email address.", "example@-invalid.com")
  cleanErrorEqual(f, "Enter a valid email address.", "example@inv-.alid-.com")
  cleanErrorEqual(f, "Enter a valid email address.", "example@inv-.-alid.com")
  equal(f.clean("example@valid-----hyphens.com"), "example@valid-----hyphens.com")
  equal(f.clean("example@valid-with-hyphens.com"), "example@valid-with-hyphens.com")
  cleanErrorEqual(f, "Enter a valid email address.", "example@.com")
  equal(f.clean('local@domain.with.idn.xyzäöüßabc.part.com'), 'local@domain.with.idn.xyz\xe4\xf6\xfc\xdfabc.part.com')

  // Hangs "forever" if catastrophic backtracking not fixed
  var addr = "viewx3dtextx26qx3d@yahoo.comx26latlngx3d15854521645943074058"
  equal(f.clean(addr), addr)

  f = forms.EmailField({required: false})
  strictEqual(f.clean(""), "")
  strictEqual(f.clean(null), "")
  equal(f.clean("person@example.com"), "person@example.com")
  equal(f.clean("      example@example.com  \t   \t "), "example@example.com")
  cleanErrorEqual(f, "Enter a valid email address.", "foo")

  // EmailField also has minLength and maxLength parameters, for convenience.
  f = forms.EmailField({minLength: 10, maxLength: 15})
  widgetRendersTo(f, "<input maxlength=\"15\" type=\"email\" name=\"f\" id=\"id_f\">")
  cleanErrorEqual(f, "Ensure this value has at least 10 characters (it has 9).", "a@foo.com")
  equal(f.clean("alf@foo.com"), "alf@foo.com")
  cleanErrorEqual(f, "Ensure this value has at most 15 characters (it has 20).", "alf123456788@foo.com")
})

QUnit.test("FileField", 23, function() {
  function SimpleUploadedFile(name, content) {
    this.name = name
    this.content = content
    this.size = (content !== null ? content.length : 0)
  }

  var f = forms.FileField()
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", "", "")
  equal(f.clean("", "files/test1.pdf"), "files/test1.pdf")
  cleanErrorEqual(f, "This field is required.", null)
  cleanErrorEqual(f, "This field is required.", null, "")
  equal(f.clean(null, "files/test2.pdf"), "files/test2.pdf")
  cleanErrorEqual(f, "No file was submitted. Check the encoding type on the form.", new SimpleUploadedFile("", ""))
  cleanErrorEqual(f, "No file was submitted. Check the encoding type on the form.", new SimpleUploadedFile("", ""), "")
  equal(f.clean(null, "files/test3.pdf"), "files/test3.pdf")
  cleanErrorEqual(f, "No file was submitted. Check the encoding type on the form.", "some content that is not a file")
  cleanErrorEqual(f, "The submitted file is empty.", new SimpleUploadedFile("name", null))
  cleanErrorEqual(f, "The submitted file is empty.", new SimpleUploadedFile("name", ""))
  ok(f.clean(new SimpleUploadedFile("name", "Some File Content")) instanceof SimpleUploadedFile, "Valid uploaded file details return the file object")
  ok(f.clean(new SimpleUploadedFile("name", "Some File Content"), "files/test4.pdf") instanceof SimpleUploadedFile, "Valid uploaded file details return the file object")

  f = forms.FileField({maxLength: 5})
  cleanErrorEqual(f, "Ensure this filename has at most 5 characters (it has 18).", new SimpleUploadedFile("test_maxlength.txt", "hello world"))
  equal(f.clean("", "files/test1.pdf"), "files/test1.pdf")
  equal(f.clean(null, "files/test2.pdf"), "files/test2.pdf")
  ok(f.clean(new SimpleUploadedFile("name", "Some File Content")) instanceof SimpleUploadedFile, "Valid uploaded file details return the file object")

  f = forms.FileField({allowEmptyFile: true})
  ok(f.clean(new SimpleUploadedFile("name", "")) instanceof SimpleUploadedFile, "Valid uploaded empty file details return the file object")

  // Test for the behavior of _hasChanged for FileField. The value of data
  // will more than likely come from request.FILES. The value of initial data
  // will likely be a filename stored in the database. Since its value is of
  // no use to a FileField it is ignored.
  f = forms.FileField()

  // No file was uploaded and no initial data
  strictEqual(f._hasChanged("", null), false)

  // A file was uploaded and no initial data
  strictEqual(f._hasChanged("", {filename: "resume.txt", content: "My resume"}), true)

  // A file was not uploaded, but there is initial data
  strictEqual(f._hasChanged("resume.txt", null), false)

  // A file was uploaded and there is initial data (file identity is not dealt
  // with here).
  strictEqual(f._hasChanged("resume.txt", {filename: "resume.txt", content: "My resume"}), true)
})

QUnit.test("URLField", 65, function() {
  var invalidURLs =
      ["foo", "http://", "http://example", "http://example.", "com.", ".",
       "http://.com", "http://invalid-.com", "http://-invalid.com",
       "http://inv-.alid-.com", "http://inv-.-alid.com"]

  var f = forms.URLField()
  widgetRendersTo(f, "<input type=\"url\" name=\"f\" id=\"id_f\">")
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", null)
  equal(f.clean("http://localhost"), "http://localhost/")
  equal(f.clean("http://example.com"), "http://example.com/")
  equal(f.clean("http://example.com."), "http://example.com./")
  equal(f.clean("http://www.example.com"), "http://www.example.com/")
  equal(f.clean("http://www.example.com:8000/test"), "http://www.example.com:8000/test")
  equal(f.clean("valid-with-hyphens.com"), "http://valid-with-hyphens.com/")
  equal(f.clean("subdomain.domain.com"), "http://subdomain.domain.com/")
  equal(f.clean("http://200.8.9.10"), "http://200.8.9.10/")
  equal(f.clean("http://200.8.9.10:8000/test"), "http://200.8.9.10:8000/test")
  for (var i = 0, url; url = invalidURLs[i]; i++) {
    cleanErrorEqual(f, "Enter a valid URL.", url)
  }
  equal(f.clean("http://valid-----hyphens.com"), "http://valid-----hyphens.com/")
  equal(f.clean('http://some.idn.xyzäöüßabc.domain.com:123/blah'),
        'http://some.idn.xyz\xE4\xF6\xFC\xDFabc.domain.com:123/blah')
  equal(f.clean("www.example.com/s/http://code.djangoproject.com/ticket/13804"),
        "http://www.example.com/s/http://code.djangoproject.com/ticket/13804")

  f = forms.URLField({required: false})
  strictEqual(f.clean(""), "")
  strictEqual(f.clean(null), "")
  equal(f.clean("http://localhost"), "http://localhost/")
  equal(f.clean("http://example.com"), "http://example.com/")
  equal(f.clean("http://www.example.com:8000/test"), "http://www.example.com:8000/test")
  equal(f.clean("http://200.8.9.10"), "http://200.8.9.10/")
  equal(f.clean("http://200.8.9.10:8000/test"), "http://200.8.9.10:8000/test")
  for (var i = 0, url; url = invalidURLs[i]; i++) {
    cleanErrorEqual(f, "Enter a valid URL.", url)
  }

  function createCatastrophicTestUrl(length) {
    var xs = []
    for (var i = 0; i < length; i++) {
      xs[i] = "X"
    }
    return "http://" + xs.join("")
  }

  // Hangs "forever" if catastrophic backtracking not fixed.
  cleanErrorEqual(f, "Enter a valid URL.", createCatastrophicTestUrl(200))

  // A second test, to make sure the problem is really addressed, even on
  // domains that don't fail the domain label length check in the regex.
  cleanErrorEqual(f, "Enter a valid URL.", createCatastrophicTestUrl(60))

  // URLField also has minLength and maxLength parameters, for convenience
  f = forms.URLField({minLength: 15, maxLength: 20})
  widgetRendersTo(f, "<input maxlength=\"20\" type=\"url\" name=\"f\" id=\"id_f\">")
  cleanErrorEqual(f, "Ensure this value has at least 15 characters (it has 13).", "http://f.com")
  equal(f.clean("http://example.com"), "http://example.com/")
  cleanErrorEqual(f, "Ensure this value has at most 20 characters (it has 38).", "http://abcdefghijklmnopqrstuvwxyz.com")

  // URLField should prepend "http://" if no scheme was given
  f = forms.URLField({required: false})
  equal(f.clean("example.com"), "http://example.com/")
  equal(f.clean(""), "")
  equal(f.clean("https://example.com"), "https://example.com/")

  // Django #11826
  equal(f.clean("http://example.com?some_param=some_value"), "http://example.com/?some_param=some_value")

  // Valid IDN
  var urls = [
    'http://עברית.idn.icann.org/'
  , 'http://sãopaulo.com/'
  , 'http://sãopaulo.com.br/'
  , 'http://пример.испытание/'
  , 'http://مثال.إختبار/'
  , 'http://例子.测试/'
  , 'http://例子.測試/'
  , 'http://例え.テスト/'
  , 'http://مثال.آزمایشی/'
  , 'http://실례.테스트/'
  , 'http://العربية.idn.icann.org/'
  ]
  for (var i = 0, l = urls.length; i < l; i++) {
    equal(f.clean(urls[i]), urls[i], 'Valid IDN URL')
  }

  // TODO Test URLField correctly validates IPv6
})

QUnit.test("BooleanField", 28, function() {
  var f = forms.BooleanField()
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", null)
  strictEqual(f.clean(true), true)
  cleanErrorEqual(f, "This field is required.", false)
  strictEqual(f.clean(1), true)
  cleanErrorEqual(f, "This field is required.", 0)
  strictEqual(f.clean("Django rocks"), true)
  strictEqual(f.clean("True"), true)
  // A form's BooleanField with a hidden widget will output the string
  // "false", so that should clean to the boolean value false.
  cleanErrorEqual(f, "This field is required.", "false")

  f = forms.BooleanField({required: false})
  strictEqual(f.clean(""), false)
  strictEqual(f.clean(null), false)
  strictEqual(f.clean(true), true)
  strictEqual(f.clean(false), false)
  strictEqual(f.clean(1), true)
  strictEqual(f.clean(0), false)
  strictEqual(f.clean("1"), true)
  strictEqual(f.clean("0"), false)
  strictEqual(f.clean("Django rocks"), true)

  // A form's BooleanField with a hidden widget will output the string
  // 'false', so that should clean to the boolean value false
  strictEqual(f.clean("false"), false)
  strictEqual(f.clean("False"), false)
  strictEqual(f.clean("FaLsE"), false)

  f = forms.BooleanField()
  strictEqual(f._hasChanged(null, null), false)
  strictEqual(f._hasChanged(null, ""), false)
  strictEqual(f._hasChanged("", ""), false)
  strictEqual(f._hasChanged(false, "on"), true)
  strictEqual(f._hasChanged(true, "on"), false)
  strictEqual(f._hasChanged(true, ""), true)
  // Initial value may have mutated to a string due to showhiddenInitial
  strictEqual(f._hasChanged("false", "on"), true)
})

QUnit.test("ChoiceField", 19, function() {
  var f = forms.ChoiceField({choices: [["1", "One"], ["2", "Two"]]})
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", null)
  strictEqual(f.clean(1), "1")
  strictEqual(f.clean("1"), "1")
  cleanErrorEqual(f, "Select a valid choice. 3 is not one of the available choices.", "3")

  var f = forms.ChoiceField({choices: [["1", "One"], ["2", "One"]], required: false})
  strictEqual(f.clean(""), "")
  strictEqual(f.clean(null), "")
  strictEqual(f.clean(1), "1")
  strictEqual(f.clean("1"), "1")
  cleanErrorEqual(f, "Select a valid choice. 3 is not one of the available choices.", "3")

  f = forms.ChoiceField({choices: [["J", "John"], ["P", "Paul"]]})
  equal(f.clean("J"), "J")
  cleanErrorEqual(f, "Select a valid choice. John is not one of the available choices.", "John")

  f = forms.ChoiceField({choices: [["Numbers", [["1", "One"], ["2", "Two"]]], ["Letters", [["3", "A"],["4", "B"]]], ["5", "Other"]]})
  strictEqual(f.clean(1), "1")
  strictEqual(f.clean("1"), "1")
  strictEqual(f.clean(3), "3")
  strictEqual(f.clean("3"), "3")
  strictEqual(f.clean(5), "5")
  strictEqual(f.clean("5"), "5")
  cleanErrorEqual(f, "Select a valid choice. 6 is not one of the available choices.", "6")
})

QUnit.test("TypedChoiceField", 9, function() {
  // TypedChoiceField is just like ChoiceField, except that coerced types wil
  // be returned.
  var f = forms.TypedChoiceField({
      choices: [[1, "+1"], [-1, "-1"]],
      coerce: function(val) { return parseInt(val, 10); }
  })
  strictEqual(f.clean("1"), 1)
  strictEqual(f.clean("-1"), -1)
  cleanErrorEqual(f, "Select a valid choice. 2 is not one of the available choices.", "2")

  // Different coercion, same validation
  f.coerce = parseFloat
  strictEqual(f.clean("1"), 1.0)

  // This can also cause weirdness: be careful (Booleanl(-1) == true, remember)
  f.coerce = Boolean
  strictEqual(f.clean("-1"), true)

  // Even more weirdness: if you have a valid choice but your coercion
  // function can't coerce, you'll still get a validation error. Don't do this!
  f.coerce = function(val) { return val.toFixed(2); }
  cleanErrorEqual(f, "Select a valid choice. 1 is not one of the available choices.", "1")

  // Required fields require values
  cleanErrorEqual(f, "This field is required.", "")

  // Non-required fields aren't required
  f = forms.TypedChoiceField({
      choices: [[1, "+1"], [-1, "-1"]],
      coerce: function(val) { return parseInt(val, 10); },
      required: false
  })
  strictEqual(f.clean(""), "")

  // If you want cleaning an empty value to return a different type, tell the
  // field.
  f = forms.TypedChoiceField({
      choices: [[1, "+1"], [-1, "-1"]],
      coerce: function(val) { return parseInt(val, 10); },
      required: false,
      emptyValue: null
  })
  strictEqual(f.clean(""), null)

  // TODO test_typedchoicefield_has_changed

  // TODO test_typedchoicefield_special_coerce
})

QUnit.test("NullBooleanField", 21, function() {
  var f = forms.NullBooleanField()
  strictEqual(f.clean(""), null)
  strictEqual(f.clean(true), true)
  strictEqual(f.clean(false), false)
  strictEqual(f.clean(null), null)
  strictEqual(f.clean("0"), false)
  strictEqual(f.clean("1"), true)
  strictEqual(f.clean("2"), null)
  strictEqual(f.clean("3"), null)
  strictEqual(f.clean("hello"), null)

  // Make sure that the internal value is preserved if using HiddenInput (Django #7753)
  var HiddenNullBooleanForm = forms.Form.extend({
    hidden_nullbool1: forms.NullBooleanField({widget: forms.HiddenInput, initial: true}),
    hidden_nullbool2: forms.NullBooleanField({widget: forms.HiddenInput, initial: false})
  })
  f = new HiddenNullBooleanForm({data: {hidden_nullbool1: "true", hidden_nullbool2: "false"}})
  f.fullClean()
  strictEqual(f.cleanedData.hidden_nullbool1, true)
  strictEqual(f.cleanedData.hidden_nullbool2, false)

  // Make sure we're compatible with MySQL, which uses 0 and 1 for its boolean
  // values. (Django #9609)
  var NULLBOOL_CHOICES = [["1", "Yes"], ["0", "No"], ["", "Unknown"]]
  var MySQLNullBooleanForm = forms.Form.extend({
    nullbool0: forms.NullBooleanField({widget: forms.RadioSelect({choices: NULLBOOL_CHOICES})}),
    nullbool1: forms.NullBooleanField({widget: forms.RadioSelect({choices: NULLBOOL_CHOICES})}),
    nullbool2: forms.NullBooleanField({widget: forms.RadioSelect({choices: NULLBOOL_CHOICES})})
  })
  f = new MySQLNullBooleanForm({data: {nullbool0: "1", nullbool1: "0", nullbool2: ""}})
  f.fullClean()
  strictEqual(f.cleanedData.nullbool0, true)
  strictEqual(f.cleanedData.nullbool1, false)
  strictEqual(f.cleanedData.nullbool2, null)

  f = forms.NullBooleanField()
  strictEqual(f._hasChanged(false, null), true)
  strictEqual(f._hasChanged(null, false), true)
  strictEqual(f._hasChanged(null, null), false)
  strictEqual(f._hasChanged(false, false), false)
  strictEqual(f._hasChanged(true, false), true)
  strictEqual(f._hasChanged(true, null), true)
  strictEqual(f._hasChanged(true, false), true)
})

QUnit.test("MultipleChoiceField", 32, function() {
  var f = forms.MultipleChoiceField({choices: [["1", "1"], ["2", "2"]]})
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", null)
  deepEqual(f.clean([1]), ["1"])
  deepEqual(f.clean(["1"]), ["1"])
  deepEqual(f.clean(["1", "2"]), ["1", "2"])
  deepEqual(f.clean([1, "2"]), ["1", "2"])
  cleanErrorEqual(f, "Enter a list of values.", "hello")
  cleanErrorEqual(f, "This field is required.", [])
  cleanErrorEqual(f, "Select a valid choice. 3 is not one of the available choices.", ["3"])

  f = forms.MultipleChoiceField({choices: [["1", "1"], ["2", "2"]], required: false})
  deepEqual(f.clean(""), [])
  deepEqual(f.clean(null), [])
  deepEqual(f.clean([1]), ["1"])
  deepEqual(f.clean(["1"]), ["1"])
  deepEqual(f.clean(["1", "2"]), ["1", "2"])
  deepEqual(f.clean([1, "2"]), ["1", "2"])
  cleanErrorEqual(f, "Enter a list of values.", "hello")
  deepEqual(f.clean([]), [])
  cleanErrorEqual(f, "Select a valid choice. 3 is not one of the available choices.", ["3"])

  f = forms.MultipleChoiceField({choices: [["Numbers", [["1", "One"], ["2", "Two"]]], ["Letters", [["3", "A"],["4", "B"]]], ["5", "Other"]]})
  deepEqual(f.clean([1]), ["1"])
  deepEqual(f.clean([1, 5]), ["1", "5"])
  deepEqual(f.clean([1, "5"]), ["1", "5"])
  deepEqual(f.clean(["1", 5]), ["1", "5"])
  deepEqual(f.clean(["1", "5"]), ["1", "5"])
  cleanErrorEqual(f, "Select a valid choice. 6 is not one of the available choices.", ["6"])
  cleanErrorEqual(f, "Select a valid choice. 6 is not one of the available choices.", ["1", "6"])

   // Test the usage of _hasChanged
  f = forms.MultipleChoiceField({choices: [[1, 1], [2, 2], [3, 3]]})
  strictEqual(f._hasChanged(null, null), false)
  strictEqual(f._hasChanged([], null), false)
  strictEqual(f._hasChanged(null, [""]), true)
  strictEqual(f._hasChanged([1, 2], ["1", "2"]), false)
  strictEqual(f._hasChanged([1, 2], ["1"]), true)
  strictEqual(f._hasChanged([1, 2], ["1", "3"]), true)
  strictEqual(f._hasChanged([2, 1], ["1", "2"]), false)
})

QUnit.test("TypedMultipleChoiceField", function() {
  var f = forms.TypedMultipleChoiceField({
    choices: [[1, "+1"], [-1, "-1"]]
  , coerce: function(val) { return parseInt(val, 10); }
  })
  deepEqual(f.clean(["1"]), [1])
  deepEqual(f.clean(["1", "-1"]), [1, -1])
  cleanErrorEqual(f, "Select a valid choice. 2 is not one of the available choices.", ["2"])
  cleanErrorEqual(f, "Select a valid choice. 2 is not one of the available choices.", ["1", "2"])

  // Different coercion, same validation
  f.coerce = parseFloat
  deepEqual(f.clean(["1"]), [1.0])

  // This can also cause weirdness: be careful (Booleanl(-1) == true, remember)
  f.coerce = Boolean
  deepEqual(f.clean(["-1"]), [true])

  // Even more weirdness: if you have a valid choice but your coercion
  // function can't coerce, you'll still get a validation error. Don't do this!
  f.coerce = function(val) { return val.toFixed(2); }
  cleanErrorEqual(f, "Select a valid choice. 1 is not one of the available choices.", ["1"])

  // Required fields require values
  cleanErrorEqual(f, "This field is required.", [])

  // Non-required fields aren't required
  f = forms.TypedMultipleChoiceField({
    choices: [[1, "+1"], [-1, "-1"]]
  , coerce: function(val) { return parseInt(val, 10); }
  , required: false
  })
  deepEqual(f.clean([]), [])

  // If you want cleaning an empty value to return a different type, tell the
  // field.
  f = forms.TypedMultipleChoiceField({
    choices: [[1, "+1"], [-1, "-1"]]
  , coerce: function(val) { return parseInt(val, 10); }
  , required: false
  , emptyValue: null
  })
  strictEqual(f.clean([]), null)

  // TODO test_typedmultiplechoicefield_has_changed

  // TODO test_typedmultiplechoicefield_special_coerce
})

QUnit.test("ComboField", 10, function() {
  // ComboField takes a list of fields that should be used to validate a
  // value, in that order.
  var f = forms.ComboField({fields: [forms.CharField({maxLength: 20}), forms.EmailField()]})
  equal(f.clean("test@example.com"), "test@example.com")
  cleanErrorEqual(f, "Ensure this value has at most 20 characters (it has 28).", "longemailaddress@example.com")
  cleanErrorEqual(f, "Enter a valid email address.", "not an email")
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", null)

  var f = forms.ComboField({fields: [forms.CharField({maxLength: 20}), forms.EmailField()], required: false})
  equal(f.clean("test@example.com"), "test@example.com")
  cleanErrorEqual(f, "Ensure this value has at most 20 characters (it has 28).", "longemailaddress@example.com")
  cleanErrorEqual(f, "Enter a valid email address.", "not an email")
  strictEqual(f.clean(""), "")
  strictEqual(f.clean(null), "")
})

// TODO Test FilePathField when newforms can be run on the backend

QUnit.test("SplitDateTimeField", 24, function() {
  var f = forms.SplitDateTimeField()
  strictEqual(f.clean([new Date(2006, 0, 10), new Date(1900, 0, 1, 7, 30)]).valueOf(),
       new Date(2006, 0, 10, 7, 30).valueOf())
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", null)
  cleanErrorEqual(f, "Enter a list of values.", "hello")
  cleanErrorEqual(f, ["Enter a valid date.", "Enter a valid time."], ["hello", "there"])
  cleanErrorEqual(f, ["Enter a valid time."], ["2006-01-10", "there"])
  cleanErrorEqual(f, ["Enter a valid date."], ["hello", "07:30"])

  f = forms.SplitDateTimeField({required: false})
  strictEqual(f.clean([new Date(2006, 0, 10), new Date(1900, 0, 1, 7, 30)]).valueOf(),
       new Date(2006, 0, 10, 7, 30).valueOf())
  strictEqual(f.clean(["2006-01-10", "07:30"]).valueOf(),
       new Date(2006, 0, 10, 7, 30).valueOf())
  strictEqual(f.clean(null), null)
  strictEqual(f.clean(""), null)
  strictEqual(f.clean([""]), null)
  strictEqual(f.clean(["", ""]), null)
  cleanErrorEqual(f, "Enter a list of values.", "hello")
  cleanErrorEqual(f, ["Enter a valid date.", "Enter a valid time."], ["hello", "there"])
  cleanErrorEqual(f, ["Enter a valid time."], ["2006-01-10", "there"])
  cleanErrorEqual(f, ["Enter a valid date."], ["hello", "07:30"])
  cleanErrorEqual(f, ["Enter a valid time."], ["2006-01-10", ""])
  cleanErrorEqual(f, ["Enter a valid time."], ["2006-01-10"])
  cleanErrorEqual(f, ["Enter a valid date."], ["", "07:30"])

  f = forms.SplitDateTimeField({inputDateFormats: ["%d/%m/%Y"]})
  strictEqual(f._hasChanged(['11/01/2012', '09:18:15'], ['11/01/2012', '09:18:15']), false)
  strictEqual(f._hasChanged(new Date(2008, 4, 6, 12, 40, 0), ["2008-05-05", "12:40:00"]), true)
  strictEqual(f._hasChanged(new Date(2008, 4, 6, 12, 40, 0), ["06/05/2008", "12:40"]), false)
  strictEqual(f._hasChanged(new Date(2008, 4, 6, 12, 40, 0), ["06/05/2008", "12:41"]), true)
})

QUnit.test("IPAddressField", 14, function() {
  var f = forms.IPAddressField()
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", null)
  equal(f.clean("127.0.0.1"), "127.0.0.1")
  cleanErrorEqual(f, "Enter a valid IPv4 address.", "foo")
  cleanErrorEqual(f, "Enter a valid IPv4 address.", "127.0.0.")
  cleanErrorEqual(f, "Enter a valid IPv4 address.", "1.2.3.4.5")
  cleanErrorEqual(f, "Enter a valid IPv4 address.", "256.125.1.5")

  f = forms.IPAddressField({required: false})
  strictEqual(f.clean(""), "")
  strictEqual(f.clean(null), "")
  equal(f.clean("127.0.0.1"), "127.0.0.1")
  cleanErrorEqual(f, "Enter a valid IPv4 address.", "foo")
  cleanErrorEqual(f, "Enter a valid IPv4 address.", "127.0.0.")
  cleanErrorEqual(f, "Enter a valid IPv4 address.", "1.2.3.4.5")
  cleanErrorEqual(f, "Enter a valid IPv4 address.", "256.125.1.5")
})

QUnit.test('GenericIPAddressField', 58, function() {
  // Invalid arguments
  throws(function() { forms.GenericIPAddressField({protocol: 'hamster'}) })
  throws(function() { forms.GenericIPAddressField({protocol: 'ipv4', unpackIPv4: true}) })

  // The edge cases of the IPv6 validation code are not deeply tested  here,
  // they are covered in the tests for ipv6.js
  var f = forms.GenericIPAddressField()
  cleanErrorEqual(f, 'This field is required.', '')
  cleanErrorEqual(f, 'This field is required.', null)
  equal(f.clean('127.0.0.1'), '127.0.0.1')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', 'foo')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '127.0.0.')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '1.2.3.4.5')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '256.125.1.5')
  equal(f.clean('fe80::223:6cff:fe8a:2e8a'), 'fe80::223:6cff:fe8a:2e8a')
  equal(f.clean('2a02::223:6cff:fe8a:2e8a'), '2a02::223:6cff:fe8a:2e8a')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '12345:2:3:4')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '1::2:3::4')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', 'foo::223:6cff:fe8a:2e8a')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '1::2:3:4:5:6:7:8')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '1:2')

  // As IPv4 only
  f = forms.GenericIPAddressField({protocol: 'IPv4'})
  cleanErrorEqual(f, 'This field is required.', '')
  cleanErrorEqual(f, 'This field is required.', null)
  equal(f.clean('127.0.0.1'), '127.0.0.1')
  cleanErrorEqual(f, 'Enter a valid IPv4 address.', 'foo')
  cleanErrorEqual(f, 'Enter a valid IPv4 address.', '127.0.0.')
  cleanErrorEqual(f, 'Enter a valid IPv4 address.', '1.2.3.4.5')
  cleanErrorEqual(f, 'Enter a valid IPv4 address.', '256.125.1.5')
  cleanErrorEqual(f, 'Enter a valid IPv4 address.', 'fe80::223:6cff:fe8a:2e8a')
  cleanErrorEqual(f, 'Enter a valid IPv4 address.', '2a02::223:6cff:fe8a:2e8a')

  // As IPv6 only
  f = forms.GenericIPAddressField({protocol: 'IPv6'})
  cleanErrorEqual(f, 'This field is required.', '')
  cleanErrorEqual(f, 'This field is required.', null)
  cleanErrorEqual(f, 'Enter a valid IPv6 address.', '127.0.0.1')
  cleanErrorEqual(f, 'Enter a valid IPv6 address.', 'foo')
  cleanErrorEqual(f, 'Enter a valid IPv6 address.', '127.0.0.')
  cleanErrorEqual(f, 'Enter a valid IPv6 address.', '1.2.3.4.5')
  cleanErrorEqual(f, 'Enter a valid IPv6 address.', '256.125.1.5')
  equal(f.clean('fe80::223:6cff:fe8a:2e8a'), 'fe80::223:6cff:fe8a:2e8a')
  equal(f.clean('2a02::223:6cff:fe8a:2e8a'), '2a02::223:6cff:fe8a:2e8a')
  cleanErrorEqual(f, 'Enter a valid IPv6 address.', '12345:2:3:4')
  cleanErrorEqual(f, 'Enter a valid IPv6 address.', '1::2:3::4')
  cleanErrorEqual(f, 'Enter a valid IPv6 address.', 'foo::223:6cff:fe8a:2e8a')
  cleanErrorEqual(f, 'Enter a valid IPv6 address.', '1::2:3:4:5:6:7:8')
  cleanErrorEqual(f, 'Enter a valid IPv6 address.', '1:2')

  // As generic, not required
  f = forms.GenericIPAddressField({required: false})
  equal(f.clean(''), '')
  equal(f.clean(null), '')
  equal(f.clean('127.0.0.1'), '127.0.0.1')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', 'foo')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '127.0.0.')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '1.2.3.4.5')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '256.125.1.5')
  equal(f.clean('fe80::223:6cff:fe8a:2e8a'), 'fe80::223:6cff:fe8a:2e8a')
  equal(f.clean('2a02::223:6cff:fe8a:2e8a'), '2a02::223:6cff:fe8a:2e8a')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '12345:2:3:4')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '1::2:3::4')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', 'foo::223:6cff:fe8a:2e8a')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '1::2:3:4:5:6:7:8')
  cleanErrorEqual(f, 'Enter a valid IPv4 or IPv6 address.', '1:2')

  // Test the normalising code
  f = forms.GenericIPAddressField()
  equal(f.clean('::ffff:0a0a:0a0a'), '::ffff:10.10.10.10')
  equal(f.clean('::ffff:10.10.10.10'), '::ffff:10.10.10.10')
  equal(f.clean('2001:000:a:0000:0:fe:fe:beef'), '2001:0:a::fe:fe:beef')
  equal(f.clean('2001::a:0000:0:fe:fe:beef'), '2001:0:a::fe:fe:beef')

  // IPv4 unpacking
  f = forms.GenericIPAddressField({unpackIPv4: true})
  equal(f.clean('::ffff:0a0a:0a0a'), '10.10.10.10')
})

})()
