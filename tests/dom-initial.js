QUnit.module('dom-initial', {
  teardown: function() {
    ReactDOM.unmountComponentAtNode(document.getElementById('qunit-fixture'))
  }
})

void function() {

function renderField(field, cb) {
  var _Form  = forms.Form.extend({f: field})
  var _Component = createReactClass({
    displayName: 'QUnitTestComponent'
  , render: function() {
      return React.createElement('form', {id: 'form'}
      , React.createElement('div', null, new _Form().boundField('f').render())
      )
    }
  })
  stop()
  ReactDOM.render(React.createElement(_Component), document.getElementById('qunit-fixture'), function() {
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
    equal('N', document.getElementById('form').elements['f'].value)
  })
})

}()
