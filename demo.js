var express = require('express'),
    jade = require('jade'),
    forms = require('newforms');

var app = express.createServer(
  express.logger(),
  express.bodyParser()
);

function renderToResponse(res, template, context) {
  jade.renderFile(template, {locals: context},
    function(err, html) {
      if (err != null) {
        console.error(err);
      }
      res.send(html);
    }
  )
}

var TestForm = forms.Form({
  username: new forms.CharField(),
  password: new forms.CharField({widget: forms.PasswordInput}),

  clean: function() {
    if (this.cleanedData.username && this.cleanedData.password &&
        (this.cleanedData.username != 'admin' ||
         this.cleanedData.password != 'secret')) {
      throw new forms.ValidationError('Invalid credentials!');
    }
    return this.cleanedData;
  }
});

app.get('/', function(req, res) {
  renderToResponse(res, 'demo.jade', {
    form: new TestForm(),
    msg: 'Log In'
  });
});

app.post('/', function(req, res) {
  var form = new TestForm({data: req.body});
  var msg = form.isValid() ? 'Welcome back!' : 'Log In';
  renderToResponse(res, 'demo.jade', {
    form: form,
    msg: msg
  });
});

app.listen(3000);
console.log('newforms demo running on http://127.0.0.1:3000');
