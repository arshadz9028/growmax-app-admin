import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HORIZONTAL_MARGIN = 16;
const SLIDE_WIDTH = SCREEN_WIDTH - HORIZONTAL_MARGIN * 2;
const SLIDE_HEIGHT = 250;
const AUTO_PLAY_MS = 4000;

// Fallback if any URL fails
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1509391366368-eeabb5447a55?w=800&q=80";

const SOLAR_SERVICES = [
  {
    id: "1",
    title: "Residential Solar Installation",
    description: "Power your home with clean energy from your rooftop panels.",
    image:
      "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=800&q=80",
  },
  {
    id: "2",
    title: "Commercial Solar Solutions",
    description: "Scalable systems that cut operating costs for modern businesses.",
    image:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=872",
  },
  {
    id: "3",
    title: "Maintenance & Inspection",
    description: "Professional cleaning and checks to keep output at peak efficiency.",
    image:
      "https://images.unsplash.com/photo-1545208942-e1c9c916524b?w=800&q=80",
  },
  {
    id: "4",
    title: "Battery & Off-Grid Storage",
    description: "Reliable backup power so your home stays lit day and night.",
    image:
      "https://images.unsplash.com/photo-1668097613572-40b7c11c8727?q=80&w=870", // replaced broken URL
  },
];

function SlideCard({ item }) {
  const [imageUri, setImageUri] = useState(item.image);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.slide}>
      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        resizeMode="cover"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
          if (imageUri !== FALLBACK_IMAGE) {
            setImageUri(FALLBACK_IMAGE);
          }
        }}
      />

      {loading && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#657EEA" size="small" />
        </View>
      )}

      <View style={styles.textWrap}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );
}

export default function SolarSlideshow() {
  const listRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const indexRef = useRef(0);
  const isDragging = useRef(false);

  const scrollToSlide = useCallback((index) => {
    listRef.current?.scrollToOffset({
      offset: index * SLIDE_WIDTH,
      animated: true,
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isDragging.current) return;
      const next = (indexRef.current + 1) % SOLAR_SERVICES.length;
      indexRef.current = next;
      setActiveIndex(next);
      scrollToSlide(next);
    }, AUTO_PLAY_MS);

    return () => clearInterval(timer);
  }, [scrollToSlide]);

  const onScroll = useCallback((e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SLIDE_WIDTH);
    if (index !== indexRef.current) {
      indexRef.current = index;
      setActiveIndex(index);
    }
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={SOLAR_SERVICES}
        renderItem={({ item }) => <SlideCard item={item} />}
        keyExtractor={(item) => item.id}
        horizontal
        bounces={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SLIDE_WIDTH}
        snapToAlignment="start"
        disableIntervalMomentum
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={() => { isDragging.current = true; }}
        onScrollEndDrag={() => { isDragging.current = false; }}
        style={styles.list}
        getItemLayout={(_, index) => ({
          length: SLIDE_WIDTH,
          offset: SLIDE_WIDTH * index,
          index,
        })}
      />

      <View style={styles.pagination}>
        {SOLAR_SERVICES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              activeIndex === index ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // marginTop: 20,
    height: SLIDE_HEIGHT,
    
    // marginHorizontal: HORIZONTAL_MARGIN,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  list: {
    backgroundColor: "#FFFFFF",
  },
  slide: {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    backgroundColor: "#E5E7EB", // light gray while image loads
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  loaderWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
  },
  textWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 34,
    backgroundColor: "transparent",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 20,
    textShadowColor: "rgba(0, 0, 0, 0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pagination: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    flexDirection: "row",
  },
  dot: {
    height: 7,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 22,
    backgroundColor: "#10B981",
  },
  inactiveDot: {
    width: 7,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
});