'use strict';

var Concur = require('Concur')
var object = require('isomorph/object')
var React = require('react')
var validators = require('validators')

var ValidationError = validators.ValidationError

/**
 * A list of errors which knows how to display itself in various formats.
 * @param {Array=} list a list of errors.
 * @constructor
 */
var ErrorList = Concur.extend({
  constructor: function ErrorList(list) {
    if (!(this instanceof ErrorList)) { return new ErrorList(list) }
    this.data = list || []
  }
})

/**
 * @param {Array.<Object>} list
 * @return {ErrorList}
 */
ErrorList.fromJSON = function(list) {
  var result = new ErrorList()
  result.fromJSON(list)
  return result
}

/**
 * Adds more errors.
 * @param {Array} errorList a list of errors.
 */
ErrorList.prototype.extend = function(errorList) {
  this.data.push.apply(this.data, errorList)
}

/**
 * @return {number} the number of errors.
 */
ErrorList.prototype.length = function() {
  return this.data.length
}

/**
 * @return {boolean} true if any errors are present.
 */
ErrorList.prototype.isPopulated = function() {
  return (this.length() > 0)
}

/**
 * @return {string} the first message held in this ErrorList.
 */
ErrorList.prototype.first = function() {
  if (this.data.length > 0) {
    var error = this.data[0]
    if (error instanceof ValidationError) {
      error = error.messages()[0]
    }
    return error
  }
}

/**
 * @return {Array.<string>} the list of messages held in this ErrorList.
 */
ErrorList.prototype.messages = function() {
  var messages = []
  for (var i = 0, l = this.data.length; i < l; i++) {
    var error = this.data[i]
    if (error instanceof ValidationError) {
      error = error.messages()[0]
    }
    messages.push(error)
  }
  return messages
}

/**
 * Default display is as a list.
 * @return {ReactElement}
 */
ErrorList.prototype.render = function(kwargs) {
  return this.asUl(kwargs)
}

/**
 * Displays errors as a list.
 * @return {ReactElement}
 */
ErrorList.prototype.asUl = function(kwargs) {
  if (!this.isPopulated()) {
    return
  }
  kwargs = object.extend({className: 'errorlist'}, kwargs)
  return React.createElement('ul', {className: kwargs.className},
    this.messages().map(function(error) {
      return React.createElement('li', null, error)
    })
  )
}

/**
 * Displays errors as text.
 * @return {string}
 */
ErrorList.prototype.asText = ErrorList.prototype.toString =function() {
  return this.messages().map(function(error) {
    return '* ' + error
  }).join('\n')
}

/**
 * @return {Array}
 */
ErrorList.prototype.asData = function() {
  return this.data
}

/**
 * @return {Object}
 */
ErrorList.prototype.toJSON = function() {
  return new ValidationError(this.data).errorList.map(function(error) {
    return {
      message: error.messages()[0]
    , code: error.code || ''
    }
  })
}

/**
 * @param {Array.<Object>} list
 */
ErrorList.prototype.fromJSON = function(list) {
  this.data = list.map(function(err) {
    return new ValidationError(err.message, {code: err.code})
  })
}

module.exports = ErrorList
