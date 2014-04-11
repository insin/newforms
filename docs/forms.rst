=====
Forms
=====

.. Note::

   Newforms Forms and Widgets "render" by creating ``React.DOM`` components,
   rather than directly creating DOM elements or HTML strings.

   In code examples which display HTML string output, we use a ``reactHTML()``
   function to indicate there's another step between rendering a form and final
   output. An actual implementation of this function would need to strip
   ``data-react-`` attributes from the generated HTML and pretty-print to get
   the exact example output shown.

   However, the example HTML output is representative of the DOM structure
   which would be created when running in a browser, with React managing
   keeping the real DOM in sync with the rendered state of forms.

.. _ref-forms-bound-unbound:

Bound and unbound forms
=======================

A :js:class:`Form` instance is either **bound** to a set of data, or **unbound**.

* If it's **bound** to a set of data, it's capable of validating that data
  and rendering the form with the data displayed in form inputs.

* If it's **unbound**, it cannot do validation (because there's no data to
  validate!), but it can still render the blank form or display any default
  initial values that have been configured.

To create an unbound Form instance, simply instantiate it:

.. code-block:: javascript

   var f = new ContactForm()

To bind data to a form, pass the data as an object argument:

.. code-block:: javascript

   var data = {
     subject: 'hello'
   , message: 'Hi there'
   , sender: 'foo@example.com'
   , ccMyself: true
   }
   var f = new ContactForm({data: data})

In this object, the property names are the field names, which correspond to the
names in your ``Form`` definition. The values are the data you're trying to
validate. These will usually be strings, but there's no requirement that they be
strings; the type of data you pass depends on the :js:class:`Field`, as we'll
see in a moment.

Data can also be bound to an existing form. Note that binding data this way
triggers form cleaning and validation, returning the validation result:

.. code-block:: javascript

   var isValid = f.setData(data)

Form.isBound
------------

If you need to distinguish between bound and unbound form instances at runtime,
check the value of the form's :js:attr:`form.isBound` property:

.. code-block:: javascript

   var f = mew ContactForm()
   print(f.isBound)
   // => false
   f = new ContactForm({data: {subject: 'hello'}})
   print(f.isBound)
   // => true

A form given an empty object is still bound:

.. code-block:: javascript

   var f = new ContactForm({data: {}})
   print(f.isBound)
   // => true

Using forms to validate data
============================

The primary task of a ``Form`` object is to validate data. With a bound
``Form`` instance, call the :js:func:`BaseForm#isValid` method to run validation
and return a boolean designating whether the data was valid:

.. code-block:: javascript

   var data = {
     subject: 'hello'
   , message: 'Hi there'
   , sender: 'foo@example.com'
   , ccMyself: true
   }
   var f = new ContactForm({data: data})
   print(f.isValid())
   // => true

Let's try with some invalid data. In this case, ``subject`` is blank (an error,
because all fields are required by default) and ``sender`` is not a valid
email address:

.. code-block:: javascript

   var data = {
     subject: 'hello',
   , message: 'Hi there'
   , sender: 'invalid email address'
   , ccMyself: true
   }
   var f = new ContactForm({data: data})
   print(f.isValid())
   // => false

``Form.errors()`` returns an :js:class:`ErrorObject` containing error messages:

.. code-block:: javascript

   f.errors().asText()
   /* =>
   * subject
     * This field is required.
   * sender
     * Enter a valid email address.
   */

You can access ``Form.errors()`` without having to call ``Form.isValid()``
first. The form's data will be validated the first time you either call
``Form.isValid()` or ``Form.errors()``.

The validation routines will only get called once for a particular set of bound
data, regardless of how many times you call ``Form.isValid()` or
``Form.errors()``. This means that if validation has side effects, those side
effects will only be triggered once.

Behaviour of unbound forms
--------------------------

It's meaningless to validate a form with no data, but, for the record, here's
what happens with unbound forms:

.. code-block:: javascript

   var f = new ContactForm()
   print(f.isValid())
   // => false
   print(f.errors().errors)
   // => {}

.. _ref-dynamic-initial-values:

Dynamic initial values
======================

Use ``Form.initial`` to declare the initial value of form fields at runtime. For
example, you might want to fill in a ``username`` field with the username of the
current session.

To do this, pass an ``initial`` argument when constructing the form. This
argument, if given, should be an object mapping field names to initial values.
You only have to include the fields for which you're specifying an initial
value, for example:

.. code-block:: javascript

   var f = new ContactForm({initial: {subject: 'Hi there!'}})

These values are only displayed for unbound forms, and they're not used as
fallback values if a particular value isn't provided.

Where both a Field and Form define an initial value for the same field, the
Form-level ``initial`` gets precedence:

.. code-block:: javascript

   var CommentForm = forms.Form.extend({
     name: forms.CharField({initial: 'prototype'})
   , url: forms.URLField()
   , comment: forms.CharField()
   })

   var f = new CommentForm({initial: {name: 'instance'}, autoId: false})
   print(reactHTML(f.render()))
   /* =>
   <tr><th>Name:</th><td><input type="text" name="name" value="instance"></td></tr>
   <tr><th>Url:</th><td><input type="url" name="url"></td></tr>
   <tr><th>Comment:</th><td><input type="text" name="comment"></td></tr>
   */

Accessing the fields from the form
==================================

You can access the fields of a ``Form`` instance from its ``fields`` attribute:

.. code-block:: javascript

   print(f.fields)
   // => {name: [object CharField], url: [object URLField], comment: [object CharField]}

You can alter ``fields`` of a Form instance:

.. code-block:: javascript

   f.fields.name.label = 'Username'
   print(reactHTML(f.render()))
   /* =>
   <tr><th>Username:</th><td><input type="text" name="name" value="instance"></td></tr>
   <tr><th>Url:</th><td><input type="url" name="url"></td></tr>
   <tr><th>Comment:</th><td><input type="text" name="comment"></td></tr>
   */

Warning: don't alter ``baseFields`` or every subsequent form instance will be
affected:

.. code-block:: javascript

   f.baseFields.name.label = 'Username'
   var anotherForm = new CommentForm({autoId: false})
   print(reactHTML(anotherForm.render()))
   /* =>
   <tr><th>Username:</th><td><input type="text" name="name" value="prototype"></td></tr>
   <tr><th>Url:</th><td><input type="url" name="url"></td></tr>
   <tr><th>Comment:</th><td><input type="text" name="comment"></td></tr>
   */

Accessing "clean" data
======================

Each field in a ``Form`` is responsible not only for validating data, but also
for "cleaning" it -- normalising it to a consistent format. This is a nice
feature, because it allows data for a particular field to be input in a variety
of ways, always resulting in consistent output.

Once you've created a ``Form`` instance with a set of data and validated it, you
can access the clean data via its ``cleanedData`` property:

.. code-block:: javascript

   var data = {
     subject: 'hello'
   , message: 'Hi there'
   , sender: 'foo@example.com'
   , ccMyself: true
   }
   var f = new ContactForm({data: data})
   print(f.isValid())
   // => true
   print(f.cleanedData)
   // => {subject: 'hello', message: 'Hi there', sender: 'foo@example.com', ccMyself: true}

If your data does *not* validate, ``cleanedData`` contains only the valid fields:

.. code-block:: javascript

   var data = {
     subject: ''
   , message: 'Hi there'
   , sender: 'foo@example.com'
   , ccMyself: true
   }
   var f = new ContactForm({data: data})
   print(f.isValid())
   // => false
   print(f.cleanedData)
   // => {message: 'Hi there', sender: 'foo@example.com', ccMyself: true}

``cleanedData`` will only contain properties for fields defined in the form,
even if you pass extra data:

.. code-block:: javascript

   var data = {
     subject: 'Hello'
   , message: 'Hi there'
   , sender: 'foo@example.com'
   , ccMyself: true
   , extraField1: 'foo'
   , extraField2: 'bar'
   , extraField3: 'baz'
   }
   var f = new ContactForm({data: data})
   print(f.isValid())
   // => false
   print(f.cleanedData) // Doesn't contain extraField1, etc.
   // => {subject: 'hello', message: 'Hi there', sender: 'foo@example.com', ccMyself: true}

When the Form is valid, ``cleanedData`` will include properties for all its
fields, even if the data didn't include a value for some optional
fields. In this example, the data object doesn't include a value for the
``nickName`` field, but ``cleanedData`` includes it, with an empty value:

.. code-block:: javascript

   var OptionalPersonForm = forms.Form.extend({
     firstName: forms.CharField()
   , lastName: forms.CharField()
   , nickName: forms.CharField({required: false})
   })
   var data {firstName: 'Alan', lastName: 'Partridge'}
   var f = new OptionalPersonForm({data: data})
   print(f.isValid())
   // => true
   print(f.cleanedData)
   // => {firstName: 'Alan', lastName: 'Partridge', nickName: ''}

In the above example, the ``cleanedData`` value for ``nickName`` is set to an
empty string, because ``nickName`` is a ``CharField``, and ``CharField``\s treat
empty values as an empty string.

Each field type knows what its "blank" value is -- e.g., for ``DateField``, it's
``null`` instead of the empty string. For full details on each field's behaviour
in this case, see the "Empty value" note for each field in the
:ref:`ref-built-in-field-types` documentation.

You can write code to perform validation for particular form fields (based on
their name) or for the form as a whole (considering combinations of various
fields). More information about this is in :doc:`validation`.

Updating a form's input data
=============================

To replace a Form's input data use ``form.setData()``.

This will also trigger validation -- updating ``form.errors()`` and
``form.cleanedData``, and returning the result of ``form.isValid()``:

.. code-block:: javascript

   var f = new ContactForm()
   // ...user inputs data...
   var data = {
     subject: 'hello'
   , message: 'Hi there'
   , sender: 'foo@example.com'
   , ccMyself: true
   }
   var isValid = f.setData(data)
   print(f.isBound)
   // => true
   print(isValid)
   // => true

.. _ref-outputting-forms-as-html:

Outputting forms as HTML
========================

The second task of a ``Form`` object is to render itself. To do so, call
``render()`` -- forms have an ``asTable()`` method which is used as the default
rendering, so calling ``render()`` is equivalent:

.. code-block:: javascript

   var f = new ContactForm()
   print(reactHTML(f.render()))
   /* =>
   <tr><th><label for="id_subject">Subject:</label></th><td><input maxlength="100" type="text" name="subject" id="id_subject"></td></tr>
   <tr><th><label for="id_message">Message:</label></th><td><input type="text" name="message" id="id_message"></td></tr>
   <tr><th><label for="id_sender">Sender:</label></th><td><input type="email" name="sender" id="id_sender"></td></tr>
   <tr><th><label for="id_ccMyself">Cc myself:</label></th><td><input type="checkbox" name="ccMyself" id="id_ccMyself"></td></tr>
   */

Since forms render themselves to ``React.DOM`` components, rendering in JSX is
just a case of calling the appopriate render method::

   <table>
     <tbody>
       {f.render()}
     </tbody>
   </tbody>

If the form is bound to data, the HTML output will include that data
appropriately:

.. code-block:: javascript

   var data = {
     subject: 'hello'
   , message: 'Hi there'
   , sender: 'foo@example.com'
   , ccMyself: true
   }
   var f = new ContactForm({data: data})
   print(reactHTML(f.render()))
   /* =>
   <tr><th><label for="id_subject">Subject:</label></th><td><input maxlength="100" type="text" name="subject" id="id_subject" value="hello"></td></tr>\
   <tr><th><label for="id_message">Message:</label></th><td><input type="text" name="message" id="id_message" value="Hi there"></td></tr>\
   <tr><th><label for="id_sender">Sender:</label></th><td><input type="email" name="sender" id="id_sender" value="foo@example.com"></td></tr>\
   <tr><th><label for="id_ccMyself">Cc myself:</label></th><td><input type="checkbox" name="ccMyself" id="id_ccMyself" checked></td></tr>
   */

This default output is a two-column HTML table, with a ``<tr>`` for each field.
Notice the following:

* For flexibility, the output does *not* include the ``<table>`` or ``<tbody>``
  , nor does it include the ``<form>`` or an ``<input type="submit">``. It's
  your job to do that.

* Each field type has a default HTML representation. ``CharField`` is
  represented by an ``<input type="text">`` and ``EmailField`` by an
  ``<input type="email">``.
  ``BooleanField`` is represented by an ``<input type="checkbox">``. Note
  these are merely sensible defaults; you can specify which input to use for
  a given field by using widgets, which we'll explain shortly.

* The HTML ``name`` for each tag is taken directly from its property name
  in ``ContactForm``.

* The text label for each field -- e.g. ``'Subject:'``, ``'Message:'`` and
  ``'Cc myself:'`` is generated from the field name by splitting on capital
  letters and lowercasing first letters, converting all underscores to spaces
  and upper-casing the first letter. Again, note these are merely sensible
  defaults; you can also specify labels manually.

* Each text label is surrounded in an HTML ``<label>`` tag, which points
  to the appropriate form field via its ``id``. Its ``id``, in turn, is
  generated by prepending ``'id_'`` to the field name. The ``id``
  attributes and ``<label>`` tags are included in the output by default, to
  follow best practices, but you can change that behavior.

Although ``<table>`` output is the default output style when you ``render()`` a
form, other output styles are available. Each style is available as a method on
a form object, and each rendering method returns a list of ``React.DOM``
components.

``asDiv()``
-----------

``asDiv()`` renders the form as a series of ``<div>`` tags, with each ``<div>``
containing one field:

.. code-block:: javascript

   var f = new ContactForm()
   print(reactHTML(f.asDiv()))
   /* =>
   <div><label for="id_subject">Subject:</label><span> </span><input maxlength="100" type="text" name="subject" id="id_subject"></div>
   <div><label for="id_message">Message:</label><span> </span><input type="text" name="message" id="id_message"></div>
   <div><label for="id_sender">Sender:</label><span> </span><input type="email" name="sender" id="id_sender"></div>
   <div><label for="id_ccMyself">Cc myself:</label><span> </span><input type="checkbox" name="ccMyself" id="id_ccMyself"></div>
   */

``asUl()``
----------

``asUl()`` renders the form as a series of ``<li>`` tags, with each ``<li>``
containing one field:

.. code-block:: javascript

   var f = new ContactForm()
   print(reactHTML(f.asUl()))
   /* =>
   <li><label for="id_subject">Subject:</label><span> </span><input maxlength="100" type="text" name="subject" id="id_subject"></li>
   <li><label for="id_message">Message:</label><span> </span><input type="text" name="message" id="id_message"></li>
   <li><label for="id_sender">Sender:</label><span> </span><input type="email" name="sender" id="id_sender"></li>
   <li><label for="id_ccMyself">Cc myself:</label><span> </span><input type="checkbox" name="ccMyself" id="id_ccMyself"></li>
   */

Styling form rows
-----------------

When extending a form, there are a few hooks you can use to add ``class``
attributes to form rows in the default rendering:

* ``rowCssClass`` -- applied to every form row
* ``errorCssClass`` -- applied to form rows of fields which have errors
* ``requiredCssClass`` -- applied to form rows for required fields

To use these hooks, ensure your form has them as prototype or instance
properties, e.g. to set them up as protoype properties:

.. code-block:: javascript

   var ContactForm = forms.Form.extend({
     rowCssClass: 'row'
   , errorCssClass: 'error'
   , requiredCssClass: 'required'
   // ...and the rest of your fields here
   })

Once you've done that, the generated markup will look something like:

.. code-block:: javascript

   var data = {
     subject: 'hello'
   , message: 'Hi there'
   , sender: ''
   , ccMyself: true
   }
   var f = new ContactForm({data: data})
   print(reactHTML(f.render()))
   /* =>
   <tr class="row required"><th><label for="id_subject">Subject:</label> ...
   <tr class="row required"><th><label for="id_message">Message:</label> ...
   <tr class="row error required"><th><label for="id_sender">Sender:</label> ...
   <tr class="row"><th><label for="id_ccMyself">Cc myself:</label> ...
   */

.. _ref-forms-configuring-label:

Configuring form elements' HTML ``id`` attributes and ``<label>`` tags
----------------------------------------------------------------------

By default, the form rendering methods include:

* HTML ``id`` attributes on the form elements.

* The corresponding ``<label>`` tags around the labels. An HTML ``<label>`` tag
  designates which label text is associated with which form element. This small
  enhancement makes forms more usable and more accessible to assistive devices.
  It's always a good idea to use ``<label>`` tags.

The ``id`` attribute values are generated by prepending ``id_`` to the form
field names. This behavior is configurable, though, if you want to change the
``id`` convention or remove HTML ``id`` attributes and ``<label>`` tags
entirely.

Use the ``autoId`` argument to the ``Form`` constructor to control the ``id``
and label behavior. This argument must be ``true``, ``false`` or a string.

If ``autoId`` is ``false``, then the form output will include neither
``<label>`` tags nor ``id`` attributes:

.. code-block:: javascript

   var f = new ContactForm({autoId: false})
   print(reactHTML(f.asTable()))
   /* =>
   <tr><th>Subject:</th><td><input maxlength="100" type="text" name="subject"></td></tr>
   <tr><th>Message:</th><td><input type="text" name="message"></td></tr>
   <tr><th>Sender:</th><td><input type="email" name="sender"></td></tr>
   <tr><th>Cc myself:</th><td><input type="checkbox" name="ccMyself"></td></tr>
   */
   print(reactHTML(f.asUl()))
   /* =>
   <li><span>Subject:</span><span> </span><input maxlength="100" type="text" name="subject"></li>
   <li><span>Message:</span><span> </span><input type="text" name="message"></li>
   <li><span>Sender:</span><span> </span><input type="email" name="sender"></li>
   <li><span>Cc myself:</span><span> </span><input type="checkbox" name="ccMyself"></li>
   */
   print(reactHTML(f.asDiv()))
   /* =>
   <div><span>Subject:</span><span> </span><input maxlength="100" type="text" name="subject"></div>
   <div><span>Message:</span><span> </span><input type="text" name="message"></div>
   <div><span>Sender:</span><span> </span><input type="email" name="sender"></div>
   <div><span>Cc myself:</span><span> </span><input type="checkbox" name="ccMyself"></div>"
   */

If ``autoId`` is set to ``true``, then the form output will include ``<label>``
tags and will simply use the field name as its ``id`` for each form field:

.. code-block:: javascript

   var f = new ContactForm({autoId: false})
   print(reactHTML(f.asTable()))
   /* =>
   <tr><th><label for="subject">Subject:</label></th><td><input maxlength="100" type="text" name="subject" id="subject"></td></tr>
   <tr><th><label for="message">Message:</label></th><td><input type="text" name="message" id="message"></td></tr>
   <tr><th><label for="sender">Sender:</label></th><td><input type="email" name="sender" id="sender"></td></tr>
   <tr><th><label for="ccMyself">Cc myself:</label></th><td><input type="checkbox" name="ccMyself" id="ccMyself"></td></tr>
   */
   print(reactHTML(f.asUl()))
   /* =>
   <li><label for="subject">Subject:</label><span> </span><input maxlength="100" type="text" name="subject" id="subject"></li>
   <li><label for="message">Message:</label><span> </span><input type="text" name="message" id="message"></li>
   <li><label for="sender">Sender:</label><span> </span><input type="email" name="sender" id="sender"></li>
   <li><label for="ccMyself">Cc myself:</label><span> </span><input type="checkbox" name="ccMyself" id="ccMyself"></li>
   */
   print(reactHTML(f.asDiv()))
   /* =>
   <div><label for="subject">Subject:</label><span> </span><input maxlength="100" type="text" name="subject" id="subject"></div>
   <div><label for="message">Message:</label><span> </span><input type="text" name="message" id="message"></div>
   <div><label for="sender">Sender:</label><span> </span><input type="email" name="sender" id="sender"></div>
   <div><label for="ccMyself">Cc myself:</label><span> </span><input type="checkbox" name="ccMyself" id="ccMyself"></div>
   */

If autoId is set to a string containing a ``'{name}'`` format placeholder, then
the form output will include ``<label>`` tags, and will generate ``id``
attributes based on the format string:

.. code-block:: javascript

   var f = new ContactForm({autoId: 'id_for_{name}'})
   print(reactHTML(f.asTable()))
   /* =>
   <tr><th><label for="id_for_subject">Subject:</label></th><td><input maxlength="100" type="text" name="subject" id="id_for_subject"></td></tr>\
   <tr><th><label for="id_for_message">Message:</label></th><td><input type="text" name="message" id="id_for_message"></td></tr>\
   <tr><th><label for="id_for_sender">Sender:</label></th><td><input type="email" name="sender" id="id_for_sender"></td></tr>\
   <tr><th><label for="id_for_ccMyself">Cc myself:</label></th><td><input type="checkbox" name="ccMyself" id="id_for_ccMyself"></td></tr>",
   */
   print(reactHTML(f.asUl()))
   /* =>
   <li><label for="id_for_subject">Subject:</label><span> </span><input maxlength="100" type="text" name="subject" id="id_for_subject"></li>\
   <li><label for="id_for_message">Message:</label><span> </span><input type="text" name="message" id="id_for_message"></li>\
   <li><label for="id_for_sender">Sender:</label><span> </span><input type="email" name="sender" id="id_for_sender"></li>\
   <li><label for="id_for_ccMyself">Cc myself:</label><span> </span><input type="checkbox" name="ccMyself" id="id_for_ccMyself"></li>",
   */
   print(reactHTML(f.asDiv()))
   /* =>
   <div><label for="id_for_subject">Subject:</label><span> </span><input maxlength="100" type="text" name="subject" id="id_for_subject"></div>\
   <div><label for="id_for_message">Message:</label><span> </span><input type="text" name="message" id="id_for_message"></div>\
   <div><label for="id_for_sender">Sender:</label><span> </span><input type="email" name="sender" id="id_for_sender"></div>\
   <div><label for="id_for_ccMyself">Cc myself:</label><span> </span><input type="checkbox" name="ccMyself" id="id_for_ccMyself"></div>",
   */

By default, ``autoId`` is set to the string ``'id_{name}'``.

It's possible to customise the suffix character appended to generated labels
(default: ``':'``), or omit it entirely, using the ``labelSuffix`` parameter:

.. code-block:: javascript

   var f = new ContactForm({autoId: 'id_for_{name}', labelSuffix: ''})
   print(reactHTML(f.asUl()))
   /* =>
   <li><label for="id_for_subject">Subject</label><span> </span><input maxlength="100" type="text" name="subject" id="id_for_subject"></li>
   <li><label for="id_for_message">Message</label><span> </span><input type="text" name="message" id="id_for_message"></li>
   <li><label for="id_for_sender">Sender</label><span> </span><input type="email" name="sender" id="id_for_sender"></li>
   <li><label for="id_for_ccMyself">Cc myself</label><span> </span><input type="checkbox" name="ccMyself" id="id_for_ccMyself"></li>
   */
   f = new ContactForm({autoId: 'id_for_{name}', labelSuffix: ' ->'})
   print(reactHTML(f.asUl()))
   /* =>
   <li><label for="id_for_subject">Subject -&gt;</label><span> </span><input maxlength="100" type="text" name="subject" id="id_for_subject"></li>
   <li><label for="id_for_message">Message -&gt;</label><span> </span><input type="text" name="message" id="id_for_message"></li>
   <li><label for="id_for_sender">Sender -&gt;</label><span> </span><input type="email" name="sender" id="id_for_sender"></li>
   <li><label for="id_for_ccMyself">Cc myself -&gt;</label><span> </span><input type="checkbox" name="ccMyself" id="id_for_ccMyself"></li>
   */

Note that the label suffix is added only if the last character of the
label isn't a punctuation character.

You can also customise the ``labelSuffix`` on a per-field basis using the
``labelSuffix`` argument to :js:func:`BoundField#labelTag`.

Notes on field ordering
-----------------------

In the ``asDiv()``, ``asUl()`` and ``asTable()`` shortcuts, the fields are
displayed in the order in which you define them in your form. For example, in
the ``ContactForm`` example, the fields are defined in the order ``subject``,
``message``, ``sender``, ``ccMyself``. To reorder the HTML output, just change
the order in which those fields are listed in the class.

How errors are displayed
------------------------

If you render a bound ``Form`` object, the act of rendering will automatically
run the form's validation if it hasn't already happened, and the HTML output
will include the validation errors as a ``<ul class="errorlist">`` near the
field:

.. code-block:: javascript

   var data = {
     subject: ''
   , message: 'Hi there'
   , sender: 'invalid email address'
   , ccMyself: true
   }
   var f = new ContactForm({data: data})
   print(reactHTML(f.asTable()))
   /* =>
   <tr><th><label for="id_subject">Subject:</label></th><td><ul class="errorlist"><li>This field is required.</li></ul><input maxlength="100" type="text" name="subject" id="id_subject"></td></tr>
   <tr><th><label for="id_message">Message:</label></th><td><input type="text" name="message" id="id_message" value="Hi there"></td></tr>
   <tr><th><label for="id_sender">Sender:</label></th><td><ul class="errorlist"><li>Enter a valid email address.</li></ul><input type="email" name="sender" id="id_sender" value="invalid email address"></td></tr>
   <tr><th><label for="id_ccMyself">Cc myself:</label></th><td><input type="checkbox" name="ccMyself" id="id_ccMyself" checked></td></tr>
   */
   print(reactHTML(f.asUl()))
   /* =>
   <li><ul class="errorlist"><li>This field is required.</li></ul><label for="id_subject">Subject:</label><span> </span><input maxlength="100" type="text" name="subject" id="id_subject"></li>
   <li><label for="id_message">Message:</label><span> </span><input type="text" name="message" id="id_message" value="Hi there"></li>
   <li><ul class="errorlist"><li>Enter a valid email address.</li></ul><label for="id_sender">Sender:</label><span> </span><input type="email" name="sender" id="id_sender" value="invalid email address"></li>
   <li><label for="id_ccMyself">Cc myself:</label><span> </span><input type="checkbox" name="ccMyself" id="id_ccMyself" checked></li>
   */
   print(reactHTML(f.asDiv()))
   /* =>
   <div><ul class="errorlist"><li>This field is required.</li></ul><label for="id_subject">Subject:</label><span> </span><input maxlength="100" type="text" name="subject" id="id_subject"></div>
   <div><label for="id_message">Message:</label><span> </span><input type="text" name="message" id="id_message" value="Hi there"></div>
   <div><ul class="errorlist"><li>Enter a valid email address.</li></ul><label for="id_sender">Sender:</label><span> </span><input type="email" name="sender" id="id_sender" value="invalid email address"></div>
   <div><label for="id_ccMyself">Cc myself:</label><span> </span><input type="checkbox" name="ccMyself" id="id_ccMyself" checked></div>
   */

Customising the error list format
---------------------------------

By default, forms use :js:class:`ErrorList` to format validation errors. You can
pass an alternate constructor for displaying errors at form construction time:

.. code-block:: javascript

   var DivErrorList = forms.ErrorList.extend({
     render: function() {
       return React.DOM.div({className: 'errorlist'}
       , this.messages().map(function(error) {
           return React.DOM.div(null, error)
         })
       )
     }
   })
   f = new ContactForm({data: data, errorConstructor: DivErrorList, autoId: false})
   print(reactHTML(f.asDiv()))
   /* =>
   <div><div class="errorlist"><div>This field is required.</div></div><span>Subject:</span><span> </span><input maxlength="100" type="text" name="subject"></div>
   <div><span>Message:</span><span> </span><input type="text" name="message" value="Hi there"></div>
   <div><div class="errorlist"><div>Enter a valid email address.</div></div><span>Sender:</span><span> </span><input type="email" name="sender" value="invalid email address"></div>
   <div><span>Cc myself:</span><span> </span><input type="checkbox" name="ccMyself" checked></div>
   */

More granular output
--------------------

The ``asDiv()``, ``asUl()`` and ``asTable()`` methods are simply shortcuts for
lazy developers -- they're not the only way a form object can be displayed.

To retrieve a single :js:class:`BoundField`, use the
:js:func:`BaseForm#boundField` method on your form, passing the field's name:

.. code-block:: javascript

   var form = new ContactForm()
   print(reactHTML(form.boundField('subject').render()))
   // => <input maxlength="100\ type="text" name="subject\" id="id_subject">

To retrieve all ``BoundField`` objects, call :js:func:`BaseForm#boundFields`:

.. code-block:: javascript

   var form = new ContactForm()
   form.boundFields().forEach(function(bf) {
     print(reactHTML(bf.render()))
   })
   /* =>
   <input maxlength="100" type="text" name="subject" id="id_subject">
   <input type="text" name="message" id="id_message">
   <input type="email" name="sender" id="id_sender">
   <input type="checkbox" name="ccMyself" id="id_ccMyself">"
   */

The field-specific output honours the form object's ``autoId`` setting:

.. code-block:: javascript

   var f = new ContactForm({autoId: false})
   print(reactHTML(f.boundField('message').render()))
   // => <input type="text" name="message">
   f = new ContactForm({autoId: 'id_{name}'})
   print(reactHTML(f.boundField('message').render()))
   // => <input type="text" name="message" id="id_message">

``boundField.errors()`` returns an object which renders as a
``<ul class="errorlist">``:

.. code-block:: javascript

   var data = {subject: 'hi', message: '', sender: '', ccMyself: ''}
   var f = new ContactForm({data: data, autoId: false})
   var bf = f.boundField('message')
   print(reactHTML(bf.render()))
   // => <input type="text" name="message">
   print(bf.errors().messages())
   // => ["This field is required."]
   print(reactHTML(bf.errors().render())
   // => <ul class="errorlist"><li>This field is required.</li></ul>
   bf = f.boundField('subject')
   print(bf.errors().messages())
   // => []
   print(reactHTML(bf.errors().render()))
   // =>

To separately render the label tag of a form field, you can call its
:js:func:`BoundField#labelTag()` method:

.. code-block:: javascript

   var f = new ContactForm()
   print(reactHTML(f.boundField('message').labelTag()))
   // => <label for="id_message">Message:</label>

If you're manually rendering a field, you can access configured CSS classes
using the ``cssClasses`` method:

.. code-block:: javascript

   var f = new ContactForm()#
   f.requiredCssClass = 'required'
   print(f.boundField('message').cssClasses())
   // => required

Additional classes can be provided as an argument:

.. code-block:: javascript

   print(f.boundField('message').cssClasses('foo bar'))
   // => foo bar required

``boundField.value()`` returns the raw value of the field as it would be
rendered by a :js:class:`Widget`:

.. code-block:: javascript

  var initial = {subject: 'welcome'}
  var data = {subject: 'hi'}
  var unboundForm = new ContactForm({initial: initial})
  var boundForm = new ContactForm({data: data, initial: initial})
  print(unboundForm.boundField('subject').value())
  // => welcome
  print(boundForm.boundField('subject').value())
  // => hi

``boundField.idForLabel()`` returns the ``id`` of the field. For example, if you
are manually constructing a ``label`` in JSX:

.. code-block:: javascript

  <label htmlFor={form.boundField('myField').idForLabel()}>...<label>

.. _binding-uploaded-files:

Binding uploaded files to a form
================================

Dealing with forms that have ``FileField`` and ``ImageField`` fields
is a little more complicated than a normal form.

Firstly, in order to upload files, you'll need to make sure that your
``<form>`` element correctly defines the ``enctype`` as
``"multipart/form-data"``:

.. code-block:: html

   <form enctype="multipart/form-data" method="POST" action="/foo">

Secondly, when you use the form, you need to bind the file data. File
data is handled separately to normal form data, so when your form
contains a ``FileField`` and ``ImageField``, you will need to specify
a ``files`` argument when you bind your form. So if we extend our
ContactForm to include an ``ImageField`` called ``mugshot``, we
need to bind the file data containing the mugshot image:

..  code-block:: javascript

   // Bound form with an image field
   var data = {
     subject: 'hello'
   , message: 'Hi there'
   , sender: 'invalid email address'
   , ccMyself: true
   }
   var fileData = {mugshot: {name: 'face.jpg', size: 123456}}
   var f = new ContactFormWithMugshot({data: data, files: fileData})

Assuming that you're using `Express`_ and its ``bodyParser()`` on the server
side, you will usually specify ``req.files`` as the source of file data (just
like you'd use ``req.body`` as the source of form data):

..  code-block:: javascript

   // Bound form with an image field, data from the request
   var f = new ContactFormWithMugshot({data: req.body, files: req.files})

.. Note::

   Newforms doesn't really care how you're handling file uploads, just that the
   object passed as a ``file`` argument has ``FileField`` names as its
   properties and that the corresponding values have ``name`` and ``size``
   properties.

Constructing an unbound form is the same as always -- just omit both
form data *and* file data:

..  code-block:: javascript

   // Unbound form with a image field
   var f = new ContactFormWithMugshot()

Testing for multipart forms
---------------------------

If you're writing reusable views or templates, you may not know ahead of time
whether your form is a multipart form or not. The ``isMultipart()`` method
tells you whether the form requires multipart encoding for submission:

..  code-block:: javascript

    var f = new ContactFormWithMugshot()
    print(f.isMultipart())
    // => true

Here's an example of how you might use this in a React component ``render()``
method with JSX::

   <form enctype={form.isMultipart() && 'multipart/form-data'} method="POST" action="/foo">
     {form.asDiv()}
   </form>

Extending forms
===============

When you extend a custom ``Form``, the resulting form will include all fields of
its parent form(s), followed by any new fields defined:

.. code-block:: javascript

   var ContactFormWithPrority = ContactForm.extend({
     priority: forms.CharField()
   })
   var f = new ContactFormWithPrority({autoId: false})
   print(reactHTML(f.render()))
   /* =>
   <tr><th>Subject:</th><td><input maxlength="100" type="text" name="subject"></td></tr>
   <tr><th>Message:</th><td><input type="text" name="message"></td></tr>
   <tr><th>Sender:</th><td><input type="email" name="sender"></td></tr>
   <tr><th>Cc myself:</th><td><input type="checkbox" name="ccMyself"></td></tr>
   <tr><th>Priority:</th><td><input type="text" name="priority"></td></tr>
   */

Forms can be used as mixins (using `Concur`_'s ``__mixin__`` functionality). In
this example, ``BeatleForm`` mixes in ``PersonForm`` and ``InstrumentForm``, and
its field list includes their fields:

.. code-block:: javascript

   var PersonForm = forms.Form.extend({
     first_name: forms.CharField()
   , last_name: forms.CharField()
   })
   var InstrumentForm = forms.Form.extend({
     instrument: forms.CharField()
   })
   var BeatleForm = forms.Form.extend({
     __mixin__: [PersonForm, InstrumentForm]
   , haircut_type: forms.CharField()
   })
   var b = new BeatleForm({autoId: false})
   print(reactHTML(b.asUl()))
   /* =>
   <li><span>First name:</span><span> </span><input type="text" name="first_name"></li>
   <li><span>Last name:</span><span> </span><input type="text" name="last_name"></li>
   <li><span>Instrument:</span><span> </span><input type="text" name="instrument"></li>
   <li><span>Haircut type:</span><span> </span><input type="text" name="haircut_type"></li>
   */

.. _ref-form-prefixes:

Prefixes for forms
==================

You can put as many forms as you like inside one ``<form>`` tag. To give each
form its own namespace, use the ``prefix`` argument:

.. code-block:: javascript

   var mother = new PersonForm({prefix: 'mother'})
   var father = new PersonForm({prefix: 'father'})
   print(reactHTML(mother.saUL()))
   /* =>
   <li><label for="id_mother-first_name">First name:</label><span> </span><input type="text" name="mother-first_name" id="id_mother-first_name"></li>
   <li><label for="id_mother-last_name">Last name:</label><span> </span><input type="text" name="mother-last_name" id="id_mother-last_name"></li>
   */
   print(reactHTML(father.saUL()))
   /* =>
   <li><label for="id_father-first_name">First name:</label><span> </span><input type="text" name="father-first_name" id="id_father-first_name"></li>
   <li><label for="id_father-last_name">Last name:</label><span> </span><input type="text" name="father-last_name" id="id_father-last_name"></li>
   */

.. _`Concur`: https://github.com/insin/concur#api
.. _`Express`: http://expressjs.com/
