=========
Forms API
=========

``Form``
========

.. js:class:: Form([kwargs])

   Extends :js:class:`BaseForm` and registers :js:func:`DeclarativeFieldsMeta`
   as a mixin to be used to set up Fields when this constructor is extended.

   This is intended to be used as the entry point for defining your own forms.

   You can do this using its static ``extend()`` function, which is provided by
   `Concur`_.

   .. js:function:: Form.extend(prototypeProps[, constructorProps])

      Creates a new constructor which inherits from Form.

      :param Object prototypeProps:
         form Fields and other prototype properties for the new form, such as a
         custom constructor and validation methods.

      :param Object constructorProps:
         properties to be set directly on the new constructor function.

.. js:function:: DeclarativeFieldsMeta(prototypeProps)

   This mixin function is responsible for setting up form fields when a new Form
   constructor is being created.

   It pops any Fields it finds off the form's prototype properties object,
   determines if any forms are also being mixed-in via a ``__mixins__`` property
   and handles inheritance of Fields from any form which is being directly
   extended, such that fields will be given the following order of precedence
   should there be a naming conflict with any of these three sources:

   1. Fields specified in ``prototypeProps``
   2. Fields from a mixed-in form
   3. Fields from the Form being inherited from

   If multiple forms are provided via ``__mixins__``, they will be processed from
   left to right in order of precedence for mixing in fields and prototype
   properties.

   Forms can prevent fields from being inherited or mixed in by adding a
   same-named property to their prototype, which isn't a Field. It's suggested
   that you use ``null`` as the value when shadowing to make this intent more
   explicit.

.. js:function:: isFormAsync(Form)

   :params Form Form: a Form constructor

   :returns:
      ``true`` if the given Form constructor's prototype defines any custom
      cleaning methods which have an arity of 1 (which is assumed to mean they
      have defined an async callback parameter).

``BaseForm``
============

.. js:class:: BaseForm([kwargs])

   A collection of Fields that knows how to validate and display itself.

   :param Object kwargs: form options, which are as follows:

   :param Object kwargs.data:
      input form data, where property names are field names. A form with data is
      considered to be "bound" and ready for use validating and coercing the
      given data.

   :param Object kwargs.files:
      input file data.

   :param ErrorObject kwargs.errors:
      initial errors to be displayed.

      .. Note::
         Passing initial errors will prevent validation from firing if a form
         has input ``data`` and ``isValid()`` or ``errors()`` are called during
         rendering.

      This argument is intended for redisplaying a form with the user's input
      and errors received from another source, such as an API call.

      This is more typical of server-side usage.

   :param kwargs.validation:
      .. _ref-form-kwargs-validation:

      Configures form-wide interactive validation when the user makes changes to
      form inputs in the browser. This can be a String, or an Object which
      configures default validation for form inputs.

      If ``'manual'``, interactive validation will not be performed -- you are
      responsible for hooking up validation and using methods such as
      ``setData()`` and ``isValid()`` to perform all validation. This is the
      default setting.

      If an Object is given, it should have the following properties:

      ``on``
         The name of the default event to use to trigger validation. For
         example, if ``'blur'``, text input validation will be performed when
         the input loses focus after editing. Multiple, space-separated event
         names can be given.

      ``onChangeDelay``
         A delay, in milliseconds, to be used to debounce performing of
         ``onChange`` validation.

      If ``'auto'``, validation behaviour will be the equivalent of having
      passed:

      ..code-block: javascript

         validation: {on: 'blur change', onChangeDelay: 369}

      If any String but ``'manual'`` or ``'auto'`` is given, it will be used as
      if it were passed as the ``on`` property of an Object.

      For example, passing ``{validation: 'change'}`` will cause form inputs to
      trigger validation as soon as the user makes any change.

      .. versionadded:: 0.6

   :param Boolean kwargs.controlled:
      Configures whether or not the form will render controlled components -
      when using controlled components, you can update the values displayed in
      the form after its initial render using ``form.setData()`` or
      ``form.updateData()``

      .. versionadded:: 0.6

   :param Function kwargs.onChange:
      .. _ref-form-kwargs-onchange:

      If interactive validation is configured for a Form or any of its Fields,
      this callback function **must** be provided, or an Error will be thrown.

      It will be called any time the form's input data or validation state
      changes as the result of user input.

      Typically, this function should at least force React to update the component
      in which the Form is being rendered, to display the latest validation state
      to the user from the last change they made to the form.

      .. versionadded:: 0.9
         Replaces ``kwargs.onStateChange``

   :param String kwargs.autoId:
      a template for use when automatically generating ``id`` attributes for
      fields, which should contain a ``{name}`` placeholder for the field name
      -- defaults to ``id_{name}``.

   :param String kwargs.prefix:
      a prefix to be applied to the name of each field in this instance of the
      form - using a prefix allows you to easily work with multiple instances of
      the same Form object in the same HTML ``<form>``, or to safely mix Form
      objects which have fields with the same names.

   :param Object kwargs.initial:
      initial form data, where property names are field names -- if a field's
      value is not specified in ``data``, these values will be used when
      initially rendering field widgets.

   :param Function kwargs.errorConstructor:
      the constructor function to be used when creating error details. Defaults
      to :js:class:`ErrorList`.

   :param String kwargs.labelSuffix:
      a suffix to be used when generating labels in one of the convenience
      methods which renders the entire Form -- defaults to ``':'``.

   :param Boolean kwargs.emptyPermitted:
      if ``true``, the form is allowed to be empty -- defaults to ``false``.

   **Instance Properties**

   Form options documented in ``kwargs`` above are all set as instance
   properties.

   The following instance properties are also available:

   .. js:attribute:: form.fields

      Form fields for this instance of the form.

      Since a particular instance might want to alter its fields based on data
      passed to its constructor, fields given as part of the form definition
      are deep-copied into ``fields`` every time a new instance is created.

      Instances should only ever modify ``fields``.

      .. Note::

         ``fields`` does not exist until the ``BaseForm`` constructor has been
         called on the form instance that's being constructed.

         This is important to note when you intend to dynamically modify
         ``fields`` when extending a form -- you must call the constructor of
         the form which has been extended before attempting to modify
         ``fields``.

      :type: Object with field names as property names and Field instances as properties.

   .. js:attribute:: form.isInitialRender

      Determines if this form has been given input data which can be validated.

      ``true`` if the form has ``data`` or ``files`` set.

   .. js:attribute:: form.cleanedData

      After a form has been validated, it will have a ``cleanedData`` property.
      If your data does *not* validate, ``cleanedData`` will contain only the
      valid fields.

      :type:
         Object with field names as property names and valid, cleaned values
         coerced to the appropriate JavaScript type as properties.

   **Prototype Functions**

   **Validation:** Methods for validating and getting information about the
   results of validation:

   .. js:function:: BaseForm#validate([form[, callback(err, isValid, cleanedData)]])

      Forces the form to revalidate from scratch. If a ``<form>`` is given, data
      from it will be set on this form first. Otherwise, validation will be done
      with this form's current input data.

      :param form:
        a ``<form>`` DOM node -- if React's representation of the ``<form>``
        is given, its ``getDOMNode()`` function will be called to get the real
        DOM node.

      :param function(Error, Boolean, Object) callback:
         Callback for asynchronous validation.

         This argument is required if the form uses asynchronous validation - an
         Error will be thrown if it's not given in this case.

         The callback should be an errback with the signature
         ``(err, isValid, cleanedData)``.

      :return:
         ``true`` if the form only has synchronous validation and is valid.

      .. versionadded:: 0.6

      .. versionchanged:: 0.10
         Added callback argument for async validation.

   .. js:function:: BaseForm#fullClean()

      Validates and cleans ``forms.data`` and populates errors and ``cleanedData``.

      You shouldn't need to call this function directly in general use, as it's
      called for you when necessary by :js:func:`BaseForm#isValid` and
      :js:func:`BaseForm#errors`.

   .. js:function:: BaseForm#partialClean(fieldNames)

      Validates and cleans ``form.data`` for the given field names and triggers
      cross-form cleaning in case any ``form.cleanedData`` it uses has changed.

      :param Array fieldNames: a list of unprefixed field names.

   .. js:function:: BaseForm#clean([callback(err, validationError)])

      Hook for doing any extra form-wide cleaning after each Field's
      :js:func:`Field#clean` has been called. Any :js:class:`ValidationError`
      thrown by this method will not be associated with a particular field; it
      will have a special-case association with the field named ``'__all__'``.

      :param function(Error, String|ValidationError) callback:
         Optional callback for asynchronous validation.

      .. versionchanged:: 0.10
         This method can now be defined with a ``callback`` parameter if it
         needs to perform async validation. The form will provide a callback
         function and wait for it to be called before finishing validation.

   **Data mutability:** Methods for programmatically changing the form's data.

   .. js:function:: BaseForm#reset([initialData])

      Resets the form to its initial render state, optionally giving it new
      initial data.

      :param Object initialData:
         new initial data for the form.

      .. versionadded:: 0.6

   .. js:function:: BaseForm#setData(data[, kwargs])

      Replaces the form's :js:attr:`form.data` with the given data (and flips
      :js:attr:`form.isInitialRender` to ``false``, if necessary) and triggers
      form cleaning and validation, returning the result of ``form.isValid()``.

      :param Object data: new input data for the form

      :param Object kwargs: data updating options, which are as follows:

      :param Boolean kwargs.prefixed:
         pass ``true`` when updating data in a prefixed form and the field
         names in ``data`` are already prefixed -- defaults to ``false``

         .. versionadded:: 0.6

      :return:
         ``true`` if the form has no errors after validating the updated data,
         ``false`` otherwise.

      .. versionadded:: 0.5

   .. js:function:: BaseForm#setFormData(formData)

      Replaces with form's input data with data extracted from a ``<form>`` (i.e.
      with :js:func:`formData`).

      When using multiple forms with prefixes, form data will always be prefixed -
      using this method when working with manually extracted form data should
      ensure there are no surprises if moving from non-prefixed forms to prefixed
      forms.

      :param Object formData:
         new input data for the form, which has been extracted from a ``<form>``

       .. versionadded:: 0.6

   .. js:function:: BaseForm#updateData(data[, kwargs])

      Updates the form's :js:attr:`form.data` (and flips
      :js:attr:`form.isInitialRender` to ``false``, if necessary).

      By default, triggers validation of fields which had their input data
      updated, as well as form-wide cleaning.

      :param Object data:
         partial input data for the form, field name -> input data.

         If your form has a :ref:`prefix <ref-form-prefixes>`, field names in
         the given data object must also be prefixed.

      :param Object kwargs: data updating options, which are as follows:

      :param Boolean kwargs.prefixed:
         pass ``true`` when updating data in a prefixed form and the field
         names in ``data`` are already prefixed -- defaults to ``false``

      The follwing options are intended for use with controlled forms, when
      you're only updating data in order to change what's displayed in the
      controlled components:

      :param Boolean kwargs.validate:
         pass ``false`` if you want to skip validating the  updated fields --
         defaults to ``true``. This can be ignored if you're passing known-good
         data.

      :param Boolean kwargs.clearValidation:
         pass ``false`` if you're skipping validation and you also want to skip
         clearing of the results of any previous validation on the fields being
         updated, such as error messages and ``cleanedData`` -- defaults to
         ``true``

      .. versionadded:: 0.6

   **BoundFields:** Methods which create BoundField helpers for rendering the
   form's fields.

   .. js:function:: BaseForm#boundFields([test])

      Creates a :js:class:`BoundField` for each field in the form, in the order
      in which the fields were created.

      :param Function(field,name) test:

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

   **Error:** Methods for wokring with the form's validation errors.

   .. js:function:: BaseForm#addError(field, error)

      This function allows adding errors to specific fields from within the
      ``form.clean()`` method, or from outside the form altogether.

      :param String field:
         the name of the field to which the error(s) should be added. If its
         value is ``null`` the error will be treated as a non-field error as
         returned by ``form.nonFieldErrors()``.

      :param String|Array|ValidationError|Object error:
         the error argument can be a single error, a list of errors, or an
         object that maps field names to lists of errors. A single error can be
         given as a String or an instance of a :js:class:`ValidationError`.

         Multiple errors can be given as an Array, an Object which maps field
         names to validation errors, or a ValidationError created with an Array
         or Object.

      If the ``error`` argument is an Object, the ``field`` argument *must* be
      ``null`` -- errors will be added to the fields that correspond to the
      properties of the object.

      .. Note::
          Using ``form.addError()`` automatically removes the relevant field
          from :js:attr:`form.cleanedData`.

      .. versionadded:: 0.5

      .. versionchanged:: 0.10
         ``addErrpr()`` will no longer add a duplicated error message for the
         same field. This can happen if event-based validation which runs
         repeatedly adds errors to a field other than that which triggered the
         validation, such as in a custom ``clean()`` method.

   .. js:function:: BaseForm#errors()

      Getter for validation errors which first cleans the form if there are no
      errors defined yet.

      :returns: validation errors for the form, as an :js:class:`ErrorObject`

   .. js:function:: BaseForm#nonFieldErrors()

      :returns:
         errors that aren't associated with a particular field - i.e., errors
         generated by :js:func:`BaseForm#clean`, or by calling
         :js:func:`BaseForm#addError` and passing ``null`` instead of a field
         name. Will be an empty error list object if there are none.

   .. js:function:: BaseForm#setErrors(errors)

      This method's intended use is replacing a Form's errors with those
      received from another source, such as an API call which performs
      additional validation.

      :param ErrorObject errors:

   **Changes:** methods for working with changed data.

   .. js:function:: BaseForm#changedData()

      :returns:
         a list of the names of fields which have differences between their
         initial and currently bound values.

   .. js:function:: BaseForm#hasChanged()

      :returns: ``true`` if data differs from initial, ``false`` otherwise.

   **Status**: methods for determining the form's status:

   .. js:function:: BaseForm#isAsync()

      :returns:
         ``true`` if the form's prototype defines any custom cleaning methods
         which have an arity of 1 (which is assumed to mean they have defined an
         async callback parameter).

      .. versionadded:: 0.10

   .. js:function:: BaseForm#isComplete()

      Determines whether or not the form has valid input data for all required
      fields. This can be used to indicate to the user that a form which is
      being validated as they fill it in is ready for submission.

      A form which has any errors or is pending async validation will not be
      considered complete.

      The distinction between ``isComplete()`` and :js:func:`BaseForm#isValid()`
      is that a form which has had, for example, a single field filled in and
      validated is valid according to the partial validation which has been
      performed so far (i.e. it doesn't have any error messages) but isn't yet
      complete.

      .. versionadded:: 0.6

      .. versionchanged:: 0.10
         A form which ``isPending()`` will not be considered complete.

   .. js:function:: BaseForm#isMultipart()

      Determines if the form needs to be multipart-encoded in other words, if it
      has a :js:class:`FileInput`.

      :returns: ``true`` if the form needs to be multipart-encoded.

   .. js:function:: BaseForm#isPending()

      :returns:
         ``true`` if true if the form is waiting for async validation to
         complete.

   .. js:function:: BaseForm#isValid()

      Determines whether or not the form has errors, triggering cleaning of the
      form first if necessary.

      When user input is being incrementally validated as it's given, this
      function gives you the current state of validation (i.e. whether or not
      there are any errors). It will not reflect the validity of the whole form
      until a method which performs whole-form validation
      (:js:func:`BaseForm#validate` or :js:func:`setData`) has been called.

      :return:
         ``true`` if the form is has input data and has no errors, ``false``
         otherwise. If errors are being ignored, returns ``false``.

   .. js:function:: BaseForm#nonFieldPending()

      :return:
         `true`` if the form is waiting for async validation of its
         ``clean(callback)`` method to complete.

      .. versionadded:: 0.10

   .. js:function:: BaseForm#notEmpty()

      Determines if a form which is an extra form in a FormSet has changed from
      its initial values. Extra forms are allowed to be empty, so required fields
      in them do not become truly required until the form has been modified.

      :returns:
         ``true`` if a form has ``emptyPermitted`` and has changed from its
         initial values.

      .. versionadded:: 0.9

   **Prefixes:** Methods for working with form prefixes.

   .. js:function:: BaseForm#addPrefix(fieldName)

      :returns:
         the given field name with a prefix added, if this Form has a prefix.

   .. js:function:: BaseForm#addInitialPrefix(fieldName)

      Adds an initial prefix for checking dynamic initial values.

   .. js:function:: BaseForm#removePrefix(fieldName)

      :returns:
         the given field name with a prefix-size chunk chopped off the start
         if this form has a prefix set and the field name starts with it.

.. _`Concur`: https://github.com/insin/concur#api
