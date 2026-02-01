import { format } from 'date-fns';
import { Task, Milestone } from '@/types/gantt';

/**
 * Export tasks to CSV/Excel format
 */
export function exportToExcel(tasks: Task[], projectName: string): void {
  const headers = ['Task Name', 'Description', 'Owner', 'Start Date', 'End Date', 'Status', 'Progress %', 'Color'];
  
  const rows = tasks.map(task => [
    escapeCSV(task.name),
    escapeCSV(task.description || ''),
    escapeCSV(task.owner || 'Unassigned'),
    format(new Date(task.start_date), 'yyyy-MM-dd'),
    format(new Date(task.end_date), 'yyyy-MM-dd'),
    formatStatus(task.status),
    task.progress.toString(),
    task.color || ''
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  downloadFile(blob, `${sanitizeFilename(projectName)}-tasks.csv`);
}

/**
 * Export tasks and milestones to Word document format
 */
export function exportToWord(
  tasks: Task[], 
  milestones: Milestone[], 
  projectName: string
): void {
  const today = format(new Date(), 'MMMM d, yyyy');
  
  // Calculate summary stats
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const notStartedTasks = tasks.filter(t => t.status === 'not_started').length;
  const overdueTasks = tasks.filter(t => 
    t.status !== 'completed' && new Date(t.end_date) < new Date()
  ).length;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHTML(projectName)} - Project Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #4a90d9; padding-bottom: 10px; }
    h2 { color: #2d3748; margin-top: 30px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 30px; }
    .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .summary-grid { display: flex; gap: 30px; flex-wrap: wrap; }
    .summary-item { text-align: center; }
    .summary-value { font-size: 28px; font-weight: bold; color: #4a90d9; }
    .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #4a90d9; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    tr:hover { background: #f7fafc; }
    .status-completed { color: #48bb78; font-weight: 500; }
    .status-in-progress { color: #4299e1; font-weight: 500; }
    .status-not-started { color: #a0aec0; font-weight: 500; }
    .overdue { color: #e53e3e; font-weight: 500; }
    .milestone { background: #fef3c7; padding: 8px 12px; border-left: 4px solid #f59e0b; margin: 8px 0; }
    .progress-bar { background: #e2e8f0; border-radius: 4px; height: 8px; width: 100px; }
    .progress-fill { background: #48bb78; border-radius: 4px; height: 100%; }
  </style>
</head>
<body>
  <h1>${escapeHTML(projectName)}</h1>
  <div class="meta">Project Report • Generated on ${today}</div>
  
  <div class="summary">
    <h2 style="margin-top: 0;">Summary</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-value">${tasks.length}</div>
        <div class="summary-label">Total Tasks</div>
      </div>
      <div class="summary-item">
        <div class="summary-value" style="color: #48bb78;">${completedTasks}</div>
        <div class="summary-label">Completed</div>
      </div>
      <div class="summary-item">
        <div class="summary-value" style="color: #4299e1;">${inProgressTasks}</div>
        <div class="summary-label">In Progress</div>
      </div>
      <div class="summary-item">
        <div class="summary-value" style="color: #a0aec0;">${notStartedTasks}</div>
        <div class="summary-label">Not Started</div>
      </div>
      ${overdueTasks > 0 ? `
      <div class="summary-item">
        <div class="summary-value" style="color: #e53e3e;">${overdueTasks}</div>
        <div class="summary-label">Overdue</div>
      </div>
      ` : ''}
      <div class="summary-item">
        <div class="summary-value" style="color: #f59e0b;">${milestones.length}</div>
        <div class="summary-label">Milestones</div>
      </div>
    </div>
  </div>

  ${milestones.length > 0 ? `
  <h2>Milestones</h2>
  ${milestones
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(m => `
      <div class="milestone">
        <strong>🎯 ${escapeHTML(m.name)}</strong> — ${format(new Date(m.date), 'MMM d, yyyy')}
        ${m.description ? `<br><span style="color: #666; font-size: 14px;">${escapeHTML(m.description)}</span>` : ''}
      </div>
    `).join('')}
  ` : ''}

  <h2>Tasks</h2>
  <table>
    <thead>
      <tr>
        <th>Task</th>
        <th>Owner</th>
        <th>Start</th>
        <th>End</th>
        <th>Status</th>
        <th>Progress</th>
      </tr>
    </thead>
    <tbody>
      ${tasks.map(task => {
        const isOverdue = task.status !== 'completed' && new Date(task.end_date) < new Date();
        return `
        <tr>
          <td>
            <strong>${escapeHTML(task.name)}</strong>
            ${task.description ? `<br><span style="color: #666; font-size: 13px;">${escapeHTML(task.description)}</span>` : ''}
          </td>
          <td>${escapeHTML(task.owner || 'Unassigned')}</td>
          <td>${format(new Date(task.start_date), 'MMM d')}</td>
          <td class="${isOverdue ? 'overdue' : ''}">${format(new Date(task.end_date), 'MMM d')}${isOverdue ? ' ⚠️' : ''}</td>
          <td class="status-${task.status.replace('_', '-')}">${formatStatus(task.status)}</td>
          <td>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${task.progress}%;"></div>
            </div>
            <span style="font-size: 12px; color: #666;">${task.progress}%</span>
          </td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #666; font-size: 12px;">
    Generated by Gantt Chart Generator • ${today}
  </div>
</body>
</html>
  `.trim();

  const blob = new Blob([html], { type: 'application/msword' });
  downloadFile(blob, `${sanitizeFilename(projectName)}-report.doc`);
}

// Helper functions
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
