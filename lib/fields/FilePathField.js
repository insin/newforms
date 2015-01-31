'use strict';

var object = require('isomorph/object')

var ChoiceField = require('./ChoiceField')

/**
 * Allows choosing from files inside a certain directory.
 * @constructor
 * @extends {ChoiceField}
 * @param {string} path
 * @param {Object=} kwargs
 */
var FilePathField = ChoiceField.extend({
  constructor: function FilePathField(path, kwargs) {
    if (!(this instanceof FilePathField)) { return new FilePathField(path, kwargs) }
    kwargs = object.extend({
      match: null, recursive: false, required: true, widget: null,
      label: null, initial: null, helpText: null,
      allowFiles: true, allowFolders: false
    }, kwargs)

    this.path = path
    this.match = object.pop(kwargs, 'match')
    this.recursive = object.pop(kwargs, 'recursive')
    this.allowFiles = object.pop(kwargs, 'allowFiles')
    this.allowFolders = object.pop(kwargs, 'allowFolders')
    delete kwargs.match
    delete kwargs.recursive

    kwargs.choices = []
    ChoiceField.call(this, kwargs)

    if (this.required) {
      this.setChoices([])
    }
    else {
      this.setChoices([['', '---------']])
    }

    if (this.match !== null) {
      this.matchRE = new RegExp(this.match)
    }

    // TODO Plug in file paths when running on the server

    this.widget.choices = this.choices()
  }
})

module.exports = FilePathField