import { StyleSheet } from "react-native";

// ── Colours ────────────────────────────────────────────────────────────────

const COLORS = {
  border: "#d1d5db",
  borderError: "#dc2626",
  focusBorder: "#3b82f6",
  text: "#1f2937",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  required: "#dc2626",
  background: "#ffffff",
  backgroundDisabled: "#f3f4f6",
  backgroundCard: "#f9fafb",
  primary: "#3b82f6",
  primaryText: "#ffffff",
  danger: "#dc2626",
  dangerText: "#ffffff",
  headerBg: "#f3f4f6",
} as const;

// ── Field Styles ───────────────────────────────────────────────────────────

export const fieldStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 4,
    color: COLORS.text,
  },
  required: {
    color: COLORS.required,
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  inputError: {
    borderColor: COLORS.borderError,
  },
  inputDisabled: {
    backgroundColor: COLORS.backgroundDisabled,
    color: COLORS.textMuted,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  error: {
    color: COLORS.borderError,
    fontSize: 12,
    marginTop: 4,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  unsupported: {
    padding: 12,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 6,
  },
  unsupportedText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});

// ── Toggle-specific ────────────────────────────────────────────────────────

export const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  label: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
});

// ── List-specific ──────────────────────────────────────────────────────────

export const listStyles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  itemField: {
    flex: 1,
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 8,
    marginTop: 20,
  },
  removeBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  addBtn: {
    paddingVertical: 8,
    marginTop: 4,
  },
  addBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});

// ── Group / Fieldset ───────────────────────────────────────────────────────

export const groupStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  legend: {
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 12,
    color: COLORS.text,
  },
});

// ── Table (DataTable) ──────────────────────────────────────────────────────

export const tableStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    padding: 20,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    padding: 20,
    textAlign: "center",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerCell: {
    flex: 1,
    paddingHorizontal: 4,
  },
  headerText: {
    fontWeight: "700",
    fontSize: 13,
    color: COLORS.text,
  },
  sortIndicator: {
    fontSize: 10,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 4,
  },
  cellText: {
    fontSize: 14,
    color: COLORS.text,
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 16,
  },
  paginationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  paginationBtnText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  paginationBtnDisabled: {
    color: COLORS.textMuted,
  },
});

// ── Schema List ────────────────────────────────────────────────────────────

export const schemaListStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    backgroundColor: COLORS.background,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});

// ── Record Detail ──────────────────────────────────────────────────────────

export const detailStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fieldRow: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 15,
    color: COLORS.text,
  },
  groupContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  groupLabel: {
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 10,
    color: COLORS.text,
  },
  meta: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
});

// ── Form ───────────────────────────────────────────────────────────────────

export const formStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  submitBtnDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primaryText,
  },
});

// ── Select (Modal-based) ───────────────────────────────────────────────────

export const selectStyles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  triggerError: {
    borderColor: COLORS.borderError,
  },
  triggerDisabled: {
    backgroundColor: COLORS.backgroundDisabled,
  },
  triggerText: {
    fontSize: 14,
    color: COLORS.text,
  },
  triggerPlaceholder: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  triggerArrow: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modal: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalDone: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionSelected: {
    backgroundColor: "#eff6ff",
  },
  optionText: {
    fontSize: 15,
    color: COLORS.text,
  },
  optionCheck: {
    fontSize: 16,
    color: COLORS.primary,
  },
});
