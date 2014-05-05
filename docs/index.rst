========
newforms
========

An isomorphic JavaScript form-handling library for `React`_.

(Formerly a direct port of the `Django`_ framework's ``django.forms`` library)

Getting newforms
================

Browser bundles
   Browser bundles include all dependencies except React.

   They expose newforms as a global ``forms`` variable and expect to find a
   global ``React`` variable to work with.

   Release bundles will be available from:

      * https://github.com/insin/newforms/tree/react/dist

   Development bundles (updated intermittently):

      * `newforms.js`_
      * `newforms.min.js`_

Node.js
   ::

      npm install newforms

   .. code-block:: javascript

      var forms = require('newforms')

Source
   Newforms source code and issue tracking is on GitHub:

      * https://github.com/insin/newforms

.. _`newforms.js`: https://github.com/insin/newforms/raw/react/newforms.js
.. _`newforms.min.js`: https://github.com/insin/newforms/raw/react/newforms.min.js

Documentation
=============

.. Note::

   Unless specified otherwise, documented API items live under the ``forms``
   namespace object in the browser, or the result of ``require('newforms')`` in
   Node.js.

.. rst-class:: overview-list

.. hlist::
   :columns: 2

   * :doc:`Quickstart <quickstart>`
        A quick introduction to defining and using newforms Form objects

   * :doc:`Guide Documentation <guide>`
        An overview of newforms concepts, and guide docs with examples

   * :doc:`API Reference <api>`
        Reference guide for the API exposed by newforms

Documentation Contents
======================

.. toctree::
   :maxdepth: 2

   quickstart
   overview
   forms
   fields
   react
   validation
   interactive_forms
   widgets
   formsets
   util
   forms_api
   fields_api
   validation_api
   widgets_api
   formsets_api

.. _`Django`: http://www.djangoproject.com
.. _`Node.js`: http://nodejs.org
.. _`React`: http://facebook.github.io/react/
