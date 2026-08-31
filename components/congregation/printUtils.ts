import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Universal print and PDF utilities to guarantee reliable document rendering,
 * avoid blank print previews, and bypass browser popup/iframe restrictions.
 */

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
                    size: 210mm 297mm portrait;
                    margin: 0;
                }
                @media print {
                    html, body {
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    .s21-card-page {
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .s21-card-page:last-child {
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }
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
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }
                .s21-card-page {
                    width: 210mm;
                    height: 297mm;
                    box-sizing: border-box;
                    page-break-after: always;
                    break-after: page;
                    page-break-inside: avoid;
                    break-inside: avoid;
                    margin: 0 auto;
                    background: #ffffff;
                    overflow: hidden;
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

/**
 * Genera y descarga el archivo PDF de alta resolución usando jsPDF y html2canvas.
 * Garantiza que ninguna página salga en blanco y captura exactamente las dimensiones A4.
 */
export const downloadHtmlAsPdf = async (
    htmlContent: string, 
    fileName: string,
    onProgress?: (msg: string) => void
): Promise<void> => {
    if (onProgress) onProgress('Preparando páginas para renderizado...');

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    // Contenedor temporal aislado montado en el DOM con visibilidad controlada
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.minHeight = '1123px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#000000';
    container.style.zIndex = '-99999';
    container.style.opacity = '1';
    container.style.pointerEvents = 'none';

    const printStyles = `
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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .s21-card-page {
            width: 794px;
            height: 1123px;
            max-height: 1123px;
            background: #ffffff;
            color: #000000;
            box-sizing: border-box;
            overflow: hidden;
            margin: 0 auto;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.innerHTML = printStyles;
    container.appendChild(styleEl);

    const tempWrapper = document.createElement('div');
    tempWrapper.innerHTML = htmlContent;
    
    // Obtenemos las páginas individuales (ya sea .s21-card-page o contenedores de página)
    let pageElements = Array.from(tempWrapper.querySelectorAll('.s21-card-page')) as HTMLElement[];
    if (pageElements.length === 0) {
        // Fallback si no hay clase .s21-card-page
        pageElements = Array.from(tempWrapper.children) as HTMLElement[];
    }

    if (pageElements.length === 0) {
        // Si es un solo bloque de HTML
        pageElements = [tempWrapper];
    }

    document.body.appendChild(container);

    try {
        const totalPages = pageElements.length;

        for (let i = 0; i < totalPages; i++) {
            if (onProgress) onProgress(`Generando página ${i + 1} de ${totalPages}...`);

            // Limpiamos y agregamos solo la página actual
            const currentPg = pageElements[i].cloneNode(true) as HTMLElement;
            currentPg.style.width = '794px';
            currentPg.style.height = '1123px';
            currentPg.style.maxHeight = '1123px';
            currentPg.style.backgroundColor = '#ffffff';
            currentPg.style.overflow = 'hidden';

            // Removemos hijos anteriores
            while (container.childNodes.length > 1) {
                container.removeChild(container.lastChild!);
            }
            container.appendChild(currentPg);

            // Breve espera para que el motor renderice estilos y fuentes con nitidez
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(currentPg, {
                scale: 2.5,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 794,
                height: 1123,
                windowWidth: 794,
                windowHeight: 1123
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.98);

            if (i > 0) {
                doc.addPage('a4', 'portrait');
            }

            // Mantenemos la proporción A4 exacta (210mm x 297mm) sin estirar ni deformar
            doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        }

        if (onProgress) onProgress('Finalizando y guardando PDF...');
        doc.save(fileName);
    } finally {
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
};
