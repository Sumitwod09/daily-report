import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const TAB_HEIGHT = 60;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const totalTabHeight = TAB_HEIGHT + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            height: totalTabHeight,
            paddingBottom: insets.bottom,
            paddingTop: 8,
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#D1D9E6',
          },
          tabBarActiveTintColor: '#1A56DB',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <Ionicons name="home-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ledger"
          options={{
            title: 'Ledger',
            tabBarIcon: ({ color }) => (
              <Ionicons name="list-outline" size={22} color={color} />
            ),
          }}
        />
        {/* Centre spacer for FAB gap */}
        <Tabs.Screen
          name="__placeholder"
          options={{
            tabBarLabel: () => null,
            tabBarIcon: () => <View style={{ width: 40 }} />,
          }}
          listeners={{ tabPress: (e) => e.preventDefault() }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color }) => (
              <Ionicons name="bar-chart-outline" size={22} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Centre FAB — floating above tab bar */}
      <TouchableOpacity
        style={[styles.fab, { bottom: totalTabHeight - 24 }]}
        onPress={() => router.push('/(modals)/add-transaction')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1A56DB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
