(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var React = require('react')

var resizeIFrame = require('./resizeIFrame')

var Collapsible = React.createClass({displayName: 'Collapsible',
  propTypes: {
    name: React.PropTypes.string.isRequired
  },

  getDefaultProps:function() {
    return {
      collapsed: false
    }
  },

  getInitialState:function() {
    return {
      collapsed: !!this.props.collapsed
    }
  },

  _onToggleCollapse:function() {
    this.setState({collapsed: !this.state.collapsed}, resizeIFrame)
  },

  render:function() {
    return React.createElement("div", {className: "Collapsible"}, 
      React.createElement("label", {className: "Collapsible__label"}, 
        React.createElement("input", {type: "checkbox", checked: !this.state.collapsed, onChange: this._onToggleCollapse}), ' ', 
        this.props.name
      ), 
      React.createElement("div", {className: "Collapsible__content", style: {marginLeft: 25, display: this.state.collapsed ? 'none' : ''}}, 
        this.props.children
      )
    )
  }
})

module.exports = Collapsible
},{"./resizeIFrame":8,"react":"react"}],2:[function(require,module,exports){
'use strict';

var React = require('react')
var forms = require('newforms')

var Collapsible = require('./Collapsible')

var FormInspector = React.createClass({displayName: 'FormInspector',
  propTypes: {
    form: React.PropTypes.instanceOf(forms.Form).isRequired
  },

  render:function() {
    var form = this.props.form
    return React.createElement("div", {className: "FormInspector"}, 
      React.createElement(Collapsible, {name: "input data", collapsed: true}, React.createElement(Obj, {value: form.data})), 
      React.createElement(Collapsible, {name: "cleaned data"}, React.createElement(Obj, {value: form.cleanedData})), 
      React.createElement(Collapsible, {name: "validation errors", collapsed: true}, React.createElement(Obj, {value: form.errors().toJSON()})), 
      React.createElement(Collapsible, {name: "form states"}, 
        React.createElement(Bool, {name: "initial render", value: form.isInitialRender}), 
        React.createElement(Bool, {name: "complete", value: form.isComplete()}), 
        form.emptyPermitted && React.createElement(Bool, {name: "empty", value: !form.notEmpty()}), 
        React.createElement(Bool, {name: "valid", value: form.isValid()})
      ), 
      form.isAsync() && React.createElement(Collapsible, {name: "async states"}, 
        React.createElement(Bool, {name: "pending validation", value: form.isPending()}), 
        React.createElement(Bool, {name: "pending cross-field validation", value: form.nonFieldPending()})
      )
    )
  }
})

var Obj = React.createClass({displayName: 'Obj',
  render:function() {
    return React.createElement("div", {className: "FormInspector__Obj"}, 
      React.createElement("pre", null, JSON.stringify(this.props.value, null, 2))
    )
  }
})

var Bool = React.createClass({displayName: 'Bool',
  render:function() {
    return React.createElement("div", {className: "FormInspector__Bool"}, 
      this.props.value ? '\u2714' : '\u2718', " ", this.props.name
    )
  }
})

module.exports = FormInspector
},{"./Collapsible":1,"newforms":"newforms","react":"react"}],3:[function(require,module,exports){
'use strict';

var React = require('react')

var Collapsible = require('./Collapsible')
var FormInspector = require('./FormInspector')
var IFrameMixin = require('./IFrameMixin')

var extend = require('./extend')
var renderField = require('./renderField')

/**
 * Generic form-rendering component for demo forms which just need to be wrapped
 * and rendered.
 */
var FormRenderer = React.createClass({displayName: 'FormRenderer',
  mixins: [IFrameMixin],

  getDefaultProps: function() {
    return {
      submitButton: 'Submit'
    }
  },

  getInitialState:function() {
    return {
      form: this.createForm()
    }
  },

  createForm:function() {
    var args = extend({onChange: this.forceUpdate.bind(this)}, this.props.args)
    return new this.props.form(args)
  },

  onSubmit:function(e) {
    e.preventDefault()
    var form = this.state.form
    if (form.isAsync()) {
      form.validate(function(err)  {
        this.forceUpdate()
      }.bind(this))
    }
    else {
      form.validate()
      this.forceUpdate()
    }
  },

  render:function() {
    var form = this.state.form
    return React.createElement("div", {className: "example-container"}, 
      React.createElement("form", {onSubmit: this.onSubmit, autoComplete: "off", noValidate: true}, 
        form.nonFieldErrors().render(), 
        form.boundFields().map(renderField), 
        React.createElement("div", null, 
          React.createElement("button", {type: "submit"}, this.props.submitButton)
        )
      ), 
      React.createElement("hr", null), 
      React.createElement(Collapsible, {name: "inspect form", collapsed: true}, 
        React.createElement(FormInspector, {form: form})
      )
    )
  }
})

module.exports = FormRenderer
},{"./Collapsible":1,"./FormInspector":2,"./IFrameMixin":4,"./extend":6,"./renderField":7,"react":"react"}],4:[function(require,module,exports){
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
},{"./resizeIFrame":8}],5:[function(require,module,exports){
'use strict';

var React = require('react')
var forms = require('newforms')

var FormRenderer = require('../FormRenderer')

var SignupForm = forms.Form.extend({
  errorCssClass: 'example-error',
  requiredCssClass: 'example-required',
  validCssClass: 'example-valid',

  email: forms.EmailField(),
  password: forms.CharField({widget: forms.PasswordInput}),
  confirm: forms.CharField({label: 'Confirm password', widget: forms.PasswordInput}),
  terms: forms.BooleanField({
    label: 'I have read and agree to the Terms and Conditions'
  , errorMessages: {required: 'You must accept the terms to continue'}
  }),

  clean: ['password', 'confirm', function() {
    if (this.cleanedData.password && this.cleanedData.confirm &&
        this.cleanedData.password != this.cleanedData.confirm) {
      this.addError('confirm', 'Does not match the entered password.')
    }
  }]
})

React.render(React.createElement(FormRenderer, {form: SignupForm, submitButton: "Sign Up"}), document.body)
},{"../FormRenderer":3,"newforms":"newforms","react":"react"}],6:[function(require,module,exports){
'use strict';

function extend(dest, src) {
  for (var prop in src) {
    if (src.hasOwnProperty(prop)) {
      dest[prop] = src[prop]
    }
  }
  return dest
}

module.exports = extend
},{}],7:[function(require,module,exports){
'use strict';

var React = require('react')
var forms = require('newforms')

function renderField(bf) {
  var className = bf.cssClasses('form-field')
  if (bf.field instanceof forms.BooleanField) {
    return React.createElement("div", {key: bf.htmlName, className: className}, 
      React.createElement("label", null, bf.render(), " ", bf.label), ' ', 
      bf.errorMessage() && React.createElement("div", {className: "error-message"}, bf.errorMessage())
    )
  }
  else {
    return React.createElement("div", {key: bf.htmlName, className: className}, 
      bf.labelTag(), 
      bf.render({attrs: {className: 'form-control'}}), 
      bf.isPending() && React.createElement("span", null, React.createElement("img", {src: "../img/spinner-14.gif"}), " Validating..."), 
      ' ', 
      bf.errorMessage() && React.createElement("div", {className: "error-message"}, bf.errorMessage()), 
      bf.helpText && React.createElement("div", {className: "help-text"}, bf.helpText)
    )
  }
}

module.exports = renderField
},{"newforms":"newforms","react":"react"}],8:[function(require,module,exports){
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
},{}]},{},[5]);
