========================
newforms |travis_status|
========================

.. |travis_status| image:: https://secure.travis-ci.org/insin/newforms.png
   :target: http://travis-ci.org/insin/newforms

An isomorphic JavaScript form-handling library for `React`_.

(Formerly a direct port of the `Django`_ framework's ``django.forms`` library)

Getting newforms
================

Node.js

   Newforms can be used on the server, or bundled for the client using an
   npm-compatible packaging system such as `Browserify`_ or `webpack`_.

   ::

      npm install newforms

   .. code-block:: javascript

      var forms = require('newforms')

   By default, newforms will be in development mode. To use it in production
   mode, set the environment variable ``NODE_ENV`` to ``'production'`` when
   bundling. To completely remove all development mode code, use a minifier
   that performs dead-code elimination, such as `UglifyJS`_.

Browser bundles
   Browser bundles expose newforms as a global ``forms`` variable and expect to
   find a global ``React`` variable to work with.

   `newforms 0.9.0 (development version)`_

   Uncompressed, with warnings about potential mistakes.

   `newforms 0.9.0 (production version)`_

   Compressed version for production.

.. _`newforms 0.9.0 (development version)`: https://github.com/insin/newforms/raw/react/dist/newforms-0.9.0.js
.. _`newforms 0.9.0 (production version)`: https://github.com/insin/newforms/raw/react/dist/newforms-0.9.0.min.js

`Documentation @ ReadTheDocs`_
==============================

`Newforms Examples @ GitHub`_
=============================

.. _`Documentation @ ReadTheDocs`: http://newforms.readthedocs.org
.. _`Newforms Examples @ GitHub`: https://github.com/insin/newforms-examples

Quick Guide
===========

A quick introduction to defining and using newforms Form objects.

Design your form
----------------

The starting point for defining your own forms is ``Form.extend()``.

Here's a simple (but incomplete!) definition of a type of Form you've probably
seen dozens of times::

   var SignupForm = forms.Form.extend({
     username: forms.CharField(),
     email: forms.EmailField(),
     password: forms.CharField({widget: forms.PasswordInput}),
     confirmPassword: forms.CharField({widget: forms.PasswordInput}),
     acceptTerms: forms.BooleanField({required: true})
   })

A piece of user input data is represented by a ``Field``, groups
of related Fields are held in a ``Form`` and a form input which will
be displayed to the user is represented by a ``Widgets`` Every
Field has a default Widget, which can be overridden.

Create a Form instance in a React component
-------------------------------------------

Form instances hold the state of a Form's user input and validation results.
Since a Form is managing some state for you, you may wish to keep it in your
component's state.

To let the Form let your component know that the state it manages has changed,
pass it an ``onChange`` callback::

   var SignupComponent = React.createClass({
     getInitialState: function() {
       return {
         form: new SignupForm({onChange: this.forceUpdate.bind(this)})
       }
     },

     // ...

Rendering a Form instance
-------------------------

Forms provide helpers for rendering labels, user inputs and validation errors
for their fields. They also have convenience rendering methods to get you
started quickly by surrounding these with some basic structure.

At the very least, you must wrap these form-rendered contents in a ``<form>``,
provide form controls such as a submit button and hook up handling of form
submission::

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
------------------------

The final step in using a Form is validating the entire form when the user
attempts to submit it. Calling its ``validate()`` method validates every field
in the form with its current user input.

If a Form is valid, it will have a ``cleanedData`` object containing validated
data, coerced to the appropriate JavaScript data type when appropriate::

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
------------------------------

There's an obvious validation not being handled by our form: what if the
passwords don't match?

This is a cross-field validation. To implement custom, cross-field validation
add a ``clean()`` method to the Form definition::

   clean: function() {
     if (this.cleanedData.password &&
         this.cleanedData.confirmPassword &&
         this.cleanedData.password != this.cleanedData.confirmPassword) {
       throw forms.ValidationError('Passwords do not match.')
     }
   }

`Live Quickstart Demo <http://newforms.readthedocs.org/en/latest/quickstart.html#live-demo>`_
---------------------------------------------------------------------------------------------

MIT Licensed
============

.. _`Browserify`: http://browserify.org/
.. _`Django`: http://www.djangoproject.com
.. _`React`: http://facebook.github.io/react/
.. _`UglifyJS`: https://github.com/mishoo/UglifyJS2
.. _`webpack`: http://webpack.github.io/