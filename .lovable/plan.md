

# User Guidance & Onboarding Hints for Gantt Chart

## Overview

Add a step-by-step guidance system that helps users understand how to build a complete Gantt chart. The system will include contextual hints, an onboarding checklist, and helpful tooltips that appear based on the user's progress.

---

## Feature Components

### 1. Onboarding Checklist Panel

A collapsible checklist that tracks the user's progress through creating a complete chart:

**Checklist Steps:**
- Create your first task
- Set task dates (start and end)
- Assign an owner to a task
- Update task progress
- Mark a task as complete
- Create multiple tasks (3+)
- Link tasks with dependencies (future feature)
- Export your chart

**Behavior:**
- Shows at the top of the project page for new projects (0-2 tasks)
- Can be dismissed/hidden by the user
- Remembers user's preference (localStorage)
- Shows completion percentage
- Each step links to the relevant action

---

### 2. Empty State Guidance

When users first open a project with no tasks, display helpful guidance:

**Content:**
- Welcome message with quick tips
- Large call-to-action to create first task
- Brief explanation of what a Gantt chart does
- Visual preview of what a completed chart looks like

---

### 3. Contextual Tooltips

Add helpful tooltips to key UI elements:

| Element | Tooltip Message |
|---------|-----------------|
| Add Task button | "Start by adding tasks with names and dates" |
| View toggle (Day/Week/Month) | "Switch views to see your timeline at different scales" |
| Task checkbox | "Click to mark tasks as complete" |
| Task bar on chart | "Click to edit task details, drag edges to resize" |
| Status filter | "Filter tasks by their current status" |
| Owner filter | "Filter tasks by assigned team member" |
| Export button | "Generate professional reports in PDF, Excel, or Word" |
| Progress panel | "Track your project completion and upcoming deadlines" |

---

### 4. Inline Hints in Empty Areas

When specific areas are empty, show contextual help:

**Empty Task List:**
- "No tasks yet - Click 'Add Task' to get started"
- Shows a pulsing indicator pointing to Add Task button

**Empty Owners Filter:**
- "Add owners to tasks to filter by team member"

**No Dependencies (future):**
- "Link tasks together to create sequences"

---

### 5. First-Time Task Form Hints

Enhance the task creation form with helper text:

**Field Hints:**
- Task Name: "Give your task a clear, descriptive name"
- Dates: "Tasks appear on the timeline based on these dates"
- Status: "Track progress from 'Not Started' to 'Completed'"
- Owner: "Assign responsibility to team members"
- Progress: "Update as work progresses (0-100%)"

---

### 6. Interactive Feature Discovery

Add subtle animations/highlights for new users:

- Pulse animation on "Add Task" button for empty projects
- Gentle highlight on the Gantt chart area when first task is created
- Toast notification celebrating milestones ("First task created!", "Great progress!")

---

## Technical Implementation

### New Files to Create

1. **`src/components/gantt/OnboardingChecklist.tsx`**
   - Collapsible checklist component
   - Tracks completion via props (task count, has owner, etc.)
   - Dismissible with localStorage persistence

2. **`src/components/gantt/GettingStartedGuide.tsx`**
   - Empty state component for new projects
   - Visual guide with illustrations
   - Quick action buttons

3. **`src/hooks/useOnboardingProgress.ts`**
   - Hook to calculate onboarding progress
   - Tracks which steps are completed
   - Manages localStorage for dismissed state

### Files to Modify

1. **`src/pages/Project.tsx`**
   - Add OnboardingChecklist component
   - Pass task data to calculate progress
   - Handle dismiss action

2. **`src/components/gantt/GanttChart.tsx`**
   - Enhance empty state with GettingStartedGuide
   - Add tooltips to task bars

3. **`src/components/gantt/GanttToolbar.tsx`**
   - Wrap buttons with Tooltip components
   - Add pulse animation for empty projects

4. **`src/components/gantt/TaskForm.tsx`**
   - Add helper text under form fields
   - Show tips for first-time users

5. **`src/components/gantt/ProgressPanel.tsx`**
   - Add tooltip to panel header
   - Show helpful message when all stats are zero

---

## User Experience Flow

```text
1. User creates new project
          │
          ▼
2. Sees welcome guide + empty Gantt chart
   with pulsing "Add Task" button
          │
          ▼
3. Onboarding checklist appears (minimized)
   showing 0% complete
          │
          ▼
4. User clicks "Add Task"
          │
          ▼
5. Task form shows with helpful field hints
          │
          ▼
6. First task created → Toast: "Great start!"
   Checklist updates (1/8 complete)
          │
          ▼
7. User continues adding tasks, owners, etc.
          │
          ▼
8. Checklist completes → Can be dismissed
          │
          ▼
9. Experienced user returns → No checklist shown
```

---

## Visual Design

- Professional, unobtrusive styling
- Muted colors for hints (not distracting)
- Smooth fade-in/out animations
- Consistent with existing corporate design
- Tooltips use existing Tooltip component from shadcn/ui

---

## Summary

This guidance system will help new users understand how to:
1. Create and manage tasks
2. Use the timeline visualization effectively
3. Track progress and deadlines
4. Utilize all available features
5. Export their completed charts

All guidance can be dismissed and won't interfere with experienced users.

