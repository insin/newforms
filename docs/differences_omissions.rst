=======================
Differences & Omissions
=======================

Differences and omissions between ``django.forms`` and newforms.

Differences
===========

``(form|formset).as_p()`` replaced with ``(form|formset).asDiv()``
------------------------------------------------------------------

Django provides a default ``as_p()`` rendering method for Forms and FormSets.
This can result in invalid HTML being generated, with block-level markup being
inserted into a ``<p>``, for example a ``<ul>`` containing validation error
messages.

Invalid markup poses a problem for React (at the time of writing, with React at
version 0.9.0) -- when browsers perform error correction, nodes get moved around
and React finds that the DOM is out of sync with what it expected it to be and
can no longer operate on it.

For this reason, newforms instead implements :js:func:`BaseForm.asDiv` and
:js:func:`BaseFormSet.asDiv` to wrap fields in a block-level container which can
include other block-level elements.

Omissions
=========

Form Assets (``Media`` class)
-----------------------------

Creating froms from models
--------------------------