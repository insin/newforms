'use strict';

var Concur = require('Concur')
var is = require('isomorph/is')
var object = require('isomorph/object')
var time = require('isomorph/time')
var React = require('react')

var env = require('./env')
var formats = require('./formats')
var util = require('./util')

/**
 * Some widgets are made of multiple HTML elements -- namely, RadioSelect.
 * This represents the "inner" HTML element of a widget.
 */
var SubWidget = Concur.extend({
  constructor: function SubWidget(parentWidget, name, value, kwargs) {
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
  constructor: function Widget(kwargs) {
    kwargs = object.extend({attrs: null}, kwargs)
    this.attrs = object.extend({}, kwargs.attrs)
  }
  /** Determines whether this corresponds to an <input type="hidden">. */
, isHidden: false
  /** Determines whether this widget needs a multipart-encoded form. */
, needsMultipartForm: false
  /** Determines whether this widget is for a required field. */
, isRequired: false
  /** Override for active validation config a partcular widget needs to use. */
, validation: null
  /** Determines whether this widget's render logic always needs to use the initial value. */
, needsInitialValue: false
  /** Determines wherther this widget's value can be set. */
, isValueSettable: true
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
 * The value given is not guaranteed to be valid input, so subclass
 * implementations should program defensively.
 *
 * @abstract
 */
Widget.prototype.render = function(name, value, kwargs) {
  throw new Error('Constructors extending must implement a render() method.')
}

/**
 * Helper function for building an HTML attributes object.
 */
Widget.prototype.buildAttrs = function(kwargAttrs, renderAttrs) {
  var attrs = object.extend({}, this.attrs, renderAttrs, kwargAttrs)
  return attrs
}

/**
 * Retrieves a value for this widget from the given data.
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {String} name the field name to be used to retrieve data.
 * @return a value for this widget, or null if no value was provided.
 */
Widget.prototype.valueFromData = function(data, files, name) {
  return object.get(data, name, null)
}

/**
 * Determines the HTML id attribute of this Widget for use by a
 * <label>, given the id of the field.
 *
 * This hook is necessary because some widgets have multiple HTML elements and,
 * thus, multiple ids. In that case, this method should return an ID value that
 * corresponds to the first id in the widget's tags.
 *
 * @param {String} id a field id.
 * @return the id which should be used by a <label>> for this Widget.
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
  constructor: function Input(kwargs) {
    if (!(this instanceof Widget)) { return new Input(kwargs) }
    Widget.call(this, kwargs)
  }
  /** The type attribute of this input - subclasses must define it. */
, inputType: null
})

Input.prototype._formatValue = function(value) {
  return value
}

Input.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  if (value === null) {
    value = ''
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: this.inputType,
                                                  name: name})
  // Hidden inputs can be made controlled inputs by default, as the user
  // can't directly interact with them.
  var valueAttr = (kwargs.controlled || this.isHidden ? 'value' : 'defaultValue')
  if (!(valueAttr == 'defaultValue' && value === '')) {
    finalAttrs[valueAttr] = (value !== '' ? ''+this._formatValue(value) : value)
  }
  return React.DOM.input(finalAttrs)
}

/**
 * An HTML <input type="text"> widget.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var TextInput = Input.extend({
  constructor: function TextInput(kwargs) {
    if (!(this instanceof Widget)) { return new TextInput(kwargs) }
    kwargs = object.extend({attrs: null}, kwargs)
    if (kwargs.attrs != null) {
      this.inputType = object.pop(kwargs.attrs, 'type', this.inputType)
    }
    Input.call(this, kwargs)
  }
, inputType: 'text'
})

/**
 * An HTML <input type="number"> widget.
 * @constructor
 * @extends {TextInput}
 * @param {Object=} kwargs
 */
var NumberInput = TextInput.extend({
  constructor: function NumberInput(kwargs) {
    if (!(this instanceof Widget)) { return new NumberInput(kwargs) }
    TextInput.call(this, kwargs)
  }
, inputType: 'number'
})

/**
 * An HTML <input type="email"> widget.
 * @constructor
 * @extends {TextInput}
 * @param {Object=} kwargs
 */
var EmailInput = TextInput.extend({
  constructor: function EmailInput(kwargs) {
    if (!(this instanceof Widget)) { return new EmailInput(kwargs) }
    TextInput.call(this, kwargs)
  }
, inputType: 'email'
})

/**
 * An HTML <input type="url"> widget.
 * @constructor
 * @extends {TextInput}
 * @param {Object=} kwargs
 */
var URLInput = TextInput.extend({
  constructor: function URLInput(kwargs) {
    if (!(this instanceof Widget)) { return new URLInput(kwargs) }
    TextInput.call(this, kwargs)
  }
, inputType: 'url'
})

/**
 * An HTML <input type="password"> widget.
 * @constructor
 * @extends {TextInput}
 * @param {Object=} kwargs
 */
var PasswordInput = TextInput.extend({
  constructor: function PasswordInput(kwargs) {
    if (!(this instanceof Widget)) { return new PasswordInput(kwargs) }
    kwargs = object.extend({renderValue: false}, kwargs)
    TextInput.call(this, kwargs)
    this.renderValue = kwargs.renderValue
  }
, inputType: 'password'
})

PasswordInput.prototype.render = function(name, value, kwargs) {
  if (!env.browser && !this.renderValue) {
    value = ''
  }
  return TextInput.prototype.render.call(this, name, value, kwargs)
}

/**
 * An HTML <input type="hidden"> widget.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var HiddenInput = Input.extend({
  constructor: function HiddenInput(kwargs) {
    if (!(this instanceof Widget)) { return new HiddenInput(kwargs) }
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
  constructor: function MultipleHiddenInput(kwargs) {
    if (!(this instanceof Widget)) { return new MultipleHiddenInput(kwargs) }
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
  var id = object.get(finalAttrs, 'id', null)
  var key = object.get(finalAttrs, 'key', null)
  var inputs = []
  for (var i = 0, l = value.length; i < l; i++) {
    var inputAttrs = object.extend({}, finalAttrs, {value: value[i]})
    // Add numeric index suffixes to attributes which should be unique
    if (id) {
      inputAttrs.id = id + '_' + i
    }
    if (key) {
      inputAttrs.key = id + '_' + i
    }
    inputs.push(React.DOM.input(inputAttrs))
  }
  return React.DOM.div(null, inputs)
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
  constructor: function FileInput(kwargs) {
    if (!(this instanceof Widget)) { return new FileInput(kwargs) }
    Input.call(this, kwargs)
  }
, inputType: 'file'
, needsMultipartForm: true
, validation: {onChange: true}
, isValueSettable: false
})

FileInput.prototype.render = function(name, value, kwargs) {
  return Input.prototype.render.call(this, name, null, kwargs)
}

/**
 * File widgets take data from file wrappers on the server. On the client, they
 * take it from data so the presence of a .value can be validated when required.
 */
FileInput.prototype.valueFromData = function(data, files, name) {
  return object.get(env.browser ? data : files, name, null)
}

var FILE_INPUT_CONTRADICTION = {}

/**
 * @constructor
 * @extends {FileInput}
 * @param {Object=} kwargs
 */
var ClearableFileInput = FileInput.extend({
  needsInitialValue: true
, isValueSettable: false
, constructor: function ClearableFileInput(kwargs) {
    if (!(this instanceof Widget)) { return new ClearableFileInput(kwargs) }
    FileInput.call(this, kwargs)
  }
, initialText: 'Currently'
, inputText: 'Change'
, clearCheckboxLabel: 'Clear'
, templateWithInitial: function(params) {
    return util.formatToArray(
      '{initialText}: {initial} {clearTemplate}{br}{inputText}: {input}'
    , object.extend(params, {br: React.DOM.br(null)})
    )
  }
, templateWithClear: function(params) {
    return util.formatToArray(
      '{checkbox} {label}'
    , object.extend(params, {
        label: React.DOM.label({htmlFor: params.checkboxId}, params.label)
      })
    )
  }
, urlMarkupTemplate: function(href, name) {
    return React.DOM.a({href: href}, name)
  }
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
  kwargs = object.extend({attrs: {}}, kwargs)
  kwargs.attrs.key = 'input'
  var input = FileInput.prototype.render.call(this, name, value, kwargs)
  var initialValue = kwargs.initialValue
  if (!initialValue && value && typeof value.url != 'undefined') {
    initialValue = value
  }
  if (initialValue && typeof initialValue.url != 'undefined') {
    var clearTemplate
    if (!this.isRequired) {
      var clearCheckboxName = this.clearCheckboxName(name)
      var clearCheckboxId = this.clearCheckboxId(clearCheckboxName)
      clearTemplate = this.templateWithClear({
        checkbox: CheckboxInput().render(clearCheckboxName, false, {attrs: {'id': clearCheckboxId}})
      , checkboxId: clearCheckboxId
      , label: this.clearCheckboxLabel
      })
    }
    var contents = this.templateWithInitial({
      initialText: this.initialText
    , initial: this.urlMarkupTemplate(initialValue.url, ''+initialValue)
    , clearTemplate: clearTemplate
    , inputText: this.inputText
    , input: input
    })
    return React.DOM.span(null, contents)
  }
  else {
    return React.DOM.span(null, input)
  }
}

ClearableFileInput.prototype.valueFromData = function(data, files, name) {
  var upload = FileInput.prototype.valueFromData(data, files, name)
  if (!this.isRequired &&
      CheckboxInput.prototype.valueFromData.call(this, data, files,
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
 * An HTML <textarea> widget.
 * @param {Object} [kwargs] configuration options
 * @config {Object} [attrs] HTML attributes for the rendered widget. Default
 *   rows and cols attributes will be used if not provided.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var Textarea = Widget.extend({
  constructor: function Textarea(kwargs) {
    if (!(this instanceof Widget)) { return new Textarea(kwargs) }
    // Ensure we have something in attrs
    kwargs = object.extend({attrs: null}, kwargs)
    // Provide default 'cols' and 'rows' attributes
    kwargs.attrs = object.extend({rows: '10', cols: '40'}, kwargs.attrs)
    Widget.call(this, kwargs)
  }
})

Textarea.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({}, kwargs)
  if (value === null) {
    value = ''
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name})
  var valueAttr = (kwargs.controlled ? 'value' : 'defaultValue')
  finalAttrs[valueAttr] = value
  return React.DOM.textarea(finalAttrs)
}

/**
 * A <input type="text"> which, if given a Date object to display, formats it as
 * an appropriate date/time String.
 * @constructor
 * @extends {TextInput}
 * @param {Object=} kwargs
 */
var DateTimeBaseInput = TextInput.extend({
  constructor: function DateTimeBaseInput(kwargs) {
    kwargs = object.extend({format: null}, kwargs)
    TextInput.call(this, kwargs)
    this.format = (kwargs.format !== null ? kwargs.format : this.defaultFormat)
  }
})

DateTimeBaseInput.prototype._formatValue = function(value) {
  if (is.Date(value)) {
    return time.strftime(value, this.format)
  }
  return value
}

/**
 * @constructor
 * @extends {DateTimeBaseInput}
 * @param {Object=} kwargs
 */
var DateInput = DateTimeBaseInput.extend({
  constructor: function DateInput(kwargs) {
    if (!(this instanceof DateInput)) { return new DateInput(kwargs) }
    DateTimeBaseInput.call(this, kwargs)
  }
, defaultFormat: formats.DEFAULT_DATE_INPUT_FORMATS[0]
})

/**
 * @constructor
 * @extends {DateTimeBaseInput}
 * @param {Object=} kwargs
 */
var DateTimeInput = DateTimeBaseInput.extend({
  constructor: function DateTimeInput(kwargs) {
    if (!(this instanceof DateTimeInput)) { return new DateTimeInput(kwargs) }
    DateTimeBaseInput.call(this, kwargs)
  }
, defaultFormat: formats.DEFAULT_DATETIME_INPUT_FORMATS[0]
})

/**
 * @constructor
 * @extends {DateTimeBaseInput}
 * @param {Object=} kwargs
 */
var TimeInput = DateTimeBaseInput.extend({
  constructor: function TimeInput(kwargs) {
    if (!(this instanceof TimeInput)) { return new TimeInput(kwargs) }
    DateTimeBaseInput.call(this, kwargs)
  }
, defaultFormat: formats.DEFAULT_TIME_INPUT_FORMATS[0]
})

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
  constructor: function CheckboxInput(kwargs) {
    if (!(this instanceof Widget)) { return new CheckboxInput(kwargs) }
    kwargs = object.extend({checkTest: defaultCheckTest}, kwargs)
    Widget.call(this, kwargs)
    this.checkTest = kwargs.checkTest
  }
, validation: {onChange: true}
})

CheckboxInput.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({}, kwargs)
  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: 'checkbox',
                                                  name: name})
  if (value !== '' && value !== true && value !== false && value !== null &&
      value !== undefined) {
    // Only add the value attribute if value is non-empty
    finalAttrs.value = value
  }
  var checkedAttr = (kwargs.controlled ? 'checked' : 'defaultChecked')
  finalAttrs[checkedAttr] = this.checkTest(value)
  return React.DOM.input(finalAttrs)
}

CheckboxInput.prototype.valueFromData = function(data, files, name) {
  if (typeof data[name] == 'undefined') {
    //  A missing value means False because HTML form submission does not
    // send results for unselected checkboxes.
    return false
  }
  var value = data[name]
  var values = {'true': true, 'false': false}
  // Translate true and false strings to boolean values
  if (is.String(value)) {
    value = object.get(values, value.toLowerCase(), value)
  }
  return !!value
}

/**
 * An HTML <select> widget.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var Select = Widget.extend({
  constructor: function Select(kwargs) {
    if (!(this instanceof Widget)) { return new Select(kwargs) }
    kwargs = object.extend({choices: []}, kwargs)
    Widget.call(this, kwargs)
    this.choices = util.normaliseChoices(kwargs.choices)
  }
, allowMultipleSelected: false
, validation: {onChange: true}
})

/**
 * Renders the widget.
 * @param {String} name the field name.
 * @param selectedValue the value of an option which should be marked as
 *   selected, or null if no value is selected -- will be normalised to a String
 *   for comparison with choice values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 * @param {Array} [choices] choices to be used when rendering the widget, in
 *   addition to those already held by the widget itself.
 * @return a <select> element.
 */
Select.prototype.render = function(name, selectedValue, kwargs) {
  kwargs = object.extend({choices: []}, kwargs)
  if (selectedValue === null) {
    selectedValue = ''
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name})
  var options = this.renderOptions(kwargs.choices, [selectedValue])
  var valueAttr = (kwargs.controlled ? 'value' : 'defaultValue')
  finalAttrs[valueAttr] = selectedValue
  return React.DOM.select(finalAttrs, options)
}

Select.prototype.renderOptions = function(additionalChoices, selectedValues) {
  var selectedValuesLookup = object.lookup(selectedValues)
  var options = []
  var choices = this.choices.concat(util.normaliseChoices(additionalChoices))
  for (var i = 0, l = choices.length, choice; i < l; i++) {
    choice = choices[i]
    if (is.Array(choice[1])) {
      var optgroupOptions = []
      var optgroupChoices = choice[1]
      for (var j = 0, m = optgroupChoices.length; j < m; j++) {
        optgroupOptions.push(this.renderOption(selectedValuesLookup,
                                               optgroupChoices[j][0],
                                               optgroupChoices[j][1]))
      }
      options.push(React.DOM.optgroup({label: choice[0]}, optgroupOptions))
    }
    else {
      options.push(this.renderOption(selectedValuesLookup,
                                     choice[0],
                                     choice[1]))
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
  return React.DOM.option(attrs, optLabel)
}

/**
 * A <select> widget intended to be used with NullBooleanField.
 * @constructor
 * @extends {Select}
 * @param {Object=} kwargs
 */
var NullBooleanSelect = Select.extend({
  constructor: function NullBooleanSelect(kwargs) {
    if (!(this instanceof Widget)) { return new NullBooleanSelect(kwargs) }
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

/**
 * An HTML <select> widget which allows multiple selections.
 * @constructor
 * @extends {Select}
 * @param {Object=} kwargs
 */
var SelectMultiple = Select.extend({
  constructor: function SelectMultiple(kwargs) {
    if (!(this instanceof Widget)) { return new SelectMultiple(kwargs) }
    Select.call(this, kwargs)
  }
, allowMultipleSelected: true
, validation: {onChange: true}
})

/**
 * Renders the widget.
 * @param {String} name the field name.
 * @param {Array} selectedValues the values of options which should be marked as
 *   selected, or null if no values are selected - these will be normalised to
 *   Strings for comparison with choice values.
 * @param {Object} [kwargs] additional rendering options.
 * @return a <select> element which allows multiple selections.
 */
SelectMultiple.prototype.render = function(name, selectedValues, kwargs) {
  kwargs = object.extend({choices: []}, kwargs)
  if (selectedValues === null) {
    selectedValues = []
  }
  if (!is.Array(selectedValues)) {
    selectedValues = [selectedValues]
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name,
                                                  multiple: 'multiple'})
  var options = this.renderOptions(kwargs.choices, selectedValues)
  var valueAttr = (kwargs.controlled ? 'value' : 'defaultValue')
  finalAttrs[valueAttr] = selectedValues
  return React.DOM.select(finalAttrs, options)
}

/**
 * Retrieves values for this widget from the given data.
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {String} name the field name to be used to retrieve data.
 * @return {Array} values for this widget, or null if no values were provided.
 */
SelectMultiple.prototype.valueFromData = function(data, files, name) {
  if (object.hasOwn(data, name) && data[name] != null) {
    return [].concat(data[name])
  }
  return null
}

/**
 * An object used by ChoiceFieldRenderer that represents a single
 * <input>.
 */
var ChoiceInput = SubWidget.extend({
  constructor: function ChoiceInput(name, value, attrs, controlled, choice, index) {
    this.name = name
    this.value = value
    this.attrs = attrs
    this.controlled = controlled
    this.choiceValue = ''+choice[0]
    this.choiceLabel = ''+choice[1]
    this.index = index
    if (typeof this.attrs.id != 'undefined') {
      this.attrs.id += '_' + this.index
    }
    if (typeof this.attrs.key != 'undefined') {
      this.attrs.key += '_' + this.index
    }
  }
, inputType: null // Subclasses must define this
})

/**
 * Renders a <label> enclosing the widget and its label text.
 */
ChoiceInput.prototype.render = function() {
  var labelAttrs = {}
  if (this.idForLabel()) {
    labelAttrs.htmlFor = this.idForLabel()
  }
  return React.DOM.label(labelAttrs, this.tag(), ' ', this.choiceLabel)
}

ChoiceInput.prototype.isChecked = function() {
  return this.value === this.choiceValue
}

/**
 * Renders the <input> portion of the widget.
 */
ChoiceInput.prototype.tag = function() {
  var finalAttrs = Widget.prototype.buildAttrs.call(this, {}, {
    type: this.inputType, name: this.name, value: this.choiceValue
  })
  var checkedAttr = (this.controlled ? 'checked' : 'defaultChecked')
  finalAttrs[checkedAttr] = this.isChecked()
  return React.DOM.input(finalAttrs)
}

ChoiceInput.prototype.idForLabel = function() {
  return object.get(this.attrs, 'id', '')
}

var RadioChoiceInput = ChoiceInput.extend({
  constructor: function RadioChoiceInput(name, value, attrs, controlled, choice, index) {
    if (!(this instanceof RadioChoiceInput)) {
      return new RadioChoiceInput(name, value, attrs, controlled, choice, index)
    }
    ChoiceInput.call(this, name, value, attrs, controlled, choice, index)
    this.value = ''+this.value
  }
, inputType: 'radio'
})

var CheckboxChoiceInput = ChoiceInput.extend({
  constructor: function CheckboxChoiceInput(name, value, attrs, controlled, choice, index) {
    if (!(this instanceof CheckboxChoiceInput)) {
      return new CheckboxChoiceInput(name, value, attrs, controlled, choice, index)
    }
    if (!is.Array(value)) {
      value = [value]
    }
    ChoiceInput.call(this, name, value, attrs, controlled, choice, index)
    for (var i = 0, l = this.value.length; i < l; i++) {
      this.value[i] = ''+this.value[i]
    }
  }
, inputType: 'checkbox'
})

CheckboxChoiceInput.prototype.isChecked = function() {
  return this.value.indexOf(this.choiceValue) !== -1
}

/**
 * An object used by choice Selects to enable customisation of choice widgets.
 * @constructor
 * @param {string} name
 * @param {string} value
 * @param {Object} attrs
 * @param {boolean} controlled
 * @param {Array} choices
 */
var ChoiceFieldRenderer = Concur.extend({
  constructor: function ChoiceFieldRenderer(name, value, attrs, controlled, choices) {
    if (!(this instanceof ChoiceFieldRenderer)) {
      return new ChoiceFieldRenderer(name, value, attrs, controlled, choices)
    }
    this.name = name
    this.value = value
    this.attrs = attrs
    this.controlled = controlled
    this.choices = choices
  }
, choiceInputConstructor: null
})

ChoiceFieldRenderer.prototype.choiceInputs = function() {
  var inputs = []
  for (var i = 0, l = this.choices.length; i < l; i++) {
    inputs.push(this.choiceInputConstructor(this.name, this.value,
                                            object.extend({}, this.attrs),
                                            this.controlled,
                                            this.choices[i], i))
  }
  return inputs
}

ChoiceFieldRenderer.prototype.choiceInput = function(i) {
  if (i >= this.choices.length) {
    throw new Error('Index out of bounds: ' + i)
  }
  return this.choiceInputConstructor(this.name, this.value,
                                     object.extend({}, this.attrs),
                                     this.controlled,
                                     this.choices[i], i)
  }

/**
 * Outputs a <ul> for this set of choice fields.
 * If an id was given to the field, it is applied to the <ul> (each item in the
 * list will get an id of `$id_$i`).
 */
ChoiceFieldRenderer.prototype.render = function() {
  var id = object.get(this.attrs, 'id', null)
  var key = object.pop(this.attrs, 'key', null)
  var items = []
  for (var i = 0, l = this.choices.length; i < l; i++) {
    var choice = this.choices[i]
    var choiceValue = choice[0]
    var choiceLabel = choice[1]
    if (is.Array(choiceLabel)) {
      var attrsPlus = object.extend({}, this.attrs)
      if (id) {
        attrsPlus.id +='_' + i
      }
      if (key) {
        attrsPlus.key += '_' + i
      }
      var subRenderer = ChoiceFieldRenderer(this.name, this.value,
                                            attrsPlus,
                                            this.controlled,
                                            choiceLabel)
      subRenderer.choiceInputConstructor = this.choiceInputConstructor
      items.push(React.DOM.li(null, choiceValue, subRenderer.render()))
    }
    else {
      var w = this.choiceInputConstructor(this.name, this.value,
                                          object.extend({}, this.attrs),
                                          this.controlled,
                                          choice, i)
      items.push(React.DOM.li(null, w.render()))
    }
  }
  var listAttrs = {}
  if (id) {
    listAttrs.id = id
  }
  return React.DOM.ul(listAttrs, items)
}

var RadioFieldRenderer = ChoiceFieldRenderer.extend({
  constructor: function RadioFieldRenderer(name, value, attrs, controlled, choices) {
    if (!(this instanceof RadioFieldRenderer)) {
      return new RadioFieldRenderer(name, value, attrs, controlled, choices)
    }
    ChoiceFieldRenderer.apply(this, arguments)
  }
, choiceInputConstructor: RadioChoiceInput
})

var CheckboxFieldRenderer = ChoiceFieldRenderer.extend({
  constructor: function CheckboxFieldRenderer(name, value, attrs, controlled, choices) {
    if (!(this instanceof CheckboxFieldRenderer)) {
      return new CheckboxFieldRenderer(name, value, attrs, controlled, choices)
    }
    ChoiceFieldRenderer.apply(this, arguments)
  }
, choiceInputConstructor: CheckboxChoiceInput
})

var RendererMixin = Concur.extend({
  constructor: function RendererMixin(kwargs) {
    kwargs = object.extend({renderer: null}, kwargs)
    // Override the default renderer if we were passed one
    if (kwargs.renderer !== null) {
      this.renderer = kwargs.renderer
    }
  }
, _emptyValue: null
, validation: {onChange: true}
})

RendererMixin.prototype.subWidgets = function(name, value, kwargs) {
  return this.getRenderer(name, value, kwargs).choiceInputs()
}

/**
 * @return an instance of the renderer to be used to render this widget.
 */
RendererMixin.prototype.getRenderer = function(name, value, kwargs) {
  kwargs = object.extend({choices: [], controlled: false}, kwargs)
  if (value === null) {
    value = this._emptyValue
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs)
  var choices = this.choices.concat(kwargs.choices)
  return new this.renderer(name, value, finalAttrs, kwargs.controlled, choices)
}

RendererMixin.prototype.render = function(name, value, kwargs) {
  return this.getRenderer(name, value, kwargs).render()
}

/**
 * Widgets using this RendererMixin are made of a collection of subwidgets, each
 * with their own <label>, and distinct ID.
 * The IDs are made distinct by y "_X" suffix, where X is the zero-based index
 * of the choice field. Thus, the label for the main widget should reference the
 * first subwidget, hence the "_0" suffix.
 */
RendererMixin.prototype.idForLabel = function(id) {
  if (id) {
    id += '_0'
  }
  return id
}

/**
 * Renders a single select as a list of <input type="radio"> elements.
 * @constructor
 * @extends {Select}
 * @param {Object=} kwargs
 */
var RadioSelect = Select.extend({
  __mixin__: RendererMixin
, constructor: function(kwargs) {
    if (!(this instanceof RadioSelect)) { return new RadioSelect(kwargs) }
    RendererMixin.call(this, kwargs)
    Select.call(this, kwargs)
  }
, renderer: RadioFieldRenderer
, _emptyValue: ''
})

/**
 * Multiple selections represented as a list of <input type="checkbox"> widgets.
 * @constructor
 * @extends {SelectMultiple}
 * @param {Object=} kwargs
 */
var CheckboxSelectMultiple = SelectMultiple.extend({
  __mixin__: RendererMixin
, constructor: function(kwargs) {
    if (!(this instanceof CheckboxSelectMultiple)) { return new CheckboxSelectMultiple(kwargs) }
    RendererMixin.call(this, kwargs)
    SelectMultiple.call(this, kwargs)
  }
, renderer: CheckboxFieldRenderer
, _emptyValue: []
})

/**
 * A widget that is composed of multiple widgets.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var MultiWidget = Widget.extend({
  constructor: function MultiWidget(widgets, kwargs) {
    if (!(this instanceof Widget)) { return new MultiWidget(widgets, kwargs) }
    this.widgets = []
    var needsMultipartForm = false
    for (var i = 0, l = widgets.length; i < l; i++) {
      var widget = widgets[i] instanceof Widget ? widgets[i] : new widgets[i]()
      if (widget.needsMultipartForm) {
        needsMultipartForm = true
      }
      this.widgets.push(widget)
    }
    this.needsMultipartForm = needsMultipartForm
    Widget.call(this, kwargs)
  }
})

/**
 * This method is different than other widgets', because it has to figure out
 * how to split a single value for display in multiple widgets.
 *
 * If the given value is NOT a list, it will first be "decompressed" into a list
 * before it is rendered by calling the  MultiWidget#decompress function.
 *
 * Each value in the list is rendered  with the corresponding widget -- the
 * first value is rendered in the first widget, the second value is rendered in
 * the second widget, and so on.
 *
 * @param {String} name the field name.
 * @param {(Array.<*>|*)} value a list of values, or a normal value (e.g., a String that has
 *   been "compressed" from a list of values).
 * @param {Object=} kwargs]additional rendering options
 * @return a rendered collection of widgets.
 */
MultiWidget.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({}, kwargs)
  if (!(is.Array(value))) {
    value = this.decompress(value)
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {'data-newforms-field': name})
  var id = object.get(finalAttrs, 'id', null)
  var key = object.get(finalAttrs, 'key', null)
  var renderedWidgets = []
  for (var i = 0, l = this.widgets.length; i < l; i++) {
    var widget = this.widgets[i]
    var widgetValue = null
    if (typeof value[i] != 'undefined') {
      widgetValue = value[i]
    }
    if (id) {
      finalAttrs.id = id + '_' + i
    }
    if (key) {
      finalAttrs.key = key + '_' + i
    }
    renderedWidgets.push(
        widget.render(name + '_' + i, widgetValue, {attrs: finalAttrs,
                                                    controlled: kwargs.controlled}))
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

/**
 * Creates an element containing a given list of rendered widgets.
 *
 * This hook allows you to format the HTML design of the widgets, if needed.
 *
 * @param {Array} renderedWidgets a list of rendered widgets.
 * @return a <div> containing the rendered widgets.
 */
MultiWidget.prototype.formatOutput = function(renderedWidgets) {
  return React.DOM.div(null, renderedWidgets)
}

/**
 * Creates a list of decompressed values for the given compressed value.
 * @abstract
 * @param value a compressed value, which can be assumed to be valid, but not
 *   necessarily non-empty.
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
  constructor: function SplitDateTimeWidget(kwargs) {
    if (!(this instanceof Widget)) { return new SplitDateTimeWidget(kwargs) }
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
  constructor: function SplitHiddenDateTimeWidget(kwargs) {
    if (!(this instanceof Widget)) { return new SplitHiddenDateTimeWidget(kwargs) }
    SplitDateTimeWidget.call(this, kwargs)
    for (var i = 0, l = this.widgets.length; i < l; i++) {
      this.widgets[i].inputType = 'hidden'
      this.widgets[i].isHidden = true
    }
  }
, isHidden: true
})

module.exports = {
  SubWidget: SubWidget
, Widget: Widget
, Input: Input
, TextInput: TextInput
, NumberInput: NumberInput
, EmailInput: EmailInput
, URLInput: URLInput
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
, ChoiceInput: ChoiceInput
, RadioChoiceInput: RadioChoiceInput
, CheckboxChoiceInput: CheckboxChoiceInput
, ChoiceFieldRenderer: ChoiceFieldRenderer
, RendererMixin: RendererMixin
, RadioFieldRenderer: RadioFieldRenderer
, CheckboxFieldRenderer: CheckboxFieldRenderer
, RadioSelect: RadioSelect
, CheckboxSelectMultiple: CheckboxSelectMultiple
, MultiWidget: MultiWidget
, SplitDateTimeWidget: SplitDateTimeWidget
, SplitHiddenDateTimeWidget: SplitHiddenDateTimeWidget
}
