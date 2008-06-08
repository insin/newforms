from jsmin import jsmin

FORMS_FILES = ['../util.js', '../widgets.js', '../fields.js', '../forms.js']
MODULE_DEFINITION = 'module.js'
CODE_TEMPLATE = """var forms = function()
{

%(code)s
%(modules)s
}();"""

js = CODE_TEMPLATE % {
    'code': '\n'.join([open(f, 'r').read() for f in FORMS_FILES]),
    'modules': open(MODULE_DEFINITION).read(),
}

open('js-forms.js', 'w').write(js)
open('js-forms-min.js', 'w').write(jsmin(js))
