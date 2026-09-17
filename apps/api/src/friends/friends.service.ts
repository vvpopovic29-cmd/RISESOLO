import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { calculateLevel, calculateRank } from "@risesolo/domain";
import type {
  FriendDto,
  FriendLeaderboardEntryDto,
  FriendRequestDto,
  FriendsLeaderboardResponseDto,
  FriendsOverviewResponse,
} from "@risesolo/validation";
import type { Friendship } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

interface UserWithProfileAndProgression {
  id: string;
  profile: { username: string } | null;
  progression: { totalXp: number } | null;
}

interface FriendshipWithUsers extends Friendship {
  requester: UserWithProfileAndProgression;
  addressee: UserWithProfileAndProgression;
}

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async sendRequest(userId: string, username: string): Promise<FriendRequestDto> {
    const targetProfile = await this.prisma.profile.findUnique({ where: { username } });
    if (!targetProfile) {
      throw new NotFoundException("Korisnik sa tim korisnickim imenom nije pronadjen");
    }
    if (targetProfile.userId === userId) {
      throw new BadRequestException("Ne mozes poslati zahtev za prijateljstvo samom sebi");
    }

    const existing = await this.findFriendshipBetween(userId, targetProfile.userId);
    if (existing) {
      throw new ConflictException(
        existing.status === "ACCEPTED" ? "Vec ste prijatelji" : "Vec postoji zahtev za prijateljstvo sa ovim korisnikom",
      );
    }

    const created = await this.prisma.friendship.create({
      data: { requesterId: userId, addresseeId: targetProfile.userId },
    });
    return { id: created.id, userId: targetProfile.userId, username, createdAt: created.createdAt.toISOString() };
  }

  async acceptRequest(userId: string, requestId: string): Promise<FriendDto> {
    const request = await this.prisma.friendship.findUnique({ where: { id: requestId } });
    if (!request || request.addresseeId !== userId || request.status !== "PENDING") {
      throw new NotFoundException("Zahtev za prijateljstvo nije pronadjen");
    }

    await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });

    return this.buildFriendDto(request.requesterId);
  }

  /** Otkazivanje (od strane posiljaoca) i odbijanje (od strane primaoca) su isti postupak - brisanje reda na cekanju. */
  async removeRequest(userId: string, requestId: string): Promise<void> {
    const request = await this.prisma.friendship.findUnique({ where: { id: requestId } });
    if (!request || (request.requesterId !== userId && request.addresseeId !== userId)) {
      throw new NotFoundException("Zahtev za prijateljstvo nije pronadjen");
    }
    if (request.status !== "PENDING") {
      throw new BadRequestException("Zahtev vise nije na cekanju");
    }
    await this.prisma.friendship.delete({ where: { id: requestId } });
  }

  async removeFriend(userId: string, friendUserId: string): Promise<void> {
    const friendship = await this.findFriendshipBetween(userId, friendUserId);
    if (!friendship || friendship.status !== "ACCEPTED") {
      throw new NotFoundException("Prijateljstvo nije pronadjeno");
    }
    await this.prisma.friendship.delete({ where: { id: friendship.id } });
  }

  async getOverview(userId: string): Promise<FriendsOverviewResponse> {
    const rows = await this.prisma.friendship.findMany({
      where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
      orderBy: { createdAt: "desc" },
      include: {
        requester: { include: { profile: { select: { username: true } }, progression: { select: { totalXp: true } } } },
        addressee: { include: { profile: { select: { username: true } }, progression: { select: { totalXp: true } } } },
      },
    });

    const friends: FriendDto[] = [];
    const incomingRequests: FriendRequestDto[] = [];
    const outgoingRequests: FriendRequestDto[] = [];

    for (const row of rows as FriendshipWithUsers[]) {
      const isRequester = row.requesterId === userId;
      const other = isRequester ? row.addressee : row.requester;
      if (!other.profile) continue;

      if (row.status === "ACCEPTED") {
        friends.push(toFriendDto(other.id, other.profile.username, other.progression?.totalXp ?? 0));
      } else if (isRequester) {
        outgoingRequests.push({
          id: row.id,
          userId: other.id,
          username: other.profile.username,
          createdAt: row.createdAt.toISOString(),
        });
      } else {
        incomingRequests.push({
          id: row.id,
          userId: other.id,
          username: other.profile.username,
          createdAt: row.createdAt.toISOString(),
        });
      }
    }

    return { friends, incomingRequests, outgoingRequests };
  }

  /** "Rivali" - live leaderboard ogranicen na mene + prihvacene prijatelje (isti princip kao LeaderboardService, bez keshiranja). */
  async getFriendsLeaderboard(userId: string): Promise<FriendsLeaderboardResponseDto> {
    const friendships = await this.prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    });
    const friendIds = friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));

    const rows = await this.prisma.progression.findMany({
      where: { userId: { in: [userId, ...friendIds] } },
      orderBy: { totalXp: "desc" },
      include: { user: { include: { profile: { select: { username: true } } } } },
    });

    const entries: FriendLeaderboardEntryDto[] = [];
    rows.forEach((row, index) => {
      if (row.user.profile) {
        entries.push(toLeaderboardEntry(row.userId, row.user.profile.username, row.totalXp, index + 1));
      }
    });

    return { entries };
  }

  private async findFriendshipBetween(userIdA: string, userIdB: string): Promise<Friendship | null> {
    return this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userIdA, addresseeId: userIdB },
          { requesterId: userIdB, addresseeId: userIdA },
        ],
      },
    });
  }

  private async buildFriendDto(userId: string): Promise<FriendDto> {
    const [profile, progression] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.progression.findUnique({ where: { userId } }),
    ]);
    if (!profile) {
      throw new NotFoundException("Profil korisnika nije pronadjen");
    }
    return toFriendDto(userId, profile.username, progression?.totalXp ?? 0);
  }
}

function toFriendDto(userId: string, username: string, totalXp: number): FriendDto {
  const level = calculateLevel(totalXp);
  return { userId, username, level, rank: calculateRank(level), totalXp };
}

function toLeaderboardEntry(userId: string, username: string, totalXp: number, position: number): FriendLeaderboardEntryDto {
  const level = calculateLevel(totalXp);
  return { position, userId, username, level, rank: calculateRank(level), totalXp };
}
