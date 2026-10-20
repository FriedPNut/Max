export const EVENT_CHAT_PAGE_SIZE = 30;

export type EventMessageRecord = {
  id: string;
  event_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type EventChatProfile = {
  id: string;
  name: string;
  username: string | null;
};
