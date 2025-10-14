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
import NetInfo from '@react-native-community/netinfo'
import { RecordingService } from '../services'
import { useRecording } from '../contexts/RecordingContext'

// ---------------- Configuration ----------------
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE'
const CHUNK_MS = __DEV__ ? 10000 : 15000      // 10s dev / 15s prod for better sensitivity
const MIN_CHUNK_SIZE_BYTES = 1000             // higher threshold for better quality
const INITIAL_BACKOFF_MS = 2000
const MAX_BACKOFF_MS = 30000
// ------------------------------------------------

type Segment = { text: string; ts: number }
type QueueItem = { id: string; filePath: string; ts: number; attempts: number; lastError?: string }

// Discriminated union: always branch on `ok`
type STTResult =
  | { ok: true; text: string }
  | { ok: false; err: string }

const TRANSCRIPTS_KEY = (userId: string, memoryId: string) =>
  `TRANSCRIPTS_${userId}_${memoryId}`
const MEMORY_IDS_KEY = (userId: string) => `MEMORY_IDS_${userId}`
const QUEUE_KEY = (userId: string, memoryId: string) =>
  `QUEUE_${userId}_${memoryId}`

interface TranscriptTabProps {
  route: {
    params?: {
      userId: string
      memoryId?: string
      existingSegments?: Segment[]
      forceNew?: boolean
    }
  }
  navigation: any
}

export default function TranscriptTab({ route }: TranscriptTabProps) {
  const userId = route.params?.userId ?? 'anonymous'
  const { forceNew, setForceNew, hasStartedRecording, setHasStartedRecording } = useRecording()
  const memoryIdRef = useRef(
    forceNew
      ? `${Date.now()}`
      : (route.params?.memoryId ?? `${Date.now()}`)
  )
  const initialSegments = (route.params?.existingSegments ?? []) as Segment[]

  const [hasMicPermission, setHasMicPermission] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcriptText, setTranscriptText] = useState('')
  const [transcriptSegments, setTranscriptSegments] = useState<Segment[]>([])
  const [isOnline, setIsOnline] = useState(true)
  const [debug, setDebug] = useState<string[]>([])
  const [recordingDuration, setRecordingDuration] = useState(0)

  const recordingCountRef = useRef(0)
  const activeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRecordingRef = useRef(false)
  const backoffRef = useRef(INITIAL_BACKOFF_MS)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recordingService = RecordingService.getInstance()

  // --------------- Utils ---------------
  const log = (msg: string) => {
    if (__DEV__) setDebug(d => [new Date().toLocaleTimeString() + ' ' + msg, ...d].slice(0, 40))
    // console.log(msg) // uncomment if you want console logs too
  }

  // --------------- Global Recording State Sync ---------------
  useEffect(() => {
    // Load initial recording state - check if any recording is active for this user
    const currentState = recordingService.getRecordingState();
    console.log(`TranscriptTab: Loading initial state`, currentState, `userId: ${userId}`);
    
    if (!forceNew && currentState.isRecording && currentState.userId === userId) {
      console.log(`TranscriptTab: Found active recording, syncing state - isProcessing: ${currentState.isProcessing}`);
      setIsRecording(true);
      setIsProcessing(currentState.isProcessing);
      setRecordingDuration(currentState.duration);
      isRecordingRef.current = true;
      // Reuse the active memoryId for continuity
      if (currentState.memoryId) {
        memoryIdRef.current = currentState.memoryId
      }
    } else {
      // Ensure processing state is false if no active recording
      console.log(`TranscriptTab: No active recording, setting isProcessing to false`);
      setIsProcessing(false);
      
      // If forcing new, clear any existing transcript data
      if (forceNew) {
        setTranscriptText('')
        setTranscriptSegments([])
        console.log(`TranscriptTab: Force new - clearing transcript state`);
      }
    }

    // Load existing transcript (skip reuse if forcing new and haven't started recording)
    loadTranscript(forceNew && !hasStartedRecording);

    // Listen for recording state changes
    const handleStateChange = (state: any) => {
      console.log(`TranscriptTab: State changed`, state, `userId: ${userId}`);
      // Update UI if recording is for this user (regardless of memoryId)
      if (state.userId === userId) {
        console.log(`TranscriptTab: Updating UI state - isProcessing: ${state.isProcessing}, isRecording: ${state.isRecording}`);
        setIsRecording(state.isRecording);
        setIsProcessing(state.isProcessing);
        setRecordingDuration(state.duration);
        isRecordingRef.current = state.isRecording;
      }
    };

    const handleDurationUpdate = (duration: number) => {
      setRecordingDuration(duration);
    };

    const handleTranscriptUpdate = (data: { userId: string; memoryId: string; segments: any[]; text: string }) => {
      if (data.userId !== userId || data.memoryId !== memoryIdRef.current) return
      console.log(`TranscriptTab: Transcript updated for active memory`, data)
      setTranscriptSegments(data.segments)
      setTranscriptText(data.text)
    };

    recordingService.on('stateChanged', handleStateChange);
    recordingService.on('durationUpdated', handleDurationUpdate);
    recordingService.on('transcriptUpdated', handleTranscriptUpdate);

    return () => {
      recordingService.off('stateChanged', handleStateChange);
      recordingService.off('durationUpdated', handleDurationUpdate);
      recordingService.off('transcriptUpdated', handleTranscriptUpdate);
    };
  }, [userId, recordingService]);

  const isOk = (r: STTResult): r is { ok: true; text: string } => r.ok === true

  // --------------- Load Transcript ---------------
  const loadTranscript = async (skipReuse = false) => {
    try {
      // If forcing new, don't pull any existing
      if (skipReuse) {
        setTranscriptText('')
        setTranscriptSegments([])
        return
      }
      // Try current memory first
      const currentKey = TRANSCRIPTS_KEY(userId, memoryIdRef.current)
      let stored = await AsyncStorage.getItem(currentKey)

      // If not found, reuse latest existing transcript for this user
      if (!stored) {
        const allKeys = await AsyncStorage.getAllKeys()
        const userKeys = allKeys.filter(k => k.startsWith(`TRANSCRIPTS_${userId}_`))
        if (userKeys.length > 0) {
          const sorted = userKeys.sort((a, b) => {
            const ta = parseInt(a.split('_').pop() || '0')
            const tb = parseInt(b.split('_').pop() || '0')
            return tb - ta
          })
          const latestKey = sorted[0]
          const latestData = await AsyncStorage.getItem(latestKey)
          if (latestData) {
            memoryIdRef.current = latestKey.split('_').pop() || memoryIdRef.current
            stored = latestData
          }
        }
      }

      if (stored) {
        const segments = JSON.parse(stored)
        setTranscriptSegments(segments)
        setTranscriptText(segments.map((s: any) => s.text).join('\n'))
        console.log(`TranscriptTab: Loaded transcript with ${segments.length} segments`)
      } else {
        // No stored transcript found, ensure empty state
        setTranscriptText('')
        setTranscriptSegments([])
        console.log(`TranscriptTab: No transcript found, starting with empty state`)
      }
    } catch (error) {
      console.error('Error loading transcript:', error)
      // On error, ensure empty state
      setTranscriptText('')
      setTranscriptSegments([])
    }
  };

  // --------------- Processing State Safety ---------------
  useEffect(() => {
    // Safety timeout to reset processing state if it gets stuck
    if (isProcessing) {
      const timeout = setTimeout(() => {
        console.log('TranscriptTab: Processing timeout - resetting isProcessing');
        setIsProcessing(false);
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isProcessing]);

  // --------------- Whisper ---------------
  async function sendToWhisper(filePath: string, language = 'en'): Promise<STTResult> {
    try {
      const res = await RNFetchBlob.fetch(
        'POST',
        'https://api.openai.com/v1/audio/transcriptions',
        {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
        [
          { name: 'file', filename: 'chunk.wav', type: 'audio/wav', data: RNFetchBlob.wrap(filePath) },
          { name: 'model', data: 'whisper-1' },
          { name: 'language', data: language },
          { name: 'response_format', data: 'json' },
          { name: 'temperature', data: '0.0' },
        ]
      )
      const status = res.info().status
      let json: any = null
      try { 
        json = JSON.parse(res.data) 
        log(`Whisper response: ${JSON.stringify(json).substring(0, 100)}...`)
      } catch (parseErr) { 
        log(`JSON parse error: ${parseErr}`)
        return { ok: false, err: 'Invalid response from Whisper API' }
      }

      if (status < 200 || status >= 300) {
        const msg = json?.error?.message ?? `HTTP ${status}`
        log(`Whisper API error: ${msg}`)
        return { ok: false, err: msg }
      }
      const text: string = (json?.text ?? '').trim()
      log(`Whisper success: "${text}"`)
      
      // Check for incomplete transcriptions
      if (text.length < 3) {
        log('Warning: Response too short, might be audio quality issue')
        return { ok: false, err: 'Transcription too short - check audio quality' }
      }
      
      return { ok: true, text }
    } catch (e) {
      return { ok: false, err: (e as Error).message }
    }
  }

  // --------------- Queue (offline-first) ---------------
  const loadQueue = async (): Promise<QueueItem[]> => {
    const raw = await AsyncStorage.getItem(QUEUE_KEY(userId, memoryIdRef.current))
    return raw ? (JSON.parse(raw) as QueueItem[]) : []
  }
  const saveQueue = async (q: QueueItem[]) =>
    AsyncStorage.setItem(QUEUE_KEY(userId, memoryIdRef.current), JSON.stringify(q))
  const enqueue = async (filePath: string) => {
    const q = await loadQueue()
    q.push({ id: `${Date.now()}_${Math.random()}`, filePath, ts: Date.now(), attempts: 0 })
    await saveQueue(q)
    log('queued ' + filePath)
  }

  async function trySyncQueue() {
    if (!isOnline) return
    const q = await loadQueue()
    if (q.length === 0) { backoffRef.current = INITIAL_BACKOFF_MS; return }

    const [item, ...rest] = q
    try {
      const stat = await RNFetchBlob.fs.stat(item.filePath)
      if (!stat || Number(stat.size) < MIN_CHUNK_SIZE_BYTES) {
        await saveQueue(rest) // drop tiny/invalid
      } else {
        const stt = await sendToWhisper(item.filePath, 'en')
        if (isOk(stt) && stt.text) {
          const seg: Segment = { text: stt.text, ts: item.ts }
          setTranscriptSegments(prev => {
            const next = [...prev, seg]
            AsyncStorage.setItem(TRANSCRIPTS_KEY(userId, memoryIdRef.current), JSON.stringify(next))
            setTranscriptText(next.map(s => s.text).join('\n'))
            return next
          })
          RNFetchBlob.fs.unlink(item.filePath).catch(() => {})
          backoffRef.current = INITIAL_BACKOFF_MS
          log('synced → ' + stt.text.slice(0, 60))
          await saveQueue(rest)
        } else {
          const errMsg = isOk(stt) ? 'empty transcript' : stt.err
          item.attempts += 1
          item.lastError = errMsg
          backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS)
          await saveQueue([item, ...rest])
          log('retry later: ' + errMsg)
        }
      }
    } catch (e) {
      await saveQueue(rest)
      log('syncQueue error: ' + (e as Error).message)
    }

    if ((await loadQueue()).length > 0) scheduleSync(backoffRef.current)
    else backoffRef.current = INITIAL_BACKOFF_MS
  }

  const scheduleSync = (delay: number) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(trySyncQueue, delay)
  }

  // --------------- Setup ---------------
  useEffect(() => {
    ;(async () => {
      // Mic permission
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        )
        setHasMicPermission(granted === PermissionsAndroid.RESULTS.GRANTED)
      } else {
        setHasMicPermission(true)
      }

      // Init recorder with optimized settings for better audio capture
      AudioRecord.init({ 
        sampleRate: 16000, 
        channels: 1, 
        bitsPerSample: 16, 
        wavFile: 'recording.wav'
      })

      // Restore transcript unless we are forcing a new session and haven't started recording
      if (!forceNew && initialSegments.length > 0) {
        setTranscriptSegments(initialSegments)
        setTranscriptText(initialSegments.map(s => s.text).join('\n'))
      } else if (forceNew && !hasStartedRecording) {
        // Ensure empty state when forcing new and haven't started recording
        setTranscriptText('')
        setTranscriptSegments([])
        console.log(`TranscriptTab: Force new - ensuring empty transcript state`);
      }

      // Network watcher (treat null as online)
      const unsub = NetInfo.addEventListener(state => {
        const online = state.isConnected !== false && state.isInternetReachable !== false
        setIsOnline(online)
        if (online) scheduleSync(0)
      })
      return () => unsub()
    })()

    return () => {
      if (activeTimeoutRef.current) clearTimeout(activeTimeoutRef.current)
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --------------- Record loop ---------------
  const beginRecording = async () => {
    if (!hasMicPermission) {
      Alert.alert('Permission', 'Microphone permission is required.')
      return
    }
    // Mark that we've started recording to override forceNew behavior
    setHasStartedRecording(true)
    setForceNew(false) // Clear forceNew when recording starts
    console.log('TranscriptTab: Started recording - overriding forceNew behavior');
    
    // Handle transcript initialization based on forceNew flag and recording state
    try {
      if (forceNew && !hasStartedRecording) {
        // Force new - always start with empty transcript
        setTranscriptText('')
        setTranscriptSegments([])
        await AsyncStorage.removeItem(TRANSCRIPTS_KEY(userId, memoryIdRef.current))
        console.log('TranscriptTab: Force new - starting with empty transcript');
      } else {
        // Check for existing content (either not forceNew or has started recording)
        const existingRaw = await AsyncStorage.getItem(TRANSCRIPTS_KEY(userId, memoryIdRef.current))
        if (existingRaw) {
          try {
            const existing = JSON.parse(existingRaw)
            if (Array.isArray(existing) && existing.length > 0) {
              // Use existing content; do not clear
              setTranscriptSegments(existing)
              console.log('TranscriptTab: Using existing content');
              
              setTranscriptText(existing.map((s: any) => s.text).join('\n'))
            } else {
              setTranscriptText('')
              setTranscriptSegments([])
              log('TranscriptTab: Using new content');
              await AsyncStorage.removeItem(TRANSCRIPTS_KEY(userId, memoryIdRef.current))
            }
          } catch {
            // Corrupt → reset
            setTranscriptText('')
            setTranscriptSegments([])
            await AsyncStorage.removeItem(TRANSCRIPTS_KEY(userId, memoryIdRef.current))
          }
        } else if (initialSegments.length === 0) {
          setTranscriptText('')
          setTranscriptSegments([])
          await AsyncStorage.removeItem(TRANSCRIPTS_KEY(userId, memoryIdRef.current))
        }
      }
    } catch {}

    // Register memory ID only when user explicitly starts recording
    try {
      const idsRaw = await AsyncStorage.getItem(MEMORY_IDS_KEY(userId))
      const ids: string[] = idsRaw ? JSON.parse(idsRaw) : []
      if (!ids.includes(memoryIdRef.current)) {
        ids.unshift(memoryIdRef.current)
        await AsyncStorage.setItem(MEMORY_IDS_KEY(userId), JSON.stringify(ids))
      }
    } catch {}

    // Start recording in global service
    await recordingService.startRecording(userId, memoryIdRef.current)
  }

  const loopOnce = async () => {
    if (!isRecordingRef.current) return

    recordingCountRef.current += 1
    const filename = `chunk_${recordingCountRef.current}_${Date.now()}.wav`

    AudioRecord.init({ 
      sampleRate: 16000, 
      channels: 1, 
      bitsPerSample: 16, 
      wavFile: filename
    })
    try { 
      await AudioRecord.start()
      log(`Recording started: ${filename}`)
    }
    catch (e) {
      log(`Recording start failed: ${(e as Error).message}`)
      setIsRecording(false); isRecordingRef.current = false
      Alert.alert('Recording Error', `Failed to start recording: ${(e as Error).message}`)
      return
    }
    log('started ' + filename)

    activeTimeoutRef.current = setTimeout(async () => {
      try {
        const filePath = await AudioRecord.stop()
        if (!filePath) return
        await new Promise(res => setTimeout(res, 500)) // flush to disk

        const stat = await RNFetchBlob.fs.stat(filePath)
        const fileSize = Number(stat?.size) || 0
        log(`chunk size=${fileSize} bytes`)

        if (!stat || fileSize < MIN_CHUNK_SIZE_BYTES) {
          log(`skipped tiny/silent chunk (${fileSize} < ${MIN_CHUNK_SIZE_BYTES})`)
          RNFetchBlob.fs.unlink(filePath).catch(() => {})
        } else {
          log(`Processing audio chunk: ${fileSize} bytes`)
            if (isOnline) {
              setIsProcessing(true)
              const stt = await sendToWhisper(filePath, 'en')
              setIsProcessing(false)

              if (!isOk(stt)) {
                log(`Whisper ERR: ${stt.err}`)
                await enqueue(filePath)
                scheduleSync(backoffRef.current)
              } else if (stt.text && stt.text.trim().length > 0) {
                const seg: Segment = { text: stt.text, ts: Date.now() }
                setTranscriptSegments(prev => {
                  const next = [...prev, seg]
                  AsyncStorage.setItem(TRANSCRIPTS_KEY(userId, memoryIdRef.current), JSON.stringify(next))
                  setTranscriptText(next.map(s => s.text).join('\n'))
                  return next
                })
                RNFetchBlob.fs.unlink(filePath).catch(() => {})
                log(`Whisper OK: ${stt.text.slice(0, 60)}`)
              } else {
                log('Whisper OK but empty → queue for retry')
                await enqueue(filePath)
                scheduleSync(backoffRef.current)
              }
            } else {
              log('offline → queued')
              await enqueue(filePath)
              scheduleSync(backoffRef.current)
            }
          }
      } catch (e) {
        log('loop error: ' + (e as Error).message)
      }

      if (isRecordingRef.current) loopOnce()
    }, CHUNK_MS)
  }

  const stopRecording = async () => {
    // Stop recording in global service
    await recordingService.stopRecording()
    
    if (activeTimeoutRef.current) { clearTimeout(activeTimeoutRef.current); activeTimeoutRef.current = null }

    try {
      const path = await AudioRecord.stop()
      if (!path) return
      await new Promise(res => setTimeout(res, 500))
      try {
        const stat = await RNFetchBlob.fs.stat(path)
        if (stat && Number(stat.size) >= MIN_CHUNK_SIZE_BYTES) {
          if (isOnline) {
            setIsProcessing(true)
            const stt = await sendToWhisper(path, 'en')
            setIsProcessing(false)
            if (isOk(stt) && stt.text) {
              const seg: Segment = { text: stt.text, ts: Date.now() }
              setTranscriptSegments(prev => {
                const next = [...prev, seg]
                AsyncStorage.setItem(TRANSCRIPTS_KEY(userId, memoryIdRef.current), JSON.stringify(next))
                setTranscriptText(next.map(s => s.text).join('\n'))
                return next
              })
              RNFetchBlob.fs.unlink(path).catch(() => {})
              log('final OK: ' + stt.text.slice(0, 60))
            } else {
              const errMsg = isOk(stt) ? 'empty transcript' : stt.err
              log('final enqueue: ' + errMsg)
              await enqueue(path); scheduleSync(backoffRef.current)
            }
          } else {
            await enqueue(path); scheduleSync(backoffRef.current)
          }
        }
      } catch { /* stat failed → drop */ }
    } catch { /* nothing recording */ }
  }

  // --------------- UI ---------------
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.statusText, { color: isOnline ? '#16A34A' : '#DC2626' }]}>
          {isOnline ? 'Online' : 'Offline — buffering'}
        </Text>
        {isProcessing && <Text style={styles.processingText}>Transcribing…</Text>}
      </View>

      <View style={styles.transcriptWrapper}>
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          {transcriptText
            ? <Text style={styles.transcriptText}>{transcriptText}</Text>
            : <Text style={[styles.transcriptText, { color: '#AAA' }]}>… (no transcript yet)</Text>}
        </ScrollView>
      </View>

      {/* {__DEV__ && (
        <ScrollView style={styles.debugBox}>
          {debug.length === 0
            ? <Text style={styles.debugLine}>debug: waiting…</Text>
            : debug.map((d, i) => <Text key={i} style={styles.debugLine}>{d}</Text>)}
        </ScrollView>
      )} */}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.button,
            isRecording ? styles.btnStop : styles.btnStart,
            !hasMicPermission && styles.btnDisabled,
          ]}
          onPress={isRecording ? stopRecording : beginRecording}
          disabled={!hasMicPermission}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isRecording ? 'stop-circle' : 'mic-circle'}
            size={28}
            color="#fff"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.buttonText}>
            {hasMicPermission
              ? (isRecording ? `Stop Recording` : 'Start Recording')
              : 'Mic Permission Required'}
          </Text>
        </TouchableOpacity>
        
      </View>

      {isProcessing && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusText: { fontSize: 13 },
  processingText: { color: '#007AFF', fontSize: 13, fontWeight: '600' },

  transcriptWrapper: {
    flex: 1,
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  transcriptText: { fontSize: 14, lineHeight: 20, color: '#111827' },

  debugBox: {
    maxHeight: 110,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 6,
    padding: 6,
  },
  debugLine: { fontSize: 11, color: '#374151' },

  controls: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 30, paddingVertical: 10, paddingHorizontal: 20, elevation: 2,
  },
  btnStart: { backgroundColor: '#3B82F6' },
  btnStop: { backgroundColor: '#DC3545' },
  btnDisabled: { backgroundColor: '#A0A0A0' },
  testButton: { backgroundColor: '#10B981', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  loaderOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center',
  },
})
