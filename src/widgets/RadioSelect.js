'use strict';

var RadioFieldRenderer = require('./renderers/RadioFieldRenderer')
var RendererMixin = require('./renderers/RendererMixin')
var Select = require('./Select')

/**
 * Renders a single select as a list of <input type="radio"> elements.
 * @constructor
 * @extends {Select}
 * @param {Object=} kwargs
 */
var RadioSelect = Select.extend({
  __mixins__: [RendererMixin]
, constructor: function(kwargs) {
    if (!(this instanceof RadioSelect)) { return new RadioSelect(kwargs) }
    RendererMixin.call(this, kwargs)
    Select.call(this, kwargs)
  }
, renderer: RadioFieldRenderer
, _emptyValue: ''
})

module.exports = RadioSelect