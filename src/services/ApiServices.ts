import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'

////////////////////////////////////////////////////////////////////////////////
// CONFIGURATION
const API_BASE = 'API_BASE_URL' // Replace with your actual API base URL

////////////////////////////////////////////////////////////////////////////////
// STORAGE KEYS
const TRANSCRIPTS_KEY = (userId: string, memoryId: string) =>
  `TRANSCRIPTS_${userId}_${memoryId}`
const PENDING_KEY = (userId: string) =>
  `PENDING_TRANSCRIPTS_${userId}`
const MEMORY_IDS_KEY = (userId: string) =>
  `MEMORY_IDS_${userId}`

////////////////////////////////////////////////////////////////////////////////
// TYPE
export type Segment = { text: string; ts: number }

////////////////////////////////////////////////////////////////////////////////
// 1) CHECK ONLINE STATUS
export async function isDeviceOnline(): Promise<boolean> {
  try {
    const s = await NetInfo.fetch()
    return s.isConnected === true
  } catch {
    return false
  }
}

////////////////////////////////////////////////////////////////////////////////
// 2) UPLOAD API
export async function uploadTranscriptSegments(
  userId: string,
  segments: string[]
): Promise<void> {
  const r = await fetch(`${API_BASE}/transcripts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, segments }),
  })
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`uploadTranscriptSegments failed ${r.status}: ${txt}`)
  }
}

////////////////////////////////////////////////////////////////////////////////
// 3) PENDING QUEUE HELPERS
async function getPending(userId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(PENDING_KEY(userId))
  return raw ? JSON.parse(raw) : []
}
async function setPending(userId: string, ids: string[]) {
  await AsyncStorage.setItem(PENDING_KEY(userId), JSON.stringify(ids))
}

////////////////////////////////////////////////////////////////////////////////
// 4) SAVE & SYNC (minimal)
export async function saveTranscriptSegments(
  userId: string,
  memoryId: string,
  segments: Segment[]
): Promise<void> {
  // — persist locally
  await AsyncStorage.setItem(
    TRANSCRIPTS_KEY(userId, memoryId),
    JSON.stringify(segments)
  )

  // — register memoryId
  {
    const raw = await AsyncStorage.getItem(MEMORY_IDS_KEY(userId))
    const ids: string[] = raw ? JSON.parse(raw) : []
    if (!ids.includes(memoryId)) {
      ids.unshift(memoryId)
      await AsyncStorage.setItem(MEMORY_IDS_KEY(userId), JSON.stringify(ids))
    }
  }

  // — try to upload immediately
  const online = await isDeviceOnline()
  if (online && segments.length > 0) {
    try {
      await uploadTranscriptSegments(
        userId,
        segments.map((s) => s.text)
      )
      // remove from pending if present
      const pend = await getPending(userId)
      await setPending(
        userId,
        pend.filter((id) => id !== memoryId)
      )
      return
    } catch {
      /* fall through into enqueue */
    }
  }

  // — enqueue for retry
  {
    const pend = await getPending(userId)
    if (!pend.includes(memoryId)) {
      pend.unshift(memoryId)
      await setPending(userId, pend)
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
// 5) RETRY PENDING WHEN ONLINE
export async function retryPendingTranscripts(userId: string) {
  if (!(await isDeviceOnline())) return
  const pend = await getPending(userId)
  if (pend.length === 0) return

  let remaining = [...pend]
  for (const mid of pend) {
    try {
      const raw = await AsyncStorage.getItem(TRANSCRIPTS_KEY(userId, mid))
      if (!raw) {
        remaining = remaining.filter((x) => x !== mid)
        continue
      }
      const segs = JSON.parse(raw) as Segment[]
      if (segs.length === 0) {
        remaining = remaining.filter((x) => x !== mid)
        continue
      }
      await uploadTranscriptSegments(
        userId,
        segs.map((s) => s.text)
      )
      remaining = remaining.filter((x) => x !== mid)
    } catch {
      // leave in queue
    }
  }
  await setPending(userId, remaining)
}

////////////////////////////////////////////////////////////////////////////////
// 6) EXPORT
export default {
  isDeviceOnline,
  uploadTranscriptSegments,
  saveTranscriptSegments,
  retryPendingTranscripts,
}
