import type { FriendDto, FriendRequestDto, SendFriendRequestInput } from "@mypetproj/shared";
import { prisma } from "../../db";
import { AppError } from "../../errors";

export async function sendFriendRequest(userId: string, input: SendFriendRequestInput): Promise<FriendRequestDto> {
  const target = await prisma.user.findUnique({ where: { email: input.email } });
  if (!target) throw new AppError(404, "Пользователь с таким email не зарегистрирован в приложении");
  if (target.id === userId) throw new AppError(400, "Нельзя добавить в друзья самого себя");

  const existing = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { fromUserId: userId, toUserId: target.id },
        { fromUserId: target.id, toUserId: userId },
      ],
      status: { in: ["PENDING", "ACCEPTED"] },
    },
  });
  if (existing) {
    throw new AppError(
      409,
      existing.status === "ACCEPTED" ? "Вы уже друзья" : "Запрос в друзья уже отправлен или ожидает ответа",
    );
  }

  const request = await prisma.friendRequest.create({
    data: { fromUserId: userId, toUserId: target.id },
    include: { fromUser: true, toUser: true },
  });

  return {
    id: request.id,
    direction: "outgoing",
    userId: request.toUser.id,
    email: request.toUser.email,
    displayName: request.toUser.displayName,
    createdAt: request.createdAt.toISOString(),
  };
}

export async function listFriendRequests(userId: string): Promise<FriendRequestDto[]> {
  const requests = await prisma.friendRequest.findMany({
    where: { status: "PENDING", OR: [{ fromUserId: userId }, { toUserId: userId }] },
    include: { fromUser: true, toUser: true },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) => {
    const incoming = r.toUserId === userId;
    const other = incoming ? r.fromUser : r.toUser;
    return {
      id: r.id,
      direction: incoming ? "incoming" : "outgoing",
      userId: other.id,
      email: other.email,
      displayName: other.displayName,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

export async function respondToFriendRequest(requestId: string, userId: string, accept: boolean): Promise<void> {
  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, "Запрос не найден");
  if (request.toUserId !== userId) throw new AppError(403, "Это не твой запрос в друзья");
  if (request.status !== "PENDING") throw new AppError(400, "Запрос уже обработан");

  if (accept) {
    await prisma.friendRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED" } });
  } else {
    await prisma.friendRequest.delete({ where: { id: requestId } });
  }
}

export async function listFriends(userId: string): Promise<FriendDto[]> {
  const accepted = await prisma.friendRequest.findMany({
    where: { status: "ACCEPTED", OR: [{ fromUserId: userId }, { toUserId: userId }] },
    include: {
      fromUser: { include: { character: true } },
      toUser: { include: { character: true } },
    },
  });

  return accepted.map((r) => {
    const friend = r.fromUserId === userId ? r.toUser : r.fromUser;
    return {
      userId: friend.id,
      email: friend.email,
      displayName: friend.displayName,
      level: friend.character?.level ?? 1,
    };
  });
}

/** IDs друзей пользователя (без самого пользователя) — используется для лидерборда. */
export async function listFriendUserIds(userId: string): Promise<string[]> {
  const accepted = await prisma.friendRequest.findMany({
    where: { status: "ACCEPTED", OR: [{ fromUserId: userId }, { toUserId: userId }] },
    select: { fromUserId: true, toUserId: true },
  });
  return accepted.map((r) => (r.fromUserId === userId ? r.toUserId : r.fromUserId));
}
