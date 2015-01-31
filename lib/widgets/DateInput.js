'use strict';

var DateTimeBaseInput = require('./DateTimeBaseInput')

/**
 * @constructor
 * @extends {DateTimeBaseInput}
 * @param {Object=} kwargs
 */
var DateInput = DateTimeBaseInput.extend({
  formatType: 'DATE_INPUT_FORMATS'
, constructor: function DateInput(kwargs) {
    if (!(this instanceof DateInput)) { return new DateInput(kwargs) }
    DateTimeBaseInput.call(this, kwargs)
  }
})

module.exports = DateInput