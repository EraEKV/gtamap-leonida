// Short explanations of categories, written for this project (not copied from IGN).
// Keyed by category name to stay readable; looked up via category id in categoryHint().
import { categoryById } from "./mapData";

const BY_NAME: Record<string, string> = {
  // Points of interest
  ATM: "Банкомат — снять наличку.",
  Gym: "Спортзал — прокачка выносливости и силы.",
  Club: "Ночной клуб.",
  "Ammu-Nation": "Оружейный магазин: оружие, патроны, обвесы.",
  // Robberies
  Bank: "Банк — цель для ограбления.",
  "Big Bank": "Крупный банк — более сложное и прибыльное ограбление.",
  "Payday Loans": "Микрозаймы — точка для ограбления.",
  "Low-End Jewelry Store": "Дешёвая ювелирка — быстрое ограбление.",
  "High-End Jewelry Store": "Дорогая ювелирка — ограбление с хорошей добычей.",
  "Pawn Shop": "Ломбард — можно ограбить, а также сбыть награбленное.",
  "ATM (Towable)": "Банкомат, который можно вырвать и утащить на машине.",
  "Convenience Store": "Круглосуточный магазин — мелкое ограбление.",
  "Fast Food": "Фастфуд — мелкое ограбление.",
  "Liquor Store": "Алкомаркет — мелкое ограбление.",
  Contact: "NPC-контакт, который даёт задания (напр. Randy и Moses заказывают машины).",
  Safe: "Сейф с ценностями. Часть сейфов — «главный лут» нелегальных точек банд (Illegal Operations), часть — в офисах, гаражах, складах.",
  // Vehicles
  "Pay 'N' Spray": "Перекраска — сброс розыска.",
  "Mod Shop": "Тюнинг-мастерская.",
  "Gas Station": "Заправка.",
  "Car Wash": "Автомойка.",
  "Electric Charger": "Зарядка для электромобилей.",
  "Bus Stop": "Остановка автобуса.",
  "Train Station": "Ж/д станция.",
  "Ferry Terminal": "Паромный терминал.",
  "Rental Vehicle": "Прокат транспорта.",
  "Purchasable Garage": "Гараж, который можно купить.",
  Garage: "Гараж для хранения машин.",
  "Standout Vehicle": "Редкая/уникальная машина, которая стоит в мире — можно забрать.",
  "Randy Vehicle": "Машина на заказ для контакта Randy: угнать и пригнать. У каждой своя защита (сигнализация, трекер) и цена.",
  "Moses Vehicle": "Машина на заказ для контакта Moses: угнать и пригнать.",
  // Style
  "Casual & Street": "Магазин повседневной одежды.",
  Sportswear: "Спортивная одежда.",
  Formal: "Классическая одежда.",
  "Souvenir & Swimwear": "Сувениры и пляжная одежда.",
  Thrift: "Секонд-хенд.",
  Footwear: "Обувь.",
  "Hair & Beauty": "Парикмахерская / салон.",
  Tattoos: "Тату-салон.",
  Electronics: "Магазин электроники.",
  // Food & drink
  "Cafes & Takeout": "Кафе и еда навынос.",
  Bar: "Бар.",
  "Street Food": "Уличная еда.",
  // Collections
  Landmark: "WAiNK: достопримечательность — место для фото/отметки в коллекции WAiNK.",
  Curiosity: "WAiNK: необычное/странное место для коллекции WAiNK.",
  Sculpture: "WAiNK: скульптура для коллекции WAiNK.",
  "Book Swap": "Буккроссинг — коллекционная точка.",
  Magazine: "Журнал — коллекционный предмет.",
  "Unique Playlist": "Уникальный плейлист — коллекционка.",
  "1010 Mural": "Мурал (граффити) — коллекционная точка.",
  "Jack of Hearts": "Коллекционная карточка серии Jack of Hearts.",
  Delights: "Коллекционная карточка серии Delights.",
  Nine1Nine: "Коллекционная карточка серии Nine1Nine.",
  // Activities
  "Basketball Hoop": "Баскетбольное кольцо — мини-игра.",
  "Golf Course": "Гольф-поле.",
  "Mini-Golf Course": "Мини-гольф.",
  "Pool Table": "Бильярд.",
  "Shooting Range": "Тир — испытания на стрельбу.",
  "Arcade Machine": "Аркадный автомат.",
  "Fishing Hotspot": "Хорошее место для рыбалки.",
  "Stunt Jump": "Трамплин для трюкового прыжка.",
  "Base Jump": "Бейсджамп с парашютом.",
  "Knife Flight": "Пролёт на самолёте боком (на ребре крыла) через узкий проём.",
  "Under the Bridge": "Пролёт на самолёте под мостом.",
  "Racing Introduction": "Знакомство с гонками.",
  "Racing Challenge": "Гоночное испытание.",
  "Thrillbilly Mud Club": "Гонки по грязи (внедорожники).",
  "Animal Crackers": "Серия гонок/заездов Animal Crackers.",
  "Hit 'n' Run VC": "Серия заездов Hit 'n' Run по Vice City.",
  "Hamlet Boone Speedway": "Трасса Hamlet Boone Speedway.",
  "Ambrosia Raceway": "Трасса Ambrosia Raceway.",
  "Gellhorn Raceway": "Трасса Gellhorn Raceway.",
  "Top Fun Drones": "Гонки дронов.",
  // Illegal operations
  Kingfishers: "Нелегальная точка банды Kingfishers — охрана и лут.",
  "Kolt & Associates": "Нелегальная точка Kolt & Associates — охрана и лут.",
  M7: "Нелегальная точка банды M7 — охрана и лут.",
  "La Polilla Negra": "Нелегальная точка La Polilla Negra — охрана и лут.",
  "Final Chapter": "Нелегальная точка Final Chapter — охрана и лут.",
  San4San: "Нелегальная точка San4San — охрана и лут.",
  "PTT Youngin$": "Нелегальная точка PTT Youngin$ — охрана и лут.",
  "The Guardia Brothers": "Нелегальная точка The Guardia Brothers — охрана и лут.",
  Criminals: "Нелегальная точка преступников — охрана и лут.",
};

/** Legend order: most interesting first, everyday services last. */
export const GROUP_PRIORITY = [
  "27134", // WAiNK Locations
  "27138", // Collectible Cards
  "27137", // Exploration
  "27140", // Illegal Operations
  "27129", // Robberies
  "27130", // Vehicles
  "27125", // Activities
  "27127", // Stunts
  "27136", // Racing
  "27123", // Sports
  "27128", // Points of Interest
  "27131", // Style
  "27132", // Food & Drink
];

/** Inside a group, put these categories first (rare/valuable before routine). */
export const CATEGORY_PRIORITY = new Set([
  "29095", // Standout Vehicle
  "29096", // Randy Vehicle
  "29097", // Moses Vehicle
  "29083", // Safe
  "29082", // Contact
  "29023", // Big Bank
  "29022", // Bank
  "29041", // Ammu-Nation
]);

export function categoryHint(catId: string): string | null {
  const c = categoryById.get(catId);
  return c ? (BY_NAME[c.name] ?? null) : null;
}
