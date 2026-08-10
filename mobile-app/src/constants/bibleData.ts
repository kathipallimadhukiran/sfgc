export interface BibleBook {
  english: string;
  telugu: string;
  testament: 'Old' | 'New';
  chaptersCount: number;
}

export interface BibleVerse {
  verse: number | string;
  text: string;
}

export interface BibleChapter {
  chapter: string;
  verses: BibleVerse[];
}

export interface BibleBookData {
  book: string;
  telName: string;
  eng: BibleChapter[];
  tel: BibleChapter[];
}

// Complete canonical list of all 66 Books of the Holy Bible with exact chapter counts
export const ALL_BIBLE_BOOKS: BibleBook[] = [
  // Old Testament (39 books)
  { english: 'Genesis', telugu: 'ఆదికాండము', testament: 'Old', chaptersCount: 50 },
  { english: 'Exodus', telugu: 'నిర్గమకాండము', testament: 'Old', chaptersCount: 40 },
  { english: 'Leviticus', telugu: 'లేవీయకాండము', testament: 'Old', chaptersCount: 27 },
  { english: 'Numbers', telugu: 'సంఖ్యాకాండము', testament: 'Old', chaptersCount: 36 },
  { english: 'Deuteronomy', telugu: 'ద్వితీయోపదేశకాండము', testament: 'Old', chaptersCount: 34 },
  { english: 'Joshua', telugu: 'యెహోషువ', testament: 'Old', chaptersCount: 24 },
  { english: 'Judges', telugu: 'న్యాయాధిపతులు', testament: 'Old', chaptersCount: 21 },
  { english: 'Ruth', telugu: 'రూతు', testament: 'Old', chaptersCount: 4 },
  { english: '1 Samuel', telugu: 'సమూయేలు మొదటి గ్రంథము', testament: 'Old', chaptersCount: 31 },
  { english: '2 Samuel', telugu: 'సమూయేలు రెండవ గ్రంథము', testament: 'Old', chaptersCount: 24 },
  { english: '1 Kings', telugu: 'రాజుల మొదటి గ్రంథము', testament: 'Old', chaptersCount: 22 },
  { english: '2 Kings', telugu: 'రాజుల రెండవ గ్రంథము', testament: 'Old', chaptersCount: 25 },
  { english: '1 Chronicles', telugu: 'దినవృత్తాంతముల మొదటి గ్రంథము', testament: 'Old', chaptersCount: 29 },
  { english: '2 Chronicles', telugu: 'దినవృత్తాంతముల రెండవ గ్రంథము', testament: 'Old', chaptersCount: 36 },
  { english: 'Ezra', telugu: 'ఎజ్రా', testament: 'Old', chaptersCount: 10 },
  { english: 'Nehemiah', telugu: 'నెహెమ్యా', testament: 'Old', chaptersCount: 13 },
  { english: 'Esther', telugu: 'ఎస్తేరు', testament: 'Old', chaptersCount: 10 },
  { english: 'Job', telugu: 'యోబు', testament: 'Old', chaptersCount: 42 },
  { english: 'Psalms', telugu: 'కీర్తనలు', testament: 'Old', chaptersCount: 150 },
  { english: 'Proverbs', telugu: 'సామెతలు', testament: 'Old', chaptersCount: 31 },
  { english: 'Ecclesiastes', telugu: 'ప్రసంగి', testament: 'Old', chaptersCount: 12 },
  { english: 'Song of Solomon', telugu: 'పరమగీతము', testament: 'Old', chaptersCount: 8 },
  { english: 'Isaiah', telugu: 'యెషయా', testament: 'Old', chaptersCount: 66 },
  { english: 'Jeremiah', telugu: 'యిర్మియా', testament: 'Old', chaptersCount: 52 },
  { english: 'Lamentations', telugu: 'విలాపవాక్యములు', testament: 'Old', chaptersCount: 5 },
  { english: 'Ezekiel', telugu: 'యెహెజ్కేలు', testament: 'Old', chaptersCount: 48 },
  { english: 'Daniel', telugu: 'దానియేలు', testament: 'Old', chaptersCount: 12 },
  { english: 'Hosea', telugu: 'హోషేయ', testament: 'Old', chaptersCount: 14 },
  { english: 'Joel', telugu: 'యోవేలు', testament: 'Old', chaptersCount: 3 },
  { english: 'Amos', telugu: 'ఆమోసు', testament: 'Old', chaptersCount: 9 },
  { english: 'Obadiah', telugu: 'ఓబద్యా', testament: 'Old', chaptersCount: 1 },
  { english: 'Jonah', telugu: 'యోనా', testament: 'Old', chaptersCount: 4 },
  { english: 'Micah', telugu: 'మీకా', testament: 'Old', chaptersCount: 7 },
  { english: 'Nahum', telugu: 'నహూము', testament: 'Old', chaptersCount: 3 },
  { english: 'Habakkuk', telugu: 'హబక్కూకు', testament: 'Old', chaptersCount: 3 },
  { english: 'Zephaniah', telugu: 'జెఫన్యా', testament: 'Old', chaptersCount: 3 },
  { english: 'Haggai', telugu: 'హగ్గయి', testament: 'Old', chaptersCount: 2 },
  { english: 'Zechariah', telugu: 'జెకర్యా', testament: 'Old', chaptersCount: 14 },
  { english: 'Malachi', telugu: 'మలాకీ', testament: 'Old', chaptersCount: 4 },

  // New Testament (27 books)
  { english: 'Matthew', telugu: 'మత్తయి', testament: 'New', chaptersCount: 28 },
  { english: 'Mark', telugu: 'మార్కు', testament: 'New', chaptersCount: 16 },
  { english: 'Luke', telugu: 'లూకా', testament: 'New', chaptersCount: 24 },
  { english: 'John', telugu: 'యోహాను', testament: 'New', chaptersCount: 21 },
  { english: 'Acts', telugu: 'అపొస్తలుల కార్యములు', testament: 'New', chaptersCount: 28 },
  { english: 'Romans', telugu: 'రోమీయులకు', testament: 'New', chaptersCount: 16 },
  { english: '1 Corinthians', telugu: 'కొరింథీయులకు మొదటి పత్రిక', testament: 'New', chaptersCount: 16 },
  { english: '2 Corinthians', telugu: 'కొరింథీయులకు రెండవ పత్రిక', testament: 'New', chaptersCount: 13 },
  { english: 'Galatians', telugu: 'గలతీయులకు', testament: 'New', chaptersCount: 6 },
  { english: 'Ephesians', telugu: 'ఎఫెసీయులకు', testament: 'New', chaptersCount: 6 },
  { english: 'Philippians', telugu: 'ఫిలిప్పీయులకు', testament: 'New', chaptersCount: 4 },
  { english: 'Colossians', telugu: 'కొలొస్సయులకు', testament: 'New', chaptersCount: 4 },
  { english: '1 Thessalonians', telugu: 'థెస్సలొనీకయులకు మొదటి పత్రిక', testament: 'New', chaptersCount: 5 },
  { english: '2 Thessalonians', telugu: 'థెస్సలొనీకయులకు రెండవ పత్రిక', testament: 'New', chaptersCount: 3 },
  { english: '1 Timothy', telugu: 'తిమోతికి మొదటి పత్రిక', testament: 'New', chaptersCount: 6 },
  { english: '2 Timothy', telugu: 'తిమోతికి రెండవ పత్రిక', testament: 'New', chaptersCount: 4 },
  { english: 'Titus', telugu: 'తీతుకు', testament: 'New', chaptersCount: 3 },
  { english: 'Philemon', telugu: 'ఫిలేమోనుకు', testament: 'New', chaptersCount: 1 },
  { english: 'Hebrews', telugu: 'హెబ్రీయులకు', testament: 'New', chaptersCount: 13 },
  { english: 'James', telugu: 'యాకోబు', testament: 'New', chaptersCount: 5 },
  { english: '1 Peter', telugu: 'పేతురు మొదటి పత్రిక', testament: 'New', chaptersCount: 5 },
  { english: '2 Peter', telugu: 'పేతురు రెండవ పత్రిక', testament: 'New', chaptersCount: 3 },
  { english: '1 John', telugu: 'యోహాను మొదటి పత్రిక', testament: 'New', chaptersCount: 5 },
  { english: '2 John', telugu: 'యోహాను రెండవ పత్రిక', testament: 'New', chaptersCount: 1 },
  { english: '3 John', telugu: 'యోహాను మూడవ పత్రిక', testament: 'New', chaptersCount: 1 },
  { english: 'Jude', telugu: 'యూదా', testament: 'New', chaptersCount: 1 },
  { english: 'Revelation', telugu: 'ప్రకటన గ్రంథము', testament: 'New', chaptersCount: 22 }
];
