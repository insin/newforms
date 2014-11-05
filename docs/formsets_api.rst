============
Formsets API
============

``BaseFormSet``
===============

.. js:class:: BaseFormSet([kwargs])

   A collection of instances of the same Form.

   :param Object kwargs: configuration options.

   :param Array.<Object> kwargs.data:
      list of input form data for each form, where property names are field
      names. A formset with data is considered to be "bound" and ready for use
      validating and coercing the given data.

   :param Array.<Object> kwargs.files:
      list of input file data for each form.

   :param String kwargs.autoId:
      a template for use when automatically generating ``id`` attributes for
      fields, which should contain a ``{name}`` placeholder for the field name.
      Defaults to ``id_{name}``.

   :param String kwargs.prefix:
      a prefix to be applied to the name of each field in each form instance.

   :param Array.<Object> kwargs.initial:
      a list of initial form data objects, where property names are field names
      -- if a field's value is not specified in ``data``, these values will be
      used when rendering field widgets.

   :param Function kwargs.errorConstructor:
      the constructor function to be used when creating error details - defaults
      to :js:class:`ErrorList`.

   :param String kwargs.managementFormCssClass:
      a CSS class to be applied when rendering
      :js:func:`BaseFormSet#managementForm`, as default rendering methods place
      its hidden fields in an additonal form row just for hidden fields, to
      ensure valid markup is generated.

   **Instance Properties**

   Formset options documented in ``kwargs`` above are set as instance properties.

   The following instance properties are also available:

   .. js:attribute:: formset.isInitialRender

      Determines if this formset has been given input data which can be
      validated, or if it will display as blank or with configured initial
      values the first time it's redered.

      ``false`` if the formset was instantiated with ``kwargs.data`` or
      ``kwargs.files``, ``true`` otherwise.

   **Prototype Functions**

   Prototype functions for retrieving forms and information about forms which
   will be displayed.

   .. js:function:: BaseFormSet#managementForm()

      Creates and returns the ManagementForm instance for this formset.

      A ManagementForm contains hidden fields which are used to keep track of
      how many form instances are displayed on the page.

      Browser-specific
         On the browser, ManagementForms will only ever contain ``initial`` data
         reflecting the formset's own configuration properties.

   .. js:function:: BaseFormSet#totalFormCount()

      Determines the number of form instances this formset contains, based on
      either submitted management data or initial configuration, as appropriate.

      Browser-specific
         On the browser, only the formset's own form count configuration will be
         consulted.

   .. js:function:: BaseFormSet#initialFormCount()

      Determines the number of initial form instances this formset contains,
      based on either submitted management data or initial configuration, as
      appropriate.

      Browser-specific
         On the browser, only the formset's own form count configuration will be
         consulted.

   .. js:function:: BaseFormSet#forms()

      Returns a list of this formset's form instances.

   .. js:function:: BaseFormSet#addAnother()

      Increments ``formset.extra`` and adds another form to the formset.

   .. js:function:: BaseFormSet#initialForms()

      Returns a list of all the initial forms in this formset.

   .. js:function:: BaseFormSet#extraForms()

      Returns a list of all the extra forms in this formset.

   .. js:function:: BaseFormSet#emptyForm()

      Creates an empty version of one of this formset's forms which uses a
      placeholder ``'__prefix__'`` prefix -- this is intended for cloning on the
      client to add more forms when newforms is only being used on the server.

   Prototype functions for validating and getting information about the results
   of validation, and for retrieving forms based on submitted data:

   .. js:function:: BaseFormSet#setData(data)

      Updates the formset's :js:attr:`formset.data` (and
      :js:attr:`formset.isInitialRender`, if necessary) and triggers form
      cleaning and validation, returning the result of ``formset.isValid()``.

      :param Object data: new input data for the formset.

      :return:
         ``true`` if the formset has no errors after validating the updated
         data, ``false`` otherwise.

      .. versionadded:: 0.5

   .. js:function:: BaseFormSet#setFormData(formData)

      Alias for :js:func:`BaseFormSet#setData`, to keep the FormSet API
      consistent with the Form API.

       .. versionadded:: 0.6

   .. js:function:: BaseFormSet#cleanedData()

      Returns a list of :js:attr:`form.cleanedData` objects for every form in
      :js:func:`BaseFormSet#forms`.

   .. js:function:: BaseFormSet#deletedForms()

      Returns a list of forms that have been marked for deletion.

   .. js:function:: BaseFormSet#orderedForms()

      Returns a list of forms in the order specified by the incoming data.

      Throws an Error if ordering is not allowed.

   .. js:function:: BaseFormSet#addError(errpr)

      Adds an error that isn't associated with a particular form.

      The ``error`` argument can be a simple string, or an instance
      of :js:class:`ValidationError`.

   .. js:function:: BaseFormSet#nonFormErrors()

      Returns an :js:class:`ErrorList` of errors that aren't associated with a
      particular form -- i.e., from :js:func:`BaseFormSet#clean` or externally
      via :js:func:`BaseFormSet#addError`.

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
   ``ReactElement`` representations of a FormSet's fields.

   These are general-purpose in that they attempt to handle all form rendering
   scenarios and edge cases, ensuring that valid markup is always produced.

   For flexibility, the output does not include a ``<form>`` or a submit
   button, just field labels and inputs.

   .. js:function:: BaseFormSet#render()

      Default rendering method, which calls :js:func:`BaseFormSet#asTable`

      .. versionadded:: 0.5

   .. js:function:: BaseFormSet#asTable()

      Renders the formset's forms as a series of ``<tr>`` tags, with ``<th>``
      and ``<td>`` tags containing field labels and inputs, respectively.

   .. js:function:: BaseFormSet#asUl()

      Renders the formset's forms as a series of ``<li>`` tags, with each
      ``<li>`` containing one field.

   .. js:function:: BaseFormSet#asDiv()

      Renders the formset's forms as a series of ``<div>`` tags, with each
      ``<div>`` containing one field.

      .. versionadded:: 0.5

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

``formsetFactory``
==================

.. js:function:: formsetFactory(form, [kwargs])

   Returns a FormSet constructor for the given Form constructor.

   :param Function form: the constructor for the Form to be managed.
   :param Object kwargs:
      arguments defining options for the created FormSet constructor - all
      arguments other than those defined below will be added to the new formset
      constructor's ``prototype``, so this object can also be used to define new
      methods on the resulting formset, such as a custom ``clean`` method.

   :param Function kwargs.formset:
      the constructuer which will provide the prototype for the created FormSet
      constructor -- defaults to :js:class:`BaseFormSet`.

   :param Number kwargs.extra:
      the number of extra forms to be displayed -- defaults to ``1``.

   :param Boolean kwargs.canOrder:
      if ``true``, forms can be ordered -- defaults to ``false``.

   :param Boolean kwargs.canDelete:
      if ``true``, forms can be deleted -- defaults to ``false``.

   :param Number kwargs.maxNum:
      the maximum number of forms to be displayed -- defaults to
      :js:data:`DEFAULT_MAX_NUM`.

   :param Boolean kwargs.validateMax:
      if ``true``, validation will also check that the number of forms in the
      data set, minus those marked for deletion, is less than or equal to
      ``maxNum``.

   :param Number kwargs.minNum:
      the minimum number of forms to be displayed -- defaults to ``0``.

   :param Boolean kwargs.validateMin:
      if ``true``, validation will also check that the number of forms in the
      data set, minus those marked for deletion, is greater than or equal to
      ``minNum``.

.. js:data:: DEFAULT_MAX_NUM

   The default maximum number of forms in a formet is ``1000``, to protect
   against memory exhaustion.
