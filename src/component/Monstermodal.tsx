import { useMemo, useState, useEffect } from "react";
import type { Monster, ElementType, SpellCardType } from "../game/useGameLogic"; // 根據你的實際路徑調整
import { monsterNameTable } from "../game/useGameLogic"; // 根據你的實際路徑調整

import "./MonsterInputModal.css"; // 根據你的實際路徑調整

type Props = {
  isOpen: boolean;
  onClose: () => void;
  addMonster: (monster: Monster) => void;
};

export default function MonsterInputModal({
  isOpen,
  onClose,
  addMonster,
}: Props) {
  const [type, setType] = useState<ElementType>("火");
  const [name, setName] = useState<string>("");
  const [maxHP, setMaxHP] = useState<number>(10);
  const [gold, setGold] = useState<number>(0);
  const [manaStone, setManaStone] = useState<number>(0);
  const [spellCard, setSpellCard] = useState<SpellCardType | "">("");
  const [skill, setSkill] = useState<string | null>(null);
  // 整合所有該屬性名稱
  const nameOptions = useMemo(() => {
    const allNames: string[] = [];
    for (const level of Object.values(monsterNameTable)) {
      if (level[type]) allNames.push(...level[type]);
    }
    return allNames;
  }, [type]);

  // 預設選第一個名稱
  useEffect(() => {
    if (nameOptions.length > 0 && !nameOptions.includes(name)) {
      setName(nameOptions[0]);
    }
  }, [nameOptions]);

  const handleSubmit = () => {
    const monster: Monster = {
      name,
      type,
      maxHP,
      HP: maxHP,
      loot: {
        gold,
        manaStone,
        spellCards: spellCard === "" ? null : spellCard,
      },
      skill: skill,
      imageUrl: null,
    };

    addMonster(monster);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>自訂怪物建立</h2>

        <label>屬性：</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ElementType)}
        >
          <option value="火">火</option>
          <option value="水">水</option>
          <option value="木">木</option>
          <option value="無">無</option>
        </select>

        <label>名稱：</label>
        <select value={name} onChange={(e) => setName(e.target.value)}>
          {nameOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        <label>最大 HP：</label>
        <input
          type="number"
          value={maxHP}
          onChange={(e) => setMaxHP(Number(e.target.value))}
        />

        <label>金幣：</label>
        <input
          type="number"
          value={gold}
          onChange={(e) => setGold(Number(e.target.value))}
        />

        <label>魔能石：</label>
        <input
          type="number"
          value={manaStone}
          onChange={(e) => setManaStone(Number(e.target.value))}
        />

        <label>法術卡：</label>
        <select
          value={spellCard}
          onChange={(e) => setSpellCard(e.target.value as SpellCardType | "")}
        >
          <option value="">無</option>
          <option value="冰凍法術">冰凍法術</option>
          <option value="炸彈法術">炸彈法術</option>
          <option value="毒藥法術">毒藥法術</option>
        </select>

        <label>技能：</label>
        <select
          value={skill ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            setSkill(val === "" ? null : val);
          }}
        >
          <option value="">無</option>
          <option value="屬性輪轉">屬性輪轉</option>
          <option value="恢復">恢復</option>
        </select>

        <div className="button-row">
          <button onClick={handleSubmit}>加入怪物</button>
          <button onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
