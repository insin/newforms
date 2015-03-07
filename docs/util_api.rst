=========
Utilities
=========

Newforms exposes various utilities you may want to make use of when working with
forms, as well as some implementation details which you may need to make use of
for customisation purposes.

.. js:function:: getFormData(form)

   :param form:
      a form DOM node or `ReactElement`.

   :returns:
      an object containing the submittable value(s) held in each of the form's
      elements, with element names as properties.

.. js:function:: validateAll(form, formsAndFormsets)

   Extracts data from a ``<form>`` and validates it  with a list of Forms
   and/or FormSets.

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
