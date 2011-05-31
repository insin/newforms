Utilities
=========

Core utilities
--------------

Utilities which are of partcular interest when inplementing your own form
components are exposed on the ``forms`` namespace object.

.. js:class:: ErrorObject(errors)

   .. js:function:: ErrorObject.set()

   .. js:function:: ErrorObject.get()

   .. js:function:: ErrorObject.isPopulated()

   .. js:function:: ErrorObject.asUL()

   .. js:function:: ErrorObject.asText()

   .. js:function:: ErrorObject.defaultRendering()

   .. js:function:: ErrorObject.toString()

.. js:class:: ErrorList(errors)

   .. js:function:: ErrorList.extend()

   .. js:function:: ErrorList.isPopulated()

   .. js:function:: ErrorList.asUL()

   .. js:function:: ErrorList.asText()

   .. js:function:: ErrorList.defaultRendering()

   .. js:function:: ErrorList.toString()

.. js:class:: ValidationError(message, {code: null, params: null})

   Thrown by validation methods to indicate that invalid data was detected.
   The message argument can be a list of strings or a string, in which case
   an error code and a message parameters object can be provided to enable
   customisation of the resulting error message based on the code.

   .. js:function:: ValidationError.toString()

.. js:function:: inheritFrom(child, parent)

   Sets up parent/child prototypal inheritance for the given constructors.

.. js:function:: callValidator(validator, value)

   Calls the given validator with the given value - you may need this if
   you're overrriding how validators are used.

.. js:function:: formData(form)

   Creates an object representation of a form's contents.

Other utilities
---------------

Other utilities involved in inplementing newforms are available under a
``utils`` namespace sub-object.

Working with objects
~~~~~~~~~~~~~~~~~~~~

.. js:function:: util.contains(container, item)

   Determines if a container (which may be an array or string) contains
   an item.

.. js:function:: util.createLookup(array)

   Creates a lookup object from an array, where the object's property
   names are the array's contents coerced to string and all corresponding
   values are truthy.

.. js:function:: util.extend(dest, obj1[, ...])

   Copies properties from any number of objects into a destination
   object. Properties will be copied from objects in the order they're
   given.

.. js:function:: util.getDefault(obj, name, default)

   If an object has a named property, returns its value, otherwise returns
   a default value

.. js:function:: util.itemsToObject(items)

   Creates and populates an object with a list of ``[name, value]``
   pairs.

.. js:function:: util.objectItems(obj)

   Create a list of ``[name, value]`` pairs from an object.

Type checking
~~~~~~~~~~~~~

Standard type checking functions, which inspect the results of
``Object.prototype.toString()``

.. js:function:: util.isArray(obj)
.. js:function:: util.isFunction(obj)
.. js:function:: util.isNumber(obj)
.. js:function:: util.isObject(obj)
.. js:function:: util.isString(obj)

.. js:function:: util.isCallable(obj)

   Since instances can't be callable in JavaScript, we fake them by defining
   a ``__call__`` method for validators. This method determines if it's been
   given a Function or an obejct which has a ``__call__`` function.

Strings
~~~~~~~

.. js:function:: util.format(string, obj)

   Replaces named placeholders in a string, specified in %(name)s format,
   with corresponding names propertied from the given object.

.. js:function:: util.strip(string)

   Returns a version of the given string with leading and trailing
   whitespace trimmed.

Missing from JavaScript
~~~~~~~~~~~~~~~~~~~~~~~

These utilites implenment essential features required by newforms which
are missing from JavaScript.

.. js:attribute:: util.copy

   Object copying utilities.

   .. js:function:: deepCopy(obj)

      Creates a deep copy of the given object.

.. js:attribute:: util.time

   Partial imlpementations of strptime and strptime for use in Date
   validation and display.

   .. js:function:: util.time.strftime(input, format[, locale])

      Creates a formatted string representation of a a ``Date`` based on a
      format string.

   .. js:function:: util.time.strptime(input, format[, locale])

      Given an input string and a format string, parses date details out
      of the input string.

   .. js:function:: util.time.strpdate(input, format[, locale])

      Convenience wrapper around ``strptime`` which returns a ``Date``.

.. js:attribute:: util.urlparse

   Utilities for working with URLs.

   .. js:function:: util.urlparse.urlsplit(url[, default_scheme[, allow_fragments]])

      Splits a URL into sections, which are returned as an an Object.

   .. js:function:: util.urlparse.urlunsplit(obj)

      Joins URL sections into a complete URL.
