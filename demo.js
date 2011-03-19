var express = require('express'),
    jade = require('jade'),
    forms;

try {
  forms = require('./newforms');
}
catch (e) {
  try {
    // Fall back to installed package
    forms = require('newforms');
  }
  catch (e) {
    console.error('newforms not found - run `python build/build.py` or `npm install newforms`');
    process.exit(1);
  }
}

var app = express.createServer(
  express.bodyParser()
);

function renderToResponse(response, template, context) {
  jade.renderFile(template, {locals: context}, function(error, html) {
    if (error != null) {
      console.error(error);
    }
    response.send(html);
  });
}

var TestForm = forms.Form({
  username: forms.CharField(),
  password: forms.CharField({widget: forms.PasswordInput}),

  clean: function() {
    if (this.cleanedData.username && this.cleanedData.password &&
        (this.cleanedData.username != 'admin' ||
         this.cleanedData.password != 'secret')) {
      throw forms.ValidationError('Invalid credentials!');
    }
    return this.cleanedData;
  }
});

app.all('/', function(request, response) {
  var form, msg = 'Log In';
  if (request.method == 'POST') {
    form = TestForm({data: request.body});
    if (form.isValid()) {
      msg = 'Welcome back'
    }
  } else {
    form = TestForm();
  }
  renderToResponse(response, 'demo.jade', {
    form: form,
    msg: msg
  });
});

app.listen(3000);
console.log('newforms demo running on http://127.0.0.1:3000');
