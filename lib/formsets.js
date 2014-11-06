'use strict';

var Concur = require('Concur')
var object = require('isomorph/object')
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
var BaseFormSet = Concur.extend({
  constructor: function BaseFormSet(kwargs) {
    kwargs = object.extend({
      data: null, files: null, autoId: 'id_{name}', prefix: null,
      initial: null, errorConstructor: ErrorList, managementFormCssClass: null,
      validation: 'manual', controlled: false, onStateChange: null
    }, kwargs)
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
    this.onStateChange = kwargs.onStateChange
    this._forms = null
    this._errors = null
    this._nonFormErrors = null
  }
})

BaseFormSet.prototype._stateChanged = function() {
  if (typeof this.onStateChange == 'function') {
    this.onStateChange()
  }
}

/**
 * Sets the formset's entire input data, also triggering validation by default.
 * @param {Object.<string,*>} data new input data for forma, which must be
 *   prefixed for uniqueness.
 * @param {Object.<string,boolean>} kwargs data setting options.
 * @retun {boolean} if date setting options indicate the new data should be
 *   validated, true if the new data is valid.
 */
BaseFormSet.prototype.setData = function(data, kwargs) {
  kwargs = object.extend({validate: true, _triggerStateChange: true}, kwargs)

  this.data = data
  var formDataSettingOptiona = {
    prefixed: true, validate: kwargs.validate, _triggerStateChange: false
  }
  this.forms().forEach(function(form) {
    form.setData(data, formDataSettingOptiona)
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
BaseFormSet.prototype.setFormData = BaseFormSet.prototype.setData

/**
 * Returns the ManagementForm instance for this FormSet.
 * @browser the form is unbound and uses initial data from this FormSet.
 * @server the form is bound to submitted data.
 */
BaseFormSet.prototype.managementForm = function() {
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
BaseFormSet.prototype.totalFormCount = function() {
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
BaseFormSet.prototype.initialFormCount = function() {
  if (!env.browser && !this.isInitialRender) {
    return this.managementForm().cleanedData[INITIAL_FORM_COUNT]
  }
  else {
    // Use the length of the inital data if it's there, 0 otherwise.
    var initialForms = (this.initial !== null && this.initial.length > 0
                        ? this.initial.length
                        : 0)
    return initialForms
  }
}

/**
 * Instantiates forms when first accessed.
 */
BaseFormSet.prototype.forms = function() {
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
BaseFormSet.prototype.addAnother = function() {
  var currentFormCount = this.totalFormCount()
  this.extra++
  if (this._forms !== null) {
    this._forms[currentFormCount] = this._constructForm(currentFormCount)
  }
 this._stateChanged()
}

// Assumption - the UI will only let the user remove extra forms
BaseFormSet.prototype.removeForm = function(index) {
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
BaseFormSet.prototype._constructForm = function(i) {
  var defaults = {
    autoId: this.autoId
  , prefix: this.addPrefix(i)
  , errorConstructor: this.errorConstructor
  , validation: this.validation
  , controlled: this.controlled
  , onStateChange: this.onStateChange
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
BaseFormSet.prototype.initialForms = function() {
  return this.forms().slice(0, this.initialFormCount())
}

/**
 * Returns a list of all the extra forms in this formset.
 */
BaseFormSet.prototype.extraForms = function() {
  return this.forms().slice(this.initialFormCount())
}

BaseFormSet.prototype.emptyForm = function() {
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
 * Returns a list of form.cleanedData objects for every form in this.forms().
 */
BaseFormSet.prototype.cleanedData = function() {
  var forms = this.initialForms()
  // Don't include empty extra forms
  forms.push.apply(forms, this.extraForms().filter(function(form) {
    return form.hasChanged()
  }))
  return forms.map(function(form) { return form.cleanedData })
}

/**
 * Returns a list of forms that have been marked for deletion.
 */
BaseFormSet.prototype.deletedForms = function() {
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
BaseFormSet.prototype.orderedForms = function() {
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

BaseFormSet.prototype.getDefaultPrefix = function() {
  return 'form'
}

BaseFormSet.prototype.addError = function(error) {
  if (!(error instanceof ValidationError)) {
    // Normalise to ValidationError and let its constructor do the hard work of
    // making sense of the input.
    error = ValidationError(error)
  }

  this._nonFormErrors.extend(error.errorList)
}

/**
 * Returns an ErrorList of errors that aren't associated with a particular
 * form -- i.e., from formset.clean(). Returns an empty ErrorList if there are
 * none.
 */
BaseFormSet.prototype.nonFormErrors = function() {
  if (this._nonFormErrors === null) {
    this.fullClean()
  }
  return this._nonFormErrors
}

/**
 * Returns a list of form.errors for every form in this.forms.
 */
BaseFormSet.prototype.errors = function() {
  if (this._errors === null) {
    this.fullClean()
  }
  return this._errors
}

/**
 * Returns the number of errors across all forms in the formset.
 */
BaseFormSet.prototype.totalErrorCount = function() {
  return (this.nonFormErrors().length() +
          this.errors().reduce(function(sum, formErrors) {
            return sum + formErrors.length()
          }, 0))
}

/**
 * Returns whether or not the form was marked for deletion.
 */
BaseFormSet.prototype._shouldDeleteForm = function(form) {
  return object.get(form.cleanedData, DELETION_FIELD_NAME, false)
}

/**
 * Returns true if every form in this.forms() is valid.
 */
BaseFormSet.prototype.isValid = function() {
  if (this.isInitialRender) { return false }

  // We loop over every form.errors here rather than short circuiting on the
  // first failure to make sure validation gets triggered for every form.
  var formsValid = true
  // Triggers a full clean
  this.errors()
  var forms = this.forms()
  for (var i = 0, l = forms.length; i < l; i++) {
    var form = forms[i]
    if (this.canDelete && this._shouldDeleteForm(form)) {
      // This form is going to be deleted so any of its errors should
      // not cause the entire formset to be invalid.
      continue
    }
    if (!form.isValid()) {
      formsValid = false
    }
  }

  return (formsValid && !this.nonFormErrors().isPopulated())
}

/**
 * Forces the formset to revalidate from scratch. If a <form> is given, data
 * from it will be set on this formset's forms first. Otherwise, validation will
 * be done with current input data..
 * @param {(ReactElement|HTMLFormElement)=} form the <form> containing this
 *   formset's rendered widgets - this can be a React <form> component or a real
 *   <form> DOM node.
 * @return {boolean} true if the formset is valid.
 */
BaseFormSet.prototype.validate = function(form) {
  if (form) {
    if (typeof form.getDOMNode == 'function') {
      form = form.getDOMNode()
    }
    var data = util.formData(form)
    return this.setData(data, {_triggerStateChange: false})
  }

  // Force all forms to revalidate first
  this.forms().forEach(function(form) {
    if (form.isInitialRender) {
      form.isInitialRender = false
    }
    form.fullClean()
  })
  if (this.isInitialRender) {
    this.isInitialRender = false
  }
  this.fullClean()
  return this.isValid()
}

/**
 * Cleans all of this.data and populates this._errors and this._nonFormErrors.
 */
BaseFormSet.prototype.fullClean = function() {
  this._errors = []
  this._nonFormErrors = new this.errorConstructor()

  if (this.isInitialRender) {
    return // Stop further processing
  }

  var forms = this.forms()
  for (var i = 0, l = forms.length; i < l; i++) {
    var form = forms[i]
    this._errors.push(form.errors())
  }

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
    this.clean()
  }
  catch (e) {
    if (!(e instanceof ValidationError)) { throw e }
    this._nonFormErrors = new this.errorConstructor(e.messages())
  }
}

/**
 * Hook for doing any extra formset-wide cleaning after Form.clean() has been
 * called on every form. Any ValidationError raised by this method will not be
 * associated with a particular form; it will be accesible via
 * formset.nonFormErrors()
 */
BaseFormSet.prototype.clean = function() {}

/**
 * Returns true if any form differs from initial.
 */
BaseFormSet.prototype.hasChanged = function() {
  var forms = this.forms()
  for (var i = 0, l = forms.length; i < l; i++) {
    if (forms[i].hasChanged()) {
      return true
    }
  }
  return false
}

/**
 * A hook for adding extra fields on to each form instance.
 * @param {Form} form the form fields are to be added to.
 * @param {Number} index the index of the given form in the formset.
 */
BaseFormSet.prototype.addFields = function(form, index) {
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
 * Returns the formset prefix with the form index appended.
 * @param {Number} index the index of a form in the formset.
 */
BaseFormSet.prototype.addPrefix = function(index) {
  return this.prefix + '-' + index
}

/**
 * Returns true if the formset needs to be multipart-encoded, i.e. it has a
 * FileInput. Otherwise, false.
 */
BaseFormSet.prototype.isMultipart = function() {
  return (this.forms().length > 0 && this.forms()[0].isMultipart())
}

BaseFormSet.prototype.render = function() {
  return this.asTable()
}

/**
 * Returns this formset rendered as HTML <tr>s - excluding the <table>.
 */
BaseFormSet.prototype.asTable = function() {
  // XXX: there is no semantic division between forms here, there probably
  // should be. It might make sense to render each form as a table row with
  // each field as a td.
  var rows = this.managementForm().asTable()
  this.forms().forEach(function(form) { rows = rows.concat(form.asTable()) })
  return rows
}

BaseFormSet.prototype.asDiv = function() {
  var rows = this.managementForm().asDiv()
  this.forms().forEach(function(form) { rows = rows.concat(form.asDiv()) })
  return rows
}

BaseFormSet.prototype.asUl = function() {
  var rows = this.managementForm().asUl()
  this.forms().forEach(function(form) { rows = rows.concat(form.asUl()) })
  return rows
}

/**
 * Creates a FormSet constructor for the given Form constructor.
 * @param {Form} form
 * @param {Object=} kwargs
 */
function formsetFactory(form, kwargs) {
  kwargs = object.extend({
    formset: BaseFormSet, extra: 1, canOrder: false, canDelete: false,
    maxNum: DEFAULT_MAX_NUM, validateMax: false,
    minNum: DEFAULT_MIN_NUM, validateMin: false
  }, kwargs)

  // Remove special properties from kwargs, as it will subsequently be used to
  // add properties to the new formset's prototype.
  var formset = object.pop(kwargs, 'formset')
  var extra = object.pop(kwargs, 'extra')
  var canOrder = object.pop(kwargs, 'canOrder')
  var canDelete = object.pop(kwargs, 'canDelete')
  var maxNum = object.pop(kwargs, 'maxNum')
  var validateMax = object.pop(kwargs, 'validateMax')
  var minNum = object.pop(kwargs, 'minNum')
  var validateMin = object.pop(kwargs, 'validateMin')

  // Hard limit on forms instantiated, to prevent memory-exhaustion attacks
  // limit is simply maxNum + DEFAULT_MAX_NUM (which is 2 * DEFAULT_MAX_NUM
  // if maxNum is not provided in the first place)
  var absoluteMax = maxNum + DEFAULT_MAX_NUM
  extra += minNum

  kwargs.constructor = function(kwargs) {
    this.form = form
    this.extra = extra
    this.canOrder = canOrder
    this.canDelete = canDelete
    this.maxNum = maxNum
    this.validateMax = validateMax
    this.minNum = minNum
    this.validateMin = validateMin
    this.absoluteMax = absoluteMax
    formset.call(this, kwargs)
  }

  var formsetConstructor = formset.extend(kwargs)

  return formsetConstructor
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
  DEFAULT_MAX_NUM: DEFAULT_MAX_NUM
, BaseFormSet: BaseFormSet
, formsetFactory: formsetFactory
, allValid: allValid
}
