function successResponse(data) {
  return {
    success: true,
    data,
    error: null
  };
}

function errorResponse(code, message, details = {}) {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details
    }
  };
}

module.exports = {
  successResponse,
  errorResponse
};
