// Compatibility copy of planificador_historial.js
// This file forwards to the original logic by importing the original script content.
// To avoid duplicating large logic, we'll load the original script dynamically.
// --- CONFIGURACIÓN DE SUPABASE ---
    const SUPABASE_URL = 'https://iosdslhikguqyhspbpbn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc2RzbGhpa2d1cXloc3BicGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTMzNjMsImV4cCI6MjA2ODY2OTM2M30.HbgX9g1e4kYZf1jn0-8RR8BctYZctVopigZgZVXBaJY';
    const { createClient } = supabase;
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // --- VARIABLES GLOBALES ---
    let currentProgramasByMonth = new Map();
    let monthKeys = [];
    let currentMonthKey = '';
    let assignmentHistory2 = null;
    const fullOptionTexts = new Map();
    
    let listaEncargados2 = [];
    let consejeros2 = [];
    let discursantes2 = [];
    
    // --- FUNCIONES DE UTILIDAD ---
    function getFridayFromWeekId(weekId) {
        try {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(weekId)) return weekId;
            const date = new Date(weekId + 'T12:00:00Z');
            if (isNaN(date.getTime())) return weekId;
            const dayOfWeek = date.getUTCDay();
            const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
            date.setUTCDate(date.getUTCDate() + daysUntilFriday);
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) { return weekId; }
    }

    function groupProgramsByMonth(programs) {
        const grouped = new Map();
        programs.forEach(prog => {
            const month = prog.week_id.substring(0, 7); // YYYY-MM
            if (!grouped.has(month)) {
                grouped.set(month, []);
            }
            grouped.get(month).push(prog);
        });
        return grouped;
    }

    function getCurrentMonthKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }
    
    // --- INICIALIZACIÓN ---
    document.addEventListener('DOMContentLoaded', async () => {
        console.log("Iniciando aplicación...");
        try {
            await initTab2();
            console.log("Pestaña 2 inicializada correctamente");
        } catch (error) {
            console.error("Error al inicializar pestaña 2:", error);
        }
        
        document.getElementById('month-selector').addEventListener('change', (e) => {
            currentMonthKey = e.target.value;
            renderView2();
        });

        document.getElementById('save-changes-btn-2').addEventListener('click', () => {
            saveAllChanges2();
        });
    });

    // --- FUNCIONES PARA LA PESTAÑA 2 ---
    async function initTab2() {
        console.log("Inicializando pestaña 2...");
        const statusEl = document.getElementById('status-2');
        statusEl.style.display = 'block';
        statusEl.textContent = 'Cargando programas y participantes...';
        
        try {
            const [progRes, presRes, conRes, discRes] = await Promise.all([
                db.from("programas").select("week_id, data").order("week_id", { ascending: false }),
                db.from("lista_encargados").select("nombre").order("nombre"),
                db.from("consejeros").select("nombre").order("nombre"),
                db.from("discursantes").select("nombre").order("nombre"),
            ]);
            
            if (progRes.error) throw new Error(`Error al cargar programas: ${progRes.error.message}`);
            
            listaEncargados2 = presRes.data || [];
            consejeros2 = conRes.data || [];
            discursantes2 = discRes.data || [];
            
            currentProgramasByMonth = groupProgramsByMonth(progRes.data);
            monthKeys = Array.from(currentProgramasByMonth.keys()).sort().reverse();
            
            assignmentHistory2 = createCategorizedHistory2(progRes.data);
            
            populateMonthSelector();
            
            currentMonthKey = getCurrentMonthKey();
            if (!monthKeys.includes(currentMonthKey)) {
                currentMonthKey = monthKeys.length > 0 ? monthKeys[0] : '';
            }
            document.getElementById('month-selector').value = currentMonthKey;

            renderView2();
            statusEl.style.display = 'none';
        } catch (error) {
            console.error("Error en initTab2:", error);
            statusEl.textContent = error.message;
            statusEl.className = 'text-center font-semibold p-4 mb-4 rounded-lg bg-red-100 text-red-800';
        }
    }

    // rest of the code
    function populateMonthSelector() {
        const selector = document.getElementById('month-selector');
        selector.innerHTML = '';
        monthKeys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            const [year, month] = key.split('-');
            const date = new Date(year, month - 1);
            option.textContent = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            selector.appendChild(option);
        });
    }
    
    function renderView2() {
        console.log("Renderizando vista 2 para el mes:", currentMonthKey);
        const tableContainer = document.querySelector('.history-table-container');
        const cardsContainer = document.querySelector('.history-cards-container');
        
        const programsForMonth = currentProgramasByMonth.get(currentMonthKey);
        
        if (!programsForMonth || programsForMonth.length === 0) {
            tableContainer.innerHTML = '<div class="text-center p-8">No hay datos disponibles para este mes.</div>';
            cardsContainer.innerHTML = '<div class="text-center p-8">No hay datos disponibles para este mes.</div>';
            return;
        }

        const headers = ["Presidente", "Sala Auxiliar 2", "Sala Auxiliar 3", "Tesoros-Punto 1", "Perlas Escondidas", "Discurso Vida Cr.", "Necesidades de Cong.", "Libro de Congregación"];
        
        let tableHtml = `
            <div class="history-table-header">
                <div class="history-table-header-cell">Fecha (Viernes)</div>
                ${headers.map(h => `<div class="history-table-header-cell">${h}</div>`).join('')}
            </div>
        `;

        programsForMonth.forEach(currentProgram => {
            const d = currentProgram.data || {};
            const vc = d.vidaCristiana || [];
            const fridayDate = getFridayFromWeekId(currentProgram.week_id);
            const isLocked = d.locked;

            const discursoVC = vc.find(p => p.hasOwnProperty('discursante') && !p.titulo?.toLowerCase().includes('necesidades'));
            const necesidadesVC = vc.find(p => p.titulo?.toLowerCase().includes('necesidades'));
            const libroVC = vc.find(p => p.hasOwnProperty('conductor'));
            const discursoPath = discursoVC ? `vidaCristiana.${vc.indexOf(discursoVC)}.discursante` : 'noop';
            const necesidadesPath = necesidadesVC ? `vidaCristiana.${vc.indexOf(necesidadesVC)}.discursante` : 'noop';
            const libroPath = libroVC ? `vidaCristiana.${vc.indexOf(libroVC)}.conductor` : 'noop';

            tableHtml += `
                <div class="history-table-row ${isLocked ? 'is-locked' : ''}" data-week-id="${currentProgram.week_id}">
                    <div class="history-table-cell">${fridayDate}</div>
            `;

            const assignments = [
                { list: listaEncargados2, path: 'presidentes.principal', value: d.presidentes?.principal || '' },
                { list: consejeros2, path: 'presidentes.aux2', value: d.presidentes?.aux2 || '' },
                { list: consejeros2, path: 'presidentes.aux3', value: d.presidentes?.aux3 || '' },
                { list: discursantes2, path: 'tesoros.p1.main', value: d.tesoros?.p1?.main || '' },
                { list: discursantes2, path: 'tesoros.p2.main', value: d.tesoros?.p2?.main || '' },
                { list: discursantes2, path: discursoPath, value: discursoVC?.discursante || '', exists: !!discursoVC },
                { list: discursantes2, path: necesidadesPath, value: necesidadesVC?.discursante || '', exists: !!necesidadesVC },
                { list: discursantes2, path: libroPath, value: libroVC?.conductor || '', exists: !!libroVC }
            ];

            assignments.forEach(assign => {
                tableHtml += '<div class="history-table-cell">';
                if (assign.exists === false) {
                    tableHtml += '<span class="not-applicable-2">– No Corresponde –</span>';
                } else {
                    tableHtml += `<select class="assignment-select-2 w-full" data-path="${assign.path}" data-week-id="${currentProgram.week_id}">${createOptions(assign.list, assign.value, assign.path)}</select>`;
                }
                tableHtml += '</div>';
            });

            if (isLocked) {
                tableHtml += `<div class="locked-overlay" data-week-id="${currentProgram.week_id}">
                    <div class="watermark">${d.lock_description || ''}</div>
                    <button class="unlock-button" onclick="unlockWeek('${currentProgram.week_id}')"><i class="fas fa-unlock"></i></button>
                </div>`;
            }
            tableHtml += '</div>';
        });

        tableContainer.innerHTML = tableHtml;
        // Setup searchable selects after rendering
        setupCustomSelects2();
        // Aquí se podría generar la vista para móviles (cardsContainer) de manera similar
    }

    // --- Custom selects with searchable global menu (like planificador.js) ---
    function setupCustomSelects2() {
        const globalOptionsContainer = document.getElementById('global-custom-options');
        if (!globalOptionsContainer) return;
        // transform select.assignment-select-2 into custom triggers
        document.querySelectorAll('.assignment-select-2').forEach(select => {
            if (select.nextElementSibling && select.nextElementSibling.classList.contains('custom-select-trigger-2')) return;
            const wrapper = document.createElement('div'); wrapper.className = 'custom-select-wrapper-2';
            select.style.display = 'none';
            const trigger = document.createElement('div'); trigger.className = 'custom-select-trigger-2'; trigger.tabIndex = 0;
            trigger.textContent = select.value || '-- Asignar --';
            trigger.title = select.value || '-- Asignar --';
            select.parentNode.insertBefore(wrapper, select);
            wrapper.appendChild(select);
            wrapper.appendChild(trigger);

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                if (globalOptionsContainer.classList.contains('active')) { globalOptionsContainer.classList.remove('active'); return; }
                const listToUse = (select.dataset.path && select.dataset.path.startsWith('presidentes')) ? listaEncargados2 : discursantes2.concat(consejeros2);
                const sortedList = [...(listToUse || [])].sort((a,b) => (assignmentHistory2.get(a.nombre)?.mostRecent || '0000-00-00').localeCompare(assignmentHistory2.get(b.nombre)?.mostRecent || '0000-00-00'));
                let optionsHTML = `<div style="padding:8px 12px;border-bottom:1px solid rgba(0,0,0,0.04);background:#fff;display:flex;align-items:center;gap:8px;">
                    <input id="global-options-filter" class="global-options-filter" placeholder="Buscar participante..." />
                    <button id="global-options-clear" class="global-options-clear">Limpiar</button>
                </div>`;
                optionsHTML += `<div class="custom-option" data-value=""><div class="option-text"><span class="name">-- Asignar --</span></div><span class="selection-indicator"></span></div>`;
                sortedList.forEach(p => { const personHistory = assignmentHistory2.get(p.nombre); const historyText = personHistory?.assignments[0] ? `(Últ.: ${getFridayFromWeekId(personHistory.assignments[0].date)} - ${personHistory.assignments[0].description})` : ''; optionsHTML += `<div class="custom-option" data-value="${p.nombre}"><div class="option-text"><span class="name">${p.nombre}</span><span class="history">${historyText}</span></div><span class="selection-indicator"></span></div>`; });
                globalOptionsContainer.innerHTML = optionsHTML;
                const filterInput = document.getElementById('global-options-filter');
                const clearBtn = document.getElementById('global-options-clear');
                const optionNodes = Array.from(globalOptionsContainer.querySelectorAll('.custom-option'));
                function applyFilter() { const q = (filterInput.value||'').toLowerCase().trim(); optionNodes.forEach(opt => { const name = (opt.querySelector('.name')?.textContent||'').toLowerCase(); opt.style.display = (!q || name.includes(q)) ? 'flex' : 'none'; }); }
                if (filterInput) { filterInput.addEventListener('input', applyFilter); filterInput.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { filterInput.value=''; applyFilter(); filterInput.blur(); } }); }
                if (clearBtn) clearBtn.addEventListener('click', () => { filterInput.value=''; applyFilter(); filterInput.focus(); });
                globalOptionsContainer.classList.add('active');
                optionNodes.forEach(option => option.addEventListener('click', (ev) => {
                    const val = ev.currentTarget.getAttribute('data-value');
                    select.value = val;
                    trigger.textContent = val || '-- Asignar --';
                    trigger.title = val || '-- Asignar --';
                    select.dispatchEvent(new Event('change', { bubbles:true }));
                    globalOptionsContainer.classList.remove('active');
                }));
                setTimeout(()=>{ if (filterInput) filterInput.focus(); },40);
            });
            // allow typing to open
            trigger.addEventListener('keydown',(e)=>{
                const isPrintable = e.key.length===1 || e.key==='Backspace' || e.key==='Delete';
                if (!isPrintable) return;
                e.preventDefault(); trigger.click(); setTimeout(()=>{ const f = document.getElementById('global-options-filter'); if (f && e.key.length===1) { f.value = (f.value||'')+e.key; f.dispatchEvent(new Event('input')); } },80);
            });
            // Tooltip behavior: show full name on hover / focus / touch
            let tooltipTimer = null;
            function showTooltip(text) {
                removeTooltip();
                const tip = document.createElement('div'); tip.className = 'custom-tooltip'; tip.textContent = text || '';
                document.body.appendChild(tip);
                const rect = trigger.getBoundingClientRect();
                const tipRect = tip.getBoundingClientRect();
                let top = rect.top - tipRect.height - 8;
                if (top < 6) top = rect.bottom + 8;
                let left = rect.left + (rect.width / 2) - (tipRect.width / 2);
                if (left < 6) left = 6;
                if (left + tipRect.width > window.innerWidth - 6) left = window.innerWidth - tipRect.width - 6;
                tip.style.top = `${top + window.scrollY}px`;
                tip.style.left = `${left + window.scrollX}px`;
            }
            function removeTooltip() { const existing = document.querySelector('.custom-tooltip'); if (existing) existing.remove(); }
            trigger.addEventListener('mouseenter', () => { if (trigger.title) { tooltipTimer = setTimeout(()=> showTooltip(trigger.title), 220); } });
            trigger.addEventListener('mouseleave', () => { clearTimeout(tooltipTimer); removeTooltip(); });
            trigger.addEventListener('focus', () => { if (trigger.title) showTooltip(trigger.title); });
            trigger.addEventListener('blur', () => { removeTooltip(); });
            // touch: short tap shows tooltip briefly without opening menu
            trigger.addEventListener('touchstart', (ev) => { ev.stopPropagation(); if (trigger.title) { removeTooltip(); showTooltip(trigger.title); setTimeout(removeTooltip, 2500); } }, { passive: true });
        });
        window.addEventListener('click', ()=>{ const c = document.getElementById('global-custom-options'); if (c) c.classList.remove('active'); });
    }

    function createOptions(list, selectedValue, assignmentPath) {
    if (!list || list.length === 0) return '<option value="">-- Asignar --</option>';
            const sortedList = [...list].sort((a, b) => {
            const historyA = assignmentHistory2.get(a.nombre); 
            const dateA = historyA ? historyA.get(assignmentPath) || '0000-00-00' : '0000-00-00';
            const historyB = assignmentHistory2.get(b.nombre); 
            const dateB = historyB ? historyB.get(assignmentPath) || '0000-00-00' : '0000-00-00';
            return dateA.localeCompare(dateB);
        });
        
        let options = '<option value="">-- Asignar --</option>';
        sortedList.forEach(p => {
            const isSelected = p.nombre === selectedValue ? 'selected' : '';
            const personHistory = assignmentHistory2.get(p.nombre);
            const lastDateRaw = personHistory ? personHistory.get(assignmentPath) : null;
            const lastDateFormatted = lastDateRaw ? getFridayFromWeekId(lastDateRaw) : '';
            const dateInfo = lastDateFormatted ? ` (En este punto: ${lastDateFormatted})` : '';
            options += `<option value="${p.nombre}" ${isSelected}>${p.nombre}${dateInfo}</option>`;
        });
        return options;
    }

    function createCategorizedHistory2(programas) {
        const history = new Map();
        const allPaths = ['presidentes.principal', 'presidentes.aux2', 'presidentes.aux3', 'tesoros.p1.main', 'tesoros.p2.main'];
        
        if (programas.length > 0 && programas[0].data.vidaCristiana) {
            programas[0].data.vidaCristiana.forEach((part, index) => {
                if(part.hasOwnProperty('discursante')) allPaths.push(`vidaCristiana.${index}.discursante`);
                if(part.hasOwnProperty('conductor')) allPaths.push(`vidaCristiana.${index}.conductor`);
            });
        }
        
        for (let i = programas.length - 1; i >= 0; i--) {
            const prog = programas[i];
            const data = prog.data || {};
            
            allPaths.forEach(path => {
                const participant = path.split('.').reduce((o, key) => (o && o[key]) ? o[key] : null, data);
                if (participant) {
                    if (!history.has(participant)) history.set(participant, new Map());
                    if (!history.get(participant).has(path)) history.get(participant).set(path, prog.week_id);
                }
            });
        }
        return history;
    }

    async function unlockWeek(weekId) {
        try {
            const { data, error } = await db
                .from('programas')
                .update({ data: { locked: false, lock_description: '' } })
                .eq('week_id', weekId);

            if (error) throw error;

            // Actualizar la vista
            const programs = await db.from("programas").select("week_id, data").order("week_id", { ascending: false });
            if (programs.error) throw programs.error;
            
            currentProgramasByMonth = groupProgramsByMonth(programs.data);
            renderView2();
        } catch (error) {
            console.error('Error al desbloquear la semana:', error);
        }
    }

    async function saveAllChanges2() {
        console.log("Guardando todos los cambios para el mes:", currentMonthKey);
        const saveButton = document.getElementById('save-changes-btn-2');
        const statusEl = document.getElementById('status-2');
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';
        statusEl.style.display = 'block';
        statusEl.textContent = 'Recopilando y guardando todos los cambios...';

        try {
            const programsToUpdate = new Map();
            const selects = document.querySelectorAll('.assignment-select-2');

            selects.forEach(select => {
                const weekId = select.dataset.weekId;
                const path = select.dataset.path;
                if (!weekId || !path || path === 'noop') return;

                if (!programsToUpdate.has(weekId)) {
                    const originalProgram = currentProgramasByMonth.get(currentMonthKey).find(p => p.week_id === weekId);
                    programsToUpdate.set(weekId, JSON.parse(JSON.stringify(originalProgram.data)));
                }

                const set = (obj, p, value) => {
                    const keys = p.split('.');
                    const lastKey = keys.pop();
                    const lastObj = keys.reduce((o, key) => o[key] = o[key] || {}, obj);
                    lastObj[lastKey] = value;
                };

                set(programsToUpdate.get(weekId), path, select.value);
            });

            const updatePromises = [];
            for (const [weekId, data] of programsToUpdate.entries()) {
                updatePromises.push(db.from('programas').update({ data }).eq('week_id', weekId));
            }

            const results = await Promise.all(updatePromises);

            const errors = results.filter(res => res.error);
            if (errors.length > 0) {
                throw new Error(`Error al guardar ${errors.length} programas. Primer error: ${errors[0].error.message}`);
            }

            statusEl.textContent = '¡Cambios guardados con éxito!';
            statusEl.className = 'text-center font-semibold p-4 mb-4 rounded-lg bg-green-100 text-green-800';
            saveButton.innerHTML = '<i class="fas fa-save mr-2"></i>Guardar Cambios';
            saveButton.disabled = false;

            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 3000);

        } catch (error) {
            console.error("Error en saveAllChanges2:", error);
            statusEl.textContent = `Error: ${error.message}`;
            statusEl.className = 'text-center font-semibold p-4 mb-4 rounded-lg bg-red-100 text-red-800';
            saveButton.innerHTML = '<i class="fas fa-save mr-2"></i>Guardar Cambios';
            saveButton.disabled = false;
        }
    }
