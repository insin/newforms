=======
Widgets
=======

A widget is a representation of an HTML input element. The widget handles the
rendering of the HTML, and the extraction of data from a data object that
corresponds to how the widget's values(s) would be submitted by a form.

.. tip::

    Widgets should not be confused with the :doc:`form fields </fields>`.
    Form fields deal with the logic of input validation and are used directly
    in templates. Widgets deal with rendering of HTML form input elements on
    the web page and extraction of raw submitted data. However, widgets do
    need to be :ref:`assigned <widget-to-field>` to form fields.

.. _widget-to-field:

Specifying widgets
==================

Whenever you specify a field on a form, newforms will use a default widget
that is appropriate to the type of data that is to be displayed. To find
which widget is used on which field, see the documentation about
:ref:`Build-in Field types <ref-built-in-field-types>`.

However, if you want to use a different widget for a field, you can
just use the ``widget`` argument on the field definition. For example:

.. code-block:: javascript

   var CommentForm = forms.Form.extend({
     name: forms.CharField(),
     url: forms.URLField(),
     comment: forms.CharField({widget: forms.Textarea})
   })

This would specify a form with a comment that uses a larger :js:class:`Textarea`
widget, rather than the default :js:class:`TextInput` widget.

Setting arguments for widgets
=============================

Many widgets have optional extra arguments; they can be set when defining the
widget on the field. In the following example, we set additional HTML attributes
to be added to the ``TextArea`` to control its display:

.. code-block:: javascript

   var CommentForm = forms.Form.extend({
     name: forms.CharField(),
      url: forms.URLField(),
      comment: forms.CharField({
       widget: forms.Textarea({attrs: {rows: 6, cols: 60}})
     })
   })

See the :ref:`built-in widgets` for more information about which widgets
are available and which arguments they accept.

Customising widget attributes
=============================

.. versionadded:: 0.11

Sometimes you just need to add some extra attributes to a field's default
widget. Instead of completely redefining the widget as shown above, you can
provide extra attributes using the field's ``widgetAttrs`` argument. For
example, if we want focus to be given to the ``name`` field when the form is
first rendered:

.. code-block:: javascript

   var CommentForm = forms.Form.extend({
     name: forms.CharField({widgetAttrs: {autoFocus: true}}),
     url: forms.URLField(),
     comment: forms.CharField({widget: forms.Textarea})
   })

Widgets inheriting from the Select widget
=========================================

Widgets inheriting from the :js:class:`Select` widget deal with choices. They
present the user with a list of options to choose from. The different widgets
present this choice differently; the :js:class:`Select` widget itself uses a
``<select>`` HTML list representation, while :js:class:`RadioSelect` uses radio
buttons.

:js:class:`Select` widgets are used by default on
:js:class:`ChoiceField` fields. The choices displayed on the widget are
inherited from the :js:class:`ChoiceField` and setting new choices with
:js:func:`ChoiceField#setChoices` will update ``Select.choices``. For
example:

.. code-block:: javascript

   var CHOICES = [['1', 'First'], ['2', 'Second']]
   var field = forms.ChoiceField({choices: CHOICES, widget: forms.RadioSelect})
   print(field.choices())
   // => [['1', 'First'], ['2', 'Second']]
   print(field.widget.choices
   // => [['1', 'First'], ['2', 'Second']]
   field.widget.choices = []
   field.setChoices([['1', 'First and only']])
   print(field.widget.choices)
   // => [['1', 'First and only']]

Widgets which offer a ``choices`` property can however be used with fields which
are not based on choice -- such as a :js:class:`CharField` -- but it is
recommended to use a :js:class:`ChoiceField`-based field when the choices are
inherent to the model and not just the representational widget.

Customising widget instances
============================

Widgets are rendered with minimal markup - by default there are no CSS class
names applied, or any other widget-specific attributes. This means, for example,
that all :js:class:`TextInput` widgets will appear the same on your pages.

.. _styling-widget-instances:

Styling widget instances
------------------------

If you want to make one widget instance look different from another, you will
need to specify additional attributes at the time when the widget object is
instantiated and assigned to a form field (and perhaps add some rules to your
CSS files).

For example, take the following simple form:

.. code-block:: javascript

   var CommentForm = forms.Form.extend({
     name: forms.CharField(),
     url: forms.URLField(),
     comment: forms.CharField()
   })

This form will include three default :js:class:`TextInput` widgets, with default
rendering -- no CSS class, no extra attributes. This means that the input boxes
provided for each widget will be rendered exactly the same:

.. code-block:: javascript

   var f = new CommentForm({autoId: false})
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div>Name: <input type="text" name="name"></div>
     <div>Url: <input type="url" name="url"></div>
     <div>Comment: <input type="text" name="comment"></div>
   </div>
   */

On a real Web page, you probably don't want every widget to look the same. You
might want a larger input element for the comment, and you might want the
'name' widget to have some special CSS class. It is also possible to specify
the 'type' attribute to take advantage of the new HTML5 input types.  To do
this, you use the ``Widget.attrs`` argument when creating the widget:

.. code-block:: javascript

   var CommentForm = forms.Form.extend({
     name: forms.CharField({
       widget: forms.TextInput({attrs: {className: 'special'}})
     }),
     url: forms.URLField(),
     comment: forms.CharField({widget: forms.TextInput({attrs: {size: '40'}})
   })

.. Note::

   Widgets are rendered as ``ReactElement`` objects -- in the example above,
   we used ``className`` instead of ``class`` as React has standardised on the
   `JavaScript-safe versions of attribute names`_, which avoid conflicting with
   JavaScript reserved words.

   .. _`JavaScript-safe versions of attribute names`: http://facebook.github.io/react/docs/tags-and-attributes.html#html-attributes

The extra attributes will then be included in the rendered output:

.. code-block:: javascript

   var f = new CommentForm({autoId: false})
   print(reactHTML(<RenderForm form={f}/>))
   /* =>
   <div>
     <div>Name: <input class="special" type="text" name="name"></div>
     <div>Url: <input type="url" name="url"></div>
     <div>Comment: <input size="40" type="text" name="comment"></div>
   </div>
   */

You can also set the HTML ``id`` using ``Widget.attrs``.

Base Widgets
============

Base widgets :js:class:`Widget` and :js:class:`MultiWidget` are extended by
all the :ref:`built-in widgets <built-in widgets>` and may serve as a
foundation for custom widgets.

:js:class:`Widget`
------------------

 This abstract widget cannot be rendered, but provides the basic attribute
 ``Widget.attrs``.  You may also implement or override the ``render()``
 method on custom widgets.

   :js:attr:`widget.attrs`
      An object containing HTML attributes to be set on the rendered
      widget:

      .. code-block:: javascript

          var name = forms.TextInput({attrs: {size:10, title: 'Your name'}})
          print(reactHTML(name.render('name', 'A name')))
          // => <input size="10" title="Your name" type="text" name="name" value="A name">"

Key Widget methods are:

   :js:func:`Widget#render`
      Returns a ``ReactElement`` representation of the widget. This method must be
      implemented by extending widgets, or an ``Error`` will be thrown.

      The 'value' given is not guaranteed to be valid input, therefore
      extending widgets should program defensively.

   :js:func:`Widget#valueFromData`
      Given an object containing input data and this widget's name, returns
      the value of this widget. Returns ``null`` if a value wasn't provided.

:js:class:`MultiWidget`
-----------------------

A widget that is composed of multiple widgets. :js:class:`MultiWidget` works
hand in hand with the :js:class:`MultiValueField`.

``MultiWidget`` has one required argument:

   MultiWidget.widgets
      A list containing the widgets needed.

And one required method:

   :js:func:`MultiWidget#decompress`
      This method takes a single "compressed" value from the field and
      returns a list of "decompressed" values. The input value can be
      assumed valid, but not necessarily non-empty.

      This method **must be implemented** by the widgets extending
      ``MultiWidget``, and since the value may be empty, the implementation
      must be defensive.

      The rationale behind "decompression" is that it is necessary to "split"
      the combined value of the form field into the values for each widget.

      An example of this is how :js:class:`SplitDateTimeWidget` turns a
      ``Date`` value into a list with date and time split into two separate
      values.

      .. tip::
         Note that :js:class:`MultiValueField` has a complementary method
         :js:func:`MultiValueField#compress` with the opposite
         responsibility - to combine cleaned values of all member fields into
         one.

Other methods that may be useful to implement include:

   :js:func:`MultiWidget#render`
      The ``value`` argument must be handled differently in this method then
      in :js:func:`Widget#render` because it has to figure out how to split a
      single value for display in multiple widgets.

      The ``value`` argument used when rendering can be one of two things:

      * A list.
      * A single value (e.g., a string) that is the "compressed" representation
        of a list of values.

      If ``value`` is a list, the output of :js:func:`MultiWidget#render` will
      be a concatenation of rendered child widgets. If ``value`` is not a
      list, it will first be processed by the method
      :js:func:`MultiWidget#decompress` to create the list and then rendered.

      When ``render()`` runs, each value in the list is rendered with the
      corresponding widget -- the first value is  rendered in the first
      widget, the second value is rendered in the second widget, etc.

      Unlike in the single value widgets, ``render()`` doesn't have to be
      implemented by extending widgets.

   :js:func:`MultiWidget#formatOutput`
      Given a list of rendered widgets (as ``ReactElement`` objects), returns
      the list or a ``ReactElement`` object containing the widgets.
      This hook allows you to lay out the widgets any way you'd like.

Here's an example widget which extends :js:class:`MultiWidget` to display
a date with the day, month, and year in different select boxes. This widget
is intended to be used with a :js:class:`DateField` rather than
a :js:class:`MultiValueField`, so we've implemented
:js:func:`Widget#valueFromData`:

.. code-block:: javascript

   var DateSelectorWidget = forms.MultiWidget.extend({
     constructor: function(kwargs) {
       kwargs = extend({attrs: {}}, kwargs)
       widgets = [
         forms.Select({choices: range(1, 32), attrs: kwargs.attrs}),
         forms.Select({choices: range(1, 13), attrs: kwargs.attrs}),
         forms.Select({choices: range(2012, 2017), attrs: kwargs.attrs})
       ]
       forms.MultiWidget.call(this, widgets, kwargs)
     },

     decompress: function(value) {
       if (value instanceof Date) {
         return [value.getDate(),
                 value.getMonth() + 1, // Make month 1-based for display
                 value.getFullYear()]
       }
       return [null, null, null]
     },

     formatOutput: function(renderedWidgets) {
       return React.createElement('div', null, renderedWidgets)
     },

     valueFromData: function(data, files, name) {
       var parts = this.widgets.map(function(widget, i) {
         return widget.valueFromData(data, files, name + '_' + i)
       })
       parts.reverse() // [d, m, y] => [y, m, d]
       return parts.join('-')
     }
   })

The constructor creates several :js:class:`Select` widgets in a list. The
"super" constructor uses this list to setup the widget.

The :js:func:`MultiWidget#formatOutput` method is fairly vanilla here (in
fact, it's the same as what's been implemented as the default for
``MultiWidget``), but the idea is that you could add custom HTML between
the widgets should you wish.

The required method :js:func:`MultiWidget#decompress` breaks up a
``Date`` value into the day, month, and year values corresponding
to each widget. Note how the method handles the case where ``value`` is
``null``.

The default implementation of :js:func:`Widget#valueFromData` returns
a list of values corresponding to each ``Widget``. This is appropriate
when using a ``MultiWidget`` with a :js:class:`MultiValueField`,
but since we want to use this widget with a :js:class:`DateField`
which takes a single value, we have overridden this method to combine the
data of all the subwidgets into a ``'yyyy-mm-dd'`` formatted date string and
returns it for validation by the :js:class:`DateField`.

.. _built-in widgets:

Built-in widgets
================

Newforms provides a representation of all the basic HTML widgets, plus some
commonly used groups of widgets, including
:ref:`the input of text <text-widgets>`,
:ref:`various checkboxes and selectors <selector-widgets>`,
:ref:`uploading files <file-upload-widgets>`,
and :ref:`handling of multi-valued input <composite-widgets>`.

.. _text-widgets:

Widgets handling input of text
==============================

These widgets make use of the HTML elements ``<input>`` and ``<textarea>``.

:js:class:`TextInput`
---------------------

   Text input: ``<input type="text" ...>``

:js:class:`NumberInput`
-----------------------

   Text input: ``<input type="number" ...>``

:js:class:`EmailInput`
----------------------

   Text input: ``<input type="email" ...>``

:js:class:`URLInput`
--------------------

   Text input: ``<input type="url" ...>``

:js:class:`PasswordInput`
-------------------------

   Password input: ``<input type='password' ...>``

   Takes one optional argument:

   * ``PasswordInput.renderValue``

        Determines whether the widget will have a value filled in when the
        form is re-displayed after a validation error (default is ``false``).

:js:class:`Textarea`
--------------------

   Text area: ``<textarea>...</textarea>``

.. _selector-widgets:

:js:class:`HiddenInput`
-----------------------

   Hidden input: ``<input type='hidden' ...>``

   Note that there also is a :js:class:`MultipleHiddenInput` widget that
   encapsulates a set of hidden input elements.

:js:class:`DateInput`
---------------------

   Date input as a simple text box: ``<input type='text' ...>``

   Takes same arguments as :js:class:`TextInput`, with one more optional argument:

   * ``DateInput.format``

        The format in which this field's initial value will be displayed.

   If no ``format`` argument is provided, the default format is the first
   format found in the current locale's
   :ref:`DATE_INPUT_FORMATS <ref_locale_items_table>`.

:js:class:`DateTimeInput`
-------------------------

   Date/time input as a simple text box: ``<input type='text' ...>``

   Takes same arguments as :js:class:`TextInput`, with one more optional argument:

   * ``DateTimeInput.format``

        The format in which this field's initial value will be displayed.

   If no ``format`` argument is provided, the default format is the first
   format found in the current locale's
   :ref:`DATETIME_INPUT_FORMATS <ref_locale_items_table>`.

:js:class:`TimeInput`
---------------------

   Time input as a simple text box: ``<input type='text' ...>``

   Takes same arguments as :js:class:`TextInput`, with one more optional argument:

   * ``TimeInput.format``

        The format in which this field's initial value will be displayed.

   If no ``format`` argument is provided, the default format is the first
   format found in the current locale's
   :ref:`TIME_INPUT_FORMATS <ref_locale_items_table>`.

Selector and checkbox widgets
=============================

:js:class:`CheckboxInput`
-------------------------

   Checkbox: ``<input type='checkbox' ...>``

   Takes one optional argument:

   * ``CheckboxInput.checkTest``

        A function that takes the value of the CheckBoxInput and returns
        ``true`` if the checkbox should be checked for that value.

:js:class:`Select`
------------------

   Select widget: ``<select><option ...>...</select>``

   * ``Select.choices``

        This attribute is optional when the form field does not have a
        ``choices`` attribute. If it does, it will override anything you set
        here when the attribute is updated on the :js:class:`Field`.

:js:class:`NullBooleanSelect`
-----------------------------

   Select widget with options 'Unknown', 'Yes' and 'No'

:js:class:`SelectMultiple`
--------------------------

   Similar to :class:`Select`, but allows multiple selection:
   ``<select multiple='multiple'>...</select>``

:js:class:`RadioSelect`
-----------------------

   Similar to :class:`Select`, but rendered as a list of radio buttons within
   ``<li>`` tags:

   .. code-block:: html

      <ul>
        <li><input type='radio' ...></li>
        ...
      </ul>

   For more granular control over the generated markup, you can loop over the
   radio buttons. Assuming a form ``myform`` with a field ``beatles`` that uses
   a ``RadioSelect`` as its widget::

      myForm.boundField('beatles').subWidgets().map(function(radio) {
        return <div className="myRadio">{radio.render()}</div>
      })

   This would generate the following HTML:

   .. code-block:: html

      <div class="myRadio">
        <label for="id_beatles_0"><input id="id_beatles_0" type="radio" name="beatles" value="john"> John</label>
      </div>
      <div class="myRadio">
        <label for="id_beatles_1"><input id="id_beatles_1" type="radio" name="beatles" value="paul"> Paul</label>
      </div>
      <div class="myRadio">
        <label for="id_beatles_2"><input id="id_beatles_2" type="radio" name="beatles" value="george"> George</label>
      </div>
      <div class="myRadio">
        <label for="id_beatles_3"><input id="id_beatles_3" type="radio" name="beatles" value="ringo"> Ringo</label>
      </div>

   That included the ``<label>`` tags. To get more granular, you can use each
   radio button's ``tag()``, ``choiceLabel`` and ``idForLabel()``.
   For example, this code...::

      myForm.boundField('beatles').subWidgets().map(function(radio) {
        return <label htmlFor={radio.idForLabel()}>
          {radio.choiceLabel}
          <span className="radio">{radio.tag()}</span>
        </label>
      })

   ...will result in the following HTML:

   .. code-block:: html

      <label for="id_beatles_0">
        John
        <span class="radio"><input id="id_beatles_0" type="radio" name="beatles" value="john"></span>
      </label>
      <label for="id_beatles_1">
        Paul
        <span class="radio"><input id="id_beatles_1" type="radio" name="beatles" value="paul"></span>
      </label>
      <label for="id_beatles_2">
        George
        <span class="radio"><input id="id_beatles_2" type="radio" name="beatles" value="george"></span>
      </label>
      <label for="id_beatles_3">
        Ringo
        <span class="radio"><input id="id_beatles_3" type="radio" name="beatles" value="ringo"></span>
      </label>

   If you decide not to loop over the radio buttons -- e.g., if your layout
   simply renders the ``beatles`` ``BoundField`` -- they'll be output in a
   ``<ul>`` with ``<li>`` tags, as above.

:js:class:`CheckboxSelectMultiple`
----------------------------------

   Similar to :js:class:`SelectMultiple`, but rendered as a list of check
   buttons:

   .. code-block:: html

      <ul>
        <li><input type='checkbox' ...></li>
        ...
      </ul>

   Like :js:class:`RadioSelect`, you can  loop over the individual checkboxes
   making up the lists.

.. _file-upload-widgets:

File upload widgets
===================

:js:class:`FileInput`
---------------------

   File upload input: ``<input type='file' ...>``

:js:class:`ClearableFileInput`
------------------------------

   File upload input: ``<input type='file' ...>``, with an additional checkbox
   input to clear the field's value, if the field is not required and has
   initial data.

.. _composite-widgets:

Composite widgets
=================

:js:class:`MultipleHiddenInput`
-------------------------------

   Multiple ``<input type='hidden' ...>`` widgets.

   A widget that handles multiple hidden widgets for fields that have a list
   of values.

   * ``MultipleHiddenInput.choices``

        This attribute is optional when the form field does not have a
        ``choices`` attribute. If it does, it will override anything you set
        here when the attribute is updated on the :js:class:`Field`.

:js:class:`SplitDateTimeWidget`
-------------------------------

   Wrapper (using :js:class:`MultiWidget`) around two widgets:
   :js:class:`DateInput` for the date, and :js:class:`TimeInput` for the time.

   ``SplitDateTimeWidget`` has two optional attributes:

   * ``SplitDateTimeWidget.dateFormat``

        Similar to ``DateInput.format``

   * ``SplitDateTimeWidget.timeFormat``

        Similar to ``TimeInput.format``

:js:class:`SplitHiddenDateTimeWidget`
-------------------------------------

   Similar to :js:class:`SplitDateTimeWidget`, but uses :js:class:`HiddenInput`
   for both date and time.
