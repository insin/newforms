================
React Components
================

.. versionadded:: 0.10

To help you get started quickly, newforms provides some React components to
handle instantation and rendering of Forms and Formsets.

For the basic scenario of displaying form fields in the order they were defined,
these may be all you need to handle rendering your forms.

``RenderForm``
==============

This handles the generic use case for form rendering:

* Whole-form error messages are displayed at the top.
* Each visible field in the form is displayed in the order fields were defined.

It can also take care of some of the details of creating a Form instance and
re-rendering when the form's state changes for you.

.. code-block:: html

   <RenderForm form={MyForm} ref="myForm"/>

Form options
------------

Any props passed to ``RenderForm`` which aren't listed below will be passed to
the Form constructror when creating an instance. This allows you to pass all the
usual :js:class:`form options <BaseForm>` directly to the component.

For example, if you need to display more than one of the same Form, you need to
specify a prefix to give them a unique namespace:

.. code-block:: html

   <fieldset>
     <legend>Parent 1</legend>
     <RenderForm form={ParentForm} prefix="parent1"/>
   </fieldset>
   <fieldset>
     <legend>Parent 2</legend>
     <RenderForm form={ParentForm} prefix="parent2"/>
   </fieldset>

.. raw:: html

   <iframe src="_static/html/renderform-form-props.html"
           style="box-sizing: border-box; width: 100%; overflow: hidden; border: 0">
   </iframe>

Other rendering scenarios
-------------------------

``RenderForm`` also handles some less common scenarios:

* Displaying error messages related to hidden fields.
* Rendering hidden fields.
* Displaying a progress indicator if the form has asynchronous whole-form
  validation pending completion.

Props
-----

``RenderForm`` expects the following props:

.. Note::
   A ``ReactCompositeComponent`` is what you get back when you call
   ``React.createClass()``

``form``
   :type: ``Form`` or ``Function`` (a ``Form`` constructor)

   The Form to be rendered -- can be a constructor or an instance.

   If you pass a Form constructor, the component will instantiate it for you. Any
   additional props you pass to ``RenderForm`` will be passed as options when
   creating the form instance.

   You can also pass a Form instance. When doing so, make sure you set up the
   instance's :ref:`onChange() <ref-form-state-onchange>` in such a way that it
   will re-render the ``<RenderForm/>`` when the form changes.

``component``
   :type: ``ReactCompositeComponent`` or ``String`` (an HTML tag name)

   The component used to wrap all the form's rows -- defaults to ``'div'``.

``className``
   :type: ``String``

   If provided, this prop will be passed to the wrapper component containing all
   the form's rows.

``row``
   :type: ``ReactCompositeComponent``

   The component used to render each form row -- defaults to
   :ref:`FormRow <ref-components-formrow>`.

``rowComponent``
   :type: ``ReactCompositeComponent`` or ``String`` (an HTML tag name)

   The component used to wrap each row. Defaults to ``'div'``.

   This is passed as a ``component`` prop to the component in the ``row`` prop.

.. _ref-components-formrow:

``FormRow``
===========

This component handles rendering a single form "row". ``RenderForm`` uses this
to render rows by default; it will either:

1. Wrap some given content as a row, or:
2. Use a field's :ref:`rendering helper <ref-custom-display-boundfield>` to
   generate a row for the field, with a label, user input, error messages and
   help text, as necessary.

Props
-----

``FormRow`` expects the following props:

``content``
   :type: Any

   If given, will be used for the entire contents of the row.

``bf``
   :type: :js:class:`BoundField`

   If given and ``content`` is not given, this Field rendering helper will be
   used to create contents for a Field row.

``component``
   :type: ``ReactCompositeComponent`` or ``String`` (an HTML tag name)

   The component used to wrap the row contents. Defaults to ``'div'``.

``className``
   :type: String

   If provided, this prop will be passed to the wrapper component for the row.

``hidden``
   :type: Boolean

   If ``true``, the row container ReactElement will be given a ``display: none``
   style -- defaults to ``false``.

``RenderFormset``
=================
