'use strict';

var CheckboxFieldRenderer = require('./renderers/CheckboxFieldRenderer')
var RendererMixin = require('./renderers/RendererMixin')
var SelectMultiple = require('./SelectMultiple')

/**
 * Multiple selections represented as a list of <input type="checkbox"> widgets.
 * @constructor
 * @extends {SelectMultiple}
 * @param {Object=} kwargs
 */
var CheckboxSelectMultiple = SelectMultiple.extend({
  __mixins__: [RendererMixin]
, constructor: function(kwargs) {
    if (!(this instanceof CheckboxSelectMultiple)) { return new CheckboxSelectMultiple(kwargs) }
    RendererMixin.call(this, kwargs)
    SelectMultiple.call(this, kwargs)
  }
, renderer: CheckboxFieldRenderer
, _emptyValue: []
})

module.exports = CheckboxSelectMultiple