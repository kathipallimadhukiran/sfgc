import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/context/AppContext';
import { biblePlanService, LeaderboardUser } from '@/services/biblePlanService';

interface LeaderboardCardProps {
  planId?: string;
  appLanguage?: string;
  refreshTrigger?: number;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  planId = '1-year-canonical',
  appLanguage = 'Telugu',
  refreshTrigger = 0,
}) => {
  const theme = useTheme();
  const { user, themeMode } = useApp();
  const isDark = themeMode === 'dark';
  const isTel = appLanguage === 'Telugu';
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    loadLeaderboard();
  }, [planId, refreshTrigger, user?.id]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await biblePlanService.getLeaderboard(planId, user?.id || 'guest_user', user?.name || 'Member');
      setLeaders(data);
    } catch (e) {
      console.log('Error loading leaderboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: 'trophy', color: '#f59e0b', label: '1st' };
    if (rank === 2) return { icon: 'medal', color: '#94a3b8', label: '2nd' };
    if (rank === 3) return { icon: 'medal-outline', color: '#b45309', label: '3rd' };
    return { icon: null, color: theme.textSecondary, label: `#${rank}` };
  };

  const getRowStyle = (idx: number) => {
    if (idx === 0) {
      return {
        bg: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb',
        border: isDark ? '#b45309' : '#fde68a',
        nameColor: isDark ? '#fef08a' : '#92400e',
        subColor: isDark ? '#fde047' : '#b45309',
      };
    }
    if (idx === 1) {
      return {
        bg: isDark ? 'rgba(148, 163, 184, 0.14)' : '#f8fafc',
        border: isDark ? '#475569' : '#e2e8f0',
        nameColor: theme.text,
        subColor: theme.textSecondary,
      };
    }
    if (idx === 2) {
      return {
        bg: isDark ? 'rgba(180, 83, 9, 0.14)' : '#fff7ed',
        border: isDark ? '#78350f' : '#ffedd5',
        nameColor: theme.text,
        subColor: theme.textSecondary,
      };
    }
    return {
      bg: theme.backgroundSelected,
      border: theme.cardBorder,
      nameColor: theme.text,
      subColor: theme.textSecondary,
    };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="trophy-award" size={24} color="#f59e0b" />
          <View>
            <Text style={[styles.title, { color: theme.text }]}>
              {isTel ? 'బైబిల్ పఠన లీడర్‌బోర్డ్' : 'Bible Study Leaderboard'}
            </Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary }}>
              {isTel ? 'రోజువారీ స్ట్రీక్ & సగటు క్విజ్ స్కోర్ ఆధారంగా' : 'Ranked by daily streak & average quiz score'}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={loadLeaderboard} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : leaders.length === 0 ? (
        <Text style={{ textAlign: 'center', paddingVertical: 16, color: theme.textSecondary, fontStyle: 'italic', fontSize: 13 }}>
          {isTel ? 'ఇంకా ఎటువంటి ర్యాంకులు నమోదు కాలేదు.' : 'No leaderboard rankings recorded yet.'}
        </Text>
      ) : (
        <View style={styles.listContainer}>
          {leaders.map((user, idx) => {
            const badge = getRankBadge(idx + 1);
            const rowStyle = getRowStyle(idx);
            return (
              <View
                key={user.userId || idx}
                style={[
                  styles.rankRow,
                  {
                    backgroundColor: rowStyle.bg,
                    borderColor: rowStyle.border,
                  },
                ]}
              >
                {/* Rank Number / Medal */}
                <View style={styles.rankCol}>
                  {badge.icon ? (
                    <MaterialCommunityIcons name={badge.icon as any} size={20} color={badge.color} />
                  ) : (
                    <Text style={[styles.rankNumber, { color: theme.textSecondary }]}>
                      {badge.label}
                    </Text>
                  )}
                </View>

                {/* Member Info */}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: rowStyle.nameColor }]} numberOfLines={1}>
                    {user.userName}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
                    <Text style={{ fontSize: 11, color: rowStyle.subColor }}>
                      🎯 {user.averageScore}% {isTel ? 'సగటు' : 'avg'}
                    </Text>
                    {user.averageTimeSeconds > 0 && (
                      <Text style={{ fontSize: 11, color: rowStyle.subColor }}>
                        ⏱️ {user.averageTimeSeconds}s
                      </Text>
                    )}
                  </View>
                </View>

                {/* Streak Pill */}
                <View style={[styles.streakPill, { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.2)' : '#fff3e0', borderColor: isDark ? '#f57c00' : '#ff9800' }]}>
                  <MaterialCommunityIcons name="fire" size={15} color={isDark ? '#ff9800' : '#e65100'} />
                  <Text style={[styles.streakPillText, { color: isDark ? '#ffbb33' : '#e65100' }]}>
                    {user.streak}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  refreshBtn: {
    padding: 6,
  },
  listContainer: {
    gap: 8,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  rankCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  streakPillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#e65100',
  },
});
