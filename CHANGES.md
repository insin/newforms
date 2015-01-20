## Changes

* Added former `formsetFactory()` options to `FormSet` proper.
  * `FormSet` can now be costructed directly, setting all formset-specific
    options instead of having to extend it.
  * `FormSet.extend()` can now be used directly to preconfigure a `FormSet`
    constructor with the `Form` constructor to be used and any other formset
    options.
* `FormSet` options can now be overridden when constructing a `FormSet`.
* An error will now be thrown if a `FormSet` is constructed without a `Form`
  constructor.

## Breaking Changes

* Renamed `BaseFormSet` to `FormSet`, changing the top-level API.
* Replaced `util.formData()` with the
  [get-form-data](https://www.npmjs.com/package/get-form-data) module -
  `formData()` is no longer available as top-level API.

## Deprecations

* `formsetFactory` is deprecated in favour of using `FormSet.extend()` to create
  a FormSet with defaults for the same options and any custom methods required.

# 0.10.1 / 2015-01-08

* Version bump to fix tags -> keywords in package.json.

# 0.10.0 / 2015-01-04

## Breaking Changes

* Removed `formset.asUl()` - it never appeared properly due to the management
  Form.
* `formset.cleanedData()` to no longer includes `cleanedData` from incomplete
  extra forms.
* You can no longer change `cleanedData` by returning a value from a Form's
  `clean<Name>()` or `clean()` method.

## New Features

* Added `RenderForm`, `FormRow` and `RenderFormSet` components for default
  rendering.
  * The browser build requires the react-with-addons build of React in order to
    use `RenderForm`'s custom rendering support.
* Custom `clean()` and `clean<Field>()` validation methods can now be
  specified with the signature `(callback)` if they need to perform
  asynchronous validation.
  * The callback is an errback with the signature `(err, validationError)`.
  * `clean()` will not be called until other fields - or just fields it
    depends on, if configured - have been cleaned, synchronously or
    asynchronously.
* `form.validate()` and `formset.validate()` now take a callback argument,
  which is *required* if the Form or Formset has custom async validation
  configured - `validate()` can be used as normal for Form and Formsets
  without async validation.
  * The callback is an errback with the signature `(err, isValid, cleanedData)`.
* New API related to async validation:
  * `form.isAsync()` / `formset.isAsync()` - `true` if a form/formset has custom
    async validation.
  * `form.isPending()` / `formset.isPending()` - `true` if a form/formset has
    pending async validation.
  * `form.nonFieldPending()` / `formset.nonFieldPending()` - `true` if async
    validation of a form/formset's `clean(cb)` method is pending.
  * `boundField.isPending()` - `true` if a field has a pending async validation.
  * `isFormAsync(Form)` - `true` if a Form constructor's prototype has async
    validation methods.
* `<progress>` indicators are now displayed by default rendering methods:
  * Beside fields with pending async validation.
  * At the end of the form when cross-field validation is pending.
* Added more conditional CSS classes which will be used if defined in a Form:
  * `optionalCssClass` - used for optional fields
  * `pendingCssClass` - used for fields with pending async validation
* Added `boundField.helpTextTag()` to expose the mechanism for rendering raw
  HTML.
* Added `boundField.status()` to get a field's status as a string
  (pending/error/valid/default).
* Added `fromJSON()` factory functions to `ErrorList` and `ErrorObject`
  constructors and `fromJSON()` instance methods. These can be used to rehydrate
  an `ErrorObject` on the receiving end when `form.errors()` is transferred as
  JSON. This assumes the structure created by these objects' `toJSON()` methods.
* Added `form.setErrors()` to set an `ErrorObject` with errors from another
  source.
* An `ErrorObject` can now be passed as an `errors` option when creating a form
  instance, to redisplay a form with errors from another source. This prevents
  the form's own validation from running if the form has input `data` and
  `isValid()` or `errors()` are called during rendering.

## Deprecations

* Form rendering methods (`render()`, `asTable()`, `asDiv()` and `asUl()`) are
  deprecated in favour of using React components for rendering - `RenderForm`
  now provides default rendering.
* FormSet rendering methods (`render()`, `asTable()` and `asDiv()`) are
  deprecated in favour of using React components for rendering - `RenderFormSet`
  now provides default rendering.

## Changes

* Reverted a change from 0.9. Synchronous calls to `form/formset.validate()`
  will trigger a re-render, as it looks like `forceUpdate()` just enqueues a
  future re-render.
* `form.isComplete()` is now `false` if there is any pending async validation,
  even if all required fields currently have cleaned data.
* Changes to when event-based validation fires:
  * Validation now only fires if the field's data has changed since it was last
    validated. For `'auto'` validation, this prevents the default `onBlur`
    event from re-running the same validation as the default `onChange`.
  * Special cases for `onBlur`:
    * Pending validation is triggered immediately.
    * Validation is always triggered if the field is required and empty.
* Changed `form.addError()` to no longer add duplicate error messages for the
  same field. This can happen if `onChange` validation which runs repeatedly
  adds errors to a field other than that which triggered the validation, using
  `addError()`.
* The default `rows` attribute for a `Textarea` changed from 10 to 3.
* Error messages now make use of a `displayName` property if a Form has one.

## Removals

* The deprecated `onStateChange` argument to Form and FormSet constructors has
  been removed - use `onChange` instead.

# 0.9.1 / 2014-11-25

* The object given to `Form.extend()` is no longer mutated.

# 0.9.0 / 2014-11-11

## Breaking Changes

* Form mixins must now be specified as a `__mixins__` property rather than
  `__mixin__`.
* Changed `form.validate()` to no longer call back to re-render - this
  was convenient for single forms, but results in multiple updates when
  processing multiple forms. Re-rendering must now be triggered manually if
  onSubmit validation fails.
* `formset.cleanedData()` to no longer includes `cleanedData` from unmodified
  extra forms.

## New Features

* Passing `onChange` to a Form or FormSet now implies `validation: 'auto'`.
* Added `form.notEmpty()` to determine when required fields in an extra
  FormSet form become truly required.
* Added `formset.validate([form])` - equivalent to the Form version, use to
  set a formset's data from a `<form>` or to force full validation of its
  current input data.
* Added `formset.removeForm(index)` to remove extra forms from a FormSet. It
  will also call back to trigger a re-render when possible.
* Added `errorlist#first()` for conveniently getting just the first validation
  error message.
* Added `formset.addError()` for adding non-form errors outside of `clean()`.
* Changed `form.validate([form])` so the argument is optional - it can now be
  used to force full validation of a form with its current input data.
* Form `clean()` functions can now specify which fields they make use of for
  cross-field validation: `clean: ['field1', 'field2', function() {}]`. When
  provided, `clean()` will only be called during partial form updates (e.g.
  `onChange` handling) if one of the specified fields is affected.

## Deprecations

* The `onStateChange` argument to Form and FormSet constructors - use
  `onChange` instead. `onStateChange` will be removed in the next version.

## Changes

* `onChange` handlers are now always attached to widgets to update input data,
  regardless of controlled/validation config.
* `formset.addAnother()` will now call back to trigger a re-render if
  possible.
* Changed partial form validation to remove any validation errors if an extra
  FormSet form is unchanged from its initial values.

# 0.8.0 / 2014-10-29

* Updated to React 0.12 - using new `React.createElement()` and
  `React.createFactory()` API for `ReactElement` creation.

# 0.7.0 / 2014-07-27

* Updated to React 0.11 - there are no library dependencies on new 0.11 features,
  but unit tests depend on improvements made to its static HTML generation.

## New Features

* Added locale support.

# 0.6.0 / 2014-05-07

## Breaking Changes

* Renamed `form.isBound` to `form.isInitialRender`, which more accurately
  reflects usage of this property (it was always being used in Forms as
  `!isBound`)
* Changed `form.setData()` to no longer accept prefixed data by default.
  Added a `prefixed` option argument which controls this and a new
  `setFormData()` method which replicates the old behaviour. This makes
  `setData()` more user-friendly for use with controlled forms.

## New Features

* Added per-field validation as the user makes changes to the form, configured
  by passing a `validation` option when constructing a Form, Field or FormSet.
* Added toggling of creation of controlled React components, configured by
  passing a `controlled` option when constructing a Form or FormSet. When
  using  controlled components, form widgets reflect the state of `form.data`,
  so you can change what's displayed in the form by updating its data.
* Added calling of a`onStateChange()` callback when provided - passed as an
  option when  constructing a Form or FormSet - any time validation state may
  have changed as a result of updating user input from controlled components, or
  as a result of validation triggered by user interaction. This option becomes
  required when using `validation` or `controlled` options.
* Added support for partial updating (`form.updateData(partialData)`) and
  cleaning (`form.partialClean(fieldNames)`) of data.
* Added `form.reset(newInitial)` to reset a form back to its initial state,
  optionally providing new initial data in the process.
* Added a `validate` option to `form.setData()` to support setting incomplete
  data in a controlled form without triggering required field validation errors.
* Added `form.validate(<form>)` as a convenience method for retrieving and
  validating input data from a `<form>` - this removes a common step when
  hooking up full-form `onSubmit` validation.
* Added `form.isComplete()` to determine if all required fields have valid
  input data when validation is being performed interactively.
* Added `.errorMessage()` and `.errorMessages()` to BoundField as a
  convenience for accessing error message strings, instead of having to go
  through `.errors()` and use the ErrorList API.
* Added generation of a `validCssClass` in default rendering or when using
  `BoundField#cssClasses()` directly, if present on a form or its prototype.
* Added a top-level `validateAll` utility method equivalent to
  `form.validate()` but for multiple Forms and/or FormSets.
* Added `Widget.prototype.needsInitialValue` to allow Widgets to always
  receive the initial value of a field in addition to user input to be rendered.

## Changes

* Changed default widget attributes to always have a `key` property, to prevent
  fields being recreated when content around them changes (e.g. new validation
  errors being displayed), which makes them lose focus.
* Form and FormSet `cleanedData` is now always defined regardless of whether
  or not any validation has been performed yet - this makes it safe to check
  for data at any time, particularly in cross-field validation.
* Updated to React 0.10 - there are no library dependencies on new 0.10 features,
  but unit tests now make use of its enhanced support for rendering to static
  HTML.

## Bug Fixes

* FormSet sub-forms are no longer created from scratch every time they're
  accessed when running in the browser - this was throwing away form state,
  which effectively broke FormSets.

# 0.5.2 / 2014-04-03

* Fixed Select widget's defaultValue attribute.

# 0.5.1 / 2014-04-01

* Fixed browserification when used as a Node module.

# 0.5.0 / 2014-03-11

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
    data, so doing things like bumping `formset.extra` to show another form
    works regardless of whether or not the formset is bound.
  * Added a `setData()` method to bind new `formset.data` and re-trigger
    validation.

# 0.5.0-rc1 / 2014-03-08

## Breaking Changes

* Now depends on React 0.9.0.
* Newforms components now render by creating `React.DOM` components instead of
  relying on context-specific output from `DOMBuilder.createElement()`.
* Components which can be rendered no longer have `toString()` methods --
  creation of final output is now handled by calling `React.renderComponent`
  or `React.renderComponentToString` on a React component which includes
  rendered output of a newforms Form - this (temporarily) breaks usage of
  newforms in String-based templating libraries such as Jade.
* HTML output has changed - this will break any tests which depended on the
  specifics of how DOMBuilder generated HTML.

  * React has no equivalent of a virtual DocumentFragment as yet - there are new
    wrapper elements in various places.
  * React wraps free-standing text nodes with `<span>`.
  * Boolean attributes no longer have a value duplicating the attribute name.

* HTML attribute names must now match what React expects - no more
  `'maxlength'` or quoted `'class'` and `'for'` attributes.
* A String can no longer be used to specify multiple selected items in a
  `SelectMultiple` - this used to be an accident based on duck typing of
  index access to both items in an Array and characters in a String. If a
  non-Array is given as the selected value, it will now be wtapped in an Array.
* `CheckboxInput` no longer silenty swallows any errors thrown by the provided
  `checkTest` function.
* `_hasChanged` has moved from Widgets to Fields.
* The default error message for an invalid email address has changed.
* `ValidationError` API changed - `messages` is now a function rather than
  an array of Strings.
* `ErrorList` API changed - a `messages()` method must now be called to
  get final error message strings out of it.
* Replaced `asP()` with `asDiv()`, as invalid markup nesting breaks React
  when browsers perform error correction on the DOM.
* Renamed `Field.extraCLasses` option to `Field.cssClass`.
* Renamed `asUL()` methods to `asUl()`.
* Order of mixing in fields from when multiple Forms are passed to `__mixin__`
  has changed from right-to-left to left-to-right.
* Only one custom field cleaning functon will be called: `clean<FieldName>`
  or `clean_<fieldName>` in that order. The ability to define both and have
  both run was unintentional.

## New Features

* A `type` attribute can now be passed to Widgets to take advantage of new
  HTML widget types.

  * Added `EmailInput` - now the default widget for `EmailField`
  * Added `URLInput` - now the default widget for `URLField`
  * Added `NumberInput` - now the default widget for `IntegerField`,
    `FloatField` and `DecimalField`

    * `IntegerField`, `FloatField` and `DecimalField` now set HTML5 `max`,
      `min` and `steo` attributes on their widget, as applicable.

* `formData` now supports new input types: 'email', 'url', 'number' and 'file'
* If a field throws a `ValidationError` while checking if it's changed, the
  assumption is now that it's changed.
* `cleanedData` is no longer deleted when a form is invalid.
* `CheckboxSelectMultiple` now uses a similar renderer to `RadioSelect` --
  individual checkbox subwidgets can now be accessed.
* `id` attributes are now added to lists of radio and checkbox inputs.
* Radio and checkbox input lists can now display with nested choices
* `SlugField` and `URLField` now support whitespace stripping.
* Changed data checking now supports calling initial values which are functions.
* Added `minNum`, `validateMax` and `validateMin` to `formsetFactory` and
  `BaseFormSet`.
* Added a hard limit to the maximum number of forms in a `FormSet` - `maxNum`
  + 1000.
* FormSet deletion management data is no longer removd from `cleanedData`.
* `MultiWidget` now sets `needsMultipartForm` based on its child widgets.
* Added `requireAllfields` option to `MultiValueField` - this allows for
  optional subfields when `false` and a new `'incomplete'` validation error
  being thrown when required field are empty.
* Added an `addError()` method to forms which can be used to set field or
  non-field errors and automatically removes fields from `cleanedData`,
* `cleanedData` doesn't need to be returned from `Form.clean()` any more,
  but if it is, it will still be set as `form.cleanedData`.
* Made `emptyValues` a property of `Field.prototype` so it can be overridden
  by subclasses if necessary.
* `TypedChoiceField#coerce` can now return an arbitrary value.
* `labelSuffix` can now be customised when calling `BoundField#labelTag`.
* [validators](https://github.com/insin/validators) is now exposed as `forms.validators`.
* Added `Field#isEmptyValue` and `Field#emptyValueArray` to ensure empty
  arrays are detected as empty values by default.
* Added the ability to avoid inheriting a field from an extended or mixed-in
  Form by shadowing its field name with a non-field property.
* Added `asData()` and `toJSON()` to `ErrorObject` and `ErrorList`.
* Custom `clean<FieldName>()` methods no longer have to return a cleaned
  value, but if they do, it will be inserted back into `cleanedData`.
* `ClearableFileInput` now uses overridable functions for templating, making
  it easier to customise.
* `FileField` now validates that a file is selected when `required` is
  `true` in browsers.
* Default rendering methods now allow arbitrary HTML in `helpText` if
  `{__html: ''}` is passed instead of a string.
* Added `form.setData()` to bind new data to a form and re-trigger cleaning.
* Added a `custom` argument when constructing Fields, to store any metadata
  you need for later.
* `ImageField` now adds an `accept="image/*"` attribute to its widget.
* Added `form.util.makeChoices` helper for creating [value, label] pairs from
  a list of objects.
* Flat lists of `choices` can now be passed into Fields and Widgets which take
  choices.

## Bug Fixes

* `'0'` should be treated as true by `CheckboxInput`.
* `CheckboxInput._hasChanged` now handles an initial `'false'` String.
* `FloatField` and `DecimalField` now accept '1.' as a valid input.
* Fixed form constructors used as __mixin__ mixins  having their own
  `baseFields` overwritten and the prototype properties intended for the new
  form applied to them.
* Fixed `Boundfield#subWidgets` not passing `id` or `autoId` along, so
  label htmlFors and input ids weren't getting generated.

# 0.4.2 / 2012-07-15

* Automatically-added deletion fields are no longer included in the list of
  cleanedData for a FormSet [[whardeman](https://github.com/whardeman)]
* Data for forms marked for deletion is no longer present in a FormSet's
  cleanedData [[whardeman](https://github.com/whardeman)]
* Fixed `FloatField.prototype._hasChanged()`, which wasn't comparing against
  the field's initial value
* Added `managementFormCssClass` to BaseFormSet's kwargs, to provide a CSS
  class for the row generated to hold the management form's hidden fields
* Added use of `hiddenFieldRowCssClass` to provide a CSS class for Form rows
  which were generated solely to wrap empty fields to avoid generating invalid
  HTML
* Added use of `rowCssClass` to provide a class for each row in a Form
  [[whardeman](https://github.com/whardeman)]

# 0.4.1 / 2012-06-29

* Updated to isomorph 0.2
* Added `extraClasses` to Field's kwargs [[whardeman](https://github.com/whardeman)]

# 0.4.0 / 2012-03-08

* Extracted validators into a [validators](https://github.com/insin/validators)
  project and added it as a dependency - as a result, `callValidator()`,
  `isCallable()` and IPv6 functions now
  live under `forms.validators`
* Extracted URL utility functions out into [ispmorph](https://github.com/insin/isomorph)
* Fixed #11: a validator's error message should take precedence unless the field
  it's validating has defined a custom error message using the same error code
* Changed `BoundField.protoype.labelTag()` to also include the form's
  `labelSuffix`

.. _`validators`: https://github.com/insin/validators

# 0.3.0 / 2012-02-10

* Added GenericIPAddressField
* Renamed `forms.validateIPV4Address` to `forms.validateIPv4Address` for
  consistency with new IPv6 validation
* Added SubWidgets to allow you to iterate over invdidiual elements which make
  up a widget - currently only used by RadioSelect
* Changed MultiValueField to run any validators it was given
* Changed URL and email address validators to handle IDNA domains
* Changed CheckboxInput to correctly handle `0` as a value
* Added `BaseFormSet.prototype.hasChanged()`
* Changed Select widget to only allow for one selected option with the same
  value

# 0.2.0 / 2012-02-05

* Backwards-incompatible change to `forms.Form` - this used to be a factory
  function, but is now a constructor created with [Concur](https://github.com/insin/concur)
  which, when extended from, will move given Field properties into the new
  constructor's `baseFields` prototype  property
* Backwards-incompatible change: renamed `forms.FormSet` to
  `forms.formsetFactory` so it's named like the factory function it is, rather
  than like a constructor

# 0.1.1 / 2012-02-01

* Fixed browser build - IE7/8 object.hasOwn incompatibility fixed in isomorph.

# 0.1.0 / 2012-01-31

* Changed code structure - now written as regular Node.js modules
* Changed API for placeholder strings, which are now `'{placeholder}'` style
  instead of `'%(placeholder)s'`
* Changed `forms.util` API, as most utility methods have been split out into
  [ispmorph](https://github.com/insin/isomorph), which is now a dependency
* Added extension sugar via [Concur](https://github.com/insin/concur) - all
  newforms constructors now have an `extend()` function

.. _`validators`: https://github.com/insin/validators
