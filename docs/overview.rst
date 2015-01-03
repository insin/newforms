========
Overview
========

Newforms takes care of a number of common form-related tasks. Using it, you can:

   * Display a form with automatically generated form widgets.
   * Automatically keep a JavaScript object in sync with current user input.
   * Check user input against a set of validation rules.
   * Update form display with validation errors.
   * Convert valid user input to the relevant JavaScript data types.

Concepts
========

The core concepts newforms deals with are:

Widgets
   Widgets create ``ReactElement`` objects for form inputs.

   For example, a ``Select`` widget knows which ``<option>`` values and labels
   it should generate and how to generate a ``<select>`` with the ``<option>``
   corresponding to given user input data marked as selected.

Fields
   A Field holds metadata about displaying a form input and validating a piece
   of user input. Its metadata is the source for:

   * Configuring a suitable Widget to generate a form input, with a label and
     help text.
   * Validating user input and providing an appropriate error message when it's
     invalid.
   * Converting valid user input to an appropriate JavaScript data type.

   For example, an ``IntegerField`` makes sure that its user input data is a
   valid integer, is valid according to any additional rules defined -- such as
   ``minValue`` -- and converts valid user input to a JavaScript ``Number``.
   By default, it configures a ``NumberInput`` widget to display an
   ``<input type="number">`` for input.

Forms
   Forms group related Fields together, using them to validate user input and
   providing helpers for displaying them as HTML.

   Forms drive the validation process, holding raw user input data, validation
   error messages and "cleaned" data which has been validated and
   type-converted.

Form objects
============

Form constructors are created by extending ``forms.Form`` and declaratively
specifying field names and metadata:

.. code-block:: javascript

   var ContactForm = forms.Form.extend({
     subject: forms.CharField({maxLength: 100}),
     message: forms.CharField(),
     sender: forms.EmailField(),
     ccMyself: forms.BooleanField({required: false})
   })

A form is composed of ``Field`` objects. In this case, our form has four
fields: ``subject``, ``message``, ``sender`` and ``ccMyself``. ``CharField``,
``EmailField`` and ``BooleanField`` are just three of the available field types
-- a full list can be found in :doc:`fields`.

* A form with no user input data will render as empty or will contain any
  default values it was configured with.

* Once a form has user input data, it can validate it. If a form is rendered
  with invalid input data, it can include error messages telling the user what
  to correct.

Processing input data with a Form
---------------------------------

When a form is given valid input data, the successfully validated form data will
be in the ``form.cleanedData`` object. This data will have been converted into
JavaScript types for you, where necessary.

In the above example, ``ccMyself`` will be a boolean value. Likewise, fields
such as ``IntegerField`` and ``DateField`` convert values to a JavaScript
``Number`` and ``Date``, respectively.

Displaying a Form
-----------------

Newforms provides a React component which implements default rendering of
``Form`` objects.

This only provides rendering of the form's own fields; it's up to you to provide
the surrounding ``<form>`` element, submit buttons etc:

.. code-block:: javascript

   render: function() {
     return <form action="/contact" method="POST" onSubmit={this.onSubmit}>
       <forms.RenderForm form={ContactForm}/>
       <div>
         <input type="submit" value="Submit"/>{' '}
         <input type="button" value="Cancel" onClick={this.onCancel}/>
       </div>
     </form>
   }

``RenderForm`` will output each form field and accompanying label wrapped in a
``<div>``. Here's the output for our example component:

.. code-block:: html

   <form action="/contact" method="POST">
     <div>
       <div><label for="id_subject">Subject:</label> <input maxlength="100" type="text" name="subject" id="id_subject"></div>
       <div><label for="id_message">Message:</label> <input type="text" name="message" id="id_message"></div>
       <div><label for="id_sender">Sender:</label> <input type="email" name="sender" id="id_sender"></div>
       <div><label for="id_ccMyself">Cc myself:</label> <input type="checkbox" name="ccMyself" id="id_ccMyself"></div>
     </div>
     <div><input type="submit" value="Submit"> <input type="button" value="Cancel"></div>
   </form>

Note that each form field has an ``id`` attribute set to ``id_<field-name>``,
which is referenced by the accompanying label tag. You can
:ref:`customise the way in which labels and ids are generated <ref-forms-configuring-label>`.

You can customise the output of ``RenderForm`` by passing certain props or a
child React component. See the :ref:`documentation for custom rendering <ref-custom-rendering>`
for more info.

You can also :doc:`completely customise form display <custom_display>` using
rendering helpers for each field.

"Isomorphic"
============

Newforms was developed to be independent of the DOM, so it can be used on the
server as well as the browser. This allows you to use it when pre-rendering
initial HTML on the server, to be rehydrated and reused by React on the client
side.

User inputs generated by newforms have unique ``name`` attributes and its
handling of input data is compatible with POST data which would be submitted for
the user inputs it generates, so you can also use it to validate regular form
submissions on the server and redisplay with errors, should you need to.

This makes newforms suitable for creating apps which use good old HTTP round
tripping, or for JavaScript apps which need to be capable of falling back to
being usable as regular forms 'n links webapps in any device.

For an example of using newforms this way, check out the
`Isomorphic Lab demo <https://isomorphic-lab.herokuapp.com/addthing>`_ and its
`source on GitHub <https://github.com/insin/isomorphic-lab>`_.
