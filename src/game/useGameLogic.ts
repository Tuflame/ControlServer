type GamePhase = "準備開始遊戲" | "事件" | "準備" | "行動" | "結算";

type ElementType = "火" | "水" | "木" | "無";
type PlayerElementType = Exclude<ElementType, "無">;
type SpellCardType = "冰凍法術" | "爆裂法術" | "毒藥法術";
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
    monster: Monster,
    updateMonster: (updated: Monster) => void
  ) => void;
};

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
  skill?: Skill[];
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

import { useState, useEffect, useRef } from "react";

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
    },
  ];

  const skillTable: Record<string, Skill> = {
    屬性輪轉: {
      name: "屬性輪轉",
      description: "每受到一次攻擊，按照 火 → 水 → 木 → 火 的順序變換屬性。",
      trigger: "onHit",
      applyEffect: (slotid, monster, updateMonster) => {
        const order: ElementType[] = ["火", "水", "木"];
        const nextIndex = (order.indexOf(monster.type) + 1) % order.length;
        const newType = order[nextIndex];
        updateMonster({ ...monster, type: newType });
        console.log(`屬性輪轉觸發，變為 ${newType}`);
        addSupervisorLog(
          `[戰場${slotid}] ${monster.name} 的屬性轉換，變為 ${newType}`
        );
      },
    },
    恢復: {
      name: "恢復",
      description: "每回合結束時恢復 1 點生命值。",
      trigger: "onTurnEnd",
      applyEffect: (slotid, monster, updateMonster) => {
        const healed = Math.min(monster.HP + 2, monster.maxHP);
        updateMonster({ ...monster, HP: healed });
        console.log(
          `[戰場${slotid}] ${monster.name} 恢復技能觸發，生命恢復至 ${healed}`
        );
      },
    },
  };

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
            addClientLog("[事件]本回合風平浪靜，什麼也沒發生。");
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
            addClientLog("[事件]出現旅行商人，玩家可以花費金幣購買法術卡。");
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
            addClientLog("[事件]精靈降臨，所有玩家獲得 +1 魔能石。");
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
            addClientLog("[事件]元素能量混亂，所有攻擊視為無屬性");
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
            addClientLog("[事件]元素能量混亂，火屬性傷害無效");
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
            addClientLog("[事件]元素能量混亂，水屬性傷害無效");
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
            addClientLog("[事件]元素能量混亂，木屬性傷害無效");
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
            addClientLog("[事件]3隻哥布林衝入列隊，血量5，擊殺可得 2 金幣。");
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
            addClientLog("[事件]本回合擊殺怪物獲得雙倍金幣。");
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
          火: 1,
          水: 1,
          木: 1,
        },
        loot: {
          gold: 0,
          manaStone: 2,
          spellCards: {
            魔法棒: 1,
            冰凍法術: 0,
            爆裂法術: 0,
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
  };

  const addRandomMonstersToQueue = () => {
    const monsterNameTable: Record<ElementType, string[]> = {
      火: ["火史萊姆"],
      水: ["水史萊姆"],
      木: ["草史萊姆"],
      無: ["骷髏", "鬼魂"],
    };
    // 隨機生成數字的輔助函式
    const getRandomInt = (min: number, max: number): number => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
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
    const getRandomMonsterName = (type: ElementType): string => {
      const names = monsterNameTable[type];
      const idx = Math.floor(Math.random() * names.length);
      return names[idx];
    };

    const getRandomSpellCard = (): SpellCardType => {
      const cards: SpellCardType[] = [
        "冰凍法術",
        "爆裂法術",
        "冰凍法術",
        "爆裂法術",
        "毒藥法術",
      ];
      const index = Math.floor(Math.random() * cards.length);
      return cards[index];
    };
    const _maxHP = getRandomInt(5, 10);
    const _type = getRandomElementType();
    const _name = getRandomMonsterName(_type);

    let gold = 0;
    let manaStone = 0;
    let spellCards: SpellCardType | null = null;

    // 第一個戰利品（必定出現）
    if (Math.random() < 0.6) {
      gold += 1;
    } else {
      manaStone += 1;
    }

    // 第二個戰利品（50% 機率出現）
    if (Math.random() < 1) {
      if (Math.random() < 0.1) {
        gold += 1;
      } else {
        spellCards = getRandomSpellCard();
      }
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
    };

    setQueueMonsters((prevQueue) => {
      return [...prevQueue, newMonster];
    });
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

  const processAttackActions = () => {
    let updatedPlayers = structuredClone(players);
    let updatedSlots = structuredClone(battlefieldSlots);
    const idToIndex = { A: 0, B: 1, C: 2 };
    console.log("處理攻擊行動", attackActions);
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
            `[戰場${slot.id}] ${poisoner.name} 的毒藥對 ${target.name} 造成 1 點傷害`
          );

          if (target.skill?.some((sk) => sk.trigger === "onHit")) {
            const skill = target.skill.find((s) => s.trigger === "onHit");
            if (skill) {
              skill.applyEffect(slot.id, target, (updatedMonster) => {
                updatedSlots[i] = {
                  ...slot,
                  monster: updatedMonster,
                };
              });
            }
          }

          if (target.HP > 0) {
            updatedSlots[i] = { ...slot };
            setBattleFieldSlots(structuredClone(updatedSlots));
            break;
          }

          // 獎勵與訊息
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
          const rewardText = rewards.length
            ? `獲得 ${rewards.join("、")}`
            : "無獲得任何戰利品";

          addClientLog(
            `[戰場${slot.id}] ${poisoner.name} 殺死了 ${target.name}，${rewardText}`
          );

          updatedSlots[i] = {
            ...slot,
            monster: null,
            poisonedBy: null,
            lastIcedBy: null,
          };
          setPlayers(structuredClone(updatedPlayers));
          setBattleFieldSlots(structuredClone(updatedSlots));
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

      addSupervisorLog(`處理第 ${turn} 回合 ${currentPlayer.name} 的攻擊`);

      // 冰凍檢查
      if (slot.lastIcedBy === currentPlayer.id) {
        addSupervisorLog(
          `[戰場${slot.id}] 來自 ${currentPlayer.name} 的冰凍已解除`
        );
        slot.lastIcedBy = null;
      } else if (slot.lastIcedBy) {
        const freezer = updatedPlayers.find((p) => p.id === slot.lastIcedBy);
        addSupervisorLog(
          `[戰場${slot.id}] ${target.name} 因 ${freezer?.name} 的冰凍，${currentPlayer.name} 攻擊失效`
        );
        setPlayers(structuredClone(updatedPlayers));
        setBattleFieldSlots(structuredClone(updatedSlots));
        continue;
      }

      // 攻擊處理
      if (action.cardType === "魔法棒") {
        const element = action.element!;
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
        if (element === eventFlags.disableElement) {
          addSupervisorLog(
            `[戰場${slot.id}]${currentPlayer.name} 的 ${element} 屬性因事件效果失效，攻擊無效`
          );
          continue;
        }

        let dmg = currentPlayer.attack[element];
        // 如果事件效果影響攻擊屬性
        if (!eventFlags.allAttackNeutral) {
          if (target.type === counter[element]) dmg *= 2;
          if (target.type === weak[element]) dmg = 0;
        }

        target.HP -= dmg;
        addSupervisorLog(
          `[戰場${slot.id}]${currentPlayer.name} 使用魔法棒(${element}) 對 ${target.name} 造成 ${dmg} 點傷害`
        );
        if (target.skill?.some((sk) => sk.trigger === "onHit")) {
          const skill = target.skill.find((s) => s.trigger === "onHit");
          if (skill) {
            skill.applyEffect(slot.id, target, (updatedMonster) => {
              updatedSlots[battlefieldIndex] = {
                ...slot,
                monster: updatedMonster,
              };
            });
          }
        }
      } else if (action.cardType === "冰凍法術") {
        slot.lastIcedBy = currentPlayer.id;
        target.HP -= 2;
        addSupervisorLog(
          `[戰場${slot.id}] ${currentPlayer.name} 使用 冰凍法術 對 ${target.name} 造成 2 點傷害`
        );
        if (target.skill?.some((sk) => sk.trigger === "onHit")) {
          const skill = target.skill.find((s) => s.trigger === "onHit");
          if (skill) {
            skill.applyEffect(slot.id, target, (updatedMonster) => {
              updatedSlots[battlefieldIndex] = {
                ...slot,
                monster: updatedMonster,
              };
            });
          }
        }
      } else if (action.cardType === "爆裂法術") {
        addSupervisorLog(`[所有戰場] ${currentPlayer.name} 使用 爆裂法術`);
        updatedSlots.forEach((s, idx) => {
          if (!s.monster) return;
          s.monster.HP -= 2;
          addSupervisorLog(
            `[戰場${s.id}] ${currentPlayer.name} 對 ${s.monster.name} 造成 2 點傷害`
          );
          if (s.monster.skill?.some((sk) => sk.trigger === "onHit")) {
            const skill = s.monster.skill.find((sk) => sk.trigger === "onHit");
            if (skill) {
              skill.applyEffect(s.id, s.monster, (updatedMonster) => {
                updatedSlots[idx] = {
                  ...s,
                  monster: updatedMonster,
                };
              });
            }
          }

          if (s.monster.HP <= 0) {
            const m = s.monster;
            const gold = eventFlags.doubleGold ? m.loot.gold * 2 : m.loot.gold;
            currentPlayer.loot.gold += gold;
            currentPlayer.loot.manaStone += m.loot.manaStone;
            if (m.loot.spellCards)
              currentPlayer.loot.spellCards[m.loot.spellCards]++;

            const rewards = [];
            if (gold) rewards.push(`${gold} 金幣`);
            if (m.loot.manaStone) rewards.push(`${m.loot.manaStone} 魔能石`);
            if (m.loot.spellCards) rewards.push(`1 張 ${m.loot.spellCards} 卡`);
            const rewardText = rewards.length
              ? `獲得 ${rewards.join("、")}`
              : "無獲得任何戰利品";

            addClientLog(
              `[戰場${s.id}] ${currentPlayer.name} 殺死了 ${m.name}，${rewardText}`
            );
            updatedSlots[idx] = {
              ...s,
              monster: null,
              poisonedBy: null,
              lastIcedBy: null,
            };
            setPlayers(structuredClone(updatedPlayers));
            setBattleFieldSlots(structuredClone(updatedSlots));
          }
        });
      } else if (action.cardType === "毒藥法術") {
        if (!slot.poisonedBy) slot.poisonedBy = [];
        slot.poisonedBy.push(currentPlayer.id);
        addSupervisorLog(
          `[戰場${slot.id}] ${currentPlayer.name} 對 ${target.name} 施加 毒藥法術`
        );
      }

      // 單體死亡結算
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
        const rewardText = rewards.length
          ? `獲得 ${rewards.join("、")}`
          : "無獲得任何戰利品";

        addClientLog(
          `[戰場${slot.id}] ${currentPlayer.name} 殺死了 ${target.name}，${rewardText}`
        );
        updatedSlots[battlefieldIndex] = {
          ...slot,
          monster: null,
          poisonedBy: null,
          lastIcedBy: null,
        };
      }

      setPlayers(structuredClone(updatedPlayers));
      setBattleFieldSlots(structuredClone(updatedSlots));
    }

    setAttackActions([]);
  };

  //FIXME:邏輯上目前與攻擊不一致
  const previewBattlefieldAfterActions = (): [
    BattleFieldSlot,
    BattleFieldSlot,
    BattleFieldSlot
  ] => {
    const clonedPlayers = structuredClone(players);
    const clonedSlots: [BattleFieldSlot, BattleFieldSlot, BattleFieldSlot] =
      structuredClone(battlefieldSlots);
    const clonedQueue = structuredClone(queueMonsters);
    const idToIndex = { A: 0, B: 1, C: 2 };

    // ===== 毒藥結算邏輯 =====
    for (let i = 0; i < clonedSlots.length; i++) {
      const slot = clonedSlots[i];
      const target = slot.monster;
      if (!target || !slot.poisonedBy || slot.lastIcedBy) continue;

      for (const poisonerId of slot.poisonedBy) {
        if (target.HP > 0) target.HP -= 1;

        // 模擬技能觸發
        if (target.skill?.some((sk) => sk.trigger === "onHit")) {
          const skill = target.skill.find((s) => s.trigger === "onHit");
          if (skill) {
            skill.applyEffect(slot.id, target, (updated) => {
              clonedSlots[i] = { ...slot, monster: updated };
            });
          }
        }

        if (target.HP <= 0) {
          clonedSlots[i] = {
            id: slot.id,
            monster: clonedQueue.shift() ?? null,
            poisonedBy: null,
            lastIcedBy: null,
          };
          break;
        }
      }
    }

    // ===== 攻擊階段邏輯 =====
    for (const action of attackActions) {
      const index = idToIndex[action.battlefieldId];
      const slot = clonedSlots[index];
      const player = clonedPlayers.find((p) => p.id === action.player.id);
      if (!slot || !player || !slot.monster) continue;

      const monster = slot.monster;

      // 冰凍邏輯
      if (slot.lastIcedBy && slot.lastIcedBy !== player.id) continue;
      if (slot.lastIcedBy === player.id) slot.lastIcedBy = null;

      // 攻擊處理
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

        if (monster.skill?.some((sk) => sk.trigger === "onHit")) {
          const skill = monster.skill.find((s) => s.trigger === "onHit");
          if (skill) {
            skill.applyEffect(slot.id, monster, (updated) => {
              clonedSlots[index] = { ...slot, monster: updated };
            });
          }
        }
      } else if (action.cardType === "冰凍法術") {
        slot.lastIcedBy = player.id;
        monster.HP -= 2;

        if (monster.skill?.some((sk) => sk.trigger === "onHit")) {
          const skill = monster.skill.find((s) => s.trigger === "onHit");
          if (skill) {
            skill.applyEffect(slot.id, monster, (updated) => {
              clonedSlots[index] = { ...slot, monster: updated };
            });
          }
        }
      } else if (action.cardType === "爆裂法術") {
        for (let i = 0; i < clonedSlots.length; i++) {
          const s = clonedSlots[i];
          if (!s.monster) continue;

          s.monster.HP -= 2;

          if (s.monster.skill?.some((sk) => sk.trigger === "onHit")) {
            const skill = s.monster.skill.find((s) => s.trigger === "onHit");
            if (skill) {
              skill.applyEffect(s.id, s.monster, (updated) => {
                clonedSlots[i] = { ...s, monster: updated };
              });
            }
          }

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
        slot.poisonedBy.push(player.id);
      }

      // 死亡處理 + 替補
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
        const updatedSlots = structuredClone(battlefieldSlots);
        updatedSlots.forEach((slot) => {
          const monster = slot.monster;
          if (!monster) return;
          const skill = monster.skill?.find((s) => s.trigger === "onTurnEnd");
          if (skill) {
            skill.applyEffect(slot.id, monster, (updatedMonster) => {
              slot.monster = updatedMonster;
            });
          }
        });
        setBattleFieldSlots(updatedSlots);
        setTurn((prev) => prev + 1);
        rotatePlayers();
        setPhase("事件");
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
    addMonsterToQueue,
    addRandomMonstersToQueue,
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
    previewBattlefieldAfterActions,
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
