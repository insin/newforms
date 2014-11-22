'use strict';

var React = require('react')
var forms = require('newforms')

function renderField(bf) {
  var className = bf.cssClasses('form-field')
  if (bf.field instanceof forms.BooleanField) {
    return <div key={bf.htmlName} className={className}>
      <label>{bf.render()} {bf.label}</label>{' '}
      {bf.errorMessage() && <div className="error-message">{bf.errorMessage()}</div>}
    </div>
  }
  else {
    return <div key={bf.htmlName} className={className}>
      {bf.labelTag()}
      {bf.render({attrs: {className: 'form-control'}})}{' '}
      {bf.errorMessage() && <div className="error-message">{bf.errorMessage()}</div>}
      {bf.helpText && <div className="help-text">{bf.helpText}</div>}
    </div>
  }
}

module.exports = renderField