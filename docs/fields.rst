===========
Form fields
===========

When you create a new ``Form``, the most important part is defining its fields.
Each field has custom validation logic, along with a few other hooks.

Although the primary way you'll use a ``Field`` is in a ``Form``, you can also
instantiate them and use them directly to get a better idea of how they work.
Each ``Field`` instance has a ``clean()`` method, which takes a single argument
and either throws a ``forms.ValidationError`` or returns the clean value:

.. code-block:: javascript

   var f = forms.EmailField()
   print(f.clean('foo@example.com'))
   // => foo@example.com
   try {
     f.clean('invalid email address')
   }
   catch (e) {
     print(e.messages())
   }
   // => ["Enter a valid email address."]

Core field arguments
====================

required
--------

By default, each ``Field``  assumes the value is required, so if you pass
an empty value -- ``undefined``, ``null`` or the empty string (``'``) -- then
``clean()`` will throw a ``ValidationError``.

To specify that a field is *not* required, pass ``required: false`` to the
``Field`` constructor:

.. code-block:: javascript

   var f = forms.CharField({required: false})

If a ``Field`` has ``required: false`` and you pass ``clean()`` an empty value,
then ``clean()`` will return a *normalised* empty value rather than throwing a
``ValidationError``. For ``CharField``, this will be an empty string.
For other ``Field`` type, it might be ``null``. (This varies from field to
field.)

label
-----

The ``label`` argument lets you specify the "human-friendly" label for this
field. This is used when the ``Field`` is displayed in a ``Form``.

initial
-------

The ``initial`` argument lets you specify the initial value to use when
rendering this ``Field`` in an unbound ``Form``.

To specify dynamic initial data, see the
:ref:`Form.initial <ref-dynamic-initial-values>` parameter.

widget
------

The ``widget`` argument lets you specify a ``Widget`` to use when rendering this
``Field``. You can pass either an instance or a Widget constructor. See
:doc:`widgets` for more information.

helpText
--------

The ``helpText`` argument lets you specify descriptive text for this Field. If
you provide ``helpText``, it will be displayed next to the Field when the Field
is rendered by one of the convenience ``Form`` methods (e.g., ``asUJl()``).

errorMessages
-------------

The ``errorMessages`` argument lets you override the default messages that the
field will throw. Pass in an object with properties matching the error messages
you want to override. For example, here is the default error message:

.. code-block:: javascript

   var generic = forms.CharField()
   try {
     generic.clean('')
   }
   catch (e) {
     print(e.messages())
   }
   // => ["This field is required."]

And here is a custom error message:

.. code-block:: javascript

   var name = forms.CharField({errorMessages: {required: 'Please enter your name.'}})
   try {
     name.clean('')
   }
   catch (e) {
     print(e.messages())
   }
   // => ["Please enter your name."]

The error message codes used by fields are defined below.

validators
----------

The ``validators`` argument lets you provide a list of additional validation
functions for this field.

Providing choices
=================

Fields and Widgets which take a ``choices`` argument expect to be given a list
containing any of the following:

.. _ref-fields-choice-pairs:

Choice pairs
   A choice pair is a list containing exactly 2 elements, which correspond to:

      1. the value to be submitted/returned when the choice is selected.
      2. the value to be displayed to the user for selection.

   For example:

   .. code-block:: javascript

      var STATE_CHOICES = [
        ['S', 'Scoped']
      , ['D', 'Defined']
      , ['P', 'In-Progress']
      , ['C', 'Completed']
      , ['A', 'Accepted']
      ]
      print(reactHTML(forms.Select().render('state', null, {choices: STATE_CHOICES})))
      /* =>
      <select name="state">
      <option value="S">Scoped</option>
      <option value="D">Defined</option>
      <option value="P">In-Progress</option>
      <option value="C">Completed</option>
      <option value="A">Accepted</option>
      </select>
      */

Grouped lists of choice pairs
   A list containing exactly 2 elements, which correspond to:

      1. A group label
      2. A list of choice pairs, as described above

   .. code-block:: javascript

      var DRINK_CHOICES = [
        ['Cheap', [
            [1, 'White Lightning']
          , [2, 'Buckfast']
          , [3, 'Tesco Gin']
          ]
        ]
      , ['Expensive', [
            [4, 'Vieille Bon Secours Ale']
          , [5, 'Château d’Yquem']
          , [6, 'Armand de Brignac Midas']
          ]
        ]
      , [7, 'Beer']
      ]
      print(reactHTML(forms.Select().render('drink', null, {choices: DRINK_CHOICES})))
      /* =>
      <select name="drink">
      <optgroup label="Cheap">
      <option value="1">White Lightning</option>
      <option value="2">Buckfast</option>
      <option value="3">Tesco Gin</option>
      </optgroup>
      <optgroup label="Expensive">
      <option value="4">Vieille Bon Secours Ale</option>
      <option value="5">Château d’Yquem</option>
      <option value="6">Armand de Brignac Midas</option>
      </optgroup>
      <option value="7">Beer</option>
      </select>
      */

As you can see from the ``'Beer'`` example above, grouped pairs can be mixed
with ungrouped pairs within the list of choices.

Flat choices
   .. versionadded:: 0.5

   If a non-array value is provided where newforms expects to see a choice pair,
   it will be normalised to a choice pair using the same value for submission
   and display.

   This allows you to pass a flat list of choices when that's all you need:

   .. code-block:: javascript

      var VOWEL_CHOICES = ['A', 'E', 'I', 'O', 'U']
      var f = forms.ChoiceField({choices: VOWEL_CHOICES})
      print(f.choices())
      // => [['A', 'A'], ['E', 'E'], ['I', 'I'], ['O', 'O'], ['U', 'U']]

      var ARBITRARY_CHOICES = [
        ['Numbers', [1, 2,]]
      , ['Letters', ['A', 'B']]
      ]
      f.setChoices(ARBITRARY_CHOICES)
      print(f.choices())
      // => [['Numbers', [[1, 1], [2, 2]]], ['Letters', [['A', 'A'], ['B', 'B']]]]

Dynamic choices
===============

A common pattern for providing dynamic choices (or indeed, dynamic anything) is
to provide your own form constructor and pass in whatever data is required to
make changes to ``form.fields`` as the form is being instantiated.

Newforms provides a :js:func:`util.makeChoices` helper function for creating
choice pairs from a list of objects using named properties:

.. code-block:: javascript

   var ProjectBookingForm = forms.Form.extend({
     project: forms.ChoiceField()
   , hours: forms.DecimalField({minValue: 0, maxValue: 24, maxdigits: 4, decimalPlaces: 2})
   , date: forms.DateField()

   , constructor: function(projects, kwargs) {
       // Call the constructor of whichever form you're extending so that the
       // forms.Form constructor eventually gets called - this.fields doesn't
       // exist until this happens.
       ProjectBookingForm.__super__.constructor.call(this, kwargs)

       // Now that this.fields is a thing, make whatever changes you need to -
       // in this case, we're going to creata a list of pairs of project ids
       // and names to set as the project field's choices.
       this.fields.project.setChoices(forms.util.makeChoices(projects, 'id', 'name'))
     }
   })

   var projects = [
     {id: 1, name: 'Project 1'}
   , {id: 2, name: 'Project 2'}
   , {id: 3, name: 'Project 3'}
   ]
   var form = new ProjectBookingForm(projects, {autoId: false})
   print(reactHTML((form.boundField('project').render()))
   /* =>
   <select name=\"project\">
   <option value=\"1\">Project 1</option>
   <option value=\"2\">Project 2</option>
   <option value=\"3\">Project 3</option>
   </select>
   */

Server-side example of using a form with dynamic choices:

.. code-block:: javascript

   // Users are assigned to projects and they're booking time, so we need to:
   // 1. Display choices for the projects they're assigned to
   // 2. Validate that the submitted project id is one they've been assigned to
   var form
   var display = function() { res.render('book_time', {form: form}) }
   req.user.getProjects(function(err, projects) {
     if (err) { return next(err) }
     if (req.method == 'POST') {
       form = new ProjectBookingForm(projects, {data: req.body})
       if (form.isValid()) {
         return ProjectService.saveHours(user, form.cleanedData, function(err) {
           if (err) { return next(err) }
           return res.redirect('/time/book/')
         })
       }
     }
     else {
       form = new ProjectBookingForm(projects)
     }
     display(form)
   })

.. _ref-built-in-field-types:

Built-in ``Field`` types (A-Z)
==============================

Naturally, the ``forms`` library comes with a set of ``Field`` classes that
represent common validation needs. This section documents each built-in field.

For each field, we describe the default widget used if you don't specify
``widget``. We also specify the value returned when you provide an empty value
(see the section on ``required`` above to understand what that means).

:js:class:`BooleanField`
------------------------

   * Default widget: :js:class:`CheckboxInput`
   * Empty value: ``false``
   * Normalizes to: A JavaScript ``true`` or ``false`` value.
   * Validates that the value is ``true`` (e.g. the check box is checked) if
     the field has ``required: true``.
   * Error message keys: ``required``

   .. note::

      Since all ``Field`` subclasses have ``required: true`` by default, the
      validation condition here is important. If you want to include a boolean
      in your form that can be either ``true`` or ``false`` (e.g. a checked or
      unchecked checkbox), you must remember to pass in ``required: false`` when
      creating the ``BooleanField``.

:js:class:`CharField`
---------------------

   * Default widget: :js:class:`TextInput`
   * Empty value: ``''`` (an empty string)
   * Normalizes to: A string.
   * Validates ``maxLength`` or ``minLength``, if they are provided.
     Otherwise, all inputs are valid.
   * Error message keys: ``required``, ``maxLength``, ``minLength``

   Has two optional arguments for validation:

   * maxLength
   * minLength

   If provided, these arguments ensure that the string is at most or at least
   the given length.

:js:class:`ChoiceField`
-----------------------

   * Default widget: :js:class:`Select`
   * Empty value: ``''`` (an empty string)
   * Normalizes to: A string.
   * Validates that the given value exists in the list of choices.
   * Error message keys: ``required``, ``invalidChoice``

   The ``invalidChoice`` error message may contain ``{value}``, which will be
   replaced with the selected choice.

   Takes one extra argument:

   * choices

        A list of pairs (2 item lists) to use as choices for this field.
        See `Providing choices`_ for more details.

:js:class:`TypedChoiceField`
----------------------------

   Just like a :js:class:`ChoiceField`, except :js:class:`TypedChoiceField`
   takes two extra arguments, ``coerce`` and ``emptyValue``.

   * Default widget: :js:class:`Select`
   * Empty value: Whatever you've given as ``emptyValue``
   * Normalizes to: A value of the type provided by the ``coerce`` argument.
   * Validates that the given value exists in the list of choices and can be
     coerced.
   * Error message keys: ``required``, ``invalidChoice``

   Takes extra arguments:

   * coerce

        A function that takes one argument and returns a coerced value. Examples
        include the built-in ``Number``, ``Boolean`` and other types. Defaults
        to an identity function. Note that coercion happens after input
        validation, so it is possible to coerce to a value not present in
        ``choices``.

   * emptyValue

        The value to use to represent "empty." Defaults to the empty string;
        ``null`` is another common choice here. Note that this value will not be
        coerced by the function given in the ``coerce`` argument, so choose it
        accordingly.

:js:class:`DateField`
---------------------

   * Default widget: :js:class:`DateInput`
   * Empty value: ``null``
   * Normalizes to: A JavaScript ``Date`` object, with its time fields set to
     zero.
   * Validates that the given value is either a ``Date``, or string formatted
     in a particular date format.
   * Error message keys: ``required``, ``invalid``

   Takes one optional argument:

   * inputFormats

        A list of formats used to attempt to convert a string to a valid
        ``Date`` object.

   If no ``inputFormats`` argument is provided, the default input formats are:

   .. code-block:: javascript

      [
        '%Y-%m-%d'              // '2006-10-25'
      , '%m/%d/%Y', '%m/%d/%y'  // '10/25/2006', '10/25/06'
      , '%b %d %Y', '%b %d, %Y' // 'Oct 25 2006', 'Oct 25, 2006'
      , '%d %b %Y', '%d %b, %Y' // '25 Oct 2006', '25 Oct, 2006'
      , '%B %d %Y', '%B %d, %Y' // 'October 25 2006', 'October 25, 2006'
      , '%d %B %Y', '%d %B, %Y' // '25 October 2006', '25 October, 2006'
      ]

:js:class:`DateTimeField`
-------------------------

   * Default widget: :js:class:`DateTimeInput`
   * Empty value: ``null``
   * Normalizes to: A JavaScript ``Date`` object.
   * Validates that the given value is either a ``Date`` or string formatted in
     a particular datetime format.
   * Error message keys: ``required``, ``invalid``

   Takes one optional argument:

   * inputFormats

      A list of formats used to attempt to convert a string to a valid
      ``Date`` object.

   If no ``inputFormats`` argument is provided, the default input formats are:

   .. code-block:: javascript

      [
        '%Y-%m-%d %H:%M:%S' // '2006-10-25 14:30:59'
      , '%Y-%m-%d %H:%M'    // '2006-10-25 14:30'
      , '%Y-%m-%d'          // '2006-10-25'
      , '%m/%d/%Y %H:%M:%S' // '10/25/2006 14:30:59'
      , '%m/%d/%Y %H:%M'    // '10/25/2006 14:30'
      , '%m/%d/%Y'          // '10/25/2006'
      , '%m/%d/%y %H:%M:%S' // '10/25/06 14:30:59'
      , '%m/%d/%y %H:%M'    // '10/25/06 14:30'
      , '%m/%d/%y'          // '10/25/06'
      ]

:js:class:`DecimalField`
------------------------

   * Default widget: :js:class:`NumberInput`.
   * Empty value: ``null``
   * Normalizes to: A string (since JavaScript doesn't have built-in Decimal
     type).
   * Validates that the given value is a decimal. Leading and trailing
     whitespace is ignored.
   * Error message keys: ``required``, ``invalid``, ``maxValue``,
     ``minValue``, ``maxDigits``, ``maxDecimalPlaces``,
     ``maxWholeDigits``

   The ``maxValue`` and ``minValue`` error messages may contain
   ``{limitValue}``, which will be substituted by the appropriate limit.

   Similarly, the ``maxDigits``, ``maxDecimalPlaces`` and ``maxWholeDigits``
   error messages may contain ``{max}``.

   Takes four optional arguments:

   * maxValue
   * minValue

        These control the range of values permitted in the field.

   * maxDigits

        The maximum number of digits (those before the decimal point plus those
        after the decimal point, with leading zeros stripped) permitted in the
        value.

   * decimalDlaces

        The maximum number of decimal places permitted.

:js:class:`EmailField`
----------------------

   * Default widget: :js:class:`EmailInput`
   * Empty value: ``''`` (an empty string)
   * Normalizes to: A string.
   * Validates that the given value is a valid email address, using a
     moderately complex regular expression.
   * Error message keys: ``required``, ``invalid``

   Has two optional arguments for validation, ``maxLength`` and ``minLength``.
   If provided, these arguments ensure that the string is at most or at least the
   given length.

:js:class:`FileField`
---------------------

   * Default widget: :js:class:`ClearableFileInput`
   * Empty value: ``null``
   * Normalizes to: The given object in ``files`` - this field just validates
     what's there and leaves the rest up to you.
   * Can validate that non-empty file data has been bound to the form.
   * Error message keys: ``required``, ``invalid``, ``missing``, ``empty``,
     ``maxLength``

   Has two optional arguments for validation, ``maxLength`` and
   ``allowEmptyFile``. If provided, these ensure that the file name is at
   most the given length, and that validation will succeed even if the file
   content is empty.

   When you use a ``FileField`` in a form, you must also remember to
   :ref:`bind the file data to the form <binding-uploaded-files>`.

   The ``maxLength`` error refers to the length of the filename. In the error
   message for that key, ``{max}`` will be replaced with the maximum filename
   length and ``{length}`` will be replaced with the current filename length.

:js:class:`FilePathField`
-------------------------

   * Default widget: :js:class:`Select`
   * Empty value: ``null``
   * Normalizes to: A string
   * Validates that the selected choice exists in the list of choices.
   * Error message keys: ``required``, ``invalidChoice``

   The field allows choosing from files inside a certain directory. It takes three
   extra arguments; only ``path`` is required:

   * path

        The absolute path to the directory whose contents you want listed. This
        directory must exist.

   * recursive

        If ``false`` (the default) only the direct contents of ``path`` will be
        offered as choices. If ``true``, the directory will be descended into
        recursively and all descendants will be listed as choices.

   * match

        A regular expression pattern; only files with names matching this expression
        will be allowed as choices.

   * allowFiles

        Optional. Either ``true`` or ``false``. Default is ``true``. Specifies
        whether files in the specified location should be included. Either this
        or ``allowFolders`` must be ``true``.

   * allowFolders

        Optional. Either ``true`` or ``false``. Default is ``false``. Specifies
        whether folders in the specified location should be included. Either
        this or ``allowFiles`` must be ``true``.


:js:class:`FloatField`
----------------------

   * Default widget: :js:class:`NumberInput`.
   * Empty value: ``null``
   * Normalizes to: A JavaScript ``Number``.
   * Validates that the given value is a float. Leading and trailing whitespace
     is allowed.
   * Error message keys: ``required``, ``invalid``, ``maxValue``,
     ``minValue``

   Takes two optional arguments for validation, ``maxValue`` and ``minValue``.
   These control the range of values permitted in the field.

:js:class:`ImageField`
----------------------

   * Default widget: :js:class:`ClearableFileInput`
   * Empty value: ``null``
   * Normalizes to: The given object in ``files`` - this field just validates
     what's there and leaves the rest up to you.
   * Validates that file data has been bound to the form, and that the
     file is of an image format.
   * Error message keys: ``required``, ``invalid``, ``missing``, ``empty``,
     ``invalidImage``

   .. Note::

      Server-side image validation isn't implemented yet.

   When you use a ``ImageField`` in a form, you must also remember to
   :ref:`bind the file data to the form <binding-uploaded-files>`.

:js:class:`IntegerField`
------------------------

   * Default widget: :js:class:`NumberInput`.
   * Empty value: ``null``
   * Normalizes to: A JavaScript ``Number``.
   * Validates that the given value is an integer. Leading and trailing
     whitespace is allowed.
   * Error message keys: ``required``, ``invalid``, ``maxValue``,
     ``minValue``

    The ``maxValue`` and ``minValue`` error messages may contain
    ``{limitValue}``, which will be substituted by the appropriate limit.

    Takes two optional arguments for validation:

   * maxValue
   * minValue

        These control the range of values permitted in the field.

:js:class:`IPAddressField`
--------------------------

   .. deprecated:: 0.5
      This field has been deprecated in favour of
      :js:class:`GenericIPAddressField`.

    * Default widget: :js:class:`TextInput`
    * Empty value: ``''`` (an empty string)
    * Normalizes to: A string.
    * Validates that the given value is a valid IPv4 address, using a regular
      expression.
    * Error message keys: ``required``, ``invalid``

:js:class:`GenericIPAddressField`
---------------------------------

   A field containing either an IPv4 or an IPv6 address.

   * Default widget: :js:class:`TextInput`
   * Empty value: ``''`` (an empty string)
   * Normalizes to: A string. IPv6 addresses are normalized as described below.
   * Validates that the given value is a valid IP address.
   * Error message keys: ``required``, ``invalid``

   The IPv6 address normalization follows :rfc:`4291#section-2.2` section 2.2,
   including using the IPv4 format suggested in paragraph 3 of that section, like
   ``::ffff:192.0.2.0``. For example, ``2001:0::0:01`` would be normalized to
   ``2001::1``, and ``::ffff:0a0a:0a0a`` to ``::ffff:10.10.10.10``. All characters
   are converted to lowercase.

   Takes two optional arguments:

   * protocol

        Limits valid inputs to the specified protocol. Accepted values are
        ``both`` (default), ``ipv4`` or ``ipv6``. Matching is case insensitive.

   * unpackIPv4

        Unpacks IPv4 mapped addresses like ``::ffff:192.0.2.1``.
        If this option is enabled that address would be unpacked to
        ``192.0.2.1``. Default is disabled. Can only be used
        when ``protocol`` is set to ``'both'``.

:js:class:`MultipleChoiceField`
-------------------------------

   * Default widget: :js:class:`SelectMultiple`
   * Empty value: ``[]`` (an empty list)
   * Normalizes to: A list of strings.
   * Validates that every value in the given list of values exists in the list
     of choices.
   * Error message keys: ``required``, ``invalidChoice``, ``invalidList``

   The ``invalidChoice`` error message may contain ``{value}``, which will be
   replaced with the selected choice.

   Takes one extra required argument, ``choices``, as for ``ChoiceField``.

:js:class:`TypedMultipleChoiceField`
------------------------------------

   Just like a :js:class:`MultipleChoiceField`, except
   :js:class:`TypedMultipleChoiceField` takes two extra arguments,
   ``coerce`` and ``emptyValue``.

   * Default widget: :js:class:`SelectMultiple`
   * Empty value: Whatever you've given as ``emptyValue``
   * Normalizes to: A list of values of the type provided by the ``coerce``
     argument.
   * Validates that the given values exists in the list of choices and can be
     coerced.
   * Error message keys: ``required``, ``invalidChoice``

   The ``invalidChoice`` error message may contain ``{value}``, which will be
   replaced with the selected choice.

   Takes two extra arguments, ``coerce`` and ``emptyValue``, as for
   ``TypedChoiceField``.

:js:class:`NullBooleanField`
----------------------------

   * Default widget: :js:class:`NullBooleanSelect`
   * Empty value: ``null``
   * Normalizes to: A JavaScript ``true``, ``false`` or ``null`` value.
   * Validates nothing (i.e., it never raises a ``ValidationError``).

:js:class:`RegexField`
----------------------

   * Default widget: :js:class:`TextInput`
   * Empty value: ``''`` (an empty string)
   * Normalizes to: A string.
   * Validates that the given value matches against a certain regular
     expression.
   * Error message keys: ``required``, ``invalid``

   Takes one required argument:

   * regex

        A regular expression specified either as a string or a compiled regular
        expression object.

    Also takes ``maxLength`` and ``minLength``, which work just as they do for
    ``CharField``.

:js:class:`SlugField`
---------------------

   * Default widget: :js:class:`TextInput`
   * Empty value: ``''`` (an empty string)
   * Normalizes to: A string.
   * Validates that the given value contains only letters, numbers,
     underscores, and hyphens.
   * Error messages: ``required``, ``invalid``

:js:class:`TimeField`
---------------------

   * Default widget: :js:class:`TextInput`
   * Empty value: ``null``
   * Normalizes to: A JavaScript ``Date`` object, with its date fields set to
     1900-01-01.
   * Validates that the given value is either a ``Date`` or string
     formatted in a particular time format.
   * Error message keys: ``required``, ``invalid``

    Takes one optional argument:

   * inputFormats

        A list of formats used to attempt to convert a string to a valid
        ``Date`` object.

   If no ``inputFormats`` argument is provided, the default input formats are:

   .. code-block:: javascript

      [
        '%H:%M:%S' // '14:30:59'
      , '%H:%M'    // '14:30'
      ]

:js:class:`URLField`
--------------------

   * Default widget: :js:class:`URLInput`
   * Empty value: ``''`` (an empty string)
   * Normalizes to: A string.
   * Validates that the given value is a valid URL.
   * Error message keys: ``required``, ``invalid``

    Takes the following optional arguments:

   * maxLength
   * minLength

   These are the same as ``CharField.maxLength`` and ``CharField.minLength``.


Slightly complex built-in ``Field`` types
=========================================

:js:class:`ComboField`
----------------------

   * Default widget: :js:class:`TextInput`
   * Empty value: ``''`` (an empty string)
   * Normalizes to: A string.
   * Validates that the given value against each of the fields specified
     as an argument to the ``ComboField``.
   * Error message keys: ``required``, ``invalid``

   Takes one extra argument:

   * fields

      The list of fields that should be used to validate the field's value (in
      the order in which they are provided):

        .. code-block:: javascript

           var f = forms.ComboField({fields: [
             forms.CharField({maxLength: 20})
           , forms.EmailField()
           ]})
           print(f.clean('test@example.com'))
           // => test@example.com
           try {
             f.clean('longemailaddress@example.com')
           }
           catch (e) {
             print(e.messages())
           }
           // => ['Ensure this value has at most 20 characters (it has 28).']

:js:class:`MultiValueField`
---------------------------

   * Default widget: :js:class:`TextInput`
   * Empty value: ``''`` (an empty string)
   * Normalizes to: the type returned by the ``compress`` method of the subclass.
   * Validates that the given value against each of the fields specified
     as an argument to the ``MultiValueField``.
   * Error message keys: ``required``, ``invalid``, ``incomplete``

   Aggregates the logic of multiple fields that together produce a single
   value.

   This field is abstract and must be extended. In contrast with the
   single-value fields, fields which extend js:class:`MultiValueField` must not
   implement :js:func:`BaseField#clean` but instead - implement ``compress()``.

   Takes one extra argument:

   * fields

        A list of fields whose values are cleaned and subsequently combined
        into a single value. Each value of the field is cleaned by the
        corresponding field in ``fields`` -- the first value is cleaned by the
        first field, the second value is cleaned by the second field, etc.
        Once all fields are cleaned, the list of clean values is combined into
        a single value by ``compress()``.

    Also takes one extra optional argument:

   * requireAllFields

        .. versionadded:: 0.5

        Defaults to ``true``, in which case a ``required`` validation error
        will be raised if no value is supplied for any field.

        When set to ``false``, the ``Field.required`` attribute can be set
        to ``false`` for individual fields to make them optional. If no value
        is supplied for a required field, an ``incomplete`` validation error
        will be raised.

        A default ``incomplete`` error message can be defined on the
        :js:class:`MultiValueField` subclass, or different messages can be defined
        on each individual field. For example:

        .. code-block:: javascript

           var RegexValidator = forms.validators.RegexValidator
           var PhoneField = forms.MultiValueField.extend({
             constructor: function(kwargs) {
               kwargs = kwargs || {}
                // Define one message for all fields
               kwargs.errorMessages = {
                 incomplete: 'Enter a country code and phone number.'
               }
               // Or define a different message for each field
               kwargs.fields = [
                 forms.CharField({errorMessages: {incomplete: 'Enter a country code.'}, validators: [
                   RegexValidator({regex: /^\d+$/, message: 'Enter a valid country code.'})
                 ]})
               , forms.CharField({errorMessages: {incomplete: 'Enter a phone number.'}, validators: [
                   RegexValidator({regex: /^\d+$/, message: 'Enter a valid phone number.'})
                 ]})
               , forms.CharField({required: false, validators: [
                   RegexValidator({regex: /^\d+$/, message: 'Enter a valid extension.'})
                 ]})
               ]
               PhoneField.__super__.constructor.call(this, kwargs)
             }
           })

   * MultiValueField.widget

        Must extend :js:class:`MultiWidget`. Default value is
        :js:class:`TextInput`, which probably is not very useful in this case.
        Have a nice day :)

   * compress(dataList)

        Takes a list of valid values and returns  a "compressed" version of
        those values -- in a single value. For example,
        :js:class:`SplitDateTimeField` is a combines a time field and a date
        field into a ``Date`` object.

        This method must be implemented in the Field extending MultiValueField.

:js:class:`SplitDateTimeField`
------------------------------

   * Default widget: :js:class:`SplitDateTimeWidget`
   * Empty value: ``null``
   * Normalizes to: A JavaScript ``datetime.datetime`` object.
   * Validates that the given value is a ``datetime.datetime`` or string
     formatted in a particular datetime format.
   * Error message keys: ``required``, ``invalid``, ``invalidDate``,
     ``invalidTime``

    Takes two optional arguments:

   * inputDateFormats

        A list of formats used to attempt to convert a string to a valid
        ``Date`` object with its time fields set to zero.

    If no ``inputDateFormats`` argument is provided, the default input formats
    for ``DateField`` are used.

   * inputTimeFormats

        A list of formats used to attempt to convert a string to a valid
        ``Date`` object with its date fields set to 1900-01-01.

    If no ``inputTimeFormats`` argument is provided, the default input formats
    for ``TimeField`` are used.

Creating custom fields
----------------------

If the built-in ``Field`` objects don't meet your needs, you can easily create
custom ``Field``\s. To do this, just ``.extend()`` ``Field``. Its only
requirements are that it implement a ``clean()`` method and that its
``constructor()`` accepts the core arguments mentioned above
(``required``, ``label``, ``initial``, ``widget``, ``helpText``) in an argument
object.
