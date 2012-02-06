* Changed URL and email address validators to handle IDNA domains.
* Changed ``CheckboxInput`` to correctly handle ``0`` as a value.
* Added ``BaseFormSet.prototype.hasChanged()``
* Changed ``Select`` widget to only allow for one selected option with the same
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
