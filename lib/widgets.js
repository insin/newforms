var Concur = require('Concur')
  , DOMBuilder = require('DOMBuilder')
  , is = require('isomorph/is')
  , format = require('isomorph/format').formatObj
  , object = require('isomorph/object')
  , time = require('isomorph/time')

var util = require('./util')

/**
 * Some widgets are made of multiple HTML elements -- namely, RadioSelect.
 * This represents the "inner" HTML element of a widget.
 */
var SubWidget = Concur.extend({
  constructor: function(parentWidget, name, value, kwargs) {
    if (!(this instanceof SubWidget)) {
      return new SubWidget(parentWidget, name, value, kwargs)
    }
    this.parentWidget = parentWidget
    this.name = name
    this.value = value
    kwargs = object.extend({attrs: null, choices: []}, kwargs)
    this.attrs = kwargs.attrs
    this.choices = kwargs.choices
  }
})

SubWidget.prototype.toString = function() {
  return ''+this.render()
}

SubWidget.prototype.render = function() {
  var kwargs = {attrs: this.attrs}
  if (this.choices.length) {
    kwargs.choices = this.choices
  }
  return this.parentWidget.render(this.name, this.value, kwargs)
}

/**
 * An HTML form widget.
 * @constructor
 * @param {Object=} kwargs
 */
var Widget = Concur.extend({
  constructor: function(kwargs) {
    kwargs = object.extend({attrs: null}, kwargs)
    this.attrs = object.extend({}, kwargs.attrs)
  }
  /** Determines whether this corresponds to an <input type="hidden">. */
, isHidden: false
  /** Determines whether this widget needs a multipart-encoded form. */
, needsMultipartForm: false
, isRequired: false
})

/**
 * Yields all "subwidgets" of this widget. Used only by RadioSelect to
 * allow access to individual <input type="radio"> buttons.
 *
 * Arguments are the same as for render().
 */
Widget.prototype.subWidgets = function(name, value, kwargs) {
  return [SubWidget(this, name, value, kwargs)]
}

/**
 * Returns this Widget rendered as HTML.
 *
 * The 'value' given is not guaranteed to be valid input, so subclass
 * implementations should program defensively.
 */
Widget.prototype.render = function(name, value, kwargs) {
  throw new Error('Constructors extending must implement a render() method.')
}

/**
 * Helper function for building an attribute dictionary.
 */
Widget.prototype.buildAttrs = function(extraAttrs, kwargs) {
  var attrs = object.extend({}, this.attrs, kwargs, extraAttrs)
  return attrs
}

/**
 * Retrieves a value for this widget from the given data.
 *
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {String} name the field name to be used to retrieve data.
 *
 * @return a value for this widget, or <code>null</code> if no value was
 *         provided.
 */
Widget.prototype.valueFromData = function(data, files, name) {
  return object.get(data, name, null)
}

/**
 * Determines if data has changed from initial.
 */
Widget.prototype._hasChanged = function(initial, data) {
  // For purposes of seeing whether something has changed, null is the same
  // as an empty string, if the data or inital value we get is null, replace
  // it with ''.
  var dataValue = (data === null ? '' : data)
  var initialValue = (initial === null ? '' : initial)
  return (''+initialValue != ''+dataValue)
}

/**
 * Determines the HTML <code>id</code> attribute of this Widget for use by a
 * <code>&lt;label&gt;</code>, given the id of the field.
 *
 * This hook is necessary because some widgets have multiple HTML elements and,
 * thus, multiple ids. In that case, this method should return an ID value that
 * corresponds to the first id in the widget's tags.
 *
 * @param {String} id a field id.
 *
 * @return the id which should be used by a <code>&lt;label&gt;</code> for this
 *         Widget.
 */
Widget.prototype.idForLabel = function(id) {
  return id
}

/**
 * An HTML <input> widget.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var Input = Widget.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new Input(kwargs)
    Widget.call(this, kwargs)
  }
  /** The type attribute of this input. */
, inputType: null
})

Input.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  if (value === null) {
    value = ''
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: this.inputType,
                                                  name: name})
  if (value !== '') {
    // Only add the value attribute if value is non-empty
    finalAttrs.value = value
  }
  return DOMBuilder.createElement('input', finalAttrs)
}

/**
 * An HTML <input type="text"> widget.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var TextInput = Input.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new TextInput(kwargs)
    Input.call(this, kwargs)
  }
, inputType: 'text'
})

/**
 * An HTML <input type="password"> widget.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var PasswordInput = Input.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new PasswordInput(kwargs)
    kwargs = object.extend({renderValue: false}, kwargs)
    Input.call(this, kwargs)
    this.renderValue = kwargs.renderValue
  }
, inputType: 'password'
})

PasswordInput.prototype.render = function(name, value, kwargs) {
  if (!this.renderValue) {
    value = ''
  }
  return Input.prototype.render.call(this, name, value, kwargs)
}

/**
 * An HTML <input type="hidden"> widget.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var HiddenInput = Input.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new HiddenInput(kwargs)
    Input.call(this, kwargs)
  }
, inputType: 'hidden'
, isHidden: true
})

/**
 * A widget that handles <input type="hidden"> for fields that have a list of
 * values.
 * @constructor
 * @extends {HiddenInput}
 * @param {Object=} kwargs
 */
var MultipleHiddenInput = HiddenInput.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new MultipleHiddenInput(kwargs)
    HiddenInput.call(this, kwargs)
  }
})

MultipleHiddenInput.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  if (value === null) {
    value = []
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: this.inputType,
                                                  name: name})
    , id = object.get(finalAttrs, 'id', null)
    , inputs = []
  for (var i = 0, l = value.length; i < l; i++) {
    var inputAttrs = object.extend({}, finalAttrs, {value: value[i]})
    if (id) {
      // An ID attribute was given. Add a numeric index as a suffix
      // so that the inputs don't all have the same ID attribute.
      inputAttrs.id = format('{id}_{i}', {id: id, i: i})
    }
    inputs.push(DOMBuilder.createElement('input', inputAttrs))
  }
  return DOMBuilder.fragment(inputs)
}

MultipleHiddenInput.prototype.valueFromData = function(data, files, name) {
  if (typeof data[name] != 'undefined') {
    return [].concat(data[name])
  }
  return null
}

/**
 * An HTML <input type="file"> widget.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var FileInput = Input.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new FileInput(kwargs)
    Input.call(this, kwargs)
  }
, inputType: 'file'
, needsMultipartForm: true
})

FileInput.prototype.render = function(name, value, kwargs) {
  return Input.prototype.render.call(this, name, null, kwargs)
}

/**
 * File widgets take data from <code>files</code>, not <code>data</code>.
 */
FileInput.prototype.valueFromData = function(data, files, name) {
  return object.get(files, name, null)
}

FileInput.prototype._hasChanged = function(initial, data) {
  if (data === null) {
    return false
  }
  return true
}

var FILE_INPUT_CONTRADICTION = {}

/**
 * @constructor
 * @extends {FileInput}
 * @param {Object=} kwargs
 */
var ClearableFileInput = FileInput.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new ClearableFileInput(kwargs)
    FileInput.call(this, kwargs)
  }
, initialText: 'Currently'
, inputText: 'Change'
, clearCheckboxLabel: 'Clear'
})

/**
 * Given the name of the file input, return the name of the clear checkbox
 * input.
 */
ClearableFileInput.prototype.clearCheckboxName = function(name) {
  return name + '-clear'
}

/**
 * Given the name of the clear checkbox input, return the HTML id for it.
 */
ClearableFileInput.prototype.clearCheckboxId = function(name) {
  return name + '_id'
}

ClearableFileInput.prototype.render = function(name, value, kwargs) {
  var input = FileInput.prototype.render.call(this, name, value, kwargs)
  if (value && typeof value.url != 'undefined') {
    var contents = [
      this.initialText, ': '
    , DOMBuilder.createElement('a', {href: value.url}, [''+value]), ' '
    ]
    if (!this.isRequired) {
      var clearCheckboxName = this.clearCheckboxName(name)
      var clearCheckboxId = this.clearCheckboxId(clearCheckboxName)
      contents = contents.concat([
        CheckboxInput().render(
            clearCheckboxName, false, {attrs: {'id': clearCheckboxId}})
      , ' '
      , DOMBuilder.createElement('label', {'for': clearCheckboxId},
                                 [this.clearCheckboxLabel])
      ])
    }
    contents = contents.concat([
      DOMBuilder.createElement('br')
    , this.inputText, ': '
    , input
    ])
    return DOMBuilder.fragment(contents)
  }
  else {
      return input
  }
}

ClearableFileInput.prototype.valueFromData = function(data, files, name) {
  var upload = FileInput.prototype.valueFromData(data, files, name)
  if (!this.isRequired &&
      CheckboxInput().valueFromData(data, files,
                                    this.clearCheckboxName(name))) {
    if (upload) {
      // If the user contradicts themselves (uploads a new file AND
      // checks the "clear" checkbox), we return a unique marker
      // object that FileField will turn into a ValidationError.
      return FILE_INPUT_CONTRADICTION
    }
    // false signals to clear any existing value, as opposed to just null
    return false
  }
  return upload
}

/**
 * A <input type="text"> which, if given a Date object to display, formats it as
 * an appropriate date String.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var DateInput = Input.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new DateInput(kwargs)
    kwargs = object.extend({format: null}, kwargs)
    Input.call(this, kwargs)
    if (kwargs.format !== null) {
      this.format = kwargs.format
    }
    else {
      this.format = util.DEFAULT_DATE_INPUT_FORMATS[0]
    }
  }
, inputType: 'text'
})

DateInput.prototype._formatValue = function(value) {
  if (is.Date(value)) {
    return time.strftime(value, this.format)
  }
  return value
}

DateInput.prototype.render = function(name, value, kwargs) {
  value = this._formatValue(value)
  return Input.prototype.render.call(this, name, value, kwargs)
}

DateInput.prototype._hasChanged = function(initial, data) {
  return Input.prototype._hasChanged.call(this, this._formatValue(initial), data)
}

/**
 * A <input type="text"> which, if given a Date object to display, formats it as
 * an appropriate datetime String.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var DateTimeInput = Input.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new DateTimeInput(kwargs)
    kwargs = object.extend({format: null}, kwargs)
    Input.call(this, kwargs)
    if (kwargs.format !== null) {
      this.format = kwargs.format
    }
    else {
      this.format = util.DEFAULT_DATETIME_INPUT_FORMATS[0]
    }
  }
, inputType: 'text'
})

DateTimeInput.prototype._formatValue = function(value) {
  if (is.Date(value)) {
    return time.strftime(value, this.format)
  }
  return value
}

DateTimeInput.prototype.render = function(name, value, kwargs) {
  value = this._formatValue(value)
  return Input.prototype.render.call(this, name, value, kwargs)
}

DateTimeInput.prototype._hasChanged = function(initial, data) {
  return Input.prototype._hasChanged.call(this, this._formatValue(initial), data)
}

/**
 * A <input type="text"> which, if given a Date object to display, formats it as
 * an appropriate time String.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var TimeInput = Input.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new TimeInput(kwargs)
    kwargs = object.extend({format: null}, kwargs)
    Input.call(this, kwargs)
    if (kwargs.format !== null) {
      this.format = kwargs.format
    }
    else {
      this.format = util.DEFAULT_TIME_INPUT_FORMATS[0]
    }
  }
, inputType: 'text'
})

TimeInput.prototype._formatValue = function(value) {
  if (is.Date(value)) {
    return time.strftime(value, this.format)
  }
  return value
}

TimeInput.prototype.render = function(name, value, kwargs) {
  value = this._formatValue(value)
  return Input.prototype.render.call(this, name, value, kwargs)
}

TimeInput.prototype._hasChanged = function(initial, data) {
  return Input.prototype._hasChanged.call(this, this._formatValue(initial), data)
}

/**
 * An HTML <textarea> widget.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Widget}.
 * @config {Object} [attrs] HTML attributes for the rendered widget. Default
 *                          rows and cols attributes will be used if not
 *                          provided.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var Textarea = Widget.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new Textarea(kwargs)
    // Ensure we have something in attrs
    kwargs = object.extend({attrs: null}, kwargs)
    // Provide default 'cols' and 'rows' attributes
    kwargs.attrs = object.extend({rows: '10', cols: '40'}, kwargs.attrs)
    Widget.call(this, kwargs)
  }
})

Textarea.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  if (value === null) {
    value = ''
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name})
  return DOMBuilder.createElement('textarea', finalAttrs, [value])
}

var defaultCheckTest = function(value) {
  return (value !== false &&
          value !== null &&
          value !== '')
}

/**
 * An HTML <input type="checkbox"> widget.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var CheckboxInput = Widget.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new CheckboxInput(kwargs)
    kwargs = object.extend({checkTest: defaultCheckTest}, kwargs)
    Widget.call(this, kwargs)
    this.checkTest = kwargs.checkTest
  }
})

CheckboxInput.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  var checked
  try {
    checked = this.checkTest(value)
  }
  catch (e) {
    // Silently catch exceptions
    checked = false
  }

  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: 'checkbox',
                                                  name: name})
  if (value !== '' && value !== true && value !== false && value !== null &&
      value !== undefined) {
    // Only add the value attribute if value is non-empty
    finalAttrs.value = value
  }
  if (checked) {
    finalAttrs.checked = 'checked'
  }
  return DOMBuilder.createElement('input', finalAttrs)
}

CheckboxInput.prototype.valueFromData = function(data, files, name) {
  if (typeof data[name] == 'undefined') {
    //  A missing value means False because HTML form submission does not
    // send results for unselected checkboxes.
    return false
  }
  var value = data[name]
    , values = {'true': true, 'false': false}
  // Translate true and false strings to boolean values
  if (is.String(value)) {
    value = object.get(values, value.toLowerCase(), value)
  }
  return value
}

CheckboxInput.prototype._hasChanged = function(initial, data) {
  // Sometimes data or initial could be null or '' which should be the same
  // thing as false.
  return (Boolean(initial) != Boolean(data))
}

/**
 * An HTML <select> widget.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var Select = Widget.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new Select(kwargs)
    kwargs = object.extend({choices: []}, kwargs)
    Widget.call(this, kwargs)
    this.choices = kwargs.choices || []
  }
, allowMultipleSelected: false
})

/**
 * Renders the widget.
 *
 * @param {String} name the field name.
 * @param selectedValue the value of an option which should be marked as
 *                      selected, or <code>null</code> if no value is selected -
 *                      will be normalised to a <code>String</code> for
 *                      comparison with choice values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 * @param {Array} [choices] choices to be used when rendering the widget, in
 *                          addition to those already held by the widget itself.
 *
 * @return a <code>&lt;select&gt;</code> element.
 */
Select.prototype.render = function(name, selectedValue, kwargs) {
  kwargs = object.extend({attrs: null, choices: []}, kwargs)
  if (selectedValue === null) {
    selectedValue = ''
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name})
  var options = this.renderOptions(kwargs.choices, [selectedValue])
  options.push('\n')
  return DOMBuilder.createElement('select', finalAttrs, options)
}

Select.prototype.renderOptions = function(choices, selectedValues) {
  // Normalise to strings
  var selectedValuesLookup = {}
  // We don't duck type passing of a String, as index access to characters isn't
  // part of the spec.
  var selectedValueString = (is.String(selectedValues))
  for (var i = 0, l = selectedValues.length; i < l; i++) {
    selectedValuesLookup[''+(selectedValueString ?
                             selectedValues.charAt(i) :
                             selectedValues[i])] = true
  }

  var options = []
    , finalChoices = util.iterate(this.choices).concat(choices || [])
  for (var i = 0, l = finalChoices.length; i < l; i++) {
    if (is.Array(finalChoices[i][1])) {
      var optgroupOptions = []
        , optgroupChoices = finalChoices[i][1]
      for (var j = 0, k = optgroupChoices.length; j < k; j++) {
        optgroupOptions.push('\n')
        optgroupOptions.push(this.renderOption(selectedValuesLookup,
                                               optgroupChoices[j][0],
                                               optgroupChoices[j][1]))
      }
      options.push('\n')
      optgroupOptions.push('\n')
      options.push(DOMBuilder.createElement(
          'optgroup', {label: finalChoices[i][0]}, optgroupOptions))
    }
    else {
      options.push('\n')
      options.push(this.renderOption(selectedValuesLookup,
                                     finalChoices[i][0],
                                     finalChoices[i][1]))
    }
  }
  return options
}

Select.prototype.renderOption = function(selectedValuesLookup, optValue,
                                         optLabel) {
  optValue = ''+optValue
  var attrs = {value: optValue}
  if (typeof selectedValuesLookup[optValue] != 'undefined') {
    attrs['selected'] = 'selected'
    if (!this.allowMultipleSelected) {
      // Only allow for a single selection with this value
      delete selectedValuesLookup[optValue]
    }
  }
  return DOMBuilder.createElement('option', attrs, [optLabel])
}

/**
 * A <select> widget intended to be used with NullBooleanField.
 * @constructor
 * @extends {Select}
 * @param {Object=} kwargs
 */
var NullBooleanSelect = Select.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new NullBooleanSelect(kwargs)
    kwargs = kwargs || {}
    // Set or overrride choices
    kwargs.choices = [['1', 'Unknown'], ['2', 'Yes'], ['3', 'No']]
    Select.call(this, kwargs)
  }
})

NullBooleanSelect.prototype.render = function(name, value, kwargs) {
  if (value === true || value == '2') {
      value = '2'
  }
  else if (value === false || value == '3') {
      value = '3'
  }
  else {
      value = '1'
  }
  return Select.prototype.render.call(this, name, value, kwargs)
}

NullBooleanSelect.prototype.valueFromData = function(data, files, name) {
  var value = null
  if (typeof data[name] != 'undefined') {
    var dataValue = data[name]
    if (dataValue === true || dataValue == 'True' || dataValue == 'true' ||
        dataValue == '2') {
      value = true
    }
    else if (dataValue === false || dataValue == 'False' ||
             dataValue == 'false' || dataValue == '3') {
      value = false
    }
  }
  return value
}

NullBooleanSelect.prototype._hasChanged = function(initial, data) {
  // For a NullBooleanSelect, null (unknown) and false (No)
  //are not the same
  if (initial !== null) {
      initial = Boolean(initial)
  }
  if (data !== null) {
      data = Boolean(data)
  }
  return initial != data
}

/**
 * An HTML <select> widget which allows multiple selections.
 * @constructor
 * @extends {Select}
 * @param {Object=} kwargs
 */
var SelectMultiple = Select.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new SelectMultiple(kwargs)
    Select.call(this, kwargs)
  }
, allowMultipleSelected: true
})

/**
 * Renders the widget.
 *
 * @param {String} name the field name.
 * @param {Array} selectedValues the values of options which should be marked as
 *                               selected, or <code>null</code> if no values
 *                               are selected - these will be normalised to
 *                               <code>String</code>s for comparison with choice
 *                               values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 * @param {Array} [choices] choices to be used when rendering the widget, in
 *                          addition to those already held by the widget itself.
 *
 * @return a <code>&lt;select&gt;</code> element which allows multiple
 *         selections.
 */
SelectMultiple.prototype.render = function(name, selectedValues, kwargs) {
  kwargs = object.extend({attrs: null, choices: []}, kwargs)
  if (selectedValues === null) {
    selectedValues = []
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name,
                                                  multiple: 'multiple'})
    , options = this.renderOptions(kwargs.choices, selectedValues)
  options.push('\n')
  return DOMBuilder.createElement('select', finalAttrs, options)
}

/**
 * Retrieves values for this widget from the given data.
 *
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {String} name the field name to be used to retrieve data.
 *
 * @return {Array} values for this widget, or <code>null</code> if no values
 *                 were provided.
 */
SelectMultiple.prototype.valueFromData = function(data, files, name) {
  if (typeof data[name] != 'undefined') {
    return [].concat(data[name])
  }
  return null
}

SelectMultiple.prototype._hasChanged = function(initial, data) {
  if (initial === null) {
    initial = []
  }
  if (data === null) {
    data = []
  }
  if (initial.length != data.length) {
    return true
  }
  var dataLookup = object.lookup(data)
  for (var i = 0, l = initial.length; i < l; i++) {
    if (typeof dataLookup[''+initial[i]] == 'undefined') {
      return true
    }
  }
  return false
}

/**
 * An object used by RadioFieldRenderer that represents a single
 * <input type="radio">.
 * @constructor
 * @param {string} name
 * @param {string} value
 * @param {Object} attrs
 * @param {Array} choice
 * @param {number} index
 */
var RadioInput = SubWidget.extend({
  constructor: function(name, value, attrs, choice, index) {
    if (!(this instanceof RadioInput)) return new RadioInput(name, value, attrs, choice, index)
    this.name = name
    this.value = value
    this.attrs = attrs
    this.choiceValue = ''+choice[0]
    this.choiceLabel = choice[1]
    this.index = index
  }
})

RadioInput.prototype.toString = function() {
  return ''+this.render()
}

/**
 * Renders a <label> enclosing the radio widget and its label text.
 */
RadioInput.prototype.render = function(name, value, kwargs) {
  name = name || this.name
  value = value || this.value
  var attrs = object.extend({attrs: this.attrs}, kwargs).attrs
  var labelAttrs = {}
  if (typeof attrs.id != 'undefined') {
    labelAttrs['for'] = attrs.id + '_' + this.index
  }
  return DOMBuilder.createElement('label', labelAttrs,
                                  [this.tag(), ' ', this.choiceLabel])
}

RadioInput.prototype.isChecked = function() {
  return this.value === this.choiceValue
}

/**
 * Renders the <input type="radio"> portion of the widget.
 */
RadioInput.prototype.tag = function() {
  var finalAttrs = object.extend({}, this.attrs, {
    type: 'radio', name: this.name, value: this.choiceValue
  })
  if (typeof finalAttrs.id != 'undefined') {
    finalAttrs.id = finalAttrs.id + '_' + this.index
  }
  if (this.isChecked()) {
    finalAttrs.checked = 'checked'
  }
  return DOMBuilder.createElement('input', finalAttrs)
}

/**
 * An object used by {@link RadioSelect} to enable customisation of radio
 * widgets.
 * @constructor
 * @param {string} name
 * @param {string} value
 * @param {Object} attrs
 * @param {Array} choices
 */
var RadioFieldRenderer = Concur.extend({
  constructor: function(name, value, attrs, choices) {
    if (!(this instanceof RadioFieldRenderer)) return RadioFieldRenderer(name, value, attrs, choices)
    this.name = name
    this.value = value
    this.attrs = attrs
    this.choices = choices
  }
})

RadioFieldRenderer.prototype.__iter__ = function() {
  return this.radioInputs()
}

RadioFieldRenderer.prototype.radioInputs = function() {
  var inputs = []
  for (var i = 0, l = this.choices.length; i < l; i++) {
    inputs.push(RadioInput(this.name, this.value,
                           object.extend({}, this.attrs),
                           this.choices[i], i))
  }
  return inputs
}

RadioFieldRenderer.prototype.radioInput = function(i) {
  if (i >= this.choices.length) {
    throw new Error('Index out of bounds')
  }
  return RadioInput(this.name, this.value, object.extend({}, this.attrs),
                    this.choices[i], i)
}

/**
 * Outputs a &lt;ul&gt; for this set of radio fields.
 */
RadioFieldRenderer.prototype.render = function() {
  var inputs = this.radioInputs()
  var items = []
  for (var i = 0, l = inputs.length; i < l; i++) {
      items.push('\n')
      items.push(DOMBuilder.createElement('li', {}, [inputs[i].render()]))
  }
  items.push('\n')
  return DOMBuilder.createElement('ul', {}, items)
}

/**
 * Renders a single select as a list of <input type="radio"> elements.
 * @constructor
 * @extends {Select}
 * @param {Object=} kwargs
 */
var RadioSelect = Select.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new RadioSelect(kwargs)
    kwargs = object.extend({renderer: null}, kwargs)
    // Override the default renderer if we were passed one
    if (kwargs.renderer !== null) {
      this.renderer = kwargs.renderer
    }
    Select.call(this, kwargs)
  }
, renderer: RadioFieldRenderer
})

RadioSelect.prototype.subWidgets = function(name, value, kwargs) {
  return util.iterate(this.getRenderer(name, value, kwargs))
}

/**
 * @return an instance of the renderer to be used to render this widget.
 */
RadioSelect.prototype.getRenderer = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null, choices: []}, kwargs)
  value = (value === null ? '' : ''+value)
  var finalAttrs = this.buildAttrs(kwargs.attrs)
    , choices = util.iterate(this.choices).concat(kwargs.choices || [])
  return new this.renderer(name, value, finalAttrs, choices)
}

RadioSelect.prototype.render = function(name, value, kwargs) {
  return this.getRenderer(name, value, kwargs).render()
}

/**
 * RadioSelect is represented by multiple <input type="radio"> fields,
 * each of which has a distinct ID. The IDs are made distinct by a '_X'
 * suffix, where X is the zero-based index of the radio field. Thus, the
 * label for a RadioSelect should reference the first one ('_0').
 */
RadioSelect.prototype.idForLabel = function(id) {
  if (id) {
      id += '_0'
  }
  return id
}

/**
 * Multiple selections represented as a list of <input type="checkbox"> widgets.
 * @constructor
 * @extends {SelectMultiple}
 * @param {Object=} kwargs
 */
var CheckboxSelectMultiple = SelectMultiple.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new CheckboxSelectMultiple(kwargs)
    SelectMultiple.call(this, kwargs)
  }
})

CheckboxSelectMultiple.prototype.render = function(name, selectedValues, kwargs) {
  kwargs = object.extend({attrs: null, choices: []}, kwargs)
  if (selectedValues === null) {
    selectedValues = []
  }
  var hasId = (kwargs.attrs !== null && typeof kwargs.attrs.id != 'undefined')
    , finalAttrs = this.buildAttrs(kwargs.attrs)
    , selectedValuesLookup = object.lookup(selectedValues)
    , checkTest = function(value) {
        return (typeof selectedValuesLookup[''+value] != 'undefined')
      }
    , items = []
    , finalChoices = util.iterate(this.choices).concat(kwargs.choices)
  for (var i = 0, l = finalChoices.length; i < l; i++) {
    var optValue = '' + finalChoices[i][0]
      , optLabel = finalChoices[i][1]
      , checkboxAttrs = object.extend({}, finalAttrs)
      , labelAttrs = {}
    // If an ID attribute was given, add a numeric index as a suffix, so
    // that the checkboxes don't all have the same ID attribute.
    if (hasId) {
      object.extend(checkboxAttrs, {id: kwargs.attrs.id + '_' + i})
      labelAttrs['for'] = checkboxAttrs.id
    }

    var cb = CheckboxInput({attrs: checkboxAttrs, checkTest: checkTest})
    items.push('\n')
    items.push(
        DOMBuilder.createElement('li', {},
            [DOMBuilder.createElement('label', labelAttrs,
                                      [cb.render(name, optValue), ' ',
                                       optLabel])]))
  }
  items.push('\n')
  return DOMBuilder.createElement('ul', {}, items)
}

CheckboxSelectMultiple.prototype.idForLabel = function(id) {
  if (id) {
    id += '_0'
  }
  return id
}

/**
 * A widget that is composed of multiple widgets.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var MultiWidget = Widget.extend({
  constructor: function(widgets, kwargs) {
    if (!(this instanceof Widget)) return new MultiWidget(widgets, kwargs)
    this.widgets = []
    for (var i = 0, l = widgets.length; i < l; i++) {
      this.widgets.push(widgets[i] instanceof Widget
                        ? widgets[i]
                        : new widgets[i])
    }
    Widget.call(this, kwargs)
  }
})

/**
 * This method is different than other widgets', because it has to figure out
 * how to split a single value for display in multiple widgets.
 *
 * If the given value is NOT a list, it will first be "decompressed" into a list
 * before it is rendered by calling the {@link MultiWidget#decompress} method.
 *
 * Each value in the list is rendered  with the corresponding widget -- the
 * first value is rendered in the first widget, the second value is rendered in
 * the second widget, and so on.
 *
 * @param {String} name the field name.
 * @param value a list of values, or a normal value (e.g., a <code>String</code>
 *              that has been "compressed" from a list of values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 *
 * @return a rendered collection of widgets.
 */
MultiWidget.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  if (!(is.Array(value))) {
    value = this.decompress(value)
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs)
    , id = (typeof finalAttrs.id != 'undefined' ? finalAttrs.id : null)
    , renderedWidgets = []
  for (var i = 0, l = this.widgets.length; i < l; i++) {
    var widget = this.widgets[i]
      , widgetValue = null
    if (typeof value[i] != 'undefined') {
      widgetValue = value[i]
    }
    if (id) {
      finalAttrs.id = id + '_' + i
    }
    renderedWidgets.push(
        widget.render(name + '_' + i, widgetValue, {attrs: finalAttrs}))
  }
  return this.formatOutput(renderedWidgets)
}

MultiWidget.prototype.idForLabel = function(id) {
  if (id) {
    id += '_0'
  }
  return id
}

MultiWidget.prototype.valueFromData = function(data, files, name) {
  var values = []
  for (var i = 0, l = this.widgets.length; i < l; i++) {
    values[i] = this.widgets[i].valueFromData(data, files, name + '_' + i)
  }
  return values
}

MultiWidget.prototype._hasChanged = function(initial, data) {
  if (initial === null) {
    initial = []
    for (var i = 0, l = data.length; i < l; i++) {
      initial.push('')
    }
  }
  else if (!(is.Array(initial))) {
    initial = this.decompress(initial)
  }

  for (var i = 0, l = this.widgets.length; i < l; i++) {
    if (this.widgets[i]._hasChanged(initial[i], data[i])) {
      return true
    }
  }
  return false
}

/**
 * Creates an element containing a given list of rendered widgets.
 *
 * This hook allows you to format the HTML design of the widgets, if needed.
 *
 * @param {Array} renderedWidgets a list of rendered widgets.
 * @return a fragment containing the rendered widgets.
 */
MultiWidget.prototype.formatOutput = function(renderedWidgets) {
  return DOMBuilder.fragment(renderedWidgets)
}

/**
 * Creates a list of decompressed values for the given compressed value.
 *
 * @param value a compressed value, which can be assumed to be valid, but not
 *              necessarily non-empty.
 *
 * @return a list of decompressed values for the given compressed value.
 */
MultiWidget.prototype.decompress = function(value) {
  throw new Error('MultiWidget subclasses must implement a decompress() method.')
}

/**
 * Splits Date input into two <input type="text"> elements.
 * @constructor
 * @extends {MultiWidget}
 * @param {Object=} kwargs
 */
var SplitDateTimeWidget = MultiWidget.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new SplitDateTimeWidget(kwargs)
    kwargs = object.extend({dateFormat: null, timeFormat: null}, kwargs)
    var widgets = [
      DateInput({attrs: kwargs.attrs, format: kwargs.dateFormat})
    , TimeInput({attrs: kwargs.attrs, format: kwargs.timeFormat})
    ]
    MultiWidget.call(this, widgets, kwargs.attrs)
  }
})

SplitDateTimeWidget.prototype.decompress = function(value) {
  if (value) {
    return [
      new Date(value.getFullYear(), value.getMonth(), value.getDate())
    , new Date(1900, 0, 1, value.getHours(), value.getMinutes(), value.getSeconds())
    ]
  }
  return [null, null]
}

/**
 * Splits Date input into two <input type="hidden"> elements.
 * @constructor
 * @extends {SplitDateTimeWidget}
 * @param {Object=} kwargs
 */
var SplitHiddenDateTimeWidget = SplitDateTimeWidget.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) return new SplitHiddenDateTimeWidget(kwargs)
    SplitDateTimeWidget.call(this, kwargs)
    for (var i = 0, l = this.widgets.length; i < l; i++) {
      this.widgets[i].inputType = 'hidden'
      this.widgets[i].isHidden = true
    }
  }
, isHidden: true
})

module.exports = {
  Widget: Widget
, Input: Input
, TextInput: TextInput
, PasswordInput: PasswordInput
, HiddenInput: HiddenInput
, MultipleHiddenInput: MultipleHiddenInput
, FileInput: FileInput
, FILE_INPUT_CONTRADICTION: FILE_INPUT_CONTRADICTION
, ClearableFileInput: ClearableFileInput
, Textarea: Textarea
, DateInput: DateInput
, DateTimeInput: DateTimeInput
, TimeInput: TimeInput
, CheckboxInput: CheckboxInput
, Select: Select
, NullBooleanSelect: NullBooleanSelect
, SelectMultiple: SelectMultiple
, RadioInput: RadioInput
, RadioFieldRenderer: RadioFieldRenderer
, RadioSelect: RadioSelect
, CheckboxSelectMultiple: CheckboxSelectMultiple
, MultiWidget: MultiWidget
, SplitDateTimeWidget: SplitDateTimeWidget
, SplitHiddenDateTimeWidget: SplitHiddenDateTimeWidget
}
