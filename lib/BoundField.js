'use strict';

var Concur = require('Concur')
var is = require('isomorph/is')
var format = require('isomorph/format').formatObj
var object = require('isomorph/object')
var React = require('react')

var util = require('./util')
var widgets = require('./widgets')

/**
 * A helper for rendering a field.
 * @param {Form} form the form instance which the field is a part of.
 * @param {Field} field the field to be rendered.
 * @param {string} name the name associated with the field in the form.
 * @constructor
 */
var BoundField = Concur.extend({
  constructor: function BoundField(form, field, name) {
    if (!(this instanceof BoundField)) { return new BoundField(form, field, name) }
    this.form = form
    this.field = field
    this.name = name
    this.htmlName = form.addPrefix(name)
    this.htmlInitialName = form.addInitialPrefix(name)
    this.htmlInitialId = form.addInitialPrefix(this.autoId())
    this.label = this.field.label !== null ? this.field.label : util.prettyName(name)
    this.helpText = field.helpText || ''
  }
})

// ================================================================== Status ===

/**
 * @return {boolean} true if the value which will be displayed in the field's
 *   widget is empty.
 */
BoundField.prototype.isEmpty = function() {
  return this.field.isEmptyValue(this.value())
}

/**
 * @return {boolean} true if the field has a pending async validation.
 */
BoundField.prototype.isPending = function() {
  return typeof this.form._pendingAsyncValidation[this.name] != 'undefined'
}

/**
 * @return {boolean} true if the field has some data in its form's cleanedData.
 */
BoundField.prototype.isCleaned = function() {
  return typeof this.form.cleanedData[this.name] != 'undefined'
}

/**
 * @return {boolean} true if the field's widget will render hidden field(s).
 */
BoundField.prototype.isHidden = function() {
  return this.field.widget.isHidden
}

/**
 * Determines the field's curent status in the form. Statuses are determined in
 * the following order:
 * * 'pending' - the field has a pending async validation.
 * * 'error' - the field has a validation error.
 * * 'valid' - the field has a value in form.cleanedData.
 * * 'default' - the field meets none of the above criteria, e.g. it's been
 *   rendered but hasn't been interacted with or validated yet.
 * @return {string}
 */
BoundField.prototype.status = function() {
  if (this.isPending()) { return 'pending' }
  if (this.errors().isPopulated()) { return 'error' }
  if (this.isCleaned()) { return 'valid' }
  return 'default'
}

// ============================================================== Field Data ===

/**
 * Calculates and returns the id attribute for this BoundField if the associated
 * form has an autoId. Returns an empty string otherwise.
 */
BoundField.prototype.autoId = function() {
  var autoId = this.form.autoId
  if (autoId) {
    autoId = ''+autoId
    if (autoId.indexOf('{name}') != -1) {
      return format(autoId, {name: this.htmlName})
    }
    return this.htmlName
  }
  return ''
}

/**
 * @return {*} user input data for the field, or null if none has been given.
 */
BoundField.prototype.data = function() {
  return this.field.widget.valueFromData(this.form.data,
                                         this.form.files,
                                         this.htmlName)
}

/**
 * @return {ErrorObject} errors for the field, which may be empty.
 */
BoundField.prototype.errors = function() {
  return this.form.errors(this.name) || new this.form.errorConstructor()
}

/**
 * @return {string=} the first error message for the field, or undefined if
 *   there were none.
 */
BoundField.prototype.errorMessage = function() {
  return this.errors().first()
}

/**
 * @return {Array.<string>} all error messages for the field, will be empty if
 *   there were none.
 */
BoundField.prototype.errorMessages = function() {
  return this.errors().messages()
}

/**
 * Gets or generates an id for the field's <label>.
 * @return {string}
 */
BoundField.prototype.idForLabel = function() {
  var widget = this.field.widget
  var id = object.get(widget.attrs, 'id', this.autoId())
  return widget.idForLabel(id)
}

/**
 * @return {*} the value to be displayed in the field's widget.
 */
BoundField.prototype.value = function() {
  var data
  if (this.form.isInitialRender) {
    data = this.initialValue()
  }
  else {
    data = this.field.boundData(this.data(),
                                object.get(this.form.initial,
                                           this.name,
                                           this.field.initial))
  }
  return this.field.prepareValue(data)
}

/**
 * @return {*} the initial value for the field, will be null if none was
 *   configured on the field or given to the form.
 */
BoundField.prototype.initialValue = function() {
  var value = object.get(this.form.initial, this.name, this.field.initial)
  if (is.Function(value)) {
    value = value()
  }
  return value
}

// =============================================================== Rendering ===

/**
 * Renders a widget for the field.
 * @param {Object=} kwargs widgets options.
 * @param {Widget} kwargs.widget an override for the widget used to render the
 *   field - if not provided, the field's configured widget will be used.
 * @param {Object} kwargs.attrs additional attributes to be added to the field's
 *   widget.
 * @return {ReactElement}
 */
BoundField.prototype.asWidget = function(kwargs) {
  kwargs = object.extend({
    widget: null, attrs: null, onlyInitial: false
  }, kwargs)
  var widget = (kwargs.widget !== null ? kwargs.widget : this.field.widget)
  var attrs = (kwargs.attrs !== null ? kwargs.attrs : {})
  var autoId = this.autoId()
  var name = !kwargs.onlyInitial ? this.htmlName : this.htmlInitialName
  if (autoId &&
      typeof attrs.id == 'undefined' &&
      typeof widget.attrs.id == 'undefined') {
    attrs.id = (!kwargs.onlyInitial ? autoId : this.htmlInitialId)
  }
  if (typeof attrs.key == 'undefined') {
    attrs.key = name
  }
  var controlled = this._isControlled(widget)
  var validation = this._validation(widget)

  // Always Add an onChange event handler to update form.data when the field is
  // changed.
  attrs.onChange = this.form._handleFieldEvent.bind(this.form, {
    event: 'onChange'
  , validate: !!validation.onChange
  , delay: validation.onChangeDelay
  })

  // If validation should happen on events other than onChange, also add event
  // handlers for them.
  if (validation != 'manual' && validation.events) {
    for (var i = 0, l = validation.events.length; i < l; i++) {
      var eventName = validation.events[i]
      attrs[eventName] =
        this.form._handleFieldEvent.bind(this.form, {event: eventName})
    }
  }

  var renderKwargs = {attrs: attrs, controlled: controlled}
  if (widget.needsInitialValue) {
    renderKwargs.initialValue = this.initialValue()
  }
  return widget.render(name, this.value(), renderKwargs)
}

/**
 * Renders the field as a hidden field.
 * @param {Object=} kwargs widget options.
 * @return {ReactElement}
 */
BoundField.prototype.asHidden = function(kwargs) {
  kwargs = object.extend({}, kwargs, {widget: new this.field.hiddenWidget()})
  return this.asWidget(kwargs)
}

/**
 * Renders the field as a text input.
 * @param {Object=} kwargs widget options.
 * @return {ReactElement}
 */
BoundField.prototype.asText = function(kwargs) {
  kwargs = object.extend({}, kwargs, {widget: widgets.TextInput()})
  return this.asWidget(kwargs)
}

/**
 * Renders the field as a textarea.
 * @param {Object=} kwargs widget options.
 * @return {ReactElement}
 */
BoundField.prototype.asTextarea = function(kwargs) {
  kwargs = object.extend({}, kwargs, {widget: widgets.Textarea()})
  return this.asWidget(kwargs)
}

/**
 * Determines CSS classes for this field based on what's configured in the field
 * and form, and the field's current status.
 * @param {string=} extraCssClasses additional CSS classes for the field.
 * @return {string} space-separated CSS classes for this field.
 */
BoundField.prototype.cssClasses = function(extraCssClasses) {
  var cssClasses = (extraCssClasses ? [extraCssClasses] : [])

  // Field/row classes
  if (this.field.cssClass !== null) {
    cssClasses.push(this.field.cssClass)
  }
  if (typeof this.form.rowCssClass != 'undefined') {
    cssClasses.push(this.form.rowCssClass)
  }

  // Status class
  var status = this.status()
  if (typeof this.form[status + 'CssClass'] != 'undefined') {
    cssClasses.push(this.form[status + 'CssClass'])
  }

  // Required-ness classes
  if (this.field.required) {
    if (typeof this.form.requiredCssClass != 'undefined') {
      cssClasses.push(this.form.requiredCssClass)
    }
  }
  else if (typeof this.form.optionalCssClass != 'undefined') {
    cssClasses.push(this.form.optionalCssClass)
  }

  return cssClasses.join(' ')
}

/**
 * Wraps the given contents in a <label> if the field has an id attribute. If
 * contents aren't given, uses the field's label.
 * If attrs are given, they're used as HTML attributes on the <label> tag.
 * @param {Object=} kwargs configuration options.
 * @param {string} kwargs.contents contents for the label - if not provided,
 *   label contents will be generated from the field itself.
 * @param {Object} kwargs.attrs additional attributes to be added to the label.
 * @param {string} kwargs.labelSuffix allows overriding the form's labelSuffix.
 * @return {ReactElement}
 */
BoundField.prototype.labelTag = function(kwargs) {
  kwargs = object.extend({
    contents: this.label, attrs: null, labelSuffix: this.form.labelSuffix
  }, kwargs)
  var contents = this._addLabelSuffix(kwargs.contents, kwargs.labelSuffix)
  var widget = this.field.widget
  var id = object.get(widget.attrs, 'id', this.autoId())
  if (id) {
    var attrs = object.extend(kwargs.attrs || {}, {htmlFor: widget.idForLabel(id)})
    contents = React.createElement('label', attrs, contents)
  }
  return contents
}

/**
 * @return {ReactElement}
 */
BoundField.prototype.render = function(kwargs) {
  if (this.field.showHiddenInitial) {
    return React.createElement('div', null, this.asWidget(kwargs),
                               this.asHidden({onlyInitial: true}))
  }
  return this.asWidget(kwargs)
}

/**
 * Returns a list of SubWidgets that comprise all widgets in this BoundField.
 * This really is only useful for RadioSelect and CheckboxSelectMultiple
 * widgets, so that you can iterate over individual inputs when rendering.
 * @return {Array.<SubWidget>}
 */
BoundField.prototype.subWidgets = function() {
  var id = this.field.widget.attrs.id || this.autoId()
  var kwargs = {attrs: {}}
  if (id) {
    kwargs.attrs.id = id
  }
  return this.field.widget.subWidgets(this.htmlName, this.value(), kwargs)
}

/**
 * @return {string}
 */
BoundField.prototype._addLabelSuffix = function(label, labelSuffix) {
  // Only add the suffix if the label does not end in punctuation
  if (labelSuffix && ':?.!'.indexOf(label.charAt(label.length - 1)) == -1) {
    return label + labelSuffix
  }
  return label
}

/**
 * Determines if the widget should be a controlled or uncontrolled React
 * component.
 * @return {boolean}
 */
BoundField.prototype._isControlled = function(widget) {
  if (arguments.length === 0) {
    widget = this.field.widget
  }
  var controlled = false
  if (widget.isValueSettable) {
    // If the field has any controlled config set, it should take precedence,
    // otherwise use the form's as it has a default.
    controlled = (this.field.controlled !== null
                  ? this.field.controlled
                  : this.form.controlled)
  }
  return controlled
}

/**
 * Gets the configured validation for the field or form, allowing the widget
 * which is going to be rendered to override it if necessary.
 * @param {Widget=} widget
 * @return {?(Object|string)}
 */
BoundField.prototype._validation = function(widget) {
  if (arguments.length === 0) {
    widget = this.field.widget
  }
  // If the field has any validation config set, it should take precedence,
  // otherwise use the form's as it has a default.
  var validation = this.field.validation || this.form.validation
  // Allow widgets to override the type of validation that's used for them -
  // primarily for inputs which can only be changed by click/selection.
  if (validation !== 'manual' && widget.validation !== null) {
    validation = widget.validation
  }
  return validation
}

module.exports = BoundField