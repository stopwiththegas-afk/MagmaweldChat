import { io, Socket } from 'socket.io-client';

import { API_BASE_URL, getToken } from './api';
import type { ApiMessage } from './chatService';

type MessageHandler = (message: ApiMessage & { isOwn: boolean }) => void;

class SocketService {
  private socket: Socket | null = null;
  private currentUserId: string | null = null;

  async connect(userId: string): Promise<void> {
    if (this.socket?.connected) return;
    this.currentUserId = userId;
    const token = await getToken();

    this.socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.currentUserId = null;
  }

  joinChat(chatId: string): void {
    this.socket?.emit('join_chat', chatId);
  }

  leaveChat(chatId: string): void {
    this.socket?.emit('leave_chat', chatId);
  }

  sendMessage(
    chatId: string,
    text: string,
    callback?: (result: { ok?: boolean; error?: string; message?: ApiMessage }) => void
  ): void {
    this.socket?.emit('send_message', { chatId, text }, callback);
  }

  onNewMessage(handler: MessageHandler): () => void {
    const wrapped = (msg: ApiMessage) => {
      handler({ ...msg, isOwn: msg.senderId === this.currentUserId });
    };
    this.socket?.on('new_message', wrapped);
    return () => { this.socket?.off('new_message', wrapped); };
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
