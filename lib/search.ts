// ===========================
// Web Search via Tavily API
// Purpose-built search for AI agents
// Free: 1000 searches/month at https://tavily.com
// ===========================

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  answer?: string;
}

/**
 * Search the web using Tavily API
 */
export async function searchWeb(query: string): Promise<SearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    console.warn('TAVILY_API_KEY not set — web search disabled');
    return { results: [], query };
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: false,
        max_results: 8,
        include_domains: [],
        exclude_domains: [],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Tavily search error:', errText);
      return { results: [], query };
    }

    const data = await response.json();

    return {
      query,
      answer: data.answer || undefined,
      results: (data.results || []).map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        content: r.content || '',
        score: r.score || 0,
      })),
    };
  } catch (error) {
    console.error('Web search failed:', error);
    return { results: [], query };
  }
}

/**
 * Detect if a user message needs real-time web search
 */
export function needsWebSearch(message: string): boolean {
  const lower = message.toLowerCase();

  // Strong indicators — user explicitly wants current/live info
  const strongPatterns = [
    /\b(latest|recent|current|today'?s?|tonight|this week|this month|this year)\b/,
    /\b(news|headlines|update|updates|breaking)\b/,
    /\b(what('?s| is) happening)\b/,
    /\b(who won|who is winning|score|results)\b/,
    /\b(price of|stock|market|crypto|bitcoin|ethereum)\b/,
    /\b(weather|forecast|temperature)\b/,
    /\b(released|launched|announced|unveiled)\b.*\b(today|recently|just|new)\b/,
    /\b(search|look up|find out|google|check)\b/,
    /\b(202[4-9]|203[0-9])\b/, // Years in the future from training data
    /\b(trending|viral|popular right now)\b/,
    /\b(election|vote|poll|polls)\b.*\b(result|latest|current|2024|2025|2026)\b/,
    /\b(died|passed away|born)\b.*\b(today|recently|yesterday|this week)\b/,
    /\b(new release|just released|coming out|came out)\b/,
    /\b(schedule|upcoming|next game|next match|fixture)\b/,
  ];

  for (const pattern of strongPatterns) {
    if (pattern.test(lower)) return true;
  }

  // Contextual keywords — multiple hits increase confidence
  const contextKeywords = [
    'now', 'today', 'latest', 'current', 'recent', 'new',
    'update', 'news', 'live', 'real-time', 'real time',
    'happening', 'going on', 'status', 'announce',
  ];

  let keywordHits = 0;
  for (const kw of contextKeywords) {
    if (lower.includes(kw)) keywordHits++;
  }

  return keywordHits >= 2;
}

/**
 * Format search results into context for the LLM
 */
export function formatSearchContext(searchResponse: SearchResponse): string {
  if (searchResponse.results.length === 0) {
    return '';
  }

  let context = `\n\n📡 **WEB SEARCH RESULTS** (searched: "${searchResponse.query}")\n`;
  context += `🕐 Search performed at: ${new Date().toISOString()}\n\n`;

  if (searchResponse.answer) {
    context += `**Quick Answer:** ${searchResponse.answer}\n\n`;
  }

  context += `**Sources:**\n`;
  searchResponse.results.forEach((result, i) => {
    context += `\n[${i + 1}] **${result.title}**\n`;
    context += `    URL: ${result.url}\n`;
    context += `    ${result.content.substring(0, 300)}${result.content.length > 300 ? '...' : ''}\n`;
  });

  context += `\n---\n`;
  context += `Use the above search results to give the user an accurate, up-to-date answer. `;
  context += `Cite sources with their numbers [1], [2], etc. when referencing specific information. `;
  context += `If the search results don't contain relevant info, say so honestly.\n`;

  return context;
}
