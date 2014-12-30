==============
Validation API
==============

``ValidationError``
===================

ValidationError is part of the `validators`_ module, but is so commonly used
when implementing custom validation that it's exposed as part of the top-level
newforms API.

.. js:class:: ValidationError(message[, kwargs])

   A validation error, containing validation messages.

   Single messages (e.g. those produced by validators) may have an associated
   error code and error message parameters to allow customisation by fields.

   :param message:
      the message argument can be a single error, a list of errors, or an object
      that maps field names to lists of errors.

      What we define as an "error" can be either a simple string or an instance
      of ValidationError with its message attribute set, and what we define as
      list or object can be an actual list or object, or an instance of
      ValidationError with its errorList or errorObj property set.

   :param Object kwargs: validation error options.

   :param String kwargs.code:
      a code identifying the type of single message this validation error is.

   :param Object kwargs.params:
      parameters to be interpolated into the validation error message. where the
      message contains curly-bracketed {placeholders} for parameter properties.

   **Prototype Functions**

   .. js:function:: ValidationError#messageObj()

      Returns validation messages as an object with field names as properties.

      Throws an error if this validation error was not created with a field
      error object.

   .. js:function:: ValidationError#messages()

      Returns validation messages as a list. If the ValidationError was
      constructed with an object, its error messages will be flattened into a
      list.

Errors
======

Validation errors for a whole form are held in an ``ErrorObject``, while each
field's validation errors are (by default) held im an ``ErrorList``.

.. js:class:: ErrorObject([errors])

   A collection of field errors that knows how to display itself in various
   formats.

   :param Object errors:

   **Static Functions**

   .. js:function:: ErrorObject.fromJSON(jsonObj[, errorConstructor])

      Creates a new ErrorObject and populates it from an object with the same
      structure as that produced by this object's ``toJSON()`` method.

   **Prototype Functions**

   .. js:function:: ErrorObject#set(field, error)

      Sets a field's errors.

   .. js:function:: ErrorObject#get(field)

      Gets errors for the given field.

   .. js:function:: ErrorObject#hasField(field)

      Returns ``true`` if errors have been set for the given field.

   .. js:function:: ErrorObject#length()

      Returns the number of fields errors have been set for.

   .. js:function:: ErrorObject#isPopulated()

      Returns true if any fields have error details set.

   .. js:function:: ErrorObject#render()

      Default rendering is as a list.

   .. js:function:: ErrorObject#asUl()

      Displays error details as a list. Returns ``undefined`` if this object
      isn't populated with any errors.

   .. js:function:: ErrorObject#asText()

      Displays error details as text.

   .. js:function:: ErrorObject#asData()

      Creates an "unwrapped" version of the data in the ErrorObject - a plain
      Object with lists of ValidationErrors as its properties.

   .. js:function:: ErrorObject#toJSON()

      Creates a representation of all the contents of the ErrorObject for
      serialisation, to be called by ``JSON.stringify()`` if this object is
      passed to it.

   .. js:function:: ErrorObject#fromJSON(jsonObj[, errorConestructor])

      Populates this ErrorObject from an object with the same structure as that
      produced by this object's ``toJSON()`` method.

.. js:class:: ErrorList(list)

   A list of errors which knows how to display itself in various formats.

   **Static Functions**

   .. js:function:: ErrorList.fromJSON(jsonList)

      Creates a new ErrorList and populates it from a list with the same
      structure as that produced by this object's ``toJSON()`` method.

   **Prototype Functions**

   .. js:function:: ErrorList#extend(errorList)

      Adds more errors from the given list.

   .. js:function:: ErrorList#first()

      Returns the first error message held in the list, or undefined if the list
      was empty.

      .. versionadded:: 0.9

   .. js:function:: ErrorList#messages()

      Returns the list of error messages held in the list, converting them from
      ValidationErrors to strings first if necessary.

   .. js:function:: ErrorList#length()

      Returns the number of errors in the list.

   .. js:function:: ErrorList#isPopulated()

      Returns ``true`` if the list contains any errors.

   .. js:function:: ErrorList#render()

      Default rendering is as a list.

   .. js:function:: ErrorList#asUl()

      Displays errors as a list. Returns ``undefined`` if this list isn't
      populated with any errors.

   .. js:function:: ErrorList#asText()

      Displays errors as text.

   .. js:function:: ErrorList#asData()

      Creates an "unwrapped" version of the data in the ErrorList - a plain
      Array containing ValidationErrors.

   .. js:function:: ErrorList#toJSON()

      Creates a representation of all the contents of the ErrorList for
      serialisation, to be called by ``JSON.stringify()`` if this object is
      passed to it.

   .. js:function:: ErrorList#fromJSON(jsonList)

      Populates this ErrorList from a list with the same structure as that
      produced by this object's ``toJSON()`` method.

Validators
==========

Newforms depends on the `validators`_ module and exposes its version of it as
``forms.validators``.

Constructors in the validators module are actually validation function factories
-- they can be called with or without ``new`` and will return a Function which
performs the configured validation when called.

.. js:class:: RegexValidator(kwargs)

   Creates a validator which validates that input matches a regular expression.

   :param Object kwargs: validator options, which are as follows:

   :param kwargs.regex:
      the regular expression pattern to search for the provided value, or a
      pre-compiled ``RegExp``. By default, matches any string (including an
      empty string)
   :type kwargs.regex: RegExp or String

   :param String kwargs.message:
      the error message used by ``ValidationError`` if validation fails.
      Defaults to ``"Enter a valid value"``.

   :param String kwargs.code:
      the error code used by ``ValidationError`` if validation fails. Defaults
      to ``"invalid"``.

   :param Boolean kwargs.inverseMatch:
      the match mode for ``regex``. Defaults to ``false``.

.. js:class:: URLValidator(kwargs)

   Creates a validator which validates that input looks like a valid URL.

   :param Object kwargs: validator options, which are as follows:

   :param Array.<String> kwargs.schemes:
      allowed URL schemes. Defaults to ``['http', 'https', 'ftp', 'ftps']``.

.. js:class:: EmailValidator(kwargs)

   Creates a validator which validates that input looks like a valid e-mail
   address.

   :param Object kwargs: validator options, which are as follows:

   :param String kwargs.message:
      error message to be used in any generated ``ValidationError``.

   :param String kwargs.code:
      error code to be used in any generated ``ValidationError``.

   :param  Array.<String> kwargs.whitelist:
      a whitelist of domains which are allowed to be the only thing to the right
      of the ``@`` in a valid email address -- defaults to ``['localhost']``.

.. js:function:: validateEmail(value)

   Validates that input looks like a valid e-mail address -- this is a
   preconfigured instance of an :js:class:`EmailValidator`.

.. js:function:: validateSlug(value)

   Validates that input consists of only letters, numbers, underscores or
   hyphens.

.. js:function:: validateIPv4Address(value)

   Validates that input looks like a valid IPv4 address.

.. js:function:: validateIPv6Address(value)

   Validates that input is a valid IPv6 address.

.. js:function:: validateIPv46Address(value)

   Validates that input is either a valid IPv4 or IPv6 address.

.. js:function:: validateCommaSeparatedIntegerList(value)

   Validates that input is a comma-separated list of integers.

.. js:class:: MaxValueValidator(maxValue)

   Throws a ValidationError with a code of ``'maxValue'`` if its input is
   greater than ``maxValue``.

.. js:class:: MinValueValidator(minValue)

   Throws a ValidationError with a code of ``'minValue'`` if its input is
   less than ``maxValue``.

.. js:class:: MaxLengthValidator(maxLength)

   Throws a ValidationError with a code of ``'maxLength'`` if its input's length
   is greater than ``maxLength``.

.. js:class:: MinLengthValidator(minLength)

   Throws a ValidationError with a code of ``'minLength'`` if its input's length
   is less than ``minLength``.

.. _`validators`: https://github.com/insin/validators