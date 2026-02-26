import { Chat, Message } from '@/types/chat';

export const mockChats: Chat[] = [
  {
    id: '1',
    name: 'Иван Петров',
    lastMessage: 'Привет! Как дела?',
    timestamp: '10:42',
    unreadCount: 1,
  },
];

export const mockMessages: Record<string, Message[]> = {
  '1': [
    { id: 'm1', chatId: '1', text: 'Привет!', timestamp: '10:40', isOwn: false },
    { id: 'm2', chatId: '1', text: 'Привет! Как дела?', timestamp: '10:42', isOwn: false },
  ],
};
