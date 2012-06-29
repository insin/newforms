======
Fields
======

Guide
=====

TBD

API
===

.. js:class:: Field([kwargs])

   An object that is responsible for doing validation and normalisation, or
   "cleaning" -- for example: an EmailField makes sure its data is a valid
   e-mail address -- and makes sure that acceptable "blank" values all have the
   same representation.

   :param Object kwargs: field options.

   .. js:attribute:: kwargs.required (Boolean)

      determines if the field is required - defaults to ``true``.

   .. js:attribute:: kwargs.widget (Widget)

      overrides the widget used to render the field - if not provided, the
      field's default will be used.

   .. js:attribute:: kwargs.label (String)

      the label to be displayed for the field - if not provided, will be
      generated from the field's name.

   .. js:attribute:: kwargs.initial

      an initial value for the field to be used if none is specified by the
      field's form.

   .. js:attribute:: kwargs.helpText (String)

      help text for the field.

   .. js:attribute:: kwargs.errorMessages (Object)

      custom error messages for the field.

   .. js:attribute:: kwargs.showHiddenInitial (Boolean)

      specifies if it is necessary to render a hidden widget with initial value
      after the widget.

   .. js:attribute:: kwargs.validators (Array)

      list of addtional validators to use

.. js:class:: CharField([kwargs])

   Validates that its input is a valid string.

   :param Object kwargs: field options additional to those specified in Field.

   .. js:attribute:: kwargs.maxLength (Number)

      a maximum valid length for the input string.

   .. js:attribute:: kwargs.minLength (Number)

      a minimum valid length for the input string.

.. js:class:: IntegerField([kwargs])

   Validates that its input is a valid integer.

   :param Object kwargs: field options additional to those specified in Field.

   .. js:attribute:: kwargs.maxValue (Number)

      a maximum value for the input.

   .. js:attribute:: kwargs.minValue (Number)

      a minimum value for the input.

.. js:class:: FloatField([kwargs])

   Validates that its input is a valid float.

   :param Object kwargs: field options additional to those specified in Field.

   .. js:attribute:: kwargs.maxValue (Number)

      a maximum value for the input.

   .. js:attribute:: kwargs.minValue (Number)

      a minimum value for the input.

.. js:class:: DecimalField([kwargs])

   Validates that its input is a decimal number.

   :param Object kwargs: field options additional to those specified in Field.

   .. js:attribute:: kwargs.maxValue (Number)

      a maximum value for the input.

   .. js:attribute:: kwargs.minValue (Number)

      a minimum value for the input.

   .. js:attribute:: kwargs.maxDigits (Number)

      the maximum number of digits the input may contain.

   .. js:attribute:: kwargs.decimalPlaces (Number)

      the maximum number of decimal places the input may contain.

.. js:class:: BaseTemporalField([kwargs])

   Base field for fields which validate that their input is a date or time.

   :param Object kwargs: field options additional to those specified in Field.

   .. js:attribute:: kwargs.inputFormats (Array)

      a list of time.strptime input formats which are considered valid.

.. js:class:: DateField([kwargs])

   Validates that its input is a date.

.. js:class:: TimeField([kwargs])

   Validates that its input is a time.

.. js:class:: DateTimeField([kwargs])

   Validates that its input is a date/time.

.. js:class:: RegexField([kwargs])

   Validates that its input matches a given regular expression.

   :param RegExp|String regex: a regular expression.
   :param Object kwargs: field options, as specified in Field and CharField.

.. js:class:: EmailField([kwargs])

   Validates that its input appears to be a valid e-mail address.

.. js:class:: FileField([kwargs])

   Validates that its input is a valid uploaded file.

   :param Object kwargs: field options additional to those specified in Field.

   .. js:attribute:: kwargs.allowEmptyFile (Boolean)

      ``true`` if empty files are allowed - defaults to ``false``.

.. js:class:: ImageField([kwargs])

   Validates that its input is a valid uploaded image.

   :param Object kwargs: field options, as specified in FileField.

.. js:class:: URLField([kwargs])

   Validates that its input appears to be a valid URL.

.. js:class:: BooleanField([kwargs])

   Normalises its input to a ``Boolean``.

   .. js:class:: NullBooleanField([kwargs])

      A field whose valid values are ``null``, ``true`` and ``false``.

      Invalid values are cleaned to ``null``.

.. js:class:: ChoiceField([kwargs])

   Validates that its input is one of a valid list of choices.

   :param Object kwargs: field options additional to those specified in Field.

   .. js:attribute:: kwargs.choices (Array)

      a list of choices - each choice should be specified as a list containing
      two items; the first item is a value which should be validated against,
      the second item is a display value for that choice, for example::

         {choices: [[1, 'One'], [2, 'Two']]}

      Defaults to ``[]``.

   .. js:class:: TypedChoiceField([kwargs])

      A ChoiceField which returns a value coerced by some provided function.

      :param Object kwargs:
         field options additional to those specified in ChoiceField.

      .. js:attribute:: kwargs.coerce (Function)

         a function which takes the String value output by ChoiceField's clean
         method and coerces it to another type - defaults to a function which
         returns the given value unaltered.

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

   You'll probably want to use this with MultiWidget.

   :param Object kwargs: field options additional to those supplied in Field.

   .. js:attribute:: kwargs.fields (Array)

      a list of fields to be used to clean a "decompressed" list of values.

   .. js:class:: SplitDateTimeField([kwargs])

      A MultiValueField consisting of a DateField and a TimeField.

      :param Object kwargs:
         field options options, as specified in Field and MultiValueField.

.. js:class:: IPAddressField([kwargs])

   Validates that its input is a valid IPv4 address.

.. js:class:: GenericIPAddressField([kwargs])

   Validates that its input is a valid IPv4 or IPv6 address.

.. js:class:: SlugField([kwargs])

   Validates that its input is a valid slug.
