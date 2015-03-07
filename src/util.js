'use strict';

var getFormData = require('get-form-data')

var is = require('isomorph/is')
var object = require('isomorph/object')

/**
 * Replaces String {placeholders} with properties of a given object, but
 * interpolates into and returns an Array instead of a String.
 * By default, any resulting empty strings are stripped out of the Array. To
 * disable this, pass an options object with a 'strip' property which is false.
 */
function formatToArray(str, obj, options) {
  var parts = str.split(/\{(\w+)\}/g)
  for (var i = 1, l = parts.length; i < l; i += 2) {
    parts[i] = (object.hasOwn(obj, parts[i])
                ? obj[parts[i]]
                : '{' + parts[i] + '}')
  }
  if (!options || (options && options.strip !== false)) {
    parts = parts.filter(function(p) { return p !== ''})
  }
  return parts
}

/**
 * Get named properties from an object.
 * @param src {Object}
 * @param props {Array.<string>}
 * @return {Object}
 */
function getProps(src, props) {
  var result = {}
  for (var i = 0, l = props.length; i < l ; i++) {
    var prop = props[i]
    if (object.hasOwn(src, prop)) {
      result[prop] = src[prop]
    }
  }
  return result
}

/**
 * Get a named property from an object, calling it and returning its result if
 * it's a function.
 */
function maybeCall(obj, prop) {
  var value = obj[prop]
  if (is.Function(value)) {
    value = value.call(obj)
  }
  return value
}

/**
 * Creates a list of choice pairs from a list of objects using the given named
 * properties for the value and label.
 */
function makeChoices(list, valueProp, labelProp) {
  return list.map(function(item) {
    return [maybeCall(item, valueProp), maybeCall(item, labelProp)]
  })
}

/**
 * Validates choice input and normalises lazy, non-Array choices to be
 * [value, label] pairs
 * @return {Array} a normalised version of the given choices.
 * @throws if an Array with length != 2 was found where a choice pair was expected.
 */
function normaliseChoices(choices) {
  if (!choices.length) { return choices }

  var normalisedChoices = []
  for (var i = 0, l = choices.length, choice; i < l; i++) {
    choice = choices[i]
    if (!is.Array(choice)) {
      // TODO In the development build, emit a warning about a choice being
      //      automatically converted from 'blah' to ['blah', 'blah'] in case it
      //      wasn't intentional
      choice = [choice, choice]
    }
    if (choice.length != 2) {
      throw new Error('Choices in a choice list must contain exactly 2 values, ' +
                      'but got ' + JSON.stringify(choice))
    }
    if (is.Array(choice[1])) {
      var normalisedOptgroupChoices = []
      // This is an optgroup, so look inside the group for options
      var optgroupChoices = choice[1]
      for (var j = 0, m = optgroupChoices.length, optgroupChoice; j < m; j++) {
        optgroupChoice = optgroupChoices[j]
        if (!is.Array(optgroupChoice)) {
          optgroupChoice = [optgroupChoice, optgroupChoice]
        }
        if (optgroupChoice.length != 2) {
          throw new Error('Choices in an optgroup choice list must contain ' +
                          'exactly 2 values, but got ' +
                          JSON.stringify(optgroupChoice))
        }
        normalisedOptgroupChoices.push(optgroupChoice)
      }
      normalisedChoices.push([choice[0], normalisedOptgroupChoices])
    }
    else {
      normalisedChoices.push(choice)
    }
  }
  return normalisedChoices
}

/**
 * @param {Array.<string>} events
 */
function normaliseValidationEvents(events) {
  events = events.map(function(event) {
    if (event.indexOf('on') === 0) { return event }
    return 'on' + event.charAt(0).toUpperCase() + event.substr(1)
  })
  var onChangeIndex = events.indexOf('onChange')
  if (onChangeIndex != -1) {
    events.splice(onChangeIndex, 1)
  }
  return {events: events, onChange: (onChangeIndex != -1)}
}

/**
 * @param {string} events
 */
function normaliseValidationString(events) {
  return normaliseValidationEvents(strip(events).split(/ +/g))
}

/**
 * @param {(string|Object)} validation
 */
function normaliseValidation(validation) {
  if (!validation || validation === 'manual') {
    return validation
  }
  else if (validation === 'auto') {
    return {events: ['onBlur'], onChange: true, onChangeDelay: 369}
  }
  else if (is.String(validation)) {
    return normaliseValidationString(validation)
  }
  else if (is.Object(validation)) {
    var normalised
    if (is.String(validation.on)) {
      normalised = normaliseValidationString(validation.on)
    }
    else if (is.Array(validation.on)) {
      normalised = normaliseValidationEvents(validation.on)
    }
    else {
      throw new Error("Validation config Objects must have an 'on' String or Array")
    }
    normalised.onChangeDelay = object.get(validation, 'onChangeDelay', validation.delay)
    return normalised
  }
  throw new Error('Unexpected validation config: ' + validation)
}

/**
 * Converts 'firstName' and 'first_name' to 'First name', and
 * 'SHOUTING_LIKE_THIS' to 'SHOUTING LIKE THIS'.
 */
var prettyName = (function() {
  var capsRE = /([A-Z]+)/g
  var splitRE = /[ _]+/
  var allCapsRE = /^[A-Z][A-Z0-9]+$/

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
 * Coerces to string and strips leading and trailing spaces.
 */
var strip = function() {
  var stripRE =/(^\s+|\s+$)/g
  return function strip(s) {
    return (''+s).replace(stripRE, '')
  }
}()

/**
 * From Underscore.js 1.5.2
 * http://underscorejs.org
 * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 *
 * Modified to give the returned function:
 * - a .cancel() method which prevents the debounced function being called.
 * - a .trigger() method which calls the debounced function immediately.
 */
function debounce(func, wait, immediate) {
  var timeout, args, context, timestamp, result
  var debounced = function() {
    context = this
    args = arguments
    timestamp = new Date()
    var later = function() {
      var last = (new Date()) - timestamp
      if (last < wait) {
        timeout = setTimeout(later, wait - last)
      } else {
        timeout = null
        if (!immediate) { result = func.apply(context, args) }
      }
    };
    var callNow = immediate && !timeout
    if (!timeout) {
      timeout = setTimeout(later, wait)
    }
    if (callNow) { result = func.apply(context, args) }
    return result
  }

  // Clear any pending timeout
  debounced.cancel = function() {
    if (timeout) {
      clearTimeout(timeout)
    }
  }

  // Clear any pending timeout and execute the function immediately
  debounced.trigger = function() {
    debounced.cancel()
    return func.apply(context, args)
  }

  return debounced
}

/**
 * Returns a function with a .cancel() function which can be used to prevent the
 * given function from being called. If the given function has an onCancel(),
 * it will be called when it's being cancelled.
 *
 * Use case: triggering an asynchronous function with new data while an existing
 * function for the same task but with old data is still pending a callback, so
 * the callback only gets called for the last one to run.
 */
function cancellable(func) {
  var cancelled = false

  var cancellabled = function() {
    if (!cancelled) {
      func.apply(null, arguments)
    }
  }

  cancellabled.cancel = function() {
    cancelled = true
    if (is.Function(func.onCancel)) {
      func.onCancel()
    }
  }

  return cancellabled
}

/**
 * Wrapper for getFormData which allows you to pass a React form ref.
 * @param {HTMLFormElement|ReactElement} form a form element.
 * @return {Object.<string,(string|Array.<string>)>} an object containing the
 *    submittable value(s) held in each of the form's elements.
 */
function getMaybeReactFormData(form) {
  if (typeof form.getDOMNode == 'function') {
    form = form.getDOMNode()
  }
  return getFormData(form)
}

/**
 * Extracts data from a <form> and validates it with a list of forms and/or
 * formsets.
 * @param form the <form> into which any given forms and formsets have been
 *   rendered - this can be a React <form> component or a real <form> DOM node.
 * @param {Array.<(Form|FormSet)>} formsAndFormsets a list of forms and/or
 *   formsets to be used to validate the <form>'s input data.
 * @return {boolean} true if the <form>'s input data are valid according to all
 *   given forms and formsets.
 */
function validateAll(form, formsAndFormsets) {
  var data = getMaybeReactFormData(form)
  var isValid = true
  for (var i = 0, l = formsAndFormsets.length; i < l; i++) {
    if (!formsAndFormsets[i].setFormData(data)) {
      isValid = false
    }
  }
  return isValid
}

/**
 * Returns true if every form/formset is valid.
 */
function allValid(formsOrFormsets) {
  var valid = true
  for (var i = 0, l = formsOrFormsets.length; i < l; i++) {
    if (!formsOrFormsets[i].isValid()) {
      valid = false
    }
  }
  return valid
}

var info = function() {}
var warning = function() {}

if ('production' !== process.env.NODE_ENV) {
  info = function(message) {
    console.warn('[newforms] ' + message)
  }
  warning = function(message) {
    console.warn('[newforms] Warning: ' + message)
  }
}

function autoIdChecker(props, propName, componentName, location) {
  var autoId = props.autoId
  if (props.autoId && !(is.String(autoId) && autoId.indexOf('{name}') != -1)) {
    return new Error(
      'Invalid `autoId` ' + location + ' supplied to ' +
      '`' + componentName + '`. Must be falsy or a String containing a ' +
      '`{name}` placeholder'
    )
  }
}

module.exports = {
  allValid: allValid
, autoIdChecker: autoIdChecker
, cancellable: cancellable
, debounce: debounce
, info: info
, formatToArray: formatToArray
, getFormData: getMaybeReactFormData
, getProps: getProps
, makeChoices: makeChoices
, normaliseChoices: normaliseChoices
, normaliseValidation: normaliseValidation
, prettyName: prettyName
, strip: strip
, validateAll: validateAll
, warning: warning
}
