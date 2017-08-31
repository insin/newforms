void function() { 'use strict';

var _browser

var RenderForm = forms.RenderForm
var RenderFormSet = forms.RenderFormSet

QUnit.module("formsets (server)", {
  setup: function() {
    _browser = forms.env.browser
    forms.env.browser = false
  }
, teardown: function() {
    forms.env.browser =_browser
  }
})

var ChoiceForm = forms.Form.extend({
  choice: forms.CharField(),
  votes: forms.IntegerField()
})

// FormSet allows us to use multiple instance of the same form on 1 page.
// For now, the best way to create a FormSet is by using the FormSet
// function.
var ChoiceFormSet = forms.FormSet.extend({form: ChoiceForm})

var FavouriteDrinkForm = forms.Form.extend({
  name: forms.CharField()
})

// Utility methods for displaying results
function renderAll(forms) {
  return forms.map(function(form) { return React.createElement(RenderForm, {form: form}) })
}

function allCleanedData(forms) {
  return forms.map(function(form) { return form.cleanedData })
}

QUnit.test("Basic FormSet", 5, function() {
  // A FormSet constructor takes the same arguments as Form. Let's create a
  // FormSet for adding data. By default, it displays 1 blank form. It can
  // display more, but we'll look at how to do so later.
  var formset = new ChoiceFormSet({autoId: false, prefix: "choices"})
  reactHTMLEqual(React.createElement(RenderFormSet, {formset: formset}),
'<div>\
<div>\
<div>Choice: <input type="text" name="choices-0-choice"/></div>\
<div>Votes: <input type="number" name="choices-0-votes"/></div>\
</div>\
</div>')

  // One thing to note is that there needs to be a special value in the data.
  // This value tells the FormSet how many forms were displayed so it can tell
  // how many forms it needs to clean and validate. You could use javascript
  // to create new forms on the client side, but they won't get validated
  // unless you increment the TOTAL_FORMS field appropriately.
  var data = {
    "choices-TOTAL_FORMS": "1" // The number of forms rendered
  , "choices-INITIAL_FORMS": "0" // The number of forms with initial data
  , "choices-MAX_NUM_FORMS": "0" // Max number of forms
  , "choices-0-choice": "Calexico"
  , "choices-0-votes": "100"
  }

  // We treat FormSet pretty much like we would treat a normal Form. FormSet
  // has an isValid method, and a cleanedData or errors attribute depending on
  // whether all the forms passed validation. However, unlike a Form instance,
  // cleanedData and errors will be a list of objects rather than just a
  // single object.
  formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"})
  strictEqual(formset.isValid(), true)
  deepEqual(formset.forms()[0].cleanedData, {choice: "Calexico", votes: 100})

  // If a FormSet was not passed any data, its isValid and hasChanged methods
  // should return false.
  formset = new ChoiceFormSet()
  strictEqual(formset.isValid(), false)
  strictEqual(formset.hasChanged(), false)
})

QUnit.test('Custom prefix format', function() {
  // By default, formsets append a hyphen between the prefix and theform index,
  // but a formset can alter that behaviour by overriding prefixFormat, which
  // should be a string containing {prefix} and {index} placeholders.
  var ChoiceForm = forms.Form.extend({
    prefixFormat: '{prefix}[{name}]',
    choice: forms.CharField(),
    votes: forms.IntegerField()
  })

  var ChoiceFormSet = forms.FormSet.extend({
    form: ChoiceForm,
    prefixFormat: '{prefix}[{index}]'
  })

  var initial = [{choice: "Calexico", votes: 100}]
  var formset = new ChoiceFormSet({initial: initial, autoId: false, prefix: 'choices'})
  reactHTMLEqual(renderAll(formset.forms()),
'<div>\
<div>Choice: <input type="text" name="choices[0][choice]" value="Calexico"/></div>\
<div>Votes: <input type="number" name="choices[0][votes]" value="100"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices[1][choice]"/></div>\
<div>Votes: <input type="number" name="choices[1][votes]"/></div>\
</div>')
})

QUnit.test("Formset validation", 2, function() {
  // FormSet instances can also have an error attribute if validation failed for
  // any of the forms.
  var data = {
    "choices-TOTAL_FORMS": "1"
  , "choices-INITIAL_FORMS": "0"
  , "choices-MAX_NUM_FORMS": "0"
  , "choices-0-choice": "Calexico"
  , "choices-0-votes": ""
  }
  var formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"})
  strictEqual(formset.isValid(), false)
  deepEqual(formset.errors()[0].get("votes").messages(), ["This field is required."])
})

QUnit.test('Formset hasChanged', 5, function() {
  // hasChanged should be true if any data is passed, even if the formset didn't
  // validate
  var data = {
    'choices-TOTAL_FORMS': '1'
  , 'choices-INITIAL_FORMS': '0'
  , 'choices-MAX_NUM_FORMS': '0'
  , 'choices-0-choice': ''
  , 'choices-0-votes': ''
  }
  var blankFormset = new ChoiceFormSet({data: data, autoId: false, prefix: 'choices'})
  strictEqual(blankFormset.hasChanged(), false)

  // Invalid formset
  data['choices-0-choice'] = 'Calexico'
  var invalidFormset = new ChoiceFormSet({data: data, autoId: false, prefix: 'choices'})
  strictEqual(invalidFormset.isValid(), false)
  strictEqual(invalidFormset.hasChanged(), true)

  // Valid formset
  data['choices-0-votes'] = '100'
  var validFormset = new ChoiceFormSet({data: data, autoId: false, prefix: 'choices'})
  strictEqual(validFormset.isValid(), true)
  strictEqual(validFormset.hasChanged(), true)
})

QUnit.test("Formset initial data", 3, function() {
  // We can also prefill a FormSet with existing data by providing an "initial"
  // argument to the constructor, which should be a list of objects. By
  // default, an extra blank form is included.
  var initial = [{choice: "Calexico", votes: 100}]
  formset = new ChoiceFormSet({initial: initial, autoId: false, prefix: "choices"})
  reactHTMLEqual(renderAll(formset.forms()),
'<div>\
<div>Choice: <input type="text" name="choices-0-choice" value="Calexico"/></div>\
<div>Votes: <input type="number" name="choices-0-votes" value="100"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices-1-choice"/></div>\
<div>Votes: <input type="number" name="choices-1-votes"/></div>\
</div>')

  // Let's simulate what happens if we submitted this form
  var data = {
    "choices-TOTAL_FORMS": "2"
  , "choices-INITIAL_FORMS": "1"
  , "choices-MAX_NUM_FORMS": "0"
  , "choices-0-choice": "Calexico"
  , "choices-0-votes": "100"
  , "choices-1-choice": ""
  , "choices-1-votes": ""
  }
  var formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"})
  strictEqual(formset.isValid(), true)
  deepEqual(formset.cleanedData(), [{choice: "Calexico", votes: 100}])
})

QUnit.test("Second form partially filled", 2, function() {
  // But the second form was blank! Shouldn't we get some errors? No. If we
  // display a form as blank, it's ok for it to be submitted as blank. If we
  // fill out even one of the fields of a blank form though, it will be
  // validated. We may want to require that at least x number of forms are
  // completed, but we'll show how to handle that later.
  var data = {
    "choices-TOTAL_FORMS": "2"
  , "choices-INITIAL_FORMS": "1"
  , "choices-MAX_NUM_FORMS": "0"
  , "choices-0-choice": "Calexico"
  , "choices-0-votes": "100"
  , "choices-1-choice": "The Decemberists"
  , "choices-1-votes": "" // Missing value
  }
  var formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"})
  strictEqual(formset.isValid(), false)
  deepEqual([formset.errors()[0].isPopulated(), formset.errors()[1].get("votes").messages()],
      [false, ["This field is required."]])
})

QUnit.test("Delete prefilled data", 2, function() {
  // If we delete data that was pre-filled, we should get an error. Simply
  // removing data from form fields isn't the proper way to delete it. We'll
  // see how to handle that case later.
  var data = {
    "choices-TOTAL_FORMS": "2"
  , "choices-INITIAL_FORMS": "1"
  , "choices-MAX_NUM_FORMS": "0"
  , "choices-0-choice": "" // Deleted value
  , "choices-0-votes": "" // Deleted value
  , "choices-1-choice": ""
  , "choices-1-votes": ""
  }
  var formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"})
  strictEqual(formset.isValid(), false)
  deepEqual([formset.errors()[0].get("choice").messages(), formset.errors()[0].get("votes").messages()],
      [["This field is required."], ["This field is required."]])
})

// We can also display more than 1 empty form at a time. To do so, pass an
// "extra" argument to FormSet.
var MoreChoiceFormSet = forms.FormSet.extend({form: ChoiceForm, extra: 3})

QUnit.test("Displaying more than one blank form", 3, function() {
  var formset = new MoreChoiceFormSet({autoId: false, prefix: "choices"})
  reactHTMLEqual(renderAll(formset.forms()),
'<div>\
<div>Choice: <input type="text" name="choices-0-choice"/></div>\
<div>Votes: <input type="number" name="choices-0-votes"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices-1-choice"/></div>\
<div>Votes: <input type="number" name="choices-1-votes"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices-2-choice"/></div>\
<div>Votes: <input type="number" name="choices-2-votes"/></div>\
</div>')

  var data = {
    "choices-TOTAL_FORMS": "3"
  , "choices-INITIAL_FORMS": "0"
  , "choices-MAX_NUM_FORMS": "0"
  , "choices-0-choice": ""
  , "choices-0-votes": ""
  , "choices-1-choice": ""
  , "choices-1-votes": ""
  , "choices-2-choice": ""
  , "choices-2-votes": ""
  }
  formset = new MoreChoiceFormSet({data: data, autoId: false, prefix: "choices"})
  strictEqual(formset.isValid(), true)
  deepEqual(formset.cleanedData(), [])
})

QUnit.test("Single form completed", 2, function() {
  // We can just fill in one of the forms
  var data = {
    "choices-TOTAL_FORMS": "3"
  , "choices-INITIAL_FORMS": "0"
  , "choices-MAX_NUM_FORMS": "0"
  , "choices-0-choice": "Calexico"
  , "choices-0-votes": "100"
  , "choices-1-choice": ""
  , "choices-1-votes": ""
  , "choices-2-choice": ""
  , "choices-2-votes": ""
  }
  var formset = new MoreChoiceFormSet({data: data, autoId: false, prefix: "choices"})
  strictEqual(formset.isValid(), true)
  deepEqual(formset.cleanedData(), [{choice: "Calexico", votes: 100}])
})

QUnit.test("Second form partially filled", 2, function() {
  // And once again, if we try to partially complete a form, validation will
  // fail.
  var data = {
    "choices-TOTAL_FORMS": "3"
  , "choices-INITIAL_FORMS": "0"
  , "choices-MAX_NUM_FORMS": "0"
  , "choices-0-choice": "Calexico"
  , "choices-0-votes": "100"
  , "choices-1-choice": "The Decemberists"
  , "choices-1-votes": "" // Missing value
  , "choices-2-choice": ""
  , "choices-2-votes": ""
  }
  var formset = new MoreChoiceFormSet({data: data, autoId: false, prefix: "choices"})
  strictEqual(formset.isValid(), false)
  deepEqual([formset.errors()[0].isPopulated(), formset.errors()[1].get("votes").messages(), formset.errors()[2].isPopulated()],
       [false, ["This field is required."], false])
})

QUnit.test("More initial data", 3, function() {
  // The "extra" argument also works when the formset is pre-filled with
  // initial data.
  var initial = [{choice: "Calexico", votes: 100}]
  var formset = new MoreChoiceFormSet({initial: initial, autoId: false, prefix: "choices"})
  reactHTMLEqual(renderAll(formset.forms()),
'<div>\
<div>Choice: <input type="text" name="choices-0-choice" value="Calexico"/></div>\
<div>Votes: <input type="number" name="choices-0-votes" value="100"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices-1-choice"/></div>\
<div>Votes: <input type="number" name="choices-1-votes"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices-2-choice"/></div>\
<div>Votes: <input type="number" name="choices-2-votes"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices-3-choice"/></div>\
<div>Votes: <input type="number" name="choices-3-votes"/></div>\
</div>')

  // Make sure retrieving an empty form works, and it shows up in the form list.
  strictEqual(formset.emptyForm().emptyPermitted, true)
  reactHTMLEqual(React.createElement(RenderForm, {form: formset.emptyForm()}),
'<div>\
<div>Choice: <input type="text" name="choices-__prefix__-choice"/></div>\
<div>Votes: <input type="number" name="choices-__prefix__-votes"/></div>\
</div>')
})

QUnit.test("FormSet with deletion", 6, function() {
  // We can easily add deletion ability to a FormSet with an argument to
  // FormSet. This will add a BooleanField to each form instance. When
  // true, the form will be in formset.deletedForms.
  var DeleteChoiceFormSet = forms.FormSet.extend({form: ChoiceForm, canDelete: true})

  var initial = [{choice: "Calexico", votes: 100}, {choice: "Fergie", votes: 900}]
  var formset = new DeleteChoiceFormSet({initial: initial, autoId: false, prefix: "choices"})
  reactHTMLEqual(renderAll(formset.forms()),
'<div>\
<div>Choice: <input type="text" name="choices-0-choice" value="Calexico"/></div>\
<div>Votes: <input type="number" name="choices-0-votes" value="100"/></div>\
<div>Delete: <input type="checkbox" name="choices-0-DELETE"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices-1-choice" value="Fergie"/></div>\
<div>Votes: <input type="number" name="choices-1-votes" value="900"/></div>\
<div>Delete: <input type="checkbox" name="choices-1-DELETE"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices-2-choice"/></div>\
<div>Votes: <input type="number" name="choices-2-votes"/></div>\
<div>Delete: <input type="checkbox" name="choices-2-DELETE"/></div>\
</div>')

  // To delete something, we just need to set that form's special delete field
  // to "on". Let's go ahead and delete Fergie.
  var data = {
    "choices-TOTAL_FORMS": "3"
  , "choices-INITIAL_FORMS": "2"
  , "choices-MAX_NUM_FORMS": "0"
  , "choices-0-choice": "Calexico"
  , "choices-0-votes": "100"
  , "choices-0-DELETE": ""
  , "choices-1-choice": "Fergie"
  , "choices-1-votes": "900"
  , "choices-1-DELETE": "on"
  , "choices-2-choice": ""
  , "choices-2-votes": ""
  , "choices-2-DELETE": ""
  }

  formset = new DeleteChoiceFormSet({data: data, autoId: false, prefix: "choices"})
  strictEqual(formset.isValid(), true)
  deepEqual(allCleanedData(formset.forms()),
      [{choice: "Calexico", votes: 100, DELETE: false}, {choice: "Fergie", votes: 900, DELETE: true}, {}])
  deepEqual(allCleanedData(formset.deletedForms()),
      [{choice: "Fergie", votes: 900, DELETE: true}])

  // If we fill a form with something and then we check the canDelete checkbox
  // for that form, that form's errors should not make the entire formset
  // invalid since it's going to be deleted.
  var CheckForm = forms.Form.extend({
    field: forms.IntegerField({minValue: 100})
  })

  data = {
    "check-TOTAL_FORMS": "3"
  , "check-INITIAL_FORMS": "2"
  , "check-MAX_NUM_FORMS": "0"
  , "check-0-field": "200"
  , "check-0-DELETE": ""
  , "check-1-field": "50"
  , "check-1-DELETE": "on"
  , "check-2-field": ""
  , "check-2-DELETE": ""
  }
  var CheckFormSet = forms.FormSet.extend({form: CheckForm, canDelete: true})
  formset = new CheckFormSet({data: data, prefix: "check"})
  strictEqual(formset.isValid(), true)

  // If we remove the deletion flag now we will have our validation back
  data["check-1-DELETE"] = ""
  formset = new CheckFormSet({data: data, prefix: "check"})
  strictEqual(formset.isValid(), false)
})

// We can also add ordering ability to a FormSet with an argument to
// FormSet. This will add a integer field to each form instance. When
// form validation succeeds, formset.orderedForms will have the data in the
// correct order specified by the ordering fields. If a number is duplicated
// in the set of ordering fields, for instance form 0 and form 3 are both
// marked as 1, then the form index is used as a secondary ordering
// criteria. In order to put something at the front of the list, you'd need
// to set its order to 0.
var OrderChoiceFormSet = forms.FormSet.extend({form: ChoiceForm, canOrder: true})

QUnit.test("FormSets with ordering", 3, function() {
  var initial = [{choice: "Calexico", votes: 100}, {choice: "Fergie", votes: 900}]
  var formset = new OrderChoiceFormSet({initial: initial, autoId: false, prefix: "choices"})
  reactHTMLEqual(renderAll(formset.forms()),
'<div>\
<div>Choice: <input type="text" name="choices-0-choice" value="Calexico"/></div>\
<div>Votes: <input type="number" name="choices-0-votes" value="100"/></div>\
<div>Order: <input type="number" name="choices-0-ORDER" value="1"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices-1-choice" value="Fergie"/></div>\
<div>Votes: <input type="number" name="choices-1-votes" value="900"/></div>\
<div>Order: <input type="number" name="choices-1-ORDER" value="2"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices-2-choice"/></div>\
<div>Votes: <input type="number" name="choices-2-votes"/></div>\
<div>Order: <input type="number" name="choices-2-ORDER"/></div>\
</div>')

  var data = {
    "choices-TOTAL_FORMS": "3"
  , "choices-INITIAL_FORMS": "2"
  , "choices-MAX_NUM_FORMS": "0"
  , "choices-0-choice": "Calexico"
  , "choices-0-votes": "100"
  , "choices-0-ORDER": "1"
  , "choices-1-choice": "Fergie"
  , "choices-1-votes": "900"
  , "choices-1-ORDER": "2"
  , "choices-2-choice": "The Decemberists"
  , "choices-2-votes": "500"
  , "choices-2-ORDER": "0"
  }
  formset = new OrderChoiceFormSet({data: data, autoId: false, prefix: "choices"})
  strictEqual(formset.isValid(), true)
  deepEqual(allCleanedData(formset.orderedForms()),
      [ {choice: "The Decemberists", votes: 500, ORDER: 0}
      , {choice: "Calexico", votes: 100, ORDER: 1}
      , {choice: "Fergie", votes: 900, ORDER: 2}])
})

QUnit.test("Empty ordered fields", 2, function() {
  // Ordering fields are allowed to be left blank, and if they *are* left
  // blank, they will be sorted below everything else.
  var data = {
    "choices-TOTAL_FORMS": "4"
  , "choices-INITIAL_FORMS": "3"
  , "choices-MAX_NUM_FORMS": "0"
  , "choices-0-choice": "Calexico"
  , "choices-0-votes": "100"
  , "choices-0-ORDER": "1"
  , "choices-1-choice": "Fergie"
  , "choices-1-votes": "900"
  , "choices-1-ORDER": "2"
  , "choices-2-choice": "The Decemberists"
  , "choices-2-votes": "500"
  , "choices-2-ORDER": ""
  , "choices-3-choice": "Basia Bulat"
  , "choices-3-votes": "50"
  , "choices-3-ORDER": ""
  }
  var formset = new OrderChoiceFormSet({data: data, autoId: false, prefix: "choices"})
  strictEqual(formset.isValid(), true)
  deepEqual(allCleanedData(formset.orderedForms()),
       [ {choice: "Calexico", votes: 100, ORDER: 1}
       , {choice: "Fergie", votes: 900, ORDER: 2}
       , {choice: "The Decemberists", votes: 500, ORDER: null}
       , {choice: "Basia Bulat", votes: 50, ORDER: null}])
})

QUnit.test("Ordering blank fieldsets", 2, function() {
  // Ordering should work with blank fieldsets
  var data = {
    "choices-TOTAL_FORMS": "3"
  , "choices-INITIAL_FORMS": "0"
  , "choices-MAX_NUM_FORMS": "0"
  }
  var formset = new OrderChoiceFormSet({data: data, autoId: false, prefix: "choices"})
  strictEqual(formset.isValid(), true)
  strictEqual(formset.orderedForms().length, 0)
})

QUnit.test("Formset with ordering and deletion", 4, function() {
  // Let's try throwing ordering and deletion into the same form
  var ChoiceFormSet = forms.FormSet.extend({form: ChoiceForm, canOrder: true, canDelete: true})

  var initial = [
    {choice: "Calexico", votes: 100}
  , {choice: "Fergie", votes: 900}
  , {choice: "The Decemberists", votes: 500}
  ]
  var formset = new ChoiceFormSet({initial: initial, autoId: false, prefix: "choices"})
  reactHTMLEqual(renderAll(formset.forms()),
'<div>\
<div>Choice: <input type="text" name="choices-0-choice" value="Calexico"/></div>\
<div>Votes: <input type="number" name="choices-0-votes" value="100"/></div>\
<div>Order: <input type="number" name="choices-0-ORDER" value="1"/></div>\
<div>Delete: <input type="checkbox" name="choices-0-DELETE"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices-1-choice" value="Fergie"/></div>\
<div>Votes: <input type="number" name="choices-1-votes" value="900"/></div>\
<div>Order: <input type="number" name="choices-1-ORDER" value="2"/></div>\
<div>Delete: <input type="checkbox" name="choices-1-DELETE"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices-2-choice" value="The Decemberists"/></div>\
<div>Votes: <input type="number" name="choices-2-votes" value="500"/></div>\
<div>Order: <input type="number" name="choices-2-ORDER" value="3"/></div>\
<div>Delete: <input type="checkbox" name="choices-2-DELETE"/></div>\
</div>\
<div>\
<div>Choice: <input type="text" name="choices-3-choice"/></div>\
<div>Votes: <input type="number" name="choices-3-votes"/></div>\
<div>Order: <input type="number" name="choices-3-ORDER"/></div>\
<div>Delete: <input type="checkbox" name="choices-3-DELETE"/></div>\
</div>')

  // Let's delete Fergie, and put The Decemberists ahead of Calexico
  var data = {
    "choices-TOTAL_FORMS": "4"
  , "choices-INITIAL_FORMS": "3"
  , "choices-MAX_NUM_FORMS": "0"
  , "choices-0-choice": "Calexico"
  , "choices-0-votes": "100"
  , "choices-0-ORDER": "1"
  , "choices-0-DELETE": ""
  , "choices-1-choice": "Fergie"
  , "choices-1-votes": "900"
  , "choices-1-ORDER": "2"
  , "choices-1-DELETE": "on"
  , "choices-2-choice": "The Decemberists"
  , "choices-2-votes": "500"
  , "choices-2-ORDER": "0"
  , "choices-2-DELETE": ""
  , "choices-3-choice": ""
  , "choices-3-votes": ""
  , "choices-3-ORDER": ""
  , "choices-3-DELETE": ""
  }
  formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"})
  strictEqual(formset.isValid(), true)
  deepEqual(allCleanedData(formset.orderedForms()),
       [{choice: "The Decemberists", votes: 500, ORDER: 0, DELETE: false},
        {choice: "Calexico", votes: 100, ORDER: 1, DELETE: false}])
  deepEqual(allCleanedData(formset.deletedForms()),
       [{choice: "Fergie", votes: 900, ORDER: 2, DELETE: true}])
})

QUnit.test("Invalid deleted form with ordering", 2, function() {
  // Should be able to get ordered forms from a valid formset even if a
  // deleted form would have been invalid.
  var PersonForm = forms.Form.extend({
    name: forms.CharField()
  })
  var PeopleFormSet = forms.FormSet.extend({form: PersonForm, canDelete: true, canOrder: true})
  var p = new PeopleFormSet({data: {
    "form-0-name": ""
  , "form-0-DELETE": "on" // no name!
  , "form-TOTAL_FORMS": 1
  , "form-INITIAL_FORMS": 1
  , "form-MAX_NUM_FORMS": 1
  }})

  strictEqual(p.isValid(), true)
  deepEqual(p.orderedForms(), [])
})

// FormSets have a hook for doing extra validation that shouldn't be tied to
// any particular form. It follows the same pattern as the clean hook on
// Forms.
// Let's define a FormSet that takes a list of favourite drinks, but throws an
// exception if there are any duplicates. Used to test clean hooks, ands Django
// regressions 6926 and 12878.
var FavouriteDrinksFormSet = forms.FormSet.extend({
  form: FavouriteDrinkForm,
  extra: 3,

  clean: function() {
    var seenDrinks = {}
    for (var i = 0, l = this.cleanedData().length; i < l; i++) {
      if (typeof seenDrinks[this.cleanedData()[i].name] != "undefined") {
        throw forms.ValidationError("You may only specify a drink once.")
      }
      seenDrinks[this.cleanedData()[i].name] = true
    }
  }
})

QUnit.test("Clean hook", 10, function() {
  function cleanTests(formsetConstructor) {
    // We start out with some duplicate data
    var data = {
      "drinks-TOTAL_FORMS": "2"
    , "drinks-INITIAL_FORMS": "0"
    , "drinks-MAX_NUM_FORMS": "0"
    , "drinks-0-name": "Gin and Tonic"
    , "drinks-1-name": "Gin and Tonic"
    }

    var formset = new formsetConstructor({data: data, prefix: "drinks"})
    strictEqual(formset.isValid(), false)

    // Any errors raised by formset.clean() are available via the
    // formset.nonFormErrors() method.
    deepEqual(formset.nonFormErrors().messages(), ["You may only specify a drink once."])

    // Make sure we didn't break the valid case
    data = {
      "drinks-TOTAL_FORMS": "2"
    , "drinks-INITIAL_FORMS": "0"
    , "drinks-MAX_NUM_FORMS": "0"
    , "drinks-0-name": "Gin and Tonic"
    , "drinks-1-name": "Bloody Mary"
    }

    var formset = new formsetConstructor({data: data, prefix: "drinks"})
    strictEqual(formset.isValid(), true)
    strictEqual(formset.nonFormErrors().isPopulated(), false)
  }

  cleanTests(FavouriteDrinksFormSet)

  // Alternatively, for one-off formsets, a more convenient method is to
  // specify custom methods for the formset in the configuration object
  // passed to FormSet.
  FavouriteDrinksFormSet = forms.FormSet.extend({
    form: FavouriteDrinkForm,
    extra: 3,
    clean: function() {
      var seenDrinks = {}
      for (var i = 0, l = this.cleanedData().length; i < l; i++) {
        if (typeof seenDrinks[this.cleanedData()[i].name] != "undefined") {
          throw forms.ValidationError("You may only specify a drink once.")
        }
        seenDrinks[this.cleanedData()[i].name] = true
      }
    }
  })

  cleanTests(FavouriteDrinksFormSet)

  // Formset-wide errors should render properly as HTML.
  var data = {
    "drinks-TOTAL_FORMS": "2"
  , "drinks-INITIAL_FORMS": "0"
  , "drinks-MAX_NUM_FORMS": "0"
  , "drinks-0-name": "Gin and Tonic"
  , "drinks-1-name": "Gin and Tonic"
  }
  var formset = new FavouriteDrinksFormSet({data: data, prefix: "drinks"})
  strictEqual(formset.isValid(), false)
  reactHTMLEqual(formset.nonFormErrors().render(),
    '<ul class="errorlist"><li>You may only specify a drink once.</li></ul>')
})

QUnit.test('Adding errors with addError', 2, function() {
  // You can also add errors outside the cleaning process, but is assumed you've
  // already cleanted the form.
  var data = {
    "drinks-TOTAL_FORMS": "2"
  , "drinks-INITIAL_FORMS": "0"
  , "drinks-MAX_NUM_FORMS": "0"
  , "drinks-0-name": "Gin and Tonic"
  , "drinks-1-name": "Bloody Mary"
  }

  var formset = new FavouriteDrinksFormSet({data: data, prefix: "drinks"})
  strictEqual(formset.isValid(), true)
  formset.addError('I am allergic to tomatoes.')
  deepEqual(formset.nonFormErrors().messages(), ['I am allergic to tomatoes.'])
})

QUnit.test("Limiting max forms", 4, function() {
  // When not passed, maxNum will take its default value of null, i.e. unlimited
  // number of forms, only controlled by the value of the extra parameter.
  var formset = new forms.FormSet({form: FavouriteDrinkForm, extra: 3})
  reactHTMLEqual(renderAll.bind(null, formset.forms()),
'<div>\
<div><label for="id_form-0-name">Name:</label> <input type="text" name="form-0-name" id="id_form-0-name"/></div>\
</div>\
<div>\
<div><label for="id_form-1-name">Name:</label> <input type="text" name="form-1-name" id="id_form-1-name"/></div>\
</div>\
<div>\
<div><label for="id_form-2-name">Name:</label> <input type="text" name="form-2-name" id="id_form-2-name"/></div>\
</div>')

  // If maxNum is 0 then no form is rendered at all
  formset = new forms.FormSet({form: FavouriteDrinkForm, extra: 3, maxNum: 0})
  reactHTMLEqual(renderAll(formset.forms()), "")

  formset = new forms.FormSet({form: FavouriteDrinkForm, extra: 5, maxNum: 2})
  reactHTMLEqual(renderAll.bind(null, formset.forms()),
'<div>\
<div><label for="id_form-0-name">Name:</label> <input type="text" name="form-0-name" id="id_form-0-name"/></div>\
</div>\
<div>\
<div><label for="id_form-1-name">Name:</label> <input type="text" name="form-1-name" id="id_form-1-name"/></div>\
</div>')

  // Ensure that maxNum has no affect when extra is less than maxNum
  formset = new forms.FormSet({form: FavouriteDrinkForm, extra: 1, maxNum: 2})
  reactHTMLEqual(renderAll.bind(null, formset.forms()),
'<div>\
<div><label for="id_form-0-name">Name:</label> <input type="text" name="form-0-name" id="id_form-0-name"/></div>\
</div>')
})

QUnit.test("Max num with initial data", 2, function() {
  // More initial forms than max_num will result in only the first maxNum of
  // being displayed, with no extra forms.
  var initial = [
    {name: "Gin and Tonic"}
  , {name: "Bloody Mary"}
  , {name: "Jack and Coke"}
  ]
  var formset =  new forms.FormSet({form: FavouriteDrinkForm, extra: 1, maxNum: 2, initial: initial})
  reactHTMLEqual(renderAll.bind(null, formset.forms()),
'<div>\
<div><label for="id_form-0-name">Name:</label> <input type="text" name="form-0-name" id="id_form-0-name" value="Gin and Tonic"/></div>\
</div>\
<div>\
<div><label for="id_form-1-name">Name:</label> <input type="text" name="form-1-name" id="id_form-1-name" value="Bloody Mary"/></div>\
</div>')

  // One form from initial and extra=3 with maxNum=2 should result in the one
  // initial form and one extra.
  initial = [
    {name: "Gin and Tonic"}
  ]
  formset = new forms.FormSet({form: FavouriteDrinkForm, extra:3, maxNum: 2, initial: initial})
  reactHTMLEqual(renderAll.bind(null, formset.forms()),
'<div>\
<div><label for="id_form-0-name">Name:</label> <input type="text" name="form-0-name" id="id_form-0-name" value="Gin and Tonic"/></div>\
</div>\
<div>\
<div><label for="id_form-1-name">Name:</label> <input type="text" name="form-1-name" id="id_form-1-name"/></div>\
</div>')

})

QUnit.test("maxNum zero", 1, function() {
  // If maxNum is 0 then no form is rendered at all, even if extra and initial
  // are specified..
  var initial = [
    {"name": "Fernet and Coke"}
  , {"name": "Bloody Mary"}
  ]
  var formset = new forms.FormSet({form: FavouriteDrinkForm, extra: 1, maxNum: 0, initial: initial})
  reactHTMLEqual(renderAll(formset.forms()), "")
})

QUnit.test("Nore initial than maxNum", 2, function() {
  // More initial forms than maxNum will result in only the first maxNum of
  // them being displayed, with no extra forms.
  var initial = [
    {"name": "Fernet and Coke"}
  , {"name": "Bloody Mary"}
  , {"name": "Jack and Coke"}
  ]
  var formset = new forms.FormSet({form: FavouriteDrinkForm, extra: 1, maxNum: 2, initial: initial})
  reactHTMLEqual(renderAll.bind(null, formset.forms()),
'<div>\
<div><label for="id_form-0-name">Name:</label> <input type="text" name="form-0-name" id="id_form-0-name" value="Fernet and Coke"/></div>\
</div>\
<div>\
<div><label for="id_form-1-name">Name:</label> <input type="text" name="form-1-name" id="id_form-1-name" value="Bloody Mary"/></div>\
</div>')

  // One form from initial and extra=3 with max_num=2 should result in the one
  // initial form and one extra.
  initial = [
    {"name": "Gin Tonic"}
  ]
  var formset =  new forms.FormSet({form: FavouriteDrinkForm, extra: 1, maxNum: 2, initial: initial})
  reactHTMLEqual(renderAll.bind(null, formset.forms()),
'<div>\
<div><label for="id_form-0-name">Name:</label> <input type="text" name="form-0-name" id="id_form-0-name" value="Gin Tonic"/></div>\
</div>\
<div>\
<div><label for="id_form-1-name">Name:</label> <input type="text" name="form-1-name" id="id_form-1-name"/></div>\
</div>')
})

//Regression tests for Django issue #6926
QUnit.test("Management form prefix", 3, function() {
  // Make sure the management form has the correct prefix
  var formset = new FavouriteDrinksFormSet()
  equal(formset.managementForm().prefix, "form")

  var data = {
    "form-TOTAL_FORMS": "2"
  , "form-INITIAL_FORMS": "0"
  , "form-MAX_NUM_FORMS": "0"
  }
  formset = new FavouriteDrinksFormSet({data: data})
  equal(formset.managementForm().prefix, "form")

  formset = new FavouriteDrinksFormSet({initial: {}})
  equal(formset.managementForm().prefix, "form")
})

// Regression tests for Django issue #12878
QUnit.test("Formset clean errors", 2, function() {
  var data = {
    "drinks-TOTAL_FORMS": "2"
  , "drinks-INITIAL_FORMS": "0"
  , "drinks-MAX_NUM_FORMS": "0"
  , "drinks-0-name": "Gin and Tonic"
  , "drinks-1-name": "Gin and Tonic"
  }
  var formset = new FavouriteDrinksFormSet({data: data, prefix: "drinks"})
  strictEqual(formset.isValid(), false)
  deepEqual(formset.nonFormErrors().messages(), ["You may only specify a drink once."])
})

QUnit.test("Formset with SplitDateTimeField", 1, function() {
  var SplitDateTimeForm = forms.Form.extend({
    when: forms.SplitDateTimeField({initial: function() { return new Date() }})
  })
  var data = {
    'form-TOTAL_FORMS': '1'
  , 'form-INITIAL_FORMS': '0'
  , 'form-0-when_0': '1904-06-16'
  , 'form-0-when_1': '15:51:33'
  }
  var formset = new forms.FormSet({form: SplitDateTimeForm, data: data})
  strictEqual(formset.isValid(), true);
})

QUnit.test("Formset error constructor", 1, function() {
  var CustomErrorList = forms.ErrorList.extend({})
  var formset = new FavouriteDrinksFormSet({errorConstructor: CustomErrorList})
  strictEqual(formset.forms()[0].errorConstructor, CustomErrorList)
})

QUnit.test("Formset calls isValid on every form", 2, function() {
  var AnotherChoiceForm = ChoiceForm.extend({
    isValid: function() {
      this.isValidCalled = true
      return ChoiceForm.prototype.isValid.call(this)
    }
  })
  var data = {
    'choices-TOTAL_FORMS': '1'
  , 'choices-INITIAL_FORMS': '0'
  , 'choices-MIN_NUM_FORMS': '0'
  , 'choices-MAX_NUM_FORMS': '0'
  , 'choices-0-choice': 'Calexico'
  , 'choices-0-votes': '100'
  }
  var formset = new forms.FormSet({form: AnotherChoiceForm, data: data, autoId: false, prefix: 'choices'})
  strictEqual(formset.isValid(), true)
  var wasIsValidCalled = true
  formset.forms().forEach(function(form) {
    if (!form.isValidCalled) { wasIsValidCalled = false }
  })
  strictEqual(wasIsValidCalled, true)
})

var renderTestData = {
  "choices-TOTAL_FORMS": "1"
, "choices-INITIAL_FORMS": "0"
, "choices-MIN_NUM_FORMS": "0"
, "choices-MAX_NUM_FORMS": "0"
, "choices-0-choice": "Calexico"
, "choices-0-votes": "100"
}

QUnit.test("Management form CSS class", 1, function() {
  var formset = new ChoiceFormSet({data: renderTestData, autoId: false, prefix: "choices", managementFormCssClass: "managementForm"})
  reactHTMLEqual(React.createElement(RenderFormSet, {formset: formset, useManagementForm: true}),
'<div>\
<div><div>Choice: <input type="text" name="choices-0-choice" value="Calexico"/></div>\
<div>Votes: <input type="number" name="choices-0-votes" value="100"/></div>\
</div>\
<div>\
<div class="managementForm" style="display:none;">\
<input type="hidden" name="choices-TOTAL_FORMS" value="1"/>\
<input type="hidden" name="choices-INITIAL_FORMS" value="0"/>\
<input type="hidden" name="choices-MIN_NUM_FORMS" value="0"/>\
<input type="hidden" name="choices-MAX_NUM_FORMS" value="0"\
/></div>\
</div>\
</div>')
})

// 3 Regression tests for Django issue #11418
var ArticleForm = forms.Form.extend({
  title: forms.CharField()
, pub_date: forms.DateField()
})

var ArticleFormSet = forms.FormSet.extend({form: ArticleForm})

QUnit.test("No data throws ValidationError", 1, function() {
  throws(function() { new ArticleFormSet({data: {}}).isValid() })
})

QUnit.test("With management data works fine", 7, function() {
  var data = {
    "form-TOTAL_FORMS": "1"
  , "form-INITIAL_FORMS": "0"
  }
  var formset = new ArticleFormSet({data: data})
  strictEqual(formset.initialFormCount(), 0)
  strictEqual(formset.totalFormCount(), 1)
  strictEqual(formset.isInitialRender, false)
  strictEqual(formset.forms()[0].isInitialRender, false)
  strictEqual(formset.isValid(), true)
  strictEqual(formset.forms()[0].isValid(), true)
  deepEqual(formset.cleanedData(), [])
})

QUnit.test("Form errors are caught by FormSet", 4, function() {
  var data = {
    "form-TOTAL_FORMS": "2"
  , "form-INITIAL_FORMS": "0"
  , "form-0-title": "Test"
  , "form-0-pub_date": "1904-06-16"
  , "form-1-title": "Test"
  , "form-1-pub_date": "" // Missing, but required
  }
  var formset = new ArticleFormSet({data: data})
  strictEqual(formset.isValid(), false)
  strictEqual(formset.errors()[0].isPopulated(), false)
  strictEqual(formset.errors()[1].isPopulated(), true)
  deepEqual(formset.errors()[1].get("pub_date").messages(), ["This field is required."])
})

QUnit.test("Empty forms are unbound", 3, function() {
  var data = {
    "form-TOTAL_FORMS": "1"
  , "form-INITIAL_FORMS": "0"
  , "form-0-title": "Test"
  , "form-0-pub_date": "1904-06-16"
  }
  var unboundFormset = new ArticleFormSet()
  var boundFormset = new ArticleFormSet({data: data})
  var emptyForms = [unboundFormset.emptyForm(), boundFormset.emptyForm()]
  // Empty forms should be unbound
  strictEqual(emptyForms[0].isInitialRender, true)
  strictEqual(emptyForms[1].isInitialRender, true)
  // The empty forms should be equal
  equal(ReactDOMServer.renderToStaticMarkup(React.createElement(RenderForm, {form: emptyForms[0]})),
        ReactDOMServer.renderToStaticMarkup(React.createElement(RenderForm, {form: emptyForms[1]})))
})

QUnit.test("Empty formset is valid", 2, function() {
  // Test that an empty formset still calls clean()
  var EmptyFsetWontValidateFormset = forms.FormSet.extend({
    form: FavouriteDrinkForm,
    extra: 0,
    clean: function() {
      throw forms.ValidationError("Clean method called")
    }
  })
  var formset1 = new EmptyFsetWontValidateFormset({
    data: {
      'form-INITIAL_FORMS': '0'
    , 'form-TOTAL_FORMS': '0'
    }
  , prefix: "form"
  })
  var formset2 = new EmptyFsetWontValidateFormset({
    data: {
      'form-INITIAL_FORMS': '0'
    , 'form-TOTAL_FORMS': '1'
    , 'form-0-name': 'bah'
    }
  , prefix: "form"
  })
  strictEqual(formset1.isValid(), false)
  strictEqual(formset2.isValid(), false)
})

}()
