type GamePhase = "準備開始遊戲" | "事件" | "準備" | "行動" | "結算";

type ElementType = "火" | "水" | "木" | "無";
type PlayerElementType = Exclude<ElementType, "無">;
type SpellCardType = "冰凍法術" | "炸彈法術" | "毒藥法術";
type AttackCardType = "魔法棒" | SpellCardType;

type Player = {
  id: number;
  name: string;
  attack: Record<PlayerElementType, number>;
  loot: {
    gold: number;
    manaStone: number;
    spellCards: Record<AttackCardType, number>;
  };
};

type Skill = {
  name: string;
  description: string;
  trigger: "onAppear" | "onHit" | "onTurnStart" | "onTurnEnd";
  applyEffect: (
    slotID: "A" | "B" | "C",
    battlefieldSlots: [BattleFieldSlot, BattleFieldSlot, BattleFieldSlot],
    queueMonsters: Monster[],
    updateBattlefieldSlots: (
      updated: [BattleFieldSlot, BattleFieldSlot, BattleFieldSlot]
    ) => void,
    updateQueue: (updated: Monster[]) => void
  ) => void;
};

export const skillTable: Record<string, Skill> = {
  屬性輪轉: {
    name: "屬性輪轉",
    description: "每受到一次攻擊，按照 火 → 水 → 木 → 火 的順序變換屬性。",
    trigger: "onHit",
    applyEffect: (slotid, slots, _queue, updateSlots, _updateQueue) => {
      const order: ElementType[] = ["火", "水", "木"];
      const slotIndex = ["A", "B", "C"].indexOf(slotid);
      const monster = slots[slotIndex].monster;
      if (!monster) return;
      const nextIndex = (order.indexOf(monster.type) + 1) % order.length;
      const newType = order[nextIndex];
      monster.type = newType;
      updateSlots(
        slots.map((s, i) =>
          i === slotIndex ? { ...s, monster: { ...monster } } : s
        ) as [BattleFieldSlot, BattleFieldSlot, BattleFieldSlot]
      );
      console.log(
        `[戰場${slotid}] ${monster.name} 的屬性輪轉技能觸發，變為 ${newType}`
      );
    },
  },
  恢復: {
    name: "恢復",
    description: "每回合結束時恢復 2 點生命值。",
    trigger: "onTurnEnd",
    applyEffect: (slotid, slots, _queue, updateSlots, _updateQueue) => {
      const slotIndex = ["A", "B", "C"].indexOf(slotid);
      const monster = slots[slotIndex].monster;
      if (!monster) return;
      const healed = Math.min(monster.HP + 2, monster.maxHP);

      monster.HP = healed;
      updateSlots(
        slots.map((s, i) =>
          i === slotIndex ? { ...s, monster: { ...monster } } : s
        ) as [BattleFieldSlot, BattleFieldSlot, BattleFieldSlot]
      );
      console.log(
        `[戰場${slotid}] ${monster.name} 恢復技能觸發，生命恢復至 ${healed}`
      );
    },
  },
};

export const skillname = ["屬性輪轉", "恢復"];

type Monster = {
  maxHP: number;
  HP: number;
  name: string;
  type: ElementType;
  loot: {
    gold: number;
    manaStone: number;
    spellCards: SpellCardType | null;
  };
  imageUrl: string | null;
  skill: string | null;
};

type BattleFieldSlot = {
  monster: Monster | null;
  id: "A" | "B" | "C";
  poisonedBy: number[] | null;
  lastIcedBy: number | null;
};

type EventEffect = {
  description: string;
  weighted?: number;
  applyEffect: () => void;
};

type GameEvent = {
  name: string;
  weighted?: number;
  effects: [EventEffect, ...EventEffect[]];
};

type AttackAction = {
  player: Player;
  battlefieldId: "A" | "B" | "C";
  cardType: AttackCardType;
  element?: PlayerElementType;
};

type GameLog = {
  round: number;
  phase: GamePhase;
  message: string;
};

type GameState = {
  turn: number;
  phase: GamePhase;
  players: Player[];
  battlefieldmonster: [BattleFieldSlot, BattleFieldSlot, BattleFieldSlot];
  queuemonsters: Monster[];
  event: GameEvent;
  log: GameLog[];
};

export const monsterNameTable: Record<number, Record<ElementType, string[]>> = {
  1: {
    火: ["火史萊姆", "火精靈", "火丘丘"],
    水: ["水史萊姆", "水精靈", "冰丘丘"],
    木: ["草史萊姆", "草精靈"],
    無: ["骷髏", "鬼魂"],
  },
  2: {
    火: ["燃燒史萊姆", "火山地精"],
    水: ["液態史萊姆", "冰原地精"],
    木: ["翠綠史萊姆", "森林地精"],
    無: ["穴居人"],
  },
  3: {
    火: ["Cappuccino Assassino", "Ballerina Cappuccina"],
    水: ["Tralalero Tralala", "Trippi Troppi"],
    木: ["BrrBrr Patapim", "Lirilì Larilà"],
    無: ["TungTung Sahur", "Bombardiro Crocodilo"],
  },
  4: {
    火: ["火焰巨人", "奧爾龍"],
    水: ["冰霜巨人", "聶爾龍"],
    木: ["森林巨人", "蜥蜴戰士"],
    無: ["暗影巨人", "西諾克斯"],
  },
  5: {
    火: ["三頭龍"],
    水: ["三頭龍"],
    木: ["三頭龍"],
    無: ["暗影龍"],
  },
};

import { useState, useEffect, useRef, useMemo } from "react";

export default function useGameLogic() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [turn, setTurn] = useState<number>(1);
  const [phase, setPhase] = useState<GamePhase>("準備開始遊戲");
  const [players, setPlayers] = useState<Player[]>([]);
  const [battlefieldSlots, setBattleFieldSlots] = useState<
    [BattleFieldSlot, BattleFieldSlot, BattleFieldSlot]
  >([
    { monster: null, id: "A", poisonedBy: null, lastIcedBy: null },
    { monster: null, id: "B", poisonedBy: null, lastIcedBy: null },
    { monster: null, id: "C", poisonedBy: null, lastIcedBy: null },
  ]);
  const [queueMonsters, setQueueMonsters] = useState<Monster[]>([]);
  const [monsterAmount, setMonsterAmount] = useState<number>(0);

  const Goblin: Monster[] = [
    {
      maxHP: 5,
      HP: 5,
      name: "炙熱哥布林",
      type: "火",
      loot: {
        gold: 2,
        manaStone: 0,
        spellCards: null,
      },
      imageUrl: null,
      skill: null,
    },
    {
      maxHP: 5,
      HP: 5,
      name: "冰冷哥布林",
      type: "水",
      loot: {
        gold: 2,
        manaStone: 0,
        spellCards: null,
      },
      imageUrl: null,
      skill: null,
    },
    {
      maxHP: 5,
      HP: 5,
      name: "狂野哥布林",
      type: "木",
      loot: {
        gold: 2,
        manaStone: 0,
        spellCards: null,
      },
      imageUrl: null,
      skill: null,
    },
  ];

  useEffect(() => {
    if (queueMonsters.length === 0) return;

    let needUpdate = false;
    const newQueue = [...queueMonsters];

    const updated = battlefieldSlots.map((slot) => {
      if (slot.monster === null && newQueue.length > 0) {
        needUpdate = true;
        return {
          ...slot,
          monster: newQueue.shift()!,
          poisonedBy: null,
          lastIcedBy: null,
        };
      }
      return slot;
    });

    if (needUpdate) {
      setBattleFieldSlots(
        updated as [BattleFieldSlot, BattleFieldSlot, BattleFieldSlot]
      );
      setQueueMonsters(newQueue);
    }
  }, [queueMonsters]); // ✅ 只依賴 queueMonsters

  const eventTable: GameEvent[] = [
    {
      name: "無事件",
      weighted: 5,
      effects: [
        {
          description: "本回合風平浪靜，什麼也沒發生。",
          applyEffect: () => {
            addClientLog("本回合風平浪靜，什麼也沒發生。");
            console.log("本回合風平浪靜，什麼也沒發生。");
          },
        },
      ],
    },
    {
      name: "旅行商人",
      weighted: 1,
      effects: [
        {
          description: "出現旅行商人，玩家可以花費金幣購買法術卡。",
          applyEffect: () => {
            addClientLog("出現旅行商人，玩家可以花費金幣購買法術卡。");
            console.log("出現旅行商人，玩家可以花費金幣購買法術卡。");
          },
        },
      ],
    },
    {
      name: "精靈的祝福",
      weighted: 1,
      effects: [
        {
          description: "精靈降臨，所有玩家獲得 +1 魔能石。",
          applyEffect: () => {
            addClientLog("精靈降臨，所有玩家獲得 +1 魔能石。");
            console.log("精靈降臨，所有玩家獲得 +1 魔能石。");
            setPlayers((prev) =>
              prev.map((p) => ({
                ...p,
                loot: {
                  ...p.loot,
                  manaStone: p.loot.manaStone + 1,
                },
              }))
            );
          },
        },
      ],
    },
    {
      name: "元素紊亂",
      weighted: 3,
      effects: [
        {
          description: "元素能量混亂，所有攻擊視為無屬性",
          weighted: 1,
          applyEffect: () => {
            setEventFlags((prev) => ({
              ...prev,
              allAttackNeutral: true,
            }));
            addClientLog("元素能量混亂，所有攻擊視為無屬性");
            console.log("⚡ 所有攻擊為無屬性攻擊");
          },
        },
        {
          description: "元素能量混亂，火屬性傷害無效",
          weighted: 1,
          applyEffect: () => {
            setEventFlags((prev) => ({
              ...prev,
              disableElement: "火",
            }));
            addClientLog("元素能量混亂，火屬性傷害無效");
            console.log("⚡ 火屬性傷害無效");
          },
        },
        {
          description: "元素能量混亂，水屬性傷害無效",
          weighted: 1,
          applyEffect: () => {
            setEventFlags((prev) => ({
              ...prev,
              disableElement: "水",
            }));
            addClientLog("元素能量混亂，水屬性傷害無效");
            console.log("⚡ 水屬性傷害無效");
          },
        },
        {
          description: "元素能量混亂，木屬性傷害無效",
          weighted: 1,
          applyEffect: () => {
            setEventFlags((prev) => ({
              ...prev,
              disableElement: "木",
            }));
            addClientLog("元素能量混亂，木屬性傷害無效");
            console.log("⚡ 木屬性傷害無效");
          },
        },
      ],
    },
    {
      name: "哥布林襲擊",
      weighted: 1,
      effects: [
        {
          description: "3隻哥布林衝入列隊，血量5，擊殺可得 2 金幣。",
          applyEffect: () => {
            addClientLog("3隻哥布林衝入列隊，血量5，擊殺可得 2 金幣。");
            console.log("🗡️ 生成哥布林 x3");
            setQueueMonsters((prev) => [...Goblin, ...prev]);
          },
        },
      ],
    },
    {
      name: "掏金熱",
      weighted: 1,
      effects: [
        {
          description: "本回合擊殺怪物獲得雙倍金幣。",
          applyEffect: () => {
            setEventFlags((prev) => ({
              ...prev,
              doubleGold: true,
            }));
            addClientLog("本回合擊殺怪物獲得雙倍金幣。");
            console.log("💰 本回合擊殺金幣加倍！");
          },
        },
      ],
    },
  ];

  const [event, setEvent] = useState<GameEvent>(
    eventTable.find((e) => e.name === "無事件")!
  );
  const [eventFlags, setEventFlags] = useState<{
    doubleGold: boolean;
    allAttackNeutral: boolean;
    disableElement: ElementType | null;
  }>({
    doubleGold: false,
    allAttackNeutral: false,
    disableElement: null,
  });
  const [clientLog, setClientLog] = useState<GameLog[]>([]);
  const [supervisorLog, setSupervisorLog] = useState<GameLog[]>([]);

  useEffect(() => {
    setGameState({
      turn,
      phase,
      players,
      battlefieldmonster: battlefieldSlots,
      queuemonsters: queueMonsters,
      event,
      log: clientLog,
    });
  }, [turn, phase, players, battlefieldSlots, queueMonsters, event, clientLog]);

  const addClientLog = (message: string) => {
    setClientLog((prev) => [...prev, { round: turn, phase: phase, message }]);
    addSupervisorLog(message);
  };
  const addSupervisorLog = (message: string) => {
    setSupervisorLog((prev) => [
      ...prev,
      { round: turn, phase: phase, message },
    ]);
  };

  const generatePlayers = (numPlayers: number) => {
    const newPlayers: Player[] = [];
    for (let i = 1; i <= numPlayers; i++) {
      newPlayers.push({
        id: i,
        name: `玩家${i}`,
        attack: {
          火: 0,
          水: 0,
          木: 0,
        },
        loot: {
          gold: 0,
          manaStone: 3,
          spellCards: {
            魔法棒: 1,
            冰凍法術: 0,
            炸彈法術: 0,
            毒藥法術: 0,
          },
        },
      });
    }
    setPlayers(newPlayers);
  };

  const rotatePlayers = () => {
    setPlayers((prev) => {
      if (prev.length === 0) return prev;
      return [...prev.slice(1), prev[0]];
    });
  };

  const addMonsterToQueue = (monster: Monster) => {
    setQueueMonsters((prev) => [...prev, monster]);
    setMonsterAmount((prev) => prev + 1);
  };

  const [forcedNextMonster, setForcedNextMonster] = useState<Monster[]>([]);

  const addMonster = () => {
    if (forcedNextMonster.length > 0) {
      const monster = forcedNextMonster.shift();
      if (monster) {
        addMonsterToQueue(monster);
      }
    } else {
      addRandomMonstersToQueue();
    }
  };

  const addRandomMonstersToQueue = () => {
    // 隨機生成數字的輔助函式
    const getRandomInt = (min: number, max: number): number => {
      const flooredMin = Math.floor(min);
      const ceiledMax = Math.ceil(max);
      return (
        Math.floor(Math.random() * (ceiledMax - flooredMin + 1)) + flooredMin
      );
    };
    // 隨機選擇 屬性 的輔助函式
    const getRandomElementType = (): ElementType => {
      const weighted: ElementType[] = [
        "火",
        "火",
        "水",
        "水",
        "木",
        "木",
        "無",
      ];
      const idx = Math.floor(Math.random() * weighted.length);
      return weighted[idx];
    };
    //隨機選擇 怪物名稱 的輔助函式
    let waightedLevels: number[] = [];
    if (monsterAmount < 3 && monsterAmount >= 0) {
      waightedLevels = [1];
    } else if (monsterAmount < 6 && monsterAmount >= 3) {
      waightedLevels = [1, 1, 1, 2, 2];
    } else if (monsterAmount < 9 && monsterAmount >= 6) {
      waightedLevels = [1, 2, 2, 2, 2];
    } else if (monsterAmount < 12 && monsterAmount >= 9) {
      waightedLevels = [2, 2, 2, 3, 3];
    } else if (monsterAmount < 15 && monsterAmount >= 12) {
      waightedLevels = [2, 3, 3, 3, 3];
    } else if (monsterAmount >= 15) {
      waightedLevels = [3];
    }
    let waightedLevels_index = Math.floor(
      Math.random() * waightedLevels.length
    );
    const level = waightedLevels[waightedLevels_index];

    const getRandomMonsterName = (type: ElementType): string => {
      const names = monsterNameTable[level][type];
      const idx = Math.floor(Math.random() * names.length);
      return names[idx];
    };

    const getRandomSpellCard = (): SpellCardType => {
      const cards: SpellCardType[] = ["冰凍法術", "炸彈法術", "毒藥法術"];
      const index = Math.floor(Math.random() * cards.length);
      return cards[index];
    };

    const roundAvgAttack =
      players.length === 0
        ? 0
        : players.reduce((sum, player) => {
            const attackSum = Object.values(player.attack).reduce(
              (a, b) => a + b,
              0
            );
            return sum + attackSum;
          }, 0) / 3;

    const AvgHP =
      (roundAvgAttack * 1.5 + monsterAmount * 0.8 + turn * 0.5 + level * 3) **
      0.8;
    console.log(
      `${AvgHP} = ${roundAvgAttack} + ${monsterAmount * 0.5} + ${turn * 0.5}`
    );
    const _maxHP = getRandomInt(AvgHP - 2, AvgHP + 2);
    const _type = getRandomElementType();
    const _name = getRandomMonsterName(_type);
    let gold = 0;
    let manaStone = 0;
    let spellCards: SpellCardType | null = null;

    // 第一個戰利品（必定出現）
    if (Math.random() < 0.5) {
      gold += 1;
    } else {
      manaStone += 1;
    }

    if (level >= 2) {
      if (Math.random() < 0.5) {
        gold += 1;
      } else {
        manaStone += 1;
      }
    }

    // 法術戰利品（40% 機率出現）
    if (Math.random() < 0.4) {
      spellCards = getRandomSpellCard();
    }

    const newMonster: Monster = {
      maxHP: _maxHP,
      HP: _maxHP,
      name: _name,
      type: _type,
      loot: {
        gold,
        manaStone,
        spellCards,
      },
      imageUrl: null,
      skill: null,
    };
    addMonsterToQueue(newMonster);
  };
  const [attackActions, setAttackActions] = useState<AttackAction[]>([]);

  const addAttackAction = (action: AttackAction) => {
    setAttackActions((prev) => [...prev, action]);
  };

  //取消上個添加的攻擊行動
  const cancelLastAttackAction = () => {
    setAttackActions((prev) => {
      if (prev.length === 0) return prev;
      const newActions = [...prev];
      newActions.pop();
      return newActions;
    });
  };

  const handleSkillTrigger = (
    monster: Monster,
    slotId: "A" | "B" | "C",
    trigger: "onHit" | "onTurnStart" | "onTurnEnd" | "onAppear",
    battlefieldSlots: [BattleFieldSlot, BattleFieldSlot, BattleFieldSlot],
    queueMonsters: Monster[],
    updateSlots: (
      slots: [BattleFieldSlot, BattleFieldSlot, BattleFieldSlot]
    ) => void,
    updateQueue: (queue: Monster[]) => void,
    addLog: boolean = false
  ) => {
    if (!monster.skill) return;
    const skill = skillTable[monster.skill];
    if (!skill || skill.trigger !== trigger) return;

    skill.applyEffect(
      slotId,
      battlefieldSlots,
      queueMonsters,
      updateSlots,
      updateQueue
    );
    if (!addLog) {
      return;
    }
    if (skill.name === "屬性輪轉") {
      addSupervisorLog(
        `[${slotId}] ${monster.name} 的屬性輪轉技能觸發，變為 ${monster.type}`
      );
    }
  };

  const processAttackActions = () => {
    let updatedPlayers = structuredClone(players);
    let updatedSlots = structuredClone(battlefieldSlots);
    let updatedQueue = structuredClone(queueMonsters);
    const idToIndex = { A: 0, B: 1, C: 2 };

    const resolvePoisonDamage = () => {
      for (let i = 0; i < updatedSlots.length; i++) {
        const slot = updatedSlots[i];
        const target = slot?.monster;
        if (!target || !slot.poisonedBy || slot.lastIcedBy) continue;

        for (const poisonerId of slot.poisonedBy) {
          const poisoner = updatedPlayers.find((p) => p.id === poisonerId);
          if (!poisoner) continue;

          target.HP -= 1;
          addSupervisorLog(
            `[${slot.id}] 第${poisoner.id}組 的毒藥對 ${target.name} 造成 1 點傷害`
          );

          handleSkillTrigger(
            target,
            slot.id,
            "onHit",
            updatedSlots,
            updatedQueue,
            (s) => (updatedSlots = s),
            (q) => (updatedQueue = q),
            true
          );

          if (target.HP <= 0) {
            const gold = eventFlags.doubleGold
              ? target.loot.gold * 2
              : target.loot.gold;
            poisoner.loot.gold += gold;
            poisoner.loot.manaStone += target.loot.manaStone;
            if (target.loot.spellCards) {
              poisoner.loot.spellCards[target.loot.spellCards]++;
            }

            const rewards = [];
            if (gold) rewards.push(`${gold} 金幣`);
            if (target.loot.manaStone)
              rewards.push(`${target.loot.manaStone} 魔能石`);
            if (target.loot.spellCards)
              rewards.push(`1 張 ${target.loot.spellCards} 卡`);

            addClientLog(
              `[${slot.id}] 第${poisoner.id}組 殺死了 ${target.name}，${
                rewards.length
                  ? `獲得 ${rewards.join("、")}`
                  : "無獲得任何戰利品"
              }`
            );

            updatedSlots[i] = {
              ...slot,
              monster: updatedQueue.shift() ?? null,
              poisonedBy: null,
              lastIcedBy: null,
            };

            break;
          }

          updatedSlots[i] = { ...slot };
          break;
        }
      }
    };

    for (const action of attackActions) {
      resolvePoisonDamage();

      const battlefieldIndex = idToIndex[action.battlefieldId];
      const slot = updatedSlots[battlefieldIndex];
      const target = slot?.monster;
      const currentPlayer = updatedPlayers.find(
        (p) => p.id === action.player.id
      );
      if (!slot || !target || !currentPlayer) continue;

      // 冰凍判斷
      if (slot.lastIcedBy === currentPlayer.id) {
        addSupervisorLog(`[${slot.id}] 第${currentPlayer.id}組 的冰凍解除`);
        slot.lastIcedBy = null;
      } else if (slot.lastIcedBy && action.cardType !== "炸彈法術") {
        const freezer = updatedPlayers.find((p) => p.id === slot.lastIcedBy);
        addSupervisorLog(
          `[${slot.id}] 因 ${freezer?.name} 的冰凍，第${currentPlayer.id}組 攻擊失效`
        );
        continue;
      }

      if (action.cardType === "魔法棒") {
        const element = action.element!;
        const counter = { 火: "木", 木: "水", 水: "火", 無: "無" };
        const weak = { 火: "水", 水: "木", 木: "火", 無: "無" };

        if (element === eventFlags.disableElement) {
          addSupervisorLog(
            `[${slot.id}] 第${currentPlayer.id}組 的 ${element} 屬性因事件效果失效，攻擊無效`
          );
          continue;
        }

        let dmg = currentPlayer.attack[element];
        if (!eventFlags.allAttackNeutral) {
          if (target.type === counter[element]) dmg *= 2;
          if (target.type === weak[element]) dmg = 0;
        }

        target.HP -= dmg;
        addSupervisorLog(
          `[${slot.id}] 第${currentPlayer.id}組 使用魔法棒(${element}) 對 ${target.name} 造成 ${dmg} 點傷害`
        );

        handleSkillTrigger(
          target,
          slot.id,
          "onHit",
          updatedSlots,
          updatedQueue,
          (s) => (updatedSlots = s),
          (q) => (updatedQueue = q),
          true
        );
      } else if (action.cardType === "冰凍法術") {
        slot.lastIcedBy = currentPlayer.id;
        target.HP -= 2;
        currentPlayer.loot.spellCards.冰凍法術--;
        addSupervisorLog(
          `[${slot.id}] 第${currentPlayer.id}組 使用 冰凍法術 造成 2 點傷害`
        );

        handleSkillTrigger(
          target,
          slot.id,
          "onHit",
          updatedSlots,
          updatedQueue,
          (s) => (updatedSlots = s),
          (q) => (updatedQueue = q),
          true
        );
      } else if (action.cardType === "炸彈法術") {
        addSupervisorLog(`[ALL] 第${currentPlayer.id}組 使用 炸彈法術`);
        currentPlayer.loot.spellCards.炸彈法術--;
        for (let i = 0; i < updatedSlots.length; i++) {
          const s = updatedSlots[i];
          const m = s.monster;
          if (!m) continue;

          if (s.lastIcedBy) {
            addSupervisorLog(
              `[${s.id}] 因 ${players[s.lastIcedBy].name} 的冰凍，第${
                currentPlayer.id
              }組 攻擊失效`
            );
            continue;
          }

          m.HP -= 2;
          addSupervisorLog(
            `[${s.id}] 第${currentPlayer.id}組 對 ${m.name} 造成 2 點傷害`
          );

          handleSkillTrigger(
            m,
            s.id,
            "onHit",
            updatedSlots,
            updatedQueue,
            (slots) => (updatedSlots = slots),
            (queue) => (updatedQueue = queue),
            true
          );

          if (m.HP <= 0) {
            const gold = eventFlags.doubleGold ? m.loot.gold * 2 : m.loot.gold;
            currentPlayer.loot.gold += gold;
            currentPlayer.loot.manaStone += m.loot.manaStone;
            if (m.loot.spellCards)
              currentPlayer.loot.spellCards[m.loot.spellCards]++;

            const rewards = [];
            if (gold) rewards.push(`${gold} 金幣`);
            if (m.loot.manaStone) rewards.push(`${m.loot.manaStone} 魔能石`);
            if (m.loot.spellCards) rewards.push(`1 張 ${m.loot.spellCards} 卡`);

            addClientLog(
              `[${s.id}] 第${currentPlayer.id}組 殺死了 ${m.name}，${
                rewards.length
                  ? `獲得 ${rewards.join("、")}`
                  : "無獲得任何戰利品"
              }`
            );

            updatedSlots[i] = {
              ...s,
              monster: updatedQueue.shift() ?? null,
              poisonedBy: null,
              lastIcedBy: null,
            };
          }
        }
      } else if (action.cardType === "毒藥法術") {
        currentPlayer.loot.spellCards.毒藥法術--;
        if (!slot.poisonedBy) slot.poisonedBy = [];
        if (!slot.poisonedBy.includes(currentPlayer.id)) {
          slot.poisonedBy.push(currentPlayer.id);
        }
        addSupervisorLog(
          `[${slot.id}] 第${currentPlayer.id}組 對 ${target.name} 施加 毒藥法術`
        );
      }

      // 死亡判斷
      if (target.HP <= 0) {
        const gold = eventFlags.doubleGold
          ? target.loot.gold * 2
          : target.loot.gold;
        currentPlayer.loot.gold += gold;
        currentPlayer.loot.manaStone += target.loot.manaStone;
        if (target.loot.spellCards)
          currentPlayer.loot.spellCards[target.loot.spellCards]++;

        const rewards = [];
        if (gold) rewards.push(`${gold} 金幣`);
        if (target.loot.manaStone)
          rewards.push(`${target.loot.manaStone} 魔能石`);
        if (target.loot.spellCards)
          rewards.push(`1 張 ${target.loot.spellCards} 卡`);

        addClientLog(
          `[${slot.id}] 第${currentPlayer.id}組 殺死了 ${target.name}，${
            rewards.length ? `獲得 ${rewards.join("、")}` : "無獲得任何戰利品"
          }`
        );

        updatedSlots[battlefieldIndex] = {
          ...slot,
          monster: updatedQueue.shift() ?? null,
          poisonedBy: null,
          lastIcedBy: null,
        };
      }
    }

    // ✅ 更新 state
    setPlayers(structuredClone(updatedPlayers));
    setBattleFieldSlots(structuredClone(updatedSlots));
    setQueueMonsters(structuredClone(updatedQueue));
    setAttackActions([]);
  };

  const previewBattlefieldAfterActions = (): [
    BattleFieldSlot,
    BattleFieldSlot,
    BattleFieldSlot
  ] => {
    const idToIndex = { A: 0, B: 1, C: 2 };
    let clonedPlayers = structuredClone(players);
    let clonedSlots = structuredClone(battlefieldSlots) as [
      BattleFieldSlot,
      BattleFieldSlot,
      BattleFieldSlot
    ];
    let clonedQueue = structuredClone(queueMonsters);

    const resolvePoisonDamage = () => {
      for (let i = 0; i < clonedSlots.length; i++) {
        const slot = clonedSlots[i];
        const target = slot?.monster;
        if (!target || !slot.poisonedBy || slot.lastIcedBy) continue;

        for (const poisonerId of slot.poisonedBy) {
          const poisoner = clonedPlayers.find((p) => p.id === poisonerId);
          if (!poisoner) continue;

          target.HP -= 1;

          handleSkillTrigger(
            target,
            slot.id,
            "onHit",
            clonedSlots,
            clonedQueue,
            (s) => (clonedSlots = s),
            (q) => (clonedQueue = q)
          );

          if (target.HP <= 0) {
            clonedSlots[i] = {
              id: slot.id,
              monster: clonedQueue.shift() ?? null,
              poisonedBy: null,
              lastIcedBy: null,
            };
            break;
          }

          clonedSlots[i] = { ...slot };
          break; // 與正式邏輯一致：每人一次攻擊前只觸發一次毒藥
        }
      }
    };

    for (const action of attackActions) {
      resolvePoisonDamage();

      const index = idToIndex[action.battlefieldId];
      const slot = clonedSlots[index];
      const player = clonedPlayers.find((p) => p.id === action.player.id);
      if (!slot || !player || !slot.monster) continue;

      const monster = slot.monster;

      // 冰凍判斷
      if (slot.lastIcedBy === player.id) {
        slot.lastIcedBy = null;
      } else if (slot.lastIcedBy && action.cardType !== "炸彈法術") {
        continue;
      }

      if (action.cardType === "魔法棒") {
        const element = action.element!;
        const base = player.attack[element];
        const counter: Record<ElementType, ElementType> = {
          火: "木",
          木: "水",
          水: "火",
          無: "無",
        };
        const weak: Record<ElementType, ElementType> = {
          火: "水",
          水: "木",
          木: "火",
          無: "無",
        };

        let dmg = base;
        if (!eventFlags.allAttackNeutral) {
          if (monster.type === counter[element]) dmg *= 2;
          if (monster.type === weak[element]) dmg = 0;
        }

        monster.HP -= dmg;

        handleSkillTrigger(
          monster,
          slot.id,
          "onHit",
          clonedSlots,
          clonedQueue,
          (s) => (clonedSlots = s),
          (q) => (clonedQueue = q)
        );
      } else if (action.cardType === "冰凍法術") {
        slot.lastIcedBy = player.id;
        monster.HP -= 2;

        handleSkillTrigger(
          monster,
          slot.id,
          "onHit",
          clonedSlots,
          clonedQueue,
          (s) => (clonedSlots = s),
          (q) => (clonedQueue = q)
        );
      } else if (action.cardType === "炸彈法術") {
        for (let i = 0; i < clonedSlots.length; i++) {
          const s = clonedSlots[i];
          if (!s.monster) continue;
          if (s.lastIcedBy) continue;
          s.monster.HP -= 2;

          handleSkillTrigger(
            s.monster,
            s.id,
            "onHit",
            clonedSlots,
            clonedQueue,
            (s2) => (clonedSlots = s2),
            (q2) => (clonedQueue = q2)
          );

          if (s.monster.HP <= 0) {
            clonedSlots[i] = {
              id: s.id,
              monster: clonedQueue.shift() ?? null,
              poisonedBy: null,
              lastIcedBy: null,
            };
          }
        }
      } else if (action.cardType === "毒藥法術") {
        if (!slot.poisonedBy) slot.poisonedBy = [];
        if (!slot.poisonedBy.includes(player.id)) {
          slot.poisonedBy.push(player.id);
        }
      }

      // 死亡判斷（非炸彈後才需要）
      if (monster.HP <= 0) {
        clonedSlots[index] = {
          id: slot.id,
          monster: clonedQueue.shift() ?? null,
          poisonedBy: null,
          lastIcedBy: null,
        };
      }
    }

    return clonedSlots;
  };

  const previewSlots = useMemo(() => {
    return previewBattlefieldAfterActions();
  }, [attackActions, battlefieldSlots, queueMonsters, players]);

  const nextForcedEvent = useRef<{
    eventName?: string;
    effectDescription?: string;
  } | null>(null);

  const setNextEvent = (eventName?: string, effectDescription?: string) => {
    nextForcedEvent.current = { eventName, effectDescription };
    console.log(`設定下一個強制事件: ${eventName}, 效果: ${effectDescription}`);
  };
  //隨機事件
  const triggerEvent = () => {
    let selectedEvent: GameEvent | undefined;
    const forcedEventName = nextForcedEvent.current?.eventName;
    const forcedEffectDescription = nextForcedEvent.current?.effectDescription;
    nextForcedEvent.current = null; // 用過就清空

    // === 1. 挑選事件 ===
    if (turn === 1) {
      selectedEvent = eventTable.find((e) => e.name === "無事件");
      console.log("第一回合，選擇無事件");
    } else if (forcedEventName) {
      selectedEvent = eventTable.find((e) => e.name === forcedEventName);
      console.log(`強制選擇事件: ${forcedEventName}`);
      if (!selectedEvent) {
        console.error(`⚠️ 未找到強制事件: ${forcedEventName}`);
        return;
      }
    } else {
      const totalWeight = eventTable.reduce(
        (sum, e) => sum + (e.weighted ?? 1),
        0
      );
      let roll = Math.random() * totalWeight;
      for (const e of eventTable) {
        roll -= e.weighted ?? 1;
        if (roll <= 0) {
          selectedEvent = e;
          break;
        }
      }
    }

    if (!selectedEvent) return;

    // === 2. 選擇效果 ===
    let appliedEffect: EventEffect | undefined;

    if (Array.isArray(selectedEvent.effects)) {
      const effects = selectedEvent.effects;

      if (forcedEffectDescription) {
        appliedEffect = effects.find(
          (e) => e.description === forcedEffectDescription
        );
      }

      if (!appliedEffect) {
        const totalWeight = effects.reduce(
          (sum, e) => sum + (e.weighted ?? 1),
          0
        );
        let roll = Math.random() * totalWeight;
        for (const e of effects) {
          roll -= e.weighted ?? 1;
          if (roll <= 0) {
            appliedEffect = e;
            break;
          }
        }
      }
    } else {
      appliedEffect = selectedEvent.effects;
    }

    if (!appliedEffect) {
      console.error("⚠️ 未找到符合的事件效果");
      return;
    }

    // === 3. 執行並套用 ===
    appliedEffect.applyEffect?.();
    setEvent({
      ...selectedEvent,
      effects: [appliedEffect], // 單一效果格式化回寫
    });
  };
  useEffect(() => {
    if (phase === "事件") {
      triggerEvent();
    }
  }, [phase]);
  const nextPhase = () => {
    switch (phase) {
      case "準備開始遊戲":
        setPhase("事件");
        break;
      case "事件":
        setPhase("準備");
        break;
      case "準備":
        setPhase("行動");
        break;
      case "行動":
        processAttackActions();
        setEventFlags({
          doubleGold: false,
          allAttackNeutral: false,
          disableElement: null,
        });
        setPhase("結算");
        break;
      case "結算":
        {
          let updatedSlots = structuredClone(battlefieldSlots);
          let updatedQueue = structuredClone(queueMonsters);

          updatedSlots.forEach((slot) => {
            const monster = slot.monster;
            if (!monster || !monster.skill) return;

            const skill = skillTable[monster.skill];
            if (!skill || skill.trigger !== "onTurnEnd") return;

            skill.applyEffect(
              slot.id,
              updatedSlots,
              updatedQueue,
              (newSlots) => {
                updatedSlots = newSlots;
              },
              (newQueue) => {
                updatedQueue = newQueue;
              }
            );

            if (skill.name === "恢復") {
              addClientLog(
                `[${slot.id}] ${monster.name} 的恢復技能觸發，恢復生命`
              );
            }
          });

          setBattleFieldSlots(updatedSlots);
          setQueueMonsters(updatedQueue);
          setTurn((prev) => prev + 1);
          rotatePlayers();
          setPhase("事件");
        }
        break;
    }
  };

  return {
    gameState,

    turn,
    phase,
    nextPhase,

    players,
    setPlayers,
    generatePlayers,

    battlefieldSlots,
    queueMonsters,
    forcedNextMonster,
    setForcedNextMonster,
    addMonster,

    event,
    eventTable,
    nextForcedEvent,
    setNextEvent,
    triggerEvent,
    clientLog,
    supervisorLog,
    attackActions,
    addAttackAction,
    cancelLastAttackAction,
    previewSlots,
  };
}

export type {
  GameState,
  GamePhase,
  Skill,
  Player,
  Monster,
  BattleFieldSlot,
  EventEffect,
  GameEvent,
  AttackAction,
  GameLog,
  ElementType,
  PlayerElementType,
  SpellCardType,
  AttackCardType,
};
