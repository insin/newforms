'use strict';

var React = require('react')
var {render} = require('react-dom')
var {CharField, Form, ValidationError} = require('newforms')

var FormRenderer = require('../FormRenderer')

var AsyncSignupForm = Form.extend({
  username: CharField(),

  cleanUsername: function(cb) {
    var username = this.cleanedData.username
    setTimeout(function() {
      if (/[aeiou]/.test(username)) {
        return cb(null, ValidationError('All usernames containing vowels have been taken.'))
      }
      cb()
    }, 1000 + (1000 * Math.random()))
  }
})

render(<FormRenderer form={AsyncSignupForm} submitButton="Sign Up"/>, document.body)
