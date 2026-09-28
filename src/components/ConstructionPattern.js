import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

export function ConstructionPattern() {
  return (
    <View style={styles.patternContainer} pointerEvents="none">
      {/* Blueprint warning stripe design */}
      <View style={styles.warningStripe} />
    </View>
  );
}

const styles = StyleSheet.create({
  patternContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#F59E0B', // Yellow warning color
    zIndex: 9999,
  },
  warningStripe: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A', // Dark warning stripe overlay
    opacity: 0.15,
  }
});
