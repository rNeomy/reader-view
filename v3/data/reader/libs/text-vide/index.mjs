const u = (t) => t == null || t === "", I = (t, n) => Object.keys(t).reduce((e, s) => (n(e[s]) && delete e[s], e), t), m = (t, n) => ({
  ...n,
  ...I(t, u)
}), E = ["<b>", "</b>"];
const _ = (t) => m(t, {
  sep: E,
  fixationPoint: 1,
  ignoreHtmlTag: !0
}), L = [
  [0, 4, 12, 17, 24, 29, 35, 42, 48],
  [1, 2, 7, 10, 13, 14, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49],
  [
    1,
    2,
    5,
    7,
    9,
    11,
    13,
    15,
    17,
    19,
    21,
    23,
    25,
    27,
    29,
    31,
    33,
    35,
    37,
    39,
    41,
    43,
    45,
    47,
    49
  ],
  [
    0,
    2,
    4,
    5,
    6,
    8,
    9,
    11,
    14,
    15,
    17,
    18,
    20,
    0,
    21,
    23,
    24,
    26,
    27,
    29,
    30,
    32,
    33,
    35,
    36,
    38,
    39,
    41,
    42,
    44,
    45,
    47,
    48
  ],
  [
    0,
    2,
    3,
    5,
    6,
    7,
    8,
    10,
    11,
    12,
    14,
    15,
    17,
    19,
    20,
    21,
    23,
    24,
    25,
    26,
    28,
    29,
    30,
    32,
    33,
    34,
    35,
    37,
    38,
    39,
    41,
    42,
    43,
    44,
    46,
    47,
    48
  ]
], A = (t, n) => {
  const { length: o } = t, e = L[n - 1] ?? L[0], s = e.findIndex(
    (i) => o <= i
  );
  let c = o - s;
  return s === -1 && (c = o - e.length), Math.max(c, 0);
}, x = (t, n) => typeof n == "string" ? `${n}${t}${n}` : `${n[0]}${t}${n[1]}`, N = /(<!--[\s\S]*?-->)|(<[^>]*>)/g, O = (t) => {
  const n = t.matchAll(N), e = R(n).reverse();
  return (s) => {
    const c = s.index, i = e.find(
      ([l]) => c > l
    );
    if (!i)
      return !1;
    const [, r] = i;
    return c < r;
  };
}, R = (t) => [...t].map((n) => {
  const o = n.index, [e] = n, { length: s } = e;
  return [o, o + s - 1];
}), F = /(\p{L}|\p{Nd})*\p{L}(\p{L}|\p{Nd})*/gu, p = (t, n = {}) => {
  if (!(t != null && t.length))
    return "";
  const { fixationPoint: o, sep: e, ignoreHtmlTag: s } = _(n), c = t.matchAll(F);
  let i = "", r = 0, a;
  s && (a = O(t));
  for (const d of c) {
    if (a == null ? void 0 : a(d))
      continue;
    const [f] = d, g = d.index, T = g + A(f, o), h = t.slice(r, g);
    i += h, g !== T && (i += x(t.slice(g, T), e)), r = T;
  }
  const l = t.slice(r);
  return i + l;
};
export {
  p as textVide
};
