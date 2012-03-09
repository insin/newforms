====
TODO
====

Porting Django Modules / Changesets
===================================

Change histories for the most relevant Django modules can be found here:

* http://code.djangoproject.com/log/django/trunk/django/core/validators.py?mode=follow_copy
* http://code.djangoproject.com/log/django/trunk/django/forms/fields.py?mode=follow_copy
* http://code.djangoproject.com/log/django/trunk/django/forms/forms.py?mode=follow_copy
* http://code.djangoproject.com/log/django/trunk/django/forms/formsets.py?mode=follow_copy
* http://code.djangoproject.com/log/django/trunk/django/forms/util.py?mode=follow_copy
* http://code.djangoproject.com/log/django/trunk/django/forms/widgets.py?mode=follow_copy

Changesets
----------

http://code.djangoproject.com/changeset/7967 (partial)

   Media classes - changes to forms.js and widgets.js

https://code.djangoproject.com/changeset/11964
https://code.djangoproject.com/changeset/12029
https://code.djangoproject.com/changeset/12698
https://code.djangoproject.com/changeset/12867
https://code.djangoproject.com/changeset/13296
https://code.djangoproject.com/changeset/13484

   Date/time Widget formatting/locale stuff. We already have locale stuff in the
   ``time`` object, so might as well start making use of it.

Python-to-JavaScript: Missing Pieces
====================================

**Decimal Implementation**
   Is there a good imlementation out there, or is validating strings,
   using floats for min/max validation and returning strings good enough
   for the frontend?

Extras
======

Form Layout
-----------

The current Form.prototype._htmlOutput is as inflexible as Django's output,
part of the problem being that Widgets control their own HTML generation and
that HTML generation is being done entirely in code.

Interesting tickets:

* https://code.djangoproject.com/ticket/6630 - define fieldsets in a Meta object

Prior art:

* https://github.com/earle/django-bootstrap
* https://github.com/brutasse/django-floppyforms
* https://github.com/pydanny/django-uni-form
