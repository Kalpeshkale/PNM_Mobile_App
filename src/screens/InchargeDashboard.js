import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Truck, Search, MapPin, AlertTriangle, ShieldAlert, Bell, ChevronRight, Settings, Wrench, ShieldCheck, Activity } from 'lucide-react-native';
import { StatusPill } from '../components/Atoms';

export default function InchargeDashboard({
  user,
  equipment = [],
  onNavigate,
  onOpenSheet,
  onOpenNotifications,
  unreadCount = 0,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Site Stats
  const stats = useMemo(() => {
    const total = equipment.length;
    const working = equipment.filter(e => e.status?.toLowerCase() === 'working').length;
    const idle = equipment.filter(e => e.status?.toLowerCase() === 'idle').length;
    const breakdown = equipment.filter(e => e.status?.toLowerCase() === 'breakdown' || e.status?.toLowerCase() === 'maintenance').length;
    return { total, working, idle, breakdown };
  }, [equipment]);

  // 2. Filtered equipment list
  const filteredEquipment = useMemo(() => {
    return equipment.filter(e => 
      e.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.type?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [equipment, searchQuery]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Incharge Hub</Text>
            <View style={styles.locationRow}>
              <MapPin size={12} color="#94A3B8" />
              <Text style={styles.locationText}>{user?.site || 'Rohan Riviera Site'}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={onOpenNotifications}>
              <Bell size={20} color="#0F172A" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Welcome section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Hello, {user?.name?.split(' ')[0] || 'Supervisor'}</Text>
            <Text style={styles.welcomeSub}>Monitor and control your site operations</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: '#6366F1' }]}>
              <Text style={styles.statLabel}>Total Fleet</Text>
              <Text style={[styles.statValue, { color: '#4F46E5' }]}>{stats.total}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
              <Text style={styles.statLabel}>Working</Text>
              <Text style={[styles.statValue, { color: '#059669' }]}>{stats.working}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
              <Text style={styles.statLabel}>Idle</Text>
              <Text style={[styles.statValue, { color: '#D97706' }]}>{stats.idle}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#EF4444' }]}>
              <Text style={styles.statLabel}>Alerts</Text>
              <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.breakdown}</Text>
            </View>
          </View>

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <Search size={18} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              placeholder="Search machinery..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>

          {/* Equipment List */}
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>Machinery Directory ({filteredEquipment.length})</Text>
            {filteredEquipment.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.machineCard}
                onPress={() => onOpenSheet && onOpenSheet('dailylog', item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleWrap}>
                    <Truck size={20} color="#0F172A" style={styles.machineIcon} />
                    <View>
                      <Text style={styles.machineId}>{item.id}</Text>
                      <Text style={styles.machineLabel}>{item.label}</Text>
                    </View>
                  </View>
                  <StatusPill status={item.status} />
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Operator:</Text>
                    <Text style={styles.detailVal}>{item.operator || 'Not Assigned'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Current Reading:</Text>
                    <Text style={styles.detailVal}>{item.hmr || item.kmr || 0} {item.unit || 'HMR'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fuel Level:</Text>
                    <Text style={styles.detailVal}>{item.fuel || 0}%</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  welcomeSub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#0F172A',
  },
  listSection: {
    marginBottom: 80,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  machineCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 12,
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  machineIcon: {
    marginRight: 12,
  },
  machineId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  machineLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
});
