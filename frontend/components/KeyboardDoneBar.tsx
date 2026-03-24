import React from 'react';
import { View, TouchableOpacity, Text, InputAccessoryView, Keyboard, StyleSheet, Platform } from 'react-native';

const ACCESSORY_ID = 'keyboard-done-bar';

export function KeyboardDoneBar() {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={ACCESSORY_ID}>
      <View style={styles.bar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.btn}>
          <Text style={styles.btnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

export const DONE_BAR_ID = ACCESSORY_ID;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#f1f1f1',
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
