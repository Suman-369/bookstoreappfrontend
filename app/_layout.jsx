import { SplashScreen, Stack,useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "../components/SafeScreen"
import {StatusBar} from "expo-status-bar"
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import {useFonts} from 'expo-font'

SplashScreen.preventAutoHideAsync()



export default function RootLayout() {

const router = useRouter()
const segments = useSegments()

const {checkAuth ,user,token} =useAuthStore()
const [isReady, setIsReady] = useState(false)

const [fontLoaded] = useFonts({
  "JetBrainsMono-Medium" : require("../assets/fonts/JetBrainsMono-Medium.ttf")
})

useEffect(()=>{
  if(fontLoaded) SplashScreen.hideAsync()
},[fontLoaded])

useEffect(()=>{
  const initAuth = async () => {
    await checkAuth()
    setIsReady(true)
  }
  initAuth()
},[])

//handle navigation

useEffect(()=>{
  if (!isReady || !segments || segments.length === 0) return
  
  const isAuthScreen = segments[0] ==="(auth)"
  const isSignedIn = user && token

  if(!isSignedIn && !isAuthScreen) router.replace("/(auth)")
  else if(isSignedIn && isAuthScreen) router.replace("/(tabs)")



},[user,token,segments, isReady])




  return (
    <SafeAreaProvider>
    <SafeScreen>
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="(tabs)"/>
      <Stack.Screen name = "(auth)"/>
    </Stack>
    </SafeScreen>
    <StatusBar style = "dark"/>
    </SafeAreaProvider>
  )
}
