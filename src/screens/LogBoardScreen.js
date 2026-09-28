import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, SafeAreaView, Image, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { Search, Filter, Truck, Plus, RefreshCw, AlertCircle, X, Check } from 'lucide-react-native';
import { EquipmentLogCard } from '../components/EquipmentLogCard';
import { ConstructionPattern } from '../components/ConstructionPattern';
import { fetchLogsData, saveAddLog, endWorking, getAddLogAssetDetails, parseEventResultRow } from '../services/api';
import { showToast } from '../components/CustomToast';

export default function LogBoardScreen({ equipment: initialEquipment, user, onNavigate, onOpenSheet, refreshCounter }) {
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [isProjectFilterOpen, setIsProjectFilterOpen] = useState(false);

  const loadLiveLogsData = async (showFullLoader = true) => {
    if (showFullLoader) setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchLogsData({
        operatorId: 0,
        guid: 'c39a1963-f8da-4898-a4dd-2c46f5b8ffe7',
      });

      // Parse normalized array output
      const items = Array.isArray(data) ? data : [];

      const mapped = items.map((item, idx) => ({
        id: item.assetId || `EQ_${idx + 1}`,
        code: item.assetId || `EQ_${idx + 1}`,
        assetId: item.rawAssetId || item.assetID || item.assetId,
        rawAssetId: item.rawAssetId || item.assetID || item.assetId,
        numericAssetId: item.numericAssetId || item.rawAssetId || item.assetID || item.assetId,
        assetID: item.assetID || item.AssetID || item.rawAssetId || item.assetId,
        AssetID: item.AssetID || item.assetID || item.rawAssetId || item.assetId,
        assetName: item.assetName || item.assetId || '',
        assetType: item.assetType || '',
        assetCategory: item.assetCategory || '',
        recordingUnit: item.recordingUnit || item.unit || 'HMR',
        label: item.assetType || item.assetCategory || item.assetName || 'Equipment',
        site: item.projectName || item.siteLabel || 'Site Location',
        projectName: item.projectName || item.siteLabel || 'Site Location',
        status: item.currentStatus || 'Idle',
        hmr: item.readingHmr !== undefined && item.readingHmr !== null && String(item.readingHmr).trim() !== '' ? item.readingHmr : undefined,
        kmr: item.readingKmr !== undefined && item.readingKmr !== null && String(item.readingKmr).trim() !== '' ? item.readingKmr : undefined,
        reading: item.reading !== undefined && item.reading !== null && String(item.reading).trim() !== '' ? item.reading : 0,
        unit: item.recordingUnit || 'HMR',
        since: item.readingSince || 'Today',
        operator: item.operatorName || 'Assigned Operator',
        operatorName: item.operatorName || 'Assigned Operator',
        hired: (item.ownershipType || '').toLowerCase() !== 'owned',
        ownership: item.ownershipType || 'Owned',
        showAddLogBtn: item.showAddLogBtn,
        showEndLogBtn: item.showEndLogBtn,
        openLogID: item.openLogID,
        openWorkingLogID: item.openWorkingLogID,
      }));
      setEquipmentList(mapped);
    } catch (err) {
      console.warn('LogBoardScreen fetch error:', err);
      setErrorMsg(err.message || 'Failed to load live equipment logs.');
      setEquipmentList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLiveLogsData(true);
  }, []);

  useEffect(() => {
    if (refreshCounter > 0) {
      loadLiveLogsData(false);
    }
  }, [refreshCounter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLiveLogsData(false);
  };

  const uniqueProjects = Array.from(
    new Set((equipmentList || []).map((item) => item.site).filter(Boolean))
  );

  const filteredEquipment = (equipmentList || []).filter((item) => {
    const matchesSearch =
      (item.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.label || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.site || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const matchesProject =
      selectedProject === 'all' ||
      (item.site || '').toLowerCase() === selectedProject.toLowerCase();

    if (!matchesProject) return false;

    const status = (item.status || '').toLowerCase();
    if (selectedFilter === 'working') return status === 'working';
    if (selectedFilter === 'idle') return status === 'idle';
    if (selectedFilter === 'breakdown') return status === 'breakdown';
    if (selectedFilter === 'maintenance') return status === 'under maintenance' || status === 'maintenance';

    return true;
  });

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'working', label: 'Working' },
    { key: 'idle', label: 'Idle' },
    { key: 'breakdown', label: 'Breakdown' },
    { key: 'maintenance', label: 'Maintenance' },
  ];

  return (
    <View style={styles.container}>
      <ConstructionPattern />
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Daily Log Entry</Text>
          <TouchableOpacity style={styles.refreshHeaderBtn} onPress={() => loadLiveLogsData(true)}>
            <RefreshCw size={18} color="#0052CC" />
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#DC2626" />
            <Text style={styles.errorBannerText} numberOfLines={2}>
              {errorMsg}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadLiveLogsData(true)}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Search & Filter Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search code, type, site..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.projectFilterIconBtn,
                selectedProject !== 'all' && styles.projectFilterIconBtnActive,
              ]}
              onPress={() => setIsProjectFilterOpen(true)}
            >
              <Filter size={18} color={selectedProject !== 'all' ? '#0052CC' : '#64748B'} />
              {selectedProject !== 'all' && <View style={styles.filterDot} />}
            </TouchableOpacity>
          </View>

          {selectedProject !== 'all' && (
            <View style={styles.activeProjectBadgeRow}>
              <Text style={styles.activeProjectBadgeText}>Project: {selectedProject}</Text>
              <TouchableOpacity onPress={() => setSelectedProject('all')}>
                <X size={14} color="#0052CC" />
              </TouchableOpacity>
            </View>
          )}

          {/* Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {filterOptions.map((opt) => {
              const active = selectedFilter === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setSelectedFilter(opt.key)}
                >
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Equipment Cards List */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0052CC']} />}
        >
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#0052CC" />
              <Text style={styles.loadingText}>Please wait...</Text>
            </View>
          ) : filteredEquipment.length > 0 ? (
            filteredEquipment.map((machine) => (
              <EquipmentLogCard
                key={machine.id}
                machine={machine}
                onAction={async (act, m) => {
                  if (act === 'start_silent') {
                    try {
                      setLoading(true);
                      const numericId = parseInt(String(m.id).replace(/[^0-9]/g, ''), 10) || 0;
                      
                      // 1. Fetch live details (StartReading, DefaultOperatorID)
                      const detailsRes = await getAddLogAssetDetails(numericId);
                      const data = Array.isArray(detailsRes) ? detailsRes[0] : (detailsRes?.rows && Array.isArray(detailsRes.rows) ? detailsRes.rows[0] : detailsRes);
                      
                      let mappedDetails = {};
                      if (Array.isArray(detailsRes?.columns) && Array.isArray(detailsRes?.rows?.[0])) {
                        detailsRes.columns.forEach((col, idx) => {
                          mappedDetails[col] = detailsRes.rows[0][idx];
                        });
                      } else if (data) {
                        mappedDetails = data;
                      }

                      const operatorId = mappedDetails.DefaultOperatorID || 0;
                      const startReadingVal = mappedDetails.StartReading ?? 0;

                      const now = new Date();
                      const pad = (n) => String(n).padStart(2, '0');
                      const startDateTime = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`;

                      // 2. Start Log Silently
                      const res = await saveAddLog({
                        assetId: numericId,
                        startDateTime,
                        startHmr: startReadingVal,
                        startKmr: startReadingVal,
                        machineStatus: 'Working',
                        operatorId,
                        remarks: 'Started silently via app',
                      });

                      const parsed = parseEventResultRow(res);
                      const responseStatus = String(parsed?.Status ?? parsed?.status ?? 'Success').toLowerCase();
                      const responseMsg = parsed?.Reasons ?? parsed?.reasons ?? parsed?.Msg ?? parsed?.MsgData ?? parsed?.msg ?? 'Working log started successfully.';

                      if (responseStatus === 'error' || responseStatus === 'fail') {
                        showToast(responseMsg, 'error');
                      } else {
                        showToast(responseMsg, 'success');
                        // Reload live logs
                        await loadLiveLogsData(false);
                      }
                    } catch (err) {
                      console.error('Failed to start log silently:', err);
                      showToast('Failed to start log: ' + (err.message || String(err)), 'error');
                    } finally {
                      setLoading(false);
                    }
                  } else if (act === 'stop') {
                    try {
                      setLoading(true);
                      const numericId = parseInt(String(m.id).replace(/[^0-9]/g, ''), 10) || 0;
                      const openLogId = m.openLogID || m.openLogId || m.openWorkingLogID || m.openWorkingLogId || m.WorkingLogID || m.workingLogID || null;

                      if (!openLogId) {
                        showToast('Active log ID not found to end the work. Please try refreshing or using the drawer sheet.', 'error');
                        return;
                      }

                      const now = new Date();
                      const pad = (n) => String(n).padStart(2, '0');
                      const endDateTime = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`;

                      // End log
                      const res = await endWorking({
                        logId: openLogId,
                        endDateTime,
                        endHmr: m.hmr,
                        endKmr: m.kmr,
                        endReadingPhoto: 'meter_reading.jpg',
                        remarks: 'Stopped via inline card button',
                      });

                      const parsed = parseEventResultRow(res);
                      const responseStatus = String(parsed?.Status ?? parsed?.status ?? 'Success').toLowerCase();
                      const responseMsg = parsed?.Reasons ?? parsed?.reasons ?? parsed?.Msg ?? parsed?.MsgData ?? parsed?.msg ?? 'Daily working log submitted successfully.';

                      if (responseStatus === 'error' || responseStatus === 'fail') {
                        showToast(responseMsg, 'error');
                      } else {
                        showToast(responseMsg, 'success');
                        // Reload live logs
                        await loadLiveLogsData(false);
                      }
                    } catch (err) {
                      console.error('Failed to stop log:', err);
                      showToast('Failed to stop log: ' + (err.message || String(err)), 'error');
                    } finally {
                      setLoading(false);
                    }
                  } else {
                    if (onOpenSheet) {
                      if (act === 'log' || act === 'start' || act === 'stop') onOpenSheet('dailylog', m);
                      else if (act === 'fuel') onOpenSheet('fuel', m);
                      else if (act === 'maintenance' || act === 'end_maintenance') onOpenSheet('maintenance', m);
                      else if (act === 'breakdown' || act === 'end_breakdown') onOpenSheet('breakdown', m);
                    }
                  }
                }}
                onInfo={(m) => onOpenSheet && onOpenSheet('info', m)}
                userRole={user?.role}
              />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Image
                source={require('../assets/pnm_empty_tasks.png')}
                style={styles.emptyIllustImg}
                resizeMode="contain"
              />
              <Text style={styles.emptyTitle}>No matching logs found</Text>
              <Text style={styles.emptySub}>Try searching with another keyword or changing your filter.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Project Filter Modal */}
      <Modal visible={isProjectFilterOpen} transparent animationType="fade" onRequestClose={() => setIsProjectFilterOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsProjectFilterOpen(false)}>
          <View style={styles.projectModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.projectModalHeader}>
              <Text style={styles.projectModalTitle}>Filter by Project</Text>
              <TouchableOpacity onPress={() => setIsProjectFilterOpen(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.projectOptionRow, selectedProject === 'all' && styles.projectOptionRowActive]}
                onPress={() => {
                  setSelectedProject('all');
                  setIsProjectFilterOpen(false);
                }}
              >
                <Text style={[styles.projectOptionText, selectedProject === 'all' && styles.projectOptionTextActive]}>
                  All Projects
                </Text>
                {selectedProject === 'all' && <Check size={16} color="#0052CC" />}
              </TouchableOpacity>
              {uniqueProjects.map((proj) => {
                const active = selectedProject.toLowerCase() === proj.toLowerCase();
                return (
                  <TouchableOpacity
                    key={proj}
                    style={[styles.projectOptionRow, active && styles.projectOptionRowActive]}
                    onPress={() => {
                      setSelectedProject(proj);
                      setIsProjectFilterOpen(false);
                    }}
                  >
                    <Text style={[styles.projectOptionText, active && styles.projectOptionTextActive]}>
                      {proj}
                    </Text>
                    {active && <Check size={16} color="#0052CC" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  refreshHeaderBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '500',
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  segmentedTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  segmentTabActive: {
    borderBottomColor: '#0052CC',
  },
  segmentTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginTop: 1,
  },
  addLogHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addLogHeaderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  searchSection: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  projectFilterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  projectFilterIconBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0052CC',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0052CC',
  },
  activeProjectBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 10,
    gap: 6,
  },
  activeProjectBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0052CC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  projectModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  projectModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  projectModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  projectOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  projectOptionRowActive: {
    backgroundColor: '#F0F7FF',
  },
  projectOptionText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },
  projectOptionTextActive: {
    color: '#0052CC',
    fontWeight: '800',
  },
  filterScroll: {
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 6,
  },
  emptyIllustImg: {
    width: 150,
    height: 150,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
