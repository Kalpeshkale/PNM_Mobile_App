import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { ChevronLeft, Truck, Calendar, Layers, Activity, FileText } from 'lucide-react-native';

export default function ConcreteEntryScreen({ equipment = [], onBack }) {
  const [transitMixer, setTransitMixer] = useState('');
  const [pourQty, setPourQty] = useState('');
  const [concreteGrade, setConcreteGrade] = useState('M25');
  const [pourLocation, setPourLocation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter only Transit Mixer assets from equipment
  const mixers = equipment.filter(e => 
    e.type?.toLowerCase().includes('mixer') || 
    e.id?.toLowerCase().includes('tm') ||
    e.label?.toLowerCase().includes('mixer')
  );

  const handleSubmit = () => {
    if (!transitMixer) {
      Alert.alert('Validation Error', 'Please select a Transit Mixer.');
      return;
    }
    if (!pourQty || isNaN(parseFloat(pourQty)) || parseFloat(pourQty) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid pour quantity (cubic meters).');
      return;
    }
    if (!pourLocation.trim()) {
      Alert.alert('Validation Error', 'Please enter a pour location/structure.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert('Success', 'Concrete Pour Log added successfully.', [
        { text: 'OK', onPress: onBack }
      ]);
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <ChevronLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Concrete Entry</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Record Concrete Pouring</Text>

            {/* Transit Mixer Selection */}
            <Text style={styles.inputLabel}>Transit Mixer *</Text>
            <View style={styles.mixerOptionsWrap}>
              {mixers.length > 0 ? (
                mixers.map(m => {
                  const isSelected = transitMixer === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.mixerOptionCard, isSelected && styles.mixerOptionSelected]}
                      onPress={() => setTransitMixer(m.id)}
                    >
                      <Truck size={18} color={isSelected ? '#005BE3' : '#64748B'} />
                      <Text style={[styles.mixerOptionText, isSelected && styles.mixerOptionTextSelected]}>{m.id}</Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.noMixersText}>No Transit Mixers active on site.</Text>
              )}
            </View>

            {/* Pour Quantity */}
            <Text style={styles.inputLabel}>Pour Quantity (m) *</Text>
            <TextInput
              keyboardType="numeric"
              placeholder="e.g. 12.5"
              placeholderTextColor="#94A3B8"
              value={pourQty}
              onChangeText={setPourQty}
              style={styles.textInput}
            />

            {/* Concrete Grade */}
            <Text style={styles.inputLabel}>Concrete Grade</Text>
            <View style={styles.gradeOptionsWrap}>
              {['M20', 'M25', 'M30', 'M35', 'M40'].map(grade => {
                const isSelected = concreteGrade === grade;
                return (
                  <TouchableOpacity
                    key={grade}
                    style={[styles.gradeOption, isSelected && styles.gradeOptionSelected]}
                    onPress={() => setConcreteGrade(grade)}
                  >
                    <Text style={[styles.gradeText, isSelected && styles.gradeTextSelected]}>{grade}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Location / Structure */}
            <Text style={styles.inputLabel}>Pour Location / Structure *</Text>
            <TextInput
              placeholder="e.g. Pillar 12 foundation or Deck slab A"
              placeholderTextColor="#94A3B8"
              value={pourLocation}
              onChangeText={setPourLocation}
              style={styles.textInput}
            />

            {/* Remarks */}
            <Text style={styles.inputLabel}>Remarks / Slump Value (mm)</Text>
            <TextInput
              placeholder="e.g. Slump 110mm, smooth pouring"
              placeholderTextColor="#94A3B8"
              value={remarks}
              onChangeText={setRemarks}
              style={[styles.textInput, styles.textArea]}
              multiline
              numberOfLines={3}
            />

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Pour Log</Text>
              )}
            </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    marginTop: 14,
  },
  mixerOptionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  mixerOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  mixerOptionSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#005BE3',
  },
  mixerOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  mixerOptionTextSelected: {
    color: '#005BE3',
  },
  noMixersText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  gradeOptionsWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  gradeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    height: 40,
  },
  gradeOptionSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#005BE3',
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  gradeTextSelected: {
    color: '#005BE3',
  },
  submitBtn: {
    backgroundColor: '#005BE3',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
