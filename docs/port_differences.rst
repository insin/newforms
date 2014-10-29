================
Port Differences
================

Conventions used when porting from Python to JavaScipt, and some of the
resulting API differences.

JavaScript API differences
==========================

The newforms API is largely consistent with the ``django.forms`` API, but uses
JavaScript naming conventions and some other conventions where there are feature
differences between Python and JavaScript:

Function and variable names
---------------------------

Function and variable names which use ``underscores_in_python`` become
``camelCasedInJavaScript``.

A notable exception is custom field cleaning functions defined on forms, for
which newforms will detect and call either ``cleanFieldName`` or
``clean_fieldName`` or variants, checking for the camelCase version first.

``Object`` instead of keyword arguments
---------------------------------------

Where Python accepts keyword arguments, in Javascript a single ``Object``
argument is expected, with arguments expressed as its properties.

Note that this applies *anywhere* ``django.forms`` accepts a keyword argument,
even if the convention is to pass certain keyword arguments positionally.

For example, when passing user-provided data to a :js:class:`Form` constructor:

   Python (by convention)
      ``f = MyForm(request.POST)``

   JavaScript
      ``var f = new MyForm({data: req.body})``

Function calls instead of Python properties
--------------------------------------------

Where Python properties are used in ``django.forms``, newforms instead uses
regular functions. These are:

**Forms:**

* :js:func:`BaseForm#errors`
* :js:func:`BaseForm#changedData`
* :js:func:`BoundField#errors`
* :js:func:`BoundField#data`
* :js:func:`BoundField#isHidden`
* :js:func:`BoundField#autoId`
* :js:func:`BoundField#idForLabel`

**Fields:**

* :js:func:`ChoiceField#choices`
* :js:func:`ChoiceField#setChoices`

**FormSets:**

* :js:func:`BaseFormSet#managementForm`
* :js:func:`BaseFormSet#forms`
* :js:func:`BaseFormSet#initialForms`
* :js:func:`BaseFormSet#extraForms`
* :js:func:`BaseFormSet#emptyForm`
* :js:func:`BaseFormSet#cleanedData`
* :js:func:`BaseFormSet#deletedForms`
* :js:func:`BaseFormSet#orderedForms`
* :js:func:`BaseFormSet#errors`

Function calls instead of Python Protocols
------------------------------------------

JavaScript doesn't have equivalents to Python's protocols, which are informally
implemented using so-called "magic" dunder-methods like ``__iter__()`` and
``__getitem__()``.

``django.forms`` makes use of these as shortcuts for certain operations. In
newforms, these are implemented as functions. These are:

:js:func:`BaseForm#boundFields`
   gets all BoundFields for a form.
:js:func:`BaseForm#boundField`
   gets a BoundField for a named form field.
:js:func:`BoundField#subWidgets`
   gets all SubWidgets from a BoundField.
:js:func:`BaseFormSet#forms`
   gets all Forms in a FormSet
:js:func:`ErrorList#messages`
   gets all ValidationError message from an ErrorList (coercing ValidationError
   to string and having it performing any required parameter replacements).
:js:func:`RadioFieldRenderer#choiceInputs` / :js:func:`CheckboxFieldRenderer#choiceInputs`
   gets all inputs from a ChoiceFieldRenderer.
:js:func:`RadioFieldRenderer#choiceInput` / :js:func:`CheckboxFieldRenderer#choiceInput`
   gets the i-th input from a ChoiceFieldRenderer.

Use of ``new`` in JavaScript
----------------------------

For convenience and compactness, the ``new`` operator is **optional** when
using newforms' Fields, Widgets and other constructors which are commonly
used while defining a Form, such as ValidationError -- however ``new`` is
**not**  automatically optional for the Form and FormSet constructors you
create.

   Python
      ``forms.CharField(max_length=100)``
   JavaScript (the following are equivalent)
      ``forms.CharField({maxLength: 100})`` /
      ``new forms.CharField({maxLength: 100})``

Displaying objects
------------------

Objects which would be coerced to a string for display in ``django.forms``, such
as Forms, FormSets and ErrorLists, have a ``render()`` method to generate their
default representation as ``ReactElement`` objects.

String placeholders
-------------------

Newforms always uses named placeholders in strings, surrounding the placeholder
name with ``{}``:

   **Python**:

   .. code-block:: python

      form = ContactForm(auto_id='id_%s')
      field = ChoiceField(error_messages={'invalid_choice': 'Anything but %(value)s!'})

   **JavaScript**:

   .. code-block:: javascript

      var form = new ContactForm({autoId: 'id_{name}'})
      var field = ChoiceField({errorMessages: {invalidChoice: 'Anything but {value}!'}})

Validators must be Functions
----------------------------

Field validators must be Functions in newforms, as there is no way to define
custom callable objects in JavaScript.

Decimal data
------------

Since JavaScript doesn't have a standard Decimal data type,
:js:class:`DecimalField` performs limited validation of input as a String,
passes a Number version of input to validators which validate max/min value and
returns a normalised version of the input as a String when the input is
determined to be valid.

Feature differences
===================

Differences in features between ``django.forms`` and newforms:

Mutability & form reuse
-----------------------

On the client side, a newforms form is expected to be created once and used to
validate input data repeatedly as the user updates it.

This requires additions to the API, as the ``django.forms`` API expects to be
dealing with input data from a single HTTP request, whose value doesn't change:

* :js:func:`BaseForm#setData`

Flat ``choices``
----------------

When a value is given in a ``choices`` argument instead of a ``[value, label]``
pair, it will be normalised to ``[value, value]``, allowing passing of flat
lists of choices, or an individual choice as a value rather than a pair.

``(form|formset).as_p()`` replaced with ``(form|formset).asDiv()``
------------------------------------------------------------------

``django.forms`` provides a default ``as_p()`` rendering method for Forms and
FormSets. This can result in invalid HTML being generated, with block-level
markup being inserted into a ``<p>``.

Invalid markup poses a problem for React (at the time of writing, with React at
version 0.9.0) -- when browsers perform error correction, DOM nodes can get
moved around. React then finds that the DOM is out of sync with what it expected
it to be and can no longer operate on it.

For this reason, newforms instead implements :js:func:`BaseForm#asDiv` and
:js:func:`BaseFormSet#asDiv` to wrap fields in a block-level container which can
include other block-level elements.

Custom field cleaning functions don't have to return a value
------------------------------------------------------------

Custom field cleaning functions defined for Forms don't have to return a value
in newforms, but if they do the returned value will be used to update
``cleanedData`` for the field, as it is in ``django.forms``.

Misc. new Field features
------------------------

``Field``
   Accepts a ``custom`` argument to hold any custom metadata the user needs.

``ImageField``
   Adds an ``accept="image/*"`` attribute to its ``<input type="file">`` widget.

Extra CSS class options for default rendering
---------------------------------------------

Newforms adds a few more options for providing custom CSS classes when using
default rendering functions:

* :js:class:`Field` takes a ``cssClass`` argument which will be applied to
  the field's row.
* If your form has a ``rowCssClass`` property, it will be applied to every
  field's row.
* If your form has a ``hiddenFieldRowCssClass`` property, it will be applied to
  the field row created in a default rendering edge case: there are hidden
  fields to be rendered but no existing error display row or field row to add
  them to, in which case a new error row is created solely to contain the hidden
  fields.
* :js:class:`BaseFormSet` takes a ``managementFormCssClass`` argument which -
  when given - will be set as the ``hiddenFieldRowCssClass`` property of the
  formset's management form (which contains only hidden fields).

Missing features
================

``django.forms`` features which aren't implemented in newforms:

Form Assets (``Media`` class)
-----------------------------

``django.forms`` allows you to associate different media files with Forms and
Widgets using a ``Media`` class to declare JavaScript and CSS files they
depend on.

This could be useful in newforms in conjunction with full-page rendering
on the server, but on the client-side there are already many different solutions
for this need, which are often tied in with the JavaScript module system being
used.

For now, newforms leaves management of dependencies up to you rather than
implementing a solution which either isn't needed or is duplication of your
existing means of managing JavaScript and CSS dependencies.

Creating forms from models
--------------------------

``django.forms`` provides a means of creating Forms and FormSets for Django
models, as well as some model-specific fields.

Newforms doesn't have a default model layer and doesn't know anything about
whichever one you're using, if you're even using one.

It may be possible to provide a means of telling newforms how your model layer
works and basing equivalent functionality on that, but for now newforms leaves
creating Forms and FormSets for working with your model layer up to you.

Localisation
------------

Newforms doesn't have a localisaton layer, so features which depend on Django's
haven't been ported:

* The core ``localize`` argument for Fields isn't present in newforms.
* Separators for Fields which take numeric input aren't localised.
* Default date and time formats in date/time Fields aren't localised.
