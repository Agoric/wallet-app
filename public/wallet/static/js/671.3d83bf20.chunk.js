"use strict";(globalThis.webpackChunk_agoric_wallet_ui=globalThis.webpackChunk_agoric_wallet_ui||[]).push([[671],{6671:(e,t,r)=>{r.r(t),r.d(t,{default:()=>J});var o=r(4532),n=r(3617),a=r(3276),l=r(6017),i=r(11),s=(r(3090),r(5466)),c=r(6153),d=r(4146),u=r(4014),h=r(4046),f=r(3469),m=r(1532),p=r(4394);function g(e){return(0,p.Z)("MuiAlert",e)}const v=(0,r(9003).Z)("MuiAlert",["root","action","icon","message","filled","filledSuccess","filledInfo","filledWarning","filledError","outlined","outlinedSuccess","outlinedInfo","outlinedWarning","outlinedError","standard","standardSuccess","standardInfo","standardWarning","standardError"]);var y=r(4697),S=r(3952),b=r(5030);const x=(0,S.Z)((0,b.jsx)("path",{d:"M20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4C12.76,4 13.5,4.11 14.2, 4.31L15.77,2.74C14.61,2.26 13.34,2 12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0, 0 22,12M7.91,10.08L6.5,11.5L11,16L21,6L19.59,4.58L11,13.17L7.91,10.08Z"}),"SuccessOutlined"),M=(0,S.Z)((0,b.jsx)("path",{d:"M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z"}),"ReportProblemOutlined"),C=(0,S.Z)((0,b.jsx)("path",{d:"M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"}),"ErrorOutline"),k=(0,S.Z)((0,b.jsx)("path",{d:"M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20, 12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10, 10 0 0,0 12,2M11,17H13V11H11V17Z"}),"InfoOutlined");var W,Z=r(8256);const j=["action","children","className","closeText","color","icon","iconMapping","onClose","role","severity","variant"],A=(0,u.ZP)(m.Z,{name:"MuiAlert",slot:"Root",overridesResolver:(e,t)=>{const{ownerState:r}=e;return[t.root,t[r.variant],t[`${r.variant}${(0,f.Z)(r.color||r.severity)}`]]}})((e=>{let{theme:t,ownerState:r}=e;const o="light"===t.palette.mode?d._j:d.$n,n="light"===t.palette.mode?d.$n:d._j,a=r.color||r.severity;return(0,i.Z)({},t.typography.body2,{borderRadius:t.shape.borderRadius,backgroundColor:"transparent",display:"flex",padding:"6px 16px"},a&&"standard"===r.variant&&{color:o(t.palette[a].light,.6),backgroundColor:n(t.palette[a].light,.9),[`& .${v.icon}`]:{color:"dark"===t.palette.mode?t.palette[a].main:t.palette[a].light}},a&&"outlined"===r.variant&&{color:o(t.palette[a].light,.6),border:`1px solid ${t.palette[a].light}`,[`& .${v.icon}`]:{color:"dark"===t.palette.mode?t.palette[a].main:t.palette[a].light}},a&&"filled"===r.variant&&{color:"#fff",fontWeight:t.typography.fontWeightMedium,backgroundColor:"dark"===t.palette.mode?t.palette[a].dark:t.palette[a].main})})),$=(0,u.ZP)("div",{name:"MuiAlert",slot:"Icon",overridesResolver:(e,t)=>t.icon})({marginRight:12,padding:"7px 0",display:"flex",fontSize:22,opacity:.9}),w=(0,u.ZP)("div",{name:"MuiAlert",slot:"Message",overridesResolver:(e,t)=>t.message})({padding:"8px 0"}),z=(0,u.ZP)("div",{name:"MuiAlert",slot:"Action",overridesResolver:(e,t)=>t.action})({display:"flex",alignItems:"flex-start",padding:"4px 0 0 16px",marginLeft:"auto",marginRight:-8}),L={success:(0,b.jsx)(x,{fontSize:"inherit"}),warning:(0,b.jsx)(M,{fontSize:"inherit"}),error:(0,b.jsx)(C,{fontSize:"inherit"}),info:(0,b.jsx)(k,{fontSize:"inherit"})},R=n.forwardRef((function(e,t){const r=(0,h.Z)({props:e,name:"MuiAlert"}),{action:o,children:n,className:a,closeText:d="Close",color:u,icon:m,iconMapping:p=L,onClose:v,role:S="alert",severity:x="success",variant:M="standard"}=r,C=(0,l.Z)(r,j),k=(0,i.Z)({},r,{color:u,severity:x,variant:M}),R=(e=>{const{variant:t,color:r,severity:o,classes:n}=e,a={root:["root",`${t}${(0,f.Z)(r||o)}`,`${t}`],icon:["icon"],message:["message"],action:["action"]};return(0,c.Z)(a,g,n)})(k);return(0,b.jsxs)(A,(0,i.Z)({role:S,square:!0,elevation:0,ownerState:k,className:(0,s.Z)(R.root,a),ref:t},C,{children:[!1!==m?(0,b.jsx)($,{ownerState:k,className:R.icon,children:m||p[x]||L[x]}):null,(0,b.jsx)(w,{ownerState:k,className:R.message,children:n}),null!=o?(0,b.jsx)(z,{className:R.action,children:o}):null,null==o&&v?(0,b.jsx)(z,{ownerState:k,className:R.action,children:(0,b.jsx)(y.Z,{size:"small","aria-label":d,title:d,color:"inherit",onClick:v,children:W||(W=(0,b.jsx)(Z.Z,{fontSize:"small"}))})}):null]}))}));var B=r(3876),E=r(3176),N=r(6912);r(603);const{details:V,quote:I}=assert,H=e=>"string"===typeof e&&!!e.match(/board[^:]/),_=(e,t,r)=>`${t}:${`${r}`}`,P=(e,t)=>Object.keys(e).find(t),O=(e,t)=>{const r=P(e,(e=>t.startsWith(`${e}:`)));return{kind:r,id:r?Number(t.slice(r.length+1)):NaN}},T=(e,t,r)=>{e.bySlot.init(t,r),e.byVal.init(r,t)},q=e=>{const t=`SEVERED: ${e.replace(/^Alleged: /,"")}`;return(0,N.cI)(t,{})};var K=r(7141),U=r(6525),D=r(5114),F=r(4139);const G=n.forwardRef((function(e,t){let{children:r,...o}=e;return(0,b.jsx)(R,{elevation:6,ref:t,variant:"filled",...o,children:r})})),J=(0,K.LW)((e=>{var t,r;let{connectionConfig:l,setConnectionState:i,setBackend:s,setBackendErrorHandler:c,keplrConnection:d}=e;const[u,h]=(0,n.useState)([]);i("connecting");const f=function(e,t){let r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:"error";t&&(console.error(`${e}:`,t),e+=`: ${t.message}`),"error"===r&&i("error"),h((t=>[...t,{severity:r,message:e}]))};return(0,n.useEffect)((()=>{if(!l||l.smartConnectionMethod===D.as.KEPLR&&!d)return;let e,t;return(async()=>{const{href:r,smartConnectionMethod:n}=l;let a;a=n===D.as.KEPLR?d.address:l.publicAddress;const u=e=>{f("Error in wallet backend",e),s(null),i("error")},h=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:q;const t={purse:{bySlot:(0,E.WS)(),byVal:(0,E.WS)()},payment:{bySlot:(0,E.WS)(),byVal:(0,E.WS)()},unknown:{bySlot:(0,E.WS)(),byVal:(0,E.WS)()}},r={bySlot:(0,E.WS)(),byVal:(0,E.WS)()},o=(t,r,o)=>{if(t.bySlot.has(r))return t.bySlot.get(r);const n=e(o);return T(t,r,n),n},n={fromBoard:(e,t)=>(assert(H(e),V`bad board slot ${I(e)}`),o(r,e,t)),fromMyWallet:(e,r)=>{const{kind:a,id:l}=O(t,e);return a?o(t[a],l,r):n.fromBoard(e,r)}},a={fromMyWallet:e=>{const r=P(t,(r=>t[r].byVal.has(e)));if(r){const o=t[r].byVal.get(e);return _(0,r,o)}assert.fail(V`cannot serialize unregistered ${e}`)}},l={fromBoard:(0,N.AU)(void 0,n.fromBoard,{marshalName:"fromBoard"}),fromMyWallet:(0,N.AU)(a.fromMyWallet,n.fromMyWallet,{marshalName:"fromMyWallet"})};return harden({fromMyWallet:(0,N.cI)("wallet marshaller",{...l.fromMyWallet}),fromBoard:(0,N.cI)("board marshaller",{...l.fromBoard})})}(),m=(0,o.$7)(r),p=(0,o.pu)(`:published.wallet.${a}`,m,{unserializer:h.fromMyWallet}),g=(0,U.F)(p,m,h.fromBoard,a,d,r,u,(()=>i("bridged"))),{backendIt:v,cancel:y}=await(0,U.q)(g);return t=(0,F.g)(g),e=y,c((()=>u)),(0,B.uO)(v,{updateState:t=>{e&&s(t)},fail:t=>{e&&u(t)},finish:t=>{e&&s(t)}})})().catch((e=>f("Cannot read Smart Wallet casting",e))),()=>{e&&e(),e=void 0,t&&t(),t=void 0}}),[l,d]),(0,b.jsx)("div",{children:(0,b.jsx)(a.Z,{open:u.length>0,children:(0,b.jsx)(G,{onClose:(e,t)=>{"clickaway"!==t&&h((e=>e.slice(1)))},severity:null===(t=u[0])||void 0===t?void 0:t.severity,sx:{width:"100%"},children:null===(r=u[0])||void 0===r?void 0:r.message})})})}),(e=>({connectionConfig:e.connectionConfig,setConnectionState:e.setConnectionState,setBackend:e.setBackend,setBackendErrorHandler:e.setBackendErrorHandler,keplrConnection:e.keplrConnection})))}}]);
//# sourceMappingURL=671.3d83bf20.chunk.js.map