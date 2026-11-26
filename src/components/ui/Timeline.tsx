import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WorkflowTimelineStep } from '@/src/fixtures/canonicalData';
import { Colors } from '@/src/theme/colors';

interface TimelineProps {
  steps: WorkflowTimelineStep[];
}

export function Timeline({ steps }: TimelineProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>EXAM WORKFLOW TIMELINE</Text>
      <View style={styles.stepsWrapper}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isCompleted = step.completed;
          const isActive = step.active;

          return (
            <View key={step.label} style={styles.stepRow}>
              {/* Dot & Connecting Line */}
              <View style={styles.nodeColumn}>
                <View
                  style={[
                    styles.dot,
                    isCompleted && styles.dotCompleted,
                    isActive && styles.dotActive,
                  ]}
                >
                  {isCompleted ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : isActive ? (
                    <View style={styles.activeInnerPulse} />
                  ) : (
                    <View style={styles.pendingDot} />
                  )}
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.connectorLine,
                      isCompleted && styles.connectorLineCompleted,
                    ]}
                  />
                )}
              </View>

              {/* Step Info */}
              <View style={[styles.infoColumn, isLast && styles.infoColumnLast]}>
                <View style={styles.labelRow}>
                  <Text
                    style={[
                      styles.stepLabel,
                      (isCompleted || isActive) && styles.stepLabelHighlighted,
                    ]}
                  >
                    {step.label}
                  </Text>
                  {isActive && (
                    <View style={styles.activeTag}>
                      <Text style={styles.activeTagText}>CURRENT</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepTimestamp,
                    isActive && styles.stepTimestampActive,
                  ]}
                >
                  {step.timestamp}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  stepsWrapper: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
  },
  nodeColumn: {
    alignItems: 'center',
    width: 24,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dotCompleted: {
    backgroundColor: Colors.brand.emerald,
    borderColor: Colors.brand.emerald,
  },
  dotActive: {
    backgroundColor: Colors.brand.navy,
    borderColor: Colors.brand.emerald,
    borderWidth: 2,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  activeInnerPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  pendingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  connectorLineCompleted: {
    backgroundColor: '#A7F3D0',
  },
  infoColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  infoColumnLast: {
    paddingBottom: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  stepLabelHighlighted: {
    color: '#0F172A',
    fontWeight: '700',
  },
  activeTag: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#D1FAE5',
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  stepTimestamp: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: 'SpaceMono',
  },
  stepTimestampActive: {
    color: '#059669',
    fontWeight: '600',
  },
});
