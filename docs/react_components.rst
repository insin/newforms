================
React Components
================

.. versionadded:: 0.10

To help you get started quickly, newforms provides some React components to
handle instantation and rendering of Forms and FormSets.

For the basic scenario of displaying form fields in the order they were defined,
these may be all you need to handle rendering your forms.

RenderForm
==========

This component renders a :doc:`Form <forms>` as a list of "rows" -- one for each
field.

It handles the generic use case for form rendering:

* Whole-form error messages are displayed at the top.
* Each visible field in the form is displayed in the order fields were defined.

It can also take care of some of the details of creating a Form instance and
re-rendering when the form's state changes for you.

.. code-block:: html

   <RenderForm form={MyForm} ref="myForm"/>

Form options
------------

If :js:class:`form construction options <Form>` are passed as props to
``RenderForm``, they will be passed on to the Form constructor when creating an
instance.

For example, if you need to display more than one of the same Form, you need to
specify a :ref:`prefix <ref-form-prefixes>` to give them a unique namespace, so
pass a ``prefix`` prop like so:

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

Getting the Form instance
-------------------------

When passing RenderForm a Form constructor, give it a ``ref`` prop so you can
use its ``getForm()`` method to access the Form instance it manages for you.

For example, when handling submission of a form:

.. code-block:: javascript

   render: function() {
     return <form onSubmit={this._onSubmit}>
       <forms.RenderForm form={MyForm} ref="myForm"/>
       <button>Submit</button>
     </form>
   },

   _onSubmit: function(e) {
     e.preventDefault()
     var form = this.refs.form.getForm()
     var isValid = form.validate()
     if (isValid) {
       // ..
     }
   }

Other rendering scenarios
-------------------------

For the sake of being a complete default rendering implementation,
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

   If you pass a Form constructor, the component will instantiate it for you.
   :js:class:`Form construction options <Form>` may also be passed to
   ``RenderForm`` as additional props.

   If you pass a Form instance, make sure you set up its
   :ref:`onChange() <ref-form-state-onchange>` in such a way that it
   will also re-render the ``<RenderForm/>`` component when the form changes.

``component``
   :type: ``ReactCompositeComponent`` or ``String`` (an HTML tag name)

   The component used to wrap all the form's rows -- defaults to ``'div'``.

``className``
   :type: ``String``

   If provided, this prop will be passed to the wrapper component containing all
   the form's rows.

.. _ref-renderform-row:

``row``
   :type: ``ReactCompositeComponent``

   The component used to render each form row -- defaults to `FormRow`_.

``rowComponent``
   :type: ``ReactCompositeComponent`` or ``String`` (an HTML tag name)

   The tag name or component used to wrap each form row. Defaults to ``'div'``.

   This is passed as a ``component`` prop to the component in the ``row`` prop.

``progress``
   :type: ``ReactCompositeComponent`` or ``Function``

   Used to render what's displayed if the form has an async ``clean()`` method
   which is pending completion.

   This will also be passed to the component in the ``row`` prop when rendering.

Form construction options
   All the :js:class:`options which be passed when instantiating a Form <Form>`
   can be passed as props to ``RenderForm`` for use when you pass a Form
   constructor as the ``form`` prop.

.. _ref-components-formrow:

RenderForm methods
------------------

``getForm()``
   Returns the Form instance being rendered by the component.

FormRow
=======

This component handles rendering a single form "row". `RenderForm`_ uses this
to render rows by default; it will either:

1. Wrap some given content (such as a list of error messages) as a row, or:
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

``progress``
   :type: ``ReactCompositeComponent`` or ``Function``

   Used to render what's displayed if the form has async ``clean<Field>()``
   method which is pending completion.

RenderFormSet
=============

This component handles the generic use case for :doc:`FormSet <formsets>`
rendering, using ``RenderForm`` to render each form in a formset one after the
other.

It can also take care of some of the details of creating a FormSet and
re-rendering when form state changes.

.. code-block:: html

   <RenderFormSet form={MyForm} extra="3" ref="myFormset"/>

   <RenderFormSet formset={MyFormSet} ref="myFormset"/>

RenderFormSet props
-------------------

``form``
   :type: ``Function`` (a ``Form`` constructor)

   If you pass a Form constructor, the component will instantiate a FormSet
   for you.

   ``FormSet`` constructor options may be passed as additional props to
   ``RenderFormSet``.

   .. Note::
      When a ``form`` prop is passed, use of the ``formset`` prop changes. If
      also provided, it must be a FormSet constructor to be extended from.

``formset``
   :type: ``FormSet`` or ``Function`` (a ``FormSet`` constructor)

   The FormSet to be rendered -- can be a constructor or an instance.

   If you pass a FormSet constructor, the component will instantiate it for you.
   :js:class:`FormSet construction options <FormSet>` may also be passed to
   ``RenderFormSet`` as additional props.

   If you pass a FormSet instance, make sure you set up its
   :ref:`onChange() <ref-form-state-onchange>` in such a way that it will also
   re-render the ``<RenderFormSet/>`` component when one of its forms changes.

``component``
   :type: ``ReactCompositeComponent`` or ``String`` (an HTML tag name)

   The component used to wrap the formset's contents. Defaults to ``'div'``.

``className``
   :type: String

   If provided, this prop will be passed to the wrapper component for the
   formset.

``formComponent``
   :type: ``ReactCompositeComponent`` or ``String`` (an HTML tag name)

   The component used to wrap each form. Defaults to ``'div'``.

   This is passed as a ``component`` prop to `RenderForm`_.

``row`` & ``rowComponent``
   These are :ref:`as defined above <ref-renderform-row>` for RenderForm, which
   they are passed to.

``progress``
   :type: ``ReactCompositeComponent`` or ``Function``

   Used to render what's displayed if the formset has an async ``clean()``
   method which is pending completion.

   This will also be passed to `RenderForm`_.

``useManagementForm``
  :type: Boolean

   If ``true``, hidden fields from the FormSet's management form will be
   rendered. Defaults to ``false``.

   These fields are usually only required if you will be performing a regular
   form submission which will be processed by newforms on the server.

RenderFormSet methods
---------------------

``getFormset()``
   Returns the FormSet instance being rendered by the component.

.. _ref-custom-rendering:

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
   props as per those described for :ref:`FormRow <ref-components-formrow>`.

Custom rendering with a child component
=======================================

If you want to implement custom form rendering with your own React component
while still making use of RenderForm to instantiate the form and set up
automatic validation and redisplay, pass a component as the only child of
``RenderForm``.

.. Warning::
   Passing more than one child component to ``RenderForm`` will result in an
   ``Error``.

RenderForm wil then clone your component and pass the Form instance it manages
as a ``form`` prop.

.. Note::
   This method of implementing custom rendering by passing a prop is temporary.
   An upcoming change to React's currently (as of React 0.13) undocumented
   `context feature`_ will remove the need to pass props down the chain of
   components for this sort of scenario.

For example, this is how `newforms-gridforms`_ implements a custom grid layout:

.. code-block:: html

   <RenderForm form={ParentForm}>
     <GridForm>
       <Section name="Parent">
         <Row>
           <Field name="name"/>
           <Field name="dob"/>
         </Row>
       </Section>
     </GridForm>
   </RenderForm>

.. _`context feature`: http://www.tildedave.com/2014/11/15/introduction-to-contexts-in-react-js.html
.. _`newforms-gridforms`: https://github.com/insin/newforms-gridforms

Custom async progress rendering
===============================

By default, when :ref:`async validation <ref-async-validation>` is in progress,
each of the React components newforms provides will render a ``<progress>``
element with fallback "Validating..." text. However, the ``<progress>`` element
doesn't currently lend itself to extensive customisation via CSS, especially
cross-browser.

To customise this, each component takes a ``progress`` prop which
can take a function or React component which will be used to indicate an
in-progress async validation.

For example, either of the following could be passed as the ``progress`` prop
to display a spinner image instead:

.. code-block:: javascript

   var InProgress = React.createClass({
     render() {
       return <span>
         <img src="/img/spinner.gif" alt=""/> Validating&hellip;
       </span>
     }
   })

   function inProgress() {
     return <span>
       <img src="/img/spinner.gif" alt=""/> Validating&hellip;
     </span>
   }

.. code-block:: html

   <RenderForm form={MyForm} ref="myForm" progress={InProgress}/>
