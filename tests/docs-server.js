void function() {

var _browser

QUnit.module("docs (server)", {
  setup: function() {
    _browser = forms.env.browser
    forms.env.browser = false
  }
, teardown: function() {
    forms.env.browser =_browser
  }
})

var ArticleForm = forms.Form.extend({
  title: forms.CharField()
, pubDate: forms.DateField()
})

QUnit.test('Formsets - validation', function() {
  var ArticleFormSet = forms.formsetFactory(ArticleForm)
  var data = {
    'form-TOTAL_FORMS': '1'
  , 'form-INITIAL_FORMS': '0'
  , 'form-MAX_NUM_FORMS': ''
  }
  var formset = new ArticleFormSet({data: data})
  strictEqual(formset.isValid(), true)

  var data = {
    'form-TOTAL_FORMS': '2'
  , 'form-INITIAL_FORMS': '0'
  , 'form-MAX_NUM_FORMS': ''
  , 'form-0-title': 'Test'
  , 'form-0-pubDate': '1904-06-16'
  , 'form-1-title': 'Test'
  , 'form-1-pubDate': '' // <-- this date is missing but required
  }
  var formset = new ArticleFormSet({data: data})
  strictEqual(formset.isValid(), false)
  deepEqual(formset.errors().map(function(e) { return e.toJSON() }), [
    {}
  , {pubDate: [{code: 'required', message: 'This field is required.'}]}
  ])
  strictEqual(formset.totalErrorCount(), 1)

  var data = {
    'form-TOTAL_FORMS': '1'
  , 'form-INITIAL_FORMS': '0'
  , 'form-MAX_NUM_FORMS': ''
  , 'form-0-title': ''
  , 'form-0-pubDate': ''
  }
  var formset = new ArticleFormSet({data: data})
  strictEqual(formset.hasChanged(), false)

  var BaseArticleFormSet = forms.BaseFormSet.extend({
    /** Checks that no two articles have the same title. */
    clean: function() {
      if (this.totalErrorCount() !== 0) {
        // Don't bother validating the formset unless each form is valid on its own
        return
      }
      var titles = {}
      this.forms().forEach(function(form) {
        var title = form.cleanedData.title
        if (title in titles) {
          throw forms.ValidationError('Articles in a set must have distinct titles.')
        }
        titles[title] = true
      })
    }
  })
  var ArticleFormSet = forms.formsetFactory(ArticleForm, {formset: BaseArticleFormSet})
  var data = {
    'form-TOTAL_FORMS': '2'
  , 'form-INITIAL_FORMS': '0'
  , 'form-MAX_NUM_FORMS': ''
  , 'form-0-title': 'Test'
  , 'form-0-pubDate': '1904-06-16'
  , 'form-1-title': 'Test'
  , 'form-1-pubDate': '1912-06-23'
  }
  var formset = new ArticleFormSet({data: data})
  strictEqual(formset.isValid(), false)
  deepEqual(formset.errors().map(function(e) { return e.toJSON() }), [{}, {}])
  deepEqual(formset.nonFormErrors().messages(), ['Articles in a set must have distinct titles.'])
})

}()