
import React, { useState, useEffect } from 'react';
import { 
    Lock, 
    Unlock, 
    X, 
    Briefcase, 
    CalendarCheck, 
    CheckCircle2, 
    Clock, 
    XCircle, 
    Heart, 
    Tag, 
    Plus, 
    Check, 
    Trash2, 
    MapPin, 
    Phone, 
    ShieldAlert, 
    Award, 
    ShieldCheck, 
    Globe, 
    User,
    Calendar,
    Sparkles,
    KeyRound
} from 'lucide-react';
import { GroupMember, MinistryReport, VisitData, PublisherRole, Publisher } from './types';
import { getAvatarColor, cleanNotes } from './utils';
import { useCongregation } from '../../lib/CongregationContext';

interface EditMemberModalProps {
    member: GroupMember;
    publisherDetails?: Publisher;
    reportEntry: MinistryReport | undefined;
    visitData: VisitData;
    onClose: () => void;
    onReportChange: (name: string, field: keyof MinistryReport, value: any) => void;
    onVisitChange: (name: string, field: keyof VisitData, value: string) => void;
    onUpdateRole: (id: number, role: PublisherRole) => void;
    onUpdatePublisherDetails?: (
        name: string, 
        direccion: string, 
        contactoEmergencia: string, 
        telefonoPersonal?: string, 
        genero?: string, 
        fechaNacimiento?: string, 
        fechaBautismo?: string, 
        esperanza?: string, 
        inicioPrecursorMes?: string, 
        fechaNombramiento?: string, 
        nombreCompleto?: string
    ) => void;
    onSave: (name: string) => void;
    onDelete: (id: number, name: string) => void;
    onRemoveReport: (name: string) => void;
    isReadOnly?: boolean;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({ member, publisherDetails, reportEntry, visitData, onClose, onReportChange, onVisitChange, onUpdateRole, onUpdatePublisherDetails, onSave, onDelete, onRemoveReport, isReadOnly = false }) => {
    const pName = member.publicador_nombre;
    const { currentCongregation } = useCongregation();
    const suggestedConcepts = currentCongregation?.settings?.custom_concepts || ['Inactivo', 'No bautizado', 'Otras ovejas', 'Ungido', 'Apoyo'];
    
    // Helper parsers for member roles
    const getPioneerRoleFromFull = (fullRol: string): PublisherRole => {
        if (fullRol.includes('Precursor Especial')) return 'Precursor Especial';
        if (fullRol.includes('Precursor Regular')) return 'Precursor Regular';
        if (fullRol.includes('Precursor Auxiliar')) return 'Precursor Auxiliar';
        return 'Publicador';
    };

    const getAppointmentFromFull = (fullRol: string): 'None' | 'Anciano' | 'Siervo ministerial' => {
        if (fullRol.includes('Anciano')) return 'Anciano';
        if (fullRol.includes('Siervo ministerial')) return 'Siervo ministerial';
        return 'None';
    };

    const getIsMisioneroFromFull = (fullRol: string): boolean => {
        return fullRol.includes('Misionero');
    };

    const getCustomConceptsFromFull = (fullRol: string): string[] => {
        if (!fullRol) return [];
        const standardParts = ['Anciano', 'Siervo ministerial', 'Precursor Especial', 'Precursor Regular', 'Precursor Auxiliar', 'Misionero', 'Publicador', 'Ninguno'];
        return fullRol
            .split(',')
            .map(p => p.trim())
            .filter(p => p && !standardParts.includes(p));
    };

    const [pioneerRole, setPioneerRole] = useState<PublisherRole>(() => getPioneerRoleFromFull(member.rol || ''));
    const [appointment, setAppointment] = useState<'None' | 'Anciano' | 'Siervo ministerial'>(() => getAppointmentFromFull(member.rol || ''));
    const [isMisionero, setIsMisionero] = useState<boolean>(() => getIsMisioneroFromFull(member.rol || ''));
    const [customConcepts, setCustomConcepts] = useState<string[]>(() => getCustomConceptsFromFull(member.rol || ''));
    const [newConceptInput, setNewConceptInput] = useState<string>('');

    const handleRoleUpdate = (
        newPioneer: PublisherRole, 
        newAppointment: 'None' | 'Anciano' | 'Siervo ministerial', 
        newMisionero: boolean,
        nextCustomConcepts: string[]
    ) => {
        let parts: string[] = [];
        
        if (newAppointment !== 'None') {
            parts.push(newAppointment);
        }
        if (newPioneer !== 'Publicador') {
            parts.push(newPioneer);
        }
        if (newMisionero) {
            parts.push('Misionero');
        }
        
        nextCustomConcepts.forEach(c => {
            if (!parts.includes(c)) {
                parts.push(c);
            }
        });
        
        let finalRol = parts.join(', ');
        if (!finalRol) {
            finalRol = 'Publicador';
        }
        
        onUpdateRole(member.id, finalRol as any);
    };

    const handlePioneerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (isReadOnly) return;
        const val = e.target.value as PublisherRole;
        setPioneerRole(val);
        if ((val === 'Precursor Regular' || val === 'Precursor Especial') && !inicioPrecursorMes) {
            const today = new Date();
            const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            setInicioPrecursorMes(ym);
        }
        handleRoleUpdate(val, appointment, isMisionero, customConcepts);
    };

    const handleAppointmentToggle = (type: 'Anciano' | 'Siervo ministerial') => {
        if (isReadOnly) return;
        let nextAppoint: 'None' | 'Anciano' | 'Siervo ministerial' = 'None';
        if (appointment !== type) {
            nextAppoint = type;
        }
        setAppointment(nextAppoint);
        handleRoleUpdate(pioneerRole, nextAppoint, isMisionero, customConcepts);
    };

    const handleMisioneroToggle = () => {
        if (isReadOnly) return;
        const nextMis = !isMisionero;
        setIsMisionero(nextMis);
        handleRoleUpdate(pioneerRole, appointment, nextMis, customConcepts);
    };
    
    // Parse initial direccion
    const initialDirStr = publisherDetails?.direccion || '';
    let parsedZona = '';
    let parsedUcv = '';
    let parsedDirStr = initialDirStr;
    const zonaMatch = parsedDirStr.match(/\{\{zona:(.*?)\}\}/);
    if (zonaMatch) {
       parsedZona = zonaMatch[1];
       parsedDirStr = parsedDirStr.replace(zonaMatch[0], '');
    }
    const ucvMatch = parsedDirStr.match(/\{\{ucv:(.*?)\}\}/);
    if (ucvMatch) {
       parsedUcv = ucvMatch[1];
       parsedDirStr = parsedDirStr.replace(ucvMatch[0], '');
    }

    const [zona, setZona] = useState<string>(parsedZona);
    const [ucv, setUcv] = useState<string>(parsedUcv);
    const [direccion, setDireccion] = useState<string>(parsedDirStr.trim());

    const getCombinedDireccion = () => {
        let finalStr = direccion;
        if (ucv) finalStr = `{{ucv:${ucv}}}` + finalStr;
        if (zona) finalStr = `{{zona:${zona}}}` + finalStr;
        return finalStr;
    };

    const [contactoEmergencia, setContactoEmergencia] = useState<string>(publisherDetails?.contacto_emergencia || '');
    const [telefonoPersonal, setTelefonoPersonal] = useState<string>(publisherDetails?.telefono_personal || '');
    const [nombreCompleto, setNombreCompleto] = useState<string>(publisherDetails?.nombre_completo || '');
    const [inicioPrecursorMes, setInicioPrecursorMes] = useState<string>(publisherDetails?.inicio_precursor_mes || '');
    const [isNotesUnlocked, setIsNotesUnlocked] = useState(false);

    // Wizard states
    const [wizardStep, setWizardStep] = useState<'initial' | 'options' | 'hours' | 'studies' | 'reason' | null>(null);
    const [wizardHours, setWizardHours] = useState('');
    const [wizardSpecialHours, setWizardSpecialHours] = useState('');
    const [showSpecialHours, setShowSpecialHours] = useState(false);
    const [wizardStudies, setWizardStudies] = useState('');
    const [wizardReason, setWizardReason] = useState('');

    const [isReportUnlocked, setIsReportUnlocked] = useState(false);
    const isReportLocked = reportEntry?.locked && !isReportUnlocked;
    const isReportReadOnly = isReadOnly || isReportLocked;

    const [didPreach, setDidPreach] = useState<boolean>(
        reportEntry ? (reportEntry.participo !== false) : true
    );
    const hasReport = reportEntry !== undefined;

    useEffect(() => {
        if (!reportEntry && !isReportReadOnly) {
            setWizardStep('initial');
        }
    }, []);

    useEffect(() => {
        if (reportEntry && reportEntry.participo !== undefined) {
            setDidPreach(reportEntry.participo);
        }
    }, [reportEntry?.participo]);

    const handleToggleActive = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isReportReadOnly) return;
        if (e.target.checked) {
            setWizardStep('options');
        } else {
            onRemoveReport(pName);
        }
    };

    const handlePreachToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isReportReadOnly) return;
        setDidPreach(e.target.checked);
        if (!e.target.checked) {
            onReportChange(pName, 'horas', '');
            onReportChange(pName, 'horas_especiales', '');
            onReportChange(pName, 'estudios', '');
        }
    };

    // Role change handled via granular helper states

    let visitLabel = 'N/A', visitColor = 'var(--text-color-light)', visitBg = 'var(--bg-color)';
    if (visitData.date) {
        const daysSince = (new Date().getTime() - new Date(visitData.date).getTime()) / (1000 * 3600 * 24);
        if (daysSince < 90) { visitLabel = 'Al día'; visitColor = '#15803d'; visitBg = '#dcfce7'; } 
        else if (daysSince < 180) { visitLabel = 'Atención'; visitColor = '#b45309'; visitBg = '#fef3c7'; } 
        else { visitLabel = 'Urgente'; visitColor = '#b91c1c'; visitBg = '#fee2e2'; }
    }

    const handleNotasChange = (newVal: string) => {
        const rawNotes = reportEntry?.notas || '';
        const tagsMatch = rawNotes.match(/\{\{.*?\}\}/g) || [];
        const tagsString = tagsMatch.join(' ');
        const combined = (newVal.trim() + ' ' + tagsString).trim();
        onReportChange(pName, 'notas', combined);
    };

    const totalHours = reportEntry ? (Number(reportEntry.horas || 0) + Number(reportEntry.horas_especiales || 0)) : 0;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
            <div style={{ backgroundColor: 'var(--card-bg-color)', width: '100%', maxWidth: '500px', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '95vh', maxHeight: '95vh', animation: 'slideUp 0.3s ease-out', color: 'var(--text-color)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                
                {/* Wizard Overlay */}
                {wizardStep !== null && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(2px)' }}>
                        <div style={{ backgroundColor: 'var(--card-bg-color)', width: '100%', borderRadius: '16px', padding: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', animation: 'fadeIn 0.2s ease-out' }}>
                            {wizardStep === 'initial' && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ backgroundColor: '#e0e7ff', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                                        <i className="fas fa-file-alt" style={{ fontSize: '24px', color: '#4f46e5' }}></i>
                                    </div>
                                    <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', color: 'var(--text-color)' }}>¿Desea registrar informe de predicación?</h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-color-light)', marginBottom: '20px' }}>Puede registrar la actividad de {pName} ahora o hacerlo más tarde.</p>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => setWizardStep(null)} style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '10px', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontWeight: 'bold' }}>Más tarde</button>
                                        <button onClick={() => setWizardStep('options')} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: '#4f46e5', color: 'white', fontWeight: 'bold' }}>Sí, registrar</button>
                                    </div>
                                </div>
                            )}

                            {wizardStep === 'options' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Opciones de Informe</h3>
                                        <button onClick={() => setWizardStep(null)} style={{ border: 'none', background: 'transparent', color: 'var(--text-color-light)', fontSize: '1.2rem', cursor: 'pointer' }}><i className="fas fa-times"></i></button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <button onClick={() => {
                                            setWizardStep('reason');
                                        }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', textAlign: 'left', cursor: 'pointer' }}>
                                            <i className="fas fa-times-circle" style={{ fontSize: '1.4rem', color: '#ef4444' }}></i>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>No participó</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-color-light)' }}>No tuvo actividad este mes</div>
                                            </div>
                                        </button>
                                        
                                        <button onClick={() => {
                                            setWizardStep('studies');
                                        }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', textAlign: 'left', cursor: 'pointer' }}>
                                            <i className="fas fa-check-circle" style={{ fontSize: '1.4rem', color: '#10b981' }}></i>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>Participó (Sin horas)</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-color-light)' }}>Informa participación y cursos bíblicos</div>
                                            </div>
                                        </button>
                                        
                                        <button onClick={() => {
                                            setWizardStep('hours');
                                        }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: '#eff6ff', textAlign: 'left', cursor: 'pointer' }}>
                                            <i className="fas fa-clock" style={{ fontSize: '1.4rem', color: '#3b82f6' }}></i>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#1e40af' }}>Participó (Con horas)</div>
                                                <div style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Informa horas, participación y cursos</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {wizardStep === 'reason' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <button onClick={() => setWizardStep('options')} style={{ border: 'none', background: 'transparent', color: 'var(--text-color-light)', cursor: 'pointer' }}><i className="fas fa-arrow-left"></i> Volver</button>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Motivo (Opcional)</h3>
                                        <button onClick={() => setWizardStep(null)} style={{ border: 'none', background: 'transparent', color: 'var(--text-color-light)', cursor: 'pointer' }}><i className="fas fa-times"></i></button>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div>
                                            <select 
                                                value={wizardReason} 
                                                onChange={(e) => setWizardReason(e.target.value)} 
                                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor:'var(--bg-color)', color:'var(--text-color)', boxSizing: 'border-box', fontSize:'1.05rem', cursor: 'pointer' }}
                                            >
                                                <option value="">Seleccione o deje en blanco...</option>
                                                <option value="Salud">Salud</option>
                                                <option value="Embarazo">Embarazo</option>
                                                <option value="Viaje">Viaje</option>
                                                <option value="Otros">Otros</option>
                                            </select>
                                        </div>
                                        
                                        <button onClick={() => {
                                            onReportChange(pName, 'horas', '');
                                            onReportChange(pName, 'horas_especiales', '');
                                            onReportChange(pName, 'estudios', '');
                                            onReportChange(pName, 'participo', false);
                                            onReportChange(pName, 'notas', wizardReason);
                                            setDidPreach(false);
                                            
                                            // Final Guardar
                                            if (onUpdatePublisherDetails) onUpdatePublisherDetails(pName, getCombinedDireccion(), contactoEmergencia, telefonoPersonal); 
                                            onSave(pName); 
                                            onClose();
                                        }} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.05rem', marginTop: '10px' }}>
                                            Guardar Informe
                                        </button>
                                    </div>
                                </div>
                            )}

                            {wizardStep === 'studies' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <button onClick={() => setWizardStep('options')} style={{ border: 'none', background: 'transparent', color: 'var(--text-color-light)', cursor: 'pointer' }}><i className="fas fa-arrow-left"></i> Volver</button>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Cursos Bíblicos</h3>
                                        <button onClick={() => setWizardStep(null)} style={{ border: 'none', background: 'transparent', color: 'var(--text-color-light)', cursor: 'pointer' }}><i className="fas fa-times"></i></button>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-color-light)', marginBottom: '8px' }}>Cursos Bíblicos</label>
                                            <input type="number" min="0" placeholder="0" value={wizardStudies} onChange={e => setWizardStudies(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '1.1rem', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', textAlign: 'center' }} />
                                        </div>
                                        
                                        <button onClick={() => {
                                            onReportChange(pName, 'horas', '');
                                            if (wizardSpecialHours) onReportChange(pName, 'horas_especiales', '');
                                            onReportChange(pName, 'estudios', wizardStudies);
                                            onReportChange(pName, 'participo', true);
                                            setDidPreach(true);
                                            
                                            // Final Guardar
                                            if (onUpdatePublisherDetails) onUpdatePublisherDetails(pName, getCombinedDireccion(), contactoEmergencia, telefonoPersonal); 
                                            onSave(pName); 
                                            onClose();
                                        }} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.05rem', marginTop: '10px' }}>
                                            Guardar Informe
                                        </button>
                                    </div>
                                </div>
                            )}

                            {wizardStep === 'hours' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <button onClick={() => setWizardStep('options')} style={{ border: 'none', background: 'transparent', color: 'var(--text-color-light)', cursor: 'pointer' }}><i className="fas fa-arrow-left"></i> Volver</button>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Registro de Actividad</h3>
                                        <button onClick={() => setWizardStep(null)} style={{ border: 'none', background: 'transparent', color: 'var(--text-color-light)', cursor: 'pointer' }}><i className="fas fa-times"></i></button>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-color-light)', marginBottom: '8px' }}>Horas de Predicación</label>
                                            <input type="number" step="0.5" min="0" placeholder="0" value={wizardHours} onChange={e => setWizardHours(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '1.1rem', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', textAlign: 'center' }} />
                                        </div>
                                        
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', backgroundColor: 'var(--bg-color)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                            <input type="checkbox" checked={showSpecialHours} onChange={e => setShowSpecialHours(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: '500' }}>Añadir horas especiales</span>
                                        </label>
                                        
                                        {showSpecialHours && (
                                            <div style={{ animation: 'fadeIn 0.2s' }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-color-light)', marginBottom: '8px' }}>Horas Especiales</label>
                                                <input type="number" step="0.5" min="0" placeholder="0" value={wizardSpecialHours} onChange={e => setWizardSpecialHours(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '1.1rem', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', textAlign: 'center' }} />
                                            </div>
                                        )}
                                        
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-color-light)', marginBottom: '8px' }}>Cursos Bíblicos</label>
                                            <input type="number" min="0" placeholder="0" value={wizardStudies} onChange={e => setWizardStudies(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '1.1rem', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', textAlign: 'center' }} />
                                        </div>
                                        
                                        <button onClick={() => {
                                            onReportChange(pName, 'horas', wizardHours);
                                            if (showSpecialHours) onReportChange(pName, 'horas_especiales', wizardSpecialHours);
                                            onReportChange(pName, 'estudios', wizardStudies);
                                            onReportChange(pName, 'participo', true);
                                            setDidPreach(true);
                                            
                                            // Final Guardar
                                            if (onUpdatePublisherDetails) onUpdatePublisherDetails(pName, getCombinedDireccion(), contactoEmergencia, telefonoPersonal); 
                                            onSave(pName); 
                                            onClose();
                                        }} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.05rem', marginTop: '10px' }}>
                                            Guardar Informe
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Header iOS Style */}
                <div style={{ 
                    padding: '16px 20px', 
                    borderBottom: '1px solid var(--border-color)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexShrink: 0,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ 
                            width: '42px', 
                            height: '42px', 
                            borderRadius: '12px', 
                            backgroundColor: getAvatarColor(nombreCompleto || pName), 
                            color: 'white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: '700', 
                            fontSize: '1.2rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)' 
                        }}>
                            {(nombreCompleto || pName).charAt(0)}
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-color)', letterSpacing: '-0.01em' }}>
                                {nombreCompleto || pName}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <select 
                                    value={pioneerRole} 
                                    onChange={handlePioneerChange}
                                    disabled={isReadOnly} 
                                    style={{ 
                                        fontSize: '0.78rem', 
                                        border: '1px solid var(--border-color)', 
                                        borderRadius: '8px',
                                        background: 'var(--card-bg-color)', 
                                        color: 'var(--text-color)', 
                                        fontWeight: '600', 
                                        padding: '3px 8px',
                                        cursor: isReadOnly ? 'default' : 'pointer',
                                        outline: 'none',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                    }}
                                >
                                    <option value="Publicador">Publicador</option>
                                    <option value="Precursor Auxiliar">Precursor Auxiliar</option>
                                    <option value="Precursor Regular">Precursor Regular</option>
                                    <option value="Precursor Especial">Precursor Especial</option>
                                </select>

                                {/* Privileges Checkboxes */}
                                <label style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '4px', 
                                    fontSize: '0.75rem', 
                                    color: (publisherDetails?.genero === 'Mujer') ? 'var(--text-color-light)' : 'var(--text-color)', 
                                    fontWeight: '600', 
                                    cursor: (isReadOnly || (publisherDetails?.genero === 'Mujer')) ? 'default' : 'pointer',
                                    opacity: (publisherDetails?.genero === 'Mujer') ? 0.45 : 1,
                                    userSelect: 'none',
                                    backgroundColor: appointment === 'Anciano' ? '#eff6ff' : 'transparent',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    border: appointment === 'Anciano' ? '1px solid #bfdbfe' : '1px solid transparent'
                                }} title={(publisherDetails?.genero === 'Mujer') ? 'Solo para varones' : ''}>
                                    <input 
                                        type="checkbox" 
                                        checked={appointment === 'Anciano'} 
                                        disabled={isReadOnly || (publisherDetails?.genero === 'Mujer')}
                                        onChange={() => handleAppointmentToggle('Anciano')}
                                        style={{ accentColor: '#2563eb' }}
                                    />
                                    Anciano
                                </label>

                                <label style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '4px', 
                                    fontSize: '0.75rem', 
                                    color: (publisherDetails?.genero === 'Mujer') ? 'var(--text-color-light)' : 'var(--text-color)', 
                                    fontWeight: '600', 
                                    cursor: (isReadOnly || (publisherDetails?.genero === 'Mujer')) ? 'default' : 'pointer',
                                    opacity: (publisherDetails?.genero === 'Mujer') ? 0.45 : 1,
                                    userSelect: 'none',
                                    backgroundColor: appointment === 'Siervo ministerial' ? '#eff6ff' : 'transparent',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    border: appointment === 'Siervo ministerial' ? '1px solid #bfdbfe' : '1px solid transparent'
                                }} title={(publisherDetails?.genero === 'Mujer') ? 'Solo para varones' : ''}>
                                    <input 
                                        type="checkbox" 
                                        checked={appointment === 'Siervo ministerial'} 
                                        disabled={isReadOnly || (publisherDetails?.genero === 'Mujer')}
                                        onChange={() => handleAppointmentToggle('Siervo ministerial')}
                                        style={{ accentColor: '#2563eb' }}
                                    />
                                    Siervo min.
                                </label>

                                <label style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '4px', 
                                    fontSize: '0.75rem', 
                                    color: 'var(--text-color)', 
                                    fontWeight: '600', 
                                    cursor: isReadOnly ? 'default' : 'pointer',
                                    userSelect: 'none',
                                    backgroundColor: isMisionero ? '#fdf2f8' : 'transparent',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    border: isMisionero ? '1px solid #fbcfe8' : '1px solid transparent'
                                }}>
                                    <input 
                                        type="checkbox" 
                                        checked={isMisionero} 
                                        disabled={isReadOnly}
                                        onChange={handleMisioneroToggle}
                                        style={{ accentColor: '#db2777' }}
                                    />
                                    Misionero
                                </label>
                            </div>
                            {(pioneerRole === 'Precursor Regular' || pioneerRole === 'Precursor Especial') && (
                                <div style={{ 
                                    marginTop: '8px', 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    backgroundColor: 'var(--bg-color)', 
                                    padding: '4px 10px', 
                                    borderRadius: '8px', 
                                    border: '1px solid var(--border-color)', 
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)' 
                                }}>
                                    <Sparkles size={13} color="#d97706" />
                                    <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-color)', letterSpacing: '0.02em' }}>Inicio precursor:</span>
                                    <input 
                                        type="month"
                                        value={inicioPrecursorMes ? (inicioPrecursorMes.includes('-') && inicioPrecursorMes.length >= 7 ? inicioPrecursorMes.substring(0, 7) : inicioPrecursorMes) : ''}
                                        disabled={isReadOnly}
                                        onChange={(e) => setInicioPrecursorMes(e.target.value)}
                                        style={{
                                            fontSize: '0.78rem',
                                            padding: '2px 6px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--card-bg-color)',
                                            color: 'var(--text-color)',
                                            fontWeight: '600',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            border: 'none', 
                            background: 'var(--bg-color)', 
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-color-light)', 
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        <X size={18} strokeWidth={2.5} />
                    </button>
                </div>

                <div style={{ padding: '16px 20px', overflowY: 'auto', backgroundColor: 'var(--bg-color)', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif' }}>
                    {/* Informe */}
                    <div style={{ backgroundColor: 'var(--card-bg-color)', padding: '18px 20px', borderRadius: '16px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom:'10px', borderBottom:'1px solid var(--border-color)' }}>
                            <h4 style={{ margin: 0, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: '700' }}>
                                <Briefcase size={16} strokeWidth={2.2} /> Informe del Mes
                                {!isReadOnly && (
                                    <button
                                        onClick={() => {
                                            if (isReportLocked) {
                                                const pwd = window.prompt('Ingrese clave para desbloquear:');
                                                if (pwd === '9803') {
                                                    setIsReportUnlocked(true);
                                                } else if (pwd !== null) {
                                                    alert('Clave incorrecta');
                                                }
                                            } else {
                                                if (window.confirm('¿Bloquear registro de este mes?')) {
                                                    onReportChange(pName, 'locked', true);
                                                    setIsReportUnlocked(false);
                                                }
                                            }
                                        }}
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.5, padding: '0 4px', display: 'inline-flex', alignItems: 'center' }}
                                    >
                                        {isReportLocked ? <Lock size={14} color="#dc2626" /> : <Unlock size={14} color="#64748b" />}
                                    </button>
                                )}
                            </h4>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: isReportReadOnly ? 'default' : 'pointer' }}>
                                <span style={{ fontSize: '0.82rem', color: hasReport ? '#2563eb' : 'var(--text-color-light)', fontWeight: '700' }}>{hasReport ? 'Entregado' : 'Sin entregar'}</span>
                                <div style={{ position: 'relative', width: '42px', height: '24px' }}>
                                    <input type="checkbox" checked={hasReport} onChange={handleToggleActive} disabled={isReportReadOnly} style={{ opacity: 0, width: 0, height: 0 }} />
                                    <span style={{ position: 'absolute', cursor: isReportReadOnly ? 'default' : 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: hasReport ? '#2563eb' : 'var(--border-color)', transition: '.3s', borderRadius: '34px', opacity: isReportReadOnly ? 0.6 : 1 }}></span>
                                    <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: hasReport ? '20px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.3s', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
                                </div>
                            </label>
                        </div>
                        {hasReport ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.3s ease-in' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-color-light)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Actividad del Mes</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <button 
                                            onClick={() => { if(!isReportReadOnly) { onReportChange(pName, 'horas', ''); onReportChange(pName, 'horas_especiales', ''); onReportChange(pName, 'estudios', ''); onReportChange(pName, 'participo', false); setDidPreach(false); } }}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', 
                                                backgroundColor: !didPreach ? '#fee2e2' : 'var(--bg-color)', 
                                                border: !didPreach ? '1.5px solid #ef4444' : '1px solid var(--border-color)', 
                                                borderRadius: '12px', cursor: isReportReadOnly ? 'default' : 'pointer', textAlign: 'left',
                                                transition: 'all 0.15s',
                                                color: !didPreach ? '#dc2626' : 'var(--text-color)'
                                            }}
                                        >
                                            <XCircle size={20} color={!didPreach ? '#dc2626' : '#94a3b8'} strokeWidth={2.2} />
                                            <div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>No participó</div>
                                                <div style={{ fontSize: '0.73rem', color: !didPreach ? '#dc2626' : 'var(--text-color-light)', opacity: 0.85 }}>No tuvo actividad en la predicación este mes</div>
                                            </div>
                                        </button>

                                        <button 
                                            onClick={() => { if(!isReportReadOnly) { onReportChange(pName, 'horas', ''); onReportChange(pName, 'horas_especiales', ''); onReportChange(pName, 'participo', true); setDidPreach(true); } }}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', 
                                                backgroundColor: didPreach && Number(reportEntry?.horas || 0) === 0 && Number(reportEntry?.horas_especiales || 0) === 0 ? '#dcfce7' : 'var(--bg-color)', 
                                                border: didPreach && Number(reportEntry?.horas || 0) === 0 && Number(reportEntry?.horas_especiales || 0) === 0 ? '1.5px solid #10b981' : '1px solid var(--border-color)', 
                                                borderRadius: '12px', cursor: isReportReadOnly ? 'default' : 'pointer', textAlign: 'left',
                                                transition: 'all 0.15s',
                                                color: didPreach && Number(reportEntry?.horas || 0) === 0 && Number(reportEntry?.horas_especiales || 0) === 0 ? '#047857' : 'var(--text-color)'
                                            }}
                                        >
                                            <CheckCircle2 size={20} color={didPreach && Number(reportEntry?.horas || 0) === 0 && Number(reportEntry?.horas_especiales || 0) === 0 ? '#047857' : '#94a3b8'} strokeWidth={2.2} />
                                            <div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>Participó (Sin horas)</div>
                                                <div style={{ fontSize: '0.73rem', color: didPreach && Number(reportEntry?.horas || 0) === 0 && Number(reportEntry?.horas_especiales || 0) === 0 ? '#047857' : 'var(--text-color-light)', opacity: 0.85 }}>Informa participación y cursos bíblicos</div>
                                            </div>
                                        </button>

                                        <button 
                                            onClick={() => { if(!isReportReadOnly) { setDidPreach(true); onReportChange(pName, 'participo', true); if(Number(reportEntry?.horas || 0) === 0 && Number(reportEntry?.horas_especiales || 0) === 0) { onReportChange(pName, 'horas', 1); } } }}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', 
                                                backgroundColor: didPreach && (Number(reportEntry?.horas || 0) > 0 || Number(reportEntry?.horas_especiales || 0) > 0) ? '#dbeafe' : 'var(--bg-color)', 
                                                border: didPreach && (Number(reportEntry?.horas || 0) > 0 || Number(reportEntry?.horas_especiales || 0) > 0) ? '1.5px solid #2563eb' : '1px solid var(--border-color)', 
                                                borderRadius: '12px', cursor: isReportReadOnly ? 'default' : 'pointer', textAlign: 'left',
                                                transition: 'all 0.15s',
                                                color: didPreach && (Number(reportEntry?.horas || 0) > 0 || Number(reportEntry?.horas_especiales || 0) > 0) ? '#1d4ed8' : 'var(--text-color)'
                                            }}
                                        >
                                            <Clock size={20} color={didPreach && (Number(reportEntry?.horas || 0) > 0 || Number(reportEntry?.horas_especiales || 0) > 0) ? '#1d4ed8' : '#94a3b8'} strokeWidth={2.2} />
                                            <div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>Participó (Con horas)</div>
                                                <div style={{ fontSize: '0.73rem', color: didPreach && (Number(reportEntry?.horas || 0) > 0 || Number(reportEntry?.horas_especiales || 0) > 0) ? '#1d4ed8' : 'var(--text-color-light)', opacity: 0.85 }}>Informa horas dedicadas, participación y cursos</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                                
                                {didPreach && (
                                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                        {(Number(reportEntry?.horas || 0) > 0 || Number(reportEntry?.horas_especiales || 0) > 0 || pioneerRole.includes('Precursor')) && (
                                            <>
                                                <div style={{ flex: 1, minWidth: '100px', animation: 'fadeIn 0.2s' }}>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '6px', textTransform:'uppercase' }}>Horas Pred.</label>
                                                    <input type="number" step="0.5" min="0" disabled={isReportReadOnly} value={reportEntry?.horas === 0 || reportEntry?.horas === '0' || reportEntry?.horas === '' ? '' : reportEntry?.horas} onChange={(e) => onReportChange(pName, 'horas', e.target.value)} placeholder="0" style={{ width: '100%', padding: '12px', fontSize: '1.2rem', fontWeight:'bold', borderRadius: '10px', border: '2px solid var(--border-color)', backgroundColor:'var(--bg-color)', color:'var(--text-color)', textAlign: 'center' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: '100px', animation: 'fadeIn 0.2s' }}>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '6px', textTransform:'uppercase' }}>Horas Esp.</label>
                                                    <input type="number" step="0.5" min="0" disabled={isReportReadOnly} value={reportEntry?.horas_especiales === 0 || reportEntry?.horas_especiales === '0' || reportEntry?.horas_especiales === '' ? '' : reportEntry?.horas_especiales} onChange={(e) => onReportChange(pName, 'horas_especiales', e.target.value)} placeholder="0" style={{ width: '100%', padding: '12px', fontSize: '1.2rem', fontWeight:'bold', borderRadius: '10px', border: '2px solid var(--border-color)', backgroundColor:'var(--bg-color)', color:'var(--text-color)', textAlign: 'center' }} />
                                                </div>
                                            </>
                                        )}
                                        <div style={{ flex: 1, minWidth: '100px', animation: 'fadeIn 0.2s' }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '6px', textTransform:'uppercase' }}>Cursos</label>
                                            <input type="number" min="0" disabled={isReportReadOnly} value={reportEntry?.estudios === 0 || reportEntry?.estudios === '0' || reportEntry?.estudios === '' ? '' : reportEntry?.estudios} onChange={(e) => onReportChange(pName, 'estudios', e.target.value)} placeholder="0" style={{ width: '100%', padding: '12px', fontSize: '1.2rem', fontWeight:'bold', borderRadius: '10px', border: '2px solid var(--border-color)', backgroundColor:'var(--bg-color)', color:'var(--text-color)', textAlign: 'center' }} />
                                        </div>
                                    </div>
                                )}

                                {didPreach && totalHours > 0 && (
                                    <div style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                                        Total Horas: {totalHours}
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '6px', textTransform:'uppercase' }}>Notas</label>
                                    <input type="text" disabled={isReportReadOnly} value={cleanNotes(reportEntry?.notas || '')} onChange={(e) => handleNotasChange(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor:'var(--bg-color)', color:'var(--text-color)', boxSizing: 'border-box', fontSize:'0.95rem' }} placeholder="Observaciones..." />
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-color-light)', backgroundColor: 'var(--bg-color)', borderRadius: '10px', fontSize:'0.9rem' }}>Sin actividad registrada.</div>
                        )}
                    </div>
                    {/* Pastoreo */}
                    <div style={{ backgroundColor: 'var(--card-bg-color)', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ margin: 0, color: '#ec4899', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>🐑 Pastoreo</h4>
                            <span style={{ backgroundColor: visitBg, color: visitColor, padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', textTransform:'uppercase', letterSpacing:'0.05em' }}>{visitLabel}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '6px', textTransform:'uppercase' }}>Última Visita</label>
                                <input type="date" disabled={isReadOnly} value={visitData.date} onChange={(e) => onVisitChange(pName, 'date', e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor:'var(--bg-color)', boxSizing: 'border-box', color:'var(--text-color)', fontWeight:'500' }} />
                            </div>
                            <div>
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '6px', textTransform:'uppercase' }}>
                                    <span>Apuntes Privados</span>
                                    {!isNotesUnlocked && (
                                        <button 
                                            onClick={() => {
                                                const PWD_KEY = 'vmt_notes_password';
                                                const savedPwd = localStorage.getItem(PWD_KEY);
                                                const promptMsg = savedPwd ? "Ingrese la clave para ver/editar apuntes privados:" : "Cree una clave nueva para sus apuntes privados (se guardará en este dispositivo):";
                                                const pwd = window.prompt(promptMsg);
                                                
                                                if (pwd !== null) {
                                                    if (!savedPwd) {
                                                        if (pwd.trim().length > 0) {
                                                            localStorage.setItem(PWD_KEY, pwd);
                                                            setIsNotesUnlocked(true);
                                                        } else {
                                                            alert("La clave no puede estar vacía.");
                                                        }
                                                    } else if (pwd === savedPwd) {
                                                        setIsNotesUnlocked(true);
                                                    } else {
                                                        alert("Clave incorrecta.");
                                                    }
                                                }
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#ec4899', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', padding: 0 }}
                                        >
                                            <i className="fas fa-lock"></i> Desbloquear
                                        </button>
                                    )}
                                    {isNotesUnlocked && (
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button 
                                                onClick={() => {
                                                    const newPwd = window.prompt("Ingrese nueva clave:");
                                                    if (newPwd !== null) {
                                                        if (newPwd.trim().length > 0) {
                                                            localStorage.setItem('vmt_notes_password', newPwd);
                                                            alert("Clave cambiada con éxito.");
                                                        } else {
                                                            alert("La clave no puede estar vacía.");
                                                        }
                                                    }
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', padding: 0 }}
                                            >
                                                <i className="fas fa-key"></i> Cambiar clave
                                            </button>
                                            <button 
                                                onClick={() => setIsNotesUnlocked(false)}
                                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', padding: 0 }}
                                            >
                                                <i className="fas fa-unlock"></i> Ocultar
                                            </button>
                                        </div>
                                    )}
                                </label>
                                {!isNotesUnlocked ? (
                                    <div style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor:'var(--bg-color)', boxSizing: 'border-box', fontSize:'0.95rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fas fa-eye-slash"></i> Contenido oculto
                                    </div>
                                ) : (
                                    <input type="text" disabled={isReadOnly} value={visitData.notes || ''} onChange={(e) => onVisitChange(pName, 'notes', e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor:'var(--bg-color)', boxSizing: 'border-box', fontSize:'0.95rem', color: 'var(--text-color)' }} placeholder="Nota de visita..." />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Conceptos y Estados */}
                    <div style={{ backgroundColor: 'var(--card-bg-color)', padding: '20px', borderRadius: '16px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ marginBottom: '15px' }}>
                            <h4 style={{ margin: 0, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                                <i className="fas fa-tags"></i> Conceptos y Estados de Grupo
                            </h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-color-light)' }}>
                                Agrega conceptos personalizados (ej. inactivos, no bautizados, etc.) de manera individual o grupal.
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {/* Standard Quick Tags */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '8px', textTransform:'uppercase' }}>
                                    Sugerencias básicas
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {suggestedConcepts.map(concept => {
                                        const isSelected = customConcepts.includes(concept);
                                        return (
                                            <button
                                                key={concept}
                                                disabled={isReadOnly}
                                                onClick={() => {
                                                    let nextConcepts;
                                                    if (isSelected) {
                                                        nextConcepts = customConcepts.filter(c => c !== concept);
                                                    } else {
                                                        nextConcepts = [...customConcepts, concept];
                                                    }
                                                    setCustomConcepts(nextConcepts);
                                                    handleRoleUpdate(pioneerRole, appointment, isMisionero, nextConcepts);
                                                }}
                                                style={{
                                                    padding: '5px 12px',
                                                    fontSize: '0.75rem',
                                                    borderRadius: '20px',
                                                    border: isSelected ? '1px solid #c084fc' : '1px solid var(--border-color)',
                                                    backgroundColor: isSelected ? '#faf5ff' : 'var(--bg-color)',
                                                    color: isSelected ? '#a855f7' : 'var(--text-color)',
                                                    fontWeight: isSelected ? '700' : '500',
                                                    cursor: isReadOnly ? 'default' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {isSelected ? <i className="fas fa-check" style={{ fontSize: '0.7rem' }}></i> : <i className="fas fa-plus" style={{ fontSize: '0.7rem', opacity: 0.5 }}></i>}
                                                {concept}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Add Custom Concept */}
                            {!isReadOnly && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        value={newConceptInput}
                                        onChange={(e) => setNewConceptInput(e.target.value)}
                                        placeholder="Escribir otro concepto..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = newConceptInput.trim();
                                                if (val && !customConcepts.includes(val)) {
                                                    const nextConcepts = [...customConcepts, val];
                                                    setCustomConcepts(nextConcepts);
                                                    handleRoleUpdate(pioneerRole, appointment, isMisionero, nextConcepts);
                                                    setNewConceptInput('');
                                                }
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--bg-color)',
                                            color: 'var(--text-color)',
                                            fontSize: '0.85rem',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            const val = newConceptInput.trim();
                                            if (val && !customConcepts.includes(val)) {
                                                const nextConcepts = [...customConcepts, val];
                                                setCustomConcepts(nextConcepts);
                                                handleRoleUpdate(pioneerRole, appointment, isMisionero, nextConcepts);
                                                setNewConceptInput('');
                                            }
                                        }}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: '#a855f7',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Agregar
                                    </button>
                                </div>
                            )}

                            {/* Active Custom Concepts */}
                            {customConcepts.length > 0 && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '6px', textTransform:'uppercase' }}>
                                        Conceptos asignados
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {customConcepts.map(c => (
                                            <span
                                                key={c}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: '#fff5f5',
                                                    color: '#c53030',
                                                    border: '1px solid #feb2b2'
                                                }}
                                            >
                                                {c}
                                                {!isReadOnly && (
                                                    <button
                                                        onClick={() => {
                                                            const nextConcepts = customConcepts.filter(x => x !== c);
                                                            setCustomConcepts(nextConcepts);
                                                            handleRoleUpdate(pioneerRole, appointment, isMisionero, nextConcepts);
                                                        }}
                                                        style={{
                                                            border: 'none',
                                                            background: 'transparent',
                                                            color: '#c53030',
                                                            cursor: 'pointer',
                                                            padding: 0,
                                                            fontSize: '0.85rem',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        &times;
                                                    </button>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Datos Personales */}
                    <div style={{ backgroundColor: 'var(--card-bg-color)', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ margin: 0, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}><i className="fas fa-address-card"></i> Datos Personales</h4>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '6px', textTransform:'uppercase' }}>Nombre Completo (Oculta el nombre corto)</label>
                                <input type="text" disabled={isReadOnly} value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor:'var(--bg-color)', boxSizing: 'border-box', fontSize:'0.95rem', color: 'var(--text-color)' }} placeholder="Ej: Aaron Quispe Coronado Lara" />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '6px', textTransform:'uppercase' }}>Zona</label>
                                    <input type="text" disabled={isReadOnly} value={zona} onChange={(e) => setZona(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor:'var(--bg-color)', boxSizing: 'border-box', fontSize:'0.95rem', color: 'var(--text-color)' }} placeholder="Ej: 1" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '6px', textTransform:'uppercase' }}>UCV</label>
                                    <input type="text" disabled={isReadOnly} value={ucv} onChange={(e) => setUcv(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor:'var(--bg-color)', boxSizing: 'border-box', fontSize:'0.95rem', color: 'var(--text-color)' }} placeholder="Ej: A" />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '6px', textTransform:'uppercase' }}>Lote</label>
                                <input type="text" disabled={isReadOnly} value={direccion} onChange={(e) => setDireccion(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor:'var(--bg-color)', boxSizing: 'border-box', fontSize:'0.95rem', color: 'var(--text-color)' }} placeholder="Ej: Lote 14..." />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '6px', textTransform:'uppercase' }}>Número de contacto personal</label>
                                <input type="text" disabled={isReadOnly} value={telefonoPersonal} onChange={(e) => setTelefonoPersonal(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor:'var(--bg-color)', boxSizing: 'border-box', fontSize:'0.95rem', color: 'var(--text-color)' }} placeholder="Ej: +123456789..." />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight:'700', color: 'var(--text-color-light)', marginBottom: '6px', textTransform:'uppercase' }}>Contacto en caso de emergencia</label>
                                <input type="text" disabled={isReadOnly} value={contactoEmergencia} onChange={(e) => setContactoEmergencia(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor:'var(--bg-color)', boxSizing: 'border-box', fontSize:'0.95rem', color: 'var(--text-color)' }} placeholder="Nombre y celular..." />
                            </div>
                        </div>
                    </div>

                </div>
                <div style={{ padding: '15px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '15px', backgroundColor:'var(--card-bg-color)' }}>
                    {!isReadOnly && (
                        <button onClick={() => { 
                            if(window.confirm('¿Eliminar del grupo?')) { 
                                const pin = window.prompt('Ingrese la contraseña para edición (9803):');
                                if (pin === '9803') {
                                    onDelete(member.id, pName); 
                                    onClose(); 
                                } else if (pin !== null) {
                                    alert('Contraseña incorrecta');
                                }
                            } 
                        }} style={{ width:'50px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius: '12px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}><i className="fas fa-trash-alt" style={{fontSize:'1.1rem'}}></i></button>
                    )}
                    {isReadOnly ? (
                        <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#64748b', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '1rem', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)' }}>Cerrar</button>
                    ) : (
                        <button onClick={() => { 
                            if (onUpdatePublisherDetails) {
                                onUpdatePublisherDetails(
                                    pName, 
                                    getCombinedDireccion(), 
                                    contactoEmergencia, 
                                    telefonoPersonal, 
                                    publisherDetails?.genero || '', 
                                    publisherDetails?.fecha_nacimiento || '', 
                                    publisherDetails?.fecha_bautismo || '', 
                                    publisherDetails?.esperanza || '', 
                                    inicioPrecursorMes, 
                                    publisherDetails?.fecha_nombramiento || '', 
                                    nombreCompleto
                                );
                            }
                            onSave(pName); 
                            onClose(); 
                        }} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '1rem', boxShadow:'0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}>Guardar</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditMemberModal;
