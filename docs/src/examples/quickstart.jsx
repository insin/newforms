'use strict';

var forms = require('newforms')
var React = require('react')

var resizeIFrame = require('../resizeIFrame')

var SignupForm = forms.Form.extend({
  username: forms.CharField(),
  email: forms.EmailField(),
  password: forms.CharField({widget: forms.PasswordInput}),
  confirmPassword: forms.CharField({widget: forms.PasswordInput}),
  acceptTerms: forms.BooleanField({required: true}),

  clean: function() {
    if (this.cleanedData.password && this.cleanedData.confirmPassword &&
        this.cleanedData.password != this.cleanedData.confirmPassword) {
      throw forms.ValidationError('Passwords do not match.')
    }
  }
})

var Signup = React.createClass({
  propTypes: {
     onSubmitSignup: React.PropTypes.func.isRequired
  },

  getInitialState() {
    return {form: new SignupForm({onChange: this.onFormChange})}
  },

  onFormChange() {
    this.forceUpdate(resizeIFrame)
  },

  render() {
    return <form onSubmit={this.onSubmit}>
      <table>
        <tbody>
          {this.state.form.asTable()}
        </tbody>
      </table>
      <div className="controls">
        <input type="submit" value="Submit"/>
      </div>
    </form>
  },

  onSubmit(e) {
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
  getInitialState() {
    return {submittedData: null}
  },

  handleSubmitSignup(data) {
    this.setState({submittedData: data})
  },

  render() {
    return <div>
      <Signup onSubmitSignup={this.handleSubmitSignup}/>
      <strong>Submitted Data:</strong>
      {this.state.submittedData && <pre>
        {JSON.stringify(this.state.submittedData, null, 2)}
      </pre>}
    </div>
  }
})

React.render(<QuickstartExample/>, document.body, resizeIFrame)