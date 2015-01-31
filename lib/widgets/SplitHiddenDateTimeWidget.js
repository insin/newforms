'use strict';

var SplitDateTimeWidget = require('./SplitDateTimeWidget')

/**
 * Splits Date input into two <input type="hidden"> elements.
 * @constructor
 * @extends {SplitDateTimeWidget}
 * @param {Object=} kwargs
 */
var SplitHiddenDateTimeWidget = SplitDateTimeWidget.extend({
  constructor: function SplitHiddenDateTimeWidget(kwargs) {
    if (!(this instanceof SplitHiddenDateTimeWidget)) { return new SplitHiddenDateTimeWidget(kwargs) }
    SplitDateTimeWidget.call(this, kwargs)
    for (var i = 0, l = this.widgets.length; i < l; i++) {
      this.widgets[i].inputType = 'hidden'
      this.widgets[i].isHidden = true
    }
  }
, isHidden: true
})

module.exports = SplitHiddenDateTimeWidget