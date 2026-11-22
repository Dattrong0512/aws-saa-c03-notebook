import { SECTIONS } from "./catalog.mjs";
import { route, setTocOpen, toggleSectionTopics } from "./navigation.mjs";
import { toggleSearchPanel, closeSearch, clearSearch } from "./search.mjs";
import { t } from "./i18n.mjs";
const DOMAINS = ["all", "security", "compute", "storage", "database", "network", "ops"].map(id => ({ id, label: t(`domain_${id}`) }));
let activeDomain="all";
function renderDomainFilters(){
  const bar=document.getElementById("domainFilters");
  if(!bar)return;
  bar.replaceChildren();
  for(const d of DOMAINS){
    const count=d.id==="all"?SECTIONS.length:SECTIONS.filter(s=>s.domain===d.id).length;
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="domain-chip";
    btn.setAttribute("aria-pressed",String(activeDomain===d.id));
    btn.innerHTML=`<span>${d.label}</span><span class="chip-count">${count}</span>`;
    btn.onclick=()=>{activeDomain=d.id;renderDomainFilters();renderCards();};
    bar.appendChild(btn);
  }
}

function renderCards(){
  const c=document.getElementById("cards");
  c.replaceChildren();
  SECTIONS.filter(s=>activeDomain==="all"||s.domain===activeDomain).forEach(s=>{
    const secEl=document.getElementById(s.el);
    const count=secEl?secEl.querySelectorAll("details.topic[data-track]").length:0;
    const card=document.createElement("button");
    card.type="button";
    card.className="card";
    card.setAttribute("data-domain",s.domain);
    card.onclick=()=>{location.hash="#/"+s.hash;};
    card.innerHTML=`<div>
      <div class="card-top"><img class="service-icon" src="${s.icon}" alt="" width="44" height="44" decoding="async"><span class="card-domain">${s.domainLabel}</span></div>
      <div class="name">${s.name}</div>
      <p class="desc">${s.desc}</p>
    </div>
    <div class="card-foot"><span>${t("topics",count)}</span></div>`;
    c.appendChild(card);
  });
}


for (const link of document.querySelectorAll("[data-language]")) {
  if (link.dataset.language === document.documentElement.lang) link.setAttribute("aria-current", "page");
  link.addEventListener("click", () => { link.href = (link.dataset.language === "en" ? "/en/" : "/") + location.hash; });
}
document.getElementById("homeBtn").onclick = () => { location.hash = ""; };
document.querySelector(".page-tabs a").href = document.documentElement.lang === "en" ? "/en/" : "/";
document.getElementById("tocBtn").onclick = () => setTocOpen(document.getElementById("tocPanel").hidden);
document.getElementById("searchBtn").onclick = toggleSearchPanel;
document.querySelector('[data-action="close-toc"]').onclick = () => { setTocOpen(false); document.getElementById("tocBtn").focus(); };
document.querySelector('[data-action="close-search"]').onclick = closeSearch;
document.querySelector('[data-action="clear-search"]').onclick = clearSearch;
for (const button of document.querySelectorAll(".back")) button.onclick = () => { location.hash = ""; };
for (const button of document.querySelectorAll(".expand-btn")) button.onclick = () => toggleSectionTopics(button);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !document.getElementById("tocPanel").hidden) { setTocOpen(false); document.getElementById("tocBtn").focus(); }
});
renderDomainFilters();
route();
renderCards();
