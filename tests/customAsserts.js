/**
 * Asserts that a function call throws an error with a given error message.
 */
function errorEqual(func, message) {
  raises(func,
         function(e) { return e.message == message; },
         'Error message is: "' + message.replace(/"/g, '\\"') + '"');
}
/**
 * Asserts that when a field's clean method is called with given arguments,
 * a {@code ValidationError} is thrown containing the specified error message(s).
 * @param {Field} the field to be tested.
 * @param {{string|Array.<string>}} the error message or messages which should
 *     be contained in the resulting {@code ValidationError}.
 * @param {...*} var_args arguments for the call to the field's clean method.
 */
function cleanErrorEqual(field, message, var_args) {
  if (!forms.util.isArray(message)) {
      message = [message];
  }
  try {
    field.clean.apply(field, Array.prototype.slice.call(arguments, 2));
  }
  catch (e) {
    if (!(e instanceof forms.ValidationError)) {
      throw new Error("Method did not throw a ValidationError:" + e);
    }
    deepEqual(e.messages, message);
    return;
  }
  throw new Error("Method did not throw an exception");
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      errorEqual: errorEqual,
      cleanErrorEqual: cleanErrorEqual
    };
}