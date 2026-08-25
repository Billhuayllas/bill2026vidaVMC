import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { cleanNotes, isReportAuxiliar } from './utils';

declare const html2pdf: any;

interface BulkCardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    groups: any[];
    masterPublishers: any[];
    globalMembers: any[];
    defaultServiceYear?: number;
    initialRoleFilter?: string;
    filteredPublisherNames?: string[];
}

export const BulkCardsModal: React.FC<BulkCardsModalProps> = ({
    isOpen,
    onClose,
    groups,
    masterPublishers,
    globalMembers,
    defaultServiceYear = new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear(),
    initialRoleFilter = 'todos',
    filteredPublisherNames
}) => {
    const [selectedGroupId, setSelectedGroupId] = useState<string>('todos');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>(
        filteredPublisherNames && filteredPublisherNames.length > 0 && initialRoleFilter !== 'todos'
            ? 'actual'
            : (initialRoleFilter || 'todos')
    );
    const [serviceYear, setServiceYear] = useState<number>(defaultServiceYear);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            if (filteredPublisherNames && filteredPublisherNames.length > 0 && initialRoleFilter !== 'todos') {
                setSelectedRoleFilter('actual');
            } else if (initialRoleFilter && initialRoleFilter !== 'todos') {
                setSelectedRoleFilter(initialRoleFilter);
            } else {
                setSelectedRoleFilter('todos');
            }
            if (defaultServiceYear) {
                setServiceYear(defaultServiceYear);
            }
        }
    }, [isOpen, initialRoleFilter, filteredPublisherNames, defaultServiceYear]);

    if (!isOpen) return null;

    const sanitizeAndFormatDate = (val: string | undefined): string => {
        if (!val) return '';
        const trimmed = val.trim();
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
        const ymd = trimmed.split('-');
        if (ymd.length === 3 && ymd[0].length === 4) {
            return `${ymd[2]}/${ymd[1]}/${ymd[0]}`;
        }
        const mdy = trimmed.split('/');
        if (mdy.length === 3 && mdy[2].length === 4) {
            const d = parseInt(mdy[1], 10);
            const m = parseInt(mdy[0], 10);
            if (m <= 12 && d <= 31) {
                return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${mdy[2]}`;
            }
        }
        return trimmed;
    };

    const months = [
        { key: '09', name: 'septiembre' },
        { key: '10', name: 'octubre' },
        { key: '11', name: 'noviembre' },
        { key: '12', name: 'diciembre' },
        { key: '01', name: 'enero' },
        { key: '02', name: 'febrero' },
        { key: '03', name: 'marzo' },
        { key: '04', name: 'abril' },
        { key: '05', name: 'mayo' },
        { key: '06', name: 'junio' },
        { key: '07', name: 'julio' },
        { key: '08', name: 'agosto' }
    ];

    const generateCardsHtml = (publishersList: any[], allReports: any[]): string => {
        const cardsHtml = publishersList.map(pub => {
            const memberRow = globalMembers.find(m => m.publicador_nombre.trim().toLowerCase() === pub.nombre.trim().toLowerCase());
            const role = (memberRow?.rol || 'Publicador').toLowerCase();

            const isElder = role.includes('anciano');
            const isMS = role.includes('siervo ministerial') || role.includes('siervo');
            const isRegularPioneer = role.includes('precursor regular');
            const isSpecialPioneer = role.includes('precursor especial');
            const isMissionary = role.includes('misionero');

            const isMale = pub.genero === 'Hombre' || (!pub.genero && (isElder || isMS));
            const isFemale = pub.genero === 'Mujer';
            const isAnointed = pub.esperanza === 'Ungido';
            const isOtherSheep = !isAnointed;

            const birthDate = sanitizeAndFormatDate(pub.fecha_nacimiento);
            const baptismDate = sanitizeAndFormatDate(pub.fecha_bautismo);

            // Filter reports for this publisher
            const pubReports = allReports.filter(r => 
                r.publicador_nombre && r.publicador_nombre.trim().toLowerCase() === pub.nombre.trim().toLowerCase()
            );

            let totalAnnualHours = 0;

            const monthRows = months.map(m => {
                const targetYm = m.key === '09' || m.key === '10' || m.key === '11' || m.key === '12'
                    ? `${serviceYear - 1}-${m.key}`
                    : `${serviceYear}-${m.key}`;

                const r = pubReports.find(report => report.mes && report.mes.trim() === targetYm);

                let participo = false;
                let studies = '';
                let hasAuxPrecursor = false;
                let hoursStr = '';
                let cleanNote = '';

                if (r) {
                    if (r.participo !== undefined) {
                        participo = r.participo;
                    } else if (r.notas) {
                        const matchPart = r.notas.match(/\{\{participo:(true|false)\}\}/);
                        if (matchPart) {
                            participo = matchPart[1] === 'true';
                        } else {
                            participo = true;
                        }
                    } else {
                        participo = true;
                    }

                    hasAuxPrecursor = isReportAuxiliar(r);

                    let rawNotes = r.notas || '';
                    let he = Number(r.horas_especiales) || 0;
                    const matchHe = rawNotes.match(/\{\{horas_especiales:(\d+)\}\}/);
                    if (matchHe) he = he || parseInt(matchHe[1], 10);
                    const matchHe2 = rawNotes.match(/\{\{he:(\d+)\}\}/);
                    if (matchHe2) he = he || parseInt(matchHe2[1], 10);

                    cleanNote = cleanNotes(rawNotes);

                    const h = (Number(r.horas) || 0) + he;
                    if (h > 0) {
                        hoursStr = String(h);
                        totalAnnualHours += h;
                    }

                    const s = Number(r.estudios) || 0;
                    if (s > 0) studies = String(s);
                }

                return `
                    <tr style="height: 25px;">
                        <td style="border: 1.5px solid #000; padding: 2px 6px; font-size: 9pt; font-weight: normal; text-transform: capitalize; color: #000;">
                            ${m.name}
                        </td>
                        <td style="border: 1.5px solid #000; padding: 1px; text-align: center;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border: 1.2px solid #000; background-color: #fff; font-size: 11px; font-weight: bold; line-height: 1;">
                                ${participo ? '✓' : ''}
                            </span>
                        </td>
                        <td style="border: 1.5px solid #000; padding: 1px; text-align: center; font-size: 9pt; font-weight: normal; color: #000;">
                            ${studies}
                        </td>
                        <td style="border: 1.5px solid #000; padding: 1px; text-align: center;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border: 1.2px solid #000; background-color: #fff; font-size: 11px; font-weight: bold; line-height: 1;">
                                ${hasAuxPrecursor ? '✓' : ''}
                            </span>
                        </td>
                        <td style="border: 1.5px solid #000; padding: 1px; text-align: center; font-size: 9pt; font-weight: normal; color: #000;">
                            ${hoursStr}
                        </td>
                        <td style="border: 1.5px solid #000; padding: 2px 6px; font-size: 8.5pt; color: #000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${cleanNote}
                        </td>
                    </tr>
                `;
            }).join('');

            return `
                <div class="s21-card-page" style="width: 100%; max-width: 780px; margin: 0 auto; background: #fff; color: #000; padding: 24px 28px; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; page-break-after: always; break-after: page;">
                    <!-- Title -->
                    <h1 style="text-align: center; font-size: 13.5pt; font-weight: bold; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.02em; color: #000; font-family: Arial, Helvetica, sans-serif;">
                        REGISTRO DE PUBLICADOR DE LA CONGREGACIÓN
                    </h1>

                    <!-- Header Details Grid -->
                    <div style="margin-bottom: 12px; font-size: 9.5pt; color: #000;">
                        <!-- Row 1: Nombre -->
                        <div style="display: flex; align-items: flex-end; margin-bottom: 6px;">
                            <span style="font-weight: bold; min-width: 70px;">Nombre:</span>
                            <span style="flex: 1; border-bottom: 1px solid #000; padding-left: 6px; padding-bottom: 1px; font-weight: bold; font-size: 10pt; color: #000;">${pub.nombre}</span>
                        </div>

                        <!-- Row 2: Fecha de nacimiento and Género -->
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                            <div style="display: flex; align-items: flex-end; flex: 1; max-width: 58%;">
                                <span style="font-weight: bold; min-width: 155px; white-space: nowrap;">Fecha de nacimiento:</span>
                                <span style="flex: 1; border-bottom: 1px solid #000; padding-left: 6px; padding-bottom: 1px; font-weight: normal;">${birthDate}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 20px; min-width: 220px; justify-content: flex-start; padding-left: 24px;">
                                <label style="display: flex; align-items: center; gap: 6px;">
                                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border: 1.2px solid #000; background-color: #fff; font-size: 11px; font-weight: bold; line-height: 1;">${isMale ? '✓' : ''}</span>
                                    <span style="font-weight: normal;">Hombre</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 6px;">
                                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border: 1.2px solid #000; background-color: #fff; font-size: 11px; font-weight: bold; line-height: 1;">${isFemale ? '✓' : ''}</span>
                                    <span style="font-weight: normal;">Mujer</span>
                                </label>
                            </div>
                        </div>

                        <!-- Row 3: Fecha de bautismo and Esperanza -->
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <div style="display: flex; align-items: flex-end; flex: 1; max-width: 58%;">
                                <span style="font-weight: bold; min-width: 155px; white-space: nowrap;">Fecha de bautismo:</span>
                                <span style="flex: 1; border-bottom: 1px solid #000; padding-left: 6px; padding-bottom: 1px; font-weight: normal;">${baptismDate}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 20px; min-width: 220px; justify-content: flex-start; padding-left: 24px;">
                                <label style="display: flex; align-items: center; gap: 6px;">
                                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border: 1.2px solid #000; background-color: #fff; font-size: 11px; font-weight: bold; line-height: 1;">${isOtherSheep ? '✓' : ''}</span>
                                    <span style="font-weight: normal;">Otras ovejas</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 6px;">
                                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border: 1.2px solid #000; background-color: #fff; font-size: 11px; font-weight: bold; line-height: 1;">${isAnointed ? '✓' : ''}</span>
                                    <span style="font-weight: normal;">Ungido</span>
                                </label>
                            </div>
                        </div>

                        <!-- Row 4: Privileges Row -->
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-top: 6px; margin-bottom: 8px; font-size: 8.8pt;">
                            <label style="display: flex; align-items: center; gap: 6px;">
                                <span style="display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border: 1.2px solid #000; background-color: #fff; font-size: 11px; font-weight: bold; line-height: 1;">${isElder ? '✓' : ''}</span>
                                <span style="font-weight: normal;">Anciano</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px;">
                                <span style="display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border: 1.2px solid #000; background-color: #fff; font-size: 11px; font-weight: bold; line-height: 1;">${isMS ? '✓' : ''}</span>
                                <span style="font-weight: normal;">Siervo ministerial</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px;">
                                <span style="display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border: 1.2px solid #000; background-color: #fff; font-size: 11px; font-weight: bold; line-height: 1;">${isRegularPioneer ? '✓' : ''}</span>
                                <span style="font-weight: normal;">Precursor regular</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px;">
                                <span style="display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border: 1.2px solid #000; background-color: #fff; font-size: 11px; font-weight: bold; line-height: 1;">${isSpecialPioneer ? '✓' : ''}</span>
                                <span style="font-weight: normal;">Precursor especial</span>
                            </label>
                            <label style="display: flex; align-items: flex-start; gap: 6px; line-height: 1.15;">
                                <span style="display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border: 1.2px solid #000; background-color: #fff; font-size: 11px; font-weight: bold; line-height: 1; margin-top: 1px;">${isMissionary ? '✓' : ''}</span>
                                <span style="font-weight: normal;">Misionero que sirve<br />en el campo</span>
                            </label>
                        </div>
                    </div>

                    <!-- Annual Service Table -->
                    <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; table-layout: fixed; font-family: Arial, Helvetica, sans-serif;">
                        <thead>
                            <tr style="background-color: #ffffff; height: 42px;">
                                <th style="border: 1.5px solid #000; padding: 4px 6px; width: 16%; text-align: left; font-weight: bold; font-size: 8.5pt; color: #000;">
                                    Año de servicio
                                </th>
                                <th style="border: 1.5px solid #000; padding: 4px 2px; width: 18%; text-align: center; font-weight: bold; font-size: 8pt; color: #000; line-height: 1.15;">
                                    Participación<br />en el<br />ministerio
                                </th>
                                <th style="border: 1.5px solid #000; padding: 4px 2px; width: 12%; text-align: center; font-weight: bold; font-size: 8pt; color: #000; line-height: 1.15;">
                                    Cursos<br />bíblicos
                                </th>
                                <th style="border: 1.5px solid #000; padding: 4px 2px; width: 13%; text-align: center; font-weight: bold; font-size: 8pt; color: #000; line-height: 1.15;">
                                    Precursor<br />auxiliar
                                </th>
                                <th style="border: 1.5px solid #000; padding: 4px 2px; width: 17%; text-align: center; font-weight: bold; font-size: 8pt; color: #000; line-height: 1.15;">
                                    Horas<br />
                                    <span style="font-size: 6.5pt; font-weight: normal; display: block; line-height: 1.05;">(Si es precursor o<br />misionero que<br />sirve en el campo)</span>
                                </th>
                                <th style="border: 1.5px solid #000; padding: 4px 6px; width: 24%; text-align: center; font-weight: bold; font-size: 8pt; color: #000;">
                                    Notas
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${monthRows}
                        </tbody>
                        <tfoot>
                            <tr style="height: 27px;">
                                <td colspan="4" style="border: 1.5px solid #000; padding: 3px 8px; text-align: right; font-weight: bold; font-size: 9pt; color: #000;">
                                    Total
                                </td>
                                <td style="border: 1.5px solid #000; padding: 2px; text-align: center; font-weight: bold; font-size: 9.5pt; color: #000;">
                                    ${totalAnnualHours > 0 ? totalAnnualHours : ''}
                                </td>
                                <td style="border: 1.5px solid #000; padding: 2px;"></td>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- Form Code Footer -->
                    <div style="margin-top: 8px; font-size: 7.5pt; color: #000; font-family: Arial, Helvetica, sans-serif;">
                        S-21-S 11/23
                    </div>
                </div>
            `;
        }).join('');

        return cardsHtml;
    };

    const getFilteredPublishers = () => {
        return masterPublishers
            .filter(p => p.clasificacion_vmt !== 'estudiante_vmt')
            .filter(p => {
                // Group filter
                if (selectedGroupId && selectedGroupId !== 'todos') {
                    const memberRow = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
                    if (!memberRow || String(memberRow.grupo_id) !== String(selectedGroupId)) {
                        return false;
                    }
                }

                // Role / Current selection filter
                if (selectedRoleFilter === 'actual' && filteredPublisherNames && filteredPublisherNames.length > 0) {
                    return filteredPublisherNames.some(name => name.trim().toLowerCase() === p.nombre.trim().toLowerCase());
                }

                if (selectedRoleFilter && selectedRoleFilter !== 'todos' && selectedRoleFilter !== 'actual') {
                    const memberRow = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
                    const role = (memberRow?.rol || p.rol || 'Publicador').toLowerCase();

                    if (selectedRoleFilter === 'anciano') return role.includes('anciano');
                    if (selectedRoleFilter === 'siervo') return role.includes('siervo ministerial') || role.includes('siervo');
                    if (selectedRoleFilter === 'precursor regular') return role.includes('precursor regular');
                    if (selectedRoleFilter === 'precursor especial') return role.includes('precursor especial');
                    if (selectedRoleFilter === 'inactivo') return role.includes('inactivo');
                }

                return true;
            });
    };

    const handleGeneratePdf = async () => {
        setIsGenerating(true);
        setStatusMessage('Cargando registros de informes...');

        try {
            // Filter publishers
            const activePublishers = getFilteredPublishers();

            if (activePublishers.length === 0) {
                alert('No se encontraron publicadores para los filtros seleccionados.');
                setIsGenerating(false);
                return;
            }

            setStatusMessage(`Obteniendo datos de ${activePublishers.length} publicadores...`);

            // Fetch reports for the service year range: (serviceYear - 1)-09 to serviceYear-08
            const startMonth = `${serviceYear - 1}-09`;
            const endMonth = `${serviceYear}-08`;

            const { data: reportsData, error } = await supabase
                .from('informes_ministerio')
                .select('*')
                .gte('mes', startMonth)
                .lte('mes', endMonth);

            if (error) {
                console.error("Error fetching reports in bulk:", error);
                alert("Error al cargar los informes.");
                setIsGenerating(false);
                return;
            }

            setStatusMessage('Construyendo documento PDF oficial S-21...');

            const cardsHtml = generateCardsHtml(activePublishers, reportsData || []);

            const printStyles = `
                @page {
                    size: portrait;
                    margin: 10mm 12mm;
                }
                body {
                    margin: 0;
                    padding: 0;
                    background: #fff;
                    color: #000;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .s21-card-page {
                    page-break-after: always;
                    break-after: page;
                    page-break-inside: avoid;
                    break-inside: avoid;
                    margin-bottom: 20px;
                }
                .s21-card-page:last-child {
                    page-break-after: auto;
                    break-after: auto;
                }
            `;

            // If html2pdf is available, use it for direct file download
            if (typeof html2pdf !== 'undefined') {
                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.style.top = '0';
                container.style.width = '794px';
                container.style.backgroundColor = '#ffffff';

                const styleEl = document.createElement('style');
                styleEl.innerHTML = printStyles;
                container.appendChild(styleEl);

                const contentWrapper = document.createElement('div');
                contentWrapper.innerHTML = cardsHtml;
                container.appendChild(contentWrapper);
                document.body.appendChild(container);

                const groupName = selectedGroupId === 'todos' 
                    ? 'Todos' 
                    : (groups.find(g => String(g.id) === String(selectedGroupId))?.nombre?.replace(/\s+/g, '_') || 'Grupo');

                let filterSlug = 'General';
                if (selectedRoleFilter === 'actual') filterSlug = 'Filtrados';
                else if (selectedRoleFilter === 'precursor regular') filterSlug = 'Precursores_Regulares';
                else if (selectedRoleFilter === 'precursor especial') filterSlug = 'Precursores_Especiales';
                else if (selectedRoleFilter === 'anciano') filterSlug = 'Ancianos';
                else if (selectedRoleFilter === 'siervo') filterSlug = 'Siervos';
                else if (selectedRoleFilter === 'inactivo') filterSlug = 'Inactivos';

                const opt = {
                    margin: [10, 10, 10, 10],
                    filename: `Tarjetas_S21_${filterSlug}_${groupName}_${serviceYear}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['css', 'legacy'] }
                };

                await html2pdf().from(container).set(opt).save();
                document.body.removeChild(container);
            } else {
                // Fallback to print window
                const printWin = window.open('', '_blank');
                if (printWin) {
                    printWin.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Tarjetas S-21 - ${serviceYear}</title>
                            <style>${printStyles}</style>
                        </head>
                        <body>
                            ${cardsHtml}
                        </body>
                        </html>
                    `);
                    printWin.document.close();
                    printWin.focus();
                    setTimeout(() => {
                        printWin.print();
                    }, 500);
                }
            }

            setStatusMessage('¡Descarga completada con éxito!');
            setTimeout(() => {
                setIsGenerating(false);
                setStatusMessage('');
                onClose();
            }, 1200);

        } catch (err) {
            console.error("Error in bulk card generation:", err);
            alert("Ocurrió un error al generar las tarjetas en lote.");
            setIsGenerating(false);
            setStatusMessage('');
        }
    };

    const handlePrintDirect = async () => {
        setIsGenerating(true);
        setStatusMessage('Preparando vista de impresión...');

        try {
            const activePublishers = getFilteredPublishers();

            if (activePublishers.length === 0) {
                alert('No se encontraron publicadores para los filtros seleccionados.');
                setIsGenerating(false);
                return;
            }

            const startMonth = `${serviceYear - 1}-09`;
            const endMonth = `${serviceYear}-08`;

            const { data: reportsData } = await supabase
                .from('informes_ministerio')
                .select('*')
                .gte('mes', startMonth)
                .lte('mes', endMonth);

            const cardsHtml = generateCardsHtml(activePublishers, reportsData || []);

            const printWin = window.open('', '_blank');
            if (printWin) {
                printWin.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Tarjetas S-21 - ${serviceYear}</title>
                        <style>
                            @page {
                                size: portrait;
                                margin: 10mm 12mm;
                            }
                            body {
                                margin: 0;
                                padding: 0;
                                background: #fff;
                                color: #000;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            .s21-card-page {
                                page-break-after: always;
                                break-after: page;
                                page-break-inside: avoid;
                                break-inside: avoid;
                                margin-bottom: 20px;
                            }
                            .s21-card-page:last-child {
                                page-break-after: auto;
                                break-after: auto;
                            }
                        </style>
                    </head>
                    <body>
                        ${cardsHtml}
                    </body>
                    </html>
                `);
                printWin.document.close();
                printWin.focus();
                setTimeout(() => {
                    printWin.print();
                    setIsGenerating(false);
                    setStatusMessage('');
                }, 500);
            } else {
                setIsGenerating(false);
                setStatusMessage('');
            }
        } catch (e) {
            console.error("Error direct print:", e);
            setIsGenerating(false);
            setStatusMessage('');
        }
    };

    const activeFilteredList = getFilteredPublishers();
    const activeCount = activeFilteredList.length;

    // Counts for options
    const nonStudents = masterPublishers.filter(p => p.clasificacion_vmt !== 'estudiante_vmt');
    const regularCount = nonStudents.filter(p => {
        const m = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
        return (m?.rol || p.rol || '').toLowerCase().includes('precursor regular');
    }).length;
    const elderCount = nonStudents.filter(p => {
        const m = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
        return (m?.rol || p.rol || '').toLowerCase().includes('anciano');
    }).length;
    const msCount = nonStudents.filter(p => {
        const m = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
        const r = (m?.rol || p.rol || '').toLowerCase();
        return r.includes('siervo ministerial') || r.includes('siervo');
    }).length;
    const specialCount = nonStudents.filter(p => {
        const m = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
        return (m?.rol || p.rol || '').toLowerCase().includes('precursor especial');
    }).length;
    const inactiveCount = nonStudents.filter(p => {
        const m = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
        return (m?.rol || p.rol || '').toLowerCase().includes('inactivo');
    }).length;

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-lg text-white">Descarga Masiva de Tarjetas S-21</h3>
                            <p className="text-xs text-slate-300">Formato oficial S-21-S (11/23) limpio</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-800 flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <strong className="block font-bold mb-0.5">Exportación fiel y sin elementos adicionales:</strong>
                            Genera las tarjetas oficiales S-21 con el desglose anual del registro de publicador, listas para archivar o imprimir.
                        </div>
                    </div>

                    {/* Filter by Role / Active Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">
                            Filtro por Nombramiento / Padrón
                        </label>
                        <select
                            value={selectedRoleFilter}
                            onChange={(e) => setSelectedRoleFilter(e.target.value)}
                            disabled={isGenerating}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            {filteredPublisherNames && filteredPublisherNames.length > 0 && (
                                <option value="actual">
                                    📋 Selección actual en pantalla ({filteredPublisherNames.length} publicadores)
                                </option>
                            )}
                            <option value="todos">👥 Todos los Publicadores ({nonStudents.length})</option>
                            <option value="precursor regular">🏃 Solo Precursores Regulares ({regularCount})</option>
                            <option value="anciano">👔 Solo Ancianos ({elderCount})</option>
                            <option value="siervo">🤝 Solo Siervos Ministeriales ({msCount})</option>
                            <option value="precursor especial">🎖️ Solo Precursores Especiales ({specialCount})</option>
                            <option value="inactivo">⛔ Solo Inactivos ({inactiveCount})</option>
                        </select>
                    </div>

                    {/* Filter by Group */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">
                            Grupo de Servicio
                        </label>
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            disabled={isGenerating}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            <option value="todos">Todos los Grupos</option>
                            {groups.map(g => {
                                const countInGroup = globalMembers.filter(m => String(m.grupo_id) === String(g.id)).length;
                                return (
                                    <option key={g.id} value={g.id}>
                                        {g.nombre} ({countInGroup} publicadores)
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Service Year */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">
                            Año de Servicio
                        </label>
                        <select
                            value={serviceYear}
                            onChange={(e) => setServiceYear(parseInt(e.target.value, 10))}
                            disabled={isGenerating}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            {Array.from({ length: 5 }, (_, i) => defaultServiceYear - 2 + i).map(y => (
                                <option key={y} value={y}>Año de Servicio {y} (Sep {y - 1} - Ago {y})</option>
                            ))}
                        </select>
                    </div>

                    {/* Summary badge */}
                    <div className="flex items-center justify-between p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <i className="fas fa-id-card text-indigo-600"></i>
                            <span className="uppercase">Tarjetas a generar:</span>
                        </div>
                        <span className="text-sm font-extrabold text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-200 shadow-sm">
                            {activeCount} {activeCount === 1 ? 'Tarjeta S-21' : 'Tarjetas S-21'}
                        </span>
                    </div>

                    {statusMessage && (
                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                            <div className="flex items-center justify-center gap-2 text-indigo-700 font-bold text-xs">
                                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <span>{statusMessage}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isGenerating}
                        className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-200/60 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handlePrintDirect}
                        disabled={isGenerating}
                        className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Imprimir Todas</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleGeneratePdf}
                        disabled={isGenerating}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-indigo-200 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Descargar PDF Masivo</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
