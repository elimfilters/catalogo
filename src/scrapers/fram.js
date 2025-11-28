const { fetchHTML } = require("./fetcher");
const { parseMain } = require("./parsers");

async function getFRAMData(code) {
  const url = `https://www.fram.com/search?q=${code}`;

  const html = await fetchHTML(url);
  if (!html) return { found: false };

  const parsed = parseMain(html);

  return {
    found: true,
    fram_code: code,
    ...parsed
  };
}

module.exports = { getFRAMData };
