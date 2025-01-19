import { BreachEntry } from "@/types";

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;

export async function analyzeRisk(entry: BreachEntry) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity expert analyzing login credential risks. Provide detailed, quantitative risk assessments."
          },
          {
            role: "user",
            content: `Analyze the security risk for the following login credentials and provide a detailed risk assessment:

URL: ${entry.url}
Username: ${entry.username}
Password: ${entry.password}
Security Features: ${entry.metadata.hasCaptcha ? 'CAPTCHA, ' : ''}${entry.metadata.hasMfa ? 'MFA, ' : ''}${entry.metadata.isSecure ? 'HTTPS' : ''}
Breach History: ${entry.metadata.breach_info?.is_breached ? 'Previously breached' : 'No known breaches'}
${entry.metadata.breach_info?.is_breached ? `Total Breaches: ${entry.metadata.breach_info.total_breaches}` : ''}
${entry.metadata.breach_info?.is_breached ? `Compromised Passwords: ${entry.metadata.breach_info.total_pwned}` : ''}

Analyze the following aspects and provide a risk assessment:
1. Password strength and complexity
2. Security features present/absent
3. Breach history impact
4. URL/domain security
5. Overall vulnerability assessment

Provide a JSON response with:
1. risk_level: "low", "medium", or "high"
2. risk_score: A number between 0 and 100 (0 being most secure, 100 being highest risk)
3. analysis: A brief analysis of the security implications
4. recommendations: List of specific security recommendations
5. factors: List of objects containing:
   - name: Factor name
   - impact: "positive" or "negative"
   - weight: Impact weight (1-5)
   - description: Brief description of the factor's impact`
          }
        ],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to analyze risk');
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Error analyzing risk:', error);
    throw error;
  }
} 