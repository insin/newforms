=====
Forms
=====

Guide
=====

For a guide to the features of the Form API, please refer to the Django
documentation:

   * `Django documentation -- The Forms API <https://docs.djangoproject.com/en/dev/ref/forms/api/>`_

Headings and JavaScript equivalents of code samples are provided below for
reference.

.. Note::

   Newforms renders form by creating ``React.DOM`` components, not HTML strings.

   In usage examples which display HTML string output, we use a ``reactHTML()``
   function to indicate there's another step between rendering a form and final
   output. An actual implementation of this function would need to strip
   ``data-react-`` attributes from the generated HTML and pretty-printing to add
   form row linebreaks to get the exact example output.

   However, the example HTML output is representative of the DOM structure
   which would be created when running in a browser, with React managing
   keeping the real DOM in sync with the rendered state of forms.

Bound and unbound forms
-----------------------

Creating a form::

  var f = new ContactForm()

Binding data to a form::

   var data = {
     subject: 'hello',
   , message: 'Hi there'
   , sender: 'foo@example.com'
   , ccMyself: true
   }
   var f = new ContactForm({data: data})

Form.isBound
------------

::

   var f = mew ContactForm()
   print(f.isBound)
   // => false
   f = new ContactForm({data: {subject: 'hello'}})
   print(f.isBound)
   // => true

A form given an empty object is still bound::

   var f = new ContactForm({data: {}})
   print(f.isBound)
   // => true

Using forms to validate data
----------------------------

Valid data::

   var data = {
     subject: 'hello',
   , message: 'Hi there'
   , sender: 'foo@example.com'
   , ccMyself: true
   }
   var f = new ContactForm({data: data})
   print(f.isValid())
   // => true

Invalid data::

   var data = {
     subject: 'hello',
   , message: 'Hi there'
   , sender: 'invalid email address'
   , ccMyself: true
   }
   var f = new ContactForm({data: data})
   print(f.isValid())
   // => false

Form.errors::

   f.errors().asText()
   /* =>
   * subject
     * This field is required.
   * sender
     * Enter a valid email address.
   */

Behaviour of unbound forms
~~~~~~~~~~~~~~~~~~~~~~~~~~

::

   var f = new ContactForm()
   print(f.isValid())
   // => false
   print(f.errors().errors)
   // => {}

Dynamic initial values
----------------------

``Form.initial``::

   var f = new ContactForm({initial: {subject: 'Hi there!'}})

Form-level ``initial`` gets precedence::

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
----------------------------------

Form.fields::

   print(f.fields)
   // => {name: [object CharField], url: [object URLField], comment: [object CharField]}

You can alter ``fields`` of a Form instance::

   f.fields.name.label = 'Username'
   print(reactHTML(f.render()))
   /* =>
   <tr><th>Username:</th><td><input type="text" name="name" value="instance"></td></tr>
   <tr><th>Url:</th><td><input type="url" name="url"></td></tr>
   <tr><th>Comment:</th><td><input type="text" name="comment"></td></tr>
   */

Warning: don't alter 11baseFields11 or every subsequent form isntance will be
affected::

   f.baseFields.name.label = 'Username'
   var anotherForm = new CommentForm({autoId: false})
   print(reactHTML(anotherForm.render()))
   /* =>
   <tr><th>Username:</th><td><input type="text" name="name" value="prototype"></td></tr>
   <tr><th>Url:</th><td><input type="url" name="url"></td></tr>
   <tr><th>Comment:</th><td><input type="text" name="comment"></td></tr>
   */

Accessing "clean" data
----------------------

Form.cleanedData::

   var data = {
     subject: 'hello',
   , message: 'Hi there'
   , sender: 'foo@example.com'
   , ccMyself: true
   }
   var f = new ContactForm({data: data})
   print(f.isValid())
   // => true
   print(f.cleanedData)
   // => {subject: 'hello', message: 'Hi there', sender: 'foo@example.com', ccMyself: true}

``cleanedData`` contains only valid fields::

   var data = {
     subject: '',
   , message: 'Hi there'
   , sender: 'foo@example.com'
   , ccMyself: true
   }
   var f = new ContactForm({data: data})
   print(f.isValid())
   // => false
   print(f.cleanedData)
   // => {message: 'Hi there', sender: 'foo@example.com', ccMyself: true}

``cleanedData`` will only contain properties for fields defined in the form::

   var data = {
     subject: 'Hello',
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
fields::

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
   // =? {firstName: 'Alan', lastName: 'Partridge', nickName: false}

Outputting forms as HTML
------------------------

Simply call ``render()`` -- forms have an ``asTable()`` method which is used as
the default rendering, so calling ``render()`` is equivalent::

   var f = new ContactForm()
   print(reactHTML(f.render()))
   /* =>
   <tr><th><label for="id_subject">Subject:</label></th><td><input maxlength="100" type="text" name="subject" id="id_subject"></td></tr>
   <tr><th><label for="id_message">Message:</label></th><td><input type="text" name="message" id="id_message"></td></tr>
   <tr><th><label for="id_sender">Sender:</label></th><td><input type="email" name="sender" id="id_sender"></td></tr>
   <tr><th><label for="id_ccMyself">Cc myself:</label></th><td><input type="checkbox" name="ccMyself" id="id_ccMyself"></td></tr>
   */

Usage in JSX::

   <table>
     <tbody>
       {f.render()}
     </tbody>
   </tbody>

If the form is bound to data, the HTML output will include that data
appropriately::

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

``asDiv()`` renders the form as a series of ``<div>`` tags, with each ``<div>``
containing one field::

   var f = new ContactForm()
   print(reactHTML(f.asDiv()))
   /* =>
   <div><label for="id_subject">Subject:</label><span> </span><input maxlength="100" type="text" name="subject" id="id_subject"></div>
   <div><label for="id_message">Message:</label><span> </span><input type="text" name="message" id="id_message"></div>
   <div><label for="id_sender">Sender:</label><span> </span><input type="email" name="sender" id="id_sender"></div>
   <div><label for="id_ccMyself">Cc myself:</label><span> </span><input type="checkbox" name="ccMyself" id="id_ccMyself"></div>
   */

``asUl()`` renders the form as a series of ``<li>`` tags, with each ``<li>``
containing one field::

   var f = new ContactForm()
   print(reactHTML(f.asUl()))
   /* =>
   <li><label for="id_subject">Subject:</label><span> </span><input maxlength="100" type="text" name="subject" id="id_subject"></li>
   <li><label for="id_message">Message:</label><span> </span><input type="text" name="message" id="id_message"></li>
   <li><label for="id_sender">Sender:</label><span> </span><input type="email" name="sender" id="id_sender"></li>
   <li><label for="id_ccMyself">Cc myself:</label><span> </span><input type="checkbox" name="ccMyself" id="id_ccMyself"></li>
   */

Styling form rows
~~~~~~~~~~~~~~~~~

When extending a form, there are a few hooks you can use to add ``class``
attributes to form rows:

* ``rowCssClass`` -- applied to every form row
* ``errorCssClass`` -- applied to form rows of fields which have errors
* ``requiredCssClass`` -- applied to form rows for required fields

To use these hooks, ensure your form has them as prototype or instance
properties, e.g. to set them up as protoype properties::

   var ContactForm = forms.Form.extend({
     rowCssClass: 'row'
   , errorCssClass: 'error'
   , requiredCssClass: 'required'
   // ...and the rest of your fields here
   })

Once you've done that, the HTML will look something like::

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

Configuring form elements’ HTML ``id`` attributes and ``<label>`` tags
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If ``autoId`` is ``false``, then the form output will include neither
``<label>`` tags nor ``id`` attributes::

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
tags and will simply use the field name as its ``id`` for each form field::

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
attributes based on the format string::

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

It’s possible to customize the suffix character appended to generated labels
(default: ``':'``), or omit it entirely, using the ``labelSuffix`` parameter::

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

How errors are displayed
~~~~~~~~~~~~~~~~~~~~~~~~

Default HTML output will include the validation errors as a
``<ul class="errorlist">`` near the field::

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
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can pass an alternate constructor for displaying errors at form construction
time::

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
~~~~~~~~~~~~~~~~~~~~

To retrieve a single ``BoundField``, use the ``boundField()`` method on your
form, passing the field’s name::

   var form = new ContactForm()
   print(reactHTML(form.boundField('subject').render()))
   // => <input maxlength="100\ type="text" name="subject\" id="id_subject">

To retrieve all ``BoundField`` objects, call ``boundFields()``::

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

The field-specific output honours the form object’s ``autoId`` setting::

   var f = new ContactForm({autoId: false})
   print(reactHTML(f.boundField('message').render()))
   // => <input type="text" name="message">
   f = new ContactForm({autoId: 'id_{name}'})
   print(reactHTML(f.boundField('message').render()))
   // => <input type="text" name="message" id="id_message">

BoundField.errors is an object which renders as a ``<ul class="errorlist">``::

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

Subclassing forms
-----------------

Prefixes for forms
------------------

API
===

.. js:class:: Form([kwargs])

   Extends :js:class:`BaseForm` and registers :js:func:`DeclarativeFieldsMeta`
   as a mixin to be used to set up Fields when this constructor is extended.

   This is intended intended as the entry point for defining your own forms.

   You can do this using its static ``extend()`` function, which is provided by
   `Concur`_.

   .. js:function:: Form.extend(prototypeProps[, constructorProps])

      Creates a new constructor which inherits from Form.

      :param Object prototypeProps:
         form Fields and other prototype properties for the new form, such as a
         custom constructor and validation methods.

      :param Object constructorProps:
         properties to be set directly on the new constructor function.

   .. _`Concur`: https://github.com/insin/concur

.. js:function:: DeclarativeFieldsMeta(prototypeProps[, constructorProps])

   This mixin function is responsible for setting up form fields when a new Form
   constructor is being created.

   It pops any Fields it finds off the form's prototype properties object,
   determines if any forms are also being mixed-in via a ``__mixin__`` property
   and handles inheritance of Fields from any form which is being inherited from,
   such that fields will be given the following order of precedence should there be a
   naming conflict with any of these three sources:

   1. Fields specified in ``prototypeProps``
   2. Fields from a mixed-in form
   3. Fields from the Form being inherited from

.. js:class:: BaseForm([kwargs])

   A collection of Fields that knows how to validate and display itself.

   :param Object kwargs: form options.

   .. js:attribute:: kwargs.data

      input form data, where property names are field names. A form with data is
      considered to be "bound" and ready for use validating and coercing the
      given data.

      :type: Object

   .. js:attribute:: kwargs.files

      input file data.

      :type: Object

   .. js:attribute:: kwargs.autoId

      a template for use when automatically generating ``id`` attributes for
      fields, which should contain a ``{name}`` placeholder for the field name
      -- defaults to ``id_{name}``.

      :type: String

   .. js:attribute:: kwargs.prefix

      a prefix to be applied to the name of each field in this instance of the
      form - using a prefix allows you to easily work with multiple instances of
      the same Form object in the same HTML ``<form>``, or to safely mix Form
      objects which have fields with the same names.

      :type: String

   .. js:attribute:: kwargs.initial (Object)

      initial form data, where property names are field names -- if a field's
      value is not specified in ``data``, these values will be used when
      rendering field widgets.

      :type: Object

   .. js:attribute:: kwargs.errorConstructor

      the constructor function to be used when creating error details. Defaults
      to :js:class:`ErrorList`.

      :type: Function

   .. js:attribute:: kwargs.labelSuffix

      a suffix to be used when generating labels in one of the convenience
      methods which renders the entire Form -- defaults to ``':'``.

      :type: String

   .. js:attribute:: kwargs.emptyPermitted

      if ``true``, the form is allowed to be empty -- defaults to ``false``.

      :type: Boolean

   **Instance Properties**

   Form options documented in ``kwargs`` above are set as instance properties.

   The following instance properties are also available:

   .. js:attribute:: form.fields

      Form fields for this instance of the form.

      Since a particular instance might want to alter its fields based on data
      passed to its constructor, fields given as part of the form definition
      are deep-copied into ``fields`` every time a new instance is created.

      Instances should only ever modify ``fields``.

      :type: Object with field names as property names and Field instances as properties.

   .. js:attribute:: form.isBound

      Determines if this form has been given input data which can be validated.

      ``true`` if the form was instantiated with ``kwargs.data`` or
      ``kwargs.files``.

   .. js:attribute:: form.cleanedData

      After a form has been validated, it will have a ``cleanedData`` property.
      If your data does *not* validate, ``cleanedData`` will contain only the
      valid fields.

      :type:
         Object with field names as property names and valid, cleaned values
         coerced to the appropriate JavaScript type as properties.

   **Prototype Functions**

   Prototype functions for validating and getting information about the results
   of validation.

   .. js:function:: BaseForm#isValid()

      Determines whether or not the form has errors, triggering cleaning of the
      form first if necessary.

      :return:
         ``true`` if the form is bound and has no errors, ``false`` otherwise.
         If errors are being ignored, returns ``false``.

   .. js:function:: BaseForm#errors()

      Getter for validation errors which first cleans the form if there are no
      errors defined yet.

      :returns: validation errors for the form, as an :js:class:`ErrorObject`

   .. js:function:: BaseForm#nonFieldErrors()

      :returns:
         errors that aren't associated with a particular field - i.e., errors
         generated by :js:func:`BaseForm#clean`. Will be empty if there are
         none.

   .. js:function:: BaseForm#hasChanged()

      :returns: ``true`` if data differs from initial.

   .. js:function:: BaseForm#changedData()

      :returns:
         a list of the names of fields which have differences between their
         initial and currently bound values.

   .. js:function:: BaseForm#fullClean()

      Validates and cleans ``this.data`` and populates errors and
      ``cleanedData``.

      You shouldn't need to call this function directly in general use, as it's
      called for you when necessary by :js:func:`BaseForm#isValid` and
      :js:func:`BaseForm#errors`.

   .. js:function:: BaseForm#clean()

      Hook for doing any extra form-wide cleaning after each Field's
      :js:func:`Field#clean` has been called. Any :js:class:`ValidationError`
      thrown by this method will not be associated with a particular field; it
      will have a special-case association with the field named ``'__all__'``.

   .. js:function:: BaseForm#addError(field, error)

      This function allows adding errors to specific fields from within the
      ``form.clean()`` method, or from outside the form altogether. This is a
      better alternative to fiddling directly with ``form._errors``.

      The ``field`` argument is the name of the field to which the errors should
      be added. If its value is ``null`` the error will be treated as a
      non-field error as returned by ``form.nonFieldErrors()``.

      The ``error`` argument can be a simple string, or preferably an instance
      of :js:class:`ValidationError`.

      Note that ``form.addError()`` automatically removes the relevant field
      from :js:attr:`form.cleanedData`.

   A number of default rendering functions are provided to generate
   ``React.DOM`` representations of a Form's fields.

   These are general-purpose in that they attempt to handle all form rendering
   scenarios and edge cases, ensuring that valid markup is always produced.

   For flexibility, the output does not include a ``<form>`` or a submit
   button, just field labels and inputs.

   .. js:function:: BaseForm#render()

      Default rendering method, which calls :js:func:`BaseForm#asTable`

   .. js:function:: BaseForm#asTable()

      Renders the form as a series of ``<tr>`` tags, with ``<th>`` and ``<td>``
      tags containing field labels and inputs, respectively.

      You're responsible for ensuring the generated rows are placed in a
      containing ``<table>`` and ``<tbody>``.

   .. js:function:: BaseForm#asUl()

      Renders the form as a series of ``<li>`` tags, with each ``<li>``
      containing one field. It does not include the ``<ul>`` so that you can
      specify any HTML attributes on the ``<ul>`` for flexibility.

   .. js:function:: BaseForm#asDiv()

      Renders the form as a series of ``<div>`` tags, with each ``<div>``
      containing one field.

   Prototype functions for use in rendering form fields.

   .. js:function:: BaseForm#boundFields([test])

      Creates a :js:class:`BoundField` for each field in the form, in the order
      in which the fields were created.

      :param Function test:

         If provided, this function will be called with ``field`` and ``name``
         arguments - BoundFields will only be generated for fields for which
         ``true`` is returned.

   .. js:function:: BaseForm#boundFieldsObj([test])

      A version of :js:func:`BaseForm#boundFields` which returns an Object with
      field names as property names and BoundFields as properties.

   .. js:function:: BaseForm#boundField(name)

      Creates a :js:class:`BoundField` for the field with the given name.

      :param String name: the name of a field in the form.

   .. js:function:: BaseForm#hiddenFields()

      :returns: a list of :js:class:`BoundField` objects that correspond to
         hidden fields. Useful for manual form layout.

   .. js:function:: BaseForm#visibleFields()

      :returns:
         a list of :js:class:`BoundField` objects that do not correspond to
         hidden fields. The opposite of the :js:func:`BaseForm#hiddenFields`
         function.

   .. js:function:: BaseForm#isMultipart()

      Determines if the form needs to be multipart-encoded in other words, if it
      has a :js:class:`FileInput`.

      :returns: ``true`` if the form needs to be multipart-encoded.

   .. js:function:: BaseForm#addPrefix(fieldName)

      :returns:
         the given field name with a prefix added, if this Form has a prefix.

   .. js:function:: BaseForm#addInitialPrefix(fieldName)

      Adds an initial prefix for checking dynamic initial values.

.. js:class:: BoundField(form, field, name)

   A field and its associated data.

   This is the primary means of generating components such as labels and input
   fields in the default form rendering methods.

   Its attributes and methods may be of use when implementing custom rendering.

   :param Form form:
      a form.

   :param Field field:
      one of the form's fields.

   :param String name:
      the name under which the field is held in the form

   **Instance Attributes**

   .. js:attribute:: boundField.form (Form)

      The form this BoundField wraps a field from.

   .. js:attribute:: boundField.field (Field)

      The field this BoundField wraps.

   .. js:attribute:: boundField.name (String)

      The name associated with the field in the form.

   .. js:attribute:: boundField.htmlName (String)

      A version of the field's name including any prefix the form has been
      configured with.

      Assuming your forms are configured with prefixes when needed, this
      should be a unique identifier for any particular field (e.g. if you need
      something to pass as a ``key`` prop to a React component).

   **Prototype Functions**

   .. js:function:: BoundField#errors()

      :returns: validation errors for the field.

   .. js:function:: BoundField#isHidden()

      :returns: ``true`` if the field is configured with a hidden widget.

   .. js:function:: BoundField#autoId()

      Calculates and returns the ``id`` attribute for this BoundField if the
      associated form has an autoId. Returns an empty string otherwise.

   .. js:function:: BoundField#data()

      :returns: Raw input data for the field or ``null`` if it wasn't given.

   .. js:function:: BoundField#idForLabel()

      Wrapper around the field widget's :js:func:`Widget#idForLabel`. Useful,
      for example, for focusing on this field regardless of whether it has a
      single widget or a :js:class:`MutiWidget`.

   .. js:function:: BoundField#render([kwargs])

      Default rendering method - if the field has ``showHiddenInitial`` set,
      renders the default widget and a hidden version, otherwise just renders
      the default widget for the field.

      :param Object kwargs: widget options as per :js:func:`BoundField#asWidget`.

   .. js:function:: BoundField#asWidget([kwargs])

      Renders a widget for the field.

      :param Object kwargs: widget options.

      .. js:attribute:: kwargs.widget (Widget)

         An override for the widget used to render the field - if not
         provided, the field's configured widget will be used.

      .. js:attribute:: kwargs.attrs (Object)

         Additional attributes to be added to the field's widget.

   .. js:function:: BoundField#suWidgets()

      :returns:
         a list of :js:class:`SubWidget` objects that comprise all widgets in
         this BoundField. This really is only useful for :js:class:`RadioSelect`
         widgets, so that you can iterate over individual radio buttons when rendering.

   .. js:function:: BoundField#asText([kwargs])

      Renders the field as a text input.

      :param Object kwargs: widget options.

      .. js:attribute:: kwargs.attrs (Object)

         Additional attributes to be added to the field's widget.

   .. js:function:: BoundField#asTextarea([kwargs])

      Renders the field as a textarea.

      :param Object kwargs: widget options.

      .. js:attribute:: kwargs.attrs (Object)

         Additional attributes to be added to the field's widget.

   .. js:function:: BoundField#asHidden([kwargs])

      Renders the field as a hidden field.

      :param Object kwargs: widget options.

      .. js:attribute:: kwargs.attrs (Object)

         Additional attributes to be added to the field's widget.

   .. js:function:: BoundField#value()

      Returns the value for this BoundField, using the initial value if the form
      is not bound or the data otherwise.

   .. js:function:: BoundField#getLabel()

      Creates the label value to be displayed, adding the form suffix if there
      is one and the label doesn't end in punctuation.

   .. js:function:: BoundField#labelTag([kwargs])

      Wraps the given contents in a <label>, if the field has an ID attribute,
      otherwise generates a text label.

      :param Object kwargs: configuration options.

      .. js:attribute:: kwargs.contents (String)

         Contents for the label - if not provided, label contents will be
         generated from the field itself.

      .. js:attribute:: kwargs.attrs (Object)

         Additional attributes to be added to the label.

   .. js:function:: BoundField#cssClasses([extraClasses])

      Returns a string of space-separated CSS classes to be applied to the
      field.

      :param String extraClasses:
         additional CSS classes to be applied to the field
