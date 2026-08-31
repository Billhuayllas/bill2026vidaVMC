import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useCongregation } from "../lib/CongregationContext";
import {
	saveCompleteBackupToSupabase,
	exportCompleteBackup,
	shareCompleteBackup,
} from "../lib/backupUtils";

const renderDireccionInTable = (direccion: string) => {
	if (!direccion) return <span style={{ color: "#cbd5e1" }}>--</span>;
	let parsedDirStr = direccion;
	let zone = '';
	let ucv = '';
	const zonaMatch = parsedDirStr.match(/\{\{zona:(.*?)\}\}/);
	if (zonaMatch) {
		zone = zonaMatch[1];
		parsedDirStr = parsedDirStr.replace(zonaMatch[0], '');
	}
	const ucvMatch = parsedDirStr.match(/\{\{ucv:(.*?)\}\}/);
	if (ucvMatch) {
		ucv = ucvMatch[1];
		parsedDirStr = parsedDirStr.replace(ucvMatch[0], '');
	}
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
			<div style={{ fontSize: '0.8rem', color: '#1e293b' }}>{parsedDirStr.trim()}</div>
			<div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
				{zone && (
					<span style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
						Zona: {zone}
					</span>
				)}
				{ucv && (
					<span style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
						UCV: {ucv}
					</span>
				)}
			</div>
		</div>
	);
};

const renderContactoInTable = (telefonoPersonal: string, contactoEmergencia: string) => {
	if (!telefonoPersonal && !contactoEmergencia) return <span style={{ color: "#cbd5e1" }}>--</span>;
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' }}>
			{telefonoPersonal && (
				<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
					<span style={{ color: '#059669', fontWeight: '600' }}>📞 Tel:</span> {telefonoPersonal}
				</div>
			)}
			{contactoEmergencia && (
				<div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: '#475569' }}>
					<span style={{ color: '#e11d48', fontWeight: '600' }}>🚨 Emg:</span> {contactoEmergencia}
				</div>
			)}
		</div>
	);
};

export default function CopiasSeguridad({
	isReadOnly,
}: {
	isReadOnly?: boolean;
}) {
	const { currentCongregation } = useCongregation();
	const [backups, setBackups] = useState<any[]>([]);
	const [tursoBackups, setTursoBackups] = useState<any[]>([]);
	const [tursoStatus, setTursoStatus] = useState<"pending" | "ok" | "error">(
		"pending",
	);
	const [isSyncingTurso, setIsSyncingTurso] = useState(false);
	const [loading, setLoading] = useState(true);
	const [statusMessage, setStatusMessage] = useState<{
		text: string;
		type: "success" | "error" | "info";
	} | null>(null);
	const [restoringId, setRestoringId] = useState<string | null>(null);

	// States for Excel/CSV Import & Export
	const [templateMonth, setTemplateMonth] = useState(
		new Date().toISOString().substring(0, 7),
	);
	const [parsedRecords, setParsedRecords] = useState<any[]>([]);
	const [parseStats, setParseStats] = useState<{
		total: number;
		valid: number;
		invalid: number;
		newPublishersCount: number;
	} | null>(null);
	const [newPublishersToCreate, setNewPublishersToCreate] = useState<string[]>(
		[],
	);
	const [autoCreatePublishers, setAutoCreatePublishers] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [importProgress, setImportProgress] = useState({
		current: 0,
		total: 0,
	});
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [importSuccess, setImportSuccess] = useState<string | null>(null);
	const [showDocs, setShowDocs] = useState(false);
	const [safeImportMode, setSafeImportMode] = useState<
		"safe" | "overwrite" | "skip"
	>("safe");

	// States for Publishers Personal Data CSV Import
	const [pubParsedRecords, setPubParsedRecords] = useState<any[]>([]);
	const [pubParseStats, setPubParseStats] = useState<{
		total: number;
		valid: number;
		invalid: number;
		newPublishersCount: number;
	} | null>(null);
	const [newPubsToCreate, setNewPubsToCreate] = useState<string[]>([]);
	const [pubIsImporting, setPubIsImporting] = useState(false);
	const [pubImportProgress, setPubImportProgress] = useState({
		current: 0,
		total: 0,
	});
	const [pubSelectedFile, setPubSelectedFile] = useState<File | null>(null);
	const [pubImportSuccess, setPubImportSuccess] = useState<string | null>(null);
	const [pubSafeImportMode, setPubSafeImportMode] = useState<
		"safe" | "overwrite" | "skip"
	>("safe");

	// UI Tab toggle: 'reports' | 'publishers'
	const [activeImportTab, setActiveImportTab] = useState<
		"reports" | "publishers"
	>("reports");

	useEffect(() => {
		if (currentCongregation) {
			fetchBackups();
		}
	}, [currentCongregation]);

	const fetchBackups = async () => {
		setLoading(true);
		if (!currentCongregation) return;

		// 1. Fetch from Supabase
		try {
			const { data, error } = await supabase
				.from("respaldos")
				.select("id, description, created_at")
				.eq("congregation_id", currentCongregation.id)
				.order("created_at", { ascending: false });

			if (error) {
				// If the table doesn't exist yet, that's fine.
				if (error.code === "42P01") {
					setBackups([]);
				} else {
					throw error;
				}
			} else {
				setBackups(data || []);
			}
		} catch (error: any) {
			console.error("Error fetching backups from Supabase", error);
		}

		// 2. Fetch from Turso
		try {
			const { getBackupsFromTurso } = await import("../lib/turso");
			const tb = await getBackupsFromTurso(currentCongregation.id);
			setTursoBackups(tb || []);
			setTursoStatus("ok");
		} catch (error: any) {
			console.error("Error fetching backups from Turso", error);
			setTursoStatus("error");
		} finally {
			setLoading(false);
		}
	};

	const handleCreateBackup = async () => {
		if (isReadOnly) return;
		const success = await saveCompleteBackupToSupabase(
			currentCongregation,
			setStatusMessage,
		);
		if (success) {
			fetchBackups();
		}
	};

	const handleDownloadCurrent = async () => {
		await exportCompleteBackup(currentCongregation, setStatusMessage);
	};

	const handleShareCurrent = async () => {
		await shareCompleteBackup(currentCongregation, setStatusMessage);
	};

	const handleDeleteBackup = async (
		id: string,
		source: "supabase" | "turso" = "supabase",
	) => {
		if (isReadOnly) return;
		if (
			!window.confirm(
				`¿Estás seguro de eliminar esta copia de seguridad de ${source === "supabase" ? "Supabase" : "Turso"}?`,
			)
		)
			return;

		try {
			if (source === "supabase") {
				const { error } = await supabase
					.from("respaldos")
					.delete()
					.eq("id", id);
				if (error) throw error;
				setBackups(backups.filter((b) => b.id !== id));
			} else {
				const { deleteBackupFromTurso } = await import("../lib/turso");
				const ok = await deleteBackupFromTurso(id);
				if (!ok) throw new Error("Fallo al borrar en Turso");
				setTursoBackups(tursoBackups.filter((b) => b.id !== id));
			}
			setStatusMessage({
				text: `Copia eliminada de ${source === "supabase" ? "Supabase" : "Turso"}.`,
				type: "success",
			});
			setTimeout(() => setStatusMessage(null), 3000);
		} catch (error: any) {
			console.error("Delete error", error);
			setStatusMessage({ text: "Error al eliminar.", type: "error" });
		}
	};

	const handleRestoreBackup = async (
		id: string,
		source: "supabase" | "turso" = "supabase",
	) => {
		if (isReadOnly) return;
		if (
			!window.confirm(
				`ADVERTENCIA: Restaurar una copia de seguridad REEMPLAZARÁ TODOS los datos actuales de la congregación con los datos de esta copia. ¿Deseas continuar?`,
			)
		)
			return;

		setRestoringId(id);
		setStatusMessage({
			text: `Restaurando copia de seguridad desde ${source === "supabase" ? "Supabase" : "Turso"}. Por favor espera...`,
			type: "info",
		});

		try {
			// 1. Fetch full backup data
			let bd;
			if (source === "supabase") {
				const { data: backupRecord, error: fetchErr } = await supabase
					.from("respaldos")
					.select("data")
					.eq("id", id)
					.single();

				if (fetchErr || !backupRecord)
					throw fetchErr || new Error("No backup data found in Supabase");
				bd = backupRecord.data;
			} else {
				const { getBackupsFromTurso } = await import("../lib/turso");
				const tb = await getBackupsFromTurso(currentCongregation.id);
				const match = tb.find((b) => b.id === id);
				if (!match) throw new Error("Copia no encontrada en Turso");
				bd = JSON.parse(match.data);
			}

			// 2. Perform restoration table by table.
			const congId = currentCongregation?.id;

			// To avoid foreign key constraint errors during delete, we delete in reverse order of dependence,
			// but actually we can just delete from main tables, cascading will handle the rest natively IF set up,
			// but since we don't know the cascade setup, we do it in order:
			if (bd.publicadores?.length > 0) {
				await supabase
					.from("visitas_pastoral")
					.delete()
					.in(
						"publicador_nombre",
						bd.publicadores.map((p: any) => p.nombre),
					);
			}
			await supabase
				.from("informes_ministerio")
				.delete()
				.eq("congregation_id", congId);
			if (bd.grupos?.length > 0) {
				await supabase
					.from("miembros_grupo")
					.delete()
					.in(
						"grupo_id",
						bd.grupos.map((g: any) => g.id),
					);
			}
			await supabase.from("programas").delete().eq("congregation_id", congId);
			await supabase.from("grupos").delete().eq("congregation_id", congId);
			await supabase
				.from("publicadores")
				.delete()
				.eq("congregation_id", congId);

			// Insert old data
			if (bd.publicadores?.length > 0)
				await supabase.from("publicadores").insert(bd.publicadores);
			if (bd.grupos?.length > 0)
				await supabase.from("grupos").insert(bd.grupos);
			if (bd.programas?.length > 0)
				await supabase.from("programas").insert(bd.programas);
			if (bd.miembros_grupo?.length > 0)
				await supabase.from("miembros_grupo").insert(bd.miembros_grupo);
			if (bd.informes_ministerio?.length > 0)
				await supabase
					.from("informes_ministerio")
					.insert(bd.informes_ministerio);
			if (bd.visitas_pastoral?.length > 0)
				await supabase.from("visitas_pastoral").insert(bd.visitas_pastoral);

			setStatusMessage({
				text: "Copia restaurada exitosamente. Recarga la página para ver los cambios.",
				type: "success",
			});
		} catch (error: any) {
			console.error("Restore error", error);
			setStatusMessage({
				text: `Error al restaurar: ${error.message}`,
				type: "error",
			});
		} finally {
			setRestoringId(null);
		}
	};

	const handleSyncToTurso = async () => {
		if (!currentCongregation) return;
		setIsSyncingTurso(true);
		setStatusMessage({
			text: "Sincronizando todas las copias de seguridad de Supabase a Turso...",
			type: "info",
		});
		try {
			const { data: supabaseBackups, error } = await supabase
				.from("respaldos")
				.select("*")
				.eq("congregation_id", currentCongregation.id);

			if (error) {
				if (error.code === "42P01") {
					setStatusMessage({
						text: "La tabla de respaldos no está configurada en Supabase, por lo que no hay copias allí para migrar. A partir de ahora, cada copia de seguridad se guardará directamente en Turso.",
						type: "info",
					});
					return;
				}
				throw error;
			}
			if (!supabaseBackups || supabaseBackups.length === 0) {
				setStatusMessage({
					text: "No hay copias de seguridad en Supabase para sincronizar.",
					type: "info",
				});
				return;
			}

			const { saveBackupToTurso } = await import("../lib/turso");
			let successCount = 0;
			for (const b of supabaseBackups) {
				const ok = await saveBackupToTurso(
					b.id,
					b.congregation_id,
					b.description,
					b.data,
					b.created_at,
				);
				if (ok) successCount++;
			}

			setStatusMessage({
				text: `¡Espejo completado! Sincronizados ${successCount} de ${supabaseBackups.length} respaldos a tu base de datos LibSQL (Turso) de respaldo.`,
				type: "success",
			});
			fetchBackups();
		} catch (err: any) {
			console.error("Sync error:", err);
			setStatusMessage({
				text: `Error al sincronizar: ${err.message}`,
				type: "error",
			});
		} finally {
			setIsSyncingTurso(false);
		}
	};

	// CSV & Excel Handlers
	const handleDownloadTemplate = async () => {
		if (!currentCongregation) return;
		try {
			// Fetch publishers
			const { data: pubs, error } = await supabase
				.from("publicadores")
				.select("nombre")
				.eq("congregation_id", currentCongregation.id)
				.order("nombre", { ascending: true });

			if (error) throw error;

			const selectedMonthFormatted =
				templateMonth || new Date().toISOString().substring(0, 7);

			// Fetch existing reports for this exact month
			const { data: reports, error: rErr } = await supabase
				.from("informes_ministerio")
				.select("publicador_nombre, horas, horas_especiales, estudios, notas")
				.eq("mes", selectedMonthFormatted)
				.eq("congregation_id", currentCongregation.id);

			if (rErr) {
				console.warn("Could not fetch existing reports for template:", rErr);
			}

			const reportsMap = new Map<string, any>();
			if (reports && reports.length > 0) {
				reports.forEach((r: any) => {
					if (r.publicador_nombre) {
						reportsMap.set(r.publicador_nombre.trim().toLowerCase(), r);
					}
				});
			}

			let csvContent =
				"Nombre,Mes (YYYY-MM),Horas,Horas Especiales,Estudios,Notas\n";

			if (pubs && pubs.length > 0) {
				pubs.forEach((p: any) => {
					let escapedName = p.nombre.replace(/"/g, '""');
					if (escapedName.includes(",")) escapedName = `"${escapedName}"`;

					const existingRep = reportsMap.get(p.nombre.trim().toLowerCase());
					const horas = existingRep ? existingRep.horas || 0 : 0;
					const horasEspeciales = existingRep
						? existingRep.horas_especiales || 0
						: 0;
					const estudios = existingRep ? existingRep.estudios || 0 : 0;
					const notas = existingRep ? existingRep.notas || "" : "";
					let escapedNotes = notas.replace(/"/g, '""');
					if (
						escapedNotes.includes(",") ||
						escapedNotes.includes("\n") ||
						escapedNotes.includes("\r")
					) {
						escapedNotes = `"${escapedNotes}"`;
					}

					csvContent += `${escapedName},${selectedMonthFormatted},${horas},${horasEspeciales},${estudios},${escapedNotes}\n`;
				});
			} else {
				csvContent += "Ejemplo Juan Perez,2026-03,15,0,2,Estudio muy activo\n";
				csvContent += "Ejemplo Maria Lopez,2026-03,8,0,0,Auxiliar este mes\n";
			}

			const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
				type: "text/csv;charset=utf-8;",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.setAttribute("href", url);
			link.setAttribute(
				"download",
				`plantilla_informes_${selectedMonthFormatted}.csv`,
			);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (err: any) {
			console.error("Error creating template CSV:", err);
			alert("Error al crear plantilla: " + err.message);
		}
	};

	const handleDownloadPubTemplate = async () => {
		if (!currentCongregation) return;
		try {
			// Fetch publishers
			const { data: pubs, error } = await supabase
				.from("publicadores")
				.select("*")
				.eq("congregation_id", currentCongregation.id)
				.order("nombre", { ascending: true });

			if (error) throw error;

			// Fetch groups to map member roles
			const { data: allGroups } = await supabase
				.from("grupos")
				.select("*")
				.eq("congregation_id", currentCongregation.id);
			const { data: allMembers } = await supabase
				.from("miembros_grupo")
				.select("*")
				.in(
					"grupo_id",
					(allGroups || []).map((g) => g.id),
				);

			const rolesMap = new Map<string, string>();
			if (allMembers) {
				allMembers.forEach((m: any) => {
					rolesMap.set(normalizeName(m.publicador_nombre), m.rol || "");
				});
			}

			let csvContent =
				"Nombre,Nombre Completo,Género,Fecha de Nacimiento,Fecha de Bautismo,Esperanza,Anciano,Siervo Ministerial,Precursor Regular,Precursor Especial,Misionero,Inicio Precursor,Fecha Nombramiento,Dirección,Teléfono Personal,Contacto de Emergencia\n";

			const escapeCSVField = (val: string | null | undefined) => {
				if (!val) return "";
				let str = String(val).replace(/"/g, '""');
				if (
					str.includes(",") ||
					str.includes("\n") ||
					str.includes("\r") ||
					str.includes('"')
				) {
					return `"${str}"`;
				}
				return str;
			};

			if (pubs && pubs.length > 0) {
				pubs.forEach((p: any) => {
					let escapedName = p.nombre.replace(/"/g, '""');
					if (escapedName.includes(",")) escapedName = `"${escapedName}"`;

					let escapedFullName = (p.nombre_completo || "").replace(/"/g, '""');
					if (escapedFullName.includes(",")) escapedFullName = `"${escapedFullName}"`;

					const roleString = rolesMap.get(normalizeName(p.nombre)) || "";

					const genero = p.genero || "";
					const fNac = p.fecha_nacimiento || "";
					const fBau = p.fecha_bautismo || "";
					const esperanza = p.esperanza || "Otras ovejas";
					const anciano = roleString.includes("Anciano") ? "Si" : "No";
					const siervo = roleString.includes("Siervo ministerial")
						? "Si"
						: "No";
					const precReg = roleString.includes("Precursor Regular")
						? "Si"
						: "No";
					const precEsp = roleString.includes("Precursor Especial")
						? "Si"
						: "No";
					const misionero = roleString.includes("Misionero") ? "Si" : "No";
					const iPrec = p.inicio_precursor_mes || "";
					const fNomb = p.fecha_nombramiento || "";

					const direccion = p.direccion || "";
					const telPersonal = p.telefono_personal || "";
					const contEmergencia = p.contacto_emergencia || "";

					const escapedDireccion = escapeCSVField(direccion);
					const escapedTelPersonal = escapeCSVField(telPersonal);
					const escapedContEmergencia = escapeCSVField(contEmergencia);

					csvContent += `${escapedName},${escapedFullName},${genero},${fNac},${fBau},${esperanza},${anciano},${siervo},${precReg},${precEsp},${misionero},${iPrec},${fNomb},${escapedDireccion},${escapedTelPersonal},${escapedContEmergencia}\n`;
				});
			} else {
				csvContent +=
					"Ejemplo Juan Perez,Juan Alberto Perez Quispe,Hombre,1990-05-14,2010-08-20,Otras ovejas,Si,No,Si,No,No,2015-09,2020-01-01,Av. Centenario 450,111222333,Juana Perez: 999888777\n";
			}

			const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
				type: "text/csv;charset=utf-8;",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.setAttribute("href", url);
			link.setAttribute("download", `plantilla_publicadores_s21.csv`);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (err: any) {
			console.error("Error creating pub template CSV:", err);
			alert("Error al crear plantilla: " + err.message);
		}
	};

	const processCSVFile = async (file: File) => {
		if (!currentCongregation) return;
		setSelectedFile(file);
		setImportSuccess(null);
		setParsedRecords([]);

		const reader = new FileReader();
		reader.onload = async (event) => {
			const text = event.target?.result as string;
			if (!text) return;

			try {
				const rawParsed = parseCSV(text);
				if (rawParsed.records.length === 0) {
					setStatusMessage({
						text: "El archivo CSV está vacío o no tiene el formato correcto.",
						type: "error",
					});
					return;
				}

				const { data: dbPubs, error: dbErr } = await supabase
					.from("publicadores")
					.select("nombre")
					.eq("congregation_id", currentCongregation.id);

				if (dbErr) throw dbErr;

				// Set of normalized names in database
				const existingNames = new Set(
					(dbPubs || []).map((p: any) => normalizeName(p.nombre)),
				);
				const dbPubMap = new Map<string, string>(); // normalized -> exact DB name
				(dbPubs || []).forEach((p: any) => {
					dbPubMap.set(normalizeName(p.nombre), p.nombre);
				});

				const mappedRecords: any[] = [];
				const newNamesToCreate = new Set<string>();
				let validCount = 0;
				let invalidCount = 0;
				const parsedMonthsSet = new Set<string>();
				const preMappedRecords: any[] = [];

				rawParsed.records.forEach((rec, idx) => {
					const name = getMappedValue(rec, [
						"publicador_nombre",
						"nombre",
						"publicador",
						"name",
						"publisher",
						"nombre del publicador",
					]);
					const rawMonth = getMappedValue(rec, [
						"mes",
						"mes (yyyy-mm)",
						"month",
						"fecha",
						"date",
						"periodo",
					]);
					const rawHours = getMappedValue(rec, ["horas", "hours", "h"]);
					const rawSpecialHours = getMappedValue(rec, [
						"horas_especiales",
						"horas especiales",
						"special hours",
						"he",
						"horas_esp",
					]);
					const rawStudies = getMappedValue(rec, [
						"estudios",
						"studies",
						"cursos bíblicos",
						"cursos biblicos",
						"cursos",
						"estudios_bíblicos",
						"estudios biblicos",
						"eb",
					]);
					const rawNotes = getMappedValue(rec, [
						"notas",
						"notes",
						"comentarios",
						"comentario",
						"nota",
					]);

					if (!name) {
						return;
					}

					const cleanName = name.trim();
					const cleanMonth = parseMonthToISO(rawMonth);
					if (cleanMonth) {
						parsedMonthsSet.add(cleanMonth);
					}

					const hours =
						rawHours === undefined || rawHours === ""
							? 0
							: parseInt(String(rawHours).replace(/[^\d]/g, "")) || 0;
					const specialHours =
						rawSpecialHours === undefined || rawSpecialHours === ""
							? 0
							: parseInt(String(rawSpecialHours).replace(/[^\d]/g, "")) || 0;
					const studies =
						rawStudies === undefined || rawStudies === ""
							? 0
							: parseInt(String(rawStudies).replace(/[^\d]/g, "")) || 0;
					const notes = rawNotes ? String(rawNotes).trim() : "";

					preMappedRecords.push({
						originalIndex: idx + 2,
						name: cleanName,
						rawMonth: cleanMonth,
						hours,
						specialHours,
						studies,
						notes,
					});
				});

				// Fetch existing reports for these months to compare and warn
				const monthsInCSV = Array.from(parsedMonthsSet);
				const dbReportsMap = new Map<string, any>(); // key: normalizedName|month -> report data

				if (monthsInCSV.length > 0) {
					const { data: dbReports, error: repErr } = await supabase
						.from("informes_ministerio")
						.select(
							"id, publicador_nombre, mes, horas, horas_especiales, estudios, notas",
						)
						.eq("congregation_id", currentCongregation.id)
						.in("mes", monthsInCSV);

					if (!repErr && dbReports) {
						dbReports.forEach((r: any) => {
							const key = `${normalizeName(r.publicador_nombre)}|${r.mes}`;
							dbReportsMap.set(key, r);
						});
					}
				}

				preMappedRecords.forEach((item) => {
					const normalized = normalizeName(item.name);
					let exactDbName = dbPubMap.get(normalized) || item.name;
					let isNew = !existingNames.has(normalized);

					if (isNew && item.name) {
						// Búsqueda difusa de ultra-resistencia: elimina espacios, puntos, guiones, etc.
						const superLoose = (str: string) =>
							normalizeName(str).replace(/[^a-z0-9]/g, "");
						const looseItemName = superLoose(item.name);

						const matchedPub = (dbPubs || []).find(
							(p: any) => superLoose(p.nombre) === looseItemName,
						);
						if (matchedPub) {
							isNew = false;
							exactDbName = matchedPub.nombre;
						}
					}

					if (isNew && item.name) {
						newNamesToCreate.add(item.name);
					}

					const isValid = !!item.name && !!item.rawMonth;
					if (isValid) {
						validCount++;
					} else {
						invalidCount++;
					}

					// Look up existing report
					const key = `${normalized}|${item.rawMonth}`;
					const existingRep = dbReportsMap.get(key);

					let safetyAlert:
						| "none"
						| "identical"
						| "different_overwrite"
						| "risk_blank_overwrite" = "none";
					let dbDetail = null;

					if (existingRep) {
						const isIdentical =
							existingRep.horas === item.hours &&
							existingRep.horas_especiales === item.specialHours &&
							existingRep.estudios === item.studies &&
							(existingRep.notas || "") === item.notes;

						if (isIdentical) {
							safetyAlert = "identical";
						} else {
							// If DB has actual values but CSV is blank (0 hours, 0 studies)
							const isDbActive =
								(existingRep.horas || 0) > 0 || (existingRep.estudios || 0) > 0;
							const isCsvBlank = item.hours === 0 && item.studies === 0;

							if (isDbActive && isCsvBlank) {
								safetyAlert = "risk_blank_overwrite";
							} else {
								safetyAlert = "different_overwrite";
							}

							dbDetail = {
								horas: existingRep.horas || 0,
								horas_especiales: existingRep.horas_especiales || 0,
								estudios: existingRep.estudios || 0,
								notas: existingRep.notas || "",
							};
						}
					}

					mappedRecords.push({
						originalIndex: item.originalIndex,
						name: exactDbName, // use exact match from database
						month: item.rawMonth || "Formato mes inválido",
						hours: item.hours,
						specialHours: item.specialHours,
						studies: item.studies,
						notes: item.notes,
						isNew,
						isValid,
						safetyAlert,
						dbDetail,
					});
				});

				setParsedRecords(mappedRecords);
				setNewPublishersToCreate(Array.from(newNamesToCreate));
				setParseStats({
					total: rawParsed.records.length,
					valid: validCount,
					invalid: invalidCount,
					newPublishersCount: newNamesToCreate.size,
				});
			} catch (err: any) {
				console.error("Error processing CSV file:", err);
				setStatusMessage({
					text: `Error al leer CSV: ${err.message}`,
					type: "error",
				});
			}
		};
		reader.readAsText(file);
	};

	const processPubsCSVFile = async (file: File) => {
		if (!currentCongregation) return;
		setPubSelectedFile(file);
		setPubImportSuccess(null);
		setPubParsedRecords([]);

		const reader = new FileReader();
		reader.onload = async (event) => {
			const text = event.target?.result as string;
			if (!text) return;

			try {
				const rawParsed = parseCSV(text);
				if (rawParsed.records.length === 0) {
					setStatusMessage({
						text: "El archivo CSV está vacío o no tiene el formato correcto.",
						type: "error",
					});
					return;
				}

				const { data: dbPubs, error: dbErr } = await supabase
					.from("publicadores")
					.select("*")
					.eq("congregation_id", currentCongregation.id);

				if (dbErr) throw dbErr;

				// Set of normalized names in database
				const existingNames = new Set(
					(dbPubs || []).map((p: any) => normalizeName(p.nombre)),
				);
				const dbPubMap = new Map<string, string>();
				const dbPubDataMap = new Map<string, any>();
				(dbPubs || []).forEach((p: any) => {
					dbPubMap.set(normalizeName(p.nombre), p.nombre);
					dbPubDataMap.set(normalizeName(p.nombre), p);
				});

				// Also get roles to compare
				const { data: allGroups } = await supabase
					.from("grupos")
					.select("*")
					.eq("congregation_id", currentCongregation.id);
				const { data: allMembers } = await supabase
					.from("miembros_grupo")
					.select("*")
					.in(
						"grupo_id",
						(allGroups || []).map((g) => g.id),
					);
				const dbRolesMap = new Map<string, string>();
				(allMembers || []).forEach((m: any) => {
					dbRolesMap.set(normalizeName(m.publicador_nombre), m.rol || "");
				});

				const mappedRecords: any[] = [];
				const newNamesToCreate = new Set<string>();
				let validCount = 0;
				let invalidCount = 0;

				rawParsed.records.forEach((rec, idx) => {
					const name = getMappedValue(rec, [
						"nombre",
						"publicador_nombre",
						"publicador",
						"name",
						"publisher",
					]);
					const nombreCompleto = getMappedValue(rec, [
						"nombre completo",
						"nombre_completo",
						"nombrecompleto",
						"nombres completos",
						"nombres_completos",
						"nombrescompletos",
						"full name",
						"fullname",
					]) || "";
					const genero = getMappedValue(rec, [
						"género",
						"genero",
						"gender",
						"sexo",
					]);
					const fechaNac = parseDateToYMD(
						getMappedValue(rec, [
							"fecha de nacimiento",
							"fecha nacimiento",
							"nacimiento",
							"birth date",
							"dob",
						]),
					);
					const fechaBau = parseDateToYMD(
						getMappedValue(rec, [
							"fecha de bautismo",
							"fecha bautismo",
							"bautismo",
							"baptism date",
						]),
					);
					const esperanza = getMappedValue(rec, ["esperanza", "hope"]);
					const anciano = getBooleanYesNo(
						getMappedValue(rec, ["anciano", "elder"]),
					);
					const siervo = getBooleanYesNo(
						getMappedValue(rec, [
							"siervo ministerial",
							"siervo",
							"ministerial servant",
						]),
					);
					const precReg = getBooleanYesNo(
						getMappedValue(rec, [
							"precursor regular",
							"regular pioneer",
							"prec reg",
						]),
					);
					const precEsp = getBooleanYesNo(
						getMappedValue(rec, ["precursor especial", "special pioneer"]),
					);
					const misionero = getBooleanYesNo(
						getMappedValue(rec, ["misionero", "missionary"]),
					);
					const fnPrec = parseS21Month(
						getMappedValue(rec, [
							"inicio precursor",
							"inicio de precursor",
							"pioneer start",
						]),
					);
					const inicioPrec = fnPrec || "";

					const fechaNomb = parseDateToYMD(
						getMappedValue(rec, [
							"fecha nombramiento",
							"fecha de nombramiento",
							"nombramiento",
						]),
					);

					const direccion = getMappedValue(rec, [
						"direccion",
						"dirección",
						"address",
						"domicilio",
					]) || "";

					const telefonoPersonal = getMappedValue(rec, [
						"telefono personal",
						"teléfono personal",
						"telefono",
						"teléfono",
						"personal phone",
						"phone",
						"celular",
					]) || "";

					const contactoEmergencia = getMappedValue(rec, [
						"contacto de emergencia",
						"contacto emergencia",
						"emergencia",
						"emergency contact",
						"emergency",
					]) || "";

					if (!name) return;

					const cleanName = name.trim();
					const normalized = normalizeName(cleanName);

					let exactDbName = dbPubMap.get(normalized) || cleanName;
					let isNew = !existingNames.has(normalized);
					if (isNew && cleanName) newNamesToCreate.add(cleanName);

					const isValid = !!cleanName;
					if (isValid) validCount++;
					else invalidCount++;

					let safetyAlert:
						| "none"
						| "identical"
						| "different_overwrite"
						| "risk_blank_overwrite" = "none";
					let dbDetail = null;

					if (!isNew) {
						const existingPub = dbPubDataMap.get(normalized);
						const existingRol = dbRolesMap.get(normalized) || "";

						const isIdentical =
							(existingPub?.nombre_completo || "") === nombreCompleto &&
							(existingPub?.fecha_nacimiento || "") === fechaNac &&
							(existingPub?.fecha_bautismo || "") === fechaBau &&
							(existingPub?.genero || "") === genero &&
							(existingPub?.esperanza || "Otras ovejas") ===
								(esperanza || "Otras ovejas") &&
							(existingPub?.inicio_precursor_mes || "") === inicioPrec &&
							(existingPub?.fecha_nombramiento || "") === fechaNomb &&
							(existingPub?.direccion || "") === direccion &&
							(existingPub?.telefono_personal || "") === telefonoPersonal &&
							(existingPub?.contacto_emergencia || "") === contactoEmergencia &&
							existingRol.includes("Anciano") === anciano &&
							existingRol.includes("Siervo ministerial") === siervo &&
							existingRol.includes("Precursor Regular") === precReg &&
							existingRol.includes("Precursor Especial") === precEsp &&
							existingRol.includes("Misionero") === misionero;

						if (isIdentical) {
							safetyAlert = "identical";
						} else {
							if (
								(existingPub?.fecha_nacimiento ||
									existingPub?.fecha_bautismo) &&
								!fechaNac &&
								!fechaBau
							) {
								safetyAlert = "risk_blank_overwrite";
							} else {
								safetyAlert = "different_overwrite";
							}
						}
					}

					mappedRecords.push({
						originalIndex: idx + 2,
						name: exactDbName,
						nombreCompleto,
						genero,
						fechaNac,
						fechaBau,
						esperanza: esperanza || "Otras ovejas",
						anciano,
						siervo,
						precReg,
						precEsp,
						misionero,
						inicioPrec,
						fechaNomb,
						direccion,
						telefonoPersonal,
						contactoEmergencia,
						isNew,
						isValid,
						safetyAlert,
					});
				});

				setPubParsedRecords(mappedRecords);
				setNewPubsToCreate(Array.from(newNamesToCreate));
				setPubParseStats({
					total: rawParsed.records.length,
					valid: validCount,
					invalid: invalidCount,
					newPublishersCount: newNamesToCreate.size,
				});
			} catch (err: any) {
				console.error("Error processing Pub CSV file:", err);
				setStatusMessage({
					text: `Error al leer CSV: ${err.message}`,
					type: "error",
				});
			}
		};
		reader.readAsText(file);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		processCSVFile(file);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		const file = e.dataTransfer.files?.[0];
		if (file) {
			processCSVFile(file);
		}
	};

	const handleImportConfirm = async () => {
		if (!currentCongregation || parsedRecords.length === 0) return;
		setIsImporting(true);
		setImportProgress({ current: 0, total: parsedRecords.length });

		try {
			let createdPubsCount = 0;
			let successCount = 0;
			let errorCount = 0;
			let skippedCount = 0;

			if (autoCreatePublishers && newPublishersToCreate.length > 0) {
				for (const name of newPublishersToCreate) {
					const { data: existing } = await supabase
						.from("publicadores")
						.select("id")
						.eq("nombre", name)
						.eq("congregation_id", currentCongregation.id)
						.maybeSingle();

					if (!existing) {
						const { error: insErr } = await supabase
							.from("publicadores")
							.insert([
								{
									nombre: name,
									congregation_id: currentCongregation.id,
								},
							]);
						if (!insErr) {
							createdPubsCount++;
						}
					}
				}
			}

			for (let i = 0; i < parsedRecords.length; i++) {
				const row = parsedRecords[i];
				if (!row.isValid) {
					errorCount++;
					continue;
				}

				// Apply safety protection limits
				if (
					safeImportMode === "safe" &&
					row.safetyAlert === "risk_blank_overwrite"
				) {
					skippedCount++;
					continue;
				}

				if (
					safeImportMode === "skip" &&
					(row.safetyAlert === "different_overwrite" ||
						row.safetyAlert === "risk_blank_overwrite")
				) {
					skippedCount++;
					continue;
				}

				try {
					const { data: existingReport, error: fetchErr } = await supabase
						.from("informes_ministerio")
						.select("id")
						.eq("publicador_nombre", row.name)
						.eq("mes", row.month)
						.eq("congregation_id", currentCongregation.id)
						.maybeSingle();

					if (fetchErr) throw fetchErr;

					const reportData = {
						publicador_nombre: row.name,
						mes: row.month,
						horas: row.hours,
						horas_especiales: row.specialHours,
						estudios: row.studies,
						notas: row.notes,
						congregation_id: currentCongregation.id,
					};

					let query;
					if (existingReport) {
						query = supabase
							.from("informes_ministerio")
							.update(reportData)
							.eq("id", existingReport.id);
					} else {
						query = supabase.from("informes_ministerio").insert([reportData]);
					}

					const { error: saveErr } = await query;
					if (saveErr) throw saveErr;

					successCount++;
				} catch (rowErr) {
					console.error(`Error importing row ${row.originalIndex}:`, rowErr);
					errorCount++;
				}

				setImportProgress({ current: i + 1, total: parsedRecords.length });
			}

			let msg = `¡Importación completada! Se procesaron ${parsedRecords.length} filas: ${successCount} guardadas con éxito.`;
			if (skippedCount > 0) {
				msg += ` Se omitieron ${skippedCount} informes para proteger tus datos de la base de datos de ser borrados/sobreescritos.`;
			}
			if (createdPubsCount > 0) {
				msg += ` Se crearon ${createdPubsCount} nuevos publicadores asignados a la congregación.`;
			}
			if (errorCount > 0) {
				msg += ` Se encontraron ${errorCount} errores.`;
			}

			setImportSuccess(msg);
			setParsedRecords([]);
			setSelectedFile(null);
		} catch (err: any) {
			console.error("Error during batch import:", err);
			setStatusMessage({
				text: `Error en importación total: ${err.message}`,
				type: "error",
			});
		} finally {
			setIsImporting(false);
		}
	};

	const handleImportPubsConfirm = async () => {
		if (!currentCongregation || pubParsedRecords.length === 0) return;

		setPubIsImporting(true);
		setPubImportProgress({ current: 0, total: pubParsedRecords.length });

		let successCount = 0;
		let createdPubsCount = 0;
		let errorCount = 0;
		let skippedCount = 0;

		try {
			// Check newly created Publishers
			if (newPubsToCreate.length > 0) {
				for (const name of newPubsToCreate) {
					const { data: existing } = await supabase
						.from("publicadores")
						.select("id")
						.eq("nombre", name)
						.eq("congregation_id", currentCongregation.id)
						.maybeSingle();

					if (!existing) {
						const correspondingRecord = pubParsedRecords.find(
							(r) => r.name.trim().toLowerCase() === name.trim().toLowerCase()
						);
						const nombreCompletoVal = correspondingRecord?.nombreCompleto || null;

						const { error: insErr } = await supabase
							.from("publicadores")
							.insert([
								{
									nombre: name,
									nombre_completo: nombreCompletoVal,
									congregation_id: currentCongregation.id,
								},
							]);
						if (!insErr) {
							createdPubsCount++;
						}
					}
				}
			}

			// Get groups to fetch roles correctly later
			const { data: allGroups } = await supabase
				.from("grupos")
				.select("*")
				.eq("congregation_id", currentCongregation.id);
			const { data: allMembers } = await supabase
				.from("miembros_grupo")
				.select("*")
				.in(
					"grupo_id",
					(allGroups || []).map((g) => g.id),
				);
			const dbRolesMap = new Map<string, any>();
			(allMembers || []).forEach((m: any) => {
				dbRolesMap.set(normalizeName(m.publicador_nombre), m);
			});

			for (let i = 0; i < pubParsedRecords.length; i++) {
				const row = pubParsedRecords[i];
				if (!row.isValid) {
					errorCount++;
					continue;
				}

				if (
					pubSafeImportMode === "safe" &&
					row.safetyAlert === "risk_blank_overwrite"
				) {
					skippedCount++;
					continue;
				}

				if (
					pubSafeImportMode === "skip" &&
					(row.safetyAlert === "different_overwrite" ||
						row.safetyAlert === "risk_blank_overwrite")
				) {
					skippedCount++;
					continue;
				}

				try {
					// Prepare Publicadores update object
					const updateObj: any = {};
					if (row.genero && row.genero.trim() !== "")
						updateObj.genero = row.genero;
					if (row.nombreCompleto && row.nombreCompleto.trim() !== "")
						updateObj.nombre_completo = row.nombreCompleto;
					if (row.fechaNac && row.fechaNac.trim() !== "")
						updateObj.fecha_nacimiento = row.fechaNac;
					if (row.fechaBau && row.fechaBau.trim() !== "")
						updateObj.fecha_bautismo = row.fechaBau;
					if (row.esperanza && row.esperanza.trim() !== "")
						updateObj.esperanza = row.esperanza;
					if (row.inicioPrec && row.inicioPrec.trim() !== "")
						updateObj.inicio_precursor_mes = row.inicioPrec;
					if (row.fechaNomb && row.fechaNomb.trim() !== "")
						updateObj.fecha_nombramiento = row.fechaNomb;

					if (row.direccion !== undefined)
						updateObj.direccion = row.direccion;
					if (row.telefonoPersonal !== undefined)
						updateObj.telefono_personal = row.telefonoPersonal;
					if (row.contactoEmergencia !== undefined)
						updateObj.contacto_emergencia = row.contactoEmergencia;

					if (pubSafeImportMode === "overwrite") {
						// Include blanks if overwriting completely
						if (row.nombreCompleto === "") updateObj.nombre_completo = null;
						if (row.fechaNac === "") updateObj.fecha_nacimiento = null;
						if (row.fechaBau === "") updateObj.fecha_bautismo = null;
						if (row.inicioPrec === "") updateObj.inicio_precursor_mes = null;
						if (row.fechaNomb === "") updateObj.fecha_nombramiento = null;
						if (row.direccion === "") updateObj.direccion = null;
						if (row.telefonoPersonal === "") updateObj.telefono_personal = null;
						if (row.contactoEmergencia === "") updateObj.contacto_emergencia = null;
					}

					if (Object.keys(updateObj).length > 0) {
						await supabase
							.from("publicadores")
							.update(updateObj)
							.eq("nombre", row.name)
							.eq("congregation_id", currentCongregation.id);
					}

					// Prepare Roles update
					const currentMemberRow = dbRolesMap.get(normalizeName(row.name));
					if (currentMemberRow) {
						let rolesArr = (currentMemberRow.rol || "")
							.split(",")
							.map((r: string) => r.trim())
							.filter((r: string) => r);

						if (pubSafeImportMode === "overwrite") {
							rolesArr = rolesArr.filter(
								(r: string) =>
									![
										"Anciano",
										"Siervo ministerial",
										"Precursor Regular",
										"Precursor Especial",
										"Misionero",
									].includes(r),
							);
							if (row.anciano) rolesArr.push("Anciano");
							if (row.siervo) rolesArr.push("Siervo ministerial");
							if (row.precReg) rolesArr.push("Precursor Regular");
							if (row.precEsp) rolesArr.push("Precursor Especial");
							if (row.misionero) rolesArr.push("Misionero");
						} else {
							// safe or skip mode - just add missing, do NOT remove
							if (row.anciano && !rolesArr.includes("Anciano"))
								rolesArr.push("Anciano");
							if (row.siervo && !rolesArr.includes("Siervo ministerial"))
								rolesArr.push("Siervo ministerial");
							if (row.precReg && !rolesArr.includes("Precursor Regular"))
								rolesArr.push("Precursor Regular");
							if (row.precEsp && !rolesArr.includes("Precursor Especial"))
								rolesArr.push("Precursor Especial");
							if (row.misionero && !rolesArr.includes("Misionero"))
								rolesArr.push("Misionero");
						}

						const newRoleStr = rolesArr.join(", ");
						if (newRoleStr !== (currentMemberRow.rol || "")) {
							await supabase
								.from("miembros_grupo")
								.update({ rol: newRoleStr })
								.eq("id", currentMemberRow.id);
						}
					}

					successCount++;
				} catch (rowErr) {
					console.error(`Error importing row ${row.originalIndex}:`, rowErr);
					errorCount++;
				}

				setPubImportProgress({
					current: i + 1,
					total: pubParsedRecords.length,
				});
			}

			let msg = `¡Importación completada! Se procesaron ${pubParsedRecords.length} registros: ${successCount} actualizados con éxito.`;
			if (skippedCount > 0) {
				msg += ` Se omitieron ${skippedCount} actualizaciones por seguridad.`;
			}
			if (createdPubsCount > 0) {
				msg += ` Se crearon ${createdPubsCount} nuevos publicadores asignados a la congregación.`;
			}
			if (errorCount > 0) {
				msg += ` Se encontraron ${errorCount} errores.`;
			}

			setPubImportSuccess(msg);
			setPubParsedRecords([]);
			setPubSelectedFile(null);
		} catch (err: any) {
			console.error("Error during batch import:", err);
			setStatusMessage({
				text: `Error en importación total: ${err.message}`,
				type: "error",
			});
		} finally {
			setPubIsImporting(false);
		}
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<h1
				style={{
					fontSize: "1.8rem",
					fontWeight: "800",
					textAlign: "center",
					marginBottom: "1.5rem",
					color: "var(--primary-color)",
				}}
			>
				Gestión de Copias de Seguridad
			</h1>

			{statusMessage && (
				<div
					style={{
						padding: "12px",
						borderRadius: "8px",
						marginBottom: "1rem",
						textAlign: "center",
						backgroundColor:
							statusMessage.type === "success"
								? "#d1fae5"
								: statusMessage.type === "error"
									? "#fee2e2"
									: "#e0f2fe",
						color:
							statusMessage.type === "success"
								? "#065f46"
								: statusMessage.type === "error"
									? "#991b1b"
									: "#0369a1",
						fontWeight: "bold",
					}}
				>
					{statusMessage.text}
				</div>
			)}

			{!isReadOnly && (
				<div
					style={{
						display: "flex",
						gap: "15px",
						justifyContent: "center",
						marginBottom: "2rem",
					}}
				>
					<button
						onClick={handleCreateBackup}
						style={{
							padding: "10px 20px",
							backgroundColor: "white",
							color: "#10b981",
							border: "2px solid #10b981",
							borderRadius: "8px",
							fontWeight: "bold",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<i className="fas fa-cloud-upload-alt"></i> Crear Copia en la Nube
					</button>

					<button
						onClick={handleDownloadCurrent}
						style={{
							padding: "10px 20px",
							backgroundColor: "white",
							color: "#3b82f6",
							border: "2px solid #3b82f6",
							borderRadius: "8px",
							fontWeight: "bold",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<i className="fas fa-file-download"></i> Descargar Datos Actuales
					</button>

					<button
						onClick={handleShareCurrent}
						style={{
							padding: "10px 20px",
							backgroundColor: "white",
							color: "#8b5cf6",
							border: "2px solid #8b5cf6",
							borderRadius: "8px",
							fontWeight: "bold",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<i className="fas fa-share-alt"></i> Compartir (Drive/Correo)
					</button>
				</div>
			)}

			{/* Sección de estado de Base de Datos Espejo Turso */}
			<div
				style={{
					backgroundColor: "#eff6ff",
					border: "1px solid #bfdbfe",
					borderRadius: "12px",
					padding: "20px",
					marginBottom: "2rem",
					display: "flex",
					flexDirection: "column",
					gap: "15px",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "12px",
						flexWrap: "wrap",
						justifyContent: "space-between",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<div
							style={{
								backgroundColor: "#3b82f6",
								color: "white",
								borderRadius: "50%",
								width: "40px",
								height: "40px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "1.2rem",
							}}
						>
							<i className="fas fa-shield-alt"></i>
						</div>
						<div>
							<h2
								style={{
									fontSize: "1.1rem",
									margin: 0,
									fontWeight: "bold",
									color: "#1e3a8a",
								}}
							>
								Respaldo Espejo en Base de Datos Turso LibSQL
							</h2>
							<p
								style={{
									margin: "2px 0 0 0",
									fontSize: "0.85rem",
									color: "#1e40af",
								}}
							>
								Estado del Dispositivo:{" "}
								<strong style={{ color: "#15803d" }}>
									● OPERATIVO Y ACTIVO
								</strong>
							</p>
						</div>
					</div>

					{!isReadOnly && (
						<button
							onClick={handleSyncToTurso}
							disabled={isSyncingTurso || loading}
							style={{
								padding: "10px 16px",
								backgroundColor: isSyncingTurso ? "#cbd5e1" : "#3b82f6",
								color: "white",
								border: "none",
								borderRadius: "8px",
								fontWeight: "bold",
								cursor: isSyncingTurso ? "not-allowed" : "pointer",
								display: "flex",
								alignItems: "center",
								gap: "8px",
								transition: "background-color 0.2s",
								boxShadow: "0 2px 4px rgba(59,130,246,0.2)",
							}}
						>
							<i
								className={`fas ${isSyncingTurso ? "fa-spinner fa-spin" : "fa-sync-alt"}`}
							></i>
							{isSyncingTurso
								? "Sincronizando..."
								: "Sincronizar Historial a Turso"}
						</button>
					)}
				</div>

				<div
					style={{
						backgroundColor: "white",
						borderRadius: "8px",
						padding: "12px 16px",
						border: "1px solid #dbeafe",
						fontSize: "0.8rem",
						fontFamily: "monospace",
						color: "#475569",
						display: "flex",
						flexDirection: "column",
						gap: "4px",
					}}
				>
					<div>
						<strong>Dirección URL LibSQL:</strong>{" "}
						libsql://congregacion-15-de-julio-15dejulio.aws-us-east-1.turso.io
					</div>
					<div>
						<strong>Clave API Token:</strong>{" "}
						eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...kp_b_ [Configurada en código]
					</div>
					<div
						style={{
							borderTop: "1px solid #f1f5f9",
							marginTop: "6px",
							paddingTop: "6px",
							color: "#1e40af",
							fontFamily:
								'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
						}}
					>
						💡 <strong>¿Cómo funciona el espejo?</strong> Cada vez que creas una
						"Copia en la Nube", el sistema guarda automáticamente una copia en
						Supabase y de manera simultánea replica un respaldo espejo idéntico
						en tu base de datos de Turso. Si llegas a necesitarlo, puedes
						restaurar directamente desde cualquiera de las dos nubes.
					</div>
				</div>
			</div>

			{/* Dos Columnas de Historial */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
				{/* PANEL SUPABASE */}
				<div
					style={{
						backgroundColor: "white",
						borderRadius: "12px",
						padding: "20px",
						boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
						border: "1px solid #e5e7eb",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "1rem",
							borderBottom: "2px solid #10b981",
							paddingBottom: "8px",
						}}
					>
						<h2
							style={{
								fontSize: "1.05rem",
								fontWeight: "bold",
								color: "#065f46",
								display: "flex",
								alignItems: "center",
								gap: "8px",
								margin: 0,
							}}
						>
							<i className="fas fa-cloud" style={{ color: "#10b981" }}></i>{" "}
							Historial en Supabase (Nube Principal)
						</h2>
						<span
							style={{
								fontSize: "0.75rem",
								backgroundColor: "#d1fae5",
								color: "#065f46",
								padding: "2px 8px",
								borderRadius: "12px",
								fontWeight: "bold",
							}}
						>
							{backups.length} Copias
						</span>
					</div>

					{loading ? (
						<p
							style={{ textAlign: "center", color: "#6b7280", padding: "20px" }}
						>
							Cargando copias...
						</p>
					) : backups.length === 0 ? (
						<div
							style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}
						>
							<i
								className="fas fa-box-open"
								style={{
									fontSize: "2rem",
									color: "#cbd5e1",
									marginBottom: "10px",
									display: "block",
								}}
							></i>
							Sin copias en Supabase.
						</div>
					) : (
						<ul
							style={{
								listStyle: "none",
								padding: 0,
								margin: 0,
								maxHeight: "420px",
								overflowY: "auto",
							}}
						>
							{backups.map((backup, idx) => (
								<li
									key={backup.id || `backup-${idx}`}
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										padding: "12px 8px",
										borderBottom: "1px solid #f3f4f6",
										gap: "10px",
									}}
								>
									<div style={{ flex: 1, minWidth: 0 }}>
										<h3
											style={{
												margin: "0 0 3px 0",
												fontSize: "0.9rem",
												color: "#374151",
												textOverflow: "ellipsis",
												overflow: "hidden",
												whiteSpace: "nowrap",
											}}
											title={backup.description}
										>
											{backup.description}
										</h3>
										<div
											style={{
												fontSize: "0.75rem",
												color: "#6b7280",
												display: "flex",
												alignItems: "center",
												gap: "4px",
											}}
										>
											<i className="far fa-clock"></i>{" "}
											{new Date(backup.created_at).toLocaleString()}
										</div>
									</div>
									<div style={{ display: "flex", gap: "6px" }}>
										{!isReadOnly && (
											<>
												<button
													onClick={() =>
														handleRestoreBackup(backup.id, "supabase")
													}
													disabled={restoringId !== null}
													style={{
														padding: "6px 10px",
														backgroundColor:
															restoringId === backup.id ? "#9ca3af" : "#10b981",
														color: "white",
														border: "none",
														borderRadius: "6px",
														cursor: restoringId ? "not-allowed" : "pointer",
														fontWeight: "bold",
														fontSize: "0.75rem",
														display: "flex",
														alignItems: "center",
														gap: "4px",
													}}
												>
													<i className="fas fa-history"></i> Restaurar
												</button>
												<button
													onClick={() =>
														handleDeleteBackup(backup.id, "supabase")
													}
													disabled={restoringId !== null}
													style={{
														padding: "6px 8px",
														backgroundColor: "white",
														color: "#ef4444",
														border: "1px solid #ef4444",
														borderRadius: "6px",
														cursor: restoringId ? "not-allowed" : "pointer",
														fontSize: "0.75rem",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
													}}
												>
													<i className="fas fa-trash"></i>
												</button>
											</>
										)}
									</div>
								</li>
							))}
						</ul>
					)}
				</div>

				{/* PANEL TURSO */}
				<div
					style={{
						backgroundColor: "white",
						borderRadius: "12px",
						padding: "20px",
						boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
						border: "1px solid #e5e7eb",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "1rem",
							borderBottom: "2px solid #3b82f6",
							paddingBottom: "8px",
						}}
					>
						<h2
							style={{
								fontSize: "1.05rem",
								fontWeight: "bold",
								color: "#1e3a8a",
								display: "flex",
								alignItems: "center",
								gap: "8px",
								margin: 0,
							}}
						>
							<i className="fas fa-server" style={{ color: "#3b82f6" }}></i>{" "}
							Espejo en Turso (Nube de Respaldo)
						</h2>
						<span
							style={{
								fontSize: "0.75rem",
								backgroundColor: "#dbeafe",
								color: "#1e40af",
								padding: "2px 8px",
								borderRadius: "12px",
								fontWeight: "bold",
							}}
						>
							{tursoBackups.length} Copias
						</span>
					</div>

					{loading ? (
						<p
							style={{ textAlign: "center", color: "#6b7280", padding: "20px" }}
						>
							Cargando copias espejo...
						</p>
					) : tursoStatus === "error" ? (
						<div
							style={{
								textAlign: "center",
								padding: "2rem",
								color: "#ef4444",
								fontSize: "0.85rem",
							}}
						>
							<i
								className="fas fa-exclamation-triangle"
								style={{
									fontSize: "2rem",
									color: "#ef4444",
									marginBottom: "10px",
									display: "block",
								}}
							></i>
							Fallo al conectar con Turso LibSQL. Confirma las credenciales.
						</div>
					) : tursoBackups.length === 0 ? (
						<div
							style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}
						>
							<i
								className="fas fa-folder-open"
								style={{
									fontSize: "2rem",
									color: "#cbd5e1",
									marginBottom: "10px",
									display: "block",
								}}
							></i>
							No hay copias guardadas en Turso.
							<br />
							<button
								onClick={handleSyncToTurso}
								disabled={isSyncingTurso}
								style={{
									marginTop: "10px",
									padding: "6px 12px",
									backgroundColor: "#eff6ff",
									border: "1px solid #bfdbfe",
									color: "#2563eb",
									borderRadius: "6px",
									fontWeight: "bold",
									fontSize: "0.8rem",
									cursor: "pointer",
								}}
							>
								Sincronizar espejo ahora ⚡
							</button>
						</div>
					) : (
						<ul
							style={{
								listStyle: "none",
								padding: 0,
								margin: 0,
								maxHeight: "420px",
								overflowY: "auto",
							}}
						>
							{tursoBackups.map((bk, idx) => (
								<li
									key={bk.id || `turso-backup-${idx}`}
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										padding: "12px 8px",
										borderBottom: "1px solid #f3f4f6",
										gap: "10px",
									}}
								>
									<div style={{ flex: 1, minWidth: 0 }}>
										<h3
											style={{
												margin: "0 0 3px 0",
												fontSize: "0.9rem",
												color: "#374151",
												textOverflow: "ellipsis",
												overflow: "hidden",
												whiteSpace: "nowrap",
											}}
											title={bk.description}
										>
											{bk.description}
										</h3>
										<div
											style={{
												fontSize: "0.75rem",
												color: "#6b7280",
												display: "flex",
												alignItems: "center",
												gap: "4px",
											}}
										>
											<i className="far fa-clock"></i>{" "}
											{new Date(bk.created_at).toLocaleString()}
										</div>
									</div>
									<div style={{ display: "flex", gap: "6px" }}>
										{!isReadOnly && (
											<>
												<button
													onClick={() => handleRestoreBackup(bk.id, "turso")}
													disabled={restoringId !== null}
													style={{
														padding: "6px 10px",
														backgroundColor:
															restoringId === bk.id ? "#9ca3af" : "#2563eb",
														color: "white",
														border: "none",
														borderRadius: "6px",
														cursor: restoringId ? "not-allowed" : "pointer",
														fontWeight: "bold",
														fontSize: "0.75rem",
														display: "flex",
														alignItems: "center",
														gap: "4px",
													}}
												>
													<i className="fas fa-history"></i> Restaurar
												</button>
												<button
													onClick={() => handleDeleteBackup(bk.id, "turso")}
													disabled={restoringId !== null}
													style={{
														padding: "6px 8px",
														backgroundColor: "white",
														color: "#ef4444",
														border: "1px solid #ef4444",
														borderRadius: "6px",
														cursor: restoringId ? "not-allowed" : "pointer",
														fontSize: "0.75rem",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
													}}
												>
													<i className="fas fa-trash"></i>
												</button>
											</>
										)}
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			{/* Nueva sección: Importación y Exportación Masiva (Excel/CSV) */}
			<div
				style={{
					marginTop: "2rem",
					backgroundColor: "white",
					borderRadius: "12px",
					padding: "24px",
					boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						borderBottom: "1px solid #e5e7eb",
						paddingBottom: "12px",
						marginBottom: "1.5rem",
						flexWrap: "wrap",
						gap: "10px",
					}}
				>
					<h2
						style={{
							fontSize: "1.25rem",
							fontWeight: "800",
							color: "var(--primary-color)",
							display: "flex",
							alignItems: "center",
							gap: "10px",
							margin: 0,
						}}
					>
						<i className="fas fa-file-excel" style={{ color: "#10b981" }}></i>{" "}
						Importación y Exportación Masiva (Excel / CSV)
					</h2>
					<div style={{ display: "flex", gap: "10px" }}>
						<div
							style={{
								display: "flex",
								backgroundColor: "#f1f5f9",
								borderRadius: "8px",
								padding: "4px",
							}}
						>
							<button
								onClick={() => setActiveImportTab("reports")}
								style={{
									padding: "6px 12px",
									backgroundColor:
										activeImportTab === "reports" ? "white" : "transparent",
									color: activeImportTab === "reports" ? "#3b82f6" : "#64748b",
									border: "none",
									borderRadius: "6px",
									fontWeight: activeImportTab === "reports" ? "bold" : "normal",
									fontSize: "0.85rem",
									cursor: "pointer",
									boxShadow:
										activeImportTab === "reports"
											? "0 1px 3px rgba(0,0,0,0.1)"
											: "none",
								}}
							>
								<i
									className="fas fa-file-invoice"
									style={{ marginRight: "6px" }}
								></i>{" "}
								Informes
							</button>
							<button
								onClick={() => setActiveImportTab("publishers")}
								style={{
									padding: "6px 12px",
									backgroundColor:
										activeImportTab === "publishers" ? "white" : "transparent",
									color:
										activeImportTab === "publishers" ? "#3b82f6" : "#64748b",
									border: "none",
									borderRadius: "6px",
									fontWeight:
										activeImportTab === "publishers" ? "bold" : "normal",
									fontSize: "0.85rem",
									cursor: "pointer",
									boxShadow:
										activeImportTab === "publishers"
											? "0 1px 3px rgba(0,0,0,0.1)"
											: "none",
								}}
							>
								<i className="fas fa-users" style={{ marginRight: "6px" }}></i>{" "}
								Publicadores (S-21)
							</button>
						</div>
						<button
							onClick={() => setShowDocs(!showDocs)}
							style={{
								padding: "6px 12px",
								backgroundColor: "#f1f5f9",
								color: "#475569",
								border: "1px solid #cbd5e1",
								borderRadius: "6px",
								fontWeight: "600",
								fontSize: "0.85rem",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<i
								className={`fas ${showDocs ? "fa-chevron-up" : "fa-question-circle"}`}
							></i>{" "}
							{showDocs ? "Ocultar Instrucciones" : "Instrucciones"}
						</button>
					</div>
				</div>

				{activeImportTab === "reports" && (
					<>
						{showDocs && (
							<div
								style={{
									backgroundColor: "#f0fdf4",
									border: "1px solid #bbf7d0",
									borderRadius: "8px",
									padding: "16px",
									marginBottom: "1.5rem",
									color: "#166534",
									fontSize: "0.9rem",
									lineHeight: "1.5",
								}}
							>
								<h4
									style={{
										fontWeight: "bold",
										margin: "0 0 8px 0",
										fontSize: "0.95rem",
										display: "flex",
										alignItems: "center",
										gap: "6px",
									}}
								>
									<i className="fas fa-lightbulb"></i> Instrucciones especiales
									para pasar más de 100 archivos Excel:
								</h4>
								<ol style={{ paddingLeft: "20px", margin: 0 }}>
									<li style={{ marginBottom: "6px" }}>
										<strong>Conversión rápida a CSV:</strong> Abre cada archivo
										Excel, haz clic en <em>Archivo → Guardar como</em>, y
										selecciona el tipo{" "}
										<strong>CSV (delimitado por comas) (*.csv)</strong>.
									</li>
									<li style={{ marginBottom: "6px" }}>
										<strong>Columnas admitidas sencillas:</strong> El sistema es
										inteligente y detectará automáticamente las columnas. Solo
										necesitas columnas llamadas:
										<span
											style={{
												fontFamily: "monospace",
												backgroundColor: "#e2f0d9",
												padding: "2px 4px",
												borderRadius: "3px",
												margin: "0 4px",
											}}
										>
											Nombre
										</span>
										,
										<span
											style={{
												fontFamily: "monospace",
												backgroundColor: "#e2f0d9",
												padding: "2px 4px",
												borderRadius: "3px",
												margin: "0 4px",
											}}
										>
											Mes
										</span>
										,
										<span
											style={{
												fontFamily: "monospace",
												backgroundColor: "#e2f0d9",
												padding: "2px 4px",
												borderRadius: "3px",
												margin: "0 4px",
											}}
										>
											Horas
										</span>
										,
										<span
											style={{
												fontFamily: "monospace",
												backgroundColor: "#e2f0d9",
												padding: "2px 4px",
												borderRadius: "3px",
												margin: "0 4px",
											}}
										>
											Horas Especiales
										</span>
										,
										<span
											style={{
												fontFamily: "monospace",
												backgroundColor: "#e2f0d9",
												padding: "2px 4px",
												borderRadius: "3px",
												margin: "0 4px",
											}}
										>
											Estudios
										</span>{" "}
										y
										<span
											style={{
												fontFamily: "monospace",
												backgroundColor: "#e2f0d9",
												padding: "2px 4px",
												borderRadius: "3px",
												margin: "0 4px",
											}}
										>
											Notas
										</span>
										.
									</li>
									<li style={{ marginBottom: "6px" }}>
										<strong>Formato de Mes Flexible:</strong> Puedes escribir el
										mes en el formato{" "}
										<code
											style={{
												backgroundColor: "#e2f0d9",
												padding: "2px 4px",
												borderRadius: "3px",
											}}
										>
											AAAA-MM
										</code>{" "}
										(ej. 2026-03), o simplemente escribirlo en español, como{" "}
										<code
											style={{
												backgroundColor: "#e2f0d9",
												padding: "2px 4px",
												borderRadius: "3px",
											}}
										>
											Marzo 2026
										</code>{" "}
										o{" "}
										<code
											style={{
												backgroundColor: "#e2f0d9",
												padding: "2px 4px",
												borderRadius: "3px",
											}}
										>
											03/2026
										</code>
										. El sistema lo convertirá automáticamente.
									</li>
									<li style={{ marginBottom: "6px" }}>
										<strong>Carga inteligente de publicadores nuevos:</strong>{" "}
										Si activas la casilla "Crear publicadores automáticamente",
										no necesitas darlos de alta antes; el sistema los registrará
										por ti al importar los informes.
									</li>
									<li style={{ marginBottom: "6px" }}>
										<strong>Archivos Multi-Mes:</strong> En lugar de importar
										100 archivos uno a uno, puedes copiar y consolidar tus datos
										en un solo archivo CSV maestro con los datos de todos los
										meses de cada publicador, y cargarlo todo de una sola vez.
									</li>
								</ol>
							</div>
						)}

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div
								style={{
									border: "1px solid #e2e8f0",
									borderRadius: "8px",
									padding: "16px",
									display: "flex",
									flexDirection: "column",
									justifyContent: "space-between",
								}}
							>
								<div>
									<h3
										style={{
											margin: "0 0 10px 0",
											fontSize: "1rem",
											fontWeight: "bold",
											color: "#334155",
											display: "flex",
											alignItems: "center",
											gap: "6px",
										}}
									>
										<i
											className="fas fa-download"
											style={{ color: "#3b82f6" }}
										></i>{" "}
										1. Descargar Datos y Plantilla del Mes
									</h3>
									<p
										style={{
											fontSize: "0.85rem",
											color: "#64748b",
											margin: "0 0 16px 0",
											lineHeight: "1.4",
										}}
									>
										Descarga un archivo CSV pre-rellenado con los nombres de
										todos los publicadores registrados actualmente y las
										horas/datos que ya tengan guardados en este mes. Así puedes
										editar los datos actuales en Excel y volverlos a cargar.
									</p>
									<div style={{ marginBottom: "16px" }}>
										<label
											style={{
												display: "block",
												fontSize: "0.8rem",
												fontWeight: "bold",
												color: "#475569",
												marginBottom: "6px",
											}}
										>
											Selecciona el Mes para la plantilla:
										</label>
										<input
											type="month"
											value={templateMonth}
											onChange={(e) => setTemplateMonth(e.target.value)}
											style={{
												padding: "8px",
												borderRadius: "6px",
												border: "1px solid #cbd5e1",
												fontSize: "0.9rem",
												width: "100%",
												maxWidth: "200px",
												color: "#334155",
											}}
										/>
									</div>
								</div>
								<button
									onClick={handleDownloadTemplate}
									style={{
										padding: "10px 16px",
										backgroundColor: "#f0f9ff",
										color: "#0284c7",
										border: "2px solid #0284c7",
										borderRadius: "8px",
										fontWeight: "bold",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "8px",
										transition: "all 0.2s",
										width: "100%",
									}}
								>
									<i className="fas fa-file-csv"></i> Descargar Plantilla
									Prefiltrada
								</button>
							</div>

							<div
								style={{
									border: "1px solid #e2e8f0",
									borderRadius: "8px",
									padding: "16px",
									display: "flex",
									flexDirection: "column",
									justifyContent: "space-between",
								}}
							>
								<div>
									<h3
										style={{
											margin: "0 0 10px 0",
											fontSize: "1rem",
											fontWeight: "bold",
											color: "#334155",
											display: "flex",
											alignItems: "center",
											gap: "6px",
										}}
									>
										<i
											className="fas fa-upload"
											style={{ color: "#10b981" }}
										></i>{" "}
										2. Cargar Archivo de Informes (CSV)
									</h3>
									<p
										style={{
											fontSize: "0.85rem",
											color: "#64748b",
											margin: "0 0 16px 0",
											lineHeight: "1.4",
										}}
									>
										Selecciona o arrastra el archivo CSV guardado desde Excel.
										Podrás ver una previsualización de los datos leídos antes de
										guardarlos de forma permanente en la base de datos.
									</p>

									<div
										onDragOver={handleDragOver}
										onDrop={handleDrop}
										style={{
											border: "2px dashed #cbd5e1",
											borderRadius: "8px",
											padding: "20px",
											textAlign: "center",
											backgroundColor: "#f8fafc",
											cursor: "pointer",
											marginBottom: "16px",
											transition: "border-color 0.2s",
											position: "relative",
										}}
										onClick={() =>
											document.getElementById("csv-file-input")?.click()
										}
									>
										<input
											id="csv-file-input"
											type="file"
											accept=".csv"
											onChange={handleFileChange}
											style={{ display: "none" }}
										/>
										<i
											className="fas fa-file-excel"
											style={{
												fontSize: "2rem",
												color: "#94a3b8",
												marginBottom: "8px",
											}}
										></i>
										<p
											style={{
												margin: "0",
												fontSize: "0.9rem",
												fontWeight: "600",
												color: "#475569",
											}}
										>
											{selectedFile
												? selectedFile.name
												: "Arrastra tu CSV aquí o haz clic para buscar"}
										</p>
										<p
											style={{
												margin: "4px 0 0 0",
												fontSize: "0.75rem",
												color: "#94a3b8",
											}}
										>
											Solo archivos .csv guardados desde Excel
										</p>
									</div>

									<label
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											fontSize: "0.85rem",
											color: "#334155",
											cursor: "pointer",
											userSelect: "none",
											marginBottom: "16px",
										}}
									>
										<input
											type="checkbox"
											checked={autoCreatePublishers}
											onChange={(e) =>
												setAutoCreatePublishers(e.target.checked)
											}
											style={{ accentColor: "#10b981" }}
										/>
										<strong>Crear publicadores automáticamente</strong> si no
										están registrados
									</label>
								</div>
							</div>
						</div>

						{importSuccess && (
							<div
								style={{
									marginTop: "1.5rem",
									padding: "12px",
									borderRadius: "8px",
									backgroundColor: "#d1fae5",
									color: "#065f46",
									fontWeight: "bold",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
							>
								<i className="fas fa-check-circle"></i>
								<span>{importSuccess}</span>
							</div>
						)}

						{parsedRecords.length > 0 && parseStats && (
							<div
								style={{
									marginTop: "1.5rem",
									borderTop: "1px solid #e5e7eb",
									paddingTop: "1.5rem",
								}}
							>
								<h4
									style={{
										margin: "0 0 12px 0",
										fontSize: "1rem",
										fontWeight: "bold",
										color: "#1e293b",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										flexWrap: "wrap",
										gap: "10px",
									}}
								>
									<span>
										Previsualización de Datos ({parseStats.valid} listos de{" "}
										{parseStats.total} totales)
									</span>
									<span
										style={{
											fontSize: "0.8rem",
											fontWeight: "normal",
											backgroundColor: "#f1f5f9",
											color: "#475569",
											padding: "4px 8px",
											borderRadius: "4px",
										}}
									>
										{parseStats.newPublishersCount > 0 &&
											`✨ Creará ${parseStats.newPublishersCount} nuevos publicadores`}
									</span>
								</h4>

								<div
									style={{
										backgroundColor: "#f8fafc",
										border: "1px solid #e2e8f0",
										borderRadius: "8px",
										padding: "16px",
										marginBottom: "16px",
									}}
								>
									<h5
										style={{
											margin: "0 0 10px 0",
											fontSize: "0.9rem",
											fontWeight: "bold",
											color: "#334155",
											display: "flex",
											alignItems: "center",
											gap: "6px",
										}}
									>
										<i
											className="fas fa-sliders-h"
											style={{ color: "#475569" }}
										></i>{" "}
										Seguridad contra pérdidas de datos
									</h5>

									<div className="flex flex-col md:flex-row gap-4 text-sm">
										<label
											style={{
												display: "flex",
												alignItems: "flex-start",
												gap: "8px",
												cursor: "pointer",
												flex: 1,
												padding: "10px",
												backgroundColor:
													safeImportMode === "safe" ? "#eff6ff" : "white",
												border: `1px solid ${safeImportMode === "safe" ? "#bfdbfe" : "#e2e8f0"}`,
												borderRadius: "6px",
											}}
										>
											<input
												type="radio"
												name="safeImportMode"
												value="safe"
												checked={safeImportMode === "safe"}
												onChange={() => setSafeImportMode("safe")}
												style={{ marginTop: "3px", accentColor: "#3b82f6" }}
											/>
											<div>
												<strong style={{ color: "#1e3a8a", display: "block" }}>
													🛡️ Modo Seguro (Recomendado)
												</strong>
												<span style={{ color: "#64748b", fontSize: "0.75rem" }}>
													Si la base de datos ya tiene horas/estudios
													registradas para el mes y el archivo CSV los tiene en
													0, se conservarán los datos de la base de datos para
													no borrarlos por accidente.
												</span>
											</div>
										</label>

										<label
											style={{
												display: "flex",
												alignItems: "flex-start",
												gap: "8px",
												cursor: "pointer",
												flex: 1,
												padding: "10px",
												backgroundColor:
													safeImportMode === "overwrite" ? "#fff7ed" : "white",
												border: `1px solid ${safeImportMode === "overwrite" ? "#ffedd5" : "#e2e8f0"}`,
												borderRadius: "6px",
											}}
										>
											<input
												type="radio"
												name="safeImportMode"
												value="overwrite"
												checked={safeImportMode === "overwrite"}
												onChange={() => setSafeImportMode("overwrite")}
												style={{ marginTop: "3px", accentColor: "#f97316" }}
											/>
											<div>
												<strong style={{ color: "#7c2d12", display: "block" }}>
													⚠️ Sobrescribir Todo
												</strong>
												<span style={{ color: "#64748b", fontSize: "0.75rem" }}>
													Reemplaza siempre la base de datos con toda la
													información del archivo CSV, incluso si el archivo CSV
													contiene 0 horas o estudios vacíos.
												</span>
											</div>
										</label>

										<label
											style={{
												display: "flex",
												alignItems: "flex-start",
												gap: "8px",
												cursor: "pointer",
												flex: 1,
												padding: "10px",
												backgroundColor:
													safeImportMode === "skip" ? "#fcfcfc" : "white",
												border: `1px solid ${safeImportMode === "skip" ? "#cbd5e1" : "#e2e8f0"}`,
												borderRadius: "6px",
											}}
										>
											<input
												type="radio"
												name="safeImportMode"
												value="skip"
												checked={safeImportMode === "skip"}
												onChange={() => setSafeImportMode("skip")}
												style={{ marginTop: "3px", accentColor: "#64748b" }}
											/>
											<div>
												<strong style={{ color: "#334155", display: "block" }}>
													🚫 Evitar sobrescribir existente
												</strong>
												<span style={{ color: "#64748b", fontSize: "0.75rem" }}>
													Evita modificar los publicadores que ya tengan
													cualquier informe registrado para ese mes, solo
													importa informes para los publicadores que tengan el
													mes vacío en el sistema.
												</span>
											</div>
										</label>
									</div>
								</div>

								{safeImportMode === "safe" &&
									parsedRecords.filter(
										(r) => r.safetyAlert === "risk_blank_overwrite",
									).length > 0 && (
										<div
											style={{
												backgroundColor: "#eff6ff",
												border: "1px solid #bfdbfe",
												borderRadius: "6px",
												padding: "12px",
												marginBottom: "12px",
												fontSize: "0.85rem",
												color: "#1050af",
												display: "flex",
												alignItems: "center",
												gap: "8px",
											}}
										>
											<i
												className="fas fa-shield-alt"
												style={{ fontSize: "1.2rem", color: "#3b82f6" }}
											></i>
											<span>
												<strong>
													🛡️ Protección Activa para{" "}
													{
														parsedRecords.filter(
															(r) => r.safetyAlert === "risk_blank_overwrite",
														).length
													}{" "}
													publicadores:
												</strong>{" "}
												Tienen informes guardados en el sistema pero están en 0
												en tu archivo CSV. El sistema{" "}
												<strong>no sobrescribirá</strong> sus horas reales para
												proteger tus datos de pérdidas accidentales.
											</span>
										</div>
									)}

								{safeImportMode === "skip" &&
									parsedRecords.filter(
										(r) =>
											r.safetyAlert === "risk_blank_overwrite" ||
											r.safetyAlert === "different_overwrite",
									).length > 0 && (
										<div
											style={{
												backgroundColor: "#f1f5f9",
												border: "1px solid #cbd5e1",
												borderRadius: "6px",
												padding: "12px",
												marginBottom: "12px",
												fontSize: "0.85rem",
												color: "#334155",
												display: "flex",
												alignItems: "center",
												gap: "8px",
											}}
										>
											<i
												className="fas fa-info-circle"
												style={{ fontSize: "1.2rem", color: "#64748b" }}
											></i>
											<span>
												<strong>🚫 Protección de Datos Existentes:</strong> Se
												omitirá la importación de{" "}
												{
													parsedRecords.filter(
														(r) =>
															r.safetyAlert === "risk_blank_overwrite" ||
															r.safetyAlert === "different_overwrite",
													).length
												}{" "}
												informes que ya existen en el sistema.
											</span>
										</div>
									)}

								{autoCreatePublishers && newPublishersToCreate.length > 0 && (
									<div
										style={{
											backgroundColor: "#fffbeb",
											border: "1px solid #fef3c7",
											borderRadius: "6px",
											padding: "12px",
											marginBottom: "12px",
											fontSize: "0.85rem",
											color: "#92400e",
										}}
									>
										<strong>
											Publicadores nuevos que se crearán automáticamente:
										</strong>
										<div
											style={{
												display: "flex",
												flexWrap: "wrap",
												gap: "6px",
												marginTop: "6px",
											}}
										>
											{newPublishersToCreate.map((name, idx) => (
												<span
													key={`new-pub-${idx}`}
													style={{
														backgroundColor: "#fef3c7",
														padding: "2px 8px",
														borderRadius: "4px",
														border: "1px solid #fde68a",
														fontWeight: "600",
													}}
												>
													{name}
												</span>
											))}
										</div>
									</div>
								)}

								{!autoCreatePublishers && newPublishersToCreate.length > 0 && (
									<div
										style={{
											backgroundColor: "#fee2e2",
											border: "1px solid #fca5a5",
											borderRadius: "6px",
											padding: "12px",
											marginBottom: "12px",
											fontSize: "0.85rem",
											color: "#991b1b",
										}}
									>
										<strong>⚠️ Atención:</strong> Se encontraron{" "}
										{newPublishersToCreate.length} publicadores en el archivo
										cargado que no coinciden exactamente con publicadores
										registrados en el sistema. Para crearlos, activa la casilla{" "}
										<strong>"Crear publicadores automáticamente"</strong> de
										arriba, o asegúrate de que sus nombres coincidan
										exactamente.
										<div
											style={{
												display: "flex",
												flexWrap: "wrap",
												gap: "6px",
												marginTop: "8px",
											}}
										>
											{newPublishersToCreate.map((name, idx) => (
												<span
													key={`new-pub-${idx}`}
													style={{
														backgroundColor: "#fee2e2",
														padding: "2px 8px",
														borderRadius: "4px",
														border: "1px solid #ff8a8a",
														fontWeight: "600",
													}}
												>
													{name}
												</span>
											))}
										</div>
									</div>
								)}

								<div
									style={{
										overflowX: "auto",
										maxHeight: "300px",
										border: "1px solid #e2e8f0",
										borderRadius: "8px",
									}}
								>
									<table
										style={{
											width: "100%",
											borderCollapse: "collapse",
											fontSize: "0.85rem",
											textAlign: "left",
										}}
									>
										<thead
											style={{
												backgroundColor: "#f8fafc",
												borderBottom: "1px solid #e2e8f0",
												position: "sticky",
												top: 0,
											}}
										>
											<tr>
												<th style={{ padding: "8px 12px", fontWeight: "bold" }}>
													Fila
												</th>
												<th style={{ padding: "8px 12px", fontWeight: "bold" }}>
													Publicador
												</th>
												<th style={{ padding: "8px 12px", fontWeight: "bold" }}>
													Mes
												</th>
												<th
													style={{
														padding: "8px 12px",
														fontWeight: "bold",
														textAlign: "center",
													}}
												>
													Horas
												</th>
												<th
													style={{
														padding: "8px 12px",
														fontWeight: "bold",
														textAlign: "center",
													}}
												>
													H. Esp
												</th>
												<th
													style={{
														padding: "8px 12px",
														fontWeight: "bold",
														textAlign: "center",
													}}
												>
													Estudios
												</th>
												<th style={{ padding: "8px 12px", fontWeight: "bold" }}>
													Notas
												</th>
												<th style={{ padding: "8px 12px", fontWeight: "bold" }}>
													Estado
												</th>
											</tr>
										</thead>
										<tbody>
											{parsedRecords.map((row, idx) => {
												let rowBgColor = "transparent";
												if (!row.isValid) rowBgColor = "#fef2f2";
												else if (
													safeImportMode === "safe" &&
													row.safetyAlert === "risk_blank_overwrite"
												)
													rowBgColor = "#eff6ff";
												else if (
													safeImportMode === "skip" &&
													(row.safetyAlert === "risk_blank_overwrite" ||
														row.safetyAlert === "different_overwrite")
												)
													rowBgColor = "#f1f5f9";
												else if (row.safetyAlert === "different_overwrite")
													rowBgColor = "#fff7ed";
												else if (row.isNew) rowBgColor = "#f0fdf4";

												return (
													<tr
														key={`row-${idx}`}
														style={{
															borderBottom: "1px solid #f1f5f9",
															backgroundColor: rowBgColor,
														}}
													>
														<td
															style={{ padding: "8px 12px", color: "#64748b" }}
														>
															{row.originalIndex}
														</td>
														<td
															style={{
																padding: "8px 12px",
																fontWeight: row.isNew ? "bold" : "normal",
															}}
														>
															{row.name}{" "}
															{row.isNew && (
																<span
																	style={{
																		fontSize: "0.7rem",
																		backgroundColor: "#dcfce7",
																		color: "#15803d",
																		padding: "1px 4px",
																		borderRadius: "3px",
																		marginLeft: "4px",
																	}}
																>
																	NUEVO
																</span>
															)}
														</td>
														<td style={{ padding: "8px 12px" }}>{row.month}</td>
														<td
															style={{
																padding: "8px 12px",
																textAlign: "center",
															}}
														>
															{row.hours}
														</td>
														<td
															style={{
																padding: "8px 12px",
																textAlign: "center",
															}}
														>
															{row.specialHours || 0}
														</td>
														<td
															style={{
																padding: "8px 12px",
																textAlign: "center",
															}}
														>
															{row.studies || 0}
														</td>
														<td
															style={{
																padding: "8px 12px",
																color: "#64748b",
																maxWidth: "150px",
																overflow: "hidden",
																textOverflow: "ellipsis",
																whiteSpace: "nowrap",
															}}
															title={row.notes}
														>
															{row.notes}
														</td>
														<td style={{ padding: "8px 12px" }}>
															{!row.isValid ? (
																<span
																	style={{
																		color: "#ef4444",
																		fontWeight: "bold",
																	}}
																>
																	<i className="fas fa-exclamation-circle"></i>{" "}
																	Inválido
																</span>
															) : safeImportMode === "safe" &&
																row.safetyAlert === "risk_blank_overwrite" ? (
																<span
																	style={{
																		color: "#1d4ed8",
																		fontWeight: "bold",
																	}}
																	title={`La DB ya tiene H: ${row.dbDetail.horas}, Est: ${row.dbDetail.estudios}. No se sobrescribirá.`}
																>
																	<i className="fas fa-shield-alt"></i> DB
																	Protegida (CSV 0)
																</span>
															) : safeImportMode === "skip" &&
																(row.safetyAlert === "risk_blank_overwrite" ||
																	row.safetyAlert === "different_overwrite") ? (
																<span
																	style={{
																		color: "#475569",
																		fontWeight: "bold",
																	}}
																	title={`Ya existe informe en DB. Se omitirá.`}
																>
																	<i className="fas fa-ban"></i> Se Omitirá
																</span>
															) : row.safetyAlert === "different_overwrite" ? (
																<span
																	style={{
																		color: "#b45309",
																		fontWeight: "bold",
																	}}
																	title={`Sobrescribirá DB (${row.dbDetail.horas}h) con ${row.hours}h`}
																>
																	<i className="fas fa-sync"></i> Reemplazará (
																	{row.dbDetail.horas}h ➔ {row.hours}h)
																</span>
															) : row.safetyAlert === "identical" ? (
																<span style={{ color: "#64748b" }}>
																	<i className="fas fa-equals"></i> Idéntico
																	(Sin cambios)
																</span>
															) : row.isNew ? (
																<span
																	style={{
																		color: "#16a34a",
																		fontWeight: "bold",
																	}}
																>
																	<i className="fas fa-plus"></i> Creará
																	Publicador
																</span>
															) : (
																<span style={{ color: "#3b82f6" }}>
																	<i className="fas fa-check"></i> Listo
																</span>
															)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>

								<div
									style={{
										marginTop: "1.5rem",
										display: "flex",
										justifyContent: "flex-end",
										gap: "10px",
									}}
								>
									<button
										onClick={() => {
											setParsedRecords([]);
											setSelectedFile(null);
										}}
										style={{
											padding: "10px 20px",
											backgroundColor: "white",
											color: "#64748b",
											border: "1px solid #cbd5e1",
											borderRadius: "8px",
											fontWeight: "bold",
											cursor: "pointer",
										}}
									>
										Cancelar
									</button>
									<button
										onClick={handleImportConfirm}
										disabled={isImporting || parseStats.valid === 0}
										style={{
											padding: "10px 25px",
											backgroundColor: isImporting ? "#94a3b8" : "#10b981",
											color: "white",
											border: "none",
											borderRadius: "8px",
											fontWeight: "bold",
											cursor:
												isImporting || parseStats.valid === 0
													? "not-allowed"
													: "pointer",
											display: "flex",
											alignItems: "center",
											gap: "8px",
										}}
									>
										{isImporting ? (
											<>
												<i className="fas fa-spinner fa-spin"></i> Importando (
												{importProgress.current}/{importProgress.total})...
											</>
										) : (
											<>
												<i className="fas fa-file-import"></i> Confirmar e
												Importar {parseStats.valid} Informes
											</>
										)}
									</button>
								</div>
							</div>
						)}
					</>
				)}

				{activeImportTab === "publishers" && (
					<>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div
								style={{
									border: "1px solid #e2e8f0",
									borderRadius: "8px",
									padding: "16px",
									display: "flex",
									flexDirection: "column",
									justifyContent: "space-between",
								}}
							>
								<div>
									<h3
										style={{
											margin: "0 0 10px 0",
											fontSize: "1rem",
											fontWeight: "bold",
											color: "#334155",
											display: "flex",
											alignItems: "center",
											gap: "6px",
										}}
									>
										<i
											className="fas fa-download"
											style={{ color: "#3b82f6" }}
										></i>{" "}
										1. Descargar Plantilla S-21
									</h3>
									<p
										style={{
											fontSize: "0.85rem",
											color: "#64748b",
											margin: "0 0 16px 0",
											lineHeight: "1.4",
										}}
									>
										Descarga un archivo CSV con todos los publicadores y su
										información personal o de privilegios (Anciano, Precursor,
										etc.). Puedes agregar o modificar, y luego subirlo de
										vuelta.
									</p>
								</div>
								<button
									onClick={handleDownloadPubTemplate}
									style={{
										padding: "10px 16px",
										backgroundColor: "#f0f9ff",
										color: "#0284c7",
										border: "2px solid #0284c7",
										borderRadius: "8px",
										fontWeight: "bold",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "8px",
										transition: "all 0.2s",
										width: "100%",
									}}
								>
									<i className="fas fa-file-csv"></i> Descargar Datos Mapeados
									(S-21)
								</button>
							</div>

							<div
								style={{
									border: "1px solid #e2e8f0",
									borderRadius: "8px",
									padding: "16px",
									display: "flex",
									flexDirection: "column",
									justifyContent: "space-between",
								}}
							>
								<div>
									<h3
										style={{
											margin: "0 0 10px 0",
											fontSize: "1rem",
											fontWeight: "bold",
											color: "#334155",
											display: "flex",
											alignItems: "center",
											gap: "6px",
										}}
									>
										<i
											className="fas fa-upload"
											style={{ color: "#f59e0b" }}
										></i>{" "}
										2. Subir Archivo S-21 Lleno (CSV)
									</h3>
									<p
										style={{
											fontSize: "0.85rem",
											color: "#64748b",
											margin: "0 0 16px 0",
											lineHeight: "1.4",
										}}
									>
										Sube el archivo CSV con los datos personales modificados o
										nuevos miembros, para cargarlos a la congregación.
									</p>
								</div>
								<div>
									{pubSelectedFile && (
										<div
											style={{
												marginBottom: "10px",
												fontSize: "0.8rem",
												color: "#16a34a",
												fontWeight: "bold",
												display: "flex",
												alignItems: "center",
												gap: "6px",
											}}
										>
											<i className="fas fa-check-circle"></i> Archivo cargado:{" "}
											{pubSelectedFile.name}
										</div>
									)}
									<label
										style={{
											padding: "10px 16px",
											backgroundColor: "#fffbeb",
											color: "#b45309",
											border: "2px dashed #f59e0b",
											borderRadius: "8px",
											fontWeight: "bold",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: "8px",
											transition: "all 0.2s",
											width: "100%",
										}}
									>
										<i className="fas fa-folder-open"></i> Seleccionar Archivo
										CSV S-21
										<input
											type="file"
											accept=".csv"
											onChange={(e) => {
												const f = e.target.files?.[0];
												if (f) processPubsCSVFile(f);
												e.target.value = "";
											}}
											style={{ display: "none" }}
										/>
									</label>
								</div>
							</div>
						</div>

						{pubImportSuccess && (
							<div
								style={{
									marginTop: "20px",
									padding: "12px",
									backgroundColor: "#dcfce7",
									border: "1px solid #86efac",
									borderRadius: "8px",
									color: "#166534",
									fontWeight: "bold",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
							>
								<i
									className="fas fa-check-circle"
									style={{ fontSize: "1.2rem" }}
								></i>{" "}
								{pubImportSuccess}
							</div>
						)}

						{pubParsedRecords &&
							pubParsedRecords.length > 0 &&
							pubParseStats && (
								<div
									style={{
										marginTop: "24px",
										borderTop: "2px dashed #e2e8f0",
										paddingTop: "20px",
									}}
								>
									<h3
										style={{
											fontSize: "1.1rem",
											fontWeight: "bold",
											color: "#1e293b",
											marginBottom: "16px",
											display: "flex",
											alignItems: "center",
											gap: "8px",
										}}
									>
										<i
											className="fas fa-list-check"
											style={{ color: "#3b82f6" }}
										></i>{" "}
										Vista Previa de Publicadores
									</h3>

									<div
										style={{
											display: "flex",
											gap: "15px",
											marginBottom: "16px",
											flexWrap: "wrap",
										}}
									>
										<span
											style={{
												backgroundColor: "#f1f5f9",
												padding: "6px 12px",
												borderRadius: "20px",
												fontSize: "0.8rem",
												fontWeight: "bold",
												color: "#475569",
											}}
										>
											Total: {pubParseStats.total}
										</span>
										<span
											style={{
												backgroundColor: "#dcfce7",
												padding: "6px 12px",
												borderRadius: "20px",
												fontSize: "0.8rem",
												fontWeight: "bold",
												color: "#166534",
											}}
										>
											Válidos: {pubParseStats.valid}
										</span>
										<span
											style={{
												backgroundColor: "#fef2f2",
												padding: "6px 12px",
												borderRadius: "20px",
												fontSize: "0.8rem",
												fontWeight: "bold",
												color: "#991b1b",
											}}
										>
											Inválidos/Vacíos: {pubParseStats.invalid}
										</span>
										{pubParseStats.newPublishersCount > 0 && (
											<span
												style={{
													backgroundColor: "#ffedd5",
													padding: "6px 12px",
													borderRadius: "20px",
													fontSize: "0.8rem",
													fontWeight: "bold",
													color: "#9a3412",
												}}
											>
												Nuevos a crear: {pubParseStats.newPublishersCount}
											</span>
										)}
									</div>

									<div
										style={{
											backgroundColor: "#f8fafc",
											border: "1px solid #e2e8f0",
											borderRadius: "8px",
											padding: "16px",
											marginBottom: "16px",
										}}
									>
										<h5
											style={{
												margin: "0 0 10px 0",
												fontSize: "0.9rem",
												fontWeight: "bold",
												color: "#334155",
												display: "flex",
												alignItems: "center",
												gap: "6px",
											}}
										>
											<i
												className="fas fa-sliders-h"
												style={{ color: "#475569" }}
											></i>{" "}
											Seguridad de Datos
										</h5>

										<div className="flex flex-col md:flex-row gap-4 text-sm">
											<label
												style={{
													display: "flex",
													alignItems: "flex-start",
													gap: "8px",
													cursor: "pointer",
													flex: 1,
													padding: "10px",
													backgroundColor:
														pubSafeImportMode === "safe" ? "#eff6ff" : "white",
													border: `1px solid ${pubSafeImportMode === "safe" ? "#bfdbfe" : "#e2e8f0"}`,
													borderRadius: "6px",
												}}
											>
												<input
													type="radio"
													value="safe"
													checked={pubSafeImportMode === "safe"}
													onChange={() => setPubSafeImportMode("safe")}
													style={{ marginTop: "3px", accentColor: "#3b82f6" }}
												/>
												<div>
													<strong
														style={{ color: "#1e3a8a", display: "block" }}
													>
														🛡️ Modo Seguro (Recomendado)
													</strong>
													<span
														style={{ color: "#64748b", fontSize: "0.75rem" }}
													>
														Añadirá los datos/fechas/privilegios a campos
														vacíos. NO borrará datos existentes si en el CSV los
														dejaste en blanco. Tampoco te quitará privilegios si
														los omites.
													</span>
												</div>
											</label>

											<label
												style={{
													display: "flex",
													alignItems: "flex-start",
													gap: "8px",
													cursor: "pointer",
													flex: 1,
													padding: "10px",
													backgroundColor:
														pubSafeImportMode === "overwrite"
															? "#fff7ed"
															: "white",
													border: `1px solid ${pubSafeImportMode === "overwrite" ? "#ffedd5" : "#e2e8f0"}`,
													borderRadius: "6px",
												}}
											>
												<input
													type="radio"
													value="overwrite"
													checked={pubSafeImportMode === "overwrite"}
													onChange={() => setPubSafeImportMode("overwrite")}
													style={{ marginTop: "3px", accentColor: "#f97316" }}
												/>
												<div>
													<strong
														style={{ color: "#7c2d12", display: "block" }}
													>
														⚠️ Sobrescribir Todo
													</strong>
													<span
														style={{ color: "#64748b", fontSize: "0.75rem" }}
													>
														Iguala la base de datos idénticamente al archivo
														CSV. Si en el CSV alguien tiene fecha en blanco o no
														es "Anciano", en la base de datos se le borrará la
														fecha y perderá el privilegio.
													</span>
												</div>
											</label>

											<label
												style={{
													display: "flex",
													alignItems: "flex-start",
													gap: "8px",
													cursor: "pointer",
													flex: 1,
													padding: "10px",
													backgroundColor:
														pubSafeImportMode === "skip" ? "#fcfcfc" : "white",
													border: `1px solid ${pubSafeImportMode === "skip" ? "#cbd5e1" : "#e2e8f0"}`,
													borderRadius: "6px",
												}}
											>
												<input
													type="radio"
													value="skip"
													checked={pubSafeImportMode === "skip"}
													onChange={() => setPubSafeImportMode("skip")}
													style={{ marginTop: "3px", accentColor: "#64748b" }}
												/>
												<div>
													<strong
														style={{ color: "#334155", display: "block" }}
													>
														🚫 Evitar sobrescribir existente
													</strong>
													<span
														style={{ color: "#64748b", fontSize: "0.75rem" }}
													>
														Si el publicador ya existe en la base de datos y
														tiene al menos un dato, no se le importará nada,
														para proteger todas sus configuraciones. Se omitirán
														las modificaciones.
													</span>
												</div>
											</label>
										</div>
									</div>

									<div
										style={{
											overflowX: "auto",
											maxHeight: "300px",
											border: "1px solid #e2e8f0",
											borderRadius: "8px",
										}}
									>
										<table
											style={{
												width: "100%",
												borderCollapse: "collapse",
												fontSize: "0.85rem",
												textAlign: "left",
											}}
										>
											<thead
												style={{
													backgroundColor: "#f8fafc",
													borderBottom: "1px solid #e2e8f0",
													position: "sticky",
													top: 0,
												}}
											>
												<tr>
													<th
														style={{ padding: "8px 12px", fontWeight: "bold" }}
													>
														Fila
													</th>
													<th
														style={{ padding: "8px 12px", fontWeight: "bold" }}
													>
														Publicador
													</th>
													<th
														style={{ padding: "8px 12px", fontWeight: "bold" }}
													>
														Nombre Completo
													</th>
													<th
														style={{ padding: "8px 12px", fontWeight: "bold" }}
													>
														Nac/Bau
													</th>
													<th
														style={{ padding: "8px 12px", fontWeight: "bold" }}
													>
														Privilegios
													</th>
													<th
														style={{ padding: "8px 12px", fontWeight: "bold" }}
													>
														Dirección
													</th>
													<th
														style={{ padding: "8px 12px", fontWeight: "bold" }}
													>
														Teléfonos / Contactos
													</th>
													<th
														style={{ padding: "8px 12px", fontWeight: "bold" }}
													>
														Estado
													</th>
												</tr>
											</thead>
											<tbody>
												{pubParsedRecords.map((row, idx) => {
													let rowBgColor = "transparent";
													let safeActionAlert = row.safetyAlert;
													if (!row.isValid) rowBgColor = "#fef2f2";
													else if (
														pubSafeImportMode === "safe" &&
														safeActionAlert === "risk_blank_overwrite"
													)
														rowBgColor = "#eff6ff";
													else if (
														pubSafeImportMode === "skip" &&
														(safeActionAlert === "risk_blank_overwrite" ||
															safeActionAlert === "different_overwrite")
													)
														rowBgColor = "#f1f5f9";
													else if (safeActionAlert === "different_overwrite")
														rowBgColor = "#fff7ed";
													else if (row.isNew) rowBgColor = "#f0fdf4";

													return (
														<tr
															key={`pubrow-${idx}`}
															style={{
																borderBottom: "1px solid #f1f5f9",
																backgroundColor: rowBgColor,
															}}
														>
															<td
																style={{
																	padding: "8px 12px",
																	color: "#64748b",
																}}
															>
																{row.originalIndex}
															</td>
															<td
																style={{
																	padding: "8px 12px",
																	fontWeight: row.isNew ? "bold" : "normal",
																}}
															>
																{row.name}{" "}
																{row.isNew && (
																	<span
																		style={{
																			fontSize: "0.7rem",
																			backgroundColor: "#dcfce7",
																			color: "#15803d",
																			padding: "1px 4px",
																			borderRadius: "3px",
																			marginLeft: "4px",
																		}}
																	>
																		NUEVO
																	</span>
																)}
															</td>
															<td
																style={{
																	padding: "8px 12px",
																	color: "#475569",
																	fontSize: "0.8rem",
																}}
															>
																{row.nombreCompleto || "--"}
															</td>
															<td
																style={{
																	padding: "8px 12px",
																	color: "#475569",
																	fontSize: "0.75rem",
																}}
															>
																Nac: {row.fechaNac || "--"} <br /> Bau:{" "}
																{row.fechaBau || "--"}
															</td>
															<td
																style={{
																	padding: "8px 12px",
																	color: "#475569",
																	fontSize: "0.75rem",
																}}
															>
																{[
																	row.anciano ? "ANC" : "",
																	row.siervo ? "SM" : "",
																	row.precReg ? "PR" : "",
																	row.precEsp ? "PE" : "",
																	row.misionero ? "MIS" : "",
																]
																	.filter((x) => x)
																	.join(", ") || "Pub"}
															</td>
															<td
																style={{
																	padding: "8px 12px",
																	color: "#475569",
																	fontSize: "0.75rem",
																}}
															>
																{renderDireccionInTable(row.direccion)}
															</td>
															<td
																style={{
																	padding: "8px 12px",
																	color: "#475569",
																	fontSize: "0.75rem",
																}}
															>
																{renderContactoInTable(row.telefonoPersonal, row.contactoEmergencia)}
															</td>
															<td style={{ padding: "8px 12px" }}>
																{!row.isValid ? (
																	<span
																		style={{
																			color: "#ef4444",
																			fontWeight: "bold",
																		}}
																	>
																		<i className="fas fa-exclamation-circle"></i>{" "}
																		Inválido
																	</span>
																) : pubSafeImportMode === "safe" &&
																	safeActionAlert === "risk_blank_overwrite" ? (
																	<span
																		style={{
																			color: "#1d4ed8",
																			fontWeight: "bold",
																		}}
																	>
																		<i className="fas fa-shield-alt"></i> DB
																		Protegida (CSV vacío)
																	</span>
																) : pubSafeImportMode === "skip" &&
																	(safeActionAlert === "risk_blank_overwrite" ||
																		safeActionAlert ===
																			"different_overwrite") ? (
																	<span
																		style={{
																			color: "#475569",
																			fontWeight: "bold",
																		}}
																	>
																		<i className="fas fa-ban"></i> Se Omitirá
																	</span>
																) : safeActionAlert ===
																	"different_overwrite" ? (
																	<span
																		style={{
																			color: "#b45309",
																			fontWeight: "bold",
																		}}
																	>
																		<i className="fas fa-sync"></i> Reemplazará
																	</span>
																) : safeActionAlert === "identical" ? (
																	<span style={{ color: "#64748b" }}>
																		<i className="fas fa-equals"></i> Idéntico
																	</span>
																) : row.isNew ? (
																	<span
																		style={{
																			color: "#16a34a",
																			fontWeight: "bold",
																		}}
																	>
																		<i className="fas fa-plus"></i> Creará
																		Publicador
																	</span>
																) : (
																	<span style={{ color: "#3b82f6" }}>
																		<i className="fas fa-check"></i> Listo
																	</span>
																)}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>

									<div
										style={{
											marginTop: "1.5rem",
											display: "flex",
											justifySelf: "flex-end",
											justifyContent: "flex-end",
											gap: "10px",
										}}
									>
										<button
											onClick={() => {
												setPubParsedRecords([]);
												setPubSelectedFile(null);
											}}
											style={{
												padding: "10px 20px",
												backgroundColor: "white",
												color: "#64748b",
												border: "1px solid #cbd5e1",
												borderRadius: "8px",
												fontWeight: "bold",
												cursor: "pointer",
											}}
										>
											Cancelar
										</button>
										<button
											onClick={handleImportPubsConfirm}
											disabled={pubIsImporting || pubParseStats.valid === 0}
											style={{
												padding: "10px 25px",
												backgroundColor: pubIsImporting ? "#94a3b8" : "#10b981",
												color: "white",
												border: "none",
												borderRadius: "8px",
												fontWeight: "bold",
												cursor:
													pubIsImporting || pubParseStats.valid === 0
														? "not-allowed"
														: "pointer",
												display: "flex",
												alignItems: "center",
												gap: "8px",
											}}
										>
											{pubIsImporting ? (
												<>
													<i className="fas fa-spinner fa-spin"></i> Importando
													({pubImportProgress.current}/{pubImportProgress.total}
													)...
												</>
											) : (
												<>
													<i className="fas fa-file-import"></i> Cargar{" "}
													{pubParseStats.valid} Registros
												</>
											)}
										</button>
									</div>
								</div>
							)}
					</>
				)}
			</div>
		</div>
	);
}

// --- HELPER FUNCTIONS FOR CSV PARSING AND MAPPING ---
function parseCSV(text: string) {
	const lines = text.split(/\r?\n/);
	if (lines.length === 0) return { headers: [], records: [] };

	const parseLine = (line: string) => {
		const result: string[] = [];
		let curVal = "";
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === "," && !inQuotes) {
				result.push(curVal.trim());
				curVal = "";
			} else {
				curVal += char;
			}
		}
		result.push(curVal.trim());
		return result;
	};

	const rawHeaders = parseLine(lines[0] || "");
	const headers = rawHeaders.map((h) =>
		h.replace(/^"|"$/g, "").trim().toLowerCase(),
	);
	const records: any[] = [];

	for (let i = 1; i < lines.length; i++) {
		const currentLine = lines[i];
		if (!currentLine || !currentLine.trim()) continue;
		const row = parseLine(currentLine);
		if (row.length === 0) continue;

		const record: any = {};
		headers.forEach((h, idx) => {
			if (idx < row.length && h) {
				record[h] = row[idx].replace(/^"|"$/g, "").trim();
			}
		});
		records.push(record);
	}
	return { headers, records };
}

function normalizeName(name: string): string {
	if (!name) return "";
	return name
		.replace(
			/[\u0000-\u001F\u007F-\u009F\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g,
			" ",
		) // Reemplaza espacios de no fragmentación, caracteres de control y espacios raros por espacios normales
		.replace(/\s+/g, " ") // Colapsa múltiples espacios continuos en uno solo
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, ""); // Remueve acentos y diacríticos
}

function parseDateToYMD(val: any): string {
	if (!val) return "";
	const s = String(val).trim();
	if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
	if (s.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
		const [d, m, y] = s.split("/");
		return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
	}
	return "";
}

function parseS21Month(val: any): string {
	if (!val) return "";
	const s = String(val).trim();
	if (s.match(/^\d{4}-\d{2}$/)) return s;
	if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s.substring(0, 7);
	return "";
}

function getBooleanYesNo(val: any): boolean {
	if (!val) return false;
	const s = String(val).trim().toLowerCase();
	return (
		s === "si" ||
		s === "sí" ||
		s === "yes" ||
		s === "true" ||
		s === "true" ||
		s === "1" ||
		s === "x" ||
		s === "v"
	);
}

function getMappedValue(record: any, keys: string[]) {
	const normalizeKeyForMapping = (str: string): string => {
		if (!str) return "";
		let s = str.replace(/Ã©/g, "e");
		s = s.replace(/Ã³/g, "o");
		s = s.replace(/Ã¡/g, "a");
		s = s.replace(/Ãº/g, "u");
		s = s.replace(/Ã±/g, "n");
		s = s.replace(/Ã/g, "A"); 

		s = s.toLowerCase();
		// Reemplazar secuencias corruptas de UTF-8 comunes
		s = s.replace(/ã³/g, "o");
		s = s.replace(/ã©/g, "e");
		s = s.replace(/ã¡/g, "a");
		s = s.replace(/ãº/g, "u");
		s = s.replace(/ã±/g, "n");
		s = s.replace(/ã/g, "a"); 

		s = s.replace(/â/g, "");

		// Quite tildes estándar y ñ
		s = s.replace(/[áàäâ]/g, "a");
		s = s.replace(/[éèëê]/g, "e");
		s = s.replace(/[íìïî]/g, "i");
		s = s.replace(/[óòöô]/g, "o");
		s = s.replace(/[úùüû]/g, "u");
		s = s.replace(/[ñ]/g, "n");

		// Eliminar caracteres no alfanuméricos
		return s.replace(/[^a-z0-9]/g, "");
	};

	const recordKeys = Object.keys(record);

	// 1. Primero busca coincidencia normalizada exacta
	const normalizedKeysToSearch = keys.map(k => normalizeKeyForMapping(k));
	for (let i = 0; i < keys.length; i++) {
		const targetNormalized = normalizedKeysToSearch[i];
		const matchedKey = recordKeys.find((rk) => normalizeKeyForMapping(rk) === targetNormalized);
		if (matchedKey && record[matchedKey] !== undefined) {
			return record[matchedKey];
		}
	}

	// 2. Si no, busca si alguna columna contiene de manera parcial
	for (let i = 0; i < keys.length; i++) {
		const targetNormalized = normalizedKeysToSearch[i];
		const matchedKey = recordKeys.find((rk) => normalizeKeyForMapping(rk).includes(targetNormalized));
		if (matchedKey && record[matchedKey] !== undefined) {
			return record[matchedKey];
		}
	}

	return undefined;
}

function parseMonthToISO(monthStr: string | undefined): string | null {
	if (!monthStr) return null;
	const trimmed = monthStr.trim();

	// Check YYYY-MM
	if (/^\d{4}-\d{2}$/.test(trimmed)) {
		return trimmed;
	}

	// Check MM/YYYY
	if (/^\d{2}\/\d{4}$/.test(trimmed)) {
		const [mm, yyyy] = trimmed.split("/");
		return `${yyyy}-${mm.padStart(2, "0")}`;
	}

	// Check YYYY/MM
	if (/^\d{4}\/\d{2}$/.test(trimmed)) {
		return trimmed.replace("/", "-");
	}

	// Match Spanish months, e.g. "Marzo 2026" or "2026 Marzo"
	const monthsSpanish: Record<string, string> = {
		enero: "01",
		febrero: "02",
		marzo: "03",
		abril: "04",
		mayo: "05",
		junio: "06",
		julio: "07",
		agosto: "08",
		septiembre: "09",
		octubre: "10",
		noviembre: "11",
		diciembre: "12",
	};

	const lower = trimmed.toLowerCase();
	let selectedMonth = "";
	let selectedYear = "";

	// Extract year (4 digits)
	const yearMatch = trimmed.match(/\b\d{4}\b/);
	if (yearMatch) {
		selectedYear = yearMatch[0];
	} else {
		selectedYear = new Date().getFullYear().toString();
	}

	for (const [name, num] of Object.entries(monthsSpanish)) {
		if (lower.includes(name)) {
			selectedMonth = num;
			break;
		}
	}

	if (selectedMonth && selectedYear) {
		return `${selectedYear}-${selectedMonth}`;
	}

	return null;
}
