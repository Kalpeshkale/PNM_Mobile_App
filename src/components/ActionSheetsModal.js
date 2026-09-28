import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Modal, TouchableOpacity, TextInput, ScrollView, StyleSheet, Animated, Easing, TouchableWithoutFeedback, PanResponder, SafeAreaView, LayoutAnimation, Platform, UIManager, ActivityIndicator } from 'react-native';
import { X, Camera, Mic, Calendar, ChevronDown, Edit3, Trash2, Truck, Maximize2, Minimize2 } from 'lucide-react-native';
import { CustomDropdown } from './CustomDropdown';
import { CustomDateTimePicker } from './CustomDateTimePicker';
import { 
  fetchLogsData, 
  saveAddLog, 
  endWorking, 
  getAddLogAssetDetails, 
  getAssetQuickViewLogs,
  getFuelLogForm, 
  saveFuelLog, 
  startInterruption, 
  endUnderMaintenance, 
  endBreakdown,
  getEndLogDetails,
  getAssetFuelLogs,
  getAssetQuickViewHeader,
  resolvePhotoUrl,
  resolveNumericAssetId
} from '../services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function ActionSheetsModal({ activeSheet, machine, user, onClose, onSubmit }) {
  const [quickLogsList, setQuickLogsList] = useState([]);
  const [fuelLogsList, setFuelLogsList] = useState([]);
  const [quickHeader, setQuickHeader] = useState(null);
  const [photoViewerUrl, setPhotoViewerUrl] = useState(null);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const toggleFullScreen = (val) => {
    LayoutAnimation.configureNext({
      duration: 250,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.spring, springDamping: 0.82 },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setIsFullScreen(val);
  };

  // Form Field States
  const [operator, setOperator] = useState('Amarjit Chaudhary');
  const [startTime, setStartTime] = useState('');
  const [startReading, setStartReading] = useState('');
  const [startHmr, setStartHmr] = useState('0');
  const [startKmr, setStartKmr] = useState('0');
  const [endTime, setEndTime] = useState('');
  const [endReading, setEndReading] = useState('');
  const [endHmr, setEndHmr] = useState('');
  const [endKmr, setEndKmr] = useState('');
  const [workingRemarks, setWorkingRemarks] = useState('');
  const [validationError, setValidationError] = useState('');
  const [errors, setErrors] = useState({});
  const [sheetPhotoAttached, setSheetPhotoAttached] = useState(false);

  // Maintenance & Breakdown States
  const [maintStartTime, setMaintStartTime] = useState('');
  const [maintEndTime, setMaintEndTime] = useState('');
  const [maintReason, setMaintReason] = useState('');
  const [maintRemarks, setMaintRemarks] = useState('');

  const [bdCategory, setBdCategory] = useState('Hydraulics');
  const [bdStartTime, setBdStartTime] = useState('');
  const [bdEndTime, setBdEndTime] = useState('');
  const [bdReason, setBdReason] = useState('');
  const [bdRemarks, setBdRemarks] = useState('');

  // Fuel Drawer States
  const [fuelingDate, setFuelingDate] = useState('');
  const [fuelType, setFuelType] = useState('Diesel');
  const [fuelQty, setFuelQty] = useState('80.00');
  const [fuelReading, setFuelReading] = useState('');
  const [fuelRemarks, setFuelRemarks] = useState('');

  // Info Details Active Tab
  const [infoTab, setInfoTab] = useState('info');

  // Picker States
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerValue, setPickerValue] = useState('');
  const [pickerSetter, setPickerSetter] = useState(null);

  const openPicker = (val, setter) => {
    setPickerValue(val);
    setPickerSetter(() => setter);
    setPickerVisible(true);
  };

  const handlePickerConfirm = (formattedVal) => {
    if (pickerSetter) {
      pickerSetter(formattedVal);
    }
    setPickerVisible(false);
  };

  // Ultra-responsive Swipe Up/Down PanResponder with Smooth Animation
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => Math.abs(gestureState.dy) > 4,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        } else {
          slideAnim.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -15 || gestureState.vy < -0.2) {
          // SWIPE UP -> EXPAND TO FULL SCREEN SMOOTHLY
          toggleFullScreen(true);
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 70,
            friction: 8,
            useNativeDriver: true,
          }).start();
        } else if (gestureState.dy > 80 || gestureState.vy > 0.3) {
          if (isFullScreen) {
            toggleFullScreen(false);
            Animated.spring(slideAnim, {
              toValue: 0,
              tension: 70,
              friction: 8,
              useNativeDriver: true,
            }).start();
          } else {
            handleClose();
          }
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 70,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (activeSheet) {
      setIsFullScreen(false);
      slideAnim.setValue(600);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();

      if (machine) {
        setOperator(machine.operator || user?.name || 'Amarjit Chaudhary');
        const currentReading = String(machine.reading ?? machine.hmr ?? machine.kmr ?? '0');
        const currentHmr = String(machine.hmr ?? machine.startHmr ?? currentReading);
        const currentKmr = String(machine.kmr ?? machine.startKmr ?? currentReading);
        setStartReading(currentReading);
        setStartHmr(currentHmr);
        setStartKmr(currentKmr);
        setFuelReading(currentReading);

        const now = new Date();
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const pad = (n) => String(n).padStart(2, '0');
        const formattedNow = `${pad(now.getDate())}-${months[now.getMonth()]}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const formattedFuelDate = `${pad(now.getDate())}-${pad(now.getMonth()+1)}-${now.getFullYear()}`;

        const statusLower = String(machine.status || '').toLowerCase();
        const isCurrentlyMaint = statusLower === 'under maintenance' || statusLower === 'maintenance';
        const isCurrentlyBd = statusLower === 'breakdown';

        setStartTime(formattedNow);
        setMaintStartTime(formattedNow);
        setBdStartTime(formattedNow);
        setFuelingDate(formattedFuelDate);

        setEndTime('');
        setEndReading('');
        setEndHmr('');
        setEndKmr('');
        setMaintEndTime(isCurrentlyMaint ? formattedNow : '');
        setBdEndTime(isCurrentlyBd ? formattedNow : '');
        setMaintReason('');
        setMaintRemarks('');
        setBdReason('');
        setBdRemarks('');
        setWorkingRemarks('');
        setValidationError('');
        setErrors({});
        setSheetPhotoAttached(false);

        if (machine) {
          const numericId = resolveNumericAssetId(machine);
          if (numericId > 0) {
            setLoadingDetails(true);
            setQuickLogsList([]);
            setFuelLogsList([]);
            setQuickHeader(null);

            const openLogId = machine.openLogID || machine.openWorkingLogID;

            const addLogPromise = getAddLogAssetDetails(numericId).catch(() => null);
            const quickLogsPromise = getAssetQuickViewLogs(numericId).catch(() => []);
            const fuelLogsPromise = getAssetFuelLogs(numericId).catch(() => []);
            const headerPromise = getAssetQuickViewHeader(numericId).catch(() => null);
            const endLogPromise = (openLogId && (activeSheet === 'maintenance' || activeSheet === 'breakdown'))
              ? getEndLogDetails(openLogId).catch(() => null)
              : Promise.resolve(null);

            let mounted = true;

            Promise.all([addLogPromise, quickLogsPromise, fuelLogsPromise, headerPromise, endLogPromise])
              .then(([addLogRes, quickLogsRes, fuelLogsRes, headerRes, endLogRes]) => {
                if (!mounted) return;

                const data = Array.isArray(addLogRes) ? addLogRes[0] : (addLogRes?.rows && Array.isArray(addLogRes.rows) ? addLogRes.rows[0] : addLogRes);
                let mappedData = {};
                if (Array.isArray(addLogRes?.columns) && Array.isArray(addLogRes?.rows?.[0])) {
                  addLogRes.columns.forEach((col, idx) => {
                    mappedData[col] = addLogRes.rows[0][idx];
                  });
                } else if (data && typeof data === 'object') {
                  mappedData = data;
                }

                let endLogData = {};
                if (endLogRes) {
                  if (endLogRes.rows && Array.isArray(endLogRes.rows) && endLogRes.rows[0]) {
                    if (Array.isArray(endLogRes.columns)) {
                      endLogRes.columns.forEach((col, idx) => {
                        endLogData[col] = endLogRes.rows[0][idx];
                      });
                    } else if (typeof endLogRes.rows[0] === 'object') {
                      endLogData = endLogRes.rows[0];
                    }
                  } else if (Array.isArray(endLogRes) && endLogRes[0]) {
                    endLogData = endLogRes[0];
                  } else if (typeof endLogRes === 'object' && !Array.isArray(endLogRes)) {
                    endLogData = endLogRes;
                  }
                }

                // Work Logs (only daily/working/maintenance/breakdown - no fuel entries)
                const dailyLogs = (Array.isArray(quickLogsRes) ? quickLogsRes : []).sort((a, b) => {
                  const aStr = String(a.StartDateTime || a.LogDate || 0).replace(' ', 'T');
                  const bStr = String(b.StartDateTime || b.LogDate || 0).replace(' ', 'T');
                  const aDate = new Date(aStr);
                  const bDate = new Date(bStr);
                  return (isNaN(bDate.getTime()) ? 0 : bDate.getTime()) - (isNaN(aDate.getTime()) ? 0 : aDate.getTime());
                });
                const rawFuelLogs = (Array.isArray(fuelLogsRes) ? fuelLogsRes : []).sort((a, b) => {
                  const aStr = String(a.FuelDateTime || a.LogDate || 0).replace(' ', 'T');
                  const bStr = String(b.FuelDateTime || b.LogDate || 0).replace(' ', 'T');
                  const aDate = new Date(aStr);
                  const bDate = new Date(bStr);
                  return (isNaN(bDate.getTime()) ? 0 : bDate.getTime()) - (isNaN(aDate.getTime()) ? 0 : aDate.getTime());
                });

                setQuickLogsList(dailyLogs);
                setFuelLogsList(rawFuelLogs);

                // Quick Header
                if (headerRes) {
                  const headerObj = typeof headerRes === 'object' ? headerRes : normalizeDynamicLogsPayload(headerRes);
                  setQuickHeader(headerObj);
                }

                // Default readings
                let liveStart = mappedData.StartReading ?? mappedData.CurrentReading ?? mappedData.LastReading;
                let liveStartHmr = mappedData.StartHMR ?? mappedData.startHmr ?? liveStart;
                let liveStartKmr = mappedData.StartKMR ?? mappedData.startKmr ?? liveStart;

                if (activeSheet === 'dailylog') {
                  const latestLog = dailyLogs[0];
                  if (latestLog) {
                    const lastEndReading = latestLog.EndHMR ?? latestLog.EndKMR ?? latestLog.Reading ?? latestLog.EndReading ?? null;
                    if (lastEndReading !== null && lastEndReading !== undefined && lastEndReading !== '') {
                      liveStart = lastEndReading;
                    }
                    if (latestLog.EndHMR !== undefined && latestLog.EndHMR !== null && latestLog.EndHMR !== '') {
                      liveStartHmr = latestLog.EndHMR;
                    }
                    if (latestLog.EndKMR !== undefined && latestLog.EndKMR !== null && latestLog.EndKMR !== '') {
                      liveStartKmr = latestLog.EndKMR;
                    }
                  }
                }

                if (liveStart !== undefined && liveStart !== null) {
                  const startStr = String(liveStart);
                  setStartReading(startStr);
                  setFuelReading(startStr);
                }
                if (liveStartHmr !== undefined && liveStartHmr !== null) {
                  setStartHmr(String(liveStartHmr));
                }
                if (liveStartKmr !== undefined && liveStartKmr !== null) {
                  setStartKmr(String(liveStartKmr));
                }

                // Prefill Start Time from DB StartDateTime for Maintenance & Breakdown
                const dbStartTime = endLogData.StartDateTime || endLogData.startDateTime || mappedData.StartDateTime || mappedData.startDateTime || mappedData.ReadingSince;
                if (dbStartTime) {
                  const formatToPickerDateTime = (str) => {
                    if (!str) return '';
                    try {
                      const d = new Date(String(str).replace(' ', 'T'));
                      if (isNaN(d.getTime())) return str;
                      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                      const pad = (n) => String(n).padStart(2, '0');
                      return `${pad(d.getDate())}-${months[d.getMonth()]}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                    } catch {
                      return str;
                    }
                  };
                  const formattedDbStart = formatToPickerDateTime(dbStartTime);
                  if (formattedDbStart) {
                    if (activeSheet === 'maintenance') {
                      setMaintStartTime(formattedDbStart);
                    } else if (activeSheet === 'breakdown') {
                      setBdStartTime(formattedDbStart);
                    }
                  }
                }

                if (isCurrentlyMaint) {
                  const dbReason = endLogData.BreakdownReason || endLogData.reason || endLogData.Reason || mappedData.BreakdownReason || mappedData.reason || mappedData.Reason;
                  if (dbReason) setMaintReason(dbReason);
                } else {
                  setMaintReason('');
                }

                if (isCurrentlyBd) {
                  const dbReason = endLogData.BreakdownReason || endLogData.reason || endLogData.Reason || mappedData.BreakdownReason || mappedData.reason || mappedData.Reason;
                  if (dbReason) setBdReason(dbReason);
                } else {
                  setBdReason('');
                }

                setMaintRemarks('');
                setBdRemarks('');
              }).catch(err => {
                console.warn('Failed to fetch live asset details:', err);
              }).finally(() => {
                if (mounted) setLoadingDetails(false);
              });
          }
        }
      }
    }
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSheet, machine]);

  const handleClose = () => {
    setIsFullScreen(false);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const m = machine || {
    id: 'RBPL-FTC-0005(Fixed Tower Crane-12T)',
    label: 'Fixed Tower Crane',
    type: 'TOWER CRANE - FIXED',
    makeModel: 'ZOOMLION / ZOOMLION T7020',
    site: 'Kohinoor Plaza 2 - RBIPL',
    operator: user?.name || 'Amarjit Chaudhary',
    hmr: 5517,
    kmr: 5517,
    unit: 'HMR',
    fuel: 62,
    status: 'idle',
    since: 'Yesterday 07:22 PM',
  };

  const currentOp = m.operator || user?.name || 'Amarjit Chaudhary';
  const unitLabel = m.unit || m.recordingUnit || (m.hmr !== undefined ? 'HMR' : 'KMR');
  const unitUpper = String(unitLabel || '').toUpperCase();
  const isDualReading = unitUpper.includes('KMR/HMR') || unitUpper.includes('HMR/KMR') || (unitUpper.includes('HMR') && unitUpper.includes('KMR'));

  const handleSubmit = (actionType) => {
    setValidationError('');
    setErrors({});
    const numericId = parseInt(String(m.id).replace(/[^0-9]/g, ''), 10) || 0;

    if (actionType === 'dailylog') {
      const newErrors = {};
      if (!startTime || !String(startTime).trim()) {
        newErrors.startTime = 'Start Time is required.';
      }
      if (!endTime || !String(endTime).trim()) {
        newErrors.endTime = 'End Time is required.';
      }

      if (isDualReading) {
        if (!startHmr || !String(startHmr).trim()) {
          newErrors.startHmr = 'Start HMR is required.';
        }
        if (!startKmr || !String(startKmr).trim()) {
          newErrors.startKmr = 'Start KMR is required.';
        }
        if (!endHmr || !String(endHmr).trim()) {
          newErrors.endHmr = 'End HMR is required.';
        } else if (startHmr && String(startHmr).trim()) {
          const sHmr = parseFloat(startHmr) || 0;
          const eHmr = parseFloat(endHmr) || 0;
          if (eHmr < sHmr) {
            newErrors.endHmr = `End HMR (${eHmr}) cannot be less than Start HMR (${sHmr}).`;
          }
        }
        if (!endKmr || !String(endKmr).trim()) {
          newErrors.endKmr = 'End KMR is required.';
        } else if (startKmr && String(startKmr).trim()) {
          const sKmr = parseFloat(startKmr) || 0;
          const eKmr = parseFloat(endKmr) || 0;
          if (eKmr < sKmr) {
            newErrors.endKmr = `End KMR (${eKmr}) cannot be less than Start KMR (${sKmr}).`;
          }
        }
      } else {
        if (!startReading || !String(startReading).trim()) {
          newErrors.startReading = 'Start Reading is required.';
        }
        if (!endReading || !String(endReading).trim()) {
          newErrors.endReading = 'End Reading is required.';
        } else if (startReading && String(startReading).trim()) {
          const startNum = parseFloat(startReading) || 0;
          const endNum = parseFloat(endReading) || 0;
          if (endNum < startNum) {
            newErrors.endReading = `End Reading (${endNum}) cannot be less than Start Reading (${startNum}).`;
          }
        }
      }

      if (!sheetPhotoAttached) {
        newErrors.photo = 'End Reading Photo is required.';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }
    
    // Pass active log info if stopped/submitted
    let payload = { 
      actionType, 
      machineId: numericId, 
      operator,
      rawMachineId: m.id,
      openLogId: m.openLogID || m.openWorkingLogID || null
    };

    const parseToSqlDateTime = (str) => {
      if (!str) return null;
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str;
      try {
        const parts = str.split(' ');
        const dateParts = parts[0].split('-');
        const timeStr = parts[1] || '00:00';
        const day = dateParts[0];
        const monthStr = dateParts[1];
        const year = dateParts[2];
        const months = {
          jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
          jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
        };
        const month = months[monthStr.toLowerCase()] || '01';
        return `${year}-${month}-${day} ${timeStr}:00`;
      } catch {
        return str;
      }
    };

    if (actionType === 'dailylog') {
      payload = { 
        ...payload, 
        startTime: parseToSqlDateTime(startTime), 
        startReading: isDualReading ? startHmr : startReading, 
        startHmr: isDualReading ? startHmr : startReading,
        startKmr: isDualReading ? startKmr : startReading,
        endTime: parseToSqlDateTime(endTime), 
        endReading: isDualReading ? endHmr : endReading, 
        endHmr: isDualReading ? endHmr : endReading,
        endKmr: isDualReading ? endKmr : endReading,
        isDualReading,
        remarks: workingRemarks 
      };
    } else if (actionType === 'maintenance') {
      const newErrors = {};
      const statusLower = String(m.status || '').toLowerCase();
      const isCurrentlyMaint = statusLower === 'under maintenance' || statusLower === 'maintenance';

      if (!maintStartTime || !String(maintStartTime).trim()) {
        newErrors.maintStartTime = 'Start Time is required.';
      }
      if (isCurrentlyMaint) {
        if (!maintRemarks || !String(maintRemarks).trim()) {
          newErrors.maintRemarks = 'Remarks are required when ending maintenance.';
        }
      } else {
        if (!maintReason || !String(maintReason).trim()) {
          newErrors.maintReason = 'Reason is required.';
        }
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      payload = { 
        ...payload, 
        startTime: parseToSqlDateTime(maintStartTime), 
        endTime: parseToSqlDateTime(maintEndTime), 
        startHmr: isDualReading ? startHmr : startReading,
        startKmr: isDualReading ? startKmr : startReading,
        reason: maintReason, 
        remarks: maintRemarks 
      };
    } else if (actionType === 'breakdown') {
      const newErrors = {};
      const statusLower = String(m.status || '').toLowerCase();
      const isCurrentlyBd = statusLower === 'breakdown';

      if (!bdStartTime || !String(bdStartTime).trim()) {
        newErrors.bdStartTime = 'Start Time is required.';
      }
      if (isCurrentlyBd) {
        if (!bdRemarks || !String(bdRemarks).trim()) {
          newErrors.bdRemarks = 'Remarks are required when ending breakdown.';
        }
      } else {
        if (!bdReason || !String(bdReason).trim()) {
          newErrors.bdReason = 'Reason is required.';
        }
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      payload = { 
        ...payload, 
        category: bdCategory, 
        startTime: parseToSqlDateTime(bdStartTime), 
        endTime: parseToSqlDateTime(bdEndTime), 
        startHmr: isDualReading ? startHmr : startReading,
        startKmr: isDualReading ? startKmr : startReading,
        reason: bdReason, 
        remarks: bdRemarks 
      };
    } else if (actionType === 'breakdown') {
      payload = { 
        ...payload, 
        category: bdCategory, 
        startTime: parseToSqlDateTime(bdStartTime), 
        endTime: parseToSqlDateTime(bdEndTime), 
        reason: bdReason, 
        remarks: bdRemarks 
      };
    } else if (actionType === 'fuel') {
      const parseFuelDate = (str) => {
        if (!str) return null;
        try {
          const parts = str.split('-');
          return `${parts[2]}-${parts[1]}-${parts[0]} 12:00:00`;
        } catch {
          return str;
        }
      };
      payload = { 
        ...payload, 
        fuelingDate: parseFuelDate(fuelingDate), 
        fuelType, 
        qty: fuelQty, 
        reading: fuelReading, 
        remarks: fuelRemarks 
      };
    }
    if (onSubmit) onSubmit(payload);
    handleClose();
  };


  // Header Banner Colors & Text Themes
  let headerBg = '#F0FDF4'; // Faint green for Add Log
  let headerTitle = 'Add Log';
  let headerTextColor = '#15803D'; // Dark green title text
  let headerIconColor = '#15803D';

  const statusLower = String(m.status || '').toLowerCase();
  const isCurrentlyMaint = statusLower === 'under maintenance' || statusLower === 'maintenance';
  const isCurrentlyBd = statusLower === 'breakdown';

  if (activeSheet === 'maintenance') {
    headerBg = '#FEF9C3'; // Faint yellow
    headerTitle = isCurrentlyMaint ? 'End Under Maintenance' : 'Start Under Maintenance';
    headerTextColor = '#854D0E';
    headerIconColor = '#854D0E';
  } else if (activeSheet === 'breakdown') {
    headerBg = '#FEF2F2'; // Faint red
    headerTitle = isCurrentlyBd ? 'End Breakdown' : 'Start Breakdown';
    headerTextColor = '#991B1B';
    headerIconColor = '#991B1B';
  } else if (activeSheet === 'fuel') {
    headerBg = '#ECFEFF'; // Faint cyan
    headerTitle = 'Fuel Log Details';
    headerTextColor = '#0E7490';
    headerIconColor = '#0E7490';
  } else if (activeSheet === 'info') {
    headerBg = '#FFFFFF';
    headerTitle = quickHeader?.AssetName || m.assetName || m.name || m.assetCode || m.id;
    headerTextColor = '#0F172A';
    headerIconColor = '#64748B';
  }

  return (
    <>
      <Modal animationType="none" transparent visible={!!activeSheet} onRequestClose={handleClose}>
      <Animated.View style={[styles.drawerOverlay, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.drawerSheet,
            (activeSheet === 'dailylog' || activeSheet === 'start') && styles.drawerSheetFaintGreen,
            activeSheet === 'maintenance' && styles.drawerSheetFaintYellow,
            activeSheet === 'breakdown' && styles.drawerSheetFaintRed,
            activeSheet === 'fuel' && styles.drawerSheetFaintCyan,
            activeSheet === 'info' && styles.drawerSheetFaintSlate,
            isFullScreen && styles.drawerSheetFullScreen,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Top Handle & Gesture Capture Header */}
          <View style={styles.topTouchHeader} {...panResponder.panHandlers}>
            <TouchableOpacity
              style={styles.dragHandleWrap}
              activeOpacity={0.9}
              onPress={() => toggleFullScreen(!isFullScreen)}
            >
              <View style={styles.dragHandle} />
              {activeSheet === 'info' && (
                <Text style={styles.dragHintText}>
                  {isFullScreen ? 'Swipe down to minimize' : 'Slide up for full page'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={[styles.drawerHeader, { backgroundColor: headerBg }, activeSheet === 'info' && styles.drawerHeaderLight]}>
              <Text 
                style={[styles.drawerHeaderTitle, { color: headerTextColor, flex: 1, marginRight: 8 }, activeSheet === 'info' && { fontSize: 13.5, fontWeight: '700' }]} 
                numberOfLines={1} 
                ellipsizeMode="tail"
              >
                {headerTitle}
              </Text>
              <View style={styles.headerRightActions}>
                <TouchableOpacity onPress={() => toggleFullScreen(!isFullScreen)} style={styles.expandIconBtn}>
                  {isFullScreen ? (
                    <Minimize2 size={18} color={headerIconColor} />
                  ) : (
                    <Maximize2 size={18} color={headerIconColor} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClose}>
                  <X size={20} color={headerIconColor} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Drawer Body Content */}
          <ScrollView contentContainerStyle={styles.drawerBody} showsVerticalScrollIndicator={false}>
            {/* 1. FUEL LOG DETAILS DRAWER */}
            {activeSheet === 'fuel' && (
              <View style={styles.formStack}>
                <View style={styles.rowGrid}>
                  <View style={styles.colCell}>
                    <Text style={styles.ffieldLabel}>Fueling Date</Text>
                    <TouchableOpacity 
                      style={styles.inputWithIcon}
                      onPress={() => openPicker(fuelingDate, setFuelingDate)}
                    >
                      <TextInput style={styles.inputFlex} value={fuelingDate} editable={false} pointerEvents="none" />
                      <Calendar size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.colCell}>
                    <CustomDropdown
                      label="Fuel Type"
                      options={['Diesel', 'Petrol', 'AdBlue', 'CNG']}
                      value={fuelType}
                      onSelect={setFuelType}
                      searchPlaceholder="Search fuel type..."
                    />
                  </View>
                </View>

                <View style={styles.rowGrid}>
                  <View style={styles.colCell}>
                    <Text style={styles.fieldLabel}>Fuel Qty (Liters)</Text>
                    <TextInput style={styles.inputField} keyboardType="numeric" value={fuelQty} onChangeText={setFuelQty} placeholder="0.00" />
                  </View>

                  <View style={styles.colCell}>
                    <Text style={styles.fieldLabel}>Reading at Fueling</Text>
                    <View style={styles.inputWithIcon}>
                      <TextInput style={styles.inputFlex} keyboardType="numeric" value={fuelReading} onChangeText={setFuelReading} />
                      <TouchableOpacity style={styles.mediaIconBtn}>
                        <Camera size={16} color="#475569" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Remarks</Text>
                <View style={styles.textareaContainer}>
                  <TextInput
                    style={styles.textareaFlex}
                    multiline
                    numberOfLines={3}
                 placeholder="Fuel station, slip no, etc."
                    value={fuelRemarks}
                    onChangeText={setFuelRemarks}
                  />
                  <TouchableOpacity style={[styles.mediaIconBtn, styles.micBtnPosition]}>
                    <Mic size={16} color="#0284C7" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#00C4EE' }]} onPress={() => handleSubmit('fuel')}>
                  <Text style={styles.submitBtnText}>Save Fuel Log</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 2. ADD LOG DRAWER */}
            {activeSheet === 'dailylog' && (
              <View style={styles.formStack}>
                <CustomDropdown
                  label="Operator"
                  options={['Amarjit Chaudhary', 'Kalpesh Kale', 'Nishant Vishwakarma', 'Deepak Kukade', 'Sahil Guru', 'Sipahi Mahato']}
                  value={operator}
                  onSelect={setOperator}
                  searchPlaceholder="Search operator..."
                />

                {/* Start Time */}
                <View style={styles.colCell}>
                  <Text style={styles.fieldLabel}>Start Time</Text>
                  <TouchableOpacity 
                    style={[styles.inputWithIcon, errors.startTime ? { borderColor: '#DC2626', borderWidth: 1 } : null]}
                    onPress={() => {
                      openPicker(startTime, setStartTime);
                      if (errors.startTime) setErrors(prev => ({ ...prev, startTime: '' }));
                    }}
                  >
                    <TextInput style={styles.inputFlex} value={startTime} editable={false} pointerEvents="none" />
                    <Calendar size={16} color="#64748B" />
                  </TouchableOpacity>
                  {errors.startTime ? (
                    <Text style={styles.fieldErrorText}>{errors.startTime}</Text>
                  ) : null}
                </View>

                {/* End Time (placed directly below Start Time) */}
                <View style={styles.colCell}>
                  <Text style={styles.fieldLabel}>End Time</Text>
                  <TouchableOpacity 
                    style={[styles.inputWithIcon, errors.endTime ? { borderColor: '#DC2626', borderWidth: 1 } : null]}
                    onPress={() => {
                      openPicker(endTime, setEndTime);
                      if (errors.endTime) setErrors(prev => ({ ...prev, endTime: '' }));
                    }}
                  >
                    <TextInput style={styles.inputFlex} placeholder="Select Date Time" value={endTime} editable={false} pointerEvents="none" />
                    <Calendar size={16} color="#64748B" />
                  </TouchableOpacity>
                  {errors.endTime ? (
                    <Text style={styles.fieldErrorText}>{errors.endTime}</Text>
                  ) : null}
                </View>

                {isDualReading ? (
                  <>
                    {/* First two fields: HMR Readings */}
                    <Text style={[styles.fieldLabel, { marginTop: 4 }]}>HMR Readings</Text>
                    <View style={styles.rowGrid}>
                      <View style={styles.colCell}>
                        <Text style={styles.subFieldLabel}>Start HMR Reading</Text>
                        <TextInput 
                          style={[styles.inputField, errors.startHmr ? { borderColor: '#DC2626', borderWidth: 1 } : null]} 
                          keyboardType="numeric" 
                          value={startHmr} 
                          onChangeText={(txt) => {
                            setStartHmr(txt);
                            if (errors.startHmr) setErrors(prev => ({ ...prev, startHmr: '' }));
                          }} 
                        />
                        {errors.startHmr ? (
                          <Text style={styles.fieldErrorText}>{errors.startHmr}</Text>
                        ) : null}
                      </View>

                      <View style={styles.colCell}>
                        <Text style={styles.subFieldLabel}>End HMR Reading</Text>
                        <TextInput 
                          style={[styles.inputField, errors.endHmr ? { borderColor: '#DC2626', borderWidth: 1 } : null]} 
                          keyboardType="numeric" 
                          placeholder="HMR" 
                          value={endHmr} 
                          onChangeText={(txt) => {
                            setEndHmr(txt);
                            if (errors.endHmr) setErrors(prev => ({ ...prev, endHmr: '' }));
                          }} 
                        />
                        {errors.endHmr ? (
                          <Text style={styles.fieldErrorText}>{errors.endHmr}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Next two fields: KMR Readings */}
                    <Text style={[styles.fieldLabel, { marginTop: 4 }]}>KMR Readings</Text>
                    <View style={styles.rowGrid}>
                      <View style={styles.colCell}>
                        <Text style={styles.subFieldLabel}>Start KMR Reading</Text>
                        <TextInput 
                          style={[styles.inputField, errors.startKmr ? { borderColor: '#DC2626', borderWidth: 1 } : null]} 
                          keyboardType="numeric" 
                          value={startKmr} 
                          onChangeText={(txt) => {
                            setStartKmr(txt);
                            if (errors.startKmr) setErrors(prev => ({ ...prev, startKmr: '' }));
                          }} 
                        />
                        {errors.startKmr ? (
                          <Text style={styles.fieldErrorText}>{errors.startKmr}</Text>
                        ) : null}
                      </View>

                      <View style={styles.colCell}>
                        <Text style={styles.subFieldLabel}>End KMR Reading</Text>
                        <View style={[styles.inputWithIcon, errors.endKmr ? { borderColor: '#DC2626', borderWidth: 1 } : null]}>
                          <TextInput 
                            style={styles.inputFlex} 
                            keyboardType="numeric" 
                            placeholder="KMR" 
                            value={endKmr} 
                            onChangeText={(txt) => {
                              setEndKmr(txt);
                              if (errors.endKmr) setErrors(prev => ({ ...prev, endKmr: '' }));
                            }} 
                          />
                          <TouchableOpacity 
                            style={[styles.mediaIconBtn, sheetPhotoAttached && { backgroundColor: '#DCFCE7', borderColor: '#16A34A' }]}
                            onPress={() => {
                              setSheetPhotoAttached(!sheetPhotoAttached);
                              if (errors.photo) setErrors(prev => ({ ...prev, photo: '' }));
                            }}
                          >
                            <Camera size={16} color={sheetPhotoAttached ? "#16A34A" : "#475569"} />
                          </TouchableOpacity>
                        </View>
                        {errors.endKmr ? (
                          <Text style={styles.fieldErrorText}>{errors.endKmr}</Text>
                        ) : null}
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.rowGrid}>
                    <View style={styles.colCell}>
                      <Text style={styles.fieldLabel}>Start Reading ({unitLabel})</Text>
                      <TextInput 
                        style={[styles.inputField, errors.startReading ? { borderColor: '#DC2626', borderWidth: 1 } : null]} 
                        keyboardType="numeric" 
                        value={startReading} 
                        onChangeText={(txt) => {
                          setStartReading(txt);
                          if (errors.startReading) setErrors(prev => ({ ...prev, startReading: '' }));
                        }} 
                      />
                      {errors.startReading ? (
                        <Text style={styles.fieldErrorText}>{errors.startReading}</Text>
                      ) : null}
                    </View>

                    <View style={styles.colCell}>
                      <Text style={styles.fieldLabel}>End Reading ({unitLabel})</Text>
                      <View style={[styles.inputWithIcon, errors.endReading ? { borderColor: '#DC2626', borderWidth: 1 } : null]}>
                        <TextInput 
                          style={styles.inputFlex} 
                          keyboardType="numeric" 
                          placeholder="Reading" 
                          value={endReading} 
                          onChangeText={(txt) => {
                            setEndReading(txt);
                            if (errors.endReading) setErrors(prev => ({ ...prev, endReading: '' }));
                          }} 
                        />
                        <TouchableOpacity 
                          style={[styles.mediaIconBtn, sheetPhotoAttached && { backgroundColor: '#DCFCE7', borderColor: '#16A34A' }]}
                          onPress={() => {
                            setSheetPhotoAttached(!sheetPhotoAttached);
                            if (errors.photo) setErrors(prev => ({ ...prev, photo: '' }));
                          }}
                        >
                          <Camera size={16} color={sheetPhotoAttached ? "#16A34A" : "#475569"} />
                        </TouchableOpacity>
                      </View>
                      {errors.endReading ? (
                        <Text style={styles.fieldErrorText}>{errors.endReading}</Text>
                      ) : null}
                    </View>
                  </View>
                )}

                {sheetPhotoAttached && (
                  <View style={styles.sheetPreviewContainer}>
                    <Image 
                      source={{ uri: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=200&q=80' }} 
                      style={styles.sheetPreviewImage}
                    />
                    <Text style={styles.sheetPreviewText}>meter_reading.jpg</Text>
                    <TouchableOpacity 
                      style={styles.sheetRemovePreviewBtn} 
                      onPress={() => setSheetPhotoAttached(false)}
                    >
                      <X size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}

                {errors.photo ? (
                  <Text style={styles.fieldErrorText}>{errors.photo}</Text>
                ) : null}

                <Text style={styles.fieldLabel}>Working Remarks</Text>
                <View style={styles.textareaContainer}>
                  <TextInput
                    style={styles.textareaFlex}
                    multiline
                    numberOfLines={3}
                    placeholder="Additional details..."
                    value={workingRemarks}
                    onChangeText={setWorkingRemarks}
                  />
                  <View style={styles.mediaButtonGroup}>
                    <TouchableOpacity style={styles.mediaIconBtn}>
                      <Camera size={16} color="#475569" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.mediaIconBtn, styles.micBtnStyle]}>
                      <Mic size={16} color="#0284C7" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#16A34A' }]} onPress={() => handleSubmit('dailylog')}>
                  <Text style={styles.submitBtnText}>Add Log</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 3. MAINTENANCE DRAWER */}
            {activeSheet === 'maintenance' && (
              <View style={styles.formStack}>
                <CustomDropdown
                  label="Operator"
                  options={['Amarjit Chaudhary', 'Kalpesh Kale', 'Nishant Vishwakarma', 'Deepak Kukade', 'Sahil Guru', 'Sipahi Mahato']}
                  value={operator}
                  onSelect={setOperator}
                  searchPlaceholder="Search operator..."
                />

                <View style={styles.rowGrid}>
                  <View style={styles.colCell}>
                    <Text style={styles.fieldLabel}>Start Time</Text>
                    <TouchableOpacity 
                      style={[
                        styles.inputWithIcon, 
                        isCurrentlyMaint && styles.inputFieldDisabled,
                        errors.maintStartTime ? { borderColor: '#DC2626', borderWidth: 1 } : null
                      ]}
                      disabled={isCurrentlyMaint}
                      onPress={() => {
                        if (!isCurrentlyMaint) {
                          openPicker(maintStartTime, setMaintStartTime);
                          if (errors.maintStartTime) setErrors(prev => ({ ...prev, maintStartTime: '' }));
                        }
                      }}
                    >
                      <TextInput 
                        style={[styles.inputFlex, isCurrentlyMaint && styles.inputFlexDisabled]} 
                        value={maintStartTime} 
                        editable={false} 
                        pointerEvents="none" 
                      />
                      <Calendar size={16} color={isCurrentlyMaint ? "#94A3B8" : "#64748B"} />
                    </TouchableOpacity>
                    {errors.maintStartTime ? (
                      <Text style={styles.fieldErrorText}>{errors.maintStartTime}</Text>
                    ) : null}
                  </View>

                  <View style={styles.colCell}>
                    <Text style={styles.fieldLabel}>End Time</Text>
                    <TouchableOpacity 
                      style={styles.inputWithIcon}
                      onPress={() => openPicker(maintEndTime, setMaintEndTime)}
                    >
                      <TextInput style={styles.inputFlex} placeholder="Select Date Time" value={maintEndTime} editable={false} pointerEvents="none" />
                      <Calendar size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Reason</Text>
                <View style={[styles.textareaContainer, errors.maintReason ? { borderColor: '#DC2626', borderWidth: 1 } : null]}>
                  <TextInput 
                    style={styles.textareaFlex} 
                    multiline 
                    numberOfLines={2} 
                    placeholder="Reason for maintenance..." 
                    value={maintReason} 
                    onChangeText={(txt) => {
                      setMaintReason(txt);
                      if (errors.maintReason) setErrors(prev => ({ ...prev, maintReason: '' }));
                    }} 
                  />
                  <TouchableOpacity style={[styles.mediaIconBtn, styles.micBtnPosition]}>
                    <Mic size={16} color="#0284C7" />
                  </TouchableOpacity>
                </View>
                {errors.maintReason ? (
                  <Text style={styles.fieldErrorText}>{errors.maintReason}</Text>
                ) : null}

                <Text style={styles.fieldLabel}>Under Maintenance Remarks</Text>
                <View style={[styles.textareaContainer, errors.maintRemarks ? { borderColor: '#DC2626', borderWidth: 1 } : null]}>
                  <TextInput 
                    style={styles.textareaFlex} 
                    multiline 
                    numberOfLines={3} 
                    placeholder="Additional details..." 
                    value={maintRemarks} 
                    onChangeText={(txt) => {
                      setMaintRemarks(txt);
                      if (errors.maintRemarks) setErrors(prev => ({ ...prev, maintRemarks: '' }));
                    }} 
                  />
                  <View style={styles.mediaButtonGroup}>
                    <TouchableOpacity style={styles.mediaIconBtn}><Camera size={16} color="#475569" /></TouchableOpacity>
                    <TouchableOpacity style={[styles.mediaIconBtn, styles.micBtnStyle]}><Mic size={16} color="#0284C7" /></TouchableOpacity>
                  </View>
                </View>
                {errors.maintRemarks ? (
                  <Text style={styles.fieldErrorText}>{errors.maintRemarks}</Text>
                ) : null}

                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#FACC15' }]} onPress={() => handleSubmit('maintenance')}>
                  <Text style={[styles.submitBtnText, { color: '#111827' }]}>
                    {maintEndTime ? 'End Under Maintenance' : 'Start Under Maintenance'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 4. BREAKDOWN DRAWER */}
            {activeSheet === 'breakdown' && (
              <View style={styles.formStack}>
                <CustomDropdown
                  label="Operator"
                  options={['Amarjit Chaudhary', 'Kalpesh Kale', 'Nishant Vishwakarma', 'Deepak Kukade', 'Sahil Guru', 'Sipahi Mahato']}
                  value={operator}
                  onSelect={setOperator}
                  searchPlaceholder="Search operator..."
                />

                <View style={styles.rowGrid}>
                  <View style={styles.colCell}>
                    <Text style={styles.fieldLabel}>Start Time</Text>
                    <TouchableOpacity 
                      style={[
                        styles.inputWithIcon, 
                        isCurrentlyBd && styles.inputFieldDisabled,
                        errors.bdStartTime ? { borderColor: '#DC2626', borderWidth: 1 } : null
                      ]}
                      disabled={isCurrentlyBd}
                      onPress={() => {
                        if (!isCurrentlyBd) {
                          openPicker(bdStartTime, setBdStartTime);
                          if (errors.bdStartTime) setErrors(prev => ({ ...prev, bdStartTime: '' }));
                        }
                      }}
                    >
                      <TextInput 
                        style={[styles.inputFlex, isCurrentlyBd && styles.inputFlexDisabled]} 
                        value={bdStartTime} 
                        editable={false} 
                        pointerEvents="none" 
                      />
                      <Calendar size={16} color={isCurrentlyBd ? "#94A3B8" : "#64748B"} />
                    </TouchableOpacity>
                    {errors.bdStartTime ? (
                      <Text style={styles.fieldErrorText}>{errors.bdStartTime}</Text>
                    ) : null}
                  </View>

                  <View style={styles.colCell}>
                    <Text style={styles.fieldLabel}>End Time</Text>
                    <TouchableOpacity 
                      style={styles.inputWithIcon}
                      onPress={() => openPicker(bdEndTime, setBdEndTime)}
                    >
                      <TextInput style={styles.inputFlex} placeholder="Select Date Time" value={bdEndTime} editable={false} pointerEvents="none" />
                      <Calendar size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Reason</Text>
                <View style={[styles.textareaContainer, errors.bdReason ? { borderColor: '#DC2626', borderWidth: 1 } : null]}>
                  <TextInput 
                    style={styles.textareaFlex} 
                    multiline 
                    numberOfLines={2} 
                    placeholder="Reason for breakdown..." 
                    value={bdReason} 
                    onChangeText={(txt) => {
                      setBdReason(txt);
                      if (errors.bdReason) setErrors(prev => ({ ...prev, bdReason: '' }));
                    }} 
                  />
                  <TouchableOpacity style={[styles.mediaIconBtn, styles.micBtnPosition]}>
                    <Mic size={16} color="#0284C7" />
                  </TouchableOpacity>
                </View>
                {errors.bdReason ? (
                  <Text style={styles.fieldErrorText}>{errors.bdReason}</Text>
                ) : null}

                <Text style={styles.fieldLabel}>Breakdown Remarks</Text>
                <View style={[styles.textareaContainer, errors.bdRemarks ? { borderColor: '#DC2626', borderWidth: 1 } : null]}>
                  <TextInput 
                    style={styles.textareaFlex} 
                    multiline 
                    numberOfLines={3} 
                    placeholder="Additional details..." 
                    value={bdRemarks} 
                    onChangeText={(txt) => {
                      setBdRemarks(txt);
                      if (errors.bdRemarks) setErrors(prev => ({ ...prev, bdRemarks: '' }));
                    }} 
                  />
                  <View style={styles.mediaButtonGroup}>
                    <TouchableOpacity style={styles.mediaIconBtn}><Camera size={16} color="#475569" /></TouchableOpacity>
                    <TouchableOpacity style={[styles.mediaIconBtn, styles.micBtnStyle]}><Mic size={16} color="#0284C7" /></TouchableOpacity>
                  </View>
                </View>
                {errors.bdRemarks ? (
                  <Text style={styles.fieldErrorText}>{errors.bdRemarks}</Text>
                ) : null}

                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleSubmit('breakdown')}>
                  <Text style={styles.submitBtnText}>
                    {bdEndTime ? 'End Breakdown' : 'Start Breakdown'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 5. MACHINE DETAILS DRAWER */}
            {activeSheet === 'info' && (
              <View style={styles.formStack}>
                {/* 3 Tab Segment Controls */}
                <View style={styles.tabSegmentWrap}>
                  <TouchableOpacity style={[styles.tabSegment, infoTab === 'info' && styles.tabSegmentActive]} onPress={() => setInfoTab('info')}>
                    <Text style={[styles.tabSegmentText, infoTab === 'info' && styles.tabSegmentTextActive]}>Info</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.tabSegment, infoTab === 'worklogs' && styles.tabSegmentActive]} onPress={() => setInfoTab('worklogs')}>
                    <Text style={[styles.tabSegmentText, infoTab === 'worklogs' && styles.tabSegmentTextActive]}>Work Log</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.tabSegment, infoTab === 'fuellogs' && styles.tabSegmentActive]} onPress={() => setInfoTab('fuellogs')}>
                    <Text style={[styles.tabSegmentText, infoTab === 'fuellogs' && styles.tabSegmentTextActive]}>Fuel Log</Text>
                  </TouchableOpacity>
                </View>

                {/* INFO TAB CONTENT */}
                {infoTab === 'info' && (
                  (() => {
                    const currentStatusRaw = String(quickHeader?.CurrentStatus || m.status || 'Idle').toLowerCase();
                    let statusBg = '#64748B';
                    let statusTextColor = '#FFFFFF';
                    if (currentStatusRaw.includes('maint')) {
                      statusBg = '#FACC15';
                      statusTextColor = '#111827';
                    } else if (currentStatusRaw.includes('break')) {
                      statusBg = '#DC2626';
                      statusTextColor = '#FFFFFF';
                    } else if (currentStatusRaw.includes('work')) {
                      statusBg = '#16A34A';
                      statusTextColor = '#FFFFFF';
                    }

                    return (
                      <View style={styles.infoTabContainer}>
                        <View style={styles.infoLeftCol}>
                          <View style={styles.machineImagePlaceholder}>
                            {(quickHeader?.PhotoPath || m.photoPath) ? (
                              <Image 
                                source={{ uri: resolvePhotoUrl(quickHeader?.PhotoPath || m.photoPath) }} 
                                style={{ width: '100%', height: '100%', borderRadius: 8 }} 
                                resizeMode="cover"
                              />
                            ) : (
                              <Truck size={36} color="#64748B" />
                            )}
                          </View>
                          <View style={[styles.idleBadge, { backgroundColor: statusBg }]}>
                            <Text style={[styles.idleBadgeText, { color: statusTextColor }]}>
                              {(quickHeader?.CurrentStatus || m.status || 'Idle').toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.operatorHeaderLabel}>OPERATOR</Text>
                          <Text style={styles.operatorHeaderVal} numberOfLines={2}>
                            {quickHeader?.OperatorName || m.operatorName || currentOp}
                          </Text>
                        </View>

                        <View style={styles.infoRightGrid}>
                          <Text style={styles.machineryDetailsTitle}>MACHINERY DETAILS</Text>
                          <View style={styles.grid2Col}>
                            <View style={styles.cellItem}>
                              <Text style={styles.cellLabel}>REG NO</Text>
                              <Text style={styles.cellVal} numberOfLines={1}>{quickHeader?.RegistrationNo || m.regNo || '-'}</Text>
                            </View>
                            <View style={styles.cellItem}>
                              <Text style={styles.cellLabel}>TYPE</Text>
                              <Text style={styles.cellVal} numberOfLines={2}>{quickHeader?.AssetTypeName || m.assetType || m.type || '-'}</Text>
                            </View>
                          </View>

                          <View style={styles.grid2Col}>
                            <View style={styles.cellItem}>
                              <Text style={styles.cellLabel}>MAKE/MODEL</Text>
                              <Text style={styles.cellVal} numberOfLines={2}>
                                {(`${quickHeader?.Make || ''} ${quickHeader?.ModelName || ''}`).trim() || m.makeModel || '-'}
                              </Text>
                            </View>
                            <View style={styles.cellItem}>
                              <Text style={styles.cellLabel}>READING</Text>
                              <Text style={styles.cellVal} numberOfLines={1}>
                                {quickHeader?.Reading ?? m.reading ?? m.hmr ?? 0} {quickHeader?.RecordingUnit || m.unit || 'Hours'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.grid2Col}>
                            <View style={styles.cellItem}>
                              <Text style={styles.cellLabel}>PROJECT</Text>
                              <Text style={styles.cellVal} numberOfLines={2}>{quickHeader?.ProjectName || m.site || '-'}</Text>
                            </View>
                            <View style={styles.cellItem}>
                              <Text style={styles.cellLabel}>OPERATOR</Text>
                              <Text style={styles.cellVal} numberOfLines={2}>{quickHeader?.OperatorName || m.operatorName || currentOp}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })()
                )}

                {/* WORK LOG TAB CONTENT */}
                {infoTab === 'worklogs' && (
                  <View style={styles.logsTabContainer}>
                    <Text style={styles.recentLogsLabel}>RECENT LOGS (GROUPED BY DATE)</Text>

                    {loadingDetails ? (
                      <View style={{ paddingVertical: 60, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#0052CC" />
                        <Text style={{ marginTop: 8, fontSize: 13, color: '#64748B', fontWeight: '500' }}>Please wait...</Text>
                      </View>
                    ) : quickLogsList.length === 0 ? (
                      <View style={{ paddingVertical: 60, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#94A3B8' }}>No work log entries found.</Text>
                      </View>
                    ) : (
                      (() => {
                        const formatAmPmTime = (str) => {
                          if (!str) return 'Running';
                          try {
                            const d = new Date(String(str).replace(' ', 'T'));
                            if (isNaN(d.getTime())) return str;
                            let hours = d.getHours();
                            const minutes = String(d.getMinutes()).padStart(2, '0');
                            const ampm = hours >= 12 ? 'pm' : 'am';
                            hours = hours % 12;
                            hours = hours ? hours : 12;
                            return `${hours}:${minutes} ${ampm}`;
                          } catch {
                            return str;
                          }
                        };

                        const groupLogsByDate = (logs) => {
                          const groups = {};
                          (logs || []).forEach((item) => {
                            const rawDate = item.LogDate || item.StartDateTime || '';
                            let dateStr = 'Recent Logs';
                            if (rawDate) {
                              try {
                                const d = new Date(String(rawDate).replace(' ', 'T'));
                                if (!isNaN(d.getTime())) {
                                  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                  const pad = (n) => String(n).padStart(2, '0');
                                  dateStr = `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
                                }
                              } catch {}
                            }
                            if (!groups[dateStr]) groups[dateStr] = { date: dateStr, items: [], totalHours: 0 };
                            groups[dateStr].items.push(item);
                            groups[dateStr].totalHours += parseFloat(item.TotalHours || 0);
                          });
                          return Object.values(groups);
                        };

                        return groupLogsByDate(quickLogsList).map((group, gIdx) => (
                          <View key={`g_${gIdx}`} style={styles.logGroupCard}>
                            <View style={styles.logGroupHead}>
                              <Text style={styles.logGroupDate}>{group.date}</Text>
                              <Text style={[styles.logGroupNet, { color: '#16A34A' }]}>
                                Net: {Number(group.totalHours || 0).toFixed(2)}h
                              </Text>
                            </View>
                            {group.items.map((log, lIdx) => {
                              const statusKey = String(log.LogType || log.MachineStatus || 'Working').toLowerCase();
                              const isFuel = statusKey === 'fuellog' || statusKey === 'fuel';
                              const isBd = statusKey === 'breakdown';
                              const isMaint = statusKey === 'undermaintenance' || statusKey === 'maintenance';
                              
                              const cardBg = isFuel ? '#E0F2FE' : isBd ? '#FFF1F2' : isMaint ? '#FEFCE8' : '#F0FDF4';
                              const tagBg = isFuel ? '#0284C7' : isBd ? '#DC2626' : isMaint ? '#FACC15' : '#16A34A';
                              const tagTextColor = isMaint ? '#111827' : '#FFFFFF';
                              const tagLabel = isFuel ? 'Fuel' : isBd ? 'Breakdown' : isMaint ? 'Maintenance' : 'Working';

                              const startHmr = log.StartHMR ?? 0;
                              const endHmr = log.EndHMR ?? 0;
                              const unitName = log.RecordingUnit || m.unit || 'HMR';
                              const rawPhoto = log.PhotoPath || log.photoPath || log.Photo || log.photo || log.RemarkPhoto || log.remarkPhoto || log.EndReadingPhoto || log.endReadingPhoto || '';

                              const startTimeStr = formatAmPmTime(log.StartDateTime);
                              const endTimeStr = log.EndDateTime ? formatAmPmTime(log.EndDateTime) : 'Active';

                              return (
                                <View key={`log_${lIdx}`} style={[styles.logEntryItem, { backgroundColor: cardBg }]}>
                                  <View style={styles.logEntryLeft}>
                                    <Text style={styles.logTimeText}>
                                      {startTimeStr}  {endTimeStr}
                                    </Text>
                                    {isFuel ? (
                                      <Text style={styles.logReadingText}>
                                        Fuel Added: {log.ProductionQty} {log.ProductionUnit || 'Ltr'} | Reading: {log.StartHMR} {unitName}
                                      </Text>
                                    ) : (
                                      <Text style={styles.logReadingText}>
                                        {Number(log.TotalHours || 0).toFixed(2)}h | Reading - {startHmr} - {endHmr} {unitName}
                                      </Text>
                                    )}
                                    <Text style={styles.logOpText}>
                                       {log.OperatorName || currentOp}    {log.ProjectName || m.site || 'Site Location'}
                                    </Text>
                                    {(log.Remarks || log.BreakdownReason) ? (
                                      <Text style={styles.logRemarksText}>
                                        {log.Remarks || log.BreakdownReason}
                                      </Text>
                                    ) : null}
                                  </View>

                                  <View style={styles.logEntryRightCol}>
                                    <View style={[styles.tagPill, { backgroundColor: tagBg }]}>
                                      <Text style={[styles.tagPillText, { color: tagTextColor }]}>{tagLabel}</Text>
                                    </View>
                                    {rawPhoto ? (
                                      <TouchableOpacity
                                        activeOpacity={0.85}
                                        onPress={() => setPhotoViewerUrl(resolvePhotoUrl(rawPhoto))}
                                      >
                                        <Image
                                          source={{ uri: resolvePhotoUrl(rawPhoto) }}
                                          style={styles.logPhotoThumb}
                                          resizeMode="cover"
                                        />
                                      </TouchableOpacity>
                                    ) : null}
                                    <View style={styles.logActionCol}>
                                      <TouchableOpacity style={[styles.iconActionBtn, { backgroundColor: '#FFFFFF' }]}>
                                        <Edit3 size={13} color="#0284C7" />
                                      </TouchableOpacity>
                                      <TouchableOpacity style={[styles.iconActionBtn, { backgroundColor: '#FFFFFF' }]}>
                                        <Trash2 size={13} color="#DC2626" />
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        ));
                      })()
                    )}
                  </View>
                )}

                {/* FUEL LOG TAB CONTENT */}
                {infoTab === 'fuellogs' && (
                  <View style={styles.logsTabContainer}>
                    <Text style={styles.recentLogsLabel}>FUEL LOGS</Text>

                    <View style={styles.logGroupCard}>
                      <View style={styles.logGroupHead}>
                        <Text style={styles.logGroupDate}>31 Jul 2026</Text>
                        <Text style={[styles.logGroupNet, { color: '#16A34A' }]}>Entries: 4</Text>
                      </View>
                      <View style={[styles.logEntryItem, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' }]}>
                        <View style={styles.logEntryLeft}>
                          <View style={styles.logTimeRow}>
                            <Text style={styles.logTimeText}>12:00 am  12:00 am</Text>
                            <View style={[styles.tagPill, { backgroundColor: '#00C4EE' }]}>
                              <Text style={styles.tagPillText}>Fuel</Text>
                            </View>
                          </View>
                          <Text style={styles.logReadingText}>44 CNG | Reading - 70 HMR</Text>
                          <Text style={styles.logOpText}> {currentOp}    {m.site}</Text>
                          <Text style={styles.logRemarksText}>Test fuel refill</Text>
                        </View>
                        <View style={styles.logActionCol}>
                          <TouchableOpacity style={[styles.iconActionBtn, { backgroundColor: '#EFF6FF' }]}><Edit3 size={14} color="#0284C7" /></TouchableOpacity>
                          <TouchableOpacity style={[styles.iconActionBtn, { backgroundColor: '#FEF2F2' }]}><Trash2 size={14} color="#DC2626" /></TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      <CustomDateTimePicker
        visible={pickerVisible}
        value={pickerValue}
        onChange={handlePickerConfirm}
        onClose={() => setPickerVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  drawerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  drawerSheetFaintGreen: {
    backgroundColor: '#F0FDF4',
  },
  drawerSheetFaintYellow: {
    backgroundColor: '#FEFCE8',
  },
  drawerSheetFaintRed: {
    backgroundColor: '#FEF2F2',
  },
  drawerSheetFaintCyan: {
    backgroundColor: '#ECFEFF',
  },
  drawerSheetFaintSlate: {
    backgroundColor: '#F8FAFC',
  },
  drawerSheetFullScreen: {
    height: '100%',
    maxHeight: '100%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  topTouchHeader: {
    width: '100%',
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  dragHintText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  drawerHeaderLight: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  drawerHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandIconBtn: {
    padding: 2,
  },
  drawerBody: {
    padding: 16,
    paddingBottom: 40,
  },
  formStack: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.3,
  },
  rowGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  colCell: {
    flex: 1,
    gap: 4,
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#0F172A',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
  },
  inputFlex: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
  },
  textareaContainer: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: 'relative',
  },
  textareaFlex: {
    minHeight: 65,
    textAlignVertical: 'top',
    fontSize: 12.5,
    color: '#0F172A',
    paddingBottom: 26,
  },
  mediaButtonGroup: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    gap: 6,
  },
  mediaIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnPosition: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  micBtnStyle: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  submitBtn: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  tabSegmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabSegment: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 18,
  },
  tabSegmentActive: {
    backgroundColor: '#00C4EE',
  },
  tabSegmentText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabSegmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  infoTabContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  infoLeftCol: {
    width: 110,
    alignItems: 'center',
    gap: 6,
  },
  machineImagePlaceholder: {
    width: 100,
    height: 80,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleBadge: {
    backgroundColor: '#64748B',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 6,
  },
  idleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  operatorHeaderLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 6,
  },
  operatorHeaderVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  infoRightGrid: {
    flex: 1,
    gap: 8,
  },
  machineryDetailsTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  grid2Col: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
  },
  cellItem: {
    flex: 1,
  },
  cellLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  cellVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  logsTabContainer: {
    gap: 12,
    marginTop: 8,
  },
  recentLogsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  logGroupCard: {
    gap: 6,
  },
  logGroupHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logGroupDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  logGroupNet: {
    fontSize: 12,
    fontWeight: '700',
  },
  logEntryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  logEntryLeft: {
    flex: 1,
    gap: 3,
  },
  logTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logReadingText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '500',
  },
  logOpText: {
    fontSize: 11,
    color: '#64748B',
  },
  logRemarksText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  logActionCol: {
    flexDirection: 'row',
    gap: 6,
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
});