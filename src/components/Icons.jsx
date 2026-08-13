import { View } from "react-native";

// SVG Icon Components
export const SolarIcon = ({ size = 24, color = "#657EEA" }) => (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2" />
      <line
        x1="12"
        y1="1"
        x2="12"
        y2="3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="21"
        x2="12"
        y2="23"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="23"
        y1="12"
        x2="21"
        y2="12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="3"
        y1="12"
        x2="1"
        y2="12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="20.485"
        y1="3.515"
        x2="19.071"
        y2="4.929"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="4.929"
        y1="19.071"
        x2="3.515"
        y2="20.485"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="3.515"
        y1="3.515"
        x2="4.929"
        y2="4.929"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="19.071"
        y1="19.071"
        x2="20.485"
        y2="20.485"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  </View>
);

export const ElectricIcon = ({ size = 24, color = "#0369a1" }) => (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color}
      />
    </svg>
  </View>
);

export const LeafIcon = ({ size = 24, color = "#0d9488" }) => (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5z"
        fill={color}
      />
    </svg>
  </View>
);

export const ApplyIcon = ({ size = 24, color = "#657EEA" }) => (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 2H7a2 2 0 00-2 2v2H3v2h2v12a2 2 0 002 2h10a2 2 0 002-2V8h2V6h-2V4a2 2 0 00-2-2h-2V0h-2v2H9V2zm0 2v2h6V4H9zm6 14H7V8h8v12z"
        fill={color}
      />
    </svg>
  </View>
);

export const ClockIcon = ({ size = 24, color = "#0369a1" }) => (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <polyline
        points="12 6 12 12 16 14"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </View>
);

export const CardIcon = ({ size = 24, color = "#9333ea" }) => (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
        stroke={color}
        strokeWidth="2"
      />
      <line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth="2" />
      <line x1="2" y1="16" x2="6" y2="16" stroke={color} strokeWidth="2" />
    </svg>
  </View>
);

export const HelpIcon = ({ size = 24, color = "#0d9488" }) => (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <path
        d="M12 8c-1.657 0-3 1.343-3 3 0 1.657 1.343 3 3 3s3-1.343 3-3c0-1.657-1.343-3-3-3z"
        fill={color}
      />
      <line
        x1="12"
        y1="17"
        x2="12"
        y2="18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  </View>
);

export const CheckmarkIcon = ({ size = 24, color = "#657EEA" }) => (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
        fill={color}
      />
    </svg>
  </View>
);

export const TimerIcon = ({ size = 24, color = "#f59e0b" }) => (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="14" r="9" stroke={color} strokeWidth="2" />
      <path
        d="M12 6V5M8 8L7.5 7.5M16 8L16.5 7.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <polyline
        points="12 11 12 14 14 16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </View>
);

export const TrendingIcon = ({ size = 24, color = "#0369a1" }) => (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline
        points="23 6 13.5 15.5 8.5 10.5 1 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="23 6 23 13 16 13"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </View>
);
