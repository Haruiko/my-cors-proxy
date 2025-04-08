export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.hncomms.co.uk');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  const { text } = JSON.parse(body);

  if (!text) {
    return res.status(400).json({ error: 'Text content is required' });
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  console.log('OpenAI API Key:', openaiApiKey ? 'Present' : 'Missing');

  if (!openaiApiKey) {
    console.error('OpenAI API Key is missing');
    return res.status(500).json({ error: 'Server configuration error: OpenAI API key is missing' });
  }

  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const prompt = `
You are an expert in greenwashing detection. Analyze the following website content for greenwashing based on these guidelines:
1. Absolute claims (e.g., "100% eco-friendly", "carbon-neutral") must be supported by a high level of substantiation (e.g., certifications, specific data, or timelines).
2. Comparative claims (e.g., "greener", "friendlier") must be justified with a clear basis (e.g., comparison to previous products or competitors) and the basis must be transparent.

For each claim, determine:
- The risk level (1 = Low, 2 = Medium-Low, 3 = Medium, 4 = High, 5 = Severe).
- A reason for the risk level.
- Highlight the specific phrase in the text.

Return the result in **pure JSON format**, with:
- score (0–100, where higher = higher risk),
- riskLevel (string: "Low Risk", "Medium Risk", etc),
- flaggedIssuesList (array of strings),
- highlights (array of { phrase, reason, riskLevel })

DO NOT wrap your response in Markdown formatting like \`\`\`json
Content to analyze:
"${text.slice(0, 2000)}"
`;

  async function fetchWithRetry(attempt = 1, maxAttempts = 3) {
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

      if (response.status === 429) {
        throw new Error('You have exceeded your OpenAI usage quota. Please check your plan and billing at https://platform.openai.com/account/usage');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('OpenAI API raw response:', data);

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Unexpected OpenAI API response format');
      }

      return data.choices[0].message.content;
    } catch (error) {
      throw error;
    }
  }

  try {
    const raw = await fetchWithRetry();

    // Strip markdown ```json formatting if it appears
    const cleaned = raw
      .replace(/^\s*```json\s*/i, '')
      .replace(/```$/, '')
      .trim();

    const result = JSON.parse(cleaned);
    console.log('Parsed OpenAI result:', result);

    res.status(200).json({
      score: result.score,
      riskLevel: result.riskLevel,
      flaggedIssues: result.flaggedIssuesList.join('; '),
      flaggedIssuesList: result.flaggedIssuesList,
      highlights: result.highlights,
      content: text,
    });
  } catch (error) {
    console.error('Error in /api/analyze:', error.message);
    res.status(500).json({
      score: 0,
      riskLevel: 'Error',
      flaggedIssues: `Analysis failed: ${error.message}`,
      flaggedIssuesList: [`Analysis failed: ${error.message}`],
      highlights: [],
      content: text,
    });
  }
}