(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var resizeIFrame = require('./resizeIFrame')

var IFrameMixin = {
  componentDidMount: function() {
    resizeIFrame()
  },

  componentDidUpdate: function(prevProps, prevState) {
    resizeIFrame()
  }
}

module.exports = IFrameMixin
},{"./resizeIFrame":3}],2:[function(require,module,exports){
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

var Signup = React.createClass({displayName: 'Signup',
  mixins: [IFrameMixin],

  propTypes: {
     onSubmitSignup: React.PropTypes.func.isRequired
  },

  getInitialState:function() {
    return {form: new SignupForm({onChange: this.forceUpdate.bind(this)})}
  },

  render:function() {
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

  onSubmit:function(e) {
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

var QuickstartExample = React.createClass({displayName: 'QuickstartExample',
  mixins: [IFrameMixin],

  getInitialState:function() {
    return {submittedData: null}
  },

  handleSubmitSignup:function(data) {
    this.setState({submittedData: data})
  },

  render:function() {
    return React.createElement("div", null, 
      React.createElement(Signup, {onSubmitSignup: this.handleSubmitSignup}), 
      React.createElement("strong", null, "Submitted Data:"), 
      this.state.submittedData && React.createElement("pre", null, 
        JSON.stringify(this.state.submittedData, null, 2)
      )
    )
  }
})

React.render(React.createElement(QuickstartExample, null), document.body)
},{"../IFrameMixin":1,"newforms":"newforms","react":"react"}],3:[function(require,module,exports){
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
