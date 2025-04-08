import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

export default async function handler(req, res) {
  // ✅ Fix CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://www.hncomms.co.uk');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;

  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const baseUrl = new URL(url).origin;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (GreenwashingAnalyzer/1.0)',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status} - ${errorText}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const allLinks = Array.from(document.querySelectorAll('a'))
      .map(a => a.href.trim())
      .filter(href =>
        href.startsWith(baseUrl) ||
        href.startsWith('/') // relative links
      )
      .map(link => link.startsWith('/') ? baseUrl + link : link)
      .filter(link => link.startsWith(baseUrl))
      .filter(link => !link.includes('#') && !link.includes('mailto:') && !link.includes('tel:'))
      .filter(link => !link.endsWith('.pdf') && !link.endsWith('.jpg') && !link.endsWith('.png'));

    const uniqueLinks = Array.from(new Set(allLinks)).slice(0, 5); // limit to 5

    res.status(200).json({ links: uniqueLinks });
  } catch (err) {
    console.error('Crawler error:', err.message);
    res.status(500).json({ error: `Failed to crawl links: ${err.message}` });
  }
}
