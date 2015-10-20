'use strict';

var object = require('isomorph/object')
var React = require('react')

var ErrorObject = require('../ErrorObject')
var Form = require('../Form')
var FormRow = require('./FormRow')
var ProgressMixin = require('./ProgressMixin')

var {NON_FIELD_ERRORS} = require('../constants')
var {autoIdChecker, getProps} = require('../util')

var formProps = {
  autoId: autoIdChecker
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

/**
 * Renders a Form. A form instance or constructor can be given. If a constructor
 * is given, an instance will be created when the component is mounted, and any
 * additional props will be passed to the constructor as options.
 */
var RenderForm = React.createClass({
  mixins: [ProgressMixin],
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

  getChildContext() {
    return {form: this.form}
  },

  getDefaultProps() {
    return {
      component: 'div'
    , row: FormRow
    , rowComponent: 'div'
    }
  },

  setupForm: function(props) {
    if (props.form instanceof Form) {
      this.form = props.form
    }
    else {
      this.form = new props.form(object.extend({
        onChange: this.forceUpdate.bind(this)
      }, getProps(props, Object.keys(formProps))))
    }
  },

  componentWillMount() {
    this.setupForm(this.props);
  },

  componentWillReceiveProps: function(nextProps) {
    this.setupForm(nextProps);
  },

  getForm() {
    return this.form
  },

  render() {
    // Allow a single child to be passed for custom rendering - passing any more
    // will throw an error.
    if (React.Children.count(this.props.children) !== 0) {
      // Pass a form prop to the child, which will also be available via context
      return React.cloneElement(React.Children.only(this.props.children), {form: this.form})
    }

    // Default rendering
    var {form, props} = this
    var attrs = {}
    if (this.props.className) {
      attrs.className = props.className
    }
    var topErrors = form.nonFieldErrors()
    var hiddenFields = form.hiddenFields().map(bf => {
      var errors = bf.errors()
      if (errors.isPopulated) {
        topErrors.extend(errors.messages().map(error => {
          return '(Hidden field ' + bf.name + ') ' + error
        }))
      }
      return bf.render()
    })

    return <props.component {...attrs}>
      {topErrors.isPopulated() && <props.row
        className={form.errorCssClass}
        component={props.rowComponent}
        content={topErrors.render()}
        key={form.addPrefix(NON_FIELD_ERRORS)}
      />}
      {form.visibleFields().map(bf => <props.row
        bf={bf}
        className={bf.cssClasses()}
        component={props.rowComponent}
        key={bf.htmlName}
        progress={props.progress}
      />)}
      {form.nonFieldPending() && <props.row
        className={form.pendingRowCssClass}
        component={props.rowComponent}
        content={this.renderProgress()}
        key={form.addPrefix('__pending__')}
      />}
      {hiddenFields.length > 0 && <props.row
        className={form.hiddenFieldRowCssClass}
        component={props.rowComponent}
        content={hiddenFields}
        hidden={true}
        key={form.addPrefix('__hidden__')}
      />}
    </props.component>
  }
})

module.exports = RenderForm
