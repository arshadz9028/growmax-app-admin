import { useColorScheme as nativeUseColorScheme } from "react-native";

export function useColorScheme() {
  const scheme = nativeUseColorScheme();
  return scheme ?? "light";
}
