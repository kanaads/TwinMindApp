// src/components/MemoriesTab.tsx

import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Segment = { text: string; ts: number }
type MemoryItem = { memoryId: string; segments: Segment[] }

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
        if (rawSegments) {
          try {
            const segs = JSON.parse(rawSegments) as Segment[]
            loaded.push({ memoryId: id, segments: segs })
          } catch {
            /* ignore */
          }
        }
      }

      setMemories(loaded)
    })()
  }, [userId])

  const renderItem = ({ item }: { item: MemoryItem }) => {
    const previewText = item.segments.length
      ? item.segments.map((s) => s.text).join(' ').substring(0, 40) + '…'
      : new Date(Number(item.memoryId)).toLocaleString()

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => onSelectMemory(item.memoryId, item.segments)}
      >
        <Text style={styles.eventTitle}>
          {new Date(Number(item.memoryId)).toLocaleString()}
        </Text>
        <Text style={styles.eventTime}>{previewText}</Text>
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
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#1F2937',
  },
  eventTime: {
    fontSize: 12,
    color: '#555',
  },
})
