// src/components/MemoriesTab.tsx

import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Segment = { text: string; ts: number }
type MemoryItem = { 
  memoryId: string; 
  segments: Segment[];
  summary?: string;
  title?: string;
}

interface MemoriesTabProps {
  userId: string
  onSelectMemory: (memoryId: string, existingSegments: Segment[]) => void
}

export default function MemoriesTab({
  userId,
  onSelectMemory,
}: MemoriesTabProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([])

  useEffect(() => {
    ;(async () => {
      const rawIds = await AsyncStorage.getItem(`MEMORY_IDS_${userId}`)
      if (!rawIds) return

      const ids: string[] = JSON.parse(rawIds)
      const loaded: MemoryItem[] = []

      for (const id of ids) {
        const rawSegments = await AsyncStorage.getItem(`TRANSCRIPTS_${userId}_${id}`)
        let segments: Segment[] = []
        
        if (rawSegments) {
          try {
            segments = JSON.parse(rawSegments) as Segment[]
          } catch {
            /* ignore */
          }
        }

        // Load summary if available
        let summary: string | undefined
        try {
          const rawSummary = await AsyncStorage.getItem(`MEETING_SUMMARY_${userId}_${id}`)
          if (rawSummary) {
            const summaryData = JSON.parse(rawSummary)
            summary = summaryData.summary
          }
        } catch {
          /* ignore */
        }

        // Generate title based on summary or transcript content
        let title: string
        if (summary) {
          // Use first sentence of summary as title (max 50 chars)
          title = summary.split('.')[0].substring(0, 50) + (summary.split('.')[0].length > 50 ? '...' : '')
        } else if (segments.length > 0) {
          // Use first few words of transcript as title
          const firstText = segments[0]?.text || ''
          title = firstText.substring(0, 50) + (firstText.length > 50 ? '...' : '')
        } else {
          // Empty transcript
          title = 'Empty Transcript'
        }

        loaded.push({ 
          memoryId: id, 
          segments,
          summary,
          title
        })
      }

      setMemories(loaded)
    })()
  }, [userId])

  const renderItem = ({ item }: { item: MemoryItem }) => {
    const dateTime = new Date(Number(item.memoryId)).toLocaleString()
    const previewText = item.segments.length > 0
      ? item.segments.map((s) => s.text).join(' ').substring(0, 40) + '…'
      : 'No transcript content available'

    return (
      <TouchableOpacity
        style={[
          styles.eventCard,
          item.segments.length === 0 && styles.emptyCard
        ]}
        onPress={() => onSelectMemory(item.memoryId, item.segments)}
      >
        <Text style={styles.eventTitle}>
          {item.title || dateTime}
        </Text>
        <Text style={styles.eventTime}>{dateTime}</Text>
        <Text style={styles.eventPreview}>{previewText}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {memories.length === 0 ? (
        <Text style={styles.noEvents}>No memories yet.</Text>
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(itm) => itm.memoryId}
          renderItem={renderItem}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  noEvents: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  eventCard: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
  },
  emptyCard: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    opacity: 0.7,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1F2937',
  },
  eventTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  eventPreview: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
  },
})
