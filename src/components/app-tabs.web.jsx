import { Tabs } from "expo-router/tabs";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../constants/theme";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];
  const backgrndClr1 = "#959EF2";
  const hiddenScreenOptions = {
    href: null,
    headerShown: false,
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: backgrndClr1,
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontWeight: "600",
          fontSize: 12,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={focused ? backgrndClr1 : color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Services",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "sparkles" : "sparkles-outline"}
              size={24}
              color={focused ? backgrndClr1 : color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="request-status"
        options={{
          title: "Products",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bag" : "bag-outline"}
              size={24}
              color={focused ? backgrndClr1 : color}
            />
          ),
        }}
      />

      <Tabs.Screen name="grow-cleaning" options={hiddenScreenOptions} />
      <Tabs.Screen name="login" options={hiddenScreenOptions} />
      <Tabs.Screen name="payment" options={hiddenScreenOptions} />
      <Tabs.Screen name="service-schedule" options={hiddenScreenOptions} />
      <Tabs.Screen name="solar-services" options={hiddenScreenOptions} />
    </Tabs>
  );
}
