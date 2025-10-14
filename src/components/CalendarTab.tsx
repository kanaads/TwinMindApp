import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';

type CalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
};

export default function CalendarTab({ accessToken }: { accessToken: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setError('No access token');
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      try {
        const now = new Date().toISOString();
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&timeMin=${encodeURIComponent(
          now
        )}&maxResults=20`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!response.ok) throw new Error(`Error ${response.status}`);
        const json = await response.json();
        setEvents(json.items || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [accessToken]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={{ marginTop: 8 }}>Loading your events...</Text>
      </View>
    );

  if (error)
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red' }}>Error: {error}</Text>
      </View>
    );

  return (
    <ScrollView style={styles.container}>
      {events.length === 0 && (
        <Text style={styles.noEvents}>No upcoming events found.</Text>
      )}
      {events.map((evt) => {
        const start = evt.start.dateTime || evt.start.date || '';
        return (
          <View key={evt.id} style={styles.eventCard}>
            <Text style={styles.eventTitle}>{evt.summary || '(No title)'}</Text>
            <Text style={styles.eventTime}>
              {start ? new Date(start).toLocaleString() : 'TBA'}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noEvents: { textAlign: 'center', color: '#666', marginTop: 20 },
  eventCard: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
  },
  eventTitle: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  eventTime: { color: '#555' },
});
