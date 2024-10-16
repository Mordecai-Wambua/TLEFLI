const allowedMethodsMap = {
  '/': ['GET'],
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
