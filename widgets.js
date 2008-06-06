/**
 * An HTML form widget.
 *
 * @param {Object} attrs HTML attributes for the rendered widget.
 * @constructor
 */
function Widget(attrs)
{
    // Copy attributes
    this.attrs = extendObject({}, attrs || {});
}

/**
 * Determines whether this corresponds to an &lt;input type="hidden"&gt;.
 */
Widget.prototype.isHidden = false;

/**
 * Determines whether this widget needs a multipart-encrypted form.
 */
Widget.prototype.needsMultipartForm = false;

/**
 * Helper function for building an attribute dictionary.
 */
Widget.prototype.buildAttrs = function(extraAttrs, kwargs)
{
    var attrs = extendObject(extendObject(this.attrs, kwargs || {}),
                             extraAttrs || {});
    return attrs;
}

/**
 * Retrieves a value for this widget from the given data.
 *
 * @param {Object} data
 * @param {Object} files
 * @param {String} name
 *
 * @return a value for this widget, or <code>null</code> if no value was
 *         provided.
 */
Widget.prototype.valueFromData = function(data, files, name)
{
    if (typeof data[name] != "undefined")
    {
        return data[name];
    }
    return null;
};

/**
 * Determines the HTML <code>id</code> attribute of this Widget for use by a
 * <code>&lt;label&gt;</code>, given the id of the field.
 *
 * This hook is necessary because some widgets have multiple HTML elements and,
 * thus, multiple ids. In that case, this method should return an ID value that
 * corresponds to the first id in the widget's tags.
 *
 * @param {String} id a field id.
 *
 * @return the id which should be used by a <code>&lt;label&gt;</code> for this
 *         Widget.
 */
Widget.prototype.idForLabel = function(id)
{
    return id;
};

/**
 * An HTML <code>&lt;input&gt;</code> widget.
 *
 * @param {Object} attrs
 * @constructor
 */
function Input(attrs)
{
    Widget.call(this, attrs);
}

Input.prototype = new Widget();

/**
 * The type of this input.
 */
Input.prototype.inputType = null;

Input.prototype.render = function(name, value, attrs)
{
    var finalAttrs = this.buildAttrs(attrs, {type: this.inputType,
                                             name: name,
                                             value: value || ""});
    return DOMBuilder.createElement("input", finalAttrs);
};

/**
 * An HTML <code>&lt;input type="text"&gt;</code> widget.
 * @constructor
 */
function TextInput(attrs)
{
    Input.call(this, attrs);
}

TextInput.prototype = new Input();
TextInput.prototype.inputType = "text";

/**
 * An HTML <code>&lt;input type="password"&gt;</code> widget.
 *
 * @param {Object} [kwargs]
 * @config {Object} [attrs]
 * @config {Boolean} [renderValue]
 * @constructor
 */
function PasswordInput(kwargs)
{
    kwargs = extendObject({attrs: null, renderValue: true}, kwargs || {});
    Input.call(this, kwargs.attrs);
    this.renderValue = kwargs.renderValue;
}

PasswordInput.prototype = new Input();
PasswordInput.prototype.inputType = "password";

PasswordInput.prototype.render = function(name, value, attrs)
{
    if (!this.renderValue)
    {
        value = "";
    }
    return Input.prototype.render.call(this, name, value, attrs);
};

/**
 * An HTML <code>&lt;input type="hidden"&gt;</code> widget.
 *
 * @param {Object} attrs
 * @constructor
 */
function HiddenInput(attrs)
{
    Input.call(this, attrs);
}

HiddenInput.prototype = new Input();
HiddenInput.prototype.inputType = "hidden";
HiddenInput.prototype.isHidden = true;

// TODO MultipleHiddenInput

// TODO FileInput

/**
 * An HTML <code>&lt;textarea&gt;</code> widget.
 *
 * @param {Object} attrs
 * @constructor
 */
function Textarea(attrs)
{
    attrs = extendObject({cols: "40", rows: "10"}, attrs || {});
    Widget.call(this, attrs);
}

Textarea.prototype = new Widget();

Textarea.prototype.render = function(name, value, attrs)
{
    return DOMBuilder.createElement(
        "textarea", extendObject(attrs, {name: name}), [value || ""]);
};

// TODO DateTimeInput

// TODO CheckboxInput

/**
 * An HTML <code>&lt;select&gt;</code> widget.
 *
 * @param {Object} attrs
 * @constructor
 */
function Select(kwargs)
{
    kwargs = extendObject({
        choices: [], attrs: null
    }, kwargs || {});
    Widget.call(this, kwargs.attrs);
    this.choices = kwargs.choices;
}

Select.prototype = new Widget();

Select.prototype.render = function(name, value, attrs, choices)
{
    if (value === null)
    {
        value = "";
    }
    var finalAttrs = this.buildAttrs(attrs, {name: name});
    // Normalize to string
    var strValue = "" + value;
    var options = [];
    var finalChoices = this.choices.concat(choices || []);
    for (var i = 0, l = finalChoices.length; i < l; i++)
    {
        var optValue = "" + finalChoices[i][0];
        var optLabel = "" + finalChoices[i][1];
        var option =
            DOMBuilder.createElement("option", {value: optValue}, optLabel);
        if (optValue === strValue)
        {
            option.selected = true;
        }
        options[options.length] = option;
    }
    return DOMBuilder.createElement("select", finalAttrs, options);
};

// TODO NullBooleanSelect

// TODO SelectMultiple

// TODO RadioInput

// TODO RadioFieldRenderer

// TODO RadioSelect

// TODO CheckboxSelectMultiple

// TODO MultiWidget

// TODO SplitDateTimeWidget
