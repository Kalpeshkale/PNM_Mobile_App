import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Search,
  X,
  Calendar,
  Layers,
  Settings,
  UserCheck
} from 'lucide-react-native';
import { T } from '../theme/tokens';
import {
  fetchLogsData,
  getAssetOperators,
  saveAddLogBulk,
  getBulkLogDetails,
  parseEventResultRow,
  resolveNumericAssetId
} from '../services/api';

// Reusable SelectModal for clean custom picker dropdowns
function SelectModal({ visible, title, options, onSelect, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  if (!visible) return null;

  const filtered = options.filter(opt =>
    String(opt.label || opt).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {options.length > 8 && (
            <View style={styles.modalSearchWrapper}>
              <Search size={16} color="#94A3B8" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          )}

          <ScrollView style={styles.modalOptionsList} contentContainerStyle={{ paddingBottom: 20 }}>
            {filtered.map((opt, idx) => {
              const val = opt.value !== undefined ? opt.value : opt;
              const lbl = opt.label !== undefined ? opt.label : opt;
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.modalOptionItem}
                  onPress={() => {
                    onSelect(val);
                    onClose();
                  }}
                >
                  <Text style={styles.modalOptionText}>{lbl}</Text>
                </TouchableOpacity>
              );
            })}
            {filtered.length === 0 && (
              <Text style={styles.modalNoResults}>No matches found</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function BulkLogScreen({ equipment, onBack }) {
  const [selectionMode, setSelectionMode] = useState('singleDate'); // 'singleDate' or 'singleMachine'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedMachineName, setSelectedMachineName] = useState('Select Machine');
  const [selectedSiteName, setSelectedSiteName] = useState('Loading site...');
  
  const [rows, setRows] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Custom selection configurations
  const [selectConfig, setSelectConfig] = useState({
    visible: false,
    title: '',
    options: [],
    onSelect: () => {},
  });

  // Calculate dynamically HMR / KMR column visibility based% on rows in sheet
  const { showHmr, showKmr } = useMemo(() => {
    let hasHmr = false;
    let hasKmr = false;
    rows.forEach((row) => {
      if (row.assetId) {
        const unit = String(row.recordingUnit || '').toUpperCase();
        if (unit.includes('HMR') || unit.includes('BOTH') || unit.includes('KMR/HMR')) {
          hasHmr = true;
        }
        if (unit.includes('KMR') || unit.includes('BOTH') || unit.includes('KMR/HMR')) {
          hasKmr = true;
        }
      }
    });
    return { showHmr: hasHmr, showKmr: hasKmr };
  }, [rows]);

  // Load initial allocated assets
  const loadSiteAssets = async () => {
    setLoading(true);
    try {
      const liveData = await fetchLogsData({ operatorId: 0 });
      setAllAssets(liveData);

      if (liveData.length > 0) {
        setSelectedSiteName(liveData[0].projectName || liveData[0].siteLabel || 'Allocated Site');
      }

      // Default load: populate rows in singleDate mode
      initializeSingleDateGrid(liveData);

    } catch (err) {
      console.error('[BULK LOG] site load failed:', err);
      Alert.alert('Error', 'Failed to load site assets details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSiteAssets();
  }, []);

  // Initialize sheet rows for Single Date Mode
  const initializeSingleDateGrid = (assetsList) => {
    const list = assetsList || allAssets;
    const initialRows = list.map((asset, index) => {
      const startReading = String(asset.readingHmr ?? asset.readingKmr ?? asset.reading ?? '0');
      const unit = String(asset.recordingUnit || '').toUpperCase().includes('KM') ? 'KMR' : 'HMR';

      return {
        id: `row-${Date.now()}-${index}`,
        assetId: String(asset.rawAssetId || asset.assetId || ''),
        assetName: asset.assetName,
        recordingUnit: unit,
        opId: '',
        opName: asset.operatorName || 'Choose Operator',
        startDate: selectedDate,
        startHour: '08',
        startMinute: '00',
        endDate: selectedDate,
        endHour: '20',
        endMinute: '00',
        lunchHour: '00',
        lunchMinute: '00',
        breakdownHour: '00',
        breakdownMinute: '00',
        startHmr: unit === 'HMR' ? startReading : '',
        endHmr: '',
        startKmr: unit === 'KMR' ? startReading : '',
        endKmr: '',
        productionQty: '',
        fuelIssued: '',
        remarks: '',
        machineStatus: 'Working',
        isVerified: false,
        logVerificationStatus: false,
        isExisting: false,
      };
    });

    setRows(initialRows);

    // Fetch operators list for rows
    initialRows.forEach(async (row) => {
      if (row.assetId) {
        try {
          const ops = await getAssetOperators(resolveNumericAssetId(row.assetId));
          if (ops && ops.length > 0) {
            const matched = ops.find(o => o.OperatorName === row.opName || o.UserName === row.opName);
            const defaultOp = matched || ops[0];
            setRows(current => current.map(r => r.id === row.id ? {
              ...r,
              opId: String(defaultOp.UserId || defaultOp.userId || ''),
              opName: defaultOp.OperatorName || defaultOp.UserName
            } : r));
          }
        } catch (err) {
          console.warn('Operator fetch fail:', row.assetId, err);
        }
      }
    });
  };

  // Initialize sheet rows for Single Machine Mode (queries historical logs & populates dates)
  const handleLoadSingleMachineGrid = async () => {
    if (!selectedMachineId) {
      Alert.alert('Alert', 'Please select a machine first.');
      return;
    }

    setLoading(true);
    try {
      const rawRes = await getBulkLogDetails(resolveNumericAssetId(selectedMachineId), selectedDate);
      const parsedRes = parseResultTable(rawRes);
      
      const machineObj = allAssets.find(a => String(a.rawAssetId || a.assetId) === String(selectedMachineId));
      const unit = machineObj ? (String(machineObj.recordingUnit || '').toUpperCase().includes('KM') ? 'KMR' : 'HMR') : 'HMR';
      const lastReading = machineObj ? String(machineO%bj.readingHmr ?? machineObj.readingKmr ?? machineObj.reading ?? '0') : '0';

      if (parsedRes && parsedRes.length > 0) {
        // Map database log rows to UI spreadsheet rows
        const loaded = parsedRes.map((log, index) => {
          const startDTStr = log.StartDateTime ? log.StartDateTime.split(' ')[1] || '08:00' : '08:00';
          const endDTStr = log.EndDateTime ? log.EndDateTime.split(' ')[1] || '20:00' : '20:00';

          const startH = startDTStr.split(':')[0] || '08';
          const startM = startDTStr.split(':')[1] || '00';
          const endH = endDTStr.split(':')[0] || '20';
          const endM = endDTStr.split(':')[1] || '00';

          return {
            id: `db-${log.LogID}`,
            logId: log.LogID,
            assetId: String(log.AssetID),
            assetName: log.AssetName || selectedMachineName,
            recordingUnit: unit,
            opId: String(log.OperatorID),
            opName: log.OperatorName || 'Selected Operator',
            startDate: log.LogDate ? log.LogDate.split('T')[0] : selectedDate,
            startHour: startH,
            startMinute: startM,
            endDate: log.EndDateTime ? log.EndDateTime.split('T')[0] : selectedDate,
            endHour: endH,
            endMinute: endM,
            lunchHour: '00',
            lunchMinute: '00',
            breakdownHour: '00',
            breakdownMinute: '00',
            startHmr: String(log.StartHMR ?? ''),
            endHmr: String(log.EndHMR ?? ''),
            startKmr: String(log.StartKMR ?? ''),
            endKmr: String(log.EndKMR ?? ''),
            productionQty: String(log.ProductionQty ?? ''),
            fuelIssued: String(log.FuelQty ?? ''),
            remarks: log.Remarks || '',
            machineStatus: log.MachineStatus || 'Working',
            isVerified: false,
            logVerificationStatus: false,
            isExisting: true,
          };
        });
        setRows(loaded);
      } else {
        // No logs found, create one starting row
        setRows([{
          id: `row-${Date.now()}-0`,
          assetId: selectedMachineId,
          assetName: selectedMachineName,
          recordingUnit: unit,
          opId: '',
          opName: 'Choose Operator',
          startDate: selectedDate,
          startHour: '08',
          startMinute: '00',
          endDate: selectedDate,
          endHour: '20',
          endMinute: '00',
          lunchHour: '00',
          lunchMinute: '00',
          breakdownHour: '00',
          breakdownMinute: '00',
          startHmr: unit === 'HMR' ? lastReading : '',
          endHmr: '',
          startKmr: unit === 'KMR' ? lastReading : '',
          endKmr: '',
          productionQty: '',
          fuelIssued: '',
          remarks: '',
          machineStatus: 'Working',
          isVerified: false,
          logVerificationStatus: false,
          isExisting: false,
        }]);

        // Autoload operator
        const ops = await getAssetOperators(resolveNumericAssetId(selectedMachineId));
        if (ops && ops.length > 0) {
          setRows(current => current.map(r => ({
            ...r,
            opId: String(ops[0].UserId || ops[0].userId || ''),
            opName: ops[0].OperatorName || ops[0].UserName
          })));
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to query machine bulk logs.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to handle row cells updates
  const updateRow = (rowId, field, value) => {
    setRows(prev => {
      const updated = prev.map(r => {
        if (r.id !== rowId) return r;
        const newRow = { ...r, [field]: value };

        // If asset ID changes in Single Date Mode, reload unit and default operator
        if (field === 'assetId') {
          const assetObj = allAssets.find(a => String(a.rawAssetId || a.assetId) === String(value));
          if (assetObj) {
            const unit = String(assetObj.recordingUnit || '').toUpperCase().includes('KM') ? 'KMR' : 'HMR';
            const startReading = String(%assetObj.readingHmr ?? assetObj.readingKmr ?? assetObj.reading ?? '0');
            newRow.assetName = assetObj.assetName;
            newRow.recordingUnit = unit;
            newRow.startHmr = unit === 'HMR' ? startReading : '';
            newRow.startKmr = unit === 'KMR' ? startReading : '';

            getAssetOperators(resolveNumericAssetId(value)).then(ops => {
              if (ops && ops.length > 0) {
                setRows(current => current.map(row => row.id === rowId ? {
                  ...row,
                  opId: String(ops[0].UserId || ops[0].userId || ''),
                  opName: ops[0].OperatorName || ops[0].UserName
                } : row));
              }
            }).catch(console.warn);
          }
        }
        return newRow;
      });

      // Chain logic: if close reading changes, update the start reading of the next row with the same machine
      return updated.map((row, idx) => {
        if (idx === 0) return row;
        const prevRow = updated[idx - 1];
        if (prevRow.assetId === row.assetId) {
          return {
            ...row,
            startHmr: prevRow.recordingUnit === 'HMR' && prevRow.endHmr ? prevRow.endHmr : row.startHmr,
            startKmr: prevRow.recordingUnit === 'KMR' && prevRow.endKmr ? prevRow.endKmr : row.startKmr,
          };
        }
        return row;
      });
    });
  };

  // Add row manually
  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    
    // Auto-resolve asset ID to prefill
    const prevAssetId = selectionMode === 'singleMachine' ? selectedMachineId : (lastRow ? lastRow.assetId : '');
    const prevAssetName = selectionMode === 'singleMachine' ? selectedMachineName : (lastRow ? lastRow.assetName : 'Choose Machine');
    const unit = lastRow ? lastRow.recordingUnit : 'HMR';
    
    let nextDate = selectedDate;
    if (selectionMode === 'singleMachine') {
      const baseDateStr = lastRow ? lastRow.startDate : selectedDate;
      const parts = baseDateStr.split('-');
      const baseDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      baseDate.setDate(baseDate.getDate() + 1);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      baseDate.setHours(0, 0, 0, 0);

      if (baseDate > today) {
        Alert.alert('Validation Alert', 'Cannot add rows beyond the current date.');
        return;
      }

      const yyyy = baseDate.getFullYear();
      const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
      const dd = String(baseDate.getDate()).padStart(2, '0');
      nextDate = `${yyyy}-${mm}-${dd}`;
    }

    const prevHmr = lastRow ? lastRow.endHmr : '';
    const prevKmr = lastRow ? lastRow.endKmr : '';
    const prevOpId = lastRow ? lastRow.opId : '';
    const prevOpName = lastRow ? lastRow.opName : 'Choose Operator';

    const newRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assetId: prevAssetId,
      assetName: prevAssetName,
      recordingUnit: unit,
      opId: prevOpId,
      opName: prevOpName,
      startDate: nextDate,
      startHour: lastRow ? lastRow.startHour : '08',
      startMinute: lastRow ? lastRow.startMinute : '00',
      endDate: nextDate,
      endHour: lastRow ? lastRow.endHour : '20',
      endMinute: lastRow ? lastRow.endMinute : '00',
      lunchHour: lastRow ? lastRow.lunchHour : '00',
      lunchMinute: lastRow ? lastRow.lunchMinute : '00',
      breakdownHour: lastRow ? lastRow.breakdownHour : '00',
      breakdownMinute: lastRow ? lastRow.breakdownMinute : '00',
      startHmr: prevHmr,
      endHmr: '',
      startKmr: prevKmr,
      endKmr: '',
      productionQty: '',
      fuelIssued: '',
      remarks: '',
      machineStatus: 'Working',
      isVerified: false,
      logVerificationStatus: false,
      isExisting: false,
    };

    setRows(prev => [...prev, newRow]);
  };

  const handleRemoveRow = (rowId) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
  };


  // Grid validations
  const validateBulkGrid = () => {
    if (rows.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one row.');
      return false;
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rNum = i + 1;
      if (!row.assetId) {
        Alert.alert('Validation Error', `Row ${rNum}: Machine is required.`);
        return false;
      }
      if (!row.opId) {
        Alert.alert('Validation Error', `Row ${rNum}: Operator is required.`);
        return false;
      }
      const isHmr = row.recordingUnit === 'HMR';
      const isBoth = row.recordingUnit === 'KMR/HMR' || row.recordingUnit === 'BOTH';
      const isKmr = row.recordingUnit === 'KMR';

      const startHmrVal = parseFloat(row.startHmr) || 0;
      const endHmrVal = parseFloat(row.endHmr) || 0;
      const startKmrVal = parseFloat(row.startKmr) || 0;
      const endKmrVal = parseFloat(row.endKmr) || 0;

      if (row.machineStatus === 'Working') {
        if (isHmr || isBoth) {
          if (Number.isNaN(endHmrVal) || endHmrVal <= 0) {
            Alert.alert('Validation Error', `Row ${rNum}: End HMR reading is required.`);
            return false;
          }
          if (endHmrVal < startHmrVal) {
            Alert.alert('Validation Error', `Row ${rNum}: End HMR (${endHmrVal}) cannot be less than Start HMR (${startHmrVal}).`);
            return false;
          }
        }
        if (isKmr || isBoth) {
          if (Number.isNaN(endKmrVal) || endKmrVal <= 0) {
            Alert.alert('Validation Error', `Row ${rNum}: End KMR reading is required.`);
            return false;
          }
          if (endKmrVal < startKmrVal) {
            Alert.alert('Validation Error', `Row ${rNum}: End KMR (${endKmrVal}) cannot be less than Start KMR (${startKmrVal}).`);
            return false;
          }
        }
      }
    }
    return true;
  };

  // Submit bulk payload in a single network request
  const handleSubmitLogsBulk = async () => {
    if (!validateBulkGrid()) return;

    setSubmitting(true);
    try {
      const res = await saveAddLogBulk(rows);
      const parsed = parseEventResultRow(res);
      const status = String(parsed?.Status ?? parsed?.status ?? '').toLowerCase();

      if (status === 'success') {
        Alert.alert('Success', parsed?.Msg || 'Bulk log entries saved successfully!', [
          { text: 'OK', onPress: onBack }
        ]);
      } else {
        throw new Error(parsed?.Reasons ?? parsed?.reasons ?? 'Submission failed.');
      }
    } catch (err) {
      console.error('[BULK LOG] Submit error:', err);
      Alert.alert('Submission Error', err.message || 'Failed to submit bulk sheet logs.');
    } finally {
      setSubmitting(false);
    }
  };

  // Date selection Modal
  const handleSelectRowDate = (rowId) => {
    setDateTarget(rowId);
    setIsDatePickerVisible(true);
  };

  // Picker selection triggers
  const handleTapMachine = (rowId) => {
    setSelectConfig({
      visible: true,
      title: 'Select Machine',
      options: allAssets.map(a => ({
        label: `${a.assetName} (${a.registrationNo || '-'})`,
        value: String(a.rawAssetId || a.assetId),
      })),
      onSelect: (val) => updateRow(rowId, 'assetId', val),
    });
  };

  const handleTapOperator = async (rowId, assetId) => {
    if (!assetId) {
      Alert.alert('Alert', 'Please select a machine first.');
      return;
    }
    try {
      const ops = await getAssetOperators(resolveNumericAssetId(assetId));
      if (ops && ops.length > 0) {
        setSelectConfig({
          visible: true,
          title: 'Select Operator',
          options: ops.map(o => ({
            label: o.OperatorName || o.UserName,
            value: String(o.UserId || o.userId),
          })),
          onSelect: (val) => {
            const chosen = ops.find(o => String(o.UserId || o.userId) === val);
            setRows(current => current.map(r => r.id === rowId ? {
              ...r,
              opId: String(val),
              opName: chosen ? (chosen.OperatorName || chosen.UserName) : 'Choose Operator'
            } : r));
          }
        });
      } else {
        Alert.alert('Alert', 'No operators found for this machine.');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleTapHour = (rowId, field) => {
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    setSelectConfig({
      visible: true,
      title: 'Select Hour',
      options: hours.map(h => ({ label: h, value: h })),
      onSelect: (val) => updateRow(rowId, field, val),
    });
  };

  const handleTapMinute = (rowId, field) => {
    setSelectConfig({
      visible: true,
      title: 'Select Minute',
      options: ['00', '15', '30', '45'].map(m => ({ label: m, value: m })),
      onSelect: (val) => updateRow(rowId, field, val),
    });
  };

  // Render components
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0052CC" />
        <Text style={styles.loadingText}>Fetching Bulk Entry Metadata...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Premium Header area */}
      <View style={styles.headerArea}>
        <SafeAreaView>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <ChevronLeft size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Bulk Log Entry Sheet</Text>
              <Text style={styles.headerSub}>{selectedSiteName}</Text>
            </View>
          </View>

          {/* Row 1: Tab buttons + Date Picker side-by-side */}
          <View style={styles.topHeaderRow}>
            {/* Toggle Selection mode tabs */}
            <View style={[styles.selectionModeTabs, { flex: 1.8, marginHorizontal: 0, marginVertical: 0 }]}>
              <TouchableOpacity 
                style={[styles.modeTabButton, selectionMode === 'singleDate' && styles.modeTabActive]}
                onPress={() => {
                  setSelectionMode('singleDate');
                  initializeSingleDateGrid();
                }}
              >
                <Calendar size={15} color={selectionMode === 'singleDate' ? '#0052CC' : '#94A3B8'} style={{ marginRight: 6 }} />
                <Text style={[styles.modeTabText, selectionMode === 'singleDate' && styles.modeTabTextActive]}>Single Date</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modeTabButton, selectionMode === 'singleMachine' && styles.modeTabActive]}
                onPress={() => {
                  setSelectionMode('singleMachine');
                  setRows([]);
                }}
              >
                <Layers size={15} color={selectionMode === 'singleMachine' ? '#0052CC' : '#94A3B8'} style={{ marginRight: 6 }} />
                <Text style={[styles.modeTabText, selectionMode === 'singleMachine' && styles.modeTabTextActive]}>Single Machine</Text>
              </TouchableOpacity>
            </View>

            {/* Date selection button in same row */}
            <TouchableOpacity 
              style={[styles.filterDropdownButton, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => {
                setDateTarget('filter');
                setIsDatePickerVisible(true);
              }}
            >
              <Text style={styles.filterDropdownText}>{selectedDate}</Text>
              <Calendar size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>

          {/* Row 2: Shown only in Single Machine mode */}
          {selectionMode === 'singleMachine' && (
            <View style={styles.filterToolbar}>
              <View style={styles.singleMachineFilters}>
                {/* Select single machine at top */}
                <TouchableOpacity 
                  style={[styles.filterDropdownButton, { flex: 1.8 }]}
                  onPress={() => {
                    setSelectConfig({
                      visible: true,
                      title: 'Select Target Machine',
                      options: allAssets.map(a => ({
                        label: `${a.assetName} (\a.registrationNo || '-')`,
                        value: String(a.rawAssetId || a.assetId),
                      })),
                      onSelect: (val) => {
                        const chosen = allAssets.find(a => String(a.rawAssetId || a.assetId) === String(val));
                        setSelectedMachineId(String(val));
                        setSelectedMachineName(chosen ? chosen.assetName : 'Select Machine');
                        setRows([]);
                        handleLoadSingleMachineGrid();
                      }
                    });
                  }}
                >
                  <Text style={styles.filterDropdownText}>{selectedMachineName}</Text>
                  <Calendar size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>

      {/* Dynamic Spreadsheet scroll table */}
      {rows.length > 0 ? (
        <ScrollView style={styles.gridContainer}>
          <ScrollView horizontal={true} contentContainerStyle={styles.horizontalScrollContent}>
            <View style={styles.tableWrapper}>
              {/* Table Header Row */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.headerCell, { width: 60, textAlign: 'center' }]}>ACTION</Text>
                
                {selectionMode === 'singleDate' ? (
                  <Text style={[styles.headerCell, { width: 160 }]}>MACHINE</Text>
                ) : (
                  <Text style={[styles.headerCell, { width: 120 }]}>DATE</Text>
                )}

                <Text style={[styles.headerCell, { width: 140 }]}>OPERATOR *</Text>
                <Text style={[styles.headerCell, { width: 110 }]}>START TIME</Text>
                <Text style={[styles.headerCell, { width: 110 }]}>CLOSE TIME</Text>
                <Text style={[styles.headerCell, { width: 80, textAlign: 'center' }]}>LUNCH HRS</Text>
                <Text style={[styles.headerCell, { width: 80, textAlign: 'center' }]}>BRKDOWN HRS</Text>
                
                {showKmr && (
                  <Text style={[styles.headerCell, { width: 160, textAlign: 'center' }]}>KMR Readings (Start - Close)</Text>
                )}
                {showHmr && (
                  <Text style={[styles.headerCell, { width: 160, textAlign: 'center' }]}>HMR Readings (Start - Close)</Text>
                )}

                <Text style={[styles.headerCell, { width: 85 }]}>Trans Qty</Text>
                <Text style={[styles.headerCell, { width: 85 }]}>Fuel (L)</Text>
                <Text style={[styles.headerCell, { width: 65, textAlign: 'center' }]}>STATUS</Text>
                <Text style={[styles.headerCell, { width: 130 }]}>REMARKS</Text>
              </View>

              {/* Table Body Rows */}
              {rows.map((row) => {
                const isHmr = row.recordingUnit === 'HMR';
                const isBoth = row.recordingUnit === 'KMR/HMR' || row.recordingUnit === 'BOTH';
                const showReadings = row.machineStatus === 'Working';

                return (
                  <View key={row.id} style={styles.tableBodyRow}>
                    {/* Action Delete */}
                    <TouchableOpacity
                      style={[styles.bodyCell, { width: 60, alignItems: 'center', justifyContent: 'center' }]}
                      onPress={() => handleRemoveRow(row.id)}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>

                    {/* Machine dropdown OR Date picker based on Selection Mode */}
                    {selectionMode === 'singleDate' ? (
                      <TouchableOpacity
                        style={[styles.bodyCell, { width: 160, justifyContent: 'center' }]}
                        onPress={() => handleTapMachine(row.id)}
                      >
                        <Text style={styles.cellSelectText} numberOfLines={1}>
                          {row.assetName || 'Select Machine'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.bodyCell, { width: 120, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }]}
                        onPress={() => handleSelectRowDate(row.id)}
                      >
                        <Text style={styles.cellSelectText}>
                          {formatToDDMMYYYY(row.startDate)}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Operator Dropdown */}
                    <TouchableOpacity
                      style={[styles.bodyCell, { width: 140, justifyContent: 'center' }]}
                      onPress={() => handleTapOperator(row.id, row.assetId)}
                    >
                      <Text style={styles.cellSelectText} numberOfLines={1}>
                        {row.opName || 'Select operator'}
                      </Text>
                    </TouchableOpacity>

                    {/* Start Time Selector */}
                    <View style={[styles.bodyCell, { width: 110, flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
                      <TouchableOpacity onPress={() => handleTapHour(row.id, 'startHour')} style={styles.timeDropdown}>
                        <Text style={styles.timeDropdownText}>{row.startHour}</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeDivider}>:</Text>
                      <TouchableOpacity onPress={() => handleTapMinute(row.id, 'startMinute')} style={styles.timeDropdown}>
                        <Text style={styles.timeDropdownText}>{row.startMinute}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Close Time Selector */}
                    <View style={[styles.bodyCell, { width: 110, flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
                      <TouchableOpacity onPress={() => handleTapHour(row.id, 'endHour')} style={styles.timeDropdown}>
                        <Text style={styles.timeDropdownText}>{row.endHour}</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeDivider}>:</Text>
                      <TouchableOpacity onPress={() => handleTapMinute(row.id, 'endMinute')} style={styles.timeDropdown}>
                        <Text style={styles.timeDropdownText}>{row.endMinute}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Lunch hours */}
                    <View style={[styles.bodyCell, { width: 80, flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
                      <TouchableOpacity onPress={() => handleTapHour(row.id, 'lunchHour')} style={styles.timeDropdown}>
                        <Text style={styles.timeDropdownText}>{row.lunchHour}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Breakdown hours */}
                    <View style={[styles.bodyCell, { width: 80, flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
                      <TouchableOpacity onPress={() => handleTapHour(row.id, 'breakdownHour')} style={styles.timeDropdown}>
                        <Text style={styles.timeDropdownText}>{row.breakdownHour}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* KMR readings */}
                    {showKmr && (
                      <View style={[styles.bodyCell, { width: 160, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <TextInput
                          style={[styles.cellTextInput, { flex: 1 }]}
                          value={row.startKmr}
                          onChangeText={(val) => updateRow(row.id, 'startKmr', val)}
                          keyboardType="numeric"
                          placeholder="Start"
                        />
                        <TextInput
                          style={[styles.cellTextInput, { flex: 1 }]}
                          value={row.endKmr}
                          onChangeText={(val) => updateRow(row.id, 'endKmr', val)}
                          keyboardType="numeric"
                          placeholder="End"
                        />
                      </View>
                    )}

                    {/* HMR readings */}
                    {showHmr && (
                      <View style={[styles.bodyCell, { width: 160, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <TextInput
                          style={[styles.cellTextInput, { flex: 1 }]}
                          value={row.startHmr}
                          onChangeText={(val) => updateRow(row.id, 'startHmr', val)}
                          keyboardType="numeric"
                          placeholder="Start"
                        />
                        <TextInput
                          style={[styles.cellTextInput, { flex: 1 }]}
                          value={row.endHmr}
                          onChangeText={(val) => updateRow(row.id, 'endHmr', val)}
                          keyboardType="numeric"
                          placeholder="End"
                        />
                      </View>
                    )}

                    {/* Trans Qty */}
                    <View style={[styles.bodyCell, { width: 85 }]}>
                      <TextInput
                        style={styles.cellTextInput}
                        value={row.productionQty}
                        onChangeText={(val) => updateRow(row.id, 'productionQty', val)}
                        keyboardType="numeric"
                        placeholder="Qty"
                      />
                    </View>

                    {/* Fuel Issued */}
                    <View style={[styles.bodyCell, { width: 85 }]}>
                      <TextInput
                        style={styles.cellTextInput}
                        value={row.fuelIssued}
                        onChangeText={(val) => updateRow(row.id, 'fuelIssued', val)}
                        keyboardType="numeric"
                        placeholder="Ltr"
                      />
                    </View>

                    {/* Status Toggle */}
                    <TouchableOpacity
                      style={[styles.bodyCell, { width: 85, justifyContent: 'center' }]}
                      onPress={() => {
                        const nextStatus = row.machineStatus === 'Working' ? 'Breakdown' : (row.machineStatus === 'Breakdown' ? 'Maintenance' : 'Working');
                        updateRow(row.id, 'machineStatus', nextStatus);
                      }}
                    >
                      <Text style={[styles.cellSelectText, { textAlign: 'center' }]}>
                        {row.machineStatus}
                      </Text>
                    </TouchableOpacity>

                    {/* Remarks */}
                    <View style={[styles.bodyCell, { width: 130 }]}>
                      <TextInput
                        style={[styles.cellTextInput, { textAlign: 'left', paddingHorizontal: 8 }]}
                        value={row.remarks}
                        onChangeText={(val) => updateRow(row.id, 'remarks', val)}
                        placeholder="Remarks..."
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Layers size={48} color="#94A3B8" />
          <Text style={styles.emptyText}>No machinery rows loaded.</Text>
          <Text style={styles.emptySub}>Add a row using the button below or choose a machine in Single Machine Mode.</Text>
        </View>
      )}

      {/* Footer controls */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.addRowBtn} onPress={handleAddRow}>
          <Plus size={16} color="#0052CC" style={{ marginRight: 6 }} />
          <Text style={styles.addRowBtnText}>Add Row</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} 
          onPress={handleSubmitLogsBulk}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Sheet</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Select options dropdown Modal UI */}
      <SelectModal
        visible={selectConfig.visible}
        title={selectConfig.title}
        options={selectConfig.options}
        onSelect={selectConfig.onSelect}
        onClose={() => setSelectConfig(prev => ({ ...prev, visible: false }))}
      />

      {/* Date picker modal */}
      <CustomDateTimePicker
        visible={isDatePickerVisible}
        value={activePickerDate + ' 08:00'}
        onChange={(formatted) => {
          const dateOnly = formatted.split(' ')[0];
          if (dateTarget === 'filter') {
            setSelectedDate(dateOnly);
            if (selectionMode === 'singleMachine') {
              handleLoadSingleMachineGrid();
            }
          } else {
            updateRow(dateTarget, 'startDate', dateOnly);
            updateRow(dateTarget, 'endDate', dateOnly);
          }
          setIsDatePickerVisible(false);
        }}
        onClose={() => setIsDatePickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 8,
  },
  headerArea: {
    backgroundColor: '#011936',
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  selectionModeTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 3,
  },
  modeTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
  },
  modeTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modeTabTextActive: {
    color: '#0052CC',
  },
  filterDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  filterDropdownText: {
    fontSize: 12.5,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterToolbar: {
    paddingHorizontal: 16,
    marginTop: 6,
  },
  singleMachineFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  gridContainer: {
    flex: 1,
  },
  horizontalScrollContent: {
    padding: 16,
  },
  tableWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    paddingHorizontal: 6,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
    alignItems: 'center',
  },
  bodyCell: {
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  cellSelectText: {
    fontSize: 12.5,
    color: '#1E293B',
    fontWeight: '600',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  timeDropdown: {
    width: 40,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDropdownText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '700',
  },
  timeDivider: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  cellTextInput: {
    height: 34,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'center',
    padding: 0,
  },
  cellDisabledText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#0052CC',
    borderRadius: 10,
    backgroundColor: '#F0F5FF',
  },
  addRowBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0052CC',
  },
  submitBtn: {
    backgroundColor: '#0052CC',
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    margin: 12,
    paddingHorizontal: 12,
    height: 38,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    padding: 0,
  },
  modalOptionsList: {
    paddingHorizontal: 16,
  },
  modalOptionItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionText: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '600',
  },
  modalNoResults: {
    textAlign: 'center',
    color: '#94A3B8',
    paddingVertical: 20,
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#334155',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
