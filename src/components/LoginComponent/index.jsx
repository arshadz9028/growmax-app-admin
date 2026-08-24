// import { GoogleSignin } from "@react-native-google-signin/google-signin";
// import { useRouter } from "expo-router";
// import { useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   Image,
//   SafeAreaView,
//   StatusBar,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import Svg, { Path } from "react-native-svg";
// import growNew from "../../../assets/images/grow_new.jpeg";
// import { getApiUrl, safeFetch } from "../../constants/api";
// import { useAuth } from "../../contexts/auth-context";

// const { width } = Dimensions.get("window");

// GoogleSignin.configure({
//   webClientId:
//     "720097041089-ha8b1krhcmsl20bk9u9a34abcgikhqg4.apps.googleusercontent.com",
// });
// const colors = {
//   brand: "#657EEA",
//   brandDark: "#4A63D6",
//   brandDeep: "#3451C7",
//   brandLight: "#EEF1FD",
//   brandMid: "#8FA3F0",
//   amber: "#F59E0B",
//   green: "#10B981",
//   red: "#EF4444",
//   purple: "#8B5CF6",
//   textDark: "#111827",
//   textLight: "#6B7280",
//   border: "#E5E7EB",
//   white: "#FFFFFF",
// };

// export default function LoginScreen() {
//   const router = useRouter();
//   const { saveSession } = useAuth();
//   const [loading, setLoading] = useState(false);
//   const [userData, setUserData] = useState(null);

//   const handleGoogleSignIn = async () => {
//     try {
//       setLoading(true);

//       console.log("Starting Google sign-in...");
//       await GoogleSignin.hasPlayServices();
//       const result = await GoogleSignin.signIn();
//       console.log("User Info:", result);
//       const idToken =
//         result.authentication?.idToken ??
//         result.authentication?.id_token ??
//         result.params?.id_token;
//       console.log("ID Token:", idToken);
//       const accessToken =
//         result.authentication?.accessToken ??
//         result.authentication?.access_token ??
//         result.params?.access_token;
//       console.log("Access Token:", accessToken);

//       const response = await safeFetch(getApiUrl("/api/auth/google"), {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           googleUid: result?.data?.idToken,
//           email: result?.data?.user?.email,
//           username: result?.data?.user?.name,
//           photoURL: result?.data?.user?.photo,
//         }),
//       });

//       const backendData = await response.json();
//       console.log("Backend Response:", backendData);
//       if (!response.ok || !backendData.success) {
//         throw new Error(backendData.message || "Authentication failed.");
//       }

//       await saveSession({
//         username: backendData.data.username || result?.data?.user?.name || "",
//         userToken: backendData.data.userToken || "",
//         secureToken: backendData.data.secureToken || "",
//         refreshToken: backendData.data.refreshToken || "",
//         email: result?.data?.user?.email || "",
//         userId:
//           backendData.data.userId ||
//           backendData.data.id ||
//           backendData.data._id ||
//           result?.data?.user?.userId ||
//           result?.data?.user?.id ||
//           result?.data?.user?._id ||
//           "",
//         photoURL:
//           backendData.data.photoURL ||
//           backendData.data.photoUrl ||
//           result?.data?.user?.photo ||
//           result?.data?.user?.photoUrl ||
//           "",
//       });

//       router.replace("/explore");
//     } catch (error) {
//       console.error("Google Sign-In Error:", error);

//       Alert.alert(
//         "Sign In Failed",
//         error?.message || "An unexpected error occurred.",
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor={colors.brand} />

//       {/* Top Header Card */}
//       <View style={styles.headerContainer}>
//         {/* Background Decorative Circles */}
//         <View style={[styles.circleShape, styles.circleOne]} />
//         <View style={[styles.circleShape, styles.circleTwo]} />
//         <View style={[styles.circleShape, styles.circleThree]} />

//         <View style={styles.headerContent}>
//           {/* Logo with Badge */}
//           <View style={styles.logoContainer}>
//             <View style={styles.logoBox}>
//               <Image source={growNew} style={styles.logoIcon} />
//             </View>
//             <View style={styles.badge}>
//               <Text style={styles.badgeText}>✨</Text>
//             </View>
//           </View>

//           {/* Titles */}
//           <Text style={styles.title}>Growmax Engineers</Text>
//           <Text style={styles.subtitle}>Solar & Electrical Services</Text>

//           {/* Key Metrics Row */}
//           <View style={styles.statsContainer}>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>500+</Text>
//               <Text style={styles.statLabel}>Clients</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>5.0★</Text>
//               <Text style={styles.statLabel}>Rating</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>8 Yrs</Text>
//               <Text style={styles.statLabel}>Experience</Text>
//             </View>
//           </View>
//         </View>

//         {/* Bottom Curved Wave */}
//         <View style={styles.waveContainer}>
//           <Svg
//             height="60"
//             width={width}
//             viewBox="0 0 1440 320"
//             preserveAspectRatio="none"
//           >
//             <Path
//               fill={colors.white}
//               d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,149.3C672,149,768,171,864,181.3C960,192,1056,192,1152,176C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
//             />
//           </Svg>
//         </View>
//       </View>

//       {/* Bottom Authentication Form */}
//       <View style={styles.bottomContainer}>
//         <View style={styles.greetingContainer}>
//           <Text style={styles.greetingTitle}>Welcome back 👋</Text>
//           <Text style={styles.greetingSubtitle}>
//             Sign in to manage your solar services
//           </Text>
//         </View>

//         {/* Google Sign In Button */}
//         <TouchableOpacity
//           style={styles.googleButton}
//           activeOpacity={0.8}
//           onPress={handleGoogleSignIn}
//           // disabled={loading || !request}
//         >
//           {loading ? (
//             <ActivityIndicator color={colors.textDark} />
//           ) : (
//             <>
//               <Text style={styles.googleIconPlaceholder}>G</Text>
//               <Text style={styles.googleButtonText}>Continue with Google</Text>
//             </>
//           )}
//         </TouchableOpacity>

//         {/* Divider 
//         <View style={styles.dividerContainer}>
//           <View style={styles.dividerLine} />
//           <Text style={styles.dividerText}>or</Text>
//           <View style={styles.dividerLine} />
//         </View>
// */}
//         {/* Phone Sign In Button 
//         <TouchableOpacity style={styles.phoneButton} activeOpacity={0.8}>
//           <Text style={styles.phoneButtonText}>Sign In with Phone Number</Text>
//         </TouchableOpacity>
// */}
//         {/* Terms and Privacy Footer */}
//         <Text style={styles.footerText}>
//           By continuing, you agree to our{" "}
//           <Text style={styles.linkText}>Terms of Service</Text> and{" "}
//           <Text style={styles.linkText}>Privacy Policy</Text>
//         </Text>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: colors.white,
//   },
//   headerContainer: {
//     backgroundColor: colors.brand,
//     height: "55%",
//     position: "relative",
//     overflow: "hidden",
//   },
//   circleShape: {
//     position: "absolute",
//     backgroundColor: "rgba(255, 255, 255, 0.08)",
//     borderRadius: 999,
//   },
//   circleOne: {
//     width: 300,
//     height: 300,
//     top: -100,
//     left: -100,
//   },
//   circleTwo: {
//     width: 250,
//     height: 250,
//     top: 50,
//     right: -100,
//   },
//   circleThree: {
//     width: 150,
//     height: 150,
//     bottom: 50,
//     left: 50,
//   },
//   headerContent: {
//     flex: 1,
//     alignItems: "center",
//     paddingTop: 50,
//     paddingHorizontal: 20,
//     zIndex: 1,
//   },
//   logoContainer: {
//     position: "relative",
//     marginBottom: 16,
//   },
//   logoBox: {
//     width: 80,
//     height: 80,
//     backgroundColor: colors.white,
//     borderRadius: 24,
//     justifyContent: "center",
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 10,
//     elevation: 5,
//   },
//   logoIcon: {
//     width: 60,
//     height: 60,
//     borderRadius: 12,
//     resizeMode: "contain",
//   },
//   badge: {
//     position: "absolute",
//     bottom: -4,
//     right: -4,
//     backgroundColor: colors.amber,
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     justifyContent: "center",
//     alignItems: "center",
//     borderWidth: 2,
//     borderColor: colors.white,
//   },
//   badgeText: {
//     fontSize: 10,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: "bold",
//     color: colors.white,
//     marginBottom: 4,
//   },
//   subtitle: {
//     fontSize: 14,
//     color: colors.brandLight,
//     marginBottom: 28,
//     fontWeight: "500",
//   },
//   statsContainer: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     width: "100%",
//     paddingHorizontal: 10,
//   },
//   statBox: {
//     backgroundColor: "rgba(255, 255, 255, 0.15)",
//     borderWidth: 1,
//     borderColor: "rgba(255, 255, 255, 0.3)",
//     borderRadius: 16,
//     paddingVertical: 14,
//     paddingHorizontal: 8,
//     alignItems: "center",
//     flex: 1,
//     marginHorizontal: 6,
//   },
//   statNumber: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: colors.white,
//     marginBottom: 2,
//   },
//   statLabel: {
//     fontSize: 11,
//     color: colors.brandLight,
//     fontWeight: "500",
//   },
//   waveContainer: {
//     position: "absolute",
//     bottom: 0,
//     width: "100%",
//   },
//   bottomContainer: {
//     flex: 1,
//     backgroundColor: colors.white,
//     paddingHorizontal: 24,
//     paddingTop: 10,
//   },
//   greetingContainer: {
//     marginBottom: 28,
//   },
//   greetingTitle: {
//     fontSize: 24,
//     fontWeight: "bold",
//     color: colors.textDark,
//     marginBottom: 6,
//   },
//   greetingSubtitle: {
//     fontSize: 15,
//     color: colors.textLight,
//   },
//   googleButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: colors.white,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 16,
//     paddingVertical: 16,
//     marginBottom: 20,
//   },
//   googleIconPlaceholder: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#DB4437",
//     marginRight: 12,
//   },
//   googleButtonText: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: colors.textDark,
//   },
//   dividerContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 20,
//   },
//   dividerLine: {
//     flex: 1,
//     height: 1,
//     backgroundColor: colors.border,
//   },
//   dividerText: {
//     paddingHorizontal: 16,
//     color: "#9CA3AF",
//     fontSize: 14,
//   },
//   phoneButton: {
//     backgroundColor: colors.brand,
//     borderRadius: 16,
//     paddingVertical: 16,
//     alignItems: "center",
//     marginBottom: 24,
//     shadowColor: colors.brand,
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   phoneButtonText: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: colors.white,
//   },
//   footerText: {
//     textAlign: "center",
//     fontSize: 12,
//     color: colors.textLight,
//     lineHeight: 18,
//     paddingHorizontal: 10,
//   },
//   linkText: {
//     color: colors.brand,
//     fontWeight: "600",
//   },
// });
