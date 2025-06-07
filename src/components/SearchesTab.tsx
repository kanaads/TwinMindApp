import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import Ionicons from 'react-native-ionicons'

export default function SearchesTab() {
  return (
    <View style={styles.container}>
      {/* Pull-down hint */}
      <View style={styles.pullDownHint}>
        <Ionicons name="chevron-down-outline" size={20} color="#6B7280" />
        <Text style={styles.hintText}>Pull down to get suggested searches</Text>
      </View>

      {/* Listening area */}
      <View style={styles.listeningContainer}>
        <Ionicons name="mic-circle-sharp" size={80} color="#3B82F6" />
        <Text style={styles.listeningText}>
          TwinMind is listening in the background
        </Text>
        <Text style={styles.hintTextSmall}>
          Leave it on during your meeting or
          conversations.
        </Text>
      </View>

      {/* Placeholder for “search results” */}
      <ScrollView contentContainerStyle={styles.resultsContainer}>
        {/* In a real implementation, you would map over suggested‐search items here */}
        <Text style={styles.resultsPlaceholder}>
          {/* For now, we just show a subtle placeholder “No suggestions yet.” */}
          No suggested searches yet.
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  pullDownHint: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  hintText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  listeningContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  listeningText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
  },
  hintTextSmall: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  highlight: {
    backgroundColor: '#FEF3C7',
  },
  resultsContainer: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
})
