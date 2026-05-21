const Joi = require('joi');

/**
 * Generic validation middleware using Joi
 * @param {Joi.ObjectSchema} schema - The Joi schema to validate against
 * @param {string} property - The property on req to validate (e.g. 'body', 'query', 'params')
 */
module.exports = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors
      stripUnknown: true // Remove unknown keys
    });

    if (error) {
      const messages = error.details.map(i => i.message);
      return res.status(400).json({ error: 'Validation Error', details: messages });
    }

    // Replace request property with validated/sanitized value
    req[property] = value;
    next();
  };
};
