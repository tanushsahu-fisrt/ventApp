import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons"
import firestoreService from "../../services/firestoreService";

const ListenerStats = ({ userId }) => {
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    averageRating: 0,
    helpedToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      const sessions = await firestoreService.getUserSessions(userId);

      const totalSessions = sessions.length;
      const totalMinutes = sessions.reduce(
        (sum, session) => sum + (session.duration || 0),
        0
      );
      const helpedToday = sessions.filter((session) => {
        const sessionDate = new Date(
          session.startTime?.toDate?.() || session.startTime
        );
        const today = new Date();
        return sessionDate.toDateString() === today.toDateString();
      }).length;

      setStats({
        totalSessions,
        totalMinutes: Math.floor(totalMinutes / 60),
        averageRating: 4.8, // Mock rating
        helpedToday,
      });
    } catch (error) {
      console.error("Error loading listener stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, title, value, subtitle, color = "#4ade80" }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{loading ? "..." : value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
    >
      <StatCard
        icon="people"
        title="People Helped"
        value={stats.totalSessions}
        subtitle="Total sessions"
        color="#4ade80"
      />

      <StatCard
        icon="time"
        title="Minutes Listened"
        value={stats.totalMinutes}
        subtitle="Total time"
        color="#3b82f6"
      />

      <StatCard
        icon="star"
        title="Average Rating"
        value={stats.averageRating.toFixed(1)}
        subtitle="Out of 5.0"
        color="#fbbf24"
      />

      <StatCard
        icon="today"
        title="Helped Today"
        value={stats.helpedToday}
        subtitle="Sessions today"
        color="#8b5cf6"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  statCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 10,
    alignItems: "center",
    minWidth: 120,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    fontWeight: "600",
  },
  statSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginTop: 2,
  },
});

export default ListenerStats;
