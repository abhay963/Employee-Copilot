import { config } from '../../config/index.js';

// ============================================================
// TAVILY WEB SEARCH TOOL
// ============================================================

class TavilyTool {
  constructor() {
    if (!config.tavilyApiKey) {
      console.warn(
        'TAVILY_API_KEY not configured. Web search will not be available.'
      );
      this.isConfigured = false;
      return;
    }

    this.isConfigured = true;
    this.apiKey = config.tavilyApiKey;
    this.apiUrl = 'https://api.tavily.com/search';

    console.log('Tavily search tool initialized');
  }

  async search(query, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Tavily search tool is not configured');
      }

      if (!query || typeof query !== 'string') {
        throw new Error('A valid search query is required');
      }

      console.log(`Searching web for: ${query}`);

      const {
        maxResults = 5,
        searchDepth = 'basic',
        includeAnswer = true,
        includeRawContent = false,
      } = options;

      const requestBody = {
        api_key: this.apiKey,
        query,
        max_results: maxResults,
        search_depth: searchDepth,
        include_answer: includeAnswer,
        include_raw_content: includeRawContent,
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(
          `Tavily API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data || !data.results) {
        return {
          success: true,
          results: [],
          answer: 'No search results found',
          query,
        };
      }

      const formattedResults = data.results.map((result, index) => ({
        index: index + 1,
        title: result.title || 'Untitled',
        url: result.url || '',
        content: result.content || '',
        score: result.score || 0,
      }));

      const answer = data.answer || '';

      return {
        success: true,
        results: formattedResults,
        answer,
        query,
        resultCount: formattedResults.length,
      };
    } catch (error) {
      console.error('Error in Tavily search:', error);

      return {
        success: false,
        error: error.message,
        results: [],
        query,
      };
    }
  }
}

export default new TavilyTool();