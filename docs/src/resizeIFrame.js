'use strict';

function resizeIFrame() {
  // Find this frame ub the parent document
  var iframes = window.parent.document.querySelectorAll('iframe')
  for (var i = 0, l = iframes.length; i < l ; i++) {
    if (window === iframes[i].contentWindow) {
      var html = document.querySelector('html')
      iframes[i].style.height = html.scrollHeight + 'px'
      return
    }
  }
}

module.exports = resizeIFrame