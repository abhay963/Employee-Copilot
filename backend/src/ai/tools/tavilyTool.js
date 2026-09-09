import { config } from "../../config/index.js";

// ============================================================
// TAVILY SEARCH TOOL
// ============================================================

class TavilyTool {
  constructor() {
    this.apiKey = config.tavilyApiKey;
    this.baseUrl = "https://api.tavily.com/search";
  }

  get isConfigured() {
    return !!this.apiKey;
  }

  async search(query, options = {}) {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: "Tavily API key not configured",
        };
      }

      const {
        maxResults = 5,
        searchDepth = "basic",
        includeAnswer = true,
      } = options;

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: query,
          max_results: maxResults,
          search_depth: searchDepth,
          include_answer: includeAnswer,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.message || "Tavily API request failed",
        };
      }

      const data = await response.json();

      return {
        success: true,
        results: data.results || [],
        answer: data.answer || null,
      };
    } catch (error) {
      console.error("[TavilyTool]", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================================
// EXPORT SINGLETON
// ============================================================

const tavilyTool = new TavilyTool();

export default tavilyTool;
