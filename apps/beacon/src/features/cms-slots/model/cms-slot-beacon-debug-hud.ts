/**
 * Runtime fragment (readable JS, Biome-formatted) embedded in the footer beacon runtime ({@link getCmsSlotPageInlineScriptSource}).
 *
 * Ships the *entire* debug component to the published client: a styled, draggable HUD (summary header + expandable
 * live event log) plus the `bLog`/`bDbgBump` instrumentation the runtime calls. The panel is hidden until the visitor
 * presses Ctrl/Cmd + Shift + D, so it never leaks to normal traffic while still shipping on
 * publish. All styling lives in a single injected `<style>` scoped under `#codalyn-beacon-debug` so it cannot clash
 * with (or be clobbered by) the host site's CSS.
 *
 * Must parse standalone (`new Function(beaconPropDebugRuntimeSource())`): it only *declares* functions and a state
 * object; nothing touches `document`/`window` until `bDbgBindKeys`/`bLog` are invoked by the runtime.
 */

export function beaconPropDebugRuntimeSource(): string {
  const css =
    "#codalyn-beacon-debug{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:320px;max-width:calc(100vw - 32px);font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#e5e7eb;background:#0b0f1a;border:1px solid #1f2937;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.45);overflow:hidden}#codalyn-beacon-debug *{box-sizing:border-box;margin:0}#codalyn-beacon-debug .cbd-head{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#111827;cursor:move;-webkit-user-select:none;user-select:none;border-bottom:1px solid #1f2937}#codalyn-beacon-debug .cbd-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;flex:none}#codalyn-beacon-debug .cbd-title{font-weight:600;color:#fff}#codalyn-beacon-debug .cbd-spacer{flex:1}#codalyn-beacon-debug .cbd-btn{appearance:none;-webkit-appearance:none;border:1px solid #374151;background:#1f2937;color:#cbd5e1;border-radius:6px;padding:2px 7px;font:inherit;cursor:pointer}#codalyn-beacon-debug .cbd-btn:hover{background:#374151;color:#fff}#codalyn-beacon-debug .cbd-meta{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-bottom:1px solid #1f2937}#codalyn-beacon-debug .cbd-meta .cbd-v{max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left}#codalyn-beacon-debug .cbd-summary{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;padding:8px 10px;border-bottom:1px solid #1f2937}#codalyn-beacon-debug .cbd-stat{display:flex;justify-content:space-between;gap:8px}#codalyn-beacon-debug .cbd-k{color:#94a3b8}#codalyn-beacon-debug .cbd-v{color:#fff;font-variant-numeric:tabular-nums}#codalyn-beacon-debug .cbd-log{max-height:240px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:6px 10px;list-style:none;scrollbar-width:thin;scrollbar-color:#374151 transparent}#codalyn-beacon-debug .cbd-log::-webkit-scrollbar{width:10px;height:10px}#codalyn-beacon-debug .cbd-log::-webkit-scrollbar-track{background:transparent}#codalyn-beacon-debug .cbd-log::-webkit-scrollbar-thumb{background-color:#374151;border-radius:9999px;border:1px solid transparent;background-clip:content-box;transition:background-color .15s ease}#codalyn-beacon-debug .cbd-log::-webkit-scrollbar-thumb:hover{background-color:#4b5563}#codalyn-beacon-debug .cbd-log::-webkit-scrollbar-button{display:none}#codalyn-beacon-debug .cbd-log::-webkit-scrollbar-corner{background:transparent}#codalyn-beacon-debug .cbd-row{padding:2px 0;border-bottom:1px solid rgba(255,255,255,.05);white-space:pre-wrap;word-break:break-word}#codalyn-beacon-debug .cbd-time{color:#64748b;margin-right:6px}#codalyn-beacon-debug.cbd-log-collapsed .cbd-log{display:none}";
  return [
    `var __cbd = {
  evts: [],
  sum: { lists: 0, targets: 0, cloned: 0, applied: 0, concealed: 0 },
  rt: { ver: "", hash: "", src: "" },
  root: null,
  logEl: null,
  sumEl: null,
  metaEl: null,
  mounted: false,
  visible: false,
  bound: false,
};
`,
    `function bDbgStyle() {
  if (document.getElementById("codalyn-beacon-debug-style")) return;
  var s = document.createElement("style");
  s.id = "codalyn-beacon-debug-style";
  s.textContent = ${JSON.stringify(css)};
  (document.head || document.documentElement).appendChild(s);
}
`,
    `function bDbgEl(t, c, x) {
  var e = document.createElement(t);
  if (c) e.className = c;
  if (x != null) e.textContent = x;
  return e;
}
`,
    `function bDbgStat(k) {
  var w = bDbgEl("div", "cbd-stat");
  w.appendChild(bDbgEl("span", "cbd-k", k));
  var v = bDbgEl("span", "cbd-v", "0");
  v.setAttribute("data-k", k);
  w.appendChild(v);
  return w;
}
`,
    `function bDbgMetaRow(k, v) {
  var w = bDbgEl("div", "cbd-stat");
  w.appendChild(bDbgEl("span", "cbd-k", k));
  var e = bDbgEl("span", "cbd-v", v || "\\u2014");
  if (v) e.title = v;
  w.appendChild(e);
  return w;
}
`,
    `function bDbgHashFromSrc(src) {
  var m = String(src || "").match(/codalyn-beacon-runtime-([0-9a-f]+)\\.js/);
  return m ? m[1] : "";
}
`,
    `function bDbgRuntimeInfo(ver, src) {
  __cbd.rt = { ver: String(ver || ""), src: String(src || ""), hash: bDbgHashFromSrc(src) };
  if (__cbd.mounted) bDbgRenderRuntime();
  bLog("runtime build", { ver: __cbd.rt.ver, hash: __cbd.rt.hash || "(unknown)", src: __cbd.rt.src || "(inline)" });
}
`,
    `function bDbgRenderRuntime() {
  if (!__cbd.metaEl) return;
  var r = __cbd.rt;
  __cbd.metaEl.textContent = "";
  __cbd.metaEl.appendChild(bDbgMetaRow("version", r.ver));
  __cbd.metaEl.appendChild(bDbgMetaRow("runtime", r.hash));
  __cbd.metaEl.appendChild(bDbgMetaRow("asset", r.src));
}
`,
    `function bDbgRenderSum() {
  if (!__cbd.sumEl) return;
  var vs = __cbd.sumEl.querySelectorAll(".cbd-v"),
    i;
  for (i = 0; i < vs.length; i++) {
    var k = vs[i].getAttribute("data-k");
    vs[i].textContent = String(__cbd.sum[k] || 0);
  }
}
`,
    `function bDbgAppend(m) {
  if (!__cbd.logEl) return;
  var d = new Date(),
    p = function (n) {
      return ("0" + n).slice(-2);
    },
    li = bDbgEl("li", "cbd-row");
  li.appendChild(bDbgEl("span", "cbd-time", p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds())));
  li.appendChild(document.createTextNode(m));
  __cbd.logEl.appendChild(li);
  __cbd.logEl.scrollTop = __cbd.logEl.scrollHeight;
}
`,
    `function bDbgDrag(h, r) {
  var sx,
    sy,
    ox,
    oy,
    on = false;
  function dn(e) {
    on = true;
    var b = r.getBoundingClientRect();
    ox = b.left;
    oy = b.top;
    sx = e.clientX;
    sy = e.clientY;
    r.style.left = ox + "px";
    r.style.top = oy + "px";
    r.style.right = "auto";
    r.style.bottom = "auto";
    e.preventDefault();
    document.addEventListener("mousemove", mv);
    document.addEventListener("mouseup", up);
  }
  function mv(e) {
    if (!on) return;
    r.style.left = ox + e.clientX - sx + "px";
    r.style.top = oy + e.clientY - sy + "px";
  }
  function up() {
    on = false;
    document.removeEventListener("mousemove", mv);
    document.removeEventListener("mouseup", up);
  }
  h.addEventListener("mousedown", dn);
}
`,
    `function bDbgMount() {
  if (__cbd.mounted || !document.body) return;
  bDbgStyle();
  var root = bDbgEl("div");
  root.id = "codalyn-beacon-debug";
  root.className = "cbd-log-collapsed";
  root.style.display = "none";
  var head = bDbgEl("div", "cbd-head");
  head.appendChild(bDbgEl("span", "cbd-dot"));
  head.appendChild(bDbgEl("span", "cbd-title", "Beacon runtime"));
  head.appendChild(bDbgEl("span", "cbd-spacer"));
  var lb = bDbgEl("button", "cbd-btn", "Log"),
    cpb = bDbgEl("button", "cbd-btn", "Copy"),
    cb = bDbgEl("button", "cbd-btn", "Clear"),
    hb = bDbgEl("button", "cbd-btn", "Hide");
  head.appendChild(lb);
  head.appendChild(cpb);
  head.appendChild(cb);
  head.appendChild(hb);
  var meta = bDbgEl("div", "cbd-meta");
  var sum = bDbgEl("div", "cbd-summary");
  sum.appendChild(bDbgStat("lists"));
  sum.appendChild(bDbgStat("targets"));
  sum.appendChild(bDbgStat("cloned"));
  sum.appendChild(bDbgStat("applied"));
  sum.appendChild(bDbgStat("concealed"));
  var log = bDbgEl("ul", "cbd-log");
  root.appendChild(head);
  root.appendChild(meta);
  root.appendChild(sum);
  root.appendChild(log);
  document.body.appendChild(root);
  __cbd.root = root;
  __cbd.metaEl = meta;
  __cbd.sumEl = sum;
  __cbd.logEl = log;
  __cbd.mounted = true;
  lb.addEventListener("click", function () {
    root.classList.toggle("cbd-log-collapsed");
  });
  cpb.addEventListener("click", function () {
    bDbgCopy();
  });
  cb.addEventListener("click", function () {
    __cbd.evts = [];
    log.innerHTML = "";
  });
  hb.addEventListener("click", function () {
    bDbgToggle();
  });
  bDbgDrag(head, root);
  bDbgRenderSum();
  bDbgRenderRuntime();
  for (var i = 0; i < __cbd.evts.length; i++) bDbgAppend(__cbd.evts[i].m);
}
`,
    `function bDbgToggle() {
  bDbgMount();
  if (!__cbd.root) return;
  __cbd.visible = !__cbd.visible;
  __cbd.root.style.display = __cbd.visible ? "block" : "none";
}
`,
    `function bDbgBindKeys() {
  if (__cbd.bound) return;
  __cbd.bound = true;
  addEventListener("keydown", function (e) {
    if (
      (e.ctrlKey || e.metaKey) &&
      e.shiftKey &&
      ((e.key && String(e.key).toLowerCase() === "d") || e.keyCode === 68)
    ) {
      e.preventDefault();
      bDbgToggle();
    }
  });
}
`,
    `function bDbgBump(k, n) {
  if (typeof __cbd.sum[k] === "number") {
    __cbd.sum[k] += n || 0;
    if (__cbd.mounted) bDbgRenderSum();
  }
}
`,
    `function bDbgFmtTime(t) {
  var d = new Date(t),
    p = function (n) {
      return ("0" + n).slice(-2);
    };
  return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}
`,
    `function bDbgLogText() {
  var L = [],
    i;
  for (i = 0; i < __cbd.evts.length; i++) L.push(bDbgFmtTime(__cbd.evts[i].t) + " " + __cbd.evts[i].m);
  return L.join("\\n");
}
`,
    `function bDbgCopyFallback(txt) {
  try {
    var ta = document.createElement("textarea");
    ta.value = txt;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  } catch (e) {}
}
`,
    `function bDbgCopy() {
  var txt = bDbgLogText();
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt)["catch"](function () {
      bDbgCopyFallback(txt);
    });
  } else {
    bDbgCopyFallback(txt);
  }
}
`,
    `function bLog() {
  var a = [].slice.call(arguments),
    p = [],
    i;
  for (i = 0; i < a.length; i++) {
    var x = a[i];
    if (x && typeof x === "object") {
      try {
        p.push(JSON.stringify(x));
      } catch (e) {
        p.push(String(x));
      }
    } else {
      p.push(String(x));
    }
  }
  var m = p.join(" ");
  if (typeof console !== "undefined" && console.log) console.log("[codalyn-beacon]", m);
  __cbd.evts.push({ t: Date.now(), m: m });
  if (__cbd.evts.length > 300) __cbd.evts.shift();
  if (__cbd.mounted) bDbgAppend(m);
}
`,
  ].join("");
}
