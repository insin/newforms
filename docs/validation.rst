=========================
Form and field validation
=========================

Guide
=====

For a guide to the various methods of customising validation and the order in
which they run, please refer to the Django documentation:

   * `Django documentation -- Form and field validation <https://docs.djangoproject.com/en/dev/ref/forms/validation/>`_

API
===

.. js:class:: ValidationError(message[, kwargs])

   A validation error, containing validation messages.

   Single messages (e.g. those produced by validators) may have an associated
   error code and error message parameters to allow customisation by fields.

   :param Object message:
      the message argument can be a single error, a list of errors, or an object
      that maps field names to lists of errors.

      What we define as an "error" can be either a simple string or an instance
      of ValidationError with its message attribute set, and what we define as
      list or object can be an actual list or object, or an instance of
      ValidationError with its errorList or errorObj property set.

   :param Object kwargs: validation error options.

   .. js:attribute:: kwargs.code

      a code identifying the type of single message this validation error is.

   .. js:attribute:: kwargs.params

      parameters to be interpolated into the validation error message. where the
      message contains curly-bracketed {placeholders} for parameter properties.

      :type: Object

   **Prototype Functions**

   .. js:function:: ValidationError#messageObj()

      Returns validation messages as an object with field names as properties.

      Throws an error if this validation error was not created with a field
      error object.

   .. js:function:: ValidationError#messages()

      Returns validation messages as a list. If the ValidationError was
      constructed with an object, its error messages will be flattened into a
      list.