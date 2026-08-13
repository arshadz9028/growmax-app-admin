import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Linking,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

const SERVICES = [
  { id: '1', icon: 'white-balance-sunny', title: "Solar Projects", desc: "PM SURYAGHAR rooftop solar & industrial installations." },
  { id: '2', icon: 'transmission-tower', title: "33kV Infrastructure", desc: "Licensed electrical works, DTC erection, & line electrification." },
  { id: '3', icon: 'factory', title: "Industrial Setup", desc: "Structured wiring & complete electrical setups for factories." },
  { id: '4', icon: 'tools', title: "AMC Maintenance", desc: "Hassle-free yearly packages with planned technical visits." },
  { id: '5', icon: 'file-document-outline', title: "Consultation", desc: "Site surveys, load planning, and billing dispute guidance." },
];

const TESTIMONIALS = [
  { id: '1', name: "Mahesh Gunjal", text: "Very professional work. My rooftop solar system was installed quickly with full subsidy support." },
  { id: '2', name: "Irfan Ahmed", text: "Faced a high billing issue, but GROWMAX guided me with proper advice. Got relief!" },
  { id: '3', name: "Mirza Zafar", text: "Excellent coordination and timely completion of our 11 kV line project." },
];

export default function App() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const openWhatsApp = () => {
    Linking.openURL('whatsapp://send?phone=919270020069&text=Hello, I would like to inquire about your services.');
  };

  const renderServiceCard = ({ item }) => (
    <View style={styles.serviceCard}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={item.icon} size={32} color="#0052D4" />
      </View>
      <Text style={styles.serviceTitle}>{item.title}</Text>
      <Text style={styles.serviceDesc}>{item.desc}</Text>
    </View>
  );

  const renderTestimonial = ({ item }) => (
    <View style={styles.testimonialCard}>
      <Ionicons name="chatbubbles" size={24} color="#4364F7" style={{ marginBottom: 10 }} />
      <Text style={styles.testimonialText}>"{item.text}"</Text>
      <Text style={styles.testimonialName}>— {item.name}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="lightning-bolt" size={28} color="#0052D4" />
          <Text style={styles.headerLogo}>GROWMAX</Text>
        </View>
        <TouchableOpacity onPress={openWhatsApp}>
          <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        
        {/* Animated Hero Section with Gradient */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <LinearGradient
            colors={['#0052D4', '#4364F7', '#6FB1FC']}
            style={styles.heroSection}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Govt. Licensed (up to 33kV)</Text>
            </View>
            <Text style={styles.heroTitle}>Powering Progress for Homes & Businesses</Text>
            <Text style={styles.heroSubTitle}>Expert Solar EPC, Electrical Contracting & Consulting</Text>
            
            <TouchableOpacity style={styles.ctaButton} onPress={openWhatsApp}>
              <Text style={styles.ctaText}>Get a Free Quote</Text>
              <Ionicons name="arrow-forward" size={20} color="#0052D4" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Highlight Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>2017</Text>
            <Text style={styles.statLabel}>Est. Year</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>EPC</Text>
            <Text style={styles.statLabel}>Solar Experts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>100+</Text>
            <Text style={styles.statLabel}>Happy Clients</Text>
          </View>
        </View>

        {/* Services Swipeable Slides */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Our Services</Text>
            <Text style={styles.swipeText}>Swipe <Ionicons name="arrow-forward" size={12}/></Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={SERVICES}
            keyExtractor={item => item.id}
            renderItem={renderServiceCard}
            snapToInterval={CARD_WIDTH + 20}
            decelerationRate="fast"
            contentContainerStyle={styles.sliderContainer}
          />
        </View>

        {/* Products Section */}
        <View style={[styles.section, { backgroundColor: '#F8F9FE' }]}>
          <Text style={styles.sectionTitle}>Products & Automation</Text>
          <View style={styles.productCard}>
            {["Industrial Power Distribution Panels", "PLC Automation & Touch Screens", "APFC Panels", "Custom Motor Windings & DC Starters"].map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={20} color="#0052D4" style={styles.listIcon} />
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Testimonials Swipeable Slides */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 20 }]}>What Clients Say</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={TESTIMONIALS}
            keyExtractor={item => item.id}
            renderItem={renderTestimonial}
            snapToInterval={CARD_WIDTH + 20}
            decelerationRate="fast"
            contentContainerStyle={styles.sliderContainer}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <MaterialCommunityIcons name="lightning-bolt-circle" size={40} color="#6FB1FC" />
          <Text style={styles.footerTitle}>GROWMAX ENGINEERS</Text>
          
          <View style={styles.footerContactRow}>
            <Ionicons name="location" size={18} color="#999" />
            <Text style={styles.footerText}>MHADA Plot 38, Malegaon, MH 423203</Text>
          </View>
          <View style={styles.footerContactRow}>
            <Ionicons name="call" size={18} color="#999" />
            <Text style={styles.footerText}>+91 92700 20069</Text>
          </View>

          <Text style={styles.copyright}>© 2024 GROWMAX ENGINEERS | All Rights Reserved</Text>
        </View>

      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={openWhatsApp} activeOpacity={0.8}>
        <Ionicons name="logo-whatsapp" size={28} color="#FFF" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLogo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0A2540',
    marginLeft: 5,
    letterSpacing: -0.5,
  },
  heroSection: {
    margin: 15,
    borderRadius: 24,
    padding: 30,
    alignItems: 'flex-start',
    shadowColor: '#0052D4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  heroBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 10,
    lineHeight: 38,
  },
  heroSubTitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 30,
    lineHeight: 22,
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  ctaText: {
    color: '#0052D4',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0A2540',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#EEEEEE',
  },
  section: {
    paddingVertical: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A2540',
    paddingHorizontal: 20,
  },
  swipeText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  sliderContainer: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  serviceCard: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 20,
    marginRight: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#F0F5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A2540',
    marginBottom: 10,
  },
  serviceDesc: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
  },
  productCard: {
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 15,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  listIcon: {
    marginRight: 12,
  },
  listText: {
    fontSize: 15,
    color: '#333333',
    flex: 1,
    fontWeight: '500',
  },
  testimonialCard: {
    width: CARD_WIDTH,
    backgroundColor: '#F8F9FE',
    padding: 24,
    borderRadius: 20,
    marginRight: 20,
  },
  testimonialText: {
    fontSize: 15,
    color: '#444',
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 15,
  },
  testimonialName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0A2540',
  },
  footer: {
    backgroundColor: '#0A2540',
    padding: 40,
    alignItems: 'center',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 20,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 15,
    marginBottom: 20,
    letterSpacing: 1,
  },
  footerContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  footerText: {
    color: '#B0BEC5',
    fontSize: 14,
    marginLeft: 10,
  },
  copyright: {
    color: '#546E7A',
    fontSize: 12,
    marginTop: 30,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#25D366',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  }
});