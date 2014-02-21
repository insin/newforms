
=====
Forms
=====

Guide
=====

TBD

API
===

.. js:class:: Form([kwargs])

   Extends :js:class:`BaseForm` and registers :js:func:`DeclarativeFieldsMeta`
   as a mixin to be used to set up Fields when this constructor is extended.

   This is intended intended as the entry point for defining your own forms.

   You can do this using its ``extend()`` function, which is provided by `Concur`_.

   .. js:function:: Form.extend({prototypeProps, constructorProps})

      Creates a new constructor which inherits from Form.

      :param Object prototypeProps:
         Form Fields and other prototype properties for the new form, such as a
         custom constructor and validation methods.

   .. _`Concur`: https://github.com/insin/concur

.. js:function:: DeclarativeFieldsMeta({prototypeProps, constructorProps})

   This mixin function is responsible for setting up form fields when a new Form
   constructor is being created.

   It pops any Fields it finds off the form's prototype properties object,
   determines if any forms are also being mixed-in via a ``__mixin__`` property
   and handles inheritance of Fields from any form which is being inherited from,
   such that fields will be given the following order of precedence should there be a
   naming conflict with any of these three sources:

   1. Fields specified in ``prototypeProps``
   2. Fields from a mixed-in form
   3. Fields from the Form being inherited from

.. js:class:: BaseForm([kwargs])

   A collection of Fields that knows how to validate and display itself.

   :param Object kwargs: form options.

   .. js:attribute:: kwargs.data

      input form data, where property names are field names. A form with data is
      considered to be "bound" and ready for use validating and coercing the
      given data.

      :type: Object

   .. js:attribute:: kwargs.files

      input file data.

      :type: Object

   .. js:attribute:: kwargs.autoId

      a template for use when automatically generating ``id`` attributes for
      fields, which should contain a ``{name}`` placeholder for the field name
      -- defaults to ``id_{name}``.

      :type: String

   .. js:attribute:: kwargs.prefix

      a prefix to be applied to the name of each field in this instance of the
      form - using a prefix allows you to easily work with multiple instances of
      the same Form object in the same HTML ``<form>``, or to safely mix Form
      objects which have fields with the same names.

      :type: String

   .. js:attribute:: kwargs.initial (Object)

      initial form data, where property names are field names -- if a field's
      value is not specified in ``data``, these values will be used when
      rendering field widgets.

      :type: Object

   .. js:attribute:: kwargs.errorConstructor

      the constructor function to be used when creating error details. Defaults
      to :js:class:`ErrorList`.

      :type: Function

   .. js:attribute:: kwargs.labelSuffix

      a suffix to be used when generating labels in one of the convenience
      methods which renders the entire Form -- defaults to ``':'``.

      :type: String

   .. js:attribute:: kwargs.emptyPermitted

      if ``true``, the form is allowed to be empty -- defaults to ``false``.

      :type: Boolean

   **Instance Properties**

   Form options documented in ``kwargs`` above are set as instance properties.

   The following instance properties are also available:

   .. js:attribute:: form.fields

      Form fields for this instance of the form.

      Since a particular instance might want to alter its fields based on data
      passed to its constructor, fields given as part of the form definition
      are deep-copied into ``fields`` every time a new instance is created.

      Instances should only ever modify ``fields``.

      :type: Object with field names as property names and Field instances as properties.

   .. js:attribute:: form.isBound

      Determines if this form has been given input data which can be validated.

      ``true`` if the form was instantiated with ``kwargs.data`` or
      ``kwargs.files``.

   .. js:attribute:: form.cleanedData

      After a form has been validated, it will have a ``cleanedData`` property.
      If your data does *not* validate, the ``cleanedData`` The object will
      contain only the valid fields.

      :type:
         Object with field names as property names and valid, cleaned values
         coerced to the appropriate JavaScript type as properties.

   **Prototype Functions**

   Prototype functions for validating and getting information about the results
   of validation.

   .. js:function:: BaseForm#addError(field, error)

      This function allows adding errors to specific fields from within the
      ``form.clean()`` method, or from outside the form altogether. This is a
      better alternative to fiddling directly with ``form._errors``.

      The ``field`` argument is the name of the field to which the errors should
      be added. If its value is ``null`` the error will be treated as a
      non-field error as returned by ``form.nonFieldErrors()``.

      The ``error`` argument can be a simple string, or preferably an instance
      of :js:class:`ValidationError`.

      Note that ``form.addError()`` automatically removes the relevant field
      from :js:attr:`form.cleanedData`.

   .. js:function:: BaseForm#fullClean()

      Validates and cleans ``this.data`` and populates errors and
      ``cleanedData``.

      You shouldn't need to call this function directly in general use, as it's
      called for you when necessary by :js:func:`BaseForm#isValid` and
      :js:func:`BaseForm#errors`.

   .. js:function:: BaseForm#isValid()

      Determines whether or not the form has errors, triggering cleaning of the
      form first if necessary.

      :return:
         ``true`` if the form is bound and has no errors, ``false`` otherwise.
         If errors are being ignored, returns ``false``.

   .. js:function:: BaseForm#errors()

      Getter for validation errors which first cleans the form if there are no
      errors defined yet.

      :returns: validation errors for the form, as an :js:class:`ErrorObject`

   .. js:function:: BaseForm#nonFieldErrors()

      :returns:
         errors that aren't associated with a particular field - i.e., errors
         generated by :js:func:`BaseForm#clean`. Will be empty if there are
         none.

   .. js:function:: BaseForm#clean()

      Hook for doing any extra form-wide cleaning after each Field's
      :js:func:`Field#clean` has been called. Any :js:class:`ValidationError`
      thrown by this method will not be associated with a particular field; it
      will have a special-case association with the field named ``'__all__'``.

      :returns: validated, cleaned data.

   .. js:function:: BaseForm#changedData()

      :returns:
         a list of the names of fields which have differences between their
         initial and currently bound values.

   .. js:function:: BaseForm#hasChanged()

      :returns: ``true`` if data differs from initial.

   A number of default rendering functions are provided to generate
   ``React.DOM`` representations of a Form's fields.

   These are general-purpose in that they attempt to handle all form rendering
   scenarios and edge cases, ensuring that valid markup is always produced.

   For flexibility, the output does not include a ``<form>`` or a submit
   button, just field labels and inputs.

   .. js:function:: BaseForm#render()

      Default rendering method, which calls :js:func:`BaseForm#asTable`

   .. js:function:: BaseForm#asTable()

      Renders the form as a series of ``<tr>`` tags, with ``<th>`` and ``<td>``
      tags containing field labels and inputs, respectively.

      You're responsible for ensuring the generated rows are placed in a
      containing ``<table>`` and ``<tbody>``.

   .. js:function:: BaseForm#asUL()

      Renders the form as a series of ``<li>`` tags, with each ``<li>``
      containing one field. It does not include the ``<ul>`` so that you can
      specify any HTML attributes on the ``<ul>`` for flexibility.

   .. js:function:: BaseForm#asP()

      Renders the form as a series of ``<p>`` tags, with each ``<p>`` containing
      one field.

   Prototype functions for use in rendering form fields.

   .. js:function:: BaseForm#boundFields([test])

      Creates a :js:class:`BoundField` for each field in the form, in the order
      in which the fields were created.

      :param Function test:

         If provided, this function will be called with ``field`` and ``name``
         arguments - BoundFields will only be generated for fields for which
         ``true`` is returned.

   .. js:function:: BaseForm#boundFieldsObj([test])

      A version of :js:func:`BaseForm#boundFields` which returns an Object with
      field names as property names and BoundFields as properties.

   .. js:function:: BaseForm#boundField(name)

      Creates a :js:class:`BoundField` for the field with the given name.

      :param String name: the name of a field in the form.

   .. js:function:: BaseForm#hiddenFields()

      :returns: a list of :js:class:`BoundField` objects that correspond to
         hidden fields. Useful for manual form layout.

   .. js:function:: BaseForm#visibleFields()

      :returns:
         a list of :js:class:`BoundField` objects that do not correspond to
         hidden fields. The opposite of the :js:func:`BaseForm#hiddenFields`
         function.

   .. js:function:: BaseForm#isMultipart()

      Determines if the form needs to be multipart-encoded in other words, if it
      has a :js:class:`FileInput`.

      :returns: ``true`` if the form needs to be multipart-encoded.

   .. js:function:: BaseForm#addPrefix(fieldName)

      :returns:
         the given field name with a prefix added, if this Form has a prefix.

   .. js:function:: BaseForm#addInitialPrefix(fieldName)

      Adds an initial prefix for checking dynamic initial values.

.. js:class:: BoundField(form, field, name)

   A field and its associated data.

   This is the primary means of generating components such as labels and input
   fields in the default form rendering methods.

   Its attributes and methods may be of use when implementing custom rendering.

   :param Form form:
      a form.

   :param Field field:
      one of the form's fields.

   :param String name:
      the name under which the field is held in the form

   **Instance Attributes**

   .. js:attribute:: boundField.form (Form)

      The form this BoundField wraps a field from.

   .. js:attribute:: boundField.field (Field)

      The field this BoundField wraps.

   .. js:attribute:: boundField.name (String)

      The name associated with the field in the form.

   .. js:attribute:: boundField.htmlName (String)

      A version of the field's name including any prefix the form has been
      configured with.

      Assuming your forms are configured with prefixes when needed, this
      should be a unique identifier for any particular field (e.g. if you need
      something to pass as a ``key`` prop to a React component).

   **Prototype Functions**

   .. js:function:: BoundField#errors()

      :returns: validation errors for the field.

   .. js:function:: BoundField#isHidden()

      :returns: ``true`` if the field is configured with a hidden widget.

   .. js:function:: BoundField#autoId()

      Calculates and returns the ``id`` attribute for this BoundField if the
      associated form has an autoId. Returns an empty string otherwise.

   .. js:function:: BoundField#data()

      :returns: Raw input data for the field or ``null`` if it wasn't given.

   .. js:function:: BoundField#idForLabel()

      Wrapper around the field widget's :js:func:`Widget#idForLabel`. Useful,
      for example, for focusing on this field regardless of whether it has a
      single widget or a :js:class:`MutiWidget`.

   .. js:function:: BoundField#render([kwargs])

      Default rendering method - if the field has ``showHiddenInitial`` set,
      renders the default widget and a hidden version, otherwise just renders
      the default widget for the field.

      :param Object kwargs: widget options as per :js:func:`BoundField#asWidget`.

   .. js:function:: BoundField#asWidget([kwargs])

      Renders a widget for the field.

      :param Object kwargs: widget options.

      .. js:attribute:: kwargs.widget (Widget)

         An override for the widget used to render the field - if not
         provided, the field's configured widget will be used.

      .. js:attribute:: kwargs.attrs (Object)

         Additional attributes to be added to the field's widget.

   .. js:function:: BoundField#suWidgets()

      :returns:
         a list of :js:class:`SubWidget` objects that comprise all widgets in
         this BoundField. This really is only useful for :js:class:`RadioSelect`
         widgets, so that you can iterate over individual radio buttons when rendering.

   .. js:function:: BoundField#asText([kwargs])

      Renders the field as a text input.

      :param Object kwargs: widget options.

      .. js:attribute:: kwargs.attrs (Object)

         Additional attributes to be added to the field's widget.

   .. js:function:: BoundField#asTextarea([kwargs])

      Renders the field as a textarea.

      :param Object kwargs: widget options.

      .. js:attribute:: kwargs.attrs (Object)

         Additional attributes to be added to the field's widget.

   .. js:function:: BoundField#asHidden([kwargs])

      Renders the field as a hidden field.

      :param Object kwargs: widget options.

      .. js:attribute:: kwargs.attrs (Object)

         Additional attributes to be added to the field's widget.

   .. js:function:: BoundField#value()

      Returns the value for this BoundField, using the initial value if the form
      is not bound or the data otherwise.

   .. js:function:: BoundField#getLabel()

      Creates the label value to be displayed, adding the form suffix if there
      is one and the label doesn't end in punctuation.

   .. js:function:: BoundField#labelTag([kwargs])

      Wraps the given contents in a <label>, if the field has an ID attribute,
      otherwise generates a text label.

      :param Object kwargs: configuration options.

      .. js:attribute:: kwargs.contents (String)

         Contents for the label - if not provided, label contents will be
         generated from the field itself.

      .. js:attribute:: kwargs.attrs (Object)

         Additional attributes to be added to the label.

   .. js:function:: BoundField#cssClasses([extraClasses])

      Returns a string of space-separated CSS classes to be applied to the
      field.

      :param String extraClasses:
         additional CSS classes to be applied to the field
