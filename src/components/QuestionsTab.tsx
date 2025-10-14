// src/components/QuestionsTab.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function QuestionsTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Questions</Text>
      <Text style={styles.placeholder}>(Your interactive Q&A will go here)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 18, fontWeight: '600' },
  placeholder: { color: '#666', marginTop: 12, textAlign: 'center' },
});
