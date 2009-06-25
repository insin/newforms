module("forms");

test("prettyName", function()
{
    expect(7);
    // Pretty names we want to support
    equals(prettyName("under_score_name"), "Under score name");
    equals(prettyName("camelCaseName"), "Camel case name");
    equals(prettyName("CONSTANT_STYLE"), "CONSTANT STYLE");

    // These also happen to work...
    equals(prettyName("under_LASER_flooring"), "Under LASER flooring");
    equals(prettyName("endsWithAcronymLikeLASER"), "Ends with acronym like LASER");
    equals(prettyName("StudlyCaps"), "Studly caps");

    // ...but if you insist on using camelCase with acronyms in the middel,
    // you're on your own.
    equals(prettyName("butNOTThatClever"), "But nOTThat clever");
});

test("Form", function()
{
    expect(6);
    var Person = formFactory({
        fields: function() {
            return {
                first_name: new CharField(),
                last_name: new CharField(),
                birthday: new DateField()
            };
        }
    });

    var p = new Person({data: {first_name: "John", last_name: "Lennon", birthday: "1940-10-9"}});
    same(p.isBound, true);
    same(p.errors.isPopulated(), false);
    same(p.isValid(), true);
    // TODO p.errors.asUL() needs some work
    same(p.errors.asText(), "");
    isSet([p.cleanedData.first_name, p.cleanedData.last_name, p.cleanedData.birthday.valueOf()],
          ["John", "Lennon", new Date(1940, 9, 9).valueOf()]);
    // TODO BoundField access
    equals(p.asTable(),
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><input type=\"text\" name=\"first_name\" id=\"id_first_name\" value=\"John\"></td></tr>\n" +
"<tr><th><label for=\"id_last_name\">Last name:</label></th><td><input type=\"text\" name=\"last_name\" id=\"id_last_name\" value=\"Lennon\"></td></tr>\n" +
"<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><input type=\"text\" name=\"birthday\" id=\"id_birthday\" value=\"1940-10-9\"></td></tr>");
});
