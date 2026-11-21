const test = require('node:test');
const assert = require('node:assert/strict');
const { allowedMethods, endpointMatchesUrl } = require('../src/controllers/apiController');

test('reads supported methods from an OPTIONS Allow header', () => {
  assert.deepEqual(
    allowedMethods({ allow: 'GET, POST, PUT, OPTIONS, TRACE, CONNECT' }),
    ['GET', 'POST', 'PUT', 'OPTIONS'],
  );
});

test('reads supported methods from a CORS method header when Allow is absent', () => {
  assert.deepEqual(
    allowedMethods({ 'access-control-allow-methods': 'GET, PATCH, DELETE' }),
    ['GET', 'PATCH', 'DELETE'],
  );
});

test('matches documented parameterized endpoints at the end of a full API URL path', () => {
  assert.equal(endpointMatchesUrl('/users/{userId}', '/v1/users/42'), true);
  assert.equal(endpointMatchesUrl('/users/{userId}', '/v1/users/42/posts'), false);
});
