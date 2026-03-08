import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';

export type DeviceContactPermissionStatus = 'granted' | 'denied' | 'undetermined';

export type DeviceContact = {
  id: string;
  name: string;
  phones: string[];
};

const MAX_CONTACTS = 500;

/** Normalize phone to canonical form for matching with server (same logic as server normalizePhoneQuery). */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length >= 2) return '+7' + digits.slice(1);
  if (digits.startsWith('7') && digits.length >= 2) return '+' + digits;
  if (digits.length > 0) return '+' + digits;
  return phone;
}

/** Normalize query fragment for search (e.g. "893" -> "+793"). */
export function normalizePhoneQuery(q: string): string {
  return normalizePhone(q);
}

function isNative(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function requestPermission(): Promise<DeviceContactPermissionStatus> {
  if (!isNative()) return 'undetermined';
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === Contacts.PermissionStatus.GRANTED) return 'granted';
    if (status === Contacts.PermissionStatus.DENIED) return 'denied';
    return 'undetermined';
  } catch {
    return 'denied';
  }
}

export async function getDeviceContacts(): Promise<DeviceContact[]> {
  if (!isNative()) return [];
  try {
    const { status } = await Contacts.getPermissionsAsync();
    if (status !== Contacts.PermissionStatus.GRANTED) return [];
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      pageSize: MAX_CONTACTS,
    });
    const out: DeviceContact[] = [];
    const seen = new Set<string>();
    for (const c of data) {
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.name || '';
      const rawNumbers = (c.phoneNumbers ?? []).map((p) => (p.number ?? p.digits ?? '').trim()).filter(Boolean);
      const phones = [...new Set(rawNumbers.map(normalizePhone).filter(Boolean))];
      const key = `${name}|${phones.join(',')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!name && phones.length === 0) continue;
      out.push({
        id: c.id ?? `device-${out.length}`,
        name: name || phones[0] || '',
        phones,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Filter device contacts by search query (name or phone). */
export function filterDeviceContacts(contacts: DeviceContact[], query: string): DeviceContact[] {
  const q = query.trim().replace(/^@/, '').toLowerCase();
  if (!q) return [];
  const phoneQ = normalizePhoneQuery(q);
  const digitsQ = phoneQ.replace(/\D/g, '');
  return contacts.filter((c) => {
    if (c.name.toLowerCase().includes(q)) return true;
    return c.phones.some((p) => {
      const norm = normalizePhone(p);
      return norm.includes(phoneQ) || norm.replace(/\D/g, '').includes(digitsQ);
    });
  });
}
