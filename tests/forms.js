QUnit.module("forms")

void function() {

var Person = forms.Form.extend({
  first_name: forms.CharField()
, last_name: forms.CharField()
, birthday: forms.DateField()
})

var PersonNew = forms.Form.extend({
  first_name: forms.CharField({
    widget: forms.TextInput({attrs: {id: "first_name_id"}})
  })
, last_name: forms.CharField()
, birthday: forms.DateField()
})

QUnit.test("Form", 12, function() {
  // Pass a data object when initialising - this is typical of server-side usage
  // where data is supplied only once via the HTTP request.
  var p = new Person({data: {first_name: "John", last_name: "Lennon", birthday: "1940-10-9"}})
  strictEqual(p.isInitialRender, false)
  strictEqual(p.errors().isPopulated(), false)
  strictEqual(p.isValid(), true)
  strictEqual(p.errors().asUl(), undefined)
  strictEqual(p.errors().asText(), "")
  deepEqual([p.cleanedData.first_name, p.cleanedData.last_name, p.cleanedData.birthday.valueOf()],
            ["John", "Lennon", new Date(1940, 9, 9).valueOf()])
  reactHTMLEqual(function() { return p.boundField("first_name").render() },
        "<input type=\"text\" name=\"first_name\" id=\"id_first_name\" value=\"John\">")
  reactHTMLEqual(function() { return p.boundField("last_name").render() },
        "<input type=\"text\" name=\"last_name\" id=\"id_last_name\" value=\"Lennon\">")
  reactHTMLEqual(function() { return p.boundField("birthday").render() },
        "<input type=\"text\" name=\"birthday\" id=\"id_birthday\" value=\"1940-10-9\">")
  try { p.boundField("nonexistentfield") } catch (e) { equal(e.message, "Form does not have a 'nonexistentfield' field.") }

  var formOutput = [], boundFields = p.boundFields()
  for (var i = 0, boundField; boundField = boundFields[i]; i++) {
    formOutput.push([boundField.label, boundField.data()])
  }
  deepEqual(formOutput, [
    ['First name', 'John']
  , ['Last name', 'Lennon']
  , ['Birthday', '1940-10-9']
  ])

  reactHTMLEqual(p.render.bind(p),
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><input type=\"text\" name=\"first_name\" id=\"id_first_name\" value=\"John\"></td></tr>" +
"<tr><th><label for=\"id_last_name\">Last name:</label></th><td><input type=\"text\" name=\"last_name\" id=\"id_last_name\" value=\"Lennon\"></td></tr>" +
"<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><input type=\"text\" name=\"birthday\" id=\"id_birthday\" value=\"1940-10-9\"></td></tr>")
})

QUnit.test('Setting form data', function() {
  // Set a data oject after initialising - this is typically client-side usage,
  // where the form must first be crated and displayed to take user input. It
  // should be, behaviour-wise, equivalent to instantiating with data.
  var p = new Person()
  strictEqual(p.isInitialRender, true, 'initial isInitialRender value')
  var isValid = p.setData({first_name: "John", last_name: "Lennon", birthday: "1940-10-9"})
  strictEqual(isValid, true, 'setData calls and returns the result of isValid')
  strictEqual(p.isInitialRender, false, 'setData makes the form bound if it was not already')
  reactHTMLEqual(p.render.bind(p),
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><input type=\"text\" name=\"first_name\" id=\"id_first_name\" value=\"John\"></td></tr>\
<tr><th><label for=\"id_last_name\">Last name:</label></th><td><input type=\"text\" name=\"last_name\" id=\"id_last_name\" value=\"Lennon\"></td></tr>\
<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><input type=\"text\" name=\"birthday\" id=\"id_birthday\" value=\"1940-10-9\"></td></tr>",
  "data set with setData render as expected")
})

QUnit.test('Updating form data', 32, function() {
  // Update input data with a field -> input object - this is typically
  // client-side usage where a user has interacticed with a field or fields
  // which should be revalidated immediately so feedback can be displayed before
  // they move off the field.
  var p = new Person()
  p.updateData({birthday: 'invalid'})
  strictEqual(p.isInitialRender, false, 'updateData makes the form bound if it was not already')
  strictEqual(p.isValid(), false, 'isValid correctly reports the state of data validated so far')
  deepEqual(p.errors('birthday').messages(), ["Enter a valid date."], 'Invalid updateData data generates an error message')
  deepEqual(p.data, {birthday: 'invalid'}, 'form.data contains the updated data')
  errorEqual(p.updateData.bind(p, {nonexistentfield: true}),
             "Form has no field named 'nonexistentfield'",
             'An Error is thrown if updateData contains invalid field names')

  p.updateData({birthday: '1940-10-9'})
  strictEqual(p.isValid(), true, 'isValid correctly reports the state of data validated so far')
  strictEqual(p.errors().isPopulated(), false, 'Prior errors were cleared by updateData')
  equal(p.cleanedData.birthday.valueOf(), new Date(1940, 9, 9).valueOf())

  // Form-wide cleaning is called by updateData - this shouldn't be a problem
  // for existing clean() functions, as they can never guarantee the existence
  // of data so must be coded defensively.
  p.clean = function() {
    if (this.cleanedData.first_name && !this.cleanedData.last_name) {
      this.addError('last_name', 'This field is required if first name is given.')
      throw forms.ValidationError('Too familiar!')
    }
  }
  p.updateData({first_name: 'John'})
  strictEqual(p.isValid(), false, 'isValid correctly reports the state of data validated so far')
  deepEqual(p.errors('last_name').messages(), ['This field is required if first name is given.'])
  deepEqual(p.nonFieldErrors().messages(), ['Too familiar!'])
  equal(p.cleanedData.first_name, 'John', 'New cleanedData added')
  equal(p.cleanedData.birthday.valueOf(), new Date(1940, 9, 9).valueOf(), 'Existing cleanedData not touched as not updated')

  // Field-specific cleaning functions are called by updateData. It also clears
  // out any non-field errors present in case one of the updated fields is used
  // for cross-field validation.
  p.cleanLast_name = function() {
    if (this.cleanedData.last_name == 'Cleese') {
      throw forms.ValidationError('This is JavaScript, Python is over there.')
    }
  }
  p.updateData({last_name: 'Cleese'})
  strictEqual(p.isValid(), false, 'isValid correctly reports the state of data validated so far')
  deepEqual(p.errors('last_name').messages(), ['This is JavaScript, Python is over there.', 'This field is required if first name is given.'])
  deepEqual(p.nonFieldErrors().messages(), ['Too familiar!'], 'Non field errors should be cleared before updateData triggers form-wide cleaning.')
  equal(p.cleanedData.first_name, 'John', 'Existing cleanedData not touched')
  equal(p.cleanedData.birthday.valueOf(), new Date(1940, 9, 9).valueOf(), 'Existing cleanedData not touched')

  p.updateData({last_name: 'Lennon'})
  strictEqual(p.isValid(), true, 'isValid correctly reports the state of data validated so far')
  equal(p.cleanedData.last_name, 'Lennon', 'New cleanedData added')
  equal(p.cleanedData.first_name, 'John', 'Existing cleanedData not touched')
  equal(p.cleanedData.birthday.valueOf(), new Date(1940, 9, 9).valueOf(), 'Existing cleanedData not touched')

  // updateData() differs from the other means of setting data in that it's not
  // looping over all the Fields in the Form to validate them - it's looking
  // at which fields it's been given input data for an only processing those.
  // Even if your form has a prefix, you can just pass unprefixed field names by default:
  var p = new Person({prefix: 'test'})
  equal(p.addPrefix('field'), 'test-field')
  p.updateData({'first_name': 'John', 'last_name': 'Lennon', 'birthday': '1940-10-9'})
  strictEqual(p.isValid(), true, 'isValid after setting unprefixed data in a prefixed form')
  equal(p.cleanedData.last_name, 'Lennon')
  equal(p.cleanedData.first_name, 'John')
  equal(p.cleanedData.birthday.valueOf(), new Date(1940, 9, 9).valueOf())

  // If you have prefixed data to be updated, pass an options object
  // {prefixed: true}
  var p = new Person({prefix: 'test'})
  equal(p.removePrefix('test-field'), 'field', 'removePrefix strips a prefix-sized chunk off a given string')
  p.updateData({
    'test-first_name': 'John'
  , 'test-last_name': 'Lennon'
  , 'test-birthday': '1940-10-9'
  }, {prefixed: true})
  strictEqual(p.isValid(), true, 'isValid after setting prefixed data')
  equal(p.cleanedData.last_name, 'Lennon')
  equal(p.cleanedData.first_name, 'John')
  equal(p.cleanedData.birthday.valueOf(), new Date(1940, 9, 9).valueOf())
})

QUnit.test("Empty data object", 10, function() {
  // Empty objects are valid, too
  var p = new Person({data: {}})
  strictEqual(p.isInitialRender, false)
  deepEqual(p.errors("first_name").messages(), ["This field is required."])
  deepEqual(p.errors("last_name").messages(), ["This field is required."])
  deepEqual(p.errors("birthday").messages(), ["This field is required."])
  deepEqual(p.isValid(), false)
  deepEqual(p.cleanedData, {})
  reactHTMLEqual(p.render.bind(p),
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"text\" name=\"first_name\" id=\"id_first_name\"></td></tr>" +
"<tr><th><label for=\"id_last_name\">Last name:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"text\" name=\"last_name\" id=\"id_last_name\"></td></tr>" +
"<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"text\" name=\"birthday\" id=\"id_birthday\"></td></tr>")
  reactHTMLEqual(p.asTable.bind(p),
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"text\" name=\"first_name\" id=\"id_first_name\"></td></tr>" +
"<tr><th><label for=\"id_last_name\">Last name:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"text\" name=\"last_name\" id=\"id_last_name\"></td></tr>" +
"<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"text\" name=\"birthday\" id=\"id_birthday\"></td></tr>")
  reactHTMLEqual(p.asUl.bind(p),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"id_first_name\"></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"id_last_name\"></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"id_birthday\"></li>")
  reactHTMLEqual(p.asDiv.bind(p),
"<div><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"id_first_name\"></div>" +
"<div><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"id_last_name\"></div>" +
"<div><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"id_birthday\"></div>")
})

QUnit.test("Unbound form", 8, function() {
  // If you don't pass any "data" values, or if you pass null, the Form will
  // be considered unbound and won't do any validation. Form.errors will be
  // empty *but* Form.isValid() will return False.
  var p = new Person()
  strictEqual(p.isInitialRender, true)
  strictEqual(p.errors().isPopulated(), false)
  strictEqual(p.isValid(), false)
  equal(typeof p.cleanedData, "undefined")
  reactHTMLEqual(p.render.bind(p),
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><input type=\"text\" name=\"first_name\" id=\"id_first_name\"></td></tr>" +
"<tr><th><label for=\"id_last_name\">Last name:</label></th><td><input type=\"text\" name=\"last_name\" id=\"id_last_name\"></td></tr>" +
"<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><input type=\"text\" name=\"birthday\" id=\"id_birthday\"></td></tr>")
  reactHTMLEqual(p.asTable.bind(p),
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><input type=\"text\" name=\"first_name\" id=\"id_first_name\"></td></tr>" +
"<tr><th><label for=\"id_last_name\">Last name:</label></th><td><input type=\"text\" name=\"last_name\" id=\"id_last_name\"></td></tr>" +
"<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><input type=\"text\" name=\"birthday\" id=\"id_birthday\"></td></tr>")
  reactHTMLEqual(p.asUl.bind(p),
"<li><label for=\"id_first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"id_first_name\"></li>" +
"<li><label for=\"id_last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"id_last_name\"></li>" +
"<li><label for=\"id_birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"id_birthday\"></li>")
  reactHTMLEqual(p.asDiv.bind(p),
"<div><label for=\"id_first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"id_first_name\"></div>" +
"<div><label for=\"id_last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"id_last_name\"></div>" +
"<div><label for=\"id_birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"id_birthday\"></div>")
})

QUnit.test("Validation errors", 11, function() {
  var p = new Person({data: {last_name: "Lennon"}})
  deepEqual(p.errors("first_name").messages(), ["This field is required."])
  deepEqual(p.errors("birthday").messages(), ["This field is required."])
  deepEqual(p.isValid(), false)
  reactHTMLEqual(function() { return p.errors().asUl() },
"<ul class=\"errorlist\"><li>first_name<ul class=\"errorlist\"><li>This field is required.</li></ul></li><li>birthday<ul class=\"errorlist\"><li>This field is required.</li></ul></li></ul>")
  equal(p.errors().asText(),
"* first_name\n" +
"  * This field is required.\n" +
"* birthday\n" +
"  * This field is required.")
  deepEqual(p.boundField("first_name").errors().messages(), ["This field is required."])
  reactHTMLEqual(function() { return p.boundField("first_name").errors().asUl() },
        "<ul class=\"errorlist\"><li>This field is required.</li></ul>")
  equal(""+p.boundField("first_name").errors().asText(),
        "* This field is required.")

  p = new Person()
  reactHTMLEqual(function() { return p.boundField("first_name").render() },
        "<input type=\"text\" name=\"first_name\" id=\"id_first_name\">")
  reactHTMLEqual(function() { return p.boundField("last_name").render() },
        "<input type=\"text\" name=\"last_name\" id=\"id_last_name\">")
  reactHTMLEqual(function() { return p.boundField("birthday").render() },
        "<input type=\"text\" name=\"birthday\" id=\"id_birthday\">")
})

QUnit.test("cleanedData only fields", 6, function() {
  // cleanedData will always *only* contain properties for fields defined in
  // the Form, even if you pass extra data when you define the Form. In this
  // example, we pass a bunch of extra fields to the form constructor, but
  // cleanedData contains only the form's fields.
  var data = {first_name: "John", last_name: "Lennon", birthday: "1940-10-9", extra1: "hello", extra2: "hello"}
  var p = new Person({data: data})
  strictEqual(p.isValid(), true)
  equal(p.cleanedData.first_name, "John")
  equal(p.cleanedData.last_name, "Lennon")
  equal(p.cleanedData.birthday.valueOf(), new Date(1940, 9, 9).valueOf())
  equal(typeof p.cleanedData.extra1, "undefined")
  equal(typeof p.cleanedData.extra2, "undefined")
})

QUnit.test("Optional data", 8, function() {
  // cleanedData will include a key and value for *all* fields defined in the
  // Form, even if the Form's data didn't include a value for fields that are
  // not required. In this example, the data object doesn't include a value
  // for the "nick_name" field, but cleanedData includes it. For CharFields,
  // it's set to the empty String.
  var OptionalPersonForm = forms.Form.extend({
    first_name: forms.CharField()
  , last_name: forms.CharField()
  , nick_name: forms.CharField({required: false})
  })
  var data = {first_name: "John", last_name: "Lennon"}
  var f = new OptionalPersonForm({data: data})
  strictEqual(f.isValid(), true)
  strictEqual(f.cleanedData.nick_name, "")
  equal(f.cleanedData.first_name, "John")
  equal(f.cleanedData.last_name, "Lennon")

  // For DateFields, it's set to null
  OptionalPersonForm = forms.Form.extend({
    first_name: forms.CharField()
  , last_name: forms.CharField()
  , birth_date: forms.DateField({required: false})
  })
  data = {first_name: "John", last_name: "Lennon"}
  f = new OptionalPersonForm({data: data})
  strictEqual(f.isValid(), true)
  strictEqual(f.cleanedData.birth_date, null)
  equal(f.cleanedData.first_name, "John")
  equal(f.cleanedData.last_name, "Lennon")
})

QUnit.test("autoId", 3, function() {
  // "autoId" tells the Form to add an "id" attribute to each form element.
  // If it's a string that contains "{name}", newforms will use that as a
  // format string into which the field's name will be inserted. It will also
  // put a <label> around the human-readable labels for a field.
  var p = new Person({autoId: "{name}_id"})
  reactHTMLEqual(p.asTable.bind(p),
"<tr><th><label for=\"first_name_id\">First name:</label></th><td><input type=\"text\" name=\"first_name\" id=\"first_name_id\"></td></tr>" +
"<tr><th><label for=\"last_name_id\">Last name:</label></th><td><input type=\"text\" name=\"last_name\" id=\"last_name_id\"></td></tr>" +
"<tr><th><label for=\"birthday_id\">Birthday:</label></th><td><input type=\"text\" name=\"birthday\" id=\"birthday_id\"></td></tr>")
  reactHTMLEqual(p.asUl.bind(p),
"<li><label for=\"first_name_id\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"first_name_id\"></li>" +
"<li><label for=\"last_name_id\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"last_name_id\"></li>" +
"<li><label for=\"birthday_id\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"birthday_id\"></li>")
  reactHTMLEqual(p.asDiv.bind(p),
"<div><label for=\"first_name_id\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"first_name_id\"></div>" +
"<div><label for=\"last_name_id\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"last_name_id\"></div>" +
"<div><label for=\"birthday_id\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"birthday_id\"></div>")
})

QUnit.test("autoId true", 1, function() {
  // If autoId is any truthy value whose string representation does not
  // contain "{name}", the "id" attribute will be the name of the field.
  var p = new Person({autoId: true})
  reactHTMLEqual(p.asUl.bind(p),
"<li><label for=\"first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"first_name\"></li>" +
"<li><label for=\"last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"last_name\"></li>" +
"<li><label for=\"birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"birthday\"></li>")
})

QUnit.test("autoId false", 1, function() {
  // If autoId is any falsy value, an "id" attribute won't be output unless it
  // was manually entered.
  var p = new Person({autoId: false})
  reactHTMLEqual(p.asUl.bind(p),
"<li>First name: <input type=\"text\" name=\"first_name\"></li>" +
"<li>Last name: <input type=\"text\" name=\"last_name\"></li>" +
"<li>Birthday: <input type=\"text\" name=\"birthday\"></li>")
})

QUnit.test("id on field", 1, function() {
  // In this example, autoId is false, but the "id" attribute for the
  // "first_name" field is given. Also note that field gets a <label>, while
  // the others don't.
  var p = new PersonNew({autoId: false})
  reactHTMLEqual(p.asUl.bind(p),
"<li><label for=\"first_name_id\">First name:</label> <input id=\"first_name_id\" type=\"text\" name=\"first_name\"></li>" +
"<li>Last name: <input type=\"text\" name=\"last_name\"></li>" +
"<li>Birthday: <input type=\"text\" name=\"birthday\"></li>")
})

QUnit.test("autoId on form and field", 1, function() {
  // If the "id" attribute is specified in the Form and autoId is true, the
  // "id" attribute in the Form gets precedence.
  var p = new PersonNew({autoId: true})
  reactHTMLEqual(p.asUl.bind(p),
"<li><label for=\"first_name_id\">First name:</label> <input id=\"first_name_id\" type=\"text\" name=\"first_name\"></li>" +
"<li><label for=\"last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"last_name\"></li>" +
"<li><label for=\"birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"birthday\"></li>")
})

QUnit.test("Various boolean values", 10, function() {
  var SignupForm = forms.Form.extend({
    email: forms.EmailField()
  , get_spam: forms.BooleanField()
  })
  var f = new SignupForm({autoId: false})
  reactHTMLEqual(f.boundField("email").render(),
        "<input type=\"email\" name=\"email\">")
  reactHTMLEqual(f.boundField("get_spam").render(),
        "<input type=\"checkbox\" name=\"get_spam\">")

  f = new SignupForm({data: {email: "test@example.com", get_spam: true}, autoId: false})
  reactHTMLEqual(f.boundField("email").render(),
        "<input type=\"email\" name=\"email\" value=\"test@example.com\">")
  reactHTMLEqual(f.boundField("get_spam").render(),
        "<input type=\"checkbox\" name=\"get_spam\" checked>")

  // Values of "true" or "True" should be rendered without a value
  f = new SignupForm({data: {email: "test@example.com", get_spam: "true"}, autoId: false})
  reactHTMLEqual(f.boundField("get_spam").render(),
        "<input type=\"checkbox\" name=\"get_spam\" checked>")

  f = new SignupForm({data: {email: "test@example.com", get_spam: "True"}, autoId: false})
  reactHTMLEqual(f.boundField("get_spam").render(),
        "<input type=\"checkbox\" name=\"get_spam\" checked>")

  // Values of "false" or "False" should render unchecked
  f = new SignupForm({data: {email: "test@example.com", get_spam: "false"}, autoId: false})
  reactHTMLEqual(f.boundField("get_spam").render(),
        "<input type=\"checkbox\" name=\"get_spam\">")

  f = new SignupForm({data: {email: "test@example.com", get_spam: "False"}, autoId: false})
  reactHTMLEqual(f.boundField("get_spam").render(),
        "<input type=\"checkbox\" name=\"get_spam\">")

  // A value of '0' should be interpreted as true
  f = new SignupForm({data: {email: "test@example.com", get_spam: "0"}, autoId: false})
  strictEqual(f.isValid(), true)
  strictEqual(f.cleanedData['get_spam'], true)
})

QUnit.test("Widget output", 10, function() {
  // Any Field can have a Widget constructor passed to its constructor
  var ContactForm = forms.Form.extend({
    subject: forms.CharField()
  , message: forms.CharField({widget: forms.Textarea})
  })
  var f = new ContactForm({autoId: false})
  reactHTMLEqual(f.boundField("subject").render(),
        "<input type=\"text\" name=\"subject\">")
  reactHTMLEqual(f.boundField("message").render(),
        "<textarea rows=\"10\" cols=\"40\" name=\"message\" value=\"\"></textarea>")

  // asTextarea(), asText() and asHidden() are shortcuts for changing the
  // output widget type
  reactHTMLEqual(f.boundField("subject").asText(),
        "<input type=\"text\" name=\"subject\">")
  reactHTMLEqual(f.boundField("subject").asTextarea(),
        "<textarea rows=\"10\" cols=\"40\" name=\"subject\" value=\"\"></textarea>")
  reactHTMLEqual(f.boundField("subject").asHidden(),
        "<input type=\"hidden\" name=\"subject\" value=\"\">")

  //The "widget" parameter to a Field can also be an instance
  var ContactForm = forms.Form.extend({
    subject: forms.CharField()
  , message: forms.CharField({
      widget: forms.Textarea({attrs: {rows: 80, cols: 20}})
    })
  })
  f = new ContactForm({autoId: false})
  reactHTMLEqual(f.boundField("message").render(),
        "<textarea rows=\"80\" cols=\"20\" name=\"message\" value=\"\"></textarea>")

  // Instance-level attrs are *not* carried over to asTextarea(), asText() and
  // asHidden()
  reactHTMLEqual(f.boundField("message").asText(),
        "<input type=\"text\" name=\"message\">")
  f = new ContactForm({data: {subject: "Hello", message: "I love you."}, autoId: false})
  reactHTMLEqual(f.boundField("subject").asTextarea(),
        "<textarea rows=\"10\" cols=\"40\" name=\"subject\" value=\"Hello\">Hello</textarea>")
  reactHTMLEqual(f.boundField("message").asText(),
        "<input type=\"text\" name=\"message\" value=\"I love you.\">")
  reactHTMLEqual(f.boundField("message").asHidden(),
        "<input type=\"hidden\" name=\"message\" value=\"I love you.\">")
})

QUnit.test("Forms with choices", 9, function() {
  // For a form with a <select>, use ChoiceField
  var FrameworkForm = forms.Form.extend({
    name: forms.CharField()
  , language: forms.ChoiceField({choices: [["P", "Python"], ["J", "Java"]]})
  })
  var f = new FrameworkForm({autoId: false})
  reactHTMLEqual(f.boundField("language").render(),
"<select name=\"language\">" +
"<option value=\"P\">Python</option>" +
"<option value=\"J\">Java</option>" +
"</select>")
  f = new FrameworkForm({data: {name: "Django", language: "P"}, autoId: false})
  reactHTMLEqual(f.boundField("language").render(),
"<select name=\"language\">" +
"<option value=\"P\" selected>Python</option>" +
"<option value=\"J\">Java</option>" +
"</select>")

  // A subtlety: If one of the choices' value is the empty string and the form
  // is unbound, then the <option> for the empty-string choice will get
  // selected="selected".
  FrameworkForm = forms.Form.extend({
    name: forms.CharField()
  , language: forms.ChoiceField({choices: [["", "------"],["P", "Python"], ["J", "Java"]]})
  })
  f = new FrameworkForm({autoId: false})
  reactHTMLEqual(f.boundField("language").render(),
"<select name=\"language\">" +
"<option value=\"\" selected>------</option>" +
"<option value=\"P\">Python</option>" +
"<option value=\"J\">Java</option>" +
"</select>")

  // You can specify widget attributes in the Widget constructor
  FrameworkForm = forms.Form.extend({
    name: forms.CharField()
  , language: forms.ChoiceField({
      choices: [["P", "Python"], ["J", "Java"]]
    , widget: forms.Select({attrs: {"className": "foo"}})
    })
  })
  f = new FrameworkForm({autoId: false})
  reactHTMLEqual(f.boundField("language").render(),
"<select class=\"foo\" name=\"language\">" +
"<option value=\"P\">Python</option>" +
"<option value=\"J\">Java</option>" +
"</select>")
  f = new FrameworkForm({data: {name: "Django", language: "P"}, autoId: false})
  reactHTMLEqual(f.boundField("language").render(),
"<select class=\"foo\" name=\"language\">" +
"<option value=\"P\" selected>Python</option>" +
"<option value=\"J\">Java</option>" +
"</select>")

  // When passing a custom widget instance to ChoiceField, note that setting
  // "choices" on the widget is meaningless. The widget will use the choices
  // defined on the Field, not the ones defined on the Widget.
  FrameworkForm = forms.Form.extend({
    name: forms.CharField()
  , language: forms.ChoiceField({
      choices: [["P", "Python"], ["J", "Java"]]
    , widget: forms.Select({
        choices: [["R", "Ruby"], ["P", "Perl"]]
      , attrs: {"className": "foo"}
      })
    })
  })
  f = new FrameworkForm({autoId: false})
  reactHTMLEqual(f.boundField("language").render(),
"<select class=\"foo\" name=\"language\">" +
"<option value=\"P\">Python</option>" +
"<option value=\"J\">Java</option>" +
"</select>")
  f = new FrameworkForm({data: {name: "Django", language: "P"}, autoId: false})
  reactHTMLEqual(f.boundField("language").render(),
"<select class=\"foo\" name=\"language\">" +
"<option value=\"P\" selected>Python</option>" +
"<option value=\"J\">Java</option>" +
"</select>")

  // You can set a ChoiceField's choices after the fact
  FrameworkForm = forms.Form.extend({
    name: forms.CharField()
  , language: forms.ChoiceField()
  })
  f = new FrameworkForm({autoId: false})
  reactHTMLEqual(f.boundField("language").render(),
"<select name=\"language\">" +
"</select>")
  f.fields["language"].setChoices([["P", "Python"], ["J", "Java"]])
  reactHTMLEqual(f.boundField("language").render(),
"<select name=\"language\">" +
"<option value=\"P\">Python</option>" +
"<option value=\"J\">Java</option>" +
"</select>")
})

QUnit.test("Forms with radio", 7, function() {
  // Add {widget: RadioSelect} to use that widget with a ChoiceField
  var FrameworkForm = forms.Form.extend({
    name: forms.CharField()
  , language: forms.ChoiceField({choices: [["P", "Python"], ["J", "Java"]], widget: forms.RadioSelect})
  })
  var f = new FrameworkForm({autoId: false})
  reactHTMLEqual(f.boundField("language").render(),
"<ul>" +
"<li><label><input type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>" +
"<li><label><input type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>" +
"</ul>")
  reactHTMLEqual(f.render(),
"<tr><th>Name:</th><td><input type=\"text\" name=\"name\"></td></tr>" +
"<tr><th>Language:</th><td><ul>" +
"<li><label><input type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>" +
"<li><label><input type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>" +
"</ul></td></tr>")
  reactHTMLEqual(f.asUl(),
"<li>Name: <input type=\"text\" name=\"name\"></li>" +
"<li>Language: <ul>" +
"<li><label><input type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>" +
"<li><label><input type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>" +
"</ul></li>")

  // Regarding autoId and <label>, RadioSelect is a special case. Each radio
  // button gets a distinct ID, formed by appending an underscore plus the
  // button's zero-based index.
  f = new FrameworkForm({autoId: "id_{name}"})
  reactHTMLEqual(function() { return f.boundField("language").render() },
"<ul id=\"id_language\">" +
"<li><label for=\"id_language_0\"><input id=\"id_language_0\" type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>" +
"<li><label for=\"id_language_1\"><input id=\"id_language_1\" type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>" +
"</ul>")

  // When RadioSelect is used with autoId, and the whole form is printed using
  // either asTable() or asUl(), the label for the RadioSelect will point to the
  // ID of the *first* radio button.
  reactHTMLEqual(f.render.bind(f),
"<tr><th><label for=\"id_name\">Name:</label></th><td><input type=\"text\" name=\"name\" id=\"id_name\"></td></tr>" +
"<tr><th><label for=\"id_language_0\">Language:</label></th><td><ul id=\"id_language\">" +
"<li><label for=\"id_language_0\"><input id=\"id_language_0\" type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>" +
"<li><label for=\"id_language_1\"><input id=\"id_language_1\" type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>" +
"</ul></td></tr>")
  reactHTMLEqual(f.asUl.bind(f),
"<li><label for=\"id_name\">Name:</label> <input type=\"text\" name=\"name\" id=\"id_name\"></li>" +
"<li><label for=\"id_language_0\">Language:</label> <ul id=\"id_language\">" +
"<li><label for=\"id_language_0\"><input id=\"id_language_0\" type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>" +
"<li><label for=\"id_language_1\"><input id=\"id_language_1\" type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>" +
"</ul></li>")
  reactHTMLEqual(f.asDiv.bind(f),
"<div><label for=\"id_name\">Name:</label> <input type=\"text\" name=\"name\" id=\"id_name\"></div>" +
"<div><label for=\"id_language_0\">Language:</label> <ul id=\"id_language\">" +
"<li><label for=\"id_language_0\"><input id=\"id_language_0\" type=\"radio\" name=\"language\" value=\"P\"> Python</label></li>" +
"<li><label for=\"id_language_1\"><input id=\"id_language_1\" type=\"radio\" name=\"language\" value=\"J\"> Java</label></li>" +
"</ul></div>")
})

QUnit.test("Forms with iterable BoundFields", 1, function() {
  var BeatleForm = forms.Form.extend({
    name: forms.ChoiceField({
      choices: [['john', 'John'], ['paul', 'Paul'], ['george', 'George'], ['ringo', 'Ringo']]
    , widget: forms.RadioSelect
    })
  })
  var f = new BeatleForm({autoId: false})
  reactHTMLEqual(f.boundField('name').subWidgets().map(function(w) { return w.render() }),
'<label><input type="radio" name="name" value="john"> John</label>' +
'<label><input type="radio" name="name" value="paul"> Paul</label>' +
'<label><input type="radio" name="name" value="george"> George</label>' +
'<label><input type="radio" name="name" value="ringo"> Ringo</label>')
})

QUnit.test("Forms with 'non-iterable' BoundFields", 1, function() {
  // You can iterate over any BoundField, not just those with a RadioSelect
  // widget.
  var BeatleForm = forms.Form.extend({
    name: forms.CharField()
  })
  var f = new BeatleForm({autoId: false})
  reactHTMLEqual(f.boundField('name').subWidgets().map(function(w) { return w.render() }),
        '<input type="text" name="name">')
})

QUnit.test("Forms with multiple choice", 4, function() {
  // MultipleChoiceField is a special case, as its data is required to be a
  // list.
  var SongForm = forms.Form.extend({
    name: forms.CharField()
  , composers: forms.MultipleChoiceField()
  })
  var f = new SongForm({autoId: false})
  reactHTMLEqual(f.boundField("composers").render(),
"<select name=\"composers\" multiple>" +
"</select>")
  SongForm = forms.Form.extend({
    name: forms.CharField(),
    composers: forms.MultipleChoiceField({choices: [["J", "John Lennon"], ["P", "Paul McCartney"]]})
  })
  f = new SongForm({autoId: false})
  reactHTMLEqual(f.boundField("composers").render(),
"<select name=\"composers\" multiple>" +
"<option value=\"J\">John Lennon</option>" +
"<option value=\"P\">Paul McCartney</option>" +
"</select>")
  f = new SongForm({data: {name: "Yesterday", composers: ["P"]}, autoId: false})
  reactHTMLEqual(f.boundField("name").render(),
"<input type=\"text\" name=\"name\" value=\"Yesterday\">")
  reactHTMLEqual(f.boundField("composers").render(),
"<select name=\"composers\" multiple>" +
"<option value=\"J\">John Lennon</option>" +
"<option value=\"P\" selected>Paul McCartney</option>" +
"</select>")
})

QUnit.test("Hidden data", 5, function() {
  var SongForm = forms.Form.extend({
    name: forms.CharField()
  , composers: forms.MultipleChoiceField({choices: [["J", "John Lennon"], ["P", "Paul McCartney"]]})
  })

  // MultipleChoiceField rendered asHidden() is a special case. Because it can
  // have multiple values, its asHidden() renders multiple
  // <input type="hidden"> tags.
  var f = new SongForm({data: {name: "Yesterday", composers: ["P"]}, autoId: false})
  reactHTMLEqual(f.boundField("composers").asHidden(),
"<div><input type=\"hidden\" name=\"composers\" value=\"P\"></div>")
  f = new SongForm({data: {name: "Yesterday", composers: ["P", "J"]}, autoId: false})
  reactHTMLEqual(f.boundField("composers").asHidden(),
"<div><input type=\"hidden\" name=\"composers\" value=\"P\"><input type=\"hidden\" name=\"composers\" value=\"J\"></div>")

  // DateTimeField rendered asHidden() is special too
  var MessageForm = forms.Form.extend({
    when: forms.SplitDateTimeField()
  })
  f = new MessageForm({data: {when_0: "1992-01-01", when_1: "01:01"}})
  strictEqual(f.isValid(), true)
  reactHTMLEqual(function() { return f.boundField("when").render() },
"<div><input type=\"text\" name=\"when_0\" data-newforms-field=\"when\" id=\"id_when_0\" value=\"1992-01-01\"><input type=\"text\" name=\"when_1\" data-newforms-field=\"when\" id=\"id_when_1\" value=\"01:01\"></div>")
  reactHTMLEqual(function() { return f.boundField("when").asHidden() },
"<div><input type=\"hidden\" name=\"when_0\" data-newforms-field=\"when\" id=\"id_when_0\" value=\"1992-01-01\"><input type=\"hidden\" name=\"when_1\" data-newforms-field=\"when\" id=\"id_when_1\" value=\"01:01\"></div>")
})

QUnit.test("Mutiple choice checkbox", 3, function() {
  // MultipleChoiceField can also be used with the CheckboxSelectMultiple
  // widget.
  var SongForm = forms.Form.extend({
    name: forms.CharField()
  , composers: forms.MultipleChoiceField({
      choices: [["J", "John Lennon"], ["P", "Paul McCartney"]]
    , widget: forms.CheckboxSelectMultiple
    })
  })
  var f = new SongForm({autoId: false})
  reactHTMLEqual(f.boundField("composers").render(),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"composers\" value=\"J\"> John Lennon</label></li>" +
"<li><label><input type=\"checkbox\" name=\"composers\" value=\"P\"> Paul McCartney</label></li>" +
"</ul>")
  f = new SongForm({data: {composers: ["J"]}, autoId: false})
  reactHTMLEqual(f.boundField("composers").render(),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"composers\" value=\"J\" checked> John Lennon</label></li>" +
"<li><label><input type=\"checkbox\" name=\"composers\" value=\"P\"> Paul McCartney</label></li>" +
"</ul>")
  f = new SongForm({data: {composers: ["J", "P"]}, autoId: false})
  reactHTMLEqual(f.boundField("composers").render(),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"composers\" value=\"J\" checked> John Lennon</label></li>" +
"<li><label><input type=\"checkbox\" name=\"composers\" value=\"P\" checked> Paul McCartney</label></li>" +
"</ul>")
})

QUnit.test("Checkbox autoId", 1, function() {
  var SongForm = forms.Form.extend({
    name: forms.CharField()
  , composers: forms.MultipleChoiceField({
      choices: [["J", "John Lennon"], ["P", "Paul McCartney"]]
    , widget: forms.CheckboxSelectMultiple
    })
  })
  // Regarding autoId, CheckboxSelectMultiple is another special case. Each
  // checkbox gets a distinct ID, formed by appending an underscore plus the
  // checkbox's zero-based index.
  var f = new SongForm({autoId: "{name}_id"})
  reactHTMLEqual(function() { return f.boundField("composers").render() },
"<ul id=\"composers_id\">" +
"<li><label for=\"composers_id_0\"><input id=\"composers_id_0\" type=\"checkbox\" name=\"composers\" value=\"J\"> John Lennon</label></li>" +
"<li><label for=\"composers_id_1\"><input id=\"composers_id_1\" type=\"checkbox\" name=\"composers\" value=\"P\"> Paul McCartney</label></li>" +
"</ul>")
})

QUnit.test("Multiple choice list data", 2, function() {
  var SongForm = forms.Form.extend({
    name: forms.CharField()
  , composers: forms.MultipleChoiceField({
      choices: [["J", "John Lennon"], ["P", "Paul McCartney"]]
    , widget: forms.CheckboxSelectMultiple
    })
  })

  var data = {name: "Yesterday", composers: ["J", "P"]}
  var f = new SongForm(data)
  equal(f.errors().isPopulated(), false)

  // This also happens to work with Strings if choice values are single
  // characters.
  var data = {name: "Yesterday", composers: "JP"}
  var f = new SongForm(data)
  equal(f.errors().isPopulated(), false)
})

QUnit.test("Multiple hidden", 8, function() {
  var SongForm = forms.Form.extend({
    name: forms.CharField()
  , composers: forms.MultipleChoiceField({
      choices: [["J", "John Lennon"], ["P", "Paul McCartney"]]
    , widget: forms.CheckboxSelectMultiple
    })
  })

  // The MultipleHiddenInput widget renders multiple values as hidden fields
  var SongFormHidden = forms.Form.extend({
    name: forms.CharField()
  , composers: forms.MultipleChoiceField({
      choices: [["J", "John Lennon"], ["P", "Paul McCartney"]]
    , widget: forms.MultipleHiddenInput
    })
  })

  var f = new SongFormHidden({data: {name: "Yesterday", composers: ["J", "P"]}, autoId: false})
  reactHTMLEqual(f.asUl(),
"<li>Name: <input type=\"text\" name=\"name\" value=\"Yesterday\"><div><input type=\"hidden\" name=\"composers\" value=\"J\"><input type=\"hidden\" name=\"composers\" value=\"P\"></div></li>")

  // When using MultipleChoiceField, the framework expects a list of input and
  // returns a list of input.
  f = new SongForm({data: {name: "Yesterday"}, autoId: false})
  deepEqual(f.errors("composers").messages(), ["This field is required."])
  f = new SongForm({data: {name: "Yesterday", composers: ["J"]}, autoId: false})
  strictEqual(f.errors().isPopulated(), false)
  deepEqual(f.cleanedData["composers"], ["J"])
  equal(f.cleanedData["name"], "Yesterday")
  f = new SongForm({data: {name: "Yesterday", composers: ["J", "P"]}, autoId: false})
  strictEqual(f.errors().isPopulated(), false)
  deepEqual(f.cleanedData["composers"], ["J", "P"])
  equal(f.cleanedData["name"], "Yesterday")
})

/*
QUnit.test("Escaping", 2, function() {
  // Validation errors are HTML-escaped when output as HTML
  var EscapingForm = forms.Form.extend({
    specialName: forms.CharField({label: "<em>Special</em> Field"})
  , specialSafeName: forms.CharField({label: DOMBuilder.html.markSafe("<em>Special</em> Field")})

  , cleanSpecialName: function() {
      throw forms.ValidationError("Something's wrong with '" + this.cleanedData.specialName + "'")
    }
  , cleanSpecialSafeName: function() {
      throw forms.ValidationError(
          DOMBuilder.html.markSafe(
              "'<b>" + this.cleanedData.specialSafeName + "</b>' is a safe string"))
    }
  })
  var f = new EscapingForm({data: {specialName: "Nothing to escape", specialSafeName: "Nothing to escape"}, autoId: false})
  equal(""+f,
"<tr><th>&lt;em&gt;Special&lt;/em&gt; Field:</th><td><ul class=\"errorlist\"><li>Something&#39;s wrong with &#39;Nothing to escape&#39;</li></ul><input type=\"text\" name=\"specialName\" value=\"Nothing to escape\"></td></tr>" +
"<tr><th><em>Special</em> Field:</th><td><ul class=\"errorlist\"><li>'<b>Nothing to escape</b>' is a safe string</li></ul><input type=\"text\" name=\"specialSafeName\" value=\"Nothing to escape\"></td></tr>")
  f = new EscapingForm({
    data: {
      specialName: "Should escape < & > and <script>alert('xss')</script>"
    , specialSafeName: "<i>Do not escape error message</i>"
    }
  , autoId: false
  })
  equal(""+f,
"<tr><th>&lt;em&gt;Special&lt;/em&gt; Field:</th><td><ul class=\"errorlist\"><li>Something&#39;s wrong with &#39;Should escape &lt; &amp; &gt; and &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;&#39;</li></ul><input type=\"text\" name=\"specialName\" value=\"Should escape &lt; &amp; &gt; and &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;\"></td></tr>" +
"<tr><th><em>Special</em> Field:</th><td><ul class=\"errorlist\"><li>'<b><i>Do not escape error message</i></b>' is a safe string</li></ul><input type=\"text\" name=\"specialSafeName\" value=\"&lt;i&gt;Do not escape error message&lt;/i&gt;\"></td></tr>")
})
*/

QUnit.test("Dynamic construction", 17, function() {
  // It's possible to construct a Form dynamically by adding to this.fields
  // during construction. Don't forget to initialise any parent constructors
  // first. Form provides a postInit() hook suitable for this purpose.
  var Person = forms.Form.extend({
    first_name: forms.CharField()
  , last_name: forms.CharField()

  , constructor: function(kwargs) {
      Person.__super__.constructor.call(this, kwargs)
      this.fields["birthday"] = forms.DateField()
    }
  })
  var p = new Person({autoId: false})
  reactHTMLEqual(p.render(),
"<tr><th>First name:</th><td><input type=\"text\" name=\"first_name\"></td></tr>" +
"<tr><th>Last name:</th><td><input type=\"text\" name=\"last_name\"></td></tr>" +
"<tr><th>Birthday:</th><td><input type=\"text\" name=\"birthday\"></td></tr>")

  // Instances of a dynamic Form do not persist fields from one Form instance to
  // the next.
  var MyForm = forms.Form.extend({
    constructor: function(kwargs) {
      MyForm.__super__.constructor.call(this, {data: null, autoId: false})
      for (var i = 0, l = kwargs.fieldList.length; i < l; i++) {
        this.fields[kwargs.fieldList[i][0]] = kwargs.fieldList[i][1]
      }
    }
  })
  var fieldList = [["field1", forms.CharField()], ["field2", forms.CharField()]]
  var myForm = new MyForm({fieldList: fieldList})
  reactHTMLEqual(myForm.render(),
"<tr><th>Field1:</th><td><input type=\"text\" name=\"field1\"></td></tr>" +
"<tr><th>Field2:</th><td><input type=\"text\" name=\"field2\"></td></tr>")
  fieldList = [["field3", forms.CharField()], ["field4", forms.CharField()]]
  myForm = new MyForm({fieldList: fieldList})
  reactHTMLEqual(myForm.render(),
"<tr><th>Field3:</th><td><input type=\"text\" name=\"field3\"></td></tr>" +
"<tr><th>Field4:</th><td><input type=\"text\" name=\"field4\"></td></tr>")

  MyForm = forms.Form.extend({
    default_field_1: forms.CharField()
  , default_field_2: forms.CharField()

  , constructor: function(kwargs) {
      MyForm.__super__.constructor.call(this, {data: null, autoId: false})
      for (var i = 0, l = kwargs.fieldList.length; i < l; i++) {
        this.fields[kwargs.fieldList[i][0]] = kwargs.fieldList[i][1]
      }
    }
  })
  fieldList = [["field1", forms.CharField()], ["field2", forms.CharField()]]
  myForm = new MyForm({fieldList: fieldList})
  reactHTMLEqual(myForm.render(),
"<tr><th>Default field 1:</th><td><input type=\"text\" name=\"default_field_1\"></td></tr>" +
"<tr><th>Default field 2:</th><td><input type=\"text\" name=\"default_field_2\"></td></tr>" +
"<tr><th>Field1:</th><td><input type=\"text\" name=\"field1\"></td></tr>" +
"<tr><th>Field2:</th><td><input type=\"text\" name=\"field2\"></td></tr>")
  fieldList = [["field3", forms.CharField()], ["field4", forms.CharField()]]
  myForm = new MyForm({fieldList: fieldList})
  reactHTMLEqual(myForm.render(),
"<tr><th>Default field 1:</th><td><input type=\"text\" name=\"default_field_1\"></td></tr>" +
"<tr><th>Default field 2:</th><td><input type=\"text\" name=\"default_field_2\"></td></tr>" +
"<tr><th>Field3:</th><td><input type=\"text\" name=\"field3\"></td></tr>" +
"<tr><th>Field4:</th><td><input type=\"text\" name=\"field4\"></td></tr>")

  // Similarly, changes to field attributes do not persist from one Form
  // instance to the next.
  Person = forms.Form.extend({
    first_name: forms.CharField({required: false})
  , last_name: forms.CharField({required: false})

  , constructor: function(kwargs) {
      Person.__super__.constructor.call(this, kwargs)
      if (kwargs.namesRequired) {
        this.fields["first_name"].required = true
        this.fields["first_name"].widget.attrs["class"] = "required"
        this.fields["last_name"].required = true
        this.fields["last_name"].widget.attrs["class"] = "required"
      }
    }
  })
  var f = new Person({namesRequired: false})
  deepEqual([f.boundField("first_name").field.required, f.boundField("last_name").field.required],
       [false, false])
  deepEqual([f.boundField("first_name").field.widget.attrs, f.boundField("last_name").field.widget.attrs],
       [{}, {}])
  f = new Person({namesRequired: true})
  deepEqual([f.boundField("first_name").field.required, f.boundField("last_name").field.required],
       [true, true])
  deepEqual([f.boundField("first_name").field.widget.attrs, f.boundField("last_name").field.widget.attrs],
       [{"class": "required"}, {"class": "required"}])
  f = new Person({namesRequired: false})
  deepEqual([f.boundField("first_name").field.required, f.boundField("last_name").field.required],
       [false, false])
  deepEqual([f.boundField("first_name").field.widget.attrs, f.boundField("last_name").field.widget.attrs],
       [{}, {}])

  Person = forms.Form.extend({
    first_name: forms.CharField({maxLength: 30})
  , last_name: forms.CharField({maxLength: 30})

  , constructor: function(kwargs) {
      Person.__super__.constructor.call(this, kwargs)
      if (kwargs.nameMaxLength) {
        this.fields["first_name"].maxLength = kwargs.nameMaxLength
        this.fields["last_name"].maxLength = kwargs.nameMaxLength
      }
    }
  })
  f = new Person({nameMaxLength: null})
  deepEqual([f.boundField("first_name").field.maxLength, f.boundField("last_name").field.maxLength],
       [30, 30])
  f = new Person({nameMaxLength: 20})
  deepEqual([f.boundField("first_name").field.maxLength, f.boundField("last_name").field.maxLength],
       [20, 20])
  f = new Person({nameMaxLength: null})
  deepEqual([f.boundField("first_name").field.maxLength, f.boundField("last_name").field.maxLength],
       [30, 30])

  // Similarly, choices do not persist from one Form instance to the next
  Person = forms.Form.extend({
    first_name: forms.CharField({maxLength: 30})
  , last_name: forms.CharField({maxLength: 30})
  , gender: forms.ChoiceField({choices: [['f', 'Female'], ['m', 'Male']]})

  , constructor: function(kwargs) {
      kwargs = kwargs || {}
      Person.__super__.constructor.call(this, kwargs)
      if (kwargs.allowUnspecGender) {
        var f = this.fields["gender"]
        f.setChoices(f.choices().concat([['u', 'Unspecified']]))
      }
    }
  })
  f = new Person()
  deepEqual(f.boundField("gender").field.choices(),
            [['f', 'Female'], ['m', 'Male']])
  f = new Person({allowUnspecGender: true})
  deepEqual(f.boundField("gender").field.choices(),
            [['f', 'Female'], ['m', 'Male'], ['u', 'Unspecified']])
  f = new Person()
  deepEqual(f.boundField("gender").field.choices(),
            [['f', 'Female'], ['m', 'Male']])
})

QUnit.test("Independent validators", 3, function() {
  var MyForm = forms.Form.extend({
    myfield: forms.CharField({maxLength: 25})
  })

  var f1 = new MyForm()
    , f2 = new MyForm()
  f1.fields['myfield'].validators[0] = forms.validators.MaxLengthValidator(12)
  ok(f1.fields['myfield'].validators[0] !== f2.fields['myfield'].validators[0])
  cleanErrorEqual(f1.fields['myfield'], 'Ensure this value has at most 12 characters (it has 13).', '1234567890abc')
  cleanErrorEqual(f2.fields['myfield'], 'Ensure this value has at most 25 characters (it has 26).', 'abcdefghijklmnopqrstuvwxyz')
})

QUnit.test("Hidden widget", 12, function() {
  // HiddenInput widgets are displayed differently in the asTable(), asUl()
  // and asDiv() output of a Form - their verbose names are not displayed, and a
  // separate row is not displayed. They're displayed in the last row of the
  // form, directly after that row's form element.
  var Person = forms.Form.extend({
    first_name: forms.CharField()
  , last_name: forms.CharField()
  , hidden_text: forms.CharField({widget: forms.HiddenInput})
  , birthday: forms.DateField()
  })
  var p = new Person({autoId: false})
  reactHTMLEqual(p.asTable(),
"<tr><th>First name:</th><td><input type=\"text\" name=\"first_name\"></td></tr>" +
"<tr><th>Last name:</th><td><input type=\"text\" name=\"last_name\"></td></tr>" +
"<tr><th>Birthday:</th><td><input type=\"text\" name=\"birthday\"><input type=\"hidden\" name=\"hidden_text\" value=\"\"></td></tr>")
  reactHTMLEqual(p.asUl(),
"<li>First name: <input type=\"text\" name=\"first_name\"></li>" +
"<li>Last name: <input type=\"text\" name=\"last_name\"></li>" +
"<li>Birthday: <input type=\"text\" name=\"birthday\"><input type=\"hidden\" name=\"hidden_text\" value=\"\"></li>")
  reactHTMLEqual(p.asDiv(),
"<div>First name: <input type=\"text\" name=\"first_name\"></div>" +
"<div>Last name: <input type=\"text\" name=\"last_name\"></div>" +
"<div>Birthday: <input type=\"text\" name=\"birthday\"><input type=\"hidden\" name=\"hidden_text\" value=\"\"></div>")

  // With autoId set, a HiddenInput still gets an id, but it doesn't get a label.
  p = new Person({autoId: "id_{name}"})
  reactHTMLEqual(p.asTable.bind(p),
"<tr><th><label for=\"id_first_name\">First name:</label></th><td><input type=\"text\" name=\"first_name\" id=\"id_first_name\"></td></tr>" +
"<tr><th><label for=\"id_last_name\">Last name:</label></th><td><input type=\"text\" name=\"last_name\" id=\"id_last_name\"></td></tr>" +
"<tr><th><label for=\"id_birthday\">Birthday:</label></th><td><input type=\"text\" name=\"birthday\" id=\"id_birthday\"><input type=\"hidden\" name=\"hidden_text\" id=\"id_hidden_text\" value=\"\"></td></tr>")
  reactHTMLEqual(p.asUl.bind(p),
"<li><label for=\"id_first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"id_first_name\"></li>" +
"<li><label for=\"id_last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"id_last_name\"></li>" +
"<li><label for=\"id_birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"id_birthday\"><input type=\"hidden\" name=\"hidden_text\" id=\"id_hidden_text\" value=\"\"></li>")
  reactHTMLEqual(p.asDiv.bind(p),
"<div><label for=\"id_first_name\">First name:</label> <input type=\"text\" name=\"first_name\" id=\"id_first_name\"></div>" +
"<div><label for=\"id_last_name\">Last name:</label> <input type=\"text\" name=\"last_name\" id=\"id_last_name\"></div>" +
"<div><label for=\"id_birthday\">Birthday:</label> <input type=\"text\" name=\"birthday\" id=\"id_birthday\"><input type=\"hidden\" name=\"hidden_text\" id=\"id_hidden_text\" value=\"\"></div>")

  // If a field with a HiddenInput has errors, the asTable(), asUl() and asDiv()
  // output will include the error message(s) with the text
  // "(Hidden field [fieldname]) " prepended. This message is displayed at the
  // top of the output, regardless of its field's order in the form.
  p = new Person({data: {first_name: "John", last_name: "Lennon", birthday: "1940-10-9"}, autoId: false})
  reactHTMLEqual(p.asTable(),
"<tr><td colspan=\"2\"><ul class=\"errorlist\"><li>(Hidden field hidden_text) This field is required.</li></ul></td></tr>" +
"<tr><th>First name:</th><td><input type=\"text\" name=\"first_name\" value=\"John\"></td></tr>" +
"<tr><th>Last name:</th><td><input type=\"text\" name=\"last_name\" value=\"Lennon\"></td></tr>" +
"<tr><th>Birthday:</th><td><input type=\"text\" name=\"birthday\" value=\"1940-10-9\"><input type=\"hidden\" name=\"hidden_text\" value=\"\"></td></tr>")
  reactHTMLEqual(p.asUl(),
"<li><ul class=\"errorlist\"><li>(Hidden field hidden_text) This field is required.</li></ul></li>" +
"<li>First name: <input type=\"text\" name=\"first_name\" value=\"John\"></li>" +
"<li>Last name: <input type=\"text\" name=\"last_name\" value=\"Lennon\"></li>" +
"<li>Birthday: <input type=\"text\" name=\"birthday\" value=\"1940-10-9\"><input type=\"hidden\" name=\"hidden_text\" value=\"\"></li>")
  reactHTMLEqual(p.asDiv(),
"<div><ul class=\"errorlist\"><li>(Hidden field hidden_text) This field is required.</li></ul></div>" +
"<div>First name: <input type=\"text\" name=\"first_name\" value=\"John\"></div>" +
"<div>Last name: <input type=\"text\" name=\"last_name\" value=\"Lennon\"></div>" +
"<div>Birthday: <input type=\"text\" name=\"birthday\" value=\"1940-10-9\"><input type=\"hidden\" name=\"hidden_text\" value=\"\"></div>")

  // A corner case: It's possible for a form to have only HiddenInputs. Since
  // we expect that the content of asTable() and asUl() will be held in
  // appropriate HTML elements within the document and we don't want to end up
  // with invalid HTML, a row will be created to contain the hidden fields. In
  // the case of asDiv(), form inputs must reside inside a block-level container
  // to qualify as valid HTML, so the inputs will be wrapped in a <div> in
  // this scenario.
  var TestForm = forms.Form.extend({
    foo: forms.CharField({widget: forms.HiddenInput})
  , bar: forms.CharField({widget: forms.HiddenInput})
  })
  p = new TestForm({autoId: false})
  reactHTMLEqual(p.asTable(),
"<tr><td colspan=\"2\"><input type=\"hidden\" name=\"foo\" value=\"\"><input type=\"hidden\" name=\"bar\" value=\"\"></td></tr>")
  reactHTMLEqual(p.asUl(),
"<li><input type=\"hidden\" name=\"foo\" value=\"\"><input type=\"hidden\" name=\"bar\" value=\"\"></li>")
  reactHTMLEqual(p.asDiv(),
"<div><input type=\"hidden\" name=\"foo\" value=\"\"><input type=\"hidden\" name=\"bar\" value=\"\"></div>")
})

QUnit.test("Field order", 1, function() {
  // A Form's fields are displayed in the same order they were defined
  var TestForm = forms.Form.extend({
    field1: forms.CharField()
  , field2: forms.CharField()
  , field3: forms.CharField()
  , field4: forms.CharField()
  , field5: forms.CharField()
  , field6: forms.CharField()
  , field7: forms.CharField()
  , field8: forms.CharField()
  , field9: forms.CharField()
  , field10: forms.CharField()
  , field11: forms.CharField()
  , field12: forms.CharField()
  , field13: forms.CharField()
  , field14: forms.CharField()
  })
  var p = new TestForm({autoId: false})
  reactHTMLEqual(p.asTable(),
"<tr><th>Field1:</th><td><input type=\"text\" name=\"field1\"></td></tr>" +
"<tr><th>Field2:</th><td><input type=\"text\" name=\"field2\"></td></tr>" +
"<tr><th>Field3:</th><td><input type=\"text\" name=\"field3\"></td></tr>" +
"<tr><th>Field4:</th><td><input type=\"text\" name=\"field4\"></td></tr>" +
"<tr><th>Field5:</th><td><input type=\"text\" name=\"field5\"></td></tr>" +
"<tr><th>Field6:</th><td><input type=\"text\" name=\"field6\"></td></tr>" +
"<tr><th>Field7:</th><td><input type=\"text\" name=\"field7\"></td></tr>" +
"<tr><th>Field8:</th><td><input type=\"text\" name=\"field8\"></td></tr>" +
"<tr><th>Field9:</th><td><input type=\"text\" name=\"field9\"></td></tr>" +
"<tr><th>Field10:</th><td><input type=\"text\" name=\"field10\"></td></tr>" +
"<tr><th>Field11:</th><td><input type=\"text\" name=\"field11\"></td></tr>" +
"<tr><th>Field12:</th><td><input type=\"text\" name=\"field12\"></td></tr>" +
"<tr><th>Field13:</th><td><input type=\"text\" name=\"field13\"></td></tr>" +
"<tr><th>Field14:</th><td><input type=\"text\" name=\"field14\"></td></tr>")
})

QUnit.test("Form HTML attributes", 2, function() {
  // Some Field classes have an effect on the HTML attributes of their
  // associated Widget. If you set maxLength in a CharField and its associated
  // widget is either a TextInput or PasswordInput, then the widget's rendered
  // HTML will include the "maxlength" attribute.
  var UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10}) // Uses forms.TextInput by default
  , password: forms.CharField({maxLength: 10, widget: forms.PasswordInput})
  , realname: forms.CharField({maxLength: 10, widget: forms.TextInput}) // Redundantly define widget, just to test
  , address: forms.CharField()
  })
  var p = new UserRegistration({autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>" +
"<li>Password: <input maxlength=\"10\" type=\"password\" name=\"password\"></li>" +
"<li>Realname: <input maxlength=\"10\" type=\"text\" name=\"realname\"></li>" +
"<li>Address: <input type=\"text\" name=\"address\"></li>")

  // If you specify a custom "attrs" that includes the "maxlength" attribute,
  // the Field's maxLength attribute will override whatever "maxlength" you
  // specify in "attrs".
  UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10, widget: forms.TextInput({attrs: {maxLength: 20}})})
  , password: forms.CharField({maxLength: 10, widget: forms.PasswordInput})
  })
  p = new UserRegistration({autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>" +
"<li>Password: <input maxlength=\"10\" type=\"password\" name=\"password\"></li>")
})

QUnit.test("Specifying labels", 6, function() {
  // You can specify the label for a field by using the "label" argument to a
  // Field class. If you don't specify 'label', newforms will use the field
  // name with underscores converted to spaces, and the initial letter
  // capitalised.
  var UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10, label: "Your username"})
  , password1: forms.CharField({widget: forms.PasswordInput})
  , password2: forms.CharField({widget: forms.PasswordInput, label: "Password (again)"})
  })
  var p = new UserRegistration({autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Your username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>" +
"<li>Password1: <input type=\"password\" name=\"password1\"></li>" +
"<li>Password (again): <input type=\"password\" name=\"password2\"></li>")

  // Labels for as* methods will only end in a colon if they don't end in
  // other punctuation already.
  var Questions = forms.Form.extend({
    q1: forms.CharField({label: "The first question"})
  , q2: forms.CharField({label: "What is your name?"})
  , q3: forms.CharField({label: "The answer to life is:"})
  , q4: forms.CharField({label: "Answer this question!"})
  , q5: forms.CharField({label: "The last question. Period."})
  })
  p = new Questions({autoId: false})
  reactHTMLEqual(p.asDiv(),
"<div>The first question: <input type=\"text\" name=\"q1\"></div>" +
"<div>What is your name? <input type=\"text\" name=\"q2\"></div>" +
"<div>The answer to life is: <input type=\"text\" name=\"q3\"></div>" +
"<div>Answer this question! <input type=\"text\" name=\"q4\"></div>" +
"<div>The last question. Period. <input type=\"text\" name=\"q5\"></div>")

  // If a label is set to the empty string for a field, that field won't get a
  // label.
  UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10, label: ""})
  , password1: forms.CharField({widget: forms.PasswordInput})
  })
  p = new UserRegistration({autoId: false})
  reactHTMLEqual(p.asUl(),
"<li> <input maxlength=\"10\" type=\"text\" name=\"username\"></li>" +
"<li>Password1: <input type=\"password\" name=\"password1\"></li>")
  p = new UserRegistration({autoId: "id_{name}"})
  reactHTMLEqual(p.asUl.bind(p),
"<li> <input maxlength=\"10\" type=\"text\" name=\"username\" id=\"id_username\"></li>" +
"<li><label for=\"id_password1\">Password1:</label> <input type=\"password\" name=\"password1\" id=\"id_password1\"></li>")

  // If label is null, newforms will auto-create the label from the field
  // name. This is the default behavior.
  UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10, label: null})
  , password1: forms.CharField({widget: forms.PasswordInput})
  })
  p = new UserRegistration({autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>" +
"<li>Password1: <input type=\"password\" name=\"password1\"></li>")
  p = new UserRegistration({autoId: "id_{name}"})
  reactHTMLEqual(p.asUl.bind(p),
"<li><label for=\"id_username\">Username:</label> <input maxlength=\"10\" type=\"text\" name=\"username\" id=\"id_username\"></li>" +
"<li><label for=\"id_password1\">Password1:</label> <input type=\"password\" name=\"password1\" id=\"id_password1\"></li>")
})

QUnit.test("Label suffix", 5, function() {
  // You can specify the "labelSuffix" argument to a Form class to modify the
  // punctuation symbol used at the end of a label.  By default, the colon
  // (:) is used, and is only appended to the label if the label doesn't
  // already end with a punctuation symbol: ., !, ? or :.
  var FavouriteForm = forms.Form.extend({
    colour: forms.CharField({label: "Favourite colour?"})
  , animal: forms.CharField({label: "Favourite animal"})
  })
  var f = new FavouriteForm({autoId: false})
  reactHTMLEqual(f.asUl(),
"<li>Favourite colour? <input type=\"text\" name=\"colour\"></li>" +
"<li>Favourite animal: <input type=\"text\" name=\"animal\"></li>")
  f = new FavouriteForm({autoId: false, labelSuffix: "?"})
  reactHTMLEqual(f.asUl(),
"<li>Favourite colour? <input type=\"text\" name=\"colour\"></li>" +
"<li>Favourite animal? <input type=\"text\" name=\"animal\"></li>")
  f = new FavouriteForm({autoId: false, labelSuffix: ""})
  reactHTMLEqual(f.asUl(),
"<li>Favourite colour? <input type=\"text\" name=\"colour\"></li>" +
"<li>Favourite animal <input type=\"text\" name=\"animal\"></li>")
  f = new FavouriteForm({autoId: false, labelSuffix: "\u2192"})
  reactHTMLEqual(f.asUl(),
"<li>Favourite colour? <input type=\"text\" name=\"colour\"></li>" +
"<li>Favourite animal\u2192 <input type=\"text\" name=\"animal\"></li>")

  // Label suffixes are included when label tags are generated directly from
  // BoundFields.
  f = new FavouriteForm({autoId: false})
  equal(''+f.boundField('animal').labelTag(), 'Favourite animal:')
})

QUnit.test("Initial data", 6, function() {
  // You can specify initial data for a field by using the "initial" argument
  // to a Field class. This initial data is displayed when a Form is rendered
  // with *no* data. It is not displayed when a Form is rendered with any data
  // (including an empty object). Also, the initial value is *not* used if
  // data for a particular required field isn't provided.
  var UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10, initial: "django"})
  , password: forms.CharField({widget: forms.PasswordInput})
  })

  // Here, we're not submitting any data, so the initial value will be
  // displayed.
  var p = new UserRegistration({autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"django\"></li>" +
"<li>Password: <input type=\"password\" name=\"password\"></li>")

  // Here, we're submitting data, so the initial value will *not* be displayed.
  p = new UserRegistration({data: {}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>")
  p = new UserRegistration({data: {username: ""}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>")
  p = new UserRegistration({data: {username: "foo"}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"foo\"></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>")

  // An "initial" value is *not* used as a fallback if data is not provided.
  // In this example, we don't provide a value for "username", and the form
  // raises a validation error rather than using the initial value for
  // "username".
  p = new UserRegistration({data: {password: "secret"}})
  deepEqual(p.errors("username").messages(), ["This field is required."])
  strictEqual(p.isValid(), false)
})

QUnit.test("Dynamic initial data", 8, function() {
  // The previous technique dealt with "hard-coded" initial data, but it's
  // also possible to specify initial data after you've already created the
  // Form class (i.e., at runtime). Use the "initial" parameter to the Form
  // constructor. This should be an object containing initial values for one
  // or more fields in the form, keyed by field name.
  var UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10})
  , password: forms.CharField({widget: forms.PasswordInput})
  })

  // Here, we're not submitting any data, so the initial value will be displayed.
  var p = new UserRegistration({initial: {username: "django"}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"django\"></li>" +
"<li>Password: <input type=\"password\" name=\"password\"></li>")
  p = new UserRegistration({initial: {username: "stephane"}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"stephane\"></li>" +
"<li>Password: <input type=\"password\" name=\"password\"></li>")

  // The "initial" parameter is meaningless if you pass data
  p = new UserRegistration({data: {}, initial: {username: "django"}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>")
  p = new UserRegistration({data: {username: ""}, initial: {username: "django"}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>")
  p = new UserRegistration({data: {username: "foo"}, initial: {username: "django"}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"foo\"></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>")

  // A dynamic "initial" value is *not* used as a fallback if data is not
  // provided. In this example, we don't provide a value for "username", and
  // the form raises a validation error rather than using the initial value
  // for "username".
  p = new UserRegistration({data: {password: "secret"}, initial: {username: "django"}})
  deepEqual(p.errors("username").messages(), ["This field is required."])
  strictEqual(p.isValid(), false)

  // If a Form defines "initial" *and* "initial" is passed as a parameter
  // during construction, then the latter will get precedence.
  UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10, initial: "django"})
  , password: forms.CharField({widget: forms.PasswordInput})
  })
  p = new UserRegistration({initial: {username: "babik"}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"babik\"></li>" +
"<li>Password: <input type=\"password\" name=\"password\"></li>")
})

QUnit.test("Callable initial data", 8, function() {
  // The previous technique dealt with raw values as initial data, but it's
  // also possible to specify callable data.
  var UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10})
  , password: forms.CharField({widget: forms.PasswordInput})
  , options: forms.MultipleChoiceField({choices: [["f", "foo"], ["b", "bar"], ["w", "whiz"]]})
  })

  // We need to define functions that get called later
  function initialDjango() { return "django"; }
  function initialStephane() { return "stephane"; }
  function initialOptions() { return ["f", "b"]; }
  function initialOtherOptions() { return ["b", "w"]; }

  // Here, we're not submitting any data, so the initial value will be
  // displayed.
  var p = new UserRegistration({initial: {username: initialDjango, options: initialOptions}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"django\"></li>" +
"<li>Password: <input type=\"password\" name=\"password\"></li>" +
"<li>Options: <select name=\"options\" multiple>" +
"<option value=\"f\" selected>foo</option>" +
"<option value=\"b\" selected>bar</option>" +
"<option value=\"w\">whiz</option>" +
"</select></li>")

  // The "initial" parameter is meaningless if you pass data.
  p = new UserRegistration({data: {}, initial: {username: initialDjango, options: initialOptions}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Options: <select name=\"options\" multiple>" +
"<option value=\"f\">foo</option>" +
"<option value=\"b\">bar</option>" +
"<option value=\"w\">whiz</option>" +
"</select></li>")
  p = new UserRegistration({data: {username: ""}, initial: {username: initialDjango}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Options: <select name=\"options\" multiple>" +
"<option value=\"f\">foo</option>" +
"<option value=\"b\">bar</option>" +
"<option value=\"w\">whiz</option>" +
"</select></li>")
  p = new UserRegistration({data: {username: "foo", options: ["f", "b"]}, initial: {username: initialDjango}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"foo\"></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"></li>" +
"<li>Options: <select name=\"options\" multiple>" +
"<option value=\"f\" selected>foo</option>" +
"<option value=\"b\" selected>bar</option>" +
"<option value=\"w\">whiz</option>" +
"</select></li>")

  // A callable 'initial' value is *not* used as a fallback if data is not
  // provided. In this example, we don't provide a value for 'username', and
  // the form raises a validation error rather than using the initial value
  // for 'username'.
  p = new UserRegistration({data: {password: "secret"}, initial: {username: initialDjango, options: initialOptions}})
  deepEqual(p.errors("username").messages(), ["This field is required."])
  strictEqual(p.isValid(), false)

  // If a Form defines "initial" *and* "initial" is passed as a parameter
  // during construction, then the latter will get precedence.
  UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10, initial: initialDjango})
  , password: forms.CharField({widget: forms.PasswordInput})
  , options: forms.MultipleChoiceField({choices: [["f", "foo"], ["b", "bar"], ["w", "whiz"]], initial: initialOtherOptions})
  })
  p = new UserRegistration({autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"django\"></li>" +
"<li>Password: <input type=\"password\" name=\"password\"></li>" +
"<li>Options: <select name=\"options\" multiple>" +
"<option value=\"f\">foo</option>" +
"<option value=\"b\" selected>bar</option>" +
"<option value=\"w\" selected>whiz</option>" +
"</select></li>")
  p = new UserRegistration({initial: {username: initialStephane, options: initialOptions}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"stephane\"></li>" +
"<li>Password: <input type=\"password\" name=\"password\"></li>" +
"<li>Options: <select name=\"options\" multiple>" +
"<option value=\"f\" selected>foo</option>" +
"<option value=\"b\" selected>bar</option>" +
"<option value=\"w\">whiz</option>" +
"</select></li>")
})

QUnit.test("Changed data", 6, function() {
  var Person = forms.Form.extend({
    first_name: forms.CharField({initial: 'Hans'})
  , last_name: forms.CharField({initial: 'Greatel'})
  , birthday: forms.DateField({initial: new Date(1974, 7, 16)})
  })

  var p = new Person({data: {first_name: 'Hans', last_name: 'Scrmbl', birthday: '1974-08-16'}})
  strictEqual(p.isValid(), true)
  var changedData = p.changedData()
  strictEqual(changedData.indexOf('first_name') !== -1, false)
  strictEqual(changedData.indexOf('last_name') !== -1, true)
  strictEqual(changedData.indexOf('birthday') !== -1, false)

  // Test that a field throwing ValidationError is always in changedData
  var PedanticField = forms.Field.extend({
    toJavaScript: function() {
      throw forms.ValidationError('Whatever')
    }
  })

  var Person2 = Person.extend({
    pedantic: new PedanticField({initial:'whatever', showHiddenInitial: true})
  })

  p = new Person2({data: {
    first_name: 'Hans'
  , last_name: 'Scrmbl'
  , birthday: '1974-08-16'
  , 'initial-pedantic': 'whatever'
  }})
  strictEqual(p.isValid(), false)
  strictEqual(p.changedData().indexOf('pedantic') !== -1, true)
})

QUnit.test("Boundfield values", 4, function() {
  // It's possible to get to the value which would be used for rendering
  // the widget for a field by using the BoundField's value method.
  var UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10, initial: "djangonaut"})
  , password: forms.CharField({widget: forms.PasswordInput})
  })
  var unbound = new UserRegistration()
  var bound = new UserRegistration({data: {password: "foo"}})
  strictEqual(bound.boundField("username").value(), null)
  equal(unbound.boundField("username").value(), "djangonaut")
  equal(bound.boundField("password").value(), "foo")
  strictEqual(unbound.boundField("password").value(), null)
})

QUnit.test("Help text", 6, function() {
  // You can specify descriptive text for a field by using the "helpText"
  // argument to a Field class. This help text is displayed when a Form is
  // rendered.
  var UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10, helpText: "e.g., user@example.com"})
  , password: forms.CharField({widget: forms.PasswordInput, helpText: "Choose wisely."})
  })
  var p = new UserRegistration({autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"> <span class=\"helpText\">e.g., user@example.com</span></li>" +
"<li>Password: <input type=\"password\" name=\"password\"> <span class=\"helpText\">Choose wisely.</span></li>")
  reactHTMLEqual(p.asDiv(),
"<div>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"> <span class=\"helpText\">e.g., user@example.com</span></div>" +
"<div>Password: <input type=\"password\" name=\"password\"> <span class=\"helpText\">Choose wisely.</span></div>")
  reactHTMLEqual(p.asTable(),
"<tr><th>Username:</th><td><input maxlength=\"10\" type=\"text\" name=\"username\"><br><span class=\"helpText\">e.g., user@example.com</span></td></tr>" +
"<tr><th>Password:</th><td><input type=\"password\" name=\"password\"><br><span class=\"helpText\">Choose wisely.</span></td></tr>")

  // The help text is displayed whether or not data is provided for the form.
  p = new UserRegistration({data: {username: "foo"}, autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"foo\"> <span class=\"helpText\">e.g., user@example.com</span></li>" +
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul>Password: <input type=\"password\" name=\"password\"> <span class=\"helpText\">Choose wisely.</span></li>")

  // Help text is not displayed for hidden fields. It can be used for
  // documentation purposes, though.
  UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10, helpText: "e.g., user@example.com"})
  , password: forms.CharField({widget: forms.PasswordInput})
  , next: forms.CharField({widget: forms.HiddenInput, initial: "/", helpText: "Redirect destination"})
  })
  p  = new UserRegistration({autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\"> <span class=\"helpText\">e.g., user@example.com</span></li>" +
"<li>Password: <input type=\"password\" name=\"password\"><input type=\"hidden\" name=\"next\" value=\"&#x2f;\"></li>")

  // To include HTML in help text when using defaultrendering, pass an object
  // with an __html property.
  UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10, helpText: "e.g., user@example.com"})
  , password: forms.CharField({widget: forms.PasswordInput, helpText: {__html: "Choose <em>very</em> wisely."}})
  })
  p = new UserRegistration({autoId: false})
  reactHTMLEqual(p.asTable(),
"<tr><th>Username:</th><td><input maxlength=\"10\" type=\"text\" name=\"username\"><br><span class=\"helpText\">e.g., user@example.com</span></td></tr>" +
"<tr><th>Password:</th><td><input type=\"password\" name=\"password\"><br><span class=\"helpText\">Choose <em>very</em> wisely.</span></td></tr>",
  "HTML in helpText")
})

QUnit.test("Extending forms", 13, function() {
  // You can extend a Form to add fields. The resulting form will have all of
  // the fields of the parent Form, plus whichever fields you define in the
  // subclass.
  var Person = forms.Form.extend({
    first_name: forms.CharField()
  , last_name: forms.CharField()
  , birthday: forms.DateField()
  })
  var Musician = Person.extend({
    instrument: forms.CharField()
  })
  var p = new Person({autoId: false})
  reactHTMLEqual(p.asUl(),
"<li>First name: <input type=\"text\" name=\"first_name\"></li>" +
"<li>Last name: <input type=\"text\" name=\"last_name\"></li>" +
"<li>Birthday: <input type=\"text\" name=\"birthday\"></li>")
  var m = new Musician({autoId: false})
  reactHTMLEqual(m.asUl(),
"<li>First name: <input type=\"text\" name=\"first_name\"></li>" +
"<li>Last name: <input type=\"text\" name=\"last_name\"></li>" +
"<li>Birthday: <input type=\"text\" name=\"birthday\"></li>" +
"<li>Instrument: <input type=\"text\" name=\"instrument\"></li>")

  // You can use the fields and prototype functions of multiple forms by passing
  // a list of constructors as a mixin. The fields are added in the order in
  // which the Forms are given.
  var Person = forms.Form.extend({
    first_name: forms.CharField()
  , last_name: forms.CharField()
  , birthday: forms.DateField()

  , clean_first_name: function() {
      throw forms.ValidationError("Method from Person.")
    }

  , clean_last_name: function() {
      throw forms.ValidationError("Method from Person.")
    }
  })
  var Instrument = forms.Form.extend({
    instrument: forms.CharField()

  , clean_birthday: function() {
      throw forms.ValidationError("Method from Instrument.")
    }
  })
  var Beatle = forms.Form.extend({
    __mixin__: [Person, Instrument]
  , haircut_type: forms.CharField()

  , clean_last_name: function() {
      throw forms.ValidationError("Method from Beatle.")
    }
  })
  var b = new Beatle({autoId: false})
  reactHTMLEqual(b.asUl(),
"<li>First name: <input type=\"text\" name=\"first_name\"></li>" +
"<li>Last name: <input type=\"text\" name=\"last_name\"></li>" +
"<li>Birthday: <input type=\"text\" name=\"birthday\"></li>" +
"<li>Instrument: <input type=\"text\" name=\"instrument\"></li>" +
"<li>Haircut type: <input type=\"text\" name=\"haircut_type\"></li>")

  var b = new Beatle({data:{first_name: "Alan", last_name: "Partridge", birthday: "1960-04-01", instrument: "Voice", haircut_type: "Floppy"}})
  deepEqual(b.errors("first_name").messages(), ["Method from Person."])
  deepEqual(b.errors("birthday").messages(), ["Method from Instrument."])
  deepEqual(b.errors("last_name").messages(), ["Method from Beatle."])

  // You can also mix and match by extending one form and mixing in another.
  var Beatle = Person.extend({
    __mixin__: Instrument
  , haircut_type: forms.CharField()

  , clean_last_name: function() {
      throw forms.ValidationError("Method from Beatle.")
    }
  })

  var b = new Beatle({autoId: false})
  reactHTMLEqual(b.asUl(),
"<li>First name: <input type=\"text\" name=\"first_name\"></li>" +
"<li>Last name: <input type=\"text\" name=\"last_name\"></li>" +
"<li>Birthday: <input type=\"text\" name=\"birthday\"></li>" +
"<li>Instrument: <input type=\"text\" name=\"instrument\"></li>" +
"<li>Haircut type: <input type=\"text\" name=\"haircut_type\"></li>")

  var b = new Beatle({data:{first_name: "Alan", last_name: "Partridge", birthday: "1960-04-01", instrument: "Voice", haircut_type: "Floppy"}})
  deepEqual(b.errors("first_name").messages(), ["Method from Person."])
  deepEqual(b.errors("birthday").messages(), ["Method from Instrument."])
  deepEqual(b.errors("last_name").messages(), ["Method from Beatle."])

  // It's possible to opt-out from a Field inherited from a parent or mixed-in
  // form by shadowing it.
  var PersonNameForm = Person.extend({
    birthday: null
  })
  var p = new PersonNameForm({autoId: null})
  reactHTMLEqual(p.asUl(),
"<li>First name: <input type=\"text\" name=\"first_name\"></li>\
<li>Last name: <input type=\"text\" name=\"last_name\"></li>",
  "shadow a field from a parent to exclude it")

  var MysteryBeatle = forms.Form.extend({
    __mixin__: [Person, Instrument]
  , haircut_type: forms.CharField()
  , first_name: null
  , last_name: null
  })
  var b = new MysteryBeatle({autoId: false})
  reactHTMLEqual(b.asUl(),
"<li>Birthday: <input type=\"text\" name=\"birthday\"></li>\
<li>Instrument: <input type=\"text\" name=\"instrument\"></li>\
<li>Haircut type: <input type=\"text\" name=\"haircut_type\"></li>",
  "shadow a field from a __mixin__ form to exclude it")

  var FullNameMixin = forms.Form.extend({
    full_name: forms.CharField()
  , first_name: null
  , last_name: null
  })
  var FullNameForm = Person.extend({
    __mixin__: [FullNameMixin]
  })
  var b = new FullNameForm({autoId: false})
  reactHTMLEqual(b.asUl(),
"<li>Birthday: <input type=\"text\" name=\"birthday\"></li>\
<li>Full name: <input type=\"text\" name=\"full_name\"></li>",
  "mixins can also shadow fields from forms being extended or mixed-in")
})

QUnit.test("Forms with prefixes", 30, function() {
  // Sometimes it's necessary to have multiple forms display on the same HTML
  // page, or multiple copies of the same form. We can accomplish this with
  // form prefixes. Pass a "prefix" argument to the Form constructor to use
  // this feature. This value will be prepended to each HTML form field name.
  // One way to think about this is "namespaces for HTML forms". Notice that
  // in the data argument, each field's key has the prefix, in this case
  // "person1", prepended to the actual field name.
  var Person = forms.Form.extend({
    first_name: forms.CharField()
  , last_name: forms.CharField()
  , birthday: forms.DateField()
  })
  var data = {
    "person1-first_name": "John"
  , "person1-last_name": "Lennon"
  , "person1-birthday": "1940-10-9"
  }
  var p = new Person({data: data, prefix: "person1"})
  reactHTMLEqual(p.asUl.bind(p),
"<li><label for=\"id_person1-first_name\">First name:</label> <input type=\"text\" name=\"person1-first_name\" id=\"id_person1-first_name\" value=\"John\"></li>" +
"<li><label for=\"id_person1-last_name\">Last name:</label> <input type=\"text\" name=\"person1-last_name\" id=\"id_person1-last_name\" value=\"Lennon\"></li>" +
"<li><label for=\"id_person1-birthday\">Birthday:</label> <input type=\"text\" name=\"person1-birthday\" id=\"id_person1-birthday\" value=\"1940-10-9\"></li>")
  reactHTMLEqual(function() { return p.boundField("first_name").render() },
"<input type=\"text\" name=\"person1-first_name\" id=\"id_person1-first_name\" value=\"John\">")
  reactHTMLEqual(function() { return p.boundField("last_name").render() },
"<input type=\"text\" name=\"person1-last_name\" id=\"id_person1-last_name\" value=\"Lennon\">")
  reactHTMLEqual(function() { return p.boundField("birthday").render() },
"<input type=\"text\" name=\"person1-birthday\" id=\"id_person1-birthday\" value=\"1940-10-9\">")
  strictEqual(p.errors().isPopulated(), false)
  strictEqual(p.isValid(), true)
  equal(p.cleanedData["first_name"], "John")
  equal(p.cleanedData["last_name"], "Lennon")
  equal(p.cleanedData["birthday"].valueOf(), new Date(1940, 9, 9).valueOf())

  // Let's try submitting some bad data to make sure form.errors and
  // field.errors work as expected.
  data = {
    "person1-first_name": ""
  , "person1-last_name": ""
  , "person1-birthday": ""
  }
  p = new Person({data: data, prefix: "person1"})
  deepEqual(p.errors("first_name").messages(), ["This field is required."])
  deepEqual(p.errors("last_name").messages(), ["This field is required."])
  deepEqual(p.errors("birthday").messages(), ["This field is required."])
  deepEqual(p.boundField("first_name").errors().messages(), ["This field is required."])
  try { p.boundField("person1-first_name"); } catch(e) { equal(e.message, "Form does not have a 'person1-first_name' field."); }

  // In this example, the data doesn't have a prefix, but the form requires
  // it, so the form doesn't "see" the fields.
  data = {
    "first_name": "John"
  , "last_name": "Lennon"
  , "birthday": "1940-10-9"
  }
  p = new Person({data: data, prefix: "person1"})
  deepEqual(p.errors("first_name").messages(), ["This field is required."])
  deepEqual(p.errors("last_name").messages(), ["This field is required."])
  deepEqual(p.errors("birthday").messages(), ["This field is required."])

  // With prefixes, a single data object can hold data for multiple instances
  // of the same form.
  data = {
    "person1-first_name": "John"
  , "person1-last_name": "Lennon"
  , "person1-birthday": "1940-10-9"
  , "person2-first_name": "Jim"
  , "person2-last_name": "Morrison"
  , "person2-birthday": "1943-12-8"
  }
  var p1 = new Person({data: data, prefix: "person1"})
  strictEqual(p1.isValid(), true)
  equal(p1.cleanedData["first_name"], "John")
  equal(p1.cleanedData["last_name"], "Lennon")
  equal(p1.cleanedData["birthday"].valueOf(), new Date(1940, 9, 9).valueOf())
  var p2 = new Person({data: data, prefix: "person2"})
  strictEqual(p2.isValid(), true)
  equal(p2.cleanedData["first_name"], "Jim")
  equal(p2.cleanedData["last_name"], "Morrison")
  equal(p2.cleanedData["birthday"].valueOf(), new Date(1943, 11, 8).valueOf())

  // By default, forms append a hyphen between the prefix and the field name,
  // but a form can alter that behavior by implementing the addPrefix()
  // method. This method takes a field name and returns the prefixed field,
  // according to this.prefix.
  Person = forms.Form.extend({
    first_name: forms.CharField()
  , last_name: forms.CharField()
  , birthday: forms.DateField()

  , addPrefix: function(fieldName) {
      if (this.prefix) {
        return this.prefix + "-prefix-" + fieldName
      }
      return fieldName
    }
  })
  p = new Person({prefix: "foo"})
  reactHTMLEqual(p.asUl.bind(p),
"<li><label for=\"id_foo-prefix-first_name\">First name:</label> <input type=\"text\" name=\"foo-prefix-first_name\" id=\"id_foo-prefix-first_name\"></li>" +
"<li><label for=\"id_foo-prefix-last_name\">Last name:</label> <input type=\"text\" name=\"foo-prefix-last_name\" id=\"id_foo-prefix-last_name\"></li>" +
"<li><label for=\"id_foo-prefix-birthday\">Birthday:</label> <input type=\"text\" name=\"foo-prefix-birthday\" id=\"id_foo-prefix-birthday\"></li>")
  data = {
      "foo-prefix-first_name": "John",
      "foo-prefix-last_name": "Lennon",
      "foo-prefix-birthday": "1940-10-9"
  }
  p = new Person({data: data, prefix: "foo"})
  strictEqual(p.isValid(), true)
  equal(p.cleanedData["first_name"], "John")
  equal(p.cleanedData["last_name"], "Lennon")
  equal(p.cleanedData["birthday"].valueOf(), new Date(1940, 9, 9).valueOf())
})

QUnit.test("Forms with null boolean", 6, function() {
  // NullBooleanField is a bit of a special case because its presentation
  // (widget) is different than its data. This is handled transparently,
  // though.
  var Person = forms.Form.extend({
    name: forms.CharField()
  , is_cool: forms.NullBooleanField()
  })
  var p = new Person({data: {name: "Joe"}, autoId: false})
  reactHTMLEqual(p.boundField("is_cool").render(),
"<select name=\"is_cool\">" +
"<option value=\"1\" selected>Unknown</option>" +
"<option value=\"2\">Yes</option>" +
"<option value=\"3\">No</option>" +
"</select>")
  p = new Person({data: {name: "Joe", is_cool: "1"}, autoId: false})
  reactHTMLEqual(p.boundField("is_cool").render(),
"<select name=\"is_cool\">" +
"<option value=\"1\" selected>Unknown</option>" +
"<option value=\"2\">Yes</option>" +
"<option value=\"3\">No</option>" +
"</select>")
  p = new Person({data: {name: "Joe", is_cool: "2"}, autoId: false})
  reactHTMLEqual(p.boundField("is_cool").render(),
"<select name=\"is_cool\">" +
"<option value=\"1\">Unknown</option>" +
"<option value=\"2\" selected>Yes</option>" +
"<option value=\"3\">No</option>" +
"</select>")
  p = new Person({data: {name: "Joe", is_cool: "3"}, autoId: false})
  reactHTMLEqual(p.boundField("is_cool").render(),
"<select name=\"is_cool\">" +
"<option value=\"1\">Unknown</option>" +
"<option value=\"2\">Yes</option>" +
"<option value=\"3\" selected>No</option>" +
"</select>")
  p = new Person({data: {name: "Joe", is_cool: true}, autoId: false})
  reactHTMLEqual(p.boundField("is_cool").render(),
"<select name=\"is_cool\">" +
"<option value=\"1\">Unknown</option>" +
"<option value=\"2\" selected>Yes</option>" +
"<option value=\"3\">No</option>" +
"</select>")
  p = new Person({data: {name: "Joe", is_cool: false}, autoId: false})
  reactHTMLEqual(p.boundField("is_cool").render(),
"<select name=\"is_cool\">" +
"<option value=\"1\">Unknown</option>" +
"<option value=\"2\">Yes</option>" +
"<option value=\"3\" selected>No</option>" +
"</select>")
})

QUnit.test("emptyPermitted", 12, function() {
  // Sometimes (pretty much in formsets) we want to allow a form to pass
  // validation if it is completely empty. We can accomplish this by using the
  // emptyPermitted argument to a form constructor.
  var SongForm = forms.Form.extend({
    artist: forms.CharField()
  , name: forms.CharField()
  })

  // First let's show what happens if emptyPermitted == false (the default)
  var data = {artist: "", name: ""}
  var form = new SongForm({data: data, emptyPermitted: false})
  strictEqual(form.isValid(), false)
  deepEqual(form.errors("artist").messages(), ["This field is required."])
  deepEqual(form.errors("name").messages(), ["This field is required."])
  deepEqual(form.cleanedData, {})

  // Now let's show what happens when emptyPermitted == true and the form is
  // empty.
  form = new SongForm({data: data, emptyPermitted: true})
  strictEqual(form.isValid(), true)
  strictEqual(form.errors().isPopulated(), false)
  deepEqual(form.cleanedData, {})

  // But if we fill in data for one of the fields, the form is no longer empty
  // and the whole thing must pass validation.
  data = {artist: "The Doors", name: ""}
  form = new SongForm({data: data, emptyPermitted: true})
  strictEqual(form.isValid(), false)
  deepEqual(form.errors("name").messages(), ["This field is required."])
  deepEqual(form.cleanedData, {artist: "The Doors"})

  // If a field is not given in the data then null is returned for its data.
  // Make sure that when checking for emptyPermitted that null is treated
  // accordingly.
  data = {artist: null, name: ""}
  form = new SongForm({data: data, emptyPermitted: true})
  strictEqual(form.isValid(), true)

  // However, we *really* need to be sure we are checking for null as any data
  // in initial that is falsy in a boolean context needs to be treated
  // literally.
  var PriceForm = forms.Form.extend({
    amount: forms.FloatField()
  , qty: forms.IntegerField()
  })

  data = {amount: "0.0", qty: ""}
  form = new PriceForm({data: data, initial: {amount: 0.0}, emptyPermitted: true})
  strictEqual(form.isValid(), true)
})

QUnit.test("Extracting hidden and visible", 2, function() {
  var SongForm = forms.Form.extend({
    token: forms.CharField({widget: forms.HiddenInput})
  , artist: forms.CharField()
  , name: forms.CharField()
  })
  var form = new SongForm()
  var hidden = form.hiddenFields()
  deepEqual([hidden.length, hidden[0].name], [1, "token"])
  var visible = form.visibleFields()
  deepEqual([visible.length, visible[0].name, visible[1].name], [2, "artist", "name"])
})

QUnit.test("Hidden initial gets id", 1, function() {
  var MyForm = forms.Form.extend({
    field1: forms.CharField({maxLength: 50, showHiddenInitial: true})
  })
  reactHTMLEqual(function() { return new MyForm().asTable() },
"<tr><th><label for=\"id_field1\">Field1:</label></th><td><div><input maxlength=\"50\" type=\"text\" name=\"field1\" id=\"id_field1\"><input type=\"hidden\" name=\"initial-field1\" id=\"initial-id_field1\" value=\"\"></div></td></tr>")
})

QUnit.test("Row/error/required HTML classes", 3, function() {
  var Person = forms.Form.extend({
    name: forms.CharField()
  , is_cool: forms.NullBooleanField()
  , email: forms.EmailField({required: false})
  , age: forms.IntegerField()
  })

  var p = new Person({data: {}})
  p.rowCssClass = "row"
  p.errorCssClass = "error"
  p.requiredCssClass = "required"
  reactHTMLEqual(p.asUl.bind(p),
"<li class=\"row error required\"><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_name\">Name:</label> <input type=\"text\" name=\"name\" id=\"id_name\"></li>" +
"<li class=\"row required\"><label for=\"id_is_cool\">Is cool:</label> <select name=\"is_cool\" id=\"id_is_cool\">" +
"<option value=\"1\" selected>Unknown</option>" +
"<option value=\"2\">Yes</option>" +
"<option value=\"3\">No</option>" +
"</select></li>" +
"<li class=\"row\"><label for=\"id_email\">Email:</label> <input type=\"email\" name=\"email\" id=\"id_email\"></li>" +
"<li class=\"row error required\"><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_age\">Age:</label> <input type=\"number\" name=\"age\" id=\"id_age\"></li>")
  reactHTMLEqual(p.asDiv.bind(p),
"<div class=\"row error required\"><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_name\">Name:</label> <input type=\"text\" name=\"name\" id=\"id_name\"></div>" +
"<div class=\"row required\"><label for=\"id_is_cool\">Is cool:</label> <select name=\"is_cool\" id=\"id_is_cool\">" +
"<option value=\"1\" selected>Unknown</option>" +
"<option value=\"2\">Yes</option>" +
"<option value=\"3\">No</option>" +
"</select></div>" +
"<div class=\"row\"><label for=\"id_email\">Email:</label> <input type=\"email\" name=\"email\" id=\"id_email\"></div>" +
"<div class=\"row error required\"><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_age\">Age:</label> <input type=\"number\" name=\"age\" id=\"id_age\"></div>")
  reactHTMLEqual(p.asTable.bind(p),
"<tr class=\"row error required\"><th><label for=\"id_name\">Name:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"text\" name=\"name\" id=\"id_name\"></td></tr>" +
"<tr class=\"row required\"><th><label for=\"id_is_cool\">Is cool:</label></th><td><select name=\"is_cool\" id=\"id_is_cool\">" +
"<option value=\"1\" selected>Unknown</option>" +
"<option value=\"2\">Yes</option>" +
"<option value=\"3\">No</option>" +
"</select></td></tr>" +
"<tr class=\"row\"><th><label for=\"id_email\">Email:</label></th><td><input type=\"email\" name=\"email\" id=\"id_email\"></td></tr>" +
"<tr class=\"row error required\"><th><label for=\"id_age\">Age:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"number\" name=\"age\" id=\"id_age\"></td></tr>")
})

QUnit.test("Label split datetime not displayed", 1, function() {
  var EventForm = forms.Form.extend({
    happened_at: forms.SplitDateTimeField({widget: forms.SplitHiddenDateTimeWidget})
  })
  var form = new EventForm()
  reactHTMLEqual(form.asUl.bind(form),
"<li><div><input type=\"hidden\" name=\"happened_at_0\" data-newforms-field=\"happened_at\" id=\"id_happened_at_0\" value=\"\"><input type=\"hidden\" name=\"happened_at_1\" data-newforms-field=\"happened_at\" id=\"id_happened_at_1\" value=\"\"></div></li>")
})

QUnit.test("Multipart-encoded forms", 3, function() {
  var FormWithoutFile = forms.Form.extend({username: forms.CharField()})
  var FormWithFile = forms.Form.extend({file: forms.FileField()})
  var FormWithImage = forms.Form.extend({file: forms.ImageField()})

  strictEqual(new FormWithoutFile().isMultipart(), false)
  strictEqual(new FormWithFile().isMultipart(), true)
  strictEqual(new FormWithImage().isMultipart(), true)
})

QUnit.test('MultiValueField validation', 6, function() {
  function badNames(value) {
    if (value == 'bad value') {
      throw forms.ValidationError('bad value not allowed')
    }
  }

  var NameField = forms.MultiValueField.extend({
    constructor: function(kwargs) {
      if (!(this instanceof forms.Field)) return new NameField(kwargs)
      kwargs.fields = [
        forms.CharField({label: 'First name', maxLength: 10})
      , forms.CharField({label: 'Last name', maxLength: 10})
      ]
      NameField.__super__.constructor.call(this, kwargs)
    }
  , compress: function(dataList) {
      return dataList.join(' ')
    }
  })

  var NameForm = forms.Form.extend({
    name: NameField({validators: [badNames]})
  })

  var form = new NameForm({data: {name: ['bad', 'value']}})
  form.fullClean()
  ok(!form.isValid())
  deepEqual(form.errors('name').messages(), ['bad value not allowed'])

  form = new NameForm({data: {name: [ 'should be overly', 'long for the field names']}})
  ok(!form.isValid())
  deepEqual(form.errors('name').messages(), ['Ensure this value has at most 10 characters (it has 16).',
                                             'Ensure this value has at most 10 characters (it has 24).'])

  form = new NameForm({data: {name : ['fname', 'lname']}})
  ok(form.isValid())
  deepEqual(form.cleanedData, {name: 'fname lname'})
})

// TODO test_multivalue_deep_copy

QUnit.test("MultiValueField optional subfields", function() {
  var PhoneField = forms.MultiValueField.extend({
    constructor: function(kwargs) {
      kwargs = kwargs || {}
      kwargs.fields = [
        forms.CharField({label: 'Country Code', validators: [
          forms.validators.RegexValidator({regex: /^\+\d{1,2}$/, message: 'Enter a valid country code.'})
        ]})
      , forms.CharField({label: 'Phone Number'})
      , forms.CharField({label: 'Extension', errorMessages: {incomplete: 'Enter an extension.'}})
      , forms.CharField({label: 'Label', required: false, helpText: 'E.g. home, work.'})
      ]
      forms.MultiValueField.call(this, kwargs)
    }
  , compress: function(d) {
      if (d && d.length) {
        return [d[0] || '', '.', d[1] || '', ' ext. ', d[2] || '',' (label: ',
                d[3] || '', ')'].join('')
      }
      return null
    }
  })

  // An empty value for any field will throw a 'required' error on a required
  // MultiValueField.
  var f = new PhoneField()
  cleanErrorEqual(f, 'This field is required.', '')
  cleanErrorEqual(f, 'This field is required.', null)
  cleanErrorEqual(f, 'This field is required.', [])
  cleanErrorEqual(f, 'This field is required.', ['+61'])
  cleanErrorEqual(f, 'This field is required.', ['+61', '287654321', '123'])
  equal(f.clean(['+61', '287654321', '123', 'Home']), '+61.287654321 ext. 123 (label: Home)')
  cleanErrorEqual(f, 'Enter a valid country code.', ['61', '287654321', '123', 'Home'])

  // Empty values for fields will NOT raise a 'required' error on an optional
  // MultiValueField.
  var f = new PhoneField({required: false})
  equal(f.clean(''), null)
  equal(f.clean(null), null)
  equal(f.clean([]), null)
  equal(f.clean(['+61']), '+61. ext.  (label: )')
  equal(f.clean(['+61', '287654321', '123']), '+61.287654321 ext. 123 (label: )')
  equal(f.clean(['+61', '287654321', '123', 'Home']), '+61.287654321 ext. 123 (label: Home)')
  cleanErrorEqual(f, 'Enter a valid country code.', ['61', '287654321', '123', 'Home'])

  // For a required MultiValueField with requireAllFields=false`, a 'required'
  // error will only be thrown if all fields are empty. Fields can individually
  // be required or optional. An empty value for any required field will raise
  // an 'incomplete' error.
  var f = new PhoneField({requireAllFields: false})
  cleanErrorEqual(f, 'This field is required.', '')
  cleanErrorEqual(f, 'This field is required.', null)
  cleanErrorEqual(f, 'This field is required.', [])
  cleanErrorEqual(f, ['Enter a complete value.', 'Enter an extension.'], ['+61'])
  equal(f.clean(['+61', '287654321', '123']), '+61.287654321 ext. 123 (label: )')
  cleanErrorEqual(f, ['Enter a complete value.', 'Enter an extension.'], ['', '', '', 'Home'])
  cleanErrorEqual(f, 'Enter a valid country code.', ['61', '287654321', '123', 'Home'])

  //For an optional MultiValueField with requireAllFields=false, we don't get
  // any 'required' error but we still get 'incomplete' errors.
  var f = new PhoneField({required: false, requireAllFields: false})
  equal(f.clean(''), null)
  equal(f.clean(null), null)
  equal(f.clean([]), null)
  cleanErrorEqual(f, ['Enter a complete value.', 'Enter an extension.'], ['+61'])
  equal(f.clean(['+61', '287654321', '123']), '+61.287654321 ext. 123 (label: )')
  cleanErrorEqual(f, ['Enter a complete value.', 'Enter an extension.'], ['', '', '', 'Home'])
  cleanErrorEqual(f, 'Enter a valid country code.', ['61', '287654321', '123', 'Home'])
})

// TODO test_custom_empty_values

QUnit.test('Boundfield labels', 9, function() {
  var SomeForm = forms.Form.extend({
    field: forms.CharField()
  })
  var boundField = new SomeForm().boundField('field')
  reactHTMLEqual(boundField.labelTag(), "<label for=\"id_field\">Field:</label>")
  reactHTMLEqual(boundField.labelTag({contents: 'custom'}), "<label for=\"id_field\">custom:</label>")
  reactHTMLEqual(boundField.labelTag({attrs: {className: 'pretty'}}), "<label class=\"pretty\" for=\"id_field\">Field:</label>")

  // If a widget has no id, labelTag just returns the text with no surrounding
  // <label>.
  boundField = new SomeForm({autoId: ''}).boundField('field')
  equal(boundField.labelTag(), "Field:")
  equal(boundField.labelTag({contents: 'custom'}), "custom:")

  // Empty label behaviour
  var f = new SomeForm()
  f.fields.field.label = ''
  reactHTMLEqual(f.boundField('field').labelTag(), "<label for=\"id_field\"></label>")

  // BoundField labelSuffix overrides form labelSuffix when provided
  boundField = new SomeForm({labelSuffix: '!'}).boundField('field')
  reactHTMLEqual(boundField.labelTag({labelSuffix: '$'}), "<label for=\"id_field\">Field$</label>")

  var CustomIdForLabelTextInput = forms.TextInput.extend({
    idForLabel: function(id) {
      return 'custom_' + id
    }
  })

  var EmptyIdForLabelTextInput = forms.TextInput.extend({
    idForLabel: function(id) {
      return null
    }
  })

  var IdForLabelForm = forms.Form.extend({
    custom: forms.CharField({widget: CustomIdForLabelTextInput})
  , empty: forms.CharField({widget: EmptyIdForLabelTextInput})
  })
  f = new IdForLabelForm()
  reactHTMLEqual(f.boundField('custom').labelTag(), "<label for=\"custom_id_custom\">Custom:</label>")
  reactHTMLEqual(f.boundField('empty').labelTag(), "<label>Empty:</label>")
})

QUnit.test('ErrorObject', 4, function() {
  var MyForm = forms.Form.extend({
    foo: forms.CharField()
  , bar: forms.CharField()
  , clean: function() {
      throw forms.ValidationError('Non-field error.', {code: 'secret', params: {a: 1, b: 2}})
    }
  })

  var form = new MyForm({data: {}})
  strictEqual(form.isValid(), false)
  var errors = form.errors()
  equal(errors.asText(),
"* foo\n\
  * This field is required.\n\
* bar\n\
  * This field is required.\n\
* __all__\n\
  * Non-field error.")
  reactHTMLEqual(errors.asUl(),
"<ul class=\"errorlist\">\
<li>foo<ul class=\"errorlist\"><li>This field is required.</li></ul></li>\
<li>bar<ul class=\"errorlist\"><li>This field is required.</li></ul></li>\
<li>__all__<ul class=\"errorlist\"><li>Non-field error.</li></ul></li>\
</ul>")
  deepEqual(errors.toJSON(), {
    foo: [{code: 'required', message: 'This field is required.'}]
  , bar: [{code: 'required', message: 'This field is required.'}]
  , __all__: [{code: 'secret', message: 'Non-field error.'}]
  })
})

QUnit.test('ErrorList', function() {
  var e = forms.ErrorList()
  e.extend(['Foo',
    forms.ValidationError('Foo{bar}', {code: 'foobar', params: {bar: 'bar'}})
  ])
  equal(e.asText(),
"* Foo\n\
* Foobar")
  reactHTMLEqual(e.asUl(),
"<ul class=\"errorlist\">\
<li>Foo</li>\
<li>Foobar</li>\
</ul>")
  deepEqual(e.toJSON(), [
    {message: 'Foo', code: ''}
  , {message: 'Foobar', code: 'foobar'}
  ])
})

}()
