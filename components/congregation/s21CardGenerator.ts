import { supabase } from '../../lib/supabase';
import { fetchAllRows } from '../../lib/supabasePagination';
import { cleanNotes, isReportAuxiliar } from './utils';

export const sanitizeAndFormatDate = (val: string | undefined): string => {
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

export const convertToYm = (val: string | undefined): string => {
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

export const MONTHS_S21 = [
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

export const generateSingleCardHtml = (
    pub: any, 
    allReports: any[], 
    globalMembers: any[] = [], 
    isTwoInOne = true, 
    serviceYear = new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear()
): string => {
    const memberRow = globalMembers.find(m => m.publicador_nombre && m.publicador_nombre.trim().toLowerCase() === (pub.nombre || pub.publicador_nombre || '').trim().toLowerCase());
    const role = (memberRow?.rol || pub.rol || 'Publicador').toLowerCase();

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

    const pubName = pub.nombre || pub.publicador_nombre || '';

    // Filter reports for this publisher
    const pubReports = allReports.filter(r => 
        r.publicador_nombre && r.publicador_nombre.trim().toLowerCase() === pubName.trim().toLowerCase()
    );

    let totalAnnualHours = 0;

    const rowHeight = isTwoInOne ? '14.5px' : '24px';
    const tdFontSize = isTwoInOne ? '6.2pt' : '9pt';
    const noteFontSize = isTwoInOne ? '5.8pt' : '8.5pt';
    const checkSize = isTwoInOne ? '8.5px' : '13px';
    const checkFont = isTwoInOne ? '6.5px' : '11px';

    const monthRows = MONTHS_S21.map(m => {
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

        return `
            <tr style="height: ${rowHeight};">
                <td style="border: 1px solid #000; padding: 0px 3px; font-size: ${tdFontSize}; font-weight: normal; text-transform: capitalize; color: #000; line-height: 1; height: ${rowHeight};">
                    ${m.name}
                </td>
                <td style="border: 1px solid #000; padding: 0px; text-align: center; height: ${rowHeight};">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">
                        ${participo ? '✓' : ''}
                    </span>
                </td>
                <td style="border: 1px solid #000; padding: 0px; text-align: center; font-size: ${tdFontSize}; font-weight: normal; color: #000; line-height: 1; height: ${rowHeight};">
                    ${studies}
                </td>
                <td style="border: 1px solid #000; padding: 0px; text-align: center; height: ${rowHeight};">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">
                        ${hasAuxPrecursor ? '✓' : ''}
                    </span>
                </td>
                <td style="border: 1px solid #000; padding: 0px; text-align: center; font-size: ${tdFontSize}; font-weight: normal; color: #000; line-height: 1; height: ${rowHeight};">
                    ${hoursStr}
                </td>
                <td style="border: 1px solid #000; padding: 0px 3px; font-size: ${noteFontSize}; color: #000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1; height: ${rowHeight};">
                    ${cleanNote}
                </td>
            </tr>
        `;
    }).join('');

    const titleSize = isTwoInOne ? '8.2pt' : '13.5pt';
    const titleMargin = isTwoInOne ? '0 0 2px 0' : '0 0 16px 0';
    const headerGridMargin = isTwoInOne ? '0 0 2px 0' : '0 0 12px 0';
    const headerFontSize = isTwoInOne ? '6.8pt' : '9.5pt';
    const nameFontSize = isTwoInOne ? '7.8pt' : '10pt';
    const privFontSize = isTwoInOne ? '6.3pt' : '8.8pt';
    const thHeadHeight = isTwoInOne ? '19px' : '42px';
    const thFontSize = isTwoInOne ? '5.8pt' : '8pt';
    const thSubFontSize = isTwoInOne ? '5pt' : '6.5pt';
    const footerHeight = isTwoInOne ? '15px' : '27px';

    return `
        <div style="width: 100%; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; line-height: 1.15;">
            <!-- Title -->
            <h1 style="text-align: center; font-size: ${titleSize}; font-weight: bold; margin: ${titleMargin}; text-transform: uppercase; letter-spacing: 0.01em; color: #000; font-family: Arial, Helvetica, sans-serif;">
                REGISTRO DE PUBLICADOR DE LA CONGREGACIÓN
            </h1>

            <!-- Header Details Grid -->
            <div style="margin: ${headerGridMargin}; font-size: ${headerFontSize}; color: #000; line-height: 1.15;">
                <!-- Row 1: Nombre -->
                <div style="display: flex; align-items: flex-end; margin-bottom: ${isTwoInOne ? '1.5px' : '4px'};">
                    <span style="font-weight: bold; min-width: ${isTwoInOne ? '50px' : '65px'};">Nombre:</span>
                    <span style="flex: 1; border-bottom: 1px solid #000; padding-left: 4px; padding-bottom: 0.5px; font-weight: bold; font-size: ${nameFontSize}; color: #000;">${pubName}</span>
                </div>

                <!-- Row 2: Fecha de nacimiento and Género -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${isTwoInOne ? '1.5px' : '4px'};">
                    <div style="display: flex; align-items: flex-end; flex: 1; max-width: 58%;">
                        <span style="font-weight: bold; min-width: ${isTwoInOne ? '105px' : '130px'}; white-space: nowrap;">Fecha de nacimiento:</span>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding-left: 4px; padding-bottom: 0.5px; font-weight: normal;">${birthDate}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: ${isTwoInOne ? '8px' : '14px'}; min-width: ${isTwoInOne ? '135px' : '180px'}; justify-content: flex-start; padding-left: 8px;">
                        <label style="display: flex; align-items: center; gap: 3px;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isMale ? '✓' : ''}</span>
                            <span style="font-weight: normal;">Hombre</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 3px;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isFemale ? '✓' : ''}</span>
                            <span style="font-weight: normal;">Mujer</span>
                        </label>
                    </div>
                </div>

                <!-- Row 3: Fecha de bautismo and Esperanza -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${isTwoInOne ? '2px' : '5px'};">
                    <div style="display: flex; align-items: flex-end; flex: 1; max-width: 58%;">
                        <span style="font-weight: bold; min-width: ${isTwoInOne ? '105px' : '130px'}; white-space: nowrap;">Fecha de bautismo:</span>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding-left: 4px; padding-bottom: 0.5px; font-weight: normal;">${baptismDate}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: ${isTwoInOne ? '8px' : '14px'}; min-width: ${isTwoInOne ? '135px' : '180px'}; justify-content: flex-start; padding-left: 8px;">
                        <label style="display: flex; align-items: center; gap: 3px;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isOtherSheep ? '✓' : ''}</span>
                            <span style="font-weight: normal;">Otras ovejas</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 3px;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isAnointed ? '✓' : ''}</span>
                            <span style="font-weight: normal;">Ungido</span>
                        </label>
                    </div>
                </div>

                <!-- Row 4: Privileges Row -->
                <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-top: ${isTwoInOne ? '1px' : '4px'}; margin-bottom: ${isTwoInOne ? '2px' : '5px'}; font-size: ${privFontSize};">
                    <label style="display: flex; align-items: center; gap: 3px;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isElder ? '✓' : ''}</span>
                        <span style="font-weight: normal;">Anciano</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 3px;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isMS ? '✓' : ''}</span>
                        <span style="font-weight: normal;">Siervo min.</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 3px;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isRegularPioneer ? '✓' : ''}</span>
                        <span style="font-weight: normal;">Prec. regular</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 3px;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1;">${isSpecialPioneer ? '✓' : ''}</span>
                        <span style="font-weight: normal;">Prec. especial</span>
                    </label>
                    <label style="display: flex; align-items: flex-start; gap: 3px; line-height: 1.1;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkSize}; height: ${checkSize}; border: 1px solid #000; background-color: #fff; font-size: ${checkFont}; font-weight: bold; line-height: 1; margin-top: 0.5px;">${isMissionary ? '✓' : ''}</span>
                        <span style="font-weight: normal;">Misionero de campo</span>
                    </label>
                </div>
            </div>

            <!-- Annual Service Table -->
            <table style="width: 100%; border-collapse: collapse; border: 1.2px solid #000; table-layout: fixed; font-family: Arial, Helvetica, sans-serif; font-size: ${tdFontSize}; line-height: 1;">
                <thead>
                    <tr style="background-color: #ffffff; height: ${thHeadHeight};">
                        <th style="border: 1px solid #000; padding: ${isTwoInOne ? '1px 2px' : '3px 4px'}; width: 16%; text-align: left; font-weight: bold; font-size: ${thFontSize}; color: #000; line-height: 1;">
                            Año de servicio
                        </th>
                        <th style="border: 1px solid #000; padding: 1px; width: 17%; text-align: center; font-weight: bold; font-size: ${thFontSize}; color: #000; line-height: 1.05;">
                            Participación<br />en ministerio
                        </th>
                        <th style="border: 1px solid #000; padding: 1px; width: 12%; text-align: center; font-weight: bold; font-size: ${thFontSize}; color: #000; line-height: 1.05;">
                            Cursos<br />bíblicos
                        </th>
                        <th style="border: 1px solid #000; padding: 1px; width: 13%; text-align: center; font-weight: bold; font-size: ${thFontSize}; color: #000; line-height: 1.05;">
                            Precursor<br />auxiliar
                        </th>
                        <th style="border: 1px solid #000; padding: 1px; width: 17%; text-align: center; font-weight: bold; font-size: ${thFontSize}; color: #000; line-height: 1.05;">
                            Horas<br />
                            <span style="font-size: ${thSubFontSize}; font-weight: normal; display: block; line-height: 1;">(Si es precursor o misionero)</span>
                        </th>
                        <th style="border: 1px solid #000; padding: ${isTwoInOne ? '1px 2px' : '2px 4px'}; width: 25%; text-align: center; font-weight: bold; font-size: ${thFontSize}; color: #000; line-height: 1;">
                            Notas
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${monthRows}
                </tbody>
                <tfoot>
                    <tr style="height: ${footerHeight};">
                        <td colspan="4" style="border: 1px solid #000; padding: 0px 3px; text-align: right; font-weight: bold; font-size: ${thFontSize}; color: #000; height: ${footerHeight}; line-height: 1;">
                            Total
                        </td>
                        <td style="border: 1px solid #000; padding: 0px; text-align: center; font-weight: bold; font-size: ${nameFontSize}; color: #000; height: ${footerHeight}; line-height: 1;">
                            ${totalAnnualHours > 0 ? totalAnnualHours : ''}
                        </td>
                        <td style="border: 1px solid #000; padding: 0px; height: ${footerHeight};"></td>
                    </tr>
                </tfoot>
            </table>

            <!-- Form Code Footer -->
            <div style="margin-top: ${isTwoInOne ? '1.5px' : '4px'}; font-size: ${isTwoInOne ? '5.2pt' : '6.5pt'}; color: #000; font-family: Arial, Helvetica, sans-serif; display: flex; justify-content: space-between; line-height: 1;">
                <span>S-21-S 11/23</span>
                <span style="color: #64748b;">Año de Servicio ${serviceYear}</span>
            </div>
        </div>
    `;
};

export const generateCardPagesArray = (
    publishersList: any[], 
    allReports: any[], 
    globalMembers: any[] = [], 
    layout: '2' | '1' = '2', 
    serviceYear = new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear()
): string[] => {
    if (layout === '1') {
        return publishersList.map(pub => {
            const cardHtml = generateSingleCardHtml(pub, allReports, globalMembers, false, serviceYear);
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

        const card1Html = generateSingleCardHtml(pub1, allReports, globalMembers, true, serviceYear);
        const card2Html = pub2 ? generateSingleCardHtml(pub2, allReports, globalMembers, true, serviceYear) : '';

        pages.push(`
            <div class="s21-card-page" style="width: 794px; min-height: 1040px; margin: 0 auto; background: #ffffff; color: #000000; padding: 10px 20px; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="box-sizing: border-box; width: 100%;">
                    ${card1Html}
                </div>
                ${card2Html ? `
                    <div style="border-top: 1px dashed #64748b; margin: 8px 0 6px 0; position: relative; text-align: center; height: 1px; line-height: 0;">
                        <span style="position: absolute; top: -5px; left: 50%; transform: translateX(-50%); background: #ffffff; padding: 0 8px; font-size: 6pt; color: #475569; font-weight: bold; letter-spacing: 0.5px;">✂ LÍNEA DE CORTE / DOBLADO (2 EN 1)</span>
                    </div>
                    <div style="box-sizing: border-box; width: 100%;">
                        ${card2Html}
                    </div>
                ` : `
                    <div style="border: 1px dashed #cbd5e1; border-radius: 6px; min-height: 250px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 7.5pt; box-sizing: border-box; margin-top: 8px;">
                        <span>(Espacio disponible para próxima tarjeta)</span>
                    </div>
                `}
            </div>
        `);
    }
    return pages;
};

export const generateCardsHtml = (
    publishersList: any[], 
    allReports: any[], 
    globalMembers: any[] = [], 
    layout: '2' | '1' = '2', 
    serviceYear = new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear()
): string => {
    return generateCardPagesArray(publishersList, allReports, globalMembers, layout, serviceYear).join('');
};

export const fetchReportsForServiceYear = async (
    serviceYear = new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear(),
    congregationId?: number | string
): Promise<any[]> => {
    const startMonth = `${serviceYear - 1}-09`;
    const endMonth = `${serviceYear}-08`;

    return await fetchAllRows(async (start, end) => {
        let q = supabase
            .from('informes_ministerio')
            .select('*')
            .gte('mes', startMonth)
            .lte('mes', endMonth);

        if (congregationId) {
            q = q.eq('congregation_id', congregationId);
        }

        return await q.order('mes', { ascending: true }).range(start, end);
    });
};
