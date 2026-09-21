// Provider images only. Never interpret metadata as HTML or executable URLs.
export function tokenImageUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    if (!url.hostname.includes('.') || url.hostname.endsWith('.local') || url.hostname.endsWith('.localhost') || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':')) return null;
    if ([...url.searchParams.keys()].some(k=>/key|token|auth/i.test(k))) return null;
    return url.href;
  } catch { return null; }
}
const badges = new Map();
export function tokenAvatar(token, large=false) {
  const imageUrl=tokenImageUrl(token?.onchain?.imageUrl)||tokenImageUrl(token?.imageUrl);
  const label=token?.symbol && token.symbol!=='?' ? token.symbol : token?.name!=='Unresolved' ? token?.name : null;
  const initials=(label||'?').slice(0,2).toUpperCase();
  const key=[token?.address,large,imageUrl,initials].join('|');
  if(badges.has(key))return badges.get(key);
  const badge=document.createElement('span');
  badge.className='token-avatar'+(large?' token-avatar-large':'');
  badge.textContent=initials;
  badge.title=imageUrl?'Token image supplied by data provider':'No token image supplied';
  if(imageUrl){
    const img=document.createElement('img');
    img.alt=(label||'Token')+' logo';
    img.referrerPolicy='no-referrer';
    img.decoding='async';
    img.onload=()=>badge.replaceChildren(img);
    img.onerror=()=>{badge.textContent=initials;badge.title='Token image unavailable';};
    img.src=imageUrl;
  }
  if(badges.size>=500)badges.delete(badges.keys().next().value);
  badges.set(key,badge);
  return badge;
}
