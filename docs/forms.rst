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

.. js:function:: Form(kwargs)

   Creates a new form constructor, eliminating some of the steps required when
   manually defining a new form class and wiring up convenience hooks into the
   form initialisation process.

   :param Object kwargs:
      arguments defining options for the created form constructor.

      Arguments which are ``Field`` instances will contribute towards the form's
      ``baseFields``.

      All remaining arguments other than those defined below will be added to
      the new form constructor's ``prototype``, so this object can also be used
      to define new methods on the resulting form, such as custom ``clean`` and
      ``cleanFieldName`` methods.

   .. js:attribute:: kwargs.form (Function|Array)

      the Form constructor which will provide the prototype for the new Form
      constructor -- defaults to ``BaseForm``.

   .. js:attribute:: kwargs.preInit (Function)

      if provided, this function will be invoked with any keyword arguments
      which are passed when a new instance of the form is being created,
      *before* fields have been created and the prototype constructor called -
      if a value is returned from the function, it will be used as the kwargs
      object for further processing, so typical usage of this argument would be
      to set default kwarg arguments or pop and store kwargs as properties of
      the form object being created.

   .. js:attribute:: kwargs.postInit (Function)

      if provided, this function will be invoked with any keyword arguments
      which are passed when a new instance of the form is being created, *after*
      fields have been created and the prototype constructor called - typical
      usage of this function would be to dynamically alter the form fields which
      have just been created or to add/remove fields by altering
      ``this.fields``.
