let currentTab = 'generator';
let genMode = 'qr';
let html5QrCode = null;

document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  generateCode();
  loadHistory();
});

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function switchTab(tabName) {
  if (currentTab === tabName) return;
  currentTab = tabName;

  const scannerScreen = document.getElementById('scanner-screen');
  const generatorScreen = document.getElementById('generator-screen');
  const historyScreen = document.getElementById('history-screen');
  const headerTitle = document.getElementById('header-title');

  document.querySelectorAll('.dock-tab').forEach(t => t.classList.remove('active'));

  scannerScreen.classList.remove('active');
  generatorScreen.classList.remove('active');
  historyScreen.classList.remove('active');

  if (tabName === 'scanner') {
    scannerScreen.classList.add('active');
    headerTitle.innerText = 'QR Scanner';
    startScanner();
  } else if (tabName === 'history') {
    historyScreen.classList.add('active');
    headerTitle.innerText = 'Code History';
    document.getElementById('tab-history').classList.add('active');
    stopScanner();
    loadHistory();
  } else {
    generatorScreen.classList.add('active');
    headerTitle.innerText = 'QR & Barcode Studio';
    document.getElementById('tab-generator').classList.add('active');
    stopScanner();
    generateCode();
  }
  lucide.createIcons();
}

function toggleMainScreen() {
  switchTab(currentTab === 'scanner' ? 'generator' : 'scanner');
}

function setGenMode(mode) {
  genMode = mode;
  document.querySelectorAll('.type-switcher .type-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  document.getElementById('form-qr').style.display = mode === 'qr' ? 'block' : 'none';
  document.getElementById('form-wifi').style.display = mode === 'wifi' ? 'block' : 'none';
  document.getElementById('form-barcode').style.display = mode === 'barcode' ? 'block' : 'none';
  generateCode();
}

function generateCode() {
  const previewBox = document.getElementById('generator-preview-box');
  previewBox.innerHTML = '';
  const darkColor = document.getElementById('code-color').value;
  const lightColor = document.getElementById('bg-color').value;
  previewBox.style.backgroundColor = lightColor;

  let codeData = '';

  if (genMode === 'qr') {
    codeData = document.getElementById('qr-input-text').value.trim() || "https://example.com";
    new QRCode(previewBox, {
      text: codeData,
      width: 170,
      height: 170,
      colorDark: darkColor,
      colorLight: lightColor,
      correctLevel: QRCode.CorrectLevel.H
    });
  } else if (genMode === 'wifi') {
    const ssid = document.getElementById('wifi-ssid').value.trim() || "MyWiFi";
    const pass = document.getElementById('wifi-pass').value.trim() || "";
    const type = document.getElementById('wifi-type').value;
    codeData = `WIFI:T:${type};S:${ssid};P:${pass};;`;
    
    new QRCode(previewBox, {
      text: codeData,
      width: 170,
      height: 170,
      colorDark: darkColor,
      colorLight: lightColor,
      correctLevel: QRCode.CorrectLevel.H
    });
  } else if (genMode === 'barcode') {
    codeData = document.getElementById('barcode-input-text').value.trim() || "123456789";
    const svgElem = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgElem.id = "dynamic-barcode";
    previewBox.appendChild(svgElem);
    try {
      JsBarcode("#dynamic-barcode", codeData, {
        format: "CODE128",
        lineColor: darkColor,
        background: lightColor,
        width: 2,
        height: 90,
        displayValue: true
      });
    } catch (e) {
      JsBarcode("#dynamic-barcode", "123456", {
        format: "CODE128",
        lineColor: darkColor,
        background: lightColor,
        width: 2,
        height: 90,
        displayValue: true
      });
    }
  }

  saveToHistory(codeData, genMode.toUpperCase());
}

function saveToHistory(data, type) {
  if (!data) return;
  let history = JSON.parse(localStorage.getItem('studio_history') || '[]');
  if (history.length > 0 && history[0].data === data) return;

  history.unshift({
    data: data,
    type: type,
    date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  });

  if (history.length > 30) history.pop();
  localStorage.setItem('studio_history', JSON.stringify(history));
}

function loadHistory() {
  const container = document.getElementById('history-container');
  const history = JSON.parse(localStorage.getItem('studio_history') || '[]');

  if (history.length === 0) {
    container.innerHTML = `<div class="empty-history">No scan or generated history yet.</div>`;
    return;
  }

  container.innerHTML = history.map((item) => `
    <div class="history-item">
      <div class="history-info">
        <div class="history-text" title="${item.data}">${item.data}</div>
        <div class="history-meta">${item.type} • ${item.date}</div>
      </div>
      <button class="icon-btn" style="width: 36px; height: 36px; min-width: 36px;" onclick="navigator.clipboard.writeText('${item.data.replace(/'/g, "\\'")}'); showToast('Copied to clipboard!')" title="Copy">
        <i data-lucide="copy" style="width: 15px; height: 15px;"></i>
      </button>
    </div>
  `).join('');
  lucide.createIcons();
}

function clearHistory() {
  localStorage.removeItem('studio_history');
  loadHistory();
  showToast('History log cleared');
}

function startScanner() {
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode("interactive-reader");
  }
  if (html5QrCode.isScanning) return;
  
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 200, height: 200 } },
    (decodedText) => {
      document.getElementById('scan-result-card').style.display = 'block';
      document.getElementById('scanned-text-output').innerText = decodedText;
      saveToHistory(decodedText, 'SCANNED');
      showToast('Code Scanned Successfully!');
    },
    (errorMessage) => {}
  ).catch(err => {
    console.log("Camera error:", err);
  });
}

async function stopScanner() {
  if (html5QrCode && html5QrCode.isScanning) {
    try {
      await html5QrCode.stop();
    } catch (err) {}
  }
}

async function scanImageFile(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];

  if (html5QrCode && html5QrCode.isScanning) {
    try {
      await html5QrCode.stop();
    } catch (e) {}
  }

  const fileScanner = new Html5Qrcode("interactive-reader");
  fileScanner.scanFile(file, true)
    .then(decodedText => {
      document.getElementById('scan-result-card').style.display = 'block';
      document.getElementById('scanned-text-output').innerText = decodedText;
      saveToHistory(decodedText, 'SCREENSHOT SCAN');
      showToast('Image Code Decoded!');
      input.value = '';
    })
    .catch(err => {
      console.error(err);
      showToast('No valid code found in image');
      input.value = '';
    });
}

function copyCodeData() {
  let val = "";
  if (genMode === 'qr') val = document.getElementById('qr-input-text').value;
  else if (genMode === 'wifi') {
    const ssid = document.getElementById('wifi-ssid').value;
    const pass = document.getElementById('wifi-pass').value;
    val = `WIFI:SSID:${ssid};Pass:${pass};`;
  } else val = document.getElementById('barcode-input-text').value;

  navigator.clipboard.writeText(val).then(() => showToast('Data copied!'));
}

function copyScannedData() {
  const text = document.getElementById('scanned-text-output').innerText;
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
}

function downloadCode() {
  const previewBox = document.getElementById('generator-preview-box');
  const img = previewBox.querySelector('img');
  const canvas = previewBox.querySelector('canvas');
  const svg = previewBox.querySelector('svg');

  let link = document.createElement('a');
  link.download = `code-${Date.now()}.png`;

  if (img && img.src) {
    link.href = img.src;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (canvas) {
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (svg) {
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
    link.href = URL.createObjectURL(svgBlob);
    link.download = `code-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  showToast('Saved PNG image!');
}