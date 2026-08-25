
export type PublisherRole = string;

export type GroupMember = {
    id: number;
    grupo_id: number;
    publicador_nombre: string;
    rol: PublisherRole;
    created_at?: string;
};

export type MinistryReport = {
    horas: number | '';
    horas_especiales: number | '';
    estudios: number | '';
    participo?: boolean;
    notas?: string;
    locked?: boolean;
};

export type VisitData = {
    date: string;
    notes: string;
};

export type Group = { id: number; nombre: string; };
export type Publisher = { id: number; nombre: string; nombre_completo?: string; direccion?: string; contacto_emergencia?: string; telefono_personal?: string; genero?: string; fecha_nacimiento?: string; fecha_bautismo?: string; esperanza?: string; clasificacion_vmt?: string; inicio_precursor_mes?: string; fecha_nombramiento?: string; rol?: string; };
export type ReportsMap = Record<string, MinistryReport>;
export type VisitsMap = Record<string, VisitData>;

export type RoleStats = {
    count: number;
    hours: number;
    studies: number;
};

export type GroupStats = {
    hours: number;
    studies: number;
    submitted: number;
    totalMembers: number;
    noStudies: number;
    roles: {
        pr: RoleStats;
        pa: RoleStats;
        pe: RoleStats;
        pub: RoleStats;
    };
};

export type AggregatedGroupStats = {
    groupId: number;
    groupName: string;
    stats: GroupStats;
};

export type MonthlyChange = {
    publisherName: string;
    type: 'role' | 'group' | 'new' | 'removed';
    fromValue?: string;
    toValue?: string;
};

