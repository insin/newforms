void function() {

'use strict';

var SignupForm = forms.Form.extend({
  errorCssClass: 'example-error',
  requiredCssClass: 'example-required',
  validCssClass: 'example-valid',

  email: forms.EmailField(),
  password: forms.CharField({widget: forms.PasswordInput}),
  confirm: forms.CharField({label: 'Confirm password', widget: forms.PasswordInput}),
  terms: forms.BooleanField({
    label: 'I have read and agree to the Terms and Conditions'
  , errorMessages: {required: 'You must accept the terms to continue'}
  }),

  clean: ['password', 'confirm', function() {
    if (this.cleanedData.password && this.cleanedData.confirm &&
        this.cleanedData.password != this.cleanedData.confirm) {
      this.addError('confirm', 'Does not match the entered password.')
    }
  }]
})

React.render(<FormRenderer form={SignupForm} submitButton="Sign Up"/>, document.body, resizeIFrame)

}()