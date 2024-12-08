import { ApiError } from '../utils/ApiError.js';

function notFound(req, res, next) {
  const error = new ApiError(404, 'Not Found');
  next(error);
}

export default notFound;
