import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
} from 'react-native'
import AudioRecord from 'react-native-audio-record'
import RNFetchBlob from 'rn-fetch-blob'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Ionicons from 'react-native-ionicons'

////////////////////////////////////////////////////////////////////////////////
// Replace this key with yours in production
const GOOGLE_CLOUD_SPEECH_API_KEY = 'GOOGLE_CLOUD_SPEECH_API_KEY'

async function sendToSTT(params: { base64Audio: string; sampleRate: number }): Promise<string> {
  const { base64Audio, sampleRate } = params
  const requestBody = {
    audio: { content: base64Audio },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: sampleRate,
      languageCode: 'en-US',
    },
  }

  try {
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_SPEECH_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    )
    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Google STT error ${response.status}: ${errText}`)
    }
    const json = await response.json()
    if (
      json.results &&
      Array.isArray(json.results) &&
      json.results.length > 0 &&
      json.results[0].alternatives &&
      Array.isArray(json.results[0].alternatives) &&
      json.results[0].alternatives.length > 0
    ) {
      return json.results[0].alternatives[0].transcript
    }
    return '(No speech recognized)'
  } catch (err) {
    console.warn('sendToSTT() exception:', err)
    return `(STT failed: ${(err as Error).message})`
  }
}

type Segment = { text: string; ts: number }

// We store each memory under a distinct key: userId + memoryId
const TRANSCRIPTS_KEY = (userId: string, memoryId: string) =>
  `TRANSCRIPTS_${userId}_${memoryId}`
const MEMORY_IDS_KEY = (userId: string) => `MEMORY_IDS_${userId}`

interface TranscriptTabProps {
  route: {
    params?: {
      userId: string
      memoryId?: string
      // If resuming, you can supply existingSegments
      existingSegments?: Segment[]
    }
  }
  navigation: any
}

export default function TranscriptTab({ route, navigation }: TranscriptTabProps) {
  const userId: string = route.params?.userId ?? 'anonymous'

  // If a memoryId was passed in, we resume that; otherwise generate a brand‐new one:
  const memoryIdRef = useRef<string>(
    route.params?.memoryId ?? `${Date.now()}`
  )

  // If existingSegments were passed (i.e. resuming), load them immediately:
  const initialSegments: Segment[] = route.params?.existingSegments ?? []

  // ─── State ─────────────────────────────────────────────────────────────────
  const [hasMicPermission, setHasMicPermission] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcriptText, setTranscriptText] = useState<string>('')
  const [transcriptSegments, setTranscriptSegments] = useState<Segment[]>([])
  // Record the "start time" of this memory (for display). If resuming, use memoryId as timestamp:
  const [startTime] = useState<Date>(() => {
    if (route.params?.memoryId) {
      // memoryId was created from Date.now()
      return new Date(Number(route.params.memoryId))
    }
    return new Date()
  })

  // References for chunk‐recording logic:
  const recordingCountRef = useRef(0)
  const activeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRecordingRef = useRef(false)

  // ─── On mount: request mic permissions, init AudioRecord, load saved transcript ───
  useEffect(() => {
    ;(async () => {
      // 1) Request mic permission
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'We need to record audio for speech-to-text.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          )
          setHasMicPermission(
            granted === PermissionsAndroid.RESULTS.GRANTED
          )
        } catch (err) {
          console.warn('Permission error:', err)
          setHasMicPermission(false)
        }
      } else {
        setHasMicPermission(true)
      }

      // 2) Initialize AudioRecord with a placeholder.wav
      AudioRecord.init({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        wavFile: 'placeholder.wav',
      })

      // 3) If resuming, preload any passed‐in segments; else register new memory and attempt to load from AsyncStorage
      if (initialSegments.length > 0) {
        setTranscriptSegments(initialSegments)
        setTranscriptText(initialSegments.map((s) => s.text).join('\n'))
      } else {
        // Brand‐new memory: register ID under MEMORY_IDS_${userId}
        const rawIds = await AsyncStorage.getItem(MEMORY_IDS_KEY(userId))
        let ids: string[] = rawIds ? JSON.parse(rawIds) : []
        if (!ids.includes(memoryIdRef.current)) {
          ids.unshift(memoryIdRef.current) // newest first
          await AsyncStorage.setItem(MEMORY_IDS_KEY(userId), JSON.stringify(ids))
        }

        // Now attempt to load from storage under this memory key (if any)
        const stored = await AsyncStorage.getItem(
          TRANSCRIPTS_KEY(userId, memoryIdRef.current)
        )
        if (stored) {
          try {
            const savedSegments = JSON.parse(stored) as Segment[]
            setTranscriptSegments(savedSegments)
            setTranscriptText(savedSegments.map((s) => s.text).join('\n'))
          } catch (e) {
            console.warn('Failed to parse saved transcripts:', e)
          }
        }
      }
    })()
  }, [userId])

  // ─── Core “record 30 s → stop & process → recurse” loop ─────────────────────
  const beginContinuousRecording = async () => {
    // Only clear if this is a brand‐new memory (no existingSegments)
    if (initialSegments.length === 0) {
      setTranscriptText('')
      setTranscriptSegments([])
      await AsyncStorage.removeItem(
        TRANSCRIPTS_KEY(userId, memoryIdRef.current)
      )
    }

    setIsRecording(true)
    isRecordingRef.current = true
    recordingCountRef.current = 0

    const loopOnce = async () => {
      if (!isRecordingRef.current) return

      recordingCountRef.current += 1
      const filename = `chunk_${recordingCountRef.current}.wav`

      // Re‐initialize each chunk with a unique filename
      AudioRecord.init({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        wavFile: filename,
      })
      try {
        await AudioRecord.start()
      } catch (err) {
        console.error('AudioRecord.start() error:', err)
        setIsRecording(false)
        isRecordingRef.current = false
        Alert.alert('Error', 'Failed to start recording chunk.')
        return
      }

      // After 30 s, stop this chunk, process STT, then recurse
      activeTimeoutRef.current = setTimeout(async () => {
        try {
          const filePath = await AudioRecord.stop()
          if (!filePath) return

          const base64Audio = await RNFetchBlob.fs.readFile(
            filePath,
            'base64'
          )
          setIsProcessing(true)

          // Run Google STT on this 30 s chunk
          const partialTranscript = await sendToSTT({
            base64Audio,
            sampleRate: 16000,
          })
          const segment: Segment = {
            text: partialTranscript,
            ts: Date.now(),
          }

          // Append locally + persist under this memory’s key
          setTranscriptSegments((prev) => {
            const newSegments = [...prev, segment]
            AsyncStorage.setItem(
              TRANSCRIPTS_KEY(userId, memoryIdRef.current),
              JSON.stringify(newSegments)
            ).catch((e) => console.warn('AsyncStorage save failed:', e))
            setTranscriptText(newSegments.map((s) => s.text).join('\n'))
            return newSegments
          })

          setIsProcessing(false)
        } catch (err) {
          console.warn('Error processing chunk:', err)
          setIsProcessing(false)
        }

        // Recurse if still recording
        if (isRecordingRef.current) {
          loopOnce()
        }
      }, 30000) // 30 s
    }

    // Start the first 30 s chunk
    loopOnce()
  }

  // ─── Stop recording, process the final chunk ─────────────────────────────────
  const stopAllRecording = async () => {
    setIsRecording(false)
    isRecordingRef.current = false

    // Clear pending 30 s timeout
    if (activeTimeoutRef.current) {
      clearTimeout(activeTimeoutRef.current)
      activeTimeoutRef.current = null
    }

    try {
      // Stop whichever partial recording is running
      const leftoverPath = await AudioRecord.stop()
      if (!leftoverPath) return

      const base64Audio = await RNFetchBlob.fs.readFile(
        leftoverPath,
        'base64'
      )
      setIsProcessing(true)

      // Process the final segment
      const finalTranscript = await sendToSTT({
        base64Audio,
        sampleRate: 16000,
      })
      const finalSegment: Segment = {
        text: finalTranscript,
        ts: Date.now(),
      }

      setTranscriptSegments((prev) => {
        const newSegments = [...prev, finalSegment]
        AsyncStorage.setItem(
          TRANSCRIPTS_KEY(userId, memoryIdRef.current),
          JSON.stringify(newSegments)
        ).catch((e) => console.warn('AsyncStorage final save failed:', e))
        setTranscriptText(newSegments.map((s) => s.text).join('\n'))
        return newSegments
      })

      setIsProcessing(false)
    } catch (err) {
      console.warn('Nothing was recording', err)
      setIsProcessing(false)
    }
  }

  // ─── Helper: format the startTime for display ───────────────────────────────
  const formatDateTime = (d: Date) => {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <SafeAreaView style={styles.container}>
 
      {/* ─── TRANSCRIPT BOX ───────────────────────────────────────────── */}
      <View style={styles.transcriptWrapper}>
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          {transcriptText.trim().length > 0 ? (
            <Text style={styles.transcriptText}>{transcriptText}</Text>
          ) : (
            <Text style={[styles.transcriptText, { color: '#AAA' }]}>
              … (no transcript yet)
            </Text>
          )}
        </ScrollView>
      </View>
      
         {/* ─── RECORD / STOP BUTTON ─────────────────────────────────────────── */}
      <View style={styles.recordContainer}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording ? styles.recordButtonActive : styles.recordButtonIdle,
            !hasMicPermission && styles.recordButtonDisabled,
          ]}
          onPress={isRecording ? stopAllRecording : beginContinuousRecording}
          disabled={!hasMicPermission}
        >
          <Ionicons
            name={isRecording ? 'stop-circle' : 'mic-circle'}
            size={28}
            color="#fff"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.recordButtonText}>
            {hasMicPermission
              ? isRecording
                ? 'Stop Recording'
                : 'Start Recording'
              : 'Mic Permission Required'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* ─── PROCESSING OVERLAY ───────────────────────────────────────── */}
      {isProcessing && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loaderText}>Transcribing…</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#EEE',
    backgroundColor: '#FFF',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  dateText: {
    marginTop: 2,
    fontSize: 13,
    color: '#666',
  },
  spacer: {
    width: 28,
  },

  // RECORD / STOP BUTTON
  recordContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 2,
  },
  recordButtonIdle: {
    backgroundColor: '#3B82F6',
  },
  recordButtonActive: {
    backgroundColor: '#DC3545',
  },
  recordButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // TRANSCRIPT BOX
  transcriptWrapper: {
    flex: 1,
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    overflow: 'hidden',
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1F2937',
  },

  // PROCESSING OVERLAY
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#007AFF',
  },
})
