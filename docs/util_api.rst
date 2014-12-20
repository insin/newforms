=========
Utilities
=========

Newforms exposes various utilities you may want to make use of when working with
forms, as well as some implementation details which you may need to make use of
for customisation purposes.

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

.. js:function:: validateAll(form, formsAndFormsets)

   Extracts data from a ``<form>`` using :js:func:`formData` and validates it
   with a list of Forms and/or FormSets.

   :param form:
      the ``<form>`` into which any given forms and formsets have been rendered
      -- this can be a React ``<form>`` component or a real ``<form>`` DOM node.

   :param Array formsAndFormsets:
      a list of Form and/or FormSet instances to be used to validate the
      ``<form>``'s input data.

   :returns:
      ``true`` if the ``<form>``'s input data are valid according to all given
      forms and formsets

.. js:function:: util.formatToArray(str, obj[, options])

   Replaces ``'{placeholders}'`` in a string with same-named properties from a
   given Object, but interpolates into and returns an Array instead of a String.

   By default, any resulting empty strings are stripped out of the Array before
   it is returned. To disable this, pass an options object with a ``'strip'``
   property which is ``false``.

   This is useful for simple templating which needs to include ``ReactElement``
   objects.

   :param String str:
      a String containing placeholder names surrounded by ``{`` ``}``

   :param Object obj:
      an Object whose properties will provide replacements for placeholders

   :param Object options:
      an options Object which can be used to disable stripping of empty strings
      from the resulting Array before it is returned by passing
      ``{strip: false}``

.. js:function:: util.makeChoices(list, submitValueProp, displayValueProp)

   Creates a list of [submitValue, displayValue] :ref:`choice pairs <ref-fields-choice-pairs>`
   from a list of objects.

   If any of the property names correspond to a function in an object, the
   function will be called with the object as the ``this`` context.

   :param Array list: a list of objects

   :param String submitValueProp:
      the name of the property in each object holding the value to be
      submitted/returned when it's a selected choice.

   :param String displayValueProp:
      the name of the property in each object holding the value to be
      displayed for selection by the user.

.. js:class:: ErrorObject(errors)

   A collection of field errors that knows how to display itself in various
   formats.

   **Static Functions**

   .. js:function:: ErrorObject.fromJSON(jsonObj, errorConstructor)

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

   .. js:function:: ErrorObject#fromJSON(jsonObj, errorConestructor)

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