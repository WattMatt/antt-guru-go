import { useCallback, RefObject } from 'react';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { exportProfessionalPdf } from '@/lib/pdfExport';
import { Task, Milestone } from '@/types/gantt';

type ExportFormat = 'png' | 'jpeg' | 'svg' | 'pdf';

interface UseChartExportOptions {
  chartRef: RefObject<HTMLDivElement>;
  projectName: string;
  tasks: Task[];
  milestones: Milestone[];
}

export function useChartExport({ chartRef, projectName, tasks, milestones }: UseChartExportOptions) {
  const getFileName = useCallback((extension: string) => {
    const sanitizedName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    return `${sanitizedName}-gantt-${dateStr}.${extension}`;
  }, [projectName]);

  const exportAsImage = useCallback(async (format: 'png' | 'jpeg' | 'svg') => {
    if (!chartRef.current) {
      toast.error('Chart not found');
      return;
    }

    try {
      toast.loading('Generating image...', { id: 'export' });
      
      const exportFn = format === 'png' ? toPng : format === 'jpeg' ? toJpeg : toSvg;
      const dataUrl = await exportFn(chartRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = getFileName(format);
      link.href = dataUrl;
      link.click();

      toast.success('Image downloaded!', { id: 'export' });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export image', { id: 'export' });
    }
  }, [chartRef, getFileName]);

  const exportAsPdf = useCallback(async () => {
    try {
      toast.loading('Generating PDF report...', { id: 'export' });

      // Generate chart image if available
      let chartImageDataUrl: string | undefined;
      if (chartRef.current) {
        try {
          chartImageDataUrl = await toPng(chartRef.current, {
            quality: 0.95,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            cacheBust: true,
          });
        } catch {
          console.warn('Could not capture chart image for PDF');
        }
      }

      await exportProfessionalPdf({
        projectName,
        tasks,
        milestones,
        chartImageDataUrl,
      });

      toast.success('PDF report downloaded!', { id: 'export' });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to export PDF', { id: 'export' });
    }
  }, [chartRef, projectName, tasks, milestones]);

  const exportChart = useCallback(async (format: ExportFormat) => {
    if (format === 'pdf') {
      await exportAsPdf();
    } else {
      await exportAsImage(format);
    }
  }, [exportAsPdf, exportAsImage]);

  return {
    exportChart,
    exportAsPng: () => exportAsImage('png'),
    exportAsJpeg: () => exportAsImage('jpeg'),
    exportAsSvg: () => exportAsImage('svg'),
    exportAsPdf,
  };
}
