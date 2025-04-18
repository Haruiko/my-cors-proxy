import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.hncomms.co.uk');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Remove unwanted elements
    const removeTags = ['script', 'style', 'noscript', 'iframe', 'svg', 'nav', 'footer', 'header'];
    removeTags.forEach(tag => {
      document.querySelectorAll(tag).forEach(el => el.remove());
    });

    // Optional: also remove hidden elements (e.g. display: none)
    document.querySelectorAll('*').forEach(el => {
      const style = dom.window.getComputedStyle(el);
      if (style?.display === 'none' || style?.visibility === 'hidden') {
        el.remove();
      }
    });

    // Extract visible body text
    const bodyText = document.body.textContent
      .replace(/\s+/g, ' ') // collapse extra whitespace
      .trim();

    res.status(200).json({ text: bodyText });
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    res.status(500).json({ error: `Failed to retrieve content: ${error.message}` });
  }
}
