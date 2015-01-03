============================
Interactive Forms with React
============================

Other documentation sections use the API for providing user input when creating
a Form instance, to demonstrate behaviour and features based on user input in a
concise way.

However, this API is more typical of using newforms on the server or as a
standalone validator. When working with Forms in the client, user input is more
often taken one field at a time using its ``onChange`` event.

This section focuses on API and patterns of usage that are applicable to using
newforms to create interactive forms in a React component in the browser.

Provide a containing ``<form>``
===============================

.. Warning::
   You **must** provide a ``<form>`` to contain fields you’re rendering with
   newforms.

At the time of documenting (version 0.10), you **must** provide a ``<form>`` to
contain fields you're rendering with newforms. It's likely that you'll want one
anyway to make use of its ``onSubmit`` event for `Final Form validation`_.

React's virtual DOM doesn't provide a means of obtaining values from form
inputs. To do this for you, newforms must reach into the real DOM when an
``onChange`` event fires on one of the inputs it rendered for you.

Forms currently make use of the real DOM's ``form.elements`` collection to
simplify retrieving values for fields which render as multiple inputs, such
as a ``MultipleChoiceField`` which uses a ``CheckboxSelectMultiple`` widget.

Creating Forms and FormSets
===========================

There are a number of client-specific options available when creating an instance
of a Form to use in a React component. The same options apply when creating
FormSets, as they use them to handle creation of Form instances for you.

.. _ref-form-state-onchange:

Form state and ``onChange()``
=============================

While a Form is not itself a React component, it is stateful. Its ``data``,
``errors()`` and ``cleanedData`` properties will be changed when the user makes
changes and their input is taken and validated.

In order to update display of its containing React component, a Form will call
a given ``onChange()`` callback each time user input is taken or validation is
performed in response to a user changing input data.

.. Note::
   The details of setting up ``onChange`` are handled for you when rendering a
   Form by passing its constructor to a ``<RenderForm/>`` component.

Typically, this function will just force its React component to update, for
example:

.. code-block:: javascript

   getInitialState: function() {
     return {
       form: new ContactForm({onChange: this.onFormChange})
     }
   },

   onFormChange: function() {
     this.forceUpdate()
   }

Passing an ``onChange`` callback will also automatically configure interactive
validation of each form input as it's updated by the user. See below for details
of what that entails and how to configure it.

.. Note::
   Due to the way controlled components work in React, if you are using
   `Controlled user inputs`_ and you do not pass an ``onChange()`` callback, your form
   inputs will be read-only! The development version of newforms will warn you
   if this happens.

Interactive Form validation
===========================

To validate individual input fields as the user interacts with them, you can pass
a ``validation`` argument when instantiating a Form or Field; passing a
``validation`` argument when instantiating a Form sets up interactive validation
for every Field in it.

.. _ref-form-auto-validation:

Form ``'auto'`` validation
--------------------------

When you pass an ``onChange`` callback to a Form, its validation mode is
automatically implied to be ``'auto'``:

.. code-block:: javascript

   var form = new SignupForm({onChange: this.onFormChange})

When the validation mode is ``'auto'``:

* Text fields are validated using the ``onChange`` and ``onBlur`` events, with a
  debounce delay of 369ms applied to ``onChange`` between the last change being
  made and validation being performed.
* Other input fields are validated as soon as the user interacts with them.

.. note::

   React normalises the ``onChange`` event in text inputs to fire after every
   character which is entered.

``'auto'`` example form
------------------------

Let's use a standard signup form as an example:

.. code-block:: javascript

   var SignupForm = forms.Form.extend({
     email: forms.EmailField(),
     password: forms.CharField({widget: forms.PasswordInput}),
     confirm: forms.CharField({label: 'Confirm password', widget: forms.PasswordInput}),
     terms: forms.BooleanField({
       label: 'I have read and agree to the Terms and Conditions',
       errorMessages: {required: 'You must accept the terms to continue'}
     }),

     clean: function() {
       if (this.cleanedData.password && this.cleanedData.confirm &&
           this.cleanedData.password != this.cleanedData.confirm) {
         throw forms.ValidationError('Passwords do not match.')
       }
     }
   })

Note that this Form defines a :ref:`clean() function <ref-validation-form-clean>`
for cross-field validation. In addition to validating the field which just changed,
user input will also trigger cross-field validation by calling ``clean()``. This
function must always be written defensively regardless of whether full or partial
validation is being run, as it can't assume that any of the ``cleanedData`` it
validates against will be present due to the possibility of missing or invalid
user input.

.. raw:: html

   <iframe src="_static/html/auto-form-validation.html"
           style="box-sizing: border-box; width: 100%; overflow: hidden; border: 0">
   </iframe>

Field validation
================

Fields also accept a ``validation`` argument -- validation defined at the field
level overrides any configured at the Form level, so if you want to use interaction
validation only for certain fields, or to opt fields out when validation has been
configured at the Form level, use the ``validation`` argument when defining those
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

``on``
   The name of the default event to use to trigger validation on text input
   fields. This can be specified with or without an ``'on'`` prefix. If validation
   should be triggerd by multiple events, their names can be passed as a
   space-delimited string or a list of strings.

   For example, given ``validation: {on: 'blur'}``, text input validation will
   be performed when the input loses focus after editing.

``onChangeDelay``
   A delay, in milliseconds, to be used to debounce performing of
   validation when using the ``onChange`` event, to give the user time to enter
   input without distracting them with error messages or other disply changes
   around the input while they're still typing.

``'auto'``
----------

The behaviour of ``'auto'`` validation is :ref:`documented above <ref-form-auto-validation>`.
It's equivalent to passing:

.. code-block:: javascript

   validation: {on: 'blur change', onChangeDelay: 369}

Any event name
--------------

If you pass any other string as the ``validation`` argument, it will be assumed
to be an event name, so the following lines are equivalent:

.. code-block:: javascript

   validation: 'blur'
   validation: {on: 'blur'}

Final Form validation
=====================

Whether or not you've given your Form an ``onChange`` callback, Forms will still
automatically update their ``data`` object with user input as the user interacts
with each input field. Even if all fields have been used and are valid, the user
still has to signal their intent to submit before any final validation can be
performed.

Validating final form submission is left in your hands, as newforms doesn't know
(or care, sorry!) what you ultimatey want to do with the ``cleanedData`` it
creates for you.

This is typically implemented by hooking into a ``<form>``'s ``onSubmit`` event
and calling ``form.validate()`` to validate the entire user input.

.. code-block:: javascript

   onSubmit: function(e) {
     e.preventDefault()
     var form = this.state.form
     var isValid = form.validate()
     if (isValid) {
       this.props.processContactData(form.cleanedData)
     }
   }

.. Tip::
   Forms represent groups of related Fields and don't necessarily have to model
   the content of the entire ``<form>``. Use as many as you like, but don't
   forget to use :ref:`prefixes <ref-form-prefixes>` when necessary to avoid
   input field ``name`` and ``id`` clashes.

Controlled user inputs
======================

By default, newforms generates `uncontrolled React components`_ for user inputs,
which can provide initial values but require manual updating via the DOM should
you wish to change the displayed values from code.

If you need to programatically update the values displayed in user inputs after
their initial display, you will need to use `controlled React components`_.

You can do this by passing a ``controlled`` argument when constructing the Form
or individual Fields you wish to have control over:

.. code-block:: javascript

   var form = new SignupForm({controlled: true, onChange: this.onFormChange})

Controlled components created by newforms reflect the values held in
``form.data``. It's recommended that you call ``form.setData()`` or
``form.updateData()`` to update ``form.data``, as they handle transitioning from
initial display of data to displaying user input and will also call
``onChange()`` for you, to trigger re-rendering of the containing React
component.

``controlled`` example Form
---------------------------

An example of reusing the same controlled Form to edit a bunch of different
objects which have the same fields.

First, define a form:

.. code-block:: javascript

   var PersonForm = forms.Form.extend({
     name: forms.CharField({maxLength: 100}),
     age: forms.IntegerField({minValue: 0, maxValue: 115}),
     bio: forms.CharField({widget: forms.Textarea})
   })

When creating the form in our example React component, we're passing
``controlled: true``:

.. code-block:: javascript

   getInitialState: function() {
     return {
       form: new PersonForm({
         controlled: true,
         onChange: this.forceUpdate.bind(this)
       }),
       editing: null,
       people: [/* ... */]
     }
   }

To update what's displayed in the form, we have a ``handleEdit`` function in our
React component which is calling ``form.reset()`` to put the form back into its
initial state, with new initial data:

.. code-block:: javascript

   handleEdit: function(personIndex) {
     this.state.form.reset(this.state.people[personIndex])
     this.setState({editing: personIndex})
   }

.. raw:: html

   <iframe src="_static/html/controlled-form.html"
           style="box-sizing: border-box; width: 100%; overflow: hidden; border: 0">
   </iframe>

.. _`uncontrolled React components`: http://facebook.github.io/react/docs/forms.html#uncontrolled-components
.. _`controlled React components`: http://facebook.github.io/react/docs/forms.html#controlled-components

Rendering Forms
===============

One of the benefits of using React is that display logic really is Just
JavaScript. Reusable pieces can be extracted into functions, or React components,
or a configurable object of some sort or... whatever your programmery heart
desires.

Newforms gives you a rendering helper -- called a ``BoundField`` -- for each
field, which has access to the Field, its Widget and its Form, which
collectively have access to all the metadata and user input data it needs to
render the field. It uses these to implement rendering helper methods, which are
available for you to use in your react components.

BoundFields, their most useful properties and examples of their use are covered
in :doc:`custom_display` and the complete :doc:`boundfield_api` is documented.
