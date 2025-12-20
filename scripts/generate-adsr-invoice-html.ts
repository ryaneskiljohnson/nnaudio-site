import * as fs from 'fs';
import * as path from 'path';
import XLSX from 'xlsx';

const INVOICE_DIR = '/Users/rjmacbookpro/Desktop/NNAudio LLC/NNAudio Assets/NN Docs/Invoices/ADSR/NNAudio ADSR Invoices';
const LOGO_PATH = '/Users/rjmacbookpro/Development/nnaudio-site/public/images/nnaud-io/nnaudio-logo.png';

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

      for (let col = 0; col < row.length; col++) {
        const cell = row[col];
        if (typeof cell === 'string') {
          const lowerCell = cell.toLowerCase();
          if (lowerCell.includes('total invoice amount') || 
              (lowerCell.includes('vendor share') && lowerCell.includes('$'))) {
            
            for (let j = col + 1; j < row.length; j++) {
              const value = row[j];
              if (typeof value === 'number') {
                totalAmount = value;
                break;
              }
            }
            
            if (col + 1 < row.length && typeof row[col + 1] === 'number') {
              totalAmount = row[col + 1];
            }
            
            if (typeof totalAmount === 'number') break;
          }
        }
      }
      
      if (typeof totalAmount === 'number' && totalAmount !== 0) break;
    }

    // Fallback: Look for "Vendor Share ($)" specifically
    if (totalAmount === 0) {
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row) continue;

        for (let col = 0; col < row.length; col++) {
          const cell = row[col];
          if (typeof cell === 'string' && cell.includes('Vendor Share ($)')) {
            if (row[6] !== undefined && typeof row[6] === 'number') {
              totalAmount = row[6];
              break;
            }
            if (col + 1 < row.length && typeof row[col + 1] === 'number') {
              totalAmount = row[col + 1];
              break;
            }
          }
        }
        if (totalAmount !== undefined) break;
      }
    }

    // Also check for "Total Invoice Amount"
    if (totalAmount === 0) {
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row) continue;

        for (let col = 0; col < row.length; col++) {
          const cell = row[col];
          if (typeof cell === 'string' && cell.includes('Total Invoice Amount')) {
            if (col + 1 < row.length && typeof row[col + 1] === 'number') {
              totalAmount = row[col + 1];
              break;
            }
            if (row[6] !== undefined && typeof row[6] === 'number') {
              totalAmount = row[6];
              break;
            }
          }
        }
        if (totalAmount !== undefined) break;
      }
    }

    return { amount: totalAmount };
  } catch (error: any) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function generateHTMLInvoice(lineItems: InvoiceLineItem[]): string {
  // Calculate monthly totals
  const monthlyTotals = new Map<number, number>();
  for (const item of lineItems) {
    const current = monthlyTotals.get(item.monthNumber) || 0;
    monthlyTotals.set(item.monthNumber, current + item.amount);
  }

  const grandTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const invoiceDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Convert logo to base64 if it exists
  let logoBase64 = '';
  if (fs.existsSync(LOGO_PATH)) {
    const logoBuffer = fs.readFileSync(LOGO_PATH);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  }

  // Group items by month
  const itemsByMonth = new Map<number, InvoiceLineItem[]>();
  for (const item of lineItems) {
    if (!itemsByMonth.has(item.monthNumber)) {
      itemsByMonth.set(item.monthNumber, []);
    }
    itemsByMonth.get(item.monthNumber)!.push(item);
  }

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ADSR Sales Invoice 2025 - NNAudio LLC</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            background: #f5f5f5;
            padding: 40px 20px;
            line-height: 1.6;
        }
        
        .invoice-container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            padding: 50px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px solid #2c3e50;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo-section img {
            max-width: 250px;
            height: auto;
        }
        
        .company-info {
            text-align: right;
            color: #555;
        }
        
        .company-info h1 {
            color: #2c3e50;
            font-size: 32px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .company-info p {
            margin: 5px 0;
            font-size: 14px;
        }
        
        .invoice-title {
            text-align: center;
            margin: 30px 0;
        }
        
        .invoice-title h2 {
            font-size: 28px;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .invoice-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        
        .invoice-meta div {
            flex: 1;
        }
        
        .invoice-meta strong {
            color: #2c3e50;
            display: block;
            margin-bottom: 5px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        thead {
            background: #2c3e50;
            color: white;
        }
        
        th {
            padding: 15px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        tbody tr:hover {
            background: #f8f9fa;
        }
        
        .month-header {
            background: #34495e !important;
            color: white !important;
            font-weight: 600;
            font-size: 16px;
        }
        
        .month-header td {
            border-bottom: 2px solid #2c3e50;
        }
        
        .subtotal-row {
            background: #ecf0f1;
            font-weight: 600;
        }
        
        .subtotal-row td {
            border-top: 2px solid #bdc3c7;
            border-bottom: 2px solid #bdc3c7;
        }
        
        .amount {
            text-align: right;
            font-weight: 500;
        }
        
        .total-section {
            margin-top: 30px;
            text-align: right;
        }
        
        .grand-total {
            display: inline-block;
            padding: 20px 40px;
            background: #2c3e50;
            color: white;
            border-radius: 5px;
            font-size: 24px;
            font-weight: 600;
        }
        
        .grand-total-label {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 5px;
            opacity: 0.9;
        }
        
        .grand-total-amount {
            font-size: 32px;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #777;
            font-size: 12px;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .invoice-container {
                box-shadow: none;
                padding: 20px;
            }
            
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="logo-section">
                ${logoBase64 ? `<img src="${logoBase64}" alt="NNAudio Logo">` : '<h1>NNAudio LLC</h1>'}
            </div>
            <div class="company-info">
                <h1>NNAudio LLC</h1>
                <p>21550 Delta Drive</p>
                <p>Reno, NV 89521</p>
            </div>
        </div>
        
        <div class="invoice-title">
            <h2>ADSR Sales Invoice</h2>
            <p style="color: #777; margin-top: 5px;">2025 Annual Sales Report</p>
        </div>
        
        <div class="invoice-meta">
            <div>
                <strong>Invoice Date:</strong>
                <span>${invoiceDate}</span>
            </div>
            <div>
                <strong>Period:</strong>
                <span>January 2025 - November 2025</span>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Account</th>
                    <th>Period</th>
                    <th class="amount">Amount</th>
                </tr>
            </thead>
            <tbody>`;

  // Sort months
  const sortedMonths = Array.from(itemsByMonth.keys()).sort((a, b) => a - b);

  for (const monthNum of sortedMonths) {
    const items = itemsByMonth.get(monthNum)!;
    const monthName = items[0].month;
    const monthTotal = monthlyTotals.get(monthNum) || 0;

    // Month header
    html += `
                <tr class="month-header">
                    <td colspan="4">${monthName} 2025</td>
                </tr>`;

    // Items for this month
    for (const item of items) {
      html += `
                <tr>
                    <td></td>
                    <td>${item.account}</td>
                    <td>${item.period}</td>
                    <td class="amount">$${item.amount.toFixed(2)}</td>
                </tr>`;
    }

    // Month subtotal
    html += `
                <tr class="subtotal-row">
                    <td colspan="3" style="text-align: right; padding-right: 20px;">Month Subtotal:</td>
                    <td class="amount">$${monthTotal.toFixed(2)}</td>
                </tr>`;
  }

  html += `
            </tbody>
        </table>
        
        <div class="total-section">
            <div class="grand-total">
                <div class="grand-total-label">Grand Total</div>
                <div class="grand-total-amount">$${grandTotal.toFixed(2)}</div>
            </div>
        </div>
        
        <div class="footer">
            <p>This invoice represents sales data from ADSR for the period January 2025 through November 2025.</p>
            <p style="margin-top: 10px;">NNAudio LLC | 21550 Delta Drive, Reno, NV 89521</p>
        </div>
    </div>
</body>
</html>`;

  return html;
}

async function main() {
  console.log('=== Generating ADSR Invoice HTML for 2025 ===\n');

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

    const result = readExcelFile(filePath);
    const amount = result ? result.amount : 0;

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

  // Generate HTML invoice
  const html = generateHTMLInvoice(lineItems);

  // Save HTML
  const outputPath = path.join(INVOICE_DIR, 'ADSR_Invoice_2025.html');
  fs.writeFileSync(outputPath, html);

  console.log('✅ HTML Invoice generated successfully!');
  console.log(`📄 Saved to: ${outputPath}\n`);
  console.log('You can open this file in any web browser to view or print the invoice.');
}

main().catch(console.error);



