export type StoryItem = {
  id: string;
  postId: string;
  imageUrl: string | null;
  caption: string | null;
  createdAt: string;
  relativeTime: string;
};

export type StoryGroup = {
  id: string;
  userId: string;
  name: string;
  username: string | null;
  initial: string;
  avatarUrl: string | null;
  isMine: boolean;
  stories: StoryItem[];
};

export type StoryViewer = {
  id: string;
  name: string;
  username: string | null;
  initial: string;
  avatarUrl: string | null;
};

export type StoriesResult = {
  groups: StoryGroup[];
  viewer: StoryViewer;
};
