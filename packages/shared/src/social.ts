import { z } from "zod";

export const SendFriendRequestInputSchema = z.object({
  email: z.string().email(),
});
export type SendFriendRequestInput = z.infer<typeof SendFriendRequestInputSchema>;

export const RespondFriendRequestInputSchema = z.object({
  accept: z.boolean(),
});
export type RespondFriendRequestInput = z.infer<typeof RespondFriendRequestInputSchema>;

export interface FriendDto {
  userId: string;
  email: string;
  displayName: string | null;
  level: number;
}

export interface FriendRequestDto {
  id: string;
  direction: "incoming" | "outgoing";
  userId: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

export const LeaderboardScopeValues = ["global", "friends"] as const;
export type LeaderboardScope = (typeof LeaderboardScopeValues)[number];

export interface LeaderboardEntryDto {
  rank: number;
  userId: string;
  email: string;
  displayName: string | null;
  level: number;
  xp: number;
  isMe: boolean;
}
