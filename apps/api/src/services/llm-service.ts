import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ApiError } from '@hedge-fund-tracker/shared';

interface LLMProvider {
  generateAnalysis(prompt: string, data: any, options?: LLMOptions): Promise<string>;
  generateSummary(text: string, maxLength?: number): Promise<string>;
  generateInsights(data: any, analysisType: string): Promise<string[]>;
}

interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateAnalysis(prompt: string, data: any, options: LLMOptions = {}): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a senior financial analyst specializing in hedge fund analysis and 13F filings.
            Provide detailed, professional insights based on the data provided.
            Focus on investment themes, risk assessment, and market implications.
            Use specific numbers and percentages from the data to support your analysis.`
          },
          {
            role: 'user',
            content: `${prompt}\n\nData: ${JSON.stringify(data, null, 2)}`
          }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000
      });

      return response.choices[0]?.message?.content || 'No analysis generated';
    } catch (error) {
      throw new ApiError(`OpenAI API error: ${error.message}`, 500, 'OPENAI_ERROR');
    }
  }

  async generateSummary(text: string, maxLength: number = 200): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Summarize the following financial analysis in ${maxLength} words or less. Focus on key insights and actionable information.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.5,
        max_tokens: Math.ceil(maxLength * 1.3) // Account for token-to-word ratio
      });

      return response.choices[0]?.message?.content || 'No summary generated';
    } catch (error) {
      throw new ApiError(`OpenAI summary error: ${error.message}`, 500, 'OPENAI_SUMMARY_ERROR');
    }
  }

  async generateInsights(data: any, analysisType: string): Promise<string[]> {
    const prompt = this.buildInsightsPrompt(data, analysisType);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Generate 3-5 specific, actionable insights based on the hedge fund data provided.
            Each insight should be a single sentence highlighting a key finding or implication.
            Focus on trends, risks, opportunities, and notable patterns.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500
      });

      const insights = response.choices[0]?.message?.content || '';
      return insights.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(insight => insight.length > 20);
    } catch (error) {
      throw new ApiError(`OpenAI insights error: ${error.message}`, 500, 'OPENAI_INSIGHTS_ERROR');
    }
  }

  private buildInsightsPrompt(data: any, analysisType: string): string {
    switch (analysisType) {
      case 'portfolio_summary':
        return `Analyze this hedge fund portfolio data and provide key insights:
        Fund: ${data.fund}
        Total Value: $${(data.totalValue / 100).toLocaleString()}
        Position Count: ${data.positionCount}
        Top 10 Concentration: ${data.top10Concentration}%
        Sector Allocation: ${JSON.stringify(data.sectorAllocation)}
        Top Holdings: ${JSON.stringify(data.topHoldings)}`;

      case 'sector_trends':
        return `Analyze these sector allocation trends and provide insights:
        ${JSON.stringify(data)}`;

      case 'position_changes':
        return `Analyze these position changes and provide insights:
        ${JSON.stringify(data)}`;

      default:
        return `Analyze this financial data and provide insights: ${JSON.stringify(data)}`;
    }
  }
}

class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateAnalysis(prompt: string, data: any, options: LLMOptions = {}): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: options.model || 'claude-3-sonnet-20240229',
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: `As a senior financial analyst specializing in hedge fund analysis and 13F filings, please provide detailed, professional insights based on the data provided. Focus on investment themes, risk assessment, and market implications. Use specific numbers and percentages from the data to support your analysis.

${prompt}

Data: ${JSON.stringify(data, null, 2)}`
          }
        ]
      });

      return response.content[0]?.type === 'text' ? response.content[0].text : 'No analysis generated';
    } catch (error) {
      throw new ApiError(`Anthropic API error: ${error.message}`, 500, 'ANTHROPIC_ERROR');
    }
  }

  async generateSummary(text: string, maxLength: number = 200): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: Math.ceil(maxLength * 1.3),
        temperature: 0.5,
        messages: [
          {
            role: 'user',
            content: `Summarize the following financial analysis in ${maxLength} words or less. Focus on key insights and actionable information:\n\n${text}`
          }
        ]
      });

      return response.content[0]?.type === 'text' ? response.content[0].text : 'No summary generated';
    } catch (error) {
      throw new ApiError(`Anthropic summary error: ${error.message}`, 500, 'ANTHROPIC_SUMMARY_ERROR');
    }
  }

  async generateInsights(data: any, analysisType: string): Promise<string[]> {
    const prompt = this.buildInsightsPrompt(data, analysisType);

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        temperature: 0.8,
        messages: [
          {
            role: 'user',
            content: `Generate 3-5 specific, actionable insights based on the hedge fund data provided. Each insight should be a single sentence highlighting a key finding or implication. Focus on trends, risks, opportunities, and notable patterns.\n\n${prompt}`
          }
        ]
      });

      const insights = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return insights.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim())
        .filter(insight => insight.length > 20);
    } catch (error) {
      throw new ApiError(`Anthropic insights error: ${error.message}`, 500, 'ANTHROPIC_INSIGHTS_ERROR');
    }
  }

  private buildInsightsPrompt(data: any, analysisType: string): string {
    switch (analysisType) {
      case 'portfolio_summary':
        return `Analyze this hedge fund portfolio data:
        Fund: ${data.fund}
        Total Value: $${(data.totalValue / 100).toLocaleString()}
        Position Count: ${data.positionCount}
        Top 10 Concentration: ${data.top10Concentration}%
        Sector Allocation: ${JSON.stringify(data.sectorAllocation)}
        Top Holdings: ${JSON.stringify(data.topHoldings)}`;

      case 'sector_trends':
        return `Analyze these sector allocation trends: ${JSON.stringify(data)}`;

      case 'position_changes':
        return `Analyze these position changes: ${JSON.stringify(data)}`;

      default:
        return `Analyze this financial data: ${JSON.stringify(data)}`;
    }
  }
}

export class LLMService {
  private provider: LLMProvider;
  private fallbackProvider?: LLMProvider;

  constructor() {
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (openaiKey) {
      this.provider = new OpenAIProvider(openaiKey);
      if (anthropicKey) {
        this.fallbackProvider = new AnthropicProvider(anthropicKey);
      }
    } else if (anthropicKey) {
      this.provider = new AnthropicProvider(anthropicKey);
    } else {
      throw new Error('No LLM API keys configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY');
    }
  }

  async generateAnalysis(prompt: string, data: any, options?: LLMOptions): Promise<string> {
    try {
      return await this.provider.generateAnalysis(prompt, data, options);
    } catch (error) {
      if (this.fallbackProvider) {
        console.warn('Primary LLM provider failed, trying fallback:', error.message);
        return await this.fallbackProvider.generateAnalysis(prompt, data, options);
      }
      throw error;
    }
  }

  async generateSummary(text: string, maxLength?: number): Promise<string> {
    try {
      return await this.provider.generateSummary(text, maxLength);
    } catch (error) {
      if (this.fallbackProvider) {
        console.warn('Primary LLM provider failed for summary, trying fallback:', error.message);
        return await this.fallbackProvider.generateSummary(text, maxLength);
      }
      throw error;
    }
  }

  async generateInsights(data: any, analysisType: string): Promise<string[]> {
    try {
      return await this.provider.generateInsights(data, analysisType);
    } catch (error) {
      if (this.fallbackProvider) {
        console.warn('Primary LLM provider failed for insights, trying fallback:', error.message);
        return await this.fallbackProvider.generateInsights(data, analysisType);
      }
      throw error;
    }
  }

  async generatePortfolioAnalysis(fundData: any): Promise<{
    summary: string;
    insights: string[];
    riskAssessment: string;
    recommendations: string[];
  }> {
    const prompt = `Provide a comprehensive portfolio analysis for ${fundData.fund} including:
    1. Overall portfolio assessment
    2. Risk evaluation
    3. Investment strategy analysis
    4. Sector concentration review
    5. Specific recommendations`;

    const [analysis, insights] = await Promise.all([
      this.generateAnalysis(prompt, fundData),
      this.generateInsights(fundData, 'portfolio_summary')
    ]);

    // Extract sections from analysis
    const sections = this.parseAnalysisSections(analysis);

    return {
      summary: sections.summary || analysis.substring(0, 500),
      insights,
      riskAssessment: sections.risk || 'Risk assessment not available',
      recommendations: sections.recommendations || ['Review portfolio concentration', 'Monitor sector allocation']
    };
  }

  async generateMarketAnalysis(marketData: any, analysisType: string): Promise<{
    summary: string;
    trends: string[];
    risks: string[];
    opportunities: string[];
  }> {
    const prompt = `Analyze current market trends based on hedge fund activity:
    1. Identify key market trends
    2. Assess systemic risks
    3. Highlight investment opportunities
    4. Provide market outlook`;

    const [analysis, insights] = await Promise.all([
      this.generateAnalysis(prompt, marketData),
      this.generateInsights(marketData, analysisType)
    ]);

    return {
      summary: analysis.substring(0, 800),
      trends: insights.filter(i => i.includes('trend') || i.includes('increasing') || i.includes('growing')),
      risks: insights.filter(i => i.includes('risk') || i.includes('concern') || i.includes('warning')),
      opportunities: insights.filter(i => i.includes('opportunity') || i.includes('potential') || i.includes('favorable'))
    };
  }

  private parseAnalysisSections(analysis: string): {
    summary?: string;
    risk?: string;
    recommendations?: string[];
  } {
    const sections: any = {};

    // Extract summary (first paragraph)
    const firstParagraph = analysis.split('\n\n')[0];
    if (firstParagraph) {
      sections.summary = firstParagraph;
    }

    // Extract risk section
    const riskMatch = analysis.match(/risk.*?(?=\n\n|\n[A-Z]|$)/is);
    if (riskMatch) {
      sections.risk = riskMatch[0];
    }

    // Extract recommendations
    const recommendationMatches = analysis.match(/recommend.*?\n/gi);
    if (recommendationMatches) {
      sections.recommendations = recommendationMatches.map(r => r.trim());
    }

    return sections;
  }
}

// Singleton instance
export const llmService = new LLMService();