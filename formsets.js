function ManagementForm(kwargs)
{
    this.fields = {};
    this.fields[ManagementForm.TOTAL_FORM_COUNT] = new IntegerField({widget: HiddenInput});
    this.fields[ManagementForm.INITIAL_FORM_COUNT] = new IntegerField({widget: HiddenInput});
    Form.call(this, kwargs);
}

ManagementForm.TOTAL_FORM_COUNT = "TOTAL_FORMS";
ManagementForm.INITIAL_FORM_COUNT = "INITIAL_FORMS";

ManagementForm.prototype = new Form();

/**
 * A collection of instances of the same Form.
 */
function BaseFormSet(kwargs)
{
    kwargs = extendObject({
        data: null, files: null, autoId: "id_%(name)s", prefix: null,
        initial: null, errorConstructor: ErrorList
    }, kwargs || {});
    this.isBound = kwargs.data !== null || kwargs.files !== null;
    this.prefix = kwargs.prefix || BaseFormSet.getDefaultPrefix();
    this.autoId = kwargs.autoId;
    this.data = kwargs.data;
    this.files = kwargs.files;
    this.initial = kwargs.initial;
    this.errorConstructor = kwargs.errorConstructor;
    this._errors = null;
    this._nonFormErrors = null;

    // Construct the forms in the formset
    this._constructForms();
}

BaseFormSet.ORDERING_FIELD_NAME = "ORDER";
BaseFormSet.DELETION_FIELD_NAME = "DELETE";
BaseFormSet.getDefaultPrefix = function() { return "form"; }

BaseFormSet.prototype =
{
    /**
     * Returns the ManagementForm instance for this FormSet.
     */
    get managementForm()
    {
        if (this.data || this.files)
        {
            var form = new ManagementForm({data: this.data, autoId: this.autoId, prefix: this.prefix});
            if (!form.isValid())
            {
                throw new ValidationError("ManagementForm data is missing or has been tampered with");
            }
        }
        else
        {
            var initial = {};
            initial[ManagementForm.TOTAL_FORM_COUNT] = this.totalFormCount();
            initial[ManagementForm.INITIAL_FORM_COUNT] = this.initialFormCount();
            var form = new ManagementForm({autoId: this.autoId, prefix: this.prefix, initial: initial});
        }
        return form;
    },

    get initialForms()
    {
        return this.forms.slice(0, this.initialFormCount());
    },

    get extraForms()
    {
        return this.forms.slice(this.initialFormCount());
    },

    /**
     * Returns a list of form.cleanedData objects for every form in this.forms.
     */
    get cleanedData()
    {
        if (!this.isValid())
        {
            throw new Error(this.fauxClassName + " object has no attribute 'cleanedData'");
        }
        var cleaned = [];
        for (var i = 0, l = this.forms.length; i < l; i++)
        {
            cleaned.push(this.forms[i].cleanedData);
        }
        return cleaned;
    },

    /**
     * Returns a list of forms that have been marked for deletion. Throws an
     * error if deletion is not allowed.
     */
    get deletedForms()
    {
        if (!this.isValid() || !this.canDelete)
        {
            throw new Error(this.fauxClassName + " object has no attribute 'deletedForms'");
        }

        // Construct _deletedFormIndexes, which is just a list of form indexes
        // that have had their deletion widget set to True.
        if (typeof this._deletedFormIndexes == "undefined")
        {
            this._deletedFormIndexes = [];
            var totalFormCount = this.totalFormCount();
            for (var i = 0; i < totalFormCount; i++)
            {
                var form = this.forms[i];
                // If this is an extra form and hasn't changed, don't consider it
                if (i > this.initialFormCount() && !form.hasChanged())
                {
                    continue;
                }
                if (form.cleanedData[BaseFormSet.DELETION_FIELD_NAME])
                {
                    this._deletedFormIndexes.push(i);
                }
            }
        }

        var deletedForms = [];
        for (var i = 0, l = this._deletedFormIndexes.length; i < l; i++)
        {
            deletedForms.push(this.forms[i]);
        }
        return deletedForms;
    },

    /**
     * Returns a list of forms in the order specified by the incoming data.
     * Throws an Error if ordering is not allowed.
     */
    get orderedForms()
    {
        if (!this.isValid() || !this.canOrder)
        {
            throw new Error(this.fauxClassName + " object has no attribute 'orderedForms'");
        }

        // Construct _ordering, which is a list of [form index, orderFieldValue]
        // pairs. After constructing this list, we'll sort it by orderFieldValue
        // so we have a way to get to the form indexes in the order specified by
        // the form data.
        if (typeof this._ordering == "undefined")
        {
            this._ordering = [];
            var totalFormCount = this.totalFormCount();
            for (var i = 0; i < totalFormCount; i++)
            {
                var form = this.forms[i];
                // If this is an extra form and hasn't changed, don't consider it
                if (i > this.initialFormCount() && !form.hasChanged())
                {
                    continue;
                }
                // Don't add data marked for deletion
                if (this.canDelete && form.cleanedData[BaseFormSet.DELETION_FIELD_NAME])
                {
                    this._deletedFormIndexes.push(i);
                }
                this._ordering.push([i, form.cleanedData[BaseFormSet.ORDERING_FIELD_NAME]]);
            }

            // Null should be sorted below anything else. Allowing null as a
            // comparison value makes it so we can leave ordering fields blank.
            this._ordering.sort(function(x, y)
            {
                if (x[1] === null)
                {
                    return 1;
                }
                if (y[1] === null)
                {
                    return -1;
                }
                return x[1] - y[1];
            });
        }

        var orderedForms = [];
        for (var i = 0, l = this._ordering.length; i < l; i++)
        {
            orderedForms.push(this.forms[this._ordering[i][0]]);
        }
        return orderedForms;
    },

    /**
     * Returns a list of form.errors for every form in this.forms.
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

BaseFormSet.prototype.totalFormCount = function()
{
    if (this.data || this.files)
    {
        return this.managementForm.cleanedData[ManagementForm.TOTAL_FORM_COUNT];
    }
    else
    {
        var totalForms = this.initialFormCount() + this.extra;
        if (totalForms > this.maxNum && this.maxNum > 0)
        {
            totalForms = this.maxNum;
        }
        return totalForms
    }
};

BaseFormSet.prototype.initialFormCount = function()
{
    if (this.data || this.files)
    {
        return this.managementForm.cleanedData[ManagementForm.INITIAL_FORM_COUNT];
    }
    else
    {
        // Use the length of the inital data if it's there, 0 otherwise.
        var initialForms = (this.initial !== null && this.initial.length > 0 ? this.initial.length : 0);
        if (initialForms > this.maxNum && this.maxNum > 0)
        {
            initialForms = this.maxNum;
        }
        return initialForms
    }
};

/**
 * Instantiates all the forms and put them in this.forms.
 */
BaseFormSet.prototype._constructForms = function()
{
    this.forms = [];
    var totalFormCount = this.totalFormCount();
    for (var i = 0; i < totalFormCount; i++)
    {
        this.forms.push(this._constructForm(i));
    }
};

/**
 * Instantiates and returns the i-th form instance in a formset.
 */
BaseFormSet.prototype._constructForm = function(i, kwargs)
{
    var defaults = {autoId: this.autoId, prefix: this.addPrefix(i)};

    if (this.data || this.files)
    {
        defaults["data"] = this.data;
        defaults["files"] = this.files;
    }

    if (this.initial !== null && this.initial.length > 0)
    {
        if (typeof this.initial[i] != "undefined")
        {
            defaults["initial"] = this.initial[i];
        }
    }

    // Allow extra forms to be empty
    if (i > this.initialFormCount())
    {
        defaults["emptyPermitted"] = true;
    }

    var formKwargs = extendObject({}, defaults, kwargs || {});
    var form = new this.form(formKwargs);
    this.addFields(form, i);
    return form;
};

/**
 * Returns an ErrorList of errors that aren't associated with a particular
 * form -- i.e., from formset.clean(). Returns an empty ErrorList if there
 * are none.
 */
BaseFormSet.prototype.nonFormErrors = function()
{
    if (this._nonFormErrors !== null)
    {
        return this._nonFormErrors;
    }
    return new this.errorConstructor();
};

/**
 * Returns true if form.errors is empty for every form in this.forms.
 */
BaseFormSet.prototype.isValid = function()
{
    if (!this.isBound)
    {
        return false;
    }

    // We loop over every form.errors here rather than short circuiting on the
    // first failure to make sure validation gets triggered for every form.
    var formsValid = true;
    var totalFormCount = this.totalFormCount();
    for (var i = 0; i < totalFormCount; i++)
    {
        var form = this.forms[i];
        if (this.canDelete)
        {
            // The way we lookup the value of the deletion field here takes
            // more code than we'd like, but the form's cleanedData will not
            // exist if the form is invalid.
            var field = form.fields[BaseFormSet.DELETION_FIELD_NAME];
            var rawValue = form._rawValue(DELETION_FIELD_NAME);
            var shouldDelete = field.clean(rawValue);
            if (shouldDelete)
            {
                // This form is going to be deleted so any of its errors should
                // not cause the entire formset to be invalid.
                continue;
            }
        }

        if (this.errors[i].isPopulated())
        {
            formsValid = false;
        }
    }

    return (formsValid && !this.nonFormErrors().isPopulated());
};

/**
 * Cleans all of this.data and populates this._errors.
 */
BaseFormSet.prototype.fullClean = function()
{
    this._errors = [];
    if (!this.isBound)
    {
        // Stop further processing
        return;
    }

    var totalFormCount = this.totalFormCount();
    for (var i = 0; i < totalFormCount; i++)
    {
        var form = this.forms[i];
        this._errors.push(form.errors);
    }

    // Give this.clean a chance to do cross-form validation.
    try
    {
        this.clean();
    }
    catch (e)
    {
        if (e instanceof ValidationError)
        {
            this._nonFormErrors= e.messages;
        }
        else
        {
            throw e;
        }
    }
};

/**
 * A hook for adding extra fields on to each form instance.
 */
BaseFormSet.prototype.addFields = function(form, index)
{
    if (this.canOrder)
    {
        // Only pre-fill the ordering field for initial forms.
        if (index < this.initialFormCount())
        {
            form.fields[BaseFormSet.ORDERING_FIELD_NAME] =
                new IntegerField({label: "Order", initial: index+1, required: false});
        }
        else
        {
            form.fields[BaseFormSet.ORDERING_FIELD_NAME] =
                new IntegerField({label: "Order", required: false});
        }
    }

    if (this.canDelete)
    {
        form.fields[BaseFormSet.DELETION_FIELD_NAME] =
            new BooleanField({label: "Delete", required: false});
    }
};

BaseFormSet.prototype.addPrefix = function(index)
{
    return this.prefix + "-" + index;
};

/**
 * Hook for doing any extra formset-wide cleaning after Form.clean() has been
 * called on every form. Any ValidationError raised by this method will not be
 * associated with a particular form; it will be accesible via
 * formset.nonFormErrors()
 */
BaseFormSet.prototype.clean = function() {};

/**
 * Returns true if the formset needs to be multipart-encrypted, i.e. it has
 * FileInput. Otherwise, false.
 */
BaseFormSet.prototype.isMultipart = function()
{
    return (this.forms.length > 0 && this.forms[0].isMultipart());
};

/* Reference for unimplemented methods, as of Django r10643
class BaseFormSet(StrAndUnicode):
    def __unicode__(self):
        return self.as_table()

    def _get_media(self):
        # All the forms on a FormSet are the same, so you only need to
        # interrogate the first form for media.
        if self.forms:
            return self.forms[0].media
        else:
            return Media()
    media = property(_get_media)

    def as_table(self):
        "Returns this formset rendered as HTML <tr>s -- excluding the <table></table>."
        # XXX: there is no semantic division between forms here, there
        # probably should be. It might make sense to render each form as a
        # table row with each field as a td.
        forms = u' '.join([form.as_table() for form in self.forms])
        return mark_safe(u'\n'.join([unicode(self.management_form), forms]))
*/

/**
 * Returns a FormSet constructor for the given Form constructor.
 */
function formsetFactory(form, kwargs)
{
    kwargs = extendObject({
        formset: BaseFormSet, extra: 1, canOrder: false, canDelete: false, maxNum: 0
    }, kwargs || {});

    var formsetConstructor = function(formsetKwargs)
    {
        this.fauxClassName = form.name + "FormSet";
        this.form = form;
        this.extra = kwargs.extra;
        this.canOrder = kwargs.canOrder;
        this.canDelete = kwargs.canDelete;
        this.maxNum = kwargs.maxNum;
        kwargs.formset.call(this, formsetKwargs);
    };

    formsetConstructor.prototype = new kwargs.formset();

    return formsetConstructor;
}

function allValid(formsets)
{
    var valid = true;
    for (var i = 0, l = formsets.length; i < l; i++)
    {
        if (!formsets[i].isValid())
        {
            valid = false;
        }
    }
    return valid;
}