import createError from 'http-errors';
import { match } from 'path-to-regexp';

const allowedMethodsMap = {
  '/': ['GET'],
  '/api': ['GET'],
  '/api/status': ['GET'],
  '/api/register': ['POST'],
  '/api/verify-email': ['POST'],
  '/api/new-verificationcode': ['POST'],
  '/api/login': ['POST'],
  '/api/logout': ['POST'],
  '/api/refresh': ['POST'],
  '/api/forgot-password': ['POST'],
  '/api/reset-password/:token': ['POST'],

  // user routes
  '/api/user': ['GET'],
  '/api/user/profile': ['GET', 'PUT', 'DELETE'],
  '/api/user/items': ['GET'],
  '/api/user/item': ['POST'],
  '/api/user/item/:id': ['GET', 'PUT', 'DELETE'],
  '/api/user/item/:id/matches': ['GET'],
  '/api/user/item/:id/matches/:mid': ['GET', 'POST'],

  // admin routes
  '/api/admin': ['GET'],
  '/api/admin/users': ['GET'],
  '/api/admin/user/:id': ['GET', 'DELETE'],
  '/api/admin/user/:id/toAdmin': ['GET'],
  '/api/admin/items': ['GET'],
  '/api/admin/item/:id': ['DELETE'],
  '/api/admin/profile': ['GET', 'PUT'],
  '/api/admin/logout': ['POST'],
};

function methodNotAllowed(req, res, next) {
  const matchedRoute = Object.keys(allowedMethodsMap).find((route) =>
    match(route, { decode: decodeURIComponent })(req.path)
  );

  if (matchedRoute) {
    const allowedMethods = allowedMethodsMap[matchedRoute];
    if (!allowedMethods.includes(req.method)) {
      res.set('Allow', allowedMethods.join(', '));
      return next(
        createError(
          405,
          `Method Not Allowed. Allowed methods: ${allowedMethods.join(', ')}`
        )
      );
    }
  }
  next();
}

export default methodNotAllowed;
