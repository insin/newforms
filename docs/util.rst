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

.. js:function:: callValidator(validator, value)

   Calls the given validator with the given value - you may need this if
   you're overrriding how validators are used.

.. js:function:: util.isCallable(obj)

   Since instances can't be callable in JavaScript, we fake them by defining
   a ``__call__`` method for validators. This method determines if it's been
   given a Function or an obejct which has a ``__call__`` function.

.. js:function:: formData(form)

   Creates an object representation of a form's contents.

Other utilities
---------------

Other utilities involved in inplementing newforms are available under a
``utils`` namespace sub-object.

.. js:attribute:: util.urlparse

   Utilities for working with URLs.

   .. js:function:: util.urlparse.urlsplit(url[, default_scheme[, allow_fragments]])

      Splits a URL into sections, which are returned as an an Object.

   .. js:function:: util.urlparse.urlunsplit(obj)

      Joins URL sections into a complete URL.
