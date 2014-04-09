void function() {

var _browser

QUnit.module("forms (browser)", {
  setup: function() {
    _browser = forms.env.browser
    forms.env.browser = true
  }
, teardown: function() {
    forms.env.browser =_browser
  }
})

QUnit.test("Validating multiple fields", 26, function() {
  // There are a couple of ways to do multiple-field validation. If you want
  // the validation message to be associated with a particular field,
  // implement the clean_XXX() method on the Form, where XXX is the field
  // name. As in Field.clean(), the clean_XXX() method should return the
  // cleaned value. In the clean_XXX() method, you have access to
  // this.cleanedData, which is an object containing all the data that has
  // been cleaned *so far*, in order by the fields, including the current
  // field (e.g., the field XXX if you're in clean_XXX()).
  var UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10})
  , password1: forms.CharField({widget: forms.PasswordInput})
  , password2: forms.CharField({widget: forms.PasswordInput})

  , clean_password2: function() {
      if (this.cleanedData.password1 != this.cleanedData.password2) {
        throw forms.ValidationError("Please make sure your passwords match.")
      }
      return this.cleanedData.password2
    }
  })
  var f = new UserRegistration({autoId: false})
  strictEqual(f.errors().isPopulated(), false)
  f = new UserRegistration({data: {}, autoId: false})
  deepEqual(f.errors("username").messages(), ["This field is required."])
  deepEqual(f.errors("password1").messages(), ["This field is required."])
  deepEqual(f.errors("password2").messages(), ["This field is required."])
  f = new UserRegistration({data: {username: "adrian", password1: "foo", password2: "bar"}, autoId: false})
  deepEqual(f.errors("password2").messages(), ["Please make sure your passwords match."])
  f = new UserRegistration({data: {username: "adrian", password1: "foo", password2: "foo"}, autoId: false})
  strictEqual(f.errors().isPopulated(), false)
  equal(f.cleanedData.username, "adrian")
  equal(f.cleanedData.password1, "foo")
  equal(f.cleanedData.password2, "foo")

  // Another way of doing multiple-field validation is by implementing the
  // Form's clean() method. Usually a ValidationError raised by that method
  // will not be associated with a particular field and will have a
  // special-case association with the field named '__all__'. It's
  // possible to associate the errors to particular field with the
  // Form.addError() method or by passing a on object that maps each field to
  // one or more errors.
  //
  // Note that in Form.clean(), you have access to this.cleanedData, an
  // object containing all the fields/values that have *not* raised a
  // ValidationError. Also note Form.clean() is required to return a
  // dictionary of all clean data.
  UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10})
  , password1: forms.CharField({widget: forms.PasswordInput})
  , password2: forms.CharField({widget: forms.PasswordInput})

  , clean: function() {
      // Test raising a ValidationError as NON_FIELD_ERRORS
      if (this.cleanedData.password1 && this.cleanedData.password2 &&
          this.cleanedData.password1 != this.cleanedData.password2) {
        throw forms.ValidationError("Please make sure your passwords match.")
      }

      // Test raising ValidationError that targets multiple fields
      var errors = {}
      if (this.cleanedData.password1 == 'FORBIDDEN_VALUE') {
        errors.password1 = 'Forbidden value.'
      }
      if (this.cleanedData.password2 == 'FORBIDDEN_VALUE') {
        errors.password2 = 'Forbidden value.'
      }
      if (Object.keys(errors).length) {
        throw forms.ValidationError(errors)
      }

      // Test Form.addError()
      if (this.cleanedData.password1 == 'FORBIDDEN_VALUE2') {
        this.addError(null, 'Non-field error 1.')
        this.addError('password1', 'Forbidden value 2.')
      }
      if (this.cleanedData.password2 == 'FORBIDDEN_VALUE2') {
        this.addError('password2', 'Forbidden value 2.')
        throw forms.ValidationError('Non-field error 2.')
      }

      return this.cleanedData
    }
  })

  f = new UserRegistration({data: {}, autoId: false})
  reactHTMLEqual(f.asTable(),
"<tr><th>Username:</th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input maxlength=\"10\" type=\"text\" name=\"username\"></td></tr>" +
"<tr><th>Password1:</th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"password\" name=\"password1\"></td></tr>" +
"<tr><th>Password2:</th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"password\" name=\"password2\"></td></tr>")
  deepEqual(f.errors("username").messages(), ["This field is required."])
  deepEqual(f.errors("password1").messages(), ["This field is required."])
  deepEqual(f.errors("password2").messages(), ["This field is required."])

  f = new UserRegistration({data: {username: "adrian", password1: "foo", password2: "bar"}, autoId: false})
  deepEqual(f.errors("__all__").messages(), ["Please make sure your passwords match."])
  reactHTMLEqual(f.asTable(),
"<tr><td colspan=\"2\"><ul class=\"errorlist\"><li>Please make sure your passwords match.</li></ul></td></tr>" +
"<tr><th>Username:</th><td><input maxlength=\"10\" type=\"text\" name=\"username\" value=\"adrian\"></td></tr>" +
"<tr><th>Password1:</th><td><input type=\"password\" name=\"password1\" value=\"foo\"></td></tr>" +
"<tr><th>Password2:</th><td><input type=\"password\" name=\"password2\" value=\"bar\"></td></tr>")
  reactHTMLEqual(f.asUl(),
"<li><ul class=\"errorlist\"><li>Please make sure your passwords match.</li></ul></li>" +
"<li>Username: <input maxlength=\"10\" type=\"text\" name=\"username\" value=\"adrian\"></li>" +
"<li>Password1: <input type=\"password\" name=\"password1\" value=\"foo\"></li>" +
"<li>Password2: <input type=\"password\" name=\"password2\" value=\"bar\"></li>")

  f = new UserRegistration({data: {username: "adrian", password1: "foo", password2: "foo"}, autoId: false})
  strictEqual(f.errors().isPopulated(), false)
  equal(f.cleanedData.username, "adrian")
  equal(f.cleanedData.password1, "foo")
  equal(f.cleanedData.password2, "foo")

  f = new UserRegistration({data: {username: 'adrian', password1: 'FORBIDDEN_VALUE', password2: 'FORBIDDEN_VALUE'}, autoId: false})
  deepEqual(f.errors('password1').messages(), ['Forbidden value.'])
  deepEqual(f.errors('password2').messages(), ['Forbidden value.'])

  f = new UserRegistration({data: {username: 'adrian', password1: 'FORBIDDEN_VALUE2', password2: 'FORBIDDEN_VALUE2'}, autoId: false})
  deepEqual(f.errors('__all__').messages(), ['Non-field error 1.', 'Non-field error 2.'])
  deepEqual(f.errors('password1').messages(), ['Forbidden value 2.'])
  deepEqual(f.errors('password2').messages(), ['Forbidden value 2.'])

  throws(f.addError.bind(f, 'missingField', 'Some error.'))
})

QUnit.test("Basic form processing", 3, function() {
  var UserRegistration = forms.Form.extend({
    username: forms.CharField({maxLength: 10})
  , password1: forms.CharField({widget: forms.PasswordInput})
  , password2: forms.CharField({widget: forms.PasswordInput})

  , clean: function() {
      if (this.cleanedData.password1 && this.cleanedData.password2 &&
          this.cleanedData.password1 != this.cleanedData.password2) {
        throw forms.ValidationError("Please make sure your passwords match.")
      }
      return this.cleanedData
    }
  })

  function myFunction(method, postData) {
    if (method == "POST") {
      var form = new UserRegistration({data: postData, autoId: false})
      if (form.isValid()) {
        return "VALID"
      }
    }
    else {
      var form = new UserRegistration({autoId: false})
    }
    return form.asTable()
  }

  // Case 1: GET (and empty form, with no errors)
  reactHTMLEqual(myFunction("GET", {}),
"<tr><th>Username:</th><td><input maxlength=\"10\" type=\"text\" name=\"username\"></td></tr>" +
"<tr><th>Password1:</th><td><input type=\"password\" name=\"password1\"></td></tr>" +
"<tr><th>Password2:</th><td><input type=\"password\" name=\"password2\"></td></tr>")

  // Case 2: POST with erroneous data (a redisplayed form, with errors)
  reactHTMLEqual(myFunction("POST", {username: "this-is-a-long-username", password1: "foo", password2: "bar"}),
"<tr><td colspan=\"2\"><ul class=\"errorlist\"><li>Please make sure your passwords match.</li></ul></td></tr>" +
"<tr><th>Username:</th><td><ul class=\"errorlist\"><li>Ensure this value has at most 10 characters (it has 23).</li></ul><input maxlength=\"10\" type=\"text\" name=\"username\" value=\"this-is-a-long-username\"></td></tr>" +
"<tr><th>Password1:</th><td><input type=\"password\" name=\"password1\" value=\"foo\"></td></tr>" +
"<tr><th>Password2:</th><td><input type=\"password\" name=\"password2\" value=\"bar\"></td></tr>")

  // Case 3: POST with valid data (the success message)
   equal(myFunction("POST", {username: "adrian", password1: "secret", password2: "secret"}),
         "VALID")
})

}()