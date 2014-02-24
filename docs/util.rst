=========
Utilities
=========

Guide
=====

TBD

API
===

.. js:class:: ValidationError(message[, kwargs])

   A validation error, containing a list of messages. Single messages (e.g.
   those produced by validators) may have an associated error code and
   parameters to allow customisation by fields.

   The message argument can be a single error, a list of errors, or an object
   that maps field names to lists of errors. What we define as an "error" can
   be either a simple string or an instance of ValidationError with its message
   attribute set, and what we define as list or object can be an actual list or
   object or an instance of ValidationError with its errorList or errorObj
   property set.

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

.. js:function:: formData(form)

   Creates an object representation of a form's elements' contents.

   :param form:
      a form DOM node or a String specifying a form's ``name`` or ``id``
      attribute.

      If a String is given, ``id`` is tried before ``name`` when attempting to
      find the form in the DOM. An error will be thrown if the form can't be
      found.

   :returns:
      an object representing the data present in the form, with input names as
      properties. Inputs with multiple values or duplicate names will have a
      list of values set.


.. js:class:: ErrorObject(errors)

   A collection of field errors that knows how to display itself in various
   formats.

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

   .. js:function:: ErrorObject#rendering()

      Default rendering is as a list.

   .. js:function:: ErrorObject#asUL()

      Displays error details as a list.

   .. js:function:: ErrorObject#asText()

      Displays error details as text.

.. js:class:: ErrorList(list)

   A list of errors which knows how to display itself in various formats.

   **Prototype Functions**

   .. js:function:: ErrorList#extend(errorList)

      Adds more errors from the given list.

   .. js:function:: ErrorList#messages()

      Returns the list of error messages held in the list, converting them from
      ValidationErrors to strings first if necessary.

   .. js:function:: ErrorList#length()

      Returns the number of errors in the list.

   .. js:function:: ErrorList#isPopulated()

      Returns ``true`` if the list contains any errors.

   .. js:function:: ErrorList#render()

      Default rendering is as a list.

   .. js:function:: ErrorList#asUL()

      Displays errors as a list.

   .. js:function:: ErrorList#asText()

      Displays errors as text.
