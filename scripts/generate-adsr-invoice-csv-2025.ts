import * as fs from 'fs';
import * as path from 'path';
import XLSX from 'xlsx';

const INVOICE_DIR = '/Users/rjmacbookpro/Desktop/NNAudio LLC/NNAudio Assets/NN Docs/Invoices/ADSR/NNAudio ADSR Invoices';

interface InvoiceLineItem {
  month: string;
  monthNumber: number;
  account: string;
  period: string;
  amount: number;
}

function parseMonthFromFilename(filename: string): { month: string; monthNumber: number } | null {
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
  const match = filename.match(/^([^.]+)/);
  return match ? match[1] : 'Unknown';
}

function extractPeriodFromFilename(filename: string): string {
  const matches = filename.match(/(\d{2}-\d{2}-\d{4})-(\d{2}-\d{2}-\d{4})/);
  if (matches) {
    return `${matches[1]} to ${matches[2]}`;
  }
  return '';
}

function readExcelFile(filePath: string): { amount: number } | null {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    let totalAmount = 0;

    // Look for "Total Invoice Amount" or "Vendor Share ($)" rows
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row) continue;

      // Check if this row contains "Total Invoice Amount" or "Vendor Share ($)"
      for (let col = 0; col < row.length; col++) {
        const cell = row[col];
        if (typeof cell === 'string') {
          const lowerCell = cell.toLowerCase();
          if (lowerCell.includes('total invoice amount') || 
              (lowerCell.includes('vendor share') && lowerCell.includes('$'))) {
            
            // Look for the amount in the same row (usually in column 6 or 7)
            for (let j = col + 1; j < row.length; j++) {
              const value = row[j];
              if (typeof value === 'number') {
                totalAmount = value;
                break;
              }
            }
            
            // Also check the next column after finding the label
            if (col + 1 < row.length && typeof row[col + 1] === 'number') {
              totalAmount = row[col + 1];
            }
            
            // If we found a value (even if 0), we're done
            if (typeof totalAmount === 'number') break;
          }
        }
      }
      
      if (totalAmount > 0) break;
    }

    // Fallback: Look for "Vendor Share ($)" specifically
    if (totalAmount === 0) {
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row) continue;

        for (let col = 0; col < row.length; col++) {
          const cell = row[col];
          if (typeof cell === 'string' && cell.includes('Vendor Share ($)')) {
            // Amount is typically in column 7 (index 6)
            if (row[6] !== undefined && typeof row[6] === 'number') {
              totalAmount = row[6];
              break;
            }
            // Or try the next column
            if (col + 1 < row.length && typeof row[col + 1] === 'number') {
              totalAmount = row[col + 1];
              break;
            }
          }
        }
        if (totalAmount !== undefined) break;
      }
    }

    // Also check for "Total Invoice Amount" if we still don't have a value
    if (totalAmount === 0) {
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row) continue;

        for (let col = 0; col < row.length; col++) {
          const cell = row[col];
          if (typeof cell === 'string' && cell.includes('Total Invoice Amount')) {
            // Amount is typically in the same row, next column
            if (col + 1 < row.length && typeof row[col + 1] === 'number') {
              totalAmount = row[col + 1];
              break;
            }
            // Or try column 7 (index 6)
            if (row[6] !== undefined && typeof row[6] === 'number') {
              totalAmount = row[6];
              break;
            }
          }
        }
        if (totalAmount !== undefined) break;
      }
    }

    // Return the amount even if it's 0 (no sales for that period)
    return { amount: totalAmount };
  } catch (error: any) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('=== Generating ADSR Invoice CSV for 2025 ===\n');

  const files = fs.readdirSync(INVOICE_DIR);
  const excelFiles = files.filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));

  console.log(`Found ${excelFiles.length} Excel files\n`);

  const lineItems: InvoiceLineItem[] = [];

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
    const result = readExcelFile(filePath);
    
    const amount = result ? result.amount : 0;
    console.log(`  Account: ${accountName}, Month: ${monthInfo.month}, Amount: $${amount.toFixed(2)}`);

    lineItems.push({
      month: monthInfo.month,
      monthNumber: monthInfo.monthNumber,
      account: accountName,
      period,
      amount
    });
  }

  // Sort by month number, then by account name
  lineItems.sort((a, b) => {
    if (a.monthNumber !== b.monthNumber) {
      return a.monthNumber - b.monthNumber;
    }
    return a.account.localeCompare(b.account);
  });

  // Generate CSV
  let csv = 'Month,Account,Period,Amount\n';
  for (const item of lineItems) {
    csv += `"${item.month} 2025","${item.account}","${item.period}",${item.amount.toFixed(2)}\n`;
  }

  // Add subtotals
  const monthlyTotals = new Map<number, number>();
  for (const item of lineItems) {
    const current = monthlyTotals.get(item.monthNumber) || 0;
    monthlyTotals.set(item.monthNumber, current + item.amount);
  }

  csv += '\n';
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  for (let i = 1; i <= 12; i++) {
    const total = monthlyTotals.get(i);
    if (total) {
      csv += `"${monthNames[i-1]} 2025 Subtotal","","",${total.toFixed(2)}\n`;
    }
  }

  // Grand total
  const csvGrandTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  csv += `\n"GRAND TOTAL","","",${csvGrandTotal.toFixed(2)}\n`;

  // Save CSV
  const outputPath = path.join(INVOICE_DIR, 'ADSR_Invoice_2025.csv');
  fs.writeFileSync(outputPath, csv);

  console.log('\n✅ CSV Invoice generated successfully!');
  console.log(`📄 Saved to: ${outputPath}\n`);

  // Also generate a formatted text invoice
  let textInvoice = `NNAudio LLC - ADSR Sales Invoice 2025\n`;
  textInvoice += `==========================================\n\n`;
  textInvoice += `Invoice Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
  textInvoice += `Period: January 2025 - November 2025\n\n`;
  textInvoice += `LINE ITEMS:\n`;
  textInvoice += `${'-'.repeat(80)}\n`;
  textInvoice += `${'Month'.padEnd(15)} ${'Account'.padEnd(25)} ${'Period'.padEnd(30)} ${'Amount'.padStart(15)}\n`;
  textInvoice += `${'-'.repeat(80)}\n`;

  let grandTotal = 0;
  let currentMonth = '';

  for (const item of lineItems) {
    if (item.month !== currentMonth) {
      if (currentMonth) {
        const monthTotal = lineItems
          .filter(i => i.month === currentMonth)
          .reduce((sum, i) => sum + i.amount, 0);
        textInvoice += `${''.padEnd(15)} ${'Month Subtotal'.padEnd(25)} ${''.padEnd(30)} ${monthTotal.toFixed(2).padStart(15)}\n`;
        textInvoice += `${'-'.repeat(80)}\n`;
      }
      currentMonth = item.month;
    }

    grandTotal += item.amount;
    textInvoice += `${item.month.padEnd(15)} ${item.account.padEnd(25)} ${item.period.padEnd(30)} $${item.amount.toFixed(2).padStart(14)}\n`;
  }

  // Add final month subtotal
  if (currentMonth) {
    const monthTotal = lineItems
      .filter(i => i.month === currentMonth)
      .reduce((sum, i) => sum + i.amount, 0);
    textInvoice += `${''.padEnd(15)} ${'Month Subtotal'.padEnd(25)} ${''.padEnd(30)} ${monthTotal.toFixed(2).padStart(15)}\n`;
  }

  textInvoice += `${'='.repeat(80)}\n`;
  textInvoice += `${''.padEnd(15)} ${'GRAND TOTAL'.padEnd(25)} ${''.padEnd(30)} $${grandTotal.toFixed(2).padStart(14)}\n`;
  textInvoice += `${'='.repeat(80)}\n`;

  const textOutputPath = path.join(INVOICE_DIR, 'ADSR_Invoice_2025_Formatted.txt');
  fs.writeFileSync(textOutputPath, textInvoice);

  console.log(`📄 Formatted invoice saved to: ${textOutputPath}\n`);
  console.log(textInvoice);
}

main().catch(console.error);



