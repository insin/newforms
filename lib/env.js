'use strict';

var React = require('react')

var slice = Array.prototype.slice

function render(el, attrs, content) {
  el = React.DOM[el]
  if (arguments.length == 2) { return el(attrs) }
  if (arguments.length == 3) { return el(attrs, content) }
  return el.apply(null, [attrs].concat(slice.call(arguments, 2)))
}

module.exports = {
  browser: typeof process == 'undefined'
, render: render
}
