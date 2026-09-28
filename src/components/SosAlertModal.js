import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Animated, Dimensions, Platform, ScrollView } from 'react-native';
import { AlertTriangle, X, ShieldAlert, Phone, Users, Flame, HeartHandshake } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.getDefault || Dimensions.get('window');

//  SOS Active Alert Banner (shown at top of screen)
export function SosAlertBanner({ sosAlert, onResolve, onClose }) {
  if (!sosAlert) return null;

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerContent}>
        <ShieldAlert size={24} color="#EF4444" style={styles.bannerIcon} />
        <View style={styles.bannerTextWrap}>
          <Text style={styles.bannerTitle}>Active Emergency SOS</Text>
          <Text style={styles.bannerDesc}>
            {sosAlert.senderName} ({sosAlert.senderRole}): {sosAlert.remarks || sosAlert.emergencyType}
          </Text>
          {sosAlert.emergencyContact && (
            <Text style={styles.bannerContact}>Contact: {sosAlert.emergencyContact}</Text>
          )}
        </View>
        <View style={styles.bannerActions}>
          <TouchableOpacity style={styles.resolveBtn} onPress={onResolve}>
            <Text style={styles.resolveText}>Resolve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

//  SOS Trigger Modal/Drawer (pulls up from bottom)
export function SosTriggerDrawer({ isOpen, onClose, onSubmit, user, machine }) {
  const [emergencyType, setEmergencyType] = useState('Medical Emergency');
  const [remarks, setRemarks] = useState('');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const emergencyOptions = [
    { type: 'Medical Emergency', Icon: HeartHandshake, color: '#EF4444', bg: '#FEF2F2' },
    { type: 'Fire Accident', Icon: Flame, color: '#F59E0B', bg: '#FEF3C7' },
    { type: 'Security / Assault', Icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
    { type: 'Other Hazards', Icon: AlertTriangle, color: '#6B7280', bg: '#F3F4F6' },
  ];

  const handleTrigger = () => {
    const payload = {
      id: 'sos_' + Date.now(),
      emergencyType,
      senderName: user?.name || 'Amarjit Chaudhary',
      senderRole: user?.role || 'Site Operator',
      site: user?.site || 'Rohan Riviera Site',
      machineId: machine?.id || 'JSWMHR-TM-003',
      remarks: remarks || ('SOS Alert Triggered: ' + emergencyType),
      emergencyContact: '112',
      time: 'Just now',
    };
    onSubmit(payload);
    onClose();
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.drawer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />
          
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Trigger Emergency SOS</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.drawerSubtitle}>
            This will broadcast a critical warning to the supervisor and site incharge.
          </Text>

          {/* Emergency Options Grid */}
          <Text style={styles.sectionLabel}>Select Incident Type</Text>
          <View style={styles.grid}>
            {emergencyOptions.map(opt => {
              const isSelected = emergencyType === opt.type;
              const IconComp = opt.Icon;
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[
                    styles.gridCard,
                    { backgroundColor: opt.bg },
                    isSelected && { borderWidth: 2, borderColor: opt.color }
                  ]}
                  onPress={() => setEmergencyType(opt.type)}
                >
                  <IconComp size={24} color={opt.color} />
                  <Text style={[styles.gridText, { color: '#0F172A' }]}>{opt.type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Remarks Input */}
          <Text style={styles.sectionLabel}>Additional Info / Remarks</Text>
          <TextInput
            placeholder="e.g. Worker fell down at Deck Slab area, needs immediate medical help."
            placeholderTextColor="#94A3B8"
            value={remarks}
            onChangeText={setRemarks}
            style={styles.textInput}
            multiline
            numberOfLines={3}
          />

          {/* Trigger Button */}
          <TouchableOpacity style={styles.triggerBtn} onPress={handleTrigger}>
            <ShieldAlert size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.triggerBtnText}>CONFIRM SOS ALERT</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 10,
    right: 10,
    zIndex: 99999,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  bannerIcon: {
    marginRight: 12,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  bannerDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    marginTop: 2,
  },
  bannerContact: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B91C1C',
    marginTop: 2,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resolveBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resolveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  drawer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 10,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#EF4444',
  },
  drawerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  gridCard: {
    width: '48%',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 76,
  },
  gridText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    height: 60,
    marginBottom: 24,
  },
  triggerBtn: {
    backgroundColor: '#EF4444',
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
