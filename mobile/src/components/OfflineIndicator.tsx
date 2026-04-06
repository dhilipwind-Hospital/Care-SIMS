import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import { colors } from '../theme/colors';
import { typography, fontSize, fontWeight } from '../theme/typography';
import { spacing, borderRadius } from '../theme';
import {
  getOfflineQueueItems,
  startOfflineSync,
  syncNow,
  onQueueChange,
  retryFailedItems,
  QueueItem,
} from '../lib/offlineSync';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OfflineIndicator() {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [showOnline, setShowOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [slideAnim] = useState(() => new Animated.Value(0));
  const onlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const list = await getOfflineQueueItems();
    setItems(list);
  }, []);

  // Subscribe to queue changes (push-based, no polling needed)
  useEffect(() => {
    refresh();
    const unsub = onQueueChange((q) => setItems(q));
    return unsub;
  }, [refresh]);

  // Network + offline-sync lifecycle
  useEffect(() => {
    const unsubscribe = startOfflineSync(
      (syncedCount) => {
        if (syncedCount > 0) {
          Toast.show({
            type: 'success',
            text1: `${syncedCount} change${syncedCount !== 1 ? 's' : ''} synced`,
          });
          setShowOnline(true);
          if (onlineTimerRef.current) clearTimeout(onlineTimerRef.current);
          onlineTimerRef.current = setTimeout(() => setShowOnline(false), 2500);
        }
        refresh();
      },
      (connected) => {
        setIsOffline(!connected);
        if (connected) {
          setShowOnline(true);
          if (onlineTimerRef.current) clearTimeout(onlineTimerRef.current);
          onlineTimerRef.current = setTimeout(() => setShowOnline(false), 2500);
        }
        refresh();
      },
    );

    NetInfo.fetch().then((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => {
      unsubscribe();
      if (onlineTimerRef.current) clearTimeout(onlineTimerRef.current);
    };
  }, [refresh]);

  const pendingCount = items.filter((i) => i.status !== 'failed').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;
  const visible = isOffline || pendingCount > 0 || failedCount > 0 || showOnline;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const handleToggleExpand = useCallback(() => setExpanded((p) => !p), []);

  const handleSyncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncNow();
      if (result.synced > 0) {
        Toast.show({
          type: 'success',
          text1: `${result.synced} change${result.synced !== 1 ? 's' : ''} synced`,
        });
      } else if (isOffline) {
        Toast.show({ type: 'info', text1: 'Still offline — will retry automatically' });
      } else {
        Toast.show({ type: 'info', text1: 'Nothing to sync' });
      }
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [syncing, isOffline, refresh]);

  const handleRetryFailed = useCallback(async () => {
    await retryFailedItems();
    await refresh();
  }, [refresh]);

  if (!visible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 0],
  });

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Decide banner appearance
  let bannerColor = colors.warning;
  let icon: keyof typeof Ionicons.glyphMap = 'cloud-offline-outline';
  let label = '';

  if (isOffline) {
    icon = 'cloud-offline-outline';
    bannerColor = colors.warning;
    label =
      pendingCount > 0
        ? `Offline — ${pendingCount} pending change${pendingCount !== 1 ? 's' : ''}`
        : `You're offline`;
  } else if (failedCount > 0 && pendingCount === 0) {
    icon = 'alert-circle-outline';
    bannerColor = colors.danger;
    label = `${failedCount} change${failedCount !== 1 ? 's' : ''} failed to sync`;
  } else if (pendingCount > 0) {
    icon = 'cloud-upload-outline';
    bannerColor = colors.info;
    label = `${pendingCount} pending change${pendingCount !== 1 ? 's' : ''}`;
  } else if (showOnline) {
    icon = 'cloud-done-outline';
    bannerColor = colors.success;
    label = 'Online';
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { paddingTop: insets.top },
        { transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.banner, { backgroundColor: bannerColor }]}>
        <TouchableOpacity
          style={styles.bannerLeft}
          onPress={handleToggleExpand}
          activeOpacity={0.8}
        >
          <Ionicons name={icon} size={18} color={colors.white} />
          <Text style={styles.bannerText} numberOfLines={1}>
            {label}
          </Text>
        </TouchableOpacity>

        {(pendingCount > 0 || failedCount > 0) && (
          <TouchableOpacity
            style={styles.syncBtn}
            onPress={handleSyncNow}
            disabled={syncing}
            activeOpacity={0.7}
          >
            <Ionicons
              name={syncing ? 'sync' : 'sync-outline'}
              size={14}
              color={colors.white}
            />
            <Text style={styles.syncBtnText}>{syncing ? 'Syncing…' : 'Sync Now'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleToggleExpand} hitSlop={8}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>

      {expanded && items.length > 0 && (
        <View style={styles.detailList}>
          {items.slice(0, 10).map((item) => (
            <View key={item.id} style={styles.detailRow}>
              <View
                style={[
                  styles.detailMethodWrap,
                  item.status === 'failed' && { backgroundColor: colors.dangerLight },
                ]}
              >
                <Text
                  style={[
                    styles.detailMethod,
                    item.status === 'failed' && { color: colors.danger },
                  ]}
                >
                  {item.method}
                </Text>
              </View>
              <Text style={styles.detailUrl} numberOfLines={1}>
                {item.url}
              </Text>
              <Text style={styles.detailTime}>
                {item.status === 'failed' ? `failed (${item.retries})` : formatTimestamp(item.timestamp)}
              </Text>
            </View>
          ))}
          {items.length > 10 && (
            <Text style={styles.moreText}>+{items.length - 10} more</Text>
          )}
          {failedCount > 0 && (
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetryFailed}>
              <Ionicons name="refresh" size={14} color={colors.primary} />
              <Text style={styles.retryBtnText}>Retry failed items</Text>
            </TouchableOpacity>
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
    paddingVertical: 8,
    paddingHorizontal: spacing.base,
    gap: 8,
  },
  bannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerText: {
    ...typography.bodySmall,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    flexShrink: 1,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  syncBtnText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
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
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  retryBtnText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
