// Cliente de Turso híbrido: Intenta API Express del servidor y fallback directo a HTTP Pipeline de Turso

export interface TursoBackup {
    id: string;
    congregation_id: string;
    description: string;
    data: string; // JSON Stringified
    created_at: string;
}

export interface TursoRolGrupos {
    congregation_id: string;
    titulo: string;
    subtitulo: string;
    font_size: number;
    grupos_json: string; // JSON Stringified
    updated_at: string;
}

const DIRECT_TURSO_URL = "https://congregacion-15-de-julio-15dejulio.aws-us-east-1.turso.io/v2/pipeline";
const DIRECT_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA1NDQxNzYsImlkIjoiMDE5ZTkwYjMtOWMwMS03MDgzLTk3OWYtNDhiZjcxOGIwNzM0IiwicmlkIjoiZGM1MDhlYTYtNTc4OS00MGM1LWEzNDItMmQ5ZDVhY2Q4MjZhIn0.kp_b_-2WU82L3Ypa_fKJ01BO0bDyBFc8dXyJ4waTDfuyBUl_OnucnOO9Eh6gVwqxGws4llbp8BqkEHZJUQknCA";

/**
 * Ejecuta una consulta SQL directa mediante HTTP Pipeline en Turso como fallback resiliente.
 */
async function queryTursoDirect(sql: string, args: any[] = []): Promise<any> {
    try {
        const formattedArgs = args.map(arg => {
            if (arg === null || arg === undefined) return { type: "null" };
            if (typeof arg === "number") return { type: Number.isInteger(arg) ? "integer" : "float", value: arg };
            return { type: "text", value: String(arg) };
        });

        const response = await fetch(DIRECT_TURSO_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${DIRECT_TURSO_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                requests: [
                    {
                        type: "execute",
                        stmt: {
                            sql,
                            args: formattedArgs,
                        },
                    },
                ],
            }),
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        const firstResult = data?.results?.[0];
        if (firstResult?.type === "ok" && firstResult.response?.type === "execute") {
            const cols: string[] = (firstResult.response.result?.cols || []).map((c: any) => c.name);
            const rows: any[][] = firstResult.response.result?.rows || [];
            return rows.map(row => {
                const obj: Record<string, any> = {};
                cols.forEach((colName, idx) => {
                    obj[colName] = row[idx]?.value;
                });
                return obj;
            });
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Checks if the endpoint responds. Kept for compatibility.
 */
export async function initTursoSchema(): Promise<boolean> {
    return true;
}

/**
 * Saves a backup record via local Express proxy with direct Turso fallback.
 */
export async function saveBackupToTurso(
    id: string,
    congregationId: string | number,
    description: string,
    backupData: any,
    createdAt?: string
): Promise<boolean> {
    const timestamp = createdAt || new Date().toISOString();
    const dataJson = typeof backupData === "string" ? backupData : JSON.stringify(backupData);

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
                createdAt: timestamp,
            }),
        });

        if (response.ok) {
            const resJson = await response.json().catch(() => ({ success: true }));
            return !!resJson.success;
        }
    } catch {
        // Fallback a conexión directa HTTP de Turso
    }

    try {
        const directRes = await queryTursoDirect(
            `INSERT OR REPLACE INTO respaldos (id, congregation_id, description, data, created_at) VALUES (?, ?, ?, ?, ?)`,
            [String(id), String(congregationId), description, dataJson, timestamp]
        );
        return directRes !== null;
    } catch (directErr) {
        console.warn("No se pudo guardar respaldo en Turso:", directErr);
        return false;
    }
}

/**
 * Gets all backup records from local Express proxy for a congregation with fallback.
 */
export async function getBackupsFromTurso(congregationId: string | number): Promise<TursoBackup[]> {
    try {
        const response = await fetch(`/api/backups/${congregationId}`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) return data as TursoBackup[];
        }
    } catch {
        // Fallback a conexión directa HTTP de Turso
    }

    try {
        const rows = await queryTursoDirect(
            `SELECT id, congregation_id, description, data, created_at FROM respaldos WHERE congregation_id = ? ORDER BY created_at DESC`,
            [String(congregationId)]
        );
        if (Array.isArray(rows)) {
            return rows.map((r: any) => ({
                id: String(r.id),
                congregation_id: String(r.congregation_id),
                description: String(r.description || ""),
                data: String(r.data || ""),
                created_at: String(r.created_at || ""),
            }));
        }
    } catch (directErr) {
        console.warn("No se pudieron cargar respaldos de Turso:", directErr);
    }
    return [];
}

/**
 * Delete a backup from local Express proxy with fallback.
 */
export async function deleteBackupFromTurso(id: string): Promise<boolean> {
    try {
        const response = await fetch(`/api/backups/${id}`, {
            method: "DELETE",
        });
        if (response.ok) {
            const resJson = await response.json().catch(() => ({ success: true }));
            return !!resJson.success;
        }
    } catch {
        // Fallback a conexión directa HTTP de Turso
    }

    try {
        const directRes = await queryTursoDirect(
            `DELETE FROM respaldos WHERE id = ?`,
            [String(id)]
        );
        return directRes !== null;
    } catch (directErr) {
        console.warn("No se pudo eliminar respaldo de Turso:", directErr);
        return false;
    }
}

/**
 * Saves the congregation's group role layout with dual server/direct fallback.
 */
export async function saveRolGruposToTurso(
    congregationId: string | number,
    titulo: string,
    subtitulo: string,
    fontSize: number,
    gruposJson: string,
    updatedAt?: string
): Promise<boolean> {
    const timestamp = updatedAt || new Date().toISOString();

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
                updatedAt: timestamp,
            }),
        });

        if (response.ok) {
            const resJson = await response.json().catch(() => ({ success: true }));
            return !!resJson.success;
        }
    } catch {
        // Fallback a conexión directa HTTP de Turso
    }

    try {
        const directRes = await queryTursoDirect(
            `INSERT OR REPLACE INTO rol_grupos_data (congregation_id, titulo, subtitulo, font_size, grupos_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [String(congregationId), String(titulo || ""), String(subtitulo || ""), Number(fontSize || 10), String(gruposJson), timestamp]
        );
        return directRes !== null;
    } catch (directErr) {
        console.warn("No se pudo guardar diseño de Rol de Grupos en Turso:", directErr);
        return false;
    }
}

/**
 * Retrieves the congregation's group role layout from local proxy or direct Turso.
 */
export async function getRolGruposFromTurso(congregationId: string | number): Promise<TursoRolGrupos | null> {
    try {
        const response = await fetch(`/api/rol-grupos/${congregationId}`);
        if (response.ok) {
            const data = await response.json();
            if (data && typeof data === "object") {
                return data as TursoRolGrupos;
            }
            if (data === null) return null;
        }
    } catch {
        // Fallback a consulta directa a Turso por HTTP
    }

    try {
        const rows = await queryTursoDirect(
            `SELECT congregation_id, titulo, subtitulo, font_size, grupos_json, updated_at FROM rol_grupos_data WHERE congregation_id = ?`,
            [String(congregationId)]
        );
        if (Array.isArray(rows) && rows.length > 0) {
            const row = rows[0];
            return {
                congregation_id: String(row.congregation_id),
                titulo: String(row.titulo || ""),
                subtitulo: String(row.subtitulo || ""),
                font_size: Number(row.font_size || 10),
                grupos_json: String(row.grupos_json || ""),
                updated_at: String(row.updated_at || ""),
            };
        }
    } catch (directErr) {
        console.warn("Aviso: No se pudo obtener diseño de grupos desde Turso:", directErr);
    }
    return null;
}
