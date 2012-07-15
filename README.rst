======================================
newforms |travis_status| |qunit_tests|
======================================

.. |travis_status| image:: https://secure.travis-ci.org/insin/newforms.png
   :target: http://travis-ci.org/insin/newforms

.. |qunit_tests| image:: http://insin.github.com/img/qunit-tests.png
   :target: http://insin.github.com/newforms/tests.html

A JavaScript port of `Django`_'s `form-handling library`_, which runs in
browsers in `Node.js`_

.. _`Django`: http://www.djangoproject.com
.. _`form-handling library`: http://docs.djangoproject.com/en/dev/topics/forms/
.. _`Node.js`: http://nodejs.org

Demos
=====

- `Demo page`_ - uses a FormSet to create multiple instances of the same Form,
  with just about every type of Field in newforms.
- `Fragile`_ - use of newforms and ModelChoiceField in `Sacrum`_ for creation
  and validation of add/edit forms.

.. _`Demo page`: http://insin.github.com/newforms/demo.html
.. _`Fragile`: http://insin.github.com/sacrum/fragile.html
.. _`Sacrum`: https://github.com/insin/sacrum

Install
=======

Node.js::

   npm install newforms

::

   var forms = require('newforms')

Browser bundles (all dependencies included) which export a ``forms`` variable
are included with the Node.js install (in ``./node_modules/newforms/``), or
can be downloaded below:

* `newforms.js`_ - 235 kB (54.8 kB gzipped)

* `newforms.min.js`_ - 84 kB (23.8 kB gzipped)

.. _`newforms.js`: https://github.com/insin/newforms/raw/master/newforms.js
.. _`newforms.min.js`: https://github.com/insin/newforms/raw/master/newforms.min.js

Browser bundles also export a ``require()`` function, which can be used to
access bundled dependencies, which are:

  * `Concur`_ - sugar for inheritance
  * `DOMBuilder`_ - interchangeable DOM Element / HTML generation
  * Certain submodules of `isomorph`_ - miscellaneous utilities

If you already have a ``require`` variable you don't want to be overwritten,
call ``require.noConflict()``::

   <script src="/js/newforms.min.js"></script>
   <script>require.noConflict()</script>

.. _`Concur`: https://github.com/insin/concur
.. _`DOMBuilder`: https://github.com/insin/DOMBuilder
.. _`isomorph`: https://github.com/insin/isomorph

Usage
=====

As direct porting from Django is nearing completion, the resulting API is
very much focused on the server side. As such, Node.js is probably the
best place to use newforms in anger at the moment, as you'll be working
with a request/response cycle, which is Django forms' usual mode of
operation.

Client side features, such as hooking into the DOM for instant validation
and feedback, will be the focus of future work.

In lieu of guide documentation, head over to the `Django forms documentation`_
for a quick overview of the concepts behind this form library.

Here's a quick guide to getting started with newforms.

.. _`Django forms documentation`: http://docs.djangoproject.com/en/dev/topics/forms/

* For Node.js, if you clone this repo and install `express`_ and `jade`_ via
  ``npm``, you can run ``node demo/demo.js`` to see a basic example of newforms
  in action.

  All example code will assume you've imported like so::

     var forms = require('newforms')

  .. _`express`: http://expressjs.com/
  .. _`jade`: http://jade-lang.com/
  .. _`npm`: http://npmjs.org/

* For convenience and compactness, the ``new`` operator is **optional** when
  using newforms' Fields, Widgets and other constructors which are commonly used
  while defining a Form, such as ValidationError -- however ``new`` is **not**
  automatically optional for the Form and FormSet constructors you create.

* Form constructors are created using the ``forms.Form`` constructor's
  ``extend()`` function, which comes courtesy of `Concur`_. This takes an
  ``Object`` argument defining form fields and any other properties for the
  form's prototype (validation methods etc.), returning a constructor which
  inherits from ``BaseForm``::

     var ContactForm = forms.Form.extend({
       subject  : forms.CharField({maxLength: 100})
     , message  : forms.CharField()
     , sender   : forms.EmailField()
     , ccMyself : forms.BooleanField({required: false})
     })

     var form = new ContactForm()

* FormSet constructors are created using the ``forms.formsetFactory`` function,
  which takes a Form constructor and any additional properties for the FormSet's
  prototype defined as an ``Object``, returning a FormSet constructor which
  inherits from ``BaseFormSet``::

     var ArticleForm = forms.Form.extend({
       title   : forms.CharField()
     , pubDate : forms.DateField()
     })

     var ArticleFormSet = forms.formsetFactory(ArticleForm, {extra: 1})

     var formSet = new ArticleFormSet()

* Custom row styling: ``requiredCssClass`` and ``errorCssClass`` can be added to
  any form and the classes will be applied to each matching row in the form
  output. To add extra CSS classes to a particular row, pass the
  ``extraClasses`` property in the field definition. To add classes to *all*
  fields in a form, use ``rowCssClass``. All of the above are added to the class
  attribute of the **containing** element, e.g., ``<tr>``, ``<li>`` or ``<p>``::

     var PostForm = forms.Form.extend({
     // Fields
       postTitle        : forms.CharField({maxLength: 100})
     , postBody         : forms.CharField({extraClasses: 'larger island'})
     , allowComments    : forms.BooleanField({required: false})
     // CSS settings
     , rowCssClass      : 'form-row'  // A class to style all fields
     , requiredCssClass : 'required'  // A class to style required fields
     , errorCssClass    : 'error'     // A class to style fields with errors
     })

* The API is largely consistent with Django's API, with the following
  rules of thumb for converting between the two:

  * Where Django accepts keyword arguments, in Javascript a single
    ``Object`` argument is expected, with arguments expressed as its
    properties.

    Note that this applies *anywhere* Django accepts a keyword argument,
    even if the convention in Django is topass certain keyword arguments
    positionally, e.g. when passing in POST data to a Form constructor.

    *Django (by convention)*::

       f = MyForm(request.POST)

    *Javascript*::

       var f = new MyForm({data: req.body})

  * Method and variable names which use ``underscores_in_python`` become
    ``camelCasedInJavaScript``.

  * As mentioned above, the ``new`` operator is optional for newforms
    form components.

    *Django*::

       forms.CharField(max_length=100)

    *JavaScript* (the following lines are equivalent)::

       new forms.CharField({maxLength: 100})
       forms.CharField({maxLength: 100})

  * Due to limited cross-browser support for properties in JavaScript,
    Form and FormSet properties from Django such as ``cleaned_data`` and
    ``errors`` become method calls; e.g. ``cleanedData()`` and ``errors()``.

    It's ugly, but it works everywhere.

  * Objects which would be coerced to a string for display in Django,
    such as Forms, FormSets and ErrorLists, have a ``defaultRendering()``
    method.

    This is required because newforms can output DOM Elements or HTML
    from the same objects and there's no standard ``toDOM()``-type method
    in JavaScript. If you're operating in HTML mode, you can coerce these
    objects to string to get HTML out of them, as their ``toString()``
    methods make use of ``defaultRendering()``.

The unit tests exercise the library thoroughly, so dip in for examples of
further usage in the meantime.

Documentation (WIP)
===================

API documentation is underway, but guide documentation is yet to be started:

* http://newforms.readthedocs.org

MIT License
===========

Copyright (c) 2011, Jonathan Buchanan

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
