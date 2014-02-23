newforms
========

Newforms is a JavaScript port of `Django`_'s ``django.forms``
`form-handling library`_ library, usable in browsers and on the server with
`Node.js`_.

As of (the in-development) version 0.5, newforms will use `React`_ for rendering
forms in both environments and for implementation of client-side interactivity.

Since this is a port and ``django.forms`` is well-documented, guide
documentation will initially point to Django documentation and offer some
equivalent examples in JavaScript.

For the just-show-me-how-it-works-and-I'll-figure-out-the-rest developer, the
`newforms unit tests`_ are peppered with guide comments -- lovingly copied and
pasted from Django's own test suite -- which explain the features being tested.

Quick Guide
-----------

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
  ater)::

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

JavaScript API Differences
--------------------------

The JavaScript API is largely consistent with Django's API, with the following
rules of thumb for converting between the two:

   * Where Django accepts keyword arguments, in Javascript a single
     ``Object`` argument is expected, with arguments expressed as its
     properties.

     Note that this applies *anywhere* Django accepts a keyword argument,
     even if the convention in Django is to pass certain keyword arguments
     positionally.

     For example, when passing user-provided data to a :js:class:`Form`
     constructor:

     *Django (by convention)*::

        f = MyForm(request.POST)

     *JavaScript*::

        var f = new MyForm({data: req.body})

   * Function and variable names which use ``underscores_in_python`` become
     ``camelCasedInJavaScript``.

   * For convenience and compactness, the ``new`` operator is **optional** when
     using newforms' Fields, Widgets and other constructors which are commonly
     used while defining a Form, such as ValidationError -- however ``new`` is
     **not**  automatically optional for the Form and FormSet constructors you
     create.

      *Django*::

         forms.CharField(max_length=100)

      *JavaScript* (the following lines are equivalent)::

         new forms.CharField({maxLength: 100})
         forms.CharField({maxLength: 100})

   * Form and FormSet properties with side-effects in Django become function
     calls in JavaScript. For example:

     * ``form.errors`` (which forces a form to validate if it hasn't done so
       already) becomes ``form.errors()``

     * ``formset.forms`` (which instantiates all the formsets forms the first
       time it's accessed) becomes ``formset.forms()``.

   * Objects which would be coerced to a string for display in Django,
     such as Forms, FormSets and ErrorLists, have a ``render()`` method to
     generate their default representation.

.. Note::

   Unless specified otherwise, documented API items live under the ``forms``
   namespace object in the browser, or the result of ``require('newforms')`` in
   Node.js.

Contents:

.. toctree::
   :maxdepth: 2

   forms
   fields
   widgets
   formsets
   util

.. _`Django`: http://www.djangoproject.com
.. _`form-handling library`: http://docs.djangoproject.com/en/dev/topics/forms/
.. _`Node.js`: http://nodejs.org
.. _`React`: http://facebook.github.io/react/
.. _`newforms unit tests`: https://github.com/insin/newforms/tree/react/tests