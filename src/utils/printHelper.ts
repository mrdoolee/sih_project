/**
 * Utility for reliable, iframe-safe document printing and standalone print rendering.
 * Works seamlessly inside AI Studio preview iframe, sandboxed web views, and standard browsers.
 */

export interface PrintOptions {
  title?: string;
  pageOrientation?: 'portrait' | 'landscape';
  margin?: string;
}

export function printElement(
  target: HTMLElement | string,
  options: PrintOptions = {}
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const element = typeof target === 'string' ? document.getElementById(target) : target;
      if (!element) {
        console.warn(`Print target not found: ${target}`);
        window.print();
        reject(new Error(`Print target not found: ${target}`));
        return;
      }

      const title = options.title || '인쇄 미리보기';
      const orientation = options.pageOrientation || 'portrait';
      const margin = options.margin || '10mm';

      // Gather existing style tags and link stylesheets
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((node) => node.outerHTML)
        .join('\n');

      // Create an invisible iframe for isolated printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.setAttribute('aria-hidden', 'true');
      iframe.setAttribute('title', 'print-frame');

      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc || !iframe.contentWindow) {
        // Fallback to window.print
        window.print();
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        reject(new Error('Print iframe document unavailable'));
        return;
      }

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${title}</title>
          ${styles}
          <style>
            @page {
              size: A4 ${orientation};
              margin: ${margin};
            }
            *, *::before, *::after {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
          </style>
        </head>
        <body class="bg-white text-slate-900 p-2 sm:p-4">
          <div class="print-container"${element.id ? ` id="${element.id}"` : ''}>
            ${element.innerHTML}
          </div>
        </body>
        </html>
      `);
      frameDoc.close();

      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (err) {
          console.warn('Iframe print failed, falling back to top window.print:', err);
          window.print();
          reject(err instanceof Error ? err : new Error('Iframe print failed'));
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }
      };

      // Wait for stylesheets and resources to be parsed
      setTimeout(triggerPrint, 350);
    } catch (error) {
      console.error('Error initiating print:', error);
      window.print();
      reject(error instanceof Error ? error : new Error('Error initiating print'));
    }
  });
}

/**
 * Fallback to open in a dedicated popup window and auto-print
 */
export function openPrintWindow(target: HTMLElement | string, title: string = '인쇄'): void {
  const element = typeof target === 'string' ? document.getElementById(target) : target;
  if (!element) {
    window.print();
    return;
  }

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n');

  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    // Popup was blocked by browser, use iframe print
    printElement(element, { title });
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      ${styles}
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        body {
          background: #fff;
          color: #000;
          padding: 10mm;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .no-print { display: none !important; }
        .page-break { page-break-after: always; break-after: page; }
      </style>
    </head>
    <body>
      <div${element.id ? ` id="${element.id}"` : ''}>${element.innerHTML}</div>
      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.focus();
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
