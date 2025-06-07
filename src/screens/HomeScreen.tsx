import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import AsyncStorage from '@react-native-async-storage/async-storage'

import MemoriesTab from '../components/MemoriesTab'
import CalendarTab from '../components/CalendarTab'
import QuestionsTab from '../components/QuestionsTab'
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function HomeScreen({ route, navigation }: any) {
  // 1) Retrieve from navigation params if available
  const paramAccessToken: string | undefined = route.params?.accessToken
  const paramUser: { name: string; email: string; photo: string } | undefined =
    route.params?.user

  const [accessToken, setAccessToken] = useState<string | null>(
    paramAccessToken ?? null
  )
  const [user, setUser] = useState<{ name: string; email: string; photo: string } | null>(
    paramUser ?? null
  )

  // `user.email` as a fallback userId
  const userId = user?.email ?? 'anonymous'

  const [selectedTab, setSelectedTab] = useState<'memories' | 'calendar' | 'questions'>(
    'memories'
  )

  // A simple counter that we increment whenever this screen gains focus.
  // Passing it as `key` to <MemoriesTab> will force it to remount and reload data.
  const [memRefreshKey, setMemRefreshKey] = useState<number>(0)

  // 2) On mount, if not provided via params, load from AsyncStorage
  useEffect(() => {
    ;(async () => {
      if (!accessToken) {
        const storedAccessToken = await AsyncStorage.getItem('@MyApp:accessToken')
        if (storedAccessToken) {
          setAccessToken(storedAccessToken)
        }
      }
      if (!user) {
        const storedUser = await AsyncStorage.getItem('@MyApp:user')
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
      }
    })()
  }, [accessToken, user])

  // 3) Sign out: clear AsyncStorage, sign out Google, navigate to SignInScreen
  const handleSignOut = async () => {
    try {
      await GoogleSignin.signOut()
      await AsyncStorage.removeItem('@MyApp:idToken')
      await AsyncStorage.removeItem('@MyApp:accessToken')
      await AsyncStorage.removeItem('@MyApp:user')
      navigation.replace('SignIn')
    } catch (err) {
      console.warn('Error signing out:', err)
      Alert.alert('Error', 'Could not sign out. Please try again.')
    }
  }

  // 4) onSelectMemory: called when user taps a memory in MemoriesTab
  const onSelectMemory = (memoryId: string, existingSegments: any[]) => {
    navigation.navigate('CaptureScreen', { userId, memoryId, existingSegments })
  }

  // 5) Whenever this screen comes into focus, bump the `memRefreshKey`.
  //    That will force <MemoriesTab> to remount (because we use `key={memRefreshKey}`).
  useFocusEffect(
    useCallback(() => {
      // Only bump when “Memories” tab is active:
      if (selectedTab === 'memories') {
        setMemRefreshKey((k) => k + 1)
      }
    }, [selectedTab])
  )

  // 6) Render Tab Content
  const renderTabContent = () => {
    switch (selectedTab) {
      case 'memories':
        // By giving a `key={memRefreshKey}`, React will completely remount
        // MemoriesTab each time memRefreshKey changes.
        return (
          <MemoriesTab
            key={memRefreshKey}
            userId={userId}
            onSelectMemory={onSelectMemory}
          />
        )
      case 'calendar':
        return <CalendarTab accessToken={accessToken ?? ''} />
      case 'questions':
        return <QuestionsTab />
      default:
        return null
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeaderContainer}>
    <View style={styles.centerHeaderContainer}>
      {user?.photo ? (
        <Image source={{ uri: user.photo }} style={styles.avatar} />
      ) : null}
    </View>
    <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
    </View>
      {/* ───── TOP HEADER ───── */}

        {/* center header: title + PRO badge */}
       <View style={styles.centerHeaderContainer}>
          <Text style={styles.titleText}>TwinMind</Text>
          <View style={styles.proBadgeContainer}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        </View>
      {/* ───── PROGRESS CARD  ───── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Capture 100 Hours to Unlock Features</Text>
        <Text style={styles.cardSubtitle}>Building Your Second Brain</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '80%' }]} />
        </View>
        <Text style={styles.progressText}>159 / 100 hours</Text>
      </View>

      {/* ───── TAB BAR ───── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, selectedTab === 'memories' && styles.tabItemActive]}
          onPress={() => setSelectedTab('memories')}
        >
          <Text
            style={[styles.tabText, selectedTab === 'memories' && styles.tabTextActive]}
          >
            Memories
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, selectedTab === 'calendar' && styles.tabItemActive]}
          onPress={() => setSelectedTab('calendar')}
        >
          <Text
            style={[styles.tabText, selectedTab === 'calendar' && styles.tabTextActive]}
          >
            Calendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, selectedTab === 'questions' && styles.tabItemActive]}
          onPress={() => setSelectedTab('questions')}
        >
          <Text
            style={[styles.tabText, selectedTab === 'questions' && styles.tabTextActive]}
          >
            Questions
          </Text>
        </TouchableOpacity>
      </View>

      {/* ───── ACTIVE TAB CONTENT ───── */}
      <View style={styles.tabContentContainer}>{renderTabContent()}</View>

      {/* ───── BOTTOM BAR WITH CAPTURE BUTTON ───── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.askButton}>
          <Text style={styles.askText}>Ask All Memories</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureButton}
          onPress={() => navigation.navigate('CaptureScreen', { userId })}
        >
          <Text style={styles.captureText}>Capture</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // ── TOP HEADER ──
  topHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  titleContainer: { flexDirection: 'row', alignItems: 'center' },
  titleText: { fontSize: 22, fontWeight: '700', color: '#333' },
  proBadgeContainer: {
    backgroundColor: '#007aff',
    borderRadius: 15,
    paddingHorizontal: 6,
    verticalAlign: 'middle',
    width: 35,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
   proBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  newCenterHeaderContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ccc',
  },

  logoutButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logoutText: {
    color: '#007aff',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── PROGRESS CARD ──
  card: {
    backgroundColor: '#f5f5f5',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontWeight: '700', fontSize: 16, marginBottom: 4, color: '#333' },
  cardSubtitle: { color: '#666', marginBottom: 8 },
  progressBar: {
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007aff',
  },
  progressText: { fontSize: 12, color: '#555' },

  // ── TAB BAR ──
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderColor: '#007aff',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
  },
  tabTextActive: {
    color: '#007aff',
    fontWeight: '700',
  },

  // ── TAB CONTENT ──
  tabContentContainer: {
    flex: 1,
    marginTop: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    gap: 8,
  },
  askText: {
    color: '#555',
    fontWeight: '500',
  },
  captureButton: {
    backgroundColor: '#007aff',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  captureText: {
    color: '#fff',
    fontWeight: '600',
  },
})
