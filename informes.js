const SUPABASE_URL = 'https://iosdslhikguqyhspbpbn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc2RzbGhpa2d1cXloc3BicGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTMzNjMsImV4cCI6MjA2ODY2OTM2M30.HbgX9g1e4kYZf1jn0-8RR8BctYZctVopigZgZVXBaJY';
    const { createClient } = supabase;
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    document.addEventListener('DOMContentLoaded', function() {
        let fullDataCache = {}, deliveryStatus = {};

        async function initializeApp() {
            buildInitialHTML_Reports();
            await fetchAllProgramData();
            setupReportsTab();
        }

        function buildInitialHTML_Reports() {
            document.getElementById('reports-container').innerHTML = `
                <h2>Generador de Hojas de Asignación (S-89)</h2>
                <div class="reports-filters">
                    <div class="filter-row" style="display: flex; gap: 20px; margin-bottom: 15px;">
                        <div class="filter-group" style="flex: 2;">
                            <div style="display: flex; gap: 10px; align-items: flex-end;">
                                <div style="flex: 1;">
                                    <label for="report-week-start"><strong>Desde:</strong></label>
                                    <select id="report-week-start" style="width: 100%;"><option value="">-- Inicio --</option></select>
                                </div>
                                <div style="flex: 1;">
                                    <label for="report-week-end"><strong>Hasta:</strong></label>
                                    <select id="report-week-end" style="width: 100%;"><option value="">-- Fin --</option></select>
                                </div>
                            </div>
                        </div>
                        <div class="filter-group" style="flex: 1;">
                            <label for="report-person-filter"><strong>Seleccionar participante:</strong></label>
                            <select id="report-person-filter" style="width: 100%;"><option value="">-- Todos los participantes --</option></select>
                        </div>
                        <div class="filter-group" style="flex: 1;">
                            <label for="report-assignment-filter"><strong>Tipo de asignación:</strong></label>
                            <select id="report-assignment-filter" style="width: 100%;">
                                <option value="">-- Todas las asignaciones --</option>
                                <option value="tesoros_1">Tesoros - Discurso (10 min.)</option>
                                <option value="tesoros_2">Tesoros - Joyas (10 min.)</option>
                                <option value="tesoros_3">Tesoros - Lectura de la Biblia (4 min.)</option>
                                <option value="maestros_1">Seamos Mejores Maestros - Primera conversación (2 min.)</option>
                                <option value="maestros_2">Seamos Mejores Maestros - Revisita (3 min.)</option>
                                <option value="maestros_3">Seamos Mejores Maestros - Curso bíblico (5 min.)</option>
                                <option value="maestros_4">Seamos Mejores Maestros - Discurso (5 min.)</option>
                            </select>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: center; gap: 10px; margin-top: 10px;">
                        <button id="clear-reports-filter-btn" style="background-color: #6c757d; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
                            Quitar Filtros
                        </button>
                        <button id="download-reports-btn" style="background-color: #28a745; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
                            Imprimir / Guardar PDF
                        </button>
                    </div>
                </div>
                <div class="filter-info" style="margin: 10px 0; padding: 8px; background-color: #f8f9fa; border-radius: 4px; font-size: 0.9em; color: #666;">
                    <p style="margin: 0;"><i>Nota: El filtro de semanas muestra solo las asignaciones desde la semana actual en adelante.</i></p>
                </div>
                <div id="reports-output"><p>Cargando informes...</p></div>`;
        }

        async function fetchAllProgramData(){
            const{data:t,error:a}=await db.from("programas").select("week_id, data").order("week_id",{ascending:false});
            if(a||!t) return;
            fullDataCache = {};
            t.forEach(e => { fullDataCache[e.week_id] = e.data; });
            console.log('fetchAllProgramData: loaded week keys ->', Object.keys(fullDataCache).slice(0,20));
        }

        function setupReportsTab() {
            document.getElementById('download-reports-btn').addEventListener('click', prepareAndPrint);
            document.getElementById('report-week-start').addEventListener('change', function() {
                updateEndWeekOptions();
                generateReportSlips();
            });
            document.getElementById('report-week-end').addEventListener('change', generateReportSlips);
            document.getElementById('report-person-filter').addEventListener('change', generateReportSlips);
            document.getElementById('report-assignment-filter').addEventListener('change', generateReportSlips);
            document.getElementById('clear-reports-filter-btn').addEventListener('click', () => {
                document.getElementById('report-week-start').value = "";
                document.getElementById('report-week-end').value = "";
                document.getElementById('report-person-filter').value = "";
                document.getElementById('report-assignment-filter').value = "";
                generateReportSlips();
            });
            document.getElementById('reports-output').addEventListener('click', e => {
                if (e.target.matches('.delivery-check')) {
                    const t = e.target, a = t.closest('.report-slip').dataset.slipId, s = t.dataset.person;
                    if(deliveryStatus[a]) {
                        deliveryStatus[a][s] = !deliveryStatus[a][s];
                        t.classList.toggle('checked', deliveryStatus[a][s]);
                    }
                } else if (e.target.closest('.share-whatsapp')) {
                    const button = e.target.closest('.share-whatsapp');
                    const slipId = button.dataset.slipId;
                    const slipElement = document.querySelector(`.report-slip[data-slip-id="${slipId}"]`);
                    shareSlipToWhatsApp(slipElement);
                }
            });

function shareSlipToWhatsApp(element) {
    const clone = element.cloneNode(true);
    const shareButton = clone.querySelector('.share-whatsapp');
    if (shareButton) shareButton.remove();
    const rect = element.getBoundingClientRect();
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    document.body.appendChild(clone);
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '-9999px';
    html2canvas(clone).then(canvas => {
        canvas.toBlob(blob => {
            const file = new File([blob], 'asignacion.png', {type: 'image/png'});
            navigator.share({
                files: [file],
                title: 'Asignación VMT',
                text: 'Aquí está tu asignación para la reunión.'
            }).then(() => console.log('Compartido exitosamente'))
            .catch(err => console.error('Error al compartir:', err));
        }, 'image/png');
    }).finally(() => {
        document.body.removeChild(clone);
    });
}
            setupReportSlipFilters();
            generateReportSlips();
        }

        function prepareAndPrint() {
            let e = "";
            const t = document.querySelectorAll("#reports-output .report-slip");
            for (let a = 0; a < t.length; a += 8) {
                let s = '<div class="print-page">';
                const l = Array.from(t).slice(a, a + 8);
                l.forEach(node => {
                    try {
                        const clone = node.cloneNode(true);
                        // Remove WhatsApp share buttons from clones so they don't appear in print
                        const shareBtn = clone.querySelector('.share-whatsapp');
                        if (shareBtn) shareBtn.remove();
                        s += clone.outerHTML;
                    } catch (err) {
                        s += node.outerHTML;
                    }
                });
                s += "</div>";
                e += s;
            }
            const a = `
                @page { size: A4 landscape; margin: 0; }
                body { margin: 0; font-family: Arial, sans-serif; }
                .print-page { display: flex; flex-wrap: wrap; justify-content: space-around; align-content: space-around; height: 100vh; box-sizing: border-box; page-break-after: always; }
                .report-slip { border: 1px solid #000; background-color: #fff; color: #000; font-size: 8.5pt; padding: 8px; overflow: hidden; display: flex; flex-direction: column; box-sizing: border-box; width: calc(25% - 8px); height: calc(50% - 8px); position: relative; }
                .report-field { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; font-size:.9em; }
                .report-field strong { position: relative; width:90px; flex-shrink:0; }
                .report-field span { flex-grow:1; border-bottom:1px dotted #000; padding:0 3px; }
                .report-slip h3 { text-align:center; margin-top:0; margin-bottom:20px; font-size:1em; line-height:1.2; }
                .report-slip .rooms { margin-top:15px; font-size:.9em; }
                .report-slip .rooms div { margin-bottom:5px; }
                .report-slip .footer-note { margin-top:auto; font-size:.7em; color:#555; border-top:1px solid #ddd; padding-top:8px; }
                .room-label::before { content: '☐'; font-family: "DejaVu Sans", sans-serif; margin-right: 8px; font-size: 1.2em; vertical-align: middle; }
                .room-label[data-checked="true"]::before { content: '☑'; }
                .delivery-check { flex-shrink:0; margin-left:10px; width:22px; height:22px; border:2px solid #a0b0c8; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; color:transparent; }
                .delivery-check.checked { background-color:#28a745; border-color:#28a745; color:#fff; }
                .delivery-check:not(.checked) { display: none; }
                .delivery-check.checked { display: flex !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #28a745 !important; border-color: #28a745 !important; color: #fff !important; border-radius: 50% !important; }
            `;
            const s = window.open("", "", "height=800,width=1200");
            s.document.write(`<html><head><title>Imprimir Asignaciones</title><style>${a}</style></head><body>${e}</body></html>`);
            s.document.close();
            setTimeout(() => { s.focus(); s.print(); s.close() }, 250);
        }

        function setupReportSlipFilters() {
            const weekStartSelect = document.getElementById("report-week-start");
            const weekEndSelect = document.getElementById("report-week-end");
            const personFilter = document.getElementById("report-person-filter");

            // Get current date and compute the Monday of the current week
            const today = new Date();
            const currentMonday = new Date(today);
            const day = today.getDay(); // 0 (Sun) .. 6 (Sat)
            const diffToMonday = (day === 0) ? -6 : 1 - day; // if Sunday go back 6 days
            currentMonday.setDate(today.getDate() + diffToMonday);

            // Allow one week before the current Monday as the lower bound
            const boundaryMonday = new Date(currentMonday);
            boundaryMonday.setDate(currentMonday.getDate() - 7);

            // Filter and sort weeks by actual Date objects (avoid string comparison mismatches)
            const availableWeeks = Object.keys(fullDataCache || {})
                .filter(weekId => {
                    try {
                        const wk = new Date(weekId);
                        return !isNaN(wk.getTime()) && wk >= boundaryMonday;
                    } catch (e) { return false; }
                })
                .sort((a, b) => new Date(a) - new Date(b));

            console.log('setupReportSlipFilters: boundaryMonday=', boundaryMonday.toISOString().split('T')[0]);
            console.log('setupReportSlipFilters: currentMonday=', currentMonday.toISOString().split('T')[0]);
            console.log('setupReportSlipFilters: availableWeeks after filter=', availableWeeks.slice(0,20));

            // Populate start week selector
            weekStartSelect.innerHTML = '<option value="">-- Inicio --</option>';
            availableWeeks.forEach(weekId => {
                const weekData = fullDataCache[weekId];
                weekStartSelect.innerHTML += `<option value="${weekId}">${weekData?.titulo || weekId}</option>`;
            });

            // If there are available weeks, select the first one by default so user sees the current week
            if (availableWeeks.length > 0) {
                weekStartSelect.value = availableWeeks[0];
            }

            // Initial population of end week selector
            updateEndWeekOptions();

            // Build set of all participants
            const participantSet = new Set();
            const interventionSet = new Set();
            
            // Include Bible readers and teaching assignments
            Object.values(fullDataCache).forEach(weekData => {
                // Add Bible reading assignments and collect intervention
                if (weekData.tesoros?.p3) {
                    ['main', 'aux2', 'aux3'].forEach(room => {
                        if (weekData.tesoros.p3[room]) {
                            participantSet.add(weekData.tesoros.p3[room].trim());
                            interventionSet.add("Lectura de la Biblia (3 min.)");
                        }
                    });
                }
                
                // Add teaching assignments and collect interventions
                (weekData.maestros || []).forEach(assignment => {
                    if (assignment.title) {
                        interventionSet.add(assignment.title);
                    }
                    ['main', 'aux2', 'aux3'].forEach(room => {
                        if (assignment[room]) {
                            assignment[room].split("/").forEach(name => {
                                const trimmedName = name.trim();
                                if (trimmedName) participantSet.add(trimmedName);
                            });
                        }
                    });
                });
            });

            // Populate person filter
            personFilter.innerHTML = '<option value="">-- Todos los participantes --</option>';
            Array.from(participantSet)
                .filter(name => name)
                .sort((a, b) => a.localeCompare(b, 'es'))
                .forEach(name => {
                    personFilter.innerHTML += `<option value="${name}">${name}</option>`;
                });

            // Populate assignment filter with actual interventions
            const assignmentFilter = document.getElementById("report-assignment-filter");
            assignmentFilter.innerHTML = '<option value="">-- Todas las asignaciones --</option>';
            Array.from(interventionSet)
                .sort()
                .forEach(intervention => {
                    assignmentFilter.innerHTML += `<option value="${intervention}">${intervention}</option>`;
                });
        }

        function updateEndWeekOptions() {
            const weekStartSelect = document.getElementById("report-week-start");
            const weekEndSelect = document.getElementById("report-week-end");
            const startWeek = weekStartSelect.value;
            // Recompute current week's Monday for filtering
            const today = new Date();
            const currentMonday = new Date(today);
            const day = today.getDay();
            const diffToMonday = (day === 0) ? -6 : 1 - day;
            currentMonday.setDate(today.getDate() + diffToMonday);

            // Get available weeks from current date forward and sort by date
            const allWeeks = Object.keys(fullDataCache || {})
                .filter(weekId => {
                    const d = new Date(weekId);
                    return !isNaN(d.getTime()) && d >= currentMonday;
                })
                .sort((a, b) => new Date(a) - new Date(b));
            
            // Reset end week selector
            weekEndSelect.innerHTML = '<option value="">-- Fin --</option>';
            
            // If startWeek selected, only show end weeks >= startWeek; otherwise show all available weeks
            const availableEndWeeks = startWeek ? allWeeks.filter(week => new Date(week) >= new Date(startWeek)) : allWeeks;
            availableEndWeeks.forEach(weekId => {
                const weekData = fullDataCache[weekId];
                weekEndSelect.innerHTML += `<option value="${weekId}">${weekData?.titulo || weekId}</option>`;
            });
            
            // If an end week is before the selected start, clear it
            if (weekEndSelect.value && startWeek && new Date(weekEndSelect.value) < new Date(startWeek)) {
                weekEndSelect.value = "";
            }
        }

        function generateReportSlips() {
            const outputContainer = document.getElementById("reports-output");
            const startWeek = document.getElementById("report-week-start").value;
            const endWeek = document.getElementById("report-week-end").value;
            const selectedPerson = document.getElementById("report-person-filter").value;
            const selectedAssignment = document.getElementById("report-assignment-filter").value;
            let assignments = [];
            deliveryStatus = {};

            // Get all weeks in the selected range
            const allWeeks = Object.keys(fullDataCache).sort();
            const weeksToProcess = allWeeks.filter(weekId => {
                if (!startWeek && !endWeek) return true;
                if (startWeek && !endWeek) return weekId >= startWeek;
                if (!startWeek && endWeek) return weekId <= endWeek;
                return weekId >= startWeek && weekId <= endWeek;
            });
            weeksToProcess.forEach(weekId => {
                const weekData = fullDataCache[weekId];
                if(!weekData) return;

                // Process Bible Reading assignments
                if (weekData.tesoros?.p3) {
                    ["main", "aux2", "aux3"].forEach(room => {
                        if (weekData.tesoros.p3[room]) {
                            const reader = weekData.tesoros.p3[room].trim();
                            if (reader) {
                                assignments.push({
                                    participant: reader,
                                    helper: "",
                                    weekId: weekId,
                                    weekTitle: weekData.titulo,
                                    partTitle: "Lectura de la Biblia (3 min.)",
                                    room: room,
                                    intendedFor: "participant"
                                });
                            }
                        }
                    });
                }

                // Process teaching assignments
                (weekData.maestros || []).forEach(assignment => {
                    ["main", "aux2", "aux3"].forEach(room => {
                        if (assignment[room]) {
                            const [participant, helper] = assignment[room].split("/").map(name => name.trim()).filter(Boolean);
                            if(participant) {
                                assignments.push({
                                    participant: participant,
                                    helper: helper || "",
                                    weekId: weekId,
                                    weekTitle: weekData.titulo,
                                    partTitle: assignment.title,
                                    room: room,
                                    intendedFor: "participant"
                                });
                                if(helper) {
                                    assignments.push({
                                        participant: participant,
                                        helper: helper,
                                        weekId: weekId,
                                        weekTitle: weekData.titulo,
                                        partTitle: assignment.title,
                                        room: room,
                                        intendedFor: "helper"
                                    });
                                }
                            }
                        }
                    });
                });
            });
            // Filter by person if selected
            let filteredAssignments = selectedPerson ? 
                assignments.filter(e => e.participant === selectedPerson || e.helper === selectedPerson) : 
                assignments;

            // Filter by assignment type if selected
            if (selectedAssignment) {
                filteredAssignments = filteredAssignments.filter(assignment => {
                    const title = assignment.partTitle.toLowerCase();
                    switch(selectedAssignment) {
                        case 'tesoros_1':
                            return title.includes('tesoros') && title.includes('discurso');
                        case 'tesoros_2':
                            return title.includes('tesoros') && title.includes('joyas');
                        case 'tesoros_3':
                            return title.includes('lectura de la biblia');
                        case 'maestros_1':
                            return title.includes('primera conversación') || title.includes('primera conversacion');
                        case 'maestros_2':
                            return title.includes('revisita');
                        case 'maestros_3':
                            return title.includes('curso bíblico') || title.includes('curso biblico');
                        case 'maestros_4':
                            return title.includes('seamos mejores maestros') && title.includes('discurso');
                        default:
                            // If the selected assignment is not one of the coded values,
                            // treat it as a dynamic intervention label and match against the partTitle.
                            try {
                                return title.includes(selectedAssignment.toLowerCase());
                            } catch (e) {
                                return true;
                            }
                    }
                });
            }

            console.log('generateReportSlips: selectedAssignment=', selectedAssignment, 'filteredCount=', filteredAssignments.length);
            outputContainer.innerHTML = filteredAssignments.length > 0 ? 
                filteredAssignments.map((e, t) => createReportSlipHTML(e, t)).join("") : 
                "<p>No se encontraron asignaciones con los filtros seleccionados.</p>";
        }

        function createReportSlipHTML(e, t) {
            const a = `slip-${e.weekId}-${e.participant.replace(/\s+/g,"")}-${e.helper.replace(/\s+/g,"")}-${t}`;
            deliveryStatus[a] = { participant: "participant" === e.intendedFor, helper: "helper" === e.intendedFor && !!e.helper };
            const s = getFridayOfMeetingWeek(e.weekTitle, e.weekId), l = deliveryStatus[a].participant ? "checked" : "", o = deliveryStatus[a].helper ? "checked" : "";
            const c = `<div class="report-field"><strong>Nombre:</strong> <span>${e.participant}</span><div class="delivery-check ${l}" data-person="participant" title="Entregado a ${e.participant}">✓</div></div>`;
            const d = e.helper ? `<div class="report-field"><strong>Ayudante:</strong> <span>${e.helper}</span><div class="delivery-check ${o}" data-person="helper" title="Entregado a ${e.helper}">✓</div></div>` : '<div class="report-field"><strong>Ayudante:</strong> <span>Ninguno</span></div>';
            const n = `<div class="rooms"><strong>Se presentará en:</strong><div><span class="room-label" data-checked="${"main"===e.room}"> Sala principal</span></div><div><span class="room-label" data-checked="${"aux2"===e.room}"> Sala auxiliar núm. 2</span></div><div><span class="room-label" data-checked="${"aux3"===e.room}"> Sala auxiliar núm. 3</span></div></div>`;
            return `<div class="report-slip" data-slip-id="${a}" data-room="${e.room}"><h3>ASIGNACIÓN PARA LA REUNIÓN<br>VIDA Y MINISTERIO CRISTIANOS</h3>${c}${d}<div class="report-field"><strong>Fecha:</strong> <span>${s}</span></div><div class="report-field"><strong>Intervención:</strong> <span>${e.partTitle}</span></div>${n}<div class="footer-note"><strong>Nota:</strong> En la <em>Guía de actividades</em> encontrará la información para su intervención. Repase las <em>Instrucciones para la reunión</em> (S-38).<div style="text-align: right; margin-top: 5px;">S-89-S 11/23</div></div><button class="share-whatsapp bg-green-500 text-white px-2 py-1 rounded mt-2" data-slip-id="${a}"><i class="fab fa-whatsapp"></i> Compartir por WhatsApp</button></div>`;
        }

        function getFridayOfMeetingWeek(e, t) {
            console.log('getFridayOfMeetingWeek called with:', e, t);
            try {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
                    console.log('Regex test failed for weekId:', t);
                    return e;
                }
                const date = new Date(t + 'T12:00:00Z');
                console.log('Parsed date:', date);
                if (isNaN(date.getTime())) {
                    console.log('Invalid date');
                    return e;
                }
                const dayOfWeek = date.getUTCDay();
                console.log('Day of week:', dayOfWeek);
                const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
                date.setUTCDate(date.getUTCDate() + daysUntilFriday);
                const formattedDate = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(date);
                console.log('Formatted Friday date:', formattedDate);
                return formattedDate;
            } catch (s) {
                console.error('Error in getFridayOfMeetingWeek:', s);
                return e;
            }
        }

        initializeApp();
    });