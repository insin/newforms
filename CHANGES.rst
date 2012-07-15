0.4.2 / 2012-07-15
==================

* Automatically-added deletion fields are no longer included in the list of
  cleanedData for a FormSet [`whardeman`_]
* Data from forms marked for deletion are no longer present in a FormSet's
  cleanedData [`whardeman`_]
* Fixed ``FloatField.prototype._hasChanged()``, which wasn't comparing against
  the field's initial value
* Added ``managementFormCssClass`` to BaseFormSet's kwargs, to provide a CSS
  class for the row generated to hold the management form's hidden fields
* Added use of ``hiddenFieldRowCssClass`` to provide a CSS class for Form rows
  which were generated solely to wrap empty fields to avoid generating invalid
  HTML
* Added use of ``rowCssClass`` to provide a class for each row in a Form
  [`whardeman`_]

0.4.1 / 2012-06-29
==================

* Updated to isomorph 0.2
* Added ``extraClasses`` to Field's kwargs [`whardeman`_]

0.4.0 / 2012-03-08
==================

* Extracted validators into a `validators`_ project and added it as a dependency
  -- as a result, ``callValidator()``, ``isCallable()`` and IPv6 functions now
  live under ``forms.validators``
* Extracted URL utility functions out into `isomorph`_
* Fixed #11: a validator's error message should take precedence unless the field
  it's validating has defined a custom error message using the same error code
* Changed ``BoundField.protoype.labelTag()`` to also include the form's
  ``labelSuffix``

.. _`validators`: https://github.com/insin/validators

0.3.0 / 2012-02-10
==================

* Added GenericIPAddressField
* Renamed ``forms.validateIPV4Address`` to ``forms.validateIPv4Address`` for
  consistency with new IPv6 validation
* Added SubWidgets to allow you to iterate over invdidiual elements which make
  up a widget -- currently only used by RadioSelect
* Changed MultiValueField to run any validators it was given
* Changed URL and email address validators to handle IDNA domains
* Changed CheckboxInput to correctly handle ``0`` as a value
* Added ``BaseFormSet.prototype.hasChanged()``
* Changed Select widget to only allow for one selected option with the same
  value

0.2.0 / 2012-02-05
==================

* Backwards-incompatible change to ``forms.Form`` -- this used to be a factory
  function, but is now a constructor created with `Concur`_ which, when
  extended from, will move given Field properties into the new constructor's
  baseFields prototype property
* Backwards-incompatible change: renamed ``forms.FormSet`` to
  ``forms.formsetFactory`` so it's named like the factory function it is, rather
  than like a constructor

0.1.1 / 2012-02-01
==================

* Fixed browser build - IE7/8 object.hasOwn incompatibility fixed in isomorph.

0.1.0 / 2012-01-31
==================

* Changed code structure - now written as regular Node.js modules
* Changed API for placeholder strings, which are now ``'{placeholder}'`` style
  instead of ``'%(placeholder)s'``
* Changed ``forms.util`` API, as most utility methods have been split out into
  `isomorph`_, which is now a dependency
* Added extension sugar via `Concur`_ - all newforms constructors now have an
  ``extend()`` function

.. _`isomorph`: https://github.com/insin/isomorph
.. _`Concur`: https://github.com/insin/concur
.. _`whardeman`: https://github.com/whardeman