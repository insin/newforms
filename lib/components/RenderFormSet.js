'use strict';

var object = require('isomorph/object')
var React = require('react')

var FormRow = require('./FormRow')
var FormSet = require('../FormSet')
var RenderForm = require('./RenderForm')
var constants = require('../constants')
var util = require('../util')

var NON_FIELD_ERRORS = constants.NON_FIELD_ERRORS

var formsetProps = {
  canDelete: React.PropTypes.bool
, canOrder: React.PropTypes.bool
, extra: React.PropTypes.number
, form: React.PropTypes.func
, maxNum: React.PropTypes.number
, minNum: React.PropTypes.number
, validateMax: React.PropTypes.bool
, validateMin: React.PropTypes.bool

, autoId: util.autoIdChecker
, controlled: React.PropTypes.bool
, data: React.PropTypes.object
, errorConstructor: React.PropTypes.func
, files: React.PropTypes.object
, initial: React.PropTypes.object
, onChange: React.PropTypes.func
, prefix: React.PropTypes.string
, validation: React.PropTypes.oneOfType([
    React.PropTypes.string
  , React.PropTypes.object
  ])
}

/**
 * Renders a Formset. A formset instance or constructor can be given. If a
 * constructor is given, an instance will be created when the component is
 * mounted, and any additional props will be passed to the constructor as
 * options.
 */
var RenderFormSet = React.createClass({
  displayName: 'RenderFormSet',
  mixins: [util.ProgressMixin],
  propTypes: object.extend({}, formsetProps, {
    className: React.PropTypes.string         // Class for the component wrapping all forms
  , component: React.PropTypes.any            // Component to wrap all forms
  , formComponent: React.PropTypes.any        // Component to wrap each form
  , formset: React.PropTypes.oneOfType([      // Formset instance or constructor
      React.PropTypes.func,
      React.PropTypes.instanceOf(FormSet)
    ])
  , row: React.PropTypes.any                  // Component to render form rows
  , rowComponent: React.PropTypes.any         // Component to wrap each form row
  , useManagementForm: React.PropTypes.bool   // Should ManagementForm hidden fields be rendered?
  , __all__: function(props) {
      if (!props.form && !props.formset) {
        return new Error(
          'Invalid props supplied to `RenderFormSet`, either `form` or ' +
          '`formset` must be specified.'
        )
      }
    }
  }),

  getDefaultProps: function() {
    return {
      component: 'div'
    , formComponent: 'div'
    , formset: FormSet
    , row: FormRow
    , rowComponent: 'div'
    , useManagementForm: false
    }
  },

  componentWillMount: function() {
    if (this.props.formset instanceof FormSet) {
      this.formset = this.props.formset
    }
    else {
      this.formset = new this.props.formset(object.extend({
        onChange: this.forceUpdate.bind(this)
      }, util.getProps(this.props, Object.keys(formsetProps))))
    }
  },

  getFormset: function() {
    return this.formset
  },

  render: function() {
    var formset = this.formset
    var props = this.props
    var attrs = {}
    if (this.props.className) {
      attrs.className = props.className
    }
    var topErrors = formset.nonFormErrors()

    return React.createElement(props.component, attrs,
      topErrors.isPopulated() && React.createElement(props.row, {
        className: formset.errorCssClass
      , content: topErrors.render()
      , key: formset.addPrefix(NON_FIELD_ERRORS)
      , rowComponent: props.rowComponent
      }),
      formset.forms().map(function(form) {
        return React.createElement(RenderForm, {
          form: form
        , formComponent: props.formComponent
        , row: props.row
        , rowComponent: props.rowComponent
        , progress: props.progress
        })
      }),
      formset.nonFormPending() && React.createElement(props.row, {
        className: formset.pendingRowCssClass
      , content: this.renderProgress()
      , key: formset.addPrefix('__pending__')
      , rowComponent: props.rowComponent
      }),
      props.useManagementForm && React.createElement(RenderForm, {
        form: formset.managementForm()
      , formComponent: props.formComponent
      , row: props.row
      , rowComponent: props.rowComponent
      })
    )
  }
})

module.exports = RenderFormSet