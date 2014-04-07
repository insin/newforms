QUnit.module('dom-initial', {
  teardown: function() {
    React.unmountComponentAtNode(document.getElementById('qunit-fixture'))
  }
})

void function() {

function renderField(field, cb) {
  var _Form  = forms.Form.extend({f: field})
  var _Component = React.createClass({
    displayName: 'QUnitTestComponent'
  , render: function() {
      return React.DOM.form({id: 'form'}
      , React.DOM.div(null, new _Form().boundField('f').render())
      )
    }
  })
  stop()
  React.renderComponent(_Component(), document.getElementById('qunit-fixture'), function() {
    cb()
    start()
  })
}

// Regression test for issue #45
QUnit.test('Select', 1, function() {
  var f = forms.ChoiceField({
    choices: [['', '(Blank)'], ['Y', 'Yes'], ['N', 'No']]
  , initial: 'N'
  })
  renderField(f, function() {
    equal('N', forms.util.fieldData(document.getElementById('form'), 'f'))
  })
})

}()