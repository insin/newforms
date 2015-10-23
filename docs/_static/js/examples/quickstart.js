(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var resizeIFrame = require('./resizeIFrame')

var IFrameMixin = {
  componentDidMount: function() {
    resizeIFrame()
  },

  componentDidUpdate: function(prevProps, prevState) {
    resizeIFrame()
  },

  /**
   * Forces an update to rezise the iframe - required for demos which use the
   * components newforms provides, to hook into state changes.
   */
  forceResizeIFrame: function() {
    this.forceUpdate()
  }
}

module.exports = IFrameMixin
},{"./resizeIFrame":3}],2:[function(require,module,exports){
'use strict';

var React = require('react')
var forms = require('newforms')
var $__0=  require('react-dom'),render=$__0.render

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

var Signup = React.createClass({displayName: "Signup",
  mixins: [IFrameMixin],

  propTypes: {
     onSignup: React.PropTypes.func.isRequired
  },

  render:function() {
    return React.createElement("form", {onSubmit: this.onSubmit, noValidate: true}, 
      React.createElement(forms.RenderForm, {form: SignupForm, ref: "form", onChange: this.forceResizeIFrame}), 
      React.createElement("button", null, "Sign Up")
    )
  },

  onSubmit:function(e) {
    e.preventDefault()
    var form = this.refs.form.getForm()
    var isValid = form.validate()
    if (isValid) {
      this.props.onSignup(form.cleanedData)
    }
  }
})

var QuickstartExample = React.createClass({displayName: "QuickstartExample",
  mixins: [IFrameMixin],

  getInitialState:function() {
    return {submittedData: null}
  },

  _onSignup:function(data) {
    this.setState({submittedData: data})
  },

  render:function() {
    return React.createElement("div", null, 
      React.createElement(Signup, {onSignup: this._onSignup}), 
      React.createElement("strong", null, "Submitted Data:"), 
      this.state.submittedData && React.createElement("pre", null, 
        JSON.stringify(this.state.submittedData, null, 2)
      )
    )
  }
})

render(React.createElement(QuickstartExample, null), document.body)

},{"../IFrameMixin":1,"newforms":"newforms","react":"react","react-dom":"react-dom"}],3:[function(require,module,exports){
'use strict';

var iframe = null
var html = null

function resizeIFrame() {
  if (iframe === null) {
    var iframes = window.parent.document.querySelectorAll('iframe')
    for (var i = 0, l = iframes.length; i < l ; i++) {
      if (window === iframes[i].contentWindow) {
        html = document.querySelector('html')
        iframe = iframes[i]
        break
      }
    }
  }
  iframe.style.height = html.offsetHeight + 'px'
}

module.exports = resizeIFrame
},{}]},{},[2]);
