'use strict';

var object = require('isomorph/object')

var Input = require('./Input')

var env =require('../env')

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
 * On the client, files will be populated with File objects from the input's
 * FileList when supported, otherwise its value will be in data as a fallback.
 */
FileInput.prototype.valueFromData = function(data, files, name) {
  var dataSource = files
  if (env.browser && !(name in files)) {
    dataSource = data
  }
  return object.get(dataSource, name, null)
}

module.exports = FileInput