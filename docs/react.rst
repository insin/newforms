===============
Forms and React
===============

Using a Form in a React component
=================================

This is one way a form could be used in a React component:

.. code-block:: javascript

   var Contact = React.createClass({
     getInitialState: function() {
       return {form: new ContactForm()}
     }

   , render: function() {
       return <form ref="form" onSubmit={this.onSubmit}>
         {this.state.form.asDiv()}
         <div>
           <input type="submit" value="Submit"/>
         </div>
       </form>
     }

   , onSubmit: function(e) {
       e.preventDefault()
       if (this.state.form.validate(this.refs.form)) {
         this.props.processContactData(this.state.form.cleanedData)
       }
       else {
         this.forceUpdate()
       }
     }
   })

Over the lifecycle of this component, state changes as follows:

+-----------------------------------------+---------------+--------+
| Lifecycle stage                         | Data?         | Errors |
+=========================================+===============+========+
| Initial render - an unbound instance of | None yet      | No     |
| ContactForm is created as initial state |               |        |
+-----------------------------------------+---------------+--------+
| Invalid data is submitted. Form         | Invalid data  | Yes    |
| rendering now generates error messages. |               |        |
| React updates the DOM with them         |               |        |
+-----------------------------------------+---------------+--------+
| Valid data is submitted. Calls handler  | Valid data    | No     |
| function passed from parent component   |               |        |
| via props                               |               |        |
+-----------------------------------------+---------------+--------+

Customising Form display
========================

If the default generated HTML is not to your taste, you can completely customise
the way a form is presented. Extending the above example::

   var form = this.state.form
   var fields = form.boundFieldsObj()

   return <form ref="form" onSubmit={this.onSubmit} action="/contact" method="POST">
     {form.nonFieldErrors().render()}
     <div key={fields.subject.htmlName} className="fieldWrapper">
       {fields.subject.errors().render()}
       <label htmlFor="id_subject">Email subject:</label>
       {fields.subject.render()}
     </div>
     <div key={fields.message.htmlName} className="fieldWrapper">
       {fields.message.errors().render()}
       <label htmlFor="id_message">Your message:</label>
       {fields.message.render()}
     </div>
     <div key={fields.sender.htmlName} className="fieldWrapper">
        {fields.sender.errors().render()}
        <label htmlFor="id_sender">Your email address:</label>
        {fields.sender.render()}
     </div>
     <div key={fields.ccMyself.htmlName} className="fieldWrapper">
       {fields.ccMyself.errors().render()}
       <label htmlFor="id_ccMyself">CC yourself?</label>
       {fields.ccMyself.render()}
     </div>
     <div><input type="submit" value="Send message"/></div>
   </form>

Note the ``key`` attribute in the above example -- it's important to give
React a means of identifying elements which contain your form inputs between
renders so it doesn't blow away and recreate the elements.

Looping over the Form's Fields
------------------------------

If you're using the same layout for each of your form fields, you can loop over
them using ``form.boundFields()``, or if you extract the layout logic into a
function, you can ``.map()`` the list of BoundFields like so::

   render: function() {
     var form = this.state.form
     return <form ref="form" onSubmit={this.onSubmit} action="/contact" method="POST">
       {form.nonFieldErrors().render()}
       {form.boundFields().map(this.renderField)}
       <div><input type="submit" value="Send message"/></div>
     </form>
   }

   renderField: function(bf) {
     return <div key={bf.htmlName} className="fieldWrapper">
       {bf.errors().render()}
       {bf.labelTag()} {bf.render()}
     </div>
   }

With React, display logic is just code, so you have the full power of JavaScript
at your disposal to create new ways of laying out your forms and making a layout
reusable is just a case of putting it in a function.

For details of BoundField properties you can make use of, see the overview of
:ref:`ref-overview-customising`.
