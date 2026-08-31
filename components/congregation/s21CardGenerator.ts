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
    { key: '09', name: 'Septiembre' },
    { key: '10', name: 'Octubre' },
    { key: '11', name: 'Noviembre' },
    { key: '12', name: 'Diciembre' },
    { key: '01', name: 'Enero' },
    { key: '02', name: 'Febrero' },
    { key: '03', name: 'Marzo' },
    { key: '04', name: 'Abril' },
    { key: '05', name: 'Mayo' },
    { key: '06', name: 'Junio' },
    { key: '07', name: 'Julio' },
    { key: '08', name: 'Agosto' }
];

export interface S21Config {
    rowHeight: number;       // Altura de fila de mes (px)
    titleFontSize: number;   // Tamaño letra título (pt)
    titleMarginTop?: number; // Margen superior título (px)
    titleMarginBottom?: number; // Margen inferior título (px)
    headerFontSize: number;  // Tamaño letra datos nombre/fechas (pt)
    headerGridMarginBottom?: number; // Margen inferior cabecera datos (px)
    privFontSize: number;    // Tamaño letra privilegios/cargos (pt)
    tableFontSize: number;   // Tamaño letra tabla/meses (pt)
    noteFontSize: number;    // Tamaño letra notas (pt)
    tableCheckSize: number;  // Tamaño casilla de verificación (px)
    headerCheckSize?: number;// Tamaño casilla cabecera (px)
    thHeadHeight: number;    // Altura cabecera de la tabla (px)
    footerHeight: number;    // Altura fila Total (px)
    cardPaddingY: number;    // Padding superior e inferior por página (px)
    cardPaddingX: number;    // Padding lateral por página (px)
    cardMaxHeight: number;   // Altura máxima de cada mitad (px)
    tableScale: number;      // Escala o ancho relativo (%)
}

export const DEFAULT_S21_CONFIG_2IN1: S21Config = {
    rowHeight: 14,
    titleFontSize: 10.5,
    titleMarginTop: 0,
    titleMarginBottom: 5,
    headerFontSize: 8,
    headerGridMarginBottom: 5,
    privFontSize: 7.5,
    tableFontSize: 7.2,
    noteFontSize: 6.8,
    tableCheckSize: 8,
    headerCheckSize: 9,
    thHeadHeight: 26,
    footerHeight: 15,
    cardPaddingY: 16,
    cardPaddingX: 24,
    cardMaxHeight: 535,
    tableScale: 100,
};

export const DEFAULT_S21_CONFIG_1IN1: S21Config = {
    rowHeight: 24,
    titleFontSize: 14,
    titleMarginTop: 0,
    titleMarginBottom: 12,
    headerFontSize: 10,
    headerGridMarginBottom: 10,
    privFontSize: 9.5,
    tableFontSize: 9.5,
    noteFontSize: 9,
    tableCheckSize: 11,
    headerCheckSize: 12,
    thHeadHeight: 40,
    footerHeight: 24,
    cardPaddingY: 28,
    cardPaddingX: 32,
    cardMaxHeight: 1060,
    tableScale: 100,
};

const STORAGE_KEY_S21_CONFIG = 'vmt_s21_custom_config_v3';

export const getSavedS21Config = (isTwoInOne = true): S21Config => {
    const defaults = isTwoInOne ? DEFAULT_S21_CONFIG_2IN1 : DEFAULT_S21_CONFIG_1IN1;
    if (typeof window === 'undefined') return defaults;
    try {
        const raw = localStorage.getItem(`${STORAGE_KEY_S21_CONFIG}_${isTwoInOne ? '2' : '1'}`);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        const merged = { ...defaults, ...parsed };
        if (isTwoInOne) {
            if (merged.rowHeight > 18) merged.rowHeight = 14;
            if (merged.cardPaddingY > 24) merged.cardPaddingY = 14;
            if (merged.thHeadHeight > 36) merged.thHeadHeight = 28;
        }
        return merged;
    } catch {
        return defaults;
    }
};

export const saveS21Config = (config: S21Config, isTwoInOne = true): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(`${STORAGE_KEY_S21_CONFIG}_${isTwoInOne ? '2' : '1'}`, JSON.stringify(config));
    } catch (e) {
        console.error("Error saving S21 config:", e);
    }
};

export const resetS21Config = (isTwoInOne = true): S21Config => {
    if (typeof window !== 'undefined') {
        try {
            localStorage.removeItem(`${STORAGE_KEY_S21_CONFIG}_${isTwoInOne ? '2' : '1'}`);
        } catch {}
    }
    return isTwoInOne ? DEFAULT_S21_CONFIG_2IN1 : DEFAULT_S21_CONFIG_1IN1;
};

export const generateS21DynamicStyleBlock = (config: S21Config, isTwoInOne = true): string => {
    const titleMarginTop = config.titleMarginTop ?? 0;
    const titleMarginBottom = config.titleMarginBottom ?? (isTwoInOne ? 5 : 12);
    const headerGridMarginBottom = config.headerGridMarginBottom ?? (isTwoInOne ? 5 : 10);
    const headerCheckSize = config.headerCheckSize || (isTwoInOne ? 9 : 12);
    const headerCheckFont = Math.max(6, Math.round(headerCheckSize * 0.85 * 10) / 10);
    const tableCheckFont = Math.max(5, Math.round(config.tableCheckSize * 0.85 * 10) / 10);
    const thSubFontSize = Math.max(4, Math.round(config.tableFontSize * 0.72 * 10) / 10);
    const scaleFactor = config.tableScale ? config.tableScale / 100 : 1;

    return `
        .s21-card-page {
            padding: ${config.cardPaddingY}px ${config.cardPaddingX}px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .s21-card-scale-wrapper {
            transform: scale(${scaleFactor}) !important;
            transform-origin: top center !important;
        }
        .s21-title {
            font-size: ${config.titleFontSize}pt !important;
            margin-top: ${titleMarginTop}px !important;
            margin-bottom: ${titleMarginBottom}px !important;
            font-weight: 700 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            letter-spacing: 0.01em !important;
            line-height: 1.1 !important;
        }
        .s21-header-grid {
            margin-bottom: ${headerGridMarginBottom}px !important;
            font-size: ${config.headerFontSize}pt !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            line-height: 1.25 !important;
        }
        .s21-header-text, .s21-header-grid span, .s21-header-grid label span:not(.s21-header-checkbox) {
            font-size: ${config.headerFontSize}pt !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
        .s21-priv-row, .s21-priv-row label span:not(.s21-header-checkbox) {
            font-size: ${config.privFontSize}pt !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
        .s21-header-checkbox {
            width: ${headerCheckSize}px !important;
            height: ${headerCheckSize}px !important;
            font-size: ${headerCheckFont}px !important;
        }
        .s21-table {
            font-size: ${config.tableFontSize}pt !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
        .s21-th-row {
            height: ${config.thHeadHeight}px !important;
            max-height: ${config.thHeadHeight}px !important;
        }
        .s21-th-cell {
            font-size: ${config.tableFontSize}pt !important;
            font-weight: 700 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
        .s21-th-sub {
            font-size: ${thSubFontSize}pt !important;
            font-weight: normal !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
        .s21-month-row {
            height: ${config.rowHeight}px !important;
            max-height: ${config.rowHeight}px !important;
        }
        .s21-td-cell {
            height: ${config.rowHeight}px !important;
            max-height: ${config.rowHeight}px !important;
            font-size: ${config.tableFontSize}pt !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
        .s21-td-note {
            font-size: ${config.noteFontSize}pt !important;
            height: ${config.rowHeight}px !important;
            max-height: ${config.rowHeight}px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
        .s21-table-checkbox {
            width: ${config.tableCheckSize}px !important;
            height: ${config.tableCheckSize}px !important;
            font-size: ${tableCheckFont}px !important;
        }
        .s21-footer-row {
            height: ${config.footerHeight}px !important;
            max-height: ${config.footerHeight}px !important;
        }
        .s21-footer-cell {
            height: ${config.footerHeight}px !important;
            max-height: ${config.footerHeight}px !important;
            font-size: ${config.tableFontSize}pt !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
    `;
};

export const generateSingleCardHtml = (
    pub: any, 
    allReports: any[], 
    globalMembers: any[] = [], 
    isTwoInOne = true, 
    serviceYear = new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear(),
    customConfig?: Partial<S21Config>
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
    const isOtherSheep = !isAnointed && Boolean(pub.esperanza || pub.nombre || pub.publicador_nombre);

    const birthDate = sanitizeAndFormatDate(pub.fecha_nacimiento);
    const baptismDate = sanitizeAndFormatDate(pub.fecha_bautismo);

    const pubName = pub.nombre || pub.publicador_nombre || '';

    // Filter reports for this publisher
    const pubReports = pubName ? allReports.filter(r => 
        r.publicador_nombre && r.publicador_nombre.trim().toLowerCase() === pubName.trim().toLowerCase()
    ) : [];

    let totalAnnualHours = 0;

    // Configuración activa (guardada o personalizada)
    const baseConfig = getSavedS21Config(isTwoInOne);
    const activeConfig: S21Config = { ...baseConfig, ...(customConfig || {}) };

    const rowHeight = `${activeConfig.rowHeight}px`;
    const tdFontSize = `${activeConfig.tableFontSize}pt`;
    const noteFontSize = `${activeConfig.noteFontSize}pt`;
    const tableCheckSize = `${activeConfig.tableCheckSize}px`;
    const tableCheckFont = `${Math.max(5, Math.round(activeConfig.tableCheckSize * 0.85 * 10) / 10)}px`;

    const headerCheckSize = `${activeConfig.headerCheckSize || (isTwoInOne ? 9 : 12)}px`;
    const headerCheckFont = `${Math.max(6, (activeConfig.headerCheckSize || (isTwoInOne ? 9 : 12)) * 0.85)}px`;

    const titleSize = `${activeConfig.titleFontSize}pt`;
    const titleMargin = `${activeConfig.titleMarginTop ?? 0}px 0 ${activeConfig.titleMarginBottom ?? (isTwoInOne ? 5 : 12)}px 0`;
    const headerGridMargin = `0 0 ${activeConfig.headerGridMarginBottom ?? (isTwoInOne ? 5 : 10)}px 0`;
    const headerFontSize = `${activeConfig.headerFontSize}pt`;
    const privFontSize = `${activeConfig.privFontSize}pt`;
    const thHeadHeight = `${activeConfig.thHeadHeight}px`;
    const thFontSize = `${activeConfig.tableFontSize}pt`;
    const thSubFontSize = `${Math.max(4, Math.round(activeConfig.tableFontSize * 0.72 * 10) / 10)}pt`;
    const footerHeight = `${activeConfig.footerHeight}px`;

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
            <tr class="s21-month-row" style="height: ${rowHeight}; max-height: ${rowHeight};">
                <td class="s21-td-cell" style="border: 1px solid #000000; padding: 0px 4px; font-size: ${tdFontSize}; font-weight: normal; color: #000000; line-height: 1; height: ${rowHeight}; max-height: ${rowHeight}; vertical-align: middle;">
                    ${m.name}
                </td>
                <td class="s21-td-cell" style="border: 1px solid #000000; padding: 0px; text-align: center; height: ${rowHeight}; max-height: ${rowHeight}; vertical-align: middle; line-height: 0;">
                    <span class="s21-table-checkbox" style="display: inline-flex; align-items: center; justify-content: center; width: ${tableCheckSize}; height: ${tableCheckSize}; border: 1px solid #000000; background-color: #fff; font-size: ${tableCheckFont}; font-weight: bold; line-height: 1;">
                        ${participo ? '✓' : ''}
                    </span>
                </td>
                <td class="s21-td-cell" style="border: 1px solid #000000; padding: 0px; text-align: center; font-size: ${tdFontSize}; font-weight: normal; color: #000000; line-height: 1; height: ${rowHeight}; max-height: ${rowHeight}; vertical-align: middle;">
                    ${studies}
                </td>
                <td class="s21-td-cell" style="border: 1px solid #000000; padding: 0px; text-align: center; height: ${rowHeight}; max-height: ${rowHeight}; vertical-align: middle; line-height: 0;">
                    <span class="s21-table-checkbox" style="display: inline-flex; align-items: center; justify-content: center; width: ${tableCheckSize}; height: ${tableCheckSize}; border: 1px solid #000000; background-color: #fff; font-size: ${tableCheckFont}; font-weight: bold; line-height: 1;">
                        ${hasAuxPrecursor ? '✓' : ''}
                    </span>
                </td>
                <td class="s21-td-cell" style="border: 1px solid #000000; padding: 0px; text-align: center; font-size: ${tdFontSize}; font-weight: normal; color: #000000; line-height: 1; height: ${rowHeight}; max-height: ${rowHeight}; vertical-align: middle;">
                    ${hoursStr}
                </td>
                <td class="s21-td-cell s21-td-note" style="border: 1px solid #000000; padding: 0px 4px; font-size: ${noteFontSize}; color: #000000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1; height: ${rowHeight}; max-height: ${rowHeight}; vertical-align: middle;">
                    ${cleanNote}
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="s21-card-inner" style="width: 100%; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #000000; background: #ffffff; line-height: 1.15; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
            <!-- Title -->
            <h1 class="s21-title" style="text-align: center; font-size: ${titleSize}; font-weight: 700; margin: ${titleMargin}; text-transform: uppercase; letter-spacing: 0.01em; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.1; white-space: nowrap; width: 100%;">
                REGISTRO DE PUBLICADOR DE LA CONGREGACIÓN
            </h1>

            <!-- Header Details Grid -->
            <div class="s21-header-grid" style="margin: ${headerGridMargin}; font-size: ${headerFontSize}; color: #000000; line-height: 1.25; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <!-- Row 1: Nombre -->
                <div class="s21-header-row" style="display: flex; align-items: flex-end; margin-bottom: ${isTwoInOne ? '3px' : '6px'};">
                    <span class="s21-header-text" style="font-weight: 700; min-width: ${isTwoInOne ? '56px' : '65px'}; font-size: ${headerFontSize};">Nombre:</span>
                    <span class="s21-header-text" style="flex: 1; border-bottom: 1px solid #000000; padding-left: 4px; padding-bottom: 0px; font-weight: normal; font-size: ${headerFontSize}; color: #000000; min-height: 12px;">${pubName}</span>
                </div>

                <!-- Row 2: Fecha de nacimiento and Género -->
                <div class="s21-header-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${isTwoInOne ? '3px' : '6px'};">
                    <div style="display: flex; align-items: flex-end; flex: 1; max-width: 58%;">
                        <span class="s21-header-text" style="font-weight: 700; min-width: ${isTwoInOne ? '122px' : '140px'}; white-space: nowrap; font-size: ${headerFontSize};">Fecha de nacimiento:</span>
                        <span class="s21-header-text" style="flex: 1; border-bottom: 1px solid #000000; padding-left: 4px; padding-bottom: 0px; font-weight: normal; font-size: ${headerFontSize}; min-height: 12px;">${birthDate}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: ${isTwoInOne ? '14px' : '20px'}; min-width: ${isTwoInOne ? '140px' : '175px'}; justify-content: flex-start; padding-left: 8px;">
                        <label style="display: flex; align-items: center; gap: 3.5px; cursor: default;">
                            <span class="s21-header-checkbox" style="display: inline-flex; align-items: center; justify-content: center; width: ${headerCheckSize}; height: ${headerCheckSize}; border: 1px solid #000000; background-color: #fff; font-size: ${headerCheckFont}; font-weight: bold; line-height: 1;">${isMale ? '✓' : ''}</span>
                            <span class="s21-header-text" style="font-weight: normal; font-size: ${headerFontSize};">Hombre</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 3.5px; cursor: default;">
                            <span class="s21-header-checkbox" style="display: inline-flex; align-items: center; justify-content: center; width: ${headerCheckSize}; height: ${headerCheckSize}; border: 1px solid #000000; background-color: #fff; font-size: ${headerCheckFont}; font-weight: bold; line-height: 1;">${isFemale ? '✓' : ''}</span>
                            <span class="s21-header-text" style="font-weight: normal; font-size: ${headerFontSize};">Mujer</span>
                        </label>
                    </div>
                </div>

                <!-- Row 3: Fecha de bautismo and Esperanza -->
                <div class="s21-header-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${isTwoInOne ? '3px' : '6px'};">
                    <div style="display: flex; align-items: flex-end; flex: 1; max-width: 58%;">
                        <span class="s21-header-text" style="font-weight: 700; min-width: ${isTwoInOne ? '122px' : '140px'}; white-space: nowrap; font-size: ${headerFontSize};">Fecha de bautismo:</span>
                        <span class="s21-header-text" style="flex: 1; border-bottom: 1px solid #000000; padding-left: 4px; padding-bottom: 0px; font-weight: normal; font-size: ${headerFontSize}; min-height: 12px;">${baptismDate}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: ${isTwoInOne ? '14px' : '20px'}; min-width: ${isTwoInOne ? '140px' : '175px'}; justify-content: flex-start; padding-left: 8px;">
                        <label style="display: flex; align-items: center; gap: 3.5px; cursor: default;">
                            <span class="s21-header-checkbox" style="display: inline-flex; align-items: center; justify-content: center; width: ${headerCheckSize}; height: ${headerCheckSize}; border: 1px solid #000000; background-color: #fff; font-size: ${headerCheckFont}; font-weight: bold; line-height: 1;">${isOtherSheep ? '✓' : ''}</span>
                            <span class="s21-header-text" style="font-weight: normal; font-size: ${headerFontSize};">Otras ovejas</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 3.5px; cursor: default;">
                            <span class="s21-header-checkbox" style="display: inline-flex; align-items: center; justify-content: center; width: ${headerCheckSize}; height: ${headerCheckSize}; border: 1px solid #000000; background-color: #fff; font-size: ${headerCheckFont}; font-weight: bold; line-height: 1;">${isAnointed ? '✓' : ''}</span>
                            <span class="s21-header-text" style="font-weight: normal; font-size: ${headerFontSize};">Ungido</span>
                        </label>
                    </div>
                </div>

                <!-- Row 4: Privileges Row -->
                <div class="s21-priv-row" style="display: flex; align-items: flex-start; justify-content: space-between; margin-top: ${isTwoInOne ? '2px' : '5px'}; margin-bottom: ${isTwoInOne ? '2px' : '5px'}; font-size: ${privFontSize}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <label style="display: flex; align-items: center; gap: 3px; cursor: default;">
                        <span class="s21-header-checkbox" style="display: inline-flex; align-items: center; justify-content: center; width: ${headerCheckSize}; height: ${headerCheckSize}; border: 1px solid #000000; background-color: #fff; font-size: ${headerCheckFont}; font-weight: bold; line-height: 1;">${isElder ? '✓' : ''}</span>
                        <span style="font-weight: normal;">Anciano</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 3px; cursor: default;">
                        <span class="s21-header-checkbox" style="display: inline-flex; align-items: center; justify-content: center; width: ${headerCheckSize}; height: ${headerCheckSize}; border: 1px solid #000000; background-color: #fff; font-size: ${headerCheckFont}; font-weight: bold; line-height: 1;">${isMS ? '✓' : ''}</span>
                        <span style="font-weight: normal;">Siervo ministerial</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 3px; cursor: default;">
                        <span class="s21-header-checkbox" style="display: inline-flex; align-items: center; justify-content: center; width: ${headerCheckSize}; height: ${headerCheckSize}; border: 1px solid #000000; background-color: #fff; font-size: ${headerCheckFont}; font-weight: bold; line-height: 1;">${isRegularPioneer ? '✓' : ''}</span>
                        <span style="font-weight: normal;">Precursor regular</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 3px; cursor: default;">
                        <span class="s21-header-checkbox" style="display: inline-flex; align-items: center; justify-content: center; width: ${headerCheckSize}; height: ${headerCheckSize}; border: 1px solid #000000; background-color: #fff; font-size: ${headerCheckFont}; font-weight: bold; line-height: 1;">${isSpecialPioneer ? '✓' : ''}</span>
                        <span style="font-weight: normal;">Precursor especial</span>
                    </label>
                    <label style="display: flex; align-items: flex-start; gap: 3px; line-height: 1.05; cursor: default;">
                        <span class="s21-header-checkbox" style="display: inline-flex; align-items: center; justify-content: center; width: ${headerCheckSize}; height: ${headerCheckSize}; border: 1px solid #000000; background-color: #fff; font-size: ${headerCheckFont}; font-weight: bold; line-height: 1; margin-top: 1px;">${isMissionary ? '✓' : ''}</span>
                        <span style="font-weight: normal;">Misionero que sirve<br />en el campo</span>
                    </label>
                </div>
            </div>

            <!-- Annual Service Table -->
            <table class="s21-table" style="width: 100%; border-collapse: collapse; border: 1px solid #000000; table-layout: fixed; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: ${tdFontSize}; line-height: 1.05;">
                <thead>
                    <tr class="s21-th-row" style="background-color: #ffffff; height: ${thHeadHeight}; max-height: ${thHeadHeight};">
                        <th class="s21-th-cell" style="border: 1px solid #000000; padding: 2px 3px; width: 14.5%; text-align: left; font-weight: 700; font-size: ${thFontSize}; color: #000000; line-height: 1.05; vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                            Año de servicio
                        </th>
                        <th class="s21-th-cell" style="border: 1px solid #000000; padding: 2px 1px; width: 14%; text-align: center; font-weight: 700; font-size: ${thFontSize}; color: #000000; line-height: 1.05; vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                            Participación<br />en el<br />ministerio
                        </th>
                        <th class="s21-th-cell" style="border: 1px solid #000000; padding: 2px 1px; width: 9.5%; text-align: center; font-weight: 700; font-size: ${thFontSize}; color: #000000; line-height: 1.05; vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                            Cursos<br />bíblicos
                        </th>
                        <th class="s21-th-cell" style="border: 1px solid #000000; padding: 2px 1px; width: 11.5%; text-align: center; font-weight: 700; font-size: ${thFontSize}; color: #000000; line-height: 1.05; vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                            Precursor<br />auxiliar
                        </th>
                        <th class="s21-th-cell" style="border: 1px solid #000000; padding: 2px 1px; width: 16.5%; text-align: center; font-weight: 700; font-size: ${thFontSize}; color: #000000; line-height: 1.05; vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                            Horas<br />
                            <span class="s21-th-sub" style="font-size: ${thSubFontSize}; font-weight: normal; display: block; line-height: 1.05; margin-top: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">(Si es precursor o<br />misionero que<br />sirve en el campo)</span>
                        </th>
                        <th class="s21-th-cell" style="border: 1px solid #000000; padding: 2px 3px; width: 34%; text-align: center; font-weight: 700; font-size: ${thFontSize}; color: #000000; line-height: 1.05; vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                            Notas
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${monthRows}
                </tbody>
                <tfoot>
                    <tr class="s21-footer-row" style="height: ${footerHeight}; max-height: ${footerHeight}; background-color: #ffffff;">
                        <td class="s21-footer-cell" colspan="4" style="border: none; padding: 0px 4px; text-align: right; font-weight: 700; font-size: ${thFontSize}; color: #000000; height: ${footerHeight}; line-height: 1; vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                            Total
                        </td>
                        <td class="s21-footer-cell" style="border: 1px solid #000000; padding: 0px; text-align: center; font-weight: 700; font-size: ${tdFontSize}; color: #000000; height: ${footerHeight}; line-height: 1; vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                            ${totalAnnualHours > 0 ? totalAnnualHours : ''}
                        </td>
                        <td class="s21-footer-cell" style="border: 1px solid #000000; padding: 0px; height: ${footerHeight};"></td>
                    </tr>
                </tfoot>
            </table>

            <!-- Form Code Footer -->
            <div style="margin-top: ${isTwoInOne ? '3px' : '6px'}; font-size: ${isTwoInOne ? '6.5pt' : '8pt'}; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; display: flex; justify-content: space-between; line-height: 1;">
                <span>S-21-S&nbsp;&nbsp;11/23</span>
            </div>
        </div>
    `;
};

export const generateCardPagesArray = (
    publishersList: any[], 
    allReports: any[], 
    globalMembers: any[] = [], 
    layout: '2' | '1' = '2', 
    serviceYear = new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear(),
    customConfig?: Partial<S21Config>
): string[] => {
    const isTwoInOne = layout === '2';
    const config = { ...getSavedS21Config(isTwoInOne), ...(customConfig || {}) };

    if (!isTwoInOne) {
        return publishersList.map(pub => {
            const cardHtml = generateSingleCardHtml(pub, allReports, globalMembers, false, serviceYear, config);
            return `
                <div class="s21-card-page" style="width: 794px; height: 1123px; max-height: 1123px; margin: 0 auto; background: #ffffff; color: #000000; padding: ${config.cardPaddingY}px ${config.cardPaddingX}px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; overflow: hidden;">
                    <div class="s21-card-scale-wrapper" style="box-sizing: border-box; width: 100%; transform: scale(${config.tableScale ? config.tableScale / 100 : 1}); transform-origin: top center;">
                        ${cardHtml}
                    </div>
                </div>
            `;
        });
    }

    // 2 in 1: Two cards per page (A4 portrait)
    const pages: string[] = [];
    for (let i = 0; i < publishersList.length; i += 2) {
        const pub1 = publishersList[i];
        const pub2 = publishersList[i + 1] || null;

        const card1Html = generateSingleCardHtml(pub1, allReports, globalMembers, true, serviceYear, config);
        // If no second publisher (e.g. single publisher print), generate an authentic blank S-21 card below
        const card2Html = pub2 
            ? generateSingleCardHtml(pub2, allReports, globalMembers, true, serviceYear, config) 
            : generateSingleCardHtml({}, [], [], true, serviceYear, config);

        pages.push(`
            <div class="s21-card-page" style="width: 794px; height: 1123px; max-height: 1123px; margin: 0 auto; background: #ffffff; color: #000000; padding: ${config.cardPaddingY}px ${config.cardPaddingX}px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; display: flex; flex-direction: column; justify-content: flex-start; align-items: stretch; overflow: hidden;">
                <div class="s21-card-slot" style="box-sizing: border-box; width: 100%; height: 535px; max-height: 535px; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-start; flex-shrink: 0;">
                    <div class="s21-card-scale-wrapper" style="box-sizing: border-box; width: 100%; transform: scale(${config.tableScale ? config.tableScale / 100 : 1}); transform-origin: top center;">
                        ${card1Html}
                    </div>
                </div>
                <div style="border-top: 1px dashed #888888; margin: 6px 0; width: 100%; height: 0px; box-sizing: border-box; flex-shrink: 0;"></div>
                <div class="s21-card-slot" style="box-sizing: border-box; width: 100%; height: 535px; max-height: 535px; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-start; flex-shrink: 0;">
                    <div class="s21-card-scale-wrapper" style="box-sizing: border-box; width: 100%; transform: scale(${config.tableScale ? config.tableScale / 100 : 1}); transform-origin: top center;">
                        ${card2Html}
                    </div>
                </div>
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
    serviceYear = new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear(),
    customConfig?: Partial<S21Config>
): string => {
    return generateCardPagesArray(publishersList, allReports, globalMembers, layout, serviceYear, customConfig).join('');
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
