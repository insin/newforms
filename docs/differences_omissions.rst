=======================
Differences & Omissions
=======================

There are some differences and omissions in features between ``django.forms``
and newforms:

Differences
===========

``(form|formset).as_p()`` replaced with ``(form|formset).asDiv()``
------------------------------------------------------------------

``django.forms`` provides a default ``as_p()`` rendering method for Forms and
FormSets. This can result in invalid HTML being generated, with block-level
markup being inserted into a ``<p>``, for example a ``<ul>`` containing
validation error messages.

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
  the field's container.
* If your form has a ``rowCssClass`` property, it will be applied to every
  field's container.
* If your form has a ``hiddenFieldRowCssClass`` property, it will be applied to
  the field container in a default rendering edge case: there are hidden
  fields to be rendered but no existing error display row or field row to add
  them to, in which case a new error row is created solely to contain the hidden
  fields.
* :js:class:`BaseFormSet` takes a ``managementFormCssClass`` argument which -
  when given - will be set as the ``hiddenFieldRowCssClass`` property of the
  formset's management form (which contains only hidden fields).

Omissions
=========

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
