'use strict';

var object = require('isomorph/object')

var env = require('../env')
var Input = require('./Input')

/**
 * An HTML <input type="file"> widget.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var FileInput = Input.extend({
  constructor: function FileInput(kwargs) {
    if (!(this instanceof FileInput)) { return new FileInput(kwargs) }
    Input.call(this, kwargs)
  }
, inputType: 'file'
, needsMultipartForm: true
, validation: {onChange: true}
, isValueSettable: false
})

FileInput.prototype.render = function(name, value, kwargs) {
  return Input.prototype.render.call(this, name, null, kwargs)
}

/**
 * File widgets take data from file wrappers on the server. On the client, they
 * take it from data so the presence of a .value can be validated when required.
 */
FileInput.prototype.valueFromData = function(data, files, name) {
  return object.get(env.browser ? data : files, name, null)
}

module.exports = FileInput