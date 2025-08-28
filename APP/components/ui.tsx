import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

type HeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function AppHeader({ title, subtitle, right }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerInner}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.logo}><Text style={styles.logoText}>WN</Text></View>
          <View>
            <Text style={styles.headerTitle}>{title}</Text>
            {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
          </View>
        </View>
        <View>{right}</View>
      </View>
    </View>
  );
}

type CardProps = { children: React.ReactNode; style?: ViewStyle };
export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type StatCardProps = {
  color: string;
  icon?: string;
  title: string;
  value: string | number;
  note?: string;
};
export function StatCard({ color, title, value, note }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{String(value)}</Text>
        {note ? <Text style={styles.statNote}>{note}</Text> : null}
      </View>
    </View>
  );
}

type BadgeProps = { children: React.ReactNode; color?: string; textColor?: string; style?: ViewStyle };
export function Badge({ children, color = '#efe9ff', textColor = '#5b21b6', style }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color }, style]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{children as any}</Text>
    </View>
  );
}

type ProgressProps = { value: number; color?: string; };
export function ProgressBar({ value, color = '#10b981' }: ProgressProps) {
  return (
    <View style={styles.progressOuter}>
      <View style={[styles.progressInner, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} />
    </View>
  );
}

export const layoutStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  body: { padding: 16 },
  row: { flexDirection: 'row', gap: 12 },
});

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#6d5efc',
    paddingVertical: 14,
    paddingHorizontal: 16,
    elevation: 6,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: { color: '#fff', fontWeight: '700' as TextStyle['fontWeight'] },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 8 },
  statTitle: { color: '#6b7280', fontSize: 12 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statNote: { fontSize: 11, color: '#10b981' },
  badge: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  progressOuter: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' },
  progressInner: { height: 8, borderRadius: 999 },
});

export default { AppHeader, Card, StatCard, Badge, ProgressBar, layoutStyles };