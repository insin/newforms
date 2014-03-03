/** @jsx React.DOM */

void function() {

'use strict';

/**
 * @interface
 */
var FormLayout = Concur.extend({
  constructor: function FormLayout() {
  }
})

// TODO __meta__ which validates this on extension
FormLayout.prototype.render = function(form) {
  throw new Error('Objects extending FormLayout must define a render() function')
}

/**
 * @constructor
 * @implements {FormLayout}
 */
var GridLayout = FormLayout.extend({
  constructor: function GridLayout(kwargs) {
    if (!(this instanceof GridLayout)) { return new GridLayout(kwargs) }
    kwargs = isomorph.object.extend({
      layout: null, fillerCssClass: null, topErrorCssClass: null
    }, kwargs)
    if (!kwargs.layout) {
      throw new Error('A layout must be specified for a GridLayout.')
    }
    this.layout = kwargs.layout
    this.maxCol = Math.max.apply(Math, this.layout.map(function(row) { return row.length }))
    this.fillerCssClass = kwargs.fillerCssClass
    this.topErrorCssClass = kwargs.topErrorCssClass
  }
})

GridLayout.prototype.render = function(form) {
  var renderedRows = []
  var nonFieldErrors = form.nonFieldErrors()
  if (nonFieldErrors.isPopulated()) {
    renderedRows.push(<tr className={this.topErrorCssClass}>
      <td colSpan={2 * this.maxCol}>{nonFieldErrors.render()}</td>
    </tr>)
  }
  for (var i = 0, l = this.layout.length, rowFields; i < l; i++) {
    rowFields = this.layout[i]
    var renderedCols = []
    for (var j = 0, m = rowFields.length; j < m; j++) {
      var bf = form.boundField(rowFields[j])
      var errors = bf.errors()
      var cssClasses = bf.cssClasses()
      renderedCols.push(
        <th className={cssClasses}>{bf.labelTag()}</th>
      , <td key={bf.htmlName} className={cssClasses}>
          {errors.isPopulated() && errors.render()}
          {bf.render()}
        </td>
      )
    }
    // Fill up any remaining columns
    if (rowFields.length < this.maxCol) {
      renderedCols.push(<td colSpan={2 * (this.maxCol - rowFields.length)}
                            className={this.fillerCssClass}>
                        </td>)
    }
    renderedRows.push(<tr>{renderedCols}</tr>)
  }
  return renderedRows
}

// TODO __meta__ which validates presence of layout on extension
/**
 * A Form which is configured with a Layout object which is responsible for
 * rendering -- overrides the default render() function.
 */
var LayoutForm = forms.Form.extend({
  constructor: function LayoutForm(kwargs) {
    if (!(this.layout instanceof FormLayout)) {
      throw Error('A LayoutForm must have a layout property which is instanceof FormLayout')
    }
    LayoutForm.__super__.constructor.call(this, kwargs)
  }

, render: function() {
    return this.layout.render(this)
  }
})

var ReleaseForm = LayoutForm.extend({
  layout: GridLayout({
    layout: [
      [ 'name'      ]
    , [ 'theme'     ]
    , [ 'startDate' , 'releaseDate' ]
    , [ 'state'     , 'resources'   ]
    , [ 'project'   ]
    , [ 'estimate'  ]
    , [ 'notes'     ]
    ]
  , fillerCssClass: 'empty'
  , topErrorCssClass: 'top-errors'
  })

, requiredCssClass: 'required'
, errorCssClass: 'error'

, name: forms.CharField({maxLength: 50})
, theme: forms.CharField({required: false, widget: forms.Textarea})
, startDate: forms.DateField()
, releaseDate: forms.DateField()
, state: forms.ChoiceField({choices: [ [1, 'Planning']
                                     , [2, 'Active']
                                     , [3, 'Accepted']
                                     ]})
, resources: forms.DecimalField({required: false, minValue: 0, decimalPlaces: 2})
, project: forms.ChoiceField()
, estimate: forms.DecimalField({required: false, minValue: 0, decimalPlaces: 2})
, notes: forms.CharField({required: false, widget: forms.Textarea})

, constructor: function ReleaseForm(projects, kwargs) {
    if (!(this instanceof ReleaseForm)) { return new ReleaseForm(projects, kwargs) }
    ReleaseForm.__super__.constructor.call(this, kwargs)
    this.fields.project.setChoices(projects.map(function(project) {
      return [project.id, project.name]
    }))
  }

, clean: function() {
    if (this.cleanedData.startDate && this.cleanedData.releaseDate &&
        this.cleanedData.startDate > this.cleanedData.releaseDate) {
      this.addError('releaseDate', 'Cannot be prior to Start Date.')
    }

    if (JSON.stringify(this.cleanedData).toUpperCase().indexOf('CLOWN') != -1) {
      throw forms.ValidationError('NO CLOWNS!')
    }
  }
})

var projects = [
  {id: 1, name: 'Test Project 1'}
, {id: 2, name: 'Test Project 2'}
, {id: 3, name: 'Test Project 3'}
]

var CustomLayout = React.createClass({
  getInitialState: function() {
    return {form: ReleaseForm(projects)}
  }

, render: function() {
    return <form ref="form" onSubmit={this.onSubmit}>
      <div className="inline-block">
        <table>
          <tbody>
            {this.state.form.render()}
            <tr>
              <td colSpan="4">
                <input type="submit" value="Submit"/>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="inline-block cleaned-data">
        {this.state.form.cleanedData && <h2>form.cleanedData</h2>}
        <pre>{this.state.form.cleanedData && JSON.stringify(this.state.form.cleanedData, null, ' ')}</pre>
      </div>
    </form>
  }

, onSubmit: function(e) {
    e.preventDefault()
    this.state.form.setData(forms.formData(this.refs.form.getDOMNode()))
    this.forceUpdate()
  }
})

React.renderComponent(<CustomLayout/>, document.getElementById('app'))

}()
