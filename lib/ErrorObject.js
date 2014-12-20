'use strict';

var Concur = require('Concur')
var object = require('isomorph/object')
var React = require('react')

var ErrorList = require('./ErrorList')

/**
 * A collection of field errors that knows how to display itself in various
 * formats. This object's .error properties are the field names and
 * corresponding values are the errors.
 * @constructor
 * @param {Object} errors
 */
var ErrorObject = Concur.extend({
  constructor: function ErrorObject(errors) {
    if (!(this instanceof ErrorObject)) { return new ErrorObject(errors) }
    this.errors = errors || {}
  }
})

/**
 * @param {Object} jsonObj
 * @param {function=} errorConstructor
 * @return {ErrorObject}
 */
ErrorObject.fromJSON = function(jsonObj, errorConstructor) {
  var result = new ErrorObject()
  result.fromJSON(jsonObj, errorConstructor)
  return result
}

/**
 * @param {string} field
 * @param {ErrorList} error
 */
ErrorObject.prototype.set = function(field, error) {
  this.errors[field] = error
}

/**
 * @param {string} field
 * @return {ErrorList}
 */
ErrorObject.prototype.get = function(field) {
  return this.errors[field]
}

/**
 * @param {string} field
 * @return {boolean} true if there were errors for the given field.
 */
ErrorObject.prototype.remove = function(field) {
  return delete this.errors[field]
}

/**
 * @param {Array.<string>} fields
 */
ErrorObject.prototype.removeAll = function(fields) {
  for (var i = 0, l = fields.length; i < l; i++) {
    delete this.errors[fields[i]]
  }
}

/**
 * @return {boolean} true if the field has errors.
 */
ErrorObject.prototype.hasField = function(field) {
  return object.hasOwn(this.errors, field)
}

/**
 * @return {number}
 */
ErrorObject.prototype.length = function() {
  return Object.keys(this.errors).length
}

/**
 * @return {boolean} true if any errors are present.
 */
ErrorObject.prototype.isPopulated = function() {
  return (this.length() > 0)
}

/**
 * Default display is as a list.
 * @return {ReactElement}
 */
ErrorObject.prototype.render = function() {
  return this.asUl()
}

/**
 * Displays error details as a list.
 * @return {ReactElement}
 */
ErrorObject.prototype.asUl = function() {
  var items = Object.keys(this.errors).map(function(field) {
    return React.createElement('li', null, field, this.errors[field].asUl())
  }.bind(this))
  if (items.length === 0) { return }
  return React.createElement('ul', {className: 'errorlist'}, items)
}

/**
 * Displays error details as text.
 * @return {string}
 */
ErrorObject.prototype.asText = ErrorObject.prototype.toString = function() {
  return Object.keys(this.errors).map(function(field) {
    var messages = this.errors[field].messages()
    return ['* ' + field].concat(messages.map(function(message) {
      return ('  * ' + message)
    })).join('\n')
  }.bind(this)).join('\n')
}

/**
 * @return {Object}
 */
ErrorObject.prototype.asData = function() {
  var data = {}
  Object.keys(this.errors).map(function(field) {
    data[field] = this.errors[field].asData()
  }.bind(this))
  return data
}

/**
 * @return {Object}
 */
ErrorObject.prototype.toJSON = function() {
  var jsonObj = {}
  Object.keys(this.errors).map(function(field) {
    jsonObj[field] = this.errors[field].toJSON()
  }.bind(this))
  return jsonObj
}

/**
 * @param {Object} jsonObj
 * @param {function=} errorConstructor
 */
ErrorObject.prototype.fromJSON = function(jsonObj, errorConstructor) {
  errorConstructor = errorConstructor || ErrorList
  this.errors = {}
  var fieldNames = Object.keys(jsonObj)
  for (var i = 0, l = fieldNames.length; i < l ; i++) {
    var fieldName = fieldNames[i]
    this.errors[fieldName] = errorConstructor.fromJSON(jsonObj[fieldName])
  }
}

module.exports = ErrorObject
