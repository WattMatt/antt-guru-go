

# Import Construction Program from Excel

## Overview

This plan adds the ability to import construction programs from Excel files (like the attached `Construction_program_PBM.xlsx`) and visualize them on the Gantt chart.

## Understanding the Excel Format

The uploaded file is a **construction schedule** with the following structure:

| Column | Content |
|--------|---------|
| A | Row number (1, 1.1, 1.2, etc.) |
| B | Task/Section name |
| C | Quantity |
| D | Unit |
| E | Duration (DAYS) |
| F-G | Start/Stop dates |
| H onwards | Weekly calendar grid showing work days |

**Key sections identified:**
1. **CONTRACTUAL** - Contract signing
2. **SITE ESTABLISHMENT** - Site setup, storage, setting out works
3. **CONSTRUCTION** - Walkways, cable trays, panels, wiring, inverters
4. **TEST AND COMMISSION** - Testing installation and monitoring
5. **HAND OVER** - PC handover

The calendar grid uses "1" markers to indicate working days, with headers showing week numbers and dates (Feb-26 through Apr-26).

---

## Implementation Approach

### 1. Add Excel Parsing Library

Install the `xlsx` (SheetJS) library to parse Excel files client-side.

### 2. Create Import Parser Utility

A new utility file will handle parsing construction program Excel files:

- Extract project metadata (contract name, duration, completion date)
- Parse task rows with hierarchical numbering (1, 1.1, 1.2, etc.)
- Calculate start/end dates from the calendar grid markers
- Handle section headers vs actual tasks
- Map duration values to task properties

### 3. Build Import Dialog Component

A dialog with:

- File drop zone for Excel upload
- Preview of parsed tasks before import
- Mapping options (column assignments if format varies)
- Conflict handling (merge vs replace existing tasks)
- Progress indicator for large files

### 4. Integrate into GanttToolbar

Add an "Import" button in the toolbar's export dropdown menu, providing symmetry with existing export options.

### 5. Wire Up to Project Page

Connect the import flow to create tasks via the existing `useTasks` hook mutations.

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `xlsx` dependency |
| `src/lib/programImport.ts` | Create | Excel parsing and date calculation logic |
| `src/components/gantt/ImportProgramDialog.tsx` | Create | File upload UI with preview table |
| `src/components/gantt/GanttToolbar.tsx` | Modify | Add Import menu item |
| `src/pages/Project.tsx` | Modify | Add import handler and dialog state |

---

## Technical Details

### Date Calculation Algorithm

The Excel file uses a calendar grid where:
- Row 14 contains day numbers (2, 3, 4, 5... for Feb-26)
- Row 13 shows week labels (WEEK 1, WEEK 2, etc.)
- Rows 12 shows months (Feb-26, Mar-26, Apr-26)
- Task rows have "1" in columns where work occurs

The parser will:
1. Build a column-to-date mapping from the header rows
2. For each task row, find first and last "1" markers
3. Map those columns to actual dates

### Task Hierarchy

Rows like "1", "2", "3" are section headers (CONTRACTUAL, SITE ESTABLISHMENT, etc.)
Rows like "1.1", "1.2", "3.1" are actual tasks

The parser will:
- Skip or mark section headers (optionally import as milestones)
- Import numbered sub-items as tasks
- Preserve the numbering in task names for context

### Parsed Task Structure

```typescript
interface ParsedProgramTask {
  rowNumber: string;      // "3.1", "3.2", etc.
  name: string;           // "Install walkways per zone @ 67m/day"
  quantity?: number;      // 1210
  unit?: string;          // "m"
  duration?: number;      // 18 (days)
  startDate: string;      // "2026-02-10" (ISO format)
  endDate: string;        // "2026-03-10" (ISO format)
  isSection: boolean;     // true for main headers
}
```

---

## User Flow

1. User clicks "Import" in the Export dropdown menu
2. Import dialog opens with a file drop zone
3. User drops or selects an Excel file
4. Parser extracts tasks and displays preview table showing:
   - Task name
   - Calculated start/end dates
   - Duration
   - Status (new/will update/conflict)
5. User reviews and clicks "Import X Tasks"
6. Tasks are created in the database
7. Gantt chart refreshes showing imported tasks

---

## Edge Cases Handled

- **Missing dates**: Tasks without calendar markers get project start date
- **Section headers**: Converted to grouping info or skipped
- **Duplicate imports**: Option to skip existing or update
- **Invalid files**: Clear error messages for non-Excel or wrong format
- **Large files**: Streaming parse with progress indicator

