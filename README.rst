========================
newforms |travis_status|
========================

.. |travis_status| image:: https://secure.travis-ci.org/insin/newforms.png
   :target: http://travis-ci.org/insin/newforms

A JavaScript port of `Django`_'s `form-handling library`_, usable in browsers
and on the server with `Node.js`_, making use of `React`_ on both sides.

.. _`Django`: http://www.djangoproject.com
.. _`form-handling library`: http://docs.djangoproject.com/en/dev/topics/forms/
.. _`Node.js`: http://nodejs.org
.. _`React`: http://facebook.github.io/react/

Install
=======

Node.js::

   npm install newforms

Browser bundles (all dependencies except React included):

* `newforms.js`_ / `newforms.min.js`_

Browser bundles currently expose newforms as a ``forms`` variable and expect to
find a global ``React`` variable to work with.

.. _`newforms.js`: https://github.com/insin/newforms/raw/react/newforms.js
.. _`newforms.min.js`: https://github.com/insin/newforms/raw/react/newforms.min.js

`Documentation @ ReadTheDocs`_
==============================

.. _`Documentation @ ReadTheDocs`: http://newforms.readthedocs.org

Quick Guide
===========

Here's a quick guide to getting started with using a newforms' Form.

* Form constructors are created using ``forms.Form.extend()``.

  This takes an ``Object`` argument defining form fields and any other
  properties for the form's prototype (custom validation methods etc.),
  returning a Form constructor which inherits from ``BaseForm``::

     var ContactForm = forms.Form.extend({
       subject  : forms.CharField({maxLength: 100})
     , message  : forms.CharField()
     , sender   : forms.EmailField()
     , ccMyself : forms.BooleanField({required: false})
     })

* For convenience and compactness, the ``new`` operator is **optional** when
  using newforms' Fields, Widgets and other constructors which are commonly
  used while defining a Form, such as ValidationError -- however ``new`` is
  **not**  automatically optional for the Form and FormSet constructors you
  create::

     var form = new ContactForm({initial: initialData})

* Forms have default convenience rendering methods to get you started quickly,
  which display a label, input widgets and any validation errors for each field
  (however, JSX makes it convenient to write your own custom rendering later)::

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
  object::

     var formData = forms.formData(this.refs.contactForm.getDOMNode())
     var form = new ContactForm({data: formData})

     if (form.isValid()) {
       // form.cleanedData now contains validated input data, coerced to the
       // appropriate JavaScript type by its Field.
     }
     else {
       // If the data wasn't valid, the forms's error object will be populated
       // with field validation errors.
       this.setState({form: form})
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
