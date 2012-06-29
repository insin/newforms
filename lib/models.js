var object = require('isomorph/object')
  , validators = require('validators')

var util = require('./util')
  , fields = require('./fields')

var Field = fields.Field
  , ValidationError = validators.ValidationError

/**
 * A means of hooking newforms up with information about your model layer.
 */
var ModelInterface = {
  /**
   * Set to true if an exception is thrown when a model can't be found.
   */
  throwsIfNotFound: true

  /**
   * Constructor of error thrown when a model can't be found. Any exceptions
   * which do not have this constructor will be rethrown.
   */
, notFoundErrorConstructor: Error

  /**
   * Value returned to indicate not found, instead of throwing an exception.
   */
, notFoundValue: null

  /**
   * Given a model instance, should return the id which will be used to search
   * for valid choices on submission.
   */
, prepareValue: function(obj) {
    throw new Error('You must implement the forms.ModelInterface methods to use Model fields')
  }

  /**
   * Finds a model instance by id, given the model query which was passed to
   * newforms and the id of the selected model.
   */
, findById: function(modelQuery, id) {
    throw new Error('You must implement the forms.ModelInterface methods to use Model fields')
  }
}

function ModelQueryIterator(field) {
  this.field = field
  this.modelQuery = field.modelQuery
}

ModelQueryIterator.prototype.__iter__ = function() {
  var choices = []
  if (this.field.emptyLabel !== null) {
    choices.push(['', this.field.emptyLabel])
  }
  if (this.field.cacheChoices) {
    if (this.field.choiceCache === null) {
      this.field.choiceCache = choices.concat(this.modelChoices())
    }
    return this.field.choiceCache
  }
  else {
    return choices.concat(this.modelChoices())
  }
}

/**
 * Calls the model query function and creates choices from its results.
 */
ModelQueryIterator.prototype.modelChoices = function() {
  var instances = util.iterate(this.modelQuery)
    , choices = []
  for (var i = 0, l = instances.length; i < l; i++) {
    choices.push(this.choice(instances[i]))
  }
  return choices
}

/**
 * Creates a choice from a single model instance.
 */
ModelQueryIterator.prototype.choice = function(obj) {
  return [this.field.prepareValue(obj), this.field.labelFromInstance(obj)]
}

/**
 * A ChoiceField which retrieves its choices as objects returned by a given
 * function.
 * @constructor
 * @extends {ChoiceField}
 * @param {function} modelQuery
 * @param {Object} kwargs
 */
var ModelChoiceField = fields.ChoiceField.extend({
  constructor: function(modelQuery, kwargs) {
    if (!(this instanceof Field)) return new ModelChoiceField(modelQuery, kwargs)
    kwargs = object.extend({
      required: true, initial: null, cacheChoices: false, emptyLabel: '---------',
      modelInterface: ModelInterface
    }, kwargs)
    if (kwargs.required === true && kwargs.initial !== null) {
      this.emptyLabel = null
    }
    else {
      this.emptyLabel = kwargs.emptyLabel
    }
    this.emptyLabel = kwargs.emptyLabel
    this.cacheChoices = kwargs.cacheChoices
    this.modelInterface = kwargs.modelInterface

    // We don't need the ChoiceField constructor, as we've already handled setting
    // of choices.
    Field.call(this, kwargs)

    this.setModelQuery(modelQuery)
    this.choiceCache = null
  }
})
ModelChoiceField.prototype.defaultErrorMessages =
    object.extend({}, ModelChoiceField.prototype.defaultErrorMessages, {
      invalidChoice: 'Select a valid choice. That choice is not one of the available choices.'
    })

ModelChoiceField.prototype.getModelQuery = function() {
  return this.modelQuery
}

ModelChoiceField.prototype.setModelQuery = function(modelQuery) {
  this.modelQuery = modelQuery
  this.widget.choices = this.getChoices()
}

ModelChoiceField.prototype.getChoices = function() {
  // If this._choices is set, then somebody must have manually set them with
  // the inherited setChoices method.
  if (typeof this._choices != 'undefined') {
    return this._choices
  }

  // Otherwise, return an object which can be used with iterate() to get
  // choices.
  return new ModelQueryIterator(this)
}

ModelChoiceField.prototype.prepareValue = function(obj) {
  var value = null
  if (obj != null) {
    value = this.modelInterface.prepareValue(obj)
  }
  if (value == null) {
    value = Field.prototype.prepareValue.call(this, obj)
  }
  return value
}

/**
 * Creates a choice label from a model instance.
 */
ModelChoiceField.prototype.labelFromInstance = function(obj) {
  return ''+obj
}

ModelChoiceField.prototype.toJavaScript = function(value) {
  if (validators.isEmptyValue(value)) {
    return null
  }
  if (this.modelInterface.throwsIfNotFound) {
    try {
      value = this.modelInterface.findById(this.modelQuery, value)
    }
    catch (e) {
      if (this.modelInterface.notFoundErrorConstructor !== null &&
          !(e instanceof this.modelInterface.notFoundErrorConstructor)) {
        throw e
      }
      throw new ValidationError(this.errorMessages.invalidChoice)
    }
  }
  else {
    value = this.modelInterface.findById(this.modelQuery, value)
    if (value === this.modelInterface.notFoundValue) {
      throw new ValidationError(this.errorMessages.invalidChoice)
    }
  }
  return value
}

ModelChoiceField.prototype.validate = function(value) {
  return Field.prototype.validate.call(this, value)
}

module.exports = {
  ModelInterface: ModelInterface
, ModelChoiceField: ModelChoiceField
}
