const Joi = require('joi');

/**
 * Translation API Validation Schemas
 */

// Supported language codes (ISO 639-1)
const supportedLanguages = [
  'auto', 'af', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bs', 'bg', 'ca', 'ceb',
  'ny', 'zh', 'zh-cn', 'zh-tw', 'co', 'hr', 'cs', 'da', 'nl', 'en', 'eo', 'et', 'tl',
  'fi', 'fr', 'fy', 'gl', 'ka', 'de', 'el', 'gu', 'ht', 'ha', 'haw', 'iw', 'he', 'hi',
  'hmn', 'hu', 'is', 'ig', 'id', 'ga', 'it', 'ja', 'jw', 'kn', 'kk', 'km', 'ko', 'ku',
  'ky', 'lo', 'la', 'lv', 'lt', 'lb', 'mk', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mn',
  'my', 'ne', 'no', 'or', 'ps', 'fa', 'pl', 'pt', 'pa', 'ro', 'ru', 'sm', 'gd', 'sr',
  'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'te',
  'th', 'tr', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu'
];

// Target languages (cannot be 'auto')
const targetLanguages = supportedLanguages.filter(lang => lang !== 'auto');

/**
 * Translation request validation schema
 */
const translateRequestSchema = Joi.object({
  sourceLanguage: Joi.string()
    .valid(...supportedLanguages)
    .default('auto')
    .messages({
      'any.only': 'sourceLanguage must be a valid language code. Supported codes: ' + supportedLanguages.join(', ')
    }),

  targetLanguage: Joi.string()
    .valid(...targetLanguages)
    .required()
    .messages({
      'any.required': 'targetLanguage is required',
      'any.only': 'targetLanguage must be a valid language code (cannot be "auto"). Supported codes: ' + targetLanguages.join(', ')
    }),

  content: Joi.string()
    .min(1)
    .max(5000) // Google Translate API limit
    .required()
    .messages({
      'any.required': 'content is required',
      'string.empty': 'content cannot be empty',
      'string.min': 'content must be at least 1 character long',
      'string.max': 'content cannot exceed 5000 characters'
    }),

  contentType: Joi.string()
    .valid('text', 'html')
    .default('text')
    .messages({
      'any.only': 'contentType must be either "text" or "html"'
    })
});

/**
 * Language detection request validation schema
 */
const detectLanguageRequestSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(5000)
    .required()
    .messages({
      'any.required': 'content is required for language detection',
      'string.empty': 'content cannot be empty',
      'string.min': 'content must be at least 1 character long',
      'string.max': 'content cannot exceed 5000 characters'
    })
});

/**
 * Validate translation request
 * @param {Object} data - Request data to validate
 * @returns {Object} - Validation result
 */
function validateTranslateRequest(data) {
  const { error, value } = translateRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context.value
    }));

    return {
      isValid: false,
      errors,
      data: null
    };
  }

  return {
    isValid: true,
    errors: null,
    data: value
  };
}

/**
 * Validate language detection request
 * @param {Object} data - Request data to validate
 * @returns {Object} - Validation result
 */
function validateDetectLanguageRequest(data) {
  const { error, value } = detectLanguageRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context.value
    }));

    return {
      isValid: false,
      errors,
      data: null
    };
  }

  return {
    isValid: true,
    errors: null,
    data: value
  };
}

/**
 * Get list of supported languages
 * @returns {Object} - Language information
 */
function getSupportedLanguages() {
  return {
    sourceLanguages: supportedLanguages,
    targetLanguages: targetLanguages,
    total: supportedLanguages.length
  };
}

module.exports = {
  validateTranslateRequest,
  validateDetectLanguageRequest,
  getSupportedLanguages,
  supportedLanguages,
  targetLanguages
};
