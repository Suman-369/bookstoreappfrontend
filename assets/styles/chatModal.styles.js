import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingTop: 52,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  lastSeenText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 8,
  },
  bubbleSent: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.textDark,
  },
  messageTextSent: {
    color: COLORS.white,
  },
  messageTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 2,
  },
  messageTimeRowReceived: {
    justifyContent: "flex-start",
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  messageTimeSent: {
    color: "rgba(255,255,255,0.8)",
  },
  tickIcon: {
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyChat: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  typingText: {
    fontSize: 13,
    fontStyle: "italic",
    color: COLORS.textSecondary,
  },
});
