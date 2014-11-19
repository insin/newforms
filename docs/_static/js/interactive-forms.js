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
    return React.createElement('div', {className: className}
    , React.createElement('label', null, bf.render(), ' ', bf.label)
    , ' '
    , bf.errors().messages()[0]
    )
  }
  else {
    return React.createElement('div', {className: className}
    , bf.labelTag()
    , bf.render()
    , ' '
    , bf.errors().messages()[0]
    )
  }
}

/**
 * Generic form-rendering component for demo forms which just need to be wrapped
 * and rendered.
 */
var FormRenderer = React.createClass({
  getInitialState: function() {
    return {
      form: this.createForm()
    }
  }

, createForm: function() {
    var args = extend({onChange: this.forceUpdate.bind(this)}, this.props.args)
    return new this.props.form(args)
  }

, onSubmit: function(e) {
    e.preventDefault()
    this.state.form.validate()
    this.forceUpdate()
  }

, render: function() {
    return React.createElement('div', {className: 'example-container'}
    , React.createElement('form', {ref: 'form', onSubmit: this.onSubmit}
      , this.state.form.boundFields().map(renderField)
      , React.createElement('div', null
        , React.createElement('button', {type: 'submit'}, this.props.submitButton)
        )
      )
    , React.createElement('div', {className: 'cleaned-data'}
      , React.createElement('strong', null, 'form.cleanedData')
      , React.createElement('pre', null
        , this.state.form.cleanedData && JSON.stringify(this.state.form.cleanedData, null, 2)
        )
      )
    )
  }
})

var SignupForm = forms.Form.extend({
  errorCssClass: 'example-error'
, requiredCssClass: 'example-required'
, validCssClass: 'example-valid'

, email: forms.EmailField()
, password: forms.CharField({widget: forms.PasswordInput})
, confirm: forms.CharField({label: 'Confirm password', widget: forms.PasswordInput})
, terms: forms.BooleanField({
    label: 'I have read and agree to the Terms and Conditions'
  , errorMessages: {required: 'You must accept the terms to continue'}
  })

, clean: ['password', 'confirm', function() {
    if (this.cleanedData.password && this.cleanedData.confirm &&
        this.cleanedData.password != this.cleanedData.confirm) {
      this.addError('confirm', 'Does not match the entered password.')
    }
  }]
})

var PersonForm = forms.Form.extend({
  name: forms.CharField({maxLength: 100})
, age: forms.IntegerField({minValue: 0, maxValue: 115})
, bio: forms.CharField({widget: forms.Textarea})
})

var PeopleEditor = React.createClass({
  getInitialState: function() {
    return {
      editing: null
    , form: new PersonForm({
        controlled: true
      , onChange: this.forceUpdate.bind(this)
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
    var isValid = this.state.form.validate()
    if (isValid) {
      this.state.people[this.state.editing] = this.state.form.cleanedData
      delete this.state.form.cleanedData
      this.setState({editing: null})
    }
    else {
      this.forceUpdate()
    }
  }

, handleCancel: function(i) {
    this.setState({editing: null})
  }

, handleReset: function() {
    this.state.form.reset()
  }

, render: function() {
    return React.createElement('div', null
    , this.renderPeople()
    , React.createElement('hr', null)
    , this.state.editing !== null && React.createElement('form', {onSubmit: this.handleSubmit}
      , this.state.form.boundFields().map(renderField)
      , React.createElement('div', null
        , React.createElement('button', {type: 'button', onClick: this.handleCancel}, 'Cancel')
        , ' '
        , React.createElement('button', {type: 'button', onClick: this.handleReset}, 'Reset')
        , ' '
        , React.createElement('button', {type: 'submit'}, 'Save')
        )
      )
    )
  }

, renderPeople: function() {
    return React.createElement('table', null
    , React.createElement('thead', null
      , React.createElement('tr', null
        , React.createElement('th', null, 'Name')
        , React.createElement('th', null, 'Age')
        , React.createElement('th', null, 'Bio')
        , React.createElement('th', null)
        )
      )
    , React.createElement('tbody', null
      , this.state.people.map(function(person, i) {
          return React.createElement('tr', null
          , React.createElement('td', null, person.name)
          , React.createElement('td', null, person.age)
          , React.createElement('td', null, person.bio)
          , React.createElement('td', null
            , React.createElement('button', {type: 'button', onClick: this.handleEdit.bind(this, i)}, 'Edit')
            )
          )
        }.bind(this))
      )
    )
  }
})

React.render(
  React.createElement(FormRenderer, {
    form: SignupForm
  , submitButton: 'Sign Up'
  }),
  document.getElementById('example-auto-form-validation')
)

React.render(
  React.createElement(PeopleEditor, null),
  document.getElementById('example-controlled-form')
)

}()
