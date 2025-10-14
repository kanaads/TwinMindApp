/**
 * Capture Screen - Refactored with MVVM
 * Clean separation of concerns with ViewModel handling business logic
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Assets
import { Colors, Typography, Strings, Spacing } from '../../assets';

// ViewModels
import { CaptureViewModel } from '../../viewmodels';

// Components
import SearchesTab from '../../components/SearchesTab';
import NotesTab from '../../components/NotesTab';
import TranscriptTab from '../../components/TranscriptTab';
import ChatInterface from '../../components/ChatInterface';
import { useRecording } from '../../contexts/RecordingContext';

interface CaptureScreenProps {
  route: any;
  navigation: any;
}

export default function CaptureScreen({ route, navigation }: CaptureScreenProps) {
  const userId = route.params?.userId ?? 'anonymous';
  const memoryId = route.params?.memoryId;
  const existingSegments = route.params?.existingSegments;
  const { forceNew } = useRecording();

  const [captureViewModel] = useState(() => new CaptureViewModel(userId, memoryId, existingSegments));
  const [captureState, setCaptureState] = useState(captureViewModel.getCaptureState());
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [transcriptSegments, setTranscriptSegments] = useState<any[]>([]);

  // Initialize ViewModel
  useEffect(() => {
    initializeCapture();
  }, []);

  // Load transcript text when component mounts or memoryId changes
  useEffect(() => {
    loadTranscriptText();
  }, [userId, memoryId]);

  // Set up interval to check for transcript updates
  useEffect(() => {
    const interval = setInterval(async () => {
      await loadTranscriptText();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [userId, memoryId]);

  // Update state when ViewModel changes
  useEffect(() => {
    const interval = setInterval(() => {
      setCaptureState(captureViewModel.getCaptureState());
    }, 100);

    return () => clearInterval(interval);
  }, [captureViewModel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      captureViewModel.cleanup();
    };
  }, [captureViewModel]);

  const initializeCapture = async () => {
    await captureViewModel.initialize();
    setCaptureState(captureViewModel.getCaptureState());
  };

  const loadTranscriptText = async () => {
    try {
      // First, try to get all available transcript keys
      const allKeys = await AsyncStorage.getAllKeys();
      const transcriptKeys = allKeys.filter(key => key.startsWith(`TRANSCRIPTS_${userId}_`));
      let transcriptData = null;
      let usedKey = null;
      
      // If we have a specific memoryId, try that first
      if (memoryId) {
        const TRANSCRIPTS_KEY = `TRANSCRIPTS_${userId}_${memoryId}`;
        transcriptData = await AsyncStorage.getItem(TRANSCRIPTS_KEY);
        if (transcriptData) {
          usedKey = TRANSCRIPTS_KEY;
        }
      }
      
      // If no specific memory ID or no data found, use the most recent transcript
      if (!transcriptData && transcriptKeys.length > 0) {
        // Sort keys by timestamp (newest first) and use the most recent one
        const sortedKeys = transcriptKeys.sort((a, b) => {
          const timestampA = parseInt(a.split('_').pop() || '0');
          const timestampB = parseInt(b.split('_').pop() || '0');
          return timestampB - timestampA;
        });
        
        const latestKey = sortedKeys[0]; // Use the most recent key
        transcriptData = await AsyncStorage.getItem(latestKey);
        usedKey = latestKey;
      }
      
      if (transcriptData) {
        const segments = JSON.parse(transcriptData);
        setTranscriptSegments(segments);
        const fullText = segments.map((segment: any) => segment.text).join('\n');
        setTranscriptText(fullText);
      } else if (existingSegments && existingSegments.length > 0) {
        setTranscriptSegments(existingSegments);
        const fullText = existingSegments.map((segment: any) => segment.text).join('\n');
        setTranscriptText(fullText);
      }
    } catch (error) {
      console.error('Error loading transcript:', error);
    }
  };

  const handleTabChange = (tab: 'searches' | 'notes' | 'transcript') => {
    captureViewModel.setSelectedTab(tab);
    setCaptureState(captureViewModel.getCaptureState());
  };

  const handleBack = () => {
    navigation.navigate('HomeScreen');
  };

  const handleChatWithTranscript = () => {
    setIsChatVisible(true);
  };

  const handleCloseChat = () => {
    setIsChatVisible(false);
  };

  const getTranscriptText = () => {
    // Use the transcriptText state that's being updated by loadTranscriptText
    if (transcriptText && transcriptText.trim().length > 0) {
      return transcriptText;
    }
    
    // Fallback to existing segments
    if (existingSegments && existingSegments.length > 0) {
      return existingSegments
        .map((segment: any) => segment.text)
        .join(' ');
    }
    
    return 'No transcript available yet. Please start recording to generate a transcript.';
  };

  const renderTabContent = () => {
    switch (captureState.selectedTab) {
      case 'searches':
        return <SearchesTab />;
      case 'notes':
        return <NotesTab route={{ params: { userId, memoryId, transcriptText } }} />;
      case 'transcript':
        return (
          <TranscriptTab
            route={{
              params: {
                userId,
                memoryId,
                existingSegments,
                forceNew,
              },
            }}
            navigation={navigation}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>{'< Home'}</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.titleText}>
            {memoryId ? 'Continue Transcript' : 'New Transcript'}
          </Text>
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

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            captureState.selectedTab === 'searches' && styles.tabItemActive
          ]}
          onPress={() => handleTabChange('searches')}
        >
          <Text
            style={[
              styles.tabText,
              captureState.selectedTab === 'searches' && styles.tabTextActive
            ]}
          >
            Searches
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            captureState.selectedTab === 'notes' && styles.tabItemActive
          ]}
          onPress={() => handleTabChange('notes')}
        >
          <Text
            style={[
              styles.tabText,
              captureState.selectedTab === 'notes' && styles.tabTextActive
            ]}
          >
            Notes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            captureState.selectedTab === 'transcript' && styles.tabItemActive
          ]}
          onPress={() => handleTabChange('transcript')}
        >
          <Text
            style={[
              styles.tabText,
              captureState.selectedTab === 'transcript' && styles.tabTextActive
            ]}
          >
            Transcript
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContentContainer}>
        {renderTabContent()}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChatWithTranscript}
          activeOpacity={0.7}
        >
          <Text style={styles.chatText}>Chat with Transcript</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Interface */}
      <ChatInterface
        isVisible={isChatVisible}
        onClose={handleCloseChat}
        transcript={getTranscriptText()}
        userId={userId}
        memoryId={memoryId || 'current'}
      />
    </SafeAreaView>
  );
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
  backButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },

  // INNER TAB BAR
  tabBar: {
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
  tabContentContainer: {
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
});
