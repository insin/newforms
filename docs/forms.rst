=====
Forms
=====

Guide
=====

TBD

API
===

.. js:class:: BaseForm([kwargs])

   A collection of Fields that knows how to validate and display itself.

   :param Object kwargs: form options.

   .. js:attribute:: kwargs.data (Object)

      input form data, where property names are field names. A form with data is
      considered to be "bound" and ready for use validating and coercing the
      given data.

   .. js:attribute:: kwargs.files (Object)

      input file data.

   .. js:attribute:: kwargs.autoId (String)

      a template for use when automatically generating ``id`` attributes for
      fields, which should contain a ``{name}`` placeholder for the field name
      -- defaults to ``id_{name}``.

   .. js:attribute:: kwargs.prefix (String)

      a prefix to be applied to the name of each field in this instance of the
      form - using a prefix allows you to easily work with multiple instances of
      the same Form object in the same HTML ``<form>``, or to safely mix Form
      objects which have fields with the same names.

   .. js:attribute:: kwargs.initial (Object)

      initial form data, where property names are field names - if a field's
      value is not specified in ``data``, these values will be used when
      rendering field widgets.

   .. js:attribute:: kwargs.errorConstructor (Function)

      the constructor function to be used when creating error details - defaults
      to :js:class:`ErrorList`.

   .. js:attribute:: kwargs.labelSuffix (String)

      a suffix to be used when generating labels in one of the convenience
      methods which renders the entire Form - defaults to ``':'``.

   .. js:attribute:: kwargs.emptyPermitted (Boolean)

      if ``true``, the form is allowed to be empty -- defaults to ``false``.

   .. js:function:: isValid()

      Determines whether or not the form has errors, triggering cleaning of the
      form first if necessary.

      :return:
         ``true`` if the form is bound and has no errors, ``false`` otherwise.
         If errors are being ignored, returns ``false``.

   .. js:function:: errors()

      Getter for errors, which first cleans the form if there are no errors
      defined yet.

.. js:class:: BoundField(form, field, name)

   A field and its associated data.

   :param Form form: a form.
   :param Field field: one of the form's fields.
   :param String name: the name under which the field is held in the form

.. js:function:: DeclarativeFieldsMeta({prototypeProps, constructorProps})

   This function is responsible for setting up form fields when a new Form
   constructor is being created. It pops any Fields it finds off the form's
   prototype properties object, determines if any forms are also being mixed-in
   via a __mixin__ property and handles inheritance of Fields from any form
   which is being inherited from such that fields will be given this order of
   precedence should there be a naming conflict with any of these three sources.

   1. Fields specified in the prototype properties
   2. Fields from a mixed-in form
   3. Fields from the Form being inherited from

.. js:class:: Form([kwargs])

   Inherits from BaseForm and registers DeclarativeFieldsMeta to be used to set
   up Fields when this constructor is inherited from.

   It is intended as the entry point for defining your own forms. You can do
   this using its ``extend()`` function, which is provided by `Concur`_

   ..js:function:: Form.extend({prototypeProps, constructorProps})

      Creates a new constrctor which inherits from Form. The new form's fields
      and prototype properties, such as validation methods, should be passed as
      ``prototypeProps``.

   .. _`Concur`: https://github.com/insin/concur
