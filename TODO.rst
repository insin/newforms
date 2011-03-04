====
TODO
====

Porting Django Modules / Changesets
===================================

These are not exhaustive lists. They're for quick reference when I have a bit of
time free to port more of the changes which have been made since the original
port was done in June 2008 (of which there are many!)

Change histories for the most relevant Django modules can be found here:

* http://code.djangoproject.com/log/django/trunk/django/core/validators.py?mode=follow_copy
* http://code.djangoproject.com/log/django/trunk/django/forms/fields.py?mode=follow_copy
* http://code.djangoproject.com/log/django/trunk/django/forms/forms.py?mode=follow_copy
* http://code.djangoproject.com/log/django/trunk/django/forms/formsets.py?mode=follow_copy
* http://code.djangoproject.com/log/django/trunk/django/forms/widgets.py?mode=follow_copy

Changesets
----------

http://code.djangoproject.com/changeset/7967 (partial)

   Media classes - changes to forms.js and widgets.js

Python-to-JavaScript: Missing Pieces
====================================

**IDNA Encoder**
   Needed for validating Unicode URLs. The free implementation (from a
   StackOverflow answer) which was previously being used didn't work.

**Decimal Implementation**
   Is there a good imlementation out there, or is validating strings,
   using floats for min/max validation and returning strings good enough
   for the frontend?
