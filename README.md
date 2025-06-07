# TwinMind Mobile App

A React Native application for continuously capturing, transcribing, and managing audio “memories” on Android and iOS.

---

## Features

- **Continuous Speech-to-Text**  
  Records audio in 30 s chunks, sends each chunk to Google Cloud Speech-to-Text, and displays live transcript.

- **Memory Management**  
  - Each recording session is saved as a “memory” (timestamp-keyed).  
  - Memories list shows previews and timestamps.  
  - Resume previous sessions to append more audio/transcripts.

- **Offline-First Persistence & Sync**  
  - Transcripts & memory IDs stored locally via AsyncStorage.  
  - Pending uploads queued when offline; automatically retried when back online.  
  - Minimal API service layer to push chunks and transcript segments to Firebase Functions backend.

- **Tabbed UI**  
  - **Memories**: FlatList of saved sessions.  
  - **Calendar**: Upcoming Google Calendar events.  
  - **Questions**: (Placeholder) freeform Q&A over transcripts.  
  - **Capture**: Start/stop recording, switch between Searches/Notes/Transcript sub-tabs.

- **Authentication**  
  Google Sign-In with token persistence in AsyncStorage; auto-login on app launch.

- **Backend Stubs**  
  Firebase Functions (Express) endpoints for `/audio-chunks`, `/transcripts`, `/chat`, `/summaries`.

---

## Installation

1. **Clone repo**  
   ```bash
   git clone https://github.com/kanaads/TwinMindApp.git
   cd twinmind-mobile
   ```
2. **Install dependencies**  
   ```bash
   yarn install
   ```
3. **Configure**  
   - Replace `GOOGLE_CLOUD_SPEECH_API_KEY` in **`TranscriptTab.tsx`**.  
   - Set your Firebase Functions URL in **`ApiServices.ts`**.

4. **Run on Android**  
   ```bash
   npx react-native run-android
   ```
5. **Run on iOS**  
   ```bash
   npx pod-install ios
   npx react-native run-ios
   ```

---

## Building Release APK

```bash
cd android
./gradlew assembleRelease
```

Your signed APK will be at  
`android/app/build/outputs/apk/release/app-release.apk`

---

## Project Structure

```
/src
  /components
    MemoriesTab.tsx
    CalendarTab.tsx
    QuestionsTab.tsx
    TranscriptTab.tsx
    SearchesTab.tsx
    NotesTab.tsx
  /screens
    HomeScreen.tsx
    SignInScreen.tsx
    CaptureScreen.tsx
  /services
    ApiServices.ts
/functions
  index.js        // Firebase Express endpoints
```

---

## Future Enhancements

- Real backend integration for chat & summaries  
- Better error handling and UX polish  
- Add biometric sign-in, dark mode, localization  

---

> Built by Kanaad for the TwinMind Android Developer Internship assignment.  
