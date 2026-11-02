const app = document.querySelector("#app");

const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const join = (value) => (Array.isArray(value) ? value.join("") : String(value ?? ""));
const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");
const parentOf = (path) => path.split("/").slice(0, -1).join("/");
const baseName = (path) => path.split("/").pop();
const treeUrl = (path) => (path ? `/tree/${encodePath(path)}` : "/tree");
const textExtensions = new Set(["csv", "json", "txt", "md", "py"]);
const extensionOf = (path) => (path.includes(".") ? path.split(".").pop().toLowerCase() : "");

function contentUrl(path) {
  return `/api/content?path=${encodeURIComponent(path)}`;
}

function fileUrl(path) {
  const extension = extensionOf(path);
  if (extension === "ipynb") return `/notebooks/${encodePath(path)}`;
  if (textExtensions.has(extension)) return `/edit/${encodePath(path)}`;
  return contentUrl(path);
}

function timeAgo(iso) {
  const seconds = (Date.now() - Date.parse(iso)) / 1000;
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, size] of units) if (seconds >= size) return format.format(-Math.floor(seconds / size), unit);
  return "seconds ago";
}

function fileSize(bytes) {
  if (bytes < 1000) return `${bytes} B`;
  const units = ["kB", "MB", "GB"];
  let value = bytes / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) { value /= 1000; unit += 1; }
  return `${value.toPrecision(3)} ${units[unit]}`;
}

const logo = `<svg class="logo-mark" viewBox="0 0 44 51" aria-hidden="true"><circle cx="35.5" cy="5" r="3.6" fill="#767677"/><circle cx="7" cy="45.5" r="4.4" fill="#989798"/><circle cx="5.6" cy="7.4" r="2.6" fill="#6F7070"/><path d="M22 37.4c-7.7 0-14.4-2.8-17.9-6.9a19 19 0 0 0 35.8 0c-3.5 4.1-10.2 6.9-17.9 6.9Z" fill="#F37726"/><path d="M22 13.6c7.7 0 14.4 2.8 17.9 6.9a19 19 0 0 0-35.8 0c3.5-4.1 10.2-6.9 17.9-6.9Z" fill="#F37726"/></svg><span class="logo-text">jupyter</span>`;
const icons = {
  home: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 1 7.6h2v6.9h3.8v-4.4h2.4v4.4H13V7.6h2Z" fill="currentColor"/></svg>',
  folder: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 3.5h4.6l1.4 1.5h7v8.5h-13Z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>',
  notebook: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.5c0-.6.4-1 1-1h9v11H4a1 1 0 0 0-1 1Zm0 11c0 .6.4 1 1 1h9v-2" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M5.5 4.5h5" stroke="currentColor" stroke-width="1.1"/></svg>',
  file: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.5h6.5l3.5 3.5v9.5H3Z M9.5 1.5V5H13" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>',
  save: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h10l2 2v10H2Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M4.5 2v4h6V2M4.5 14V9.5h7V14" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  copy: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 5.5h8v9h-8Z M10.5 5.5v-4h-8v9h3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14V2.5M3 7.5l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  down: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v11.5M3 8.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
};

function siteHeader(extra = "") {
  return `<div id="header-container" class="container"><a id="ipython_notebook" href="/tree" title="dashboard">${logo}</a>${extra}</div>`;
}

function menubar(menus, right = "") {
  const item = (entry) => {
    if (entry === "-") return '<li class="divider" role="separator"></li>';
    if (entry.href) return `<li><a href="${escapeHTML(entry.href)}"${entry.external ? ' target="_blank" rel="noreferrer"' : ""}${entry.download ? " download" : ""}>${escapeHTML(entry.label)}</a></li>`;
    return `<li><button type="button" data-action="${entry.action}">${escapeHTML(entry.label)}</button></li>`;
  };
  const menu = ([label, entries]) => entries
    ? `<li class="menu"><button class="menu-toggle" type="button" aria-haspopup="true" aria-expanded="false">${label}</button><ul class="dropdown-menu" hidden>${entries.map(item).join("")}</ul></li>`
    : `<li class="menu"><span class="menu-toggle is-inert">${label}</span></li>`;
  return `<nav id="menubar" aria-label="Notebook menu"><ul class="menus">${menus.map(menu).join("")}</ul><div class="menubar-right">${right}</div></nav>`;
}

function setupMenus(actions) {
  const toggles = [...document.querySelectorAll("button.menu-toggle")];
  const close = () => toggles.forEach((toggle) => { toggle.setAttribute("aria-expanded", "false"); toggle.nextElementSibling.hidden = true; });
  const open = (toggle) => { close(); toggle.setAttribute("aria-expanded", "true"); toggle.nextElementSibling.hidden = false; };
  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => (toggle.getAttribute("aria-expanded") === "true" ? close() : open(toggle)));
    toggle.addEventListener("mouseenter", () => { if (toggles.some((other) => other.getAttribute("aria-expanded") === "true")) open(toggle); });
  });
  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (action) { close(); actions[action.dataset.action]?.(); return; }
    if (!event.target.closest(".menu")) close();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
}

function render(markup, title) {
  app.innerHTML = markup;
  app.setAttribute("aria-busy", "false");
  document.title = title;
}

function notFound() {
  document.body.className = "page-tree";
  render(`<header id="header">${siteHeader()}</header><main class="container error-page"><h1>404 : Not Found</h1><p>You are requesting a page that does not exist!</p></main>`, "404 - Jupyter Notebook");
}

function listChildren(manifest, path) {
  const prefix = path ? `${path}/` : "";
  const entries = new Map();
  for (const file of manifest) {
    if (!file.path.startsWith(prefix)) continue;
    const [name, ...rest] = file.path.slice(prefix.length).split("/");
    const entry = entries.get(name) ?? { name, path: prefix + name, type: rest.length ? "directory" : extensionOf(name) === "ipynb" ? "notebook" : "file", modified: file.modified, size: rest.length ? null : file.size };
    if (file.modified > entry.modified) entry.modified = file.modified;
    entries.set(name, entry);
  }
  const order = { directory: 0, notebook: 1, file: 2 };
  return [...entries.values()].sort((a, b) => order[a.type] - order[b.type] || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}

function treeView(manifest, path) {
  const isDirectory = !path || manifest.some((file) => file.path.startsWith(`${path}/`));
  if (!isDirectory) return notFound();
  const segments = path ? path.split("/") : [];
  const crumbs = segments.map((segment, index) => `<span class="crumb-divider">/</span><a href="${treeUrl(segments.slice(0, index + 1).join("/"))}">${escapeHTML(segment)}</a>`).join("");
  const row = (entry) => {
    const external = entry.type === "file" && !textExtensions.has(extensionOf(entry.name));
    const href = entry.type === "directory" ? treeUrl(entry.path) : fileUrl(entry.path);
    return `<div class="list-item"><div class="item-name"><span class="item-icon ${entry.type}-icon">${icons[entry.type === "directory" ? "folder" : entry.type]}</span><a class="item-link" href="${href}"${external ? " download" : ""}>${escapeHTML(entry.name)}</a></div><div class="item-modified" title="${escapeHTML(new Date(entry.modified).toLocaleString())}">${escapeHTML(timeAgo(entry.modified))}</div><div class="item-size">${entry.size == null ? "" : escapeHTML(fileSize(entry.size))}</div></div>`;
  };
  const parent = path ? `<div class="list-item"><div class="item-name"><span class="item-icon directory-icon">${icons.folder}</span><a class="item-link" href="${treeUrl(parentOf(path))}">..</a></div><div class="item-modified"></div><div class="item-size"></div></div>` : "";
  const children = listChildren(manifest, path);
  document.body.className = "page-tree";
  render(`<header id="header">${siteHeader()}</header>
    <main class="container" id="tree">
      <ul class="nav-tabs" role="tablist"><li class="active"><a href="/tree" role="tab" aria-selected="true">Files</a></li></ul>
      <div class="list-container">
        <div class="list-header"><div class="breadcrumb"><a href="/tree" aria-label="Home">${icons.home}</a>${crumbs}</div><div class="list-columns" aria-hidden="true"><span class="item-name-col">Name <span class="sort-arrow">↓</span></span><span class="item-modified">Last Modified</span><span class="item-size">File size</span></div></div>
        ${parent}${children.map(row).join("") || '<div class="list-placeholder">The notebook list is empty.</div>'}
      </div>
    </main>`, path ? `${baseName(path)}/` : "Home Page - Select or create a notebook");
}

function renderMarkdown(source, directory) {
  const lines = String(source ?? "").replace(/\r/g, "").split("\n");
  const output = [];
  let paragraph = [];
  let list = { type: null, items: [] };
  let quote = [];
  let code = null;
  const inline = (text) => escapeHTML(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img src="${/^(https?:|data:|\/)/.test(src) ? src : contentUrl(`${directory}/${src}`)}" alt="${alt}">`)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  const flush = () => {
    if (paragraph.length) output.push(`<p>${inline(paragraph.join(" "))}</p>`);
    if (list.items.length) output.push(`<${list.type}${list.start > 1 ? ` start="${list.start}"` : ""}>${list.items.map((entry) => `<li>${inline(entry)}</li>`).join("")}</${list.type}>`);
    if (quote.length) output.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
    paragraph = []; list = { type: null, items: [] }; quote = [];
  };
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (code) { output.push(`<pre><code>${highlightPython(code.join("\n"))}</code></pre>`); code = null; }
      else { flush(); code = []; }
      continue;
    }
    if (code) { code.push(line); continue; }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    const quoted = line.match(/^>\s?(.*)$/);
    if (/^\s*(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/.test(line)) { flush(); output.push("<hr>"); }
    else if (heading) {
      flush();
      const id = heading[2].trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
      output.push(`<h${heading[1].length} id="${escapeHTML(id)}">${inline(heading[2])}<a class="anchor-link" href="#${escapeHTML(id)}">¶</a></h${heading[1].length}>`);
    } else if (bullet || numbered) {
      const type = bullet ? "ul" : "ol";
      if (paragraph.length || quote.length || (list.type && list.type !== type)) flush();
      if (!list.items.length) list.start = numbered ? Number(numbered[1]) : 1;
      list.type = type;
      list.items.push(bullet ? bullet[1] : numbered[2]);
    } else if (quoted) { if (paragraph.length || list.items.length) flush(); quote.push(quoted[1]); }
    else if (!line.trim()) flush();
    else if (list.items.length && /^\s+/.test(line)) list.items[list.items.length - 1] += ` ${line.trim()}`;
    else { if (list.items.length || quote.length) flush(); paragraph.push(line.trim()); }
  }
  if (code) output.push(`<pre><code>${highlightPython(code.join("\n"))}</code></pre>`);
  flush();
  return output.join("");
}

const keywords = "as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|lambda|nonlocal|pass|raise|return|try|while|with|yield|True|False|None";
const builtins = "abs|all|any|bool|dict|enumerate|filter|float|format|getattr|hasattr|input|int|isinstance|len|list|map|max|min|open|print|range|round|set|sorted|str|sum|super|tuple|type|zip";
const pythonTokens = new RegExp(`(#.*)|([rRbBfFuU]{0,2}(?:"""[\\s\\S]*?"""|'''[\\s\\S]*?'''|"(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'))|((?<=\\b(?:def|class)\\s+)[A-Za-z_]\\w*)|\\b(and|or|not|in|is)\\b|\\b(${keywords})\\b|\\b(${builtins})(?=\\s*\\()|\\b(\\d+(?:\\.\\d+)?(?:e[-+]?\\d+)?)\\b|([-+*/%=<>!&|^~@]+)`, "g");
const tokenClasses = [null, "cm-comment", "cm-string", "cm-def", "cm-operator cm-word", "cm-keyword", "cm-builtin", "cm-number", "cm-operator"];

function highlightPython(source) {
  let output = "";
  let last = 0;
  for (const match of source.matchAll(pythonTokens)) {
    const group = match.findIndex((value, index) => index > 0 && value !== undefined);
    output += `${escapeHTML(source.slice(last, match.index))}<span class="${tokenClasses[group]}">${escapeHTML(match[0])}</span>`;
    last = match.index + match[0].length;
  }
  return output + escapeHTML(source.slice(last));
}

const ansiColors = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];

function ansiToHTML(text) {
  let output = "";
  let classes = new Set();
  for (const [index, part] of text.split(/\x1b\[([\d;]*)m/).entries()) {
    if (index % 2 === 0) { output += classes.size ? `<span class="${[...classes].join(" ")}">${escapeHTML(part)}</span>` : escapeHTML(part); continue; }
    for (const code of (part || "0").split(";").map(Number)) {
      if (code === 0) classes = new Set();
      else if (code === 1) classes.add("ansi-bold");
      else if (code === 39) classes = new Set([...classes].filter((name) => !name.endsWith("-fg")));
      else if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) {
        classes = new Set([...classes].filter((name) => !name.endsWith("-fg")));
        classes.add(`ansi-${ansiColors[code % 10]}${code >= 90 ? "-intense" : ""}-fg`);
      } else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) classes.add(`ansi-${ansiColors[code % 10]}-bg`);
    }
  }
  return output;
}

function sanitizeOutputHTML(source) {
  const doc = new DOMParser().parseFromString(String(source), "text/html");
  const allowed = new Set(["TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "CAPTION", "P", "BR", "B", "STRONG", "I", "EM", "SPAN", "DIV", "PRE", "CODE", "UL", "OL", "LI", "A", "H1", "H2", "H3", "H4"]);
  const clean = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!allowed.has(child.tagName)) { child.replaceWith(document.createTextNode(child.textContent ?? "")); return; }
        [...child.attributes].forEach((attr) => {
          const safeLink = child.tagName === "A" && attr.name === "href" && /^(https?:|mailto:)/i.test(attr.value);
          const safe = safeLink || attr.name === "title" || (["colspan", "rowspan"].includes(attr.name) && /^\d{1,3}$/.test(attr.value));
          if (!safe) child.removeAttribute(attr.name);
        });
        if (child.tagName === "A") { child.setAttribute("rel", "noreferrer"); child.setAttribute("target", "_blank"); }
        clean(child);
      } else if (child.nodeType !== Node.TEXT_NODE) child.remove();
    });
  };
  clean(doc.body);
  return doc.body.innerHTML;
}

function outputMarkup(output) {
  const data = output.data ?? {};
  const prompt = output.output_type === "execute_result" ? `Out[${output.execution_count ?? " "}]:` : "";
  const area = (kind, content) => `<div class="output_area"><div class="prompt output_prompt">${prompt}</div><div class="output_subarea ${kind}">${content}</div></div>`;
  if (output.output_type === "error") return area("output_text output_error", `<pre>${ansiToHTML(join(output.traceback ?? `${output.ename}: ${output.evalue}`).replace(/\n?$/, ""))}</pre>`);
  if (output.output_type === "stream") return area(`output_text output_stream output_${output.name ?? "stdout"}`, `<pre>${ansiToHTML(join(output.text))}</pre>`);
  for (const type of ["image/png", "image/jpeg"]) if (data[type]) return area("output_png", `<img src="data:${type};base64,${escapeHTML(join(data[type]).replace(/\s/g, ""))}" alt="">`);
  if (data["image/svg+xml"]) return area("output_svg", `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(join(data["image/svg+xml"]))}" alt="">`);
  if (data["text/html"]) return area("output_html rendered_html", sanitizeOutputHTML(join(data["text/html"])));
  if (data["text/plain"] ?? output.text) return area("output_text", `<pre>${ansiToHTML(join(data["text/plain"] ?? output.text))}</pre>`);
  return "";
}

function codeBlock(source) {
  const lineCount = source.split("\n").length;
  return `<div class="input_area"><div class="CodeMirror"><div class="CodeMirror-gutter" aria-hidden="true">${Array.from({ length: lineCount }, (_, index) => index + 1).join("\n")}</div><pre class="CodeMirror-code">${highlightPython(source)}</pre></div></div>`;
}

function cellMarkup(cell, index, directory) {
  const source = join(cell.source);
  if (cell.cell_type === "markdown") return `<div class="cell text_cell rendered" tabindex="-1" data-index="${index}" data-type="markdown"><div class="prompt input_prompt"></div><div class="inner_cell"><div class="text_cell_render rendered_html">${renderMarkdown(source, directory)}</div></div></div>`;
  if (cell.cell_type === "raw") return `<div class="cell raw_cell" tabindex="-1" data-index="${index}" data-type="raw"><div class="input"><div class="prompt input_prompt"></div><div class="inner_cell">${codeBlock(source)}</div></div></div>`;
  const outputs = (cell.outputs ?? []).map(outputMarkup).join("");
  return `<div class="cell code_cell" tabindex="-1" data-index="${index}" data-type="code"><div class="input"><div class="prompt input_prompt">In&nbsp;[${cell.execution_count ?? "&nbsp;"}]:</div><div class="inner_cell">${codeBlock(source)}</div></div>${outputs ? `<div class="output_wrapper"><div class="output">${outputs}</div></div>` : ""}</div>`;
}

function toPythonScript(notebook) {
  const parts = ["#!/usr/bin/env python\n# coding: utf-8\n"];
  for (const cell of notebook.cells ?? []) {
    const source = join(cell.source);
    if (cell.cell_type === "code") parts.push(`# In[${cell.execution_count ?? " "}]:\n\n\n${source}\n`);
    else if (cell.cell_type === "markdown") parts.push(source.split("\n").map((line) => `# ${line}`.trimEnd()).join("\n") + "\n");
  }
  return `${parts.join("\n\n")}\n`;
}

function downloadText(text, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: "text/x-python" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function flashNotification(message) {
  const widget = document.querySelector("#notification");
  widget.textContent = message;
  widget.hidden = false;
  window.clearTimeout(flashNotification.timer);
  flashNotification.timer = window.setTimeout(() => { widget.hidden = true; }, 1800);
}

function viewActions() {
  return {
    toggleHeader: () => document.querySelector("#header-container").classList.toggle("is-hidden"),
    toggleToolbar: () => document.querySelector("#maintoolbar")?.classList.toggle("is-hidden"),
    toggleLineNumbers: () => document.body.classList.toggle("show-line-numbers"),
  };
}

async function notebookView(manifest, path) {
  const entry = manifest.find((file) => file.path === path);
  if (!entry || extensionOf(path) !== "ipynb") return notFound();
  const directory = parentOf(path);
  const name = baseName(path).replace(/\.ipynb$/, "");
  const fileHref = contentUrl(path);
  document.body.className = "page-notebook";
  render(`<header id="header">
      ${siteHeader(`<span id="save_widget"><span id="notebook_name">${escapeHTML(name)}</span><span class="checkpoint_status" title="${escapeHTML(new Date(entry.modified).toLocaleString())}">Last Checkpoint: ${escapeHTML(timeAgo(entry.modified))}</span></span>`)}
      <div id="menubar-container" class="container">
        ${menubar([
          ["File", [{ label: "Open...", href: treeUrl(directory) }, "-", { label: "Download as Notebook (.ipynb)", href: fileHref, download: true }, { label: "Download as Python (.py)", action: "downloadPython" }]],
          ["Edit", [{ label: "Copy Cells", action: "copyCell" }, "-", { label: "Select Previous Cell", action: "selectPrevious" }, { label: "Select Next Cell", action: "selectNext" }]],
          ["View", [{ label: "Toggle Header", action: "toggleHeader" }, { label: "Toggle Toolbar", action: "toggleToolbar" }, { label: "Toggle Line Numbers", action: "toggleLineNumbers" }]],
          ["Insert"],
          ["Cell", [{ label: "Toggle Current Output", action: "toggleOutput" }, { label: "Toggle All Output", action: "toggleAllOutput" }]],
          ["Kernel"],
          ["Widgets"],
          ["Help", [{ label: "Markdown", href: "https://help.github.com/articles/markdown-basics/", external: true }, "-", { label: "Python", href: "https://docs.python.org/3/", external: true }, { label: "NumPy", href: "https://numpy.org/doc/stable/", external: true }, { label: "Matplotlib", href: "https://matplotlib.org/stable/contents.html", external: true }, { label: "pandas", href: "https://pandas.pydata.org/docs/", external: true }, { label: "scikit-learn", href: "https://scikit-learn.org/stable/", external: true }]],
        ], `<span id="notification" class="notification_widget" role="status" hidden></span><span class="notification_widget readonly">Read Only</span><span class="kernel_indicator_name"></span><span class="kernel_indicator" title="Kernel Idle" aria-label="Kernel Idle"></span>`)}
        <div id="maintoolbar" role="toolbar" aria-label="Notebook toolbar">
          <div class="btn-group"><a class="btn" href="${fileHref}" download title="Download notebook">${icons.save}</a></div>
          <div class="btn-group"><button class="btn" type="button" data-action="copyCell" title="copy selected cells">${icons.copy}</button></div>
          <div class="btn-group"><button class="btn" type="button" data-action="selectPrevious" title="select cell above">${icons.up}</button><button class="btn" type="button" data-action="selectNext" title="select cell below">${icons.down}</button></div>
          <div class="btn-group"><select id="cell_type" class="form-control" disabled aria-label="Cell type"><option value="code">Code</option><option value="markdown">Markdown</option><option value="raw">Raw NBConvert</option></select></div>
        </div>
      </div>
    </header>
    <div id="site"><main id="notebook-container" class="container"><div class="notebook-loading">Loading…</div></main></div>`, `${name} - Jupyter Notebook`);
  app.setAttribute("aria-busy", "true");

  let notebook;
  let selected = 0;
  const cells = () => [...document.querySelectorAll("#notebook-container .cell")];
  const select = (index, focus = true) => {
    const list = cells();
    if (!list.length) return;
    selected = Math.max(0, Math.min(index, list.length - 1));
    list.forEach((cell, position) => cell.classList.toggle("selected", position === selected));
    document.querySelector("#cell_type").value = list[selected].dataset.type;
    if (focus) { list[selected].focus({ preventScroll: true }); list[selected].scrollIntoView({ block: "nearest" }); }
  };

  setupMenus({
    ...viewActions(),
    downloadPython: () => notebook && downloadText(toPythonScript(notebook), `${name}.py`),
    copyCell: async () => {
      if (!notebook) return;
      try { await navigator.clipboard.writeText(join(notebook.cells[selected].source)); flashNotification("Copied cell"); }
      catch { flashNotification("Copy failed"); }
    },
    selectPrevious: () => select(selected - 1),
    selectNext: () => select(selected + 1),
    toggleOutput: () => cells()[selected]?.querySelector(".output_wrapper")?.classList.toggle("is-collapsed"),
    toggleAllOutput: () => {
      const wrappers = [...document.querySelectorAll(".output_wrapper")];
      const collapse = wrappers.some((wrapper) => !wrapper.classList.contains("is-collapsed"));
      wrappers.forEach((wrapper) => wrapper.classList.toggle("is-collapsed", collapse));
    },
  });

  try {
    const response = await fetch(fileHref);
    if (!response.ok) throw new Error(`Notebook request returned ${response.status}.`);
    notebook = await response.json();
    document.querySelector(".kernel_indicator_name").textContent = notebook.metadata?.kernelspec?.display_name ?? "Python 3 (ipykernel)";
    const container = document.querySelector("#notebook-container");
    container.innerHTML = (notebook.cells ?? []).map((cell, index) => cellMarkup(cell, index, directory)).join("") || '<div class="cell"><div class="prompt"></div><div class="inner_cell"></div></div>';
    container.addEventListener("click", (event) => {
      const cell = event.target.closest(".cell");
      if (cell) select(Number(cell.dataset.index), false);
    });
    select(0, false);
  } catch (error) {
    document.querySelector("#notebook-container").innerHTML = `<div class="notebook-error" role="alert"><h2>Error loading notebook</h2><p>${escapeHTML(error.message)}</p></div>`;
  }
  app.setAttribute("aria-busy", "false");

  document.addEventListener("keydown", (event) => {
    const target = event.target instanceof Element ? event.target : document.body;
    if (target.closest("input, select, textarea, .menu") || event.metaKey || event.ctrlKey || event.altKey) return;
    const onCell = target.closest(".cell");
    if (event.key === "j" || (onCell && event.key === "ArrowDown")) { event.preventDefault(); select(selected + 1); }
    if (event.key === "k" || (onCell && event.key === "ArrowUp")) { event.preventDefault(); select(selected - 1); }
  });
}

const PREVIEW_BYTES = 256 * 1024;
const PREVIEW_LINES = 1000;

async function editView(manifest, path) {
  const entry = manifest.find((file) => file.path === path);
  if (!entry || !textExtensions.has(extensionOf(path))) return notFound();
  const fileHref = contentUrl(path);
  const mode = { json: "JSON", py: "Python", md: "Markdown" }[extensionOf(path)] ?? "Plain Text";
  document.body.className = "page-edit show-line-numbers";
  render(`<header id="header">
      ${siteHeader(`<span id="save_widget"><span id="notebook_name">${escapeHTML(baseName(path))}</span><span class="checkpoint_status" title="${escapeHTML(new Date(entry.modified).toLocaleString())}">Last Checkpoint: ${escapeHTML(timeAgo(entry.modified))}</span></span>`)}
      <div id="menubar-container" class="container">
        ${menubar([
          ["File", [{ label: "Open...", href: treeUrl(parentOf(path)) }, "-", { label: "Download", href: fileHref, download: true }]],
          ["Edit"],
          ["View", [{ label: "Toggle Header", action: "toggleHeader" }, { label: "Toggle Line Numbers", action: "toggleLineNumbers" }]],
          ["Language"],
        ], `<span class="notification_widget readonly">Read Only</span><span class="mode_indicator">${mode}</span>`)}
      </div>
    </header>
    <div id="site"><main id="texteditor-container" class="container"><div class="notebook-loading">Loading…</div></main></div>`, `${baseName(path)} - Jupyter Text Editor`);
  setupMenus(viewActions());

  const container = document.querySelector("#texteditor-container");
  try {
    const response = await fetch(fileHref, { headers: { Range: `bytes=0-${PREVIEW_BYTES - 1}` } });
    if (!response.ok) throw new Error(`File request returned ${response.status}.`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (text.length < PREVIEW_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    let lines = text.replace(/\r/g, "").split("\n");
    const truncated = entry.size > text.length || lines.length > PREVIEW_LINES;
    if (entry.size > text.length) lines.pop();
    lines = lines.slice(0, PREVIEW_LINES);
    if (lines.at(-1) === "") lines.pop();
    const source = lines.join("\n");
    container.innerHTML = `<div class="CodeMirror editor"><div class="CodeMirror-gutter" aria-hidden="true">${lines.map((_, index) => index + 1).join("\n")}</div><pre class="CodeMirror-code">${extensionOf(path) === "py" ? highlightPython(source) : escapeHTML(source)}</pre></div>${truncated ? `<p class="truncated-note">Showing the first ${lines.length.toLocaleString()} lines. <a href="${fileHref}" download>Download the full file</a> (${escapeHTML(fileSize(entry.size))}).</p>` : ""}`;
  } catch (error) {
    container.innerHTML = `<div class="notebook-error" role="alert"><h2>Error loading file</h2><p>${escapeHTML(error.message)}</p></div>`;
  }
}

async function start() {
  const route = decodeURIComponent(location.pathname).replace(/\/+$/, "");
  const [, view = "", ...rest] = route.split("/");
  const path = rest.join("/");
  let manifest;
  try {
    const response = await fetch(contentUrl("manifest.json"));
    if (!response.ok) throw new Error(`Manifest request returned ${response.status}.`);
    manifest = await response.json();
  } catch (error) {
    document.body.className = "page-tree";
    return render(`<header id="header">${siteHeader()}</header><main class="container error-page"><h1>Error</h1><p>${escapeHTML(error.message)}</p></main>`, "Error - Jupyter Notebook");
  }
  if (view === "" || view === "tree") return treeView(manifest, path);
  if (view === "notebooks") return notebookView(manifest, path);
  if (view === "edit") return editView(manifest, path);
  notFound();
}

start();
