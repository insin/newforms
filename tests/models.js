QUnit.module('models')

;(function() {

var object = require('isomorph/object')

// Mock out a model interface

// Model constructor
function Thing(kwargs) {
  for (var attr in kwargs) {
    this[attr] = kwargs[attr]
  }
}
Thing.prototype.toString = function() {
  return this.name
}

// Model query object
function ThingQuery() {
  if (!(this instanceof ThingQuery)) return new ThingQuery()
  this.model = Thing
}
ThingQuery.prototype.__iter__ = function() {
  return db
}
ThingQuery.prototype.get = function(id) {
  for (var i = 0, l = db.length, o = db[i]; i < l; i++) {
    if (o instanceof this.model && o.id == id) {
      return o
    }
  }
  throw new NotFoundError()
}

// Find exception constructor
function NotFoundError() {}

// Data store
var db = [
  new Thing({id: 1, name: 'Thing 1', what: 5})
, new Thing({id: 2, name: 'Thing 2', what: 10})
, new Thing({id: 3, name: 'Thing 3', what: 15})
]

// Let newforms know what our mock model interface looks like
object.extend(forms.ModelInterface, {
  throwsIfNotFound: true
, notFoundErrorConstructor: NotFoundError
, prepareValue: function(obj) {
    if (obj instanceof Thing) {
      return obj.id
    }
  }
, findById: function(modelQuery, id) {
    return modelQuery.get(id)
  }
})

var ModelTestForm = forms.Form.extend({
  thing: forms.ModelChoiceField(ThingQuery())
})

QUnit.test('ModelChoiceField', 16, function() {
  var form = new ModelTestForm()
  equal(''+form.boundField('thing'),
'<select name="thing" id="id_thing">\n' +
'<option value="" selected="selected">---------</option>\n' +
'<option value="1">Thing 1</option>\n' +
'<option value="2">Thing 2</option>\n' +
'<option value="3">Thing 3</option>\n' +
'</select>')

  var f = forms.ModelChoiceField(ThingQuery())
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", null)
  strictEqual(f.clean(1), db[0])
  strictEqual(f.clean("1"), db[0])
  cleanErrorEqual(f, "Select a valid choice. That choice is not one of the available choices.", "4")

  f = forms.ModelChoiceField(ThingQuery(), {required: false})
  strictEqual(f.clean(""), null)
  strictEqual(f.clean(null), null)
  strictEqual(f.clean(1), db[0])
  strictEqual(f.clean("1"), db[0])
  cleanErrorEqual(f, "Select a valid choice. That choice is not one of the available choices.", "4")

  // The model interface can be configured per ModelChoiceField
  var notFound = {}
  var testInterface = {
    throwsIfNotFound: false
  , notFoundValue: notFound
  , prepareValue: function(obj) {
      return obj.what
    }
  , findById: function(modelQuery, what) {
      for (var i = 0, l = db.length, o = db[i]; i < l; i++) {
        if (o.id == what / 5) {
          return o
        }
      }
      return notFound
    }
  }

  f = forms.ModelChoiceField(ThingQuery(), {modelInterface: testInterface})
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", null)
  strictEqual(f.clean(5), db[0])
  strictEqual(f.clean("5"), db[0])
  cleanErrorEqual(f, "Select a valid choice. That choice is not one of the available choices.", "20")
})

})()
