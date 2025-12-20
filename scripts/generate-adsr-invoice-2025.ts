import * as fs from 'fs';
import * as path from 'path';
import XLSX from 'xlsx';

const INVOICE_DIR = '/Users/rjmacbookpro/Desktop/NNAudio LLC/NNAudio Assets/NN Docs/Invoices/ADSR/NNAudio ADSR Invoices';

interface InvoiceLineItem {
  month: string;
  account: string;
  period: string;
  amount: number;
  currency?: string;
}

interface MonthlyData {
  month: string;
  monthNumber: number;
  accounts: {
    [accountName: string]: {
      amount: number;
      period: string;
    };
  };
}

function parseMonthFromFilename(filename: string): { month: string; monthNumber: number } | null {
  // Extract month from filename like "NewNation.01-01-2025-31-01-2025.xls"
  const match = filename.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!match) return null;
  
  const monthNumber = parseInt(match[2], 10);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return {
    month: monthNames[monthNumber - 1],
    monthNumber
  };
}

function extractAccountName(filename: string): string {
  // Extract account name (e.g., "NewNation" or "NewNationSoftware")
  const match = filename.match(/^([^.]+)/);
  return match ? match[1] : 'Unknown';
}

function extractPeriodFromFilename(filename: string): string {
  // Extract period like "01-01-2025 to 31-01-2025"
  const matches = filename.match(/(\d{2}-\d{2}-\d{4})-(\d{2}-\d{2}-\d{4})/);
  if (matches) {
    return `${matches[1]} to ${matches[2]}`;
  }
  return '';
}

function readExcelFile(filePath: string): { amount: number; currency?: string } | null {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    // Look for common patterns in Excel files for totals/amounts
    let totalAmount = 0;
    let currency = 'USD';

    // Try to find total/amount columns
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row) continue;

      // Look for "Total", "Amount", "Revenue", "Sales" headers
      const headerRow = row.find((cell: any) => 
        typeof cell === 'string' && 
        (cell.toLowerCase().includes('total') || 
         cell.toLowerCase().includes('amount') ||
         cell.toLowerCase().includes('revenue') ||
         cell.toLowerCase().includes('sales'))
      );

      if (headerRow) {
        // Find the column index
        const headerIndex = row.indexOf(headerRow);
        
        // Look for numeric values in that column
        for (let j = i + 1; j < data.length; j++) {
          const nextRow = data[j] as any[];
          if (!nextRow) continue;
          
          const value = nextRow[headerIndex];
          if (typeof value === 'number' && value > 0) {
            totalAmount = value;
            break;
          }
          if (typeof value === 'string') {
            // Try to parse currency
            const numMatch = value.match(/[\d,]+\.?\d*/);
            if (numMatch) {
              totalAmount = parseFloat(numMatch[0].replace(/,/g, ''));
            }
            if (value.includes('$')) currency = 'USD';
            if (value.includes('€')) currency = 'EUR';
            if (value.includes('£')) currency = 'GBP';
          }
        }
        break;
      }
    }

    // If no total found, try to sum all numeric values
    if (totalAmount === 0) {
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row) continue;
        
        for (const cell of row) {
          if (typeof cell === 'number' && cell > 0) {
            totalAmount += cell;
          }
        }
      }
    }

    return totalAmount > 0 ? { amount: totalAmount, currency } : null;
  } catch (error: any) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function generateInvoice(monthlyData: MonthlyData[]): string {
  let invoice = `NNAudio LLC - ADSR Sales Invoice 2025\n`;
  invoice += `==========================================\n\n`;
  invoice += `Invoice Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
  invoice += `Period: January 2025 - November 2025\n\n`;
  invoice += `LINE ITEMS:\n`;
  invoice += `-----------\n\n`;

  let grandTotal = 0;

  // Sort by month number
  monthlyData.sort((a, b) => a.monthNumber - b.monthNumber);

  for (const monthData of monthlyData) {
    invoice += `${monthData.month} 2025:\n`;
    
    const accountNames = Object.keys(monthData.accounts).sort();
    let monthTotal = 0;

    for (const accountName of accountNames) {
      const accountData = monthData.accounts[accountName];
      monthTotal += accountData.amount;
      grandTotal += accountData.amount;
      
      invoice += `  ${accountName.padEnd(25)} ${accountData.period.padEnd(30)} $${accountData.amount.toFixed(2)}\n`;
    }
    
    invoice += `  ${'Month Subtotal'.padEnd(25)} ${''.padEnd(30)} $${monthTotal.toFixed(2)}\n\n`;
  }

  invoice += `\n${'='.repeat(60)}\n`;
  invoice += `GRAND TOTAL: $${grandTotal.toFixed(2)}\n`;
  invoice += `${'='.repeat(60)}\n`;

  return invoice;
}

async function main() {
  console.log('=== Generating ADSR Invoice for 2025 ===\n');

  const files = fs.readdirSync(INVOICE_DIR);
  const excelFiles = files.filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));

  console.log(`Found ${excelFiles.length} Excel files\n`);

  const monthlyDataMap = new Map<number, MonthlyData>();

  for (const filename of excelFiles) {
    const filePath = path.join(INVOICE_DIR, filename);
    const monthInfo = parseMonthFromFilename(filename);
    const accountName = extractAccountName(filename);
    const period = extractPeriodFromFilename(filename);

    if (!monthInfo) {
      console.warn(`⚠️  Could not parse month from: ${filename}`);
      continue;
    }

    console.log(`Processing: ${filename}`);
    console.log(`  Account: ${accountName}, Month: ${monthInfo.month}`);

    const result = readExcelFile(filePath);
    
    if (!result || result.amount === 0) {
      console.warn(`  ⚠️  Could not extract amount from ${filename}`);
      continue;
    }

    console.log(`  Amount: $${result.amount.toFixed(2)}\n`);

    // Get or create monthly data
    let monthData = monthlyDataMap.get(monthInfo.monthNumber);
    if (!monthData) {
      monthData = {
        month: monthInfo.month,
        monthNumber: monthInfo.monthNumber,
        accounts: {}
      };
      monthlyDataMap.set(monthInfo.monthNumber, monthData);
    }

    // Add account data
    monthData.accounts[accountName] = {
      amount: result.amount,
      period
    };
  }

  // Convert map to array
  const monthlyData = Array.from(monthlyDataMap.values());

  // Generate invoice
  const invoice = generateInvoice(monthlyData);

  // Save invoice
  const outputPath = path.join(INVOICE_DIR, 'ADSR_Invoice_2025.txt');
  fs.writeFileSync(outputPath, invoice);

  console.log('✅ Invoice generated successfully!');
  console.log(`📄 Saved to: ${outputPath}\n`);
  console.log(invoice);
}

main().catch(console.error);



