import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';

let toastListener = null;

export const showToast = (message, type = 'success') => {
  const cleanMsg = String(message || '').replace(/^(Success:|Error:)\s*/i, '').trim();
  if (toastListener) {
    toastListener({ message: cleanMsg, type, id: Date.now() });
  }
};

export function CustomToast() {
  const [toast, setToast] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(-60));

  useEffect(() => {
    toastListener = (newToast) => {
      setToast(newToast);
      fadeAnim.setValue(0);
      translateY.setValue(-60);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, 3500);

      return () => clearTimeout(timer);
    };

    return () => {
      toastListener = null;
    };
  }, []);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  };

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error' || toast.type === 'danger';

  // High contrast banner colors
  const bg = isSuccess ? '#ECFDF5' : isError ? '#FEF2F2' : '#F0F9FF';
  const border = isSuccess ? '#6EE7B7' : isError ? '#FCA5A5' : '#7DD3FC';
  const text = isSuccess ? '#065F46' : isError ? '#991B1B' : '#075985';
  const accentColor = isSuccess ? '#10B981' : isError ? '#EF4444' : '#0284C7';

  const IconComponent = isSuccess ? CheckCircle2 : isError ? AlertCircle : Info;

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          opacity: fadeAnim, 
          transform: [{ translateY }],
          backgroundColor: bg,
          borderColor: border,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity activeOpacity={0.92} style={styles.content} onPress={hideToast}>
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        <IconComponent size={20} color={accentColor} style={styles.icon} />
        <Text style={[styles.text, { color: text }]} numberOfLines={2}>{toast.message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 12 : 54,
    left: 14,
    right: 14,
    zIndex: 999999,
    elevation: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accentBar: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
    marginRight: 10,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
  },
});
