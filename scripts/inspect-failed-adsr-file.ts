import * as path from 'path';
import XLSX from 'xlsx';

const INVOICE_DIR = '/Users/rjmacbookpro/Desktop/NNAudio LLC/NNAudio Assets/NN Docs/Invoices/ADSR/NNAudio ADSR Invoices';

function inspectExcelFile(filePath: string) {
  console.log(`\n=== Inspecting: ${path.basename(filePath)} ===\n`);
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    console.log('All rows:');
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any[];
      console.log(`Row ${i + 1}:`, JSON.stringify(row));
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

// Inspect a file that failed
const filePath = path.join(INVOICE_DIR, 'NewNationSoftware.01-02-2025-28-02-2025.xls');
inspectExcelFile(filePath);



