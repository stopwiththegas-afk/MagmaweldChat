import { useWindowDimensions } from 'react-native';

const BASE_WIDTH = 390;  // iPhone 14 Pro
const BASE_HEIGHT = 844;

export function useLayout() {
  const { width, height, fontScale } = useWindowDimensions();

  const isLandscape = width > height;
  const isTablet = Math.min(width, height) >= 600;

  // Scale relative to base screen width
  const scaleW = (size: number) => Math.round((size / BASE_WIDTH) * width);

  // Scale relative to base screen height
  const scaleH = (size: number) => Math.round((size / BASE_HEIGHT) * height);

  // Uniform scale using the smaller axis (safe for both orientations)
  const scale = (size: number) => {
    const factor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    return Math.round(size * factor);
  };

  // Font scale — accounts for system font size preference
  const fontSize = (size: number) => Math.round(scale(size) / fontScale);

  // Percentage of screen width / height
  const wp = (percent: number) => (percent / 100) * width;
  const hp = (percent: number) => (percent / 100) * height;

  return {
    width,
    height,
    isLandscape,
    isTablet,
    scale,
    scaleW,
    scaleH,
    fontSize,
    wp,
    hp,
  };
}
