// Cliente de Turso redirigido a API en Servidor (Evitando Failed to Fetch por CORS/Sandbox)

export interface TursoBackup {
    id: string;
    congregation_id: string;
    description: string;
    data: string; // JSON Stringified
    created_at: string;
}

/**
 * Checks if the endpoint responds. Kept for compatibility.
 */
export async function initTursoSchema(): Promise<boolean> {
    return true; // Servidor inicializará el esquema automáticamente
}

/**
 * Saves a backup record via local Express proxy.
 */
export async function saveBackupToTurso(
    id: string,
    congregationId: string | number,
    description: string,
    backupData: any,
    createdAt?: string
): Promise<boolean> {
    try {
        const response = await fetch("/api/backups", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id,
                congregationId,
                description,
                backupData,
                createdAt,
            }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const resJson = await response.json();
        return !!resJson.success;
    } catch (err) {
        console.error("Error saving backup to proxy server:", err);
        return false;
    }
}

/**
 * Gets all backup records from local Express proxy for a congregation.
 */
export async function getBackupsFromTurso(congregationId: string | number): Promise<TursoBackup[]> {
    try {
        const response = await fetch(`/api/backups/${congregationId}`);
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data as TursoBackup[];
    } catch (err) {
        console.error("Error fetching backups from proxy server:", err);
        return [];
    }
}

/**
 * Delete a backup from local Express proxy.
 */
export async function deleteBackupFromTurso(id: string): Promise<boolean> {
    try {
        const response = await fetch(`/api/backups/${id}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const resJson = await response.json();
        return !!resJson.success;
    } catch (err) {
        console.error("Error deleting backup from proxy server:", err);
        return false;
    }
}

export interface TursoRolGrupos {
    congregation_id: string;
    titulo: string;
    subtitulo: string;
    font_size: number;
    grupos_json: string; // JSON Stringified
    updated_at: string;
}

/**
 * Saves the congregation's group role layout directly in Turso.
 */
export async function saveRolGruposToTurso(
    congregationId: string | number,
    titulo: string,
    subtitulo: string,
    fontSize: number,
    gruposJson: string,
    updatedAt?: string
): Promise<boolean> {
    try {
        const response = await fetch("/api/rol-grupos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                congregationId,
                titulo,
                subtitulo,
                fontSize,
                gruposJson,
                updatedAt,
            }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const resJson = await response.json();
        return !!resJson.success;
    } catch (err) {
        console.error("Error saving rol-grupos layout to Turso proxy:", err);
        return false;
    }
}

/**
 * Retrieves the congregation's group role layout from Turso.
 */
export async function getRolGruposFromTurso(congregationId: string | number): Promise<TursoRolGrupos | null> {
    try {
        const response = await fetch(`/api/rol-grupos/${congregationId}`);
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data as TursoRolGrupos | null;
    } catch (err) {
        console.error("Error fetching rol-grupos layout from Turso proxy:", err);
        return null;
    }
}
