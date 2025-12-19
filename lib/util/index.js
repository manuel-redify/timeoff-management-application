
const config = require('../config');

const defaultLocale = config.get("locale_code_for_sorting") || "en";

/**
 * Local aware comparator to be used as compare function for Array's `sort` function
 */
const sorter = (a, b) => String(a).localeCompare(String(b), defaultLocale);

const get_sorted_countries = () => {
  const countries = config.get('countries');
  return Object.keys(countries)
    .map(key => ({ code: key, name: countries[key].name }))
    .sort((a, b) => sorter(a.name, b.name));
};

const get_filtered_sorted_countries = (codes) => {
  const countries = config.get('countries');
  const codesSet = new Set(codes);
  return Object.keys(countries)
    .filter(key => codesSet.has(key))
    .map(key => ({ code: key, name: countries[key].name }))
    .sort((a, b) => sorter(a.name, b.name));
};

module.exports = {
  sorter,
  get_sorted_countries,
  get_filtered_sorted_countries,
};