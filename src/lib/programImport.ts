import * as XLSX from 'xlsx';

export interface ParsedProgramTask {
  rowNumber: string;
  name: string;
  quantity?: number;
  unit?: string;
  duration?: number;
  startDate: string;
  endDate: string;
  isSection: boolean;
}

export interface ParsedProgram {
  tasks: ParsedProgramTask[];
  projectName?: string;
  errors: string[];
}

interface ColumnDateMap {
  [colIndex: number]: Date;
}

/**
 * Parse the calendar header rows to build a column → date mapping.
 * The Excel format has:
 * - Row with month/year labels (e.g., "Feb-26", "Mar-26")
 * - Row with week labels (e.g., "WEEK 1", "WEEK 2")
 * - Row with day numbers (e.g., 2, 3, 4, 5...)
 * 
 * Key insight: Day numbers reset when the month changes (e.g., 28 → 1 for Feb→Mar)
 * We need to detect these resets to assign correct months to each day column.
 */
function buildColumnDateMap(sheet: XLSX.WorkSheet, headerRows: number[]): ColumnDateMap {
  const dateMap: ColumnDateMap = {};
  
  // Get the range of the sheet
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  // Find month headers and their column positions
  const monthHeaders: { col: number; month: string; year: number }[] = [];
  
  // Find the day number row
  let dayRowIndex = -1;
  let dayColumns: { col: number; day: number }[] = [];
  
  // Scan first 20 rows to find headers
  for (let r = 0; r <= Math.min(20, range.e.r); r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellAddress];
      if (!cell) continue;
      
      const value = cell.v;
      
      // Check if it's a month label (e.g., "Feb-26", "Mar-26", "Apr-26")
      if (typeof value === 'string' && /^[A-Za-z]{3}-\d{2}$/.test(value)) {
        const [monthAbbr, yearSuffix] = value.split('-');
        const monthIndex = getMonthIndex(monthAbbr);
        if (monthIndex !== -1) {
          monthHeaders.push({
            col: c,
            month: monthAbbr,
            year: 2000 + parseInt(yearSuffix)
          });
        }
      }
      
      // Check if it's a day number (1-31) - collect all for now
      if (typeof value === 'number' && value >= 1 && value <= 31) {
        if (dayRowIndex === -1 || dayRowIndex === r) {
          dayRowIndex = r;
          dayColumns.push({ col: c, day: value });
        }
      }
    }
  }
  
  // Sort month headers by column
  monthHeaders.sort((a, b) => a.col - b.col);
  
  // Sort day columns by column index
  dayColumns.sort((a, b) => a.col - b.col);
  
  if (monthHeaders.length === 0 || dayColumns.length === 0) {
    console.warn('Could not find month headers or day columns');
    return dateMap;
  }
  
  // Now assign each day column to a month
  // The key is detecting when day numbers reset (e.g., 28→1 means month change)
  let currentMonthIdx = 0;
  let prevDay = 0;
  
  for (const dayCol of dayColumns) {
    const { col, day } = dayCol;
    
    // Detect month change: day decreased significantly (reset) or we passed a month header
    if (prevDay > 0 && day < prevDay && (prevDay - day) > 5) {
      // Day reset detected (e.g., 28 → 1 or 31 → 1)
      currentMonthIdx = Math.min(currentMonthIdx + 1, monthHeaders.length - 1);
    }
    
    // Also check if we passed a new month header column
    while (currentMonthIdx < monthHeaders.length - 1 && 
           col >= monthHeaders[currentMonthIdx + 1].col) {
      currentMonthIdx++;
    }
    
    const currentMonth = monthHeaders[currentMonthIdx];
    const monthIndex = getMonthIndex(currentMonth.month);
    
    if (monthIndex !== -1) {
      const date = new Date(currentMonth.year, monthIndex, day);
      dateMap[col] = date;
    }
    
    prevDay = day;
  }
  
  return dateMap;
}

function getMonthIndex(abbr: string): number {
  const months: { [key: string]: number } = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };
  return months[abbr.toLowerCase()] ?? -1;
}

/**
 * Detect if a row number indicates a section header (whole number like "1", "2", "3")
 * vs a task (decimal like "1.1", "1.2", "3.1")
 */
function isSection(rowNumber: string): boolean {
  if (!rowNumber) return false;
  const num = parseFloat(rowNumber);
  return !isNaN(num) && Number.isInteger(num);
}

/**
 * Find the first and last columns with "1" markers to determine task date range
 */
function findTaskDateRange(
  sheet: XLSX.WorkSheet, 
  rowIndex: number, 
  startCol: number,
  dateMap: ColumnDateMap
): { startDate: Date | null; endDate: Date | null } {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  let firstMarkerCol: number | null = null;
  let lastMarkerCol: number | null = null;
  
  for (let c = startCol; c <= range.e.c; c++) {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c });
    const cell = sheet[cellAddress];
    
    if (cell && (cell.v === 1 || cell.v === '1')) {
      if (firstMarkerCol === null) {
        firstMarkerCol = c;
      }
      lastMarkerCol = c;
    }
  }
  
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  
  if (firstMarkerCol !== null && dateMap[firstMarkerCol]) {
    startDate = dateMap[firstMarkerCol];
  }
  
  if (lastMarkerCol !== null && dateMap[lastMarkerCol]) {
    endDate = dateMap[lastMarkerCol];
  }
  
  return { startDate, endDate };
}

/**
 * Try to extract dates from explicit date columns (F-G in the sample format)
 */
function extractExplicitDates(
  sheet: XLSX.WorkSheet,
  rowIndex: number,
  startCol: number,
  endCol: number
): { startDate: Date | null; endDate: Date | null } {
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  
  // Start date column
  const startCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: startCol });
  const startCell = sheet[startCellAddress];
  if (startCell) {
    if (startCell.t === 'd') {
      startDate = startCell.v as Date;
    } else if (startCell.t === 'n' && startCell.v > 40000) {
      // Excel date serial number
      startDate = excelDateToJS(startCell.v as number);
    } else if (typeof startCell.v === 'string') {
      const parsed = new Date(startCell.v);
      if (!isNaN(parsed.getTime())) {
        startDate = parsed;
      }
    }
  }
  
  // End date column
  const endCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: endCol });
  const endCell = sheet[endCellAddress];
  if (endCell) {
    if (endCell.t === 'd') {
      endDate = endCell.v as Date;
    } else if (endCell.t === 'n' && endCell.v > 40000) {
      endDate = excelDateToJS(endCell.v as number);
    } else if (typeof endCell.v === 'string') {
      const parsed = new Date(endCell.v);
      if (!isNaN(parsed.getTime())) {
        endDate = parsed;
      }
    }
  }
  
  return { startDate, endDate };
}

function excelDateToJS(excelDate: number): Date {
  // Excel dates are days since 1900-01-01 (with a bug for 1900 leap year)
  const utc_days = Math.floor(excelDate - 25569);
  const date = new Date(utc_days * 86400 * 1000);
  return date;
}

/**
 * Main function to parse a construction program Excel file
 */
export async function parseConstructionProgram(file: File): Promise<ParsedProgram> {
  const errors: string[] = [];
  const tasks: ParsedProgramTask[] = [];
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
      errors.push('No sheets found in the workbook');
      return { tasks, errors };
    }
    
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    
    // Build column → date mapping from the calendar header
    const dateMap = buildColumnDateMap(sheet, []);
    const calendarStartCol = Math.min(...Object.keys(dateMap).map(Number));
    
    // Column indices (0-based) for the sample format
    // A=0 (row number), B=1 (name), C=2 (qty), D=3 (unit), E=4 (duration), F=5 (start), G=6 (end)
    const COL_ROW_NUM = 0;
    const COL_NAME = 1;
    const COL_QTY = 2;
    const COL_UNIT = 3;
    const COL_DURATION = 4;
    const COL_START = 5;
    const COL_END = 6;
    
    // Find the first data row (skip headers)
    // Look for rows where column A has a number like "1", "1.1", etc.
    let dataStartRow = 0;
    for (let r = 0; r <= Math.min(30, range.e.r); r++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c: COL_ROW_NUM });
      const cell = sheet[cellAddress];
      if (cell && (typeof cell.v === 'number' || (typeof cell.v === 'string' && /^\d+(\.\d+)?$/.test(cell.v.toString())))) {
        dataStartRow = r;
        break;
      }
    }
    
    // Parse each data row
    for (let r = dataStartRow; r <= range.e.r; r++) {
      // Get row number
      const rowNumCell = sheet[XLSX.utils.encode_cell({ r, c: COL_ROW_NUM })];
      if (!rowNumCell) continue;
      
      const rowNumber = rowNumCell.v?.toString().trim() || '';
      if (!rowNumber || !/^\d+(\.\d+)?$/.test(rowNumber)) continue;
      
      // Get task name
      const nameCell = sheet[XLSX.utils.encode_cell({ r, c: COL_NAME })];
      const name = nameCell?.v?.toString().trim() || '';
      if (!name) continue;
      
      // Get quantity
      const qtyCell = sheet[XLSX.utils.encode_cell({ r, c: COL_QTY })];
      const quantity = qtyCell && typeof qtyCell.v === 'number' ? qtyCell.v : undefined;
      
      // Get unit
      const unitCell = sheet[XLSX.utils.encode_cell({ r, c: COL_UNIT })];
      const unit = unitCell?.v?.toString().trim() || undefined;
      
      // Get duration
      const durationCell = sheet[XLSX.utils.encode_cell({ r, c: COL_DURATION })];
      const duration = durationCell && typeof durationCell.v === 'number' ? durationCell.v : undefined;
      
      // Try to get dates from explicit columns first
      let { startDate, endDate } = extractExplicitDates(sheet, r, COL_START, COL_END);
      
      // If no explicit dates, try to find from calendar grid
      if (!startDate || !endDate) {
        const gridDates = findTaskDateRange(sheet, r, calendarStartCol || 7, dateMap);
        startDate = startDate || gridDates.startDate;
        endDate = endDate || gridDates.endDate;
      }
      
      // If still no dates, use today + duration or default
      if (!startDate) {
        startDate = new Date();
      }
      if (!endDate) {
        if (duration && duration > 0) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + duration - 1);
        } else {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7); // Default 1 week
        }
      }
      
      tasks.push({
        rowNumber,
        name: `${rowNumber} - ${name}`,
        quantity,
        unit,
        duration,
        startDate: formatDateISO(startDate),
        endDate: formatDateISO(endDate),
        isSection: isSection(rowNumber)
      });
    }
    
    if (tasks.length === 0) {
      errors.push('No tasks found in the file. Please ensure the file follows the expected format.');
    }
    
  } catch (error) {
    errors.push(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return { tasks, errors };
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Validate that a file is an Excel file
 */
export function isExcelFile(file: File): boolean {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/excel',
    'application/x-excel'
  ];
  
  const validExtensions = ['.xlsx', '.xls', '.xlsm'];
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  
  return validTypes.includes(file.type) || validExtensions.includes(extension);
}
