import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native'
import Ionicons from 'react-native-ionicons'

// We assume these three components exist under src/components/ and each forwards its ref.
// In particular, TranscriptTab must accept `route.params.userId`, `route.params.memoryId` (optional),
// and `route.params.existingSegments` (optional), and handle all recording logic internally.
import SearchesTab from '../components/SearchesTab'
import NotesTab from '../components/NotesTab'
import TranscriptTab from '../components/TranscriptTab'

export default function CaptureScreen({ route, navigation }: any) {
  const userId: string = route.params?.userId ?? 'anonymous'
  // If we're resuming an existing memory, these two will be defined.
  const memoryId: string | undefined = route.params?.memoryId
  const existingSegments: any[] | undefined = route.params?.existingSegments

  const [selectedTab, setSelectedTab] = useState<'searches' | 'notes' | 'transcript'>(
    'transcript'
  )

  const onPressTab = (tabName: 'searches' | 'notes' | 'transcript') => {
    setSelectedTab(tabName)
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ─── TOP HEADER ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
       <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>{'< Home'}</Text>
        </TouchableOpacity>
        

        <View style={styles.headerCenter}>
          <Text style={styles.titleText}>
            {memoryId ? 'Continue Transcript' : 'New Transcript'}
          </Text>
          {/*  Display either the timestamp from memoryId or the current time: */}
          <Text style={styles.dateText}>
            {memoryId
              ? new Date(Number(memoryId)).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : new Date().toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
          </Text>
        </View>

        <View style={styles.spacer} />
      </View>

      {/* ─── INNER TAB BAR ──────────────────────────────────────────────────────── */}
      <View style={styles.innerTabBar}>
        <TouchableOpacity
          style={[styles.tabItem, selectedTab === 'searches' && styles.tabItemActive]}
          onPress={() => onPressTab('searches')}
        >
          <Text style={[styles.tabText, selectedTab === 'searches' && styles.tabTextActive]}>
            Searches
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, selectedTab === 'notes' && styles.tabItemActive]}
          onPress={() => onPressTab('notes')}
        >
          <Text style={[styles.tabText, selectedTab === 'notes' && styles.tabTextActive]}>
            Notes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, selectedTab === 'transcript' && styles.tabItemActive]}
          onPress={() => onPressTab('transcript')}
        >
          <Text style={[styles.tabText, selectedTab === 'transcript' && styles.tabTextActive]}>
            Transcript
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── TAB CONTENT PLACEHOLDER ─────────────────────────────────────────────── */}
      <View style={styles.placeholderContainer}>
        {selectedTab === 'searches' && <SearchesTab />}
        {selectedTab === 'notes' && <NotesTab />}
        {selectedTab === 'transcript' && (
          <TranscriptTab
            route={{
              params: {
                userId,
                // If memoryId is undefined, TranscriptTab will create a brand-new memory.
                memoryId,
                // If existingSegments is undefined, TranscriptTab loads from AsyncStorage
                existingSegments,
              },
            }}
            navigation={navigation}
          />
        )}
      </View>

      {/* ─── FOOTER ────────────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.chatButton} activeOpacity={0.7}>
        
          <Text style={styles.chatText}>Chat with Transcript</Text>
        </TouchableOpacity>
      
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F3F5',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  spacer: {
    width: 28, // matches backButton width to keep title centered
  },

  // INNER TAB BAR
  innerTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Placeholder for whichever tab is active
  placeholderContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // FOOTER (Chat & Stop)
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  chatText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '500',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  stopText: {
    color: '#E11A1A',
    fontSize: 14,
    fontWeight: '600',
  },
    
  backButtonText: {
    fontSize: 16,
    color: '#1F2937', // Your desired text color
    // Add any other text styling, like fontWeight: 'bold'
  },
})
