import axios, { AxiosInstance } from 'axios';
import { ApiError } from '@hedge-fund-tracker/shared';

export interface EdgarFilingIndex {
  accession_number: string;
  cik: string;
  company_name: string;
  form_type: string;
  date_filed: string;
  file_name: string;
}

export interface EdgarCompanyFacts {
  cik: string;
  entityName: string;
  facts: Record<string, any>;
}

export class SecEdgarClient {
  private client: AxiosInstance;
  private rateLimitDelay: number;

  constructor(userAgent: string, rateLimitPerSecond = 10) {
    this.rateLimitDelay = 1000 / rateLimitPerSecond;

    this.client = axios.create({
      baseURL: 'https://data.sec.gov',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Host': 'data.sec.gov'
      },
      timeout: 30000
    });

    // Add rate limiting interceptor
    this.client.interceptors.request.use(
      async (config) => {
        await this.delay(this.rateLimitDelay);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          throw new ApiError('Rate limit exceeded', 429, 'RATE_LIMIT');
        }
        if (error.response?.status === 403) {
          throw new ApiError('Access forbidden - check User-Agent header', 403, 'FORBIDDEN');
        }
        throw new ApiError(
          error.message || 'SEC EDGAR API request failed',
          error.response?.status || 500,
          'EDGAR_API_ERROR'
        );
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get daily filing index for a specific date
   */
  async getDailyIndex(date: Date): Promise<EdgarFilingIndex[]> {
    const year = date.getFullYear();
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');

    const url = `/Archives/edgar/daily-index/${year}/QTR${quarter}/form.${dateStr}.idx`;

    try {
      const response = await this.client.get(url, {
        headers: { 'Accept': 'text/plain' }
      });

      return this.parseIndexFile(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return []; // No filings for this date
      }
      throw error;
    }
  }

  /**
   * Get 13F filings for a specific date range
   */
  async get13FFilings(startDate: Date, endDate: Date): Promise<EdgarFilingIndex[]> {
    const filings: EdgarFilingIndex[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dailyFilings = await this.getDailyIndex(currentDate);
      const filtered13F = dailyFilings.filter(filing =>
        filing.form_type === '13F-HR' || filing.form_type === '13F-HR/A'
      );

      filings.push(...filtered13F);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return filings;
  }

  /**
   * Get company facts by CIK
   */
  async getCompanyFacts(cik: string): Promise<EdgarCompanyFacts> {
    const paddedCik = cik.padStart(10, '0');
    const url = `/api/xbrl/companyfacts/CIK${paddedCik}.json`;

    const response = await this.client.get(url);
    return response.data;
  }

  /**
   * Download and parse a 13F filing document
   */
  async downloadFiling(accessionNumber: string, cik: string): Promise<string> {
    const paddedCik = cik.padStart(10, '0');
    const cleanAccession = accessionNumber.replace(/-/g, '');

    // Try different possible file paths for 13F filings
    const possiblePaths = [
      `/Archives/edgar/data/${paddedCik}/${cleanAccession}/form13fInfoTable.xml`,
      `/Archives/edgar/data/${paddedCik}/${cleanAccession}/primary_doc.xml`,
      `/Archives/edgar/data/${paddedCik}/${cleanAccession}/${accessionNumber}.txt`
    ];

    for (const path of possiblePaths) {
      try {
        const response = await this.client.get(path, {
          headers: { 'Accept': 'text/plain, application/xml' }
        });
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          continue; // Try next path
        }
        throw error;
      }
    }

    throw new ApiError(`13F filing not found for accession ${accessionNumber}`, 404, 'FILING_NOT_FOUND');
  }

  /**
   * Search for filings by company CIK
   */
  async getCompanyFilings(cik: string, formType = '13F-HR', count = 100): Promise<any> {
    const paddedCik = cik.padStart(10, '0');
    const url = `/submissions/CIK${paddedCik}.json`;

    const response = await this.client.get(url);
    const data = response.data;

    if (!data.filings?.recent) {
      return { filings: [] };
    }

    // Filter and format filings
    const filings = [];
    const recent = data.filings.recent;

    for (let i = 0; i < Math.min(recent.form.length, count); i++) {
      if (recent.form[i] === formType || recent.form[i] === `${formType}/A`) {
        filings.push({
          accessionNumber: recent.accessionNumber[i],
          filingDate: recent.filingDate[i],
          primaryDocument: recent.primaryDocument[i],
          form: recent.form[i]
        });
      }
    }

    return {
      cik: data.cik,
      entityName: data.name,
      filings
    };
  }

  private parseIndexFile(indexContent: string): EdgarFilingIndex[] {
    const lines = indexContent.split('\n');
    const filings: EdgarFilingIndex[] = [];

    // Skip header lines and find data start
    let dataStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Company Name') && lines[i].includes('Form Type')) {
        dataStartIndex = i + 2; // Skip header and separator line
        break;
      }
    }

    if (dataStartIndex === -1) return filings;

    // Parse filing entries
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by multiple spaces (EDGAR format)
      const parts = line.split(/\s{2,}/);
      if (parts.length >= 5) {
        filings.push({
          company_name: parts[0],
          form_type: parts[1],
          cik: parts[2],
          date_filed: parts[3],
          file_name: parts[4],
          accession_number: this.extractAccessionNumber(parts[4])
        });
      }
    }

    return filings;
  }

  private extractAccessionNumber(fileName: string): string {
    // Extract accession number from file name
    const match = fileName.match(/(\d{10}-\d{2}-\d{6})/);
    return match ? match[1] : '';
  }
}