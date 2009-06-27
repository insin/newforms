/**
 * @fileOverview Forms, which manage input and validation of input using a
 *               collection of Fields.
 */

/**
 * Converts "firstName" and "first_name" to "First name", and
 * "SHOUTING_LIKE_THIS" to "SHOUTING LIKE THIS".
 */
var prettyName = (function()
{
    var capsRE = /([A-Z]+)/g;
    var splitRE = /[ _]+/;
    var trimRE = /(^ +| +$)/g;
    var allCapsRE = /^[A-Z][A-Z0-9]+$/;

    return function(name)
    {
        // Prefix sequences of caps with spaces and split on all space
        // characters.
        var parts = name.replace(capsRE, " $1").split(splitRE);

        // If we had an initial cap...
        if (parts[0] === "")
        {
            parts.splice(0, 1);
        }

        // Give the first word an initial cap and all subsequent words an
        // initial lowercase if not all caps.
        for (var i = 0, l = parts.length; i < l; i++)
        {
            if (i == 0)
            {
                parts[0] = parts[0].charAt(0).toUpperCase() +
                           parts[0].substr(1);
            }
            else if (!allCapsRE.test(parts[i]))
            {
                parts[i] = parts[i].charAt(0).toLowerCase() +
                           parts[i].substr(1);
            }
        }

        return parts.join(" ");
    };
})();

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
        this.label = prettyName(name);
    }
    this.helpText = field.helpText || "";
}

BoundField.prototype =
{
    get errors()
    {
        return this.form.errors[this.name] || new this.form.errorConstructor();
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
        if (autoId)
        {
            autoId = ""+autoId;
            if (autoId.indexOf("%(name)s") != -1)
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
    return this.asWidget({widget: new this.field.hiddenWidget(),
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
 * Assuming this method will only be used when DOMBuilder is configured to
 * generate HTML.
 */
BoundField.prototype.toString = function()
{
    return ""+this.asWidget();
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
 * @config {Boolean} [emptyPermitted] if <code>true</code>, the form is allowed
 *                                    to be empty - defaults to
 *                                    <code>false</code>.
 * @constructor
 */
function Form(kwargs)
{
    kwargs = extendObject({
        data: null, files: null, autoId: "id_%(name)s", prefix: null, initial: null,
        errorConstructor: ErrorList, labelSuffix: ":", emptyPermitted: false
    }, kwargs || {});
    this.isBound = kwargs.data !== null || kwargs.files !== null;
    this.data = kwargs.data || {};
    this.files = kwargs.files || {};
    this.autoId = kwargs.autoId;
    this.prefix = kwargs.prefix;
    this.initial = kwargs.initial || {};
    this.errorConstructor = kwargs.errorConstructor;
    this.labelSuffix = kwargs.labelSuffix;
    this.emptyPermitted = kwargs.emptyPermitted;
    this._errors = null; // Stores errors after clean() has been called
    this._changedData = null;

    // TODO Basefields/deep copying? Assume subclasses will set fields in their
    //      constructor for now, but is there a nice way to get anything like
    //      the more declarative syntax Python's metaclassing gives Django?

    // TODO Is there any hope of ever replacing __getitem__ properly?
    /*
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
    */
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
    },

    get changedData()
    {
        if (this._changedData === null)
        {
            this._changedData = [];
            // XXX: For now we're asking the individual fields whether or not
            // the data has changed. It would probably be more efficient to hash
            // the initial data, store it in a hidden field, and compare a hash
            // of the submitted data, but we'd need a way to easily get the
            // string value for a given field. Right now, that logic is embedded
            // in the render method of each field's widget.
            for (var name in this.fields)
            {
                if (!this.fields.hasOwnProperty(name))
                {
                    continue;
                }

                var field = this.fields[name];
                var prefixedName = this.addPrefix(name);
                var dataValue = field.widget.valueFromData(this.data,
                                                           this.files,
                                                           prefixedName);
                var initialValue;
                if (typeof this.initial[name] != "undefined")
                {
                    initialValue = this.initial[name];
                }
                else
                {
                    initialValue = field.initial;
                }

                if (field._hasChanged(initialValue, dataValue))
                {
                    this._changedData.push(name);
                }
            }
        }
        return this._changedData;
    }

    // TODO get media()
};

// TODO Come up with a suitable replacement for __iter__
//def __iter__(self):
//    for name, field in self.fields.items():
//        yield BoundField(self, field, name)

/* The yield keyword is only available in Firefox - adding the necessary
   ;version=1.7 to the script tag breaks other browsers, so leave be for now.
Form.prototype.__iterator__ = function()
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

    for (var i = 0, l = fields.length; i < l; i++)
    {
        yield fields[i];
    }
};
*/

Form.prototype.toString = function()
{
    return ""+this.asTable();
};

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
 * @param {Function} [test] if provided, this function will be called with
 *                          "field" and "name" arguments - BoundFields will
 *                          only  be generated for fields for which
 *                          <code>true</code> is returned.
 *
 * @return a list of <code>BoundField</code> objects - one for each field in
 *         the form, in the order in which the fields were created.
 * @type Array
 */
Form.prototype.boundFields = function(test)
{
    test = test || function() { return true; };

    var fields = [];
    for (var name in this.fields)
    {
        if (this.fields.hasOwnProperty(name) &&
            test(this.fields[name], name) === true)
        {
            fields.push(new BoundField(this, this.fields[name], name));
        }
    }
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
 * Returns the field name with a prefix appended, if this Form has a prefix set.
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

// TODO Form.addInitialPrefix

/**
 * Helper function for outputting HTML.
 *
 * @param {Function} normalRow a function which produces a normal row.
 * @param {Function} errorRow a function which produces an error row.
 * @param {Boolean} errorsOnSeparateRow determines if errors are placed in their
 *                                      own row, or in the row for the field
 *                                      they are related to.
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 *
 * @return if we're operating in DOM mode returns a list of DOM elements
 *         representing rows, otherwise returns an HTML string, with rows
 *         separated by linebreaks.
 */
Form.prototype._htmlOutput = function(normalRow, errorRow, errorsOnSeparateRow, doNotCoerce)
{
    var topErrors = this.nonFieldErrors();
    var rows = []
    var hiddenFields = [];

    var hiddenBoundFields = this.hiddenFields();
    for (var i = 0, l = hiddenBoundFields.length; i < l; i++)
    {
        var bf = hiddenBoundFields[i];
        var bfErrors = bf.errors;
        if (bfErrors.isPopulated())
        {
            for (var j = 0, m = bfErrors.errors.length; j < m; j++)
            {
                topErrors.errors.push("(Hidden field " + bf.name + ") " +
                                      bfErrors.errors[j]);
            }
        }
        hiddenFields.push(bf.asWidget());
    }

    var visibleBoundFields = this.visibleFields();
    for (var i = 0, l = visibleBoundFields.length; i < l; i++)
    {
        var bf = visibleBoundFields[i];

        // Variables which can be optional in each row
        var errors = null, label = null, helpText = null, extraContent = null;

        var bfErrors = bf.errors;
        if (bfErrors.isPopulated())
        {
            errors = new this.errorConstructor();
            for (var j = 0, m = bfErrors.errors.length; j < m; j++)
            {
                errors.errors.push(bfErrors.errors[j]);
            }

            if (errorsOnSeparateRow === true)
            {
                rows.push(errorRow(errors.asUL()));
                errors = null;
            }
        }

        if (bf.label)
        {
            var isSafe = DOMBuilder.isSafe(bf.label);
            label = ""+bf.label;

            // Only add the suffix if the label does not end in punctuation
            if (this.labelSuffix &&
                ":?.!".indexOf(label.charAt(label.length - 1)) == -1)
            {
                label += this.labelSuffix;
            }

            if (isSafe)
            {
                label = DOMBuilder.markSafe(label);
            }
            label = bf.labelTag({contents: label}) || "";
        }

        if (bf.field.helpText)
        {
            helpText = bf.field.helpText;
        }

        // If this is the last row, it should include any hidden fields
        if (i == l - 1 && hiddenFields.length > 0)
        {
            extraContent = hiddenFields;
        }

        if (errors !== null)
        {
            errors = errors.asUL();
        }

        rows.push(normalRow(label, bf.asWidget(), helpText, errors, extraContent));
    }

    if (topErrors.isPopulated())
    {
        // Add hidden fields to the top error row if it's being displayed and
        // there are no other rows.
        var extraContent = null;
        if (hiddenFields.length > 0 && rows.length == 0)
        {
            extraContent = hiddenFields;
        }
        rows.splice(0, 0, errorRow(topErrors.asUL(), extraContent));
    }

    // Put hidden fields in their own error row if there were no rows to
    // display.
    if (hiddenFields.length > 0 && rows.length == 0)
    {
        rows.push(errorRow("", hiddenFields));
    }

    if (doNotCoerce === true || DOMBuilder.mode == "DOM")
    {
        return rows;
    }
    else
    {
        return rows.join("\n");
    }
};

/**
 * Returns this form rendered as HTML &lt;tr&gt;s - excluding the
 * &lt;table&gt;&lt;/table&gt;.
 *
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 */
Form.prototype.asTable = function(doNotCoerce)
{
    var normalRow = function(label, field, helpText, errors, extraContent)
    {
        var contents = [];
        if (errors)
        {
            contents.push(errors);
        }
        contents.push(field);
        if (helpText)
        {
            contents.push(DOMBuilder.createElement("br"));
            contents.push(helpText);
        }
        if (extraContent)
        {
            contents = contents.concat(extraContent);
        }

        return DOMBuilder.createElement("tr", {}, [
          DOMBuilder.createElement("th", {}, [label]),
          DOMBuilder.createElement("td", {}, contents)
        ]);
    };

    var errorRow = function(errors, extraContent)
    {
        var contents = [errors];
        if (extraContent)
        {
            contents = contents.concat(extraContent);
        }
        return DOMBuilder.createElement("tr", {}, [
          DOMBuilder.createElement("td", {colSpan: 2}, contents)
        ]);
    }

    return this._htmlOutput(normalRow, errorRow, false, doNotCoerce);
};

/**
 * Returns this form rendered as HTML &lt;li&gt;s - excluding the
 * &lt;ul&gt;&lt;/ul&gt;.
 *
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 */
Form.prototype.asUL = function(doNotCoerce)
{
    var normalRow = function(label, field, helpText, errors, extraContent)
    {
        var contents = [];
        if (errors)
        {
            contents.push(errors);
        }
        if (label)
        {
            contents.push(label);
        }
        contents.push(" ");
        contents.push(field);
        if (helpText)
        {
            contents.push(" ");
            contents.push(helpText);
        }
        if (extraContent)
        {
            contents = contents.concat(extraContent);
        }

        return DOMBuilder.createElement("li", {}, contents);
    };

    var errorRow = function(errors, extraContent)
    {
        var contents = [errors];
        if (extraContent)
        {
            contents = contents.concat(extraContent);
        }
        return DOMBuilder.createElement("li", {}, contents);
    }

    return this._htmlOutput(normalRow, errorRow, false, doNotCoerce);
};

/**
 * Returns this form rendered as HTML &lt;p&gt;s.
 *
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 */
Form.prototype.asP = function(doNotCoerce)
{
    var normalRow = function(label, field, helpText, errors, extraContent)
    {
        var contents = [];
        if (label)
        {
            contents.push(label);
        }
        contents.push(" ");
        contents.push(field);
        if (helpText)
        {
            contents.push(" ");
            contents.push(helpText);
        }
        if (extraContent)
        {
            contents = contents.concat(extraContent);
        }

        return DOMBuilder.createElement("p", {}, contents);
    };

    var errorRow = function(errors, extraContent)
    {
        if (extraContent)
        {
            // When provided extraContent is usually hidden fields, so we need
            // to give it a block scope wrapper in this case for HTML validity.
            return DOMBuilder.createElement("div", {}, [errors].concat(extraContent));
        }
        // Otherwise, just display errors as they are
        return errors;
    }

    return this._htmlOutput(normalRow, errorRow, true, doNotCoerce);
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
 * Returns the raw value for a particular field name. This is just a convenient
 * wrapper around widget.valueFromData.
 */
Form.prototype._rawValue = function(fieldname)
{
    var field = this.fields[fieldname];
    var prefix = this.addPrefix(fieldname);
    return field.widget.valueFromData(this.data, this.files, prefix);
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

    // If the form is permitted to be empty, and none of the form data has
    // changed from the initial data, short circuit any validation.
    if (this.emptyPermitted && !this.hasChanged())
    {
        return;
    }

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

            // Try clean_name
            var customClean = "clean_" + name;
            if (typeof this[customClean] == "function")
            {
                 this.cleanedData[name] = this[customClean]();
                 continue;
            }

            // Try cleanName
            customClean =
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
 * Determines if data differs from initial.
 *
 * @type Boolean
 */
Form.prototype.hasChanged = function()
{
    return (this.changedData.length != 0);
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
            if (this.fields[name].widget.needsMultipartForm)
            {
                return true;
            }
        }
    }
    return false;
};

/**
 * Returns a list of all the {@link BoundField} objects that correspond to
 * hidden fields. Useful for manual form layout.
 *
 * @type Array
 */
Form.prototype.hiddenFields = function()
{
    return this.boundFields(function(field)
    {
        return field.widget.isHidden;
    });
};

/**
 * Returns a list of {@link BoundField} objects that do not correspond to
 * hidden fields. The opposite of the hiddenFields() method.
 *
 * @type Array
 */
Form.prototype.visibleFields = function()
{
    return this.boundFields(function(field)
    {
        return !field.widget.isHidden;
    });
};

/**
 * Creates a new form constructor, eliminating some of the steps required when
 * manually defining a new form class and wiring up convenience hooks into the
 * form initialisation process.
 *
 * @param {Object} kwargs arguments defining options for the created Form
 *                        constructor - all arguments other than those defined
 *                        below will be added to the new form constructor's
 *                        prototype, so this object can also be used to define
 *                        new methods on the resulting form, such as custom
 *                        <code>clean</code> and <code>cleanFIELD_NAME</code>
 *                        methods.
 * @config {Function} fields a function which returns an object containing form
 *                           fields, which will be invoked each time a new form
 *                           instance is created - an Error will be thrown if
 *                           this Function is not provided.
 * @config {Function} [form] the Form constructor which will provide the
 *                           prototype for the new Form constructor - defaults
 *                           to {@link Form}.
 * @config {Function} [preInit] if provided, this function will be invoked with
 *                              any keyword arguments which are passed when a
 *                              new instance of the form is being created,
 *                              before fields have been created and the
 *                              prototype constructor called - if a value is
 *                              returned from the function, it will be used as
 *                              the kwargs object for further processing, so
 *                              typical usage of this function would be to set
 *                              default kwarg arguments or pop and store kwargs
 *                              as properties of the form object being created.
 * @config {Function} [postInit] if provided, this function will be invoked with
 *                               any keyword arguments which are passed when a
 *                               new instance of the form is being created,
 *                               after fields have been created and the
 *                               prototype constructor called - typical usage of
 *                               this function would be to dynamically alter the
 *                               form fields which have just been created or to
 *                               add/remove fields.
 * @type Function
 */
function formFactory(kwargs)
{
    if (typeof kwargs.fields != "function")
    {
        throw new Error("You must provide a function named 'fields'");
    }

    kwargs = extendObject({
       form: Form, preInit: null, postInit: null
    }, kwargs || {});

    // Create references to special functions which will be closed over by the
    // new form constructor.
    var form = kwargs.form;
    var createFields = kwargs.fields;
    var preInit = kwargs.preInit;
    var postInit = kwargs.postInit;

    /** @ignore */
    var formConstructor = function(kwargs)
    {
        if (preInit !== null)
        {
            // If the preInit function returns anything, use the returned value
            // as the kwargs object for further processing.
            kwargs = preInit.call(this, kwargs) || kwargs;
        }

        // Any pre-existing fields will have been created by a form which uses
        // this form as its base. As such, pre-existing fields should overwrite
        // any fields with the same name and pre-existing fields with new names
        // should appear after fields created by this form.
        this.fields = extendObject(createFields.call(this), this.fields || {});

        // Tell whatever number of parents we have to do their instantiation bit
        if (form instanceof Array)
        {
            // We loop backwards because fields are instantiated "bottom up"
            for (var i = form.length - 1; i >= 0; i--)
            {
                form[i].call(this, kwargs);
            }
        }
        else
        {
            form.call(this, kwargs);
        }

        if (postInit !== null)
        {
            postInit.call(this, kwargs);
        }
    };

    // Remove special functions from kwargs, as they will now be used to add
    // properties to the prototype.
    delete kwargs.form;
    delete kwargs.fields;
    delete kwargs.preInit;
    delete kwargs.postInit;

    if (form instanceof Array)
    {
        // *Really* inherit from the first Form we were passed
        formConstructor.prototype = new form[0]();
        // Borrow methods from any additional Forms this is a bit of a hack to
        // fake multiple inheritance. We can only use instanceof for the form we
        // really inherited from, but we can access methods from all our
        // parents.
        for (var i = 1, l = form.length; i < l; i++)
        {
            extendObject(formConstructor.prototype, form[i].prototype);
        }
        // Anything else defined in kwargs should take precedence
        extendObject(formConstructor.prototype, kwargs);
    }
    else
    {
        formConstructor.prototype = extendObject(new form(), kwargs);
    }

    return formConstructor;
}
