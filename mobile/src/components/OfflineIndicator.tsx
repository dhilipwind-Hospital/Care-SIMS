import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../theme/colors';
import { typography, fontSize, fontWeight } from '../theme/typography';
import { spacing, borderRadius } from '../theme';
import {
  getOfflineQueueCount,
  getOfflineQueueItems,
  startOfflineSync,
  QueueItem,
} from '../lib/offlineSync';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OfflineIndicator() {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [pendingItems, setPendingItems] = useState<QueueItem[]>([]);
  const [slideAnim] = useState(() => new Animated.Value(0));

  // Refresh pending count
  const refreshCount = useCallback(async () => {
    const count = await getOfflineQueueCount();
    setPendingCount(count);
  }, []);

  // Start offline sync monitor
  useEffect(() => {
    const unsubscribe = startOfflineSync(
      (syncedCount) => {
        refreshCount();
      },
      (connected) => {
        setIsOffline(!connected);
        refreshCount();
      },
    );

    // Also check initial state
    NetInfo.fetch().then((state) => {
      setIsOffline(!state.isConnected);
    });
    refreshCount();

    // Periodically refresh count
    const interval = setInterval(refreshCount, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshCount]);

  // Animate visibility
  const visible = isOffline || pendingCount > 0;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  // Load items when expanded
  useEffect(() => {
    if (expanded) {
      getOfflineQueueItems().then(setPendingItems);
    }
  }, [expanded, pendingCount]);

  const handlePress = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  if (!visible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0],
  });

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMethod = (method: string, url: string) => {
    // Create a human-readable label from the URL
    const parts = url.split('/').filter(Boolean);
    const last = parts[parts.length - 1] ?? url;
    return `${method} ${last}`;
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { paddingTop: insets.top },
        { transform: [{ translateY }] },
      ]}
    >
      <TouchableOpacity style={styles.banner} onPress={handlePress} activeOpacity={0.8}>
        <Ionicons
          name={isOffline ? 'cloud-offline-outline' : 'cloud-upload-outline'}
          size={18}
          color={colors.white}
        />
        <Text style={styles.bannerText}>
          {isOffline
            ? `You're offline${pendingCount > 0 ? ` \u2014 ${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending` : ''}`
            : `${pendingCount} change${pendingCount !== 1 ? 's' : ''} syncing...`}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.white}
        />
      </TouchableOpacity>

      {expanded && pendingItems.length > 0 && (
        <View style={styles.detailList}>
          {pendingItems.slice(0, 10).map((item) => (
            <View key={item.id} style={styles.detailRow}>
              <View style={styles.detailMethodWrap}>
                <Text style={styles.detailMethod}>{item.method}</Text>
              </View>
              <Text style={styles.detailUrl} numberOfLines={1}>
                {item.url}
              </Text>
              <Text style={styles.detailTime}>{formatTimestamp(item.timestamp)}</Text>
            </View>
          ))}
          {pendingItems.length > 10 && (
            <Text style={styles.moreText}>+{pendingItems.length - 10} more</Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
    paddingVertical: 8,
    paddingHorizontal: spacing.base,
    gap: 8,
  },
  bannerText: {
    ...typography.bodySmall,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    flex: 1,
  },
  detailList: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  detailMethodWrap: {
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  detailMethod: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.info,
  },
  detailUrl: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  detailTime: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  moreText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
