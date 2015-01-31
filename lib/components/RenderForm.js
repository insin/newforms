'use strict';

var object = require('isomorph/object')
var React = require('react')

var constants = require('../constants')
var util = require('../util')

var ErrorObject = require('../ErrorObject')
var Form = require('../Form')
var FormRow = require('./FormRow')

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
      , key: form.addPrefix(constants.NON_FIELD_ERRORS)
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

module.exports =  RenderForm