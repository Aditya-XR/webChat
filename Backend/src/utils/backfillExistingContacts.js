import Message from "../models/messages.model.js";
import Contact from "../models/contact.model.js";

export const backfillExistingContacts = async () => {
    try {
        const pairs = await Message.aggregate([
            {
                $group: {
                    _id: {
                        userA: { $min: ["$senderId", "$receiverId"] },
                        userB: { $max: ["$senderId", "$receiverId"] },
                    },
                },
            },
        ]);

        let createdCount = 0;
        for (const pair of pairs) {
            const userA = pair._id.userA;
            const userB = pair._id.userB;

            if (!userA || !userB || userA.toString() === userB.toString()) continue;

            const existing = await Contact.findRelationship(userA, userB);
            if (!existing) {
                await Contact.create({
                    requester: userA,
                    recipient: userB,
                    status: "accepted",
                });
                createdCount++;
            }
        }

        if (createdCount > 0) {
            console.log(`Backfilled ${createdCount} accepted contact relationships from message history`);
        }
    } catch (err) {
        console.error("Failed to backfill existing contacts:", err);
    }
};

