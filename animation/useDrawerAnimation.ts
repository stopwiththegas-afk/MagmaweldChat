import { useRef, useState } from 'react';
import { Animated } from 'react-native';

const MENU_WIDTH = 260;

export function useDrawerAnimation() {
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(MENU_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const open = () => {
    setVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const close = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: MENU_WIDTH,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      callback?.();
    });
  };

  return { visible, slideAnim, overlayAnim, open, close };
}
