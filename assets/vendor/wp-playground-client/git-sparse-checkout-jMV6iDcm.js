import { c as w, G as f, p as x, a as k, O as A, b as T, d as B, e as E, f as P } from "./isomorphic-git-internals-DDKI55xw.js";
import { G as g } from "./index-laaXFKjm.js";
typeof globalThis.Buffer > "u" && (globalThis.Buffer = P.Buffer);
async function D(e, t, o, a) {
  const n = (a == null ? void 0 : a.additionalHeaders) || {}, r = await O(
    e,
    t,
    n
  ), i = await _(r.idx, t, o), c = o.map((l) => i[l].oid), s = c.length > 0 ? await F(e, c, n) : null, d = {};
  if (await Promise.all(
    o.map(async (l) => {
      s && (d[l] = await v(
        s.idx,
        i[l].oid
      ));
    })
  ), !(a != null && a.withObjects))
    return { files: d };
  const u = [], p = await r.idx.toBuffer();
  if (u.push({
    name: `pack-${r.idx.packfileSha}`,
    pack: r.packfile,
    index: h(p),
    promisor: r.promisor
  }), s) {
    const l = await s.idx.toBuffer();
    u.push({
      name: `pack-${s.idx.packfileSha}`,
      pack: s.packfile,
      index: h(l),
      promisor: s.promisor
    });
  }
  const b = {};
  for (const l of o)
    b[l] = i[l].oid;
  return {
    files: d,
    packfiles: u,
    objects: [
      ...await j(r),
      ...await j(s)
    ],
    fileOids: b
  };
}
const I = /^[0-9a-f]{40}$/i;
async function W(e, t, o = {}) {
  const a = await O(
    e,
    t,
    o
  ), n = await S(a.idx, t);
  return n != null && n.object ? $(n) : [];
}
async function z(e, t, o = {}) {
  const a = await R(e, t);
  if (a.resolvedOid)
    return a.resolvedOid;
  const n = await y(e, a.refname, o);
  if (!n)
    throw new Error(`Git ref "${a.refname}" not found at ${e}`);
  return n;
}
function $(e) {
  return e.object.map((t) => {
    if (t.type === "blob")
      return {
        name: t.path,
        type: "file"
      };
    if (t.type === "tree" && t.object)
      return {
        name: t.path,
        type: "folder",
        children: $(t)
      };
  }).filter((t) => !!(t != null && t.name));
}
async function L(e, t, o = {}) {
  const a = Buffer.from(
    await w([
      f.encode(`command=ls-refs
`),
      f.encode(`agent=git/2.37.3
`),
      f.encode(`object-format=sha1
`),
      f.delim(),
      f.encode(`peel
`),
      f.encode(`ref-prefix ${t}
`),
      f.flush()
    ])
  ), n = await fetch(e + "/git-upload-pack", {
    method: "POST",
    headers: {
      Accept: "application/x-git-upload-pack-advertisement",
      "content-type": "application/x-git-upload-pack-request",
      "Content-Length": `${a.length}`,
      "Git-Protocol": "version=2",
      ...o
    },
    body: a
  });
  if (!n.ok)
    throw n.status === 401 || n.status === 403 ? new g(e, n.status) : new Error(
      `Failed to fetch git refs from ${e}: ${n.status} ${n.statusText}`
    );
  const r = {};
  for await (const i of C(n)) {
    const c = i.indexOf(" "), s = i.slice(0, c), u = i.slice(c + 1, i.length - 1).split(" ")[0];
    r[u] = s;
  }
  return r;
}
async function R(e, t) {
  switch (t.type ?? "infer") {
    case "commit":
      return {
        kind: "commit",
        refname: t.value,
        resolvedOid: t.value
      };
    case "branch":
      return {
        kind: "refname",
        refname: `refs/heads/${t.value.trim()}`
      };
    case "tag":
      return {
        kind: "refname",
        refname: `refs/tags/${t.value.trim()}`
      };
    case "refname":
      return {
        kind: "refname",
        refname: t.value.trim()
      };
    case "infer": {
      const a = t.value.trim();
      if (a === "" || a === "HEAD")
        return {
          kind: "refname",
          refname: "HEAD"
        };
      if (a.startsWith("refs/"))
        return {
          kind: "refname",
          refname: a
        };
      if (I.test(a))
        return {
          kind: "commit",
          refname: a,
          resolvedOid: a
        };
      const n = `refs/heads/${a}`, r = await y(e, n);
      if (r)
        return {
          kind: "refname",
          refname: n,
          resolvedOid: r
        };
      const i = `refs/tags/${a}`, c = await y(e, i);
      if (c)
        return {
          kind: "refname",
          refname: i,
          resolvedOid: c
        };
      throw new Error(`Git ref "${t.value}" not found at ${e}`);
    }
    default:
      throw new Error(`Invalid ref type: ${t.type}`);
  }
}
async function y(e, t, o) {
  const a = await L(e, t, o), n = [t, `${t}^{}`];
  for (const r of n) {
    const i = r.trim();
    if (i in a)
      return a[i];
  }
  return null;
}
async function O(e, t, o) {
  const a = Buffer.from(
    await w([
      f.encode(
        `want ${t} multi_ack_detailed no-done side-band-64k thin-pack ofs-delta agent=git/2.37.3 filter 
`
      ),
      f.encode(`filter blob:none
`),
      f.encode(`shallow ${t}
`),
      f.encode(`deepen 1
`),
      f.flush(),
      f.encode(`done
`),
      f.encode(`done
`)
    ])
  ), n = await fetch(e + "/git-upload-pack", {
    method: "POST",
    headers: {
      Accept: "application/x-git-upload-pack-advertisement",
      "content-type": "application/x-git-upload-pack-request",
      "Content-Length": `${a.length}`,
      ...o
    },
    body: a
  });
  if (!n.ok)
    throw n.status === 401 || n.status === 403 ? new g(e, n.status) : new Error(
      `Failed to fetch git objects from ${e}: ${n.status} ${n.statusText}`
    );
  const r = G(n.body), i = await x(r), c = Buffer.from(await w(i.packfile)), s = await k.fromPack({
    pack: c
  }), d = s.read;
  return s.read = async function({ oid: u, ...p }) {
    const b = await d.call(this, { oid: u, ...p });
    return b.oid = u, b;
  }, {
    idx: s,
    packfile: h(c),
    promisor: !0
  };
}
async function S(e, t) {
  const o = await e.read({
    oid: t
  });
  m(o);
  const a = await e.read({ oid: o.object.tree }), n = [a];
  for (; n.length > 0; ) {
    const r = n.pop(), i = await e.read({ oid: r.oid });
    if (m(i), r.object = i.object, i.type === "tree")
      for (const c of i.object)
        c.type === "tree" && n.push(c);
  }
  return a;
}
async function j(e) {
  if (!e)
    return [];
  const t = [], o = /* @__PURE__ */ new Set();
  for (const a of e.idx.hashes ?? []) {
    if (o.has(a))
      continue;
    const n = e.idx.offsets.get(a);
    if (n === void 0)
      continue;
    const { type: r, object: i } = await e.idx.readSlice({ start: n });
    r === "ofs_delta" || r === "ref_delta" || i && (o.add(a), t.push({
      oid: a,
      type: r,
      body: h(i)
    }));
  }
  return t;
}
async function _(e, t, o) {
  const a = await e.read({
    oid: t
  });
  m(a);
  const n = await e.read({ oid: a.object.tree });
  m(n);
  const r = {};
  for (const i of o) {
    let c = n;
    const s = i.split("/");
    for (const d of s) {
      if (c.type !== "tree")
        throw new Error(`Path not found in the repo: ${i}`);
      let u = !1;
      for (const p of c.object)
        if (p.path === d) {
          try {
            c = await e.read({ oid: p.oid }), m(c);
          } catch {
            c = p;
          }
          u = !0;
          break;
        }
      if (!u)
        throw new Error(`Path not found in the repo: ${i}`);
    }
    r[i] = c;
  }
  return r;
}
async function F(e, t, o) {
  const a = Buffer.from(
    await w([
      ...t.map(
        (d) => f.encode(
          `want ${d} multi_ack_detailed no-done side-band-64k thin-pack ofs-delta agent=git/2.37.3 
`
        )
      ),
      f.flush(),
      f.encode(`done
`)
    ])
  ), n = await fetch(e + "/git-upload-pack", {
    method: "POST",
    headers: {
      Accept: "application/x-git-upload-pack-advertisement",
      "content-type": "application/x-git-upload-pack-request",
      "Content-Length": `${a.length}`,
      ...o
    },
    body: a
  });
  if (!n.ok)
    throw n.status === 401 || n.status === 403 ? new g(e, n.status) : new Error(
      `Failed to fetch git objects from ${e}: ${n.status} ${n.statusText}`
    );
  const r = G(n.body), i = await x(r), c = Buffer.from(await w(i.packfile));
  return c.byteLength === 0 ? {
    idx: await k.fromPack({
      pack: c
    }),
    packfile: new Uint8Array(),
    promisor: !1
  } : {
    idx: await k.fromPack({
      pack: c
    }),
    packfile: h(c),
    promisor: !1
  };
}
async function v(e, t) {
  const o = await e.read({ oid: t });
  if (m(o), o.type === "blob")
    return o.object;
  const a = {};
  for (const { path: n, oid: r, type: i } of o.object)
    if (i === "blob") {
      const c = await e.read({ oid: r });
      m(c), a[n] = c.object;
    } else i === "tree" && (a[n] = await v(e, r));
  return a;
}
function m(e) {
  if (e.object instanceof Buffer)
    switch (e.type) {
      case "commit":
        e.object = E.from(e.object).parse();
        break;
      case "tree":
        e.object = B.from(e.object).entries();
        break;
      case "blob":
        e.object = new Uint8Array(e.object), e.format = "content";
        break;
      case "tag":
        e.object = T.from(e.object).parse();
        break;
      default:
        throw new A(
          e.oid,
          e.type,
          "blob|commit|tag|tree"
        );
    }
}
async function* C(e) {
  const t = await e.text();
  let o = 0;
  for (; o <= t.length; ) {
    const a = parseInt(t.substring(o, o + 4), 16);
    if (a === 0)
      break;
    yield t.substring(o + 4, o + a), o += a;
  }
}
function G(e) {
  if (e[Symbol.asyncIterator])
    return e;
  const t = e.getReader();
  return {
    next() {
      return t.read();
    },
    return() {
      return t.releaseLock(), {};
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
function h(e) {
  return e instanceof Uint8Array, Uint8Array.from(e);
}
export {
  g as GitAuthenticationError,
  W as listGitFiles,
  L as listGitRefs,
  z as resolveCommitHash,
  D as sparseCheckout
};
