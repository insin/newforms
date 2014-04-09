=================
Interactive forms
=================

.. versionadded:: 0.6

Form validation
===============

By default, validating form input is left in your hands, typically by hooking
into a ``<form>``'s ``onSubmit`` event and passing the ``<form>`` node into
``Form.validate()``.

While the ``onSubmit`` event must always be used o determine when the user is
done with form input, we can also provide feedback for the user as they work
their way through the form's fields.

To validate individual form fields as the user interacts with them, you can pass
a ``validation`` argument when instantiating a Form or Field.

Passing a ``validation`` argument when instantiating a form sets up interactive
validation for every field on the form.

.. _ref-form-auto-validation:

Form ``'auto'`` validation
--------------------------

The easiest way to get started is to pass ``'auto'``:

.. code-block:: javascript

   var form = new SignupForm({validation: 'auto', onStateChange: this.onFormStateChange})

When the form's validation is set to ``'auto'``:

* Text fields are validated using the ``onChange`` event, with a debounced 250ms
  delay between the last change and validation being performed.
* Other fields are validated as soon as the user interacts with them.

.. note::

   React normalises the ``onChange`` event in text inputs to fire after every
   character which is entered.

``'auto'`` example form
------------------------

Let's use a standard signup form as an example:

.. code-block:: javascript

   var SignupForm = forms.Form.extend({
     email: forms.EmailField()
   , password: forms.CharField({widget: forms.PasswordInput})
   , confirm: forms.CharField({label: 'Confirm password', widget: forms.PasswordInput})
   , terms: forms.BooleanField({
       label: 'I have read and agree to the Terms and Conditions'
     , errorMessages: {required: 'You must accept the terms to continue'}
     })

   , clean: function() {
       if (this.cleanedData.password && this.cleanedData.confirm &&
           this.cleanedData.password != this.cleanedData.confirm) {
         this.addError('confirm', 'Does not match the entered password.')
       }
     }
   })

Note that this form defines a :ref:`clean() function <ref-validation-form-clean>`
for cross-field validation. In addition to validating the field which just changed,
user input will also trigger form-wide validation by calling ``clean()``. This
function must always be written defensively regardless of whether full or partial
validation is being run, as it can't assume that any of the ``cleanedData`` it
validates against will be present due to the possibility of missing or invalid
user input.

.. raw:: html

   <div id="example-auto-form-validation" class="newforms-example"></div>

Field ``validation``
====================

Fields also accept a ``validation`` argument -- validation defined at the field
level overrides any configured at the Form level, so if you want to use interaction
validation only for certain fields or opt fields out when validation has been
configured at the form level, use the ``validation`` argument when defining those
fields.

``validation`` options
======================

``'manual'``
------------

This is the default option, which disables interactive validation.

You're only likely to need to use this if you're opting specific fields out of
form-wide interactive validation.

``validation`` object
---------------------

Interactive validation can be specified as an object with the following
properties:

``event``
   The name of the default event to use to trigger validation on text input
   fields. This should be in camelCase format, as used by React.

   For example, if ``'onBlur'``, text input validation will be performed when
   the input loses focus after editing.

``delay``
   A delay, in milliseconds, to be used to debounce performing of
   validation, to give the user time to enter input without distracting
   them with error messages or other change in how the input's displayed
   while they're still typing.

``'auto'``
----------

The behaviour of ``'auto'`` validation is :ref:`documented above <ref-form-auto-validation>`.
It's equivalent to passing:

.. code-block:: javascript

   validation: {event: 'onChange', delay: 250}

Any event name
--------------

If you pass any other string as the ``validation`` argument, it will be assumed
to be an event name, so the following lines are equivalent:

.. code-block:: javascript

   validation: 'onBlur'
   validation: {event: 'onBlur'}

Controlled components
=====================

By default, newforms generates `uncontrolled React components`_, which can
provide initial values for form inputs but require manual updating via the DOM
should you wish to change the displayed values via code.

If you need to programatically update the values displayed in a form after its
initial display, you will need to use `controlled React components`_.

You can do this byt passing a ``controlled`` argument when constructing the Form
or individual Fields you wish to have control over:

.. code-block:: javascript

   var form = new SignupForm({controlled: true, onStateChange: this.onFormStateChange})

Controlled components created by newforms reflect the values held in
``form.data``. It's recommended that you call ``form.setData()`` or
``form.updateData()`` to update ``form.data``, as they handle transitioning from
initial display of data to displaying user input and will also call
``onStateChange()`` for you to trigger re-rendering of the containing React
component.

``controlled`` example form
---------------------------

XXX

.. raw:: html

   <div id="example-controlled-form" class="newforms-example"></div>

Form state and ``onStateChange()``
==================================

When using interactive validation or controlled components, either at the Form
or individual Field level, you must pass the Form an ``onStateChange`` argument,
which should be a callback function for the React component the form is being
rendered in.

An Error will be thrown if this argument is not provided.

While a Form is not itself a React component, it is stateful. When user input is
taken as the user makes changes and the form's user input data is updated or
interactive validation is run, the form's ``data``, ``errors()`` and
``cleanedData`` may be changed.

In order to update display of the form to let the user see the updated state, a
Form will call its given ``onStateChange()`` function each time user input is
taken or validation is performed.

Typically, this function will just force its React component to update, for
example:

.. code-block:: javascript

   onFormStateChange: function() {
     this.setState({form: this.state.form})
   }

.. raw:: html

   <script src="_static/js/react-0.10.0.min.js"></script>
   <script src="_static/js/newforms.min.js"></script>
   <script src="_static/js/interactive-validation.js"></script>

.. _`uncontrolled React components`: http://facebook.github.io/react/docs/forms.html#uncontrolled-components
.. _`controlled React components`: http://facebook.github.io/react/docs/forms.html#controlled-components
