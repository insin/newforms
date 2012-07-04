var Concur = require('Concur')
  , DOMBuilder = require('DOMBuilder')
  , is = require('isomorph/is')
  , format = require('isomorph/format').formatObj
  , object = require('isomorph/object')
  , copy = require('isomorph/copy')
  , validators = require('validators')

var util = require('./util')
  , fields = require('./fields')
  , widgets = require('./widgets')

var ErrorList = util.ErrorList
  , ErrorObject = util.ErrorObject
  , ValidationError = validators.ValidationError
  , Field = fields.Field
  , FileField = fields.FileField
  , Textarea = widgets.Textarea
  , TextInput = widgets.TextInput

/** Property under which non-field-specific errors are stored. */
var NON_FIELD_ERRORS = '__all__'

/**
 * A field and its associated data.
 *
 * @param {Form} form a form.
 * @param {Field} field one of the form's fields.
 * @param {String} name the name under which the field is held in the form.
 * @constructor
 */
var BoundField = Concur.extend({
  constructor: function(form, field, name) {
    if (!(this instanceof BoundField)) return new BoundField(form, field, name)
    this.form = form
    this.field = field
    this.name = name
    this.htmlName = form.addPrefix(name)
    this.htmlInitialName = form.addInitialPrefix(name)
    this.htmlInitialId = form.addInitialPrefix(this.autoId())
    this.label = this.field.label !== null ? this.field.label : util.prettyName(name)
    this.helpText = field.helpText || ''
  }
})

BoundField.prototype.errors = function() {
  return this.form.errors(this.name) || new this.form.errorConstructor()
}

BoundField.prototype.isHidden = function() {
  return this.field.widget.isHidden
}

/**
 * Calculates and returns the <code>id</code> attribute for this BoundFIeld
 * if the associated form has an autoId. Returns an empty string otherwise.
 */
BoundField.prototype.autoId = function() {
  var autoId = this.form.autoId
  if (autoId) {
    autoId = ''+autoId
    if (autoId.indexOf('{name}') != -1) {
      return format(autoId, {name: this.htmlName})
    }
    return this.htmlName
  }
  return ''
}

  /**
   * Returns the data for this BoundFIeld, or <code>null</code> if it wasn't
   * given.
   */
BoundField.prototype.data = function() {
  return this.field.widget.valueFromData(this.form.data,
                                         this.form.files,
                                         this.htmlName)
}

  /**
   * Wrapper around the field widget's <code>idForLabel</code> method.
   * Useful, for example, for focusing on this field regardless of whether
   * it has a single widget or a MutiWidget.
   */
BoundField.prototype.idForLabel = function() {
  var widget = this.field.widget
    , id = object.get(widget.attrs, 'id', this.autoId())
  return widget.idForLabel(id)
}

/**
 * Assuming this method will only be used when DOMBuilder is configured to
 * generate HTML.
 */
BoundField.prototype.toString = function() {
  return ''+this.defaultRendering()
}

BoundField.prototype.defaultRendering = function() {
  if (this.field.showHiddenInitial) {
    return DOMBuilder.fragment(this.asWidget(),
                               this.asHidden({onlyInitial: true}))
  }
  return this.asWidget()
}

/**
 * Yields SubWidgets that comprise all widgets in this BoundField.  This really
 * is only useful for RadioSelect widgets, so that you can iterate over
 * individual radio buttons when rendering.
 */
BoundField.prototype.__iter__ = function() {
  return this.field.widget.subWidgets(this.htmlName, this.value())
}

/**
 * Renders a widget for the field.
 *
 * @param {Object} [kwargs] configuration options
 * @config {Widget} [widget] an override for the widget used to render the field
 *                           - if not provided, the field's configured widget
 *                           will be used
 * @config {Object} [attrs] additional attributes to be added to the field's
 *                          widget.
 */
BoundField.prototype.asWidget = function(kwargs) {
  kwargs = object.extend({
    widget: null, attrs: null, onlyInitial: false
  }, kwargs)
  var widget = (kwargs.widget !== null ? kwargs.widget : this.field.widget)
    , attrs = (kwargs.attrs !== null ? kwargs.attrs : {})
    , autoId = this.autoId()
    , name = !kwargs.onlyInitial ? this.htmlName : this.htmlInitialName
  if (autoId &&
      typeof attrs.id == 'undefined' &&
      typeof widget.attrs.id == 'undefined') {
    attrs.id = (!kwargs.onlyInitial ? autoId : this.htmlInitialId)
  }

  return widget.render(name, this.value(), {attrs: attrs})
}

/**
 * Renders the field as a text input.
 *
 * @param {Object} [kwargs] widget options.
 */
BoundField.prototype.asText = function(kwargs) {
  kwargs = object.extend({}, kwargs, {widget: TextInput()})
  return this.asWidget(kwargs)
}

/**
 * Renders the field as a textarea.
 *
 * @param {Object} [kwargs] widget options.
 */
BoundField.prototype.asTextarea = function(kwargs) {
  kwargs = object.extend({}, kwargs, {widget: Textarea()})
  return this.asWidget(kwargs)
}

/**
 * Renders the field as a hidden field.
 *
 * @param {Object} [attrs] additional attributes to be added to the field's
 *                         widget.
 */
BoundField.prototype.asHidden = function(kwargs) {
  kwargs = object.extend({}, kwargs, {widget: new this.field.hiddenWidget()})
  return this.asWidget(kwargs)
}

/**
 * Returns the value for this BoundField, using the initial value if the form
 * is not bound or the data otherwise.
 */
BoundField.prototype.value = function() {
  var data
  if (!this.form.isBound) {
    data = object.get(this.form.initial, this.name, this.field.initial)
    if (is.Function(data)) {
      data = data()
    }
  }
  else {
    data = this.field.boundData(this.data(),
                                object.get(this.form.initial,
                                           this.name,
                                           this.field.initial))
  }
  return this.field.prepareValue(data)
}

/**
 * Creates the label value to be displayed, adding the form suffix if there is
 * one and the label doesn't end in punctuation.
 */
BoundField.prototype.getLabel = function() {
  var isSafe = DOMBuilder.html && DOMBuilder.html.isSafe(this.label)
  var label = ''+this.label
  // Only add the suffix if the label does not end in punctuation
  if (this.form.labelSuffix &&
      ':?.!'.indexOf(label.charAt(label.length - 1)) == -1) {
    label += this.form.labelSuffix
  }
  if (isSafe) {
    label = DOMBuilder.html.markSafe(label)
  }
  return label
}

/**
 * Wraps the given contents in a &lt;label&gt;, if the field has an ID
 * attribute. Does not HTML-escape the contents. If contents aren't given, uses
 * the field's HTML-escaped label.
 *
 * If attrs are given, they're used as HTML attributes on the <label> tag.
 *
 * @param {Object} [kwargs] configuration options.
 * @config {String} [contents] contents for the label - if not provided, label
 *                             contents will be generated from the field itself.
 * @config {Object} [attrs] additional attributes to be added to the label.
 */
BoundField.prototype.labelTag = function(kwargs) {
  kwargs = object.extend({contents: null, attrs: null}, kwargs)
  var contents
    , widget = this.field.widget
    , id
    , attrs
  if (kwargs.contents !== null) {
    contents = kwargs.contents
  }
  else {
    contents = this.getLabel()
  }

  id = object.get(widget.attrs, 'id', this.autoId())
  if (id) {
    attrs = object.extend(kwargs.attrs || {}, {'for': widget.idForLabel(id)})
    contents = DOMBuilder.createElement('label', attrs, [contents])
  }
  return contents
}

/**
 * Returns a string of space-separated CSS classes for this field.
 */
BoundField.prototype.cssClasses = function(extraClasses) {
  extraClasses = extraClasses || this.field.extraClasses
  if (extraClasses !== null && is.Function(extraClasses.split)) {
    extraClasses = extraClasses.split()
  }
  extraClasses = extraClasses || []
  if (typeof this.form.rowCssClass != 'undefined') {
    extraClasses.push(this.form.rowCssClass)
  }
  if (this.errors().isPopulated() &&
      typeof this.form.errorCssClass != 'undefined') {
    extraClasses.push(this.form.errorCssClass)
  }
  if (this.field.required && typeof this.form.requiredCssClass != 'undefined') {
    extraClasses.push(this.form.requiredCssClass)
  }
  return extraClasses.join(' ')
}

/**
 * A collection of Fields that knows how to validate and display itself.
 * @constructor
 * @param {Object}
 */
var BaseForm = Concur.extend({
  constructor: function(kwargs) {
    kwargs = object.extend({
      data: null, files: null, autoId: 'id_{name}', prefix: null,
      initial: null, errorConstructor: ErrorList, labelSuffix: ':',
      emptyPermitted: false
    }, kwargs)
    this.isBound = kwargs.data !== null || kwargs.files !== null
    this.data = kwargs.data || {}
    this.files = kwargs.files || {}
    this.autoId = kwargs.autoId
    this.prefix = kwargs.prefix
    this.initial = kwargs.initial || {}
    this.errorConstructor = kwargs.errorConstructor
    this.labelSuffix = kwargs.labelSuffix
    this.emptyPermitted = kwargs.emptyPermitted
    this._errors = null; // Stores errors after clean() has been called
    this._changedData = null

    // The baseFields attribute is the *prototype-wide* definition of fields.
    // Because a particular *instance* might want to alter this.fields, we
    // create this.fields here by deep copying baseFields. Instances should
    // always modify this.fields; they should not modify baseFields.
    this.fields = copy.deepCopy(this.baseFields)
  }
})

/**
 * Getter for errors, which first cleans the form if there are no errors
 * defined yet.
 *
 * @return errors for the data provided for the form.
 */
BaseForm.prototype.errors = function(name) {
  if (this._errors === null) {
    this.fullClean()
  }
  if (name) {
    return this._errors.get(name)
  }
  return this._errors
}

BaseForm.prototype.changedData = function() {
  if (this._changedData === null) {
    this._changedData = []
    // XXX: For now we're asking the individual fields whether or not
    // the data has changed. It would probably be more efficient to hash
    // the initial data, store it in a hidden field, and compare a hash
    // of the submitted data, but we'd need a way to easily get the
    // string value for a given field. Right now, that logic is embedded
    // in the render method of each field's widget.
    for (var name in this.fields) {
      if (!object.hasOwn(this.fields, name)) {
        continue
      }

      var field = this.fields[name]
        , prefixedName = this.addPrefix(name)
        , dataValue = field.widget.valueFromData(this.data,
                                                 this.files,
                                                 prefixedName)
        , initialValue = object.get(this.initial, name, field.initial)

      if (field.showHiddenInitial) {
        var initialPrefixedName = this.addInitialPrefix(name)
          , hiddenWidget = new field.hiddenWidget()
          , initialValue = hiddenWidget.valueFromData(
                this.data, this.files, initialPrefixedName)
      }

      if (field._hasChanged(initialValue, dataValue)) {
        this._changedData.push(name)
      }
    }
  }
  return this._changedData
}

BaseForm.prototype.toString = function() {
  return ''+this.defaultRendering()
}

BaseForm.prototype.defaultRendering = function() {
  return this.asTable()
}

/**
 * In lieu of __iter__, creates a {@link BoundField} for each field in the form,
 * in the order in which the fields were created.
 *
 * @param {Function} [test] if provided, this function will be called with
 *                          <var>field</var> and <var>name</var> arguments -
 *                          BoundFields will only be generated for fields for
 *                          which <code>true</code> is returned.
 *
 * @return a list of <code>BoundField</code> objects - one for each field in
 *         the form, in the order in which the fields were created.
 */
BaseForm.prototype.boundFields = function(test) {
  test = test || function() { return true }

  var fields = []
  for (var name in this.fields) {
    if (object.hasOwn(this.fields, name) &&
        test(this.fields[name], name) === true) {
      fields.push(BoundField(this, this.fields[name], name))
    }
  }
  return fields
}

/**
 * {name -> BoundField} version of boundFields
 */
BaseForm.prototype.boundFieldsObj = function(test) {
  test = test || function() { return true }

  var fields = {}
  for (var name in this.fields) {
    if (object.hasOwn(this.fields, name) &&
        test(this.fields[name], name) === true) {
      fields[name] = BoundField(this, this.fields[name], name)
    }
  }
  return fields
}

/**
 * In lieu of __getitem__, creates a {@link BoundField} for the field with the
 * given name.
 *
 * @param {String} name a field name.
 *
 * @return a <code>BoundField</code> for the field with the given name, if one
 *         exists.
 */
BaseForm.prototype.boundField = function(name) {
  if (!object.hasOwn(this.fields, name)) {
    throw new Error("Form does not have a '" + name + "' field.")
  }
  return BoundField(this, this.fields[name], name)
}

/**
 * Determines whether or not the form has errors.
 * @return {Boolean}
 */
BaseForm.prototype.isValid = function() {
  if (!this.isBound) {
    return false
  }
  return !this.errors().isPopulated()
}

/**
 * Returns the field name with a prefix appended, if this Form has a prefix set.
 *
 * @param {String} fieldName a field name.
 *
 * @return a field name with a prefix appended, if this Form has a prefix set,
 *         otherwise <code>fieldName</code> is returned as-is.
 */
BaseForm.prototype.addPrefix = function(fieldName) {
  if (this.prefix !== null) {
      return format('{prefix}-{fieldName}',
                    {prefix: this.prefix, fieldName: fieldName})
  }
  return fieldName
}

/**
 * Add an initial prefix for checking dynamic initial values.
 */
BaseForm.prototype.addInitialPrefix = function(fieldName) {
  return format('initial-{fieldName}',
                {fieldName: this.addPrefix(fieldName)})
}

/**
 * Helper function for outputting HTML.
 *
 * @param {Function} normalRow a function which produces a normal row.
 * @param {Function} errorRow a function which produces an error row.
 * @param {Boolean} errorsOnSeparateRow determines if errors are placed in their
 *                                      own row, or in the row for the field
 *                                      they are related to.
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 *
 * @return if we're operating in DOM mode returns a list of DOM elements
 *         representing rows, otherwise returns an HTML string, with rows
 *         separated by linebreaks.
 */
BaseForm.prototype._htmlOutput = function(normalRow,
                                          errorRow,
                                          errorsOnSeparateRow,
                                          doNotCoerce) {
  // Errors that should be displayed above all fields
  var topErrors = this.nonFieldErrors()
    , rows = []
    , hiddenFields = []
    , htmlClassAttr = null
    , cssClasses = null
    , hiddenBoundFields = this.hiddenFields()
    , visibleBoundFields = this.visibleFields()
    , bf, bfErrors

  for (var i = 0, l = hiddenBoundFields.length; i < l; i++) {
    bf = hiddenBoundFields[i]
    bfErrors = bf.errors()
    if (bfErrors.isPopulated()) {
      for (var j = 0, m = bfErrors.errors.length; j < m; j++) {
        topErrors.errors.push('(Hidden field ' + bf.name + ') ' +
                              bfErrors.errors[j])
      }
    }
    hiddenFields.push(bf.defaultRendering())
  }

  for (var i = 0, l = visibleBoundFields.length; i < l; i++) {
    bf = visibleBoundFields[i]
    htmlClassAttr = ''
    cssClasses = bf.cssClasses()
    if (cssClasses) {
      htmlClassAttr = cssClasses
    }

    // Variables which can be optional in each row
    var errors = null
      , label = null
      , helpText = null
      , extraContent = null

    bfErrors = bf.errors()
    if (bfErrors.isPopulated()) {
      errors = new this.errorConstructor()
      for (var j = 0, m = bfErrors.errors.length; j < m; j++) {
        errors.errors.push(bfErrors.errors[j])
      }

      if (errorsOnSeparateRow === true) {
        rows.push(errorRow(errors.defaultRendering()))
        errors = null
      }
    }

    if (bf.label) {
      label = bf.labelTag() || ''
    }

    if (bf.field.helpText) {
      helpText = bf.field.helpText
    }

    // If this is the last row, it should include any hidden fields
    if (i == l - 1 && hiddenFields.length > 0) {
      extraContent = hiddenFields
    }
    if (errors !== null) {
      errors = errors.defaultRendering()
    }
    rows.push(normalRow(label, bf.defaultRendering(), helpText, errors,
                        htmlClassAttr, extraContent))
  }

  if (topErrors.isPopulated()) {
    // Add hidden fields to the top error row if it's being displayed and
    // there are no other rows.
    var extraContent = null
    if (hiddenFields.length > 0 && rows.length == 0) {
      extraContent = hiddenFields
    }
    rows.splice(0, 0, errorRow(topErrors.defaultRendering(), extraContent))
  }

  // Put hidden fields in their own error row if there were no rows to
  // display.
  if (hiddenFields.length > 0 && rows.length == 0) {
    rows.push(errorRow('', hiddenFields, this.hiddenFieldRowCssClass))
  }
  if (doNotCoerce === true || DOMBuilder.mode == 'dom') {
    return rows
  }
  else {
    return DOMBuilder.html.markSafe(rows.join('\n'))
  }
}

/**
 * Returns this form rendered as HTML &lt;tr&gt;s - excluding the
 * &lt;table&gt;&lt;/table&gt;.
 *
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 */
BaseForm.prototype.asTable = (function() {
  var normalRow = function(label, field, helpText, errors, htmlClassAttr,
                           extraContent) {
    var contents = []
    if (errors) {
      contents.push(errors)
    }
    contents.push(field)
    if (helpText) {
      contents.push(DOMBuilder.createElement('br'))
      contents.push(helpText)
    }
    if (extraContent) {
      contents = contents.concat(extraContent)
    }

    var rowAttrs = {}
    if (htmlClassAttr) {
      rowAttrs['class'] = htmlClassAttr
    }
    return DOMBuilder.createElement('tr', rowAttrs, [
      DOMBuilder.createElement('th', {}, [label]),
      DOMBuilder.createElement('td', {}, contents)
    ])
  }

  var errorRow = function(errors, extraContent, htmlClassAttr) {
    var contents = [errors]
    if (extraContent) {
      contents = contents.concat(extraContent)
    }
    var rowAttrs = {}
    if (htmlClassAttr) {
      rowAttrs['class'] = htmlClassAttr
    }
    return DOMBuilder.createElement('tr', rowAttrs, [
      DOMBuilder.createElement('td', {colSpan: 2}, contents)
    ])
  }

  return function(doNotCoerce) {
    return this._htmlOutput(normalRow, errorRow, false, doNotCoerce)
  }
})()

/**
 * Returns this form rendered as HTML &lt;li&gt;s - excluding the
 * &lt;ul&gt;&lt;/ul&gt;.
 *
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 */
BaseForm.prototype.asUL = (function() {
  var normalRow = function(label, field, helpText, errors, htmlClassAttr,
                           extraContent) {
    var contents = []
    if (errors) {
      contents.push(errors)
    }
    if (label) {
      contents.push(label)
    }
    contents.push(' ')
    contents.push(field)
    if (helpText) {
      contents.push(' ')
      contents.push(helpText)
    }
    if (extraContent) {
      contents = contents.concat(extraContent)
    }

    var rowAttrs = {}
    if (htmlClassAttr) {
      rowAttrs['class'] = htmlClassAttr
    }
    return DOMBuilder.createElement('li', rowAttrs, contents)
  }

  var errorRow = function(errors, extraContent, htmlClassAttr) {
    var contents = [errors]
    if (extraContent) {
      contents = contents.concat(extraContent)
    }
    var rowAttrs = {}
    if (htmlClassAttr) {
      rowAttrs['class'] = htmlClassAttr
    }
    return DOMBuilder.createElement('li', rowAttrs, contents)
  }

  return function(doNotCoerce) {
    return this._htmlOutput(normalRow, errorRow, false, doNotCoerce)
  }
})()

/**
 * Returns this form rendered as HTML &lt;p&gt;s.
 *
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 */
BaseForm.prototype.asP = (function() {
  var normalRow = function(label, field, helpText, errors, htmlClassAttr,
                           extraContent) {
    var contents = []
    if (label) {
      contents.push(label)
    }
    contents.push(' ')
    contents.push(field)
    if (helpText) {
      contents.push(' ')
      contents.push(helpText)
    }
    if (extraContent) {
      contents = contents.concat(extraContent)
    }

    var rowAttrs = {}
    if (htmlClassAttr) {
      rowAttrs['class'] = htmlClassAttr
    }
    return DOMBuilder.createElement('p', rowAttrs, contents)
  }

  var errorRow = function(errors, extraContent, htmlClassAttr) {
    if (extraContent) {
      var rowAttrs = {}
      if (htmlClassAttr) {
        rowAttrs['class'] = htmlClassAttr
      }
      // When provided extraContent is usually hidden fields, so we need
      // to give it a block scope wrapper in this case for HTML validity.
      return DOMBuilder.createElement('div', rowAttrs, [errors].concat(extraContent))
    }
    // Otherwise, just display errors as they are
    return errors
  }

  return function(doNotCoerce) {
    return this._htmlOutput(normalRow, errorRow, true, doNotCoerce)
  }
})()

/**
 * Returns errors that aren't associated with a particular field.
 *
 * @return errors that aren't associated with a particular field - i.e., errors
 *         generated by <code>clean()</code>. Will be empty if there are none.
 */
BaseForm.prototype.nonFieldErrors = function() {
  return (this.errors(NON_FIELD_ERRORS) || new this.errorConstructor())
}

/**
 * Returns the raw value for a particular field name. This is just a convenient
 * wrapper around widget.valueFromData.
 */
BaseForm.prototype._rawValue = function(fieldname) {
  var field = this.fields[fieldname]
    , prefix = this.addPrefix(fieldname)
  return field.widget.valueFromData(this.data, this.files, prefix)
}

/**
 * Cleans all of <code>data</code> and populates <code>_errors</code> and
 * <code>cleanedData</code>.
 */
BaseForm.prototype.fullClean = function() {
  this._errors = ErrorObject()
  if (!this.isBound) {
    return; // Stop further processing
  }

  this.cleanedData = {}

  // If the form is permitted to be empty, and none of the form data has
  // changed from the initial data, short circuit any validation.
  if (this.emptyPermitted && !this.hasChanged()) {
    return
  }

  this._cleanFields()
  this._cleanForm()
  this._postClean()

  if (this._errors.isPopulated()) {
    delete this.cleanedData
  }
}

BaseForm.prototype._cleanFields = function() {
  for (var name in this.fields)
  {
    if (!object.hasOwn(this.fields, name)) {
      continue
    }

    var field = this.fields[name]
        // valueFromData() gets the data from the data objects.
        // Each widget type knows how to retrieve its own data, because some
        // widgets split data over several HTML fields.
      , value = field.widget.valueFromData(this.data, this.files,
                                           this.addPrefix(name))
    try {
      if (field instanceof FileField) {
        var initial = object.get(this.initial, name, field.initial)
        value = field.clean(value, initial)
      }
      else {
        value = field.clean(value)
      }
      this.cleanedData[name] = value

      // Try clean_name
      var customClean = 'clean_' + name
      if (typeof this[customClean] != 'undefined' &&
          is.Function(this[customClean])) {
         this.cleanedData[name] = this[customClean]()
         continue
      }

      // Try cleanName
      customClean = 'clean' + name.charAt(0).toUpperCase() +
                    name.substr(1)
      if (typeof this[customClean] != 'undefined' &&
          is.Function(this[customClean])) {
        this.cleanedData[name] = this[customClean]()
      }
    }
    catch (e) {
      if (!(e instanceof ValidationError)) {
        throw e
      }
      this._errors.set(name, new this.errorConstructor(e.messages))
      if (typeof this.cleanedData[name] != 'undefined') {
        delete this.cleanedData[name]
      }
    }
  }
}

BaseForm.prototype._cleanForm = function() {
  try {
    this.cleanedData = this.clean()
  }
  catch (e) {
    if (!(e instanceof ValidationError)) {
      throw e
    }
    this._errors.set(NON_FIELD_ERRORS,
                     new this.errorConstructor(e.messages))
  }
}

/**
 * An internal hook for performing additional cleaning after form cleaning is
 * complete.
 */
BaseForm.prototype._postClean = function() {}

/**
 * Hook for doing any extra form-wide cleaning after each Field's
 * <code>clean()</code> has been called. Any {@link ValidationError} raised by
 * this method will not be associated with a particular field; it will have a
 * special-case association with the field named <code>__all__</code>.
 *
 * @return validated, cleaned data.
 */
BaseForm.prototype.clean = function() {
  return this.cleanedData
}

/**
 * Determines if data differs from initial.
 */
BaseForm.prototype.hasChanged = function() {
  return (this.changedData().length > 0)
}

/**
 * Determines if the form needs to be multipart-encrypted, in other words, if it
 * has a {@link FileInput}.
 *
 * @return <code>true</code> if the form needs to be multipart-encrypted,
 *         <code>false</code> otherwise.
 */
BaseForm.prototype.isMultipart = function() {
  for (var name in this.fields) {
    if (object.hasOwn(this.fields, name) &&
        this.fields[name].widget.needsMultipartForm) {
      return true
    }
  }
  return false
}

/**
 * Returns a list of all the {@link BoundField} objects that correspond to
 * hidden fields. Useful for manual form layout.
 */
BaseForm.prototype.hiddenFields = function() {
  return this.boundFields(function(field) {
    return field.widget.isHidden
  })
}

/**
 * Returns a list of {@link BoundField} objects that do not correspond to
 * hidden fields. The opposite of the hiddenFields() method.
 */
BaseForm.prototype.visibleFields = function() {
  return this.boundFields(function(field) {
    return !field.widget.isHidden
  })
}

function DeclarativeFieldsMeta(prototypeProps, constructorProps) {
  // Pop fields from prototypeProps to contribute towards baseFields
  var fields = []
  for (var name in prototypeProps) {
    if (object.hasOwn(prototypeProps, name) &&
        prototypeProps[name] instanceof Field) {
      fields.push([name, prototypeProps[name]])
      delete prototypeProps[name]
    }
  }
  fields.sort(function(a, b) {
    return a[1].creationCounter - b[1].creationCounter
  })

  // If any mixins which look like form constructors were given, inherit their
  // fields.
  if (object.hasOwn(prototypeProps, '__mixin__')) {
    var mixins = prototypeProps.__mixin__
    if (!is.Array(mixins)) {
      mixins = [mixins]
    }
    // Note that we loop over mixed in forms in *reverse* to preserve the
    // correct order of fields.
    for (var i = mixins.length - 1; i >= 0; i--) {
      var mixin = mixins[i]
      if (is.Function(mixin) &&
          typeof mixin.prototype.baseFields != 'undefined') {
        fields = object.items(mixin.prototype.baseFields).concat(fields)
        // Replace the mixin with an object containing the other prototype
        // properties, to avoid overwriting baseFields when the mixin is
        // applied.
        var formMixin = object.extend({}, mixin.prototype)
        delete formMixin.baseFields
        mixins[i] = formMixin
      }
    }
    prototypeProps.__mixin__ = mixins
  }

  // If we're extending from a form which already has some baseFields, they
  // should be first.
  if (typeof this.baseFields != 'undefined') {
    fields = object.items(this.baseFields).concat(fields)
  }

  // Where -> is "overridden by":
  // parent fields -> mixin form fields -> given fields
  prototypeProps.baseFields = object.fromItems(fields)
}

var Form = BaseForm.extend({
  __meta__: DeclarativeFieldsMeta
})

module.exports = {
  NON_FIELD_ERRORS: NON_FIELD_ERRORS
, BoundField: BoundField
, BaseForm: BaseForm
, DeclarativeFieldsMeta: DeclarativeFieldsMeta
, Form: Form
}
