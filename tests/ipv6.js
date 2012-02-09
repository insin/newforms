QUnit.module('ipv6')

void function() {

var isValidIPv6Address = forms.util.ipv6.isValidIPv6Address
  , cleanIPv6Address = forms.util.ipv6.cleanIPv6Address

QUnit.test('Plain address validation', 6, function() {
  ok(isValidIPv6Address('fe80::223:6cff:fe8a:2e8a'))
  ok(isValidIPv6Address('2a02::223:6cff:fe8a:2e8a'))
  ok(isValidIPv6Address('1::2:3:4:5:6:7'))
  ok(isValidIPv6Address('::'))
  ok(isValidIPv6Address('::a'))
  ok(isValidIPv6Address('2::'))
})

QUnit.test('Address with v4 mapping validation', 2, function() {
  ok(isValidIPv6Address('::ffff:254.42.16.14'))
  ok(isValidIPv6Address('::ffff:0a0a:0a0a'))
})

QUnit.test('Incorrect plain address validation', 8, function() {
  ok(!isValidIPv6Address('foo'))
  ok(!isValidIPv6Address('127.0.0.1'))
  ok(!isValidIPv6Address('12345::'))
  ok(!isValidIPv6Address('1::2:3::4'))
  ok(!isValidIPv6Address('1::zzz'))
  ok(!isValidIPv6Address('1::2:3:4:5:6:7:8'))
  ok(!isValidIPv6Address('1:2'))
  ok(!isValidIPv6Address('1:::2'))
})

QUnit.test('Incorrect address with v4 mapping validation', 6, function() {
  ok(!isValidIPv6Address('::ffff:999.42.16.14'))
  ok(!isValidIPv6Address('::ffff:zzzz:0a0a'))
  // The ::1.2.3.4 format used to be valid but was deprecated // in rfc4291
  // section 2.5.5.1
  ok(isValidIPv6Address('::254.42.16.14'))
  ok(isValidIPv6Address('::0a0a:0a0a'))
  ok(!isValidIPv6Address('::999.42.16.14'))
  ok(!isValidIPv6Address('::zzzz:0a0a'))
})

QUnit.test('Plain address cleaning', 3, function() {
  equal(cleanIPv6Address('DEAD::0:BEEF'), 'dead::beef')
  equal(cleanIPv6Address('2001:000:a:0000:0:fe:fe:beef'), '2001:0:a::fe:fe:beef')
  equal(cleanIPv6Address('2001::a:0000:0:fe:fe:beef'), '2001:0:a::fe:fe:beef')
})

QUnit.test('Address with v4 cleaning', 3, function() {
  equal(cleanIPv6Address('::ffff:0a0a:0a0a'), '::ffff:10.10.10.10')
  equal(cleanIPv6Address('::ffff:1234:1234'), '::ffff:18.52.18.52')
  equal(cleanIPv6Address('::ffff:18.52.18.52'), '::ffff:18.52.18.52')
})

QUnit.test('Unpacking v4', 3, function() {
  equal(cleanIPv6Address('::ffff:0a0a:0a0a', {unpackIPv4: true}), '10.10.10.10')
  equal(cleanIPv6Address('::ffff:1234:1234', {unpackIPv4: true}), '18.52.18.52')
  equal(cleanIPv6Address('::ffff:18.52.18.52', {unpackIPv4: true}), '18.52.18.52')
})

}()
