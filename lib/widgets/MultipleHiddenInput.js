'use strict';

var object = require('isomorph/object')
var React = require('react')

var HiddenInput = require('./HiddenInput')

/**
 * A widget that handles <input type="hidden"> for fields that have a list of
 * values.
 * @constructor
 * @extends {HiddenInput}
 * @param {Object=} kwargs
 */
var MultipleHiddenInput = HiddenInput.extend({
  constructor: function MultipleHiddenInput(kwargs) {
    if (!(this instanceof MultipleHiddenInput)) { return new MultipleHiddenInput(kwargs) }
    HiddenInput.call(this, kwargs)
  }
})

MultipleHiddenInput.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  if (value === null) {
    value = []
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: this.inputType,
                                                  name: name})
  var id = object.get(finalAttrs, 'id', null)
  var key = object.get(finalAttrs, 'key', null)
  var inputs = []
  for (var i = 0, l = value.length; i < l; i++) {
    var inputAttrs = object.extend({}, finalAttrs, {value: value[i]})
    // Add numeric index suffixes to attributes which should be unique
    if (id) {
      inputAttrs.id = id + '_' + i
    }
    if (key) {
      inputAttrs.key = id + '_' + i
    }
    inputs.push(React.createElement('input', inputAttrs))
  }
  return React.createElement('div', null, inputs)
}

MultipleHiddenInput.prototype.valueFromData = function(data, files, name) {
  if (typeof data[name] != 'undefined') {
    return [].concat(data[name])
  }
  return null
}

module.exports = MultipleHiddenInput