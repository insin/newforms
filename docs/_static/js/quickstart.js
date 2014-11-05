!function() {

'use strict';

var link = document.createElement('link')
link.rel = 'stylesheet'
link.href = '_static/css/newforms-examples.css'
document.querySelector('head').appendChild(link)

var ContactForm = forms.Form.extend({
  subject: forms.CharField({maxLength: 100}),
  message: forms.CharField(),
  sender: forms.EmailField(),
  ccMyself: forms.BooleanField({required: false}),

  cleanSender: function() {
    if (this.cleanedData.sender == 'mymatesteve@gmail.com') {
       throw forms.ValidationError("I know it's you, Steve. " +
                                   "Stop messing with my example form.")
    }
  },

  clean: function() {
    if (this.cleanedData.subject &&
        this.cleanedData.subject.indexOf('that tenner you owe me') != -1) {
      throw forms.ValidationError('*BZZZT!* SYSTEM ERROR. Beeepity-boop etc.')
    }
  }
})

var AddContact = React.createClass({displayName: 'AddContact',
  propTypes: {
     onSubmitContact: React.PropTypes.func.isRequired
  },

  getInitialState: function() {
    return {
      form: new ContactForm({
        validation: 'auto'
      , onStateChange: this.forceUpdate.bind(this)
      })
    }
  },

  render: function() {
    return React.createElement("form", {onSubmit: this.onSubmit},
      React.createElement("table", null,
        React.createElement("tbody", null,
          this.state.form.asTable()
        )
      ),
      React.createElement("div", {className: "controls"},
        React.createElement("input", {type: "submit", value: "Submit"})
      )
    )
  },

  onSubmit: function(e) {
    e.preventDefault()
    var isValid = this.state.form.validate()
    if (isValid) {
      this.props.onSubmitContact(this.state.form.cleanedData)
    }
    else {
      this.forceUpdate()
    }
  }
})

var QuickstartExample = React.createClass({
  getInitialState: function() {
    return {
      submittedData: null
    }
  },

  handleSubmitContact: function(contact) {
    this.setState({submittedData: contact})
  },

  render: function() {
    return React.createElement("div", null,
      React.createElement(AddContact, {onSubmitContact: this.handleSubmitContact}),
      React.createElement("strong", null,
        "Submitted Data:"
      ),
      this.state.submittedData && React.createElement("pre", null,
        JSON.stringify(this.state.submittedData, null, 2)
      )
    )
  }
})

React.render(React.createElement(QuickstartExample, null), document.getElementById('example-quickstart'))

}()