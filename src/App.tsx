import { useState, Fragment } from "react";
import useGameLogic from "./game/useGameLogic";
import type {
  Player,
  PlayerElementType,
  AttackCardType,
  EventEffect,
} from "./game/useGameLogic";
import GameStateSender from "./hook/GameStateSender";
import MonsterCard from "./component/MonsterCard";
import MonsterInputModal from "./component/Monstermodal";
import "./App.css";

function App() {
  const game = useGameLogic();
  const { gameState } = game;

  const [playerCount, setPlayerCount] = useState(6);
  const [editPlayerIds, setEditPlayerIds] = useState<number[]>([]);

  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedDescription, setSelectedDescription] = useState("");

  const [selectedCardType, setSelectedCardType] = useState("魔法棒");
  const [selectedElement, setSelectedElement] = useState("火");
  const [selectedTarget, setSelectedTarget] = useState("A");

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [AttackActionIsFull, setAttackActionIsFull] = useState(false);

  const [isInputModalOpen, setInputModalOpen] = useState(false);

  const updatePlayer = (id: number, updater: (p: Player) => void) => {
    game.setPlayers((prev) => {
      return prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p };
        updater(updated);
        return updated;
      });
    });
  };

  const getAvailableCardTypes = (
    player: Player | undefined
  ): AttackCardType[] => {
    if (!player) return [];
    const cards: AttackCardType[] = [];
    if (player.loot.spellCards["魔法棒"] > 0) cards.push("魔法棒");
    if (player.loot.spellCards["冰凍法術"] > 0) cards.push("冰凍法術");
    if (player.loot.spellCards["炸彈法術"] > 0) cards.push("炸彈法術");
    if (player.loot.spellCards["毒藥法術"] > 0) cards.push("毒藥法術");
    return cards;
  };

  return (
    <div className="main-container ">
      <div className="controls-box">
        <div>
          <div className="connect-status ">
            <GameStateSender gamestate={game.gameState} />
          </div>
        </div>
      </div>
      <div className="controls-box">
        <div className="supervisor-log">
          <h2>遊戲日誌</h2>
          <div>
            <ul>
              {game.supervisorLog.map((log, index) => (
                <li key={index}>
                  <span className="timestamp">{`${log.round} ${log.phase}：`}</span>

                  <span className="message">{log.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="phase-control">
          <h2>
            {game.phase === "準備開始遊戲"
              ? "準備開始遊戲"
              : `第${game.turn}回合 ${game.phase}階段`}
          </h2>
          <button
            onClick={() => {
              game.nextPhase();
              if (game.phase === "行動") {
                setCurrentPlayerIndex(0);
                setAttackActionIsFull(false);
              }
            }}
            disabled={
              (game.phase === "準備開始遊戲" &&
                (game.queueMonsters.length === 0 ||
                  game.players.length <= 1)) ||
              (game.phase === "行動" &&
                game.attackActions.length !== playerCount)
            }
          >
            {(() => {
              if (game.phase === "準備開始遊戲") return "開始遊戲";
              else if (game.phase === "結算") return "下一回合";
              else return "下一階段";
            })()}
          </button>
        </div>
        <div className="event-control">
          <h2>當前事件</h2>
          <p>{game.event.name}</p>
          <p>{game.event.effects[0].description}</p>

          <div>
            <p>
              下回合事件:
              <select
                value={selectedEvent}
                onChange={(e) => {
                  setSelectedEvent(e.target.value);
                  game.setNextEvent(e.target.value);
                }}
              >
                <option value="">隨機</option>
                {game.eventTable.map((event) => (
                  <option key={event.name} value={event.name}>
                    {event.name}
                  </option>
                ))}
              </select>
              {selectedEvent &&
                (() => {
                  const currentEvent = game.eventTable.find(
                    (event) => event.name === selectedEvent
                  );
                  const effects = currentEvent?.effects as EventEffect[];

                  return (
                    <select
                      value={selectedDescription}
                      onChange={(e) => {
                        setSelectedDescription(e.target.value);
                        game.setNextEvent(selectedEvent, e.target.value);
                      }}
                    >
                      {effects.length > 1 ? (
                        <>
                          <option value="">隨機</option>
                          {effects.map((eff, index) => (
                            <option key={index} value={eff.description}>
                              {eff.description}
                            </option>
                          ))}
                        </>
                      ) : effects.length === 1 ? (
                        <option value={effects[0].description}>
                          {effects[0].description}
                        </option>
                      ) : (
                        <option disabled>無描述可選</option>
                      )}
                    </select>
                  );
                })()}{" "}
            </p>
          </div>
        </div>
      </div>

      <div className="controls-box">
        <div className="player-controls">
          <h2>玩家列表</h2>
          {game.phase === "準備開始遊戲" && game.players.length === 0 && (
            <div>
              <input
                type="number"
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
              />
              <button onClick={() => game.generatePlayers(playerCount)}>
                生成玩家
              </button>
            </div>
          )}
          {game.players.map((p) => {
            const toggleEditPlayer = (id: number) => {
              setEditPlayerIds((prev) =>
                prev.includes(id)
                  ? prev.filter((pid) => pid !== id)
                  : [...prev, id]
              );
            };

            const editing = editPlayerIds.includes(p.id);
            const playerData = game.players.find((lp) => lp.id === p.id) || p;

            return (
              <div key={p.id} className="player-slot">
                <div className="player-header">
                  <h3>第{playerData.id}組</h3>
                  <button onClick={() => toggleEditPlayer(p.id)}>
                    {editing ? "完成編輯" : "編輯"}
                  </button>
                  <button
                    onClick={() => {
                      const players = [...game.players]; // 複製一份避免直接 mutate
                      const index = players.findIndex(
                        (pl) => pl.id === playerData.id
                      );
                      if (index > -1) {
                        const [target] = players.splice(index, 1); // 移除該玩家
                        players.unshift(target); // 插入到最前
                        game.setPlayers(players); // 更新狀態
                      }
                    }}
                  >
                    移至最前
                  </button>
                </div>

                <div className="player-attributes">
                  <div>
                    <div className="form-pair">
                      <label>名字</label>
                      <input
                        type="text"
                        value={playerData.name}
                        disabled={!editing}
                        onChange={(e) =>
                          updatePlayer(p.id, (pl) => (pl.name = e.target.value))
                        }
                      />
                    </div>
                    <div className="form-pair">
                      <label className="gold">金幣</label>
                      <input
                        type="number"
                        value={playerData.loot.gold}
                        disabled={!editing}
                        onChange={(e) =>
                          updatePlayer(
                            p.id,
                            (pl) => (pl.loot.gold = Number(e.target.value))
                          )
                        }
                      />
                    </div>
                    <div className="form-pair">
                      <label className="mana">魔能石</label>
                      <input
                        type="number"
                        value={playerData.loot.manaStone}
                        disabled={!editing}
                        onChange={(e) =>
                          updatePlayer(
                            p.id,
                            (pl) => (pl.loot.manaStone = Number(e.target.value))
                          )
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <div className="form-pair">
                      <label className="fire">火</label>
                      <input
                        type="number"
                        value={playerData.attack.火}
                        disabled={!editing}
                        onChange={(e) =>
                          updatePlayer(
                            p.id,
                            (pl) => (pl.attack.火 = Number(e.target.value))
                          )
                        }
                      />
                    </div>
                    <div className="form-pair">
                      <label className="water">水</label>
                      <input
                        type="number"
                        value={playerData.attack.水}
                        disabled={!editing}
                        onChange={(e) =>
                          updatePlayer(
                            p.id,
                            (pl) => (pl.attack.水 = Number(e.target.value))
                          )
                        }
                      />
                    </div>
                    <div className="form-pair">
                      <label className="wood">木</label>
                      <input
                        type="number"
                        value={playerData.attack.木}
                        disabled={!editing}
                        onChange={(e) =>
                          updatePlayer(
                            p.id,
                            (pl) => (pl.attack.木 = Number(e.target.value))
                          )
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <div className="form-pair">
                      <label className="boom">炸彈法術</label>
                      <input
                        type="number"
                        value={playerData.loot.spellCards["炸彈法術"]}
                        disabled={!editing}
                        onChange={(e) =>
                          updatePlayer(
                            p.id,
                            (pl) =>
                              (pl.loot.spellCards["炸彈法術"] = Number(
                                e.target.value
                              ))
                          )
                        }
                      />
                    </div>
                    <div className="form-pair">
                      <label className="ice">冰凍法術</label>
                      <input
                        type="number"
                        value={playerData.loot.spellCards["冰凍法術"]}
                        disabled={!editing}
                        onChange={(e) =>
                          updatePlayer(
                            p.id,
                            (pl) =>
                              (pl.loot.spellCards["冰凍法術"] = Number(
                                e.target.value
                              ))
                          )
                        }
                      />
                    </div>
                    <div className="form-pair">
                      <label className="poison">毒藥法術</label>
                      <input
                        type="number"
                        value={playerData.loot.spellCards["毒藥法術"]}
                        disabled={!editing}
                        onChange={(e) =>
                          updatePlayer(
                            p.id,
                            (pl) =>
                              (pl.loot.spellCards["毒藥法術"] = Number(
                                e.target.value
                              ))
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="monster-controls">
          <h2>怪物列表</h2>
          <button onClick={() => setInputModalOpen(true)}>建立自訂怪物</button>
          <button
            onClick={game.addMonster}
            disabled={game.players.length === 0}
          >
            加入怪物到列隊
          </button>
          {game.players.length === 0 && <p>請先加入玩家</p>}
          <MonsterInputModal
            isOpen={isInputModalOpen}
            onClose={() => setInputModalOpen(false)}
            addMonster={(monster) =>
              game.setForcedNextMonster((prev) => [...prev, monster])
            }
          />
          <div id="mosterqueuemodal"></div>
          <div className="battlefieldslots">
            {game.battlefieldSlots.map((slot) => {
              const id = slot.id;
              const monster = slot.monster;

              return (
                <Fragment key={id}>
                  <MonsterCard monster={monster} title={`戰場${id}`} />
                </Fragment>
              );
            })}
          </div>
          <h3>怪物列隊</h3>
          <div className="queueslots">
            {game.queueMonsters.map((monster, idx) => (
              <Fragment key={idx}>
                <MonsterCard monster={monster} />
              </Fragment>
            ))}
          </div>
          <h3>接著被加入至戰場的怪物</h3>
          <p>當這裡是空的時候按下加入怪物按鈕會隨機加入怪物</p>
          <div className="forcedslots">
            {game.forcedNextMonster.map((monster, idx) => (
              <Fragment key={idx}>
                <button
                  onClick={() =>
                    game.setForcedNextMonster(
                      game.forcedNextMonster.filter((_, i) => i !== idx)
                    )
                  }
                >
                  remove
                </button>
                <MonsterCard monster={monster} />
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {game.phase === "行動" && game.players.length > 0 && (
        <div className="controls-box">
          <div className="attack-control">
            <h2>攻擊設定</h2>
            <div id="addAttack">
              <div>目前玩家：{game.players[currentPlayerIndex]?.name}</div>

              <select
                value={selectedCardType}
                onChange={(e) => setSelectedCardType(e.target.value)}
              >
                {getAvailableCardTypes(game.players[currentPlayerIndex]).map(
                  (card) => (
                    <option key={card} value={card}>
                      {card}
                    </option>
                  )
                )}
              </select>

              {selectedCardType === "魔法棒" && (
                <select
                  value={selectedElement}
                  onChange={(e) => setSelectedElement(e.target.value)}
                >
                  <option value="火" className="fire">
                    火
                  </option>
                  <option value="水" className="water">
                    水
                  </option>
                  <option value="木" className="wood">
                    木
                  </option>
                </select>
              )}

              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>

              <button
                disabled={AttackActionIsFull}
                onClick={() => {
                  const player = game.players[currentPlayerIndex];
                  if (!player) return;

                  game.addAttackAction({
                    player,
                    battlefieldId: selectedTarget as "A" | "B" | "C",
                    cardType: selectedCardType as AttackCardType,
                    element:
                      selectedCardType === "魔法棒"
                        ? (selectedElement as PlayerElementType)
                        : undefined,
                  });

                  setCurrentPlayerIndex((prev) => {
                    const nextIndex = prev + 1;
                    if (nextIndex >= game.players.length) {
                      setAttackActionIsFull(true);
                      return prev;
                    }

                    // ⚠️ 如果不是魔法棒才重設選項
                    if (selectedCardType !== "魔法棒") {
                      const nextPlayer = game.players[nextIndex];
                      const availableCards = getAvailableCardTypes(nextPlayer);
                      const defaultCard = availableCards[0] ?? "魔法棒";
                      setSelectedCardType(defaultCard);
                      if (defaultCard === "魔法棒") {
                        setSelectedElement("火");
                      }
                    }

                    return nextIndex;
                  });
                }}
              >
                提交攻擊行動
              </button>

              {AttackActionIsFull && (
                <div style={{ color: "gray", marginTop: "8px" }}>
                  所有玩家都已提交攻擊行動
                </div>
              )}
            </div>
            <div id="cancelAttack">
              <h3>
                攻擊行動
                <button
                  onClick={() => {
                    game.cancelLastAttackAction();

                    if (AttackActionIsFull) {
                      setAttackActionIsFull(false);
                      const lastIndex = game.players.length - 1;
                      setCurrentPlayerIndex(lastIndex);

                      const player = game.players[lastIndex];
                      const availableCards = getAvailableCardTypes(player);
                      const defaultCard = availableCards[0] ?? "魔法棒";
                      setSelectedCardType(defaultCard);
                      if (defaultCard === "魔法棒") {
                        setSelectedElement("火");
                      }
                    } else {
                      setCurrentPlayerIndex((prev) => {
                        const newIndex = Math.max(prev - 1, 0);
                        const player = game.players[newIndex];

                        const availableCards = getAvailableCardTypes(player);
                        const defaultCard = availableCards[0] ?? "魔法棒";
                        setSelectedCardType(defaultCard);
                        if (defaultCard === "魔法棒") {
                          setSelectedElement("火");
                        }

                        return newIndex;
                      });
                    }
                  }}
                  disabled={currentPlayerIndex === 0 && !AttackActionIsFull}
                >
                  取消上一個攻擊行動
                </button>
              </h3>
              <ul>
                {game.attackActions.map((attackAction, index) => {
                  const { player, cardType, element, battlefieldId } =
                    attackAction;

                  let cardDescription = cardType;
                  if (cardType === "魔法棒" && element) {
                    const power = player.attack[element];
                    cardDescription += ` (${element} ${power})`;
                  }

                  return (
                    <li key={index}>
                      {player.name} 使用{" "}
                      <span
                        className={
                          cardType === "魔法棒"
                            ? element === "火"
                              ? "fire"
                              : element === "水"
                              ? "water"
                              : element === "木"
                              ? "wood"
                              : ""
                            : cardType === "冰凍法術"
                            ? "ice"
                            : cardType === "毒藥法術"
                            ? "poison"
                            : cardType === "炸彈法術"
                            ? "boom"
                            : ""
                        }
                      >
                        {cardType}
                        {cardType === "魔法棒" && element
                          ? ` (${element})`
                          : ""}
                      </span>{" "}
                      {cardType === "魔法棒" && element
                        ? player.attack[element]
                        : ""}{" "}
                      攻擊 {battlefieldId} 戰場
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div className="preview-control">
            <h2>攻擊預覽</h2>
            <div className="battlefieldslots">
              {game.previewSlots.map((slot) => {
                const id = slot.id;
                const monster = slot.monster;

                return (
                  <Fragment key={id}>
                    <MonsterCard monster={monster} title={`戰場${id}`} />
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div>
        <h2>遊戲狀態預覽</h2>
        <pre>{JSON.stringify(gameState, null, 2)}</pre>
      </div>
    </div>
  );
}

export default App;
