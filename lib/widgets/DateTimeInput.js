'use strict';

var DateTimeBaseInput = require('./DateTimeBaseInput')

/**
 * @constructor
 * @extends {DateTimeBaseInput}
 * @param {Object=} kwargs
 */
var DateTimeInput = DateTimeBaseInput.extend({
  formatType: 'DATETIME_INPUT_FORMATS'
, constructor: function DateTimeInput(kwargs) {
    if (!(this instanceof DateTimeInput)) { return new DateTimeInput(kwargs) }
    DateTimeBaseInput.call(this, kwargs)
  }
})

module.exports = DateTimeInput