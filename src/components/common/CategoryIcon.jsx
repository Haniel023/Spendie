/**
 * CategoryIcon — renders the Lucide icon for a given category name.
 *
 * Looks up categoryConfig[category].iconName, renders the matching Lucide icon.
 * Falls back to <Tag> if category is unknown or iconName is missing.
 *
 * Usage:
 *   <CategoryIcon category="Food" size={18} color="#fff" />
 */

import {
  Tag,
  Briefcase, Laptop, TrendingUp, Building2,
  UtensilsCrossed, Bus, ShoppingBag, Pill, Clapperboard, Gamepad2,
  Home, KeyRound, Zap, Wifi, ShieldCheck, Landmark,
  Package, PiggyBank,
  BookOpen, Plane, Gift,
  Receipt, Target, CircleUser,
} from 'lucide-react-native';
import { categoryConfig } from '../../lib/categoryConfig';

const ICON_MAP = {
  Tag,
  Briefcase, Laptop, TrendingUp, Building2,
  UtensilsCrossed, Bus, ShoppingBag, Pill, Clapperboard, Gamepad2,
  Home, KeyRound, Zap, Wifi, ShieldCheck, Landmark,
  Package, PiggyBank,
  BookOpen, Plane, Gift,
  Receipt, Target, CircleUser,
};

export default function CategoryIcon({ category, size = 18, color }) {
  const iconName = categoryConfig[category]?.iconName ?? 'Tag';
  const Icon = ICON_MAP[iconName] ?? Tag;
  const iconColor = color ?? categoryConfig[category]?.color ?? '#6b7280';
  return <Icon size={size} color={iconColor} />;
}
