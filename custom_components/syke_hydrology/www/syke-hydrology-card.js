/*! syke-hydrology-card 1.1.0 | MIT License */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i5 = decorators.length - 1, decorator; i5 >= 0; i5--)
    if (decorator = decorators[i5])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t3, e5, o6) {
    if (this._$cssResult$ = true, o6 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t3, this.t = e5;
  }
  get styleSheet() {
    let t3 = this.o;
    const s4 = this.t;
    if (e && void 0 === t3) {
      const e5 = void 0 !== s4 && 1 === s4.length;
      e5 && (t3 = o.get(s4)), void 0 === t3 && ((this.o = t3 = new CSSStyleSheet()).replaceSync(this.cssText), e5 && o.set(s4, t3));
    }
    return t3;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t3) => new n("string" == typeof t3 ? t3 : t3 + "", void 0, s);
var i = (t3, ...e5) => {
  const o6 = 1 === t3.length ? t3[0] : e5.reduce((e6, s4, o7) => e6 + ((t4) => {
    if (true === t4._$cssResult$) return t4.cssText;
    if ("number" == typeof t4) return t4;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t4 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s4) + t3[o7 + 1], t3[0]);
  return new n(o6, t3, s);
};
var S = (s4, o6) => {
  if (e) s4.adoptedStyleSheets = o6.map((t3) => t3 instanceof CSSStyleSheet ? t3 : t3.styleSheet);
  else for (const e5 of o6) {
    const o7 = document.createElement("style"), n5 = t.litNonce;
    void 0 !== n5 && o7.setAttribute("nonce", n5), o7.textContent = e5.cssText, s4.appendChild(o7);
  }
};
var c = e ? (t3) => t3 : (t3) => t3 instanceof CSSStyleSheet ? ((t4) => {
  let e5 = "";
  for (const s4 of t4.cssRules) e5 += s4.cssText;
  return r(e5);
})(t3) : t3;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t3, s4) => t3;
var u = { toAttribute(t3, s4) {
  switch (s4) {
    case Boolean:
      t3 = t3 ? l : null;
      break;
    case Object:
    case Array:
      t3 = null == t3 ? t3 : JSON.stringify(t3);
  }
  return t3;
}, fromAttribute(t3, s4) {
  let i5 = t3;
  switch (s4) {
    case Boolean:
      i5 = null !== t3;
      break;
    case Number:
      i5 = null === t3 ? null : Number(t3);
      break;
    case Object:
    case Array:
      try {
        i5 = JSON.parse(t3);
      } catch (t4) {
        i5 = null;
      }
  }
  return i5;
} };
var f = (t3, s4) => !i2(t3, s4);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ?? (Symbol.metadata = /* @__PURE__ */ Symbol("metadata")), a.litPropertyMetadata ?? (a.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
var y = class extends HTMLElement {
  static addInitializer(t3) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t3);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t3, s4 = b) {
    if (s4.state && (s4.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t3) && ((s4 = Object.create(s4)).wrapped = true), this.elementProperties.set(t3, s4), !s4.noAccessor) {
      const i5 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t3, i5, s4);
      void 0 !== h3 && e2(this.prototype, t3, h3);
    }
  }
  static getPropertyDescriptor(t3, s4, i5) {
    const { get: e5, set: r6 } = h(this.prototype, t3) ?? { get() {
      return this[s4];
    }, set(t4) {
      this[s4] = t4;
    } };
    return { get: e5, set(s5) {
      const h3 = e5?.call(this);
      r6?.call(this, s5), this.requestUpdate(t3, h3, i5);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t3) {
    return this.elementProperties.get(t3) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t3 = n2(this);
    t3.finalize(), void 0 !== t3.l && (this.l = [...t3.l]), this.elementProperties = new Map(t3.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t4 = this.properties, s4 = [...r2(t4), ...o2(t4)];
      for (const i5 of s4) this.createProperty(i5, t4[i5]);
    }
    const t3 = this[Symbol.metadata];
    if (null !== t3) {
      const s4 = litPropertyMetadata.get(t3);
      if (void 0 !== s4) for (const [t4, i5] of s4) this.elementProperties.set(t4, i5);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t4, s4] of this.elementProperties) {
      const i5 = this._$Eu(t4, s4);
      void 0 !== i5 && this._$Eh.set(i5, t4);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s4) {
    const i5 = [];
    if (Array.isArray(s4)) {
      const e5 = new Set(s4.flat(1 / 0).reverse());
      for (const s5 of e5) i5.unshift(c(s5));
    } else void 0 !== s4 && i5.push(c(s4));
    return i5;
  }
  static _$Eu(t3, s4) {
    const i5 = s4.attribute;
    return false === i5 ? void 0 : "string" == typeof i5 ? i5 : "string" == typeof t3 ? t3.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t3) => this.enableUpdating = t3), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t3) => t3(this));
  }
  addController(t3) {
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(t3), void 0 !== this.renderRoot && this.isConnected && t3.hostConnected?.();
  }
  removeController(t3) {
    this._$EO?.delete(t3);
  }
  _$E_() {
    const t3 = /* @__PURE__ */ new Map(), s4 = this.constructor.elementProperties;
    for (const i5 of s4.keys()) this.hasOwnProperty(i5) && (t3.set(i5, this[i5]), delete this[i5]);
    t3.size > 0 && (this._$Ep = t3);
  }
  createRenderRoot() {
    const t3 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t3, this.constructor.elementStyles), t3;
  }
  connectedCallback() {
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(true), this._$EO?.forEach((t3) => t3.hostConnected?.());
  }
  enableUpdating(t3) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t3) => t3.hostDisconnected?.());
  }
  attributeChangedCallback(t3, s4, i5) {
    this._$AK(t3, i5);
  }
  _$ET(t3, s4) {
    const i5 = this.constructor.elementProperties.get(t3), e5 = this.constructor._$Eu(t3, i5);
    if (void 0 !== e5 && true === i5.reflect) {
      const h3 = (void 0 !== i5.converter?.toAttribute ? i5.converter : u).toAttribute(s4, i5.type);
      this._$Em = t3, null == h3 ? this.removeAttribute(e5) : this.setAttribute(e5, h3), this._$Em = null;
    }
  }
  _$AK(t3, s4) {
    const i5 = this.constructor, e5 = i5._$Eh.get(t3);
    if (void 0 !== e5 && this._$Em !== e5) {
      const t4 = i5.getPropertyOptions(e5), h3 = "function" == typeof t4.converter ? { fromAttribute: t4.converter } : void 0 !== t4.converter?.fromAttribute ? t4.converter : u;
      this._$Em = e5;
      const r6 = h3.fromAttribute(s4, t4.type);
      this[e5] = r6 ?? this._$Ej?.get(e5) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t3, s4, i5, e5 = false, h3) {
    if (void 0 !== t3) {
      const r6 = this.constructor;
      if (false === e5 && (h3 = this[t3]), i5 ?? (i5 = r6.getPropertyOptions(t3)), !((i5.hasChanged ?? f)(h3, s4) || i5.useDefault && i5.reflect && h3 === this._$Ej?.get(t3) && !this.hasAttribute(r6._$Eu(t3, i5)))) return;
      this.C(t3, s4, i5);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t3, s4, { useDefault: i5, reflect: e5, wrapped: h3 }, r6) {
    i5 && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(t3) && (this._$Ej.set(t3, r6 ?? s4 ?? this[t3]), true !== h3 || void 0 !== r6) || (this._$AL.has(t3) || (this.hasUpdated || i5 || (s4 = void 0), this._$AL.set(t3, s4)), true === e5 && this._$Em !== t3 && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(t3));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t4) {
      Promise.reject(t4);
    }
    const t3 = this.scheduleUpdate();
    return null != t3 && await t3, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [t5, s5] of this._$Ep) this[t5] = s5;
        this._$Ep = void 0;
      }
      const t4 = this.constructor.elementProperties;
      if (t4.size > 0) for (const [s5, i5] of t4) {
        const { wrapped: t5 } = i5, e5 = this[s5];
        true !== t5 || this._$AL.has(s5) || void 0 === e5 || this.C(s5, void 0, i5, e5);
      }
    }
    let t3 = false;
    const s4 = this._$AL;
    try {
      t3 = this.shouldUpdate(s4), t3 ? (this.willUpdate(s4), this._$EO?.forEach((t4) => t4.hostUpdate?.()), this.update(s4)) : this._$EM();
    } catch (s5) {
      throw t3 = false, this._$EM(), s5;
    }
    t3 && this._$AE(s4);
  }
  willUpdate(t3) {
  }
  _$AE(t3) {
    this._$EO?.forEach((t4) => t4.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t3)), this.updated(t3);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t3) {
    return true;
  }
  update(t3) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((t4) => this._$ET(t4, this[t4]))), this._$EM();
  }
  updated(t3) {
  }
  firstUpdated(t3) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ?? (a.reactiveElementVersions = [])).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t3) => t3;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t3) => t3 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t3) => null === t3 || "object" != typeof t3 && "function" != typeof t3;
var u2 = Array.isArray;
var d2 = (t3) => u2(t3) || "function" == typeof t3?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t3) => (i5, ...s4) => ({ _$litType$: t3, strings: i5, values: s4 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t3, i5) {
  if (!u2(t3) || !t3.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i5) : i5;
}
var N = (t3, i5) => {
  const s4 = t3.length - 1, e5 = [];
  let n5, l3 = 2 === i5 ? "<svg>" : 3 === i5 ? "<math>" : "", c4 = v;
  for (let i6 = 0; i6 < s4; i6++) {
    const s5 = t3[i6];
    let a3, u3, d3 = -1, f3 = 0;
    for (; f3 < s5.length && (c4.lastIndex = f3, u3 = c4.exec(s5), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n5 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n5 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a3 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n5 = void 0);
    const x2 = c4 === p2 && t3[i6 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s5 + r3 : d3 >= 0 ? (e5.push(a3), s5.slice(0, d3) + h2 + s5.slice(d3) + o3 + x2) : s5 + o3 + (-2 === d3 ? i6 : x2);
  }
  return [V(t3, l3 + (t3[s4] || "<?>") + (2 === i5 ? "</svg>" : 3 === i5 ? "</math>" : "")), e5];
};
var S2 = class _S {
  constructor({ strings: t3, _$litType$: i5 }, e5) {
    let r6;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u3 = t3.length - 1, d3 = this.parts, [f3, v2] = N(t3, i5);
    if (this.el = _S.createElement(f3, e5), P.currentNode = this.el.content, 2 === i5 || 3 === i5) {
      const t4 = this.el.content.firstChild;
      t4.replaceWith(...t4.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u3; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t4 of r6.getAttributeNames()) if (t4.endsWith(h2)) {
          const i6 = v2[a3++], s4 = r6.getAttribute(t4).split(o3), e6 = /([.?@])?(.*)/.exec(i6);
          d3.push({ type: 1, index: l3, name: e6[2], strings: s4, ctor: "." === e6[1] ? I : "?" === e6[1] ? L : "@" === e6[1] ? z : H }), r6.removeAttribute(t4);
        } else t4.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t4));
        if (y2.test(r6.tagName)) {
          const t4 = r6.textContent.split(o3), i6 = t4.length - 1;
          if (i6 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s4 = 0; s4 < i6; s4++) r6.append(t4[s4], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r6.append(t4[i6], c3());
          }
        }
      } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t4 = -1;
        for (; -1 !== (t4 = r6.data.indexOf(o3, t4 + 1)); ) d3.push({ type: 7, index: l3 }), t4 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t3, i5) {
    const s4 = l2.createElement("template");
    return s4.innerHTML = t3, s4;
  }
};
function M(t3, i5, s4 = t3, e5) {
  if (i5 === E) return i5;
  let h3 = void 0 !== e5 ? s4._$Co?.[e5] : s4._$Cl;
  const o6 = a2(i5) ? void 0 : i5._$litDirective$;
  return h3?.constructor !== o6 && (h3?._$AO?.(false), void 0 === o6 ? h3 = void 0 : (h3 = new o6(t3), h3._$AT(t3, s4, e5)), void 0 !== e5 ? (s4._$Co ?? (s4._$Co = []))[e5] = h3 : s4._$Cl = h3), void 0 !== h3 && (i5 = M(t3, h3._$AS(t3, i5.values), h3, e5)), i5;
}
var R = class {
  constructor(t3, i5) {
    this._$AV = [], this._$AN = void 0, this._$AD = t3, this._$AM = i5;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t3) {
    const { el: { content: i5 }, parts: s4 } = this._$AD, e5 = (t3?.creationScope ?? l2).importNode(i5, true);
    P.currentNode = e5;
    let h3 = P.nextNode(), o6 = 0, n5 = 0, r6 = s4[0];
    for (; void 0 !== r6; ) {
      if (o6 === r6.index) {
        let i6;
        2 === r6.type ? i6 = new k(h3, h3.nextSibling, this, t3) : 1 === r6.type ? i6 = new r6.ctor(h3, r6.name, r6.strings, this, t3) : 6 === r6.type && (i6 = new Z(h3, this, t3)), this._$AV.push(i6), r6 = s4[++n5];
      }
      o6 !== r6?.index && (h3 = P.nextNode(), o6++);
    }
    return P.currentNode = l2, e5;
  }
  p(t3) {
    let i5 = 0;
    for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t3, s4, i5), i5 += s4.strings.length - 2) : s4._$AI(t3[i5])), i5++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t3, i5, s4, e5) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t3, this._$AB = i5, this._$AM = s4, this.options = e5, this._$Cv = e5?.isConnected ?? true;
  }
  get parentNode() {
    let t3 = this._$AA.parentNode;
    const i5 = this._$AM;
    return void 0 !== i5 && 11 === t3?.nodeType && (t3 = i5.parentNode), t3;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t3, i5 = this) {
    t3 = M(this, t3, i5), a2(t3) ? t3 === A || null == t3 || "" === t3 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t3 !== this._$AH && t3 !== E && this._(t3) : void 0 !== t3._$litType$ ? this.$(t3) : void 0 !== t3.nodeType ? this.T(t3) : d2(t3) ? this.k(t3) : this._(t3);
  }
  O(t3) {
    return this._$AA.parentNode.insertBefore(t3, this._$AB);
  }
  T(t3) {
    this._$AH !== t3 && (this._$AR(), this._$AH = this.O(t3));
  }
  _(t3) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t3 : this.T(l2.createTextNode(t3)), this._$AH = t3;
  }
  $(t3) {
    const { values: i5, _$litType$: s4 } = t3, e5 = "number" == typeof s4 ? this._$AC(t3) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
    if (this._$AH?._$AD === e5) this._$AH.p(i5);
    else {
      const t4 = new R(e5, this), s5 = t4.u(this.options);
      t4.p(i5), this.T(s5), this._$AH = t4;
    }
  }
  _$AC(t3) {
    let i5 = C.get(t3.strings);
    return void 0 === i5 && C.set(t3.strings, i5 = new S2(t3)), i5;
  }
  k(t3) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i5 = this._$AH;
    let s4, e5 = 0;
    for (const h3 of t3) e5 === i5.length ? i5.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i5[e5], s4._$AI(h3), e5++;
    e5 < i5.length && (this._$AR(s4 && s4._$AB.nextSibling, e5), i5.length = e5);
  }
  _$AR(t3 = this._$AA.nextSibling, s4) {
    for (this._$AP?.(false, true, s4); t3 !== this._$AB; ) {
      const s5 = i3(t3).nextSibling;
      i3(t3).remove(), t3 = s5;
    }
  }
  setConnected(t3) {
    void 0 === this._$AM && (this._$Cv = t3, this._$AP?.(t3));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t3, i5, s4, e5, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t3, this.name = i5, this._$AM = e5, this.options = h3, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
  }
  _$AI(t3, i5 = this, s4, e5) {
    const h3 = this.strings;
    let o6 = false;
    if (void 0 === h3) t3 = M(this, t3, i5, 0), o6 = !a2(t3) || t3 !== this._$AH && t3 !== E, o6 && (this._$AH = t3);
    else {
      const e6 = t3;
      let n5, r6;
      for (t3 = h3[0], n5 = 0; n5 < h3.length - 1; n5++) r6 = M(this, e6[s4 + n5], i5, n5), r6 === E && (r6 = this._$AH[n5]), o6 || (o6 = !a2(r6) || r6 !== this._$AH[n5]), r6 === A ? t3 = A : t3 !== A && (t3 += (r6 ?? "") + h3[n5 + 1]), this._$AH[n5] = r6;
    }
    o6 && !e5 && this.j(t3);
  }
  j(t3) {
    t3 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t3 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t3) {
    this.element[this.name] = t3 === A ? void 0 : t3;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t3) {
    this.element.toggleAttribute(this.name, !!t3 && t3 !== A);
  }
};
var z = class extends H {
  constructor(t3, i5, s4, e5, h3) {
    super(t3, i5, s4, e5, h3), this.type = 5;
  }
  _$AI(t3, i5 = this) {
    if ((t3 = M(this, t3, i5, 0) ?? A) === E) return;
    const s4 = this._$AH, e5 = t3 === A && s4 !== A || t3.capture !== s4.capture || t3.once !== s4.once || t3.passive !== s4.passive, h3 = t3 !== A && (s4 === A || e5);
    e5 && this.element.removeEventListener(this.name, this, s4), h3 && this.element.addEventListener(this.name, this, t3), this._$AH = t3;
  }
  handleEvent(t3) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t3) : this._$AH.handleEvent(t3);
  }
};
var Z = class {
  constructor(t3, i5, s4) {
    this.element = t3, this.type = 6, this._$AN = void 0, this._$AM = i5, this.options = s4;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t3) {
    M(this, t3);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ?? (t2.litHtmlVersions = [])).push("3.3.3");
var D = (t3, i5, s4) => {
  const e5 = s4?.renderBefore ?? i5;
  let h3 = e5._$litPart$;
  if (void 0 === h3) {
    const t4 = s4?.renderBefore ?? null;
    e5._$litPart$ = h3 = new k(i5.insertBefore(c3(), t4), t4, void 0, s4 ?? {});
  }
  return h3._$AI(t3), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var _a;
    const t3 = super.createRenderRoot();
    return (_a = this.renderOptions).renderBefore ?? (_a.renderBefore = t3.firstChild), t3;
  }
  update(t3) {
    const r6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t3), this._$Do = D(r6, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i4 });
(s3.litElementVersions ?? (s3.litElementVersions = [])).push("4.2.2");

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t3 = o5, e5, r6) => {
  const { kind: n5, metadata: i5 } = r6;
  let s4 = globalThis.litPropertyMetadata.get(i5);
  if (void 0 === s4 && globalThis.litPropertyMetadata.set(i5, s4 = /* @__PURE__ */ new Map()), "setter" === n5 && ((t3 = Object.create(t3)).wrapped = true), s4.set(r6.name, t3), "accessor" === n5) {
    const { name: o6 } = r6;
    return { set(r7) {
      const n6 = e5.get.call(this);
      e5.set.call(this, r7), this.requestUpdate(o6, n6, t3, true, r7);
    }, init(e6) {
      return void 0 !== e6 && this.C(o6, void 0, t3, e6), e6;
    } };
  }
  if ("setter" === n5) {
    const { name: o6 } = r6;
    return function(r7) {
      const n6 = this[o6];
      e5.call(this, r7), this.requestUpdate(o6, n6, t3, true, r7);
    };
  }
  throw Error("Unsupported decorator location: " + n5);
};
function n4(t3) {
  return (e5, o6) => "object" == typeof o6 ? r4(t3, e5, o6) : ((t4, e6, o7) => {
    const r6 = e6.hasOwnProperty(o7);
    return e6.constructor.createProperty(o7, t4), r6 ? Object.getOwnPropertyDescriptor(e6, o7) : void 0;
  })(t3, e5, o6);
}

// node_modules/@lit/reactive-element/decorators/state.js
function r5(r6) {
  return n4({ ...r6, state: true, attribute: false });
}

// src/data.ts
var DAY_MS = 864e5;
var WINTER_STARTS = 7;
function addDays(day, days) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}
function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}
function today(hass, now = /* @__PURE__ */ new Date()) {
  const zone = hass?.locale?.time_zone === "server" ? hass.config?.time_zone : void 0;
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
function averageOn(average, day, back = 0) {
  for (let offset = 0; offset <= back; offset++) {
    const value = average[addDays(day, -offset).slice(5)];
    if (value !== void 0) {
      return value;
    }
  }
  return void 0;
}
var JOINED_GAP = 31;
function averageLine(data, from, to) {
  const days = [];
  for (let day = addDays(from, -JOINED_GAP); day <= addDays(to, JOINED_GAP); day = addDays(day, 1)) {
    days.push([day, averageOn(data.average, day, data.average_back)]);
  }
  let previous = -1;
  for (let index = 0; index < days.length; index++) {
    if (days[index][1] === void 0) {
      continue;
    }
    if (previous >= 0 && index - previous > 1 && index - previous <= JOINED_GAP + 1) {
      const start = days[previous][1];
      const end = days[index][1];
      for (let between = previous + 1; between < index; between++) {
        days[between][1] = start + (end - start) * (between - previous) / (index - previous);
      }
    }
    previous = index;
  }
  return days.filter(([day]) => day >= from && day <= to);
}
function currentPoint(data, day) {
  const last = data.points.at(-1);
  return last && daysBetween(last[0], day) <= data.window ? last : void 0;
}
function difference(data, point) {
  const average = averageOn(data.average, point[0], data.average_back);
  return average === void 0 ? void 0 : point[1] - average;
}
function differenceIn(unit, value) {
  return unit === "m" ? { value: value * 100, unit: "cm" } : { value, unit };
}
function winterOf(day) {
  const year = Number(day.slice(0, 4));
  return Number(day.slice(5, 7)) >= WINTER_STARTS ? year : year - 1;
}
function inWinter(day, winter) {
  return winterOf(day) === winter;
}
function averageDay(event, winter) {
  if (event.average === null) {
    return void 0;
  }
  const year = event.season_start >= WINTER_STARTS ? winter : winter + 1;
  return addDays(`${year}-${String(event.season_start).padStart(2, "0")}-01`, event.average);
}
function bearingClass(thickness, limits) {
  if (thickness >= limits.car) {
    return "car";
  }
  if (thickness >= limits.snowmobile) {
    return "snowmobile";
  }
  return thickness >= limits.walking ? "walking" : "does_not_bear";
}
function iceOn(data, day) {
  const measurement = data.measurements.filter((m2) => m2.day <= day).at(-1);
  if (!measurement || measurement.bearing === null || daysBetween(measurement.day, day) > data.window) {
    return void 0;
  }
  const age = daysBetween(measurement.day, day);
  return {
    measurement,
    age,
    old: age > data.max_age,
    bearing: measurement.bearing,
    bearingClass: bearingClass(measurement.bearing, data.limits)
  };
}
function winterBearings(data, winter) {
  return data.measurements.filter((m2) => m2.bearing !== null && inWinter(m2.day, winter)).map((m2) => [m2.day, m2.bearing]);
}
function lastWinter(data, winter, day) {
  if (data.measurements.some((m2) => m2.day <= day && inWinter(m2.day, winter))) {
    return /* @__PURE__ */ new Map();
  }
  return new Map(data.measurements.filter((m2) => m2.bearing !== null && inWinter(m2.day, winter - 1)).map((m2) => [aYearOn(m2.day), m2]));
}
function aYearOn(day) {
  const moved = `${Number(day.slice(0, 4)) + 1}${day.slice(4)}`;
  return moved.endsWith("-02-29") ? moved.replace(/29$/, "28") : moved;
}
function eventIn(event, winter) {
  return event?.day && inWinter(event.day, winter) ? event.day : void 0;
}
function lastMeasured(data) {
  return data.kind === "measurement" ? data.points.at(-1)?.[0] : data.measurements.at(-1)?.day;
}
function ticks(low, high, count) {
  const raw = (high - low) / Math.max(count - 1, 1) || Math.abs(high) || 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step2 = ([1, 2, 5, 10].find((nice) => nice * magnitude >= raw - 1e-12) ?? 10) * magnitude;
  const first = Number((Math.floor(low / step2 + 1e-9) * step2).toFixed(10));
  const last = Number((Math.ceil(high / step2 - 1e-9) * step2).toFixed(10));
  const values = [];
  for (let value = first; value <= last + step2 / 2; value += step2) {
    values.push(Number(value.toFixed(10)) || 0);
  }
  const decimals = Math.max(0, -Math.floor(Math.log10(step2) + 1e-9));
  return { values, decimals, low: first, high: last };
}

// src/charts.ts
function dayAt(frame, x2) {
  const share = Math.min(1, Math.max(0, (x2 - frame.left) / (frame.right - frame.left || 1)));
  return addDays(frame.from, Math.round(share * frame.days));
}
function xOf(frame, day) {
  return frame.left + daysBetween(frame.from, day) / frame.days * (frame.right - frame.left);
}
var DAYS_BACK = 90;
var DAYS_AHEAD = 60;
var SPARK_DAYS = 30;
var CLASS_COLORS = {
  does_not_bear: "var(--syke-does-not-bear-color, var(--error-color, #db4437))",
  walking: "var(--syke-walking-color, var(--amber-color, #ffc107))",
  snowmobile: "var(--syke-snowmobile-color, var(--cyan-color, #00bcd4))",
  car: "var(--syke-car-color, var(--success-color, #43a047))"
};
var TOP = 16;
var BOTTOM = 18;
var CHAR = 6.2;
function path(points) {
  let drawn = "";
  let open = false;
  for (const [x2, y3] of points) {
    if (y3 === void 0) {
      open = false;
      continue;
    }
    drawn += `${open ? "L" : "M"}${x2.toFixed(1)},${y3.toFixed(1)}`;
    open = true;
  }
  return drawn;
}
function monthStarts(from, to) {
  const days = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    if (day.endsWith("-01")) {
      days.push(day);
    }
  }
  return days;
}
function labelRoom(labels) {
  return Math.ceil(Math.max(...labels.map((label) => label.length), 1) * CHAR) + 8;
}
function todayLine(x2, height, text) {
  return w`<line class="today" x1=${x2} x2=${x2} y1=${TOP} y2=${height - BOTTOM}></line>
        <text class="today-label" x=${x2} y=${TOP - 4} text-anchor="middle">${text}</text>`;
}
function averageChart(data, today2, width, height, f3) {
  const from = addDays(today2, -DAYS_BACK);
  const to = addDays(today2, DAYS_AHEAD);
  const measured = data.points.filter(([day]) => day >= from && day <= today2);
  const average = averageLine(data, from, to);
  const values = [...measured.map(([, value]) => value), ...average.flatMap(([, value]) => value === void 0 ? [] : [value])];
  const axis = ticks(Math.min(...values), Math.max(...values), 4);
  const { low, high } = axis;
  const labels = axis.values.map((value) => f3.number(value, axis.decimals));
  const left = labelRoom(labels);
  const frame = { from, days: DAYS_BACK + DAYS_AHEAD, left, right: width - 4 };
  const x2 = (day) => xOf(frame, day);
  const y3 = (value) => TOP + (1 - (value - low) / (high - low)) * (height - TOP - BOTTOM);
  const last = measured.at(-1);
  const chart = w`<svg class="chart" width=${width} height=${height} role="img">
        <rect class="future" x=${x2(today2)} y=${TOP} width=${x2(to) - x2(today2)} height=${height - TOP - BOTTOM}></rect>
        ${axis.values.map(
    (value, index) => w`<line class="grid" x1=${left} x2=${width - 4} y1=${y3(value)} y2=${y3(value)}></line>
                <text x=${left - 5} y=${y3(value) + 4} text-anchor="end">${labels[index]}</text>`
  )}
        ${monthStarts(from, to).map((day) => w`<text x=${x2(day)} y=${height - 4} text-anchor="middle">${f3.day(day)}</text>`)}
        <path class="average" d=${path(average.map(([day, value]) => [x2(day), value === void 0 ? void 0 : y3(value)]))}></path>
        <path class="measured" d=${path(measured.map(([day, value]) => [x2(day), y3(value)]))}></path>
        ${last ? w`<circle class="last" cx=${x2(last[0])} cy=${y3(last[1])} r="3.5"></circle>` : A}
        ${todayLine(x2(today2), height, f3.text("card.today"))}
    </svg>`;
  return { chart, frame };
}
function differenceChart(data, today2, width, height, f3) {
  const from = addDays(today2, -DAYS_BACK);
  const bars = [];
  for (const [day, value] of data.points) {
    const average = day >= from && day <= today2 ? averageOn(data.average, day, data.average_back) : void 0;
    if (average !== void 0) {
      bars.push([day, differenceIn(data.unit, value - average).value]);
    }
  }
  const values = bars.map(([, value]) => value);
  const top = Math.max(0, ...values);
  const bottom = Math.min(0, ...values);
  const pad = (top - bottom || 1) * 0.12;
  const high = top + (top > 0 ? pad : pad / 3);
  const low = bottom - (bottom < 0 ? pad : pad / 3);
  const decimals = top - bottom >= 3 ? 0 : 1;
  const marks = [.../* @__PURE__ */ new Set([0, ...bottom < 0 ? [bottom] : [], ...top > 0 ? [top] : []])];
  const labels = marks.map((value) => (value > 0 ? "+" : "") + f3.number(value, decimals));
  const left = labelRoom(labels);
  const frame = { from, days: DAYS_BACK, left, right: width - 4 };
  const x2 = (day) => xOf(frame, day);
  const y3 = (value) => TOP + (1 - (value - low) / (high - low)) * (height - TOP - BOTTOM);
  const bar = Math.max((width - left - 4) / DAYS_BACK * 0.8, 0.8);
  const chart = w`<svg class="chart" width=${width} height=${height} role="img">
        ${marks.map(
    (value, index) => w`<line class=${value === 0 ? "zero" : "grid"} x1=${left} x2=${width - 4} y1=${y3(value)} y2=${y3(value)}></line>
                <text x=${left - 5} y=${y3(value) + 4} text-anchor="end">${labels[index]}</text>`
  )}
        ${bars.map(
    ([day, value]) => w`<rect class=${value > 0 ? "bar-above" : "bar-below"} x=${x2(day) - bar / 2} width=${bar} y=${Math.min(y3(value), y3(0))} height=${Math.abs(y3(value) - y3(0))}></rect>`
  )}
        ${monthStarts(from, today2).map((day) => w`<text x=${x2(day)} y=${height - 4} text-anchor="middle">${f3.day(day)}</text>`)}
    </svg>`;
  return { chart, frame };
}
function sparkline(data, today2, height) {
  const from = addDays(today2, -SPARK_DAYS);
  const to = addDays(today2, SPARK_DAYS);
  const width = 200;
  const measured = data.points.filter(([day]) => day >= from && day <= today2);
  const average = averageLine(data, from, to);
  const values = [...measured.map(([, value]) => value), ...average.flatMap(([, value]) => value === void 0 ? [] : [value])];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const x2 = (day) => daysBetween(from, day) / (SPARK_DAYS * 2) * width;
  const y3 = (value) => 2 + (1 - (value - low) / (high - low || 1)) * (height - 4);
  return w`<svg class="spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" height=${height}>
        <path class="average" vector-effect="non-scaling-stroke" d=${path(average.map(([day, value]) => [x2(day), value === void 0 ? void 0 : y3(value)]))}></path>
        <path class="measured" vector-effect="non-scaling-stroke" d=${path(measured.map(([day, value]) => [x2(day), y3(value)]))}></path>
        <line class="today" vector-effect="non-scaling-stroke" x1=${x2(today2)} x2=${x2(today2)} y1="0" y2=${height}></line>
    </svg>`;
}
function winterSpan(winter) {
  return [`${winter}-11-01`, `${winter + 1}-05-15`];
}
var WINTER_LEFT = 44;
var ICE_MAX = 35;
function winterChart(data, today2, winter, width, height, f3) {
  const [from, to] = winterSpan(winter);
  const left = WINTER_LEFT;
  const days = daysBetween(from, to);
  const top = Math.max(ICE_MAX, ...data.measurements.map((m2) => m2.bearing ?? 0)) + 2;
  const frame = { from, days, left, right: width - 4 };
  const x2 = (day) => xOf(frame, day);
  const y3 = (value) => TOP + (1 - value / top) * (height - TOP - BOTTOM);
  let average = "";
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const value = averageOn(data.average, day);
    if (value !== void 0) {
      average += `${average ? "L" : "M"}${x2(day).toFixed(1)},${y3(value).toFixed(1)}`;
    }
  }
  const measured = winterBearings(data, winter).filter(([day]) => day <= today2);
  const ghost = [...lastWinter(data, winter, today2)].map(([day, m2]) => [day, m2.bearing]);
  const limits = ["walking", "snowmobile", "car"].map((limit) => ({ limit, y: y3(data.limits[limit]) }));
  const line = (day, kind, label = "") => day && day >= from && day <= to ? w`<line class=${kind} x1=${x2(day)} x2=${x2(day)} y1=${TOP} y2=${height - BOTTOM}></line>
                ${label ? w`<text class=${`${kind}-label`} x=${x2(day) + 3} y=${TOP + 9}>${label}</text>` : A}` : A;
  const freeze = data.events.freeze_up;
  const breakUp = data.events.break_up;
  const chart = w`<svg class="chart" width=${width} height=${height} role="img">
        ${limits.map(
    (mark) => w`<line class="limit" style=${`stroke: ${CLASS_COLORS[mark.limit]}`} x1=${left} x2=${width - 4} y1=${mark.y} y2=${mark.y}></line>
                <text x=${left - 4} y=${mark.y + 4} text-anchor="end">${data.limits[mark.limit]}</text>`
  )}
        ${monthStarts(from, to).map((day) => w`<text x=${x2(day)} y=${height - 4} text-anchor="middle">${f3.day(day)}</text>`)}
        ${average ? w`<path class="average-area" d=${`${average}L${x2(to)},${y3(0)}L${x2(from)},${y3(0)}Z`}></path><path class="average" d=${average}></path>` : A}
        ${ghost.length ? w`<path class="ghost" d=${path(ghost.map(([day, value]) => [x2(day), y3(value)]))}></path>` : A}
        ${measured.length ? w`<path class="measured" d=${path(measured.map(([day, value]) => [x2(day), y3(value)]))}></path>` : A}
        ${measured.map(
    ([day, value]) => w`<circle class="point" cx=${x2(day)} cy=${y3(value)} r="3.5" style=${`fill: ${CLASS_COLORS[bearingClass(value, data.limits)]}`}></circle>`
  )}
        ${freeze ? line(averageDay(freeze, winter), "freeze-average", f3.text("card.average_short")) : A}
        ${breakUp ? line(averageDay(breakUp, winter), "thaw-average", f3.text("card.average_short")) : A}
        ${line(eventIn(freeze, winter), "freeze")}
        ${line(eventIn(breakUp, winter), "thaw")}
        ${today2 >= from && today2 <= to ? todayLine(x2(today2), height, f3.text("card.today")) : A}
    </svg>`;
  return { chart, frame, limits };
}
var GAUGE_MAX = 35;
function gauge(now, data, average, width, f3) {
  const max = Math.max(GAUGE_MAX, now.bearing + 3);
  const x2 = (value) => Math.min(value, max) / max * width;
  const bar = 14;
  const zones = [
    [0, data.limits.walking, "does_not_bear"],
    [data.limits.walking, data.limits.snowmobile, "walking"],
    [data.limits.snowmobile, data.limits.car, "snowmobile"],
    [data.limits.car, max, "car"]
  ];
  const color = now.old ? "var(--syke-old-color, var(--warning-color, #ff9800))" : CLASS_COLORS[now.bearingClass];
  return w`<svg class="gauge" width=${width} height="46" role="img">
        ${zones.map(([a3, b3, kind]) => w`<rect class="zone" x=${x2(a3)} y=${bar} width=${Math.max(x2(b3) - x2(a3) - 1, 0)} height="12" rx="2" style=${`fill: ${CLASS_COLORS[kind]}`}></rect>`)}
        ${[data.limits.walking, data.limits.snowmobile, data.limits.car].map((v2) => w`<text x=${x2(v2)} y=${bar + 26} text-anchor="middle">${v2}</text>`)}
        <text x="0" y=${bar + 26}>0</text><text x=${width} y=${bar + 26} text-anchor="end">cm</text>
        ${average !== void 0 && average >= 0.5 ? w`<line class="gauge-average" x1=${x2(average)} x2=${x2(average)} y1=${bar - 4} y2=${bar + 16}></line>
                    <text class="gauge-average-label" x=${x2(average)} y=${bar - 6} text-anchor="middle">${f3.text("card.average_short")} ${f3.number(average, 0)}</text>` : A}
        <rect x="0" y=${bar} width=${Math.max(x2(now.bearing), 3)} height="12" rx="2" style=${`fill: ${color}`}></rect>
        <text class="gauge-value" x=${Math.max(x2(now.bearing), 3) + 4} y=${bar + 10}>${f3.number(now.bearing, 0)}</text>
    </svg>`;
}

// src/const.ts
var CARD_VERSION = "1.1.0";

// src/localize/languages/en.json
var en_default = {
  common: {
    name: "SYKE hydrology",
    description: "A station's measurement against its long-term average, or the station's ice"
  },
  card: {
    today: "today",
    average_short: "avg.",
    measured: "measured {day}",
    legend_measured: "Measured",
    legend_average: "Avg. {years}",
    legend_average_plain: "Avg.",
    difference_axis: "Difference from the average, {unit}, 90 days",
    later: "Avg. {value} in {days} days",
    at_average: "at the average",
    above: "{value} above avg.",
    below: "{value} below avg.",
    change: "Avg. {value} in {days} days"
  },
  ice: {
    title: "Ice",
    winter: "Ice \xB7 winter {winter}",
    dates_only: "Freeze-up and break-up",
    no_ice: "No ice",
    last: "Ice last measured {day}",
    never: "No ice measurements",
    class: {
      does_not_bear: "Doesn't bear",
      walking: "Bears a person walking",
      snowmobile: "Bears a snowmobile",
      car: "Bears a car"
    },
    bearing: "{value} cm of bearing ice",
    weak: "Weak ice, too weak to measure",
    weak_short: "weak ice",
    days_ago: "{days} days ago",
    measured_today: "today",
    total: "ice {value} cm",
    snow_on_ice: "Snow {value} cm",
    snow_ice: "Snow ice {value}",
    clear_ice: "Clear ice {value}",
    total_long: "Ice in all {value} cm",
    old: "The measurement is over {days} days old. The ice may have weakened since.",
    legend_bearing: "Bearing",
    legend_thawed: "Thawed",
    froze: "Froze",
    freezes: "Freezes",
    thawed: "Ice went",
    thaws: "Ice goes",
    last_winter: "Last winter",
    on_average_day: "on average {day}, {when}",
    in_days: "in {days} days",
    later_than_average: "{days} days later than on average",
    earlier_than_average: "{days} days earlier than on average",
    late: "{days} days late",
    early: "{days} days early",
    last_winter_froze: "froze {day}",
    last_winter_thawed: "ice went {day}",
    freezes_short: "freezes avg. {day}"
  },
  error: {
    invalid_configuration: "Choose a sensor of SYKE hydrology",
    invalid_chart: "The chart is average or difference",
    invalid_height: "The height mode is auto, fixed or max, and the heights are in pixels",
    invalid_row_step: "The row step is full or half",
    entity_not_found: "Sensor {entity} was not found",
    not_supported: "The card doesn't draw {entity}",
    fetch_failed: "Couldn't get the data. Trying again in a minute."
  },
  editor: {
    entity: "Sensor",
    entity_helper: "A measurement's sensor or its average, or any of the station's ice sensors",
    chart: "Chart",
    chart_helper: "Not used for the ice, which is always drawn as the winter",
    chart_average: "Against the average year",
    chart_difference: "Difference from the average",
    row_step: "Height rounding",
    row_step_helper: "On automatic rows the card rounds its height to whole or half rows",
    row_step_full: "Whole rows",
    row_step_half: "Half rows"
  },
  tooltip: {
    chart: "Chart. The arrow keys move the day, Escape closes.",
    measured: "Measured {value}",
    average: "Average {value}",
    difference: "Difference from the average {value}",
    bearing: "Bearing thickness {value} cm",
    average_bearing: "Average {value} cm",
    last_winter: "Last winter {day}"
  }
};

// src/localize/languages/fi.json
var fi_default = {
  common: {
    name: "SYKE-hydrologia",
    description: "Aseman mittaus pitk\xE4n aikav\xE4lin keskiarvoa vasten, tai aseman j\xE4\xE4tilanne"
  },
  card: {
    today: "t\xE4n\xE4\xE4n",
    average_short: "ka.",
    measured: "mitattu {day}",
    legend_measured: "Mitattu",
    legend_average: "Ka. {years}",
    legend_average_plain: "Ka.",
    difference_axis: "Ero keskiarvoon, {unit}, 90 vrk",
    later: "Ka. {value} {days} vrk:n p\xE4\xE4st\xE4",
    at_average: "keskiarvossa",
    above: "{value} yli ka.",
    below: "{value} alle ka.",
    change: "Ka. {value} {days} vrk:ssa"
  },
  ice: {
    title: "J\xE4\xE4",
    winter: "J\xE4\xE4 \xB7 talvi {winter}",
    dates_only: "J\xE4\xE4tyminen ja j\xE4\xE4nl\xE4ht\xF6",
    no_ice: "Ei j\xE4\xE4t\xE4",
    last: "J\xE4\xE4 mitattiin viimeksi {day}",
    never: "Ei j\xE4\xE4mittauksia",
    class: {
      does_not_bear: "Ei kanna",
      walking: "Kantaa jalankulkijan",
      snowmobile: "Kantaa moottorikelkan",
      car: "Kantaa auton"
    },
    bearing: "{value} cm kantavaa j\xE4\xE4t\xE4",
    weak: "Heikkoa j\xE4\xE4t\xE4, liian heikkoa mitattavaksi",
    weak_short: "heikkoa j\xE4\xE4t\xE4",
    days_ago: "{days} vrk sitten",
    measured_today: "t\xE4n\xE4\xE4n",
    total: "j\xE4\xE4 {value} cm",
    snow_on_ice: "Lunta {value} cm",
    snow_ice: "Kohvaa {value}",
    clear_ice: "Ter\xE4sj\xE4\xE4t\xE4 {value}",
    total_long: "J\xE4\xE4 yht. {value} cm",
    old: "Mittaus on yli {days} vrk vanha. J\xE4\xE4 on voinut heiket\xE4 sen j\xE4lkeen.",
    legend_bearing: "Kantavuus",
    legend_thawed: "Suli",
    froze: "J\xE4\xE4tyi",
    freezes: "J\xE4\xE4tyy",
    thawed: "J\xE4\xE4t l\xE4htiv\xE4t",
    thaws: "J\xE4\xE4t l\xE4htev\xE4t",
    last_winter: "Viime talvi",
    on_average_day: "keskim\xE4\xE4rin {day}, {when}",
    in_days: "{days} vrk p\xE4\xE4st\xE4",
    later_than_average: "{days} vrk keskim\xE4\xE4r\xE4ist\xE4 my\xF6hemmin",
    earlier_than_average: "{days} vrk keskim\xE4\xE4r\xE4ist\xE4 aiemmin",
    late: "{days} vrk my\xF6h\xE4ss\xE4",
    early: "{days} vrk etuajassa",
    last_winter_froze: "j\xE4\xE4tyi {day}",
    last_winter_thawed: "j\xE4\xE4t l\xE4htiv\xE4t {day}",
    freezes_short: "j\xE4\xE4tyy ka. {day}"
  },
  error: {
    invalid_configuration: "Valitse SYKE-hydrologian anturi",
    invalid_chart: "Kaavio on average tai difference",
    invalid_height: "Korkeus on auto, fixed tai max, ja korkeudet pikselein\xE4",
    invalid_row_step: "Rivien py\xF6ristys on full tai half",
    entity_not_found: "Anturia {entity} ei l\xF6ydy",
    not_supported: "Kortti ei piirr\xE4 anturia {entity}",
    fetch_failed: "Tietoja ei saatu. Yritet\xE4\xE4n uudelleen minuutin p\xE4\xE4st\xE4."
  },
  editor: {
    entity: "Anturi",
    entity_helper: "Mittauksen anturi tai sen keskiarvo, tai jokin aseman j\xE4\xE4antureista",
    chart: "Kaavio",
    chart_helper: "J\xE4\xE4t\xE4 ei piirret\xE4 n\xE4in, se on aina talven k\xE4yr\xE4",
    chart_average: "Keskiarvok\xE4yr\xE4",
    chart_difference: "Ero keskiarvoon",
    row_step: "Korkeuden py\xF6ristys",
    row_step_helper: "Automaattisilla riveill\xE4 kortti py\xF6rist\xE4\xE4 korkeutensa kokonaisiin tai puoliin riveihin",
    row_step_full: "Kokonaiset rivit",
    row_step_half: "Puolikkaat rivit"
  },
  tooltip: {
    chart: "Kaavio. Nuolin\xE4pp\xE4imet siirt\xE4v\xE4t p\xE4iv\xE4\xE4, Esc sulkee.",
    measured: "Mitattu {value}",
    average: "Keskiarvo {value}",
    difference: "Ero keskiarvoon {value}",
    bearing: "Kantava paksuus {value} cm",
    average_bearing: "Keskiarvo {value} cm",
    last_winter: "Viime talvi {day}"
  }
};

// src/localize/localize.ts
var FILES = { "./languages/en.json": en_default, "./languages/fi.json": fi_default };
var LANGUAGES = Object.fromEntries(
  Object.entries(FILES).map(([path2, table]) => [path2.replace(/^.*\/|\.json$/g, "").toLowerCase(), table])
);
var LANGUAGE_CODES = Object.keys(LANGUAGES).sort();
function translate(language, key) {
  const code = (language ?? "en").split(/[-_]/)[0].toLowerCase();
  return read(LANGUAGES[code], key) ?? read(LANGUAGES.en, key) ?? key;
}
function read(table, key) {
  let value = table;
  for (const part of key.split(".")) {
    if (value === null || typeof value !== "object") {
      return void 0;
    }
    value = value[part];
  }
  return typeof value === "string" ? value : void 0;
}
function browserLanguage() {
  return document.documentElement.lang || navigator.language || "en";
}

// src/height.ts
var HEIGHT_MODES = ["auto", "fixed", "max"];
var pixels = (value) => value == null || typeof value === "number" && Number.isFinite(value) && value > 0;
function validHeight(config) {
  return (config.height_mode == null || HEIGHT_MODES.includes(config.height_mode)) && pixels(config.height) && pixels(config.max_height);
}
function heightMode(config) {
  return config.height_mode ?? (config.height ? "fixed" : config.max_height ? "max" : "auto");
}
var ROW_HEIGHT = 56;
var ROW_GAP = 8;
function heightStyle(config, layout, minimum = 0) {
  const rows = config.grid_options ? config.grid_options.rows : config.layout_options?.grid_rows;
  if (layout === "grid" && typeof rows === "number") {
    return "height: 100%";
  }
  const mode = heightMode(config);
  if (mode === "fixed" && config.height) {
    return `height: ${Math.max(config.height, minimum)}px`;
  }
  return mode === "max" && config.max_height ? `max-height: ${Math.max(config.max_height, minimum)}px` : "";
}
function gridMinRows(minimum) {
  return Math.max(1, Math.ceil((minimum + ROW_GAP) / (ROW_HEIGHT + ROW_GAP)));
}
function heightCardSize(config, content, minimum = 0) {
  const mode = heightMode(config);
  if (mode === "fixed" && config.height) {
    return Math.max(1, Math.round(Math.max(config.height, minimum) / 50));
  }
  return mode === "max" && config.max_height ? Math.max(1, Math.min(content, Math.round(Math.max(config.max_height, minimum) / 50))) : content;
}

// src/rows.ts
var ROW_STEPS = ["full", "half"];
var ROW_PX = 64;
var ROW_GAP_PX = 8;
function validRowStep(config) {
  return config.row_step === void 0 || config.row_step === null || ROW_STEPS.includes(config.row_step);
}
var step = (config) => config.row_step === "half" ? ROW_PX / 2 : ROW_PX;
var SLACK_PX = 0.01;
function drawnScale(card) {
  const layout = Number.parseFloat(getComputedStyle(card).width) || 0;
  const drawn = card.getBoundingClientRect().width;
  return layout > 0 && drawn > 0 ? drawn / layout : 1;
}
function filledHeight(content, config, limit = Infinity) {
  return Math.min(Math.max(1, Math.ceil((content - SLACK_PX + ROW_GAP_PX) / step(config))) * step(config) - ROW_GAP_PX, limit);
}
function spareRoom(filled, content) {
  return Math.max(0, Math.floor(filled - content + SLACK_PX));
}
function fillLimit(config, layout, minimum = 0) {
  const rows = config.grid_options ? config.grid_options.rows : config.layout_options?.grid_rows;
  if (layout !== "grid" || typeof rows === "number") {
    return 0;
  }
  const mode = heightMode(config);
  if (mode === "fixed" && config.height) {
    return 0;
  }
  if (mode !== "max" || !config.max_height) {
    return Infinity;
  }
  const down = Math.floor((config.max_height + ROW_GAP_PX) / step(config)) * step(config) - ROW_GAP_PX;
  return Math.max(down, filledHeight(minimum, config));
}
function filledStyle(config, layout, minimum, filled) {
  const limit = fillLimit(config, layout, minimum);
  if (!limit) {
    return heightStyle(config, layout, minimum);
  }
  return [limit < Infinity && `max-height: ${limit}px`, filled && `min-height: ${filled}px`].filter(Boolean).join("; ");
}
function rowStepSchema(config, text) {
  if (heightMode(config) === "fixed" && config.height) {
    return [];
  }
  return [
    {
      name: "row_step",
      selector: {
        select: { mode: "dropdown", options: ROW_STEPS.map((value) => ({ value, label: text(`editor.row_step_${value}`) })) }
      }
    }
  ];
}
function rowStepData(config) {
  return { ...config, row_step: config.row_step ?? "full" };
}
function tidyRowStep(config) {
  const tidied = { ...config };
  if (tidied.row_step !== "half" || heightMode(tidied) === "fixed" && tidied.height) {
    delete tidied.row_step;
  }
  return tidied;
}

// src/editor.ts
var FIRST = ["water_level", "discharge", "surface_temperature", "ice_bearing_class"];
function cardEntities(hass) {
  const ours = Object.values(hass.entities ?? {}).filter(
    (entry) => entry?.platform === "syke_hydrology" && entry.entity_id.startsWith("sensor.") && hass.states[entry.entity_id]
  );
  const rank = (key) => {
    const index = FIRST.indexOf(key ?? "");
    return index === -1 ? FIRST.length : index;
  };
  return ours.filter((entry) => !entry?.translation_key?.endsWith("_average")).sort((a3, b3) => rank(a3?.translation_key) - rank(b3?.translation_key)).map((entry) => entry?.entity_id ?? "");
}
function schema(config, text) {
  return [
    { name: "entity", required: true, selector: { entity: { filter: [{ integration: "syke_hydrology" }] } } },
    {
      name: "chart",
      selector: {
        select: {
          mode: "dropdown",
          options: ["average", "difference"].map((value) => ({ value, label: text(`editor.chart_${value}`) }))
        }
      }
    },
    ...rowStepSchema(config, text)
  ];
}
var SykeHydrologyCardEditor = class extends i4 {
  constructor() {
    super(...arguments);
    this.config = { type: "custom:syke-hydrology-card", entity: "" };
  }
  setConfig(config) {
    this.config = { ...config };
  }
  render() {
    if (!this.hass) {
      return A;
    }
    return b2`
            <ha-form
                .hass=${this.hass}
                .data=${{ chart: "average", ...rowStepData(this.config) }}
                .schema=${schema(this.config, (key) => this.text(key))}
                .computeLabel=${(entry) => this.text(`editor.${entry.name}`)}
                .computeHelper=${(entry) => this.helper(entry.name)}
                @value-changed=${this.valueChanged}
            ></ha-form>
        `;
  }
  valueChanged(event) {
    const config = tidyRowStep(event.detail.value);
    if (config.chart === "average" || config.chart == null) {
      delete config.chart;
    }
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
  text(key) {
    return translate(this.language(), key);
  }
  helper(name) {
    const key = `editor.${name}_helper`;
    const helper = translate(this.language(), key);
    return helper === key ? void 0 : helper;
  }
  language() {
    return this.hass?.locale?.language ?? this.hass?.language ?? browserLanguage();
  }
};
__decorateClass([
  n4({ attribute: false })
], SykeHydrologyCardEditor.prototype, "hass", 2);
__decorateClass([
  r5()
], SykeHydrologyCardEditor.prototype, "config", 2);
if (!customElements.get("syke-hydrology-card-editor")) {
  customElements.define("syke-hydrology-card-editor", SykeHydrologyCardEditor);
}

// src/syke-hydrology-card.ts
var MEASUREMENT_CHART = 150;
var DIFFERENCE_CHART = 110;
var ICE_CHART = 135;
var MIN_CHART = 90;
var SPARK_CHART = 56;
var MIN_HEIGHT = 56;
var ICON_ROOM = 13;
var RETRY = 6e4;
var CHARTS = ["average", "difference"];
var CLASS_ICONS = {
  does_not_bear: "mdi:water-alert",
  walking: "mdi:walk",
  snowmobile: "mdi:snowmobile",
  car: "mdi:car"
};
var OLD_COLOR = "var(--syke-old)";
function numberLocale(hass, language) {
  switch (hass?.locale?.number_format) {
    case "comma_decimal":
      return ["en-US", "en"];
    case "decimal_comma":
      return ["de", "es", "it"];
    case "space_comma":
      return ["fr", "sv", "cs"];
    case "quote_decimal":
      return ["de-CH"];
    case "none":
      return "en-US";
    case "system":
      return void 0;
    default:
      return language;
  }
}
var SykeHydrologyCard = class extends i4 {
  constructor() {
    super(...arguments);
    this.form = 0;
    this.chartHeight = 0;
    this.width = 0;
    this.filled = 0;
    this.spare = 0;
    this.held = 0;
    this.resizes = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(() => this.measureSoon());
  }
  static getConfigElement() {
    return document.createElement("syke-hydrology-card-editor");
  }
  /** Offers the first measurement of the integration when the card is added from the picker. */
  static getStubConfig(hass) {
    return { entity: (hass ? cardEntities(hass)[0] : void 0) ?? "" };
  }
  setConfig(config) {
    const language = browserLanguage();
    if (!config?.entity || typeof config.entity !== "string") {
      throw new Error(translate(language, "error.invalid_configuration"));
    }
    if (config.chart != null && !CHARTS.includes(config.chart)) {
      throw new Error(translate(language, "error.invalid_chart"));
    }
    if (!validHeight(config)) {
      throw new Error(translate(language, "error.invalid_height"));
    }
    if (!validRowStep(config)) {
      throw new Error(translate(language, "error.invalid_row_step"));
    }
    if (config.entity !== this.config?.entity) {
      this.data = void 0;
      this.fetchedFor = void 0;
    }
    this.config = { ...config };
  }
  getCardSize() {
    return heightCardSize(this.config ?? {}, 5, MIN_HEIGHT);
  }
  getGridOptions() {
    return { columns: 12, rows: "auto", min_columns: 6, min_rows: gridMinRows(MIN_HEIGHT) };
  }
  connectedCallback() {
    super.connectedCallback();
    if (this.hass) {
      this.requestUpdate();
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizes?.disconnect();
    this.observed = void 0;
    cancelAnimationFrame(this.frame ?? 0);
    if (this.retry !== void 0) {
      window.clearTimeout(this.retry);
      this.retry = void 0;
      this.fetchedFor = void 0;
    }
  }
  shouldUpdate(changed) {
    if ([...changed.keys()].some((key) => key !== "hass") || !this.config) {
      return true;
    }
    const previous = changed.get("hass");
    return !previous || this.stationEntities().some((id) => previous.states[id] !== this.hass?.states[id]) || // A new day moves today's line and the measurements' ages, and is when the averages move on.
    this.today() !== this.drawnDay || // The registry names the sensor, and it can come in after the states. The frontend builds the function that
    // reads the name from it a moment later still, so a change of either is drawn.
    previous.entities !== this.hass?.entities || previous.formatEntityName !== this.hass?.formatEntityName || previous.locale !== this.hass?.locale || previous.language !== this.hass?.language;
  }
  render() {
    if (!this.hass || !this.config) {
      return A;
    }
    if (!this.hass.states[this.config.entity]) {
      return this.message(this.text("error.entity_not_found", { entity: this.config.entity }));
    }
    if (this.error) {
      return this.message(this.error);
    }
    if (!this.data) {
      return b2`<ha-card style=${this.cardStyle()}><div class="card"></div></ha-card>`;
    }
    const forms = this.forms(this.data);
    const form = forms[Math.min(this.form, forms.length - 1)];
    const chart = this.chartHeight || form.chart || MIN_CHART;
    const held = this.isHeld();
    return b2`
            <ha-card class=${[held ? "held" : "", form.header ? "" : "centred"].join(" ")} style=${this.cardStyle()}>
                <div class="card ${form.row ? "row-card" : ""}">${this.width ? form.render(chart) : A}</div>
            </ha-card>
            <div class="measurer" aria-hidden="true"></div>
        `;
  }
  updated(changed) {
    this.drawnDay = this.today();
    void this.fetch();
    const card = this.renderRoot.querySelector("ha-card");
    if (card && card !== this.observed) {
      this.resizes?.disconnect();
      this.resizes?.observe(card);
      this.observed = card;
    }
    if (![...changed.keys()].every((key) => ["filled", "spare", "chartHeight", "held", "pointed"].includes(String(key)))) {
      this.measureSoon();
    }
  }
  async fetch() {
    const hass = this.hass;
    const entity = this.config?.entity;
    const state = entity ? hass?.states[entity] : void 0;
    if (!hass?.callWS || !entity || !state || this.retry !== void 0) {
      return;
    }
    const key = [entity, this.today(), ...this.stationEntities().map((id) => hass.states[id]?.last_updated ?? "")].join("|");
    if (key === this.fetchedFor) {
      return;
    }
    this.fetchedFor = key;
    try {
      const data = await hass.callWS({ type: "syke_hydrology/card", entity_id: entity });
      if (key === this.fetchedFor) {
        this.data = data;
        this.error = void 0;
      }
    } catch (error) {
      if (key !== this.fetchedFor) {
        return;
      }
      const code = error?.code;
      if (code === "not_supported" || code === "not_found") {
        this.error = this.text("error.not_supported", { entity });
        return;
      }
      this.error = this.text("error.fetch_failed");
      this.retry = window.setTimeout(() => {
        this.retry = void 0;
        this.fetchedFor = void 0;
        this.error = void 0;
      }, RETRY);
    }
  }
  /** The card's sensor and the other sensors of its station, found through its device in the registry. */
  stationEntities() {
    const entity = this.config?.entity ?? "";
    const device = this.hass?.entities?.[entity]?.device_id;
    if (!device) {
      return [entity];
    }
    return [
      entity,
      ...Object.values(this.hass?.entities ?? {}).flatMap(
        (entry) => entry && entry.device_id === device && entry.entity_id !== entity ? [entry.entity_id] : []
      )
    ];
  }
  measureSoon() {
    cancelAnimationFrame(this.frame ?? 0);
    this.frame = requestAnimationFrame(() => this.measure());
  }
  /**
   * The content's width, then the form: on automatic rows the richest, filling whole rows with its chart, and held to
   * a height the richest that fits it with its chart at least 90 px, the chart taking what is left.
   */
  measure() {
    const card = this.renderRoot.querySelector("ha-card");
    const inner = card?.querySelector(":scope > .card");
    if (!card || !inner || !card.clientWidth || !this.data || !this.config) {
      return;
    }
    const style = getComputedStyle(inner);
    const width = Math.floor(inner.clientWidth - px(style.paddingLeft) - px(style.paddingRight));
    if (width !== this.width) {
      this.width = width;
      return;
    }
    const forms = this.forms(this.data);
    const room = this.room(card, forms);
    if (room === void 0) {
      this.form = 0;
      this.held = 0;
      this.fillRows(card, inner, forms[0]);
      return;
    }
    this.filled = 0;
    this.spare = 0;
    const chrome = px(getComputedStyle(card).borderTopWidth) + px(getComputedStyle(card).borderBottomWidth);
    let chosen = forms.length - 1;
    let chart = 0;
    for (const [index, form] of forms.entries()) {
      const least = form.least ?? MIN_CHART;
      const needed = this.measureForm(form, form.chart ? least : 0, card.clientWidth) + chrome;
      if (needed <= room + 0.01) {
        chosen = index;
        chart = form.chart ? least + Math.floor(room - needed) : 0;
        break;
      }
    }
    this.form = chosen;
    this.chartHeight = chart;
  }
  /**
   * The height the card is held to, or undefined on automatic rows. A card growing up to a limit is held only once its
   * richest form wouldn't fit under it.
   */
  room(card, forms) {
    const config = this.config ?? {};
    const mode = heightMode(config);
    if (mode === "max" && config.max_height && heightStyle(config, this.layout, MIN_HEIGHT).startsWith("max-height")) {
      const limit = Math.max(config.max_height, MIN_HEIGHT);
      const chrome = px(getComputedStyle(card).borderTopWidth) + px(getComputedStyle(card).borderBottomWidth);
      const richest = this.measureForm(forms[0], forms[0].chart ?? 0, card.clientWidth, false) + chrome;
      if (richest <= limit) {
        this.held = 0;
        return void 0;
      }
      this.held = limit;
      return limit;
    }
    if (!heightStyle(config, this.layout, MIN_HEIGHT)) {
      return void 0;
    }
    return card.offsetHeight;
  }
  /**
   * A form's height at the card's width, drawn in a hidden copy so the card itself never changes size to be measured.
   * Held, its texts keep to one line, as the card's do.
   */
  measureForm(form, chart, width, held = true) {
    const measurer = this.renderRoot.querySelector(".measurer");
    if (!measurer) {
      return 0;
    }
    measurer.style.width = `${width}px`;
    D(
      b2`<div class=${held ? "held" : ""}>
                <div class="card ${form.row ? "row-card" : ""} measured-copy">${form.render(chart)}</div>
            </div>`,
      measurer
    );
    const height = measurer.querySelector(".measured-copy")?.getBoundingClientRect().height ?? 0;
    D(A, measurer);
    const card = this.renderRoot.querySelector("ha-card");
    return height / (card ? drawnScale(card) : 1);
  }
  /**
   * On automatic rows in a sections view, the card takes the whole rows its content needs, or the half rows with
   * `row_step: half`, up to the limit of a card that grows up to one. The chart takes the room left over.
   */
  fillRows(card, inner, form) {
    const limit = fillLimit(this.config ?? {}, this.layout, MIN_HEIGHT);
    if (!limit) {
      this.filled = 0;
      this.spare = 0;
      this.chartHeight = form.chart ?? 0;
      return;
    }
    const last = inner.lastElementChild;
    if (!last) {
      return;
    }
    const content = (last.getBoundingClientRect().bottom - card.getBoundingClientRect().top) / drawnScale(card) + px(getComputedStyle(inner).paddingBottom) + px(getComputedStyle(card).borderBottomWidth) - Math.max(0, this.chartHeight - (form.chart ?? 0));
    const filled = filledHeight(content, this.config ?? {}, limit);
    this.filled = filled;
    this.spare = spareRoom(filled, content);
    this.chartHeight = (form.chart ?? 0) + (form.chart ? this.spare : 0);
  }
  /** Whether the card is held to a height, so its texts keep to one line. */
  isHeld() {
    return this.held > 0 || heightStyle(this.config ?? {}, this.layout, MIN_HEIGHT) !== "" && !this.growsToLimit();
  }
  /** A card with `height_mode: max` is held only once its content passes the limit. */
  growsToLimit() {
    return heightMode(this.config ?? {}) === "max" && heightStyle(this.config ?? {}, this.layout, MIN_HEIGHT).startsWith("max-height");
  }
  cardStyle() {
    if (this.held) {
      return `height: ${this.held}px`;
    }
    return filledStyle(this.config ?? {}, this.layout, MIN_HEIGHT, this.filled);
  }
  // ---- The forms ----
  forms(data) {
    return data.kind === "measurement" ? this.measurementForms(data) : this.iceForms(data);
  }
  measurementForms(data) {
    const difference2 = this.config?.chart === "difference";
    const draw = (height) => this.chartRoom(
      difference2 ? differenceChart(data, this.today(), this.width, height, this.formats()) : averageChart(data, this.today(), this.width, height, this.formats()),
      (day) => this.measurementTip(data, day)
    );
    const chart = difference2 ? DIFFERENCE_CHART : MEASUREMENT_CHART;
    return [
      {
        header: true,
        chart,
        render: (height) => b2`${this.measurementHeader(data)} ${draw(height)} ${this.measurementFoot(data, difference2)}`
      },
      {
        header: true,
        chart,
        render: (height) => b2`${this.measurementHeader(data)} ${draw(height)}`
      },
      // Two rows: the row with the past and coming weeks under it, as wide as the card.
      {
        header: true,
        row: true,
        chart: SPARK_CHART,
        least: SPARK_CHART,
        render: (height) => b2`${this.measurementRow(data)}
                        <div class="spark-room">${sparkline(data, this.today(), height)}</div>`
      },
      { header: false, row: true, render: () => this.measurementRow(data) }
    ];
  }
  iceForms(data) {
    const day = this.today();
    const now = iceOn(data, day);
    const winter = winterOf(day);
    const gaugePart = now ? b2`<div class="gauge-room">${gauge(now, data, averageOn(data.average, day), this.width, this.formats())}</div>` : A;
    return [
      {
        header: true,
        chart: ICE_CHART,
        render: (height) => b2`${this.iceHeader(data, now, winter)} ${this.iceChart(data, winter, height)} ${this.iceLegend(data, winter)}
                    ${this.oldLine(data, now)} ${this.seasonRows(data, winter)}`
      },
      {
        header: true,
        chart: ICE_CHART,
        render: (height) => b2`${this.iceHeader(data, now, winter)} ${this.iceChart(data, winter, height)} ${this.iceLegend(data, winter)}
                    ${this.oldLine(data, now)}`
      },
      {
        header: false,
        render: () => b2`${this.iceTop(data, now)} ${gaugePart} ${this.layers(now)} ${this.oldLine(data, now)}
                    ${this.seasonRows(data, winter)}`
      },
      { header: false, render: () => b2`${this.iceTop(data, now)} ${gaugePart} ${this.layers(now)} ${this.oldLine(data, now)}` },
      { header: false, render: () => b2`${this.iceTop(data, now)} ${gaugePart} ${this.oldLine(data, now)}` },
      { header: false, render: () => this.iceTop(data, now) },
      { header: false, row: true, render: () => this.iceRow(data, now, winter) }
    ];
  }
  // ---- A measurement ----
  measurementName(data) {
    const state = data.entity_id ? this.hass?.states[data.entity_id] : void 0;
    if (!state) {
      return data.measurement;
    }
    return this.hass?.formatEntityName?.(state, [{ type: "entity" }]) || String(state.attributes.friendly_name ?? data.measurement);
  }
  /** The decimals the measurement's sensor is shown with. */
  decimals(data) {
    const entry = data.entity_id ? this.hass?.entities?.[data.entity_id] : void 0;
    if (typeof entry?.display_precision === "number") {
      return entry.display_precision;
    }
    return data.unit === "m" ? 2 : data.unit === "cm" || data.unit === "mm" ? 0 : 1;
  }
  /** The newest value's difference from its average, short, so the header keeps to one line whenever it can. */
  differenceText(data) {
    const point = currentPoint(data, this.today());
    const value = point ? difference(data, point) : void 0;
    if (value === void 0) {
      return void 0;
    }
    const shown = differenceIn(data.unit, value);
    const decimals = shown.unit === "cm" || shown.unit === "mm" ? 0 : this.decimals(data);
    const rounded = Number(shown.value.toFixed(decimals));
    if (rounded === 0) {
      return this.text("card.at_average");
    }
    const amount = `${this.number(Math.abs(rounded), decimals)} ${shown.unit ?? ""}`.trim();
    return this.text(rounded > 0 ? "card.above" : "card.below", { value: amount });
  }
  measurementHeader(data) {
    const day = this.today();
    const point = currentPoint(data, day);
    const last = lastMeasured(data);
    const sub = point ? this.text("card.measured", { day: this.day(point[0]) }) : last ? this.text("card.measured", { day: this.day(last, true) }) : "";
    const delta = this.differenceText(data);
    return b2`<div class="header">
            <div class="titles">
                <div class="name one-line" title=${this.measurementName(data)}>${this.measurementName(data)}</div>
                <div class="sub one-line">${[data.station, sub].filter(Boolean).join(" \xB7 ")}</div>
            </div>
            ${point ? b2`<div class="value">
                          <div class="number">
                              ${this.number(point[1], this.decimals(data))} <span class="unit">${data.unit ?? ""}</span>
                          </div>
                          ${delta ? b2`<span class="chip ${(difference(data, point) ?? 0) > 0 ? "above" : ""}">${delta}</span>` : A}
                      </div>` : A}
        </div>`;
  }
  aheadText(data) {
    const day = this.today();
    const now = averageOn(data.average, day, data.average_back);
    let ahead = 60;
    while (ahead >= 14 && averageOn(data.average, addDays(day, ahead), data.average_back) === void 0) {
      ahead -= 1;
    }
    const later = averageOn(data.average, addDays(day, ahead), data.average_back);
    if (later === void 0 || ahead < 14) {
      return "";
    }
    if (now === void 0) {
      return this.text("card.later", {
        value: `${this.number(later, this.decimals(data))} ${data.unit ?? ""}`.trim(),
        days: String(ahead)
      });
    }
    const change = differenceIn(data.unit, later - now);
    const decimals = change.unit === "cm" || change.unit === "mm" ? 0 : this.decimals(data);
    const rounded = Number(change.value.toFixed(decimals));
    const sign = rounded > 0 ? "+" : rounded === 0 ? "\xB1" : "";
    const value = `${sign}${this.number(rounded, decimals)} ${change.unit ?? ""}`.trim();
    return this.text("card.change", { value, days: String(ahead) });
  }
  measurementFoot(data, difference2) {
    const ahead = this.aheadText(data);
    if (difference2) {
      const unit = differenceIn(data.unit, 0).unit ?? "";
      return b2`<div class="foot">
                <span>${this.text("card.difference_axis", { unit })}</span><span class="ahead">${ahead}</span>
            </div>`;
    }
    return b2`<div class="foot">
            <span class="legend"><i class="line measured"></i>${this.text("card.legend_measured")}</span>
            <span class="legend"><i class="line average"></i>${this.averageLegend(data.years)}</span>
            <span class="ahead">${ahead}</span>
        </div>`;
  }
  measurementRow(data) {
    const point = currentPoint(data, this.today());
    const last = lastMeasured(data);
    const state = data.entity_id ? this.hass?.states[data.entity_id] : void 0;
    const delta = this.differenceText(data);
    return b2`<div class="row">
            <div class="row-icon"><ha-state-icon .hass=${this.hass} .stateObj=${state}></ha-state-icon></div>
            <div class="row-titles">
                <div class="one-line">${this.measurementName(data)}</div>
                <div class="one-line sub">${[data.station, last ? this.day(last, !point) : ""].filter(Boolean).join(" \xB7 ")}</div>
            </div>
            <div class="spacer"></div>
            ${point ? b2`<div class="row-value">
                          <div class="number">
                              ${this.number(point[1], this.decimals(data))} <span class="unit">${data.unit ?? ""}</span>
                          </div>
                          ${delta ? b2`<span class="chip ${(difference(data, point) ?? 0) > 0 ? "above" : ""}">${delta}</span>` : A}
                      </div>` : A}
        </div>`;
  }
  // ---- The ice ----
  winterName(winter) {
    return `${winter}\u2013${String(winter + 1).slice(2)}`;
  }
  classColor(now) {
    return now.old ? OLD_COLOR : CLASS_COLORS[now.bearingClass];
  }
  iceHeader(data, now, winter) {
    const title = data.measures_ice ? this.text("ice.winter", { winter: this.winterName(winter) }) : this.text("ice.dates_only");
    if (!now) {
      const last = data.measurements.at(-1)?.day;
      const sub = data.measures_ice ? last ? this.text("card.measured", { day: this.day(last, true) }) : this.text("ice.never") : "";
      return b2`<div class="header">
                <div class="titles">
                    <div class="name one-line">${title}</div>
                    <div class="sub one-line">${[data.station, sub].filter(Boolean).join(" \xB7 ")}</div>
                </div>
                ${data.measures_ice ? b2`<div class="value"><span class="chip neutral">${this.text("ice.no_ice")}</span></div>` : A}
            </div>`;
    }
    const m2 = now.measurement;
    const age = b2`<span class=${now.old ? "old" : ""}>${this.age(now.age)}</span>`;
    const total = now.measurement.weak ? this.text("ice.weak_short") : m2.total !== null ? this.text("ice.total", { value: this.number(m2.total, 0) }) : "";
    return b2`<div class="header">
            <div class="titles">
                <div class="name one-line">${title}</div>
                <div class="sub one-line">${data.station} · ${this.day(m2.day)}, ${age}${total ? ` \xB7 ${total}` : ""}</div>
            </div>
            <div class="value">
                <div class="number">${this.number(now.bearing, 0)} <span class="unit">cm</span></div>
                <span class="chip" style=${this.chipStyle(this.classColor(now))}
                    ><ha-icon .icon=${CLASS_ICONS[now.bearingClass]}></ha-icon>${this.text(`ice.class.${now.bearingClass}`)}</span
                >
            </div>
        </div>`;
  }
  iceChart(data, winter, height) {
    const drawn = winterChart(data, this.today(), winter, this.width, height, this.formats());
    const { limits } = drawn;
    const spaced = limits.every((mark, index) => index === 0 || Math.abs(mark.y - limits[index - 1].y) >= ICON_ROOM);
    const ghost = lastWinter(data, winter, this.today());
    const days = ghost.size ? [...ghost.keys()] : data.measurements.map((m2) => m2.day);
    return this.chartRoom(
      drawn,
      (day) => this.iceTip(data, day, ghost),
      b2`${spaced ? limits.map(
        (mark) => b2`<ha-icon
                                  class="limit-icon"
                                  .icon=${CLASS_ICONS[mark.limit]}
                                  style=${`top: ${mark.y - 6}px; left: ${WINTER_LEFT - 34}px; color: ${CLASS_COLORS[mark.limit]}`}
                              ></ha-icon>`
      ) : A}`,
      days
    );
  }
  // ---- Pointing at a chart ----
  /** A chart with the day pointed at in it: a line on the day and its values in a box beside it. */
  chartRoom(drawn, tip, extra = A, stops) {
    const { frame } = drawn;
    const last = addDays(frame.from, frame.days);
    const inFrame = stops?.filter((day) => day >= frame.from && day <= last).sort();
    const snap = (day) => inFrame ? nearest(inFrame, day) : day;
    const pointed = this.pointed && this.pointed >= frame.from && this.pointed <= last ? this.pointed : void 0;
    const x2 = pointed ? xOf(frame, pointed) : 0;
    const flip = x2 > (frame.left + frame.right) / 2;
    return b2`<div
            class="chart-room"
            tabindex="0"
            role="group"
            aria-label=${this.text("tooltip.chart")}
            @pointermove=${(event) => this.point(event, frame, snap)}
            @pointerdown=${(event) => this.point(event, frame, snap)}
            @pointerleave=${(event) => {
      if (event.pointerType === "mouse") {
        this.pointed = void 0;
      }
    }}
            @keydown=${(event) => this.step(event, frame, inFrame)}
            @blur=${() => this.pointed = void 0}
        >
            ${drawn.chart} ${extra}
            ${pointed ? b2`<div class="pointer" style=${`left: ${x2}px`}></div>
                          <div class="tip" style=${flip ? `right: ${this.width - x2 + 8}px` : `left: ${x2 + 8}px`}>
                              <div class="tip-day">${this.day(pointed, true)}</div>
                              ${tip(pointed).map((line) => b2`<div>${line}</div>`)}
                          </div>` : A}
        </div>`;
  }
  point(event, frame, snap) {
    const room = event.currentTarget;
    const box = room.getBoundingClientRect();
    const scale = box.width / (room.offsetWidth || box.width || 1);
    this.pointed = snap(dayAt(frame, (event.clientX - box.left) / scale));
  }
  /**
   * The arrow keys move the day pointed at: on a chart of measurements made now and then, such as the winter's ice,
   * from one measurement to the next, and on a daily one by a day. Escape closes the tooltip.
   */
  step(event, frame, stops) {
    if (event.key === "Escape") {
      this.pointed = void 0;
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    this.pointed = stepDay(this.pointed, event.key === "ArrowLeft" ? -1 : 1, frame, stops);
  }
  measurementTip(data, day) {
    const lines = [];
    const point = data.points.find(([d3]) => d3 === day);
    const average = averageOn(data.average, day, data.average_back);
    const unit = data.unit ?? "";
    const decimals = this.decimals(data);
    if (point) {
      const value = `${this.number(point[1], decimals)} ${unit}`.trim();
      lines.push(b2`<i class="tip-line measured"></i>${this.text("tooltip.measured", { value })}`);
    }
    if (average !== void 0) {
      const value = `${this.number(average, decimals)} ${unit}`.trim();
      lines.push(b2`<i class="tip-line average"></i>${this.text("tooltip.average", { value })}`);
    }
    if (point && average !== void 0) {
      const shown = differenceIn(data.unit, point[1] - average);
      const places = shown.unit === "cm" || shown.unit === "mm" ? 0 : decimals;
      const rounded = Number(shown.value.toFixed(places));
      const value = `${rounded > 0 ? "+" : ""}${this.number(rounded, places)} ${shown.unit ?? ""}`.trim();
      lines.push(b2`${this.text("tooltip.difference", { value })}`);
    }
    return lines;
  }
  iceTip(data, day, ghost) {
    const lines = [];
    const last = ghost.get(day);
    const measurement = last ?? data.measurements.find((m2) => m2.day === day);
    if (last) {
      lines.push(b2`<i class="tip-line ghost"></i>${this.text("tooltip.last_winter", { day: this.day(last.day, true) })}`);
    }
    if (measurement && measurement.bearing !== null) {
      const kind = bearingClass(measurement.bearing, data.limits);
      const text = measurement.weak ? this.text("ice.weak_short") : this.text("tooltip.bearing", { value: this.number(measurement.bearing, 0) });
      lines.push(b2`<i class="tip-dot" style=${`background: ${CLASS_COLORS[kind]}`}></i>${text}`);
      lines.push(b2`${this.text(`ice.class.${kind}`)}`);
    }
    const average = averageOn(data.average, day);
    if (average !== void 0 && average >= 0.5) {
      lines.push(b2`<i class="tip-line average"></i>${this.text("tooltip.average_bearing", { value: this.number(average, 0) })}`);
    }
    if (data.events.freeze_up?.day === day) {
      lines.push(b2`${this.text("ice.froze")}`);
    }
    if (data.events.break_up?.day === day) {
      lines.push(b2`${this.text("ice.thawed")}`);
    }
    return lines;
  }
  iceLegend(data, winter) {
    const ghost = lastWinter(data, winter, this.today()).size > 0;
    return b2`<div class="foot">
            ${ghost ? b2`<span class="legend"><i class="line ghost"></i>${this.text("ice.last_winter")}</span>` : b2`<span class="legend"><i class="line measured"></i>${this.text("ice.legend_bearing")}</span>`}
            <span class="legend"><i class="line average"></i>${this.averageLegend(data.years)}</span>
            <span class="legend"><i class="line freeze"></i>${this.text("ice.froze")}</span>
            <span class="legend"><i class="line thaw"></i>${this.text("ice.legend_thawed")}</span>
        </div>`;
  }
  oldLine(data, now) {
    return now?.old ? b2`<div class="old-line">
                  <ha-icon icon="mdi:clock-alert-outline"></ha-icon>
                  <span>${this.text("ice.old", { days: String(data.max_age) })}</span>
              </div>` : A;
  }
  /** The winter's freeze-up and break-up against their averages, or the coming freeze-up and how the last winter went. */
  seasonRows(data, winter) {
    const day = this.today();
    const freeze = data.events.freeze_up;
    const breakUp = data.events.break_up;
    if (!freeze && !breakUp) {
      return A;
    }
    const rows = [];
    const versus = (actual, average) => {
      if (!average) {
        return this.day(actual);
      }
      const days = daysBetween(average, actual);
      if (days === 0) {
        return b2`${this.day(actual)} · ${this.text("card.at_average")}`;
      }
      const key = days > 0 ? "ice.later_than_average" : "ice.earlier_than_average";
      return b2`${this.day(actual)} ·
                <span class=${days > 0 ? "late" : "early"}>${this.text(key, { days: String(Math.abs(days)) })}</span>`;
    };
    const coming = (average) => average ? this.text("ice.on_average_day", { day: this.day(average), when: this.when(daysBetween(day, average)) }) : "\u2013";
    const froze = eventIn(freeze, winter);
    if (froze) {
      rows.push([this.text("ice.froze"), versus(froze, freeze && averageDay(freeze, winter))]);
      const thawed = eventIn(breakUp, winter);
      if (thawed) {
        rows.push([this.text("ice.thawed"), versus(thawed, breakUp && averageDay(breakUp, winter))]);
      } else if (breakUp) {
        rows.push([this.text("ice.thaws"), coming(averageDay(breakUp, winter))]);
      }
    } else {
      if (freeze) {
        rows.push([this.text("ice.freezes"), coming(averageDay(freeze, winter))]);
      }
      const lastFroze = eventIn(freeze, winter - 1);
      const lastThawed = eventIn(breakUp, winter - 1);
      if (lastFroze || lastThawed) {
        const relative = (actual, average) => {
          const days = average ? daysBetween(average, actual) : 0;
          return days === 0 ? A : b2` <span class=${days > 0 ? "late" : "early"}
                              >(${this.text(days > 0 ? "ice.late" : "ice.early", { days: String(Math.abs(days)) })})</span
                          >`;
        };
        const lines = [
          ...lastFroze ? [
            b2`${this.text("ice.last_winter_froze", { day: this.day(lastFroze) })}${relative(lastFroze, freeze && averageDay(freeze, winter - 1))}`
          ] : [],
          ...lastThawed ? [
            b2`${this.text("ice.last_winter_thawed", { day: this.day(lastThawed) })}${relative(lastThawed, breakUp && averageDay(breakUp, winter - 1))}`
          ] : []
        ];
        lines.forEach((line, index) => rows.push([index === 0 ? this.text("ice.last_winter") : "", line]));
      }
    }
    return b2`<div class="season">
            ${rows.map(
      ([key, value]) => b2`<div class="season-key">${key}</div>
                        <div class="season-value">${value}</div>`
    )}
        </div>`;
  }
  /** What the ice bears, how old the measurement is, and the station. */
  iceTop(data, now) {
    const where = b2`<div class="where one-line">
            ${data.measures_ice ? this.text("ice.title") : this.text("ice.dates_only")} · ${data.station}
        </div>`;
    if (!now) {
      const last = data.measurements.at(-1)?.day;
      return b2`<div class="ice-top">
                <div class="ice-icon neutral"><ha-icon icon="mdi:waves"></ha-icon></div>
                <div class="titles">
                    ${where}
                    <div class="big one-line">${this.text("ice.no_ice")}</div>
                    <div class="sub one-line">${last ? this.text("ice.last", { day: this.day(last, true) }) : this.text("ice.never")}</div>
                </div>
            </div>`;
    }
    const color = this.classColor(now);
    return b2`<div class="ice-top">
            <div class="ice-icon" style=${this.chipStyle(color)}><ha-icon .icon=${CLASS_ICONS[now.bearingClass]}></ha-icon></div>
            <div class="titles">
                ${where}
                <div class="big one-line">${this.text(`ice.class.${now.bearingClass}`)}</div>
                <div class="sub one-line">
                    ${now.measurement.weak ? this.text("ice.weak") : this.text("ice.bearing", { value: this.number(now.bearing, 0) })}
                </div>
            </div>
            <div class="value">
                <div class="date">${this.day(now.measurement.day)}</div>
                <span class="chip ${now.old ? "old" : ""}">${this.age(now.age)}</span>
            </div>
        </div>`;
  }
  layers(now) {
    const m2 = now?.measurement;
    if (!m2 || m2.weak || m2.clear === null) {
      return A;
    }
    const snow = m2.snow_on_ice ?? 0;
    const snowIce = m2.snow_ice ?? 0;
    const total = snow + snowIce + m2.clear || 1;
    const share = (value) => `width: ${value / total * 100}%`;
    return b2`<div class="layers">
                <div class="layer snow" style=${share(snow)}></div>
                <div class="layer snow-ice" style=${share(snowIce)}></div>
                <div class="layer clear-ice" style=${share(m2.clear)}></div>
            </div>
            <div class="layer-labels">
                <span><i class="snow"></i>${this.text("ice.snow_on_ice", { value: this.number(snow, 0) })}</span>
                <span><i class="snow-ice"></i>${this.text("ice.snow_ice", { value: this.number(snowIce, 0) })}</span>
                <span><i class="clear-ice"></i>${this.text("ice.clear_ice", { value: this.number(m2.clear, 0) })}</span>
                ${m2.total !== null ? b2`<span>${this.text("ice.total_long", { value: this.number(m2.total, 0) })}</span>` : A}
            </div>`;
  }
  iceRow(data, now, winter) {
    if (!now) {
      const freeze = data.events.freeze_up;
      const average = freeze ? averageDay(freeze, winter) : void 0;
      const coming = average && average >= this.today() ? average : void 0;
      return b2`<div class="row">
                <div class="row-icon neutral"><ha-icon icon="mdi:waves"></ha-icon></div>
                <div class="row-titles">
                    <div class="one-line">${data.measures_ice ? this.text("ice.no_ice") : this.text("ice.dates_only")}</div>
                    <div class="one-line sub">${data.station}</div>
                </div>
                <div class="spacer"></div>
                ${coming ? b2`<div class="row-value">
                              <div class="small">${this.text("ice.freezes_short", { day: this.day(coming) })}</div>
                              <span class="chip neutral">${this.when(daysBetween(this.today(), coming))}</span>
                          </div>` : A}
            </div>`;
    }
    const color = this.classColor(now);
    return b2`<div class="row">
            <div class="row-icon" style=${this.chipStyle(color)}><ha-icon .icon=${CLASS_ICONS[now.bearingClass]}></ha-icon></div>
            <div class="row-titles">
                <div class="one-line">${this.text(`ice.class.${now.bearingClass}`)}</div>
                <div class="one-line sub">
                    ${now.measurement.weak ? this.text("ice.weak_short") : `${this.number(now.bearing, 0)} cm`} · ${data.station}
                </div>
            </div>
            <div class="spacer"></div>
            <div class="row-value">
                <div class="small">${this.day(now.measurement.day)}</div>
                <span class="chip ${now.old ? "old" : ""}">${this.age(now.age)}</span>
            </div>
        </div>`;
  }
  // ---- Texts and numbers ----
  /** The average's line in a legend, with its years shortened to two digits each: "1996–2025" is 96–25. */
  averageLegend(years) {
    return years ? this.text("card.legend_average", { years: years.replace(/\d{2}(\d{2})/g, "$1") }) : this.text("card.legend_average_plain");
  }
  chipStyle(color) {
    return `background: color-mix(in srgb, ${color} 22%, transparent); color: ${color}`;
  }
  age(days) {
    return days === 0 ? this.text("ice.measured_today") : this.text("ice.days_ago", { days: String(days) });
  }
  when(days) {
    if (days === 0) {
      return this.text("card.today");
    }
    return days > 0 ? this.text("ice.in_days", { days: String(days) }) : this.text("ice.days_ago", { days: String(-days) });
  }
  today() {
    return today(this.hass);
  }
  formats() {
    return { number: (value, decimals) => this.number(value, decimals), day: (day) => this.day(day), text: (key) => this.text(key) };
  }
  number(value, decimals) {
    return new Intl.NumberFormat(numberLocale(this.hass, this.language()), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: this.hass?.locale?.number_format !== "none"
    }).format(value);
  }
  /** A day as its day and month, with the year when asked for. */
  day(day, year = false) {
    return new Intl.DateTimeFormat(this.language(), {
      day: "numeric",
      month: "numeric",
      year: year ? "numeric" : void 0,
      timeZone: "UTC"
    }).format(/* @__PURE__ */ new Date(`${day}T00:00:00Z`));
  }
  message(text) {
    return b2`<ha-card><div class="card message">${text}</div></ha-card>`;
  }
  text(key, replacements = {}) {
    let text = translate(this.language(), key);
    for (const [name, value] of Object.entries(replacements)) {
      text = text.replaceAll(`{${name}}`, value);
    }
    return text;
  }
  language() {
    return this.hass?.locale?.language ?? this.hass?.language ?? browserLanguage();
  }
  static get styles() {
    return i`
            /* As tall as a sections view's grid rows make its cell, which a card held by them fills. */
            :host {
                display: block;
                height: 100%;
                position: relative;
                --syke-measured-color: var(--orange-color, #ff9800);
                --syke-average-color: var(--info-color, #039be5);
                --syke-freeze-color: var(--cyan-color, #00bcd4);
                --syke-thaw-color: var(--green-color, #4caf50);
                --syke-old: var(--syke-old-color, var(--warning-color, #ff9800));
            }
            ha-card {
                height: 100%;
                overflow: hidden;
                transition: none;
                box-sizing: border-box;
            }
            .card,
            .measured-copy {
                display: flex;
                flex-direction: column;
                gap: 0;
                box-sizing: border-box;
                padding: 16px;
                height: 100%;
            }
            .measured-copy {
                height: auto;
            }
            /* 9 px above and below a 36 px row, with ha-card's border, is one row of a sections view. */
            .card.row-card,
            .measured-copy.row-card {
                padding: 9px 16px;
            }
            ha-card.centred .card {
                justify-content: center;
            }
            .measurer {
                position: absolute;
                top: 0;
                left: 0;
                visibility: hidden;
                pointer-events: none;
                contain: layout paint;
            }
            .message {
                color: var(--secondary-text-color);
            }
            .one-line {
                overflow-wrap: anywhere;
            }
            .held .one-line {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                overflow-wrap: normal;
            }

            .header,
            .ice-top {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            .titles {
                flex: 1;
                min-width: 0;
            }
            .name {
                font-size: 16px;
                font-weight: 500;
                line-height: 22px;
            }
            .sub,
            .where {
                font-size: 12.5px;
                color: var(--secondary-text-color);
                line-height: 17px;
            }
            .old {
                color: var(--syke-old);
            }
            .value {
                text-align: end;
                flex: none;
            }
            .number {
                font-size: 24px;
                line-height: 28px;
                white-space: nowrap;
            }
            .unit {
                font-size: 14px;
                color: var(--secondary-text-color);
            }
            .chip {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
                line-height: 18px;
                padding: 0 8px;
                border-radius: 9px;
                white-space: nowrap;
                background: color-mix(in srgb, var(--syke-average-color) 18%, transparent);
                color: var(--syke-average-color);
            }
            .chip.above {
                background: color-mix(in srgb, var(--syke-measured-color) 18%, transparent);
                color: var(--syke-measured-color);
            }
            .chip.neutral {
                background: color-mix(in srgb, var(--secondary-text-color) 16%, transparent);
                color: var(--secondary-text-color);
            }
            .chip.old {
                background: color-mix(in srgb, var(--syke-old) 20%, transparent);
                color: var(--syke-old);
            }
            .chip ha-icon {
                --mdc-icon-size: 14px;
            }

            .chart-room {
                position: relative;
                margin-top: 10px;
                flex: none;
            }
            svg {
                display: block;
                overflow: visible;
            }
            svg text {
                fill: var(--secondary-text-color);
                font-size: 11px;
                font-family: inherit;
            }
            .grid {
                stroke: var(--divider-color);
                stroke-width: 0.6;
            }
            .zero {
                stroke: var(--divider-color);
                stroke-width: 1.2;
            }
            .future {
                fill: color-mix(in srgb, var(--syke-average-color) 7%, transparent);
            }
            .average {
                fill: none;
                stroke: var(--syke-average-color);
                stroke-width: 1.5;
                stroke-dasharray: 5 4;
            }
            .average-area {
                fill: var(--syke-average-color);
                opacity: 0.08;
            }
            .measured {
                fill: none;
                stroke: var(--syke-measured-color);
                stroke-width: 2;
            }
            .last {
                fill: var(--syke-measured-color);
            }
            .today {
                stroke: var(--secondary-text-color);
                stroke-dasharray: 2 3;
            }
            .bar-above {
                fill: var(--syke-measured-color);
            }
            .bar-below {
                fill: var(--syke-average-color);
            }
            /* Dots of 2 px with gaps of 2, as the legend's dotted 2 px line draws them. */
            .ghost {
                fill: none;
                stroke: var(--secondary-text-color);
                stroke-width: 2;
                stroke-dasharray: 2 2;
                opacity: 0.6;
            }
            .point {
                stroke: var(--card-background-color, var(--ha-card-background, #fff));
                stroke-width: 1.5;
            }
            .limit {
                stroke-opacity: 0.55;
                stroke-dasharray: 2 3;
            }
            .freeze,
            .freeze-average {
                stroke: var(--syke-freeze-color);
                stroke-width: 1.3;
            }
            .thaw,
            .thaw-average {
                stroke: var(--syke-thaw-color);
                stroke-width: 1.3;
            }
            .freeze-average,
            .thaw-average {
                stroke-dasharray: 4 3;
            }
            .freeze-average-label {
                fill: var(--syke-freeze-color);
            }
            .thaw-average-label {
                fill: var(--syke-thaw-color);
            }
            .chart-room:focus-visible {
                outline: 2px solid var(--primary-color);
                outline-offset: 2px;
                border-radius: 4px;
            }
            .pointer {
                position: absolute;
                top: 16px;
                bottom: 18px;
                width: 0;
                border-left: 1px solid var(--primary-text-color);
                opacity: 0.5;
                pointer-events: none;
            }
            .tip {
                position: absolute;
                top: 14px;
                padding: 6px 8px;
                border-radius: 6px;
                background: var(--card-background-color, var(--ha-card-background, #fff));
                border: 1px solid var(--divider-color);
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
                font-size: 12px;
                line-height: 17px;
                white-space: nowrap;
                pointer-events: none;
                z-index: 1;
            }
            .tip-day {
                font-weight: 500;
            }
            .tip .tip-line {
                display: inline-block;
                width: 12px;
                border-top: 2px solid;
                vertical-align: middle;
                margin-inline-end: 5px;
            }
            .tip-line.measured {
                border-color: var(--syke-measured-color);
            }
            /* As specific as the legend's own line rule, which comes later and would otherwise make it solid. */
            .legend .line.ghost,
            .tip .tip-line.ghost {
                border-color: var(--secondary-text-color);
                border-top-style: dotted;
                opacity: 0.7;
            }
            .tip-line.average {
                border-color: var(--syke-average-color);
                border-top-style: dashed;
            }
            .tip-dot {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                margin-inline-end: 6px;
            }
            .limit-icon {
                position: absolute;
                --mdc-icon-size: 12px;
                width: 12px;
                height: 12px;
                display: flex;
            }

            .foot {
                display: flex;
                flex-wrap: wrap;
                gap: 2px 14px;
                font-size: 12px;
                color: var(--secondary-text-color);
                margin-top: 6px;
                line-height: 17px;
            }
            .held .foot {
                flex-wrap: nowrap;
                overflow: hidden;
                white-space: nowrap;
            }
            .ahead {
                flex: 1;
                text-align: end;
            }
            .legend .line {
                display: inline-block;
                width: 14px;
                border-top: 2px solid;
                vertical-align: middle;
                margin-inline-end: 4px;
            }
            .line.measured {
                border-color: var(--syke-measured-color);
            }
            .line.average {
                border-color: var(--syke-average-color);
                border-top-style: dashed;
            }
            .line.freeze {
                border-color: var(--syke-freeze-color);
            }
            .line.thaw {
                border-color: var(--syke-thaw-color);
            }

            .ice-icon,
            .row-icon {
                flex: none;
                display: grid;
                place-items: center;
                border-radius: 50%;
            }
            .ice-icon {
                width: 48px;
                height: 48px;
                --mdc-icon-size: 26px;
            }
            .neutral {
                background: color-mix(in srgb, var(--secondary-text-color) 16%, transparent);
                color: var(--secondary-text-color);
            }
            .big {
                font-size: 18px;
                font-weight: 500;
                line-height: 24px;
            }
            .date,
            .small {
                font-size: 13px;
                color: var(--secondary-text-color);
                line-height: 18px;
            }
            .gauge-room {
                margin-top: 14px;
            }
            .zone {
                opacity: 0.28;
            }
            .gauge-average {
                stroke: var(--syke-average-color);
                stroke-width: 2;
                stroke-dasharray: 3 2;
            }
            .gauge-average-label {
                fill: var(--syke-average-color);
            }
            .gauge-value {
                fill: var(--primary-text-color);
                font-weight: 500;
            }
            .layers {
                display: flex;
                height: 10px;
                border-radius: 3px;
                overflow: hidden;
                margin-top: 4px;
            }
            .snow {
                background: var(--syke-snow-color, #e5e9f0);
            }
            .snow-ice {
                background: var(--syke-snow-ice-color, #9aa5b8);
            }
            .clear-ice {
                background: var(--syke-clear-ice-color, #5e81ac);
            }
            .layer-labels {
                display: flex;
                flex-wrap: wrap;
                gap: 2px 12px;
                font-size: 12px;
                color: var(--secondary-text-color);
                margin-top: 4px;
            }
            .layer-labels i {
                display: inline-block;
                width: 9px;
                height: 9px;
                border-radius: 2px;
                margin-inline-end: 4px;
                vertical-align: -1px;
            }
            .old-line {
                display: flex;
                gap: 6px;
                margin-top: 10px;
                font-size: 12.5px;
                color: var(--syke-old);
                --mdc-icon-size: 16px;
            }
            .season {
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 3px 10px;
                font-size: 13px;
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px solid var(--divider-color);
            }
            .season-key {
                color: var(--secondary-text-color);
            }
            .late {
                color: var(--syke-measured-color);
            }
            .early {
                color: var(--syke-average-color);
            }

            .row {
                display: flex;
                align-items: center;
                gap: 10px;
                min-height: 36px;
            }
            .row-icon {
                width: 36px;
                height: 36px;
                --mdc-icon-size: 20px;
                background: color-mix(in srgb, var(--syke-average-color) 14%, transparent);
                color: var(--syke-average-color);
            }
            .row-titles {
                flex: 0 1 auto;
                min-width: 0;
            }
            .row-titles .one-line {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 20px;
                font-weight: 500;
            }
            .row-titles .sub {
                font-weight: 400;
                line-height: 16px;
            }
            .spacer {
                flex: 1;
            }
            .spark-room {
                margin-top: 8px;
            }
            .spark-room svg {
                width: 100%;
            }
            .row-value {
                flex: none;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
            }
            /* A flex pair of a fixed height, as the unit's smaller font, set on the same baseline, would otherwise grow the line past 20 px. */
            .row-value .number {
                display: flex;
                align-items: baseline;
                gap: 3px;
                height: 20px;
                font-size: 17px;
                line-height: 20px;
            }
            .row-value .unit {
                font-size: 12px;
            }
            .row-value .chip {
                line-height: 16px;
            }
        `;
  }
};
__decorateClass([
  n4({ attribute: false })
], SykeHydrologyCard.prototype, "hass", 2);
__decorateClass([
  n4({ attribute: false })
], SykeHydrologyCard.prototype, "layout", 2);
__decorateClass([
  r5()
], SykeHydrologyCard.prototype, "config", 2);
__decorateClass([
  r5()
], SykeHydrologyCard.prototype, "data", 2);
__decorateClass([
  r5()
], SykeHydrologyCard.prototype, "error", 2);
__decorateClass([
  r5()
], SykeHydrologyCard.prototype, "form", 2);
__decorateClass([
  r5()
], SykeHydrologyCard.prototype, "chartHeight", 2);
__decorateClass([
  r5()
], SykeHydrologyCard.prototype, "width", 2);
__decorateClass([
  r5()
], SykeHydrologyCard.prototype, "filled", 2);
__decorateClass([
  r5()
], SykeHydrologyCard.prototype, "spare", 2);
__decorateClass([
  r5()
], SykeHydrologyCard.prototype, "held", 2);
__decorateClass([
  r5()
], SykeHydrologyCard.prototype, "pointed", 2);
function nearest(days, day) {
  const near = days.filter((each) => Math.abs(daysBetween(each, day)) <= 5);
  near.sort((a3, b3) => Math.abs(daysBetween(a3, day)) - Math.abs(daysBetween(b3, day)));
  return near[0] ?? day;
}
function stepDay(pointed, direction, frame, stops) {
  const last = addDays(frame.from, frame.days);
  if (stops) {
    if (!stops.length) {
      return pointed;
    }
    if (pointed === void 0) {
      return direction > 0 ? stops[0] : stops[stops.length - 1];
    }
    const next2 = direction > 0 ? stops.find((day) => day > pointed) : stops.filter((day) => day < pointed).at(-1);
    return next2 ?? pointed;
  }
  if (pointed === void 0) {
    return direction > 0 ? frame.from : last;
  }
  const next = addDays(pointed, direction);
  return next < frame.from || next > last ? pointed : next;
}
function px(value) {
  return Number.parseFloat(value) || 0;
}
if (!customElements.get("syke-hydrology-card")) {
  console.info(
    `%c  SYKE-HYDROLOGY-CARD 
%c  ${CARD_VERSION}    `,
    "color: orange; font-weight: bold; background: black",
    "color: white; font-weight: bold; background: dimgray"
  );
  const registry = window;
  registry.customCards = registry.customCards ?? [];
  registry.customCards.push({
    type: "syke-hydrology-card",
    name: translate(browserLanguage(), "common.name"),
    description: translate(browserLanguage(), "common.description"),
    documentationURL: "https://github.com/jesmak/syke_hydrology#hydrology-card",
    preview: true
  });
  customElements.define("syke-hydrology-card", SykeHydrologyCard);
}
export {
  SykeHydrologyCard,
  nearest,
  stepDay
};
