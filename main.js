const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    // Opcional: si tienes un ícono, asegúrate de que esté en la carpeta public
    // icon: path.join(__dirname, 'dist/icon.png') 
  });

  const startUrl = url.format({
    pathname: path.join(__dirname, 'dist/index.html'),
    protocol: 'file:',
    slashes: true
  });

  mainWindow.loadURL(startUrl);

  // Puedes descomentar esta línea si necesitas depurar la aplicación compilada
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  // --- CORRECCIÓN AÑADIDA AQUÍ ---
  // Esta línea previene errores de renderizado y de interacción (clics) en Windows.
  //app.disableHardwareAcceleration();

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});