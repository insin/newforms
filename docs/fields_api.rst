==========
Fields API
==========

``Field``
=========

.. js:class:: Field([kwargs])

   An object that is responsible for doing validation and normalisation, or
   "cleaning" -- for example: an :js:class:`EmailField` makes sure its data is a
   valid e-mail address -- and makes sure that acceptable "blank" values all
   have the same representation.

   :param Object kwargs: field options, which are as follows:

   :param Boolean kwargs.required:
      determines if the field is required -- defaults to ``true``.

   :param Widget kwargs.widget:
      overrides the widget used to render the field -- if not provided, the
      field's default will be used.

   :param String kwargs.label:
      the label to be displayed for the field - if not provided, will be
      generated from the field's name.

   :param kwargs.initial:
      an initial value for the field to be used if none is specified by the
      field's form.

   :param String kwargs.helpText:
      help text for the field.

   :param Object kwargs.errorMessages:
      custom error messages for the field, by error code.

   :param Boolean kwargs.showHiddenInitial:
      specifies if it is necessary to render a hidden widget with initial value
      after the widget.

   :param Array.<Function> kwargs.validators:
      list of addtional validators to use - a validator is a function which
      takes a single value and throws a ValidationError if it's invalid.

   :param String kwargs.cssClass:
      space-separated CSS classes to be applied to the field's container when
      default rendering fuctions are used.

   :param kwargs.custom:
      .. _ref-fields-field-custom:

      this argument is provided to pass any custom metadata you require on the
      field, e.g. extra per-field options for a custom layout you've
      implemented. Newforms will set anything you pass for this argument in a
      ``custom`` instance property on the field.

      .. versionadded:: 0.5

   :param kwargs.validation:
      Configures validation when the user interacts with this field's widget in
      the browser.

      This can be used to configure validation for only specific fields, or to
      override any form-wide validation that's been configured.

      Takes the same arguments as :ref:`Form's validation configuration <ref-form-kwargs-validation>`

      If validation configuration is given, the Form containing the Field
      **must** be configured with an :ref:`onStateChange callback <ref-form-kwargs-onstatechange>`,
      or an Error will be thrown.

      .. versionadded:: 0.6

   **Prototype Functions**

   .. js:function:: Field#prepareValue(value)

      Hook for any pre-preparation required before a value can be used.

   .. js:function:: Field#toJavaScript(value)

      Hook for coercing a value to an appropriate JavaScript object.

   .. js:function:: Field#isEmptyValue(value)

      Checks for the given value being ``===`` one of the configured empty values
      for this field, plus any additional checks required due to JavaScript's
      lack of a generic object equality checking mechanism.

      This function will use the field's ``emptyValues`` property for the
      ``===`` check -- this defaults to ``[null, undefined, '']`` via
      ``Field.prototype``.

      If the field has an ``emptyValueArray`` property which is ``true``, the
      value's type and length will be checked to see if it's an empty Array --
      this defaults to ``true`` via ``Field.prototype``.

   .. js:function:: Field#validate(value)

      Hook for validating a value.

   .. js:function:: Field#clean(value)

      Validates the given value and returns its "cleaned" value as an
      appropriate JavaScript object.

      Raises :js:class:`ValidationError` for any errors.

.. js:class:: CharField([kwargs])

   Validates that its input is a valid string.

   :param Object kwargs:
      field options additional to those specified in :js:class:`Field`:

   :param Number kwargs.maxLength:
      a maximum valid length for the input string.

   :param Number kwargs.minLength:
      a minimum valid length for the input string.

Numeric fields
==============

.. js:class:: IntegerField([kwargs])

   Validates that its input is a valid integer.

   :param Object kwargs:
      field options additional to those specified in :js:class:`Field`:

   :param Number kwargs.maxValue:
      a maximum valid value for the input.

   :param Number kwargs.minValue:
      a minimum valid value for the input.

.. js:class:: FloatField([kwargs])

   Validates that its input is a valid float.

   :param Object kwargs:
      field options additional to those specified in :js:class:`Field`:

   :param Number kwargs.maxValue:
      a maximum valid value for the input.

   :param Number kwargs.minValue:
      a minimum valid value for the input.

.. js:class:: DecimalField([kwargs])

   Validates that its input is a decimal number.

   :param Object kwargs:
      field options additional to those specified in :js:class:`Field`:

   :param Number kwargs.maxValue:
      a maximum value for the input.

   :param Number kwargs.minValue:
      a minimum value for the input.

   :param Number kwargs.maxDigits:
      the maximum number of digits the input may contain.

   :param Number kwargs.decimalPlaces:
      the maximum number of decimal places the input may contain.

Date/Time fields
================

.. js:class:: DateField([kwargs])

   Validates that its input is a date.

   Normalises to a ``Date`` with its time fields set to zero.

   :param Object kwargs:
      field options additional to those specified in :js:class:`Field`:

   :param Array.<String> kwargs.inputFormats:
      a list of `time.strptime() format strings`_ which are considered valid.

.. js:class:: TimeField([kwargs])

   Validates that its input is a time.

   Normalises to a ``Date`` with its date fields set to 1900-01-01.

   :param Object kwargs:
      field options additional to those specified in :js:class:`Field`:

   :param Array.<String> kwargs.inputFormats:
      a list of `time.strptime() format strings`_ which are considered valid.

.. js:class:: DateTimeField([kwargs])

   Validates that its input is a date/time.

   Normalises to a ``Date``.

   :param Object kwargs:
      field options additional to those specified in :js:class:`Field`:

   :param Array.<String> kwargs.inputFormats:
      a list of `time.strptime() format strings`_ which are considered valid.

Format fields
=============

.. js:class:: RegexField(regex[, kwargs])

   Validates that its input matches a given regular expression.

   :param regex:
      a regular expression to validate input against. If a string is given, it
      will be compiled to a RegExp.
   :type regex: RegExp or String

   :param Object kwargs:
     field options, as in :js:class:`CharField`

.. js:class:: EmailField([kwargs])

   Validates that its input appears to be a valid e-mail address.

   :param Object kwargs:
     field options, as in :js:class:`CharField`

.. js:class:: IPAddressField([kwargs])

   Validates that its input is a valid IPv4 address.

   .. deprecated:: 0.5
      use :js:class:`GenericIPAddressField` instead.

.. js:class:: GenericIPAddressField([kwargs])

   Validates that its input is a valid IPv4 or IPv6 address.

   :param Object kwargs:
      field options additional to those specified in :js:class:`CharField`

   :param String kwargs.protocol:
      determines which protocols are accepted as input. One of:

      * ``'both'``
      * ``'ipv4'``
      * ``'ipv6'``

      Defaults to ``'both'``.

   :param Boolean kwargs.unpackIPv4:
      Determines if an IPv4 address that was mapped in a compressed IPv6 address
      will be unpacked. Defaults to ``false`` and can only be set to ``true`` if
      ``kwargs.protocol`` is ``'both'``.

.. js:class:: SlugField([kwargs])

   Validates that its input is a valid slug - i.e. that it contains only
   letters, numbers, underscores, and hyphens.

   :param Object kwargs:
     field options, as in :js:class:`CharField`

File fields
===========

.. js:class:: FileField([kwargs])

   Validates that its input is a valid uploaded file -- the behaviour of this
   field varies depending on the environmnet newforms is running in:

   **On the client**

      Validates that a file has been selected if the field is ``required``.

   **On the server**

      Validates uploaded file data from ``form.files``.

      The contents of ``form.files`` are expected to have a ``name`` property
      corresponding to the uploaded file's name and a ``size`` property
      corresponding to it size.

      You will need write a wrapper to provide this information depending on how
      you're handling file uploads.

   :param Object kwargs:
     field options additional to those specified in :js:class:`Field`

   :param Number kwargs.maxLength:
      maximum length of the uploaded file anme.

   :param Boolean kwargs.allowEmptyFile:
      if ``true``, empty files will be allowed -- defaults to ``false``.

.. js:class:: ImageField([kwargs])

   Validates that its input is a valid uploaded image -- the behaviour of this
   field varies depending on the environmnet newforms is running in:

   **On the client**

      Validates that a file has been selected if the field is ``required``.

   **On the server**

      .. Note::

         As of newform 0.5, server-side image validation has not been
         implemented yet -- ``ImageField`` performs the same validation as
         ``FileField``.

   Adds an ``accept="image/*"`` attribute to its ``<input type="file">`` widget.

.. js:class:: URLField([kwargs])

   Validates that its input appears to be a valid URL.

   :param Object kwargs:
     field options, as in :js:class:`CharField`

Boolean fields
==============

.. js:class:: BooleanField([kwargs])

   Normalises its input to a boolean primitive.

   :param Object kwargs:
      field options, as in :js:class:`Field`

.. js:class:: NullBooleanField([kwargs])

   A field whose valid values are ``null``, ``true`` and ``false``.

   Invalid values are cleaned to ``null``.

   :param Object kwargs:
      field options, as in :js:class:`Field`

Choice fields
=============

.. js:class:: ChoiceField([kwargs])

   Validates that its input is one of a valid list of choices.

   :param Object kwargs:
      field options additional to those specified in :js:class:`Field`:

   :param Array kwargs.choices:
      a list of choices - each choice should be specified as a list containing
      two items; the first item is a value which should be validated against,
      the second item is a display value for that choice, for example::

         {choices: [[1, 'One'], [2, 'Two']]}

      Defaults to ``[]``.

   **Prototype Functions**

   .. js:function:: ChoiceField#choices()

      Returns the current list of choices.

   .. js:function:: ChoiceField#setChoices(choices)

      Updates the list of choices on this field and on its configured widget.

.. js:class:: TypedChoiceField([kwargs])

   A ChoiceField which returns a value coerced by some provided function.

   :param Object kwargs:
      field options additional to those specified in :js:class:`ChoiceField`:

   :param kwargs.coerce:
      a function which takes the string value output from ``ChoiceField``'s
      clean method and coerces it to another type -- defaults to a function
      which returns the given value unaltered.
   :type kwargs.coerce: Function(String)

   :param kwargs.emptyValue:
      the value which should be returned if the selected value can be validly
      empty -- defaults to ``''``.

.. js:class:: MultipleChoiceField([kwargs])

   Validates that its input is one or more of a valid list of choices.

.. js:class:: TypedMultipleChoiceField([kwargs])

   A MultipleChoiceField} which returns values coerced by some provided
   function.

   :param Object kwargs:
      field options additional to those specified in MultipleChoiceField.

   :param kwargs.coerce: (Function)

      function which takes the String values output by
      MultipleChoiceField's toJavaScript method and coerces it to another
      type -- defaults to a function which returns the given value
      unaltered.

   :param kwargs.emptyValue: (Object)

      the value which should be returned if the selected value can be
      validly empty -- defaults to ``''``.

.. js:class:: FilePathField([kwargs])

   .. Note::

      As of newform 0.5, server-side logic for ``FilePathField`` hasn't been
      implemented yet.

      As such, this field isn't much use yet and the API documentation below is
      speculative.

   Allows choosing from files inside a certain directory.

   :param String path:
      The absolute path to the directory whose contents you want listed -
      this directory must exist.

   :param Object kwargs:
      field options additional to those supplied in :js:class:`ChoiceField`.

   :param kwargs.match:
      a regular expression pattern -- if provided, only files with names
      matching this expression will be allowed as choices. If a string is
      given, it will be compiled to a ``RegExp``.
   :type kwargs.match: String or RegExp

   :param Boolean kwargs.recursive:
      if ``true``, the directory will be descended into recursively and all
      allowed descendants will be listed as choices -- defaults to ``false``.

   :param Boolean kwargs.allowFiles:
      if ``true``, files will be listed as choices. Defaults to ``true``.

   :param Boolean kwargs.allowFolders:
      if ``true``, folders will be listed as choices. Defaults to ``false``.

Slightly complex fields
=======================

.. js:class:: ComboField([kwargs])

   A Field whose ``clean()`` method calls multiple Field ``clean()`` methods.

   :param Object kwargs:
      field options additional to those specified in :js:class:`Field`.

   :param Array.<Field> kwargs.fields:
      fields which will be used to perform cleaning, in the order they're given.

.. js:class:: MultiValueField([kwargs])

   A Field that aggregates the logic of multiple Fields.

   Its ``clean()`` method takes a "decompressed" list of values, which
   are then cleaned into a single value according to ``this.fields``.
   Each value in this list is cleaned by the corresponding field -- the first
   value is cleaned by the first field, the second value is cleaned by the
   second field, etc. Once all fields are cleaned, the list of clean values is
   "compressed" into a single value.

   Subclasses should not have to implement ``clean()``. Instead, they must
   implement ``compress()``, which takes a list of valid values and returns a
   "compressed" version of those values -- a single value.

   You'll probably want to use this with :js:class:`MultiWidget`.

   :param Object kwargs: field options

   :param Array.<Field> kwargs.fields:
      a list of fields to be used to clean a "decompressed" list of values.

   :param Boolean kwargs.requireAllFields:
      when set to ``false``, allows optional subfields. The required attribute
      for each individual field will be respected, and a new ``'incomplete'``
      validation error will be raised when any required fields are empty.
      Defaults to ``true``.

.. js:class:: SplitDateTimeField([kwargs])

   A MultiValueField consisting of a :js:class:`DateField` and a :js:class:`TimeField`.

.. _`time.strptime() format strings`: https://github.com/insin/isomorph#formatting-directives
