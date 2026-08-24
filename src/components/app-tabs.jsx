import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/tabs";
import { useColorScheme } from "react-native";

import { Colors } from "../constants/theme";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];
  const backgrndClr = "#f5f7f6";
  const backgrndClr1 = "#012a47";
  const hiddenScreenOptions = {
    href: null,
    headerShown: false,
    tabBarStyle: { display: "none" },
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: backgrndClr1,
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: backgrndClr,
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
        name="admin"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "options" : "options-outline"}
              size={24}
              color={focused ? backgrndClr1 : color}
            />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="login"
        options={{
          title: "Requests",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "documents" : "documents-outline"}
              size={24}
              color={focused ? backgrndClr1 : color}
            />
          ),
        }}
      /> */}

      <Tabs.Screen
        name="manage-technician"
        options={{
          title: "Technicians",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "hammer" : "hammer-outline"}
              size={24}
              color={focused ? backgrndClr1 : color}
            />
          ),
        }}
      />
      {/* 

      <Tabs.Screen
        name="products"
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
      /> */}

      <Tabs.Screen name="new-request" options={hiddenScreenOptions} />
      <Tabs.Screen name="complaints" options={hiddenScreenOptions} />
      <Tabs.Screen name="active-services" options={hiddenScreenOptions} />
      <Tabs.Screen name="notifications" options={hiddenScreenOptions} />
      {/* <Tabs.Screen name="grow-cleaning" options={hiddenScreenOptions} />
      <Tabs.Screen name="service-schedule" options={hiddenScreenOptions} />
      <Tabs.Screen name="solar-services" options={hiddenScreenOptions} />
      <Tabs.Screen name="solar-amc" options={hiddenScreenOptions} />
      <Tabs.Screen name="electrical-amc" options={hiddenScreenOptions} />
      <Tabs.Screen name="service-status" options={hiddenScreenOptions} />
      <Tabs.Screen name="application-status" options={hiddenScreenOptions} />
      <Tabs.Screen name="request-status" options={hiddenScreenOptions} />
      <Tabs.Screen name="products/[slug]" options={hiddenScreenOptions} /> */}
    </Tabs>
  );
}
