'use strict';

var is = require('isomorph/is')
var React = require('react')

var ProgressMixin = {
  propTypes: {
    progress: React.PropTypes.any // Component or function to render async progress
  },

  renderProgress() {
    if (!this.props.progress) {
      return <progress>Validating...</progress>
    }
    if (is.Function(this.props.progress)) {
      return this.props.progress()
    }
    return <this.props.progress/>
  }
}

module.exports = ProgressMixin