const fs = require('fs');
const path = require('path');
const https = require('https');

const BIBLE_BOOKS = [
  // Old Testament (39)
  { key: 'Genesis', engFile: 'Genesis.json', telFile: 'Genesis.json', telName: 'ఆదికాండము' },
  { key: 'Exodus', engFile: 'Exodus.json', telFile: 'Exodus.json', telName: 'నిర్గమకాండము' },
  { key: 'Leviticus', engFile: 'Leviticus.json', telFile: 'Leviticus.json', telName: 'లేవీయకాండము' },
  { key: 'Numbers', engFile: 'Numbers.json', telFile: 'Numbers.json', telName: 'సంఖ్యాకాండము' },
  { key: 'Deuteronomy', engFile: 'Deuteronomy.json', telFile: 'Deuteronomy.json', telName: 'ద్వితీయోపదేశకాండము' },
  { key: 'Joshua', engFile: 'Joshua.json', telFile: 'Joshua.json', telName: 'యెహోషువ' },
  { key: 'Judges', engFile: 'Judges.json', telFile: 'Judges.json', telName: 'న్యాయాధిపతులు' },
  { key: 'Ruth', engFile: 'Ruth.json', telFile: 'Ruth.json', telName: 'రూతు' },
  { key: '1Samuel', engFile: '1Samuel.json', telFile: '1 Samuel.json', telName: 'సమూయేలు మొదటి గ్రంథము' },
  { key: '2Samuel', engFile: '2Samuel.json', telFile: '2 Samuel.json', telName: 'సమూయేలు రెండవ గ్రంథము' },
  { key: '1Kings', engFile: '1Kings.json', telFile: '1 Kings.json', telName: 'రాజుల మొదటి గ్రంథము' },
  { key: '2Kings', engFile: '2Kings.json', telFile: '2 Kings.json', telName: 'రాజుల రెండవ గ్రంథము' },
  { key: '1Chronicles', engFile: '1Chronicles.json', telFile: '1 Chronicles.json', telName: 'దినవృత్తాంతముల మొదటి గ్రంథము' },
  { key: '2Chronicles', engFile: '2Chronicles.json', telFile: '2 Chronicles.json', telName: 'దినవృత్తాంతముల రెండవ గ్రంథము' },
  { key: 'Ezra', engFile: 'Ezra.json', telFile: 'Ezra.json', telName: 'ఎజ్రా' },
  { key: 'Nehemiah', engFile: 'Nehemiah.json', telFile: 'Nehemiah.json', telName: 'నెహెమ్యా' },
  { key: 'Esther', engFile: 'Esther.json', telFile: 'Esther.json', telName: 'ఎస్తేరు' },
  { key: 'Job', engFile: 'Job.json', telFile: 'Job.json', telName: 'యోబు' },
  { key: 'Psalms', engFile: 'Psalms.json', telFile: 'Psalms.json', telName: 'కీర్తనలు' },
  { key: 'Proverbs', engFile: 'Proverbs.json', telFile: 'Proverbs.json', telName: 'సామెతలు' },
  { key: 'Ecclesiastes', engFile: 'Ecclesiastes.json', telFile: 'Ecclesiastes.json', telName: 'ప్రసంగి' },
  { key: 'SongofSolomon', engFile: 'SongofSolomon.json', telFile: 'Song of Songs.json', telName: 'పరమగీతము' },
  { key: 'Isaiah', engFile: 'Isaiah.json', telFile: 'Isaiah.json', telName: 'యెషయా' },
  { key: 'Jeremiah', engFile: 'Jeremiah.json', telFile: 'Jeremiah.json', telName: 'యిర్మియా' },
  { key: 'Lamentations', engFile: 'Lamentations.json', telFile: 'Lamentations.json', telName: 'విలాపవాక్యములు' },
  { key: 'Ezekiel', engFile: 'Ezekiel.json', telFile: 'Ezekiel.json', telName: 'యెహెజ్కేలు' },
  { key: 'Daniel', engFile: 'Daniel.json', telFile: 'Daniel.json', telName: 'దానియేలు' },
  { key: 'Hosea', engFile: 'Hosea.json', telFile: 'Hosea.json', telName: 'హోషేయ' },
  { key: 'Joel', engFile: 'Joel.json', telFile: 'Joel.json', telName: 'యోవేలు' },
  { key: 'Amos', engFile: 'Amos.json', telFile: 'Amos.json', telName: 'ఆమోసు' },
  { key: 'Obadiah', engFile: 'Obadiah.json', telFile: 'Obadiah.json', telName: 'ఓబద్యా' },
  { key: 'Jonah', engFile: 'Jonah.json', telFile: 'Jonah.json', telName: 'యోనా' },
  { key: 'Micah', engFile: 'Micah.json', telFile: 'Micah.json', telName: 'మీకా' },
  { key: 'Nahum', engFile: 'Nahum.json', telFile: 'Nahum.json', telName: 'నహూము' },
  { key: 'Habakkuk', engFile: 'Habakkuk.json', telFile: 'Habakkuk.json', telName: 'హబక్కూకు' },
  { key: 'Zephaniah', engFile: 'Zephaniah.json', telFile: 'Zephaniah.json', telName: 'జెఫన్యా' },
  { key: 'Haggai', engFile: 'Haggai.json', telFile: 'Haggai.json', telName: 'హగ్గయి' },
  { key: 'Zechariah', engFile: 'Zechariah.json', telFile: 'Zechariah.json', telName: 'జెకర్యా' },
  { key: 'Malachi', engFile: 'Malachi.json', telFile: 'Malachi.json', telName: 'మలాకీ' },

  // New Testament (27)
  { key: 'Matthew', engFile: 'Matthew.json', telFile: 'Matthew.json', telName: 'మత్తయి' },
  { key: 'Mark', engFile: 'Mark.json', telFile: 'Mark.json', telName: 'మార్కు' },
  { key: 'Luke', engFile: 'Luke.json', telFile: 'Luke.json', telName: 'లూకా' },
  { key: 'John', engFile: 'John.json', telFile: 'John.json', telName: 'యోహాను' },
  { key: 'Acts', engFile: 'Acts.json', telFile: 'Acts.json', telName: 'అపొస్తలుల కార్యములు' },
  { key: 'Romans', engFile: 'Romans.json', telFile: 'Romans.json', telName: 'రోమీయులకు' },
  { key: '1Corinthians', engFile: '1Corinthians.json', telFile: '1 Corinthians.json', telName: 'కొరింథీయులకు మొదటి పత్రిక' },
  { key: '2Corinthians', engFile: '2Corinthians.json', telFile: '2 Corinthians.json', telName: 'కొరింథీయులకు రెండవ పత్రిక' },
  { key: 'Galatians', engFile: 'Galatians.json', telFile: 'Galatians.json', telName: 'గలతీయులకు' },
  { key: 'Ephesians', engFile: 'Ephesians.json', telFile: 'Ephesians.json', telName: 'ఎఫెసీయులకు' },
  { key: 'Philippians', engFile: 'Philippians.json', telFile: 'Philippians.json', telName: 'ఫిలిప్పీయులకు' },
  { key: 'Colossians', engFile: 'Colossians.json', telFile: 'Colossians.json', telName: 'కొలొస్సయులకు' },
  { key: '1Thessalonians', engFile: '1Thessalonians.json', telFile: '1 Thessalonians.json', telName: 'థెస్సలొనీకయులకు మొదటి పత్రిక' },
  { key: '2Thessalonians', engFile: '2Thessalonians.json', telFile: '2 Thessalonians.json', telName: 'థెస్సలొనీకయులకు రెండవ పత్రిక' },
  { key: '1Timothy', engFile: '1Timothy.json', telFile: '1 Timothy.json', telName: 'తిమోతికి మొదటి పత్రిక' },
  { key: '2Timothy', engFile: '2Timothy.json', telFile: '2 Timothy.json', telName: 'తిమోతికి రెండవ పత్రిక' },
  { key: 'Titus', engFile: 'Titus.json', telFile: 'Titus.json', telName: 'తీతుకు' },
  { key: 'Philemon', engFile: 'Philemon.json', telFile: 'Philemon.json', telName: 'ఫిలేమోనుకు' },
  { key: 'Hebrews', engFile: 'Hebrews.json', telFile: 'Hebrews.json', telName: 'హెబ్రీయులకు' },
  { key: 'James', engFile: 'James.json', telFile: 'James.json', telName: 'యాకోబు' },
  { key: '1Peter', engFile: '1Peter.json', telFile: '1 Peter.json', telName: 'పేతురు మొదటి పత్రిక' },
  { key: '2Peter', engFile: '2Peter.json', telFile: '2 Peter.json', telName: 'పేతురు రెండవ పత్రిక' },
  { key: '1John', engFile: '1John.json', telFile: '1 John.json', telName: 'యోహాను మొదటి పత్రిక' },
  { key: '2John', engFile: '2John.json', telFile: '2 John.json', telName: 'యోహాను రెండవ పత్రిక' },
  { key: '3John', engFile: '3John.json', telFile: '3 John.json', telName: 'యోహాను మూడవ పత్రిక' },
  { key: 'Jude', engFile: 'Jude.json', telFile: 'Jude.json', telName: 'యూదా' },
  { key: 'Revelation', engFile: 'Revelation.json', telFile: 'Revelation.json', telName: 'ప్రకటన గ్రంథము' }
];

const targetDir = path.join(__dirname, '..', 'src', 'data', 'bible');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(encodeURI(url), (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function downloadAll() {
  console.log(`Starting download of full bilingual Bible for ${BIBLE_BOOKS.length} books...`);
  
  let totalVerses = 0;
  let successCount = 0;

  for (let i = 0; i < BIBLE_BOOKS.length; i++) {
    const book = BIBLE_BOOKS[i];
    console.log(`[${i + 1}/${BIBLE_BOOKS.length}] Downloading ${book.key}...`);

    const engUrl = `https://raw.githubusercontent.com/aruljohn/Bible-kjv/master/${book.engFile}`;
    const telUrl = `https://raw.githubusercontent.com/aruljohn/Bible-telugu/master/${book.telFile}`;

    try {
      const [engData, telData] = await Promise.all([
        fetchJson(engUrl),
        fetchJson(telUrl)
      ]);

      const bookObj = {
        book: book.key,
        telName: book.telName,
        eng: engData.chapters || [],
        tel: telData.chapters || []
      };

      // Save individual book JSON in src/data/bible/<key>.json
      fs.writeFileSync(
        path.join(targetDir, `${book.key}.json`),
        JSON.stringify(bookObj),
        'utf8'
      );

      let bookVerseCount = 0;
      engData.chapters.forEach(c => bookVerseCount += (c.verses ? c.verses.length : 0));
      totalVerses += bookVerseCount;
      successCount++;
      console.log(`  ✓ ${book.key}: ${engData.chapters.length} chapters, ${bookVerseCount} verses (English & Telugu)`);
    } catch (err) {
      console.error(`  ✗ Error downloading ${book.key}:`, err.message);
    }
  }

  // Create an index file that maps all books
  const indexTsContent = `// Auto-generated Complete Offline Bible Registry
${BIBLE_BOOKS.map(b => `import ${b.key}Data from './${b.key}.json';`).join('\n')}

export const OFFLINE_BIBLE_REGISTRY: Record<string, any> = {
${BIBLE_BOOKS.map(b => `  '${b.key}': ${b.key}Data,`).join('\n')}
};
`;

  fs.writeFileSync(path.join(targetDir, 'index.ts'), indexTsContent, 'utf8');

  console.log(`\n======================================================`);
  console.log(`COMPLETE BIBLE DOWNLOAD FINISHED!`);
  console.log(`Successfully bundled: ${successCount} / ${BIBLE_BOOKS.length} books`);
  console.log(`Total verses in English & Telugu: ${totalVerses}`);
  console.log(`Saved to: ${targetDir}`);
  console.log(`======================================================`);
}

downloadAll();
