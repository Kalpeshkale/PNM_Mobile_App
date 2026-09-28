import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, SafeAreaView, Image, Alert } from 'react-native';
import { User, HelpCircle, Settings, PhoneCall, ShieldCheck, FileText, LogOut, ChevronRight, MapPin, ChevronLeft, Upload, Trash2, Camera } from 'lucide-react-native';
import { ConstructionPattern } from '../components/ConstructionPattern';

export default function ProfileScreen({ user, onBack, onLogout }) {
  const [showProfileDetails, setShowProfileDetails] = useState(false);

  const profileData = {
    name: user?.name || 'Kalpesh Kale',
    empId: user?.empId || '02509',
    badge: 'Plant Operator',
    role: 'Equipment Operator',
    site: user?.site || 'Rohan Riviera Site',
    email: user?.email || 'kalpesh.kale@rohanbuilders.com',
    phone: user?.phone || '+91 98765 43210',
    emergencyContact: user?.emergencyContact || '+91 91234 56789 (Family)',
    photoUrl: 'https://ui-avatars.com/api/?name=Kalpesh+Kale&background=0052cc&color=fff&size=250',
  };

  const [documents, setDocuments] = useState({
    drivingLicence: null,
    aadharCard: null,
    panCard: null,
  });

  const [photoUrl, setPhotoUrl] = useState(
    'https://ui-avatars.com/api/?name=Kalpesh+Kale&background=0052cc&color=fff&size=250'
  );

  const handleChangePhoto = () => {
    Alert.alert(
      'Profile Photo',
      'Choose an option to update your profile photo',
      [
        {
          text: 'Take Photo (Camera)',
          onPress: () => {
            setPhotoUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&fit=crop&q=80');
            Alert.alert('Success', 'Profile photo updated from Camera.');
          }
        },
        {
          text: 'Choose from Gallery',
          onPress: () => {
            setPhotoUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&fit=crop&q=80');
            Alert.alert('Success', 'Profile photo updated from Gallery.');
          }
        },
        {
          text: 'Remove Photo',
          style: 'destructive',
          onPress: () => {
            setPhotoUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.name)}&background=0052cc&color=fff&size=250`);
            Alert.alert('Success', 'Profile photo reset to default avatar.');
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleUpload = (docKey, docName) => {
    const mockFiles = {
      drivingLicence: 'DL_Kalpesh_Kale.pdf',
      aadharCard: 'Aadhar_Kalpesh_Kale.pdf',
      panCard: 'PAN_Kalpesh_Kale.pdf',
    };
    
    setDocuments(prev => ({
      ...prev,
      [docKey]: mockFiles[docKey]
    }));
    Alert.alert('Upload Successful', `${docName} has been uploaded successfully.`);
  };

  const handleRemove = (docKey, docName) => {
    setDocuments(prev => ({
      ...prev,
      [docKey]: null
    }));
    Alert.alert('Document Removed', `${docName} has been removed.`);
  };

  return (
    <View style={styles.container}>
      <ConstructionPattern />
      <SafeAreaView style={styles.safeArea}>
        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Main Profile Card (Darwinbox Style) */}
          <View style={styles.hubProfileCard}>
            <View style={styles.blueCardHeader} />
            <TouchableOpacity style={styles.cardAvatarWrap} onPress={handleChangePhoto} activeOpacity={0.85}>
              <Image source={{ uri: photoUrl }} style={styles.cardAvatar} />
              <View style={styles.cameraIconBadge}>
                <Camera size={12} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.cardBody}>
              <Text style={styles.userNameText}>{profileData.name}</Text>
              
              <View style={styles.badgeRow}>
                <Text style={styles.empIdText}>{profileData.empId}</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{profileData.badge}</Text>
                </View>
              </View>

              <Text style={styles.userRoleText}>{profileData.role}</Text>

              <View style={styles.siteRow}>
                <MapPin size={13} color="#16A34A" />
                <Text style={styles.siteText}>{profileData.site}</Text>
              </View>

              <TouchableOpacity
                style={styles.viewProfileBtn}
                onPress={() => setShowProfileDetails(!showProfileDetails)}
                activeOpacity={0.85}
              >
                <Text style={styles.viewProfileBtnText}>
                  {showProfileDetails ? 'Hide Profile Details' : 'View Profile Details'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Profile Details Dropdown / Expanded View */}
            {showProfileDetails && (
              <View style={styles.expandedDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailVal}>{profileData.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailVal}>{profileData.phone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Emergency Contact</Text>
                  <Text style={styles.detailVal}>{profileData.emergencyContact}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Document Uploads */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Documents</Text>
          </View>

          <View style={styles.documentsCard}>
            {[
               { key:'machinePhoto', label: 'Machine Photo' },
              { key: 'drivingLicence', label: 'Driving Licence' },
              { key: 'aadharPanCard', label: 'Aadhar Card' },
            ].map(({ key, label }, index) => {
              const file = documents[key];
              return (
                <View key={key} style={[styles.docRow, index < 2 && styles.docBorder]}>
                  <View style={styles.docLeft}>
                    <FileText size={22} color={file ? '#16A34A' : '#64748B'} />
                    <View style={styles.docTextWrap}>
                      <Text style={styles.docLabel}>{label}</Text>
                      {file ? (
                        <Text style={styles.docStatusUploaded}>Uploaded: {file}</Text>
                      ) : (
                        <Text style={styles.docStatusPending}>Not uploaded yet</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.docActions}>
                    {file ? (
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemove(key, label)}
                      >
                        <Trash2 size={16} color="#DC2626" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.uploadBtn}
                        onPress={() => handleUpload(key, label)}
                      >
                        <Upload size={14} color="#0052CC" />
                        <Text style={styles.uploadBtnText}>Upload</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Settings & Sign Out Card */}
          <View style={styles.optionsCard}>
            {/* Sign Out Option */}
            <TouchableOpacity style={styles.optionRow} onPress={onLogout}>
              <View style={styles.optionLeft}>
                <LogOut size={18} color="#DC2626" />
                <Text style={[styles.optionLabel, { color: '#DC2626' }]}>Sign Out</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  hubProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  blueCardHeader: {
    height: 80,
    backgroundColor: '#0066FF',
  },
  cardAvatarWrap: {
    alignSelf: 'center',
    marginTop: -40,
  },
  cardAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  cardBody: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  empIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  statusPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    color: '#D97706',
    fontSize: 10.5,
    fontWeight: '800',
  },
  userRoleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
  },
  siteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  siteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  viewProfileBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  viewProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  expandedDetails: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  optionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  documentsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    marginBottom: 16,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  docBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  docTextWrap: {
    flex: 1,
    gap: 2,
  },
  docLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  docStatusPending: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  docStatusUploaded: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
  },
  docActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  uploadBtnText: {
    color: '#0052CC',
    fontSize: 12,
    fontWeight: '800',
  },
  removeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0052CC',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
});
