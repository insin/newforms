var forms = {
    version: "0.0.1",
    // util.js utilities end users may want to make use of
    callValidator: callValidator,
    ErrorObject: ErrorObject,
    ErrorList: ErrorList,
    formData: formData,
    inheritFrom: inheritFrom,
    ValidationError: ValidationError,
    // util.js utilities used when implementing newforms
    util: {
        contains: contains,
        createLookup: createLookup,
        extend: extend,
        format: format,
        getDefault: getDefault,
        isArray: isArray,
        isCallable: isCallable,
        isFunction: isFunction,
        isNumber: isNumber,
        isObject: isObject,
        isString: isString,
        itemsToObject: itemsToObject,
        objectItems: objectItems,
        prettyName: prettyName,
        strip: strip,
        urlparse: urlparse,
        copy: copy
    },
    // validators.js
    EMPTY_VALUES: EMPTY_VALUES,
    RegexValidator: RegexValidator,
    URLValidator: URLValidator,
    EmailValidator: EmailValidator,
    validateEmail: validateEmail,
    validateSlug: validateSlug,
    validateIPV4Address: validateIPV4Address,
    validateCommaSeparatedIntegerList: validateCommaSeparatedIntegerList,
    BaseValidator: BaseValidator,
    MaxValueValidator: MaxValueValidator,
    MinValueValidator: MinValueValidator,
    MaxLengthValidator: MaxLengthValidator,
    MinLengthValidator: MinLengthValidator,
    // widgets.js
    Widget: Widget,
    Input: Input,
    TextInput: TextInput,
    PasswordInput: PasswordInput,
    HiddenInput: HiddenInput,
    MultipleHiddenInput: MultipleHiddenInput,
    FileInput: FileInput,
    ClearableFileInput: ClearableFileInput,
    Textarea: Textarea,
    DateInput: DateInput,
    DateTimeInput: DateTimeInput,
    TimeInput: TimeInput,
    CheckboxInput: CheckboxInput,
    Select: Select,
    NullBooleanSelect: NullBooleanSelect,
    SelectMultiple: SelectMultiple,
    RadioInput: RadioInput,
    RadioFieldRenderer: RadioFieldRenderer,
    RadioSelect: RadioSelect,
    CheckboxSelectMultiple: CheckboxSelectMultiple,
    MultiWidget: MultiWidget,
    SplitDateTimeWidget: SplitDateTimeWidget,
    SplitHiddenDateTimeWidget: SplitHiddenDateTimeWidget,
    // fields.js
    Field: Field,
    CharField: CharField,
    IntegerField: IntegerField,
    FloatField: FloatField,
    DecimalField: DecimalField,
    DateField: DateField,
    TimeField: TimeField,
    DateTimeField: DateTimeField,
    RegexField: RegexField,
    EmailField: EmailField,
    FileField: FileField,
    ImageField: ImageField,
    URLField: URLField,
    BooleanField: BooleanField,
    NullBooleanField: NullBooleanField,
    ChoiceField: ChoiceField,
    TypedChoiceField: TypedChoiceField,
    MultipleChoiceField: MultipleChoiceField,
    TypedMultipleChoiceField: TypedMultipleChoiceField,
    ComboField: ComboField,
    MultiValueField: MultiValueField,
    FilePathField: FilePathField,
    SplitDateTimeField: SplitDateTimeField,
    IPAddressField: IPAddressField,
    SlugField: SlugField,
    // forms.js
    BoundField: BoundField,
    BaseForm: BaseForm,
    Form: Form,
    // formsets.js
    ManagementForm: ManagementForm,
    BaseFormSet: BaseFormSet,
    FormSet: FormSet,
    allValid: allValid
};

// Expose forms to the outside world
if (modules)
{
    module.exports = forms;
}
else
{
    window.forms = forms;
}
