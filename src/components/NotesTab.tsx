import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import Ionicons from 'react-native-ionicons'

export default function NotesTab() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* “See details” (optional) */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Description</Text>
        <TouchableOpacity>
          <Text style={styles.linkText}>See less</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.descriptionText}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
        labore et dolore magna aliqua.
      </Text>


      {/* ─── SUMMARY SECTION ─── */}
      <Text style={styles.subHeading}>Summary</Text>
      <View style={styles.sectionBox}>
        <Text style={styles.bulletPoint}>• Meeting Process Overview</Text>
        <Text style={styles.bulletPoint}>  • Weekly Friday product sync meetings to recap previous week and plan upcoming week</Text>
        <Text style={styles.bulletPoint}>  • Daily stand-ups for shifting priorities as needed</Text>
        <Text style={styles.bulletPoint}>  • Product development process overview:</Text>
        <Text style={styles.subBulletPoint}>    • Ideation phase: capture all feature ideas</Text>
        <Text style={styles.subBulletPoint}>    • Requirements gathering: goals, user stories, user stories, workflow</Text>
        <Text style={styles.subBulletPoint}>    • Design: wireframes/mockups, design research</Text>
        <Text style={styles.subBulletPoint}>    • Development, QA, and product release</Text>
      </View>

      {/* ─── ACTION ITEMS SECTION ─── */}
      <Text style={[styles.subHeading, { marginTop: 24 }]}>Action Items</Text>
      <View style={styles.sectionBox}>
        <Text style={styles.bulletPoint}>• Memory and search issues (Sunny working on)</Text>
        <Text style={styles.bulletPoint}>• Sign-up zero issues</Text>
        <Text style={styles.bulletPoint}>• Sign-up zero issues</Text>
        <Text style={styles.bulletPoint}>• Sign-up zero issues</Text>
      </View>

      {/* ─── YOUR NOTES SECTION ─── */}
      <Text style={[styles.subHeading, { marginTop: 24 }]}>Your Notes</Text>
      <View style={styles.sectionBox}>
        <Text style={styles.placeholderText}>
          You haven’t written any notes. Click “Edit Notes” to add.
        </Text>
      </View>

      {/* ─── “Chat with Transcript” BAR (Bottom) ─── */}
      <View style={styles.bottomChatContainer}>
        <TouchableOpacity style={styles.chatButton}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#374151" />
          <Text style={styles.chatButtonText}>Chat with Transcript</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  linkText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  descriptionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },

  // Inner tab bar
  innerTabBar: {
    flexDirection: 'row',
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: '#3B82F6',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabTextInactive: {
    color: '#6B7280',
    fontWeight: '500',
  },

  // Summary / Action Items / Notes
  subHeading: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionBox: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  subBulletPoint: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 12,
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // Bottom “Chat with Transcript”
  bottomChatContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  chatButtonText: {
    marginLeft: 6,
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
})
