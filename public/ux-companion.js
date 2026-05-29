var UxCompanion=function(X){"use strict";var _r=Object.defineProperty;var gr=(X,q,w)=>q in X?_r(X,q,{enumerable:!0,configurable:!0,writable:!0,value:w}):X[q]=w;var we=(X,q,w)=>gr(X,typeof q!="symbol"?q+"":q,w);var q,w,pt,ht,Z,ft,mt,_t,Be,xe,fe,gt,qe,Fe,We,ye={},ke=[],sn=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,Se=Array.isArray;function K(t,e){for(var n in e)t[n]=e[n];return t}function je(t){t&&t.parentNode&&t.parentNode.removeChild(t)}function vt(t,e,n){var r,i,o,a={};for(o in e)o=="key"?r=e[o]:o=="ref"?i=e[o]:a[o]=e[o];if(arguments.length>2&&(a.children=arguments.length>3?q.call(arguments,2):n),typeof t=="function"&&t.defaultProps!=null)for(o in t.defaultProps)a[o]===void 0&&(a[o]=t.defaultProps[o]);return $e(t,a,r,i,null)}function $e(t,e,n,r,i){var o={type:t,props:e,key:n,ref:r,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:i??++pt,__i:-1,__u:0};return i==null&&w.vnode!=null&&w.vnode(o),o}function te(t){return t.children}function me(t,e){this.props=t,this.context=e}function oe(t,e){if(e==null)return t.__?oe(t.__,t.__i+1):null;for(var n;e<t.__k.length;e++)if((n=t.__k[e])!=null&&n.__e!=null)return n.__e;return typeof t.type=="function"?oe(t):null}function ln(t){if(t.__P&&t.__d){var e=t.__v,n=e.__e,r=[],i=[],o=K({},e);o.__v=e.__v+1,w.vnode&&w.vnode(o),Ge(t.__P,o,e,t.__n,t.__P.namespaceURI,32&e.__u?[n]:null,r,n??oe(e),!!(32&e.__u),i),o.__v=e.__v,o.__.__k[o.__i]=o,$t(r,o,i),e.__e=e.__=null,o.__e!=n&&bt(o)}}function bt(t){if((t=t.__)!=null&&t.__c!=null)return t.__e=t.__c.base=null,t.__k.some(function(e){if(e!=null&&e.__e!=null)return t.__e=t.__c.base=e.__e}),bt(t)}function wt(t){(!t.__d&&(t.__d=!0)&&Z.push(t)&&!Te.__r++||ft!=w.debounceRendering)&&((ft=w.debounceRendering)||mt)(Te)}function Te(){try{for(var t,e=1;Z.length;)Z.length>e&&Z.sort(_t),t=Z.shift(),e=Z.length,ln(t)}finally{Z.length=Te.__r=0}}function xt(t,e,n,r,i,o,a,c,u,s,p){var l,m,h,k,N,R,b,y=r&&r.__k||ke,z=e.length;for(u=cn(n,e,y,u,z),l=0;l<z;l++)(h=n.__k[l])!=null&&(m=h.__i!=-1&&y[h.__i]||ye,h.__i=l,R=Ge(t,h,m,i,o,a,c,u,s,p),k=h.__e,h.ref&&m.ref!=h.ref&&(m.ref&&Ke(m.ref,null,h),p.push(h.ref,h.__c||k,h)),N==null&&k!=null&&(N=k),(b=!!(4&h.__u))||m.__k===h.__k?(u=yt(h,u,t,b),b&&m.__e&&(m.__e=null)):typeof h.type=="function"&&R!==void 0?u=R:k&&(u=k.nextSibling),h.__u&=-7);return n.__e=N,u}function cn(t,e,n,r,i){var o,a,c,u,s,p=n.length,l=p,m=0;for(t.__k=new Array(i),o=0;o<i;o++)(a=e[o])!=null&&typeof a!="boolean"&&typeof a!="function"?(typeof a=="string"||typeof a=="number"||typeof a=="bigint"||a.constructor==String?a=t.__k[o]=$e(null,a,null,null,null):Se(a)?a=t.__k[o]=$e(te,{children:a},null,null,null):a.constructor===void 0&&a.__b>0?a=t.__k[o]=$e(a.type,a.props,a.key,a.ref?a.ref:null,a.__v):t.__k[o]=a,u=o+m,a.__=t,a.__b=t.__b+1,c=null,(s=a.__i=un(a,n,u,l))!=-1&&(l--,(c=n[s])&&(c.__u|=2)),c==null||c.__v==null?(s==-1&&(i>p?m--:i<p&&m++),typeof a.type!="function"&&(a.__u|=4)):s!=u&&(s==u-1?m--:s==u+1?m++:(s>u?m--:m++,a.__u|=4))):t.__k[o]=null;if(l)for(o=0;o<p;o++)(c=n[o])!=null&&!(2&c.__u)&&(c.__e==r&&(r=oe(c)),Ct(c,c));return r}function yt(t,e,n,r){var i,o;if(typeof t.type=="function"){for(i=t.__k,o=0;i&&o<i.length;o++)i[o]&&(i[o].__=t,e=yt(i[o],e,n,r));return e}t.__e!=e&&(r&&(e&&t.type&&!e.parentNode&&(e=oe(t)),n.insertBefore(t.__e,e||null)),e=t.__e);do e=e&&e.nextSibling;while(e!=null&&e.nodeType==8);return e}function un(t,e,n,r){var i,o,a,c=t.key,u=t.type,s=e[n],p=s!=null&&(2&s.__u)==0;if(s===null&&c==null||p&&c==s.key&&u==s.type)return n;if(r>(p?1:0)){for(i=n-1,o=n+1;i>=0||o<e.length;)if((s=e[a=i>=0?i--:o++])!=null&&!(2&s.__u)&&c==s.key&&u==s.type)return a}return-1}function kt(t,e,n){e[0]=="-"?t.setProperty(e,n??""):t[e]=n==null?"":typeof n!="number"||sn.test(e)?n:n+"px"}function Ce(t,e,n,r,i){var o,a;e:if(e=="style")if(typeof n=="string")t.style.cssText=n;else{if(typeof r=="string"&&(t.style.cssText=r=""),r)for(e in r)n&&e in n||kt(t.style,e,"");if(n)for(e in n)r&&n[e]==r[e]||kt(t.style,e,n[e])}else if(e[0]=="o"&&e[1]=="n")o=e!=(e=e.replace(gt,"$1")),a=e.toLowerCase(),e=a in t||e=="onFocusOut"||e=="onFocusIn"?a.slice(2):e.slice(2),t.l||(t.l={}),t.l[e+o]=n,n?r?n[fe]=r[fe]:(n[fe]=qe,t.addEventListener(e,o?We:Fe,o)):t.removeEventListener(e,o?We:Fe,o);else{if(i=="http://www.w3.org/2000/svg")e=e.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(e!="width"&&e!="height"&&e!="href"&&e!="list"&&e!="form"&&e!="tabIndex"&&e!="download"&&e!="rowSpan"&&e!="colSpan"&&e!="role"&&e!="popover"&&e in t)try{t[e]=n??"";break e}catch{}typeof n=="function"||(n==null||n===!1&&e[4]!="-"?t.removeAttribute(e):t.setAttribute(e,e=="popover"&&n==1?"":n))}}function St(t){return function(e){if(this.l){var n=this.l[e.type+t];if(e[xe]==null)e[xe]=qe++;else if(e[xe]<n[fe])return;return n(w.event?w.event(e):e)}}}function Ge(t,e,n,r,i,o,a,c,u,s){var p,l,m,h,k,N,R,b,y,z,F,j,g,v,P,$=e.type;if(e.constructor!==void 0)return null;128&n.__u&&(u=!!(32&n.__u),o=[c=e.__e=n.__e]),(p=w.__b)&&p(e);e:if(typeof $=="function")try{if(b=e.props,y=$.prototype&&$.prototype.render,z=(p=$.contextType)&&r[p.__c],F=p?z?z.props.value:p.__:r,n.__c?R=(l=e.__c=n.__c).__=l.__E:(y?e.__c=l=new $(b,F):(e.__c=l=new me(b,F),l.constructor=$,l.render=pn),z&&z.sub(l),l.state||(l.state={}),l.__n=r,m=l.__d=!0,l.__h=[],l._sb=[]),y&&l.__s==null&&(l.__s=l.state),y&&$.getDerivedStateFromProps!=null&&(l.__s==l.state&&(l.__s=K({},l.__s)),K(l.__s,$.getDerivedStateFromProps(b,l.__s))),h=l.props,k=l.state,l.__v=e,m)y&&$.getDerivedStateFromProps==null&&l.componentWillMount!=null&&l.componentWillMount(),y&&l.componentDidMount!=null&&l.__h.push(l.componentDidMount);else{if(y&&$.getDerivedStateFromProps==null&&b!==h&&l.componentWillReceiveProps!=null&&l.componentWillReceiveProps(b,F),e.__v==n.__v||!l.__e&&l.shouldComponentUpdate!=null&&l.shouldComponentUpdate(b,l.__s,F)===!1){e.__v!=n.__v&&(l.props=b,l.state=l.__s,l.__d=!1),e.__e=n.__e,e.__k=n.__k,e.__k.some(function(x){x&&(x.__=e)}),ke.push.apply(l.__h,l._sb),l._sb=[],l.__h.length&&a.push(l);break e}l.componentWillUpdate!=null&&l.componentWillUpdate(b,l.__s,F),y&&l.componentDidUpdate!=null&&l.__h.push(function(){l.componentDidUpdate(h,k,N)})}if(l.context=F,l.props=b,l.__P=t,l.__e=!1,j=w.__r,g=0,y)l.state=l.__s,l.__d=!1,j&&j(e),p=l.render(l.props,l.state,l.context),ke.push.apply(l.__h,l._sb),l._sb=[];else do l.__d=!1,j&&j(e),p=l.render(l.props,l.state,l.context),l.state=l.__s;while(l.__d&&++g<25);l.state=l.__s,l.getChildContext!=null&&(r=K(K({},r),l.getChildContext())),y&&!m&&l.getSnapshotBeforeUpdate!=null&&(N=l.getSnapshotBeforeUpdate(h,k)),v=p!=null&&p.type===te&&p.key==null?Tt(p.props.children):p,c=xt(t,Se(v)?v:[v],e,n,r,i,o,a,c,u,s),l.base=e.__e,e.__u&=-161,l.__h.length&&a.push(l),R&&(l.__E=l.__=null)}catch(x){if(e.__v=null,u||o!=null)if(x.then){for(e.__u|=u?160:128;c&&c.nodeType==8&&c.nextSibling;)c=c.nextSibling;o[o.indexOf(c)]=null,e.__e=c}else{for(P=o.length;P--;)je(o[P]);Xe(e)}else e.__e=n.__e,e.__k=n.__k,x.then||Xe(e);w.__e(x,e,n)}else o==null&&e.__v==n.__v?(e.__k=n.__k,e.__e=n.__e):c=e.__e=dn(n.__e,e,n,r,i,o,a,u,s);return(p=w.diffed)&&p(e),128&e.__u?void 0:c}function Xe(t){t&&(t.__c&&(t.__c.__e=!0),t.__k&&t.__k.some(Xe))}function $t(t,e,n){for(var r=0;r<n.length;r++)Ke(n[r],n[++r],n[++r]);w.__c&&w.__c(e,t),t.some(function(i){try{t=i.__h,i.__h=[],t.some(function(o){o.call(i)})}catch(o){w.__e(o,i.__v)}})}function Tt(t){return typeof t!="object"||t==null||t.__b>0?t:Se(t)?t.map(Tt):K({},t)}function dn(t,e,n,r,i,o,a,c,u){var s,p,l,m,h,k,N,R=n.props||ye,b=e.props,y=e.type;if(y=="svg"?i="http://www.w3.org/2000/svg":y=="math"?i="http://www.w3.org/1998/Math/MathML":i||(i="http://www.w3.org/1999/xhtml"),o!=null){for(s=0;s<o.length;s++)if((h=o[s])&&"setAttribute"in h==!!y&&(y?h.localName==y:h.nodeType==3)){t=h,o[s]=null;break}}if(t==null){if(y==null)return document.createTextNode(b);t=document.createElementNS(i,y,b.is&&b),c&&(w.__m&&w.__m(e,o),c=!1),o=null}if(y==null)R===b||c&&t.data==b||(t.data=b);else{if(o=o&&q.call(t.childNodes),!c&&o!=null)for(R={},s=0;s<t.attributes.length;s++)R[(h=t.attributes[s]).name]=h.value;for(s in R)h=R[s],s=="dangerouslySetInnerHTML"?l=h:s=="children"||s in b||s=="value"&&"defaultValue"in b||s=="checked"&&"defaultChecked"in b||Ce(t,s,null,h,i);for(s in b)h=b[s],s=="children"?m=h:s=="dangerouslySetInnerHTML"?p=h:s=="value"?k=h:s=="checked"?N=h:c&&typeof h!="function"||R[s]===h||Ce(t,s,h,R[s],i);if(p)c||l&&(p.__html==l.__html||p.__html==t.innerHTML)||(t.innerHTML=p.__html),e.__k=[];else if(l&&(t.innerHTML=""),xt(e.type=="template"?t.content:t,Se(m)?m:[m],e,n,r,y=="foreignObject"?"http://www.w3.org/1999/xhtml":i,o,a,o?o[0]:n.__k&&oe(n,0),c,u),o!=null)for(s=o.length;s--;)je(o[s]);c||(s="value",y=="progress"&&k==null?t.removeAttribute("value"):k!=null&&(k!==t[s]||y=="progress"&&!k||y=="option"&&k!=R[s])&&Ce(t,s,k,R[s],i),s="checked",N!=null&&N!=t[s]&&Ce(t,s,N,R[s],i))}return t}function Ke(t,e,n){try{if(typeof t=="function"){var r=typeof t.__u=="function";r&&t.__u(),r&&e==null||(t.__u=t(e))}else t.current=e}catch(i){w.__e(i,n)}}function Ct(t,e,n){var r,i;if(w.unmount&&w.unmount(t),(r=t.ref)&&(r.current&&r.current!=t.__e||Ke(r,null,e)),(r=t.__c)!=null){if(r.componentWillUnmount)try{r.componentWillUnmount()}catch(o){w.__e(o,e)}r.base=r.__P=null}if(r=t.__k)for(i=0;i<r.length;i++)r[i]&&Ct(r[i],e,n||typeof t.type!="function");n||je(t.__e),t.__c=t.__=t.__e=void 0}function pn(t,e,n){return this.constructor(t,n)}function hn(t,e,n){var r,i,o,a;e==document&&(e=document.documentElement),w.__&&w.__(t,e),i=(r=!1)?null:e.__k,o=[],a=[],Ge(e,t=e.__k=vt(te,null,[t]),i||ye,ye,e.namespaceURI,i?null:e.firstChild?q.call(e.childNodes):null,o,i?i.__e:e.firstChild,r,a),$t(o,t,a)}q=ke.slice,w={__e:function(t,e,n,r){for(var i,o,a;e=e.__;)if((i=e.__c)&&!i.__)try{if((o=i.constructor)&&o.getDerivedStateFromError!=null&&(i.setState(o.getDerivedStateFromError(t)),a=i.__d),i.componentDidCatch!=null&&(i.componentDidCatch(t,r||{}),a=i.__d),a)return i.__E=i}catch(c){t=c}throw t}},pt=0,ht=function(t){return t!=null&&t.constructor===void 0},me.prototype.setState=function(t,e){var n;n=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=K({},this.state),typeof t=="function"&&(t=t(K({},n),this.props)),t&&K(n,t),t!=null&&this.__v&&(e&&this._sb.push(e),wt(this))},me.prototype.forceUpdate=function(t){this.__v&&(this.__e=!0,t&&this.__h.push(t),wt(this))},me.prototype.render=te,Z=[],mt=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,_t=function(t,e){return t.__v.__b-e.__v.__b},Te.__r=0,Be=Math.random().toString(8),xe="__d"+Be,fe="__a"+Be,gt=/(PointerCapture)$|Capture$/i,qe=0,Fe=St(!1),We=St(!0);var fn=0;function d(t,e,n,r,i,o){e||(e={});var a,c,u=e;if("ref"in u)for(c in u={},e)c=="ref"?a=e[c]:u[c]=e[c];var s={type:t,props:u,key:n,ref:a,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:--fn,__i:-1,__u:0,__source:i,__self:o};if(typeof t=="function"&&(a=t.defaultProps))for(c in a)u[c]===void 0&&(u[c]=a[c]);return w.vnode&&w.vnode(s),s}var ie,E,Ve,Pt,Pe=0,At=[],U=w,Et=U.__b,Rt=U.__r,Ut=U.diffed,Lt=U.__c,Mt=U.unmount,Ot=U.__;function Ae(t,e){U.__h&&U.__h(E,t,Pe||e),Pe=0;var n=E.__H||(E.__H={__:[],__h:[]});return t>=n.__.length&&n.__.push({}),n.__[t]}function V(t){return Pe=1,mn(It,t)}function mn(t,e,n){var r=Ae(ie++,2);if(r.t=t,!r.__c&&(r.__=[It(void 0,e),function(c){var u=r.__N?r.__N[0]:r.__[0],s=r.t(u,c);u!==s&&(r.__N=[s,r.__[1]],r.__c.setState({}))}],r.__c=E,!E.__f)){var i=function(c,u,s){if(!r.__c.__H)return!0;var p=r.__c.__H.__.filter(function(m){return m.__c});if(p.every(function(m){return!m.__N}))return!o||o.call(this,c,u,s);var l=r.__c.props!==c;return p.some(function(m){if(m.__N){var h=m.__[0];m.__=m.__N,m.__N=void 0,h!==m.__[0]&&(l=!0)}}),o&&o.call(this,c,u,s)||l};E.__f=!0;var o=E.shouldComponentUpdate,a=E.componentWillUpdate;E.componentWillUpdate=function(c,u,s){if(this.__e){var p=o;o=void 0,i(c,u,s),o=p}a&&a.call(this,c,u,s)},E.shouldComponentUpdate=i}return r.__N||r.__}function ae(t,e){var n=Ae(ie++,3);!U.__s&&Qe(n.__H,e)&&(n.__=t,n.u=e,E.__H.__h.push(n))}function _n(t,e){var n=Ae(ie++,4);!U.__s&&Qe(n.__H,e)&&(n.__=t,n.u=e,E.__h.push(n))}function Ye(t){return Pe=5,Je(function(){return{current:t}},[])}function Je(t,e){var n=Ae(ie++,7);return Qe(n.__H,e)&&(n.__=t(),n.__H=e,n.__h=t),n.__}function gn(){for(var t;t=At.shift();){var e=t.__H;if(t.__P&&e)try{e.__h.some(Ee),e.__h.some(Ze),e.__h=[]}catch(n){e.__h=[],U.__e(n,t.__v)}}}U.__b=function(t){E=null,Et&&Et(t)},U.__=function(t,e){t&&e.__k&&e.__k.__m&&(t.__m=e.__k.__m),Ot&&Ot(t,e)},U.__r=function(t){Rt&&Rt(t),ie=0;var e=(E=t.__c).__H;e&&(Ve===E?(e.__h=[],E.__h=[],e.__.some(function(n){n.__N&&(n.__=n.__N),n.u=n.__N=void 0})):(e.__h.some(Ee),e.__h.some(Ze),e.__h=[],ie=0)),Ve=E},U.diffed=function(t){Ut&&Ut(t);var e=t.__c;e&&e.__H&&(e.__H.__h.length&&(At.push(e)!==1&&Pt===U.requestAnimationFrame||((Pt=U.requestAnimationFrame)||vn)(gn)),e.__H.__.some(function(n){n.u&&(n.__H=n.u),n.u=void 0})),Ve=E=null},U.__c=function(t,e){e.some(function(n){try{n.__h.some(Ee),n.__h=n.__h.filter(function(r){return!r.__||Ze(r)})}catch(r){e.some(function(i){i.__h&&(i.__h=[])}),e=[],U.__e(r,n.__v)}}),Lt&&Lt(t,e)},U.unmount=function(t){Mt&&Mt(t);var e,n=t.__c;n&&n.__H&&(n.__H.__.some(function(r){try{Ee(r)}catch(i){e=i}}),n.__H=void 0,e&&U.__e(e,n.__v))};var Nt=typeof requestAnimationFrame=="function";function vn(t){var e,n=function(){clearTimeout(r),Nt&&cancelAnimationFrame(e),setTimeout(t)},r=setTimeout(n,35);Nt&&(e=requestAnimationFrame(n))}function Ee(t){var e=E,n=t.__c;typeof n=="function"&&(t.__c=void 0,n()),E=e}function Ze(t){var e=E;t.__c=t.__(),E=e}function Qe(t,e){return!t||t.length!==e.length||e.some(function(n,r){return n!==t[r]})}function It(t,e){return typeof e=="function"?e(t):e}var bn=Symbol.for("preact-signals");function Re(){if(Y>1)Y--;else{var t,e=!1;for(function(){var i=Le;for(Le=void 0;i!==void 0;)i.S.v===i.v&&(i.S.i=i.i),i=i.o}();_e!==void 0;){var n=_e;for(_e=void 0,Ue++;n!==void 0;){var r=n.u;if(n.u=void 0,n.f&=-3,!(8&n.f)&&Dt(n))try{n.c()}catch(i){e||(t=i,e=!0)}n=r}}if(Ue=0,Y--,e)throw t}}function Q(t){if(Y>0)return t();et=++wn,Y++;try{return t()}finally{Re()}}var S=void 0;function Ht(t){var e=S;S=void 0;try{return t()}finally{S=e}}var _e=void 0,Y=0,Ue=0,wn=0,et=0,Le=void 0,Me=0;function zt(t){if(S!==void 0){var e=t.n;if(e===void 0||e.t!==S)return e={i:0,S:t,p:S.s,n:void 0,t:S,e:void 0,x:void 0,r:e},S.s!==void 0&&(S.s.n=e),S.s=e,t.n=e,32&S.f&&t.S(e),e;if(e.i===-1)return e.i=0,e.n!==void 0&&(e.n.p=e.p,e.p!==void 0&&(e.p.n=e.n),e.p=S.s,e.n=void 0,S.s.n=e,S.s=e),e}}function M(t,e){this.v=t,this.i=0,this.n=void 0,this.t=void 0,this.l=0,this.W=e==null?void 0:e.watched,this.Z=e==null?void 0:e.unwatched,this.name=e==null?void 0:e.name}M.prototype.brand=bn,M.prototype.h=function(){return!0},M.prototype.S=function(t){var e=this,n=this.t;n!==t&&t.e===void 0&&(t.x=n,this.t=t,n!==void 0?n.e=t:Ht(function(){var r;(r=e.W)==null||r.call(e)}))},M.prototype.U=function(t){var e=this;if(this.t!==void 0){var n=t.e,r=t.x;n!==void 0&&(n.x=r,t.e=void 0),r!==void 0&&(r.e=n,t.x=void 0),t===this.t&&(this.t=r,r===void 0&&Ht(function(){var i;(i=e.Z)==null||i.call(e)}))}},M.prototype.subscribe=function(t){var e=this;return ge(function(){var n=e.value,r=S;S=void 0;try{t(n)}finally{S=r}},{name:"sub"})},M.prototype.valueOf=function(){return this.value},M.prototype.toString=function(){return this.value+""},M.prototype.toJSON=function(){return this.value},M.prototype.peek=function(){var t=S;S=void 0;try{return this.value}finally{S=t}},Object.defineProperty(M.prototype,"value",{get:function(){var t=zt(this);return t!==void 0&&(t.i=this.i),this.v},set:function(t){if(t!==this.v){if(Ue>100)throw new Error("Cycle detected");(function(n){Y!==0&&Ue===0&&n.l!==et&&(n.l=et,Le={S:n,v:n.v,i:n.i,o:Le})})(this),this.v=t,this.i++,Me++,Y++;try{for(var e=this.t;e!==void 0;e=e.x)e.t.N()}finally{Re()}}}});function C(t,e){return new M(t,e)}function Dt(t){for(var e=t.s;e!==void 0;e=e.n)if(e.S.i!==e.i||!e.S.h()||e.S.i!==e.i)return!0;return!1}function Bt(t){for(var e=t.s;e!==void 0;e=e.n){var n=e.S.n;if(n!==void 0&&(e.r=n),e.S.n=e,e.i=-1,e.n===void 0){t.s=e;break}}}function qt(t){for(var e=t.s,n=void 0;e!==void 0;){var r=e.p;e.i===-1?(e.S.U(e),r!==void 0&&(r.n=e.n),e.n!==void 0&&(e.n.p=r)):n=e,e.S.n=e.r,e.r!==void 0&&(e.r=void 0),e=r}t.s=n}function ne(t,e){M.call(this,void 0),this.x=t,this.s=void 0,this.g=Me-1,this.f=4,this.W=e==null?void 0:e.watched,this.Z=e==null?void 0:e.unwatched,this.name=e==null?void 0:e.name}ne.prototype=new M,ne.prototype.h=function(){if(this.f&=-3,1&this.f)return!1;if((36&this.f)==32||(this.f&=-5,this.g===Me))return!0;if(this.g=Me,this.f|=1,this.i>0&&!Dt(this))return this.f&=-2,!0;var t=S;try{Bt(this),S=this;var e=this.x();(16&this.f||this.v!==e||this.i===0)&&(this.v=e,this.f&=-17,this.i++)}catch(n){this.v=n,this.f|=16,this.i++}return S=t,qt(this),this.f&=-2,!0},ne.prototype.S=function(t){if(this.t===void 0){this.f|=36;for(var e=this.s;e!==void 0;e=e.n)e.S.S(e)}M.prototype.S.call(this,t)},ne.prototype.U=function(t){if(this.t!==void 0&&(M.prototype.U.call(this,t),this.t===void 0)){this.f&=-33;for(var e=this.s;e!==void 0;e=e.n)e.S.U(e)}},ne.prototype.N=function(){if(!(2&this.f)){this.f|=6;for(var t=this.t;t!==void 0;t=t.x)t.t.N()}},Object.defineProperty(ne.prototype,"value",{get:function(){if(1&this.f)throw new Error("Cycle detected");var t=zt(this);if(this.h(),t!==void 0&&(t.i=this.i),16&this.f)throw this.v;return this.v}});function tt(t,e){return new ne(t,e)}function Ft(t){var e=t.m;if(t.m=void 0,typeof e=="function"){Y++;var n=S;S=void 0;try{e()}catch(r){throw t.f&=-2,t.f|=8,nt(t),r}finally{S=n,Re()}}}function nt(t){for(var e=t.s;e!==void 0;e=e.n)e.S.U(e);t.x=void 0,t.s=void 0,Ft(t)}function xn(t){if(S!==this)throw new Error("Out-of-order effect");qt(this),S=t,this.f&=-2,8&this.f&&nt(this),Re()}function se(t,e){this.x=t,this.m=void 0,this.s=void 0,this.u=void 0,this.f=32,this.name=e==null?void 0:e.name}se.prototype.c=function(){var t=this.S();try{if(8&this.f||this.x===void 0)return;var e=this.x();typeof e=="function"&&(this.m=e)}finally{t()}},se.prototype.S=function(){if(1&this.f)throw new Error("Cycle detected");this.f|=1,this.f&=-9,Ft(this),Bt(this),Y++;var t=S;return S=this,xn.bind(this,t)},se.prototype.N=function(){2&this.f||(this.f|=2,this.u=_e,_e=this)},se.prototype.d=function(){this.f|=8,1&this.f||nt(this)},se.prototype.dispose=function(){this.d()};function ge(t,e){var n=new se(t,e);try{n.c()}catch(i){throw n.d(),i}var r=n.d.bind(n);return r[Symbol.dispose]=r,r}var Wt,Oe,yn=typeof window<"u"&&!!window.__PREACT_SIGNALS_DEVTOOLS__,jt=[];ge(function(){Wt=this.N})();function le(t,e){w[t]=e.bind(null,w[t]||function(){})}function Ne(t){if(Oe){var e=Oe;Oe=void 0,e()}Oe=t&&t.S()}function Gt(t){var e=this,n=t.data,r=Sn(n);r.value=n;var i=Je(function(){for(var c=e,u=e.__v;u=u.__;)if(u.__c){u.__c.__$f|=4;break}var s=tt(function(){var h=r.value.value;return h===0?0:h===!0?"":h||""}),p=tt(function(){return!Array.isArray(s.value)&&!ht(s.value)}),l=ge(function(){if(this.N=Xt,p.value){var h=s.value;c.__v&&c.__v.__e&&c.__v.__e.nodeType===3&&(c.__v.__e.data=h)}}),m=e.__$u.d;return e.__$u.d=function(){l(),m.call(this)},[p,s]},[]),o=i[0],a=i[1];return o.value?a.peek():a.value}Gt.displayName="ReactiveTextNode",Object.defineProperties(M.prototype,{constructor:{configurable:!0,value:void 0},type:{configurable:!0,value:Gt},props:{configurable:!0,get:function(){var t=this;return{data:{get value(){return t.value}}}}},__b:{configurable:!0,value:1}}),le("__b",function(t,e){if(typeof e.type=="string"){var n,r=e.props;for(var i in r)if(i!=="children"){var o=r[i];o instanceof M&&(n||(e.__np=n={}),n[i]=o,r[i]=o.peek())}}t(e)}),le("__r",function(t,e){if(t(e),e.type!==te){Ne();var n,r=e.__c;r&&(r.__$f&=-2,(n=r.__$u)===void 0&&(r.__$u=n=function(i,o){var a;return ge(function(){a=this},{name:o}),a.c=i,a}(function(){var i;yn&&((i=n.y)==null||i.call(n)),r.__$f|=1,r.setState({})},typeof e.type=="function"?e.type.displayName||e.type.name:""))),Ne(n)}}),le("__e",function(t,e,n,r){Ne(),t(e,n,r)}),le("diffed",function(t,e){Ne();var n;if(typeof e.type=="string"&&(n=e.__e)){var r=e.__np,i=e.props;if(r){var o=n.U;if(o)for(var a in o){var c=o[a];c!==void 0&&!(a in r)&&(c.d(),o[a]=void 0)}else o={},n.U=o;for(var u in r){var s=o[u],p=r[u];s===void 0?(s=kn(n,u,p),o[u]=s):s.o(p,i)}for(var l in r)i[l]=r[l]}}t(e)});function kn(t,e,n,r){var i=e in t&&t.ownerSVGElement===void 0,o=C(n),a=n.peek();return{o:function(c,u){o.value=c,a=c.peek()},d:ge(function(){this.N=Xt;var c=o.value.value;a!==c?(a=void 0,i?t[e]=c:c!=null&&(c!==!1||e[4]==="-")?t.setAttribute(e,c):t.removeAttribute(e)):a=void 0})}}le("unmount",function(t,e){if(typeof e.type=="string"){var n=e.__e;if(n){var r=n.U;if(r){n.U=void 0;for(var i in r){var o=r[i];o&&o.d()}}}e.__np=void 0}else{var a=e.__c;if(a){var c=a.__$u;c&&(a.__$u=void 0,c.d())}}t(e)}),le("__h",function(t,e,n,r){(r<3||r===9)&&(e.__$f|=2),t(e,n,r)}),me.prototype.shouldComponentUpdate=function(t,e){if(this.__R)return!0;var n=this.__$u,r=n&&n.s!==void 0;for(var i in e)return!0;if(this.__f||typeof this.u=="boolean"&&this.u===!0){var o=2&this.__$f;if(!(r||o||4&this.__$f)||1&this.__$f)return!0}else if(!(r||4&this.__$f)||3&this.__$f)return!0;for(var a in t)if(a!=="__source"&&t[a]!==this.props[a])return!0;for(var c in this.props)if(!(c in t))return!0;return!1};function Sn(t,e){return Je(function(){return C(t,e)},[])}var $n=function(t){queueMicrotask(function(){queueMicrotask(t)})};function Tn(){Q(function(){for(var t;t=jt.shift();)Wt.call(t)})}function Xt(){jt.push(this)===1&&(w.requestAnimationFrame||$n)(Tn)}function Cn(){return{threads:C([]),locations:C(new Map),lastKnownLocations:C(new Map),confirmedOrphans:C(new Set),repliesByThread:C(new Map),mode:C("idle"),openThreadNumber:C(null),draft:C(null),currentUser:C(null),permissions:C(null),route:C(window.location.pathname),error:C(null),hoveredEl:C(null),showingSignIn:C(!1),collaborators:C([]),showPins:C(Ie("showPins",!0)),showResolved:C(Ie("showResolved",!1)),showList:C(Ie("showList",!1)),showTrigger:C(Ie("showTrigger",!0)),triggerHint:C(!1),pendingOpenThread:C(null)}}function Ie(t,e){try{const n=localStorage.getItem(`ux-companion:pref:${t}`);if(n==="true")return!0;if(n==="false")return!1}catch{}return e}function ve(t,e){try{localStorage.setItem(`ux-companion:pref:${t}`,String(e))}catch{}}function rt(t){var r;const e=t.envelope.anchor;if(e.route)return e.route;const n=e.url??"";return((r=n.split("?")[0])==null?void 0:r.split("#")[0])??n}function Pn(t){return tt(()=>{const e=t.route.value;return t.threads.value.filter(n=>rt(n)===e)})}const An=80,Kt=60;function En(t,e=new Date){const n=t.getBoundingClientRect(),r=Math.max(window.innerWidth,1),i=Math.max(window.innerHeight,1);return{url:Un(),route:Ln(),selector:Mn(t),textSnippet:it(t),rectRatio:{xPct:(n.left+window.scrollX)/r,yPct:(n.top+window.scrollY)/i,wPct:n.width/r,hPct:n.height/i},viewport:{w:r,h:i},createdAt:e.toISOString()}}function Rn(t,e=document){const n=In(t.selector,e);if(n)return Hn(n,t.textSnippet)?{status:"resolved",element:n,strategy:"selector+text"}:{status:"resolved",element:n,strategy:"selector"};const r=zn(t.textSnippet,e);if(r)return{status:"resolved",element:r,strategy:"text"};const i=Bn(t.rectRatio);return i?{status:"resolved",element:i,strategy:"rect"}:{status:"orphaned"}}function Un(){return window.location.pathname+window.location.search+window.location.hash}function Ln(){return window.location.pathname}function Mn(t){if(t.id&&Vt(t.id))return`#${ot(t.id)}`;const e=Nn(t);if(e)return`[${e.name}="${ot(e.value)}"]`;const n=[];let r=t;for(;r&&r.nodeType===1&&r!==document.documentElement;){const i=On(r);if(n.unshift(i),r.id&&Vt(r.id)){n[0]=`#${ot(r.id)}`;break}if(r=r.parentElement,n.length>=6)break}return n.join(" > ")||t.tagName.toLowerCase()}function On(t){const e=t.tagName.toLowerCase(),n=t.parentElement;if(!n)return e;const r=Array.from(n.children).filter(o=>o.tagName===t.tagName);if(r.length===1)return e;const i=r.indexOf(t)+1;return`${e}:nth-of-type(${i})`}function Vt(t){return!(t.length===0||t.length>64||/^(radix|mui|headlessui|rc)-/i.test(t)||/^:r[0-9a-z]+:/i.test(t)||/^[a-f0-9]{8,}$/i.test(t))}function Nn(t){for(const e of Array.from(t.attributes))if(e.name.startsWith("data-")&&e.name!=="data-ux-companion"&&!e.name.startsWith("data-reactroot")&&!(e.value.length===0||e.value.length>120))return{name:e.name,value:e.value};return null}function ot(t){return typeof CSS<"u"&&typeof CSS.escape=="function"?CSS.escape(t):t.replace(/([ #.;?+*~':"!^$[\]()=>|/@])/g,"\\$1")}function it(t){return(t.innerText??t.textContent??"").replace(/\s+/g," ").trim().slice(0,An)}function In(t,e){if(!t)return null;try{return e.querySelector(t)}catch{return null}}function Hn(t,e){return e?it(t)===e:!0}function zn(t,e){if(!t)return null;const n=e.querySelectorAll("*");let r=null,i=-1;for(const o of Array.from(n)){if(it(o)!==t)continue;const a=Dn(o);a>i&&(r=o,i=a)}return r}function Dn(t){let e=0,n=t;for(;n;)e+=1,n=n.parentElement;return e}function Bn(t){const e=Math.max(window.innerWidth,1),n=Math.max(window.innerHeight,1),r=t.xPct*e+t.wPct*e/2,i=t.yPct*n+t.hPct*n/2,o=Math.min(Math.max(r-window.scrollX,0),e-1),a=Math.min(Math.max(i-window.scrollY,0),n-1);let c=[];if(typeof document.elementsFromPoint=="function")c=document.elementsFromPoint(o,a);else if(typeof document.elementFromPoint=="function"){const u=document.elementFromPoint(o,a);u&&(c=[u])}for(const u of c){if(qn(u))continue;const s=u.getBoundingClientRect(),p=s.left+s.width/2,l=s.top+s.height/2;if(!(Math.abs(p-(r-window.scrollX))>Kt)&&!(Math.abs(l-(i-window.scrollY))>Kt))return u}return null}function qn(t){let e=t;for(;e;){if(e.hasAttribute&&e.hasAttribute("data-ux-companion"))return!0;e=e.parentElement}return!1}const at="ux-companion:token:";function st(t){try{return window.localStorage.getItem(at+t)}catch{return null}}function Fn(t,e){try{window.localStorage.setItem(at+t,e)}catch{}}function Wn(t){try{window.localStorage.removeItem(at+t)}catch{}}function jn(t){const e=new URL("https://github.com/settings/tokens/new");return e.searchParams.set("description",`UX Companion — ${t}`),e.searchParams.set("scopes","repo"),e.toString()}function Gn(t){const e=t.trim();return e?/\s/.test(e)?"Token shouldn't contain spaces — did you copy extra characters?":e.length<20?"That doesn't look like a GitHub token — it should be much longer.":null:"Paste your token above."}function Yt(t){const e=["pin"];return t.resolved&&e.push("resolved"),t.draft&&e.push("draft"),d("button",{"data-ux-companion":"pin",class:e.join(" "),style:{left:`${t.x}px`,top:`${t.y}px`},onClick:t.onClick,type:"button",children:t.label})}const lt="ux-companion",ct="<!-- ux-companion:v1",Jt="-->",J="https://api.github.com";function Zt(t){const[e,n,...r]=t.split("/");if(!e||!n||r.length>0)throw new Error(`Invalid repo reference "${t}"; expected "owner/repo".`);return{owner:e,repo:n}}class He{constructor(e,n){this.repo=e,this.token=n}async listThreads(){var i;const e=`
      query ListThreads($owner: String!, $name: String!, $cursor: String) {
        repository(owner: $owner, name: $name) {
          issues(
            first: 100
            after: $cursor
            states: [OPEN, CLOSED]
            orderBy: { field: CREATED_AT, direction: DESC }
          ) {
            pageInfo { hasNextPage endCursor }
            nodes {
              number
              title
              body
              state
              createdAt
              updatedAt
              url
              comments { totalCount }
              author {
                login
                avatarUrl
                ... on User { url }
              }
            }
          }
        }
      }`,n=[];let r=null;for(let o=0;o<10;o+=1){const c=(i=(await this.graphql(e,{owner:this.repo.owner,name:this.repo.repo,cursor:r})).repository)==null?void 0:i.issues;if(!c)break;for(const u of c.nodes??[]){const s=Kn(u.body??"");s&&n.push({number:u.number,title:u.title,body:u.body??"",messageBody:s.message,envelope:s.envelope,state:u.state.toLowerCase(),author:u.author?{login:u.author.login,avatarUrl:u.author.avatarUrl,htmlUrl:u.author.url??`https://github.com/${u.author.login}`}:null,createdAt:u.createdAt,updatedAt:u.updatedAt,url:u.url,commentCount:u.comments.totalCount})}if(!c.pageInfo.hasNextPage)break;r=c.pageInfo.endCursor}return n}async graphql(e,n){const r=await this.rawRequest(new URL(`${J}/graphql`),{method:"POST",body:JSON.stringify({query:e,variables:n})});if(!r.ok){const o=await r.text();throw new ut(r.status,o,"POST /graphql")}const i=await r.json();if(i.errors)throw new ut(200,JSON.stringify(i.errors),"POST /graphql (returned errors)");return i.data}async createThread(e){await this.ensureLabel();const n=Yn(e.envelope.anchor,e.message),r=Xn(e.message,e.envelope),i=new URL(`${J}/repos/${this.repo.owner}/${this.repo.repo}/issues`),o=await this.request(i,{method:"POST",body:JSON.stringify({title:n,body:r,labels:[lt]})});return{number:o.number,title:o.title,body:o.body??r,messageBody:e.message,envelope:e.envelope,state:o.state,author:ze(o.user),createdAt:o.created_at,updatedAt:o.updated_at,url:o.html_url,commentCount:o.comments}}async listReplies(e){const n=new URL(`${J}/repos/${this.repo.owner}/${this.repo.repo}/issues/${e}/comments`);return n.searchParams.set("per_page","100"),(await this.request(n,{method:"GET"})).map(i=>({id:i.id,body:i.body??"",author:ze(i.user),createdAt:i.created_at}))}async addReply(e,n){const r=new URL(`${J}/repos/${this.repo.owner}/${this.repo.repo}/issues/${e}/comments`),i=await this.request(r,{method:"POST",body:JSON.stringify({body:n})});return{id:i.id,body:i.body??"",author:ze(i.user),createdAt:i.created_at}}async setThreadState(e,n){const r=new URL(`${J}/repos/${this.repo.owner}/${this.repo.repo}/issues/${e}`);await this.request(r,{method:"PATCH",body:JSON.stringify({state:n})})}async probePermissions(){var r,i,o;const e=new URL(`${J}/repos/${this.repo.owner}/${this.repo.repo}`),n=await this.request(e,{method:"GET"});return{canWrite:!!((r=n.permissions)!=null&&r.pull||(i=n.permissions)!=null&&i.push||(o=n.permissions)!=null&&o.admin),isPrivate:!!n.private}}async currentUser(){if(!this.token)return null;const e=new URL(`${J}/user`);try{const n=await this.request(e,{method:"GET"});return ze(n)}catch{return null}}async listCollaborators(){var o;const e=`
      query Collaborators($owner: String!, $name: String!, $cursor: String) {
        repository(owner: $owner, name: $name) {
          collaborators(first: 100, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes { login avatarUrl url }
          }
        }
      }`,n=new Set,r=[];let i=null;try{for(let a=0;a<5;a+=1){const u=(o=(await this.graphql(e,{owner:this.repo.owner,name:this.repo.repo,cursor:i})).repository)==null?void 0:o.collaborators;if(!u)break;for(const s of u.nodes??[])!(s!=null&&s.login)||n.has(s.login)||(n.add(s.login),r.push({login:s.login,avatarUrl:s.avatarUrl,htmlUrl:s.url??`https://github.com/${s.login}`}));if(!u.pageInfo.hasNextPage)break;i=u.pageInfo.endCursor}}catch{}return r}async ensureLabel(){try{const e=new URL(`${J}/repos/${this.repo.owner}/${this.repo.repo}/labels/${lt}`),n=await this.rawRequest(e,{method:"GET"});if(n.ok||n.status!==404)return;const r=new URL(`${J}/repos/${this.repo.owner}/${this.repo.repo}/labels`);await this.rawRequest(r,{method:"POST",body:JSON.stringify({name:lt,color:"8b5cf6",description:"Thread created by UX Companion"})})}catch{}}async request(e,n){const r=await this.rawRequest(e,n);if(!r.ok){const i=await r.text();throw new ut(r.status,i,`${n.method??"GET"} ${e.pathname}`)}return await r.json()}async rawRequest(e,n){const r=new Headers(n.headers);return r.set("Accept","application/vnd.github+json"),r.set("X-GitHub-Api-Version","2022-11-28"),n.body&&!r.has("Content-Type")&&r.set("Content-Type","application/json"),this.token&&r.set("Authorization",`Bearer ${this.token}`),fetch(e.toString(),{...n,headers:r})}}class ut extends Error{constructor(e,n,r){super(`GitHub ${e} on ${r}: ${n.slice(0,200)}`),this.status=e,this.body=n,this.name="GitHubError"}}function Xn(t,e){const n=JSON.stringify(e);return`${t.trim()}

${ct}
${n}
${Jt}
`}function Kn(t){const e=t.indexOf(ct);if(e===-1)return null;const n=t.indexOf(Jt,e);if(n===-1)return null;const r=t.slice(e+ct.length,n).trim();let i;try{i=JSON.parse(r)}catch{return null}return Vn(i)?{message:t.slice(0,e).trim(),envelope:i}:null}function Vn(t){if(!t||typeof t!="object")return!1;const e=t;return typeof e.prototype=="string"&&!!e.anchor&&typeof e.anchor=="object"}function Yn(t,e){var i;const n=((i=e.trim().split(`
`)[0])==null?void 0:i.slice(0,60))||"Untitled",r=t.textSnippet?` on "${t.textSnippet.slice(0,30)}"`:"";return`${n}${r}`.slice(0,120)}function ze(t){return t?{login:t.login,avatarUrl:t.avatar_url,htmlUrl:t.html_url}:null}function Jn(t){const[e,n]=V(""),[r,i]=V(!1),[o,a]=V(null),c=async()=>{const u=Gn(e);if(u){a(u);return}a(null),i(!0);try{if(!await new He(Zt(t.repo),e.trim()).currentUser()){a("GitHub didn't recognize that token. Double-check you copied the whole thing."),i(!1);return}Fn(t.repo,e.trim()),t.onAuthed()}catch(s){a(s.message),i(!1)}};return d("div",{class:"pat-prompt",children:[d("div",{class:"pat-prompt-step",children:[d("span",{class:"pat-prompt-num",children:"1"}),d("div",{children:[d("a",{href:jn(t.repo),target:"_blank",rel:"noreferrer noopener",class:"pat-prompt-open",children:"Create a GitHub token →"}),d("div",{class:"pat-prompt-hint",children:["Opens GitHub with the right settings pre-filled. Pick an expiration (90 days is fine) and click ",d("strong",{children:"Generate token"}),"."]})]})]}),d("div",{class:"pat-prompt-step",children:[d("span",{class:"pat-prompt-num",children:"2"}),d("div",{style:{flex:1},children:[d("div",{class:"pat-prompt-hint",style:{marginBottom:6},children:"Paste the token here:"}),d("input",{type:"password",class:"pat-prompt-input",placeholder:"ghp_...",value:e,onInput:u=>n(u.target.value),onKeyDown:u=>{u.key==="Enter"&&c()},autoFocus:!0}),o&&d("div",{class:"pat-prompt-error",children:o})]})]}),d("div",{class:"pat-prompt-footer",children:[d("button",{type:"button",class:"pat-prompt-save",disabled:r||!e.trim(),onClick:c,children:r?"Checking…":"Save token"}),d("button",{type:"button",class:"pat-prompt-cancel",onClick:t.onCancel,children:"Cancel"})]})]})}const Zn=6;function Qn(t,e){if(!t.length)return[];const n=e.toLowerCase();if(!n)return t.slice(0,20);const r=[],i=[];for(const o of t){const a=o.login.toLowerCase();a.startsWith(n)?r.push(o):a.includes(n)&&i.push(o)}return[...r,...i].slice(0,20)}function er(t){if(t.users.length===0)return null;const e=t.users.slice(0,Zn);return d("div",{"data-ux-companion":"mention-picker",class:"mention-picker",onMouseDown:n=>n.preventDefault(),children:e.map((n,r)=>d("button",{type:"button",class:`mention-picker-row ${r===t.activeIndex?"active":""}`,onMouseEnter:()=>t.onHover(r),onClick:()=>t.onPick(n),children:[d("img",{class:"avatar",src:n.avatarUrl,alt:""}),d("span",{class:"mention-picker-login",children:n.login})]},n.login))})}function tr(t,e){let n=e-1;for(;n>=0;){const r=t[n];if(r==="@"){const i=n>0?t[n-1]:"";if(i&&/[\w@]/.test(i))return null;const o=t.slice(n+1,e);return/^[-A-Za-z0-9]*$/.test(o)?{query:o,start:n}:null}if(!/[-A-Za-z0-9]/.test(r??""))return null;n-=1}return null}const H=12,ce=340;function Qt(t){var x,A;const{anchorX:e,anchorY:n,thread:r,replies:i,state:o,client:a,canWrite:c,isAuthed:u}=t,[s,p]=V(""),[l,m]=V(!1),[h,k]=V(null),N=Ye(null),R=o.collaborators.value,b=h?Qn(R,h.query):[],y=(f,_)=>{if(R.length===0){k(null);return}const T=tr(f,_);if(!T){k(null);return}k(O=>({query:T.query,start:T.start,activeIndex:O&&O.start===T.start?Math.min(O.activeIndex,5):0}))},z=f=>{const _=N.current;if(!_||!h)return;const T=s.slice(0,h.start),O=_.selectionStart??s.length,D=s.slice(O),I=`@${f.login} `,B=`${T}${I}${D}`,be=T.length+I.length;p(B),k(null),queueMicrotask(()=>{_.focus();try{_.setSelectionRange(be,be)}catch{}})};ae(()=>{if(!r||o.repliesByThread.value.has(r.number))return;let f=!1;return a.listReplies(r.number).then(_=>{if(f)return;const T=new Map(o.repliesByThread.value);T.set(r.number,_),o.repliesByThread.value=T}).catch(_=>{o.error.value=_.message}),()=>{f=!0}},[r,a,o]);const F=async()=>{if(!(!r||!s.trim())){m(!0);try{const f=await a.addReply(r.number,s.trim()),_=new Map(o.repliesByThread.value),T=_.get(r.number)??[];_.set(r.number,[...T,f]),o.repliesByThread.value=_,o.threads.value=o.threads.value.map(O=>O.number===r.number?{...O,commentCount:O.commentCount+1}:O),p("")}catch(f){o.error.value=f.message}finally{m(!1)}}},j=async()=>{if(!(!s.trim()||!t.onSubmitFirst)){m(!0);try{await t.onSubmitFirst(s.trim()),p("")}finally{m(!1)}}},g=async()=>{if(r){m(!0);try{const f=r.state==="open"?"closed":"open";await a.setThreadState(r.number,f),o.threads.value=o.threads.value.map(_=>_.number===r.number?{..._,state:f}:_)}catch(f){o.error.value=f.message}finally{m(!1)}}},v=Ye(null),[P,$]=V(()=>({left:Math.min(Math.max(e+20,H),window.innerWidth-ce-H),top:Math.max(n-40,H)}));return _n(()=>{const f=v.current;if(!f)return;const T=f.getBoundingClientRect().height,O=window.innerWidth,D=window.innerHeight;if(t.anchorToListItem!=null){const re=f.getRootNode().querySelector(`[data-comment-list-item="${t.anchorToListItem}"]`);if(re){const he=re.getBoundingClientRect();let L=he.left-ce-8;L<H&&(L=he.right+8),L=Math.min(Math.max(L,H),O-ce-H);let G=he.top-8;G+T+H>D&&(G=D-T-H),G=Math.max(G,H),$({left:L,top:G});return}}let I=e+20;I+ce+H>O&&(I=e-ce-20),I=Math.min(Math.max(I,H),O-ce-H);let B=n-40;B+T+H>D&&(B=D-T-H),B=Math.max(B,H),$({left:I,top:B})},[e,n,r==null?void 0:r.number,i.length,o.showingSignIn.value,t.anchorToListItem]),d("div",{ref:v,"data-ux-companion":"popover",class:"popover",style:{left:`${P.left}px`,top:`${P.top}px`},children:[d("button",{class:"close",onClick:t.onClose,type:"button","aria-label":"Close",children:"×"}),r?d(te,{children:[d("h3",{children:d("a",{href:r.url,target:"_blank",rel:"noreferrer noopener",class:"thread-link",title:"Open issue on GitHub",children:["Thread #",r.number," ↗"]})}),d("div",{class:"thread-title",children:[r.title,r.state==="closed"&&d("span",{class:"resolved-chip",children:"Resolved"}),t.orphaned&&d("span",{class:"orphaned-chip",title:"The element this thread was anchored to is no longer on the page.",children:"⚠ Orphaned"})]}),d(en,{avatarUrl:(x=r.author)==null?void 0:x.avatarUrl,author:((A=r.author)==null?void 0:A.login)??"unknown",body:r.messageBody||"(no message)",createdAt:r.createdAt}),i.map(f=>{var _,T;return d(en,{avatarUrl:(_=f.author)==null?void 0:_.avatarUrl,author:((T=f.author)==null?void 0:T.login)??"unknown",body:f.body,createdAt:f.createdAt},f.id)})]}):d("h3",{children:"New thread"}),!u&&!o.showingSignIn.value&&d("div",{class:"signin-prompt",children:["Sign in with GitHub to comment.",d("br",{}),d("button",{onClick:t.onSignIn,type:"button",children:"Sign in with GitHub"})]}),!u&&o.showingSignIn.value&&d(Jn,{repo:t.repo,onAuthed:t.onAuthed,onCancel:t.onCancelSignIn}),u&&c&&d("div",{class:"composer",children:[d("div",{class:"composer-field",children:[d("textarea",{ref:N,placeholder:r?"Reply…":"What did you notice?",value:s,onInput:f=>{const _=f.target;p(_.value),y(_.value,_.selectionStart??_.value.length)},onKeyDown:f=>{if(!(!h||b.length===0))if(f.key==="ArrowDown")f.preventDefault(),k({...h,activeIndex:Math.min(b.length-1,h.activeIndex+1)});else if(f.key==="ArrowUp")f.preventDefault(),k({...h,activeIndex:Math.max(0,h.activeIndex-1)});else if(f.key==="Enter"||f.key==="Tab"){const _=b[h.activeIndex];_&&(f.preventDefault(),z(_))}else f.key==="Escape"&&(f.preventDefault(),k(null))},onKeyUp:f=>{const _=f.currentTarget;f.key!=="Escape"&&y(_.value,_.selectionStart??_.value.length)},onClick:f=>{const _=f.currentTarget;y(_.value,_.selectionStart??_.value.length)},onBlur:()=>{setTimeout(()=>k(null),120)}}),h&&b.length>0&&d(er,{users:b,query:h.query,activeIndex:Math.min(h.activeIndex,b.length-1),onPick:z,onHover:f=>k(_=>_&&{..._,activeIndex:f})})]}),d("div",{class:"actions",children:[d("button",{class:"primary",type:"button",disabled:l||!s.trim(),onClick:r?F:j,children:r?"Reply":"Post"}),r&&d("button",{class:"resolve",type:"button",disabled:l,onClick:g,children:r.state==="open"?"Resolve":"Reopen"})]})]}),u&&!c&&d("div",{class:"signin-prompt",children:"Your token doesn't have access to this repo's issues, so replies are disabled."})]})}function en(t){return d("div",{class:"message",children:[t.avatarUrl&&d("img",{class:"avatar",src:t.avatarUrl,alt:""}),d("div",{style:{flex:1},children:[d("div",{class:"meta",children:[d("strong",{children:t.author})," · ",nr(t.createdAt)]}),d("div",{class:"body",children:t.body})]})]})}function nr(t){try{return new Date(t).toLocaleString()}catch{return t}}function rr(t){const{rect:e}=t;return d("div",{"data-ux-companion":"highlight",class:"hover-highlight",style:{left:`${e.left}px`,top:`${e.top}px`,width:`${e.width}px`,height:`${e.height}px`}})}function or(t){const[e,n]=V(!1),r=Ye(null),i=()=>{r.current!=null&&clearTimeout(r.current),r.current=window.setTimeout(()=>n(!1),180)},o=()=>{r.current!=null&&(clearTimeout(r.current),r.current=null)};ae(()=>()=>{r.current!=null&&clearTimeout(r.current)},[]);const a=()=>{const p=!t.state.showPins.value;t.state.showPins.value=p,ve("showPins",p)},c=()=>{const p=!t.state.showResolved.value;t.state.showResolved.value=p,ve("showResolved",p)},u=()=>{const p=!t.state.showList.value;t.state.showList.value=p,ve("showList",p)},s=()=>{t.state.mode.value==="commenting"&&(t.state.mode.value="idle"),t.state.showTrigger.value=!1,ve("showTrigger",!1),t.state.triggerHint.value=!0,n(!1)};return d("div",{"data-ux-companion":"trigger-wrap",class:"trigger-wrap",onMouseEnter:()=>{o(),n(!0)},onMouseLeave:i,children:[e&&d("div",{class:"trigger-menu","data-ux-companion":"trigger-menu",children:[d("label",{class:"trigger-menu-row",children:[d("input",{type:"checkbox",checked:t.state.showPins.value,onChange:a}),d("span",{children:"Show comment pins"})]}),d("label",{class:`trigger-menu-row ${t.state.showPins.value?"":"disabled"}`,children:[d("input",{type:"checkbox",checked:t.state.showResolved.value,onChange:c,disabled:!t.state.showPins.value}),d("span",{children:"Show resolved comments"})]}),d("label",{class:"trigger-menu-row",children:[d("input",{type:"checkbox",checked:t.state.showList.value,onChange:u}),d("span",{children:"Show comments list"})]}),d("div",{class:"trigger-menu-sep"}),d("button",{type:"button",class:"trigger-menu-action",onClick:s,title:"Hide the floating comment button. Press C to bring it back.",children:[d("span",{children:"Hide comment button"}),d("kbd",{class:"trigger-menu-kbd",children:"C"})]}),t.user&&d(te,{children:[d("div",{class:"trigger-menu-sep"}),d("div",{class:"trigger-menu-user",children:[d("img",{class:"avatar",src:t.user.avatarUrl,alt:""}),d("div",{class:"trigger-menu-user-text",children:[d("div",{class:"trigger-menu-user-name",children:t.user.login}),d("button",{type:"button",class:"trigger-menu-signout",onClick:t.onSignOut,children:"Sign out"})]})]})]})]}),d("button",{"data-ux-companion":"trigger",class:`trigger ${t.active?"active":""}`,onClick:t.onClick,type:"button",title:t.user?`Signed in as ${t.user.login}`:"Click to comment",children:[t.active?"✕ Exit comment mode":"💬 Comment",t.user&&d("img",{class:"avatar",src:t.user.avatarUrl,alt:t.user.login})]})]})}function ir(t){const{state:e}=t,r=[...e.threads.value.filter(a=>a.state==="open"||e.showResolved.value)].sort((a,c)=>c.createdAt.localeCompare(a.createdAt)),i=e.openThreadNumber.value,o=e.confirmedOrphans.value;return d("div",{"data-ux-companion":"comment-list",class:"comment-list",children:[d("header",{class:"comment-list-header",children:[d("span",{class:"comment-list-title",children:"Comments"}),d("span",{class:"comment-list-count",children:r.length}),d("button",{type:"button",class:"comment-list-close","aria-label":"Close comments list",onClick:t.onClose,children:"×"})]}),d("div",{class:"comment-list-body",children:[r.length===0&&d("div",{class:"comment-list-empty",children:"No comments yet. Click the comment button to leave one."}),r.map(a=>d(ar,{thread:a,onPick:t.onPick,selected:a.number===i,orphaned:o.has(a.number)},a.number))]})]})}function ar(t){var c,u;const e=t.thread,n=((c=e.author)==null?void 0:c.login)??"unknown",r=(u=e.author)==null?void 0:u.avatarUrl,i=e.state==="closed",o=rt(e),a=["comment-list-item",i?"resolved":"",t.selected?"selected":""].filter(Boolean).join(" ");return d("button",{type:"button",class:a,"data-comment-list-item":e.number,"aria-current":t.selected?"true":void 0,onClick:()=>t.onPick(e),children:[r&&d("img",{class:"avatar",src:r,alt:""}),d("div",{class:"comment-list-item-body",children:[d("div",{class:"comment-list-item-meta",children:[d("strong",{children:n}),d("span",{class:"comment-list-item-time",children:sr(e.createdAt)}),i&&d("span",{class:"comment-list-resolved-chip",children:"Resolved"})]}),d("div",{class:"comment-list-item-text",children:e.messageBody||e.title}),d("div",{class:"comment-list-item-route",children:o}),t.orphaned&&d("div",{class:"comment-list-item-orphaned",title:"The element this thread was anchored to is no longer on the page.",children:"⚠ Orphaned"})]})]})}function sr(t){try{const e=new Date(t).getTime(),n=Date.now(),r=Math.max(0,n-e),i=60*1e3,o=60*i,a=24*o;return r<i?"just now":r<o?`${Math.floor(r/i)}m`:r<a?`${Math.floor(r/o)}h`:r<7*a?`${Math.floor(r/a)}d`:new Date(t).toLocaleDateString()}catch{return t}}function lr(t,e){if(t.size!==e.size)return!0;for(const n of t)if(!e.has(n))return!0;return!1}function cr(t){var j;const{state:e,client:n,repo:r,onTokenChange:i}=t,[,o]=V(0);ae(()=>{const g=()=>o(v=>v+1);return window.addEventListener("scroll",g,{passive:!0,capture:!0}),window.addEventListener("resize",g),()=>{window.removeEventListener("scroll",g,{capture:!0}),window.removeEventListener("resize",g)}},[]),ae(()=>{let g=0;const v=new Map,P=4,$=()=>{var he;const D=new Map,I=new Map(e.lastKnownLocations.value),B=new Set(e.confirmedOrphans.value),be=window.location.pathname;for(const L of e.threads.value){const G=Rn(L.envelope.anchor);if(G.status==="resolved"){const De=G.element.getBoundingClientRect(),dt={x:De.left+De.width/2,y:De.top+De.height/2,strategy:G.strategy,element:G.element};D.set(L.number,dt),I.set(L.number,{x:dt.x,y:dt.y}),v.delete(L.number),B.delete(L.number);continue}const on=L.envelope.anchor.route;if(on&&on!==be)continue;if(!I.has(L.number)){B.add(L.number);continue}const an=(v.get(L.number)??0)+1;v.set(L.number,an),an>=P&&B.add(L.number)}e.locations.value=D,e.lastKnownLocations.value=I,lr(B,e.confirmedOrphans.value)&&(e.confirmedOrphans.value=B);const re=e.pendingOpenThread.value;if(re!=null&&D.has(re)){const L=(he=D.get(re))==null?void 0:he.element;if(L&&typeof L.scrollIntoView=="function")try{L.scrollIntoView({block:"center",behavior:"smooth"})}catch{}Q(()=>{e.openThreadNumber.value=re,e.mode.value="thread-open",e.pendingOpenThread.value=null})}},x=()=>{cancelAnimationFrame(g),g=requestAnimationFrame($)};$();const A=e.threads.subscribe(()=>x()),f=new MutationObserver(x);f.observe(document.body,{childList:!0,subtree:!0,attributes:!0});const _=()=>{e.route.value=window.location.pathname,v.clear(),$()};window.addEventListener("popstate",_);const T=history.pushState.bind(history),O=history.replaceState.bind(history);return history.pushState=function(...I){T(...I),_()},history.replaceState=function(...I){O(...I),_()},()=>{f.disconnect(),cancelAnimationFrame(g),A(),window.removeEventListener("popstate",_),history.pushState=T,history.replaceState=O}},[e]),ae(()=>{const g=v=>{if(v.key!=="c"&&v.key!=="C"||v.metaKey||v.ctrlKey||v.altKey)return;const P=typeof v.composedPath=="function"?v.composedPath():[],$=P.length>0?P:[v.target];for(const A of $){if(!(A instanceof Element))continue;const f=A.tagName;if(f==="INPUT"||f==="TEXTAREA"||f==="SELECT"||A.isContentEditable)return}const x=!e.showTrigger.value;Q(()=>{e.showTrigger.value=x,x?e.triggerHint.value=!1:(e.openThreadNumber.value=null,e.draft.value=null,e.mode.value!=="idle"&&(e.mode.value="idle"))}),ve("showTrigger",x)};return window.addEventListener("keydown",g),()=>window.removeEventListener("keydown",g)},[e]),ae(()=>{if(e.mode.value!=="commenting")return;const g=$=>{const x=$.target;if(x){if(x.closest("[data-ux-companion]")){e.hoveredEl.value=null;return}e.hoveredEl.value=x}},v=$=>{const x=$.target;if(!x||x.closest("[data-ux-companion]"))return;$.preventDefault(),$.stopPropagation();const A=En(x),f=x.getBoundingClientRect();Q(()=>{e.draft.value={anchor:A,location:{x:f.left+f.width/2,y:f.top+f.height/2}},e.mode.value="new-pin-draft",e.hoveredEl.value=null})},P=$=>{$.key==="Escape"&&(e.mode.value="idle")};return document.addEventListener("mouseover",g,!0),document.addEventListener("click",v,!0),document.addEventListener("keydown",P,!0),()=>{document.removeEventListener("mouseover",g,!0),document.removeEventListener("click",v,!0),document.removeEventListener("keydown",P,!0)}},[e,e.mode.value]);const a=Pn(e).value,c=e.locations.value,u=e.hoveredEl.value,s=e.mode.value==="commenting",p=e.draft.value,l=e.openThreadNumber.value!=null?e.threads.value.find(g=>g.number===e.openThreadNumber.value)??null:null,m=()=>{e.showingSignIn.value=!0},h=()=>{e.showingSignIn.value=!1},k=()=>{e.showingSignIn.value=!1,i()},N=()=>{Wn(r),e.currentUser.value=null,i()},R=async g=>{var v;if(p)try{const P=await n.createThread({message:g,envelope:{anchor:p.anchor,prototype:r,createdBy:(v=e.currentUser.value)==null?void 0:v.login}});Q(()=>{e.threads.value=[P,...e.threads.value],e.draft.value=null,e.mode.value="thread-open",e.openThreadNumber.value=P.number})}catch(P){e.error.value=P.message}},b=g=>{Q(()=>{e.openThreadNumber.value=g.number,e.mode.value="thread-open"})},y=g=>{const v=rt(g),P=window.location.pathname;if(!e.confirmedOrphans.value.has(g.number)&&v&&v!==P){const A=g.envelope.anchor.url||v;try{history.pushState({},"",A)}catch{window.location.href=A;return}e.route.value=window.location.pathname,e.pendingOpenThread.value=g.number,window.dispatchEvent(new PopStateEvent("popstate"));return}const x=e.locations.value.get(g.number);if(x!=null&&x.element&&typeof x.element.scrollIntoView=="function")try{x.element.scrollIntoView({block:"center",behavior:"smooth"})}catch{}else{const A=e.lastKnownLocations.value.get(g.number);if(A)try{window.scrollTo({top:window.scrollY+A.y-window.innerHeight/2,behavior:"smooth"})}catch{}}b(g)},z=()=>{Q(()=>{e.openThreadNumber.value=null,e.mode.value==="thread-open"&&(e.mode.value="idle")})},F=s&&u?u.getBoundingClientRect():null;return d("div",{"data-ux-companion":"root",class:"layer",children:[s&&F&&d(rr,{rect:F}),e.showPins.value&&e.showTrigger.value&&a.map(g=>{const v=c.get(g.number);return!v||g.state==="closed"&&!e.showResolved.value?null:d(Yt,{x:v.x,y:v.y,resolved:g.state==="closed",label:String(g.commentCount+1),onClick:()=>b(g)},g.number)}),p&&d(Yt,{x:p.location.x,y:p.location.y,draft:!0,label:"+"}),p&&d(Qt,{anchorX:p.location.x,anchorY:p.location.y,title:"New thread",thread:null,replies:[],state:e,client:n,repo:r,canWrite:((j=e.permissions.value)==null?void 0:j.canWrite)??!1,isAuthed:!!e.currentUser.value,onSignIn:m,onCancelSignIn:h,onAuthed:k,onSubmitFirst:R,onClose:()=>{Q(()=>{e.draft.value=null,e.mode.value="idle"})}}),l&&!p&&(()=>{var T;const g=c.get(l.number),v=e.confirmedOrphans.value.has(l.number),P=e.showList.value&&e.showTrigger.value&&(v||!g),$=window.innerWidth/2,x=window.innerHeight/2,A=e.lastKnownLocations.value.get(l.number),f=(g==null?void 0:g.x)??(A==null?void 0:A.x)??$,_=(g==null?void 0:g.y)??(A==null?void 0:A.y)??x;return d(Qt,{anchorX:f,anchorY:_,title:l.title,thread:l,replies:e.repliesByThread.value.get(l.number)??[],state:e,client:n,repo:r,canWrite:((T=e.permissions.value)==null?void 0:T.canWrite)??!1,isAuthed:!!e.currentUser.value,orphaned:v,anchorToListItem:P?l.number:null,onSignIn:m,onCancelSignIn:h,onAuthed:k,onClose:z})})(),e.showList.value&&e.showTrigger.value&&d(ir,{state:e,onPick:y,onClose:()=>e.showList.value=!1}),e.showTrigger.value&&d(or,{active:s,user:e.currentUser.value,state:e,onClick:()=>{e.mode.value=s?"idle":"commenting"},onSignOut:N}),!e.showTrigger.value&&e.triggerHint.value&&d("div",{"data-ux-companion":"trigger-hint",class:"trigger-hint",role:"status",children:[d("span",{class:"trigger-hint-text",children:["Comment button hidden. Press ",d("kbd",{children:"C"})," to bring it back."]}),d("button",{type:"button",class:"trigger-hint-close","aria-label":"Dismiss",onClick:()=>e.triggerHint.value=!1,children:"×"})]}),e.error.value&&d("div",{class:"error-toast",onClick:()=>e.error.value=null,children:e.error.value})]})}const W={me:{login:"jfu",avatarUrl:"https://avatars.githubusercontent.com/u/1?v=4",htmlUrl:"https://github.com/jfu"},morgan:{login:"morgan",avatarUrl:"https://avatars.githubusercontent.com/u/2?v=4",htmlUrl:"https://github.com/morgan"},pat:{login:"pat",avatarUrl:"https://avatars.githubusercontent.com/u/3?v=4",htmlUrl:"https://github.com/pat"}};function ue(t,e=0){const n=Date.now()-t*864e5-e*36e5;return new Date(n).toISOString()}function de(t){return{url:t.url??window.location.pathname,route:t.route??window.location.pathname,selector:t.selector,textSnippet:t.textSnippet??"",rectRatio:t.rectRatio??{xPct:.5,yPct:.5,wPct:.1,hPct:.04},viewport:t.viewport??{w:1440,h:900},createdAt:t.createdAt??ue(1)}}function pe(t){const e=t.state??"open",n=W[t.author],r=t.replies??[],i=ue(t.createdDaysAgo);return{thread:{number:t.number,title:`${t.message.slice(0,60)} on "${t.anchor.textSnippet.slice(0,30)}"`,body:`${t.message}

<!-- ux-companion:v1 ... -->`,messageBody:t.message,envelope:{anchor:t.anchor,prototype:"mock/mock",createdBy:n.login},state:e,author:n,createdAt:i,updatedAt:i,url:`https://example.com/mock/issues/${t.number}`,commentCount:r.length},replies:r}}class ur extends He{constructor(){super({owner:"mock",repo:"mock"},"mock-token");we(this,"threads");we(this,"repliesByThread",new Map);we(this,"nextNumber");we(this,"nextCommentId",1e4);const n=pr();this.threads=n.map(r=>r.thread);for(const r of n)this.repliesByThread.set(r.thread.number,r.replies);this.nextNumber=Math.max(0,...this.threads.map(r=>r.number))+1}async listThreads(){return await ee(150),this.threads.slice().sort((n,r)=>r.createdAt.localeCompare(n.createdAt))}async createThread(n){await ee(80);const r=this.nextNumber++,i=new Date().toISOString(),o={number:r,title:n.message.slice(0,60),body:`${n.message}

<!-- ux-companion:v1 ... -->`,messageBody:n.message,envelope:n.envelope,state:"open",author:W.me,createdAt:i,updatedAt:i,url:`https://example.com/mock/issues/${r}`,commentCount:0};return this.threads.unshift(o),this.repliesByThread.set(r,[]),o}async listReplies(n){return await ee(60),this.repliesByThread.get(n)??[]}async addReply(n,r){await ee(80);const i={id:this.nextCommentId++,body:r,author:W.me,createdAt:new Date().toISOString()},o=this.repliesByThread.get(n)??[];this.repliesByThread.set(n,[...o,i]);const a=this.threads.find(c=>c.number===n);return a&&(a.commentCount+=1),i}async setThreadState(n,r){await ee(60);const i=this.threads.find(o=>o.number===n);i&&(i.state=r)}async probePermissions(){return await ee(40),{canWrite:!0,isPrivate:!1}}async currentUser(){return await ee(40),W.me}async listCollaborators(){return await ee(60),[W.me,W.morgan,W.pat]}}function dr(){return new ur}function ee(t){return new Promise(e=>setTimeout(e,t))}function pr(){const t=window.location.pathname;return[pe({number:101,message:"Can we A/B test this CTA color? The purple feels strong.",author:"morgan",createdDaysAgo:0,anchor:de({selector:"#save-btn",textSnippet:"Save changes",route:t}),replies:[{id:9001,body:"+1 — the accent is overpowering the rest of the toolbar.",author:W.pat,createdAt:ue(0,4)}]}),pe({number:102,message:"Active users count is formatted differently from Revenue — commas vs. dollar sign inconsistency.",author:"pat",createdDaysAgo:0,anchor:de({selector:".grid .card:nth-of-type(1) .num",textSnippet:"12,482",route:t})}),pe({number:103,message:"Resolved: we decided to keep the Trial pill amber.",author:"morgan",createdDaysAgo:3,state:"closed",anchor:de({selector:"table tbody tr:nth-of-type(2) .pill",textSnippet:"Trial",route:t}),replies:[{id:9010,body:"Yeah, leaving it as-is.",author:W.me,createdAt:ue(2,2)}]}),pe({number:104,message:"This page needs an empty state for when there are zero signups.",author:"pat",createdDaysAgo:2,anchor:de({selector:"#this-element-does-not-exist",textSnippet:"__ux_companion_mock_orphan_no_match__",rectRatio:{xPct:99,yPct:99,wPct:.01,hPct:.01},route:t})}),pe({number:105,message:"The Reports page heading should match the nav label exactly.",author:"morgan",createdDaysAgo:4,anchor:de({selector:"#reports-header",textSnippet:"Reports",route:"/reports",url:"/reports"})}),pe({number:106,message:"Welcome copy feels a little cold — can we personalize it more?",author:"pat",createdDaysAgo:1,anchor:de({selector:'[data-testid="page-title"]',textSnippet:"Welcome back, Jordan",route:t}),replies:[{id:9020,body:"What about showing the last-activity timestamp next to it?",author:W.morgan,createdAt:ue(0,8)},{id:9021,body:"Could work. Let's try it in the next round.",author:W.me,createdAt:ue(0,2)}]})]}const hr=`
:host {
  all: initial;
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483647;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  color: #111827;
}

* { box-sizing: border-box; }

.layer { position: fixed; inset: 0; pointer-events: none; }

.trigger-wrap {
  position: fixed;
  right: 16px;
  bottom: 16px;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.trigger-menu {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.14);
  padding: 6px;
  min-width: 220px;
  font-size: 13px;
  color: #111827;
}
.trigger-menu-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
}
.trigger-menu-row:hover { background: #f9fafb; }
.trigger-menu-row.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.trigger-menu-row.disabled:hover { background: transparent; }
.trigger-menu-row input[type="checkbox"] {
  accent-color: #8b5cf6;
  width: 14px;
  height: 14px;
  cursor: pointer;
}
.trigger-menu-row input[type="checkbox"]:disabled { cursor: not-allowed; }
.trigger-menu-sep {
  height: 1px;
  background: #f3f4f6;
  margin: 4px 0;
}
.trigger-menu-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
}
.trigger-menu-user .avatar { width: 28px; height: 28px; }
.trigger-menu-user-text { display: flex; flex-direction: column; gap: 2px; }
.trigger-menu-user-name { font-weight: 600; font-size: 13px; }
.trigger-menu-signout {
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  text-align: left;
}
.trigger-menu-signout:hover { color: #111827; }

.trigger-menu-action {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}
.trigger-menu-action:hover { background: #f9fafb; }
.trigger-menu-action > span { flex: 1; }
.trigger-menu-kbd,
.trigger-hint kbd {
  display: inline-block;
  min-width: 18px;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #374151;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  line-height: 1.4;
}

.trigger-hint {
  position: fixed;
  right: 16px;
  bottom: 16px;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #111827;
  color: white;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  font-size: 13px;
  max-width: 320px;
}
.trigger-hint kbd {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.24);
  color: white;
}
.trigger-hint-text { line-height: 1.4; }
.trigger-hint-close {
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.7);
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  padding: 0 2px;
}
.trigger-hint-close:hover { color: white; }

.trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  border: none;
  background: #8b5cf6;
  color: white;
  font-weight: 600;
  font-size: 13px;
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.35);
  cursor: pointer;
}
.trigger.active { background: #7c3aed; }
.trigger:hover { filter: brightness(1.05); }

.pin {
  position: absolute;
  width: 28px;
  height: 28px;
  margin-left: -14px;
  margin-top: -14px;
  border-radius: 999px;
  border: 2px solid white;
  background: #8b5cf6;
  color: white;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  cursor: pointer;
  pointer-events: auto;
  transition: transform 120ms ease;
}
.pin:hover { transform: scale(1.1); }
.pin.resolved { background: #10b981; }
.pin.draft { background: #f59e0b; animation: pulse 1.2s infinite; }

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}

.popover {
  position: absolute;
  width: 340px;
  max-height: 70vh;
  overflow: auto;
  padding: 12px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 12px 40px rgba(0,0,0,0.18);
  border: 1px solid rgba(0,0,0,0.06);
  pointer-events: auto;
}
.popover .close {
  position: absolute; top: 8px; right: 8px;
  border: none; background: transparent; cursor: pointer; color: #6b7280; font-size: 18px;
}
.popover h3 { margin: 0 0 6px; font-size: 13px; color: #6b7280; font-weight: 500; }
.popover h3 .thread-link {
  color: #6b7280;
  text-decoration: none;
}
.popover h3 .thread-link:hover {
  color: #8b5cf6;
  text-decoration: underline;
}
.popover .thread-title { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #111827; }
.popover .resolved-chip {
  display: inline-block; padding: 2px 8px; border-radius: 999px;
  background: #d1fae5; color: #065f46; font-size: 11px; margin-left: 6px;
}
.popover .orphaned-chip {
  display: inline-block; padding: 2px 8px; border-radius: 999px;
  background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 600; margin-left: 6px;
}

.message {
  padding: 8px 10px; border-radius: 8px; background: #f9fafb; margin-bottom: 8px;
  display: flex; gap: 8px; align-items: flex-start;
}
.message .meta { font-size: 11px; color: #6b7280; margin-bottom: 2px; }
.message .body { white-space: pre-wrap; word-wrap: break-word; font-size: 13px; color: #111827; }
.avatar { width: 24px; height: 24px; border-radius: 999px; flex-shrink: 0; }

.composer { margin-top: 8px; }
.composer-field { position: relative; }
.mention-picker {
  position: absolute;
  left: 8px;
  bottom: calc(100% + 4px);
  z-index: 1;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.14);
  padding: 4px;
  min-width: 200px;
  max-height: 200px;
  overflow-y: auto;
}
.mention-picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 13px;
  color: #111827;
  cursor: pointer;
  text-align: left;
}
.mention-picker-row.active,
.mention-picker-row:hover { background: #f5f3ff; }
.mention-picker-row .avatar { width: 22px; height: 22px; }
.mention-picker-login { font-weight: 500; }
.composer textarea {
  width: 100%; min-height: 64px; padding: 8px; border-radius: 8px;
  border: 1px solid #d1d5db; font: inherit; resize: vertical; color: #111827;
  background: white;
}
.composer textarea:focus { outline: 2px solid #8b5cf6; outline-offset: -1px; }
.composer .actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; gap: 8px; }
.composer button {
  padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600;
  font-size: 13px;
}
.composer .primary { background: #8b5cf6; color: white; }
.composer .primary:disabled { background: #d1d5db; cursor: not-allowed; }
.composer .secondary { background: transparent; color: #6b7280; }
.composer .resolve { margin-left: auto; background: transparent; color: #10b981; }

.hover-highlight {
  position: absolute; pointer-events: none;
  border: 2px solid #8b5cf6; border-radius: 4px;
  box-shadow: 0 0 0 4px rgba(139,92,246,0.15);
  transition: all 80ms linear;
}

.signin-prompt {
  padding: 12px; border-radius: 8px; background: #f3f4f6; margin-bottom: 8px;
  font-size: 13px; color: #374151;
}
.signin-prompt button {
  margin-top: 8px; padding: 6px 12px; border-radius: 6px; border: none;
  background: #24292f; color: white; font-weight: 600; cursor: pointer; font-size: 13px;
}

.pat-prompt {
  padding: 12px;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  margin-bottom: 8px;
  font-size: 13px;
  color: #111827;
}
.pat-prompt-step {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.pat-prompt-num {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #8b5cf6;
  color: white;
  font-weight: 700;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pat-prompt-open {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 6px;
  background: #24292f;
  color: white !important;
  text-decoration: none;
  font-weight: 600;
  font-size: 13px;
}
.pat-prompt-open:hover { filter: brightness(1.1); }
.pat-prompt-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}
.pat-prompt-input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  background: white;
  color: #111827;
}
.pat-prompt-input:focus {
  outline: 2px solid #8b5cf6;
  outline-offset: -1px;
}
.pat-prompt-error {
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 12px;
}
.pat-prompt-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}
.pat-prompt-save {
  padding: 6px 14px;
  border-radius: 6px;
  border: none;
  background: #8b5cf6;
  color: white;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
.pat-prompt-save:disabled { background: #d1d5db; cursor: not-allowed; }
.pat-prompt-cancel {
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
}
.pat-prompt-cancel:hover { color: #111827; }

.error-toast {
  position: fixed; bottom: 72px; right: 16px; pointer-events: auto;
  padding: 10px 14px; background: #fee2e2; color: #991b1b;
  border-radius: 8px; border: 1px solid #fecaca; font-size: 13px;
  max-width: 320px;
}

.comment-list {
  position: fixed;
  top: 16px;
  right: 16px;
  bottom: 72px;
  width: 320px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.14);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #111827;
}
.comment-list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #f3f4f6;
}
.comment-list-title {
  font-weight: 600;
  font-size: 14px;
  flex: 0 0 auto;
}
.comment-list-count {
  padding: 1px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 11px;
  font-weight: 600;
}
.comment-list-close {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}
.comment-list-close:hover { color: #111827; }

.comment-list-empty {
  padding: 24px 16px;
  color: #6b7280;
  font-size: 13px;
  text-align: center;
}
.comment-list-body {
  flex: 1;
  overflow-y: auto;
}
.comment-list-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid #f9fafb;
  font: inherit;
  color: inherit;
}
.comment-list-item:hover { background: #f9fafb; }
.comment-list-item.selected {
  background: #f5f3ff;
  box-shadow: inset 3px 0 0 0 #8b5cf6;
}
.comment-list-item.selected:hover { background: #ede9fe; }
.comment-list-item.selected .comment-list-item-meta strong { color: #6d28d9; }
.comment-list-item.resolved .comment-list-item-text { color: #6b7280; }
.comment-list-item .avatar { width: 28px; height: 28px; }
.comment-list-item-body { flex: 1; min-width: 0; }
.comment-list-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 2px;
}
.comment-list-item-meta strong { color: #111827; font-weight: 600; }
.comment-list-item-time { color: #9ca3af; }
.comment-list-resolved-chip {
  padding: 1px 6px;
  border-radius: 999px;
  background: #d1fae5;
  color: #065f46;
  font-size: 10px;
  font-weight: 600;
}
.comment-list-item-text {
  font-size: 13px;
  color: #111827;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
.comment-list-item-route {
  margin-top: 4px;
  font-size: 11px;
  color: #9ca3af;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.comment-list-item-orphaned {
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
  font-size: 11px;
  font-weight: 600;
}
`,tn="__uxCompanionBooted";function fr(){var i;const t=document.currentScript??document.querySelector("script[data-ux-companion-entry], script[data-repo]"),e=(i=t==null?void 0:t.dataset.repo)==null?void 0:i.trim(),n=(t==null?void 0:t.dataset.mock)==="true"||(t==null?void 0:t.hasAttribute("data-mock"))===!0,r=e||mr()||(n?"mock/mock":null);return r?{repo:r,mock:n}:(console.warn("[ux-companion] no data-repo attribute and could not infer one from URL"),null)}function mr(){const e=window.location.host.match(/^([^.]+)\.github\.io$/);if(!e)return null;const n=e[1],r=window.location.pathname.split("/").filter(Boolean)[0];return!n||!r?null:`${n}/${r}`}async function nn(t){const e=window;if(e[tn])return;e[tn]=!0;const n=document.createElement("div");n.setAttribute("data-ux-companion","host");const r=n.attachShadow({mode:"open"}),i=document.createElement("style");i.textContent=hr,r.appendChild(i);const o=document.createElement("div");o.setAttribute("data-ux-companion","mount"),r.appendChild(o),document.body.appendChild(n);const a=Cn(),c=t.mock?{owner:"mock",repo:"mock"}:Zt(t.repo),u={current:t.mock?dr():new He(c,st(t.repo))},s=()=>{hn(vt(cr,{state:a,client:u.current,repo:t.repo,onTokenChange:p}),o)},p=()=>{if(t.mock){s(),l();return}const m=st(t.repo);u.current=new He(c,m),s(),l()},l=async()=>{if(!(t.mock||!!st(t.repo))){a.currentUser.value=null,a.permissions.value=null,a.threads.value=[];return}try{a.currentUser.value=await u.current.currentUser()}catch{a.currentUser.value=null}try{a.permissions.value=await u.current.probePermissions()}catch{a.permissions.value={canWrite:!1,isPrivate:!1}}try{a.threads.value=await u.current.listThreads()}catch(h){a.error.value=h.message}try{a.collaborators.value=await u.current.listCollaborators()}catch{a.collaborators.value=[]}};s(),await l()}const rn=fr();return rn&&nn(rn),X.boot=nn,Object.defineProperty(X,Symbol.toStringTag,{value:"Module"}),X}({});
//# sourceMappingURL=widget.iife.js.map
