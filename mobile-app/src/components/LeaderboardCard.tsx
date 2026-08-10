import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
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
  const isTel = appLanguage === 'Telugu';
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    loadLeaderboard();
  }, [planId, refreshTrigger]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await biblePlanService.getLeaderboard(planId);
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
            return (
              <View
                key={user.userId || idx}
                style={[
                  styles.rankRow,
                  {
                    backgroundColor: idx === 0 ? '#fffbeb' : theme.backgroundSelected,
                    borderColor: idx === 0 ? '#fde68a' : theme.cardBorder,
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
                  <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                    {user.userName}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      🎯 {user.averageScore}% {isTel ? 'సగటు' : 'avg'}
                    </Text>
                    {user.averageTimeSeconds > 0 && (
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                        ⏱️ {user.averageTimeSeconds}s
                      </Text>
                    )}
                  </View>
                </View>

                {/* Streak Pill */}
                <View style={[styles.streakPill, { backgroundColor: '#fff3e0', borderColor: '#ff9800' }]}>
                  <MaterialCommunityIcons name="fire" size={15} color="#e65100" />
                  <Text style={styles.streakPillText}>
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
