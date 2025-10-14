import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import Ionicons from 'react-native-ionicons'
import { AIService, MeetingSummary } from '../services'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface NotesTabProps {
  route: {
    params?: {
      userId: string
      memoryId?: string
      transcriptText?: string
    }
  }
}

export default function NotesTab({ route }: NotesTabProps) {
  const userId = route.params?.userId ?? 'anonymous'
  const memoryId = route.params?.memoryId ?? 'default'
  const transcriptText = route.params?.transcriptText ?? ''


  const [meetingSummary, setMeetingSummary] = useState<MeetingSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showFullSummary, setShowFullSummary] = useState(false)
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false)

  const aiService = AIService.getInstance()

  // Load existing summary on mount
  useEffect(() => {
    loadExistingSummary()
  }, [userId, memoryId])

  // Generate summary when transcript is available
  useEffect(() => {
    if (transcriptText && transcriptText.trim().length > 0 && !meetingSummary && !hasAttemptedGeneration) {
      setHasAttemptedGeneration(true)
      generateSummary()
    }
  }, [transcriptText, meetingSummary, hasAttemptedGeneration])


  const loadExistingSummary = async () => {
    try {
      setIsLoading(true)
      const result = await aiService.getMeetingSummary(userId, memoryId)
      if (result.success && result.data) {
        setMeetingSummary(result.data)
      }
    } catch (error) {
      console.error('Error loading summary:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateSummary = async () => {
    if (!transcriptText || transcriptText.trim().length === 0) {
      return
    }

    try {
      setIsGenerating(true)
      const result = await aiService.generateMeetingSummary(transcriptText, userId, memoryId)
      
      if (result.success && result.data) {
        setMeetingSummary(result.data)
      }
    } catch (error) {
      console.error('Error generating summary:', error)
    } finally {
      setIsGenerating(false)
    }
  }


  const renderSummary = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading summary...</Text>
        </View>
      )
    }

    if (isGenerating) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Generating AI summary...</Text>
        </View>
      )
    }

    if (!meetingSummary) {
      if (transcriptText && transcriptText.trim().length > 0 && hasAttemptedGeneration) {
        return (
          <View style={styles.sectionBox}>
            <Text style={styles.placeholderText}>
              Generating summary from your meeting...
            </Text>
          </View>
        )
      } else if (transcriptText && transcriptText.trim().length > 0) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.loadingText}>Analyzing meeting transcript...</Text>
          </View>
        )
      } else {
        return (
          <View style={styles.sectionBox}>
            <Text style={styles.placeholderText}>
              Start recording a meeting to generate an AI summary automatically.
            </Text>
          </View>
        )
      }
    }

    return (
      <View style={styles.sectionBox}>
        {/* Main Summary */}
        <Text style={styles.summaryText}>{meetingSummary.summary}</Text>
        
        {/* Key Points */}
        {meetingSummary.keyPoints && meetingSummary.keyPoints.length > 0 && (
          <>
            {meetingSummary.keyPoints.map((point, index) => {
              // Split the point into lines to handle main topics and sub-bullets
              const lines = point.split('\n')
              return (
                <View key={index} style={styles.keyPointContainer}>
                  {lines.map((line, lineIndex) => {
                    const isSubBullet = line.startsWith('  •')
                    const isMainTopic = line.startsWith('**') && line.endsWith('**')
                    const cleanLine = line.replace(/^\s*•\s*/, '').replace(/\*\*/g, '')
                    
                    return (
                      <Text 
                        key={lineIndex} 
                        style={isSubBullet ? styles.subBulletPoint : isMainTopic ? styles.mainTopic : styles.bulletPoint}
                      >
                        {isSubBullet ? '  • ' : isMainTopic ? '• ' : '• '}{cleanLine}
                      </Text>
                    )
                  })}
                </View>
              )
            })}
          </>
        )}
        
        {/* Action Items */}
        {meetingSummary.actionItems && meetingSummary.actionItems.length > 0 && (
          <>
            {meetingSummary.actionItems.map((item, index) => (
              <Text key={index} style={styles.bulletPoint}>• {item}</Text>
            ))}
          </>
        )}
      </View>
    )
  }


  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Meeting Summary</Text>
        {transcriptText && transcriptText.length > 0 && (
          <TouchableOpacity onPress={generateSummary} disabled={isGenerating}>
            <Text style={[styles.linkText, isGenerating && styles.disabledText]}>
              {isGenerating ? 'Generating...' : 'Generate'}
            </Text>
          </TouchableOpacity>
        )}
      </View>


      {/* AI-Generated Summary */}
      <Text style={styles.subHeading}>Summary</Text>
      {renderSummary()}

      {/* Meeting Details */}
      {meetingSummary && (
        <>
          <Text style={[styles.subHeading, { marginTop: 24 }]}>Meeting Details</Text>
          <View style={styles.sectionBox}>
            {meetingSummary.participants && meetingSummary.participants.length > 0 && (
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Participants: </Text>
                {meetingSummary.participants.join(', ')}
              </Text>
            )}
            {/* {meetingSummary.duration && (
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Duration: </Text>
                {meetingSummary.duration} minutes
              </Text>
            )} */}
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Generated: </Text>
              {new Date(meetingSummary.timestamp).toLocaleString()}
            </Text>
          </View>
        </>
      )}

      {/* Your Notes Section */}
      <Text style={[styles.subHeading, { marginTop: 24 }]}>Your Notes</Text>
      <View style={styles.sectionBox}>
        <Text style={styles.placeholderText}>
          You haven't written any notes. Click "Edit Notes" to add.
        </Text>
      </View>

      {/* Chat with Transcript */}
      {/* <View style={styles.bottomChatContainer}>
        <TouchableOpacity style={styles.chatButton}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#374151" />
          <Text style={styles.chatButtonText}>Chat with Transcript</Text>
        </TouchableOpacity>
      </View> */}
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
    padding: 16,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    lineHeight: 20,
  },
  subBulletPoint: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 16,
    marginBottom: 4,
    lineHeight: 18,
  },
  mainTopic: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  keyPointContainer: {
    marginBottom: 8,
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

  // New styles for AI integration
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  summaryText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#1F2937',
  },


})
