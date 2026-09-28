import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Animated, Dimensions, Platform } from 'react-native';
import { Megaphone, X, Send, Globe, Users } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.getDefault || Dimensions.get('window');

//  Broadcast Card Banner (shown at top of screen)
export function BroadcastCardBanner({ broadcastMessage, onClose }) {
  if (!broadcastMessage) return null;

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerContent}>
        <Megaphone size={22} color="#005BE3" style={styles.bannerIcon} />
        <View style={styles.bannerTextWrap}>
          <Text style={styles.bannerTitle}>Site Announcement</Text>
          <Text style={styles.bannerDesc}>
            {broadcastMessage.senderName}: {broadcastMessage.textMessage}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <X size={16} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

//  Broadcast Composer Bottom Drawer
export function BroadcastComposerDrawer({ isOpen, onClose, onSubmit, user }) {
  const [textMessage, setTextMessage] = useState('');
  const [targetProjectName, setTargetProjectName] = useState(user?.site || 'All Rohan Riviera Projects');
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

  const handleSend = () => {
    if (!textMessage.trim()) return;

    const payload = {
      broadcastId: 'bc_' + Date.now(),
      senderName: user?.name || 'Satish Kumar',
      senderRole: user?.role || 'Site Incharge',
      textMessage: textMessage.trim(),
      targetProjectName,
      time: 'Just now',
    };
    onSubmit(payload);
    setTextMessage('');
    onClose();
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.drawer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />
          
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Compose Broadcast</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.drawerSubtitle}>
            Send a real-time site-wide announcement to all active equipment operators.
          </Text>

          {/* Target Audience Selector */}
          <Text style={styles.sectionLabel}>Target Site / Project</Text>
          <View style={styles.audienceBadge}>
            <Globe size={14} color="#005BE3" />
            <Text style={styles.audienceText}>{targetProjectName}</Text>
          </View>

          {/* Announcement Message Input */}
          <Text style={styles.sectionLabel}>Message Content *</Text>
          <TextInput
            placeholder="e.g. Concrete pouring at Deck Slab A starts at 10:00 AM. Please ensure transit mixers are lined up."
            placeholderTextColor="#94A3B8"
            value={textMessage}
            onChangeText={setTextMessage}
            style={styles.textInput}
            multiline
            numberOfLines={4}
          />

          {/* Send Button */}
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Send size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.sendBtnText}>SEND ANNOUNCEMENT</Text>
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
    zIndex: 99998,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#005BE3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
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
    color: '#1E3A8A',
  },
  bannerDesc: {
    fontSize: 12,
    color: '#1E40AF',
    marginTop: 2,
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
    color: '#005BE3',
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
  audienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 20,
  },
  audienceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#005BE3',
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
    height: 80,
    marginBottom: 24,
  },
  sendBtn: {
    backgroundColor: '#005BE3',
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
