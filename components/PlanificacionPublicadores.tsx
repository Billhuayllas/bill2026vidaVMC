import React from 'react';

const PlanificacionPublicadores: React.FC = () => {
    return (
        <main className="container mx-auto px-4 py-8">
            <div id="status-message" className="mb-4 p-4 rounded-md hidden"></div>
            <div className="bg-white shadow-md rounded-lg p-6">
                <h1 className="text-2xl font-bold">Planificación de Publicadores</h1>
                <p className="mt-4 text-gray-600">Página nueva para gestionar la planificación de publicadores. Aquí podrás añadir herramientas y vistas específicas.</p>
                <div id="planificacion-publicadores-app" className="mt-6">
                    <div className="p-4 bg-gray-50 rounded border">
                        Próximamente: lista de publicadores, calendario y opciones de asignación.
                    </div>
                </div>
            </div>
        </main>
    );
};

export default PlanificacionPublicadores;