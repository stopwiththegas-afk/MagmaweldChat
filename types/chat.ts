export type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
};

export type Message = {
  id: string;
  chatId: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
};
