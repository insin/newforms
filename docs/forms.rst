=====
Forms
=====

For a guide to the features of the Form API, please refer to the Django
documentation for an introduction to the concepts and prose descriptions of
features:

   * `Django documentation -- The Forms API <https://docs.djangoproject.com/en/dev/ref/forms/api/>`_

Headings from the Django documentation are duplicated below with JavaScript
equivalents of example code.

.. Note::

   Newforms renders form by creating ``React.DOM`` components, not HTML strings.

   In usage examples which display HTML string output, we use a ``reactHTML()``
   function to indicate there's another step between rendering a form and final
   output. An actual implementation of this function would need to strip
   ``data-react-`` attributes from the generated HTML and pretty-print to get
   the exact example output.

   However, the example HTML output is representative of the DOM structure
   which would be created when running in a browser, with React managing
   keeping the real DOM in sync with the rendered state of forms.

Bound and unbound forms
=======================

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
============================

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

``Form.errors()`` returns an :js:class:`ErrorObject`::

   f.errors().asText()
   /* =>
   * subject
     * This field is required.
   * sender
     * Enter a valid email address.
   */

Behaviour of unbound forms
--------------------------

::

   var f = new ContactForm()
   print(f.isValid())
   // => false
   print(f.errors().errors)
   // => {}

Dynamic initial values
======================

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
==================================

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

Warning: don't alter ``baseFields`` or every subsequent form instance will be
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
======================

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
   // => {firstName: 'Alan', lastName: 'Partridge', nickName: false}

Updating a form's input data
=============================

To update a Form's input data use ``form.setData()``.

This will also trigger validation -- updating ``form.errors()`` and
``form.cleanedData``, and returning the result of ``form.isValid()``::

   var f = new ContactForm()
   // ...user inputs data...
   var data = {
     subject: 'hello',
   , message: 'Hi there'
   , sender: 'foo@example.com'
   , ccMyself: true
   }
   var isValid = f.setData(data)
   print(f.isBound)
   // => true
   print(isValid)
   // => true

Outputting forms as HTML
========================

Call ``render()`` -- forms have an ``asTable()`` method which is used as the
default rendering, so calling ``render()`` is equivalent::

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

``asDiv()``
-----------

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

``asUl()``
----------

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
-----------------

When extending a form, there are a few hooks you can use to add ``class``
attributes to form rows in the default rendering:

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

Once you've done that, the generated markup will look something like::

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

Configuring form elements' HTML ``id`` attributes and ``<label>`` tags
----------------------------------------------------------------------

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

It's possible to customise the suffix character appended to generated labels
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
------------------------

Default HTML output will include  validation errors as a
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
---------------------------------

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
--------------------

To retrieve a single :js:class:`BoundField`, use the :js:func:`BaseForm#boundField`
method on your form, passing the field's name::

   var form = new ContactForm()
   print(reactHTML(form.boundField('subject').render()))
   // => <input maxlength="100\ type="text" name="subject\" id="id_subject">

To retrieve all ``BoundField`` objects, call :js:func:`BaseForm#boundFields`::

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

The field-specific output honours the form object's ``autoId`` setting::

   var f = new ContactForm({autoId: false})
   print(reactHTML(f.boundField('message').render()))
   // => <input type="text" name="message">
   f = new ContactForm({autoId: 'id_{name}'})
   print(reactHTML(f.boundField('message').render()))
   // => <input type="text" name="message" id="id_message">

``boundField.errors()`` returns an object which renders as a
``<ul class="errorlist">``::

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
:js:func:`BoundField#labelTag()` method::

   var f = new ContactForm()
   print(reactHTML(f.boundField('message').labelTag()))
   // => <label for="id_message">Message:</label>

If you're manually rendering a field, you can access configured CSS classes
using the ``cssClasses`` method::

   var f = new ContactForm()#
   f.requiredCssClass = 'required'
   print(f.boundField('message').cssClasses())
   // => required

Additional classes can be provided as an argument::

   print(f.boundField('message').cssClasses('foo bar'))
   // => foo bar required

``boundField.value()`` returns the raw value of the field as it would be
rendered by a :js:class:`Widget`::

  var initial = {subject: 'welcome'}
  var data = {subject: 'hi'}
  var unboundForm = new ContactForm({initial: initial})
  var boundForm = new ContactForm({data: data, initial: initial})
  print(unboundForm.boundField('subject').value())
  // => welcome
  print(boundForm.boundField('subject').value())
  // => hi

``boundField.idForLabel()`` returns the ``id`` of the field. For example, if you
are manually constructing a ``label`` in JSX::

  <label htmlFor={form.boundField('myField').idForLabel()}>...<label>

Extending forms
===============

When you extend a custom ``Form``, the resulting form will include all fields of
its parent form(s), followed by any new fields defined::

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
its field list includes their fields::

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
   <li><span>Instrument:</span><span> </span><input type="text" name="instrument"></li>
   <li><span>First name:</span><span> </span><input type="text" name="first_name"></li>
   <li><span>Last name:</span><span> </span><input type="text" name="last_name"></li>
   <li><span>Haircut type:</span><span> </span><input type="text" name="haircut_type"></li>
   */

Prefixes for forms
==================

You can put as many forms as you like inside one ``<form>`` tag. To give each
form its own namespace, use the ``prefix`` argument::

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
