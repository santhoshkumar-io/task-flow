import { UserModel } from "../../models/user.model.js";

// Only the three fields the assignee dropdown needs. Not "everything except
// the hash" — an explicit list cannot accidentally start returning a field
// somebody adds to the model later.
export async function listUsers() {
  return UserModel.find({}, { name: 1, email: 1 }).sort({ name: 1 }).lean();
}
