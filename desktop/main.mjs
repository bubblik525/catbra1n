import {switchedModeArgs} from './launch-options.mjs';
import { app, BrowserWindow, Menu, dialog, shell } from 'electron';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFile } from 'node:fs/promises';
import { startCompanion } from '../src/local-server.mjs';
app.setName('BRAIN CAT');
const recording = process.argv.includes('--record-network');
const demo = recording || process.argv.includes('--demo');
let window,
  server,
  quitting = false;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    }
  });
  app.on('before-quit', (event) => {
    if (quitting || !server) return;
    event.preventDefault();
    quitting = true;
    server.close().finally(() => app.quit());
  });
  app.on('window-all-closed', () => app.quit());
  app.whenReady().then(async () => {
    try {
      server = await startCompanion({
        demo,
        dataDir: join(app.getPath('userData'), recording ? 'profile-recording' : 'profile'),
      });
      window = new BrowserWindow({
        width: 1480,
        height: 980,
        minWidth: 820,
        minHeight: 620,
        title: 'BRAIN CAT',
        backgroundColor: '#0a0e12',
        show: false,
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: true,
          spellcheck: false,
        },
      });
      const safeExternal = async (url) => {
        try {
          const u = new URL(url);
          if (u.protocol !== 'https:' || u.username || u.password) return;
          const result = await dialog.showMessageBox(window, {
            type: 'question',
            message: 'Open external website?',
            detail: u.origin,
            buttons: ['Cancel', 'Open in browser'],
            defaultId: 0,
            cancelId: 0,
          });
          if (result.response === 1) await shell.openExternal(u.href);
        } catch {}
      };
      window.webContents.setWindowOpenHandler(({ url }) => {
        void safeExternal(url);
        return { action: 'deny' };
      });
      window.webContents.on('will-navigate', (event, url) => {
        if (new URL(url).origin !== server.origin) {
          event.preventDefault();
          void safeExternal(url);
        }
      });
      window.webContents.on('will-attach-webview', (event) =>
        event.preventDefault(),
      );
      window.webContents.session.setPermissionRequestHandler(
        (_wc, _permission, callback) => callback(false),
      );
      window.webContents.session.setPermissionCheckHandler(() => false);
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
          {
            label: 'File',
            submenu: [
              {
                label: demo ? 'Switch to live mode' : 'Explore demo mode',
                click: () => {
                  app.relaunch({
                    args: switchedModeArgs(process.argv.slice(1), demo),
                  });
                  app.quit();
                },
              },
              { type: 'separator' },
              {
                label: 'Open data folder',
                click: () =>
                  shell.openPath(join(app.getPath('userData'), 'profile')),
              },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
          { role: 'editMenu' },
          {
            label: 'View',
            submenu: [
              {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click: () => window.loadURL(server.url),
              },
              { role: 'resetZoom' },
              { role: 'zoomIn' },
              { role: 'zoomOut' },
              { role: 'togglefullscreen' },
            ],
          },
          {
            label: 'Help',
            submenu: [
              {
                label: 'About BRAIN CAT',
                click: () =>
                  dialog.showMessageBox(window, {
                    message: 'BRAIN CAT',
                    detail: `Version ${app.getVersion()}\n${demo ? 'Saved historical examples available' : 'Connect Bitquery in Data connection'}\nRead-only token research. Experimental trained readout. No trading or wallet signatures.`,
                  }),
              },
            ],
          },
        ]),
      );
      window.once('ready-to-show', () => window.show());
      await window.loadURL(recording ? server.url.replace('/#','/?record=network#') : server.url);
      if(recording)window.maximize();
      if (process.argv.includes('--smoke-test')) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const response = await fetch(server.origin + '/api/state', {
          headers: { 'X-Sheriff-Session': new URL(server.url).hash.slice(1) },
        });
        if (!response.ok) throw Error('Desktop API smoke test failed');
        const image = await window.webContents.capturePage();
        await writeFile(join(tmpdir(), 'sheriff-desktop-preview.png'), image.toPNG());
        console.log('DESKTOP_SMOKE_OK');
        app.quit();
      }
    } catch (error) {
      if (process.argv.includes('--smoke-test')) {
        console.error(error);
        if (server) await server.close();
        app.exit(1);
      } else dialog.showErrorBox('BRAIN CAT could not start', error.message);
      app.quit();
    }
  });
}
