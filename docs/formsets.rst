========
Formsets
========

For a guide to formsets, please refer to the Django documentation:

   * `Django documentation -- Formsets <https://docs.djangoproject.com/en/dev/topics/forms/formsets/>`_

Selected portions of the Django documentation are duplicated below with
JavaScript equivalents of example code.

----

.. Note::

   The FormSet API is built around its original server-side usage in Django.
   Its methods of tracking how many forms there are, adding and removing forms,
   ordering and deletion are designed with the expectation of round-tripping
   with HTTP requests.

   Future releases will deal with making FormSets a better fit for client-side
   capabilities.

A formset is a layer of abstraction to work with multiple forms on the same
page. It can be best compared to a data grid. Let’s say you have the following
form::

   var ArticleForm = forms.Form.extend({
     title: forms.CharField()
   , pubDate: forms.DateField()
   })

You might want to allow the user to create several articles at once. To create
a formset out of an ``ArticleForm`` you would do::

   var ArticleFormSet = forms.formsetFactory(ArticleForm)

You now have created a formset named ``ArticleFormSet``. The formset gives you
the ability to iterate over the forms in the formset and display them as you
would with a regular form::

   var formset = new ArticleFormSet()
   formset.forms().forEach(function(form) {
     print(reactHTML(form.asTable()))
   })
   /* =>
   <tr><th><label for="id_form-0-title">Title:</label></th><td><input type="text" name="form-0-title" id="id_form-0-title"></td></tr>
   <tr><th><label for="id_form-0-pubDate">Pub date:</label></th><td><input type="text" name="form-0-pubDate" id="id_form-0-pubDate"></td></tr>
   */

As you can see it only displayed one empty form. The number of empty forms
that is displayed is controlled by the ``extra`` parameter. By default,
:js:func:`formsetFactory` defines one extra form; the following example will
display two blank forms::

   var ArticleFormSet = forms.formsetFactory(ArticleForm, {extra: 2})

Using initial data with a formset
=================================

Initial data is what drives the main usability of a formset. As shown above
you can define the number of extra forms. What this means is that you are
telling the formset how many additional forms to show in addition to the
number of forms it generates from the initial data. Let's take a look at an
example::

   var ArticleFormSet = forms.formsetFactory(ArticleForm, {extra: 2})
   var formset = new ArticleFormSet({initial: [
     {title: "Django's docs are open source!", pubDate: new Date()}
   ]})
   formset.forms().forEach(function(form) {
     print(reactHTML(form.asTable()))
   })
   /* =>
   <tr><th><label for="id_form-0-title">Title:</label></th><td><input type="text" name="form-0-title" id="id_form-0-title" value="Django's docs are open source!"></td></tr>
   <tr><th><label for="id_form-0-pubDate">Pub date:</label></th><td><input type="text" name="form-0-pubDate" id="id_form-0-pubDate" value="2014-02-28"></td></tr>
   <tr><th><label for="id_form-1-title">Title:</label></th><td><input type="text" name="form-1-title" id="id_form-1-title"></td></tr>
   <tr><th><label for="id_form-1-pubDate">Pub date:</label></th><td><input type="text" name="form-1-pubDate" id="id_form-1-pubDate"></td></tr>
   <tr><th><label for="id_form-2-title">Title:</label></th><td><input type="text" name="form-2-title" id="id_form-2-title"></td></tr>
   <tr><th><label for="id_form-2-pubDate">Pub date:</label></th><td><input type="text" name="form-2-pubDate" id="id_form-2-pubDate"></td></tr>"
   */

There are now a total of three forms showing above. One for the initial data
that was passed in and two extra forms. Also note that we are passing in a
list of objects as the initial data.

Limiting the maximum number of forms
====================================

The ``maxNum`` parameter to :js:func:`formsetFactory` gives you the ability to
limit the maximum number of empty forms the formset will display::

   var ArticleFormSet = forms.formsetFactory(ArticleForm, {extra: 2, maxNum: 1})
   var formset = new ArticleFormSet()
   formset.forms().forEach(function(form) {
     print(reactHTML(form.asTable()))
   })
   /* =>
   <tr><th><label for="id_form-0-title">Title:</label></th><td><input type="text" name="form-0-title" id="id_form-0-title"></td></tr>
   <tr><th><label for="id_form-0-pubDate">Pub date:</label></th><td><input type="text" name="form-0-pubDate" id="id_form-0-pubDate"></td></tr>
   */

Formset validation
==================

Validation with a formset is almost identical to a regular ``Form``. There's an
``isValid()`` method on the formset to provide a convenient way to validate
all forms in the formset::

   var ArticleFormSet = forms.formsetFactory(ArticleForm)
   var data = {
     'form-TOTAL_FORMS': '1'
   , 'form-INITIAL_FORMS': '0'
   , 'form-MAX_NUM_FORMS': ''
   }
   var formset = new ArticleFormSet({data: data})
   print(formset.isValid()
   // => true

If we provide an invalid article::

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
   print(formset.isValid())
   // => false
   print(formset.errors().map(function(e) { return e.toJSON() }))
   // => [{}, {pubDate: [{message: 'This field is required.', code: 'required'}]}]

To check how many errors there are in the formset, we can use the
``totalErrorCount()`` method::

   formset.totalErrorCount()
   // => 1

We can also check if form data differs from the initial data (i.e. the form was
sent without any data)::

   var data = {
     'form-TOTAL_FORMS': '1'
   , 'form-INITIAL_FORMS': '0'
   , 'form-MAX_NUM_FORMS': ''
   , 'form-0-title': ''
   , 'form-0-pubDate': ''
   }
   var formset = new ArticleFormSet({data: data})
   print(formset.hasChanged())
   // => false

Custom formset validation
-------------------------

A formset has a ``clean()`` method similar to the one on a ``Form`` class. This
is where you define your own validation that works at the formset level::

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
   print(formset.isValid())
   // => false
   print(formset.errors().map(function(e) { return e.toJSON() }))
   // => [{}, {}])
   print(formset.nonFormErrors().messages())
   // => ['Articles in a set must have distinct titles.']

API
===

.. js:class:: BaseFormSet([kwargs])

   A collection of instances of the same Form.

   :param Object kwargs: configuration options.

   .. js:attribute:: kwargs.data

      list of input form data for each form, where property names are field
      names. A formset with data is considered to be "bound" and ready for use
      validating and coercing the given data.

      :type: Array of Objects

   .. js:attribute:: kwargs.files

      list of input file data for each form.

      :type: Array of Objects

   .. js:attribute:: kwargs.autoId

      a template for use when automatically generating ``id`` attributes for
      fields, which should contain a ``{name}`` placeholder for the field name.
      Defaults to ``id_{name}``.

   .. js:attribute:: kwargs.prefix

      a prefix to be applied to the name of each field in each form instance.

   .. js:attribute:: kwargs.initial

      a list of initial form data objects, where property names are field names
      -- if a field's value is not specified in ``data``, these values will be
      used when rendering field widgets.

      :type: Array of Objects

   .. js:attribute:: kwargs.errorConstructor

      the constructor function to be used when creating error details - defaults
      to :js:class:`ErrorList`.

      :type: Function

   .. js:attribute:: kwargs.managementFormCssClass

      a CSS class to be applied when rendering
      :js:func:`BaseFormSet#managementForm`, as default rendering methods place
      its hidden fields in an additonal form row just for hidden fields, to
      ensure valid markup is generated.

   **Instance Properties**

   Formset options documented in ``kwargs`` above are set as instance properties.

   The following instance properties are also available:

   .. js:attribute:: formset.isBound

      Determines if this formset has been given input data which can be
      validated.

      ``true`` if the formset was instantiated with ``kwargs.data`` or
      ``kwargs.files``.

   **Prototype Functions**

   Prototype functions for retrieving forms and information about forms which
   will be displayed.

   .. js:function:: BaseFormSet#managementForm()

      Creates and returns the ManagementForm instance for this formset.

      A ManagementForm contains hidden fields which are used to keep track of
      how many form instances are displayed on the page.

   .. js:function:: BaseFormSet#totalFormCount()

      Determines the number of form instances this formset contains, based on
      either submitted management data or initial configuration, as appropriate.

   .. js:function:: BaseFormSet#initialFormCount()

      Determines the number of initial form instances this formset contains,
      based on either submitted management data or initial configuration, as
      appropriate.

   .. js:function:: BaseFormSet#forms()

      Returns a list of this formset's forms, instantiating them when first
      called.

   .. js:function:: BaseFormSet#initialForms()

      Returns a list of all the initial forms in this formset.

   .. js:function:: BaseFormSet#extraForms()

      Returns a list of all the extra forms in this formset.

   .. js:function:: BaseFormSet#emptyForm()

      Creates an empty version of one of this formset's forms which uses a
      placeholder ``'__prefix__'`` prefix -- this is intended for cloning on the
      client to add more forms when newforms is only being used on the server.

   Prototype functions for validating and getting information about the results
   of validation, and for retrieving forms based on submitted data,

   .. js:function:: BaseFormSet#cleanedData()

      Returns a list of :js:attr:`form.cleanedData` objects for every form in
      :js:func:`BaseFormSet#forms`.

   .. js:function:: BaseFormSet#deletedForms()

      Returns a list of forms that have been marked for deletion.

   .. js:function:: BaseFormSet#orderedForms()

      Returns a list of forms in the order specified by the incoming data.

      Throws an Error if ordering is not allowed.

   .. js:function:: BaseFormSet#nonFormErrors()

      Returns an :js:class:`ErrorList` of errors that aren't associated with a
      particular form -- i.e., from :js:func:`BaseFormSet#clean`.

      Returns an empty :js:class:`ErrorList` if there are none.

   .. js:function:: BaseFormSet#errors()

      Returns a list of form error for every form in the formset.

   .. js:function:: BaseFormSet#totalErrorCount()

      Returns the number of errors across all forms in the formset.

   .. js:function:: BaseFormSet#isValid()

      Returns ``true`` if every form in the formset is valid.

   .. js:function:: BaseFormSet#fullClean()

      Cleans all of this.data and populates formset error objects.

   .. js:function:: BaseFormSet#clean()

      Hook for doing any extra formset-wide cleaning after
      :js:func:`BaseForm.clean` has been called on every form.

      Any :js:class:`ValidationError` raised by this method will not be
      associated with a particular form; it will be accesible via
      :js:func:BaseFormSet#nonFormErrors

   .. js:function:: BaseFormSet#hasChanged()

      Returns ``true`` if any form differs from initial.

   A number of default rendering functions are provided to generate
   ``React.DOM`` representations of a FormSet's fields.

   These are general-purpose in that they attempt to handle all form rendering
   scenarios and edge cases, ensuring that valid markup is always produced.

   For flexibility, the output does not include a ``<form>`` or a submit
   button, just field labels and inputs.

   .. js:function:: BaseFormSet#render()

      Default rendering method, which calls :js:func:`BaseFormSet#asTable`

   .. js:function:: BaseFormSet#asTable()

      Renders the formset's forms as a series of ``<tr>`` tags, with ``<th>``
      and ``<td>`` tags containing field labels and inputs, respectively.

   .. js:function:: BaseFormSet#asUl()

      Renders the formset's forms as a series of ``<li>`` tags, with each
      ``<li>`` containing one field.

   .. js:function:: BaseFormSet#asDiv()

      Renders the formset's forms as a series of ``<div>`` tags, with each
      ``<div>`` containing one field.

   Prototype functions for use in rendering forms.

   .. js:function:: BaseFormSet#getDefaultPrefix()

      Returns the default base prefix for each form: ``'form'``.

   .. js:function:: BaseFormSet#addFields(form, index)

      A hook for adding extra fields on to a form instance.

      :param Form form: the form fields will be added to.
      :param Number index: the index of the given form in the formset.

   .. js:function:: BaseFormSet#addPrefix(index)

      Returns a formset prefix with the given form index appended.

      :param Number index: the index of a form in the formset.

   .. js:function:: BaseFormSet#isMultipart()

      Returns ``true`` if the formset needs to be multipart-encoded, i.e. it has
      a :js:class:`FileInput`. Otherwise, ``false``.

.. js:function:: formsetFactory(form, [kwargs])

   Returns a FormSet constructor for the given Form constructor.

   :param Function form: the constructor for the Form to be managed.
   :param Object kwargs:
      arguments defining options for the created FormSet constructor - all
      arguments other than those defined below will be added to the new formset
      constructor's ``prototype``, so this object can also be used to define new
      methods on the resulting formset, such as a custom ``clean`` method.

   .. js:attribute:: kwargs.formset (Function)

      the constructuer which will provide the prototype for the created FormSet
      constructor -- defaults to :js:class:`BaseFormSet`.

   .. js:attribute:: kwargs.extra

      the number of extra forms to be displayed -- defaults to ``1``.

   .. js:attribute:: kwargs.canOrder

      if ``true``, forms can be ordered -- defaults to ``false``.

   .. js:attribute:: kwargs.canDelete

      if ``true``, forms can be deleted -- defaults to ``false``.

   .. js:attribute:: kwargs.maxNum

      the maximum number of forms to be displayed -- defaults to
      :js:data:`DEFAULT_MAX_NUM`.

   .. js:attribute:: kwargs.validateMax

      if ``true``, validation will also check that the number of forms in the
      data set, minus those marked for deletion, is less than or equal to
      ``maxNum``.

   .. js:attribute:: kwargs.minNum

      the minimum number of forms to be displayed -- defaults to ``0``.

   .. js:attribute:: kwargs.validateMin

      if ``true``, validation will also check that the number of forms in the
      data set, minus those marked for deletion, is greater than or equal to
      ``minNum``.

.. js:data:: DEFAULT_MAX_NUM

   The default maximum number of forms in a formet is ``1000``, to protect
   against memory exhaustion.
