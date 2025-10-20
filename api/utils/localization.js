/**
 * Localization utilities for EN/AR support
 * Handles text direction, date formatting, and content translation
 */

// Supported languages
const SUPPORTED_LANGUAGES = {
  EN: 'en',
  AR: 'ar'
};

// Default language
const DEFAULT_LANGUAGE = 'en';

// RTL languages
const RTL_LANGUAGES = ['ar'];

/**
 * Get language from request headers or query params
 * @param {Object} req - Express request object
 * @returns {string} - Language code (en/ar)
 */
function getLanguageFromRequest(req) {
  // Priority: query param > header > default
  const queryLang = req.query?.lang || req.query?.language;
  const headerLang = req.headers['accept-language'] || req.headers['x-language'];
  
  if (queryLang && SUPPORTED_LANGUAGES[queryLang.toUpperCase()]) {
    return SUPPORTED_LANGUAGES[queryLang.toUpperCase()];
  }
  
  if (headerLang) {
    const lang = headerLang.split(',')[0].split('-')[0].toLowerCase();
    if (lang === 'ar') return 'ar';
    if (lang === 'en') return 'en';
  }
  
  return DEFAULT_LANGUAGE;
}

/**
 * Check if language is RTL
 * @param {string} lang - Language code
 * @returns {boolean}
 */
function isRTL(lang) {
  return RTL_LANGUAGES.includes(lang);
}

/**
 * Get text direction for language
 * @param {string} lang - Language code
 * @returns {string} - 'ltr' or 'rtl'
 */
function getTextDirection(lang) {
  return isRTL(lang) ? 'rtl' : 'ltr';
}

/**
 * Localized messages
 */
const MESSAGES = {
  en: {
    // Success messages
    logoCreated: 'Logo created successfully',
    logoUpdated: 'Logo updated successfully',
    logoDeleted: 'Logo deleted successfully',
    logoFetched: 'Logo fetched successfully',
    logosFetched: 'Logos fetched successfully',
    backgroundAdded: 'Background added to library',
    iconAdded: 'Icon added to library',
    backgroundFetched: 'Background fetched successfully',
    iconFetched: 'Icon fetched successfully',
    backgroundsFetched: 'Backgrounds fetched successfully',
    iconsFetched: 'Icons fetched successfully',
    
    // Error messages
    logoNotFound: 'Logo not found',
    backgroundNotFound: 'Background not found',
    iconNotFound: 'Icon not found',
    invalidData: 'Invalid data provided',
    serverError: 'Internal server error',
    validationError: 'Validation error',
    
    // Field labels
    name: 'Name',
    description: 'Description',
    category: 'Category',
    tags: 'Tags',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    type: 'Type',
    width: 'Width',
    height: 'Height',
    url: 'URL',
    
    // Categories
    general: 'General',
    abstract: 'Abstract',
    geometric: 'Geometric',
    nature: 'Nature',
    business: 'Business',
    emotions: 'Emotions',
    symbols: 'Symbols',
    technology: 'Technology',
    
    // Types
    raster: 'Raster',
    vector: 'Vector',
    solid: 'Solid',
    gradient: 'Gradient',
    image: 'Image'
  },
  
  ar: {
    // Success messages
    logoCreated: 'تم إنشاء الشعار بنجاح',
    logoUpdated: 'تم تحديث الشعار بنجاح',
    logoDeleted: 'تم حذف الشعار بنجاح',
    logoFetched: 'تم جلب الشعار بنجاح',
    logosFetched: 'تم جلب الشعارات بنجاح',
    backgroundAdded: 'تم إضافة الخلفية إلى المكتبة',
    iconAdded: 'تم إضافة الأيقونة إلى المكتبة',
    backgroundFetched: 'تم جلب الخلفية بنجاح',
    iconFetched: 'تم جلب الأيقونة بنجاح',
    backgroundsFetched: 'تم جلب الخلفيات بنجاح',
    iconsFetched: 'تم جلب الأيقونات بنجاح',
    
    // Error messages
    logoNotFound: 'الشعار غير موجود',
    backgroundNotFound: 'الخلفية غير موجودة',
    iconNotFound: 'الأيقونة غير موجودة',
    invalidData: 'البيانات غير صحيحة',
    serverError: 'خطأ في الخادم',
    validationError: 'خطأ في التحقق من البيانات',
    
    // Field labels
    name: 'الاسم',
    description: 'الوصف',
    category: 'الفئة',
    tags: 'العلامات',
    createdAt: 'تاريخ الإنشاء',
    updatedAt: 'تاريخ التحديث',
    type: 'النوع',
    width: 'العرض',
    height: 'الارتفاع',
    url: 'الرابط',
    
    // Categories
    general: 'عام',
    abstract: 'مجرد',
    geometric: 'هندسي',
    nature: 'طبيعة',
    business: 'أعمال',
    emotions: 'مشاعر',
    symbols: 'رموز',
    technology: 'تقنية',
    
    // Types
    raster: 'نقطي',
    vector: 'متجه',
    solid: 'صلب',
    gradient: 'تدرج',
    image: 'صورة'
  }
};

/**
 * Get localized message
 * @param {string} lang - Language code
 * @param {string} key - Message key
 * @param {Object} params - Parameters for message interpolation
 * @returns {string} - Localized message
 */
function getMessage(lang, key, params = {}) {
  const messages = MESSAGES[lang] || MESSAGES[DEFAULT_LANGUAGE];
  let message = messages[key] || key;
  
  // Replace parameters
  Object.keys(params).forEach(param => {
    message = message.replace(`{${param}}`, params[param]);
  });
  
  return message;
}

/**
 * Format date according to language
 * @param {Date} date - Date object
 * @param {string} lang - Language code
 * @returns {string} - Formatted date
 */
function formatDate(date, lang) {
  if (!date) return null;
  
  const d = new Date(date);
  
  if (lang === 'ar') {
    // Arabic date format
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // English date format
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Localize response object
 * @param {Object} data - Response data
 * @param {string} lang - Language code
 * @returns {Object} - Localized response
 */
function localizeResponse(data, lang) {
  if (!data || typeof data !== 'object') return data;
  
  const localized = { ...data };
  
  // Add language metadata
  localized.language = lang;
  localized.direction = getTextDirection(lang);
  
  // Localize dates
  if (localized.createdAt) {
    localized.createdAtFormatted = formatDate(localized.createdAt, lang);
  }
  if (localized.updatedAt) {
    localized.updatedAtFormatted = formatDate(localized.updatedAt, lang);
  }
  
  // Localize array items
  if (Array.isArray(localized.data)) {
    localized.data = localized.data.map(item => localizeResponse(item, lang));
  }
  
  return localized;
}

/**
 * Create localized success response
 * @param {Object} res - Express response object
 * @param {string} lang - Language code
 * @param {string} messageKey - Message key
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code
 */
function sendLocalizedSuccess(res, lang, messageKey, data = null, statusCode = 200) {
  const message = getMessage(lang, messageKey);
  const response = {
    success: true,
    message,
    language: lang,
    direction: getTextDirection(lang)
  };
  
  if (data) {
    response.data = localizeResponse(data, lang);
  }
  
  res.status(statusCode).json(response);
}

/**
 * Create localized error response
 * @param {Object} res - Express response object
 * @param {string} lang - Language code
 * @param {string} messageKey - Message key
 * @param {number} statusCode - HTTP status code
 */
function sendLocalizedError(res, lang, messageKey, statusCode = 400) {
  const message = getMessage(lang, messageKey);
  res.status(statusCode).json({
    success: false,
    message,
    language: lang,
    direction: getTextDirection(lang)
  });
}

/**
 * Middleware to add localization to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function localizationMiddleware(req, res, next) {
  req.language = getLanguageFromRequest(req);
  req.isRTL = isRTL(req.language);
  req.direction = getTextDirection(req.language);
  req.t = (key, params) => getMessage(req.language, key, params);
  req.sendSuccess = (messageKey, data, statusCode) => 
    sendLocalizedSuccess(res, req.language, messageKey, data, statusCode);
  req.sendError = (messageKey, statusCode) => 
    sendLocalizedError(res, req.language, messageKey, statusCode);
  
  next();
}

module.exports = {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  getLanguageFromRequest,
  isRTL,
  getTextDirection,
  getMessage,
  formatDate,
  localizeResponse,
  sendLocalizedSuccess,
  sendLocalizedError,
  localizationMiddleware
};
