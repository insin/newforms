# Upgrade Guide

See [CHANGES](https://github.com/insin/newforms/blob/react/CHANGES.md) for the
full changelog between releases.

## 0.12.0 (future version)

### Removed deprecated `formsetFactory()`

`formsetFactory()` - deprecated in 0.11 - will be removed. `FormSet.extend()`
can now be given a `form` option and the same options `formsetFactory()` took to
create a new `FormSet` constructor with defaulted options and custom methods.

```javascript
// < 0.12.0
var DrinksFormSet = forms.formsetFactory(DrinkForm, {
  extra: 3,
  clean: function() {
    // ...
  }
})

// 0.12.0
var DrinksFormSet = forms.FormSet.extend({
  forn: DrinkForm,
  extra: 3,
  clean: function() {
    // ...
  }
})
```

## 0.11.0 (next version)

### npm publishing changes

Newforms is now published to npm as flattened, top-level modules. Aside from any
documented breaking changes, the top level API in `require('newforms')` has not
changed.

If you were requiring anything under `newforms/lib`, there are no longer
`fields`, `forms`, `formsets` or `widgets` modules and all the components they
used to export are now available as top-level imports under `newforms`:

```javascript
// < 0.11.0
var FileField = require('newforms/lib/fields/FileField')

// 0.11.0
var FileField = require('newforms/FileField')
```

### Top-level API changes

`BaseForm` has been renamed to `Form`.

`BaseFormSet` has been renamed to `FormSet`.

`formData` has been renamed to `getFormData`.

### Removed deprecated default rendering methods

Default rendering methods on `Form` and `FormSet` (`render()`, `asTable()`,
`asDiv()` and `asUl()`) - which were deprecated in 0.10 - have been removed.
They have been replaced with React components which provide a default rendering
implementation: `RenderForm` and `RenderFormSet`.

```javascript
// < 0.11.0
  render: () {
    var form = this.form
    var formset = this.formset
    return <form onSubmit={this._onSubmit}>
      {form.render()}
      {formset.render()}
      <button>Submit</button>
    </form>
  }

// 0.11.0
  render: () {
    var form = this.form
    return <form onSubmit={this._onSubmit}>
      <forms.RenderForm form={form}/>
      <forms.RenderFormSet formset={formset}/>
      <button>Submit</button>
    </form>
  }
```

Default rendering by these components uses `<div>` containers, but they can be
customised by passing props. See the
[React Components documentation](http://newforms.readthedocs.org/en/latest/react_components.html)
for more info.