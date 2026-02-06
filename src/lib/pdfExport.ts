import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { Task, Milestone } from '@/types/gantt';

interface PdfExportOptions {
  projectName: string;
  tasks: Task[];
  milestones: Milestone[];
  chartImageDataUrl?: string;
}

// Colors
const PRIMARY_COLOR: [number, number, number] = [74, 144, 217]; // #4a90d9
const DARK_TEXT: [number, number, number] = [26, 26, 46];
const GRAY_TEXT: [number, number, number] = [100, 100, 100];
const LIGHT_GRAY: [number, number, number] = [240, 240, 240];
const SUCCESS_COLOR: [number, number, number] = [72, 187, 120];
const WARNING_COLOR: [number, number, number] = [245, 158, 11];
const DANGER_COLOR: [number, number, number] = [229, 62, 62];

export async function exportProfessionalPdf(options: PdfExportOptions): Promise<void> {
  const { projectName, tasks, milestones, chartImageDataUrl } = options;
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Calculate statistics
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const notStartedTasks = tasks.filter(t => t.status === 'not_started').length;
  const overdueTasks = tasks.filter(t => 
    t.status !== 'completed' && new Date(t.end_date) < new Date()
  ).length;
  const avgProgress = tasks.length > 0 
    ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)
    : 0;

  // === HEADER ===
  // Header background
  pdf.setFillColor(...PRIMARY_COLOR);
  pdf.rect(0, 0, pageWidth, 35, 'F');

  // Project name
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text(projectName, margin, 18);

  // Subtitle
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Project Report', margin, 26);

  // Date on right
  pdf.setFontSize(9);
  const dateStr = format(new Date(), 'MMMM d, yyyy');
  const dateWidth = pdf.getTextWidth(dateStr);
  pdf.text(dateStr, pageWidth - margin - dateWidth, 26);

  yPos = 45;

  // === SUMMARY SECTION ===
  pdf.setTextColor(...DARK_TEXT);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Project Summary', margin, yPos);
  yPos += 8;

  // Summary cards background
  pdf.setFillColor(...LIGHT_GRAY);
  pdf.roundedRect(margin, yPos, contentWidth, 28, 3, 3, 'F');

  // Draw summary stats
  const statWidth = contentWidth / 5;
  const stats = [
    { label: 'Total Tasks', value: tasks.length.toString(), color: PRIMARY_COLOR },
    { label: 'Completed', value: completedTasks.toString(), color: SUCCESS_COLOR },
    { label: 'In Progress', value: inProgressTasks.toString(), color: PRIMARY_COLOR },
    { label: 'Not Started', value: notStartedTasks.toString(), color: GRAY_TEXT },
    { label: 'Overdue', value: overdueTasks.toString(), color: overdueTasks > 0 ? DANGER_COLOR : GRAY_TEXT },
  ];

  stats.forEach((stat, index) => {
    const xPos = margin + (statWidth * index) + (statWidth / 2);
    
    // Value
    pdf.setTextColor(...stat.color);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    const valueWidth = pdf.getTextWidth(stat.value);
    pdf.text(stat.value, xPos - (valueWidth / 2), yPos + 12);
    
    // Label
    pdf.setTextColor(...GRAY_TEXT);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    const labelWidth = pdf.getTextWidth(stat.label);
    pdf.text(stat.label, xPos - (labelWidth / 2), yPos + 20);
  });

  yPos += 36;

  // Progress bar
  pdf.setTextColor(...DARK_TEXT);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Overall Progress: ${avgProgress}%`, margin, yPos);
  yPos += 4;

  // Progress bar background
  pdf.setFillColor(220, 220, 220);
  pdf.roundedRect(margin, yPos, contentWidth, 4, 2, 2, 'F');
  
  // Progress bar fill
  if (avgProgress > 0) {
    pdf.setFillColor(...SUCCESS_COLOR);
    pdf.roundedRect(margin, yPos, (contentWidth * avgProgress) / 100, 4, 2, 2, 'F');
  }

  yPos += 14;

  // === MILESTONES SECTION (if any) ===
  if (milestones.length > 0) {
    pdf.setTextColor(...DARK_TEXT);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Milestones', margin, yPos);
    yPos += 6;

    const sortedMilestones = [...milestones].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedMilestones.forEach(milestone => {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = margin;
      }

      // Milestone indicator
      pdf.setFillColor(...WARNING_COLOR);
      pdf.circle(margin + 3, yPos + 2, 2, 'F');

      // Milestone text
      pdf.setTextColor(...DARK_TEXT);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(milestone.name, margin + 10, yPos + 3);

      // Date
      pdf.setTextColor(...GRAY_TEXT);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const milestoneDate = format(new Date(milestone.date), 'MMM d, yyyy');
      pdf.text(` — ${milestoneDate}`, margin + 10 + pdf.getTextWidth(milestone.name), yPos + 3);

      yPos += 8;
    });

    yPos += 6;
  }

  // === TASKS TABLE ===
  pdf.setTextColor(...DARK_TEXT);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Task List', margin, yPos);
  yPos += 8;

  // Table header
  const colWidths = [55, 30, 28, 28, 29];
  const headers = ['Task Name', 'Owner', 'Start', 'End', 'Status'];

  pdf.setFillColor(...PRIMARY_COLOR);
  pdf.rect(margin, yPos, contentWidth, 8, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');

  let xPos = margin + 2;
  headers.forEach((header, i) => {
    pdf.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });

  yPos += 8;

  // Table rows
  const sortedTasks = [...tasks].sort((a, b) => a.sort_order - b.sort_order);

  sortedTasks.forEach((task, index) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      yPos = margin;

      // Repeat header on new page
      pdf.setFillColor(...PRIMARY_COLOR);
      pdf.rect(margin, yPos, contentWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      
      let headerX = margin + 2;
      headers.forEach((header, i) => {
        pdf.text(header, headerX, yPos + 5.5);
        headerX += colWidths[i];
      });
      yPos += 8;
    }

    // Alternating row background
    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPos, contentWidth, 7, 'F');
    }

    // Check if overdue
    const isOverdue = task.status !== 'completed' && new Date(task.end_date) < new Date();

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    
    xPos = margin + 2;

    // Task name (truncate if too long)
    pdf.setTextColor(...DARK_TEXT);
    let taskName = task.name;
    if (pdf.getTextWidth(taskName) > colWidths[0] - 4) {
      while (pdf.getTextWidth(taskName + '...') > colWidths[0] - 4 && taskName.length > 0) {
        taskName = taskName.slice(0, -1);
      }
      taskName += '...';
    }
    pdf.text(taskName, xPos, yPos + 5);
    xPos += colWidths[0];

    // Owner
    pdf.setTextColor(...GRAY_TEXT);
    const owner = task.owner || 'Unassigned';
    let ownerText = owner;
    if (pdf.getTextWidth(ownerText) > colWidths[1] - 4) {
      while (pdf.getTextWidth(ownerText + '...') > colWidths[1] - 4 && ownerText.length > 0) {
        ownerText = ownerText.slice(0, -1);
      }
      ownerText += '...';
    }
    pdf.text(ownerText, xPos, yPos + 5);
    xPos += colWidths[1];

    // Start date
    pdf.text(format(new Date(task.start_date), 'MMM d'), xPos, yPos + 5);
    xPos += colWidths[2];

    // End date
    if (isOverdue) {
      pdf.setTextColor(...DANGER_COLOR);
    } else {
      pdf.setTextColor(...GRAY_TEXT);
    }
    pdf.text(format(new Date(task.end_date), 'MMM d'), xPos, yPos + 5);
    xPos += colWidths[3];

    // Status
    const statusColors: Record<string, [number, number, number]> = {
      completed: SUCCESS_COLOR,
      in_progress: PRIMARY_COLOR,
      not_started: GRAY_TEXT,
    };
    pdf.setTextColor(...(statusColors[task.status] || GRAY_TEXT));
    const statusText = task.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    pdf.text(statusText, xPos, yPos + 5);

    yPos += 7;
  });

  yPos += 10;

  // === GANTT CHART IMAGE (if provided) ===
  if (chartImageDataUrl) {
    // Check if we need a new page
    if (yPos > pageHeight - 80) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.setTextColor(...DARK_TEXT);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Gantt Chart', margin, yPos);
    yPos += 8;

    // Calculate image dimensions to fit
    const img = new Image();
    img.src = chartImageDataUrl;
    
    await new Promise<void>((resolve) => {
      img.onload = () => {
        const imgAspect = img.width / img.height;
        let imgWidth = contentWidth;
        let imgHeight = imgWidth / imgAspect;

        // If too tall, constrain by height
        const maxHeight = pageHeight - yPos - 30;
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight * imgAspect;
        }

        // Add border
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(margin, yPos, imgWidth, imgHeight);
        
        pdf.addImage(chartImageDataUrl, 'PNG', margin, yPos, imgWidth, imgHeight);
        resolve();
      };
      img.onerror = () => resolve();
    });
  }

  // === FOOTER ===
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    
    // Footer line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Footer text
    pdf.setTextColor(...GRAY_TEXT);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}`, margin, pageHeight - 10);
    
    // Page number
    const pageText = `Page ${i} of ${totalPages}`;
    const pageTextWidth = pdf.getTextWidth(pageText);
    pdf.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - 10);
  }

  // Save the PDF
  const sanitizedName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const fileDateStr = format(new Date(), 'yyyy-MM-dd');
  pdf.save(`${sanitizedName}-report-${fileDateStr}.pdf`);
}
