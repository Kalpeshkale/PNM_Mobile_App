import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react-native';

export function CustomDateTimePicker({ visible, value, onChange, onClose }) {
  const parseInitialDate = (val) => {
    if (!val) return new Date();
    // Parse DD-MMM-YYYY HH:mm
    try {
      const parts = String(val).split(' ');
      const dateParts = parts[0].split('-');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const day = parseInt(dateParts[0], 10);
      const month = months.indexOf(dateParts[1]);
      const year = parseInt(dateParts[2], 10);
      
      let hour = 12;
      let minute = 0;
      if (parts[1]) {
        const timeParts = parts[1].split(':');
        hour = parseInt(timeParts[0], 10);
        minute = parseInt(timeParts[1], 10);
      }
      if (day && month >= 0 && year) {
         return new Date(year, month, day, hour, minute);
      }
    } catch {}
    return new Date();
  };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState('date'); // 'date' | 'time'
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);

  useEffect(() => {
    if (visible) {
      const initial = parseInitialDate(value);
      setCurrentDate(initial);
      setSelectedHour(initial.getHours());
      setSelectedMinute(initial.getMinutes());
      setMode('date');
    }
  }, [visible, value]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const daysArray = [];
  for (let i = 0; i < firstDay; i++) {
    daysArray.push({ day: '', empty: true });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push({ day: i, empty: false });
  }

  const handleDayPress = (day) => {
    const nextDate = new Date(year, month, day, selectedHour, selectedMinute);
    setCurrentDate(nextDate);
    setMode('time');
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1, selectedHour, selectedMinute));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1, selectedHour, selectedMinute));
  };

  const handleSave = () => {
    const finalDate = new Date(year, month, currentDate.getDate(), selectedHour, selectedMinute);
    
    // Format to DD-MMM-YYYY HH:mm
    const pad = (n) => String(n).padStart(2, '0');
    const monthsShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const formatted = `${pad(finalDate.getDate())}-${monthsShort[finalDate.getMonth()]}-${finalDate.getFullYear()} ${pad(finalDate.getHours())}:${pad(finalDate.getMinutes())}`;
    
    if (onChange) onChange(formatted);
    if (onClose) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.pickerBox}>
          {/* Header Selector */}
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {mode === 'date' ? 'Select Date' : 'Select Time'}
            </Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity 
                style={[styles.toggleBtn, mode === 'date' && styles.toggleActive]} 
                onPress={() => setMode('date')}
              >
                <Calendar size={14} color={mode === 'date' ? '#0052CC' : '#64748B'} />
                <Text style={[styles.toggleText, mode === 'date' && styles.toggleActiveText]}>Date</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, mode === 'time' && styles.toggleActive]} 
                onPress={() => setMode('time')}
              >
                <Clock size={14} color={mode === 'time' ? '#0052CC' : '#64748B'} />
                <Text style={[styles.toggleText, mode === 'time' && styles.toggleActiveText]}>Time</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Grid Render */}
          {mode === 'date' ? (
            <View style={styles.bodyContainer}>
              <View style={styles.monthRow}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow}>
                  <ChevronLeft size={20} color="#475569" />
                </TouchableOpacity>
                <Text style={styles.monthText}>{months[month]} {year}</Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
                  <ChevronRight size={20} color="#475569" />
                 </TouchableOpacity>
              </View>

              <View style={styles.weekLabelsRow}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map((l) => (
                  <Text key={l} style={styles.weekLabel}>{l}</Text>
                ))}
              </View>

              <View style={styles.grid}>
                {daysArray.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    disabled={item.empty}
                    style={[
                      styles.dayCell,
                      !item.empty && currentDate.getDate() === item.day && styles.selectedDayCell
                    ]}
                    onPress={() => handleDayPress(item.day)}
                  >
                    <Text style={[
                      styles.dayText,
                      !item.empty && currentDate.getDate() === item.day && styles.selectedDayText
                    ]}>
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.timeSelectWrap}>
              <View style={styles.timeScrollRow}>
                <View style={styles.timeColumn}>
                  <Text style={styles.columnLabel}>Hour</Text>
                  <FlatList
                    data={Array.from({ length: 24 }, (_, i) => i)}
                    keyExtractor={(i) => String(i)}
                    getItemLayout={(data, index) => ({ length: 36, offset: 36 * index, index })}
                    initialScrollIndex={selectedHour}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={[styles.timeItem, selectedHour === item && styles.selectedTimeItem]}
                        onPress={() => setSelectedHour(item)}
                      >
                        <Text style={[styles.timeItemText, selectedHour === item && styles.selectedTimeItemText]}>
                          {String(item).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    )}
                    style={styles.timeList}
                    showsVerticalScrollIndicator={false}
                  />
                </View>

                <View style={styles.timeColumn}>
                  <Text style={styles.columnLabel}>Minute</Text>
                  <FlatList
                    data={Array.from({ length: 60 }, (_, i) => i)}
                    keyExtractor={(i) => String(i)}
                    getItemLayout={(data, index) => ({ length: 36, offset: 36 * index, index })}
                    initialScrollIndex={selectedMinute}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={[styles.timeItem, selectedMinute === item && styles.selectedTimeItem]}
                        onPress={() => setSelectedMinute(item)}
                      >
                        <Text style={[styles.timeItemText, selectedMinute === item && styles.selectedTimeItemText]}>
                          {String(item).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    )}
                    style={styles.timeList}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Actions Bottom */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleSave}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyCo ntent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerBox: {
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  toggleActive: {
    backgroundColor: '#FFFFFF',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  toggleActiveText: {
    color: '#0052CC',
  },
  bodyContainer: {
    padding: 16,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthArrow: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  monthText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  weekLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: 6,
  },
  dayCell: {
    width: 41, // Approx (320px - 32px padding)/7
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  selectedDayCell: {
    backgroundColor: '#0052CC',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timeSelectWrap: {
    height: 200,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  timeScrollRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 24,
  },
  timeColumn: {
    flex: 1,
  },
  columnLabel: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  timeList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeItem: {
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTimeItem: {
    backgroundColor: '#E6F0FF',
  },
  timeItemText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  selectedTimeItemText: {
    color: '#0052CC',
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmBtn: {
    backgroundColor: '#0052CC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}