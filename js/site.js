(function () {
  var KEYWORDS = {
    const: 1, let: 1, var: 1, function: 1, return: 1, if: 1, else: 1,
    for: 1, of: 1, while: 1, await: 1, async: 1, import: 1, export: 1,
    from: 1, new: 1, try: 1, catch: 1, throw: 1, class: 1, extends: 1,
    true: 1, false: 1, null: 1, undefined: 1, typeof: 1, in: 1,
    break: 1, continue: 1, switch: 1, case: 1, default: 1, this: 1
  };

  function esc(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function highlight(src) {
    var i = 0;
    var out = "";
    var n = src.length;

    function word() {
      var start = i;
      while (i < n && /[A-Za-z0-9_$]/.test(src.charAt(i))) i += 1;
      var text = src.slice(start, i);
      var next = src.slice(i).match(/^\s*\(/);
      if (KEYWORDS[text]) return '<span class="kw">' + esc(text) + "</span>";
      if (next) return '<span class="fn">' + esc(text) + "</span>";
      return esc(text);
    }

    while (i < n) {
      var ch = src.charAt(i);
      var two = src.slice(i, i + 2);

      if (two === "//") {
        var end = src.indexOf("\n", i);
        if (end === -1) end = n;
        out += '<span class="cm">' + esc(src.slice(i, end)) + "</span>";
        i = end;
        continue;
      }

      if (two === "/*") {
        var close = src.indexOf("*/", i + 2);
        var stop = close === -1 ? n : close + 2;
        out += '<span class="cm">' + esc(src.slice(i, stop)) + "</span>";
        i = stop;
        continue;
      }

      if (ch === "'" || ch === '"' || ch === "`") {
        var q = ch;
        var j = i + 1;
        while (j < n) {
          if (src.charAt(j) === "\\") {
            j += 2;
            continue;
          }
          if (src.charAt(j) === q) {
            j += 1;
            break;
          }
          j += 1;
        }
        out += '<span class="str">' + esc(src.slice(i, j)) + "</span>";
        i = j;
        continue;
      }

      if (/[0-9]/.test(ch) && (i === 0 || !/[A-Za-z0-9_$]/.test(src.charAt(i - 1)))) {
        var k = i;
        while (k < n && /[0-9.]/.test(src.charAt(k))) k += 1;
        out += '<span class="num">' + esc(src.slice(i, k)) + "</span>";
        i = k;
        continue;
      }

      if (/[A-Za-z_$]/.test(ch)) {
        out += word();
        continue;
      }

      out += esc(ch);
      i += 1;
    }

    return out;
  }

  document.querySelectorAll("code.language-js").forEach(function (block) {
    block.innerHTML = highlight(block.textContent);
  });

  document.querySelectorAll("figure.code").forEach(function (figure) {
    var code = figure.querySelector("code");
    if (!code) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy";
    btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      var text = code.textContent;
      function done() {
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = "Copy"; }, 1200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          btn.textContent = "Select the code";
        });
      }
    });
    var cap = figure.querySelector("figcaption");
    if (cap) cap.appendChild(btn);
  });

  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  var KEY = "fromZeroProgress";

  function readProgress() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function writeProgress(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  var box = document.querySelector("[data-done]");
  var progress = readProgress();

  if (box) {
    var id = box.getAttribute("data-done");
    box.checked = Boolean(progress[id]);
    box.addEventListener("change", function () {
      var data = readProgress();
      data[id] = box.checked;
      writeProgress(data);
      paint();
    });
  }

  function paint() {
    var data = readProgress();
    document.querySelectorAll("[data-lesson]").forEach(function (link) {
      var flag = link.querySelector(".done-flag");
      var on = Boolean(data[link.getAttribute("data-lesson")]);
      if (flag) flag.textContent = on ? "Done" : "";
    });
    document.querySelectorAll("[data-progress]").forEach(function (node) {
      var scope = node.getAttribute("data-progress");
      var ids = (node.getAttribute("data-ids") || "").split(",").filter(Boolean);
      var count = ids.filter(function (lessonId) { return data[lessonId]; }).length;
      var label = scope === "all" ? "lessons" : "lessons in this layer";
      node.textContent = count + " of " + ids.length + " " + label + " marked as understood.";
    });
  }

  paint();
})();
