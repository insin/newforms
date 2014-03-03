======
Fields
======

For a guide to the features of the Fields API, please refer to the Django
documentation:

   * `Django documentation -- Form fields <https://docs.djangoproject.com/en/dev/ref/forms/fields/>`_

API
===

.. js:class:: Field([kwargs])

   An object that is responsible for doing validation and normalisation, or
   "cleaning" -- for example: an :js:class:`EmailField` makes sure its data is a
   valid e-mail address -- and makes sure that acceptable "blank" values all
   have the same representation.

   :param Object kwargs: field options.

   .. js:attribute:: kwargs.required

      determines if the field is required - defaults to ``true``.

      :type: Boolean

   .. js:attribute:: kwargs.widget

      overrides the widget used to render the field - if not provided, the
      field's default will be used.

      :type: Widget

   .. js:attribute:: kwargs.label

      the label to be displayed for the field - if not provided, will be
      generated from the field's name.

      :type: String

   .. js:attribute:: kwargs.initial

      an initial value for the field to be used if none is specified by the
      field's form.

   .. js:attribute:: kwargs.helpText

      help text for the field.

      :type: String

   .. js:attribute:: kwargs.errorMessages

      custom error messages for the field.

      :type: Object

   .. js:attribute:: kwargs.showHiddenInitial

      specifies if it is necessary to render a hidden widget with initial value
      after the widget.

      :type: Boolean

   .. js:attribute:: kwargs.validators

      list of addtional validators to use

      :type: Array

   .. js:attribute:: kwargs.cssClass

      space-separated CSS classes to be applied to the field's container when
      default rendering fuctions are used.

      :type: String

   .. js:attribute:: kwargs.custom

      this argument is provided to pass any custom metadata you require on the
      field, e.g. extra per-field options for a custom layout you've
      implemented. Newforms will set anything you pass as this argument on a
      ``custom`` instance property on the field.

   **Prototype Functions**

   .. js:function:: Field#prepareValue(value)

      Hook for any pre-preparation required before a value cane be used.

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

   :param Object kwargs: field options additional to those specified in Field.

   .. js:attribute:: kwargs.maxLength

      a maximum valid length for the input string.

      :type: Number

   .. js:attribute:: kwargs.minLength

      a minimum valid length for the input string.

      :type: Number

.. js:class:: IntegerField([kwargs])

   Validates that its input is a valid integer.

   :param Object kwargs: field options additional to those specified in Field.

   .. js:attribute:: kwargs.maxValue

      a maximum value for the input.

      :type: Number

   .. js:attribute:: kwargs.minValue

      a minimum value for the input.

      :type: Number

.. js:class:: FloatField([kwargs])

   Validates that its input is a valid float.

   :param Object kwargs: field options additional to those specified in Field.

   .. js:attribute:: kwargs.maxValue

      a maximum value for the input.

      :type: Number

   .. js:attribute:: kwargs.minValue

      a minimum value for the input.

      :type: Number

.. js:class:: DecimalField([kwargs])

   Validates that its input is a decimal number.

   :param Object kwargs: field options additional to those specified in Field.

   .. js:attribute:: kwargs.maxValue

      a maximum value for the input.

      :type: Number

   .. js:attribute:: kwargs.minValue

      a minimum value for the input.

      :type: Number

   .. js:attribute:: kwargs.maxDigits

      the maximum number of digits the input may contain.

      :type: Number

   .. js:attribute:: kwargs.decimalPlaces

      the maximum number of decimal places the input may contain.

      :type: Number

.. js:class:: BaseTemporalField([kwargs])

   Base field for fields which validate that their input is a date or time.

   :param Object kwargs: field options

   .. js:attribute:: kwargs.inputFormats

      a list of `time.strptime() format strings`_ which are considered valid.

      :type: Array

.. js:class:: DateField([kwargs])

   Validates that its input is a date.

.. js:class:: TimeField([kwargs])

   Validates that its input is a time.

.. js:class:: DateTimeField([kwargs])

   Validates that its input is a date/time.

.. js:class:: RegexField(regex[, kwargs])

   Validates that its input matches a given regular expression.

   :param RegExp|String regex: a regular expression.
   :param Object kwargs: field options

.. js:class:: EmailField([kwargs])

   Validates that its input appears to be a valid e-mail address.

.. js:class:: FileField([kwargs])

   Validates that its input is a valid uploaded file.

   :param Object kwargs: field options

   .. js:attribute:: kwargs.maxLength

      maximum length of the uploaded file anme.

      :type: Number

   .. js:attribute:: kwargs.allowEmptyFile

      if ``true``, empty files will be allowed -- defaults to ``false``.

      :type: Boolean

.. js:class:: ImageField([kwargs])

   Validates that its input is a valid uploaded image.

.. js:class:: URLField([kwargs])

   Validates that its input appears to be a valid URL.

.. js:class:: BooleanField([kwargs])

   Normalises its input to a boolean primitive.

.. js:class:: NullBooleanField([kwargs])

   A field whose valid values are ``null``, ``true`` and ``false``.

   Invalid values are cleaned to ``null``.

.. js:class:: ChoiceField([kwargs])

   Validates that its input is one of a valid list of choices.

   :param Object kwargs: field options

   .. js:attribute:: kwargs.choices

      a list of choices - each choice should be specified as a list containing
      two items; the first item is a value which should be validated against,
      the second item is a display value for that choice, for example::

         {choices: [[1, 'One'], [2, 'Two']]}

      Defaults to ``[]``.

      :type: Array

   .. js:function:: ChoiceField#choices()

      Returns the current list of choices.

   .. js:function:: ChoiceField#setChoices(choices)

      Updates choices on this field and on its widget.

.. js:class:: TypedChoiceField([kwargs])

   A ChoiceField which returns a value coerced by some provided function.

   :param Object kwargs: field options

   .. js:attribute:: kwargs.coerce

      a function which takes the String value output by ChoiceField's clean
      method and coerces it to another type - defaults to a function which
      returns the given value unaltered.

      :type: Function

   .. js:attribute:: kwargs.emptyValue (Object)

      the value which should be returned if the selected value can be validly
      empty - defaults to ``''``.

.. js:class:: MultipleChoiceField([kwargs])

   Validates that its input is one or more of a valid list of choices.

.. js:class:: TypedMultipleChoiceField([kwargs])

   A MultipleChoiceField} which returns values coerced by some provided
   function.

   :param Object kwargs:
      field options additional to those specified in MultipleChoiceField.

   .. js:attribute:: kwargs.coerce (Function)

      function which takes the String values output by
      MultipleChoiceField's toJavaScript method and coerces it to another
      type - defaults to a function which returns the given value
      unaltered.

   .. js:attribute:: kwargs.emptyValue (Object)

      the value which should be returned if the selected value can be
      validly empty - defaults to ``''``.

.. js:class:: FilePathField([kwargs])

   Allows choosing from files inside a certain directory.

   :param String path:
      The absolute path to the directory whose contents you want listed -
      this directory must exist.
   :param Object kwargs:
      field options additional to those supplied in ChoiceField.

   .. js:attribute:: kwargs.match (String|RegExp)

      a regular expression pattern - if provided, only files with names
      matching this expression will be allowed as choices.

   .. js:attribute:: kwargs.recursive (Boolean)

      if ``true``, the directory will be descended into recursively and all
      descendants will be listed as choices - defaults to ``false``.

.. js:class:: ComboField([kwargs])

   A Field whose ``clean()`` method calls multiple Field ``clean()`` methods.

   :param Object kwargs: field options additional to those specified in Field.

   .. js:attribute:: kwargs.fields (Array)

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

   .. js:attribute:: kwargs.fields

      a list of fields to be used to clean a "decompressed" list of values.

      :type: Array

   .. js:attribute:: kwargs.requireAllFields

      when set to ``false``, allows optional subfields. The required attribute
      for each individual field will be respected, and a new ``'incomplete'``
      validation error will be raised when any required fields are empty.
      Defaults to ``true``.

.. js:class:: SplitDateTimeField([kwargs])

   A MultiValueField consisting of a DateField and a TimeField.

.. js:class:: IPAddressField([kwargs])

   Validates that its input is a valid IPv4 address.

.. js:class:: GenericIPAddressField([kwargs])

   Validates that its input is a valid IPv4 or IPv6 address.

   :param Object kwargs: field options

   .. js:attribute:: kwargs.protocol

      determines which protocols are accepted as input. One of:

      * ``'both'``
      * ``'ipv4'``
      * ``'ipv6'``

      :type: String

   .. js:attribute:: kwargs.unpackIPv4

      Determines if an IPv4 address that was mapped in a compressed IPv6 address
      will be unpacked.

      Defaults to ``false`` and can only be set to ``true`` if
      ``kwargs.protocol`` is ``'both'``.

      :type: Boolean

.. js:class:: SlugField([kwargs])

   Validates that its input is a valid slug.

.. _`time.strptime() format strings`: https://github.com/insin/isomorph#formatting-directives