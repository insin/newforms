'use strict';

var React = require('react')

function renderField(bf) {
  var className = bf.cssClasses('form-field')
  if (bf.field instanceof forms.BooleanField) {
    return <div className={className}>
      <label>bf.render() {bf.label}</label>{' '}
      {bf.errors().messages()[0]}
    </div>
  }
  else {
    return <div className={className}>
      {bf.labelTag()}
      {bf.render()}{' '}
      {bf.errors().messages()[0]}
    </div>
  }
}

module.exports = renderField