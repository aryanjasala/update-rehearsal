var uo = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Ct(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var jn = {}, Er = {};
Er.byteLength = Ys;
Er.toByteArray = Vs;
Er.fromByteArray = ef;
var me = [], ce = [], Xs = typeof Uint8Array < "u" ? Uint8Array : Array, Dr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for (var et = 0, Ks = Dr.length; et < Ks; ++et)
  me[et] = Dr[et], ce[Dr.charCodeAt(et)] = et;
ce[45] = 62;
ce[95] = 63;
function lo(e) {
  var t = e.length;
  if (t % 4 > 0)
    throw new Error("Invalid string. Length must be a multiple of 4");
  var r = e.indexOf("=");
  r === -1 && (r = t);
  var n = r === t ? 0 : 4 - r % 4;
  return [r, n];
}
function Ys(e) {
  var t = lo(e), r = t[0], n = t[1];
  return (r + n) * 3 / 4 - n;
}
function Ws(e, t, r) {
  return (t + r) * 3 / 4 - r;
}
function Vs(e) {
  var t, r = lo(e), n = r[0], i = r[1], a = new Xs(Ws(e, n, i)), s = 0, o = i > 0 ? n - 4 : n, h;
  for (h = 0; h < o; h += 4)
    t = ce[e.charCodeAt(h)] << 18 | ce[e.charCodeAt(h + 1)] << 12 | ce[e.charCodeAt(h + 2)] << 6 | ce[e.charCodeAt(h + 3)], a[s++] = t >> 16 & 255, a[s++] = t >> 8 & 255, a[s++] = t & 255;
  return i === 2 && (t = ce[e.charCodeAt(h)] << 2 | ce[e.charCodeAt(h + 1)] >> 4, a[s++] = t & 255), i === 1 && (t = ce[e.charCodeAt(h)] << 10 | ce[e.charCodeAt(h + 1)] << 4 | ce[e.charCodeAt(h + 2)] >> 2, a[s++] = t >> 8 & 255, a[s++] = t & 255), a;
}
function Js(e) {
  return me[e >> 18 & 63] + me[e >> 12 & 63] + me[e >> 6 & 63] + me[e & 63];
}
function Qs(e, t, r) {
  for (var n, i = [], a = t; a < r; a += 3)
    n = (e[a] << 16 & 16711680) + (e[a + 1] << 8 & 65280) + (e[a + 2] & 255), i.push(Js(n));
  return i.join("");
}
function ef(e) {
  for (var t, r = e.length, n = r % 3, i = [], a = 16383, s = 0, o = r - n; s < o; s += a)
    i.push(Qs(e, s, s + a > o ? o : s + a));
  return n === 1 ? (t = e[r - 1], i.push(
    me[t >> 2] + me[t << 4 & 63] + "=="
  )) : n === 2 && (t = (e[r - 2] << 8) + e[r - 1], i.push(
    me[t >> 10] + me[t >> 4 & 63] + me[t << 2 & 63] + "="
  )), i.join("");
}
var Gn = {};
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
Gn.read = function(e, t, r, n, i) {
  var a, s, o = i * 8 - n - 1, h = (1 << o) - 1, u = h >> 1, l = -7, _ = r ? i - 1 : 0, v = r ? -1 : 1, g = e[t + _];
  for (_ += v, a = g & (1 << -l) - 1, g >>= -l, l += o; l > 0; a = a * 256 + e[t + _], _ += v, l -= 8)
    ;
  for (s = a & (1 << -l) - 1, a >>= -l, l += n; l > 0; s = s * 256 + e[t + _], _ += v, l -= 8)
    ;
  if (a === 0)
    a = 1 - u;
  else {
    if (a === h)
      return s ? NaN : (g ? -1 : 1) * (1 / 0);
    s = s + Math.pow(2, n), a = a - u;
  }
  return (g ? -1 : 1) * s * Math.pow(2, a - n);
};
Gn.write = function(e, t, r, n, i, a) {
  var s, o, h, u = a * 8 - i - 1, l = (1 << u) - 1, _ = l >> 1, v = i === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, g = n ? 0 : a - 1, F = n ? 1 : -1, S = t < 0 || t === 0 && 1 / t < 0 ? 1 : 0;
  for (t = Math.abs(t), isNaN(t) || t === 1 / 0 ? (o = isNaN(t) ? 1 : 0, s = l) : (s = Math.floor(Math.log(t) / Math.LN2), t * (h = Math.pow(2, -s)) < 1 && (s--, h *= 2), s + _ >= 1 ? t += v / h : t += v * Math.pow(2, 1 - _), t * h >= 2 && (s++, h /= 2), s + _ >= l ? (o = 0, s = l) : s + _ >= 1 ? (o = (t * h - 1) * Math.pow(2, i), s = s + _) : (o = t * Math.pow(2, _ - 1) * Math.pow(2, i), s = 0)); i >= 8; e[r + g] = o & 255, g += F, o /= 256, i -= 8)
    ;
  for (s = s << i | o, u += i; u > 0; e[r + g] = s & 255, g += F, s /= 256, u -= 8)
    ;
  e[r + g - F] |= S * 128;
};
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
(function(e) {
  var t = Er, r = Gn, n = typeof Symbol == "function" && typeof Symbol.for == "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
  e.Buffer = o, e.SlowBuffer = x, e.INSPECT_MAX_BYTES = 50;
  var i = 2147483647;
  e.kMaxLength = i, o.TYPED_ARRAY_SUPPORT = a(), !o.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error(
    "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
  );
  function a() {
    try {
      var d = new Uint8Array(1), f = { foo: function() {
        return 42;
      } };
      return Object.setPrototypeOf(f, Uint8Array.prototype), Object.setPrototypeOf(d, f), d.foo() === 42;
    } catch {
      return !1;
    }
  }
  Object.defineProperty(o.prototype, "parent", {
    enumerable: !0,
    get: function() {
      if (o.isBuffer(this))
        return this.buffer;
    }
  }), Object.defineProperty(o.prototype, "offset", {
    enumerable: !0,
    get: function() {
      if (o.isBuffer(this))
        return this.byteOffset;
    }
  });
  function s(d) {
    if (d > i)
      throw new RangeError('The value "' + d + '" is invalid for option "size"');
    var f = new Uint8Array(d);
    return Object.setPrototypeOf(f, o.prototype), f;
  }
  function o(d, f, c) {
    if (typeof d == "number") {
      if (typeof f == "string")
        throw new TypeError(
          'The "string" argument must be of type string. Received type number'
        );
      return _(d);
    }
    return h(d, f, c);
  }
  o.poolSize = 8192;
  function h(d, f, c) {
    if (typeof d == "string")
      return v(d, f);
    if (ArrayBuffer.isView(d))
      return F(d);
    if (d == null)
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof d
      );
    if (ge(d, ArrayBuffer) || d && ge(d.buffer, ArrayBuffer) || typeof SharedArrayBuffer < "u" && (ge(d, SharedArrayBuffer) || d && ge(d.buffer, SharedArrayBuffer)))
      return S(d, f, c);
    if (typeof d == "number")
      throw new TypeError(
        'The "value" argument must not be of type number. Received type number'
      );
    var p = d.valueOf && d.valueOf();
    if (p != null && p !== d)
      return o.from(p, f, c);
    var y = B(d);
    if (y) return y;
    if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof d[Symbol.toPrimitive] == "function")
      return o.from(
        d[Symbol.toPrimitive]("string"),
        f,
        c
      );
    throw new TypeError(
      "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof d
    );
  }
  o.from = function(d, f, c) {
    return h(d, f, c);
  }, Object.setPrototypeOf(o.prototype, Uint8Array.prototype), Object.setPrototypeOf(o, Uint8Array);
  function u(d) {
    if (typeof d != "number")
      throw new TypeError('"size" argument must be of type number');
    if (d < 0)
      throw new RangeError('The value "' + d + '" is invalid for option "size"');
  }
  function l(d, f, c) {
    return u(d), d <= 0 ? s(d) : f !== void 0 ? typeof c == "string" ? s(d).fill(f, c) : s(d).fill(f) : s(d);
  }
  o.alloc = function(d, f, c) {
    return l(d, f, c);
  };
  function _(d) {
    return u(d), s(d < 0 ? 0 : w(d) | 0);
  }
  o.allocUnsafe = function(d) {
    return _(d);
  }, o.allocUnsafeSlow = function(d) {
    return _(d);
  };
  function v(d, f) {
    if ((typeof f != "string" || f === "") && (f = "utf8"), !o.isEncoding(f))
      throw new TypeError("Unknown encoding: " + f);
    var c = E(d, f) | 0, p = s(c), y = p.write(d, f);
    return y !== c && (p = p.slice(0, y)), p;
  }
  function g(d) {
    for (var f = d.length < 0 ? 0 : w(d.length) | 0, c = s(f), p = 0; p < f; p += 1)
      c[p] = d[p] & 255;
    return c;
  }
  function F(d) {
    if (ge(d, Uint8Array)) {
      var f = new Uint8Array(d);
      return S(f.buffer, f.byteOffset, f.byteLength);
    }
    return g(d);
  }
  function S(d, f, c) {
    if (f < 0 || d.byteLength < f)
      throw new RangeError('"offset" is outside of buffer bounds');
    if (d.byteLength < f + (c || 0))
      throw new RangeError('"length" is outside of buffer bounds');
    var p;
    return f === void 0 && c === void 0 ? p = new Uint8Array(d) : c === void 0 ? p = new Uint8Array(d, f) : p = new Uint8Array(d, f, c), Object.setPrototypeOf(p, o.prototype), p;
  }
  function B(d) {
    if (o.isBuffer(d)) {
      var f = w(d.length) | 0, c = s(f);
      return c.length === 0 || d.copy(c, 0, 0, f), c;
    }
    if (d.length !== void 0)
      return typeof d.length != "number" || Ur(d.length) ? s(0) : g(d);
    if (d.type === "Buffer" && Array.isArray(d.data))
      return g(d.data);
  }
  function w(d) {
    if (d >= i)
      throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + i.toString(16) + " bytes");
    return d | 0;
  }
  function x(d) {
    return +d != d && (d = 0), o.alloc(+d);
  }
  o.isBuffer = function(f) {
    return f != null && f._isBuffer === !0 && f !== o.prototype;
  }, o.compare = function(f, c) {
    if (ge(f, Uint8Array) && (f = o.from(f, f.offset, f.byteLength)), ge(c, Uint8Array) && (c = o.from(c, c.offset, c.byteLength)), !o.isBuffer(f) || !o.isBuffer(c))
      throw new TypeError(
        'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
      );
    if (f === c) return 0;
    for (var p = f.length, y = c.length, m = 0, k = Math.min(p, y); m < k; ++m)
      if (f[m] !== c[m]) {
        p = f[m], y = c[m];
        break;
      }
    return p < y ? -1 : y < p ? 1 : 0;
  }, o.isEncoding = function(f) {
    switch (String(f).toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "latin1":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return !0;
      default:
        return !1;
    }
  }, o.concat = function(f, c) {
    if (!Array.isArray(f))
      throw new TypeError('"list" argument must be an Array of Buffers');
    if (f.length === 0)
      return o.alloc(0);
    var p;
    if (c === void 0)
      for (c = 0, p = 0; p < f.length; ++p)
        c += f[p].length;
    var y = o.allocUnsafe(c), m = 0;
    for (p = 0; p < f.length; ++p) {
      var k = f[p];
      if (ge(k, Uint8Array))
        m + k.length > y.length ? o.from(k).copy(y, m) : Uint8Array.prototype.set.call(
          y,
          k,
          m
        );
      else if (o.isBuffer(k))
        k.copy(y, m);
      else
        throw new TypeError('"list" argument must be an Array of Buffers');
      m += k.length;
    }
    return y;
  };
  function E(d, f) {
    if (o.isBuffer(d))
      return d.length;
    if (ArrayBuffer.isView(d) || ge(d, ArrayBuffer))
      return d.byteLength;
    if (typeof d != "string")
      throw new TypeError(
        'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof d
      );
    var c = d.length, p = arguments.length > 2 && arguments[2] === !0;
    if (!p && c === 0) return 0;
    for (var y = !1; ; )
      switch (f) {
        case "ascii":
        case "latin1":
        case "binary":
          return c;
        case "utf8":
        case "utf-8":
          return Qe(d).length;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return c * 2;
        case "hex":
          return c >>> 1;
        case "base64":
          return Fi(d).length;
        default:
          if (y)
            return p ? -1 : Qe(d).length;
          f = ("" + f).toLowerCase(), y = !0;
      }
  }
  o.byteLength = E;
  function T(d, f, c) {
    var p = !1;
    if ((f === void 0 || f < 0) && (f = 0), f > this.length || ((c === void 0 || c > this.length) && (c = this.length), c <= 0) || (c >>>= 0, f >>>= 0, c <= f))
      return "";
    for (d || (d = "utf8"); ; )
      switch (d) {
        case "hex":
          return Wt(this, f, c);
        case "utf8":
        case "utf-8":
          return Y(this, f, c);
        case "ascii":
          return $e(this, f, c);
        case "latin1":
        case "binary":
          return Oe(this, f, c);
        case "base64":
          return U(this, f, c);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return Cr(this, f, c);
        default:
          if (p) throw new TypeError("Unknown encoding: " + d);
          d = (d + "").toLowerCase(), p = !0;
      }
  }
  o.prototype._isBuffer = !0;
  function A(d, f, c) {
    var p = d[f];
    d[f] = d[c], d[c] = p;
  }
  o.prototype.swap16 = function() {
    var f = this.length;
    if (f % 2 !== 0)
      throw new RangeError("Buffer size must be a multiple of 16-bits");
    for (var c = 0; c < f; c += 2)
      A(this, c, c + 1);
    return this;
  }, o.prototype.swap32 = function() {
    var f = this.length;
    if (f % 4 !== 0)
      throw new RangeError("Buffer size must be a multiple of 32-bits");
    for (var c = 0; c < f; c += 4)
      A(this, c, c + 3), A(this, c + 1, c + 2);
    return this;
  }, o.prototype.swap64 = function() {
    var f = this.length;
    if (f % 8 !== 0)
      throw new RangeError("Buffer size must be a multiple of 64-bits");
    for (var c = 0; c < f; c += 8)
      A(this, c, c + 7), A(this, c + 1, c + 6), A(this, c + 2, c + 5), A(this, c + 3, c + 4);
    return this;
  }, o.prototype.toString = function() {
    var f = this.length;
    return f === 0 ? "" : arguments.length === 0 ? Y(this, 0, f) : T.apply(this, arguments);
  }, o.prototype.toLocaleString = o.prototype.toString, o.prototype.equals = function(f) {
    if (!o.isBuffer(f)) throw new TypeError("Argument must be a Buffer");
    return this === f ? !0 : o.compare(this, f) === 0;
  }, o.prototype.inspect = function() {
    var f = "", c = e.INSPECT_MAX_BYTES;
    return f = this.toString("hex", 0, c).replace(/(.{2})/g, "$1 ").trim(), this.length > c && (f += " ... "), "<Buffer " + f + ">";
  }, n && (o.prototype[n] = o.prototype.inspect), o.prototype.compare = function(f, c, p, y, m) {
    if (ge(f, Uint8Array) && (f = o.from(f, f.offset, f.byteLength)), !o.isBuffer(f))
      throw new TypeError(
        'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof f
      );
    if (c === void 0 && (c = 0), p === void 0 && (p = f ? f.length : 0), y === void 0 && (y = 0), m === void 0 && (m = this.length), c < 0 || p > f.length || y < 0 || m > this.length)
      throw new RangeError("out of range index");
    if (y >= m && c >= p)
      return 0;
    if (y >= m)
      return -1;
    if (c >= p)
      return 1;
    if (c >>>= 0, p >>>= 0, y >>>= 0, m >>>= 0, this === f) return 0;
    for (var k = m - y, z = p - c, G = Math.min(k, z), H = this.slice(y, m), te = f.slice(c, p), q = 0; q < G; ++q)
      if (H[q] !== te[q]) {
        k = H[q], z = te[q];
        break;
      }
    return k < z ? -1 : z < k ? 1 : 0;
  };
  function C(d, f, c, p, y) {
    if (d.length === 0) return -1;
    if (typeof c == "string" ? (p = c, c = 0) : c > 2147483647 ? c = 2147483647 : c < -2147483648 && (c = -2147483648), c = +c, Ur(c) && (c = y ? 0 : d.length - 1), c < 0 && (c = d.length + c), c >= d.length) {
      if (y) return -1;
      c = d.length - 1;
    } else if (c < 0)
      if (y) c = 0;
      else return -1;
    if (typeof f == "string" && (f = o.from(f, p)), o.isBuffer(f))
      return f.length === 0 ? -1 : P(d, f, c, p, y);
    if (typeof f == "number")
      return f = f & 255, typeof Uint8Array.prototype.indexOf == "function" ? y ? Uint8Array.prototype.indexOf.call(d, f, c) : Uint8Array.prototype.lastIndexOf.call(d, f, c) : P(d, [f], c, p, y);
    throw new TypeError("val must be string, number or Buffer");
  }
  function P(d, f, c, p, y) {
    var m = 1, k = d.length, z = f.length;
    if (p !== void 0 && (p = String(p).toLowerCase(), p === "ucs2" || p === "ucs-2" || p === "utf16le" || p === "utf-16le")) {
      if (d.length < 2 || f.length < 2)
        return -1;
      m = 2, k /= 2, z /= 2, c /= 2;
    }
    function G($i, Oi) {
      return m === 1 ? $i[Oi] : $i.readUInt16BE(Oi * m);
    }
    var H;
    if (y) {
      var te = -1;
      for (H = c; H < k; H++)
        if (G(d, H) === G(f, te === -1 ? 0 : H - te)) {
          if (te === -1 && (te = H), H - te + 1 === z) return te * m;
        } else
          te !== -1 && (H -= H - te), te = -1;
    } else
      for (c + z > k && (c = k - z), H = c; H >= 0; H--) {
        for (var q = !0, Qt = 0; Qt < z; Qt++)
          if (G(d, H + Qt) !== G(f, Qt)) {
            q = !1;
            break;
          }
        if (q) return H;
      }
    return -1;
  }
  o.prototype.includes = function(f, c, p) {
    return this.indexOf(f, c, p) !== -1;
  }, o.prototype.indexOf = function(f, c, p) {
    return C(this, f, c, p, !0);
  }, o.prototype.lastIndexOf = function(f, c, p) {
    return C(this, f, c, p, !1);
  };
  function b(d, f, c, p) {
    c = Number(c) || 0;
    var y = d.length - c;
    p ? (p = Number(p), p > y && (p = y)) : p = y;
    var m = f.length;
    p > m / 2 && (p = m / 2);
    for (var k = 0; k < p; ++k) {
      var z = parseInt(f.substr(k * 2, 2), 16);
      if (Ur(z)) return k;
      d[c + k] = z;
    }
    return k;
  }
  function O(d, f, c, p) {
    return Jt(Qe(f, d.length - c), d, c, p);
  }
  function I(d, f, c, p) {
    return Jt(Pr(f), d, c, p);
  }
  function $(d, f, c, p) {
    return Jt(Fi(f), d, c, p);
  }
  function R(d, f, c, p) {
    return Jt(Zs(f, d.length - c), d, c, p);
  }
  o.prototype.write = function(f, c, p, y) {
    if (c === void 0)
      y = "utf8", p = this.length, c = 0;
    else if (p === void 0 && typeof c == "string")
      y = c, p = this.length, c = 0;
    else if (isFinite(c))
      c = c >>> 0, isFinite(p) ? (p = p >>> 0, y === void 0 && (y = "utf8")) : (y = p, p = void 0);
    else
      throw new Error(
        "Buffer.write(string, encoding, offset[, length]) is no longer supported"
      );
    var m = this.length - c;
    if ((p === void 0 || p > m) && (p = m), f.length > 0 && (p < 0 || c < 0) || c > this.length)
      throw new RangeError("Attempt to write outside buffer bounds");
    y || (y = "utf8");
    for (var k = !1; ; )
      switch (y) {
        case "hex":
          return b(this, f, c, p);
        case "utf8":
        case "utf-8":
          return O(this, f, c, p);
        case "ascii":
        case "latin1":
        case "binary":
          return I(this, f, c, p);
        case "base64":
          return $(this, f, c, p);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return R(this, f, c, p);
        default:
          if (k) throw new TypeError("Unknown encoding: " + y);
          y = ("" + y).toLowerCase(), k = !0;
      }
  }, o.prototype.toJSON = function() {
    return {
      type: "Buffer",
      data: Array.prototype.slice.call(this._arr || this, 0)
    };
  };
  function U(d, f, c) {
    return f === 0 && c === d.length ? t.fromByteArray(d) : t.fromByteArray(d.slice(f, c));
  }
  function Y(d, f, c) {
    c = Math.min(d.length, c);
    for (var p = [], y = f; y < c; ) {
      var m = d[y], k = null, z = m > 239 ? 4 : m > 223 ? 3 : m > 191 ? 2 : 1;
      if (y + z <= c) {
        var G, H, te, q;
        switch (z) {
          case 1:
            m < 128 && (k = m);
            break;
          case 2:
            G = d[y + 1], (G & 192) === 128 && (q = (m & 31) << 6 | G & 63, q > 127 && (k = q));
            break;
          case 3:
            G = d[y + 1], H = d[y + 2], (G & 192) === 128 && (H & 192) === 128 && (q = (m & 15) << 12 | (G & 63) << 6 | H & 63, q > 2047 && (q < 55296 || q > 57343) && (k = q));
            break;
          case 4:
            G = d[y + 1], H = d[y + 2], te = d[y + 3], (G & 192) === 128 && (H & 192) === 128 && (te & 192) === 128 && (q = (m & 15) << 18 | (G & 63) << 12 | (H & 63) << 6 | te & 63, q > 65535 && q < 1114112 && (k = q));
        }
      }
      k === null ? (k = 65533, z = 1) : k > 65535 && (k -= 65536, p.push(k >>> 10 & 1023 | 55296), k = 56320 | k & 1023), p.push(k), y += z;
    }
    return Je(p);
  }
  var se = 4096;
  function Je(d) {
    var f = d.length;
    if (f <= se)
      return String.fromCharCode.apply(String, d);
    for (var c = "", p = 0; p < f; )
      c += String.fromCharCode.apply(
        String,
        d.slice(p, p += se)
      );
    return c;
  }
  function $e(d, f, c) {
    var p = "";
    c = Math.min(d.length, c);
    for (var y = f; y < c; ++y)
      p += String.fromCharCode(d[y] & 127);
    return p;
  }
  function Oe(d, f, c) {
    var p = "";
    c = Math.min(d.length, c);
    for (var y = f; y < c; ++y)
      p += String.fromCharCode(d[y]);
    return p;
  }
  function Wt(d, f, c) {
    var p = d.length;
    (!f || f < 0) && (f = 0), (!c || c < 0 || c > p) && (c = p);
    for (var y = "", m = f; m < c; ++m)
      y += qs[d[m]];
    return y;
  }
  function Cr(d, f, c) {
    for (var p = d.slice(f, c), y = "", m = 0; m < p.length - 1; m += 2)
      y += String.fromCharCode(p[m] + p[m + 1] * 256);
    return y;
  }
  o.prototype.slice = function(f, c) {
    var p = this.length;
    f = ~~f, c = c === void 0 ? p : ~~c, f < 0 ? (f += p, f < 0 && (f = 0)) : f > p && (f = p), c < 0 ? (c += p, c < 0 && (c = 0)) : c > p && (c = p), c < f && (c = f);
    var y = this.subarray(f, c);
    return Object.setPrototypeOf(y, o.prototype), y;
  };
  function K(d, f, c) {
    if (d % 1 !== 0 || d < 0) throw new RangeError("offset is not uint");
    if (d + f > c) throw new RangeError("Trying to access beyond buffer length");
  }
  o.prototype.readUintLE = o.prototype.readUIntLE = function(f, c, p) {
    f = f >>> 0, c = c >>> 0, p || K(f, c, this.length);
    for (var y = this[f], m = 1, k = 0; ++k < c && (m *= 256); )
      y += this[f + k] * m;
    return y;
  }, o.prototype.readUintBE = o.prototype.readUIntBE = function(f, c, p) {
    f = f >>> 0, c = c >>> 0, p || K(f, c, this.length);
    for (var y = this[f + --c], m = 1; c > 0 && (m *= 256); )
      y += this[f + --c] * m;
    return y;
  }, o.prototype.readUint8 = o.prototype.readUInt8 = function(f, c) {
    return f = f >>> 0, c || K(f, 1, this.length), this[f];
  }, o.prototype.readUint16LE = o.prototype.readUInt16LE = function(f, c) {
    return f = f >>> 0, c || K(f, 2, this.length), this[f] | this[f + 1] << 8;
  }, o.prototype.readUint16BE = o.prototype.readUInt16BE = function(f, c) {
    return f = f >>> 0, c || K(f, 2, this.length), this[f] << 8 | this[f + 1];
  }, o.prototype.readUint32LE = o.prototype.readUInt32LE = function(f, c) {
    return f = f >>> 0, c || K(f, 4, this.length), (this[f] | this[f + 1] << 8 | this[f + 2] << 16) + this[f + 3] * 16777216;
  }, o.prototype.readUint32BE = o.prototype.readUInt32BE = function(f, c) {
    return f = f >>> 0, c || K(f, 4, this.length), this[f] * 16777216 + (this[f + 1] << 16 | this[f + 2] << 8 | this[f + 3]);
  }, o.prototype.readIntLE = function(f, c, p) {
    f = f >>> 0, c = c >>> 0, p || K(f, c, this.length);
    for (var y = this[f], m = 1, k = 0; ++k < c && (m *= 256); )
      y += this[f + k] * m;
    return m *= 128, y >= m && (y -= Math.pow(2, 8 * c)), y;
  }, o.prototype.readIntBE = function(f, c, p) {
    f = f >>> 0, c = c >>> 0, p || K(f, c, this.length);
    for (var y = c, m = 1, k = this[f + --y]; y > 0 && (m *= 256); )
      k += this[f + --y] * m;
    return m *= 128, k >= m && (k -= Math.pow(2, 8 * c)), k;
  }, o.prototype.readInt8 = function(f, c) {
    return f = f >>> 0, c || K(f, 1, this.length), this[f] & 128 ? (255 - this[f] + 1) * -1 : this[f];
  }, o.prototype.readInt16LE = function(f, c) {
    f = f >>> 0, c || K(f, 2, this.length);
    var p = this[f] | this[f + 1] << 8;
    return p & 32768 ? p | 4294901760 : p;
  }, o.prototype.readInt16BE = function(f, c) {
    f = f >>> 0, c || K(f, 2, this.length);
    var p = this[f + 1] | this[f] << 8;
    return p & 32768 ? p | 4294901760 : p;
  }, o.prototype.readInt32LE = function(f, c) {
    return f = f >>> 0, c || K(f, 4, this.length), this[f] | this[f + 1] << 8 | this[f + 2] << 16 | this[f + 3] << 24;
  }, o.prototype.readInt32BE = function(f, c) {
    return f = f >>> 0, c || K(f, 4, this.length), this[f] << 24 | this[f + 1] << 16 | this[f + 2] << 8 | this[f + 3];
  }, o.prototype.readFloatLE = function(f, c) {
    return f = f >>> 0, c || K(f, 4, this.length), r.read(this, f, !0, 23, 4);
  }, o.prototype.readFloatBE = function(f, c) {
    return f = f >>> 0, c || K(f, 4, this.length), r.read(this, f, !1, 23, 4);
  }, o.prototype.readDoubleLE = function(f, c) {
    return f = f >>> 0, c || K(f, 8, this.length), r.read(this, f, !0, 52, 8);
  }, o.prototype.readDoubleBE = function(f, c) {
    return f = f >>> 0, c || K(f, 8, this.length), r.read(this, f, !1, 52, 8);
  };
  function ee(d, f, c, p, y, m) {
    if (!o.isBuffer(d)) throw new TypeError('"buffer" argument must be a Buffer instance');
    if (f > y || f < m) throw new RangeError('"value" argument is out of bounds');
    if (c + p > d.length) throw new RangeError("Index out of range");
  }
  o.prototype.writeUintLE = o.prototype.writeUIntLE = function(f, c, p, y) {
    if (f = +f, c = c >>> 0, p = p >>> 0, !y) {
      var m = Math.pow(2, 8 * p) - 1;
      ee(this, f, c, p, m, 0);
    }
    var k = 1, z = 0;
    for (this[c] = f & 255; ++z < p && (k *= 256); )
      this[c + z] = f / k & 255;
    return c + p;
  }, o.prototype.writeUintBE = o.prototype.writeUIntBE = function(f, c, p, y) {
    if (f = +f, c = c >>> 0, p = p >>> 0, !y) {
      var m = Math.pow(2, 8 * p) - 1;
      ee(this, f, c, p, m, 0);
    }
    var k = p - 1, z = 1;
    for (this[c + k] = f & 255; --k >= 0 && (z *= 256); )
      this[c + k] = f / z & 255;
    return c + p;
  }, o.prototype.writeUint8 = o.prototype.writeUInt8 = function(f, c, p) {
    return f = +f, c = c >>> 0, p || ee(this, f, c, 1, 255, 0), this[c] = f & 255, c + 1;
  }, o.prototype.writeUint16LE = o.prototype.writeUInt16LE = function(f, c, p) {
    return f = +f, c = c >>> 0, p || ee(this, f, c, 2, 65535, 0), this[c] = f & 255, this[c + 1] = f >>> 8, c + 2;
  }, o.prototype.writeUint16BE = o.prototype.writeUInt16BE = function(f, c, p) {
    return f = +f, c = c >>> 0, p || ee(this, f, c, 2, 65535, 0), this[c] = f >>> 8, this[c + 1] = f & 255, c + 2;
  }, o.prototype.writeUint32LE = o.prototype.writeUInt32LE = function(f, c, p) {
    return f = +f, c = c >>> 0, p || ee(this, f, c, 4, 4294967295, 0), this[c + 3] = f >>> 24, this[c + 2] = f >>> 16, this[c + 1] = f >>> 8, this[c] = f & 255, c + 4;
  }, o.prototype.writeUint32BE = o.prototype.writeUInt32BE = function(f, c, p) {
    return f = +f, c = c >>> 0, p || ee(this, f, c, 4, 4294967295, 0), this[c] = f >>> 24, this[c + 1] = f >>> 16, this[c + 2] = f >>> 8, this[c + 3] = f & 255, c + 4;
  }, o.prototype.writeIntLE = function(f, c, p, y) {
    if (f = +f, c = c >>> 0, !y) {
      var m = Math.pow(2, 8 * p - 1);
      ee(this, f, c, p, m - 1, -m);
    }
    var k = 0, z = 1, G = 0;
    for (this[c] = f & 255; ++k < p && (z *= 256); )
      f < 0 && G === 0 && this[c + k - 1] !== 0 && (G = 1), this[c + k] = (f / z >> 0) - G & 255;
    return c + p;
  }, o.prototype.writeIntBE = function(f, c, p, y) {
    if (f = +f, c = c >>> 0, !y) {
      var m = Math.pow(2, 8 * p - 1);
      ee(this, f, c, p, m - 1, -m);
    }
    var k = p - 1, z = 1, G = 0;
    for (this[c + k] = f & 255; --k >= 0 && (z *= 256); )
      f < 0 && G === 0 && this[c + k + 1] !== 0 && (G = 1), this[c + k] = (f / z >> 0) - G & 255;
    return c + p;
  }, o.prototype.writeInt8 = function(f, c, p) {
    return f = +f, c = c >>> 0, p || ee(this, f, c, 1, 127, -128), f < 0 && (f = 255 + f + 1), this[c] = f & 255, c + 1;
  }, o.prototype.writeInt16LE = function(f, c, p) {
    return f = +f, c = c >>> 0, p || ee(this, f, c, 2, 32767, -32768), this[c] = f & 255, this[c + 1] = f >>> 8, c + 2;
  }, o.prototype.writeInt16BE = function(f, c, p) {
    return f = +f, c = c >>> 0, p || ee(this, f, c, 2, 32767, -32768), this[c] = f >>> 8, this[c + 1] = f & 255, c + 2;
  }, o.prototype.writeInt32LE = function(f, c, p) {
    return f = +f, c = c >>> 0, p || ee(this, f, c, 4, 2147483647, -2147483648), this[c] = f & 255, this[c + 1] = f >>> 8, this[c + 2] = f >>> 16, this[c + 3] = f >>> 24, c + 4;
  }, o.prototype.writeInt32BE = function(f, c, p) {
    return f = +f, c = c >>> 0, p || ee(this, f, c, 4, 2147483647, -2147483648), f < 0 && (f = 4294967295 + f + 1), this[c] = f >>> 24, this[c + 1] = f >>> 16, this[c + 2] = f >>> 8, this[c + 3] = f & 255, c + 4;
  };
  function gt(d, f, c, p, y, m) {
    if (c + p > d.length) throw new RangeError("Index out of range");
    if (c < 0) throw new RangeError("Index out of range");
  }
  function Vt(d, f, c, p, y) {
    return f = +f, c = c >>> 0, y || gt(d, f, c, 4), r.write(d, f, c, p, 23, 4), c + 4;
  }
  o.prototype.writeFloatLE = function(f, c, p) {
    return Vt(this, f, c, !0, p);
  }, o.prototype.writeFloatBE = function(f, c, p) {
    return Vt(this, f, c, !1, p);
  };
  function bt(d, f, c, p, y) {
    return f = +f, c = c >>> 0, y || gt(d, f, c, 8), r.write(d, f, c, p, 52, 8), c + 8;
  }
  o.prototype.writeDoubleLE = function(f, c, p) {
    return bt(this, f, c, !0, p);
  }, o.prototype.writeDoubleBE = function(f, c, p) {
    return bt(this, f, c, !1, p);
  }, o.prototype.copy = function(f, c, p, y) {
    if (!o.isBuffer(f)) throw new TypeError("argument should be a Buffer");
    if (p || (p = 0), !y && y !== 0 && (y = this.length), c >= f.length && (c = f.length), c || (c = 0), y > 0 && y < p && (y = p), y === p || f.length === 0 || this.length === 0) return 0;
    if (c < 0)
      throw new RangeError("targetStart out of bounds");
    if (p < 0 || p >= this.length) throw new RangeError("Index out of range");
    if (y < 0) throw new RangeError("sourceEnd out of bounds");
    y > this.length && (y = this.length), f.length - c < y - p && (y = f.length - c + p);
    var m = y - p;
    return this === f && typeof Uint8Array.prototype.copyWithin == "function" ? this.copyWithin(c, p, y) : Uint8Array.prototype.set.call(
      f,
      this.subarray(p, y),
      c
    ), m;
  }, o.prototype.fill = function(f, c, p, y) {
    if (typeof f == "string") {
      if (typeof c == "string" ? (y = c, c = 0, p = this.length) : typeof p == "string" && (y = p, p = this.length), y !== void 0 && typeof y != "string")
        throw new TypeError("encoding must be a string");
      if (typeof y == "string" && !o.isEncoding(y))
        throw new TypeError("Unknown encoding: " + y);
      if (f.length === 1) {
        var m = f.charCodeAt(0);
        (y === "utf8" && m < 128 || y === "latin1") && (f = m);
      }
    } else typeof f == "number" ? f = f & 255 : typeof f == "boolean" && (f = Number(f));
    if (c < 0 || this.length < c || this.length < p)
      throw new RangeError("Out of range index");
    if (p <= c)
      return this;
    c = c >>> 0, p = p === void 0 ? this.length : p >>> 0, f || (f = 0);
    var k;
    if (typeof f == "number")
      for (k = c; k < p; ++k)
        this[k] = f;
    else {
      var z = o.isBuffer(f) ? f : o.from(f, y), G = z.length;
      if (G === 0)
        throw new TypeError('The value "' + f + '" is invalid for argument "value"');
      for (k = 0; k < p - c; ++k)
        this[k + c] = z[k % G];
    }
    return this;
  };
  var re = /[^+/0-9A-Za-z-_]/g;
  function ve(d) {
    if (d = d.split("=")[0], d = d.trim().replace(re, ""), d.length < 2) return "";
    for (; d.length % 4 !== 0; )
      d = d + "=";
    return d;
  }
  function Qe(d, f) {
    f = f || 1 / 0;
    for (var c, p = d.length, y = null, m = [], k = 0; k < p; ++k) {
      if (c = d.charCodeAt(k), c > 55295 && c < 57344) {
        if (!y) {
          if (c > 56319) {
            (f -= 3) > -1 && m.push(239, 191, 189);
            continue;
          } else if (k + 1 === p) {
            (f -= 3) > -1 && m.push(239, 191, 189);
            continue;
          }
          y = c;
          continue;
        }
        if (c < 56320) {
          (f -= 3) > -1 && m.push(239, 191, 189), y = c;
          continue;
        }
        c = (y - 55296 << 10 | c - 56320) + 65536;
      } else y && (f -= 3) > -1 && m.push(239, 191, 189);
      if (y = null, c < 128) {
        if ((f -= 1) < 0) break;
        m.push(c);
      } else if (c < 2048) {
        if ((f -= 2) < 0) break;
        m.push(
          c >> 6 | 192,
          c & 63 | 128
        );
      } else if (c < 65536) {
        if ((f -= 3) < 0) break;
        m.push(
          c >> 12 | 224,
          c >> 6 & 63 | 128,
          c & 63 | 128
        );
      } else if (c < 1114112) {
        if ((f -= 4) < 0) break;
        m.push(
          c >> 18 | 240,
          c >> 12 & 63 | 128,
          c >> 6 & 63 | 128,
          c & 63 | 128
        );
      } else
        throw new Error("Invalid code point");
    }
    return m;
  }
  function Pr(d) {
    for (var f = [], c = 0; c < d.length; ++c)
      f.push(d.charCodeAt(c) & 255);
    return f;
  }
  function Zs(d, f) {
    for (var c, p, y, m = [], k = 0; k < d.length && !((f -= 2) < 0); ++k)
      c = d.charCodeAt(k), p = c >> 8, y = c % 256, m.push(y), m.push(p);
    return m;
  }
  function Fi(d) {
    return t.toByteArray(ve(d));
  }
  function Jt(d, f, c, p) {
    for (var y = 0; y < p && !(y + c >= f.length || y >= d.length); ++y)
      f[y + c] = d[y];
    return y;
  }
  function ge(d, f) {
    return d instanceof f || d != null && d.constructor != null && d.constructor.name != null && d.constructor.name === f.name;
  }
  function Ur(d) {
    return d !== d;
  }
  var qs = function() {
    for (var d = "0123456789abcdef", f = new Array(256), c = 0; c < 16; ++c)
      for (var p = c * 16, y = 0; y < 16; ++y)
        f[p + y] = d[c] + d[y];
    return f;
  }();
})(jn);
var ho = { exports: {} }, En = { exports: {} };
typeof Object.create == "function" ? En.exports = function(t, r) {
  r && (t.super_ = r, t.prototype = Object.create(r.prototype, {
    constructor: {
      value: t,
      enumerable: !1,
      writable: !0,
      configurable: !0
    }
  }));
} : En.exports = function(t, r) {
  if (r) {
    t.super_ = r;
    var n = function() {
    };
    n.prototype = r.prototype, t.prototype = new n(), t.prototype.constructor = t;
  }
};
var ht = En.exports, An = { exports: {} };
/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
(function(e, t) {
  var r = jn, n = r.Buffer;
  function i(s, o) {
    for (var h in s)
      o[h] = s[h];
  }
  n.from && n.alloc && n.allocUnsafe && n.allocUnsafeSlow ? e.exports = r : (i(r, t), t.Buffer = a);
  function a(s, o, h) {
    return n(s, o, h);
  }
  a.prototype = Object.create(n.prototype), i(n, a), a.from = function(s, o, h) {
    if (typeof s == "number")
      throw new TypeError("Argument must not be a number");
    return n(s, o, h);
  }, a.alloc = function(s, o, h) {
    if (typeof s != "number")
      throw new TypeError("Argument must be a number");
    var u = n(s);
    return o !== void 0 ? typeof h == "string" ? u.fill(o, h) : u.fill(o) : u.fill(0), u;
  }, a.allocUnsafe = function(s) {
    if (typeof s != "number")
      throw new TypeError("Argument must be a number");
    return n(s);
  }, a.allocUnsafeSlow = function(s) {
    if (typeof s != "number")
      throw new TypeError("Argument must be a number");
    return r.SlowBuffer(s);
  };
})(An, An.exports);
var ze = An.exports, tf = {}.toString, rf = Array.isArray || function(e) {
  return tf.call(e) == "[object Array]";
}, Pt = TypeError, po = Object, nf = Error, af = EvalError, of = RangeError, sf = ReferenceError, _o = SyntaxError, ff = URIError, cf = Math.abs, uf = Math.floor, lf = Math.max, hf = Math.min, df = Math.pow, pf = Math.round, _f = Number.isNaN || function(t) {
  return t !== t;
}, yf = _f, vf = function(t) {
  return yf(t) || t === 0 ? t : t < 0 ? -1 : 1;
}, gf = Object.getOwnPropertyDescriptor, fr = gf;
if (fr)
  try {
    fr([], "length");
  } catch {
    fr = null;
  }
var Ut = fr, cr = Object.defineProperty || !1;
if (cr)
  try {
    cr({}, "a", { value: 1 });
  } catch {
    cr = !1;
  }
var Ar = cr, Nr, Ri;
function yo() {
  return Ri || (Ri = 1, Nr = function() {
    if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
      return !1;
    if (typeof Symbol.iterator == "symbol")
      return !0;
    var t = {}, r = Symbol("test"), n = Object(r);
    if (typeof r == "string" || Object.prototype.toString.call(r) !== "[object Symbol]" || Object.prototype.toString.call(n) !== "[object Symbol]")
      return !1;
    var i = 42;
    t[r] = i;
    for (var a in t)
      return !1;
    if (typeof Object.keys == "function" && Object.keys(t).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(t).length !== 0)
      return !1;
    var s = Object.getOwnPropertySymbols(t);
    if (s.length !== 1 || s[0] !== r || !Object.prototype.propertyIsEnumerable.call(t, r))
      return !1;
    if (typeof Object.getOwnPropertyDescriptor == "function") {
      var o = (
        /** @type {PropertyDescriptor} */
        Object.getOwnPropertyDescriptor(t, r)
      );
      if (o.value !== i || o.enumerable !== !0)
        return !1;
    }
    return !0;
  }), Nr;
}
var Lr, Ci;
function bf() {
  if (Ci) return Lr;
  Ci = 1;
  var e = typeof Symbol < "u" && Symbol, t = yo();
  return Lr = function() {
    return typeof e != "function" || typeof Symbol != "function" || typeof e("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 : t();
  }, Lr;
}
var zr, Pi;
function vo() {
  return Pi || (Pi = 1, zr = typeof Reflect < "u" && Reflect.getPrototypeOf || null), zr;
}
var Mr, Ui;
function go() {
  if (Ui) return Mr;
  Ui = 1;
  var e = po;
  return Mr = e.getPrototypeOf || null, Mr;
}
var wf = "Function.prototype.bind called on incompatible ", mf = Object.prototype.toString, xf = Math.max, Ef = "[object Function]", Di = function(t, r) {
  for (var n = [], i = 0; i < t.length; i += 1)
    n[i] = t[i];
  for (var a = 0; a < r.length; a += 1)
    n[a + t.length] = r[a];
  return n;
}, Af = function(t, r) {
  for (var n = [], i = r, a = 0; i < t.length; i += 1, a += 1)
    n[a] = t[i];
  return n;
}, Sf = function(e, t) {
  for (var r = "", n = 0; n < e.length; n += 1)
    r += e[n], n + 1 < e.length && (r += t);
  return r;
}, kf = function(t) {
  var r = this;
  if (typeof r != "function" || mf.apply(r) !== Ef)
    throw new TypeError(wf + r);
  for (var n = Af(arguments, 1), i, a = function() {
    if (this instanceof i) {
      var l = r.apply(
        this,
        Di(n, arguments)
      );
      return Object(l) === l ? l : this;
    }
    return r.apply(
      t,
      Di(n, arguments)
    );
  }, s = xf(0, r.length - n.length), o = [], h = 0; h < s; h++)
    o[h] = "$" + h;
  if (i = Function("binder", "return function (" + Sf(o, ",") + "){ return binder.apply(this,arguments); }")(a), r.prototype) {
    var u = function() {
    };
    u.prototype = r.prototype, i.prototype = new u(), u.prototype = null;
  }
  return i;
}, Bf = kf, Dt = Function.prototype.bind || Bf, Hn = Function.prototype.call, Zn = Function.prototype.apply, If = typeof Reflect < "u" && Reflect && Reflect.apply, Tf = Dt, Ff = Zn, $f = Hn, Of = If, bo = Of || Tf.call($f, Ff), Rf = Dt, Cf = Pt, Pf = Hn, Uf = bo, qn = function(t) {
  if (t.length < 1 || typeof t[0] != "function")
    throw new Cf("a function is required");
  return Uf(Rf, Pf, t);
}, jr, Ni;
function Df() {
  if (Ni) return jr;
  Ni = 1;
  var e = qn, t = Ut, r;
  try {
    r = /** @type {{ __proto__?: typeof Array.prototype }} */
    [].__proto__ === Array.prototype;
  } catch (s) {
    if (!s || typeof s != "object" || !("code" in s) || s.code !== "ERR_PROTO_ACCESS")
      throw s;
  }
  var n = !!r && t && t(
    Object.prototype,
    /** @type {keyof typeof Object.prototype} */
    "__proto__"
  ), i = Object, a = i.getPrototypeOf;
  return jr = n && typeof n.get == "function" ? e([n.get]) : typeof a == "function" ? (
    /** @type {import('./get')} */
    function(o) {
      return a(o == null ? o : i(o));
    }
  ) : !1, jr;
}
var Gr, Li;
function wo() {
  if (Li) return Gr;
  Li = 1;
  var e = vo(), t = go(), r = Df();
  return Gr = e ? function(i) {
    return e(i);
  } : t ? function(i) {
    if (!i || typeof i != "object" && typeof i != "function")
      throw new TypeError("getProto: not an object");
    return t(i);
  } : r ? function(i) {
    return r(i);
  } : null, Gr;
}
var Hr, zi;
function Nf() {
  if (zi) return Hr;
  zi = 1;
  var e = Function.prototype.call, t = Object.prototype.hasOwnProperty, r = Dt;
  return Hr = r.call(e, t), Hr;
}
var D, Lf = po, zf = nf, Mf = af, jf = of, Gf = sf, lt = _o, st = Pt, Hf = ff, Zf = cf, qf = uf, Xf = lf, Kf = hf, Yf = df, Wf = pf, Vf = vf, mo = Function, Zr = function(e) {
  try {
    return mo('"use strict"; return (' + e + ").constructor;")();
  } catch {
  }
}, Bt = Ut, Jf = Ar, qr = function() {
  throw new st();
}, Qf = Bt ? function() {
  try {
    return arguments.callee, qr;
  } catch {
    try {
      return Bt(arguments, "callee").get;
    } catch {
      return qr;
    }
  }
}() : qr, tt = bf()(), J = wo(), ec = go(), tc = vo(), xo = Zn, Nt = Hn, at = {}, rc = typeof Uint8Array > "u" || !J ? D : J(Uint8Array), He = {
  __proto__: null,
  "%AggregateError%": typeof AggregateError > "u" ? D : AggregateError,
  "%Array%": Array,
  "%ArrayBuffer%": typeof ArrayBuffer > "u" ? D : ArrayBuffer,
  "%ArrayIteratorPrototype%": tt && J ? J([][Symbol.iterator]()) : D,
  "%AsyncFromSyncIteratorPrototype%": D,
  "%AsyncFunction%": at,
  "%AsyncGenerator%": at,
  "%AsyncGeneratorFunction%": at,
  "%AsyncIteratorPrototype%": at,
  "%Atomics%": typeof Atomics > "u" ? D : Atomics,
  "%BigInt%": typeof BigInt > "u" ? D : BigInt,
  "%BigInt64Array%": typeof BigInt64Array > "u" ? D : BigInt64Array,
  "%BigUint64Array%": typeof BigUint64Array > "u" ? D : BigUint64Array,
  "%Boolean%": Boolean,
  "%DataView%": typeof DataView > "u" ? D : DataView,
  "%Date%": Date,
  "%decodeURI%": decodeURI,
  "%decodeURIComponent%": decodeURIComponent,
  "%encodeURI%": encodeURI,
  "%encodeURIComponent%": encodeURIComponent,
  "%Error%": zf,
  "%eval%": eval,
  // eslint-disable-line no-eval
  "%EvalError%": Mf,
  "%Float16Array%": typeof Float16Array > "u" ? D : Float16Array,
  "%Float32Array%": typeof Float32Array > "u" ? D : Float32Array,
  "%Float64Array%": typeof Float64Array > "u" ? D : Float64Array,
  "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? D : FinalizationRegistry,
  "%Function%": mo,
  "%GeneratorFunction%": at,
  "%Int8Array%": typeof Int8Array > "u" ? D : Int8Array,
  "%Int16Array%": typeof Int16Array > "u" ? D : Int16Array,
  "%Int32Array%": typeof Int32Array > "u" ? D : Int32Array,
  "%isFinite%": isFinite,
  "%isNaN%": isNaN,
  "%IteratorPrototype%": tt && J ? J(J([][Symbol.iterator]())) : D,
  "%JSON%": typeof JSON == "object" ? JSON : D,
  "%Map%": typeof Map > "u" ? D : Map,
  "%MapIteratorPrototype%": typeof Map > "u" || !tt || !J ? D : J((/* @__PURE__ */ new Map())[Symbol.iterator]()),
  "%Math%": Math,
  "%Number%": Number,
  "%Object%": Lf,
  "%Object.getOwnPropertyDescriptor%": Bt,
  "%parseFloat%": parseFloat,
  "%parseInt%": parseInt,
  "%Promise%": typeof Promise > "u" ? D : Promise,
  "%Proxy%": typeof Proxy > "u" ? D : Proxy,
  "%RangeError%": jf,
  "%ReferenceError%": Gf,
  "%Reflect%": typeof Reflect > "u" ? D : Reflect,
  "%RegExp%": RegExp,
  "%Set%": typeof Set > "u" ? D : Set,
  "%SetIteratorPrototype%": typeof Set > "u" || !tt || !J ? D : J((/* @__PURE__ */ new Set())[Symbol.iterator]()),
  "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? D : SharedArrayBuffer,
  "%String%": String,
  "%StringIteratorPrototype%": tt && J ? J(""[Symbol.iterator]()) : D,
  "%Symbol%": tt ? Symbol : D,
  "%SyntaxError%": lt,
  "%ThrowTypeError%": Qf,
  "%TypedArray%": rc,
  "%TypeError%": st,
  "%Uint8Array%": typeof Uint8Array > "u" ? D : Uint8Array,
  "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? D : Uint8ClampedArray,
  "%Uint16Array%": typeof Uint16Array > "u" ? D : Uint16Array,
  "%Uint32Array%": typeof Uint32Array > "u" ? D : Uint32Array,
  "%URIError%": Hf,
  "%WeakMap%": typeof WeakMap > "u" ? D : WeakMap,
  "%WeakRef%": typeof WeakRef > "u" ? D : WeakRef,
  "%WeakSet%": typeof WeakSet > "u" ? D : WeakSet,
  "%Function.prototype.call%": Nt,
  "%Function.prototype.apply%": xo,
  "%Object.defineProperty%": Jf,
  "%Object.getPrototypeOf%": ec,
  "%Math.abs%": Zf,
  "%Math.floor%": qf,
  "%Math.max%": Xf,
  "%Math.min%": Kf,
  "%Math.pow%": Yf,
  "%Math.round%": Wf,
  "%Math.sign%": Vf,
  "%Reflect.getPrototypeOf%": tc
};
if (J)
  try {
    null.error;
  } catch (e) {
    var nc = J(J(e));
    He["%Error.prototype%"] = nc;
  }
var ic = function e(t) {
  var r;
  if (t === "%AsyncFunction%")
    r = Zr("async function () {}");
  else if (t === "%GeneratorFunction%")
    r = Zr("function* () {}");
  else if (t === "%AsyncGeneratorFunction%")
    r = Zr("async function* () {}");
  else if (t === "%AsyncGenerator%") {
    var n = e("%AsyncGeneratorFunction%");
    n && (r = n.prototype);
  } else if (t === "%AsyncIteratorPrototype%") {
    var i = e("%AsyncGenerator%");
    i && J && (r = J(i.prototype));
  }
  return He[t] = r, r;
}, Mi = {
  __proto__: null,
  "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
  "%ArrayPrototype%": ["Array", "prototype"],
  "%ArrayProto_entries%": ["Array", "prototype", "entries"],
  "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
  "%ArrayProto_keys%": ["Array", "prototype", "keys"],
  "%ArrayProto_values%": ["Array", "prototype", "values"],
  "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
  "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
  "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
  "%BooleanPrototype%": ["Boolean", "prototype"],
  "%DataViewPrototype%": ["DataView", "prototype"],
  "%DatePrototype%": ["Date", "prototype"],
  "%ErrorPrototype%": ["Error", "prototype"],
  "%EvalErrorPrototype%": ["EvalError", "prototype"],
  "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
  "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
  "%FunctionPrototype%": ["Function", "prototype"],
  "%Generator%": ["GeneratorFunction", "prototype"],
  "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
  "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
  "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
  "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
  "%JSONParse%": ["JSON", "parse"],
  "%JSONStringify%": ["JSON", "stringify"],
  "%MapPrototype%": ["Map", "prototype"],
  "%NumberPrototype%": ["Number", "prototype"],
  "%ObjectPrototype%": ["Object", "prototype"],
  "%ObjProto_toString%": ["Object", "prototype", "toString"],
  "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
  "%PromisePrototype%": ["Promise", "prototype"],
  "%PromiseProto_then%": ["Promise", "prototype", "then"],
  "%Promise_all%": ["Promise", "all"],
  "%Promise_reject%": ["Promise", "reject"],
  "%Promise_resolve%": ["Promise", "resolve"],
  "%RangeErrorPrototype%": ["RangeError", "prototype"],
  "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
  "%RegExpPrototype%": ["RegExp", "prototype"],
  "%SetPrototype%": ["Set", "prototype"],
  "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
  "%StringPrototype%": ["String", "prototype"],
  "%SymbolPrototype%": ["Symbol", "prototype"],
  "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
  "%TypedArrayPrototype%": ["TypedArray", "prototype"],
  "%TypeErrorPrototype%": ["TypeError", "prototype"],
  "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
  "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
  "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
  "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
  "%URIErrorPrototype%": ["URIError", "prototype"],
  "%WeakMapPrototype%": ["WeakMap", "prototype"],
  "%WeakSetPrototype%": ["WeakSet", "prototype"]
}, Lt = Dt, yr = Nf(), ac = Lt.call(Nt, Array.prototype.concat), oc = Lt.call(xo, Array.prototype.splice), ji = Lt.call(Nt, String.prototype.replace), vr = Lt.call(Nt, String.prototype.slice), sc = Lt.call(Nt, RegExp.prototype.exec), fc = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, cc = /\\(\\)?/g, uc = function(t) {
  var r = vr(t, 0, 1), n = vr(t, -1);
  if (r === "%" && n !== "%")
    throw new lt("invalid intrinsic syntax, expected closing `%`");
  if (n === "%" && r !== "%")
    throw new lt("invalid intrinsic syntax, expected opening `%`");
  var i = [];
  return ji(t, fc, function(a, s, o, h) {
    i[i.length] = o ? ji(h, cc, "$1") : s || a;
  }), i;
}, lc = function(t, r) {
  var n = t, i;
  if (yr(Mi, n) && (i = Mi[n], n = "%" + i[0] + "%"), yr(He, n)) {
    var a = He[n];
    if (a === at && (a = ic(n)), typeof a > "u" && !r)
      throw new st("intrinsic " + t + " exists, but is not available. Please file an issue!");
    return {
      alias: i,
      name: n,
      value: a
    };
  }
  throw new lt("intrinsic " + t + " does not exist!");
}, Eo = function(t, r) {
  if (typeof t != "string" || t.length === 0)
    throw new st("intrinsic name must be a non-empty string");
  if (arguments.length > 1 && typeof r != "boolean")
    throw new st('"allowMissing" argument must be a boolean');
  if (sc(/^%?[^%]*%?$/, t) === null)
    throw new lt("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
  var n = uc(t), i = n.length > 0 ? n[0] : "", a = lc("%" + i + "%", r), s = a.name, o = a.value, h = !1, u = a.alias;
  u && (i = u[0], oc(n, ac([0, 1], u)));
  for (var l = 1, _ = !0; l < n.length; l += 1) {
    var v = n[l], g = vr(v, 0, 1), F = vr(v, -1);
    if ((g === '"' || g === "'" || g === "`" || F === '"' || F === "'" || F === "`") && g !== F)
      throw new lt("property names with quotes must have matching quotes");
    if ((v === "constructor" || !_) && (h = !0), i += "." + v, s = "%" + i + "%", yr(He, s))
      o = He[s];
    else if (o != null) {
      if (!(v in o)) {
        if (!r)
          throw new st("base intrinsic for " + t + " exists, but the property is not available.");
        return;
      }
      if (Bt && l + 1 >= n.length) {
        var S = Bt(o, v);
        _ = !!S, _ && "get" in S && !("originalValue" in S.get) ? o = S.get : o = o[v];
      } else
        _ = yr(o, v), o = o[v];
      _ && !h && (He[s] = o);
    }
  }
  return o;
}, Ao = Eo, So = qn, hc = So([Ao("%String.prototype.indexOf%")]), ko = function(t, r) {
  var n = (
    /** @type {(this: unknown, ...args: unknown[]) => unknown} */
    Ao(t, !!r)
  );
  return typeof n == "function" && hc(t, ".prototype.") > -1 ? So(
    /** @type {const} */
    [n]
  ) : n;
}, Xr, Gi;
function dc() {
  if (Gi) return Xr;
  Gi = 1;
  var e = Function.prototype.toString, t = typeof Reflect == "object" && Reflect !== null && Reflect.apply, r, n;
  if (typeof t == "function" && typeof Object.defineProperty == "function")
    try {
      r = Object.defineProperty({}, "length", {
        get: function() {
          throw n;
        }
      }), n = {}, t(function() {
        throw 42;
      }, null, r);
    } catch (x) {
      x !== n && (t = null);
    }
  else
    t = null;
  var i = /^\s*class\b/, a = function(E) {
    try {
      var T = e.call(E);
      return i.test(T);
    } catch {
      return !1;
    }
  }, s = function(E) {
    try {
      return a(E) ? !1 : (e.call(E), !0);
    } catch {
      return !1;
    }
  }, o = Object.prototype.toString, h = "[object Object]", u = "[object Function]", l = "[object GeneratorFunction]", _ = "[object HTMLAllCollection]", v = "[object HTML document.all class]", g = "[object HTMLCollection]", F = typeof Symbol == "function" && !!Symbol.toStringTag, S = !(0 in [,]), B = function() {
    return !1;
  };
  if (typeof document == "object") {
    var w = document.all;
    o.call(w) === o.call(document.all) && (B = function(E) {
      if ((S || !E) && (typeof E > "u" || typeof E == "object"))
        try {
          var T = o.call(E);
          return (T === _ || T === v || T === g || T === h) && E("") == null;
        } catch {
        }
      return !1;
    });
  }
  return Xr = t ? function(E) {
    if (B(E))
      return !0;
    if (!E || typeof E != "function" && typeof E != "object")
      return !1;
    try {
      t(E, null, r);
    } catch (T) {
      if (T !== n)
        return !1;
    }
    return !a(E) && s(E);
  } : function(E) {
    if (B(E))
      return !0;
    if (!E || typeof E != "function" && typeof E != "object")
      return !1;
    if (F)
      return s(E);
    if (a(E))
      return !1;
    var T = o.call(E);
    return T !== u && T !== l && !/^\[object HTML/.test(T) ? !1 : s(E);
  }, Xr;
}
var Kr, Hi;
function pc() {
  if (Hi) return Kr;
  Hi = 1;
  var e = dc(), t = Object.prototype.toString, r = Object.prototype.hasOwnProperty, n = function(h, u, l) {
    for (var _ = 0, v = h.length; _ < v; _++)
      r.call(h, _) && (l == null ? u(h[_], _, h) : u.call(l, h[_], _, h));
  }, i = function(h, u, l) {
    for (var _ = 0, v = h.length; _ < v; _++)
      l == null ? u(h.charAt(_), _, h) : u.call(l, h.charAt(_), _, h);
  }, a = function(h, u, l) {
    for (var _ in h)
      r.call(h, _) && (l == null ? u(h[_], _, h) : u.call(l, h[_], _, h));
  };
  function s(o) {
    return t.call(o) === "[object Array]";
  }
  return Kr = function(h, u, l) {
    if (!e(u))
      throw new TypeError("iterator must be a function");
    var _;
    arguments.length >= 3 && (_ = l), s(h) ? n(h, u, _) : typeof h == "string" ? i(h, u, _) : a(h, u, _);
  }, Kr;
}
var Yr, Zi;
function _c() {
  return Zi || (Zi = 1, Yr = [
    "Float16Array",
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Int16Array",
    "Int32Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array"
  ]), Yr;
}
var Wr, qi;
function yc() {
  if (qi) return Wr;
  qi = 1;
  var e = _c(), t = typeof globalThis > "u" ? uo : globalThis;
  return Wr = function() {
    for (var n = [], i = 0; i < e.length; i++)
      typeof t[e[i]] == "function" && (n[n.length] = e[i]);
    return n;
  }, Wr;
}
var Vr = { exports: {} }, Jr, Xi;
function vc() {
  if (Xi) return Jr;
  Xi = 1;
  var e = Ar, t = _o, r = Pt, n = Ut;
  return Jr = function(a, s, o) {
    if (!a || typeof a != "object" && typeof a != "function")
      throw new r("`obj` must be an object or a function`");
    if (typeof s != "string" && typeof s != "symbol")
      throw new r("`property` must be a string or a symbol`");
    if (arguments.length > 3 && typeof arguments[3] != "boolean" && arguments[3] !== null)
      throw new r("`nonEnumerable`, if provided, must be a boolean or null");
    if (arguments.length > 4 && typeof arguments[4] != "boolean" && arguments[4] !== null)
      throw new r("`nonWritable`, if provided, must be a boolean or null");
    if (arguments.length > 5 && typeof arguments[5] != "boolean" && arguments[5] !== null)
      throw new r("`nonConfigurable`, if provided, must be a boolean or null");
    if (arguments.length > 6 && typeof arguments[6] != "boolean")
      throw new r("`loose`, if provided, must be a boolean");
    var h = arguments.length > 3 ? arguments[3] : null, u = arguments.length > 4 ? arguments[4] : null, l = arguments.length > 5 ? arguments[5] : null, _ = arguments.length > 6 ? arguments[6] : !1, v = !!n && n(a, s);
    if (e)
      e(a, s, {
        configurable: l === null && v ? v.configurable : !l,
        enumerable: h === null && v ? v.enumerable : !h,
        value: o,
        writable: u === null && v ? v.writable : !u
      });
    else if (_ || !h && !u && !l)
      a[s] = o;
    else
      throw new t("This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.");
  }, Jr;
}
var Qr, Ki;
function gc() {
  if (Ki) return Qr;
  Ki = 1;
  var e = Ar, t = function() {
    return !!e;
  };
  return t.hasArrayLengthDefineBug = function() {
    if (!e)
      return null;
    try {
      return e([], "length", { value: 1 }).length !== 1;
    } catch {
      return !0;
    }
  }, Qr = t, Qr;
}
var en, Yi;
function bc() {
  if (Yi) return en;
  Yi = 1;
  var e = Eo, t = vc(), r = gc()(), n = Ut, i = Pt, a = e("%Math.floor%");
  return en = function(o, h) {
    if (typeof o != "function")
      throw new i("`fn` is not a function");
    if (typeof h != "number" || h < 0 || h > 4294967295 || a(h) !== h)
      throw new i("`length` must be a positive 32-bit integer");
    var u = arguments.length > 2 && !!arguments[2], l = !0, _ = !0;
    if ("length" in o && n) {
      var v = n(o, "length");
      v && !v.configurable && (l = !1), v && !v.writable && (_ = !1);
    }
    return (l || _ || !u) && (r ? t(
      /** @type {Parameters<define>[0]} */
      o,
      "length",
      h,
      !0,
      !0
    ) : t(
      /** @type {Parameters<define>[0]} */
      o,
      "length",
      h
    )), o;
  }, en;
}
var tn, Wi;
function wc() {
  if (Wi) return tn;
  Wi = 1;
  var e = Dt, t = Zn, r = bo;
  return tn = function() {
    return r(e, t, arguments);
  }, tn;
}
var Vi;
function mc() {
  return Vi || (Vi = 1, function(e) {
    var t = bc(), r = Ar, n = qn, i = wc();
    e.exports = function(s) {
      var o = n(arguments), h = 1 + s.length - (arguments.length - 1);
      return t(
        o,
        h > 0 ? h : 0,
        !0
      );
    }, r ? r(e.exports, "apply", { value: i }) : e.exports.apply = i;
  }(Vr)), Vr.exports;
}
var rn, Ji;
function xc() {
  if (Ji) return rn;
  Ji = 1;
  var e = yo();
  return rn = function() {
    return e() && !!Symbol.toStringTag;
  }, rn;
}
var nn, Qi;
function Ec() {
  if (Qi) return nn;
  Qi = 1;
  var e = pc(), t = yc(), r = mc(), n = ko, i = Ut, a = wo(), s = n("Object.prototype.toString"), o = xc()(), h = typeof globalThis > "u" ? uo : globalThis, u = t(), l = n("String.prototype.slice"), _ = n("Array.prototype.indexOf", !0) || function(B, w) {
    for (var x = 0; x < B.length; x += 1)
      if (B[x] === w)
        return x;
    return -1;
  }, v = { __proto__: null };
  o && i && a ? e(u, function(S) {
    var B = new h[S]();
    if (Symbol.toStringTag in B && a) {
      var w = a(B), x = i(w, Symbol.toStringTag);
      if (!x && w) {
        var E = a(w);
        x = i(E, Symbol.toStringTag);
      }
      if (x && x.get) {
        var T = r(x.get);
        v[
          /** @type {`$${import('.').TypedArrayName}`} */
          "$" + S
        ] = T;
      }
    }
  }) : e(u, function(S) {
    var B = new h[S](), w = B.slice || B.set;
    if (w) {
      var x = (
        /** @type {import('./types').BoundSlice | import('./types').BoundSet} */
        // @ts-expect-error TODO FIXME
        r(w)
      );
      v[
        /** @type {`$${import('.').TypedArrayName}`} */
        "$" + S
      ] = x;
    }
  });
  var g = function(B) {
    var w = !1;
    return e(
      /** @type {Record<`\$${import('.').TypedArrayName}`, Getter>} */
      v,
      /** @type {(getter: Getter, name: `\$${import('.').TypedArrayName}`) => void} */
      function(x, E) {
        if (!w)
          try {
            "$" + x(B) === E && (w = /** @type {import('.').TypedArrayName} */
            l(E, 1));
          } catch {
          }
      }
    ), w;
  }, F = function(B) {
    var w = !1;
    return e(
      /** @type {Record<`\$${import('.').TypedArrayName}`, Getter>} */
      v,
      /** @type {(getter: Getter, name: `\$${import('.').TypedArrayName}`) => void} */
      function(x, E) {
        if (!w)
          try {
            x(B), w = /** @type {import('.').TypedArrayName} */
            l(E, 1);
          } catch {
          }
      }
    ), w;
  };
  return nn = function(B) {
    if (!B || typeof B != "object")
      return !1;
    if (!o) {
      var w = l(s(B), 8, -1);
      return _(u, w) > -1 ? w : w !== "Object" ? !1 : F(B);
    }
    return i ? g(B) : null;
  }, nn;
}
var an, ea;
function Ac() {
  if (ea) return an;
  ea = 1;
  var e = Ec();
  return an = function(r) {
    return !!e(r);
  }, an;
}
var Sc = Pt, kc = ko, Bc = kc("TypedArray.prototype.buffer", !0), Ic = Ac(), Tc = Bc || function(t) {
  if (!Ic(t))
    throw new Sc("Not a Typed Array");
  return t.buffer;
}, pe = ze.Buffer, Fc = rf, $c = Tc, Oc = ArrayBuffer.isView || function(t) {
  try {
    return $c(t), !0;
  } catch {
    return !1;
  }
}, Rc = typeof Uint8Array < "u", Bo = typeof ArrayBuffer < "u" && typeof Uint8Array < "u", Cc = Bo && (pe.prototype instanceof Uint8Array || pe.TYPED_ARRAY_SUPPORT), Pc = function(t, r) {
  if (pe.isBuffer(t))
    return t.constructor && !("isBuffer" in t) ? pe.from(t) : t;
  if (typeof t == "string")
    return pe.from(t, r);
  if (Bo && Oc(t)) {
    if (t.byteLength === 0)
      return pe.alloc(0);
    if (Cc) {
      var n = pe.from(t.buffer, t.byteOffset, t.byteLength);
      if (n.byteLength === t.byteLength)
        return n;
    }
    var i = t instanceof Uint8Array ? t : new Uint8Array(t.buffer, t.byteOffset, t.byteLength), a = pe.from(i);
    if (a.length === t.byteLength)
      return a;
  }
  if (Rc && t instanceof Uint8Array)
    return pe.from(t);
  var s = Fc(t);
  if (s)
    for (var o = 0; o < t.length; o += 1) {
      var h = t[o];
      if (typeof h != "number" || h < 0 || h > 255 || ~~h !== h)
        throw new RangeError("Array items must be numbers in the range 0-255.");
    }
  if (s || pe.isBuffer(t) && t.constructor && typeof t.constructor.isBuffer == "function" && t.constructor.isBuffer(t))
    return pe.from(t);
  throw new TypeError('The "data" argument must be a string, an Array, a Buffer, a Uint8Array, or a DataView.');
}, Uc = ze.Buffer, Dc = Pc;
function Sr(e, t) {
  this._block = Uc.alloc(e), this._finalSize = t, this._blockSize = e, this._len = 0;
}
Sr.prototype.update = function(e, t) {
  e = Dc(e, t || "utf8");
  for (var r = this._block, n = this._blockSize, i = e.length, a = this._len, s = 0; s < i; ) {
    for (var o = a % n, h = Math.min(i - s, n - o), u = 0; u < h; u++)
      r[o + u] = e[s + u];
    a += h, s += h, a % n === 0 && this._update(r);
  }
  return this._len += i, this;
};
Sr.prototype.digest = function(e) {
  var t = this._len % this._blockSize;
  this._block[t] = 128, this._block.fill(0, t + 1), t >= this._finalSize && (this._update(this._block), this._block.fill(0));
  var r = this._len * 8;
  if (r <= 4294967295)
    this._block.writeUInt32BE(r, this._blockSize - 4);
  else {
    var n = (r & 4294967295) >>> 0, i = (r - n) / 4294967296;
    this._block.writeUInt32BE(i, this._blockSize - 8), this._block.writeUInt32BE(n, this._blockSize - 4);
  }
  this._update(this._block);
  var a = this._hash();
  return e ? a.toString(e) : a;
};
Sr.prototype._update = function() {
  throw new Error("_update must be implemented by subclass");
};
var dt = Sr, Nc = ht, Io = dt, Lc = ze.Buffer, zc = [
  1518500249,
  1859775393,
  -1894007588,
  -899497514
], Mc = new Array(80);
function zt() {
  this.init(), this._w = Mc, Io.call(this, 64, 56);
}
Nc(zt, Io);
zt.prototype.init = function() {
  return this._a = 1732584193, this._b = 4023233417, this._c = 2562383102, this._d = 271733878, this._e = 3285377520, this;
};
function jc(e) {
  return e << 5 | e >>> 27;
}
function Gc(e) {
  return e << 30 | e >>> 2;
}
function Hc(e, t, r, n) {
  return e === 0 ? t & r | ~t & n : e === 2 ? t & r | t & n | r & n : t ^ r ^ n;
}
zt.prototype._update = function(e) {
  for (var t = this._w, r = this._a | 0, n = this._b | 0, i = this._c | 0, a = this._d | 0, s = this._e | 0, o = 0; o < 16; ++o)
    t[o] = e.readInt32BE(o * 4);
  for (; o < 80; ++o)
    t[o] = t[o - 3] ^ t[o - 8] ^ t[o - 14] ^ t[o - 16];
  for (var h = 0; h < 80; ++h) {
    var u = ~~(h / 20), l = jc(r) + Hc(u, n, i, a) + s + t[h] + zc[u] | 0;
    s = a, a = i, i = Gc(n), n = r, r = l;
  }
  this._a = r + this._a | 0, this._b = n + this._b | 0, this._c = i + this._c | 0, this._d = a + this._d | 0, this._e = s + this._e | 0;
};
zt.prototype._hash = function() {
  var e = Lc.allocUnsafe(20);
  return e.writeInt32BE(this._a | 0, 0), e.writeInt32BE(this._b | 0, 4), e.writeInt32BE(this._c | 0, 8), e.writeInt32BE(this._d | 0, 12), e.writeInt32BE(this._e | 0, 16), e;
};
var Zc = zt, qc = ht, To = dt, Xc = ze.Buffer, Kc = [
  1518500249,
  1859775393,
  -1894007588,
  -899497514
], Yc = new Array(80);
function Mt() {
  this.init(), this._w = Yc, To.call(this, 64, 56);
}
qc(Mt, To);
Mt.prototype.init = function() {
  return this._a = 1732584193, this._b = 4023233417, this._c = 2562383102, this._d = 271733878, this._e = 3285377520, this;
};
function Wc(e) {
  return e << 1 | e >>> 31;
}
function Vc(e) {
  return e << 5 | e >>> 27;
}
function Jc(e) {
  return e << 30 | e >>> 2;
}
function Qc(e, t, r, n) {
  return e === 0 ? t & r | ~t & n : e === 2 ? t & r | t & n | r & n : t ^ r ^ n;
}
Mt.prototype._update = function(e) {
  for (var t = this._w, r = this._a | 0, n = this._b | 0, i = this._c | 0, a = this._d | 0, s = this._e | 0, o = 0; o < 16; ++o)
    t[o] = e.readInt32BE(o * 4);
  for (; o < 80; ++o)
    t[o] = Wc(t[o - 3] ^ t[o - 8] ^ t[o - 14] ^ t[o - 16]);
  for (var h = 0; h < 80; ++h) {
    var u = ~~(h / 20), l = Vc(r) + Qc(u, n, i, a) + s + t[h] + Kc[u] | 0;
    s = a, a = i, i = Jc(n), n = r, r = l;
  }
  this._a = r + this._a | 0, this._b = n + this._b | 0, this._c = i + this._c | 0, this._d = a + this._d | 0, this._e = s + this._e | 0;
};
Mt.prototype._hash = function() {
  var e = Xc.allocUnsafe(20);
  return e.writeInt32BE(this._a | 0, 0), e.writeInt32BE(this._b | 0, 4), e.writeInt32BE(this._c | 0, 8), e.writeInt32BE(this._d | 0, 12), e.writeInt32BE(this._e | 0, 16), e;
};
var Fo = Mt;
const eu = /* @__PURE__ */ Ct(Fo);
var tu = ht, $o = dt, ru = ze.Buffer, nu = [
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
], iu = new Array(64);
function jt() {
  this.init(), this._w = iu, $o.call(this, 64, 56);
}
tu(jt, $o);
jt.prototype.init = function() {
  return this._a = 1779033703, this._b = 3144134277, this._c = 1013904242, this._d = 2773480762, this._e = 1359893119, this._f = 2600822924, this._g = 528734635, this._h = 1541459225, this;
};
function au(e, t, r) {
  return r ^ e & (t ^ r);
}
function ou(e, t, r) {
  return e & t | r & (e | t);
}
function su(e) {
  return (e >>> 2 | e << 30) ^ (e >>> 13 | e << 19) ^ (e >>> 22 | e << 10);
}
function fu(e) {
  return (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
}
function cu(e) {
  return (e >>> 7 | e << 25) ^ (e >>> 18 | e << 14) ^ e >>> 3;
}
function uu(e) {
  return (e >>> 17 | e << 15) ^ (e >>> 19 | e << 13) ^ e >>> 10;
}
jt.prototype._update = function(e) {
  for (var t = this._w, r = this._a | 0, n = this._b | 0, i = this._c | 0, a = this._d | 0, s = this._e | 0, o = this._f | 0, h = this._g | 0, u = this._h | 0, l = 0; l < 16; ++l)
    t[l] = e.readInt32BE(l * 4);
  for (; l < 64; ++l)
    t[l] = uu(t[l - 2]) + t[l - 7] + cu(t[l - 15]) + t[l - 16] | 0;
  for (var _ = 0; _ < 64; ++_) {
    var v = u + fu(s) + au(s, o, h) + nu[_] + t[_] | 0, g = su(r) + ou(r, n, i) | 0;
    u = h, h = o, o = s, s = a + v | 0, a = i, i = n, n = r, r = v + g | 0;
  }
  this._a = r + this._a | 0, this._b = n + this._b | 0, this._c = i + this._c | 0, this._d = a + this._d | 0, this._e = s + this._e | 0, this._f = o + this._f | 0, this._g = h + this._g | 0, this._h = u + this._h | 0;
};
jt.prototype._hash = function() {
  var e = ru.allocUnsafe(32);
  return e.writeInt32BE(this._a, 0), e.writeInt32BE(this._b, 4), e.writeInt32BE(this._c, 8), e.writeInt32BE(this._d, 12), e.writeInt32BE(this._e, 16), e.writeInt32BE(this._f, 20), e.writeInt32BE(this._g, 24), e.writeInt32BE(this._h, 28), e;
};
var Oo = jt, lu = ht, hu = Oo, du = dt, pu = ze.Buffer, _u = new Array(64);
function kr() {
  this.init(), this._w = _u, du.call(this, 64, 56);
}
lu(kr, hu);
kr.prototype.init = function() {
  return this._a = 3238371032, this._b = 914150663, this._c = 812702999, this._d = 4144912697, this._e = 4290775857, this._f = 1750603025, this._g = 1694076839, this._h = 3204075428, this;
};
kr.prototype._hash = function() {
  var e = pu.allocUnsafe(28);
  return e.writeInt32BE(this._a, 0), e.writeInt32BE(this._b, 4), e.writeInt32BE(this._c, 8), e.writeInt32BE(this._d, 12), e.writeInt32BE(this._e, 16), e.writeInt32BE(this._f, 20), e.writeInt32BE(this._g, 24), e;
};
var yu = kr, vu = ht, Ro = dt, gu = ze.Buffer, ta = [
  1116352408,
  3609767458,
  1899447441,
  602891725,
  3049323471,
  3964484399,
  3921009573,
  2173295548,
  961987163,
  4081628472,
  1508970993,
  3053834265,
  2453635748,
  2937671579,
  2870763221,
  3664609560,
  3624381080,
  2734883394,
  310598401,
  1164996542,
  607225278,
  1323610764,
  1426881987,
  3590304994,
  1925078388,
  4068182383,
  2162078206,
  991336113,
  2614888103,
  633803317,
  3248222580,
  3479774868,
  3835390401,
  2666613458,
  4022224774,
  944711139,
  264347078,
  2341262773,
  604807628,
  2007800933,
  770255983,
  1495990901,
  1249150122,
  1856431235,
  1555081692,
  3175218132,
  1996064986,
  2198950837,
  2554220882,
  3999719339,
  2821834349,
  766784016,
  2952996808,
  2566594879,
  3210313671,
  3203337956,
  3336571891,
  1034457026,
  3584528711,
  2466948901,
  113926993,
  3758326383,
  338241895,
  168717936,
  666307205,
  1188179964,
  773529912,
  1546045734,
  1294757372,
  1522805485,
  1396182291,
  2643833823,
  1695183700,
  2343527390,
  1986661051,
  1014477480,
  2177026350,
  1206759142,
  2456956037,
  344077627,
  2730485921,
  1290863460,
  2820302411,
  3158454273,
  3259730800,
  3505952657,
  3345764771,
  106217008,
  3516065817,
  3606008344,
  3600352804,
  1432725776,
  4094571909,
  1467031594,
  275423344,
  851169720,
  430227734,
  3100823752,
  506948616,
  1363258195,
  659060556,
  3750685593,
  883997877,
  3785050280,
  958139571,
  3318307427,
  1322822218,
  3812723403,
  1537002063,
  2003034995,
  1747873779,
  3602036899,
  1955562222,
  1575990012,
  2024104815,
  1125592928,
  2227730452,
  2716904306,
  2361852424,
  442776044,
  2428436474,
  593698344,
  2756734187,
  3733110249,
  3204031479,
  2999351573,
  3329325298,
  3815920427,
  3391569614,
  3928383900,
  3515267271,
  566280711,
  3940187606,
  3454069534,
  4118630271,
  4000239992,
  116418474,
  1914138554,
  174292421,
  2731055270,
  289380356,
  3203993006,
  460393269,
  320620315,
  685471733,
  587496836,
  852142971,
  1086792851,
  1017036298,
  365543100,
  1126000580,
  2618297676,
  1288033470,
  3409855158,
  1501505948,
  4234509866,
  1607167915,
  987167468,
  1816402316,
  1246189591
], bu = new Array(160);
function Gt() {
  this.init(), this._w = bu, Ro.call(this, 128, 112);
}
vu(Gt, Ro);
Gt.prototype.init = function() {
  return this._ah = 1779033703, this._bh = 3144134277, this._ch = 1013904242, this._dh = 2773480762, this._eh = 1359893119, this._fh = 2600822924, this._gh = 528734635, this._hh = 1541459225, this._al = 4089235720, this._bl = 2227873595, this._cl = 4271175723, this._dl = 1595750129, this._el = 2917565137, this._fl = 725511199, this._gl = 4215389547, this._hl = 327033209, this;
};
function ra(e, t, r) {
  return r ^ e & (t ^ r);
}
function na(e, t, r) {
  return e & t | r & (e | t);
}
function ia(e, t) {
  return (e >>> 28 | t << 4) ^ (t >>> 2 | e << 30) ^ (t >>> 7 | e << 25);
}
function aa(e, t) {
  return (e >>> 14 | t << 18) ^ (e >>> 18 | t << 14) ^ (t >>> 9 | e << 23);
}
function wu(e, t) {
  return (e >>> 1 | t << 31) ^ (e >>> 8 | t << 24) ^ e >>> 7;
}
function mu(e, t) {
  return (e >>> 1 | t << 31) ^ (e >>> 8 | t << 24) ^ (e >>> 7 | t << 25);
}
function xu(e, t) {
  return (e >>> 19 | t << 13) ^ (t >>> 29 | e << 3) ^ e >>> 6;
}
function Eu(e, t) {
  return (e >>> 19 | t << 13) ^ (t >>> 29 | e << 3) ^ (e >>> 6 | t << 26);
}
function V(e, t) {
  return e >>> 0 < t >>> 0 ? 1 : 0;
}
Gt.prototype._update = function(e) {
  for (var t = this._w, r = this._ah | 0, n = this._bh | 0, i = this._ch | 0, a = this._dh | 0, s = this._eh | 0, o = this._fh | 0, h = this._gh | 0, u = this._hh | 0, l = this._al | 0, _ = this._bl | 0, v = this._cl | 0, g = this._dl | 0, F = this._el | 0, S = this._fl | 0, B = this._gl | 0, w = this._hl | 0, x = 0; x < 32; x += 2)
    t[x] = e.readInt32BE(x * 4), t[x + 1] = e.readInt32BE(x * 4 + 4);
  for (; x < 160; x += 2) {
    var E = t[x - 30], T = t[x - 15 * 2 + 1], A = wu(E, T), C = mu(T, E);
    E = t[x - 2 * 2], T = t[x - 2 * 2 + 1];
    var P = xu(E, T), b = Eu(T, E), O = t[x - 7 * 2], I = t[x - 7 * 2 + 1], $ = t[x - 16 * 2], R = t[x - 16 * 2 + 1], U = C + I | 0, Y = A + O + V(U, C) | 0;
    U = U + b | 0, Y = Y + P + V(U, b) | 0, U = U + R | 0, Y = Y + $ + V(U, R) | 0, t[x] = Y, t[x + 1] = U;
  }
  for (var se = 0; se < 160; se += 2) {
    Y = t[se], U = t[se + 1];
    var Je = na(r, n, i), $e = na(l, _, v), Oe = ia(r, l), Wt = ia(l, r), Cr = aa(s, F), K = aa(F, s), ee = ta[se], gt = ta[se + 1], Vt = ra(s, o, h), bt = ra(F, S, B), re = w + K | 0, ve = u + Cr + V(re, w) | 0;
    re = re + bt | 0, ve = ve + Vt + V(re, bt) | 0, re = re + gt | 0, ve = ve + ee + V(re, gt) | 0, re = re + U | 0, ve = ve + Y + V(re, U) | 0;
    var Qe = Wt + $e | 0, Pr = Oe + Je + V(Qe, Wt) | 0;
    u = h, w = B, h = o, B = S, o = s, S = F, F = g + re | 0, s = a + ve + V(F, g) | 0, a = i, g = v, i = n, v = _, n = r, _ = l, l = re + Qe | 0, r = ve + Pr + V(l, re) | 0;
  }
  this._al = this._al + l | 0, this._bl = this._bl + _ | 0, this._cl = this._cl + v | 0, this._dl = this._dl + g | 0, this._el = this._el + F | 0, this._fl = this._fl + S | 0, this._gl = this._gl + B | 0, this._hl = this._hl + w | 0, this._ah = this._ah + r + V(this._al, l) | 0, this._bh = this._bh + n + V(this._bl, _) | 0, this._ch = this._ch + i + V(this._cl, v) | 0, this._dh = this._dh + a + V(this._dl, g) | 0, this._eh = this._eh + s + V(this._el, F) | 0, this._fh = this._fh + o + V(this._fl, S) | 0, this._gh = this._gh + h + V(this._gl, B) | 0, this._hh = this._hh + u + V(this._hl, w) | 0;
};
Gt.prototype._hash = function() {
  var e = gu.allocUnsafe(64);
  function t(r, n, i) {
    e.writeInt32BE(r, i), e.writeInt32BE(n, i + 4);
  }
  return t(this._ah, this._al, 0), t(this._bh, this._bl, 8), t(this._ch, this._cl, 16), t(this._dh, this._dl, 24), t(this._eh, this._el, 32), t(this._fh, this._fl, 40), t(this._gh, this._gl, 48), t(this._hh, this._hl, 56), e;
};
var Co = Gt, Au = ht, Su = Co, ku = dt, Bu = ze.Buffer, Iu = new Array(160);
function Br() {
  this.init(), this._w = Iu, ku.call(this, 128, 112);
}
Au(Br, Su);
Br.prototype.init = function() {
  return this._ah = 3418070365, this._bh = 1654270250, this._ch = 2438529370, this._dh = 355462360, this._eh = 1731405415, this._fh = 2394180231, this._gh = 3675008525, this._hh = 1203062813, this._al = 3238371032, this._bl = 914150663, this._cl = 812702999, this._dl = 4144912697, this._el = 4290775857, this._fl = 1750603025, this._gl = 1694076839, this._hl = 3204075428, this;
};
Br.prototype._hash = function() {
  var e = Bu.allocUnsafe(48);
  function t(r, n, i) {
    e.writeInt32BE(r, i), e.writeInt32BE(n, i + 4);
  }
  return t(this._ah, this._al, 0), t(this._bh, this._bl, 8), t(this._ch, this._cl, 16), t(this._dh, this._dl, 24), t(this._eh, this._el, 32), t(this._fh, this._fl, 40), e;
};
var Tu = Br;
(function(e) {
  e.exports = function(r) {
    var n = r.toLowerCase(), i = e.exports[n];
    if (!i)
      throw new Error(n + " is not supported (we accept pull requests)");
    return new i();
  }, e.exports.sha = Zc, e.exports.sha1 = Fo, e.exports.sha224 = yu, e.exports.sha256 = Oo, e.exports.sha384 = Tu, e.exports.sha512 = Co;
})(ho);
var Fu = ho.exports;
const $u = /* @__PURE__ */ Ct(Fu);
var ue = function(e) {
  if (e = e || {}, this.Promise = e.Promise || Promise, this.queues = /* @__PURE__ */ Object.create(null), this.domainReentrant = e.domainReentrant || !1, this.domainReentrant) {
    if (typeof process > "u" || typeof process.domain > "u")
      throw new Error(
        "Domain-reentrant locks require `process.domain` to exist. Please flip `opts.domainReentrant = false`, use a NodeJS version that still implements Domain, or install a browser polyfill."
      );
    this.domains = /* @__PURE__ */ Object.create(null);
  }
  this.timeout = e.timeout || ue.DEFAULT_TIMEOUT, this.maxOccupationTime = e.maxOccupationTime || ue.DEFAULT_MAX_OCCUPATION_TIME, this.maxExecutionTime = e.maxExecutionTime || ue.DEFAULT_MAX_EXECUTION_TIME, e.maxPending === 1 / 0 || Number.isInteger(e.maxPending) && e.maxPending >= 0 ? this.maxPending = e.maxPending : this.maxPending = ue.DEFAULT_MAX_PENDING;
};
ue.DEFAULT_TIMEOUT = 0;
ue.DEFAULT_MAX_OCCUPATION_TIME = 0;
ue.DEFAULT_MAX_EXECUTION_TIME = 0;
ue.DEFAULT_MAX_PENDING = 1e3;
ue.prototype.acquire = function(e, t, r, n) {
  if (Array.isArray(e))
    return this._acquireBatch(e, t, r, n);
  if (typeof t != "function")
    throw new Error("You must pass a function to execute");
  var i = null, a = null, s = null;
  typeof r != "function" && (n = r, r = null, s = new this.Promise(function(x, E) {
    i = x, a = E;
  })), n = n || {};
  var o = !1, h = null, u = null, l = null, _ = this, v = function(x, E, T) {
    u && (clearTimeout(u), u = null), l && (clearTimeout(l), l = null), x && (_.queues[e] && _.queues[e].length === 0 && delete _.queues[e], _.domainReentrant && delete _.domains[e]), o || (s ? E ? a(E) : i(T) : typeof r == "function" && r(E, T), o = !0), x && _.queues[e] && _.queues[e].length > 0 && _.queues[e].shift()();
  }, g = function(x) {
    if (o)
      return v(x);
    h && (clearTimeout(h), h = null), _.domainReentrant && x && (_.domains[e] = process.domain);
    var E = n.maxExecutionTime || _.maxExecutionTime;
    if (E && (l = setTimeout(function() {
      _.queues[e] && v(x, new Error("Maximum execution time is exceeded " + e));
    }, E)), t.length === 1) {
      var T = !1;
      try {
        t(function(A, C) {
          T || (T = !0, v(x, A, C));
        });
      } catch (A) {
        T || (T = !0, v(x, A));
      }
    } else
      _._promiseTry(function() {
        return t();
      }).then(function(A) {
        v(x, void 0, A);
      }, function(A) {
        v(x, A);
      });
  };
  _.domainReentrant && process.domain && (g = process.domain.bind(g));
  var F = n.maxPending || _.maxPending;
  if (!_.queues[e])
    _.queues[e] = [], g(!0);
  else if (_.domainReentrant && process.domain && process.domain === _.domains[e])
    g(!1);
  else if (_.queues[e].length >= F)
    v(!1, new Error("Too many pending tasks in queue " + e));
  else {
    var S = function() {
      g(!0);
    };
    n.skipQueue ? _.queues[e].unshift(S) : _.queues[e].push(S);
    var B = n.timeout || _.timeout;
    B && (h = setTimeout(function() {
      h = null, v(!1, new Error("async-lock timed out in queue " + e));
    }, B));
  }
  var w = n.maxOccupationTime || _.maxOccupationTime;
  if (w && (u = setTimeout(function() {
    _.queues[e] && v(!1, new Error("Maximum occupation time is exceeded in queue " + e));
  }, w)), s)
    return s;
};
ue.prototype._acquireBatch = function(e, t, r, n) {
  typeof r != "function" && (n = r, r = null);
  var i = this, a = function(o, h) {
    return function(u) {
      i.acquire(o, h, u, n);
    };
  }, s = e.reduceRight(function(o, h) {
    return a(h, o);
  }, t);
  if (typeof r == "function")
    s(r);
  else
    return new this.Promise(function(o, h) {
      s.length === 1 ? s(function(u, l) {
        u ? h(u) : o(l);
      }) : o(s());
    });
};
ue.prototype.isBusy = function(e) {
  return e ? !!this.queues[e] : Object.keys(this.queues).length > 0;
};
ue.prototype._promiseTry = function(e) {
  try {
    return this.Promise.resolve(e());
  } catch (t) {
    return this.Promise.reject(t);
  }
};
var Po = {};
/*! crc32.js (C) 2014-present SheetJS -- http://sheetjs.com */
(function(e) {
  (function(t) {
    t(typeof DO_NOT_EXPORT_CRC > "u" ? e : {});
  })(function(t) {
    t.version = "1.2.2";
    function r() {
      for (var b = 0, O = new Array(256), I = 0; I != 256; ++I)
        b = I, b = b & 1 ? -306674912 ^ b >>> 1 : b >>> 1, b = b & 1 ? -306674912 ^ b >>> 1 : b >>> 1, b = b & 1 ? -306674912 ^ b >>> 1 : b >>> 1, b = b & 1 ? -306674912 ^ b >>> 1 : b >>> 1, b = b & 1 ? -306674912 ^ b >>> 1 : b >>> 1, b = b & 1 ? -306674912 ^ b >>> 1 : b >>> 1, b = b & 1 ? -306674912 ^ b >>> 1 : b >>> 1, b = b & 1 ? -306674912 ^ b >>> 1 : b >>> 1, O[I] = b;
      return typeof Int32Array < "u" ? new Int32Array(O) : O;
    }
    var n = r();
    function i(b) {
      var O = 0, I = 0, $ = 0, R = typeof Int32Array < "u" ? new Int32Array(4096) : new Array(4096);
      for ($ = 0; $ != 256; ++$) R[$] = b[$];
      for ($ = 0; $ != 256; ++$)
        for (I = b[$], O = 256 + $; O < 4096; O += 256) I = R[O] = I >>> 8 ^ b[I & 255];
      var U = [];
      for ($ = 1; $ != 16; ++$) U[$ - 1] = typeof Int32Array < "u" ? R.subarray($ * 256, $ * 256 + 256) : R.slice($ * 256, $ * 256 + 256);
      return U;
    }
    var a = i(n), s = a[0], o = a[1], h = a[2], u = a[3], l = a[4], _ = a[5], v = a[6], g = a[7], F = a[8], S = a[9], B = a[10], w = a[11], x = a[12], E = a[13], T = a[14];
    function A(b, O) {
      for (var I = O ^ -1, $ = 0, R = b.length; $ < R; ) I = I >>> 8 ^ n[(I ^ b.charCodeAt($++)) & 255];
      return ~I;
    }
    function C(b, O) {
      for (var I = O ^ -1, $ = b.length - 15, R = 0; R < $; ) I = T[b[R++] ^ I & 255] ^ E[b[R++] ^ I >> 8 & 255] ^ x[b[R++] ^ I >> 16 & 255] ^ w[b[R++] ^ I >>> 24] ^ B[b[R++]] ^ S[b[R++]] ^ F[b[R++]] ^ g[b[R++]] ^ v[b[R++]] ^ _[b[R++]] ^ l[b[R++]] ^ u[b[R++]] ^ h[b[R++]] ^ o[b[R++]] ^ s[b[R++]] ^ n[b[R++]];
      for ($ += 15; R < $; ) I = I >>> 8 ^ n[(I ^ b[R++]) & 255];
      return ~I;
    }
    function P(b, O) {
      for (var I = O ^ -1, $ = 0, R = b.length, U = 0, Y = 0; $ < R; )
        U = b.charCodeAt($++), U < 128 ? I = I >>> 8 ^ n[(I ^ U) & 255] : U < 2048 ? (I = I >>> 8 ^ n[(I ^ (192 | U >> 6 & 31)) & 255], I = I >>> 8 ^ n[(I ^ (128 | U & 63)) & 255]) : U >= 55296 && U < 57344 ? (U = (U & 1023) + 64, Y = b.charCodeAt($++) & 1023, I = I >>> 8 ^ n[(I ^ (240 | U >> 8 & 7)) & 255], I = I >>> 8 ^ n[(I ^ (128 | U >> 2 & 63)) & 255], I = I >>> 8 ^ n[(I ^ (128 | Y >> 6 & 15 | (U & 3) << 4)) & 255], I = I >>> 8 ^ n[(I ^ (128 | Y & 63)) & 255]) : (I = I >>> 8 ^ n[(I ^ (224 | U >> 12 & 15)) & 255], I = I >>> 8 ^ n[(I ^ (128 | U >> 6 & 63)) & 255], I = I >>> 8 ^ n[(I ^ (128 | U & 63)) & 255]);
      return ~I;
    }
    t.table = n, t.bstr = A, t.buf = C, t.str = P;
  });
})(Po);
const Ou = /* @__PURE__ */ Ct(Po);
var Fe = {};
(function(e) {
  var t = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Int32Array < "u";
  function r(a, s) {
    return Object.prototype.hasOwnProperty.call(a, s);
  }
  e.assign = function(a) {
    for (var s = Array.prototype.slice.call(arguments, 1); s.length; ) {
      var o = s.shift();
      if (o) {
        if (typeof o != "object")
          throw new TypeError(o + "must be non-object");
        for (var h in o)
          r(o, h) && (a[h] = o[h]);
      }
    }
    return a;
  }, e.shrinkBuf = function(a, s) {
    return a.length === s ? a : a.subarray ? a.subarray(0, s) : (a.length = s, a);
  };
  var n = {
    arraySet: function(a, s, o, h, u) {
      if (s.subarray && a.subarray) {
        a.set(s.subarray(o, o + h), u);
        return;
      }
      for (var l = 0; l < h; l++)
        a[u + l] = s[o + l];
    },
    // Join array of chunks to single array.
    flattenChunks: function(a) {
      var s, o, h, u, l, _;
      for (h = 0, s = 0, o = a.length; s < o; s++)
        h += a[s].length;
      for (_ = new Uint8Array(h), u = 0, s = 0, o = a.length; s < o; s++)
        l = a[s], _.set(l, u), u += l.length;
      return _;
    }
  }, i = {
    arraySet: function(a, s, o, h, u) {
      for (var l = 0; l < h; l++)
        a[u + l] = s[o + l];
    },
    // Join array of chunks to single array.
    flattenChunks: function(a) {
      return [].concat.apply([], a);
    }
  };
  e.setTyped = function(a) {
    a ? (e.Buf8 = Uint8Array, e.Buf16 = Uint16Array, e.Buf32 = Int32Array, e.assign(e, n)) : (e.Buf8 = Array, e.Buf16 = Array, e.Buf32 = Array, e.assign(e, i));
  }, e.setTyped(t);
})(Fe);
var Ht = {}, Ae = {}, pt = {}, Ru = Fe, Cu = 4, oa = 0, sa = 1, Pu = 2;
function _t(e) {
  for (var t = e.length; --t >= 0; )
    e[t] = 0;
}
var Uu = 0, Uo = 1, Du = 2, Nu = 3, Lu = 258, Xn = 29, Zt = 256, It = Zt + 1 + Xn, ft = 30, Kn = 19, Do = 2 * It + 1, je = 15, on = 16, zu = 7, Yn = 256, No = 16, Lo = 17, zo = 18, Sn = (
  /* extra bits for each length code */
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
), ur = (
  /* extra bits for each distance code */
  [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
), Mu = (
  /* extra bits for each bit length code */
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7]
), Mo = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], ju = 512, ke = new Array((It + 2) * 2);
_t(ke);
var xt = new Array(ft * 2);
_t(xt);
var Tt = new Array(ju);
_t(Tt);
var Ft = new Array(Lu - Nu + 1);
_t(Ft);
var Wn = new Array(Xn);
_t(Wn);
var gr = new Array(ft);
_t(gr);
function sn(e, t, r, n, i) {
  this.static_tree = e, this.extra_bits = t, this.extra_base = r, this.elems = n, this.max_length = i, this.has_stree = e && e.length;
}
var jo, Go, Ho;
function fn(e, t) {
  this.dyn_tree = e, this.max_code = 0, this.stat_desc = t;
}
function Zo(e) {
  return e < 256 ? Tt[e] : Tt[256 + (e >>> 7)];
}
function $t(e, t) {
  e.pending_buf[e.pending++] = t & 255, e.pending_buf[e.pending++] = t >>> 8 & 255;
}
function ae(e, t, r) {
  e.bi_valid > on - r ? (e.bi_buf |= t << e.bi_valid & 65535, $t(e, e.bi_buf), e.bi_buf = t >> on - e.bi_valid, e.bi_valid += r - on) : (e.bi_buf |= t << e.bi_valid & 65535, e.bi_valid += r);
}
function xe(e, t, r) {
  ae(
    e,
    r[t * 2],
    r[t * 2 + 1]
    /*.Len*/
  );
}
function qo(e, t) {
  var r = 0;
  do
    r |= e & 1, e >>>= 1, r <<= 1;
  while (--t > 0);
  return r >>> 1;
}
function Gu(e) {
  e.bi_valid === 16 ? ($t(e, e.bi_buf), e.bi_buf = 0, e.bi_valid = 0) : e.bi_valid >= 8 && (e.pending_buf[e.pending++] = e.bi_buf & 255, e.bi_buf >>= 8, e.bi_valid -= 8);
}
function Hu(e, t) {
  var r = t.dyn_tree, n = t.max_code, i = t.stat_desc.static_tree, a = t.stat_desc.has_stree, s = t.stat_desc.extra_bits, o = t.stat_desc.extra_base, h = t.stat_desc.max_length, u, l, _, v, g, F, S = 0;
  for (v = 0; v <= je; v++)
    e.bl_count[v] = 0;
  for (r[e.heap[e.heap_max] * 2 + 1] = 0, u = e.heap_max + 1; u < Do; u++)
    l = e.heap[u], v = r[r[l * 2 + 1] * 2 + 1] + 1, v > h && (v = h, S++), r[l * 2 + 1] = v, !(l > n) && (e.bl_count[v]++, g = 0, l >= o && (g = s[l - o]), F = r[l * 2], e.opt_len += F * (v + g), a && (e.static_len += F * (i[l * 2 + 1] + g)));
  if (S !== 0) {
    do {
      for (v = h - 1; e.bl_count[v] === 0; )
        v--;
      e.bl_count[v]--, e.bl_count[v + 1] += 2, e.bl_count[h]--, S -= 2;
    } while (S > 0);
    for (v = h; v !== 0; v--)
      for (l = e.bl_count[v]; l !== 0; )
        _ = e.heap[--u], !(_ > n) && (r[_ * 2 + 1] !== v && (e.opt_len += (v - r[_ * 2 + 1]) * r[_ * 2], r[_ * 2 + 1] = v), l--);
  }
}
function Xo(e, t, r) {
  var n = new Array(je + 1), i = 0, a, s;
  for (a = 1; a <= je; a++)
    n[a] = i = i + r[a - 1] << 1;
  for (s = 0; s <= t; s++) {
    var o = e[s * 2 + 1];
    o !== 0 && (e[s * 2] = qo(n[o]++, o));
  }
}
function Zu() {
  var e, t, r, n, i, a = new Array(je + 1);
  for (r = 0, n = 0; n < Xn - 1; n++)
    for (Wn[n] = r, e = 0; e < 1 << Sn[n]; e++)
      Ft[r++] = n;
  for (Ft[r - 1] = n, i = 0, n = 0; n < 16; n++)
    for (gr[n] = i, e = 0; e < 1 << ur[n]; e++)
      Tt[i++] = n;
  for (i >>= 7; n < ft; n++)
    for (gr[n] = i << 7, e = 0; e < 1 << ur[n] - 7; e++)
      Tt[256 + i++] = n;
  for (t = 0; t <= je; t++)
    a[t] = 0;
  for (e = 0; e <= 143; )
    ke[e * 2 + 1] = 8, e++, a[8]++;
  for (; e <= 255; )
    ke[e * 2 + 1] = 9, e++, a[9]++;
  for (; e <= 279; )
    ke[e * 2 + 1] = 7, e++, a[7]++;
  for (; e <= 287; )
    ke[e * 2 + 1] = 8, e++, a[8]++;
  for (Xo(ke, It + 1, a), e = 0; e < ft; e++)
    xt[e * 2 + 1] = 5, xt[e * 2] = qo(e, 5);
  jo = new sn(ke, Sn, Zt + 1, It, je), Go = new sn(xt, ur, 0, ft, je), Ho = new sn(new Array(0), Mu, 0, Kn, zu);
}
function Ko(e) {
  var t;
  for (t = 0; t < It; t++)
    e.dyn_ltree[t * 2] = 0;
  for (t = 0; t < ft; t++)
    e.dyn_dtree[t * 2] = 0;
  for (t = 0; t < Kn; t++)
    e.bl_tree[t * 2] = 0;
  e.dyn_ltree[Yn * 2] = 1, e.opt_len = e.static_len = 0, e.last_lit = e.matches = 0;
}
function Yo(e) {
  e.bi_valid > 8 ? $t(e, e.bi_buf) : e.bi_valid > 0 && (e.pending_buf[e.pending++] = e.bi_buf), e.bi_buf = 0, e.bi_valid = 0;
}
function qu(e, t, r, n) {
  Yo(e), $t(e, r), $t(e, ~r), Ru.arraySet(e.pending_buf, e.window, t, r, e.pending), e.pending += r;
}
function fa(e, t, r, n) {
  var i = t * 2, a = r * 2;
  return e[i] < e[a] || e[i] === e[a] && n[t] <= n[r];
}
function cn(e, t, r) {
  for (var n = e.heap[r], i = r << 1; i <= e.heap_len && (i < e.heap_len && fa(t, e.heap[i + 1], e.heap[i], e.depth) && i++, !fa(t, n, e.heap[i], e.depth)); )
    e.heap[r] = e.heap[i], r = i, i <<= 1;
  e.heap[r] = n;
}
function ca(e, t, r) {
  var n, i, a = 0, s, o;
  if (e.last_lit !== 0)
    do
      n = e.pending_buf[e.d_buf + a * 2] << 8 | e.pending_buf[e.d_buf + a * 2 + 1], i = e.pending_buf[e.l_buf + a], a++, n === 0 ? xe(e, i, t) : (s = Ft[i], xe(e, s + Zt + 1, t), o = Sn[s], o !== 0 && (i -= Wn[s], ae(e, i, o)), n--, s = Zo(n), xe(e, s, r), o = ur[s], o !== 0 && (n -= gr[s], ae(e, n, o)));
    while (a < e.last_lit);
  xe(e, Yn, t);
}
function kn(e, t) {
  var r = t.dyn_tree, n = t.stat_desc.static_tree, i = t.stat_desc.has_stree, a = t.stat_desc.elems, s, o, h = -1, u;
  for (e.heap_len = 0, e.heap_max = Do, s = 0; s < a; s++)
    r[s * 2] !== 0 ? (e.heap[++e.heap_len] = h = s, e.depth[s] = 0) : r[s * 2 + 1] = 0;
  for (; e.heap_len < 2; )
    u = e.heap[++e.heap_len] = h < 2 ? ++h : 0, r[u * 2] = 1, e.depth[u] = 0, e.opt_len--, i && (e.static_len -= n[u * 2 + 1]);
  for (t.max_code = h, s = e.heap_len >> 1; s >= 1; s--)
    cn(e, r, s);
  u = a;
  do
    s = e.heap[
      1
      /*SMALLEST*/
    ], e.heap[
      1
      /*SMALLEST*/
    ] = e.heap[e.heap_len--], cn(
      e,
      r,
      1
      /*SMALLEST*/
    ), o = e.heap[
      1
      /*SMALLEST*/
    ], e.heap[--e.heap_max] = s, e.heap[--e.heap_max] = o, r[u * 2] = r[s * 2] + r[o * 2], e.depth[u] = (e.depth[s] >= e.depth[o] ? e.depth[s] : e.depth[o]) + 1, r[s * 2 + 1] = r[o * 2 + 1] = u, e.heap[
      1
      /*SMALLEST*/
    ] = u++, cn(
      e,
      r,
      1
      /*SMALLEST*/
    );
  while (e.heap_len >= 2);
  e.heap[--e.heap_max] = e.heap[
    1
    /*SMALLEST*/
  ], Hu(e, t), Xo(r, h, e.bl_count);
}
function ua(e, t, r) {
  var n, i = -1, a, s = t[0 * 2 + 1], o = 0, h = 7, u = 4;
  for (s === 0 && (h = 138, u = 3), t[(r + 1) * 2 + 1] = 65535, n = 0; n <= r; n++)
    a = s, s = t[(n + 1) * 2 + 1], !(++o < h && a === s) && (o < u ? e.bl_tree[a * 2] += o : a !== 0 ? (a !== i && e.bl_tree[a * 2]++, e.bl_tree[No * 2]++) : o <= 10 ? e.bl_tree[Lo * 2]++ : e.bl_tree[zo * 2]++, o = 0, i = a, s === 0 ? (h = 138, u = 3) : a === s ? (h = 6, u = 3) : (h = 7, u = 4));
}
function la(e, t, r) {
  var n, i = -1, a, s = t[0 * 2 + 1], o = 0, h = 7, u = 4;
  for (s === 0 && (h = 138, u = 3), n = 0; n <= r; n++)
    if (a = s, s = t[(n + 1) * 2 + 1], !(++o < h && a === s)) {
      if (o < u)
        do
          xe(e, a, e.bl_tree);
        while (--o !== 0);
      else a !== 0 ? (a !== i && (xe(e, a, e.bl_tree), o--), xe(e, No, e.bl_tree), ae(e, o - 3, 2)) : o <= 10 ? (xe(e, Lo, e.bl_tree), ae(e, o - 3, 3)) : (xe(e, zo, e.bl_tree), ae(e, o - 11, 7));
      o = 0, i = a, s === 0 ? (h = 138, u = 3) : a === s ? (h = 6, u = 3) : (h = 7, u = 4);
    }
}
function Xu(e) {
  var t;
  for (ua(e, e.dyn_ltree, e.l_desc.max_code), ua(e, e.dyn_dtree, e.d_desc.max_code), kn(e, e.bl_desc), t = Kn - 1; t >= 3 && e.bl_tree[Mo[t] * 2 + 1] === 0; t--)
    ;
  return e.opt_len += 3 * (t + 1) + 5 + 5 + 4, t;
}
function Ku(e, t, r, n) {
  var i;
  for (ae(e, t - 257, 5), ae(e, r - 1, 5), ae(e, n - 4, 4), i = 0; i < n; i++)
    ae(e, e.bl_tree[Mo[i] * 2 + 1], 3);
  la(e, e.dyn_ltree, t - 1), la(e, e.dyn_dtree, r - 1);
}
function Yu(e) {
  var t = 4093624447, r;
  for (r = 0; r <= 31; r++, t >>>= 1)
    if (t & 1 && e.dyn_ltree[r * 2] !== 0)
      return oa;
  if (e.dyn_ltree[9 * 2] !== 0 || e.dyn_ltree[10 * 2] !== 0 || e.dyn_ltree[13 * 2] !== 0)
    return sa;
  for (r = 32; r < Zt; r++)
    if (e.dyn_ltree[r * 2] !== 0)
      return sa;
  return oa;
}
var ha = !1;
function Wu(e) {
  ha || (Zu(), ha = !0), e.l_desc = new fn(e.dyn_ltree, jo), e.d_desc = new fn(e.dyn_dtree, Go), e.bl_desc = new fn(e.bl_tree, Ho), e.bi_buf = 0, e.bi_valid = 0, Ko(e);
}
function Wo(e, t, r, n) {
  ae(e, (Uu << 1) + (n ? 1 : 0), 3), qu(e, t, r);
}
function Vu(e) {
  ae(e, Uo << 1, 3), xe(e, Yn, ke), Gu(e);
}
function Ju(e, t, r, n) {
  var i, a, s = 0;
  e.level > 0 ? (e.strm.data_type === Pu && (e.strm.data_type = Yu(e)), kn(e, e.l_desc), kn(e, e.d_desc), s = Xu(e), i = e.opt_len + 3 + 7 >>> 3, a = e.static_len + 3 + 7 >>> 3, a <= i && (i = a)) : i = a = r + 5, r + 4 <= i && t !== -1 ? Wo(e, t, r, n) : e.strategy === Cu || a === i ? (ae(e, (Uo << 1) + (n ? 1 : 0), 3), ca(e, ke, xt)) : (ae(e, (Du << 1) + (n ? 1 : 0), 3), Ku(e, e.l_desc.max_code + 1, e.d_desc.max_code + 1, s + 1), ca(e, e.dyn_ltree, e.dyn_dtree)), Ko(e), n && Yo(e);
}
function Qu(e, t, r) {
  return e.pending_buf[e.d_buf + e.last_lit * 2] = t >>> 8 & 255, e.pending_buf[e.d_buf + e.last_lit * 2 + 1] = t & 255, e.pending_buf[e.l_buf + e.last_lit] = r & 255, e.last_lit++, t === 0 ? e.dyn_ltree[r * 2]++ : (e.matches++, t--, e.dyn_ltree[(Ft[r] + Zt + 1) * 2]++, e.dyn_dtree[Zo(t) * 2]++), e.last_lit === e.lit_bufsize - 1;
}
pt._tr_init = Wu;
pt._tr_stored_block = Wo;
pt._tr_flush_block = Ju;
pt._tr_tally = Qu;
pt._tr_align = Vu;
function el(e, t, r, n) {
  for (var i = e & 65535 | 0, a = e >>> 16 & 65535 | 0, s = 0; r !== 0; ) {
    s = r > 2e3 ? 2e3 : r, r -= s;
    do
      i = i + t[n++] | 0, a = a + i | 0;
    while (--s);
    i %= 65521, a %= 65521;
  }
  return i | a << 16 | 0;
}
var Vo = el;
function tl() {
  for (var e, t = [], r = 0; r < 256; r++) {
    e = r;
    for (var n = 0; n < 8; n++)
      e = e & 1 ? 3988292384 ^ e >>> 1 : e >>> 1;
    t[r] = e;
  }
  return t;
}
var rl = tl();
function nl(e, t, r, n) {
  var i = rl, a = n + r;
  e ^= -1;
  for (var s = n; s < a; s++)
    e = e >>> 8 ^ i[(e ^ t[s]) & 255];
  return e ^ -1;
}
var Jo = nl, Vn = {
  2: "need dictionary",
  /* Z_NEED_DICT       2  */
  1: "stream end",
  /* Z_STREAM_END      1  */
  0: "",
  /* Z_OK              0  */
  "-1": "file error",
  /* Z_ERRNO         (-1) */
  "-2": "stream error",
  /* Z_STREAM_ERROR  (-2) */
  "-3": "data error",
  /* Z_DATA_ERROR    (-3) */
  "-4": "insufficient memory",
  /* Z_MEM_ERROR     (-4) */
  "-5": "buffer error",
  /* Z_BUF_ERROR     (-5) */
  "-6": "incompatible version"
  /* Z_VERSION_ERROR (-6) */
}, ne = Fe, le = pt, Qo = Vo, Ce = Jo, il = Vn, We = 0, al = 1, ol = 3, Le = 4, da = 5, Ee = 0, pa = 1, he = -2, sl = -3, un = -5, fl = -1, cl = 1, er = 2, ul = 3, ll = 4, hl = 0, dl = 2, Ir = 8, pl = 9, _l = 15, yl = 8, vl = 29, gl = 256, Bn = gl + 1 + vl, bl = 30, wl = 19, ml = 2 * Bn + 1, xl = 15, L = 3, De = 258, _e = De + L + 1, El = 32, Tr = 42, In = 69, lr = 73, hr = 91, dr = 103, Ge = 113, mt = 666, W = 1, qt = 2, Ze = 3, yt = 4, Al = 3;
function Ne(e, t) {
  return e.msg = il[t], t;
}
function _a(e) {
  return (e << 1) - (e > 4 ? 9 : 0);
}
function Ue(e) {
  for (var t = e.length; --t >= 0; )
    e[t] = 0;
}
function Pe(e) {
  var t = e.state, r = t.pending;
  r > e.avail_out && (r = e.avail_out), r !== 0 && (ne.arraySet(e.output, t.pending_buf, t.pending_out, r, e.next_out), e.next_out += r, t.pending_out += r, e.total_out += r, e.avail_out -= r, t.pending -= r, t.pending === 0 && (t.pending_out = 0));
}
function Q(e, t) {
  le._tr_flush_block(e, e.block_start >= 0 ? e.block_start : -1, e.strstart - e.block_start, t), e.block_start = e.strstart, Pe(e.strm);
}
function M(e, t) {
  e.pending_buf[e.pending++] = t;
}
function wt(e, t) {
  e.pending_buf[e.pending++] = t >>> 8 & 255, e.pending_buf[e.pending++] = t & 255;
}
function Sl(e, t, r, n) {
  var i = e.avail_in;
  return i > n && (i = n), i === 0 ? 0 : (e.avail_in -= i, ne.arraySet(t, e.input, e.next_in, i, r), e.state.wrap === 1 ? e.adler = Qo(e.adler, t, i, r) : e.state.wrap === 2 && (e.adler = Ce(e.adler, t, i, r)), e.next_in += i, e.total_in += i, i);
}
function es(e, t) {
  var r = e.max_chain_length, n = e.strstart, i, a, s = e.prev_length, o = e.nice_match, h = e.strstart > e.w_size - _e ? e.strstart - (e.w_size - _e) : 0, u = e.window, l = e.w_mask, _ = e.prev, v = e.strstart + De, g = u[n + s - 1], F = u[n + s];
  e.prev_length >= e.good_match && (r >>= 2), o > e.lookahead && (o = e.lookahead);
  do
    if (i = t, !(u[i + s] !== F || u[i + s - 1] !== g || u[i] !== u[n] || u[++i] !== u[n + 1])) {
      n += 2, i++;
      do
        ;
      while (u[++n] === u[++i] && u[++n] === u[++i] && u[++n] === u[++i] && u[++n] === u[++i] && u[++n] === u[++i] && u[++n] === u[++i] && u[++n] === u[++i] && u[++n] === u[++i] && n < v);
      if (a = De - (v - n), n = v - De, a > s) {
        if (e.match_start = t, s = a, a >= o)
          break;
        g = u[n + s - 1], F = u[n + s];
      }
    }
  while ((t = _[t & l]) > h && --r !== 0);
  return s <= e.lookahead ? s : e.lookahead;
}
function qe(e) {
  var t = e.w_size, r, n, i, a, s;
  do {
    if (a = e.window_size - e.lookahead - e.strstart, e.strstart >= t + (t - _e)) {
      ne.arraySet(e.window, e.window, t, t, 0), e.match_start -= t, e.strstart -= t, e.block_start -= t, n = e.hash_size, r = n;
      do
        i = e.head[--r], e.head[r] = i >= t ? i - t : 0;
      while (--n);
      n = t, r = n;
      do
        i = e.prev[--r], e.prev[r] = i >= t ? i - t : 0;
      while (--n);
      a += t;
    }
    if (e.strm.avail_in === 0)
      break;
    if (n = Sl(e.strm, e.window, e.strstart + e.lookahead, a), e.lookahead += n, e.lookahead + e.insert >= L)
      for (s = e.strstart - e.insert, e.ins_h = e.window[s], e.ins_h = (e.ins_h << e.hash_shift ^ e.window[s + 1]) & e.hash_mask; e.insert && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[s + L - 1]) & e.hash_mask, e.prev[s & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = s, s++, e.insert--, !(e.lookahead + e.insert < L)); )
        ;
  } while (e.lookahead < _e && e.strm.avail_in !== 0);
}
function kl(e, t) {
  var r = 65535;
  for (r > e.pending_buf_size - 5 && (r = e.pending_buf_size - 5); ; ) {
    if (e.lookahead <= 1) {
      if (qe(e), e.lookahead === 0 && t === We)
        return W;
      if (e.lookahead === 0)
        break;
    }
    e.strstart += e.lookahead, e.lookahead = 0;
    var n = e.block_start + r;
    if ((e.strstart === 0 || e.strstart >= n) && (e.lookahead = e.strstart - n, e.strstart = n, Q(e, !1), e.strm.avail_out === 0) || e.strstart - e.block_start >= e.w_size - _e && (Q(e, !1), e.strm.avail_out === 0))
      return W;
  }
  return e.insert = 0, t === Le ? (Q(e, !0), e.strm.avail_out === 0 ? Ze : yt) : (e.strstart > e.block_start && (Q(e, !1), e.strm.avail_out === 0), W);
}
function ln(e, t) {
  for (var r, n; ; ) {
    if (e.lookahead < _e) {
      if (qe(e), e.lookahead < _e && t === We)
        return W;
      if (e.lookahead === 0)
        break;
    }
    if (r = 0, e.lookahead >= L && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + L - 1]) & e.hash_mask, r = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), r !== 0 && e.strstart - r <= e.w_size - _e && (e.match_length = es(e, r)), e.match_length >= L)
      if (n = le._tr_tally(e, e.strstart - e.match_start, e.match_length - L), e.lookahead -= e.match_length, e.match_length <= e.max_lazy_match && e.lookahead >= L) {
        e.match_length--;
        do
          e.strstart++, e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + L - 1]) & e.hash_mask, r = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart;
        while (--e.match_length !== 0);
        e.strstart++;
      } else
        e.strstart += e.match_length, e.match_length = 0, e.ins_h = e.window[e.strstart], e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 1]) & e.hash_mask;
    else
      n = le._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++;
    if (n && (Q(e, !1), e.strm.avail_out === 0))
      return W;
  }
  return e.insert = e.strstart < L - 1 ? e.strstart : L - 1, t === Le ? (Q(e, !0), e.strm.avail_out === 0 ? Ze : yt) : e.last_lit && (Q(e, !1), e.strm.avail_out === 0) ? W : qt;
}
function rt(e, t) {
  for (var r, n, i; ; ) {
    if (e.lookahead < _e) {
      if (qe(e), e.lookahead < _e && t === We)
        return W;
      if (e.lookahead === 0)
        break;
    }
    if (r = 0, e.lookahead >= L && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + L - 1]) & e.hash_mask, r = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), e.prev_length = e.match_length, e.prev_match = e.match_start, e.match_length = L - 1, r !== 0 && e.prev_length < e.max_lazy_match && e.strstart - r <= e.w_size - _e && (e.match_length = es(e, r), e.match_length <= 5 && (e.strategy === cl || e.match_length === L && e.strstart - e.match_start > 4096) && (e.match_length = L - 1)), e.prev_length >= L && e.match_length <= e.prev_length) {
      i = e.strstart + e.lookahead - L, n = le._tr_tally(e, e.strstart - 1 - e.prev_match, e.prev_length - L), e.lookahead -= e.prev_length - 1, e.prev_length -= 2;
      do
        ++e.strstart <= i && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + L - 1]) & e.hash_mask, r = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart);
      while (--e.prev_length !== 0);
      if (e.match_available = 0, e.match_length = L - 1, e.strstart++, n && (Q(e, !1), e.strm.avail_out === 0))
        return W;
    } else if (e.match_available) {
      if (n = le._tr_tally(e, 0, e.window[e.strstart - 1]), n && Q(e, !1), e.strstart++, e.lookahead--, e.strm.avail_out === 0)
        return W;
    } else
      e.match_available = 1, e.strstart++, e.lookahead--;
  }
  return e.match_available && (n = le._tr_tally(e, 0, e.window[e.strstart - 1]), e.match_available = 0), e.insert = e.strstart < L - 1 ? e.strstart : L - 1, t === Le ? (Q(e, !0), e.strm.avail_out === 0 ? Ze : yt) : e.last_lit && (Q(e, !1), e.strm.avail_out === 0) ? W : qt;
}
function Bl(e, t) {
  for (var r, n, i, a, s = e.window; ; ) {
    if (e.lookahead <= De) {
      if (qe(e), e.lookahead <= De && t === We)
        return W;
      if (e.lookahead === 0)
        break;
    }
    if (e.match_length = 0, e.lookahead >= L && e.strstart > 0 && (i = e.strstart - 1, n = s[i], n === s[++i] && n === s[++i] && n === s[++i])) {
      a = e.strstart + De;
      do
        ;
      while (n === s[++i] && n === s[++i] && n === s[++i] && n === s[++i] && n === s[++i] && n === s[++i] && n === s[++i] && n === s[++i] && i < a);
      e.match_length = De - (a - i), e.match_length > e.lookahead && (e.match_length = e.lookahead);
    }
    if (e.match_length >= L ? (r = le._tr_tally(e, 1, e.match_length - L), e.lookahead -= e.match_length, e.strstart += e.match_length, e.match_length = 0) : (r = le._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++), r && (Q(e, !1), e.strm.avail_out === 0))
      return W;
  }
  return e.insert = 0, t === Le ? (Q(e, !0), e.strm.avail_out === 0 ? Ze : yt) : e.last_lit && (Q(e, !1), e.strm.avail_out === 0) ? W : qt;
}
function Il(e, t) {
  for (var r; ; ) {
    if (e.lookahead === 0 && (qe(e), e.lookahead === 0)) {
      if (t === We)
        return W;
      break;
    }
    if (e.match_length = 0, r = le._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++, r && (Q(e, !1), e.strm.avail_out === 0))
      return W;
  }
  return e.insert = 0, t === Le ? (Q(e, !0), e.strm.avail_out === 0 ? Ze : yt) : e.last_lit && (Q(e, !1), e.strm.avail_out === 0) ? W : qt;
}
function be(e, t, r, n, i) {
  this.good_length = e, this.max_lazy = t, this.nice_length = r, this.max_chain = n, this.func = i;
}
var ot;
ot = [
  /*      good lazy nice chain */
  new be(0, 0, 0, 0, kl),
  /* 0 store only */
  new be(4, 4, 8, 4, ln),
  /* 1 max speed, no lazy matches */
  new be(4, 5, 16, 8, ln),
  /* 2 */
  new be(4, 6, 32, 32, ln),
  /* 3 */
  new be(4, 4, 16, 16, rt),
  /* 4 lazy matches */
  new be(8, 16, 32, 32, rt),
  /* 5 */
  new be(8, 16, 128, 128, rt),
  /* 6 */
  new be(8, 32, 128, 256, rt),
  /* 7 */
  new be(32, 128, 258, 1024, rt),
  /* 8 */
  new be(32, 258, 258, 4096, rt)
  /* 9 max compression */
];
function Tl(e) {
  e.window_size = 2 * e.w_size, Ue(e.head), e.max_lazy_match = ot[e.level].max_lazy, e.good_match = ot[e.level].good_length, e.nice_match = ot[e.level].nice_length, e.max_chain_length = ot[e.level].max_chain, e.strstart = 0, e.block_start = 0, e.lookahead = 0, e.insert = 0, e.match_length = e.prev_length = L - 1, e.match_available = 0, e.ins_h = 0;
}
function Fl() {
  this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = Ir, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new ne.Buf16(ml * 2), this.dyn_dtree = new ne.Buf16((2 * bl + 1) * 2), this.bl_tree = new ne.Buf16((2 * wl + 1) * 2), Ue(this.dyn_ltree), Ue(this.dyn_dtree), Ue(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new ne.Buf16(xl + 1), this.heap = new ne.Buf16(2 * Bn + 1), Ue(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new ne.Buf16(2 * Bn + 1), Ue(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
}
function ts(e) {
  var t;
  return !e || !e.state ? Ne(e, he) : (e.total_in = e.total_out = 0, e.data_type = dl, t = e.state, t.pending = 0, t.pending_out = 0, t.wrap < 0 && (t.wrap = -t.wrap), t.status = t.wrap ? Tr : Ge, e.adler = t.wrap === 2 ? 0 : 1, t.last_flush = We, le._tr_init(t), Ee);
}
function rs(e) {
  var t = ts(e);
  return t === Ee && Tl(e.state), t;
}
function $l(e, t) {
  return !e || !e.state || e.state.wrap !== 2 ? he : (e.state.gzhead = t, Ee);
}
function ns(e, t, r, n, i, a) {
  if (!e)
    return he;
  var s = 1;
  if (t === fl && (t = 6), n < 0 ? (s = 0, n = -n) : n > 15 && (s = 2, n -= 16), i < 1 || i > pl || r !== Ir || n < 8 || n > 15 || t < 0 || t > 9 || a < 0 || a > ll)
    return Ne(e, he);
  n === 8 && (n = 9);
  var o = new Fl();
  return e.state = o, o.strm = e, o.wrap = s, o.gzhead = null, o.w_bits = n, o.w_size = 1 << o.w_bits, o.w_mask = o.w_size - 1, o.hash_bits = i + 7, o.hash_size = 1 << o.hash_bits, o.hash_mask = o.hash_size - 1, o.hash_shift = ~~((o.hash_bits + L - 1) / L), o.window = new ne.Buf8(o.w_size * 2), o.head = new ne.Buf16(o.hash_size), o.prev = new ne.Buf16(o.w_size), o.lit_bufsize = 1 << i + 6, o.pending_buf_size = o.lit_bufsize * 4, o.pending_buf = new ne.Buf8(o.pending_buf_size), o.d_buf = 1 * o.lit_bufsize, o.l_buf = 3 * o.lit_bufsize, o.level = t, o.strategy = a, o.method = r, rs(e);
}
function Ol(e, t) {
  return ns(e, t, Ir, _l, yl, hl);
}
function Rl(e, t) {
  var r, n, i, a;
  if (!e || !e.state || t > da || t < 0)
    return e ? Ne(e, he) : he;
  if (n = e.state, !e.output || !e.input && e.avail_in !== 0 || n.status === mt && t !== Le)
    return Ne(e, e.avail_out === 0 ? un : he);
  if (n.strm = e, r = n.last_flush, n.last_flush = t, n.status === Tr)
    if (n.wrap === 2)
      e.adler = 0, M(n, 31), M(n, 139), M(n, 8), n.gzhead ? (M(
        n,
        (n.gzhead.text ? 1 : 0) + (n.gzhead.hcrc ? 2 : 0) + (n.gzhead.extra ? 4 : 0) + (n.gzhead.name ? 8 : 0) + (n.gzhead.comment ? 16 : 0)
      ), M(n, n.gzhead.time & 255), M(n, n.gzhead.time >> 8 & 255), M(n, n.gzhead.time >> 16 & 255), M(n, n.gzhead.time >> 24 & 255), M(n, n.level === 9 ? 2 : n.strategy >= er || n.level < 2 ? 4 : 0), M(n, n.gzhead.os & 255), n.gzhead.extra && n.gzhead.extra.length && (M(n, n.gzhead.extra.length & 255), M(n, n.gzhead.extra.length >> 8 & 255)), n.gzhead.hcrc && (e.adler = Ce(e.adler, n.pending_buf, n.pending, 0)), n.gzindex = 0, n.status = In) : (M(n, 0), M(n, 0), M(n, 0), M(n, 0), M(n, 0), M(n, n.level === 9 ? 2 : n.strategy >= er || n.level < 2 ? 4 : 0), M(n, Al), n.status = Ge);
    else {
      var s = Ir + (n.w_bits - 8 << 4) << 8, o = -1;
      n.strategy >= er || n.level < 2 ? o = 0 : n.level < 6 ? o = 1 : n.level === 6 ? o = 2 : o = 3, s |= o << 6, n.strstart !== 0 && (s |= El), s += 31 - s % 31, n.status = Ge, wt(n, s), n.strstart !== 0 && (wt(n, e.adler >>> 16), wt(n, e.adler & 65535)), e.adler = 1;
    }
  if (n.status === In)
    if (n.gzhead.extra) {
      for (i = n.pending; n.gzindex < (n.gzhead.extra.length & 65535) && !(n.pending === n.pending_buf_size && (n.gzhead.hcrc && n.pending > i && (e.adler = Ce(e.adler, n.pending_buf, n.pending - i, i)), Pe(e), i = n.pending, n.pending === n.pending_buf_size)); )
        M(n, n.gzhead.extra[n.gzindex] & 255), n.gzindex++;
      n.gzhead.hcrc && n.pending > i && (e.adler = Ce(e.adler, n.pending_buf, n.pending - i, i)), n.gzindex === n.gzhead.extra.length && (n.gzindex = 0, n.status = lr);
    } else
      n.status = lr;
  if (n.status === lr)
    if (n.gzhead.name) {
      i = n.pending;
      do {
        if (n.pending === n.pending_buf_size && (n.gzhead.hcrc && n.pending > i && (e.adler = Ce(e.adler, n.pending_buf, n.pending - i, i)), Pe(e), i = n.pending, n.pending === n.pending_buf_size)) {
          a = 1;
          break;
        }
        n.gzindex < n.gzhead.name.length ? a = n.gzhead.name.charCodeAt(n.gzindex++) & 255 : a = 0, M(n, a);
      } while (a !== 0);
      n.gzhead.hcrc && n.pending > i && (e.adler = Ce(e.adler, n.pending_buf, n.pending - i, i)), a === 0 && (n.gzindex = 0, n.status = hr);
    } else
      n.status = hr;
  if (n.status === hr)
    if (n.gzhead.comment) {
      i = n.pending;
      do {
        if (n.pending === n.pending_buf_size && (n.gzhead.hcrc && n.pending > i && (e.adler = Ce(e.adler, n.pending_buf, n.pending - i, i)), Pe(e), i = n.pending, n.pending === n.pending_buf_size)) {
          a = 1;
          break;
        }
        n.gzindex < n.gzhead.comment.length ? a = n.gzhead.comment.charCodeAt(n.gzindex++) & 255 : a = 0, M(n, a);
      } while (a !== 0);
      n.gzhead.hcrc && n.pending > i && (e.adler = Ce(e.adler, n.pending_buf, n.pending - i, i)), a === 0 && (n.status = dr);
    } else
      n.status = dr;
  if (n.status === dr && (n.gzhead.hcrc ? (n.pending + 2 > n.pending_buf_size && Pe(e), n.pending + 2 <= n.pending_buf_size && (M(n, e.adler & 255), M(n, e.adler >> 8 & 255), e.adler = 0, n.status = Ge)) : n.status = Ge), n.pending !== 0) {
    if (Pe(e), e.avail_out === 0)
      return n.last_flush = -1, Ee;
  } else if (e.avail_in === 0 && _a(t) <= _a(r) && t !== Le)
    return Ne(e, un);
  if (n.status === mt && e.avail_in !== 0)
    return Ne(e, un);
  if (e.avail_in !== 0 || n.lookahead !== 0 || t !== We && n.status !== mt) {
    var h = n.strategy === er ? Il(n, t) : n.strategy === ul ? Bl(n, t) : ot[n.level].func(n, t);
    if ((h === Ze || h === yt) && (n.status = mt), h === W || h === Ze)
      return e.avail_out === 0 && (n.last_flush = -1), Ee;
    if (h === qt && (t === al ? le._tr_align(n) : t !== da && (le._tr_stored_block(n, 0, 0, !1), t === ol && (Ue(n.head), n.lookahead === 0 && (n.strstart = 0, n.block_start = 0, n.insert = 0))), Pe(e), e.avail_out === 0))
      return n.last_flush = -1, Ee;
  }
  return t !== Le ? Ee : n.wrap <= 0 ? pa : (n.wrap === 2 ? (M(n, e.adler & 255), M(n, e.adler >> 8 & 255), M(n, e.adler >> 16 & 255), M(n, e.adler >> 24 & 255), M(n, e.total_in & 255), M(n, e.total_in >> 8 & 255), M(n, e.total_in >> 16 & 255), M(n, e.total_in >> 24 & 255)) : (wt(n, e.adler >>> 16), wt(n, e.adler & 65535)), Pe(e), n.wrap > 0 && (n.wrap = -n.wrap), n.pending !== 0 ? Ee : pa);
}
function Cl(e) {
  var t;
  return !e || !e.state ? he : (t = e.state.status, t !== Tr && t !== In && t !== lr && t !== hr && t !== dr && t !== Ge && t !== mt ? Ne(e, he) : (e.state = null, t === Ge ? Ne(e, sl) : Ee));
}
function Pl(e, t) {
  var r = t.length, n, i, a, s, o, h, u, l;
  if (!e || !e.state || (n = e.state, s = n.wrap, s === 2 || s === 1 && n.status !== Tr || n.lookahead))
    return he;
  for (s === 1 && (e.adler = Qo(e.adler, t, r, 0)), n.wrap = 0, r >= n.w_size && (s === 0 && (Ue(n.head), n.strstart = 0, n.block_start = 0, n.insert = 0), l = new ne.Buf8(n.w_size), ne.arraySet(l, t, r - n.w_size, n.w_size, 0), t = l, r = n.w_size), o = e.avail_in, h = e.next_in, u = e.input, e.avail_in = r, e.next_in = 0, e.input = t, qe(n); n.lookahead >= L; ) {
    i = n.strstart, a = n.lookahead - (L - 1);
    do
      n.ins_h = (n.ins_h << n.hash_shift ^ n.window[i + L - 1]) & n.hash_mask, n.prev[i & n.w_mask] = n.head[n.ins_h], n.head[n.ins_h] = i, i++;
    while (--a);
    n.strstart = i, n.lookahead = L - 1, qe(n);
  }
  return n.strstart += n.lookahead, n.block_start = n.strstart, n.insert = n.lookahead, n.lookahead = 0, n.match_length = n.prev_length = L - 1, n.match_available = 0, e.next_in = h, e.input = u, e.avail_in = o, n.wrap = s, Ee;
}
Ae.deflateInit = Ol;
Ae.deflateInit2 = ns;
Ae.deflateReset = rs;
Ae.deflateResetKeep = ts;
Ae.deflateSetHeader = $l;
Ae.deflate = Rl;
Ae.deflateEnd = Cl;
Ae.deflateSetDictionary = Pl;
Ae.deflateInfo = "pako deflate (from Nodeca project)";
var Ve = {}, Fr = Fe, is = !0, as = !0;
try {
  String.fromCharCode.apply(null, [0]);
} catch {
  is = !1;
}
try {
  String.fromCharCode.apply(null, new Uint8Array(1));
} catch {
  as = !1;
}
var Ot = new Fr.Buf8(256);
for (var Re = 0; Re < 256; Re++)
  Ot[Re] = Re >= 252 ? 6 : Re >= 248 ? 5 : Re >= 240 ? 4 : Re >= 224 ? 3 : Re >= 192 ? 2 : 1;
Ot[254] = Ot[254] = 1;
Ve.string2buf = function(e) {
  var t, r, n, i, a, s = e.length, o = 0;
  for (i = 0; i < s; i++)
    r = e.charCodeAt(i), (r & 64512) === 55296 && i + 1 < s && (n = e.charCodeAt(i + 1), (n & 64512) === 56320 && (r = 65536 + (r - 55296 << 10) + (n - 56320), i++)), o += r < 128 ? 1 : r < 2048 ? 2 : r < 65536 ? 3 : 4;
  for (t = new Fr.Buf8(o), a = 0, i = 0; a < o; i++)
    r = e.charCodeAt(i), (r & 64512) === 55296 && i + 1 < s && (n = e.charCodeAt(i + 1), (n & 64512) === 56320 && (r = 65536 + (r - 55296 << 10) + (n - 56320), i++)), r < 128 ? t[a++] = r : r < 2048 ? (t[a++] = 192 | r >>> 6, t[a++] = 128 | r & 63) : r < 65536 ? (t[a++] = 224 | r >>> 12, t[a++] = 128 | r >>> 6 & 63, t[a++] = 128 | r & 63) : (t[a++] = 240 | r >>> 18, t[a++] = 128 | r >>> 12 & 63, t[a++] = 128 | r >>> 6 & 63, t[a++] = 128 | r & 63);
  return t;
};
function os(e, t) {
  if (t < 65534 && (e.subarray && as || !e.subarray && is))
    return String.fromCharCode.apply(null, Fr.shrinkBuf(e, t));
  for (var r = "", n = 0; n < t; n++)
    r += String.fromCharCode(e[n]);
  return r;
}
Ve.buf2binstring = function(e) {
  return os(e, e.length);
};
Ve.binstring2buf = function(e) {
  for (var t = new Fr.Buf8(e.length), r = 0, n = t.length; r < n; r++)
    t[r] = e.charCodeAt(r);
  return t;
};
Ve.buf2string = function(e, t) {
  var r, n, i, a, s = t || e.length, o = new Array(s * 2);
  for (n = 0, r = 0; r < s; ) {
    if (i = e[r++], i < 128) {
      o[n++] = i;
      continue;
    }
    if (a = Ot[i], a > 4) {
      o[n++] = 65533, r += a - 1;
      continue;
    }
    for (i &= a === 2 ? 31 : a === 3 ? 15 : 7; a > 1 && r < s; )
      i = i << 6 | e[r++] & 63, a--;
    if (a > 1) {
      o[n++] = 65533;
      continue;
    }
    i < 65536 ? o[n++] = i : (i -= 65536, o[n++] = 55296 | i >> 10 & 1023, o[n++] = 56320 | i & 1023);
  }
  return os(o, n);
};
Ve.utf8border = function(e, t) {
  var r;
  for (t = t || e.length, t > e.length && (t = e.length), r = t - 1; r >= 0 && (e[r] & 192) === 128; )
    r--;
  return r < 0 || r === 0 ? t : r + Ot[e[r]] > t ? r : t;
};
function Ul() {
  this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
}
var ss = Ul, Et = Ae, At = Fe, Tn = Ve, Fn = Vn, Dl = ss, fs = Object.prototype.toString, Nl = 0, hn = 4, ct = 0, ya = 1, va = 2, Ll = -1, zl = 0, Ml = 8;
function Xe(e) {
  if (!(this instanceof Xe)) return new Xe(e);
  this.options = At.assign({
    level: Ll,
    method: Ml,
    chunkSize: 16384,
    windowBits: 15,
    memLevel: 8,
    strategy: zl,
    to: ""
  }, e || {});
  var t = this.options;
  t.raw && t.windowBits > 0 ? t.windowBits = -t.windowBits : t.gzip && t.windowBits > 0 && t.windowBits < 16 && (t.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new Dl(), this.strm.avail_out = 0;
  var r = Et.deflateInit2(
    this.strm,
    t.level,
    t.method,
    t.windowBits,
    t.memLevel,
    t.strategy
  );
  if (r !== ct)
    throw new Error(Fn[r]);
  if (t.header && Et.deflateSetHeader(this.strm, t.header), t.dictionary) {
    var n;
    if (typeof t.dictionary == "string" ? n = Tn.string2buf(t.dictionary) : fs.call(t.dictionary) === "[object ArrayBuffer]" ? n = new Uint8Array(t.dictionary) : n = t.dictionary, r = Et.deflateSetDictionary(this.strm, n), r !== ct)
      throw new Error(Fn[r]);
    this._dict_set = !0;
  }
}
Xe.prototype.push = function(e, t) {
  var r = this.strm, n = this.options.chunkSize, i, a;
  if (this.ended)
    return !1;
  a = t === ~~t ? t : t === !0 ? hn : Nl, typeof e == "string" ? r.input = Tn.string2buf(e) : fs.call(e) === "[object ArrayBuffer]" ? r.input = new Uint8Array(e) : r.input = e, r.next_in = 0, r.avail_in = r.input.length;
  do {
    if (r.avail_out === 0 && (r.output = new At.Buf8(n), r.next_out = 0, r.avail_out = n), i = Et.deflate(r, a), i !== ya && i !== ct)
      return this.onEnd(i), this.ended = !0, !1;
    (r.avail_out === 0 || r.avail_in === 0 && (a === hn || a === va)) && (this.options.to === "string" ? this.onData(Tn.buf2binstring(At.shrinkBuf(r.output, r.next_out))) : this.onData(At.shrinkBuf(r.output, r.next_out)));
  } while ((r.avail_in > 0 || r.avail_out === 0) && i !== ya);
  return a === hn ? (i = Et.deflateEnd(this.strm), this.onEnd(i), this.ended = !0, i === ct) : (a === va && (this.onEnd(ct), r.avail_out = 0), !0);
};
Xe.prototype.onData = function(e) {
  this.chunks.push(e);
};
Xe.prototype.onEnd = function(e) {
  e === ct && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = At.flattenChunks(this.chunks)), this.chunks = [], this.err = e, this.msg = this.strm.msg;
};
function Jn(e, t) {
  var r = new Xe(t);
  if (r.push(e, !0), r.err)
    throw r.msg || Fn[r.err];
  return r.result;
}
function jl(e, t) {
  return t = t || {}, t.raw = !0, Jn(e, t);
}
function Gl(e, t) {
  return t = t || {}, t.gzip = !0, Jn(e, t);
}
Ht.Deflate = Xe;
Ht.deflate = Jn;
Ht.deflateRaw = jl;
Ht.gzip = Gl;
var Xt = {}, ye = {}, tr = 30, Hl = 12, Zl = function(t, r) {
  var n, i, a, s, o, h, u, l, _, v, g, F, S, B, w, x, E, T, A, C, P, b, O, I, $;
  n = t.state, i = t.next_in, I = t.input, a = i + (t.avail_in - 5), s = t.next_out, $ = t.output, o = s - (r - t.avail_out), h = s + (t.avail_out - 257), u = n.dmax, l = n.wsize, _ = n.whave, v = n.wnext, g = n.window, F = n.hold, S = n.bits, B = n.lencode, w = n.distcode, x = (1 << n.lenbits) - 1, E = (1 << n.distbits) - 1;
  e:
    do {
      S < 15 && (F += I[i++] << S, S += 8, F += I[i++] << S, S += 8), T = B[F & x];
      t:
        for (; ; ) {
          if (A = T >>> 24, F >>>= A, S -= A, A = T >>> 16 & 255, A === 0)
            $[s++] = T & 65535;
          else if (A & 16) {
            C = T & 65535, A &= 15, A && (S < A && (F += I[i++] << S, S += 8), C += F & (1 << A) - 1, F >>>= A, S -= A), S < 15 && (F += I[i++] << S, S += 8, F += I[i++] << S, S += 8), T = w[F & E];
            r:
              for (; ; ) {
                if (A = T >>> 24, F >>>= A, S -= A, A = T >>> 16 & 255, A & 16) {
                  if (P = T & 65535, A &= 15, S < A && (F += I[i++] << S, S += 8, S < A && (F += I[i++] << S, S += 8)), P += F & (1 << A) - 1, P > u) {
                    t.msg = "invalid distance too far back", n.mode = tr;
                    break e;
                  }
                  if (F >>>= A, S -= A, A = s - o, P > A) {
                    if (A = P - A, A > _ && n.sane) {
                      t.msg = "invalid distance too far back", n.mode = tr;
                      break e;
                    }
                    if (b = 0, O = g, v === 0) {
                      if (b += l - A, A < C) {
                        C -= A;
                        do
                          $[s++] = g[b++];
                        while (--A);
                        b = s - P, O = $;
                      }
                    } else if (v < A) {
                      if (b += l + v - A, A -= v, A < C) {
                        C -= A;
                        do
                          $[s++] = g[b++];
                        while (--A);
                        if (b = 0, v < C) {
                          A = v, C -= A;
                          do
                            $[s++] = g[b++];
                          while (--A);
                          b = s - P, O = $;
                        }
                      }
                    } else if (b += v - A, A < C) {
                      C -= A;
                      do
                        $[s++] = g[b++];
                      while (--A);
                      b = s - P, O = $;
                    }
                    for (; C > 2; )
                      $[s++] = O[b++], $[s++] = O[b++], $[s++] = O[b++], C -= 3;
                    C && ($[s++] = O[b++], C > 1 && ($[s++] = O[b++]));
                  } else {
                    b = s - P;
                    do
                      $[s++] = $[b++], $[s++] = $[b++], $[s++] = $[b++], C -= 3;
                    while (C > 2);
                    C && ($[s++] = $[b++], C > 1 && ($[s++] = $[b++]));
                  }
                } else if (A & 64) {
                  t.msg = "invalid distance code", n.mode = tr;
                  break e;
                } else {
                  T = w[(T & 65535) + (F & (1 << A) - 1)];
                  continue r;
                }
                break;
              }
          } else if (A & 64)
            if (A & 32) {
              n.mode = Hl;
              break e;
            } else {
              t.msg = "invalid literal/length code", n.mode = tr;
              break e;
            }
          else {
            T = B[(T & 65535) + (F & (1 << A) - 1)];
            continue t;
          }
          break;
        }
    } while (i < a && s < h);
  C = S >> 3, i -= C, S -= C << 3, F &= (1 << S) - 1, t.next_in = i, t.next_out = s, t.avail_in = i < a ? 5 + (a - i) : 5 - (i - a), t.avail_out = s < h ? 257 + (h - s) : 257 - (s - h), n.hold = F, n.bits = S;
}, ga = Fe, nt = 15, ba = 852, wa = 592, ma = 0, dn = 1, xa = 2, ql = [
  /* Length codes 257..285 base */
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258,
  0,
  0
], Xl = [
  /* Length codes 257..285 extra */
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  17,
  17,
  17,
  17,
  18,
  18,
  18,
  18,
  19,
  19,
  19,
  19,
  20,
  20,
  20,
  20,
  21,
  21,
  21,
  21,
  16,
  72,
  78
], Kl = [
  /* Distance codes 0..29 base */
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577,
  0,
  0
], Yl = [
  /* Distance codes 0..29 extra */
  16,
  16,
  16,
  16,
  17,
  17,
  18,
  18,
  19,
  19,
  20,
  20,
  21,
  21,
  22,
  22,
  23,
  23,
  24,
  24,
  25,
  25,
  26,
  26,
  27,
  27,
  28,
  28,
  29,
  29,
  64,
  64
], Wl = function(t, r, n, i, a, s, o, h) {
  var u = h.bits, l = 0, _ = 0, v = 0, g = 0, F = 0, S = 0, B = 0, w = 0, x = 0, E = 0, T, A, C, P, b, O = null, I = 0, $, R = new ga.Buf16(nt + 1), U = new ga.Buf16(nt + 1), Y = null, se = 0, Je, $e, Oe;
  for (l = 0; l <= nt; l++)
    R[l] = 0;
  for (_ = 0; _ < i; _++)
    R[r[n + _]]++;
  for (F = u, g = nt; g >= 1 && R[g] === 0; g--)
    ;
  if (F > g && (F = g), g === 0)
    return a[s++] = 1 << 24 | 64 << 16 | 0, a[s++] = 1 << 24 | 64 << 16 | 0, h.bits = 1, 0;
  for (v = 1; v < g && R[v] === 0; v++)
    ;
  for (F < v && (F = v), w = 1, l = 1; l <= nt; l++)
    if (w <<= 1, w -= R[l], w < 0)
      return -1;
  if (w > 0 && (t === ma || g !== 1))
    return -1;
  for (U[1] = 0, l = 1; l < nt; l++)
    U[l + 1] = U[l] + R[l];
  for (_ = 0; _ < i; _++)
    r[n + _] !== 0 && (o[U[r[n + _]]++] = _);
  if (t === ma ? (O = Y = o, $ = 19) : t === dn ? (O = ql, I -= 257, Y = Xl, se -= 257, $ = 256) : (O = Kl, Y = Yl, $ = -1), E = 0, _ = 0, l = v, b = s, S = F, B = 0, C = -1, x = 1 << F, P = x - 1, t === dn && x > ba || t === xa && x > wa)
    return 1;
  for (; ; ) {
    Je = l - B, o[_] < $ ? ($e = 0, Oe = o[_]) : o[_] > $ ? ($e = Y[se + o[_]], Oe = O[I + o[_]]) : ($e = 96, Oe = 0), T = 1 << l - B, A = 1 << S, v = A;
    do
      A -= T, a[b + (E >> B) + A] = Je << 24 | $e << 16 | Oe | 0;
    while (A !== 0);
    for (T = 1 << l - 1; E & T; )
      T >>= 1;
    if (T !== 0 ? (E &= T - 1, E += T) : E = 0, _++, --R[l] === 0) {
      if (l === g)
        break;
      l = r[n + o[_]];
    }
    if (l > F && (E & P) !== C) {
      for (B === 0 && (B = F), b += v, S = l - B, w = 1 << S; S + B < g && (w -= R[S + B], !(w <= 0)); )
        S++, w <<= 1;
      if (x += 1 << S, t === dn && x > ba || t === xa && x > wa)
        return 1;
      C = E & P, a[C] = F << 24 | S << 16 | b - s | 0;
    }
  }
  return E !== 0 && (a[b + E] = l - B << 24 | 64 << 16 | 0), h.bits = F, 0;
}, oe = Fe, $n = Vo, we = Jo, Vl = Zl, St = Wl, Jl = 0, cs = 1, us = 2, Ea = 4, Ql = 5, rr = 6, Ke = 0, eh = 1, th = 2, de = -2, ls = -3, hs = -4, rh = -5, Aa = 8, ds = 1, Sa = 2, ka = 3, Ba = 4, Ia = 5, Ta = 6, Fa = 7, $a = 8, Oa = 9, Ra = 10, br = 11, Se = 12, pn = 13, Ca = 14, _n = 15, Pa = 16, Ua = 17, Da = 18, Na = 19, nr = 20, ir = 21, La = 22, za = 23, Ma = 24, ja = 25, Ga = 26, yn = 27, Ha = 28, Za = 29, Z = 30, ps = 31, nh = 32, ih = 852, ah = 592, oh = 15, sh = oh;
function qa(e) {
  return (e >>> 24 & 255) + (e >>> 8 & 65280) + ((e & 65280) << 8) + ((e & 255) << 24);
}
function fh() {
  this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new oe.Buf16(320), this.work = new oe.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
}
function _s(e) {
  var t;
  return !e || !e.state ? de : (t = e.state, e.total_in = e.total_out = t.total = 0, e.msg = "", t.wrap && (e.adler = t.wrap & 1), t.mode = ds, t.last = 0, t.havedict = 0, t.dmax = 32768, t.head = null, t.hold = 0, t.bits = 0, t.lencode = t.lendyn = new oe.Buf32(ih), t.distcode = t.distdyn = new oe.Buf32(ah), t.sane = 1, t.back = -1, Ke);
}
function ys(e) {
  var t;
  return !e || !e.state ? de : (t = e.state, t.wsize = 0, t.whave = 0, t.wnext = 0, _s(e));
}
function vs(e, t) {
  var r, n;
  return !e || !e.state || (n = e.state, t < 0 ? (r = 0, t = -t) : (r = (t >> 4) + 1, t < 48 && (t &= 15)), t && (t < 8 || t > 15)) ? de : (n.window !== null && n.wbits !== t && (n.window = null), n.wrap = r, n.wbits = t, ys(e));
}
function gs(e, t) {
  var r, n;
  return e ? (n = new fh(), e.state = n, n.window = null, r = vs(e, t), r !== Ke && (e.state = null), r) : de;
}
function ch(e) {
  return gs(e, sh);
}
var Xa = !0, vn, gn;
function uh(e) {
  if (Xa) {
    var t;
    for (vn = new oe.Buf32(512), gn = new oe.Buf32(32), t = 0; t < 144; )
      e.lens[t++] = 8;
    for (; t < 256; )
      e.lens[t++] = 9;
    for (; t < 280; )
      e.lens[t++] = 7;
    for (; t < 288; )
      e.lens[t++] = 8;
    for (St(cs, e.lens, 0, 288, vn, 0, e.work, { bits: 9 }), t = 0; t < 32; )
      e.lens[t++] = 5;
    St(us, e.lens, 0, 32, gn, 0, e.work, { bits: 5 }), Xa = !1;
  }
  e.lencode = vn, e.lenbits = 9, e.distcode = gn, e.distbits = 5;
}
function bs(e, t, r, n) {
  var i, a = e.state;
  return a.window === null && (a.wsize = 1 << a.wbits, a.wnext = 0, a.whave = 0, a.window = new oe.Buf8(a.wsize)), n >= a.wsize ? (oe.arraySet(a.window, t, r - a.wsize, a.wsize, 0), a.wnext = 0, a.whave = a.wsize) : (i = a.wsize - a.wnext, i > n && (i = n), oe.arraySet(a.window, t, r - n, i, a.wnext), n -= i, n ? (oe.arraySet(a.window, t, r - n, n, 0), a.wnext = n, a.whave = a.wsize) : (a.wnext += i, a.wnext === a.wsize && (a.wnext = 0), a.whave < a.wsize && (a.whave += i))), 0;
}
function lh(e, t) {
  var r, n, i, a, s, o, h, u, l, _, v, g, F, S, B = 0, w, x, E, T, A, C, P, b, O = new oe.Buf8(4), I, $, R = (
    /* permutation of code lengths */
    [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]
  );
  if (!e || !e.state || !e.output || !e.input && e.avail_in !== 0)
    return de;
  r = e.state, r.mode === Se && (r.mode = pn), s = e.next_out, i = e.output, h = e.avail_out, a = e.next_in, n = e.input, o = e.avail_in, u = r.hold, l = r.bits, _ = o, v = h, b = Ke;
  e:
    for (; ; )
      switch (r.mode) {
        case ds:
          if (r.wrap === 0) {
            r.mode = pn;
            break;
          }
          for (; l < 16; ) {
            if (o === 0)
              break e;
            o--, u += n[a++] << l, l += 8;
          }
          if (r.wrap & 2 && u === 35615) {
            r.check = 0, O[0] = u & 255, O[1] = u >>> 8 & 255, r.check = we(r.check, O, 2, 0), u = 0, l = 0, r.mode = Sa;
            break;
          }
          if (r.flags = 0, r.head && (r.head.done = !1), !(r.wrap & 1) || /* check if zlib header allowed */
          (((u & 255) << 8) + (u >> 8)) % 31) {
            e.msg = "incorrect header check", r.mode = Z;
            break;
          }
          if ((u & 15) !== Aa) {
            e.msg = "unknown compression method", r.mode = Z;
            break;
          }
          if (u >>>= 4, l -= 4, P = (u & 15) + 8, r.wbits === 0)
            r.wbits = P;
          else if (P > r.wbits) {
            e.msg = "invalid window size", r.mode = Z;
            break;
          }
          r.dmax = 1 << P, e.adler = r.check = 1, r.mode = u & 512 ? Ra : Se, u = 0, l = 0;
          break;
        case Sa:
          for (; l < 16; ) {
            if (o === 0)
              break e;
            o--, u += n[a++] << l, l += 8;
          }
          if (r.flags = u, (r.flags & 255) !== Aa) {
            e.msg = "unknown compression method", r.mode = Z;
            break;
          }
          if (r.flags & 57344) {
            e.msg = "unknown header flags set", r.mode = Z;
            break;
          }
          r.head && (r.head.text = u >> 8 & 1), r.flags & 512 && (O[0] = u & 255, O[1] = u >>> 8 & 255, r.check = we(r.check, O, 2, 0)), u = 0, l = 0, r.mode = ka;
        case ka:
          for (; l < 32; ) {
            if (o === 0)
              break e;
            o--, u += n[a++] << l, l += 8;
          }
          r.head && (r.head.time = u), r.flags & 512 && (O[0] = u & 255, O[1] = u >>> 8 & 255, O[2] = u >>> 16 & 255, O[3] = u >>> 24 & 255, r.check = we(r.check, O, 4, 0)), u = 0, l = 0, r.mode = Ba;
        case Ba:
          for (; l < 16; ) {
            if (o === 0)
              break e;
            o--, u += n[a++] << l, l += 8;
          }
          r.head && (r.head.xflags = u & 255, r.head.os = u >> 8), r.flags & 512 && (O[0] = u & 255, O[1] = u >>> 8 & 255, r.check = we(r.check, O, 2, 0)), u = 0, l = 0, r.mode = Ia;
        case Ia:
          if (r.flags & 1024) {
            for (; l < 16; ) {
              if (o === 0)
                break e;
              o--, u += n[a++] << l, l += 8;
            }
            r.length = u, r.head && (r.head.extra_len = u), r.flags & 512 && (O[0] = u & 255, O[1] = u >>> 8 & 255, r.check = we(r.check, O, 2, 0)), u = 0, l = 0;
          } else r.head && (r.head.extra = null);
          r.mode = Ta;
        case Ta:
          if (r.flags & 1024 && (g = r.length, g > o && (g = o), g && (r.head && (P = r.head.extra_len - r.length, r.head.extra || (r.head.extra = new Array(r.head.extra_len)), oe.arraySet(
            r.head.extra,
            n,
            a,
            // extra field is limited to 65536 bytes
            // - no need for additional size check
            g,
            /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
            P
          )), r.flags & 512 && (r.check = we(r.check, n, g, a)), o -= g, a += g, r.length -= g), r.length))
            break e;
          r.length = 0, r.mode = Fa;
        case Fa:
          if (r.flags & 2048) {
            if (o === 0)
              break e;
            g = 0;
            do
              P = n[a + g++], r.head && P && r.length < 65536 && (r.head.name += String.fromCharCode(P));
            while (P && g < o);
            if (r.flags & 512 && (r.check = we(r.check, n, g, a)), o -= g, a += g, P)
              break e;
          } else r.head && (r.head.name = null);
          r.length = 0, r.mode = $a;
        case $a:
          if (r.flags & 4096) {
            if (o === 0)
              break e;
            g = 0;
            do
              P = n[a + g++], r.head && P && r.length < 65536 && (r.head.comment += String.fromCharCode(P));
            while (P && g < o);
            if (r.flags & 512 && (r.check = we(r.check, n, g, a)), o -= g, a += g, P)
              break e;
          } else r.head && (r.head.comment = null);
          r.mode = Oa;
        case Oa:
          if (r.flags & 512) {
            for (; l < 16; ) {
              if (o === 0)
                break e;
              o--, u += n[a++] << l, l += 8;
            }
            if (u !== (r.check & 65535)) {
              e.msg = "header crc mismatch", r.mode = Z;
              break;
            }
            u = 0, l = 0;
          }
          r.head && (r.head.hcrc = r.flags >> 9 & 1, r.head.done = !0), e.adler = r.check = 0, r.mode = Se;
          break;
        case Ra:
          for (; l < 32; ) {
            if (o === 0)
              break e;
            o--, u += n[a++] << l, l += 8;
          }
          e.adler = r.check = qa(u), u = 0, l = 0, r.mode = br;
        case br:
          if (r.havedict === 0)
            return e.next_out = s, e.avail_out = h, e.next_in = a, e.avail_in = o, r.hold = u, r.bits = l, th;
          e.adler = r.check = 1, r.mode = Se;
        case Se:
          if (t === Ql || t === rr)
            break e;
        case pn:
          if (r.last) {
            u >>>= l & 7, l -= l & 7, r.mode = yn;
            break;
          }
          for (; l < 3; ) {
            if (o === 0)
              break e;
            o--, u += n[a++] << l, l += 8;
          }
          switch (r.last = u & 1, u >>>= 1, l -= 1, u & 3) {
            case 0:
              r.mode = Ca;
              break;
            case 1:
              if (uh(r), r.mode = nr, t === rr) {
                u >>>= 2, l -= 2;
                break e;
              }
              break;
            case 2:
              r.mode = Ua;
              break;
            case 3:
              e.msg = "invalid block type", r.mode = Z;
          }
          u >>>= 2, l -= 2;
          break;
        case Ca:
          for (u >>>= l & 7, l -= l & 7; l < 32; ) {
            if (o === 0)
              break e;
            o--, u += n[a++] << l, l += 8;
          }
          if ((u & 65535) !== (u >>> 16 ^ 65535)) {
            e.msg = "invalid stored block lengths", r.mode = Z;
            break;
          }
          if (r.length = u & 65535, u = 0, l = 0, r.mode = _n, t === rr)
            break e;
        case _n:
          r.mode = Pa;
        case Pa:
          if (g = r.length, g) {
            if (g > o && (g = o), g > h && (g = h), g === 0)
              break e;
            oe.arraySet(i, n, a, g, s), o -= g, a += g, h -= g, s += g, r.length -= g;
            break;
          }
          r.mode = Se;
          break;
        case Ua:
          for (; l < 14; ) {
            if (o === 0)
              break e;
            o--, u += n[a++] << l, l += 8;
          }
          if (r.nlen = (u & 31) + 257, u >>>= 5, l -= 5, r.ndist = (u & 31) + 1, u >>>= 5, l -= 5, r.ncode = (u & 15) + 4, u >>>= 4, l -= 4, r.nlen > 286 || r.ndist > 30) {
            e.msg = "too many length or distance symbols", r.mode = Z;
            break;
          }
          r.have = 0, r.mode = Da;
        case Da:
          for (; r.have < r.ncode; ) {
            for (; l < 3; ) {
              if (o === 0)
                break e;
              o--, u += n[a++] << l, l += 8;
            }
            r.lens[R[r.have++]] = u & 7, u >>>= 3, l -= 3;
          }
          for (; r.have < 19; )
            r.lens[R[r.have++]] = 0;
          if (r.lencode = r.lendyn, r.lenbits = 7, I = { bits: r.lenbits }, b = St(Jl, r.lens, 0, 19, r.lencode, 0, r.work, I), r.lenbits = I.bits, b) {
            e.msg = "invalid code lengths set", r.mode = Z;
            break;
          }
          r.have = 0, r.mode = Na;
        case Na:
          for (; r.have < r.nlen + r.ndist; ) {
            for (; B = r.lencode[u & (1 << r.lenbits) - 1], w = B >>> 24, x = B >>> 16 & 255, E = B & 65535, !(w <= l); ) {
              if (o === 0)
                break e;
              o--, u += n[a++] << l, l += 8;
            }
            if (E < 16)
              u >>>= w, l -= w, r.lens[r.have++] = E;
            else {
              if (E === 16) {
                for ($ = w + 2; l < $; ) {
                  if (o === 0)
                    break e;
                  o--, u += n[a++] << l, l += 8;
                }
                if (u >>>= w, l -= w, r.have === 0) {
                  e.msg = "invalid bit length repeat", r.mode = Z;
                  break;
                }
                P = r.lens[r.have - 1], g = 3 + (u & 3), u >>>= 2, l -= 2;
              } else if (E === 17) {
                for ($ = w + 3; l < $; ) {
                  if (o === 0)
                    break e;
                  o--, u += n[a++] << l, l += 8;
                }
                u >>>= w, l -= w, P = 0, g = 3 + (u & 7), u >>>= 3, l -= 3;
              } else {
                for ($ = w + 7; l < $; ) {
                  if (o === 0)
                    break e;
                  o--, u += n[a++] << l, l += 8;
                }
                u >>>= w, l -= w, P = 0, g = 11 + (u & 127), u >>>= 7, l -= 7;
              }
              if (r.have + g > r.nlen + r.ndist) {
                e.msg = "invalid bit length repeat", r.mode = Z;
                break;
              }
              for (; g--; )
                r.lens[r.have++] = P;
            }
          }
          if (r.mode === Z)
            break;
          if (r.lens[256] === 0) {
            e.msg = "invalid code -- missing end-of-block", r.mode = Z;
            break;
          }
          if (r.lenbits = 9, I = { bits: r.lenbits }, b = St(cs, r.lens, 0, r.nlen, r.lencode, 0, r.work, I), r.lenbits = I.bits, b) {
            e.msg = "invalid literal/lengths set", r.mode = Z;
            break;
          }
          if (r.distbits = 6, r.distcode = r.distdyn, I = { bits: r.distbits }, b = St(us, r.lens, r.nlen, r.ndist, r.distcode, 0, r.work, I), r.distbits = I.bits, b) {
            e.msg = "invalid distances set", r.mode = Z;
            break;
          }
          if (r.mode = nr, t === rr)
            break e;
        case nr:
          r.mode = ir;
        case ir:
          if (o >= 6 && h >= 258) {
            e.next_out = s, e.avail_out = h, e.next_in = a, e.avail_in = o, r.hold = u, r.bits = l, Vl(e, v), s = e.next_out, i = e.output, h = e.avail_out, a = e.next_in, n = e.input, o = e.avail_in, u = r.hold, l = r.bits, r.mode === Se && (r.back = -1);
            break;
          }
          for (r.back = 0; B = r.lencode[u & (1 << r.lenbits) - 1], w = B >>> 24, x = B >>> 16 & 255, E = B & 65535, !(w <= l); ) {
            if (o === 0)
              break e;
            o--, u += n[a++] << l, l += 8;
          }
          if (x && !(x & 240)) {
            for (T = w, A = x, C = E; B = r.lencode[C + ((u & (1 << T + A) - 1) >> T)], w = B >>> 24, x = B >>> 16 & 255, E = B & 65535, !(T + w <= l); ) {
              if (o === 0)
                break e;
              o--, u += n[a++] << l, l += 8;
            }
            u >>>= T, l -= T, r.back += T;
          }
          if (u >>>= w, l -= w, r.back += w, r.length = E, x === 0) {
            r.mode = Ga;
            break;
          }
          if (x & 32) {
            r.back = -1, r.mode = Se;
            break;
          }
          if (x & 64) {
            e.msg = "invalid literal/length code", r.mode = Z;
            break;
          }
          r.extra = x & 15, r.mode = La;
        case La:
          if (r.extra) {
            for ($ = r.extra; l < $; ) {
              if (o === 0)
                break e;
              o--, u += n[a++] << l, l += 8;
            }
            r.length += u & (1 << r.extra) - 1, u >>>= r.extra, l -= r.extra, r.back += r.extra;
          }
          r.was = r.length, r.mode = za;
        case za:
          for (; B = r.distcode[u & (1 << r.distbits) - 1], w = B >>> 24, x = B >>> 16 & 255, E = B & 65535, !(w <= l); ) {
            if (o === 0)
              break e;
            o--, u += n[a++] << l, l += 8;
          }
          if (!(x & 240)) {
            for (T = w, A = x, C = E; B = r.distcode[C + ((u & (1 << T + A) - 1) >> T)], w = B >>> 24, x = B >>> 16 & 255, E = B & 65535, !(T + w <= l); ) {
              if (o === 0)
                break e;
              o--, u += n[a++] << l, l += 8;
            }
            u >>>= T, l -= T, r.back += T;
          }
          if (u >>>= w, l -= w, r.back += w, x & 64) {
            e.msg = "invalid distance code", r.mode = Z;
            break;
          }
          r.offset = E, r.extra = x & 15, r.mode = Ma;
        case Ma:
          if (r.extra) {
            for ($ = r.extra; l < $; ) {
              if (o === 0)
                break e;
              o--, u += n[a++] << l, l += 8;
            }
            r.offset += u & (1 << r.extra) - 1, u >>>= r.extra, l -= r.extra, r.back += r.extra;
          }
          if (r.offset > r.dmax) {
            e.msg = "invalid distance too far back", r.mode = Z;
            break;
          }
          r.mode = ja;
        case ja:
          if (h === 0)
            break e;
          if (g = v - h, r.offset > g) {
            if (g = r.offset - g, g > r.whave && r.sane) {
              e.msg = "invalid distance too far back", r.mode = Z;
              break;
            }
            g > r.wnext ? (g -= r.wnext, F = r.wsize - g) : F = r.wnext - g, g > r.length && (g = r.length), S = r.window;
          } else
            S = i, F = s - r.offset, g = r.length;
          g > h && (g = h), h -= g, r.length -= g;
          do
            i[s++] = S[F++];
          while (--g);
          r.length === 0 && (r.mode = ir);
          break;
        case Ga:
          if (h === 0)
            break e;
          i[s++] = r.length, h--, r.mode = ir;
          break;
        case yn:
          if (r.wrap) {
            for (; l < 32; ) {
              if (o === 0)
                break e;
              o--, u |= n[a++] << l, l += 8;
            }
            if (v -= h, e.total_out += v, r.total += v, v && (e.adler = r.check = /*UPDATE(state.check, put - _out, _out);*/
            r.flags ? we(r.check, i, v, s - v) : $n(r.check, i, v, s - v)), v = h, (r.flags ? u : qa(u)) !== r.check) {
              e.msg = "incorrect data check", r.mode = Z;
              break;
            }
            u = 0, l = 0;
          }
          r.mode = Ha;
        case Ha:
          if (r.wrap && r.flags) {
            for (; l < 32; ) {
              if (o === 0)
                break e;
              o--, u += n[a++] << l, l += 8;
            }
            if (u !== (r.total & 4294967295)) {
              e.msg = "incorrect length check", r.mode = Z;
              break;
            }
            u = 0, l = 0;
          }
          r.mode = Za;
        case Za:
          b = eh;
          break e;
        case Z:
          b = ls;
          break e;
        case ps:
          return hs;
        case nh:
        default:
          return de;
      }
  return e.next_out = s, e.avail_out = h, e.next_in = a, e.avail_in = o, r.hold = u, r.bits = l, (r.wsize || v !== e.avail_out && r.mode < Z && (r.mode < yn || t !== Ea)) && bs(e, e.output, e.next_out, v - e.avail_out), _ -= e.avail_in, v -= e.avail_out, e.total_in += _, e.total_out += v, r.total += v, r.wrap && v && (e.adler = r.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
  r.flags ? we(r.check, i, v, e.next_out - v) : $n(r.check, i, v, e.next_out - v)), e.data_type = r.bits + (r.last ? 64 : 0) + (r.mode === Se ? 128 : 0) + (r.mode === nr || r.mode === _n ? 256 : 0), (_ === 0 && v === 0 || t === Ea) && b === Ke && (b = rh), b;
}
function hh(e) {
  if (!e || !e.state)
    return de;
  var t = e.state;
  return t.window && (t.window = null), e.state = null, Ke;
}
function dh(e, t) {
  var r;
  return !e || !e.state || (r = e.state, !(r.wrap & 2)) ? de : (r.head = t, t.done = !1, Ke);
}
function ph(e, t) {
  var r = t.length, n, i, a;
  return !e || !e.state || (n = e.state, n.wrap !== 0 && n.mode !== br) ? de : n.mode === br && (i = 1, i = $n(i, t, r, 0), i !== n.check) ? ls : (a = bs(e, t, r, r), a ? (n.mode = ps, hs) : (n.havedict = 1, Ke));
}
ye.inflateReset = ys;
ye.inflateReset2 = vs;
ye.inflateResetKeep = _s;
ye.inflateInit = ch;
ye.inflateInit2 = gs;
ye.inflate = lh;
ye.inflateEnd = hh;
ye.inflateGetHeader = dh;
ye.inflateSetDictionary = ph;
ye.inflateInfo = "pako inflate (from Nodeca project)";
var ws = {
  /* Allowed flush values; see deflate() and inflate() below for details */
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,
  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  //Z_MEM_ERROR:     -4,
  Z_BUF_ERROR: -5,
  //Z_VERSION_ERROR: -6,
  /* compression levels */
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,
  /* Possible values of the data_type field (though see inflate()) */
  Z_BINARY: 0,
  Z_TEXT: 1,
  //Z_ASCII:                1, // = Z_TEXT (deprecated)
  Z_UNKNOWN: 2,
  /* The deflate compression method */
  Z_DEFLATED: 8
  //Z_NULL:                 null // Use -1 or null inline, depending on var type
};
function _h() {
  this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
}
var yh = _h, ut = ye, kt = Fe, pr = Ve, X = ws, On = Vn, vh = ss, gh = yh, ms = Object.prototype.toString;
function Ye(e) {
  if (!(this instanceof Ye)) return new Ye(e);
  this.options = kt.assign({
    chunkSize: 16384,
    windowBits: 0,
    to: ""
  }, e || {});
  var t = this.options;
  t.raw && t.windowBits >= 0 && t.windowBits < 16 && (t.windowBits = -t.windowBits, t.windowBits === 0 && (t.windowBits = -15)), t.windowBits >= 0 && t.windowBits < 16 && !(e && e.windowBits) && (t.windowBits += 32), t.windowBits > 15 && t.windowBits < 48 && (t.windowBits & 15 || (t.windowBits |= 15)), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new vh(), this.strm.avail_out = 0;
  var r = ut.inflateInit2(
    this.strm,
    t.windowBits
  );
  if (r !== X.Z_OK)
    throw new Error(On[r]);
  if (this.header = new gh(), ut.inflateGetHeader(this.strm, this.header), t.dictionary && (typeof t.dictionary == "string" ? t.dictionary = pr.string2buf(t.dictionary) : ms.call(t.dictionary) === "[object ArrayBuffer]" && (t.dictionary = new Uint8Array(t.dictionary)), t.raw && (r = ut.inflateSetDictionary(this.strm, t.dictionary), r !== X.Z_OK)))
    throw new Error(On[r]);
}
Ye.prototype.push = function(e, t) {
  var r = this.strm, n = this.options.chunkSize, i = this.options.dictionary, a, s, o, h, u, l = !1;
  if (this.ended)
    return !1;
  s = t === ~~t ? t : t === !0 ? X.Z_FINISH : X.Z_NO_FLUSH, typeof e == "string" ? r.input = pr.binstring2buf(e) : ms.call(e) === "[object ArrayBuffer]" ? r.input = new Uint8Array(e) : r.input = e, r.next_in = 0, r.avail_in = r.input.length;
  do {
    if (r.avail_out === 0 && (r.output = new kt.Buf8(n), r.next_out = 0, r.avail_out = n), a = ut.inflate(r, X.Z_NO_FLUSH), a === X.Z_NEED_DICT && i && (a = ut.inflateSetDictionary(this.strm, i)), a === X.Z_BUF_ERROR && l === !0 && (a = X.Z_OK, l = !1), a !== X.Z_STREAM_END && a !== X.Z_OK)
      return this.onEnd(a), this.ended = !0, !1;
    r.next_out && (r.avail_out === 0 || a === X.Z_STREAM_END || r.avail_in === 0 && (s === X.Z_FINISH || s === X.Z_SYNC_FLUSH)) && (this.options.to === "string" ? (o = pr.utf8border(r.output, r.next_out), h = r.next_out - o, u = pr.buf2string(r.output, o), r.next_out = h, r.avail_out = n - h, h && kt.arraySet(r.output, r.output, o, h, 0), this.onData(u)) : this.onData(kt.shrinkBuf(r.output, r.next_out))), r.avail_in === 0 && r.avail_out === 0 && (l = !0);
  } while ((r.avail_in > 0 || r.avail_out === 0) && a !== X.Z_STREAM_END);
  return a === X.Z_STREAM_END && (s = X.Z_FINISH), s === X.Z_FINISH ? (a = ut.inflateEnd(this.strm), this.onEnd(a), this.ended = !0, a === X.Z_OK) : (s === X.Z_SYNC_FLUSH && (this.onEnd(X.Z_OK), r.avail_out = 0), !0);
};
Ye.prototype.onData = function(e) {
  this.chunks.push(e);
};
Ye.prototype.onEnd = function(e) {
  e === X.Z_OK && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = kt.flattenChunks(this.chunks)), this.chunks = [], this.err = e, this.msg = this.strm.msg;
};
function Qn(e, t) {
  var r = new Ye(t);
  if (r.push(e, !0), r.err)
    throw r.msg || On[r.err];
  return r.result;
}
function bh(e, t) {
  return t = t || {}, t.raw = !0, Qn(e, t);
}
Xt.Inflate = Ye;
Xt.inflate = Qn;
Xt.inflateRaw = bh;
Xt.ungzip = Qn;
var wh = Fe.assign, mh = Ht, xh = Xt, Eh = ws, xs = {};
wh(xs, mh, xh, Eh);
var Ah = xs;
const Es = /* @__PURE__ */ Ct(Ah), Ka = (e, t) => function(...r) {
  const n = t.promiseModule;
  return new n((i, a) => {
    t.multiArgs ? r.push((...s) => {
      t.errorFirst ? s[0] ? a(s) : (s.shift(), i(s)) : i(s);
    }) : t.errorFirst ? r.push((s, o) => {
      s ? a(s) : i(o);
    }) : r.push(i), e.apply(this, r);
  });
};
var Sh = (e, t) => {
  t = Object.assign({
    exclude: [/.+(Sync|Stream)$/],
    errorFirst: !0,
    promiseModule: Promise
  }, t);
  const r = typeof e;
  if (!(e !== null && (r === "object" || r === "function")))
    throw new TypeError(`Expected \`input\` to be a \`Function\` or \`Object\`, got \`${e === null ? "null" : r}\``);
  const n = (a) => {
    const s = (o) => typeof o == "string" ? a === o : o.test(a);
    return t.include ? t.include.some(s) : !t.exclude.some(s);
  };
  let i;
  r === "function" ? i = function(...a) {
    return t.excludeMain ? e(...a) : Ka(e, t).apply(this, a);
  } : i = Object.create(Object.getPrototypeOf(e));
  for (const a in e) {
    const s = e[a];
    i[a] = typeof s == "function" && n(a) ? Ka(s, t) : s;
  }
  return i;
};
const ar = /* @__PURE__ */ Ct(Sh);
function Ya(e) {
  return Array.isArray(e) ? e : [e];
}
const Rn = "", Wa = " ", bn = "\\", kh = /^\s+$/, Bh = /(?:[^\\]|^)\\$/, Ih = /^\\!/, Th = /^\\#/, Fh = /\r?\n/g, $h = /^\.*\/|^\.+$/, wn = "/";
let As = "node-ignore";
typeof Symbol < "u" && (As = Symbol.for("node-ignore"));
const Va = As, Oh = (e, t, r) => Object.defineProperty(e, t, { value: r }), Rh = /([0-z])-([0-z])/g, Ss = () => !1, Ch = (e) => e.replace(
  Rh,
  (t, r, n) => r.charCodeAt(0) <= n.charCodeAt(0) ? t : Rn
), Ph = (e) => {
  const { length: t } = e;
  return e.slice(0, t - t % 2);
}, Uh = [
  [
    // remove BOM
    // TODO:
    // Other similar zero-width characters?
    /^\uFEFF/,
    () => Rn
  ],
  // > Trailing spaces are ignored unless they are quoted with backslash ("\")
  [
    // (a\ ) -> (a )
    // (a  ) -> (a)
    // (a ) -> (a)
    // (a \ ) -> (a  )
    /((?:\\\\)*?)(\\?\s+)$/,
    (e, t, r) => t + (r.indexOf("\\") === 0 ? Wa : Rn)
  ],
  // replace (\ ) with ' '
  // (\ ) -> ' '
  // (\\ ) -> '\\ '
  // (\\\ ) -> '\\ '
  [
    /(\\+?)\s/g,
    (e, t) => {
      const { length: r } = t;
      return t.slice(0, r - r % 2) + Wa;
    }
  ],
  // Escape metacharacters
  // which is written down by users but means special for regular expressions.
  // > There are 12 characters with special meanings:
  // > - the backslash \,
  // > - the caret ^,
  // > - the dollar sign $,
  // > - the period or dot .,
  // > - the vertical bar or pipe symbol |,
  // > - the question mark ?,
  // > - the asterisk or star *,
  // > - the plus sign +,
  // > - the opening parenthesis (,
  // > - the closing parenthesis ),
  // > - and the opening square bracket [,
  // > - the opening curly brace {,
  // > These special characters are often called "metacharacters".
  [
    /[\\$.|*+(){^]/g,
    (e) => `\\${e}`
  ],
  [
    // > a question mark (?) matches a single character
    /(?!\\)\?/g,
    () => "[^/]"
  ],
  // leading slash
  [
    // > A leading slash matches the beginning of the pathname.
    // > For example, "/*.c" matches "cat-file.c" but not "mozilla-sha1/sha1.c".
    // A leading slash matches the beginning of the pathname
    /^\//,
    () => "^"
  ],
  // replace special metacharacter slash after the leading slash
  [
    /\//g,
    () => "\\/"
  ],
  [
    // > A leading "**" followed by a slash means match in all directories.
    // > For example, "**/foo" matches file or directory "foo" anywhere,
    // > the same as pattern "foo".
    // > "**/foo/bar" matches file or directory "bar" anywhere that is directly
    // >   under directory "foo".
    // Notice that the '*'s have been replaced as '\\*'
    /^\^*\\\*\\\*\\\//,
    // '**/foo' <-> 'foo'
    () => "^(?:.*\\/)?"
  ],
  // starting
  [
    // there will be no leading '/'
    //   (which has been replaced by section "leading slash")
    // If starts with '**', adding a '^' to the regular expression also works
    /^(?=[^^])/,
    function() {
      return /\/(?!$)/.test(this) ? "^" : "(?:^|\\/)";
    }
  ],
  // two globstars
  [
    // Use lookahead assertions so that we could match more than one `'/**'`
    /\\\/\\\*\\\*(?=\\\/|$)/g,
    // Zero, one or several directories
    // should not use '*', or it will be replaced by the next replacer
    // Check if it is not the last `'/**'`
    (e, t, r) => t + 6 < r.length ? "(?:\\/[^\\/]+)*" : "\\/.+"
  ],
  // normal intermediate wildcards
  [
    // Never replace escaped '*'
    // ignore rule '\*' will match the path '*'
    // 'abc.*/' -> go
    // 'abc.*'  -> skip this rule,
    //    coz trailing single wildcard will be handed by [trailing wildcard]
    /(^|[^\\]+)(\\\*)+(?=.+)/g,
    // '*.js' matches '.js'
    // '*.js' doesn't match 'abc'
    (e, t, r) => {
      const n = r.replace(/\\\*/g, "[^\\/]*");
      return t + n;
    }
  ],
  [
    // unescape, revert step 3 except for back slash
    // For example, if a user escape a '\\*',
    // after step 3, the result will be '\\\\\\*'
    /\\\\\\(?=[$.|*+(){^])/g,
    () => bn
  ],
  [
    // '\\\\' -> '\\'
    /\\\\/g,
    () => bn
  ],
  [
    // > The range notation, e.g. [a-zA-Z],
    // > can be used to match one of the characters in a range.
    // `\` is escaped by step 3
    /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
    (e, t, r, n, i) => t === bn ? `\\[${r}${Ph(n)}${i}` : i === "]" && n.length % 2 === 0 ? `[${Ch(r)}${n}]` : "[]"
  ],
  // ending
  [
    // 'js' will not match 'js.'
    // 'ab' will not match 'abc'
    /(?:[^*])$/,
    // WTF!
    // https://git-scm.com/docs/gitignore
    // changes in [2.22.1](https://git-scm.com/docs/gitignore/2.22.1)
    // which re-fixes #24, #38
    // > If there is a separator at the end of the pattern then the pattern
    // > will only match directories, otherwise the pattern can match both
    // > files and directories.
    // 'js*' will not match 'a.js'
    // 'js/' will not match 'a.js'
    // 'js' will match 'a.js' and 'a.js/'
    (e) => /\/$/.test(e) ? `${e}$` : `${e}(?=$|\\/$)`
  ],
  // trailing wildcard
  [
    /(\^|\\\/)?\\\*$/,
    (e, t) => `${t ? `${t}[^/]+` : "[^/]*"}(?=$|\\/$)`
  ]
], Ja = /* @__PURE__ */ Object.create(null), Dh = (e, t) => {
  let r = Ja[e];
  return r || (r = Uh.reduce(
    (n, [i, a]) => n.replace(i, a.bind(e)),
    e
  ), Ja[e] = r), t ? new RegExp(r, "i") : new RegExp(r);
}, ei = (e) => typeof e == "string", Nh = (e) => e && ei(e) && !kh.test(e) && !Bh.test(e) && e.indexOf("#") !== 0, Lh = (e) => e.split(Fh);
class zh {
  constructor(t, r, n, i) {
    this.origin = t, this.pattern = r, this.negative = n, this.regex = i;
  }
}
const Mh = (e, t) => {
  const r = e;
  let n = !1;
  e.indexOf("!") === 0 && (n = !0, e = e.substr(1)), e = e.replace(Ih, "!").replace(Th, "#");
  const i = Dh(e, t);
  return new zh(
    r,
    e,
    n,
    i
  );
}, jh = (e, t) => {
  throw new t(e);
}, Te = (e, t, r) => ei(e) ? e ? Te.isNotRelative(e) ? r(
  `path should be a \`path.relative()\`d string, but got "${t}"`,
  RangeError
) : !0 : r("path must not be empty", TypeError) : r(
  `path must be a string, but got \`${t}\``,
  TypeError
), ks = (e) => $h.test(e);
Te.isNotRelative = ks;
Te.convert = (e) => e;
class Gh {
  constructor({
    ignorecase: t = !0,
    ignoreCase: r = t,
    allowRelativePaths: n = !1
  } = {}) {
    Oh(this, Va, !0), this._rules = [], this._ignoreCase = r, this._allowRelativePaths = n, this._initCache();
  }
  _initCache() {
    this._ignoreCache = /* @__PURE__ */ Object.create(null), this._testCache = /* @__PURE__ */ Object.create(null);
  }
  _addPattern(t) {
    if (t && t[Va]) {
      this._rules = this._rules.concat(t._rules), this._added = !0;
      return;
    }
    if (Nh(t)) {
      const r = Mh(t, this._ignoreCase);
      this._added = !0, this._rules.push(r);
    }
  }
  // @param {Array<string> | string | Ignore} pattern
  add(t) {
    return this._added = !1, Ya(
      ei(t) ? Lh(t) : t
    ).forEach(this._addPattern, this), this._added && this._initCache(), this;
  }
  // legacy
  addPattern(t) {
    return this.add(t);
  }
  //          |           ignored : unignored
  // negative |   0:0   |   0:1   |   1:0   |   1:1
  // -------- | ------- | ------- | ------- | --------
  //     0    |  TEST   |  TEST   |  SKIP   |    X
  //     1    |  TESTIF |  SKIP   |  TEST   |    X
  // - SKIP: always skip
  // - TEST: always test
  // - TESTIF: only test if checkUnignored
  // - X: that never happen
  // @param {boolean} whether should check if the path is unignored,
  //   setting `checkUnignored` to `false` could reduce additional
  //   path matching.
  // @returns {TestResult} true if a file is ignored
  _testOne(t, r) {
    let n = !1, i = !1;
    return this._rules.forEach((a) => {
      const { negative: s } = a;
      if (i === s && n !== i || s && !n && !i && !r)
        return;
      a.regex.test(t) && (n = !s, i = s);
    }), {
      ignored: n,
      unignored: i
    };
  }
  // @returns {TestResult}
  _test(t, r, n, i) {
    const a = t && Te.convert(t);
    return Te(
      a,
      t,
      this._allowRelativePaths ? Ss : jh
    ), this._t(a, r, n, i);
  }
  _t(t, r, n, i) {
    if (t in r)
      return r[t];
    if (i || (i = t.split(wn)), i.pop(), !i.length)
      return r[t] = this._testOne(t, n);
    const a = this._t(
      i.join(wn) + wn,
      r,
      n,
      i
    );
    return r[t] = a.ignored ? a : this._testOne(t, n);
  }
  ignores(t) {
    return this._test(t, this._ignoreCache, !1).ignored;
  }
  createFilter() {
    return (t) => !this.ignores(t);
  }
  filter(t) {
    return Ya(t).filter(this.createFilter());
  }
  // @returns {TestResult}
  test(t) {
    return this._test(t, this._testCache, !0);
  }
}
const Cn = (e) => new Gh(e), Hh = (e) => Te(e && Te.convert(e), e, Ss);
Cn.isPathValid = Hh;
Cn.default = Cn;
if (
  // Detect `process` so that it can run in browsers.
  typeof process < "u" && (process.env && process.env.IGNORE_TEST_WIN32 || process.platform === "win32")
) {
  const e = (r) => /^\\\\\?\\/.test(r) || /["<>|\u0000-\u001F]+/u.test(r) ? r : r.replace(/\\/g, "/");
  Te.convert = e;
  const t = /^[a-z]:\//i;
  Te.isNotRelative = (r) => t.test(r) || ks(r);
}
class N extends Error {
  constructor(t) {
    super(t), this.caller = "";
  }
  toJSON() {
    return {
      code: this.code,
      data: this.data,
      caller: this.caller,
      message: this.message,
      stack: this.stack
    };
  }
  fromJSON(t) {
    const r = new N(t.message);
    return r.code = t.code, r.data = t.data, r.caller = t.caller, r.stack = t.stack, r;
  }
  get isIsomorphicGitError() {
    return !0;
  }
}
class ti extends N {
  /**
   * @param {Array<string>} filepaths
   */
  constructor(t) {
    super(
      `Modifying the index is not possible because you have unmerged files: ${t.toString}. Fix them up in the work tree, and then use 'git add/rm as appropriate to mark resolution and make a commit.`
    ), this.code = this.name = ti.code, this.data = { filepaths: t };
  }
}
ti.code = "UnmergedPathsError";
class j extends N {
  /**
   * @param {string} message
   */
  constructor(t) {
    super(
      `An internal error caused this command to fail.

If you're not a developer, report the bug to the developers of the application you're using. If this is a bug in isomorphic-git then you should create a proper bug yourselves. The bug should include a minimal reproduction and details about the version and environment.

Please file a bug report at https://github.com/isomorphic-git/isomorphic-git/issues with this error message: ${t}`
    ), this.code = this.name = j.code, this.data = { message: t };
  }
}
j.code = "InternalError";
class $r extends N {
  /**
   * @param {string} filepath
   */
  constructor(t) {
    super(`The filepath "${t}" contains unsafe character sequences`), this.code = this.name = $r.code, this.data = { filepath: t };
  }
}
$r.code = "UnsafeFilepathError";
class Me {
  constructor(t) {
    this.buffer = t, this._start = 0;
  }
  eof() {
    return this._start >= this.buffer.length;
  }
  tell() {
    return this._start;
  }
  seek(t) {
    this._start = t;
  }
  slice(t) {
    const r = this.buffer.slice(this._start, this._start + t);
    return this._start += t, r;
  }
  toString(t, r) {
    const n = this.buffer.toString(t, this._start, this._start + r);
    return this._start += r, n;
  }
  write(t, r, n) {
    const i = this.buffer.write(t, this._start, r, n);
    return this._start += r, i;
  }
  copy(t, r, n) {
    const i = t.copy(this.buffer, this._start, r, n);
    return this._start += i, i;
  }
  readUInt8() {
    const t = this.buffer.readUInt8(this._start);
    return this._start += 1, t;
  }
  writeUInt8(t) {
    const r = this.buffer.writeUInt8(t, this._start);
    return this._start += 1, r;
  }
  readUInt16BE() {
    const t = this.buffer.readUInt16BE(this._start);
    return this._start += 2, t;
  }
  writeUInt16BE(t) {
    const r = this.buffer.writeUInt16BE(t, this._start);
    return this._start += 2, r;
  }
  readUInt32BE() {
    const t = this.buffer.readUInt32BE(this._start);
    return this._start += 4, t;
  }
  writeUInt32BE(t) {
    const r = this.buffer.writeUInt32BE(t, this._start);
    return this._start += 4, r;
  }
}
function ri(e, t) {
  return -(e < t) || +(e > t);
}
function Zh(e, t) {
  return ri(e.path, t.path);
}
function qh(e) {
  let t = "";
  for (const r of new Uint8Array(e))
    r < 16 && (t += "0"), t += r.toString(16);
  return t;
}
let mn = null;
async function wr(e) {
  return mn === null && (mn = await Kh()), mn ? Bs(e) : Xh(e);
}
function Xh(e) {
  return new eu().update(e).digest("hex");
}
async function Bs(e) {
  const t = await crypto.subtle.digest("SHA-1", e);
  return qh(t);
}
async function Kh() {
  try {
    return await Bs(new Uint8Array([])) === "da39a3ee5e6b4b0d3255bfef95601890afd80709";
  } catch {
  }
  return !1;
}
function Pn(e) {
  const t = Math.max(e.lastIndexOf("/"), e.lastIndexOf("\\"));
  return t === -1 ? "." : t === 0 ? "/" : e.slice(0, t);
}
class Kt extends N {
  /**
   * @param {string} what
   */
  constructor(t) {
    super(`Could not find ${t}.`), this.code = this.name = Kt.code, this.data = { what: t };
  }
}
Kt.code = "NotFoundError";
let Or = class Is extends N {
  /**
   * @param {string} oid
   * @param {'blob'|'commit'|'tag'|'tree'} actual
   * @param {'blob'|'commit'|'tag'|'tree'} expected
   * @param {string} [filepath]
   */
  constructor(t, r, n, i) {
    super(
      `Object ${t} ${i ? `at ${i}` : ""}was anticipated to be a ${n} but it is a ${r}.`
    ), this.code = this.name = Is.code, this.data = { oid: t, actual: r, expected: n, filepath: i };
  }
};
Or.code = "ObjectTypeError";
class ni extends N {
  /**
   * @param {string} value
   */
  constructor(t) {
    super(`Expected a 40-char hex object id but saw "${t}".`), this.code = this.name = ni.code, this.data = { value: t };
  }
}
ni.code = "InvalidOidError";
class ii extends N {
  /**
   * @param {string} remote
   */
  constructor(t) {
    super(`Could not find a fetch refspec for remote "${t}". Make sure the config file has an entry like the following:
[remote "${t}"]
	fetch = +refs/heads/*:refs/remotes/origin/*
`), this.code = this.name = ii.code, this.data = { remote: t };
  }
}
ii.code = "NoRefspecError";
/*!
 * This code for `path.join` is directly copied from @zenfs/core/path for bundle size improvements.
 * SPDX-License-Identifier: LGPL-3.0-or-later
 * Copyright (c) James Prevett and other ZenFS contributors.
 */
function Yh(e, t) {
  let r = "", n = 0, i = -1, a = 0, s = "\0";
  for (let o = 0; o <= e.length; ++o) {
    if (o < e.length) s = e[o];
    else {
      if (s === "/") break;
      s = "/";
    }
    if (s === "/") {
      if (!(i === o - 1 || a === 1)) if (a === 2) {
        if (r.length < 2 || n !== 2 || r.at(-1) !== "." || r.at(-2) !== ".") {
          if (r.length > 2) {
            const h = r.lastIndexOf("/");
            h === -1 ? (r = "", n = 0) : (r = r.slice(0, h), n = r.length - 1 - r.lastIndexOf("/")), i = o, a = 0;
            continue;
          } else if (r.length !== 0) {
            r = "", n = 0, i = o, a = 0;
            continue;
          }
        }
        t && (r += r.length > 0 ? "/.." : "..", n = 2);
      } else
        r.length > 0 ? r += "/" + e.slice(i + 1, o) : r = e.slice(i + 1, o), n = o - i - 1;
      i = o, a = 0;
    } else s === "." && a !== -1 ? ++a : a = -1;
  }
  return r;
}
function Wh(e) {
  if (!e.length) return ".";
  const t = e[0] === "/", r = e.at(-1) === "/";
  return e = Yh(e, !t), e.length ? (r && (e += "/"), t ? `/${e}` : e) : t ? "/" : r ? "./" : ".";
}
function vt(...e) {
  if (e.length === 0) return ".";
  let t;
  for (let r = 0; r < e.length; ++r) {
    const n = e[r];
    n.length > 0 && (t === void 0 ? t = n : t += "/" + n);
  }
  return t === void 0 ? "." : Wh(t);
}
function Vh(e, t) {
  return ri(Qa(e), Qa(t));
}
function Qa(e) {
  return e.mode === "040000" ? e.path + "/" : e.path;
}
function Ts(e) {
  switch (e) {
    case "040000":
      return "tree";
    case "100644":
      return "blob";
    case "100755":
      return "blob";
    case "120000":
      return "blob";
    case "160000":
      return "commit";
  }
  throw new j(`Unexpected GitTree entry mode: ${e}`);
}
function Jh(e) {
  const t = [];
  let r = 0;
  for (; r < e.length; ) {
    const n = e.indexOf(32, r);
    if (n === -1)
      throw new j(
        `GitTree: Error parsing buffer at byte location ${r}: Could not find the next space character.`
      );
    const i = e.indexOf(0, r);
    if (i === -1)
      throw new j(
        `GitTree: Error parsing buffer at byte location ${r}: Could not find the next null character.`
      );
    let a = e.slice(r, n).toString("utf8");
    a === "40000" && (a = "040000");
    const s = Ts(a), o = e.slice(n + 1, i).toString("utf8");
    if (o.includes("\\") || o.includes("/"))
      throw new $r(o);
    const h = e.slice(i + 1, i + 21).toString("hex");
    r = i + 21, t.push({ mode: a, path: o, oid: h, type: s });
  }
  return t;
}
function Qh(e) {
  if (typeof e == "number" && (e = e.toString(8)), e.match(/^0?4.*/)) return "040000";
  if (e.match(/^1006.*/)) return "100644";
  if (e.match(/^1007.*/)) return "100755";
  if (e.match(/^120.*/)) return "120000";
  if (e.match(/^160.*/)) return "160000";
  throw new j(`Could not understand file mode: ${e}`);
}
function e0(e) {
  return !e.oid && e.sha && (e.oid = e.sha), e.mode = Qh(e.mode), e.type || (e.type = Ts(e.mode)), e;
}
let mr = class Fs {
  constructor(t) {
    if (Buffer.isBuffer(t))
      this._entries = Jh(t);
    else if (Array.isArray(t))
      this._entries = t.map(e0);
    else
      throw new j("invalid type passed to GitTree constructor");
    this._entries.sort(Zh);
  }
  static from(t) {
    return new Fs(t);
  }
  render() {
    return this._entries.map((t) => `${t.mode} ${t.type} ${t.oid}    ${t.path}`).join(`
`);
  }
  toObject() {
    const t = [...this._entries];
    return t.sort(Vh), Buffer.concat(
      t.map((r) => {
        const n = Buffer.from(r.mode.replace(/^0/, "")), i = Buffer.from(" "), a = Buffer.from(r.path, "utf8"), s = Buffer.from([0]), o = Buffer.from(r.oid, "hex");
        return Buffer.concat([n, i, a, s, o]);
      })
    );
  }
  /**
   * @returns {TreeEntry[]}
   */
  entries() {
    return this._entries;
  }
  *[Symbol.iterator]() {
    for (const t of this._entries)
      yield t;
  }
};
class $s {
  /**
   * Wraps a raw object with a Git header.
   *
   * @param {Object} params - The parameters for wrapping.
   * @param {string} params.type - The type of the Git object (e.g., 'blob', 'tree', 'commit').
   * @param {Uint8Array} params.object - The raw object data to wrap.
   * @returns {Uint8Array} The wrapped Git object as a single buffer.
   */
  static wrap({ type: t, object: r }) {
    const n = `${t} ${r.length}\0`, i = n.length, a = i + r.length, s = new Uint8Array(a);
    for (let o = 0; o < i; o++)
      s[o] = n.charCodeAt(o);
    return s.set(r, i), s;
  }
  /**
   * Unwraps a Git object buffer into its type and raw object data.
   *
   * @param {Buffer|Uint8Array} buffer - The buffer containing the wrapped Git object.
   * @returns {{ type: string, object: Buffer }} An object containing the type and the raw object data.
   * @throws {InternalError} If the length specified in the header does not match the actual object length.
   */
  static unwrap(t) {
    const r = t.indexOf(32), n = t.indexOf(0), i = t.slice(0, r).toString("utf8"), a = t.slice(r + 1, n).toString("utf8"), s = t.length - (n + 1);
    if (parseInt(a) !== s)
      throw new j(
        `Length mismatch: expected ${a} bytes but got ${s} instead.`
      );
    return {
      type: i,
      object: Buffer.from(t.slice(n + 1))
    };
  }
}
async function t0({ fs: e, gitdir: t, oid: r }) {
  const n = `objects/${r.slice(0, 2)}/${r.slice(2)}`, i = await e.read(`${t}/${n}`);
  return i ? { object: i, format: "deflated", source: n } : null;
}
function r0(e, t) {
  const r = new Me(e), n = eo(r);
  if (n !== t.byteLength)
    throw new j(
      `applyDelta expected source buffer to be ${n} bytes but the provided buffer was ${t.length} bytes`
    );
  const i = eo(r);
  let a;
  const s = ro(r, t);
  if (s.byteLength === i)
    a = s;
  else {
    a = Buffer.alloc(i);
    const o = new Me(a);
    for (o.copy(s); !r.eof(); )
      o.copy(ro(r, t));
    const h = o.tell();
    if (i !== h)
      throw new j(
        `applyDelta expected target buffer to be ${i} bytes but the resulting buffer was ${h} bytes`
      );
  }
  return a;
}
function eo(e) {
  let t = 0, r = 0, n = null;
  do
    n = e.readUInt8(), t |= (n & 127) << r, r += 7;
  while (n & 128);
  return t;
}
function to(e, t, r) {
  let n = 0, i = 0;
  for (; r--; )
    t & 1 && (n |= e.readUInt8() << i), t >>= 1, i += 8;
  return n;
}
function ro(e, t) {
  const r = e.readUInt8(), n = 128, i = 15, a = 112;
  if (r & n) {
    const s = to(e, r & i, 4);
    let o = to(e, (r & a) >> 4, 3);
    return o === 0 && (o = 65536), t.slice(s, s + o);
  } else
    return e.slice(r);
}
function n0(e) {
  let t = [e];
  return {
    next() {
      return Promise.resolve({ done: t.length === 0, value: t.pop() });
    },
    return() {
      return t = [], {};
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
function i0(e) {
  return e[Symbol.asyncIterator] ? e[Symbol.asyncIterator]() : e[Symbol.iterator] ? e[Symbol.iterator]() : e.next ? e : n0(e);
}
class a0 {
  constructor(t) {
    if (typeof Buffer > "u")
      throw new Error("Missing Buffer dependency");
    this.stream = i0(t), this.buffer = null, this.cursor = 0, this.undoCursor = 0, this.started = !1, this._ended = !1, this._discardedBytes = 0;
  }
  eof() {
    return this._ended && this.cursor === this.buffer.length;
  }
  tell() {
    return this._discardedBytes + this.cursor;
  }
  async byte() {
    if (!this.eof() && (this.started || await this._init(), !(this.cursor === this.buffer.length && (await this._loadnext(), this._ended))))
      return this._moveCursor(1), this.buffer[this.undoCursor];
  }
  async chunk() {
    if (!this.eof() && (this.started || await this._init(), !(this.cursor === this.buffer.length && (await this._loadnext(), this._ended))))
      return this._moveCursor(this.buffer.length), this.buffer.slice(this.undoCursor, this.cursor);
  }
  async read(t) {
    if (!this.eof())
      return this.started || await this._init(), this.cursor + t > this.buffer.length && (this._trim(), await this._accumulate(t)), this._moveCursor(t), this.buffer.slice(this.undoCursor, this.cursor);
  }
  async skip(t) {
    this.eof() || (this.started || await this._init(), this.cursor + t > this.buffer.length && (this._trim(), await this._accumulate(t)), this._moveCursor(t));
  }
  async undo() {
    this.cursor = this.undoCursor;
  }
  async _next() {
    this.started = !0;
    let { done: t, value: r } = await this.stream.next();
    return t && (this._ended = !0, !r) ? Buffer.alloc(0) : (r && (r = Buffer.from(r)), r);
  }
  _trim() {
    this.buffer = this.buffer.slice(this.undoCursor), this.cursor -= this.undoCursor, this._discardedBytes += this.undoCursor, this.undoCursor = 0;
  }
  _moveCursor(t) {
    this.undoCursor = this.cursor, this.cursor += t, this.cursor > this.buffer.length && (this.cursor = this.buffer.length);
  }
  async _accumulate(t) {
    if (this._ended) return;
    const r = [this.buffer];
    for (; this.cursor + t > o0(r); ) {
      const n = await this._next();
      if (this._ended) break;
      r.push(n);
    }
    this.buffer = Buffer.concat(r);
  }
  async _loadnext() {
    this._discardedBytes += this.buffer.length, this.undoCursor = 0, this.cursor = 0, this.buffer = await this._next();
  }
  async _init() {
    this.buffer = await this._next();
  }
}
function o0(e) {
  return e.reduce((t, r) => t + r.length, 0);
}
async function s0(e, t) {
  const r = new a0(e);
  let n = await r.read(4);
  if (n = n.toString("utf8"), n !== "PACK")
    throw new j(`Invalid PACK header '${n}'`);
  let i = await r.read(4);
  if (i = i.readUInt32BE(0), i !== 2)
    throw new j(`Invalid packfile version: ${i}`);
  let a = await r.read(4);
  if (a = a.readUInt32BE(0), !(a < 1))
    for (; !r.eof() && a--; ) {
      const s = r.tell(), { type: o, length: h, ofs: u, reference: l } = await f0(r), _ = new Es.Inflate();
      for (; !_.result; ) {
        const v = await r.chunk();
        if (!v) break;
        if (_.push(v, !1), _.err)
          throw new j(`Pako error: ${_.msg}`);
        if (_.result) {
          if (_.result.length !== h)
            throw new j(
              "Inflated object size is different from that stated in packfile."
            );
          await r.undo(), await r.read(v.length - _.strm.avail_in);
          const g = r.tell();
          await t({
            data: _.result,
            type: o,
            num: a,
            offset: s,
            end: g,
            reference: l,
            ofs: u
          });
        }
      }
    }
}
async function f0(e) {
  let t = await e.byte();
  const r = t >> 4 & 7;
  let n = t & 15;
  if (t & 128) {
    let s = 4;
    do
      t = await e.byte(), n |= (t & 127) << s, s += 7;
    while (t & 128);
  }
  let i, a;
  if (r === 6) {
    let s = 0;
    i = 0;
    const o = [];
    do
      t = await e.byte(), i |= (t & 127) << s, s += 7, o.push(t);
    while (t & 128);
    a = Buffer.from(o);
  }
  return r === 7 && (a = await e.read(20)), { type: r, length: n, ofs: i, reference: a };
}
async function Os(e) {
  return Es.inflate(e);
}
function c0(e) {
  const t = [];
  let r = 0, n = 0;
  do {
    r = e.readUInt8();
    const i = r & 127;
    t.push(i), n = r & 128;
  } while (n);
  return t.reduce((i, a) => i + 1 << 7 | a, -1);
}
function u0(e, t) {
  let r = t, n = 4, i = null;
  do
    i = e.readUInt8(), r |= (i & 127) << n, n += 7;
  while (i & 128);
  return r;
}
let Rs = class Un {
  constructor(t) {
    Object.assign(this, t), this.offsetCache = {};
  }
  static async fromIdx({ idx: t, getExternalRefDelta: r }) {
    const n = new Me(t);
    if (n.slice(4).toString("hex") !== "ff744f63")
      return;
    const a = n.readUInt32BE();
    if (a !== 2)
      throw new j(
        `Unable to read version ${a} packfile IDX. (Only version 2 supported)`
      );
    if (t.byteLength > 2048 * 1024 * 1024)
      throw new j(
        "To keep implementation simple, I haven't implemented the layer 5 feature needed to support packfiles > 2GB in size."
      );
    n.seek(n.tell() + 4 * 255);
    const s = n.readUInt32BE(), o = [];
    for (let l = 0; l < s; l++) {
      const _ = n.slice(20).toString("hex");
      o[l] = _;
    }
    n.seek(n.tell() + 4 * s);
    const h = /* @__PURE__ */ new Map();
    for (let l = 0; l < s; l++)
      h.set(o[l], n.readUInt32BE());
    const u = n.slice(20).toString("hex");
    return new Un({
      hashes: o,
      crcs: {},
      offsets: h,
      packfileSha: u,
      getExternalRefDelta: r
    });
  }
  static async fromPack({ pack: t, getExternalRefDelta: r, onProgress: n }) {
    const i = {
      1: "commit",
      2: "tree",
      3: "blob",
      4: "tag",
      6: "ofs-delta",
      7: "ref-delta"
    }, a = {}, s = t.slice(-20).toString("hex"), o = [], h = {}, u = /* @__PURE__ */ new Map();
    let l = null, _ = null;
    await s0([t], async ({ data: B, type: w, reference: x, offset: E, num: T }) => {
      l === null && (l = T);
      const A = Math.floor(
        (l - T) * 100 / l
      );
      A !== _ && n && await n({
        phase: "Receiving objects",
        loaded: l - T,
        total: l
      }), _ = A, w = i[w], ["commit", "tree", "blob", "tag"].includes(w) ? a[E] = {
        type: w,
        offset: E
      } : w === "ofs-delta" ? a[E] = {
        type: w,
        offset: E
      } : w === "ref-delta" && (a[E] = {
        type: w,
        offset: E
      });
    });
    const v = Object.keys(a).map(Number);
    for (const [B, w] of v.entries()) {
      const x = B + 1 === v.length ? t.byteLength - 20 : v[B + 1], E = a[w], T = Ou.buf(t.slice(w, x)) >>> 0;
      E.end = x, E.crc = T;
    }
    const g = new Un({
      pack: Promise.resolve(t),
      packfileSha: s,
      crcs: h,
      hashes: o,
      offsets: u,
      getExternalRefDelta: r
    });
    _ = null;
    let F = 0;
    const S = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let B in a) {
      B = Number(B);
      const w = Math.floor(F * 100 / l);
      w !== _ && n && await n({
        phase: "Resolving deltas",
        loaded: F,
        total: l
      }), F++, _ = w;
      const x = a[B];
      if (!x.oid)
        try {
          g.readDepth = 0, g.externalReadDepth = 0;
          const { type: E, object: T } = await g.readSlice({ start: B });
          S[g.readDepth] += 1;
          const A = await wr($s.wrap({ type: E, object: T }));
          x.oid = A, o.push(A), u.set(A, B), h[A] = x.crc;
        } catch {
          continue;
        }
    }
    return o.sort(), g;
  }
  async toBuffer() {
    const t = [], r = (u, l) => {
      t.push(Buffer.from(u, l));
    };
    r("ff744f63", "hex"), r("00000002", "hex");
    const n = new Me(Buffer.alloc(256 * 4));
    for (let u = 0; u < 256; u++) {
      let l = 0;
      for (const _ of this.hashes)
        parseInt(_.slice(0, 2), 16) <= u && l++;
      n.writeUInt32BE(l);
    }
    t.push(n.buffer);
    for (const u of this.hashes)
      r(u, "hex");
    const i = new Me(Buffer.alloc(this.hashes.length * 4));
    for (const u of this.hashes)
      i.writeUInt32BE(this.crcs[u]);
    t.push(i.buffer);
    const a = new Me(Buffer.alloc(this.hashes.length * 4));
    for (const u of this.hashes)
      a.writeUInt32BE(this.offsets.get(u));
    t.push(a.buffer), r(this.packfileSha, "hex");
    const s = Buffer.concat(t), o = await wr(s), h = Buffer.alloc(20);
    return h.write(o, "hex"), Buffer.concat([s, h]);
  }
  async load({ pack: t }) {
    this.pack = t;
  }
  async unload() {
    this.pack = null;
  }
  async read({ oid: t }) {
    if (!this.offsets.get(t)) {
      if (this.getExternalRefDelta)
        return this.externalReadDepth++, this.getExternalRefDelta(t);
      throw new j(`Could not read object ${t} from packfile`);
    }
    const r = this.offsets.get(t);
    return this.readSlice({ start: r });
  }
  async readSlice({ start: t }) {
    if (this.offsetCache[t])
      return Object.assign({}, this.offsetCache[t]);
    this.readDepth++;
    const r = {
      16: "commit",
      32: "tree",
      48: "blob",
      64: "tag",
      96: "ofs_delta",
      112: "ref_delta"
    }, n = await this.pack;
    if (!n)
      throw new j(
        "Could not read packfile data. The packfile may be missing, corrupted, or too large to read into memory."
      );
    const i = n.slice(t), a = new Me(i), s = a.readUInt8(), o = s & 112;
    let h = r[o];
    if (h === void 0)
      throw new j("Unrecognized type: 0b" + o.toString(2));
    const u = s & 15;
    let l = u;
    s & 128 && (l = u0(a, u));
    let v = null, g = null;
    if (h === "ofs_delta") {
      const S = c0(a), B = t - S;
      ({ object: v, type: h } = await this.readSlice({ start: B }));
    }
    if (h === "ref_delta") {
      const S = a.slice(20).toString("hex");
      ({ object: v, type: h } = await this.read({ oid: S }));
    }
    const F = i.slice(a.tell());
    if (g = Buffer.from(await Os(F)), g.byteLength !== l)
      throw new j(
        `Packfile told us object would have length ${l} but it had length ${g.byteLength}`
      );
    return v && (g = Buffer.from(r0(g, v))), this.readDepth > 3 && (this.offsetCache[t] = { type: h, object: g }), { type: h, format: "content", object: g };
  }
};
const or = Symbol("PackfileCache");
async function l0({
  fs: e,
  filename: t,
  getExternalRefDelta: r,
  emitter: n,
  emitterPrefix: i
}) {
  const a = await e.read(t);
  return Rs.fromIdx({ idx: a, getExternalRefDelta: r });
}
function h0({
  fs: e,
  cache: t,
  filename: r,
  getExternalRefDelta: n,
  emitter: i,
  emitterPrefix: a
}) {
  t[or] || (t[or] = /* @__PURE__ */ new Map());
  let s = t[or].get(r);
  return s || (s = l0({
    fs: e,
    filename: r,
    getExternalRefDelta: n,
    emitter: i,
    emitterPrefix: a
  }), t[or].set(r, s)), s;
}
async function d0(e, { start: t = 0, end: r = e.length } = {}) {
  return wr(e.subarray(t, r));
}
async function p0({
  fs: e,
  cache: t,
  gitdir: r,
  oid: n,
  format: i = "content",
  getExternalRefDelta: a
}) {
  let s = await e.readdir(vt(r, "objects/pack"));
  s = s.filter((o) => o.endsWith(".idx"));
  for (const o of s) {
    const h = `${r}/objects/pack/${o}`, u = await h0({
      fs: e,
      cache: t,
      filename: h,
      getExternalRefDelta: a
    });
    if (u.error) throw new j(u.error);
    if (u.offsets.has(n)) {
      const l = h.replace(/idx$/, "pack");
      u.pack || (u.pack = e.read(l));
      const _ = await u.pack;
      if (!_)
        throw u.pack = null, new j(
          `Could not read packfile at ${l}. The file may be missing, corrupted, or too large to read into memory.`
        );
      if (!u._checksumVerified) {
        const g = u.packfileSha, F = _.subarray(-20), S = Array.from(F).map((w) => w.toString(16).padStart(2, "0")).join("");
        if (S !== g)
          throw new j(
            `Packfile trailer mismatch: expected ${g}, got ${S}. The packfile may be corrupted.`
          );
        const B = await d0(_, {
          start: 0,
          end: _.length - 20
        });
        if (B !== g)
          throw new j(
            `Packfile payload corrupted: calculated ${B} but expected ${g}. The packfile may have been tampered with.`
          );
        u._checksumVerified = !0;
      }
      const v = await u.read({ oid: n, getExternalRefDelta: a });
      return v.format = "content", v.source = `objects/pack/${o.replace(/idx$/, "pack")}`, v;
    }
  }
  return null;
}
async function Yt({
  fs: e,
  cache: t,
  gitdir: r,
  oid: n,
  format: i = "content"
}) {
  const a = (l) => Yt({ fs: e, cache: t, gitdir: r, oid: l });
  let s;
  if (n === "4b825dc642cb6eb9a060e54bf8d69288fbee4904" && (s = { format: "wrapped", object: Buffer.from("tree 0\0") }), s || (s = await t0({ fs: e, gitdir: r, oid: n })), !s) {
    if (s = await p0({
      fs: e,
      cache: t,
      gitdir: r,
      oid: n,
      getExternalRefDelta: a
    }), !s)
      throw new Kt(n);
    return s;
  }
  if (i === "deflated" || (s.format === "deflated" && (s.object = Buffer.from(await Os(s.object)), s.format = "wrapped"), i === "wrapped"))
    return s;
  const o = await wr(s.object);
  if (o !== n)
    throw new j(
      `SHA check failed! Expected ${n}, computed ${o}`
    );
  const { object: h, type: u } = $s.unwrap(s.object);
  if (s.type = u, s.object = h, s.format = "content", i === "content")
    return s;
  throw new j(`invalid requested format "${i}"`);
}
class ai extends N {
  /**
   * @param {'note'|'remote'|'tag'|'branch'} noun
   * @param {string} where
   * @param {boolean} canForce
   */
  constructor(t, r, n = !0) {
    super(
      `Failed to create ${t} at ${r} because it already exists.${n ? ` (Hint: use 'force: true' parameter to overwrite existing ${t}.)` : ""}`
    ), this.code = this.name = ai.code, this.data = { noun: t, where: r, canForce: n };
  }
}
ai.code = "AlreadyExistsError";
class oi extends N {
  /**
   * @param {'oids'|'refs'} nouns
   * @param {string} short
   * @param {string[]} matches
   */
  constructor(t, r, n) {
    super(
      `Found multiple ${t} matching "${r}" (${n.join(
        ", "
      )}). Use a longer abbreviation length to disambiguate them.`
    ), this.code = this.name = oi.code, this.data = { nouns: t, short: r, matches: n };
  }
}
oi.code = "AmbiguousError";
class si extends N {
  /**
   * @param {string[]} filepaths
   */
  constructor(t) {
    super(
      `Your local changes to the following files would be overwritten by checkout: ${t.join(
        ", "
      )}`
    ), this.code = this.name = si.code, this.data = { filepaths: t };
  }
}
si.code = "CheckoutConflictError";
class fi extends N {
  /**
   * @param {string} oid
   * @param {number} parentCount
   */
  constructor(t, r) {
    super(
      `Cannot cherry-pick merge commit ${t}. Merge commits have ${r} parents and require specifying which parent to use as the base.`
    ), this.code = this.name = fi.code, this.data = { oid: t, parentCount: r };
  }
}
fi.code = "CherryPickMergeCommitError";
class ci extends N {
  /**
   * @param {string} oid
   */
  constructor(t) {
    super(
      `Cannot cherry-pick root commit ${t}. Root commits have no parents.`
    ), this.code = this.name = ci.code, this.data = { oid: t };
  }
}
ci.code = "CherryPickRootCommitError";
class ui extends N {
  /**
   * @param {string} ref
   * @param {string} oid
   */
  constructor(t, r) {
    super(
      `Failed to checkout "${t}" because commit ${r} is not available locally. Do a git fetch to make the branch available locally.`
    ), this.code = this.name = ui.code, this.data = { ref: t, oid: r };
  }
}
ui.code = "CommitNotFetchedError";
class li extends N {
  constructor() {
    super("Empty response from git server."), this.code = this.name = li.code, this.data = {};
  }
}
li.code = "EmptyServerResponseError";
class hi extends N {
  constructor() {
    super("A simple fast-forward merge was not possible."), this.code = this.name = hi.code, this.data = {};
  }
}
hi.code = "FastForwardError";
class di extends N {
  /**
   * @param {string} prettyDetails
   * @param {PushResult} result
   */
  constructor(t, r) {
    super(`One or more branches were not updated: ${t}`), this.code = this.name = di.code, this.data = { prettyDetails: t, result: r };
  }
}
di.code = "GitPushError";
class pi extends N {
  /**
   * @param {number} statusCode
   * @param {string} statusMessage
   * @param {string} response
   */
  constructor(t, r, n) {
    super(`HTTP Error: ${t} ${r}`), this.code = this.name = pi.code, this.data = { statusCode: t, statusMessage: r, response: n };
  }
}
pi.code = "HttpError";
class Rt extends N {
  /**
   * @param {'leading-slash'|'trailing-slash'|'directory'} [reason]
   */
  constructor(t) {
    let r = "invalid filepath";
    t === "leading-slash" || t === "trailing-slash" ? r = '"filepath" parameter should not include leading or trailing directory separators because these can cause problems on some platforms.' : t === "directory" && (r = '"filepath" should not be a directory.'), super(r), this.code = this.name = Rt.code, this.data = { reason: t };
  }
}
Rt.code = "InvalidFilepathError";
class _i extends N {
  /**
   * @param {string} ref
   * @param {string} suggestion
   * @param {boolean} canForce
   */
  constructor(t, r) {
    super(
      `"${t}" would be an invalid git reference. (Hint: a valid alternative would be "${r}".)`
    ), this.code = this.name = _i.code, this.data = { ref: t, suggestion: r };
  }
}
_i.code = "InvalidRefNameError";
class yi extends N {
  /**
   * @param {number} depth
   */
  constructor(t) {
    super(`Maximum search depth of ${t} exceeded.`), this.code = this.name = yi.code, this.data = { depth: t };
  }
}
yi.code = "MaxDepthError";
class vi extends N {
  constructor() {
    super("Merges with conflicts are not supported yet."), this.code = this.name = vi.code, this.data = {};
  }
}
vi.code = "MergeNotSupportedError";
class gi extends N {
  /**
   * @param {Array<string>} filepaths
   * @param {Array<string>} bothModified
   * @param {Array<string>} deleteByUs
   * @param {Array<string>} deleteByTheirs
   */
  constructor(t, r, n, i) {
    super(
      `Automatic merge failed with one or more merge conflicts in the following files: ${t.toString()}. Fix conflicts then commit the result.`
    ), this.code = this.name = gi.code, this.data = { filepaths: t, bothModified: r, deleteByUs: n, deleteByTheirs: i };
  }
}
gi.code = "MergeConflictError";
class bi extends N {
  /**
   * @param {'author'|'committer'|'tagger'} role
   */
  constructor(t) {
    super(
      `No name was provided for ${t} in the argument or in the .git/config file.`
    ), this.code = this.name = bi.code, this.data = { role: t };
  }
}
bi.code = "MissingNameError";
class Rr extends N {
  /**
   * @param {string} parameter
   */
  constructor(t) {
    super(
      `The function requires a "${t}" parameter but none was provided.`
    ), this.code = this.name = Rr.code, this.data = { parameter: t };
  }
}
Rr.code = "MissingParameterError";
class wi extends N {
  /**
   * @param {Error[]} errors
   * @param {string} message
   */
  constructor(t) {
    super(
      'There are multiple errors that were thrown by the method. Please refer to the "errors" property to see more'
    ), this.code = this.name = wi.code, this.data = { errors: t }, this.errors = t;
  }
}
wi.code = "MultipleGitError";
class mi extends N {
  /**
   * @param {string} expected
   * @param {string} actual
   */
  constructor(t, r) {
    super(`Expected "${t}" but received "${r}".`), this.code = this.name = mi.code, this.data = { expected: t, actual: r };
  }
}
mi.code = "ParseError";
class xi extends N {
  /**
   * @param {'not-fast-forward'|'tag-exists'} reason
   */
  constructor(t) {
    let r = "";
    t === "not-fast-forward" ? r = " because it was not a simple fast-forward" : t === "tag-exists" && (r = " because tag already exists"), super(`Push rejected${r}. Use "force: true" to override.`), this.code = this.name = xi.code, this.data = { reason: t };
  }
}
xi.code = "PushRejectedError";
class Ei extends N {
  /**
   * @param {'shallow'|'deepen-since'|'deepen-not'|'deepen-relative'} capability
   * @param {'depth'|'since'|'exclude'|'relative'} parameter
   */
  constructor(t, r) {
    super(
      `Remote does not support the "${t}" so the "${r}" parameter cannot be used.`
    ), this.code = this.name = Ei.code, this.data = { capability: t, parameter: r };
  }
}
Ei.code = "RemoteCapabilityError";
class Ai extends N {
  /**
   * @param {string} preview
   * @param {string} response
   */
  constructor(t, r) {
    super(
      `Remote did not reply using the "smart" HTTP protocol. Expected "001e# service=git-upload-pack" but received: ${t}`
    ), this.code = this.name = Ai.code, this.data = { preview: t, response: r };
  }
}
Ai.code = "SmartHttpError";
class Si extends N {
  /**
   * @param {string} url
   * @param {string} transport
   * @param {string} [suggestion]
   */
  constructor(t, r, n) {
    super(
      `Git remote "${t}" uses an unrecognized transport protocol: "${r}"`
    ), this.code = this.name = Si.code, this.data = { url: t, transport: r, suggestion: n };
  }
}
Si.code = "UnknownTransportError";
class ki extends N {
  /**
   * @param {string} url
   */
  constructor(t) {
    super(`Cannot parse remote URL: "${t}"`), this.code = this.name = ki.code, this.data = { url: t };
  }
}
ki.code = "UrlParseError";
class Bi extends N {
  constructor() {
    super("The operation was canceled."), this.code = this.name = Bi.code, this.data = {};
  }
}
Bi.code = "UserCanceledError";
class Ii extends N {
  /**
   * @param {Array<string>} filepaths
   */
  constructor(t) {
    super(
      `Could not merge index: Entry for '${t}' is not up to date. Either reset the index entry to HEAD, or stage your unstaged changes.`
    ), this.code = this.name = Ii.code, this.data = { filepath: t };
  }
}
Ii.code = "IndexResetError";
class Ti extends N {
  /**
   * @param {string} ref
   */
  constructor(t) {
    super(
      `"${t}" does not point to any commit. You're maybe working on a repository with no commits yet. `
    ), this.code = this.name = Ti.code, this.data = { ref: t };
  }
}
Ti.code = "NoCommitError";
function Dn({ name: e, email: t, timestamp: r, timezoneOffset: n }) {
  return n = _0(n), `${e} <${t}> ${r} ${n}`;
}
function _0(e) {
  const t = y0(v0(e));
  e = Math.abs(e);
  const r = Math.floor(e / 60);
  e -= r * 60;
  let n = String(r), i = String(e);
  return n.length < 2 && (n = "0" + n), i.length < 2 && (i = "0" + i), (t === -1 ? "-" : "+") + n + i;
}
function y0(e) {
  return Math.sign(e) || (Object.is(e, -0) ? -1 : 1);
}
function v0(e) {
  return e === 0 ? e : -e;
}
function Be(e) {
  return e = e.replace(/\r/g, ""), e = e.replace(/^\n+/, ""), e = e.replace(/\n+$/, "") + `
`, e;
}
function xr(e) {
  const [, t, r, n, i] = e.match(
    /^(.*) <(.*)> (.*) (.*)$/
  );
  return {
    name: t,
    email: r,
    timestamp: Number(n),
    timezoneOffset: g0(i)
  };
}
function g0(e) {
  let [, t, r, n] = e.match(/(\+|-)(\d\d)(\d\d)/);
  return n = (t === "+" ? 1 : -1) * (Number(r) * 60 + Number(n)), b0(n);
}
function b0(e) {
  return e === 0 ? e : -e;
}
let Cs = class _r {
  constructor(t) {
    if (typeof t == "string")
      this._tag = t;
    else if (Buffer.isBuffer(t))
      this._tag = t.toString("utf8");
    else if (typeof t == "object")
      this._tag = _r.render(t);
    else
      throw new j(
        "invalid type passed to GitAnnotatedTag constructor"
      );
  }
  static from(t) {
    return new _r(t);
  }
  static render(t) {
    return `object ${t.object}
type ${t.type}
tag ${t.tag}
tagger ${Dn(t.tagger)}

${t.message}
${t.gpgsig ? t.gpgsig : ""}`;
  }
  justHeaders() {
    return this._tag.slice(0, this._tag.indexOf(`

`));
  }
  message() {
    const t = this.withoutSignature();
    return t.slice(t.indexOf(`

`) + 2);
  }
  parse() {
    return Object.assign(this.headers(), {
      message: this.message(),
      gpgsig: this.gpgsig()
    });
  }
  render() {
    return this._tag;
  }
  headers() {
    const t = this.justHeaders().split(`
`), r = [];
    for (const i of t)
      i[0] === " " ? r[r.length - 1] += `
` + i.slice(1) : r.push(i);
    const n = {};
    for (const i of r) {
      const a = i.slice(0, i.indexOf(" ")), s = i.slice(i.indexOf(" ") + 1);
      Array.isArray(n[a]) ? n[a].push(s) : n[a] = s;
    }
    return n.tagger && (n.tagger = xr(n.tagger)), n.committer && (n.committer = xr(n.committer)), n;
  }
  withoutSignature() {
    const t = Be(this._tag);
    return t.indexOf(`
-----BEGIN PGP SIGNATURE-----`) === -1 ? t : t.slice(0, t.lastIndexOf(`
-----BEGIN PGP SIGNATURE-----`));
  }
  gpgsig() {
    if (this._tag.indexOf(`
-----BEGIN PGP SIGNATURE-----`) === -1) return;
    const t = this._tag.slice(
      this._tag.indexOf("-----BEGIN PGP SIGNATURE-----"),
      this._tag.indexOf("-----END PGP SIGNATURE-----") + 27
    );
    return Be(t);
  }
  payload() {
    return this.withoutSignature() + `
`;
  }
  toObject() {
    return Buffer.from(this._tag, "utf8");
  }
  static async sign(t, r, n) {
    const i = t.payload();
    let { signature: a } = await r({ payload: i, secretKey: n });
    a = Be(a);
    const s = i + a;
    return _r.from(s);
  }
};
function xn(e) {
  return e.trim().split(`
`).map((t) => " " + t).join(`
`) + `
`;
}
function w0(e) {
  return e.split(`
`).map((t) => t.replace(/^ /, "")).join(`
`);
}
let Ps = class fe {
  constructor(t) {
    if (typeof t == "string")
      this._commit = t;
    else if (Buffer.isBuffer(t))
      this._commit = t.toString("utf8");
    else if (typeof t == "object")
      this._commit = fe.render(t);
    else
      throw new j("invalid type passed to GitCommit constructor");
  }
  static fromPayloadSignature({ payload: t, signature: r }) {
    const n = fe.justHeaders(t), i = fe.justMessage(t), a = Be(
      n + `
gpgsig` + xn(r) + `
` + i
    );
    return new fe(a);
  }
  static from(t) {
    return new fe(t);
  }
  toObject() {
    return Buffer.from(this._commit, "utf8");
  }
  // Todo: allow setting the headers and message
  headers() {
    return this.parseHeaders();
  }
  // Todo: allow setting the headers and message
  message() {
    return fe.justMessage(this._commit);
  }
  parse() {
    return Object.assign({ message: this.message() }, this.headers());
  }
  static justMessage(t) {
    return Be(t.slice(t.indexOf(`

`) + 2));
  }
  static justHeaders(t) {
    return t.slice(0, t.indexOf(`

`));
  }
  parseHeaders() {
    const t = fe.justHeaders(this._commit).split(`
`), r = [];
    for (const i of t)
      i[0] === " " ? r[r.length - 1] += `
` + i.slice(1) : r.push(i);
    const n = {
      parent: []
    };
    for (const i of r) {
      const a = i.slice(0, i.indexOf(" ")), s = i.slice(i.indexOf(" ") + 1);
      Array.isArray(n[a]) ? n[a].push(s) : n[a] = s;
    }
    return n.author && (n.author = xr(n.author)), n.committer && (n.committer = xr(n.committer)), n;
  }
  static renderHeaders(t) {
    let r = "";
    if (t.tree ? r += `tree ${t.tree}
` : r += `tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904
`, t.parent) {
      if (t.parent.length === void 0)
        throw new j("commit 'parent' property should be an array");
      for (const a of t.parent)
        r += `parent ${a}
`;
    }
    const n = t.author;
    r += `author ${Dn(n)}
`;
    const i = t.committer || t.author;
    return r += `committer ${Dn(i)}
`, t.gpgsig && (r += "gpgsig" + xn(t.gpgsig)), r;
  }
  static render(t) {
    return fe.renderHeaders(t) + `
` + Be(t.message);
  }
  render() {
    return this._commit;
  }
  withoutSignature() {
    const t = Be(this._commit);
    if (t.indexOf(`
gpgsig`) === -1) return t;
    const r = t.slice(0, t.indexOf(`
gpgsig`)), n = t.slice(
      t.indexOf(`-----END PGP SIGNATURE-----
`) + 28
    );
    return Be(r + `
` + n);
  }
  isolateSignature() {
    const t = this._commit.slice(
      this._commit.indexOf("-----BEGIN PGP SIGNATURE-----"),
      this._commit.indexOf("-----END PGP SIGNATURE-----") + 27
    );
    return w0(t);
  }
  static async sign(t, r, n) {
    const i = t.withoutSignature(), a = fe.justMessage(t._commit);
    let { signature: s } = await r({ payload: i, secretKey: n });
    s = Be(s);
    const h = fe.justHeaders(t._commit) + `
gpgsig` + xn(s) + `
` + a;
    return fe.from(h);
  }
};
async function Nn({ fs: e, cache: t, gitdir: r, oid: n }) {
  if (n === "4b825dc642cb6eb9a060e54bf8d69288fbee4904")
    return { tree: mr.from([]), oid: n };
  const { type: i, object: a } = await Yt({ fs: e, cache: t, gitdir: r, oid: n });
  if (i === "tag")
    return n = Cs.from(a).parse().object, Nn({ fs: e, cache: t, gitdir: r, oid: n });
  if (i === "commit")
    return n = Ps.from(a).parse().tree, Nn({ fs: e, cache: t, gitdir: r, oid: n });
  if (i !== "tree")
    throw new Or(n, i, "tree");
  return { tree: mr.from(a), oid: n };
}
async function Ln(e, t) {
  const r = await e.readdir(t);
  r == null ? await e.rm(t) : r.length ? await Promise.all(
    r.map((n) => {
      const i = vt(t, n);
      return e.lstat(i).then((a) => {
        if (a)
          return a.isDirectory() ? Ln(e, i) : e.rm(i);
      });
    })
  ).then(() => e.rmdir(t)) : await e.rmdir(t);
}
function m0(e) {
  return x0(e) && no(e.then) && no(e.catch);
}
function x0(e) {
  return e && typeof e == "object";
}
function no(e) {
  return typeof e == "function";
}
function io(e) {
  return m0(((r) => {
    try {
      return r.readFile().catch((n) => n);
    } catch (n) {
      return n;
    }
  })(e));
}
const ao = [
  "readFile",
  "writeFile",
  "mkdir",
  "rmdir",
  "unlink",
  "stat",
  "lstat",
  "readdir",
  "readlink",
  "symlink"
];
function oo(e, t) {
  if (io(t))
    for (const r of ao)
      e[`_${r}`] = t[r].bind(t);
  else
    for (const r of ao)
      e[`_${r}`] = ar(t[r].bind(t));
  io(t) ? (t.cp && (e._cp = t.cp.bind(t)), t.rm ? e._rm = t.rm.bind(t) : t.rmdir.length > 1 ? e._rm = t.rmdir.bind(t) : e._rm = Ln.bind(null, e)) : (t.cp && (e._cp = ar(t.cp.bind(t))), t.rm ? e._rm = ar(t.rm.bind(t)) : t.rmdir.length > 2 ? e._rm = ar(t.rmdir.bind(t)) : e._rm = Ln.bind(null, e));
}
class Us {
  /**
   * Creates an instance of FileSystem.
   *
   * @param {Object} fs - A file system implementation to wrap.
   */
  constructor(t) {
    if (typeof t._original_unwrapped_fs < "u") return t;
    const r = Object.getOwnPropertyDescriptor(t, "promises");
    r && r.enumerable ? oo(this, t.promises) : oo(this, t), this._original_unwrapped_fs = t;
  }
  /**
   * Return true if a file exists, false if it doesn't exist.
   * Rethrows errors that aren't related to file existence.
   *
   * @param {string} filepath - The path to the file.
   * @param {Object} [options] - Additional options.
   * @returns {Promise<boolean>} - `true` if the file exists, `false` otherwise.
   */
  async exists(t, r = {}) {
    try {
      return await this._stat(t), !0;
    } catch (n) {
      if (n.code === "ENOENT" || n.code === "ENOTDIR" || (n.code || "").includes("ENS"))
        return !1;
      throw console.log('Unhandled error in "FileSystem.exists()" function', n), n;
    }
  }
  /**
   * Return the contents of a file if it exists, otherwise returns null.
   *
   * @param {string} filepath - The path to the file.
   * @param {Object} [options] - Options for reading the file.
   * @returns {Promise<Buffer|string|null>} - The file contents, or `null` if the file doesn't exist.
   */
  async read(t, r = {}) {
    try {
      let n = await this._readFile(t, r);
      if (r.autocrlf === "true")
        try {
          n = new TextDecoder("utf8", { fatal: !0 }).decode(n), n = n.replace(/\r\n/g, `
`), n = new TextEncoder().encode(n);
        } catch {
        }
      return typeof n != "string" && (n = Buffer.from(n)), n;
    } catch {
      return null;
    }
  }
  /**
   * Write a file (creating missing directories if need be) without throwing errors.
   *
   * @param {string} filepath - The path to the file.
   * @param {Buffer|Uint8Array|string} contents - The data to write.
   * @param {Object|string} [options] - Options for writing the file.
   * @returns {Promise<void>}
   */
  async write(t, r, n = {}) {
    try {
      await this._writeFile(t, r, n);
    } catch {
      await this.mkdir(Pn(t)), await this._writeFile(t, r, n);
    }
  }
  /**
   * Make a directory (or series of nested directories) without throwing an error if it already exists.
   *
   * @param {string} filepath - The path to the directory.
   * @param {boolean} [_selfCall=false] - Internal flag to prevent infinite recursion.
   * @returns {Promise<void>}
   */
  async mkdir(t, r = !1) {
    try {
      await this._mkdir(t);
    } catch (n) {
      if (n === null || n.code === "EEXIST") return;
      if (r) throw n;
      if (n.code === "ENOENT") {
        const i = Pn(t);
        if (i === "." || i === "/" || i === t) throw n;
        await this.mkdir(i), await this.mkdir(t, !0);
      }
    }
  }
  /**
   * Delete a file without throwing an error if it is already deleted.
   *
   * @param {string} filepath - The path to the file.
   * @returns {Promise<void>}
   */
  async rm(t) {
    try {
      await this._unlink(t);
    } catch (r) {
      if (r.code !== "ENOENT") throw r;
    }
  }
  /**
   * Delete a directory without throwing an error if it is already deleted.
   *
   * @param {string} filepath - The path to the directory.
   * @param {Object} [opts] - Options for deleting the directory.
   * @returns {Promise<void>}
   */
  async rmdir(t, r) {
    try {
      r && r.recursive ? await this._rm(t, r) : await this._rmdir(t);
    } catch (n) {
      if (n.code !== "ENOENT") throw n;
    }
  }
  /**
   * Read a directory without throwing an error is the directory doesn't exist
   *
   * @param {string} filepath - The path to the directory.
   * @returns {Promise<string[]|null>} - An array of file names, or `null` if the path is not a directory.
   */
  async readdir(t) {
    try {
      const r = await this._readdir(t);
      return r.sort(ri), r;
    } catch (r) {
      return r.code === "ENOTDIR" ? null : [];
    }
  }
  /**
   * Return a flat list of all the files nested inside a directory
   *
   * Based on an elegant concurrent recursive solution from SO
   * https://stackoverflow.com/a/45130990/2168416
   *
   * @param {string} dir - The directory to read.
   * @returns {Promise<string[]>} - A flat list of all files in the directory.
   */
  async readdirDeep(t) {
    const r = await this._readdir(t);
    return (await Promise.all(
      r.map(async (i) => {
        const a = t + "/" + i;
        return (await this._stat(a)).isDirectory() ? this.readdirDeep(a) : a;
      })
    )).reduce((i, a) => i.concat(a), []);
  }
  /**
   * Return the Stats of a file/symlink if it exists, otherwise returns null.
   * Rethrows errors that aren't related to file existence.
   *
   * @param {string} filename - The path to the file or symlink.
   * @returns {Promise<Object|null>} - The stats object, or `null` if the file doesn't exist.
   */
  async lstat(t) {
    try {
      return await this._lstat(t);
    } catch (r) {
      if (r.code === "ENOENT" || (r.code || "").includes("ENS"))
        return null;
      throw r;
    }
  }
  /**
   * Reads the contents of a symlink if it exists, otherwise returns null.
   * Rethrows errors that aren't related to file existence.
   *
   * @param {string} filename - The path to the symlink.
   * @param {Object} [opts={ encoding: 'buffer' }] - Options for reading the symlink.
   * @returns {Promise<Buffer|null>} - The symlink target, or `null` if it doesn't exist.
   */
  async readlink(t, r = { encoding: "buffer" }) {
    try {
      const n = await this._readlink(t, r);
      return Buffer.isBuffer(n) ? n : Buffer.from(n);
    } catch (n) {
      if (n.code === "ENOENT" || (n.code || "").includes("ENS"))
        return null;
      throw n;
    }
  }
  /**
   * Write the contents of buffer to a symlink.
   *
   * @param {string} filename - The path to the symlink.
   * @param {Buffer} buffer - The symlink target.
   * @returns {Promise<void>}
   */
  async writelink(t, r) {
    return this._symlink(r.toString("utf8"), t);
  }
}
function Ie(e, t) {
  if (t === void 0)
    throw new Rr(e);
}
function E0(e) {
  return e.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(e);
}
async function Ds({ fsp: e, dotgit: t }) {
  Ie("fsp", e), Ie("dotgit", t);
  const r = await e._stat(t).catch(() => ({ isFile: () => !1, isDirectory: () => !1 }));
  return r.isDirectory() ? t : r.isFile() ? e._readFile(t, "utf8").then((n) => n.trimRight().substr(8)).then((n) => E0(n) ? n : vt(Pn(t), n)) : t;
}
async function A0({ fs: e, cache: t, gitdir: r, oid: n, filepath: i }) {
  if (i.startsWith("/"))
    throw new Rt("leading-slash");
  if (i.endsWith("/"))
    throw new Rt("trailing-slash");
  const a = n, s = await Nn({ fs: e, cache: t, gitdir: r, oid: n }), o = s.tree;
  if (i === "")
    n = s.oid;
  else {
    const h = i.split("/");
    n = await Ns({
      fs: e,
      cache: t,
      gitdir: r,
      tree: o,
      pathArray: h,
      oid: a,
      filepath: i
    });
  }
  return n;
}
async function Ns({
  fs: e,
  cache: t,
  gitdir: r,
  tree: n,
  pathArray: i,
  oid: a,
  filepath: s
}) {
  const o = i.shift();
  for (const h of n)
    if (h.path === o) {
      if (i.length === 0)
        return h.oid;
      {
        const { type: u, object: l } = await Yt({
          fs: e,
          cache: t,
          gitdir: r,
          oid: h.oid
        });
        if (u !== "tree")
          throw new Or(a, u, "tree", s);
        return n = mr.from(l), Ns({
          fs: e,
          cache: t,
          gitdir: r,
          tree: n,
          pathArray: i,
          oid: a,
          filepath: s
        });
      }
    }
  throw new Kt(`file or directory found at "${a}:${s}"`);
}
async function S0({
  fs: e,
  cache: t,
  onProgress: r,
  dir: n,
  gitdir: i,
  filepath: a
}) {
  try {
    a = vt(n, a);
    const s = await e.read(a), o = (u) => Yt({ fs: e, cache: t, gitdir: i, oid: u }), h = await Rs.fromPack({
      pack: s,
      getExternalRefDelta: o,
      onProgress: r
    });
    return await e.write(a.replace(/\.pack$/, ".idx"), await h.toBuffer()), {
      oids: [...h.hashes]
    };
  } catch (s) {
    throw s.caller = "git.indexPack", s;
  }
}
async function k0({
  fs: e,
  onProgress: t,
  dir: r,
  gitdir: n = vt(r, ".git"),
  filepath: i,
  cache: a = {}
}) {
  try {
    Ie("fs", e), Ie("dir", r), Ie("gitdir", r), Ie("filepath", i);
    const s = new Us(e), o = await Ds({ fsp: s, dotgit: n });
    return await S0({
      fs: s,
      cache: a,
      onProgress: t,
      dir: r,
      gitdir: o,
      filepath: i
    });
  } catch (s) {
    throw s.caller = "git.indexPack", s;
  }
}
async function B0({
  fs: e,
  dir: t,
  gitdir: r = vt(t, ".git"),
  oid: n,
  format: i = "parsed",
  filepath: a = void 0,
  encoding: s = void 0,
  cache: o = {}
}) {
  try {
    Ie("fs", e), Ie("gitdir", r), Ie("oid", n);
    const h = new Us(e), u = await Ds({ fsp: h, dotgit: r });
    a !== void 0 && (n = await A0({
      fs: h,
      cache: o,
      gitdir: u,
      oid: n,
      filepath: a
    }));
    const _ = await Yt({
      fs: h,
      cache: o,
      gitdir: u,
      oid: n,
      format: i === "parsed" ? "content" : i
    });
    if (_.oid = n, i === "parsed")
      switch (_.format = "parsed", _.type) {
        case "commit":
          _.object = Ps.from(_.object).parse();
          break;
        case "tree":
          _.object = mr.from(_.object).entries();
          break;
        case "blob":
          s ? _.object = _.object.toString(s) : (_.object = new Uint8Array(_.object), _.format = "content");
          break;
        case "tag":
          _.object = Cs.from(_.object).parse();
          break;
        default:
          throw new Or(
            _.oid,
            _.type,
            "blob|commit|tag|tree"
          );
      }
    else (_.format === "deflated" || _.format === "wrapped") && (_.type = _.format);
    return _;
  } catch (h) {
    throw h.caller = "git.readObject", h;
  }
}
typeof globalThis.Buffer > "u" && (globalThis.Buffer = jn.Buffer);
class L0 extends Error {
  constructor(t, r, n) {
    super(`Object ${t} has type ${r}, but expected ${n}.`), this.name = "ObjectTypeError";
  }
}
function I0(e, t) {
  const r = t.toString(16);
  return "0".repeat(e - r.length) + r;
}
class z0 {
  static flush() {
    return Buffer.from("0000", "utf8");
  }
  static delim() {
    return Buffer.from("0001", "utf8");
  }
  static encode(t) {
    const r = typeof t == "string" ? Buffer.from(t) : t;
    return Buffer.concat([
      Buffer.from(I0(4, r.length + 4), "utf8"),
      Buffer.from(r)
    ]);
  }
  static decode(t) {
    const r = parseInt(t.subarray(0, 4).toString("utf8"), 16);
    return t.subarray(4, r).toString("utf8");
  }
}
function T0(e) {
  return Symbol.asyncIterator in e ? e[Symbol.asyncIterator]() : e[Symbol.iterator]();
}
async function F0(e) {
  let t = 0;
  const r = [], n = T0(e);
  for (; ; ) {
    const { value: s, done: o } = await n.next();
    if (o)
      break;
    s && (r.push(s), t += s.byteLength);
  }
  n.return && await n.return();
  const i = new Uint8Array(t);
  let a = 0;
  for (const s of r)
    i.set(s, a), a += s.byteLength;
  return i;
}
async function M0(e) {
  const t = Buffer.from(await F0(e)), r = [], n = [], i = [], a = [], s = [], o = [];
  let h = !1, u = 0;
  for (; u + 4 <= t.length; ) {
    const l = parseInt(
      t.subarray(u, u + 4).toString("utf8"),
      16
    );
    if (u += 4, l === 0 || l === 1)
      continue;
    if (Number.isNaN(l) || l < 4)
      throw new Error("Invalid git packet line length.");
    const _ = t.subarray(u, u + l - 4);
    u += l - 4;
    const v = _[0];
    if (v === 1) {
      n.push(_.subarray(1));
      continue;
    }
    if (v === 2) {
      i.push(_.subarray(1));
      continue;
    }
    if (v === 3)
      throw new Error(_.subarray(1).toString("utf8"));
    r.push(_);
  }
  for (const l of r) {
    const _ = l.toString("utf8").trim();
    if (_.startsWith("shallow"))
      a.push(_.slice(-40).trim());
    else if (_.startsWith("unshallow"))
      s.push(_.slice(-40).trim());
    else if (_.startsWith("ACK")) {
      const [, v, g] = _.split(" ");
      o.push({ oid: v, status: g });
    } else _.startsWith("NAK") && (h = !0);
  }
  return {
    shallows: a,
    unshallows: s,
    acks: o,
    nak: h,
    packfile: n,
    progress: i
  };
}
function ie(e) {
  const t = e.startsWith("/"), r = [];
  for (const i of e.split(/[\\/]+/))
    if (!(!i || i === ".")) {
      if (i === "..") {
        r.pop();
        continue;
      }
      r.push(i);
    }
  const n = r.join("/");
  return t ? `/${n}` : n || ".";
}
function sr(e) {
  const t = ie(e), r = t.lastIndexOf("/");
  return r <= 0 ? t.startsWith("/") ? "/" : "." : t.slice(0, r);
}
function so(e) {
  return {
    isFile: () => e === "file",
    isDirectory: () => e === "directory",
    isSymbolicLink: () => e === "symlink"
  };
}
function Ls(e, t) {
  const r = new Error(t);
  return r.code = e, r;
}
function it(e) {
  return Ls(
    "ENOENT",
    `ENOENT: no such file or directory, ${e}`
  );
}
class $0 {
  constructor() {
    this.entries = /* @__PURE__ */ new Map([
      ["/", { type: "directory" }]
    ]), this.mkdirSync("/repo/.git/objects/pack"), this.writeFileSync("/repo/.git/HEAD", `ref: refs/heads/main
`);
  }
  mkdirSync(t) {
    const r = ie(t);
    if (r === "/") {
      this.entries.set("/", { type: "directory" });
      return;
    }
    let n = "";
    for (const i of r.split("/").filter(Boolean))
      n += `/${i}`, this.entries.set(n, { type: "directory" });
  }
  writeFileSync(t, r) {
    const n = ie(t);
    this.mkdirSync(sr(n)), this.entries.set(n, {
      type: "file",
      data: Buffer.from(r)
    });
  }
  async readFile(t, r) {
    const n = ie(t), i = this.getFileEntry(n);
    if (!i || i.type !== "file")
      throw it(n);
    const a = typeof r == "string" ? r : r == null ? void 0 : r.encoding;
    return a ? i.data.toString(a) : Buffer.from(i.data);
  }
  async writeFile(t, r, n) {
    const i = ie(t);
    this.mkdirSync(sr(i));
    const a = typeof n == "string" ? n : n == null ? void 0 : n.encoding;
    this.entries.set(i, {
      type: "file",
      data: typeof r == "string" ? Buffer.from(r, a) : Buffer.from(r)
    });
  }
  async mkdir(t) {
    this.mkdirSync(t);
  }
  async readdir(t) {
    const r = ie(t), n = this.entries.get(r);
    if (!n || n.type !== "directory")
      throw it(r);
    const i = /* @__PURE__ */ new Set(), a = r === "/" ? "/" : `${r}/`;
    for (const s of this.entries.keys()) {
      if (!s.startsWith(a) || s === r)
        continue;
      const o = s.slice(a.length).split("/")[0];
      o && i.add(o);
    }
    return [...i].sort();
  }
  async stat(t) {
    const r = ie(t), n = this.getResolvedEntry(r);
    if (!n)
      throw it(r);
    return so(n.type);
  }
  async lstat(t) {
    const r = ie(t), n = this.entries.get(r);
    if (!n)
      throw it(r);
    return so(n.type);
  }
  async unlink(t) {
    const r = ie(t), n = this.entries.get(r);
    if (!n || n.type !== "file" && n.type !== "symlink")
      throw it(r);
    this.entries.delete(r);
  }
  async rmdir(t) {
    const r = ie(t), n = r === "/" ? "/" : `${r}/`;
    for (const i of this.entries.keys())
      if (i.startsWith(n) && i !== r)
        throw new Error(
          `ENOTEMPTY: directory not empty, ${r}`
        );
    this.entries.delete(r);
  }
  async rm(t) {
    this.entries.delete(ie(t));
  }
  async readlink(t) {
    const r = ie(t), n = this.entries.get(r);
    if (!n || n.type !== "symlink")
      throw it(r);
    return n.target;
  }
  async symlink(t, r) {
    const n = ie(r);
    this.mkdirSync(sr(n)), this.entries.set(n, {
      type: "symlink",
      target: t
    });
  }
  getFileEntry(t) {
    const r = this.entries.get(t);
    return (r == null ? void 0 : r.type) !== "symlink" ? r : this.getResolvedEntry(t);
  }
  getResolvedEntry(t, r = /* @__PURE__ */ new Set()) {
    const n = this.entries.get(t);
    if ((n == null ? void 0 : n.type) !== "symlink")
      return n;
    if (r.has(t))
      throw Ls(
        "ELOOP",
        `ELOOP: too many symbolic links, ${t}`
      );
    r.add(t);
    const i = n.target.startsWith("/") ? n.target : ie(`${sr(t)}/${n.target}`);
    return this.getResolvedEntry(i, r);
  }
}
function O0(e) {
  const t = e.readUInt32BE(1028), r = [], n = /* @__PURE__ */ new Map();
  let i = 8 + 256 * 4;
  for (let o = 0; o < t; o++)
    r.push(e.subarray(i, i + 20).toString("hex")), i += 20;
  i += t * 4;
  const a = i;
  i += t * 4;
  const s = i;
  for (let o = 0; o < t; o++) {
    const h = e.readUInt32BE(a + o * 4);
    if (h & 2147483648) {
      const u = h & 2147483647, l = Number(
        e.readBigUInt64BE(s + u * 8)
      );
      n.set(r[o], l);
    } else
      n.set(r[o], h);
  }
  return {
    hashes: r,
    offsets: n,
    packfileSha: e.subarray(e.length - 40, e.length - 20).toString("hex")
  };
}
const fo = "/repo", co = "/repo/.git", R0 = "/repo/.git/objects/pack/pack.playground.pack", C0 = ".git/objects/pack/pack.playground.pack", P0 = "/repo/.git/objects/pack/pack.playground.idx";
class zn {
  constructor({
    fs: t,
    indexBuffer: r,
    hashes: n,
    offsets: i,
    packfileSha: a,
    offsetToOid: s
  }) {
    this.cache = {}, this.fs = t, this.indexBuffer = r, this.hashes = n, this.offsets = i, this.packfileSha = a, this.offsetToOid = s ?? new Map([...i].map(([o, h]) => [h, o]));
  }
  static async fromPack({ pack: t }) {
    const r = new $0(), n = Buffer.from(t);
    if (await r.writeFile(R0, n), n.byteLength === 0)
      return new zn({
        fs: r,
        indexBuffer: Buffer.alloc(0),
        hashes: [],
        offsets: /* @__PURE__ */ new Map(),
        packfileSha: ""
      });
    await k0({
      fs: r,
      dir: fo,
      gitdir: co,
      filepath: C0,
      cache: {}
    });
    const i = await r.readFile(P0), a = O0(i);
    return new zn({
      fs: r,
      indexBuffer: i,
      ...a
    });
  }
  async read({ oid: t }) {
    const r = await B0({
      fs: this.fs,
      dir: fo,
      gitdir: co,
      oid: t,
      format: "content",
      cache: this.cache
    });
    return {
      oid: t,
      type: r.type,
      format: r.format,
      object: Buffer.from(r.object)
    };
  }
  async readSlice({ start: t }) {
    const r = this.offsetToOid.get(t);
    if (r)
      return this.read({ oid: r });
    throw new Error(`Could not read object at packfile offset ${t}.`);
  }
  async toBuffer() {
    return Buffer.from(this.indexBuffer);
  }
}
function U0(e, t) {
  return e < t ? -1 : e > t ? 1 : 0;
}
function zs(e, t) {
  return U0(e.path, t.path);
}
class j0 {
  constructor() {
    this.entries = /* @__PURE__ */ new Map();
  }
  insert({ filepath: t, oid: r, stats: n }) {
    const i = Buffer.from(t);
    this.entries.set(t, {
      filepath: t,
      path: t,
      oid: r,
      stats: n,
      flags: {
        assumeValid: !1,
        extended: !1,
        stage: 0,
        nameLength: i.length < 4095 ? i.length : 4095
      }
    });
  }
  renderFlags(t) {
    return (t.flags.assumeValid ? 32768 : 0) + (t.flags.extended ? 16384 : 0) + ((t.flags.stage & 3) << 12) + (t.flags.nameLength & 4095);
  }
  entryToBuffer(t) {
    const r = Buffer.from(t.path), n = Math.ceil((62 + r.length + 1) / 8) * 8, i = Buffer.alloc(n);
    let a = 0;
    const s = (o) => {
      i.writeUInt32BE(o, a), a += 4;
    };
    return s(t.stats.ctimeSeconds), s(t.stats.ctimeNanoseconds), s(t.stats.mtimeSeconds), s(t.stats.mtimeNanoseconds), s(t.stats.dev), s(t.stats.ino), s(t.stats.mode || 33188), s(t.stats.uid), s(t.stats.gid), s(t.stats.size), Buffer.from(t.oid, "hex").copy(i, a), a += 20, i.writeUInt16BE(this.renderFlags(t), a), a += 2, r.copy(i, a), i;
  }
  async toObject() {
    const t = Buffer.alloc(12);
    t.write("DIRC", 0, 4, "utf8"), t.writeUInt32BE(2, 4), t.writeUInt32BE(this.entries.size, 8);
    const r = Buffer.concat(
      [...this.entries.values()].sort(zs).map((a) => this.entryToBuffer(a))
    ), n = Buffer.concat([t, r]), i = D0(n);
    return Buffer.concat([n, i]);
  }
}
function D0(e) {
  return Buffer.from($u("sha1").update(e).digest("hex"), "hex");
}
function Mn(e) {
  const t = e == null ? void 0 : e.match(/^(.*) <(.*)> (.*) (.*)$/);
  return t ? {
    name: t[1],
    email: t[2],
    timestamp: Number(t[3]),
    timezoneOffset: 0
  } : {
    name: "",
    email: "",
    timestamp: 0,
    timezoneOffset: 0
  };
}
function Ms(e) {
  const [t, ...r] = e.split(`

`), n = [];
  for (const a of t.split(`
`))
    a.startsWith(" ") && n.length > 0 ? n[n.length - 1] += `
${a.slice(1)}` : n.push(a);
  const i = {};
  for (const a of n) {
    const s = a.indexOf(" ");
    if (s === -1)
      continue;
    const o = a.slice(0, s), h = a.slice(s + 1);
    if (o === "parent") {
      const u = i.parent;
      i.parent = Array.isArray(u) ? [...u, h] : u ? [u, h] : [h];
    } else
      i[o] = h;
  }
  return {
    headers: i,
    message: r.join(`

`)
  };
}
class js {
  constructor(t) {
    this.payload = Buffer.from(t).toString("utf8");
  }
  static from(t) {
    return new js(t);
  }
  parse() {
    const { headers: t, message: r } = Ms(this.payload), n = t.parent;
    return {
      tree: String(t.tree ?? ""),
      parent: Array.isArray(n) ? n : n ? [String(n)] : [],
      author: Mn(String(t.author ?? "")),
      committer: Mn(String(t.committer ?? "")),
      message: r,
      gpgsig: typeof t.gpgsig == "string" ? t.gpgsig : void 0
    };
  }
}
function N0(e) {
  return e === "160000" ? "commit" : e.match(/^0?4/) ? "tree" : "blob";
}
class Gs {
  constructor(t) {
    const r = [], n = Buffer.from(t);
    let i = 0;
    for (; i < n.length; ) {
      const a = n.indexOf(32, i), s = n.indexOf(0, i);
      if (a === -1 || s === -1)
        throw new Error("Invalid Git tree object.");
      let o = n.subarray(i, a).toString("utf8");
      o === "40000" && (o = "040000");
      const h = n.subarray(a + 1, s).toString("utf8"), u = n.subarray(s + 1, s + 21).toString("hex");
      r.push({
        mode: o,
        path: h,
        oid: u,
        type: N0(o)
      }), i = s + 21;
    }
    this.object = r.sort(zs);
  }
  static from(t) {
    return new Gs(t);
  }
  entries() {
    return this.object;
  }
}
class Hs {
  constructor(t) {
    this.payload = Buffer.from(t).toString("utf8");
  }
  static from(t) {
    return new Hs(t);
  }
  parse() {
    const { headers: t, message: r } = Ms(this.payload);
    return {
      object: String(t.object ?? ""),
      type: String(t.type ?? ""),
      tag: String(t.tag ?? ""),
      tagger: Mn(String(t.tagger ?? "")),
      message: r,
      signature: typeof t.signature == "string" ? t.signature : void 0
    };
  }
}
export {
  z0 as G,
  L0 as O,
  zn as a,
  Hs as b,
  F0 as c,
  Gs as d,
  js as e,
  jn as f,
  j0 as g,
  Es as h,
  M0 as p
};
