'use strict';

var Concur = require('Concur')
var is = require('isomorph/is')
var object = require('isomorph/object')
var React = require('react')
var validators = require('validators')

var env = require('./env')
var fields = require('./fields')
var forms = require('./forms')
var util = require('./util')
var widgets = require('./widgets')
var ErrorList = require('./ErrorList')

var BooleanField = fields.BooleanField
var HiddenInput = widgets.HiddenInput
var IntegerField = fields.IntegerField
var ValidationError = validators.ValidationError

function noop() {}

// Name associated with clean() validation
var CLEAN_VALIDATION = 'clean'

// Special field names
var DELETION_FIELD_NAME = 'DELETE'
var INITIAL_FORM_COUNT = 'INITIAL_FORMS'
var MAX_NUM_FORM_COUNT = 'MAX_NUM_FORMS'
var MIN_NUM_FORM_COUNT = 'MIN_NUM_FORMS'
var ORDERING_FIELD_NAME = 'ORDER'
var TOTAL_FORM_COUNT = 'TOTAL_FORMS'

// Default minimum number of forms in a formset
var DEFAULT_MIN_NUM = 0

// Default maximum number of forms in a formset, to prevent memory exhaustion
var DEFAULT_MAX_NUM = 1000

/**
 * ManagementForm is used to keep track of how many form instances are displayed
 * on the page. If adding new forms via JavaScript, you should increment the
 * count field of this form as well.
 * @constructor
 */
var ManagementForm = (function() {
  var fields = {}
  fields[TOTAL_FORM_COUNT] = IntegerField({widget: HiddenInput})
  fields[INITIAL_FORM_COUNT] = IntegerField({widget: HiddenInput})
  // MIN_NUM_FORM_COUNT and MAX_NUM_FORM_COUNT are output with the rest of
  // the management form, but only for the convenience of client-side
  // code. The POST value of them returned from the client is not checked.
  fields[MIN_NUM_FORM_COUNT] = IntegerField({required: false, widget: HiddenInput})
  fields[MAX_NUM_FORM_COUNT] = IntegerField({required: false, widget: HiddenInput})
  return forms.Form.extend(fields)
})()

/**
 * A collection of instances of the same Form.
 * @constructor
 * @param {Object=} kwargs
 */
var FormSet = Concur.extend({
  constructor: function FormSet(kwargs) {
    // TODO Perform PropType checks on kwargs in development mode
    kwargs = object.extend({
      // Formset options
      form: this.form || null, extra: is.Number(this.extra) ? this.extra : 1,
      canOrder: this.canOrder || false, canDelete: this.canDelete || false,
      maxNum: is.Number(this.maxNum) ? this.maxNum : DEFAULT_MAX_NUM,
      validateMax: this.validateMax || false,
      minNum: is.Number(this.minNum) ? this.minNum : DEFAULT_MIN_NUM,
      validateMin: this.validateMin || false,
      managementFormCssClass: this.magagementFormCssClass || null,
      // Form options
      data: null, files: null, autoId: 'id_{name}', prefix: null,
      initial: null, errorConstructor: ErrorList, validation: null,
      controlled: false, onChange: null
    }, kwargs)

    if (!is.Function(kwargs.form)) {
      throw new Error(
        'A FormSet must be given a Form constructor to use, either via its ' +
        'constructor\'s `form` option or via its prototype, passing a `form` ' +
        'property to `FormSet.extend()`.'
      )
    }

    this.form = kwargs.form
    this.extra = kwargs.extra + kwargs.minNum
    this.canOrder = kwargs.canOrder
    this.canDelete = kwargs.canDelete
    this.maxNum = kwargs.maxNum
    this.validateMax = kwargs.validateMax
    this.minNum = kwargs.minNum
    this.validateMin = kwargs.validateMin
    // Hard limit on forms instantiated, to prevent memory-exhaustion attacks
    // limit is simply maxNum + DEFAULT_MAX_NUM (which is 2 * DEFAULT_MAX_NUM
    // if maxNum is not provided in the first place)
    this.absoluteMax = kwargs.maxNum + DEFAULT_MAX_NUM

    this.isInitialRender = (kwargs.data === null && kwargs.files === null)
    this.prefix = kwargs.prefix || this.getDefaultPrefix()
    this.autoId = kwargs.autoId
    this.data = kwargs.data || {}
    this.files = kwargs.files || {}
    this.initial = kwargs.initial
    this.errorConstructor = kwargs.errorConstructor
    this.managementFormCssClass = kwargs.managementFormCssClass
    this.validation = kwargs.validation
    this.controlled = kwargs.controlled
    this.onChange = kwargs.onChange

    this._forms = null
    this._errors = null
    this._nonFormErrors = null

    // Lookup for pending validation
    this._pendingValidation = {}
    // Cancellable callbacks for pending async validation
    this._pendingAsyncValidation = {}
    // Lookup for pending validation which formset cleaning depends on
    this._cleanFormsetAfter = {}
    // Callback to be run the next time validation finishes
    this._onValidate = null
  }
})

/**
 * Tries to construct a display name for the formset for display in messages.
 * @return {string}
 */
FormSet.prototype._formsetName = function() {
  var name = this.displayName || this.constructor.name
  return (name ? "'" + name + "'" : 'FormSet')
}

/**
 * Calls the onChange function if it's been provided. This method will be called
 * every time the formset makes a change to its state which requires redisplay.
 */
FormSet.prototype._stateChanged = function() {
  if (typeof this.onChange == 'function') {
    this.onChange()
  }
}

// ============================================================== Validation ===

/**
 * Forces the formset to revalidate from scratch. If a <form> is given, data
 * from it will be set on this formset's forms first. Otherwise, validation will
 * be done with current input data.
 * @param {(ReactElement|HTMLFormElement)=} form the <form> containing this
 *   formset's rendered widgets - this can be a React <form> component or a real
 *   <form> DOM node.
 * @param {function(err, isValid, cleanedData)=} cb callback for asynchronous
 *   validation.
 * @return {boolean|undefined} true if the form only has synchronous validation
 *   and is valid.
 * @throws if the formset or its form has asynchronous validation and a callback
 *   is not provided.
 */
FormSet.prototype.validate = function(form, cb) {
  this._cancelPendingOperations()
  if (is.Function(form)) {
    cb = form
    form = null
  }
  if (form) {
    if (typeof form.getDOMNode == 'function') {
      form = form.getDOMNode()
    }
    this.setData(util.formData(form), {
      validate: false
    , _triggerStateChange: false
    })
  }
  return (this.isAsync() ? this._validateAsync(cb) : this._validateSync())
}

FormSet.prototype._validateAsync = function(cb) {
  if (!is.Function(cb)) {
    throw new Error(
      'You must provide a callback to validate() when a formset or its form ' +
      'has asynchronous validation.'
    )
  }
  if (this.isInitialRender) {
    this.isInitialRender = false
  }
  this._onValidate = cb
  this.fullClean()
  // Update state to display async progress indicators
  this._stateChanged()
}

FormSet.prototype._validateSync = function() {
  if (this.isInitialRender) {
    this.isInitialRender = false
  }
  this.fullClean()
  // Display changes to valid/invalid state
  this._stateChanged()
  return this.isValid()
}

/**
 * Cleans all of this.data and populates this._errors and this._nonFormErrors.
 */
FormSet.prototype.fullClean = function() {
  this._errors = []
  this._nonFormErrors = new this.errorConstructor()

  if (this.isInitialRender) {
    return // Stop further processing
  }

  this._cleanForms()
}

/**
 * Validates and cleans every form in the formset.
 */
FormSet.prototype._cleanForms = function() {
  var forms = this.forms()
  var formIndexLookup = object.lookup(Object.keys(forms))
  object.extend(this._pendingValidation, formIndexLookup)
  object.extend(this._cleanFormsetAfter, formIndexLookup)
  for (var i = 0, l = forms.length; i < l; i++) {
    this._cleanForm(i, forms[i])
  }
  // Make sure clean gets called even if the formset is empty
  if (forms.length === 0) {
    this._cleanFormsetAfter.empty = true
    this._formCleaned('empty', null)
  }
}

/**
 * Validates and cleans the form at the given index.
 * @param {number} index the index of the form in the formset.
 * @param {Form} form
 */
FormSet.prototype._cleanForm = function(index, form) {
  if (!form.isAsync()) {
    form.validate()
    this._errors[index] = form.errors()
    this._formCleaned(index, null)
    return
  }

  // If the form is async and there's one pending, prevent its callback from
  // doing anything.
  if (typeof this._pendingAsyncValidation[index] != 'undefined') {
    object.pop(this._pendingAsyncValidation, index).cancel()
  }
  // Set up callback for async processing
  var callback = function(err) {
    if (!err) {
      this._errors[index] = form.errors()
    }
    this._formCleaned(index, err)
    this._stateChanged()
  }.bind(this)
  callback.onCancel = function() {
    form._cancelPendingOperations()
  }
  this._pendingAsyncValidation[index] = util.cancellable(callback)
  form.validate(callback)
}

/**
 * Callback for completion of form cleaning. Triggers formset cleaning or
 * signals the end of validation, as necessary.
 * @param {number|string} name the name associated with the cleaning that's completed.
 * @param {Error=} err an error caught while cleaning.
 */
FormSet.prototype._formCleaned = function(name, err) {
  delete this._pendingValidation[name]
  if (this._pendingAsyncValidation[name]) {
    delete this._pendingAsyncValidation[name]
  }

  if (err) {
    if ("production" !== process.env.NODE_ENV) {
      console.error('Error cleaning formset[' + name + ']:' + err.message)
    }
    // Stop tracking validation progress on error, and don't call clean()
    this._pendingValidation = {}
    this._cleanFormsetAfter = {}
    this._finishedValidation(err)
    return
  }

  // Run clean() if this this was the last field it was waiting for
  if (this._cleanFormsetAfter[name]) {
    delete this._cleanFormsetAfter[name]
    if (is.Empty(this._cleanFormsetAfter)) {
      this._cleanFormset()
      return
    }
  }

  // Signal the end of validation if this was the last field we were waiting for
  if (name == CLEAN_VALIDATION) {
    this._finishedValidation(null)
  }
}

/**
 * Hook for doing any extra formset-wide cleaning after Form.clean() has been
 * called on every form. Any ValidationError raised by this method will not be
 * associated with a particular form; it will be accessible via
 * formset.nonFormErrors()
 */
FormSet.prototype.clean = noop

/**
 * Validates the number of forms and calls the clean() hook.
 */
FormSet.prototype._cleanFormset = function() {
  var async = false
  var error = null
  try {
    var totalFormCount = this.totalFormCount()
    var deletedFormCount = this.deletedForms().length
    if ((this.validateMax && totalFormCount - deletedFormCount > this.maxNum) ||
        (!env.browser && this.managementForm().cleanedData[TOTAL_FORM_COUNT] > this.absoluteMax)) {
      throw ValidationError('Please submit ' + this.maxNum + ' or fewer forms.',
                            {code: 'tooManyForms'})
    }
    if (this.validateMin && totalFormCount - deletedFormCount < this.minNum) {
      throw ValidationError('Please submit ' + this.minNum + ' or more forms.',
                            {code: 'tooFewForms'})
    }
    // Give this.clean() a chance to do cross-form validation.
    if (this.clean !== noop) {
      async = this._runCustomClean(CLEAN_VALIDATION, this.clean)
    }
  }
  catch (e) {
    if (e instanceof ValidationError) {
      this._nonFormErrors = new this.errorConstructor(e.messages())
    }
    else {
      error = e
    }
  }

  if (!async) {
    this._formCleaned(CLEAN_VALIDATION, error)
  }
}

/**
 * Calls a custom cleaning method, expecting synchronous or asynchronous
 * behaviour, depending on its arity.
 * @param {string} name a name to associate with the cleaning method.
 * @param {function} customClean
 * @return {boolean} true if cleaning is running asynchronously, false if it just
 *   ran synchronously.
 */
FormSet.prototype._runCustomClean = function(name, customClean) {
  // Check arity to see if we have a callback in the function signature
  if (customClean.length === 0) {
    // Synchronous processing only expected
    customClean.call(this)
    return false
  }

  // If custom validation is async and there's one pending, prevent its
  // callback from doing anything.
  if (typeof this._pendingAsyncValidation[name] != 'undefined') {
    object.pop(this._pendingAsyncValidation, name).cancel()
  }
  // Set up callback for async processing - arguments for addError()
  // should be passed via the callback as calling it directly prevents us
  // from completely ignoring the callback if validation fires again.
  var callback = function(err, validationError) {
    if (typeof validationError != 'undefined') {
      this.addError(validationError)
    }
    this._formCleaned(name, err)
    this._stateChanged()
  }.bind(this)

  // An explicit return value of false indicates that async processing is
  // being skipped (e.g. because sync checks in the method failed first)
  var returnValue = customClean.call(this, callback)
  if (returnValue !== false) {
    // Async processing is happening! Make the callback cancellable and
    // hook up any custom onCancel handling provided.
    if (returnValue && typeof returnValue.onCancel == 'function') {
      callback.onCancel = returnValue.onCancel
    }
    this._pendingAsyncValidation[name] = util.cancellable(callback)
    return true
  }
}

FormSet.prototype._finishedValidation = function(err) {
  if (!this.isAsync()) {
    if (err) {
      throw err
    }
    // Synchronous formset validation results will be returned via the original
    // call which triggered validation.
    return
  }
  if (is.Function(this._onValidate)) {
    var callback = this._onValidate
    this._onValidate = null
    if (err) {
      return callback(err)
    }
    var isValid = this.isValid()
    callback(null, isValid, isValid ? this.cleanedData() : null)
  }
}

/**
 * Cancels any pending async validations.
 */
FormSet.prototype._cancelPendingOperations = function() {
  Object.keys(this._pendingAsyncValidation).forEach(function(field) {
    object.pop(this._pendingAsyncValidation, field).cancel()
  }.bind(this))
}

/**
 * Returns a list of form.cleanedData objects for every form in this.forms().
 */
FormSet.prototype.cleanedData = function() {
  var forms = this.initialForms()
  // Don't include empty or incomplete extra forms
  forms.push.apply(forms, this.extraForms().filter(function(form) {
    return form.hasChanged() && form.isComplete()
  }))
  return forms.map(function(form) { return form.cleanedData })
}


// ============================================================== Mutability ===

/**
 * Sets the formset's entire input data, also triggering validation by default.
 * @param {Object.<string,*>} data new input data for forms, which must be
 *   prefixed for uniqueness.
 * @param {Object.<string,boolean>} kwargs data setting options.
 * @return {boolean} if date setting options indicate the new data should be
 *   validated, true if the new data is valid.
 */
FormSet.prototype.setData = function(data, kwargs) {
  kwargs = object.extend({validate: true, _triggerStateChange: true}, kwargs)

  this.data = data
  var formDataSettingOptions = {
    prefixed: true, validate: kwargs.validate, _triggerStateChange: false
  }
  this.forms().forEach(function(form) {
    form.setData(data, formDataSettingOptions)
  })

  if (this.isInitialRender) {
    this.isInitialRender = false
  }
  if (kwargs.validate) {
    this._errors = null
    // This call ultimately triggers a fullClean() because _errors is null
    var isValid = this.isValid()
  }
  else {
    // Prevent validation being triggered if errors() is accessed during render
    this._errors = []
    this._nonFormErrors = new this.errorConstructor()
  }

  if (kwargs._triggerStateChange) {
    this._stateChanged()
  }

  if (kwargs.validate) {
    return isValid
  }
}

/**
 * Alias to keep the FormSet data setting API the same as Form's.
 */
FormSet.prototype.setFormData = FormSet.prototype.setData

// =================================================================== Forms ===

/**
 * Returns the ManagementForm instance for this FormSet.
 * @browser the form is unbound and uses initial data from this FormSet.
 * @server the form is bound to submitted data.
 */
FormSet.prototype.managementForm = function() {
  var form
  if (!env.browser && !this.isInitialRender) {
    form = new ManagementForm({data: this.data, autoId: this.autoId,
                               prefix: this.prefix})
    if (!form.isValid()) {
      throw ValidationError('ManagementForm data is missing or has been tampered with',
                            {code: 'missing_management_form'})
    }
  }
  else {
    var initial = {}
    initial[TOTAL_FORM_COUNT] = this.totalFormCount()
    initial[INITIAL_FORM_COUNT] = this.initialFormCount()
    initial[MIN_NUM_FORM_COUNT] = this.minNum
    initial[MAX_NUM_FORM_COUNT] = this.maxNum
    form = new ManagementForm({autoId: this.autoId,
                               prefix: this.prefix,
                               initial: initial})
  }
  if (this.managementFormCssClass !== null) {
    form.hiddenFieldRowCssClass = this.managementFormCssClass
  }
  return form
}

/**
 * Determines the number of form instances this formset contains, based on
 * either submitted management data or initial configuration, as appropriate.
 */
FormSet.prototype.totalFormCount = function() {
  if (!env.browser && !this.isInitialRender) {
    // Return absoluteMax if it is lower than the actual total form count in
    // the data; this is DoS protection to prevent clients  from forcing the
    // server to instantiate arbitrary numbers of forms.
    return Math.min(this.managementForm().cleanedData[TOTAL_FORM_COUNT], this.absoluteMax)
  }
  else {
    var initialForms = this.initialFormCount()
    var totalForms = this.initialFormCount() + this.extra
    // Allow all existing related objects/inlines to be displayed, but don't
    // allow extra beyond max_num.
    if (this.maxNum !== null &&
        initialForms > this.maxNum &&
        this.maxNum >= 0) {
      totalForms = initialForms
    }
    if (this.maxNum !== null &&
        totalForms > this.maxNum &&
        this.maxNum >= 0) {
      totalForms = this.maxNum
    }
    return totalForms
  }
}

/**
 * Determines the number of initial form instances this formset contains, based
 * on either submitted management data or initial configuration, as appropriate.
 */
FormSet.prototype.initialFormCount = function() {
  if (!env.browser && !this.isInitialRender) {
    return this.managementForm().cleanedData[INITIAL_FORM_COUNT]
  }
  else {
    // Use the length of the initial data if it's there, 0 otherwise.
    return (this.initial !== null && this.initial.length > 0
            ? this.initial.length
            : 0)
  }
}

/**
 * Instantiates forms when first accessed.
 */
FormSet.prototype.forms = function() {
  if (this._forms !== null) { return this._forms }
  var forms = []
  var totalFormCount = this.totalFormCount()
  for (var i = 0; i < totalFormCount; i++) {
    forms.push(this._constructForm(i))
  }
  this._forms = forms
  return forms
}

/**
 * Adds another form and increments extra.
 */
FormSet.prototype.addAnother = function() {
  var currentFormCount = this.totalFormCount()
  this.extra++
  if (this._forms !== null) {
    this._forms[currentFormCount] = this._constructForm(currentFormCount)
  }
 this._stateChanged()
}

// Assumption - the UI will only let the user remove extra forms
FormSet.prototype.removeForm = function(index) {
  if (this.extra === 0) {
    throw new Error("Can't remove a form when there are no extra forms")
  }
  this.extra--
  if (this._forms !== null) {
    this._forms.splice(index, 1)
  }
  if (this._errors !== null) {
    this._errors.splice(index, 1)
  }
 this._stateChanged()
}

/**
 * Instantiates and returns the ith form instance in the formset.
 */
FormSet.prototype._constructForm = function(i) {
  var defaults = {
    autoId: this.autoId
  , prefix: this.addPrefix(i)
  , errorConstructor: this.errorConstructor
  , validation: this.validation
  , controlled: this.controlled
  , onChange: this.onChange
  }
  if (!this.isInitialRender) {
    defaults.data = this.data
    defaults.files = this.files
  }
  if (this.initial !== null && this.initial.length > 0) {
    if (typeof this.initial[i] != 'undefined') {
      defaults.initial = this.initial[i]
    }
  }
  // Allow extra forms to be empty
  if (i >= this.initialFormCount()) {
    defaults.emptyPermitted = true
  }

  var form = new this.form(defaults)
  this.addFields(form, i)
  return form
}

/**
 * Returns a list of all the initial forms in this formset.
 */
FormSet.prototype.initialForms = function() {
  return this.forms().slice(0, this.initialFormCount())
}

/**
 * Returns a list of all the extra forms in this formset.
 */
FormSet.prototype.extraForms = function() {
  return this.forms().slice(this.initialFormCount())
}

FormSet.prototype.emptyForm = function() {
  var kwargs = {
    autoId: this.autoId,
    prefix: this.addPrefix('__prefix__'),
    emptyPermitted: true
  }
  var form = new this.form(kwargs)
  this.addFields(form, null)
  return form
}

/**
 * Returns a list of forms that have been marked for deletion.
 */
FormSet.prototype.deletedForms = function() {
  if (!this.isValid() || !this.canDelete) { return [] }

  var forms = this.forms()

  // Construct _deletedFormIndexes, which is just a list of form indexes
  // that have had their deletion widget set to true.
  if (typeof this._deletedFormIndexes == 'undefined') {
    this._deletedFormIndexes = []
    for (var i = 0, l = forms.length; i < l; i++) {
      var form = forms[i]
      // If this is an extra form and hasn't changed, ignore it
      if (i >= this.initialFormCount() && !form.hasChanged()) {
        continue
      }
      if (this._shouldDeleteForm(form)) {
        this._deletedFormIndexes.push(i)
      }
    }
  }

  return this._deletedFormIndexes.map(function(i) { return forms[i] })
}

/**
 * Returns a list of forms in the order specified by the incoming data.
 * Throws an Error if ordering is not allowed.
 */
FormSet.prototype.orderedForms = function() {
  if (!this.isValid() || !this.canOrder) {
    throw new Error(this.constructor.name +
                    " object has no attribute 'orderedForms'")
  }

  var forms = this.forms()

  // Construct _ordering, which is a list of [form index, orderFieldValue]
  // pairs. After constructing this list, we'll sort it by orderFieldValue
  // so we have a way to get to the form indexes in the order specified by
  // the form data.
  if (typeof this._ordering == 'undefined') {
    this._ordering = []
    for (var i = 0, l = forms.length; i < l; i++) {
      var form = forms[i]
      // If this is an extra form and hasn't changed, ignore it
      if (i >= this.initialFormCount() && !form.hasChanged()) {
        continue
      }
      // Don't add data marked for deletion
      if (this.canDelete && this._shouldDeleteForm(form)) {
        continue
      }
      this._ordering.push([i, form.cleanedData[ORDERING_FIELD_NAME]])
    }

    // Null should be sorted below anything else. Allowing null as a
    // comparison value makes it so we can leave ordering fields blank.
    this._ordering.sort(function(x, y) {
      if (x[1] === null && y[1] === null) {
        // Sort by form index if both order field values are null
        return x[0] - y[0]
      }
      if (x[1] === null) {
        return 1
      }
      if (y[1] === null) {
        return -1
      }
      return x[1] - y[1]
    })
  }

  return this._ordering.map(function(ordering) { return forms[ordering[0]]})
}

/**
 * A hook for adding extra fields on to each form instance.
 * @param {Form} form the form fields are to be added to.
 * @param {Number} index the index of the given form in the formset.
 */
FormSet.prototype.addFields = function(form, index) {
  if (this.canOrder) {
    // Only pre-fill the ordering field for initial forms
    if (index != null && index < this.initialFormCount()) {
      form.fields[ORDERING_FIELD_NAME] =
          IntegerField({label: 'Order', initial: index + 1,
                        required: false})
    }
    else {
      form.fields[ORDERING_FIELD_NAME] =
          IntegerField({label: 'Order', required: false})
    }
  }
  if (this.canDelete) {
    form.fields[DELETION_FIELD_NAME] =
        BooleanField({label: 'Delete', required: false})
  }
}

/**
 * Returns whether or not the form was marked for deletion.
 */
FormSet.prototype._shouldDeleteForm = function(form) {
  return object.get(form.cleanedData, DELETION_FIELD_NAME, false)
}

// ================================================================== Errors ===

FormSet.prototype.addError = function(error) {
  if (!(error instanceof ValidationError)) {
    // Normalise to ValidationError and let its constructor do the hard work of
    // making sense of the input.
    error = ValidationError(error)
  }

  this._nonFormErrors.extend(error.errorList)
}

/**
 * Returns a list of form.errors for every form in this.forms.
 */
FormSet.prototype.errors = function() {
  if (this._errors === null) {
    this.fullClean()
  }
  return this._errors
}

/**
 * Returns an ErrorList of errors that aren't associated with a particular
 * form -- i.e., from formset.clean(). Returns an empty ErrorList if there are
 * none.
 */
FormSet.prototype.nonFormErrors = function() {
  if (this._nonFormErrors === null) {
    this.fullClean()
  }
  return this._nonFormErrors
}

/**
 * Returns the number of errors across all forms in the formset.
 */
FormSet.prototype.totalErrorCount = function() {
  return (this.nonFormErrors().length() +
          this.errors().reduce(function(sum, formErrors) {
            return sum + formErrors.length()
          }, 0))
}

// ================================================================== Status ===

/**
 * Returns true if any form differs from initial.
 */
FormSet.prototype.hasChanged = function() {
  var forms = this.forms()
  for (var i = 0, l = forms.length; i < l; i++) {
    if (forms[i].hasChanged()) {
      return true
    }
  }
  return false
}

/**
 * @return {boolean} true if the formset needs a callback argument for final
 *   validation.
 */
FormSet.prototype.isAsync = function() {
  return (this.clean.length == 1 || forms.isFormAsync(this.form))
}

/**
 * @return {boolean} true if the formset needs to be multipart-encoded, i.e. it
 * has a FileInput. Otherwise, false.
 */
FormSet.prototype.isMultipart = function() {
  return (this.forms().length > 0 && this.forms()[0].isMultipart())
}

/**
 * @return {boolean} true if the formset is waiting for async validation to
 *   complete.
 */
FormSet.prototype.isPending = function() {
  return !is.Empty(this._pendingAsyncValidation)
}

/**
 * Returns true if every form in this.forms() is valid and there are no non-form
 * errors.
 */
FormSet.prototype.isValid = function() {
  if (this.isInitialRender) {
    return false
  }
  // Triggers a full clean
  var errors = this.errors()
  var forms = this.forms()
  for (var i = 0, l = errors.length; i < l ; i++) {
    if (errors[i].isPopulated()) {
      if (this.canDelete && this._shouldDeleteForm(forms[i])) {
        // This form is going to be deleted so any of its errors should
        // not cause the entire formset to be invalid.
        continue
      }
      return false
    }
  }
  return !this.nonFormErrors().isPopulated()
}

/**
 * @return {boolean} true if the formset is waiting for async validation of its
 *   clean() method to complete.
 */
FormSet.prototype.nonFormPending = function() {
  return typeof this._pendingAsyncValidation[CLEAN_VALIDATION] != 'undefined'
}

// ================================================================ Prefixes ===

/**
 * Returns the formset prefix with the form index appended.
 * @param {Number} index the index of a form in the formset.
 */
FormSet.prototype.addPrefix = function(index) {
  return this.prefix + '-' + index
}

FormSet.prototype.getDefaultPrefix = function() {
  return 'form'
}

// ======================================================= Default Rendering ===

if ('production' !== process.env.NODE_ENV) {
  var warnedRenderDeprecated = false

  var _renderDeprecated = function() {
    if ("production" !== process.env.NODE_ENV) {
      if (warnedRenderDeprecated) { return }
      util.warning(
        'FormSet rendering methods (render(), asTable() and asDiv()) ' +
        'are deprecated and will be removed in version 0.11 - use the ' +
        'RenderFormSet React component for default rendering'
      )
      warnedRenderDeprecated = true
    }
  }
}

/**
 * Default render method, which just calls asTable().
 * @return {Array.<ReactElement>}
 */
FormSet.prototype.render = function() {
  return this.asTable()
}

/**
 * Renders the formset as <tr>s - excluding the <table>.
 * @return {Array.<ReactElement>}
 */
FormSet.prototype.asTable = function() {
  if ("production" !== process.env.NODE_ENV) {
    _renderDeprecated()
  }
  // XXX: there is no semantic division between forms here, there probably
  // should be. It might make sense to render each form as a table row with
  // each field as a td.
  var rows = this.managementForm().asTable()
  this.forms().forEach(function(form) { rows = rows.concat(form.asTable()) })
  if (this.nonFormPending()) {
    rows.push(React.createElement('tr', {key: '__pending__'}
    , React.createElement('td', {colSpan: 2}
      , React.createElement('progress', null, '...')
      )
    ))
  }
  return rows
}

/**
 * Returns the formset as <div>s.
 * @return {Array.<ReactElement>}
 */
FormSet.prototype.asDiv = function() {
  if ("production" !== process.env.NODE_ENV) {
    _renderDeprecated()
  }
  var rows = this.managementForm().asDiv()
  this.forms().forEach(function(form) { rows = rows.concat(form.asDiv()) })
  if (this.nonFormPending()) {
    rows.push(React.createElement('div', {key: '__pending__'}
    , React.createElement('progress', null, '...')
    ))
  }
  return rows
}

var formsetProps = {
  canDelete: React.PropTypes.bool
, canOrder: React.PropTypes.bool
, extra: React.PropTypes.number
, form: React.PropTypes.func
, maxNum: React.PropTypes.number
, minNum: React.PropTypes.number
, validateMax: React.PropTypes.bool
, validateMin: React.PropTypes.bool

, autoId: util.autoIdChecker
, controlled: React.PropTypes.bool
, data: React.PropTypes.object
, errorConstructor: React.PropTypes.func
, files: React.PropTypes.object
, initial: React.PropTypes.object
, onChange: React.PropTypes.func
, prefix: React.PropTypes.string
, validation: React.PropTypes.oneOfType([
    React.PropTypes.string
  , React.PropTypes.object
  ])
}

/**
 * Renders a Formset. A formset instance or constructor can be given. If a
 * constructor is given, an instance will be created when the component is
 * mounted, and any additional props will be passed to the constructor as
 * options.
 */
var RenderFormSet = React.createClass({
  displayName: 'RenderFormSet',
  mixins: [util.ProgressMixin],
  propTypes: object.extend({}, formsetProps, {
    className: React.PropTypes.string         // Class for the component wrapping all forms
  , component: React.PropTypes.any            // Component to wrap all forms
  , formComponent: React.PropTypes.any        // Component to wrap each form
  , formset: React.PropTypes.oneOfType([      // Formset instance or constructor
      React.PropTypes.func,
      React.PropTypes.instanceOf(FormSet)
    ])
  , row: React.PropTypes.any                  // Component to render form rows
  , rowComponent: React.PropTypes.any         // Component to wrap each form row
  , useManagementForm: React.PropTypes.bool   // Should ManagementForm hidden fields be rendered?
  , __all__: function(props) {
      if (!props.form && !props.formset) {
        return new Error(
          'Invalid props supplied to `RenderFormSet`, either `form` or ' +
          '`formset` must be specified.'
        )
      }
    }
  }),

  getDefaultProps: function() {
    return {
      component: 'div'
    , formComponent: 'div'
    , formset: FormSet
    , row: forms.FormRow
    , rowComponent: 'div'
    , useManagementForm: false
    }
  },

  componentWillMount: function() {
    if (this.props.formset instanceof FormSet) {
      this.formset = this.props.formset
    }
    else {
      this.formset = new this.props.formset(object.extend({
        onChange: this.forceUpdate.bind(this)
      }, util.getProps(this.props, Object.keys(formsetProps))))
    }
  },

  getFormset: function() {
    return this.formset
  },

  render: function() {
    var formset = this.formset
    var props = this.props
    var attrs = {}
    if (this.props.className) {
      attrs.className = props.className
    }
    var topErrors = formset.nonFormErrors()

    return React.createElement(props.component, attrs,
      topErrors.isPopulated() && React.createElement(props.row, {
        className: formset.errorCssClass
      , content: topErrors.render()
      , key: formset.addPrefix('__all__')
      , rowComponent: props.rowComponent
      }),
      formset.forms().map(function(form) {
        return React.createElement(forms.RenderForm, {
          form: form
        , formComponent: props.formComponent
        , row: props.row
        , rowComponent: props.rowComponent
        , progress: props.progress
        })
      }),
      formset.nonFormPending() && React.createElement(props.row, {
        className: formset.pendingRowCssClass
      , content: this.renderProgress()
      , key: formset.addPrefix('__pending__')
      , rowComponent: props.rowComponent
      }),
      props.useManagementForm && React.createElement(forms.RenderForm, {
        form: formset.managementForm()
      , formComponent: props.formComponent
      , row: props.row
      , rowComponent: props.rowComponent
      })
    )
  }
})

if ("production" !== process.env.NODE_ENV) {
  var warnedFormsetFactoryDeprecated = false
}

/**
 * Creates a FormSet constructor for the given Form constructor.
 * @param {Form} form
 * @param {Object=} kwargs
 */
function formsetFactory(form, kwargs) {
  if ("production" !== process.env.NODE_ENV) {
    if (!warnedFormsetFactoryDeprecated) {
      util.warning(
        'formsetFactory is deprecated and will be removed in version 0.12 - ' +
        'extend FormSet directly with FormSet.extend() instead'
      )
      warnedFormsetFactoryDeprecated = true
    }
  }

  kwargs = object.extend({
    form: form, formset: FormSet,
    extra: 1, canOrder: false, canDelete: false,
    maxNum: DEFAULT_MAX_NUM, validateMax: false,
    minNum: DEFAULT_MIN_NUM, validateMin: false
  }, kwargs)

  return object.pop(kwargs, 'formset').extend(kwargs)
}


/**
 * Returns true if every formset in formsets is valid.
 */
function allValid(formsets) {
  var valid = true
  for (var i = 0, l = formsets.length; i < l; i++) {
    if (!formsets[i].isValid()) {
      valid = false
    }
  }
  return valid
}

module.exports = {
  allValid: allValid
, FormSet: FormSet
, DEFAULT_MAX_NUM: DEFAULT_MAX_NUM
, formsetFactory: formsetFactory
, RenderFormSet: RenderFormSet
}
