'use strict';

var React = require('react')
var forms = require('newforms')

var IFrameMixin = require('../IFrameMixin')

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
  mixins: [IFrameMixin],

  propTypes: {
     onSignup: React.PropTypes.func.isRequired
  },

  render() {
    return <form onSubmit={this.onSubmit}>
      <forms.RenderForm form={SignupForm} ref="form" onChange={this.forceResizeIFrame}/>
      <button>Sign Up</button>
    </form>
  },

  onSubmit(e) {
    e.preventDefault()
    var form = this.refs.form.getForm()
    var isValid = form.validate()
    if (isValid) {
      this.props.onSignup(form.cleanedData)
    }
  }
})

var QuickstartExample = React.createClass({
  mixins: [IFrameMixin],

  getInitialState() {
    return {submittedData: null}
  },

  _onSignup(data) {
    this.setState({submittedData: data})
  },

  render() {
    return <div>
      <Signup onSignup={this._onSignup}/>
      <strong>Submitted Data:</strong>
      {this.state.submittedData && <pre>
        {JSON.stringify(this.state.submittedData, null, 2)}
      </pre>}
    </div>
  }
})

React.render(<QuickstartExample/>, document.body)