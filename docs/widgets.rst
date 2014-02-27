=======
Widgets
=======

For a guide to widgets, please refer to the Django documentation:

   * `Django documentation -- Widgets <https://docs.djangoproject.com/en/dev/ref/forms/widgets/>`_

API
===

.. js:class:: Widget([kwargs])

   An HTML form widget.

   A widget handles the rendering of HTML, and the extraction of data from an
   object that corresponds to the widget.

   :param Object kwargs: widget options.

   .. js:attribute:: kwargs.attrs

      HTML attributes for the rendered widget.

      :type: Object

   **Instance Properties**

   .. js:attribute:: widget.attrs

      Base HTML attributes for the rendered widget.

   **Prototype Properties**

   .. js:attribute:: Widget#isHidden

      Determines whether this corresponds to an ``<input type="hidden">``.

      :type: Boolean

   .. js:attribute:: Widget#needsMultipartForm

      Determines whether this widget needs a multipart-encoded form.

      :type: Boolean

   .. js:attribute:: Widget#isRequired

      Determines whether this widget is for a required field.

      :type: Boolean

   **Prototype Functions**

   .. js:function:: Widget#subWidgets(name, value[, kwargs])

      Yields all "subwidgets" of this widget. Used by:

      * :js:class:`RadioSelect` to allow access to individual radio inputs.
      * :js:class:`CheckboxSelectMultiple` to allow access to individual
        checkbox inputs.

      Arguments are the same as for :js:func:`Widget#render`.

   .. js:function:: Widget#render(name, value[, kwargs])

      Returns a rendered representation of this Widget as a ``React.DOM``
      component.

      The default implementation throws an ``Error`` -- subclasses must provide
      an implementation.

      The ``value`` given is not guaranteed to be valid input, so subclass
      implementations should program defensively.

   .. js:function:: Widget#buildAttrs(extraAttrs[, kwargs])

      Helper function for building an HTML attributes object.

   .. js:function:: Widget#valueFromData(data, files, name)

      Retrieves a value for this widget from the given form data.

      :returns: a value for this widget, or ``null`` if no value was provided.

   .. js:function:: Widget#idForLabel(id)

      Determines the HTML ``id`` attribute of this Widget for use by a
      ``<label>``, given the id of the field.

      This hook is necessary because some widgets have multiple HTML elements
      and, thus, multiple ids. In that case, this method should return an id
      value that corresponds to the first id in the widget's tags.

.. js:class:: SubWidget(parentWidget, name, value[, kwargs])

   Some widgets are made of multiple HTML elements -- namely,
   :js:class:`RadioSelect`. This represents the "inner" HTML element of a
   widget.

   **Prototype Functions**

   .. js:function:: SubWidget#render()

      Calls the parent widget's render function with this Subwidget's details.

.. js:class:: Input([kwargs])

   An ``<input>`` widget.

.. js:class:: TextInput([kwargs])

   An ``<input type="text">`` widget

.. js:class:: NumberInput([kwargs])

   An ``<input type="number">`` widget

.. js:class:: EmailInput([kwargs])

   An ``<input type="email">`` widget

.. js:class:: URLInput([kwargs])

   An ``<input type="url">`` widget

.. js:class:: PasswordInput([kwargs])

   An ``<input type="password">`` widget.

   :param Object kwargs: widget options

   .. js:attribute:: kwargs.renderValue

      if ``false`` a value will not be rendered for this field -- defaults to
      ``false``.

      :type: Boolean

.. js:class:: HiddenInput([kwargs])

   An ``<input type="hidden">`` widget.

.. js:class:: MultipleHiddenInput([kwargs])

   A widget that handles ``<input type="hidden">`` for fields that have a list
   of values.

.. js:class:: FileInput([kwargs])

   An ``<input type="file">`` widget.

.. js:class:: ClearableFileInput([kwargs])

   A file widget which also has a checkbox to indicate that the field should be
   cleared.

.. js:class:: Textarea([kwargs])

   A ``<textarea>`` widget.

   Default ``rows`` and ``cols`` HTML attributes will be used if not provided in
   ``kwargs.attrs``.

.. js:class:: DateInput([kwargs])

   An ``<input type="text">`` which, if given a Date object to display, formats
   it as an appropriate date string.

   :param Object kwargs: widget options

   .. js:attribute:: kwargs.format

      a `time.strftime() format string`_ for a date.

      :type: String

.. js:class:: DateTimeInput([kwargs])

   An ``<input type="text">`` which, if given a Date object to display, formats
   it as an appropriate datetime string.

   :param Object kwargs: widget options

   .. js:attribute:: kwargs.format

      a `time.strftime() format string`_ for a datetime.

      :type: String

.. js:class:: TimeInput([kwargs])

   An ``<input type="text">`` which, if given a Date object to display, formats
   it as an appropriate time string.

   :param Object kwargs: widget options

   .. js:attribute:: kwargs.format

      a `time.strftime() format string`_ for a time.

      :type: String

.. js:class:: CheckboxInput([kwargs])

   An ``<input type="checkbox">`` widget.

   :param Object kwargs: widget options

   .. js:attribute:: kwargs.checkTest

      a function which takes a value and returns ``true`` if the checkbox should
      be checked for that value.

      :type: Function

.. js:class:: Select([kwargs])

   An HTML ``<select>`` widget.

   :param Object kwargs: widget options

   .. js:attribute:: kwargs.choices

      choices to be used when rendering the widget, with each choice specified
      as an Array in ``[value, text]`` format -- defaults to ``[]``.

      :type: Array

.. js:class:: NullBooleanSelect([kwargs])

   A ``<select>`` widget intended to be used with :js:class:`NullBooleanField`.

   Any ``kwargs.choices`` provided will be overrridden with the specific choices
   this widget requires.

.. js:class:: SelectMultiple([kwargs])

   An HTML ``<select>`` widget which allows multiple selections.

   :param Object kwargs: widget options, as per :js:class:`Select`.

.. js:class:: RadioSelect([kwargs])

   Renders a single select as a list of ``<input type="radio">`` elements.

   :param Object kwargs: widget options

   .. js:attribute:: kwargs.renderer

      a custom :js:class:`RadioFieldRenderer` constructor.

      :type: Function

   **Prototype Functions**

   .. js:function:: RadioSelect#getRenderer(name, value[, kwargs])

      :returns: an instance of the renderer to be used to render this widget.

   .. js:function:: RadioSelect#subWidgets(name, value[, kwargs])

      :return:
         a list of :js:class:`RadioChoiceInput` objects created by this widget's
         renderer.

.. js:class:: RadioFieldRenderer(name, value, attrs, choices)

   An object used by :js:class:`RadioSelect` to enable customisation of radio
   widgets.

   :param String name: the field name.
   :param String value: the selected value.
   :param Object attrs: HTML attributes for the widget.
   :param Array choices:
      choices to be used when rendering the widget, with each choice
      specified as an Array in ``[value, text]`` format.

   .. js:function:: RadioFieldRenderer#choiceInputs()

      gets all ``RadioChoiceInput`` inputs created by this renderer.

   .. js:function:: RadioFieldRenderer#choiceInput(i)

      gets the i-th ``RadioChoiceInput`` created by this renderer.

.. js:class:: RadioChoiceInput(name, value, attrs, choice, index)

   An object used by :js:class:`RadioFieldRenderer` that represents a single
   ``<input type="radio">``.

   :param String name: the field name.
   :param String value: the selected value.
   :param Object attrs: HTML attributes for the widget.
   :param Array choice:
      choice details to be used when rendering the widget, specified as
      an Array in ``[value, text]`` format.
   :param Number index:
      the index of the radio button this widget represents.

.. js:class:: CheckboxSelectMultiple([kwargs])

   Multiple selections represented as a list of ``<input type="checkbox">``
   widgets.

   :param Object kwargs: widget options

   .. js:attribute:: kwargs.renderer

      a custom :js:class:`CheckboxFieldRenderer` constructor.

      :type: Function

   **Prototype Functions**

   .. js:function:: CheckboxSelectMultiple#getRenderer(name, value[, kwargs])

      :returns: an instance of the renderer to be used to render this widget.

   .. js:function:: CheckboxSelectMultiple#subWidgets(name, value[, kwargs])

      :return:
         a list of :js:class:`CheckboxChoiceInput` objects created by this
         widget's renderer.

.. js:class:: CheckboxFieldRenderer(name, value, attrs, choices)

   An object used by :js:class:`CheckboxSelectMultiple` to enable customisation
   of checkbox widgets.

   :param String name: the field name.
   :param Array value: a list of selected values.
   :param Object attrs: HTML attributes for the widget.
   :param Array choices:
      choices to be used when rendering the widget, with each choice
      specified as an Array in ``[value, text]`` format.

   .. js:function:: CheckboxFieldRenderer#choiceInputs()

      gets all ``CheckboxChoiceInput`` inputs created by this renderer.

   .. js:function:: CheckboxFieldRenderer#choiceInput(i)

      gets the i-th ``CheckboxChoiceInput`` created by this renderer.

.. js:class:: CheckboxChoiceInput(name, value, attrs, choice, index)

   An object used by :js:class:`CheckboxFieldRenderer` that represents a single
   ``<input type="checkbox">``.

   :param String name: the field name.
   :param Array value: a list of selected values.
   :param Object attrs: HTML attributes for the widget.
   :param Array choice:
      choice details to be used when rendering the widget, specified as
      an Array in ``[value, text]`` format.
   :param Number index:
      the index of the chckbox this widget represents.

.. js:class:: MultiWidget(widgets[, kwargs])

   A widget that is composed of multiple widgets.

   You'll probably want to use this class with :js:class:`MultiValueField`.

   :param Array widgets: the list of widgets composing this widget.
   :param Object kwargs: widget options.

   **Prototype Functions**

   .. js:function:: MultiWidget#formatOutput(renderedWidgets)

      Creates an element containing a given list of rendered widgets.

      This hook allows you to format the HTML design of the widgets, if needed
      -- by default, they are wrapped in a ``<div>``.

      :param Array renderedWidgets: a list of rendered widgets.

   .. js:function:: MultiWidget#decompress(value)

      Creates a list of decompressed values for the given compressed value.

      Subclasses must implement this function.

.. js:class:: SplitDateTimeWidget([kwargs])

   Splits Date input into two ``<input type="text">`` elements.

   :param Object kwargs:
      widget options additional to those specified in :js:class:`MultiWidget`.

   .. js:attribute:: kwargs.dateFormat

      a `time.strftime() format string`_ for a date.

   .. js:attribute:: kwargs.timeFormat

      a `time.strftime() format string`_ for a time.

.. js:class:: SplitHiddenDateTimeWidget([kwargs])

   Splits Date input into two ``<input type="hidden">`` elements.

.. _`time.strftime() format string`: https://github.com/insin/isomorph#formatting-directives