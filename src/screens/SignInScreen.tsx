import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Linking,
  Alert,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ─── Configure GoogleSignin at module scope ────────────────────────────────
GoogleSignin.configure({
  webClientId:
    'WEB_CLIENT_ID',
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
})

export default function SignInScreen({ navigation }: any) {
  const [error, setError] = useState<any>(null)
  const [playServicesError, setPlayServicesError] = useState<string | null>(null)

  useEffect(() => {
    // On mount, check if we already have a user in AsyncStorage:
    ;(async () => {
      try {
        const storedIdToken = await AsyncStorage.getItem('@MyApp:idToken')
        const storedUser = await AsyncStorage.getItem('@MyApp:user')
        const storedAccessToken = await AsyncStorage.getItem('@MyApp:accessToken')
        if (storedIdToken && storedUser && storedAccessToken) {
          // We already have a signed-in user; skip SignInScreen
          const userObj = JSON.parse(storedUser)
          navigation.replace('HomeScreen', {
            accessToken: storedAccessToken,
            user: userObj,
          })
        }
      } catch (e) {
        console.warn('Failed to load user from AsyncStorage:', e)
      }
    })()
  }, [navigation])

  const signIn = async () => {
    try {
      // 1) Ensure Google Play Services available
      const hasPlayServices = await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      })
      if (!hasPlayServices) {
        setPlayServicesError('Google Play Services not available.')
        return
      }

      // 2) Start the Google Sign-In flow
      const userInfo = await GoogleSignin.signIn()
      const tokens = await GoogleSignin.getTokens()
      const idToken = tokens.idToken
      const accessToken = tokens.accessToken

      if (!idToken || !accessToken) {
        throw new Error('Missing idToken or accessToken')
      }

      // 3) Extract basic profile info
      const name = userInfo.data?.user.name || ''
      const email = userInfo.data?.user.email || ''
      const photo = userInfo.data?.user.photo || ''

      // 4) Persist tokens & user info in AsyncStorage
      await AsyncStorage.setItem('@MyApp:idToken', idToken)
      await AsyncStorage.setItem('@MyApp:accessToken', accessToken)
      await AsyncStorage.setItem(
        '@MyApp:user',
        JSON.stringify({ name, email, photo })
      )

      // 5) Navigate to HomeScreen (replace so user cannot go back)
      navigation.replace('HomeScreen', {
        accessToken,
        user: { name, email, photo },
      })
    } catch (e: any) {
      // If “activity is null” or any other unexpected error, catch it here
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Cancelled', 'Sign-in was cancelled')
      } else if (e.code === statusCodes.IN_PROGRESS) {
        Alert.alert('In Progress', 'Sign-in already in progress')
      } else if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setPlayServicesError('Play Services not available or outdated.')
      } else if (e.message?.includes('activity is null')) {
        Alert.alert(
          'Sign-In Error',
          'The Google Sign-In flow could not find a valid Activity. Please restart the app and try again.'
        )
      } else {
        setError(e)
        console.warn('Unknown sign-in error:', e)
      }
    }
  }

  return (
    <LinearGradient
      colors={['#5a7ba6', '#e6a372']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.background}
    >
      <View style={styles.container}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {playServicesError && (
          <Text style={styles.error}>{playServicesError}</Text>
        )}
        {error && (
          <Text style={styles.error}>Error: {error.message || error.code}</Text>
        )}

        <TouchableOpacity style={styles.googleBtn} onPress={signIn}>
          <Text style={styles.btnText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.appleBtn}>
          <Text style={styles.btnText}>Continue with Phone</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerLink} onPress={() => Linking.openURL('#')}>
            Privacy Policy
          </Text>
          <Text style={styles.footerLink} onPress={() => Linking.openURL('#')}>
            Terms of Service
          </Text>
        </View>

        <StatusBar barStyle="light-content" />
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    height: 100,
    marginBottom: 60,
  },
  googleBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  appleBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 32,
  },
  footerLink: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
})
