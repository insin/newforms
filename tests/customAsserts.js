/**
 * Asserts that a function call throws an error with a given error message.
 */
function errorEqual(func, message) {
  throws(func,
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
    deepEqual(e.messages(), message)
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
    validator(value)
  }
  catch (e) {
    if (!(e instanceof forms.ValidationError)) {
      throw new Error('Validator did not throw a ValidationError:' + e)
    }
    deepEqual(e.messages(), message)
    return
  }
  throw new Error('Validator did not throw an exception')
}

/**
 * Custom assertion for contents created with React.DOM.
 */
var reactHTMLEqual = (function() {
  var reactAttrs = / data-react[-\w]+="[^"]+"/g
  var wrapperElement = /^<div>|<\/div>$/g

  return function reactHTMLEqual(component, expectedHTML, message) {
    // Some components just need to return content strings
    if (typeof component == 'string') {
      return strictEqual(component, expectedHTML, message)
    }

    // If a component renders to an Array it needs to be wrapped with another
    // element for rendering.
    var wrapped = false
    if (Array.isArray(component)) {
      component = React.DOM.div(null, component)
      wrapped = true
    }

    // If a component is using the "ref" attribute, it needs to be rendered
    // within a render() method, in which case a function which does the
    // rendering should be passsed.
    if (typeof component == 'function') {
      var renderFunc = component
      var reactClass = React.createClass({
        render: function() {
          var rendered = renderFunc()
          if (Array.isArray(rendered)) {
            rendered = React.DOM.div(null, rendered)
            wrapped = true
          }
          return rendered
        }
      })
      component = reactClass()
    }

    var html = React.renderComponentToString(component)
    html = html.replace(reactAttrs, '')
    // Remove HTML for any wrapper element which was added
    if (wrapped) {
      html = html.replace(wrapperElement, '')
    }
    equal(html, expectedHTML, message)
  }
})()

/**
 * Asserts that a Field's Widget renders to thw given HTML.
 */
function widgetRendersTo(field, expectedHTML) {
  var _Form  = forms.Form.extend({f: field})
  reactHTMLEqual(function() { return new _Form().boundField('f').render() }, expectedHTML)
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    errorEqual: errorEqual
  , cleanErrorEqual: cleanErrorEqual
  , validationErrorEqual: validationErrorEqual
  , reactHTMLEqual: reactHTMLEqual
  , widgetRendersTo: widgetRendersTo
  }
}
