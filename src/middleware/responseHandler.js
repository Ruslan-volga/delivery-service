const successResponse = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    status: 'ok',
    data: data
  });
};

const errorResponse = (res, error, statusCode = 500) => {
  const errorMessage = error instanceof Error ? error.message : error;
  res.status(statusCode).json({
    status: 'error',
    error: errorMessage
  });
};

module.exports = {
  successResponse,
  errorResponse
};