=========
Utilities
=========

Newforms exposes miscellaneous utilities you may want to make use of when
working with forms as well as some implementation details which you may need to
make use of for customisation purposes.

.. js:function:: formData(form)

   Creates an object representation of a form's elements' contents.

   :param form:
      a form DOM node or a String specifying a form's ``id`` or ``name``
      attribute.

      If a String is given, ``id`` is tried before ``name`` when attempting to
      find the form in the DOM. An error will be thrown if the form can't be
      found.

   :returns:
      an object representing the data present in the form, with input names as
      properties. Inputs with multiple values or duplicate names will have a
      list of values set.

.. js:function:: formatToArray(str, obj[, options])

   Replaces ``'{placeholders}'`` in a string with same-named properties from a
   given Object, but interpolates into and returns an Array instead of a String.

   By default, any resulting empty strings are stripped out of the Array before
   it is returned. To disable this, pass an options object with a ``'strip'``
   property which is ``false``.

   This is useful for simple templating which needs to include ``React.DOM``
   components.

   :param String str:
      a String containing placeholder names surrounded by ``{`` ``}``

   :param Object obj:
      an Object whose properties will provide replacements for placeholders

   :param Object options:
      an options Object which can be used to disable stripping of empty strings
      from the resulting Array before it is returned by passing
      ``{strip: false}``

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

   .. js:function:: ErrorObject#asUl()

      Displays error details as a list.

   .. js:function:: ErrorObject#asText()

      Displays error details as text.

   .. js:function:: ErrorObject#asData()

      Creates an "unwrapped" version of the data in the ErrorObject - a plain
      Object with lists of ValidationErrors as its properties.

   .. js:function:: ErrorObject#toJSON()

      Creates a representation of all the contents of the ErrorObject for
      serialisation, to be called by ``JSON.stringify()`` if this object is
      passed to it.

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

   .. js:function:: ErrorList#asUl()

      Displays errors as a list.

   .. js:function:: ErrorList#asText()

      Displays errors as text.

   .. js:function:: ErrorList#asData()

      Creates an "unwrapped" version of the data in the ErrorList - a plain
      Array containing ValidationErrors.

   .. js:function:: ErrorList#toJSON()

      Creates a representation of all the contents of the ErrorList for
      serialisation, to be called by ``JSON.stringify()`` if this object is
      passed to it.