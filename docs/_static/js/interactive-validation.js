void function() {

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
    this.state.form.setData(forms.formData(this.refs.form.getDOMNode()))
    this.onFormStateChange()
  }

, onFormStateChange: function() {
    this.setState({form: this.state.form})
  }

, render: function() {
    return React.DOM.div({className: 'example-container'}
      , React.DOM.form({ref: 'form', onSubmit: this.onSubmit}
        , this.state.form.boundFields().map(this.renderField)
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

, renderField: function(bf) {
    var fieldStyle = {style: {marginBottom: '6px'}}
    if (bf.field instanceof forms.BooleanField) {
      return React.DOM.div(fieldStyle
      , React.DOM.label(null, bf.asWidget({attrs: {key: bf.htmlName}}), ' ', bf.label)
      , ' '
      , bf.errors().messages()[0]
      )
    }
    else {
      return React.DOM.div(fieldStyle
      , bf.labelTag()
      , bf.asWidget({attrs: {key: bf.htmlName}})
      , ' '
      , bf.errors().messages()[0]
      )
    }
  }
})

var SignupForm = forms.Form.extend({
  email: forms.EmailField()
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

React.renderComponent(
  FormRenderer({
    form: SignupForm
  , args: {validation: 'auto'}
  , submitButton: 'Sign Up'
  })
, document.getElementById('example-auto-form-validation')
)

}()

