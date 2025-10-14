/**
 * Chat Bottom Sheet Component
 * Provides chat functionality with transcript using Gemini AI
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { Colors, Typography, Spacing } from '../assets';
import { AIService, ChatMessage, ChatContext } from '../services/AIService';

interface ChatBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  transcript: string;
  userId: string;
  memoryId: string;
}

const { height: screenHeight } = Dimensions.get('window');

export default function ChatBottomSheet({
  isVisible,
  onClose,
  transcript,
  userId,
  memoryId,
}: ChatBottomSheetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [hasLoadedSuggestions, setHasLoadedSuggestions] = useState(false);

  const aiService = AIService.getInstance();

  // Initialize chat with suggested questions
  useEffect(() => {
    if (isVisible && !hasLoadedSuggestions && transcript) {
      loadSuggestedQuestions();
    }
  }, [isVisible, transcript, hasLoadedSuggestions]);

  const loadSuggestedQuestions = useCallback(async () => {
    if (!transcript || transcript.trim().length === 0) {
      setHasLoadedSuggestions(true);
      return;
    }
    
    try {
      setIsLoading(true);
      const result = await aiService.generateSuggestedQuestions(transcript);
      if (result.success && result.data) {
        setSuggestedQuestions(result.data);
        setHasLoadedSuggestions(true);
      } else {
        console.warn('Failed to load suggested questions:', result.error);
        setHasLoadedSuggestions(true);
      }
    } catch (error) {
      console.error('Error loading suggested questions:', error);
      setHasLoadedSuggestions(true);
    } finally {
      setIsLoading(false);
    }
  }, [transcript, aiService]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: messageText.trim(),
      isUser: true,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const context: ChatContext = {
        transcript: transcript || '',
        userId,
        memoryId,
      };

      const result = await aiService.chatWithTranscript(messageText, context, messages);
      
      if (result.success && result.data) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: result.data,
          isUser: false,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: result.error || 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, transcript, userId, memoryId, messages, aiService]);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      sendMessage(inputText);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputText(question);
    sendMessage(question);
  };

  const handleClose = useCallback(() => {
    setMessages([]);
    setInputText('');
    setSuggestedQuestions([]);
    setHasLoadedSuggestions(false);
    onClose();
  }, [onClose]);

  const renderMessage = (message: ChatMessage) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.isUser ? styles.userMessage : styles.aiMessage,
      ]}
    >
      <Text style={styles.messageText}>{message.text}</Text>
      <Text style={styles.messageTime}>
        {new Date(message.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );

  const renderSuggestedQuestions = () => {
    if (suggestedQuestions.length === 0 || messages.length > 0) return null;

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Suggested Questions:</Text>
        {suggestedQuestions.map((question, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionButton}
            onPress={() => handleSuggestedQuestion(question)}
          >
            <Text style={styles.suggestionText}>{question}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat with Transcript</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
          >
            {renderSuggestedQuestions()}
            {messages.map(renderMessage)}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>AI is thinking...</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about the transcript..."
              placeholderTextColor={Colors.text.secondary}
              multiline
              maxLength={500}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    height: screenHeight * 0.7,
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.md,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    ...Typography.textStyles.h4,
    color: Colors.text.primary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  closeButtonText: {
    fontSize: 18,
    color: Colors.text.secondary,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  messageContainer: {
    marginVertical: Spacing.xs,
    maxWidth: '80%',
    padding: Spacing.sm,
    borderRadius: Spacing.borderRadius.lg,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.background.secondary,
  },
  messageText: {
    ...Typography.textStyles.body,
    color: Colors.text.primary,
  },
  messageTime: {
    ...Typography.textStyles.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  suggestionsContainer: {
    marginBottom: Spacing.md,
  },
  suggestionsTitle: {
    ...Typography.textStyles.bodySmall,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  suggestionButton: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.xs,
  },
  suggestionText: {
    ...Typography.textStyles.bodySmall,
    color: Colors.text.primary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  loadingText: {
    ...Typography.textStyles.bodySmall,
    color: Colors.text.secondary,
    marginLeft: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: Spacing.borderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    maxHeight: 100,
    ...Typography.textStyles.body,
    color: Colors.text.primary,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.borderRadius.lg,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.text.secondary,
  },
  sendButtonText: {
    ...Typography.textStyles.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: Typography.fontWeight.medium,
  },
});
