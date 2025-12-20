import * as fs from 'fs';
import * as path from 'path';
import XLSX from 'xlsx';

const INVOICE_DIR = '/Users/rjmacbookpro/Desktop/NNAudio LLC/NNAudio Assets/NN Docs/Invoices/ADSR/NNAudio ADSR Invoices';

function inspectExcelFile(filePath: string) {
  console.log(`\n=== Inspecting: ${path.basename(filePath)} ===\n`);
  
  try {
    const workbook = XLSX.readFile(filePath);
    console.log(`Sheet names: ${workbook.SheetNames.join(', ')}\n`);
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get all data
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    console.log('First 20 rows:');
    console.log('='.repeat(80));
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i] as any[];
      console.log(`Row ${i + 1}:`, JSON.stringify(row));
    }
    
    // Try to find numeric values
    console.log('\n\nAll numeric values found:');
    console.log('='.repeat(80));
    const numbers: Array<{row: number, col: number, value: number}> = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row) continue;
      
      for (let j = 0; j < row.length; j++) {
        const cell = row[j];
        if (typeof cell === 'number' && cell > 0) {
          numbers.push({ row: i + 1, col: j + 1, value: cell });
        }
        if (typeof cell === 'string') {
          const numMatch = cell.match(/[\d,]+\.?\d*/);
          if (numMatch) {
            const parsed = parseFloat(numMatch[0].replace(/,/g, ''));
            if (parsed > 0) {
              numbers.push({ row: i + 1, col: j + 1, value: parsed });
            }
          }
        }
      }
    }
    
    // Sort by value descending
    numbers.sort((a, b) => b.value - a.value);
    
    console.log(`Found ${numbers.length} numeric values. Top 10:`);
    for (let i = 0; i < Math.min(10, numbers.length); i++) {
      const num = numbers[i];
      console.log(`  Row ${num.row}, Col ${num.col}: $${num.value.toFixed(2)}`);
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

// Inspect a couple of files
const files = [
  'NewNation.01-01-2025-31-01-2025.xls',
  'NewNationSoftware.01-01-2025-31-01-2025.xls'
];

for (const filename of files) {
  const filePath = path.join(INVOICE_DIR, filename);
  if (fs.existsSync(filePath)) {
    inspectExcelFile(filePath);
  }
}



