// Runs inside the actual Electron renderer, including packaged builds.
export async function checkDesktop(window) {
  return window.webContents.executeJavaScript(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const assert = (value, message) => { if (!value) throw Error(message); };
    const errors = [];
    addEventListener('error', e => errors.push(e.message));
    addEventListener('unhandledrejection', e => errors.push(String(e.reason)));
    document.querySelector('#boot-skip').click();
    document.querySelector('.example[data-i="0"]').click();
    for (let i = 0; i < 100 && !document.querySelector('#score').textContent.includes('/ 100'); i++) await wait(100);
    assert(document.querySelector('#score').textContent.includes('/ 100'), 'Model did not produce a score');
    assert(document.querySelector('#steps').textContent === '8 / 8', 'Propagation incomplete');
    const tabs = ['token', 'scenario', 'network', 'radar'];
    for (const name of tabs) {
      document.getElementById(name + '-tab').click();
      await wait(500);
      const panel = document.getElementById(name + '-panel');
      assert(!panel.hidden && panel.getBoundingClientRect().height > 0, name + ' panel not rendered');
      assert(document.getElementById(name + '-tab').getAttribute('aria-selected') === 'true', name + ' navigation failed');
      assert(panel.textContent.trim().length > 30, name + ' panel empty');
      if (name === 'token') assert(document.querySelector('#network').width > 0, 'Brain canvas missing');
    }
    const {tokenAvatar} = await import('/token-media.mjs');
    const token={address:'0x'+'1'.repeat(40),symbol:'IMG',imageUrl:'https://catbrain-smoke.invalid/valid.png'};
    const badge=tokenAvatar(token,true);
    document.querySelector('#radar-portrait').append(badge);
    for(let i=0;i<50&&!badge.querySelector('img')?.naturalWidth;i++)await wait(100);
    assert(badge.querySelector('img')?.naturalWidth>0,'Provider image did not render');
    assert(tokenAvatar(token,true)===badge,'Image recreated on every refresh');
    const broken=tokenAvatar({...token,address:'0x'+'2'.repeat(40),imageUrl:'https://catbrain-smoke.invalid/broken.png'});
    document.querySelector('#radar-portrait').append(broken);
    for(let i=0;i<50&&broken.title!=='Token image unavailable';i++)await wait(100);
    assert(broken.title==='Token image unavailable'&&broken.textContent==='IM','Broken image fallback failed');
    badge.remove();broken.remove();
    assert(document.querySelectorAll('#radar-rows .token-avatar').length>0,'Radar token portraits missing');
    const rows=document.querySelectorAll('#radar-rows tr');
    assert(rows.length>1,'Radar token rows missing');
    rows[1].querySelector('button').click();
    assert(document.querySelectorAll('#radar-rows tr.selected').length===1,'Selected token is ambiguous');
    assert(document.querySelector('#radar-chain').textContent.includes('Contract: 0x'),'Token identity missing');
    assert(!errors.length, errors.join('; '));
    return {tabs, score: document.querySelector('#score').textContent, propagation: '8 / 8'};
  })()`);
}
