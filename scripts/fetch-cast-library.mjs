#!/usr/bin/env node
/**
 * 把许可干净、可内联的人物/动物/物资源抽到 pi/assets/cast/。
 * 不收有版权的卡通 IP（皮卡丘、佩奇、迪士尼等）。
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CAST = path.join(ROOT, "pi", "assets", "cast");
const VENDOR = path.join(CAST, ".vendor");
const require = createRequire(import.meta.url);

const ICONIFY_PACKS = [
  { npm: "@iconify-json/noto", dir: "packs/noto", license: "OFL-1.1 / Apache-2.0", kind: "symbols" },
  { npm: "@iconify-json/noto-v1", dir: "packs/noto-v1", license: "OFL-1.1 / Apache-2.0", kind: "symbols" },
  { npm: "@iconify-json/fluent-emoji-flat", dir: "packs/fluent-emoji-flat", license: "MIT", kind: "symbols" },
  { npm: "@iconify-json/twemoji", dir: "packs/twemoji", license: "CC-BY-4.0", kind: "symbols" },
  { npm: "@iconify-json/openmoji", dir: "packs/openmoji", license: "CC-BY-SA-4.0", kind: "symbols" },
  { npm: "@iconify-json/emojione", dir: "packs/emojione", license: "CC-BY-4.0", kind: "symbols" },
  { npm: "@iconify-json/emojione-v1", dir: "packs/emojione-v1", license: "CC-BY-4.0", kind: "symbols" },
  { npm: "@iconify-json/fxemoji", dir: "packs/fxemoji", license: "Apache-2.0", kind: "symbols" },
  { npm: "@iconify-json/streamline-emojis", dir: "packs/streamline-emojis", license: "CC-BY-4.0", kind: "symbols" },
  { npm: "@iconify-json/game-icons", dir: "packs/game-icons", license: "CC-BY-3.0", kind: "symbols" },
];

const PEOPLE_STYLES = [
  { npm: "@dicebear/avataaars", id: "avataaars", license: "Avataaars 商用免费" },
  { npm: "@dicebear/avataaars-neutral", id: "avataaars-neutral", license: "Avataaars 商用免费" },
  { npm: "@dicebear/open-peeps", id: "open-peeps", license: "CC0" },
  { npm: "@dicebear/lorelei", id: "lorelei", license: "CC0" },
  { npm: "@dicebear/lorelei-neutral", id: "lorelei-neutral", license: "CC0" },
  { npm: "@dicebear/notionists", id: "notionists", license: "CC0" },
  { npm: "@dicebear/notionists-neutral", id: "notionists-neutral", license: "CC0" },
  { npm: "@dicebear/personas", id: "personas", license: "CC0" },
  { npm: "@dicebear/adventurer", id: "adventurer", license: "CC-BY-4.0" },
  { npm: "@dicebear/adventurer-neutral", id: "adventurer-neutral", license: "CC-BY-4.0" },
  { npm: "@dicebear/big-smile", id: "big-smile", license: "CC-BY-4.0" },
  { npm: "@dicebear/big-ears", id: "big-ears", license: "CC-BY-4.0" },
  { npm: "@dicebear/big-ears-neutral", id: "big-ears-neutral", license: "CC-BY-4.0" },
  { npm: "@dicebear/croodles", id: "croodles", license: "CC-BY-4.0" },
  { npm: "@dicebear/croodles-neutral", id: "croodles-neutral", license: "CC-BY-4.0" },
  { npm: "@dicebear/fun-emoji", id: "fun-emoji", license: "MIT" },
  { npm: "@dicebear/bottts", id: "bottts", license: "MIT" },
  { npm: "@dicebear/bottts-neutral", id: "bottts-neutral", license: "MIT" },
  { npm: "@dicebear/micah", id: "micah", license: "CC-BY-4.0" },
  { npm: "@dicebear/miniavs", id: "miniavs", license: "CC-BY-4.0" },
  { npm: "@dicebear/pixel-art", id: "pixel-art", license: "MIT" },
  { npm: "@dicebear/dylan", id: "dylan", license: "CC0" },
  { npm: "@dicebear/thumbs", id: "thumbs", license: "CC0" },
];

const PEOPLE_SEEDS = [
  "teacher", "student", "girl", "boy", "baby", "grandma", "grandpa",
  "doctor", "nurse", "farmer", "cook", "police", "firefighter", "astronaut",
  "princess", "knight", "wizard", "explorer", "friend", "buddy",
  "kid-a", "kid-b", "kid-c", "kid-d", "class-mate",
];

const TAG_RULES = [
  ["people", /boy|girl|man|woman|person|people|baby|child|adult|family|teacher|student|prince|princess|fairy|mermaid|superhero|mage|elf|vampire|zombie|genie|troll|knight|santa|mrs-claus|older-|blond|beard|gesturing|standing|sitting|walking|running|dancing|selfie|health-worker|farmer|cook|mechanic|scientist|singer|artist|pilot|astronaut|firefighter|police|detective|guard|ninja|bride|with-veil|in-tuxedo|in-lotus|in-steamy|climbing|lifting|biking|cartwheeling|juggling|handball|wrestling|fencing|skiing|surfing|swimming|rowing|climbing|kneeling|bowing|face-palm|shrug|frowning|pouting|pouting|raising-hand|tipping|guard/i],
  ["face", /^(grinning|smiling|frowning|crying|angry|worried|thinking|sleeping|winking|kissing|nerd|disguised|clown|ogre|goblin|ghost|alien|robot|poo|skull|heart-eyes|star-struck|partying|woozy|hot-face|cold-face|exploding|face)/i],
  ["animal", /dog|cat|mouse|rat|hamster|rabbit|fox|bear|panda|koala|tiger|lion|cow|ox|buffalo|pig|boar|frog|monkey|gorilla|orangutan|chicken|rooster|chick|bird|duck|eagle|owl|penguin|dove|swan|flamingo|parrot|turkey|peacock|fish|tropical-fish|blowfish|shark|whale|dolphin|octopus|squid|shrimp|lobster|crab|snail|butterfly|bug|ant|bee|beetle|lady-beetle|cricket|cockroach|spider|scorpion|mosquito|fly|worm|microbe|turtle|snake|lizard|crocodile|dinosaur|sauropod|t-rex|dragon|unicorn|horse|zebra|deer|bison|camel|llama|giraffe|elephant|mammoth|rhino|hippo|goat|sheep|ewe|ram|hedgehog|squirrel|beaver|otter|skunk|badger|bat|wolf|sloth|otter|seal|kangaroo|leopard|poodle|guide-dog|service-dog|chipmunk|raccoon|skunk|badger|mammoth|dodo|feather|nest/i],
  ["food", /apple|pear|orange|lemon|banana|watermelon|grapes|strawberry|blueberr|melon|peach|cherries|mango|pineapple|coconut|kiwi|tomato|avocado|eggplant|potato|carrot|corn|pepper|cucumber|leafy|broccoli|garlic|onion|mushroom|peanut|chestnut|bread|croissant|baguette|pretzel|bagel|pancake|waffle|cheese|meat|poultry|bacon|hamburger|fries|pizza|hot-dog|sandwich|taco|burrito|tamale|falafel|egg|cooking|pot-of-food|fondue|bowl|green-salad|popcorn|butter|salt|canned|bento|rice|curry|steaming|spaghetti|ramen|stew|sushi|fried-shrimp|fish-cake|moon-cake|dango|dumpling|fortune|takeout|oyster|ice-cream|shaved-ice|soft-ice|doughnut|cookie|birthday-cake|shortcake|cupcake|pie|chocolate|candy|lollipop|custard|honey|baby-bottle|milk|beverage|teapot|tea|sake|bottle|wine|cocktail|tropical-drink|beer|clinking|tumbler|cup-with|bubble-tea|beverage-box|mate|ice|chopsticks|fork|spoon|kitchen-knife/i],
  ["vehicle", /car|automobile|taxi|bus|trolleybus|minibus|ambulance|fire-engine|police-car|tractor|truck|articulated|scooter|motorcycle|bicycle|kick-scooter|skateboard|roller|auto-rickshaw|pickup|train|tram|monorail|railway|locomotive|metro|light-rail|station|airplane|helicopter|satellite|rocket|flying-saucer|seat|canoe|boat|ship|ferry|speedboat|passenger-ship|motor-boat|anchor|ring-buoy/i],
  ["school", /school|book|notebook|ledger|bookmark|page|newspaper|bookmark-tabs|label|pencil|pen|crayon|paintbrush|fountain-pen|memo|briefcase|backpack|school-backpack|abacus|straight-ruler|triangular-ruler|clipboard|card-index|file-folder|calendar|pushpin|paperclip|linked-paperclips|scissors|wastebasket|ballot/i],
  ["nature", /sun|moon|star|cloud|rainbow|umbrella|snow|rain|zap|fire|droplet|ocean|water|wave|fog|tornado|cyclone|wind|comet|globe|earth|new-moon|full-moon|crescent|thermometer|tornado|foggy|bridge-at-night|milky-way|shooting-star|sparkles|dizzy|tree|evergreen|deciduous|palm-tree|cactus|sheaf|herb|shamrock|four-leaf|maple|fallen-leaf|leaf-fluttering|mushroom|blossom|tulip|rose|wilted|hibiscus|sunflower|bouquet|seedling|potted|wood|rock|mountain|volcano| tent|camping|beach|desert|island|park|national-park|stadium/i],
  ["home", /house|home|derelict|office|post-office|hospital|bank|hotel|love-hotel|convenience|department|factory|japanese-castle|castle|wedding|tokyo-tower|statue|church|mosque|hindu-temple|synagogue|shinto|kaaba|fountain|tent|foggy|night-with|cityscape|sunrise|sunset|bridge|carousel|ferris|roller-coaster|barber|circus|locomotive|door|bed|couch|chair|toilet|shower|bathtub|lotion|safety-pin|broom|basket|roll-of-paper|bucket|soap|toothbrush|sponge|fire-extinguisher|shopping|receipt|window|mirror|lamp|light-bulb|flashlight|candle|diya/i],
  ["play", /soccer|baseball|softball|basketball|volleyball|football|rugby|tennis|flying-disc|bowling|cricket-game|field-hockey|ice-hockey|lacrosse|ping-pong|badminton|boxing|martial-arts|goal-net|flag-in-hole|ice-skate|fishing|running-shirt|skis|sled|curling|dart|yo-yo|kite|pool-8|crystal-ball|magic-wand|joystick|video-game|slot-machine|game-die|puzzle|teddy|pinata|nesting-dolls|spade|heart|diamond|club|chess|joker|mahjong|flower-playing|performing-arts|framed|artist-palette|thread|yarn|sewing|balloon|confetti|tada|party|ticket|admission|microphone|headphone|radio|saxophone|accordion|guitar|musical|trumpet|violin|banjo|drum|long-drum|maracas/i],
  ["story", /castle|crown|gem|ring|magic|wand|crystal-ball|scroll|old-key|axe|dagger|crossed-swords|shield|bow-and-arrow|boomerang|trident|japanese-goblin|ogre|ghost|alien|robot|dragon|unicorn|mermaid|fairy|mage|elf|genie|zombie|troll|supervillain|superhero|ninja|disguised|performing|circus|carousel|ferris/i],
];

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function writeSvg(file, svg) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, svg.trim() + "\n", "utf8");
}

function wrapIcon(body, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="none">${body}</svg>`;
}

function tagName(name) {
  const tags = [];
  for (const [tag, re] of TAG_RULES) {
    if (re.test(name)) tags.push(tag);
  }
  if (!tags.length) tags.push("misc");
  return tags;
}

const TYPE_ZH = {
  people: "人物",
  portrait: "头像",
  face: "表情",
  animal: "动物",
  food: "食物",
  vehicle: "交通",
  school: "学校",
  nature: "自然",
  home: "场所",
  play: "玩乐",
  story: "故事",
  scene: "场景",
  doodle: "涂鸦",
  robot: "机器人",
  misc: "其他",
};

function makeItem({ id, file, pack, license, tags, type, name }) {
  const t = type || tags[0] || "misc";
  const n = name || String(id).split(":").slice(1).join(":") || path.basename(file, ".svg");
  return {
    id,
    type: t,
    type_zh: TYPE_ZH[t] || t,
    name: n,
    label: `${TYPE_ZH[t] || t}/${n}`,
    pack,
    license,
    tags,
    file,
  };
}

function npmInstall() {
  ensureDir(VENDOR);
  const pkgFile = path.join(VENDOR, "package.json");
  if (!fs.existsSync(pkgFile)) {
    fs.writeFileSync(
      pkgFile,
      JSON.stringify({ name: "cast-vendor", private: true, type: "commonjs" }, null, 2)
    );
  }
  const pkgs = [
    "@dicebear/core@9.4.2",
    ...PEOPLE_STYLES.map((s) => `${s.npm}@9.4.2`),
    ...ICONIFY_PACKS.map((p) => p.npm),
  ];
  console.error("[cast-fetch] npm install", pkgs.length, "packages →", VENDOR);
  execFileSync("npm", ["install", "--omit=dev", "--no-fund", "--no-audit", "--prefix", VENDOR, ...pkgs], {
    stdio: "inherit",
  });
}

function extractIconify() {
  const items = [];
  for (const pack of ICONIFY_PACKS) {
    const jsonPath = path.join(VENDOR, "node_modules", pack.npm, "icons.json");
    if (!fs.existsSync(jsonPath)) {
      console.error(`[cast-fetch] skip missing ${pack.npm}`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const defW = data.width || 24;
    const defH = data.height || 24;
    const outDir = path.join(CAST, pack.dir);
    if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
    ensureDir(outDir);
    let n = 0;
    for (const [name, icon] of Object.entries(data.icons || {})) {
      const w = icon.width || defW;
      const h = icon.height || defH;
      const svg = wrapIcon(icon.body, w, h);
      const file = path.join(outDir, `${name}.svg`);
      writeSvg(file, svg);
      n += 1;
      const tags = tagName(name);
      items.push(
        makeItem({
          id: `${path.basename(pack.dir)}:${name}`,
          file: path.relative(CAST, file),
          pack: path.basename(pack.dir),
          license: pack.license,
          tags,
          type: tags[0],
          name,
        })
      );
    }
    console.error(`[cast-fetch] ${pack.npm} → ${n} svg`);
  }
  return items;
}

function generatePeople() {
  const { createAvatar } = require(path.join(VENDOR, "node_modules", "@dicebear/core"));
  const items = [];
  for (const style of PEOPLE_STYLES) {
    const modPath = path.join(VENDOR, "node_modules", style.npm);
    if (!fs.existsSync(modPath)) {
      console.error(`[cast-fetch] skip missing ${style.npm}`);
      continue;
    }
    const mod = require(modPath);
    const outDir = path.join(CAST, "people", style.id);
    if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
    ensureDir(outDir);
    for (const seed of PEOPLE_SEEDS) {
      const svg = createAvatar(mod, { seed, size: 280 }).toString();
      const file = path.join(outDir, `${seed}.svg`);
      writeSvg(file, svg);
      const tags = ["people", /bottts/.test(style.id) ? "robot" : "portrait"];
      items.push(
        makeItem({
          id: `${style.id}:${seed}`,
          file: path.relative(CAST, file),
          pack: style.id,
          license: style.license,
          tags,
          type: /bottts/.test(style.id) ? "robot" : "people",
          name: seed,
        })
      );
    }
    console.error(`[cast-fetch] ${style.id} → ${PEOPLE_SEEDS.length} svg`);
  }
  return items;
}

/** React TSX 里的 doodle 带 fill={accent}，必须换成真 SVG。 */
function jsxSvgToSvg(src) {
  const m = src.match(/<svg\b[\s\S]*?<\/svg>/i);
  if (!m) return "";
  let s = m[0];
  s = s.replace(/fill=\{accent\}/g, 'fill="#FF5678"');
  s = s.replace(/stroke=\{accent\}/g, 'stroke="#FF5678"');
  s = s.replace(/fill=\{ink\}/g, 'fill="#000000"');
  s = s.replace(/stroke=\{ink\}/g, 'stroke="#000000"');
  s = s.replace(/\{accent\}/g, "#FF5678");
  s = s.replace(/\{ink\}/g, "#000000");
  const camel = {
    fillRule: "fill-rule",
    strokeWidth: "stroke-width",
    strokeLinejoin: "stroke-linejoin",
    strokeLinecap: "stroke-linecap",
    strokeMiterlimit: "stroke-miterlimit",
    clipPath: "clip-path",
    clipRule: "clip-rule",
    fillOpacity: "fill-opacity",
    strokeOpacity: "stroke-opacity",
    stopColor: "stop-color",
    stopOpacity: "stop-opacity",
    fontFamily: "font-family",
    fontSize: "font-size",
    fontWeight: "font-weight",
    letterSpacing: "letter-spacing",
    textAnchor: "text-anchor",
    className: "class",
    xmlnsXlink: "xmlns:xlink",
    xlinkHref: "xlink:href",
  };
  for (const [a, b] of Object.entries(camel)) {
    s = s.replace(new RegExp(`\\b${a}=`, "g"), `${b}=`);
  }
  s = s.replace(/\{`([^`]*)`\}/g, "$1");
  s = s.replace(/\{\s*["']([^"']+)["']\s*\}/g, "$1");
  s = s.replace(/\{[^}]+\}/g, "");
  if (!/xmlns=/.test(s)) s = s.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return s;
}

function doodleLooksUsable(svg) {
  return (
    svg.includes("<svg") &&
    svg.includes("</svg>") &&
    !/fill=\{/.test(svg) &&
    !/\bclassName=/.test(svg) &&
    !/\bfillRule=/.test(svg)
  );
}

function extractDoodles() {
  const dest = path.join(CAST, "doodles", "open-doodles");
  const clone = path.join(VENDOR, "react-open-doodles");
  if (!fs.existsSync(path.join(clone, "src", "components"))) {
    if (fs.existsSync(clone)) fs.rmSync(clone, { recursive: true });
    execFileSync(
      "git",
      ["clone", "--depth", "1", "https://github.com/lunahq/react-open-doodles.git", clone],
      { stdio: "inherit" }
    );
  }
  const srcDir = path.join(clone, "src", "components");
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true });
  ensureDir(dest);
  const items = [];
  for (const name of fs.readdirSync(srcDir).filter((n) => n.endsWith(".tsx"))) {
    const raw = fs.readFileSync(path.join(srcDir, name), "utf8");
    const svg = jsxSvgToSvg(raw);
    if (!doodleLooksUsable(svg)) {
      console.error(`[cast-fetch] doodle skip unusable ${name}`);
      continue;
    }
    const id = name
      .replace(/\.tsx$/i, "")
      .replace(/Doodle$/i, "")
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .toLowerCase();
    const file = path.join(dest, `${id}.svg`);
    writeSvg(file, svg);
    items.push(
      makeItem({
        id: `open-doodles:${id}`,
        file: path.relative(CAST, file),
        pack: "open-doodles",
        license: "CC0 (Open Doodles / Pablo Stanley)",
        tags: ["people", "scene", "doodle"],
        type: "scene",
        name: id,
      })
    );
  }
  console.error(`[cast-fetch] open-doodles → ${items.length} svg`);
  return items;
}

function indexOpenmaic() {
  const dir = path.join(CAST, "openmaic");
  const items = [];
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".svg"))) {
    const id = name.replace(/\.svg$/, "");
    items.push(
      makeItem({
        id: `openmaic:${id}`,
        file: path.join("openmaic", name),
        pack: "openmaic",
        license: "Avataaars / 个人与商用免费（经 OpenMAIC）",
        tags: ["people", "portrait", "avataaars"],
        type: "people",
        name: id,
      })
    );
  }
  return items;
}

function writeCatalog(items) {
  const byType = {};
  const byPack = {};
  for (const it of items) {
    byPack[it.pack] = (byPack[it.pack] || 0) + 1;
    byType[it.type] = (byType[it.type] || 0) + 1;
  }
  const catalog = {
    generated_at: new Date().toISOString(),
    count: items.length,
    packs: byPack,
    types: byType,
    note: "测试用全量。id=pack:name，label=类型/名称。版权 IP 未收录。",
    items,
  };
  fs.writeFileSync(path.join(CAST, "catalog.json"), JSON.stringify(catalog), "utf8");
  const index = {
    generated_at: catalog.generated_at,
    count: items.length,
    types: byType,
    packs: byPack,
    items: items.map((it) => ({
      id: it.id,
      type: it.type,
      type_zh: it.type_zh,
      name: it.name,
      label: it.label,
      pack: it.pack,
      file: it.file,
    })),
  };
  fs.writeFileSync(path.join(CAST, "index.json"), JSON.stringify(index), "utf8");
  console.error("[cast-fetch] catalog", JSON.stringify({ count: items.length, packs: byPack, types: byType }, null, 2));
}

function main() {
  ensureDir(CAST);
  npmInstall();
  const items = [
    ...indexOpenmaic(),
    ...generatePeople(),
    ...extractDoodles(),
    ...extractIconify(),
  ];
  writeCatalog(items);
}

main();
