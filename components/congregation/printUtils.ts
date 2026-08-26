/**
 * Universal print and PDF utilities to guarantee reliable document rendering,
 * avoid blank print previews, and bypass browser popup/iframe restrictions.
 */

declare const html2pdf: any;

export const printHtmlDocument = (htmlContent: string, title: string = 'Documento'): void => {
    // Create an invisible iframe for isolated printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!frameDoc) {
        window.print();
        return;
    }

    frameDoc.open();
    frameDoc.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 8mm 8mm 8mm 8mm;
                }
                * {
                    box-sizing: border-box;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                html, body {
                    margin: 0;
                    padding: 0;
                    background: #ffffff !important;
                    color: #000000 !important;
                    font-family: Arial, Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }
                .s21-card-page {
                    page-break-after: always;
                    break-after: page;
                    page-break-inside: avoid;
                    break-inside: avoid;
                    margin: 0 auto;
                    background: #ffffff;
                }
                .s21-card-page:last-child {
                    page-break-after: auto;
                    break-after: auto;
                }
                table {
                    border-collapse: collapse;
                }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `);
    frameDoc.close();

    // Give browser time to parse styles and DOM tree
    setTimeout(() => {
        try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        } catch (e) {
            console.error("Print iframe error, fallback to window.print:", e);
            window.print();
        } finally {
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 4000);
        }
    }, 450);
};

export const downloadHtmlAsPdf = async (
    htmlContent: string, 
    fileName: string,
    onProgress?: (msg: string) => void
): Promise<void> => {
    if (onProgress) onProgress('Preparando renderizado...');

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#000000';
    container.style.zIndex = '99999';
    container.style.opacity = '1';
    container.style.pointerEvents = 'none';

    const printStyles = `
        @page {
            size: A4 portrait;
            margin: 8mm 8mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            font-family: Arial, Helvetica, sans-serif;
        }
        .s21-card-page {
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .s21-card-page:last-child {
            page-break-after: auto;
            break-after: auto;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.innerHTML = printStyles;
    container.appendChild(styleEl);

    const contentWrapper = document.createElement('div');
    contentWrapper.innerHTML = htmlContent;
    container.appendChild(contentWrapper);
    document.body.appendChild(container);

    try {
        if (onProgress) onProgress('Generando páginas PDF de alta resolución...');
        await new Promise(resolve => setTimeout(resolve, 200));

        const opt = {
            margin: [8, 8, 8, 8],
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                logging: false, 
                backgroundColor: '#ffffff',
                windowWidth: 794,
                scrollY: 0,
                scrollX: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        const pdfFn = (html2pdf as any) || (window as any).html2pdf;
        if (typeof pdfFn === 'function') {
            await pdfFn().set(opt).from(container).save();
        } else {
            const mod = await import('html2pdf.js');
            const h2p = (mod as any).default || mod;
            await h2p().set(opt).from(container).save();
        }
    } finally {
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
};
