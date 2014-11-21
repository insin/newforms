void function() {

'use strict';

var PersonForm = forms.Form.extend({
  name: forms.CharField({maxLength: 100}),
  age: forms.IntegerField({minValue: 0, maxValue: 115}),
  bio: forms.CharField({widget: forms.Textarea})
})

var PeopleEditor = React.createClass({
  getInitialState() {
    return {
      editing: null
    , form: new PersonForm({
        controlled: true
      , onChange: this.onFormChange
      })
    , people: [
        {name: 'Alan', age: 43, bio: 'Some guy off the TV'}
      , {name: 'Lynne', age: 56, bio: 'Laughs at weather'}
      , {name: 'Tex (Terry)', age: 31, bio: 'Likes American things'}
      , {name: 'Sonja', age: 33, bio: 'Tells very funny story'}
      ]
    }
  },

  onFormChange() {
    this.forceUpdate(resizeIFrame)
  },

  handleEdit(i) {
    this.state.form.reset(this.state.people[i])
    this.setState({editing: i})
  },

  handleSubmit(e) {
    e.preventDefault()
    var isValid = this.state.form.validate()
    if (isValid) {
      this.state.people[this.state.editing] = this.state.form.cleanedData
      delete this.state.form.cleanedData
      this.setState({editing: null})
    }
    else {
      this.forceUpdate()
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
      {this.state.editing !== null && <form onSubmit={this.handleSubmit}>
        {this.state.form.boundFields().map(renderField)}
        <div>
          <button type="button" onClick={this.handleCancel}>Cancel</button>{' '}
          <button type="button" onClick={this.handleReset}>Reset</button>{' '}
          <button type="submit">Save</button>
        </div>
      </form>}
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

React.render(<PeopleEditor/>, document.body, resizeIFrame)

}()