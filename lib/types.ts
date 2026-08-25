export type Option = {
    nombre: string;
};

export type HistoryEntry = {
    date: string;
    description: string;
};

export type PersonHistory = {
    mostRecent: string;
    assignments: HistoryEntry[];
};

export type AssignmentHistory = Map<string, PersonHistory>;

export type ParticipantLists = { [key: string]: { nombre: string }[] };

export type ProgramData = {
    programs: any[];
    lists: ParticipantLists;
    history: AssignmentHistory;
    rawLocalPrograms?: any[];
};