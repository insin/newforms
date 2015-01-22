=====
Forms
=====

.. Note::

   In code examples which display HTML string output, we use a ``reactHTML()``
   function as shorthand convention for rendering a ``ReactElement`` as a static
   HTML string.

.. _ref-form-initial-input-data:

Initial input data
==================

When constructing a :js:class:`Form` instance, whether or not you pass input
data determines the behaviour of the form's initial render.

* If a user input ``data`` object is given, initial rendering will trigger
  validation when it tries to determine if there are any error messages to be
  displayed.

  This is typically how user input is passed to the form when using newforms on
  the server to validate a POST request's submitted data.

* If ``data`` is not given, validation will not be performed on initial render,
  so the form can render with blank inputs or display any default initial values
  that have been configured, without triggering validation.

To create a Form instance , simply instantiate it:

.. code-block:: javascript

   var f = new ContactForm()

To create an instance with input data, pass ``data`` as an option argument, like
so:

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

Data can also be set on a Form instance, which triggers validation, returning
the validation result:

.. code-block:: javascript

   var isValid = f.setData(data)

``form.isInitialRender``
------------------------

If you need to distinguish between the type of rendering behaviour a form
instance will exhibit, check the value of the form's :js:attr:`form.isInitialRender`
property:

.. code-block:: javascript

   var f = new ContactForm()
   print(f.isInitialRender)
   // => true
   f = new ContactForm({data: {subject: 'hello'}})
   print(f.isInitialRender)
   // => false

A form given an *empty* data object will still be considered to have user input
and will trigger validation when rendered:

.. code-block:: javascript

   var f = new ContactForm({data: {}})
   print(f.isInitialRender)
   // => false

Using forms to validate data
============================

Server or standalone validation
-------------------------------

The primary task of a ``Form`` object is to validate data. With a bound
``Form`` instance, call the :js:func:`Form#isValid` method to run validation
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

``form.errors()`` returns an :js:class:`ErrorObject` containing error messages:

.. code-block:: javascript

   f.errors().asText()
   /* =>
   * subject
     * This field is required.
   * sender
     * Enter a valid email address.
   */

You can access ``form.errors()`` without having to call ``Form.isValid()``
first. The form's data will be validated the first time you either call
``form.isValid()`` or ``form.errors()``.

The validation routines will only get called once for a given set of data,
regardless of how many times you call ``form.isValid()`` or ``form.errors()``.
This means that if validation has side effects, those side effects will only be
triggered once per set of input data.

Client validation
-----------------

On the client-side, the user's input is held in form DOM inputs, not a tidy
JavaScript object as in the above examples (whereas if you're handling a request
on the server, the request body serves this purpose).

Regardless of whether or not you're using event-based validation, the form's
input data will be updated as the user fills it in. To force the form to fully
validate, call ``form.validate()``:

.. code-block:: javascript

   // Form creation in a React component's getInitialState()
   var form = new ContactForm()

   // Validation in an onSubmit event handler
   var isValid = this.state.form.validate()

.. _ref-dynamic-initial-values:

Dynamic initial values
======================

Use ``form.initial`` to declare the initial value of form fields at runtime. For
example, you might want to fill in a ``username`` field with the username of the
current session.

To do this, pass an ``initial`` argument when constructing the form. This
argument, if given, should be an object mapping field names to initial values.
You only have to include the fields for which you're specifying an initial
value, for example:

.. code-block:: javascript

   var f = new ContactForm({initial: {subject: 'Hi there!'}})

Where both a Field and Form define an initial value for the same field, the
Form-level ``initial`` gets precedence:

.. code-block:: javascript

   var CommentForm = forms.Form.extend({
     name: forms.CharField({initial: 'prototype'}),
     url: forms.URLField(),
     comment: forms.CharField()
   })

   var f = new CommentForm({initial: {name: 'instance'}, autoId: false})
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div>Name: <input type="text" name="name" value="instance"></div>
     <div>Url: <input type="url" name="url"></div>
     <div>Comment: <input type="text" name="comment"></div>
   </div>
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
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div>Username: <input type="text" name="name" value="instance"></div>
     <div>Url: <input type="url" name="url"></div>
     <div>Comment: <input type="text" name="comment"></div>
   </div>
   */

Warning: don't alter ``baseFields`` or every subsequent form instance will be
affected:

.. code-block:: javascript

   f.baseFields.name.label = 'Username'
   var anotherForm = new CommentForm({autoId: false})
   print(reactHTML(<RenderForm form={anotherForm}/>))
   /* =>
   <div>
     <div>Username: <input type="text" name="name" value="prototype"></div>
     <div>Url: <input type="url" name="url"></div>
     <div>Comment: <input type="text" name="comment"></div>
   </div>
   */

Accessing "clean" data
======================

Each field in a ``Form`` is responsible not only for validating data, but also
for "cleaning" it -- normalising it to a consistent format. This allows data for
a particular field to be input in a variety of ways, always resulting in
consistent output.

Once a set of input data has been validated, you can access the clean data via
a form's ``cleanedData`` property:

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

If input data does *not* validate, ``cleanedData`` contains only the valid
fields:

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
     firstName: forms.CharField(),
     lastName: forms.CharField(),
     nickName: forms.CharField({required: false})
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

``form.setData()``
------------------

To replace a Form's entire input data with a new set, use ``form.setData()``.

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
   print(f.isInitialRender)
   // => false
   print(isValid)
   // => true

``form.updateData()``
---------------------

To partially update a Form's input data, use ``form.updateData()``.

This will trigger validation of the fields for which new input data has been
given, and also any form-wide validation if configured.

It doesn't return the result of the validation it triggers, since the validity
of a subset of fields doesn't tell you whether or not the entire form is valid.

If you're peforming partial updates of user input (which is the case if
individual fields are being validated ``onChange``) and need to check if the
entire form is valid *without* triggering validation errors on fields the user
may not have reached yet, use :js:func:`Form#isComplete`:

.. code-block:: javascript

   var f = new ContactForm()
   f.updateData({subject: 'hello'})
   print(f.isComplete())
   // => false
   f.updateData({message: 'Hi there'})
   print(f.isComplete())
   // => false
   f.updateData({sender: 'foo@example.com'})
   print(f.isComplete())
   // => true

Note that ``form.isComplete()`` returns ``true`` once all required fields have
valid input data.

.. _ref-outputting-forms-as-html:

Outputting forms as HTML
========================

Forms provide :doc:`helpers for rendering their fields <custom_display>` but
don't know how to render themselved. The ``RenderForm``
:doc:`React component <react_components>` uses these helpers to provide a
default implementation of rendering a whole form, to get you started quickly:

.. code-block:: javascript

   var f = new ContactForm()
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div><label for="id_subject">Subject:</label> <input maxlength="100" type="text" name="subject" id="id_subject"></div>
     <div><label for="id_message">Message:</label> <input type="text" name="message" id="id_message"></div>
     <div><label for="id_sender">Sender:</label> <input type="email" name="sender" id="id_sender"></div>
     <div><label for="id_ccMyself">Cc myself:</label> <input type="checkbox" name="ccMyself" id="id_ccMyself"></div>
   </div>
   */

If a form has some user input data, the HTML output will include that data
appropriately:

.. code-block:: javascript

   var data = {
     subject: 'hello'
   , message: 'Hi there'
   , sender: 'foo@example.com'
   , ccMyself: true
   }
   var f = new ContactForm({data: data})
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div><label for="id_subject">Subject:</label> <input maxlength="100" type="text" name="subject" id="id_subject" value="hello"></div>
     <div><label for="id_message">Message:</label> <input type="text" name="message" id="id_message" value="Hi there"></div>
     <div><label for="id_sender">Sender:</label> <input type="email" name="sender" id="id_sender" value="foo@example.com"></div>
     <div><label for="id_ccMyself">Cc myself:</label> <input type="checkbox" name="ccMyself" id="id_ccMyself" checked></div>
   <div>
   */

* For flexibility, the output does *not* include the a ``<form>`` or an
  ``<input type="submit">``. It's your job to do that.

* Each field type has a default HTML representation. ``CharField`` is
  represented by an ``<input type="text">`` and ``EmailField`` by an
  ``<input type="email">``. ``BooleanField`` is represented by an
  ``<input type="checkbox">``. Note these are merely sensible defaults; you can
  specify which input to use for a given field by using widgets, which we'll
  explain shortly.

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

Styling form rows
-----------------

When defining a Form, there are a few hooks you can use to add ``class``
attributes to form rows in the default rendering:

* ``rowCssClass`` -- applied to every form row
* ``requiredCssClass`` -- applied to form rows for required fields
* ``optionalCssClass`` -- applied to form rows for optional fields
* ``errorCssClass`` -- applied to form rows for fields which have errors
* ``validCssClass`` -- applied to form rows for fields which have a
  corresponding value present in ``cleanedData``
* ``pendingCssClass`` -- applied to form rows for fields which have a pending
  asynchronous valdation.

To use these hooks, ensure your form has them as prototype or instance
properties, e.g. to set them up as protoype properties:

.. code-block:: javascript

   var ContactForm = forms.Form.extend({
     rowCssClass: 'row',
     requiredCssClass: 'required',
     optionalCssClass: 'optional',
     errorCssClass: 'error',
     validCssClass: 'valid',
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
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div class="row valid required"><label for="id_subject">Subject:</label> ...
     <div class="row valid required"><label for="id_message">Message:</label> ...
     <div class="row error required"><label for="id_sender">Sender:</label> ...
     <div class="row valid optional"><label for="id_ccMyself">Cc myself:</label> ...
   </div>
   */

The ``className`` string generated for each field when you configure the available
CSS properties is also available for use in custom rendering, via a BoundField's
:js:func:`cssClasses() method<BoundField#cssClasses>`.

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
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <divSubject: <input maxlength="100" type="text" name="subject"></div>
     <divMessage: <input type="text" name="message"></div>
     <divSender: <input type="email" name="sender"></div>
     <divCc myself: <input type="checkbox" name="ccMyself"></div>
   </div>
   */

If ``autoId`` is set to ``true``, then the form output will include ``<label>``
tags and will simply use the field name as its ``id`` for each form field:

.. code-block:: javascript

   var f = new ContactForm({autoId: true})
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div><label for="subject">Subject:</label> <input maxlength="100" type="text" name="subject" id="subject"></div>
     <div><label for="message">Message:</label> <input type="text" name="message" id="message"></div>
     <div><label for="sender">Sender:</label> <input type="email" name="sender" id="sender"></div>
     <div><label for="ccMyself">Cc myself:</label> <input type="checkbox" name="ccMyself" id="ccMyself"></div>
   </div>
   */

If autoId is set to a string containing a ``'{name}'`` format placeholder, then
the form output will include ``<label>`` tags, and will generate ``id``
attributes based on the format string:

.. code-block:: javascript

   var f = new ContactForm({autoId: 'id_for_{name}'})
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div><label for="id_for_subject">Subject:</label> <input maxlength="100" type="text" name="subject" id="id_for_subject"></div>
     <div><label for="id_for_message">Message:</label> <input type="text" name="message" id="id_for_message"></div>
     <div><label for="id_for_sender">Sender:</label> <input type="email" name="sender" id="id_for_sender"></div>
     <div><label for="id_for_ccMyself">Cc myself:</label> <input type="checkbox" name="ccMyself" id="id_for_ccMyself"></div>
   </div>
   */

By default, ``autoId`` is set to the string ``'id_{name}'``.

It's possible to customise the suffix character appended to generated labels
(default: ``':'``), or omit it entirely, using the ``labelSuffix`` parameter:

.. code-block:: javascript

   var f = new ContactForm({autoId: 'id_for_{name}', labelSuffix: ''})
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div><label for="id_for_subject">Subject</label> <input maxlength="100" type="text" name="subject" id="id_for_subject"></div>
     <div><label for="id_for_message">Message</label> <input type="text" name="message" id="id_for_message"></div>
     <div><label for="id_for_sender">Sender</label> <input type="email" name="sender" id="id_for_sender"></div>
     <div><label for="id_for_ccMyself">Cc myself</label> <input type="checkbox" name="ccMyself" id="id_for_ccMyself"></div>
   </div>
   */

.. code-block:: javascript

   f = new ContactForm({autoId: 'id_for_{name}', labelSuffix: ' ->'})
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div><label for="id_for_subject">Subject -&gt;</label> <input maxlength="100" type="text" name="subject" id="id_for_subject"></div>
     <div><label for="id_for_message">Message -&gt;</label> <input type="text" name="message" id="id_for_message"></div>
     <div><label for="id_for_sender">Sender -&gt;</label> <input type="email" name="sender" id="id_for_sender"></div>
     <div><label for="id_for_ccMyself">Cc myself -&gt;</label> <input type="checkbox" name="ccMyself" id="id_for_ccMyself"></div>
   </div>
   */

Note that the label suffix is added only if the last character of the
label isn't a punctuation character.

You can also customise the ``labelSuffix`` on a per-field basis using the
``labelSuffix`` argument to :js:func:`BoundField#labelTag`.

Notes on field ordering
-----------------------

In the provided default rendering, fields are displayed in the order in which
you define them in your form. For example, in the ``ContactForm`` example, the
fields are defined in the order ``subject``, ``message``, ``sender``,
``ccMyself``. To reorder the HTML output, just change the order in which those
fields are listed in the class.

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
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div><ul class="errorlist"><li>This field is required.</li></ul><label for="id_subject">Subject:</label> <input maxlength="100" type="text" name="subject" id="id_subject"></div>
     <div><label for="id_message">Message:</label> <input type="text" name="message" id="id_message" value="Hi there"></div>
     <div><ul class="errorlist"><li>Enter a valid email address.</li></ul><label for="id_sender">Sender:</label> <input type="email" name="sender" id="id_sender" value="invalid email address"></div>
     <div><label for="id_ccMyself">Cc myself:</label> <input type="checkbox" name="ccMyself" id="id_ccMyself" checked></div>
   </div>
   */

Customising the error list format
---------------------------------

By default, forms use :js:class:`ErrorList` to format validation errors. You can
pass an alternate constructor for displaying errors at form construction time:

.. code-block:: javascript

   var DivErrorList = forms.ErrorList.extend({
     render: function() {
       return <div className="errorlist">
         {this.messages().map(function(error) { return <div>{error}</div> })}
       </div>
     }
   })

   f = new ContactForm({data: data, errorConstructor: DivErrorList, autoId: false})
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div><div class="errorlist"><div>This field is required.</div></div>Subject: <input maxlength="100" type="text" name="subject"></div>
     <div>Message: <input type="text" name="message" value="Hi there"></div>
     <div><div class="errorlist"><div>Enter a valid email address.</div></div>Sender: <input type="email" name="sender" value="invalid email address"></div>
     <div>Cc myself: <input type="checkbox" name="ccMyself" checked></div>
   </div>
   */

More granular output
--------------------

To retrieve a single :js:class:`BoundField`, use the
:js:func:`Form#boundField` method on your form, passing the field's name:

.. code-block:: javascript

   var form = new ContactForm()
   print(reactHTML(form.boundField('subject').render()))
   // => <input maxlength="100" type="text" name="subject" id="id_subject">

To retrieve all ``BoundField`` objects, call :js:func:`Form#boundFields`:

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

Extending forms
===============

When you extend a custom ``Form``, the resulting form will include all fields of
its parent form(s), followed by any new fields defined:

.. code-block:: javascript

   var ContactFormWithPrority = ContactForm.extend({
     priority: forms.CharField()
   })
   var f = new ContactFormWithPrority({autoId: false})
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div>Subject: <input maxlength="100" type="text" name="subject"></div>
     <div>Message: <input type="text" name="message"></div>
     <div>Sender: <input type="email" name="sender"></div>
     <div>Cc myself: <input type="checkbox" name="ccMyself"></div>
     <div>Priority: <input type="text" name="priority"></div>
   </div>
   */

Forms can be used as mixins (using `Concur`_'s ``__mixins__`` functionality). In
this example, ``BeatleForm`` mixes in ``PersonForm`` and ``InstrumentForm``, and
its field list includes their fields:

.. code-block:: javascript

   var PersonForm = forms.Form.extend({
     first_name: forms.CharField(),
     last_name: forms.CharField()
   })
   var InstrumentForm = forms.Form.extend({
     instrument: forms.CharField()
   })
   var BeatleForm = forms.Form.extend({
     __mixins__: [PersonForm, InstrumentForm],
     haircut_type: forms.CharField()
   })
   var b = new BeatleForm({autoId: false})
   print(reactHTML(<RenderForm form={b}/>))
   /* =>
   <div>
     <div>First name: <input type="text" name="first_name"></div>
     <div>Last name: <input type="text" name="last_name"></div>
     <div>Instrument: <input type="text" name="instrument"></div>
     <div>Haircut type: <input type="text" name="haircut_type"></div>
   </div>
   */

.. _ref-form-prefixes:

Prefixes for forms
==================

You can put as many forms as you like inside one ``<form>`` tag. To give each
form its own namespace, use the ``prefix`` argument:

.. code-block:: javascript

   var mother = new PersonForm({prefix: 'mother'})
   var father = new PersonForm({prefix: 'father'})
   print(reactHTML(<RenderForm form={mother}/>))
   /* =>
   <div>
     <div><label for="id_mother-first_name">First name:</label> <input type="text" name="mother-first_name" id="id_mother-first_name"></div>
     <div><label for="id_mother-last_name">Last name:</label> <input type="text" name="mother-last_name" id="id_mother-last_name"></div>
   </div>
   */
   print(reactHTML(<RenderForm form={father}/>))
   /* =>
   <div>
     <div><label for="id_father-first_name">First name:</label> <input type="text" name="father-first_name" id="id_father-first_name"></div>
     <div><label for="id_father-last_name">Last name:</label> <input type="text" name="father-last_name" id="id_father-last_name"></div>
   </div>
   */

.. _binding-uploaded-files:

Binding uploaded files to a form
================================

.. Warning::
   Since handling of file uploads in single page apps is a little bit different
   than a regular multipart form submission, this section isn't worth much! This
   subject will be revisited in a future release.

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
     ...
   </form>

.. _`Concur`: https://github.com/insin/concur#api
.. _`Express`: http://expressjs.com/
