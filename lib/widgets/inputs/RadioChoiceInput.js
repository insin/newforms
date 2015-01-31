'use strict';

var ChoiceInput = require('./ChoiceInput')

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

module.exports = RadioChoiceInput