/**
 * Asserts that a function call throws an error with a given error message.
 */
function errorEqual(func, message) {
  raises(func,
         function(e) { return e.message == message },
         'Error message is: "' + message.replace(/"/g, '\\"') + '"')
}

/**
 * Asserts that when a field's clean method is called with given arguments,
 * a  ValidationError is thrown containing the specified error message(s).
 * @param {Field} the field to be tested.
 * @param {{string|Array.<string>}} the error message or messages which should
 *     be contained in the resulting ValidationError.
 * @param {...*} var_args arguments for the call to the field's clean method.
 */
function cleanErrorEqual(field, message, var_args) {
  if (!(message instanceof Array)) {
    message = [message]
  }
  try {
    field.clean.apply(field, Array.prototype.slice.call(arguments, 2))
  }
  catch (e) {
    if (!(e instanceof forms.ValidationError)) {
      throw new Error('clean() did not throw a ValidationError:' + e)
    }
    deepEqual(e.messages, message)
    return
  }
  throw new Error('clean() did not throw an exception')
}

/**
 * Asserts that when a validator is called with the given value a
 * ValidationError is thrown containing the specified error message(s).
 * @param {{Object|function}} the validator to be tested.
 * @param {{string|Array.<string>}} the error message or messages which should
 *     be contained in the resulting ValidationError.
 * @param {*} value the value to be passed to the validator.
 */
function validationErrorEqual(validator, message, value) {
  if (!(message instanceof Array)) {
    message = [message]
  }
  try {
    forms.callValidator(validator, value)
  }
  catch (e) {
    if (!(e instanceof forms.ValidationError)) {
      throw new Error('Validator did not throw a ValidationError:' + e)
    }
    deepEqual(e.messages, message)
    return
  }
  throw new Error('Validator did not throw an exception')
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    errorEqual: errorEqual
  , cleanErrorEqual: cleanErrorEqual
  , validationErrorEqual: validationErrorEqual
  }
}
