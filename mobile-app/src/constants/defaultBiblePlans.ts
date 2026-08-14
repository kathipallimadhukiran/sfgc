import { ALL_BIBLE_BOOKS } from './bibleData';

export interface DailyPortion {
  day: number;
  book: string;
  bookTelugu: string;
  startChapter: number;
  endChapter: number;
  versesSummary: string;
}

export interface BiblePlanData {
  planId: string;
  titleTelugu: string;
  titleEnglish: string;
  descriptionTelugu: string;
  descriptionEnglish: string;
  durationDays: number;
  dailyPortions: DailyPortion[];
}

// Generate canonical daily portions across all 66 books and 1,189 chapters
export const generateCanonicalPlan = (durationDays: number = 365): DailyPortion[] => {
  const portions: DailyPortion[] = [];
  let allChapters: Array<{ book: string; bookTelugu: string; chapter: number }> = [];
  
  for (const book of ALL_BIBLE_BOOKS) {
    for (let ch = 1; ch <= book.chaptersCount; ch++) {
      allChapters.push({
        book: book.english,
        bookTelugu: book.telugu,
        chapter: ch,
      });
    }
  }

  const totalChapters = allChapters.length;
  const targetDays = durationDays || 365;

  const basePerDay = Math.floor(totalChapters / targetDays);
  const extraCount = totalChapters % targetDays;

  let chapterCursor = 0;

  for (let day = 1; day <= targetDays; day++) {
    const countForToday = basePerDay + (day <= extraCount ? 1 : 0);
    if (countForToday <= 0 || chapterCursor >= totalChapters) break;

    const chunk = allChapters.slice(chapterCursor, chapterCursor + countForToday);
    chapterCursor += countForToday;

    if (chunk.length === 0) break;

    const first = chunk[0];
    const last = chunk[chunk.length - 1];

    let summary = '';
    if (first.book === last.book) {
      summary = first.chapter === last.chapter
        ? `${first.bookTelugu} ${first.chapter} / ${first.book} ${first.chapter}`
        : `${first.bookTelugu} ${first.chapter}–${last.chapter} / ${first.book} ${first.chapter}–${last.chapter}`;
    } else {
      summary = `${first.bookTelugu} ${first.chapter} – ${last.bookTelugu} ${last.chapter} / ${first.book} ${first.chapter} – ${last.book} ${last.chapter}`;
    }

    portions.push({
      day,
      book: first.book,
      bookTelugu: first.bookTelugu,
      startChapter: first.chapter,
      endChapter: last.chapter,
      versesSummary: summary,
    });
  }

  return portions;
};


export const DEFAULT_1_YEAR_PLAN: BiblePlanData = {
  planId: '1-year-canonical',
  titleTelugu: '1 సంవత్సర సమగ్ర బైబిల్ పఠన ప్రణాళిక',
  titleEnglish: '1-Year Complete Bible Reading Plan',
  descriptionTelugu: 'ఆదికాండము నుండి ప్రకటన గ్రంథము వరకు 365 రోజులలో బైబిల్ అంతా క్రమంగా అధ్యయనం చేయండి.',
  descriptionEnglish: 'Read through all 66 books and 1,189 chapters of the Holy Bible in 365 days.',
  durationDays: 365,
  dailyPortions: generateCanonicalPlan(365),
};

export const DEFAULT_2_YEAR_PLAN: BiblePlanData = {
  planId: '2-year-canonical',
  titleTelugu: '2 సంవత్సరాల బైబిల్ పఠన ప్రణాళిక',
  titleEnglish: '2-Year Bible Reading Plan',
  descriptionTelugu: 'రోజుకు 1-2 అధ్యాయాలు చదువుతూ 730 రోజులలో సులభంగా పూర్తి చేయండి.',
  descriptionEnglish: 'Read 1-2 chapters daily at a relaxed pace across 730 days.',
  durationDays: 730,
  dailyPortions: generateCanonicalPlan(730),
};
