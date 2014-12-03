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

var PeopleEditor = React.createClass({
  mixins: [IFrameMixin],

  getInitialState() {
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

  handleEdit(i) {
    this.state.form.reset(this.state.people[i])
    this.setState({editing: i})
  },

  handleSubmit(e) {
    e.preventDefault()
    var form = this.state.form
    var isValid = form.validate()
    if (isValid) {
      this.state.people[this.state.editing] = form.cleanedData
      form.reset({})
      this.setState({editing: null})
    }
  },

  handleCancel(i) {
    this.setState({editing: null})
  },

  handleReset() {
    this.state.form.reset()
  },

  render() {
    return <div>
      {this.renderPeople()}
      <hr/>
      {this.state.editing !== null && <div>
        <form onSubmit={this.handleSubmit}>
        {this.state.form.boundFields().map(renderField)}
        <div>
          <button type="button" onClick={this.handleCancel}>Cancel</button>{' '}
          <button type="button" onClick={this.handleReset}>Reset</button>{' '}
          <button type="submit">Save</button>
        </div>
        </form>
        <hr/>
        <Collapsible name="inspect form" defaultCollapsed>
          <FormInspector form={this.state.form}/>
        </Collapsible>
      </div>}
    </div>
  },

  renderPeople() {
    return <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Age</th>
          <th>Bio</th>
          <th>&nbsp;</th>
        </tr>
      </thead>
      <tbody>
        {this.state.people.map((person, i) => {
          return <tr>
            <td>{person.name}</td>
            <td>{person.age}</td>
            <td>{person.bio}</td>
            <td>
              <button type="button" onClick={this.handleEdit.bind(this, i)}>Edit</button>
            </td>
          </tr>
        })}
      </tbody>
    </table>
  }
})

React.render(<PeopleEditor/>, document.body)