// middleware/localization.js
const acceptLanguageParser = require("accept-language-parser");

function localization(req, res, next) {
  // precedence: ?lang > Accept-Language > en
  const q = req.query.lang?.toLowerCase();
  const header = req.headers["accept-language"];

  let lang = "en";
  if (q === "ar") lang = "ar";
  else if (q === "en") lang = "en";
  else if (header) {
    const parsed = acceptLanguageParser.pick(["en", "ar"], header, { loose: true });
    if (parsed === "ar") lang = "ar";
  }

  res.locals.lang = lang;
  res.locals.dir = lang === "ar" ? "rtl" : "ltr";
  next();
}

module.exports = { localization };
