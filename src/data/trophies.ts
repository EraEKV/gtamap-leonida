// GTA VI trophy list (55). Names / short unlock descriptions are the official in-game texts as listed by
// trophy sites (gamerfuzion.com, gtaside.com, cultr.com, leonipedia.com — Nov 2026). Russian text is our own.
//
// spoiler:  null  -> shown openly (incl. PSN-hidden trophies that are NOT story related)
//           {...} -> story / questline trophy: only `label` is shown until the user confirms
// map:      optional link to map categories so progress is computed from map check-marks
//   mode "count"   -> number of done markers in cats, towards `target`
//   mode "eachCat" -> number of cats with at least one done marker, towards cats.length
//   mode "all"     -> all markers in cats done
//   mode "where"   -> no auto progress, just "show on map"

export type Tier = "platinum" | "gold" | "silver" | "bronze";
export type TrophyMap = { cats: string[]; mode: "count" | "eachCat" | "all" | "where"; target?: number };
export type Trophy = {
  id: string;
  name: string;
  tier: Tier;
  hidden: boolean; // hidden on PSN
  desc: string; // official description (EN)
  ru: string; // our Russian explanation
  spoiler: { kind: "story" | "side"; label: string } | null;
  map?: TrophyMap;
};

const RACING = ["29084", "29085", "29086", "29087", "29088", "29089", "29090", "29091", "29142"];
const STUNTS = ["29019", "29057", "29059", "29060"];
const ILLEGAL = ["29133", "29134", "29135", "29136", "29137", "29138", "29139", "29140", "29141"];

export const TROPHIES: Trophy[] = [
  // ---- platinum / gold -----------------------------------------------------
  { id: "vice-got-a-price", name: "Vice Got a Price!", tier: "platinum", hidden: false, desc: "Congratulations! You're a Leonida Legend.", ru: "Платина — получить все остальные трофеи.", spoiler: null },
  { id: "a-long-road", name: "A Long Road", tier: "gold", hidden: false, desc: "Attain 100% Completion.", ru: "Пройти игру на 100%.", spoiler: null },

  // ---- open-world (visible) ------------------------------------------------
  { id: "cunning-stunts", name: "Cunning Stunts", tier: "silver", hidden: false, desc: "Complete 250 Stunts.", ru: "Выполнить 250 трюков (прыжки, бейсджампы, пролёты).", spoiler: null, map: { cats: STUNTS, mode: "count", target: 250 } },
  { id: "the-shootist", name: "The Shootist", tier: "silver", hidden: false, desc: "Earn a gold medal in all Shooting Range challenges.", ru: "Золото во всех испытаниях тира.", spoiler: null, map: { cats: ["29017"], mode: "all" } },
  { id: "strangers-freaks", name: "Strangers & Freaks", tier: "silver", hidden: false, desc: "Complete 8 mission strands for strangers across the state of Leonida.", ru: "Пройти 8 цепочек заданий «Незнакомцы и чудаки».", spoiler: null },
  { id: "dont-touch-my-deck", name: "Don't Touch My Deck", tier: "silver", hidden: false, desc: "Complete 3 Collectible Card sets.", ru: "Собрать 3 полных набора коллекционных карточек.", spoiler: null, map: { cats: ["29112", "29113", "29114"], mode: "all" } },
  { id: "you-wainker", name: "You WAiNKer!", tier: "silver", hidden: false, desc: "WAiNK It at 100 locations.", ru: "Сделать WAiNK в 100 местах (на карте отмечены известные WAiNK-локации).", spoiler: null, map: { cats: ["29065", "29066", "29067"], mode: "count", target: 100 } },
  { id: "maximum-withdrawal", name: "Maximum Withdrawal", tier: "silver", hidden: false, desc: "Rob 5 Bank Vaults and escape.", ru: "Ограбить 5 банковских хранилищ и уйти.", spoiler: null, map: { cats: ["29022", "29023"], mode: "count", target: 5 } },
  { id: "master-of-none", name: "Master of None", tier: "bronze", hidden: false, desc: "Try each type of activity once.", ru: "Попробовать каждый тип активности хотя бы раз.", spoiler: null },
  { id: "top-fun", name: "Top Fun", tier: "bronze", hidden: false, desc: "Win a Top Fun Drone Race at every location.", ru: "Выиграть гонку дронов Top Fun на каждой локации.", spoiler: null, map: { cats: ["29142"], mode: "all" } },
  { id: "earn-cash-not-kudos", name: "Earn Cash, Not Kudos", tier: "bronze", hidden: false, desc: "Win 20 different races.", ru: "Выиграть 20 разных гонок.", spoiler: null, map: { cats: RACING, mode: "count", target: 20 } },
  { id: "baited-my-tackle", name: "Baited My Tackle", tier: "bronze", hidden: false, desc: "Beat Cal in a fishing challenge.", ru: "Обыграть Кэла в рыболовном состязании.", spoiler: null, map: { cats: ["29099"], mode: "where" } },
  { id: "stick-fiddler", name: "Stick Fiddler", tier: "bronze", hidden: false, desc: "Complete an arcade game.", ru: "Пройти аркадную игру.", spoiler: null, map: { cats: ["29028"], mode: "count", target: 1 } },
  { id: "positive-mental-attitude", name: "Positive Mental Attitude", tier: "bronze", hidden: false, desc: "Meditate at every spot across Leonida.", ru: "Помедитировать во всех точках медитации.", spoiler: null },
  { id: "one-last-thing", name: "One Last Thing", tier: "bronze", hidden: false, desc: "Complete 50 Challenges.", ru: "Выполнить 50 испытаний.", spoiler: null },
  { id: "hot-together", name: "Hot Together", tier: "bronze", hidden: false, desc: "Lose a 4 star Wanted Level with your partner and escape the heat.", ru: "Сбросить 4 звезды розыска вместе с напарником.", spoiler: null },
  { id: "retail-therapy", name: "Retail Therapy", tier: "bronze", hidden: false, desc: "Rob 3 shops back-to-back with your partner without losing your Wanted Level.", ru: "Ограбить 3 магазина подряд с напарником, не сбросив розыск.", spoiler: null, map: { cats: ["29051", "29052", "29054"], mode: "where" } },
  { id: "whip-it-good", name: "Whip It Good", tier: "bronze", hidden: false, desc: "Discover 100 vehicles.", ru: "Открыть 100 моделей транспорта.", spoiler: null },
  { id: "gunslinger", name: "Gunslinger", tier: "bronze", hidden: false, desc: "Take down 5 enemies in a single use of Combat Focus.", ru: "Убрать 5 врагов за одно использование Combat Focus.", spoiler: null },
  { id: "sneakthief", name: "Sneakthief", tier: "bronze", hidden: false, desc: "Rob a jewelry store without being detected.", ru: "Ограбить ювелирку незаметно.", spoiler: null, map: { cats: ["29025", "29026"], mode: "where" } },
  { id: "a-classic-blitz-play", name: "A Classic Blitz Play", tier: "bronze", hidden: false, desc: "Rob an Armored Truck and escape.", ru: "Ограбить инкассаторскую машину и уйти.", spoiler: null },
  { id: "the-goodtime-state", name: "The Goodtime State", tier: "bronze", hidden: false, desc: "Explore all of Leonida.", ru: "Исследовать всю Леониду.", spoiler: null },
  { id: "pest-control", name: "Pest Control", tier: "bronze", hidden: false, desc: "Rob an Illegal Operation belonging to each gang.", ru: "Ограбить нелегальную точку каждой банды.", spoiler: null, map: { cats: ILLEGAL, mode: "eachCat" } },
  { id: "dime-on-the-dollar", name: "Dime on the Dollar", tier: "bronze", hidden: false, desc: "Earn $250,000 laundering Marked Bills through your contacts.", ru: "Отмыть $250 000 мечеными купюрами через контакты.", spoiler: null, map: { cats: ["29082"], mode: "where" } },
  { id: "treat-yo-self", name: "Treat Yo Self", tier: "bronze", hidden: false, desc: "Spend $100,000 across all shops.", ru: "Потратить $100 000 в магазинах.", spoiler: null },
  { id: "little-boxes", name: "Little Boxes", tier: "bronze", hidden: false, desc: "Purchase all garage properties.", ru: "Купить все гаражи.", spoiler: null, map: { cats: ["29062"], mode: "all" } },
  { id: "on-the-spot", name: "On the Spot", tier: "bronze", hidden: false, desc: "Register 10 vehicles to the Scooter Bros app.", ru: "Зарегистрировать 10 машин в приложении Scooter Bros.", spoiler: null },

  // ---- hidden on PSN, but not story: shown openly ---------------------------
  { id: "catch-me-if-you-can", name: "Catch Me If You Can", tier: "bronze", hidden: true, desc: "Make an unscheduled departure at VCIA.", ru: "«Внеплановый вылет» из аэропорта VCIA.", spoiler: null },
  { id: "challenging-tank", name: "Challenging Tank", tier: "bronze", hidden: true, desc: "Kinda hot in these Rhinos.", ru: "Что-то жарко в этих «Носорогах» (танк Rhino).", spoiler: null },
  { id: "in-the-beginning", name: "In The Beginning…", tier: "bronze", hidden: true, desc: "Enjoy a cocktail with a view on Ocean Beach.", ru: "Выпить коктейль с видом на Ocean Beach.", spoiler: null },
  { id: "capital-offense", name: "Capital Offense", tier: "bronze", hidden: true, desc: "Smash your way out of a vehicle showroom in classic style.", ru: "Вылететь на машине из автосалона через витрину, по классике.", spoiler: null },
  { id: "lets-go-bowling", name: "Let's Go Bowling", tier: "bronze", hidden: true, desc: "Follow-through at the Kolt & Associates' bowling alley.", ru: "«Доиграть бросок» в боулинге Kolt & Associates.", spoiler: null, map: { cats: ["29134"], mode: "where" } },
  { id: "personal-best", name: "Personal Best", tier: "bronze", hidden: true, desc: "A partnership with mass appeal.", ru: "«Партнёрство с массовой аудиторией» — способ получения пока не ясен.", spoiler: null },
  { id: "bad-luck-i-guess", name: "Bad Luck, I Guess", tier: "bronze", hidden: true, desc: "Second time's the charm.", ru: "«Со второго раза повезёт» — надёжного способа получения пока нет.", spoiler: null },
  { id: "the-truth-is-out-there", name: "The Truth Is Out There", tier: "bronze", hidden: true, desc: "What the hell just happened?", ru: "«Что это вообще было?» — секретное событие.", spoiler: null },
  { id: "ten-pin", name: "Ten Pin", tier: "bronze", hidden: true, desc: "Bowl 'em over with a melee drive-by.", ru: "Сбить всех, как кегли, ударом из машины на ходу.", spoiler: null },

  // ---- main story (spoilers) -----------------------------------------------
  { id: "just-like-paradise", name: "Just Like Paradise", tier: "bronze", hidden: true, desc: "Complete Gone Fishing.", ru: "Пройти миссию Gone Fishing.", spoiler: { kind: "story", label: "Сюжетная миссия" } },
  { id: "paradise-lost", name: "Paradise Lost", tier: "bronze", hidden: true, desc: "Complete Chapter 1.", ru: "Завершить главу 1.", spoiler: { kind: "story", label: "Завершение главы 1" } },
  { id: "trust", name: "Trust", tier: "bronze", hidden: true, desc: "Complete Breakfast Run.", ru: "Пройти миссию Breakfast Run.", spoiler: { kind: "story", label: "Сюжетная миссия" } },
  { id: "ts-ass-drug-money", name: "T**s Ass Drug Money", tier: "bronze", hidden: true, desc: "Complete Chapter 2.", ru: "Завершить главу 2.", spoiler: { kind: "story", label: "Завершение главы 2" } },
  { id: "break-the-bank", name: "Break the Bank", tier: "bronze", hidden: true, desc: "Complete The Cartel Heist.", ru: "Пройти миссию The Cartel Heist.", spoiler: { kind: "story", label: "Сюжетная миссия" } },
  { id: "vice-city-baby", name: "Vice City, Baby!", tier: "bronze", hidden: true, desc: "Complete Chapter 3.", ru: "Завершить главу 3.", spoiler: { kind: "story", label: "Завершение главы 3" } },
  { id: "family-matters", name: "Family Matters", tier: "bronze", hidden: true, desc: "Complete Child's Play.", ru: "Пройти миссию Child's Play.", spoiler: { kind: "story", label: "Сюжетная миссия" } },
  { id: "dwnfall", name: "DWNFALL", tier: "bronze", hidden: true, desc: "Complete Headliners.", ru: "Пройти миссию Headliners.", spoiler: { kind: "story", label: "Сюжетная миссия" } },
  { id: "top-of-the-world-ma", name: "Top Of The World, Ma", tier: "bronze", hidden: true, desc: "Complete Chapter 4.", ru: "Завершить главу 4.", spoiler: { kind: "story", label: "Завершение главы 4" } },
  { id: "hi-jacked", name: "Hi-Jacked", tier: "bronze", hidden: true, desc: "Complete VCIA Takedown.", ru: "Пройти миссию VCIA Takedown.", spoiler: { kind: "story", label: "Сюжетная миссия" } },
  { id: "snow-storm", name: "Snow Storm", tier: "bronze", hidden: true, desc: "Complete Operation Savage Glory.", ru: "Пройти миссию Operation Savage Glory.", spoiler: { kind: "story", label: "Сюжетная миссия" } },
  { id: "you-gotta-know-when-to-get-off", name: "You Gotta Know When to Get Off", tier: "gold", hidden: true, desc: "Complete the final mission.", ru: "Пройти финальную миссию.", spoiler: { kind: "story", label: "Финал сюжета" } },
  { id: "actions-speak-louder", name: "Actions Speak Louder", tier: "bronze", hidden: true, desc: "Choices made (for better or worse).", ru: "«Выбор сделан (к лучшему или к худшему)».", spoiler: { kind: "story", label: "Возможно, сюжетный выбор" } },

  // ---- side questlines (spoilers) -------------------------------------------
  { id: "road-to-rehabilitation", name: "Road to Rehabilitation", tier: "bronze", hidden: true, desc: "Complete the final mission for Andy.", ru: "Финальная миссия линейки Энди.", spoiler: { kind: "side", label: "Линейка квестов: Andy" } },
  { id: "this-was-no-boat-accident", name: "This Was No Boat Accident", tier: "bronze", hidden: true, desc: "Complete the final mission for Kenton.", ru: "Финальная миссия линейки Кентона.", spoiler: { kind: "side", label: "Линейка квестов: Kenton" } },
  { id: "the-lone-rider", name: "The Lone Rider", tier: "bronze", hidden: true, desc: "Complete the final mission for Billy.", ru: "Финальная миссия линейки Билли.", spoiler: { kind: "side", label: "Линейка квестов: Billy" } },
  { id: "supply-demand", name: "Supply & Demand", tier: "bronze", hidden: true, desc: "Complete the final mission for Randy.", ru: "Финальная миссия линейки Рэнди.", spoiler: { kind: "side", label: "Линейка квестов: Randy" } },
  { id: "spin-on-this", name: "Spin On This!", tier: "bronze", hidden: true, desc: "Complete the final mission for Tyrone.", ru: "Финальная миссия линейки Тайрона.", spoiler: { kind: "side", label: "Линейка квестов: Tyrone" } },
  { id: "fair-game", name: "Fair Game", tier: "bronze", hidden: true, desc: "Hunt a unique animal for Bret.", ru: "Добыть уникальное животное для Брета.", spoiler: { kind: "side", label: "Задания Bret" } },
];

export const TIER_META: Record<Tier, { label: string; color: string; order: number }> = {
  platinum: { label: "Платина", color: "#a5b4fc", order: 0 },
  gold: { label: "Золото", color: "#fbbf24", order: 1 },
  silver: { label: "Серебро", color: "#cbd5e1", order: 2 },
  bronze: { label: "Бронза", color: "#d97706", order: 3 },
};
