'use strict';

var React = require('react')
var PropTypes = require('prop-types')
var createReactClass = require('create-react-class')

var BoundField = require('../BoundField')
var ProgressMixin = require('./ProgressMixin')

/**
 * Renders a "row" in a form. This can contain manually provided contents, or
 * if a BoundField is given, it will be used to display a field's label, widget,
 * error message(s), help text and async pending indicator.
 */
var FormRow = createReactClass({
  mixins: [ProgressMixin],
  propTypes: {
    bf: PropTypes.instanceOf(BoundField)
  , className: PropTypes.string
  , component: PropTypes.any
  , content: PropTypes.any
  , hidden: PropTypes.bool
  , __all__(props) {
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

  getDefaultProps() {
    return {
      component: 'div'
    }
  },

  render() {
    var attrs = {}
    if (this.props.className) {
      attrs.className = this.props.className
    }
    if (this.props.hidden) {
      attrs.style = {display: 'none'}
    }
    // If content was given, use it
    if (this.props.content) {
      return <this.props.component {...attrs}>{this.props.content}</this.props.component>
    }
    // Otherwise render a BoundField
    var bf = this.props.bf
    var isPending = bf.isPending()
    return <this.props.component {...attrs}>
      {bf.label && bf.labelTag()} {bf.render()}
      {isPending && ' '}
      {isPending && this.renderProgress()}
      {bf.errors().render()}
      {bf.helpText && ' '}
      {bf.helpTextTag()}
    </this.props.component>
  }
})

module.exports = FormRow
