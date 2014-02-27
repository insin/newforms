=========================
Form and field validation
=========================

For a guide to the various methods of customising validation and the order in
which they run, please refer to the Django documentation:

   * `Django documentation -- Form and field validation <https://docs.djangoproject.com/en/dev/ref/forms/validation/>`_

Selected headings from the Django documentation are duplicated below with
JavaScript equivalents of example code.

Using validation in practice
============================

Form field default cleaning
---------------------------

Let’s firstly create a custom form field that validates its input is a string
containing comma-separated email addresses.::

   var MultiEmailField = forms.Field.extend({
     /** Normalise data to a list of strings. */
     toJavaScript: function(value) {
       // Return an empty list if no input was given
       if (this.isEmptyValue(value)) {
         return []
       }
       return value.split(/, ?/g)
     }

     /** Check if value consists only of valid emails. */
   , validate: function(value) {
       // Use the parent's handling of required fields, etc.
       MultiEmailField.__super__.validate.call(this, value)
       value.map(forms.validators.validateEmail)
     }
   })

Let’s create a simple ContactForm to demonstrate how you’d use this field::

   var ContactForm = forms.Form.extend({
     subject: forms.CharField({maxLength: 100})
   , message: forms.CharField()
   , sender: forms.EmailField()
   , recipients: new MultiEmailField()
   , ccMyself: forms.BooleanField({required: false})
   })

Cleaning a specific field attribute
-----------------------------------

Suppose that in our ``ContactForm``, we want to make sure that the
``recipients`` field always contains the address ``"fred@example.com"``. This is
validation that is specific to our form, so we don’t want to put it into the
general ``MultiEmailField``. Instead, we write a cleaning function that operates
on the ``recipients`` field, like so:::

   var ContactForm = forms.Form.extend({
     // Everything as before
     // ...

   , cleanRecipients: function() {
       var recipients = this.cleanedData.recipients
       if (recipients.indexOf('fred@example.com') == -1) {
         throw forms.ValidationError('You have forgotten about Fred!')
       }

       // Returning the cleaned data is optional - if anything is returned,
       // cleanedData will be updated with the new value.
       return recipients
     }
   }

If you return anything from a custom field cleaning function, the form's
``cleanedData`` for the field will be updated with the returned value.

Cleaning and validating fields that depend on each other
--------------------------------------------------------

forms.Form.clean()
~~~~~~~~~~~~~~~~~~

There are two ways to report any errors from this step. Probably the most common
method is to display the error at the top of the form. To create such an error,
you can throw a ``ValidationError`` from the ``clean()`` method. For example::

   var ContactForm = forms.Form.extend({
     // Everything as before
     // ...

   , clean: function() {
       var cleanedData = ContactForm.__super__.clean.call(this)
       var ccMyself = cleanedData.ccMyself
       var subject = cleanedData.subject

       if (ccMyself && subject) {
         // Only do something if both fields are valid so far
         if (subject.indexOf('help') == -1) {
           throw forms.ValidationError(
             "Did not send for 'help' in the subject despite CC'ing yourself.")
         }
       }
     }
   }

Another approach might involve assigning the error message to one of the fields.
In this case, let’s assign an error message to both the "subject" and "ccMyself
rows in the form display::

   var ContactForm = forms.Form.extend({
     // Everything as before
     // ...

   , clean: function() {
       var cleanedData = ContactForm.__super__.clean.call(this)
       var ccMyself = cleanedData.ccMyself
       var subject = cleanedData.subject

       if (ccMyself && subject && subject.indexOf('help') == -1) {
         var message = "Must put 'help' in subject when cc'ing yourself."
         this.addError('ccMyself', message)
         this.addError('subject', message)
       }
     }
   }

``ValidationError``
===================

ValidationError is part of the `validators`_ module, but is so commonly used
when implementing custom validation that it's exposed as part of the top-level
newforms API.

.. js:class:: ValidationError(message[, kwargs])

   A validation error, containing validation messages.

   Single messages (e.g. those produced by validators) may have an associated
   error code and error message parameters to allow customisation by fields.

   :param Object message:
      the message argument can be a single error, a list of errors, or an object
      that maps field names to lists of errors.

      What we define as an "error" can be either a simple string or an instance
      of ValidationError with its message attribute set, and what we define as
      list or object can be an actual list or object, or an instance of
      ValidationError with its errorList or errorObj property set.

   :param Object kwargs: validation error options.

   .. js:attribute:: kwargs.code

      a code identifying the type of single message this validation error is.

   .. js:attribute:: kwargs.params

      parameters to be interpolated into the validation error message. where the
      message contains curly-bracketed {placeholders} for parameter properties.

      :type: Object

   **Prototype Functions**

   .. js:function:: ValidationError#messageObj()

      Returns validation messages as an object with field names as properties.

      Throws an error if this validation error was not created with a field
      error object.

   .. js:function:: ValidationError#messages()

      Returns validation messages as a list. If the ValidationError was
      constructed with an object, its error messages will be flattened into a
      list.

validators API
==============

Newforms depends on the `validators`_ module and exposes its version of it as
``forms.validators``.

Constructors in the validators module are actually validation function factories
-- they can be called with or without ``new`` and will return a Function which
performs the configured validation when called.

.. js:class:: RegexValidator(options)

   Creates a validator which validates that input matches a regular expression.

   Options which can be passed are:

   * ``regex`` -- the regular expression pattern to search for the provided value,
     or a pre-compiled ``RegExp``.  By default, matches any string (including an
     empty string)
   * ``message`` -- the error message used by ``ValidationError`` if validation
     fails. Defaults to ``"Enter a valid value"``.
   * ``code`` -- the error code used by ``ValidationError`` if validation fails.
     Defaults to ``"invalid"``.
   * ``inverseMatch`` -- the match mode for ``regex``. Defaults to ``false``.

.. js:class:: URLValidator(options)

   Creates a validator which validates that input looks like a valid URL.

   Options which can be passed are:

   * ``schemes`` -- allowed URL schemes. Defaults to
     ``['http', 'https', 'ftp', 'ftps']``.

.. js:class:: EmailValidator(options)

   Creates a validator which validates that input looks like a valid e-mail
   address.

   Options which can be passed are:

   * ``message`` -- error message to be used in any generated ``ValidationError``.
   * ``code`` -- error code to be used in any generated ``ValidationError``.
   * ``whitelist`` -- a whitelist of domains which are allowed to be the only thing
     to the right of the ``@`` in a valid email address -- defaults to
     ``['localhost']``.

.. js:function:: validateEmail(value)

   Validates that input looks like a valid e-mail address -- this is a
   preconfigured instance of an :js:class:`EmailValidator`.

.. js:function:: validateSlug(value)

   Validates that input consists of only letters, numbers, underscores or
   hyphens.

.. js:function:: validateIPv4Address(value)

   Validates that input looks like a valid IPv4 address.

.. js:function:: validateIPv6Address(value)

   Validates that input is a valid IPv6 address.

.. js:function:: validateIPv46Address(value)

   Validates that input is either a valid IPv4 or IPv6 address.

.. js:function:: validateCommaSeparatedIntegerList(value)

   Validates that input is a comma-separated list of integers.

.. js:class:: MaxValueValidator(maxValue)

   Throws a ValidationError with a code of ``'maxValue'`` if its input is
   greater than ``maxValue``.

.. js:class:: MinValueValidator(minValue)

   Throws a ValidationError with a code of ``'minValue'`` if its input is
   less than ``maxValue``.

.. js:class:: MaxLengthValidator(maxLength)

   Throws a ValidationError with a code of ``'maxLength'`` if its input's length
   is greater than ``maxLength``.

.. js:class:: MinLengthValidator(minLength)

   Throws a ValidationError with a code of ``'minLength'`` if its input's length
   is less than ``minLength``.

.. _`validators`: https://github.com/insin/validators