import { useCallback, RefObject } from 'react';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { toast } from 'sonner';

type ExportFormat = 'png' | 'jpeg' | 'svg' | 'pdf';

interface UseChartExportOptions {
  chartRef: RefObject<HTMLDivElement>;
  projectName: string;
}

export function useChartExport({ chartRef, projectName }: UseChartExportOptions) {
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
    if (!chartRef.current) {
      toast.error('Chart not found');
      return;
    }

    try {
      toast.loading('Generating PDF...', { id: 'export' });

      const dataUrl = await toPng(chartRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const img = new Image();
      img.src = dataUrl;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Calculate dimensions maintaining aspect ratio
      const imgWidth = img.width;
      const imgHeight = img.height;
      
      // Use landscape for wide charts
      const isLandscape = imgWidth > imgHeight;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth / 2, imgHeight / 2],
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);
      pdf.save(getFileName('pdf'));

      toast.success('PDF downloaded!', { id: 'export' });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to export PDF', { id: 'export' });
    }
  }, [chartRef, getFileName]);

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
