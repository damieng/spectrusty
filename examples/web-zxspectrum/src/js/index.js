import { $id,
         $on,
         $off,
         onSwipe,
         UserInterface,
         cpuFactor,
         cpuSlider,
         dowloader,
         setupDevice,
         loadRemote,
         stateGuard,
         restoreState,
         parseRange,
         parsePoke,
         toHex,
         checkBrowserCapacity,
         Directions
       } from './utils';
import { UrlParameters } from './urlparams';

checkBrowserCapacity();

/* Tooltips */

$(() => {
  $('[title]').tooltip()
})

import('../../pkg').then(rust_module => {
  // for debugging purposes
  rust_module.setPanicHook();

  /* Scoped globals */

  const urlparams     = new UrlParameters(),
        spectrum      = new rust_module.ZxSpectrumEmu(0.11, urlparams.options.model || '+2B'),
        canvas        = $id("main-screen"),
        mainContainer = $id("main-container"),
        controls      = $id("controls"),
        tapeName      = $id("tape-name"),
        tapChunks     = $id("tap-chunks"),
        tapeProgress  = $id("tape-progress"),
        tapPlay       = $id("tap-play"),
        tapRecord     = $id("tap-record"),
        pauseButton   = $id("pause-resume"),
        fileBrowser   = $id("files"),
        speedControl  = $id("speed-control"),
        speedCurrent  = $id("speed-current"),
        introModal    = $id("intro-modal"),
        downloadFile  = dowloader(),
        saveState     = stateGuard(spectrum, urlparams);

  var paused = false,
      renderedImage = new ImageData(1, 1);

  /* GUI */

  const spectrusty = new UserInterface();

  /* bind UI with URI hash changes */

  spectrusty.onchange = (id) => {
    if (urlparams.updateFrom(spectrum, id)) {
      urlparams.updateLocation();
    }
  };

  $on(window, "hashchange", _ => {
    if (urlparams.hashChanged()) {
      loadFromUrlParams(false).then(() => spectrusty.update());
    }
  });

  spectrusty
  // auto show/hide control panel 
  .bind("main-screen", "click", hidePanel)
  .bind("menu-title", "click", hidePanel)
  .bind("menu-hover", "mouseover", showPanel)
  // other controls
  .bind("pause-resume", "click", togglePause)
  .bind("turbo",
    (ev) => spectrum.turbo = ev.target.checked,
    (el) => el.checked = spectrum.turbo
  ).bind("sound-gain", "input",
    (ev) => spectrum.gain = ev.target.value,
    (el) => el.value = spectrum.gain
  ).bind("models",
    (ev) => {
      spectrum.selectModel(ev.target.value);
      spectrusty.update();
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
  ).bind("reset-hard", "click", (ev) => spectrum.reset(true))
  .bind("reset-soft", "click", (ev) => spectrum.reset(false))
  .bind("reset-power", "click", (ev) => spectrum.powerCycle())
  .bind("trigger-nmi", "click", (ev) => spectrum.triggerNmi())
  .bind("ay-fuller-box", attachDevice, hasDevice)
  .bind("ay-melodik", attachDevice, hasDevice)
  .bind("kempston-mouse", attachDevice, hasDevice)
  .bind("audible-tape",
    (ev) => spectrum.audibleTape = ev.target.checked,
    (el) => el.checked = spectrum.audibleTape
  ).bind("fast-tape",
    (ev) => spectrum.fastTape = ev.target.checked,
    (el) => el.checked = spectrum.fastTape
  ).bind("instant-tape",
    (ev) => spectrum.instantTape = ev.target.checked,
    (el) => el.checked = spectrum.instantTape
  ).bind("files", "input", (ev) => {
    loadFile(ev.target.files);
    ev.target.value = '';
  })
  .bind("tap-play", "click", (ev) => updateTapeButtons(spectrum.togglePlayTape()))
  .bind("tap-record", "click", (ev) => updateTapeButtons(spectrum.toggleRecordTape()))
  .bind("tap-download", "click", (ev) => downloadTapFile())
  .bind("tap-chunks", "input",
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
  })
  .bind("ay-amps",
    (ev) => spectrum.ayAmps = ev.target.value,
    (el) => el.value = spectrum.ayAmps
  ).bind("ay-channels",
    (ev) => spectrum.ayChannels = ev.target.value,
    (el) => el.value = spectrum.ayChannels
  ).bind("speed-reset", "click", resetSpeed)
  .bind("speed-control", "input",
    (ev) => setSpeed(ev.target.value),
    (el) => {
      var factor = spectrum.cpuRateFactor;
      el.value = cpuSlider(factor);
      speedCurrent.value = "x" + factor.toFixed(2);
    }
  )
  .bind("keyboard-issue",
    (ev) => spectrum.keyboardIssue = ev.target.value,
    (el) => {
      el.value = spectrum.keyboardIssue;
      el.disabled = !el.value;
    }
  )
  .bind("save-z80v3", "click", (ev) => downloadZ80Snap(3))
  .bind("save-z80v2", "click", (ev) => downloadZ80Snap(2))
  .bind("save-z80v1", "click", (ev) => downloadZ80Snap(1))
  .bind("save-sna", "click", (ev) => downloadSNASnap())
  .bind("save-snapshot", "click", (ev) => downloadJSONSnap())
  .bind("poke-memory", "click", (ev) => {
    var res = prompt("POKE");
    if (res) {
      res = parsePoke(res)
      if (res) {
        let [address, value] = res;
        spectrum.poke(address, value);
      }
      else {
        alert("Please provide address and the value in a valid format.\n" +
          "E.g.:\n0x4000, 0xff\n0x4000=0xff\n16384, 255\n16384=255");
      }
    }
  })
  .bind("peek-memory", "click", (ev) => {
    var res = prompt("PEEK");
    if (res) {
      let address = parseInt(res);
      if (isFinite(address)) {
        let val = spectrum.peek(res);
        alert("PEEK " + res +": " + val + " (0x" + val.toString(16) + ")");
      }
      else {
        alert("Please provide a single address in the range: [0, 65535] or [0x0, 0xFFFF]");
      }
    }
  })
  .bind("dump-memory", "click", 
    (ev) => dumpMemory("Dump memory range at:", "octet/stream", "memory", "bin",
                       (start, end) => spectrum.dump(start, end))
  )
  .bind("disasm-memory", "click", 
    (ev) => dumpMemory("Disassemble memory range at:", "text/plain", "z80asm", "txt",
                       (start, end) => spectrum.disassemble(start, end))
  );

  /* Closing modal resumes emulation */

  $(introModal).on("hide.bs.modal", ev => {
    if (paused) {
      togglePause();
    }
  });

  /* Keyboard */

  $on(document, "keydown", (ev) => {
    if (ev.repeat) {
      return;
    }

    switch (ev.code) {
      case "F1": case "F2": case "F3": case "F4":
      case "F5": case "F6": case "F7": case "F8":
      case "F9": case "F10": case "F11": case "F12":
        break;
      case "Pause":
        togglePause();
        break;
      case "Escape":
        togglePanel();
        break;
      default: spectrum.updateStateFromKeyEvent(ev, true)
    }
  });

  $on(document, "keyup", ev => spectrum.updateStateFromKeyEvent(ev, false));

  /* Mouse handlers */

  $on(canvas, "click", setupMouseLock);

  const handleMouseDown = handleMouseButtonFactory(true);
  const handleMouseUp = handleMouseButtonFactory(false);
  $on(document, "pointerlockchange", ev => {
    const isLocked = document.pointerLockElement === canvas;
    const setupEvent = (isLocked ? $on : $off);
    const unsetupEvent = (isLocked ? $off : $on);
    setupEvent(canvas, "mousemove", handleMouseMove);
    setupEvent(canvas, "mousedown", handleMouseDown);
    setupEvent(canvas, "mouseup", handleMouseUp);
    unsetupEvent(canvas, "click", setupMouseLock);
  });

  function setupMouseLock(ev) {
    if (spectrum.hasDevice("Kempston Mouse")) {
      canvas.requestPointerLock();
    }
  }

  function handleMouseMove(ev) {
    spectrum.moveMouse(ev.movementX, ev.movementY);
  }

  function handleMouseButtonFactory(pressed) {
    return ev => spectrum.updateMouseButton(ev.button, pressed);
  }

  /* Auto save and restore state */

  $on(window, "pagehide", saveState);
  $on(window, "unload", saveState);
  $on(window, "visibilitychange", ev => {
    if (document.hidden) saveState(ev);
  });

  /* Panel on mobile UI */

  const  { LEFT, RIGHT } = Directions;

  onSwipe(canvas, RIGHT|LEFT, 50, panelSwipe);
  onSwipe($id("menu-title"), LEFT, 50, panelSwipe);

  function panelSwipe(dir) {
    if (dir === RIGHT) {
      showPanel();
    }
    else {
      hidePanel();
    }
  }

  /* Initialize */

  tapeName.value = "";
  // const ctx = canvas.getContext('bitmaprenderer');
  const ctx = canvas.getContext('2d', {alpha: false, desynchronized: true});
  ctx.imageSmoothingEnabled = false;

  loadFromUrlParams(true).then(loaded => {
    if (loaded) {
      togglePause().then(() => $(introModal).modal({keyboard: false}));
    }
    else {
      showPanel();
    }
    run(true);
  });

  /* Scoped utility functions */

  function showPanel() {
    mainContainer.classList.add("show-panel")
  }

  function hidePanel() {
    mainContainer.classList.remove("show-panel")
  }

  function togglePanel() {
    mainContainer.classList.toggle("show-panel")
  }

  function togglePause() {
    paused = (pauseButton.value == "Pause");
    pauseButton.disabled = true;
    return (paused ? spectrum.pauseAudio() : spectrum.resumeAudio())
    .then(() => {
      pauseButton.value = paused ? "Resume" : "Pause";
      pauseButton.disabled = false;
    })
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
        let [cw, ch] = spectrum.canvasSize;
        // console.log("screen: %s x %s -> %s x %s", width, height, cw, ch);
        canvas.width = cw;
        canvas.height = ch;
        renderedImage = new ImageData(width, height);
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
      spectrusty.update();
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

  function attachDevice(ev) {
    setupDevice(spectrum, ev.target.name, ev.target.checked);
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
              populateTapeInfo(n == 0 ? spectrum.insertTape(data)
                                      : spectrum.appendTape(data));
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
        spectrusty.update();
        urlparams.updateAll(spectrum);
      };
      if (ext === '.json') {
        reader.readAsText(file);
      }
      else {
        reader.readAsArrayBuffer(file);
      }
    }
  }

  function loadRemoteTapes(urls) {
    return Promise.allSettled((urls || []).map(uri => loadRemote(uri, false)))
    .then(results => {
      var info;
      for (let res of results) {
        if (res.status === "fulfilled") {
          let data = res.value;
          if (!info) {
            info = spectrum.insertTape(data);
          }
          else {
            info = spectrum.appendTape(data);
          }
        }
        else {
          alert(res.reason);
        }
      }
      if (!info) {
        spectrum.ejectTape();
        info = spectrum.tapeInfo();
      }
      populateTapeInfo(info);
      fileBrowser.value = tapeName.value = "";
      updateTapeButtons(spectrum.tapeStatus());
    })
    .catch(err => alert(err))
  }

  function loadRemoteSnap(uri, type) {
    return loadRemote(uri, type === 'json')
    .then(data => {
      switch(type) {
        case 'sna':
          spectrum.loadSna(data);
          break;
        case 'z80':
          spectrum.loadZ80(data);
          break;
        case 'json':
          spectrum.parseJSON(data);
          break;
        default:
          return;
      }
      tapeName.value = "";
      urlparams.mergeAll(spectrum);
    })
    .catch(err => alert(err))
  }

  function loadFromUrlParams(autoload) {
    var loaded = false;
    var promise = Promise.resolve(false);
    if (autoload && restoreState(spectrum, urlparams)) {
      autoload = false;
    }
    else if (urlparams.modifiedSnap()) {
      let snap = urlparams.snap;
      if (snap) {
        autoload = false;
        promise = loadRemoteSnap(snap.url, snap.type).then(() => true);
      }
    }

    if (urlparams.modifiedTap()) {
      let tap = urlparams.tap;
      promise = promise.then(loaded => loadRemoteTapes(tap)
        .then(() => {
          urlparams.applyTo(spectrum);
          if (tap && autoload) {
            spectrum.resetAndLoad();
            return true;
          }
          else {
            return loaded;
          }
        })
      );
    }
    else {
      promise = promise.then(loaded => {
        urlparams.applyTo(spectrum);
        return loaded;
      });
    }

    return promise.catch(e => alert(e));
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
    setSpeed(0);
    spectrusty.update();
  }

  function setSpeed(value) {
    let factor = cpuFactor(value);
    speedCurrent.value = "x" + factor.toFixed(2);
    spectrum.setCpuRateFactor(factor);
  }

  function dumpMemory(ask, mime, label, ext, cb) {
    var res = prompt(ask);
    if (res) {
      res = parseRange(res);
      if (res) {
        let [start, end] = res;
        try {
          let data = cb(start, end);
          downloadFile(data, mime, `${label}-0x${toHex(start&0xffff, 4)}-0x${toHex(end&0xffff, 4)}.${ext}`);
        }
        catch(e) {
          alert(e);
        }
      }
      else {
        alert("Please provide address range in a valid format.\n" +
          "E.g.:\n0x4000:0x4100\n0x4000, 0x100\n16384:16640\n16384, 256");
      }
    }
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
})
.catch(console.error);