import User from "../models/user.model.js";

export const backfillExistingUsersAsVerified = async () => {
    const result = await User.updateMany(
        { isVerified: { $exists: false } },
        { $set: { isVerified: true } }
    );

    if (result.modifiedCount > 0) {
        console.log(`Backfilled verification status for ${result.modifiedCount} existing users`);
    }
};
