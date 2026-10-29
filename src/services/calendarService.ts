import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { DayInfo, Employee, ShiftType } from '../types/quadrant';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.setCustomParameters({
  prompt: 'select_account consent',
});

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const signInWithGsi = (): Promise<{ user: AppUser; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services no está disponible en este momento.'));
      return;
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: firebaseConfig.oAuthClientId,
        scope:
          'email profile openid https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly',
        prompt: 'select_account consent',
        callback: async (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (!response.access_token) {
            reject(new Error('No se recibió el token de acceso de Google'));
            return;
          }

          cachedAccessToken = response.access_token;

          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` },
            });
            const info = await userInfoRes.json();

            const appUser: AppUser = {
              uid: info.sub || 'google-user',
              email: info.email || null,
              displayName: info.name || info.given_name || info.email || 'Usuario Google',
              photoURL: info.picture || null,
            };

            resolve({ user: appUser, accessToken: response.access_token });
          } catch (profileErr) {
            console.warn('No se pudo obtener el perfil de userinfo:', profileErr);
            resolve({
              user: {
                uid: 'google-user',
                email: null,
                displayName: 'Usuario Google',
                photoURL: null,
              },
              accessToken: response.access_token,
            });
          }
        },
      });

      client.requestAccessToken();
    } catch (e) {
      reject(e);
    }
  });
};

export const initAuth = (
  onAuthSuccess?: (user: User | AppUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User | AppUser; accessToken: string } | null> => {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error al iniciar sesión con Google:', error);
    if (error?.code === 'auth/unauthorized-domain' && (window as any).google?.accounts?.oauth2) {
      console.log('Firebase auth/unauthorized-domain detectado. Probando Google Identity Services directo...');
      try {
        const gsiResult = await signInWithGsi();
        return gsiResult;
      } catch (gsiErr) {
        console.warn('GSI fallback falló o fue cancelado:', gsiErr);
      }
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch {
    // Ignore if not signed in through Firebase
  }
  cachedAccessToken = null;
};

export interface ShiftCalendarEvent {
  summary: string;
  description: string;
  location?: string;
  startDateTime: string; // ISO string
  endDateTime: string; // ISO string
}

export function buildEventsForWorker(
  employee: Employee,
  assignments: Record<number, string> | undefined,
  days: DayInfo[],
  shifts: ShiftType[],
  serviceName: string
): ShiftCalendarEvent[] {
  if (!assignments) return [];

  const shiftMap = new Map<string, ShiftType>();
  shifts.forEach(s => shiftMap.set(s.code, s));

  const events: ShiftCalendarEvent[] = [];

  days.forEach(day => {
    const code = assignments[day.dayOfMonth];
    if (!code) return;

    const shift = shiftMap.get(code);
    if (!shift || shift.isOffDay || shift.totalHours <= 0) return;

    // Start time: day.dateString + T + shift.startTime
    // If shift ends earlier than it starts (e.g. 19:00 - 08:00 or 20:00 - 08:00), it ends next morning!
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);

    const startDate = new Date(`${day.dateString}T${shift.startTime}:00`);
    const endDate = new Date(`${day.dateString}T${shift.endTime}:00`);

    if (endH < startH || (endH === startH && endM <= startM)) {
      endDate.setDate(endDate.getDate() + 1);
    }

    events.push({
      summary: `Turno ${shift.code}: ${shift.name} - ${employee.name}`,
      description: `Servicio de Seguridad: ${serviceName}\nVigilante: ${employee.name} (TIP: ${employee.tip || 'N/A'})\nHorario: ${shift.startTime} a ${shift.endTime} (${shift.totalHours} horas)\nHoras nocturnas: ${shift.nightHours}h`,
      location: employee.assignedPost || serviceName,
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
    });
  });

  return events;
}

export async function syncEventsToGoogleCalendar(
  events: ShiftCalendarEvent[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No hay sesión activa de Google con permisos de Calendario.');
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: evt.summary,
          description: evt.description,
          location: evt.location,
          start: {
            dateTime: evt.startDateTime,
          },
          end: {
            dateTime: evt.endDateTime,
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 120 }, // 2 hours before
              { method: 'popup', minutes: 30 },  // 30 min before
            ],
          },
        }),
      });

      if (response.ok) {
        success++;
      } else {
        console.warn('Fallo al sincronizar evento:', await response.text());
        failed++;
      }
    } catch (err) {
      console.error('Error al sincronizar evento:', err);
      failed++;
    }

    if (onProgress) {
      onProgress(i + 1, events.length);
    }
  }

  return { success, failed };
}

// Generate an .ICS file string for universal calendar import (iOS, Android, Outlook, etc.)
export function generateICSContent(events: ShiftCalendarEvent[], calendarName: string): string {
  const formatICSDate = (dateIso: string) => {
    const d = new Date(dateIso);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CuadrantePro//Seguridad Privada//ES',
    `X-WR-CALNAME:${calendarName}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((evt, idx) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${Date.now()}-${idx}@cuadrantepro.es`,
      `DTSTAMP:${formatICSDate(new Date().toISOString())}`,
      `DTSTART:${formatICSDate(evt.startDateTime)}`,
      `DTEND:${formatICSDate(evt.endDateTime)}`,
      `SUMMARY:${evt.summary.replace(/,/g, '\\,')}`,
      `DESCRIPTION:${evt.description.replace(/\n/g, '\\n')}`,
      evt.location ? `LOCATION:${evt.location}` : '',
      'BEGIN:VALARM',
      'TRIGGER:-PT120M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Recordatorio de Turno de Vigilancia (2h antes)',
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n');
}

export function downloadICSFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
