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
 */
var ErrorObject = Concur.extend({
  constructor: function ErrorObject() {
    if (!(this instanceof ErrorObject)) { return new ErrorObject() }
    this.errors = {}
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
 * Sets a field's errors.
 * @param {string} fieldName
 * @param {ErrorList} errors
 */
ErrorObject.prototype.set = function(fieldName, errors) {
  this.errors[fieldName] = errors
}

/**
 * Gets a field's errors.
 * @param {string} fieldName
 * @return {ErrorList}
 */
ErrorObject.prototype.get = function(fieldName) {
  return this.errors[fieldName]
}

/**
 * Removes errors for a field.
 * @param {string} fieldName
 * @return {boolean} true if there were errors for the field.
 */
ErrorObject.prototype.remove = function(fieldName) {
  return delete this.errors[fieldName]
}

/**
 * Removes errors for multiple fields.
 * @param {Array.<string>} fieldNames
 */
ErrorObject.prototype.removeAll = function(fieldNames) {
  for (var i = 0, l = fieldNames.length; i < l; i++) {
    delete this.errors[fieldNames[i]]
  }
}

/**
 * @return {boolean} true if the field has errors.
 */
ErrorObject.prototype.hasField = function(fieldName) {
  return object.hasOwn(this.errors, fieldName)
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
ErrorObject.prototype.render = function(kwargs) {
  return this.asUl(kwargs)
}

/**
 * Displays error details as a list.
 * @return {ReactElement}
 */
ErrorObject.prototype.asUl = function(kwargs) {
  kwargs = object.extend({className: 'errorlist'}, kwargs)
  var items = Object.keys(this.errors).map(function(fieldName) {
    return React.createElement('li', null, fieldName, this.errors[fieldName].asUl())
  }.bind(this))
  if (items.length === 0) { return }
  return React.createElement('ul', {className: kwargs.className}, items)
}

/**
 * Displays error details as text.
 * @return {string}
 */
ErrorObject.prototype.asText = ErrorObject.prototype.toString = function() {
  return Object.keys(this.errors).map(function(fieldName) {
    var messages = this.errors[fieldName].messages()
    return ['* ' + fieldName].concat(messages.map(function(message) {
      return ('  * ' + message)
    })).join('\n')
  }.bind(this)).join('\n')
}

/**
 * @return {Object}
 */
ErrorObject.prototype.asData = function() {
  var data = {}
  Object.keys(this.errors).map(function(fieldName) {
    data[fieldName] = this.errors[fieldName].asData()
  }.bind(this))
  return data
}

/**
 * @return {Object}
 */
ErrorObject.prototype.toJSON = function() {
  var jsonObj = {}
  Object.keys(this.errors).map(function(fieldName) {
    jsonObj[fieldName] = this.errors[fieldName].toJSON()
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
