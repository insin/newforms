/**
 * An HTML form widget.
 *
 * @param {Object} [attrs] HTML attributes for the rendered widget.
 * @constructor
 */
function Widget(attrs)
{
    // Copy attributes to a new Object
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
};

/**
 * Retrieves a value for this widget from the given data.
 *
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {String} name the field name to be used to retrieve data.
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
 * @param {Object} [attrs] HTML attributes for the rendered widget.
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
    value = value || "";
    var finalAttrs = this.buildAttrs(attrs, {type: this.inputType,
                                             name: name});
    if (value != "")
    {
        // Only add the "value" attribute if value is non-empty
        finalAttrs.value = value;
    }
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
 * @param {Object} [kwargs] configuration options
 * @config {Object} [attrs] HTML attributes for the rendered widget.
 * @config {Boolean} [renderValue] if <code>false</code> a value will not be
 *                                 rendered for this field - defaults to
 *                                 <code>true</code>
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
 * @param {Object} [attrs] HTML attributes for the rendered widget.
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

/**
 * An HTML <code>&lt;input type="file"&gt;</code> widget.
 *
 * @param {Object} [attrs] HTML attributes for the rendered widget.
 * @constructor
 */
function FileInput(attrs)
{
    Input.call(this, attrs);
}

FileInput.prototype = new Input();
FileInput.prototype.inputType = "file";
FileInput.prototype.needsMultiPartForm = true;

FileInput.prototype.render = function(name, value, attrs)
{
    return Input.prototype.render.call(this, name, null, attrs);
};

/**
 * File widgets take data from <code>files</code>, not <code>data</code>.
 */
FileInput.prototype.valueFromData = function(data, files, name)
{
    if (typeof files[name] != "undefined")
    {
        return files[name];
    }
    return null;
};

/**
 * An HTML <code>&lt;textarea&gt;</code> widget.
 *
 * @param {Object} [attrs] HTML attributes for the rendered widget.
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

/**
 * An HTML <code>&lt;input type="checkbox"&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options
 * @config {Object} [attrs] HTML attributes for the rendered widget.
 * @config {Function} [checkTest] a function which takes a value and returns
 *                                <code>true</code> if the checkbox should be
 *                                checked for that value.
 * @constructor
 */
function CheckboxInput(kwargs)
{
    kwargs = extendObject({
        args: null, checkTest: Boolean
    }, kwargs || {});
    Widget.call(this, kwargs);
    this.checkTest = kwargs.checkTest;
}

CheckboxInput.prototype = new Widget();

CheckboxInput.prototype.render = function(name, value, attrs)
{
    var result;
    try
    {
        result = this.checkTest(value);
    }
    catch (e)
    {
        // Silently catch exceptions
        result = false;
    }

    var finalAttrs = this.buildAttrs(attrs, {type: "checkbox", name: name});
    if (result)
    {
        finalAttrs.checked = true;
    }
    if (value !== "" && value !== true && value !== false && value !== null &&
        value !== undefined)
    {
        // Only add the "value" attribute if value is non-empty
        finalAttrs.value = value;
    }

    return DOMBuilder.createElement("input", finalAttrs);
};

CheckboxInput.prototype.valueFromData = function(data, files, name)
{
    if (typeof data[name] == "undefined")
    {
        // A missing value results in false because nothing is sent for
        // unchecked checkboxes when submitting HTML forms. See
        // http://www.w3.org/TR/html4/interact/forms.html#h-17.13.3.1
        return false;
    }
    return Widget.prototype.valueFromData.call(this, data, files, name);
};

/**
 * An HTML <code>&lt;select&gt;</code> widget.
 *
 * @param {Object} kwargs configuration options.
 * @config {Array} [choices] choices to be used when rendering the widget,
 *                           with each choice specified as an <code>Array</code>
 *                           in <code>[value, text]</code> format.
 * @config {Object} [attrs] HTML attributes for the rendered widget.
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

/**
 * Renders the widget.
 *
 * @param {String} name the field name.
 * @param selectedValue the value of an option which should be marked as
 *                      selected, or <code>null</code> if no value is selected -
 *                      will be normalised to a <code>String</code> for
 *                      comparison with choice values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 * @param {Array} [choices] choices to be used when rendering the widget, in
 *                          addition to those already held by the widget itself.
 *
 * @return a <code>&lt;select&gt;</code> element.
 */
Select.prototype.render = function(name, selectedValue, attrs, choices)
{
    if (selectedValue === null)
    {
        selectedValue = "";
    }
    var finalAttrs = this.buildAttrs(attrs, {name: name});
    // Normalise to string
    var stringValue = "" + selectedValue;
    var options = [];
    var finalChoices = this.choices.concat(choices || []);
    for (var i = 0, l = finalChoices.length; i < l; i++)
    {
        var optValue = "" + finalChoices[i][0];
        var optLabel = "" + finalChoices[i][1];
        var option =
            DOMBuilder.createElement("option", {value: optValue}, optLabel);
        if (optValue === stringValue)
        {
            option.selected = true;
        }
        options[options.length] = option;
    }
    return DOMBuilder.createElement("select", finalAttrs, options);
};

/**
 * A <code>Select</code> <code>Widget</code> intended to be used with
 * <code>NullBooleanField</code>.
 *
 * @param {Object} [attrs] HTML attributes for the rendered widget.
 * @constructor
 */
function NullBooleanSelect(attrs)
{
    var choices = [["1", "Unknown"], ["2", "Yes"], ["3", "No"]];
    Select.call(this, {choices: choices, attrs: attrs});
};

NullBooleanSelect.prototype = new Select();

NullBooleanSelect.prototype.render = function(name, value, attrs, choices)
{
    if (value === true || value == "2")
    {
        value = "2";
    }
    else if (value === false || value == "3")
    {
        value = "3";
    }
    else
    {
        value = "1";
    }
    return Select.prototype.render.call(this, name, value, attrs, choices);
};

NullBooleanSelect.prototype.valueFromData = function(data, files, name)
{
    var value = null;
    if (typeof data[name] != "undefined")
    {
        var dataValue = data[name];
        if (dataValue === true || dataValue == "2")
        {
            value = true;
        }
        else if (dataValue === false || dataValue == "3")
        {
            value = false;
        }
    }
    return value;
};

/**
 * An HTML <code>&lt;select&gt;</code> widget which allows multiple selections.
 *
 * @param {Object} kwargs configuration options.
 * @config {Array} [choices] choices to be used when rendering the widget,
 *                           with each choice specified as an <code>Array</code>
 *                           in <code>[value, text]</code> format.
 * @config {Object} [attrs] HTML attributes for the rendered widget.
 * @constructor
 */
function SelectMultiple(kwargs)
{
    kwargs = extendObject({
        choices: [], attrs: null
    }, kwargs || {});
    Widget.call(this, kwargs.attrs);
    this.choices = kwargs.choices;
}

SelectMultiple.prototype = new Widget();

/**
 * Renders the widget.
 *
 * @param {String} name the field name.
 * @param {Array} selectedValues the values of options which should be marked as
 *                               selected, or <code>null</code> if no values
 *                               are selected - these will be normalised to
 *                               <code>String</code>s for comparison with choice
 *                               values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 * @param {Array} [choices] choices to be used when rendering the widget, in
 *                          addition to those already held by the widget itself.
 *
 * @return a <code>&lt;select&gt;</code> element which allows multiple
 *         selections.
 */
SelectMultiple.prototype.render = function(name, selectedValues, attrs, choices)
{
    if (selectedValues === null)
    {
        selectedValues = [];
    }
    var finalAttrs = this.buildAttrs(attrs, {name: name, multiple: true});
    // Normalise to strings
    var selectedValuesLookup = {};
    for (var i = 0, l = selectedValues.length; i < l; i++)
    {
        selectedValuesLookup["" + selectedValues[i]] = true;
    }
    var options = [];
    var finalChoices = this.choices.concat(choices || []);
    for (var i = 0, l = finalChoices.length; i < l; i++)
    {
        var optValue = "" + finalChoices[i][0];
        var optLabel = "" + finalChoices[i][1];
        var option =
            DOMBuilder.createElement("option", {value: optValue}, optLabel);
        if (typeof selectedValuesLookup[optValue] != "undefined")
        {
            option.selected = true;
        }
        options[options.length] = option;
    }
    return DOMBuilder.createElement("select", finalAttrs, options);
};

/**
 * Retrieves values for this widget from the given data.
 *
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {String} name the field name to be used to retrieve data.
 *
 * @return {Array} values for this widget, or <code>null</code> if no values
 *                 were provided.
 */
SelectMultiple.prototype.valueFromData = function(data, files, name)
{
    if (typeof data[name] != "undefined")
    {
        return [].concat(data[name]);
    }
    return null;
};

// TODO RadioInput

// TODO RadioFieldRenderer

// TODO RadioSelect

// TODO CheckboxSelectMultiple

// TODO MultiWidget

// TODO SplitDateTimeWidget
