==============
BoundField API
==============

``BoundField``
==============

.. js:class:: BoundField(form, field, name)

   A helper for rendering a field.

   This is the primary means of generating components such as labels and input
   fields in the default form rendering methods.

   Its attributes and methods will be of particular use when implementing custom
   form layout and rndering.

   :param Form form:
      the form instance the field is a part of.

   :param Field field:
      the field to be rendered.

   :param String name:
      the name name associated with the field in the form.

   **Instance Attributes**

   .. js:attribute:: boundField.form

   .. js:attribute:: boundField.field

   .. js:attribute:: boundField.name

   .. js:attribute:: boundField.htmlName

      A version of the field's name including any prefix the form has been
      configured with.

      Assuming your forms are configured with prefixes when needed, this
      should be a unique identifier for any particular field (e.g. if you need
      something to pass as a ``key`` prop to a React component).

      :type: String

   .. js:attribute:: boundField.label

      The label the field is configured with, or a label automatically generated
      from the field's name.

      :type: String

   .. js:attribute:: boundField.helpText

      Help text the field is configured with, otherwise an empty string.

      :type: String

   **Prototype Functions**

   **Status**: methods for determining the field's status.

   .. js:function:: BoundField#status()

      Returns a string representing the field's curent status.

      Statuses are determined by checking the following conditions in order:

      * ``'pending'`` -- the field has a pending async validation.
      * ``'error'`` -- the field has a validation error.
      * ``'valid'`` -- the field has a value in form.cleanedData.
      * ``'default'`` -- the field meets none of the above criteria, i.e. it
        hasn't been interacted with yet, or the whole form hasn't been validated
        yet.

   .. js:function:: BoundField#isCleaned()

      :returns:
         ``true`` if the field has some data in its form's ``cleanedData``.

   .. js:function:: BoundField#isEmpty()

      :returns:
         ``true`` true if the value which will be displayed in the field's
         widget is empty.

   .. js:function:: BoundField#isPending()

      :returns:
         ``true`` if the field has a pending asynchronous validation.

   .. js:function:: BoundField#isHidden()

      :returns: ``true`` if the field is configured with a hidden widget.

   **Field data**: methods for accessing data related to the field.

   .. js:function:: BoundField#autoId()

      Calculates and returns the ``id`` attribute for this BoundField if the
      associated form has an ``autoId`` set, or set to ``true``. Returns an
      empty string otherwise.

   .. js:function:: BoundField#data()

      :returns: Raw input data for the field or ``null`` if it wasn't given.

   .. js:function:: BoundField#errors()

      :returns:
         validation errors for the field - if there were none, an empty error
         list object will be returned.

      :type:
         :js:class:`ErrorList` (by default, but configurable via
         :js:class:`Form` ``kwargs.errorConstructor``)

   .. js:function:: BoundField#errorMessage()

      Convenience method for getting the first error message for the field, as
      a single error message is the most common error scenario for a field.

      :returns:
         the first validation error message for the field - if there were none,
         returns ``undefined``.

   .. js:function:: BoundField#errorMessages()

      :returns:
         all validation error messages for the field - if there were none,
         returns an empty list.

   .. js:function:: BoundField#idForLabel()

      Wrapper around the field widget's :js:func:`Widget#idForLabel`. Useful,
      for example, for focusing on this field regardless of whether it has a
      single widget or a :js:class:`MutiWidget`.

   .. js:function:: BoundField#initialValue()

      Returns the initial value for the field, will be null if none was
      configured on the field or given to the form.

   .. js:function:: BoundField#value()

      Returns the value to be displayed in the field's widget.

   **Rendering:**: methods for, and related to, rendering a widget for the field.

   .. js:function:: BoundField#asWidget([kwargs])

      Renders a widget for the field.

      :param Object kwargs: widget options, which are as follows:

      :param Widget kwargs.widget:
         an override for the widget used to render the field - if not
         provided, the field's configured widget will be used.

      :param Object kwargs.attrs:
         additional HTML attributes to be added to the field's widget.

   .. js:function:: BoundField#asHidden([kwargs])

      Renders the field as a hidden field.

      :param Object kwargs: widget options, which are as follows

      :param Object kwargs.attrs:
         additional HTML attributes to be added to the field's widget.

   .. js:function:: BoundField#asText([kwargs])

      Renders the field as a text input.

      :param Object kwargs: widget options, which are as follows:

      :param Object kwargs.attrs:
         additional HTML attributes to be added to the field's widget.

   .. js:function:: BoundField#asTextarea([kwargs])

      Renders the field as a textarea.

      :param Object kwargs: widget options, which are as follows:

      :param Object kwargs.attrs:
         additional HTML attributes to be added to the field's widget.

   .. js:function:: BoundField#cssClasses([extraClasses])

      Returns a string of space-separated CSS classes to be applied to the
      field.

      :param String extraClasses:
         additional CSS classes to be applied to the field

   .. js:function:: BoundField#helpTextTag([kwargs])

      Renders a tag containing help text for the field.

      :param Object kwargs: help text tag options, which are as follows:

      :param String kwargs.tagName:
         allows overriding the type of tag -- defaults to ``'span'``.

      :param String|Object kwargs.contents:
         help text contents -- if not provided, contents will be taken from the
         field itself.

         To render raw HTML in help text, it should be specified using the
         `React convention for raw HTML <http://facebook.github.io/react/docs/jsx-gotchas.html#html-entities>`_,
         which is to provide an object with a ``__html`` property:

         .. code-block:: javascript

            {__html: 'But <strong>be careful</strong>!'}

      :param Object kwargs.attrs:
         additional attributes to be added to the tag -- by default it will get a
         ``className`` of ``'helpText'``.

   .. js:function:: BoundField#labelTag([kwargs])

      Creates a ``<label>`` for the field if it has an ``id`` attribute,
      otherwise generates a text label.

      :param Object kwargs: label options, which are as follows:

      :param String kwargs.contents:
         custom contents for the label -- if not provided, label contents will
         be generated from the field itself.

      :param Object kwargs.attrs:
         additional HTML attributes to be added to the label tag.

      :param String kwargs.labelSuffix:
         a custom suffix for the label.

   .. js:function:: BoundField#render([kwargs])

      Default rendering method - if the field has ``showHiddenInitial`` set,
      renders the default widget and a hidden version, otherwise just renders
      the default widget for the field.

      :param Object kwargs: widget options as per :js:func:`BoundField#asWidget`.

   .. js:function:: BoundField#subWidgets()

      :returns:
         a list of :js:class:`SubWidget` objects that comprise all widgets in
         this BoundField. This really is only useful for :js:class:`RadioSelect`
         and :js:class:`CheckboxSelectMultiple` widgets, so that you can iterate
         over individual inputs when rendering.
