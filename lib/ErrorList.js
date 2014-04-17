'use strict';

var Concur = require('Concur')
var validators = require('validators')
var React = require('react')

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
 * Adds more errors.
 * @param {Array} errorList a list of errors
 */
ErrorList.prototype.extend = function(errorList) {
  this.data.push.apply(this.data, errorList)
}

ErrorList.prototype.length = function() {
  return this.data.length
}

/**
 * Determines if any errors are present.
 */
ErrorList.prototype.isPopulated = function() {
  return (this.length() > 0)
}

/**
 * Returns the list of messages held in this ErrorList.
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
 *  Default display is as a list.
 */
ErrorList.prototype.render = function() {
  return this.asUl()
}

/**
 * Displays errors as a list.
 */
ErrorList.prototype.asUl = function() {
  if (!this.isPopulated()) {
    return
  }
  return React.DOM.ul({className: 'errorlist'}
  , this.messages().map(function(error) {
      return React.DOM.li(null, error)
    })
  )
}

/**
 * Displays errors as text.
 */
ErrorList.prototype.asText = ErrorList.prototype.toString =function() {
  return this.messages().map(function(error) {
    return '* ' + error
  }).join('\n')
}

ErrorList.prototype.asData = function() {
  return this.data
}

ErrorList.prototype.toJSON = function() {
  return new ValidationError(this.data).errorList.map(function(error) {
    return {
      message: error.messages()[0]
    , code: error.code || ''
    }
  })
}

module.exports = ErrorList
