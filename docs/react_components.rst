================
React Components
================

.. versionadded:: 0.10

To help you get started quickly, newforms provides some React components to
handle instantation and rendering of Forms and Formsets.

For the basic scenario of displaying form fields in the order they were defined,
these may be all you need to handle rendering your forms.

RenderForm
==========

This handles the generic use case for form rendering:

* Whole-form error messages are displayed at the top.
* Each visible field in the form is displayed in the order fields were defined.

It can also take care of some of the details of creating a Form instance and
re-rendering when the form's state changes for you.

.. code-block:: html

   <RenderForm form={MyForm} ref="myForm"/>

Form options
------------

If props other than those documented below are passed to a ``RenderForm``, they
will be passed on to the Form constructror when creating an instance. This
allows you to pass all the usual :js:class:`form constructor options <BaseForm>`
via the component.

For example, if you need to display more than one of the same Form, you need to
specify a prefix to give them a unique namespace:

.. code-block:: javascript

   var ParentForm = forms.Form.extend({
     name: forms.CharField(),
     dob: forms.DateField({label: 'Date of birth'})
   })

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

RenderForm props
----------------

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
   will also re-render the ``<RenderForm/>`` component when the form changes.

``component``
   :type: ``ReactCompositeComponent`` or ``String`` (an HTML tag name)

   The component used to wrap all the form's rows -- defaults to ``'div'``.

``className``
   :type: ``String``

   If provided, this prop will be passed to the wrapper component containing all
   the form's rows.

``row``
   :type: ``ReactCompositeComponent``

   The component used to render each form row -- defaults to `FormRow`_.

``rowComponent``
   :type: ``ReactCompositeComponent`` or ``String`` (an HTML tag name)

   The component used to wrap each row. Defaults to ``'div'``.

   This is passed as a ``component`` prop to the component in the ``row`` prop.

.. _ref-components-formrow:

FormRow
=======

This component handles rendering a single form "row". `RenderForm`_ uses this
to render rows by default; it will either:

1. Wrap some given content as a row, or:
2. Use a field's :ref:`rendering helper <ref-custom-display-boundfield>` to
   generate a row for the field, with a label, user input, error messages and
   help text, as necessary.

FormRow props
-------------

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

RenderFormset
=============

RenderFormset props
-------------------

Custom rendering with props
===========================

The bundled React compoents offer a degree of customisation via their props.

You can use the ``component``, ``className`` and ``rowComponent`` props to
customise the containers:

.. code-block:: html

   <RenderForm form={ParentForm}
      component="ul"
      className="parent"
      rowComponent="li"
      autoId={false}
   />

Which renders as:

.. code-block:: html

   <ul class="parent">
     <li>Name: <input type="text" name="name"></li>
     <li>Date of birth: <input type="text" name="dob"></li>
   </ul>

You can also customise how form rows are generated by passing a custom React
component to the ``row`` prop.

.. code-block:: html

   <RenderForm form={ParentForm} row={MySpecialFormRow}/>

.. Note::
   Keep in mind when implementing a custom row component that it will receive
   props as per those described for :ref:`FormRow <ref-components-formrow>`

Custom rendering with a child component
=======================================

If you want to implement custom form rendering with your own React component
while still making use of RenderForm to instantiate the form and set up
automatic validation and redisplay, pass a component as the only child of
``RenderForm``.

.. Warning::
   Passing more than one child component to ``RenderForm`` will result in an
   ``Error``

RenderForm wil then clone your component and pass the Form instance it manages
as a ``form`` prop.

.. Note::
   This method of implementing custom rendering by passing a prop is temporary.
   An upcoming change to React's currently (as of React 0.12) undocumented
   `context feature`_ will remove the need to pass props down the chain of
   components for this sort of scenario.

For example, this is how `newforms-gridforms`_ implements a custom grid layout:

.. code-block:: html

   <RenderForm form={PersonForm}>
     <GridLayout>
       <Section name="Person">
         <Row>
           <Field name="name"/>
           <Field name="dob"/>
         </Row>
       </Section>
     </GridLayout>
   </RenderForm>

.. _`context feature`: http://www.tildedave.com/2014/11/15/introduction-to-contexts-in-react-js.html
.. _`newforms-gridforms`: https://github.com/insin/newforms-gridforms
