import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import React from "react";

function CustomModal({ visible, onClose, title, message }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Ionicons name="checkmark-circle" size={70} color="#657EEA" />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
export default CustomModal;
const styles = StyleSheet.create({

  modal: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 25,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 15,
  },
  subtitle: {
    marginTop: 20,
    color: "#666",
    fontSize: 15,
  },
  tokenContainer: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  token: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 2,
    marginRight: 10,
  },
  note: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
    lineHeight: 22,
  },
  button: {
    marginTop: 25,
    backgroundColor: "#657EEA",
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});