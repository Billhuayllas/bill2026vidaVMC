const SUPABASE_URL = 'https://iosdslhikguqyhspbpbn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc2RzbGhpa2d1cXloc3BicGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTMzNjMsImV4cCI6MjA2ODY2OTM2M30.HbgX9g1e4kYZf1jn0-8RR8BctYZctVopigZgZVXBaJY';
    const { createClient } = supabase;
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let fullDataCache = {}, selectDataCache = {};
    let lastRenderedWeek = null;
    // Track already-rendered participant names for the current render to avoid duplicates
    let renderedParticipants = new Set();
const managerConfig = [ { type: 'presidentes', tableName: 'lista_encargados' }, { type: 'consejeros', tableName: 'consejeros' }, { type: 'oradores', tableName: 'oradores' }, { type: 'discursantes', tableName: 'discursantes' }, { type: 'lectores', tableName: 'lectores' }, { type: 'lectores_libro', tableName: 'lectores_libro' }, { type: 'publicadores', tableName: 'publicadores' }, { type: 'maestros_discurso', tableName: 'maestros_discurso' } ];

async function initializeApp() {
    buildInitialHTML_Program();
    setupProgramListeners();
    await loadAllSelects();
    await fetchAndDisplayHistory();
}

initializeApp();

        function buildInitialHTML_Program() {
            document.getElementById('program-container').innerHTML = `
                <style>
                    /*
                        NOTE (main UI):
                        The CSS rules in this block target the main in-page program UI only.
                        Keep print/preview styles in buildPrintableHTML() separate to avoid
                        accidental changes to the print preview layout.
                    */
                    .main-program-table { table-layout: fixed; width: 100%; border-collapse: collapse; }
                    .main-program-table th, .main-program-table td { font-size: 0.90rem; padding:6px 8px; text-align:center; vertical-align: middle; }
                    .main-program-table td:first-child { text-align: left; vertical-align: middle; }
                    .main-program-table .section-header { font-size: 0.95rem; padding:6px 8px; text-align:center; }
                    .main-program-table tr.no-bg td { background: transparent !important; }
                    .participant-pair { display:flex; flex-direction:column; align-items:center; justify-content:center; }
                    /* Role participant boxes: show abbreviation (P/A) and name inside a card */
                    .participant-pair.inline { display:inline-flex; align-items:center; gap:8px; }
                    .role-participant-box { display:flex; flex-direction:column; align-items:center; border:1px solid #e5e7eb; background:#f9fafb; padding:6px; border-radius:8px; min-width:120px; max-width:220px; }
                    .role-participant-box .role-label { font-weight:700; color:#374151; margin-bottom:4px; }
                    .role-participant-box .participant-input { border:none; background:transparent; text-align:center; width:100%; }

                    /* Buttons and controls */
                    .button { background:#007bff; color:#fff; padding:6px 10px; border:none; border-radius:6px; cursor:pointer; font-size:0.9rem; display:inline-flex; align-items:center; gap:6px; }
                    .button.secondary { background:#28a745; }
                    .button-container { margin-top:12px; display:flex; justify-content:center; align-items:center; }
                    .print-controls { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
                    .print-controls label { font-weight:600; margin-right:4px; font-size:0.9rem; }
                    .history-select, #print-start-week, #print-end-week { padding:4px 6px; border-radius:6px; border:1px solid #d0d0d0; font-size:0.9rem; min-width:110px; }

                    .program-title { text-align:center !important; margin-bottom:6px; font-size:1.2rem; color:#007bff; font-weight:700; }
                    .header-info { display:flex; justify-content:flex-start; gap:12px; list-style:none; padding:0; margin:6px 0 8px 40px; font-size:0.92rem; }
                    /* Align president names (the span after the strong label) to the left while keeping the header centered */
                    .header-info li { display:flex; align-items:center; gap:6px; }
                    .header-info li span { text-align:left; display:inline-block; }
                    /* Center section headers in the main view (no background color changes) */
                    /* Center section headers in the main view (no background color changes) */
                    .main-program-table td.section-header { display:flex; justify-content:center; align-items:center; text-align:center; font-weight:700; padding:8px 12px; }
                    .main-program-table td.section-header .section-title { display:inline-block; white-space:nowrap; }
                    /* participant inputs: invisible (no border/margin), centered text */
                    .main-program-table .participant-input { border: none; background: transparent; padding: 0; margin: 0; text-align: center; width: 100%; box-sizing: border-box; }
                    /* Inline pair inputs: force horizontal layout and auto widths so '/' sits between names */
                    .main-program-table .participant-pair.inline { display:inline-flex; align-items:center; gap:6px; }
                    .main-program-table .participant-pair.inline .participant-input { width: auto; min-width: 80px; }
                    .main-program-table .participant-pair.inline .separator { display:inline-block; margin:0 4px; }
                    /* Style .section rows (whole-row colored bars): align left, bold and larger text */
                    .main-program-table tr.section td { text-transform:uppercase; font-weight:800; padding:10px 12px; text-align:left; font-size:1.05rem; color:#fff; border-left:1px solid #000 !important; border-right:1px solid #000 !important; }
                    .main-program-table tr.section.tesoros td { background:#5a6369; }
                    .main-program-table tr.section.maestros td { background:#c19a26; }
                    .main-program-table tr.section.vida-cristiana td { background:#8b2c39; }
                    /* Collapse borders and remove spacing to avoid white gaps */
                    .main-program-table { border-collapse: collapse; border-spacing: 0; }
                </style>

                <div class="week-selector-container" style="display:flex; align-items:center; justify-content:center; gap:10px;">
                    <label for="history-selector"><b>Seleccione la semana guardada en la nube</b></label>
                    <select id="history-selector" class="history-select"><option value="">-- Cargando... --</option></select>
                </div>

                <h1 id="week-title" class="program-title"></h1>
                <ul id="header-info-list" class="header-info"></ul>
                <ul id="intro-list-container" class="intro-list"></ul>

                <table class="main-program-table">
                    <colgroup>
                        <col style="width:28%">
                        <col style="width:24%">
                        <col style="width:24%">
                        <col style="width:24%">
                    </colgroup>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Sala Auxiliar N°3 <br><span class="header-time">(7:00 p. m.)</span></th>
                            <th>Sala Auxiliar N°2</th>
                            <th>Auditorio principal</th>
                        </tr>
                    </thead>
                    <tbody id="main-program-body"></tbody>
                </table>

                <div class="button-container" style="margin-top:20px; text-align:center;">
                    <div class="print-controls" style="display:inline-flex; align-items:center; gap:10px;">
                        <label for="print-start-week">Imprimir desde:</label>
                        <select id="print-start-week"></select>
                        <label for="print-end-week">hasta:</label>
                        <select id="print-end-week"></select>
                        <div class="watermark-controls" style="display:flex; gap:10px; align-items:center; padding:4px 8px; background:#f0f0f0; border-radius:6px;">
                            <label style="display:flex; align-items:center; gap:6px; font-size:0.9em;">
                                <span>Marca de agua:</span>
                                <input type="text" id="watermark-text" value="PRELIMINAR" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; font-size:0.9em; width:120px;" />
                            </label>
                            <label style="display:flex; align-items:center; gap:6px; font-size:0.9em;">
                                <input type="checkbox" id="toggle-blur" style="margin:0;" />
                                <span>Difuminar</span>
                            </label>
                        </div>
                        <button id="print-button" class="button secondary" style="background:#28a745;">Imprimir Rango</button>
                        <button id="save-button" class="button" style="background:#007bff;">Guardar Cambios</button>
                    </div>
                </div>`;
        }

        function setupProgramListeners(){
            document.getElementById("history-selector").addEventListener("change",e=>loadWeekData(e.target.value));
            document.getElementById("print-button").addEventListener("click", openPrintPreview);
            document.getElementById("save-button").addEventListener("click",saveCurrentDataToCloud);

            // Configurar listeners para controles de marca de agua y difuminado
            document.getElementById('watermark-text').addEventListener('input', function(e) {
                const weekId = document.getElementById('history-selector').value;
                if (weekId && fullDataCache[weekId]) {
                    fullDataCache[weekId].watermark = e.target.value;
                }
            });

            document.getElementById('toggle-blur').addEventListener('change', function(e) {
                const weekId = document.getElementById('history-selector').value;
                if (weekId && fullDataCache[weekId]) {
                    fullDataCache[weekId].isBlurred = e.target.checked;
                }
            });
        }

        async function loadAllSelects(){
            for(const e of managerConfig){
                const{data:t}=await db.from(e.tableName).select("nombre").order("nombre");
                if(t) selectDataCache[e.type]=t;
            }
        }

        function getOptionsHTML(e,t){
            let a='<option value="">-- No asignado --</option>';
            if(e) a+=e.map(e=>`<option value="${e.nombre}"${e.nombre===t?" selected":""}>${e.nombre}</option>`).join("");
            return a;
        }

        function mapIdToDataKey(id) {
            // common mappings used in the data structure
            if (!id) return '';
            if (/^presidente-/.test(id)) return id.replace('presidente-main','presidentes.principal').replace('presidente-','presidentes.');
            if (/^consejero-/.test(id)) return id.replace('consejero-','presidentes.');
            if (/^oracion-/.test(id)) return id.replace(/-/g,'.');
            if (/^tesoros-/.test(id)) return id.replace(/-/g,'.');
            if (/^maestros-/.test(id)) return id.replace(/-/g,'.');
            if (/^vida-/.test(id)) return id.replace(/-/g,'.');
            // default: return id as-is
            return id;
        }

        function getParticipantHTML(id, options, selectedValue) {
            const name = selectedValue || '';
            // If this is a presidente or consejero field and the same name was already rendered,
            // skip to avoid the duplicate row the user reported.
            if (name && (/presidente/i.test(id) || /consejer/i.test(id))) {
                if (renderedParticipants.has(name)) return `<span></span>`;
                renderedParticipants.add(name);
            }
            const dataKey = mapIdToDataKey(id);
            const safeVal = (name || '').replace(/"/g,'&quot;');
            // Build datalist options inline so each cell suggests matching names while typing
            const optionsHTML = (options||[]).map(o=>`<option value="${(o.nombre||'').replace(/"/g,'&quot;')}"></option>`).join('');
            const dlId = `dl-${id}-${Math.random().toString(36).slice(2,8)}`;
            return `<input type="text" class="participant-input" data-key="${dataKey}" value="${safeVal}" list="${dlId}" placeholder="-- No asignado --" style="width:100%;box-sizing:border-box;padding:4px;" />`+
                   `<datalist id="${dlId}">${optionsHTML}</datalist>`;
        }
        
        function getMaestrosParticipantHTML(partIndex, room, person, options, selectedValue) {
    const id = `maestros-${partIndex}-${room}`;
    const dataKey = `maestros.${partIndex}.${room}`;
    const safeVal = (selectedValue || '').replace(/"/g,'&quot;');
    const opts = (options||[]).map(o=>`<option value="${(o.nombre||'').replace(/"/g,'&quot;')}"></option>`).join('');
    const dlId = `dl-${id}-${Math.random().toString(36).slice(2,8)}`;
    return `<input type="text" class="participant-input" data-key="${dataKey}" value="${safeVal}" list="${dlId}" />`+`<datalist id="${dlId}">${opts}</datalist>`;
}

        function getVidaCristianaParticipantHTML(type, index, options, selectedValue) {
    const id = `vida-${type}-${index}`;
    const dataKey = `vidaCristiana.${index}.${type}`;
    const safeVal = (selectedValue || '').replace(/"/g,'&quot;');
    const opts = (options||[]).map(o=>`<option value="${(o.nombre||'').replace(/"/g,'&quot;')}"></option>`).join('');
    const dlId = `dl-${id}-${Math.random().toString(36).slice(2,8)}`;
    return `<input type="text" class="participant-input" data-key="${dataKey}" value="${safeVal}" list="${dlId}" />`+`<datalist id="${dlId}">${opts}</datalist>`;
}


        function showStatusMessage(message, type = 'info') {
    const statusMsg = document.getElementById('status-message');
    if (!statusMsg) return;
    statusMsg.textContent = message;
    statusMsg.classList.remove('hidden');
    let bgColor = '#eff6ff';
    let textColor = '#1e40af';
    if (type === 'error') {
        bgColor = '#fee2e2';
        textColor = '#991b1b';
    } else if (type === 'success') {
        bgColor = '#dcfce7';
        textColor = '#166534';
    } else if (type === 'loading') {
        bgColor = '#ffedd5';
        textColor = '#9a3412';
    }
    statusMsg.style.backgroundColor = bgColor;
    statusMsg.style.color = textColor;
}

async function fetchAndDisplayHistory(){
    showStatusMessage('Cargando historial...', 'loading');
    const{data:t,error:a}=await db.from("programas").select("week_id, data").order("week_id",{ascending:false});
    if(a||!t) return showStatusMessage('Error al cargar historial.', 'error');
    fullDataCache={};
    const n=document.getElementById("history-selector");
    const printStart = document.getElementById("print-start-week");
    const printEnd = document.getElementById("print-end-week");
    
    // Poblamos el cache primero
    t.forEach(e => fullDataCache[e.week_id] = e.data);

    if(t.length>0) {
        const today = new Date();
        let closestIdx = 0;
        let minDiff = Infinity;
        for (let i = 0; i < t.length; i++) {
            const weekDate = new Date(t[i].week_id);
            const diff = Math.abs(weekDate - today);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        }

        const closestDateStr = t[closestIdx].week_id;
        const current = [ t[closestIdx] ];
        const future = [];
        const past = [];

        for(let i=0; i < t.length; i++){
            if(i === closestIdx) continue;
            if(t[i].week_id > closestDateStr) future.push(t[i]);
            else past.push(t[i]);
        }

        // Ordenamos futuros ascendente (desde el actual hacia el futuro)
        future.sort((a,b) => a.week_id.localeCompare(b.week_id));
        // Ordenamos pasados descendente (desde el más reciente hacia atrás)
        past.sort((a,b) => b.week_id.localeCompare(a.week_id));

        const buildOptionStr = (e) => `<option value="${e.week_id}">${e.data.titulo || e.week_id}</option>`;
        
        n.innerHTML = 
            '<optgroup label="Actual y Próximos">' +
            current.map(buildOptionStr).join('') +
            future.map(buildOptionStr).join('') +
            '</optgroup>' +
            '<optgroup label="Historial">' +
            past.map(buildOptionStr).join('') +
            '</optgroup>';
        
        // Para imprimir, un orden cronológico tiene más sentido
        const chrono = [...past].reverse().concat(current).concat(future);
        const chronoStr = chrono.map(buildOptionStr).join('');
        printStart.innerHTML = chronoStr;
        printEnd.innerHTML = chronoStr;

        n.value = closestDateStr;
        printStart.value = closestDateStr; 
        printEnd.value = closestDateStr;
        
        loadWeekData(closestDateStr);
        showStatusMessage('Historial cargado exitosamente', 'success');
        setTimeout(() => document.getElementById('status-message').classList.add('hidden'), 3000);
    } else {
        n.innerHTML = printStart.innerHTML = printEnd.innerHTML = '<option value="">-- No hay programas --</option>';
        showStatusMessage('No hay programas en la nube.', 'info');
    }
}

        function loadWeekData(e){
            const t=fullDataCache[e];
            if(t) {
                populateForm(t, e);
                // Cargar estado de difuminado y marca de agua
                const watermarkText = document.getElementById('watermark-text');
                const toggleBlur = document.getElementById('toggle-blur');
                if (watermarkText && toggleBlur && t.watermark !== undefined) {
                    watermarkText.value = t.watermark;
                    toggleBlur.checked = t.isBlurred;
                }
            }
        }

        function populateForm(e, weekId){
            // Debug: help detect multiple renders
            try{ console.debug && console.debug('populateForm called', { weekId }); }catch(err){}
            // Reset per-render dedupe set
            renderedParticipants.clear();
            // Prevent accidental double-rendering for the same week
            if(weekId && lastRenderedWeek === weekId) return;
            lastRenderedWeek = weekId || lastRenderedWeek;

            const t=["Sala Auxiliar N°3","Sala Auxiliar N°2","Auditorio principal"];
            document.getElementById("week-title").textContent=e.titulo||"";
            
            // Place president/consejero/oracion info inside the table as rows
            // (clear external header list)
            document.getElementById("header-info-list").innerHTML = "";

            // move intro items into the table grid (song, intro words, opening prayer)
            document.getElementById("intro-list-container").innerHTML = "";
            const a=document.getElementById("main-program-body");
            // Clear existing rows as a safety measure before building new content
            a.innerHTML = '';

            let tesorosSection = (e.sectionTitles?.tesoros !== '' ? `<span class="section-title">${e.sectionTitles?.tesoros || 'TESOROS DE LA BIBLIA'}</span>` : '');
            let tesorosTitle1 = (e.tesoros?.p1?.title ? `<span>${e.tesoros?.p1?.title}</span>` : '');
            let tesorosTitle2 = (e.tesoros?.p2?.title ? `<span>${e.tesoros?.p2?.title}</span>` : '');
            let tesorosTitle3 = `<span>${e.tesoros?.p3?.title || 'Lectura de la Biblia (3 min)'}</span>`;

            let maestrosSection = (e.sectionTitles?.maestros !== '' ? `<span class="section-title">${e.sectionTitles?.maestros || 'SEAMOS MEJORES MAESTROS'}</span>` : '');
            let vidaCristianaSection = (e.sectionTitles?.vidaCristiana !== '' ? `<span class="section-title">${e.sectionTitles?.vidaCristiana || 'NUESTRA VIDA CRISTIANA'}</span>` : '');

            let s = '';
            // Insert header rows (presidente / opening prayer) into the top of the table
            // Show presidents in order: Sala Auxiliar N°3, Sala Auxiliar N°2, Auditorio principal
            s += `<tr class="no-bg"><td><strong>Presidente:</strong></td><td>${getParticipantHTML('presidente-aux3', selectDataCache.presidentes, e.presidentes?.aux3)}</td><td>${getParticipantHTML('presidente-aux2', selectDataCache.presidentes, e.presidentes?.aux2)}</td><td>${getParticipantHTML('presidente-main', selectDataCache.presidentes, e.presidentes?.principal)}</td></tr>`;
            // Consejero row removed from main view to avoid showing the titles/grid as requested
            s += `<tr class="no-bg"><td><strong>Oración de Inicio:</strong></td><td data-label="${t[0]}"></td><td data-label="${t[1]}"></td><td class="participante">${getParticipantHTML('oracion-inicio', selectDataCache.oradores, e.oracion?.inicio)}</td></tr>`;
            // Prepend initial items into the table: song, intro words, opening prayer
            if (e.canciones?.inicio) s += `<tr><td>• <b>${e.canciones.inicio}</b></td><td data-label="${t[0]}"></td><td data-label="${t[1]}"></td><td data-label="${t[2]}"></td></tr>`;
            s += `<tr><td>• Palabras de introducción (1 min.)</td><td data-label="${t[0]}"></td><td data-label="${t[1]}"></td><td data-label="${t[2]}"></td></tr>`;
            if (tesorosSection) s += `<tr class="section tesoros"><td colspan="4">${tesorosSection}</td></tr>`;
            if (tesorosTitle1) s += `<tr><td>${tesorosTitle1}</td><td data-label="${t[0]}"></td><td data-label="${t[1]}"></td><td class="participante" data-label="${t[2]}">${getParticipantHTML('tesoros-p1-main', selectDataCache.discursantes, e.tesoros?.p1?.main)}</td></tr>`;
            if (tesorosTitle2) s += `<tr><td>${tesorosTitle2}</td><td data-label="${t[0]}"></td><td data-label="${t[1]}"></td><td class="participante" data-label="${t[2]}">${getParticipantHTML('tesoros-p2-main', selectDataCache.discursantes, e.tesoros?.p2?.main)}</td></tr>`;
            // Título de lectura (p3) en una fila aparte si existe
            s += `<tr><td>${tesorosTitle3}</td><td class="participante" data-label="${t[0]}">${getParticipantHTML('tesoros-p3-aux3', selectDataCache.lectores, e.tesoros?.p3?.aux3)}</td><td class="participante" data-label="${t[1]}">${getParticipantHTML('tesoros-p3-aux2', selectDataCache.lectores, e.tesoros?.p3?.aux2)}</td><td class="participante" data-label="${t[2]}">${getParticipantHTML('tesoros-p3-main', selectDataCache.lectores, e.tesoros?.p3?.main)}</td></tr>`;
            if (maestrosSection) s += `<tr class="section maestros"><td colspan="4">${maestrosSection}</td></tr>`;
            // Renderizar los puntos de maestros
            (e.maestros||[]).forEach((e,a)=>{
                const o=e.title.toLowerCase().includes("discurso");
                s+=`<tr><td>${e.title||""}</td>`;
                ["aux3","aux2","main"].forEach((l,c)=>{
                    const raw = (e[l]||"").trim();
                    s+=`<td class="participante" data-label="${t[c]}">`;
                    if (o) {
                        // discurso: single editable input
                        s+= getMaestrosParticipantHTML(a, l, e[l], selectDataCache.maestros_discurso, raw);
                    } else {
                        // may be a pair separated by '/'
                        const parts = raw.split('/').map(p=>p.trim());
                                                if (parts.length>1) {
                                                        // two parts: render two visible inputs (pair-first, pair-second) and one hidden combined input with data-key
                                                        const combineKey = `maestros.${a}.${l}`;
                                                        const dl1 = Math.random().toString(36).slice(2,8);
                                                        const dl2 = Math.random().toString(36).slice(2,8);
                                                        s+=`<div class="participant-pair inline" style="display:inline-flex;align-items:center;gap:10px;">
                                                                        <div class="role-participant-box" data-role="principal">
                                                                            <div class="role-label">enc.</div>
                                                                            <input type="text" class="participant-input pair-first" data-pair-for="${combineKey}" list="dl-${dl1}" value="${parts[0].replace(/\"/g,'&quot;')}" />
                                                                        </div>
                                                                        <div class="role-participant-box" data-role="ayudante">
                                                                            <div class="role-label">ayud.</div>
                                                                            <input type="text" class="participant-input pair-second" data-pair-for="${combineKey}" list="dl-${dl2}" value="${parts[1].replace(/\"/g,'&quot;')}" />
                                                                        </div>
                                                                        <input type="hidden" data-key="${combineKey}" class="pair-hidden" />
                                                                    <datalist id="dl-${dl1}">${(selectDataCache.publicadores||[]).map(o=>`<option value="${(o.nombre||'').replace(/\"/g,'&quot;')}"></option>`).join('')}</datalist>
                                                                    <datalist id="dl-${dl2}">${(selectDataCache.publicadores||[]).map(o=>`<option value="${(o.nombre||'').replace(/\"/g,'&quot;')}"></option>`).join('')}</datalist>
                                                                </div>`;
                        } else {
                            s+= getMaestrosParticipantHTML(a, l, raw, selectDataCache.publicadores, raw);
                        }
                    }
                    s+=`</td>`;
                });
                s+="</tr>";
            });
            // Solo agregar el título de la sección vida cristiana aquí, NO después
            if (vidaCristianaSection && vidaCristianaSection.trim() !== '') {
                s += `<tr class="section vida-cristiana"><td colspan="4">${vidaCristianaSection}</td></tr>`;
            }
            // Canción vida cristiana
            e.canciones?.vidaCristiana&&(s+=`<tr><td>• <b>${e.canciones.vidaCristiana}</b></td><td data-label="${t[0]}"></td><td data-label="${t[1]}"></td><td data-label="${t[2]}"></td></tr>`);
            // Puntos vida cristiana
            (e.vidaCristiana||[]).forEach((e,a)=>{
                let o="";
                if (e.hasOwnProperty("conductor")) {
                    const conductor = e.conductor || '';
                    const lector = e.lector || '';
                    const combined = `Conductor: ${conductor}${lector?'<br>Lector: '+lector:''}`;
                    s+=`<tr><td>• ${e.numero||""}. ${e.titulo||""}</td><td data-label="${t[0]}"></td><td data-label="${t[1]}"></td><td class="participante" data-label="${t[2]}">${getVidaCristianaParticipantHTML('conductor', a, selectDataCache.publicadores, conductor)}</td></tr>`;
                } else if (e.hasOwnProperty("discursante")) {
                    s+=`<tr><td>• ${e.numero||""}. ${e.titulo||""}</td><td data-label="${t[0]}"></td><td data-label="${t[1]}"></td><td class="participante" data-label="${t[2]}">${getVidaCristianaParticipantHTML('discursante', a, selectDataCache.publicadores, e.discursante || '')}</td></tr>`;
                } else {
                    s+=`<tr><td>• ${e.numero||""}. ${e.titulo||""}</td><td data-label="${t[0]}"></td><td data-label="${t[1]}"></td><td class="participante" data-label="${t[2]}"></td></tr>`;
                }
            });
            // Pie de programa
            s+=`<tr><td>• Palabras de conclusión (3 mins.)</td><td data-label="${t[0]}"></td><td data-label="${t[1]}"></td><td data-label="${t[2]}"></td></tr><tr><td>• <b>${e.canciones?.final||""}</b></td><td data-label="${t[0]}"></td><td data-label="${t[1]}"></td><td data-label="${t[2]}"></td></tr><tr><td><strong>Oración Final:</strong></td><td data-label="${t[0]}"></td><td data-label="${t[1]}"></td><td class="participante" data-label="${t[2]}">${getParticipantHTML('oracion-final', selectDataCache.oradores, e.oracion?.final)}</td></tr>`;
            a.innerHTML=s;
            document.getElementById("status-message").textContent="";
        }

        async function saveCurrentDataToCloud() {
            showStatusMessage('Guardando cambios...', 'loading');
            const weekId = document.getElementById('history-selector').value;
            // synchronize pair inputs into hidden combined fields before collecting
            syncPairInputs();
            const data = collectFormData();
            const { error } = await db.from('programas').update({ data }).eq('week_id', weekId);
            if (error) {
                showStatusMessage('Error al guardar cambios.', 'error');
            } else {
                fullDataCache[weekId] = data; // Actualizar caché local
                // Allow re-render after saving changes
                lastRenderedWeek = null;
                showStatusMessage('Cambios guardados exitosamente.', 'success');
                setTimeout(() => document.getElementById('status-message').classList.add('hidden'), 3000);
            }
        }

        function syncPairInputs(){
            document.querySelectorAll('.participant-pair.inline').forEach(container=>{
                const first = container.querySelector('.pair-first');
                const second = container.querySelector('.pair-second');
                const hidden = container.querySelector('.pair-hidden');
                if(!hidden) return;
                const a = (first && first.value) ? first.value.trim() : '';
                const b = (second && second.value) ? second.value.trim() : '';
                if(a && b) hidden.value = `${a} / ${b}`;
                else hidden.value = a || b || '';
            });
        }

        function collectFormData() {
            const weekId = document.getElementById('history-selector').value;
            let data = JSON.parse(JSON.stringify(fullDataCache[weekId])); // Deep copy

            // Read selects and inputs that have data-key attributes
            document.querySelectorAll('select[data-key], input[data-key]').forEach(el => {
                const key = el.dataset.key;
                const value = el.value;
                // Helper function to set nested properties
                const setDeepValue = (obj, path, value) => {
                    const keys = path.split('.');
                    let current = obj;
                    for (let i = 0; i < keys.length - 1; i++) {
                        const key = keys[i];
                        const nextKey = keys[i+1];
                        // Check if next key is a number for array access
                        if (!isNaN(parseInt(nextKey, 10))) {
                            if (!current[key]) current[key] = [];
                        } else {
                            if (!current[key]) current[key] = {};
                        }
                        current = current[key];
                    }
                    current[keys[keys.length - 1]] = value;
                };
                setDeepValue(data, key, value);
            });

            // Guardar estado de difuminado y marca de agua
            const watermarkText = document.getElementById('watermark-text');
            const toggleBlur = document.getElementById('toggle-blur');
            if (watermarkText && toggleBlur) {
                data.watermark = watermarkText.value;
                data.isBlurred = toggleBlur.checked;
            }

            return data;
        }

        function openPrintPreview() {
            const startWeek = document.getElementById('print-start-week').value;
            const endWeek = document.getElementById('print-end-week').value;
            const currentWeek = document.getElementById('history-selector').value;
            
            if (!startWeek || !endWeek) {
                showStatusMessage('Por favor seleccione un rango de fechas válido', 'error');
                return;
            }
            
            const weeks = Object.keys(fullDataCache).sort().filter(w => w >= startWeek && w <= endWeek);
            if (weeks.length === 0) {
                showStatusMessage('No hay programas en el rango seleccionado', 'error');
                return;
            }
            
            const programsToPrint = weeks.map(week => ({
                data: fullDataCache[week],
                weekId: week,
                isCurrentWeek: week === currentWeek
            }));
            const html = buildPrintableHTML(programsToPrint);
            const printWindow = window.open('', '_blank');
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
        }

        function buildPrintableHTML(programs) {
            const safe = (v) => (v == null ? '' : v);
            const rooms = ["Sala Auxiliar N°3", "Sala Auxiliar N°2", "Auditorio principal"];
            const programsHTML = programs.map(program => {
                const { data, weekId, isCurrentWeek } = program;
                const title = safe(data.titulo) || `Programa ${weekId || ''}`;
                const canciones = data.canciones || {};
                const watermarkText = data.watermark || 'PRELIMINAR';
                const isBlurred = isCurrentWeek && (data.isBlurred || false);
                let s = '';
                // Título en fila con colspan
                s += `<table class="print-table"><colgroup><col class="col-parte"><col class="col-sala1"><col class="col-sala2"><col class="col-sala3"></colgroup>
                    <thead>
                        <tr><th colspan="4" class="print-title"><h2>${title}</h2></th></tr>
                        <tr>
                            <th></th>
                            <th>${rooms[0]}</th>
                            <th>${rooms[1]}</th>
                            <th>${rooms[2]}</th>
                        </tr>
                    </thead>
                    <tbody>`;
                s += `<tr><td>Presidentes</td><td style="text-align: center;">${safe(data.presidentes?.aux3)}</td><td style="text-align: center;">${safe(data.presidentes?.aux2)}</td><td style="text-align: center;">${safe(data.presidentes?.principal)}</td></tr>`;
                s += `<tr><td>Oración de Inicio</td><td></td><td></td><td style="text-align: center;">${safe(data.oracion?.inicio)}</td></tr>`;
                // Cancion inicio
                if (canciones?.inicio) s += `<tr><td>• <b>${safe(canciones.inicio)}</b></td><td></td><td></td><td></td></tr>`;
                // Tesoros section
                s += `<tr class="section tesoros"><td colspan="4">TESOROS DE LA BIBLIA</td></tr>`;
                if (data.tesoros?.p1?.title) s += `<tr><td>${safe(data.tesoros.p1.title)}</td><td></td><td></td><td class="participante"><span style="font-weight:normal;font-family:'Arial Narrow',Arial,sans-serif">${safe(data.tesoros.p1.main)}</span></td></tr>`;
                if (data.tesoros?.p2?.title) s += `<tr><td>${safe(data.tesoros.p2.title)}</td><td></td><td></td><td class="participante">${safe(data.tesoros.p2.main)}</td></tr>`;
                s += `<tr><td>${safe(data.tesoros?.p3?.title) || 'Lectura de la Biblia (3 min)'}</td><td class="participante">${safe(data.tesoros?.p3?.aux3)}</td><td class="participante">${safe(data.tesoros?.p3?.aux2)}</td><td class="participante">${safe(data.tesoros?.p3?.main)}</td></tr>`;
                // Maestros section
                s += `<tr class="section maestros"><td colspan="4">SEAMOS MEJORES MAESTROS</td></tr>`;
                (data.maestros||[]).forEach(m => {
                    const isDiscurso = (m.title||'').toLowerCase().includes('discurso');
                    s += `<tr><td>${safe(m.title)}</td>`;
                    ["aux3", "aux2", "main"].forEach(room => {
                        const val = safe(m[room]);
                        const pair = isDiscurso ? val : formatPair(val);
                        s += `<td class="participante">${pair}</td>`;
                    });
                    s += `</tr>`;
                });
                // Vida Cristiana section
                s += `<tr class="section vida-cristiana"><td colspan="4">NUESTRA VIDA CRISTIANA</td></tr>`;
                if (canciones?.vidaCristiana) s += `<tr><td>• <b>${safe(canciones.vidaCristiana)}</b></td><td></td><td></td><td></td></tr>`;
                (data.vidaCristiana||[]).forEach(v => {
                    let detalle = '';
                    if (v.hasOwnProperty('conductor')) {
                        detalle = `${safe(v.conductor)}<br>Lector: ${safe(v.lector)}`;
                    } else if (v.hasOwnProperty('discursante')) {
                        detalle = `${safe(v.discursante)}`;
                    }
                    s += `<tr><td>• ${safe(v.numero)}. ${safe(v.titulo)}</td><td></td><td></td><td class="participante">${detalle}</td></tr>`;
                });
                // Conclusion
                s += `<tr><td>• Palabras de conclusión (3 mins.)</td><td></td><td></td><td></td></tr>`;
                if (canciones?.final) s += `<tr><td>• <b>${safe(canciones.final)}</b></td><td></td><td></td><td></td></tr>`;
                s += `<tr><td>• <b>Oración Final</b></td><td></td><td></td><td class="participante" style="text-align: center;">${safe(data.oracion?.final)}</td></tr>`;
                s += `</tbody></table>`;
                const programClass = isBlurred ? 'printable-program blurred' : 'printable-program';
                return `<div class="${programClass}" data-watermark="${watermarkText}" data-week="${weekId}">${s}</div>`;
            }).join('');
            const isDual = programs.length === 2;
            const containerClass = isDual ? 'print-container dual' : 'print-container';
            const finalHTML = `
                <div class="print-actions no-print">
                    <button class="primary" onclick="window.print()">Imprimir</button>
                    <button id="download-print-png" class="positive">Descargar PNG</button>
                    <button id="debug-button" onclick="debugCheck()">Ver Errores</button>
                    <button onclick="window.close()">Cerrar</button>
                    <div class="watermark-controls">
                        <label>Marca de agua: <input type="text" id="watermark-text" value="PRELIMINAR" /></label>
                        <label><input type="checkbox" id="toggle-blur" /> Difuminar</label>
                    </div>
                </div>
                <script>
                    // Inicializar controles con valores del programa actual
                    const currentProgram = ${JSON.stringify(programs.find(p => p.isCurrentWeek) || null)};
                    const currentWeek = currentProgram ? currentProgram.weekId : null;
                    const currentData = currentProgram ? currentProgram.data : null;
                    
                    if (currentData) {
                        document.getElementById('watermark-text').value = currentData.watermark || 'PRELIMINAR';
                        document.getElementById('toggle-blur').checked = currentData.isBlurred || false;
                    }
                    
                    document.getElementById('watermark-text').addEventListener('input', function(e) {
                        document.querySelectorAll('.printable-program.blurred').forEach(prog => {
                            prog.setAttribute('data-watermark', e.target.value);
                        });
                    });
                    
                    document.getElementById('toggle-blur').addEventListener('change', function(e) {
                        const currentWeekProgram = document.querySelector('.printable-program[data-week="' + currentWeek + '"]');
                        if (currentWeekProgram) {
                            if (e.target.checked) {
                                currentWeekProgram.classList.add('blurred');
                            } else {
                                currentWeekProgram.classList.remove('blurred');
                            }
                        }
                    });
                </script>
                <div class="width-controls no-print" style="display:flex; gap:10px; padding:10px; background:#f0f0f0; border-radius:8px; margin:10px 0;">
                    <label>Ancho Total Tabla (%): <input id="width-table" type="number" value="80" min="50" max="100" style="width:60px;"></label>
                    <label>Ancho Tema (%): <input id="width-tema" type="number" value="32" min="20" max="40" style="width:60px;"></label>
                    <label>Ancho Sala 1 (%): <input id="width-sala1" type="number" value="16" min="10" max="25" style="width:60px;"></label>
                    <label>Ancho Sala 2 (%): <input id="width-sala2" type="number" value="16" min="10" max="25" style="width:60px;"></label>
                    <label>Ancho Sala 3 (%): <input id="width-sala3" type="number" value="16" min="10" max="25" style="width:60px;"></label>
                </div>
                <div id="print-container" class="${containerClass}">
                    ${programsHTML}
                </div>
                <script>
                    (function(){
                        function loadScript(src, cb){
                            var s = document.createElement('script');
                            s.src = src;
                            s.onload = cb;
                            s.onerror = function(){ console.error('No se pudo cargar ' + src); };
                            document.head.appendChild(s);
                        }
                        function initDownload(){
                            var btn = document.getElementById('download-print-png');
                            if(!btn) return;
                            btn.addEventListener('click', function(){
                                var container = document.getElementById('print-container');
                                if(!container) return;
                                var noPrints = document.querySelectorAll('.no-print');
                                noPrints.forEach(function(np){ np.style.display = 'none'; });
                                // Slight delay to ensure styles applied
                                setTimeout(function(){
                                    // Compute scale: prefer higher scale for single-week previews for sharper text,
                                    // but cap it to avoid extremely large canvases. Also factor devicePixelRatio.
                                    var devicePR = window.devicePixelRatio || 1;
                                    var isDual = document.querySelector('#print-container') && document.querySelector('#print-container').classList.contains('dual');
                                    var baseScale = isDual ? 2 : 2.5;
                                    var scale = Math.min(3 * devicePR, baseScale * devicePR);
                                    var tables = container.querySelectorAll('.print-table');
                                    document.documentElement.classList.add('hide-scrollbar');
 var maxTableWidth = Array.from(tables).reduce((max, t) => Math.max(max, t.offsetWidth), 0);
 var width = maxTableWidth;
 var height = container.offsetHeight;
 html2canvas(container, {backgroundColor:'#fff', scale: scale, useCORS: true, allowTaint: false, logging: false, windowWidth: width, windowHeight: height, scrollX: -window.scrollX, scrollY: -window.scrollY, onclone: function(clonedDoc){
                                        // force white background in cloned document to avoid transparent or grey areas
                                        var c = clonedDoc.getElementById('print-container');
                                        if (c) {
                                            c.style.background = '#fff';
                                            c.style.margin = '0px';
                                            c.style.padding = '0px';
                                            c.style.width = 'fit-content';
                                        }
                                        clonedDoc.body.style.margin = '0px';
                                        clonedDoc.body.style.padding = '0px';
                                        clonedDoc.body.style.overflow = 'hidden';
clonedDoc.body.style.width = 'fit-content';
                                        clonedDoc.documentElement.style.width = 'fit-content';
                                        clonedDoc.documentElement.style.margin = '0px';
                                        clonedDoc.documentElement.style.padding = '0px';
                                        clonedDoc.documentElement.style.setProperty('--table-width', '100%');
                                        var containerClone = clonedDoc.getElementById('print-container');
                                        if (containerClone) {
                                            containerClone.style.gap = '0px';
                                            containerClone.style.justifyContent = 'flex-start';
                                            containerClone.style.alignItems = 'flex-start';
                                            containerClone.style.width = 'fit-content';
                                        }
                                        var programs = clonedDoc.querySelectorAll('.printable-program');
                                        programs.forEach(function(p) {
                                            p.style.margin = '0px';
                                            p.style.padding = '0px';
                                        });
                                        var tables = clonedDoc.querySelectorAll('.print-table');
                                        tables.forEach(function(t) {
                                            t.style.margin = '0';
                                            t.style.marginLeft = '0';
                                            t.style.marginRight = '0';
                                            t.style.width = '100%';
                                            t.style.boxSizing = 'border-box';
                                            t.style.display = 'block';
                                        });
                                    }}).then(function(canvas){
                                        document.documentElement.classList.remove('hide-scrollbar');
                                        noPrints.forEach(function(np){ np.style.display = ''; });
                                        var link = document.createElement('a');
                                        link.download = 'programa-semana.png';
                                        link.href = canvas.toDataURL('image/png');
                                        link.click();
                                    }).catch(function(err){
                                        document.documentElement.classList.remove('hide-scrollbar');
                                        noPrints.forEach(function(np){ np.style.display = ''; });
                                        console.error(err);
                                    });
                                }, 120);
                            });
                        }
                        function setupWidthControls() {
    document.getElementById('width-table').addEventListener('input', function(e){
        document.documentElement.style.setProperty('--table-width', e.target.value + '%');
    });
    document.getElementById('width-tema').addEventListener('input', function(e){
        document.documentElement.style.setProperty('--width-tema', e.target.value + '%');
    });
    document.getElementById('width-sala1').addEventListener('input', function(e){
        document.documentElement.style.setProperty('--width-sala1', e.target.value + '%');
    });
    document.getElementById('width-sala2').addEventListener('input', function(e){
        document.documentElement.style.setProperty('--width-sala2', e.target.value + '%');
    });
    document.getElementById('width-sala3').addEventListener('input', function(e){
        document.documentElement.style.setProperty('--width-sala3', e.target.value + '%');
    });
}
if(window.html2canvas || window.html2canvas !== undefined) {
    initDownload();
    setupWidthControls();
} else {
    loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', function() {
        initDownload();
        setupWidthControls();
    });
}
                    })();
                function debugCheck() {
    try {
        document.documentElement.style.getPropertyValue('--width-tema');
        alert('No hay errores obvios. Verifica la consola para más detalles.');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}
</script>
            `;
            const styles = `
                <style>
                    /* Estilos para el difuminado y marca de agua */
                    .printable-program.blurred {
                        position: relative;
                    }
                    .printable-program.blurred::before {
                        content: attr(data-watermark);
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 4em;
                        color: rgba(0, 0, 0, 0.8);
                        white-space: nowrap;
                        pointer-events: none;
                        z-index: 1000;
                        font-weight: bold;
                    }
                    .printable-program.blurred .print-table {
                        filter: blur(2px);
                        opacity: 0.85;
                    }
                    .printable-program.blurred .print-title {
                        filter: none;
                        opacity: 1;
                    }
                    /*
                        NOTE (print preview):
                        Styles defined here are injected into the separate print preview
                        popup/window. They must remain isolated from the main page styles
                        in buildInitialHTML_Program(). When adjusting alignment or sizing
                        for printing (A4, two-up, etc.), edit this block only.

                        TODO: Adjusting two-up (two weeks side-by-side):
                        - Edit the following rules in this block:
                            * .dual .printable-program (width per program)
                            * .col-parte and .col-sala (column widths)
                            * body font-size for the print preview (reduce if needed)
                        - Suggested starting values to fit two weeks on A4 landscape:
                            * .dual .printable-program { width: 50%; }
                            * .col-parte: ~28%  and .col-sala: ~22% each
                            * body font-size: 8.5pt (or reduce incrementally)
                        - If content still overflows, consider applying a transform scale
                            on #print-container during print or reduce paddings.
                    */
                    @media print { ${isDual ? '@page { size: A4 landscape; margin: 0.5cm; }' : '@page { size: A4; margin: 0.5cm; }'} body { padding: 0; font-size: 11pt; background-color: #fff; } .no-print { display: none !important; } *, ::before, ::after { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; } }
                    /* If printing two weeks, force landscape and side-by-side */
                    .dual { flex-direction: row; }
                    .dual .printable-program { width: 50%; box-sizing: border-box; }
                    @media print and (orientation:landscape) { }
                    @media print { /* when dual, use landscape page size */
                        .dual + * { }
                    }
                    body { font-family: "Arial Narrow", Arial, sans-serif; margin: 0; padding: 0; font-size: 11pt; color: #111; background-color: #fff; }
                    .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
                    .hide-scrollbar::-webkit-scrollbar { width: 0; height: 0; }
                    /* Ensure participants are not bold */
                    .participante, .participante b { font-family: "Arial Narrow", Arial, sans-serif !important; font-weight: normal !important; }
                    .print-actions { position: fixed; top: 10px; right: 10px; background-color: #ffffffcc; z-index: 100; padding: 6px; border-radius: 8px; box-shadow: 0 1px 6px rgba(0,0,0,0.08); display:flex; gap:6px; align-items:center; flex-wrap: wrap; }
                    .watermark-controls { display: flex; gap: 10px; align-items: center; padding: 4px 8px; background: #f0f0f0; border-radius: 6px; }
                    .watermark-controls label { display: flex; align-items: center; gap: 6px; font-size: 0.9em; }
                    .watermark-controls input[type="text"] { padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9em; width: 120px; }
                    .watermark-controls input[type="checkbox"] { margin: 0; }
                    .print-actions button { font-size: 0.9em; padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; background:#fff; }
                    .print-actions button.primary { background:#007bff; color:#fff; border-color:#007bff; }
                    .print-actions button.positive { background:#198754; color:#fff; border-color:#198754; }
                    .print-actions button:active { transform:translateY(1px); }
                    /* Compactar contenedores laterales y eliminar padding extra que aparece como borde gris en PNG */
                    #print-container { display: flex; flex-direction: column; gap: 0.4cm; padding: 0; background-color: #fff; }
                    .printable-program { page-break-inside: avoid; margin: 0; padding: 0.2cm; box-sizing: border-box; background: #fff; }
                    .print-header { margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1.5px solid #000; }
                    /* Título principal más grande */
                    .print-title { text-align: center; font-size: 18pt; margin: 0; padding: 2px 0; font-weight: 800; letter-spacing: 0.5px; }
                    .print-title h2 { margin: 0; line-height: 1; }
                    /* Meta info (presidentes / oraciones) más grande y con mayor contraste */
                    .print-meta-flex { display: flex; justify-content: space-between; font-size: 11.5pt; }
                    .meta-column { flex-basis: 49%; }
                    .meta-column div { font-size: 11pt; color: #111; font-family: "Arial Narrow", Arial, sans-serif; }
                    .meta-column div b { font-weight: normal; margin-right: 6px; font-family: "Arial Narrow", Arial, sans-serif; }
                          /* Allow the table to size columns based on content so the left column can expand
                              to keep its text on a single line when possible. */
                          .print-table { width: var(--table-width); border-collapse: collapse; table-layout: auto; background: #fff; margin: 0 auto; }
                    .print-table th, .print-table td { padding: 2px 6px; vertical-align: middle; line-height: 1.15; border: 1px solid #bbb; }
                    /* Texto en la primera columna (presidentes / etiquetas) más grande */
                    .print-table td:first-child { font-size: 11pt; }
                    .print-table td:first-child strong { font-size: 12pt; }
                    .print-table thead th { padding: 6px 6px; text-align: center; font-weight: 700; border-bottom: 1.5px solid #000; color: #000; border-top: 1px solid #000; font-size: 12.5pt; }
                    .print-table th:first-child, .print-table td:first-child { border-left: 1px solid #000; }
                    .print-table th:last-child, .print-table td:last-child { border-right: 1px solid #000; }
                    .print-table tbody tr:last-child td { border-bottom: 1px solid #000; }
                    .cell-center { text-align: center; }
                    .participante { text-align: center; font-size: 11pt; font-weight: 600; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; color: #111; }
                          /* Make the left column flexible: prevent wrapping and allow expansion to fit content on one line.
                              Use min-width to keep it readable, and a reasonable max-width so it doesn't overflow the page. */
                        :root {
  --table-width: 80%;
  --width-tema: 32%;
  --width-sala1: 16%;
  --width-sala2: 16%;
  --width-sala3: 16%;
}
.col-parte { width: auto; min-width: 192px; max-width: var(--width-tema); text-align: left !important; }
.col-sala1 { width: var(--width-sala1); }
.col-sala2 { width: var(--width-sala2); }
.col-sala3 { width: var(--width-sala3); }
                          /* Ensure first column cells don't wrap and will expand the column instead */
                          .print-table td:first-child, .print-table th:first-child { white-space: nowrap; overflow: visible; text-overflow: clip; }
                          /* If content does exceed the max-width, allow it to wrap as a fallback to avoid overflow */
                        @media (max-width: 900px) { .col-parte { min-width: 128px; max-width: 50%; } .print-table td:first-child { white-space: normal; } }
                    /* Evitar que el título de la sección TESOROS se parta en varias líneas */
                    .section.tesoros td { white-space: nowrap; }
                    /* Barras de sección más altas y con letra grande */
                    .section td { font-weight: 900; text-transform: uppercase; color: #fff; padding: 8px 10px; text-align: center; border-left: 1px solid #000 !important; border-right: 1px solid #000 !important; font-size: 13pt; }
                    .section.tesoros td { background-color: #5a6369; }
                    .section.maestros td { background-color: #c19a26; }
                    .section.vida-cristiana td { background-color: #8b2c39; }
                </style>
            `;
            return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Vista previa de Impresión</title>${styles}</head><body>${finalHTML}</body></html>`;
        }

        function formatPair(str) {
            if (!str) return '';
            const parts = str.split('/').map(s => s.trim()).filter(Boolean);
            if (parts.length > 1) return `${parts[0]} /<br>${parts[1]}`;
            return parts[0] || '';
        }