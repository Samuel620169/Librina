
export enum AppView {
  LIBRARY = 'LIBRARY',
  CUSTOMIZE = 'CUSTOMIZE',
  READER = 'READER',
  STATS = 'STATS',
  SETTINGS = 'SETTINGS',
  CAMERA_IMPORT = 'CAMERA_IMPORT'
}

export type ReaderMode = 'audio' | 'read';

export interface BookSticker {
  id: string;
  src: string; // Emoji char or Base64 URL
  type: 'emoji' | 'image';
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  scale: number;
  rotation?: number;
}

export interface BookCoverText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: 'sans' | 'serif' | 'cursive';
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
}

export interface PageSticker {
  id: string;
  bookId: string;
  pageIndex: number;
  src: string; // URL (base64) or Emoji
  type: 'emoji' | 'image';
  x: number;
  y: number;
  rotation: number;
  mode: ReaderMode; 
  createdAt: number;
}

export interface UserSticker {
  id: string;
  src: string;
  type: 'image';
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Emoji
  fontFamily: 'sans' | 'serif' | 'cursive' | 'dyslexic';
  bookIds: string[]; // IDs of books in this category
  createdAt: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  
  // Customization
  stickers?: BookSticker[];
  coverTexts?: BookCoverText[]; // New Text Layers
  originalMetadata?: {
    title: string;
    coverUrl?: string;
  };

  // Content & File Data
  content: string; 
  base64: string; 
  mimeType: string; 
  originalName: string;
  size: number; 

  addedAt: number;
  lastReadAt: number;
  progress: number; 
  currentParagraphIndex: number; 
  currentPageIndex?: number;
  lastWordIndex?: number; 
  genre?: string;
  isFavorite?: boolean;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

export interface Highlight {
  id: string;
  bookId: string;
  text: string;
  color: HighlightColor;
  mode: ReaderMode;
  pageIndex: number;
  rangeStart: number; 
  rangeEnd: number;   
  createdAt: number;
  note?: string;
}

export type BookmarkStyle = 'ribbon' | 'clip' | 'tag';

export interface Bookmark {
  id: string;
  bookId: string;
  pageIndex: number;
  createdAt: number;
  label: string; 
  color: HighlightColor;
  style: BookmarkStyle;
}

export interface GlossaryItem {
  id: string;
  word: string;
  definition: string;
  userNotes?: string;
  createdAt: number;
}

export interface ReadingSession {
  date: string; // YYYY-MM-DD
  minutes: number;
  pagesRead: number;
  lastUpdated: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'sepia';
  fontFamily: 'sans' | 'serif' | 'dyslexic';
  fontSize: number;
  lineHeight: number;
  
  // TTS Settings
  ttsSpeed: number;
  ttsPitch: number;
  ttsVoiceURI: string | null;

  // Karaoke / Reading Settings
  karaokeSpeed: number; 
  karaokeOpacity: number; 
  karaokeColor: 'yellow' | 'blue' | 'gray'; 
}
