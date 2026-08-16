import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../constants/config';
import { DEFAULT_1_YEAR_PLAN, DEFAULT_2_YEAR_PLAN, BiblePlanData, DailyPortion } from '../constants/defaultBiblePlans';

export interface UserProgressData {
  userId: string;
  userName?: string;
  planId: string;
  currentDay: number;
  completedDays: number[];
  readMarkedDays: number[];
  startDate?: string;
  targetEndDate?: string;
  streak: number;
  highestStreak: number;
  averageScore?: number;
  totalQuizzes?: number;
  averageTimeSeconds?: number;
  lastCompletedDate?: string;
  dailyAttempts: Record<string, number>;
  quizScores: Record<string, number>;
}

export interface LeaderboardUser {
  rank: number;
  userId: string;
  userName: string;
  streak: number;
  highestStreak: number;
  averageScore: number;
  completedDays: number;
  averageTimeSeconds: number;
}

export interface DailyPromiseData {
  verseTelugu: string;
  verseEnglish: string;
  referenceTelugu: string;
  referenceEnglish: string;
  addedBy: 'admin' | 'ai';
}

// Client-side option shuffling helper so correct answer is NOT always Option A
export const shuffleQuestion = (q: any) => {
  const indices = [0, 1, 2, 3];
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

class BiblePlanService {
  private localProgressKey = 'user_bible_plan_progress';

  // Get active reading plan
  async getPlan(planId: string = '1-year-canonical'): Promise<BiblePlanData> {
    try {
      const resp = await axios.get(`${API_URL}/api/bible-plans`, { timeout: 4000 });
      if (resp.data && resp.data.data && Array.isArray(resp.data.data)) {
        const found = resp.data.data.find((p: any) => p.planId === planId);
        if (found && found.dailyPortions && found.dailyPortions.length > 0) {
          return found;
        }
      }
    } catch (e) {
      console.log('BiblePlanService: Using offline plan');
    }

    return planId === '2-year-canonical' ? DEFAULT_2_YEAR_PLAN : DEFAULT_1_YEAR_PLAN;
  }

  // Get all active reading plans (both built-in and dynamic admin plans)
  async getAllPlans(): Promise<BiblePlanData[]> {
    try {
      const resp = await axios.get(`${API_URL}/api/bible-plans`, { timeout: 4000 });
      if (resp.data && resp.data.data && Array.isArray(resp.data.data) && resp.data.data.length > 0) {
        return resp.data.data;
      }
    } catch (e) {}

    return [DEFAULT_1_YEAR_PLAN, DEFAULT_2_YEAR_PLAN];
  }

  // Get user's progress, dates, and streak
  async getUserProgress(userId: string = 'guest_user', planId: string = '1-year-canonical'): Promise<UserProgressData> {
    const userKey = `${this.localProgressKey}_${userId}_${planId}`;

    try {
      const resp = await axios.get(`${API_URL}/api/bible-plans/progress/${userId}?planId=${planId}`, { timeout: 4000 });
      if (resp.data && resp.data.data) {
        const progress = resp.data.data;
        await AsyncStorage.setItem(userKey, JSON.stringify(progress));
        return progress;
      }
    } catch (e) {}

    try {
      const saved = await AsyncStorage.getItem(userKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.readMarkedDays) parsed.readMarkedDays = [];
        if (!parsed.startDate) parsed.startDate = new Date().toISOString();
        if (!parsed.targetEndDate) {
          const end = new Date(parsed.startDate);
          end.setDate(end.getDate() + 365);
          parsed.targetEndDate = end.toISOString();
        }

        if (parsed.lastCompletedDate && parsed.streak > 0) {
          const now = new Date();
          const lastDate = new Date(parsed.lastCompletedDate);
          const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 1) {
            parsed.streak = 0;
            await AsyncStorage.setItem(userKey, JSON.stringify(parsed));
          }
        }
        return parsed;
      }
    } catch (e) {}

    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 365);

    return {
      userId,
      userName: 'Member',
      planId,
      currentDay: 1,
      completedDays: [],
      readMarkedDays: [],
      startDate: now.toISOString(),
      targetEndDate: end.toISOString(),
      streak: 0,
      highestStreak: 0,
      averageScore: 0,
      dailyAttempts: {},
      quizScores: {},
    };
  }

  // Reset user's bible plan progress to clean 0-streak state upon new registration
  async resetUserProgress(userId: string, planId: string = '1-year-canonical'): Promise<UserProgressData> {
    const userKey = `${this.localProgressKey}_${userId}_${planId}`;
    const defaultKey = `${this.localProgressKey}_${planId}`;
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 365);

    const freshProgress: UserProgressData = {
      userId,
      userName: 'Member',
      planId,
      currentDay: 1,
      completedDays: [],
      readMarkedDays: [],
      startDate: now.toISOString(),
      targetEndDate: end.toISOString(),
      streak: 0,
      highestStreak: 0,
      averageScore: 0,
      dailyAttempts: {},
      quizScores: {},
    };

    try {
      await AsyncStorage.setItem(userKey, JSON.stringify(freshProgress));
      await AsyncStorage.removeItem(defaultKey);
    } catch (e) {}

    return freshProgress;
  }

  // Mark Today's Scripture Portion as Read
  async markDayAsRead(day: number, userId: string = 'guest_user', planId: string = '1-year-canonical'): Promise<boolean> {
    try {
      await axios.post(`${API_URL}/api/bible-plans/mark-read`, {
        userId,
        planId,
        day,
      }, { timeout: 4000 });
    } catch (e) {}

    const userKey = `${this.localProgressKey}_${userId}_${planId}`;
    const progress = await this.getUserProgress(userId, planId);
    if (!progress.readMarkedDays) progress.readMarkedDays = [];
    if (!progress.readMarkedDays.includes(day)) {
      progress.readMarkedDays.push(day);
      await AsyncStorage.setItem(userKey, JSON.stringify(progress));
      await AsyncStorage.setItem(`${this.localProgressKey}_${planId}`, JSON.stringify(progress));
    }
    return true;
  }

  // Get today's portion for current day
  async getTodayPortion(planId: string = '1-year-canonical', dayNumber?: number): Promise<DailyPortion> {
    const plan = await this.getPlan(planId);
    let targetDay = dayNumber;

    if (!targetDay) {
      const progress = await this.getUserProgress('guest_user', planId);
      targetDay = progress.currentDay || 1;
    }

    const portion = plan.dailyPortions.find(p => p.day === targetDay);
    return portion || plan.dailyPortions[0];
  }

  // Fetch 10-Question AI/Passage Quiz with option shuffling
  async getPassageQuiz(portion: DailyPortion, userId: string = 'guest_user', planId: string = '1-year-canonical'): Promise<{
    questions: any[];
    attemptNumber: number;
    attemptsRemaining: number;
    totalQuestions: number;
  }> {
    try {
      const resp = await axios.post(`${API_URL}/api/bible-plans/generate-quiz`, {
        book: portion.book,
        bookTelugu: portion.bookTelugu,
        startChapter: portion.startChapter,
        endChapter: portion.endChapter,
        day: portion.day,
        userId,
        planId,
      }, { timeout: 12000 });

      if (resp.data && resp.data.questions && Array.isArray(resp.data.questions)) {
        return {
          questions: resp.data.questions.map(shuffleQuestion),
          attemptNumber: resp.data.attemptNumber || 1,
          attemptsRemaining: resp.data.attemptsRemaining ?? 2,
          totalQuestions: resp.data.totalQuestions || resp.data.questions.length,
        };
      }
    } catch (e) {
      console.log('Quiz generator offline fallback:', e);
    }

    // 10 offline fallback questions with option shuffling
    const rawFallback = [
      {
        id: 1,
        questionTelugu: `${portion.bookTelugu} ${portion.startChapter}వ అధ్యాయం ప్రకారం ఆదియందు దేవుడు ఏమి చేసెను?`,
        questionEnglish: `According to ${portion.book} Chapter ${portion.startChapter}, what did God do in the beginning?`,
        optionsTelugu: ["భూమ్యాకాశములను సృజించెను", "సూర్య చంద్రులను చేసెను", "సముద్రమును చేసెను", "పర్వతములను నిలిపెను"],
        optionsEnglish: ["Created the heavens and the earth", "Made the sun and moon", "Created the oceans", "Formed the mountains"],
        correctIndex: 0,
        explanationTelugu: "ఆదియందు దేవుడు భూమ్యాకాశములను సృజించెను (ఆదికాండము 1:1).",
        explanationEnglish: "In the beginning God created the heaven and the earth (Genesis 1:1)."
      },
      {
        id: 2,
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
        questionTelugu: `దేవుడు ఆదాము హవ్వలకు చర్మపు చొక్కాయిలను తొడిగించుట దేనికి సూచన?`,
        questionEnglish: `What did God making coats of skins to clothe Adam and Eve symbolize?`,
        optionsTelugu: ["శరీర సౌందర్యము", "కేవలం చలి నుండి రక్షణ", "రక్తము చిందించుట ద్వారా పాపములకు ప్రాయశ్చిత్తము మరియు దేవుని కృప", "ఏదీ కాదు"],
        optionsEnglish: ["Physical fashion", "Protection from cold only", "Atonement for sin through shedding of blood and God's grace", "None"],
        correctIndex: 2,
        explanationTelugu: "దేవుడు చర్మపు చొక్కాయిలను చేయించి వారికి తొడిగించెను (ఆదికాండము 3:21).",
        explanationEnglish: "The Lord God made coats of skins, and clothed them (Genesis 3:21)."
      }
    ];

    return {
      attemptNumber: 1,
      attemptsRemaining: 2,
      totalQuestions: 10,
      questions: rawFallback.map(shuffleQuestion),
    };
  }

  // Submit 10-Question quiz attempt & update streak / leaderboard
  async submitQuiz(
    portion: DailyPortion,
    userAnswers: Array<{ questionId: number; selectedIndex: number; isCorrect: boolean }>,
    userId: string = 'guest_user',
    userName: string = 'Member',
    planId: string = '1-year-canonical',
    quizTimeSeconds: number = 0
  ): Promise<{
    passed: boolean;
    scorePercent: number;
    attemptsUsed: number;
    attemptsRemaining: number;
    currentStreak: number;
    currentDay: number;
    averageScore: number;
    streakReset?: boolean;
  }> {
    const totalQuestions = userAnswers.length || 10;
    const correctCount = userAnswers.filter(a => a.isCorrect).length;
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;
    const passed = scorePercent >= 60;

    try {
      const resp = await axios.post(`${API_URL}/api/bible-plans/submit-quiz`, {
        userId,
        userName,
        planId,
        day: portion.day,
        userAnswers,
        totalQuestions,
        quizTimeSeconds,
      }, { timeout: 6000 });

      if (resp.data && resp.data.success) {
        const data = resp.data;
        const currentProg = await this.getUserProgress(userId, planId);
        if (passed) {
          if (!currentProg.completedDays.includes(portion.day)) {
            currentProg.completedDays.push(portion.day);
          }
          currentProg.streak = data.currentStreak || currentProg.streak + 1;
          currentProg.currentDay = data.currentDay || portion.day + 1;
          currentProg.lastCompletedDate = new Date().toISOString();
        } else if (data.streakReset) {
          currentProg.streak = 0;
        }
        const userKey = `${this.localProgressKey}_${userId}_${planId}`;
        await AsyncStorage.setItem(userKey, JSON.stringify(currentProg));
        await AsyncStorage.setItem(`${this.localProgressKey}_${planId}`, JSON.stringify(currentProg));

        return data;
      }
    } catch (e) {}

    // Offline Progress Update
    const currentProg = await this.getUserProgress(userId, planId);
    const dayKey = `day-${portion.day}`;
    const used = (currentProg.dailyAttempts[dayKey] || 0) + 1;
    currentProg.dailyAttempts[dayKey] = used;
    currentProg.quizScores[dayKey] = scorePercent;

    let streakReset = false;
    if (passed) {
      if (!currentProg.completedDays.includes(portion.day)) {
        currentProg.completedDays.push(portion.day);
      }
      currentProg.streak += 1;
      if (currentProg.streak > currentProg.highestStreak) {
        currentProg.highestStreak = currentProg.streak;
      }
      currentProg.lastCompletedDate = new Date().toISOString();
      if (portion.day >= currentProg.currentDay) {
        currentProg.currentDay = portion.day + 1;
      }
    } else {
      if (used >= 3) {
        currentProg.streak = 0;
        streakReset = true;
      }
    }

    const allScores = Object.values(currentProg.quizScores);
    if (allScores.length > 0) {
      currentProg.averageScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
    }

    const userKey = `${this.localProgressKey}_${userId}_${planId}`;
    await AsyncStorage.setItem(userKey, JSON.stringify(currentProg));
    await AsyncStorage.setItem(`${this.localProgressKey}_${planId}`, JSON.stringify(currentProg));

    return {
      passed,
      scorePercent,
      attemptsUsed: used,
      attemptsRemaining: Math.max(0, 3 - used),
      currentStreak: currentProg.streak,
      currentDay: currentProg.currentDay,
      averageScore: currentProg.averageScore || scorePercent,
      streakReset,
    };
  }

  // Get Top Leaderboard
  async getLeaderboard(planId: string = '1-year-canonical'): Promise<LeaderboardUser[]> {
    try {
      const resp = await axios.get(`${API_URL}/api/bible-plans/leaderboard?planId=${planId}`, { timeout: 5000 });
      if (resp.data && resp.data.data && Array.isArray(resp.data.data)) {
        return resp.data.data;
      }
    } catch (e) {}

    return [];
  }

  // Get Daily Promise
  async getDailyPromise(): Promise<DailyPromiseData> {
    try {
      const resp = await axios.get(`${API_URL}/api/bible-plans/daily-promise`, { timeout: 4000 });
      if (resp.data && resp.data.data) {
        return resp.data.data;
      }
    } catch (e) {}

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

    const idx = new Date().getDate() % defaultTeluguPromises.length;
    const selected = defaultTeluguPromises[idx];

    return {
      verseTelugu: selected.verseTelugu,
      verseEnglish: selected.verseEnglish,
      referenceTelugu: selected.referenceTelugu,
      referenceEnglish: selected.referenceEnglish,
      addedBy: 'ai',
    };
  }

  // Save/Schedule Daily Promise
  async saveDailyPromise(promiseData: {
    date?: string;
    bookId?: string;
    bookTelugu?: string;
    bookEnglish?: string;
    chapter?: number;
    verse?: number;
    verseTelugu: string;
    verseEnglish?: string;
    referenceTelugu: string;
    referenceEnglish?: string;
  }): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      const resp = await axios.post(`${API_URL}/api/bible-plans/daily-promise`, promiseData, { timeout: 6000 });
      return resp.data;
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || e.message || 'Failed to save promise' };
    }
  }

  // Get Scheduled Daily Promises
  async getScheduledPromises(): Promise<any[]> {
    try {
      const resp = await axios.get(`${API_URL}/api/bible-plans/scheduled-promises`, { timeout: 4000 });
      if (resp.data && resp.data.data && Array.isArray(resp.data.data)) {
        return resp.data.data;
      }
    } catch (e) {}
    return [];
  }

  // Translate Telugu verse to English
  async translateVerse(verseTelugu: string, referenceTelugu?: string): Promise<{ verseEnglish: string; referenceEnglish: string }> {
    try {
      const resp = await axios.post(`${API_URL}/api/bible-plans/translate-verse`, { verseTelugu, referenceTelugu }, { timeout: 6000 });
      if (resp.data && resp.data.data) {
        return resp.data.data;
      }
    } catch (e) {}
    return { verseEnglish: '', referenceEnglish: referenceTelugu || '' };
  }

  // Delete Scheduled Daily Promise
  async deleteDailyPromise(date: string): Promise<boolean> {
    try {
      const resp = await axios.delete(`${API_URL}/api/bible-plans/daily-promise/${date}`, { timeout: 4000 });
      return resp.data.success;
    } catch (e) {
      return false;
    }
  }
}

export const biblePlanService = new BiblePlanService();
