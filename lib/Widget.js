'use strict';

var Concur = require('Concur')
var object = require('isomorph/object')
var SubWidget = require('./widgets/SubWidget')

/**
 * An HTML form widget.
 * @constructor
 * @param {Object=} kwargs
 */
var Widget = Concur.extend({
  constructor: function Widget(kwargs) {
    kwargs = object.extend({attrs: null}, kwargs)
    this.attrs = object.extend({}, kwargs.attrs)
  }
  /** Determines whether this corresponds to an <input type="hidden">. */
, isHidden: false
  /** Determines whether this widget needs a multipart-encoded form. */
, needsMultipartForm: false
  /** Determines whether this widget is for a required field. */
, isRequired: false
  /** Override for active validation config a particular widget needs to use. */
, validation: null
  /** Determines whether this widget's render logic always needs to use the initial value. */
, needsInitialValue: false
  /** Determines whether this widget's value can be set. */
, isValueSettable: true
})

/**
 * Yields all "subwidgets" of this widget. Used only by RadioSelect to
 * allow access to individual <input type="radio"> buttons.
 * Arguments are the same as for render().
 * @return {Array.<SubWidget>}
 */
Widget.prototype.subWidgets = function(name, value, kwargs) {
  return [SubWidget(this, name, value, kwargs)]
}

/**
 * Returns this Widget rendered as HTML.
 * The value given is not guaranteed to be valid input, so subclass
 * implementations should program defensively.
 * @abstract
 */
Widget.prototype.render = function(name, value, kwargs) {
  throw new Error('Constructors extending Widget must implement a render() method.')
}

/**
 * Helper function for building an HTML attributes object.
 */
Widget.prototype.buildAttrs = function(kwargAttrs, renderAttrs) {
  return object.extend({}, this.attrs, renderAttrs, kwargAttrs)
}

/**
 * Retrieves a value for this widget from the given data.
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {string} name the field name to be used to retrieve data.
 * @return a value for this widget, or null if no value was provided.
 */
Widget.prototype.valueFromData = function(data, files, name) {
  return object.get(data, name, null)
}

/**
 * Determines the HTML id attribute of this Widget for use by a
 * <label>, given the id of the field.
 * This hook is necessary because some widgets have multiple HTML elements and,
 * thus, multiple ids. In that case, this method should return an ID value that
 * corresponds to the first id in the widget's tags.
 * @param {string} id a field id.
 * @return {string} the id which should be used by a <label> for this Widget.
 */
Widget.prototype.idForLabel = function(id) {
  return id
}

module.exports = Widget