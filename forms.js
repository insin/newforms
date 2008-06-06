/**
 * A field and its associated data.
 *
 * @param {Form} form
 * @param {Field} field
 * @param {String} name
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
                // TODO Replace with %s formatting
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
 * Renders the field by rendering the passed widget, adding any HTML attributes
 * passed as attrs. If no widget is specified, then the field's default widget
 * will be used.
 *
 * @param {Object} [kwargs]
 * @config {Widget} widget
 * @config {Object} attrs
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
 * @param {Object} attrs
 */
BoundField.prototype.asHidden = function(attrs)
{
    return this.asWidget({widget: this.field.hiddenWidget(),
                          attrs: attrs || {}});
};

/**
 * Renders the field as a text input.
 *
 * @param {Object} attrs
 */
BoundField.prototype.asText = function(attrs)
{
    return this.asWidget({widget: new TextInput(),
                          attrs: attrs || {}});
};

/**
 * Renders the field as a textarea.
 *
 * @param {Object} attrs
 */
BoundField.prototype.asTextarea = function(attrs)
{
    return this.asWidget({widget: new Textarea(),
                          attrs: attrs || {}});
};

/**
 * @param {Object} [kwargs]
 * @config {Node} contents
 * @config {Object} attrs
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
        contents = document.createTextNode(this.label);
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
        contents = DOMBuilder.createElement(
            "label", {"for": widget.idForLabel(id)}, [contents]);
    }
    return contents;
};

/** Property under which non-field-specific errors are stored. */
NON_FIELD_ERRORS = '__all__';

/**
 * A collection of Fields that knows how to validate and display itself.
 *
 * @param {Object} [kwargs]
 * @config {Object} [data]
 * @config {Object} [files]
 * @config {String} [autoId]
 * @config {String} [prefix]
 * @config {Object} [initial]
 * @config {Function} [errorConstructor]
 * @config {String} [labelSuffix]
 * @constructor
 */
function Form(kwargs)
{
    kwargs = extendObject({
        data: null, files: null, autoId: "id_%s", prefix: null, initial: null,
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

Form.prototype =
{
    /**
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

Form.prototype.boundField = function(name)
{
    if (!this.fields.hasOwnProperty(name))
    {
        throw new Error("Form does not have a " + name + " field.");
    }
    return new BoundField(this, this.fields[name], name);
};

Form.prototype.boundFields = function(name)
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
    var boundFields = [];
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
    else
    {
        return fieldName;
    }
};

/**
 * Returns errors that aren't associated with a particular field.
 *
 * @return errors that aren't associated with a particular field -- i.e., from
 *         Form.clean(). Will be empty if there are none.
 * @type ErrorList
 */
Form.prototype.nonFieldErrors = function()
{
    var errors = this.errors;
    if (typeof errors[NON_FIELD_ERRORS] != "undefined")
    {
        return errors[NON_FIELD_ERRORS];
    }
    else
    {
        return new this.errorConstructor();
    }
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
            this._errors[NON_FIELD_ERRORS] = e.messages;
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
 * Hook for doing any extra form-wide cleaning after <code>Field.clean()</code>
 * has been called on every field. Any <code>ValidationError</code> raised by
 * this method will not be associated with a particular field; it will have a
 * special-case association with the field named <code>"__all__"</code>.
 *
 * @return cleaned, validated data.
 * @type Object
 */
Form.prototype.clean = function()
{
    return this.cleanedData;
};

/**
 * Determines if the form needs to be multipart-encrypted, in other words, if it
 * has a <code>FileInput</code>.
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
