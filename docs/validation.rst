=========================
Form and Field validation
=========================

Form validation happens when the data is cleaned. If you want to customise
this process, there are various places you can change, each one serving a
different purpose. Three types of cleaning methods are run during form
processing. These are normally executed when you call the ``validate()``
method on a form or you interact with a field when the form is using event-based
validation.

In general, any cleaning method can throw a ``ValidationError`` if there is a
problem with the data it is processing, passing the relevant information to
the ``ValidationError`` constructor.

Most validation can be done using `validators`_ -- helpers that can be reused
easily. Validators are functions that take a single argument and throw a
``ValidationError`` on invalid input. Validators are run after the field's
``toJavaScript()`` and ``validate()`` methods have been called.

Validation steps and order
==========================

Validation of a Form is split into several steps, which can be customised or
overridden:

* The ``toJavaScript()`` method on a Field is the first step in every
  validation. It coerces the value to the correct datatype and throws a
  ``ValidationError`` if that is not possible. This method accepts the raw
  value from the widget and returns the converted value. For example, a
  ``FloatField`` will turn the data into a JavaScript ``Number`` or throw a
  ``ValidationError``.

* The ``validate()`` method on a Field handles field-specific validation
  that is not suitable for a validator. It takes a value that has been
  coerced to the correct datatype and throws a ``ValidationError`` on any error.

  This method does not return anything and shouldn't alter the value. You
  should override it to handle validation logic that you can't or don't
  want to put in a validator.

* The ``runValidators()`` method on a Field runs all of the field's validators
  and aggregates all the errors into a single ``ValidationError``. You shouldn't
  need to override this method.

* The ``clean()`` method on a Field. This is responsible for running
  ``toJavaScript``, ``validate`` and ``runValidators`` in the correct
  order and propagating their errors. If, at any time, any of the methods
  throws a ``ValidationError``, the validation stops and that error is thrown.
  This method returns the clean data, which is then inserted into the
  ``cleanedData`` object of the form.

* Field-specific cleaning/validation hooks on the Form. If your form includes a
  ``clean<FieldName>()`` (or ``clean_<fieldName>()``) method in its definition,
  it will be called for the field its name matches. This method is not passed
  its field's data as an argument. You will need to look up the value of the
  field in ``this.cleanedData`` (it will be  in ``cleanedData`` because the
  general field ``clean()`` method, above, has already cleaned the data once).

  For example, if you wanted to validate that the content of a ``CharField``
  called ``serialNumber`` was unique, implementing ``cleanSerialNumber()`` would
  provide the right place to do this.

* The Form ``clean()`` method. This method can perform any validation that
  requires access to multiple fields from the form at once. This is where you
  would perform checks like password or email confirmation fields being equal to
  the original input.

  Since the field validation methods have been run by the time ``clean()`` is
  called, you also have access to the form's ``errors()``, which contains all
  the errors thrown by cleaning of individual fields.

  Note that any errors thrown by your ``form.clean()`` override will not be
  associated with any field in particular. They go into a special "field"
  (called ``__all__``), which you can access via the ``nonFieldErrors()`` method
  if you need to. If you want to attach errors to a specific field in the form,
  you need to call :js:func:`form.addError() <BaseForm#addError>`.

These methods are run in the order given above, one field at a time. That is,
for each field in the form (in the order they are declared in the form
definition), the ``field.clean()`` method (or its override) is run, then
``clean<Fieldname>()`` (or ``clean_<fieldName>()``) if defined. Finally, the
``form.clean()`` method, or its override, is executed whether or not the
previous methods have thrown errors.

Examples of each of these methods are provided below.

As mentioned, any of these methods can throw a ``ValidationError``. For any
field, if the ``field.clean()`` method throws a ``ValidationError``, any
field-specific cleaning method is not called. However, the cleaning methods
for all remaining fields are still executed.

.. _throwing-validation-error:

Throwing ``ValidationError``
============================

In order to make error messages flexible and easy to override, consider the
following guidelines:

* Provide a descriptive error ``code`` to the constructor when possible:

  .. code-block:: javascript

     forms.ValidationError('Invalid value', {code: 'invalid'})

* Don't coerce variables into the message; use placeholders and the ``params``
  argument of the constructor:

  .. code-block:: javascript

     forms.ValidationError('Invalid value: {value}', {params: {value: '42'}})

Putting it all together:

.. code-block:: javascript

   throw forms.ValidationError('Invalid value: {value)', {
     code: 'invalid',
     params: {value: '42'}
   })

Following these guidelines is particularly useful to others if you write
reusable forms and form fields.

If you're at the end of the validation chain (i.e. your form's ``clean()``) and
you know you will *never* need to override your error message (or even just...
`because <http://www.youtube.com/watch?v=pWdd6_ZxX8c>`_) you can still opt
for the less verbose:

.. code-block:: javascript

   forns.ValidationError('Invalid value: ' + value)

Throwing multiple errors
------------------------

If you detect multiple errors during a cleaning method and wish to signal all
of them to the form submitter, it is possible to pass a list of errors to the
``ValidationError`` constructor.

It's recommended to pass a list of ``ValidationError`` instances with ``code``\s
and ``params`` but a list of strings will also work:

.. code-block:: javascript

   throw forms.ValidationError([
     forms.ValidationError('Error 1', {code: 'error1'}),
     forms.ValidationError('Error 2', {code: 'error2'})
   ])

   throw forms.ValidationError(['Error 1', 'Error 2'])

Using validation in practice
============================

The previous sections explained how validation works in general for forms.
Since it can sometimes be easier to put things into place by seeing each
feature in use, here are a series of small examples that use each of the
previous features.

.. _validators:

Using validators
----------------

Fields support use of utility functions known as validators. A validator
is a function that takes a value and returns nothing if the value is valid, or
thriws a :js:class:`ValidationError` if not. These can be passed to a field's
constructor, via the field's ``validators`` argument, or defined on the field's
``prototype`` as a ``defaultValidators`` property.

Let's have a look at a basic implementation of newforms' ``SlugField``:

.. code-block:: javascript

   var MySlugField = forms.CharField.extend({
     defaultValidators: [forms.validators.validateSlug]
   })

As you can see, a basic ``SlugField`` is just a ``CharField`` with a customised
validator that validates that submitted text obeys some character usage rules.
This can also be done on field definition so:

.. code-block:: javascript

   var field = new MySlugField()

is equivalent to:

.. code-block:: javascript

   var field = forms.CharField({validators: [forms.validators.validateSlug]})

Common cases such as validating against an email or a regular expression can be
handled using existing validators available in newforms. For example,
:js:func:`validateSlug` is a function created by passing a slug-matching
``RegExp`` to the :js:class:`RegexValidator` function factory.

Form field default cleaning
---------------------------

Let's firstly create a custom form field that validates its input is a string
containing comma-separated email addresses:

.. code-block:: javascript

   var MultiEmailField = forms.Field.extend({
     /**
      * Normalise data to a list of strings.
      */
     toJavaScript: function(value) {
       // Return an empty list if no input was given
       if (this.isEmptyValue(value)) {
         return []
       }
       return value.split(/, ?/g)
     },

     /**
      * Check if value consists only of valid emails.
      */
     validate: function(value) {
       // Use the parent's handling of required fields, etc.
       MultiEmailField.__super__.validate.call(this, value)
       value.map(forms.validators.validateEmail)
     }
   })

Let's create a simple ContactForm to demonstrate how you'd use this field:

.. code-block:: javascript

   var ContactForm = forms.Form.extend({
     subject: forms.CharField({maxLength: 100}),
     message: forms.CharField(),
     sender: forms.EmailField(),
     recipients: new MultiEmailField(),
     ccMyself: forms.BooleanField({required: false})
   })

Cleaning a specific field
-------------------------

Suppose that in our ``ContactForm``, we want to make sure that the
``recipients`` field always contains the address ``"fred@example.com"``. This is
validation that is specific to our form, so we don't want to put it into the
general ``MultiEmailField``. Instead, we write a cleaning function that operates
on the ``recipients`` field, like so:

.. code-block:: javascript

   var ContactForm = forms.Form.extend({
     // Everything as before
     // ...

     cleanRecipients: function() {
       var recipients = this.cleanedData.recipients
       if (recipients.indexOf('fred@example.com') == -1) {
         throw forms.ValidationError('You forgot about Fred!')
       }
     }
   }

.. versionchanged:: 0.10
   You can no longer return a value from a custom field cleaning method to
   update the field's ``cleanedData``.

Cleaning and validating fields that depend on each other
--------------------------------------------------------

.. _ref-validation-form-clean:

form.clean()
~~~~~~~~~~~~

There are two ways to report any errors from this step. Probably the most common
method is to display the error at the top of the form. To create such an error,
you can throw a ``ValidationError`` from the ``clean()`` method. For example:

.. code-block:: javascript

   var ContactForm = forms.Form.extend({
     // Everything as before
     // ...

     clean: function() {
       var ccMyself = this.cleanedData.ccMyself
       var subject = this.cleanedData.subject

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
In this case, let's assign an error message to both the "subject" and "ccMyself"
rows in the form display:

.. code-block:: javascript

   var ContactForm = forms.Form.extend({
     // Everything as before
     // ...

     clean: function() {
       var cleanedData = ContactForm.__super__.clean.call(this)
       var ccMyself = this.cleanedData.ccMyself
       var subject = this.cleanedData.subject

       if (ccMyself && subject && subject.indexOf('help') == -1) {
         var message = "Must put 'help' in subject when cc'ing yourself."
         this.addError('ccMyself', message)
         this.addError('subject', message)
       }
     }
   }

The second argument oto ``addError()`` can be a simple string, or preferably
an instance of ``ValidationError``. See :ref:`throwing-validation-error` for
more details. Note that ``addError()`` automatically removes the field
from ``cleanedData``.

Specifying fields used in cross-field validation
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. versionadded:: 0.9

To let a form know which fields are used in cross-field validation, specify its
``clean()`` method as an array of field named followed by the cleaning function
itself.

In scenarios where the form is being partially updated, such as when individual
field input values are being updated and validated when an ``onChange`` event
fires, if this information is available cross-field cleaning will only be
performed if one of the fields it uses is affected.

.. code-block:: javascript

   var PersonForm = forms.Form.extend({
     firstName: forms.CharField({required: false, maxLength: 50}),
     lastName: forms.CharField({required: false, maxLength: 50}),
     jobTitle: forms.CharField({required: false, maxLength: 100}),
     organisation : forms.CharField({required: false}),

     clean: ['firstName', 'lastName', function() {
        if (!this.cleanedData.firstName && !this.cleanedData.lastName) {
          throw forms.ValidationError('A first name or last name is required.')
        }
     }]
   })

Asynchronous validation
=======================

.. versionadded:: 0.10

For some validation you may need to access an external data source, such as a
web service, database or filesystem. In JavaScript, these tend to be
asynchronous operations.

You can let newforms know that a custom field -- or cross-field -- validation
method will be async by defining it with a single parameter in its function
signature. It doesn't matter what this is called, but it's conventionally called
``callback`` or ``cb``:

.. code-block:: javascript

   cleanUsername: function(callback) {
     // ...
   }

When your custom cleaning method is finished whatever async operation it needs
to perform, it *must* call the callback function to let the form know it can
proceed with validation.

The callback has the following signature:

.. code-block:: javascript

   function callback(error, validationError)

* ``error`` -- an ``Error`` indicating that something went wrong with the async
  operation. Any falsy value can be passed if there was no error, but it's
  conventional to pass ``null`` in that case.

* ``validationError`` -- an error message if the field's value was invalid, this
  can be a simple string or a ``ValidationError``.

If async validation determines that the input is valid, you must still call the
callback to let newforms know you're done. It can be called without any
arguments in this case.

The callback must only be called once, so take care with your custom validation
logic, branching or returning early as necessary to avoid calling it multiple
times.

Async field validation example
------------------------------

A common use case for async validation is checking if a username is available in
a signup form:

.. code-block:: javascript

   cleanUsername: function(callback) {
     post('/checkuser', {username: this.cleanedData.username}, function(err, res) {
       // There was an error during the HTTP request
       if (err) {
         return callback(err)
       }

       // The username is already taken
       if (res.alreadyTaken) {
         return callback(null, forms.ValidationError('This username is already taken.'))
       }

       // The username is available
       callback()
     })
   }
