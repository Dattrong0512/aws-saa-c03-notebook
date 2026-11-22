import { SECTIONS } from "./catalog.mjs";
import { normalizeSearch, hasAlphaNum, findStudyMatches, highlightRanges } from "./search-core.mjs";
import { t } from "./i18n.mjs";
function getStudySearchSources(){
  return SECTIONS.map(section=>{
    const blocks=new Map(),headings=new Map(),headingItems=new Map();
    const nodes=document.getElementById(section.el).querySelectorAll(".content .t-title,.content :is(h1,h2,h3,h4,h5,h6,p,li,tr,pre,dt,dd)");
    for(const element of nodes){
      if(element.parentElement.closest("p,li,tr,pre,dt,dd"))continue;
      const isTitle=element.classList.contains("t-title"),isHeading=/^H[1-6]$/.test(element.tagName);
      if(isHeading&&element.querySelector("p,div,pre,table,ul,ol,blockquote,details,h1,h2,h3,h4,h5,h6"))continue;
      const topic=element.closest("details"),owner=topic||element;
      const summary=topic?.querySelector(":scope > summary");
      const title=summary?.querySelector(".t-title")?.textContent?.trim()||section.name;
      if(!blocks.has(owner))blocks.set(owner,{title,element:summary||element,preview:"",parts:[]});
      if(isTitle)continue;
      const text=element.tagName==="TR"&&element.cells
        ?[...element.cells].map(c=>c.textContent.replace(/\s+/g," ").trim()).filter(Boolean).join(" · ")
        :element.textContent.replace(/\s+/g," ").trim();
      if(!text)continue;
      const block=blocks.get(owner);
      if(isHeading){
        headings.set(topic,text);
        const hPart={element,text,context:text,isHeading:true,preview:""};
        headingItems.set(topic,hPart);
        block.parts.push(hPart);
      }else{
        if(!block.preview)block.preview=text;
        const lastH=headingItems.get(topic);
        if(lastH&&!lastH.preview)lastH.preview=text;
        block.parts.push({element,text,context:headings.get(topic)||"",isHeading:false});
      }
    }
    return {hash:section.hash,name:section.name,blocks:[...blocks.values()]};
  });
}
function appendSearchHighlight(label,text,query){
  let end=0;
  for(const [start,stop] of highlightRanges(text,query)){
    label.appendChild(document.createTextNode(text.slice(end,start)));
    const mark=document.createElement("mark");mark.textContent=text.slice(start,stop);label.appendChild(mark);end=stop;
  }
  label.appendChild(document.createTextNode(text.slice(end)));
}
let activeSearchTarget=null;
function clearSearch(){
  document.getElementById("searchInput").value="";renderSearch();document.getElementById("searchInput").focus();
}
function revealSearchMatch(match){
  const reveal=()=>{
    for(let parent=match.element.closest("details");parent;parent=parent.parentElement?.closest("details"))parent.open=true;
    activeSearchTarget=match.element;
    document.querySelectorAll("#searchPanel [aria-current]").forEach(button=>button.removeAttribute("aria-current"));
    document.querySelectorAll(".search-result,.search-subitem").forEach(button=>{if(button._searchTarget===match.element)button.setAttribute("aria-current","location");});
    match.element.scrollIntoView({block:"start"});
    match.element.getAnimations().forEach(animation=>animation.cancel());
    match.element.animate([{backgroundColor:"#FEF9C3",outline:"2px solid #EAB308",outlineOffset:"3px"},{backgroundColor:"#FEF9C3",outline:"2px solid #EAB308",outlineOffset:"3px"}],{duration:1800});
  };
  if(location.hash.replace(/^#\/?/,"")===match.hash)reveal();
  else{window.addEventListener("hashchange",reveal,{once:true});location.hash="#/"+match.hash;}
}
function openSearch(){
  const panel=document.getElementById("searchPanel");
  panel.hidden=false;
  document.body.classList.add("search-open");
  renderSearch();
  const input=document.getElementById("searchInput");input.focus();input.select();
}
function closeSearch(){
  clearTimeout(searchTimer);
  document.getElementById("searchPanel").hidden=true;
  document.body.classList.remove("search-open");
  document.getElementById("searchBtn").focus();
}
function toggleSearchPanel(){
  const panel=document.getElementById("searchPanel");
  if(panel.hidden)openSearch();
  else if(!document.getElementById("searchInput").value.trim())closeSearch();
  else document.getElementById("searchInput").focus();
}
function renderSearch(){
  clearTimeout(searchTimer);
  const query=document.getElementById("searchInput").value;
  const page=SECTIONS.find(section=>section.hash===location.hash.replace("#/","").replace("#",""));
  const pageFilter=document.getElementById("searchPage");
  pageFilter.querySelector('[value="current"]').disabled=!page;
  if(pageFilter.value==="current"&&!page)pageFilter.value="";
  const scopeHash=pageFilter.value==="current"?page?.hash:"";
  const scopeLabel=scopeHash?t("searchIn",page.name):t("searchAll");
  document.querySelector("#searchPanel .search-head strong").textContent=scopeLabel;
  document.getElementById("searchPanel").setAttribute("aria-label",scopeLabel);
  document.getElementById("searchClear").hidden=!query;
  const matches=findStudyMatches(query,getStudySearchSources(),scopeHash);
  const results=document.getElementById("searchResults"),scrollTop=results.scrollTop;results.replaceChildren();
  results.setAttribute("aria-busy","false");
  const hasQuery=normalizeSearch(query)&&hasAlphaNum(normalizeSearch(query));
  document.getElementById("searchCount").textContent=hasQuery
    ?t("resultCount",matches.length,new Set(matches.map(match=>match.hash)).size):t("searchPrompt");
  if(!hasQuery||!matches.length){
    const empty=document.createElement("div");empty.className="search-empty";
    const message=document.createElement("p");message.textContent=normalizeSearch(query)?t("noResults",query.trim()):t("searchHelp");empty.appendChild(message);
    if(normalizeSearch(query)){const clear=document.createElement("button");clear.type="button";clear.textContent=t("clearSearch");clear.onclick=clearSearch;empty.appendChild(clear);}
    results.appendChild(empty);return;
  }
  const groups=new Map();
  for(const match of matches){
    if(!groups.has(match.hash))groups.set(match.hash,[]);groups.get(match.hash).push(match);
  }
  for(const groupMatches of groups.values()){
    const group=document.createElement("section");group.className="search-group";
    const heading=document.createElement("h3");heading.appendChild(document.createTextNode(groupMatches[0].page));
    const total=document.createElement("span");total.textContent=groupMatches.length;heading.appendChild(total);
    const groupResults=document.createElement("div");groupResults.className="search-group-results";
    group.appendChild(heading);group.appendChild(groupResults);results.appendChild(group);
    for(const match of groupMatches){
      const card=document.createElement("article");card.className="search-topic-card";
      const button=document.createElement("button");button.type="button";button.className="search-result";button._searchTarget=match.element;
      if(match.element===activeSearchTarget)button.setAttribute("aria-current","location");
      const titleRow=document.createElement("div");titleRow.className="search-result-title";
      const title=document.createElement("strong");appendSearchHighlight(title,match.title,query);titleRow.appendChild(title);
      if(match.count>1){const count=document.createElement("span");count.className="search-result-count";count.textContent=t("matches",match.count);titleRow.appendChild(count);}
      button.appendChild(titleRow);
      if(match.context){
        const context=document.createElement("span");context.className="search-result-context";
        appendSearchHighlight(context,`§ ${match.context}`,query);context.title=match.context;button.appendChild(context);
      }
      if(match.snippet&&normalizeSearch(match.snippet)!==normalizeSearch(match.context||"")){
        const snippet=document.createElement("span");snippet.className="search-result-snippet";appendSearchHighlight(snippet,match.snippet,query);button.appendChild(snippet);
      }
      button.onclick=()=>revealSearchMatch(match);
      card.appendChild(button);

      const extras=(match.items||[]).filter(item=>item.element!==match.element);
      if(extras.length){
        const sublist=document.createElement("div");sublist.className="search-sublist";
        for(const sub of extras.slice(0,2)){
          const subBtn=document.createElement("button");subBtn.type="button";subBtn.className="search-subitem";subBtn._searchTarget=sub.element;
          if(sub.element===activeSearchTarget)subBtn.setAttribute("aria-current","location");
          if(sub.context){
            const sh=document.createElement("span");sh.className="search-subitem-head";
            appendSearchHighlight(sh,`› § ${sub.context}`,query);subBtn.appendChild(sh);
          }
          if(sub.snippet){
            const ss=document.createElement("span");ss.className="search-subitem-snippet";
            appendSearchHighlight(ss,sub.snippet,query);subBtn.appendChild(ss);
          }
          subBtn.onclick=()=>revealSearchMatch({...match,element:sub.element});
          sublist.appendChild(subBtn);
        }
        card.appendChild(sublist);
      }
      if(match.moreCount>0){
        const foot=document.createElement("div");foot.className="search-more-foot";
        foot.textContent=t("moreMatches",match.moreCount);
        card.appendChild(foot);
      }
      groupResults.appendChild(card);
    }
  }
  results.scrollTop=scrollTop;
}
let searchTimer;
function scheduleSearch(){
  clearTimeout(searchTimer);
  const query=document.getElementById("searchInput").value,results=document.getElementById("searchResults");
  results.scrollTop=0;document.getElementById("searchClear").hidden=!query;
  if(!normalizeSearch(query)){renderSearch();return;}
  results.replaceChildren();results.setAttribute("aria-busy","true");document.getElementById("searchCount").textContent=t("searching");
  for(let i=0;i<3;i++){const skeleton=document.createElement("div");skeleton.className="search-skeleton";skeleton.setAttribute("aria-hidden","true");results.appendChild(skeleton);}
  searchTimer=setTimeout(renderSearch,280);
}
document.getElementById("searchPage").addEventListener("change",scheduleSearch);
document.getElementById("searchInput").addEventListener("input",scheduleSearch);
document.getElementById("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();renderSearch();document.querySelector(".search-result")?.click();}});
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&(e.key.toLowerCase()==="f"||e.key.toLowerCase()==="k")){e.preventDefault();openSearch();}
  if(e.key==="Escape"&&!document.getElementById("searchPanel").hidden){e.preventDefault();closeSearch();}
});


export { renderSearch, openSearch, closeSearch, clearSearch, toggleSearchPanel, revealSearchMatch };
