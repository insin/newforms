==========
Validators
==========

Guide
=====

Validators are either Functions or Objects with a ``__call__()`` function, which
take a value and throw a ValidationError if they detect that it is invalid.

The ``__call__()`` form is a workaround for the fact that only Function objects
are callable in JavaScript, and the callValidator utility function is provided
to ensure code which needs to work with validators doesn't need to care how
they're defined.

API
===

.. js:data:: EMPTY_VALUES

   Defines input values for which a field is considered to be empty. These are:

   * ``null``
   * ``undefined``
   * ``''``

.. js:function:: isEmptyValue(value)

   Convenience function for checking if a value is strictly one of
   ``EMPTY_VALUES``

.. js:class:: RegexValidator(regex, message, code)

   Validates that input matches a regular expression.

   .. js:class:: URLValidator([kwargs])

      Validates that input looks like a valid URL.

   .. js:class:: EmailValidator(regex, message, code)

      Validates that input looks like a valid e-mail address

.. js:data:: validateEmail

   Validates that input looks like a valid e-mail address.

.. js:data:: validateSlug

   Validates that input is a valid slug.

.. js:data:: validateIPV4Address

   Validates that input is a valid IPv4 address.

.. js:data:: validateCommaSeparatedIntegerList

   Validates that input is a comma-separated list of integers.

.. js:class:: BaseValidator(limitValue)

   Base for validators which compare input against a given value.

   .. js:class:: MaxValueValidator(limitValue)

      Validates that input is less than or equal to a given value.

   .. js:class:: MinValueValidator(limitValue)

      Validates that input is greater than or equal to a given value.

   .. js:class:: MaxLengthValidator(limitValue)

      Validates that input is at least a given length.

   .. js:class:: MinLengthValidator(limitValue)

      Validates that input is at most a given length.
