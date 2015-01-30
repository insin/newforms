'use strict';

var object = require('isomorph/object')
var React = require('react')

var BoundField = require('./BoundField')
var ErrorObject = require('./ErrorObject')
var Form = require('./Form')
var FormSet = require('./FormSet')
var constants = require('./constants')
var util = require('./util')

var NON_FIELD_ERRORS = constants.NON_FIELD_ERRORS

var formProps = {
  autoId: util.autoIdChecker
, controlled: React.PropTypes.bool
, data: React.PropTypes.object
, emptyPermitted: React.PropTypes.bool
, errorConstructor: React.PropTypes.func
, errors: React.PropTypes.instanceOf(ErrorObject)
, files: React.PropTypes.object
, initial: React.PropTypes.object
, labelSuffix: React.PropTypes.string
, onChange: React.PropTypes.func
, prefix: React.PropTypes.string
, validation: React.PropTypes.oneOfType([
    React.PropTypes.string
  , React.PropTypes.object
  ])
}

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
 * Renders a "row" in a form. This can contain manually provided contents, or
 * if a BoundField is given, it will be used to display a field's label, widget,
 * error message(s), help text and async pending indicator.
 */
var FormRow = React.createClass({
  displayName: 'FormRow',
  mixins: [util.ProgressMixin],
  propTypes: {
    bf: React.PropTypes.instanceOf(BoundField)
  , className: React.PropTypes.string
  , component: React.PropTypes.any
  , content: React.PropTypes.any
  , hidden: React.PropTypes.bool
  , __all__: function(props) {
      if (!props.bf && !props.content) {
        return new Error(
          'Invalid props supplied to `FormRow`, either `bf` or `content` ' +
          'must be specified.'
        )
      }
      if (props.bf && props.content) {
        return new Error(
          'Both `bf` and `content` props were passed to `FormRow` - `bf` ' +
          'will be ignored.'
        )
      }
    }
  },

  getDefaultProps: function() {
    return {
      component: 'div'
    }
  },

  render: function() {
    var attrs = {}
    if (this.props.className) {
      attrs.className = this.props.className
    }
    if (this.props.hidden) {
      attrs.style = {display: 'none'}
    }
    // If content was given, use it
    if (this.props.content) {
      return React.createElement(this.props.component, attrs, this.props.content)
    }
    // Otherwise render a BoundField
    var bf = this.props.bf
    var isPending = bf.isPending()
    return React.createElement(this.props.component, attrs,
      bf.label && bf.labelTag(), ' ', bf.render(),
      isPending && ' ',
      isPending && this.renderProgress(),
      bf.errors().render(),
      bf.helpText && ' ',
      bf.helpTextTag()
    )
  }
})

if ("production" !== process.env.NODE_ENV) {
  var warnedAboutReactAddons = false
}

/**
 * Renders a Form. A form instance or constructor can be given. If a constructor
 * is given, an instance will be created when the component is mounted, and any
 * additional props will be passed to the constructor as options.
 */
var RenderForm = React.createClass({
  displayName: 'RenderForm',
  mixins: [util.ProgressMixin],
  propTypes: object.extend({}, formProps, {
    className: React.PropTypes.string      // Class for the component wrapping all rows
  , component: React.PropTypes.any         // Component to wrap all rows
  , form: React.PropTypes.oneOfType([      // Form instance or constructor
      React.PropTypes.func,
      React.PropTypes.instanceOf(Form)
    ]).isRequired
  , row: React.PropTypes.any               // Component to render form rows
  , rowComponent: React.PropTypes.any      // Component to wrap each row
  }),

  childContextTypes: {
    form: React.PropTypes.instanceOf(Form)
  },

  getChildContext: function() {
    return {form: this.form}
  },

  getDefaultProps: function() {
    return {
      component: 'div'
    , row: FormRow
    , rowComponent: 'div'
    }
  },

  componentWillMount: function() {
    if (this.props.form instanceof Form) {
      this.form = this.props.form
    }
    else {
      this.form = new this.props.form(object.extend({
        onChange: this.forceUpdate.bind(this)
      }, util.getProps(this.props, Object.keys(formProps))))
    }
  },

  getForm: function() {
    return this.form
  },

  render: function() {
    // Allow a single child to be passed for custom rendering - passing any more
    // will throw an error.
    if (React.Children.count(this.props.children) !== 0) {
      // TODO Cloning should no longer be necessary when facebook/react#2112 lands
      if (React.addons) {
        return React.addons.cloneWithProps(React.Children.only(this.props.children), {form: this.form})
      }
      else {
        if ("production" !== process.env.NODE_ENV) {
          if (!warnedAboutReactAddons) {
            util.warning(
              'Children have been passed to RenderForm but React.addons.' +
              'cloneWithProps is not available to clone them. ' +
              'To use custom rendering, you must use the react-with-addons ' +
              'build of React.'
            )
            warnedAboutReactAddons = true
          }
        }
      }
    }

    // Default rendering
    var form = this.form
    var props = this.props
    var attrs = {}
    if (this.props.className) {
      attrs.className = props.className
    }
    var topErrors = form.nonFieldErrors()
    var hiddenFields = form.hiddenFields().map(function(bf) {
      var errors = bf.errors()
      if (errors.isPopulated) {
        topErrors.extend(errors.messages().map(function(error) {
          return '(Hidden field ' + bf.name + ') ' + error
        }))
      }
      return bf.render()
    })

    return React.createElement(props.component, attrs,
      topErrors.isPopulated() && React.createElement(props.row, {
        className: form.errorCssClass
      , content: topErrors.render()
      , key: form.addPrefix(NON_FIELD_ERRORS)
      , component: props.rowComponent
      }),
      form.visibleFields().map(function(bf) {
        return React.createElement(props.row, {
          bf: bf
        , className: bf.cssClasses()
        , key: bf.htmlName
        , component: props.rowComponent
        , progress: props.progress
        })
      }.bind(this)),
      form.nonFieldPending() && React.createElement(props.row, {
        className: form.pendingRowCssClass
      , content: util.renderProgress.call(this)
      , key: form.addPrefix('__pending__')
      , component: props.rowComponent
      }),
      hiddenFields.length > 0 && React.createElement(props.row, {
        className: form.hiddenFieldRowCssClass
      , content: hiddenFields
      , hidden: true
      , key: form.addPrefix('__hidden__')
      , component: props.rowComponent
      })
    )
  }
})

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

module.exports = {
  FormRow: FormRow
, RenderForm: RenderForm
, RenderFormSet: RenderFormSet
}