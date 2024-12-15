import createError from 'http-errors';

function notFound(req, res, next) {
  return next(createError(404, 'Not Found'));
}

export default notFound;
