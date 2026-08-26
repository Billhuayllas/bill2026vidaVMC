import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchAllRows } from '../../lib/supabasePagination';
import { cleanNotes, isReportAuxiliar } from './utils';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { printHtmlDocument, downloadHtmlAsPdf } from './printUtils';
import { Eye, Printer, Download, FileText, Loader2, X } from 'lucide-react';


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
        filteredPublisherNames && filteredPublisherNames.length > 0
            ? 'actual'
            : (initialRoleFilter || 'todos')
    );
    const [serviceYear, setServiceYear] = useState<number>(defaultServiceYear);
    const [cardsPerPage, setCardsPerPage] = useState<'2' | '1'>('2');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [previewModalData, setPreviewModalData] = useState<{
        isOpen: boolean;
        pages: string[];
        title: string;
        fileName: string;
        layoutLabel: string;
    } | null>(null);


    useEffect(() => {
        if (isOpen) {
            if (filteredPublisherNames && filteredPublisherNames.length > 0) {
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

    const convertToYm = (val: string | undefined): string => {
        if (!val) return '';
        const cleanStr = val.trim().toLowerCase();
        if (!cleanStr) return '';
        if (/^\d{4}-\d{2}$/.test(cleanStr)) return cleanStr;
        const parts = cleanStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}`;
        const dma = cleanStr.split('/');
        if (dma.length === 3 && dma[2].length === 4) return `${dma[2]}-${dma[1].padStart(2, '0')}`;
        if (dma.length === 2 && dma[1].length === 4) return `${dma[1]}-${dma[0].padStart(2, '0')}`;
        return '';
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

    const generateSingleCardHtml = (pub: any, allReports: any[], isTwoInOne = true): string => {
        const memberRow = globalMembers.find(m => m.publicador_nombre.trim().toLowerCase() === pub.nombre.trim().toLowerCase());
        const role = (memberRow?.rol || 'Publicador').toLowerCase();

        const isElder = role.includes('anciano');
        const isMS = role.includes('siervo ministerial') || role.includes('siervo');
        const isRegularPioneer = role.includes('precursor regular');
        const isSpecialPioneer = role.includes('precursor especial');
        const isMissionary = role.includes('misionero');
        const isPioneerRole = isRegularPioneer || isSpecialPioneer || isMissionary;
        const startPioneerYm = pub.inicio_precursor_mes ? convertToYm(pub.inicio_precursor_mes) : '';

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

            const isPioneerInThisMonth = isPioneerRole && (!startPioneerYm || targetYm >= startPioneerYm);
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
                if ((isPioneerInThisMonth || hasAuxPrecursor) && h > 0) {
                    hoursStr = String(h);
                    totalAnnualHours += h;
                }

                const s = Number(r.estudios) || 0;
                if (s > 0) studies = String(s);
            }

            const rowHeight = isTwoInOne ? '15.5px' : '24px';
            const tdFontSize = isTwoInOne ? '7pt' : '9pt';
            const noteFontSize = isTwoInOne ? '6.5pt' : '8.5pt';
            const checkSize = isTwoInOne ? '10px' : '13px';
            const checkFont = isTwoInOne ? '8px' : '11px';

            return `
                <tr style="height: ${rowHeight};">
                    <td style="border: 1.2px solid #000; padding: 0px 4px; font-size: ${tdFontSize}; font-weight: normal; text-transform: capitalize; color: #000;">
                        ${m.name}
                    </td>
                    <td style="border: 1.2px solid #000; padding: 0px; text-align: center;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1.2px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">
                            ${participo ? '✓' : ''}
                        </span>
                    </td>
                    <td style="border: 1.2px solid #000; padding: 0px; text-align: center; font-size: ${tdFontSize}; font-weight: normal; color: #000;">
                        ${studies}
                    </td>
                    <td style="border: 1.2px solid #000; padding: 0px; text-align: center;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1.2px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">
                            ${hasAuxPrecursor ? '✓' : ''}
                        </span>
                    </td>
                    <td style="border: 1.2px solid #000; padding: 0px; text-align: center; font-size: ${tdFontSize}; font-weight: normal; color: #000;">
                        ${hoursStr}
                    </td>
                    <td style="border: 1.2px solid #000; padding: 0px 4px; font-size: ${noteFontSize}; color: #000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${cleanNote}
                    </td>
                </tr>
            `;
        }).join('');

        const titleSize = isTwoInOne ? '9.5pt' : '13.5pt';
        const titleMargin = isTwoInOne ? '0 0 4px 0' : '0 0 16px 0';
        const headerGridMargin = isTwoInOne ? '0 0 4px 0' : '0 0 12px 0';
        const headerFontSize = isTwoInOne ? '7.5pt' : '9.5pt';
        const nameFontSize = isTwoInOne ? '8.5pt' : '10pt';
        const privFontSize = isTwoInOne ? '7pt' : '8.8pt';
        const checkSize = isTwoInOne ? '10px' : '13px';
        const checkFont = isTwoInOne ? '8px' : '11px';
        const thHeadHeight = isTwoInOne ? '24px' : '42px';
        const thFontSize = isTwoInOne ? '6.5pt' : '8pt';
        const thSubFontSize = isTwoInOne ? '5.5pt' : '6.5pt';
        const footerHeight = isTwoInOne ? '18px' : '27px';

        return `
            <div style="width: 100%; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff;">
                <!-- Title -->
                <h1 style="text-align: center; font-size: ${titleSize}; font-weight: bold; margin: ${titleMargin}; text-transform: uppercase; letter-spacing: 0.02em; color: #000; font-family: Arial, Helvetica, sans-serif;">
                    REGISTRO DE PUBLICADOR DE LA CONGREGACIÓN
                </h1>

                <!-- Header Details Grid -->
                <div style="margin: ${headerGridMargin}; font-size: ${headerFontSize}; color: #000;">
                    <!-- Row 1: Nombre -->
                    <div style="display: flex; align-items: flex-end; margin-bottom: ${isTwoInOne ? '2px' : '4px'};">
                        <span style="font-weight: bold; min-width: 65px;">Nombre:</span>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding-left: 6px; padding-bottom: 1px; font-weight: bold; font-size: ${nameFontSize}; color: #000;">${pub.nombre}</span>
                    </div>

                    <!-- Row 2: Fecha de nacimiento and Género -->
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${isTwoInOne ? '2px' : '4px'};">
                        <div style="display: flex; align-items: flex-end; flex: 1; max-width: 58%;">
                            <span style="font-weight: bold; min-width: 130px; white-space: nowrap;">Fecha de nacimiento:</span>
                            <span style="flex: 1; border-bottom: 1px solid #000; padding-left: 6px; padding-bottom: 1px; font-weight: normal;">${birthDate}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 14px; min-width: 180px; justify-content: flex-start; padding-left: 12px;">
                            <label style="display: flex; align-items: center; gap: 4px;">
                                <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1.2px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isMale ? '✓' : ''}</span>
                                <span style="font-weight: normal;">Hombre</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 4px;">
                                <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1.2px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isFemale ? '✓' : ''}</span>
                                <span style="font-weight: normal;">Mujer</span>
                            </label>
                        </div>
                    </div>

                    <!-- Row 3: Fecha de bautismo and Esperanza -->
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${isTwoInOne ? '3px' : '5px'};">
                        <div style="display: flex; align-items: flex-end; flex: 1; max-width: 58%;">
                            <span style="font-weight: bold; min-width: 130px; white-space: nowrap;">Fecha de bautismo:</span>
                            <span style="flex: 1; border-bottom: 1px solid #000; padding-left: 6px; padding-bottom: 1px; font-weight: normal;">${baptismDate}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 14px; min-width: 180px; justify-content: flex-start; padding-left: 12px;">
                            <label style="display: flex; align-items: center; gap: 4px;">
                                <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1.2px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isOtherSheep ? '✓' : ''}</span>
                                <span style="font-weight: normal;">Otras ovejas</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 4px;">
                                <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1.2px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isAnointed ? '✓' : ''}</span>
                                <span style="font-weight: normal;">Ungido</span>
                            </label>
                        </div>
                    </div>

                    <!-- Row 4: Privileges Row -->
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-top: ${isTwoInOne ? '2px' : '4px'}; margin-bottom: ${isTwoInOne ? '3px' : '5px'}; font-size: ${privFontSize};">
                        <label style="display: flex; align-items: center; gap: 4px;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1.2px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isElder ? '✓' : ''}</span>
                            <span style="font-weight: normal;">Anciano</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 4px;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1.2px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isMS ? '✓' : ''}</span>
                            <span style="font-weight: normal;">Siervo min.</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 4px;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1.2px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isRegularPioneer ? '✓' : ''}</span>
                            <span style="font-weight: normal;">Prec. regular</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 4px;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1.2px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isSpecialPioneer ? '✓' : ''}</span>
                            <span style="font-weight: normal;">Prec. especial</span>
                        </label>
                        <label style="display: flex; align-items: flex-start; gap: 4px; line-height: 1.1;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1.2px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1; margin-top: 1px;">${isMissionary ? '✓' : ''}</span>
                            <span style="font-weight: normal;">Misionero de campo</span>
                        </label>
                    </div>
                </div>

                <!-- Annual Service Table -->
                <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; table-layout: fixed; font-family: Arial, Helvetica, sans-serif;">
                    <thead>
                        <tr style="background-color: #ffffff; height: ${thHeadHeight};">
                            <th style="border: 1.2px solid #000; padding: ${isTwoInOne ? '1px 3px' : '3px 4px'}; width: 16%; text-align: left; font-weight: bold; font-size: ${thFontSize}; color: #000;">
                                Año de servicio
                            </th>
                            <th style="border: 1.2px solid #000; padding: ${isTwoInOne ? '1px' : '2px'}; width: 18%; text-align: center; font-weight: bold; font-size: ${thFontSize}; color: #000; line-height: 1.1;">
                                Participación<br />en ministerio
                            </th>
                            <th style="border: 1.2px solid #000; padding: ${isTwoInOne ? '1px' : '2px'}; width: 12%; text-align: center; font-weight: bold; font-size: ${thFontSize}; color: #000; line-height: 1.1;">
                                Cursos<br />bíblicos
                            </th>
                            <th style="border: 1.2px solid #000; padding: ${isTwoInOne ? '1px' : '2px'}; width: 13%; text-align: center; font-weight: bold; font-size: ${thFontSize}; color: #000; line-height: 1.1;">
                                Precursor<br />auxiliar
                            </th>
                            <th style="border: 1.2px solid #000; padding: ${isTwoInOne ? '1px' : '2px'}; width: 17%; text-align: center; font-weight: bold; font-size: ${thFontSize}; color: #000; line-height: 1.1;">
                                Horas<br />
                                <span style="font-size: ${thSubFontSize}; font-weight: normal; display: block; line-height: 1.05;">(Si es precursor o misionero)</span>
                            </th>
                            <th style="border: 1.2px solid #000; padding: ${isTwoInOne ? '1px 3px' : '2px 4px'}; width: 24%; text-align: center; font-weight: bold; font-size: ${thFontSize}; color: #000;">
                                Notas
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${monthRows}
                    </tbody>
                    <tfoot>
                        <tr style="height: ${footerHeight};">
                            <td colspan="4" style="border: 1.2px solid #000; padding: 1px 4px; text-align: right; font-weight: bold; font-size: ${thFontSize}; color: #000;">
                                Total
                            </td>
                            <td style="border: 1.2px solid #000; padding: 1px; text-align: center; font-weight: bold; font-size: ${nameFontSize}; color: #000;">
                                ${totalAnnualHours > 0 ? totalAnnualHours : ''}
                            </td>
                            <td style="border: 1.2px solid #000; padding: 1px;"></td>
                        </tr>
                    </tfoot>
                </table>

                <!-- Form Code Footer -->
                <div style="margin-top: 2px; font-size: 6pt; color: #000; font-family: Arial, Helvetica, sans-serif; display: flex; justify-content: space-between;">
                    <span>S-21-S 11/23</span>
                    <span style="color: #64748b; font-size: 6pt;">Año de Servicio ${serviceYear}</span>
                </div>
            </div>
        `;
    };

    const generateCardPagesArray = (publishersList: any[], allReports: any[], layout: '2' | '1' = '2'): string[] => {
        if (layout === '1') {
            return publishersList.map(pub => {
                const cardHtml = generateSingleCardHtml(pub, allReports, false);
                return `
                    <div class="s21-card-page" style="width: 794px; min-height: 1080px; margin: 0 auto; background: #ffffff; color: #000000; padding: 24px 28px; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid;">
                        ${cardHtml}
                    </div>
                `;
            });
        }

        // 2 in 1: Two cards per page
        const pages: string[] = [];
        for (let i = 0; i < publishersList.length; i += 2) {
            const pub1 = publishersList[i];
            const pub2 = publishersList[i + 1] || null;

            const card1Html = generateSingleCardHtml(pub1, allReports, true);
            const card2Html = pub2 ? generateSingleCardHtml(pub2, allReports, true) : '';

            pages.push(`
                <div class="s21-card-page" style="width: 794px; height: 1040px; max-height: 1045px; margin: 0 auto; background: #ffffff; color: #000000; padding: 10px 22px; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
                    <div style="height: 495px; max-height: 495px; overflow: hidden; box-sizing: border-box; flex-shrink: 0;">
                        ${card1Html}
                    </div>
                    ${card2Html ? `
                        <div style="border-top: 1px dashed #64748b; margin: 4px 0; position: relative; text-align: center; height: 1px; line-height: 0; flex-shrink: 0;">
                            <span style="position: absolute; top: -6px; left: 50%; transform: translateX(-50%); background: #ffffff; padding: 0 10px; font-size: 6.5pt; color: #475569; font-weight: bold; letter-spacing: 0.5px;">✂ LÍNEA DE CORTE / DOBLADO (2 EN 1)</span>
                        </div>
                        <div style="height: 495px; max-height: 495px; overflow: hidden; box-sizing: border-box; flex-shrink: 0;">
                            ${card2Html}
                        </div>
                    ` : `
                        <div style="height: 495px; border: 1px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 8pt; box-sizing: border-box; flex-shrink: 0;">
                            <span>(Espacio disponible para próxima tarjeta)</span>
                        </div>
                    `}
                </div>
            `);
        }
        return pages;
    };

    const generateCardsHtml = (publishersList: any[], allReports: any[], layout: '2' | '1' = '2'): string => {
        return generateCardPagesArray(publishersList, allReports, layout).join('');
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

    const getDocumentInfo = () => {
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

        const layoutSlug = cardsPerPage === '2' ? '2en1' : '1en1';
        const fileName = `Tarjetas_S21_${filterSlug}_${groupName}_${serviceYear}_${layoutSlug}.pdf`;
        const title = `Tarjetas S-21 (${cardsPerPage === '2' ? 'Formato 2 en 1' : 'Formato Individual'}) - ${serviceYear}`;

        return { groupName, filterSlug, layoutSlug, fileName, title };
    };

    const fetchReportsForServiceYear = async () => {
        const startMonth = `${serviceYear - 1}-09`;
        const endMonth = `${serviceYear}-08`;

        return await fetchAllRows(async (start, end) => {
            return await supabase
                .from('informes_ministerio')
                .select('*')
                .gte('mes', startMonth)
                .lte('mes', endMonth)
                .order('mes', { ascending: true })
                .range(start, end);
        });
    };

    const handleOpenPreview = async () => {
        const activePublishers = getFilteredPublishers();
        if (activePublishers.length === 0) {
            alert('No se encontraron publicadores para los filtros seleccionados.');
            return;
        }

        setIsGenerating(true);
        setStatusMessage('Cargando datos para previsualización...');
        try {
            const reportsData = await fetchReportsForServiceYear();
            const pages = generateCardPagesArray(activePublishers, reportsData || [], cardsPerPage);
            const { fileName, title, layoutSlug } = getDocumentInfo();

            setPreviewModalData({
                isOpen: true,
                pages,
                title,
                fileName,
                layoutLabel: cardsPerPage === '2' ? '2 por Hoja A4' : '1 por Hoja A4'
            });
        } catch (err) {
            console.error("Error loading preview:", err);
            alert("Error al cargar la vista previa. Intente de nuevo.");
        } finally {
            setIsGenerating(false);
            setStatusMessage('');
        }
    };

    const handleGeneratePdf = async () => {
        const activePublishers = getFilteredPublishers();
        if (activePublishers.length === 0) {
            alert('No se encontraron publicadores para los filtros seleccionados.');
            return;
        }

        setIsGenerating(true);
        setStatusMessage('Obteniendo datos de publicadores...');

        try {
            const reportsData = await fetchReportsForServiceYear();
            setStatusMessage('Renderizando páginas PDF de alta calidad...');

            const cardsHtml = generateCardsHtml(activePublishers, reportsData || [], cardsPerPage);
            const { fileName } = getDocumentInfo();

            await downloadHtmlAsPdf(cardsHtml, fileName, (msg) => setStatusMessage(msg));

            setStatusMessage('¡Descarga completada con éxito!');
            setTimeout(() => {
                setIsGenerating(false);
                setStatusMessage('');
                onClose();
            }, 1200);
        } catch (err) {
            console.error("Error in bulk card generation:", err);
            alert("Ocurrió un error al generar las tarjetas en lote. Por favor intente nuevamente.");
            setIsGenerating(false);
            setStatusMessage('');
        }
    };

    const handlePrintDirect = async () => {
        const activePublishers = getFilteredPublishers();
        if (activePublishers.length === 0) {
            alert('No se encontraron publicadores para los filtros seleccionados.');
            return;
        }

        setIsGenerating(true);
        setStatusMessage('Preparando vista de impresión sin cortes...');

        try {
            const reportsData = await fetchReportsForServiceYear();
            const cardsHtml = generateCardsHtml(activePublishers, reportsData || [], cardsPerPage);
            const { title } = getDocumentInfo();

            printHtmlDocument(cardsHtml, title);

            setTimeout(() => {
                setIsGenerating(false);
                setStatusMessage('');
            }, 1000);
        } catch (e) {
            console.error("Error direct print:", e);
            alert("Ocurrió un error al preparar la impresión.");
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
                            <strong className="block font-bold mb-0.5">Exportación fiel y optimizada:</strong>
                            Genera las tarjetas oficiales S-21 con el desglose anual. El modo <strong>2 en 1</strong> ahorra el 50% de papel imprimiendo dos tarjetas listas por página A4 con línea de corte.
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

                    {/* Format Layout: 2 in 1 vs 1 per page */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">
                            Formato de Impresión / Distribución
                        </label>
                        <select
                            value={cardsPerPage}
                            onChange={(e) => setCardsPerPage(e.target.value as '2' | '1')}
                            disabled={isGenerating}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            <option value="2">📄 2 Tarjetas por Hoja (2 en 1 - A4) [Recomendado / Ahorra Papel]</option>
                            <option value="1">📄 1 Tarjeta por Hoja (A4 Completa)</option>
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
                        <div className="text-right">
                            <span className="text-sm font-extrabold text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-200 shadow-sm inline-block">
                                {activeCount} {activeCount === 1 ? 'Tarjeta' : 'Tarjetas'} ({Math.ceil(activeCount / (cardsPerPage === '2' ? 2 : 1))} {Math.ceil(activeCount / (cardsPerPage === '2' ? 2 : 1)) === 1 ? 'hoja A4' : 'hojas A4'})
                            </span>
                        </div>
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
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isGenerating}
                        className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-200/60 transition-colors text-center order-4 sm:order-1"
                    >
                        Cancelar
                    </button>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 order-1 sm:order-2">
                        <button
                            type="button"
                            onClick={handleOpenPreview}
                            disabled={isGenerating}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-sm hover:shadow-blue-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isGenerating && statusMessage.includes('previsualización') ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Eye className="w-4 h-4" />
                            )}
                            <span>Previsualizar</span>
                        </button>

                        <button
                            type="button"
                            onClick={handlePrintDirect}
                            disabled={isGenerating}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-extrabold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Imprimir Todas</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleGeneratePdf}
                            disabled={isGenerating}
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-rose-300/50 transition-all flex items-center justify-center gap-2 cursor-pointer border border-rose-700 disabled:opacity-50"
                        >
                            {isGenerating && !statusMessage.includes('previsualización') ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            <span>Descargar PDF Masivo</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Document Preview Modal */}
            {previewModalData && (
                <DocumentPreviewModal
                    isOpen={previewModalData.isOpen}
                    onClose={() => setPreviewModalData(null)}
                    title={previewModalData.title}
                    fileName={previewModalData.fileName}
                    pagesHtml={previewModalData.pages}
                    layoutLabel={previewModalData.layoutLabel}
                    subtitle={`Vista previa de ${activeCount} tarjetas S-21 (${cardsPerPage === '2' ? '2 tarjetas por página A4' : '1 tarjeta por página A4'})`}
                />
            )}
        </div>
    );
};

