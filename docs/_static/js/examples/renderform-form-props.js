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
var $__0=     require('newforms'),CharField=$__0.CharField,DateField=$__0.DateField,Form=$__0.Form,RenderForm=$__0.RenderForm
var $__1=  require('react-dom'),render=$__1.render

var IFrameMixin = require('../IFrameMixin')

var ParentForm = Form.extend({
  name: CharField(),
  dob: DateField({label: 'Date of birth'})
})

var RenderFormProps = React.createClass({displayName: "RenderFormProps",
  mixins: [IFrameMixin],
  render:function() {
    return React.createElement("form", null, 
      React.createElement("fieldset", null, 
        React.createElement("legend", null, "Parent 1"), 
        React.createElement(RenderForm, {form: ParentForm, ref: "parent1", prefix: "parent1", onChange: this.forceResizeIFrame})
      ), 
      React.createElement("fieldset", null, 
        React.createElement("legend", null, "Parent 2"), 
        React.createElement(RenderForm, {form: ParentForm, ref: "parent2", prefix: "parent2", onChange: this.forceResizeIFrame})
      )
    )
  }
})

render(React.createElement(RenderFormProps, null), document.body)

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
