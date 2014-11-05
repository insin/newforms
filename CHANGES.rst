0.9.0 (in development)
======================

* Added ``formset.removeForm(index)`` to remove extra forms from a FormSet.
* Added ``errorlist#first()`` for conveniently getting just the first validation
  error message.
* Added ``formset.addError()`` for adding non-form errors outside of ``clean()``.
* "Empty" (really: unmodified) extra forms' ``cleanedData`` is no longer included
  in ``formset.cleanedData()``.
* Added ``form.getData()`` to get input data more conveniently by field name in
  prefixed forms, such as forms in a ``FormSet``.
* Form ``clean()`` functions can now specify which fields they make use of for
  cross-field validation. When provided, ``clean()`` will only be called during
  partial form updates (e.g. ``onChange`` handling) if one of the specified
  fields is affected.

0.8.0 / 2014-10-29
==================

* Updated to React 0.12 -- using new ``React.createElement()`` and
  ``React.createFactory()`` API for ``ReactElement`` creation.

0.7.0 / 2014-07-27
==================

* Updated to React 0.11 -- there are no library dependencies on new 0.11 features,
  but unit tests depend on improvements made to its static HTML generation.

New Features
------------

* Added locale support.

0.6.0 / 2014-05-07
==================

Breaking Changes
----------------

* Renamed ``form.isBound`` to ``form.isInitialRender``, which more accurately
  reflects usage of this property (it was always being used in Forms as
  ``!isBound``)
* Changed ``form.setData()`` to no longer accept prefixed data by default.
  Added a ``prefixed`` option argument which controls this and a new
  ``setFormData()`` method which replicates the old behaviour. This makes
  ``setData()`` more user-friendly for use with controlled forms.

New Features
------------

* Added per-field validation as the user makes changes to the form, configured
  by passing a ``validation`` option when constructing a Form, Field or FormSet.
* Added toggling of creation of controlled React components, configured by
  passing a ``controlled`` option when constructing a Form or FormSet. When
  using  controlled components, form widgets reflect the state of ``form.data``,
  so you can change what's displayed in the form by updating its data.
* Added calling of a``onStateChange()`` callback when provided -- passed as an
  option when  constructing a Form or FormSet -- any time validation state may
  have changed as a result of updating user input from controlled components, or
  as a result of validation triggered by user interaction. This option becomes
  required when using ``validation`` or ``controlled`` options.
* Added support for partial updating (``form.updateData(partialData)``) and
  cleaning (``form.partialClean(fieldNames)``) of data.
* Added ``form.reset(newInitial)`` to reset a form back to its initial state,
  optionally providing new initial data in the process.
* Added a ``validate`` option to ``form.setData()`` to support setting incomplete
  data in a controlled form without triggering required field validation errors.
* Added ``form.validate(<form>)`` as a convenience method for retrieving and
  validating input data from a ``<form>`` -- this removes a common step when
  hooking up full-form ``onSubmit`` validation.
* Added ``form.isComplete()`` to determine if all required fields have valid
  input data when validation is being performed interactively.
* Added ``.errorMessage()`` and ``.errorMessages()`` to BoundField as a
  convenience for accessing error message strings, instead of having to go
  through ``.errors()`` and use the ErrorList API.
* Added generation of a ``validCssClass`` in default rendering or when using
  ``BoundField#cssClasses()`` directly, if present on a form or its prototype.
* Added a top-level ``validateAll`` utility method equivalent to
  ``form.validate()`` but for multiple Forms and/or FormSets.
* Added ``Widget.prototype.needsInitialValue`` to allow Widgets to always
  receive the initial value of a field in addition to user input to be rendered.

Changes
-------

* Changed default widget attributes to always have a ``key`` property, to prevent
  fields being recreated when content around them changes (e.g. new validation
  errors being displayed), which makes them lose focus.
* Form and FormSet ``cleanedData`` is now always defined regardless of whether
  or not any validation has been performed yet -- this makes it safe to check
  for data at any time, particularly in cross-field validation.
* Updated to React 0.10 -- there are no library dependencies on new 0.10 features,
  but unit tests now make use of its enhanced support for rendering to static
  HTML.

Bug Fixes
---------

* FormSet sub-forms are no longer created from scratch every time they're
  accessed when running in the browser -- this was throwing away form state,
  which effectively broke FormSets.

0.5.2 / 2014-04-03
==================

* Fixed Select widget's defaultValue attribute.

0.5.1 / 2014-04-01
==================

* Fixed browserification when used as a Node module.

0.5.0 / 2014-03-11
==================

Changes in addition to 0.5.0-rc1:

* Made hidden fields controlled components which always reflect form state on
  each render, since there's no way for the user to interact with them.
* Made FormSets more usable on the client-side:

  * Form instances aren't cached, so adding and removing forms by tweaking form
    count variables works without having to recreate the formset, or touching
    undocumented state.
  * ManagementForm isn't used for formset configuration details when the formset
    is bound - as a result, you don't *have* to render its hidden fields for
    browser-only usage.
  * If rendered, the ManagementForm always reflects FormSet state, not bound
    data, so doing things like bumping ``formset.extra`` to show another form
    works regardless of whether or not the formset is bound.
  * Added a ``setData()`` method to bind new ``formset.data`` and re-trigger
    validation.

0.5.0-rc1 / 2014-03-08
======================

Breaking Changes
----------------

* Now depends on React 0.9.0.
* Newforms components now render by creating ``React.DOM`` components instead of
  relying on context-specific output from ``DOMBuilder.createElement()``.
* Components which can be rendered no longer have ``toString()`` methods --
  creation of final output is now handled by calling ``React.renderComponent``
  or ``React.renderComponentToString`` on a React component which includes
  rendered output of a newforms Form -- this (temporarily) breaks usage of
  newforms in String-based templating libraries such as Jade.
* HTML output has changed -- this will break any tests which depended on the
  specifics of how DOMBuilder generated HTML.

  * React has no equivalent of a virtual DocumentFragment as yet - there are new
    wrapper elements in various places.
  * React wraps free-standing text nodes with ``<span>``.
  * Boolean attributes no longer have a value duplicating the attribute name.

* HTML attribute names must now match what React expects -- no more
  ``'maxlength'`` or quoted ``'class'`` and ``'for'`` attributes.
* A String can no longer be used to specify multiple selected items in a
  ``SelectMultiple`` -- this used to be an accident based on duck typing of
  index access to both items in an Array and characters in a String. If a
  non-Array is given as the selected value, it will now be wtapped in an Array.
* ``CheckboxInput`` no longer silenty swallows any errors thrown by the provided
  ``checkTest`` function.
* ``_hasChanged`` has moved from Widgets to Fields.
* The default error message for an invalid email address has changed.
* ``ValidationError`` API changed -- ``messages`` is now a function rather than
  an array of Strings.
* ``ErrorList`` API changed -- a ``messages()`` method must now be called to
  get final error message strings out of it.
* Replaced ``asP()`` with ``asDiv()``, as invalid markup nesting breaks React
  when browsers perform error correction on the DOM.
* Renamed ``Field.extraCLasses`` option to ``Field.cssClass``.
* Renamed ``asUL()`` methods to ``asUl()``.
* Order of mixing in fields from when multiple Forms are passed to ``__mixin__``
  has changed from right-to-left to left-to-right.
* Only one custom field cleaning functon will be called: ``clean<FieldName>``
  or ``clean_<fieldName>`` in that order. The ability to define both and have
  both run was unintentional.

New Features
------------

* A ``type`` attribute can now be passed to Widgets to take advantage of new
  HTML widget types.

  * Added ``EmailInput`` -- now the default widget for ``EmailField``
  * Added ``URLInput`` -- now the default widget for ``URLField``
  * Added ``NumberInput`` -- now the default widget for ``IntegerField``,
    ``FloatField`` and ``DecimalField``

    * ``IntegerField``, ``FloatField`` and ``DecimalField`` now set HTML5 ``max``,
      ``min`` and ``steo`` attributes on their widget, as applicable.

* ``formData`` now supports new input types: 'email', 'url', 'number' and 'file'
* If a field throws a ``ValidationError`` while checking if it's changed, the
  assumption is now that it's changed.
* ``cleanedData`` is no longer deleted when a form is invalid.
* ``CheckboxSelectMultiple`` now uses a similar renderer to ``RadioSelect`` --
  individual checkbox subwidgets can now be accessed.
* ``id`` attributes are now added to lists of radio and checkbox inputs.
* Radio and checkbox input lists can now display with nested choices
* ``SlugField`` and ``URLField`` now support whitespace stripping.
* Changed data checking now supports calling initial values which are functions.
* Added ``minNum``, ``validateMax`` and ``validateMin`` to ``formsetFactory`` and
  ``BaseFormSet``.
* Added a hard limit to the maximum number of forms in a ``FormSet`` -- ``maxNum``
  + 1000.
* FormSet deletion management data is no longer removd from ``cleanedData``.
* ``MultiWidget`` now sets ``needsMultipartForm`` based on its child widgets.
* Added ``requireAllfields`` option to ``MultiValueField`` -- this allows for
  optional subfields when ``false`` and a new ``'incomplete'`` validation error
  being thrown when required field are empty.
* Added an ``addError()`` method to forms which can be used to set field or
  non-field errors and automatically removes fields from ``cleanedData``,
* ``cleanedData`` doesn't need to be returned from ``Form.clean()`` any more,
  but if it is, it will still be set as ``form.cleanedData``.
* Made ``emptyValues`` a property of ``Field.prototype`` so it can be overridden
  by subclasses if necessary.
* ``TypedChoiceField#coerce`` can now return an arbitrary value.
* ``labelSuffix`` can now be customised when calling ``BoundField#labelTag``.
* `validators`_ is now exposed as ``forms.validators``.
* Added ``Field#isEmptyValue`` and ``Field#emptyValueArray`` to ensure empty
  arrays are detected as empty values by default.
* Added the ability to avoid inheriting a field from an extended or mixed-in
  Form by shadowing its field name with a non-field property.
* Added ``asData()`` and ``toJSON()`` to ``ErrorObject`` and ``ErrorList``.
* Custom ``clean<FieldName>()`` methods no longer have to return a cleaned
  value, but if they do, it will be inserted back into ``cleanedData``.
* ``ClearableFileInput`` now uses overridable functions for templating, making
  it easier to customise.
* ``FileField`` now validates that a file is selected when ``required`` is
  ``true`` in browsers.
* Default rendering methods now allow arbitrary HTML in ``helpText`` if
  ``{__html: ''}`` is passed instead of a string.
* Added ``form.setData()`` to bind new data to a form and re-trigger cleaning.
* Added a ``custom`` argument when constructing Fields, to store any metadata
  you need for later.
* ``ImageField`` now adds an ``accept="image/*"`` attribute to its widget.
* Added ``form.util.makeChoices`` helper for creating [value, label] pairs from
  a list of objects.
* Flat lists of ``choices`` can now be passed into Fields and Widgets which take
  choices.

Bug Fixes
---------

* ``'0'`` should be treated as true by ``CheckboxInput``.
* ``CheckboxInput._hasChanged`` now handles an initial ``'false'`` String.
* ``FloatField`` and ``DecimalField`` now accept '1.' as a valid input.
* Fixed form constructors used as __mixin__ mixins  having their own
  ``baseFields`` overwritten and the prototype properties intended for the new
  form applied to them.
* Fixed ``Boundfield#subWidgets`` not passing ``id`` or ``autoId`` along, so
  label htmlFors and input ids weren't getting generated.

0.4.2 / 2012-07-15
==================

* Automatically-added deletion fields are no longer included in the list of
  cleanedData for a FormSet [`whardeman`_]
* Data for forms marked for deletion is no longer present in a FormSet's
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
.. _`validators`: https://github.com/insin/validators
