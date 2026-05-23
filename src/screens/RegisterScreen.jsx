import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Wallet } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { colors, spacing, radius, typography } from '../lib/theme';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRegister = async () => {
    if (!form.fullName || !form.email || !form.password) {
      setMessage('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    const user = data.user;

    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: user.id, full_name: form.fullName, email: form.email }]);

      if (profileError) {
        await supabase.auth.signOut();
        setLoading(false);
        setMessage('Registration failed while saving profile. Please try again.');
        return;
      }

      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .insert([{ name: 'Personal', type: 'personal', owner_id: user.id, emoji: '💰' }])
        .select()
        .single();

      if (spaceError) {
        await supabase.auth.signOut();
        setLoading(false);
        setMessage('Registration failed while creating your space. Please try again.');
        return;
      }

      const { error: memberError } = await supabase
        .from('space_members')
        .insert([{ space_id: spaceData.id, user_id: user.id }]);

      if (memberError) {
        await supabase.auth.signOut();
        setLoading(false);
        setMessage('Registration failed while setting up membership. Please try again.');
        return;
      }
    }

    setLoading(false);
    setMessage('Account created! Please log in.');
    setTimeout(() => navigation.navigate('Login'), 1200);
  };

  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    setMessage('');
    const redirectTo = 'https://spendieapp.vercel.app';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    setOauthLoading(false);
    if (error) setMessage(error.message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Wallet size={34} color={colors.white} />
          </View>
          <Text style={styles.appName}>Spendie</Text>
          <Text style={styles.heroSubtitle}>Start your friendly budgeting space today.</Text>
          <View style={styles.tagsRow}>
            <Text style={styles.tag}>💰 Personal</Text>
            <Text style={styles.tag}>👥 Shared</Text>
            <Text style={styles.tag}>🎯 Goals</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>Create account</Text>
          <Text style={styles.cardTitle}>Join Spendie</Text>
          <Text style={styles.cardSubtitle}>Create your personal wallet and invite others later.</Text>

          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={colors.textMuted}
            value={form.fullName}
            onChangeText={(v) => setForm({ ...form, fullName: v })}
          />

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            value={form.email}
            onChangeText={(v) => setForm({ ...form, email: v })}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={form.password}
            onChangeText={(v) => setForm({ ...form, password: v })}
            secureTextEntry
          />

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnText}>Create account</Text>
            )}
          </TouchableOpacity>

          {!!message && (
            <Text style={[styles.message, message.includes('created') && styles.success]}>
              {message}
            </Text>
          )}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} disabled={oauthLoading}>
            {oauthLoading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.switchText}>
              Already have an account? <Text style={styles.switchLink}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.primary },
  container: { flexGrow: 1 },
  hero: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 40,
    paddingHorizontal: spacing.xl,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  appName: { fontSize: 32, fontWeight: '800', color: colors.white, marginBottom: spacing.xs },
  heroSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: spacing.lg },
  tagsRow: { flexDirection: 'row', gap: spacing.sm },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    fontSize: 13,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xxl,
  },
  kicker: { fontSize: 13, fontWeight: '600', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },
  cardTitle: { ...typography.h2, marginBottom: spacing.xs },
  cardSubtitle: { ...typography.body, marginBottom: spacing.xl },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  message: { color: colors.danger, fontSize: 13, textAlign: 'center', marginBottom: spacing.md },
  success: { color: colors.income },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textMuted, marginHorizontal: spacing.sm },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 13,
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
  },
  googleIcon: { fontSize: 16, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  switchText: { textAlign: 'center', color: colors.textSecondary, fontSize: 14 },
  switchLink: { color: colors.primary, fontWeight: '600' },
});
