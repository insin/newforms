/**
 * Updates an object's properties with another object's properties.
 *
 * @param {Object} destination the object to be updated.
 * @param {Object} source the object providing the updated properties.
 *
 * @return the <code>destination</code> object.
 * @type Object
 */
function extendObject(destination, source)
{
    for (var property in source)
    {
        if (source.hasOwnProperty(property))
        {
            destination[property] = source[property];
        }
    }
    return destination;
}

/**
 * Performs replacement of named placeholders in a String, specified in
 * <code>%(placeholder)s</code> format.
 *
 * @param {String} input the String to be formatted.
 * @param {Object} context an object specifying formatting context attributes.
 *
 * @return a formatted version of the given String.
 * @type String
 * @function
 */
var formatString = function()
{
    // Closure for accessing a context object from the replacement function
    var replacer = function(context)
    {
        /**
         * A replacement function which looks up replacements for a named
         * placeholder.
         * <p>
         * See http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:String:replace#Specifying_a_function_as_a_parameter
         *
         * @param {String} s the string undergoing replacement.
         * @param {String} name the name of a placeholder.
         *
         * @return the replacement for the placeholder with the given name.
         * @type String
         */
        return function(s, name)
        {
            return context[name];
        };
    };

    return function(input, context)
    {
        return input.replace(/%\((\w+)\)s/g, replacer(context));
    };
}();

/**
 * Creates an object representing the data held in a form.
 *
 * @param form a form object or a <code>String</code> specifying a form's
 *        <code>name</code> or <code>id</code> attribute. If a
 *        <code>String</code> is given, name is tried before id when attempting
 *        to find the form.
 *
 * @return an object representing the data present in the form. If the form
 *         could not be found, this object will be empty.
 * @type Object
 */
function formData(form)
{
    var data = {};

    if (typeof form == "string")
    {
        form = document.forms[form] || document.getElementById(form);
    }

    if (!form)
    {
        return data;
    }

    for (var i = 0, l = form.elements.length; i < l; i++)
    {
        var element = form.elements[i];
        var type = element.type;
        var value = null;

        // Retrieve the element's value (or values)
        if (type == "hidden" || type == "password" || type == "text" ||
            type == "textarea" || ((type == "checkbox" ||
                                    type == "radio") && element.checked))
        {
            value = element.value;
        }
        else if (type == "select-one")
        {
            value = element.options[element.selectedIndex].value;
        }
        else if (type == "select-multiple")
        {
            value = [];
            for (var j = 0, m = element.options.length; j < m; j++)
            {
                if (element.options[j].selected)
                {
                    value[value.length] = element.options[j].value;
                }
            }
            if (value.length == 0)
            {
                value = null;
            }
        }

        // Add any value obtained to the data object
        if (value !== null)
        {
            if (data.hasOwnProperty(element.name))
            {
                if (data[element.name] instanceof Array)
                {
                    data[element.name] = data[element.name].concat(value);
                }
                else
                {
                    data[element.name] = [data[element.name], value];
                }
            }
            else
            {
                data[element.name] = value;
            }
        }
    }

    return data;
}

/**
 * A collection of errors that knows how to display itself in various formats.
 * <p>
 * This object's properties are the field names, and corresponding values are
 * the errors.
 *
 * @constructor
 */
function ErrorObject()
{
}

/**
 * Determines if any errors are present.
 *
 * @return {Boolean} <code>true</code> if this object has had any properties
 *                   set, <code>false</code> otherwise.
 */
ErrorObject.prototype.isPopulated = function()
{
    for (var name in this)
    {
        if (this.hasOwnProperty(name))
        {
            return true;
        }
    }
    return false;
};

/**
 * Displays error details as a list.
 */
ErrorObject.prototype.asUL = function()
{
    var items = [];
    for (var name in this)
    {
        if (this.hasOwnProperty(name))
        {
            items[items.length] = this[name].asUL();
        }
    }
    return DOMBuilder.createElement("ul", {"class": "errorlist"}, items);
};

/**
 * Displays error details as text.
 */
ErrorObject.prototype.asText = function()
{
    var items = [];
    for (var name in this)
    {
        if (this.hasOwnProperty(name))
        {
            items[items.length] = "* " + name;
            var errorList = this[name];
            for (var i = 0, l = errorList.errors.length; i < l; i++)
            {
                items[items.length] = "  * " + errorList.errors[i];
            }
        }
    }
    return items.join("\n");
};

/**
 * A list of errors which knows how to display itself in various formats.
 *
 * @param {Array} [errors] a list of errors.
 * @constructor
 */
function ErrorList(errors)
{
    this.errors = errors || [];
}

/**
 * Displays errors as a list.
 */
ErrorList.prototype.asUL = function()
{
    var items = [];
    for (var i = 0, l = this.errors.length; i < l; i++)
    {
        items[items.length] = DOMBuilder.createElement("li", {}, [this.errors[i]])
    }
    return DOMBuilder.createElement("ul", {"class": "errorlist"}, items);
};

/**
 * Displays errors as text.
 */
ErrorList.prototype.asText = function()
{
    var items = [];
    for (var i = 0, l = this.errors.length; i < l; i++)
    {
        items[items.length] = "* " + this.errors[i]
    }
    return items.join("\n");
};

/**
 * A validation error.
 *
 * @param message an error message or <code>Array</code> of error messages.
 * @constructor
 */
function ValidationError(message)
{
    if (message instanceof Array)
    {
        this.messages = new ErrorList(message);
    }
    else
    {
        this.messages = new ErrorList([message]);
    }
}
