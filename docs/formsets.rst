========
FormSets
========

Guide
=====

TBD

API
===

.. js:class:: BaseFormSet([kwargs])

   A collection of instances of the same Form.

   :param Object kwargs: configuration options.

   .. js:attribute:: kwargs.data (Object)

      input form data, where property names are field names.
   .. js:attribute:: kwargs.files (Object)

      input file data.

   .. js:attribute:: kwargs.autoId (String)

      a template for use when automatically generating ``id`` attributes for
      fields, which should contain a ``{name}`` placeholder for the field name
      -- defaults to ``id_{name}``.

   .. js:attribute:: kwargs.prefix (String)

      a prefix to be applied to the name of each field in each form instance.
   .. js:attribute:: kwargs.initial (Object)

      a list of initial form data objects, where property names are field names
      - if a field's value is not specified in ``data``, these values will be
      used when rendering field widgets.

   .. js:attribute:: kwargs.errorConstructor (Function)

      the constructor function to be used when creating error details - defaults
      to ErrorList.

.. js:function:: formsetFactory(form, [kwargs])

   Returns a FormSet constructor for the given Form constructor.

   :param Form form: the constructor for the Form to be managed.
   :param Object kwargs:
      arguments defining options for the created FormSet constructor - all
      arguments other than those defined below will be added to the new formset
      constructor's ``prototype``, so this object can also be used to define new
      methods on the resulting formset, such as a custom ``clean`` method.

   .. js:attribute:: kwargs.formset (Function)

      the constructuer which will provide the prototype for the created FormSet
      constructor -- defaults to ``BaseFormSet``.

   .. js:attribute:: kwargs.extra (Number)

      the number of extra forms to be displayed -- defaults to ``1``.

   .. js:attribute:: kwargs.canOrder (Boolean)

      if ``true``, forms can be ordered -- defaults to ``false``.

   .. js:attribute:: kwargs.canDelete (Boolean)

      if ``true``, forms can be deleted -- defaults to ``false``.

   .. js:attribute:: kwargs.maxNum (Number)

      the maximum number of forms to be displayed -- defaults to ``0``.
