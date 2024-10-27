const allowedMethodsMap = {
  '/': ['GET'],
  '/api/status': ['GET'],
  '/api/register': ['POST'],
  '/api/login': ['POST'],
  '/api/refresh': ['POST'],
  '/api/user': ['GET'],
  '/api/user/profile': ['GET', 'PUT'],
  '/api/user/items': ['GET'],
  '/api/user/item': ['POST'],
  '/api/user/item/:id': ['GET', 'PUT', 'DELETE'],
};

function methodNotAllowed(req, res, next) {
  const allowedMethods = allowedMethodsMap[req.path];

  if (allowedMethods && !allowedMethods.includes(req.method)) {
    res.set('Allow', allowedMethods.join(', '));
    return res.status(405).send({
      error: `Method Not Allowed. Allowed methods: ${allowedMethods.join(
        ', '
      )}`,
    });
  }

  next();
}

export default methodNotAllowed;
