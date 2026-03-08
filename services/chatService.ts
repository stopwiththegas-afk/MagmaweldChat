import { api } from './api';

export interface ChatSummary {
  id: string;
  name: string;
  username: string;
  otherUserId: string | null;
  avatar: string | null;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
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

async function getChatInfo(chatId: string): Promise<{ chatId: string; blockedByOther: boolean }> {
  const data = await api.get<{ chatId: string; blockedByOther: boolean }>(`/chats/${chatId}`);
  return data;
}

async function blockUserInChat(chatId: string): Promise<void> {
  await api.post(`/chats/${chatId}/block`);
}

export const chatService = {
  getChats,
  openOrCreateChat,
  getMessages,
  sendMessage,
  clearChatHistory,
  deleteChat,
  getChatInfo,
  blockUserInChat,
};
