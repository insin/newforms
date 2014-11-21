'use strict';

var React = require('react')

var extend = require('./extend')
var renderField = require('./renderField')

/**
 * Generic form-rendering component for demo forms which just need to be wrapped
 * and rendered.
 */
var FormRenderer = React.createClass({
  getInitialState() {
    return {
      form: this.createForm()
    }
  },

  createForm() {
    var args = extend({onChange: this.onFormChange}, this.props.args)
    return new this.props.form(args)
  },

  onFormChange() {
    this.forceUpdate(resizeIFrame)
  },

  onSubmit(e) {
    e.preventDefault()
    var form = this.state.form
    if (form.isAsync()) {
      form.validate(function(err) {
        this.onFormChange()
      })
    }
    else {
      form.validate()
      this.onFormChange()
    }
  },

  render() {
    var form = this.state.form
    return <div className="example-container">
      <form onSubmit={this.onSubmit}>
        {form.boundFields().map(renderField)}
        <div>
          <button type="submit">{this.props.submitButton}</button>
        </div>
      </form>
      <div className="cleaned-data">
        <strong>form.cleanedData</strong>
        <pre>
          {form.isComplete() && JSON.stringify(form.cleanedData, null, 2)}
        </pre>
      </div>
    </div>
  }
})

module.exports = FormRenderer