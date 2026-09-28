import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function StatusPill({ status }) {
  const normalized = String(status || 'idle').toLowerCase();
  
  let label = 'Idle';
  let bg = '#F1F5F9';
  let color = '#475569';
  let dotColor = '#64748B';

  if (normalized === 'working' || normalized === 'active') {
    label = 'Working';
    bg = '#ECFDF5';
    color = '#065F46';
    dotColor = '#10B981';
  } else if (normalized === 'breakdown' || normalized === 'bd') {
    label = 'Breakdown';
    bg = '#FEF2F2';
    color = '#991B1B';
    dotColor = '#EF4444';
  } else if (normalized === 'maintenance' || normalized === 'maint') {
    label = 'Maintenance';
    bg = '#FFFBEB';
    color = '#92400E';
    dotColor = '#F59E0B';
  }

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

// Reusable Dial mock component for dashboards
export function Dial({ value, max = 100, label = '', color = '#005BE3' }) {
  return (
    <View style={styles.dialContainer}>
      <Text style={styles.dialLabel}>{label}</Text>
      <Text style={[styles.dialValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  dialLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  dialValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
