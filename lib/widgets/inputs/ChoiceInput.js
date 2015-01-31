'use strict';

var object = require('isomorph/object')
var React = require('react')

var SubWidget = require('../SubWidget')
var Widget = require('../../Widget')

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
  return React.createElement('label', labelAttrs, this.tag(), ' ', this.choiceLabel)
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
  return React.createElement('input', finalAttrs)
}

ChoiceInput.prototype.idForLabel = function() {
  return object.get(this.attrs, 'id', '')
}

module.exports = ChoiceInput