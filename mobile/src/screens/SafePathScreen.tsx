import React, { useContext, useMemo, useRef, useState, useEffect } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';
import { Colors } from '../theme/colors';

const MAP_HEIGHT_RATIO = 0.4;
const SHEET_HEIGHT_RATIO = 0.58;

const SafePathScreen: React.FC = () => {
  const { colors, toggleMode } = useContext(ThemeContext);
  const { height } = useWindowDimensions();
  const mapHeight = useMemo(() => height * MAP_HEIGHT_RATIO, [height]);
  const sheetHeight = useMemo(() => height * SHEET_HEIGHT_RATIO, [height]);
  const [activeTab, setActiveTab] = useState<'map' | 'trip' | 'safety' | 'settings'>('map');
  const sheetTranslate = useRef(new Animated.Value(sheetHeight)).current;

  const themed = useMemo(() => createThemedStyles(colors), [colors]);

  const openSheet = () => {
    Animated.timing(sheetTranslate, {
      toValue: 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(sheetTranslate, {
      toValue: sheetHeight,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  const handleNavPress = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'safety') {
      openSheet();
    } else {
      closeSheet();
    }
  };

  const [sosOpen, setSosOpen] = useState(false);
  const ripple = useRef(new Animated.Value(0)).current;

  // Language Bridge State
  const [customText, setCustomText] = useState('');
  const [translatedText, setTranslatedText] = useState('Help phrase loading...');
  const [targetLang, setTargetLang] = useState('en');

  useEffect(() => {
    const initLanguageBridge = async () => {
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        const countryCode = geoData.country;
        
        const countryToLangMap: Record<string, string> = {
          'IN': 'hi', 'FR': 'fr', 'ES': 'es', 'DE': 'de', 'IT': 'it', 'JP': 'ja', 'MX': 'es', 'BR': 'pt'
        };
        const lang = countryToLangMap[countryCode] || 'en';
        setTargetLang(lang);
        
        const defaultText = "Please help me. I am in danger. Please call an emergency.";
        if (lang === 'en') {
          setTranslatedText(defaultText);
        } else {
          const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(defaultText)}&langpair=en|${lang}`);
          const data = await res.json();
          if (data?.responseData?.translatedText) {
            setTranslatedText(data.responseData.translatedText);
          }
        }
      } catch (err) {
        setTranslatedText("Please help me. I am in danger. Please call an emergency.");
      }
    };
    initLanguageBridge();
  }, []);

  const handleTranslate = async () => {
    if (!customText.trim()) return;
    setTranslatedText('Translating...');
    if (targetLang === 'en') {
      setTranslatedText(customText);
      return;
    }
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(customText.trim())}&langpair=en|${targetLang}`);
      const data = await res.json();
      if (data?.responseData?.translatedText) {
        setTranslatedText(data.responseData.translatedText);
      } else {
        setTranslatedText(customText);
      }
    } catch (err) {
      setTranslatedText(customText);
    }
  };

  const startRipple = () => {
    ripple.setValue(0);
    Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopRipple = () => {
    ripple.stopAnimation();
  };

  const showSos = () => {
    setSosOpen(true);
    startRipple();
  };

  const hideSos = () => {
    setSosOpen(false);
    stopRipple();
  };

  const rippleScale = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1.4],
  });

  const rippleOpacity = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  return (
    <SafeAreaView style={[styles.container, themed.container]}> 
      <View style={[styles.appBar, themed.appBar]}> 
        <View style={styles.appBarLeft}>
          <View style={styles.logoCircle} />
          <Text style={[styles.appTitle, themed.appTitle]}>SafePath</Text>
        </View>
        <View style={styles.appBarRight}>
          <Pressable style={[styles.nightToggle, themed.nightToggle]} onPress={toggleMode}>
            <Text style={[styles.nightToggleText, themed.nightToggleText]}>Night Mode</Text>
          </Pressable>
          <View style={[styles.iconCircle, themed.iconCircle]} />
        </View>
      </View>

      <View style={[styles.mapWrapper, { height: mapHeight }]}> 
        <View style={styles.mapSurface}>
          <View style={styles.mapMarker}>
            <View style={styles.mapMarkerDot} />
          </View>
        </View>
        <View style={[styles.mapStatusPill, themed.mapStatusPill]}>
          <View style={styles.statusDot} />
          <Text style={[styles.mapStatusText, themed.mapStatusText]}>All systems nominal</Text>
          <Text style={[styles.chevron, themed.mapStatusText]}>›</Text>
        </View>
        <View style={styles.mapControls}>
          <ControlButton label="⌖" />
          <ControlButton label="🧭" />
          <ControlButton label="＋" />
          <ControlButton label="－" />
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        <StatusCard title="All Systems Active" subtitle="The distress button is ready" tint="green" />
        <StatusCard title="2 Contacts Pending" subtitle="2 safety contacts are pending" tint="yellow" />
        <StatusCard title="Live Tracking Enabled" subtitle="Your location is being shared" tint="blue" />

        <View style={styles.quickActions}>
          <QuickAction label="Add Contact" />
          <QuickAction label="Draw Safe Zone" />
          <QuickAction label="Start Timer" />
          <QuickAction label="Report Hazard" />
        </View>

        <View style={styles.sosHold}>
          <Text style={styles.sosHoldText}>HOLD TO SEND SOS</Text>
        </View>

        <View style={styles.monitorRow}>
          <View style={styles.monitorDot} />
          <Text style={styles.monitorText}>Safe • Monitoring Active</Text>
          <View style={styles.avatarGroup}>
            <View style={styles.avatar} />
            <View style={styles.avatar} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Trip</Text>
            <Text style={styles.sectionMeta}>No active</Text>
          </View>
          <InfoRow label="Emergency Contact" value="Watching" />
          <InfoRow label="Travel Buddy" value="Manage Safety Circle" />
          <View style={styles.sectionActions}>
            <ActionButton label="Add Contact" />
            <ActionButton label="Play Last 30s Clip" />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Language Bridge</Text>
            <Text style={styles.sectionMeta}>{targetLang.toUpperCase()}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TextInput 
              style={{ flex: 1, backgroundColor: Colors.navy800, color: Colors.white, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 }} 
              placeholder="Type message in English..." 
              placeholderTextColor={Colors.slate500}
              value={customText}
              onChangeText={setCustomText}
            />
            <Pressable style={{ backgroundColor: Colors.teal, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12 }} onPress={handleTranslate}>
              <Text style={{ color: Colors.white, fontWeight: '700' }}>Translate</Text>
            </Pressable>
          </View>
          <Text style={{ color: Colors.slate300, marginBottom: 16, lineHeight: 22 }}>{translatedText}</Text>
          <ActionButton label="Play Local Help Phrase" onPress={() => Alert.alert('TTS Module Required', 'Native Text-to-Speech requires react-native-tts module to be installed before playback will execute.')} />
        </View>
      </ScrollView>

      <View style={styles.gpsPill}>
        <Text style={styles.gpsPillText}>GPS Active • 28.4968, 77.5229</Text>
      </View>
      <Pressable style={styles.sosButton} onPress={showSos}>
        <Text style={styles.sosButtonText}>SOS</Text>
      </Pressable>

      <View style={styles.bottomNav}>
        <BottomNavItem label="Map" active={activeTab === 'map'} onPress={() => handleNavPress('map')} />
        <BottomNavItem label="Trip" active={activeTab === 'trip'} onPress={() => handleNavPress('trip')} />
        <BottomNavItem label="Safety" active={activeTab === 'safety'} onPress={() => handleNavPress('safety')} badge="1" />
        <BottomNavItem label="Settings" active={activeTab === 'settings'} onPress={() => handleNavPress('settings')} />
      </View>

      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }, { transform: [{ translateY: sheetTranslate }] }]}> 
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>All systems nominal</Text>
          <Text style={styles.sheetSubtitle}>Your safety circle is watching</Text>
        </View>
        <View style={styles.sheetTabs}>
          <SheetTab label="Safety" active />
          <SheetTab label="Trip" />
          <SheetTab label="Presets" />
        </View>
        <View style={styles.sheetChecklist}>
          <ChecklistRow label="Overall" value="100%" />
          <ChecklistRow label="Live" value="" />
          <ChecklistRow label="Online" value="" />
          <ChecklistRow label="2 contacts" value="" />
          <ChecklistRow label="1 pending" value="" warning />
          <Pressable style={styles.refreshBtn}>
            <Text style={styles.refreshBtnText}>Refresh Checklist</Text>
          </Pressable>
        </View>
      </Animated.View>

      {sosOpen && (
        <View style={styles.sosOverlay}>
          <Text style={styles.sosTitle}>SOS in 7 s</Text>
          <Text style={styles.sosSubtitle}>Cancel now if this was accidental.</Text>
          <View style={styles.sosCircleWrap}>
            <Animated.View style={[styles.sosRipple, { transform: [{ scale: rippleScale }], opacity: rippleOpacity }]} />
            <View style={styles.sosCircle}><Text style={styles.sosCircleText}>SOS</Text></View>
          </View>
          <Pressable style={styles.sosCancel} onPress={hideSos}>
            <Text style={styles.sosCancelText}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
};

const ControlButton: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.controlBtn}><Text style={styles.controlText}>{label}</Text></View>
);

const StatusCard: React.FC<{ title: string; subtitle: string; tint: 'green' | 'yellow' | 'blue' }> = ({
  title,
  subtitle,
  tint,
}) => (
  <View style={[styles.statusCard, styles[`statusCard_${tint}`]]}>
    <View style={styles.statusIcon} />
    <View style={styles.statusTextWrap}>
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusSubtitle}>{subtitle}</Text>
    </View>
    <View style={styles.statusTime}><Text style={styles.statusTimeText}>10:23</Text></View>
  </View>
);

const QuickAction: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.quickAction}><Text style={styles.quickActionText}>{label}</Text></View>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const ActionButton: React.FC<{ label: string; onPress?: () => void }> = ({ label, onPress }) => (
  <Pressable style={styles.actionBtn} onPress={onPress}>
    <Text style={styles.actionBtnText}>{label}</Text>
  </Pressable>
);

const BottomNavItem: React.FC<{ label: string; active?: boolean; badge?: string; onPress: () => void }> = ({
  label,
  active,
  badge,
  onPress,
}) => (
  <Pressable style={styles.navItem} onPress={onPress}>
    <View style={[styles.navIcon, active && styles.navIconActive]} />
    <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    {badge && <View style={styles.navBadge}><Text style={styles.navBadgeText}>{badge}</Text></View>}
  </Pressable>
);

const SheetTab: React.FC<{ label: string; active?: boolean }> = ({ label, active }) => (
  <View style={[styles.sheetTab, active && styles.sheetTabActive]}>
    <Text style={[styles.sheetTabText, active && styles.sheetTabTextActive]}>{label}</Text>
  </View>
);

const ChecklistRow: React.FC<{ label: string; value: string; warning?: boolean }> = ({ label, value, warning }) => (
  <View style={[styles.checklistRow, warning && styles.checklistRowWarn]}>
    <Text style={styles.checklistLabel}>{label}</Text>
    {value ? <Text style={styles.checklistValue}>{value}</Text> : null}
  </View>
);

const createThemedStyles = (themeColors: { background: string; surfaceAlt: string; surface: string; text: string; textMuted: string; }) =>
  StyleSheet.create({
    container: {
      backgroundColor: themeColors.background,
    },
    appBar: {
      backgroundColor: themeColors.background,
    },
    appTitle: {
      color: themeColors.text,
    },
    nightToggle: {
      backgroundColor: themeColors.surfaceAlt,
    },
    nightToggleText: {
      color: themeColors.text,
    },
    iconCircle: {
      backgroundColor: themeColors.surfaceAlt,
    },
    mapStatusPill: {
      backgroundColor: themeColors.surfaceAlt,
    },
    mapStatusText: {
      color: themeColors.text,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appBar: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.slate300,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  nightToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  nightToggleText: {
    fontSize: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  mapWrapper: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  mapSurface: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E9EDF3',
  },
  mapMarker: {
    position: 'absolute',
    top: '55%',
    left: '55%',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E74C3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMarkerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  mapStatusPill: {
    position: 'absolute',
    top: 18,
    left: 28,
    right: 28,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  mapStatusText: {
    fontWeight: '600',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.green,
  },
  chevron: {
    fontSize: 16,
  },
  mapControls: {
    position: 'absolute',
    right: 24,
    top: 80,
    gap: 10,
  },
  controlBtn: {
    width: 36,
    height: 36,
    backgroundColor: Colors.navy700,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlText: {
    color: Colors.white,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    marginTop: 12,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingBottom: 140,
    gap: 12,
  },
  statusCard: {
    backgroundColor: Colors.navy700,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusCard_green: {
    borderColor: Colors.green,
    borderWidth: 1,
  },
  statusCard_yellow: {
    borderColor: Colors.yellow,
    borderWidth: 1,
  },
  statusCard_blue: {
    borderColor: Colors.teal,
    borderWidth: 1,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.navy800,
  },
  statusTextWrap: {
    flex: 1,
  },
  statusTitle: {
    color: Colors.white,
    fontWeight: '700',
  },
  statusSubtitle: {
    color: Colors.slate500,
    fontSize: 12,
  },
  statusTime: {
    backgroundColor: Colors.navy800,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusTimeText: {
    color: Colors.white,
    fontSize: 12,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    flexBasis: '23%',
    paddingVertical: 10,
    backgroundColor: Colors.navy700,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    color: Colors.white,
    fontSize: 11,
  },
  sosHold: {
    backgroundColor: Colors.red,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sosHoldText: {
    color: Colors.white,
    fontWeight: '700',
  },
  monitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monitorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.green,
  },
  monitorText: {
    color: Colors.slate300,
    flex: 1,
    marginLeft: 8,
  },
  avatarGroup: {
    flexDirection: 'row',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.slate300,
    marginLeft: 6,
  },
  sectionCard: {
    backgroundColor: Colors.navy700,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: Colors.white,
    fontWeight: '700',
  },
  sectionMeta: {
    color: Colors.slate500,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    color: Colors.slate300,
  },
  infoValue: {
    color: Colors.white,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.teal,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: Colors.white,
    fontWeight: '600',
  },
  gpsPill: {
    position: 'absolute',
    left: 16,
    bottom: 90,
    backgroundColor: Colors.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  gpsPillText: {
    color: '#0b1a0f',
    fontSize: 12,
    fontWeight: '600',
  },
  sosButton: {
    position: 'absolute',
    right: 16,
    bottom: 90,
    backgroundColor: Colors.red,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  sosButtonText: {
    color: Colors.white,
    fontWeight: '700',
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 16,
    backgroundColor: Colors.navy900,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: Colors.navy700,
  },
  navIconActive: {
    backgroundColor: Colors.green,
  },
  navLabel: {
    color: Colors.slate500,
    fontSize: 11,
    marginTop: 4,
  },
  navLabelActive: {
    color: Colors.green,
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: 34,
    backgroundColor: Colors.yellow,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  navBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1c2438',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 64,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: Colors.slate300,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    backgroundColor: Colors.navy700,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  sheetTitle: {
    color: Colors.white,
    fontWeight: '700',
  },
  sheetSubtitle: {
    color: Colors.slate500,
    fontSize: 12,
  },
  sheetTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sheetTab: {
    flex: 1,
    backgroundColor: '#EEF2F7',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  sheetTabActive: {
    backgroundColor: Colors.navy700,
  },
  sheetTabText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
  },
  sheetTabTextActive: {
    color: Colors.white,
  },
  sheetChecklist: {
    gap: 8,
  },
  checklistRow: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checklistRowWarn: {
    backgroundColor: '#FFF2E6',
  },
  checklistLabel: {
    color: '#111827',
  },
  checklistValue: {
    color: '#111827',
    fontWeight: '700',
  },
  refreshBtn: {
    marginTop: 8,
    borderWidth: 2,
    borderColor: Colors.navy700,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  refreshBtnText: {
    color: Colors.navy700,
    fontWeight: '700',
  },
  sosOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,12,20,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  sosTitle: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '700',
  },
  sosSubtitle: {
    color: Colors.slate300,
  },
  sosCircleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  sosRipple: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(231,76,60,0.35)',
  },
  sosCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosCircleText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 20,
  },
  sosCancel: {
    backgroundColor: Colors.navy700,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
  },
  sosCancelText: {
    color: Colors.white,
    fontWeight: '600',
  },
});

export default SafePathScreen;
