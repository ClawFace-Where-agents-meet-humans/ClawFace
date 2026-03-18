/**
 * Minimal React Native type declarations for the SDK.
 *
 * We intentionally do NOT depend on @types/react-native to avoid the React
 * types duplication conflict that occurs in monorepos where @types/react is
 * already installed.  Consumers (Expo / bare RN projects) will have the full
 * types from their own react-native installation which take precedence over
 * these stubs.
 */

declare module "react-native" {
  import type React from "react";

  // ── Style types ──────────────────────────────────────────────────────────

  type FlexAlignType = "flex-start" | "flex-end" | "center" | "stretch" | "baseline";

  interface FlexStyle {
    flex?: number;
    flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
    justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly";
    alignItems?: FlexAlignType;
    alignSelf?: FlexAlignType | "auto";
    flexWrap?: "wrap" | "nowrap" | "wrap-reverse";
    gap?: number;
  }

  interface ViewStyle extends FlexStyle {
    backgroundColor?: string;
    borderWidth?: number;
    borderColor?: string;
    borderRadius?: number;
    borderBottomWidth?: number;
    borderBottomColor?: string;
    borderTopWidth?: number;
    borderTopColor?: string;
    borderTopLeftRadius?: number;
    borderTopRightRadius?: number;
    padding?: number;
    paddingHorizontal?: number;
    paddingVertical?: number;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    margin?: number;
    marginBottom?: number;
    marginTop?: number;
    marginLeft?: number;
    marginRight?: number;
    marginHorizontal?: number;
    minHeight?: number;
    maxHeight?: number | string;
  }

  interface TextStyle extends ViewStyle {
    color?: string;
    fontSize?: number;
    fontWeight?: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
    lineHeight?: number;
    textAlign?: "auto" | "left" | "right" | "center" | "justify";
    textAlignVertical?: "auto" | "top" | "center" | "bottom";
    textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
    letterSpacing?: number;
  }

  type ImageStyle = ViewStyle;

  type StyleProp<T> = T | (T | undefined | false | null)[] | null | undefined | false;

  interface NamedStyles<T> {
    [key: string]: ViewStyle | TextStyle | ImageStyle;
  }

  // ── StyleSheet ───────────────────────────────────────────────────────────

  export const StyleSheet: {
    create<T extends NamedStyles<T>>(styles: T): T;
    hairlineWidth: number;
    flatten<T>(style: StyleProp<T>): T;
  };

  // ── Core components ──────────────────────────────────────────────────────

  interface ViewProps {
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
    onStartShouldSetResponder?: () => boolean;
  }
  export const View: React.FC<ViewProps>;

  interface TextProps {
    style?: StyleProp<TextStyle>;
    children?: React.ReactNode;
    numberOfLines?: number;
  }
  export const Text: React.FC<TextProps>;

  interface TextInputProps {
    style?: StyleProp<TextStyle>;
    value?: string;
    onChangeText?: (text: string) => void;
    editable?: boolean;
    placeholder?: string;
    placeholderTextColor?: string;
    multiline?: boolean;
    numberOfLines?: number;
    keyboardType?: "default" | "numeric" | "email-address" | "phone-pad" | "numbers-and-punctuation";
    secureTextEntry?: boolean;
  }
  export const TextInput: React.FC<TextInputProps>;

  interface SwitchProps {
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    disabled?: boolean;
  }
  export const Switch: React.FC<SwitchProps>;

  interface PressableProps {
    style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
    children?: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
  }
  export const Pressable: React.FC<PressableProps>;

  interface ScrollViewProps extends ViewProps {
    contentContainerStyle?: StyleProp<ViewStyle>;
  }
  export const ScrollView: React.FC<ScrollViewProps>;

  interface FlatListProps<T> {
    style?: StyleProp<ViewStyle>;
    data: T[];
    keyExtractor?: (item: T, index: number) => string;
    renderItem: (info: { item: T; index: number }) => React.JSX.Element | null;
    ListEmptyComponent?: React.ComponentType<unknown> | React.JSX.Element | null;
    ListFooterComponent?: React.ComponentType<unknown> | React.JSX.Element | null;
    ListHeaderComponent?: React.ComponentType<unknown> | React.JSX.Element | null;
  }
  export function FlatList<T>(props: FlatListProps<T>): React.JSX.Element;

  interface ModalProps {
    visible?: boolean;
    transparent?: boolean;
    animationType?: "none" | "slide" | "fade";
    onRequestClose?: () => void;
    children?: React.ReactNode;
  }
  export const Modal: React.FC<ModalProps>;

  interface ActivityIndicatorProps {
    size?: "small" | "large";
    color?: string;
  }
  export const ActivityIndicator: React.FC<ActivityIndicatorProps>;
}
