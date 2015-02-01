'use strict';

var React = require('react')

var BoundField = require('../BoundField')
var ProgressMixin = require('./ProgressMixin')

/**
 * Renders a "row" in a form. This can contain manually provided contents, or
 * if a BoundField is given, it will be used to display a field's label, widget,
 * error message(s), help text and async pending indicator.
 */
var FormRow = React.createClass({
  displayName: 'FormRow',
  mixins: [ProgressMixin],
  propTypes: {
    bf: React.PropTypes.instanceOf(BoundField)
  , className: React.PropTypes.string
  , component: React.PropTypes.any
  , content: React.PropTypes.any
  , hidden: React.PropTypes.bool
  , __all__: function(props) {
      if (!props.bf && !props.content) {
        return new Error(
          'Invalid props supplied to `FormRow`, either `bf` or `content` ' +
          'must be specified.'
        )
      }
      if (props.bf && props.content) {
        return new Error(
          'Both `bf` and `content` props were passed to `FormRow` - `bf` ' +
          'will be ignored.'
        )
      }
    }
  },

  getDefaultProps: function() {
    return {
      component: 'div'
    }
  },

  render: function() {
    var attrs = {}
    if (this.props.className) {
      attrs.className = this.props.className
    }
    if (this.props.hidden) {
      attrs.style = {display: 'none'}
    }
    // If content was given, use it
    if (this.props.content) {
      return React.createElement(this.props.component, attrs, this.props.content)
    }
    // Otherwise render a BoundField
    var bf = this.props.bf
    var isPending = bf.isPending()
    return React.createElement(this.props.component, attrs,
      bf.label && bf.labelTag(), ' ', bf.render(),
      isPending && ' ',
      isPending && this.renderProgress(),
      bf.errors().render(),
      bf.helpText && ' ',
      bf.helpTextTag()
    )
  }
})

module.exports = FormRow