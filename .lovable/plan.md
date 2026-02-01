

# Task Color Presets and Themes

## Overview

This plan adds the ability for users to assign colors to individual tasks using preset color palettes, plus optional project-level theme support. This will make Gantt charts more visually organized and help users categorize tasks at a glance.

---

## Current State

- Tasks currently get colors based on status only (green for completed, blue for in-progress, grey for not started, red for overdue)
- No `color` field exists on the `tasks` database table
- The Task interface in `src/types/gantt.ts` has no color property
- The `TaskForm` component handles task creation/editing but has no color picker

---

## Implementation Scope

### Part 1: Task Color Presets (Core Feature)

Allow users to assign one of several preset colors to each task.

#### Database Changes
Add a `color` column to the `tasks` table:
- Type: `text` (nullable)
- Default: `null` (uses status-based coloring when not set)
- Values: Store color preset keys like `'blue'`, `'green'`, `'purple'`, `'orange'`, `'pink'`, `'teal'`, `'yellow'`, `'red'`

#### Color Palette Definition
Create a shared color constants file with preset definitions:

```text
Preset Colors (8-10 options):
+----------+-----------------+------------------+
| Key      | Bar Color       | Foreground       |
+----------+-----------------+------------------+
| blue     | bg-blue-500     | text-white       |
| green    | bg-green-500    | text-white       |
| purple   | bg-purple-500   | text-white       |
| orange   | bg-orange-500   | text-white       |
| pink     | bg-pink-500     | text-white       |
| teal     | bg-teal-500     | text-white       |
| yellow   | bg-yellow-500   | text-black       |
| red      | bg-red-500      | text-white       |
| indigo   | bg-indigo-500   | text-white       |
| gray     | bg-gray-500     | text-white       |
+----------+-----------------+------------------+
```

#### UI Changes

1. **TaskForm Component** - Add a color picker section:
   - Display as a row of clickable color swatches
   - Include a "Default" option that clears the color (uses status-based)
   - Show a check mark or ring on the selected color

2. **GanttChart Component** - Update `getStatusColor` function:
   - If `task.color` is set, use the preset color
   - Otherwise, fall back to existing status-based logic

3. **ProgressPanel** - Update task list to show color indicators

---

### Part 2: Project Themes (Optional Enhancement)

Allow users to select a theme that changes the overall color palette for task bars.

#### Approach A: Project-Level Default Color Scheme
- Add `theme` column to `projects` table
- Themes define which status maps to which color
- Example themes: "Classic", "Ocean", "Forest", "Sunset"

#### Approach B: CSS Variable Overrides
- Store theme preference in project settings
- Apply CSS class that overrides task bar colors globally

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/taskColors.ts` | Color preset definitions and helper functions |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/gantt.ts` | Add `color?: string` to Task interface |
| `src/components/gantt/TaskForm.tsx` | Add color picker UI |
| `src/components/gantt/GanttChart.tsx` | Update `getStatusColor` to use custom colors |
| `src/components/gantt/ProgressPanel.tsx` | Show color indicators on task list |

### Database Migration

```sql
ALTER TABLE public.tasks 
ADD COLUMN color text DEFAULT NULL;
```

---

## Color Picker UI Design

The color picker in TaskForm will appear as:

```text
Color
+-----------------------------------------------+
| [Default] [O] [O] [O] [O] [O] [O] [O] [O]     |
+-----------------------------------------------+
Assign a color to visually categorize this task
```

- Each `[O]` is a colored circle (20x20px)
- Selected color shows a white checkmark or ring
- "Default" is a grey circle with a slash or "Auto" label
- Hover shows tooltip with color name

---

## Behavior

1. **New Tasks**: Default to `null` (status-based coloring)
2. **Existing Tasks**: Continue using status colors until user assigns one
3. **Overdue Logic**: Custom colors still respect overdue styling (optional: add a warning badge instead of changing color)
4. **Status Change**: Custom color persists even when status changes

---

## Migration Strategy

- The new `color` column is nullable with no default
- Existing tasks remain unchanged and continue using status-based colors
- No data migration needed

---

## Future Enhancements (Not in This Plan)

- Custom hex color picker (beyond presets)
- Color-based filtering in the toolbar
- Color legends/keys
- Category tags that auto-assign colors
- Dark mode color variants

---

## Summary

This implementation adds a simple but powerful visual organization feature by:
1. Adding a `color` column to the tasks table
2. Creating a color presets system with 8-10 predefined options
3. Adding a color picker to the task form
4. Updating the Gantt chart to render custom colors

The approach keeps things simple (preset colors only) while leaving room for expansion (custom colors, themes) in the future.

