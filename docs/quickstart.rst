==========
Quickstart
==========

A quick introduction to defining and using newforms Form objects.

Design your form
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
of related Fields are held in a :doc:`Form <forms>` and form inputs which will
be displayed to the user are represented by :doc:`Widgets <widgets>`. Every
Field has a default Widget, which can be overridden.

Create a Form instance in a React component
===========================================

Form instances hold the state of a Form's user input and validation results.
Since a Form is managing some state for you, you may wish to keep it in your
component's state.

To let the Form let your component know that the state it manages has changed,
pass it an ``onChange`` callback:

.. code-block:: javascript

   var SignupComponent = React.createClass({
     getInitialState: function() {
       return {
         form: new SignupForm({onChange: this.forceUpdate.bind(this)})
       }
     },

     // ...

Rendering a Form instance
=========================

Forms provide helpers for rendering labels, user inputs and validation errors
for their fields. They also have convenience rendering methods to get you
started quickly by surrounding these with some basic structure.

At the very least, you must wrap these form-rendered contents in a ``<form>``,
provide form controls such as submit button and hook up handling of form
submission:

.. code-block:: javascript

   render: function() {
     return <form onSubmit={this.onSubmit}>
       <table>
         <tbody>
           {this.state.form.asTable()}
         </tbody>
       </table>
       <div className="controls">
         <input type="submit" value="Submit"/>
       </div>
     </form>
   },

   // ...

Forms attach event handlers to the inputs they render, so getting user input
data is handled for you.

If you gave your Form an ``onChange`` callback, it will also automatically
validate user input as it's given and let your component know when to re-render,
to display any resulting state changes (such as new validation errors).

Handling form submission
========================

The final step in using a Form is validating the entire form when the user
attempts to submit it. calling its ``validate()`` method validates every fields
in the form with its current user input.

If a Form is valid, it will have a ``cleanedData`` object containing validated
data, coerced to the appropriate JavaScript data type when applicable:

.. code-block:: javascript

     propTypes: {
      onSubmitSignup: React.PropTypes.func.isRequired
     },

     onSubmit: function(e) {
       e.preventDefault()

       var isValid = this.state.form.validate()
       if (isValid) {
         this.props.onSubmitSignup(this.state.form.cleanedData)
       }
       else {
         this.forceUpdate()
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
which displays successfully submitted data:

.. raw:: html

   <div id="example-quickstart" class="newforms-example"></div>

.. raw:: html

   <script src="_static/js/react.min.js"></script>
   <script src="_static/js/newforms.min.js"></script>
   <script src="_static/js/quickstart.js"></script>
