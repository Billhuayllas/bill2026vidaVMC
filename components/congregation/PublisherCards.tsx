import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { 
    Users, 
    Calendar, 
    Sparkles, 
    ShieldCheck, 
    Lock, 
    ArrowLeft, 
    Printer, 
    FileDown, 
    Edit3, 
    Eye, 
    Search, 
    Check, 
    SlidersHorizontal,
    Award,
    CalendarDays
} from 'lucide-react';
import { GroupMember, Publisher } from './types';
import { supabase } from '../../lib/supabase';
import { useCongregation } from '../../lib/CongregationContext';
import GlobalPublishersList from './GlobalPublishersList';
import { cleanNotes, isReportAuxiliar } from './utils';
import { BulkCardsModal } from './BulkCardsModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { printHtmlDocument, downloadHtmlAsPdf } from './printUtils';

declare const html2pdf: any;

interface EditableMonthRowProps {
    monthName: string;
    monthKey: string;
    targetMonthString: string;
    report: any | undefined;
    selectedPublisher: string;
    currentCongregation: any;
    onSaveSuccess: (updatedReports: any[]) => void;
}

const EditableMonthRow: React.FC<EditableMonthRowProps> = ({
    monthName,
    monthKey,
    targetMonthString,
    report,
    selectedPublisher,
    currentCongregation,
    onSaveSuccess,
}) => {
    // Determine initial values based on report
    let initialParticipo = true;
    let initialNotes = '';
    let initialHoras = '';
    let initialStudies = '';
    let initialAuxPrecursor = false;

    if (report) {
        if (report.participo !== undefined) {
            initialParticipo = report.participo;
        } else if (report.notas) {
            const matchPart = report.notas.match(/\{\{participo:(true|false)\}\}/);
            if (matchPart) {
                initialParticipo = matchPart[1] === 'true';
            }
        }

        initialAuxPrecursor = isReportAuxiliar(report);

        let rawNotes = report.notas || '';
        let he = Number(report.horas_especiales) || 0;
        const matchHe = rawNotes.match(/\{\{horas_especiales:(\d+)\}\}/);
        if (matchHe) {
            he = he || parseInt(matchHe[1], 10);
        }
        const matchHe2 = rawNotes.match(/\{\{he:(\d+)\}\}/);
        if (matchHe2) {
            he = he || parseInt(matchHe2[1], 10);
        }

        initialNotes = cleanNotes(rawNotes);
        
        const h = (Number(report.horas) || 0) + he;
        if (h > 0) initialHoras = String(h);

        const s = Number(report.estudios) || 0;
        if (s > 0) initialStudies = String(s);
    }

    const [localParticipo, setLocalParticipo] = useState(initialParticipo);
    const [localEstudios, setLocalEstudios] = useState(initialStudies);
    const [localAuxPrecursor, setLocalAuxPrecursor] = useState(initialAuxPrecursor);
    const [localHoras, setLocalHoras] = useState(initialHoras);
    const [localNotas, setLocalNotas] = useState(initialNotes);

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Sync with incoming state if publisher or year changes
    useEffect(() => {
        setLocalParticipo(initialParticipo);
        setLocalEstudios(initialStudies);
        setLocalAuxPrecursor(initialAuxPrecursor);
        setLocalHoras(initialHoras);
        setLocalNotas(initialNotes);
    }, [report, selectedPublisher, targetMonthString]);

    const handleLocalSave = async () => {
        if (!currentCongregation || !selectedPublisher) return;

        // Validation: Precursor Auxiliar must have at least 1 hour if participated
        if (localAuxPrecursor && localParticipo && Number(localHoras || 0) < 1) {
            alert("Un Precursor Auxiliar debe informar al menos 1 hora. Si participó sin horas, desmarque la casilla de Precursor Auxiliar para guardarlo como Publicador.");
            return;
        }

        setSaving(true);
        setSaved(false);
        try {
            const { data: existing, error: fetchErr } = await supabase
                .from('informes_ministerio')
                .select('*')
                .eq('publicador_nombre', selectedPublisher.trim())
                .eq('mes', targetMonthString)
                .eq('congregation_id', currentCongregation.id)
                .maybeSingle();

            if (fetchErr) throw fetchErr;

            let currentNotas = existing?.notas || '';
            const matchGroupId = currentNotas.match(/\{\{grupo_id:.*?\}\}/);
            const groupIdTag = matchGroupId ? matchGroupId[0] : '';
            const matchRol = currentNotas.match(/\{\{rol:(.*?)\}\}/);
            let rolTag = matchRol ? matchRol[0] : '';

            if (localAuxPrecursor) {
                if (matchRol) {
                    const currentRolName = matchRol[1];
                    if (!currentRolName.toLowerCase().includes('auxiliar')) {
                        const newRolName = currentRolName === 'Publicador' ? 'Precursor Auxiliar' : `${currentRolName}, Precursor Auxiliar`;
                        rolTag = `{{rol:${newRolName}}}`;
                    }
                }
            } else {
                if (matchRol && matchRol[1].toLowerCase().includes('auxiliar')) {
                    const cleanedRolName = matchRol[1].replace(/,?\s*Precursor Auxiliar\s*,?/gi, '').replace(/Auxiliar\s*/gi, '').trim() || 'Publicador';
                    rolTag = `{{rol:${cleanedRolName}}}`;
                }
            }

            // Build combined notes
            let combinedNotes = cleanNotes(localNotas);
            if (!localParticipo) {
                combinedNotes = `${combinedNotes} {{participo:false}}`.trim();
            } else if (Number(localHoras) === 0 || localHoras === '') {
                combinedNotes = `${combinedNotes} {{participo:true}}`.trim();
            }
            if (localAuxPrecursor) {
                combinedNotes = `${combinedNotes} {{precursor_auxiliar:true}}`.trim();
            }
            if (rolTag) {
                combinedNotes = `${combinedNotes} ${rolTag}`.trim();
            }
            if (groupIdTag) {
                combinedNotes = `${combinedNotes} ${groupIdTag}`.trim();
            }
            if (currentNotas.includes('{{locked:true}}')) {
                combinedNotes = `${combinedNotes} {{locked:true}}`.trim();
            }

            const reportPayload = {
                publicador_nombre: selectedPublisher.trim(),
                mes: targetMonthString,
                horas: localHoras === '' ? 0 : Number(localHoras),
                horas_especiales: 0,
                estudios: localEstudios === '' ? 0 : Number(localEstudios),
                notas: combinedNotes,
                congregation_id: currentCongregation.id
            };

            let saveError;
            if (existing) {
                const { error } = await supabase
                    .from('informes_ministerio')
                    .update(reportPayload)
                    .eq('id', existing.id);
                saveError = error;
            } else {
                const { error } = await supabase
                    .from('informes_ministerio')
                    .insert([reportPayload]);
                saveError = error;
            }

            if (saveError) throw saveError;

            // Fetch latest reports to propagate
            const { data: updatedData, error: refreshErr } = await supabase
                .from('informes_ministerio')
                .select('*')
                .eq('publicador_nombre', selectedPublisher.trim())
                .order('mes', { ascending: true });
            
            if (!refreshErr && updatedData) {
                onSaveSuccess(updatedData);
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e: any) {
            console.error("Error saving reports row:", e);
            alert(`Error guardando datos: ${e.message || JSON.stringify(e)}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <tr style={{ height: '30px', backgroundColor: '#fdfdfd' }}>
            <td style={{ border: '1.5px solid #000', padding: '3px 6px', fontSize: '9pt', fontWeight: 'bold', textTransform: 'capitalize', color: '#1e293b' }}>
                {monthName}
            </td>
            
            {/* Ministry Participation */}
            <td style={{ border: '1.5px solid #000', padding: '2px', textAlign: 'center' }}>
                <input 
                    type="checkbox" 
                    checked={localParticipo} 
                    onChange={e => setLocalParticipo(e.target.checked)} 
                    style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#2563eb' }} 
                />
            </td>
            
            {/* Bible Course / Studies */}
            <td style={{ border: '1.5px solid #000', padding: '2px', textAlign: 'center' }}>
                <input 
                    type="number" 
                    min="0" 
                    placeholder="0"
                    value={localEstudios} 
                    onChange={e => setLocalEstudios(e.target.value)}
                    style={{ 
                        width: '60px', 
                        padding: '2px 4px', 
                        fontSize: '9.5pt', 
                        fontWeight: '600', 
                        border: '1px solid #cbd5e1', 
                        borderRadius: '4px', 
                        textAlign: 'center',
                        color: '#0f172a'
                    }} 
                />
            </td>
            
            {/* Auxiliary Pioneer */}
            <td style={{ border: '1.5px solid #000', padding: '2px', textAlign: 'center' }}>
                <input 
                    type="checkbox" 
                    checked={localAuxPrecursor} 
                    onChange={e => setLocalAuxPrecursor(e.target.checked)} 
                    style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#2563eb' }} 
                />
            </td>
            
            {/* Horas */}
            <td style={{ border: '1.5px solid #000', padding: '2px', textAlign: 'center' }}>
                <input 
                    type="number" 
                    min="0" 
                    placeholder="0"
                    value={localHoras} 
                    onChange={e => setLocalHoras(e.target.value)}
                    style={{ 
                        width: '60px', 
                        padding: '2px 4px', 
                        fontSize: '9.5pt', 
                        fontWeight: '700', 
                        border: '1px solid #cbd5e1', 
                        borderRadius: '4px', 
                        textAlign: 'center',
                        color: '#0f172a'
                    }} 
                />
            </td>
            
            {/* Notes */}
            <td style={{ border: '1.5px solid #000', padding: '2px' }}>
                <input 
                    type="text" 
                    placeholder="Añadir observaciones..."
                    value={localNotas} 
                    onChange={e => setLocalNotas(e.target.value)}
                    style={{ 
                        width: '100%', 
                        padding: '2px 6px', 
                        fontSize: '9pt', 
                        border: '1px solid #cbd5e1', 
                        borderRadius: '4px', 
                        color: '#1e293b', 
                        boxSizing: 'border-box' 
                    }} 
                />
            </td>

            {/* Save Status Checkbox Action Button */}
            <td className="no-print" style={{ border: '1.5px solid #000', padding: '2px', textAlign: 'center' }}>
                <button 
                    onClick={handleLocalSave}
                    disabled={saving}
                    style={{ 
                        padding: '2px 8px', 
                        fontSize: '8pt', 
                        fontWeight: 'bold', 
                        backgroundColor: saved ? '#10b981' : '#2563eb', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        transition: 'background-color 0.2s',
                        height: '22px',
                        minWidth: '66px'
                    }}
                >
                    {saving ? (
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 1s linear infinite' }} />
                    ) : saved ? (
                        <span>✓ OK</span>
                    ) : (
                        <span>💾 Guardar</span>
                    )}
                </button>
            </td>
        </tr>
    );
};

interface PublisherCardsProps {
    globalMembers: GroupMember[];
    masterPublishers: Publisher[];
    updatePublisherDetails?: (publisherName: string, direccion: string, contacto_emergencia: string, telefono_personal?: string, genero?: string, fecha_nacimiento?: string, fecha_bautismo?: string, esperanza?: string, inicio_precursor_mes?: string, fecha_nombramiento?: string) => Promise<void>;
    updateMemberRole?: (memberId: number, newRole: any) => Promise<void>;
    groups?: any[];
    onRefresh?: () => void;
    isReadOnly?: boolean;
}

const PublisherCards: React.FC<PublisherCardsProps> = ({ masterPublishers, globalMembers, updatePublisherDetails, updateMemberRole, groups = [], onRefresh, isReadOnly = false }) => {
    const { currentCongregation } = useCongregation();
    const [selectedPublisher, setSelectedPublisher] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isOpenDropdown, setIsOpenDropdown] = useState<boolean>(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('todos');
    
    useEffect(() => {
        setSearchQuery(selectedPublisher);
    }, [selectedPublisher]);

    useEffect(() => {
        if (selectedGroupId && selectedGroupId !== 'todos') {
            if (selectedPublisher) {
                const member = globalMembers.find(m => m.publicador_nombre.trim() === selectedPublisher.trim());
                if (!member || String(member.grupo_id) !== String(selectedGroupId)) {
                    setSelectedPublisher('');
                    setSearchQuery('');
                }
            }
        }
    }, [selectedGroupId, selectedPublisher, globalMembers]);

    const filteredPublishers = masterPublishers
        .filter(p => p.clasificacion_vmt !== 'estudiante_vmt')
        .filter(p => {
            if (selectedGroupId && selectedGroupId !== 'todos') {
                const memberRow = globalMembers.find(gm => gm.publicador_nombre.trim() === p.nombre.trim());
                return memberRow && String(memberRow.grupo_id) === String(selectedGroupId);
            }
            return true;
        });

    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchedPublisher, setFetchedPublisher] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const handleDownloadPng = async () => {
        if (!cardRef.current) return;
        try {
            const canvas = await html2canvas(cardRef.current, { 
                scale: 2, 
                useCORS: true,
                ignoreElements: (el: HTMLElement) => {
                    return el.classList.contains('no-print') || el.getAttribute('data-html2canvas-ignore') === 'true';
                }
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `Registro_${selectedPublisher}_${serviceYear}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Error generating image:', error);
            alert('Hubo un error al generar la imagen.');
        }
    };

    const handleDownloadPdf = async () => {
        if (!cardRef.current) return;
        try {
            if (typeof html2pdf !== 'undefined') {
                const element = cardRef.current;
                const opt = {
                    margin: [10, 10, 10, 10],
                    filename: `Registro_${selectedPublisher}_${serviceYear}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { 
                        scale: 2, 
                        useCORS: true, 
                        logging: false,
                        ignoreElements: (el: HTMLElement) => {
                            return el.classList.contains('no-print') || el.getAttribute('data-html2canvas-ignore') === 'true';
                        }
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                await html2pdf().from(element).set(opt).save();
            } else {
                window.print();
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            window.print();
        }
    };

    // Dynamic calculation of JW Service Year (runs Sep X-1 to Aug X)
    const currentMonthIndex = new Date().getMonth() + 1; // 1-12
    const defaultServiceYear = currentMonthIndex >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear();
    const [serviceYear, setServiceYear] = useState<number>(defaultServiceYear);

    const [previewModalData, setPreviewModalData] = useState<{
        isOpen: boolean;
        pages: string[];
        title: string;
        fileName: string;
        layoutLabel?: string;
    } | null>(null);

    const handlePreviewCardPdf = () => {
        if (!cardRef.current) return;
        const contentHtml = cardRef.current.innerHTML;
        const pageHtml = `
            <div class="s21-card-page" style="width: 794px; min-height: 1080px; margin: 0 auto; background: #ffffff; color: #000000; padding: 24px 28px; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif;">
                ${contentHtml}
            </div>
        `;
        setPreviewModalData({
            isOpen: true,
            pages: [pageHtml],
            title: `Registro de Publicador S-21 - ${pubDetails?.nombre || selectedPublisher}`,
            fileName: `Registro_${selectedPublisher}_${serviceYear}.pdf`,
            layoutLabel: 'Ficha Individual'
        });
    };

    // Helpers to support DD/MM/AAAA format conversion for display
    const sanitizeAndFormatDate = (val: string | undefined): string => {
        if (!val) return '';
        const trimmed = val.trim();
        // Already in DD/MM/AAAA format
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
        
        // Check if it's YYYY-MM-DD
        const ymd = trimmed.split('-');
        if (ymd.length === 3 && ymd[0].length === 4) {
            return `${ymd[2]}/${ymd[1]}/${ymd[0]}`;
        }
        
        // Check if it's MM/DD/YYYY
        const mdy = trimmed.split('/');
        if (mdy.length === 3 && mdy[2].length === 4) {
            const d = parseInt(mdy[1], 10);
            const m = parseInt(mdy[0], 10);
            if (m <= 12 && d <= 31) {
                const dd = d.toString().padStart(2, '0');
                const mm = m.toString().padStart(2, '0');
                return `${dd}/${mm}/${mdy[2]}`;
            }
        }
        return trimmed;
    };

    const calculateAge = (bornStr: string | undefined): string => {
        if (!bornStr) return 'No especificada';
        const formatted = sanitizeAndFormatDate(bornStr);
        const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!match) return 'Ej. 01/01/1990';
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        
        const today = new Date();
        let age = today.getFullYear() - year;
        const m = today.getMonth() + 1 - month;
        if (m < 0 || (m === 0 && today.getDate() < day)) {
            age--;
        }
        return age >= 0 ? `${age} años` : 'Fecha de nacimiento futura';
    };

    const convertToYmd = (dateStr: string | undefined): string => {
        if (!dateStr) return '';
        const cleanStr = dateStr.trim();
        // Already YYYY-MM-DD?
        const ymd = cleanStr.split('-');
        if (ymd.length === 3 && ymd[0].length === 4) {
            return cleanStr;
        }
        // Is it DD/MM/AAAA or DD/MM/YYYY?
        const dma = cleanStr.split('/');
        if (dma.length === 3) {
            const d = dma[0].padStart(2, '0');
            const m = dma[1].padStart(2, '0');
            const y = dma[2];
            if (y.length === 4) {
                return `${y}-${m}-${d}`;
            }
        }
        return '';
    };

    const convertToYm = (dateStr: string | undefined): string => {
        if (!dateStr) return '';
        const cleanStr = dateStr.trim().toLowerCase();
        if (!cleanStr) return '';

        // Check if YYYY-MM
        if (/^\d{4}-\d{2}$/.test(cleanStr)) {
            return cleanStr;
        }

        // Check if YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
            return cleanStr.substring(0, 7);
        }

        // Check if DD/MM/YYYY
        const dma = cleanStr.split('/');
        if (dma.length === 3) {
            const y = dma[2];
            const m = dma[1].padStart(2, '0');
            if (y.length === 4) {
                return `${y}-${m}`;
            }
        } else if (dma.length === 2) {
            // Is it MM/YYYY or MM/YY?
            const m = dma[0].padStart(2, '0');
            const y = dma[1];
            if (y.length === 4) {
                return `${y}-${m}`;
            }
        }

        // Try Spanish month + year, e.g. "septiembre 2024" or "septiembre de 2024"
        const monthsMap: Record<string, string> = {
            enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
            julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
            ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
            jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12'
        };

        // Extract numbers and words
        const words = cleanStr.match(/[a-zñáéíóú]+/g) || [];
        const numbers = cleanStr.match(/\d+/g) || [];

        let monthNum = '';
        for (const w of words) {
            // Normalize accents
            const normWord = w.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (monthsMap[normWord]) {
                monthNum = monthsMap[normWord];
                break;
            }
        }

        let yearNum = '';
        for (const n of numbers) {
            if (n.length === 4) {
                yearNum = n;
            }
        }

        if (monthNum && yearNum) {
            return `${yearNum}-${monthNum}`;
        }

        return '';
    };

    const formatYmToSpanish = (ymStr: string | undefined): string => {
        if (!ymStr) return 'No especificado';
        const trimmed = ymStr.trim();
        if (!trimmed) return 'No especificado';

        // Check if format is YYYY-MM
        const match = trimmed.match(/^(\d{4})-(\d{2})$/);
        if (match) {
            const year = match[1];
            const monthCode = match[2];
            const monthsList = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            const monthIndex = parseInt(monthCode, 10) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
                return `${monthsList[monthIndex]} ${year}`;
            }
        }
        
        return trimmed;
    };

    const calculateMonthsSince = (dateStr: string | undefined): string => {
        if (!dateStr) return '';
        const cleanStr = dateStr.trim();
        if (!cleanStr) return '';
        
        let year = 0;
        let month = 0;
        let day = 1;

        // Try YYYY-MM
        const ym = cleanStr.split('-');
        if (ym.length === 2 && ym[0].length === 4) {
            year = parseInt(ym[0], 10);
            month = parseInt(ym[1], 10);
        } else if (ym.length === 3 && ym[0].length === 4) { // YYYY-MM-DD
            year = parseInt(ym[0], 10);
            month = parseInt(ym[1], 10);
            day = parseInt(ym[2], 10);
        } else {
            // Try DD/MM/AAAA or DD/MM/YYYY
            const dma = cleanStr.split('/');
            if (dma.length === 3) {
                if (dma[2].length === 4) {
                    const val1 = parseInt(dma[0], 10);
                    const val2 = parseInt(dma[1], 10);
                    const val3 = parseInt(dma[2], 10);
                    day = val1;
                    month = val2;
                    year = val3;
                }
            } else if (dma.length === 2) {
                // MM/YYYY
                const val1 = parseInt(dma[0], 10);
                const val2 = parseInt(dma[1], 10);
                month = val1;
                year = val2;
            } else {
                // Try converting Spanish text month-year input
                const convertYmResult = convertToYm(cleanStr);
                if (convertYmResult) {
                    const parts = convertYmResult.split('-');
                    year = parseInt(parts[0], 10);
                    month = parseInt(parts[1], 10);
                }
            }
        }

        if (isNaN(year) || isNaN(month) || year <= 0 || month <= 0 || month > 12) {
            return '';
        }

        const startDate = new Date(year, month - 1, day);
        if (isNaN(startDate.getTime())) return '';
        
        const today = new Date();
        if (startDate > today) return 'Fecha futura';

        const yearsDiff = today.getFullYear() - startDate.getFullYear();
        const monthsDiff = today.getMonth() - startDate.getMonth();
        const totalMonths = (yearsDiff * 12) + monthsDiff;

        if (totalMonths <= 0) {
            return 'Menos de 1 mes';
        } else if (totalMonths < 12) {
            return `${totalMonths} ${totalMonths === 1 ? 'mes' : 'meses'}`;
        } else {
            const years = Math.floor(totalMonths / 12);
            const remainingMonths = totalMonths % 12;
            let result = `${years} ${years === 1 ? 'año' : 'años'}`;
            if (remainingMonths > 0) {
                result += ` y ${remainingMonths} ${remainingMonths === 1 ? 'mes' : 'meses'}`;
            }
            result += ` (total: ${totalMonths} ${totalMonths === 1 ? 'mes' : 'meses'})`;
            return result;
        }
    };

    useEffect(() => {
        if (!selectedPublisher) {
            setReports([]);
            setFetchedPublisher('');
            return;
        }

        const fetchReports = async () => {
            setLoading(true);
            try {
                // Fetch reports. Trim name comparison is performed post-fetch to guarantee match.
                const { data, error } = await supabase
                    .from('informes_ministerio')
                    .select('*')
                    .eq('publicador_nombre', selectedPublisher.trim())
                    .order('mes', { ascending: true });
                
                if (error) throw error;
                setReports(data || []);
            } catch (err) {
                console.error("Error fetching reports:", err);
            } finally {
                setFetchedPublisher(selectedPublisher);
                setLoading(false);
            }
        };

        fetchReports();
    }, [selectedPublisher]);

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
        { key: '08', name: 'agosto' },
    ];

    const pubDetails = masterPublishers.find(p => p.nombre.trim() === selectedPublisher.trim());
    const globalMemberDetails = globalMembers.find(p => p.publicador_nombre.trim() === selectedPublisher.trim());
    const pubStatusRow = globalMemberDetails?.rol || 'Publicador';

    const handleRoleToggle = (roleToToggle: 'Anciano' | 'Siervo ministerial' | 'Precursor Regular' | 'Precursor Especial' | 'Misionero' | 'Eximido de meta') => {
        if (!globalMemberDetails || !updateMemberRole) return;
        
        const currentRol = globalMemberDetails.rol || 'Publicador';
        
        // Let's parse the parts
        let parts = currentRol.split(/[,y]/).map(p => p.trim()).filter(p => p && p !== 'Publicador' && p !== 'Ninguno');
        
        // Map to exact cases
        parts = parts.map(p => {
            const low = p.toLowerCase();
            if (low === 'anciano') return 'Anciano';
            if (low === 'siervo ministerial') return 'Siervo ministerial';
            if (low === 'precursor regular') return 'Precursor Regular';
            if (low === 'precursor especial') return 'Precursor Especial';
            if (low === 'misionero') return 'Misionero';
            return p;
        });

        const hasRole = parts.includes(roleToToggle);
        
        if (hasRole) {
            // Remove it
            parts = parts.filter(p => p !== roleToToggle);
        } else {
            // Mutual exclusivity checking
            if (roleToToggle === 'Anciano') {
                parts = parts.filter(p => p !== 'Siervo ministerial');
                parts.push('Anciano');
            } else if (roleToToggle === 'Siervo ministerial') {
                parts = parts.filter(p => p !== 'Anciano');
                parts.push('Siervo ministerial');
            } else if (roleToToggle === 'Precursor Regular') {
                parts = parts.filter(p => p !== 'Precursor Especial');
                parts.push('Precursor Regular');
            } else if (roleToToggle === 'Precursor Especial') {
                parts = parts.filter(p => p !== 'Precursor Regular');
                parts.push('Precursor Especial');
            } else {
                parts.push(roleToToggle);
            }
        }
        
        let finalRol = parts.join(', ');
        if (!finalRol) {
            finalRol = 'Publicador';
        }
        
        if (!hasRole && (roleToToggle === 'Precursor Regular' || roleToToggle === 'Precursor Especial')) {
            if (!pubDetails?.inicio_precursor_mes) {
                const today = new Date();
                const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                handleDetailChange('inicio_precursor_mes', ym);
            }
        }
        
        updateMemberRole(globalMemberDetails.id, finalRol);
    };

    // Local inputs value states to prevent update latency and keyword loss
    const [localBirth, setLocalBirth] = useState('');
    const [localBaptism, setLocalBaptism] = useState('');

    useEffect(() => {
        if (pubDetails) {
            setLocalBirth(sanitizeAndFormatDate(pubDetails.fecha_nacimiento));
            setLocalBaptism(sanitizeAndFormatDate(pubDetails.fecha_bautismo));
        } else {
            setLocalBirth('');
            setLocalBaptism('');
        }
    }, [selectedPublisher, pubDetails]);

    const handleDetailChange = (field: string, value: string) => {
        if (!pubDetails || !updatePublisherDetails) return;
        updatePublisherDetails(
            pubDetails.nombre,
            field === 'direccion' ? value : pubDetails.direccion || '',
            field === 'contacto_emergencia' ? value : pubDetails.contacto_emergencia || '',
            field === 'telefono_personal' ? value : pubDetails.telefono_personal || '',
            field === 'genero' ? value : pubDetails.genero || '',
            field === 'fecha_nacimiento' ? value : pubDetails.fecha_nacimiento || '',
            field === 'fecha_bautismo' ? value : pubDetails.fecha_bautismo || '',
            field === 'esperanza' ? value : pubDetails.esperanza || '',
            field === 'inicio_precursor_mes' ? value : pubDetails.inicio_precursor_mes || '',
            field === 'fecha_nombramiento' ? value : pubDetails.fecha_nombramiento || ''
        );
    };

    const handleSaveLocalField = (field: 'fecha_nacimiento' | 'fecha_bautismo', value: string) => {
        // Simple client-side formatting assistance as they type or blur
        handleDetailChange(field, value);
    };

    if (!selectedPublisher) {
        return (
            <GlobalPublishersList 
                groups={groups} 
                globalMembers={globalMembers} 
                masterPublishers={masterPublishers} 
                onRefresh={onRefresh || (() => {})} 
                onSelectPublisher={setSelectedPublisher} 
                isReadOnly={isReadOnly}
            />
        );
    }

    return (
        <div className="bg-slate-50 md:bg-[#f8fafc] rounded-none md:rounded-2xl p-3 md:p-6 border-0 md:border border-slate-200 max-w-[1050px] mx-auto shadow-none md:shadow-sm w-full relative">
            <style>{`
                @media screen {
                    /* Modern beautiful rounded screens view overrides */
                    .publisher-card-container {
                        border: 1px solid #e2e8f0 !important;
                        border-radius: 16px !important;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05) !important;
                        padding: 24px 30px !important;
                        background-color: #ffffff !important;
                    }
                    .publisher-card-title {
                        color: #1e293b !important;
                        font-weight: 800 !important;
                        border-bottom: 2.5px solid #3b82f6 !important;
                        padding-bottom: 12px !important;
                        letter-spacing: 0.05em !important;
                    }
                    .control-interno-panel {
                        background-color: #f8fafc !important;
                        border: 1.5px dashed #cbd5e1 !important;
                        border-radius: 12px !important;
                        padding: 16px 20px !important;
                        margin-bottom: 20px !important;
                    }
                    .privileges-panel {
                        background-color: #f8fafc !important;
                        border: 1px solid #e2e8f0 !important;
                        border-radius: 10px !important;
                        padding: 10px 16px !important;
                        margin-bottom: 20px !important;
                    }
                    .identity-input-line {
                        border-bottom: 1.5px solid #cbd5e1 !important;
                        transition: border-bottom-color 0.2s !important;
                        color: #0f172a !important;
                    }
                    .identity-input-line:focus-within {
                        border-bottom-color: #3b82f6 !important;
                    }
                    .publisher-table {
                        border-collapse: separate !important;
                        border-spacing: 0 !important;
                        border: 1.5px solid #cbd5e1 !important;
                        border-radius: 12px !important;
                        overflow: hidden !important;
                        margin-top: 16px !important;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02) !important;
                    }
                    .publisher-table th {
                        border: none !important;
                        border-right: 1px solid #cbd5e1 !important;
                        border-bottom: 1.5px solid #cbd5e1 !important;
                        background-color: #f8fafc !important;
                        color: #475569 !important;
                        font-weight: 700 !important;
                        padding: 8px 10px !important;
                    }
                    .publisher-table th:last-child {
                        border-right: none !important;
                    }
                    .publisher-table td {
                        border: none !important;
                        border-right: 1px solid #f1f5f9 !important;
                        border-bottom: 1px solid #f1f5f9 !important;
                        padding: 6px 10px !important;
                        color: #334155 !important;
                    }
                    .publisher-table td:last-child {
                        border-right: none !important;
                    }
                    .publisher-table tr:hover td {
                        background-color: #f8fafc !important;
                    }
                    .publisher-table tr:last-child td {
                        border-bottom: none !important;
                    }
                    .publisher-table tfoot tr td {
                        border-top: 1.5px solid #cbd5e1 !important;
                        background-color: #f8fafc !important;
                        font-weight: 700 !important;
                        color: #1e293b !important;
                    }
                    /* Mobile squash rules to see the entire table without horizontal scroll */
                    @media screen and (max-width: 768px) {
                        .publisher-card-container {
                            min-width: 100% !important;
                            padding: 12px 6px !important;
                        }
                        .publisher-card-title {
                            font-size: 14px !important;
                        }
                        .publisher-table {
                            table-layout: fixed !important;
                            width: 100% !important;
                        }
                        .publisher-table th:nth-child(1), .publisher-table td:nth-child(1) { width: 15% !important; } /* Año */
                        .publisher-table th:nth-child(2), .publisher-table td:nth-child(2) { width: 22% !important; } /* Part. Min. */
                        .publisher-table th:nth-child(3), .publisher-table td:nth-child(3) { width: 16% !important; } /* Cursos */
                        .publisher-table th:nth-child(4), .publisher-table td:nth-child(4) { width: 17% !important; } /* Precursor */
                        .publisher-table th:nth-child(5), .publisher-table td:nth-child(5) { width: 12% !important; } /* Horas */
                        .publisher-table th:nth-child(6), .publisher-table td:nth-child(6) { width: 18% !important; } /* Notas */
                        .publisher-table th:nth-child(7), .publisher-table td:nth-child(7) { width: 16% !important; } /* Acción */
                        
                        .publisher-table th, .publisher-table td {
                            padding: 3px 2px !important;
                            font-size: 8px !important;
                            word-wrap: break-word;
                            word-break: break-word;
                            white-space: normal;
                            letter-spacing: -0.02em;
                        }
                        .publisher-table th[style], .publisher-table td[style] {
                            font-size: 8px !important;
                        }
                        .top-info-tables {
                            flex-direction: column !important;
                            gap: 10px !important;
                        }
                        .top-info-tables table th, .top-info-tables table td {
                            font-size: 8.5px !important;
                            padding: 3px !important;
                        }
                        .identity-details-grid {
                            grid-template-columns: 1fr !important;
                            gap: 10px !important;
                        }
                    }
                }
                @media print {
                    @page {
                        size: portrait;
                        margin: 10mm 12mm 10mm 12mm;
                    }
                    /* Base body reset on print */
                    body {
                        background-color: #fff !important;
                        color: #000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Hide everything inside body on print */
                    body * {
                        visibility: hidden !important;
                    }
                    /* Show ONLY the card and its children */
                    #publisher-card-print, #publisher-card-print * {
                        visibility: visible !important;
                    }
                    /* Position the card at the absolute top-left of the page so it prints beautifully without white spaces or blank pages */
                    #publisher-card-print {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        min-width: 100% !important;
                        border: 2px solid #000 !important;
                        padding: 15px !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        background: #fff !important;
                        color: #000 !important;
                        display: block !important;
                    }
                    /* Table styling optimized for contrast on paper */
                    .publisher-table {
                        width: 100% !important;
                        table-layout: fixed !important;
                        border-collapse: collapse !important;
                        border: 1.5px solid #000 !important;
                    }
                    .publisher-table th, .publisher-table td {
                        border: 1.5px solid #000 !important;
                        padding: 5px 4px !important;
                        font-size: 8.5pt !important;
                        color: #000 !important;
                        background-color: #fff !important;
                        word-break: break-all !important;
                    }
                    /* Text inputs rendering perfectly as underlined fields */
                    #publisher-card-print input {
                        border: none !important;
                        border-bottom: 1px dashed #000 !important;
                        background: transparent !important;
                        outline: none !important;
                        color: #000 !important;
                        font-family: inherit !important;
                        font-size: 11pt !important;
                        box-shadow: none !important;
                        padding-bottom: 2px !important;
                    }
                    #publisher-card-print input::placeholder {
                        color: transparent !important;
                    }
                }
            `}</style>
            
            {/* Control Dashboard Header Panel */}
            <div className="sticky top-[52px] sm:top-[58px] z-20 mb-5 shadow-md md:shadow-none no-print" style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            📁 Ficha de Publicador
                        </h2>
                    </div>
                    {selectedPublisher && pubDetails && (
                        <div className="flex flex-col gap-3 w-full lg:w-auto mt-2 sm:mt-0">
                            {/* Functional Group 1: Navigation & Edits */}
                            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedPublisher('');
                                        setSearchQuery('');
                                    }}
                                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs sm:text-sm transition-colors whitespace-nowrap active:scale-95 cursor-pointer"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                    <span>Volver</span>
                                </button>
                                {!isReadOnly && (
                                    <button
                                        onClick={() => {
                                            if (isEditMode) {
                                                setIsEditMode(false);
                                            } else {
                                                const code = prompt('Ingrese la contraseña para edición (9803):');
                                                if (code === '9803') {
                                                    setIsEditMode(true);
                                                } else if (code !== null) {
                                                    alert('Contraseña incorrecta');
                                                }
                                            }
                                        }}
                                        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2.5 text-white rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap active:scale-95 cursor-pointer border ${isEditMode ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700 shadow-emerald-600/30' : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600 shadow-amber-500/25'}`}
                                    >
                                        {isEditMode ? (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4"><polyline points="22 11.08 11.68 22 7.23 17.54"></polyline><path d="M22 4L12 14.01l-3-3"></path></svg>
                                                <span>Ver Ficha</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                <span>Modo Edición</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Divider line between control groups */}
                            <div className="w-full h-px bg-slate-200 dark:bg-slate-700 my-0.5"></div>

                            {/* Functional Group 2: Document & Export Actions */}
                            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
                                <button
                                    onClick={handlePreviewCardPdf}
                                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-extrabold text-xs sm:text-sm transition-all whitespace-nowrap no-print cursor-pointer border border-indigo-700 shadow-sm shadow-indigo-600/30 active:scale-95 text-center"
                                    title="Previsualizar documento PDF"
                                >
                                    <Eye className="w-4 h-4 shrink-0" strokeWidth={2.4} />
                                    <span className="truncate">Previsualizar</span>
                                </button>
                                <button
                                    onClick={handleDownloadPdf}
                                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-extrabold text-xs sm:text-sm transition-all whitespace-nowrap no-print cursor-pointer border border-rose-700 shadow-sm shadow-rose-600/30 active:scale-95 text-center"
                                >
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span className="truncate">Descargar PDF</span>
                                </button>
                                <button
                                    onClick={handleDownloadPng}
                                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-extrabold text-xs sm:text-sm transition-all whitespace-nowrap no-print cursor-pointer border border-emerald-700 shadow-sm shadow-emerald-600/30 active:scale-95 text-center"
                                >
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span className="truncate">Descargar PNG</span>
                                </button>
                                <button 
                                    onClick={() => {
                                        window.print();
                                    }}
                                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-extrabold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer border border-blue-700 shadow-sm shadow-blue-600/30 active:scale-95 text-center"
                                >
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                    <span className="truncate">Imprimir</span>
                                </button>
                                <button
                                    onClick={() => setShowBulkModal(true)}
                                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 rounded-xl font-extrabold text-xs sm:text-sm transition-all whitespace-nowrap no-print cursor-pointer border border-slate-950 dark:border-white shadow-sm active:scale-95 text-center"
                                >
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <span className="truncate">Masivo (2 en 1)</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>

                    {/* Service Year Selector */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', tracking: '0.05em' }}>Año de Servicio</label>
                        <select 
                            value={serviceYear} 
                            onChange={e => setServiceYear(parseInt(e.target.value, 10))}
                            style={{ 
                                width: '100%', 
                                padding: '11px 14px', 
                                borderRadius: '8px', 
                                border: '1.5px solid #cbd5e1', 
                                backgroundColor: 'white', 
                                fontWeight: '600', 
                                color: '#1e293b', 
                                fontSize: '0.95rem',
                                outline: 'none', 
                                cursor: 'pointer',
                                transition: 'border-color 0.15s, box-shadow 0.15s',
                                boxSizing: 'border-box'
                            }}
                        >
                            {Array.from({ length: 5 }, (_, i) => defaultServiceYear - 2 + i).map(y => (
                                <option key={y} value={y}>Año de Servicio {y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #cbd5e1', borderTopColor: '#2563eb', animation: 'spin 1s linear infinite' }} />
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#64748b' }}>Cargando ficha de registro...</span>
                </div>
            )}

            {!loading && !selectedPublisher && (
                <div style={{ backgroundColor: 'white', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '64px 24px', textAlign: 'center', color: '#64748b' }}>
                    <svg style={{ width: '48px', height: '48px', margin: '0 auto 12px auto', color: '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '600', color: '#334155', margin: '0 0 4px 0' }}>Ficha vacía</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>Seleccione un publicador de la lista superior para visualizar su historial de ministerio.</p>
                </div>
            )}

            {!loading && selectedPublisher && fetchedPublisher === selectedPublisher && pubDetails && (
                <div style={{ width: '100%' }}>
                    {isEditMode && (
                        <div className="no-print" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', marginBottom: '24px', fontSize: '0.9rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <svg style={{ width: '24px', height: '24px', flexShrink: 0, color: '#3b82f6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>
                                <strong>✍️ Modo Edición Activo:</strong> Ahora puede rellenar o modificar los informes de meses anteriores directamente desde la tabla de abajo. Cuando termine de modificar una fila, haga clic en su respectivo botón <strong>💾 Guardar</strong> para registrar los cambios.
                            </span>
                        </div>
                    )}

                    <div className="w-full max-w-full overflow-x-auto overflow-y-hidden bg-slate-100 p-2 sm:p-4 rounded-xl flex justify-center">
                        <div 
                            ref={cardRef} 
                            id="publisher-card-print" 
                            className="publisher-card-container bg-white" 
                            style={{ 
                                border: '1px solid #d1d5db', 
                                padding: '24px 28px', 
                                backgroundColor: '#ffffff', 
                                color: '#000000', 
                                fontFamily: 'Arial, Helvetica, sans-serif', 
                                width: '100%', 
                                maxWidth: '780px', 
                                boxSizing: 'border-box', 
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)' 
                            }}
                        >
                            {/* Header Card Title */}
                            <h1 className="publisher-card-title" style={{ textAlign: 'center', fontSize: '13.5pt', fontWeight: 'bold', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.02em', color: '#000' }}>
                                REGISTRO DE PUBLICADOR DE LA CONGREGACIÓN
                            </h1>

                            {/* Control Interno (No se imprime) - Estilo iOS Elegante */}
                            <div className="no-print control-interno-panel" style={{ 
                                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '16px', 
                                padding: '14px 16px', 
                                marginBottom: '18px', 
                                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02)',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 2px 6px rgba(59, 130, 246, 0.25)' }}>
                                            <Lock size={12} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: '700', fontSize: '8pt', textTransform: 'uppercase', color: '#1e293b', letterSpacing: '0.04em' }}>
                                                Control Interno de la Congregación
                                            </span>
                                            <span style={{ display: 'block', fontSize: '6.8pt', color: '#64748b', fontWeight: '500', marginTop: '-1px' }}>
                                                Solo visible en pantalla (no se imprime en la tarjeta S-21)
                                            </span>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '6.8pt', fontWeight: '700', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', letterSpacing: '0.03em' }}>
                                        Ficha Digital
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                                    {/* Grupo al que pertenece */}
                                    <div style={{ 
                                        backgroundColor: '#ffffff', 
                                        borderRadius: '12px', 
                                        padding: '10px 12px', 
                                        border: '1px solid #e2e8f0', 
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                                                <Users size={12} strokeWidth={2.5} />
                                            </div>
                                            <span style={{ fontSize: '7pt', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.03em' }}>Grupo Asignado</span>
                                        </div>
                                        <div style={{ fontSize: '9.5pt', fontWeight: '700', color: '#0f172a', paddingLeft: '28px' }}>
                                            {globalMembers.find(p => p.publicador_nombre.trim() === selectedPublisher.trim()) ? (
                                                groups.find(g => g.id === globalMembers.find(p => p.publicador_nombre.trim() === selectedPublisher.trim())?.grupo_id)?.nombre || 'Sin Grupo asignado'
                                            ) : 'Sin Grupo asignado'}
                                        </div>
                                    </div>
                                    
                                    {/* Edad del publicador */}
                                    <div style={{ 
                                        backgroundColor: '#ffffff', 
                                        borderRadius: '12px', 
                                        padding: '10px 12px', 
                                        border: '1px solid #e2e8f0', 
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
                                                <CalendarDays size={12} strokeWidth={2.5} />
                                            </div>
                                            <span style={{ fontSize: '7pt', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.03em' }}>Edad del Publicador</span>
                                        </div>
                                        <div style={{ fontSize: '9.5pt', fontWeight: '700', color: '#0f172a', paddingLeft: '28px' }}>
                                            {calculateAge(pubDetails.fecha_nacimiento)}
                                        </div>
                                    </div>
                                    
                                    {/* Mes y año de inicio de precursor regular */}
                                    <div style={{ 
                                        backgroundColor: '#ffffff', 
                                        borderRadius: '12px', 
                                        padding: '10px 12px', 
                                        border: '1px solid #e2e8f0', 
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                                                <Sparkles size={12} strokeWidth={2.5} />
                                            </div>
                                            <span style={{ fontSize: '7pt', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.03em' }}>Inicio Precursor Regular</span>
                                        </div>
                                        <div style={{ paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <input 
                                                    type="month"
                                                    value={convertToYm(pubDetails.inicio_precursor_mes)}
                                                    onChange={e => handleDetailChange('inicio_precursor_mes', e.target.value)}
                                                    disabled={isReadOnly}
                                                    style={{ 
                                                        fontSize: '8.5pt', 
                                                        padding: '3px 8px', 
                                                        borderRadius: '8px', 
                                                        border: '1px solid #cbd5e1', 
                                                        outline: 'none', 
                                                        backgroundColor: isReadOnly ? '#f8fafc' : '#ffffff',
                                                        color: '#0f172a',
                                                        fontWeight: '600',
                                                        width: '100%',
                                                        maxWidth: '135px',
                                                        boxSizing: 'border-box',
                                                        cursor: isReadOnly ? 'default' : 'pointer',
                                                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                                                    }}
                                                />
                                                {pubDetails.inicio_precursor_mes && (
                                                    <span style={{ fontSize: '8pt', color: '#475569', fontWeight: '600' }}>
                                                        ({formatYmToSpanish(pubDetails.inicio_precursor_mes)})
                                                    </span>
                                                )}
                                            </div>
                                            {pubDetails.inicio_precursor_mes && calculateMonthsSince(pubDetails.inicio_precursor_mes) && (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '7pt', color: '#047857', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontWeight: '600', width: 'fit-content' }}>
                                                    <span>Transcurrido:</span>
                                                    <strong>{calculateMonthsSince(pubDetails.inicio_precursor_mes)}</strong>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mes y año de nombramiento de ministerial o anciano */}
                                    <div style={{ 
                                        backgroundColor: '#ffffff', 
                                        borderRadius: '12px', 
                                        padding: '10px 12px', 
                                        border: '1px solid #e2e8f0', 
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                                                <ShieldCheck size={12} strokeWidth={2.5} />
                                            </div>
                                            <span style={{ fontSize: '7pt', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.03em' }}>Nombramiento Min. / Anciano</span>
                                        </div>
                                        <div style={{ paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {isEditMode ? (
                                                <input 
                                                    type="date"
                                                    value={convertToYmd(pubDetails.fecha_nombramiento)}
                                                    onChange={e => handleDetailChange('fecha_nombramiento', e.target.value)}
                                                    style={{ 
                                                        fontSize: '8.5pt', 
                                                        padding: '3px 8px', 
                                                        borderRadius: '8px', 
                                                        border: '1px solid #cbd5e1', 
                                                        outline: 'none', 
                                                        backgroundColor: '#ffffff',
                                                        color: '#0f172a',
                                                        fontWeight: '600',
                                                        width: '100%',
                                                        maxWidth: '140px',
                                                        boxSizing: 'border-box',
                                                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                                                    }}
                                                />
                                            ) : (
                                                <span style={{ fontSize: '9.5pt', fontWeight: '600', color: '#0f172a' }}>
                                                    {pubDetails.fecha_nombramiento ? sanitizeAndFormatDate(pubDetails.fecha_nombramiento) : 'No especificado'}
                                                </span>
                                            )}
                                            {pubDetails.fecha_nombramiento && calculateMonthsSince(pubDetails.fecha_nombramiento) && (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '7pt', color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '6px', fontWeight: '600', width: 'fit-content' }}>
                                                    <span>Transcurrido:</span>
                                                    <strong>{calculateMonthsSince(pubDetails.fecha_nombramiento)}</strong>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Identity Details Fields Section (Exact match to official S-21 PDF) */}
                            <div style={{ marginBottom: '12px', fontSize: '9.5pt', color: '#000' }}>
                                {/* Row 1: Nombre */}
                                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}>
                                    <span style={{ fontWeight: 'bold', minWidth: '70px' }}>Nombre:</span>
                                    <span style={{ flex: 1, borderBottom: '1px solid #000', paddingLeft: '6px', paddingBottom: '1px', fontWeight: 'bold', fontSize: '10pt', color: '#000' }}>
                                        {pubDetails.nombre}
                                    </span>
                                </div>

                                {/* Row 2: Fecha de nacimiento & Hombre / Mujer */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', flex: 1, maxWidth: '58%' }}>
                                        <span style={{ fontWeight: 'bold', minWidth: '155px', whiteSpace: 'nowrap' }}>Fecha de nacimiento:</span>
                                        {isEditMode ? (
                                            <input 
                                                type="text" 
                                                placeholder="DD/MM/AAAA"
                                                value={localBirth} 
                                                onChange={e => setLocalBirth(e.target.value)} 
                                                onBlur={() => handleSaveLocalField('fecha_nacimiento', localBirth)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        handleSaveLocalField('fecha_nacimiento', localBirth);
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                                style={{ flex: 1, border: 'none', borderBottom: '1px solid #000', outline: 'none', background: 'transparent', paddingBottom: '1px', paddingLeft: '4px', fontFamily: 'inherit', fontSize: '9.5pt', fontWeight: 'bold', color: '#000' }} 
                                            />
                                        ) : (
                                            <span style={{ flex: 1, borderBottom: '1px solid #000', paddingLeft: '6px', paddingBottom: '1px', fontWeight: 'normal' }}>
                                                {localBirth || ''}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '220px', justifyContent: 'flex-start', paddingLeft: '24px' }}>
                                        <label 
                                            onClick={() => handleDetailChange('genero', 'Hombre')}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '13px', height: '13px', border: '1.2px solid #000', backgroundColor: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>
                                                {pubDetails.genero === 'Hombre' ? '✓' : ''}
                                            </span>
                                            <span style={{ fontWeight: 'normal' }}>Hombre</span>
                                        </label>
                                        <label 
                                            onClick={() => handleDetailChange('genero', 'Mujer')}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '13px', height: '13px', border: '1.2px solid #000', backgroundColor: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>
                                                {pubDetails.genero === 'Mujer' ? '✓' : ''}
                                            </span>
                                            <span style={{ fontWeight: 'normal' }}>Mujer</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Row 3: Fecha de bautismo & Otras ovejas / Ungido */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', flex: 1, maxWidth: '58%' }}>
                                        <span style={{ fontWeight: 'bold', minWidth: '155px', whiteSpace: 'nowrap' }}>Fecha de bautismo:</span>
                                        {isEditMode ? (
                                            <input 
                                                type="text" 
                                                placeholder="DD/MM/AAAA"
                                                value={localBaptism} 
                                                onChange={e => setLocalBaptism(e.target.value)} 
                                                onBlur={() => handleSaveLocalField('fecha_bautismo', localBaptism)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        handleSaveLocalField('fecha_bautismo', localBaptism);
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                                style={{ flex: 1, border: 'none', borderBottom: '1px solid #000', outline: 'none', background: 'transparent', paddingBottom: '1px', paddingLeft: '4px', fontFamily: 'inherit', fontSize: '9.5pt', fontWeight: 'bold', color: '#000' }} 
                                            />
                                        ) : (
                                            <span style={{ flex: 1, borderBottom: '1px solid #000', paddingLeft: '6px', paddingBottom: '1px', fontWeight: 'normal' }}>
                                                {localBaptism || ''}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '220px', justifyContent: 'flex-start', paddingLeft: '24px' }}>
                                        <label 
                                            onClick={() => handleDetailChange('esperanza', 'Otras ovejas')}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '13px', height: '13px', border: '1.2px solid #000', backgroundColor: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>
                                                {pubDetails.esperanza !== 'Ungido' ? '✓' : ''}
                                            </span>
                                            <span style={{ fontWeight: 'normal' }}>Otras ovejas</span>
                                        </label>
                                        <label 
                                            onClick={() => handleDetailChange('esperanza', 'Ungido')}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '13px', height: '13px', border: '1.2px solid #000', backgroundColor: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>
                                                {pubDetails.esperanza === 'Ungido' ? '✓' : ''}
                                            </span>
                                            <span style={{ fontWeight: 'normal' }}>Ungido</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Row 4: Privileges Row (Exact match to official S-21 PDF) */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: '6px', marginBottom: '8px', fontSize: '8.8pt' }}>
                                    <label 
                                        onClick={() => { if (pubDetails.genero !== 'Mujer') handleRoleToggle('Anciano'); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: pubDetails.genero !== 'Mujer' ? 'pointer' : 'default', opacity: pubDetails.genero === 'Mujer' ? 0.4 : 1, userSelect: 'none' }}
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '13px', height: '13px', border: '1.2px solid #000', backgroundColor: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>
                                            {(pubDetails.genero !== 'Mujer' && (pubStatusRow === 'Anciano' || pubStatusRow?.includes('Anciano'))) ? '✓' : ''}
                                        </span>
                                        <span style={{ fontWeight: 'normal' }}>Anciano</span>
                                    </label>
                                    
                                    <label 
                                        onClick={() => { if (pubDetails.genero !== 'Mujer') handleRoleToggle('Siervo ministerial'); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: pubDetails.genero !== 'Mujer' ? 'pointer' : 'default', opacity: pubDetails.genero === 'Mujer' ? 0.4 : 1, userSelect: 'none' }}
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '13px', height: '13px', border: '1.2px solid #000', backgroundColor: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>
                                            {(pubDetails.genero !== 'Mujer' && (pubStatusRow === 'Siervo ministerial' || pubStatusRow?.includes('Siervo ministerial'))) ? '✓' : ''}
                                        </span>
                                        <span style={{ fontWeight: 'normal' }}>Siervo ministerial</span>
                                    </label>
                                    
                                    <label 
                                        onClick={() => handleRoleToggle('Precursor Regular')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '13px', height: '13px', border: '1.2px solid #000', backgroundColor: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>
                                            {(pubStatusRow === 'Precursor Regular' || pubStatusRow?.includes('Precursor Regular')) ? '✓' : ''}
                                        </span>
                                        <span style={{ fontWeight: 'normal' }}>Precursor regular</span>
                                    </label>
                                    
                                    <label 
                                        onClick={() => handleRoleToggle('Precursor Especial')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '13px', height: '13px', border: '1.2px solid #000', backgroundColor: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>
                                            {(pubStatusRow === 'Precursor Especial' || pubStatusRow?.includes('Precursor Especial')) ? '✓' : ''}
                                        </span>
                                        <span style={{ fontWeight: 'normal' }}>Precursor especial</span>
                                    </label>
                                    
                                    <label 
                                        onClick={() => handleRoleToggle('Misionero')}
                                        style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', cursor: 'pointer', userSelect: 'none', lineHeight: 1.15 }}
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '13px', height: '13px', border: '1.2px solid #000', backgroundColor: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: 1, marginTop: '1px' }}>
                                            {(pubStatusRow === 'Misionero' || pubStatusRow?.includes('Misionero')) ? '✓' : ''}
                                        </span>
                                        <span style={{ fontWeight: 'normal' }}>Misionero que sirve<br />en el campo</span>
                                    </label>
                                </div>
                            </div>

                            {/* Preaching Service Annual Details Table (Exact official S-21 layout) */}
                            <table className="publisher-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#ffffff', height: '42px' }}>
                                        <th style={{ border: '1.5px solid #000', padding: '4px 6px', width: '16%', textAlign: 'left', fontWeight: 'bold', fontSize: '8.5pt', color: '#000' }}>
                                            Año de servicio
                                        </th>
                                        <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: '18%', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', color: '#000', lineHeight: 1.15 }}>
                                            Participación<br />en el<br />ministerio
                                        </th>
                                        <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: '12%', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', color: '#000', lineHeight: 1.15 }}>
                                            Cursos<br />bíblicos
                                        </th>
                                        <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: '13%', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', color: '#000', lineHeight: 1.15 }}>
                                            Precursor<br />auxiliar
                                        </th>
                                        <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: '17%', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', color: '#000', lineHeight: 1.15 }}>
                                            Horas<br />
                                            <span style={{ fontSize: '6.5pt', fontWeight: 'normal', display: 'block', lineHeight: 1.05 }}>(Si es precursor o<br />misionero que<br />sirve en el campo)</span>
                                        </th>
                                        <th style={{ border: '1.5px solid #000', padding: '4px 6px', width: isEditMode ? '16%' : '24%', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', color: '#000' }}>
                                            Notas
                                        </th>
                                        {isEditMode && (
                                            <th className="no-print" style={{ border: '1.5px solid #000', padding: '4px', width: '8%', textAlign: 'center', fontSize: '7.5pt', color: '#000' }}>
                                                Acción
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {months.map(m => {
                                        // Match report database format: "YYYY-MM" (e.g. "2026-03")
                                        const targetMonthString = m.key === '09' || m.key === '10' || m.key === '11' || m.key === '12' 
                                            ? `${serviceYear - 1}-${m.key}` 
                                            : `${serviceYear}-${m.key}`;

                                        // Determine if publisher is pioneer for this specific month based on inicio_precursor_mes
                                        const isRegularPioneer = pubStatusRow?.includes('Precursor Regular');
                                        const isSpecialPioneer = pubStatusRow?.includes('Precursor Especial');
                                        const isMissionary = pubStatusRow?.includes('Misionero');
                                        const isPioneerRole = isRegularPioneer || isSpecialPioneer || isMissionary;
                                        const startPioneerYm = pubDetails?.inicio_precursor_mes ? convertToYm(pubDetails.inicio_precursor_mes) : '';
                                        const isPioneerInThisMonth = isPioneerRole && (!startPioneerYm || targetMonthString >= startPioneerYm);

                                        // Perform strict name-comparison to isolate this publisher's records perfectly
                                        const r = reports.find(report => {
                                            if (!report.mes) return false;
                                            const matchesMonth = report.mes.trim() === targetMonthString;
                                            const matchesName = report.publicador_nombre 
                                                ? report.publicador_nombre.trim().toLowerCase() === selectedPublisher.trim().toLowerCase()
                                                : false;
                                            return matchesMonth && matchesName;
                                        });

                                        if (isEditMode) {
                                            return (
                                                <EditableMonthRow 
                                                    key={m.key}
                                                    monthName={m.name}
                                                    monthKey={m.key}
                                                    targetMonthString={targetMonthString}
                                                    report={r}
                                                    selectedPublisher={selectedPublisher}
                                                    currentCongregation={currentCongregation}
                                                    onSaveSuccess={(updatedReports) => {
                                                        setReports(updatedReports);
                                                    }}
                                                />
                                            );
                                        }
                                        
                                        let participo = false;
                                        let notes = '';
                                        let totalHours = '';
                                        let studies = '';
                                        let hasAuxPrecursor = false;

                                        if (r) {
                                            // Parse Ministry Participation Booleans
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

                                            // Extract special hours
                                            let rawNotes = r.notas || '';
                                            let he = Number(r.horas_especiales) || 0;
                                            const matchHe = rawNotes.match(/\{\{horas_especiales:(\d+)\}\}/);
                                            if (matchHe) {
                                                he = he || parseInt(matchHe[1], 10);
                                            }
                                            const matchHe2 = rawNotes.match(/\{\{he:(\d+)\}\}/);
                                            if (matchHe2) {
                                                he = he || parseInt(matchHe2[1], 10);
                                            }

                                            notes = cleanNotes(rawNotes);
                                            
                                            const h = (Number(r.horas) || 0) + he;
                                            // On S-21 card, display hours only if the publisher was a pioneer in that month OR served as auxiliary pioneer
                                            if ((isPioneerInThisMonth || hasAuxPrecursor) && h > 0) {
                                                totalHours = String(h);
                                            }

                                            const s = Number(r.estudios) || 0;
                                            if (s > 0) studies = String(s);
                                        }

                                        return (
                                            <tr key={m.key} style={{ height: '25px' }}>
                                                <td style={{ border: '1.5px solid #000', padding: '2px 6px', fontSize: '9pt', fontWeight: 'normal', textTransform: 'capitalize' }}>
                                                    {m.name}
                                                </td>
                                                <td style={{ border: '1.5px solid #000', padding: '1px', textAlign: 'center' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '13px', height: '13px', border: '1.2px solid #000', backgroundColor: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>
                                                        {participo ? '✓' : ''}
                                                    </span>
                                                </td>
                                                <td style={{ border: '1.5px solid #000', padding: '1px', textAlign: 'center', fontSize: '9pt', fontWeight: 'normal' }}>
                                                    {studies}
                                                </td>
                                                <td style={{ border: '1.5px solid #000', padding: '1px', textAlign: 'center' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '13px', height: '13px', border: '1.2px solid #000', backgroundColor: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>
                                                        {hasAuxPrecursor ? '✓' : ''}
                                                    </span>
                                                </td>
                                                <td style={{ border: '1.5px solid #000', padding: '1px', textAlign: 'center', fontSize: '9pt', fontWeight: 'normal' }}>
                                                    {totalHours}
                                                </td>
                                                <td style={{ border: '1.5px solid #000', padding: '2px 6px', fontSize: '8.5pt', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {notes}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{ height: '27px' }}>
                                        <td colSpan={4} style={{ border: '1.5px solid #000', padding: '3px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '9pt', color: '#000' }}>
                                            Total
                                        </td>
                                        <td style={{ border: '1.5px solid #000', padding: '2px', textAlign: 'center', fontWeight: 'bold', fontSize: '9.5pt', color: '#000' }}>
                                            {(() => {
                                                const isRegularPioneer = pubStatusRow?.includes('Precursor Regular');
                                                const isSpecialPioneer = pubStatusRow?.includes('Precursor Especial');
                                                const isMissionary = pubStatusRow?.includes('Misionero');
                                                const isPioneerRole = isRegularPioneer || isSpecialPioneer || isMissionary;
                                                const startPioneerYm = pubDetails?.inicio_precursor_mes ? convertToYm(pubDetails.inicio_precursor_mes) : '';

                                                const tot = months.reduce((acc, m) => {
                                                    const targetMonthString = m.key === '09' || m.key === '10' || m.key === '11' || m.key === '12' 
                                                        ? `${serviceYear - 1}-${m.key}` 
                                                        : `${serviceYear}-${m.key}`;
                                                    const r = reports.find(report => {
                                                        if (!report.mes) return false;
                                                        const matchesMonth = report.mes.trim() === targetMonthString;
                                                        const matchesName = report.publicador_nombre 
                                                            ? report.publicador_nombre.trim().toLowerCase() === selectedPublisher.trim().toLowerCase()
                                                            : false;
                                                        return matchesMonth && matchesName;
                                                    });
                                                    if (r) {
                                                        const isAux = isReportAuxiliar(r);
                                                        const isPioneerMonth = isPioneerRole && (!startPioneerYm || targetMonthString >= startPioneerYm);
                                                        if (isPioneerMonth || isAux) {
                                                            let he = Number(r.horas_especiales) || 0;
                                                            if (r.notas) {
                                                                const matchHe = r.notas.match(/\{\{horas_especiales:(\d+)\}\}/);
                                                                if (matchHe) he = he || parseInt(matchHe[1], 10);
                                                                const matchHe2 = r.notas.match(/\{\{he:(\d+)\}\}/);
                                                                if (matchHe2) he = he || parseInt(matchHe2[1], 10);
                                                            }
                                                            return acc + (Number(r.horas) || 0) + he;
                                                        }
                                                    }
                                                    return acc;
                                                }, 0);
                                                return tot > 0 ? tot : '';
                                            })()}
                                        </td>
                                        <td style={{ border: '1.5px solid #000', padding: '2px' }}></td>
                                        {isEditMode && <td className="no-print" style={{ border: '1.5px solid #000' }}></td>}
                                    </tr>
                                </tfoot>
                            </table>
                            <div style={{ marginTop: '8px', fontSize: '7.5pt', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                                S-21-S 11/23
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <BulkCardsModal
                isOpen={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                groups={groups}
                masterPublishers={masterPublishers}
                globalMembers={globalMembers}
                defaultServiceYear={defaultServiceYear}
            />

            {previewModalData && (
                <DocumentPreviewModal
                    isOpen={previewModalData.isOpen}
                    onClose={() => setPreviewModalData(null)}
                    title={previewModalData.title}
                    fileName={previewModalData.fileName}
                    pagesHtml={previewModalData.pages}
                    layoutLabel={previewModalData.layoutLabel}
                />
            )}
        </div>
    );
};

export default PublisherCards;
