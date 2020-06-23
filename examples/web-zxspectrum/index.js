import('./pkg').then(rust_module => {
  // for debugging purposes
  rust_module.setPanicHook();

  function $id(el) {
    return document.getElementById(el);
  }

  const spectrum = new rust_module.ZxSpectrumEmu(0.11, "ZX Spectrum +2B"),
        canvas = $id("main-screen"),
        mainContainer = $id("main-container"),
        controls = $id("controls"),
        tapeName = $id("tape-name"),
        tapChunks = $id("tap-chunks"),
        tapeProgress = $id("tape-progress"),
        tapPlay = $id("tap-play"),
        tapRecord = $id("tap-record"),
        fileBrowser = $id("files"),
        speedControl = $id("speed-control"),
        speedCurrent = $id("speed-current");

  var paused = false,
      renderedImage = new ImageData(1, 1);

  Spectrusty
  // auto show/hide control panel 
  .bind("main-screen", "click", hidePanel
  ).bind("menu-title", "click", hidePanel
  ).bind("menu-hover", "mouseover", showPanel
  // other controls
  ).bind("pause-resume", "click", (ev) => {
    const element = ev.target;
    paused = (element.value == "Pause");
    element.disabled = true;
    (paused ? spectrum.pauseAudio() : spectrum.resumeAudio())
    .then(() => {
      element.value = paused ? "Resume" : "Pause";
      element.disabled = false;
    })
  }
  ).bind("turbo",
    (ev) => spectrum.turbo = ev.target.checked,
    (el) => el.checked = spectrum.turbo
  ).bind("sound-gain", "input",
    (ev) => spectrum.gain = ev.target.value,
    (el) => el.value = spectrum.gain
  ).bind("models",
    (ev) => {
      spectrum.selectModel(ev.target.value);
      Spectrusty.update();
    },
    (el) => el.value = spectrum.model
  ).bind("borders",
    (ev) => spectrum.selectBorderSize(ev.target.value),
    (el) => el.value = spectrum.borderSize
  ).bind("interlace",
    (ev) => spectrum.interlace = ev.target.selectedIndex,
    (el) => el.selectedIndex = spectrum.interlace
  ).bind("joysticks",
    (ev) => spectrum.selectJoystick(ev.target.selectedIndex - 1),
    (el) => el.value = spectrum.joystick
  ).bind("reset-hard", "click", (ev) => spectrum.reset(true)
  ).bind("reset-soft", "click", (ev) => spectrum.reset(false)
  ).bind("reset-power", "click", (ev) => spectrum.powerCycle()
  ).bind("trigger-nmi", "click", (ev) => spectrum.triggerNmi()
  ).bind("ay-fuller-box", attachDevice, hasDevice
  ).bind("ay-melodik", attachDevice, hasDevice
  ).bind("audible-tape",
    (ev) => spectrum.audibleTape = ev.target.checked,
    (el) => el.checked = spectrum.audibleTape
  ).bind("fast-tape",
    (ev) => spectrum.fastTape = ev.target.checked,
    (el) => el.checked = spectrum.fastTape
  ).bind("files", "input", (ev) => loadFile(ev.target.files)
  ).bind("tap-play", "click", (ev) => updateTapeButtons(spectrum.togglePlayTape())
  ).bind("tap-record", "click", (ev) => updateTapeButtons(spectrum.toggleRecordTape())
  ).bind("tap-download", "click", (ev) => downloadTapFile()
  ).bind("tap-chunks", "input",
    (ev) => {
      spectrum.selectTapeChunk(ev.target.selectedIndex);
      updateTapeProgress();
    },
    (el) => {
      populateTapeInfo(spectrum.tapeInfo());
      updateTapeButtons(spectrum.tapeStatus());
    }
  ).bind("tap-eject", "click", (ev) => {
    spectrum.ejectTape();
    fileBrowser.value = tapeName.value = "";
    populateTapeInfo(spectrum.tapeInfo());
    updateTapeButtons(spectrum.tapeStatus());
  }
  ).bind("ay-amps",
    (ev) => spectrum.ayAmps = ev.target.value,
    (el) => el.value = spectrum.ayAmps
  ).bind("ay-channels",
    (ev) => spectrum.ayChannels = ev.target.value,
    (el) => el.value = spectrum.ayChannels
  ).bind("speed-reset", "click", resetSpeed
  ).bind("speed-control", "input",
    (ev) => setSpeed(ev.target.value),
    (el) => {
      var factor = spectrum.cpuRateFactor;
      el.value = cpuSlider(factor);
      speedCurrent.value = "x" + factor.toFixed(2);
    }
  ).bind("keyboard-issue",
    (ev) => spectrum.keyboardIssue = ev.target.value,
    (el) => {
      el.value = spectrum.keyboardIssue;
      el.disabled = !el.value;
    }
  ).bind("save-z80v3", "click", (ev) => downloadZ80Snap(3)
  ).bind("save-z80v2", "click", (ev) => downloadZ80Snap(2)
  ).bind("save-z80v1", "click", (ev) => downloadZ80Snap(1)
  ).bind("save-sna", "click", (ev) => downloadSNASnap()
  ).bind("save-snapshot", "click", (ev) => downloadJSONSnap());

  tapeName.value = "";
  // const ctx = canvas.getContext('bitmaprenderer');
  const ctx = canvas.getContext('2d', {alpha: false, desynchronized: true});
  ctx.imageSmoothingEnabled = false;
  document.addEventListener("keydown", (ev) => spectrum.updateStateFromKeyEvent(ev, true), false);
  document.addEventListener("keyup", (ev) => spectrum.updateStateFromKeyEvent(ev, false), false);

  run(true);

  function showPanel() {
    mainContainer.classList.add("show-panel")
  }

  function hidePanel() {
    mainContainer.classList.remove("show-panel")
  }

  function render(time) {
    if (paused) return Promise.resolve(false);
    let changed = spectrum.runFramesWithAudio(time);
    if (changed == null) {
      return Promise.resolve(false);
    }
    else {
      let {width, height, data} = spectrum.renderVideo();
      if (width !== renderedImage.width || height !== renderedImage.height) {
        updatedPixelSize(width, height)
      }
      renderedImage.data.set(data); // need to copy data first from wasm memory to asynchronously read it
      return createImageBitmap(renderedImage)
        //, {resizeWidth: canvas.width, resizeHeight: canvas.height, resizeQuality: "pixelated"})
      .then(bitmap => {
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        // ctx.transferFromImageBitmap(bitmap);
        return changed
      });
    }
  }

  function asyncRender() {
    render(performance.now()).then(run)
  }

  function syncRender(time) {
    render(time).then(run)
  }

  function run(changed) {
    if (changed) {
      Spectrusty.update();
    }

    if (mainContainer.classList.contains("show-panel") && tapRecord.disabled) {
      updateTapeProgress();
    }

    if (spectrum.turbo) {
      setTimeout(asyncRender, 0)
    }
    else {
      requestAnimationFrame(syncRender);
    }
  }

  function updatedPixelSize(width, height) {
    let [cw, ch] = spectrum.canvasSize;
    console.log("screen: %s x %s -> %s x %s", width, height, cw, ch);
    canvas.width = cw;
    canvas.height = ch;
    renderedImage = new ImageData(width, height);
  }

  function cpuFactor(x) {
    return (x >= 0) ? 1 + x/100
                    : 1 / (1 - x/100)
  }

  function cpuSlider(y) {
    return (y >= 1) ? (y - 1)*100
                    : (1 - 1 / y)*100
  }

  function attachDevice(ev) {
    if (ev.target.checked) {
      spectrum.attachDevice(ev.target.name)
    }
    else {
      spectrum.detachDevice(ev.target.name)
    }
  }

  function hasDevice(checkbox) {
    checkbox.checked = spectrum.hasDevice(checkbox.name);
  }

  function updateTapeButtons(tapStatus) {
    switch(tapStatus) {
      case 0:
        tapPlay.value = "Play";
        tapPlay.disabled = false;
        tapRecord.value = "Record";
        tapRecord.disabled = false;
        tapChunks.disabled = false;
        break;
      case 1:
        tapPlay.value = "Pause";
        tapPlay.disabled = false;
        tapRecord.value = "Record";
        tapRecord.disabled = true;
        tapChunks.disabled = true;
        break;
      case 2:
        tapPlay.value = "Play";
        tapPlay.disabled = true;
        tapRecord.value = "Stop";
        tapRecord.disabled = false;
        tapChunks.disabled = true;
    }
    updateTapeProgress();
  }

  function loadFile(files, n) {
    n |= 0;
    if (n < files.length) {
      let file = files.item(n),
          name = file.name,
          ext = name.toLowerCase().substring(name.lastIndexOf(".")),
          reader = new FileReader();
      reader.onloadend = function() {
        var data = reader.result;
        if (typeof data !== 'string') {
          data = new Uint8Array(data);
        }
        try {
          switch(ext) {
            case '.tap':
              tapeName.value = name;
              populateTapeInfo(n == 0 ? spectrum.insertTape(data) : spectrum.appendTape(data));
              setTimeout(() => loadFile(files, n + 1), 0);
              break;
            case '.scr':
              spectrum.showScr(data);
              break;
            case '.sna':
              spectrum.loadSna(data);
              tapeName.value = "";
              break;
            case '.z80':
              spectrum.loadZ80(data);
              tapeName.value = "";
              break;
            case '.json':
              spectrum.parseJSON(data);
              tapeName.value = "";
              break;
            default:
              alert("Unsupported file type.");
          }
        } catch(e) {
          alert(e);
        }
        Spectrusty.update();
      };
      if (ext === '.json') {
        reader.readAsText(file);
      }
      else {
        reader.readAsArrayBuffer(file);
      }
    }
  }

  function populateTapeInfo(infoList) {
    var opt = 0, options = tapChunks.options;
    for (let {info, size} of infoList) {
      let option = options.item(opt++);
      if (option == null) {
        option = document.createElement("option");
        tapChunks.appendChild(option);
      }
      option.value = size;
      option.text = info;
    }
    options.length = opt;
    updateTapeProgress();
  }

  function updateTapeProgress() {
    var [index, left] = spectrum.tapeProgress();
    var selectedIndex = tapChunks.selectedIndex;
    tapChunks.selectedIndex = index;
    var option = tapChunks.selectedOptions.item(0);
    if (option) {
      let size = option.value|0;
      tapeProgress.value = size - left;
      tapeProgress.max = size;
    }
    else {
      tapeProgress.value = 0;
      tapeProgress.max = 0;
    }
  }

  function resetSpeed() {
    speedControl.value = 0;
    setSpeed(0);
  }

  function setSpeed(value) {
    let factor = cpuFactor(value);
    speedCurrent.value = "x" + factor.toFixed(2);
    spectrum.setCpuRateFactor(factor);
  }

  function downloadTapFile() {
    var data = spectrum.tapeData();
    if (!data) return;
    downloadFile(data, "octet/stream", tapeName.value || "new tape.tap");
  }

  function downloadJSONSnap() {
    var json = spectrum.toJSON();
    downloadFile(json, "json", "spectrusty.json");
  }

  function downloadSNASnap() {
    var data = spectrum.saveSNA();
    downloadFile(data, "octet/stream", "spectrusty.sna");
  }

  function downloadZ80Snap(ver) {
    var data = spectrum.saveZ80(ver);
    downloadFile(data, "octet/stream", "spectrusty.z80");
  }

  const saver = document.createElement("a");
  document.body.appendChild(saver);
  saver.style = "display: none";

  function downloadFile(data, mime, name) {
    var blob = new Blob([data], {type: mime})
    var url = URL.createObjectURL(blob);
    saver.href = url;
    saver.download = name;
    saver.click();
    URL.revokeObjectURL(url);
  }
})
.catch(console.error);
