// MonsterCard.tsx
import type { Monster } from "../game/useGameLogic";
import { skillTable } from "../game/useGameLogic";
import "./MonsterCard.css";

const getTypeClass = (type: string) => {
  switch (type) {
    case "火":
      return "fire";
    case "水":
      return "water";
    case "木":
      return "wood";
    default:
      return "none";
  }
};

type Props = {
  monster: Monster | null;
  title?: string;
};

export default function MonsterCard({ monster, title }: Props) {
  const isLarge = !!title;

  if (!monster) {
    return (
      <div className={`slot ${isLarge ? "large" : "small"}`}>
        {title && <h3>{title}</h3>}
        <div>空</div>
      </div>
    );
  }

  const drops = [
    monster.loot.gold > 0 && `🪙x${monster.loot.gold}`,
    monster.loot.manaStone > 0 && `🪨x${monster.loot.manaStone}`,
    monster.loot.spellCards && monster.loot.spellCards,
  ]
    .filter(Boolean)
    .join("、");

  const skillName = monster.skill;
  const skill = skillName ? skillTable[skillName]?.name : null;
  const trigger = skillName ? skillTable[skillName]?.trigger : null;

  return (
    <div className={`slot ${isLarge ? "large" : "small"}`}>
      {title && <h3>{title}</h3>}
      <div className="monster-info-top">
        <span id="monster-type" className={getTypeClass(monster.type)}>
          {monster.type}
        </span>
        <span>
          {monster.HP}/{monster.maxHP}❤️
        </span>
      </div>
      <div>
        <span id="monster-name" className={getTypeClass(monster.type)}>
          {monster.name}
        </span>
      </div>
      <div>
        <span>{drops}</span>
      </div>
      <div>
        <span>{skill ? `${skill}(${trigger})` : "無技能"}</span>
      </div>
    </div>
  );
}
