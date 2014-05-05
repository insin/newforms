==========
Quickstart
==========

Defining a Form
===============

Form constructors are created using :js:func:`Form.extend`.

This takes an ``Object`` argument defining :doc:`fields` and any other
properties for the form's prototype (:doc:`custom validation <validation>`
functions etc.), returning a Form constructor which inherits from
:js:class:`BaseForm`:

.. code-block:: javascript

   var ContactForm = forms.Form.extend({
     subject: forms.CharField({maxLength: 100})
   , message: forms.CharField()
   , sender: forms.EmailField()
   , ccMyself: forms.BooleanField({required: false})

You can implement custom validation for a field by adding a ``clean<FieldName>()``
function to the form's prototype:

.. code-block:: javascript

   , cleanSender: function() {
       if (this.cleanedData.sender == 'mymatesteve@gmail.com') {
          throw forms.ValidationError("I know it's you, Steve. " +
                                      "Stop messing with my example form.")
       }
     }

Custom whole-form validation can be implemented by adding a clean() function to
the form's prototype:

.. code-block:: javascript

   , clean: function() {
       if (this.cleanedData.subject &&
           this.cleanedData.subject.indexOf('that tenner you owe me') != -1 &&
           PEOPLE_I_OWE_A_TENNER_TO.indexOf(this.cleanedData.sender) != 1) {
         // This error will be associated with the named field
         this.addError('sender', "Your email address doesn't seem to be working.")
         // This error will be associated with the form itself, to be
         // displayed independently.
         throw forms.ValidationError('*BZZZT!* SYSTEM ERROR. Beeepity-boop etc. etc.')
       }
     }
   })

Instantiating a Form
====================

For convenience and compactness, the ``new`` operator is optional when creating
newforms' Fields, :doc:`widgets` and other constructors which are commonly
used while defining a Form, such as :js:class:`ValidationError` -- however
``new`` is **not**  automatically optional for Form constructors:

.. code-block:: javascript

   // ...in a React component...
   getInitialState: function() {
     return {
       form: new ContactForm({
         validation: 'auto'
       , onStateChange: this.forceUpdate.bind(this)
       })
     }
   }

Rendering a Form
================

Forms have default convenience :ref:`rendering methods <ref-outputting-forms-as-html>`
to get you started quickly, which display a label, input widgets and any
validation errors for each field::

   // ...in a React component's render() method...
   <form ref="contactForm" onSubmit={this.onSubmit}>
     {this.state.form.asDiv()}
     <div className="controls">
       <input type="submit" value="Submit"/>
     </div>
   </form>

The API used to implement default rendering is exposed for you to
:ref:`implement your own custom rendering <ref-overview-customising-display>`
using JSX (if you wish) and ``React.DOM``.

Validating input with a Form
============================

When a form is instantiated with the ``validate`` option, as above, it will
automatically hook its rendered fields up with ``onChange`` handlers to validate
user input as it's entered.

To supply a form with completed user input to be validated and cleaned -- such
as when the user submits the form -- call ``setData()`` on a form to bind
new data to it, or if you already have the data, pass a ``data`` option when
creating the form.

A convenience wrapper around ``setData()`` is provided -- ``validate()`` --
which takes a reference to a ``<form>``, extracts input data from it and sets
it on the form.

For example, if the form was held as state in a React component which had the
above JSX in its ``render()`` method:

.. code-block:: javascript

   // ...in a React component...
   onSubmit: function(e) {
     e.preventDefault()

     // A Form's validate() method gets input data from a given <form> and
     // validates it.
     var isValid = this.state.form.validate(this.refs.contactForm)

     // If the data was invalid, the forms's error object will have been
     // populated with field validation errors and the form will have called
     // its onStateChange callback to update its display.

     if (isValid) {
       // form.cleanedData contains validated input data, coerced to the
       // appropriate JavaScript data types by its Fields.
     }
   }
