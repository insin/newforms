======
Models
======

Stability
=========

The models modules is a work-in-progress based on limited experimentation with
a sync API - it is likely to change extensively to be able to handle an async
Model API.

API
===

.. js:data:: ModelInterface

   A means of hooking newforms up with information about your model layer.

   .. js:attribute:: ModelInterface.throwsIfNotFound

      Set to ``true`` if an exception is thrown when a model can't be found.

   .. js:attribute:: ModelInterface.notFoundErrorConstructor

      Constructor of error to ve thrown when a model can't be found. Any
      exceptions which do not have this constructor will be rethrown.

   .. js:attribute:: ModelInterface.notFoundValue

      Value returned to indicate not found, instead of throwing an exception.

   .. js:attribute:: ModelInterface.prepareValue

      Given a model instance, should return the id which will be used to search
      for valid choices on submission.

   .. js:attribute:: ModelInterface.findById

      Finds a model instance by id, given the model query which was passed to
      newforms and the id of the selected model.

.. js:class:: ModelChoiceField(modelQuery[, kwargs])

   A ChoiceField which retrieves its choices as objects returned by a given
   function.

   :param Function modelQuery:
      an object which performs a query for model instances - this is expected to
      have an ``__iter__`` method which returns a list of instances.

   :param Object kwargs: field options

   :param Boolean kwargs.cacheChoice:
      if ``true``, the model query function will only be called the first
      time it is needed, otherwise it will be called every time the field is
      rendered.
