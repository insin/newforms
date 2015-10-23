'use strict';

var React = require('react')
var forms = require('newforms')
var {render} = require('react-dom')

var FormRenderer = require('../FormRenderer')

var PersonForm = forms.Form.extend({
  firstName: forms.CharField({required: false, maxLength: 50}),
  lastName: forms.CharField({required: false, maxLength: 50}),
  jobTitle: forms.CharField({required: false, maxLength: 100}),
  organisation : forms.CharField({required: false}),

  clean: ['firstName', 'lastName', function() {
     if (!this.cleanedData.firstName && !this.cleanedData.lastName) {
       throw forms.ValidationError('A first name or last name is required.')
     }
  }]
})

render(<FormRenderer form={PersonForm}/>, document.body)
