'use strict';

var React = require('react')

var resizeIFrame = require('./resizeIFrame')

var Collapsible = React.createClass({
  propTypes: {
    name: React.PropTypes.string.isRequired
  },

  getDefaultProps() {
    return {
      collapsed: false
    }
  },

  getInitialState() {
    return {
      collapsed: !!this.props.collapsed
    }
  },

  _onToggleCollapse() {
    this.setState({collapsed: !this.state.collapsed}, resizeIFrame)
  },

  render() {
    return <div className="Collapsible">
      <label className="Collapsible__label">
        <input type="checkbox" checked={!this.state.collapsed} onChange={this._onToggleCollapse}/>{' '}
        {this.props.name}
      </label>
      <div className="Collapsible__content" style={{marginLeft: 25, display: this.state.collapsed ? 'none' : ''}}>
        {this.props.children}
      </div>
    </div>
  }
})

module.exports = Collapsible