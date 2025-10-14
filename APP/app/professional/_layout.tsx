"use client"

import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import * as NavigationBar from "expo-navigation-bar"
import { useEffect } from "react"
import { StatusBar } from "expo-status-bar"
export default function ProfessionalTabs() {
  useEffect(() => {
    const hideNavigationBar = async () => {
      await NavigationBar.setVisibilityAsync("hidden")
      await NavigationBar.setBehaviorAsync("overlay-swipe")
    }
    hideNavigationBar()
  }, [])
  return (
    <Tabs>
      <StatusBar style="auto" />
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="register"
        options={{
          headerShown: false,
          title: "Registrar atención",
          tabBarIcon: ({ color, size }) => <Ionicons name="create" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="patient"
        options={{
          // Ocultamos la barra de tabs superior (padre) y el header
          headerShown: false,
          tabBarStyle: { display: "none" },
          href: null,
          title: "Mis Pacientes",
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          headerShown: false,
          title: "Buscar",
          tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
