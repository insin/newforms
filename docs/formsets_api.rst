============
Formsets API
============

``FormSet``
===============

.. js:class:: FormSet([kwargs])

   A collection of instances of the same Form.

   :param Object kwargs: configuration options.

   **FormSet options**

   .. versionadded:: 0.11
      FormSet options and defaulting from the prototype replace the use of
      ``formsetFactory``, which was removed in version 0.12.

   The following options configure the FormSet itself.

   Default values can be pre-configured by extending the FormSet with
   ``FormSet.extend()`` to set them as prototype props.

   Alternatively the base ``FormSet`` can be used directly, passing all FormSet
   and Form arguments at the same time.

   :param Function form: the constructor for the Form to be managed.

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

   **Form options**

   The following options are used when constructing forms for the formset.

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

   :param Function kwargs.onChange:
      A callback to indicate to the a React component that the formset has
      changed, e.g. when another form is added to the formset.

      This will be passed as the :ref:`Form constructor's onChange argument
      <ref-form-kwargs-onchange>` when creating the formset's forms.

      .. versionadded:: 0.9
         Replaces ``kwargs.onStateChange``

   :param Array.<Object> kwargs.initial:
      a list of initial form data objects, where property names are field names
      -- if a field's value is not specified in ``data``, these values will be
      used when rendering field widgets.

   :param Function kwargs.errorConstructor:
      the constructor function to be used when creating error details - defaults
      to :js:class:`ErrorList`.

   :param Function kwargs.validation:
     A value to be passed as the :ref:`Form constructor's validation argument
     <ref-form-kwargs-validation>` when creating the formset's forms -- defaults
     to ``null``.

     .. versionadded:: 0.6

   :param String kwargs.managementFormCssClass:
      a CSS class to be applied when rendering
      :js:func:`FormSet#managementForm`, as default rendering methods place
      its hidden fields in an additonal form row just for hidden fields, to
      ensure valid markup is generated.

   .. js:function:: FormSet.extend(prototypeProps[, constructorProps])

      Creates a new constructor which inherits from FormSet.

      :param Object prototypeProps:
         Default FormSet options and other prototype properties for the new
         formset, such as a custom clean method.

      :param Object constructorProps:
         properties to be set directly on the new constructor function.

   **Prototype Properties**

   .. js:attribute:: FormSet#prefixFormat

      This string defines the format used to generate a ``prefix`` for forms in
      the formset to ensure they have unique ``name`` attributes. It must
      contain ``{prefix}`` and ``{index}`` placeholders.

      The default format is ``'{prefix}-{index}'``.

      :type String:

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

   .. js:function:: FormSet#managementForm()

      Creates and returns the ManagementForm instance for this formset.

      A ManagementForm contains hidden fields which are used to keep track of
      how many form instances are displayed on the page.

      Browser-specific
         On the browser, ManagementForms will only ever contain ``initial`` data
         reflecting the formset's own configuration properties.

   .. js:function:: FormSet#totalFormCount()

      Determines the number of form instances this formset contains, based on
      either submitted management data or initial configuration, as appropriate.

      Browser-specific
         On the browser, only the formset's own form count configuration will be
         consulted.

   .. js:function:: FormSet#initialFormCount()

      Determines the number of initial form instances this formset contains,
      based on either submitted management data or initial configuration, as
      appropriate.

      Browser-specific
         On the browser, only the formset's own form count configuration will be
         consulted.

   .. js:function:: FormSet#forms()

      Returns a list of this formset's form instances.

   .. js:function:: FormSet#addAnother()

      Increments ``formset.extra`` and adds another form to the formset.

   .. js:function:: FormSet#removeForm(index)

      Decrements ``formset.extra`` and removes the form at the specified index
      from the formset.

      You must ensure the UI never lets the user remove anything but extra
      forms.

      .. versionadded:: 0.9

   .. js:function:: FormSet#initialForms()

      Returns a list of all the initial forms in this formset.

   .. js:function:: FormSet#extraForms()

      Returns a list of all the extra forms in this formset.

   .. js:function:: FormSet#emptyForm()

      Creates an empty version of one of this formset's forms which uses a
      placeholder ``'__prefix__'`` prefix -- this is intended for cloning on the
      client to add more forms when newforms is only being used on the server.

   Prototype functions for validating and getting information about the results
   of validation, and for retrieving forms based on submitted data:

   .. js:function:: FormSet#validate([form[, callback(err, isValid, cleanedData)]])

      Forces the formset to revalidate from scratch. If a ``<form>`` is given,
      data from it will be set on the formset's forms. Otherwise, validation
      will be done with each form's current input data.

      :param form:
        a ``<form>`` DOM node -- if React's representation of the ``<form>``
        is given, its ``getDOMNode()`` function will be called to get the real
        DOM node.

      :param function(Error, Boolean, Object) callback:
         Callback for asynchronous validation.

         This argument is required if the formdet or its form uses asynchronous
         validation - an Error will be thrown if it's not given in this case.

         The callback should be an errback with the signature
         ``(err, isValid, cleanedData)``.

      :return:
         ``true`` if the formset's forms' data is valid, ``false`` otherwise.

      .. versionadded:: 0.9

      .. versionchanged:: 0.10
         Added callback argument for async validation.

   .. js:function:: FormSet#setData(data)

      Updates the formset's :js:attr:`formset.data` (and
      :js:attr:`formset.isInitialRender`, if necessary) and triggers form
      cleaning and validation, returning the result of ``formset.isValid()``.

      :param Object data: new input data for the formset.

      :return:
         ``true`` if the formset has no errors after validating the updated
         data, ``false`` otherwise.

      .. versionadded:: 0.5

   .. js:function:: FormSet#setFormData(formData)

      Alias for :js:func:`FormSet#setData`, to keep the FormSet API
      consistent with the Form API.

      .. versionadded:: 0.6

   .. js:function:: FormSet#cleanedData()

      Returns a list of :js:attr:`form.cleanedData` objects for every form in
      :js:func:`FormSet#forms`.

      .. versionchanged:: 0.9
         No longer returns cleaned data for extra forms which haven't been
         modified.

      .. versionchanged:: 0.10
         No longer includes cleaned data from incomplete extra forms.

   .. js:function:: FormSet#deletedForms()

      Returns a list of forms that have been marked for deletion.

   .. js:function:: FormSet#orderedForms()

      Returns a list of forms in the order specified by the incoming data.

      Throws an Error if ordering is not allowed.

   .. js:function:: FormSet#addError(errpr)

      Adds an error that isn't associated with a particular form.

      The ``error`` argument can be a simple string, or an instance
      of :js:class:`ValidationError`.

      .. versionadded:: 0.9

   .. js:function:: FormSet#nonFormErrors()

      Returns an :js:class:`ErrorList` of errors that aren't associated with a
      particular form -- i.e., from :js:func:`FormSet#clean` or externally
      via :js:func:`FormSet#addError`.

      Returns an empty :js:class:`ErrorList` if there are none.

   .. js:function:: FormSet#errors()

      Returns a list of form error for every form in the formset.

   .. js:function:: FormSet#totalErrorCount()

      Returns the number of errors across all forms in the formset.

   .. js:function:: FormSet#isValid()

      Returns ``true`` if every form in the formset is valid.

   .. js:function:: FormSet#fullClean()

      Cleans all of this.data and populates formset error objects.

   .. js:function:: FormSet#clean()

      Hook for doing any extra formset-wide cleaning after
      :js:func:`Form.clean` has been called on every form.

      Any :js:class:`ValidationError` raised by this method will not be
      associated with a particular form; it will be accesible via
      :js:func:FormSet#nonFormErrors

   .. js:function:: FormSet#hasChanged()

      Returns ``true`` if any form differs from initial.

   Prototype functions for use in rendering forms.

   .. js:function:: FormSet#getDefaultPrefix()

      Returns the default base prefix for each form: ``'form'``.

   .. js:function:: FormSet#addFields(form, index)

      A hook for adding extra fields on to a form instance.

      :param Form form: the form fields will be added to.
      :param Number index: the index of the given form in the formset.

   .. js:function:: FormSet#addPrefix(index)

      Returns a formset prefix with the given form index appended.

      :param Number index: the index of a form in the formset.

   .. js:function:: FormSet#isMultipart()

      Returns ``true`` if the formset needs to be multipart-encoded, i.e. it has
      a :js:class:`FileInput`. Otherwise, ``false``.

.. js:data:: DEFAULT_MAX_NUM

   The default maximum number of forms in a formet is ``1000``, to protect
   against memory exhaustion.
