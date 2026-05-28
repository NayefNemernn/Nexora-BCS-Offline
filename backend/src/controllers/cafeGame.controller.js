import CafeCustomer, { getTier } from "../models/CafeCustomer.js";
import CafeGameSession           from "../models/CafeGameSession.js";
import { awardPoints }           from "./cafeCustomer.controller.js";

/* Points tables per game */
const GAME_POINTS = {
  slot: (result) => {
    const { reels } = result;
    if (!reels || reels.length !== 3) return 10;
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      return reels[0] === "⭐" ? 500 : 200;
    }
    if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) return 50;
    return 10;
  },
  scratch: (result) => {
    const MAP = { coin: 50, gem: 150, crown: 300 };
    return MAP[result.prize] || 20;
  },
  wheel: (result) => {
    const MAP = {
      "25 pts": 25, "50 pts": 50, "75 pts": 75,
      "100 pts": 100, "200 pts": 200, "15 pts": 15,
    };
    return MAP[result.segment] || 25;
  },
  mystery: (result) => {
    return result.points || 50;
  },
  trivia: (result) => {
    const { correct = 0, total = 3 } = result;
    const base   = correct * 30;
    const streak = correct === total ? 20 : 0;
    return base + streak;
  },
};

const hasPlayedForPointsToday = async (customerId, storeId) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  return CafeGameSession.findOne({
    customerId, storeId, isForPoints: true,
    createdAt: { $gte: start, $lte: end },
  });
};

/* ── GET /api/cafe/public/:slug/games/status ── */
export const getGameStatus = async (req, res) => {
  try {
    const customer  = await CafeCustomer.findById(req.customerId);
    if (!customer) return res.status(404).json({ message: "Not found" });

    const played    = await hasPlayedForPointsToday(customer._id, customer.storeId);
    const todayGames = await CafeGameSession.find({
      customerId: customer._id,
      createdAt:  { $gte: new Date(new Date().setHours(0,0,0,0)) },
    });

    res.json({
      canEarnPoints:  !played,
      playedForPoints: played ? played.gameType : null,
      todayGamesCount: todayGames.length,
      customer: {
        points:     customer.points,
        tier:       customer.tier,
        multiplier: getTier(customer.points).multiplier,
        pendingBonus: customer.pendingBonus,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ── POST /api/cafe/public/:slug/games/result ── */
export const recordGameResult = async (req, res) => {
  try {
    const { gameType, result } = req.body;
    const VALID = ["slot", "scratch", "wheel", "mystery", "trivia"];
    if (!VALID.includes(gameType)) return res.status(400).json({ message: "Invalid game type" });

    const customer = await CafeCustomer.findById(req.customerId);
    if (!customer) return res.status(404).json({ message: "Not found" });

    /* Check if already played for points today */
    const alreadyPlayed = await hasPlayedForPointsToday(customer._id, customer.storeId);
    const isForPoints   = !alreadyPlayed;

    let pointsAwarded = 0;
    let specialPrize  = null;

    if (isForPoints) {
      const raw = GAME_POINTS[gameType](result);
      const multiplier = getTier(customer.points).multiplier;

      /* Wheel special prizes */
      if (gameType === "wheel") {
        if (result.segment === "Free add-on") {
          specialPrize = "free_addon";
          customer.pendingBonus.freeAddOn = "Free add-on (spin wheel)";
          pointsAwarded = 0;
        } else if (result.segment === "Double order pts") {
          specialPrize = "double_order_pts";
          customer.pendingBonus.doubleOrderPoints = true;
          pointsAwarded = 0;
        } else {
          pointsAwarded = Math.round(raw);
        }
      } else {
        pointsAwarded = Math.round(raw);
      }

      /* Mystery box free item */
      if (gameType === "mystery" && result.freeItem) {
        specialPrize = "free_item";
        pointsAwarded = 0;
      }

      if (pointsAwarded > 0) {
        await awardPoints(customer, pointsAwarded, "game", `${gameType} game result`);
      } else if (specialPrize) {
        await customer.save();
      }
    }

    /* Save session record */
    await CafeGameSession.create({
      customerId:    customer._id,
      storeId:       customer.storeId,
      gameType,
      result,
      pointsAwarded,
      isForPoints,
    });

    res.json({
      isForPoints,
      pointsAwarded,
      specialPrize,
      customer: {
        points:      customer.points,
        tier:        customer.tier,
        pendingBonus: customer.pendingBonus,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
