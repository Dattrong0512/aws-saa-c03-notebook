import { SECTIONS } from "./catalog.mjs";
import { renderSearch } from "./search.mjs";
import { t } from "./i18n.mjs";
function route(){
  const h=location.hash.replace("#/","").replace("#","");
  if(h&&!SECTIONS.some(s=>s.hash===h)){location.hash="";return;}
  document.getElementById("home").classList.toggle("active",!h);
  SECTIONS.forEach(s=>document.getElementById(s.el).classList.toggle("active",s.hash===h));
  window.scrollTo(0,0);
  renderStudyToc();
  setTocOpen(!document.getElementById("tocBtn").hidden&&window.innerWidth>820);
  updateToggleJump();
  if(!document.getElementById("searchPanel").hidden)renderSearch();
}
window.addEventListener("hashchange",route);

function toggleSectionTopics(btn){
  const sec=btn.closest(".section");
  if(!sec)return;
  const topics=[...sec.querySelectorAll(".content > details.topic")];
  const shouldOpen=topics.some(d=>!d.open);
  topics.forEach(d=>{d.open=shouldOpen;});
  btn.textContent=shouldOpen?t("collapse"):t("expand");
  updateTocActive();
  updateToggleJump();
}

function setTocOpen(open){
  document.getElementById("tocPanel").hidden=!open;
  document.getElementById("tocBtn").setAttribute("aria-expanded",String(open));
  document.body.classList.toggle("toc-open",open);
}
new ResizeObserver(()=>document.documentElement.style.setProperty("--top-height",document.querySelector("header.top").getBoundingClientRect().height+"px"))
  .observe(document.querySelector("header.top"));
function revealTocTarget(target,button){
  for(let topic=target.closest("details");topic;topic=topic.parentElement?.closest("details")){
    if(!topic.open)topic.querySelector(":scope > summary").click();
  }
  document.querySelectorAll("#tocEntries [aria-current]").forEach(el=>el.removeAttribute("aria-current"));
  button.setAttribute("aria-current","location");
  if(window.innerWidth<=820){setTocOpen(false);document.getElementById("tocBtn").focus();}
  target.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
}
function updateTocActive(){
  const links=[...document.querySelectorAll("#tocEntries .toc-link")];
  const top=document.querySelector("header.top").getBoundingClientRect().bottom+24;
  let current=null;
  for(const link of links){
    const target=link._tocTarget;
    if(target?.getClientRects().length&&target.getBoundingClientRect().top<=top)current=link;
  }
  for(let group=current?.closest(".toc-group");group;group=group.parentElement.closest(".toc-group")){
    if(!group.open)current=group.querySelector(":scope > summary .toc-link");
  }
  for(const link of links){
    if(link===current)link.setAttribute("aria-current","location");
    else link.removeAttribute("aria-current");
  }
}
function renderStudyToc(){
  const section=document.querySelector(".section.active");
  const entries=document.getElementById("tocEntries");
  entries.replaceChildren();
  const nodes=section?[...section.querySelectorAll(".content details,.content :is(h1,h2,h3,h4,h5,h6)")]:[];
  document.getElementById("tocBtn").hidden=!nodes.length;
  if(!nodes.length){setTocOpen(false);return;}
  document.getElementById("tocPage").textContent=section.querySelector("h2").textContent.trim();
  const containers=new Map();
  for(const node of nodes){
    const isTopic=node.tagName==="DETAILS";
    if(!isTopic&&node.querySelector("p,div,pre,table,ul,ol,blockquote,details,h1,h2,h3,h4,h5,h6"))continue;
    const target=isTopic?node.querySelector(":scope > summary"):node;
    const title=(isTopic?target?.querySelector(".t-title")?.textContent||node.getAttribute("data-track")||target?.textContent:node.textContent)?.replace(/\s+/g," ").trim();
    if(!title)continue;
    const parent=containers.get(node.parentElement.closest("details"))||entries;
    const button=document.createElement("button");button.type="button";
    button._tocTarget=target;
    button.className="toc-link"+(/^H[4-6]$/.test(node.tagName)?" toc-sub":"");button.textContent=title;
    if(isTopic){
      const group=document.createElement("details");group.className="toc-group";group.open=node.open;
      const summary=document.createElement("summary");summary.appendChild(button);
      const children=document.createElement("div");children.className="toc-children";
      group.appendChild(summary);group.appendChild(children);parent.appendChild(group);containers.set(node,children);
      button.onclick=e=>{e.preventDefault();group.open=true;revealTocTarget(target,button);};
    }else{parent.appendChild(button);button.onclick=()=>revealTocTarget(target,button);}
  }
}
window.addEventListener("scroll",updateTocActive,{passive:true});
document.addEventListener("toggle",updateTocActive,true);

function updateToggleJump(){
  const button=document.getElementById("toggleJump");
  const top=document.querySelector("header.top").getBoundingClientRect().bottom+12;
  const topic=[...document.querySelectorAll(".section.active details.topic[open]")].find(el=>
    el.querySelector(":scope > summary").getBoundingClientRect().bottom<top&&el.getBoundingClientRect().bottom>top);
  button.hidden=!topic;
  if(!topic){button.onclick=null;return;}
  const summary=topic.querySelector(":scope > summary");
  button.title=t("backTopic",summary.querySelector(".t-title").textContent);
  button.onclick=()=>{
    summary.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
    summary.focus({preventScroll:true});
  };
}
window.addEventListener("scroll",updateToggleJump,{passive:true});
document.addEventListener("toggle",updateToggleJump,true);


export { route, setTocOpen, toggleSectionTopics };
