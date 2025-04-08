const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`Fetching URL: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GreenwashingAnalyzer/1.0)',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
    }

    const text = await response.text();
    console.log(`Successfully fetched content for ${url}`);
    const { JSDOM } = require('jsdom'); // This line requires jsdom
    const dom = new JSDOM(text);
    const bodyText = dom.window.document.body.textContent.trim();

    res.status(200).json({ text: bodyText });
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    res.status(500).json({ error: `Failed to retrieve content: ${error.message}` });
  }
};