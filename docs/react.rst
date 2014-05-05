===============
Forms and React
===============

Using a Form in a React component
=================================

This is one way a form could be used in a React component:

.. code-block:: javascript

   var Contact = React.createClass({
     getInitialState: function() {
       return {
         form: new ContactForm({onStateChange: this.forceUpdate.bind(this)})
       }
     }

   , onSubmit: function(e) {
       e.preventDefault()
       var form = this.state.form
       if (form.validate(this.refs.form)) {
         this.props.processContactData(form.cleanedData)
       }
     }

   , render: function() {
       return <form ref="form" onSubmit={this.onSubmit}>
         {this.state.form.asDiv()}
         <div>
           <input type="submit" value="Submit"/>
         </div>
       </form>
     }
   })

Customising Form display
========================

If the default generated HTML is not to your taste, you can completely customise
the way a form is presented. Extending the above example::

   var form = this.state.form
   var fields = form.boundFieldsObj()

   return <form ref="form" onSubmit={this.onSubmit} action="/contact" method="POST">
     {form.nonFieldErrors().render()}
     <div className="fieldWrapper">
       {fields.subject.errors().render()}
       <label htmlFor="id_subject">Email subject:</label>
       {fields.subject.render()}
     </div>
     <div className="fieldWrapper">
       {fields.message.errors().render()}
       <label htmlFor="id_message">Your message:</label>
       {fields.message.render()}
     </div>
     <div className="fieldWrapper">
        {fields.sender.errors().render()}
        <label htmlFor="id_sender">Your email address:</label>
        {fields.sender.render()}
     </div>
     <div className="fieldWrapper">
       {fields.ccMyself.errors().render()}
       <label htmlFor="id_ccMyself">CC yourself?</label>
       {fields.ccMyself.render()}
     </div>
     <div><input type="submit" value="Send message"/></div>
   </form>

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
at your disposal to create new ways of laying out your form, and making a layout
reusable is just a case of putting it in a function.

For details of BoundField properties you can make use of, see the overview of
:ref:`ref-overview-customising-display`.
