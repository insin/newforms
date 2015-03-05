'use strict';

var FileField = require('./FileField')

/**
 * Validates that its input is a valid uploaded image.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var ImageField = FileField.extend({
  defaultErrorMessages: {
    invalidImage: 'Upload a valid image. The file you uploaded was either not an image or a corrupted image.'
  }

, constructor: function ImageField(kwargs) {
    if (!(this instanceof ImageField)) { return new ImageField(kwargs) }
    FileField.call(this, kwargs)
  }
})

/**
 * Checks that the file-upload field data contains a valid image.
 */
ImageField.prototype.toJavaScript = function(data, initial) {
  var f = FileField.prototype.toJavaScript.call(this, data, initial)
  if (f === null) {
    return null
  }

  // TODO Plug in image processing code when running on the server

  return f
}

ImageField.prototype.getWidgetAttrs = function(widget) {
  var attrs = FileField.prototype.getWidgetAttrs.call(this, widget)
  attrs.accept = 'image/*'
  return attrs
}


module.exports = ImageField