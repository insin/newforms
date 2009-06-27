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

    // ...but if you insist on using camelCase with acronyms in the middle,
    // you're on your own.
    equals(prettyName("butNOTThatClever"), "But nOTThat clever");
});

test("Form", function()
{
    expect(114);

    var Person = formFactory({fields: function() {
        return {
            first_name: new CharField(),
            last_name: new CharField(),
            birthday: new DateField()
        };
    }});

    // Pass a data object when initialising
    var p = new Person({data: {first_name: "John", last_name: "Lennon", birthday: "1940-10-9"}});
    same(p.isBound, true);
    same(p.errors.isPopulated(), false);
    same(p.isValid(), true);
    // TODO p.errors.asUL() needs some work to handle being empty
    same(p.errors.asText(), "");
    isSet([p.cleanedData.first_name, p.cleanedData.last_name, p.cleanedData.birthday.valueOf()],
          ["John", "Lennon", new Date(1940, 9, 9).valueOf()]);
    equals(""+p.boundField("first_name"),
           "<input type=\"text\" name=\"first_name\" id=\"id_first_name\" value=\"John\">");
    equals(""+p.boundField("last_name"),
           "<input type=\"text\" name=\"last_name\" id=\"id_last_name\" value=\"Lennon\">");
    equals(""+p.boundField("birthday"),
           "<input type=\"text\" name=\"birthday\" id=\"id_birthday\" value=\"1940-10-9\">");
    try { p.boundField("nonexistentfield"); } catch (e) { equals(e.message, "Form does not have a nonexistentfield field."); }
    equals(p.asTable(),
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><input type=\"text\" name=\"first_name\" id=\"id_first_name\" value=\"John\"></td></tr>\n" +
"<tr><th><label for=\"id_last_name\">Last name:</label></th><td><input type=\"text\" name=\"last_name\" id=\"id_last_name\" value=\"Lennon\"></td></tr>\n" +
"<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><input type=\"text\" name=\"birthday\" id=\"id_birthday\" value=\"1940-10-9\"></td></tr>");

    // Empty objects are valid, too
    p = new Person({data: {}});
    same(p.isBound, true);
    same(p.errors["first_name"].errors, ["This field is required."]);
    same(p.errors["last_name"].errors, ["This field is required."]);
    same(p.errors["birthday"].errors, ["This field is required."]);
    same(p.isValid(), false);
    equals(typeof p.cleanedData, "undefined");
    equals(""+p,
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"text\" name=\"first_name\" id=\"id_first_name\"></td></tr>\n" +
"<tr><th><label for=\"id_last_name\">Last name:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"text\" name=\"last_name\" id=\"id_last_name\"></td></tr>\n" +
"<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"text\" name=\"birthday\" id=\"id_birthday\"></td></tr>");
    equals(p.asTable(),
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"text\" name=\"first_name\" id=\"id_first_name\"></td></tr>\n" +
"<tr><th><label for=\"id_last_name\">Last name:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"text\" name=\"last_name\" id=\"id_last_name\"></td></tr>\n" +
"<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"text\" name=\"birthday\" id=\"id_birthday\"></td></tr>");
    equals(p.asUL(),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"id_first_name\"></li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"id_last_name\"></li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"id_birthday\"></li>");
    equals(p.asP(),
"<ul class=\"errorlist\"><li>This field is required.</li></ul>\n" +
"<p><label for=\"id_first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"id_first_name\"></p>\n" +
"<ul class=\"errorlist\"><li>This field is required.</li></ul>\n" +
"<p><label for=\"id_last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"id_last_name\"></p>\n" +
"<ul class=\"errorlist\"><li>This field is required.</li></ul>\n" +
"<p><label for=\"id_birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"id_birthday\"></p>");

    // If you don't pass any "data" values, or if you pass null, the Form will
    // be considered unbound and won't do any validation. Form.errors will be
    // empty *but* Form.isValid() will return False.
    p = new Person();
    same(p.isBound, false);
    same(p.errors.isPopulated(), false);
    same(p.isValid(), false);
    equals(typeof p.cleanedData, "undefined");
    equals(""+p,
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><input type=\"text\" name=\"first_name\" id=\"id_first_name\"></td></tr>\n" +
"<tr><th><label for=\"id_last_name\">Last name:</label></th><td><input type=\"text\" name=\"last_name\" id=\"id_last_name\"></td></tr>\n" +
"<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><input type=\"text\" name=\"birthday\" id=\"id_birthday\"></td></tr>");
    equals(p.asTable(),
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><input type=\"text\" name=\"first_name\" id=\"id_first_name\"></td></tr>\n" +
"<tr><th><label for=\"id_last_name\">Last name:</label></th><td><input type=\"text\" name=\"last_name\" id=\"id_last_name\"></td></tr>\n" +
"<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><input type=\"text\" name=\"birthday\" id=\"id_birthday\"></td></tr>");
    equals(p.asUL(),
"<li><label for=\"id_first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"id_first_name\"></li>\n" +
"<li><label for=\"id_last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"id_last_name\"></li>\n" +
"<li><label for=\"id_birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"id_birthday\"></li>");
    equals(p.asP(),
"<p><label for=\"id_first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"id_first_name\"></p>\n" +
"<p><label for=\"id_last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"id_last_name\"></p>\n" +
"<p><label for=\"id_birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"id_birthday\"></p>");

    p = new Person({data: {last_name: "Lennon"}});
    same(p.errors["first_name"].errors, ["This field is required."]);
    same(p.errors["birthday"].errors, ["This field is required."]);
    same(p.isValid(), false);
    equals(""+p.errors.asUL(),
           "<ul class=\"errorlist\"><li>first_name<ul class=\"errorlist\"><li>This field is required.</li></ul></li><li>birthday<ul class=\"errorlist\"><li>This field is required.</li></ul></li></ul>");
    equals(p.errors.asText(),
"* first_name\n" +
"  * This field is required.\n" +
"* birthday\n" +
"  * This field is required.");
    equals(typeof p.cleanedData, "undefined");
    same(p.boundField("first_name").errors.errors, ["This field is required."]);
    equals(""+p.boundField("first_name").errors.asUL(),
           "<ul class=\"errorlist\"><li>This field is required.</li></ul>");
    equals(""+p.boundField("first_name").errors.asText(),
           "* This field is required.");

    p = new Person();
    equals(""+p.boundField("first_name"),
           "<input type=\"text\" name=\"first_name\" id=\"id_first_name\">");
    equals(""+p.boundField("last_name"),
           "<input type=\"text\" name=\"last_name\" id=\"id_last_name\">");
    equals(""+p.boundField("birthday"),
           "<input type=\"text\" name=\"birthday\" id=\"id_birthday\">");

    // cleanedData will always *only* contain properties for fields defined in
    // the Form, even if you pass extra data when you define the Form. In this
    // example, we pass a bunch of extra fields to the form constructor, but
    // cleanedData contains only the form's fields.
    var data = {first_name: "John", last_name: "Lennon", birthday: "1940-10-9", extra1: "hello", extra2: "hello"};
    p = new Person({data: data});
    same(p.isValid(), true);
    equals(p.cleanedData.first_name, "John");
    equals(p.cleanedData.last_name, "Lennon");
    same(p.cleanedData.birthday, new Date(1940, 9, 9));
    equals(typeof p.cleanedData.extra1, "undefined");
    equals(typeof p.cleanedData.extra2, "undefined");

    // cleanedData will include a key and value for *all* fields defined in the
    // Form, even if the Form's data didn't include a value for fields that are
    // not required. In this example, the data object doesn't include a value
    // for the "nick_name" field, but cleanedData includes it. For CharFields,
    // it's set to the empty String.
    var OptionalPersonForm = formFactory({fields: function() {
        return {
            first_name: new CharField(),
            last_name: new CharField(),
            nick_name: new CharField({required: false})
        };
    }});
    data = {first_name: "John", last_name: "Lennon"};
    var f = new OptionalPersonForm({data: data});
    same(f.isValid(), true);
    same(f.cleanedData.nick_name, "");
    equals(f.cleanedData.first_name, "John");
    equals(f.cleanedData.last_name, "Lennon");

    // For DateFields, it's set to null
    OptionalPersonForm = formFactory({fields: function() {
        return {
            first_name: new CharField(),
            last_name: new CharField(),
            birth_date: new DateField({required: false})
        };
    }});
    data = {first_name: "John", last_name: "Lennon"};
    f = new OptionalPersonForm({data: data});
    same(f.isValid(), true);
    same(f.cleanedData.birth_date, null);
    equals(f.cleanedData.first_name, "John");
    equals(f.cleanedData.last_name, "Lennon");

    // "autoId" tells the Form to add an "id" attribute to each form element.
    // If it's a string that contains "%(name)s", js-forms will use that as a
    // format string into which the field's name will be inserted. It will also
    // put a <label> around the human-readable labels for a field.
    p = new Person({autoId: "%(name)s_id"});
    equals(p.asTable(),
"<tr><th><label for=\"first_name_id\">First name:</label></th><td><input type=\"text\" name=\"first_name\" id=\"first_name_id\"></td></tr>\n" +
"<tr><th><label for=\"last_name_id\">Last name:</label></th><td><input type=\"text\" name=\"last_name\" id=\"last_name_id\"></td></tr>\n" +
"<tr><th><label for=\"birthday_id\">Birthday:</label></th><td><input type=\"text\" name=\"birthday\" id=\"birthday_id\"></td></tr>");
    equals(p.asUL(),
"<li><label for=\"first_name_id\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"first_name_id\"></li>\n" +
"<li><label for=\"last_name_id\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"last_name_id\"></li>\n" +
"<li><label for=\"birthday_id\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"birthday_id\"></li>");
    equals(p.asP(),
"<p><label for=\"first_name_id\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"first_name_id\"></p>\n" +
"<p><label for=\"last_name_id\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"last_name_id\"></p>\n" +
"<p><label for=\"birthday_id\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"birthday_id\"></p>");

    // If autoId is any truthy value whose string representation does not
    // contain "%(name)s", the "id" attribute will be the name of the field.
    p = new Person({autoId: true});
    equals(p.asUL(),
"<li><label for=\"first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"first_name\"></li>\n" +
"<li><label for=\"last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"last_name\"></li>\n" +
"<li><label for=\"birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"birthday\"></li>");

    // If autoId is any falsy value, an "id" attribute won't be output unless it
    // was manually entered.
    p = new Person({autoId: false});
    equals(p.asUL(),
"<li>First name: <input type=\"text\" name=\"first_name\"></li>\n" +
"<li>Last name: <input type=\"text\" name=\"last_name\"></li>\n" +
"<li>Birthday: <input type=\"text\" name=\"birthday\"></li>");

    // In this example, autoId is false, but the "id" attribute for the
    // "first_name" field is given. Also note that field gets a <label>, while
    // the others don't.
    Person = formFactory({fields: function() {
        return {
            first_name: new CharField({
                widget: new TextInput({attrs: {id: "first_name_id"}})
            }),
            last_name: new CharField(),
            birthday: new DateField()
        };
    }});
    p = new Person({autoId: false});
    equals(p.asUL(),
"<li><label for=\"first_name_id\">First name:</label> <input id=\"first_name_id\" type=\"text\" name=\"first_name\"></li>\n" +
"<li>Last name: <input type=\"text\" name=\"last_name\"></li>\n" +
"<li>Birthday: <input type=\"text\" name=\"birthday\"></li>");

    // If the "id" attribute is specified in the Form and autoId is true, the
    // "id" attribute in the Form gets precedence.
    p = new Person({autoId: true});
    equals(p.asUL(),
"<li><label for=\"first_name_id\">First name:</label> <input id=\"first_name_id\" type=\"text\" name=\"first_name\"></li>\n" +
"<li><label for=\"last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"last_name\"></li>\n" +
"<li><label for=\"birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"birthday\"></li>");

    var SignupForm = formFactory({fields: function() {
        return {
            email: new EmailField(),
            get_spam: new BooleanField()
        };
    }});
    f = new SignupForm({autoId: false});
    equals(""+f.boundField("email"),
           "<input type=\"text\" name=\"email\">");
    equals(""+f.boundField("get_spam"),
           "<input type=\"checkbox\" name=\"get_spam\">");

    f = new SignupForm({data: {email: "test@example.com", get_spam: true}, autoId: false});
    equals(""+f.boundField("email"),
           "<input type=\"text\" name=\"email\" value=\"test@example.com\">");
    equals(""+f.boundField("get_spam"),
           "<input type=\"checkbox\" name=\"get_spam\" checked=\"checked\">");

    // Any Field can have a Widget constructor passed to its constructor
    var ContactForm = formFactory({fields: function() {
        return {
            subject: new CharField(),
            message: new CharField({widget: Textarea})
        };
    }});
    f = new ContactForm({autoId: false});
    equals(""+f.boundField("subject"),
           "<input type=\"text\" name=\"subject\">");
    equals(""+f.boundField("message"),
           "<textarea rows=\"10\" cols=\"40\" name=\"message\"></textarea>");

    // asTextarea(), asText() and asHidden() are shortcuts for changing the
    // output widget type
    equals(""+f.boundField("subject").asText(),
           "<input type=\"text\" name=\"subject\">");
    equals(""+f.boundField("subject").asTextarea(),
           "<textarea rows=\"10\" cols=\"40\" name=\"subject\"></textarea>");
    equals(""+f.boundField("subject").asHidden(),
           "<input type=\"hidden\" name=\"subject\">");

    //The "widget" parameter to a Field can also be an instance
    var ContactForm = formFactory({fields: function() {
        return {
            subject: new CharField(),
            message: new CharField({
                widget: new Textarea({attrs: {rows: 80, cols: 20}})
            })
        };
    }});
    f = new ContactForm({autoId: false});
    equals(""+f.boundField("message"),
           "<textarea rows=\"80\" cols=\"20\" name=\"message\"></textarea>");

    // Instance-level attrs are *not* carried over to asTextarea(), asText() and
    // asHidden()
    equals(""+f.boundField("message").asText(),
           "<input type=\"text\" name=\"message\">");
    f = new ContactForm({data: {subject: "Hello", message: "I love you."}, autoId: false});
    equals(""+f.boundField("subject").asTextarea(),
           "<textarea rows=\"10\" cols=\"40\" name=\"subject\">Hello</textarea>");
    equals(""+f.boundField("message").asText(),
           "<input type=\"text\" name=\"message\" value=\"I love you.\">");
    equals(""+f.boundField("message").asHidden(),
           "<input type=\"hidden\" name=\"message\" value=\"I love you.\">");

    // For a form with a <select>, use ChoiceField
    var FrameworkForm = formFactory({fields: function() {
        return {
            name: new CharField(),
            language: new ChoiceField({choices: [["P", "Python"], ["J", "Java"]]})
        };
    }});
    f = new FrameworkForm({autoId: false});
    equals(""+f.boundField("language"),
"<select name=\"language\">\n" +
"<option value=\"P\">Python</option>\n" +
"<option value=\"J\">Java</option>\n" +
"</select>");
    f = new FrameworkForm({data: {name: "Django", language: "P"}, autoId: false});
    equals(""+f.boundField("language"),
"<select name=\"language\">\n" +
"<option value=\"P\" selected=\"selected\">Python</option>\n" +
"<option value=\"J\">Java</option>\n" +
"</select>");

    // A subtlety: If one of the choices' value is the empty string and the form
    // is unbound, then the <option> for the empty-string choice will get
    // selected="selected".
    FrameworkForm = formFactory({fields: function() {
        return {
            name: new CharField(),
            language: new ChoiceField({choices: [["", "------"],["P", "Python"], ["J", "Java"]]})
        };
    }});
    f = new FrameworkForm({autoId: false});
    equals(""+f.boundField("language"),
"<select name=\"language\">\n" +
"<option value=\"\" selected=\"selected\">------</option>\n" +
"<option value=\"P\">Python</option>\n" +
"<option value=\"J\">Java</option>\n" +
"</select>");

    // You can specify widget attributes in the Widget constructor
    FrameworkForm = formFactory({fields: function() {
        return {
            name: new CharField(),
            language: new ChoiceField({
                choices: [["P", "Python"], ["J", "Java"]],
                widget: new Select({attrs: {"class": "foo"}})
            })
        };
    }});
    f = new FrameworkForm({autoId: false});
    equals(""+f.boundField("language"),
"<select class=\"foo\" name=\"language\">\n" +
"<option value=\"P\">Python</option>\n" +
"<option value=\"J\">Java</option>\n" +
"</select>");
    f = new FrameworkForm({data: {name: "Django", language: "P"}, autoId: false});
    equals(""+f.boundField("language"),
"<select class=\"foo\" name=\"language\">\n" +
"<option value=\"P\" selected=\"selected\">Python</option>\n" +
"<option value=\"J\">Java</option>\n" +
"</select>");

    // When passing a custom widget instance to ChoiceField, note that setting
    // "choices" on the widget is meaningless. The widget will use the choices
    // defined on the Field, not the ones defined on the Widget.
    FrameworkForm = formFactory({fields: function() {
        return {
            name: new CharField(),
            language: new ChoiceField({
                choices: [["P", "Python"], ["J", "Java"]],
                widget: new Select({
                    choices: [["R", "Ruby"], ["P", "Perl"]],
                    attrs: {"class": "foo"}
                })
            })
        };
    }});
    f = new FrameworkForm({autoId: false});
    equals(""+f.boundField("language"),
"<select class=\"foo\" name=\"language\">\n" +
"<option value=\"P\">Python</option>\n" +
"<option value=\"J\">Java</option>\n" +
"</select>");
    f = new FrameworkForm({data: {name: "Django", language: "P"}, autoId: false});
    equals(""+f.boundField("language"),
"<select class=\"foo\" name=\"language\">\n" +
"<option value=\"P\" selected=\"selected\">Python</option>\n" +
"<option value=\"J\">Java</option>\n" +
"</select>");

    // You can set a ChoiceField's choices after the fact
    FrameworkForm = formFactory({fields: function() {
        return {
            name: new CharField(),
            language: new ChoiceField()
        };
    }});
    f = new FrameworkForm({autoId: false});
    equals(""+f.boundField("language"),
"<select name=\"language\">\n" +
"</select>");
    f.fields["language"].choices = [["P", "Python"], ["J", "Java"]];
    equals(""+f.boundField("language"),
"<select name=\"language\">\n" +
"<option value=\"P\">Python</option>\n" +
"<option value=\"J\">Java</option>\n" +
"</select>");

    // Add widget: RadioSelect to use that widget with a ChoiceField
    FrameworkForm = formFactory({fields: function() {
        return {
            name: new CharField(),
            language: new ChoiceField({choices: [["P", "Python"], ["J", "Java"]], widget: RadioSelect})
        };
    }});
    f = new FrameworkForm({autoId: false});
    equals(""+f.boundField("language"),
"<ul>\n" +
"<li><label><input type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>\n" +
"<li><label><input type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>\n" +
"</ul>");
    equals(""+f,
"<tr><th>Name:</th><td><input type=\"text\" name=\"name\"></td></tr>\n" +
"<tr><th>Language:</th><td><ul>\n" +
"<li><label><input type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>\n" +
"<li><label><input type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>\n" +
"</ul></td></tr>");
    equals(""+f.asUL(),
"<li>Name: <input type=\"text\" name=\"name\"></li>\n" +
"<li>Language: <ul>\n" +
"<li><label><input type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>\n" +
"<li><label><input type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>\n" +
"</ul></li>");

    // Regarding autoId and <label>, RadioSelect is a special case. Each radio
    // button gets a distinct ID, formed by appending an underscore plus the
    // button's zero-based index.
    f = new FrameworkForm({autoId: "id_%(name)s"});
    equals(""+f.boundField("language"),
"<ul>\n" +
"<li><label for=\"id_language_0\"><input id=\"id_language_0\" type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>\n" +
"<li><label for=\"id_language_1\"><input id=\"id_language_1\" type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>\n" +
"</ul>");

    // When RadioSelect is used with autoId, and the whole form is printed using
    // either asTable() or asUl(), the label for the RadioSelect will point to the
    // ID of the *first* radio button.
    equals(""+f,
"<tr><th><label for=\"id_name\">Name:</label></th><td><input type=\"text\" name=\"name\" id=\"id_name\"></td></tr>\n" +
"<tr><th><label for=\"id_language_0\">Language:</label></th><td><ul>\n" +
"<li><label for=\"id_language_0\"><input id=\"id_language_0\" type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>\n" +
"<li><label for=\"id_language_1\"><input id=\"id_language_1\" type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>\n" +
"</ul></td></tr>");
    equals(""+f.asUL(),
"<li><label for=\"id_name\">Name:</label> <input type=\"text\" name=\"name\" id=\"id_name\"></li>\n" +
"<li><label for=\"id_language_0\">Language:</label> <ul>\n" +
"<li><label for=\"id_language_0\"><input id=\"id_language_0\" type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>\n" +
"<li><label for=\"id_language_1\"><input id=\"id_language_1\" type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>\n" +
"</ul></li>");
    equals(""+f.asP(),
"<p><label for=\"id_name\">Name:</label> <input type=\"text\" name=\"name\" id=\"id_name\"></p>\n" +
"<p><label for=\"id_language_0\">Language:</label> <ul>\n" +
"<li><label for=\"id_language_0\"><input id=\"id_language_0\" type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>\n" +
"<li><label for=\"id_language_1\"><input id=\"id_language_1\" type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>\n" +
"</ul></p>");

    // MultipleChoiceField is a special case, as its data is required to be a
    // list.
    var SongForm = formFactory({fields: function() {
        return {
            name: new CharField(),
            composers: new MultipleChoiceField()
        }
    }});
    f = new SongForm({autoId: false});
    equals(""+f.boundField("composers"),
"<select name=\"composers\" multiple=\"multiple\">\n" +
"</select>")
    SongForm = formFactory({fields: function() {
        return {
            name: new CharField(),
            composers: new MultipleChoiceField({choices: [["J", "John Lennon"], ["P", "Paul McCartney"]]})
        }
    }});
    f = new SongForm({autoId: false});
    equals(""+f.boundField("composers"),
"<select name=\"composers\" multiple=\"multiple\">\n" +
"<option value=\"J\">John Lennon</option>\n" +
"<option value=\"P\">Paul McCartney</option>\n" +
"</select>")
    f = new SongForm({data: {name: "Yesterday", composers: ["P"]}, autoId: false});
    equals(""+f.boundField("name"),
"<input type=\"text\" name=\"name\" value=\"Yesterday\">");
    equals(""+f.boundField("composers"),
"<select name=\"composers\" multiple=\"multiple\">\n" +
"<option value=\"J\">John Lennon</option>\n" +
"<option value=\"P\" selected=\"selected\">Paul McCartney</option>\n" +
"</select>")

    // MultipleChoiceField rendered asHidden() is a special case. Because it can
    // have multiple values, its asHidden() renders multiple
    // <input type="hidden"> tags.
    equals(""+f.boundField("composers").asHidden(),
"<span><input type=\"hidden\" name=\"composers\" value=\"P\"></span>");
    f = new SongForm({data: {name: "Yesterday", composers: ["P", "J"]}, autoId: false});
    equals(""+f.boundField("composers").asHidden(),
"<span><input type=\"hidden\" name=\"composers\" value=\"P\"><input type=\"hidden\" name=\"composers\" value=\"J\"></span>");

    // MultipleChoiceField can also be used with the CheckboxSelectMultiple
    // widget.
    SongForm = formFactory({fields: function() {
        return {
            name: new CharField(),
            composers: new MultipleChoiceField({choices: [["J", "John Lennon"], ["P", "Paul McCartney"]], widget: CheckboxSelectMultiple})
        }
    }});
    f = new SongForm({autoId: false});
    equals(""+f.boundField("composers"),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"composers\" value=\"J\"> John Lennon</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"composers\" value=\"P\"> Paul McCartney</label></li>\n" +
"</ul>");
    f = new SongForm({data: {composers: ["J"]}, autoId: false});
    equals(""+f.boundField("composers"),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"composers\" value=\"J\" checked=\"checked\"> John Lennon</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"composers\" value=\"P\"> Paul McCartney</label></li>\n" +
"</ul>");
    f = new SongForm({data: {composers: ["J", "P"]}, autoId: false});
    equals(""+f.boundField("composers"),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"composers\" value=\"J\" checked=\"checked\"> John Lennon</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"composers\" value=\"P\" checked=\"checked\"> Paul McCartney</label></li>\n" +
"</ul>");

    // Regarding autoId, CheckboxSelectMultiple is another special case. Each
    // checkbox gets a distinct ID, formed by appending an underscore plus the
    // checkbox's zero-based index.
    f = new SongForm({autoId: "%(name)s_id"});
    equals(""+f.boundField("composers"),
"<ul>\n" +
"<li><label for=\"composers_id_0\"><input id=\"composers_id_0\" type=\"checkbox\" name=\"composers\" value=\"J\"> John Lennon</label></li>\n" +
"<li><label for=\"composers_id_1\"><input id=\"composers_id_1\" type=\"checkbox\" name=\"composers\" value=\"P\"> Paul McCartney</label></li>\n" +
"</ul>");

    SongForm = formFactory({fields: function() {
        return {
            name: new CharField(),
            composers: new MultipleChoiceField({choices: [["J", "John Lennon"], ["P", "Paul McCartney"]], widget: MultipleHiddenInput})
        }
    }});
    f = new SongForm({data: {name: "Yesterday", composers: ["J", "P"]}, autoId: false});
    equals(""+f.asUL(),
"<li>Name: <input type=\"text\" name=\"name\" value=\"Yesterday\"><span><input type=\"hidden\" name=\"composers\" value=\"J\"><input type=\"hidden\" name=\"composers\" value=\"P\"></span></li>");

    // When using MultipleChoiceField, the framework expects a list of input and
    // returns a list of input.
    f = new SongForm({data: {name: "Yesterday"}, autoId: false});
    same(f.errors["composers"].errors, ["This field is required."]);
    f = new SongForm({data: {name: "Yesterday", composers: ["J"]}, autoId: false});
    same(f.errors.isPopulated(), false);
    same(f.cleanedData["composers"], ["J"]);
    equals(f.cleanedData["name"], "Yesterday");
    f = new SongForm({data: {name: "Yesterday", composers: ["J", "P"]}, autoId: false});
    same(f.errors.isPopulated(), false);
    same(f.cleanedData["composers"], ["J", "P"]);
    equals(f.cleanedData["name"], "Yesterday");

    // Validation errors are HTML-escaped when output as HTML
    var EscapingForm = formFactory({
        fields: function() {
            return {
                specialName: new CharField({label: "<em>Special</em> Field"}),
                specialSafeName: new CharField({label: DOMBuilder.markSafe("<em>Special</em> Field")})
            };
        },

        cleanSpecialName: function()
        {
            throw new ValidationError("Something's wrong with '" + this.cleanedData.specialName + "'");
        },

        cleanSpecialSafeName: function()
        {
            throw new ValidationError(
                DOMBuilder.markSafe(
                    "'<b>" + this.cleanedData.specialSafeName + "</b>' is a safe string"));
        }
    });
    f = new EscapingForm({data: {specialName: "Nothing to escape", specialSafeName: "Nothing to escape"}, autoId: false});
    equals(""+f,
"<tr><th>&lt;em&gt;Special&lt;/em&gt; Field:</th><td><ul class=\"errorlist\"><li>Something&#39;s wrong with &#39;Nothing to escape&#39;</li></ul><input type=\"text\" name=\"specialName\" value=\"Nothing to escape\"></td></tr>\n" +
"<tr><th><em>Special</em> Field:</th><td><ul class=\"errorlist\"><li>'<b>Nothing to escape</b>' is a safe string</li></ul><input type=\"text\" name=\"specialSafeName\" value=\"Nothing to escape\"></td></tr>");
    f = new EscapingForm({
        data: {
            specialName: "Should escape < & > and <script>alert('xss')</script>",
            specialSafeName: "<i>Do not escape error message</i>"
        },
        autoId: false
    });
    equals(""+f,
"<tr><th>&lt;em&gt;Special&lt;/em&gt; Field:</th><td><ul class=\"errorlist\"><li>Something&#39;s wrong with &#39;Should escape &lt; &amp; &gt; and &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;&#39;</li></ul><input type=\"text\" name=\"specialName\" value=\"Should escape &lt; &amp; &gt; and &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;\"></td></tr>\n" +
"<tr><th><em>Special</em> Field:</th><td><ul class=\"errorlist\"><li>'<b><i>Do not escape error message</i></b>' is a safe string</li></ul><input type=\"text\" name=\"specialSafeName\" value=\"&lt;i&gt;Do not escape error message&lt;/i&gt;\"></td></tr>");

    // A Form's fields are displayed in the same order they were defined
    var TestForm = formFactory({fields: function() {
        return {
            field1: new CharField(),
            field2: new CharField(),
            field3: new CharField(),
            field4: new CharField(),
            field5: new CharField(),
            field6: new CharField(),
            field7: new CharField(),
            field8: new CharField(),
            field9: new CharField(),
            field10: new CharField(),
            field11: new CharField(),
            field12: new CharField(),
            field13: new CharField(),
            field14: new CharField()
        };
    }});
    p = new TestForm({autoId: false});
    equals(""+p,
"<tr><th>Field1:</th><td><input type=\"text\" name=\"field1\"></td></tr>\n" +
"<tr><th>Field2:</th><td><input type=\"text\" name=\"field2\"></td></tr>\n" +
"<tr><th>Field3:</th><td><input type=\"text\" name=\"field3\"></td></tr>\n" +
"<tr><th>Field4:</th><td><input type=\"text\" name=\"field4\"></td></tr>\n" +
"<tr><th>Field5:</th><td><input type=\"text\" name=\"field5\"></td></tr>\n" +
"<tr><th>Field6:</th><td><input type=\"text\" name=\"field6\"></td></tr>\n" +
"<tr><th>Field7:</th><td><input type=\"text\" name=\"field7\"></td></tr>\n" +
"<tr><th>Field8:</th><td><input type=\"text\" name=\"field8\"></td></tr>\n" +
"<tr><th>Field9:</th><td><input type=\"text\" name=\"field9\"></td></tr>\n" +
"<tr><th>Field10:</th><td><input type=\"text\" name=\"field10\"></td></tr>\n" +
"<tr><th>Field11:</th><td><input type=\"text\" name=\"field11\"></td></tr>\n" +
"<tr><th>Field12:</th><td><input type=\"text\" name=\"field12\"></td></tr>\n" +
"<tr><th>Field13:</th><td><input type=\"text\" name=\"field13\"></td></tr>\n" +
"<tr><th>Field14:</th><td><input type=\"text\" name=\"field14\"></td></tr>");

    // Some Field classes have an effect on the HTML attributes of their
    // associated Widget. If you set maxLength in a CharField and its associated
    // widget is either a TextInput or PasswordInput, then the widget's rendered
    // HTML will include the "maxlength" attribute.
    var UserRegistration = formFactory({fields: function() {
        return {
            username: new CharField({maxLength: 10}), // Uses TextInput by default
            password: new CharField({maxLength: 10, widget: PasswordInput}),
            realname: new CharField({maxLength: 10, widget: TextInput}), // Redundantly degine widget, just to test
            address: new CharField()
        };
    }});
    p = new UserRegistration({autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>\n" +
"<li>Password: <input maxlength=\"10\" type=\"password\" name=\"password\"></li>\n" +
"<li>Realname: <input maxlength=\"10\" type=\"text\" name=\"realname\"></li>\n" +
"<li>Address: <input type=\"text\" name=\"address\"></li>");

    // If you specify a custom "attrs" that includes the "maxlength" attribute,
    // the Field's maxLength attribute will override whatever "maxlength" you
    // specify in "attrs".
    UserRegistration = formFactory({fields: function() {
        return {
            username: new CharField({maxLength: 10, widget: new TextInput({attrs: {maxlength: 20}})}),
            password: new CharField({maxLength: 10, widget: PasswordInput})
        };
    }});
    p = new UserRegistration({autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>\n" +
"<li>Password: <input maxlength=\"10\" type=\"password\" name=\"password\"></li>");
});

test("Validating multiple fields in relation to another", function()
{
    expect(20);
    // There are a couple of ways to do multiple-field validation. If you want
    // the validation message to be associated with a particular field,
    // implement the clean_XXX() method on the Form, where XXX is the field
    // name. As in Field.clean(), the clean_XXX() method should return the
    // cleaned value. In the clean_XXX() method, you have access to
    // this.cleanedData, which is an object containing all the data that has
    // been cleaned *so far*, in order by the fields, including the current
    // field (e.g., the field XXX if you're in clean_XXX()).
    var UserRegistration = formFactory({
        fields: function() {
            return {
                username: new CharField({maxLength: 10}),
                password1: new CharField({widget: PasswordInput}),
                password2: new CharField({widget: PasswordInput})
            };
        },

        clean_password2: function() {
            if (this.cleanedData.password1 != this.cleanedData.password2)
            {
                throw new ValidationError("Please make sure your passwords match.");
            }
            return this.cleanedData.password2;
        }
    });
    var f = new UserRegistration({autoId: false});
    same(f.errors.isPopulated(), false);
    f = new UserRegistration({data: {}, autoId: false});
    same(f.errors["username"].errors, ["This field is required."]);
    same(f.errors["password1"].errors, ["This field is required."]);
    same(f.errors["password2"].errors, ["This field is required."]);
    f = new UserRegistration({data: {username: "adrian", password1: "foo", password2: "bar"}, autoId: false});
    same(f.errors["password2"].errors, ["Please make sure your passwords match."]);
    f = new UserRegistration({data: {username: "adrian", password1: "foo", password2: "foo"}, autoId: false});
    same(f.errors.isPopulated(), false);
    equals(f.cleanedData.username, "adrian");
    equals(f.cleanedData.password1, "foo");
    equals(f.cleanedData.password2, "foo");

    // Another way of doing multiple-field validation is by implementing the
    // Form's clean() method. If you do this, any ValidationError raised by that
    // method will not be associated with a particular field; it will have a
    // special-case association with the field named '__all__'.
    // Note that in Form.clean(), you have access to self.cleanedData, an object
    // containing all the fields/values that have *not* raised a
    // ValidationError. Also note Form.clean() is required to return a
    // dictionary of all clean data.
    UserRegistration = formFactory({
        fields: function() {
            return {
                username: new CharField({maxLength: 10}),
                password1: new CharField({widget: PasswordInput}),
                password2: new CharField({widget: PasswordInput})
            };
        },

        clean: function() {
            if (this.cleanedData.password1 && this.cleanedData.password2 &&
                this.cleanedData.password1 != this.cleanedData.password2)
            {
                throw new ValidationError("Please make sure your passwords match.");
            }
            return this.cleanedData;
        }
    });
    f = new UserRegistration({data: {}, autoId: false});
    equals(f.asTable(),
"<tr><th>Username:</th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input maxlength=\"10\" type=\"text\" name=\"username\"></td></tr>\n" +
"<tr><th>Password1:</th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"password\" name=\"password1\"></td></tr>\n" +
"<tr><th>Password2:</th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"password\" name=\"password2\"></td></tr>")
    same(f.errors["username"].errors, ["This field is required."]);
    same(f.errors["password1"].errors, ["This field is required."]);
    same(f.errors["password2"].errors, ["This field is required."]);
    f = new UserRegistration({data: {username: "adrian", password1: "foo", password2: "bar"}, autoId: false});
    same(f.errors["__all__"].errors, ["Please make sure your passwords match."]);
    equals(f.asTable(),
"<tr><td colspan=\"2\"><ul class=\"errorlist\"><li>Please make sure your passwords match.</li></ul></td></tr>\n" +
"<tr><th>Username:</th><td><input maxlength=\"10\" type=\"text\" name=\"username\" value=\"adrian\"></td></tr>\n" +
"<tr><th>Password1:</th><td><input type=\"password\" name=\"password1\" value=\"foo\"></td></tr>\n" +
"<tr><th>Password2:</th><td><input type=\"password\" name=\"password2\" value=\"bar\"></td></tr>");
    equals(f.asUL(),
"<li><ul class=\"errorlist\"><li>Please make sure your passwords match.</li></ul></li>\n" +
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"adrian\"></li>\n" +
"<li>Password1: <input type=\"password\" name=\"password1\" value=\"foo\"></li>\n" +
"<li>Password2: <input type=\"password\" name=\"password2\" value=\"bar\"></li>");
    f = new UserRegistration({data: {username: "adrian", password1: "foo", password2: "foo"}, autoId: false});
    same(f.errors.isPopulated(), false);
    equals(f.cleanedData.username, "adrian");
    equals(f.cleanedData.password1, "foo");
    equals(f.cleanedData.password2, "foo");
});

test("Dynamic construction", function()
{
    expect(14);
    // It's possible to construct a Form dynamically by adding to this.fields
    // during construction. Don't forget to initialise any parent constructors
    // first. formFactory provides a postInit() hook suitable for this purpose.
    var Person = formFactory({
        fields: function() {
            return {
                first_name: new CharField(),
                last_name: new CharField()
            };
        },

        postInit: function(kwargs) {
            this.fields["birthday"] = new DateField();
        }
    });
    var p = new Person({autoId: false});
    equals(""+p,
"<tr><th>First name:</th><td><input type=\"text\" name=\"first_name\"></td></tr>\n" +
"<tr><th>Last name:</th><td><input type=\"text\" name=\"last_name\"></td></tr>\n" +
"<tr><th>Birthday:</th><td><input type=\"text\" name=\"birthday\"></td></tr>");

    // Instances of a dynamic Form do not persist fields from one Form instance to
    // the next.
    var MyForm = formFactory({
        fields: function() { return {}; },

        preInit: function(kwargs) {
            return extendObject({
                data: null, autoId: false, fieldList: []
            }, kwargs || {});
        },

        postInit: function(kwargs) {
            for (var i = 0, l = kwargs.fieldList.length; i < l; i++) {
                this.fields[kwargs.fieldList[i][0]] = kwargs.fieldList[i][1];
            }
        }
    });
    var fieldList = [["field1", new CharField()], ["field2", new CharField()]];
    var myForm = new MyForm({fieldList: fieldList});
    equals(""+myForm,
"<tr><th>Field1:</th><td><input type=\"text\" name=\"field1\"></td></tr>\n" +
"<tr><th>Field2:</th><td><input type=\"text\" name=\"field2\"></td></tr>");
    fieldList = [["field3", new CharField()], ["field4", new CharField()]];
    myForm = new MyForm({fieldList: fieldList});
    equals(""+myForm,
"<tr><th>Field3:</th><td><input type=\"text\" name=\"field3\"></td></tr>\n" +
"<tr><th>Field4:</th><td><input type=\"text\" name=\"field4\"></td></tr>");

    MyForm = formFactory({
        fields: function() {
            return {
                default_field_1: new CharField(),
                default_field_2: new CharField()
            };
        },

        preInit: function(kwargs) {
            return extendObject({
                data: null, autoId: false, fieldList: []
            }, kwargs || {});
        },

        postInit: function(kwargs) {
            for (var i = 0, l = kwargs.fieldList.length; i < l; i++) {
                this.fields[kwargs.fieldList[i][0]] = kwargs.fieldList[i][1];
            }
        }
    });
    fieldList = [["field1", new CharField()], ["field2", new CharField()]];
    myForm = new MyForm({fieldList: fieldList});
    equals(""+myForm,
"<tr><th>Default field 1:</th><td><input type=\"text\" name=\"default_field_1\"></td></tr>\n" +
"<tr><th>Default field 2:</th><td><input type=\"text\" name=\"default_field_2\"></td></tr>\n" +
"<tr><th>Field1:</th><td><input type=\"text\" name=\"field1\"></td></tr>\n" +
"<tr><th>Field2:</th><td><input type=\"text\" name=\"field2\"></td></tr>");
    fieldList = [["field3", new CharField()], ["field4", new CharField()]];
    myForm = new MyForm({fieldList: fieldList});
    equals(""+myForm,
"<tr><th>Default field 1:</th><td><input type=\"text\" name=\"default_field_1\"></td></tr>\n" +
"<tr><th>Default field 2:</th><td><input type=\"text\" name=\"default_field_2\"></td></tr>\n" +
"<tr><th>Field3:</th><td><input type=\"text\" name=\"field3\"></td></tr>\n" +
"<tr><th>Field4:</th><td><input type=\"text\" name=\"field4\"></td></tr>");

    // Similarly, changes to field attributes do not persist from one Form
    // instance to the next.
    Person = formFactory({
        fields: function() {
            return {
                first_name: new CharField({required: false}),
                last_name: new CharField({required: false})
            };
        },

        preInit: function(kwargs) {
            return extendObject({namesRequired: false}, kwargs || {});
        },

        postInit: function(kwargs) {
            if (kwargs.namesRequired) {
                this.fields["first_name"].required = true;
                this.fields["first_name"].widget.attrs["class"] = "required";
                this.fields["last_name"].required = true;
                this.fields["last_name"].widget.attrs["class"] = "required";
            }
        }
    });
    var f = new Person({namesRequired: false});
    same([f.boundField("first_name").field.required, f.boundField("last_name").field.required],
         [false, false]);
    same([f.boundField("first_name").field.widget.attrs, f.boundField("last_name").field.widget.attrs],
         [{}, {}]);
    f = new Person({namesRequired: true});
    same([f.boundField("first_name").field.required, f.boundField("last_name").field.required],
         [true, true]);
    same([f.boundField("first_name").field.widget.attrs, f.boundField("last_name").field.widget.attrs],
         [{"class": "required"}, {"class": "required"}]);
    f = new Person({namesRequired: false});
    same([f.boundField("first_name").field.required, f.boundField("last_name").field.required],
         [false, false]);
    same([f.boundField("first_name").field.widget.attrs, f.boundField("last_name").field.widget.attrs],
         [{}, {}]);

    Person = formFactory({
        fields: function() {
            return {
                first_name: new CharField({maxLength: 30}),
                last_name: new CharField({maxLength: 30})
            };
        },

        preInit: function(kwargs) {
            return extendObject({nameMaxLength: null}, kwargs || {});
        },

        postInit: function(kwargs) {
            if (kwargs.nameMaxLength) {
                this.fields["first_name"].maxLength = kwargs.nameMaxLength;
                this.fields["last_name"].maxLength = kwargs.nameMaxLength;
            }
        }
    });
    f = new Person({nameMaxLength: null});
    same([f.boundField("first_name").field.maxLength, f.boundField("last_name").field.maxLength],
         [30, 30]);
    f = new Person({nameMaxLength: 20});
    same([f.boundField("first_name").field.maxLength, f.boundField("last_name").field.maxLength],
         [20, 20]);
    f = new Person({nameMaxLength: null});
    same([f.boundField("first_name").field.maxLength, f.boundField("last_name").field.maxLength],
         [30, 30]);
});

test("Hidden inputs", function()
{
    expect(12);
    // HiddenInput widgets are displayed differently in the asTable(), asUL()
    // and asP() output of a Form - their verbose names are not displayed, and a
    // separate row is not displayed. They're displayed in the last row of the
    // form, directly after that row's form element.
    var Person = formFactory({fields: function() {
        return {
            first_name: new CharField(),
            last_name: new CharField(),
            hidden_text: new CharField({widget: HiddenInput}),
            birthday: new DateField()
        };
    }});
    var p = new Person({autoId: false});
    equals(""+p,
"<tr><th>First name:</th><td><input type=\"text\" name=\"first_name\"></td></tr>\n" +
"<tr><th>Last name:</th><td><input type=\"text\" name=\"last_name\"></td></tr>\n" +
"<tr><th>Birthday:</th><td><input type=\"text\" name=\"birthday\"><input type=\"hidden\" name=\"hidden_text\"></td></tr>");
    equals(p.asUL(),
"<li>First name: <input type=\"text\" name=\"first_name\"></li>\n" +
"<li>Last name: <input type=\"text\" name=\"last_name\"></li>\n" +
"<li>Birthday: <input type=\"text\" name=\"birthday\"><input type=\"hidden\" name=\"hidden_text\"></li>");
    equals(p.asP(),
"<p>First name: <input type=\"text\" name=\"first_name\"></p>\n" +
"<p>Last name: <input type=\"text\" name=\"last_name\"></p>\n" +
"<p>Birthday: <input type=\"text\" name=\"birthday\"><input type=\"hidden\" name=\"hidden_text\"></p>");

    // With autoId set, a HiddenInput still gets an id, but it doesn't get a label.
    p = new Person({autoId: "id_%(name)s"});
    equals(""+p,
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><input type=\"text\" name=\"first_name\" id=\"id_first_name\"></td></tr>\n" +
"<tr><th><label for=\"id_last_name\">Last name:</label></th><td><input type=\"text\" name=\"last_name\" id=\"id_last_name\"></td></tr>\n" +
"<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><input type=\"text\" name=\"birthday\" id=\"id_birthday\"><input type=\"hidden\" name=\"hidden_text\" id=\"id_hidden_text\"></td></tr>");
    equals(""+p.asUL(),
"<li><label for=\"id_first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"id_first_name\"></li>\n" +
"<li><label for=\"id_last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"id_last_name\"></li>\n" +
"<li><label for=\"id_birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"id_birthday\"><input type=\"hidden\" name=\"hidden_text\" id=\"id_hidden_text\"></li>");
    equals(""+p.asP(),
"<p><label for=\"id_first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"id_first_name\"></p>\n" +
"<p><label for=\"id_last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"id_last_name\"></p>\n" +
"<p><label for=\"id_birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"id_birthday\"><input type=\"hidden\" name=\"hidden_text\" id=\"id_hidden_text\"></p>");

    // If a field with a HiddenInput has errors, the asTable(), asUl() and asP()
    // output will include the error message(s) with the text
    // "(Hidden field [fieldname]) " prepended. This message is displayed at the
    // top of the output, regardless of its field's order in the form.
    p = new Person({data: {first_name: "John", last_name: "Lennon", birthday: "1940-10-9"}, autoId: false});
    equals(""+p,
"<tr><td colspan=\"2\"><ul class=\"errorlist\"><li>(Hidden field hidden_text) This field is required.</li></ul></td></tr>\n" +
"<tr><th>First name:</th><td><input type=\"text\" name=\"first_name\" value=\"John\"></td></tr>\n" +
"<tr><th>Last name:</th><td><input type=\"text\" name=\"last_name\" value=\"Lennon\"></td></tr>\n" +
"<tr><th>Birthday:</th><td><input type=\"text\" name=\"birthday\" value=\"1940-10-9\"><input type=\"hidden\" name=\"hidden_text\"></td></tr>");
    equals(""+p.asUL(),
"<li><ul class=\"errorlist\"><li>(Hidden field hidden_text) This field is required.</li></ul></li>\n" +
"<li>First name: <input type=\"text\" name=\"first_name\" value=\"John\"></li>\n" +
"<li>Last name: <input type=\"text\" name=\"last_name\" value=\"Lennon\"></li>\n" +
"<li>Birthday: <input type=\"text\" name=\"birthday\" value=\"1940-10-9\"><input type=\"hidden\" name=\"hidden_text\"></li>");
    equals(""+p.asP(),
"<ul class=\"errorlist\"><li>(Hidden field hidden_text) This field is required.</li></ul>\n" +
"<p>First name: <input type=\"text\" name=\"first_name\" value=\"John\"></p>\n" +
"<p>Last name: <input type=\"text\" name=\"last_name\" value=\"Lennon\"></p>\n" +
"<p>Birthday: <input type=\"text\" name=\"birthday\" value=\"1940-10-9\"><input type=\"hidden\" name=\"hidden_text\"></p>");

    // A corner case: It's possible for a form to have only HiddenInputs. Since
    // we expect that the content of asTable() and asUL() will be held in
    // appropriate HTML elements within the document and we don't want to end up
    // with invalid HTML, a row will be created to contain the hidden fields. In
    // the case of asP(), form inputs must reside inside a block-level container
    // to qualify as valid HTML, so the inputs will be wrapped in a <div> in
    // this scenario.
    var TestForm = formFactory({fields: function() {
        return {
            foo: new CharField({widget: HiddenInput}),
            bar: new CharField({widget: HiddenInput})
        };
    }});
    p = new TestForm({autoId: false});
    equals(""+p.asTable(),
"<tr><td colspan=\"2\"><input type=\"hidden\" name=\"foo\"><input type=\"hidden\" name=\"bar\"></td></tr>");
    equals(""+p.asUL(),
"<li><input type=\"hidden\" name=\"foo\"><input type=\"hidden\" name=\"bar\"></li>");
    equals(""+p.asP(),
"<div><input type=\"hidden\" name=\"foo\"><input type=\"hidden\" name=\"bar\"></div>");
});

test("Labels", function()
{
    expect(10);
    // You can specify the label for a field by using the "label" argument to a
    // Field class. If you don't specify 'label', js-forms will use the field
    // name with underscores converted to spaces, and the initial letter
    // capitalised.
    var UserRegistration = formFactory({fields: function() {
        return {
            username: new CharField({maxLength: 10, label: "Your username"}),
            password1: new CharField({widget: PasswordInput}),
            password2: new CharField({widget: PasswordInput, label: "Password (again)"})
        };
    }});
    var p = new UserRegistration({autoId: false});
    equals(""+p.asUL(),
"<li>Your username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>\n" +
"<li>Password1: <input type=\"password\" name=\"password1\"></li>\n" +
"<li>Password (again): <input type=\"password\" name=\"password2\"></li>");

    // Labels for as* methods will only end in a colon if they don't end in
    // other punctuation already.
    var Questions = formFactory({fields: function() {
        return {
            q1: new CharField({label: "The first question"}),
            q2: new CharField({label: "What is your name?"}),
            q3: new CharField({label: "The answer to life is:"}),
            q4: new CharField({label: "Answer this question!"}),
            q5: new CharField({label: "The last question. Period."})
        };
    }});
    p = new Questions({autoId: false});
    equals(""+p.asP(),
"<p>The first question: <input type=\"text\" name=\"q1\"></p>\n" +
"<p>What is your name? <input type=\"text\" name=\"q2\"></p>\n" +
"<p>The answer to life is: <input type=\"text\" name=\"q3\"></p>\n" +
"<p>Answer this question! <input type=\"text\" name=\"q4\"></p>\n" +
"<p>The last question. Period. <input type=\"text\" name=\"q5\"></p>");

    // If a label is set to the empty string for a field, that field won't get a
    // label.
    UserRegistration = formFactory({fields: function() {
        return {
            username: new CharField({maxLength: 10, label: ""}),
            password1: new CharField({widget: PasswordInput})
        };
    }});
    p = new UserRegistration({autoId: false});
    equals(""+p.asUL(),
"<li> <input maxlength=\"10\" type=\"text\" name=\"username\"></li>\n" +
"<li>Password1: <input type=\"password\" name=\"password1\"></li>");
    p = new UserRegistration({autoId: "id_%(name)s"});
    equals(""+p.asUL(),
"<li> <input maxlength=\"10\" type=\"text\" name=\"username\" id=\"id_username\"></li>\n" +
"<li><label for=\"id_password1\">Password1:</label> <input type=\"password\" name=\"password1\" id=\"id_password1\"></li>");

    // If label is null, js-forms will auto-create the label from the field
    // name. This is the default behavior.
    UserRegistration = formFactory({fields: function() {
        return {
            username: new CharField({maxLength: 10, label: null}),
            password1: new CharField({widget: PasswordInput})
        };
    }});
    p = new UserRegistration({autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>\n" +
"<li>Password1: <input type=\"password\" name=\"password1\"></li>");
    p = new UserRegistration({autoId: "id_%(name)s"});
    equals(""+p.asUL(),
"<li><label for=\"id_username\">Username:</label> <input maxlength=\"10\" type=\"text\" name=\"username\" id=\"id_username\"></li>\n" +
"<li><label for=\"id_password1\">Password1:</label> <input type=\"password\" name=\"password1\" id=\"id_password1\"></li>");

    // You can specify the "labelSuffix" argument to a Form class to modify the
    // punctuation symbol used at the end of a label.  By default, the colon
    // (:) is used, and is only appended to the label if the label doesn't
    // already end with a punctuation symbol: ., !, ? or :.
    var FavouriteForm = formFactory({fields: function() {
        return {
            colour: new CharField({label: "Favourite colour?"}),
            animal: new CharField({label: "Favourite animal"})
        };
    }});
    var f = new FavouriteForm({autoId: false});
    equals(""+f.asUL(),
"<li>Favourite colour? <input type=\"text\" name=\"colour\"></li>\n" +
"<li>Favourite animal: <input type=\"text\" name=\"animal\"></li>");
    f = new FavouriteForm({autoId: false, labelSuffix: "?"});
    equals(""+f.asUL(),
"<li>Favourite colour? <input type=\"text\" name=\"colour\"></li>\n" +
"<li>Favourite animal? <input type=\"text\" name=\"animal\"></li>");
    f = new FavouriteForm({autoId: false, labelSuffix: ""});
    equals(""+f.asUL(),
"<li>Favourite colour? <input type=\"text\" name=\"colour\"></li>\n" +
"<li>Favourite animal <input type=\"text\" name=\"animal\"></li>");
    f = new FavouriteForm({autoId: false, labelSuffix: "\u2192"});
    equals(""+f.asUL(),
"<li>Favourite colour? <input type=\"text\" name=\"colour\"></li>\n" +
"<li>Favourite animal\u2192 <input type=\"text\" name=\"animal\"></li>");
});

test("Initial data", function()
{
    expect(22);
    // You can specify initial data for a field by using the "initial" argument
    // to a Field class. This initial data is displayed when a Form is rendered
    // with *no* data. It is not displayed when a Form is rendered with any data
    // (including an empty object). Also, the initial value is *not* used if
    // data for a particular required field isn't provided.
    var UserRegistration = formFactory({fields: function() {
        return {
            username: new CharField({maxLength: 10, initial: "django"}),
            password: new CharField({widget: PasswordInput})
        };
    }});

    // Here, we're not submitting any data, so the initial value will be
    // displayed.
    var p = new UserRegistration({autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"django\"></li>\n" +
"<li>Password: <input type=\"password\" name=\"password\"></li>");

    // Here, we're submitting data, so the initial value will *not* be displayed.
    p = new UserRegistration({data: {}, autoId: false});
    equals(""+p.asUL(),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>");
    p = new UserRegistration({data: {username: ""}, autoId: false});
    equals(""+p.asUL(),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>");
    p = new UserRegistration({data: {username: "foo"}, autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"foo\"></li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>");

    // An "initial" value is *not* used as a fallback if data is not provided.
    // In this example, we don't provide a value for "username", and the form
    // raises a validation error rather than using the initial value for
    // "username".
    p = new UserRegistration({data: {password: "secret"}});
    same(p.errors["username"].errors, ["This field is required."]);
    same(p.isValid(), false);

    // The previous technique dealt with "hard-coded" initial data, but it's
    // also possible to specify initial data after you've already created the
    // Form class (i.e., at runtime). Use the "initial" parameter to the Form
    // constructor. This should be an object containing initial values for one
    // or more fields in the form, keyed by field name.
    UserRegistration = formFactory({fields: function() {
        return {
            username: new CharField({maxLength: 10}),
            password: new CharField({widget: PasswordInput})
        };
    }});

    // Here, we're not submitting any data, so the initial value will be displayed.
    p = new UserRegistration({initial: {username: "django"}, autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"django\"></li>\n" +
"<li>Password: <input type=\"password\" name=\"password\"></li>");
    p = new UserRegistration({initial: {username: "stephane"}, autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"stephane\"></li>\n" +
"<li>Password: <input type=\"password\" name=\"password\"></li>");

    // The "initial" parameter is meaningless if you pass data
    p = new UserRegistration({data: {}, initial: {username: "django"}, autoId: false});
    equals(""+p.asUL(),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>");
    p = new UserRegistration({data: {username: ""}, initial: {username: "django"}, autoId: false});
    equals(""+p.asUL(),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>");
    p = new UserRegistration({data: {username: "foo"}, initial: {username: "django"}, autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"foo\"></li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>");

    // A dynamic "initial" value is *not* used as a fallback if data is not
    // provided. In this example, we don't provide a value for "username", and
    // the form raises a validation error rather than using the initial value
    // for "username".
    p = new UserRegistration({data: {password: "secret"}, initial: {username: "django"}});
    same(p.errors["username"].errors, ["This field is required."]);
    same(p.isValid(), false);

    // If a Form defines "initial" *and* "initial" is passed as a parameter
    // during construction, then the latter will get precedence.
    UserRegistration = formFactory({fields: function() {
        return {
            username: new CharField({maxLength: 10, initial: "django"}),
            password: new CharField({widget: PasswordInput})
        };
    }});
    p = new UserRegistration({initial: {username: "babik"}, autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"babik\"></li>\n" +
"<li>Password: <input type=\"password\" name=\"password\"></li>");

    // The previous technique dealt with raw values as initial data, but it's
    // also possible to specify callable data.
    UserRegistration = formFactory({fields: function() {
        return {
            username: new CharField({maxLength: 10}),
            password: new CharField({widget: PasswordInput}),
            options: new MultipleChoiceField({choices: [["f", "foo"], ["b", "bar"], ["w", "whiz"]]})
        };
    }});

    // We need to define functions that get called later
    function initialDjango() { return "django"; }
    function initialStephane() { return "stephane"; }
    function initialOptions() { return ["f", "b"]; }
    function initialOtherOptions() { return ["b", "w"]; }

    // Here, we're not submitting any data, so the initial value will be
    // displayed.
    p = new UserRegistration({initial: {username: initialDjango, options: initialOptions}, autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"django\"></li>\n" +
"<li>Password: <input type=\"password\" name=\"password\"></li>\n" +
"<li>Options: <select name=\"options\" multiple=\"multiple\">\n" +
"<option value=\"f\" selected=\"selected\">foo</option>\n" +
"<option value=\"b\" selected=\"selected\">bar</option>\n" +
"<option value=\"w\">whiz</option>\n" +
"</select></li>");

    // The "initial" parameter is meaningless if you pass data.
    p = new UserRegistration({data: {}, initial: {username: initialDjango, options: initialOptions}, autoId: false});
    equals(""+p.asUL(),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Options: <select name=\"options\" multiple=\"multiple\">\n" +
"<option value=\"f\">foo</option>\n" +
"<option value=\"b\">bar</option>\n" +
"<option value=\"w\">whiz</option>\n" +
"</select></li>");
    p = new UserRegistration({data: {username: ""}, initial: {username: initialDjango}, autoId: false});
    equals(""+p.asUL(),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Options: <select name=\"options\" multiple=\"multiple\">\n" +
"<option value=\"f\">foo</option>\n" +
"<option value=\"b\">bar</option>\n" +
"<option value=\"w\">whiz</option>\n" +
"</select></li>");
    p = new UserRegistration({data: {username: "foo", options: ["f", "b"]}, initial: {username: initialDjango}, autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"foo\"></li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>\n" +
"<li>Options: <select name=\"options\" multiple=\"multiple\">\n" +
"<option value=\"f\" selected=\"selected\">foo</option>\n" +
"<option value=\"b\" selected=\"selected\">bar</option>\n" +
"<option value=\"w\">whiz</option>\n" +
"</select></li>");

    // A callable 'initial' value is *not* used as a fallback if data is not
    // provided. In this example, we don't provide a value for 'username', and
    // the form raises a validation error rather than using the initial value
    // for 'username'.
    p = new UserRegistration({data: {password: "secret"}, initial: {username: initialDjango, options: initialOptions}});
    same(p.errors["username"].errors, ["This field is required."]);
    same(p.isValid(), false);

    // If a Form defines "initial" *and* "initial" is passed as a parameter
    // during construction, then the latter will get precedence.
    UserRegistration = formFactory({fields: function() {
        return {
            username: new CharField({maxLength: 10, initial: initialDjango}),
            password: new CharField({widget: PasswordInput}),
            options: new MultipleChoiceField({choices: [["f", "foo"], ["b", "bar"], ["w", "whiz"]], initial: initialOtherOptions})
        };
    }});
    p = new UserRegistration({autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"django\"></li>\n" +
"<li>Password: <input type=\"password\" name=\"password\"></li>\n" +
"<li>Options: <select name=\"options\" multiple=\"multiple\">\n" +
"<option value=\"f\">foo</option>\n" +
"<option value=\"b\" selected=\"selected\">bar</option>\n" +
"<option value=\"w\" selected=\"selected\">whiz</option>\n" +
"</select></li>");
    p = new UserRegistration({initial: {username: initialStephane, options: initialOptions}, autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"stephane\"></li>\n" +
"<li>Password: <input type=\"password\" name=\"password\"></li>\n" +
"<li>Options: <select name=\"options\" multiple=\"multiple\">\n" +
"<option value=\"f\" selected=\"selected\">foo</option>\n" +
"<option value=\"b\" selected=\"selected\">bar</option>\n" +
"<option value=\"w\">whiz</option>\n" +
"</select></li>");
});

test("Help text", function()
{
    expect(5);
    // You can specify descriptive text for a field by using the "helpText"
    // argument to a Field class. This help text is displayed when a Form is
    // rendered.
    var UserRegistration = formFactory({fields: function() {
        return {
            username: new CharField({maxLength: 10, helpText: "e.g., user@example.com"}),
            password: new CharField({widget: PasswordInput, helpText: "Choose wisely."})
        };
    }});
    var p = new UserRegistration({autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"> e.g., user@example.com</li>\n" +
"<li>Password: <input type=\"password\" name=\"password\"> Choose wisely.</li>");
    equals(""+p.asP(),
"<p>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"> e.g., user@example.com</p>\n" +
"<p>Password: <input type=\"password\" name=\"password\"> Choose wisely.</p>");
    equals(""+p.asTable(),
"<tr><th>Username:</th><td><input maxlength=\"10\" type=\"text\" name=\"username\"><br>e.g., user@example.com</td></tr>\n" +
"<tr><th>Password:</th><td><input type=\"password\" name=\"password\"><br>Choose wisely.</td></tr>");

    // The help text is displayed whether or not data is provided for the form.
    p = new UserRegistration({data: {username: "foo"}, autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"foo\"> e.g., user@example.com</li>\n" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"> Choose wisely.</li>");

    // Help text is not displayed for hidden fields. It can be used for
    // documentation purposes, though.
    UserRegistration = formFactory({fields: function() {
        return {
            username: new CharField({maxLength: 10, helpText: "e.g., user@example.com"}),
            password: new CharField({widget: PasswordInput}),
            next: new CharField({widget: HiddenInput, initial: "/", helpText: "Redirect destination"})
        };
    }});
    p  = new UserRegistration({autoId: false});
    equals(""+p.asUL(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"> e.g., user@example.com</li>\n" +
"<li>Password: <input type=\"password\" name=\"password\"><input type=\"hidden\" name=\"next\" value=\"/\"></li>");
});

test("Subclassing forms", function()
{
    expect(9);
    // You can subclass a Form to add fields. The resulting form subclass will
    // have all of the fields of the parent Form, plus whichever fields you
    // define in the subclass.
    var Person = formFactory({fields: function() {
        return {
            first_name: new CharField(),
            last_name: new CharField(),
            birthday: new DateField()
        };
    }});
    var Musician = formFactory({form: Person, fields: function() {
        return {
            instrument: new CharField()
        };
    }});
    var p = new Person({autoId: false});
    equals(""+p.asUL(),
"<li>First name: <input type=\"text\" name=\"first_name\"></li>\n" +
"<li>Last name: <input type=\"text\" name=\"last_name\"></li>\n" +
"<li>Birthday: <input type=\"text\" name=\"birthday\"></li>");
    var m = new Musician({autoId: false});
    equals(""+m.asUL(),
"<li>First name: <input type=\"text\" name=\"first_name\"></li>\n" +
"<li>Last name: <input type=\"text\" name=\"last_name\"></li>\n" +
"<li>Birthday: <input type=\"text\" name=\"birthday\"></li>\n" +
"<li>Instrument: <input type=\"text\" name=\"instrument\"></li>");

    // You can subclass multiple forms by passing a list of constructors. The
    // fields are added in the order in which the parent Forms are listed.
    var Person = formFactory({
        fields: function() {
            return {
                first_name: new CharField(),
                last_name: new CharField(),
                birthday: new DateField()
            };
        },
        clean_first_name: function() {
            throw new ValidationError("Method from Person.");
        },
        clean_last_name: function() {
            throw new ValidationError("Method from Person.");
        }
    });
    var Instrument = formFactory({
        fields: function() {
            return {
                instrument: new CharField()
            };
        },
        clean_birthday: function() {
            throw new ValidationError("Method from Instrument.");
        }
    });
    var Beatle = formFactory({
        form: [Person, Instrument],
        fields: function() {
            return {
                haircut_type: new CharField()
            };
        },
        clean_last_name: function() {
            throw new ValidationError("Method from Beatle.");
        }
    });
    var b = new Beatle({autoId: false});
    equals(""+b.asUL(),
"<li>First name: <input type=\"text\" name=\"first_name\"></li>\n" +
"<li>Last name: <input type=\"text\" name=\"last_name\"></li>\n" +
"<li>Birthday: <input type=\"text\" name=\"birthday\"></li>\n" +
"<li>Instrument: <input type=\"text\" name=\"instrument\"></li>\n" +
"<li>Haircut type: <input type=\"text\" name=\"haircut_type\"></li>");

    var b = new Beatle({data:{first_name: "Alan", last_name: "Partridge", birthday: "1960-04-01", instrument: "Voice", haircut_type: "Floppy"}});
    same(b.errors["first_name"].errors, ["Method from Person."]);
    same(b.errors["birthday"].errors, ["Method from Instrument."]);
    same(b.errors["last_name"].errors, ["Method from Beatle."]);

    // JavaScript doesn't support multiple inheritance, so this is actually a
    // bit of a hack. These tests will highlight the fallout from this (well,
    // the ones I know about, at least).
    same(b instanceof Form, true);
    same(b instanceof Person, true);
    // An instance of the first Form passed as a parent is used as the base
    // prototype object for our new Form - methods are merely borrowed from any
    // additional Forms, so instanceof only works for the first Form passed.
    same(b instanceof Instrument, false);
});

test("Forms with prefixes", function()
{
    expect(30);
    // Sometimes it's necessary to have multiple forms display on the same HTML
    // page, or multiple copies of the same form. We can accomplish this with
    // form prefixes. Pass a "prefix" argument to the Form constructor to use
    // this feature. This value will be prepended to each HTML form field name.
    // One way to think about this is "namespaces for HTML forms". Notice that
    // in the data argument, each field's key has the prefix, in this case
    // "person1", prepended to the actual field name.
    var Person = formFactory({fields: function() {
        return {
            first_name: new CharField(),
            last_name: new CharField(),
            birthday: new DateField()
        };
    }});
    var data = {
        "person1-first_name": "John",
        "person1-last_name": "Lennon",
        "person1-birthday": "1940-10-9"
    };
    var p = new Person({data: data, prefix: "person1"});
    equals(""+p.asUL(),
"<li><label for=\"id_person1-first_name\">First name:</label> <input type=\"text\" name=\"person1-first_name\" id=\"id_person1-first_name\" value=\"John\"></li>\n" +
"<li><label for=\"id_person1-last_name\">Last name:</label> <input type=\"text\" name=\"person1-last_name\" id=\"id_person1-last_name\" value=\"Lennon\"></li>\n" +
"<li><label for=\"id_person1-birthday\">Birthday:</label> <input type=\"text\" name=\"person1-birthday\" id=\"id_person1-birthday\" value=\"1940-10-9\"></li>");
    equals(""+p.boundField("first_name"),
"<input type=\"text\" name=\"person1-first_name\" id=\"id_person1-first_name\" value=\"John\">");
    equals(""+p.boundField("last_name"),
"<input type=\"text\" name=\"person1-last_name\" id=\"id_person1-last_name\" value=\"Lennon\">");
    equals(""+p.boundField("birthday"),
"<input type=\"text\" name=\"person1-birthday\" id=\"id_person1-birthday\" value=\"1940-10-9\">");
    same(p.errors.isPopulated(), false);
    same(p.isValid(), true);
    equals(p.cleanedData["first_name"], "John");
    equals(p.cleanedData["last_name"], "Lennon");
    same(p.cleanedData["birthday"], new Date(1940, 9, 9));

    // Let's try submitting some bad data to make sure form.errors and
    // field.errors work as expected.
    data = {
        "person1-first_name": "",
        "person1-last_name": "",
        "person1-birthday": ""
    };
    p = new Person({data: data, prefix: "person1"});
    same(p.errors["first_name"].errors, ["This field is required."]);
    same(p.errors["last_name"].errors, ["This field is required."]);
    same(p.errors["birthday"].errors, ["This field is required."]);
    same(p.boundField("first_name").errors.errors, ["This field is required."]);
    try { p.boundField("person1-first_name"); } catch(e) { equals(e.message, "Form does not have a person1-first_name field."); }

    // In this example, the data doesn't have a prefix, but the form requires
    // it, so the form doesn't "see" the fields.
    data = {
        "first_name": "John",
        "last_name": "Lennon",
        "birthday": "1940-10-9"
    };
    p = new Person({data: data, prefix: "person1"});
    same(p.errors["first_name"].errors, ["This field is required."]);
    same(p.errors["last_name"].errors, ["This field is required."]);
    same(p.errors["birthday"].errors, ["This field is required."]);

    // With prefixes, a single data object can hold data for multiple instances
    // of the same form.
    data = {
        "person1-first_name": "John",
        "person1-last_name": "Lennon",
        "person1-birthday": "1940-10-9",
        "person2-first_name": "Jim",
        "person2-last_name": "Morrison",
        "person2-birthday": "1943-12-8"
    };
    var p1 = new Person({data: data, prefix: "person1"});
    same(p1.isValid(), true);
    equals(p1.cleanedData["first_name"], "John");
    equals(p1.cleanedData["last_name"], "Lennon");
    same(p1.cleanedData["birthday"], new Date(1940, 9, 9));
    var p2 = new Person({data: data, prefix: "person2"});
    same(p2.isValid(), true);
    equals(p2.cleanedData["first_name"], "Jim");
    equals(p2.cleanedData["last_name"], "Morrison");
    same(p2.cleanedData["birthday"], new Date(1943, 11, 8));

    // By default, forms append a hyphen between the prefix and the field name,
    // but a form can alter that behavior by implementing the addPrefix()
    // method. This method takes a field name and returns the prefixed field,
    // according to this.prefix.
    Person = formFactory({
        fields: function() {
            return {
                first_name: new CharField(),
                last_name: new CharField(),
                birthday: new DateField()
            };
        },
        addPrefix: function(fieldName) {
            if (this.prefix) {
                return this.prefix + "-prefix-" + fieldName;
            }
            return fieldName;
        }
    });
    p = new Person({prefix: "foo"});
    equals(""+p.asUL(),
"<li><label for=\"id_foo-prefix-first_name\">First name:</label> <input type=\"text\" name=\"foo-prefix-first_name\" id=\"id_foo-prefix-first_name\"></li>\n" +
"<li><label for=\"id_foo-prefix-last_name\">Last name:</label> <input type=\"text\" name=\"foo-prefix-last_name\" id=\"id_foo-prefix-last_name\"></li>\n" +
"<li><label for=\"id_foo-prefix-birthday\">Birthday:</label> <input type=\"text\" name=\"foo-prefix-birthday\" id=\"id_foo-prefix-birthday\"></li>");
    data = {
        "foo-prefix-first_name": "John",
        "foo-prefix-last_name": "Lennon",
        "foo-prefix-birthday": "1940-10-9"
    };
    p = new Person({data: data, prefix: "foo"});
    same(p.isValid(), true);
    equals(p.cleanedData["first_name"], "John");
    equals(p.cleanedData["last_name"], "Lennon");
    same(p.cleanedData["birthday"], new Date(1940, 9, 9));
});

test("Forms with NullBooleanFields", function()
{
    expect(6);
    // NullBooleanField is a bit of a special case because its presentation
    // (widget) is different than its data. This is handled transparently,
    // though.
    var Person = formFactory({fields: function() {
        return {
            name: new CharField(),
            is_cool: new NullBooleanField()
        };
    }});
    var p = new Person({data: {name: "Joe"}, autoId: false});
    equals(""+p.boundField("is_cool"),
"<select name=\"is_cool\">\n" +
"<option value=\"1\" selected=\"selected\">Unknown</option>\n" +
"<option value=\"2\">Yes</option>\n" +
"<option value=\"3\">No</option>\n" +
"</select>");
    p = new Person({data: {name: "Joe", is_cool: "1"}, autoId: false});
    equals(""+p.boundField("is_cool"),
"<select name=\"is_cool\">\n" +
"<option value=\"1\" selected=\"selected\">Unknown</option>\n" +
"<option value=\"2\">Yes</option>\n" +
"<option value=\"3\">No</option>\n" +
"</select>");
    p = new Person({data: {name: "Joe", is_cool: "2"}, autoId: false});
    equals(""+p.boundField("is_cool"),
"<select name=\"is_cool\">\n" +
"<option value=\"1\">Unknown</option>\n" +
"<option value=\"2\" selected=\"selected\">Yes</option>\n" +
"<option value=\"3\">No</option>\n" +
"</select>");
    p = new Person({data: {name: "Joe", is_cool: "3"}, autoId: false});
    equals(""+p.boundField("is_cool"),
"<select name=\"is_cool\">\n" +
"<option value=\"1\">Unknown</option>\n" +
"<option value=\"2\">Yes</option>\n" +
"<option value=\"3\" selected=\"selected\">No</option>\n" +
"</select>");
    p = new Person({data: {name: "Joe", is_cool: true}, autoId: false});
    equals(""+p.boundField("is_cool"),
"<select name=\"is_cool\">\n" +
"<option value=\"1\">Unknown</option>\n" +
"<option value=\"2\" selected=\"selected\">Yes</option>\n" +
"<option value=\"3\">No</option>\n" +
"</select>");
    p = new Person({data: {name: "Joe", is_cool: false}, autoId: false});
    equals(""+p.boundField("is_cool"),
"<select name=\"is_cool\">\n" +
"<option value=\"1\">Unknown</option>\n" +
"<option value=\"2\">Yes</option>\n" +
"<option value=\"3\" selected=\"selected\">No</option>\n" +
"</select>");
});

test("Forms with FileFields", function()
{
    expect(6);

    function SimpleUploadedFile(name, content)
    {
        this.name = name;
        this.content = content;
        this.size = (content !== null ? content.length : 0);
    }

    // FileFields are a special case because they take their data from the
    // "files" data object, not "data".
    var FileForm = formFactory({fields: function() {
        return { file1: new FileField() };
    }});
    var f = new FileForm({autoId: false});
    equals(""+f,
           "<tr><th>File1:</th><td><input type=\"file\" name=\"file1\"></td></tr>");

    f = new FileForm({data: {}, files: {}, autoId: false});
    equals(""+f,
           "<tr><th>File1:</th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"file\" name=\"file1\"></td></tr>");

    f = new FileForm({data: {}, files: {file1: new SimpleUploadedFile("name", "")}, autoId: false});
    equals(""+f,
           "<tr><th>File1:</th><td><ul class=\"errorlist\"><li>The submitted file is empty.</li></ul><input type=\"file\" name=\"file1\"></td></tr>");

    f = new FileForm({data: {}, files: {file1: "something that is not a file"}, autoId: false});
    equals(""+f,
           "<tr><th>File1:</th><td><ul class=\"errorlist\"><li>No file was submitted. Check the encoding type on the form.</li></ul><input type=\"file\" name=\"file1\"></td></tr>");

    f = new FileForm({data: {}, files: {file1: new SimpleUploadedFile("name", "some content")}, autoId: false});
    equals(""+f,
           "<tr><th>File1:</th><td><input type=\"file\" name=\"file1\"></td></tr>");
    same(f.isValid(), true);
});

test("Basic form processing", function()
{
    expect(3);

    var UserRegistration = formFactory({
        fields: function() {
            return {
                username: new CharField({maxLength: 10}),
                password1: new CharField({widget: PasswordInput}),
                password2: new CharField({widget: PasswordInput})
            };
        },

        clean: function() {
            if (this.cleanedData.password1 && this.cleanedData.password2 &&
                this.cleanedData.password1 != this.cleanedData.password2)
            {
                throw new ValidationError("Please make sure your passwords match.");
            }
            return this.cleanedData;
        }
    });

    function myFunction(method, postData)
    {
        if (method == "POST")
        {
            var form = new UserRegistration({data: postData, autoId: false});
            if (form.isValid())
            {
                return "VALID";
            }
        }
        else
        {
            var form = new UserRegistration({autoId: false});
        }
        var template = "<form action=\"\" method=\"POST\">\n<table>\n%(form)s\n</table>\n<input type=\"submit\">\n</form>";
        return formatString(template, {form: form});
    }

    // Case 1: GET (and empty form, with no errors)
    equals(myFunction("GET", {}),
"<form action=\"\" method=\"POST\">\n" +
"<table>\n" +
"<tr><th>Username:</th><td><input maxlength=\"10\" type=\"text\" name=\"username\"></td></tr>\n" +
"<tr><th>Password1:</th><td><input type=\"password\" name=\"password1\"></td></tr>\n" +
"<tr><th>Password2:</th><td><input type=\"password\" name=\"password2\"></td></tr>\n" +
"</table>\n" +
"<input type=\"submit\">\n" +
"</form>");

    // Case 2: POST with erroneous data (a redisplayed form, with errors)
    equals(myFunction("POST", {username: "this-is-a-long-username", password1: "foo", password2: "bar"}),
"<form action=\"\" method=\"POST\">\n" +
"<table>\n" +
"<tr><td colspan=\"2\"><ul class=\"errorlist\"><li>Please make sure your passwords match.</li></ul></td></tr>\n" +
"<tr><th>Username:</th><td><ul class=\"errorlist\"><li>Ensure this value has at most 10 characters (it has 23).</li></ul><input maxlength=\"10\" type=\"text\" name=\"username\" value=\"this-is-a-long-username\"></td></tr>\n" +
"<tr><th>Password1:</th><td><input type=\"password\" name=\"password1\" value=\"foo\"></td></tr>\n" +
"<tr><th>Password2:</th><td><input type=\"password\" name=\"password2\" value=\"bar\"></td></tr>\n" +
"</table>\n" +
"<input type=\"submit\">\n" +
"</form>");

    // Case 3: POST with valid data (the success message)
   equals(myFunction("POST", {username: "adrian", password1: "secret", password2: "secret"}),
          "VALID");
});

test("The emptyPermitted attribute", function()
{
    expect(12);

    // Sometimes (pretty much in formsets) we want to allow a form to pass
    // validation if it is completely empty. We can accomplish this by using the
    // emptyPermitted argument to a form constructor.
    var SongForm = formFactory({fields: function() {
        return {
            artist: new CharField(),
            name: new CharField()
        };
    }});

    // First let's show what happens if emptyPermitted == false (the default)
    var data = {artist: "", name: ""};
    var form = new SongForm({data: data, emptyPermitted: false});
    same(form.isValid(), false)
    same(form.errors["artist"].errors, ["This field is required."]);
    same(form.errors["name"].errors, ["This field is required."]);
    equals(typeof form.cleanedData, "undefined");

    // Now let's show what happens when emptyPermitted == true and the form is
    // empty.
    form = new SongForm({data: data, emptyPermitted: true});
    same(form.isValid(), true);
    same(form.errors.isPopulated(), false);
    same(form.cleanedData, {});

    // But if we fill in data for one of the fields, the form is no longer empty
    // and the whole thing must pass validation.
    data = {artist: "The Doors", name: ""};
    form = new SongForm({data: data, emptyPermitted: true});
    same(form.isValid(), false)
    same(form.errors["name"].errors, ["This field is required."]);
    equals(typeof form.cleanedData, "undefined");

    // If a field is not given in the data then null is returned for its data.
    // Make sure that when checking for emptyPermitted that null is treated
    // accordingly.
    data = {artist: null, name: ""};
    form = new SongForm({data: data, emptyPermitted: true});
    same(form.isValid(), true);

    // However, we *really* need to be sure we are checking for null as any data
    // in initial that is falsy in a boolean context needs to be treated
    // literally.
    var PriceForm = formFactory({fields: function() {
        return {
            amount: new FloatField(),
            qty: new IntegerField()
        };
    }});

    data = {amount: "0.0", qty: ""};
    form = new PriceForm({data: data, initial: {amount: 0.0}, emptyPermitted: true});
    same(form.isValid(), true);
});

test("Extracting hidden and visible fields", function()
{
    expect(2);
    var SongForm = formFactory({fields: function() {
        return {
            token: new CharField({widget: HiddenInput}),
            artist: new CharField(),
            name: new CharField()
        };
    }});
    var form = new SongForm();
    var hidden = form.hiddenFields();
    same([hidden.length, hidden[0].name], [1, "token"]);
    var visible = form.visibleFields();
    same([visible.length, visible[0].name, visible[1].name], [2, "artist", "name"]);
});

test("Multipart-encoded forms", function()
{
    expect(3);
    var FormWithoutFile = formFactory({fields: function() {
        return {username: new CharField()};
    }});
    var FormWithFile = formFactory({fields: function() {
        return {file: new FileField()};
    }});
    var FormWithImage = formFactory({fields: function() {
        return {file: new ImageField()};
    }});

    same(new FormWithoutFile().isMultipart(), false);
    same(new FormWithFile().isMultipart(), true);
    same(new FormWithImage().isMultipart(), true);
});

test("Overriding ErrorList", function()
{
    expect(1);

    function DivErrorList()
    {
        ErrorList.apply(this, arguments);
    }
    DivErrorList.prototype = new ErrorList();
    DivErrorList.prototype.defaultRendering = function()
    {
        return this.asDIV();
    }
    DivErrorList.prototype.asDIV = function()
    {
        var items = [];
        for (var i = 0, l = this.errors.length; i < l; i++)
        {
            items.push(DOMBuilder.createElement("div", {"class": "error"}, [this.errors[i]]));
        }
        return DOMBuilder.createElement("div", {"class": "errorlist"}, items);
    };

    var CommentForm = formFactory({fields: function() {
        return {
            name: new CharField({maxLength: 50, required: false}),
            email: new EmailField(),
            comment: new CharField()
        };
    }});

    var data = {email: "invalid"};
    var f = new CommentForm({data: data, autoId: false, errorConstructor: DivErrorList});
    equals(""+f.asP(),
"<p>Name: <input maxlength=\"50\" type=\"text\" name=\"name\"></p>\n" +
"<div class=\"errorlist\"><div class=\"error\">Enter a valid e-mail address.</div></div>\n" +
"<p>Email: <input type=\"text\" name=\"email\" value=\"invalid\"></p>\n" +
"<div class=\"errorlist\"><div class=\"error\">This field is required.</div></div>\n" +
"<p>Comment: <input type=\"text\" name=\"comment\"></p>");
});
