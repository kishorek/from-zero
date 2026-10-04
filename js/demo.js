(function () {
  function text(node) {
    if (!node) return "";
    var raw = node.content ? node.content.textContent : node.textContent;
    return String(raw || "").replace(/^\n/, "").replace(/\n$/, "");
  }

  function format(value) {
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      return "[ " + value.map(function (item) {
        return typeof item === "string" ? "'" + item + "'" : format(item);
      }).join(", ") + " ]";
    }
    try { return JSON.stringify(value); } catch (error) { return String(value); }
  }

  var WORKER = [
    "self.onmessage = function (event) {",
    "  var data = event.data;",
    "  var logs = [];",
    "  var files = Object.assign({}, data.files || {});",
    "  var exitCode = 0;",
    "  var stopped = false;",
    "  function say(args) { logs.push(args.map(formatValue).join(' ')); }",
    "  function formatValue(value) {",
    "    if (value === undefined) return 'undefined';",
    "    if (value === null) return 'null';",
    "    if (typeof value === 'string') return value;",
    "    if (typeof value === 'number' || typeof value === 'boolean') return String(value);",
    "    if (Array.isArray(value)) return '[ ' + value.map(function (item) { return typeof item === 'string' ? \"'\" + item + \"'\" : formatValue(item); }).join(', ') + ' ]';",
    "    try { return JSON.stringify(value); } catch (e) { return String(value); }",
    "  }",
    "  var consoleApi = { log: function () { say([].slice.call(arguments)); }, error: function () { say([].slice.call(arguments)); } };",
    "  var processApi = {",
    "    argv: data.argv,",
    "    env: Object.assign({}, data.env || {}),",
    "    version: 'v22.0.0',",
    "    cwd: function () { return '/lab'; },",
    "    exit: function (code) { exitCode = code; stopped = true; throw new Error('__exit__'); }",
    "  };",
    "  Object.defineProperty(processApi, 'exitCode', { get: function () { return exitCode; }, set: function (v) { exitCode = v; } });",
    "  function readFile(name) {",
    "    if (!Object.prototype.hasOwnProperty.call(files, name)) throw new Error('Could not read ' + name);",
    "    return files[name];",
    "  }",
    "  function writeFile(name, value) { files[name] = String(value); }",
    "  function appendFile(name, value) { files[name] = (files[name] || '') + String(value); }",
    "  var pathApi = {",
    "    join: function () { return [].slice.call(arguments).join('/').replace(/\\\\/g, '/').replace(/\\/+/g, '/'); },",
    "    basename: function (p) { var parts = String(p).split('/'); return parts[parts.length - 1]; },",
    "    dirname: function (p) { var parts = String(p).split('/'); parts.pop(); return parts.join('/') || '/'; },",
    "    resolve: function (p) {",
    "      var bits = [];",
    "      String(p).split('/').forEach(function (part) {",
    "        if (part === '' || part === '.') return;",
    "        if (part === '..') bits.pop(); else bits.push(part);",
    "      });",
    "      return '/' + bits.join('/');",
    "    }",
    "  };",
    "  function fetch(url) {",
    "    var address = String(url);",
    "    if (address.indexOf('missing') !== -1) {",
    "      return Promise.resolve({ status: 404, ok: false, text: function () { return Promise.resolve('Not found'); }, json: function () { return Promise.reject(new Error('not json')); } });",
    "    }",
    "    if (address.indexOf('example.com') !== -1) {",
    "      var body = '<!doctype html>\\n<html>\\n<head>\\n    <title>Example Domain</title>\\nExample Domain';",
    "      return Promise.resolve({ status: 200, ok: true, text: function () { return Promise.resolve(body); }, json: function () { return Promise.reject(new Error('not json')); } });",
    "    }",
    "    return Promise.reject(new Error('This demo only answers example.com'));",
    "  }",
    "  var source = data.code;",
    "  if (data.mode === 'modules') {",
    "    var exported = [];",
    "    var exp = /export\\s+function\\s+(\\w+)/g, found;",
    "    while ((found = exp.exec(data.money))) exported.push(found[1]);",
    "    var imp = data.shop.match(/import\\s*\\{([^}]+)\\}/);",
    "    var wanted = imp ? imp[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];",
    "    var missing = wanted.filter(function (name) { return exported.indexOf(name) === -1; });",
    "    if (missing.length) {",
    "      self.postMessage({ ok: false, error: 'The export does not exist: ' + missing[0], logs: [], files: files, exitCode: 1 });",
    "      return;",
    "    }",
    "    source = data.money.replace(/export\\s+function/g, 'function') + '\\n' + data.shop.replace(/import[^\\n]*\\n?/g, '');",
    "  }",
    "  if (/^\\s*import\\s/m.test(source)) {",
    "    self.postMessage({ ok: false, error: 'This practice box has no import. Use the names already provided, or the two file boxes on the modules lesson.', logs: [], files: files, exitCode: 1 });",
    "    return;",
    "  }",
    "  try {",
    "    var runner = new Function('console', 'process', 'readFile', 'writeFile', 'appendFile', 'path', 'fetch', 'return (async function () {\\n' + source + '\\n})();');",
    "    Promise.resolve(runner(consoleApi, processApi, readFile, writeFile, appendFile, pathApi, fetch)).then(function () {",
    "      self.postMessage({ ok: true, logs: logs, files: files, exitCode: exitCode });",
    "    }).catch(function (error) {",
    "      if (stopped || (error && error.message === '__exit__')) {",
    "        self.postMessage({ ok: true, logs: logs, files: files, exitCode: exitCode });",
    "        return;",
    "      }",
    "      self.postMessage({ ok: false, error: error && error.message ? error.message : String(error), logs: logs, files: files, exitCode: 1 });",
    "    });",
    "  } catch (error) {",
    "    self.postMessage({ ok: false, error: friendly(error && error.message ? error.message : String(error)), logs: logs, files: files, exitCode: 1 });",
    "  }",
    "  function friendly(message) {",
    "    if (message.indexOf('Unexpected') !== -1 || message.indexOf('Invalid') !== -1 || message.indexOf('missing') !== -1) {",
    "      return 'The spelling is off. Look for a missing quote, parenthesis, or comma. ' + message;",
    "    }",
    "    return message;",
    "  }",
    "};"
  ].join("\n");

  function runCode(payload) {
    return new Promise(function (resolve) {
      var blob = new Blob([WORKER], { type: "application/javascript" });
      var worker = new Worker(URL.createObjectURL(blob));
      var timer = setTimeout(function () {
        worker.terminate();
        resolve({ ok: false, error: "This ran too long. A loop may be missing its end.", logs: [], files: payload.files || {}, exitCode: 1 });
      }, 1200);
      worker.onmessage = function (event) {
        clearTimeout(timer);
        worker.terminate();
        resolve(event.data);
      };
      worker.onerror = function () {
        clearTimeout(timer);
        worker.terminate();
        resolve({ ok: false, error: "The practice box could not run that. Check the spelling.", logs: [], files: payload.files || {}, exitCode: 1 });
      };
      worker.postMessage(payload);
    });
  }

  function readFiles(box) {
    var files = {};
    box.querySelectorAll(".demo-file").forEach(function (area) {
      files[area.getAttribute("data-name")] = area.value;
    });
    return files;
  }

  function writeFiles(box, files) {
    box.querySelectorAll(".demo-file").forEach(function (area) {
      var name = area.getAttribute("data-name");
      if (Object.prototype.hasOwnProperty.call(files, name)) area.value = files[name];
    });
  }

  function judge(box, result) {
    var output = (result.logs || []).join("\n");
    if (result.ok && (result.exitCode || box.hasAttribute("data-show-exit"))) {
      output += (output ? "\n" : "") + "Exit code: " + (result.exitCode || 0);
    }
    var expectNode = box.querySelector(".demo-expect");
    var expect = text(expectNode).trim();
    var match = box.getAttribute("data-match") || "";
    var hint = box.getAttribute("data-hint") || "Read the output and try one small change.";
    var footer = output;
    if (!result.ok) {
      return { cls: "bad", text: result.error + (output ? "\n" + output : "") };
    }
    if (!match) return { cls: "", text: footer || "(no output)" };
    var good = false;
    if (match === "exact") good = output.trim() === expect;
    if (match === "includes") {
      good = expect.split("\n").filter(Boolean).every(function (line) { return output.indexOf(line.trim()) !== -1; });
    }
    if (match === "one-of") {
      good = expect.split("\n").some(function (line) { return output.trim() === line.trim() || output.indexOf(line.trim()) !== -1; });
    }
    if (match === "lines") good = output.split("\n").filter(function (line) { return line.trim() !== ""; }).length >= Number(box.getAttribute("data-min") || "1");
    if (match === "pattern") {
      try { good = new RegExp(box.getAttribute("data-pattern")).test(output.trim()); } catch (error) { good = false; }
    }
    if (match === "exit") good = String(result.exitCode) === box.getAttribute("data-exit");
    if (good) return { cls: "ok", text: footer + "\n\nYes. That is the result this lesson is aiming at." };
    return { cls: "bad", text: footer + "\n\nNot yet. " + hint };
  }

  function bindJs(box) {
    var area = box.querySelector(".demo-code");
    var args = box.querySelector(".demo-args");
    var env = box.querySelector(".demo-env");
    var money = box.querySelector(".demo-money");
    var shop = box.querySelector(".demo-shop");
    var out = box.querySelector(".demo-out");
    var startCode = area ? area.value : "";
    var startArgs = args ? args.value : "";
    var startEnv = env ? env.value : "";
    var startMoney = money ? money.value : "";
    var startShop = shop ? shop.value : "";
    var startFiles = readFiles(box);
    box.querySelector(".demo-run").addEventListener("click", function () {
      var argv = ["node", "practice.js"];
      if (args && args.value.trim()) argv = argv.concat(args.value.trim().split(/\s+/));
      var envObj = {};
      if (env && env.value.trim()) {
        env.value.split("\n").forEach(function (line) {
          var cut = line.indexOf("=");
          if (cut > 0) envObj[line.slice(0, cut).trim()] = line.slice(cut + 1);
        });
      }
      out.className = "demo-out";
      out.textContent = "Running...";
      runCode({
        mode: box.getAttribute("data-mode") || "script",
        code: area ? area.value : "",
        money: money ? money.value : "",
        shop: shop ? shop.value : "",
        argv: argv,
        env: envObj,
        files: readFiles(box)
      }).then(function (result) {
        if (result.files) writeFiles(box, result.files);
        var verdict = judge(box, result);
        out.className = "demo-out " + verdict.cls;
        out.textContent = verdict.text;
      });
    });
    var reset = box.querySelector(".demo-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        if (area) area.value = startCode;
        if (args) args.value = startArgs;
        if (env) env.value = startEnv;
        if (money) money.value = startMoney;
        if (shop) shop.value = startShop;
        writeFiles(box, startFiles);
        out.className = "demo-out";
        out.textContent = "";
      });
    }
  }

  function setOut(box, cls, message) {
    var out = box.querySelector(".demo-out");
    out.className = "demo-out " + (cls || "");
    out.textContent = message;
  }

  function bindStage(box) {
    var stage = box.getAttribute("data-stage");
    if (stage === "terminal") bindTerminal(box);
    if (stage === "words") bindWords(box);
    if (stage === "rooms") bindRooms(box);
    if (stage === "install") bindInstall(box);
    if (stage === "split") bindSplit(box);
    if (stage === "title") bindTitle(box);
    if (stage === "cookies") bindCookies(box);
    if (stage === "browser") bindBrowser(box);
    if (stage === "locator") bindLocator(box);
    if (stage === "form") bindForm(box);
    if (stage === "wait") bindWait(box);
    if (stage === "glance") bindGlance(box);
    if (stage === "picture") bindPicture(box);
    if (stage === "popup") bindPopup(box);
    if (stage === "frame") bindFrame(box);
    if (stage === "network") bindNetwork(box);
    if (stage === "ticket") bindTicket(box);
    if (stage === "hook") bindHook(box);
    if (stage === "debug") bindDebug(box);
  }

  function bindTerminal(box) {
    var cwd = "/home";
    var dirs = { "/home": [] };
    var screen = box.querySelector(".term-screen");
    var input = box.querySelector(".term-input");
    function prompt() { return cwd + " $ "; }
    function print(line) { screen.textContent += (screen.textContent ? "\n" : "") + line; }
    screen.textContent = prompt();
    function run() {
      var raw = input.value.trim();
      input.value = "";
      print(raw);
      var bits = raw.split(/\s+/);
      var cmd = bits[0] || "";
      var arg = bits[1] || "";
      var note = "";
      if (cmd === "pwd") note = cwd;
      else if (cmd === "ls") note = (dirs[cwd] || []).join("  ") || "(empty)";
      else if (cmd === "mkdir") {
        if (!arg) note = "mkdir needs a folder name";
        else {
          dirs[cwd] = dirs[cwd] || [];
          if (dirs[cwd].indexOf(arg) === -1) dirs[cwd].push(arg);
          dirs[cwd.replace(/\/$/, "") + "/" + arg] = dirs[cwd.replace(/\/$/, "") + "/" + arg] || [];
          note = "";
        }
      } else if (cmd === "cd") {
        var next = arg === ".." ? cwd.split("/").slice(0, -1).join("/") || "/" : (arg.charAt(0) === "/" ? arg : cwd.replace(/\/$/, "") + "/" + arg);
        if (!Object.prototype.hasOwnProperty.call(dirs, next)) note = "No folder named " + (arg || "(nothing)");
        else { cwd = next; note = ""; }
      } else if (cmd === "help" || cmd === "") note = "Try pwd, ls, mkdir lab, cd lab, pwd";
      else note = "Unknown command. Try pwd, ls, mkdir, or cd.";
      if (note) print(note);
      print(prompt());
      if (cwd === "/home/lab") setOut(box, "ok", "Yes. You made a folder named lab and stepped inside it.");
    }
    box.querySelector(".demo-run").addEventListener("click", run);
    input.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); run(); } });
  }

  function bindWords(box) {
    box.querySelector(".demo-run").addEventListener("click", function () {
      var language = box.querySelector("[data-pick='language']").value;
      var runtime = box.querySelector("[data-pick='runtime']").value;
      var library = box.querySelector("[data-pick='library']").value;
      if (language === "JavaScript" && runtime === "Node.js" && library === "Playwright") {
        setOut(box, "ok", "Yes. JavaScript is the language. Node.js is the runtime. Playwright is the library.");
      } else {
        setOut(box, "bad", "Not yet. The language is the spelling. The runtime runs it. The library is a tool you add.");
      }
    });
  }

  function bindRooms(box) {
    box.querySelector(".demo-run").addEventListener("click", function () {
      setOut(box, "ok", "In Node.js, typeof process is object.\nIn the browser page, typeof process is undefined.\nSame question. Different room.");
    });
  }

  function bindInstall(box) {
    var step = 0;
    var labels = ["Node.js is ready.", "The project folder exists.", "The test runner is on the list.", "The browsers are downloaded."];
    box.querySelector(".demo-run").addEventListener("click", function () {
      if (step >= labels.length) {
        setOut(box, "ok", "Yes. That is the whole install: Node, a folder, the runner, then the browsers.");
        return;
      }
      step += 1;
      box.querySelector(".step-count").textContent = step + " of 4";
      setOut(box, step === 4 ? "ok" : "", labels.slice(0, step).join("\n") + (step === 4 ? "\n\nYes. Install is finished in this picture." : ""));
    });
  }

  function bindSplit(box) {
    var forget = box.querySelector(".forget");
    function paint() {
      var on = forget.checked;
      setOut(box, on ? "bad" : "ok", on
        ? "The library script forgot to close the browser, so it is still open.\nThe test runner still closes its own browser."
        : "Both are tidy. The library script closed the browser. The runner always does that for you.");
    }
    forget.addEventListener("change", paint);
    paint();
  }

  function bindTitle(box) {
    box.querySelector(".demo-run").addEventListener("click", function () {
      var expected = box.querySelector(".expect-title").value.trim();
      var actual = "Example Domain";
      if (expected === actual) setOut(box, "ok", "Pass. The title is Example Domain.");
      else setOut(box, "bad", "Fail.\nExpected: " + expected + "\nReceived: " + actual + "\n\nPut the expected title back to Example Domain and run again.");
    });
  }

  function bindCookies(box) {
    var roomA = "";
    box.querySelector(".save-a").addEventListener("click", function () {
      roomA = "signed-in";
      setOut(box, "", "Room A has a cookie: signed-in.\nRoom B was not given that cookie.");
    });
    box.querySelector(".look-b").addEventListener("click", function () {
      setOut(box, "ok", "Room B cookies: (none).\nYes. A new context does not share Room A's cookies." + (roomA ? "\nRoom A still has: signed-in." : ""));
    });
  }

  function bindBrowser(box) {
    var url = "https://example.com/";
    var history = [url];
    var bar = box.querySelector(".mini-bar");
    var page = box.querySelector(".mini-page");
    function paint() {
      bar.textContent = url;
      if (url.indexOf("example.com") !== -1) {
        page.innerHTML = "<h4>Example Domain</h4><p><a href='#' class='more'>Learn more</a></p>";
        page.querySelector(".more").addEventListener("click", function (event) {
          event.preventDefault();
          url = "https://www.iana.org/domains/example";
          history.push(url);
          paint();
          setOut(box, "ok", "The address changed. That is what click on Learn more does. Press Back to return.");
        });
      } else {
        page.innerHTML = "<h4>IANA example domains</h4><p>You followed the link.</p>";
      }
    }
    box.querySelector(".reload").addEventListener("click", function () { paint(); setOut(box, "", "Reloaded " + url); });
    box.querySelector(".back").addEventListener("click", function () {
      if (history.length > 1) history.pop();
      url = history[history.length - 1];
      paint();
      setOut(box, url.indexOf("example.com") !== -1 ? "ok" : "", "Back at " + url);
    });
    paint();
  }

  function bindLocator(box) {
    box.querySelector(".demo-run").addEventListener("click", function () {
      var role = box.querySelector(".role").value;
      var name = box.querySelector(".el-name").value.trim();
      box.querySelectorAll(".mini-page [data-role]").forEach(function (el) { el.classList.remove("hit"); });
      var found = box.querySelector(".mini-page [data-role='" + role + "'][data-name='" + name.replace(/'/g, "") + "']");
      if (found) {
        found.classList.add("hit");
        setOut(box, "ok", "Found the " + role + " named " + name + ".");
      } else {
        setOut(box, "bad", "Nothing matched a " + role + " named \"" + name + "\". The heading on this page is named Example Domain.");
      }
    });
  }

  function bindForm(box) {
    var saved = box.querySelector(".saved");
    box.querySelector(".save").addEventListener("click", function () {
      var name = box.querySelector(".person").value;
      var drink = box.querySelector(".drink") ? box.querySelector(".drink").value : "";
      saved.textContent = "Saved " + (name || "(empty)") + (drink ? " likes " + drink : "");
      setOut(box, name ? "ok" : "bad", name ? "Yes. The page shows what the person would read after Save." : "Type a note first. Filling the box replaces the whole note.");
    });
  }

  function bindWait(box) {
    var button = box.querySelector(".save");
    var ready = false;
    button.hidden = true;
    box.querySelector(".load").addEventListener("click", function () {
      ready = false;
      button.hidden = true;
      setOut(box, "", "The button is hidden. It will appear in about a second.");
      setTimeout(function () { ready = true; button.hidden = false; }, 1000);
    });
    box.querySelector(".click-ready").addEventListener("click", function () {
      if (!ready) { setOut(box, "", "Still waiting for the button to be ready..."); return; }
      setOut(box, "ok", "Clicked Save. The demo waited until the button was visible. You did not type a sleep.");
    });
    box.querySelector(".click-early").addEventListener("click", function () {
      if (!ready) setOut(box, "bad", "Too early. A fixed short wait missed the button. Waiting for the button itself still works.");
      else setOut(box, "ok", "The button was already ready, so both clicks work. Load the page again and try the short wait sooner.");
    });
  }

  function bindGlance(box) {
    var status = box.querySelector(".status");
    var showed = false;
    function arm() {
      showed = false;
      status.textContent = "Waiting";
      setTimeout(function () { showed = true; status.textContent = "Submitted"; }, 700);
    }
    arm();
    box.querySelector(".once").addEventListener("click", function () {
      if (status.textContent !== "Submitted") setOut(box, "bad", "Checked once and saw \"" + status.textContent + "\". That glance was too early.");
      else setOut(box, "", "You looked after it had already changed. Press Reload and try the one glance immediately.");
    });
    box.querySelector(".keep").addEventListener("click", function () {
      var tries = 0;
      var timer = setInterval(function () {
        tries += 1;
        if (status.textContent === "Submitted") {
          clearInterval(timer);
          setOut(box, "ok", "Kept looking. Saw Submitted after " + tries + " glances. That is a retrying check.");
        }
      }, 120);
    });
    box.querySelector(".reload").addEventListener("click", arm);
  }

  function bindPicture(box) {
    box.querySelector(".demo-run").addEventListener("click", function () {
      box.querySelector(".shot").hidden = false;
      setOut(box, "ok", "Saved a picture of the page. In a real run this is a PNG file. You take it when something fails, not after every success.");
    });
  }

  function bindPopup(box) {
    box.querySelector(".hands-first").addEventListener("click", function () {
      setOut(box, "ok", "Hands were out first. The new tab arrived and you caught it. Its address is https://example.com/help");
    });
    box.querySelector(".click-first").addEventListener("click", function () {
      setOut(box, "bad", "The tab opened before you were listening, so the wait missed it. Listen first, then click.");
    });
  }

  function bindFrame(box) {
    box.querySelector(".outer").addEventListener("click", function () {
      setOut(box, "bad", "The card field is not in the outer page. It is inside the frame.");
    });
    box.querySelector(".inner").addEventListener("click", function () {
      box.querySelector(".card").value = "4242";
      setOut(box, "ok", "Filled Card number inside the frame. Look in the frame first, then at the label.");
    });
  }

  function bindNetwork(box) {
    function paint() {
      var fail = box.querySelector(".status").value === "500";
      box.querySelector(".page-text").textContent = fail ? "Could not load tasks" : "Buy milk";
      setOut(box, "ok", fail ? "The pretend server answered 500. The page shows the failure sentence." : "The pretend server answered 200 with Buy milk. The page shows that task.");
    }
    box.querySelector(".status").addEventListener("change", paint);
    paint();
  }

  function bindTicket(box) {
    var saved = false;
    function paint(message, cls) {
      box.querySelector(".who").textContent = saved ? "Signed in as Ada" : "Signed out";
      setOut(box, cls || "", message);
    }
    box.querySelector(".login").addEventListener("click", function () {
      saved = true;
      paint("Saved a ticket (storage state) for this login.", "ok");
    });
    box.querySelector(".visit").addEventListener("click", function () {
      paint(saved ? "New visit. The ticket was handed back, so Ada is still signed in." : "New visit, and there is no ticket yet. Log in first.", saved ? "ok" : "bad");
    });
    box.querySelector(".drop").addEventListener("click", function () {
      saved = false;
      paint("Threw the ticket away. The next visit starts signed out.");
    });
    paint("No ticket yet.");
  }

  function bindHook(box) {
    var hook = box.querySelector(".hook");
    function run(which) {
      if (hook.checked) setOut(box, "ok", which + " passed. The hook opened the home page first, so this test did not need its own goto.");
      else setOut(box, "bad", which + " failed. The page was never opened. Turn the hook on, or give this test its own goto.");
    }
    box.querySelector(".test-a").addEventListener("click", function () { run("Heading test"); });
    box.querySelector(".test-b").addEventListener("click", function () { run("Title test"); });
  }

  function bindDebug(box) {
    box.querySelector(".demo-run").addEventListener("click", function () {
      var received = box.querySelector(".received").value.trim();
      if (received === "Example Domain") setOut(box, "ok", "Pass. Expected and received are both Example Domain. One change fixed it.");
      else setOut(box, "bad", "Fail.\nExpected: Example Domain\nReceived: " + received + "\n\nChange one thing. Make the received text match the expected text, then run again.");
    });
  }

  document.querySelectorAll(".demo").forEach(function (box) {
    if (box.getAttribute("data-kind") === "js" || box.getAttribute("data-kind") === "modules") bindJs(box);
    if (box.getAttribute("data-kind") === "stage") bindStage(box);
  });
})();
