'use strict';

var iframe = null
var html = null

function resizeIFrame() {
  if (iframe === null) {
    var iframes = window.parent.document.querySelectorAll('iframe')
    for (var i = 0, l = iframes.length; i < l ; i++) {
      if (window === iframes[i].contentWindow) {
        html = document.querySelector('html')
        iframe = iframes[i]
        break
      }
    }
  }
  iframe.style.height = html.offsetHeight + 'px'
}

module.exports = resizeIFrame