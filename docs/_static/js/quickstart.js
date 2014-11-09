!function() {

'use strict';

var link = document.createElement('link')
link.rel = 'stylesheet'
link.href = '_static/css/newforms-examples.css'
document.querySelector('head').appendChild(link)

var SignupForm = forms.Form.extend({
  username: forms.CharField(),
  email: forms.EmailField(),
  password: forms.CharField({widget: forms.PasswordInput}),
  confirmPassword: forms.CharField({widget: forms.PasswordInput}),
  acceptTerms: forms.BooleanField({required: true}),

  clean: function() {
    if (this.cleanedData.password &&
        this.cleanedData.confirmPassword &&
        this.cleanedData.password != this.cleanedData.confirmPassword) {
      throw forms.ValidationError('Passwords do not match.')
    }
  }
})

var Signup = React.createClass({displayName: 'Signup',
  propTypes: {
     onSubmitSignup: React.PropTypes.func.isRequired
  },

  getInitialState: function() {
    return {
      form: new SignupForm({onChange: this.forceUpdate.bind(this)})
    }
  },

  render: function() {
    return React.createElement("form", {onSubmit: this.onSubmit},
      React.createElement("table", null,
        React.createElement("tbody", null,
          this.state.form.asTable()
        )
      ),
      React.createElement("div", {className: "controls"},
        React.createElement("input", {type: "submit", value: "Submit"})
      )
    )
  },

  onSubmit: function(e) {
    e.preventDefault()
    var isValid = this.state.form.validate()
    if (isValid) {
      this.props.onSubmitSignup(this.state.form.cleanedData)
    }
    else {
      this.forceUpdate()
    }
  }
})

var QuickstartExample = React.createClass({
  getInitialState: function() {
    return {
      submittedData: null
    }
  },

  handleSubmitSignup: function(data) {
    this.setState({submittedData: data})
  },

  render: function() {
    return React.createElement("div", null,
      React.createElement(Signup, {onSubmitSignup: this.handleSubmitSignup}),
      React.createElement("strong", null,
        "Submitted Data:"
      ),
      this.state.submittedData && React.createElement("pre", null,
        JSON.stringify(this.state.submittedData, null, 2)
      )
    )
  }
})

React.render(React.createElement(QuickstartExample, null), document.getElementById('example-quickstart'))

}()