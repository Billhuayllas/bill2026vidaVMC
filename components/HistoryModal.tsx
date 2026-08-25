import React, { useState } from 'react';
import { getFridayFromWeekId } from '../lib/utils';

type HistoryEntry = {
    date: string;
    description: string;
};

type PersonHistory = {
    mostRecent: string;
    assignments: HistoryEntry[];
};

type AssignmentHistory = Map<string, PersonHistory>;

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: AssignmentHistory;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history }) => {
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const historyArray = Array.from(history.entries()).map(([name, data]) => ({
        name,
        ...data
    }));

    const filteredHistory = historyArray.filter(person => 
        person.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        // Sort by most recent assignment date (oldest first)
        const dateComparison = a.mostRecent.localeCompare(b.mostRecent);
        if (dateComparison !== 0) return dateComparison;
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h2 className="text-xl font-semibold text-gray-800">Historial de Asignaciones</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            placeholder="Buscar participante..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    <div className="space-y-6">
                        {filteredHistory.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No se encontraron participantes.</p>
                        ) : (
                            filteredHistory.map(person => (
                                <div key={person.name} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                        <h3 className="font-semibold text-gray-800">{person.name}</h3>
                                        <span className="text-sm text-gray-500">
                                            Última asignación: {person.mostRecent !== '0000-00-00' ? getFridayFromWeekId(person.mostRecent, 'short') : 'Ninguna'}
                                        </span>
                                    </div>
                                    <div className="p-0">
                                        {person.assignments.length > 0 ? (
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Fecha</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignación</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {person.assignments.map((assignment, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                {getFridayFromWeekId(assignment.date, 'short')}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm text-gray-600">
                                                                {assignment.description}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p className="text-sm text-gray-500 p-4">No hay historial de asignaciones.</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
