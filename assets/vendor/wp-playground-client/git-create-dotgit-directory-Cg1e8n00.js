import { g as u, h as m } from "./isomorphic-git-internals-DDKI55xw.js";
const p = m.deflate, $ = /^[0-9a-f]{40}$/i;
async function b(o) {
  const n = {}, a = new TextEncoder();
  return await Promise.all(
    o.map(async ({ oid: s, type: e, body: c }) => {
      if (!s || c.length === 0)
        return;
      const i = a.encode(`${e} ${c.length}\0`), t = new Uint8Array(i.length + c.length);
      t.set(i, 0), t.set(c, i.length);
      const r = await p(t), f = s.slice(0, 2), g = s.slice(2);
      n[`.git/objects/${f}/${g}`] = r;
    })
  ), n;
}
function k(o, n, a) {
  const s = (o == null ? void 0 : o.trim()) ?? "";
  let e = null;
  switch (n) {
    case "branch":
      s && (e = `refs/heads/${s}`);
      break;
    case "refname":
      e = s || null;
      break;
    case "tag":
      s.startsWith("refs/") ? e = s : s && (e = `refs/tags/${s}`);
      break;
    case "commit":
      e = null;
      break;
    default:
      s.startsWith("refs/") ? e = s : $.test(s) ? e = null : s && s !== "HEAD" && (e = `refs/heads/${s}`);
      break;
  }
  const c = e ? `ref: ${e}
` : `${a}
`, i = e && e.startsWith("refs/heads/") ? e : void 0, t = i == null ? void 0 : i.slice(11), r = e && e.startsWith("refs/tags/") ? e : void 0, f = r == null ? void 0 : r.slice(10);
  return {
    headContent: c,
    branchName: t,
    branchRef: i,
    tagName: f
  };
}
function w(o, {
  branchName: n,
  partialCloneFilter: a
}) {
  const e = [
    "[core]",
    `	repositoryformatversion = ${a ? 1 : 0}`,
    "	filemode = true",
    "	bare = false",
    "	logallrefupdates = true",
    "	ignorecase = true",
    "	precomposeunicode = true",
    '[remote "origin"]',
    `	url = ${o}`,
    "	fetch = +refs/heads/*:refs/remotes/origin/*",
    "	fetch = +refs/tags/*:refs/tags/*"
  ];
  return a && (e.push("	promisor = true"), e.push(`	partialclonefilter = ${a}`), e.push("[extensions]"), e.push("	partialclone = origin")), n && e.push(
    `[branch "${n}"]`,
    "	remote = origin",
    `	merge = refs/heads/${n}`
  ), e.join(`
`) + `
`;
}
async function N({
  repoUrl: o,
  commitHash: n,
  ref: a,
  refType: s,
  objects: e,
  fileOids: c,
  pathPrefix: i
}) {
  const t = {}, r = k(a, s, n);
  t[".git/HEAD"] = r.headContent, t[".git/config"] = w(o, {
    branchName: r.branchName
  }), t[".git/description"] = `WordPress Playground clone
`, t[".git/shallow"] = `${n}
`, t[".git/refs/heads/.gitkeep"] = "", t[".git/refs/tags/.gitkeep"] = "", t[".git/refs/remotes/.gitkeep"] = "", r.branchRef && r.branchName && (t[".git/logs/HEAD"] = `ref: ${r.branchRef}
`, t[`.git/${r.branchRef}`] = `${n}
`, t[`.git/refs/remotes/origin/${r.branchName}`] = `${n}
`, t[".git/refs/remotes/origin/HEAD"] = `ref: refs/remotes/origin/${r.branchName}
`), r.tagName && (t[`.git/refs/tags/${r.tagName}`] = `${n}
`), Object.assign(t, await b(e));
  const f = new u();
  for (const [l, h] of Object.entries(c)) {
    const d = l.substring(i.length).replace(/^\/+/, "");
    f.insert({
      filepath: d,
      oid: h,
      stats: {
        ctimeSeconds: 0,
        ctimeNanoseconds: 0,
        mtimeSeconds: 0,
        mtimeNanoseconds: 0,
        dev: 0,
        ino: 0,
        mode: 33188,
        // Regular file
        uid: 0,
        gid: 0,
        size: 0
      }
    });
  }
  const g = await f.toObject();
  return t[".git/index"] = Uint8Array.from(g), t;
}
export {
  N as createDotGitDirectory
};
