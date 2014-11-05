==========
Quickstart
==========

Example Form and React component
================================

.. raw:: html

   <div id="example-quickstart" class="newforms-example"></div>

Defining a new Form type
========================

Form constructors are created using :js:func:`Form.extend()`.

This takes an object containing form Fields and any other properties to be added
to the form's prototype, returning a Form constructor which inherits from
:js:class:`BaseForm`.

For convenience and compactness, the ``new`` operator is *optional* when
using newforms' Fields, Widgets and other constructors used when defining a new
Form type:

.. code-block:: javascript

   var ContactForm = forms.Form.extend({
     subject: forms.CharField({maxLength: 100}),
     message: forms.CharField(),
     sender: forms.EmailField(),
     ccMyself: forms.BooleanField({required: false}),

     // Implement custom validation for a field by adding a clean<FieldName>()
     // function to the form's prototype.
     cleanSender: function() {
       if (this.cleanedData.sender == 'mymatesteve@gmail.com') {
          throw forms.ValidationError("I know it's you, Steve. " +
                                      "Stop messing with my example form.")
       }
     },

     // Implement custom cross-field validation by adding a clean() function
     // to the form's prototype.
     clean: function() {
       if (this.cleanedData.subject &&
           this.cleanedData.subject.indexOf('that tenner you owe me') != -1) {
         // This error will be associated with the form itself, to be
         // displayed independently.
         throw forms.ValidationError('*BZZZT!* SYSTEM ERROR. Beeepity-boop etc.')
       }
     }
   })

Using a Form instance in a React component
==========================================

.. code-block:: javascript

   var AddContact = React.createClass({
     propTypes: {
        onSubmitContact: React.PropTypes.func.isRequired
     },

     // Create instances of forms to use in your React components
     getInitialState: function() {
       return {
         form: new ContactForm({
           validation: 'auto'
         , onStateChange: this.forceUpdate.bind(this)
         })
       }
     },

     // Forms have convenience rendering methods to get you started quickly,
     // which display a label, input widgets and any validation errors
     // for each field.
     // JSX and JavaScript for display logic make it convenient to write your
     // own custom rendering later.
     render: function() {
       return <form onSubmit={this.onSubmit}>
         <table>
           <tbody>
             {this.state.form.asTable()}
           </tbody>
         </table>
         <div className="controls">
           <input type="submit" value="Submit"/>
         </div>
       </form>
     },

     // Fields will be validated as the user interacts with them, but you need
     // to hook up the final check and use of the validated data.
     onSubmit: function(e) {
       e.preventDefault()

       // Calling .validate() runs validation for all fields, including any
       // custom validation you've provided.
       var isValid = this.state.form.validate()

       if (isValid) {
         // The form's .cleanedData contains validated input data, coerced to the
         // appropriate JavaScript data types by its Fields.
         this.props.onSubmitContact(this.state.form.cleanedData)
       }
       else {
         // If the data was invalid, the forms's errors will be populated with
         // validation messages which will be displayed on the next render.
         this.forceUpdate()
       }
     }
   })

.. raw:: html

   <script src="_static/js/react.min.js"></script>
   <script src="_static/js/newforms.min.js"></script>
   <script src="_static/js/quickstart.js"></script>
