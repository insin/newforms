import os

DIRNAME = os.path.dirname(__file__)
TIME_SOURCE_FILES = ('../src/time.js',)
FORMS_SOURCE_FILES = ('../src/util.js', '../src/validators.js',
                      '../src/widgets.js', '../src/fields.js',
                      '../src/forms.js', '../src/formsets.js')
FORMS_NAMESPACE = 'formsnamespace.js'
CODE_TEMPLATE = """(function(__global__, undefined)
{

// Pull in dependencies appropriately depending on the execution environment
var modules = (typeof module !== 'undefined' && module.exports);
var DOMBuilder = modules ? require('DOMBuilder') : __global__.DOMBuilder;

%(timecode)s
%(formscode)s
%(formsnamepace)s
})(this);"""

def main():
    js = CODE_TEMPLATE % {
        'timecode': '\n'.join([open(os.path.normpath(f), 'r').read()
                               for f in TIME_SOURCE_FILES]),
        'formscode': '\n'.join([open(os.path.normpath(f), 'r').read()
                                for f in FORMS_SOURCE_FILES]),
        'formsnamepace': open(os.path.normpath(FORMS_NAMESPACE), 'r').read(),
    }

    open('../js-forms.js', 'w').write(js)
    open('../js-forms.min.js', 'w').write(google_closure_compress(js))

def google_closure_compress(js):
    """Optimises and compresses with the Google Closure compiler."""
    import httplib, urllib, sys
    params = urllib.urlencode([
        ('js_code', js),
        ('compilation_level', 'SIMPLE_OPTIMIZATIONS'),
        ('output_format', 'text'),
        ('output_info', 'compiled_code'),
      ])
    headers = { "Content-type": "application/x-www-form-urlencoded" }
    conn = httplib.HTTPConnection('closure-compiler.appspot.com')
    conn.request('POST', '/compile', params, headers)
    response = conn.getresponse()
    return response.read()

if __name__ == '__main__':
    main()
