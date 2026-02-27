import { api } from './api';

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

async function getMe(): Promise<User | null> {
  try {
    const data = await api.get<{ user: User }>('/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

async function update(fields: Partial<Pick<User, 'displayName' | 'avatar'>>): Promise<User | null> {
  try {
    const data = await api.patch<{ user: User }>('/auth/me', fields);
    return data.user;
  } catch {
    return null;
  }
}

async function searchByUsername(query: string): Promise<Pick<User, 'id' | 'username' | 'displayName' | 'avatar'>[]> {
  const data = await api.get<{ users: Pick<User, 'id' | 'username' | 'displayName' | 'avatar'>[] }>(
    `/users/search?q=${encodeURIComponent(query)}`
  );
  return data.users;
}

export const userService = {
  getMe,
  update,
  searchByUsername,
};
