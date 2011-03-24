========
newforms
========

A JavaScript port of `Django`_'s `form-handling library`_, which runs in
browsers (tested in the latest Firefox, Chrome and Opera browsers... and
IE 6-8) and in `Node.js`_ and `Akshell`_.

- `Demo page`_
- `Unit tests`_

.. _`Django`: http://www.djangoproject.com
.. _`form-handling library`: http://docs.djangoproject.com/en/dev/topics/forms/
.. _`Demo page`: http://jonathan.buchanan153.users.btopenworld.com/newforms/demo.html
.. _`Unit tests`: http://jonathan.buchanan153.users.btopenworld.com/newforms/tests/tests.html
.. _`Node.js`: http://nodejs.org
.. _`Akshell`: http://akshell.com

Install
=======

Node.js::

   npm install newforms

Akshell:

* Add the following to your app's ``manifest.json``::

     "insin/newforms:0.0.2"

Browser:

* `newforms.min.js`_ - ~59KB (~15.5KB gzipped)

.. _`newforms.min.js`: https://github.com/insin/newforms/raw/master/newforms.min.js

Dependencies
============

`DOMBuilder`_ is required for interchangeable DOM Element / HTML generation.

For Akshell, you don't need to pull in this dependency to use newforms, as the
newforms app references the DOMBuilder app.

.. _`DOMBuilder`: https://github.com/insin/DOMBuilder

Usage
=====

As direct porting from Django is nearing completion, the resulting API is
very much focused on the server side. As such, Node.js is probably the
best place to use newforms in anger at the moment, as you'll be working
with a request/response cycle, which is Django forms' usual mode of
operation.

Client side features, such as hooking into the DOM for instant validation
and feedback, will be the focus of future work.

In lieu of documentation, head over to the `Django forms documentation`_ for a
quick overview of the concepts behind this form library.

Here's a quick guide to getting started with newforms.

.. _`Django forms documentation`: http://docs.djangoproject.com/en/dev/topics/forms/

* For Node.js, if you install `express`_ and `jade`_ via ``npm`` you can run
  ``node demo.js`` to see a basic example of newforms in action.

  All example code will assume you've imported like so::

     var forms = require('newforms');

  .. _`express`: http://expressjs.com/
  .. _`jade`: http://jade-lang.com/
  .. _`npm`: http://npmjs.org/

* For Akshell, you can view a demo with source code at `insin.akshell.com`_.

  .. _`insin.akshell.com`: http://insin.akshell.com

* The ``new`` operator is **optional** for all objects provided by
  newforms, including forms and formset constructors created by factory
  functions.

* Form constructors are created using the ``forms.Form`` factory function,
  which takes a single ``Object`` argument defining form fields and any
  other properties for the form's prototype (validation methods etc.),
  returning a Form constructor which inherits from ``BaseForm`` by
  default::

     var ContactForm = forms.Form({
       subject: forms.CharField({maxLength: 100}),
       message: forms.CharField(),
       sender: forms.EmailField(),
       ccMyself: forms.BooleanField({required: false})
     });

     var form = ContactForm();

* FormSet constructors are created using the ``forms.FormSet`` factory
  function, which takes a Form constructor and any additional properties
  for the FormSet defined as an ``Object``, returning a FormSet constructor
  which inherits from ``BaseFormSet``::

     var ArticleForm = forms.Form({
       title: forms.CharField(),
       pubDate: forms.DateField()
     });

     var ArticleFormSet = forms.FormSet(ArticleForm, {extra: 1});

     var formSet = ArticleFormSet();

* The API is largely consistent with Django's API, with the following
  rules of thumb for converting between the two:

  * Where Django accepts keyword arguments, in Javascript a single
    ``Object`` argument is expected, with arguments expressed as its
    properties.

    Note that this applies *anywhere* Django accepts a keyword argument,
    even if the convention in Django is to  pass certain keyword arguments
    positionally, e.g. when passing in POST data to a Form constructor.

    *Django (by convention)*::

       f = MyForm(request.POST)

    *Javascript*::

       var f = MyForm({data: req.body});

  * Method and variable names which use ``underscores_in_python`` become
    ``camelCasedInJavaScript``.

  * As mentioned above, the ``new`` operator is optional for newforms
    objects.

    *Django*::

       forms.CharField(max_length=100)

    *JavaScript* (the following lines are equivalent)::

       new forms.CharField({maxLength: 100})
       forms.CharField({maxLength: 100})

  * Due to limited cross-browser support for properties in JavaScript,
    Form and FormSet properties such as ``cleaned_data`` and ``errors``
    become method calls; e.g. ``cleanedData()`` and ``errors()``.

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
further usage in the meantime. Here are some pointers:

**Forms:**

* `Custom validation per field and across fields <https://github.com/insin/newforms/blob/master/tests/forms.js#L710>`_
* `Subclassing forms and faux-multiple inheritance/mixins <https://github.com/insin/newforms/blob/master/tests/forms.js#L1426>`_
* `Basic form processing in a view function <https://github.com/insin/newforms/blob/master/tests/forms.js#L1712>`_

**FormSets:**

* `Basic FormSet usage <https://github.com/insin/newforms/blob/master/tests/formsets.js#L39>`_
