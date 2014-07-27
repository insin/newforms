=======
Locales
=======

.. versionadded:: 0.7

Newforms comes with two pre-configured locales: ``en`` and ``en_GB``.

The default locale is ``en``, which (for backwards-compatibility) expects any
forward slash delimited date input to be in month/day/year format and will, by
default, format dates as year-month-day for display in inputs.

The ``en_GB`` locale is provided as a quick way to switch to day/month/year date
input if that's what your application needs.

Adding a new locale
===================

To add a new locale, use ``forms.addLocale()``, providing a language code and an
object specifying localisation data. The following properties are expected in
the locale object:

.. _ref_locale_items_table:

==========================  ==========================================
Property                    Value
==========================  ==========================================
``b``                       List of abbreviated month names
``B``                       List of full month names
``DATE_INPUT_FORMATS``      Accepted date input `format strings`_
``DATETIME_INPUT_FORMATS``  Accepted date/time input `format strings`_
``TIME_INPUT_FORMATS``      Accepted time input `format strings`_
==========================  ==========================================

For each of the ``*_INPUT_FORMATS``, `ISO 8601`_ standard formats will be
automatically be added if they're not already present.

For example, to add a French locale:

.. code-block:: javascript

   forms.addLocale('fr', {
     b: 'janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.'.split('_')
   , B: 'janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre'.split('_')
   , DATE_INPUT_FORMATS: [
       '%d/%m/%Y', '%d/%m/%y'
     , '%d %b %Y', '%d %b %y'
     , '%d %B %Y', '%d %B %y'
     ]
   , DATETIME_INPUT_FORMATS: [
       '%d/%m/%Y %H:%M:%S'
     , '%d/%m/%Y %H:%M'
     , '%d/%m/%Y'
     ]
   })

Setting the default locale
==========================

To set the defaul locale, use ``forms.setDefaultLocale()``:

.. code-block:: javascript

   forms.setDefaultLocale('fr')

Fields and Widgets which deal with dates and times and haven't been explicitly
configured with input/output `format strings`_ will pick up their input and
output formats from the default locale the first time they need them, caching
them for future use.

As such, if you want to switch locales on the fly, any form instances created
prior to calling ``setDefaultLocale()`` should be re-initialised.

.. _`format strings`: https://github.com/insin/isomorph#formatting-directives
.. _`ISO 8601`: http://en.wikipedia.org/wiki/ISO_8601
