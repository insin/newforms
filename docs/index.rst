========
newforms
========

Newforms is a JavaScript port of `Django`_'s ``django.forms``
`form-handling library`_ library, usable in browsers and on the server with
`Node.js`_.

As of version 0.5, newforms depends on `React`_ for rendering content in all
environments and for implementation of client-side interactivity. It's also
is also tracking ``django.forms`` changes and new features up to and including
the current development version of Django, 1.7.

Since this is a port and ``django.forms`` is well-documented, guide
documentation will initially point to Django documentation and offer some
equivalent examples in JavaScript.

For an introduction to form-handling features and concepts, please refer to the
Django intro documentation:

   * `Django documentation -- Working with forms <https://docs.djangoproject.com/en/dev/topics/forms/>`_

For the just-show-me-how-it-works-and-I'll-figure-out-the-rest developer, the
`newforms unit tests`_ are peppered with guide comments -- lovingly copied and
pasted from Django's own test suite -- which explain the features being tested.

Contents
========

.. Note::

   Unless specified otherwise, documented API items live under the ``forms``
   namespace object in the browser, or the result of ``require('newforms')`` in
   Node.js.

.. toctree::
   :maxdepth: 1

   port_differences
   forms
   forms_api
   fields
   validation
   widgets
   formsets
   util

Quick Guide
===========

Here's a quick guide to getting started with using a newforms Form.

* Form constructors are created using :js:func:`Form.extend()`.

  This takes an ``Object`` argument defining form fields and any other
  properties for the form's prototype (custom validation methods etc.),
  returning a Form constructor which inherits from :js:class:`BaseForm`::

     var ContactForm = forms.Form.extend({
       subject  : forms.CharField({maxLength: 100})
     , message  : forms.CharField()
     , sender   : forms.EmailField()
     , ccMyself : forms.BooleanField({required: false})
     })

* For convenience and compactness, the ``new`` operator is **optional** when
  using a newforms Field, Widget and other constructors which are commonly
  used while implementing a Form, such as ValidationError -- however ``new`` is
  **not**  automatically optional for the Form and FormSet constructors you
  create::

     var form = new ContactForm({initial: initialData})

* Forms have default convenience rendering methods to get you started quickly,
  which display a label, input widget(s) and any validation errors for each
  field (however, JSX makes it convenient to write your own custom rendering
  later)::

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
       // appropriate JavaScript type by the form's Fields.
     }
     else {
       // If the data wasn't valid, the forms's error object will be populated
       // with field validation errors.
       this.setState({form: form})
     }

.. _`Django`: http://www.djangoproject.com
.. _`form-handling library`: http://docs.djangoproject.com/en/dev/topics/forms/
.. _`Node.js`: http://nodejs.org
.. _`React`: http://facebook.github.io/react/
.. _`newforms unit tests`: https://github.com/insin/newforms/tree/react/tests