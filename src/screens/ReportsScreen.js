import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Modal, TextInput, FlatList } from 'react-native';
import { FileText, Calendar, Fuel, Wrench, ShieldAlert, Megaphone, ChevronLeft, Download, Filter, Search, X } from 'lucide-react-native';
import { ConstructionPattern } from '../components/ConstructionPattern';

export default function ReportsScreen({ onBack }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('Today');

  // Square Report Box Categories
  const reportTiles = [
    {
      id: 'logsheet',
      title: 'Logsheet Report',
      subtitle: 'Daily HMR/KMR machine operation logs',
      icon: FileText,
      iconBg: '#EFF6FF',
      iconColor: '#1D4ED8',
      count: '142 Logs',
    },
    {
      id: 'attendance',
      title: 'Attendance Report',
      subtitle: 'Operator site check-in & duty logs',
      icon: Calendar,
      iconBg: '#ECFDF5',
      iconColor: '#059669',
      count: '28 Present',
    },
    {
      id: 'fuel',
      title: 'Fuel Consumption',
      subtitle: 'Diesel refilling & fuel efficiency',
      icon: Fuel,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      count: '1,250 Liters',
    },
    {
      id: 'maintenance',
      title: 'Maintenance Report',
      subtitle: 'Service breakdown & repair records',
      icon: Wrench,
      iconBg: '#F3E8FF',
      iconColor: '#9333EA',
      count: '4 Open Tasks',
    },
    {
      id: 'sos',
      title: 'SOS Emergency Logs',
      subtitle: 'Medical & site siren alert records',
      icon: ShieldAlert,
      iconBg: '#FEF2F2',
      iconColor: '#DC2626',
      count: '2 Incidents',
    },
    {
      id: 'broadcast',
      title: 'Broadcast History',
      subtitle: 'Site announcements & notifications',
      icon: Megaphone,
      iconBg: '#EEF2FF',
      iconColor: '#4F46E5',
      count: '12 Sent',
    },
  ];

  // Mock Report Data Rows
  const sampleReportData = {
    logsheet: [
      { id: '1', machine: 'JSWMHR-TM-003', operator: 'Kalpesh Kale', hmr: '20 HMR', status: 'Working', date: '05 Aug 2026' },
      { id: '2', machine: 'JSWMHR-TM-004', operator: 'Nishant V.', hmr: '140 HMR', status: 'Idle', date: '05 Aug 2026' },
      { id: '3', machine: 'JSWMHR-TM-005', operator: 'Deepak Kukade', hmr: '412 HMR', status: 'Breakdown', date: '04 Aug 2026' },
    ],
    attendance: [
      { id: '1', name: 'Kalpesh Kale', role: 'Site Operator', status: 'Present (On Duty)', time: '08:00 AM' },
      { id: '2', name: 'Amarjit Chaudhary', role: 'Transit Operator', status: 'Present', time: '08:15 AM' },
      { id: '3', name: 'Rahul Sharma', role: 'JCB Operator', status: 'On Leave', time: '-' },
    ],
    fuel: [
      { id: '1', machine: 'JSWMHR-TM-003', qty: '120 Liters', rate: '92/L', vendor: 'Rohan Fuel Station', date: '05 Aug' },
      { id: '2', machine: 'JSWMHR-JCB-001', qty: '200 Liters', rate: '92/L', vendor: 'Site Tanker 2', date: '04 Aug' },
    ],
    maintenance: [
      { id: '1', machine: 'JSWMHR-TM-005', issue: 'Hydraulic Pipe Leakage', tech: 'Sunil Service', status: 'In Progress' },
      { id: '2', machine: 'JSWMHR-CR-002', issue: 'Engine Oil Replacement', tech: 'Self Workshop', status: 'Completed' },
    ],
    sos: [
      { id: '1', title: 'Medical Emergency', site: 'Pier 4', sender: 'Amarjit C.', status: 'Resolved', date: '05 Aug 10:15 AM' },
    ],
    broadcast: [
      { id: '1', title: 'Concrete Pouring Pier 4', target: 'All Transit Mixers', sender: 'Kalpesh Kale', date: '05 Aug 09:30 AM' },
    ],
  };

  // 3-Column Apps Grid
  const frequentlyUsed = reportTiles.slice(0, 2);
  const allApps = reportTiles;

  return (
    <View style={styles.container}>
      <ConstructionPattern />
      <SafeAreaView style={styles.safeArea}>
        {/* Header Bar */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Report</Text>
          <TouchableOpacity style={styles.searchIconBtn}>
            <Search size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* All Apps Section */}
          <Text style={styles.sectionHeading}>All Report</Text>
          <View style={styles.gridRow3Col}>
            {allApps.map((tile) => {
              const IconComp = tile.icon;
              return (
                <TouchableOpacity
                  key={`all_${tile.id}`}
                  style={styles.appSquareCard}
                  onPress={() => setSelectedReport(tile)}
                  activeOpacity={0.82}
                >
                  <View style={styles.appIconBox}>
                    <IconComp size={24} color="#0052CC" />
                  </View>
                  <Text style={styles.appCardTitle} numberOfLines={2}>{tile.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Detailed Report Modal */}
        <Modal
          visible={!!selectedReport}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedReport(null)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedReport(null)} style={styles.closeBtn}>
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedReport?.title}</Text>
              <TouchableOpacity style={styles.downloadBtn}>
                <Download size={18} color="#1D4ED8" />
              </TouchableOpacity>
            </View>

            {/* Filter Search Bar */}
            <View style={styles.filterBar}>
              <View style={styles.searchBox}>
                <Search size={16} color="#64748B" />
                <TextInput
                  placeholder="Search report entries..."
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            {/* Report Content FlatList */}
            <View style={styles.reportListContent}>
              <FlatList
                data={sampleReportData[selectedReport?.id] || []}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                renderItem={({ item }) => (
                  <View style={styles.reportItemCard}>
                    <Text style={styles.itemTitle}>{item.machine || item.name || item.title}</Text>
                    <Text style={styles.itemSub}>
                      {item.operator || item.role || item.qty || item.issue || item.target}
                    </Text>
                    <View style={styles.itemFooterRow}>
                      <Text style={styles.itemDate}>{item.date || item.time || item.hmr}</Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{item.status || 'Active'}</Text>
                      </View>
                    </View>
                  </View>
                )}
              />
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRightPlaceholder: {
    width: 24,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
    marginBottom: 8,
  },
  gridRow3Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  appSquareCard: {
    width: '30.5%',
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    gap: 6,
  },
  appIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  badgeRow: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  downloadBtn: {
    padding: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  reportListContent: {
    flex: 1,
  },
  reportItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemSub: {
    fontSize: 12,
    color: '#64748B',
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  itemDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#166534',
  },
});
