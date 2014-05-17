QUnit.module("formats")

QUnit.test('getFormat', function() {
  var getFormat = forms.formats.getFormat
  deepEqual(getFormat('TIME_INPUT_FORMATS'), ['%H:%M:%S', '%H:%M'], 'Default TIME_INPUT_FORMATS fall back to ISO formats')
})
