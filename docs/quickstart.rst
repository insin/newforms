==========
Quickstart
==========

A quick introduction to defining and using newforms Form objects.

Design your Form
================

The starting point for defining your own forms is :js:func:`Form.extend()`.

Here's a simple (but incomplete!) definition of a type of Form you've probably
seen dozens of times:

.. code-block:: javascript

   var SignupForm = forms.Form.extend({
     username: forms.CharField(),
     email: forms.EmailField(),
     password: forms.CharField({widget: forms.PasswordInput}),
     confirmPassword: forms.CharField({widget: forms.PasswordInput}),
     acceptTerms: forms.BooleanField({required: true})
   })

A piece of user input data is represented by a :doc:`Field <fields>`, groups
of related Fields are held in a :doc:`Form <forms>` and a form input which will
be displayed to the user is represented by a :doc:`Widget <widgets>`. Every
Field has a default Widget, which can be overridden.

Rendering a Form
================

Forms provide helpers for rendering labels, user inputs and validation errors
for their fields. To get you started quickly, newforms provides a React
component which use these helpers to render a basic form structure.

At the very least, you must wrap rendered form contents in a ``<form>``,
provide form controls such as a submit button and hook up handling of form
submission:

.. code-block:: javascript

   var Signup = React.createClass({
     render: function() {
       return <form onSubmit={this._onSubmit}>
         <forms.RenderForm form={SignupForm} ref="form"/>
         <button>Sign Up</button>
       </form>
     },

     // ...

Rendering helpers attach event handlers to the inputs they render, so getting
user input data is handled for you.

The ``RenderForm`` component handles creating a form instance for you, and
setting up automatic validation of user input as it's given.

To access this form instance later, make sure the component has a ``ref`` name.

Handling form submission
========================

The final step in using a Form is validating when the user attempts to submit.

First, use the ``ref`` name you defined earlier to get the form instance via the
``RenderForm`` component's ``getForm()`` method.

Then call the form's ``validate()`` method to ensure every field in the form is
validated against its current user input.

If a Form is valid, it will have a ``cleanedData`` object containing validated
data, coerced to the appropriate JavaScript data type when appropriate:

.. code-block:: javascript

     propTypes: {
       onSignup: React.PropTypes.func.isRequired
     },

     _onSubmit: function(e) {
       e.preventDefault()

       var form = this.refs.form.getForm()
       var isValid = form.validate()
       if (isValid) {
         this.props.onSignup(form.cleanedData)
       }
     }
   })

Implementing custom validation
==============================

There's an obvious :doc:`validation <validation>` not being handled by our
form: what if the passwords don't match?

This is a cross-field validation. To implement custom, cross-field validation
add a ``clean()`` method to the Form definition:

.. code-block:: javascript

   clean: function() {
     if (this.cleanedData.password &&
         this.cleanedData.confirmPassword &&
         this.cleanedData.password != this.cleanedData.confirmPassword) {
       throw forms.ValidationError('Passwords do not match.')
     }
   }

Live demo
=========

This is the React component we defined above being used by another component
which passes an ``onSignup()`` callback to receive and display submitted data:

.. raw:: html

   <iframe src="_static/html/quickstart.html"
           style="box-sizing: border-box; width: 100%; overflow: hidden; border: 0">
   </iframe>
