/**
 * @jsx React.DOM
 */

var choices = [
  [1, 'foo']
, [2, 'bar']
, [3, 'baz']
, [4, 'ter']
]
var choicesWithEmpty = [['', '----']].concat(choices)
var dateFormats = [
  '%Y-%m-%d' // '2006-10-25'
, '%d/%m/%Y' // '25/10/2006'
, '%d/%m/%y' // '25/10/06'
]
var timeFormat = '%H:%M' // '14:30'
var dateTimeFormats = dateFormats.map(function(df) { return df + ' ' + timeFormat})

var AllFieldsForm = forms.Form.extend({
  CharField: forms.CharField({minLength: 5, maxLength: 10, helpText: 'Any text between 5 and 10 characters long.'})
, CharFieldWithTextareaWidget: forms.CharField({label: 'Char field (textarea)', widget: forms.Textarea})
, IntegerField: forms.IntegerField({minValue: 42, maxValue: 420, helpText: 'Any whole number between 42 and 420'})
, FloatField: forms.FloatField({minValue: 4.2, maxValue: 42, helpText: 'Any number between 4.2 and 42'})
, DecimalField: forms.DecimalField({maxDigits: 5, decimalPlaces: 2, helpText: '3 digits allowed before the decimal point, 2 after it'})
, DateField: forms.DateField({inputFormats: dateFormats, helpText: {__html: '<em>yyyy-mm-dd</em> or <em>dd/mm/yyyy</em>'}})
, TimeField: forms.TimeField({inputFormats: [timeFormat], helpText: 'hh:mm, 24 hour'})
, DateTimeField: forms.DateTimeField({inputFormats: dateTimeFormats, helpText: 'e.g. 2014-03-01 20:08'})
, RegexField: forms.RegexField(/^I am Jack's /, {initial: "I am Jack's ", minLength: 20, helpText: 'Must begin with "I am Jack\'s " and be at least 20 characters long'})
, EmailField: forms.EmailField()
, FileField: forms.FileField({helpText: 'Required'})
, ImageField: forms.ImageField({required: false, helpText: 'Optional'})
, URLField: forms.URLField({label: 'URL field'})
, BooleanField: forms.BooleanField()
, NullBooleanField: forms.NullBooleanField()
, ChoiceField: forms.ChoiceField({choices: choicesWithEmpty})
, ChoiceFieldWithRadioWidget: forms.ChoiceField({label: 'Choice field (radios)', choices: choices, initial: 4, widget: forms.RadioSelect})
, TypedChoiceField: forms.TypedChoiceField({choices: choicesWithEmpty, coerce: Number})
, MultipleChoiceField: forms.MultipleChoiceField({choices: choices})
, MultipleChoiceFieldWithCheckboxWidget: forms.MultipleChoiceField({label: 'Multiple choice field (checkboxes)', choices: choices, initial: [1, 3], widget: forms.CheckboxSelectMultiple})
, TypedMultipleChoiceField: forms.TypedMultipleChoiceField({choices: choices, coerce: Number})
, ComboField: forms.ComboField({fields: [
    forms.EmailField()
  , forms.RegexField(/ferret/i, {errorMessages: {invalid: 'Where is ferret? ಠ_ಠ'}})
  ], helpText: 'An email address which contains the word "ferret"'})
, SplitDateTimeField: forms.SplitDateTimeField({label: 'Split date/time field (a MultiValueField)', inputDateFormats: dateFormats, inputTimeFormats: [timeFormat]})
, IPAddressField: forms.IPAddressField({label: 'IP address field', helpText: '(Deprecated)'})
, GenericIPAddressField: forms.GenericIPAddressField({label: 'Generic IP address field', helpText: 'An IPv4 or IPv6 address'})
, SlugField: forms.SlugField({helpText: 'Letters, numbers, underscores, and hyphens only'})

, render: function() {
    return this.boundFields().map(function(bf) {
      // Display cleaneddata, indicating its type
      var cleanedData
      if (this.cleanedData && bf.name in this.cleanedData) {
        cleanedData = this.cleanedData[bf.name]
        if (Array.isArray(cleanedData)) {
          cleanedData = JSON.stringify(cleanedData)
        }
        else {
          var isString = (Object.prototype.toString.call(cleanedData) == '[object String]')
          cleanedData = ''+cleanedData
          if (isString) {
            cleanedData = '"' + cleanedData + '"'
          }
        }
      }

      var help
      if (bf.helpText) {
        help = (bf.helpText.__html
                ? <p dangerouslySetInnerHTML={bf.helpText}/>
                : <p>{bf.helpText}</p>)
      }

      var errors = bf.errors().messages().map(function(message) {
        return <div>{message}</div>
      })

      return <tr key={bf.htmlname}>
        <th>{bf.labelTag()}</th>
        <td>{bf.render()}{help}</td>
        <td>{errors}</td>
        <td className="cleaned-data">{cleanedData}</td>
      </tr>
    }.bind(this))
  }
})

var AllFields = React.createClass({
  getInitialState: function() {
    return({form: new AllFieldsForm()})
  }

, render: function() {
    return <form encType='multipart/form-data' ref="form" onSubmit={this.onSubmit}>
      <table>
        <thead>
          <tr>
            <th>Label</th>
            <th>Input</th>
            <th>Errors</th>
            <th>Cleaned Data</th>
          </tr>
        </thead>
        <tbody>
          {this.state.form.render()}
          <tr>
            <td></td>
            <td colSpan="3">
              <input type="submit" value="Submit"/>
            </td>
          </tr>
        </tbody>
      </table>

      {this.state.form.cleanedData && <h2>form.cleanedData</h2>}
      <pre>{this.state.form.cleanedData && JSON.stringify(this.state.form.cleanedData, null, ' ')}</pre>
    </form>
  }

, onSubmit: function(e) {
    e.preventDefault()
    var data = forms.formData(this.refs.form.getDOMNode())
    var form = new AllFieldsForm({data: data})
    form.fullClean()
    this.setState({form: form})
  }
})

React.renderComponent(<AllFields/>, document.getElementById('app'))
