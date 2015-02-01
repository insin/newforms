'use strict';

var ChoiceFieldRenderer = require('./ChoiceFieldRenderer')
var RadioChoiceInput = require('../inputs/RadioChoiceInput')

var RadioFieldRenderer = ChoiceFieldRenderer.extend({
  constructor: function RadioFieldRenderer(name, value, attrs, controlled, choices) {
    if (!(this instanceof RadioFieldRenderer)) {
      return new RadioFieldRenderer(name, value, attrs, controlled, choices)
    }
    ChoiceFieldRenderer.apply(this, arguments)
  }
, choiceInputConstructor: RadioChoiceInput
})

module.exports = RadioFieldRenderer