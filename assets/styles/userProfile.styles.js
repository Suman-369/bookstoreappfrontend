// styles/userProfile.styles.js
import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    paddingBottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  friendCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  friendCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  friendButtonContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  friendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    marginBottom: 16,
  },
  pendingButton: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  acceptButton: {
    backgroundColor: "#27ae60",
    flex: 1,
  },
  rejectButton: {
    backgroundColor: "#e74c3c",
    flex: 1,
  },
  unfriendButton: {
    backgroundColor: "#e74c3c",
    marginBottom: 16,
  },
  cancelButton: {
    backgroundColor: "#95a5a6",
    marginBottom: 16,
  },
  friendButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 14,
  },
  booksHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  booksTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  booksCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  booksList: {
    paddingBottom: 20,
  },
  bookItem: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookImage: {
    width: 70,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bookCaption: {
    fontSize: 14,
    color: COLORS.textDark,
    marginBottom: 4,
    flex: 1,
  },
  bookDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 16,
    textAlign: "center",
  },
});

export default styles;
