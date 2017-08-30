'use strict';

var object = require('isomorph/object')
var React = require('react')
var PropTypes = require('prop-types')
var createReactClass = require('create-react-class')

var ErrorObject = require('../ErrorObject')
var Form = require('../Form')
var FormRow = require('./FormRow')
var ProgressMixin = require('./ProgressMixin')

var {NON_FIELD_ERRORS} = require('../constants')
var {autoIdChecker, getProps} = require('../util')

var formProps = {
  autoId: autoIdChecker
, controlled: PropTypes.bool
, data: PropTypes.object
, emptyPermitted: PropTypes.bool
, errorConstructor: PropTypes.func
, errors: PropTypes.instanceOf(ErrorObject)
, files: PropTypes.object
, initial: PropTypes.object
, labelSuffix: PropTypes.string
, onChange: PropTypes.func
, prefix: PropTypes.string
, validation: PropTypes.oneOfType([
    PropTypes.string
  , PropTypes.object
  ])
}

/**
 * Renders a Form. A form instance or constructor can be given. If a constructor
 * is given, an instance will be created when the component is mounted, and any
 * additional props will be passed to the constructor as options.
 */
var RenderForm = createReactClass({
  mixins: [ProgressMixin],
  propTypes: object.extend({}, formProps, {
    className: PropTypes.string      // Class for the component wrapping all rows
  , component: PropTypes.any         // Component to wrap all rows
  , form: PropTypes.oneOfType([      // Form instance or constructor
      PropTypes.func,
      PropTypes.instanceOf(Form)
    ]).isRequired
  , row: PropTypes.any               // Component to render form rows
  , rowComponent: PropTypes.any      // Component to wrap each row
  }),

  childContextTypes: {
    form: PropTypes.instanceOf(Form)
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

  componentWillMount() {
    if (this.props.form instanceof Form) {
      this.form = this.props.form
    }
    else {
      this.form = new this.props.form(object.extend({
        onChange: this.forceUpdate.bind(this)
      }, getProps(this.props, Object.keys(formProps))))
    }
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
