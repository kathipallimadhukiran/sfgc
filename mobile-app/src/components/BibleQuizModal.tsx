import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Modal, Portal, Text, Button, ActivityIndicator, Divider, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { DailyPortion } from '@/constants/defaultBiblePlans';
import { biblePlanService, shuffleQuestion } from '@/services/biblePlanService';

interface BibleQuizModalProps {
  visible: boolean;
  onDismiss: () => void;
  portion: DailyPortion;
  planId?: string;
  appLanguage?: string;
  userName?: string;
  userId?: string;
  onQuizCompleted?: (result: { passed: boolean; streak: number; currentDay: number }) => void;
}

export const BibleQuizModal: React.FC<BibleQuizModalProps> = ({
  visible,
  onDismiss,
  portion,
  planId = '1-year-canonical',
  appLanguage = 'Telugu',
  userName = 'Member',
  userId = 'guest_user',
  onQuizCompleted,
}) => {
  const theme = useTheme();
  const [quizLanguage, setQuizLanguage] = useState<'Telugu' | 'English'>(appLanguage === 'English' ? 'English' : 'Telugu');
  const isQuizTel = quizLanguage === 'Telugu';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [attemptsRemaining, setAttemptsRemaining] = useState(2);
  const [quizResult, setQuizResult] = useState<any | null>(null);

  // Live Quiz Timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerRef = useRef<any>(null);

  const scaleAnim = useState(new Animated.Value(0.9))[0];

  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && portion) {
      setQuizLanguage(appLanguage === 'English' ? 'English' : 'Telugu');
      if (!wasVisible.current) {
        wasVisible.current = true;
        loadQuizQuestions();
      }
    } else if (!visible) {
      clearInterval(timerRef.current);
      wasVisible.current = false;
    }
    return () => clearInterval(timerRef.current);
  }, [visible, portion, appLanguage]);

  const startTimer = () => {
    clearInterval(timerRef.current);
    setSecondsElapsed(0);
    timerRef.current = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);
  };

  const loadQuizQuestions = async () => {
    setLoading(true);
    setSelectedAnswers({});
    setQuizResult(null);
    try {
      const data = await biblePlanService.getPassageQuiz(portion, userId, planId);
      const shuffled = (data.questions || []).map(shuffleQuestion);
      setQuestions(shuffled);
      setAttemptNumber(data.attemptNumber || 1);
      setAttemptsRemaining(data.attemptsRemaining ?? 2);
      startTimer();
    } catch (e) {
      console.log('Error loading quiz:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    if (quizResult) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (Object.keys(selectedAnswers).length < questions.length) {
      return;
    }

    clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const userAnswers = questions.map(q => ({
        questionId: q.id,
        selectedIndex: selectedAnswers[q.id],
        isCorrect: selectedAnswers[q.id] === q.correctIndex,
      }));

      const res = await biblePlanService.submitQuiz(
        portion,
        userAnswers,
        userId,
        userName,
        planId,
        secondsElapsed
      );
      setQuizResult(res);

      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();

      if (res.passed) {
        onQuizCompleted?.({
          passed: true,
          streak: res.currentStreak,
          currentDay: res.currentDay,
        });
      }
    } catch (e) {
      console.log('Error submitting quiz:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const allAnswered = questions.length > 0 && Object.keys(selectedAnswers).length === questions.length;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          {
            backgroundColor: theme.backgroundElement || '#ffffff',
            borderColor: theme.cardBorder || '#e0e0e0',
          },
        ]}
      >
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ marginTop: 14, color: theme.textSecondary, fontSize: 13 }}>
              {isQuizTel ? 'ఈ రోజు 10 ప్రశ్నలు సిద్ధం చేస్తున్నాము...' : 'Generating 10 passage questions with AI...'}
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.text }]}>
                  {isQuizTel ? 'వాక్య ధ్యాన క్విజ్ (10 ప్రశ్నలు)' : 'Scripture Study Quiz (10 Questions)'}
                </Text>
                <Text style={[styles.subtitle, { color: theme.primary }]}>
                  📖 {isQuizTel ? portion?.bookTelugu : portion?.book} {portion?.startChapter}{portion?.startChapter !== portion?.endChapter ? `–${portion?.endChapter}` : ''} (Day {portion?.day})
                </Text>
              </View>

              {/* Live Timer Pill */}
              <View style={[styles.timerBadge, { backgroundColor: theme.backgroundSelected }]}>
                <MaterialCommunityIcons name="timer-outline" size={15} color={theme.primary} />
                <Text style={[styles.timerText, { color: theme.primary }]}>
                  {formatTimer(secondsElapsed)}
                </Text>
              </View>
            </View>

            {/* Language & Attempt Bar */}
            <View style={styles.controlsBar}>
              {/* Language Switcher */}
              <View style={[styles.langToggleBar, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.langToggleBtn,
                    quizLanguage === 'Telugu' && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setQuizLanguage('Telugu')}
                >
                  <Text
                    style={[
                      styles.langToggleText,
                      { color: quizLanguage === 'Telugu' ? '#ffffff' : theme.textSecondary },
                    ]}
                  >
                    తెలుగు
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.langToggleBtn,
                    quizLanguage === 'English' && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setQuizLanguage('English')}
                >
                  <Text
                    style={[
                      styles.langToggleText,
                      { color: quizLanguage === 'English' ? '#ffffff' : theme.textSecondary },
                    ]}
                  >
                    English
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Attempt Chip */}
              <Chip
                compact
                style={{
                  backgroundColor: attemptNumber === 3 ? '#ffebee' : theme.backgroundSelected,
                }}
                textStyle={{
                  fontSize: 10.5,
                  fontWeight: '700',
                  color: attemptNumber === 3 ? '#c62828' : theme.textSecondary,
                }}
              >
                {isQuizTel ? `ప్రయత్నం ${attemptNumber}/3` : `Attempt ${attemptNumber}/3`}
              </Chip>
            </View>

            <Divider style={{ marginVertical: 10, backgroundColor: theme.cardBorder }} />

            {/* Quiz Result Card */}
            {quizResult && (
              <Animated.View
                style={[
                  styles.resultCard,
                  {
                    transform: [{ scale: scaleAnim }],
                    backgroundColor: quizResult.passed ? '#e8f5e9' : '#ffebee',
                    borderColor: quizResult.passed ? '#4caf50' : '#e57373',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={quizResult.passed ? 'trophy' : 'alert-circle'}
                  size={36}
                  color={quizResult.passed ? '#2e7d32' : '#c62828'}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.resultTitle, { color: quizResult.passed ? '#2e7d32' : '#c62828' }]}>
                    {quizResult.passed
                      ? (isQuizTel ? '🎉 అద్భుతం! మీరు ఉత్తీర్ణులయ్యారు!' : '🎉 Congratulations! You Passed!')
                      : (quizResult.streakReset
                          ? (isQuizTel ? '❌ 3 ప్రయత్నాలు విఫలమయ్యాయి! స్ట్రీక్ 0కి తగ్గించబడింది.' : '❌ 3 attempts failed! Streak reset to 0.')
                          : (isQuizTel ? 'మరొకసారి ప్రయత్నించండి' : 'Need Review (Score < 60%)'))}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#333333', marginTop: 2 }}>
                    {isQuizTel ? `స్కోర్: ${quizResult.scorePercent}% (${quizResult.correctCount}/${quizResult.totalQuestions})` : `Score: ${quizResult.scorePercent}% (${quizResult.correctCount}/${quizResult.totalQuestions})`}
                    {quizResult.passed
                      ? ` | 🔥 స్ట్రీక్: ${quizResult.currentStreak} | 🎯 సగటు: ${quizResult.averageScore}%`
                      : ` | మిగిలిన ప్రయత్నాలు: ${quizResult.attemptsRemaining}`}
                  </Text>
                  {quizResult.streakReset && (
                    <Text style={{ fontSize: 11, color: '#c62828', fontWeight: 'bold', marginTop: 4 }}>
                      {isQuizTel ? 'దయచేసి అధ్యాయాలను మరలా శ్రద్ధగా చదివి రేపు ప్రయత్నించండి.' : 'Please read the chapters again and try tomorrow.'}
                    </Text>
                  )}
                </View>
              </Animated.View>
            )}

            {/* Questions List with Explanations */}
            {questions.map((q, qIndex) => {
              const questionText = isQuizTel ? (q.questionTelugu || q.questionEnglish) : (q.questionEnglish || q.questionTelugu);
              const options = isQuizTel ? (q.optionsTelugu || q.optionsEnglish) : (q.optionsEnglish || q.optionsTelugu);
              const userSelected = selectedAnswers[q.id];
              const isSubmitted = !!quizResult;

              return (
                <View key={q.id || qIndex} style={styles.questionBlock}>
                  <Text style={[styles.questionText, { color: theme.text }]}>
                    {qIndex + 1}. {questionText}
                  </Text>

                  {/* Options */}
                  <View style={styles.optionsList}>
                    {options && options.map((opt: string, optIndex: number) => {
                      const isSelected = userSelected === optIndex;
                      const isCorrect = isSubmitted && q.correctIndex === optIndex;
                      const isWrongSelected = isSubmitted && isSelected && !isCorrect;

                      let btnBg: string = theme.backgroundSelected;
                      let borderColor: string = theme.cardBorder;
                      let textColor: string = theme.text;

                      if (isSelected && !isSubmitted) {
                        btnBg = theme.primary + '20';
                        borderColor = theme.primary;
                      } else if (isCorrect) {
                        btnBg = '#c8e6c9';
                        borderColor = '#4caf50';
                        textColor = '#2e7d32';
                      } else if (isWrongSelected) {
                        btnBg = '#ffcdd2';
                        borderColor = '#e57373';
                        textColor = '#c62828';
                      }

                      return (
                        <TouchableOpacity
                          key={optIndex}
                          activeOpacity={0.8}
                          disabled={isSubmitted}
                          onPress={() => handleSelectOption(q.id, optIndex)}
                          style={[
                            styles.optionButton,
                            {
                              backgroundColor: btnBg,
                              borderColor: borderColor,
                            },
                          ]}
                        >
                          <View style={styles.optionCircle}>
                            {isCorrect ? (
                              <MaterialCommunityIcons name="check" size={14} color="#2e7d32" />
                            ) : isWrongSelected ? (
                              <MaterialCommunityIcons name="close" size={14} color="#c62828" />
                            ) : (
                              <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? theme.primary : theme.textSecondary }}>
                                {String.fromCharCode(65 + optIndex)}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.optionText, { color: textColor }]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Full Explanation Box (Always displayed after submission) */}
                  {isSubmitted && (
                    <View style={[styles.explanationBox, { backgroundColor: theme.backgroundSelected, borderColor: theme.cardBorder }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                        <MaterialCommunityIcons name="lightbulb-on" size={16} color="#f59e0b" />
                        <Text style={{ fontSize: 11.5, fontWeight: 'bold', color: theme.text }}>
                          {isQuizTel ? 'సమాధాన వివరణ & రిఫరెన్స్:' : 'Scripture Explanation:'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: theme.text, lineHeight: 18 }}>
                        {isQuizTel ? (q.explanationTelugu || q.explanationEnglish) : (q.explanationEnglish || q.explanationTelugu)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Actions */}
            <View style={{ marginTop: 14, marginBottom: 8, gap: 8 }}>
              {!quizResult ? (
                <Button
                  mode="contained"
                  disabled={!allAnswered || submitting}
                  loading={submitting}
                  buttonColor={theme.primary}
                  textColor="#ffffff"
                  style={styles.actionBtn}
                  onPress={handleSubmitQuiz}
                >
                  {isQuizTel ? `10 సమాధానాలు సమర్పించండి (${Object.keys(selectedAnswers).length}/10)` : `Submit 10 Answers (${Object.keys(selectedAnswers).length}/10)`}
                </Button>
              ) : quizResult.passed ? (
                <Button
                  mode="contained"
                  buttonColor="#2e7d32"
                  textColor="#ffffff"
                  style={styles.actionBtn}
                  onPress={onDismiss}
                >
                  {isQuizTel ? 'పూర్తి చేయండి (Complete)' : 'Complete'}
                </Button>
              ) : (
                <View style={{ gap: 8 }}>
                  {quizResult.attemptsRemaining > 0 ? (
                    <Button
                      mode="contained"
                      buttonColor={theme.primary}
                      textColor="#ffffff"
                      style={styles.actionBtn}
                      onPress={loadQuizQuestions}
                    >
                      {isQuizTel ? `కొత్త ప్రశ్నలతో మళ్ళీ ప్రయత్నించండి (${quizResult.attemptsRemaining} మిగిలాయి)` : `Try Again with Fresh Questions (${quizResult.attemptsRemaining} left)`}
                    </Button>
                  ) : null}
                  <Button
                    mode="outlined"
                    textColor={theme.textSecondary}
                    style={{ borderRadius: 10 }}
                    onPress={onDismiss}
                  >
                    {isQuizTel ? 'మూసివేయండి' : 'Close'}
                  </Button>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 14,
    borderRadius: 20,
    padding: 16,
    maxHeight: '88%',
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  langToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
    flex: 1,
  },
  langToggleBtn: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  questionBlock: {
    marginBottom: 16,
  },
  questionText: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 10,
  },
  optionsList: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  optionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  explanationBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 4,
  },
});
