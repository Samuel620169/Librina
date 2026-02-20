
import { Book, Highlight, GlossaryItem, ReadingSession, AppSettings, Bookmark, ReaderMode, PageSticker, UserSticker, Category } from '../types';

const DB_NAME = 'NanoReaderDB';
const DB_VERSION = 6; // Bumped version for categories

// Simple wrapper for IndexedDB
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject('Database error: ' + (event.target as any).error);

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('books')) {
        const booksStore = db.createObjectStore('books', { keyPath: 'id' });
        booksStore.createIndex('lastReadAt', 'lastReadAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('highlights')) {
        const highlightsStore = db.createObjectStore('highlights', { keyPath: 'id' });
        highlightsStore.createIndex('bookId', 'bookId', { unique: false });
      }
      if (!db.objectStoreNames.contains('bookmarks')) {
        const bookmarksStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
        bookmarksStore.createIndex('bookId', 'bookId', { unique: false });
      }
      if (!db.objectStoreNames.contains('pageStickers')) {
        const stickersStore = db.createObjectStore('pageStickers', { keyPath: 'id' });
        stickersStore.createIndex('bookId', 'bookId', { unique: false });
      }
      if (!db.objectStoreNames.contains('userStickers')) {
        db.createObjectStore('userStickers', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('glossary')) {
        db.createObjectStore('glossary', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('achievements')) {
        db.createObjectStore('achievements', { keyPath: 'id' });
      }
    };
  });
};

export const dbService = {
  async getAllBooks(): Promise<Book[]> {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(['books'], 'readonly');
      const store = transaction.objectStore('books');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  },

  async addBook(book: Book): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['books'], 'readwrite');
      const store = transaction.objectStore('books');
      const request = store.put(book);
      request.onsuccess = () => resolve();
      request.onerror = () => reject();
    });
  },

  async updateBook(book: Book): Promise<void> {
    return this.addBook(book);
  },

  async updateBookProgress(id: string, progress: number, currentPageIndex: number, lastWordIndex: number): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(['books'], 'readwrite');
    const store = transaction.objectStore('books');
    const getReq = store.get(id);
    
    getReq.onsuccess = () => {
      const book = getReq.result as Book;
      if (book) {
        book.progress = progress;
        book.currentPageIndex = currentPageIndex;
        book.lastWordIndex = lastWordIndex;
        book.lastReadAt = Date.now();
        store.put(book);
      }
    };
  },

  // --- Categories ---

  async addCategory(category: Category): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(['categories'], 'readwrite');
    transaction.objectStore('categories').put(category);
  },

  async getAllCategories(): Promise<Category[]> {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(['categories'], 'readonly');
      const request = transaction.objectStore('categories').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  },

  async deleteCategory(id: string): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(['categories'], 'readwrite');
    transaction.objectStore('categories').delete(id);
  },

  // --- Highlights ---

  async addHighlight(highlight: Highlight): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(['highlights'], 'readwrite');
    const store = transaction.objectStore('highlights');
    store.put(highlight);
  },

  async getHighlights(bookId: string, mode?: ReaderMode): Promise<Highlight[]> {
    const db = await openDB();
    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(['highlights'], 'readonly');
            const store = transaction.objectStore('highlights');
            const index = store.index('bookId');
            const request = index.getAll(bookId);
            request.onsuccess = () => {
                const results = request.result as Highlight[];
                if (mode) {
                    const filtered = results.filter(h => h.mode === mode);
                    resolve(filtered);
                } else {
                    resolve(results);
                }
            };
            request.onerror = () => resolve([]);
        } catch(e) {
            resolve([]);
        }
    });
  },

  async deleteHighlight(id: string): Promise<void> {
      const db = await openDB();
      const transaction = db.transaction(['highlights'], 'readwrite');
      transaction.objectStore('highlights').delete(id);
  },

  // --- Bookmarks ---

  async addBookmark(bookmark: Bookmark): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(['bookmarks'], 'readwrite');
    const store = transaction.objectStore('bookmarks');
    store.put(bookmark);
  },

  async getBookmarks(bookId: string): Promise<Bookmark[]> {
    const db = await openDB();
    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(['bookmarks'], 'readonly');
            const store = transaction.objectStore('bookmarks');
            const index = store.index('bookId');
            const request = index.getAll(bookId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
        } catch(e) {
            resolve([]);
        }
    });
  },

  async deleteBookmark(id: string): Promise<void> {
      const db = await openDB();
      const transaction = db.transaction(['bookmarks'], 'readwrite');
      transaction.objectStore('bookmarks').delete(id);
  },

  // --- Page Stickers ---

  async addPageSticker(sticker: PageSticker): Promise<void> {
      const db = await openDB();
      const transaction = db.transaction(['pageStickers'], 'readwrite');
      transaction.objectStore('pageStickers').put(sticker);
  },

  async updatePageSticker(id: string, x: number, y: number): Promise<void> {
      const db = await openDB();
      const transaction = db.transaction(['pageStickers'], 'readwrite');
      const store = transaction.objectStore('pageStickers');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
          const s = getReq.result as PageSticker;
          if (s) {
              s.x = x;
              s.y = y;
              store.put(s);
          }
      };
  },

  async getPageStickers(bookId: string, mode?: ReaderMode): Promise<PageSticker[]> {
      const db = await openDB();
      return new Promise((resolve) => {
          try {
              const transaction = db.transaction(['pageStickers'], 'readonly');
              const store = transaction.objectStore('pageStickers');
              const index = store.index('bookId');
              const request = index.getAll(bookId);
              request.onsuccess = () => {
                  const results = request.result as PageSticker[];
                  if (mode) {
                      // Filter by mode (or if mode is undefined for legacy stickers, default to 'read')
                      const filtered = results.filter(s => s.mode === mode);
                      resolve(filtered);
                  } else {
                      resolve(results);
                  }
              };
              request.onerror = () => resolve([]);
          } catch(e) {
              resolve([]);
          }
      });
  },

  async deletePageSticker(id: string): Promise<void> {
      const db = await openDB();
      const transaction = db.transaction(['pageStickers'], 'readwrite');
      transaction.objectStore('pageStickers').delete(id);
  },

  // --- User Stickers Library ---

  async saveUserSticker(sticker: UserSticker): Promise<void> {
      const db = await openDB();
      const transaction = db.transaction(['userStickers'], 'readwrite');
      transaction.objectStore('userStickers').put(sticker);
  },

  async getUserStickers(): Promise<UserSticker[]> {
      const db = await openDB();
      return new Promise((resolve) => {
          const transaction = db.transaction(['userStickers'], 'readonly');
          const request = transaction.objectStore('userStickers').getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve([]);
      });
  },

  async deleteUserSticker(id: string): Promise<void> {
      const db = await openDB();
      const transaction = db.transaction(['userStickers'], 'readwrite');
      transaction.objectStore('userStickers').delete(id);
  },

  // --- Sessions (Stats) ---

  async logReadingSession(minutes: number, pages: number): Promise<void> {
      if (minutes <= 0 && pages <= 0) return;

      const db = await openDB();
      const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const transaction = db.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      
      const request = store.get(dateKey);
      
      request.onsuccess = () => {
          const existing = request.result as ReadingSession;
          const updatedSession: ReadingSession = existing ? {
              date: dateKey,
              minutes: existing.minutes + minutes,
              pagesRead: existing.pagesRead + pages,
              lastUpdated: Date.now()
          } : {
              date: dateKey,
              minutes: minutes,
              pagesRead: pages,
              lastUpdated: Date.now()
          };
          store.put(updatedSession);
      };
  },

  async getSessions(): Promise<ReadingSession[]> {
      const db = await openDB();
      return new Promise((resolve) => {
          const transaction = db.transaction(['sessions'], 'readonly');
          const store = transaction.objectStore('sessions');
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
      });
  },

  // --- Achievements ---

  async getSeenAchievements(): Promise<string[]> {
      const db = await openDB();
      return new Promise((resolve) => {
          const transaction = db.transaction(['achievements'], 'readonly');
          const store = transaction.objectStore('achievements');
          const request = store.getAllKeys();
          request.onsuccess = () => resolve(request.result as string[]);
          request.onerror = () => resolve([]);
      });
  },

  async markAchievementAsSeen(id: string): Promise<void> {
      const db = await openDB();
      const transaction = db.transaction(['achievements'], 'readwrite');
      transaction.objectStore('achievements').put({ id, seenAt: Date.now() });
  },

  // --- Glossary ---

  async addGlossaryItem(item: GlossaryItem): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(['glossary'], 'readwrite');
    store: transaction.objectStore('glossary').put(item);
  },

  async getGlossary(): Promise<GlossaryItem[]> {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(['glossary'], 'readonly');
      const request = transaction.objectStore('glossary').getAll();
      request.onsuccess = () => resolve(request.result);
    });
  },

  // --- Settings ---

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(['settings'], 'readwrite');
    transaction.objectStore('settings').put({ id: 'user_settings', ...settings });
  },

  async getSettings(): Promise<AppSettings | null> {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const request = transaction.objectStore('settings').get('user_settings');
      request.onsuccess = () => resolve(request.result || null);
    });
  }
};
