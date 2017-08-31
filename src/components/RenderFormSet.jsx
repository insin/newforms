'use strict';

var object = require('isomorph/object')
var React = require('react')
var PropTypes = require('prop-types')
var createReactClass = require('create-react-class')

var FormRow = require('./FormRow')
var FormSet = require('../FormSet')
var ProgressMixin = require('./ProgressMixin')
var RenderForm = require('./RenderForm')

var {NON_FIELD_ERRORS} = require('../constants')
var {autoIdChecker, getProps} = require('../util')

var formsetProps = {
  canDelete: PropTypes.bool
, canOrder: PropTypes.bool
, extra: PropTypes.number
, form: PropTypes.func
, maxNum: PropTypes.number
, minNum: PropTypes.number
, validateMax: PropTypes.bool
, validateMin: PropTypes.bool

, autoId: autoIdChecker
, controlled: PropTypes.bool
, data: PropTypes.object
, errorConstructor: PropTypes.func
, files: PropTypes.object
, initial: PropTypes.object
, onChange: PropTypes.func
, prefix: PropTypes.string
, validation: PropTypes.oneOfType([
    PropTypes.string
  , PropTypes.object
  ])
}

/**
 * Renders a Formset. A formset instance or constructor can be given. If a
 * constructor is given, an instance will be created when the component is
 * mounted, and any additional props will be passed to the constructor as
 * options.
 */
var RenderFormSet = createReactClass({
  mixins: [ProgressMixin],
  propTypes: object.extend({}, formsetProps, {
    className: PropTypes.string         // Class for the component wrapping all forms
  , component: PropTypes.any            // Component to wrap all forms
  , formComponent: PropTypes.any        // Component to wrap each form
  , formset: PropTypes.oneOfType([      // Formset instance or constructor
      PropTypes.func,
      PropTypes.instanceOf(FormSet)
    ])
  , row: PropTypes.any                  // Component to render form rows
  , rowComponent: PropTypes.any         // Component to wrap each form row
  , useManagementForm: PropTypes.bool   // Should ManagementForm hidden fields be rendered?
  , __all__(props) {
      if (!props.form && !props.formset) {
        return new Error(
          'Invalid props supplied to `RenderFormSet`, either `form` or ' +
          '`formset` must be specified.'
        )
      }
    }
  }),

  getDefaultProps() {
    return {
      component: 'div'
    , formComponent: 'div'
    , formset: FormSet
    , row: FormRow
    , rowComponent: 'div'
    , useManagementForm: false
    }
  },

  componentWillMount() {
    if (this.props.formset instanceof FormSet) {
      this.formset = this.props.formset
    }
    else {
      this.formset = new this.props.formset(object.extend({
        onChange: this.forceUpdate.bind(this)
      }, getProps(this.props, Object.keys(formsetProps))))
    }
  },

  getFormset() {
    return this.formset
  },

  render() {
    var {formset, props} = this
    var attrs = {}
    if (this.props.className) {
      attrs.className = props.className
    }
    var topErrors = formset.nonFormErrors()

    return <props.component {...attrs}>
      {topErrors.isPopulated() && <props.row
        className={formset.errorCssClass}
        content={topErrors.render()}
        key={formset.addPrefix(NON_FIELD_ERRORS)}
        rowComponent={props.rowComponent}
      />}
      {formset.forms().map(form => <RenderForm
        form={form}
        formComponent={props.formComponent}
        progress={props.progress}
        row={props.row}
        rowComponent={props.rowComponent}
      />)}
      {formset.nonFormPending() && <props.row
        className={formset.pendingRowCssClass}
        content={this.renderProgress()}
        key={formset.addPrefix('__pending__')}
        rowComponent={props.rowComponent}
      />}
      {props.useManagementForm && <RenderForm
        form={formset.managementForm()}
        formComponent={props.formComponent}
        row={props.row}
        rowComponent={props.rowComponent}
      />}
    </props.component>
  }
})

module.exports = RenderFormSet
