/**
 * @fileOverview Form Widgets, which render an HTML representation of a Field.
 */

/**
 * An HTML form widget.
 * <p>
 * A widget handles the rendering of HTML, and the extraction of data from an
 * object that corresponds to the widget.
 *
 * @param {Object} [kwargs] configuration options.
 * @config {Object} [attrs] HTML attributes for the rendered widget.
 * @constructor
 */
function Widget(kwargs)
{
    kwargs = extendObject({attrs: null}, kwargs || {})
    // Copy attributes to a new Object
    this.attrs = extendObject({}, kwargs.attrs || {});
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
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Widget}.
 * @constructor
 * @augments Widget
 */
function Input(kwargs)
{
    Widget.call(this, kwargs);
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
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Input}.
 * @constructor
 * @augments Input
 */
function TextInput(kwargs)
{
    Input.call(this, kwargs);
}

TextInput.prototype = new Input();
TextInput.prototype.inputType = "text";

/**
 * An HTML <code>&lt;input type="password"&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Input}.
 * @config {Boolean} [renderValue] if <code>false</code> a value will not be
 *                                 rendered for this field - defaults to
 *                                 <code>true</code>.
 * @constructor
 * @augments Input
 */
function PasswordInput(kwargs)
{
    kwargs = extendObject({renderValue: true}, kwargs || {});
    Input.call(this, kwargs);
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
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Input}.
 * @constructor
 * @augments Input
 */
function HiddenInput(kwargs)
{
    Input.call(this, kwargs);
}

HiddenInput.prototype = new Input();
HiddenInput.prototype.inputType = "hidden";
HiddenInput.prototype.isHidden = true;

/**
 * A widget that handles <code>&lt;input type="hidden"&gt;</code> for fields
 * that have a list of values.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link HiddenInput}.
 * @constructor
 * @augments HiddenInput
 */
function MultipleHiddenInput(kwargs)
{
    HiddenInput.call(this, kwargs);
}

MultipleHiddenInput.prototype = new HiddenInput();

MultipleHiddenInput.prototype.render = function(name, value, attrs)
{
    if (value === null)
    {
        value = [];
    }

    var finalAttrs = this.buildAttrs(attrs, {type: this.inputType, name: name});
    var inputs = [];
    for (var i = 0, l = value.length; i < l; i++)
    {
        inputs[inputs.length] =
            DOMBuilder.createElement("input", extendObject({},
                                                           finalAttrs,
                                                           {value: value[i]}));
    }
    return DOMBuilder.createElement("span", {}, inputs);
};

MultipleHiddenInput.prototype.valueFromData = function(data, files, name)
{
    if (typeof data[name] != "undefined")
    {
        return [].concat(data[name]);
    }
    return null;
};

/**
 * An HTML <code>&lt;input type="file"&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Input}.
 * @constructor
 * @augments Input
 */
function FileInput(kwargs)
{
    Input.call(this, kwargs);
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
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Widget}.
 * @constructor
 * @augments Widget
 */
function Textarea(kwargs)
{
    // Provide default "cols" and "rows" attributes
    kwargs = extendObject({attrs: null}, kwargs || {});
    kwargs.attrs = extendObject({cols: "40", rows: "10"}, kwargs.attrs || {});
    Widget.call(this, kwargs);
}

Textarea.prototype = new Widget();

Textarea.prototype.render = function(name, value, attrs)
{
    return DOMBuilder.createElement(
        "textarea", extendObject(attrs, {name: name}), [value || ""]);
};

/**
 * A <code>&lt;input type="text"&gt;</code> which, if given a <code>Date</code>
 * object to display, formats it as an appropriate <code>String</code>.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Input}.
 * @config {String} [format] a {@link time.strftime} format string.
 * @constructor
 * @augments Input
 */
function DateTimeInput(kwargs)
{
    kwargs = extendObject({format: null}, kwargs || {});
    Input.call(this, kwargs);
    if (kwargs.format !== null)
    {
        this.format = kwargs.format;
    }
}

DateTimeInput.prototype = new Input();
DateTimeInput.prototype.inputType = "text";
DateTimeInput.prototype.format = "%Y-%m-%d %H:%M:%S"; // "2006-10-25 14:30:59"

DateTimeInput.prototype.render = function(name, value, attrs)
{
    if (value === null)
    {
        value = "";
    }
    else if (value instanceof Date)
    {
        value = time.strftime(value, this.format);
    }
    return Input.prototype.render.call(this, name, value, attrs);
};

/**
 * An HTML <code>&lt;input type="checkbox"&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Widget}.
 * @config {Function} [checkTest] a function which takes a value and returns
 *                                <code>true</code> if the checkbox should be
 *                                checked for that value.
 * @constructor
 * @augments Widget
 */
function CheckboxInput(kwargs)
{
    kwargs = extendObject({checkTest: Boolean}, kwargs || {});
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
        finalAttrs.checked = "checked";
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
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Widget}.
 * @config {Array} [choices] choices to be used when rendering the widget,
 *                           with each choice specified as an <code>Array</code>
 *                           in <code>[value, text]</code> format.
 * @constructor
 * @augments Widget
 */
function Select(kwargs)
{
    kwargs = extendObject({choices: []}, kwargs || {});
    Widget.call(this, kwargs);
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
            option.selected = "selected";
        }
        options[options.length] = option;
    }
    return DOMBuilder.createElement("select", finalAttrs, options);
};

/**
 * A <code>&lt;select&gt;</code> widget intended to be used with
 * {@link NullBooleanField}.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Select}.
 * @constructor
 * @augments Select
 */
function NullBooleanSelect(kwargs)
{
    kwargs = extendObject({
        choices: [["1", "Unknown"], ["2", "Yes"], ["3", "No"]]
    }, kwargs || {});
    Select.call(this, kwargs);
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
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Widget}.
 * @config {Array} [choices] choices to be used when rendering the widget,
 *                           with each choice specified as an <code>Array</code>
 *                           in <code>[value, text]</code> format.
 * @constructor
 * @augments Widget
 */
function SelectMultiple(kwargs)
{
    kwargs = extendObject({choices: []}, kwargs || {});
    Widget.call(this, kwargs);
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
    var finalAttrs = this.buildAttrs(attrs, {name: name, multiple: "multiple"});
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
            option.selected = "selected";
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
