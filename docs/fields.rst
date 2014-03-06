===========
Form fields
===========

.. Note::

   Guide documentation for Fields is currently incomplete.

   In the meantime, For a guide to the features of Fields and built-in Fields,
   please refer to the Django documentation:

      * `Django documentation -- Form fields <https://docs.djangoproject.com/en/dev/ref/forms/fields/>`_

When you create a new ``Form``, the most important part is defining its fields.
Each field has custom validation logic, along with a few other hooks.

Although the primary way you'll use a ``Field`` is in a ``Form``, you can also
instantiate them and use them directly to get a better idea of how they work.
Each ``Field`` instance has a ``clean()`` method, which takes a single argument
and either throws a ``forms.ValidationError`` or returns the clean value:

.. code-block:: javascript

   var f = forms.EmailField()
   print(f.clean('foo@example.com'))
   // => foo@example.com
   try {
     f.clean('invalid email address')
   }
   catch (e) {
     print(e.messages())
   }
   // => ["Enter a valid email address."]

Core field arguments
====================

required
--------

By default, each ``Field``  assumes the value is required, so if you pass
an empty value -- ``undefined``, ``null`` or the empty string (``'``) -- then
``clean()`` will throw a ``ValidationError``.

To specify that a field is *not* required, pass ``required: false`` to the
``Field`` constructor:

.. code-block:: javascript

   var f = forms.CharField({required: false})

If a ``Field`` has ``required: false`` and you pass ``clean()`` an empty value,
then ``clean()`` will return a *normalised* empty value rather than throwing a
``ValidationError``. For ``CharField``, this will be an empty string.
For other ``Field`` type, it might be ``null``. (This varies from field to
field.)

label
-----

The ``label`` argument lets you specify the "human-friendly" label for this
field. This is used when the ``Field`` is displayed in a ``Form``.

initial
-------

The ``initial`` argument lets you specify the initial value to use when
rendering this ``Field`` in an unbound ``Form``.

To specify dynamic initial data, see the
:ref:`Form.initial <ref-dynamic-initial-values>` parameter.

widget
------

The ``widget`` argument lets you specify a ``Widget`` to use when rendering this
``Field``. You can pass either an instance or a Widget constructor. See
:doc:`widgets` for more information.

helpText
--------

The ``helpText`` argument lets you specify descriptive text for this Field. If
you provide ``helpText``, it will be displayed next to the Field when the Field
is rendered by one of the convenience ``Form`` methods (e.g., ``asUJl()``).

errorMessages
-------------

The ``errorMessages`` argument lets you override the default messages that the
field will throw. Pass in an object with properties matching the error messages
you want to override. For example, here is the default error message:

.. code-block:: javascript

   var generic = forms.Charfield()
   try {
     generic.clean('')
   }
   catch (e) {
     print(e.messages())
   }
   // => ["This field is required."]

And here is a custom error message:

.. code-block:: javascript

   var name = forms.Charfield({errorMessages: {required: 'Please enter your name.'}})
   try {
     name.clean('')
   }
   catch (e) {
     print(e.messages())
   }
   // => ["Please enter your name."]

The error message codes used by fields are defined below.

validators
----------

The ``validators`` argument lets you provide a list of additional validation
functions for this field.

Providing choices
=================

Fields and Widgets which take a ``choices`` argument expect to be given a list
containing any of the following:

.. _ref-fields-choice-pairs:

Choice pairs
   A choice pair is a list containing exactly 2 elements, which correspond to:

      1. the value to be submitted/returned when the choice is selected.
      2. the value to be displayed to the user for selection.

   For example:

   .. code-block:: javascript

      var STATE_CHOICES = [
        ['S', 'Scoped']
      , ['D', 'Defined']
      , ['P', 'In-Progress']
      , ['C', 'Completed']
      , ['A', 'Accepted']
      ]

Grouped lists of choice pairs
   A list containing exactly 2 elements, which correspond to:

      1. A group label
      2. A list of choice pairs, as described above

   .. code-block:: javascript

      var DRINK_CHOICES = [
        ['Cheap', [
            [1, 'White Lightning']
          , [2, 'Buckfast']
          , [3, 'Tesco Gin']
          ]
        ]
      , ['Expensive', [
            [4, 'Vieille Bon Secours Ale']
          , [5, 'Château d’Yquem']
          , [6, 'Armand de Brignac Midas']
          ]
        ]
      , [7, 'Beer']
      ]

As you can see from the ``'Beer'`` example above, grouped pairs can be mixed
with ungrouped pairs within the list of choices.

Flat choices
   .. versionadded:: 0.5

   If a non-array value is provided where newforms expects to see a choice pair,
   it will be normalised to a choice pair using the same value for submission
   and display.

   This allows you to pass a flat list of choices when that's all you need:

   .. code-block:: javascript

      var VOWEL_CHOICES = ['A', 'E', 'I', 'O', 'U']

      var ARBITRARY_CHOICES = [
        ['Numbers', [1, 2, 3, 4, 5]]
      , ['Letters', ['A', 'B', 'C', 'D', 'E']]
      ]

Dynamic choices
===============

A common pattern for providing dynamic choices (or indeed, dynamic anything) is
to provide your own form constructor and pass in whatever data is required to
make changes to ``form.fields`` as the form is being instantiated:

.. code-block:: javascript

   var ProjectBookingForm = forms.Form.extend({
     project: forms.Choicefield()
   , hours: forms.DecimalField({minValue: 0, maxValue: 24, maxdigits: 4, decimalPlaces: 2})
   , date: forms.DateField()

   , constructor: function(projects, kwargs) {
       // Call the constructor of whichever form you're extending so that the
       // forms.Form constructor eventually gets called - this.fields doesn't
       // exist until this happens.
       ProjectBookingForm.__super__.constructor.call(this, kwargs)

       // Now that this.fields is a thing, make whatever changes you need to -
       // in this case, we're going to creata a list of pairs of project ids
       // and names to set as the project field's choices.
       this.fields.project.setChoices(projects.map(function(project) {
         return [project.id, project.name]
       }))
     }
   })

   // Example - a user booking time against a project and we need to display
   //           choices for the projects they're assigned to and validate that
   //           the submitted project id is one they've been assigned to.

   req.user.getProjects(function(err, projects) {
     if (err) return next(err)
     var form
     if (req.method == 'POST') {
       form = new ProjectBookingForm(projects, {data: req.body})
       if (form.isValid()) {
         return ProjectService.saveHours(user, form.cleanedData, function(err) {
           if (err) return next(err)
           return redirect(user)
         })
       }
     }
     else {
       form = new ProjectBookingForm(projects)
     }
     display(form)
   })

Built-in Field types
====================
