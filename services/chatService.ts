import { api } from './api';

export interface ChatSummary {
  id: string;
  isGroup?: boolean;
  name: string;
  username: string;
  otherUserId: string | null;
  avatar: string | null;
  lastMessage: string;
  lastMessageSenderName?: string | null;
  timestamp: string;
  unreadCount: number;
  participantCount?: number;
}

export interface ApiMessage {
  id: string;
  chatId: string;
  text: string;
  senderId: string | null;
  senderName: string | null;
  senderUsername: string | null;
  senderAvatar: string | null;
  timestamp: string;
  isOwn: boolean;
}

async function getChats(): Promise<ChatSummary[]> {
  const data = await api.get<{ chats: ChatSummary[] }>('/chats');
  return data.chats;
}

async function openOrCreateChat(username: string): Promise<string> {
  const data = await api.post<{ chatId: string }>('/chats', { username });
  return data.chatId;
}

export interface CreateGroupParams {
  name: string;
  avatar?: string | null;
  participantIds: string[];
}

async function createGroup(params: CreateGroupParams): Promise<string> {
  const data = await api.post<{ chatId: string }>('/chats', {
    name: params.name,
    avatar: params.avatar ?? undefined,
    participantIds: params.participantIds,
  });
  return data.chatId;
}

async function leaveGroup(chatId: string): Promise<void> {
  await api.post(`/chats/${chatId}/leave`);
}

async function addGroupParticipants(chatId: string, participantIds: string[]): Promise<void> {
  await api.post(`/chats/${chatId}/participants`, { participantIds });
}

async function removeGroupParticipant(chatId: string, userId: string): Promise<void> {
  await api.delete(`/chats/${chatId}/participants/${userId}`);
}

export interface UpdateGroupParams {
  name?: string;
  avatar?: string | null;
}

async function updateGroup(chatId: string, params: UpdateGroupParams): Promise<void> {
  const body: { name?: string; avatar?: string | null } = {};
  if (params.name !== undefined) body.name = params.name;
  if (params.avatar !== undefined) body.avatar = params.avatar;
  await api.patch(`/chats/${chatId}`, body);
}

async function getMessages(chatId: string, before?: string): Promise<ApiMessage[]> {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  const data = await api.get<{ messages: ApiMessage[] }>(`/chats/${chatId}/messages${query}`);
  return data.messages;
}

async function sendMessage(chatId: string, text: string): Promise<ApiMessage> {
  const data = await api.post<{ message: ApiMessage }>(`/chats/${chatId}/messages`, { text });
  return data.message;
}

async function clearChatHistory(chatId: string): Promise<void> {
  await api.delete(`/chats/${chatId}/messages`);
}

async function deleteChat(chatId: string): Promise<void> {
  await api.delete(`/chats/${chatId}`);
}

export interface ChatInfo {
  chatId: string;
  blockedByOther: boolean;
  haveBlockedOther: boolean;
  isGroup?: boolean;
  name?: string;
  avatar?: string | null;
  adminId?: string | null;
  createdAt?: string;
  participants?: { id: string; username: string; displayName: string; avatar: string | null }[];
  admin?: { id: string; username: string; displayName: string; avatar: string | null } | null;
}

async function getChatInfo(chatId: string): Promise<ChatInfo> {
  const data = await api.get<ChatInfo>(`/chats/${chatId}`);
  return data;
}

async function blockUserInChat(chatId: string): Promise<void> {
  await api.post(`/chats/${chatId}/block`);
}

async function unblockUserInChat(chatId: string): Promise<void> {
  await api.delete(`/chats/${chatId}/block`);
}

export const chatService = {
  getChats,
  openOrCreateChat,
  createGroup,
  updateGroup,
  leaveGroup,
  addGroupParticipants,
  removeGroupParticipant,
  getMessages,
  sendMessage,
  clearChatHistory,
  deleteChat,
  getChatInfo,
  blockUserInChat,
  unblockUserInChat,
};
