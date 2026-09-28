import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Image, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { Truck, User, Calendar, ChevronRight, Plus, Fuel, MapPin, Activity, AlertTriangle, Bell, Megaphone, ShieldAlert, Clock, Monitor, CheckCircle2, BarChart2 } from 'lucide-react-native';
import Svg, { Rect, Line, Text as SvgText, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { StatusPill, Dial } from '../components/Atoms';
import { getOperatorDashboard } from '../services/api';

export default function OperatorDashboard({
  user,
  equipment,
  onNavigate,
  onOpenSheet,
  onOpenNotifications,
  onTriggerSos,
  onOpenBroadcast,
  unreadCount = 7,
}) {
  const [sosHoldSecs, setSosHoldSecs] = React.useState(0);
  const holdIntervalRef = React.useRef(null);

  const handleSosPressIn = () => {
    setSosHoldSecs(3);
    let current = 3;
    holdIntervalRef.current = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(holdIntervalRef.current);
        setSosHoldSecs(0);
        if (onTriggerSos) onTriggerSos();
      } else {
        setSosHoldSecs(current);
      }
    }, 1000);
  };

  const handleSosPressOut = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setSosHoldSecs(0);
  };

  // 1. Filter operator's assigned machines (max 1 to 4 machines, usually 1)
  const assignedMachines = useMemo(() => {
    if (!equipment || equipment.length === 0) return [];
    
    // Filter machines matching user's assigned machine ID or assigned operator
    const filtered = equipment.filter(e => 
      e.id === user?.assignedMachineId || 
      String(e.operatorId) === String(user?.id) ||
      (e.assignedOperator && String(e.assignedOperator).toLowerCase().includes(String(user?.name || '').toLowerCase()))
    );

    return filtered.length > 0 ? filtered.slice(0, 4) : equipment.slice(0, 3);
  }, [equipment, user]);

  const [selectedMachineId, setSelectedMachineId] = useState(null);

  useEffect(() => {
    if (assignedMachines.length > 0 && !selectedMachineId) {
      setSelectedMachineId(assignedMachines[0].id);
    }
  }, [assignedMachines]);

  const currentActiveMachine = assignedMachines.find(m => m.id === selectedMachineId) || assignedMachines[0] || equipment[0];

  const [dashboardLogs, setDashboardLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    let mounted = true;
    const opId = parseInt(String(user?.id || user?.empId || '').replace(/[^0-9]/g, ''), 10) || 0;
    
    getOperatorDashboard({ operatorId: opId })
      .then((data) => {
        if (mounted) {
          setDashboardLogs(data || []);
        }
      })
      .catch((err) => {
        console.warn('Error fetching operator dashboard:', err);
      })
      .finally(() => {
        if (mounted) setLoadingLogs(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  // 2. Generate 7-Day Chart Bars for the selected machine
  const chartDays = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const result = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayName = days[(d.getDay() + 6) % 7];
      const dateNo = d.getDate();

      let hours = 0;
      const matched = dashboardLogs.find(l => {
        try {
          return new Date(l.WorkDate).toDateString() === d.toDateString();
        } catch {
          return false;
        }
      });

      if (matched) {
        hours = parseFloat(matched.WorkHours || 0);
      } else {
        // Mock fallback hours for realistic demonstration
        const machineCharCode = currentActiveMachine?.id ? String(currentActiveMachine.id).charCodeAt(0) : 5;
        const seed = (d.getDate() + machineCharCode + i) % 5;
        if (i === 0) hours = (currentActiveMachine?.status || '').toLowerCase() === 'working' ? 5.5 : 0;
        else if (seed === 0) hours = 8.5;
        else if (seed === 1) hours = 7.2;
        else if (seed === 2) hours = 9.0;
        else if (seed === 3) hours = 8.0;
        else hours = 6.5;
      }

      result.push({
        dayLabel: dayName,
        dateNo,
        hours: Math.min(hours, 12),
        isToday: i === 0,
      });
    }
    return result;
  }, [dashboardLogs, currentActiveMachine]);

  const totalWeeklyHours = chartDays.reduce((acc, curr) => acc + curr.hours, 0);
  const avgDailyHours = (totalWeeklyHours / 7).toFixed(1);
  const onTrackPercent = Math.min(Math.round((totalWeeklyHours / (7 * 8)) * 100), 100);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', emoji: '' };
    if (hour < 17) return { text: 'Good afternoon', emoji: '' };
    return { text: 'Good evening', emoji: '' };
  };
  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {/* Top App Header (Darwinbox Style) */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../assets/pnm_full_logo.png')}
              style={styles.brandFullLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerRightActions}>
            {/*  SOS Hold Icon */}
            <TouchableOpacity
              style={[styles.sosHeaderBtnIcon, sosHoldSecs > 0 && styles.sosHeaderBtnHolding]}
              onPressIn={handleSosPressIn}
              onPressOut={handleSosPressOut}
              activeOpacity={0.8}
            >
              {sosHoldSecs > 0 ? (
                <Text style={styles.sosHoldSecsText}>{sosHoldSecs}s</Text>
              ) : (
                <ShieldAlert size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            {/*  Notifications Bell Icon */}
            <TouchableOpacity style={styles.notifHeaderBtn} onPress={onOpenNotifications}>
              <Bell size={20} color="#0F172A" />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.welcomeDirectGroup}>
            <View style={styles.welcomeTextColumn}>
              <Text style={styles.welcomeGreeting}>{greeting.text}, {user?.name ? user.name.split(' ')[0] : 'Kalpesh'} {greeting.emoji}</Text>
              <View style={styles.siteLocationRow}>
                <MapPin size={14} color="#64748B" />
                <Text style={styles.siteLocationText}>{user?.site || 'Rohan Riviera Site'}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.avatarTouchable} onPress={() => onNavigate && onNavigate('profile')} activeOpacity={0.85}>
              <Image
                source={{ uri: user?.photoUrl || user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Kalpesh Kale')}&background=0284c7&color=fff&size=200` }}
                style={styles.operatorAvatarImg}
              />
              <View style={styles.onlineBadgeDot} />
            </TouchableOpacity>
          </View>

          

          {/* Logs Timeline Card */}
          <View style={styles.logsCard}>
            <View style={styles.logsCardHeader}>
              <View style={styles.cardTitleBox}>
                <Calendar size={16} color="#E8922C" />
                <Text style={styles.cardTitle}>My Logs  Last 4 Days</Text>
              </View>
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => onNavigate("plant")}>
                <Text style={styles.viewAllText}>View All</Text>
                <ChevronRight size={14} color="#0284C7" />
              </TouchableOpacity>
            </View>

            {loadingLogs ? (
              <View style={styles.logsLoaderBox}>
                <ActivityIndicator size="small" color="#0052CC" />
                <Text style={styles.logsLoaderText}>Loading logs...</Text>
              </View>
            ) : dashboardLogs.length === 0 ? (
              <View style={styles.logsEmptyBox}>
                <Text style={styles.logsEmptyText}>No work logs recorded recently.</Text>
              </View>
            ) : (
              <View style={styles.logsGrid}>
                {dashboardLogs.map((log, index) => {
                  // Determine day label
                  let dayLabel = '';
                  try {
                    const d = new Date(log.WorkDate);
                    const today = new Date();
                    if (d.toDateString() === today.toDateString()) {
                      dayLabel = 'Today';
                    } else {
                      dayLabel = String(log.DayName || '').substring(0, 3);
                    }
                  } catch {
                    dayLabel = String(log.DayName || '').substring(0, 3);
                  }

                  // Determine month
                  let monthLabel = 'AUG';
                  try {
                    const d = new Date(log.WorkDate);
                    if (!isNaN(d.getTime())) {
                      const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                      monthLabel = months[d.getMonth()];
                    }
                  } catch {}

                  // Determine badge, color, status
                  let badge = 'MISSED';
                  let statusColor = '#DC2626'; // Red
                  
                  if (log.Status === 'Completed') {
                    if (parseFloat(log.WorkHours || 0) >= 8.0) {
                      badge = 'OK';
                      statusColor = '#16A34A'; // Green
                    } else {
                      badge = 'PART';
                      statusColor = '#E8922C'; // Orange
                    }
                  } else {
                    // Not Logged. Check if it's today.
                    let isToday = false;
                    try {
                      isToday = new Date(log.WorkDate).toDateString() === new Date().toDateString();
                    } catch {}
                    if (isToday) {
                      badge = 'PEND';
                      statusColor = '#64748B'; // Slate
                    } else {
                      badge = 'MISSED';
                      statusColor = '#DC2626'; // Red
                    }
                  }

                  const hoursText = parseFloat(log.WorkHours || 0) > 0 
                    ? `${parseFloat(log.WorkHours).toFixed(1)} hrs`
                    : 'Not Logged';

                  return (
                    <View key={`log_${index}`} style={[styles.logItem, { borderColor: statusColor + '40' }]}>
                      <Text style={[styles.logDay, { color: statusColor }]}>{dayLabel}</Text>
                      <Text style={styles.logDate}>{log.DayNo || '-'}</Text>
                      <Text style={styles.logMonth}>{monthLabel}</Text>
                      <View style={[styles.logStatusCircle, { backgroundColor: statusColor }]}>
                         <Text style={styles.logBadgeText}>{badge}</Text>
                      </View>
                      <Text style={[styles.logHours, { color: statusColor }]}>{hoursText}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/*  Machine Utilization & Daily Working Hours Chart Card */}
          <View style={styles.chartCard}>
            <View style={styles.chartCardHeader}>
              <View style={styles.chartTitleGroup}>
                <BarChart2 size={18} color="#0284C7" />
                <Text style={styles.chartCardTitle}>Machine Utilization & Hours</Text>
              </View>
            </View>

            {/* Machine Selection Pills (if operator has multiple assigned machines, 1-4) */}
            {assignedMachines.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.machinePillsScroll} contentContainerStyle={styles.machinePillsContainer}>
                {assignedMachines.map((m) => {
                  const isSel = m.id === currentActiveMachine?.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.machinePill, isSel && styles.machinePillActive]}
                      onPress={() => setSelectedMachineId(m.id)}
                    >
                      <Truck size={12} color={isSel ? '#FFFFFF' : '#475569'} />
                      <Text style={[styles.machinePillText, isSel && styles.machinePillTextActive]}>
                        {m.assetName || m.code || m.id}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Selected Machine Detail Strip */}
            <View style={styles.machineDetailStrip}>
              <View style={styles.machineDetailLeft}>
                <Text style={styles.machineDetailCode}>{currentActiveMachine?.assetName || currentActiveMachine?.code || 'JSWMHR-BL-005'}</Text>
                <Text style={styles.machineDetailCategory}>{currentActiveMachine?.category || 'BACKHOE & LOADER'}</Text>
              </View>
              <StatusPill status={currentActiveMachine?.status || 'working'} />
            </View>

            {/* SVG Bar Chart */}
            <View style={styles.svgContainer}>
              <Svg height="170" width="100%" viewBox="0 0 320 170">
                <Defs>
                  <LinearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#16A34A" stopOpacity="1" />
                    <Stop offset="1" stopColor="#4ADE80" stopOpacity="0.85" />
                  </LinearGradient>
                  <LinearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#EA580C" stopOpacity="1" />
                    <Stop offset="1" stopColor="#FB923C" stopOpacity="0.85" />
                  </LinearGradient>
                  <LinearGradient id="mutedGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#CBD5E1" stopOpacity="1" />
                    <Stop offset="1" stopColor="#E2E8F0" stopOpacity="0.85" />
                  </LinearGradient>
                </Defs>

                {/* Target Benchmark Line at 8.0h */}
                <Line x1="10" y1="45" x2="310" y2="45" stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth="1.5" />
                <SvgText x="305" y="40" fontSize="9" fill="#94A3B8" textAnchor="end" fontWeight="bold">8h Target</SvgText>

                {/* 7 Daily Bars */}
                {chartDays.map((d, idx) => {
                  const barWidth = 28;
                  const gap = 14;
                  const startX = 18 + idx * (barWidth + gap);
                  
                  const maxH = 90;
                  const barH = Math.max((d.hours / 10) * maxH, d.hours > 0 ? 10 : 4);
                  const barY = 125 - barH;

                  let fillGrad = "url(#greenGrad)";
                  let textColor = "#16A34A";
                  if (d.hours === 0) {
                    fillGrad = "url(#mutedGrad)";
                    textColor = "#94A3B8";
                  } else if (d.hours < 8) {
                    fillGrad = "url(#orangeGrad)";
                    textColor = "#EA580C";
                  }

                  return (
                    <G key={`bar_${idx}`}>
                      <SvgText
                        x={startX + barWidth / 2}
                        y={barY - 6}
                        fontSize="9.5"
                        fontWeight="700"
                        fill={textColor}
                        textAnchor="middle"
                      >
                        {d.hours > 0 ? `${d.hours.toFixed(1)}h` : '0h'}
                      </SvgText>

                      <Rect
                        x={startX}
                        y={barY}
                        width={barWidth}
                        height={barH}
                        rx="5"
                        fill={fillGrad}
                      />

                      <SvgText
                        x={startX + barWidth / 2}
                        y="145"
                        fontSize="10.5"
                        fontWeight={d.isToday ? "800" : "600"}
                        fill={d.isToday ? "#0F172A" : "#64748B"}
                        textAnchor="middle"
                      >
                        {d.dayLabel}
                      </SvgText>

                      <SvgText
                        x={startX + barWidth / 2}
                        y="158"
                        fontSize="9"
                        fontWeight="500"
                        fill="#94A3B8"
                        textAnchor="middle"
                      >
                        {d.dateNo}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            </View>
          </View>

          {/* End of Content */}
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
  content: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandFullLogo: {
    height: 36,
    width: 175,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroBannerCard: {
    backgroundColor: '#EAF3FF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D0E3FF',
  },
  heroTextGroup: {
    gap: 6,
  },
  welcomeGreeting: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  welcomeSubtext: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
    lineHeight: 18,
  },
  punchStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#93C5FD',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#0052CC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  pinkClockCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  punchTextGroup: {
    flex: 1,
    gap: 2,
  },
  punchTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  punchSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllTextLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyTaskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 16,
  },
  monitorIllustBox: {
    width: 80,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  checkCircleBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTasksTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  sosHeaderBtnIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  sosHeaderBtnHolding: {
    backgroundColor: '#991B1B',
  },
  sosHoldSecsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  broadcastHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#1D4ED8',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  profileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 14,
    paddingBottom: 120,
  },
  welcomeDirectGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 0,
    paddingVertical: 6,
    marginBottom: 16,
  },
  avatarTouchable: {
    position: 'relative',
  },
  operatorAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#0284C7',
    backgroundColor: '#E0F2FE',
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  welcomeTextColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeSmall: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  welcomeLarge: {
    color: '#0F172A',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 1,
  },
  siteLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  siteLocationText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  statsBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  statBoxWorking: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  statBoxIdle: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  statBoxBreakdown: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  viewLogBoardText: {
    color: '#0284C7',
    fontSize: 12.5,
    fontWeight: '600',
  },
  machineSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  machineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  machineTitleBox: {
    flex: 1,
  },
  machineSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  machineCode: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  gaugesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  gaugeCard: {
    flex: 1,
  },
  gaugeLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  fuelWrap: {
    gap: 4,
  },
  fuelValText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0284C7',
  },
  fuelBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fuelBarFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 3,
  },
  logsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  logsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '600',
  },
  logsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  logItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  logDay: {
    fontSize: 11,
    fontWeight: '700',
  },
  logDate: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  logMonth: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  logStatusCircle: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginVertical: 4,
  },
  logBadgeText: {
    fontSize: 7.5,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  logHours: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  actionBtnDailyLog: {
    backgroundColor: '#16A34A',
  },
  actionBtnFuel: {
    backgroundColor: '#0284C7',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  logsLoaderBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logsLoaderText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  logsEmptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logsEmptyText: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  logsVerticalList: {
    gap: 10,
  },
  dashboardLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  dashboardLogBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dashboardLogLeft: {
    gap: 2,
  },
  dashboardLogAsset: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dashboardLogTime: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  dashboardLogRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dashboardLogTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dashboardLogTagText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dashboardLogQty: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  chartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chartTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  targetBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  machinePillsScroll: {
    marginBottom: 12,
  },
  machinePillsContainer: {
    gap: 8,
  },
  machinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  machinePillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  machinePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  machinePillTextActive: {
    color: '#FFFFFF',
  },
  machineDetailStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  machineDetailLeft: {
    gap: 2,
  },
  machineDetailCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  machineDetailCategory: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  chartMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  metricBox: {
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E9D5FF',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  chartFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  insightBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 15,
  },
  addLogChartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    elevation: 2,
  },
  addLogChartBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
