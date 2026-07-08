const assert = require("node:assert/strict");
const test = require("node:test");

const { User } = require("../models");
const { _internals } = require("../routes/apiCompatibilityRoutes");

function mockRequest({ headers = {}, query = {} } = {}) {
  return {
    query,
    header(name) {
      return headers[name.toLowerCase()] ?? headers[name] ?? null;
    }
  };
}

function mockResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test("compatibility user lookup rejects missing userId instead of falling back to first user", async () => {
  const originalFindByPk = User.findByPk;
  const originalFindOne = User.findOne;
  let findByPkCalls = 0;
  let findOneCalls = 0;

  User.findByPk = async () => {
    findByPkCalls += 1;
    throw new Error("findByPk should not be called without userId");
  };
  User.findOne = async () => {
    findOneCalls += 1;
    throw new Error("first-user fallback should not be called");
  };

  try {
    const response = mockResponse();
    const user = await _internals.getRequestedUser(mockRequest(), response);

    assert.equal(user, null);
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.equal(findByPkCalls, 0);
    assert.equal(findOneCalls, 0);
  } finally {
    User.findByPk = originalFindByPk;
    User.findOne = originalFindOne;
  }
});

test("compatibility user lookup resolves an explicit userId", async () => {
  const originalFindByPk = User.findByPk;
  const expectedUser = { userId: 7 };
  let requestedId = null;

  User.findByPk = async (userId) => {
    requestedId = userId;
    return expectedUser;
  };

  try {
    const response = mockResponse();
    const user = await _internals.getRequestedUser(
      mockRequest({ headers: { "x-user-id": "7" } }),
      response
    );

    assert.equal(user, expectedUser);
    assert.equal(requestedId, 7);
    assert.equal(response.statusCode, null);
  } finally {
    User.findByPk = originalFindByPk;
  }
});
