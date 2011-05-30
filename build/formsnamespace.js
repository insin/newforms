(function(__global__, undefined)
{

// Pull in dependencies appropriately depending on the execution environment
var modules = !!(typeof module !== 'undefined' && module.exports);
var DOMBuilder = modules ? require('DOMBuilder') : __global__.DOMBuilder;

%(timecode)s
%(formscode)s

// Newforms API
var forms = {
    version: "%(version)s",
    // util.js utilities end users may want to make use of
    callValidator: callValidator,
    ErrorObject: ErrorObject,
    ErrorList: ErrorList,
    formData: formData,
    inheritFrom: inheritFrom,
    ValidationError: ValidationError,
    // util.js and other utilities used when implementing newforms
    util: {
        contains: contains,
        copy: copy,
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
        time: time,
        urlparse: urlparse
    },
    // validators.js
    EMPTY_VALUES: EMPTY_VALUES,
    URL_VALIDATOR_USER_AGENT: URL_VALIDATOR_USER_AGENT,
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
    DEFAULT_DATE_INPUT_FORMATS: DEFAULT_DATE_INPUT_FORMATS,
    DEFAULT_TIME_INPUT_FORMATS: DEFAULT_TIME_INPUT_FORMATS,
    DEFAULT_DATETIME_INPUT_FORMATS: DEFAULT_DATETIME_INPUT_FORMATS,
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
    NON_FIELD_ERRORS: NON_FIELD_ERRORS,
    BoundField: BoundField,
    BaseForm: BaseForm,
    Form: Form,
    // formsets.js
    TOTAL_FORM_COUNT: TOTAL_FORM_COUNT,
    INITIAL_FORM_COUNT: INITIAL_FORM_COUNT,
    MAX_NUM_FORM_COUNT: MAX_NUM_FORM_COUNT,
    ORDERING_FIELD_NAME: ORDERING_FIELD_NAME,
    DELETION_FIELD_NAME: DELETION_FIELD_NAME,
    ManagementForm: ManagementForm,
    BaseFormSet: BaseFormSet,
    FormSet: FormSet,
    allValid: allValid
};

// Expose newforms to the outside world
if (modules)
{
    extend(module.exports, forms);
}
else
{
    window.forms = forms;
}
})(this);