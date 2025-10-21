// utils/date.js
const { DateTime } = require("luxon");

function formatISOToLocale(iso, lang) {
  if (!iso) return null;
  const dt = DateTime.fromISO(iso, { zone: "UTC" });
  return lang === "ar"
    ? dt.setLocale("ar").toFormat("d LLLL yyyy، hh:mm a")  // مثال: ١٥ أكتوبر ٢٠٢٥، ٠٩:٠٣ م
    : dt.setLocale("en").toFormat("LLLL d, yyyy 'at' hh:mm a"); // October 15, 2025 at 09:03 PM
}

module.exports = { formatISOToLocale };
