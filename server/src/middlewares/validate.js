function validate(schema) {
  return async (req, res, next) => {
    try {
      const value = await schema.validateAsync(
        {
          body: req.body,
          params: req.params,
          query: req.query
        },
        { abortEarly: false, allowUnknown: true }
      );
      if (value.body) {
        req.body = value.body;
      }
      req.validated = value;
      next();
    } catch (error) {
      error.isJoi = true;
      next(error);
    }
  };
}

module.exports = validate;
