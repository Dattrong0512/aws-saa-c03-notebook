function normalizeSearch(text){return String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[đĐ]/g,"d").toLowerCase().replace(/\s+/g," ").trim();}
function hasAlphaNum(text){return /[a-z0-9]/i.test(text);}
function hasWordBoundary(normText,term){
  if(!term||!normText.includes(term))return false;
  const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(normText);
}
function searchRanges(text,query){
  const needle=normalizeSearch(query);
  if(!needle||!hasAlphaNum(needle)||!normalizeSearch(text).includes(needle))return [];
  let normalized="",offsets=[];
  for(let i=0;i<text.length;){
    const character=String.fromCodePoint(text.codePointAt(i)),end=i+character.length;
    const value=/\s/.test(character)?" ":normalizeSearch(character);
    if(value===" "&&(!normalized||normalized.endsWith(" "))){if(offsets.length)offsets.at(-1)[1]=end;}
    else if(value){normalized+=value;for(let j=0;j<value.length;j++)offsets.push([i,end]);}
    else if(offsets.length)offsets.at(-1)[1]=end;
    i=end;
  }
  const ranges=[];
  for(let at=normalized.indexOf(needle);at>=0;at=normalized.indexOf(needle,at+needle.length))ranges.push([offsets[at][0],offsets[at+needle.length-1][1]]);
  return ranges;
}
function isBoundaryAt(text,start,end){
  const prev=start>0?normalizeSearch(text[start-1]):"";
  const next=end<text.length?normalizeSearch(text[end]):"";
  return (!prev||!/[a-z0-9]/.test(prev))&&(!next||!/[a-z0-9]/.test(next));
}
function highlightRanges(text,query){
  const direct=searchRanges(text,query);
  if(direct.length)return direct;
  const tokens=[...new Set(normalizeSearch(query).split(" ").filter(hasAlphaNum))];
  if(tokens.length<=1)return [];
  const raw=tokens.flatMap(tok=>searchRanges(text,tok).filter(([s,e])=>isBoundaryAt(text,s,e))).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const merged=[];
  for(const [s,e] of raw){
    if(merged.length&&s<=merged.at(-1)[1])merged.at(-1)[1]=Math.max(merged.at(-1)[1],e);
    else merged.push([s,e]);
  }
  return merged;
}
function trimPreview(text){
  const s=String(text||"").replace(/\s+/g," ").trim();
  if(s.length<=165)return s;
  const cut=s.indexOf(" ",155);
  return (cut>0?s.slice(0,cut):s.slice(0,165))+"…";
}
function searchExcerpt(text,query){
  const first=highlightRanges(text,query)[0]||searchRanges(text,query)[0];
  if(!first)return trimPreview(text);
  const before=Math.max(0,first[0]-45),after=Math.min(text.length,Math.max(before+170,first[1]+45));
  const start=before?Math.max(0,text.lastIndexOf(" ",before)+1):0,nextSpace=text.indexOf(" ",after),end=nextSpace<0?text.length:nextSpace;
  return (start?"…":"")+text.slice(start,end)+(end<text.length?"…":"");
}
function findStudyMatches(query,sources,scopeHash=""){
  const needle=normalizeSearch(query);
  if(!needle||!hasAlphaNum(needle))return [];
  const tokens=[...new Set(needle.split(" ").filter(hasAlphaNum))];
  const matches=[];
  for(const source of sources){
    if(scopeHash&&source.hash!==scopeHash)continue;
    for(const block of source.blocks){
      const title=normalizeSearch(block.title);
      const titlePhraseCount=searchRanges(block.title,query).length;
      const parts=block.parts||[{text:block.text||"",element:block.element}];
      const phraseParts=parts.map((part,idx)=>({...part,idx,norm:normalizeSearch(part.text),count:searchRanges(part.text,query).length})).filter(part=>part.count);
      const phraseCount=titlePhraseCount+phraseParts.reduce((total,part)=>total+part.count,0);

      if(phraseCount){
        const titleBoundary=hasWordBoundary(title,needle);
        const scoredParts=phraseParts.map(p=>{
          const boundary=hasWordBoundary(p.norm,needle)?0:0.4;
          const tier=(p.isHeading?1:2)+boundary;
          return {...p,tier};
        }).sort((a,b)=>a.tier-b.tier||a.idx-b.idx);
        const best=scoredParts[0];
        let rank;
        if(titlePhraseCount&&titleBoundary){
          if(title===needle)rank=0;
          else if(title.replace(/^(aws|amazon) /,"")===needle)rank=1;
          else rank=2;
        }else if(best?.isHeading&&hasWordBoundary(best.norm,needle)){
          rank=3;
        }else if(best&&hasWordBoundary(best.norm,needle)){
          rank=4;
        }else if(titlePhraseCount){
          rank=4.4;
        }else if(best?.isHeading){
          rank=4.6;
        }else{
          rank=4.8;
        }
        const items=[];
        const seenCtx=new Set();
        for(const p of scoredParts){
          const key=p.context||p.text.slice(0,50);
          if(seenCtx.has(key))continue;
          seenCtx.add(key);
          const bodyPreview=p.isHeading?trimPreview(p.preview||""):searchExcerpt(p.text,query);
          items.push({element:p.element,context:p.context||"",snippet:bodyPreview,count:p.count,isHeading:Boolean(p.isHeading)});
          if(items.length>=3)break;
        }
        const primary=phraseParts[0];
        const chosen=best&&best.tier<phraseParts[0]?.tier+0.01?best:primary;
        const chosenSnippet=chosen?(chosen.isHeading?trimPreview(chosen.preview||block.preview||""):searchExcerpt(chosen.text,query)):trimPreview(block.preview||"");
        matches.push({...block,hash:source.hash,page:source.name,count:phraseCount,rank,
          element:chosen?.element||block.element,
          context:chosen?.context||"",
          snippet:chosenSnippet,
          items,moreCount:Math.max(0,phraseParts.length-items.length)});
        continue;
      }

      if(tokens.length>1){
        const fullNorm=(title+" "+parts.map(p=>normalizeSearch(p.text)).join(" ")).trim();
        if(!tokens.every(tok=>hasWordBoundary(fullNorm,tok)))continue;
        const titleTokenHits=tokens.filter(tok=>hasWordBoundary(title,tok)).length;
        const tokenParts=parts.map((part,idx)=>{
          const norm=normalizeSearch(part.text+" "+(part.context||""));
          const hitTokens=tokens.filter(tok=>hasWordBoundary(norm,tok));
          const rawHits=tokens.reduce((sum,tok)=>sum+searchRanges(part.text,tok).filter(([s,e])=>isBoundaryAt(part.text,s,e)).length,0);
          return {...part,idx,hitCount:hitTokens.length,count:rawHits};
        }).filter(p=>p.count>0).sort((a,b)=>b.hitCount-a.hitCount||(a.isHeading===b.isHeading?0:a.isHeading?-1:1)||a.idx-b.idx);

        const best=tokenParts[0];
        const allInTitle=titleTokenHits===tokens.length;
        const allInSingle=best&&tokens.every(tok=>hasWordBoundary(normalizeSearch(block.title+" "+(best.context||"")+" "+best.text),tok));
        const rank=allInTitle?2.8:(allInSingle?5:5.6);
        const totalHits=titleTokenHits+tokenParts.reduce((s,p)=>s+p.count,0);
        const items=[];
        const seenCtx=new Set();
        for(const p of tokenParts){
          const key=p.context||p.text.slice(0,50);
          if(seenCtx.has(key))continue;
          seenCtx.add(key);
          const bodyPreview=p.isHeading?trimPreview(p.preview||""):searchExcerpt(p.text,query);
          items.push({element:p.element,context:p.context||"",snippet:bodyPreview,count:p.count,isHeading:Boolean(p.isHeading)});
          if(items.length>=3)break;
        }
        const bestSnippet=best?(best.isHeading?trimPreview(best.preview||block.preview||""):searchExcerpt(best.text,query)):trimPreview(block.preview||"");
        matches.push({...block,hash:source.hash,page:source.name,count:Math.max(1,totalHits),rank,
          element:best?.element||block.element,
          context:best?.context||"",
          snippet:bestSnippet,
          items,moreCount:Math.max(0,tokenParts.length-items.length)});
      }
    }
  }
  return matches.sort((a,b)=>a.rank-b.rank||(a.rank<3?a.title.length-b.title.length:b.count-a.count));
}

export { normalizeSearch, hasAlphaNum, findStudyMatches, highlightRanges, searchRanges, searchExcerpt };
