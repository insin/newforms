========================
newforms |travis_status|
========================

.. |travis_status| image:: https://secure.travis-ci.org/insin/newforms.png
   :target: http://travis-ci.org/insin/newforms

An isomorphic JavaScript form-handling library for `React`_.

(Old `Django`_ hands may recognise "newforms" as the former name of its
`form-handling library`_ - newforms started out as a direct port of
``django.forms`` to JavaScript)

.. _`React`: http://facebook.github.io/react/
.. _`Django`: http://www.djangoproject.com
.. _`form-handling library`: http://docs.djangoproject.com/en/dev/topics/forms/

Getting newforms
================

Node.js
   ::

      npm install newforms

   .. code-block:: javascript

      var forms = require('newforms')

Browser bundles
   Browser bundles include all dependencies except React.

   They expose newforms as a global ``forms`` variable and expect to find a
   global ``React`` variable to work with.

   Release bundles are available from:

      * https://github.com/insin/newforms/tree/react/dist

`Documentation @ ReadTheDocs`_
==============================

`Newforms Examples @ GitHub`_
=============================

.. _`Documentation @ ReadTheDocs`: http://newforms.readthedocs.org
.. _`Newforms Examples @ GitHub`: https://github.com/insin/newforms-examples

Quick Guide
===========

* Form constructors are created using ``forms.Form.extend()``.

  This takes an ``Object`` argument defining form fields and any other
  properties for the form's prototype (custom validation functions etc.),
  returning a Form constructor which inherits from ``BaseForm``::

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

* For convenience and compactness, the ``new`` operator is **optional** when
  using newforms' Fields, Widgets and other constructors which are commonly
  used while defining a Form, such as ValidationError -- however ``new`` is
  **not**  automatically optional for the Form and FormSet constructors you
  create::

     // ...in a React component...
     getInitialState: function() {
       return {
         form: new ContactForm({
           validation: 'auto'
         , onStateChange: this.forceUpdate.bind(this)
         })
       }
     }

* Forms have default convenience rendering methods to get you started quickly,
  which display a label, input widgets and any validation errors for each field
  (however, JSX and ``React.DOM`` make it convenient to write your own custom
  rendering later)::

     // ...in a React component's render() method...
     <form ref="contactForm" onSubmit={this.onSubmit}>
       <table>
         <tbody>
           {this.state.form.asTable()}
         </tbody>
       </table>
       <div className="controls">
         <input type="submit" value="Submit"/>
       </div>
     </form>

* To bind a form to user data to be validated and cleaned, pass a ``data``
  object when creating it, or call the ``setData()`` method of an existing
  form to bind new data to it.

  For example, if the form was held as state in a React component which
  had the above JSX in its ``render()`` method::

     // ...in a React component...
     onSubmit: function(e) {
       e.preventDefault()

       // A Form's validate() method gets input data from a given <form> and
       // validates it.
       var isValid = this.state.form.validate(this.refs.contactForm)

       // If the data was invalid, the forms's error object will be populated
       // with field validation errors and the form will have called its
       // onStateChange callback to update its display.

       if (isValid) {
         // form.cleanedData contains validated input data, coerced to the
         // appropriate JavaScript data types by its Fields.
       }
     }

MIT License
===========

Copyright (c) 2014, Jonathan Buchanan

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
