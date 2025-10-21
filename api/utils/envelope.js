// utils/envelope.js
function ok(payload, lang, msg) {
  return {
    success: true,
    message: msg ?? (lang === "ar" ? "تم تنفيذ الطلب بنجاح" : "Request completed successfully"),
    language: lang,
    direction: lang === "ar" ? "rtl" : "ltr",
    data: payload,
  };
}

function fail(lang, message) {
  return {
    success: false,
    message,
    language: lang,
    direction: lang === "ar" ? "rtl" : "ltr",
  };
}

module.exports = { ok, fail };
