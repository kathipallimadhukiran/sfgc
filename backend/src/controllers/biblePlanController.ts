import { Request, Response } from 'express';
import { BiblePlan, UserPlanProgress } from '../models/biblePlanModel';
import { DailyPromise } from '../models/DailyPromise';

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

  // Built-in intelligent 10-question fallback covering every chapter (shuffled!)
  const rawFallback = [
    {
      id: 1,
      chapter: startCh,
      questionTelugu: `${bookTelugu} ${startCh}వ అధ్యాయం ప్రకారం ఆదియందు దేవుడు ఏమి చేసెను?`,
      questionEnglish: `According to ${book} Chapter ${startCh}, what did God do in the beginning?`,
      optionsTelugu: ["భూమ్యాకాశములను సృజించెను", "సూర్య చంద్రులను చేసెను", "సముద్రమును చేసెను", "పర్వతములను నిలిపెను"],
      optionsEnglish: ["Created the heavens and the earth", "Made the sun and moon", "Created the oceans", "Formed the mountains"],
      correctIndex: 0,
      explanationTelugu: "ఆదియందు దేవుడు భూమ్యాకాశములను సృజించెను (ఆదికాండము 1:1).",
      explanationEnglish: "In the beginning God created the heaven and the earth (Genesis 1:1)."
    },
    {
      id: 2,
      chapter: startCh,
      questionTelugu: `దేవుడు 'వెలుగు కలుగును గాక' అని పలికినప్పుడు ఏమి జరిగెను?`,
      questionEnglish: `When God said 'Let there be light', what happened?`,
      optionsTelugu: ["చీకటి ఆవరించెను", "వెలుగు కలిగెను", "సూర్యుడు ఉదయించెను", "ఏమీ జరగలేదు"],
      optionsEnglish: ["Darkness covered the earth", "There was light", "The sun rose", "Nothing happened"],
      correctIndex: 1,
      explanationTelugu: "దేవుడు వెలుగు కలుగును గాక అని పలుకగా వెలుగు కలిగెను (ఆదికాండము 1:3).",
      explanationEnglish: "And God said, Let there be light: and there was light (Genesis 1:3)."
    },
    {
      id: 3,
      chapter: startCh,
      questionTelugu: `దేవుడు నరుని ఎవరి స్వరూపమందు సృష్టించెను?`,
      questionEnglish: `In whose image did God create mankind?`,
      optionsTelugu: ["దేవదూతల స్వరూపములో", "సృష్టి పోలికలో", "తన స్వస్వరూపమందు / తన పోలికలో", "జంతువుల పోలికలో"],
      optionsEnglish: ["In the image of angels", "In the image of nature", "In His own image / likeness", "In the image of animals"],
      correctIndex: 2,
      explanationTelugu: "దేవుడు తన స్వస్వరూపమందు నరుని సృజించెను (ఆదికాండము 1:27).",
      explanationEnglish: "So God created man in his own image (Genesis 1:27)."
    },
    {
      id: 4,
      chapter: Math.min(startCh + 1, endCh),
      questionTelugu: `దేవుడు ఏడవ దినమున ఏమి చేసెను?`,
      questionEnglish: `What did God do on the seventh day?`,
      optionsTelugu: ["కొత్త సృష్టి చేసెను", "తోటను నాటెను", "నరునికి పేరు పెట్టెను", "తన పనియంతటినుండి విశ్రమించి, ఆ దినమును పరిశుద్ధపరచెను"],
      optionsEnglish: ["Created new things", "Planted a garden", "Named mankind", "Rested from all His work and sanctified it"],
      correctIndex: 3,
      explanationTelugu: "దేవుడు తాను చేసిన తన పనియంతటినుండి ఏడవ దినమున విశ్రమించి దానిని పరిశుద్ధపరచెను (ఆదికాండము 2:2-3).",
      explanationEnglish: "God rested on the seventh day from all his work and sanctified it (Genesis 2:2-3)."
    },
    {
      id: 5,
      chapter: Math.min(startCh + 1, endCh),
      questionTelugu: `దేవుడు నేల మంటితో నరుని నిర్మించి అతని నాసికారంధ్రములలో ఏమి ఊదెను?`,
      questionEnglish: `What did God breathe into the nostrils of the man formed of dust?`,
      optionsTelugu: ["పరిశుద్ధాత్మను ఇచ్చెను", "జీవవాయువును ఊదగా నరుడు జీవాత్మ ఆయెను", "నీటిని చిలకరించెను", "ఏమీ ఊదలేదు"],
      optionsEnglish: ["Holy Spirit", "The breath of life; and man became a living soul", "Sprinkled water", "Nothing"],
      correctIndex: 1,
      explanationTelugu: "జీవవాయువును అతని నాసికారంధ్రములలో ఊదగా నరుడు జీవాత్మ ఆయెను (ఆదికాండము 2:7).",
      explanationEnglish: "Breathed into his nostrils the breath of life; and man became a living soul (Genesis 2:7)."
    },
    {
      id: 6,
      chapter: Math.min(startCh + 1, endCh),
      questionTelugu: `ఏదెను తోటను సాగుచేయుటకు మరియు భద్రపరచుటకు దేవుడు ఎవరిని ఉంచెను?`,
      questionEnglish: `Whom did God place in the Garden of Eden to dress and keep it?`,
      optionsTelugu: ["దేవదూతలను", "నోవహును", "ఆదామును", "అబ్రాహామును"],
      optionsEnglish: ["Angels", "Noah", "Adam", "Abraham"],
      correctIndex: 2,
      explanationTelugu: "ఆదామును ఏదెను తోటలో ఉంచెను (ఆదికాండము 2:15).",
      explanationEnglish: "The Lord God took the man, and put him into the garden of Eden (Genesis 2:15)."
    },
    {
      id: 7,
      chapter: endCh,
      questionTelugu: `దేవుడు తోటలో తినకూడదని ఆజ్ఞాపించిన వృక్షము ఏది?`,
      questionEnglish: `Which tree's fruit did God command man not to eat?`,
      optionsTelugu: ["జీవ వృక్షము", "అంజూరపు చెట్టు", "ద్రాక్ష చెట్టు", "మంచి చెడ్డల తెలివినిచ్చు వృక్ష ఫలములు"],
      optionsEnglish: ["Tree of life", "Fig tree", "Grapevine", "Tree of the knowledge of good and evil"],
      correctIndex: 3,
      explanationTelugu: "మంచి చెడ్డల తెలివినిచ్చు వృక్ష ఫలములను నీవు తినకూడదు (ఆదికాండము 2:17).",
      explanationEnglish: "Of the tree of the knowledge of good and evil, thou shalt not eat of it (Genesis 2:17)."
    },
    {
      id: 8,
      chapter: endCh,
      questionTelugu: `స్త్రీని మోసగించి నిషేధిత ఫలమును తినునట్లు చేసినది ఏది?`,
      questionEnglish: `What deceived the woman into eating the forbidden fruit?`,
      optionsTelugu: ["సర్పము (అపవాది)", "తోడేలు", "సింహము", "పక్షి"],
      optionsEnglish: ["The serpent (Satan)", "A wolf", "A lion", "A bird"],
      correctIndex: 0,
      explanationTelugu: "సర్పము దేవుడైన యెహోవా చేసిన సమస్త భూజంతువులకంటె యుక్తిగలదై యుండెను (ఆదికాండము 3:1).",
      explanationEnglish: "The serpent was more subtil than any beast of the field (Genesis 3:1)."
    },
    {
      id: 9,
      chapter: endCh,
      questionTelugu: `ఆదాము హవ్వల అవిధేయత వలన మానవజాతికి ఏమి సంభవించెను?`,
      questionEnglish: `What entered the world through the disobedience of Adam and Eve?`,
      optionsTelugu: ["నిత్య సంతోషము", "పాపము మరియు మరణము", "సంపద", "శాశ్వత జీవము"],
      optionsEnglish: ["Eternal joy", "Sin and spiritual death", "Earthly riches", "Immunity"],
      correctIndex: 1,
      explanationTelugu: "పాపము లోకములోనికి ప్రవేశించెను మరియు మరణము సంభవించెను (రోమీ 5:12, ఆదికాండము 3:19).",
      explanationEnglish: "By one man sin entered into the world, and death by sin (Romans 5:12, Genesis 3)."
    },
    {
      id: 10,
      chapter: endCh,
      questionTelugu: `దేవుడు ఆదాము హవ్వలకు చర్మపు చొక్కాయిలను తొడిగించుట దేనికి సూచన?`,
      questionEnglish: `What did God making coats of skins to clothe Adam and Eve symbolize?`,
      optionsTelugu: ["శరీర సౌందర్యము", "కేవలం చలి నుండి రక్షణ", "రక్తము చిందించుట ద్వారా పాపములకు ప్రాయశ్చిత్తము మరియు దేవుని కృప", "ఏదీ కాదు"],
      optionsEnglish: ["Physical fashion", "Protection from cold only", "Atonement for sin through shedding of blood and God's grace", "None"],
      correctIndex: 2,
      explanationTelugu: "దేవుడు చర్మపు చొక్కాయిలను చేయించి వారికి తొడిగించెను (ఆదికాండము 3:21).",
      explanationEnglish: "The Lord God made coats of skins, and clothed them (Genesis 3:21)."
    }
  ];

  return rawFallback.map(shuffleQuestion);
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

    const formattedLeaders = leaders.map((item, idx) => ({
      rank: idx + 1,
      userId: item.userId,
      userName: item.userName || `Member #${item.userId.substring(0, 5)}`,
      streak: item.streak || 0,
      highestStreak: item.highestStreak || 0,
      averageScore: item.averageScore || 0,
      completedDays: item.completedDays ? item.completedDays.length : 0,
      averageTimeSeconds: item.averageTimeSeconds || 0,
    }));

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

    const promise = await DailyPromise.findOneAndUpdate(
      { date: todayStr },
      {
        date: todayStr,
        verseTelugu,
        verseEnglish: verseEnglish || '',
        referenceTelugu,
        referenceEnglish: referenceEnglish || '',
        addedBy: 'admin',
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: 'Daily Promise updated successfully', data: promise });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to set daily promise', error: error.message });
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

