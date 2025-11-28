const { fetchHTML } = require("./fetcher");
const { parseMain } = require("./parsers");

async function getDonaldsonData(code) {
  const url1 = `https://shop.donaldson.com/store/en-us/product/${code}/80`;

  const html = await fetchHTML(url1);
  if (!html) return { found: false };

  const parsed = parseMain(html);

  return {
    found: true,
    donaldson_code: code,
    ...parsed
  };
}

module.exports = { getDonaldsonData };
