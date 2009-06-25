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
    expect(97);

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
    var SongForm = formFactory({fields: function() {
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
});
