========
Overview
========

Newforms takes care of takes care of a number of common form-related tasks.
Using it, you can:

   * Display a form with automatically generated form widgets.
   * Check user input data against a set of validation rules.
   * Redisplay a form in the case of validation errors.
   * Convert submitted form data to the relevant JavaScript data types.

Concepts
========

The core concepts newforms deals with are:

Widgets
   Widgets correspond to HTML form inputs -- they hold metadata required to
   display an input (or inputs) and given a field's name and user input data,
   will create ``React.DOM`` components which can be rendered to a browser's DOM
   or to HTML strings.

   For example, a ``Select`` knows which ``<option>`` values and labels it
   should generate and how to generate a ``<select>`` with the option
   corresponding to given user input data marked as selected.

Fields
   A Field holds metadata about a piece of user input. This metadata is the
   source for:

   * Arranging display of suitable HTML form inputs for entering and editing
     the expected input.
   * Validating the user input and providing an appropriate error message when
     it's invalid.
   * Converting valid user input to an appropriate JavaScript data type.

   For example, an ``IntegerField`` makes sure that its user input data is a
   valid integer, is valid according to any additional rules defined in its
   metadata -- such as ``minValue`` -- and converts valid user input to a
   JavaScript ``Number``.

Forms
   Forms group related Fields together and are responsible for giving them
   unique names. They use their fields to validate auser input data, and manage
   displaying them as HTML.

   Forms drive the validation process, holding raw user input data, validation
   error messages and "cleaned" data which has been validated and
   type-converted.

Form objects
============

Form constructors are created by extending ``forms.Form`` and declaratively
specifying field names and metadata:

.. code-block:: javascript

   var ContactForm = forms.Form.extend({
     subject: forms.CharField({maxLength: 100})
   , message: forms.CharField()
   , sender: forms.EmailField()
   , ccMyself: forms.BooleanField({required: false})
   })

A form is composed of ``Field`` objects. In this case, our form has four
fields: ``subject``, ``message``, ``sender`` and ``ccMyself``. ``CharField``,
``EmailField`` and ``BooleanField`` are just three of the available field types
-- a full list can be found in :doc:`/fields`.

The distinction between :ref:`ref-forms-bound-unbound` is important:

* An unbound form has no data associated with it. When rendered, it will be
  empty or will contain default values.

* A bound form has submitted data, and hence can be used to tell if that data
  is valid. If an invalid bound form is rendered, it can include inline error
  messages telling the user what data to correct.

Processing the data from a Form
-------------------------------

Once ``setData()`` or ``isValid()`` return ``true``, the successfully validated
form data will be in the ``form.cleanedData`` object. This data will have been
converted into JavaScript types for you.

In the above example, ``ccMyself`` will be a boolean value. Likewise, fields
such as ``IntegerField`` and ``DateField`` convert values to a JavaScript
``Number`` and ``Date``, respectively.

Displaying a Form
-----------------

Rather than newforms providing its own custom React components, ``Form`` objects
render to ``React.DOM`` components, to be included in the ``render()`` output of
the React component the form is being used in.

A form also only outputs its own fields; it's up to you to provide the
surrounding ``<form>`` element, submit buttons etc.

``form.asDiv()`` will output the form with each form field and accompanying
label wrapped in a ``<div>``. Here's the output for our example component:

.. code-block:: html

   <form action="/contact" method="POST">
     <div><label for="id_subject">Subject:</label><span> </span><input maxlength="100" type="text" name="subject" id="id_subject"></div>
     <div><label for="id_message">Message:</label><span> </span><input type="text" name="message" id="id_message"></div>
     <div><label for="id_sender">Sender:</label><span> </span><input type="email" name="sender" id="id_sender"></div>
     <div><label for="id_ccMyself">Cc myself:</label><span> </span><input type="checkbox" name="ccMyself" id="id_ccMyself"></div>
     <div><input type="submit" value="Submit"><input type="button" value="Cancel"></div>
   </form>

Note that each form field has an ``id`` attribute set to ``id_<field-name>``,
which is referenced by the accompanying label tag. You can
:ref:`customise the way in which labels and ids are generated <ref-forms-configuring-label>`.

You can also use ``form.asTable()`` to output table rows (you'll need to provide
your own ``<table>`` and ``<tbody>``) and ``form.asUl()`` to output list items.
Forms also have a default ``form.render()`` method which calls
``form.asTable()``.

.. _ref-overview-customising:

Customising Form display
========================

If the default generated HTML is not to your taste, you can completely customise
the way a form is presented.

To assist with rendering, we introduce another concept which ties together
Widgets, Fields and Forms:

BoundField
   A :js:class:`BoundField` is a helper for rendering HTML content for -- and
   related to -- a single Field.

   It ties together the Field itself, the fields's configured Widget, the name
   the field is given by the Form, and the raw user input data and validation
   errors held by a bound Form.

   BoundFields provide functions for using these together to render the
   different components required to display a field -- its label, form inputs
   and validation error messages -- as well as exposing the constituent parts of
   each of these should you wish to fully customise every aspect of form display.

Forms provide a number of means of getting hold of BoundFields. The main methods
for doing so are:

* ``form.boundFieldsObj()`` -- returns an object whose properties are the form's
  field names, pointing to the corresponding BoundField.
* ``form.boundFields()`` -- returns a list of BoundFields in their form-defined
  order.
* ``form.boundField(fieldName)`` -- returns the BoundField for the named field.

Every object which can generate ``React.DOM`` components in newforms has a
default ``render()`` method -- for BoundFields, the default ``render()`` for a
non-hidden field calls ``asWidget()``, which renders the Widget the field
is configured with.

Other BoundField properties which are useful when creating custom field layouts:

``bf.label``
   The label of the field, e.g. ``Email address``.

``bf.labelTag()``
   The field's label wrapped in a ``<label>``.

``bf.idForLabel()``
   The id that will be used for this field. You may want to use this in lieu of
   ``labelTag()`` if you are constructing the label manually.

``bf.value()``
   The value of the field.

``bf.htmlName``
   The name that will be used in the input element(s') ``name`` attribute. This
   takes the form prefix into account, if it has been set, so it should be
   unique within the ``<form>``.

   This is a good candidate for use as the React ``key`` property to uniquely
   associate a generated component with a particular form field.

``bf.helpText``
   Any help text that has been associated with the field.

``bf.errors()``
   Holds any validation error messages for the field and has a default rendering
   to a ``<ul class="errorlist">``. To customise presentation of errors, you can
   get a lisr of error messages out of it by calling ``bf.errors().messages()``.

``bf.field``
   The :js:class:`Field` instance from the form, that this :js:class:`BoundField`
   wraps. You can use it to access field properties directly.

   Newforms also adds a :ref:`custom property <ref-fields-field-custom>` to the
   Field API -- you can pass this argument when creating a field to store any
   additional, custom metadata you want to associate with the field for later
   use.
