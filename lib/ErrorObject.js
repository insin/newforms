'use strict';

var Concur = require('Concur')
var object = require('isomorph/object')
var React = require('react')

/**
 * A collection of field errors that knows how to display itself in various
 * formats. This object's .error properties are the field names and
 * corresponding values are the errors.
 * @constructor
 */
var ErrorObject = Concur.extend({
  constructor: function ErrorObject(errors) {
    if (!(this instanceof ErrorObject)) { return new ErrorObject(errors) }
    this.errors = errors || {}
  }
})

ErrorObject.prototype.set = function(field, error) {
  this.errors[field] = error
}

ErrorObject.prototype.get = function(field) {
  return this.errors[field]
}

ErrorObject.prototype.remove = function(fields) {
  return delete this.errors[fields]
}

ErrorObject.prototype.removeAll = function(fields) {
  for (var i = 0, l = fields.length; i < l; i++) {
    delete this.errors[fields[i]]
  }
}

ErrorObject.prototype.hasField = function(field) {
  return object.hasOwn(this.errors, field)
}

ErrorObject.prototype.length = function() {
  return Object.keys(this.errors).length
}

/**
 * Determines if any errors are present.
 */
ErrorObject.prototype.isPopulated = function() {
  return (this.length() > 0)
}

/**
 * Default display is as a list.
 */
ErrorObject.prototype.render = function() {
  return this.asUl()
}

/**
 * Displays error details as a list.
 */
ErrorObject.prototype.asUl = function() {
  var items = Object.keys(this.errors).map(function(field) {
    return React.DOM.li(null, field, this.errors[field].asUl())
  }.bind(this))
  if (items.length === 0) { return }
  return React.DOM.ul({className: 'errorlist'}, items)
}

/**
 * Displays error details as text.
 */
ErrorObject.prototype.asText = ErrorObject.prototype.toString = function() {
  return Object.keys(this.errors).map(function(field) {
    var mesages = this.errors[field].messages()
    return ['* ' + field].concat(mesages.map(function(message) {
      return ('  * ' + message)
    })).join('\n')
  }.bind(this)).join('\n')
}

ErrorObject.prototype.asData = function() {
  var data = {}
  Object.keys(this.errors).map(function(field) {
    data[field] = this.errors[field].asData()
  }.bind(this))
  return data
}

ErrorObject.prototype.toJSON = function() {
  var jsonObj = {}
  Object.keys(this.errors).map(function(field) {
    jsonObj[field] = this.errors[field].toJSON()
  }.bind(this))
  return jsonObj
}

module.exports = ErrorObject
