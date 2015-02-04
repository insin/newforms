'use strict';

var is = require('isomorph/is')
var object = require('isomorph/object')
var React = require('react')

var Widget = require('../Widget')

var {normaliseChoices} = require('../util')

/**
 * An HTML <select> widget.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var Select = Widget.extend({
  constructor: function Select(kwargs) {
    if (!(this instanceof Select)) { return new Select(kwargs) }
    kwargs = object.extend({choices: []}, kwargs)
    Widget.call(this, kwargs)
    this.choices = normaliseChoices(kwargs.choices)
  }
, allowMultipleSelected: false
, validation: {onChange: true}
})

/**
 * Renders the widget.
 * @param {string} name the field name.
 * @param {*} selectedValue the value of an option which should be marked as
 *   selected, or null if no value is selected -- will be normalised to a String
 *   for comparison with choice values.
 * @param {Object=} kwargs rendering options
 * @param {Object=} kwargs.attrs additional HTML attributes for the rendered widget.
 * @param {Array=} kwargs.choices choices to be used when rendering the widget, in
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
  return React.createElement('select', finalAttrs, options)
}

Select.prototype.renderOptions = function(additionalChoices, selectedValues) {
  var selectedValuesLookup = object.lookup(selectedValues)
  var options = []
  var choices = this.choices.concat(normaliseChoices(additionalChoices))
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
      options.push(React.createElement('optgroup', {label: choice[0]}, optgroupOptions))
    }
    else {
      options.push(this.renderOption(selectedValuesLookup,
                                     choice[0],
                                     choice[1]))
    }
  }
  return options
}

Select.prototype.renderOption = function(selectedValuesLookup, optValue, optLabel) {
  optValue = ''+optValue
  var attrs = {value: optValue}
  if (typeof selectedValuesLookup[optValue] != 'undefined') {
    attrs['selected'] = 'selected'
    if (!this.allowMultipleSelected) {
      // Only allow for a single selection with this value
      delete selectedValuesLookup[optValue]
    }
  }
  return React.createElement('option', attrs, optLabel)
}

module.exports = Select