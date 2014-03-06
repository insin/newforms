QUnit.module('docs')

void function() {

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

function repr(o) {
  if (o instanceof forms.Field) {
    return '[object ' + o.constructor.name + ']'
  }
}

QUnit.test('Overview - Displaying a Form in a React component', function() {
  var Contact = React.createClass({displayName: 'Contact',
    getInitialState: function() {
      return {form: new ContactForm()}
    }

  , render: function() {
      return React.DOM.form({ref:"form", onSubmit:this.onSubmit, action:"/contact", method:"POST"},
        this.state.form.asDiv(),
        React.DOM.div(null,
          React.DOM.input({type:"submit", value:"Submit"}),
          React.DOM.input({type:"button", value:"Cancel", onClick:this.props.onCancel})
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
  reactHTMLEqual(new Contact(),
"<form action=\"&#x2f;contact\" method=\"POST\">\
<div><label for=\"id_subject\">Subject:</label><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></div>\
<div><label for=\"id_message\">Message:</label><span> </span><input type=\"text\" name=\"message\" id=\"id_message\"></div>\
<div><label for=\"id_sender\">Sender:</label><span> </span><input type=\"email\" name=\"sender\" id=\"id_sender\"></div>\
<div><label for=\"id_ccMyself\">Cc myself:</label><span> </span><input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\"></div>\
<div><input type=\"submit\" value=\"Submit\"><input type=\"button\" value=\"Cancel\"></div>\
</form>")
})

QUnit.test('Overview - Customising form display', function() {
  var Contact = React.createClass({displayName: 'Contact',
    getInitialState: function() {
      return {form: new ContactForm()}
    }

  , render: function() {
      var form = this.state.form
      var fields = form.boundFieldsObj()

      return React.DOM.form({ref:"form", onSubmit:this.onSubmit, action:"/contact", method:"POST"}
      , form.nonFieldErrors().render()
      , React.DOM.div({key: fields.subject.htmlName, className:"fieldWrapper"}
        , fields.subject.errors().render()
        , React.DOM.label( {htmlFor:"id_subject"}, "Email subject:")
        , fields.subject.render()
        )
      , React.DOM.div({key: fields.message.htmlName, className:"fieldWrapper"}
        , fields.message.errors().render()
        , React.DOM.label( {htmlFor:"id_message"}, "Your message:")
        , fields.message.render()
        )
      , React.DOM.div({key: fields.sender.htmlName, className:"fieldWrapper"}
        , fields.sender.errors().render()
        , React.DOM.label( {htmlFor:"id_sender"}, "Your email address:")
        , fields.sender.render()
        )
      , React.DOM.div({key: fields.ccMyself.htmlName, className:"fieldWrapper"}
        , fields.ccMyself.errors().render()
        , React.DOM.label( {htmlFor:"id_ccMyself"}, "CC yourself?")
        , fields.ccMyself.render()
        )
      , React.DOM.div(null, React.DOM.input( {type:"submit", value:"Send message"}))
      )
    }
  })
  reactHTMLEqual(Contact(),
"<form action=\"&#x2f;contact\" method=\"POST\">\
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
      return React.DOM.form({ref:"form", onSubmit:this.onSubmit, action:"/contact", method:"POST"}
      , form.nonFieldErrors().render()
      , form.boundFields().map(this.renderField)
      , React.DOM.div(null, React.DOM.input( {type:"submit", value:"Send message"}))
      )
    }

  , renderField: function(bf) {
      return React.DOM.div({key: bf.htmlName, className:"fieldWrapper"}
      , bf.errors().render()
      , bf.labelTag(), ' ', bf.render()
      )
    }
  })
  reactHTMLEqual(Contact(),
"<form action=\"&#x2f;contact\" method=\"POST\">\
<div class=\"fieldWrapper\"><label for=\"id_subject\">Subject:</label><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></div>\
<div class=\"fieldWrapper\"><label for=\"id_message\">Message:</label><span> </span><input type=\"text\" name=\"message\" id=\"id_message\"></div>\
<div class=\"fieldWrapper\"><label for=\"id_sender\">Sender:</label><span> </span><input type=\"email\" name=\"sender\" id=\"id_sender\"></div>\
<div class=\"fieldWrapper\"><label for=\"id_ccMyself\">Cc myself:</label><span> </span><input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\"></div>\
<div><input type=\"submit\" value=\"Send message\"></div>\
</form>")
})

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

QUnit.test("Forms - Updating a form's input data", function() {
  var f =new ContactForm()
  var data = {
    subject: 'hello'
  , message: 'Hi there'
  , sender: 'foo@example.com'
  , ccMyself: true
  }
  var isValid = f.setData(data)
  strictEqual(f.isBound, true, 'setData updates isBound')
  strictEqual(isValid, true, 'setData returns result of isValid')
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
"<div><label for=\"id_subject\">Subject:</label><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></div>\
<div><label for=\"id_message\">Message:</label><span> </span><input type=\"text\" name=\"message\" id=\"id_message\"></div>\
<div><label for=\"id_sender\">Sender:</label><span> </span><input type=\"email\" name=\"sender\" id=\"id_sender\"></div>\
<div><label for=\"id_ccMyself\">Cc myself:</label><span> </span><input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\"></div>",
  "asDiv()")
  reactHTMLEqual(f.asUl.bind(f),
"<li><label for=\"id_subject\">Subject:</label><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></li>\
<li><label for=\"id_message\">Message:</label><span> </span><input type=\"text\" name=\"message\" id=\"id_message\"></li>\
<li><label for=\"id_sender\">Sender:</label><span> </span><input type=\"email\" name=\"sender\" id=\"id_sender\"></li>\
<li><label for=\"id_ccMyself\">Cc myself:</label><span> </span><input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\"></li>",
  "asUl()")
})

QUnit.test('Forms - Styling form rows', function() {
  var CssContactForm = forms.Form.extend({
    rowCssClass: 'row'
  , requiredCssClass: 'required'
  , errorCssClass: 'error'
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
"<tr class=\"row required\"><th><label for=\"id_subject\">Subject:</label></th><td><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\" value=\"hello\"></td></tr>\
<tr class=\"row required\"><th><label for=\"id_message\">Message:</label></th><td><input type=\"text\" name=\"message\" id=\"id_message\" value=\"Hi there\"></td></tr>\
<tr class=\"row error required\"><th><label for=\"id_sender\">Sender:</label></th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"email\" name=\"sender\" id=\"id_sender\"></td></tr>\
<tr class=\"row\"><th><label for=\"id_ccMyself\">Cc myself:</label></th><td><input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\" checked></td></tr>",
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
"<li><span>Subject:</span><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\"></li>\
<li><span>Message:</span><span> </span><input type=\"text\" name=\"message\"></li>\
<li><span>Sender:</span><span> </span><input type=\"email\" name=\"sender\"></li>\
<li><span>Cc myself:</span><span> </span><input type=\"checkbox\" name=\"ccMyself\"></li>",
  "asUl(), autoId == false")
  reactHTMLEqual(f.asDiv(),
"<div><span>Subject:</span><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\"></div>\
<div><span>Message:</span><span> </span><input type=\"text\" name=\"message\"></div>\
<div><span>Sender:</span><span> </span><input type=\"email\" name=\"sender\"></div>\
<div><span>Cc myself:</span><span> </span><input type=\"checkbox\" name=\"ccMyself\"></div>",
  "asDiv(), autoId == false")

  f = new ContactForm({autoId: true})
  reactHTMLEqual(f.asTable.bind(f),
"<tr><th><label for=\"subject\">Subject:</label></th><td><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"subject\"></td></tr>\
<tr><th><label for=\"message\">Message:</label></th><td><input type=\"text\" name=\"message\" id=\"message\"></td></tr>\
<tr><th><label for=\"sender\">Sender:</label></th><td><input type=\"email\" name=\"sender\" id=\"sender\"></td></tr>\
<tr><th><label for=\"ccMyself\">Cc myself:</label></th><td><input type=\"checkbox\" name=\"ccMyself\" id=\"ccMyself\"></td></tr>",
  "asTable(), autoId == true")
  reactHTMLEqual(f.asUl.bind(f),
"<li><label for=\"subject\">Subject:</label><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"subject\"></li>\
<li><label for=\"message\">Message:</label><span> </span><input type=\"text\" name=\"message\" id=\"message\"></li>\
<li><label for=\"sender\">Sender:</label><span> </span><input type=\"email\" name=\"sender\" id=\"sender\"></li>\
<li><label for=\"ccMyself\">Cc myself:</label><span> </span><input type=\"checkbox\" name=\"ccMyself\" id=\"ccMyself\"></li>",
  "asUl(), autoId == true")
  reactHTMLEqual(f.asDiv.bind(f),
"<div><label for=\"subject\">Subject:</label><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"subject\"></div>\
<div><label for=\"message\">Message:</label><span> </span><input type=\"text\" name=\"message\" id=\"message\"></div>\
<div><label for=\"sender\">Sender:</label><span> </span><input type=\"email\" name=\"sender\" id=\"sender\"></div>\
<div><label for=\"ccMyself\">Cc myself:</label><span> </span><input type=\"checkbox\" name=\"ccMyself\" id=\"ccMyself\"></div>",
  "asDiv(), autoId == true")

  f = new ContactForm({autoId: 'id_for_{name}'})
  reactHTMLEqual(f.asTable.bind(f),
"<tr><th><label for=\"id_for_subject\">Subject:</label></th><td><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_for_subject\"></td></tr>\
<tr><th><label for=\"id_for_message\">Message:</label></th><td><input type=\"text\" name=\"message\" id=\"id_for_message\"></td></tr>\
<tr><th><label for=\"id_for_sender\">Sender:</label></th><td><input type=\"email\" name=\"sender\" id=\"id_for_sender\"></td></tr>\
<tr><th><label for=\"id_for_ccMyself\">Cc myself:</label></th><td><input type=\"checkbox\" name=\"ccMyself\" id=\"id_for_ccMyself\"></td></tr>",
  "asTable(), autoId == 'id_for_{name}'")
  reactHTMLEqual(f.asUl.bind(f),
"<li><label for=\"id_for_subject\">Subject:</label><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_for_subject\"></li>\
<li><label for=\"id_for_message\">Message:</label><span> </span><input type=\"text\" name=\"message\" id=\"id_for_message\"></li>\
<li><label for=\"id_for_sender\">Sender:</label><span> </span><input type=\"email\" name=\"sender\" id=\"id_for_sender\"></li>\
<li><label for=\"id_for_ccMyself\">Cc myself:</label><span> </span><input type=\"checkbox\" name=\"ccMyself\" id=\"id_for_ccMyself\"></li>",
  "asUl(), autoId == 'id_for_{name}'")
  reactHTMLEqual(f.asDiv.bind(f),
"<div><label for=\"id_for_subject\">Subject:</label><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_for_subject\"></div>\
<div><label for=\"id_for_message\">Message:</label><span> </span><input type=\"text\" name=\"message\" id=\"id_for_message\"></div>\
<div><label for=\"id_for_sender\">Sender:</label><span> </span><input type=\"email\" name=\"sender\" id=\"id_for_sender\"></div>\
<div><label for=\"id_for_ccMyself\">Cc myself:</label><span> </span><input type=\"checkbox\" name=\"ccMyself\" id=\"id_for_ccMyself\"></div>",
  "asDiv(), autoId == 'id_for_{name}'")

  f = new ContactForm({autoId: 'id_for_{name}', labelSuffix: ''})
  reactHTMLEqual(f.asUl.bind(f),
"<li><label for=\"id_for_subject\">Subject</label><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_for_subject\"></li>\
<li><label for=\"id_for_message\">Message</label><span> </span><input type=\"text\" name=\"message\" id=\"id_for_message\"></li>\
<li><label for=\"id_for_sender\">Sender</label><span> </span><input type=\"email\" name=\"sender\" id=\"id_for_sender\"></li>\
<li><label for=\"id_for_ccMyself\">Cc myself</label><span> </span><input type=\"checkbox\" name=\"ccMyself\" id=\"id_for_ccMyself\"></li>",
  "labelSuffix == ''")

  f = new ContactForm({autoId: 'id_for_{name}', labelSuffix: ' ->'})
  reactHTMLEqual(f.asUl.bind(f),
"<li><label for=\"id_for_subject\">Subject -&gt;</label><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_for_subject\"></li>\
<li><label for=\"id_for_message\">Message -&gt;</label><span> </span><input type=\"text\" name=\"message\" id=\"id_for_message\"></li>\
<li><label for=\"id_for_sender\">Sender -&gt;</label><span> </span><input type=\"email\" name=\"sender\" id=\"id_for_sender\"></li>\
<li><label for=\"id_for_ccMyself\">Cc myself -&gt;</label><span> </span><input type=\"checkbox\" name=\"ccMyself\" id=\"id_for_ccMyself\"></li>",
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
"<li><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_subject\">Subject:</label><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></li>\
<li><label for=\"id_message\">Message:</label><span> </span><input type=\"text\" name=\"message\" id=\"id_message\" value=\"Hi there\"></li>\
<li><ul class=\"errorlist\"><li>Enter a valid email address.</li></ul><label for=\"id_sender\">Sender:</label><span> </span><input type=\"email\" name=\"sender\" id=\"id_sender\" value=\"invalid email address\"></li>\
<li><label for=\"id_ccMyself\">Cc myself:</label><span> </span><input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\" checked></li>",
 "asUl() error display")
  reactHTMLEqual(f.asDiv.bind(f),
"<div><ul class=\"errorlist\"><li>This field is required.</li></ul><label for=\"id_subject\">Subject:</label><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\" id=\"id_subject\"></div>\
<div><label for=\"id_message\">Message:</label><span> </span><input type=\"text\" name=\"message\" id=\"id_message\" value=\"Hi there\"></div>\
<div><ul class=\"errorlist\"><li>Enter a valid email address.</li></ul><label for=\"id_sender\">Sender:</label><span> </span><input type=\"email\" name=\"sender\" id=\"id_sender\" value=\"invalid email address\"></div>\
<div><label for=\"id_ccMyself\">Cc myself:</label><span> </span><input type=\"checkbox\" name=\"ccMyself\" id=\"id_ccMyself\" checked></div>",
  "asDiv() error display")

  var DivErrorList = forms.ErrorList.extend({
    render: function() {
      return React.DOM.div({className: 'errorlist'}
      , this.messages().map(function(error) {
          return React.DOM.div(null, error)
        })
      )
    }
  })
  f = new ContactForm({data: data, errorConstructor: DivErrorList, autoId: false})
  reactHTMLEqual(f.asDiv(),
"<div><div class=\"errorlist\"><div>This field is required.</div></div><span>Subject:</span><span> </span><input maxlength=\"100\" type=\"text\" name=\"subject\"></div>\
<div><span>Message:</span><span> </span><input type=\"text\" name=\"message\" value=\"Hi there\"></div>\
<div><div class=\"errorlist\"><div>Enter a valid email address.</div></div><span>Sender:</span><span> </span><input type=\"email\" name=\"sender\" value=\"invalid email address\"></div>\
<div><span>Cc myself:</span><span> </span><input type=\"checkbox\" name=\"ccMyself\" checked></div>",
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
    __mixin__: [PersonForm, InstrumentForm]
  , haircut_type: forms.CharField()
  })
  var b = new BeatleForm({autoId: false})
  reactHTMLEqual(b.asUl(),
"<li><span>Instrument:</span><span> </span><input type=\"text\" name=\"instrument\"></li>\
<li><span>First name:</span><span> </span><input type=\"text\" name=\"first_name\"></li>\
<li><span>Last name:</span><span> </span><input type=\"text\" name=\"last_name\"></li>\
<li><span>Haircut type:</span><span> </span><input type=\"text\" name=\"haircut_type\"></li>",
  "Using forms as mixins")
})

QUnit.test('Forms - Prefixes for forms', function() {
  var mother = new PersonForm({prefix: 'mother'})
  var father = new PersonForm({prefix: 'father'})
  reactHTMLEqual(mother.asUl.bind(mother),
"<li><label for=\"id_mother-first_name\">First name:</label><span> </span><input type=\"text\" name=\"mother-first_name\" id=\"id_mother-first_name\"></li>\
<li><label for=\"id_mother-last_name\">Last name:</label><span> </span><input type=\"text\" name=\"mother-last_name\" id=\"id_mother-last_name\"></li>" )
  reactHTMLEqual(father.asUl.bind(father),
"<li><label for=\"id_father-first_name\">First name:</label><span> </span><input type=\"text\" name=\"father-first_name\" id=\"id_father-first_name\"></li>\
<li><label for=\"id_father-last_name\">Last name:</label><span> </span><input type=\"text\" name=\"father-last_name\" id=\"id_father-last_name\"></li>")
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
      var cleanedData = Option1Form.__super__.clean.call(this)
      var ccMyself = cleanedData.ccMyself
      var subject = cleanedData.subject
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
      var cleanedData = Option2Form.__super__.clean.call(this)
      var ccMyself = cleanedData.ccMyself
      var subject = cleanedData.subject
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

QUnit.test('Formsets - validation', function() {
  var ArticleFormSet = forms.formsetFactory(ArticleForm)
  var data = {
    'form-TOTAL_FORMS': '1'
  , 'form-INITIAL_FORMS': '0'
  , 'form-MAX_NUM_FORMS': ''
  }
  var formset = new ArticleFormSet({data: data})
  strictEqual(formset.isValid(), true)

  var data = {
    'form-TOTAL_FORMS': '2'
  , 'form-INITIAL_FORMS': '0'
  , 'form-MAX_NUM_FORMS': ''
  , 'form-0-title': 'Test'
  , 'form-0-pubDate': '1904-06-16'
  , 'form-1-title': 'Test'
  , 'form-1-pubDate': '' // <-- this date is missing but required
  }
  var formset = new ArticleFormSet({data: data})
  strictEqual(formset.isValid(), false)
  deepEqual(formset.errors().map(function(e) { return e.toJSON() }), [
    {}
  , {pubDate: [{code: 'required', message: 'This field is required.'}]}
  ])
  strictEqual(formset.totalErrorCount(), 1)

  var data = {
    'form-TOTAL_FORMS': '1'
  , 'form-INITIAL_FORMS': '0'
  , 'form-MAX_NUM_FORMS': ''
  , 'form-0-title': ''
  , 'form-0-pubDate': ''
  }
  var formset = new ArticleFormSet({data: data})
  strictEqual(formset.hasChanged(), false)

  var BaseArticleFormSet = forms.BaseFormSet.extend({
    /** Checks that no two articles have the same title. */
    clean: function() {
      if (this.totalErrorCount() !== 0) {
        // Don't bother validating the formset unless each form is valid on its own
        return
      }
      var titles = {}
      this.forms().forEach(function(form) {
        var title = form.cleanedData.title
        if (title in titles) {
          throw forms.ValidationError('Articles in a set must have distinct titles.')
        }
        titles[title] = true
      })
    }
  })
  var ArticleFormSet = forms.formsetFactory(ArticleForm, {formset: BaseArticleFormSet})
  var data = {
    'form-TOTAL_FORMS': '2'
  , 'form-INITIAL_FORMS': '0'
  , 'form-MAX_NUM_FORMS': ''
  , 'form-0-title': 'Test'
  , 'form-0-pubDate': '1904-06-16'
  , 'form-1-title': 'Test'
  , 'form-1-pubDate': '1912-06-23'
  }
  var formset = new ArticleFormSet({data: data})
  strictEqual(formset.isValid(), false)
  deepEqual(formset.errors().map(function(e) { return e.toJSON() }), [{}, {}])
  deepEqual(formset.nonFormErrors().messages(), ['Articles in a set must have distinct titles.'])
})

}()