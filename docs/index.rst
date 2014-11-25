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
   Browser bundles expose newforms as a global ``forms`` variable and expect to
   find a global ``React`` variable to work with.

   `newforms 0.9.1 (development version)`_

   Uncompressed, with warnings about potential mistakes.

   `newforms 0.9.1 (production version)`_

   Compressed version for production.

Source
   Newforms source code and issue tracking is on GitHub:

      * https://github.com/insin/newforms

.. _`newforms 0.9.0 (development version)`: https://github.com/insin/newforms/raw/react/dist/newforms-0.9.1.js
.. _`newforms 0.9.0 (production version)`: https://github.com/insin/newforms/raw/react/dist/newforms-0.9.1.min.js

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
   react_client
   custom_display
   forms
   fields
   validation
   widgets
   formsets
   locales
   forms_api
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