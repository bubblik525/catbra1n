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
    assert(!errors.length, errors.join('; '));
    return {tabs, score: document.querySelector('#score').textContent, propagation: '8 / 8'};
  })()`);
}
