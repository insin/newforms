'use strict';

var DateTimeBaseInput = require('./DateTimeBaseInput')

/**
 * @constructor
 * @extends {DateTimeBaseInput}
 * @param {Object=} kwargs
 */
var TimeInput = DateTimeBaseInput.extend({
  formatType: 'TIME_INPUT_FORMATS'
, constructor: function TimeInput(kwargs) {
    if (!(this instanceof TimeInput)) { return new TimeInput(kwargs) }
    DateTimeBaseInput.call(this, kwargs)
  }
})

module.exports = TimeInput