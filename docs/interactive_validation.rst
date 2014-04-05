======================
Interactive validation
======================

To validate individual form fields as the user interacts with them, you can pass
a ``validation`` argument when instantiating a Form or Field.

Form ``validation``
===================

Passing a ``validation`` argument when instantiating a form sets up interactive
validation for every field on the form.

Form state and ``onStateChange()``
----------------------------------

When using interactive validation, either at the Form or individual Field level,
you must pass the Form an ``onStateChange`` argument, which should be a callback
function from the React component the form is being rendered in. An Error will
be thrown if this argument is not provided.

While a Form is not itself a React component, it is stateful. When user input is
taken as the user makes changes and validation is run, the form's ``data``,
``errors()`` and ``cleanedData`` will be changed depending on the outcome of
validation.

In order to update display of the form to let the user see the current validation
state, a Form will call its given ``onStateChange()`` function each time user
input is taken and validation is performed.

Typically, this function will just force its React component to update, for
example:

.. code-block:: javascript

   onFormStateChange: function() {
     this.setState({form: this.state.form})
   }

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

XXX

.. raw:: html

   <script src="_static/js/react-0.10.0.min.js"></script>
   <script src="_static/js/newforms.min.js"></script>
   <script src="_static/js/interactive-validation.js"></script>