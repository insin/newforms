# newforms [![travis status](https://secure.travis-ci.org/insin/newforms.png)](http://travis-ci.org/insin/newforms)

An isomorphic form-handling library for [React](http://facebook.github.io/react/).

(Formerly a direct port of the [Django](http://www.djangoproject.com) framework's `django.forms` library)

## Getting newforms

### Node.js

Newforms can be used on the server, or bundled for the client using an
npm-compatible packaging system such as [Browserify](http://browserify.org/) or
[webpack](http://webpack.github.io/).

```
npm install newforms
```

```javascript
var forms = require('newforms')
```

By default, newforms will be in development mode. To use it in production mode,
set the environment variable `NODE_ENV` to `'production'` when bundling. To
completely remove all development mode code, use a minifier that performs
dead-code elimination, such as [UglifyJS](https://github.com/mishoo/UglifyJS2).

### Browser bundle

The browser bundle exposes a global `forms` variable and expects to
find global `React` variable to work with.

The uncompressed bundle is in development mode, so will log warnings about
potential mistakes.

You can find it in the [/dist directory](https://github.com/insin/newforms/tree/v0.12.1/dist).

## [Upgrade Guide](https://github.com/insin/newforms/blob/react/UPGRADE_GUIDE.md#0120)

## [Documentation @ ReadTheDocs](http://newforms.readthedocs.org/en/v0.12.1/)

## [Newforms Examples @ GitHub](https://github.com/insin/newforms-examples)

## Related Projects

* [newforms-bootstrap](https://github.com/insin/newforms-bootstrap) - Bootstrap 3
  integration & grid form form layout components.

* [newforms-gridforms](https://github.com/insin/newforms-gridforms) -
  [Grid Forms](http://kumailht.com/gridforms/) form layout components.

## Other React Form Libraries

* [React Forms](https://github.com/prometheusresearch/react-forms)

* [tcomb-form](https://github.com/gcanti/tcomb-form)

## Quick Guide

A quick introduction to defining and using newforms Form objects.

### Design your Form

The starting point for defining your own forms is `Form.extend()`.

Here's a simple (but incomplete!) definition of a type of Form you've probably
seen dozens of times:

```javascript
var SignupForm = forms.Form.extend({
  username: forms.CharField(),
  email: forms.EmailField(),
  password: forms.CharField({widget: forms.PasswordInput}),
  confirmPassword: forms.CharField({widget: forms.PasswordInput}),
  acceptTerms: forms.BooleanField({required: true})
})
```

A piece of user input data is represented by a `Field`, groups
of related Fields are held in a `Form` and a form input which will
be displayed to the user is represented by a `Widget`. Every
Field has a default Widget, which can be overridden.

### Rendering a Form

Forms provide helpers for rendering labels, user inputs and validation errors
for their fields. To get you started quickly, newforms provides a React
component which use these helpers to render a basic form structure.

At the very least, you must wrap rendered form contents in a `<form>`,
provide form controls such as a submit button and hook up handling of form
submission:

```javascript
var Signup = React.createClass({
  render: function() {
    return <form onSubmit={this._onSubmit}>
      <forms.RenderForm form={SignupForm} ref="signupForm"/>
      <button>Sign Up</button>
    </form>
  },

  // ...
```

Rendering helpers attach event handlers to the inputs they render, so getting
user input data is handled for you.

The `RenderForm` component handles creating a form instance for you, and
setting up automatic validation of user input as it's given.

To access this form instance later, make sure the component has a `ref` name.

### Handling form submission

The final step in using a Form is validating when the user attempts to submit.

First, use the `ref` name you defined earlier to get the form instance via the
`RenderForm` component's `getForm()` method.

Then call the form's `validate()` method to ensure every field in the form is
validated against its current user input.

If a Form is valid, it will have a `cleanedData` object containing validated
data, coerced to the appropriate JavaScript data type when appropriate:

```javascript
  propTypes: {
    onSignup: React.PropTypes.func.isRequired
  },

  _onSubmit: function(e) {
    e.preventDefault()

    var form = this.refs.signupForm.getForm()
    var isValid = form.validate()
    if (isValid) {
      this.props.onSignup(form.cleanedData)
    }
  }
})
```

### Implementing custom validation

There's an obvious validation not being handled by our form: what if the
passwords don't match?

This is a cross-field validation. To implement custom, cross-field validation
add a `clean()` method to the Form definition:

```javascript
clean: function() {
  if (this.cleanedData.password &&
      this.cleanedData.confirmPassword &&
      this.cleanedData.password != this.cleanedData.confirmPassword) {
    throw forms.ValidationError('Passwords do not match.')
  }
}
```

### [Live Quickstart Demo](http://newforms.readthedocs.org/en/latest/quickstart.html#live-demo)

## MIT Licensed