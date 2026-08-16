import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { BiblePlan, UserPlanProgress } from '../models/biblePlanModel';
import { DailyPromise } from '../models/DailyPromise';
import { Notice } from '../models/Notice';

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

// Generate 10 dynamic passage quiz questions with AI covering every chapter
const generateQuizForPassage = async (book: string, bookTelugu: string, startCh: number, endCh: number, attempt: number) => {
  const groqKey = process.env.GROQ_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  const chaptersList = [];
  for (let c = startCh; c <= endCh; c++) {
    chaptersList.push(c);
  }
  const chaptersStr = chaptersList.join(', ');

  if (groqKey || openAiKey) {
    try {
      const prompt = `You are a biblical scholar and language expert.
Generate exactly 10 distinct, highly accurate multiple-choice quiz questions (Attempt #${attempt}) in both Telugu and English for testing daily Bible reading comprehension of ${book} (${bookTelugu}) chapters ${startCh} to ${endCh}.
IMPORTANT RULES:
1. Cover every single chapter in the reading (${chaptersStr}) evenly across the 10 questions.
2. Ensure 100% theological accuracy, correct facts, and 0 spelling/grammatical errors in both Telugu and English.
3. Every question MUST have exactly 4 options. Randomly distribute correct answers across A (0), B (1), C (2), and D (3). DO NOT always put the correct answer at index 0!
4. Provide a clear, spiritually enriching explanation with scripture reference in both Telugu and English.

Output ONLY a valid JSON array of 10 objects with this exact structure:
[
  {
    "id": 1,
    "chapter": ${startCh},
    "questionTelugu": "స్పష్టమైన తెలుగు ప్రశ్న",
    "questionEnglish": "Clear English question",
    "optionsTelugu": ["ఆప్షన్ A", "ఆప్షన్ B", "ఆప్షన్ C", "ఆప్షన్ D"],
    "optionsEnglish": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 2,
    "explanationTelugu": "సమాధానం యొక్క వివరణ మరియు రిఫరెన్స్",
    "explanationEnglish": "Answer explanation and scripture reference"
  }
]
Output ONLY raw JSON. No markdown, no preface, no trailing text.`;

      let responseText = '';
      if (groqKey) {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          responseText = data.choices?.[0]?.message?.content || '';
        }
      } else if (openAiKey) {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          responseText = data.choices?.[0]?.message?.content || '';
        }
      }

      if (responseText) {
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length >= 5) {
          return parsed.map(shuffleQuestion);
        }
      }
    } catch (e) {
      console.log('AI 10-Question Quiz generation fallback:', e);
    }
  }

  // Built-in dynamic passage-specific 10-question generator covering reading portion
  const generatePassageSpecificFallback = (bookName: string, bookTel: string, startC: number, endC: number) => {
    const questions = [
      {
        id: 1,
        chapter: startC,
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
        questionTelugu: `${bookTel} ${endC}వ అధ్యాయము చదివిన తరువాత మన దైనందిన జీవితంలో ఏ తీర్మానం తీసుకోవాలి?`,
        questionEnglish: `After reading ${bookName} Chapter ${endC}, what practical commitment should we make?`,
        optionsTelugu: ["దేవుని చిత్తమునకు పూర్తిగా లొంగిపోవుట", "నా ఇష్ట ప్రకారము జీవించుట", "వాక్యమును మరచిపోవుట", "ఏమీ చేయకపోవుట"],
        optionsEnglish: ["Completely submit to God's holy will", "Live by personal desires", "Forget the message", "Do nothing"],
        correctIndex: 0,
        explanationTelugu: "ప్రతిరోజూ దేవుని వాక్యమునకు విధేయులమై ఆయన మహిమ కొరకు జీవించుటకు తీర్మానించుకోవాలి.",
        explanationEnglish: "Commit daily to obeying God's Word and living for His divine glory."
      }
    ];

    return questions.map(shuffleQuestion);
  };

  return generatePassageSpecificFallback(book, bookTelugu, startCh, endCh);
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
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        progress.streak = 0;
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
      currentAttempt
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
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
          progress.streak += 1;
        } else {
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

    const leaders = await UserPlanProgress.find({ planId: String(planId) })
      .sort({ streak: -1, averageScore: -1, completedDays: -1, averageTimeSeconds: 1 })
      .limit(Number(limit))
      .select('userId userName planId currentDay completedDays streak highestStreak averageScore averageTimeSeconds updatedAt');

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

    const formattedLeaders = leaders.map((item, idx) => {
      let exactName = userMap.get(item.userId) || item.userName || '';

      // Clean up raw roles if erroneously set as name
      const genericRoles = ['member', 'admin', 'super admin', 'guest', 'administrator'];
      if (!exactName || genericRoles.includes(exactName.toLowerCase().trim())) {
        exactName = item.userName && !genericRoles.includes(item.userName.toLowerCase().trim())
          ? item.userName
          : (allUsers[idx % allUsers.length]?.name || `Beloved Member`);
      }

      return {
        rank: idx + 1,
        userId: item.userId,
        userName: exactName,
        streak: item.streak || 0,
        highestStreak: item.highestStreak || 0,
        averageScore: item.averageScore || 0,
        completedDays: item.completedDays ? item.completedDays.length : 0,
        averageTimeSeconds: item.averageTimeSeconds || 0,
      };
    });

    res.status(200).json({ success: true, count: formattedLeaders.length, data: formattedLeaders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard', error: error.message });
  }
};

// GET /api/bible-plans/daily-promise
export const getDailyPromise = async (req: Request, res: Response): Promise<void> => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    let promise = await DailyPromise.findOne({ date: todayStr });

    if (!promise) {
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
        verseTelugu: selected.verseTelugu,
        verseEnglish: selected.verseEnglish,
        referenceTelugu: selected.referenceTelugu,
        referenceEnglish: selected.referenceEnglish,
        addedBy: 'ai',
      });
      await promise.save();
    }

    res.status(200).json({ success: true, data: promise });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch daily promise', error: error.message });
  }
};

// POST /api/bible-plans/daily-promise
export const setDailyPromise = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, verseTelugu, verseEnglish, referenceTelugu, referenceEnglish } = req.body;
    const todayStr = date || new Date().toISOString().split('T')[0];

    if (!verseTelugu || !referenceTelugu) {
      res.status(400).json({ success: false, message: 'verseTelugu and referenceTelugu are required' });
      return;
    }

    // Auto-generate English verse and reference via AI if not supplied
    let finalVerseEng = verseEnglish ? verseEnglish.trim() : '';
    let finalRefEng = referenceEnglish ? referenceEnglish.trim() : '';

    if (!finalVerseEng || !finalRefEng) {
      const groqKey = process.env.GROQ_API_KEY;
      const openAiKey = process.env.OPENAI_API_KEY;

      if (groqKey || openAiKey) {
        try {
          const prompt = `Translate this Telugu Bible verse into clear English (KJV/NIV style):
Verse: "${verseTelugu}"
Reference: "${referenceTelugu}"

Output ONLY a valid JSON object:
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
              if (!finalVerseEng && parsed.verseEnglish) finalVerseEng = parsed.verseEnglish;
              if (!finalRefEng && parsed.referenceEnglish) finalRefEng = parsed.referenceEnglish;
            }
          }
        } catch (aiErr) {
          console.log('AI Translation for promise skipped:', aiErr);
        }
      }
    }

    const promise = await DailyPromise.findOneAndUpdate(
      { date: todayStr },
      {
        date: todayStr,
        verseTelugu,
        verseEnglish: finalVerseEng,
        referenceTelugu,
        referenceEnglish: finalRefEng,
        addedBy: 'admin',
      },
      { upsert: true, new: true }
    );

    // Auto-post Church Notification / Announcement to all mobile members
    let newNotice = null;
    try {
      newNotice = await Notice.create({
        title: `🌅 నేటి వాగ్దానం (Daily Promise)`,
        description: `📖 "${verseTelugu.trim()}" - ${referenceTelugu.trim()}${verseEnglish ? `\n\n"${verseEnglish.trim()}" - ${referenceEnglish || ''}` : ''}`,
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        location: 'Daily Scripture Verse',
        isPinned: false,
      });
    } catch (noticeErr) {
      console.log('Notice creation for Daily Promise ignored:', noticeErr);
    }

    // Broadcast real-time socket events
    const io = (req as any).app?.get('io');
    if (io) {
      io.emit('new_promise_notification', {
        title: '🌅 Today\'s Daily Promise',
        verseTelugu,
        referenceTelugu,
        verseEnglish,
        referenceEnglish,
        promise,
      });
      if (newNotice) {
        io.emit('newNotice', newNotice);
      }
    }

    res.status(200).json({ success: true, message: 'Daily Promise updated successfully', data: promise });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to set daily promise', error: error.message });
  }
};

// GET /api/bible-plans/scheduled-promises
// Get all scheduled daily promises (up to next 14 days)
export const getScheduledPromises = async (req: Request, res: Response): Promise<void> => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const promises = await DailyPromise.find({ date: { $gte: todayStr } }).sort({ date: 1 }).limit(14);
    res.status(200).json({ success: true, data: promises });
  } catch (error: any) {
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

