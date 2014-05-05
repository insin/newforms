void function() {

'use strict';

var link = document.createElement('link')
link.rel = 'stylesheet'
link.href = '_static/css/newforms-examples.css'
document.querySelector('head').appendChild(link)

function extend(dest, src) {
  for (var prop in src) {
    if (src.hasOwnProperty(prop)) {
      dest[prop] = src[prop]
    }
  }
  return dest
}

function renderField(bf) {
  var className = bf.cssClasses('form-field')
  if (bf.field instanceof forms.BooleanField) {
    return React.DOM.div({className: className}
    , React.DOM.label(null, bf.render(), ' ', bf.label)
    , ' '
    , bf.errors().messages()[0]
    )
  }
  else {
    return React.DOM.div({className: className}
    , bf.labelTag()
    , bf.render()
    , ' '
    , bf.errors().messages()[0]
    )
  }
}

var FormRenderer = React.createClass({
  getInitialState: function() {
    return {
      form: this.createForm()
    }
  }

, createForm: function() {
    var args = extend({onStateChange: this.onFormStateChange}, this.props.args)
    return new this.props.form(args)
  }

, onSubmit: function(e) {
    e.preventDefault()
    this.state.form.validate(this.refs.form)
  }

, onFormStateChange: function() {
    this.forceUpdate()
  }

, render: function() {
    return React.DOM.div({className: 'example-container'}
    , React.DOM.form({ref: 'form', onSubmit: this.onSubmit}
      , this.state.form.boundFields().map(renderField)
      , React.DOM.div(null
        , React.DOM.button({type: 'submit'}, this.props.submitButton)
        )
      )
    , React.DOM.div({className: 'cleaned-data'}
      , React.DOM.strong(null, 'form.cleanedData')
      , React.DOM.pre(null
        , this.state.form.cleanedData && JSON.stringify(this.state.form.cleanedData, null, 2)
        )
      )
    )
  }
})

var SignupForm = forms.Form.extend({
  requiredCssClass: 'required'

, email: forms.EmailField()
, password: forms.CharField({widget: forms.PasswordInput})
, confirm: forms.CharField({label: 'Confirm password', widget: forms.PasswordInput})
, terms: forms.BooleanField({
    label: 'I have read and agree to the Terms and Conditions'
  , errorMessages: {required: 'You must accept the terms to continue'}
  })

, clean: function() {
    if (this.cleanedData.password && this.cleanedData.confirm &&
        this.cleanedData.password != this.cleanedData.confirm) {
      this.addError('confirm', 'Does not match the entered password.')
    }
  }
})

var PersonForm = forms.Form.extend({
  name: forms.CharField({maxLength: 100})
, age: forms.IntegerField({minValue: 0, maxValue: 115})
, bio: forms.CharField({widget: forms.Textarea})
, requiredCssClass: 'required'
})

var PeopleEditor = React.createClass({
  getInitialState: function() {
    return {
      editing: null
    , form: new PersonForm({
        controlled: true
      , validation: 'auto'
      , onStateChange: this.forceUpdate.bind(this)
      })
    , people: [
        {name: 'Alan', age: 43, bio: 'Some guy off the TV'}
      , {name: 'Lynne', age: 56, bio: 'Laughs at weather'}
      , {name: 'Tex (Terry)', age: 31, bio: 'Likes American things'}
      , {name: 'Sonja', age: 33, bio: 'Tells very funny story'}
      ]
    }
  }

, handleEdit: function(i) {
    this.state.form.reset(this.state.people[i])
    this.setState({editing: i})
  }

, handleSubmit: function(e) {
    e.preventDefault()
    var isValid = this.state.form.validate(this.refs.form)
    if (isValid) {
      this.state.people[this.state.editing] = this.state.form.cleanedData
      this.setState({editing: null})
    }
  }

, handleCancel: function(i) {
    this.setState({editing: null})
  }

, handleReset: function() {
    this.state.form.reset()
  }

, render: function() {
    return React.DOM.div(null
    , this.renderPeople()
    , React.DOM.hr(null)
    , this.state.editing !== null && React.DOM.form({ref: 'form', onSubmit: this.handleSubmit}
      , this.state.form.boundFields().map(renderField)
      , React.DOM.div(null
        , React.DOM.button({type: 'button', onClick: this.handleCancel}, 'Cancel')
        , ' '
        , React.DOM.button({type: 'button', onClick: this.handleReset}, 'Reset')
        , ' '
        , React.DOM.button({type: 'submit'}, 'Save')
        )
      )
    )
  }

, renderPeople: function() {
    return React.DOM.table(null
    , React.DOM.thead(null
      , React.DOM.tr(null
        , React.DOM.th(null, 'Name')
        , React.DOM.th(null, 'Age')
        , React.DOM.th(null, 'Bio')
        , React.DOM.th(null)
        )
      )
    , React.DOM.tbody(null
      , this.state.people.map(function(person, i) {
          return React.DOM.tr(null
          , React.DOM.td(null, person.name)
          , React.DOM.td(null, person.age)
          , React.DOM.td(null, person.bio)
          , React.DOM.td(null
            , React.DOM.button({type: 'button', onClick: this.handleEdit.bind(this, i)}, 'Edit')
            )
          )
        }.bind(this))
      )
    )
  }
})

React.renderComponent(
  FormRenderer({
    form: SignupForm
  , args: {validation: 'auto'}
  , submitButton: 'Sign Up'
  })
, document.getElementById('example-auto-form-validation')
)

React.renderComponent(
  PeopleEditor()
, document.getElementById('example-controlled-form')
)

}()

