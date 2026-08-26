import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TopicConfig, GroupExperimentData } from '../types';

export async function exportReportToPDF(
  element: HTMLElement,
  topic: TopicConfig,
  groupData: GroupExperimentData
): Promise<void> {
  const cleanTitle = (topic?.title || '과학탐구보고서').replace(/[\\/:*?"<>|]/g, '_');
  const fileName = `과학탐구보고서_${groupData.grade}_${groupData.classNum}_${groupData.groupName}_${cleanTitle}.pdf`;

  // Capture element with full scroll dimensions and zero scroll offset
  const canvas = await html2canvas(element, {
    scale: 2, // high DPI
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth || 800,
    windowHeight: element.scrollHeight || 1000
  });

  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const margin = 10; // 10mm margins
  const contentWidth = pageWidth - (margin * 2);
  const contentHeight = (canvas.height * contentWidth) / canvas.width;

  const usablePageHeight = pageHeight - (margin * 2);

  if (contentHeight <= usablePageHeight) {
    pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
  } else {
    // Multi-page handling if content exceeds one A4 page
    let heightLeft = contentHeight;
    let position = margin;
    let page = 1;

    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
    heightLeft -= usablePageHeight;

    while (heightLeft > 0) {
      position = margin - (usablePageHeight * page);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
      heightLeft -= usablePageHeight;
      page++;
    }
  }

  pdf.save(fileName);
}

