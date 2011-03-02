module("formsets");

(function()
{

var ChoiceForm = formFactory({
  choice: new CharField(),
  votes: new IntegerField()
});

// FormSet allows us to use multiple instance of the same form on 1 page.
// For now, the best way to create a FormSet is by using the formsetFactory
// function.
var ChoiceFormSet = formsetFactory(ChoiceForm);

var FavouriteDrinkForm = formFactory({
  name: new CharField()
});

// Utility methods for displaying results
function allAsUL(forms)
{
    var rendered = [];
    for (var i = 0, l = forms.length; i < l; i++)
        rendered.push(forms[i].asUL());
    return rendered.join("\n");
}

function allCleanedData(forms)
{
    var cleanedData = [];
    for (var i = 0, l = forms.length; i < l; i++)
        cleanedData.push(forms[i].cleanedData);
    return cleanedData;
}

test("Basic FormSet", function()
{
    expect(4);

    // A FormSet constructor takes the same arguments as Form. Let's create a
    // FormSet for adding data. By default, it displays 1 blank form. It can
    // display more, but we'll look at how to do so later.
    var formset = new ChoiceFormSet({autoId: false, prefix: "choices"});
    equal(""+formset,
"<tr><td colspan=\"2\"><input type=\"hidden\" name=\"choices-TOTAL_FORMS\" value=\"1\"><input type=\"hidden\" name=\"choices-INITIAL_FORMS\" value=\"0\"><input type=\"hidden\" name=\"choices-MAX_NUM_FORMS\"></td></tr>\n" +
"<tr><th>Choice:</th><td><input type=\"text\" name=\"choices-0-choice\"></td></tr>\n" +
"<tr><th>Votes:</th><td><input type=\"text\" name=\"choices-0-votes\"></td></tr>");

    // One thing to note is that there needs to be a special value in the data.
    // This value tells the FormSet how many forms were displayed so it can tell
    // how many forms it needs to clean and validate. You could use javascript
    // to create new forms on the client side, but they won't get validated
    // unless you increment the TOTAL_FORMS field appropriately.
    var data = {
        "choices-TOTAL_FORMS": "1", // The number of forms rendered
        "choices-INITIAL_FORMS": "0", // The number of forms with initial data
        "choices-MAX_NUM_FORMS": "0", // Max number of forms
        "choices-0-choice": "Calexico",
        "choices-0-votes": "100"
    };

    // We treat FormSet pretty much like we would treat a normal Form. FormSet
    // has an isValid method, and a cleanedData or errors attribute depending on
    // whether all the forms passed validation. However, unlike a Form instance,
    // cleaned_data and errors will be a list of objects rather than just a
    // single object.
    formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    strictEqual(formset.isValid(), true);
    deepEqual(formset.forms[0].cleanedData, {choice: "Calexico", votes: 100});

    // If a FormSet was not passed any data, its isValid method should return
    // false.
    formset = new ChoiceFormSet();
    strictEqual(formset.isValid(), false);
});

test("Formset validation", function()
{
    expect(2);
    // FormSet instances can also have an error attribute if validation failed for
    // any of the forms.
    var data = {
        "choices-TOTAL_FORMS": "1",
        "choices-INITIAL_FORMS": "0",
        "choices-MAX_NUM_FORMS": "0",
        "choices-0-choice": "Calexico",
        "choices-0-votes": ""
    };
    var formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    strictEqual(formset.isValid(), false);
    deepEqual(formset.errors()[0].get("votes").errors, ["This field is required."]);
});

test("Formset initial data", function()
{
    expect(3);
    // We can also prefill a FormSet with existing data by providing an "initial"
    // argument to the constructor, which should be a list of objects. By
    // default, an extra blank form is included.
    var initial = [{choice: "Calexico", votes: 100}];
    formset = new ChoiceFormSet({initial: initial, autoId: false, prefix: "choices"});
    equal(allAsUL(formset.forms),
"<li>Choice: <input type=\"text\" name=\"choices-0-choice\" value=\"Calexico\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-0-votes\" value=\"100\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-1-choice\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-1-votes\"></li>");

    // Let's simulate what happens if we submitted this form
    var data = {
        "choices-TOTAL_FORMS": "2",
        "choices-INITIAL_FORMS": "1",
        "choices-MAX_NUM_FORMS": "0",
        "choices-0-choice": "Calexico",
        "choices-0-votes": "100",
        "choices-1-choice": "",
        "choices-1-votes": ""
    };
    var formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    strictEqual(formset.isValid(), true);
    deepEqual(formset.cleanedData(),
         [{choice: "Calexico", votes: 100}, {}]);
});

test("Second form partially filled", function()
{
    expect(2);
    // But the second form was blank! Shouldn't we get some errors? No. If we
    // display a form as blank, it's ok for it to be submitted as blank. If we
    // fill out even one of the fields of a blank form though, it will be
    // validated. We may want to require that at least x number of forms are
    // completed, but we'll show how to handle that later.
    var data = {
        "choices-TOTAL_FORMS": "2",
        "choices-INITIAL_FORMS": "1",
        "choices-MAX_NUM_FORMS": "0",
        "choices-0-choice": "Calexico",
        "choices-0-votes": "100",
        "choices-1-choice": "The Decemberists",
        "choices-1-votes": "" // Missing value
    };
    var formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    strictEqual(formset.isValid(), false);
    deepEqual([formset.errors()[0].isPopulated(), formset.errors()[1].get("votes").errors],
         [false, ["This field is required."]]);
});

test("Delete prefilled data", function()
{
    expect(2);
    // If we delete data that was pre-filled, we should get an error. Simply
    // removing data from form fields isn't the proper way to delete it. We'll
    // see how to handle that case later.
    var data = {
        "choices-TOTAL_FORMS": "2",
        "choices-INITIAL_FORMS": "1",
        "choices-MAX_NUM_FORMS": "0",
        "choices-0-choice": "", // Deleted value
        "choices-0-votes": "", // Deleted value
        "choices-1-choice": "",
        "choices-1-votes": ""
    };
    var formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    strictEqual(formset.isValid(), false);
    deepEqual([formset.errors()[0].get("choice").errors, formset.errors()[0].get("votes").errors],
         [["This field is required."], ["This field is required."]]);
});

// We can also display more than 1 empty form at a time. To do so, pass an
// "extra" argument to formsetFactory.
var MoreChoiceFormSet = formsetFactory(ChoiceForm, {extra: 3});

test("Displaying more than one blank form", function()
{
    expect(3);

    var formset = new MoreChoiceFormSet({autoId: false, prefix: "choices"});
    equal(allAsUL(formset.forms),
"<li>Choice: <input type=\"text\" name=\"choices-0-choice\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-0-votes\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-1-choice\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-1-votes\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-2-choice\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-2-votes\"></li>");

    // Since we displayed every form as blank, we will also accept them back as
    // blank. This may seem a little strange, but later we will show how to
    // require a minimum number of forms to be completed.
    var data = {
        "choices-TOTAL_FORMS": "3",
        "choices-INITIAL_FORMS": "0",
        "choices-MAX_NUM_FORMS": "0",
        "choices-0-choice": "",
        "choices-0-votes": "",
        "choices-1-choice": "",
        "choices-1-votes": "",
        "choices-2-choice": "",
        "choices-2-votes": ""
    };
    formset = new MoreChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    strictEqual(formset.isValid(), true);
    deepEqual(formset.cleanedData(),
         [{}, {}, {}]);
});

test("Single form completed", function()
{
    expect(2);
    // We can just fill in one of the forms
    var data = {
        "choices-TOTAL_FORMS": "3",
        "choices-INITIAL_FORMS": "0",
        "choices-MAX_NUM_FORMS": "0",
        "choices-0-choice": "Calexico",
        "choices-0-votes": "100",
        "choices-1-choice": "",
        "choices-1-votes": "",
        "choices-2-choice": "",
        "choices-2-votes": ""
    };
    var formset = new MoreChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    strictEqual(formset.isValid(), true);
    deepEqual(formset.cleanedData(),
         [{choice: "Calexico", votes: 100}, {}, {}]);
});

test("Second form partially filled", function()
{
    expect(2);
    // And once again, if we try to partially complete a form, validation will
    // fail.
    var data = {
        "choices-TOTAL_FORMS": "3",
        "choices-INITIAL_FORMS": "0",
        "choices-MAX_NUM_FORMS": "0",
        "choices-0-choice": "Calexico",
        "choices-0-votes": "100",
        "choices-1-choice": "The Decemberists",
        "choices-1-votes": "", // Missing value
        "choices-2-choice": "",
        "choices-2-votes": ""
    };
    var formset = new MoreChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    strictEqual(formset.isValid(), false);
    deepEqual([formset.errors()[0].isPopulated(), formset.errors()[1].get("votes").errors, formset.errors()[2].isPopulated()],
         [false, ["This field is required."], false]);
});

test("More initial data", function()
{
    expect(3);
    // The "extra" argument also works when the formset is pre-filled with
    // initial data.
    var initial = [{choice: "Calexico", votes: 100}];
    var formset = new MoreChoiceFormSet({initial: initial, autoId: false, prefix: "choices"});
    equal(allAsUL(formset.forms),
"<li>Choice: <input type=\"text\" name=\"choices-0-choice\" value=\"Calexico\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-0-votes\" value=\"100\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-1-choice\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-1-votes\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-2-choice\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-2-votes\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-3-choice\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-3-votes\"></li>");

    // Make sure retrieving an empty form works, and it shows up in the form list.
    strictEqual(formset.emptyForm().emptyPermitted, true);
    equal(formset.emptyForm().asUL(),
"<li>Choice: <input type=\"text\" name=\"choices-__prefix__-choice\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-__prefix__-votes\"></li>");
});

test("FormSet with deletion", function()
{
    expect(6);

    // We can easily add deletion ability to a FormSet with an argument to
    // formsetFactory. This will add a BooleanField to each form instance. When
    // true, the form will be in formset.deletedForms.
    var DeleteChoiceFormSet = formsetFactory(ChoiceForm, {canDelete: true});

    var initial = [{choice: "Calexico", votes: 100}, {choice: "Fergie", votes: 900}];
    var formset = new DeleteChoiceFormSet({initial: initial, autoId: false, prefix: "choices"});
    equal(allAsUL(formset.forms),
"<li>Choice: <input type=\"text\" name=\"choices-0-choice\" value=\"Calexico\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-0-votes\" value=\"100\"></li>\n" +
"<li>Delete: <input type=\"checkbox\" name=\"choices-0-DELETE\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-1-choice\" value=\"Fergie\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-1-votes\" value=\"900\"></li>\n" +
"<li>Delete: <input type=\"checkbox\" name=\"choices-1-DELETE\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-2-choice\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-2-votes\"></li>\n" +
"<li>Delete: <input type=\"checkbox\" name=\"choices-2-DELETE\"></li>");

    // To delete something, we just need to set that form's special delete field
    // to "on". Let's go ahead and delete Fergie.
    var data = {
        "choices-TOTAL_FORMS": "3",
        "choices-INITIAL_FORMS": "2",
        "choices-MAX_NUM_FORMS": "0",
        "choices-0-choice": "Calexico",
        "choices-0-votes": "100",
        "choices-0-DELETE": "",
        "choices-1-choice": "Fergie",
        "choices-1-votes": "900",
        "choices-1-DELETE": "on",
        "choices-2-choice": "",
        "choices-2-votes": "",
        "choices-2-DELETE": ""
    };

    formset = new DeleteChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    strictEqual(formset.isValid(), true);
    deepEqual(formset.cleanedData(),
         [{choice: "Calexico", votes: 100, DELETE: false}, {choice: "Fergie", votes: 900, DELETE: true}, {}]);
    deepEqual(allCleanedData(formset.deletedForms()),
         [{choice: "Fergie", votes: 900, DELETE: true}]);

    // If we fill a form with something and then we check the canDelete checkbox
    // for that form, that form's errors should not make the entire formset
    // invalid since it's going to be deleted.
    var CheckForm = formFactory({
        field: new IntegerField({minValue: 100})
    });

    data = {
        "check-TOTAL_FORMS": "3",
        "check-INITIAL_FORMS": "2",
        "check-MAX_NUM_FORMS": "0",
        "check-0-field": "200",
        "check-0-DELETE": "",
        "check-1-field": "50",
        "check-1-DELETE": "on",
        "check-2-field": "",
        "check-2-DELETE": ""
    };
    var CheckFormSet = formsetFactory(CheckForm, {canDelete: true});
    formset = new CheckFormSet({data: data, prefix: "check"});
    strictEqual(formset.isValid(), true);

    // If we remove the deletion flag now we will have our validation back
    data["check-1-DELETE"] = "";
    formset = new CheckFormSet({data: data, prefix: "check"});
    strictEqual(formset.isValid(), false);
});

// We can also add ordering ability to a FormSet with an argument to
// formsetFactory. This will add a integer field to each form instance. When
// form validation succeeds, formset.orderedForms will have the data in the
// correct order specified by the ordering fields. If a number is duplicated
// in the set of ordering fields, for instance form 0 and form 3 are both
// marked as 1, then the form index is used as a secondary ordering
// criteria. In order to put something at the front of the list, you'd need
// to set its order to 0.
var OrderChoiceFormSet = formsetFactory(ChoiceForm, {canOrder: true});

test("FormSets with ordering", function()
{
    expect(3);

    var initial = [{choice: "Calexico", votes: 100}, {choice: "Fergie", votes: 900}];
    var formset = new OrderChoiceFormSet({initial: initial, autoId: false, prefix: "choices"});
    equal(allAsUL(formset.forms),
"<li>Choice: <input type=\"text\" name=\"choices-0-choice\" value=\"Calexico\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-0-votes\" value=\"100\"></li>\n" +
"<li>Order: <input type=\"text\" name=\"choices-0-ORDER\" value=\"1\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-1-choice\" value=\"Fergie\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-1-votes\" value=\"900\"></li>\n" +
"<li>Order: <input type=\"text\" name=\"choices-1-ORDER\" value=\"2\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-2-choice\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-2-votes\"></li>\n" +
"<li>Order: <input type=\"text\" name=\"choices-2-ORDER\"></li>");

    var data = {
        "choices-TOTAL_FORMS": "3",
        "choices-INITIAL_FORMS": "2",
        "choices-MAX_NUM_FORMS": "0",
        "choices-0-choice": "Calexico",
        "choices-0-votes": "100",
        "choices-0-ORDER": "1",
        "choices-1-choice": "Fergie",
        "choices-1-votes": "900",
        "choices-1-ORDER": "2",
        "choices-2-choice": "The Decemberists",
        "choices-2-votes": "500",
        "choices-2-ORDER": "0"
    };
    formset = new OrderChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    strictEqual(formset.isValid(), true);
    deepEqual(allCleanedData(formset.orderedForms()),
         [{choice: "The Decemberists", votes: 500, ORDER: 0},
          {choice: "Calexico", votes: 100, ORDER: 1},
          {choice: "Fergie", votes: 900, ORDER: 2}]);
});

test("Empty ordered fields", function()
{
    expect(2);
    // Ordering fields are allowed to be left blank, and if they *are* left
    // blank, they will be sorted below everything else.
    var  data = {
        "choices-TOTAL_FORMS": "4",
        "choices-INITIAL_FORMS": "3",
        "choices-MAX_NUM_FORMS": "0",
        "choices-0-choice": "Calexico",
        "choices-0-votes": "100",
        "choices-0-ORDER": "1",
        "choices-1-choice": "Fergie",
        "choices-1-votes": "900",
        "choices-1-ORDER": "2",
        "choices-2-choice": "The Decemberists",
        "choices-2-votes": "500",
        "choices-2-ORDER": "",
        "choices-3-choice": "Basia Bulat",
        "choices-3-votes": "50",
        "choices-3-ORDER": ""
    };
    var formset = new OrderChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    strictEqual(formset.isValid(), true);
    deepEqual(allCleanedData(formset.orderedForms()),
         [{choice: "Calexico", votes: 100, ORDER: 1},
          {choice: "Fergie", votes: 900, ORDER: 2},
          {choice: "The Decemberists", votes: 500, ORDER: null},
          {choice: "Basia Bulat", votes: 50, ORDER: null}]);
});

test("Ordering blank fieldsets", function()
{
    expect(2);
    // Ordering should work with blank fieldsets
    var data = {
        "choices-TOTAL_FORMS": "3",
        "choices-INITIAL_FORMS": "0",
        "choices-MAX_NUM_FORMS": "0"
    };
    var formset = new OrderChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    strictEqual(formset.isValid(), true);
    strictEqual(formset.orderedForms().length, 0);
});

test("Formset with ordering and deletion", function()
{
    expect(4);

    // Let's try throwing ordering and deletion into the same form
    var ChoiceFormSet = formsetFactory(ChoiceForm, {canOrder: true, canDelete: true});

    var initial = [
        {choice: "Calexico", votes: 100},
        {choice: "Fergie", votes: 900},
        {choice: "The Decemberists", votes: 500}
    ];
    var formset = new ChoiceFormSet({initial: initial, autoId: false, prefix: "choices"});
    equal(allAsUL(formset.forms),
"<li>Choice: <input type=\"text\" name=\"choices-0-choice\" value=\"Calexico\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-0-votes\" value=\"100\"></li>\n" +
"<li>Order: <input type=\"text\" name=\"choices-0-ORDER\" value=\"1\"></li>\n" +
"<li>Delete: <input type=\"checkbox\" name=\"choices-0-DELETE\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-1-choice\" value=\"Fergie\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-1-votes\" value=\"900\"></li>\n" +
"<li>Order: <input type=\"text\" name=\"choices-1-ORDER\" value=\"2\"></li>\n" +
"<li>Delete: <input type=\"checkbox\" name=\"choices-1-DELETE\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-2-choice\" value=\"The Decemberists\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-2-votes\" value=\"500\"></li>\n" +
"<li>Order: <input type=\"text\" name=\"choices-2-ORDER\" value=\"3\"></li>\n" +
"<li>Delete: <input type=\"checkbox\" name=\"choices-2-DELETE\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-3-choice\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-3-votes\"></li>\n" +
"<li>Order: <input type=\"text\" name=\"choices-3-ORDER\"></li>\n" +
"<li>Delete: <input type=\"checkbox\" name=\"choices-3-DELETE\"></li>");

    // Let's delete Fergie, and put The Decemberists ahead of Calexico
    var data = {
        "choices-TOTAL_FORMS": "4",
        "choices-INITIAL_FORMS": "3",
        "choices-MAX_NUM_FORMS": "0",
        "choices-0-choice": "Calexico",
        "choices-0-votes": "100",
        "choices-0-ORDER": "1",
        "choices-0-DELETE": "",
        "choices-1-choice": "Fergie",
        "choices-1-votes": "900",
        "choices-1-ORDER": "2",
        "choices-1-DELETE": "on",
        "choices-2-choice": "The Decemberists",
        "choices-2-votes": "500",
        "choices-2-ORDER": "0",
        "choices-2-DELETE": "",
        "choices-3-choice": "",
        "choices-3-votes": "",
        "choices-3-ORDER": "",
        "choices-3-DELETE": ""
    }
    formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    strictEqual(formset.isValid(), true);
    deepEqual(allCleanedData(formset.orderedForms()),
         [{choice: "The Decemberists", votes: 500, ORDER: 0, DELETE: false},
          {choice: "Calexico", votes: 100, ORDER: 1, DELETE: false}]);
    deepEqual(allCleanedData(formset.deletedForms()),
         [{choice: "Fergie", votes: 900, ORDER: 2, DELETE: true}]);
});

test("Invalid deleted form with ordering", function()
{
    expect(2);
    // Should be able to get ordered forms from a valid formset even if a
    // deleted form would have been invalid.
    var PersonForm = formFactory({
      name: new CharField()
    });
    var PeopleFormSet = formsetFactory(PersonForm, {canDelete: true, canOrder: true});
    var p = new PeopleFormSet({data: {
        "form-0-name": "",
        "form-0-DELETE": "on", // no name!
        "form-TOTAL_FORMS": 1,
        "form-INITIAL_FORMS": 1,
        "form-MAX_NUM_FORMS": 1
    }});

    strictEqual(p.isValid(), true);
    deepEqual(p.orderedForms(), []);
});

// FormSets have a hook for doing extra validation that shouldn't be tied to
// any particular form. It follows the same pattern as the clean hook on
// Forms.

// This is an example of creating a custom BaseFormSet for use with
// formsetFactory.
function BaseFavouriteDrinksFormSet(kwargs)
{
    BaseFormSet.call(this, kwargs);
}
inheritFrom(BaseFavouriteDrinksFormSet, BaseFormSet);
BaseFavouriteDrinksFormSet.prototype.clean = function()
{
    var seenDrinks = {};
    for (var i = 0, l = this.cleanedData().length; i < l; i++)
    {
        if (typeof seenDrinks[this.cleanedData()[i].name] != "undefined")
            throw new ValidationError("You may only specify a drink once.");
        seenDrinks[this.cleanedData()[i].name] = true;
    }
};

// Let's define a FormSet that takes a list of favourite drinks, but throws an
// exception if there are any duplicates. Used to test clean hooks, ands Django
// regressions 6926 and 12878.
var FavouriteDrinksFormSet = formsetFactory(FavouriteDrinkForm, {
    formset: BaseFavouriteDrinksFormSet,
    extra: 3
});

test("Clean hook", function()
{
    expect(10);

    function cleanTests(formsetConstructor)
    {
        // We start out with some duplicate data
        var data = {
            "drinks-TOTAL_FORMS": "2",
            "drinks-INITIAL_FORMS": "0",
            "drinks-MAX_NUM_FORMS": "0",
            "drinks-0-name": "Gin and Tonic",
            "drinks-1-name": "Gin and Tonic"
        };

        var formset = new formsetConstructor({data: data, prefix: "drinks"});
        strictEqual(formset.isValid(), false);

        // Any errors raised by formset.clean() are available via the
        // formset.nonFormErrors() method.
        deepEqual(formset.nonFormErrors().errors, ["You may only specify a drink once."]);

        // Make sure we didn't break the valid case
        data = {
            "drinks-TOTAL_FORMS": "2",
            "drinks-INITIAL_FORMS": "0",
            "drinks-MAX_NUM_FORMS": "0",
            "drinks-0-name": "Gin and Tonic",
            "drinks-1-name": "Bloody Mary"
        };

        var formset = new formsetConstructor({data: data, prefix: "drinks"});
        strictEqual(formset.isValid(), true);
        strictEqual(formset.nonFormErrors().isPopulated(), false);
    }

    cleanTests(FavouriteDrinksFormSet);

    // Alternatively, for one-off formsets, a more convenient method is to
    // specify custom methods for the formset in the configuration object
    // passed to formsetFactory.
    FavouriteDrinksFormSet = formsetFactory(FavouriteDrinkForm, {
        extra: 3,
        clean: function()
        {
            var seenDrinks = {};
            for (var i = 0, l = this.cleanedData().length; i < l; i++)
            {
                if (typeof seenDrinks[this.cleanedData()[i].name] != "undefined")
                {
                    throw new ValidationError("You may only specify a drink once.");
                }
                seenDrinks[this.cleanedData()[i].name] = true;
            }
        }
    });

    cleanTests(FavouriteDrinksFormSet);

    // Formset-wide errors should render properly as HTML.
    var data = {
        "drinks-TOTAL_FORMS": "2",
        "drinks-INITIAL_FORMS": "0",
        "drinks-MAX_NUM_FORMS": "0",
        "drinks-0-name": "Gin and Tonic",
        "drinks-1-name": "Gin and Tonic"
    };
    var formset = new FavouriteDrinksFormSet({data: data, prefix: "drinks"});
    strictEqual(formset.isValid(), false);
    equal(""+formset.nonFormErrors(), "<ul class=\"errorlist\"><li>You may only specify a drink once.</li></ul>");
});

test("Limiting max forms", function()
{
    expect(4);
    // When not passed, maxNum will take its default value of null, i.e. unlimited
    // number of forms, only controlled by the value of the extra parameter.
    var LimitedFavouriteDrinkFormSet = formsetFactory(FavouriteDrinkForm, {extra: 3});
    var formset = new LimitedFavouriteDrinkFormSet()
    equal(formset.forms.join("\n"),
"<tr><th><label for=\"id_form-0-name\">Name:</label></th><td><input type=\"text\" name=\"form-0-name\" id=\"id_form-0-name\"></td></tr>\n" +
"<tr><th><label for=\"id_form-1-name\">Name:</label></th><td><input type=\"text\" name=\"form-1-name\" id=\"id_form-1-name\"></td></tr>\n" +
"<tr><th><label for=\"id_form-2-name\">Name:</label></th><td><input type=\"text\" name=\"form-2-name\" id=\"id_form-2-name\"></td></tr>");

    // If maxNum is 0 then no form is rendered at all
    LimitedFavouriteDrinkFormSet = formsetFactory(FavouriteDrinkForm, {extra: 3, maxNum: 0});
    formset = new LimitedFavouriteDrinkFormSet()
    equal(formset.forms.join(""), "");

    LimitedFavouriteDrinkFormSet = formsetFactory(FavouriteDrinkForm, {extra: 5, maxNum: 2});
    formset = new LimitedFavouriteDrinkFormSet();
    equal(formset.forms.join("\n"),
"<tr><th><label for=\"id_form-0-name\">Name:</label></th><td><input type=\"text\" name=\"form-0-name\" id=\"id_form-0-name\"></td></tr>\n" +
"<tr><th><label for=\"id_form-1-name\">Name:</label></th><td><input type=\"text\" name=\"form-1-name\" id=\"id_form-1-name\"></td></tr>");

    // Ensure that maxNum has no affect when extra is less than maxNum
    LimitedFavouriteDrinkFormSet = formsetFactory(FavouriteDrinkForm, {extra: 1, maxNum: 2});
    formset = new LimitedFavouriteDrinkFormSet();
    equal(formset.forms.join("\n"),
"<tr><th><label for=\"id_form-0-name\">Name:</label></th><td><input type=\"text\" name=\"form-0-name\" id=\"id_form-0-name\"></td></tr>");
});

test("Max num with initial data", function()
{
    expect(2);
    // More initial forms than max_num will result in only the first maxNum of
    // being displayed, with no extra forms.
    var initial = [
        {name: "Gin and Tonic"},
        {name: "Bloody Mary"},
        {name: "Jack and Coke"}
    ];
    var LimitedFavouriteDrinkFormSet = formsetFactory(FavouriteDrinkForm, {extra: 1, maxNum: 2});
    var formset = new LimitedFavouriteDrinkFormSet({initial: initial});
    equal(formset.forms.join("\n"),
"<tr><th><label for=\"id_form-0-name\">Name:</label></th><td><input type=\"text\" name=\"form-0-name\" id=\"id_form-0-name\" value=\"Gin and Tonic\"></td></tr>\n" +
"<tr><th><label for=\"id_form-1-name\">Name:</label></th><td><input type=\"text\" name=\"form-1-name\" id=\"id_form-1-name\" value=\"Bloody Mary\"></td></tr>");

    // One form from initial and extra=3 with maxNum=2 should result in the one
    // initial form and one extra.
    initial = [
        {name: "Gin and Tonic"}
    ];
    LimitedFavouriteDrinkFormSet = formsetFactory(FavouriteDrinkForm, {extra:3, maxNum: 2});
    formset = new LimitedFavouriteDrinkFormSet({initial: initial});
    equal(formset.forms.join("\n"),
"<tr><th><label for=\"id_form-0-name\">Name:</label></th><td><input type=\"text\" name=\"form-0-name\" id=\"id_form-0-name\" value=\"Gin and Tonic\"></td></tr>\n" +
"<tr><th><label for=\"id_form-1-name\">Name:</label></th><td><input type=\"text\" name=\"form-1-name\" id=\"id_form-1-name\"></td></tr>");

});

test("maxNum zero", function()
{
    expect(1);
    // If maxNum is 0 then no form is rendered at all, even if extra and initial
    // are specified..
    var initial = [
        {"name": "Fernet and Coke"},
        {"name": "Bloody Mary"}
    ];
    var LimitedFavouriteDrinkFormSet = formsetFactory(FavouriteDrinkForm, {extra: 1, maxNum: 0});
    var formset = new LimitedFavouriteDrinkFormSet({initial: initial})
    form_output = []

    strictEqual(formset.forms.join("\n"), "");
});

test("Nore initial than maxNum", function()
{
    expect(2);
    // More initial forms than maxNum will result in only the first maxNum of
    // them being displayed, with no extra forms.
    var initial = [
        {"name": "Fernet and Coke"},
        {"name": "Bloody Mary"},
        {"name": "Jack and Coke"}
    ];
    var LimitedFavouriteDrinkFormSet = formsetFactory(FavouriteDrinkForm, {extra: 1, maxNum: 2});
    var formset = new LimitedFavouriteDrinkFormSet({initial: initial});
    strictEqual(formset.forms.join("\n"),
"<tr><th><label for=\"id_form-0-name\">Name:</label></th><td><input type=\"text\" name=\"form-0-name\" id=\"id_form-0-name\" value=\"Fernet and Coke\"></td></tr>\n" +
"<tr><th><label for=\"id_form-1-name\">Name:</label></th><td><input type=\"text\" name=\"form-1-name\" id=\"id_form-1-name\" value=\"Bloody Mary\"></td></tr>");

    // One form from initial and extra=3 with max_num=2 should result in the one
    // initial form and one extra.
    initial = [
        {"name": "Gin Tonic"}
    ];
    var LimitedFavouriteDrinkFormSet = formsetFactory(FavouriteDrinkForm, {extra: 1, maxNum: 2});
    var formset = new LimitedFavouriteDrinkFormSet({initial: initial});
    strictEqual(formset.forms.join("\n"),
"<tr><th><label for=\"id_form-0-name\">Name:</label></th><td><input type=\"text\" name=\"form-0-name\" id=\"id_form-0-name\" value=\"Gin Tonic\"></td></tr>\n" +
"<tr><th><label for=\"id_form-1-name\">Name:</label></th><td><input type=\"text\" name=\"form-1-name\" id=\"id_form-1-name\"></td></tr>");
});

//Regression tests for Django issue #6926
test("Management form prefix", function()
{
    expect(3);
    // Make sure the management form has the correct prefix
    var formset = new FavouriteDrinksFormSet()
    equal(formset.managementForm().prefix, "form");

    var data = {
        "form-TOTAL_FORMS": "2",
        "form-INITIAL_FORMS": "0",
        "form-MAX_NUM_FORMS": "0"
    };
    formset = new FavouriteDrinksFormSet({data: data});
    equal(formset.managementForm().prefix, "form");

    formset = new FavouriteDrinksFormSet({initial: {}});
    equal(formset.managementForm().prefix, "form");
});

// Regression tests for Django issue #regression_12878
test("Formset clean errors", function()
{
    expect(2);
    var data = {
        "drinks-TOTAL_FORMS": "2",
        "drinks-INITIAL_FORMS": "0",
        "drinks-MAX_NUM_FORMS": "0",
        "drinks-0-name": "Gin and Tonic",
        "drinks-1-name": "Gin and Tonic"
    };
    var formset = new FavouriteDrinksFormSet({data: data, prefix: "drinks"});
    strictEqual(formset.isValid(), false);
    deepEqual(formset.nonFormErrors().errors, ["You may only specify a drink once."]);
});

var remderTestData = {
    "choices-TOTAL_FORMS": "1",
    "choices-INITIAL_FORMS": "0",
    "choices-MAX_NUM_FORMS": "0",
    "choices-0-choice": "Calexico",
    "choices-0-votes": "100"
};

test("FormSet asTable", function()
{
    expect(1);
    equal(""+new ChoiceFormSet({data: remderTestData, autoId: false, prefix: "choices"}).asTable(),
"<tr><td colspan=\"2\"><input type=\"hidden\" name=\"choices-TOTAL_FORMS\" value=\"1\"><input type=\"hidden\" name=\"choices-INITIAL_FORMS\" value=\"0\"><input type=\"hidden\" name=\"choices-MAX_NUM_FORMS\" value=\"0\"></td></tr>\n" +
"<tr><th>Choice:</th><td><input type=\"text\" name=\"choices-0-choice\" value=\"Calexico\"></td></tr>\n" +
"<tr><th>Votes:</th><td><input type=\"text\" name=\"choices-0-votes\" value=\"100\"></td></tr>");
});

test("FormSet asP", function()
{
    expect(1);
    equal(""+new ChoiceFormSet({data: remderTestData, autoId: false, prefix: "choices"}).asP(),
"<div><input type=\"hidden\" name=\"choices-TOTAL_FORMS\" value=\"1\"><input type=\"hidden\" name=\"choices-INITIAL_FORMS\" value=\"0\"><input type=\"hidden\" name=\"choices-MAX_NUM_FORMS\" value=\"0\"></div>\n" +
"<p>Choice: <input type=\"text\" name=\"choices-0-choice\" value=\"Calexico\"></p>\n" +
"<p>Votes: <input type=\"text\" name=\"choices-0-votes\" value=\"100\"></p>");
});

test("FormSet asUL", function()
{
    expect(1);
    equal(""+new ChoiceFormSet({data: remderTestData, autoId: false, prefix: "choices"}).asUL(),
"<li><input type=\"hidden\" name=\"choices-TOTAL_FORMS\" value=\"1\"><input type=\"hidden\" name=\"choices-INITIAL_FORMS\" value=\"0\"><input type=\"hidden\" name=\"choices-MAX_NUM_FORMS\" value=\"0\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-0-choice\" value=\"Calexico\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-0-votes\" value=\"100\"></li>");
});

// 3 Regression tests for Django issue #11418
var ArticleForm = formFactory({
  title: new CharField(),
  pub_date: new DateField()
});

var ArticleFormSet = formsetFactory(ArticleForm);

test("No data raises ValidationError", function()
{
    expect(1);
    raises(function() { new ArticleFormSet({data: {}}); });
});

test("With management data works fine", function()
{
    expect(7);
    var data = {
        "form-TOTAL_FORMS": "1",
        "form-INITIAL_FORMS": "0"
    };
    var formset = new ArticleFormSet({data: data});
    strictEqual(formset.initialFormCount(), 0)
    strictEqual(formset.totalFormCount(), 1)
    strictEqual(formset.isBound, true)
    strictEqual(formset.forms[0].isBound, true)
    strictEqual(formset.isValid(), true)
    strictEqual(formset.forms[0].isValid(), true)
    deepEqual(formset.cleanedData(), [{}])
});

test("Form errors are caught by FormSet", function()
{
    expect(4);
    var data = {
        "form-TOTAL_FORMS": "2",
        "form-INITIAL_FORMS": "0",
        "form-0-title": "Test",
        "form-0-pub_date": "1904-06-16",
        "form-1-title": "Test",
        "form-1-pub_date": "" // Missing, but required
    };
    var formset = new ArticleFormSet({data: data});
    strictEqual(formset.isValid(), false);
    strictEqual(formset.errors()[0].isPopulated(), false);
    strictEqual(formset.errors()[1].isPopulated(), true);
    deepEqual(formset.errors()[1].get("pub_date").errors, ["This field is required."]);
});

test("Empty formset is valid", function()
{
    expect(2);
    function EmptyFsetWontValidate(kwargs)
    {
        BaseFormSet.call(this, kwargs);
    }
    inheritFrom(EmptyFsetWontValidate, BaseFormSet);
    EmptyFsetWontValidate.prototype.clean = function()
    {
        throw new ValidationError("Clean method called");
    };

    var EmptyFsetWontValidateFormset = formsetFactory(FavouriteDrinkForm, {
        formset: EmptyFsetWontValidate, extra: 0});
    var formset1 = new EmptyFsetWontValidateFormset({
        data: {
            'form-INITIAL_FORMS': '0',
            'form-TOTAL_FORMS': '0'
        },
        prefix: "form"
    });
    var formset2 = new EmptyFsetWontValidateFormset({
        data: {
            'form-INITIAL_FORMS': '0',
            'form-TOTAL_FORMS': '1',
            'form-0-name': 'bah'
        },
        prefix: "form"
    });
    strictEqual(formset1.isValid(), false);
    strictEqual(formset2.isValid(), false);
});

})();