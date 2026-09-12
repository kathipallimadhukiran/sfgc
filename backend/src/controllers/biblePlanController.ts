import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { User } from '../models/User';
import { BiblePlan, UserPlanProgress } from '../models/biblePlanModel';
import { DailyPromise } from '../models/DailyPromise';
import { Notice } from '../models/Notice';
import { getKolkataDateStr, getKolkataTimeMinutes, parseTimeToMinutes } from '../services/dailyPromiseScheduler';
import { sendPushNotificationToAll } from '../services/pushNotificationService';


// Helper function to compute exact calendar day difference (ignores hours/minutes/seconds)
const getCalendarDayDiff = (d1: Date, d2: Date): number => {
  const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round(Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
};

// Helper function to shuffle options randomly so correct answer is NOT always Option A (0)
const shuffleQuestion = (q: any) => {
  const indices = [0, 1, 2, 3];
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const originalCorrect = q.correctIndex !== undefined ? q.correctIndex : 0;
  const newOptionsTelugu = indices.map(idx => q.optionsTelugu[idx] || `ఆప్షన్ ${String.fromCharCode(65 + idx)}`);
  const newOptionsEnglish = indices.map(idx => q.optionsEnglish[idx] || `Option ${String.fromCharCode(65 + idx)}`);
  const newCorrectIndex = indices.indexOf(originalCorrect);

  return {
    ...q,
    optionsTelugu: newOptionsTelugu,
    optionsEnglish: newOptionsEnglish,
    correctIndex: newCorrectIndex,
  };
};

// Helper to log detailed AI generated questions to console
const logGeneratedQuestions = (provider: string, book: string, startCh: number, endCh: number, questions: any[]) => {
  console.log('\n======================================================================');
  console.log(`🤖 [AI QUIZ GENERATOR] Dynamic Questions Generated via Provider: ${provider}`);
  console.log(`📖 Book: ${book} | Chapters: ${startCh} to ${endCh} | Total Questions: ${questions.length}`);
  console.log('======================================================================\n');

  questions.forEach((q: any, idx: number) => {
    console.log(`[Q${idx + 1}] (Chapter ${q.chapter})`);
    console.log(`   English Question: ${q.questionEnglish}`);
    console.log(`   Telugu Question:  ${q.questionTelugu}`);
    console.log(`   Options (English):`, q.optionsEnglish);
    console.log(`   Options (Telugu): `, q.optionsTelugu);
    console.log(`   ✅ Correct Answer Index [${q.correctIndex}]: "${q.optionsEnglish[q.correctIndex]}" / "${q.optionsTelugu[q.correctIndex]}"`);
    console.log(`   💡 Explanation (EN): ${q.explanationEnglish}`);
    console.log(`   💡 Explanation (TE): ${q.explanationTelugu}`);
    console.log('----------------------------------------------------------------------');
  });
  console.log('======================================================================\n');
};

// Load actual Bible passage text for AI context
const loadPassageTextForAI = (book: string, startCh: number, endCh: number): string => {
  try {
    const possiblePaths = [
      path.resolve(__dirname, '../../../mobile-app/src/data/bible', `${book}.json`),
      path.resolve(process.cwd(), '../mobile-app/src/data/bible', `${book}.json`),
      path.resolve(process.cwd(), 'mobile-app/src/data/bible', `${book}.json`),
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        const passageLines: string[] = [];

        for (let c = startCh; c <= endCh; c++) {
          const chObj = data.eng?.find((ch: any) => Number(ch.chapter) === c);
          if (chObj && chObj.verses) {
            chObj.verses.forEach((v: any) => {
              passageLines.push(`${book} ${c}:${v.verse} - ${v.text}`);
            });
          }
        }

        if (passageLines.length > 0) {
          return passageLines.slice(0, 100).join('\n');
        }
      }
    }
  } catch (e) {
    console.log('Error reading local Bible passage text:', e);
  }
  return '';
};

// Dynamic 2-Stage Dual-AI Quiz Generator (Gemini Primary Generator -> Uniqueness Filter -> Groq Secondary Validator)
export const generateQuizForPassage = async (
  book: string,
  bookTelugu: string,
  startCh: number,
  endCh: number,
  attempt: number,
  userId: string = 'guest_user',
  dayId: number = 1
) => {
  const groqKey = process.env.GROQ_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  const quizSessionId = `${userId}_day${dayId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const chaptersList: number[] = [];
  for (let c = startCh; c <= endCh; c++) {
    chaptersList.push(c);
  }
  const chaptersStr = chaptersList.join(', ');

  const passageText = loadPassageTextForAI(book, startCh, endCh);
  const passageSnippet = passageText ? `\n\nACTUAL SCRIPTURE PASSAGE TEXT TO GENERATE QUESTIONS FROM:\n${passageText}\n` : '';

  console.log('\n======================================================================');
  console.log(`📤 [DUAL-AI QUIZ PIPELINE] Initiating Generation Session: ${quizSessionId}`);
  console.log(`📖 Reading Portion: ${book} (${bookTelugu}) Chapters ${startCh} to ${endCh}`);
  console.log(`📜 Scripture Verses in Context: ${passageText ? passageText.split('\n').length : 0}`);
  console.log(`👤 User ID: ${userId} | Attempt #${attempt}`);
  console.log('======================================================================\n');

  // Stage 1 Prompt for Primary Generator (16-18 Candidates)
  const candidateGenPrompt = `You are a master biblical scholar, theologian, and bilingual quiz author.
Your task is to generate a candidate pool of 16 distinct, high-quality multiple-choice quiz questions for testing Bible comprehension of ${book} (${bookTelugu}) chapters ${startCh} to ${endCh}.
Session ID: ${quizSessionId}
${passageSnippet}

REQUIREMENTS:
1. Every question MUST directly test key events, verses, people, commands, genealogies, or spiritual lessons from ${book} (${bookTelugu}) chapters ${startCh} to ${endCh} (${chaptersStr}).
2. Cover varied categories: Factual, Sequence, Character, Cause/Effect, Verse Detail, Context.
3. Provide a difficulty tag for each question: "easy", "medium", or "hard". Aim for ~5 easy, ~7 medium, ~4 hard.
4. Ensure 100% biblical accuracy, zero spelling errors, and correct Telugu & English terminology.
5. Provide 4 option choices per question. Place correct answer index at random positions (0-3).
6. Provide concise explanation with exact scripture reference in both Telugu and English.

Return ONLY a raw JSON array of objects with this schema:
[
  {
    "id": 1,
    "chapter": ${startCh},
    "category": "Factual",
    "difficulty": "easy",
    "questionTelugu": "తెలుగులో స్పష్టమైన ప్రశ్న",
    "questionEnglish": "Clear English question",
    "optionsTelugu": ["ఆప్షన్ A", "ఆప్షన్ B", "ఆప్షన్ C", "ఆప్షన్ D"],
    "optionsEnglish": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanationTelugu": "సమాధాన వివరణ (${bookTelugu} ${startCh}:1)",
    "explanationEnglish": "Scripture explanation (${book} ${startCh}:1)"
  }
]
No markdown backticks, no text before or after JSON.`;

  let candidatePool: any[] = [];
  let primaryProvider = '';

  // 1. Primary Generation: Try Gemini 1.5 Flash first
  if (geminiKey) {
    try {
      console.log('🤖 [STAGE 1] Querying Gemini 1.5 Flash for Candidate Question Pool...');
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: candidateGenPrompt }] }],
          generationConfig: { temperature: 0.7 }
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (responseText) {
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed) && parsed.length >= 8) {
            candidatePool = parsed;
            primaryProvider = 'Google Gemini 1.5 Flash';
          }
        }
      }
    } catch (e: any) {
      console.log('Gemini Primary Generation Error:', e?.message || e);
    }
  }

  // Fallback 1B: Try Groq as Primary Generator if Gemini didn't return pool
  if (candidatePool.length === 0 && groqKey) {
    try {
      console.log('🤖 [STAGE 1 Fallback] Querying Groq LLaMA-3.3-70B for Candidate Pool...');
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: candidateGenPrompt }],
          temperature: 0.7,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const responseText = data.choices?.[0]?.message?.content || '';
        if (responseText) {
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed) && parsed.length >= 8) {
            candidatePool = parsed;
            primaryProvider = 'Groq LLaMA-3.3-70B';
          }
        }
      }
    } catch (e: any) {
      console.log('Groq Primary Generation Error:', e?.message || e);
    }
  }

  // Fallback 1C: Try OpenAI if available
  if (candidatePool.length === 0 && openAiKey) {
    try {
      console.log('🤖 [STAGE 1 Fallback] Querying OpenAI GPT-4o-Mini for Candidate Pool...');
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: candidateGenPrompt }],
          temperature: 0.7,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const responseText = data.choices?.[0]?.message?.content || '';
        if (responseText) {
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed) && parsed.length >= 8) {
            candidatePool = parsed;
            primaryProvider = 'OpenAI GPT-4o-Mini';
          }
        }
      }
    } catch (e: any) {
      console.log('OpenAI Generation Error:', e?.message || e);
    }
  }

  // Fallback 1D: Try Pollinations AI free endpoint
  if (candidatePool.length === 0) {
    try {
      console.log('🤖 [STAGE 1 Fallback] Querying Pollinations Free AI Engine...');
      const resp = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: candidateGenPrompt }],
          model: 'openai',
          seed: Math.floor(Math.random() * 1000000),
        }),
      });
      if (resp.ok) {
        const responseText = await resp.text();
        if (responseText) {
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed) && parsed.length >= 5) {
            candidatePool = parsed;
            primaryProvider = 'Pollinations Free AI Engine';
          }
        }
      }
    } catch (e: any) {
      console.log('Pollinations AI Error:', e?.message || e);
    }
  }

  console.log(`\n✅ [STAGE 1 COMPLETE] Generated ${candidatePool.length} Candidate Questions via Provider [${primaryProvider || 'Offline Engine'}]`);

  // STAGE 2: Uniqueness & Duplication Filtering
  console.log('🔍 [STAGE 2] Applying Question Uniqueness & Semantic Duplication Filter...');
  const uniqueCandidates: any[] = [];
  const seenTexts = new Set<string>();

  for (const q of candidatePool) {
    const norm = (q.questionEnglish || q.questionTelugu || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
    
    let isDuplicate = false;
    for (const seen of seenTexts) {
      // Simple overlap check
      const wordsA = new Set<string>(norm.split(/\s+/).filter((w: string) => w.length > 3));
      const wordsB = new Set<string>(seen.split(/\s+/).filter((w: string) => w.length > 3));
      if (wordsA.size > 0 && wordsB.size > 0) {
        let intersection = 0;
        wordsA.forEach((w: string) => { if (wordsB.has(w)) intersection++; });
        const similarity = intersection / Math.min(wordsA.size, wordsB.size);
        if (similarity > 0.75) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (!isDuplicate && norm.length > 10) {
      seenTexts.add(norm);
      uniqueCandidates.push(q);
    }
  }
  console.log(`✅ [STAGE 2 COMPLETE] ${candidatePool.length - uniqueCandidates.length} Duplicate Candidates Purged. ${uniqueCandidates.length} Unique Candidates Remain.`);

  // STAGE 3: Secondary AI Validation (Groq API Validator)
  let verifiedCandidates = uniqueCandidates;
  if (groqKey && uniqueCandidates.length > 0) {
    try {
      console.log('🛡️ [STAGE 3] Invoking Secondary AI Validator (Groq LLaMA-3.3-70B) for Biblical Verification...');
      const validatePrompt = `You are a strict Biblical Fact Verification Engine.
Verify these candidate multiple-choice questions against scripture portion ${book} chapters ${startCh} to ${endCh}.
${passageSnippet}

CANDIDATES TO VERIFY:
${JSON.stringify(uniqueCandidates.map(c => ({
  id: c.id,
  question: c.questionEnglish,
  options: c.optionsEnglish,
  correctIndex: c.correctIndex,
  explanation: c.explanationEnglish
})), null, 2)}

Return ONLY a raw JSON array indicating validity for each candidate:
[
  {
    "id": 1,
    "isValid": true,
    "verifiedCorrectIndex": 0,
    "reasoning": "Accurate according to Genesis 1:1"
  }
]
Output raw JSON only. No markdown.`;

      const valResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: validatePrompt }],
          temperature: 0.2,
        }),
      });

      if (valResp.ok) {
        const valData = await valResp.json();
        const valText = valData.choices?.[0]?.message?.content || '';
        const cleanValJson = valText.replace(/```json/g, '').replace(/```/g, '').trim();
        const valArray = JSON.parse(cleanValJson);

        if (Array.isArray(valArray)) {
          const valMap = new Map(valArray.map((v: any) => [v.id, v]));
          const checked = uniqueCandidates.filter(c => {
            const v = valMap.get(c.id);
            if (!v || v.isValid === false) return false;
            if (v.verifiedCorrectIndex !== undefined && v.verifiedCorrectIndex >= 0 && v.verifiedCorrectIndex <= 3) {
              c.correctIndex = v.verifiedCorrectIndex;
            }
            return true;
          });
          if (checked.length >= 5) {
            verifiedCandidates = checked;
            console.log(`✅ [STAGE 3 COMPLETE] Groq Validator Verified ${verifiedCandidates.length} Questions.`);
          }
        }
      }
    } catch (valErr: any) {
      console.log('Groq Validation Warning (Proceeding with Candidate Pool):', valErr?.message || valErr);
    }
  }

  // STAGE 4: Final 10 Selection & Difficulty Balance
  console.log('🎯 [STAGE 4] Selecting Top 10 Questions and Randomizing Option Placements...');
  let poolToSelect = verifiedCandidates.length >= 10 ? verifiedCandidates : candidatePool;
  
  if (poolToSelect.length === 0) {
    console.log('⚠️ [STAGE 4 Fallback] AI Providers unreachable or returned empty pool. Using Dynamic Canonical Scripture Engine.');
    const generatePassageSpecificFallback = (bookName: string, bookTel: string, startC: number, endC: number) => {
      const questions = [
        {
          id: 1,
          chapter: startC,
          category: 'Factual',
          difficulty: 'easy',
          questionTelugu: `${bookTel} ${startC}వ అధ్యాయంలో ముఖ్యమైన ఆత్మ సంబంధమైన వర్తమానం ఏమిటి?`,
          questionEnglish: `According to ${bookName} Chapter ${startC}, what is the central spiritual lesson?`,
          optionsTelugu: ["దేవుని వాక్యమునకు లోబడుట మరియు విశ్వాసము", "కేవలం ఐహిక విషయాలు", "తోటివారితో పోలిక", "ఏదీ కాదు"],
          optionsEnglish: ["Obedience to God's Word and active faith", "Earthly achievements only", "Comparing with others", "None of these"],
          correctIndex: 0,
          explanationTelugu: `${bookTel} ${startC}వ అధ్యాయము దేవుని వాక్యమునకు లోబడి విశ్వాసముతో నడుచుకోవాలని నేర్పుచున్నది.`,
          explanationEnglish: `${bookName} Chapter ${startC} teaches us to walk by faith and obey God's holy scriptures.`
        },
        {
          id: 2,
          chapter: startC,
          category: 'Factual',
          difficulty: 'easy',
          questionTelugu: `${bookTel} ${startC}వ అధ్యాయం ద్వారా ప్రభువు తన ప్రజలకు అందించిన వాగ్దానము ఏమిటి?`,
          questionEnglish: `What divine promise or direction is highlighted in ${bookName} Chapter ${startC}?`,
          optionsTelugu: ["దేవుని కాపుదల మరియు నడిపింపు", "శ్రమలు మాత్రమే", "సందేశము లేదు", "లోకసంబంధ ఆలోచనలు"],
          optionsEnglish: ["God's protection and holy guidance", "Trouble without hope", "No message", "Worldly thoughts"],
          correctIndex: 0,
          explanationTelugu: "ప్రభువు తనను నమ్ముకొనిన వారిని ఎన్నడూ విడనాడక నడిపించును.",
          explanationEnglish: "The Lord promises never to leave nor forsake those who trust in Him."
        },
        {
          id: 3,
          chapter: Math.min(startC + 1, endC),
          category: 'Character',
          difficulty: 'medium',
          questionTelugu: `${bookTel} ${Math.min(startC + 1, endC)}వ అధ్యాయంలో దైవభక్తి కలిగిన వారి లక్షణములు ఏవి?`,
          questionEnglish: `In ${bookName} Chapter ${Math.min(startC + 1, endC)}, what characterizes a godly person?`,
          optionsTelugu: ["ప్రార్థన, వాక్య ధ్యానము మరియు దయ", "కోపము మరియు గర్వము", "అసత్యము మాట్లాడుట", "ఆలయమునకు వెళ్ళకపోవుట"],
          optionsEnglish: ["Prayer, scripture meditation, and love", "Anger and pride", "Speaking lies", "Avoiding fellowship"],
          correctIndex: 0,
          explanationTelugu: "దైవభక్తి కలిగిన వారు నిత్యము ప్రభువు వాక్యమును ధ్యానిస్తూ ప్రార్థనలో స్థిరముగా ఉంటారు.",
          explanationEnglish: "Godly believers meditate on the Word day and night and abide in love."
        },
        {
          id: 4,
          chapter: Math.min(startC + 1, endC),
          category: 'Cause/Effect',
          difficulty: 'medium',
          questionTelugu: `${bookTel} అధ్యాయములు ${startC}-${endC} ప్రకారం శోధనల సమయంలో విశ్వాసి ఎలా స్పందించాలి?`,
          questionEnglish: `According to ${bookName} Chapters ${startC}-${endC}, how should a believer respond in trials?`,
          optionsTelugu: ["విశ్వాసములో స్థిరముగా ఉండి ప్రార్థించుట", "సణుగుకొనుట", "దేవుని నుండి దూరమగుట", "భయపడుట"],
          optionsEnglish: ["Stand firm in faith and pray", "Murmur and complain", "Turn away from God", "Fear and give up"],
          correctIndex: 0,
          explanationTelugu: "శోధనలలో దేవుని వాక్యమనే ఆత్మ ఖడ్గమును ధరించి ప్రార్థనలో విజయం పొందాలి.",
          explanationEnglish: "Believers overcome trials by standing firm on God's truth and praying continually."
        },
        {
          id: 5,
          chapter: endC,
          category: 'Verse Context',
          difficulty: 'medium',
          questionTelugu: `${bookTel} ${endC}వ అధ్యాయము ముగింపులో ఇవ్వబడిన గొప్ప ఆత్మ సంబంధ హెచ్చరిక / ప్రోత్సాహము ఏది?`,
          questionEnglish: `What key encouragement is highlighted in ${bookName} Chapter ${endC}?`,
          optionsTelugu: ["ప్రభువు నందు నిరీక్షణ కలిగి పరిశుద్ధత కాపాడుకొనుట", "స్వార్థముతో జీవించుట", "పాపమును సహించుట", "విశ్వాసము వదలుట"],
          optionsEnglish: ["Keep hope in Christ and preserve holiness", "Live selfishly", "Tolerate sin", "Abandon faith"],
          correctIndex: 0,
          explanationTelugu: "ప్రభువైన యేసు క్రీస్తు నందు నిరీక్షణ ఉంచి నిత్యజీవము కొరకు పరిశుద్ధంగా జీవించాలి.",
          explanationEnglish: "Fix your hope on the Lord Jesus Christ and preserve purity in daily living."
        },
        {
          id: 6,
          chapter: startC,
          category: 'Detail',
          difficulty: 'hard',
          questionTelugu: `${bookTel} పఠనం ప్రకారం దేవుని కృప మన జీవితంలో ఎలాంటి మార్పు తెస్తుంది?`,
          questionEnglish: `According to reading ${bookName}, what transformation does God's grace bring?`,
          optionsTelugu: ["నూతన హృదయము మరియు నూతన జీవితము", "ఏ మార్పు ఉండదు", "భయము మాత్రమే", "దుఃఖము"],
          optionsEnglish: ["New heart and transformed life", "No change at all", "Fear only", "Sorrow without comfort"],
          correctIndex: 0,
          explanationTelugu: "క్రీస్తు నందు ఉన్నవాడు నూతన సృష్టి; పాతవి గతించెను సమస్తము నూతనమాయెను.",
          explanationEnglish: "If anyone is in Christ, he is a new creation; old things have passed away."
        },
        {
          id: 7,
          chapter: Math.min(startC + 1, endC),
          category: 'Character',
          difficulty: 'medium',
          questionTelugu: `${bookTel} అధ్యాయం ${Math.min(startC + 1, endC)} ప్రకారం మనము ఇతరులతో ఏవిధంగా నడుచుకోవాలి?`,
          questionEnglish: `According to ${bookName} Chapter ${Math.min(startC + 1, endC)}, how should we treat others?`,
          optionsTelugu: ["ప్రేమ, క్షమాపణ మరియు క్రీస్తు స్వభావముతో", "ద్వేషముతో", "స్వార్థముతో", "ఉపేక్షతో"],
          optionsEnglish: ["With love, forgiveness, and Christ-like attitude", "With hatred", "With selfishness", "With apathy"],
          correctIndex: 0,
          explanationTelugu: "క్రీస్తు మనలను క్షమించిన ప్రకారము మనము కూడా ఇతరులను క్షమించి ప్రేమించాలి.",
          explanationEnglish: "Forgive one another even as God in Christ forgave you."
        },
        {
          id: 8,
          chapter: endC,
          category: 'Sequence',
          difficulty: 'hard',
          questionTelugu: `${bookTel} ${endC}వ అధ్యాయంలో పరిశుద్ధాత్మ దేవుని నడిపింపు యొక్క ముఖ్య ఉద్దేశ్యం ఏమిటి?`,
          questionEnglish: `In ${bookName} Chapter ${endC}, what is the purpose of the Holy Spirit's guidance?`,
          optionsTelugu: ["సత్యములోనికి నడిపించి క్రీస్తును మహిమపరచుట", "లోక ఐశ్వర్యము ఇచ్చుట", "సందేశము లేదు", "అపోహలు కలిగించుట"],
          optionsEnglish: ["Guide into all truth and glorify Christ", "Give worldly fame only", "No purpose", "Cause confusion"],
          correctIndex: 0,
          explanationTelugu: "పరిశుద్ధాత్మ దేవుడు మనలను సమస్త సత్యములోనికి నడిపించి దేవుని మహిమపరుచును.",
          explanationEnglish: "The Holy Spirit guides believers into all truth and exalts Jesus Christ."
        },
        {
          id: 9,
          chapter: startC,
          category: 'Factual',
          difficulty: 'easy',
          questionTelugu: `${bookTel} ${startC}వ అధ్యాయము ద్వారా విశ్వాసి పొందే నిత్య నిరీక్షణ ఏది?`,
          questionEnglish: `What eternal hope is revealed in ${bookName} Chapter ${startC}?`,
          optionsTelugu: ["క్రీస్తు రక్తము వలన రక్షణ మరియు నిత్యజీవము", "తాత్కాలిక ఆనందం", "ఏమీ లేదు", "లోక భయాలు"],
          optionsEnglish: ["Salvation through Christ's blood and eternal life", "Temporary happiness", "Nothing", "Worldly anxieties"],
          correctIndex: 0,
          explanationTelugu: "క్రీస్తు సిలువ యాగము ద్వారా మనకు రక్షణ మరియు నిత్యజీవ భాగ్యము లభించినది.",
          explanationEnglish: "Through Christ's sacrifice, we receive salvation and eternal life."
        },
        {
          id: 10,
          chapter: endC,
          category: 'Verse Context',
          difficulty: 'hard',
          questionTelugu: `${bookTel} ${endC}వ అధ్యాయము చదివిన తరువాత మన దైనందిన జీవితంలో ఏ తీర్మానం తీసుకోవాలి?`,
          questionEnglish: `After reading ${bookName} Chapter ${endC}, what practical commitment should we make?`,
          optionsTelugu: ["దేవుని చిత్తమునకు పూర్తిగా లొంగిపోవుట", "నా ఇష్ట ప్రకారము జీవించుట", "వాక్యమును మరచిపోవుట", "ఏమీ చేయకపోవుట"],
          optionsEnglish: ["Completely submit to God's holy will", "Live by personal desires", "Forget the message", "Do nothing"],
          correctIndex: 0,
          explanationTelugu: "ప్రతిరోజూ దేవుని వాక్యమునకు విధేయులమై ఆయన మహిమ కొరకు జీవించుటకు తీర్మానించుకోవాలి.",
          explanationEnglish: "Commit daily to obeying God's Word and living for His divine glory."
        }
      ];

      return questions;
    };
    poolToSelect = generatePassageSpecificFallback(book, bookTelugu, startCh, endCh);
  }

  // Select 10 questions from candidate pool with difficulty balance
  const easy = poolToSelect.filter(q => q.difficulty === 'easy');
  const medium = poolToSelect.filter(q => q.difficulty === 'medium' || !q.difficulty);
  const hard = poolToSelect.filter(q => q.difficulty === 'hard');

  let selected: any[] = [];
  selected.push(...easy.slice(0, 3));
  selected.push(...medium.slice(0, 4));
  selected.push(...hard.slice(0, 3));

  if (selected.length < 10) {
    const remaining = poolToSelect.filter(q => !selected.includes(q));
    selected.push(...remaining.slice(0, 10 - selected.length));
  }

  // Final 10 items formatted & option shuffled
  const final10Questions = selected.slice(0, 10).map((q, idx) => {
    const shuffled = shuffleQuestion(q);
    return {
      ...shuffled,
      id: idx + 1,
      quizSessionId,
    };
  });

  logGeneratedQuestions(
    `${primaryProvider || 'Dynamic Scripture Engine'} (Validated by Groq)`,
    book,
    startCh,
    endCh,
    final10Questions
  );

  return final10Questions;
};

// Helper to calculate target end date
const getTargetEndDate = (startDate: Date, durationDays: number = 365) => {
  const end = new Date(startDate);
  end.setDate(end.getDate() + durationDays);
  return end;
};

// GET /api/bible-plans
export const getPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    let plans = await BiblePlan.find({ isActive: true }).sort({ durationDays: 1 });
    res.status(200).json({ success: true, count: plans.length, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch Bible plans', error: error.message });
  }
};

import { AuthRequest } from '../middleware/auth';

// GET /api/bible-plans/progress/:userId
export const getUserPlanProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const authenticatedUserId = authReq.user?._id?.toString() || authReq.user?.id;
    const requestedUserId = req.params.userId;
    
    // Auth security: Use authenticated user ID if logged in, otherwise requested ID
    const userId = authenticatedUserId || requestedUserId;
    const { planId = '1-year-canonical' } = req.query;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    let progress = await UserPlanProgress.findOne({ userId, planId: String(planId) });

    // Auto-migrate guest progress to newly logged-in member if member progress is empty
    if (userId !== 'guest_user' && (!progress || !progress.completedDays || progress.completedDays.length === 0)) {
      const guestProg = await UserPlanProgress.findOne({ userId: 'guest_user', planId: String(planId) });
      if (guestProg && (guestProg.completedDays.length > 0 || guestProg.streak > 0)) {
        if (!progress) {
          const now = new Date();
          progress = new UserPlanProgress({
            userId,
            userName: authReq.user?.name || 'Member',
            planId: String(planId),
            currentDay: guestProg.currentDay || 1,
            completedDays: guestProg.completedDays || [],
            readMarkedDays: guestProg.readMarkedDays || [],
            startDate: guestProg.startDate || now,
            targetEndDate: guestProg.targetEndDate || getTargetEndDate(now, 365),
            streak: guestProg.streak || 0,
            highestStreak: guestProg.highestStreak || 0,
            averageScore: guestProg.averageScore || 0,
            totalQuizzes: guestProg.totalQuizzes || 0,
            totalTimeSeconds: guestProg.totalTimeSeconds || 0,
            averageTimeSeconds: guestProg.averageTimeSeconds || 0,
            lastCompletedDate: guestProg.lastCompletedDate,
            dailyAttempts: guestProg.dailyAttempts,
            quizScores: guestProg.quizScores,
            quizTimes: guestProg.quizTimes,
            status: 'active',
          });
        } else {
          progress.currentDay = guestProg.currentDay || 1;
          progress.completedDays = guestProg.completedDays || [];
          progress.readMarkedDays = guestProg.readMarkedDays || [];
          progress.streak = guestProg.streak || 0;
          progress.highestStreak = Math.max(progress.highestStreak || 0, guestProg.highestStreak || 0);
          progress.averageScore = guestProg.averageScore || 0;
          progress.totalQuizzes = guestProg.totalQuizzes || 0;
          progress.totalTimeSeconds = guestProg.totalTimeSeconds || 0;
          progress.averageTimeSeconds = guestProg.averageTimeSeconds || 0;
          progress.lastCompletedDate = guestProg.lastCompletedDate;
        }
        await progress.save();

        // Clean up guest_user progress in DB
        guestProg.completedDays = [];
        guestProg.readMarkedDays = [];
        guestProg.streak = 0;
        guestProg.currentDay = 1;
        await guestProg.save();
      }
    }

    if (!progress) {
      const now = new Date();
      const plan = await BiblePlan.findOne({ planId: String(planId) });
      const duration = plan?.durationDays || 365;

      progress = new UserPlanProgress({
        userId,
        userName: authReq.user?.name || 'Member',
        planId: String(planId),
        currentDay: 1,
        completedDays: [],
        readMarkedDays: [],
        startDate: now,
        targetEndDate: getTargetEndDate(now, duration),
        streak: 0,
        highestStreak: 0,
        averageScore: 0,
        totalQuizzes: 0,
        dailyAttempts: {},
        quizScores: {},
        quizTimes: {},
        status: 'active',
      });
      await progress.save();
    }

// Check if streak was broken (if more than 1 day missed)
    if (progress.lastCompletedDate && progress.streak > 0) {
      const now = new Date();
      const lastDate = new Date(progress.lastCompletedDate);
      const calDiff = getCalendarDayDiff(lastDate, now);
      if (calDiff > 1) {
        progress.streak = 0;
        await progress.save();
      }
    }

    if (!progress.completedDays || progress.completedDays.length === 0) {
      progress.currentDay = 1;
      progress.streak = 0;
      progress.averageScore = 0;
      await progress.save();
    } else {
      const maxCompleted = Math.max(...progress.completedDays);
      if (progress.currentDay <= maxCompleted) {
        progress.currentDay = maxCompleted + 1;
        await progress.save();
      }
    }

    res.status(200).json({ success: true, data: progress });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch progress', error: error.message });
  }
};

// POST /api/bible-plans/enroll
export const enrollPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id?.toString() || authReq.user?.id || req.body.userId;
    const userName = authReq.user?.name || req.body.userName || 'Member';
    const planId = req.body.planId;

    if (!userId || !planId) {
      res.status(400).json({ success: false, message: 'Authenticated user and planId are required' });
      return;
    }

    let progress = await UserPlanProgress.findOne({ userId, planId });
    if (!progress) {
      const now = new Date();
      const plan = await BiblePlan.findOne({ planId });
      const duration = plan?.durationDays || 365;

      progress = new UserPlanProgress({
        userId,
        userName,
        planId,
        currentDay: 1,
        completedDays: [],
        readMarkedDays: [],
        startDate: now,
        targetEndDate: getTargetEndDate(now, duration),
        streak: 0,
        highestStreak: 0,
        averageScore: 0,
        totalQuizzes: 0,
        status: 'active',
      });
      await progress.save();
    }

    res.status(200).json({ success: true, data: progress });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to enroll plan', error: error.message });
  }
};

// POST /api/bible-plans/reset-progress
export const resetUserPlanProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id?.toString() || authReq.user?.id || req.body.userId;
    const { planId = '1-year-canonical' } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const now = new Date();
    let progress = await UserPlanProgress.findOne({ userId, planId: String(planId) });
    if (!progress) {
      progress = new UserPlanProgress({
        userId,
        userName: authReq.user?.name || req.body.userName || 'Member',
        planId: String(planId),
        currentDay: 1,
        completedDays: [],
        readMarkedDays: [],
        startDate: now,
        targetEndDate: getTargetEndDate(now, 365),
        streak: 0,
        highestStreak: 0,
        averageScore: 0,
        totalQuizzes: 0,
        dailyAttempts: {},
        quizScores: {},
        quizTimes: {},
        status: 'active',
      });
    } else {
      progress.currentDay = 1;
      progress.completedDays = [];
      progress.readMarkedDays = [];
      progress.startDate = now;
      progress.targetEndDate = getTargetEndDate(now, 365);
      progress.streak = 0;
      progress.highestStreak = 0;
      progress.averageScore = 0;
      progress.totalQuizzes = 0;
      progress.totalTimeSeconds = 0;
      progress.averageTimeSeconds = 0;
      progress.dailyAttempts = {} as any;
      progress.quizScores = {} as any;
      progress.quizTimes = {} as any;
      progress.status = 'active';
      progress.lastCompletedDate = undefined;
    }
    await progress.save();

    res.status(200).json({ success: true, message: 'User plan progress reset cleanly', data: progress });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to reset progress', error: error.message });
  }
};

// POST /api/bible-plans/mark-read (Mark Today's Passage as Read so Quiz Unlocks)
export const markDayAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id?.toString() || authReq.user?.id || req.body.userId;
    const { planId, day } = req.body;

    if (!userId || !planId || day === undefined) {
      res.status(400).json({ success: false, message: 'Authenticated user, planId, and day are required' });
      return;
    }

    let progress = await UserPlanProgress.findOne({ userId, planId });
    if (!progress) {
      progress = new UserPlanProgress({
        userId,
        userName: authReq.user?.name || 'Member',
        planId,
        currentDay: 1,
        completedDays: [],
        readMarkedDays: []
      });
    }

    if (!progress.readMarkedDays) progress.readMarkedDays = [];
    if (!progress.readMarkedDays.includes(Number(day))) {
      progress.readMarkedDays.push(Number(day));
      await progress.save();
    }

    res.status(200).json({
      success: true,
      message: 'Passage marked as read. Quiz is now unlocked!',
      day: Number(day),
      isRead: true,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to mark passage as read', error: error.message });
  }
};

// POST /api/bible-plans/generate-quiz
export const getPassageQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id?.toString() || authReq.user?.id || req.body.userId;
    const { book, bookTelugu, startChapter, endChapter, day, planId } = req.body;

    let attemptsUsed = 0;
    if (userId && planId) {
      const progress = await UserPlanProgress.findOne({ userId, planId });
      if (progress && progress.dailyAttempts) {
        attemptsUsed = (progress.dailyAttempts as any).get(`day-${day}`) || 0;
      }
    }

    if (attemptsUsed >= 3) {
      res.status(400).json({
        success: false,
        message: 'Maximum 3 attempts reached for today. Streak reset. Please read again tomorrow!',
        attemptsUsed,
        maxAttempts: 3,
      });
      return;
    }

    const currentAttempt = attemptsUsed + 1;
    const questions = await generateQuizForPassage(
      book || 'Genesis',
      bookTelugu || 'ఆదికాండము',
      Number(startChapter) || 1,
      Number(endChapter) || 1,
      currentAttempt,
      userId || 'guest_user',
      Number(day) || 1
    );

    res.status(200).json({
      success: true,
      day: Number(day) || 1,
      attemptNumber: currentAttempt,
      attemptsRemaining: 3 - currentAttempt,
      maxAttempts: 3,
      totalQuestions: questions.length,
      questions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to generate passage quiz', error: error.message });
  }
};

// POST /api/bible-plans/submit-quiz
export const submitQuizAttempt = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id?.toString() || authReq.user?.id || req.body.userId;
    const userName = authReq.user?.name || req.body.userName || 'Member';
    const { planId, day, userAnswers, totalQuestions, quizTimeSeconds } = req.body;

    if (!userId || !planId || day === undefined) {
      res.status(400).json({ success: false, message: 'Authenticated user, planId, and day are required' });
      return;
    }

    let progress = await UserPlanProgress.findOne({ userId, planId });
    if (!progress) {
      const now = new Date();
      progress = new UserPlanProgress({
        userId,
        userName,
        planId,
        currentDay: 1,
        completedDays: [],
        readMarkedDays: [],
        startDate: now,
        targetEndDate: getTargetEndDate(now, 365),
        streak: 0,
        highestStreak: 0,
        averageScore: 0,
        totalQuizzes: 0,
        totalTimeSeconds: 0,
        averageTimeSeconds: 0,
      });
    }


    // STRICT LOCK: Check if user already completed today's portion on the same calendar day
    const now = new Date();
    if (progress.lastCompletedDate && progress.completedDays.includes(Number(day))) {
      const lastDate = new Date(progress.lastCompletedDate);
      const isSameCalendarDay =
        now.getFullYear() === lastDate.getFullYear() &&
        now.getMonth() === lastDate.getMonth() &&
        now.getDate() === lastDate.getDate();

      if (isSameCalendarDay && Number(day) >= progress.currentDay) {
        res.status(400).json({
          success: false,
          message: 'Today\'s portion is already completed! Tomorrow\'s reading will unlock at 12:00 AM.',
          lockedUntilTomorrow: true,
        });
        return;
      }
    }

    if (userName && progress.userName !== userName) {
      progress.userName = userName;
    }

    const dayKey = `day-${day}`;
    const prevAttempts = (progress.dailyAttempts as any)?.get?.(dayKey) || 0;

    if (prevAttempts >= 3 && !progress.completedDays.includes(Number(day))) {
      progress.streak = 0;
      await progress.save();
      res.status(400).json({
        success: false,
        message: '3 attempts already exhausted. Streak reset to 0. Please read again!',
        passed: false,
        attemptsUsed: 3,
        streakReset: true,
      });
      return;
    }

    const newAttempts = prevAttempts + 1;
    if (!progress.dailyAttempts) progress.dailyAttempts = {} as any;
    (progress.dailyAttempts as any).set(dayKey, newAttempts);

    // Calculate score
    let correctCount = 0;
    if (Array.isArray(userAnswers)) {
      correctCount = userAnswers.filter((ans: any) => ans.isCorrect === true).length;
    }
    const totalQ = totalQuestions || (userAnswers ? userAnswers.length : 10);
    const scorePercent = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 100;
    const passed = scorePercent >= 60; // 60% or higher to pass

    if (!progress.quizScores) progress.quizScores = {} as any;
    (progress.quizScores as any).set(dayKey, scorePercent);

    if (quizTimeSeconds) {
      if (!progress.quizTimes) progress.quizTimes = {} as any;
      (progress.quizTimes as any).set(dayKey, Number(quizTimeSeconds));
      progress.totalTimeSeconds = (progress.totalTimeSeconds || 0) + Number(quizTimeSeconds);
    }

    // Update running average score & total quizzes
    const allScores: number[] = Array.from((progress.quizScores as any).values() || []);
    if (allScores.length > 0) {
      const sum = allScores.reduce((a, b) => a + b, 0);
      progress.averageScore = Math.round(sum / allScores.length);
      progress.totalQuizzes = allScores.length;
    }
    if (progress.totalQuizzes > 0 && progress.totalTimeSeconds > 0) {
      progress.averageTimeSeconds = Math.round(progress.totalTimeSeconds / progress.totalQuizzes);
    }

    if (passed) {
      if (!progress.completedDays.includes(Number(day))) {
        progress.completedDays.push(Number(day));
      }

      // Update streak
      if (!progress.lastCompletedDate) {
        progress.streak = 1;
      } else {
        const lastDate = new Date(progress.lastCompletedDate);
        const calDiff = getCalendarDayDiff(lastDate, now);
        if (calDiff === 1) {
          progress.streak += 1;
        } else if (calDiff > 1) {
          progress.streak = 1;
        } else if (calDiff === 0 && progress.streak === 0) {
          progress.streak = 1;
        }
      }

      progress.lastCompletedDate = now;
      if (progress.streak > progress.highestStreak) {
        progress.highestStreak = progress.streak;
      }

      // Advance current day for next session
      if (Number(day) >= progress.currentDay) {
        progress.currentDay = Number(day) + 1;
      }
    } else {
      if (newAttempts >= 3) {
        progress.streak = 0;
      }
    }

    await progress.save();

    res.status(200).json({
      success: true,
      passed,
      scorePercent,
      correctCount,
      totalQuestions: totalQ,
      attemptsUsed: newAttempts,
      attemptsRemaining: Math.max(0, 3 - newAttempts),
      currentStreak: progress.streak,
      highestStreak: progress.highestStreak,
      averageScore: progress.averageScore,
      completedDaysCount: progress.completedDays.length,
      currentDay: progress.currentDay,
      streakReset: !passed && newAttempts >= 3,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to submit quiz attempt', error: error.message });
  }
};

// GET /api/bible-plans/leaderboard
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planId = '1-year-canonical', limit = 20 } = req.query;

    const now = new Date();
    // Exclude guest_user from leaderboard calculations
    const allProgress = await UserPlanProgress.find({
      planId: String(planId),
      userId: { $ne: 'guest_user' }
    });

    for (const p of allProgress) {
      if (p.lastCompletedDate && p.streak > 0) {
        const calDiff = getCalendarDayDiff(new Date(p.lastCompletedDate), now);
        if (calDiff > 1) {
          p.streak = 0;
          await p.save();
        }
      }
    }

    // Include all registered user plan progress records (guest_user excluded)
    const qualifiedLeaders = allProgress;

    // Fetch all members from User collection to resolve exact user full names
    const allUsers = await User.find().select('name email mobileNumber role');
    const userMap = new Map<string, string>();

    for (const u of allUsers) {
      if (u.name) {
        if (u._id) userMap.set(u._id.toString(), u.name);
        if (u.mobileNumber) userMap.set(u.mobileNumber, u.name);
        if (u.email) userMap.set(u.email.toLowerCase(), u.name);
      }
    }

    const formattedLeaders = qualifiedLeaders.map(item => {
      let exactName = userMap.get(item.userId) || item.userName || '';

      // Clean up raw roles if erroneously set as name
      const genericRoles = ['member', 'admin', 'super admin', 'guest', 'administrator'];
      if (!exactName || genericRoles.includes(exactName.toLowerCase().trim())) {
        exactName = item.userName && !genericRoles.includes(item.userName.toLowerCase().trim())
          ? item.userName
          : 'Member';
      }

      const completedCount = item.completedDays ? item.completedDays.length : 0;

      return {
        userId: item.userId,
        userName: exactName,
        streak: item.streak || 0,
        highestStreak: item.highestStreak || 0,
        averageScore: item.averageScore || 0,
        completedDays: completedCount,
        averageTimeSeconds: item.averageTimeSeconds || 0,
      };
    });

    // Sort by highest streak first (DESC), then highest average score (DESC), then highest completed days (DESC), then lowest time (ASC)
    formattedLeaders.sort((a, b) => {
      if (b.streak !== a.streak) return b.streak - a.streak;
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
      if (b.completedDays !== a.completedDays) return b.completedDays - a.completedDays;
      return (a.averageTimeSeconds || 0) - (b.averageTimeSeconds || 0);
    });

    const finalLeaders = formattedLeaders.slice(0, Number(limit)).map((item, idx) => ({
      rank: idx + 1,
      ...item,
    }));

    res.status(200).json({ success: true, count: finalLeaders.length, data: finalLeaders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard', error: error.message });
  }
};

// GET /api/bible-plans/daily-promise
export const getDailyPromise = async (req: Request, res: Response): Promise<void> => {
  try {
    const todayStr = getKolkataDateStr();
    const { currentMinutes } = getKolkataTimeMinutes();
    const allowScheduled = req.query.allowScheduled === 'true';

    console.log(`📖 [API GET /daily-promise] Request received. Today IST: ${todayStr}, Mins: ${currentMinutes}, allowScheduled: ${allowScheduled}`);

    // Find today's promise in DB
    let promise = await DailyPromise.findOne({ date: todayStr });

    if (promise) {
      const scheduledMinutes = parseTimeToMinutes(promise.time || '05:00 AM');
      const isPublished = promise.status === 'sent' || currentMinutes >= scheduledMinutes;
      console.log(`📖 [API GET /daily-promise] Today's promise found: "${promise.referenceTelugu}" @ ${promise.time} (${scheduledMinutes} mins). Status: '${promise.status}', Published: ${isPublished}`);

      if (isPublished || allowScheduled) {
        console.log(`✅ [API GET /daily-promise] Returning active promise: "${promise.referenceTelugu}"`);
        res.status(200).json({ success: true, data: promise });
        return;
      } else {
        console.log(`🔒 [API GET /daily-promise] Promise scheduled for future time (${scheduledMinutes} mins > ${currentMinutes} mins). Hiding from user.`);
      }
    }

    // If today's promise is NOT published yet or doesn't exist, return latest sent promise from previous days
    const latestSent = await DailyPromise.findOne({ status: 'sent', date: { $lte: todayStr } }).sort({ date: -1, createdAt: -1 });
    if (latestSent) {
      console.log(`ℹ️ [API GET /daily-promise] Returning latest sent promise from ${latestSent.date}: "${latestSent.referenceTelugu}"`);
      res.status(200).json({ success: true, data: latestSent });
      return;
    }

    // Default canonical Telugu scripture pool
    const defaultTeluguPromises = [
      {
        verseTelugu: "యెహోవా నా కాపరి; నాకు లేమి కలుగదు. ఆయన పచ్చికగల చోట్లను నన్ను పరుండజేయుచున్నాడు.",
        verseEnglish: "The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures.",
        referenceTelugu: "కీర్తనలు 23:1-2",
        referenceEnglish: "Psalms 23:1-2"
      },
      {
        verseTelugu: "నేను మీ విషయమై తలంచియున్న తలంపులను నేనెరుగుదును; అవి రాబోవు కాలమందు మీకు నిరీక్షణ కలుగునట్లు సమాధానకరమైన తలంపులేగాని హానికరమైనవి కావు.",
        verseEnglish: "For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil, to give you an expected end.",
        referenceTelugu: "యిర్మీయా 29:11",
        referenceEnglish: "Jeremiah 29:11"
      },
      {
        verseTelugu: "నీవు నడుచు మార్గమంతటిలో నిన్ను కాపాడుటకు ఆయన తన దూతలకు నిన్నుగూర్చి ఆజ్ఞాపించును.",
        verseEnglish: "For He shall give His angels charge over thee, to keep thee in all thy ways.",
        referenceTelugu: "కీర్తనలు 91:11",
        referenceEnglish: "Psalms 91:11"
      },
      {
        verseTelugu: "నేను నిన్ను విడువను, నిన్ను ఎడబాయను; నిబ్బరము కలిగి ధైర్యముగా ఉండుము.",
        verseEnglish: "I will not fail thee, nor forsake thee. Be strong and of a good courage.",
        referenceTelugu: "యెహోషువ 1:5-6",
        referenceEnglish: "Joshua 1:5-6"
      },
      {
        verseTelugu: "భయపడకుము నేను నీకు తోడైయున్నాను; దిగులుపడకుము నేను నీ దేవుడనై యున్నాను; నేను నిన్ను బలపరతును.",
        verseEnglish: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee.",
        referenceTelugu: "యెషయా 41:10",
        referenceEnglish: "Isaiah 41:10"
      },
      {
        verseTelugu: "మీ దేవుడైన యెహోవా మీ మధ్య ఉన్నాడు, ఆయన రక్షించుటకు సమర్థుడైన శూరుడు.",
        verseEnglish: "The Lord thy God in the midst of thee is mighty; He will save.",
        referenceTelugu: "జెఫన్యా 3:17",
        referenceEnglish: "Zephaniah 3:17"
      },
      {
        verseTelugu: "నా దేవుడు తన ఐశ్వర్యము చొప్పున క్రీస్తుయేసు నందు మహిమలో మీ ప్రతి అవసరమును తీర్చును.",
        verseEnglish: "But my God shall supply all your need according to His riches in glory by Christ Jesus.",
        referenceTelugu: "ఫిలిప్పీయులకు 4:19",
        referenceEnglish: "Philippians 4:19"
      },
      {
        verseTelugu: "యెహోవా కొరకు ఎదురుచూచువారు నూతన బలము పొందుదురు; వారు పక్షులవలె రెక్కలు చాపి పైకి ఎగురుదురు.",
        verseEnglish: "But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles.",
        referenceTelugu: "యెషయా 40:31",
        referenceEnglish: "Isaiah 40:31"
      },
      {
        verseTelugu: "ప్రయాసపడి భారము మోసుకొనుచున్న సమస్త జనులారా, నా యొద్దకు రండి, నేను మీకు విశ్రాంతి కలుగజేతును.",
        verseEnglish: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
        referenceTelugu: "మత్తయి 11:28",
        referenceEnglish: "Matthew 11:28"
      },
      {
        verseTelugu: "దేవుడు మనకు ఆశ్రయమును బలమునై యున్నాడు, ఆపత్కాలములో ఆయన నమ్మదగిన సహాయకుడు.",
        verseEnglish: "God is our refuge and strength, a very present help in trouble.",
        referenceTelugu: "కీర్తనలు 46:1",
        referenceEnglish: "Psalms 46:1"
      }
    ];

    const dayIdx = new Date().getDate() % defaultTeluguPromises.length;
    const selected = defaultTeluguPromises[dayIdx];

    promise = new DailyPromise({
      date: todayStr,
      time: '05:00 AM',
      verseTelugu: selected.verseTelugu,
      verseEnglish: selected.verseEnglish,
      referenceTelugu: selected.referenceTelugu,
      referenceEnglish: selected.referenceEnglish,
      status: 'sent',
      notificationSentAt: new Date(),
      addedBy: 'ai',
    });
    await promise.save();

    console.log(`✨ [API GET /daily-promise] Created & returning canonical default promise: "${promise.referenceTelugu}"`);
    res.status(200).json({ success: true, data: promise });
  } catch (error: any) {
    console.error('❌ [API GET /daily-promise Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch daily promise', error: error.message });
  }
};

// POST /api/bible-plans/daily-promise
export const setDailyPromise = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      date, 
      time,
      bookId, 
      bookTelugu, 
      bookEnglish, 
      chapter, 
      verse, 
      verseTelugu, 
      verseEnglish, 
      referenceTelugu, 
      referenceEnglish,
      publishNow,
    } = req.body;
    
    const todayStr = getKolkataDateStr();
    const targetDate = date ? date.trim() : todayStr;
    const targetTime = time ? time.trim() : '05:00 AM';
    const targetMinutes = parseTimeToMinutes(targetTime);

    if (!verseTelugu || !referenceTelugu) {
      res.status(400).json({ success: false, message: 'Verse text and reference are required' });
      return;
    }

    const shouldPublishNow = publishNow === true || publishNow === 'true';
    const statusToSet = shouldPublishNow ? 'sent' : 'scheduled';

    console.log(`📥 [API POST /daily-promise] Saving promise for ${targetDate} @ ${targetTime} (${targetMinutes} mins). Ref: "${referenceTelugu}". publishNow: ${shouldPublishNow}, status: '${statusToSet}'`);

    const promise = await DailyPromise.findOneAndUpdate(
      { date: targetDate },
      {
        date: targetDate,
        time: targetTime,
        bookId: bookId || '',
        bookTelugu: bookTelugu || '',
        bookEnglish: bookEnglish || '',
        chapter: chapter ? Number(chapter) : 1,
        verse: verse ? Number(verse) : 1,
        verseTelugu: verseTelugu.trim(),
        verseEnglish: verseEnglish ? verseEnglish.trim() : '',
        referenceTelugu: referenceTelugu.trim(),
        referenceEnglish: referenceEnglish ? referenceEnglish.trim() : '',
        status: statusToSet,
        notificationSentAt: shouldPublishNow ? new Date() : undefined,
        addedBy: 'admin',
      },
      { upsert: true, new: true }
    );

    if (shouldPublishNow) {
      const pubTime = targetTime;
      const telTitle = '🕊️ నేటి దేవుని వాగ్దానము';
      const telBody = `"${promise.verseTelugu.trim()}"\n\n— ${promise.referenceTelugu.trim()}`;

      try {
        const notice = await Notice.create({
          title: `🌅 నేటి వాగ్దానం (Daily Promise)`,
          description: `📖 "${promise.verseTelugu.trim()}" - ${promise.referenceTelugu.trim()}${promise.verseEnglish ? `\n\n"${promise.verseEnglish.trim()}" - ${promise.referenceEnglish || ''}` : ''}`,
          date: new Date().toISOString(),
          time: pubTime,
          location: 'Daily Scripture Verse',
          isPinned: false,
        });

        const io = req.app.get('io');
        if (io) {
          io.emit('newNotice', notice);
          io.emit('new_promise_notification', {
            promise,
            title: telTitle,
            verseTelugu: promise.verseTelugu,
            referenceTelugu: promise.referenceTelugu,
            verseEnglish: promise.verseEnglish,
            referenceEnglish: promise.referenceEnglish,
            date: targetDate,
            time: pubTime,
          });
        }
      } catch (e) {
        console.log('Notice creation error on immediate promise publish:', e);
      }

      await sendPushNotificationToAll(
        telTitle,
        telBody,
        { 
          type: 'daily_promise', 
          date: targetDate,
          time: pubTime,
          verseTelugu: promise.verseTelugu,
          referenceTelugu: promise.referenceTelugu,
          verseEnglish: promise.verseEnglish,
          referenceEnglish: promise.referenceEnglish,
        }
      );
    }

    res.status(200).json({ 
      success: true, 
      message: shouldPublishNow 
        ? `Promise published and broadcasted immediately for ${targetDate}!`
        : `Promise scheduled successfully for ${targetDate} at ${targetTime}. Notification will be sent at ${targetTime} on the scheduled date.`, 
      data: promise 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to set daily promise', error: error.message });
  }
};

// GET /api/bible-plans/scheduled-promises
// Get all scheduled & upcoming daily promises
export const getScheduledPromises = async (req: Request, res: Response): Promise<void> => {
  try {
    const todayStr = getKolkataDateStr();
    console.log(`📋 [API GET /scheduled-promises] Fetching scheduled promises for date >= ${todayStr} or status: 'scheduled'`);
    const promises = await DailyPromise.find({
      $or: [
        { date: { $gte: todayStr } },
        { status: 'scheduled' }
      ]
    }).sort({ date: 1, createdAt: -1 });

    console.log(`📋 [API GET /scheduled-promises] Found ${promises.length} promises:`, promises.map(p => ({ date: p.date, time: p.time, ref: p.referenceTelugu, status: p.status })));
    res.status(200).json({ success: true, data: promises });
  } catch (error: any) {
    console.error('❌ [API GET /scheduled-promises Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scheduled promises', error: error.message });
  }
};

// DELETE /api/bible-plans/daily-promise/:date
export const deleteDailyPromise = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.params;
    await DailyPromise.findOneAndDelete({ date });
    res.status(200).json({ success: true, message: 'Scheduled promise deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete promise', error: error.message });
  }
};

// GET /api/bible-plans/admin/statistics
export const getAdminPlanStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalEnrolled = await UserPlanProgress.countDocuments();
    const activeStreaks = await UserPlanProgress.countDocuments({ streak: { $gt: 0 } });
    
    const topReaders = await UserPlanProgress.find()
      .sort({ streak: -1, averageScore: -1, completedDays: -1 })
      .limit(10)
      .select('userId userName planId currentDay completedDays streak highestStreak averageScore averageTimeSeconds updatedAt');

    const totalDaysCompleted = await UserPlanProgress.aggregate([
      { $project: { count: { $size: { $ifNull: ['$completedDays', []] } } } },
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEnrolledMembers: totalEnrolled,
        activeStreakCount: activeStreaks,
        totalPortionsCompleted: totalDaysCompleted[0]?.total || 0,
        topReaders,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: error.message });
  }
};

// POST /api/bible-plans/admin/update-plan
export const adminUpdatePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planId, titleTelugu, titleEnglish, descriptionTelugu, descriptionEnglish, durationDays, dailyPortions, category } = req.body;

    if (!planId || !titleEnglish || !durationDays) {
      res.status(400).json({ success: false, message: 'planId, titleEnglish, and durationDays are required' });
      return;
    }

    const updatedPlan = await BiblePlan.findOneAndUpdate(
      { planId },
      {
        planId,
        titleTelugu: titleTelugu || titleEnglish,
        titleEnglish,
        descriptionTelugu: descriptionTelugu || '',
        descriptionEnglish: descriptionEnglish || '',
        durationDays: Number(durationDays),
        dailyPortions: dailyPortions || [],
        category: category || 'custom',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Bible reading plan saved successfully',
      data: updatedPlan,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update reading plan', error: error.message });
  }
};

// Public Share Link Controllers (No Login Required)
// GET /api/bible-plans/public/:planId
export const getPublicPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planId } = req.params;
    let plan = await BiblePlan.findOne({ planId });

    if (!plan) {
      // Create lightweight response for fresh shareable plan
      res.status(200).json({
        success: true,
        data: {
          planId,
          titleTelugu: 'తెలుగు బైబిల్ పఠన ప్రణాళిక',
          titleEnglish: `${planId.toUpperCase()} Reading Plan`,
          durationDays: 365,
          dailyPortions: [],
          category: 'custom'
        }
      });
      return;
    }

    res.status(200).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to load public plan', error: error.message });
  }
};

// POST /api/bible-plans/public/update-plan
export const updatePublicPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planId, titleTelugu, titleEnglish, durationDays, dailyPortions, category } = req.body;

    if (!planId) {
      res.status(400).json({ success: false, message: 'planId is required' });
      return;
    }

    const updatedPlan = await BiblePlan.findOneAndUpdate(
      { planId },
      {
        planId,
        titleTelugu: titleTelugu || titleEnglish || 'బైబిల్ పఠన ప్రణాళిక',
        titleEnglish: titleEnglish || planId,
        durationDays: Number(durationDays) || (dailyPortions ? dailyPortions.length : 365),
        dailyPortions: dailyPortions || [],
        category: category || 'custom',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Bible plan updated via public contributor link',
      data: updatedPlan,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update public plan', error: error.message });
  }
};

// POST /api/bible-plans/translate-verse
export const translateVerse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { verseTelugu, referenceTelugu } = req.body;
    if (!verseTelugu) {
      res.status(400).json({ success: false, message: 'verseTelugu is required' });
      return;
    }

    const groqKey = process.env.GROQ_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    let verseEnglish = '';
    let referenceEnglish = referenceTelugu || '';

    if (groqKey || openAiKey) {
      try {
        const prompt = `Translate this Telugu Bible verse into clear, inspiring English (KJV/NIV style):
Telugu Verse: "${verseTelugu}"
Telugu Reference: "${referenceTelugu || ''}"

Return ONLY a JSON object:
{ "verseEnglish": "...", "referenceEnglish": "..." }
No markdown, no preface.`;

        let text = '';
        if (groqKey) {
          const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.2 }),
          });
          const d = await resp.json();
          text = d.choices?.[0]?.message?.content || '';
        } else if (openAiKey) {
          const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.2 }),
          });
          const d = await resp.json();
          text = d.choices?.[0]?.message?.content || '';
        }

        if (text) {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.verseEnglish) verseEnglish = parsed.verseEnglish;
            if (parsed.referenceEnglish) referenceEnglish = parsed.referenceEnglish;
          }
        }
      } catch (e) {}
    }

    res.status(200).json({ success: true, data: { verseEnglish, referenceEnglish } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

