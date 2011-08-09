import os

VERSION = '0.0.3'
TIME_SOURCE_FILES = ('../src/time.js',)
FORMS_SOURCE_FILES = ('../src/util.js', '../src/validators.js',
                      '../src/widgets.js', '../src/fields.js',
                      '../src/models.js', '../src/forms.js',
                      '../src/formsets.js')

DIRNAME = os.path.abspath(os.path.dirname(__file__))
def jspath(p):
    return os.path.normpath(os.path.join(DIRNAME, p))

CODE_TEMPLATE = open(jspath('formsnamespace.js'), 'r').read()
MINIFIED_TEMPLATE = open(jspath('minified.js'), 'r').read()

def main():
    js = CODE_TEMPLATE % {
        'version': VERSION,
        'timecode': '\n'.join([open(jspath(f), 'r').read()
                               for f in TIME_SOURCE_FILES]),
        'formscode': '\n'.join([open(jspath(f), 'r').read()
                                for f in FORMS_SOURCE_FILES]),
    }
    open(jspath('../newforms.js'), 'w').write(js)
    open(jspath('../newforms.min.js'), 'w').write(MINIFIED_TEMPLATE % {
        'version': VERSION,
        'minifiedcode': google_closure_compress(js),
    })

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
