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

   :param Object kwargs:
      form options.

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

   **Prototype Functions**

   .. js:function:: BaseForm#isValid()

      Determines whether or not the form has errors, triggering cleaning of the
      form first if necessary.

      :return:
         ``true`` if the form is bound and has no errors, ``false`` otherwise.
         If errors are being ignored, returns ``false``.

   .. js:function:: BaseForm#errors()

      Gettter which  first cleans the form if there are no errors defined yet.

      :returns: validation errors for the form.

   .. js:function:: BaseForm#changedData()

      :returns: a list of the names of fields which have differenced between
         their initial and currently bound values.

   .. js:function:: BaseForm#boundFields([test])

      In lieu of ``__iter__`` in JavaScript, creates a BoundField for each field
      in the form, in the order in which the fields were created.

      :param Function test:

         If provided, this function will be called with ``field`` and ``name``
         arguments - BoundFields will only be generated for fields for
         ``true`` is returned.

   .. js:function:: BaseForm#boundField(name)

      In lieu of ``__getitem__`` in JavaScript, creates a BoundField for the
      field with the given name.

      :param String name: The name of a field in the form.

   .. js:function:: BaseForm#hiddenFields()

      :returns: a list of BoundField objects that correspond to hidden fields.
         Useful for manual form layout.

   .. js:function:: BaseForm#visibleFields()

      :returns: a list of BoundField objects that do not correspond to hidden
         fields. The opposite of the `hiddenFields()` function.

   .. js:function:: BaseForm#addPrefix(fieldName)

      :returns: the givenfield name with a prefix added, if this Form has a prefix.

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

   .. js:attribute:: form (Form)

      The form this BoundField wraps a field from.

   .. js:attribute:: field (Field)

      The field this BoundField wraps.

   .. js:attribute:: name (String)

      The name associated with the field in the form.

   .. js:attribute:: htmlName (String)

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

   .. js:function:: BoundField#idForLabel

   .. js:function:: BoundField#render

   .. js:function:: BoundField#asWidget([kwargs])

      Renders a widget for the field.

      :param Object kwargs:

         .. js:attribute:: kwargs.widget (Widget)

            An override for the widget used to render the field - if not
            provided, the field's configured widget will be used.

         .. js:attribute:: kwargs.attrs (Object)

            Additional attributes to be added to the field's widget.

   .. js:function:: BoundField#asText([kwargs])

      Renders the field as a text input.

      :param Object kwargs:

         .. js:attribute:: kwargs.attrs (Object)

            Additional attributes to be added to the field's widget.

   .. js:function:: BoundField#asTextarea([kwargs])

      Renders the field as a textarea.

      :param Object kwargs:

         .. js:attribute:: kwargs.attrs (Object)

            Additional attributes to be added to the field's widget.

   .. js:function:: BoundField#asHidden([kwargs])

      Renders the field as a hidden field.

      :param Object kwargs:
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

      Returns a string of space-separated CSS classes for this field.

.. js:function:: DeclarativeFieldsMeta({prototypeProps, constructorProps})

   This function is responsible for setting up form fields when a new Form
   constructor is being created.

   It pops any Fields it finds off the form's prototype properties object,
   determines if any forms are also being mixed-in via a ``__mixin__`` property
   and handles inheritance of Fields from any form which is being inherited from,
   such that fields will be given this order of precedence should there be a
   naming conflict with any of these three sources.

   1. Fields specified in the prototype properties
   2. Fields from a mixed-in form
   3. Fields from the Form being inherited from

.. js:class:: Form([kwargs])

   Inherits from BaseForm and registers DeclarativeFieldsMeta to be used to set
   up Fields when this constructor is inherited from.

   It is intended as the entry point for defining your own forms. You can do
   this using its ``extend()`` function, which is provided by `Concur`_

   .. js:function:: Form.extend({prototypeProps, constructorProps})

      Creates a new constrctor which inherits from Form. The new form's fields
      and prototype properties, such as validation methods, should be passed as
      ``prototypeProps``.

   .. _`Concur`: https://github.com/insin/concur
