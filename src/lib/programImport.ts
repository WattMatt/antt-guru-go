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
  
  // Based on the known format:
  // - Row with "ACTION", "QTY", "UNIT", "DUR", "START", "STOP", then month headers (Feb-26, Mar-26, Apr-26)
  // - Row with week labels (WEEK 1, WEEK 2, etc.)
  // - Row with day numbers (2, 3, 4, 5, 6, 7, 8, ... for Feb, then 1, 2, 3... for Mar, etc.)
  
  // Step 1: Find ALL month headers (Feb-26, Mar-26, Apr-26) across all rows
  const monthHeaders: { col: number; month: number; year: number }[] = [];
  
  for (let r = 0; r <= Math.min(15, range.e.r); r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellAddress];
      if (!cell) continue;
      
      const formatted = cell.w || '';
      const value = cell.v?.toString() || '';
      
      // Try to match "Feb-26", "Mar-26", "Apr-26" patterns
      let match = formatted.match(/^([A-Za-z]{3})-(\d{2})$/);
      if (!match) {
        match = value.match(/^([A-Za-z]{3})-(\d{2})$/);
      }
      
      if (match) {
        const monthIndex = getMonthIndex(match[1]);
        if (monthIndex !== -1) {
          monthHeaders.push({
            col: c,
            month: monthIndex,
            year: 2000 + parseInt(match[2])
          });
          console.log(`[Import] Found month header: ${match[1]}-${match[2]} at row ${r}, col ${c}`);
        }
      }
    }
  }
  
  // Sort by column
  monthHeaders.sort((a, b) => a.col - b.col);
  console.log('[Import] Month headers found:', monthHeaders.length, monthHeaders);
  
  // Step 2: Find the row with consecutive day numbers (the calendar day row)
  // The calendar starts around column H (index 7) - ignore earlier columns
  const CALENDAR_START_COL = 7; // Column H
  
  let dayRowIndex = -1;
  let dayColumns: { col: number; day: number }[] = [];
  
  for (let r = 0; r <= Math.min(25, range.e.r); r++) {
    const rowDays: { col: number; day: number }[] = [];
    
    // Only scan columns from the calendar area (column H onwards)
    for (let c = CALENDAR_START_COL; c <= range.e.c; c++) {
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
    
    // Check if this row has many day values with consecutive patterns
    // Need at least 20 day cells to be the calendar row
    if (rowDays.length >= 20) {
      let consecutiveCount = 0;
      for (let i = 1; i < Math.min(10, rowDays.length); i++) {
        if (rowDays[i].day === rowDays[i-1].day + 1) {
          consecutiveCount++;
        }
      }
      
      if (consecutiveCount >= 5) {
        dayRowIndex = r;
        dayColumns = rowDays;
        console.log(`[Import] Found calendar day row at index ${r} with ${rowDays.length} day cells`);
        console.log(`[Import] First day: col ${rowDays[0].col} = day ${rowDays[0].day}`);
        console.log(`[Import] Last day: col ${rowDays[rowDays.length-1].col} = day ${rowDays[rowDays.length-1].day}`);
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
  
  // Step 3: Assign dates to each day column
  // Key insight: We know the month headers and their columns, and we have day numbers
  // When a day number resets (e.g., 28 → 1 or 31 → 1), we move to the next month
  
  let currentMonthIndex = 0;
  let prevDay = 0;
  
  // If we have month headers, use the first one as starting point
  // Otherwise, assume Feb 2026
  let currentMonth = monthHeaders.length > 0 ? monthHeaders[0].month : 1; // Feb = 1
  let currentYear = monthHeaders.length > 0 ? monthHeaders[0].year : 2026;
  
  for (const { col, day } of dayColumns) {
    // Detect month transition: day number resets (goes from high to low)
    if (prevDay > 0 && day < prevDay && prevDay >= 20 && day <= 10) {
      currentMonthIndex++;
      
      // Update current month from headers if available
      if (monthHeaders.length > currentMonthIndex) {
        currentMonth = monthHeaders[currentMonthIndex].month;
        currentYear = monthHeaders[currentMonthIndex].year;
        console.log(`[Import] Month transition at col ${col}: day ${prevDay} → ${day}, now ${currentMonth + 1}/${currentYear}`);
      } else {
        // Increment month manually
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        console.log(`[Import] Month transition (inferred) at col ${col}: now ${currentMonth + 1}/${currentYear}`);
      }
    }
    
    // Create the date for this column
    const date = new Date(currentYear, currentMonth, day);
    dateMap[col] = date;
    
    prevDay = day;
  }
  
  // Log the date range
  const dateValues = Object.values(dateMap);
  if (dateValues.length > 0) {
    const minDate = new Date(Math.min(...dateValues.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dateValues.map(d => d.getTime())));
    console.log('[Import] Date map range:', minDate.toISOString().split('T')[0], 'to', maxDate.toISOString().split('T')[0]);
    console.log('[Import] Total columns mapped:', Object.keys(dateMap).length);
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
  
  // Get all date columns we know about, sorted
  const dateColumns = Object.keys(dateMap).map(Number).sort((a, b) => a - b);
  
  // Scan for markers in this row
  for (let c = startCol; c <= range.e.c; c++) {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c });
    const cell = sheet[cellAddress];
    
    // Check for marker values: 1, "1", or positive numbers
    let isMarker = false;
    if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
      if (cell.v === 1 || cell.v === '1') {
        isMarker = true;
      } else if (typeof cell.v === 'number' && cell.v > 0) {
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
  
  // If we found markers, map them to dates
  if (firstMarkerCol !== null && dateColumns.length > 0) {
    // The marker column should directly correspond to a date column
    // If not exact match, find the NEAREST date column (not just the one before)
    
    if (dateMap[firstMarkerCol]) {
      startDate = dateMap[firstMarkerCol];
    } else {
      // Find closest date column to the marker
      let closestCol: number | null = null;
      let minDist = Infinity;
      
      for (const col of dateColumns) {
        const dist = Math.abs(col - firstMarkerCol);
        if (dist < minDist) {
          minDist = dist;
          closestCol = col;
        }
      }
      
      if (closestCol !== null && minDist <= 2) { // Allow 2 column offset
        startDate = dateMap[closestCol];
      }
    }
  }
  
  if (lastMarkerCol !== null && dateColumns.length > 0) {
    if (dateMap[lastMarkerCol]) {
      endDate = dateMap[lastMarkerCol];
    } else {
      let closestCol: number | null = null;
      let minDist = Infinity;
      
      for (const col of dateColumns) {
        const dist = Math.abs(col - lastMarkerCol);
        if (dist < minDist) {
          minDist = dist;
          closestCol = col;
        }
      }
      
      if (closestCol !== null && minDist <= 2) {
        endDate = dateMap[closestCol];
      }
    }
  }
  
  // Debug: log when we can't find dates
  if (firstMarkerCol !== null && !startDate) {
    console.log(`[Import] Row ${rowIndex}: Found marker at col ${firstMarkerCol} but no matching date. Date columns range: ${dateColumns[0]}-${dateColumns[dateColumns.length-1]}`);
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
