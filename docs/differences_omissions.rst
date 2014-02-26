=======================
Differences & Omissions
=======================

JavaScript API Differences
==========================

The newforms API is largely consistent with the ``django.forms`` API, but uses
JavaScript naming conventions and some other conventions where there are feature
differences between Python and JavaScript:

Function and variable names
---------------------------

Function and variable names which use ``underscores_in_python`` become
``camelCasedInJavaScript``.

A notable exception is custom field cleaning functions defined on forms, for
which newforms will detect and call either ``clean_fieldName`` or
``cleanFieldName`` variants.

Keyword arguments
-----------------

Where Django accepts keyword arguments, in Javascript a single ``Object``
argument is expected, with arguments expressed as its properties.

Note that this applies *anywhere* Django accepts a keyword argument, even if
the convention in Django is to pass certain keyword arguments positionally.

For example, when passing user-provided data to a :js:class:`Form` constructor:

   **Django (by convention)**::

      f = MyForm(request.POST)

   **JavaScript**::

      var f = new MyForm({data: req.body})

Properties
----------

Form and FormSet properties with side-effects in Django become function calls in
JavaScript.

For example:

   * ``form.errors`` (which forces a form to validate if it hasn't done so
     already) becomes ``form.errors()``.

   * ``formset.forms`` (which instantiates all a formset's forms the first
     time it's accessed) becomes ``formset.forms()``.

Use of ``new`` in JavaScript
----------------------------

For convenience and compactness, the ``new`` operator is **optional** when
using newforms' Fields, Widgets and other constructors which are commonly
used while defining a Form, such as ValidationError -- however ``new`` is
**not**  automatically optional for the Form and FormSet constructors you
create.

   **Django**::

      forms.CharField(max_length=100)

   **JavaScript (the following lines are equivalent)**::

      new forms.CharField({maxLength: 100})
      forms.CharField({maxLength: 100})


Displaying objects
------------------

Objects which would be coerced to a string for display in Django, such as Forms,
FormSets and ErrorLists, have a ``render()`` method to generate their default
representation as ``React.DOM`` components.

String placeholders
-------------------

Newforms only uses named placeholders in strings and surrounds them with ``{}``:

   **Django**::

      form = ContactForm(auto_id='id_%s')

      field = ChoiceField(error_messages={'invalid_choice': 'Anything but %(value)s!'})

   **JavaScript**::

      var form = new ContactForm({autoId: 'id_{name}'})

      var field = ChoiceField({errorMessages: {invalidChoice: 'Anything but {value}!'}})

Feature Differences
===================

Differences in features between ``django.forms`` and newforms:

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

Feature Omissions
=================

``django.forms`` featurs which aren't implemented in newforms:

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
