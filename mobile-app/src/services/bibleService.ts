import { 
  ALL_BIBLE_BOOKS, 
  BibleBook, 
  BibleVerse, 
  BibleChapter 
} from '../constants/bibleData';
import { OFFLINE_BIBLE_REGISTRY } from '../data/bible';

class BibleService {
  // Get all canonical books
  getBooks(): BibleBook[] {
    return ALL_BIBLE_BOOKS;
  }

  // Get book details by English or Telugu name
  getBook(bookName: string): BibleBook {
    const cleanName = bookName.trim().toLowerCase();
    const found = ALL_BIBLE_BOOKS.find(b => 
      b.english.toLowerCase() === cleanName || 
      b.telugu.toLowerCase() === cleanName ||
      b.english.replace(/\s+/g, '').toLowerCase() === cleanName ||
      b.telugu.replace(/\s+/g, '').toLowerCase() === cleanName
    );
    return found || ALL_BIBLE_BOOKS[0];
  }

  // Get exact chapter count for a book
  getChapterCount(bookName: string): number {
    const book = this.getBook(bookName);
    const key = book.english.replace(/\s+/g, '');
    const bookData = OFFLINE_BIBLE_REGISTRY[key];
    if (bookData && bookData.eng && Array.isArray(bookData.eng)) {
      return bookData.eng.length;
    }
    return book.chaptersCount || 10;
  }

  // Get exact, authentic Bible passage for any Book and Chapter from bundled offline dataset
  async getPassage(bookEnglish: string, chapter: string): Promise<{ eng: BibleVerse[]; tel: BibleVerse[] }> {
    const book = this.getBook(bookEnglish);
    const key = book.english.replace(/\s+/g, '');
    const bookData = OFFLINE_BIBLE_REGISTRY[key];

    if (!bookData) {
      console.warn(`Book data not found for ${key}`);
      return { eng: [], tel: [] };
    }

    const engChapters: BibleChapter[] = bookData.eng || [];
    const telChapters: BibleChapter[] = bookData.tel || [];

    const engCh = engChapters.find(c => c.chapter === chapter || c.chapter === chapter.toString());
    const telCh = telChapters.find(c => c.chapter === chapter || c.chapter === chapter.toString());

    return {
      eng: engCh ? engCh.verses : [],
      tel: telCh ? telCh.verses : []
    };
  }

  // Search entire 66-book Bible offline across all verses
  async searchEntireBible(query: string, language: 'Telugu' | 'English'): Promise<Array<{
    book: BibleBook;
    chapter: string;
    verse: string | number;
    text: string;
  }>> {
    const results: Array<{
      book: BibleBook;
      chapter: string;
      verse: string | number;
      text: string;
    }> = [];

    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return results;

    // 1. Check if query is a direct Book reference (e.g. "John 3:16", "యోహాను 3 16", "Psalms 23", "Genesis 1:1")
    for (const book of ALL_BIBLE_BOOKS) {
      const engMatch = cleanQuery.startsWith(book.english.toLowerCase());
      const telMatch = cleanQuery.startsWith(book.telugu.toLowerCase());

      if (engMatch || telMatch) {
        const remaining = cleanQuery.replace(engMatch ? book.english.toLowerCase() : book.telugu.toLowerCase(), '').trim();
        const parts = remaining.split(/[:\s]+/);
        const targetChapter = parts[0] ? parts[0].trim() : '1';
        const targetVerse = parts[1] ? parts[1].trim() : null;

        const key = book.english.replace(/\s+/g, '');
        const bookData = OFFLINE_BIBLE_REGISTRY[key];
        if (bookData) {
          const chapters: BibleChapter[] = language === 'Telugu' ? (bookData.tel || []) : (bookData.eng || []);
          const ch = chapters.find(c => c.chapter === targetChapter);
          if (ch && ch.verses) {
            if (targetVerse) {
              const v = ch.verses.find(verse => verse.verse.toString() === targetVerse);
              if (v) {
                results.push({
                  book,
                  chapter: ch.chapter,
                  verse: v.verse,
                  text: v.text,
                });
                return results;
              }
            } else {
              // Return all verses of that chapter
              for (const v of ch.verses) {
                results.push({
                  book,
                  chapter: ch.chapter,
                  verse: v.verse,
                  text: v.text,
                });
              }
              return results;
            }
          }
        }
      }
    }

    // 2. Keyword Search across all 66 books and verses in the Bible
    for (const book of ALL_BIBLE_BOOKS) {
      const key = book.english.replace(/\s+/g, '');
      const bookData = OFFLINE_BIBLE_REGISTRY[key];
      if (!bookData) continue;

      const chapters: BibleChapter[] = language === 'Telugu' ? (bookData.tel || []) : (bookData.eng || []);
      for (const ch of chapters) {
        if (!ch.verses) continue;
        for (const v of ch.verses) {
          if (v.text && v.text.toLowerCase().includes(cleanQuery)) {
            results.push({
              book,
              chapter: ch.chapter,
              verse: v.verse,
              text: v.text
            });
            if (results.length >= 100) return results;
          }
        }
      }
    }

    return results;
  }
}

export const bibleService = new BibleService();
