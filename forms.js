/**
 * @fileOverview Forms, which manage input and validation of input using a
 *               collection of Fields.
 */

/**
 * A field and its associated data.
 *
 * @param {Form} form a form.
 * @param {Field} field one of the form's fields.
 * @param {String} name the name under which the field is held in the form.
 * @constructor
 */
function BoundField(form, field, name)
{
    this.form = form;
    this.field = field;
    this.name = name;
    this.htmlName = form.addPrefix(name);
    if (this.field.label !== null)
    {
        this.label = this.field.label;
    }
    else
    {
        this.label = name.charAt(0).toUpperCase() + name.substr(1);
    }
    this.helpText = field.helpText || "";
}

BoundField.prototype =
{
    get errors()
    {
        return this.form.errors[this.name] || this.form.errorConstructor();
    },

    get isHidden()
    {
        return this.field.widget.isHidden;
    },

    /**
     * Calculates and returns the <code>id</code> attribute for this BoundFIeld if
     * the associated form has an autoId.
     */
    get autoId()
    {
        var autoId = this.form.autoId;
        if (autoId !== null)
        {
            if (autoId.indexOf("%(name)s") > -1)
            {
                return formatString(autoId, {name: this.htmlName});
            }
            else
            {
                return this.htmlName;
            }
        }
        return "";
    },

    get data()
    {
        return this.field.widget.valueFromData(this.form.data,
                                               this.form.files,
                                               this.htmlName);
    }
};

/**
 * Renders a widget for the field.
 *
 * @param {Object} [kwargs] configuration options
 * @config {Widget} [widget] an override for the widget used to render the field
 *                           - if not provided, the field's configured widget
 *                           will be used
 * @config {Object} [attrs] additional attributes to be added to the field's
 *                          widget.
 */
BoundField.prototype.asWidget = function(kwargs)
{
    kwargs = extendObject({widget: null, attrs: null}, kwargs || {});
    var widget = (kwargs.widget !== null ? kwargs.widget : this.field.widget);
    var attrs = kwargs.attrs || {};
    var autoId = this.autoId;

    if (autoId &&
        typeof attrs.id == "undefined" &&
        typeof widget.attrs.id == "undefined")
    {
        attrs.id = autoId;
    }

    var data;
    if (!this.form.isBound)
    {
        if (typeof this.form.initial[this.name] !== "undefined")
        {
            data = this.form.initial[this.name];
        }
        else
        {
            data = this.field.initial;
        }

        if (typeof(data) == "function")
        {
            data = data();
        }
    }
    else
    {
        data = this.data;
    }

    return widget.render(this.htmlName, data, attrs);
};

/**
 * Renders the field as a hidden field.
 *
 * @param {Object} [attrs] additional attributes to be added to the field's
 *                         widget.
 */
BoundField.prototype.asHidden = function(attrs)
{
    return this.asWidget({widget: this.field.hiddenWidget(),
                          attrs: attrs || {}});
};

/**
 * Renders the field as a text input.
 *
 * @param {Object} [attrs] additional attributes to be added to the field's
 *                         widget.
 */
BoundField.prototype.asText = function(attrs)
{
    return this.asWidget({widget: new TextInput(),
                          attrs: attrs || {}});
};

/**
 * Renders the field as a textarea.
 *
 * @param {Object} [attrs] additional attributes to be added to the field's
 *                         widget.
 */
BoundField.prototype.asTextarea = function(attrs)
{
    return this.asWidget({widget: new Textarea(),
                          attrs: attrs || {}});
};

/**
 * Creates an HTML <code>&lt;label&gt;</code> for the field.
 *
 * @param {Object} [kwargs] configuration options.
 * @config {String} [contents] contents for the label - if not provided, label
 *                             contents will be generated from the field itself.
 * @config {Object} [attrs] additional attributes to be added to the label.
 */
BoundField.prototype.labelTag = function(kwargs)
{
    kwargs = extendObject({contents: null, attrs: null}, kwargs || {});
    var contents;
    if (kwargs.contents !== null)
    {
        contents = kwargs.contents;
    }
    else
    {
        contents = this.label;
    }
    var widget = this.field.widget;
    var id;
    if (typeof widget.attrs.id  != "undefined")
    {
        id = widget.attrs.id;
    }
    else
    {
        id = this.autoId;
    }
    if (id)
    {
        var attrs = extendObject(kwargs.attrs || {},
                                 {"for": widget.idForLabel(id)});
        contents = DOMBuilder.createElement("label", attrs, [contents]);
    }
    return contents;
};

/**
 * A collection of Fields that knows how to validate and display itself.
 *
 * @param {Object} [kwargs] configuration options.
 * @config {Object} [data] input form data, where property names are field
 *                         names.
 * @config {Object} [files] input file data - this is meaningless on the
 *                          client-side, but is included for future use in any
 *                          future server-side implementation.
 * @config {String} [autoId] a template for use when automatically generating
 *                           <code>id</code> attributes for fields, which should
 *                           contain a <code>"%(name)s"</code> placeholder for
 *                           the field name - defaults to
 *                           <code>"id_%(name)s"</code>.
 * @config {String} [prefix] a prefix to be applied to the name of each field in
 *                           this instance of the form - using a prefix allows
 *                           you to easily work with multiple instances of the
 *                           same Form object in the same HTML
 *                           <code>&lt;form&gt;</code>, or to safely mix Form
 *                           objects which have fields with the same names.
 * @config {Object} [initial] initial form data, where property names are field
 *                            names - if a field's value is not specified in
 *                            <code>data</code>, these values will be used when
 *                            rendering field widgets.
 * @config {Function} [errorConstructor] the constructor function to be used
 *                                       when creating error details - defaults
 *                                       to {@link ErrorList}.
 * @config {String} [labelSuffix] a suffix to be used when generating labels
 *                                in one of the convenience method which renders
 *                                the entire Form - defaults to
 *                                <code>":"</code>.
 * @constructor
 */
function Form(kwargs)
{
    kwargs = extendObject({
        data: null, files: null, autoId: "id_%(name)s", prefix: null, initial: null,
        errorConstructor: ErrorList, labelSuffix: ":"
    }, kwargs || {});
    this.isBound = kwargs.data !== null || kwargs.files !== null;
    this.data = kwargs.data || {};
    this.files = kwargs.files || {};
    this.autoId = kwargs.autoId;
    this.prefix = kwargs.prefix;
    this.initial = kwargs.initial || {};
    this.errorConstructor = kwargs.errorConstructor;
    this.labelSuffix = kwargs.labelSuffix;
    this._errors = null; // Stores errors after clean() has been called

    // TODO Basefields/deep copying? Assume subclasses will set fields in their
    //      constructor for now, but is there a nice way to get anything like
    //      the more declarative syntax Python's metaclassing gives Django?

    // TODO Is there any hope of ever replacing __getitem__ properly?
    if (typeof this.fields != "undefined")
    {
        for (var name in this.fields)
        {
            if (!this.fields.hasOwnProperty(name))
            {
                continue;
            }

            this.__defineGetter__(name, (function(fieldName)
            {
                return function()
                {
                    return new BoundField(this,
                                          this.fields[fieldName],
                                          fieldName);
                };
            })(name));
        }
    }
}

/** Property under which non-field-specific errors are stored. */
Form.NON_FIELD_ERRORS = '__all__';

Form.prototype =
{
    /**
     * Getter for errors, which first cleans the form if there are no errors
     * defined yet.
     *
     * @return errors for the data provided for the form.
     * @type ErrorObject
     */
    get errors()
    {
        if (this._errors === null)
        {
            this.fullClean();
        }
        return this._errors;
    }
};

// TODO Come up with a suitable replacement for __iter__
//def __iter__(self):
//    for name, field in self.fields.items():
//        yield BoundField(self, field, name)

/**
 * Creates a {@link BoundField} for the field with the given name.
 *
 * @param {String} name a field name.
 *
 * @return a <code>BoundField</code> for the field with the given name, if one
 *         exists.
 * @type BoundField
 */
Form.prototype.boundField = function(name)
{
    if (!this.fields.hasOwnProperty(name))
    {
        throw new Error("Form does not have a " + name + " field.");
    }
    return new BoundField(this, this.fields[name], name);
};

/**
 * Creates a {@link BoundField} for each field in the form, ordering them
 * by the order in which the fields were created.
 *
 * @return a list of <code>BoundField</code> object - one for each field in the
 *         form, in the order in which the fields were created.
 * @type Array
 */
Form.prototype.boundFields = function()
{
    var fields = [];
    for (var name in this.fields)
    {
        if (this.fields.hasOwnProperty(name))
        {
            fields[fields.length] =
                new BoundField(this, this.fields[name], name);
        }
    }
    fields.sort(function(a, b)
    {
        return a.field.creationCounter - b.field.creationCounter;
    });
    return fields;
};

/**
 * Determines whether or not the form has errors.
 *
 * @return <code>true</code> if the form has no errors, <code>false</code>
 *         otherwise. If errors are being ignored, returns <code>false</code>.
 * @type Boolean
 */
Form.prototype.isValid = function()
{
    if (!this.isBound)
    {
        return false;
    }

    return !this.errors.isPopulated();
};

/**
 * Creates a field name with a prefix appended, if this Form has a prefix set.
 *
 * @param {String} fieldName a field name.
 *
 * @return a field name with a prefix appended, if this Form has a prefix set,
 *         otherwise <code>fieldName</code> is returned as-is.
 * @type String
 */
Form.prototype.addPrefix = function(fieldName)
{
    if (this.prefix !== null)
    {
        return formatString("%(prefix)s-%(fieldName)s",
                            {prefix: this.prefix, fieldName: fieldName});
    }
    return fieldName;
};

/**
 * Returns errors that aren't associated with a particular field.
 *
 * @return errors that aren't associated with a particular field - i.e., errors
 *         generated by <code>clean()</code>. Will be empty if there are none.
 * @type ErrorList
 */
Form.prototype.nonFieldErrors = function()
{
    var errors = this.errors;
    if (typeof errors[Form.NON_FIELD_ERRORS] != "undefined")
    {
        return errors[Form.NON_FIELD_ERRORS];
    }
    return new this.errorConstructor();
};

/**
 * Cleans all of <code>data</code> and populates <code>_errors</code> and
 * <code>cleanedData</code>.
 */
Form.prototype.fullClean = function()
{
    this._errors = new ErrorObject();
    if (!this.isBound)
    {
        // Stop further processing
        return;
    }

    this.cleanedData = {};
    for (var name in this.fields)
    {
        if (!this.fields.hasOwnProperty(name))
        {
            continue;
        }

        var field = this.fields[name];
        var value = field.widget.valueFromData(this.data, this.files,
                                               this.addPrefix(name));
        try
        {
            if (field instanceof FileField)
            {
                var initial;
                if (typeof this.initial[name] != "undefined")
                {
                    initial = this.initial[name];
                }
                else
                {
                    initial = field.initial;
                }
                value = field.clean(value, initial);
            }
            else
            {
                value = field.clean(value);
            }
            this.cleanedData[name] = value;
            var customClean =
                "clean" + name.charAt(0).toUpperCase() + name.substr(1);
            if (typeof this[customClean] == "function")
            {
                this.cleanedData[name] = this[customClean]();
            }
        }
        catch (e)
        {
            if (e instanceof ValidationError)
            {
                this._errors[name] = e.messages;
                if (typeof this.cleanedData[name] != "undefined")
                {
                    delete this.cleanedData[name];
                }
            }
            else
            {
                throw e;
            }
        }
    }

    try
    {
        this.cleanedData = this.clean();
    }
    catch (e)
    {
        if (e instanceof ValidationError)
        {
            this._errors[Form.NON_FIELD_ERRORS] = e.messages;
        }
        else
        {
            throw e;
        }
    }

    if (this._errors.isPopulated())
    {
        delete this.cleanedData;
    }
};

/**
 * Hook for doing any extra form-wide cleaning after each Field's
 * <code>clean()</code> has been called. Any {@link ValidationError} raised by
 * this method will not be associated with a particular field; it will have a
 * special-case association with the field named <code>"__all__"</code>.
 *
 * @return validated, cleaned data.
 * @type Object
 */
Form.prototype.clean = function()
{
    return this.cleanedData;
};

/**
 * Determines if the form needs to be multipart-encrypted, in other words, if it
 * has a {@link FileInput}.
 *
 * @return <code>true</code> if the form needs to be multipart-encrypted,
 *         <code>false</code> otherwise.
 * @type Boolean
 */
Form.prototype.isMultipart = function()
{
    for (var name in this.fields)
    {
        if (this.fields.hasOwnProperty(name))
        {
            if (this.fields[name].needsMultipartForm)
            {
                return true;
            }
        }
    }
    return false;
};

// TODO Form.prototype.asTable
// TODO Form.prototype.asUL
// TODO Form.prototype.asP
