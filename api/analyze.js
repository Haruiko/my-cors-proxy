const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://www.hncomms.co.uk'); // Allow requests from your Squarespace domain
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allow these HTTP methods
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Allow these headers

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text content is required' });
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const prompt = `
You are an expert in greenwashing detection. Analyze the following website content for greenwashing based on these guidelines:
1. Absolute claims (e.g., "100% eco-friendly", "carbon-neutral") must be supported by a high level of substantiation (e.g., certifications, specific data, or timelines).
2. Comparative claims (e.g., "greener", "friendlier") must be justified with a clear basis (e.g., comparison to previous products or competitors) and the basis must be transparent.

For each claim, determine:
- The risk level (1 = Low, 2 = Medium-Low, 3 = Medium, 4 = High, 5 = Severe).
- A reason for the risk level.
- Highlight the specific phrase in the text.

Return the result in JSON format with:
- score (0-100, where higher = higher risk),
- riskLevel (string: "Low Risk", "Medium-Low Risk", "Medium Risk", "High Risk", "Severe Risk"),
- flaggedIssuesList (array of strings),
- highlights (array of {phrase, reason, riskLevel}).

Content to analyze:
"${text.slice(0, 2000)}"  // Limit to avoid token overflow
`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a greenwashing analysis tool.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    res.status(200).json({
      score: result.score,
      riskLevel: result.riskLevel,
      flaggedIssues: result.flaggedIssuesList.join('; '),
      flaggedIssuesList: result.flaggedIssuesList,
      highlights: result.highlights,
      content: text,
    });
  } catch (error) {
    console.error('ChatGPT analysis failed:', error);
    res.status(500).json({
      score: 0,
      riskLevel: 'Error',
      flaggedIssues: 'Analysis failed due to API error',
      flaggedIssuesList: ['Analysis failed due to API error'],
      highlights: [],
      content: text,
    });
  }
};