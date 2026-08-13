import mongoose from "mongoose";

const UserProfileSchema = new mongoose.Schema(
  {
    userProfile: [
      {
        userName: {
          type: String,
          default: "",
          trim: true,
        },
        userToken: {
          type: String,
          required: true,
          unique: true,
          index: true,
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    collection: "userprofiles",
  },
);

const UserProfile =
  mongoose.models.UserProfile ||
  mongoose.model("UserProfile", UserProfileSchema);

export default UserProfile;
