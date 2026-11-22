/** 2026-11-21 の席次表（プロフィールブック確定版）。クイズ名簿とは別に持つ */
export interface SeatGuest {
  name: string;
  relation: string;
}

export interface SeatTable {
  id: string;
  guests: SeatGuest[];
}

export const TAKASAGO: SeatGuest[] = [
  { name: "河本直樹", relation: "新郎" },
  { name: "磯野有梨花", relation: "新婦" },
];

export const SEAT_TABLES: SeatTable[] = [
  {
    id: "A",
    guests: [
      { name: "清水忠朗", relation: "新郎大学先輩" },
      { name: "大友友宏", relation: "新郎大学先輩" },
      { name: "高木大輔", relation: "新郎大学友人" },
      { name: "佐久間善之", relation: "新郎大学先輩" },
      { name: "小牟田清英", relation: "新郎大学先輩" },
      { name: "畠山博行", relation: "新郎大学先輩" },
      { name: "林", relation: "新郎" },
    ],
  },
  {
    id: "B",
    guests: [
      { name: "尾関大地", relation: "新郎友人" },
      { name: "後藤田祐孝", relation: "新郎大学先輩" },
      { name: "奥村裕貴", relation: "新郎友人" },
      { name: "長沼健介", relation: "新郎友人" },
      { name: "井村悠己", relation: "新郎大学先輩" },
      { name: "赤羽龍", relation: "新郎大学先輩" },
    ],
  },
  {
    id: "C",
    guests: [
      { name: "金﨑あや", relation: "新婦元同僚" },
      { name: "香川大樹", relation: "新婦元同僚" },
      { name: "原美樹", relation: "新婦元同僚" },
      { name: "田中美帆", relation: "新婦元同僚" },
      { name: "内田脩哉", relation: "新婦元同僚" },
      { name: "清水優海", relation: "新婦元同僚" },
      { name: "金井佑果", relation: "新婦元同僚" },
    ],
  },
  {
    id: "D",
    guests: [
      { name: "三間芳人", relation: "新婦先輩" },
      { name: "國廣匠未", relation: "新婦同僚" },
      { name: "松本雄太", relation: "新婦同僚" },
      { name: "岩田紗奈", relation: "新婦友人" },
      { name: "金岡香保里", relation: "新婦友人" },
      { name: "小倉さくら", relation: "新婦同僚" },
    ],
  },
  {
    id: "E",
    guests: [
      { name: "竹田瑛紀", relation: "新郎大学友人" },
      { name: "小林直也", relation: "新郎大学友人" },
      { name: "浜野憲典", relation: "新郎大学友人" },
      { name: "早田優実", relation: "新郎大学友人" },
      { name: "津端悠", relation: "新郎大学友人" },
      { name: "澁谷悠希", relation: "新郎大学友人" },
    ],
  },
  {
    id: "F",
    guests: [
      { name: "松本紘士郎", relation: "新郎大学友人" },
      { name: "中間拓雄", relation: "新郎大学友人" },
      { name: "國場幸洋", relation: "新郎友人" },
      { name: "田澤萌子", relation: "新郎大学先輩" },
      { name: "田澤遥介", relation: "新郎大学友人" },
      { name: "足立海陸", relation: "新郎大学友人" },
    ],
  },
  {
    id: "G",
    guests: [
      { name: "宮本菜々子", relation: "新婦高校友人" },
      { name: "奥野萌衣", relation: "新婦高校友人" },
      { name: "東将太", relation: "新婦高校友人" },
      { name: "三木沙耶", relation: "新婦高校友人" },
      { name: "伊賀優理香", relation: "新婦高校友人" },
      { name: "石原秀一", relation: "新婦高校友人" },
    ],
  },
  {
    id: "H",
    guests: [
      { name: "鳥羽山晃一", relation: "新郎大学友人" },
      { name: "鈴木清久", relation: "鈴木武久様 父上" },
      { name: "鈴木晃子", relation: "鈴木武久様 母上" },
      { name: "鈴木晴久", relation: "新郎友人" },
      { name: "鈴木虹夏", relation: "鈴木晴久様 ご令嬢" },
      { name: "鈴木武久", relation: "新郎大学先輩" },
      { name: "鈴木玲奈", relation: "鈴木武久様 令夫人" },
      { name: "鈴木瑠七", relation: "鈴木武久様 ご令嬢" },
      { name: "鈴木琉夏", relation: "鈴木晴久様 ご令嬢" },
      { name: "鈴木夏季", relation: "鈴木晴久様 令夫人" },
    ],
  },
  {
    id: "I",
    guests: [
      { name: "白井伊久真", relation: "新郎中学校友人" },
      { name: "政木研太", relation: "新郎中学校友人" },
      { name: "山田祐輔", relation: "新郎中学校友人" },
      { name: "崎岡豪", relation: "新郎中学校友人" },
      { name: "崎岡碧", relation: "崎岡豪様 令夫人" },
      { name: "奥野公介", relation: "新郎中学校友人" },
      { name: "西崎省吾", relation: "新郎高校友人" },
      { name: "村田智宏", relation: "新郎高校友人" },
      { name: "堀江一成", relation: "新郎中学校友人" },
      { name: "崎岡華", relation: "崎岡豪様 ご令嬢" },
    ],
  },
  {
    id: "J",
    guests: [
      { name: "山下昌幸", relation: "新婦大学先輩" },
      { name: "高橋由佳", relation: "新婦大学友人" },
      { name: "鈴木比奈子", relation: "新婦大学友人" },
      { name: "和田秀哉", relation: "新婦大学先輩" },
      { name: "赤司瞳", relation: "新婦大学後輩" },
    ],
  },
  {
    id: "K",
    guests: [
      { name: "濱田愛子", relation: "新郎親戚" },
      { name: "濱田豊", relation: "新郎親戚" },
      { name: "河本理伽", relation: "新郎妹" },
      { name: "河本英恵", relation: "新郎母" },
      { name: "濱田唯人", relation: "新郎親戚" },
      { name: "濱田織人", relation: "新郎親戚" },
      { name: "河本明日華", relation: "新郎義妹" },
      { name: "河本知樹", relation: "新郎弟" },
      { name: "河本政一", relation: "新郎父" },
    ],
  },
  {
    id: "L",
    guests: [
      { name: "法花安代", relation: "新婦祖母" },
      { name: "磯野江梨花", relation: "新婦妹" },
      { name: "磯野愛優美", relation: "新婦母" },
      { name: "法花義人", relation: "新婦祖父" },
      { name: "法花美貴代", relation: "新婦叔母" },
      { name: "磯野敏之", relation: "新婦父" },
    ],
  },
];

/** 画面上の並び。左が新郎側、右が新婦側 */
export const SEATING_ROWS: string[][] = [
  ["A", "B", "C", "D"],
  ["E", "F", "G"],
  ["H", "I", "J"],
  ["K", "L"],
];

export function seatKey(name: string): string {
  return name.normalize("NFKC").replaceAll("﨑", "崎").replace(/[\s\u3000]/g, "").replace(/様/g, "");
}

export function findSeat(query: string): { tableId: string; name: string }[] {
  const key = seatKey(query);
  if (!key) return [];
  const hits: { tableId: string; name: string }[] = [];
  for (const table of SEAT_TABLES) {
    for (const guest of table.guests) {
      if (seatKey(guest.name).includes(key)) hits.push({ tableId: table.id, name: guest.name });
    }
  }
  return hits;
}
