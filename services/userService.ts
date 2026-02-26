import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = 'db_users';

export interface User {
  id: string;
  phone: string;
  username: string;
  displayName: string;
  role: 'user' | 'admin';
  ip: string;
  createdAt: string;
  avatar?: string;
}

async function fetchUserIp(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip ?? '';
  } catch {
    return '';
  }
}

async function getAll(): Promise<User[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as User[];
}

async function saveAll(users: User[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function getByPhone(phone: string): Promise<User | null> {
  const users = await getAll();
  return users.find((u) => u.phone === phone) ?? null;
}

async function getById(id: string): Promise<User | null> {
  const users = await getAll();
  return users.find((u) => u.id === id) ?? null;
}

async function getByUsername(username: string): Promise<User | null> {
  const users = await getAll();
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null;
}

async function create(data: Pick<User, 'phone' | 'username' | 'displayName'>): Promise<User> {
  const users = await getAll();
  const ip = await fetchUserIp();
  const newUser: User = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    phone: data.phone,
    username: data.username,
    displayName: data.displayName,
    role: 'user',
    ip,
    createdAt: new Date().toISOString(),
  };
  await saveAll([...users, newUser]);
  return newUser;
}

async function update(id: string, fields: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
  const users = await getAll();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...fields };
  await saveAll(users);
  return users[idx];
}

async function remove(id: string): Promise<void> {
  const users = await getAll();
  await saveAll(users.filter((u) => u.id !== id));
}

export const userService = {
  getAll,
  getByPhone,
  getById,
  getByUsername,
  create,
  update,
  remove,
};
