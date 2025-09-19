import * as xml2js from 'xml2js';
import { parse as csvParse } from 'fast-csv';
import { ApiError, isValidCUSIP } from '@hedge-fund-tracker/shared';
import { Readable } from 'stream';

export interface ParsedHolding {
  nameOfIssuer: string;
  titleOfClass: string;
  cusip: string;
  value: number; // in USD (will be converted to cents)
  shrsOrPrnAmt: {
    sshPrnamt: number;
    sshPrnamtType: 'SH' | 'PRN';
  };
  investmentDiscretion: 'SOLE' | 'SHARED' | 'NONE';
  votingAuthority: {
    sole: number;
    shared: number;
    none: number;
  };
}

export interface ParsedFiling {
  coverPage: {
    reportCalendarOrQuarter: string;
    isAmendment: boolean;
    amendmentNo?: string;
    submissionType: string;
    reportDate: Date;
  };
  summaryPage: {
    otherIncludedManagersCount: number;
    tableEntryTotal: number;
    tableValueTotal: number; // in USD
  };
  informationTable: ParsedHolding[];
}

export class FilingParser {
  private xmlParser: xml2js.Parser;

  constructor() {
    this.xmlParser = new xml2js.Parser({
      explicitArray: false,
      explicitRoot: false,
      normalize: true,
      normalizeTags: true,
      trim: true
    });
  }

  /**
   * Parse a 13F filing document (XML or text format)
   */
  async parseFiling(content: string): Promise<ParsedFiling> {
    // Detect format and parse accordingly
    if (content.includes('<?xml') || content.includes('<informationTable>')) {
      return this.parseXmlFiling(content);
    } else if (content.includes('<HTML>') || content.includes('<html>')) {
      return this.parseHtmlFiling(content);
    } else if (content.includes('INFORMATION TABLE')) {
      return this.parseTextFiling(content);
    } else {
      throw new ApiError('Unsupported filing format', 400, 'UNSUPPORTED_FORMAT');
    }
  }

  /**
   * Parse XML format 13F filing
   */
  private async parseXmlFiling(xmlContent: string): Promise<ParsedFiling> {
    try {
      // Extract the information table XML section
      const infoTableMatch = xmlContent.match(/<informationTable>(.*?)<\/informationTable>/s);
      if (!infoTableMatch) {
        throw new ApiError('Information table not found in XML', 400, 'NO_INFO_TABLE');
      }

      const infoTableXml = `<informationTable>${infoTableMatch[1]}</informationTable>`;
      const parsed = await this.xmlParser.parseStringPromise(infoTableXml);

      const holdings: ParsedHolding[] = [];
      const infoTable = parsed.informationtable;

      // Handle both single holding and array of holdings
      const holdingsData = Array.isArray(infoTable.infotable) ?
        infoTable.infotable : [infoTable.infotable];

      for (const holding of holdingsData) {
        if (!holding) continue;

        const parsedHolding = this.parseHoldingEntry(holding);
        if (parsedHolding) {
          holdings.push(parsedHolding);
        }
      }

      // Extract cover page and summary data (simplified)
      const coverPage = this.extractCoverPageFromXml(xmlContent);
      const summaryPage = this.calculateSummaryFromHoldings(holdings);

      return {
        coverPage,
        summaryPage,
        informationTable: holdings
      };

    } catch (error) {
      throw new ApiError(`Failed to parse XML filing: ${error.message}`, 400, 'XML_PARSE_ERROR');
    }
  }

  /**
   * Parse HTML format 13F filing
   */
  private async parseHtmlFiling(htmlContent: string): Promise<ParsedFiling> {
    // Extract table data from HTML (simplified approach)
    const tableMatch = htmlContent.match(/<table[^>]*>.*?<\/table>/gis);
    if (!tableMatch) {
      throw new ApiError('No tables found in HTML filing', 400, 'NO_TABLES');
    }

    // Look for the information table (usually the largest table)
    let infoTable = '';
    for (const table of tableMatch) {
      if (table.toLowerCase().includes('cusip') ||
          table.toLowerCase().includes('name of issuer')) {
        infoTable = table;
        break;
      }
    }

    if (!infoTable) {
      throw new ApiError('Information table not found in HTML', 400, 'NO_INFO_TABLE');
    }

    return this.parseTableFromHtml(infoTable, htmlContent);
  }

  /**
   * Parse text format 13F filing
   */
  private async parseTextFiling(textContent: string): Promise<ParsedFiling> {
    const lines = textContent.split('\n');
    let inTableSection = false;
    const holdings: ParsedHolding[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Find start of information table
      if (line.includes('INFORMATION TABLE') ||
          line.includes('Name of Issuer') ||
          line.includes('CUSIP')) {
        inTableSection = true;
        continue;
      }

      // End of table
      if (inTableSection && (line.includes('END OF') || line.length === 0)) {
        break;
      }

      if (inTableSection && line.length > 0) {
        const holding = this.parseTextTableRow(line);
        if (holding) {
          holdings.push(holding);
        }
      }
    }

    const coverPage = this.extractCoverPageFromText(textContent);
    const summaryPage = this.calculateSummaryFromHoldings(holdings);

    return {
      coverPage,
      summaryPage,
      informationTable: holdings
    };
  }

  /**
   * Parse individual holding entry from XML
   */
  private parseHoldingEntry(holding: any): ParsedHolding | null {
    try {
      const cusip = holding.cusip || holding.CUSIP;
      if (!cusip || !isValidCUSIP(cusip)) {
        return null; // Skip invalid CUSIPs
      }

      const value = parseInt(holding.value || holding.VALUE || '0') * 1000; // Convert from thousands
      const shares = parseInt(holding.shrsOrPrnAmt?.sshPrnamt || holding.shrsOrPrnAmt?.SSHPRNAMT || '0');

      return {
        nameOfIssuer: holding.nameOfIssuer || holding.NAMEOFISSUER || '',
        titleOfClass: holding.titleOfClass || holding.TITLEOFCLASS || '',
        cusip,
        value,
        shrsOrPrnAmt: {
          sshPrnamt: shares,
          sshPrnamtType: (holding.shrsOrPrnAmt?.sshPrnamtType || 'SH') as 'SH' | 'PRN'
        },
        investmentDiscretion: (holding.investmentDiscretion || 'SOLE') as 'SOLE' | 'SHARED' | 'NONE',
        votingAuthority: {
          sole: parseInt(holding.votingAuthority?.sole || '0'),
          shared: parseInt(holding.votingAuthority?.shared || '0'),
          none: parseInt(holding.votingAuthority?.none || '0')
        }
      };
    } catch (error) {
      console.warn('Failed to parse holding entry:', error);
      return null;
    }
  }

  /**
   * Parse table row from text format
   */
  private parseTextTableRow(row: string): ParsedHolding | null {
    // Text format parsing is highly variable, this is a simplified approach
    const parts = row.split(/\s{2,}|\t/); // Split by multiple spaces or tabs

    if (parts.length < 4) return null;

    // Try to identify CUSIP (9 characters, alphanumeric)
    const cusipIndex = parts.findIndex(part => /^[0-9A-Z]{9}$/.test(part));
    if (cusipIndex === -1) return null;

    const cusip = parts[cusipIndex];
    const nameOfIssuer = parts[0] || '';

    // Value is usually after CUSIP
    const valueStr = parts[cusipIndex + 1] || '0';
    const value = parseInt(valueStr.replace(/[,$]/g, '')) * 1000;

    // Shares are usually after value
    const sharesStr = parts[cusipIndex + 2] || '0';
    const shares = parseInt(sharesStr.replace(/[,$]/g, ''));

    return {
      nameOfIssuer,
      titleOfClass: parts[1] || '',
      cusip,
      value,
      shrsOrPrnAmt: {
        sshPrnamt: shares,
        sshPrnamtType: 'SH'
      },
      investmentDiscretion: 'SOLE',
      votingAuthority: {
        sole: shares,
        shared: 0,
        none: 0
      }
    };
  }

  private parseTableFromHtml(tableHtml: string, fullContent: string): ParsedFiling {
    // Simplified HTML table parsing
    const rows = tableHtml.match(/<tr[^>]*>.*?<\/tr>/gis) || [];
    const holdings: ParsedHolding[] = [];

    for (const row of rows) {
      const cells = row.match(/<td[^>]*>(.*?)<\/td>/gis) || [];
      if (cells.length >= 4) {
        const cellValues = cells.map(cell =>
          cell.replace(/<[^>]*>/g, '').trim()
        );

        const cusipCell = cellValues.find(cell => /^[0-9A-Z]{9}$/.test(cell));
        if (cusipCell) {
          const holding = this.createHoldingFromCells(cellValues, cusipCell);
          if (holding) holdings.push(holding);
        }
      }
    }

    const coverPage = this.extractCoverPageFromText(fullContent);
    const summaryPage = this.calculateSummaryFromHoldings(holdings);

    return { coverPage, summaryPage, informationTable: holdings };
  }

  private createHoldingFromCells(cells: string[], cusip: string): ParsedHolding | null {
    const cusipIndex = cells.indexOf(cusip);

    return {
      nameOfIssuer: cells[0] || '',
      titleOfClass: cells[1] || '',
      cusip,
      value: parseInt((cells[cusipIndex + 1] || '0').replace(/[,$]/g, '')) * 1000,
      shrsOrPrnAmt: {
        sshPrnamt: parseInt((cells[cusipIndex + 2] || '0').replace(/[,$]/g, '')),
        sshPrnamtType: 'SH'
      },
      investmentDiscretion: 'SOLE',
      votingAuthority: {
        sole: parseInt((cells[cusipIndex + 2] || '0').replace(/[,$]/g, '')),
        shared: 0,
        none: 0
      }
    };
  }

  private extractCoverPageFromXml(content: string): ParsedFiling['coverPage'] {
    // Simplified cover page extraction
    const reportDateMatch = content.match(/<reportCalendarOrQuarter>(.*?)<\/reportCalendarOrQuarter>/i);
    const amendmentMatch = content.match(/<isAmendment>(.*?)<\/isAmendment>/i);

    return {
      reportCalendarOrQuarter: reportDateMatch?.[1] || '',
      isAmendment: amendmentMatch?.[1]?.toLowerCase() === 'true',
      submissionType: '13F-HR',
      reportDate: new Date() // Simplified
    };
  }

  private extractCoverPageFromText(content: string): ParsedFiling['coverPage'] {
    const reportDateMatch = content.match(/QUARTER ENDED:\s*(\d{2}\/\d{2}\/\d{4})/i);
    const amendmentMatch = content.match(/AMENDMENT/i);

    return {
      reportCalendarOrQuarter: reportDateMatch?.[1] || '',
      isAmendment: !!amendmentMatch,
      submissionType: '13F-HR',
      reportDate: reportDateMatch?.[1] ? new Date(reportDateMatch[1]) : new Date()
    };
  }

  private calculateSummaryFromHoldings(holdings: ParsedHolding[]): ParsedFiling['summaryPage'] {
    const totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0);

    return {
      otherIncludedManagersCount: 0,
      tableEntryTotal: holdings.length,
      tableValueTotal: totalValue
    };
  }
}