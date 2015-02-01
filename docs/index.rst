========
newforms
========

An isomorphic JavaScript form-handling library for `React`_.

(Formerly a direct port of the `Django`_ framework's ``django.forms`` library)

Getting newforms
================

Node.js
   Newforms can be used on the server, or bundled for the client using an
   npm-compatible packaging system such as `Browserify`_ or `webpack`_.

   ::

      npm install newforms

   .. code-block:: javascript

      var forms = require('newforms')

   .. Note::

      By default, newforms will be in development mode. To use it in production
      mode, set the environment variable ``NODE_ENV`` to ``'production'`` when
      bundling. To completely remove all development mode code, use a minifier
      that performs dead-code elimination, such as `UglifyJS`_.

Browser bundles
   The browser bundles expose newforms as a global ``forms`` variable and
   expects to find a global ``React`` variable to work with.

   The uncompressed bundle is in development mode, so will log warnings about
   potential mistakes.

   You can find it in the `dist/ directory`_.

Source
   Newforms source code and issue tracking is on GitHub:

      * https://github.com/insin/newforms

.. _`dist/ directory`: https://github.com/insin/newforms/tree/v0.10.1/dist

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

Guide Documentation
-------------------

.. toctree::
   :maxdepth: 2

   quickstart
   overview
   react_components
   react_client
   custom_display
   forms
   fields
   validation
   widgets
   formsets
   locales

API Reference
-------------

.. toctree::
   :maxdepth: 2

   forms_api
   boundfield_api
   fields_api
   validation_api
   widgets_api
   formsets_api
   util_api

.. _`Browserify`: http://browserify.org/
.. _`Django`: http://www.djangoproject.com
.. _`React`: http://facebook.github.io/react/
.. _`UglifyJS`: https://github.com/mishoo/UglifyJS2
.. _`webpack`: http://webpack.github.io/