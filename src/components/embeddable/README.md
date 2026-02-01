# Embeddable Gantt Chart Component

A standalone, props-based Gantt chart visualization component that can be embedded into any React application.

## Installation

Copy the `src/components/embeddable` folder into your project.

### Required Dependencies

```bash
npm install date-fns lucide-react class-variance-authority clsx tailwind-merge
```

You'll also need the shadcn/ui `Tooltip` component or can remove tooltip functionality.

## Usage

```tsx
import { 
  EmbeddableGanttChart, 
  EmbeddableTask, 
  EmbeddableDependency,
  EmbeddableMilestone 
} from '@/components/embeddable';

// Define your tasks
const tasks: EmbeddableTask[] = [
  {
    id: '1',
    name: 'Project Planning',
    start_date: '2024-01-01',
    end_date: '2024-01-07',
    status: 'completed',
    progress: 100,
    sort_order: 0,
    owner: 'Alice'
  },
  {
    id: '2',
    name: 'Development Phase 1',
    start_date: '2024-01-08',
    end_date: '2024-01-21',
    status: 'in_progress',
    progress: 60,
    sort_order: 1,
    owner: 'Bob',
    color: 'blue'
  },
  {
    id: '3',
    name: 'Testing',
    start_date: '2024-01-22',
    end_date: '2024-01-28',
    status: 'not_started',
    progress: 0,
    sort_order: 2
  }
];

// Define dependencies between tasks
const dependencies: EmbeddableDependency[] = [
  {
    id: 'dep-1',
    predecessor_id: '1',
    successor_id: '2',
    dependency_type: 'finish_to_start'
  },
  {
    id: 'dep-2',
    predecessor_id: '2',
    successor_id: '3',
    dependency_type: 'finish_to_start'
  }
];

// Define milestones
const milestones: EmbeddableMilestone[] = [
  {
    id: 'ms-1',
    name: 'Phase 1 Complete',
    date: '2024-01-21',
    color: '#8B5CF6'
  }
];

// Render the chart
function MyComponent() {
  return (
    <EmbeddableGanttChart
      tasks={tasks}
      dependencies={dependencies}
      milestones={milestones}
      config={{
        viewMode: 'week',
        groupBy: 'none',
        showDependencies: true,
        showTodayLine: true,
        showMilestones: true,
        showBaseline: false,
        showCriticalPath: false,
        className: 'h-[600px]'
      }}
      callbacks={{
        onTaskClick: (task) => console.log('Clicked:', task),
        onMilestoneClick: (milestone) => console.log('Milestone:', milestone),
        onViewModeChange: (mode) => console.log('View mode:', mode),
        onGroupByChange: (groupBy) => console.log('Group by:', groupBy)
      }}
    />
  );
}
```

## Props

### `EmbeddableGanttChartProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tasks` | `EmbeddableTask[]` | Yes | Array of tasks to display |
| `dependencies` | `EmbeddableDependency[]` | No | Task dependencies |
| `milestones` | `EmbeddableMilestone[]` | No | Timeline milestones |
| `baselineTasks` | `EmbeddableBaselineTask[]` | No | Baseline for comparison |
| `criticalPathTaskIds` | `Set<string>` | No | Tasks on critical path |
| `config` | `EmbeddableGanttConfig` | No | Chart configuration |
| `callbacks` | `EmbeddableGanttCallbacks` | No | Event handlers |

### `EmbeddableTask`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `name` | `string` | Yes | Display name |
| `start_date` | `string` | Yes | ISO date (YYYY-MM-DD) |
| `end_date` | `string` | Yes | ISO date (YYYY-MM-DD) |
| `status` | `'not_started' \| 'in_progress' \| 'completed'` | Yes | Task status |
| `progress` | `number` | Yes | Completion percentage (0-100) |
| `sort_order` | `number` | Yes | Display order |
| `description` | `string \| null` | No | Task description |
| `owner` | `string \| null` | No | Assigned person |
| `color` | `string \| null` | No | Color key |

### `EmbeddableGanttConfig`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `viewMode` | `'day' \| 'week' \| 'month'` | `'week'` | Timeline zoom level |
| `groupBy` | `'none' \| 'owner' \| 'status'` | `'none'` | Task grouping |
| `showDependencies` | `boolean` | `true` | Show dependency arrows |
| `showTodayLine` | `boolean` | `true` | Show today marker |
| `showMilestones` | `boolean` | `true` | Show milestone markers |
| `showBaseline` | `boolean` | `true` | Show baseline bars |
| `showCriticalPath` | `boolean` | `true` | Highlight critical path |
| `className` | `string` | - | Custom container class |
| `colorPresets` | `EmbeddableColorPreset[]` | Default colors | Custom color palette |

### Available Colors

Built-in color keys: `blue`, `green`, `purple`, `orange`, `pink`, `teal`, `yellow`, `red`, `indigo`, `gray`

## Styling

The component uses Tailwind CSS with CSS custom properties for theming. Ensure your app has these CSS variables defined:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
}
```

## Features

- ✅ Day/Week/Month view modes
- ✅ Task grouping by owner or status
- ✅ Dependency visualization with arrows
- ✅ Milestone markers
- ✅ Today line indicator
- ✅ Baseline comparison bars
- ✅ Critical path highlighting
- ✅ Progress bars
- ✅ Tooltips with task details
- ✅ Responsive horizontal scrolling
- ✅ Custom color palettes
