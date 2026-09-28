import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Bell, X, ShieldAlert, Megaphone, Info } from 'lucide-react-native';

export function NotificationsModal({ isOpen, onClose, notifications = [], onSelectNotification }) {
  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.safeContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Bell size={20} color="#005BE3" />
              <Text style={styles.headerTitle}>Notifications Center</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {notifications.length > 0 ? (
              notifications.map(notif => {
                const isSos = notif.type === 'sos';
                const isBroadcast = notif.type === 'broadcast';
                const IconComp = isSos ? ShieldAlert : (isBroadcast ? Megaphone : Info);
                const iconColor = isSos ? '#EF4444' : (isBroadcast ? '#005BE3' : '#64748B');
                const cardBg = notif.unread ? (isSos ? '#FEF2F2' : '#EFF6FF') : '#FFFFFF';
                const cardBorder = notif.unread ? (isSos ? '#FCA5A5' : '#BFDBFE') : '#E2E8F0';

                return (
                  <TouchableOpacity
                    key={notif.id}
                    style={[
                      styles.card,
                      { backgroundColor: cardBg, borderColor: cardBorder }
                    ]}
                    onPress={() => onSelectNotification && onSelectNotification(notif)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.iconTitleWrap}>
                        <IconComp size={18} color={iconColor} />
                        <Text style={[styles.cardTitle, isSos && { color: '#B91C1C' }]}>{notif.title}</Text>
                      </View>
                      <Text style={styles.cardTime}>{notif.time}</Text>
                    </View>
                    <Text style={styles.cardMessage} numberOfLines={3}>{notif.message}</Text>
                    {notif.site && (
                      <Text style={styles.cardSite}>Site: {notif.site}</Text>
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Bell size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No notifications yet.</Text>
                <Text style={styles.emptySub}>We'll notify you when something happens.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 44 : 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cardMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  cardSite: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
