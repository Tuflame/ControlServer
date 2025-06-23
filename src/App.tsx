import { useRef, useState, Fragment } from "react";
import useGameLogic from "./game/useGameLogic";
import type {
  Player,
  PlayerElementType,
  AttackCardType,
} from "./game/useGameLogic";
import GameStateSender from "./hook/GameStateSender";
import "./App.css";

function App() {
  const game = useGameLogic();
  const {
    gameState,
    nextPhase,
    generatePlayers,
    addRandomMonstersToQueue,
    addAttackAction,
    triggerEvent,
    setNextEvent,
    previewBattlefieldAfterActions,
  } = game;
  const [playerCount, setPlayerCount] = useState(6);
  const [editPlayerIds, setEditPlayerIds] = useState<number[]>([]);

  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectEventDescription, setSelectEventDescription] = useState("");

  const [selectedCardType, setSelectedCardType] = useState("魔法棒");
  const [selectedElement, setSelectedElement] = useState("火");
  const [selectedTarget, setSelectedTarget] = useState("A");

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [AttackActionIsFull, setAttackActionIsFull] = useState(false);

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
    if (player.loot.spellCards["爆裂法術"] > 0) cards.push("爆裂法術");
    if (player.loot.spellCards["毒藥法術"] > 0) cards.push("毒藥法術");
    return cards;
  };

  return (
    <div className="main-container">
      <h1>控制面板</h1>
      <div className="connect-status">
        <GameStateSender gamestate={game.gameState} />
      </div>
      <div className="controls-box">
        <div className="phase-control">
          <h2>
            {game.phase === "準備開始遊戲"
              ? "準備開始遊戲"
              : `第${game.turn}回合 ${game.phase}階段`}
          </h2>
          <button
            onClick={() => {
              nextPhase();
              if (game.phase === "行動") {
                setCurrentPlayerIndex(0);
                setAttackActionIsFull(false);
              }
            }}
            disabled={
              game.players.length === 0 ||
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
          <h3>{game.event.name}</h3>
          <p>{game.event.effects[0].description}</p>

          <p>控制下回合事件:</p>
          <select
            value={selectedEvent}
            onChange={(e) => {
              setSelectedEvent(e.target.value);
              game.setNextEvent(e.target.value); // 設定下一個事件（名稱）
            }}
          >
            <option value="">不指定事件</option>
            {game.eventTable.map((event) => (
              <option key={event.name} value={event.name}>
                {event.name}
              </option>
            ))}
          </select>
          {(() => {
            return <div></div>;
          })()}
          <select
            value={selectEventDescription}
            onChange={(e) => {
              setSelectEventDescription(e.target.value);
              game.setNextEvent(selectedEvent, e.target.value);
            }}
          >
            <option value="">不指定描述</option>
            {game.eventTable
              .filter((event) => event.name === selectedEvent)
              .map((event) =>
                event.effects.map((effect) => (
                  <option key={effect.description} value={effect.description}>
                    {effect.description}
                  </option>
                ))
              )}
          </select>
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
              <button onClick={() => generatePlayers(playerCount)}>
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
                      <label className="boom">爆裂法術</label>
                      <input
                        type="number"
                        value={playerData.loot.spellCards["爆裂法術"]}
                        disabled={!editing}
                        onChange={(e) =>
                          updatePlayer(
                            p.id,
                            (pl) =>
                              (pl.loot.spellCards["爆裂法術"] = Number(
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
          {game.battlefieldSlots.map((slot) => {
            const id = slot.id;
            const monster = slot.monster;

            return (
              <div className="battlefieldslot" key={id}>
                <h3>戰場{id}</h3>
                {monster ? (
                  <>
                    <span>name：{monster.name}</span>
                    <span>
                      HP：{monster.HP}/{monster.maxHP}
                    </span>
                    <span>
                      loot:gold-{monster.loot.gold}、mana-
                      {monster.loot.manaStone}
                      、card-{monster.loot.spellCards}
                    </span>
                  </>
                ) : (
                  <>空</>
                )}
              </div>
            );
          })}
          <button onClick={addRandomMonstersToQueue}>加入隨機怪物到列隊</button>
        </div>
      </div>

      {game.phase === "行動" && game.players.length > 0 && (
        <div>
          <h2>攻擊設定</h2>

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
              <option value="水">水</option>
              <option value="木">木</option>
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

              addAttackAction({
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

          <div>
            <div>
              <h3>攻擊行動</h3>
              <ul>
                {game.attackActions.map((attackAction, index) => (
                  <li key={index}>
                    {attackAction.player.name} 使用 {attackAction.cardType} 攻擊{" "}
                    {attackAction.battlefieldId} 戰場
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (AttackActionIsFull) {
                    setAttackActionIsFull(false);
                    console.log();
                  } else {
                    setCurrentPlayerIndex((prev) => prev - 1);
                  }
                  game.cancelLastAttackAction();
                }}
                disabled={currentPlayerIndex === 0}
              >
                取消上一個攻擊行動
              </button>
            </div>
            <div>
              <h2>攻擊預覽</h2>
              {game.previewBattlefieldAfterActions().map((slot, index) => (
                <Fragment key={index}>
                  <h3>戰場 {slot.id}</h3>
                  {slot.monster ? (
                    <>
                      <div>名稱：{slot.monster.name}</div>
                      <div>
                        HP：{slot.monster.HP}/{slot.monster.maxHP}
                      </div>
                      <div>
                        戰利品：金幣-{slot.monster.loot.gold}、魔能石-
                        {slot.monster.loot.manaStone}、卡牌-
                        {slot.monster.loot.spellCards ?? "無"}
                      </div>
                    </>
                  ) : (
                    <div>空</div>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      <div>
        <h2>遊戲日誌</h2>
        <ul>
          {game.supervisorLog.map((log, index) => (
            <li key={index}>
              <span className="timestamp">{log.round}</span>
              <span className="message">{log.message}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2>遊戲狀態預覽</h2>
        <pre>{JSON.stringify(gameState, null, 2)}</pre>
      </div>
    </div>
  );
}

export default App;
