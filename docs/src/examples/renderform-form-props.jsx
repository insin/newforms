'use strict';

var React = require('react')
var {CharField, DateField, Form, RenderForm} = require('newforms')

var IFrameMixin = require('../IFrameMixin')

var ParentForm = Form.extend({
  name: CharField(),
  dob: DateField({label: 'Date of birth'})
})

var RenderFormProps = React.createClass({
  mixins: [IFrameMixin],
  render() {
    return <form>
      <fieldset>
        <legend>Parent 1</legend>
        <RenderForm form={ParentForm} ref="parent1" prefix="parent1" onChange={this.forceResizeIFrame}/>
      </fieldset>
      <fieldset>
        <legend>Parent 2</legend>
        <RenderForm form={ParentForm} ref="parent2" prefix="parent2" onChange={this.forceResizeIFrame}/>
      </fieldset>
    </form>
  }
})

React.render(<RenderFormProps/>, document.body)