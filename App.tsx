import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, Platform, Alert, LogBox, ActivityIndicator, Image } from 'react-native';
LogBox.ignoreAllLogs();
import { Home, User, ClipboardList, Plus, LayoutGrid, ChevronRight, Truck } from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop as SvgStop } from 'react-native-svg';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { seedEquipment, seedUsers } from './src/theme/tokens';

import SplashScreen from './src/screens/SplashScreen';
import OperatorDashboard from './src/screens/OperatorDashboard';
import InchargeDashboard from './src/screens/InchargeDashboard';
import BulkLogScreen from './src/screens/BulkLogScreen';
import ConcreteEntryScreen from './src/screens/ConcreteEntryScreen';
import LogBoardScreen from './src/screens/LogBoardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import { ActionSheetsModal } from './src/components/ActionSheetsModal';
import { ConstructionPattern } from './src/components/ConstructionPattern';
import { SosAlertBanner, SosTriggerDrawer } from './src/components/SosAlertModal';
import { BroadcastCardBanner, BroadcastComposerDrawer } from './src/components/BroadcastModal';
import { NotificationsModal } from './src/components/NotificationsModal';
import { 
  saveAddLog, 
  startWorking,
  endWorking, 
  startInterruption, 
  endUnderMaintenance, 
  endBreakdown, 
  saveFuelLog,
  getAddLogAssetDetails,
  parseEventResultRow,
  getStoredUser,
  setUnauthorizedHandler,
  resolvePhotoUrl,
  uploadLogPhoto
} from './src/services/api';
import { CustomToast, showToast } from './src/components/CustomToast';

interface BottomNavProps {
  active: string;
  onNavigate: (screen: string) => void;
  user?: any;
}

function BottomNav({ active, onNavigate, user }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const [navWidth, setNavWidth] = useState(375);

  const items = [
    { key: 'dashboard', Icon: Home, label: 'Dashboard' },
    { key: 'plant', Icon: ClipboardList, label: 'Logs' },
    { key: 'add_log', Icon: Plus, label: '', isCenter: true },
    { key: 'reports', Icon: LayoutGrid, label: 'Reports' },
    { key: 'profile', Icon: User, label: 'Profile' },
  ];

  const w = navWidth;
  const cx = w / 2;
  // Subtler, wider dome curve matching img2 reference design exactly, extended down by insets.bottom
  const svgPath = `M 0,12 L ${cx - 75},12 C ${cx - 45},12 ${cx - 36},0 ${cx},0 C ${cx + 36},0 ${cx + 45},12 ${cx + 75},12 L ${w},12 L ${w},${95 + insets.bottom} L 0,${95 + insets.bottom} Z`;

  return (
    <View 
      style={[styles.bottomNavContainer, { height: 82 + insets.bottom, paddingBottom: insets.bottom }]}
      onLayout={(e) => {
        const measuredWidth = e.nativeEvent.layout.width;
        if (measuredWidth > 0) setNavWidth(measuredWidth);
      }}
    >
      {/* SVG Curved Background with Central Dome */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={w} height={95 + insets.bottom} viewBox={`0 0 ${w} ${95 + insets.bottom}`}>
          <Defs>
            <SvgGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
              <SvgStop offset="0" stopColor="#005BE3" stopOpacity="1" />
              <SvgStop offset="1" stopColor="#001F5B" stopOpacity="1" />
            </SvgGradient>
          </Defs>
          <Path d={svgPath} fill="url(#navGrad)" />
        </Svg>
      </View>

      <View style={styles.bottomNavContent}>
        {items.map(({ key, Icon, label, isCenter }) => {
          if (isCenter) {
            return (
              <TouchableOpacity
                key={key}
                onPress={() => {
                  const isIncharge = user?.roleId === 12 || user?.roleId === '12' || user?.roleId === 7 || user?.roleId === '7' || String(user?.role).toLowerCase() === 'incharge' || String(user?.role).toLowerCase() === 'site incharge';
                  if (isIncharge) {
                    onNavigate('plus_menu');
                  } else {
                    onNavigate('plant');
                  }
                }}
                style={styles.centerPlusBtnWrap}
                activeOpacity={0.9}
              >
                <View style={styles.centerPlusCircle}>
                  <Plus size={26} color="#FFFFFF" strokeWidth={2.2} />
                </View>
              </TouchableOpacity>
            );
          }

          const isActive = active === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onNavigate(key)}
              style={[styles.navItem, isActive && styles.activeNavItemBox]}
              activeOpacity={0.8}
            >
              {/* Profile tab: show operator avatar if available */}
              {key === 'profile' ? (
                <View style={[
                  styles.navProfileAvatar,
                  isActive && styles.navProfileAvatarActive,
                ]}>
                  {user?.photoPath ? (
                    <Image
                      source={{ uri: resolvePhotoUrl(user.photoPath) }}
                      style={styles.navAvatarImg}
                    />
                  ) : (
                    <Image
                      source={{ uri: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'U') + '&background=0052cc&color=fff&size=80' }}
                      style={styles.navAvatarImg}
                    />
                  )}
                </View>
              ) : (
                <Icon
                  size={19}
                  color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)'}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
              )}
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  site: string;
  unread: boolean;
}

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [screen, setScreen] = useState('splash');
  const [roleType, setRoleType] = useState('operator');
  const [isInitializing, setIsInitializing] = useState(true);

  // Register unauthorized session handler for auto-logout
  useEffect(() => {
    setUnauthorizedHandler((msg: string) => {
      showToast(msg || 'Session expired. Please log in again.');
      setLoggedInUser(null);
      setScreen('splash');
    });
  }, []);

  // Check persistent session on app launch
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedUser = await getStoredUser();
        console.log('[SESSION] App launch restored user:', storedUser);
        if (storedUser && (storedUser.empId || storedUser.userId || storedUser.guid) && storedUser.isLoggedIn !== false) {
          setLoggedInUser(storedUser);
          if (storedUser.role === 'Incharge') setRoleType('incharge');
          setScreen('dashboard');
        }
      } catch (err) {
        console.warn('Error restoring user session:', err);
      } finally {
        setIsInitializing(false);
      }
    }
    restoreSession();
  }, []);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // New SOS, Broadcast & Notifications States
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [activeSosAlert, setActiveSosAlert] = useState<any>(null);

  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [activeBroadcastCard, setActiveBroadcastCard] = useState<any>(null);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif_1',
      type: 'sos',
      title: ' Medical Emergency Reported',
      message: 'Operator Amarjit Chaudhary requested immediate medical assistance at Pier 4.',
      time: '10 mins ago',
      site: 'Rohan Riviera Site',
      unread: true,
    },
    {
      id: 'notif_2',
      type: 'broadcast',
      title: ' Concrete Pouring Announcement',
      message: 'Transit Mixers move to Batching Plant 2 for high-grade M40 concrete pouring.',
      time: '25 mins ago',
      site: 'Rohan Riviera Site',
      unread: true,
    },
    {
      id: 'notif_3',
      type: 'breakdown',
      title: ' HMR Log Overdue Warning',
      message: 'Excavator JSWMHR-EX-002 daily HMR log entry is pending.',
      time: '1 hour ago',
      site: 'Rohan Riviera Site',
      unread: false,
    },
  ]);

  const seedUser = (seedUsers as Record<string, any>)[roleType];
  const user = loggedInUser
    ? {
        ...seedUser,
        ...loggedInUser,
        empId: loggedInUser.empId || loggedInUser.userId,
        name: loggedInUser.name || seedUser.name,
        guid: loggedInUser.guid,
      }
    : seedUser;
  const equipment = seedEquipment;

  const unreadNotifCount = notifications.filter(n => n.unread).length;

  const handleOpenSheet = (sheetType: string, machineObj: any = null) => {
    setSelectedMachine(machineObj || equipment[0]);
    setActiveSheet(sheetType);
  };

  const handleSosSubmit = (payload: any) => {
    setActiveSosAlert(payload);
    const newNotif = {
      id: payload.id,
      type: 'sos',
      title: ` ${payload.emergencyType}`,
      message: `${payload.senderName} (${payload.senderRole}): ${payload.remarks || 'Emergency SOS triggered'}`,
      time: 'Just now',
      site: payload.site,
      unread: true,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleBroadcastSubmit = (payload: any) => {
    setActiveBroadcastCard(payload);
    const newNotif = {
      id: payload.broadcastId,
      type: 'broadcast',
      title: ' Site Announcement',
      message: `${payload.senderName}: ${payload.textMessage}`,
      time: 'Just now',
      site: payload.targetProjectName,
      unread: true,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleDirectSosTrigger = () => {
    const payload = {
      id: `sos_${Date.now()}`,
      emergencyType: 'Critical SOS Emergency',
      senderName: user?.name || 'Amarjit Chaudhary',
      senderRole: user?.role || 'Site Operator',
      site: user?.site || 'Rohan Riviera Site',
      machineId: selectedMachine?.id || 'JSWMHR-TM-003',
      remarks: '3-Second SOS Emergency hold button triggered directly!',
      emergencyContact: '112',
      time: 'Just now',
    };
    handleSosSubmit(payload);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'splash':
        return (
          <SplashScreen
            onContinue={(userData: any) => {
              if (userData && typeof userData === 'object') {
                setLoggedInUser(userData);
                if (userData.role === 'Incharge') setRoleType('incharge');
              }
              setScreen('dashboard');
            }}
          />
        );
      case 'bulklog':
        return <BulkLogScreen equipment={equipment} onBack={() => setScreen('dashboard')} />;
      case 'plus_menu':
        return (
          <View style={styles.plusMenuContainer}>
            <View style={styles.plusMenuContent}>
              <Text style={styles.plusMenuTitle}>Select Entry Type</Text>
              
              <TouchableOpacity 
                style={styles.plusMenuOptionCard} 
                onPress={() => setScreen('bulklog')}
              >
                <View style={[styles.plusMenuIconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <ClipboardList size={22} color="#0284C7" />
                </View>
                <View style={styles.plusMenuOptionTextWrap}>
                  <Text style={styles.plusMenuOptionTitle}>Bulk Log Entry</Text>
                  <Text style={styles.plusMenuOptionSub}>Record readings for all site machines</Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.plusMenuOptionCard} 
                onPress={() => setScreen('concrete_entry')}
              >
                <View style={[styles.plusMenuIconCircle, { backgroundColor: '#DCFCE7' }]}>
                  <Truck size={22} color="#16A34A" />
                </View>
                <View style={styles.plusMenuOptionTextWrap}>
                  <Text style={styles.plusMenuOptionTitle}>Concrete Entry</Text>
                  <Text style={styles.plusMenuOptionSub}>Record batch pouring & transit mixer status</Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.plusMenuCancelBtn} 
                onPress={() => setScreen('dashboard')}
              >
                <Text style={styles.plusMenuCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'concrete_entry':
        return <ConcreteEntryScreen equipment={equipment} onBack={() => setScreen('dashboard')} />;
      case 'plant':
        return (
          <LogBoardScreen
            equipment={equipment}
            user={user}
            onNavigate={setScreen}
            onOpenSheet={handleOpenSheet}
            refreshCounter={refreshCounter}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            user={user}
            equipment={equipment}
            onUpdateUser={(updatedUser) => setLoggedInUser(updatedUser)}
            onRefresh={() => setRefreshCounter(prev => prev + 1)}
            onBack={() => setScreen('dashboard')}
            onLogout={() => {
              setLoggedInUser(null);
              setScreen('splash');
            }}
          />
        );
      case 'reports':
        return <ReportsScreen user={user} onBack={() => setScreen('dashboard')} />;
          case 'dashboard':
      default:
        return (roleType === 'operator' || roleType === 'incharge') ? (
          <OperatorDashboard
            user={user}
            equipment={equipment}
            onNavigate={setScreen}
            onOpenSheet={handleOpenSheet}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onTriggerSos={handleDirectSosTrigger}
            onOpenBroadcast={() => setIsBroadcastOpen(true)}
            unreadCount={unreadNotifCount}
          />
        ) : (
          <InchargeDashboard
            user={user}
            equipment={equipment}
            onNavigate={setScreen}
            onOpenSheet={handleOpenSheet}
          />
        );
    }
  };

  const toggleRole = () => {
    setRoleType(prev => prev === 'operator' ? 'incharge' : 'operator');
    setScreen('dashboard');
  };

  if (isInitializing) {
    return (
      <View style={[styles.container, styles.containerSplash, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar translucent backgroundColor="#011936" barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={[styles.container, screen === 'splash' && styles.containerSplash]}>
      <StatusBar
        barStyle={screen === 'splash' ? "light-content" : "dark-content"}
        backgroundColor={screen === 'splash' ? "#011936" : "#FFFFFF"}
        translucent={false}
      />
      {screen !== 'splash' && <ConstructionPattern />}

      {/* Real-time SOS Active Alert Banner */}
      {screen !== 'splash' && activeSosAlert && (
        <SosAlertBanner
          sosAlert={activeSosAlert}
          onResolve={() => setActiveSosAlert(null)}
          onClose={() => setActiveSosAlert(null)}
        />
      )}

      {/* Real-time Broadcast Announcement Banner */}
      {screen !== 'splash' && activeBroadcastCard && (
        <BroadcastCardBanner
          broadcastMessage={activeBroadcastCard}
          onClose={() => setActiveBroadcastCard(null)}
        />
      )}

      <View style={styles.main}>
        {renderScreen()}
      </View>

      {screen !== 'splash' && screen !== 'bulklog' && screen !== 'concrete_entry' && screen !== 'plus_menu' && (
        <BottomNav active={screen} onNavigate={setScreen} user={user} />
      )}

      {/* Action Sheets & Modals */}
      <ActionSheetsModal
        activeSheet={activeSheet}
        machine={selectedMachine}
        user={user}
        onClose={() => setActiveSheet(null)}
        onSubmit={async (payload: any) => {
          console.log('Action Submitted:', payload);
          try {
            const { actionType, machineId, openLogId } = payload;
            let response: any = null;
            let successMessage = 'Action completed successfully.';

            if (actionType === 'dailylog') {
              // Upload photo if URI is provided
              let serverPhotoPath = '';
              if (payload.photoUri) {
                try {
                  serverPhotoPath = await uploadLogPhoto(payload.photoUri, `Reading_${machineId || 'daily'}_${Date.now()}.jpg`);
                } catch (uploadErr) {
                  console.error('Failed to upload reading photo:', uploadErr);
                }
              }

              if (openLogId) {
                // End daily log
                response = await endWorking({
                  logId: openLogId,
                  endDateTime: payload.endTime,
                  endHmr: payload.endReading,
                  endKmr: payload.endReading,
                  endReadingPhoto: serverPhotoPath || (payload.photoAttached ? 'PNM_2026/Profile/temp8029387726988458371_20260408180616.jpg' : ''),
                  remarks: payload.remarks,
                });
                successMessage = 'Daily working log submitted successfully.';
              } else {
                // Check if user entered both start and end readings to add once
                if (payload.endTime && payload.endReading) {
                  // Validate end reading >= start reading
                  const startNum = parseFloat(payload.startReading) || 0;
                  const endNum = parseFloat(payload.endReading) || 0;
                  if (endNum < startNum) {
                    Alert.alert('Validation Error', 'End Reading (' + endNum + ') cannot be less than Start Reading (' + startNum + ').');
                    return;
                  }

                  // 1. Fetch live asset details to get Operator ID
                  const detailsRes = await getAddLogAssetDetails(machineId);
                  const detailsData = Array.isArray(detailsRes) ? detailsRes[0] : (detailsRes?.rows && Array.isArray(detailsRes.rows) ? detailsRes.rows[0] : detailsRes);
                  let mappedDetails = {};
                  if (Array.isArray(detailsRes?.columns) && Array.isArray(detailsRes?.rows?.[0])) {
                    detailsRes.columns.forEach((col, idx) => {
                      mappedDetails[col] = detailsRes.rows[0][idx];
                    });
                  } else if (detailsData) {
                    mappedDetails = detailsData;
                  }
                  const operatorId = mappedDetails.DefaultOperatorUserId || user?.operatorId || 0;

                  // 2. Call saveAddLog to create the working log record
                  const startRes = await saveAddLog({
                    assetId: machineId,
                    startDateTime: payload.startTime,
                    startHmr: payload.isDualReading ? payload.startHmr : payload.startReading,
                    startKmr: payload.isDualReading ? payload.startKmr : payload.startReading,
                    remarks: payload.remarks,
                    machineStatus: 'Working',
                    operatorId,
                  });

                  const parsedStart = parseEventResultRow(startRes);
                  const startStatus = String(parsedStart?.Status ?? parsedStart?.status ?? 'Success').toLowerCase();
                  const startMsg = parsedStart?.Reasons ?? parsedStart?.reasons ?? parsedStart?.Msg ?? parsedStart?.msg ?? parsedStart?.Message ?? parsedStart?.message;
                  const createdLogId = parsedStart?.MsgData || parsedStart?.LogID || parsedStart?.logId || parsedStart?.ID || parsedStart?.id;

                  if (startStatus === 'error' || startStatus === 'fail') {
                    showToast(startMsg || 'Start reading cannot be less than last reading.', 'error');
                    return;
                  }

                  if (!createdLogId) {
                    showToast(startMsg || 'Failed to retrieve new Log ID from database.', 'error');
                    return;
                  }

                  // 3. Call EndWorking directly to end and submit it
                  response = await endWorking({
                    logId: createdLogId,
                    endDateTime: payload.endTime,
                    endHmr: payload.isDualReading ? payload.endHmr : payload.endReading,
                    endKmr: payload.isDualReading ? payload.endKmr : payload.endReading,
                    endReadingPhoto: serverPhotoPath || (payload.photoAttached ? 'PNM_2026/Profile/temp8029387726988458371_20260408180616.jpg' : ''),
                    remarks: payload.remarks,
                  });
                  successMessage = 'Daily working log added successfully.';
                } else {
                  // Only start daily log
                  // 1. Fetch live details for Operator ID
                  const detailsRes = await getAddLogAssetDetails(machineId);
                  const detailsData = Array.isArray(detailsRes) ? detailsRes[0] : (detailsRes?.rows && Array.isArray(detailsRes.rows) ? detailsRes.rows[0] : detailsRes);
                  let mappedDetails = {};
                  if (Array.isArray(detailsRes?.columns) && Array.isArray(detailsRes?.rows?.[0])) {
                    detailsRes.columns.forEach((col, idx) => {
                      mappedDetails[col] = detailsRes.rows[0][idx];
                    });
                  } else if (detailsData) {
                    mappedDetails = detailsData;
                  }
                  const operatorId = mappedDetails.DefaultOperatorUserId || user?.operatorId || 0;

                  response = await startWorking({
                    assetId: machineId,
                    startDateTime: payload.startTime,
                    startHmr: payload.isDualReading ? payload.startHmr : payload.startReading,
                    startKmr: payload.isDualReading ? payload.startKmr : payload.startReading,
                    remarks: payload.remarks,
                    machineStatus: 'Working',
                    operatorId,
                  });
                  successMessage = 'Daily working log started successfully.';
                }
              }
            } else if (actionType === 'maintenance') {
              if (openLogId) {
                response = await endUnderMaintenance({
                  logId: openLogId,
                  endDateTime: payload.endTime,
                  remarks: payload.remarks,
                  reason: payload.reason,
                });
                successMessage = 'Maintenance log submitted successfully.';
              } else {
                response = await startInterruption({
                  assetId: machineId,
                  type: 'maintenance',
                  startDateTime: payload.startTime,
                  startHmr: payload.startHmr,
                  startKmr: payload.startKmr,
                  remarks: payload.remarks,
                  reason: payload.reason,
                  operatorId: payload.selectedOperatorId || user?.operatorId || 0,
                });
                successMessage = 'Maintenance log started successfully.';
              }
            } else if (actionType === 'breakdown') {
              if (openLogId) {
                response = await endBreakdown({
                  logId: openLogId,
                  endDateTime: payload.endTime,
                  remarks: payload.remarks,
                  reason: payload.reason,
                });
                successMessage = 'Breakdown log submitted successfully.';
              } else {
                response = await startInterruption({
                  assetId: machineId,
                  type: 'breakdown',
                  startDateTime: payload.startTime,
                  remarks: payload.remarks,
                  reason: payload.reason,
                  operatorId: payload.selectedOperatorId || user?.operatorId || 0,
                });
                successMessage = 'Breakdown log started successfully.';
              }
            } else if (actionType === 'fuel') {
              response = await saveFuelLog({
                assetId: machineId,
                fuelType: payload.fuelType,
                fuelDateTime: payload.fuelingDate,
                fuelQty: payload.qty,
                readingAtFueling: payload.reading,
                remarks: payload.remarks,
              });
              successMessage = 'Fuel log saved successfully.';
            }

            console.log('API Response:', response);
            // Parse response status
            const parsed = parseEventResultRow(response);
            const responseStatus = String(parsed?.Status ?? parsed?.status ?? 'Success').toLowerCase();
            const responseMsg = parsed?.Reasons ?? parsed?.reasons ?? parsed?.Msg ?? parsed?.MsgData ?? parsed?.msg ?? parsed?.Message ?? parsed?.message ?? successMessage;

            if (responseStatus === 'error' || responseStatus === 'fail') {
              showToast(responseMsg, 'error');
            } else {
              showToast(responseMsg, 'success');
              setRefreshCounter(prev => prev + 1);
            }
          } catch (error) {
            console.error('Error submitting sheet action:', error);
            showToast(error.message || String(error), 'error');
          }
        }}
      />

      {/* SOS Emergency Drawer */}
      <SosTriggerDrawer
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        onSubmit={handleSosSubmit}
        user={user}
        machine={selectedMachine}
      />

      {/* Broadcast Announcement Drawer */}
      <BroadcastComposerDrawer
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        onSubmit={handleBroadcastSubmit}
        user={user}
      />

      {/* Notifications Center Drawer */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onSelectNotification={notif => {
          setIsNotificationsOpen(false);
          if (notif.type === 'sos') setIsSosOpen(true);
          if (notif.type === 'broadcast') setIsBroadcastOpen(true);
        }}
      />

      {/* Role Toggle */}
      {screen !== 'splash' && (
        <TouchableOpacity style={styles.roleToggle} onPress={toggleRole}>
          <Text style={styles.roleToggleText}>{roleType === 'operator' ? 'Switch to Incharge' : 'Switch to Operator'}</Text>
        </TouchableOpacity>
      )}

      {/* Global Toast Notification Overlay */}
      <CustomToast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerSplash: {
    backgroundColor: '#011936',
    paddingTop: 0,
  },
  main: {
    flex: 1,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 8,
  },
  bottomNavContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 60,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  navProfileAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  navProfileAvatarActive: {
    borderColor: '#FFFFFF',
  },
  navAvatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  activeNavItemBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  navLabel: {
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  centerPlusBtnWrap: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
  },
  centerPlusCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#004BB8',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  roleToggle: {
    position: 'absolute',
    bottom: 92,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 999,
    elevation: 6,
  },
  roleToggleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  plusMenuContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  plusMenuContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  plusMenuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
    textAlign: 'center',
  },
  plusMenuOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  plusMenuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  plusMenuOptionTextWrap: {
    flex: 1,
  },
  plusMenuOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  plusMenuOptionSub: {
    fontSize: 12,
    color: '#64748B',
  },
  plusMenuCancelBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusMenuCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
