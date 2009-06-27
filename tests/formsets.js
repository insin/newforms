module("formsets");

test("Basic formset creation and usage", function()
{
    expect(9);

    // FormSet allows us to use multiple instance of the same form on 1 page.
    // For now, the best way to create a FormSet is by using the formsetFactory
    // function.
    var Choice = formFactory({fields: function() {
        return {
            choice: new CharField(),
            votes: new IntegerField()
        };
    }});

    var ChoiceFormSet = formsetFactory(Choice);

    // A FormSet constructor takes the same arguments as Form. Let's create a
    // FormSet for adding data. By default, it displays 1 blank form. It can
    // display more, but we'll look at how to do so later.
    var formset = new ChoiceFormSet({autoId: false, prefix: "choices"});
    equals(""+formset,
"<tr><td colspan=\"2\"><input type=\"hidden\" name=\"choices-TOTAL_FORMS\" value=\"1\"><input type=\"hidden\" name=\"choices-INITIAL_FORMS\" value=\"0\"></td></tr>\n" +
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
        "choices-0-choice": "Calexico",
        "choices-0-votes": "100"
    };

    // We treat FormSet pretty much like we would treat a normal Form. FormSet
    // has an isValid method, and a cleanedData or errors attribute depending on
    // whether all the forms passed validation. However, unlike a Form instance,
    // cleaned_data and errors will be a list of objects rather than just a
    // single object.
    formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    same(formset.isValid(), true);
    same(formset.forms[0].cleanedData, {choice: "Calexico", votes: 100});

    // If a FormSet was not passed any data, its isValid method should return
    // false.
    formset = new ChoiceFormSet();
    same(formset.isValid(), false);

    // FormSet instances can also have an error attribute if validation failed for
    // any of the forms.
    data = {
        "choices-TOTAL_FORMS": "1",
        "choices-INITIAL_FORMS": "0",
        "choices-0-choice": "Calexico",
        "choices-0-votes": ""
    };
    formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    same(formset.isValid(), false);
    same(formset.errors[0].votes.errors, ["This field is required."]);

    // We can also prefill a FormSet with existing data by providing an "initial"
    // argument to the constructor, which should be a list of objects. By
    // default, an extra blank form is included.
    var initial = [{choice: "Calexico", votes: 100}];
    formset = new ChoiceFormSet({initial: initial, autoId: false, prefix: "choices"});
    equals([formset.forms[0].asUL(), formset.forms[1].asUL()].join("\n"),
"<li>Choice: <input type=\"text\" name=\"choices-0-choice\" value=\"Calexico\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-0-votes\" value=\"100\"></li>\n" +
"<li>Choice: <input type=\"text\" name=\"choices-1-choice\"></li>\n" +
"<li>Votes: <input type=\"text\" name=\"choices-1-votes\"></li>");

    // Let's simulate what happens if we submitted this form
    data = {
        "choices-TOTAL_FORMS": "2",
        "choices-INITIAL_FORMS": "1",
        "choices-0-choice": "Calexico",
        "choices-0-votes": "100",
        "choices-1-choice": "",
        "choices-1-votes": ""
    };
    formset = new ChoiceFormSet({data: data, autoId: false, prefix: "choices"});
    same(formset.isValid(), true);
    same([formset.forms[0].cleanedData, formset.forms[1].cleanedData],
         [{choice: "Calexico", votes: 100}, {}]);
});
