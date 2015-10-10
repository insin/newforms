void function() { 'use strict';

QUnit.module('components')

var PersonForm = forms.Form.extend({
  name: forms.CharField(),
  dob: forms.DateField()
})

var PersonFormSet = forms.FormSet.extend({form: PersonForm, extra: 1})

QUnit.test('RenderForm', function() {
  reactHTMLEqual(React.createElement(forms.RenderForm, {
    form: PersonForm
  , autoId: false
  , className: 'test'
  }),
'<div class="test">\
<div>Name: <input type="text" name="name"/></div>\
<div>Dob: <input type="text" name="dob"/></div>\
</div>',
  'With a Form constructor')

  reactHTMLEqual(React.createElement(forms.RenderForm, {
    className: 'test'
  , form: new PersonForm({autoId: false})
  }),
'<div class="test">\
<div>Name: <input type="text" name="name"/></div>\
<div>Dob: <input type="text" name="dob"/></div>\
</div>',
  'With a Form instance')
})

QUnit.test('RenderFormSet', function() {
  reactHTMLEqual(React.createElement(forms.RenderFormSet, {
    form: PersonForm
  , extra: 2
  , autoId: false
  , className: 'test'
  }),
'<div class="test">\
<div>\
<div>Name: <input type="text" name="form-0-name"/></div>\
<div>Dob: <input type="text" name="form-0-dob"/></div>\
</div>\
<div>\
<div>Name: <input type="text" name="form-1-name"/></div>\
<div>Dob: <input type="text" name="form-1-dob"/></div>\
</div>\
</div>',
  'With a Form constructor')

  reactHTMLEqual(React.createElement(forms.RenderFormSet, {
    formset: PersonFormSet
  , autoId: false
  , className: 'test'
  }),
'<div class="test"><div>\
<div>Name: <input type="text" name="form-0-name"/></div>\
<div>Dob: <input type="text" name="form-0-dob"/></div>\
</div></div>',
  'With a FormSet constructor')

  reactHTMLEqual(React.createElement(forms.RenderFormSet, {
    className: 'test'
  , formset: new PersonFormSet({autoId: false})
  }),
'<div class="test"><div>\
<div>Name: <input type="text" name="form-0-name"/></div>\
<div>Dob: <input type="text" name="form-0-dob"/></div>\
</div></div>',
  'With a FormSet instance')
})

}()
