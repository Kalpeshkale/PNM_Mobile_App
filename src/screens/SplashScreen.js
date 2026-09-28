import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { LogIn, ShieldCheck } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onContinue }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (onContinue) onContinue();
    }, 600);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.contentWrap}>
        {/* Centered Brand Logo */}
        <View style={styles.brandBox}>
          <View style={styles.logoSquare}>
            <Image source={require('../assets/logo_gear.png')} style={styles.splashGearLogo} resizeMode="contain" />
          </View>
          <Text style={styles.appTitle}>PLANT & MACHINERY</Text>
          <Text style={styles.appSub}>Equipment Operations & Site Management</Text>
        </View>

        {/* Bottom Login Button */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.88}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#002B66" />
            ) : (
              <>
                <LogIn size={20} color="#002B66" />
                <Text style={styles.loginBtnText}>Login With MIS</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footerText}>Rohan Builders  Authorized MIS SSO</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#011936', // Darwinbox deep navy background
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 48,
  },
  brandBox: {
    alignItems: 'center',
    gap: 12,
  },
  logoSquare: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  splashGearLogo: {
    width: 48,
    height: 48,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  appSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  loginBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  loginBtnText: {
    color: '#002B66',
    fontSize: 16,
    fontWeight: '800',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontWeight: '500',
  },
});
