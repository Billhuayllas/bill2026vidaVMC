const SUPABASE_URL = 'https://iosdslhikguqyhspbpbn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc2RzbGhpa2d1cXloc3BicGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTMzNjMsImV4cCI6MjA2ODY2OTM2M30.HbgX9g1e4kYZf1jn0-8RR8BctYZctVopigZgZVXBaJY';
    const { createClient } = supabase;
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    document.addEventListener('DOMContentLoaded', function() {
        const managerConfig = [ { type: 'presidentes', title: 'Presidentes', tableName: 'lista_encargados', singular: 'Presidente', placeholder: 'presidente' }, { type: 'consejeros', title: 'Consejeros', tableName: 'consejeros', singular: 'Consejero', placeholder: 'consejero' }, { type: 'oradores', title: 'Oración', tableName: 'oradores', singular: 'Orador', placeholder: 'orador' }, { type: 'discursantes', title: 'Discursantes (Tesoros/VMT)', tableName: 'discursantes', singular: 'Discursante', placeholder: 'discursante' }, { type: 'lectores', title: 'Lectores de Biblia', tableName: 'lectores', singular: 'Lector', placeholder: 'lector' }, { type: 'lectores_libro', title: 'Lectores de Libro', tableName: 'lectores_libro', singular: 'Lector', placeholder: 'lector de libro' }, { type: 'publicadores', title: 'Publicadores', tableName: 'publicadores', singular: 'Publicador', placeholder: 'publicador' }, { type: 'maestros_discurso', title: 'Discurso (Maestros)', tableName: 'maestros_discurso', singular: 'Discursante', placeholder: 'discursante' } ];

        async function initializeApp() {
            buildInitialHTML_Managers();
            setupSubNavigation();
            managerConfig.forEach(m => setupManager(m.type, m.tableName, m.singular));
            loadManagerData(managerConfig[0].type, managerConfig[0].tableName, managerConfig[0].singular);
        }

        function buildInitialHTML_Managers() {
            let managerHTML = '<div class="sub-nav-menu">';
            let panelHTML = '';
            managerConfig.forEach((m, index) => {
                managerHTML += `<button class="sub-nav-button ${index === 0 ? 'active' : ''}" data-manager="${m.type}">${m.title}</button>`;
                panelHTML += `<div id="${m.type}-manager-panel" class="manager-panel" style="display: ${index === 0 ? 'block' : 'none'};">
                    <h2>Gestionar ${m.title}</h2>
                    <div class="add-form">
                        <input type="text" id="new-${m.type}-name" placeholder="Nombre del nuevo ${m.placeholder}">
                        <button id="add-${m.type}-button" class="button" style="background-color: #28a745; color: white;">Agregar</button>
                    </div>
                    <ul id="${m.type}-list" class="list"></ul>
                    <div id="status-message-${m.type}" style="text-align:center;margin-top:15px;font-weight:700;height:20px"></div>
                </div>`;
            });
            document.getElementById('managers-container').innerHTML = managerHTML + '</div>' + panelHTML;
        }

        function setupSubNavigation(){
            document.querySelector(".sub-nav-menu").addEventListener("click",e=>{
                if(e.target.matches(".sub-nav-button")){
                    const t=e.target.dataset.manager;
                    document.querySelectorAll(".sub-nav-button").forEach(e=>e.classList.remove("active"));
                    e.target.classList.add("active");
                    document.querySelectorAll(".manager-panel").forEach(e=>e.style.display="none");
                    document.getElementById(`${t}-manager-panel`).style.display="block";
                    const a=managerConfig.find(e=>e.type===t);
                    if(a) loadManagerData(a.type,a.tableName,a.singular);
                }
            });
        }

        function setupManager(e,t,a){
            const n=document.getElementById(`add-${e}-button`),o=document.getElementById(`new-${e}-name`),s=document.getElementById(`status-message-${e}`);
            n.addEventListener("click",async()=>{
                const n=o.value.trim();
                if(!n) return void alert("Por favor, ingrese un nombre.");
                s.textContent="Agregando...";
                const{error:r}=await db.from(t).insert({nombre:n});
                if(r) s.textContent="Error al agregar.";
                else{
                    o.value="";
                    await loadManagerData(e,t,a);
                }
            });
            document.getElementById(`${e}-list`).addEventListener("click",async n=>{
                const o=n.target.closest("button");
                if(o){
                    const n=o.dataset.id,r=o.dataset.name;
                    if(o.classList.contains("edit-btn")){
                        const i=prompt("Editar nombre:",r);
                        if(i&&i.trim()&&i.trim()!==r){
                            s.textContent="Actualizando...";
                            await db.from(t).update({nombre:i.trim()}).eq("id",n);
                            await loadManagerData(e,t,a);
                        }
                    }
                    if(o.classList.contains("delete-btn")){
                        if(confirm(`¿Seguro que desea eliminar a "${r}"?`)){
                            s.textContent="Eliminando...";
                            await db.from(t).delete().eq("id",n);
                            await loadManagerData(e,t,a);
                        }
                    }
                }
            });
        }

        async function loadManagerData(e,t,a){
            const n=document.getElementById(`status-message-${e}`);
            n.textContent="Cargando...";
            const{data:o,error:s}=await db.from(t).select("id, nombre").order("nombre",{ascending:!0});
            if(s) return void(n.textContent="Error al cargar.");
            const r=document.getElementById(`${e}-list`);
            r.innerHTML=0===o.length?`<li>No hay ${a.toLowerCase()}s registrados.</li>`:o.map(e=>`<li><span>${e.nombre}</span><div class="actions"><button class="edit-btn" data-id="${e.id}" data-name="${e.nombre}">Editar</button><button class="delete-btn" data-id="${e.id}" data-name="${e.nombre}">Eliminar</button></div></li>`).join("");
            n.textContent="";
        }

        initializeApp();
    });