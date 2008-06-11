module("fields");

/**
 * Retrieves the first error message from a ValidatonError.
 */
function ve(e)
{
    return e.messages.errors[0];
}

test("CharField", function()
{
    expect(20);
    var f = new CharField();
    equals(f.clean(1), "1");
    equals(f.clean("hello"), "hello");
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required.");  }
    equals(f.clean([1, 2, 3]), "1,2,3");

    f = new CharField({required: false});
    equals(f.clean(1), "1");
    equals(f.clean("hello"), "hello");
    equals(f.clean(null), "");
    equals(f.clean(""), "");
    equals(f.clean([1, 2, 3]), "1,2,3");

    // CharField accepts an optional maxLength parameter
    f = new CharField({maxLength: 10, required: false});
    equals(f.clean("12345"), "12345");
    equals(f.clean("1234567890"), "1234567890");
    try { f.clean("1234567890a"); } catch (e) { equals(ve(e), "Ensure this value has at most 10 characters (it has 11)."); }

    // CharField accepts an optional minLength parameter
    f = new CharField({minLength: 10, required: false});
    try { f.clean("12345"); } catch (e) { equals(ve(e), "Ensure this value has at least 10 characters (it has 5)."); }
    equals(f.clean("1234567890"), "1234567890");
    equals(f.clean("1234567890a"), "1234567890a");

    f = new CharField({minLength: 10, required: true});
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean("12345"); } catch (e) { equals(ve(e), "Ensure this value has at least 10 characters (it has 5)."); }
    equals(f.clean("1234567890"), "1234567890");
    equals(f.clean("1234567890a"), "1234567890a");
});

test("IntegerField", function()
{
    expect(40);
    var f = new IntegerField();
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean("1"), 1);
    equals(f.clean("23"), 23);
    try { f.clean("a"); } catch (e) { equals(ve(e), "Enter a whole number."); }
    equals(f.clean(42), 42);
    try { f.clean(3.14); } catch (e) { equals(ve(e), "Enter a whole number."); }
    equals(f.clean("1 "), 1);
    equals(f.clean(" 1"), 1);
    equals(f.clean(" 1 "), 1);
    try { f.clean("1a"); } catch (e) { equals(ve(e), "Enter a whole number."); }

    f = new IntegerField({required: false});
    equals(f.clean(""), null);
    equals(f.clean(null), null);
    equals(f.clean("1"), 1);
    equals(f.clean("23"), 23);
    try { f.clean("a"); } catch (e) { equals(ve(e), "Enter a whole number."); }
    equals(f.clean("1 "), 1);
    equals(f.clean(" 1"), 1);
    equals(f.clean(" 1 "), 1);
    try { f.clean("1a"); } catch (e) { equals(ve(e), "Enter a whole number."); }

    // IntegerField accepts an optional maxValue parameter
    f = new IntegerField({maxValue: 10})
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean(1), 1);
    equals(f.clean(10), 10);
    try { f.clean(11); } catch (e) { equals(ve(e), "Ensure this value is less than or equal to 10."); }
    equals(f.clean("10"), 10);
    try { f.clean("11"); } catch (e) { equals(ve(e), "Ensure this value is less than or equal to 10."); }

    // IntegerField accepts an optional minValue parameter
    f = new IntegerField({minValue: 10});
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(1); } catch (e) { equals(ve(e), "Ensure this value is greater than or equal to 10."); }
    equals(f.clean(10), 10);
    equals(f.clean(11), 11);
    equals(f.clean("10"), 10);
    equals(f.clean("11"), 11);

    // minValue and maxValue can be used together
    f = new IntegerField({minValue: 10, maxValue: 20});
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(1); } catch (e) { equals(ve(e), "Ensure this value is greater than or equal to 10."); }
    equals(f.clean(10), 10);
    equals(f.clean(11), 11);
    equals(f.clean("10"), 10);
    equals(f.clean("11"), 11);
    equals(f.clean(20), 20);
    try { f.clean(21); } catch (e) { equals(ve(e), "Ensure this value is less than or equal to 20."); }
});

test("FloatField", function()
{
    expect(19);
    var f = new FloatField();
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean(1), 1.0);
    equals(f.clean(23), 23.0);
    equals(f.clean("3.14"), 3.1400000000000001);
    equals(f.clean(3.14), 3.1400000000000001);
    equals(f.clean(42), 42.0);
    try { f.clean("a"); } catch (e) { equals(ve(e), "Enter a number."); }
    equals(f.clean("1.0 "), 1.0);
    equals(f.clean(" 1.0"), 1.0);
    equals(f.clean(" 1.0 "), 1.0);
    try { f.clean("1.0a"); } catch (e) { equals(ve(e), "Enter a number."); }

    f = new FloatField({required: false});
    equals(f.clean(""), null);
    equals(f.clean(null), null);
    equals(f.clean("1"), 1.0);

    // FloatField accepts minValue and maxValue just like IntegerField
    f = new FloatField({maxValue: 1.5, minValue: 0.5});
    try { f.clean("1.6"); } catch (e) { equals(ve(e), "Ensure this value is less than or equal to 1.5."); }
    try { f.clean("0.4"); } catch (e) { equals(ve(e), "Ensure this value is greater than or equal to 0.5."); }
    equals(f.clean("1.5"), 1.5);
    equals(f.clean("0.5"), 0.5);
});