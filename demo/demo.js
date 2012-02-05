var express = require('express')
  , jade = require('jade')

var forms = require('../lib/newforms')

var app = express.createServer()

app.configure(function() {
  app.set('view engine', 'jade');
  app.set('views', __dirname)
  app.set('view options', {
    layout: false
  })
  app.use(express.bodyParser())
})

var TestForm = forms.Form.extend({
  username: forms.CharField()
, password: forms.CharField({widget: forms.PasswordInput})

, clean: function() {
    if (this.cleanedData.username && this.cleanedData.password &&
        (this.cleanedData.username != 'admin' ||
         this.cleanedData.password != 'secret')) {
      throw forms.ValidationError('Invalid credentials!')
    }
    return this.cleanedData
  }
})

app.all('/', function(req, res) {
  var form, msg = 'Log In'
  if (req.method == 'POST') {
    form = new TestForm({data: req.body})
    if (form.isValid()) {
      msg = 'Welcome back'
    }
  }
  else {
    form = new TestForm()
  }
  res.render('demo.jade', {
    form: form
  , msg: msg
  })
})

app.listen(3000)
console.log('Newforms Demo running on http://127.0.0.1:3000')
