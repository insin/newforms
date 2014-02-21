'use strict';

var Concur = require('Concur')
  , is = require('isomorph/is')
  , object = require('isomorph/object')
  , validators = require('validators')

var ValidationError = validators.ValidationError

var DEFAULT_DATE_INPUT_FORMATS = [
  '%Y-%m-%d'              // '2006-10-25'
, '%m/%d/%Y', '%m/%d/%y'  // '10/25/2006', '10/25/06'
, '%b %d %Y', '%b %d, %Y' // 'Oct 25 2006', 'Oct 25, 2006'
, '%d %b %Y', '%d %b, %Y' // '25 Oct 2006', '25 Oct, 2006'
, '%B %d %Y', '%B %d, %Y' // 'October 25 2006', 'October 25, 2006'
, '%d %B %Y', '%d %B, %Y' // '25 October 2006', '25 October, 2006'
]

var DEFAULT_TIME_INPUT_FORMATS = [
  '%H:%M:%S' // '14:30:59'
, '%H:%M'    // '14:30'
]

var DEFAULT_DATETIME_INPUT_FORMATS = [
  '%Y-%m-%d %H:%M:%S' // '2006-10-25 14:30:59'
, '%Y-%m-%d %H:%M'    // '2006-10-25 14:30'
, '%Y-%m-%d'          // '2006-10-25'
, '%m/%d/%Y %H:%M:%S' // '10/25/2006 14:30:59'
, '%m/%d/%Y %H:%M'    // '10/25/2006 14:30'
, '%m/%d/%Y'          // '10/25/2006'
, '%m/%d/%y %H:%M:%S' // '10/25/06 14:30:59'
, '%m/%d/%y %H:%M'    // '10/25/06 14:30'
, '%m/%d/%y'          // '10/25/06'
]

/**
 * Allows an Array, an object with an __iter__ method or a function which
 * returns one be used when ultimately expecting an Array.
 */
function iterate(o) {
  if (is.Array(o)) {
    return o
  }
  if (is.Function(o)) {
    o = o()
  }
  if (o != null && is.Function(o.__iter__)) {
    o = o.__iter__()
  }
  return o || []
}

// TODO Export to isomorph
/**
 * Deletes and returns an own property from an object, optionally returning a
 * default value if the object didn't have theproperty.
 * @throws if given an object which is null (or undefined), or if the property
 *   doesn't exist and there was no defaultValue given.
 */
function popProp(obj, prop, defaultValue) {
  if (obj == null) {
    throw new Error('popProp was given ' + obj)
  }
  if (object.hasOwn(obj, prop)) {
    var value = obj[prop]
    delete obj[prop]
    return value
  }
  else if (arguments.length == 2) {
    throw new Error("popProp was given an object which didn't have an own '" +
                    prop + "' property, without a default value to return")
  }
  return defaultValue
}

// TODO Export to isomorph
/**
 * If the prop is in the object, return its value. If not, set the prop to
 * defaultValue and return defaultValue.
 */
function setDefault(obj, prop, defaultValue) {
  if (obj == null) {
    throw new Error('setDefault was given ' + obj)
  }
  defaultValue = defaultValue || null
  if (object.hasOwn(obj, prop)) {
    return obj[prop]
  }
  else {
    obj[prop] = defaultValue
    return defaultValue
  }
}

/**
 * Converts 'firstName' and 'first_name' to 'First name', and
 * 'SHOUTING_LIKE_THIS' to 'SHOUTING LIKE THIS'.
 */
var prettyName = (function() {
  var capsRE = /([A-Z]+)/g
    , splitRE = /[ _]+/
    , allCapsRE = /^[A-Z][A-Z0-9]+$/

  return function(name) {
    // Prefix sequences of caps with spaces and split on all space
    // characters.
    var parts = name.replace(capsRE, ' $1').split(splitRE)

    // If we had an initial cap...
    if (parts[0] === '') {
      parts.splice(0, 1)
    }

    // Give the first word an initial cap and all subsequent words an
    // initial lowercase if not all caps.
    for (var i = 0, l = parts.length; i < l; i++) {
      if (i === 0) {
        parts[0] = parts[0].charAt(0).toUpperCase() +
                   parts[0].substr(1)
      }
      else if (!allCapsRE.test(parts[i])) {
        parts[i] = parts[i].charAt(0).toLowerCase() +
                   parts[i].substr(1)
      }
    }

    return parts.join(' ')
  }
})()

/**
 * Creates an object representing the data held in a form.
 * @param {HTMLFormElement|String} form a form DOM node or a String specifying a
 *   form's name< or idattribute. If a String<is given, name is tried before id
 *   when attempting to find the form in the DOM.
 * @return an object representing the data present in the form. If the form
 *   could not be found, this object will be empty.
 */
function formData(form) {
  var data = {}
  if (is.String(form)) {
    form = document.forms[form] || document.getElementById(form)
  }
  if (!form) {
    return data
  }

  for (var i = 0, l = form.elements.length; i < l; i++) {
    var element = form.elements[i]
      , type = element.type
      , value = null

    // Retrieve the element's value (or values)
    if (type == 'hidden' || type == 'password' || type == 'text' ||
        type == 'email' || type == 'url' || type == 'number' ||
        type == 'textarea' || ((type == 'checkbox' ||
                                type == 'radio') && element.checked)) {
      value = element.value
    }
    else if (type == 'select-one') {
      value = element.options[element.selectedIndex].value
    }
    else if (type == 'select-multiple') {
      value = []
      for (var j = 0, m = element.options.length; j < m; j++) {
        if (element.options[j].selected) {
          value[value.length] = element.options[j].value
        }
      }
      if (value.length === 0) {
        value = null
      }
    }

    // Add any value obtained to the data object
    if (value !== null) {
      if (object.hasOwn(data, element.name)) {
        if (is.Array(data[element.name])) {
          data[element.name] = data[element.name].concat(value)
        }
        else {
          data[element.name] = [data[element.name], value]
        }
      }
      else {
        data[element.name] = value
      }
    }
  }

  return data
}

/**
 * Coerces to string and strips leading and trailing spaces.
 */
function strip(s) {
  return (''+s).replace(/(^\s+|\s+$)/g, '')
}

/**
 * A collection of errors that knows how to display itself in various formats.
 *
 * This object's properties are the field names, and corresponding values are
 * the errors.
 *
 * @constructor
 */
var ErrorObject = Concur.extend({
  constructor: function(errors) {
    if (!(this instanceof ErrorObject)) { return new ErrorObject(errors) }
    this.errors = errors || {}
  }
})

ErrorObject.prototype.set = function(name, error) {
  this.errors[name] = error
}

ErrorObject.prototype.get = function(name) {
  return this.errors[name]
}

ErrorObject.prototype.hasField = function(name) {
  return object.hasOwn(this.errors, name)
}

ErrorObject.prototype.render = function() {
  return this.asUL()
}

/**
 * Determines if any errors are present.
 *
 * @return {Boolean} <code>true</code> if this object has had any properties
 *                   set, <code>false</code> otherwise.
 */
ErrorObject.prototype.isPopulated = function() {
  for (var name in this.errors) {
    if (object.hasOwn(this.errors, name)) {
      return true
    }
  }
  return false
}

/**
 * Displays error details as a list.
 */
ErrorObject.prototype.asUL = function() {
  var items = []
  for (var name in this.errors) {
    if (object.hasOwn(this.errors, name)) {
      items.push(React.DOM.li(null, name, this.errors[name].asUL()))
    }
  }
  if (!items.length) {
    return ''
  }
  return React.DOM.ul({className: 'errorlist'}, items)
}

/**
 * Displays error details as text.
 */
ErrorObject.prototype.asText = function() {
  var items = []
  for (var name in this.errors) {
    if (!object.hasOwn(this.errors, name)) { continue }
    items.push('* ' + name)
    var messages = this.errors[name].messages()
    for (var i = 0, l = messages.length; i < l; i++) {
      items.push('  * ' + messages[i])
    }
  }
  return items.join('\n')
}

ErrorObject.prototype.length = function() {
  return Object.keys(this.errors).length
}

/**
 * A list of errors which knows how to display itself in various formats.
 * @param {Array} [list] a list of errors.
 * @constructor
 */
var ErrorList = Concur.extend({
  constructor: function(list) {
    if (!(this instanceof ErrorList)) { return new ErrorList(list) }
    this.data = list || []
  }
})

ErrorList.prototype.render = function() {
  return this.asUL()
}

/**
 * Adds more errors.
 * @param {Array} errorList a list of errors
 */
ErrorList.prototype.extend = function(errorList) {
  this.data.push.apply(this.data, errorList)
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
 * Displays errors as a list.
 */
ErrorList.prototype.asUL = function() {
  return React.DOM.ul({className: 'errorlist'}
  , this.messages().map(function(error) {
      return React.DOM.li(null, error)
    })
  )
}

/**
 * Displays errors as text.
 */
ErrorList.prototype.asText = function() {
  return this.messages().map(function(error) {
    return '* ' + error
  }).join('\n')
}

/**
 * Determines if any errors are present.
 *
 * @return {Boolean} <code>true</code> if this object contains any errors
 *                   <code>false</code> otherwise.
 */
ErrorList.prototype.isPopulated = function() {
  return this.data.length > 0
}

ErrorList.prototype.length = function() {
  return this.data.length()
}

module.exports = {
  DEFAULT_DATE_INPUT_FORMATS: DEFAULT_DATE_INPUT_FORMATS
, DEFAULT_TIME_INPUT_FORMATS: DEFAULT_TIME_INPUT_FORMATS
, DEFAULT_DATETIME_INPUT_FORMATS: DEFAULT_DATETIME_INPUT_FORMATS
, ErrorObject: ErrorObject
, ErrorList: ErrorList
, formData: formData
, iterate: iterate
, popProp: popProp
, setDefault: setDefault
, prettyName: prettyName
, strip: strip
}
