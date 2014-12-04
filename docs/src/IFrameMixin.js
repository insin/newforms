'use strict';

var resizeIFrame = require('./resizeIFrame')

var IFrameMixin = {
  componentDidMount: function() {
    resizeIFrame()
  },

  componentDidUpdate: function(prevProps, prevState) {
    resizeIFrame()
  },

  /**
   * Forces an update to rezise the iframe - required for demos which use the
   * components newforms provides, to hook into state changes.
   */
  forceResizeIFrame: function() {
    this.forceUpdate()
  }
}

module.exports = IFrameMixin