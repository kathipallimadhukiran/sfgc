import { Request, Response } from 'express';

// Map common English Bible books to Telugu and vice versa
const BIBLE_BOOK_MAP: Record<string, string> = {
  'genesis': 'ఆదికాండము',
  'exodus': 'నిర్గమకాండము',
  'leviticus': 'లేవీయకాండము',
  'numbers': 'సంఖ్యాకాండము',
  'deuteronomy': 'ద్వితీయోపదేశకాండము',
  'joshua': 'యెహోషువ',
  'judges': 'న్యాయాధిపతులు',
  'ruth': 'రూతు',
  '1 samuel': '1 సమూయేలు',
  '2 samuel': '2 సమూయేలు',
  '1 kings': '1 రాజులు',
  '2 kings': '2 రాజులు',
  '1 chronicles': '1 దినవృత్తాంతములు',
  '2 chronicles': '2 దినవృత్తాంతములు',
  'ezra': 'ఎజ్రా',
  'nehemiah': 'నెహెమ్యా',
  'esther': 'ఎస్తేరు',
  'job': 'యోబు',
  'psalms': 'కీర్తనలు',
  'psalm': 'కీర్తనలు',
  'proverbs': 'సామెతలు',
  'ecclesiastes': 'ప్రసంగి',
  'song of solomon': 'పరమగీతము',
  'isaiah': 'యెషయా',
  'jeremiah': 'యిర్మియా',
  'lamentations': 'విలాపవాక్యములు',
  'ezekiel': 'యెహెజ్కేలు',
  'daniel': 'దానియేలు',
  'hosea': 'హోషేయ',
  'joel': 'యోవేలు',
  'amos': 'ఆమోసు',
  'obadiah': 'ఓబద్యా',
  'jonah': 'యోనా',
  'micah': 'మీకా',
  'nahum': 'నహూము',
  'habakkuk': 'హబక్కూకు',
  'zephaniah': 'జెఫన్యా',
  'haggai': 'హగ్గయి',
  'zechariah': 'జెకర్యా',
  'malachi': 'మలాకీ',
  'matthew': 'మత్తయి',
  'mark': 'మార్కు',
  'luke': 'లూకా',
  'john': 'యోహాను',
  'acts': 'అపొస్తలుల కార్యములు',
  'romans': 'రోమీయులకు',
  '1 corinthians': '1 కొరింథీయులకు',
  '2 corinthians': '2 కొరింథీయులకు',
  'galatians': 'గలతీయులకు',
  'ephesians': 'ఎఫెసీయులకు',
  'philippians': 'ఫిలిప్పీయులకు',
  'colossians': 'కొలొస్సయులకు',
  '1 thessalonians': '1 థెస్సలొనీకయులకు',
  '2 thessalonians': '2 థెస్సలొనీకయులకు',
  '1 timothy': '1 తిమోతికి',
  '2 timothy': '2 తిమోతికి',
  'titus': 'తీతుకు',
  'philemon': 'ఫిలేమోనుకు',
  'hebrews': 'హెబ్రీయులకు',
  'james': 'యాకోబు',
  '1 peter': '1 పేతురు',
  '2 peter': '2 పేతురు',
  '1 john': '1 యోహాను',
  '2 john': '2 యోహాను',
  '3 john': '3 యోహాను',
  'jude': 'యూదా',
  'revelation': 'ప్రకటన గ్రంథము'
};

// Telugu numbers word to digit mapping
const TELUGU_NUM_MAP: Record<string, string> = {
  'ఒకటి': '1', 'ఒకటో': '1', 'ఒకటవ': '1',
  'రెండు': '2', 'రెండో': '2', 'రెండవ': '2',
  'మూడు': '3', 'మూడో': '3', 'మూడవ': '3',
  'నాలుగు': '4', 'నాలుగో': '4', 'నాలుగవ': '4',
  'ఐదు': '5', 'ఐదో': '5', 'ఐదవ': '5',
  'ఆరు': '6', 'ఆరో': '6', 'ఆరవ': '6',
  'ఏడు': '7', 'ఏడో': '7', 'ఏడవ': '7',
  'ఎనిమిది': '8', 'ఎనిమిదో': '8', 'ఎనిమిదవ': '8',
  'తొమ్మిది': '9', 'తొమ్మిదో': '9', 'తొమ్మిదవ': '9',
  'పది': '10', 'పదో': '10', 'పదవ': '10',
  'పదకొండు': '11', 'పన్నెండు': '12', 'పదమూడు': '13',
  'పద్నాలుగు': '14', 'పదిహేను': '15', 'పదహారు': '16',
  'పదిహేడు': '17', 'పద్దెనిమిది': '18', 'పంతొమ్మిది': '19',
  'ఇరవై': '20', 'ఇరవై ఒకటి': '21', 'ఇరవై రెండు': '22',
  'ఇరవై మూడు': '23', 'ఇరవై నాలుగు': '24', 'ఇరవై ఐదు': '25',
  'ముప్పై': '30', 'నలభై': '40', 'యాభై': '50',
  'అధ్యాయం': ' ', 'వచనం': ':'
};

// Common Whisper silence hallucinations to filter out
const WHISPER_HALLUCINATIONS = [
  'thank you',
  'thank you.',
  'thank you very much',
  'thank you very much.',
  'thanks for watching',
  'thanks for watching.',
  'please subscribe',
  'subtitles by',
  'amara.org',
  'you',
  'bye',
];

const BIBLE_WHISPER_PROMPT = 'Holy Bible scripture search, God, Lord Jesus Christ, Gospel, worship songs, prayer, praise, church, Bible verses and chapters like John 3:16, Genesis 1, Psalms 23, Matthew, Romans, యోహాను, కీర్తనలు, ఆదికాండము, దేవుడు, ప్రభువు, యేసయ్య.';

export const transcribeAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { audioBase64, format, targetLanguage } = req.body;

    if (!audioBase64) {
      res.status(400).json({ success: false, message: 'No audio data provided' });
      return;
    }

    const langCode = targetLanguage === 'Telugu' ? 'te-IN' : 'en-US';
    const langShort = targetLanguage === 'Telugu' ? 'te' : 'en';
    console.log(`🎙️ [Backend Voice] Transcribing audio for language "${targetLanguage}" (${langCode}), payload length: ${audioBase64.length}`);

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    let recognizedText = '';

    // 1. Groq Whisper API (with Bible context prompt & temperature: 0 to prevent hallucinations)
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && !recognizedText) {
      try {
        console.log('🎙️ [Backend Voice] Attempting Groq Whisper Transcription...');
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: `audio/${format || 'm4a'}` });
        formData.append('file', blob, `audio.${format || 'm4a'}`);
        formData.append('model', 'whisper-large-v3');
        formData.append('language', langShort);
        formData.append('prompt', BIBLE_WHISPER_PROMPT);
        formData.append('temperature', '0');

        const groqResp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
          },
          body: formData,
        });

        if (groqResp.ok) {
          const groqData = await groqResp.json();
          recognizedText = groqData.text ? groqData.text.trim() : '';
          console.log(`🎙️ [Backend Voice] Groq Whisper raw text: "${recognizedText}"`);
        } else {
          console.log('Groq API error status:', groqResp.status, await groqResp.text());
        }
      } catch (groqErr) {
        console.log('Groq Whisper error:', groqErr);
      }
    }

    // 2. OpenAI Whisper API
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && !recognizedText) {
      try {
        console.log('🎙️ [Backend Voice] Attempting OpenAI Whisper Transcription...');
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: `audio/${format || 'm4a'}` });
        formData.append('file', blob, `audio.${format || 'm4a'}`);
        formData.append('model', 'whisper-1');
        formData.append('language', langShort);
        formData.append('prompt', BIBLE_WHISPER_PROMPT);
        formData.append('temperature', '0');

        const openAiResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: formData,
        });

        if (openAiResp.ok) {
          const openAiData = await openAiResp.json();
          recognizedText = openAiData.text ? openAiData.text.trim() : '';
          console.log(`🎙️ [Backend Voice] OpenAI Whisper raw text: "${recognizedText}"`);
        }
      } catch (openAiErr) {
        console.log('OpenAI Whisper error:', openAiErr);
      }
    }

    // 3. Filter out generic silence hallucinations
    if (recognizedText) {
      const cleanCheck = recognizedText.toLowerCase().trim().replace(/[.,!?;:]/g, '');
      if (WHISPER_HALLUCINATIONS.includes(cleanCheck) || cleanCheck === 'thank you') {
        console.log(`⚠️ [Backend Voice] Filtered out generic silence hallucination: "${recognizedText}"`);
        recognizedText = '';
      }
    }

    // 4. Normalize Telugu words and Bible references
    let translatedText = recognizedText;
    if (recognizedText) {
      // Normalize Telugu spoken numbers
      let normalized = recognizedText;
      for (const [word, digit] of Object.entries(TELUGU_NUM_MAP)) {
        normalized = normalized.replace(new RegExp(word, 'gi'), digit);
      }
      recognizedText = normalized.replace(/\s+/g, ' ').trim();

      // Normalize Bible Book Names
      const lower = recognizedText.toLowerCase().trim();
      for (const [engBook, telBook] of Object.entries(BIBLE_BOOK_MAP)) {
        if (lower.startsWith(engBook)) {
          if (targetLanguage === 'Telugu') {
            translatedText = lower.replace(engBook, telBook);
          }
          break;
        }
      }
    }

    console.log(`🎙️ [Backend Voice] Final Result -> Recognized: "${recognizedText}", Translated: "${translatedText}"`);

    res.status(200).json({
      success: true,
      transcript: recognizedText || translatedText || '',
      translatedQuery: translatedText || recognizedText || '',
      language: targetLanguage,
    });
  } catch (error: any) {
    console.error('Transcribe audio error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transcribe audio',
      error: error?.message || 'Server error',
    });
  }
};
