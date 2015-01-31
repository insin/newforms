'use strict';

var is = require('isomorph/is')
var object = require('isomorph/object')
var React = require('react')

var Select = require('./Select')

/**
 * An HTML <select> widget which allows multiple selections.
 * @constructor
 * @extends {Select}
 * @param {Object=} kwargs
 */
var SelectMultiple = Select.extend({
  constructor: function SelectMultiple(kwargs) {
    if (!(this instanceof SelectMultiple)) { return new SelectMultiple(kwargs) }
    Select.call(this, kwargs)
  }
, allowMultipleSelected: true
, validation: {onChange: true}
})

/**
 * Renders the widget.
 * @param {string} name the field name.
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
  return React.createElement('select', finalAttrs, options)
}

/**
 * Retrieves values for this widget from the given data.
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {string} name the field name to be used to retrieve data.
 * @return {Array} values for this widget, or null if no values were provided.
 */
SelectMultiple.prototype.valueFromData = function(data, files, name) {
  if (object.hasOwn(data, name) && data[name] != null) {
    return [].concat(data[name])
  }
  return null
}

module.exports = SelectMultiple