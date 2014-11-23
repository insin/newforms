'use strict';

var React = require('react')
var forms = require('newforms')

var Collapsible = require('./Collapsible')

var FormInspector = React.createClass({
  propTypes: {
    form: React.PropTypes.instanceOf(forms.Form).isRequired
  },

  render() {
    var form = this.props.form
    return <div className="FormInspector">
      <Collapsible name="input data" collapsed><Obj value={form.data}/></Collapsible>
      <Collapsible name="cleaned data"><Obj value={form.cleanedData}/></Collapsible>
      <Collapsible name="validation errors" collapsed><Obj value={form.errors().toJSON()}/></Collapsible>
      <Collapsible name="form states">
        <Bool name="initial render" value={form.isInitialRender}/>
        <Bool name="complete" value={form.isComplete()}/>
        {form.emptyPermitted && <Bool name="empty" value={!form.notEmpty()}/>}
        <Bool name="valid" value={form.isValid()}/>
      </Collapsible>
      {form.isAsync() && <Collapsible name="async states">
        <Bool name="pending validation" value={form.isPending()}/>
        <Bool name="pending cross-field validation" value={form.nonFieldPending()}/>
      </Collapsible>}
    </div>
  }
})

var Obj = React.createClass({
  render() {
    return <div className="FormInspector__Obj">
      <pre>{JSON.stringify(this.props.value, null, 2)}</pre>
    </div>
  }
})

var Bool = React.createClass({
  render() {
    return <div className="FormInspector__Bool">
      {this.props.value ? '\u2714' : '\u2718'} {this.props.name}
    </div>
  }
})

module.exports = FormInspector