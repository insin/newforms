(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var React = require('react')

var resizeIFrame = require('./resizeIFrame')

var Collapsible = React.createClass({displayName: "Collapsible",
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
},{"./resizeIFrame":6,"react":"react"}],2:[function(require,module,exports){
'use strict';

var React = require('react')
var forms = require('newforms')

var Collapsible = require('./Collapsible')

var FormInspector = React.createClass({displayName: "FormInspector",
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

var Obj = React.createClass({displayName: "Obj",
  render:function() {
    return React.createElement("div", {className: "FormInspector__Obj"}, 
      React.createElement("pre", null, JSON.stringify(this.props.value, null, 2))
    )
  }
})

var Bool = React.createClass({displayName: "Bool",
  render:function() {
    return React.createElement("div", {className: "FormInspector__Bool"}, 
      this.props.value ? '\u2714' : '\u2718', " ", this.props.name
    )
  }
})

module.exports = FormInspector
},{"./Collapsible":1,"newforms":"newforms","react":"react"}],3:[function(require,module,exports){
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
},{"./resizeIFrame":6}],4:[function(require,module,exports){
'use strict';

var React = require('react')
var forms = require('newforms')

var Collapsible = require('../Collapsible')
var FormInspector = require('../FormInspector')
var IFrameMixin = require('../IFrameMixin')

var renderField = require('../renderField')

var PersonForm = forms.Form.extend({
  name: forms.CharField({maxLength: 100}),
  age: forms.IntegerField({minValue: 0, maxValue: 115}),
  bio: forms.CharField({widget: forms.Textarea})
})

var PeopleEditor = React.createClass({displayName: "PeopleEditor",
  mixins: [IFrameMixin],

  getInitialState:function() {
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
  },

  handleEdit:function(i) {
    this.state.form.reset(this.state.people[i])
    this.setState({editing: i})
  },

  handleSubmit:function(e) {
    e.preventDefault()
    var form = this.state.form
    var isValid = form.validate()
    if (isValid) {
      this.state.people[this.state.editing] = form.cleanedData
      form.reset({})
      this.setState({editing: null})
    }
  },

  handleCancel:function(i) {
    this.setState({editing: null})
  },

  handleReset:function() {
    this.state.form.reset()
  },

  render:function() {
    return React.createElement("div", null, 
      this.renderPeople(), 
      React.createElement("hr", null), 
      this.state.editing !== null && React.createElement("div", null, 
        React.createElement("form", {onSubmit: this.handleSubmit}, 
        this.state.form.boundFields().map(renderField), 
        React.createElement("div", null, 
          React.createElement("button", {type: "button", onClick: this.handleCancel}, "Cancel"), ' ', 
          React.createElement("button", {type: "button", onClick: this.handleReset}, "Reset"), ' ', 
          React.createElement("button", {type: "submit"}, "Save")
        )
        ), 
        React.createElement("hr", null), 
        React.createElement(Collapsible, {name: "inspect form", defaultCollapsed: true}, 
          React.createElement(FormInspector, {form: this.state.form})
        )
      )
    )
  },

  renderPeople:function() {
    return React.createElement("table", null, 
      React.createElement("thead", null, 
        React.createElement("tr", null, 
          React.createElement("th", null, "Name"), 
          React.createElement("th", null, "Age"), 
          React.createElement("th", null, "Bio"), 
          React.createElement("th", null, " ")
        )
      ), 
      React.createElement("tbody", null, 
        this.state.people.map(function(person, i)  {
          return React.createElement("tr", null, 
            React.createElement("td", null, person.name), 
            React.createElement("td", null, person.age), 
            React.createElement("td", null, person.bio), 
            React.createElement("td", null, 
              React.createElement("button", {type: "button", onClick: this.handleEdit.bind(this, i)}, "Edit")
            )
          )
        }.bind(this))
      )
    )
  }
})

React.render(React.createElement(PeopleEditor, null), document.body)
},{"../Collapsible":1,"../FormInspector":2,"../IFrameMixin":3,"../renderField":5,"newforms":"newforms","react":"react"}],5:[function(require,module,exports){
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
},{"newforms":"newforms","react":"react"}],6:[function(require,module,exports){
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
},{}]},{},[4]);
