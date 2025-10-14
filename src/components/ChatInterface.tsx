/**
 * Chat Interface Component
 * Modern chat UI with suggested queries and keyboard
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Modal,
  BackHandler,
  Keyboard,
} from 'react-native';
import { AIService, ChatMessage, ChatContext } from '../services/AIService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatInterfaceProps {
  isVisible: boolean;
  onClose: () => void;
  transcript: string;
  userId: string;
  memoryId: string;
}

const { height: screenHeight } = Dimensions.get('window');

// Storage keys for chat persistence
const STORAGE_KEYS = {
  CHAT_MESSAGES: (userId: string, memoryId: string) => `CHAT_MESSAGES_${userId}_${memoryId}`,
} as const;

export default function ChatInterface({
  isVisible,
  onClose,
  transcript,
  userId,
  memoryId,
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState('');
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [hasLoadedSuggestions, setHasLoadedSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const aiService = AIService.getInstance();

  // Save chat messages to storage
  const saveChatMessages = useCallback(async (messages: ChatMessage[]) => {
    try {
      const storageKey = STORAGE_KEYS.CHAT_MESSAGES(userId, memoryId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat messages:', error);
    }
  }, [userId, memoryId]);

  // Load chat messages from storage
  const loadChatMessages = useCallback(async () => {
    try {
      const storageKey = STORAGE_KEYS.CHAT_MESSAGES(userId, memoryId);
      const storedMessages = await AsyncStorage.getItem(storageKey);
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages) as ChatMessage[];
        setMessages(parsedMessages);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  }, [userId, memoryId]);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, []);

  // Clear chat history
  const clearChatHistory = useCallback(async () => {
    try {
      const storageKey = STORAGE_KEYS.CHAT_MESSAGES(userId, memoryId);
      await AsyncStorage.removeItem(storageKey);
      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  }, [userId, memoryId]);

  const handleClose = useCallback(() => {
    // Don't clear messages - keep chat history
    setInputText('');
    setSuggestedQuestions([]);
    setHasLoadedSuggestions(false);
    setIsLoading(false);
    onClose();
  }, [onClose]);

  // Initialize chat with suggested questions and load chat history
  useEffect(() => {
    if (isVisible) {
      // Load existing chat messages
      loadChatMessages();
      
      // Load suggested questions if not already loaded
      if (!hasLoadedSuggestions && transcript) {
        loadSuggestedQuestions();
      }
    }
  }, [isVisible, transcript, hasLoadedSuggestions, loadChatMessages]);

  // Scroll to bottom when messages are loaded
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // Handle back button
  useEffect(() => {
    if (isVisible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleClose();
        return true;
      });

      return () => {
        if (backHandler && typeof backHandler.remove === 'function') {
          backHandler.remove();
        }
      };
    }
  }, [isVisible, handleClose]);

  // Handle keyboard events for better scrolling
  useEffect(() => {
    if (isVisible) {
      const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
        // Scroll to bottom when keyboard shows
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });

      const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
        // Optional: handle keyboard hide
      });

      return () => {
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
      };
    }
  }, [isVisible]);

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

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);
    
    // Save messages to storage
    saveChatMessages(newMessages);
    
    // Scroll to bottom
    scrollToBottom();

    try {
      const context: ChatContext = {
        transcript: transcript || '',
        userId,
        memoryId,
      };

      const result = await aiService.chatWithTranscript(messageText, context, newMessages);
      
      if (result.success && result.data) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: result.data,
          isUser: false,
          timestamp: Date.now(),
        };
        const updatedMessages = [...newMessages, aiMessage];
        setMessages(updatedMessages);
        saveChatMessages(updatedMessages);
        scrollToBottom();
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: result.error || 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: Date.now(),
        };
        const updatedMessages = [...newMessages, errorMessage];
        setMessages(updatedMessages);
        saveChatMessages(updatedMessages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: Date.now(),
      };
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      saveChatMessages(updatedMessages);
      scrollToBottom();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, transcript, userId, memoryId, messages, aiService]);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      sendMessage(inputText);
    }
  };

  const handleSuggestedQuery = (query: string) => {
    setInputText(query);
    inputRef.current?.focus();
  };

  const toggleWebSearch = () => {
    setIsWebSearchEnabled(!isWebSearchEnabled);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity 
          style={styles.container}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <KeyboardAvoidingView 
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? -20 : 0}
          >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {messages.length > 0 && (
              <TouchableOpacity onPress={clearChatHistory} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear Chat</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Messages */}
          {messages.length > 0 && (
            <View style={styles.messagesContainer}>
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageContainer,
                    message.isUser ? styles.userMessage : styles.aiMessage,
                  ]}
                >
                  <Text style={message.isUser ? styles.userMessageText : styles.messageText}>{message.text}</Text>
                </View>
              ))}
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={styles.loadingText}>AI is thinking...</Text>
                </View>
              )}
            </View>
          )}

          {/* Suggested Queries */}
          {suggestedQuestions.length > 0 && messages.length === 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestedQuestions.map((query, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestedQuery(query)}
                >
                  <Text style={styles.suggestionText}>{query}</Text>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

         
        </ScrollView>

        {/* Fixed Input Area */}
        <View style={styles.inputArea}>
           {/* Web Search Toggle */}
           <View style={styles.webSearchContainer}>
            <View style={styles.webSearchLeft}>
              <Text style={styles.globeIcon}>🌐</Text>
              <Text style={styles.webSearchText}>Web Search</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.toggle,
                isWebSearchEnabled && styles.toggleActive
              ]}
              onPress={toggleWebSearch}
            >
              <View style={[
                styles.toggleThumb,
                isWebSearchEnabled && styles.toggleThumbActive
              ]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.scrollUpButton}>
              <Text style={styles.scrollUpIcon}>↑</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask anything about all memories..."
            placeholderTextColor="#9CA3AF"
            multiline
            autoFocus
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
          />
        </View>

        {/* Send Button */}
        <View style={styles.sendButtonContainer}>
          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: screenHeight * 0.9,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.9,
    minHeight: screenHeight * 0.5,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  clearButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  inputArea: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 50,
    maxHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionsContainer: {
    marginBottom: 20,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 16,
    color: '#4B5563',
    flex: 1,
  },
  arrowIcon: {
    fontSize: 18,
    color: '#6B7280',
    marginLeft: 10,
  },
  webSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 3,
  },
  webSearchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  globeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  webSearchText: {
    fontSize: 16,
    color: '#4B5563',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#3B82F6',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  scrollUpButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollUpIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sendButtonContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesContainer: {
    marginBottom: 10,
  },
  messageContainer: {
    marginVertical: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
  },
  messageText: {
    fontSize: 16,
    color: '#1F2937',
  },
  userMessageText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
});
