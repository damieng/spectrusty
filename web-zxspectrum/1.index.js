(window.webpackJsonp=window.webpackJsonp||[]).push([[1],[,,function(t,n,r){"use strict";(function(t){r.d(n,"cb",(function(){return y})),r.d(n,"a",(function(){return P})),r.d(n,"ab",(function(){return I})),r.d(n,"b",(function(){return R})),r.d(n,"X",(function(){return E})),r.d(n,"x",(function(){return B})),r.d(n,"L",(function(){return F})),r.d(n,"W",(function(){return M})),r.d(n,"l",(function(){return K})),r.d(n,"O",(function(){return U})),r.d(n,"e",(function(){return q})),r.d(n,"q",(function(){return J})),r.d(n,"C",(function(){return V})),r.d(n,"T",(function(){return N})),r.d(n,"N",(function(){return z})),r.d(n,"p",(function(){return Z})),r.d(n,"o",(function(){return G})),r.d(n,"g",(function(){return L})),r.d(n,"f",(function(){return H})),r.d(n,"M",(function(){return W})),r.d(n,"P",(function(){return Q})),r.d(n,"n",(function(){return X})),r.d(n,"J",(function(){return Y})),r.d(n,"m",(function(){return $})),r.d(n,"Q",(function(){return tt})),r.d(n,"w",(function(){return nt})),r.d(n,"d",(function(){return rt})),r.d(n,"S",(function(){return et})),r.d(n,"i",(function(){return ut})),r.d(n,"h",(function(){return ct})),r.d(n,"j",(function(){return it})),r.d(n,"I",(function(){return ot})),r.d(n,"B",(function(){return ft})),r.d(n,"y",(function(){return at})),r.d(n,"D",(function(){return dt})),r.d(n,"F",(function(){return st})),r.d(n,"H",(function(){return _t})),r.d(n,"U",(function(){return lt})),r.d(n,"c",(function(){return bt})),r.d(n,"z",(function(){return pt})),r.d(n,"u",(function(){return gt})),r.d(n,"A",(function(){return ht})),r.d(n,"v",(function(){return wt})),r.d(n,"s",(function(){return vt})),r.d(n,"E",(function(){return yt})),r.d(n,"K",(function(){return mt})),r.d(n,"R",(function(){return At})),r.d(n,"G",(function(){return Tt})),r.d(n,"k",(function(){return St})),r.d(n,"t",(function(){return kt})),r.d(n,"r",(function(){return Ct})),r.d(n,"Z",(function(){return jt})),r.d(n,"bb",(function(){return xt})),r.d(n,"Y",(function(){return Dt})),r.d(n,"V",(function(){return Ot}));var e=r(3);const u="undefined"!=typeof AudioContext?AudioContext:webkitAudioContext;let c=new("undefined"==typeof TextDecoder?(0,t.require)("util").TextDecoder:TextDecoder)("utf-8",{ignoreBOM:!0,fatal:!0});c.decode();let i=null;function o(){return null!==i&&i.buffer===e.g.buffer||(i=new Uint8Array(e.g.buffer)),i}function f(t,n){return c.decode(o().subarray(t,t+n))}const a=new Array(32).fill(void 0);a.push(void 0,null,!0,!1);let d=a.length;function s(t){d===a.length&&a.push(a.length+1);const n=d;return d=a[n],a[n]=t,n}function _(t){return a[t]}function l(t){const n=_(t);return function(t){t<36||(a[t]=d,d=t)}(t),n}let b=0;let p=new("undefined"==typeof TextEncoder?(0,t.require)("util").TextEncoder:TextEncoder)("utf-8");const g="function"==typeof p.encodeInto?function(t,n){return p.encodeInto(t,n)}:function(t,n){const r=p.encode(t);return n.set(r),{read:t.length,written:r.length}};function h(t,n,r){if(void 0===r){const r=p.encode(t),e=n(r.length);return o().subarray(e,e+r.length).set(r),b=r.length,e}let e=t.length,u=n(e);const c=o();let i=0;for(;i<e;i++){const n=t.charCodeAt(i);if(n>127)break;c[u+i]=n}if(i!==e){0!==i&&(t=t.slice(i)),u=r(u,e,e=i+3*t.length);const n=o().subarray(u+i,u+e);i+=g(t,n).written}return b=i,u}let w=null;function v(){return null!==w&&w.buffer===e.g.buffer||(w=new Int32Array(e.g.buffer)),w}function y(){e.h()}let m=null;function A(t,n){return(null!==m&&m.buffer===e.g.buffer||(m=new Uint32Array(e.g.buffer)),m).subarray(t/4,t/4+n)}let T=32;function S(t,n){const r=n(1*t.length);return o().set(t,r/1),b=t.length,r}function k(t,n){return o().subarray(t/1,t/1+n)}let C=null;function j(t,n){return(null!==C&&C.buffer===e.g.buffer||(C=new Float32Array(e.g.buffer)),C).subarray(t/4,t/4+n)}function x(t){return function(){try{return t.apply(this,arguments)}catch(t){e.b(s(t))}}}let D=null;function O(t,n){return(null!==D&&D.buffer===e.g.buffer||(D=new Uint8ClampedArray(e.g.buffer)),D).subarray(t/1,t/1+n)}class P{static __wrap(t){const n=Object.create(P.prototype);return n.ptr=t,n}free(){const t=this.ptr;this.ptr=0,e.a(t)}constructor(t,n){var r=h(n,e.e,e.f),u=b,c=e.H(t,r,u);return P.__wrap(c)}get canvasSize(){try{const u=e.c.value-16;e.c.value=u,e.o(u,this.ptr);var t=v()[u/4+0],n=v()[u/4+1],r=A(t,n).slice();return e.d(t,4*n),r}finally{e.c.value+=16}}runFramesWithAudio(t){var n=e.R(this.ptr,t);return 16777215===n?void 0:0!==n}renderVideo(){return l(e.N(this.ptr))}updateStateFromKeyEvent(t,n){try{e.vb(this.ptr,function(t){if(1==T)throw new Error("out of js stack");return a[--T]=t,T}(t),n)}finally{a[T++]=void 0}}get keyboard(){return e.B(this.ptr)}setKeyState(t,n){e.Z(this.ptr,t,n)}moveMouse(t,n){e.G(this.ptr,t,n)}updateMouseButton(t,n){e.ub(this.ptr,t,n)}selectModel(t){var n=h(t,e.e,e.f),r=b;e.W(this.ptr,n,r)}get model(){try{const r=e.c.value-16;e.c.value=r,e.F(r,this.ptr);var t=v()[r/4+0],n=v()[r/4+1];return f(t,n)}finally{e.c.value+=16,e.d(t,n)}}reset(t){e.O(this.ptr,t)}powerCycle(){e.M(this.ptr)}triggerNmi(){e.sb(this.ptr)}resetAndLoad(){return 0!==e.P(this.ptr)}selectBorderSize(t){var n=h(t,e.e,e.f),r=b;e.U(this.ptr,n,r)}get borderSize(){try{const r=e.c.value-16;e.c.value=r,e.n(r,this.ptr);var t=v()[r/4+0],n=v()[r/4+1];return f(t,n)}finally{e.c.value+=16,e.d(t,n)}}set interlace(t){e.gb(this.ptr,t)}get interlace(){return e.z(this.ptr)}setCpuRateFactor(t){e.Y(this.ptr,t)}get cpuRateFactor(){return e.p(this.ptr)}set turbo(t){e.ib(this.ptr,t)}get turbo(){return 0!==e.tb(this.ptr)}set gain(t){e.eb(this.ptr,t)}get gain(){return e.v(this.ptr)>>>0}set audibleTape(t){e.ab(this.ptr,t)}get audibleTape(){return 0!==e.k(this.ptr)}set fastTape(t){e.db(this.ptr,t)}get fastTape(){return 0!==e.u(this.ptr)}set instantTape(t){e.fb(this.ptr,t)}get instantTape(){return 0!==e.y(this.ptr)}pauseAudio(){return l(e.J(this.ptr))}resumeAudio(){return l(e.Q(this.ptr))}showScr(t){var n=S(t,e.e),r=b;e.jb(this.ptr,n,r)}loadSna(t){var n=S(t,e.e),r=b;e.D(this.ptr,n,r)}loadZ80(t){var n=S(t,e.e),r=b;e.E(this.ptr,n,r)}tapeInfo(){return l(e.mb(this.ptr))}ejectTape(){e.t(this.ptr)}appendTape(t){var n=S(t,e.e),r=b;return l(e.i(this.ptr,n,r))}insertTape(t){var n=S(t,e.e),r=b;return l(e.x(this.ptr,n,r))}tapeData(){return l(e.lb(this.ptr))}snapScr(){try{const u=e.c.value-16;e.c.value=u,e.kb(u,this.ptr);var t=v()[u/4+0],n=v()[u/4+1],r=k(t,n).slice();return e.d(t,1*n),r}finally{e.c.value+=16}}saveSNA(){try{const u=e.c.value-16;e.c.value=u,e.S(u,this.ptr);var t=v()[u/4+0],n=v()[u/4+1],r=k(t,n).slice();return e.d(t,1*n),r}finally{e.c.value+=16}}saveZ80(t){try{const c=e.c.value-16;e.c.value=c,e.T(c,this.ptr,t);var n=v()[c/4+0],r=v()[c/4+1],u=k(n,r).slice();return e.d(n,1*r),u}finally{e.c.value+=16}}toJSON(){try{const r=e.c.value-16;e.c.value=r,e.pb(r,this.ptr);var t=v()[r/4+0],n=v()[r/4+1];return f(t,n)}finally{e.c.value+=16,e.d(t,n)}}parseJSON(t){var n=h(t,e.e,e.f),r=b;e.I(this.ptr,n,r)}tapeProgress(){return l(e.nb(this.ptr))}selectTapeChunk(t){e.X(this.ptr,t)}tapeStatus(){return e.ob(this.ptr)>>>0}togglePlayTape(){return e.qb(this.ptr)>>>0}toggleRecordTape(){return e.rb(this.ptr)>>>0}set ayAmps(t){var n=h(t,e.e,e.f),r=b;e.bb(this.ptr,n,r)}get ayAmps(){try{const r=e.c.value-16;e.c.value=r,e.l(r,this.ptr);var t=v()[r/4+0],n=v()[r/4+1];return f(t,n)}finally{e.c.value+=16,e.d(t,n)}}set ayChannels(t){var n=h(t,e.e,e.f),r=b;e.cb(this.ptr,n,r)}get ayChannels(){try{const r=e.c.value-16;e.c.value=r,e.m(r,this.ptr);var t=v()[r/4+0],n=v()[r/4+1];return f(t,n)}finally{e.c.value+=16,e.d(t,n)}}selectJoystick(t){e.V(this.ptr,t)}get joystick(){try{const r=e.c.value-16;e.c.value=r,e.A(r,this.ptr);var t=v()[r/4+0],n=v()[r/4+1];return f(t,n)}finally{e.c.value+=16,e.d(t,n)}}attachDevice(t){var n=h(t,e.e,e.f),r=b;return 0!==e.j(this.ptr,n,r)}detachDevice(t){var n=h(t,e.e,e.f),r=b;e.q(this.ptr,n,r)}hasDevice(t){var n=h(t,e.e,e.f),r=b;return 0!==e.w(this.ptr,n,r)}set keyboardIssue(t){var n=h(t,e.e,e.f),r=b;e.hb(this.ptr,n,r)}get keyboardIssue(){try{const r=e.c.value-16;e.c.value=r,e.C(r,this.ptr);var t=v()[r/4+0],n=v()[r/4+1];return f(t,n)}finally{e.c.value+=16,e.d(t,n)}}poke(t,n){e.L(this.ptr,t,n)}peek(t){return e.K(this.ptr,t)}dump(t,n){try{const i=e.c.value-16;e.c.value=i,e.s(i,this.ptr,t,n);var r=v()[i/4+0],u=v()[i/4+1],c=k(r,u).slice();return e.d(r,1*u),c}finally{e.c.value+=16}}disassemble(t,n){try{const c=e.c.value-16;e.c.value=c,e.r(c,this.ptr,t,n);var r=v()[c/4+0],u=v()[c/4+1];return f(r,u)}finally{e.c.value+=16,e.d(r,u)}}}const I=function(t,n){return s(f(t,n))},R=function(t,n){alert(f(t,n))},E=function(t){l(t)},B=function(){return s(new Object)},F=function(t,n,r){_(t)[_(n)]=_(r)},M=function(t){return s(t)},K=function(t){return _(t).ctrlKey},U=function(t){return _(t).shiftKey},q=function(t,n){var r=h(_(n).code,e.e,e.f),u=b;v()[t/4+1]=u,v()[t/4+0]=r},J=function(t,n,r){return _(t).getModifierState(f(n,r))},V=function(t){_(t).preventDefault()},N=function(t){return _(t).value},z=function(t,n){_(t).value=n},Z=function(t){return s(_(t).gain)},G=function(t){return _(t).duration},L=x((function(t,n,r,e){_(t).copyToChannel(j(n,r),e)})),H=x((function(t,n){return s(_(t).connect(_(n)))})),W=function(t,n){_(t).buffer=_(n)},Q=x((function(t,n,r,e){_(t).start(n,r,e)})),X=function(t){return s(_(t).destination)},Y=function(t){return _(t).sampleRate},$=function(t){return _(t).currentTime},tt=function(t){return s(_(t).state)},nt=x((function(){return s(new u)})),rt=x((function(t){return s(_(t).close())})),et=x((function(t){return s(_(t).suspend())})),ut=x((function(t,n,r,e){return s(_(t).createBuffer(n>>>0,r>>>0,e))})),ct=x((function(t){return s(_(t).createBufferSource())})),it=x((function(t){return s(_(t).createGain())})),ot=x((function(t){return s(_(t).resume())})),ft=x((function(t,n,r,e){return s(new ImageData(O(t,n),r>>>0,e>>>0))})),at=function(){return s(new Array)},dt=function(t,n){return _(t).push(_(n))},st=function(t){return s(Promise.reject(_(t)))},_t=function(t){return s(Promise.resolve(_(t)))},lt=function(t){return void 0===_(t)},bt=function(t){return s(_(t).buffer)},pt=function(t,n,r){return s(new Int32Array(_(t),n>>>0,r>>>0))},gt=function(t){return s(new Int32Array(_(t)))},ht=function(t,n,r){return s(new Uint8Array(_(t),n>>>0,r>>>0))},wt=function(t){return s(new Uint8Array(_(t)))},vt=function(t,n,r){_(t).getRandomValues(k(n,r))},yt=function(t,n,r){_(t).randomFillSync(k(n,r))},mt=x((function(){return s(self.self)})),At=function(){return s(t)},Tt=function(t,n,r){return s(_(t).require(f(n,r)))},St=function(t){return s(_(t).crypto)},kt=function(t){return s(_(t).msCrypto)},Ct=function(t){return s(_(t).getRandomValues)},jt=function(t,n){const r=_(n);var u="string"==typeof r?r:void 0,c=null==u?0:h(u,e.e,e.f),i=b;v()[t/4+1]=i,v()[t/4+0]=c},xt=function(t,n){throw new Error(f(t,n))},Dt=function(t){throw l(t)},Ot=function(){return s(e.g)}}).call(this,r(4)(t))},function(t,n,r){"use strict";var e=r.w[t.i];t.exports=e;r(0),r(2);e.wb()},function(t,n){t.exports=function(t){if(!t.webpackPolyfill){var n=Object.create(t);n.children||(n.children=[]),Object.defineProperty(n,"loaded",{enumerable:!0,get:function(){return n.l}}),Object.defineProperty(n,"id",{enumerable:!0,get:function(){return n.i}}),Object.defineProperty(n,"exports",{enumerable:!0}),n.webpackPolyfill=1}return n}},function(t,n,r){"use strict";r.r(n);var e=r(2);r.d(n,"setPanicHook",(function(){return e.cb})),r.d(n,"ZxSpectrumEmu",(function(){return e.a})),r.d(n,"__wbindgen_string_new",(function(){return e.ab})),r.d(n,"__wbg_alert_9527e81f3c9d9b78",(function(){return e.b})),r.d(n,"__wbindgen_object_drop_ref",(function(){return e.X})),r.d(n,"__wbg_new_c8a8ecf6b6797c50",(function(){return e.x})),r.d(n,"__wbg_set_36296f51e28fc9f1",(function(){return e.L})),r.d(n,"__wbindgen_number_new",(function(){return e.W})),r.d(n,"__wbg_ctrlKey_f080ec163dcc2703",(function(){return e.l})),r.d(n,"__wbg_shiftKey_d11f615955404512",(function(){return e.O})),r.d(n,"__wbg_code_c3b28f37b4149e68",(function(){return e.e})),r.d(n,"__wbg_getModifierState_b6cb98c792c66e40",(function(){return e.q})),r.d(n,"__wbg_preventDefault_93d06688748bfc14",(function(){return e.C})),r.d(n,"__wbg_value_e777d8ebaee40486",(function(){return e.T})),r.d(n,"__wbg_setvalue_b131e8da9633811c",(function(){return e.N})),r.d(n,"__wbg_gain_4df90433f6e80c75",(function(){return e.p})),r.d(n,"__wbg_duration_a146ee179820824a",(function(){return e.o})),r.d(n,"__wbg_copyToChannel_bd11b16314c06eac",(function(){return e.g})),r.d(n,"__wbg_connect_a4e3fd3dce194b2c",(function(){return e.f})),r.d(n,"__wbg_setbuffer_68371a3a4f02f6fd",(function(){return e.M})),r.d(n,"__wbg_start_3181340053431b4c",(function(){return e.P})),r.d(n,"__wbg_destination_647daf47bfcda8af",(function(){return e.n})),r.d(n,"__wbg_sampleRate_2cc9cd67bcfefcb6",(function(){return e.J})),r.d(n,"__wbg_currentTime_9790fc4a74b6d62f",(function(){return e.m})),r.d(n,"__wbg_state_5a434ba3efa1082c",(function(){return e.Q})),r.d(n,"__wbg_new_c759b32bc33d4dfa",(function(){return e.w})),r.d(n,"__wbg_close_4d14821b14172f7b",(function(){return e.d})),r.d(n,"__wbg_suspend_3d1d7bc7f13bd2e5",(function(){return e.S})),r.d(n,"__wbg_createBuffer_f42f7a85c347fd2e",(function(){return e.i})),r.d(n,"__wbg_createBufferSource_ba46d5cecab7525f",(function(){return e.h})),r.d(n,"__wbg_createGain_76746a6a33b74c41",(function(){return e.j})),r.d(n,"__wbg_resume_777b6136e3bbedbe",(function(){return e.I})),r.d(n,"__wbg_newwithu8clampedarrayandsh_104cc36644cfc313",(function(){return e.B})),r.d(n,"__wbg_new_e13110f81ae347cf",(function(){return e.y})),r.d(n,"__wbg_push_b46eeec52d2b03bb",(function(){return e.D})),r.d(n,"__wbg_reject_5d8c18a490c1b8b2",(function(){return e.F})),r.d(n,"__wbg_resolve_2529512c3bb73938",(function(){return e.H})),r.d(n,"__wbindgen_is_undefined",(function(){return e.U})),r.d(n,"__wbg_buffer_49131c283a06686f",(function(){return e.c})),r.d(n,"__wbg_newwithbyteoffsetandlength_17b60ac1a19c43e4",(function(){return e.z})),r.d(n,"__wbg_new_066196c5e92c30d6",(function(){return e.u})),r.d(n,"__wbg_newwithbyteoffsetandlength_c0f38401daad5a22",(function(){return e.A})),r.d(n,"__wbg_new_9b295d24cf1d706f",(function(){return e.v})),r.d(n,"__wbg_getRandomValues_3ac1b33c90b52596",(function(){return e.s})),r.d(n,"__wbg_randomFillSync_6f956029658662ec",(function(){return e.E})),r.d(n,"__wbg_self_1c83eb4471d9eb9b",(function(){return e.K})),r.d(n,"__wbg_static_accessor_MODULE_abf5ae284bffdf45",(function(){return e.R})),r.d(n,"__wbg_require_5b2b5b594d809d9f",(function(){return e.G})),r.d(n,"__wbg_crypto_c12f14e810edcaa2",(function(){return e.k})),r.d(n,"__wbg_msCrypto_679be765111ba775",(function(){return e.t})),r.d(n,"__wbg_getRandomValues_05a60bf171bfc2be",(function(){return e.r})),r.d(n,"__wbindgen_string_get",(function(){return e.Z})),r.d(n,"__wbindgen_throw",(function(){return e.bb})),r.d(n,"__wbindgen_rethrow",(function(){return e.Y})),r.d(n,"__wbindgen_memory",(function(){return e.V}))}]]);