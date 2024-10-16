function errorHandler(err, req, res, next) {
  if (err.status) {
    res.status(err.status).json({ Error: err.message });
  } else {
    res.status(500).json({ Error: err.message });
  }
}

export default errorHandler;
