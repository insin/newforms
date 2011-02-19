/**
 * @fileOverview Form Widgets, which render an HTML representation of a Field.
 */

 // TODO Media

/**
 * An HTML form widget.
 *
 * A widget handles the rendering of HTML, and the extraction of data from an
 * object that corresponds to the widget.
 *
 * @param {Object} [kwargs] Configuration options.
 * @config {Object} [attrs] HTML attributes for the rendered widget.
 * @constructor
 */
function Widget(kwargs)
{
    this.attrs = extend({}, kwargs.attrs || {});
}
/** Determines whether this corresponds to an &lt;input type="hidden"&gt;. */
Widget.prototype.isHidden = false;
/** Determines whether this widget needs a multipart-encrypted form. */
Widget.prototype.needsMultipartForm = false;
Widget.prototype.isRequired = false;

/**
 * Returns this Widget rendered as HTML.
 *
 * The 'value' given is not guaranteed to be valid input, so subclass
 * implementations should program defensively.
 */
Widget.prototype.render = function(value)
{
    throw new Error("Subclasses must implement this method.");
};

/**
 * Helper function for building an attribute dictionary.
 */
Widget.prototype.buildAttrs = function(extraAttrs, kwargs)
{
    var attrs = extend({}, this.attrs, kwargs || {}, extraAttrs || {});
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
    return getDefault(data, name, null);
};

/**
 * Determines if data has changed from initial.
 */
Widget.prototype._hasChanged = function(initial, data)
{
    // For purposes of seeing whether something has changed, null is the same
    // as an empty string, if the data or inital value we get is null, replace
    // it with "".
    var dataValue = (data === null ? "" : data);
    var initialValue = (initial === null ? "" : initial);
    return ("" + initialValue != "" + dataValue);
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
 */
function Input(kwargs)
{
    Widget.call(this, kwargs);
}
inheritFrom(Input, Widget);
/** The type of this input. */
Input.prototype.inputType = null;

Input.prototype.render = function(name, value, attrs)
{
    if (value === null)
        value = "";
    var finalAttrs = this.buildAttrs(attrs, {type: this.inputType,
                                             name: name});
    if (value !== "")
        // Only add the "value" attribute if value is non-empty
        finalAttrs.value = value;
    return DOMBuilder.createElement("input", finalAttrs);
};

/**
 * An HTML <code>&lt;input type="text"&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Input}.
 * @constructor
 */
function TextInput(kwargs)
{
    Input.call(this, kwargs);
}
inheritFrom(TextInput, Input);
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
 */
function PasswordInput(kwargs)
{
    kwargs = extend({renderValue: true}, kwargs || {});
    Input.call(this, kwargs);
    this.renderValue = kwargs.renderValue;
}
inheritFrom(PasswordInput, Input);
PasswordInput.prototype.inputType = "password";

PasswordInput.prototype.render = function(name, value, attrs)
{
    if (!this.renderValue)
        value = "";
    return Input.prototype.render.call(this, name, value, attrs);
};

/**
 * An HTML <code>&lt;input type="hidden"&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Input}.
 * @constructor
 */
function HiddenInput(kwargs)
{
    Input.call(this, kwargs);
}
inheritFrom(HiddenInput, Input);
HiddenInput.prototype.inputType = "hidden";
HiddenInput.prototype.isHidden = true;

/**
 * A widget that handles <code>&lt;input type="hidden"&gt;</code> for fields
 * that have a list of values.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link HiddenInput}.
 * @constructor
 */
function MultipleHiddenInput(kwargs)
{
    HiddenInput.call(this, kwargs);
}
inheritFrom(MultipleHiddenInput, HiddenInput);

MultipleHiddenInput.prototype.render = function(name, value, attrs)
{
    if (value === null)
        value = [];
    var finalAttrs = this.buildAttrs(attrs, {type: this.inputType, name: name}),
        id = getDefault(finalAttrs, "id", null),
        inputs = [];
    for (var i = 0, l = value.length; i < l; i++)
    {
        var inputAttrs = extend({}, finalAttrs, {value: value[i]});
        if (id)
            // An ID attribute was given. Add a numeric index as a suffix
            // so that the inputs don't all have the same ID attribute.
            inputAttrs.id = format("%(id)s_%(i)s", {id: id, i: i});
        inputs.push(
            DOMBuilder.createElement("input", inputAttrs));
    }
    return DOMBuilder.createElement("span", {}, inputs);
};

MultipleHiddenInput.prototype.valueFromData = function(data, files, name)
{
    if (typeof data[name] != "undefined")
        return [].concat(data[name]);
    return null;
};

/**
 * An HTML <code>&lt;input type="file"&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Input}.
 * @constructor
 */
function FileInput(kwargs)
{
    Input.call(this, kwargs);
}
inheritFrom(FileInput, Input);
FileInput.prototype.inputType = "file";
FileInput.prototype.needsMultipartForm = true;

FileInput.prototype.render = function(name, value, attrs)
{
    return Input.prototype.render.call(this, name, null, attrs);
};

/**
 * File widgets take data from <code>files</code>, not <code>data</code>.
 */
FileInput.prototype.valueFromData = function(data, files, name)
{
    return getDefault(files, name, null);
};

FileInput.prototype._hasChanged = function(initial, data)
{
    if (data === null)
        return false;
    return true;
};

var FILE_INPUT_CONTRADICTION = {};

/**
 * @constructor.
 */
function ClearableFileInput(kwargs)
{
    FileInput.call(this, kwargs);
}
inheritFrom(ClearableFileInput, FileInput);
ClearableFileInput.prototype.initialText = "Currently";
ClearableFileInput.prototype.inputText = "Change";
ClearableFileInput.prototype.clearCheckboxLabel = "Clear";

/**
 * Given the name of the file input, return the name of the clear checkbox
 * input.
 */
ClearableFileInput.prototype.clearCheckboxName = function(name)
{
    return name + "-clear";
};

/**
 * Given the name of the clear checkbox input, return the HTML id for it.
 */
ClearableFileInput.prototype.clearCheckboxId = function(name)
{
    return name + "_id";
};

ClearableFileInput.prototype.render = function(name, value, attrs)
{
    var input = FileInput.prototype.render.call(this, name, value, attrs);
    if (value && typeof value.url != "undefined")
    {
        var contents = [
            this.initialText, ": ",
            DOMBuilder.createElement("a", {href:value.url}, [""+value]), " "
        ];
        if (!this.isRequired)
        {
            var clearCheckboxName = this.clearCheckboxName();
            var clearCheckboxId = this.clearCheckboxId();
            contents = contents.concat([
                CheckboxInput().render(clearCheckboxName, false, {'id': clearCheckboxId}), " ",
                DOMBuilder.createElement("label", {"for": clearCheckboxId}, [this.clearCheckboxLabel])
            ]);
        }
        contents = contents.concat([
            DOMBuilder.createElement("br"),
            this.inputText, ": ",
            input
        ]);
        return DOMBuilder.fragment(contents);
    }
    else
    {
        return input;
    }
};

ClearableFileInput.prototype.valueFromData = function(data, files, name)
{
    var upload = FileInput.prototype.valueFromData(data, files, name);
    if (!this.isRequired && new CheckboxInput().valueFromData(data, files, this.clearCheckboxName()))
    {
        if (upload)
            // If the user contradicts themselves (uploads a new file AND
            // checks the "clear" checkbox), we return a unique marker
            // object that FileField will turn into a ValidationError.
            return FILE_INPUT_CONTRADICTION
        // false signals to clear any existing value, as opposed to just null
        return false;
    }
    return upload;
};

/**
 * An HTML <code>&lt;textarea&gt;</code> widget.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Widget}.
 * @config {Object} [attrs] HTML attributes for the rendered widget. Default rows
 *                          and cols attributes will be used if not provided.
 * @constructor
 */
function Textarea(kwargs)
{
    // Ensure we have something in attrs
    kwargs = extend({attrs: null}, kwargs || {});
    // Provide default "cols" and "rows" attributes
    kwargs.attrs = extend({rows: "10", cols: "40"}, kwargs.attrs || {});
    Widget.call(this, kwargs);
}
inheritFrom(Textarea, Widget);

Textarea.prototype.render = function(name, value, attrs)
{
    if (value === null)
        value = "";
    var finalAttrs = this.buildAttrs(attrs, {name: name});
    return DOMBuilder.createElement("textarea", finalAttrs, [value]);
};

/**
 * A <code>&lt;input type="text"&gt;</code> which, if given a <code>Date</code>
 * object to display, formats it as an appropriate date <code>String</code>.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Input}.
 * @config {String} [format] a {@link time.strftime} format string.
 * @constructor
 */
function DateInput(kwargs)
{
    kwargs = extend({format: null}, kwargs || {});
    Input.call(this, kwargs);
    if (kwargs.format !== null)
        this.format = kwargs.format;
}
inheritFrom(DateInput, Input);
DateInput.prototype.inputType = "text";
DateInput.prototype.format = "%Y-%m-%d"; // "2006-10-25"

DateInput.prototype._formatValue = function(value)
{
    if (value instanceof Date)
        return time.strftime(value, this.format);
    return value;
};

DateInput.prototype.render = function(name, value, attrs)
{
    value = this._formatValue(value);
    return Input.prototype.render.call(this, name, value, attrs);
};

DateInput.prototype._hasChanged = function(initial, data)
{
    return Input.prototype._hasChanged.call(this, this._formatValue(initial), data);
};

/**
 * A <code>&lt;input type="text"&gt;</code> which, if given a <code>Date</code>
 * object to display, formats it as an appropriate datetime <code>String</code>.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Input}.
 * @config {String} [format] a {@link time.strftime} format string.
 * @constructor
 */
function DateTimeInput(kwargs)
{
    kwargs = extend({format: null}, kwargs || {});
    Input.call(this, kwargs);
    if (kwargs.format !== null)
        this.format = kwargs.format;
}
inheritFrom(DateTimeInput, Input);
DateTimeInput.prototype.inputType = "text";
DateTimeInput.prototype.format = "%Y-%m-%d %H:%M:%S"; // "2006-10-25 14:30:59"

DateTimeInput.prototype._formatValue = function(value)
{
    if (value instanceof Date)
        return time.strftime(value, this.format);
    return value;
};

DateTimeInput.prototype.render = function(name, value, attrs)
{
    value = this._formatValue(value);
    return Input.prototype.render.call(this, name, value, attrs);
};

DateTimeInput.prototype._hasChanged = function(initial, data)
{
    return Input.prototype._hasChanged.call(this, this._formatValue(initial), data);
};

/**
 * A <code>&lt;input type="text"&gt;</code> which, if given a <code>Date</code>
 * object to display, formats it as an appropriate time <code>String</code>.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Input}.
 * @config {String} [format] a {@link time.strftime} format string.
 * @constructor
 */
function TimeInput(kwargs)
{
    kwargs = extend({format: null}, kwargs || {});
    Input.call(this, kwargs);
    if (kwargs.format !== null)
        this.format = kwargs.format;
}

inheritFrom(TimeInput, Input);
TimeInput.prototype.inputType = "text";
TimeInput.prototype.format = "%H:%M:%S" // "14:30:59"

TimeInput.prototype._formatValue = function(value)
{
    if (value instanceof Date)
        return time.strftime(value, this.format);
    return value;
};

TimeInput.prototype.render = function(name, value, attrs)
{
    value = this._formatValue(value);
    return Input.prototype.render.call(this, name, value, attrs);
};

TimeInput.prototype._hasChanged = function(initial, data)
{
    return Input.prototype._hasChanged.call(this, this._formatValue(initial), data);
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
 */
function CheckboxInput(kwargs)
{
    kwargs = extend({checkTest: Boolean}, kwargs || {});
    Widget.call(this, kwargs);
    this.checkTest = kwargs.checkTest;
}

inheritFrom(CheckboxInput, Widget);

CheckboxInput.prototype.render = function(name, value, attrs)
{
    var checked;
    try
    {
        checked = this.checkTest(value);
    }
    catch (e)
    {
        // Silently catch exceptions
        checked = false;
    }

    var finalAttrs = this.buildAttrs(attrs, {type: "checkbox", name: name});
    if (value !== "" && value !== true && value !== false && value !== null &&
        value !== undefined)
        // Only add the "value" attribute if value is non-empty
        finalAttrs.value = value;
    if (checked)
        finalAttrs.checked = "checked";
    return DOMBuilder.createElement("input", finalAttrs);
};

CheckboxInput.prototype.valueFromData = function(data, files, name)
{
    if (typeof data[name] == "undefined")
        //  A missing value means False because HTML form submission does not
        // send results for unselected checkboxes.
        return false;
    var value = data[name],
        values = {"true": true, "false": false};
    // Translate true and false strings to boolean values
    if (isString(value))
        value = getDefault(values, value.toLowerCase(), value);
    return Widget.prototype.valueFromData.call(this, data, files, name);
};

CheckboxInput.prototype._hasChanged = function(initial, data)
{
    // Sometimes data or initial could be null or "" which should be the same
    // thing as false.
    return (Boolean(initial) != Boolean(data));
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
 */
function Select(kwargs)
{
    kwargs = extend({choices: []}, kwargs || {});
    Widget.call(this, kwargs);
    this.choices = kwargs.choices || [];
}
inheritFrom(Select, Widget);

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
        selectedValue = "";
    var finalAttrs = this.buildAttrs(attrs, {name: name});
    var options = this.renderOptions(choices, [selectedValue]);
    options.push("\n");
    return DOMBuilder.createElement("select", finalAttrs, options);
};

Select.prototype.renderOptions = function(choices, selectedValues)
{
    // Normalise to strings
    var selectedValuesLookup = {};
    // We can't duck type passing of a String instead, as IE < 8 doesn't allow
    // numeric property access to grab chars out of a String.
    var selectedValueString = (isString(selectedValues));
    for (var i = 0, l = selectedValues.length; i < l; i++)
        selectedValuesLookup[""+(selectedValueString
                                 ? selectedValues.charAt(i)
                                 : selectedValues[i])] = true;

    var options = [],
        finalChoices = this.choices.concat(choices || []);
    for (var i = 0, l = finalChoices.length; i < l; i++)
    {
        if (isArray(finalChoices[i][1]))
        {
            var optgroupOptions = [],
                optgroupChoices = finalChoices[i][1];
            for (var j = 0, k = optgroupChoices.length; j < k; j++)
            {
                optgroupOptions.push("\n");
                optgroupOptions.push(this.renderOption(selectedValuesLookup,
                                                       optgroupChoices[j][0],
                                                       optgroupChoices[j][1]));
            }
            options.push("\n");
            optgroupOptions.push("\n");
            options.push(DOMBuilder.createElement(
                "optgroup", {label: finalChoices[i][0]}, optgroupOptions));
        }
        else
        {
            options.push("\n");
            options.push(this.renderOption(selectedValuesLookup,
                                           finalChoices[i][0],
                                           finalChoices[i][1]));
        }
    }
    return options;
};

Select.prototype.renderOption = function(selectedValuesLookup, optValue, optLabel)
{
    optValue = ""+optValue;
    var attrs = {value: optValue};
    if (typeof selectedValuesLookup[optValue] != "undefined")
        attrs["selected"] = "selected";
    return DOMBuilder.createElement("option", attrs, [optLabel]);
};

/**
 * A <code>&lt;select&gt;</code> widget intended to be used with
 * {@link NullBooleanField}.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Select}. Any choices configuration provided
 *                          will be overrridden with the specific choices this
 *                          widget requires.
 * @constructor
 */
function NullBooleanSelect(kwargs)
{
    // Set or overrride choices
    kwargs.choices = [["1", "Unknown"], ["2", "Yes"], ["3", "No"]];
    Select.call(this, kwargs);
};

inheritFrom(NullBooleanSelect, Select);

NullBooleanSelect.prototype.render = function(name, value, attrs, choices)
{
    if (value === true || value == "2")
        value = "2";
    else if (value === false || value == "3")
        value = "3";
    else
        value = "1";
    return Select.prototype.render.call(this, name, value, attrs, choices);
};

NullBooleanSelect.prototype.valueFromData = function(data, files, name)
{
    var value = null;
    if (typeof data[name] != "undefined")
    {
        var dataValue = data[name];
        if (dataValue === true || dataValue == "True" || dataValue == "true" || dataValue == "2")
            value = true;
        else if (dataValue === false || dataValue == "False" || dataValue == "false" || dataValue == "3")
            value = false;
    }
    return value;
};

NullBooleanSelect.prototype._hasChanged = function(initial, data)
{
    // For a NullBooleanSelect, null (unknown) and false (No)
    //are not the same
    if (initial !== null)
        initial = Boolean(initial);
    if (data !== null)
        data = Boolean(data)
    return initial != data;
};

/**
 * An HTML <code>&lt;select&gt;</code> widget which allows multiple selections.
 *
 * @param {Object} [kwargs] configuration parameters, as specified in
 *                          {@link Select}.
 * @constructor
 */
function SelectMultiple(kwargs)
{
    Select.call(this, kwargs);
}
inheritFrom(SelectMultiple, Select);

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
        selectedValues = [];
    var finalAttrs = this.buildAttrs(attrs, {name: name, multiple: "multiple"});
    var options = this.renderOptions(choices, selectedValues);
    options.push("\n");
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
        return [].concat(data[name]);
    return null;
};

SelectMultiple.prototype._hasChanged = function(initial, data)
{
    if (initial === null)
        initial = [];
    if (data === null)
        data = [];
    if (initial.length != data.length)
        return true;
    for (var i = 0, l = initial.length; i < l; i++)
        if ("" + initial[i] != "" + data[i])
            return true;
    return false;
};

/**
 * An object used by {@link RadioFieldRenderer} that represents a single
 * <code>&lt;input type="radio"&gt;</code>.
 *
 * @param {String} name the field name.
 * @param {String} value the selected value.
 * @param {Object} attrs HTML attributes for the widget.
 * @param {Array} choice choice details to be used when rendering the widget,
 *                specified as an <code>Array</code> in
 *                <code>[value, text]</code> format.
 * @param {Number} index the index of the radio button this widget represents.
 * @constructor
 */
function RadioInput(name, value, attrs, choice, index)
{
    this.name = name;
    this.value = value;
    this.attrs = attrs;
    this.choiceValue = ""+choice[0];
    this.choiceLabel = choice[1];
    this.index = index;
}

/**
 * Renders a <code>&lt;label&gt;</code> enclosing the radio widget and its label
 * text.
 */
RadioInput.prototype.labelTag = function()
{
    var labelAttrs = {};
    if (typeof this.attrs.id != "undefined")
        labelAttrs["for"] = this.attrs.id + "_" + this.index;
    return DOMBuilder.createElement("label", labelAttrs,
                                    [this.tag(), " ", this.choiceLabel]);
};

RadioInput.prototype.isChecked = function()
{
    return this.value === this.choiceValue;
};

/**
 * Renders the <code>&lt;input type="radio"&gt;</code> portion of the widget.
 */
RadioInput.prototype.tag = function()
{
    var finalAttrs = extend({}, this.attrs,
                                  {type: "radio", name: this.name,
                                   value: this.choiceValue});
    if (typeof finalAttrs.id != "undefined")
        finalAttrs.id = finalAttrs.id + "_" + this.index;
    if (this.isChecked())
        finalAttrs.checked = "checked";
    return DOMBuilder.createElement("input", finalAttrs);
};

/**
 * An object used by {@link RadioSelect} to enable customisation of radio
 * widgets.
 *
 * @param {String} name the field name.
 * @param {String} value the selected value.
 * @param {Object} attrs HTML attributes for the widget.
 * @param {Array} choices choices to be used when rendering the widget, with
 *                        each choice specified as an <code>Array</code> in
 *                        <code>[value, text]</code> format.
 * @constructor
 */
function RadioFieldRenderer(name, value, attrs, choices)
{
    this.name = name;
    this.value = value;
    this.attrs = attrs;
    this.choices = choices;
}

RadioFieldRenderer.prototype.radioInputs = function()
{
    var inputs = [];
    for (var i = 0, l = this.choices.length; i < l; i++)
        inputs.push(new RadioInput(this.name, this.value, extend({}, this.attrs),
                                   this.choices[i], i));
    return inputs;
};

/**
 * Outputs a &lt;ul&gt; for this set of radio fields.
 */
RadioFieldRenderer.prototype.render = function()
{
    var inputs = this.radioInputs();
    var items = [];
    for (var i = 0, l = inputs.length; i < l; i++)
    {
        items.push("\n");
        items.push(DOMBuilder.createElement("li", {}, [inputs[i].labelTag()]));
    }
    items.push("\n");
    return DOMBuilder.createElement("ul", {}, items);
};

/**
 * Renders a single select as a list of <code>&lt;input type="radio"&gt;</code>
 * elements.
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Select}.
 * @config {Function} [renderer] a custom RadioFieldRenderer constructor.
 * @constructor
 */
function RadioSelect(kwargs)
{
    kwargs = extend({renderer: null}, kwargs || {});
    // Override the default renderer if we were passed one
    if (kwargs.renderer !== null)
        this.renderer = kwargs.renderer;
    Select.call(this, kwargs);
}
inheritFrom(RadioSelect, Select);
RadioSelect.prototype.renderer = RadioFieldRenderer;

/**
 * @return an instance of the renderer to be used to render this widget.
 */
RadioSelect.prototype.getRenderer = function(name, value, attrs, choices)
{
    if (value === null)
        value = "";
    value = ""+value;
    var finalAttrs = this.buildAttrs(attrs);
    choices = this.choices.concat(choices || []);
    return new this.renderer(name, value, finalAttrs, choices);
};

RadioSelect.prototype.render = function(name, value, attrs, choices)
{
    return this.getRenderer(name, value, attrs, choices).render();
};

/**
 * RadioSelect is represented by multiple <input type="radio"> fields,
 * each of which has a distinct ID. The IDs are made distinct by a "_X"
 * suffix, where X is the zero-based index of the radio field. Thus, the
 * label for a RadioSelect should reference the first one ('_0').
 */
RadioSelect.prototype.idForLabel = function(id)
{
    if (id)
        id += "_0";
    return id;
};

/**
 * Multiple selections represented as a list of
 * <code>&lt;input type="checkbox"&gt;</code> widgets.
 *
 * @param {Object} [kwargs] configuration parameters, as specified in
 *                          {@link SelectMultiple}.
 * @constructor
 */
function CheckboxSelectMultiple(kwargs)
{
    SelectMultiple.call(this, kwargs);
}
inheritFrom(CheckboxSelectMultiple, SelectMultiple);

CheckboxSelectMultiple.prototype.render = function(name, selectedValues, attrs, choices)
{
    if (selectedValues === null)
        selectedValues = [];
    var hasId = (attrs && typeof attrs.id != "undefined"),
        finalAttrs = this.buildAttrs(attrs),
        selectedValuesLookup = {};
    // Normalise to strings
    for (var i = 0, l = selectedValues.length; i < l; i++)
        selectedValuesLookup["" + selectedValues[i]] = true;
    var checkTest = function(value) { return (typeof selectedValuesLookup[""+value] != "undefined"); },
        items = [],
        finalChoices = this.choices.concat(choices || []);
    for (var i = 0, l = finalChoices.length; i < l; i++)
    {
        var optValue = "" + finalChoices[i][0],
            optLabel = finalChoices[i][1],
            checkboxAttrs = extend({}, finalAttrs),
            labelAttrs = {};
        // If an ID attribute was given, add a numeric index as a suffix, so
        // that the checkboxes don't all have the same ID attribute.
        if (hasId)
        {
            extend(checkboxAttrs, {id: attrs.id + "_" + i});
            labelAttrs["for"] = checkboxAttrs.id;
        }

        var cb = new CheckboxInput({attrs: checkboxAttrs, checkTest: checkTest});
        items.push("\n");
        items.push(
            DOMBuilder.createElement("li", {},
                [DOMBuilder.createElement("label", labelAttrs,
                                          [cb.render(name, optValue), " ", optLabel])]));
    }
    items.push("\n");
    return DOMBuilder.createElement("ul", {}, items);
};

CheckboxSelectMultiple.prototype.idForLabel = function(id)
{
    if (id)
        id += "_0";
    return id;
};

/**
 * A widget that is composed of multiple widgets.
 *
 * You'll probably want to use this class with {@link MultiValueField}.
 *
 * @param {Array} widgets the list of widgets composing this widget.
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Widget}.
 * @constructor
 */
function MultiWidget(widgets, kwargs)
{
    this.widgets = [];
    for (var i = 0, l = widgets.length; i < l; i++)
        this.widgets.push(widgets[i] instanceof Widget
                          ? widgets[i]
                          : new widgets[i]);
    Widget.call(this, kwargs);
}
inheritFrom(MultiWidget, Widget);

/**
 * This method is different than other widgets', because it has to figure out
 * how to split a single value for display in multiple widgets.
 *
 * If the given value is NOT a list, it will first be "decompressed" into a list
 * before it is rendered by calling the {@link MultiWidget#decompress} method.
 *
 * Each value in the list is rendered  with the corresponding widget -- the
 * first value is rendered in the first widget, the second value is rendered in
 * the second widget, and so on.
 *
 * @param {String} name the field name.
 * @param value a list of values, or a normal value (e.g., a <code>String</code>
 *              that has been "compressed" from a list of values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 *
 * @return a rendered collection of widgets.
 */
MultiWidget.prototype.render = function(name, value, attrs)
{
    if (!(isArray(value)))
        value = this.decompress(value);
    var finalAttrs = this.buildAttrs(attrs),
        id = finalAttrs.id || null,
        renderedWidgets = [];
    for (var i = 0, l = this.widgets.length; i < l; i++)
    {
        var widget = this.widgets[i],
            widgetValue = null;
        if (typeof value[i] != "undefined")
            widgetValue = value[i];
        if (id)
            extend(finalAttrs, {"id": id + "_" + i});
        renderedWidgets.push(
            widget.render(name + "_" + i, widgetValue, finalAttrs));
    }
    return this.formatOutput(renderedWidgets);
};

MultiWidget.prototype.idForLabel = function(id)
{
    if (id)
        id += "_0";
    return id;
};

MultiWidget.prototype.valueFromData = function(data, files, name)
{
    var values = [];
    for (var i = 0, l = this.widgets.length, widget; i < l; i++)
    {
        widget = this.widgets[i];
        values[i] = widget.valueFromData(data, files, name + "_" + i);
    }
    return values;
};

MultiWidget.prototype._hasChanged = function(initial, data)
{
    if (initial === null)
    {
        initial = [];
        for (var i = 0, l = data.length; i < l; i++)
            initial.push("");
    }
    else if (!(isArray(initial)))
    {
        initial = this.decompress(initial);
    }

    for (var i = 0, l = this.widgets.length; i < l; i++)
        if (this.widgets[i]._hasChanged(initial[i], data[i]))
            return true;
    return false;
};

/**
 * Creates an element containing a given list of rendered widgets.
 *
 * This hook allows you to format the HTML design of the widgets, if needed.
 *
 * @param {Array} renderedWidgets a list of rendered widgets.
 * @return a fragment containing the rendered widgets.
 */
MultiWidget.prototype.formatOutput = function(renderedWidgets)
{
    return DOMBuilder.fragment(renderedWidgets);
};

/**
 * Creates a list of decompressed values for the given compressed value.
 *
 * @param value a compressed value, which can be assumed to be valid, but not
 *              necessarily non-empty.
 *
 * @return a list of decompressed values for the given compressed value.
 */
MultiWidget.prototype.decompress = function(value)
{
    throw new Error("Subclasses must implement this method.");
};

/**
 * Splits <code>Date</code> input into two
 * <code>&lt;input type="text"&gt;</code> elements.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link MultiWidget}.
 * @param {String} [dateFormat] a {@link time.strftime} format string for
 *                              formatting the date.
 * @param {String} [timeFormat] a {@link time.strftime} format string for
 *                              formatting the time.
 * @constructor
 */
function SplitDateTimeWidget(kwargs)
{
    kwargs = extend({adateFormat: null, timeFormat: null}, kwargs || {});
    if (kwargs.dateFormat)
        this.dateFormat = kwargs.dateFormat;
    if (kwargs.timeFormat)
        this.timeFormat = kwargs.timeFormat;
    var widgets = [
        new DateInput({attrs: kwargs.attrs, format: this.dateFormat}),
        new TimeInput({attrs: kwargs.attrs, format: this.timeFormat})
    ];
    MultiWidget.call(this, widgets, kwargs.attrs);
}
inheritFrom(SplitDateTimeWidget, MultiWidget);
SplitDateTimeWidget.prototype.dateFormat = DateInput.prototype.format;
SplitDateTimeWidget.prototype.timeFormat = TimeInput.prototype.format;

SplitDateTimeWidget.prototype.decompress = function(value)
{
    if (value)
        return [
            new Date(value.getFullYear(), value.getMonth(), value.getDate()),
            new Date(1900, 0, 1, value.getHours(), value.getMinutes(),
                     value.getSeconds())];
    return [null, null];
};

/**
 * Splits <code>Date</code> input into two
 * <code>&lt;input type="hidden"&gt;</code> elements.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link SplitHiddenDateTimeWidget}.
 * @constructor
 */
function SplitHiddenDateTimeWidget(kwargs)
{
    SplitDateTimeWidget.call(this, kwargs);
    for (var i = 0, l = this.widgets.length; i < l; i++)
    {
        this.widgets[i].inputType = "hidden";
        this.widgets[i].isHidden = true;
    }
}
inheritFrom(SplitHiddenDateTimeWidget, SplitDateTimeWidget);
SplitHiddenDateTimeWidget.isHidden = true;
