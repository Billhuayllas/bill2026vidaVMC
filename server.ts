import express from "express";
import path from "path";
import { createClient } from "@libsql/client";

const app = express();
const PORT = 3000;

// Configurar límites altos de JSON para respaldos grandes
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Configurar CORS para permitir peticiones desde cualquier origen en el Sandbox de AI Studio
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }
    next();
});

// Configurar cliente de Turso en el Servidor
const TURSO_URL = process.env.TURSO_URL || "https://congregacion-15-de-julio-15dejulio.aws-us-east-1.turso.io";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA1NDQxNzYsImlkIjoiMDE5ZTkwYjMtOWMwMS03MDgzLTk3OWYtNDhiZjcxOGIwNzM0IiwicmlkIjoiZGM1MDhlYTYtNTc4OS00MGM1LWEzNDItMmQ5ZDVhY2Q4MjZhIn0.kp_b_-2WU82L3Ypa_fKJ01BO0bDyBFc8dXyJ4waTDfuyBUl_OnucnOO9Eh6gVwqxGws4llbp8BqkEHZJUQknCA";

const turso = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
});

/**
 * Inicializar esquema en Turso
 */
async function initTursoSchema(): Promise<boolean> {
    try {
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS respaldos (
                id TEXT PRIMARY KEY,
                congregation_id TEXT,
                description TEXT,
                data TEXT,
                created_at TEXT
            );
        `);
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS rol_grupos_data (
                congregation_id TEXT PRIMARY KEY,
                titulo TEXT,
                subtitulo TEXT,
                font_size INTEGER,
                grupos_json TEXT,
                updated_at TEXT
            );
        `);
        return true;
    } catch (err) {
        console.error("Error initializing Turso schema on server:", err);
        return false;
    }
}

// 1. Obtener respaldos por congregacion
app.get("/api/backups/:congregationId", async (req, res) => {
    try {
        const { congregationId } = req.params;
        
        const dbRes = await turso.execute({
            sql: `SELECT id, congregation_id, description, data, created_at FROM respaldos 
                  WHERE congregation_id = ? ORDER BY created_at DESC`,
            args: [String(congregationId)]
        });
        
        const mapped = dbRes.rows.map((row) => ({
            id: String(row.id),
            congregation_id: String(row.congregation_id),
            description: String(row.description),
            data: String(row.data),
            created_at: String(row.created_at),
        }));
        
        res.json(mapped);
    } catch (error: any) {
        console.error("Server API get backups error:", error);
        res.status(500).json({ error: error.message || "Fallo en el servidor al obtener respaldos de Turso" });
    }
});

// 2. Guardar respaldo
app.post("/api/backups", async (req, res) => {
    try {
        const { id, congregationId, description, backupData, createdAt } = req.body;
        
        if (!id || !congregationId || !description || !backupData) {
            res.status(400).json({ error: "Faltan campos obligatorios" });
            return;
        }
        
        const timestamp = createdAt || new Date().toISOString();
        const dataJson = typeof backupData === "string" ? backupData : JSON.stringify(backupData);
        
        await turso.execute({
            sql: `INSERT OR REPLACE INTO respaldos (id, congregation_id, description, data, created_at) 
                  VALUES (?, ?, ?, ?, ?)`,
            args: [
                String(id), 
                String(congregationId), 
                description, 
                dataJson, 
                timestamp
            ]
        });
        
        res.json({ success: true });
    } catch (error: any) {
        console.error("Server API save backup error:", error);
        res.status(500).json({ error: error.message || "Fallo en el servidor al guardar el respaldo en Turso" });
    }
});

// 3. Eliminar respaldo
app.delete("/api/backups/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        await turso.execute({
            sql: "DELETE FROM respaldos WHERE id = ?",
            args: [id]
        });
        
        res.json({ success: true });
    } catch (error: any) {
        console.error("Server API delete backup error:", error);
        res.status(500).json({ error: error.message || "Fallo en el servidor al eliminar en Turso" });
    }
});

// 4. Obtener datos de Rol de Grupos
app.get("/api/rol-grupos/:congregationId", async (req, res) => {
    try {
        const { congregationId } = req.params;
        
        const dbRes = await turso.execute({
            sql: `SELECT congregation_id, titulo, subtitulo, font_size, grupos_json, updated_at FROM rol_grupos_data 
                  WHERE congregation_id = ?`,
            args: [String(congregationId)]
        });
        
        if (dbRes.rows.length === 0) {
            res.json(null);
            return;
        }
        
        const row = dbRes.rows[0];
        res.json({
            congregation_id: String(row.congregation_id),
            titulo: String(row.titulo),
            subtitulo: String(row.subtitulo),
            font_size: Number(row.font_size),
            grupos_json: String(row.grupos_json),
            updated_at: String(row.updated_at),
        });
    } catch (error: any) {
        console.error("Server API get rol-grupos error:", error);
        res.status(500).json({ error: error.message || "Fallo en el servidor al obtener Rol de Grupos de Turso" });
    }
});

// 5. Guardar/Actualizar datos de Rol de Grupos
app.post("/api/rol-grupos", async (req, res) => {
    try {
        const { congregationId, titulo, subtitulo, fontSize, gruposJson, updatedAt } = req.body;
        
        if (!congregationId || !gruposJson) {
            res.status(400).json({ error: "Faltan campos obligatorios" });
            return;
        }
        
        const timestamp = updatedAt || new Date().toISOString();
        
        await turso.execute({
            sql: `INSERT OR REPLACE INTO rol_grupos_data (congregation_id, titulo, subtitulo, font_size, grupos_json, updated_at) 
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
                String(congregationId),
                String(titulo),
                String(subtitulo),
                Number(fontSize),
                String(gruposJson),
                timestamp
            ]
        });
        
        res.json({ success: true });
    } catch (error: any) {
        console.error("Server API save rol-grupos error:", error);
        res.status(500).json({ error: error.message || "Fallo en el servidor al guardar Rol de Grupos en Turso" });
    }
});

// Configurar Vite middleware para desarrollo o servir estáticos en producción
async function configViteAndStart() {
    // Inicializar el esquema de base de datos Turso una vez al iniciar el servidor
    console.log("Inicializando esquema de base de datos Turso...");
    await initTursoSchema();

    if (process.env.NODE_ENV !== "production") {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*all", (req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`[FULL-STACK] Servidor escuchando en http://0.0.0.0:${PORT}`);
    });
}

configViteAndStart();
