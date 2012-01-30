=======
Widgets
=======

Guide
=====

TBD

API
===

.. js:class:: Widget([kwargs])

   An HTML form widget.

   A widget handles the rendering of HTML, and the extraction of data from an
   object that corresponds to the widget.

   :param Object kwargs: widget options.

   .. js:attribute:: kwargs.attrs (Object)

      HTML attributes for the rendered widget.

.. js:class:: Input([kwargs])

   An HTML <input> widget.

   .. js:class:: TextInput([kwargs])

      An HTML <input type="text"> widget

      :param Object kwargs: widget options.

   .. js:class:: PasswordInput([kwargs])

       An HTML ``<input type="password">`` widget.

       :param Object kwargs:
          widget options additional to those specified in Input.

       .. js:attribute:: kwargs.renderValue (Boolean)

          if ``false`` a value will not be rendered for this field - defaults to
          ``false``.

   .. js:class:: HiddenInput([kwargs])

       An HTML <input type="hidden"> widget.

       :param Object kwargs: widget options.

      .. js:class:: MultipleHiddenInput([kwargs])

         A widget that handles <input type="hidden"> for fields that have a list
         of values.

   .. js:class:: FileInput([kwargs])

       An HTML <input type="file"> widget.

       :param Object kwargs: widget options.

      .. js:class:: ClearableFileInput([kwargs])

         :param Object kwargs: widget options.

   .. js:class:: DateInput([kwargs])

      A <input type="text"> which, if given a Date object to display, formats it
      as an appropriate date string.

      :param Object kwargs:
         widget options additional to those specified in Input.

      .. js:attribute:: kwargs.format (String}

         a time.strftime date format string.

   .. js:class:: DateTimeInput([kwargs])

      A <input type="text"> which, if given a Date object to display, formats it
      as an appropriate datetime string.

      :param Object kwargs:
         widget options additional to those specified in Input.

      .. js:attribute:: kwargs.format (String}

         a time.strftime datetime format string.

   .. js:class:: TimeInput([kwargs])

      A <input type="text"> which, if given a Date object to display, formats it
      as an appropriate time string.

      :param Object kwargs:
         widget options additional to those specified in Input.

      .. js:attribute:: kwargs.format (String}

         a time.strftime time format string.

.. js:class:: CheckboxInput([kwargs])

   An HTML ``<input type="checkbox">`` widget.

   :param Object kwargs: widget options additional to those specified in Widget.

   .. js:attribute:: kwargs.checkTest (Function)

      a function which takes a value and returns ``true`` if the checkbox should
      be checked for that value.

.. js:class:: Textarea([kwargs])

   An HTML ``<textarea>`` widget.

   :param Object kwargs: widget options

   Default rows and cols HTML attributes will be used if not provided.

.. js:class:: Select([kwargs])

   An HTML ``<select>`` widget.

   :param Object kwargs: widget options additional to those specified in Widget.

   .. js:attribute:: kwargs.choices (Array)

       choices to be used when rendering the widget, with each choice specified
       as an Array in ``[value, text]`` format.

   .. js:class:: NullBooleanSelect([kwargs])

      A ``<select>`` widget intended to be used with NullBooleanField.

      :param Object kwargs:
         widget options, as specified in Select. Any ``choices`` provided will
         be overrridden with the specific choices this widget requires.

   .. js:class:: SelectMultiple([kwargs])

      An HTML ``<select>`` widget which allows multiple selections.

      :param Object kwargs: widget options, as specified in Select.

   .. js:class:: RadioSelect([kwargs])

      Renders a single select as a list of ``<input type="radio">`` elements.

      :param Object kwargs:
         widget options additional to those specified in Select.

      .. js:attribute:: kwargs.renderer (Function)

          a custom RadioFieldRenderer constructor.

      .. js:class:: RadioFieldRenderer(name, value, attrs, choices)

         An object used by RadioSelect to enable customisation of radio
         widgets.

         :param String name: the field name.
         :param String value: the selected value.
         :param Object attrs: HTML attributes for the widget.
         :param Array choices:
            choices to be used when rendering the widget, with each choice
            specified as an Array in ``[value, text]`` format.

      .. js:class:: RadioInput(name, value, attrs, choice, index)

         An object used by RadioFieldRenderer that represents a single
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

      :param Object kwargs: widget options, as specified in Select.

.. js:class:: MultiWidget(widgets, [kwargs])

   A widget that is composed of multiple widgets.

   You'll probably want to use this class with MultiValueField.

   :param Array widgets: the list of widgets composing this widget.
   :param Object kwargs: widget options.

   .. js:class:: SplitDateTimeWidget([kwargs])

      Splits Date input into two ``<input type="text">`` elements.

      :param Object kwargs:
         widget optionsadditional to those specified in MultiWidget.
      :param String [dateFormat]: a time.strftime date format string
      :param String [timeFormat]: a time.strftime time format string

      .. js:class:: SplitHiddenDateTimeWidget([kwargs])

         Splits Date input into two ``<input type="hidden">`` elements.
