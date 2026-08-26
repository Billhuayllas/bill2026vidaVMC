import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useCongregation } from '../lib/CongregationContext';
import { 
    Download, 
    Upload, 
    FileDown, 
    Printer, 
    Plus, 
    Minus, 
    RefreshCw, 
    Check, 
    Type,
    Eye,
    ArrowLeft,
    X,
    Settings,
    History
} from 'lucide-react';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';

interface GroupRow {
    n: string;
    z: string;
    nombre: string;
    cargo: string;
}

interface GroupData {
    index: number;
    nombreGrupo: string;
    filas: GroupRow[];
}

interface RolGruposData {
    titulo: string;
    subtitulo: string;
    fontSize: number;
    grupos: GroupData[];
    pageMargin?: number;
    rowPadding?: number;
    groupGap?: number;
}

interface RolGruposProps {
    isReadOnly?: boolean;
}

// Default layout matching the shared HTML
const DEFAULT_GROUPS_DATA: GroupData[] = [
    {
        index: 1,
        nombreGrupo: "Grupo 1",
        filas: [
            { n: "1", z: "D", nombre: "Vilchez Floriano", cargo: "ANC/PE" },
            { n: "2", z: "E", nombre: "Pastor Cachucco", cargo: "ANC/PR" },
            { n: "3", z: "G", nombre: "Joseph Chávez", cargo: "SM/PR" },
            { n: "4", z: "E", nombre: "Juana Cachuco", cargo: "PR" },
            { n: "5", z: "E", nombre: "Antonio Cruz", cargo: "Publicador" },
            { n: "6", z: "E", nombre: "Luz Molina", cargo: "Publicador" },
            { n: "7", z: "E", nombre: "Nelma Cruz", cargo: "Publicador" },
            { n: "8", z: "E", nombre: "Rosa Sifuentes", cargo: "PR" },
            { n: "9", z: "E", nombre: "Leonor Cervantes", cargo: "PR" },
            { n: "10", z: "E", nombre: "Silvia Quispe", cargo: "PR" },
            { n: "11", z: "G", nombre: "Yolanda Vilchez", cargo: "P. Especial" },
            { n: "12", z: "G", nombre: "Victoria Huaman", cargo: "Publicador" },
            { n: "13", z: "G", nombre: "Yolanda Ferreyra", cargo: "PA" },
            { n: "14", z: "G", nombre: "Mariluz Navarrete", cargo: "Publicador" },
            { n: "15", z: "G", nombre: "Alberto Quispe", cargo: "Publicador" },
            { n: "16", z: "G", nombre: "Margarita Quispe", cargo: "PR" },
            { n: "17", z: "G", nombre: "Carolina Tafur", cargo: "Publicador" },
            { n: "18", z: "G", nombre: "Mitchel Tafur", cargo: "Publicador" },
            { n: "19", z: "G", nombre: "Clara Ruiz", cargo: "Publicador" },
            { n: "20", z: "", nombre: "", cargo: "" },
            { n: "21", z: "", nombre: "", cargo: "" }
        ]
    },
    {
        index: 2,
        nombreGrupo: "Grupo 2",
        filas: [
            { n: "1", z: "G", nombre: "Mario Figueroa", cargo: "Anciano" },
            { n: "2", z: "G", nombre: "Jorge Flores", cargo: "PR" },
            { n: "3", z: "G", nombre: "Matías Arias", cargo: "Publicador" },
            { n: "4", z: "G", nombre: "Jessica Torres", cargo: "PR" },
            { n: "5", z: "H", nombre: "Damfort Díaz", cargo: "PR" },
            { n: "6", z: "H", nombre: "David Díaz", cargo: "Publicador" },
            { n: "7", z: "H", nombre: "Warren Diaz", cargo: "Publicador" },
            { n: "8", z: "G", nombre: "Cirila Sabedra", cargo: "Publicador" },
            { n: "9", z: "G", nombre: "Juliana Marca", cargo: "Publicador" },
            { n: "10", z: "G", nombre: "Gladys Quispe", cargo: "PR" },
            { n: "11", z: "G", nombre: "Consuelo Pillaca", cargo: "PA" },
            { n: "12", z: "G", nombre: "Dan Figueroa", cargo: "Publicador" },
            { n: "13", z: "G", nombre: "Leonor Figueroa", cargo: "PR" },
            { n: "14", z: "G", nombre: "Azucena Flores", cargo: "Publicador" },
            { n: "15", z: "G", nombre: "Damaris Flores", cargo: "Publicador" },
            { n: "16", z: "G", nombre: "Teresa Flores", cargo: "Publicador" },
            { n: "17", z: "G", nombre: "Herlinda Cuba", cargo: "Publicador" },
            { n: "18", z: "G", nombre: "Angélica García", cargo: "Publicador" },
            { n: "19", z: "", nombre: "", cargo: "" },
            { n: "20", z: "", nombre: "", cargo: "" },
            { n: "21", z: "", nombre: "", cargo: "" }
        ]
    },
    {
        index: 3,
        nombreGrupo: "Grupo 3",
        filas: [
            { n: "1", z: "A", nombre: "Royer Alejandro", cargo: "ANC/PR" },
            { n: "2", z: "G", nombre: "Wilson Becerra", cargo: "SM/PR" },
            { n: "3", z: "G", nombre: "Celeste Becerra", cargo: "Publicador" },
            { n: "4", z: "G", nombre: "Graciela Becerra", cargo: "Publicador" },
            { n: "5", z: "J", nombre: "Edwin Puchoc", cargo: "Publicador" },
            { n: "6", z: "J", nombre: "Rosa Mallma", cargo: "Publicador" },
            { n: "7", z: "G", nombre: "Mayumi Chávez", cargo: "Publicador" },
            { n: "8", z: "G", nombre: "Nora Rosales", cargo: "PR" },
            { n: "9", z: "K", nombre: "Carmen Poma", cargo: "Publicador" },
            { n: "10", z: "K", nombre: "Hector Poma", cargo: "PR" },
            { n: "11", z: "J", nombre: "Jhonatan de la Cruz", cargo: "Publicador" },
            { n: "12", z: "J", nombre: "Leydi de la Cruz", cargo: "Publicador" },
            { n: "13", z: "J", nombre: "Rocío de la Cruz", cargo: "Publicador" },
            { n: "14", z: "K", nombre: "Alicia Bautista", cargo: "PR" },
            { n: "15", z: "K", nombre: "Isaias Bautista", cargo: "Publicador" },
            { n: "16", z: "G", nombre: "Vicente Davila", cargo: "Publicador" },
            { n: "17", z: "G", nombre: "Dina Pinto", cargo: "Publicador" },
            { n: "18", z: "G", nombre: "Giovanna Pomalazo", cargo: "PR" },
            { n: "19", z: "K", nombre: "Nelida Carhuaz", cargo: "Publicador" },
            { n: "20", z: "", nombre: "", cargo: "" },
            { n: "21", z: "", nombre: "", cargo: "" }
        ]
    },
    {
        index: 4,
        nombreGrupo: "Grupo 4",
        filas: [
            { n: "1", z: "CH", nombre: "Gabino Huamanyalli", cargo: "ANC/PR" },
            { n: "2", z: "K", nombre: "Luis Quispe", cargo: "SM" },
            { n: "3", z: "K", nombre: "Aúrea Ccahuna", cargo: "Publicador" },
            { n: "4", z: "CH", nombre: "Day Huamanyalli", cargo: "PR" },
            { n: "5", z: "K", nombre: "Indira Quispe", cargo: "PR" },
            { n: "6", z: "K", nombre: "Aaron Quispe", cargo: "PA" },
            { n: "7", z: "K", nombre: "Abel Quispe", cargo: "Publicador" },
            { n: "8", z: "K", nombre: "Alexander Quispe", cargo: "PR" },
            { n: "9", z: "J", nombre: "Maria Torres", cargo: "Publicador" },
            { n: "10", z: "J", nombre: "Misael Torres", cargo: "Publicador" },
            { n: "11", z: "J", nombre: "Oswaldo Torres", cargo: "PA" },
            { n: "12", z: "J", nombre: "Egeguren Nieto", cargo: "Publicador" },
            { n: "13", z: "J", nombre: "Norma Nieto", cargo: "Publicador" },
            { n: "14", z: "J", nombre: "Maribel Mozombite", cargo: "Publicador" },
            { n: "15", z: "J", nombre: "Mileyka Galvez", cargo: "Publicador" },
            { n: "16", z: "K", nombre: "Yajaira Lobo", cargo: "PA" },
            { n: "17", z: "K", nombre: "Andrea Bartolo", cargo: "PA" },
            { n: "18", z: "K", nombre: "Cielo Lobo", cargo: "PA" },
            { n: "19", z: "K", nombre: "Nicol Bartolo", cargo: "PA" },
            { n: "20", z: "K", nombre: "Rosario Quiroz", cargo: "PA" },
            { n: "21", z: "", nombre: "", cargo: "" }
        ]
    },
    {
        index: 5,
        nombreGrupo: "Grupo 5",
        filas: [
            { n: "1", z: "J", nombre: "Cárdenas Galindo", cargo: "ANC" },
            { n: "2", z: "G", nombre: "Mario Parco", cargo: "SM/PR" },
            { n: "3", z: "G", nombre: "Eduardo Parco", cargo: "Publicador" },
            { n: "4", z: "J", nombre: "Marleni Cárdenas", cargo: "Publicador" },
            { n: "5", z: "K", nombre: "Anderson Custodio", cargo: "Publicador" },
            { n: "6", z: "K", nombre: "Deysi Custodio", cargo: "Publicador" },
            { n: "7", z: "K", nombre: "Edy Elescano", cargo: "PR" },
            { n: "8", z: "J", nombre: "Milagros Palma", cargo: "Publicador" },
            { n: "9", z: "K", nombre: "Damian Paytan", cargo: "Publicador" },
            { n: "10", z: "K", nombre: "Magaly Huamán", cargo: "PA" },
            { n: "11", z: "K", nombre: "Thalía Ayala", cargo: "Publicador" },
            { n: "12", z: "K", nombre: "Melani Torres", cargo: "Publicador" },
            { n: "13", z: "K", nombre: "Adrián Torres", cargo: "PR" },
            { n: "14", z: "K", nombre: "André Torres", cargo: "Publicador" },
            { n: "15", z: "K", nombre: "Cinthia Torres", cargo: "Publicador" },
            { n: "16", z: "G", nombre: "Elsa Regalado", cargo: "PR" },
            { n: "17", z: "K", nombre: "Camila Córdova", cargo: "Publicador" },
            { n: "18", z: "K", nombre: "Mishelly Córdova", cargo: "Publicador" },
            { n: "19", z: "K", nombre: "Ruth Sabino", cargo: "Publicador" },
            { n: "20", z: "", nombre: "", cargo: "" },
            { n: "21", z: "", nombre: "", cargo: "" }
        ]
    },
    {
        index: 6,
        nombreGrupo: "Grupo 6",
        filas: [
            { n: "1", z: "V", nombre: "Bill Huayllas", cargo: "ANC" },
            { n: "2", z: "G", nombre: "Daniel Tafur", cargo: "SM/PR" },
            { n: "3", z: "J", nombre: "María Saavedra", cargo: "Publicador" },
            { n: "4", z: "J", nombre: "Saavedra Pedro", cargo: "SM" },
            { n: "5", z: "V", nombre: "Yadira Huayllas", cargo: "PR" },
            { n: "6", z: "K", nombre: "Vidal Rosales", cargo: "PA" },
            { n: "7", z: "K", nombre: "Yolanda Cárdenas", cargo: "Publicador" },
            { n: "8", z: "R", nombre: "Beatriz Anchirayco", cargo: "Publicador" },
            { n: "9", z: "R", nombre: "Cajas Hanz", cargo: "Publicador" },
            { n: "10", z: "R", nombre: "Cajas Mercurio", cargo: "Publicador" },
            { n: "11", z: "R", nombre: "Elidora Cajas", cargo: "Publicador" },
            { n: "12", z: "R", nombre: "Hermelinda Cajas", cargo: "PR" },
            { n: "13", z: "R", nombre: "Jhon Zelaya", cargo: "Publicador" },
            { n: "14", z: "R", nombre: "Julia Pielago", cargo: "PR" },
            { n: "15", z: "R", nombre: "Marcelo Anchirayco", cargo: "Publicador" },
            { n: "16", z: "R", nombre: "Nari Soria", cargo: "Publicador" },
            { n: "17", z: "X", nombre: "Stefany Vallejos", cargo: "PR" },
            { n: "18", z: "X", nombre: "Carolina Casillas", cargo: "Publicador" },
            { n: "19", z: "E", nombre: "Jhon Huayllas", cargo: "Publicador" },
            { n: "20", z: "G", nombre: "Eduardo Navarrete", cargo: "PR" },
            { n: "21", z: "G", nombre: "Giereth Tafur", cargo: "Publicador" }
        ]
    }
];

const normalizeString = (str: string): string => {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

const cleanRole = (roleStr: string): string => {
    if (!roleStr) return "";
    
    const roles = roleStr.split(',').map(r => r.trim());
    const outputRoles: string[] = [];
    
    for (let r of roles) {
        const lowerR = r.toLowerCase();
        
        // Skip eximido/a de meta/horas
        if (
            lowerR === "eximido de meta" ||
            lowerR === "eximido de metas" ||
            lowerR === "eximido de horas" ||
            lowerR === "eximido de hora" ||
            lowerR === "eximida de meta" ||
            lowerR === "eximida de metas" ||
            lowerR === "eximida de horas" ||
            lowerR === "eximida de hora"
        ) {
            continue;
        }
        
        if (lowerR === "publicador") {
            outputRoles.push("PUB");
        } else if (lowerR === "precursor regular" || lowerR === "p. regular" || lowerR === "pr") {
            outputRoles.push("PR");
        } else if (lowerR === "precursor auxiliar" || lowerR === "p. auxiliar" || lowerR === "pa") {
            outputRoles.push("PA");
        } else if (lowerR === "precursor especial" || lowerR === "p. especial" || lowerR === "pe") {
            outputRoles.push("PE");
        } else if (lowerR === "anciano" || lowerR === "anc") {
            outputRoles.push("ANC");
        } else if (lowerR === "siervo ministerial" || lowerR === "siervo de ministerio" || lowerR === "sm" || lowerR === "siervo") {
            outputRoles.push("SM");
        } else {
            let replaced = r
                .replace(/Precursor Regular/gi, "PR")
                .replace(/P\.\s*Regular/gi, "PR")
                .replace(/Precursor Auxiliar/gi, "PA")
                .replace(/P\.\s*Auxiliar/gi, "PA")
                .replace(/Precursor Especial/gi, "PE")
                .replace(/P\.\s*Especial/gi, "PE")
                .replace(/Anciano/gi, "ANC")
                .replace(/Siervo Ministerial/gi, "SM")
                .replace(/Siervo ministerial/gi, "SM");
            outputRoles.push(replaced);
        }
    }
    
    if (outputRoles.length === 0) return "PUB";
    return outputRoles.join(', ');
};

const displayRole = (cargo: string, nombre: string): string => {
    if (!nombre || !nombre.trim()) return "";
    const c = cargo ? cargo.trim() : "";
    if (c === "") return "PUB";
    if (c.toUpperCase() === "PUBLICADOR") return "PUB";
    return c;
};

const getRoleCellStyles = (roleStr: string, nameStr: string): React.CSSProperties => {
    if (!nameStr || !nameStr.trim()) {
        return {
            backgroundColor: '#ffffff',
            color: '#1e293b',
            textAlign: 'center',
        };
    }
    const r = roleStr.trim().toUpperCase();
    if (r === 'ANC' || r.startsWith('ANC/') || r.includes('/ANC') || r.includes('ANC')) {
        return {
            backgroundColor: '#eff6ff', // light blue
            color: '#1e3a8a',          // dark blue font
            textAlign: 'center',
            fontWeight: 'bold',
        };
    }
    if (r === 'SM' || r.startsWith('SM/') || r.includes('/SM') || r.includes('SM')) {
        return {
            backgroundColor: '#f0fdf4', // light green
            color: '#166534',          // dark green font
            textAlign: 'center',
            fontWeight: 'bold',
        };
    }
    if (r === 'PR' || r === 'PA' || r === 'PE' || r === 'P.REGULAR' || r === 'P.AUXILIAR' || r === 'P.ESPECIAL' || r.includes('PR') || r.includes('PA') || r.includes('PE')) {
        return {
            backgroundColor: '#fdf4ff', // light purple/fuchsia
            color: '#701a75',          // purple/fuchsia font
            textAlign: 'center',
            fontWeight: 'bold',
        };
    }
    if (r === 'PUB' || r === 'PUBLICADOR') {
        return {
            backgroundColor: '#ffffff',
            color: '#1e293b',          // standard dark slate
            textAlign: 'center',
            fontWeight: 'semibold',
        };
    }
    // Default fallback
    return {
        backgroundColor: '#ffffff',
        color: '#1e293b',
        textAlign: 'center',
    };
};

const RolGrupos: React.FC<RolGruposProps> = ({ isReadOnly = false }) => {
    const { currentCongregation } = useCongregation();
    const congregationId = currentCongregation?.id || 0;

    // Local states
    const [titulo, setTitulo] = useState("Rol de Grupos de Predicación");
    const [subtitulo, setSubtitulo] = useState(currentCongregation?.name || "Congregación 15 de Julio");
    const [fontSize, setFontSize] = useState(10);
    const [titleFontSize, setTitleFontSize] = useState(18);
    const [subtitleFontSize, setSubtitleFontSize] = useState(11);
    const [groupFontSizes, setGroupFontSizes] = useState<number[]>([10, 10, 10, 10, 10, 10]);
    const [grupos, setGrupos] = useState<GroupData[]>(DEFAULT_GROUPS_DATA);

    const [isSaving, setIsSaving] = useState(false);
    const [isPrintPreview, setIsPrintPreview] = useState(false);

    // Custom layout settings
    const [pageMargin, setPageMargin] = useState(10); // margin in mm
    const [rowPadding, setRowPadding] = useState(3); // row padding in px (default 3px as a healthy starting point)
    const [groupGap, setGroupGap] = useState(12); // gap in px between cards

    // If print preview is active, we treat editing functions and UI elements as readOnly to avoid showing controls or focusing cells.
    const isEffectiveReadOnly = isReadOnly || isPrintPreview;
    const [isSyncing, setIsSyncing] = useState(false);
    const [showSuccessBadge, setShowSuccessBadge] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const tursoDebounceRef = useRef<any>(null);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyList, setHistoryList] = useState<any[]>([]);

    const saveHistorySnapshot = (description: string, dataToSave: any) => {
        if (!congregationId) return;
        const historyKey = `rol_grupos_history_${congregationId}`;
        try {
            const historySaved = localStorage.getItem(historyKey);
            let history: any[] = historySaved ? JSON.parse(historySaved) : [];
            history.unshift({
                timestamp: Date.now(),
                description,
                data: dataToSave
            });
            if (history.length > 20) history = history.slice(0, 20); // Keep max 20 versions locally
            localStorage.setItem(historyKey, JSON.stringify(history));
            setHistoryList(history);
        } catch(e) {
            console.error("Failed to save history snapshot", e);
        }
    };

    const loadHistory = () => {
        if (!congregationId) return;
        const historyKey = `rol_grupos_history_${congregationId}`;
        const saved = localStorage.getItem(historyKey);
        if (saved) {
            try {
                setHistoryList(JSON.parse(saved));
            } catch (e) {}
        }
    };

    useEffect(() => {
        if (showHistoryModal) {
            loadHistory();
        }
    }, [showHistoryModal, congregationId]);

    // States for publisher autocomplete search
    const [activeCell, setActiveCell] = useState<{ grpIdx: number; rIdx: number } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [autocompleteList, setAutocompleteList] = useState<{ nombre: string; z: string; cargo: string }[]>([]);

    const filteredSuggestions = useMemo(() => {
        const query = searchQuery ? normalizeString(searchQuery).trim() : '';
        if (!query) return [];
        return autocompleteList.filter(item => {
            const normalizedName = normalizeString(item.nombre || '');
            return normalizedName.includes(query);
        }).slice(0, 8);
    }, [searchQuery, autocompleteList]);

    const [isSavingPNG, setIsSavingPNG] = useState(false);

    useEffect(() => {
        if (isSavingPNG) {
            const timer = setTimeout(() => {
                const element = document.getElementById('printSheet');
                if (!element) {
                    setIsSavingPNG(false);
                    return;
                }

                // Capture current scroll positions to restore later
                const currentScrollX = window.scrollX;
                const currentScrollY = window.scrollY;

                // Scroll to top-left to avoid displacement and blank offsets in html2canvas rendering
                window.scrollTo(0, 0);

                html2canvas(element, {
                    scale: 2, // High quality, low memory config
                    useCORS: true,
                    logging: false
                }).then((canvas: HTMLCanvasElement) => {
                    const link = document.createElement('a');
                    link.download = `${titulo.replace(/\s+/g, '_')}_${subtitulo.replace(/\s+/g, '_')}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    setIsSavingPNG(false);
                    window.scrollTo(currentScrollX, currentScrollY);
                }).catch((err: any) => {
                    console.error("PNG generation err:", err);
                    setIsSavingPNG(false);
                    window.scrollTo(currentScrollX, currentScrollY);
                });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isSavingPNG, titulo, subtitulo]);

    useEffect(() => {
        if (isSaving) {
            const timer = setTimeout(() => {
                const element = document.getElementById('printSheet');
                if (!element) {
                    setIsSaving(false);
                    return;
                }

                // Capture current scroll positions to restore later
                const currentScrollX = window.scrollX;
                const currentScrollY = window.scrollY;

                // Scroll to top-left to avoid displacement and blank offsets in html2canvas rendering
                window.scrollTo(0, 0);

                const options = {
                    margin:       0, // Zero margins as requested!
                    filename:     `${titulo.replace(/\s+/g, '_')}_${subtitulo.replace(/\s+/g, '_')}.pdf`,
                    image:        { type: 'jpeg' as const, quality: 1.0 },
                    html2canvas:  { 
                        scale: 2, // High quality, low memory config
                        useCORS: true,
                        logging: false
                    },
                    jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
                };

                html2pdf().set(options).from(element).save().then(() => {
                    setIsSaving(false);
                    window.scrollTo(currentScrollX, currentScrollY);
                }).catch((err: any) => {
                    console.error("PDF generation err:", err);
                    setIsSaving(false);
                    window.scrollTo(currentScrollX, currentScrollY);
                });
            }, 500); // 500ms allows layout reflow and rendering to take complete effect
            return () => clearTimeout(timer);
        }
    }, [isSaving, titulo, subtitulo]);

    // Load autocomplete publishers database
    useEffect(() => {
        if (!congregationId) return;

        const loadAutocompleteData = async () => {
            try {
                // 1. Fetch groups to get group IDs
                const { data: dbGroups } = await supabase
                    .from('grupos')
                    .select('id')
                    .eq('congregation_id', congregationId);

                const groupIds = (dbGroups || []).map(g => g.id);
                
                let dbMembers: any[] = [];
                if (groupIds.length > 0) {
                    const { data } = await supabase
                        .from('miembros_grupo')
                        .select('publicador_nombre, rol')
                        .in('grupo_id', groupIds);
                    dbMembers = data || [];
                }

                // 2. Fetch all publishers for zones (Z)
                const { data: dbPublishers } = await supabase
                    .from('publicadores')
                    .select('nombre, direccion')
                    .eq('congregation_id', congregationId);

                const getZone = (addressStr: string) => {
                    if (!addressStr) return "";
                    const match = addressStr.match(/\{\{zona:(.*?)\}\}/);
                    return match ? match[1] : "";
                };

                const abbreviateRole = (roleStr: string) => {
                    if (!roleStr) return "Publicador";
                    
                    const roles = roleStr.split(',').map(r => r.trim());
                    const outputRoles: string[] = [];
                    
                    for (let r of roles) {
                        const lowerR = r.toLowerCase();
                        if (
                            lowerR === "eximido de meta" ||
                            lowerR === "eximido de metas" ||
                            lowerR === "eximido de horas" ||
                            lowerR === "eximido de hora" ||
                            lowerR === "eximida de meta" ||
                            lowerR === "eximida de metas" ||
                            lowerR === "eximida de horas" ||
                            lowerR === "eximida de hora"
                        ) {
                            continue;
                        }
                        
                        if (lowerR === "precursor regular" || lowerR === "p. regular" || lowerR === "pr") {
                            outputRoles.push("PR");
                        } else if (lowerR === "precursor auxiliar" || lowerR === "p. auxiliar" || lowerR === "pa") {
                            outputRoles.push("PA");
                        } else if (lowerR === "precursor especial" || lowerR === "p. especial" || lowerR === "pe") {
                            outputRoles.push("PE");
                        } else if (lowerR === "anciano" || lowerR === "anc") {
                            outputRoles.push("ANC");
                        } else if (lowerR === "siervo ministerial" || lowerR === "siervo de ministerio" || lowerR === "sm" || lowerR === "siervo") {
                            outputRoles.push("SM");
                        } else {
                            outputRoles.push(r);
                        }
                    }
                    
                    if (outputRoles.length === 0) return "Publicador";
                    return outputRoles.join(', ');
                };

                // Map list of publishers
                const list = (dbPublishers || []).map(pub => {
                    const name = pub.nombre.trim();
                    const zone = getZone(pub.direccion || "");
                    const memberMatch = dbMembers.find(m => m.publicador_nombre?.trim().toLowerCase() === name.toLowerCase());
                    const rawRole = memberMatch ? memberMatch.rol : "Publicador";
                    return {
                        nombre: name,
                        z: zone,
                        cargo: abbreviateRole(rawRole)
                    };
                });

                // Include group members not in publisher table
                dbMembers.forEach(mem => {
                    const memName = mem.publicador_nombre?.trim();
                    if (memName && !list.some(l => l.nombre.toLowerCase() === memName.toLowerCase())) {
                        list.push({
                            nombre: memName,
                            z: "",
                            cargo: abbreviateRole(mem.rol)
                        });
                    }
                });

                setAutocompleteList(list);
            } catch (err) {
                console.error("Error loading auto-complete data sources:", err);
            }
        };

        loadAutocompleteData();
    }, [congregationId]);

    // Load persisted data from localStorage and Turso on mount (segregated by congregation ID)
    useEffect(() => {
        if (congregationId) {
            setSubtitulo(currentCongregation?.name || "Congregación");
            const key = `rol_grupos_data_${congregationId}`;
            const querySaved = localStorage.getItem(key);
            let localUpdatedAt = 0;
            if (querySaved) {
                try {
                    const parsed = JSON.parse(querySaved) as any;
                    if (parsed.updatedAt) localUpdatedAt = Number(parsed.updatedAt);
                    if (parsed.titulo) setTitulo(parsed.titulo);
                    if (parsed.subtitulo) setSubtitulo(parsed.subtitulo);
                    if (parsed.fontSize) setFontSize(Number(parsed.fontSize));
                    if (parsed.titleFontSize !== undefined) setTitleFontSize(Number(parsed.titleFontSize));
                    if (parsed.subtitleFontSize !== undefined) setSubtitleFontSize(Number(parsed.subtitleFontSize));
                    if (parsed.groupFontSizes !== undefined && Array.isArray(parsed.groupFontSizes)) {
                        setGroupFontSizes(parsed.groupFontSizes.map(Number));
                    }
                    if (parsed.pageMargin !== undefined) setPageMargin(Number(parsed.pageMargin));
                    if (parsed.rowPadding !== undefined) setRowPadding(Number(parsed.rowPadding));
                    if (parsed.groupGap !== undefined) setGroupGap(Number(parsed.groupGap));
                    if (parsed.grupos && parsed.grupos.length > 0) {
                        const cleanedGrupos = parsed.grupos.map(g => ({
                            ...g,
                            filas: g.filas.map(row => ({
                                ...row,
                                cargo: cleanRole(row.cargo)
                            }))
                        }));
                        setGrupos(cleanedGrupos);
                    }
                } catch (err) {
                    console.error("Error parsing saved group role data from LocalStorage:", err);
                }
            } else {
                setSubtitulo(currentCongregation?.name || "Congregación");
                const cleanDefault = DEFAULT_GROUPS_DATA.map(g => ({
                    ...g,
                    filas: g.filas.map(row => ({
                        ...row,
                        cargo: cleanRole(row.cargo)
                    }))
                }));
                setGrupos(cleanDefault);
            }

            // Sync/Asynchronously retrieve from Turso database to overwrite/complete with authoritative backup
            import('../lib/turso').then((tursoExports) => {
                if (typeof tursoExports.getRolGruposFromTurso === 'function') {
                    tursoExports.getRolGruposFromTurso(congregationId).then(tursoData => {
                        if (tursoData) {
                            try {
                                const parsedJSON = JSON.parse(tursoData.grupos_json);
                                let parsedGroups: GroupData[] = [];
                                let serverMargin = 10;
                                let serverPadding = 3;
                                let serverGap = 12;
                                let serverTitleFontSize = 18;
                                let serverSubtitleFontSize = 11;
                                let serverGroupFontSizes = [10, 10, 10, 10, 10, 10];

                                if (parsedJSON && typeof parsedJSON === 'object' && !Array.isArray(parsedJSON)) {
                                    parsedGroups = parsedJSON.grupos || [];
                                    if (parsedJSON.pageMargin !== undefined) {
                                        serverMargin = Number(parsedJSON.pageMargin);
                                        setPageMargin(serverMargin);
                                    }
                                    if (parsedJSON.rowPadding !== undefined) {
                                        serverPadding = Number(parsedJSON.rowPadding);
                                        setRowPadding(serverPadding);
                                    }
                                    if (parsedJSON.groupGap !== undefined) {
                                        serverGap = Number(parsedJSON.groupGap);
                                        setGroupGap(serverGap);
                                    }
                                    if (parsedJSON.titleFontSize !== undefined) {
                                        serverTitleFontSize = Number(parsedJSON.titleFontSize);
                                        setTitleFontSize(serverTitleFontSize);
                                    }
                                    if (parsedJSON.subtitleFontSize !== undefined) {
                                        serverSubtitleFontSize = Number(parsedJSON.subtitleFontSize);
                                        setSubtitleFontSize(serverSubtitleFontSize);
                                    }
                                    if (parsedJSON.groupFontSizes !== undefined && Array.isArray(parsedJSON.groupFontSizes)) {
                                        serverGroupFontSizes = parsedJSON.groupFontSizes.map(Number);
                                        setGroupFontSizes(serverGroupFontSizes);
                                    }
                                } else {
                                    parsedGroups = parsedJSON || [];
                                }

                                const tursoTimestamp = tursoData.updated_at ? new Date(tursoData.updated_at).getTime() : 0;
                                const isNewerOrEqual = tursoTimestamp >= localUpdatedAt;

                                // Prevent wiping local data if we don't have a local timestamp but we DO have local localStorage data (pre-timestamp)
                                const hasPreTimestampLocalData = !!querySaved && localUpdatedAt === 0;
                                if (!isNewerOrEqual || (hasPreTimestampLocalData && tursoTimestamp > 0)) {
                                    console.log('Local modifications are newer or pre-timestamp local data is protected, discarding Turso fetch.');
                                    return;
                                }

                                if (tursoData.titulo) setTitulo(tursoData.titulo);
                                if (tursoData.subtitulo) setSubtitulo(tursoData.subtitulo);
                                if (tursoData.font_size) setFontSize(tursoData.font_size);
                                
                                if (parsedGroups && parsedGroups.length > 0) {
                                    if (querySaved) {
                                        try {
                                             saveHistorySnapshot("Autoguardado antes de aplicar datos de Turso", JSON.parse(querySaved));
                                        } catch(e) {}
                                    }

                                    const cleaned = parsedGroups.map(g => ({
                                        ...g,
                                        filas: g.filas.map(row => ({
                                            ...row,
                                            cargo: cleanRole(row.cargo)
                                        }))
                                    }));
                                    setGrupos(cleaned);

                                    // Refresh local cache
                                    const refreshedData = {
                                        titulo: tursoData.titulo,
                                        subtitulo: tursoData.subtitulo,
                                        fontSize: tursoData.font_size,
                                        grupos: cleaned,
                                        pageMargin: serverMargin,
                                        rowPadding: serverPadding,
                                        groupGap: serverGap,
                                        titleFontSize: serverTitleFontSize,
                                        subtitleFontSize: serverSubtitleFontSize,
                                        groupFontSizes: serverGroupFontSizes,
                                        updatedAt: tursoTimestamp
                                    };
                                    localStorage.setItem(key, JSON.stringify(refreshedData));
                                }
                            } catch (e) {
                                console.error("Error parsing Turso JSON structure:", e);
                            }
                        }
                    }).catch(err => {
                        console.warn("Aviso al consultar Rol de Grupos en Turso:", err);
                    });
                }
            }).catch(moduleErr => {
                console.warn("Aviso al importar módulo Turso:", moduleErr);
            });
        }
    }, [congregationId, currentCongregation]);

    // Save to LocalStorage and cloud Turso SQL Database on changes
    const saveToLocalStorage = (
        updatedTitle: string,
        updatedSub: string,
        updatedSize: number,
        updatedGrupos: GroupData[],
        updatedMargin = pageMargin,
        updatedPadding = rowPadding,
        updatedGap = groupGap,
        updatedTitleFontSize = titleFontSize,
        updatedSubtitleFontSize = subtitleFontSize,
        updatedGroupFontSizes = groupFontSizes
    ) => {
        if (!congregationId) return;
        const key = `rol_grupos_data_${congregationId}`;
        const localTimestamp = Date.now();
        const dataToSave = {
            titulo: updatedTitle,
            subtitulo: updatedSub,
            fontSize: updatedSize,
            grupos: updatedGrupos,
            pageMargin: updatedMargin,
            rowPadding: updatedPadding,
            groupGap: updatedGap,
            titleFontSize: updatedTitleFontSize,
            subtitleFontSize: updatedSubtitleFontSize,
            groupFontSizes: updatedGroupFontSizes,
            updatedAt: localTimestamp
        };
        localStorage.setItem(key, JSON.stringify(dataToSave));
        setShowSuccessBadge(true);
        setTimeout(() => setShowSuccessBadge(false), 1500);

        // Backup to Turso
        if (tursoDebounceRef.current) {
            clearTimeout(tursoDebounceRef.current);
        }
        tursoDebounceRef.current = setTimeout(() => {
            import('../lib/turso').then((tursoExports) => {
                if (typeof tursoExports.saveRolGruposToTurso === 'function') {
                    // Bundle groups and layout settings into a single backward-compatible serialized payload
                    const queryPayload = {
                        grupos: updatedGrupos,
                        pageMargin: updatedMargin,
                        rowPadding: updatedPadding,
                        groupGap: updatedGap,
                        titleFontSize: updatedTitleFontSize,
                        subtitleFontSize: updatedSubtitleFontSize,
                        groupFontSizes: updatedGroupFontSizes
                    };
                    tursoExports.saveRolGruposToTurso(
                        congregationId,
                        updatedTitle,
                        updatedSub,
                        updatedSize,
                        JSON.stringify(queryPayload),
                        new Date(localTimestamp).toISOString()
                    ).catch(err => {
                        console.warn("Aviso de sincronización Turso:", err);
                    });
                }
            }).catch(err => {
                console.warn("Aviso al cargar módulo Turso:", err);
            });
        }, 1500); // 1.5s delay of inactivity before sync to cloud database
    };

    // Handler to adjust specific group font size
    const handleAdjustGroupFontSize = (groupIndex: number, amount: number) => {
        const nextSizes = [...groupFontSizes];
        const currentSize = nextSizes[groupIndex - 1] || fontSize;
        const newSize = Math.max(6, Math.min(18, Math.round((currentSize + amount) * 10) / 10));
        nextSizes[groupIndex - 1] = newSize;
        setGroupFontSizes(nextSizes);
        saveToLocalStorage(titulo, subtitulo, fontSize, grupos, pageMargin, rowPadding, groupGap, titleFontSize, subtitleFontSize, nextSizes);
    };

    // Fast handler helper for cell change
    const handleCellChange = (groupIndex: number, rowIndex: number, field: keyof GroupRow, value: string) => {
        if (isReadOnly) return;
        const nextGrupos = grupos.map(grp => {
            if (grp.index === groupIndex) {
                const nextRow = grp.filas.map((row, rIdx) => {
                    if (rIdx === rowIndex) {
                        const cellVal = field === 'cargo' ? cleanRole(value) : value;
                        return { ...row, [field]: cellVal };
                    }
                    return row;
                });
                return { ...grp, filas: nextRow };
            }
            return grp;
        });
        setGrupos(nextGrupos);
        saveToLocalStorage(titulo, subtitulo, fontSize, nextGrupos);
    };

    const handleSelectSuggestion = (groupIndex: number, rowIndex: number, item: { nombre: string; z: string; cargo: string }) => {
        if (isReadOnly) return;
        const nextGrupos = grupos.map(grp => {
            if (grp.index === groupIndex) {
                const nextRow = grp.filas.map((row, rIdx) => {
                    if (rIdx === rowIndex) {
                        return { 
                            ...row, 
                            nombre: item.nombre,
                            z: item.z || row.z,
                            cargo: item.cargo || row.cargo
                        };
                    }
                    return row;
                });
                return { ...grp, filas: nextRow };
            }
            return grp;
        });
        setGrupos(nextGrupos);
        saveToLocalStorage(titulo, subtitulo, fontSize, nextGrupos);
        setActiveCell(null);
    };

    const handleHeaderGroupChange = (groupIndex: number, newGroupName: string) => {
        if (isReadOnly) return;
        const nextGrupos = grupos.map(grp => {
            if (grp.index === groupIndex) {
                return { ...grp, nombreGrupo: newGroupName };
            }
            return grp;
        });
        setGrupos(nextGrupos);
        saveToLocalStorage(titulo, subtitulo, fontSize, nextGrupos);
    };

    // Add empty row to specific group table
    const handleAddRow = (groupIndex: number) => {
        if (isReadOnly) return;
        const nextGrupos = grupos.map(grp => {
            if (grp.index === groupIndex) {
                const nextNumber = String(grp.filas.length + 1);
                const newRow: GroupRow = { n: nextNumber, z: "", nombre: "", cargo: "" };
                return { ...grp, filas: [...grp.filas, newRow] };
            }
            return grp;
        });
        setGrupos(nextGrupos);
        saveToLocalStorage(titulo, subtitulo, fontSize, nextGrupos);
    };

    const handleMoveRowUp = (groupIndex: number, rowIndex: number) => {
        if (rowIndex <= 0 || isReadOnly) return;
        setGrupos(prev => {
            const nextGrupos = prev.map(grp => {
                if (grp.index === groupIndex) {
                    const newFilas = [...grp.filas];
                    const temp = newFilas[rowIndex - 1];
                    const current = newFilas[rowIndex];
                    
                    newFilas[rowIndex - 1] = { ...current, n: temp.n };
                    newFilas[rowIndex] = { ...temp, n: current.n };
                    
                    return { ...grp, filas: newFilas };
                }
                return grp;
            });
            saveToLocalStorage(titulo, subtitulo, fontSize, nextGrupos);
            return nextGrupos;
        });
    };

    const handleMoveRowDown = (groupIndex: number, rowIndex: number) => {
        if (isReadOnly) return;
        setGrupos(prev => {
            const nextGrupos = prev.map(grp => {
                if (grp.index === groupIndex && rowIndex < grp.filas.length - 1) {
                    const newFilas = [...grp.filas];
                    const temp = newFilas[rowIndex + 1];
                    const current = newFilas[rowIndex];
                    
                    newFilas[rowIndex + 1] = { ...current, n: temp.n };
                    newFilas[rowIndex] = { ...temp, n: current.n };
                    
                    return { ...grp, filas: newFilas };
                }
                return grp;
            });
            saveToLocalStorage(titulo, subtitulo, fontSize, nextGrupos);
            return nextGrupos;
        });
    };

    // Delete last row from specific group table
    const handleRemoveRow = (groupIndex: number) => {
        if (isReadOnly) return;
        const nextGrupos = grupos.map(grp => {
            if (grp.index === groupIndex && grp.filas.length > 0) {
                return { ...grp, filas: grp.filas.slice(0, -1) };
            }
            return grp;
        });
        setGrupos(nextGrupos);
        saveToLocalStorage(titulo, subtitulo, fontSize, nextGrupos);
    };

    // Dynamic import template from real supabase database
    const handleSyncFromDatabase = async () => {
        if (isReadOnly || !congregationId) return;
        if (!window.confirm("¿Seguro que deseas cargar los grupos desde la base de datos de la congregación? Esto creará un borrador nuevo con los publicadores de tus grupos actuales.")) return;

        setIsSyncing(true);

        const currentLocalData = {
            titulo, subtitulo, fontSize, grupos, pageMargin, rowPadding, groupGap, titleFontSize, subtitleFontSize, groupFontSizes, updatedAt: Date.now()
        };
        saveHistorySnapshot("Autoguardado antes de nuevo borrador (Sincronización manual)", currentLocalData);

        try {
            // 1. Fetch groups
            const { data: dbGroups, error: groupsErr } = await supabase
                .from('grupos')
                .select('*')
                .eq('congregation_id', congregationId)
                .order('nombre');

            if (groupsErr) throw groupsErr;

            // 2. Fetch group members
            const groupIds = (dbGroups || []).map(g => g.id);
            if (groupIds.length === 0) {
                alert("No se encontraron grupos activos en la base de datos para esta congregación.");
                setIsSyncing(false);
                return;
            }

            const { data: dbMembers, error: membersErr } = await supabase
                .from('miembros_grupo')
                .select('*')
                .in('grupo_id', groupIds);

            if (membersErr) throw membersErr;

            // 3. Fetch publishers for zones ("Z")
            const { data: dbPublishers, error: pubErr } = await supabase
                .from('publicadores')
                .select('nombre, direccion')
                .eq('congregation_id', congregationId);

            if (pubErr) throw pubErr;

            // Process and restructure into 6 groups
            // We will map the active dbGroups to slots 1-6. If there are fewer than 6, we keep blank group templates for the rest.
            const nextGrupos: GroupData[] = [];

            // Helper to get zone from address
            const getZoneFromAddress = (pubName: string) => {
                const pub = (dbPublishers || []).find(p => p.nombre.trim().toLowerCase() === pubName.trim().toLowerCase());
                if (!pub || !pub.direccion) return "";
                const zonaMatch = pub.direccion.match(/\{\{zona:(.*?)\}\}/);
                return zonaMatch ? zonaMatch[1] : "";
            };

            // Helper to clean and abbreviate roles
            const abbreviateRole = (roleStr: string) => {
                if (!roleStr) return "Publicador";
                
                const roles = roleStr.split(',').map(r => r.trim());
                const outputRoles: string[] = [];
                
                for (let r of roles) {
                    const lowerR = r.toLowerCase();
                    if (
                        lowerR === "eximido de meta" ||
                        lowerR === "eximido de metas" ||
                        lowerR === "eximido de horas" ||
                        lowerR === "eximido de hora" ||
                        lowerR === "eximida de meta" ||
                        lowerR === "eximida de metas" ||
                        lowerR === "eximida de horas" ||
                        lowerR === "eximida de hora"
                    ) {
                        continue;
                    }
                    
                    if (lowerR === "precursor regular" || lowerR === "p. regular" || lowerR === "pr") {
                        outputRoles.push("PR");
                    } else if (lowerR === "precursor auxiliar" || lowerR === "p. auxiliar" || lowerR === "pa") {
                        outputRoles.push("PA");
                    } else if (lowerR === "precursor especial" || lowerR === "p. especial" || lowerR === "pe") {
                        outputRoles.push("PE");
                    } else if (lowerR === "anciano" || lowerR === "anc") {
                        outputRoles.push("ANC");
                    } else if (lowerR === "siervo ministerial" || lowerR === "siervo de ministerio" || lowerR === "sm" || lowerR === "siervo") {
                        outputRoles.push("SM");
                    } else {
                        outputRoles.push(r);
                    }
                }
                
                if (outputRoles.length === 0) return "Publicador";
                return outputRoles.join(', ');
            };

            for (let i = 1; i <= 6; i++) {
                // See if we have a group in the database for this slot
                const dbGroup = (dbGroups || [])[i - 1];
                const groupName = dbGroup ? dbGroup.nombre : `Grupo ${i}`;
                const groupMembers = dbGroup 
                    ? (dbMembers || []).filter(m => m.grupo_id === dbGroup.id).sort((a,b) => {
                        const getRolePriority = (roleStr: string) => {
                            if (!roleStr) return 3;
                            const r = roleStr.toLowerCase();
                            if (r.includes('anciano')) return 1;
                            if (r.includes('siervo ministerial') || r.includes('sm')) return 2;
                            return 3;
                        };
                        const pA = getRolePriority(a.rol);
                        const pB = getRolePriority(b.rol);
                        if (pA !== pB) return pA - pB;
                        return a.publicador_nombre.localeCompare(b.publicador_nombre);
                    })
                    : [];

                const filas: GroupRow[] = groupMembers.map((m, idx) => ({
                    n: String(idx + 1),
                    z: getZoneFromAddress(m.publicador_nombre),
                    nombre: m.publicador_nombre,
                    cargo: abbreviateRole(m.rol)
                }));

                // Ensure at least 21 rows per group box (fill with blanks if needed to preserve layout height match)
                const rowsCount = filas.length;
                if (rowsCount < 21) {
                    for (let rIdx = rowsCount + 1; rIdx <= 21; rIdx++) {
                        filas.push({ n: String(rIdx), z: "", nombre: "", cargo: "" });
                    }
                }

                nextGrupos.push({
                    index: i,
                    nombreGrupo: groupName,
                    filas
                });
            }

            setGrupos(nextGrupos);
            const sub = currentCongregation?.name || "Congregación";
            setSubtitulo(sub);
            saveToLocalStorage(titulo, sub, fontSize, nextGrupos);
            alert("¡Directorio de grupos cargado con éxito como plantilla editable!");
        } catch (err: any) {
            console.error("Error importing congregation data:", err);
            alert(`Error de sincronización: ${err.message || JSON.stringify(err)}`);
        } finally {
            setIsSyncing(false);
        }
    };

    // Save workspace JSON to files
    const handleExportBackup = () => {
        const payload = {
            titulo,
            subtitulo,
            fontSize,
            grupos,
            pageMargin,
            rowPadding,
            groupGap,
            titleFontSize,
            subtitleFontSize,
            groupFontSizes
        };
        const stringified = JSON.stringify(payload, null, 2);
        const blob = new Blob([stringified], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        const fecha = new Date().toISOString().slice(0, 10);
        link.download = `respaldo_rol_grupos_${fecha}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    };

    // Load backup JSON
    const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target?.result as string) as any;
                if (parsed) {
                    const currentLocalData = {
                        titulo, subtitulo, fontSize, grupos, pageMargin, rowPadding, groupGap, titleFontSize, subtitleFontSize, groupFontSizes, updatedAt: Date.now()
                    };
                    saveHistorySnapshot("Autoguardado antes de subir archivo PC", currentLocalData);

                    if (parsed.titulo) setTitulo(parsed.titulo);
                    if (parsed.subtitulo) setSubtitulo(parsed.subtitulo);
                    if (parsed.fontSize) setFontSize(Number(parsed.fontSize));
                    
                    const importedTitleFontSize = parsed.titleFontSize !== undefined ? Number(parsed.titleFontSize) : 18;
                    const importedSubtitleFontSize = parsed.subtitleFontSize !== undefined ? Number(parsed.subtitleFontSize) : 11;
                    const importedGroupFontSizes = (parsed.groupFontSizes && Array.isArray(parsed.groupFontSizes)) 
                        ? parsed.groupFontSizes.map(Number) 
                        : [10, 10, 10, 10, 10, 10];

                    setTitleFontSize(importedTitleFontSize);
                    setSubtitleFontSize(importedSubtitleFontSize);
                    setGroupFontSizes(importedGroupFontSizes);

                    if (parsed.pageMargin !== undefined) setPageMargin(Number(parsed.pageMargin));
                    if (parsed.rowPadding !== undefined) setRowPadding(Number(parsed.rowPadding));
                    if (parsed.groupGap !== undefined) setGroupGap(Number(parsed.groupGap));
                    if (parsed.grupos && parsed.grupos.length > 0) setGrupos(parsed.grupos);
                    
                    saveToLocalStorage(
                        parsed.titulo || titulo,
                        parsed.subtitulo || subtitulo,
                        Number(parsed.fontSize) || fontSize,
                        parsed.grupos || grupos,
                        parsed.pageMargin !== undefined ? Number(parsed.pageMargin) : pageMargin,
                        parsed.rowPadding !== undefined ? Number(parsed.rowPadding) : rowPadding,
                        parsed.groupGap !== undefined ? Number(parsed.groupGap) : groupGap,
                        importedTitleFontSize,
                        importedSubtitleFontSize,
                        importedGroupFontSizes
                    );
                    alert('¡Copia de seguridad cargada con éxito!');
                }
            } catch (err) {
                alert('Archivo inválido. Asegúrate de cargar un respaldo .json correcto de Rol de Grupos.');
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
    };

    // Download PDF from Sheet View using html2pdf
    const handleDownloadPDF = () => {
        setIsSaving(true);
    };

    // Download PNG from Sheet View using html2canvas
    const handleDownloadPNG = () => {
        setIsSavingPNG(true);
    };

    const renderCargoCell = (grpIdx: number, row: GroupRow, rIdx: number) => {
        return (
            <td className="focus:outline-none text-center border border-slate-400 font-semibold relative group/cargo" style={getRoleCellStyles(displayRole(row.cargo, row.nombre), row.nombre)}>
                <div
                    contentEditable={!isEffectiveReadOnly}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                        const val = e.currentTarget.textContent || '';
                        handleCellChange(grpIdx, rIdx, 'cargo', val);
                    }}
                >
                    {displayRole(row.cargo, row.nombre)}
                </div>
                {!isEffectiveReadOnly && (
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-center opacity-0 group-hover/cargo:opacity-100 print-hidden bg-white/90 border-l border-slate-200 select-none cursor-pointer" contentEditable={false}>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleMoveRowUp(grpIdx, rIdx)} className="px-[5px] hover:bg-slate-200 text-slate-600 text-[8px] h-1/2 flex items-center justify-center transition-colors cursor-pointer" title="Subir fila">
                            <i className="fas fa-chevron-up"></i>
                        </button>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleMoveRowDown(grpIdx, rIdx)} className="px-[5px] hover:bg-slate-200 text-slate-600 text-[8px] h-1/2 flex items-center justify-center transition-colors cursor-pointer" title="Bajar fila">
                            <i className="fas fa-chevron-down"></i>
                        </button>
                    </div>
                )}
            </td>
        );
    };

    return (
        <div className={`min-h-screen font-sans antialiased transition-colors duration-200 ${
            isPrintPreview ? 'bg-slate-950 text-slate-100 p-0 overflow-x-auto select-none' : 'bg-[var(--bg-color)] text-[var(--text-color)] p-2 sm:p-4'
        }`}>
            
            {isPrintPreview ? (
                 /* BEAUTIFUL PRINT PREVIEW DIRECT-BAR */
                 <div className="print-hidden bg-slate-950 border-b border-slate-800 py-3 px-4 sm:px-6 sticky top-0 z-[100] shadow-lg flex flex-col gap-3 text-slate-100 max-w-full">
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                         <div className="flex items-center gap-3">
                             <button 
                                 onClick={() => setIsPrintPreview(false)}
                                 className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs font-semibold border border-slate-700 active:scale-95"
                             >
                                 <ArrowLeft className="w-3.5 h-3.5" />
                                 Volver a Editar
                             </button>
                             <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />
                             <div>
                                 <h2 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                                     <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[9px] uppercase font-black tracking-wider">
                                         VISTA PREVIA
                                     </span>
                                     Previsualización de Impresión
                                 </h2>
                                 <p className="text-[10px] text-slate-400">
                                     Formato de hoja A4 Portrait. Los botones de edición y controles táctiles están ocultos.
                                 </p>
                             </div>
                         </div>

                         <div className="flex items-center gap-2">
                             <span className="text-[9px] font-mono bg-slate-800 text-indigo-300 border border-slate-700 px-2 py-1 rounded hidden md:inline-block">
                                 AJUSTE EXACTO: 1 HOJA A4
                             </span>

                             {/* PDF & PNG & Imprimir */}
                             <button 
                                 onClick={handleDownloadPDF} 
                                 disabled={isSaving || isSavingPNG}
                                 className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow active:scale-95"
                             >
                                 <FileDown className="w-3.5 h-3.5" />
                                 {isSaving ? 'Generando...' : 'Descargar PDF'}
                             </button>

                             <button 
                                 onClick={handleDownloadPNG} 
                                 disabled={isSaving || isSavingPNG}
                                 className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow active:scale-95"
                             >
                                 <FileDown className="w-3.5 h-3.5" />
                                 {isSavingPNG ? 'Generando PNG...' : 'Descargar en 4K PNG'}
                             </button>

                             <button 
                                 onClick={() => window.print()} 
                                 className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow active:scale-95"
                             >
                                 <Printer className="w-3.5 h-3.5" />
                                 Imprimir / Guardar
                             </button>

                             <button 
                                 onClick={() => setIsPrintPreview(false)}
                                 className="text-slate-400 hover:text-slate-200 p-2 rounded transition"
                                 title="Cerrar vista previa"
                             >
                                 <X className="w-4 h-4" />
                             </button>
                         </div>
                     </div>

                     {/* INTERACTIVE MARGINS & LAYOUT SLIDERS IN PRINT PREVIEW MODE */}
                     <div className="pt-2 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                         <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                             <Settings className="w-3.5 h-3.5" />
                             <span>Ajustar Márgenes / Diseño en Tiempo Real:</span>
                         </div>

                         <div className="flex flex-wrap items-center gap-3">
                             {/* Page Margin Slider */}
                             <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                 <span className="font-semibold text-slate-400">Margen de Hoja:</span>
                                 <input 
                                     type="range" 
                                     min="4" 
                                     max="24" 
                                     value={pageMargin} 
                                     className="w-20 sm:w-24 h-1 bg-slate-800 rounded-lg cursor-pointer accent-blue-500"
                                     onChange={(e) => {
                                         const val = Number(e.target.value);
                                         setPageMargin(val);
                                         saveToLocalStorage(titulo, subtitulo, fontSize, grupos, val, rowPadding, groupGap, titleFontSize, subtitleFontSize, groupFontSizes);
                                     }}
                                 />
                                 <span className="font-bold text-slate-200 min-w-[28px] text-right">{pageMargin}mm</span>
                             </div>
 
                             {/* Row Padding Slider */}
                             <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                 <span className="font-semibold text-slate-400">Filas (Relleno):</span>
                                 <input 
                                     type="range" 
                                     min="1" 
                                     max="12" 
                                     step="0.5"
                                     value={rowPadding} 
                                     className="w-20 sm:w-24 h-1 bg-slate-800 rounded-lg cursor-pointer accent-blue-500"
                                     onChange={(e) => {
                                         const val = Number(e.target.value);
                                         setRowPadding(val);
                                         saveToLocalStorage(titulo, subtitulo, fontSize, grupos, pageMargin, val, groupGap, titleFontSize, subtitleFontSize, groupFontSizes);
                                     }}
                                 />
                                 <span className="font-bold text-slate-200 min-w-[28px] text-right">{rowPadding}px</span>
                             </div>
 
                             {/* Gap Spacing Slider */}
                             <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                 <span className="font-semibold text-slate-400">Separación Cuadros:</span>
                                 <input 
                                     type="range" 
                                     min="4" 
                                     max="24" 
                                     value={groupGap} 
                                     className="w-20 sm:w-24 h-1 bg-slate-800 rounded-lg cursor-pointer accent-blue-500"
                                     onChange={(e) => {
                                         const val = Number(e.target.value);
                                         setGroupGap(val);
                                         saveToLocalStorage(titulo, subtitulo, fontSize, grupos, pageMargin, rowPadding, val, titleFontSize, subtitleFontSize, groupFontSizes);
                                     }}
                                 />
                                 <span className="font-bold text-slate-200 min-w-[28px] text-right">{groupGap}px</span>
                             </div>

                             {/* Title Font Size Slider */}
                             <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                 <span className="font-semibold text-slate-400">Letra Título:</span>
                                 <input 
                                     type="range" 
                                     min="12" 
                                     max="28" 
                                     value={titleFontSize} 
                                     className="w-16 sm:w-20 h-1 bg-slate-800 rounded-lg cursor-pointer accent-blue-500"
                                     onChange={(e) => {
                                         const val = Number(e.target.value);
                                         setTitleFontSize(val);
                                         saveToLocalStorage(titulo, subtitulo, fontSize, grupos, pageMargin, rowPadding, groupGap, val, subtitleFontSize, groupFontSizes);
                                     }}
                                 />
                                 <span className="font-bold text-slate-200 min-w-[24px] text-right">{titleFontSize}px</span>
                             </div>

                             {/* Subtitle Font Size Slider */}
                            <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                <span className="font-semibold text-slate-400">Letra Subtítulo:</span>
                                <input 
                                    type="range" 
                                    min="8" 
                                    max="18" 
                                    value={subtitleFontSize} 
                                    className="w-16 sm:w-20 h-1 bg-slate-800 rounded-lg cursor-pointer accent-blue-500"
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setSubtitleFontSize(val);
                                        saveToLocalStorage(titulo, subtitulo, fontSize, grupos, pageMargin, rowPadding, groupGap, titleFontSize, val, groupFontSizes);
                                    }}
                                />
                                <span className="font-bold text-slate-200 min-w-[24px] text-right">{subtitleFontSize}px</span>
                            </div>

                            {/* Publishers Font Size Slider */}
                            <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                <span className="font-semibold text-slate-400">Letra Publicadores:</span>
                                <input 
                                    type="range" 
                                    min="8" 
                                    max="14" 
                                    value={fontSize} 
                                    className="w-16 sm:w-20 h-1 bg-slate-800 rounded-lg cursor-pointer accent-blue-500"
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setFontSize(val);
                                        saveToLocalStorage(titulo, subtitulo, val, grupos);
                                    }}
                                />
                                <span className="font-bold text-slate-200 min-w-[24px] text-right">{fontSize}px</span>
                            </div>

                             {/* Reset Button */}
                             <button 
                                 onClick={() => {
                                     setPageMargin(10);
                                     setRowPadding(3);
                                     setGroupGap(12);
                                     setTitleFontSize(18);
                                     setSubtitleFontSize(11);
                                     setFontSize(10);
                                     const defaultGrpsSizes = [10, 10, 10, 10, 10, 10];
                                     setGroupFontSizes(defaultGrpsSizes);
                                     saveToLocalStorage(titulo, subtitulo, 10, grupos, 10, 3, 12, 18, 11, defaultGrpsSizes);
                                 }}
                                 className="text-slate-500 hover:text-red-400 font-semibold px-2 py-1.5 rounded border border-transparent hover:border-red-400/10 transition-all cursor-pointer hover:bg-red-400/5"
                                 title="Volver a los valores predeterminados"
                             >
                                 Restablecer
                             </button>
                         </div>
                     </div>
                 </div>
             ) : (
                 /* CONTROL BAR (HIDDEN IN PRINT) */
                 <div className="print-hidden max-w-[21.5cm] mx-auto mb-4 bg-[var(--card-bg-color)] rounded-xl shadow-md p-4 border border-[var(--border-color)]">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-extrabold text-[var(--text-color)] flex items-center gap-2">
                                <span className="p-1 px-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-sm font-black">ROL</span>
                                {titulo || "Rol de Grupos"}
                            </h1>
                            <p className="text-xs text-[var(--text-color-light)] mt-1 flex items-center gap-1">
                                Administra de forma visual los 6 grupos de predicación. Se autoguarda automáticamente.
                                {showSuccessBadge && (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse ml-2">
                                        <Check className="w-3 h-3" /> Autosalvado
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Font size control */}
                            <div className="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg p-1.5 flex items-center gap-2">
                                <span className="text-xs font-semibold text-[var(--text-color-light)] flex items-center gap-1">
                                    <Type className="w-3.5 h-3.5 text-[var(--text-color-light)]" /> Letra Publicadores:
                                </span>
                                <input 
                                    type="range" 
                                    min="8" 
                                    max="14" 
                                    value={fontSize} 
                                    className="w-16 h-1 bg-[var(--border-color)] rounded-lg cursor-pointer accent-blue-600"
                                    onChange={(e) => {
                                        const size = Number(e.target.value);
                                        setFontSize(size);
                                        saveToLocalStorage(titulo, subtitulo, size, grupos);
                                    }}
                                />
                                <span className="text-xs font-bold text-[var(--text-color)] min-w-[24px]">{fontSize}px</span>
                            </div>

                            {/* Database Sync */}
                            {!isReadOnly && (
                                <button 
                                    onClick={handleSyncFromDatabase}
                                    disabled={isSyncing}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm hover:shadow active:scale-95"
                                    title="Importar borrador desde la base de datos de la congregación"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                    Sinc. Base Datos
                                </button>
                            )}

                            {/* Backups PC options */}
                            <button 
                                onClick={handleExportBackup} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm hover:shadow active:scale-95"
                                title="Descargar archivo de respaldo .json"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Guardar en PC
                            </button>

                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm hover:shadow active:scale-95"
                                title="Cargar copia de seguridad guardada anteriormente"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                Cargar de PC
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept=".json" 
                                onChange={handleImportBackup} 
                            />

                            <button 
                                onClick={() => setShowHistoryModal(true)} 
                                className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm hover:shadow active:scale-95"
                                title="Ver historial de autoguardados y cambios de Turso"
                            >
                                <History className="w-3.5 h-3.5" />
                                Historial
                            </button>

                            <div className="h-5 w-[1px] bg-[var(--border-color)] mx-1" />

                            {/* Vista Previa */}
                            <button 
                                onClick={() => setIsPrintPreview(true)} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm hover:shadow active:scale-95 font-bold"
                                title="Ver previsualización exacta antes de imprimir"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                Vista Previa
                            </button>

                            {/* PDF & PNG & Imprimir */}
                            <button 
                                onClick={handleDownloadPDF} 
                                disabled={isSaving || isSavingPNG}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm hover:shadow active:scale-95"
                            >
                                <FileDown className="w-3.5 h-3.5" />
                                {isSaving ? 'Descargando...' : 'Descargar PDF'}
                            </button>

                            <button 
                                onClick={handleDownloadPNG} 
                                disabled={isSaving || isSavingPNG}
                                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm hover:shadow active:scale-95"
                            >
                                <FileDown className="w-3.5 h-3.5" />
                                {isSavingPNG ? 'Descargando PNG...' : 'Descargar en 4K PNG'}
                            </button>

                            <button 
                                onClick={() => window.print()} 
                                className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm hover:shadow active:scale-95"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Imprimir
                            </button>
                        </div>
                    </div>

                    {/* INTERACTIVE MARGINS & LAYOUT SLIDERS (JUST LIKE MS WORD) */}
                    <div className="mt-4 pt-3.5 border-t border-[var(--border-color)] flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs select-none">
                        <div className="flex items-center gap-1.5 text-blue-500 font-bold">
                            <Settings className="w-4 h-4" />
                            <span>Diseño de Página (Personalizar Margen y Espacio):</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Page Margin Slider */}
                            <div className="flex items-center gap-2 bg-[var(--input-bg)] px-2.5 py-1.5 rounded-lg border border-[var(--border-color)]">
                                <span className="font-semibold text-[var(--text-color-light)]">Margen de Hoja:</span>
                                <input 
                                    type="range" 
                                    min="4" 
                                    max="24" 
                                    value={pageMargin} 
                                    className="w-20 sm:w-24 h-1 bg-[var(--border-color)] rounded-lg cursor-pointer accent-blue-600"
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setPageMargin(val);
                                        saveToLocalStorage(titulo, subtitulo, fontSize, grupos, val, rowPadding, groupGap, titleFontSize, subtitleFontSize, groupFontSizes);
                                    }}
                                />
                                <span className="font-bold text-[var(--text-color)] min-w-[28px] text-right">{pageMargin}mm</span>
                            </div>

                            {/* Row Padding Slider */}
                            <div className="flex items-center gap-2 bg-[var(--input-bg)] px-2.5 py-1.5 rounded-lg border border-[var(--border-color)]">
                                <span className="font-semibold text-[var(--text-color-light)]">Tamaño de Fila (Relleno):</span>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="12" 
                                    step="0.5"
                                    value={rowPadding} 
                                    className="w-20 sm:w-24 h-1 bg-[var(--border-color)] rounded-lg cursor-pointer accent-blue-600"
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setRowPadding(val);
                                        saveToLocalStorage(titulo, subtitulo, fontSize, grupos, pageMargin, val, groupGap, titleFontSize, subtitleFontSize, groupFontSizes);
                                    }}
                                />
                                <span className="font-bold text-[var(--text-color)] min-w-[28px] text-right">{rowPadding}px</span>
                            </div>

                            {/* Gap Spacing Slider */}
                            <div className="flex items-center gap-2 bg-[var(--input-bg)] px-2.5 py-1.5 rounded-lg border border-[var(--border-color)]">
                                <span className="font-semibold text-[var(--text-color-light)]">Separación de Cuadros:</span>
                                <input 
                                    type="range" 
                                    min="4" 
                                    max="24" 
                                    value={groupGap} 
                                    className="w-20 sm:w-24 h-1 bg-[var(--border-color)] rounded-lg cursor-pointer accent-blue-600"
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setGroupGap(val);
                                        saveToLocalStorage(titulo, subtitulo, fontSize, grupos, pageMargin, rowPadding, val, titleFontSize, subtitleFontSize, groupFontSizes);
                                    }}
                                />
                                <span className="font-bold text-[var(--text-color)] min-w-[28px] text-right">{groupGap}px</span>
                            </div>

                            {/* Title Font Size Slider */}
                            <div className="flex items-center gap-2 bg-[var(--input-bg)] px-2.5 py-1.5 rounded-lg border border-[var(--border-color)]">
                                <span className="font-semibold text-[var(--text-color-light)]">Letra Título:</span>
                                <input 
                                    type="range" 
                                    min="12" 
                                    max="28" 
                                    value={titleFontSize} 
                                    className="w-20 sm:w-24 h-1 bg-[var(--border-color)] rounded-lg cursor-pointer accent-blue-600"
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setTitleFontSize(val);
                                        saveToLocalStorage(titulo, subtitulo, fontSize, grupos, pageMargin, rowPadding, groupGap, val, subtitleFontSize, groupFontSizes);
                                    }}
                                />
                                <span className="font-bold text-[var(--text-color)] min-w-[28px] text-right">{titleFontSize}px</span>
                            </div>

                            {/* Subtitle Font Size Slider */}
                            <div className="flex items-center gap-2 bg-[var(--input-bg)] px-2.5 py-1.5 rounded-lg border border-[var(--border-color)]">
                                <span className="font-semibold text-[var(--text-color-light)]">Letra Subtítulo:</span>
                                <input 
                                    type="range" 
                                    min="8" 
                                    max="18" 
                                    value={subtitleFontSize} 
                                    className="w-20 sm:w-24 h-1 bg-[var(--border-color)] rounded-lg cursor-pointer accent-blue-600"
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setSubtitleFontSize(val);
                                        saveToLocalStorage(titulo, subtitulo, fontSize, grupos, pageMargin, rowPadding, groupGap, titleFontSize, val, groupFontSizes);
                                    }}
                                />
                                <span className="font-bold text-[var(--text-color)] min-w-[28px] text-right">{subtitleFontSize}px</span>
                            </div>

                            {/* Reset Button */}
                            <button 
                                onClick={() => {
                                    setPageMargin(10);
                                    setRowPadding(3);
                                    setGroupGap(12);
                                    setTitleFontSize(18);
                                    setSubtitleFontSize(11);
                                    setFontSize(10);
                                    const defaultGrpsSizes = [10, 10, 10, 10, 10, 10];
                                    setGroupFontSizes(defaultGrpsSizes);
                                    saveToLocalStorage(titulo, subtitulo, 10, grupos, 10, 3, 12, 18, 11, defaultGrpsSizes);
                                }}
                                className="text-slate-400 hover:text-red-500 font-semibold px-2.5 py-1.5 rounded border border-transparent hover:border-red-500/10 transition-all cursor-pointer hover:bg-red-500/5"
                                title="Volver a los valores predeterminados"
                            >
                                Restablecer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINT STYLE TAG INJECTS STATIC PAPER STYLES FOR THE REAL OUTPUT ONLY */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    /* Establish high contrast and force background colors / colors */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    
                    /* Hides system master headers/footers (page title, URL, date, page count) */
                    @page {
                        size: A4 portrait;
                        margin: 0 !important;
                    }
                    
                    /* Global body reset for print container alignment */
                    html, body {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        overflow: hidden !important;
                    }

                    /* Collapse standard headers, sidebars, navigation bars, control buttons, edit helpers */
                    body > :not(#printSheet),
                    header,
                    nav,
                    footer,
                    aside,
                    button,
                    input,
                    .print-hidden,
                    .print-hidden * {
                        display: none !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        opacity: 0 !important;
                    }

                    /* Align React routing wrapper components to use full blank print canvas */
                    .app-container, main, .bg-slate-100 {
                        background: none !important;
                        background-color: transparent !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        max-width: none !important;
                        border: none !important;
                        box-shadow: none !important;
                    }

                    /* Scale printSheet to exact physical A4 coordinates with high-fidelity margins inside the element */
                    #printSheet {
                        visibility: visible !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        box-sizing: border-box !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        max-width: 210mm !important;
                        max-height: 297mm !important;
                        min-height: 297mm !important;
                        padding: ${pageMargin}mm !important; /* Dynamic sheet boundaries */
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background-color: #ffffff !important;
                        overflow: hidden !important;
                        
                        /* Forces a compact font base so that even highly populated worksheets pack into exactly 1 sheet! */
                        font-size: 8.8px !important;
                    }

                    #printSheet h2 {
                        font-size: 14px !important;
                        margin-bottom: 2px !important;
                        line-height: 1.1 !important;
                        color: #1e3a8a !important; /* blue-900 high contrast */
                        text-align: center !important;
                    }

                    #printSheet p {
                        font-size: 8.5px !important;
                        margin-top: 0px !important;
                        margin-bottom: 2px !important;
                        line-height: 1.1 !important;
                        text-align: center !important;
                    }

                    #printSheet div.border-b-2 {
                        margin-bottom: 3.5mm !important;
                        padding-bottom: 1.5mm !important;
                    }

                    #printSheet .grid {
                        gap: ${groupGap}px !important;
                    }

                    /* Strict Table layout compaction for physical printing output */
                    #printSheet table {
                        border-collapse: collapse !important;
                        width: 100% !important;
                    }

                    #printSheet th, #printSheet td {
                        border: 1px solid #475569 !important; /* high-definition neat slate borders */
                        padding: ${rowPadding}px 3.0px !important;
                        line-height: 1.05 !important;
                        font-size: inherit !important;
                    }

                    /* Prevent row break splitting */
                    tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    /* Forces dark blue title headings and high-visibility backings for groups */
                    #printSheet .bg-blue-900 {
                        background-color: #1e3a8a !important;
                        color: #ffffff !important;
                    }

                    #printSheet .bg-slate-100 {
                        background-color: #f1f5f9 !important;
                    }
                }

                /* Enforce highly visible solid gridlines across screen view modes */
                #printSheet table {
                    border-collapse: collapse !important;
                    width: 100% !important;
                }
                #printSheet th, #printSheet td {
                    border: 1px solid #cbd5e1 !important; /* Solid visible slate-300 borders */
                }
                
                @media print {
                    #printSheet th, #printSheet td {
                        border: 1px solid #475569 !important; /* Slightly high contrast slate-400 for physical printers */
                    }
                }
                
                #printSheet.saving-pdf {
                    position: relative !important;
                    margin: 0 !important;
                    background-color: #ffffff !important;
                    color: #1e293b !important; /* Forces dark slate text */
                    box-shadow: none !important;
                    border: none !important;
                    width: 794px !important;
                    height: 1123px !important;
                    max-width: 794px !important;
                    max-height: 1123px !important;
                }

                .saving-pdf th, .saving-pdf td,
                .print-preview th, .print-preview td {
                    border: 1px solid #64748b !important; /* slate-500 high-definition lines */
                    padding: ${rowPadding}px 3.5px !important;
                    line-height: 1.15 !important;
                }
                
                td, th {
                    padding: ${rowPadding}px 5px !important;
                    line-height: 1.2 !important;
                }
                
                .saving-pdf h2,
                .print-preview h2 {
                    font-size: 14px !important;
                    margin-bottom: 1.5px !important;
                    line-height: 1.1 !important;
                }
                
                .saving-pdf p,
                .print-preview p {
                    font-size: 9px !important;
                    margin-top: 0px !important;
                    margin-bottom: 1.5px !important;
                    line-height: 1.1 !important;
                }
                
                [contenteditable="true"]:hover {
                    outline: 1px dashed #3b82f6;
                    background-color: #eff6ff;
                    cursor: pointer;
                }
                [contenteditable="true"]:focus {
                    outline: 2px solid #2563eb;
                    background-color: #eff6ff;
                }
            `}} />

            {/* THE PAPER SHEET VIEW (DESKTOP FIT SCALED TO A4 STANDARDS ON SCREEN AND REAL 100% SIZE IN PRINT) */}
            <div className={`${(isSaving || isSavingPNG) ? '' : 'transition-all duration-300'} ${
                isPrintPreview 
                    ? 'w-full max-w-[24cm] mx-auto py-8 px-4 flex justify-center bg-slate-950 border-none' 
                    : `max-w-[21cm] bg-[var(--bg-color)] mx-auto flex justify-center`
            }`}>
                <div 
                    id="printSheet" 
                    className={`bg-white text-slate-800 rounded-sm transition-all duration-150 flex flex-col justify-between ${
                        (isSaving || isSavingPNG) 
                            ? 'saving-pdf border-0' 
                            : isPrintPreview
                                ? 'print-preview shadow-2xl border border-slate-800'
                                : 'shadow-xl border border-slate-300 p-6'
                    }`}
                    style={{ 
                        fontSize: `${fontSize}px`, 
                        width: (isSaving || isSavingPNG || isPrintPreview) ? '794px' : '100%', 
                        boxSizing: 'border-box', 
                        height: (isSaving || isSavingPNG || isPrintPreview) ? '1123px' : 'auto', 
                        minHeight: (isSaving || isSavingPNG || isPrintPreview) ? '1123px' : '28.2cm',
                        maxHeight: (isSaving || isSavingPNG || isPrintPreview) ? '1123px' : 'none',
                        padding: `${pageMargin}mm`,
                    }}
                >
                    <div>
                        {/* Worksheet Header Title Block */}
                        <div className={`text-center border-b-2 border-blue-900 ${(isSaving || isSavingPNG) ? 'mb-2 pb-1' : 'mb-4 pb-2'}`}>
                            <h2 
                                contentEditable={!isEffectiveReadOnly}
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                    const val = e.currentTarget.textContent || '';
                                    setTitulo(val);
                                    saveToLocalStorage(val, subtitulo, fontSize, grupos);
                                }}
                                className="font-bold tracking-wider text-blue-900 uppercase focus:outline-none hover:bg-blue-50 focus:bg-blue-50 rounded-sm"
                                style={{ fontSize: `${titleFontSize}px`, lineHeight: 1.2 }}
                            >
                                {titulo}
                            </h2>
                            <p 
                                contentEditable={!isEffectiveReadOnly}
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                    const val = e.currentTarget.textContent || '';
                                    setSubtitulo(val);
                                    saveToLocalStorage(titulo, val, fontSize, grupos);
                                }}
                                className="font-semibold text-slate-600 tracking-widest uppercase mt-0.5 focus:outline-none hover:bg-blue-50 focus:bg-blue-50 rounded-sm"
                                style={{ fontSize: `${subtitleFontSize}px`, lineHeight: 1.2 }}
                            >
                                {subtitulo}
                            </p>
                        </div>

                        {/* Grid: 3 columns, 2 rows of boxes */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: `${groupGap}px` }}>
                            
                            {/* FIRST ROW: Groups 1, 2 & 3 */}
                            <div 
                                className={`grid ${(isPrintPreview || isSaving || isSavingPNG) ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}
                                style={{ gap: `${groupGap}px` }}
                            >
                                {[1, 2, 3].map(grpIdx => {
                                    const grp = grupos.find(g => g.index === grpIdx) || { index: grpIdx, nombreGrupo: `Grupo ${grpIdx}`, filas: [] };
                                    return (
                                        <div key={grpIdx} className="border-2 border-blue-900 rounded-md shadow-sm flex flex-col h-full bg-white relative overflow-hidden">
                                            {/* Group Title Box */}
                                            <div 
                                                contentEditable={!isEffectiveReadOnly}
                                                suppressContentEditableWarning
                                                onBlur={(e) => handleHeaderGroupChange(grpIdx, e.currentTarget.textContent || '')}
                                                className="bg-blue-900 text-white font-bold text-center py-1 uppercase tracking-wider text-[10px] focus:outline-none w-full border-none outline-none hover:bg-blue-800 focus:bg-blue-800"
                                            >
                                                {grp.nombreGrupo}
                                            </div>
                                            {/* Table */}
                                            <table className="w-full text-left flex-1 border-collapse border border-slate-400" style={{ fontSize: 'inherit', lineSpacing: '1.2' }}>
                                                <thead>
                                                    <tr className="bg-slate-100 text-slate-700 font-bold text-[8.5px]">
                                                        <th className="w-5 text-center border border-slate-400">Nº</th>
                                                        <th className="w-5 text-center border border-slate-400">Z</th>
                                                        <th className="border border-slate-400 pl-1">Nombre</th>
                                                        <th className="text-center border border-slate-400">Desig.</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {grp.filas.map((row, rIdx) => (
                                                        <tr key={rIdx} className="hover:bg-slate-50">
                                                            <td 
                                                                className="text-center font-bold border border-slate-400 text-slate-500 focus:outline-none" 
                                                                contentEditable={!isEffectiveReadOnly}
                                                                suppressContentEditableWarning
                                                                onBlur={(e) => handleCellChange(grpIdx, rIdx, 'n', e.currentTarget.textContent || '')}
                                                            >{row.n}</td>
                                                            <td 
                                                                className="text-center border border-slate-400 text-slate-800 font-semibold focus:outline-none" 
                                                                contentEditable={!isEffectiveReadOnly}
                                                                suppressContentEditableWarning
                                                                onBlur={(e) => handleCellChange(grpIdx, rIdx, 'z', e.currentTarget.textContent || '')}
                                                            >{row.z}</td>
                                                            {isEffectiveReadOnly ? (
                                                                <td className="font-medium border border-slate-400 px-1 py-0.5 text-slate-800">{row.nombre}</td>
                                                            ) : (
                                                                <td className="relative font-medium border border-slate-400 p-0 text-slate-800">
                                                                    <div 
                                                                        contentEditable={true}
                                                                        suppressContentEditableWarning
                                                                        className="w-full h-full min-h-[1.5em] px-1 py-0.5 focus:outline-none"
                                                                        onInput={(e) => {
                                                                            const val = e.currentTarget.textContent || '';
                                                                            setSearchQuery(val);
                                                                        }}
                                                                        onFocus={(e) => {
                                                                            setActiveCell({ grpIdx, rIdx });
                                                                            setSearchQuery(e.currentTarget.textContent || '');
                                                                        }}
                                                                        onBlur={(e) => {
                                                                            const val = e.currentTarget.textContent || '';
                                                                            handleCellChange(grpIdx, rIdx, 'nombre', val);
                                                                            setTimeout(() => {
                                                                                setActiveCell(null);
                                                                            }, 250);
                                                                        }}
                                                                    >
                                                                        {row.nombre}
                                                                    </div>
                                                                    {activeCell?.grpIdx === grpIdx && activeCell?.rIdx === rIdx && filteredSuggestions.length > 0 && (
                                                                        <div className="absolute left-0 top-full mt-1 w-64 max-h-48 overflow-y-auto bg-white border border-slate-300 rounded-lg shadow-xl z-50 print-hidden scrollbar-none py-1 text-[11px] font-normal select-none text-left">
                                                                            {filteredSuggestions.map((item, sugIdx) => (
                                                                                <button
                                                                                    key={sugIdx}
                                                                                    type="button"
                                                                                    onMouseDown={(e) => {
                                                                                        e.preventDefault();
                                                                                    }}
                                                                                    onClick={() => handleSelectSuggestion(grpIdx, rIdx, item)}
                                                                                    className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 focus:bg-blue-50 text-slate-700 hover:text-blue-900 border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                                                                                >
                                                                                    <div className="font-semibold text-slate-800 text-xs">{item.nombre}</div>
                                                                                    <div className="flex gap-2 text-[9px]">
                                                                                        {item.z && <span className="bg-red-50 text-red-700 font-bold px-1 rounded">Z: {item.z}</span>}
                                                                                        {item.cargo && <span className="bg-blue-50 text-blue-700 font-bold px-1 rounded">{item.cargo}</span>}
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            )}
                                                            {renderCargoCell(grpIdx, row, rIdx)}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {/* In-Group controls */}
                                            {!isEffectiveReadOnly && !(isSaving || isSavingPNG) && (
                                                <div className="print-hidden bg-slate-50 border-t border-slate-200 p-1 flex justify-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleAddRow(grpIdx)} 
                                                        className="text-blue-600 hover:text-blue-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-blue-200 bg-white hover:bg-blue-50 flex items-center gap-0.5 shadow-sm"
                                                    >
                                                        <Plus className="w-2.5 h-2.5" /> Fila
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRemoveRow(grpIdx)} 
                                                        className="text-red-600 hover:text-red-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-red-200 bg-white hover:bg-red-50 flex items-center gap-0.5 shadow-sm"
                                                    >
                                                        <Minus className="w-2.5 h-2.5" /> Fila
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* SECOND ROW: Groups 4, 5 & 6 */}
                            <div 
                                className={`grid ${(isPrintPreview || isSaving || isSavingPNG) ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}
                                style={{ gap: `${groupGap}px` }}
                            >
                                {[4, 5, 6].map(grpIdx => {
                                    const grp = grupos.find(g => g.index === grpIdx) || { index: grpIdx, nombreGrupo: `Grupo ${grpIdx}`, filas: [] };
                                    return (
                                        <div key={grpIdx} className="border-2 border-blue-900 rounded-md shadow-sm flex flex-col h-full bg-white relative overflow-hidden">
                                            {/* Group Title Box */}
                                            <div 
                                                contentEditable={!isEffectiveReadOnly}
                                                suppressContentEditableWarning
                                                onBlur={(e) => handleHeaderGroupChange(grpIdx, e.currentTarget.textContent || '')}
                                                className="bg-blue-900 text-white font-bold text-center py-1 uppercase tracking-wider text-[10px] focus:outline-none w-full border-none outline-none hover:bg-blue-800 focus:bg-blue-800"
                                            >
                                                {grp.nombreGrupo}
                                            </div>
                                            {/* Table */}
                                            <table className="w-full text-left flex-1 border-collapse border border-slate-400" style={{ fontSize: 'inherit', lineSpacing: '1.2' }}>
                                                <thead>
                                                    <tr className="bg-slate-100 text-slate-700 font-bold text-[8.5px]">
                                                        <th className="w-5 text-center border border-slate-400">Nº</th>
                                                        <th className="w-5 text-center border border-slate-400">Z</th>
                                                        <th className="border border-slate-400 pl-1">Nombre</th>
                                                        <th className="text-center border border-slate-400">Desig.</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {grp.filas.map((row, rIdx) => (
                                                        <tr key={rIdx} className="hover:bg-slate-50">
                                                            <td 
                                                                className="text-center font-bold border border-slate-400 text-slate-500 focus:outline-none" 
                                                                contentEditable={!isEffectiveReadOnly}
                                                                suppressContentEditableWarning
                                                                onBlur={(e) => handleCellChange(grpIdx, rIdx, 'n', e.currentTarget.textContent || '')}
                                                            >{row.n}</td>
                                                            <td 
                                                                className="text-center border border-slate-400 text-slate-800 font-semibold focus:outline-none" 
                                                                contentEditable={!isEffectiveReadOnly}
                                                                suppressContentEditableWarning
                                                                onBlur={(e) => handleCellChange(grpIdx, rIdx, 'z', e.currentTarget.textContent || '')}
                                                            >{row.z}</td>
                                                            {isEffectiveReadOnly ? (
                                                                <td className="font-medium border border-slate-400 px-1 py-0.5 text-slate-800">{row.nombre}</td>
                                                            ) : (
                                                                <td className="relative font-medium border border-slate-400 p-0 text-slate-800">
                                                                    <div 
                                                                        contentEditable={true}
                                                                        suppressContentEditableWarning
                                                                        className="w-full h-full min-h-[1.5em] px-1 py-0.5 focus:outline-none"
                                                                        onInput={(e) => {
                                                                            const val = e.currentTarget.textContent || '';
                                                                            setSearchQuery(val);
                                                                        }}
                                                                        onFocus={(e) => {
                                                                            setActiveCell({ grpIdx, rIdx });
                                                                            setSearchQuery(e.currentTarget.textContent || '');
                                                                        }}
                                                                        onBlur={(e) => {
                                                                            const val = e.currentTarget.textContent || '';
                                                                            handleCellChange(grpIdx, rIdx, 'nombre', val);
                                                                            setTimeout(() => {
                                                                                setActiveCell(null);
                                                                            }, 250);
                                                                        }}
                                                                    >
                                                                        {row.nombre}
                                                                    </div>
                                                                    {activeCell?.grpIdx === grpIdx && activeCell?.rIdx === rIdx && filteredSuggestions.length > 0 && (
                                                                        <div className="absolute left-0 top-full mt-1 w-64 max-h-48 overflow-y-auto bg-white border border-slate-300 rounded-lg shadow-xl z-50 print-hidden scrollbar-none py-1 text-[11px] font-normal select-none text-left">
                                                                            {filteredSuggestions.map((item, sugIdx) => (
                                                                                <button
                                                                                    key={sugIdx}
                                                                                    type="button"
                                                                                    onMouseDown={(e) => {
                                                                                        e.preventDefault();
                                                                                    }}
                                                                                    onClick={() => handleSelectSuggestion(grpIdx, rIdx, item)}
                                                                                    className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 focus:bg-blue-50 text-slate-700 hover:text-blue-900 border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                                                                                >
                                                                                    <div className="font-semibold text-slate-800 text-xs">{item.nombre}</div>
                                                                                    <div className="flex gap-2 text-[9px]">
                                                                                        {item.z && <span className="bg-red-50 text-red-700 font-bold px-1 rounded">Z: {item.z}</span>}
                                                                                        {item.cargo && <span className="bg-blue-50 text-blue-700 font-bold px-1 rounded">{item.cargo}</span>}
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            )}
                                                            {renderCargoCell(grpIdx, row, rIdx)}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {/* In-Group controls */}
                                            {!isEffectiveReadOnly && !(isSaving || isSavingPNG) && (
                                                <div className="print-hidden bg-slate-50 border-t border-slate-200 p-1 flex justify-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleAddRow(grpIdx)} 
                                                        className="text-blue-600 hover:text-blue-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-blue-200 bg-white hover:bg-blue-50 flex items-center gap-0.5 shadow-sm"
                                                    >
                                                        <Plus className="w-2.5 h-2.5" /> Fila
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRemoveRow(grpIdx)} 
                                                        className="text-red-600 hover:text-red-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-red-200 bg-white hover:bg-red-50 flex items-center gap-0.5 shadow-sm"
                                                    >
                                                        <Minus className="w-2.5 h-2.5" /> Fila
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col font-sans">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <History className="w-5 h-5 text-indigo-600" /> Historial de Autoguardados
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Recupera versiones anteriores de tu rol de grupos local.</p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-700 bg-white shadow-sm border border-slate-200 p-1.5 rounded-md hover:bg-slate-100 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-0 overflow-y-auto bg-slate-50 flex-1">
                            {historyList.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    No hay historial disponible todavía.
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-200">
                                    {historyList.map((hist, idx) => (
                                        <li key={idx} className="p-4 hover:bg-white transition-colors flex items-center justify-between group">
                                            <div>
                                                <div className="font-bold text-sm text-slate-800">{new Date(hist.timestamp).toLocaleString()}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{hist.description}</div>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm("¿Restaurar localmente esta versión? (Pisarás lo que tienes actualmente)")) {
                                                        const p = hist.data;
                                                        if (p.titulo) setTitulo(p.titulo);
                                                        if (p.subtitulo) setSubtitulo(p.subtitulo);
                                                        if (p.fontSize) setFontSize(Number(p.fontSize));
                                                        if (p.titleFontSize) setTitleFontSize(Number(p.titleFontSize));
                                                        if (p.subtitleFontSize) setSubtitleFontSize(Number(p.subtitleFontSize));
                                                        if (p.groupFontSizes) setGroupFontSizes(p.groupFontSizes);
                                                        if (p.pageMargin) setPageMargin(Number(p.pageMargin));
                                                        if (p.rowPadding) setRowPadding(Number(p.rowPadding));
                                                        if (p.groupGap) setGroupGap(Number(p.groupGap));
                                                        if (p.grupos && p.grupos.length > 0) setGrupos(p.grupos);
                                                        saveToLocalStorage(
                                                            p.titulo || titulo, p.subtitulo || subtitulo, Number(p.fontSize) || fontSize, p.grupos || grupos,
                                                            Number(p.pageMargin) || pageMargin, Number(p.rowPadding) || rowPadding, Number(p.groupGap) || groupGap,
                                                            Number(p.titleFontSize) || titleFontSize, Number(p.subtitleFontSize) || subtitleFontSize, p.groupFontSizes || groupFontSizes
                                                        );
                                                        setShowHistoryModal(false);
                                                        alert("Historial restaurado en la vista de edición.");
                                                    }
                                                }}
                                                className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                Restaurar
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default RolGrupos;
