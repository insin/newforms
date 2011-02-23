import optparse
import os

DIRNAME = os.path.dirname(__file__)
TIME_SOURCE_FILES = ('../time.js',)
FORMS_SOURCE_FILES = ('../util.js', '../validators.js', '../widgets.js', '../fields.js',
                      '../forms.js', '../formsets.js')
FORMS_NAMESPACE = 'formsnamespace.js'
CODE_TEMPLATE = """%(timenamespace)s

(function()
{
%(formscode)s
%(formsnamepace)s
})();"""

def main(generate_api=False, jsdoc_dir=None):
    js = CODE_TEMPLATE % {
        'timenamespace': '\n'.join([open(os.path.normpath(f), 'r').read()
                                    for f in TIME_SOURCE_FILES]),
        'formscode': '\n'.join([open(os.path.normpath(f), 'r').read()
                                for f in FORMS_SOURCE_FILES]),
        'formsnamepace': open(os.path.normpath(FORMS_NAMESPACE), 'r').read(),
    }

    if not os.path.isdir('out'):
        os.mkdir('out')

    open('out/js-forms.js', 'w').write(js)
    open('out/js-forms-min.js', 'w').write(google_closure(js))

    if generate_api and jsdoc_dir:
        os.system('java -jar %(jsdoc_jar)s %(jsdoc_app)s -a -t=%(jsdoc_templates)s -d=%(api_dir)s %(js_dir)s' % {
            'jsdoc_jar': os.path.normpath(os.path.join(jsdoc_dir, 'jsrun.jar')),
            'jsdoc_app': os.path.normpath(os.path.join(jsdoc_dir, 'app/run.js')),
            'jsdoc_templates': os.path.normpath(os.path.join(jsdoc_dir, 'templates/jsdoc')),
            'api_dir': os.path.normpath(os.path.join(DIRNAME, 'out/api')),
            'js_dir': os.path.normpath(os.path.join(DIRNAME, '..')),
        })

def google_closure(js):
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
    parser = optparse.OptionParser();
    parser.add_option('-a', '--api', action='store_true', dest='generate_api',
                      default=False,
                      help="generate API documentation (requires JsDoc Toolkit "
                            "- http://code.google.com/p/jsdoc-toolkit/)")
    parser.add_option('-j', '--jsdoc', dest='jsdoc_dir', default=None,
                      help="JsDoc Toolkit directory")
    (options, args) = parser.parse_args()
    main(options.generate_api, options.jsdoc_dir)
