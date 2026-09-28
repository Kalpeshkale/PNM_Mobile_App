import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Platform, UIManager, LayoutAnimation } from 'react-native';
import { Truck, Grid, MapPin, User, Plus, Settings, Wrench, Fuel, Info, Camera, Upload, X } from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function EquipmentLogCard({ machine, onAction, onInfo }) {
  if (!machine) return null;

  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [hmrInput, setHmrInput] = useState('');
  const [kmrInput, setKmrInput] = useState('');
  const [photoAttached, setPhotoAttached] = useState(false);

  const statusLower = (machine.status || 'idle').toLowerCase();
  const isWorking = statusLower === 'working';
  const isBreakdown = statusLower === 'breakdown';
  const isMaintenance = statusLower === 'under maintenance' || statusLower === 'maintenance';
  const isIdle = statusLower === 'idle';
  const isOwned = (machine.ownership || (machine.hired ? 'hired' : 'owned')).toLowerCase() === 'owned';
  const ownership = isOwned ? 'Owned' : 'Hired';

  const isDualReading = (machine.kmr !== undefined && machine.kmr !== null) || (machine.id || '').toUpperCase().includes('TM') || (machine.label || '').toUpperCase().includes('TRANSIT');

  // Format reading value
  const hmrVal = machine.hmr !== undefined ? machine.hmr : machine.reading;
  const kmrVal = machine.kmr;

  const handleToggleInput = (actionType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (!isInputExpanded) {
      setHmrInput(hmrVal ? String(hmrVal) : '');
      setKmrInput(kmrVal ? String(kmrVal) : '');
      setIsInputExpanded(true);
    } else {
      setIsInputExpanded(false);
    }
  };

  const handleSubmitReading = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (onAction) {
      const act = isWorking ? 'stop' : 'start';
      onAction(act, {
        ...machine,
        hmr: hmrInput ? parseFloat(hmrInput) : hmrVal,
        kmr: kmrInput ? parseFloat(kmrInput) : kmrVal,
        photoAttached,
      });
    }
    setIsInputExpanded(false);
  };

  // Colors matching web app (LogsModule.css)
  const headerBg = isOwned ? '#D6EDFF' : '#F3E4D9';
  const titleColor = isOwned ? '#1C4A77' : '#7C2D12';
  const barColor = isOwned ? '#1D4ED8' : '#C2410C';
  const readingColor = isOwned ? '#1D4ED8' : '#C2410C';

  // Status Badge styles
  let badgeBg = '#64748B';
  let badgeTextColor = '#FFFFFF';
  let statusText = (machine.status || 'IDLE').toUpperCase();
  if (isWorking) {
    badgeBg = '#16A34A';
    statusText = 'WORKING';
  } else if (isBreakdown) {
    badgeBg = '#DC2626';
    statusText = 'BREAKDOWN';
  } else if (isMaintenance) {
    badgeBg = '#FACC15';
    badgeTextColor = '#111827';
    statusText = 'MAINTENANCE';
  }

  const mainReading = hmrVal !== undefined && hmrVal !== null ? hmrVal : (kmrVal || 0);
  const formattedReading = Number(mainReading).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const unit = machine.unit || (machine.hmr !== undefined ? 'HMR' : 'KMR');
  const statusLeftBorderColor = isWorking
    ? '#16A34A'
    : isBreakdown
    ? '#DC2626'
    : isIdle
    ? '#E8922C'
    : '#2563EB';

  return (
    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: statusLeftBorderColor }]}>
      {/* Header Bar */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Truck size={14} color={titleColor} />
          </View>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: titleColor }]}>{machine.id || machine.code}</Text>
            <View style={styles.ownBadge}>
              <Text style={styles.ownBadgeText}>{ownership}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statusWrap}>
          {(isWorking || isBreakdown) && (
            <View style={[styles.pulseDot, { backgroundColor: isBreakdown ? '#DC2626' : '#16A34A' }]} />
          )}
          <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.statusBadgeText, { color: badgeTextColor }]}>{statusText}</Text>
          </View>
        </View>
      </View>

      {/* Main Body */}
      <View style={styles.body}>
        <View style={styles.bodyTop}>
          {/* Left Meta Details */}
          <View style={styles.metaCol}>
            <View style={styles.metaRow}>
              <Grid size={13} color="#94A3B8" />
              <Text style={styles.metaText} numberOfLines={1}>
                {machine.label || machine.type || 'Equipment'}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <MapPin size={13} color="#94A3B8" />
              <Text style={styles.metaText} numberOfLines={1}>
                {machine.site || 'Site Location'}
              </Text>
            </View>
          </View>

          {/* Right Reading Column */}
          <View style={styles.readingCol}>
            <View style={[styles.verticalBar, { backgroundColor: barColor }]} />
            <View style={styles.readingStack}>
              <Text style={styles.readingLabel}>READING</Text>
              <Text style={[styles.readingValue, { color: readingColor }]}>
                {formattedReading} <Text style={styles.readingUnit}>{unit}</Text>
              </Text>
              <Text style={styles.sinceLabel}>SINCE</Text>
              <Text style={styles.sinceValue}>
                {machine.since || 'Today'}
              </Text>
            </View>
          </View>
        </View>

        {/* Operator Row */}
        <View style={styles.operatorRow}>
          <User size={13} color="#94A3B8" />
          <Text style={styles.operatorText} numberOfLines={1}>
            {machine.operator || machine.assignedOperator || 'Unassigned'}
          </Text>
        </View>

        {/* Inline Reading & Camera Input Bar (Matches Screenshots 1 & 2) */}
        {isInputExpanded && (
          <View style={styles.inlineFormContainer}>
            {isDualReading ? (
              /* Dual Reading Form (Screenshot 2) */
              <View style={styles.dualFormBox}>
                <View style={styles.dualInputsRow}>
                  <TextInput
                    style={[styles.inlineInputField, { flex: 1 }]}
                    placeholder="HMR"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={hmrInput}
                    onChangeText={setHmrInput}
                  />
                  <TextInput
                    style={[styles.inlineInputField, { flex: 1 }]}
                    placeholder="KMR"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={kmrInput}
                    onChangeText={setKmrInput}
                  />
                </View>

                <View style={styles.dualButtonsRow}>
                  <TouchableOpacity
                    style={[styles.dualBtn, photoAttached && styles.dualBtnActive]}
                    onPress={() => setPhotoAttached(!photoAttached)}
                  >
                    <Camera size={13} color={photoAttached ? "#16A34A" : "#64748B"} />
                    <Text style={[styles.dualBtnText, photoAttached && { color: "#16A34A" }]}>
                      {photoAttached ? "Camera " : "Camera"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dualBtn, styles.dualUploadBtn]}
                    onPress={handleSubmitReading}
                  >
                    <Upload size={13} color="#334155" />
                    <Text style={styles.dualBtnText}>Upload</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dualBtn, styles.dualCancelBtn]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setIsInputExpanded(false);
                    }}
                  >
                    <X size={13} color="#DC2626" />
                    <Text style={[styles.dualBtnText, { color: "#DC2626" }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Single Reading Bar (Screenshot 1) */
              <View style={styles.singleFormBox}>
                <TextInput
                  style={styles.singleInputField}
                  placeholder={machine.kmr !== undefined ? "KMR" : "HMR"}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={hmrInput}
                  onChangeText={setHmrInput}
                />
                <View style={styles.singleActionGroup}>
                  <TouchableOpacity
                    style={styles.singleIconButton}
                    onPress={() => setPhotoAttached(!photoAttached)}
                  >
                    <Camera size={15} color={photoAttached ? "#16A34A" : "#64748B"} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.singleIconButton} onPress={handleSubmitReading}>
                    <Upload size={15} color="#334155" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.singleIconButton}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setIsInputExpanded(false);
                    }}
                  >
                    <X size={15} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons Footer */}
        <View style={styles.actionsBar}>
          {/* Main Status Toggle Button */}
          {isBreakdown ? (
            <TouchableOpacity
              style={[styles.mainBtn, styles.mainBtnMuted]}
              onPress={() => onAction && onAction('end_breakdown', machine)}
            >
              <Text style={styles.mainBtnTextMuted}>End Breakdown</Text>
            </TouchableOpacity>
          ) : isMaintenance ? (
            <TouchableOpacity
              style={[styles.mainBtn, styles.mainBtnMuted]}
              onPress={() => onAction && onAction('end_maintenance', machine)}
            >
              <Text style={styles.mainBtnTextMuted}>End Maintenance</Text>
            </TouchableOpacity>
          ) : isWorking ? (
            <TouchableOpacity
              style={[styles.mainBtn, styles.stopBtn]}
              onPress={() => handleToggleInput('stop')}
            >
              <Text style={styles.stopBtnText}>STOP</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.mainBtn, styles.startBtn]}
              onPress={() => handleToggleInput('start')}
            >
              <Text style={styles.startBtnText}>START</Text>
            </TouchableOpacity>
          )}

          {/* Right Quick Icon Action Group */}
          <View style={styles.quickIconGroup}>
            {!isWorking && !isBreakdown && !isMaintenance && (
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: '#1E293B' }]}
                onPress={() => handleToggleInput('log')}
              >
                <Plus size={15} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {!isMaintenance && !isBreakdown && (
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: '#FACC15' }]}
                onPress={() => onAction && onAction('maintenance', machine)}
              >
                <Settings size={15} color="#111827" />
              </TouchableOpacity>
            )}
            {!isMaintenance && !isBreakdown && (
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: '#DC2626' }]}
                onPress={() => onAction && onAction('breakdown', machine)}
              >
                <Wrench size={15} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: '#0284C7' }]}
              onPress={() => onAction && onAction('fuel', machine)}
            >
              <Fuel size={15} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: '#64748B' }]}
              onPress={() => onInfo && onInfo(machine)}
            >
              <Info size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    marginBottom: 16,
    // Web shadow
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 16,
  },
  ownBadge: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  ownBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#334155',
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  body: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bodyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metaCol: {
    flex: 1,
    gap: 4,
    paddingRight: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  readingCol: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minWidth: 115,
  },
  verticalBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 8,
  },
  readingStack: {
    justifyContent: 'center',
  },
  readingLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  readingValue: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  readingUnit: {
    fontSize: 10,
    fontWeight: '400',
    color: '#64748B',
  },
  sinceLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  sinceValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  operatorText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  mainBtn: {
    flex: 1,
    height: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  startBtn: {
    backgroundColor: '#16A34A',
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  stopBtn: {
    backgroundColor: '#DC2626',
  },
  stopBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  mainBtnMuted: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  mainBtnTextMuted: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 11.5,
  },
  quickIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineFormContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  singleFormBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#94A3B8',
    borderRadius: 8,
    paddingLeft: 10,
    height: 38,
  },
  singleInputField: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  singleActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  singleIconButton: {
    paddingHorizontal: 10,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  dualFormBox: {
    gap: 8,
  },
  dualInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineInputField: {
    height: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 12.5,
    color: '#0F172A',
  },
  dualButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dualBtn: {
    flex: 1,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#94A3B8',
    borderRadius: 6,
    gap: 4,
  },
  dualBtnActive: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  dualUploadBtn: {
    backgroundColor: '#F8FAFC',
    borderColor: '#64748B',
  },
  dualCancelBtn: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  dualBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
}