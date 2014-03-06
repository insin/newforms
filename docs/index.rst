========
newforms
========

Newforms is a JavaScript form-handling library which started out as a drect port
of the `Django`_ framework's ``django.forms`` library.

It's now usable in browsers and on `Node.js`_ and -- as of version 0.5 -- it
uses `React`_ for form rendering in all environments and for client-side
interactivity.

Getting newforms
================

Browser bundles
   Browser bundles include all dependencies except React.

   They expose newforms as a global ``forms`` variable and expect to find a
   global ``React`` variable to work with.

   Release bundles will be available from:

      * https://github.com/insin/newforms/tree/react/dist

   Development bundles (updated intermittently):

      * `newforms.js`_
      * `newforms.min.js`_

Node.js
   ::

      npm install newforms

   .. code-block:: javascript

      var forms = require('newforms')

Source
   Newforms source code and issue tracking is on GitHub:

      * https://github.com/insin/newforms

.. _`newforms.js`: https://github.com/insin/newforms/raw/react/newforms.js
.. _`newforms.min.js`: https://github.com/insin/newforms/raw/react/newforms.min.js

Contents
========

.. Note::

   Unless specified otherwise, documented API items live under the ``forms``
   namespace object in the browser, or the result of ``require('newforms')`` in
   Node.js.

.. toctree::
   :maxdepth: 1

   overview
   forms
   fields
   validation
   widgets
   formsets
   util
   forms_api
   fields_api
   widgets_api
   port_differences

.. _`Django`: http://www.djangoproject.com
.. _`Node.js`: http://nodejs.org
.. _`React`: http://facebook.github.io/react/

Quick Guide
===========

In a hurry? Here's a quick guide to getting started with using a newforms Form:

* Form constructors are created using :js:func:`Form.extend`.

  This takes an ``Object`` argument defining :doc:`fields` and any other
  properties for the form's prototype (:doc:`custom validation <validation>`
  functions etc.), returning a Form constructor which inherits from
  :js:class:`BaseForm`:

  .. code-block:: javascript

     var ContactForm = forms.Form.extend({
       subject  : forms.CharField({maxLength: 100})
     , message  : forms.CharField()
     , sender   : forms.EmailField()
     , ccMyself : forms.BooleanField({required: false})

     // Implement custom validation for a field by adding a clean<FieldName>()
     // function to the form's prototype.
     , cleanSender: function() {
         if (this.cleanedData.sender == 'mymatesteve@gmail.com') {
            throw forms.ValidationError("I know it's you, Steve. " +
                                        "Stop messing with my example form.")
         }
       }

     // Implement custom whole-form validation by adding a clean() function to
     // the form's prototype
     , clean: function() {
         if (this.cleanedData.subject.indexOf('that tenner you owe me') != -1 &&
             PEOPLE_I_OWE_A_TENNER_TO.indexOf(this.cleanedData.sender) != 1) {
           // This error will be associated with the named field
           this.addError('sender', "Your email address doesn't seem to be working.")
           // This error will be associated with the form itself, to be
           // displayed independently.
           throw forms.ValidationError('*BZZZT!* SYSTEM ERROR. Beeepity-boop etc. etc.')
         }
       }
     })

* For convenience and compactness, the ``new`` operator is **optional** when
  using newforms' Fields, :doc:`widgets` and other constructors which are commonly
  used while defining a Form, such as :js:class:`ValidationError` -- however
  ``new`` is **not**  automatically optional for Form constructors:

  .. code-block:: javascript

     var form = new ContactForm({initial: initialData})

* Forms have default convenience :ref:`rendering methods <ref-outputting-forms-as-html>`
  to get you started quickly, which display a label, input widgets and any
  validation errors for each field (however, JSX and ``React.DOM`` make it
  convenient to write your own custom rendering later)::

     <form ref="contactForm">
       <table>
         <tbody>
           {this.state.form.asTable()}
         </tbody>
       </table>
       <div className="controls">
         <input type="button" value="Submit" onClick={this.onSubmit}/>
       </div>
     </form>

* To bind a form to user data to be validated and cleaned, pass a ``data``
  object. For example, if the form was held as state in a React component which
  had the above JSX in its ``render()`` method:

  .. code-block:: javascript

     var form = this.state.form
     var formData = forms.formData(this.refs.contactForm.getDOMNode())
     var isValid = form.setData(formData)

     if (isValid) {
       // form.cleanedData now contains validated input data, coerced to the
       // appropriate JavaScript data types by its Fields.
     }
     else {
       // If the data was invalid, the forms's error object will be populated
       // with field validation errors, which will be displayed the next time
       // it's rendered.
       this.forceUpdate()
     }
