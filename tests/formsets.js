module("formsets");

test("Basic formset creation and usage", function()
{
    expect(1);

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
});