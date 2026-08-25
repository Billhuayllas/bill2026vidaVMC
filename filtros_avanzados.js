const SUPABASE_URL = 'https://iosdslhikguqyhspbpbn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc2RzbGhpa2d1cXloc3BicGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTMzNjMsImV4cCI6MjA2ODY2OTM2M30.HbgX9g1e4kYZf1jn0-8RR8BctYZctVopigZgZVXBaJY';
    const { createClient } = supabase;
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    document.addEventListener('DOMContentLoaded', function() {
        let fullDataCache = {}, assignmentsByRole = {};

        async function initializeApp() {
            buildInitialHTML_Filters();
            await fetchAllProgramData();
            setupAdvancedFilters();
        }

        function buildInitialHTML_Filters() {
            document.getElementById('filters-container').innerHTML = `
                <h2>Filtros Avanzados</h2>
                <p>Seleccione un tipo de asignación para ver un resumen.</p>
                <div id="filter-buttons-container" class="filter-buttons"><p>Cargando filtros...</p></div>
                <div id="filters-legend" class="filters-legend" style="display: none;">
                    <h4>Leyenda:</h4>
                    <div class="legend-item"><span class="assignment-marker sala-main">Aud</span><span>Auditorio</span></div>
                    <div class="legend-item"><span class="assignment-marker sala-aux2">S2</span><span>Sala 2</span></div>
                    <div class="legend-item"><span class="assignment-marker sala-aux3">S3</span><span>Sala 3</span></div>
                    <div class="legend-item"><strong>E</strong><span>Encargado</span></div>
                    <div class="legend-item"><strong>A</strong><span>Ayudante</span></div>
                </div>
                <div id="filters-results" class="table-wrapper"><p>Seleccione un filtro.</p></div>`;
        }

        async function fetchAllProgramData(){
            const{data:t,error:a}=await db.from("programas").select("week_id, data").order("week_id",{ascending:false});
            if(a||!t) return;
            fullDataCache = {};
            t.forEach(e => { fullDataCache[e.week_id] = e.data; });
        }

        function addAssignment(e,t,a,s,l){
            if(!a||!a.trim())return;
            const o=a.split("/").map(e=>e.trim()).filter(Boolean);
            o.forEach((a,c)=>{
                let d=o.length>1?(0===c?"E":"A"):null;
                e[t]||(e[t]={});
                e[t][a]||(e[t][a]=[]);
                if(!e[t][a].some(e=>e.date===s&&e.room===l)) e[t][a].push({date:s,room:l,subRole:d});
            });
        }

        function collectAllAssignments(){
            const e={};
            for(const t in fullDataCache){
                const a=fullDataCache[t];
                if(a){
                    addAssignment(e,"Presidente",a.presidentes?.principal,t,"main");
                    addAssignment(e,"Consejero",a.presidentes?.aux2,t,"aux2");
                    addAssignment(e,"Consejero",a.presidentes?.aux3,t,"aux3");
                    addAssignment(e,"Oración Inicio",a.oracion?.inicio,t,"main");
                    addAssignment(e,"Oración Final",a.oracion?.final,t,"main");
                    addAssignment(e,"Discurso (Tesoros)",a.tesoros?.p1?.main,t,"main");
                    addAssignment(e,"Discurso (Tesoros)",a.tesoros?.p2?.main,t,"main");
                    addAssignment(e,"Lectura de la Biblia",a.tesoros?.p3?.main,t,"main");
                    addAssignment(e,"Lectura de la Biblia",a.tesoros?.p3?.aux2,t,"aux2");
                    addAssignment(e,"Lectura de la Biblia",a.tesoros?.p3?.aux3,t,"aux3");
                    (a.maestros||[]).forEach(a=>{
                        const s=a.title.toLowerCase().includes("discurso")?"Discurso (Maestros)":"Demostración (Maestros)";
                        addAssignment(e,s,a.main,t,"main");
                        addAssignment(e,s,a.aux2,t,"aux2");
                        addAssignment(e,s,a.aux3,t,"aux3");
                    });
                    (a.vidaCristiana||[]).forEach(a=>{
                        if(a.hasOwnProperty("conductor")){
                            addAssignment(e,"Conducción del Libro",a.conductor,t,"main");
                            addAssignment(e,"Lector del Libro",a.lector,t,"main");
                        }
                        if(a.hasOwnProperty("discursante")) addAssignment(e,"Discurso (Vida Cristiana)",a.discursante,t,"main");
                    });
                }
            }
            return e;
        }

        function setupAdvancedFilters(){
            assignmentsByRole=collectAllAssignments();
            const e=document.getElementById("filter-buttons-container"),t=Object.keys(assignmentsByRole).sort(),a=[...new Set(Object.values(assignmentsByRole).flat().flatMap(Object.values).flat().map(a=>a.date))].sort();
            document.getElementById("filters-legend").style.display="none";
            document.getElementById("filters-results").innerHTML='<p>Seleccione un filtro para ver los resultados.</p>';
            e.innerHTML=0<t.length?t.map(e=>`<button class="filter-btn" data-role="${e}">${e}</button>`).join(""): "<p>No hay datos de asignaciones para mostrar.</p>";
            e.addEventListener("click",e=>{
                if(e.target.matches(".filter-btn")){
                    document.querySelectorAll(".filter-btn").forEach(e=>e.classList.remove("active"));
                    e.target.classList.add("active");
                    displayFilteredTable(e.target.dataset.role,a);
                }
            });
        }

        function displayFilteredTable(e,t){
            const a=document.getElementById("filters-results"),s=document.getElementById("filters-legend"),l=assignmentsByRole[e];
            if(!l) return a.innerHTML=`<p>No hay asignaciones para el rol "${e}".</p>`,void(s.style.display="none");
            s.style.display="flex";
            const o=Object.keys(l).sort();
            let c='<table class="filters-table"><thead><tr><th>Participante</th>';
            t.forEach(e=>{c+=`<th>${e.substring(5).replace("-","/")}</th>`});
            c+="</tr></thead><tbody>";
            const d={main:"Aud",aux2:"S2",aux3:"S3"};
            o.forEach(e=>{
                c+=`<tr><td data-label="Participante">${e}</td>`;
                const a=l[e];
                t.forEach(t=>{
                    const s=a.find(e=>e.date===t);
                    c+=`<td data-label="${t.substring(5).replace("-","/")}">${s?`<span class="assignment-marker sala-${s.room}">${s.subRole||d[s.room]||"X"}</span>`:`-`}</td>`;
                });
                c+="</tr>";
            });
            c+="</tbody></table>";
            a.innerHTML=c;
        }

        initializeApp();
    });