const allowedMethodsMap = {
  '/': ['GET'],
  '/api/status': ['GET'],
  '/api/register': ['POST'],
  '/api/login': ['POST'],
  '/api/user': ['GET'],
  '/api/profile': ['GET', 'PUT'],
  '/api/lost-items': ['GET'],
  '/api/lost-item': ['GET', 'POST', 'PUT', 'DELETE'],
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
