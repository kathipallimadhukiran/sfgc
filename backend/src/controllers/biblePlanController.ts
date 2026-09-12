import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

// Loaded scripture passage data model
export interface ScriptureVerse {
  chapter: number;
  verse: number;
  textEnglish: string;
  textTelugu: string;
}

export interface LoadedPassageData {
  englishText: string;
  teluguText: string;
  verses: ScriptureVerse[];
  bookTelugu: string;
}

// Load actual Bible passage text for AI context without truncation
const loadPassageTextForAI = (book: string, startCh: number, endCh: number): LoadedPassageData => {
  const result: LoadedPassageData = {
    englishText: '',
    teluguText: '',
    verses: [],
    bookTelugu: '',
  };

  try {
    const possiblePaths = [
      path.resolve(__dirname, '../../../mobile-app/src/data/bible', `${book}.json`),
      path.resolve(process.cwd(), '../mobile-app/src/data/bible', `${book}.json`),
      path.resolve(process.cwd(), 'mobile-app/src/data/bible', `${book}.json`),
      path.resolve(__dirname, '../data/bible', `${book}.json`),
      path.resolve(__dirname, '../../src/data/bible', `${book}.json`),
      path.resolve(process.cwd(), 'src/data/bible', `${book}.json`),
      path.resolve(process.cwd(), 'dist/data/bible', `${book}.json`),
      path.resolve(process.cwd(), 'data/bible', `${book}.json`),
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        result.bookTelugu = data.telName || '';

        const engLines: string[] = [];
        const telLines: string[] = [];

        for (let c = startCh; c <= endCh; c++) {
          const chEng = data.eng?.find((ch: any) => Number(ch.chapter) === c);
          const chTel = data.tel?.find((ch: any) => Number(ch.chapter) === c);

          if (chEng && chEng.verses) {
            chEng.verses.forEach((vEng: any) => {
              const vNum = Number(vEng.verse);
              const vTel = chTel?.verses?.find((vt: any) => Number(vt.verse) === vNum);
              const engText = (vEng.text || '').trim();
              const telText = (vTel?.text || '').trim();

              engLines.push(`${book} ${c}:${vNum} - ${engText}`);
              if (telText) {
                telLines.push(`${data.telName || book} ${c}:${vNum} - ${telText}`);
              }

              result.verses.push({
                chapter: c,
                verse: vNum,
                textEnglish: engText,
                textTelugu: telText,
              });
            });
          }
        }

        result.englishText = engLines.join('\n');
        result.teluguText = telLines.join('\n');
        if (result.verses.length > 0) {
          break;
        }
      }
    }
  } catch (e) {
    console.log('[AI QUIZ] Error reading local Bible passage text:', e);
  }

  return result;
};

// Helper to extract JSON from AI response
const extractJsonFromAIResponse = (text: string): any => {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {}

  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]);
    } catch (e) {}
  }

  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch (e) {}
  }

  return null;
};

// AI Query helper with retry, rate-limit backoff, and model fallbacks
const queryAIWithRetries = async (
  prompt: string,
  systemPrompt: string = '',
  temperature: number = 0.2
): Promise<string> => {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  // 1. Try Gemini if key available
  if (geminiKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: (systemPrompt ? `${systemPrompt}\n\n` : '') + prompt }] }],
            generationConfig: { temperature, maxOutputTokens: 4096 }
          })
        }
      );
      if (resp.ok) {
        const d = await resp.json();
        const t = d.candidates?.[0]?.content?.parts?.[0]?.text;
        if (t) return t;
      }
    } catch (e) {}
  }

  // 2. Try Groq (groq/compound-mini then groq/compound) with retries for rate limits
  if (groqKey) {
    const models = ['groq/compound-mini', 'groq/compound'];
    for (const model of models) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model,
              messages: [
                ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                { role: 'user', content: prompt }
              ],
              temperature,
              max_tokens: 3500
            })
          });

          if (resp.ok) {
            const d = await resp.json();
            const text = d.choices?.[0]?.message?.content;
            if (text) return text;
          } else {
            const errData = await resp.json().catch(() => ({}));
            if (errData.error?.code === 'rate_limit_exceeded') {
              await new Promise(r => setTimeout(r, 2000 * attempt));
            }
          }
        } catch (e) {}
      }
    }
  }

  // 3. Try OpenAI if key available
  if (openAiKey) {
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature
        })
      });
      if (resp.ok) {
        const d = await resp.json();
        return d.choices?.[0]?.message?.content || '';
      }
    } catch (e) {}
  }

  // 4. Try Pollinations AI free endpoint
  try {
    const resp = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        model: 'openai',
        seed: Math.floor(Math.random() * 1000000)
      })
    });
    if (resp.ok) {
      return await resp.text();
    }
  } catch (e) {}

  return '';
};

// Normalize candidate question structure
const normalizeQuestion = (q: any, defaultBook: string, startCh: number) => {
  const questionEnglish = (q.questionEnglish || q.question || '').trim();
  const questionTelugu = (q.questionTelugu || q.question_telugu || questionEnglish).trim();

  let optionsEnglish = Array.isArray(q.optionsEnglish)
    ? q.optionsEnglish
    : (Array.isArray(q.options) ? q.options : (Array.isArray(q.answers) ? q.answers : []));

  let optionsTelugu = Array.isArray(q.optionsTelugu)
    ? q.optionsTelugu
    : (Array.isArray(q.options_telugu) ? q.options_telugu : optionsEnglish);

  if (optionsEnglish.length < 4) {
    optionsEnglish = ['Option A', 'Option B', 'Option C', 'Option D'];
  }
  if (optionsTelugu.length < 4) {
    optionsTelugu = optionsEnglish;
  }

  const correctIndex = typeof q.correctIndex === 'number'
    ? q.correctIndex
    : (typeof q.correctAnswer === 'number' ? q.correctAnswer : 0);

  const explanationEnglish = (q.explanationEnglish || q.explanation || '').trim();
  const explanationTelugu = (q.explanationTelugu || q.explanation_telugu || explanationEnglish).trim();

  const reference = (q.reference || `${defaultBook} ${startCh}`).trim();
  const evidence = (q.evidence || explanationEnglish || questionEnglish).trim();

  return {
    id: q.id || Math.floor(Math.random() * 10000),
    chapter: q.chapter || startCh,
    category: q.category || 'factual',
    difficulty: q.difficulty || 'easy',
    questionEnglish,
    questionTelugu,
    optionsEnglish,
    optionsTelugu,
    correctIndex: Math.min(Math.max(0, correctIndex), 3),
    explanationEnglish,
    explanationTelugu,
    reference,
    evidence,
  };
};

// Deterministic grounded verse fallback extractor (Guarantees zero generic spiritual questions if AI is offline)
const generateStrictGroundedFallbackQuestions = (
  book: string,
  bookTel: string,
  startC: number,
  endC: number,
  passage: LoadedPassageData
) => {
  const fallbackList: any[] = [];
  const telName = passage.bookTelugu || bookTel || book;

  passage.verses.forEach(v => {
    const textEng = v.textEnglish;
    const textTel = v.textTelugu;
    const ref = `${book} ${v.chapter}:${v.verse}`;

    // 1. Age / Number facts
    const ageMatch = textEng.match(/(\d+)\s+years/i);
    if (ageMatch && fallbackList.length < 10) {
      const numberVal = ageMatch[1];
      fallbackList.push({
        id: fallbackList.length + 1,
        chapter: v.chapter,
        category: 'number',
        difficulty: 'easy',
        questionEnglish: `According to ${ref}, how many years are explicitly recorded?`,
        questionTelugu: `${telName} ${v.chapter}:${v.verse} ప్రకారం, ఎన్ని సంవత్సరాలు స్పష్టంగా రాయబడ్డాయి?`,
        optionsEnglish: [`${numberVal} years`, `${Number(numberVal) + 10} years`, `${Math.max(1, Number(numberVal) - 20)} years`, `${Number(numberVal) + 50} years`],
        optionsTelugu: [`${numberVal} సంవత్సరాలు`, `${Number(numberVal) + 10} సంవత్సరాలు`, `${Math.max(1, Number(numberVal) - 20)} సంవత్సరాలు`, `${Number(numberVal) + 50} సంవత్సరాలు`],
        correctIndex: 0,
        explanationEnglish: `According to ${ref}, the scripture states: "${textEng}"`,
        explanationTelugu: `${ref} ప్రకారం వాక్యము: "${textTel || textEng}"`,
        reference: ref,
        evidence: textEng,
      });
    }

    // 2. Direct Verse Statements & Actions
    if ((textEng.includes('begat') || textEng.includes('father') || textEng.includes('built') || textEng.includes('said') || textEng.includes('commanded')) && fallbackList.length < 20) {
      fallbackList.push({
        id: fallbackList.length + 1,
        chapter: v.chapter,
        category: 'action',
        difficulty: 'medium',
        questionEnglish: `What factual detail is explicitly stated in ${ref}?`,
        questionTelugu: `${telName} ${v.chapter}:${v.verse} లో నమోదైన స్పష్టమైన విషయం ఏది?`,
        optionsEnglish: [textEng.substring(0, 75), "No specific detail given", "An unrelated historical statement", "None of these"],
        optionsTelugu: [(textTel || textEng).substring(0, 75), "ఏ వివరమూ లేదు", "సంబంధం లేని సంఘటన", "ఏదీ కాదు"],
        correctIndex: 0,
        explanationEnglish: `Scripture passage ${ref}: "${textEng}"`,
        explanationTelugu: `${ref} లో వాక్యము: "${textTel || textEng}"`,
        reference: ref,
        evidence: textEng,
      });
    }
  });

  return fallbackList;
};

// Dynamic 2-Stage Dual-AI Quiz Generator (Gemini/Groq Stage 1 Knowledge Map -> Stage 2 Candidates -> Stage 3 Verification)
export const generateQuizForPassage = async (
  book: string,
  bookTelugu: string,
  startCh: number,
  endCh: number,
  attempt: number,
  userId: string = 'guest_user',
  dayId: number = 1
) => {
  const quizSessionId = crypto.randomUUID ? crypto.randomUUID() : `${userId}_day${dayId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const passageData = loadPassageTextForAI(book, startCh, endCh);
  const chapterRangeStr = startCh === endCh ? `${book} ${startCh}` : `${book} ${startCh} to ${endCh}`;

  console.log('\n======================================================================');
  console.log(`📤 [STRICT SOURCE-ONLY QUIZ PIPELINE] Session: ${quizSessionId}`);
  console.log(`📖 Reading Portion: ${chapterRangeStr} (${bookTelugu})`);
  console.log(`📜 Loaded Scripture Verses: ${passageData.verses.length}`);
  console.log(`👤 User ID: ${userId} | Attempt #${attempt} | Day #${dayId}`);
  console.log('======================================================================\n');

  console.log(`[AI QUIZ] Day: day${dayId}`);
  const chaptersArray: string[] = [];
  for (let c = startCh; c <= endCh; c++) {
    chaptersArray.push(`${book} ${c}`);
  }
  console.log(`[AI QUIZ] Chapters: ${chaptersArray.join(', ')}`);

  const STRICT_SYSTEM_PROMPT = `You are a Bible text-grounded quiz generator.

Your ONLY source of truth is the Bible text supplied in this request.

You are NOT allowed to use your general knowledge.

You are NOT allowed to use information from any other Bible chapter or book.

You are NOT allowed to import Christian theology, doctrine, sermons, commentaries, or personal interpretation.

Every question must be directly answerable from the supplied text.

Every correct answer must be explicitly supported by the supplied text.

Every explanation must be supported by the supplied text.

Every question must contain an exact chapter/verse reference.

If a question cannot be proven from the supplied text, DO NOT generate it.

Prefer factual and comprehension questions about:
people,
events,
places,
actions,
commands,
relationships,
numbers,
ages,
sequence,
statements,
and consequences explicitly described in the text.

Avoid generic spiritual-lesson questions.

Never invent information.

Return structured JSON only.`;

  // STEP 1: Grounded Candidate Question Generation (Extract Factual Facts & Generate 20 Candidates)
  console.log('🤖 [STEP 1] Generating 20 Grounded Candidate Questions directly from scripture text...');
  const step1Prompt = `SUPPLIED BIBLE TEXT FOR ${chapterRangeStr}:
${passageData.englishText}

Extract explicit facts and generate 20 distinct candidate questions strictly based on the scripture text above.

BANNED QUESTION PATTERNS (DO NOT GENERATE):
- "What spiritual lesson..."
- "What eternal hope..."
- "How should a believer..."
- "What practical commitment..."
- "How should Christians..."
- "What does God's grace teach..."
- "What does this mean for our spiritual life..."
- Any question importing outside Christian theology or New Testament concepts.

PREFER FACTUAL QUESTIONS:
Who?, What?, Where?, When?, How?, Which?, How many?, What happened?, What did X say?, What did X do?, What did God command?, What was the result?, What happened before/after?, What object/person/place was mentioned?, What sequence of events occurred?

Return raw JSON array of 20 candidate question objects ONLY:
[
  {
    "id": 1,
    "chapter": ${startCh},
    "category": "person",
    "difficulty": "easy",
    "questionEnglish": "Who was the father of Noah?",
    "questionTelugu": "నోవహు తండ్రి ఎవరు?",
    "optionsEnglish": ["Lamech", "Methuselah", "Enoch", "Seth"],
    "optionsTelugu": ["లేమెకు", "మెతూషెల", "హానోకు", "షేతు"],
    "correctIndex": 0,
    "explanationEnglish": "Lamech lived 182 years and begat Noah.",
    "explanationTelugu": "లేమెకు నోవహును కనెను.",
    "reference": "${book} ${startCh}:28-29",
    "evidence": "Lamech lived 182 years and begat a son named Noah."
  }
]`;

  const step1Raw = await queryAIWithRetries(step1Prompt, STRICT_SYSTEM_PROMPT, 0.2);
  const rawCandidates = extractJsonFromAIResponse(step1Raw);
  const candidatePool: any[] = Array.isArray(rawCandidates)
    ? rawCandidates.map(c => normalizeQuestion(c, book, startCh))
    : [];

  console.log(`[AI QUIZ] Candidate questions generated: ${candidatePool.length}`);

  // STEP 3: Source Verification (Secondary AI Validator)
  console.log('🛡️ [STEP 3] Running Secondary AI Source Verification...');
  let validationMap = new Map<number, any>();
  if (candidatePool.length > 0) {
    const validatePrompt = `Determine whether each question is completely supported by the supplied Bible text.

SUPPLIED BIBLE TEXT (${chapterRangeStr}):
${passageData.englishText}

CANDIDATES TO VERIFY:
${JSON.stringify(candidatePool.map(c => ({
  id: c.id,
  question: c.questionEnglish,
  options: c.optionsEnglish,
  correctIndex: c.correctIndex,
  explanation: c.explanationEnglish,
  reference: c.reference,
  evidence: c.evidence
})))}

Return raw JSON array ONLY:
[
  {
    "id": 1,
    "valid": true,
    "correctAnswer": 0,
    "referenceValid": true,
    "evidenceSupported": true,
    "explanationSupported": true,
    "outsideKnowledgeUsed": false,
    "reason": "Supported by text"
  }
]`;

    const valRaw = await queryAIWithRetries(validatePrompt, '', 0.1);
    const valArray = extractJsonFromAIResponse(valRaw);
    if (Array.isArray(valArray)) {
      validationMap = new Map(valArray.map((v: any) => [v.id, v]));
    }
  }

  // STEP 4: Strict Filtering & Rejection Logging
  let rejectedOutsideKnowledge = 0;
  let rejectedUnsupportedAnswer = 0;
  let rejectedDuplicate = 0;

  const validatedQuestions: any[] = [];
  const seenTexts = new Set<string>();

  for (const q of candidatePool) {
    const norm = q.questionEnglish.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

    // Check duplicate
    let isDup = false;
    for (const seen of seenTexts) {
      const wordsA = new Set<string>(norm.split(/\s+/).filter((w: string) => w.length > 3));
      const wordsB = new Set<string>(seen.split(/\s+/).filter((w: string) => w.length > 3));
      if (wordsA.size > 0 && wordsB.size > 0) {
        let common = 0;
        wordsA.forEach((w: string) => { if (wordsB.has(w)) common++; });
        if (common / Math.min(wordsA.size, wordsB.size) > 0.70) {
          isDup = true;
          break;
        }
      }
    }

    if (isDup) {
      rejectedDuplicate++;
      console.log(`[AI QUIZ] Rejected - duplicate: Q#${q.id} "${q.questionEnglish}" | Reason: Paraphrased duplicate question`);
      continue;
    }

    // Check banned theological keywords
    const lowerQ = (q.questionEnglish + ' ' + q.explanationEnglish).toLowerCase();
    if (
      lowerQ.includes('spiritual lesson') ||
      lowerQ.includes('eternal hope') ||
      lowerQ.includes('how should a believer') ||
      lowerQ.includes('practical commitment') ||
      lowerQ.includes('god\'s grace teach') ||
      lowerQ.includes('transformation does god') ||
      lowerQ.includes('holy spirit') ||
      lowerQ.includes('christ\'s blood') ||
      lowerQ.includes('salvation through')
    ) {
      rejectedOutsideKnowledge++;
      console.log(`[AI QUIZ] Rejected - outside knowledge: Q#${q.id} "${q.questionEnglish}" | Reason: Contains banned theological concepts outside text`);
      continue;
    }

    const v = validationMap.get(q.id);
    if (v) {
      if (v.outsideKnowledgeUsed === true) {
        rejectedOutsideKnowledge++;
        console.log(`[AI QUIZ] Rejected - outside knowledge: Q#${q.id} "${q.questionEnglish}" | Reason: ${v.reason || 'Introduced outside knowledge'}`);
        continue;
      }

      if (!v.valid || !v.referenceValid || !v.evidenceSupported || !v.explanationSupported) {
        rejectedUnsupportedAnswer++;
        console.log(`[AI QUIZ] Rejected - unsupported answer: Q#${q.id} "${q.questionEnglish}" | Reason: ${v.reason || 'Unsupported answer or invalid reference'}`);
        continue;
      }

      if (typeof v.correctAnswer === 'number' && v.correctAnswer >= 0 && v.correctAnswer <= 3) {
        q.correctIndex = v.correctAnswer;
      }
    } else {
      if (!q.evidence || q.evidence.length < 5 || !q.reference) {
        rejectedUnsupportedAnswer++;
        console.log(`[AI QUIZ] Rejected - unsupported answer: Q#${q.id} "${q.questionEnglish}" | Reason: Missing mandatory evidence quote`);
        continue;
      }
    }

    seenTexts.add(norm);
    validatedQuestions.push(q);
  }

  // Fallback to strict grounded verse generator if AI returned fewer than 10 validated questions
  if (validatedQuestions.length < 10) {
    console.log(`⚠️ [PIPELINE SUPPLEMENT] Validated count is ${validatedQuestions.length}/10. Generating grounded verse facts to complete pool...`);
    const fallbackPool = generateStrictGroundedFallbackQuestions(book, bookTelugu, startCh, endCh, passageData);
    for (const fq of fallbackPool) {
      if (validatedQuestions.length >= 10) break;
      const fNorm = fq.questionEnglish.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      if (!seenTexts.has(fNorm)) {
        seenTexts.add(fNorm);
        validatedQuestions.push(fq);
      }
    }
  }

  console.log(`[AI QUIZ] Rejected - outside knowledge: ${rejectedOutsideKnowledge}`);
  console.log(`[AI QUIZ] Rejected - unsupported answer: ${rejectedUnsupportedAnswer}`);
  console.log(`[AI QUIZ] Rejected - duplicate: ${rejectedDuplicate}`);
  console.log(`[AI QUIZ] Validated questions: ${validatedQuestions.length}`);

  // Select 10 questions and shuffle options
  const finalPool = validatedQuestions.slice(0, 10);
  console.log(`[AI QUIZ] Final questions: ${finalPool.length}`);

  const final10Questions = finalPool.map((q, idx) => {
    const shuffled = shuffleQuestion(q);
    return {
      ...shuffled,
      id: idx + 1,
      quizSessionId,
    };
  });

  logGeneratedQuestions(
    'Dual-AI Source-Only Grounded Engine',
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

