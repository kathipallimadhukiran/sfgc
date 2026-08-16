import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Platform,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
} from "react-native";
import {
  Card,
  Title,
  Paragraph,
  Button,
  Text,
  TextInput,
  Avatar,
  HelperText,
  Checkbox,
  Divider,
  ActivityIndicator,
  Menu,
} from "react-native-paper";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { biblePlanService } from '@/services/biblePlanService';
import { useApp } from "@/context/AppContext";

const MINISTRY_OPTIONS = [
  'Worship Team & Choir',
  'Media & Technology',
  'Children\'s Ministry & Sunday School',
  'Youth & Student Ministry',
  'Prayer & Intercession',
  'Security & Ushering',
  'Evangelism & Outreach',
  'Ladies Fellowship',
  'Senior Members Care',
];
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/use-theme";
import DateTimePicker from "@react-native-community/datetimepicker";
import { authService } from "@/services/authService";
import { notificationService } from "@/services/notificationService";
import {
  departmentService,
  DepartmentItem,
} from "@/services/departmentService";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function AuthScreen() {
  const { login, language, themeMode } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const isTel = language === "Telugu";
  const isDark = themeMode === "dark";

  // Mode: 'login' or 'register'
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login form state (Supports email address or mobile number)
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Date Picker States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDatePickerField, setActiveDatePickerField] = useState<
    "birthday" | "baptismDate" | null
  >(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  // Voluntary Departments & Ministry Dropdown State
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>([]);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showMinistryDropdown, setShowMinistryDropdown] = useState(false);

  // Registration form state
  const [regData, setRegData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobileNumber: "",
    location: "",
    birthday: "",
    baptismDate: "",
    ministry: "",
    selectedDepartment: "",
    isFamilyHead: true,
    familyHeadName: "",
    familyHeadMobileNumber: "",
    familyHeadEmail: "",
    familyMembersCount: "1",
  });

  useEffect(() => {
    fetchDepartments();
    notificationService.init().catch(() => {});
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.getDepartments();
      if (res.success && res.departments) {
        setDepartmentsList(res.departments);
      }
    } catch (err) {
      console.log("Error fetching voluntary departments:", err);
    }
  };

  const handleOpenDatePicker = (field: "birthday" | "baptismDate") => {
    setActiveDatePickerField(field);
    const existingVal =
      field === "birthday" ? regData.birthday : regData.baptismDate;
    if (existingVal && !isNaN(Date.parse(existingVal))) {
      setPickerDate(new Date(existingVal));
    } else {
      setPickerDate(new Date());
    }
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && activeDatePickerField) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      setRegData((prev) => ({
        ...prev,
        [activeDatePickerField]: formattedDate,
      }));
    }
  };

  const handleLogin = async () => {
    setError("");
    const cleanId = loginIdentifier.trim();
    if (!cleanId || !loginPassword) {
      setError(
        isTel
          ? "దయచేసి మీ ఇమెయిల్ లేదా ఫోన్ నంబర్ మరియు పాస్‌వర్డ్ నమోదు చేయండి."
          : "Please enter your email address or mobile number and password.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(cleanId, loginPassword);

      if (response.success && response.token && response.user) {
        await login(response.token, response.user);
        router.replace("/");
      } else {
        setError(
          response.message ||
            (isTel
              ? "లాగిన్ విఫలమైంది. దయచేసి వివరాలు సరిచూసుకోండి."
              : "Login failed. Please check credentials."),
        );
      }
    } catch (err: any) {
      console.log("Login error:", err);
      setError(err.message || (isTel ? "లాగిన్ విఫలమైంది." : "Login failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    const {
      name,
      email,
      password,
      confirmPassword,
      mobileNumber,
      selectedDepartment,
    } = regData;

    if (!name.trim()) {
      setError(
        isTel
          ? "దయచేసి మీ పూర్తి పేరును నమోదు చేయండి."
          : "Please enter your full name.",
      );
      return;
    }

    if (!email.trim() && !mobileNumber.trim()) {
      setError(
        isTel
          ? "దయచేసి ఇమెయిల్ చిరునామా లేదా మొబైల్ నంబర్‌ నమోదు చేయండి."
          : "Please provide either an Email Address or Mobile Number.",
      );
      return;
    }

    // Mobile number validation
    if (mobileNumber.trim()) {
      const cleanMobile = mobileNumber.trim();

      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        setError(
          isTel
            ? "దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి."
            : "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.",
        );
        return;
      }
    }

    if (!password || !confirmPassword) {
      setError(
        isTel
          ? "దయచేసి పాస్‌వర్డ్ నమోదు చేయండి."
          : "Password and confirm password are required.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        isTel ? "పాస్‌వర్డ్‌లు సరిపోలడం లేదు." : "Passwords do not match.",
      );
      return;
    }

    setLoading(true);

    const departmentsArray = selectedDepartment ? [selectedDepartment] : [];

    const payload = {
      name: regData.name.trim(),
      email: regData.email.trim() || undefined,
      password: regData.password,
      role: "Member",
      mobileNumber: regData.mobileNumber.trim(),
      location: regData.location.trim(),
      birthday: regData.birthday,
      baptismDate: regData.baptismDate,
      ministry: regData.ministry.trim(),
      departments: departmentsArray,
      familyName: regData.isFamilyHead
        ? `${regData.name.trim()} Family`
        : `${regData.familyHeadName.trim() || regData.name.trim()} Family`,
      familyHeadName: regData.isFamilyHead
        ? regData.name.trim()
        : regData.familyHeadName.trim(),
      familyHeadMobileNumber: regData.isFamilyHead
        ? regData.mobileNumber.trim()
        : regData.familyHeadMobileNumber.trim(),
      familyMembersCount: parseInt(regData.familyMembersCount) || 1,
    };

    try {
      const response = await authService.register(payload);

      if (response.success && response.token && response.user) {
        const userId = response.user._id || response.user.id || response.user.email || response.user.mobileNumber;
        if (userId) {
          await biblePlanService.resetUserProgress(userId);
        }
        await AsyncStorage.setItem('just_registered', 'true');
        await login(response.token, response.user);
        router.replace("/");
      } else {
        setError(
          response.message ||
            (isTel ? "రిజిస్ట్రేషన్ విఫలమైంది." : "Registration failed."),
        );
      }
    } catch (err: any) {
      console.log("Registration error:", err);
      setError(
        err.message ||
          (isTel ? "రిజిస్ట్రేషన్ విఫలమైంది." : "Registration failed."),
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.textInput, { color: theme.text, opacity: 1 }];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : Platform.OS === "android"
            ? "height"
            : undefined
      }
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      {/* Top Header */}
      <View style={[styles.headerBar, { borderBottomColor: theme.cardBorder }]}>
        <View style={{ width: 36 }} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {authTab === "login"
            ? isTel
              ? "సైన్ ఇన్ (Sign In)"
              : "Sign In"
            : isTel
              ? "సభ్యుల నమోదు (Register)"
              : "Member Registration"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 180 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Church Branding Hero */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={["#6366f1", "#a855f7"]}
            style={styles.logoBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="church" size={38} color="#ffffff" />
          </LinearGradient>
          <Text style={[styles.brandTitle, { color: theme.text }]}>
            {isTel ? "సంఘ అనుసంధానం" : "SFGC"}
          </Text>
          <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
            {isTel
              ? "దేవుని సన్నిధిలో ఏకముగా ఆరాధిద్దాం"
              : "Connecting Hearts & Strengthening Faith"}
          </Text>
        </View>

        {/* Tab Selector: Sign In vs Register */}
        <View
          style={[
            styles.tabSelector,
            { backgroundColor: isDark ? "#1e293b" : "#f1f5f9" },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tabButton,
              authTab === "login" && {
                backgroundColor: theme.primary,
                elevation: 2,
              },
            ]}
            onPress={() => {
              setAuthTab("login");
              setError("");
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="login"
              size={18}
              color={
                authTab === "login" ? "#ffffff" : isDark ? "#94a3b8" : "#64748b"
              }
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color:
                    authTab === "login"
                      ? "#ffffff"
                      : isDark
                        ? "#94a3b8"
                        : "#64748b",
                },
              ]}
            >
              {isTel ? "లాగిన్" : "Sign In"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              authTab === "register" && {
                backgroundColor: theme.primary,
                elevation: 2,
              },
            ]}
            onPress={() => {
              setAuthTab("register");
              setError("");
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="account-plus-outline"
              size={18}
              color={
                authTab === "register"
                  ? "#ffffff"
                  : isDark
                    ? "#94a3b8"
                    : "#64748b"
              }
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color:
                    authTab === "register"
                      ? "#ffffff"
                      : isDark
                        ? "#94a3b8"
                        : "#64748b",
                },
              ]}
            >
              {isTel ? "కొత్త సభ్యులు" : "Register"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {Boolean(error) && (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color="#ef4444"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* SIGN IN FORM */}
        {authTab === "login" ? (
          <Card
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Card.Content>
              <Text style={[styles.formHeader, { color: theme.text }]}>
                {isTel ? "మీ ఖాతాలోనికి ప్రవేశించండి" : "Welcome Back"}
              </Text>
              <Text
                style={[styles.formSubHeader, { color: theme.textSecondary }]}
              >
                {isTel
                  ? "దయచేసి మీ రిజిస్టర్డ్ ఇమెయిల్ లేదా ఫోన్ నంబర్‌తో లాగిన్ అవ్వండి."
                  : "Enter your email address or mobile number with password."}
              </Text>

              <Text style={[styles.inputLabel, { color: theme.text }]}>
                {isTel
                  ? "ఇమెయిల్ లేదా మొబైల్ నంబర్ *"
                  : "Email Address or Mobile Number *"}
              </Text>
              <TextInput
                mode="outlined"
                value={loginIdentifier}
                onChangeText={setLoginIdentifier}
                placeholder="e.g. name@gmail.com or 9876543210"
                autoCapitalize="none"
                textColor={theme.text}
                placeholderTextColor={theme.textSecondary}
                left={
                  <TextInput.Icon
                    icon="account-key-outline"
                    color={theme.textSecondary}
                  />
                }
                style={inputStyle}
                outlineColor={theme.cardBorder}
                activeOutlineColor={theme.primary}
              />

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.text, marginTop: 14 },
                ]}
              >
                {isTel ? "పాస్‌వర్డ్ *" : "Password *"}
              </Text>
              <TextInput
                mode="outlined"
                value={loginPassword}
                onChangeText={setLoginPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                textColor={theme.text}
                placeholderTextColor={theme.textSecondary}
                left={
                  <TextInput.Icon
                    icon="lock-outline"
                    color={theme.textSecondary}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off-outline" : "eye-outline"}
                    color={theme.textSecondary}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={inputStyle}
                outlineColor={theme.cardBorder}
                activeOutlineColor={theme.primary}
              />

              <Button
                mode="contained"
                buttonColor={theme.primary}
                textColor="#ffffff"
                style={styles.submitButton}
                contentStyle={{ paddingVertical: 6 }}
                loading={loading}
                disabled={loading}
                onPress={handleLogin}
              >
                {isTel ? "లాగిన్ అవ్వండి (Sign In)" : "Sign In to SFGC"}
              </Button>

              <TouchableOpacity
                style={{ marginTop: 18, alignItems: "center" }}
                onPress={() => {
                  setAuthTab("register");
                  setError("");
                }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                  {isTel ? "ఖాతా లేదా? " : "Don't have an account? "}
                  <Text style={{ color: theme.primary, fontWeight: "bold" }}>
                    {isTel ? "ఇక్కడ నమోదు చేసుకోండి" : "Register here"}
                  </Text>
                </Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        ) : (
          /* REGISTRATION FORM */
          <Card
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Card.Content>
              <Text style={[styles.formHeader, { color: theme.text }]}>
                {isTel ? "సంఘ సభ్యునిగా నమోదు" : "New Member Registration"}
              </Text>
              <Text
                style={[styles.formSubHeader, { color: theme.textSecondary }]}
              >
                {isTel
                  ? "సంఘంలో భాగస్వామ్యం పొందడానికి మీ వివరాలను నమోదు చేయండి."
                  : "Create your church account to connect with prayer teams and ministries."}
              </Text>

              <Text style={[styles.inputLabel, { color: theme.text }]}>
                {isTel ? "పూర్తి పేరు *" : "Full Name *"}
              </Text>
              <TextInput
                mode="outlined"
                value={regData.name}
                onChangeText={(val) => setRegData((p) => ({ ...p, name: val }))}
                placeholder="e.g. John Wesley"
                textColor={theme.text}
                placeholderTextColor={theme.textSecondary}
                left={
                  <TextInput.Icon
                    icon="account-outline"
                    color={theme.textSecondary}
                  />
                }
                style={inputStyle}
                outlineColor={theme.cardBorder}
                activeOutlineColor={theme.primary}
              />

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.text, marginTop: 12 },
                ]}
              >
                {isTel
                  ? "ఇమెయిల్ చిరునామా (ఐచ్ఛికం)"
                  : "Email Address (Optional)"}
              </Text>
              <TextInput
                mode="outlined"
                value={regData.email}
                onChangeText={(val) =>
                  setRegData((p) => ({ ...p, email: val }))
                }
                placeholder="e.g. john@gmail.com (Optional)"
                autoCapitalize="none"
                keyboardType="email-address"
                textColor={theme.text}
                placeholderTextColor={theme.textSecondary}
                left={
                  <TextInput.Icon
                    icon="email-outline"
                    color={theme.textSecondary}
                  />
                }
                style={inputStyle}
                outlineColor={theme.cardBorder}
                activeOutlineColor={theme.primary}
              />

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.text, marginTop: 12 },
                ]}
              >
                {isTel ? "మొబైల్ నంబర్" : "Mobile Phone Number"}
              </Text>
             <TextInput
  mode="outlined"
  value={regData.mobileNumber}
  onChangeText={val => {
    const numbersOnly = val.replace(/\D/g, '').slice(0, 10);
    setRegData(p => ({ ...p, mobileNumber: numbersOnly }));
  }}
  placeholder="e.g. 9876543210"
  keyboardType="number-pad"
  maxLength={10}
  textColor={theme.text}
  placeholderTextColor={theme.textSecondary}
  left={
    <TextInput.Icon
      icon="phone-outline"
      color={theme.textSecondary}
    />
  }
  style={inputStyle}
  outlineColor={theme.cardBorder}
  activeOutlineColor={theme.primary}
/> 
              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.text, marginTop: 12 },
                ]}
              >
                {isTel ? "పాస్‌వర్డ్ *" : "Password *"}
              </Text>
              <TextInput
                mode="outlined"
                value={regData.password}
                onChangeText={(val) =>
                  setRegData((p) => ({ ...p, password: val }))
                }
                placeholder="••••••••"
                secureTextEntry={!showRegPassword}
                textColor={theme.text}
                placeholderTextColor={theme.textSecondary}
                left={
                  <TextInput.Icon
                    icon="lock-outline"
                    color={theme.textSecondary}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={showRegPassword ? "eye-off-outline" : "eye-outline"}
                    color={theme.textSecondary}
                    onPress={() => setShowRegPassword(!showRegPassword)}
                  />
                }
                style={inputStyle}
                outlineColor={theme.cardBorder}
                activeOutlineColor={theme.primary}
              />

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.text, marginTop: 12 },
                ]}
              >
                {isTel ? "పాస్‌వర్డ్ నిర్ధారణ *" : "Confirm Password *"}
              </Text>
              <TextInput
                mode="outlined"
                value={regData.confirmPassword}
                onChangeText={(val) =>
                  setRegData((p) => ({ ...p, confirmPassword: val }))
                }
                placeholder="••••••••"
                secureTextEntry={!showRegPassword}
                textColor={theme.text}
                placeholderTextColor={theme.textSecondary}
                left={
                  <TextInput.Icon
                    icon="lock-check-outline"
                    color={theme.textSecondary}
                  />
                }
                style={inputStyle}
                outlineColor={theme.cardBorder}
                activeOutlineColor={theme.primary}
              />

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.text, marginTop: 12 },
                ]}
              >
                {isTel ? "నివాస ప్రాంతము / బ్రాంచ్" : "Location / Branch"}
              </Text>
              <TextInput
                mode="outlined"
                value={regData.location}
                onChangeText={(val) =>
                  setRegData((p) => ({ ...p, location: val }))
                }
                placeholder="e.g. Satellite city Branch"
                textColor={theme.text}
                placeholderTextColor={theme.textSecondary}
                left={
                  <TextInput.Icon
                    icon="map-marker-outline"
                    color={theme.textSecondary}
                  />
                }
                style={inputStyle}
                outlineColor={theme.cardBorder}
                activeOutlineColor={theme.primary}
              />

              {/* Voluntary Department Dropdown */}
              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.text, marginTop: 12 },
                ]}
              >
                {isTel
                  ? "స్వచ్ఛంద విభాగం (Voluntary Department)"
                  : "Voluntary Department Selection"}
              </Text>
              <View style={{ marginBottom: 4 }}>
                <Menu
                  visible={showDeptDropdown}
                  onDismiss={() => setShowDeptDropdown(false)}
                  anchor={
                    <TouchableOpacity
                      onPress={() => setShowDeptDropdown(true)}
                      activeOpacity={0.8}
                    >
                      <View pointerEvents="none">
                        <TextInput
                          mode="outlined"
                          value={
                            regData.selectedDepartment ||
                            (isTel
                              ? "-- ఎంచుకోండి --"
                              : "-- Select Department --")
                          }
                          editable={false}
                          textColor={theme.text}
                          left={
                            <TextInput.Icon
                              icon="hand-heart-outline"
                              color={theme.primary}
                            />
                          }
                          right={
                            <TextInput.Icon
                              icon="chevron-down"
                              color={theme.textSecondary}
                            />
                          }
                          style={inputStyle}
                          outlineColor={theme.cardBorder}
                          activeOutlineColor={theme.primary}
                        />
                      </View>
                    </TouchableOpacity>
                  }
                  contentStyle={{
                    backgroundColor: theme.backgroundElement,
                    borderRadius: 12,
                  }}
                >
                  <Menu.Item
                    onPress={() => {
                      setRegData((p) => ({ ...p, selectedDepartment: "" }));
                      setShowDeptDropdown(false);
                    }}
                    title={
                      isTel
                        ? "-- దేనినీ ఎంచుకోవద్దు --"
                        : "-- None / Select Later --"
                    }
                  />
                  <Divider />
                  {departmentsList.map((dept) => (
                    <Menu.Item
                      key={dept._id || dept.name}
                      onPress={() => {
                        setRegData((p) => ({
                          ...p,
                          selectedDepartment: dept.name,
                        }));
                        setShowDeptDropdown(false);
                      }}
                      title={dept.name}
                    />
                  ))}
                </Menu>
              </View>

              {/* Birthday & Baptism Dates */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    {isTel ? "పుట్టినరోజు" : "Birthday"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleOpenDatePicker("birthday")}
                    activeOpacity={0.8}
                  >
                    <View pointerEvents="none">
                      <TextInput
                        mode="outlined"
                        value={regData.birthday}
                        placeholder="YYYY-MM-DD"
                        editable={false}
                        textColor={theme.text}
                        placeholderTextColor={theme.textSecondary}
                        left={
                          <TextInput.Icon
                            icon="cake-variant-outline"
                            color={theme.textSecondary}
                          />
                        }
                        style={inputStyle}
                        outlineColor={theme.cardBorder}
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    {isTel ? "బాప్తిస్మ తేదీ" : "Baptism Date"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleOpenDatePicker("baptismDate")}
                    activeOpacity={0.8}
                  >
                    <View pointerEvents="none">
                      <TextInput
                        mode="outlined"
                        value={regData.baptismDate}
                        placeholder="YYYY-MM-DD"
                        editable={false}
                        textColor={theme.text}
                        placeholderTextColor={theme.textSecondary}
                        left={
                          <TextInput.Icon
                            icon="water-outline"
                            color={theme.textSecondary}
                          />
                        }
                        style={inputStyle}
                        outlineColor={theme.cardBorder}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

            
              <Button
                mode="contained"
                buttonColor={theme.primary}
                textColor="#ffffff"
                style={styles.submitButton}
                contentStyle={{ paddingVertical: 6 }}
                loading={loading}
                disabled={loading}
                onPress={handleRegister}
              >
                {isTel
                  ? "ఖాతా సృష్టించండి (Register)"
                  : "Create Church Account"}
              </Button>

              <TouchableOpacity
                style={{ marginTop: 18, alignItems: "center" }}
                onPress={() => {
                  setAuthTab("login");
                  setError("");
                }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                  {isTel ? "ఇప్పటికే ఖాతా ఉందా? " : "Already registered? "}
                  <Text style={{ color: theme.primary, fontWeight: "bold" }}>
                    {isTel ? "ఇక్కడ లాగిన్ అవ్వండి" : "Sign in here"}
                  </Text>
                </Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Date Picker Modal for Mobile */}
      {showDatePicker && Platform.OS !== "web" && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 16,
  },
  heroSection: {
    alignItems: "center",
    marginVertical: 14,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    elevation: 4,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  tabSelector: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 9,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "500",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
  },
  formHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  formSubHeader: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "transparent",
    fontSize: 14,
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 10,
  },
});
