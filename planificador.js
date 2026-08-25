 (function(){
    // Planificador: portado desde el ejemplo pero encapsulado y con cliente Supabase compartido.
    const SUPABASE_URL = 'https://iosdslhikguqyhspbpbn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc2RzbGhpa2d1cXloc3BicGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTMzNjMsImV4cCI6MjA2ODY2OTM2M30.HbgX9g1e4kYZf1jn0-8RR8BctYZctVopigZgZVXBaJY';
    const { createClient } = supabase;
    const db = (window.__supabase_db) ? window.__supabase_db : (window.__supabase_db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY));

    let appData = { programs: [], lists: {}, history: null, availableMonths: [] };
    let currentActiveSelect = { trigger: null, originalSelect: null };

    document.addEventListener('DOMContentLoaded', async () => {
        const statusEl = document.getElementById('status');
        if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'Cargando datos...'; }
        const ok = await loadData();
        if (!ok) {
            // loadData displayed an error message and a retry button
            return;
        }
        populateMonthSelector();
        renderView();
        if (statusEl) statusEl.style.display = 'none';
        const saveBtn = document.getElementById('save-changes-btn');
        if (saveBtn) saveBtn.addEventListener('click', saveAllChanges);
        const monthSel = document.getElementById('month-selector');
        if (monthSel) monthSel.addEventListener('change', renderView);
    });

    async function loadData() {
        const statusEl = document.getElementById('status');
        const maxRetries = 3;
        let attempt = 0;
        let lastError = null;
        if (statusEl) { statusEl.style.display = 'block'; }
        while (attempt <= maxRetries) {
            try {
                if (statusEl) statusEl.textContent = `Cargando datos... (intento ${attempt + 1}/${maxRetries + 1})`;
                const [progRes, pubRes, maeRes, lecLibroRes, lecBibliaRes] = await Promise.all([
                    db.from('programas').select('week_id, data').order('week_id', { ascending: true }),
                    db.from('publicadores').select('nombre').order('nombre'),
                    db.from('maestros_discurso').select('nombre').order('nombre'),
                    db.from('lectores_libro').select('nombre').order('nombre'),
                    db.from('lectores').select('nombre').order('nombre')
                ]);

                const anyError = [progRes, pubRes, maeRes, lecLibroRes, lecBibliaRes].find(r => r && r.error);
                if (anyError) {
                    lastError = anyError.error ? anyError.error.message : 'Error al cargar datos';
                    // treat as a retryable failure
                    throw new Error(lastError);
                }

                appData.programs = progRes.data || [];
                appData.lists = { publicadores: pubRes.data || [], maestros_discurso: maeRes.data || [], lectores_libro: lecLibroRes.data || [], lectores_biblia: lecBibliaRes.data || [] };
                appData.history = createUnifiedHistory(appData.programs);
                return true;
            } catch (e) {
                lastError = e && e.message ? e.message : 'error de red';
                attempt++;
                // exponential backoff before next attempt
                if (attempt <= maxRetries) {
                    const delay = 500 * Math.pow(2, attempt - 1);
                    if (statusEl) statusEl.textContent = `Error de conexión: ${lastError}. Reintentando en ${Math.round(delay/1000)}s...`;
                    await sleep(delay);
                    continue;
                }
                // all retries exhausted
                const offlineHint = (!navigator.onLine) ? ' Tu navegador parece estar sin conexión.' : '';
                showConnectionError(`No fue posible conectar con el servicio: ${lastError}.${offlineHint}`);
                return false;
            }
        }
        return false;
    }

    function showConnectionError(message) {
        const statusEl = document.getElementById('status');
        if (!statusEl) return;
        statusEl.style.display = 'block';
        statusEl.innerHTML = `
            <div style="padding:12px;text-align:center;max-width:520px;margin:0 auto;">
                <div style="font-weight:700;margin-bottom:8px;">${message}</div>
                <div style="margin-bottom:8px;color:var(--secondary-text-color);">Comprueba tu conexión o reintenta. También puedes cargar datos de ejemplo para trabajar sin conexión.</div>
                <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                    <button id="planificador-retry" style="background: linear-gradient(45deg,#2563eb,#1e40af); color:#fff; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Reintentar</button>
                    <button id="planificador-local" style="background:#fff;color:#1e40af;border:1px solid #1e40af;padding:8px 12px;border-radius:8px;cursor:pointer;">Cargar datos de ejemplo</button>
                </div>
            </div>`;
        const retryBtn = document.getElementById('planificador-retry');
        if (retryBtn) {
            retryBtn.addEventListener('click', async () => {
                statusEl.textContent = 'Reintentando...';
                const ok = await loadData();
                if (ok) {
                    statusEl.style.display = 'none';
                    populateMonthSelector();
                    renderView();
                }
            });
        }
        const localBtn = document.getElementById('planificador-local');
        if (localBtn) {
            localBtn.addEventListener('click', () => {
                loadLocalSample();
            });
        }
    }

    function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

    function loadLocalSample() {
        // Minimal offline sample so the UI can be inspected and edited locally
        appData.lists = {
            publicadores: [{ nombre: 'Juan Pérez' }, { nombre: 'María López' }, { nombre: 'Ana Gómez' }],
            maestros_discurso: [{ nombre: 'Carlos Ruiz' }],
            lectores_libro: [{ nombre: 'Lucía Ramos' }],
            lectores_biblia: [{ nombre: 'Pablo Díaz' }]
        };
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const sampleWeek = `${yyyy}-${mm}-${dd}`;
        appData.programs = [{ week_id: sampleWeek, data: {
            tesoros: { p3: { main: 'Pablo Díaz', aux2: '', aux3: '' } },
            maestros: [{ title: 'Reflexión', main: 'Juan Pérez', aux2: '', aux3: '' }],
            vidaCristiana: [{ conductor: true, lector: 'Lucía Ramos' }]
        } }];
        appData.history = createUnifiedHistory(appData.programs);
        populateMonthSelector();
        renderView();
        const statusEl = document.getElementById('status'); if (statusEl) statusEl.style.display = 'none';
    }

    function populateMonthSelector() {
        const monthSelector = document.getElementById('month-selector');
        if (!monthSelector) return;
        monthSelector.innerHTML = '';
        const months = new Set();
        appData.programs.forEach(p => { if (p.week_id) months.add(p.week_id.substring(0,7)); });
        appData.availableMonths = Array.from(months).sort().reverse();
        appData.availableMonths.forEach(monthVal => {
            const option = document.createElement('option');
            option.value = monthVal;
            const [year, month] = monthVal.split('-');
            const date = new Date(Number(year), Number(month)-1, 1);
            option.textContent = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            monthSelector.appendChild(option);
        });
    }

    function renderView() {
        const selectedMonth = document.getElementById('month-selector')?.value;
        const monthlyPrograms = appData.programs.filter(p => !selectedMonth || p.week_id.startsWith(selectedMonth));
        const viewContainer = document.getElementById('view-container');
        if (!viewContainer) return;
        viewContainer.innerHTML = buildColumnarTabView(monthlyPrograms);
        setupTabSwitching();
        ensureInitialActiveTab();
        setupCustomSelects();
    }

    function ensureInitialActiveTab() {
        const tabs = document.querySelectorAll('.tab-link');
        const panes = document.querySelectorAll('.tab-pane');
        if (!tabs.length || !panes.length) return;
        const hasActive = Array.from(tabs).some(t => t.classList.contains('active'));
        if (!hasActive) {
            // make first tab active and apply site-specific active class
            tabs[0].classList.add('active', 'tab-active');
            tabs[0].classList.remove('tab-inactive');
            const firstId = tabs[0].getAttribute('data-tab');
            const pane = document.getElementById(firstId);
            if (pane) pane.classList.add('active');
        } else {
            // ensure pane visibility and visual state matches tab active
            tabs.forEach(t => {
                const id = t.getAttribute('data-tab');
                const pane = document.getElementById(id);
                if (pane) {
                    if (t.classList.contains('active')) {
                        pane.classList.add('active');
                        t.classList.add('tab-active');
                        t.classList.remove('tab-inactive');
                    } else {
                        pane.classList.remove('active');
                        t.classList.remove('tab-active');
                        t.classList.add('tab-inactive');
                    }
                }
            });
        }
    }

    function buildColumnarTabView(monthlyPrograms) {
        if (!monthlyPrograms || monthlyPrograms.length === 0) return `<div id="status">No hay programas para el mes seleccionado.</div>`;
    const navHTML = `<div class="tabs-navigation" role="tablist" aria-label="Planificador Tabs">
        <button type="button" class="tab-link active tab-active px-3 py-2 rounded-md text-sm font-medium" data-tab="smm-tab">Seamos Mejores Maestros</button>
        <button type="button" class="tab-link tab-inactive hover:bg-gray-200 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium" data-tab="biblia-tab">Lectura Biblia</button>
        <button type="button" class="tab-link tab-inactive hover:bg-gray-200 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium" data-tab="libro-tab">Libro (Lector)</button>
        </div>`;
        const contentHTML = `<div class="tabs-content-area">
                <div id="smm-tab" class="tab-pane active">${buildSMMTab(monthlyPrograms)}</div>
                <div id="biblia-tab" class="tab-pane">${buildBibleReadingTab(monthlyPrograms)}</div>
                <div id="libro-tab" class="tab-pane">${buildBookStudyTab(monthlyPrograms)}</div>
            </div>`;
        return navHTML + contentHTML;
    }

    function setupTabSwitching() {
        const tabs = document.querySelectorAll('.tab-link');
        const panes = document.querySelectorAll('.tab-pane');
        tabs.forEach(tab => tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.classList.remove('tab-active');
                t.classList.add('tab-inactive');
            });
            panes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            tab.classList.add('tab-active');
            tab.classList.remove('tab-inactive');
            const id = tab.getAttribute('data-tab');
            const pane = document.getElementById(id);
            if (pane) pane.classList.add('active');
        }));
    }

    function buildBibleReadingTab(programs) {
        let rowsHTML = '';
        programs.forEach(prog => {
            const d = prog.data || {}; const lecturaPart = d.tesoros?.p3;
            if (lecturaPart) {
                rowsHTML += `<tr data-week-id="${prog.week_id}">
                    <td>${getShortDate(prog.week_id)}</td>
                    <td>${createSelectHTML(appData.lists.lectores_biblia, lecturaPart.main || '', `tesoros.p3.main`)}</td>
                    <td>${createSelectHTML(appData.lists.lectores_biblia, lecturaPart.aux2 || '', `tesoros.p3.aux2`)}</td>
                    <td>${createSelectHTML(appData.lists.lectores_biblia, lecturaPart.aux3 || '', `tesoros.p3.aux3`)}</td>
                </tr>`;
            } else {
                rowsHTML += `<tr data-week-id="${prog.week_id}"><td>${getShortDate(prog.week_id)}</td><td colspan="3"><span class="not-applicable">– No Corresponde –</span></td></tr>`;
            }
        });
        return `<div class="assignment-table-wrapper"><table class="assignment-table">
                <thead><tr><th>Fecha</th><th>Sala Principal</th><th>Sala Aux 2</th><th>Sala Aux 3</th></tr></thead>
                <tbody>${rowsHTML}</tbody></table></div>`;
    }

    function buildSMMTab(programs) {
        let bodyHTML = '';
        programs.forEach(prog => {
            const d = prog.data || {};
            bodyHTML += `<tr class="date-row"><td colspan="7">${getFridayFromWeekId(prog.week_id)}</td></tr>`;
            if (d.maestros && d.maestros.length > 0) {
                d.maestros.forEach((part, i) => {
                    const isDiscurso = part.title?.toLowerCase().includes('discurso');
                    const list = isDiscurso ? appData.lists.maestros_discurso : appData.lists.publicadores;
                    let roomsHTML = '';
                    ['main','aux2','aux3'].forEach(room => {
                        if (isDiscurso) {
                            roomsHTML += `<td colspan="2">${createSelectHTML(list, part[room] || '', `maestros.${i}.${room}`, 'encargado')}</td>`;
                        } else {
                            const [enc, ayu] = (part[room] || '').split('/').map(s => s.trim());
                            roomsHTML += `<td>${createSelectHTML(list, enc, `maestros.${i}.${room}`, 'encargado')}</td>
                                          <td>${createSelectHTML(appData.lists.publicadores, ayu, `maestros.${i}.${room}`, 'ayudante')}</td>`;
                        }
                    });
                    bodyHTML += `<tr data-week-id="${prog.week_id}"><td class="assignment-title-cell">${part.title}</td>${roomsHTML}</tr>`;
                });
            } else {
                bodyHTML += `<tr data-week-id="${prog.week_id}"><td colspan="7" class="assignment-title-cell"><span class="not-applicable">– No hay asignaciones –</span></td></tr>`;
            }
        });
        const headerHTML = `<thead>
            <tr>
                <th rowspan="2">Asignación</th>
                <th colspan="2" class="header-group">Sala Principal</th>
                <th colspan="2" class="header-group">Sala Aux 2</th>
                <th colspan="2" class="header-group">Sala Aux 3</th>
            </tr>
            <tr>
                <th>(Enc.)</th><th>(Ayu.)</th>
                <th>(Enc.)</th><th>(Ayu.)</th>
                <th>(Enc.)</th><th>(Ayu.)</th>
            </tr>
        </thead>`;
        return `<div class="assignment-table-wrapper"><table class="assignment-table smm-table">${headerHTML}<tbody>${bodyHTML}</tbody></table></div>`;
    }

    function buildBookStudyTab(programs) {
        let rowsHTML = '';
        programs.forEach(prog => {
            const d = prog.data || {}; const libroVC = (d.vidaCristiana || []).find(p => p.hasOwnProperty('conductor'));
            if (libroVC) {
                const libroIdx = d.vidaCristiana.indexOf(libroVC);
                rowsHTML += `<tr data-week-id="${prog.week_id}">
                    <td>${getShortDate(prog.week_id)}</td>
                    <td>${createSelectHTML(appData.lists.lectores_libro, libroVC.lector, `vidaCristiana.${libroIdx}.lector`)}</td>
                </tr>`;
            } else {
                rowsHTML += `<tr data-week-id="${prog.week_id}"><td>${getShortDate(prog.week_id)}</td><td><span class="not-applicable">– No Corresponde –</span></td></tr>`;
            }
        });
        return `<div class="assignment-table-wrapper"><table class="assignment-table">
                <thead><tr><th>Fecha</th><th>Lector Asignado</th></tr></thead>
                <tbody>${rowsHTML}</tbody></table></div>`;
    }

    function createUnifiedHistory(programs) {
        const history = new Map();
        const addHistoryEntry = (name, date, description) => {
            if (!name || name.trim() === '') return;
            if (!history.has(name)) { history.set(name, { mostRecent: '0000-00-00', assignments: [] }); }
            const personHistory = history.get(name);
            if (!personHistory.assignments.some(a => a.date === date && a.description === description)) {
                personHistory.assignments.push({ date, description });
            }
            if (date > personHistory.mostRecent) { personHistory.mostRecent = date; }
        };
        programs.forEach(prog => {
            const data = prog.data || {}; const week_id = prog.week_id;
            if (data.tesoros?.p3) { ['main','aux2','aux3'].forEach(room => { if (data.tesoros.p3[room]) addHistoryEntry(data.tesoros.p3[room], week_id, `Lectura Biblia`); }); }
            (data.maestros || []).forEach((part) => {
                const isDiscurso = part.title?.toLowerCase().includes('discurso');
                const cleanTitle = part.title ? part.title.replace(/\s*\(\d+\s*min(s)?\.?\)/i, '').trim() : `SMM`;
                ['main','aux2','aux3'].forEach(room => {
                    if (part[room]) {
                        if (isDiscurso) { addHistoryEntry(part[room], week_id, `${cleanTitle}`); }
                        else {
                            const [encargado, ayudante] = part[room].split('/').map(s => s.trim());
                            addHistoryEntry(encargado, week_id, `${cleanTitle} (Enc.)`);
                            if (ayudante) addHistoryEntry(ayudante, week_id, `${cleanTitle} (Ayu.)`);
                        }
                    }
                });
            });
            const libroVC = (data.vidaCristiana || []).find(p => p.hasOwnProperty('conductor'));
            if (libroVC && libroVC.lector) addHistoryEntry(libroVC.lector, week_id, 'Lector de Libro');
        });
        for (let personHistory of history.values()) { personHistory.assignments.sort((a,b)=> b.date.localeCompare(a.date)); }
        return history;
    }

    const createSelectHTML = (list, selectedValue, dataPath, dataPerson = '') => {
        let listType = 'publicadores';
        if (list === appData.lists.lectores_biblia) listType = 'lectores_biblia';
        else if (list === appData.lists.maestros_discurso) listType = 'maestros_discurso';
        else if (list === appData.lists.lectores_libro) listType = 'lectores_libro';
        const sortedList = [...(list || [])].sort((a, b) => (appData.history.get(a.nombre)?.mostRecent || '0000-00-00').localeCompare(appData.history.get(b.nombre)?.mostRecent || '0000-00-00'));
        let nativeOptions = `<option value=""></option>${sortedList.map(p => `<option value="${p.nombre}" ${p.nombre === selectedValue ? 'selected': ''}>${p.nombre}</option>`).join('')}`;
        return `<div class="custom-select-wrapper" data-list-type="${listType}">
                    <select class="assignment-select" data-path="${dataPath}" ${dataPerson ? `data-person="${dataPerson}"` : ''}>${nativeOptions}</select>
                    <div class="custom-select-trigger"><span>${selectedValue || '-- Asignar --'}</span><span class="arrow"></span></div>
                </div>`;
    };

    function setupCustomSelects() {
        const globalOptionsContainer = document.getElementById('global-custom-options');
        if (!globalOptionsContainer) return;
        document.querySelectorAll('.custom-select-trigger').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                if (globalOptionsContainer.classList.contains('active')) { closeCustomMenu(); return; }
                const wrapper = trigger.closest('.custom-select-wrapper');
                const originalSelect = wrapper.querySelector('.assignment-select');
                const listType = wrapper.dataset.listType;
                let listToUse = appData.lists[listType];
                const sortedList = [...(listToUse || [])].sort((a, b) => (appData.history.get(a.nombre)?.mostRecent || '0000-00-00').localeCompare(appData.history.get(b.nombre)?.mostRecent || '0000-00-00'));
                // add a search input at top so user can type to filter participants
                let optionsHTML = `<div style="padding:8px 12px;border-bottom:1px solid rgba(0,0,0,0.04);background:#fff;display:flex;align-items:center;gap:8px;">
                    <input id="global-options-filter" class="global-options-filter" placeholder="Buscar participante..." />
                    <button id="global-options-clear" class="global-options-clear">Limpiar</button>
                </div>`;
                optionsHTML += `<div class="custom-option" data-value=""><div class="option-text"><span class="name">-- Asignar --</span></div><span class="selection-indicator"></span></div>`;
                sortedList.forEach(p => {
                    const personHistory = appData.history.get(p.nombre);
                    const historyText = personHistory?.assignments[0] ? `(Últ.: ${getFridayFromWeekId(personHistory.assignments[0].date)} - ${personHistory.assignments[0].description})` : '';
                    optionsHTML += `<div class="custom-option" data-value="${p.nombre}"><div class="option-text"><span class="name">${p.nombre}</span><span class="history">${historyText}</span></div><span class="selection-indicator"></span></div>`;
                });
                globalOptionsContainer.innerHTML = optionsHTML;
                    // attach filter behavior
                    const filterInput = document.getElementById('global-options-filter');
                    const clearBtn = document.getElementById('global-options-clear');
                    const optionNodes = Array.from(globalOptionsContainer.querySelectorAll('.custom-option'));
                    function applyFilter() {
                        const q = (filterInput.value || '').toLowerCase().trim();
                        optionNodes.forEach(opt => {
                            const name = (opt.querySelector('.name')?.textContent || '').toLowerCase();
                            if (!q || name.includes(q)) opt.style.display = 'flex'; else opt.style.display = 'none';
                        });
                    }
                    if (filterInput) {
                        filterInput.addEventListener('input', applyFilter);
                        filterInput.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { filterInput.value = ''; applyFilter(); filterInput.blur(); } });
                    }
                    if (clearBtn) { clearBtn.addEventListener('click', () => { filterInput.value = ''; applyFilter(); filterInput.focus(); }); }
                const currentValue = originalSelect.value;
                const currentOptionEl = globalOptionsContainer.querySelector(`.custom-option[data-value="${currentValue}"]`);
                if (currentOptionEl) currentOptionEl.classList.add('selected');
                const triggerRect = trigger.getBoundingClientRect();
                globalOptionsContainer.style.top = `${triggerRect.bottom + 4}px`;
                globalOptionsContainer.style.left = `${triggerRect.left}px`;
                if (triggerRect.left + 320 > window.innerWidth - 10) { globalOptionsContainer.style.left = `${window.innerWidth - 320 - 10}px`; }
                globalOptionsContainer.classList.add('active');
                currentActiveSelect = { trigger, originalSelect };
                globalOptionsContainer.querySelectorAll('.custom-option').forEach(option => { option.addEventListener('click', handleOptionClick); });
                // focus the filter input so typing immediately filters
                if (filterInput) { setTimeout(() => { filterInput.focus(); }, 40); }
            });
        
        // allow typing directly in the trigger: when user starts typing letters, open menu and filter
        document.querySelectorAll('.custom-select-trigger').forEach(trigger => {
            trigger.addEventListener('keydown', (e) => {
                const isPrintable = e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete';
                if (!isPrintable) return;
                e.preventDefault();
                // open the menu for this trigger
                const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
                trigger.dispatchEvent(clickEvent);
                setTimeout(() => {
                    const filter = document.getElementById('global-options-filter');
                    if (filter) {
                        // append the typed character if printable
                        if (e.key.length === 1) filter.value = (filter.value || '') + e.key;
                        applyFilter();
                    }
                }, 80);
            });
        });
        });

        function handleOptionClick(e) {
            e.stopPropagation();
            const selectedValue = e.currentTarget.getAttribute('data-value');
            if (currentActiveSelect.originalSelect) {
                currentActiveSelect.originalSelect.value = selectedValue;
                currentActiveSelect.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
                currentActiveSelect.trigger.querySelector('span').textContent = e.currentTarget.querySelector('.name').textContent;
            }
            closeCustomMenu();
        }

        function closeCustomMenu() { globalOptionsContainer.classList.remove('active'); }

        window.addEventListener('click', closeCustomMenu);

        document.getElementById('view-container').addEventListener('change', e => {
            if (e.target.classList.contains('assignment-select')) {
                document.getElementById('save-changes-btn').disabled = false;
                const path = e.target.dataset.path;
                const weekElement = e.target.closest('[data-week-id]');
                if (!weekElement) return;
                const weekId = weekElement.dataset.weekId;
                const program = appData.programs.find(p => p.week_id === weekId);
                if (!program) return;
                const set = (obj, p, val) => { const keys = p.split('.'); const lastKey = keys.pop(); const lastObj = keys.reduce((o, key) => o[key] = o[key] || {}, obj); lastObj[lastKey] = val; };
                if (e.target.dataset.person) {
                    const row = e.target.closest('tr');
                    const encSelect = row.querySelector(`[data-path="${path}"][data-person="encargado"]`);
                    const ayuSelect = row.querySelector(`[data-path="${path}"][data-person="ayudante"]`);
                    const encValue = encSelect ? encSelect.value : '';
                    const ayuValue = ayuSelect ? ayuSelect.value : '';
                    const finalValue = [encValue, ayuValue].filter(Boolean).join(' / ');
                    set(program.data, path, finalValue);
                } else {
                    set(program.data, path, e.target.value);
                }
                // Recalcular historial
                appData.history = createUnifiedHistory(appData.programs);
                // Auto-save the change for this row (no inline button shown)
                const row = e.target.closest('[data-week-id]');
                if (row) {
                    // debounce a short time to batch quick edits
                    if (row._saveTimeout) clearTimeout(row._saveTimeout);
                    row._saveTimeout = setTimeout(() => { saveAssignmentRow(row, e.target); }, 550);
                }
            }
        });
    }

    async function saveAssignmentRow(row, changedElement) {
        const weekId = row.dataset.weekId;
        const select = changedElement.closest('.custom-select-wrapper')?.querySelector('.assignment-select') || changedElement;
        const path = select?.dataset.path;
        const value = select?.value || '';
        const saveBtn = row.querySelector('.row-save-btn');
        if (!weekId || !path) return;
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Guardando...'; }
        try {
            const res = await fetch('/api/planificador/save_assignment', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ week_id: weekId, path, value, force: false })
            });
            const data = await res.json();
            if (res.status === 409 || data.status === 'duplicate') {
                const confirmForce = confirm('Este participante ya está asignado esta semana. ¿Forzar asignación?');
                if (confirmForce) {
                    const res2 = await fetch('/api/planificador/save_assignment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ week_id: weekId, path, value, force: true }) });
                    const data2 = await res2.json();
                    if (data2.status === 'ok') {
                        // update participants lists
                        updateParticipantSelects(data2.participants);
                        if (saveBtn) { saveBtn.textContent = 'Guardado'; setTimeout(() => { saveBtn.remove(); }, 900); }
                    } else {
                        // non-blocking feedback instead of alert
                        console.warn('Forzar asignación falló:', data2 && data2.message ? data2.message : 'error desconocido');
                        const s = document.getElementById('status'); if (s) { s.style.display = 'block'; s.textContent = 'No fue posible forzar la asignación.'; setTimeout(() => { s.style.display = 'none'; }, 2000); }
                    }
                }
                return;
            }
            if (data.status === 'ok') {
                updateParticipantSelects(data.participants);
                if (saveBtn) { saveBtn.textContent = 'Guardado'; setTimeout(() => { saveBtn.remove(); }, 900); }
            } else {
                // replace blocking alert with console warning and subtle UI update
                console.warn('Error al guardar asignación:', data && data.message ? data.message : 'error desconocido');
                const s = document.getElementById('status'); if (s) { s.style.display = 'block'; s.textContent = (data && data.message) ? data.message : 'Error al guardar'; setTimeout(() => { s.style.display = 'none'; }, 2000); }
            }
        } catch (err) {
            console.error(err);
            // non-blocking network error feedback
            const s = document.getElementById('status'); if (s) { s.style.display = 'block'; s.textContent = 'Error de red al guardar'; setTimeout(() => { s.style.display = 'none'; }, 2000); } else { console.warn('Error de red al guardar'); }
        } finally {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Guardar'; }
        }
    }

    function updateParticipantSelects(participants) {
        if (!participants || !Array.isArray(participants)) return;
        // participants: [{name: '...'}]
        document.querySelectorAll('.assignment-select').forEach(s => {
            const current = s.value;
            s.innerHTML = `<option value=""></option>` + participants.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
            if ([...s.options].some(o => o.value === current)) s.value = current;
        });
        // refresh appData lists by replacing publicadores list if applicable
        // (keep existing structure: list of objects with nombre property)
        appData.lists.publicadores = participants.map(p => ({ nombre: p.name }));
        appData.history = createUnifiedHistory(appData.programs);
    }

    async function saveAllChanges() {
        const saveButton = document.getElementById('save-changes-btn');
        const statusEl = document.getElementById('status');
        if (saveButton) { saveButton.disabled = true; saveButton.textContent = 'Guardando...'; }
        if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'Guardando cambios...'; }
        // preserve current active tab so we can restore it after re-render
        const currentActiveTab = document.querySelector('.tabs-navigation .tab-link.active')?.getAttribute('data-tab');

        const dataToUpsert = appData.programs.map(p => ({ week_id: p.week_id, data: p.data }));
        const { error } = await db.from('programas').upsert(dataToUpsert, { onConflict: 'week_id' });
        if (error) {
            if (statusEl) statusEl.textContent = `Error: ${error.message}`;
            alert(`Error al guardar: ${error.message}`);
        } else {
            if (statusEl) statusEl.textContent = '¡Cambios guardados con éxito!';
            if (saveButton) saveButton.textContent = 'Guardar Cambios';
            setTimeout(async () => {
                if (statusEl) statusEl.style.display = 'none';
                await loadData();
                renderView();
                // restore previously active tab if any
                if (currentActiveTab) {
                    const tabEl = document.querySelector(`.tab-link[data-tab="${currentActiveTab}"]`);
                    if (tabEl) { tabEl.click(); }
                }
            }, 1500);
        }
    }

    function getFridayFromWeekId(weekId) {
        try {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(weekId)) return weekId;
            const date = new Date(weekId + 'T12:00:00Z');
            const dayOfWeek = date.getUTCDay();
            const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
            date.setUTCDate(date.getUTCDate() + daysUntilFriday);
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch (e) { return weekId; }
    }

    function getShortDate(weekId) {
        try {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(weekId)) return weekId;
            const date = new Date(weekId + 'T12:00:00Z');
            const dayOfWeek = date.getUTCDay();
            const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
            date.setUTCDate(date.getUTCDate() + daysUntilFriday);
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        } catch (e) { return weekId; }
    }

})();
