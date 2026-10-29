export type UserRole = 'admin' | 'user';

export interface AuthorizedUser {
  email: string;
  role: UserRole;
}

export interface VerificationResult {
  authorized: boolean;
  role: UserRole | null;
  email: string;
  displayName?: string;
  spreadsheetTitle?: string;
  spreadsheetId?: string;
  error?: 'NO_SPREADSHEET_FOUND' | 'USER_NOT_AUTHORIZED' | 'SHEET_READ_ERROR' | string;
  errorMessage?: string;
}

/**
 * ID oficial configurado para la base de datos de cuadrantes en Google Sheets
 */
export const DEFAULT_DB_SPREADSHEET_ID = '1N6al3C2O9Sla2KuyPmBvq92duqGbq2ptTydUwrK68P0';
export const DEFAULT_DB_SHEET_TAB = 'Hoja 1';

const STORAGE_KEYS = {
  MANUAL_SPREADSHEET_ID: 'cuadrante_db_sheets_id',
};

/**
 * Extrae el ID de una hoja de cálculo a partir de una URL completa, d/ID/ o devuelve el ID limpio.
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return DEFAULT_DB_SPREADSHEET_ID;
  const trimmed = input.trim();
  // Formato: /spreadsheets/d/ID/... o d/ID/ o ID directo
  const match = trimmed.match(/(?:spreadsheets\/d\/|\/d\/|^d\/|^)([a-zA-Z0-9-_]{20,})/);
  if (match && match[1]) {
    return match[1];
  }
  const cleaned = trimmed.replace(/^(\/?d\/)/, '').replace(/\/+$/, '');
  return cleaned || DEFAULT_DB_SPREADSHEET_ID;
}

export function getSavedSpreadsheetId(): string {
  return (
    localStorage.getItem(STORAGE_KEYS.MANUAL_SPREADSHEET_ID) ||
    DEFAULT_DB_SPREADSHEET_ID
  );
}

export function saveSpreadsheetId(id: string): void {
  const cleanId = extractSpreadsheetId(id);
  if (cleanId) {
    localStorage.setItem(STORAGE_KEYS.MANUAL_SPREADSHEET_ID, cleanId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.MANUAL_SPREADSHEET_ID);
  }
}

/**
 * Busca automáticamente en el Google Drive del usuario conectado
 * una hoja de cálculo llamada "DB_cuadrantes".
 */
export async function searchDbCuadrantesInDrive(
  accessToken: string
): Promise<{ id: string; name: string } | null> {
  try {
    const query = encodeURIComponent(
      "name = 'DB_cuadrantes' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
    );
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.warn('Error al buscar DB_cuadrantes en Drive:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return {
        id: data.files[0].id,
        name: data.files[0].name,
      };
    }

    return null;
  } catch (err) {
    console.warn('Fallo en la búsqueda automática en Drive:', err);
    return null;
  }
}

/**
 * Obtiene la lista de usuarios y roles leyendo la hoja de cálculo por ID.
 */
export async function fetchUsersFromSpreadsheet(
  spreadsheetId: string,
  accessToken: string,
  preferredTabTitle: string = DEFAULT_DB_SHEET_TAB
): Promise<{ users: AuthorizedUser[]; sheetTitle: string }> {
  let sheetTitle = preferredTabTitle;

  // 1. Obtener los metadatos para verificar el nombre de la pestaña
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const metaRes = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (metaRes.ok) {
      const metaData = await metaRes.json();
      if (metaData.sheets && metaData.sheets.length > 0) {
        const titles: string[] = metaData.sheets.map((s: any) => s.properties.title);
        // Buscar si existe "Hoja 1" o usar la primera disponible
        const match = titles.find(t => t.toLowerCase() === preferredTabTitle.toLowerCase());
        sheetTitle = match || titles[0];
      }
    }
  } catch (e) {
    console.warn('No se pudieron obtener los metadatos de pestañas, usando por defecto:', e);
  }

  // 2. Leer las columnas A y B (usuarios y roles)
  const range = `${encodeURIComponent(sheetTitle)}!A1:B300`;
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const valuesRes = await fetch(valuesUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!valuesRes.ok) {
    const errText = await valuesRes.text().catch(() => '');
    throw new Error(
      `No se pudo leer la hoja "${sheetTitle}" (código ${valuesRes.status}). Verifica que la hoja esté compartida y que la cuenta tenga permisos de lectura.`
    );
  }

  const valuesData = await valuesRes.json();
  const rows: string[][] = valuesData.values || [];

  if (rows.length === 0) {
    return { users: [], sheetTitle };
  }

  const users: AuthorizedUser[] = [];

  // Determinar si la primera fila es encabezado (ej. "usuarios" / "roles")
  let startIndex = 0;
  const firstRowCol0 = (rows[0][0] || '').toLowerCase().trim();
  const firstRowCol1 = (rows[0][1] || '').toLowerCase().trim();

  if (
    firstRowCol0.includes('usuario') ||
    firstRowCol0.includes('email') ||
    firstRowCol1.includes('rol') ||
    firstRowCol1.includes('role')
  ) {
    startIndex = 1;
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const email = (row[0] || '').trim().toLowerCase();
    const roleRaw = (row[1] || '').trim().toLowerCase();

    if (email) {
      const role: UserRole = roleRaw === 'admin' ? 'admin' : 'user';
      users.push({ email, role });
    }
  }

  return { users, sheetTitle };
}

/**
 * Valida el acceso del usuario contra DB_cuadrantes
 */
export async function verifyUserInDbCuadrantes(
  userEmail: string,
  accessToken: string,
  providedSpreadsheetId?: string
): Promise<VerificationResult> {
  const normalizedEmail = userEmail.trim().toLowerCase();

  // 1. Determinar el ID de la hoja: manual, guardado, oficial o búsqueda en Drive
  let targetId = providedSpreadsheetId ? extractSpreadsheetId(providedSpreadsheetId) : '';

  if (!targetId) {
    targetId = getSavedSpreadsheetId();
  }

  if (!targetId) {
    targetId = DEFAULT_DB_SPREADSHEET_ID;
  }

  try {
    const { users, sheetTitle } = await fetchUsersFromSpreadsheet(
      targetId,
      accessToken,
      DEFAULT_DB_SHEET_TAB
    );

    // Guardar el ID confirmado para futuras sesiones
    saveSpreadsheetId(targetId);

    // Buscar el usuario en la lista
    const matched = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (matched) {
      return {
        authorized: true,
        role: matched.role,
        email: normalizedEmail,
        spreadsheetId: targetId,
        spreadsheetTitle: sheetTitle,
      };
    } else {
      return {
        authorized: false,
        role: null,
        email: normalizedEmail,
        spreadsheetId: targetId,
        spreadsheetTitle: sheetTitle,
        error: 'USER_NOT_AUTHORIZED',
        errorMessage: `El usuario ${userEmail} no está registrado en la lista de usuarios autorizados de la hoja DB_cuadrantes (${sheetTitle}).`,
      };
    }
  } catch (err: any) {
    // Si falló con el ID directo, intentar buscar en Drive como respaldo
    try {
      const driveFound = await searchDbCuadrantesInDrive(accessToken);
      if (driveFound && driveFound.id !== targetId) {
        const { users, sheetTitle } = await fetchUsersFromSpreadsheet(
          driveFound.id,
          accessToken,
          DEFAULT_DB_SHEET_TAB
        );
        saveSpreadsheetId(driveFound.id);
        const matched = users.find(u => u.email.toLowerCase() === normalizedEmail);
        if (matched) {
          return {
            authorized: true,
            role: matched.role,
            email: normalizedEmail,
            spreadsheetId: driveFound.id,
            spreadsheetTitle: sheetTitle,
          };
        }
      }
    } catch {
      // Ignorar fallback
    }

    return {
      authorized: false,
      role: null,
      email: normalizedEmail,
      spreadsheetId: targetId,
      error: 'SHEET_READ_ERROR',
      errorMessage: err?.message || 'Error al conectar con Google Sheets.',
    };
  }
}
