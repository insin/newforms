void function() { 'use strict';

QUnit.module('docs')

var ContactForm = forms.Form.extend({
  subject: forms.CharField({maxLength: 100})
, message: forms.CharField()
, sender: forms.EmailField()
, ccMyself: forms.BooleanField({required: false})
})

var CommentForm = forms.Form.extend({
  name: forms.CharField()
, url: forms.URLField()
, comment: forms.CharField()
})

var ParentForm = forms.Form.extend({
  name: forms.CharField(),
  dob: forms.DateField({label: 'Date of birth'})
})

function repr(o) {
  if (o instanceof forms.Field) {
    return '[object ' + o.constructor.name + ']'
  }
}

// ================================================================ overview ===

QUnit.test('Overview - Customising form display', function() {
  var Contact = React.createClass({displayName: 'Contact',
    getInitialState: function() {
      return {form: new ContactForm()}
    }

  , render: function() {
      var form = this.state.form
      var fields = form.boundFieldsObj()

      return React.createElement('form', {onSubmit:this.onSubmit, action:"/contact", method:"POST"}
      , form.nonFieldErrors().render()
      , React.createElement('div', {key: fields.subject.htmlName, className:"fieldWrapper"}
        , fields.subject.errors().render()
        , React.createElement('label', {htmlFor:"id_subject"}, "Email subject:")
        , fields.subject.render()
        )
      , React.createElement('div', {key: fields.message.htmlName, className:"fieldWrapper"}
        , fields.message.errors().render()
        , React.createElement('label', {htmlFor:"id_message"}, "Your message:")
        , fields.message.render()
        )
      , React.createElement('div', {key: fields.sender.htmlName, className:"fieldWrapper"}
        , fields.sender.errors().render()
        , React.createElement('label', {htmlFor:"id_sender"}, "Your email address:")
        , fields.sender.render()
        )
      , React.createElement('div', {key: fields.ccMyself.htmlName, className:"fieldWrapper"}
        , fields.ccMyself.errors().render()
        , React.createElement('label', {htmlFor:"id_ccMyself"}, "CC yourself?")
        , fields.ccMyself.render()
        )
      , React.createElement('div', null, React.createElement('input',  {type:"submit", value:"Send message"}))
      )
    }
  })
  reactHTMLEqual(React.createElement(Contact),
"<form action=\"/contact\" method=\"POST\">\
<div class=\"fieldWrapper\"><label for=\"id_subject\">Email subject:</label><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></div>\
<div class=\"fieldWrapper\"><label for=\"id_message\">Your message:</label><input type=\"text\" name=\"message\" id=\"id_message\"></div>\
<div class=\"fieldWrapper\"><label for=\"id_sender\">Your email address:</label><input type=\"email\" name=\"sender\" id=\"id_sender\"></div>\
<div class=\"fieldWrapper\"><label for=\"id_ccMyself\">CC yourself?</label><input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\"></div>\
<div><input type=\"submit\" value=\"Send message\"></div></form>")
})

QUnit.test("Overview - Looping over the Form's Fields", function() {
  var Contact = React.createClass({displayName: 'Contact',
    getInitialState: function() {
      return {form: new ContactForm()}
    }

  , render: function() {
      var form = this.state.form
      return React.createElement('form', {onSubmit:this.onSubmit, action:"/contact", method:"POST"}
      , form.nonFieldErrors().render()
      , form.boundFields().map(this.renderField)
      , React.createElement('div', null, React.createElement('input',  {type:"submit", value:"Send message"}))
      )
    }

  , renderField: function(bf) {
      return React.createElement('div', {key: bf.htmlName, className:"fieldWrapper"}
      , bf.errors().render()
      , bf.labelTag(), ' ', bf.render()
      )
    }
  })
  reactHTMLEqual(React.createElement(Contact),
"<form action=\"/contact\" method=\"POST\">\
<div class=\"fieldWrapper\"><label for=\"id_subject\">Subject:</label> <input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></div>\
<div class=\"fieldWrapper\"><label for=\"id_message\">Message:</label> <input type=\"text\" name=\"message\" id=\"id_message\"></div>\
<div class=\"fieldWrapper\"><label for=\"id_sender\">Sender:</label> <input type=\"email\" name=\"sender\" id=\"id_sender\"></div>\
<div class=\"fieldWrapper\"><label for=\"id_ccMyself\">Cc myself:</label> <input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\"></div>\
<div><input type=\"submit\" value=\"Send message\"></div>\
</form>")
})

// ======================================================== react_components ===

QUnit.test('React Components - Custom rendering with props', function() {
  reactHTMLEqual(React.createElement(forms.RenderForm, {
    form: ParentForm
  , component: "ul"
  , className: "parent"
  , rowComponent: "li"
  , autoId: false
  }),
'<ul class="parent">\
<li>Name: <input type="text" name="name"></li>\
<li>Date of birth: <input type="text" name="dob"></li>\
</ul>')
})

// =================================================================== forms ===

QUnit.test('Forms - Dynamic initial values', function() {
  var CommentForm = forms.Form.extend({
    name: forms.CharField({initial: 'prototype'})
  , url: forms.URLField()
  , comment: forms.CharField()
  })

  var f = new CommentForm({initial: {name: 'instance'}, autoId: false})
  reactHTMLEqual(f.render(),
"<tr><th>Name:</th><td><input type=\"text\" name=\"name\" value=\"instance\"></td></tr>" +
"<tr><th>Url:</th><td><input type=\"url\" name=\"url\"></td></tr>" +
"<tr><th>Comment:</th><td><input type=\"text\" name=\"comment\"></td></tr>",
    'Form-level initial gets precedence')
})

QUnit.test('Forms - Accessing the fields from the form', function() {
  var f = new CommentForm()
  equal(Object.keys(f.fields).map(function(field) { return repr(f.fields[field]) }).join('\n'),
"[object CharField]\n\
[object URLField]\n\
[object CharField]",
    'Form.fields')

  var f = new CommentForm({initial: {name: 'instance'}, autoId: false})
  f.fields.name.label = 'Username'
  reactHTMLEqual(f.render(),
"<tr><th>Username:</th><td><input type=\"text\" name=\"name\" value=\"instance\"></td></tr>" +
"<tr><th>Url:</th><td><input type=\"url\" name=\"url\"></td></tr>" +
"<tr><th>Comment:</th><td><input type=\"text\" name=\"comment\"></td></tr>",
   'You can alter fields')
})

QUnit.test("Forms - Updating a form's input data - setData", function() {
  var f = new ContactForm()
  var data = {
    subject: 'hello'
  , message: 'Hi there'
  , sender: 'foo@example.com'
  , ccMyself: true
  }
  var isValid = f.setData(data)
  strictEqual(f.isInitialRender, false, 'setData updates isInitialRender')
  strictEqual(isValid, true, 'setData returns result of isValid')
})

QUnit.test("Forms - Updating a form's input data - updateData & isComplete", function() {
  var f = new ContactForm()
  f.updateData({subject: 'hello'})
  strictEqual(f.isComplete(), false)
  f.updateData({message: 'Hi there'})
  strictEqual(f.isComplete(), false)
  f.updateData({sender: 'foo@example.com'})
  strictEqual(f.isComplete(), true)
})

QUnit.test('Forms - Outputting forms as HTML', function() {
  var f = new ContactForm()
  reactHTMLEqual(f.render.bind(f),
"<tr><th><label for=\"id_subject\">Subject:</label></th><td><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></td></tr>\
<tr><th><label for=\"id_message\">Message:</label></th><td><input type=\"text\" name=\"message\" id=\"id_message\"></td></tr>\
<tr><th><label for=\"id_sender\">Sender:</label></th><td><input type=\"email\" name=\"sender\" id=\"id_sender\"></td></tr>\
<tr><th><label for=\"id_ccMyself\">Cc myself:</label></th><td><input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\"></td></tr>",
  "Simply call render()")

  var data = {
    subject: 'hello'
  , message: 'Hi there'
  , sender: 'foo@example.com'
  , ccMyself: true
  }
  f = new ContactForm({data: data})
  reactHTMLEqual(f.render.bind(f),
"<tr><th><label for=\"id_subject\">Subject:</label></th><td><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\" value=\"hello\"></td></tr>\
<tr><th><label for=\"id_message\">Message:</label></th><td><input type=\"text\" name=\"message\" id=\"id_message\" value=\"Hi there\"></td></tr>\
<tr><th><label for=\"id_sender\">Sender:</label></th><td><input type=\"email\" name=\"sender\" id=\"id_sender\" value=\"foo@example.com\"></td></tr>\
<tr><th><label for=\"id_ccMyself\">Cc myself:</label></th><td><input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\" checked></td></tr>",
  "If the form is bound to data, the HTML output will include that data appropriately")

  f = new ContactForm()
  reactHTMLEqual(f.asDiv.bind(f),
"<div><label for=\"id_subject\">Subject:</label> <input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></div>\
<div><label for=\"id_message\">Message:</label> <input type=\"text\" name=\"message\" id=\"id_message\"></div>\
<div><label for=\"id_sender\">Sender:</label> <input type=\"email\" name=\"sender\" id=\"id_sender\"></div>\
<div><label for=\"id_ccMyself\">Cc myself:</label> <input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\"></div>",
  "asDiv()")
  reactHTMLEqual(f.asUl.bind(f),
"<li><label for=\"id_subject\">Subject:</label> <input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></li>\
<li><label for=\"id_message\">Message:</label> <input type=\"text\" name=\"message\" id=\"id_message\"></li>\
<li><label for=\"id_sender\">Sender:</label> <input type=\"email\" name=\"sender\" id=\"id_sender\"></li>\
<li><label for=\"id_ccMyself\">Cc myself:</label> <input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\"></li>",
  "asUl()")
})

QUnit.test('Forms - Styling form rows', function() {
  var CssContactForm = forms.Form.extend({
    rowCssClass: 'row'
  , requiredCssClass: 'required'
  , optionalCssClass: 'optional'
  , errorCssClass: 'error'
  , validCssClass: 'valid'
  , subject: forms.CharField({maxLength: 100})
  , message: forms.CharField()
  , sender: forms.EmailField()
  , ccMyself: forms.BooleanField({required: false})
  })
  var data = {
    subject: 'hello'
  , message: 'Hi there'
  , sender: ''
  , ccMyself: true
  }
  var f = new CssContactForm({data: data})
  reactHTMLEqual(f.render.bind(f),
"<tr class=\"row valid required\"><th><label for=\"id_subject\">Subject:</label></th><td><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\" value=\"hello\"></td></tr>\
<tr class=\"row valid required\"><th><label for=\"id_message\">Message:</label></th><td><input type=\"text\" name=\"message\" id=\"id_message\" value=\"Hi there\"></td></tr>\
<tr class=\"row error required\"><th><label for=\"id_sender\">Sender:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"email\" name=\"sender\" id=\"id_sender\"></td></tr>\
<tr class=\"row valid optional\"><th><label for=\"id_ccMyself\">Cc myself:</label></th><td><input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\" checked></td></tr>",
  "Form CSS hooks")
})

QUnit.test('Forms - Configuring form elements’ HTML id attributes and <label> tags', function() {
  var f = new ContactForm({autoId: false})
  reactHTMLEqual(f.asTable(),
"<tr><th>Subject:</th><td><input maxlength=\"100\" type=\"text\" name=\"subject\"></td></tr>\
<tr><th>Message:</th><td><input type=\"text\" name=\"message\"></td></tr>\
<tr><th>Sender:</th><td><input type=\"email\" name=\"sender\"></td></tr>\
<tr><th>Cc myself:</th><td><input type=\"checkbox\" name=\"ccMyself\"></td></tr>",
  "asTable(), autoId == false")
  reactHTMLEqual(f.asUl(),
"<li>Subject: <input maxlength=\"100\" type=\"text\" name=\"subject\"></li>\
<li>Message: <input type=\"text\" name=\"message\"></li>\
<li>Sender: <input type=\"email\" name=\"sender\"></li>\
<li>Cc myself: <input type=\"checkbox\" name=\"ccMyself\"></li>",
  "asUl(), autoId == false")
  reactHTMLEqual(f.asDiv(),
"<div>Subject: <input maxlength=\"100\" type=\"text\" name=\"subject\"></div>\
<div>Message: <input type=\"text\" name=\"message\"></div>\
<div>Sender: <input type=\"email\" name=\"sender\"></div>\
<div>Cc myself: <input type=\"checkbox\" name=\"ccMyself\"></div>",
  "asDiv(), autoId == false")

  f = new ContactForm({autoId: true})
  reactHTMLEqual(f.asTable.bind(f),
"<tr><th><label for=\"subject\">Subject:</label></th><td><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"subject\"></td></tr>\
<tr><th><label for=\"message\">Message:</label></th><td><input type=\"text\" name=\"message\" id=\"message\"></td></tr>\
<tr><th><label for=\"sender\">Sender:</label></th><td><input type=\"email\" name=\"sender\" id=\"sender\"></td></tr>\
<tr><th><label for=\"ccMyself\">Cc myself:</label></th><td><input type=\"checkbox\" name=\"ccMyself\" id=\"ccMyself\"></td></tr>",
  "asTable(), autoId == true")
  reactHTMLEqual(f.asUl.bind(f),
"<li><label for=\"subject\">Subject:</label> <input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"subject\"></li>\
<li><label for=\"message\">Message:</label> <input type=\"text\" name=\"message\" id=\"message\"></li>\
<li><label for=\"sender\">Sender:</label> <input type=\"email\" name=\"sender\" id=\"sender\"></li>\
<li><label for=\"ccMyself\">Cc myself:</label> <input type=\"checkbox\" name=\"ccMyself\" id=\"ccMyself\"></li>",
  "asUl(), autoId == true")
  reactHTMLEqual(f.asDiv.bind(f),
"<div><label for=\"subject\">Subject:</label> <input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"subject\"></div>\
<div><label for=\"message\">Message:</label> <input type=\"text\" name=\"message\" id=\"message\"></div>\
<div><label for=\"sender\">Sender:</label> <input type=\"email\" name=\"sender\" id=\"sender\"></div>\
<div><label for=\"ccMyself\">Cc myself:</label> <input type=\"checkbox\" name=\"ccMyself\" id=\"ccMyself\"></div>",
  "asDiv(), autoId == true")

  f = new ContactForm({autoId: 'id_for_{name}'})
  reactHTMLEqual(f.asTable.bind(f),
"<tr><th><label for=\"id_for_subject\">Subject:</label></th><td><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_for_subject\"></td></tr>\
<tr><th><label for=\"id_for_message\">Message:</label></th><td><input type=\"text\" name=\"message\" id=\"id_for_message\"></td></tr>\
<tr><th><label for=\"id_for_sender\">Sender:</label></th><td><input type=\"email\" name=\"sender\" id=\"id_for_sender\"></td></tr>\
<tr><th><label for=\"id_for_ccMyself\">Cc myself:</label></th><td><input type=\"checkbox\" name=\"ccMyself\" id=\"id_for_ccMyself\"></td></tr>",
  "asTable(), autoId == 'id_for_{name}'")
  reactHTMLEqual(f.asUl.bind(f),
"<li><label for=\"id_for_subject\">Subject:</label> <input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_for_subject\"></li>\
<li><label for=\"id_for_message\">Message:</label> <input type=\"text\" name=\"message\" id=\"id_for_message\"></li>\
<li><label for=\"id_for_sender\">Sender:</label> <input type=\"email\" name=\"sender\" id=\"id_for_sender\"></li>\
<li><label for=\"id_for_ccMyself\">Cc myself:</label> <input type=\"checkbox\" name=\"ccMyself\" id=\"id_for_ccMyself\"></li>",
  "asUl(), autoId == 'id_for_{name}'")
  reactHTMLEqual(f.asDiv.bind(f),
"<div><label for=\"id_for_subject\">Subject:</label> <input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_for_subject\"></div>\
<div><label for=\"id_for_message\">Message:</label> <input type=\"text\" name=\"message\" id=\"id_for_message\"></div>\
<div><label for=\"id_for_sender\">Sender:</label> <input type=\"email\" name=\"sender\" id=\"id_for_sender\"></div>\
<div><label for=\"id_for_ccMyself\">Cc myself:</label> <input type=\"checkbox\" name=\"ccMyself\" id=\"id_for_ccMyself\"></div>",
  "asDiv(), autoId == 'id_for_{name}'")

  f = new ContactForm({autoId: 'id_for_{name}', labelSuffix: ''})
  reactHTMLEqual(f.asUl.bind(f),
"<li><label for=\"id_for_subject\">Subject</label> <input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_for_subject\"></li>\
<li><label for=\"id_for_message\">Message</label> <input type=\"text\" name=\"message\" id=\"id_for_message\"></li>\
<li><label for=\"id_for_sender\">Sender</label> <input type=\"email\" name=\"sender\" id=\"id_for_sender\"></li>\
<li><label for=\"id_for_ccMyself\">Cc myself</label> <input type=\"checkbox\" name=\"ccMyself\" id=\"id_for_ccMyself\"></li>",
  "labelSuffix == ''")

  f = new ContactForm({autoId: 'id_for_{name}', labelSuffix: ' ->'})
  reactHTMLEqual(f.asUl.bind(f),
"<li><label for=\"id_for_subject\">Subject -&gt;</label> <input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_for_subject\"></li>\
<li><label for=\"id_for_message\">Message -&gt;</label> <input type=\"text\" name=\"message\" id=\"id_for_message\"></li>\
<li><label for=\"id_for_sender\">Sender -&gt;</label> <input type=\"email\" name=\"sender\" id=\"id_for_sender\"></li>\
<li><label for=\"id_for_ccMyself\">Cc myself -&gt;</label> <input type=\"checkbox\" name=\"ccMyself\" id=\"id_for_ccMyself\"></li>",
  "labelSuffix == ' ->'")
})

QUnit.test('Forms - How errors are displayed', function() {
  var data = {
    subject: ''
  , message: 'Hi there'
  , sender: 'invalid email address'
  , ccMyself: true
  }
  var f = new ContactForm({data: data})
  reactHTMLEqual(f.asTable.bind(f),
"<tr><th><label for=\"id_subject\">Subject:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></td></tr>\
<tr><th><label for=\"id_message\">Message:</label></th><td><input type=\"text\" name=\"message\" id=\"id_message\" value=\"Hi there\"></td></tr>\
<tr><th><label for=\"id_sender\">Sender:</label></th><td><ul class=\"errorlist\"><li>Enter a valid email address.</li></ul><input type=\"email\" name=\"sender\" id=\"id_sender\" value=\"invalid email address\"></td></tr>\
<tr><th><label for=\"id_ccMyself\">Cc myself:</label></th><td><input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\" checked></td></tr>",
  "asTable() error display")
  reactHTMLEqual(f.asUl.bind(f),
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_subject\">Subject:</label> <input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></li>\
<li><label for=\"id_message\">Message:</label> <input type=\"text\" name=\"message\" id=\"id_message\" value=\"Hi there\"></li>\
<li><ul class=\"errorlist\"><li>Enter a valid email address.</li></ul><label for=\"id_sender\">Sender:</label> <input type=\"email\" name=\"sender\" id=\"id_sender\" value=\"invalid email address\"></li>\
<li><label for=\"id_ccMyself\">Cc myself:</label> <input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\" checked></li>",
 "asUl() error display")
  reactHTMLEqual(f.asDiv.bind(f),
"<div><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_subject\">Subject:</label> <input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></div>\
<div><label for=\"id_message\">Message:</label> <input type=\"text\" name=\"message\" id=\"id_message\" value=\"Hi there\"></div>\
<div><ul class=\"errorlist\"><li>Enter a valid email address.</li></ul><label for=\"id_sender\">Sender:</label> <input type=\"email\" name=\"sender\" id=\"id_sender\" value=\"invalid email address\"></div>\
<div><label for=\"id_ccMyself\">Cc myself:</label> <input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\" checked></div>",
  "asDiv() error display")

  var DivErrorList = forms.ErrorList.extend({
    render: function() {
      return React.createElement('div', {className: 'errorlist'}
      , this.messages().map(function(error) {
          return React.createElement('div', null, error)
        })
      )
    }
  })
  f = new ContactForm({data: data, errorConstructor: DivErrorList, autoId: false})
  reactHTMLEqual(f.asDiv(),
"<div><div class=\"errorlist\"><div>This field is required.</div></div>Subject: <input maxlength=\"100\" type=\"text\" name=\"subject\"></div>\
<div>Message: <input type=\"text\" name=\"message\" value=\"Hi there\"></div>\
<div><div class=\"errorlist\"><div>Enter a valid email address.</div></div>Sender: <input type=\"email\" name=\"sender\" value=\"invalid email address\"></div>\
<div>Cc myself: <input type=\"checkbox\" name=\"ccMyself\" checked></div>",
  "Customising the error list format")
})

QUnit.test('Forms - BoundFields', function() {
  var form = new ContactForm()
  var bf = form.boundField('subject')
  reactHTMLEqual(bf.render.bind(bf),
"<input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\">",
  "form.boundField()")
  reactHTMLEqual(function() {
    return form.boundFields().map(function(bf) { return bf.render() })
  },
"<input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\">\
<input type=\"text\" name=\"message\" id=\"id_message\">\
<input type=\"email\" name=\"sender\" id=\"id_sender\">\
<input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\">",
  "form.boundFields()")

  // BoundField respects autoId
  var f = new ContactForm({autoId: false})
  reactHTMLEqual(function() { return f.boundField('message').render() },
"<input type=\"text\" name=\"message\">",
  "BoundField with autoId == false")
  f = new ContactForm({autoId: 'id_{name}'})
  reactHTMLEqual(function() { return f.boundField('message').render() },
"<input type=\"text\" name=\"message\" id=\"id_message\">",
  "BoundField with autoId set")

  // BoundField errors
  var data = {subject: 'hi', message: '', sender: '', ccMyself: ''}
  f = new ContactForm({data: data, autoId: false})
  bf = f.boundField('message')
  reactHTMLEqual(function() { return bf.render() },
"<input type=\"text\" name=\"message\">")
  deepEqual(bf.errors().messages(), ["This field is required."])
  var errors = bf.errors()
  reactHTMLEqual(errors.render.bind(errors),
"<ul class=\"errorlist\"><li>This field is required.</li></ul>")
  bf = f.boundField('subject')
  deepEqual(bf.errors().messages(), [])
  strictEqual(bf.errors().render(), undefined)

  f = new ContactForm()
  // labelTag()
  reactHTMLEqual(f.boundField('message').labelTag(),
"<label for=\"id_message\">Message:</label>",
  "labelTag()")
  // cssClasses()
  f.requiredCssClass = 'required'
  equal(f.boundField('message').cssClasses(), "required", "cssClasses()")
  equal(f.boundField('message').cssClasses('foo bar'), "foo bar required", "cssClasses() argument")

  var initial = {subject: 'welcome'}
  data = {subject: 'hi'}
  var unboundForm = new ContactForm({initial: initial})
  var boundForm = new ContactForm({data: data, initial: initial})
  equal(unboundForm.boundField('subject').value(), "welcome", "Unbound value()")
  equal(boundForm.boundField('subject').value(), "hi", "Bound value()")
})

var PersonForm = forms.Form.extend({
  first_name: forms.CharField()
, last_name: forms.CharField()
})

QUnit.test("Forms - Extending forms", function() {
  var ContactFormWithPrority = ContactForm.extend({
    priority: forms.CharField()
  })
  var f = new ContactFormWithPrority({autoId: false})
  reactHTMLEqual(f.render(),
"<tr><th>Subject:</th><td><input maxlength=\"100\" type=\"text\" name=\"subject\"></td></tr>\
<tr><th>Message:</th><td><input type=\"text\" name=\"message\"></td></tr>\
<tr><th>Sender:</th><td><input type=\"email\" name=\"sender\"></td></tr>\
<tr><th>Cc myself:</th><td><input type=\"checkbox\" name=\"ccMyself\"></td></tr>\
<tr><th>Priority:</th><td><input type=\"text\" name=\"priority\"></td></tr>")

  var InstrumentForm = forms.Form.extend({
    instrument: forms.CharField()
  })
  var BeatleForm = forms.Form.extend({
    __mixins__: [PersonForm, InstrumentForm]
  , haircut_type: forms.CharField()
  })
  var b = new BeatleForm({autoId: false})
  reactHTMLEqual(b.asUl(),
"<li>First name: <input type=\"text\" name=\"first_name\"></li>\
<li>Last name: <input type=\"text\" name=\"last_name\"></li>\
<li>Instrument: <input type=\"text\" name=\"instrument\"></li>\
<li>Haircut type: <input type=\"text\" name=\"haircut_type\"></li>",
  "Using forms as mixins")
})

QUnit.test('Forms - Prefixes for forms', function() {
  var mother = new PersonForm({prefix: 'mother'})
  var father = new PersonForm({prefix: 'father'})
  reactHTMLEqual(mother.asUl.bind(mother),
"<li><label for=\"id_mother-first_name\">First name:</label> <input type=\"text\" name=\"mother-first_name\" id=\"id_mother-first_name\"></li>\
<li><label for=\"id_mother-last_name\">Last name:</label> <input type=\"text\" name=\"mother-last_name\" id=\"id_mother-last_name\"></li>" )
  reactHTMLEqual(father.asUl.bind(father),
"<li><label for=\"id_father-first_name\">First name:</label> <input type=\"text\" name=\"father-first_name\" id=\"id_father-first_name\"></li>\
<li><label for=\"id_father-last_name\">Last name:</label> <input type=\"text\" name=\"father-last_name\" id=\"id_father-last_name\"></li>")
})

QUnit.test('Fields - Field.clean()', function() {
  var f = forms.EmailField()
  equal(f.clean('foo@example.com'), 'foo@example.com')
  cleanErrorEqual(f, ['Enter a valid email address.'], 'invalid email address')
})

QUnit.test('Fields - errorMessage', function() {
  var generic = forms.CharField()
  cleanErrorEqual(generic, ['This field is required.'], '')
  var name = forms.CharField({errorMessages: {required: 'Please enter your name.'}})
  cleanErrorEqual(name, ['Please enter your name.'], '')
})

QUnit.test('Fields - Providing choices', function() {
  var STATE_CHOICES = [
    ['S', 'Scoped']
  , ['D', 'Defined']
  , ['P', 'In-Progress']
  , ['C', 'Completed']
  , ['A', 'Accepted']
  ]
  reactHTMLEqual(forms.Select().render('state', null, {choices: STATE_CHOICES}),
"<select name=\"state\">\
<option value=\"S\">Scoped</option>\
<option value=\"D\">Defined</option>\
<option value=\"P\">In-Progress</option>\
<option value=\"C\">Completed</option>\
<option value=\"A\">Accepted</option>\
</select>")

  var DRINK_CHOICES = [
    ['Cheap', [
        [1, 'White Lightning']
      , [2, 'Buckfast']
      , [3, 'Tesco Gin']
      ]
    ]
  , ['Expensive', [
        [4, 'Vieille Bon Secours Ale']
      , [5, 'Château d’Yquem']
      , [6, 'Armand de Brignac Midas']
      ]
    ]
  , [7, 'Beer']
  ]
  reactHTMLEqual(forms.Select().render('drink', null, {choices: DRINK_CHOICES}),
"<select name=\"drink\">\
<optgroup label=\"Cheap\">\
<option value=\"1\">White Lightning</option>\
<option value=\"2\">Buckfast</option>\
<option value=\"3\">Tesco Gin</option>\
</optgroup>\
<optgroup label=\"Expensive\">\
<option value=\"4\">Vieille Bon Secours Ale</option>\
<option value=\"5\">Château d’Yquem</option>\
<option value=\"6\">Armand de Brignac Midas</option>\
</optgroup>\
<option value=\"7\">Beer</option>\
</select>")

  var VOWEL_CHOICES = ['A', 'E', 'I', 'O', 'U']
  var f = forms.ChoiceField({choices: VOWEL_CHOICES})
  deepEqual(f.choices(), [['A', 'A'], ['E', 'E'], ['I', 'I'], ['O', 'O'], ['U', 'U']])

  var ARBITRARY_CHOICES = [
    ['Numbers', [1, 2]]
  , ['Letters', ['A', 'B']]
  ]
  f.setChoices(ARBITRARY_CHOICES)
  deepEqual(f.choices(), [
    ['Numbers', [[1, 1], [2, 2]]]
  , ['Letters', [['A', 'A'], ['B', 'B']]]
  ])
})

// =================================================================== fields ==

QUnit.test('Fields - Dynamic choices', function() {
  var ProjectBookingForm = forms.Form.extend({
    project: forms.ChoiceField()
  , hours: forms.DecimalField({minValue: 0, maxValue: 24, maxdigits: 4, decimalPlaces: 2})
  , date: forms.DateField()

  , constructor: function(projects, kwargs) {
      // Call the constructor of whichever form you're extending so that the
      // forms.Form constructor eventually gets called - this.fields doesn't
      // exist until this happens.
      ProjectBookingForm.__super__.constructor.call(this, kwargs)

      // Now that this.fields is a thing, make whatever changes you need to -
      // in this case, we're going to creata a list of pairs of project ids
      // and names to set as the project field's choices.
      this.fields.project.setChoices(forms.util.makeChoices(projects, 'id', 'name'))
    }
  })

  var projects = [
    {id: 1, name: 'Project 1'}
  , {id: 2, name: 'Project 2'}
  , {id: 3, name: 'Project 3'}
  ]
  var form = new ProjectBookingForm(projects, {autoId: false})
  reactHTMLEqual(form.boundField('project').render(),
"<select name=\"project\">\
<option value=\"1\">Project 1</option>\
<option value=\"2\">Project 2</option>\
<option value=\"3\">Project 3</option>\
</select>")
})

QUnit.test('Fields - ComboField', function() {
  var f = forms.ComboField({fields: [
    forms.CharField({maxLength: 20})
  , forms.EmailField()
  ]})
  equal(f.clean('test@example.com'), 'test@example.com')
  cleanErrorEqual(f, ['Ensure this value has at most 20 characters (it has 28).'], 'longemailaddress@example.com')
})

var MultiEmailField = forms.Field.extend({
  toJavaScript: function(value) {
    if (this.isEmptyValue(value)) {
      return []
    }
    return value.split(/, ?/g)
  }
, validate: function(value) {
    MultiEmailField.__super__.validate.call(this, value)
    value.map(forms.validators.validateEmail)
  }
})

var MultiRecipientContactForm = forms.Form.extend({
  subject: forms.CharField({maxLength: 100})
, message: forms.CharField()
, sender: forms.EmailField()
, recipients: new MultiEmailField()
, ccMyself: forms.BooleanField({required: false})
})

// =================================================================== react ===


QUnit.test('Forms and React - Using a Form in a React component', function() {
  var Contact = React.createClass({displayName: 'Contact',
    getInitialState: function() {
      return {form: new ContactForm()}
    }

  , render: function() {
      return React.createElement('form', {ref:"form", onSubmit:this.onSubmit, action:"/contact", method:"POST"},
        this.state.form.asDiv(),
        React.createElement('div', null,
          React.createElement('input', {type:"submit", value:"Submit"}),
          React.createElement('input', {type:"button", value:"Cancel", onClick:this.props.onCancel})
        )
      )
    }

  , onSubmit: function(e) {
      e.preventDefault()
      var data = forms.formData(this.refs.form.getDOMNode())
      var isValid = this.state.form.setData(data)
      if (isValid) {
        this.props.processContactData(this.state.form.cleanedData)
      }
      else {
        this.forceUpdate()
      }
    }
  })
  reactHTMLEqual(React.createElement(Contact),
"<form action=\"/contact\" method=\"POST\">\
<div><label for=\"id_subject\">Subject:</label> <input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></div>\
<div><label for=\"id_message\">Message:</label> <input type=\"text\" name=\"message\" id=\"id_message\"></div>\
<div><label for=\"id_sender\">Sender:</label> <input type=\"email\" name=\"sender\" id=\"id_sender\"></div>\
<div><label for=\"id_ccMyself\">Cc myself:</label> <input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\"></div>\
<div><input type=\"submit\" value=\"Submit\"><input type=\"button\" value=\"Cancel\"></div>\
</form>")
})

// ============================================================== validation ===

QUnit.test('Validation - Form field default cleaning', function() {
  var f = new MultiEmailField({required: true})
  // Check that an empty list is detected as an empty value
  cleanErrorEqual(f, 'This field is required.', '')
  cleanErrorEqual(f, 'This field is required.', [])
  // Check email validation
  cleanErrorEqual(f, 'Enter a valid email address.', 'invalid email address')
  ok(f.clean('steve@test.com, alan@something.org'))
})

QUnit.test('Validation - Cleaning a specific field attribute', function() {
  var CleanSpecificFieldForm = MultiRecipientContactForm.extend({
    cleanRecipients: function() {
      var recipients = this.cleanedData.recipients
      if (recipients.indexOf('fred@example.com') == -1) {
        throw forms.ValidationError('You have forgotten about Fred!')
      }
      return recipients
    }
  })

  var f = new CleanSpecificFieldForm({data: {
    subject: 'testing'
  , message: 'testing'
  , sender: 'me@localhost'
  , recipients: 'steve@test.com, alan@something.org'
  }})
  ok(!f.isValid())
  deepEqual(f.errors('recipients').messages(), ["You have forgotten about Fred!"])

  f = new CleanSpecificFieldForm({data: {
    subject: 'testing'
  , message: 'testing'
  , sender: 'me@localhost'
  , recipients: 'steve@test.com, fred@example.com, alan@something.org'
  }})
  ok(f.isValid())
})

QUnit.test('Validation - Cleaning and validating fields that depend on each other', function() {
  var Option1Form = MultiRecipientContactForm.extend({
    clean: function() {
      var ccMyself = this.cleanedData.ccMyself
      var subject = this.cleanedData.subject
      if (ccMyself && subject) {
        if (subject.indexOf('help') == -1) {
          throw forms.ValidationError(
            "Did not send for 'help' in the subject despite CC'ing yourself.")
        }
      }
    }
  })

  var f = new Option1Form({data: {
    subject: 'testing'
  , message: 'testing'
  , sender: 'me@localhost'
  , recipients: 'steve@test.com, alan@something.org'
  , ccMyself: true
  }})
  ok(!f.isValid())
  deepEqual(f.nonFieldErrors().messages(), ["Did not send for 'help' in the subject despite CC'ing yourself."])

  f = new Option1Form({data: {
    subject: 'help with testing'
  , message: 'testing'
  , sender: 'me@localhost'
  , recipients: 'steve@test.com, alan@something.org'
  , ccMyself: true
  }})
  ok(f.isValid())

  var Option2Form = MultiRecipientContactForm.extend({
    clean: function() {
      var ccMyself = this.cleanedData.ccMyself
      var subject = this.cleanedData.subject
      if (ccMyself && subject && subject.indexOf('help') == -1) {
        var message = "Must put 'help' in subject when cc'ing yourself."
        this.addError('ccMyself', message)
        this.addError('subject', message)
      }
    }
  })
  var f = new Option2Form({data: {
    subject: 'testing'
  , message: 'testing'
  , sender: 'me@localhost'
  , recipients: 'steve@test.com, alan@something.org'
  , ccMyself: true
  }})
  ok(!f.isValid())
  deepEqual(f.errors('subject').messages(), ["Must put 'help' in subject when cc'ing yourself."])
  deepEqual(f.errors('ccMyself').messages(), ["Must put 'help' in subject when cc'ing yourself."])

  f = new Option2Form({data: {
    subject: 'help testing'
  , message: 'testing'
  , sender: 'me@localhost'
  , recipients: 'steve@test.com, alan@something.org'
  , ccMyself: true
  }})
  ok(f.isValid())
})

var ArticleForm = forms.Form.extend({
  title: forms.CharField()
, pubDate: forms.DateField()
})

// ================================================================= widgets ===

QUnit.test('Widgets - Widgets inheriting from the Select widget', function() {
  var CHOICES = [['1', 'First'], ['2', 'Second']]
  var field = forms.ChoiceField({choices: CHOICES, widget: forms.RadioSelect})
  deepEqual(field.choices(), [['1', 'First'], ['2', 'Second']])
  deepEqual(field.widget.choices, [['1', 'First'], ['2', 'Second']])
  field.widget.choices = []
  field.setChoices([['1', 'First and only']])
  deepEqual(field.widget.choices, [['1', 'First and only']])
})

QUnit.test('Widgets - Styling widget instances', function() {
  var CommentForm = forms.Form.extend({
    name: forms.CharField()
  , url: forms.URLField()
  , comment: forms.CharField()
  })
  var f = new CommentForm({autoId: false})
  reactHTMLEqual(f.asTable(),
"<tr><th>Name:</th><td><input type=\"text\" name=\"name\"></td></tr>\
<tr><th>Url:</th><td><input type=\"url\" name=\"url\"></td></tr>\
<tr><th>Comment:</th><td><input type=\"text\" name=\"comment\"></td></tr>")

  CommentForm = forms.Form.extend({
    name: forms.CharField({
      widget: forms.TextInput({attrs: {className: 'special'}})
    })
  , url: forms.URLField()
  , comment: forms.CharField({widget: forms.TextInput({attrs: {size: '40'}})})
  })
  f = new CommentForm({autoId: false})
  reactHTMLEqual(f.asTable(),
"<tr><th>Name:</th><td><input class=\"special\" type=\"text\" name=\"name\"></td></tr>\
<tr><th>Url:</th><td><input type=\"url\" name=\"url\"></td></tr>\
<tr><th>Comment:</th><td><input size=\"40\" type=\"text\" name=\"comment\"></td></tr>")
})

QUnit.test('Widgets - widget.attrs', function() {
  var name = forms.TextInput({attrs: {size:10, title: 'Your name'}})
  reactHTMLEqual(name.render('name', 'A name'),
"<input size=\"10\" title=\"Your name\" type=\"text\" name=\"name\" value=\"A name\">" )
})

QUnit.test('Widgets - MultiWidget', function() {
  function range(start, end) {
    var result = []
    for (var i = start; i < end; i++) {
      result.push(i)
    }
    return result
  }
  var extend = isomorph.object.extend
  var strpdate = isomorph.time.strpdate

  var DateSelectorWidget = forms.MultiWidget.extend({
    constructor: function(kwargs) {
      kwargs = extend({attrs: {}}, kwargs)
      var widgets = [
        forms.Select({choices: range(1, 32), attrs: kwargs.attrs})
      , forms.Select({choices: range(1, 13), attrs: kwargs.attrs})
      , forms.Select({choices: range(2012, 2017), attrs: kwargs.attrs})
      ]
      forms.MultiWidget.call(this, widgets, kwargs)
    }

  , decompress: function(value) {
      if (value instanceof Date) {
        return [value.getDate(),
                value.getMonth() + 1, // Make month 1-based for display
                value.getFullYear()]
      }
      return [null, null, null]
    }

  , formatOutput: function(renderedWidgets) {
      return React.createElement('div', null, renderedWidgets)
    }

  , valueFromData: function(data, files, name) {
      var parts = this.widgets.map(function(widget, i) {
        return widget.valueFromData(data, files, name + '_' + i)
      })
      parts.reverse() // [d, m, y] => [y, m, d]
      return parts.join('-')
    }
  })

  var w = new DateSelectorWidget()
  reactHTMLEqual(w.render('date', new Date(2014, 2, 7)),
"<div>\
<select name=\"date_0\" data-newforms-field=\"date\"><option value=\"1\">1</option><option value=\"2\">2</option><option value=\"3\">3</option><option value=\"4\">4</option><option value=\"5\">5</option><option value=\"6\">6</option><option value=\"7\" selected>7</option><option value=\"8\">8</option><option value=\"9\">9</option><option value=\"10\">10</option><option value=\"11\">11</option><option value=\"12\">12</option><option value=\"13\">13</option><option value=\"14\">14</option><option value=\"15\">15</option><option value=\"16\">16</option><option value=\"17\">17</option><option value=\"18\">18</option><option value=\"19\">19</option><option value=\"20\">20</option><option value=\"21\">21</option><option value=\"22\">22</option><option value=\"23\">23</option><option value=\"24\">24</option><option value=\"25\">25</option><option value=\"26\">26</option><option value=\"27\">27</option><option value=\"28\">28</option><option value=\"29\">29</option><option value=\"30\">30</option><option value=\"31\">31</option></select>\
<select name=\"date_1\" data-newforms-field=\"date\"><option value=\"1\">1</option><option value=\"2\">2</option><option value=\"3\" selected>3</option><option value=\"4\">4</option><option value=\"5\">5</option><option value=\"6\">6</option><option value=\"7\">7</option><option value=\"8\">8</option><option value=\"9\">9</option><option value=\"10\">10</option><option value=\"11\">11</option><option value=\"12\">12</option></select>\
<select name=\"date_2\" data-newforms-field=\"date\"><option value=\"2012\">2012</option><option value=\"2013\">2013</option><option value=\"2014\" selected>2014</option><option value=\"2015\">2015</option><option value=\"2016\">2016</option></select>\
</div>")

  var TestForm = forms.Form.extend({
    date: forms.DateField({widget: DateSelectorWidget})
  })
  var form = new TestForm({data: {date_0: 1, date_1: 1, date_2: 2014}})
  ok(form.isValid())
  equal(form.cleanedData.date.getTime(), new Date(2014, 0, 1).getTime())
})

QUnit.test('Widgets - RadioSelect', function() {
  var MyForm = forms.Form.extend({
    beatles: forms.ChoiceField({choices: [
      ['john', 'John']
    , ['paul', 'Paul']
    , ['george', 'George']
    , ['ringo', 'Ringo']
    ], widget: forms.RadioSelect})
  })
  var myForm = new MyForm()
  reactHTMLEqual(function() {
    return myForm.boundField('beatles').subWidgets().map(function(radio) {
      return React.createElement('div', {className: 'myRadio'}, radio.render())
    })
  },
"<div class=\"myRadio\">\
<label for=\"id_beatles_0\"><input id=\"id_beatles_0\" type=\"radio\" name=\"beatles\" value=\"john\"> John</label>\
</div>\
<div class=\"myRadio\">\
<label for=\"id_beatles_1\"><input id=\"id_beatles_1\" type=\"radio\" name=\"beatles\" value=\"paul\"> Paul</label>\
</div>\
<div class=\"myRadio\">\
<label for=\"id_beatles_2\"><input id=\"id_beatles_2\" type=\"radio\" name=\"beatles\" value=\"george\"> George</label>\
</div>\
<div class=\"myRadio\">\
<label for=\"id_beatles_3\"><input id=\"id_beatles_3\" type=\"radio\" name=\"beatles\" value=\"ringo\"> Ringo</label>\
</div>")

  reactHTMLEqual(function() {
    return myForm.boundField('beatles').subWidgets().map(function(radio) {
      return React.createElement('label', {htmlFor: radio.idForLabel()}
      , radio.choiceLabel
      , React.createElement('span', {className: 'radio'}, radio.tag())
      )
    })
  },
"<label for=\"id_beatles_0\">\
John\
<span class=\"radio\"><input id=\"id_beatles_0\" type=\"radio\" name=\"beatles\" value=\"john\"></span>\
</label>\
<label for=\"id_beatles_1\">\
Paul\
<span class=\"radio\"><input id=\"id_beatles_1\" type=\"radio\" name=\"beatles\" value=\"paul\"></span>\
</label>\
<label for=\"id_beatles_2\">\
George\
<span class=\"radio\"><input id=\"id_beatles_2\" type=\"radio\" name=\"beatles\" value=\"george\"></span>\
</label>\
<label for=\"id_beatles_3\">\
Ringo\
<span class=\"radio\"><input id=\"id_beatles_3\" type=\"radio\" name=\"beatles\" value=\"ringo\"></span>\
</label>")
})

// ================================================================ formsets ===

QUnit.test('Formsets - intro', function() {
  var ArticleFormSet = forms.formsetFactory(ArticleForm)
  var formset = new ArticleFormSet()
  reactHTMLEqual(function() {
    return formset.forms().map(function(form) { return form.asTable() })
  },
"<tr><th><label for=\"id_form-0-title\">Title:</label></th><td><input type=\"text\" name=\"form-0-title\" id=\"id_form-0-title\"></td></tr>\
<tr><th><label for=\"id_form-0-pubDate\">Pub date:</label></th><td><input type=\"text\" name=\"form-0-pubDate\" id=\"id_form-0-pubDate\"></td></tr>",
  "<3 My first formset <3")

  var ArticleFormSet = forms.formsetFactory(ArticleForm, {extra: 2})
  var formset = new ArticleFormSet({initial: [
    {title: "Django's docs are open source!", pubDate: new Date(2014, 1, 28)}
  ]})
  reactHTMLEqual(function() {
    return formset.forms().map(function(form) { return form.asTable() })
  },
"<tr><th><label for=\"id_form-0-title\">Title:</label></th><td><input type=\"text\" name=\"form-0-title\" id=\"id_form-0-title\" value=\"Django&#x27;s docs are open source!\"></td></tr>\
<tr><th><label for=\"id_form-0-pubDate\">Pub date:</label></th><td><input type=\"text\" name=\"form-0-pubDate\" id=\"id_form-0-pubDate\" value=\"2014-02-28\"></td></tr>\
<tr><th><label for=\"id_form-1-title\">Title:</label></th><td><input type=\"text\" name=\"form-1-title\" id=\"id_form-1-title\"></td></tr>\
<tr><th><label for=\"id_form-1-pubDate\">Pub date:</label></th><td><input type=\"text\" name=\"form-1-pubDate\" id=\"id_form-1-pubDate\"></td></tr>\
<tr><th><label for=\"id_form-2-title\">Title:</label></th><td><input type=\"text\" name=\"form-2-title\" id=\"id_form-2-title\"></td></tr>\
<tr><th><label for=\"id_form-2-pubDate\">Pub date:</label></th><td><input type=\"text\" name=\"form-2-pubDate\" id=\"id_form-2-pubDate\"></td></tr>",
  "Initial data display + 2 extras")

  var ArticleFormSet = forms.formsetFactory(ArticleForm, {extra: 2, maxNum: 1})
  var formset = new ArticleFormSet()
  reactHTMLEqual(function() {
    return formset.forms().map(function(form) { return form.asTable() })
  },
"<tr><th><label for=\"id_form-0-title\">Title:</label></th><td><input type=\"text\" name=\"form-0-title\" id=\"id_form-0-title\"></td></tr>\
<tr><th><label for=\"id_form-0-pubDate\">Pub date:</label></th><td><input type=\"text\" name=\"form-0-pubDate\" id=\"id_form-0-pubDate\"></td></tr>",
  "maxNum vs. extra")
})

// ==================================================================== util ===

}()