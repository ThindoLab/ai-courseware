#!/usr/bin/env node
/**
 * Inject viewport-fit CSS/JS into standalone teaching-aid HTML.
 * Marker: AID_FIT_V1 — re-run replaces previous injection.
 */
import fs from "node:fs";
import path from "node:path";

const STYLE = `/* AID_FIT_V1 */
html,body{height:100%!important;max-height:100dvh!important;overflow:hidden!important}
body{
  min-height:100dvh!important;height:100dvh!important;
  display:flex!important;flex-direction:column!important;
  padding:clamp(6px,1.2vh,14px) clamp(8px,1.5vw,18px)!important;
  box-sizing:border-box!important;
}
body>.card,main.card{
  flex:1 1 auto!important;min-height:0!important;width:100%!important;
  max-width:min(1240px,100%)!important;margin:0 auto!important;
  display:flex!important;flex-direction:column!important;
  overflow:hidden!important;
  padding:clamp(10px,1.5vh,20px) clamp(12px,1.8vw,24px) clamp(10px,1.3vh,16px)!important;
}
.stage,.scene,.stage-wrap,.viz{
  flex:1 1 42%!important;min-height:min(280px,38vh)!important;overflow:hidden!important;
  display:flex!important;flex-direction:column!important;justify-content:center!important;
}
.stage svg,.scene svg,#diagram{
  flex:1 1 auto;width:100%!important;height:100%!important;max-height:100%!important;min-height:0;
}
.ctrl,.choices,.btn-row,.top,.topbar,.fb,.progress{flex:none}
.slots,.grid,.bins,.pool,.ten{flex:1 1 auto!important;min-height:0}
html.aid-compact .story,html.aid-compact .thinking,html.aid-compact .say{display:none!important}
html.aid-compact .fb{min-height:0!important;padding:8px 10px!important;margin:6px 0!important;font-size:14px!important}
html.aid-compact h1{font-size:clamp(18px,2.2vw,22px)!important}
html.aid-compact .ctrl{gap:8px}
html.aid-compact .btn{min-height:44px;padding:8px 14px}
html.aid-compact .controls{display:grid!important;grid-template-columns:1fr 1fr;gap:6px 12px;max-height:30vh;overflow:auto}
html.aid-tight .legend,html.aid-tight .hints,html.aid-tight .thinking{display:none!important}
html.aid-tight .story{display:none!important}
html.aid-tight .stage,html.aid-tight .scene{min-height:min(200px,32vh)!important}
@media (min-width:960px) and (min-height:780px){
  body{font-size:17px}
  .top h1,.topbar h1{font-size:clamp(24px,2.1vw,30px)}
}
`;

const SCRIPT = `/* AID_FIT_V1 */
(function(){
  var html=document.documentElement;
  function measure(){
    var card=document.querySelector("main.card, body>.card");
    if(!card) return;
    html.classList.remove("aid-compact","aid-tight");
    card.style.overflowY="hidden";
    void card.offsetHeight;
    var stage=card.querySelector(".stage,.scene,.stage-wrap,.viz");
    var stageH=stage?stage.clientHeight:999;
    if(card.scrollHeight>card.clientHeight+8 || stageH<240 || innerHeight<820) html.classList.add("aid-compact");
    void card.offsetHeight;
    stageH=stage?stage.clientHeight:999;
    if(card.scrollHeight>card.clientHeight+8 || stageH<200) html.classList.add("aid-tight");
    void card.offsetHeight;
    if(card.scrollHeight>card.clientHeight+8) card.style.overflowY="auto";
  }
  addEventListener("resize",measure);
  addEventListener("load",measure);
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",measure);
  else requestAnimationFrame(measure);
  setTimeout(measure,80);
  setTimeout(measure,400);
  var card=document.querySelector("main.card, body>.card");
  if(card && typeof MutationObserver==="function"){
    var t;
    new MutationObserver(function(){
      clearTimeout(t); t=setTimeout(measure,40);
    }).observe(card,{childList:true,subtree:true,characterData:true});
  }
})();
`;

const STYLE_BLOCK = `<style id="aid-fit">${STYLE}</style>\n`;
const SCRIPT_BLOCK = `<script id="aid-fit-js">${SCRIPT}</script>\n`;

function stripOld(html) {
  return html
    .replace(/\n?<style id="aid-fit">[\s\S]*?<\/style>\n?/g, "")
    .replace(/\n?<script id="aid-fit-js">[\s\S]*?<\/script>\n?/g, "");
}

function patch(html) {
  let next = stripOld(html);
  if (!next.includes("</head>")) throw new Error("no </head>");
  if (!next.includes("</body>")) throw new Error("no </body>");
  next = next.replace("</head>", `${STYLE_BLOCK}</head>`);
  next = next.replace("</body>", `${SCRIPT_BLOCK}</body>`);
  return next;
}

const dir = path.resolve(process.argv[2] || "samples");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
let n = 0;
for (const f of files) {
  const p = path.join(dir, f);
  const raw = fs.readFileSync(p, "utf8");
  const next = patch(raw);
  if (next !== raw) {
    fs.writeFileSync(p, next);
    n++;
    console.log("patched", f);
  } else {
    console.log("unchanged", f);
  }
}
console.log(`done ${n}/${files.length} in ${dir}`);
