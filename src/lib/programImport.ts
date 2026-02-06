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
  /** Detected calendar date range from the Excel file */
  detectedDateRange?: {
    startDate: string;
    endDate: string;
  };
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
  
  console.log('[Import] Sheet range:', range);
  
  // Step 1: Find the row that contains consecutive day numbers (the calendar day row)
  // This row will have values like: 2, 3, 4, 5, 6, 7, 8, ... (consecutive days)
  let dayRowIndex = -1;
  let dayColumns: { col: number; day: number }[] = [];
  
  for (let r = 0; r <= Math.min(25, range.e.r); r++) {
    const rowDays: { col: number; day: number }[] = [];
    
    for (let c = 0; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellAddress];
      if (!cell) continue;
      
      const value = cell.v;
      let dayValue: number | null = null;
      
      if (typeof value === 'number' && value >= 1 && value <= 31) {
        dayValue = value;
      } else if (typeof value === 'string') {
        const parsed = parseInt(value.trim(), 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
          dayValue = parsed;
        }
      }
      
      if (dayValue !== null) {
        rowDays.push({ col: c, day: dayValue });
      }
    }
    
    // Check if this row has many day values (at least 20) with some consecutive patterns
    // The calendar row typically has 70+ day cells (Feb 27 days + Mar 31 days + Apr 18 days)
    if (rowDays.length >= 20) {
      // Check for consecutive day patterns
      let consecutiveCount = 0;
      for (let i = 1; i < Math.min(10, rowDays.length); i++) {
        if (rowDays[i].day === rowDays[i-1].day + 1) {
          consecutiveCount++;
        }
      }
      
      // If we have at least 5 consecutive days, this is likely the calendar row
      if (consecutiveCount >= 5) {
        dayRowIndex = r;
        dayColumns = rowDays;
        console.log(`[Import] Found calendar day row at index ${r} with ${rowDays.length} day cells`);
        break;
      }
    }
  }
  
  if (dayRowIndex === -1 || dayColumns.length === 0) {
    console.warn('[Import] Could not find calendar day row');
    return dateMap;
  }
  
  // Sort day columns by column index
  dayColumns.sort((a, b) => a.col - b.col);
  
  // Step 2: Find month headers in rows ABOVE the day row
  // Look for patterns like "Feb-26", "Mar-26", "Apr-26" in various formats
  const monthHeaders: { col: number; month: string; year: number }[] = [];
  
  // Debug: Log all cells in the first few rows to understand the structure
  console.log('[Import] Scanning rows 0 to', dayRowIndex - 1, 'for month headers');
  
  for (let r = 0; r < dayRowIndex; r++) {
    const rowCells: { col: number; value: unknown; type: string; formatted?: string }[] = [];
    
    for (let c = 0; c <= Math.min(range.e.c, 20); c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellAddress];
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
        rowCells.push({ col: c, value: cell.v, type: cell.t, formatted: cell.w });
      }
    }
    
    if (rowCells.length > 0) {
      console.log(`[Import] Row ${r} sample cells:`, rowCells.slice(0, 8));
    }
  }
  
  for (let r = 0; r < dayRowIndex; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellAddress];
      if (!cell) continue;
      
      const value = cell.v;
      const formatted = cell.w; // Formatted value (what you see in Excel)
      
      // Method 1: Check formatted value first (e.g., "Feb-26")
      if (formatted && typeof formatted === 'string') {
        const match = formatted.match(/^([A-Za-z]{3})-(\d{2})$/);
        if (match) {
          const monthIndex = getMonthIndex(match[1]);
          if (monthIndex !== -1) {
            monthHeaders.push({
              col: c,
              month: match[1],
              year: 2000 + parseInt(match[2])
            });
            console.log(`[Import] Found month header (formatted): ${formatted} at column ${c}, row ${r}`);
            continue;
          }
        }
      }
      
      // Method 2: Check if it's a date stored as Excel serial number
      if (cell.t === 'd' || (cell.t === 'n' && typeof value === 'number' && value > 40000 && value < 50000)) {
        const date = cell.t === 'd' ? (value as Date) : excelDateToJS(value as number);
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month];
        
        // Only add if it looks like a month-year header (first day of month or reasonable date)
        if (date.getDate() === 1 || c > 5) { // Column > 5 suggests calendar area
          monthHeaders.push({
            col: c,
            month: monthAbbr,
            year: year
          });
          console.log(`[Import] Found month header (date serial): ${monthAbbr}-${year.toString().slice(-2)} at column ${c}, row ${r}`);
          continue;
        }
      }
      
      // Method 3: Check string value with flexible patterns
      if (typeof value === 'string') {
        // Pattern: "Feb-26", "FEB-26", "feb-26"
        let match = value.match(/^([A-Za-z]{3})-(\d{2})$/);
        if (match) {
          const monthIndex = getMonthIndex(match[1]);
          if (monthIndex !== -1) {
            monthHeaders.push({
              col: c,
              month: match[1],
              year: 2000 + parseInt(match[2])
            });
            console.log(`[Import] Found month header (string): ${value} at column ${c}, row ${r}`);
            continue;
          }
        }
        
        // Pattern: "February 2026", "Feb 2026", etc.
        match = value.match(/^([A-Za-z]+)\s*(\d{4})$/);
        if (match) {
          const monthIndex = getMonthIndex(match[1].slice(0, 3));
          if (monthIndex !== -1) {
            monthHeaders.push({
              col: c,
              month: match[1].slice(0, 3),
              year: parseInt(match[2])
            });
            console.log(`[Import] Found month header (long format): ${value} at column ${c}, row ${r}`);
          }
        }
      }
    }
  }
  
  // Sort month headers by column and deduplicate (keep first occurrence per month-year)
  monthHeaders.sort((a, b) => a.col - b.col);
  const seenMonths = new Set<string>();
  const uniqueMonthHeaders = monthHeaders.filter(h => {
    const key = `${h.month}-${h.year}`;
    if (seenMonths.has(key)) return false;
    seenMonths.add(key);
    return true;
  });
  
  console.log('[Import] Unique month headers:', uniqueMonthHeaders);
  console.log('[Import] Found day columns count:', dayColumns.length, 'from row', dayRowIndex);
  console.log('[Import] First few day columns:', dayColumns.slice(0, 10));
  console.log('[Import] Last few day columns:', dayColumns.slice(-10));
  
  if (uniqueMonthHeaders.length === 0) {
    console.warn('[Import] Could not find month headers, will use day reset detection only');
    // We can still try to infer months from day resets if we have a known start
  }
  
  // Step 3: Assign each day column to a month
  // Key insight: Days reset when month changes (e.g., Feb 28 → Mar 1, or Mar 31 → Apr 1)
  let currentMonthIdx = 0;
  let prevDay = 0;
  let monthTransitions = 0;
  
  for (const dayCol of dayColumns) {
    const { col, day } = dayCol;
    
    // Detect month transition: day number decreased significantly (reset)
    if (prevDay > 0 && day < prevDay) {
      // Only count as transition if previous day was reasonably high (> 20)
      // and current day is reasonably low (< 10)
      if (prevDay >= 20 && day <= 10) {
        monthTransitions++;
        console.log(`[Import] Month transition detected at col ${col}: day ${prevDay} → ${day} (transition #${monthTransitions})`);
        
        // Move to next month if available
        if (currentMonthIdx < uniqueMonthHeaders.length - 1) {
          currentMonthIdx++;
        }
      }
    }
    
    // Determine the month and year for this day
    let monthIndex: number;
    let year: number;
    
    if (uniqueMonthHeaders.length > 0) {
      const currentMonth = uniqueMonthHeaders[Math.min(currentMonthIdx, uniqueMonthHeaders.length - 1)];
      monthIndex = getMonthIndex(currentMonth.month);
      year = currentMonth.year;
    } else {
      // Fallback: assume starting February 2026 and increment on transitions
      monthIndex = 1 + monthTransitions; // Feb = 1, Mar = 2, Apr = 3
      year = 2026;
    }
    
    if (monthIndex !== -1) {
      const date = new Date(year, monthIndex, day);
      dateMap[col] = date;
    }
    
    prevDay = day;
  }
  
  // Log the date range we found
  const dateValues = Object.values(dateMap);
  if (dateValues.length > 0) {
    const minDate = new Date(Math.min(...dateValues.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dateValues.map(d => d.getTime())));
    console.log('[Import] Date map range:', minDate.toISOString().split('T')[0], 'to', maxDate.toISOString().split('T')[0]);
    console.log('[Import] Total month transitions detected:', monthTransitions);
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
  
  // Get all date columns we know about
  const dateColumns = Object.keys(dateMap).map(Number).sort((a, b) => a - b);
  
  for (let c = startCol; c <= range.e.c; c++) {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c });
    const cell = sheet[cellAddress];
    
    // Check for various marker values: 1, "1", or any non-empty truthy value in date columns
    let isMarker = false;
    if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
      // Check if it's explicitly 1 or "1"
      if (cell.v === 1 || cell.v === '1') {
        isMarker = true;
      }
      // Also check for any numeric value that indicates work (some sheets use other markers)
      else if (typeof cell.v === 'number' && cell.v > 0) {
        isMarker = true;
      }
    }
    
    if (isMarker) {
      if (firstMarkerCol === null) {
        firstMarkerCol = c;
      }
      lastMarkerCol = c;
    }
  }
  
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  
  // Find the closest date column for the first marker
  if (firstMarkerCol !== null) {
    // First try exact match
    if (dateMap[firstMarkerCol]) {
      startDate = dateMap[firstMarkerCol];
    } else {
      // Find the closest date column
      const closestStart = dateColumns.reduce((closest, col) => {
        if (col <= firstMarkerCol && (!closest || col > closest)) return col;
        return closest;
      }, null as number | null);
      if (closestStart !== null && dateMap[closestStart]) {
        startDate = dateMap[closestStart];
      }
    }
  }
  
  // Find the closest date column for the last marker
  if (lastMarkerCol !== null) {
    if (dateMap[lastMarkerCol]) {
      endDate = dateMap[lastMarkerCol];
    } else {
      // Find the closest date column (could be after or before)
      const closestEnd = dateColumns.reduce((closest, col) => {
        if (col <= lastMarkerCol && (!closest || col > closest)) return col;
        return closest;
      }, null as number | null);
      if (closestEnd !== null && dateMap[closestEnd]) {
        endDate = dateMap[closestEnd];
      }
    }
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
  let detectedDateRange: { startDate: string; endDate: string } | undefined;
  
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
    
    // Calculate detected date range from the dateMap
    const dateValues = Object.values(dateMap);
    if (dateValues.length > 0) {
      const minDate = new Date(Math.min(...dateValues.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dateValues.map(d => d.getTime())));
      detectedDateRange = {
        startDate: formatDateISO(minDate),
        endDate: formatDateISO(maxDate)
      };
    }
    
    const calendarStartCol = Object.keys(dateMap).length > 0 
      ? Math.min(...Object.keys(dateMap).map(Number))
      : 7;
    
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
        const gridDates = findTaskDateRange(sheet, r, calendarStartCol, dateMap);
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
  
  return { tasks, errors, detectedDateRange };
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
