import { format } from 'date-fns';
import { Task, Milestone } from '@/types/gantt';

/**
 * Generates ICS file content for calendar events
 */

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isAllDay?: boolean;
  type: 'task' | 'milestone';
}

function formatICSDate(date: Date, allDay: boolean = false): string {
  if (allDay) {
    return format(date, 'yyyyMMdd');
  }
  return format(date, "yyyyMMdd'T'HHmmss");
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function generateUID(id: string, type: string): string {
  return `${id}-${type}@gantt-chart`;
}

export function generateICSContent(events: CalendarEvent[]): string {
  const now = new Date();
  const timestamp = format(now, "yyyyMMdd'T'HHmmss");

  const icsEvents = events.map(event => {
    const uid = generateUID(event.id, event.type);
    const summary = escapeICSText(event.title);
    const description = event.description ? escapeICSText(event.description) : '';
    
    const dtstart = event.isAllDay 
      ? `DTSTART;VALUE=DATE:${formatICSDate(event.startDate, true)}`
      : `DTSTART:${formatICSDate(event.startDate)}`;
    
    const dtend = event.isAllDay
      ? `DTEND;VALUE=DATE:${formatICSDate(event.endDate, true)}`
      : `DTEND:${formatICSDate(event.endDate)}`;

    return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${timestamp}
${dtstart}
${dtend}
SUMMARY:${summary}
DESCRIPTION:${description}
STATUS:CONFIRMED
END:VEVENT`;
  }).join('\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Gantt Chart//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${icsEvents}
END:VCALENDAR`;
}

export function tasksToCalendarEvents(tasks: Task[]): CalendarEvent[] {
  return tasks.map(task => ({
    id: task.id,
    title: task.name,
    description: task.description || `Status: ${task.status.replace('_', ' ')}`,
    startDate: new Date(task.start_date),
    endDate: new Date(task.end_date),
    isAllDay: true,
    type: 'task' as const,
  }));
}

export function milestonesToCalendarEvents(milestones: Milestone[]): CalendarEvent[] {
  return milestones.map(milestone => ({
    id: milestone.id,
    title: `🎯 ${milestone.name}`,
    description: milestone.description || 'Project milestone',
    startDate: new Date(milestone.date),
    endDate: new Date(milestone.date),
    isAllDay: true,
    type: 'milestone' as const,
  }));
}

export function downloadICSFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCalendar(
  tasks: Task[],
  milestones: Milestone[],
  projectName: string,
  options: {
    includeTasks?: boolean;
    includeMilestones?: boolean;
  } = {}
): void {
  const { includeTasks = true, includeMilestones = true } = options;
  
  const events: CalendarEvent[] = [];
  
  if (includeTasks) {
    events.push(...tasksToCalendarEvents(tasks));
  }
  
  if (includeMilestones) {
    events.push(...milestonesToCalendarEvents(milestones));
  }
  
  if (events.length === 0) {
    throw new Error('No events to export');
  }
  
  const icsContent = generateICSContent(events);
  const sanitizedName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = `${sanitizedName}-calendar.ics`;
  
  downloadICSFile(icsContent, filename);
}
