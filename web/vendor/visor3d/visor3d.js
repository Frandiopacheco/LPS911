var Q0=Object.defineProperty;var tb=(i,t,e)=>t in i?Q0(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e;var v=(i,t,e)=>tb(i,typeof t!="symbol"?t+"":t,e);var Uc="186",Ts={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},xi={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},um=0,Bu=1,fm=2;var Ca=1,pm=2,oo=3,ri=0,Nn=1,kn=2,Ni=0,ao=1,zu=2,Vu=3,ku=4,mm=5;var tr=100,gm=101,_m=102,bm=103,xm=104,ym=200,vm=201,Sm=202,Mm=203,Hu=204,Gu=205,wm=206,Em=207,Tm=208,Am=209,Im=210,Rm=211,Cm=212,Pm=213,Lm=214,Zl=0,$l=1,jl=2,Yr=3,Kl=4,Jl=5,Ql=6,tc=7,Pa=0,Dm=1,Nm=2,yi=0,Wu=1,Xu=2,qu=3,Yu=4,Zu=5,$u=6,ju=7;var Ku=300,As=301,er=302,Fc=303,Bc=304,La=306,ec=1e3,Ri=1001,nc=1002,un=1003,Om=1004;var Da=1005;var bn=1006,zc=1007;var Is=1008;var Hn=1009,Ju=1010,Qu=1011,lo=1012,Vc=1013,vi=1014,Si=1015,Mi=1016,kc=1017,Hc=1018,co=1020,tf=35902,ef=35899,nf=1021,sf=1022,oi=1023,Pi=1026,Rs=1027,rf=1028,Gc=1029,Cs=1030,Wc=1031;var Xc=1033,Na=33776,Oa=33777,Ua=33778,Fa=33779,qc=35840,Yc=35841,Zc=35842,$c=35843,jc=36196,Kc=37492,Jc=37496,Qc=37488,th=37489,Ba=37490,eh=37491,nh=37808,ih=37809,sh=37810,rh=37811,oh=37812,ah=37813,lh=37814,ch=37815,hh=37816,dh=37817,uh=37818,fh=37819,ph=37820,mh=37821,gh=36492,_h=36494,bh=36495,xh=36283,yh=36284,za=36285,vh=36286;var Zo=2300,ic=2301,ql=2302,Tu=2303,Au=2400,Iu=2401,Ru=2402;var Um=3200;var Va=0,Fm=1,Ji="",_n="srgb",$o="srgb-linear",jo="linear",xe="srgb";var Yl=7680;var Bm=519,zm=512,Vm=513,km=514,Sh=515,Hm=516,Gm=517,Mh=518,Wm=519,of=35044;var af="300 es",gi=2e3,Zr=2001;function eb(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function nb(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function Ko(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Xm(){let i=Ko("canvas");return i.style.display="block",i}var Rp={},$r=null;function Jo(...i){let t="THREE."+i.shift();$r?$r("log",t,...i):console.log(t,...i)}function qm(i){let t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Xt(...i){i=qm(i);let t="THREE."+i.shift();if($r)$r("warn",t,...i);else{let e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function Zt(...i){i=qm(i);let t="THREE."+i.shift();if($r)$r("error",t,...i);else{let e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function $s(...i){let t=i.join(" ");t in Rp||(Rp[t]=!0,Xt(...i))}function Ym(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}var Zm={[Zl]:$l,[jl]:Ql,[Kl]:tc,[Yr]:Jl,[$l]:Zl,[Ql]:jl,[tc]:Kl,[Jl]:Yr},_i=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let s=n[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}},An=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Cp=1234567,Wo=Math.PI/180,jr=180/Math.PI;function Ci(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(An[i&255]+An[i>>8&255]+An[i>>16&255]+An[i>>24&255]+"-"+An[t&255]+An[t>>8&255]+"-"+An[t>>16&15|64]+An[t>>24&255]+"-"+An[e&63|128]+An[e>>8&255]+"-"+An[e>>16&255]+An[e>>24&255]+An[n&255]+An[n>>8&255]+An[n>>16&255]+An[n>>24&255]).toLowerCase()}function $t(i,t,e){return Math.max(t,Math.min(e,i))}function lf(i,t){return(i%t+t)%t}function ib(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function sb(i,t,e){return i!==t?(e-i)/(t-i):0}function Xo(i,t,e){return(1-e)*i+e*t}function rb(i,t,e,n){return Xo(i,t,1-Math.exp(-e*n))}function ob(i,t=1){return t-Math.abs(lf(i,t*2)-t)}function ab(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function lb(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function cb(i,t){return i+Math.floor(Math.random()*(t-i+1))}function hb(i,t){return i+Math.random()*(t-i)}function db(i){return i*(.5-Math.random())}function ub(i){i!==void 0&&(Cp=i);let t=Cp+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function fb(i){return i*Wo}function pb(i){return i*jr}function mb(i){return i>0&&Number.isInteger(i)&&2**Math.round(Math.log2(i))===i}function gb(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function _b(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function bb(i,t,e,n,s){let r=Math.cos,o=Math.sin,a=r(e/2),c=o(e/2),l=r((t+n)/2),h=o((t+n)/2),u=r((t-n)/2),d=o((t-n)/2),f=r((n-t)/2),p=o((n-t)/2);switch(s){case"XYX":i.set(a*h,c*u,c*d,a*l);break;case"YZY":i.set(c*d,a*h,c*u,a*l);break;case"ZXZ":i.set(c*u,c*d,a*h,a*l);break;case"XZX":i.set(a*h,c*p,c*f,a*l);break;case"YXY":i.set(c*f,a*h,c*p,a*l);break;case"ZYZ":i.set(c*p,c*f,a*h,a*l);break;default:Xt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function mi(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:case Uint8ClampedArray:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function Me(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var Qi={DEG2RAD:Wo,RAD2DEG:jr,generateUUID:Ci,clamp:$t,euclideanModulo:lf,mapLinear:ib,inverseLerp:sb,lerp:Xo,damp:rb,pingpong:ob,smoothstep:ab,smootherstep:lb,randInt:cb,randFloat:hb,randFloatSpread:db,seededRandom:ub,degToRad:fb,radToDeg:pb,isPowerOfTwo:mb,ceilPowerOfTwo:gb,floorPowerOfTwo:_b,setQuaternionFromProperEuler:bb,normalize:Me,denormalize:mi},pf=class pf{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=$t(this.x,t.x,e.x),this.y=$t(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=$t(this.x,t,e),this.y=$t(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar($t(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos($t(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*n-o*s+t.x,this.y=r*s+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};pf.prototype.isVector2=!0;var ut=pf,$n=class{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,o,a){let c=n[s+0],l=n[s+1],h=n[s+2],u=n[s+3],d=r[o+0],f=r[o+1],p=r[o+2],b=r[o+3];if(u!==b||c!==d||l!==f||h!==p){let g=c*d+l*f+h*p+u*b;g<0&&(d=-d,f=-f,p=-p,b=-b,g=-g);let m=1-a;if(g<.9995){let M=Math.acos(g),w=Math.sin(M);m=Math.sin(m*M)/w,a=Math.sin(a*M)/w,c=c*m+d*a,l=l*m+f*a,h=h*m+p*a,u=u*m+b*a}else{c=c*m+d*a,l=l*m+f*a,h=h*m+p*a,u=u*m+b*a;let M=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=M,l*=M,h*=M,u*=M}}t[e]=c,t[e+1]=l,t[e+2]=h,t[e+3]=u}static multiplyQuaternionsFlat(t,e,n,s,r,o){let a=n[s],c=n[s+1],l=n[s+2],h=n[s+3],u=r[o],d=r[o+1],f=r[o+2],p=r[o+3];return t[e]=a*p+h*u+c*f-l*d,t[e+1]=c*p+h*d+l*u-a*f,t[e+2]=l*p+h*f+a*d-c*u,t[e+3]=h*p-a*u-c*d-l*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,c=Math.sin,l=a(n/2),h=a(s/2),u=a(r/2),d=c(n/2),f=c(s/2),p=c(r/2);switch(o){case"XYZ":this._x=d*h*u+l*f*p,this._y=l*f*u-d*h*p,this._z=l*h*p+d*f*u,this._w=l*h*u-d*f*p;break;case"YXZ":this._x=d*h*u+l*f*p,this._y=l*f*u-d*h*p,this._z=l*h*p-d*f*u,this._w=l*h*u+d*f*p;break;case"ZXY":this._x=d*h*u-l*f*p,this._y=l*f*u+d*h*p,this._z=l*h*p+d*f*u,this._w=l*h*u-d*f*p;break;case"ZYX":this._x=d*h*u-l*f*p,this._y=l*f*u+d*h*p,this._z=l*h*p-d*f*u,this._w=l*h*u+d*f*p;break;case"YZX":this._x=d*h*u+l*f*p,this._y=l*f*u+d*h*p,this._z=l*h*p-d*f*u,this._w=l*h*u-d*f*p;break;case"XZY":this._x=d*h*u-l*f*p,this._y=l*f*u-d*h*p,this._z=l*h*p+d*f*u,this._w=l*h*u+d*f*p;break;default:Xt("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],s=e[4],r=e[8],o=e[1],a=e[5],c=e[9],l=e[2],h=e[6],u=e[10],d=n+a+u;if(d>0){let f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-c)*f,this._y=(r-l)*f,this._z=(o-s)*f}else if(n>a&&n>u){let f=2*Math.sqrt(1+n-a-u);this._w=(h-c)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+l)/f}else if(a>u){let f=2*Math.sqrt(1+a-n-u);this._w=(r-l)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(c+h)/f}else{let f=2*Math.sqrt(1+u-n-a);this._w=(o-s)/f,this._x=(r+l)/f,this._y=(c+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs($t(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,s=t._y,r=t._z,o=t._w,a=e._x,c=e._y,l=e._z,h=e._w;return this._x=n*h+o*a+s*l-r*c,this._y=s*h+o*c+r*a-n*l,this._z=r*h+o*l+n*c-s*a,this._w=o*h-n*a-s*c-r*l,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,o=t._w,a=this.dot(t);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let c=1-e;if(a<.9995){let l=Math.acos(a),h=Math.sin(l);c=Math.sin(c*l)/h,e=Math.sin(e*l)/h,this._x=this._x*c+n*e,this._y=this._y*c+s*e,this._z=this._z*c+r*e,this._w=this._w*c+o*e,this._onChangeCallback()}else this._x=this._x*c+n*e,this._y=this._y*c+s*e,this._z=this._z*c+r*e,this._w=this._w*c+o*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},mf=class mf{constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Pp.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Pp.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(t){let e=this.x,n=this.y,s=this.z,r=t.x,o=t.y,a=t.z,c=t.w,l=2*(o*s-a*n),h=2*(a*e-r*s),u=2*(r*n-o*e);return this.x=e+c*l+o*u-a*h,this.y=n+c*h+a*l-r*u,this.z=s+c*u+r*h-o*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=$t(this.x,t.x,e.x),this.y=$t(this.y,t.y,e.y),this.z=$t(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=$t(this.x,t,e),this.y=$t(this.y,t,e),this.z=$t(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar($t(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,s=t.y,r=t.z,o=e.x,a=e.y,c=e.z;return this.x=s*c-r*a,this.y=r*o-n*c,this.z=n*a-s*o,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return tu.copy(this).projectOnVector(t),this.sub(tu)}reflect(t){return this.sub(tu.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos($t(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};mf.prototype.isVector3=!0;var R=mf,tu=new R,Pp=new $n,gf=class gf{constructor(t,e,n,s,r,o,a,c,l){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,c,l)}set(t,e,n,s,r,o,a,c,l){let h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=c,h[6]=n,h[7]=o,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[3],c=n[6],l=n[1],h=n[4],u=n[7],d=n[2],f=n[5],p=n[8],b=s[0],g=s[3],m=s[6],M=s[1],w=s[4],_=s[7],E=s[2],T=s[5],I=s[8];return r[0]=o*b+a*M+c*E,r[3]=o*g+a*w+c*T,r[6]=o*m+a*_+c*I,r[1]=l*b+h*M+u*E,r[4]=l*g+h*w+u*T,r[7]=l*m+h*_+u*I,r[2]=d*b+f*M+p*E,r[5]=d*g+f*w+p*T,r[8]=d*m+f*_+p*I,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8];return e*o*h-e*a*l-n*r*h+n*a*c+s*r*l-s*o*c}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8],u=h*o-a*l,d=a*c-h*r,f=l*r-o*c,p=e*u+n*d+s*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let b=1/p;return t[0]=u*b,t[1]=(s*l-h*n)*b,t[2]=(a*n-s*o)*b,t[3]=d*b,t[4]=(h*e-s*c)*b,t[5]=(s*r-a*e)*b,t[6]=f*b,t[7]=(n*c-l*e)*b,t[8]=(o*e-n*r)*b,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,o,a){let c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*o+l*a)+o+t,-s*l,s*c,-s*(-l*o+c*a)+a+e,0,0,1),this}scale(t,e){return $s("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(eu.makeScale(t,e)),this}rotate(t){return $s("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(eu.makeRotation(-t)),this}translate(t,e){return $s("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(eu.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}};gf.prototype.isMatrix3=!0;var Kt=gf,eu=new Kt,Lp=new Kt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Dp=new Kt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function xb(){let i={enabled:!0,workingColorSpace:$o,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===xe&&(s.r=Ki(s.r),s.g=Ki(s.g),s.b=Ki(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===xe&&(s.r=Xr(s.r),s.g=Xr(s.g),s.b=Xr(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Ji?jo:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return $s("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return $s("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[$o]:{primaries:t,whitePoint:n,transfer:jo,toXYZ:Lp,fromXYZ:Dp,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:_n},outputColorSpaceConfig:{drawingBufferColorSpace:_n}},[_n]:{primaries:t,whitePoint:n,transfer:xe,toXYZ:Lp,fromXYZ:Dp,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:_n}}}),i}var ce=xb();function Ki(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Xr(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var Cr,sc=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{Cr===void 0&&(Cr=Ko("canvas")),Cr.width=t.width,Cr.height=t.height;let s=Cr.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=Cr}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=Ko("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Ki(r[o]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Ki(e[n]/255)*255):e[n]=Ki(e[n]);return{data:e,width:t.width,height:t.height}}else return Xt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},yb=0,Kr=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:yb++}),this.uuid=Ci(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(nu(s[o].image)):r.push(nu(s[o]))}else r=nu(s);n.url=r}return e||(t.images[this.uuid]=n),n}};function nu(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?sc.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Xt("Texture: Unable to serialize Texture."),{})}var vb=0,iu=new R,Bn=class i extends _i{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=Ri,s=Ri,r=bn,o=Is,a=oi,c=Hn,l=i.DEFAULT_ANISOTROPY,h=Ji){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:vb++}),this.uuid=Ci(),this.name="",this.source=new Kr(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new ut(0,0),this.repeat=new ut(1,1),this.center=new ut(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Kt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(iu).x}get height(){return this.source.getSize(iu).y}get depth(){return this.source.getSize(iu).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){Xt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Xt(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Ku)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case ec:t.x=t.x-Math.floor(t.x);break;case Ri:t.x=t.x<0?0:1;break;case nc:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case ec:t.y=t.y-Math.floor(t.y);break;case Ri:t.y=t.y<0?0:1;break;case nc:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};Bn.DEFAULT_IMAGE=null;Bn.DEFAULT_MAPPING=Ku;Bn.DEFAULT_ANISOTROPY=1;var _f=class _f{constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*n+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r,c=t.elements,l=c[0],h=c[4],u=c[8],d=c[1],f=c[5],p=c[9],b=c[2],g=c[6],m=c[10];if(Math.abs(h-d)<.01&&Math.abs(u-b)<.01&&Math.abs(p-g)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+b)<.1&&Math.abs(p+g)<.1&&Math.abs(l+f+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let w=(l+1)/2,_=(f+1)/2,E=(m+1)/2,T=(h+d)/4,I=(u+b)/4,y=(p+g)/4;return w>_&&w>E?w<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(w),s=T/n,r=I/n):_>E?_<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(_),n=T/s,r=y/s):E<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(E),n=I/r,s=y/r),this.set(n,s,r,e),this}let M=Math.sqrt((g-p)*(g-p)+(u-b)*(u-b)+(d-h)*(d-h));return Math.abs(M)<.001&&(M=1),this.x=(g-p)/M,this.y=(u-b)/M,this.z=(d-h)/M,this.w=Math.acos((l+f+m-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=$t(this.x,t.x,e.x),this.y=$t(this.y,t.y,e.y),this.z=$t(this.z,t.z,e.z),this.w=$t(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=$t(this.x,t,e),this.y=$t(this.y,t,e),this.z=$t(this.z,t,e),this.w=$t(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar($t(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};_f.prototype.isVector4=!0;var ye=_f,rc=class extends _i{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:bn,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new ye(0,0,t,e),this.scissorTest=!1,this.viewport=new ye(0,0,t,e),this.textures=[];let s={width:t,height:e,depth:n.depth},r=new Bn(s),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:bn,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new Kr(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},zn=class extends rc{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},Qo=class extends Bn{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=un,this.minFilter=un,this.wrapR=Ri,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var oc=class extends Bn{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=un,this.minFilter=un,this.wrapR=Ri,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var Oc=class Oc{constructor(t,e,n,s,r,o,a,c,l,h,u,d,f,p,b,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,c,l,h,u,d,f,p,b,g)}set(t,e,n,s,r,o,a,c,l,h,u,d,f,p,b,g){let m=this.elements;return m[0]=t,m[4]=e,m[8]=n,m[12]=s,m[1]=r,m[5]=o,m[9]=a,m[13]=c,m[2]=l,m[6]=h,m[10]=u,m[14]=d,m[3]=f,m[7]=p,m[11]=b,m[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Oc().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,s=1/Pr.setFromMatrixColumn(t,0).length(),r=1/Pr.setFromMatrixColumn(t,1).length(),o=1/Pr.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,s=t.y,r=t.z,o=Math.cos(n),a=Math.sin(n),c=Math.cos(s),l=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(t.order==="XYZ"){let d=o*h,f=o*u,p=a*h,b=a*u;e[0]=c*h,e[4]=-c*u,e[8]=l,e[1]=f+p*l,e[5]=d-b*l,e[9]=-a*c,e[2]=b-d*l,e[6]=p+f*l,e[10]=o*c}else if(t.order==="YXZ"){let d=c*h,f=c*u,p=l*h,b=l*u;e[0]=d+b*a,e[4]=p*a-f,e[8]=o*l,e[1]=o*u,e[5]=o*h,e[9]=-a,e[2]=f*a-p,e[6]=b+d*a,e[10]=o*c}else if(t.order==="ZXY"){let d=c*h,f=c*u,p=l*h,b=l*u;e[0]=d-b*a,e[4]=-o*u,e[8]=p+f*a,e[1]=f+p*a,e[5]=o*h,e[9]=b-d*a,e[2]=-o*l,e[6]=a,e[10]=o*c}else if(t.order==="ZYX"){let d=o*h,f=o*u,p=a*h,b=a*u;e[0]=c*h,e[4]=p*l-f,e[8]=d*l+b,e[1]=c*u,e[5]=b*l+d,e[9]=f*l-p,e[2]=-l,e[6]=a*c,e[10]=o*c}else if(t.order==="YZX"){let d=o*c,f=o*l,p=a*c,b=a*l;e[0]=c*h,e[4]=b-d*u,e[8]=p*u+f,e[1]=u,e[5]=o*h,e[9]=-a*h,e[2]=-l*h,e[6]=f*u+p,e[10]=d-b*u}else if(t.order==="XZY"){let d=o*c,f=o*l,p=a*c,b=a*l;e[0]=c*h,e[4]=-u,e[8]=l*h,e[1]=d*u+b,e[5]=o*h,e[9]=f*u-p,e[2]=p*u-f,e[6]=a*h,e[10]=b*u+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Sb,t,Mb)}lookAt(t,e,n){let s=this.elements;return Yn.subVectors(t,e),Yn.lengthSq()===0&&(Yn.z=1),Yn.normalize(),gs.crossVectors(n,Yn),gs.lengthSq()===0&&(Math.abs(n.z)===1?Yn.x+=1e-4:Yn.z+=1e-4,Yn.normalize(),gs.crossVectors(n,Yn)),gs.normalize(),yl.crossVectors(Yn,gs),s[0]=gs.x,s[4]=yl.x,s[8]=Yn.x,s[1]=gs.y,s[5]=yl.y,s[9]=Yn.y,s[2]=gs.z,s[6]=yl.z,s[10]=Yn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[4],c=n[8],l=n[12],h=n[1],u=n[5],d=n[9],f=n[13],p=n[2],b=n[6],g=n[10],m=n[14],M=n[3],w=n[7],_=n[11],E=n[15],T=s[0],I=s[4],y=s[8],A=s[12],L=s[1],N=s[5],k=s[9],V=s[13],O=s[2],H=s[6],U=s[10],W=s[14],K=s[3],G=s[7],D=s[11],Z=s[15];return r[0]=o*T+a*L+c*O+l*K,r[4]=o*I+a*N+c*H+l*G,r[8]=o*y+a*k+c*U+l*D,r[12]=o*A+a*V+c*W+l*Z,r[1]=h*T+u*L+d*O+f*K,r[5]=h*I+u*N+d*H+f*G,r[9]=h*y+u*k+d*U+f*D,r[13]=h*A+u*V+d*W+f*Z,r[2]=p*T+b*L+g*O+m*K,r[6]=p*I+b*N+g*H+m*G,r[10]=p*y+b*k+g*U+m*D,r[14]=p*A+b*V+g*W+m*Z,r[3]=M*T+w*L+_*O+E*K,r[7]=M*I+w*N+_*H+E*G,r[11]=M*y+w*k+_*U+E*D,r[15]=M*A+w*V+_*W+E*Z,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],o=t[1],a=t[5],c=t[9],l=t[13],h=t[2],u=t[6],d=t[10],f=t[14],p=t[3],b=t[7],g=t[11],m=t[15],M=c*f-l*d,w=a*f-l*u,_=a*d-c*u,E=o*f-l*h,T=o*d-c*h,I=o*u-a*h;return e*(b*M-g*w+m*_)-n*(p*M-g*E+m*T)+s*(p*w-b*E+m*I)-r*(p*_-b*T+g*I)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],o=t[5],a=t[9],c=t[2],l=t[6],h=t[10];return e*(o*h-a*l)-n*(r*h-a*c)+s*(r*l-o*c)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8],u=t[9],d=t[10],f=t[11],p=t[12],b=t[13],g=t[14],m=t[15],M=e*a-n*o,w=e*c-s*o,_=e*l-r*o,E=n*c-s*a,T=n*l-r*a,I=s*l-r*c,y=h*b-u*p,A=h*g-d*p,L=h*m-f*p,N=u*g-d*b,k=u*m-f*b,V=d*m-f*g,O=M*V-w*k+_*N+E*L-T*A+I*y;if(O===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let H=1/O;return t[0]=(a*V-c*k+l*N)*H,t[1]=(s*k-n*V-r*N)*H,t[2]=(b*I-g*T+m*E)*H,t[3]=(d*T-u*I-f*E)*H,t[4]=(c*L-o*V-l*A)*H,t[5]=(e*V-s*L+r*A)*H,t[6]=(g*_-p*I-m*w)*H,t[7]=(h*I-d*_+f*w)*H,t[8]=(o*k-a*L+l*y)*H,t[9]=(n*L-e*k-r*y)*H,t[10]=(p*T-b*_+m*M)*H,t[11]=(u*_-h*T-f*M)*H,t[12]=(a*A-o*N-c*y)*H,t[13]=(e*N-n*A+s*y)*H,t[14]=(b*w-p*E-g*M)*H,t[15]=(h*E-u*w+d*M)*H,this}scale(t){let e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),s=Math.sin(e),r=1-n,o=t.x,a=t.y,c=t.z,l=r*o,h=r*a;return this.set(l*o+n,l*a-s*c,l*c+s*a,0,l*a+s*c,h*a+n,h*c-s*o,0,l*c-s*a,h*c+s*o,r*c*c+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,o){return this.set(1,n,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){let s=this.elements,r=e._x,o=e._y,a=e._z,c=e._w,l=r+r,h=o+o,u=a+a,d=r*l,f=r*h,p=r*u,b=o*h,g=o*u,m=a*u,M=c*l,w=c*h,_=c*u,E=n.x,T=n.y,I=n.z;return s[0]=(1-(b+m))*E,s[1]=(f+_)*E,s[2]=(p-w)*E,s[3]=0,s[4]=(f-_)*T,s[5]=(1-(d+m))*T,s[6]=(g+M)*T,s[7]=0,s[8]=(p+w)*I,s[9]=(g-M)*I,s[10]=(1-(d+b))*I,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let o=Pr.set(s[0],s[1],s[2]).length(),a=Pr.set(s[4],s[5],s[6]).length(),c=Pr.set(s[8],s[9],s[10]).length();r<0&&(o=-o),ui.copy(this);let l=1/o,h=1/a,u=1/c;return ui.elements[0]*=l,ui.elements[1]*=l,ui.elements[2]*=l,ui.elements[4]*=h,ui.elements[5]*=h,ui.elements[6]*=h,ui.elements[8]*=u,ui.elements[9]*=u,ui.elements[10]*=u,e.setFromRotationMatrix(ui),n.x=o,n.y=a,n.z=c,this}makePerspective(t,e,n,s,r,o,a=gi,c=!1){let l=this.elements,h=2*r/(e-t),u=2*r/(n-s),d=(e+t)/(e-t),f=(n+s)/(n-s),p,b;if(c)p=r/(o-r),b=o*r/(o-r);else if(a===gi)p=-(o+r)/(o-r),b=-2*o*r/(o-r);else if(a===Zr)p=-o/(o-r),b=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=h,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=u,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=p,l[14]=b,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,n,s,r,o,a=gi,c=!1){let l=this.elements,h=2/(e-t),u=2/(n-s),d=-(e+t)/(e-t),f=-(n+s)/(n-s),p,b;if(c)p=1/(o-r),b=o/(o-r);else if(a===gi)p=-2/(o-r),b=-(o+r)/(o-r);else if(a===Zr)p=-1/(o-r),b=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=h,l[4]=0,l[8]=0,l[12]=d,l[1]=0,l[5]=u,l[9]=0,l[13]=f,l[2]=0,l[6]=0,l[10]=p,l[14]=b,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}};Oc.prototype.isMatrix4=!0;var jt=Oc,Pr=new R,ui=new jt,Sb=new R(0,0,0),Mb=new R(1,1,1),gs=new R,yl=new R,Yn=new R,Np=new jt,Op=new $n,Li=class i{constructor(t=0,e=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let s=t.elements,r=s[0],o=s[4],a=s[8],c=s[1],l=s[5],h=s[9],u=s[2],d=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin($t(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,l),this._z=0);break;case"YXZ":this._x=Math.asin(-$t(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin($t(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-$t(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin($t(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-$t(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,l),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Xt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return Np.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Np,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Op.setFromEuler(this),this.setFromQuaternion(Op,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Li.DEFAULT_ORDER="XYZ";var Jr=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},wb=0,Up=new R,Lr=new $n,qi=new jt,vl=new R,Bo=new R,Eb=new R,Tb=new $n,Fp=new R(1,0,0),Bp=new R(0,1,0),zp=new R(0,0,1),Vp={type:"added"},Ab={type:"removed"},Dr={type:"childadded",child:null},su={type:"childremoved",child:null},Ye=class i extends _i{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:wb++}),this.uuid=Ci(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new R,e=new Li,n=new $n,s=new R(1,1,1);function r(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new jt},normalMatrix:{value:new Kt}}),this.matrix=new jt,this.matrixWorld=new jt,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Jr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Lr.setFromAxisAngle(t,e),this.quaternion.multiply(Lr),this}rotateOnWorldAxis(t,e){return Lr.setFromAxisAngle(t,e),this.quaternion.premultiply(Lr),this}rotateX(t){return this.rotateOnAxis(Fp,t)}rotateY(t){return this.rotateOnAxis(Bp,t)}rotateZ(t){return this.rotateOnAxis(zp,t)}translateOnAxis(t,e){return Up.copy(t).applyQuaternion(this.quaternion),this.position.add(Up.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Fp,t)}translateY(t){return this.translateOnAxis(Bp,t)}translateZ(t){return this.translateOnAxis(zp,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(qi.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?vl.copy(t):vl.set(t,e,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Bo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?qi.lookAt(Bo,vl,this.up):qi.lookAt(vl,Bo,this.up),this.quaternion.setFromRotationMatrix(qi),s&&(qi.extractRotation(s.matrixWorld),Lr.setFromRotationMatrix(qi),this.quaternion.premultiply(Lr.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Zt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Vp),Dr.child=t,this.dispatchEvent(Dr),Dr.child=null):Zt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Ab),su.child=t,this.dispatchEvent(su),su.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),qi.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),qi.multiply(t.parent.matrixWorld)),t.applyMatrix4(qi),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Vp),Dr.child=t,this.dispatchEvent(Dr),Dr.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){let o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Bo,t,Eb),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Bo,Tb,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let c=a.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){let u=c[l];r(t.shapes,u)}else r(t.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(r(t.materials,this.material[c]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let c=this.animations[a];s.animations.push(r(t.animations,c))}}if(e){let a=o(t.geometries),c=o(t.materials),l=o(t.textures),h=o(t.images),u=o(t.shapes),d=o(t.skeletons),f=o(t.animations),p=o(t.nodes);a.length>0&&(n.geometries=a),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),p.length>0&&(n.nodes=p)}return n.object=s,n;function o(a){let c=[];for(let l in a){let h=a[l];delete h.metadata,c.push(h)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let s=t.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};Ye.DEFAULT_UP=new R(0,1,0);Ye.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ye.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var nn=class extends Ye{constructor(){super(),this.isGroup=!0,this.type="Group"}},Ib={type:"move"},Qr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new nn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new nn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new R,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new R),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new nn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new R,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new R,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,o=null,a=this._targetRay,c=this._grip,l=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(l&&t.hand){o=!0;for(let b of t.hand.values()){let g=e.getJointPose(b,n),m=this._getHandJoint(l,b);g!==null&&(m.matrix.fromArray(g.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=g.radius),m.visible=g!==null}let h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,p=.005;l.inputState.pinching&&d>f+p?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&d<=f-p&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1,c.eventsEnabled&&c.dispatchEvent({type:"gripUpdated",data:t,target:this})));a!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Ib)))}return a!==null&&(a.visible=s!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new nn;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},$m={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},_s={h:0,s:0,l:0},Sl={h:0,s:0,l:0};function ru(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var kt=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=_n){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,ce.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=ce.workingColorSpace){return this.r=t,this.g=e,this.b=n,ce.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=ce.workingColorSpace){if(t=lf(t,1),e=$t(e,0,1),n=$t(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,o=2*n-r;this.r=ru(o,r,t+1/3),this.g=ru(o,r,t),this.b=ru(o,r,t-1/3)}return ce.colorSpaceToWorking(this,s),this}setStyle(t,e=_n){function n(r){r!==void 0&&parseFloat(r)<1&&Xt("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Xt("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);Xt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=_n){let n=$m[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Xt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ki(t.r),this.g=Ki(t.g),this.b=Ki(t.b),this}copyLinearToSRGB(t){return this.r=Xr(t.r),this.g=Xr(t.g),this.b=Xr(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=_n){return ce.workingToColorSpace(In.copy(this),t),Math.round($t(In.r*255,0,255))*65536+Math.round($t(In.g*255,0,255))*256+Math.round($t(In.b*255,0,255))}getHexString(t=_n){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=ce.workingColorSpace){ce.workingToColorSpace(In.copy(this),e);let n=In.r,s=In.g,r=In.b,o=Math.max(n,s,r),a=Math.min(n,s,r),c,l,h=(a+o)/2;if(a===o)c=0,l=0;else{let u=o-a;switch(l=h<=.5?u/(o+a):u/(2-o-a),o){case n:c=(s-r)/u+(s<r?6:0);break;case s:c=(r-n)/u+2;break;case r:c=(n-s)/u+4;break}c/=6}return t.h=c,t.s=l,t.l=h,t}getRGB(t,e=ce.workingColorSpace){return ce.workingToColorSpace(In.copy(this),e),t.r=In.r,t.g=In.g,t.b=In.b,t}getStyle(t=_n){ce.workingToColorSpace(In.copy(this),t);let e=In.r,n=In.g,s=In.b;return t!==_n?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(_s),this.setHSL(_s.h+t,_s.s+e,_s.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(_s),t.getHSL(Sl);let n=Xo(_s.h,Sl.h,e),s=Xo(_s.s,Sl.s,e),r=Xo(_s.l,Sl.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},In=new kt;kt.NAMES=$m;var ta=class extends Ye{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Li,this.environmentIntensity=1,this.environmentRotation=new Li,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},fi=new R,Yi=new R,ou=new R,Zi=new R,Nr=new R,Or=new R,kp=new R,au=new R,lu=new R,cu=new R,hu=new ye,du=new ye,uu=new ye,si=class i{constructor(t=new R,e=new R,n=new R){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),fi.subVectors(t,e),s.cross(fi);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){fi.subVectors(s,e),Yi.subVectors(n,e),ou.subVectors(t,e);let o=fi.dot(fi),a=fi.dot(Yi),c=fi.dot(ou),l=Yi.dot(Yi),h=Yi.dot(ou),u=o*l-a*a;if(u===0)return r.set(0,0,0),null;let d=1/u,f=(l*c-a*h)*d,p=(o*h-a*c)*d;return r.set(1-f-p,p,f)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,Zi)===null?!1:Zi.x>=0&&Zi.y>=0&&Zi.x+Zi.y<=1}static getInterpolation(t,e,n,s,r,o,a,c){return this.getBarycoord(t,e,n,s,Zi)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,Zi.x),c.addScaledVector(o,Zi.y),c.addScaledVector(a,Zi.z),c)}static getInterpolatedAttribute(t,e,n,s,r,o){return hu.setScalar(0),du.setScalar(0),uu.setScalar(0),hu.fromBufferAttribute(t,e),du.fromBufferAttribute(t,n),uu.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(hu,r.x),o.addScaledVector(du,r.y),o.addScaledVector(uu,r.z),o}static isFrontFacing(t,e,n,s){return fi.subVectors(n,e),Yi.subVectors(t,e),fi.cross(Yi).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return fi.subVectors(this.c,this.b),Yi.subVectors(this.a,this.b),fi.cross(Yi).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return i.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,s=this.b,r=this.c,o,a;Nr.subVectors(s,n),Or.subVectors(r,n),au.subVectors(t,n);let c=Nr.dot(au),l=Or.dot(au);if(c<=0&&l<=0)return e.copy(n);lu.subVectors(t,s);let h=Nr.dot(lu),u=Or.dot(lu);if(h>=0&&u<=h)return e.copy(s);let d=c*u-h*l;if(d<=0&&c>=0&&h<=0)return o=c/(c-h),e.copy(n).addScaledVector(Nr,o);cu.subVectors(t,r);let f=Nr.dot(cu),p=Or.dot(cu);if(p>=0&&f<=p)return e.copy(r);let b=f*l-c*p;if(b<=0&&l>=0&&p<=0)return a=l/(l-p),e.copy(n).addScaledVector(Or,a);let g=h*p-f*u;if(g<=0&&u-h>=0&&f-p>=0)return kp.subVectors(r,s),a=(u-h)/(u-h+(f-p)),e.copy(s).addScaledVector(kp,a);let m=1/(g+b+d);return o=b*m,a=d*m,e.copy(n).addScaledVector(Nr,o).addScaledVector(Or,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},we=class{constructor(t=new R(1/0,1/0,1/0),e=new R(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(pi.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(pi.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=pi.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,pi):pi.fromBufferAttribute(r,o),pi.applyMatrix4(t.matrixWorld),this.expandByPoint(pi);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Ml.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Ml.copy(n.boundingBox)),Ml.applyMatrix4(t.matrixWorld),this.union(Ml)}let s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,pi),pi.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(zo),wl.subVectors(this.max,zo),Ur.subVectors(t.a,zo),Fr.subVectors(t.b,zo),Br.subVectors(t.c,zo),bs.subVectors(Fr,Ur),xs.subVectors(Br,Fr),Xs.subVectors(Ur,Br);let e=[0,-bs.z,bs.y,0,-xs.z,xs.y,0,-Xs.z,Xs.y,bs.z,0,-bs.x,xs.z,0,-xs.x,Xs.z,0,-Xs.x,-bs.y,bs.x,0,-xs.y,xs.x,0,-Xs.y,Xs.x,0];return!fu(e,Ur,Fr,Br,wl)||(e=[1,0,0,0,1,0,0,0,1],!fu(e,Ur,Fr,Br,wl))?!1:(El.crossVectors(bs,xs),e=[El.x,El.y,El.z],fu(e,Ur,Fr,Br,wl))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,pi).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(pi).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:($i[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),$i[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),$i[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),$i[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),$i[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),$i[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),$i[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),$i[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints($i),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},$i=[new R,new R,new R,new R,new R,new R,new R,new R],pi=new R,Ml=new we,Ur=new R,Fr=new R,Br=new R,bs=new R,xs=new R,Xs=new R,zo=new R,wl=new R,El=new R,qs=new R;function fu(i,t,e,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){qs.fromArray(i,r);let a=s.x*Math.abs(qs.x)+s.y*Math.abs(qs.y)+s.z*Math.abs(qs.z),c=t.dot(qs),l=e.dot(qs),h=n.dot(qs);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>a)return!1}return!0}var en=new R,Tl=new ut,Rb=0,Ie=class extends _i{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Rb++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=of,this.updateRanges=[],this.gpuType=Si,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Tl.fromBufferAttribute(this,e),Tl.applyMatrix3(t),this.setXY(e,Tl.x,Tl.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)en.fromBufferAttribute(this,e),en.applyMatrix3(t),this.setXYZ(e,en.x,en.y,en.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)en.fromBufferAttribute(this,e),en.applyMatrix4(t),this.setXYZ(e,en.x,en.y,en.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)en.fromBufferAttribute(this,e),en.applyNormalMatrix(t),this.setXYZ(e,en.x,en.y,en.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)en.fromBufferAttribute(this,e),en.transformDirection(t),this.setXYZ(e,en.x,en.y,en.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=mi(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Me(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=mi(e,this.array)),e}setX(t,e){return this.normalized&&(e=Me(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=mi(e,this.array)),e}setY(t,e){return this.normalized&&(e=Me(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=mi(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Me(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=mi(e,this.array)),e}setW(t,e){return this.normalized&&(e=Me(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Me(e,this.array),n=Me(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=Me(e,this.array),n=Me(n,this.array),s=Me(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=Me(e,this.array),n=Me(n,this.array),s=Me(s,this.array),r=Me(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}};var ea=class extends Ie{constructor(t,e,n){super(new Uint8Array(t),e,n)}};var na=class extends Ie{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var ia=class extends Ie{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var qe=class extends Ie{constructor(t,e,n){super(new Float32Array(t),e,n)}},Cb=new we,Vo=new R,pu=new R,Rn=class{constructor(t=new R,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):Cb.setFromPoints(t).getCenter(n);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Vo.subVectors(t,this.center);let e=Vo.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Vo,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(pu.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Vo.copy(t.center).add(pu)),this.expandByPoint(Vo.copy(t.center).sub(pu))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},Pb=0,ii=new jt,mu=new Ye,zr=new R,Zn=new we,ko=new we,hn=new R,Be=class i extends _i{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Pb++}),this.uuid=Ci(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(eb(t)?ia:na)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Kt().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return ii.makeRotationFromQuaternion(t),this.applyMatrix4(ii),this}rotateX(t){return ii.makeRotationX(t),this.applyMatrix4(ii),this}rotateY(t){return ii.makeRotationY(t),this.applyMatrix4(ii),this}rotateZ(t){return ii.makeRotationZ(t),this.applyMatrix4(ii),this}translate(t,e,n){return ii.makeTranslation(t,e,n),this.applyMatrix4(ii),this}scale(t,e,n){return ii.makeScale(t,e,n),this.applyMatrix4(ii),this}lookAt(t){return mu.lookAt(t),mu.updateMatrix(),this.applyMatrix4(mu.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(zr).negate(),this.translate(zr.x,zr.y,zr.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let s=0,r=t.length;s<r;s++){let o=t[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new qe(n,3))}else{let n=Math.min(t.length,e.count);for(let s=0;s<n;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Xt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new we);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Zt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new R(-1/0,-1/0,-1/0),new R(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){let r=e[n];Zn.setFromBufferAttribute(r),this.morphTargetsRelative?(hn.addVectors(this.boundingBox.min,Zn.min),this.boundingBox.expandByPoint(hn),hn.addVectors(this.boundingBox.max,Zn.max),this.boundingBox.expandByPoint(hn)):(this.boundingBox.expandByPoint(Zn.min),this.boundingBox.expandByPoint(Zn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Zt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Rn);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Zt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new R,1/0);return}if(t){let n=this.boundingSphere.center;if(Zn.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){let a=e[r];ko.setFromBufferAttribute(a),this.morphTargetsRelative?(hn.addVectors(Zn.min,ko.min),Zn.expandByPoint(hn),hn.addVectors(Zn.max,ko.max),Zn.expandByPoint(hn)):(Zn.expandByPoint(ko.min),Zn.expandByPoint(ko.max))}Zn.getCenter(n);let s=0;for(let r=0,o=t.count;r<o;r++)hn.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(hn));if(e)for(let r=0,o=e.length;r<o;r++){let a=e[r],c=this.morphTargetsRelative;for(let l=0,h=a.count;l<h;l++)hn.fromBufferAttribute(a,l),c&&(zr.fromBufferAttribute(t,l),hn.add(zr)),s=Math.max(s,n.distanceToSquared(hn))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Zt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Zt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,s=e.normal,r=e.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new Ie(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));let a=[],c=[];for(let y=0;y<n.count;y++)a[y]=new R,c[y]=new R;let l=new R,h=new R,u=new R,d=new ut,f=new ut,p=new ut,b=new R,g=new R;function m(y,A,L){l.fromBufferAttribute(n,y),h.fromBufferAttribute(n,A),u.fromBufferAttribute(n,L),d.fromBufferAttribute(r,y),f.fromBufferAttribute(r,A),p.fromBufferAttribute(r,L),h.sub(l),u.sub(l),f.sub(d),p.sub(d);let N=1/(f.x*p.y-p.x*f.y);isFinite(N)&&(b.copy(h).multiplyScalar(p.y).addScaledVector(u,-f.y).multiplyScalar(N),g.copy(u).multiplyScalar(f.x).addScaledVector(h,-p.x).multiplyScalar(N),a[y].add(b),a[A].add(b),a[L].add(b),c[y].add(g),c[A].add(g),c[L].add(g))}let M=this.groups;M.length===0&&(M=[{start:0,count:t.count}]);for(let y=0,A=M.length;y<A;++y){let L=M[y],N=L.start,k=L.count;for(let V=N,O=N+k;V<O;V+=3)m(t.getX(V+0),t.getX(V+1),t.getX(V+2))}let w=new R,_=new R,E=new R,T=new R;function I(y){E.fromBufferAttribute(s,y),T.copy(E);let A=a[y];w.copy(A),w.sub(E.multiplyScalar(E.dot(A))).normalize(),_.crossVectors(T,A);let N=_.dot(c[y])<0?-1:1;o.setXYZW(y,w.x,w.y,w.z,N)}for(let y=0,A=M.length;y<A;++y){let L=M[y],N=L.start,k=L.count;for(let V=N,O=N+k;V<O;V+=3)I(t.getX(V+0)),I(t.getX(V+1)),I(t.getX(V+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new Ie(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);let s=new R,r=new R,o=new R,a=new R,c=new R,l=new R,h=new R,u=new R;if(t)for(let d=0,f=t.count;d<f;d+=3){let p=t.getX(d+0),b=t.getX(d+1),g=t.getX(d+2);s.fromBufferAttribute(e,p),r.fromBufferAttribute(e,b),o.fromBufferAttribute(e,g),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),a.fromBufferAttribute(n,p),c.fromBufferAttribute(n,b),l.fromBufferAttribute(n,g),a.add(h),c.add(h),l.add(h),n.setXYZ(p,a.x,a.y,a.z),n.setXYZ(b,c.x,c.y,c.z),n.setXYZ(g,l.x,l.y,l.z)}else for(let d=0,f=e.count;d<f;d+=3)s.fromBufferAttribute(e,d+0),r.fromBufferAttribute(e,d+1),o.fromBufferAttribute(e,d+2),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)hn.fromBufferAttribute(t,e),hn.normalize(),t.setXYZ(e,hn.x,hn.y,hn.z)}toNonIndexed(){function t(a,c){let l=a.array,h=a.itemSize,u=a.normalized,d=new l.constructor(c.length*h),f=0,p=0;for(let b=0,g=c.length;b<g;b++){a.isInterleavedBufferAttribute?f=c[b]*a.data.stride+a.offset:f=c[b]*h;for(let m=0;m<h;m++)d[p++]=l[f++]}return new Ie(d,h,u)}if(this.index===null)return Xt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,s=this.attributes;for(let a in s){let c=s[a],l=t(c,n);e.setAttribute(a,l)}let r=this.morphAttributes;for(let a in r){let c=[],l=r[a];for(let h=0,u=l.length;h<u;h++){let d=l[h],f=t(d,n);c.push(f)}e.morphAttributes[a]=c}e.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,c=o.length;a<c;a++){let l=o[a];e.addGroup(l.start,l.count,l.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let c in n){let l=n[c];t.data.attributes[c]=l.toJSON(t.data)}let s={},r=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],h=[];for(let u=0,d=l.length;u<d;u++){let f=l[u];h.push(f.toJSON(t.data))}h.length>0&&(s[c]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let s=t.attributes;for(let l in s){let h=s[l];this.setAttribute(l,h.clone(e))}let r=t.morphAttributes;for(let l in r){let h=[],u=r[l];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(e));this.morphAttributes[l]=h}this.morphTargetsRelative=t.morphTargetsRelative;let o=t.groups;for(let l=0,h=o.length;l<h;l++){let u=o[l];this.addGroup(u.start,u.count,u.materialIndex)}let a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());let c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}},ac=class{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=of,this.updateRanges=[],this.version=0,this.uuid=Ci()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,n){t*=this.stride,n*=e.stride;for(let s=0,r=this.stride;s<r;s++)this.array[t+s]=e.array[n+s];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ci()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(e,this.stride);return n.setUsage(this.usage),n}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ci()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer)));let e={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return e.usage=this.usage,e}},Dn=new R,Vn=class i{constructor(t,e,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,n=this.data.count;e<n;e++)Dn.fromBufferAttribute(this,e),Dn.applyMatrix4(t),this.setXYZ(e,Dn.x,Dn.y,Dn.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Dn.fromBufferAttribute(this,e),Dn.applyNormalMatrix(t),this.setXYZ(e,Dn.x,Dn.y,Dn.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Dn.fromBufferAttribute(this,e),Dn.transformDirection(t),this.setXYZ(e,Dn.x,Dn.y,Dn.z);return this}getComponent(t,e){let n=this.array[t*this.data.stride+this.offset+e];return this.normalized&&(n=mi(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Me(n,this.array)),this.data.array[t*this.data.stride+this.offset+e]=n,this}setX(t,e){return this.normalized&&(e=Me(e,this.array)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=Me(e,this.array)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=Me(e,this.array)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=Me(e,this.array)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=mi(e,this.array)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=mi(e,this.array)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=mi(e,this.array)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=mi(e,this.array)),e}setXY(t,e,n){return t=t*this.data.stride+this.offset,this.normalized&&(e=Me(e,this.array),n=Me(n,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this}setXYZ(t,e,n,s){return t=t*this.data.stride+this.offset,this.normalized&&(e=Me(e,this.array),n=Me(n,this.array),s=Me(s,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=Me(e,this.array),n=Me(n,this.array),s=Me(s,this.array),r=Me(r,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this.data.array[t+3]=r,this}clone(t){if(t===void 0){Jo("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return new Ie(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new i(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){Jo("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},gu=new R,Lb=new R,Db=new Kt,De=class{constructor(t=new R(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let s=gu.subVectors(n,e).cross(Lb.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let s=t.delta(gu),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let o=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:e.copy(t.start).addScaledVector(s,o)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||Db.getNormalMatrix(t),s=this.coplanarPoint(gu).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},Nb=0,bi=class extends _i{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Nb++}),this.uuid=Ci(),this.name="",this.type="Material",this.blending=ao,this.side=ri,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Hu,this.blendDst=Gu,this.blendEquation=tr,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new kt(0,0,0),this.blendAlpha=0,this.depthFunc=Yr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Bm,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Yl,this.stencilZFail=Yl,this.stencilZPass=Yl,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){Xt(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Xt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let o=[];for(let a in r){let c=r[a];delete c.metadata,o.push(c)}return o}if(e){let r=s(t.textures),o=s(t.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new kt().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new De().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new ut().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ut().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}};var ji=new R,_u=new R,Al=new R,Il=new R,jn=class{constructor(t=new R,e=new R(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,ji)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=ji.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(ji.copy(this.origin).addScaledVector(this.direction,e),ji.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){_u.copy(t).add(e).multiplyScalar(.5),Al.copy(e).sub(t).normalize(),Il.copy(this.origin).sub(_u);let r=t.distanceTo(e)*.5,o=-this.direction.dot(Al),a=Il.dot(this.direction),c=-Il.dot(Al),l=Il.lengthSq(),h=Math.abs(1-o*o),u,d,f,p;if(h>0)if(u=o*c-a,d=o*a-c,p=r*h,u>=0)if(d>=-p)if(d<=p){let b=1/h;u*=b,d*=b,f=u*(u+o*d+2*a)+d*(o*u+d+2*c)+l}else d=r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*c)+l;else d=-r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*c)+l;else d<=-p?(u=Math.max(0,-(-o*r+a)),d=u>0?-r:Math.min(Math.max(-r,-c),r),f=-u*u+d*(d+2*c)+l):d<=p?(u=0,d=Math.min(Math.max(-r,-c),r),f=d*(d+2*c)+l):(u=Math.max(0,-(o*r+a)),d=u>0?r:Math.min(Math.max(-r,-c),r),f=-u*u+d*(d+2*c)+l);else d=o>0?-r:r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(_u).addScaledVector(Al,d),f}intersectSphere(t,e){if(t.radius<0)return null;ji.subVectors(t.center,this.origin);let n=ji.dot(this.direction),s=ji.dot(ji)-n*n,r=t.radius*t.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=n-o,c=n+o;return c<0?null:a<0?this.at(c,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,o,a,c,l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return l>=0?(n=(t.min.x-d.x)*l,s=(t.max.x-d.x)*l):(n=(t.max.x-d.x)*l,s=(t.min.x-d.x)*l),h>=0?(r=(t.min.y-d.y)*h,o=(t.max.y-d.y)*h):(r=(t.max.y-d.y)*h,o=(t.min.y-d.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),u>=0?(a=(t.min.z-d.z)*u,c=(t.max.z-d.z)*u):(a=(t.max.z-d.z)*u,c=(t.min.z-d.z)*u),n>c||a>s)||((a>n||n!==n)&&(n=a),(c<s||s!==s)&&(s=c),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,ji)!==null}intersectTriangle(t,e,n,s,r){let o=this.origin,a=this.direction,c=a.x,l=a.y,h=a.z,u=t.x-o.x,d=t.y-o.y,f=t.z-o.z,p=e.x-o.x,b=e.y-o.y,g=e.z-o.z,m=n.x-o.x,M=n.y-o.y,w=n.z-o.z,_=Math.abs(c),E=Math.abs(l),T=Math.abs(h),I,y,A,L,N,k,V,O,H,U,W,K;if(_>=E&&_>=T?(A=c,k=u,H=p,K=m,c>=0?(I=l,y=h,L=d,N=f,V=b,O=g,U=M,W=w):(I=h,y=l,L=f,N=d,V=g,O=b,U=w,W=M)):E>=T?(A=l,k=d,H=b,K=M,l>=0?(I=h,y=c,L=f,N=u,V=g,O=p,U=w,W=m):(I=c,y=h,L=u,N=f,V=p,O=g,U=m,W=w)):(A=h,k=f,H=g,K=w,h>=0?(I=c,y=l,L=u,N=d,V=p,O=b,U=m,W=M):(I=l,y=c,L=d,N=u,V=b,O=p,U=M,W=m)),A===0)return null;let G=I/A,D=y/A,Z=1/A,ct=L-G*k,Mt=N-D*k,Wt=V-G*H,It=O-D*H,Ht=U-G*K,$=W-D*K,nt=Ht*It-$*Wt,mt=ct*$-Mt*Ht,Tt=Wt*Mt-It*ct;if(s){if(nt<0||mt<0||Tt<0)return null}else if((nt<0||mt<0||Tt<0)&&(nt>0||mt>0||Tt>0))return null;let ht=nt+mt+Tt;if(ht===0)return null;let Gt=Z*(nt*k+mt*H+Tt*K);return(ht>0?Gt<0:Gt>0)?null:this.at(Gt/ht,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},sa=class extends bi{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new kt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Li,this.combine=Pa,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},Hp=new jt,Ys=new jn,Rl=new Rn,Gp=new R,Cl=new R,Pl=new R,Ll=new R,bu=new R,Dl=new R,Wp=new R,Nl=new R,Re=class extends Ye{constructor(t=new Be,e=new sa){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(s,t);let a=this.morphTargetInfluences;if(r&&a){Dl.set(0,0,0);for(let c=0,l=r.length;c<l;c++){let h=a[c],u=r[c];h!==0&&(bu.fromBufferAttribute(u,t),o?Dl.addScaledVector(bu,h):Dl.addScaledVector(bu.sub(e),h))}e.add(Dl)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Rl.copy(n.boundingSphere),Rl.applyMatrix4(r),Ys.copy(t.ray).recast(t.near),!(Rl.containsPoint(Ys.origin)===!1&&(Ys.intersectSphere(Rl,Gp)===null||Ys.origin.distanceToSquared(Gp)>(t.far-t.near)**2))&&(Hp.copy(r).invert(),Ys.copy(t.ray).applyMatrix4(Hp),!(n.boundingBox!==null&&Ys.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,Ys)))}_computeIntersections(t,e,n){let s,r=this.geometry,o=this.material,a=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let p=0,b=d.length;p<b;p++){let g=d[p],m=o[g.materialIndex],M=Math.max(g.start,f.start),w=Math.min(a.count,Math.min(g.start+g.count,f.start+f.count));for(let _=M,E=w;_<E;_+=3){let T=a.getX(_),I=a.getX(_+1),y=a.getX(_+2);s=Ol(this,m,t,n,l,h,u,T,I,y),s&&(s.faceIndex=Math.floor(_/3),s.face.materialIndex=g.materialIndex,e.push(s))}}else{let p=Math.max(0,f.start),b=Math.min(a.count,f.start+f.count);for(let g=p,m=b;g<m;g+=3){let M=a.getX(g),w=a.getX(g+1),_=a.getX(g+2);s=Ol(this,o,t,n,l,h,u,M,w,_),s&&(s.faceIndex=Math.floor(g/3),e.push(s))}}else if(c!==void 0)if(Array.isArray(o))for(let p=0,b=d.length;p<b;p++){let g=d[p],m=o[g.materialIndex],M=Math.max(g.start,f.start),w=Math.min(c.count,Math.min(g.start+g.count,f.start+f.count));for(let _=M,E=w;_<E;_+=3){let T=_,I=_+1,y=_+2;s=Ol(this,m,t,n,l,h,u,T,I,y),s&&(s.faceIndex=Math.floor(_/3),s.face.materialIndex=g.materialIndex,e.push(s))}}else{let p=Math.max(0,f.start),b=Math.min(c.count,f.start+f.count);for(let g=p,m=b;g<m;g+=3){let M=g,w=g+1,_=g+2;s=Ol(this,o,t,n,l,h,u,M,w,_),s&&(s.faceIndex=Math.floor(g/3),e.push(s))}}}};function Ob(i,t,e,n,s,r,o,a){let c;if(t.side===Nn?c=n.intersectTriangle(o,r,s,!0,a):c=n.intersectTriangle(s,r,o,t.side===ri,a),c===null)return null;Nl.copy(a),Nl.applyMatrix4(i.matrixWorld);let l=e.ray.origin.distanceTo(Nl);return l<e.near||l>e.far?null:{distance:l,point:Nl.clone(),object:i}}function Ol(i,t,e,n,s,r,o,a,c,l){i.getVertexPosition(a,Cl),i.getVertexPosition(c,Pl),i.getVertexPosition(l,Ll);let h=Ob(i,t,e,n,Cl,Pl,Ll,Wp);if(h){let u=new R;si.getBarycoord(Wp,Cl,Pl,Ll,u),s&&(h.uv=si.getInterpolatedAttribute(s,a,c,l,u,new ut)),r&&(h.uv1=si.getInterpolatedAttribute(r,a,c,l,u,new ut)),o&&(h.normal=si.getInterpolatedAttribute(o,a,c,l,u,new R),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let d={a,b:c,c:l,normal:new R,materialIndex:0};si.getNormal(Cl,Pl,Ll,d.normal),h.face=d,h.barycoord=u}return h}var lc=class extends Bn{constructor(t=null,e=1,n=1,s,r,o,a,c,l=un,h=un,u,d){super(null,o,a,c,l,h,s,r,u,d),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var to=class extends Ie{constructor(t,e,n,s=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){let t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}};var Zs=new Rn,Ub=new ut(.5,.5),Ul=new R,Cn=class{constructor(t=new De,e=new De,n=new De,s=new De,r=new De,o=new De){this.planes=[t,e,n,s,r,o]}set(t,e,n,s,r,o){let a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=gi,n=!1){let s=this.planes,r=t.elements,o=r[0],a=r[1],c=r[2],l=r[3],h=r[4],u=r[5],d=r[6],f=r[7],p=r[8],b=r[9],g=r[10],m=r[11],M=r[12],w=r[13],_=r[14],E=r[15];if(s[0].setComponents(l-o,f-h,m-p,E-M).normalize(),s[1].setComponents(l+o,f+h,m+p,E+M).normalize(),s[2].setComponents(l+a,f+u,m+b,E+w).normalize(),s[3].setComponents(l-a,f-u,m-b,E-w).normalize(),n)s[4].setComponents(c,d,g,_).normalize(),s[5].setComponents(l-c,f-d,m-g,E-_).normalize();else if(s[4].setComponents(l-c,f-d,m-g,E-_).normalize(),e===gi)s[5].setComponents(l+c,f+d,m+g,E+_).normalize();else if(e===Zr)s[5].setComponents(c,d,g,_).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Zs.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Zs.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Zs)}intersectsSprite(t){Zs.center.set(0,0,0);let e=Ub.distanceTo(t.center);return Zs.radius=.7071067811865476+e,Zs.applyMatrix4(t.matrixWorld),this.intersectsSphere(Zs)}intersectsSphere(t){let e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let s=e[n];if(Ul.x=s.normal.x>0?t.max.x:t.min.x,Ul.y=s.normal.y>0?t.max.y:t.min.y,Ul.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(Ul)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var ra=class extends bi{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new kt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}},cc=new R,hc=new R,Xp=new jt,Ho=new jn,Fl=new Rn,xu=new R,qp=new R,eo=class extends Ye{constructor(t=new Be,e=new ra){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[0];for(let s=1,r=e.count;s<r;s++)cc.fromBufferAttribute(e,s-1),hc.fromBufferAttribute(e,s),n[s]=n[s-1],n[s]+=cc.distanceTo(hc);t.setAttribute("lineDistance",new qe(n,1))}else Xt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Fl.copy(n.boundingSphere),Fl.applyMatrix4(s),Fl.radius+=r,t.ray.intersectsSphere(Fl)===!1)return;Xp.copy(s).invert(),Ho.copy(t.ray).applyMatrix4(Xp);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=this.isLineSegments?2:1,h=n.index,d=n.attributes.position;if(h!==null){let f=Math.max(0,o.start),p=Math.min(h.count,o.start+o.count);for(let b=f,g=p-1;b<g;b+=l){let m=h.getX(b),M=h.getX(b+1),w=Bl(this,t,Ho,c,m,M,b);w&&e.push(w)}if(this.isLineLoop){let b=h.getX(p-1),g=h.getX(f),m=Bl(this,t,Ho,c,b,g,p-1);m&&e.push(m)}}else{let f=Math.max(0,o.start),p=Math.min(d.count,o.start+o.count);for(let b=f,g=p-1;b<g;b+=l){let m=Bl(this,t,Ho,c,b,b+1,b);m&&e.push(m)}if(this.isLineLoop){let b=Bl(this,t,Ho,c,p-1,f,p-1);b&&e.push(b)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function Bl(i,t,e,n,s,r,o){let a=i.geometry.attributes.position;if(cc.fromBufferAttribute(a,s),hc.fromBufferAttribute(a,r),e.distanceSqToSegment(cc,hc,xu,qp)>n)return;xu.applyMatrix4(i.matrixWorld);let l=t.ray.origin.distanceTo(xu);if(!(l<t.near||l>t.far))return{distance:l,point:qp.clone().applyMatrix4(i.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:i}}var js=class extends bi{constructor(t){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new kt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},Yp=new jt,Cu=new jn,zl=new Rn,Vl=new R,oa=class extends Ye{constructor(t=new Be,e=new js){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.matrixWorld,r=t.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),zl.copy(n.boundingSphere),zl.applyMatrix4(s),zl.radius+=r,t.ray.intersectsSphere(zl)===!1)return;Yp.copy(s).invert(),Cu.copy(t.ray).applyMatrix4(Yp);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=n.index,u=n.attributes.position;if(l!==null){let d=Math.max(0,o.start),f=Math.min(l.count,o.start+o.count);for(let p=d,b=f;p<b;p++){let g=l.getX(p);Vl.fromBufferAttribute(u,g),Zp(Vl,g,c,s,t,e,this)}}else{let d=Math.max(0,o.start),f=Math.min(u.count,o.start+o.count);for(let p=d,b=f;p<b;p++)Vl.fromBufferAttribute(u,p),Zp(Vl,p,c,s,t,e,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function Zp(i,t,e,n,s,r,o){let a=Cu.distanceSqToPoint(i);if(a<e){let c=new R;Cu.closestPointToPoint(i,c),c.applyMatrix4(n);let l=s.ray.origin.distanceTo(c);if(l<s.near||l>s.far)return;r.push({distance:l,distanceToRay:Math.sqrt(a),point:c,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var aa=class extends Bn{constructor(t=[],e=As,n,s,r,o,a,c,l,h){super(t,e,n,s,r,o,a,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}};var vs=class extends Bn{constructor(t,e,n=vi,s,r,o,a=un,c=un,l,h=Pi,u=1){if(h!==Pi&&h!==Rs)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let d={width:t,height:e,depth:u};super(d,s,r,o,a,c,h,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Kr(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},dc=class extends vs{constructor(t,e=vi,n=As,s,r,o=un,a=un,c,l=Pi){let h={width:t,height:t,depth:1},u=[h,h,h,h,h,h];super(t,t,e,n,s,r,o,a,c,l),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},la=class extends Bn{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},no=class i extends Be{constructor(t=1,e=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let c=[],l=[],h=[],u=[],d=0,f=0;p("z","y","x",-1,-1,n,e,t,o,r,0),p("z","y","x",1,-1,n,e,-t,o,r,1),p("x","z","y",1,1,t,n,e,s,o,2),p("x","z","y",1,-1,t,n,-e,s,o,3),p("x","y","z",1,-1,t,e,n,s,r,4),p("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(c),this.setAttribute("position",new qe(l,3)),this.setAttribute("normal",new qe(h,3)),this.setAttribute("uv",new qe(u,2));function p(b,g,m,M,w,_,E,T,I,y,A){let L=_/I,N=E/y,k=_/2,V=E/2,O=T/2,H=I+1,U=y+1,W=0,K=0,G=new R;for(let D=0;D<U;D++){let Z=D*N-V;for(let ct=0;ct<H;ct++){let Mt=ct*L-k;G[b]=Mt*M,G[g]=Z*w,G[m]=O,l.push(G.x,G.y,G.z),G[b]=0,G[g]=0,G[m]=T>0?1:-1,h.push(G.x,G.y,G.z),u.push(ct/I),u.push(1-D/y),W+=1}}for(let D=0;D<y;D++)for(let Z=0;Z<I;Z++){let ct=d+Z+H*D,Mt=d+Z+H*(D+1),Wt=d+(Z+1)+H*(D+1),It=d+(Z+1)+H*D;c.push(ct,Mt,It),c.push(Mt,Wt,It),K+=6}a.addGroup(f,K,A),f+=K,d+=W}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var Kn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Xt("Curve: .getPoint() not implemented.")}getPointAt(t,e){let n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){let t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let e=[],n,s=this.getPoint(0),r=0;e.push(0);for(let o=1;o<=t;o++)n=this.getPoint(o/t),r+=n.distanceTo(s),e.push(r),s=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){let n=this.getLengths(),s=0,r=n.length,o;e?o=e:o=t*n[r-1];let a=0,c=r-1,l;for(;a<=c;)if(s=Math.floor(a+(c-a)/2),l=n[s]-o,l<0)a=s+1;else if(l>0)c=s-1;else{c=s;break}if(s=c,n[s]===o)return s/(r-1);let h=n[s],d=n[s+1]-h,f=(o-h)/d;return(s+f)/(r-1)}getTangent(t,e){let s=t-1e-4,r=t+1e-4;s<0&&(s=0),r>1&&(r=1);let o=this.getPoint(s),a=this.getPoint(r),c=e||(o.isVector2?new ut:new R);return c.copy(a).sub(o).normalize(),c}getTangentAt(t,e){let n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){let n=new R,s=[],r=[],o=[],a=new R,c=new jt;for(let f=0;f<=t;f++){let p=f/t;s[f]=this.getTangentAt(p,new R)}r[0]=new R,o[0]=new R;let l=Number.MAX_VALUE,h=Math.abs(s[0].x),u=Math.abs(s[0].y),d=Math.abs(s[0].z);h<=l&&(l=h,n.set(1,0,0)),u<=l&&(l=u,n.set(0,1,0)),d<=l&&n.set(0,0,1),a.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],a),o[0].crossVectors(s[0],r[0]);for(let f=1;f<=t;f++){if(r[f]=r[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(s[f-1],s[f]),a.length()>Number.EPSILON){a.normalize();let p=Math.acos($t(s[f-1].dot(s[f]),-1,1));r[f].applyMatrix4(c.makeRotationAxis(a,p))}o[f].crossVectors(s[f],r[f])}if(e===!0){let f=Math.acos($t(r[0].dot(r[t]),-1,1));f/=t,s[0].dot(a.crossVectors(r[0],r[t]))>0&&(f=-f);for(let p=1;p<=t;p++)r[p].applyMatrix4(c.makeRotationAxis(s[p],f*p)),o[p].crossVectors(s[p],r[p])}return{tangents:s,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){let t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}},io=class extends Kn{constructor(t=0,e=0,n=1,s=1,r=0,o=Math.PI*2,a=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=c}getPoint(t,e=new ut){let n=e,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(o?r=0:r=s),this.aClockwise===!0&&!o&&(r===s?r=-s:r=r-s);let a=this.aStartAngle+t*r,c=this.aX+this.xRadius*Math.cos(a),l=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){let h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),d=c-this.aX,f=l-this.aY;c=d*h-f*u+this.aX,l=d*u+f*h+this.aY}return n.set(c,l)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){let t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}},uc=class extends io{constructor(t,e,n,s,r,o){super(t,e,n,n,s,r,o),this.isArcCurve=!0,this.type="ArcCurve"}};function cf(){let i=0,t=0,e=0,n=0;function s(r,o,a,c){i=r,t=a,e=-3*r+3*o-2*a-c,n=2*r-2*o+a+c}return{initCatmullRom:function(r,o,a,c,l){s(o,a,l*(a-r),l*(c-o))},initNonuniformCatmullRom:function(r,o,a,c,l,h,u){let d=(o-r)/l-(a-r)/(l+h)+(a-o)/h,f=(a-o)/h-(c-o)/(h+u)+(c-a)/u;d*=h,f*=h,s(o,a,d,f)},calc:function(r){let o=r*r,a=o*r;return i+t*r+e*o+n*a}}}var $p=new R,jp=new R,yu=new cf,vu=new cf,Su=new cf,fc=class extends Kn{constructor(t=[],e=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=s}getPoint(t,e=new R){let n=e,s=this.points,r=s.length,o=(r-(this.closed?0:1))*t,a=Math.floor(o),c=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:c===0&&a===r-1&&(a=r-2,c=1);let l,h;this.closed||a>0?l=s[(a-1)%r]:(jp.subVectors(s[0],s[1]).add(s[0]),l=jp);let u=s[a%r],d=s[(a+1)%r];if(this.closed||a+2<r?h=s[(a+2)%r]:($p.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=$p),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,p=Math.pow(l.distanceToSquared(u),f),b=Math.pow(u.distanceToSquared(d),f),g=Math.pow(d.distanceToSquared(h),f);b<1e-4&&(b=1),p<1e-4&&(p=b),g<1e-4&&(g=b),yu.initNonuniformCatmullRom(l.x,u.x,d.x,h.x,p,b,g),vu.initNonuniformCatmullRom(l.y,u.y,d.y,h.y,p,b,g),Su.initNonuniformCatmullRom(l.z,u.z,d.z,h.z,p,b,g)}else this.curveType==="catmullrom"&&(yu.initCatmullRom(l.x,u.x,d.x,h.x,this.tension),vu.initCatmullRom(l.y,u.y,d.y,h.y,this.tension),Su.initCatmullRom(l.z,u.z,d.z,h.z,this.tension));return n.set(yu.calc(c),vu.calc(c),Su.calc(c)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new R().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}};function Kp(i,t,e,n,s){let r=(n-t)*.5,o=(s-e)*.5,a=i*i,c=i*a;return(2*e-2*n+r+o)*c+(-3*e+3*n-2*r-o)*a+r*i+e}function Fb(i,t){let e=1-i;return e*e*t}function Bb(i,t){return 2*(1-i)*i*t}function zb(i,t){return i*i*t}function qo(i,t,e,n){return Fb(i,t)+Bb(i,e)+zb(i,n)}function Vb(i,t){let e=1-i;return e*e*e*t}function kb(i,t){let e=1-i;return 3*e*e*i*t}function Hb(i,t){return 3*(1-i)*i*i*t}function Gb(i,t){return i*i*i*t}function Yo(i,t,e,n,s){return Vb(i,t)+kb(i,e)+Hb(i,n)+Gb(i,s)}var ca=class extends Kn{constructor(t=new ut,e=new ut,n=new ut,s=new ut){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new ut){let n=e,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Yo(t,s.x,r.x,o.x,a.x),Yo(t,s.y,r.y,o.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},pc=class extends Kn{constructor(t=new R,e=new R,n=new R,s=new R){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new R){let n=e,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Yo(t,s.x,r.x,o.x,a.x),Yo(t,s.y,r.y,o.y,a.y),Yo(t,s.z,r.z,o.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},ha=class extends Kn{constructor(t=new ut,e=new ut){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new ut){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new ut){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},mc=class extends Kn{constructor(t=new R,e=new R){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new R){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new R){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},da=class extends Kn{constructor(t=new ut,e=new ut,n=new ut){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new ut){let n=e,s=this.v0,r=this.v1,o=this.v2;return n.set(qo(t,s.x,r.x,o.x),qo(t,s.y,r.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},gc=class extends Kn{constructor(t=new R,e=new R,n=new R){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new R){let n=e,s=this.v0,r=this.v1,o=this.v2;return n.set(qo(t,s.x,r.x,o.x),qo(t,s.y,r.y,o.y),qo(t,s.z,r.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},ua=class extends Kn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new ut){let n=e,s=this.points,r=(s.length-1)*t,o=Math.floor(r),a=r-o,c=s[o===0?o:o-1],l=s[o],h=s[o>s.length-2?s.length-1:o+1],u=s[o>s.length-3?s.length-1:o+2];return n.set(Kp(a,c.x,l.x,h.x,u.x),Kp(a,c.y,l.y,h.y,u.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new ut().fromArray(s))}return this}},Jp=Object.freeze({__proto__:null,ArcCurve:uc,CatmullRomCurve3:fc,CubicBezierCurve:ca,CubicBezierCurve3:pc,EllipseCurve:io,LineCurve:ha,LineCurve3:mc,QuadraticBezierCurve:da,QuadraticBezierCurve3:gc,SplineCurve:ua}),_c=class extends Kn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){let t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){let n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Jp[n](e,t))}return this}getPoint(t,e){let n=t*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let o=s[r]-n,a=this.curves[r],c=a.getLength(),l=c===0?0:1-o/c;return a.getPointAt(l,e)}r++}return null}getLength(){let t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let t=[],e=0;for(let n=0,s=this.curves.length;n<s;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){let e=[],n;for(let s=0,r=this.curves;s<r.length;s++){let o=r[s],a=o.isEllipseCurve?t*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?t*o.points.length:t,c=o.getPoints(a);for(let l=0;l<c.length;l++){let h=c[l];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(s.clone())}return this.autoClose=t.autoClose,this}toJSON(){let t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){let s=this.curves[e];t.curves.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(new Jp[s.type]().fromJSON(s))}return this}},fa=class extends _c{constructor(t){super(),this.type="Path",this.currentPoint=new ut,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){let n=new ha(this.currentPoint.clone(),new ut(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,s){let r=new da(this.currentPoint.clone(),new ut(t,e),new ut(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(t,e,n,s,r,o){let a=new ca(this.currentPoint.clone(),new ut(t,e),new ut(n,s),new ut(r,o));return this.curves.push(a),this.currentPoint.set(r,o),this}splineThru(t){let e=[this.currentPoint.clone()].concat(t),n=new ua(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,s,r,o){let a=this.currentPoint.x,c=this.currentPoint.y;return this.absarc(t+a,e+c,n,s,r,o),this}absarc(t,e,n,s,r,o){return this.absellipse(t,e,n,n,s,r,o),this}ellipse(t,e,n,s,r,o,a,c){let l=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+l,e+h,n,s,r,o,a,c),this}absellipse(t,e,n,s,r,o,a,c){let l=new io(t,e,n,s,r,o,a,c);if(this.curves.length>0){let u=l.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(l);let h=l.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){let t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}},bc=class extends fa{constructor(t){super(t),this.uuid=Ci(),this.type="Shape",this.holes=[]}getPointsHoles(t){let e=[];for(let n=0,s=this.holes.length;n<s;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){let s=this.holes[e];t.holes.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(new fa().fromJSON(s))}return this}};function Wb(i,t,e=2){let n=t&&t.length,s=n?t[0]*e:i.length,r=jm(i,0,s,e,!0),o=[];if(!r||r.next===r.prev)return o;let a,c,l;if(n&&(r=$b(i,t,r,e)),i.length>80*e){a=i[0],c=i[1];let h=a,u=c;for(let d=e;d<s;d+=e){let f=i[d],p=i[d+1];f<a&&(a=f),p<c&&(c=p),f>h&&(h=f),p>u&&(u=p)}l=Math.max(h-a,u-c),l=l!==0?32767/l:0}return pa(r,o,e,a,c,l,0),o}function jm(i,t,e,n,s){let r;if(s===ox(i,t,e,n)>0)for(let o=t;o<e;o+=n)r=Qp(o/n|0,i[o],i[o+1],r);else for(let o=e-n;o>=t;o-=n)r=Qp(o/n|0,i[o],i[o+1],r);return r&&so(r,r.next)&&(ga(r),r=r.next),r}function Ks(i,t){if(!i)return i;t||(t=i);let e=i,n;do if(n=!1,!e.steiner&&(so(e,e.next)||Ge(e.prev,e,e.next)===0)){if(ga(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function pa(i,t,e,n,s,r,o){if(!i)return;!o&&r&&tx(i,n,s,r);let a=i;for(;i.prev!==i.next;){let c=i.prev,l=i.next;if(r?qb(i,n,s,r):Xb(i)){t.push(c.i,i.i,l.i),ga(i),i=l.next,a=l.next;continue}if(i=l,i===a){o?o===1?(i=Yb(Ks(i),t),pa(i,t,e,n,s,r,2)):o===2&&Zb(i,t,e,n,s,r):pa(Ks(i),t,e,n,s,r,1);break}}}function Xb(i){let t=i.prev,e=i,n=i.next;if(Ge(t,e,n)>=0)return!1;let s=t.x,r=e.x,o=n.x,a=t.y,c=e.y,l=n.y,h=Math.min(s,r,o),u=Math.min(a,c,l),d=Math.max(s,r,o),f=Math.max(a,c,l),p=n.next;for(;p!==t;){if(p.x>=h&&p.x<=d&&p.y>=u&&p.y<=f&&Go(s,a,r,c,o,l,p.x,p.y)&&Ge(p.prev,p,p.next)>=0)return!1;p=p.next}return!0}function qb(i,t,e,n){let s=i.prev,r=i,o=i.next;if(Ge(s,r,o)>=0)return!1;let a=s.x,c=r.x,l=o.x,h=s.y,u=r.y,d=o.y,f=Math.min(a,c,l),p=Math.min(h,u,d),b=Math.max(a,c,l),g=Math.max(h,u,d),m=Pu(f,p,t,e,n),M=Pu(b,g,t,e,n),w=i.prevZ,_=i.nextZ;for(;w&&w.z>=m&&_&&_.z<=M;){if(w.x>=f&&w.x<=b&&w.y>=p&&w.y<=g&&w!==s&&w!==o&&Go(a,h,c,u,l,d,w.x,w.y)&&Ge(w.prev,w,w.next)>=0||(w=w.prevZ,_.x>=f&&_.x<=b&&_.y>=p&&_.y<=g&&_!==s&&_!==o&&Go(a,h,c,u,l,d,_.x,_.y)&&Ge(_.prev,_,_.next)>=0))return!1;_=_.nextZ}for(;w&&w.z>=m;){if(w.x>=f&&w.x<=b&&w.y>=p&&w.y<=g&&w!==s&&w!==o&&Go(a,h,c,u,l,d,w.x,w.y)&&Ge(w.prev,w,w.next)>=0)return!1;w=w.prevZ}for(;_&&_.z<=M;){if(_.x>=f&&_.x<=b&&_.y>=p&&_.y<=g&&_!==s&&_!==o&&Go(a,h,c,u,l,d,_.x,_.y)&&Ge(_.prev,_,_.next)>=0)return!1;_=_.nextZ}return!0}function Yb(i,t){let e=i;do{let n=e.prev,s=e.next.next;!so(n,s)&&Jm(n,e,e.next,s)&&ma(n,s)&&ma(s,n)&&(t.push(n.i,e.i,s.i),ga(e),ga(e.next),e=i=s),e=e.next}while(e!==i);return Ks(e)}function Zb(i,t,e,n,s,r){let o=i;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&ix(o,a)){let c=Qm(o,a);o=Ks(o,o.next),c=Ks(c,c.next),pa(o,t,e,n,s,r,0),pa(c,t,e,n,s,r,0);return}a=a.next}o=o.next}while(o!==i)}function $b(i,t,e,n){let s=[];for(let r=0,o=t.length;r<o;r++){let a=t[r]*n,c=r<o-1?t[r+1]*n:i.length,l=jm(i,a,c,n,!1);l===l.next&&(l.steiner=!0),s.push(nx(l))}s.sort(jb);for(let r=0;r<s.length;r++)e=Kb(s[r],e);return e}function jb(i,t){let e=i.x-t.x;if(e===0&&(e=i.y-t.y,e===0)){let n=(i.next.y-i.y)/(i.next.x-i.x),s=(t.next.y-t.y)/(t.next.x-t.x);e=n-s}return e}function Kb(i,t){let e=Jb(i,t);if(!e)return t;let n=Qm(e,i);return Ks(n,n.next),Ks(e,e.next)}function Jb(i,t){let e=t,n=i.x,s=i.y,r=-1/0,o;if(so(i,e))return e;do{if(so(i,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){let u=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(u<=n&&u>r&&(r=u,o=e.x<e.next.x?e:e.next,u===n))return o}e=e.next}while(e!==t);if(!o)return null;let a=o,c=o.x,l=o.y,h=1/0;e=o;do{if(n>=e.x&&e.x>=c&&n!==e.x&&Km(s<l?n:r,s,c,l,s<l?r:n,s,e.x,e.y)){let u=Math.abs(s-e.y)/(n-e.x);ma(e,i)&&(u<h||u===h&&(e.x>o.x||e.x===o.x&&Qb(o,e)))&&(o=e,h=u)}e=e.next}while(e!==a);return o}function Qb(i,t){return Ge(i.prev,i,t.prev)<0&&Ge(t.next,i,i.next)<0}function tx(i,t,e,n){let s=i;do s.z===0&&(s.z=Pu(s.x,s.y,t,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,ex(s)}function ex(i){let t,e=1;do{let n=i,s;i=null;let r=null;for(t=0;n;){t++;let o=n,a=0;for(let l=0;l<e&&(a++,o=o.nextZ,!!o);l++);let c=e;for(;a>0||c>0&&o;)a!==0&&(c===0||!o||n.z<=o.z)?(s=n,n=n.nextZ,a--):(s=o,o=o.nextZ,c--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=o}r.nextZ=null,e*=2}while(t>1);return i}function Pu(i,t,e,n,s){return i=(i-e)*s|0,t=(t-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,i|t<<1}function nx(i){let t=i,e=i;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==i);return e}function Km(i,t,e,n,s,r,o,a){return(s-o)*(t-a)>=(i-o)*(r-a)&&(i-o)*(n-a)>=(e-o)*(t-a)&&(e-o)*(r-a)>=(s-o)*(n-a)}function Go(i,t,e,n,s,r,o,a){return!(i===o&&t===a)&&Km(i,t,e,n,s,r,o,a)}function ix(i,t){return i.next.i!==t.i&&i.prev.i!==t.i&&!sx(i,t)&&(ma(i,t)&&ma(t,i)&&rx(i,t)&&(Ge(i.prev,i,t.prev)||Ge(i,t.prev,t))||so(i,t)&&Ge(i.prev,i,i.next)>0&&Ge(t.prev,t,t.next)>0)}function Ge(i,t,e){return(t.y-i.y)*(e.x-t.x)-(t.x-i.x)*(e.y-t.y)}function so(i,t){return i.x===t.x&&i.y===t.y}function Jm(i,t,e,n){let s=Hl(Ge(i,t,e)),r=Hl(Ge(i,t,n)),o=Hl(Ge(e,n,i)),a=Hl(Ge(e,n,t));return!!(s!==r&&o!==a||s===0&&kl(i,e,t)||r===0&&kl(i,n,t)||o===0&&kl(e,i,n)||a===0&&kl(e,t,n))}function kl(i,t,e){return t.x<=Math.max(i.x,e.x)&&t.x>=Math.min(i.x,e.x)&&t.y<=Math.max(i.y,e.y)&&t.y>=Math.min(i.y,e.y)}function Hl(i){return i>0?1:i<0?-1:0}function sx(i,t){let e=i;do{if(e.i!==i.i&&e.next.i!==i.i&&e.i!==t.i&&e.next.i!==t.i&&Jm(e,e.next,i,t))return!0;e=e.next}while(e!==i);return!1}function ma(i,t){return Ge(i.prev,i,i.next)<0?Ge(i,t,i.next)>=0&&Ge(i,i.prev,t)>=0:Ge(i,t,i.prev)<0||Ge(i,i.next,t)<0}function rx(i,t){let e=i,n=!1,s=(i.x+t.x)/2,r=(i.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&s<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==i);return n}function Qm(i,t){let e=Lu(i.i,i.x,i.y),n=Lu(t.i,t.x,t.y),s=i.next,r=t.prev;return i.next=t,t.prev=i,e.next=s,s.prev=e,n.next=e,e.prev=n,r.next=n,n.prev=r,n}function Qp(i,t,e,n){let s=Lu(i,t,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function ga(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function Lu(i,t,e){return{i,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function ox(i,t,e,n){let s=0;for(let r=t,o=e-n;r<e;r+=n)s+=(i[o]-i[r])*(i[r+1]+i[o+1]),o=r;return s}var Du=class{static triangulate(t,e,n=2){return Wb(t,e,n)}},qr=class i{static area(t){let e=t.length,n=0;for(let s=e-1,r=0;r<e;s=r++)n+=t[s].x*t[r].y-t[r].x*t[s].y;return n*.5}static isClockWise(t){return i.area(t)<0}static triangulateShape(t,e){let n=[],s=[],r=[];tm(t),em(n,t);let o=t.length;e.forEach(tm);for(let c=0;c<e.length;c++)s.push(o),o+=e[c].length,em(n,e[c]);let a=Du.triangulate(n,s);for(let c=0;c<a.length;c+=3)r.push(a.slice(c,c+3));return r}};function tm(i){let t=i.length;t>2&&i[t-1].equals(i[0])&&i.pop()}function em(i,t){for(let e=0;e<t.length;e++)i.push(t[e].x),i.push(t[e].y)}var _a=class i extends Be{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};let r=t/2,o=e/2,a=Math.floor(n),c=Math.floor(s),l=a+1,h=c+1,u=t/a,d=e/c,f=[],p=[],b=[],g=[];for(let m=0;m<h;m++){let M=m*d-o;for(let w=0;w<l;w++){let _=w*u-r;p.push(_,-M,0),b.push(0,0,1),g.push(w/a),g.push(1-m/c)}}for(let m=0;m<c;m++)for(let M=0;M<a;M++){let w=M+l*m,_=M+l*(m+1),E=M+1+l*(m+1),T=M+1+l*m;f.push(w,_,T),f.push(_,E,T)}this.setIndex(f),this.setAttribute("position",new qe(p,3)),this.setAttribute("normal",new qe(b,3)),this.setAttribute("uv",new qe(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}};var ba=class i extends Be{constructor(t=new bc([new ut(0,.5),new ut(-.5,-.5),new ut(.5,-.5)]),e=12){super(),this.type="ShapeGeometry",this.parameters={shapes:t,curveSegments:e};let n=[],s=[],r=[],o=[],a=0,c=0;if(Array.isArray(t)===!1)l(t);else for(let h=0;h<t.length;h++)l(t[h]),this.addGroup(a,c,h),a+=c,c=0;this.setIndex(n),this.setAttribute("position",new qe(s,3)),this.setAttribute("normal",new qe(r,3)),this.setAttribute("uv",new qe(o,2));function l(h){let u=s.length/3,d=h.extractPoints(e),f=d.shape,p=d.holes;qr.isClockWise(f)===!1&&(f=f.reverse());for(let g=0,m=p.length;g<m;g++){let M=p[g];qr.isClockWise(M)===!0&&(p[g]=M.reverse())}let b=qr.triangulateShape(f,p);for(let g=0,m=p.length;g<m;g++){let M=p[g];f=f.concat(M)}for(let g=0,m=f.length;g<m;g++){let M=f[g];s.push(M.x,M.y,0),r.push(0,0,1),o.push(M.x,M.y)}for(let g=0,m=b.length;g<m;g++){let M=b[g],w=M[0]+u,_=M[1]+u,E=M[2]+u;n.push(w,_,E),c+=3}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes;return ax(e,t)}static fromJSON(t,e){let n=[];for(let s=0,r=t.shapes.length;s<r;s++){let o=e[t.shapes[s]];n.push(o)}return new i(n,t.curveSegments)}};function ax(i,t){if(t.shapes=[],Array.isArray(i))for(let e=0,n=i.length;e<n;e++){let s=i[e];t.shapes.push(s.uuid)}else t.shapes.push(i.uuid);return t}var xa=class extends Be{constructor(t=null){if(super(),this.type="WireframeGeometry",this.parameters={geometry:t},t!==null){let e=[],n=new Set,s=new R,r=new R;if(t.index!==null){let o=t.attributes.position,a=t.index,c=t.groups;c.length===0&&(c=[{start:0,count:a.count,materialIndex:0}]);for(let l=0,h=c.length;l<h;++l){let u=c[l],d=u.start,f=u.count;for(let p=d,b=d+f;p<b;p+=3)for(let g=0;g<3;g++){let m=a.getX(p+g),M=a.getX(p+(g+1)%3);s.fromBufferAttribute(o,m),r.fromBufferAttribute(o,M),nm(s,r,n)===!0&&(e.push(s.x,s.y,s.z),e.push(r.x,r.y,r.z))}}}else{let o=t.attributes.position;for(let a=0,c=o.count/3;a<c;a++)for(let l=0;l<3;l++){let h=3*a+l,u=3*a+(l+1)%3;s.fromBufferAttribute(o,h),r.fromBufferAttribute(o,u),nm(s,r,n)===!0&&(e.push(s.x,s.y,s.z),e.push(r.x,r.y,r.z))}}this.setAttribute("position",new qe(e,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}};function nm(i,t,e){let n=`${i.x},${i.y},${i.z}-${t.x},${t.y},${t.z}`,s=`${t.x},${t.y},${t.z}-${i.x},${i.y},${i.z}`;return e.has(n)===!0||e.has(s)===!0?!1:(e.add(n),e.add(s),!0)}function nr(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let s=i[e][n];if(im(s))s.isRenderTargetTexture?(Xt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if(im(s[0])){let r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function Pn(i){let t={};for(let e=0;e<i.length;e++){let n=nr(i[e]);for(let s in n)t[s]=n[s]}return t}function im(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function lx(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function hf(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:ce.workingColorSpace}var ir={clone:nr,merge:Pn},cx=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,hx=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,xn=class extends bi{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=cx,this.fragmentShader=hx,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=nr(t.uniforms),this.uniformsGroups=lx(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new kt().setHex(s.value);break;case"v2":this.uniforms[n].value=new ut().fromArray(s.value);break;case"v3":this.uniforms[n].value=new R().fromArray(s.value);break;case"v4":this.uniforms[n].value=new ye().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Kt().fromArray(s.value);break;case"m4":this.uniforms[n].value=new jt().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},xc=class extends xn{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}};var ya=class extends bi{constructor(t){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new kt(16777215),this.specular=new kt(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new kt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Va,this.normalScale=new ut(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Li,this.combine=Pa,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.specular.copy(t.specular),this.shininess=t.shininess,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.envMapIntensity=t.envMapIntensity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}};var Js=class extends bi{constructor(t){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new kt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new kt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Va,this.normalScale=new ut(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Li,this.combine=Pa,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.envMapIntensity=t.envMapIntensity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},yc=class extends bi{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Um,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},vc=class extends bi{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};var va=class extends ra{constructor(t){super(),this.isLineDashedMaterial=!0,this.type="LineDashedMaterial",this.scale=1,this.dashSize=3,this.gapSize=1,this.setValues(t)}copy(t){return super.copy(t),this.scale=t.scale,this.dashSize=t.dashSize,this.gapSize=t.gapSize,this}};function Vr(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}function Mu(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}var Ss=class{constructor(t,e,n,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,s=e[n],r=e[n-1];t:{e:{let o;n:{i:if(!(t<s)){for(let a=n+2;;){if(s===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=s,s=e[++n],t<s)break e}o=e.length;break n}if(!(t>=r)){let a=e[1];t<a&&(n=2,r=a);for(let c=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(s=r,r=e[--n-1],t>=r)break e}o=n,n=0;break n}break t}for(;n<o;){let a=n+o>>>1;t<e[a]?o=a:n=a+1}if(s=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=t*s;for(let o=0;o!==s;++o)e[o]=n[r+o];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},Sc=class extends Ss{constructor(t,e,n,s){super(t,e,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Au,endingEnd:Au}}intervalChanged_(t,e,n){let s=this.parameterPositions,r=t-2,o=t+1,a=s[r],c=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case Iu:r=t,a=2*e-n;break;case Ru:r=s.length-2,a=e+s[r]-s[r+1];break;default:r=t,a=n}if(c===void 0)switch(this.getSettings_().endingEnd){case Iu:o=t,c=2*n-e;break;case Ru:o=1,c=n+s[1]-s[0];break;default:o=t-1,c=e}let l=(n-e)*.5,h=this.valueSize;this._weightPrev=l/(e-a),this._weightNext=l/(c-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=t*a,l=c-a,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-e)/(s-e),b=p*p,g=b*p,m=-d*g+2*d*b-d*p,M=(1+d)*g+(-1.5-2*d)*b+(-.5+d)*p+1,w=(-1-f)*g+(1.5+f)*b+.5*p,_=f*g-f*b;for(let E=0;E!==a;++E)r[E]=m*o[h+E]+M*o[l+E]+w*o[c+E]+_*o[u+E];return r}},Mc=class extends Ss{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=t*a,l=c-a,h=(n-e)/(s-e),u=1-h;for(let d=0;d!==a;++d)r[d]=o[l+d]*u+o[c+d]*h;return r}},wc=class extends Ss{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t){return this.copySampleValue_(t-1)}},Ec=class extends Ss{interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=t*a,l=c-a,h=this.inTangents,u=this.outTangents;if(!h||!u){let p=(n-e)/(s-e),b=1-p;for(let g=0;g!==a;++g)r[g]=o[l+g]*b+o[c+g]*p;return r}let d=a*2,f=t-1;for(let p=0;p!==a;++p){let b=o[l+p],g=o[c+p],m=f*d+p*2,M=u[m],w=u[m+1],_=t*d+p*2,E=h[_],T=h[_+1],I=ux(n,e,M,E,s);r[p]=tg(I,b,w,T,g)}return r}};function tg(i,t,e,n,s){let r=1-i;return r*r*r*t+3*r*r*i*e+3*r*i*i*n+i*i*i*s}function dx(i,t,e,n,s){let r=1-i;return 3*r*r*(e-t)+6*r*i*(n-e)+3*i*i*(s-n)}function ux(i,t,e,n,s){let r=(i-t)/(s-t);for(let o=0;o<8;o++){let a=tg(r,t,e,n,s)-i;if(Math.abs(a)<1e-10)break;let c=dx(r,t,e,n,s);if(Math.abs(c)<1e-10)break;r=Math.max(0,Math.min(1,r-a/c))}return r}var Jn=class{constructor(t,e,n,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=Vr(e,this.TimeBufferType),this.values=Vr(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:Vr(t.times,Array),values:Vr(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(n.interpolation=s),Mu(t.settings)&&(n.settings={inTangents:Vr(t.settings.inTangents,Array),outTangents:Vr(t.settings.outTangents,Array)})}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new wc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new Mc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new Sc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new Ec(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case Zo:e=this.InterpolantFactoryMethodDiscrete;break;case ic:e=this.InterpolantFactoryMethodLinear;break;case ql:e=this.InterpolantFactoryMethodSmooth;break;case Tu:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Xt("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Zo;case this.InterpolantFactoryMethodLinear:return ic;case this.InterpolantFactoryMethodSmooth:return ql;case this.InterpolantFactoryMethodBezier:return Tu}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]*=t;Mu(this.settings)&&(sm(this.settings.inTangents,t),sm(this.settings.outTangents,t))}return this}trim(t,e){let n=this.times,s=n.length,r=0,o=s-1;for(;r!==s&&n[r]<t;)++r;for(;o!==-1&&n[o]>e;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(Zt("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Zt("KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==r;a++){let c=n[a];if(typeof c=="number"&&isNaN(c)){Zt("KeyframeTrack: Time is not a valid number.",this,a,c),t=!1;break}if(o!==null&&o>c){Zt("KeyframeTrack: Out of order keys.",this,a,c,o),t=!1;break}o=c}if(s!==void 0&&nb(s))for(let a=0,c=s.length;a!==c;++a){let l=s[a];if(isNaN(l)){Zt("KeyframeTrack: Value is not a valid number.",this,a,l),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===ql,r=t.length-1,o=1;for(let a=1;a<r;++a){let c=!1,l=t[a],h=t[a+1];if(l!==h&&(a!==1||l!==t[0]))if(s)c=!0;else{let u=a*n,d=u-n,f=u+n;for(let p=0;p!==n;++p){let b=e[u+p];if(b!==e[d+p]||b!==e[f+p]){c=!0;break}}}if(c){if(a!==o){t[o]=t[a];let u=a*n,d=o*n;for(let f=0;f!==n;++f)e[d+f]=e[u+f]}++o}}if(r>0){t[o]=t[r];for(let a=r*n,c=o*n,l=0;l!==n;++l)e[c+l]=e[a+l];++o}return o!==t.length?(this.times=t.slice(0,o),this.values=e.slice(0,o*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,s=new n(this.name,t,e);return s.createInterpolant=this.createInterpolant,Mu(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function sm(i,t){for(let e=0,n=i.length;e!==n;e+=2)i[e]*=t}Jn.prototype.ValueTypeName="";Jn.prototype.TimeBufferType=Float32Array;Jn.prototype.ValueBufferType=Float32Array;Jn.prototype.DefaultInterpolation=ic;var Ms=class extends Jn{constructor(t,e,n){super(t,e,n)}};Ms.prototype.ValueTypeName="bool";Ms.prototype.ValueBufferType=Array;Ms.prototype.DefaultInterpolation=Zo;Ms.prototype.InterpolantFactoryMethodLinear=void 0;Ms.prototype.InterpolantFactoryMethodSmooth=void 0;var Tc=class extends Jn{constructor(t,e,n,s){super(t,e,n,s)}};Tc.prototype.ValueTypeName="color";var Ac=class extends Jn{constructor(t,e,n,s){super(t,e,n,s)}};Ac.prototype.ValueTypeName="number";var Ic=class extends Ss{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=(n-e)/(s-e),l=t*a;for(let h=l+a;l!==h;l+=4)$n.slerpFlat(r,0,o,l-a,o,l,c);return r}},Sa=class extends Jn{constructor(t,e,n,s){super(t,e,n,s)}InterpolantFactoryMethodLinear(t){return new Ic(this.times,this.values,this.getValueSize(),t)}};Sa.prototype.ValueTypeName="quaternion";Sa.prototype.InterpolantFactoryMethodSmooth=void 0;var ws=class extends Jn{constructor(t,e,n){super(t,e,n)}};ws.prototype.ValueTypeName="string";ws.prototype.ValueBufferType=Array;ws.prototype.DefaultInterpolation=Zo;ws.prototype.InterpolantFactoryMethodLinear=void 0;ws.prototype.InterpolantFactoryMethodSmooth=void 0;var Rc=class extends Jn{constructor(t,e,n,s){super(t,e,n,s)}};Rc.prototype.ValueTypeName="vector";var Cc=class{constructor(t,e,n){let s=this,r=!1,o=0,a=0,c,l=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,u){return l.push(h,u),this},this.removeHandler=function(h){let u=l.indexOf(h);return u!==-1&&l.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=l.length;u<d;u+=2){let f=l[u],p=l[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return p}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},eg=new Cc,Pc=class{constructor(t){this.manager=t!==void 0?t:eg,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};Pc.DEFAULT_MATERIAL_NAME="__DEFAULT";var Ma=class extends Ye{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new kt(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}},wa=class extends Ma{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Ye.DEFAULT_UP),this.updateMatrix(),this.groundColor=new kt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){let e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}},wu=new jt,rm=new R,om=new R,Lc=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ut(512,512),this.mapType=Hn,this.map=null,this.mapPass=null,this.matrix=new jt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Cn,this._frameExtents=new ut(1,1),this._viewportCount=1,this._viewports=[new ye(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;rm.setFromMatrixPosition(t.matrixWorld),e.position.copy(rm),om.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(om),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,s){wu.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(wu,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,o=s?s.z/r.x:1,a=s?s.w/r.y:1,c=s?s.x/r.x:0,l=s?s.y/r.y:0;t.coordinateSystem===Zr||t.reversedDepth?e.set(.5*o,0,0,.5*o+c,0,.5*a,0,.5*a+l,0,0,1,0,0,0,0,1):e.set(.5*o,0,0,.5*o+c,0,.5*a,0,.5*a+l,0,0,.5,.5,0,0,0,1),e.multiply(wu)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},Gl=new R,Wl=new $n,Ii=new R,Ea=class extends Ye{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new jt,this.projectionMatrix=new jt,this.projectionMatrixInverse=new jt,this.coordinateSystem=gi,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(Gl,Wl,Ii),Ii.x===1&&Ii.y===1&&Ii.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Gl,Wl,Ii.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(Gl,Wl,Ii),Ii.x===1&&Ii.y===1&&Ii.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Gl,Wl,Ii.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},ys=new R,am=new ut,lm=new ut,dn=class extends Ea{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=jr*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Wo*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return jr*2*Math.atan(Math.tan(Wo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){ys.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(ys.x,ys.y).multiplyScalar(-t/ys.z),ys.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ys.x,ys.y).multiplyScalar(-t/ys.z)}getViewSize(t,e){return this.getViewBounds(t,am,lm),e.subVectors(lm,am)}setViewOffset(t,e,n,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(Wo*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let c=o.fullWidth,l=o.fullHeight;r+=o.offsetX*s/c,e-=o.offsetY*n/l,s*=o.width/c,n*=o.height/l}let a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}};var Es=class extends Ea{constructor(t=-1,e=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-t,o=n+t,a=s+e,c=s-e;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,o=r+l*this.view.width,a-=h*this.view.offsetY,c=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},Nu=class extends Lc{constructor(){super(new Es(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Ta=class extends Ma{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Ye.DEFAULT_UP),this.updateMatrix(),this.target=new Ye,this.shadow=new Nu}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}};var Qs=class extends Be{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(t){return super.copy(t),this.instanceCount=t.instanceCount,this}toJSON(){let t=super.toJSON();return t.instanceCount=this.instanceCount,t.isInstancedBufferGeometry=!0,t}};var kr=-90,Hr=1,Dc=class extends Ye{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new dn(kr,Hr,t,e);s.layers=this.layers,this.add(s);let r=new dn(kr,Hr,t,e);r.layers=this.layers,this.add(r);let o=new dn(kr,Hr,t,e);o.layers=this.layers,this.add(o);let a=new dn(kr,Hr,t,e);a.layers=this.layers,this.add(a);let c=new dn(kr,Hr,t,e);c.layers=this.layers,this.add(c);let l=new dn(kr,Hr,t,e);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,s,r,o,a,c]=e;for(let l of e)this.remove(l);if(t===gi)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===Zr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let l of e)this.add(l),l.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,c,l,h]=this.children,u=t.getRenderTarget(),d=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),p=t.xr.enabled;t.xr.enabled=!1;let b=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let g=!1;t.isWebGLRenderer===!0?g=t.state.buffers.depth.getReversed():g=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,2,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,3,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),t.setRenderTarget(n,4,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),n.texture.generateMipmaps=b,t.setRenderTarget(n,5,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(u,d,f),t.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},Nc=class extends dn{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}};var df="\\[\\]\\.:\\/",fx=new RegExp("["+df+"]","g"),uf="[^"+df+"]",px="[^"+df.replace("\\.","")+"]",mx=/((?:WC+[\/:])*)/.source.replace("WC",uf),gx=/(WCOD+)?/.source.replace("WCOD",px),_x=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",uf),bx=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",uf),xx=new RegExp("^"+mx+gx+_x+bx+"$"),yx=["material","materials","bones","map"],Ou=class{constructor(t,e,n){let s=n||Ue.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},Ue=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(fx,"")}static parseTrackName(t){let e=xx.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);yx.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===e||a.uuid===e)return a;let c=n(a.children);if(c)return c}return null},s=n(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)t[e++]=n[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){Xt("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=e.objectIndex;switch(n){case"materials":if(!t.material){Zt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){Zt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){Zt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===l){l=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){Zt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){Zt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){Zt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(l!==void 0){if(t[l]===void 0){Zt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[l]}}let o=t[s];if(o===void 0){let l=e.nodeName;Zt("PropertyBinding: Trying to update property for track: "+l+"."+s+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?a=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){Zt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){Zt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Ue.Composite=Ou;Ue.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Ue.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Ue.prototype.GetterByBindingType=[Ue.prototype._getValue_direct,Ue.prototype._getValue_array,Ue.prototype._getValue_arrayElement,Ue.prototype._getValue_toArray];Ue.prototype.SetterByBindingTypeAndVersioning=[[Ue.prototype._setValue_direct,Ue.prototype._setValue_direct_setNeedsUpdate,Ue.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Ue.prototype._setValue_array,Ue.prototype._setValue_array_setNeedsUpdate,Ue.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Ue.prototype._setValue_arrayElement,Ue.prototype._setValue_arrayElement_setNeedsUpdate,Ue.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Ue.prototype._setValue_fromArray,Ue.prototype._setValue_fromArray_setNeedsUpdate,Ue.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var P1=new Float32Array(1);var Di=class extends ac{constructor(t,e,n=1){super(t,e),this.isInstancedInterleavedBuffer=!0,this.meshPerAttribute=n}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}clone(t){let e=super.clone(t);return e.meshPerAttribute=this.meshPerAttribute,e}toJSON(t){let e=super.toJSON(t);return e.isInstancedInterleavedBuffer=!0,e.meshPerAttribute=this.meshPerAttribute,e}};var cm=new jt,Aa=class{constructor(t,e,n=0,s=1/0){this.ray=new jn(t,e),this.near=n,this.far=s,this.camera=null,this.layers=new Jr,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):Zt("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return cm.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(cm),this}intersectObject(t,e=!0,n=[]){return Uu(t,this,n,e),n.sort(hm),n}intersectObjects(t,e=!0,n=[]){for(let s=0,r=t.length;s<r;s++)Uu(t[s],this,n,e);return n.sort(hm),n}};function hm(i,t){return i.distance-t.distance}function Uu(i,t,e,n){let s=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(s=!1),s===!0&&n===!0){let r=i.children;for(let o=0,a=r.length;o<a;o++)Uu(r[o],t,e,!0)}}var ro=class{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=$t(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos($t(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var bf=class bf{constructor(t,e,n,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=s,this}};bf.prototype.isMatrix2=!0;var Fu=bf;var dm=new R,Xl=new R,Gr=new R,Wr=new R,Eu=new R,vx=new R,Sx=new R,Ia=class{constructor(t=new R,e=new R){this.start=t,this.end=e}set(t,e){return this.start.copy(t),this.end.copy(e),this}copy(t){return this.start.copy(t.start),this.end.copy(t.end),this}getCenter(t){return t.addVectors(this.start,this.end).multiplyScalar(.5)}delta(t){return t.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(t,e){return this.delta(e).multiplyScalar(t).add(this.start)}closestPointToPointParameter(t,e){dm.subVectors(t,this.start),Xl.subVectors(this.end,this.start);let n=Xl.dot(Xl);if(n===0)return 0;let r=Xl.dot(dm)/n;return e&&(r=$t(r,0,1)),r}closestPointToPoint(t,e,n){let s=this.closestPointToPointParameter(t,e);return this.delta(n).multiplyScalar(s).add(this.start)}distanceSqToLine3(t,e=vx,n=Sx){let s=10000000000000001e-32,r,o,a=this.start,c=t.start,l=this.end,h=t.end;Gr.subVectors(l,a),Wr.subVectors(h,c),Eu.subVectors(a,c);let u=Gr.dot(Gr),d=Wr.dot(Wr),f=Wr.dot(Eu);if(u<=s&&d<=s)return e.copy(a),n.copy(c),e.sub(n),e.dot(e);if(u<=s)r=0,o=f/d,o=$t(o,0,1);else{let p=Gr.dot(Eu);if(d<=s)o=0,r=$t(-p/u,0,1);else{let b=Gr.dot(Wr),g=u*d-b*b;g!==0?r=$t((b*f-p*d)/g,0,1):r=0,o=(b*r+f)/d,o<0?(o=0,r=$t(-p/u,0,1)):o>1&&(o=1,r=$t((b-p)/u,0,1))}}return e.copy(a).addScaledVector(Gr,r),n.copy(c).addScaledVector(Wr,o),e.distanceToSquared(n)}applyMatrix4(t){return this.start.applyMatrix4(t),this.end.applyMatrix4(t),this}equals(t){return t.start.equals(this.start)&&t.end.equals(this.end)}clone(){return new this.constructor().copy(this)}};var Ra=class extends _i{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}};function ff(i,t,e,n){let s=Mx(n);switch(e){case nf:return i*t;case rf:return i*t/s.components*s.byteLength;case Gc:return i*t/s.components*s.byteLength;case Cs:return i*t*2/s.components*s.byteLength;case Wc:return i*t*2/s.components*s.byteLength;case sf:return i*t*3/s.components*s.byteLength;case oi:return i*t*4/s.components*s.byteLength;case Xc:return i*t*4/s.components*s.byteLength;case Na:case Oa:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Ua:case Fa:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Yc:case $c:return Math.max(i,16)*Math.max(t,8)/4;case qc:case Zc:return Math.max(i,8)*Math.max(t,8)/2;case jc:case Kc:case Qc:case th:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Jc:case Ba:case eh:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case nh:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case ih:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case sh:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case rh:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case oh:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case ah:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case lh:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case ch:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case hh:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case dh:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case uh:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case fh:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case ph:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case mh:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case gh:case _h:case bh:return Math.ceil(i/4)*Math.ceil(t/4)*16;case xh:case yh:return Math.ceil(i/4)*Math.ceil(t/4)*8;case za:case vh:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Mx(i){switch(i){case Hn:case Ju:return{byteLength:1,components:1};case lo:case Qu:case Mi:return{byteLength:2,components:1};case kc:case Hc:return{byteLength:2,components:4};case vi:case Vc:case Si:return{byteLength:4,components:1};case tf:case ef:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Uc}}));typeof window<"u"&&(window.__THREE__?Xt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Uc);function Mg(){let i=null,t=!1,e=null,n=null;function s(r,o){n=i.requestAnimationFrame(s),e(r,o)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function wx(i){let t=new WeakMap;function e(a,c){let l=a.array,h=a.usage,u=l.byteLength,d=i.createBuffer();i.bindBuffer(c,d),i.bufferData(c,l,h),a.onUploadCallback();let f;if(l instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)f=i.HALF_FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=i.SHORT;else if(l instanceof Uint32Array)f=i.UNSIGNED_INT;else if(l instanceof Int32Array)f=i.INT;else if(l instanceof Int8Array)f=i.BYTE;else if(l instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:d,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:u}}function n(a,c,l){let h=c.array,u=c.updateRanges;if(i.bindBuffer(l,a),u.length===0)i.bufferSubData(l,0,h);else{u.sort((f,p)=>f.start-p.start);let d=0;for(let f=1;f<u.length;f++){let p=u[d],b=u[f];b.start<=p.start+p.count+1?p.count=Math.max(p.count,b.start+b.count-p.start):(++d,u[d]=b)}u.length=d+1;for(let f=0,p=u.length;f<p;f++){let b=u[f];i.bufferSubData(l,b.start*h.BYTES_PER_ELEMENT,h,b.start,b.count)}c.clearUpdateRanges()}c.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let c=t.get(a);c&&(i.deleteBuffer(c.buffer),t.delete(a))}function o(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let l=t.get(a);if(l===void 0)t.set(a,e(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,a,c),l.version=a.version}}return{get:s,remove:r,update:o}}var Ex=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Tx=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Ax=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Ix=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Rx=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Cx=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Px=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Lx=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Dx=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Nx=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Ox=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Ux=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Fx=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Bx=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,zx=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Vx=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,kx=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Hx=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Gx=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Wx=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Xx=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,qx=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Yx=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Zx=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,$x=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,jx=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,Kx=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Jx=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Qx=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,ty=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,ey="gl_FragColor = linearToOutputTexel( gl_FragColor );",ny=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,iy=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,sy=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,ry=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,oy=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,ay=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,ly=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,cy=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,hy=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,dy=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,uy=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,fy=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,py=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,my=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,gy=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,_y=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,by=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,xy=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,yy=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,vy=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Sy=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,My=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,wy=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Ey=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Ty=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ay=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,Iy=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Ry=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Cy=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Py=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Ly=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Dy=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Ny=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Oy=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Uy=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Fy=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,By=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,zy=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Vy=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,ky=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Hy=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Gy=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Wy=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Xy=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,qy=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Yy=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Zy=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,$y=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,jy=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Ky=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Jy=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Qy=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,tv=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,ev=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,nv=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,iv=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,sv=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,rv=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,ov=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,av=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,lv=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,cv=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,hv=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,dv=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,uv=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,fv=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,pv=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,mv=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,gv=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,_v=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,bv=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,xv=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,yv=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,vv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Sv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Mv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,wv=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Ev=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Tv=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Av=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Iv=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Rv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Cv=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Pv=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Lv=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Dv=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Nv=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,Ov=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Uv=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Fv=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Bv=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,zv=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Vv=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kv=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Hv=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Gv=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Wv=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Xv=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,qv=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Yv=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Zv=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,$v=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,jv=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Kv=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Jv=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Qv=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,tS=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,eS=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,nS=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,iS=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sS=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,se={alphahash_fragment:Ex,alphahash_pars_fragment:Tx,alphamap_fragment:Ax,alphamap_pars_fragment:Ix,alphatest_fragment:Rx,alphatest_pars_fragment:Cx,aomap_fragment:Px,aomap_pars_fragment:Lx,batching_pars_vertex:Dx,batching_vertex:Nx,begin_vertex:Ox,beginnormal_vertex:Ux,bsdfs:Fx,iridescence_fragment:Bx,bumpmap_pars_fragment:zx,clipping_planes_fragment:Vx,clipping_planes_pars_fragment:kx,clipping_planes_pars_vertex:Hx,clipping_planes_vertex:Gx,color_fragment:Wx,color_pars_fragment:Xx,color_pars_vertex:qx,color_vertex:Yx,common:Zx,cube_uv_reflection_fragment:$x,defaultnormal_vertex:jx,displacementmap_pars_vertex:Kx,displacementmap_vertex:Jx,emissivemap_fragment:Qx,emissivemap_pars_fragment:ty,colorspace_fragment:ey,colorspace_pars_fragment:ny,envmap_fragment:iy,envmap_common_pars_fragment:sy,envmap_pars_fragment:ry,envmap_pars_vertex:oy,envmap_physical_pars_fragment:_y,envmap_vertex:ay,fog_vertex:ly,fog_pars_vertex:cy,fog_fragment:hy,fog_pars_fragment:dy,gradientmap_pars_fragment:uy,lightmap_pars_fragment:fy,lights_lambert_fragment:py,lights_lambert_pars_fragment:my,lights_pars_begin:gy,lights_toon_fragment:by,lights_toon_pars_fragment:xy,lights_phong_fragment:yy,lights_phong_pars_fragment:vy,lights_physical_fragment:Sy,lights_physical_pars_fragment:My,lights_fragment_begin:wy,lights_fragment_maps:Ey,lights_fragment_end:Ty,lightprobes_pars_fragment:Ay,logdepthbuf_fragment:Iy,logdepthbuf_pars_fragment:Ry,logdepthbuf_pars_vertex:Cy,logdepthbuf_vertex:Py,map_fragment:Ly,map_pars_fragment:Dy,map_particle_fragment:Ny,map_particle_pars_fragment:Oy,metalnessmap_fragment:Uy,metalnessmap_pars_fragment:Fy,morphinstance_vertex:By,morphcolor_vertex:zy,morphnormal_vertex:Vy,morphtarget_pars_vertex:ky,morphtarget_vertex:Hy,normal_fragment_begin:Gy,normal_fragment_maps:Wy,normal_pars_fragment:Xy,normal_pars_vertex:qy,normal_vertex:Yy,normalmap_pars_fragment:Zy,clearcoat_normal_fragment_begin:$y,clearcoat_normal_fragment_maps:jy,clearcoat_pars_fragment:Ky,iridescence_pars_fragment:Jy,opaque_fragment:Qy,packing:tv,premultiplied_alpha_fragment:ev,project_vertex:nv,dithering_fragment:iv,dithering_pars_fragment:sv,roughnessmap_fragment:rv,roughnessmap_pars_fragment:ov,shadowmap_pars_fragment:av,shadowmap_pars_vertex:lv,shadowmap_vertex:cv,shadowmask_pars_fragment:hv,skinbase_vertex:dv,skinning_pars_vertex:uv,skinning_vertex:fv,skinnormal_vertex:pv,specularmap_fragment:mv,specularmap_pars_fragment:gv,tonemapping_fragment:_v,tonemapping_pars_fragment:bv,transmission_fragment:xv,transmission_pars_fragment:yv,uv_pars_fragment:vv,uv_pars_vertex:Sv,uv_vertex:Mv,worldpos_vertex:wv,background_vert:Ev,background_frag:Tv,backgroundCube_vert:Av,backgroundCube_frag:Iv,cube_vert:Rv,cube_frag:Cv,depth_vert:Pv,depth_frag:Lv,distance_vert:Dv,distance_frag:Nv,equirect_vert:Ov,equirect_frag:Uv,linedashed_vert:Fv,linedashed_frag:Bv,meshbasic_vert:zv,meshbasic_frag:Vv,meshlambert_vert:kv,meshlambert_frag:Hv,meshmatcap_vert:Gv,meshmatcap_frag:Wv,meshnormal_vert:Xv,meshnormal_frag:qv,meshphong_vert:Yv,meshphong_frag:Zv,meshphysical_vert:$v,meshphysical_frag:jv,meshtoon_vert:Kv,meshtoon_frag:Jv,points_vert:Qv,points_frag:tS,shadow_vert:eS,shadow_frag:nS,sprite_vert:iS,sprite_frag:sS},ft={common:{diffuse:{value:new kt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Kt},alphaMap:{value:null},alphaMapTransform:{value:new Kt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Kt}},envmap:{envMap:{value:null},envMapRotation:{value:new Kt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Kt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Kt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Kt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Kt},normalScale:{value:new ut(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Kt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Kt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Kt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Kt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new kt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new R},probesMax:{value:new R},probesResolution:{value:new R}},points:{diffuse:{value:new kt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Kt},alphaTest:{value:0},uvTransform:{value:new Kt}},sprite:{diffuse:{value:new kt(16777215)},opacity:{value:1},center:{value:new ut(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Kt},alphaMap:{value:null},alphaMapTransform:{value:new Kt},alphaTest:{value:0}}},On={basic:{uniforms:Pn([ft.common,ft.specularmap,ft.envmap,ft.aomap,ft.lightmap,ft.fog]),vertexShader:se.meshbasic_vert,fragmentShader:se.meshbasic_frag},lambert:{uniforms:Pn([ft.common,ft.specularmap,ft.envmap,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.fog,ft.lights,{emissive:{value:new kt(0)},envMapIntensity:{value:1}}]),vertexShader:se.meshlambert_vert,fragmentShader:se.meshlambert_frag},phong:{uniforms:Pn([ft.common,ft.specularmap,ft.envmap,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.fog,ft.lights,{emissive:{value:new kt(0)},specular:{value:new kt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:se.meshphong_vert,fragmentShader:se.meshphong_frag},standard:{uniforms:Pn([ft.common,ft.envmap,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.roughnessmap,ft.metalnessmap,ft.fog,ft.lights,{emissive:{value:new kt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:se.meshphysical_vert,fragmentShader:se.meshphysical_frag},toon:{uniforms:Pn([ft.common,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.gradientmap,ft.fog,ft.lights,{emissive:{value:new kt(0)}}]),vertexShader:se.meshtoon_vert,fragmentShader:se.meshtoon_frag},matcap:{uniforms:Pn([ft.common,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.fog,{matcap:{value:null}}]),vertexShader:se.meshmatcap_vert,fragmentShader:se.meshmatcap_frag},points:{uniforms:Pn([ft.points,ft.fog]),vertexShader:se.points_vert,fragmentShader:se.points_frag},dashed:{uniforms:Pn([ft.common,ft.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:se.linedashed_vert,fragmentShader:se.linedashed_frag},depth:{uniforms:Pn([ft.common,ft.displacementmap]),vertexShader:se.depth_vert,fragmentShader:se.depth_frag},normal:{uniforms:Pn([ft.common,ft.bumpmap,ft.normalmap,ft.displacementmap,{opacity:{value:1}}]),vertexShader:se.meshnormal_vert,fragmentShader:se.meshnormal_frag},sprite:{uniforms:Pn([ft.sprite,ft.fog]),vertexShader:se.sprite_vert,fragmentShader:se.sprite_frag},background:{uniforms:{uvTransform:{value:new Kt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:se.background_vert,fragmentShader:se.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Kt}},vertexShader:se.backgroundCube_vert,fragmentShader:se.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:se.cube_vert,fragmentShader:se.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:se.equirect_vert,fragmentShader:se.equirect_frag},distance:{uniforms:Pn([ft.common,ft.displacementmap,{referencePosition:{value:new R},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:se.distance_vert,fragmentShader:se.distance_frag},shadow:{uniforms:Pn([ft.lights,ft.fog,{color:{value:new kt(0)},opacity:{value:1}}]),vertexShader:se.shadow_vert,fragmentShader:se.shadow_frag}};On.physical={uniforms:Pn([On.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Kt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Kt},clearcoatNormalScale:{value:new ut(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Kt},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Kt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Kt},sheen:{value:0},sheenColor:{value:new kt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Kt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Kt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Kt},transmissionSamplerSize:{value:new ut},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Kt},attenuationDistance:{value:0},attenuationColor:{value:new kt(0)},specularColor:{value:new kt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Kt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Kt},anisotropyVector:{value:new ut},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Kt}}]),vertexShader:se.meshphysical_vert,fragmentShader:se.meshphysical_frag};var wh={r:0,b:0,g:0},rS=new jt,wg=new Kt;wg.set(-1,0,0,0,1,0,0,0,1);function oS(i,t,e,n,s,r){let o=new kt(0),a=s===!0?0:1,c,l,h=null,u=0,d=null;function f(M){let w=M.isScene===!0?M.background:null;if(w&&w.isTexture){let _=M.backgroundBlurriness>0;w=t.get(w,_)}return w}function p(M){let w=!1,_=f(M);_===null?g(o,a):_&&_.isColor&&(g(_,1),w=!0);let E=i.xr.getEnvironmentBlendMode();E==="additive"?e.buffers.color.setClear(0,0,0,1,r):E==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||w)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function b(M,w){let _=f(w);_&&(_.isCubeTexture||_.mapping===La)?(l===void 0&&(l=new Re(new no(1,1,1),new xn({name:"BackgroundCubeMaterial",uniforms:nr(On.backgroundCube.uniforms),vertexShader:On.backgroundCube.vertexShader,fragmentShader:On.backgroundCube.fragmentShader,side:Nn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(E,T,I){this.matrixWorld.copyPosition(I.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(l)),l.material.uniforms.envMap.value=_,l.material.uniforms.backgroundBlurriness.value=w.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(rS.makeRotationFromEuler(w.backgroundRotation)).transpose(),_.isCubeTexture&&_.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(wg),l.material.toneMapped=ce.getTransfer(_.colorSpace)!==xe,(h!==_||u!==_.version||d!==i.toneMapping)&&(l.material.needsUpdate=!0,h=_,u=_.version,d=i.toneMapping),l.layers.enableAll(),M.unshift(l,l.geometry,l.material,0,0,null)):_&&_.isTexture&&(c===void 0&&(c=new Re(new _a(2,2),new xn({name:"BackgroundMaterial",uniforms:nr(On.background.uniforms),vertexShader:On.background.vertexShader,fragmentShader:On.background.fragmentShader,side:ri,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(c)),c.material.uniforms.t2D.value=_,c.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,c.material.toneMapped=ce.getTransfer(_.colorSpace)!==xe,_.matrixAutoUpdate===!0&&_.updateMatrix(),c.material.uniforms.uvTransform.value.copy(_.matrix),(h!==_||u!==_.version||d!==i.toneMapping)&&(c.material.needsUpdate=!0,h=_,u=_.version,d=i.toneMapping),c.layers.enableAll(),M.unshift(c,c.geometry,c.material,0,0,null))}function g(M,w){M.getRGB(wh,hf(i)),e.buffers.color.setClear(wh.r,wh.g,wh.b,w,r)}function m(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(M,w=1){o.set(M),a=w,g(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(M){a=M,g(o,a)},render:p,addToRenderList:b,dispose:m}}function aS(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null),r=s,o=!1;function a(N,k,V,O,H){let U=!1,W=u(N,O,V,k);r!==W&&(r=W,l(r.object)),U=f(N,O,V,H),U&&p(N,O,V,H),H!==null&&t.update(H,i.ELEMENT_ARRAY_BUFFER),(U||o)&&(o=!1,_(N,k,V,O),H!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(H).buffer))}function c(){return i.createVertexArray()}function l(N){return i.bindVertexArray(N)}function h(N){return i.deleteVertexArray(N)}function u(N,k,V,O){let H=O.wireframe===!0,U=n[k.id];U===void 0&&(U={},n[k.id]=U);let W=N.isInstancedMesh===!0?N.id:0,K=U[W];K===void 0&&(K={},U[W]=K);let G=K[V.id];G===void 0&&(G={},K[V.id]=G);let D=G[H];return D===void 0&&(D=d(c()),G[H]=D),D}function d(N){let k=[],V=[],O=[];for(let H=0;H<e;H++)k[H]=0,V[H]=0,O[H]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:k,enabledAttributes:V,attributeDivisors:O,object:N,attributes:{},index:null}}function f(N,k,V,O){let H=r.attributes,U=k.attributes,W=0,K=V.getAttributes();for(let G in K)if(K[G].location>=0){let Z=H[G],ct=U[G];if(ct===void 0&&(G==="instanceMatrix"&&N.instanceMatrix&&(ct=N.instanceMatrix),G==="instanceColor"&&N.instanceColor&&(ct=N.instanceColor)),Z===void 0||Z.attribute!==ct||ct&&Z.data!==ct.data)return!0;W++}return r.attributesNum!==W||r.index!==O}function p(N,k,V,O){let H={},U=k.attributes,W=0,K=V.getAttributes();for(let G in K)if(K[G].location>=0){let Z=U[G];Z===void 0&&(G==="instanceMatrix"&&N.instanceMatrix&&(Z=N.instanceMatrix),G==="instanceColor"&&N.instanceColor&&(Z=N.instanceColor));let ct={};ct.attribute=Z,Z&&Z.data&&(ct.data=Z.data),H[G]=ct,W++}r.attributes=H,r.attributesNum=W,r.index=O}function b(){let N=r.newAttributes;for(let k=0,V=N.length;k<V;k++)N[k]=0}function g(N){m(N,0)}function m(N,k){let V=r.newAttributes,O=r.enabledAttributes,H=r.attributeDivisors;V[N]=1,O[N]===0&&(i.enableVertexAttribArray(N),O[N]=1),H[N]!==k&&(i.vertexAttribDivisor(N,k),H[N]=k)}function M(){let N=r.newAttributes,k=r.enabledAttributes;for(let V=0,O=k.length;V<O;V++)k[V]!==N[V]&&(i.disableVertexAttribArray(V),k[V]=0)}function w(N,k,V,O,H,U,W){W===!0?i.vertexAttribIPointer(N,k,V,H,U):i.vertexAttribPointer(N,k,V,O,H,U)}function _(N,k,V,O){b();let H=O.attributes,U=V.getAttributes(),W=k.defaultAttributeValues;for(let K in U){let G=U[K];if(G.location>=0){let D=H[K];if(D===void 0&&(K==="instanceMatrix"&&N.instanceMatrix&&(D=N.instanceMatrix),K==="instanceColor"&&N.instanceColor&&(D=N.instanceColor)),D!==void 0){let Z=D.normalized,ct=D.itemSize,Mt=t.get(D);if(Mt===void 0)continue;let Wt=Mt.buffer,It=Mt.type,Ht=Mt.bytesPerElement,$=It===i.INT||It===i.UNSIGNED_INT||D.gpuType===Vc;if(D.isInterleavedBufferAttribute){let nt=D.data,mt=nt.stride,Tt=D.offset;if(nt.isInstancedInterleavedBuffer){for(let ht=0;ht<G.locationSize;ht++)m(G.location+ht,nt.meshPerAttribute);N.isInstancedMesh!==!0&&O._maxInstanceCount===void 0&&(O._maxInstanceCount=nt.meshPerAttribute*nt.count)}else for(let ht=0;ht<G.locationSize;ht++)g(G.location+ht);i.bindBuffer(i.ARRAY_BUFFER,Wt);for(let ht=0;ht<G.locationSize;ht++)w(G.location+ht,ct/G.locationSize,It,Z,mt*Ht,(Tt+ct/G.locationSize*ht)*Ht,$)}else{if(D.isInstancedBufferAttribute){for(let nt=0;nt<G.locationSize;nt++)m(G.location+nt,D.meshPerAttribute);N.isInstancedMesh!==!0&&O._maxInstanceCount===void 0&&(O._maxInstanceCount=D.meshPerAttribute*D.count)}else for(let nt=0;nt<G.locationSize;nt++)g(G.location+nt);i.bindBuffer(i.ARRAY_BUFFER,Wt);for(let nt=0;nt<G.locationSize;nt++)w(G.location+nt,ct/G.locationSize,It,Z,ct*Ht,ct/G.locationSize*nt*Ht,$)}}else if(W!==void 0){let Z=W[K];if(Z!==void 0)switch(Z.length){case 2:i.vertexAttrib2fv(G.location,Z);break;case 3:i.vertexAttrib3fv(G.location,Z);break;case 4:i.vertexAttrib4fv(G.location,Z);break;default:i.vertexAttrib1fv(G.location,Z)}}}}M()}function E(){A();for(let N in n){let k=n[N];for(let V in k){let O=k[V];for(let H in O){let U=O[H];for(let W in U)h(U[W].object),delete U[W];delete O[H]}}delete n[N]}}function T(N){if(n[N.id]===void 0)return;let k=n[N.id];for(let V in k){let O=k[V];for(let H in O){let U=O[H];for(let W in U)h(U[W].object),delete U[W];delete O[H]}}delete n[N.id]}function I(N){for(let k in n){let V=n[k];for(let O in V){let H=V[O];if(H[N.id]===void 0)continue;let U=H[N.id];for(let W in U)h(U[W].object),delete U[W];delete H[N.id]}}}function y(N){for(let k in n){let V=n[k],O=N.isInstancedMesh===!0?N.id:0,H=V[O];if(H!==void 0){for(let U in H){let W=H[U];for(let K in W)h(W[K].object),delete W[K];delete H[U]}delete V[O],Object.keys(V).length===0&&delete n[k]}}}function A(){L(),o=!0,r!==s&&(r=s,l(r.object))}function L(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:A,resetDefaultState:L,dispose:E,releaseStatesOfGeometry:T,releaseStatesOfObject:y,releaseStatesOfProgram:I,initAttributes:b,enableAttribute:g,disableUnusedAttributes:M}}function lS(i,t,e){let n;function s(c){n=c}function r(c,l){i.drawArrays(n,c,l),e.update(l,n,1)}function o(c,l,h){h!==0&&(i.drawArraysInstanced(n,c,l,h),e.update(l,n,h))}function a(c,l,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,l,0,h);let d=0;for(let f=0;f<h;f++)d+=l[f];e.update(d,n,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function cS(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let I=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(I.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(I){return!(I!==oi&&n.convert(I)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(I){let y=I===Mi&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(I!==Hn&&I!==Si&&!y&&n.convert(I)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function c(I){if(I==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";I="mediump"}return I==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=e.precision!==void 0?e.precision:"highp",h=c(l);h!==l&&(Xt("WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);let u=e.logarithmicDepthBuffer===!0,d=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&d===!1&&Xt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),p=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),b=i.getParameter(i.MAX_TEXTURE_SIZE),g=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),m=i.getParameter(i.MAX_VERTEX_ATTRIBS),M=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),w=i.getParameter(i.MAX_VARYING_VECTORS),_=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),E=i.getParameter(i.MAX_SAMPLES),T=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:p,maxTextureSize:b,maxCubemapSize:g,maxAttributes:m,maxVertexUniforms:M,maxVaryings:w,maxFragmentUniforms:_,maxSamples:E,samples:T}}function hS(i){let t=this,e=null,n=0,s=!1,r=!1,o=new De,a=new Kt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){let f=u.length!==0||d||n!==0||s;return s=d,n=u.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){e=h(u,d,0)},this.setState=function(u,d,f){let p=u.clippingPlanes,b=u.clipIntersection,g=u.clipShadows,m=i.get(u);if(!s||p===null||p.length===0||r&&!g)r?h(null):l();else{let M=r?0:n,w=M*4,_=m.clippingState||null;c.value=_,_=h(p,d,w,f);for(let E=0;E!==w;++E)_[E]=e[E];m.clippingState=_,this.numIntersection=b?this.numPlanes:0,this.numPlanes+=M}};function l(){c.value!==e&&(c.value=e,c.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(u,d,f,p){let b=u!==null?u.length:0,g=null;if(b!==0){if(g=c.value,p!==!0||g===null){let m=f+b*4,M=d.matrixWorldInverse;a.getNormalMatrix(M),(g===null||g.length<m)&&(g=new Float32Array(m));for(let w=0,_=f;w!==b;++w,_+=4)o.copy(u[w]).applyMatrix4(M,a),o.normal.toArray(g,_),g[_+3]=o.constant}c.value=g,c.needsUpdate=!0}return t.numPlanes=b,t.numIntersection=0,g}}var uo=4,dS=6,uS=20,fS=256,ka=new Es,ng=new kt,xf=null,yf=0,vf=0,Sf=!1,pS=new R,sr=new R,Th=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){let{size:o=256,position:a=pS}=r;xf=this._renderer.getRenderTarget(),yf=this._renderer.getActiveCubeFace(),vf=this._renderer.getActiveMipmapLevel(),Sf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(t,n,s,c,a),e>0&&this._blur(c,0,0,e),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=rg(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=sg(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(xf,yf,vf),this._renderer.xr.enabled=Sf,t.scissorTest=!1,ho(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===As||t.mapping===er?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),xf=this._renderer.getRenderTarget(),yf=this._renderer.getActiveCubeFace(),vf=this._renderer.getActiveMipmapLevel(),Sf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:bn,minFilter:bn,generateMipmaps:!1,type:Mi,format:oi,colorSpace:$o,depthBuffer:!1},s=ig(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ig(t,e,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=mS(r)),this._blurMaterial=_S(r,t,e),this._ggxMaterial=gS(r,t,e)}return s}_compileMaterial(t){let e=new Re(new Be,t);this._renderer.compile(e,ka)}_sceneToCubeUV(t,e,n,s,r){let c=new dn(90,1,e,n),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,f=u.toneMapping;u.getClearColor(ng),u.toneMapping=yi,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(s),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Re(new no,new sa({name:"PMREM.Background",side:Nn,depthWrite:!1,depthTest:!1})));let b=this._backgroundBox,g=b.material,m=!1,M=t.background;M?M.isColor&&(g.color.copy(M),t.background=null,m=!0):(g.color.copy(ng),m=!0);for(let w=0;w<6;w++){let _=w%3;_===0?(c.up.set(0,l[w],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x+h[w],r.y,r.z)):_===1?(c.up.set(0,0,l[w]),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y+h[w],r.z)):(c.up.set(0,l[w],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y,r.z+h[w]));let E=this._cubeSize;ho(s,_*E,w>2?E:0,E,E),u.setRenderTarget(s),m&&u.render(b,c),u.render(t,c)}u.toneMapping=f,u.autoClear=d,t.background=M}_textureToCubeUV(t,e){let n=this._renderer,s=t.mapping===As||t.mapping===er;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=rg()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=sg());let r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=t;let c=this._cubeSize;ho(e,0,0,3*c,2*c),n.setRenderTarget(e),n.render(o,ka)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){let s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;let c=o.uniforms,l=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),u=Math.sqrt(l*l-h*h),d=l*1.25,f=u*d,{_lodMax:p}=this,b=this._sizeLods[n],g=3*b*(n>p-uo?n-p+uo:0),m=4*(this._cubeSize-b);c.envMap.value=t.texture,c.roughness.value=f,c.mipInt.value=p-e,ho(r,g,m,3*b,2*b),s.setRenderTarget(r),s.render(a,ka),c.envMap.value=r.texture,c.roughness.value=0,c.mipInt.value=p-n,ho(t,g,m,3*b,2*b),s.setRenderTarget(t),s.render(a,ka)}_blur(t,e,n,s){let r=this._pingPongRenderTarget,o=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,n,o),this._blurPass(r,t,n,n,o)}_blurPass(t,e,n,s,r){let o=this._renderer,a=this._blurMaterial,c=this._lodMeshes[s];c.material=a;let l=a.uniforms;l.envMap.value=t.texture,l.sigma.value=r,l.mipInt.value=this._lodMax-n;let h=this._sizeLods[s],u=3*h*(s>this._lodMax-uo?s-this._lodMax+uo:0),d=4*(this._cubeSize-h);ho(e,u,d,3*h,2*h),o.setRenderTarget(e),o.render(c,ka)}};function mS(i){let t=[],e=[],n=i,s=i-uo+1+dS;for(let r=0;r<s;r++){let o=Math.pow(2,n);t.push(o);let a=1/(o-2),c=-a,l=1+a,h=[c,c,l,c,l,l,c,c,l,l,c,l],u=6,d=6,f=3,p=new Float32Array(f*d*u),b=new Float32Array(f*d*u);for(let m=0;m<u;m++){let M=m%3*2/3-1,w=m>2?0:-1,_=[M,w,0,M+2/3,w,0,M+2/3,w+1,0,M,w,0,M+2/3,w+1,0,M,w+1,0];p.set(_,f*d*m);for(let E=0;E<d;E++){let T=h[E*2]*2-1,I=h[E*2+1]*2-1;m===0?sr.set(1,I,T):m===1?sr.set(-T,1,-I):m===2?sr.set(-T,I,1):m===3?sr.set(-1,I,-T):m===4?sr.set(-T,-1,I):sr.set(T,I,-1),sr.toArray(b,(m*d+E)*f)}}let g=new Be;g.setAttribute("position",new Ie(p,f)),g.setAttribute("outputDirection",new Ie(b,f)),e.push(new Re(g,null)),n>uo&&n--}return{lodMeshes:e,sizeLods:t}}function ig(i,t,e){let n=new zn(i,t,e);return n.texture.mapping=La,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function ho(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function gS(i,t,e){return new xn({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:fS,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Rh(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Ni,depthTest:!1,depthWrite:!1})}function _S(i,t,e){return new xn({name:"SphericalGaussianBlur",defines:{SAMPLES:uS,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:Rh(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:Ni,depthTest:!1,depthWrite:!1})}function sg(){return new xn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Rh(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Ni,depthTest:!1,depthWrite:!1})}function rg(){return new xn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Rh(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Ni,depthTest:!1,depthWrite:!1})}function Rh(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var Ah=class extends zn{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new aa(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new no(5,5,5),r=new xn({name:"CubemapFromEquirect",uniforms:nr(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Nn,blending:Ni});r.uniforms.tEquirect.value=e;let o=new Re(s,r),a=e.minFilter;return e.minFilter===Is&&(e.minFilter=bn),new Dc(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){let r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,s);t.setRenderTarget(r)}};function bS(i){let t=new WeakMap,e=new WeakMap,n=null;function s(d,f=!1){return d==null?null:f?o(d):r(d)}function r(d){if(d&&d.isTexture){let f=d.mapping;if(f===Fc||f===Bc)if(t.has(d)){let p=t.get(d).texture;return a(p,d.mapping)}else{let p=d.image;if(p&&p.height>0){let b=new Ah(p.height);return b.fromEquirectangularTexture(i,d),t.set(d,b),d.addEventListener("dispose",l),a(b.texture,d.mapping)}else return null}}return d}function o(d){if(d&&d.isTexture){let f=d.mapping,p=f===Fc||f===Bc,b=f===As||f===er;if(p||b){let g=e.get(d),m=g!==void 0?g.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==m)return n===null&&(n=new Th(i)),g=p?n.fromEquirectangular(d,g):n.fromCubemap(d,g),g.texture.pmremVersion=d.pmremVersion,e.set(d,g),g.texture;if(g!==void 0)return g.texture;{let M=d.image;return p&&M&&M.height>0||b&&M&&c(M)?(n===null&&(n=new Th(i)),g=p?n.fromEquirectangular(d):n.fromCubemap(d),g.texture.pmremVersion=d.pmremVersion,e.set(d,g),d.addEventListener("dispose",h),g.texture):null}}}return d}function a(d,f){return f===Fc?d.mapping=As:f===Bc&&(d.mapping=er),d}function c(d){let f=0,p=6;for(let b=0;b<p;b++)d[b]!==void 0&&f++;return f===p}function l(d){let f=d.target;f.removeEventListener("dispose",l);let p=t.get(f);p!==void 0&&(t.delete(f),p.dispose())}function h(d){let f=d.target;f.removeEventListener("dispose",h);let p=e.get(f);p!==void 0&&(e.delete(f),p.dispose())}function u(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:u}}function xS(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let s=e(n);return s===null&&$s("WebGLRenderer: "+n+" extension not supported."),s}}}function yS(i,t,e,n){let s={},r=new WeakMap;function o(u){let d=u.target;d.index!==null&&t.remove(d.index);for(let p in d.attributes)t.remove(d.attributes[p]);d.removeEventListener("dispose",o),delete s[d.id];let f=r.get(d);f&&(t.remove(f),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,e.memory.geometries--}function a(u,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,e.memory.geometries++),d}function c(u){let d=u.attributes;for(let f in d)t.update(d[f],i.ARRAY_BUFFER)}function l(u){let d=[],f=u.index,p=u.attributes.position,b=0;if(p===void 0)return;if(f!==null){let M=f.array;b=f.version;for(let w=0,_=M.length;w<_;w+=3){let E=M[w+0],T=M[w+1],I=M[w+2];d.push(E,T,T,I,I,E)}}else{let M=p.array;b=p.version;for(let w=0,_=M.length/3-1;w<_;w+=3){let E=w+0,T=w+1,I=w+2;d.push(E,T,T,I,I,E)}}let g=new(p.count>=65535?ia:na)(d,1);g.version=b;let m=r.get(u);m&&t.remove(m),r.set(u,g)}function h(u){let d=r.get(u);if(d){let f=u.index;f!==null&&d.version<f.version&&l(u)}else l(u);return r.get(u)}return{get:a,update:c,getWireframeAttribute:h}}function vS(i,t,e){let n;function s(u){n=u}let r,o;function a(u){r=u.type,o=u.bytesPerElement}function c(u,d){i.drawElements(n,d,r,u*o),e.update(d,n,1)}function l(u,d,f){f!==0&&(i.drawElementsInstanced(n,d,r,u*o,f),e.update(d,n,f))}function h(u,d,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,d,0,r,u,0,f);let b=0;for(let g=0;g<f;g++)b+=d[g];e.update(b,n,1)}this.setMode=s,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=h}function SS(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(e.calls++,o){case i.TRIANGLES:e.triangles+=a*(r/3);break;case i.LINES:e.lines+=a*(r/2);break;case i.LINE_STRIP:e.lines+=a*(r-1);break;case i.LINE_LOOP:e.lines+=a*r;break;case i.POINTS:e.points+=a*r;break;default:Zt("WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function MS(i,t,e){let n=new WeakMap,s=new ye;function r(o,a,c){let l=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0,d=n.get(a);if(d===void 0||d.count!==u){let A=function(){I.dispose(),n.delete(a),a.removeEventListener("dispose",A)};d!==void 0&&d.texture.dispose();let f=a.morphAttributes.position!==void 0,p=a.morphAttributes.normal!==void 0,b=a.morphAttributes.color!==void 0,g=a.morphAttributes.position||[],m=a.morphAttributes.normal||[],M=a.morphAttributes.color||[],w=0;f===!0&&(w=1),p===!0&&(w=2),b===!0&&(w=3);let _=a.attributes.position.count*w,E=1;_>t.maxTextureSize&&(E=Math.ceil(_/t.maxTextureSize),_=t.maxTextureSize);let T=new Float32Array(_*E*4*u),I=new Qo(T,_,E,u);I.type=Si,I.needsUpdate=!0;let y=w*4;for(let L=0;L<u;L++){let N=g[L],k=m[L],V=M[L],O=_*E*4*L;for(let H=0;H<N.count;H++){let U=H*y;f===!0&&(s.fromBufferAttribute(N,H),T[O+U+0]=s.x,T[O+U+1]=s.y,T[O+U+2]=s.z,T[O+U+3]=0),p===!0&&(s.fromBufferAttribute(k,H),T[O+U+4]=s.x,T[O+U+5]=s.y,T[O+U+6]=s.z,T[O+U+7]=0),b===!0&&(s.fromBufferAttribute(V,H),T[O+U+8]=s.x,T[O+U+9]=s.y,T[O+U+10]=s.z,T[O+U+11]=V.itemSize===4?s.w:1)}}d={count:u,texture:I,size:new ut(_,E)},n.set(a,d),a.addEventListener("dispose",A)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",o.morphTexture,e);else{let f=0;for(let b=0;b<l.length;b++)f+=l[b];let p=a.morphTargetsRelative?1:1-f;c.getUniforms().setValue(i,"morphTargetBaseInfluence",p),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",d.texture,e),c.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function wS(i,t,e,n,s){let r=new WeakMap;function o(l){let h=s.render.frame,u=l.geometry,d=t.get(l,u);if(r.get(d)!==h&&(t.update(d),r.set(d,h)),l.isInstancedMesh&&(l.hasEventListener("dispose",c)===!1&&l.addEventListener("dispose",c),r.get(l)!==h&&(e.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,i.ARRAY_BUFFER),r.set(l,h))),l.isSkinnedMesh){let f=l.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return d}function a(){r=new WeakMap}function c(l){let h=l.target;h.removeEventListener("dispose",c),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:o,dispose:a}}var ES={[Wu]:"LINEAR_TONE_MAPPING",[Xu]:"REINHARD_TONE_MAPPING",[qu]:"CINEON_TONE_MAPPING",[Yu]:"ACES_FILMIC_TONE_MAPPING",[$u]:"AGX_TONE_MAPPING",[ju]:"NEUTRAL_TONE_MAPPING",[Zu]:"CUSTOM_TONE_MAPPING"};function TS(i,t,e,n,s,r){let o=new zn(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),a=null,c=null,l=new Be;l.setAttribute("position",new qe([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new qe([0,2,0,0,2,0],2));let h=new xc({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),u=new Re(l,h),d=new Es(-1,1,1,-1,0,1),f=null,p=null,b=!1,g,m=null,M=[],w=!1;this.setSize=function(_,E){o.setSize(_,E),a!==null&&a.setSize(_,E),c!==null&&c.setSize(_,E);for(let T=0;T<M.length;T++){let I=M[T];I.setSize&&I.setSize(_,E)}},this.setEffects=function(_){M=_,w=M.length>0&&M[0].isRenderPass===!0;let E=o.width,T=o.height;M.length>0&&a===null&&(a=new zn(E,T,{type:Mi,depthBuffer:!1,stencilBuffer:!1}),c=new zn(E,T,{type:Mi,depthBuffer:!1,stencilBuffer:!1}));for(let I=0;I<M.length;I++){let y=M[I];y.setSize&&y.setSize(E,T)}},this.begin=function(_,E){if(b||_.toneMapping===yi&&M.length===0)return!1;if(m=E,E!==null){let T=E.width,I=E.height;(o.width!==T||o.height!==I)&&this.setSize(T,I)}return w===!1&&_.setRenderTarget(o),g=_.toneMapping,_.toneMapping=yi,!0},this.hasRenderPass=function(){return w},this.end=function(_,E){_.toneMapping=g,b=!0;let T=o,I=a;for(let y=0;y<M.length;y++){let A=M[y];A.enabled!==!1&&(A.render(_,I,T,E),A.needsSwap!==!1&&(T=I,I=I===a?c:a))}if(f!==_.outputColorSpace||p!==_.toneMapping){f=_.outputColorSpace,p=_.toneMapping,h.defines={},ce.getTransfer(f)===xe&&(h.defines.SRGB_TRANSFER="");let y=ES[p];y&&(h.defines[y]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=T.texture,_.setRenderTarget(m),_.render(u,d),m=null,b=!1},this.isCompositing=function(){return b},this.dispose=function(){o.dispose(),a!==null&&a.dispose(),c!==null&&c.dispose(),l.dispose(),h.dispose()}}var Eg=new Bn,Ef=new vs(1,1),Tg=new Qo,Ag=new oc,Ig=new aa,og=[],ag=[],lg=new Float32Array(16),cg=new Float32Array(9),hg=new Float32Array(4);function po(i,t,e){let n=i[0];if(n<=0||n>0)return i;let s=t*e,r=og[s];if(r===void 0&&(r=new Float32Array(s),og[s]=r),t!==0){n.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,i[o].toArray(r,a)}return r}function sn(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function rn(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function Ch(i,t){let e=ag[t];e===void 0&&(e=new Int32Array(t),ag[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function AS(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function IS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(sn(e,t))return;i.uniform2fv(this.addr,t),rn(e,t)}}function RS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(sn(e,t))return;i.uniform3fv(this.addr,t),rn(e,t)}}function CS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(sn(e,t))return;i.uniform4fv(this.addr,t),rn(e,t)}}function PS(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(sn(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),rn(e,t)}else{if(sn(e,n))return;hg.set(n),i.uniformMatrix2fv(this.addr,!1,hg),rn(e,n)}}function LS(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(sn(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),rn(e,t)}else{if(sn(e,n))return;cg.set(n),i.uniformMatrix3fv(this.addr,!1,cg),rn(e,n)}}function DS(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(sn(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),rn(e,t)}else{if(sn(e,n))return;lg.set(n),i.uniformMatrix4fv(this.addr,!1,lg),rn(e,n)}}function NS(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function OS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(sn(e,t))return;i.uniform2iv(this.addr,t),rn(e,t)}}function US(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(sn(e,t))return;i.uniform3iv(this.addr,t),rn(e,t)}}function FS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(sn(e,t))return;i.uniform4iv(this.addr,t),rn(e,t)}}function BS(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function zS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(sn(e,t))return;i.uniform2uiv(this.addr,t),rn(e,t)}}function VS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(sn(e,t))return;i.uniform3uiv(this.addr,t),rn(e,t)}}function kS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(sn(e,t))return;i.uniform4uiv(this.addr,t),rn(e,t)}}function HS(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Ef.compareFunction=e.isReversedDepthBuffer()?Mh:Sh,r=Ef):r=Eg,e.setTexture2D(t||r,s)}function GS(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||Ag,s)}function WS(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||Ig,s)}function XS(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||Tg,s)}function qS(i){switch(i){case 5126:return AS;case 35664:return IS;case 35665:return RS;case 35666:return CS;case 35674:return PS;case 35675:return LS;case 35676:return DS;case 5124:case 35670:return NS;case 35667:case 35671:return OS;case 35668:case 35672:return US;case 35669:case 35673:return FS;case 5125:return BS;case 36294:return zS;case 36295:return VS;case 36296:return kS;case 35678:case 36198:case 36298:case 36306:case 35682:return HS;case 35679:case 36299:case 36307:return GS;case 35680:case 36300:case 36308:case 36293:return WS;case 36289:case 36303:case 36311:case 36292:return XS}}function YS(i,t){i.uniform1fv(this.addr,t)}function ZS(i,t){let e=po(t,this.size,2);i.uniform2fv(this.addr,e)}function $S(i,t){let e=po(t,this.size,3);i.uniform3fv(this.addr,e)}function jS(i,t){let e=po(t,this.size,4);i.uniform4fv(this.addr,e)}function KS(i,t){let e=po(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function JS(i,t){let e=po(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function QS(i,t){let e=po(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function tM(i,t){i.uniform1iv(this.addr,t)}function eM(i,t){i.uniform2iv(this.addr,t)}function nM(i,t){i.uniform3iv(this.addr,t)}function iM(i,t){i.uniform4iv(this.addr,t)}function sM(i,t){i.uniform1uiv(this.addr,t)}function rM(i,t){i.uniform2uiv(this.addr,t)}function oM(i,t){i.uniform3uiv(this.addr,t)}function aM(i,t){i.uniform4uiv(this.addr,t)}function lM(i,t,e){let n=this.cache,s=t.length,r=Ch(e,s);sn(n,r)||(i.uniform1iv(this.addr,r),rn(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=Ef:o=Eg;for(let a=0;a!==s;++a)e.setTexture2D(t[a]||o,r[a])}function cM(i,t,e){let n=this.cache,s=t.length,r=Ch(e,s);sn(n,r)||(i.uniform1iv(this.addr,r),rn(n,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||Ag,r[o])}function hM(i,t,e){let n=this.cache,s=t.length,r=Ch(e,s);sn(n,r)||(i.uniform1iv(this.addr,r),rn(n,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||Ig,r[o])}function dM(i,t,e){let n=this.cache,s=t.length,r=Ch(e,s);sn(n,r)||(i.uniform1iv(this.addr,r),rn(n,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||Tg,r[o])}function uM(i){switch(i){case 5126:return YS;case 35664:return ZS;case 35665:return $S;case 35666:return jS;case 35674:return KS;case 35675:return JS;case 35676:return QS;case 5124:case 35670:return tM;case 35667:case 35671:return eM;case 35668:case 35672:return nM;case 35669:case 35673:return iM;case 5125:return sM;case 36294:return rM;case 36295:return oM;case 36296:return aM;case 35678:case 36198:case 36298:case 36306:case 35682:return lM;case 35679:case 36299:case 36307:return cM;case 35680:case 36300:case 36308:case 36293:return hM;case 36289:case 36303:case 36311:case 36292:return dM}}var Tf=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=qS(e.type)}},Af=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=uM(e.type)}},If=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(t,e[a.id],n)}}},Mf=/(\w+)(\])?(\[|\.)?/g;function dg(i,t){i.seq.push(t),i.map[t.id]=t}function fM(i,t,e){let n=i.name,s=n.length;for(Mf.lastIndex=0;;){let r=Mf.exec(n),o=Mf.lastIndex,a=r[1],c=r[2]==="]",l=r[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===s){dg(e,l===void 0?new Tf(a,i,t):new Af(a,i,t));break}else{let u=e.map[a];u===void 0&&(u=new If(a),dg(e,u)),e=u}}}var fo=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){let a=t.getActiveUniform(e,o),c=t.getUniformLocation(e,a.name);fM(a,c,this)}let s=[],r=[];for(let o of this.seq)o.type===t.SAMPLER_2D_SHADOW||o.type===t.SAMPLER_CUBE_SHADOW||o.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){let r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){let s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,o=e.length;r!==o;++r){let a=e[r],c=n[a.id];c.needsUpdate!==!1&&a.setValue(t,c.value,s)}}static seqWithValue(t,e){let n=[];for(let s=0,r=t.length;s!==r;++s){let o=t[s];o.id in e&&n.push(o)}return n}};function ug(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var pM=37297,mM=0;function gM(i,t){let e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){let a=o+1;n.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return n.join(`
`)}var fg=new Kt;function _M(i){ce._getMatrix(fg,ce.workingColorSpace,i);let t=`mat3( ${fg.elements.map(e=>e.toFixed(4))} )`;switch(ce.getTransfer(i)){case jo:return[t,"LinearTransferOETF"];case xe:return[t,"sRGBTransferOETF"];default:return Xt("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function pg(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return e.toUpperCase()+`

`+r+`

`+gM(i.getShaderSource(t),a)}else return r}function bM(i,t){let e=_M(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var xM={[Wu]:"Linear",[Xu]:"Reinhard",[qu]:"Cineon",[Yu]:"ACESFilmic",[$u]:"AgX",[ju]:"Neutral",[Zu]:"Custom"};function yM(i,t){let e=xM[t];return e===void 0?(Xt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var Eh=new R;function vM(){ce.getLuminanceCoefficients(Eh);let i=Eh.x.toFixed(4),t=Eh.y.toFixed(4),e=Eh.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function SM(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ga).join(`
`)}function MM(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function wM(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(t,s),o=r.name,a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:i.getAttribLocation(t,o),locationSize:a}}return e}function Ga(i){return i!==""}function mg(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function gg(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var EM=/^[ \t]*#include +<([\w\d./]+)>/gm;function Rf(i){return i.replace(EM,AM)}var TM=new Map;function AM(i,t){let e=se[t];if(e===void 0){let n=TM.get(t);if(n!==void 0)e=se[n],Xt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return Rf(e)}var IM=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function _g(i){return i.replace(IM,RM)}function RM(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function bg(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}var CM={[Ca]:"SHADOWMAP_TYPE_PCF",[oo]:"SHADOWMAP_TYPE_VSM"};function PM(i){return CM[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var LM={[As]:"ENVMAP_TYPE_CUBE",[er]:"ENVMAP_TYPE_CUBE",[La]:"ENVMAP_TYPE_CUBE_UV"};function DM(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":LM[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var NM={[er]:"ENVMAP_MODE_REFRACTION"};function OM(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":NM[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var UM={[Pa]:"ENVMAP_BLENDING_MULTIPLY",[Dm]:"ENVMAP_BLENDING_MIX",[Nm]:"ENVMAP_BLENDING_ADD"};function FM(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":UM[i.combine]||"ENVMAP_BLENDING_NONE"}function BM(i){let t=i.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:n,maxMip:e}}function zM(i,t,e,n){let s=i.getContext(),r=e.defines,o=e.vertexShader,a=e.fragmentShader,c=PM(e),l=DM(e),h=OM(e),u=FM(e),d=BM(e),f=SM(e),p=MM(r),b=s.createProgram(),g,m,M=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(g=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p].filter(Ga).join(`
`),g.length>0&&(g+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p].filter(Ga).join(`
`),m.length>0&&(m+=`
`)):(g=[bg(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ga).join(`
`),m=[bg(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+l:"",e.envMap?"#define "+h:"",e.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==yi?"#define TONE_MAPPING":"",e.toneMapping!==yi?se.tonemapping_pars_fragment:"",e.toneMapping!==yi?yM("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",se.colorspace_pars_fragment,bM("linearToOutputTexel",e.outputColorSpace),vM(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Ga).join(`
`)),o=Rf(o),o=mg(o,e),o=gg(o,e),a=Rf(a),a=mg(a,e),a=gg(a,e),o=_g(o),a=_g(a),e.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,m=["#define varying in",e.glslVersion===af?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===af?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);let w=M+g+o,_=M+m+a,E=ug(s,s.VERTEX_SHADER,w),T=ug(s,s.FRAGMENT_SHADER,_);s.attachShader(b,E),s.attachShader(b,T),e.index0AttributeName!==void 0?s.bindAttribLocation(b,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(b,0,"position"),s.linkProgram(b);function I(N){if(i.debug.checkShaderErrors){let k=s.getProgramInfoLog(b)||"",V=s.getShaderInfoLog(E)||"",O=s.getShaderInfoLog(T)||"",H=k.trim(),U=V.trim(),W=O.trim(),K=!0,G=!0;if(s.getProgramParameter(b,s.LINK_STATUS)===!1)if(K=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,b,E,T);else{let D=pg(s,E,"vertex"),Z=pg(s,T,"fragment");Zt("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(b,s.VALIDATE_STATUS)+`

Material Name: `+N.name+`
Material Type: `+N.type+`

Program Info Log: `+H+`
`+D+`
`+Z)}else H!==""?Xt("WebGLProgram: Program Info Log:",H):(U===""||W==="")&&(G=!1);G&&(N.diagnostics={runnable:K,programLog:H,vertexShader:{log:U,prefix:g},fragmentShader:{log:W,prefix:m}})}s.deleteShader(E),s.deleteShader(T),y=new fo(s,b),A=wM(s,b)}let y;this.getUniforms=function(){return y===void 0&&I(this),y};let A;this.getAttributes=function(){return A===void 0&&I(this),A};let L=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return L===!1&&(L=s.getProgramParameter(b,pM)),L},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(b),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=mM++,this.cacheKey=t,this.usedTimes=1,this.program=b,this.vertexShader=E,this.fragmentShader=T,this}var VM=0,Cf=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new Pf(t),e.set(t,n)),n}},Pf=class{constructor(t){this.id=VM++,this.code=t,this.usedTimes=0}};function kM(i){return i===Cs||i===Ba||i===za}function HM(i,t,e,n,s,r){let o=new Jr,a=new Cf,c=new Set,l=[],h=new Map,u=n.logarithmicDepthBuffer,d=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function p(y){return c.add(y),y===0?"uv":`uv${y}`}function b(y,A,L,N,k,V){let O=N.fog,H=k.geometry,U=y.isMeshStandardMaterial||y.isMeshLambertMaterial||y.isMeshPhongMaterial?N.environment:null,W=y.isMeshStandardMaterial||y.isMeshLambertMaterial&&!y.envMap||y.isMeshPhongMaterial&&!y.envMap,K=t.get(y.envMap||U,W),G=K&&K.mapping===La?K.image.height:null,D=f[y.type];y.precision!==null&&(d=n.getMaxPrecision(y.precision),d!==y.precision&&Xt("WebGLProgram.getParameters:",y.precision,"not supported, using",d,"instead."));let Z=H.morphAttributes.position||H.morphAttributes.normal||H.morphAttributes.color,ct=Z!==void 0?Z.length:0,Mt=0;H.morphAttributes.position!==void 0&&(Mt=1),H.morphAttributes.normal!==void 0&&(Mt=2),H.morphAttributes.color!==void 0&&(Mt=3);let Wt,It,Ht,$;if(D){let Ae=On[D];Wt=Ae.vertexShader,It=Ae.fragmentShader}else{Wt=y.vertexShader,It=y.fragmentShader;let Ae=a.getVertexShaderStage(y),ue=a.getFragmentShaderStage(y);a.update(y,Ae,ue),Ht=Ae.id,$=ue.id}let nt=i.getRenderTarget(),mt=i.state.buffers.depth.getReversed(),Tt=k.isInstancedMesh===!0,ht=k.isBatchedMesh===!0,Gt=!!y.map,Ve=!!y.matcap,ee=!!K,le=!!y.aoMap,ve=!!y.lightMap,re=!!y.bumpMap&&y.wireframe===!1,Ce=!!y.normalMap,je=!!y.displacementMap,mn=!!y.emissiveMap,Oe=!!y.metalnessMap,ke=!!y.roughnessMap,z=y.anisotropy>0,an=y.clearcoat>0,me=y.dispersion>0,C=y.retroreflectivity>0,x=y.iridescence>0,X=y.sheen>0,j=y.transmission>0,tt=z&&!!y.anisotropyMap,dt=an&&!!y.clearcoatMap,pt=an&&!!y.clearcoatNormalMap,et=an&&!!y.clearcoatRoughnessMap,st=x&&!!y.iridescenceMap,gt=x&&!!y.iridescenceThicknessMap,Ot=X&&!!y.sheenColorMap,vt=X&&!!y.sheenRoughnessMap,bt=!!y.specularMap,Ut=!!y.specularColorMap,Vt=!!y.specularIntensityMap,Qt=j&&!!y.transmissionMap,B=j&&!!y.thicknessMap,_t=!!y.gradientMap,it=!!y.alphaMap,xt=y.alphaTest>0,wt=!!y.alphaHash,at=!!y.extensions,Ft=yi;y.toneMapped&&(nt===null||nt.isXRRenderTarget===!0)&&(Ft=i.toneMapping);let Dt={shaderID:D,shaderType:y.type,shaderName:y.name,vertexShader:Wt,fragmentShader:It,defines:y.defines,customVertexShaderID:Ht,customFragmentShaderID:$,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:d,batching:ht,batchingColor:ht&&k._colorsTexture!==null,instancing:Tt,instancingColor:Tt&&k.instanceColor!==null,instancingMorph:Tt&&k.morphTexture!==null,outputColorSpace:nt===null?i.outputColorSpace:nt.isXRRenderTarget===!0?nt.texture.colorSpace:ce.workingColorSpace,alphaToCoverage:!!y.alphaToCoverage,map:Gt,matcap:Ve,envMap:ee,envMapMode:ee&&K.mapping,envMapCubeUVHeight:G,aoMap:le,lightMap:ve,bumpMap:re,normalMap:Ce,displacementMap:je,emissiveMap:mn,normalMapObjectSpace:Ce&&y.normalMapType===Fm,normalMapTangentSpace:Ce&&y.normalMapType===Va,packedNormalMap:Ce&&y.normalMapType===Va&&kM(y.normalMap.format),metalnessMap:Oe,roughnessMap:ke,anisotropy:z,anisotropyMap:tt,clearcoat:an,clearcoatMap:dt,clearcoatNormalMap:pt,clearcoatRoughnessMap:et,dispersion:me,retroreflection:C,iridescence:x,iridescenceMap:st,iridescenceThicknessMap:gt,sheen:X,sheenColorMap:Ot,sheenRoughnessMap:vt,specularMap:bt,specularColorMap:Ut,specularIntensityMap:Vt,transmission:j,transmissionMap:Qt,thicknessMap:B,gradientMap:_t,opaque:y.transparent===!1&&y.blending===ao&&y.alphaToCoverage===!1,alphaMap:it,alphaTest:xt,alphaHash:wt,combine:y.combine,mapUv:Gt&&p(y.map.channel),aoMapUv:le&&p(y.aoMap.channel),lightMapUv:ve&&p(y.lightMap.channel),bumpMapUv:re&&p(y.bumpMap.channel),normalMapUv:Ce&&p(y.normalMap.channel),displacementMapUv:je&&p(y.displacementMap.channel),emissiveMapUv:mn&&p(y.emissiveMap.channel),metalnessMapUv:Oe&&p(y.metalnessMap.channel),roughnessMapUv:ke&&p(y.roughnessMap.channel),anisotropyMapUv:tt&&p(y.anisotropyMap.channel),clearcoatMapUv:dt&&p(y.clearcoatMap.channel),clearcoatNormalMapUv:pt&&p(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:et&&p(y.clearcoatRoughnessMap.channel),iridescenceMapUv:st&&p(y.iridescenceMap.channel),iridescenceThicknessMapUv:gt&&p(y.iridescenceThicknessMap.channel),sheenColorMapUv:Ot&&p(y.sheenColorMap.channel),sheenRoughnessMapUv:vt&&p(y.sheenRoughnessMap.channel),specularMapUv:bt&&p(y.specularMap.channel),specularColorMapUv:Ut&&p(y.specularColorMap.channel),specularIntensityMapUv:Vt&&p(y.specularIntensityMap.channel),transmissionMapUv:Qt&&p(y.transmissionMap.channel),thicknessMapUv:B&&p(y.thicknessMap.channel),alphaMapUv:it&&p(y.alphaMap.channel),vertexTangents:!!H.attributes.tangent&&(Ce||z),vertexNormals:!!H.attributes.normal,vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!H.attributes.color&&H.attributes.color.itemSize===4,pointsUvs:k.isPoints===!0&&!!H.attributes.uv&&(Gt||it),fog:!!O,useFog:y.fog===!0,fogExp2:!!O&&O.isFogExp2,flatShading:y.wireframe===!1&&(y.flatShading===!0||H.attributes.normal===void 0&&Ce===!1&&(y.isMeshLambertMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isMeshPhysicalMaterial)),sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:mt,skinning:k.isSkinnedMesh===!0,hasPositionAttribute:H.attributes.position!==void 0,morphTargets:H.morphAttributes.position!==void 0,morphNormals:H.morphAttributes.normal!==void 0,morphColors:H.morphAttributes.color!==void 0,morphTargetsCount:ct,morphTextureStride:Mt,numSunLights:A.sun.length,numDirLights:A.directional.length,numPointLights:A.point.length,numSpotLights:A.spot.length,numSpotLightMaps:A.spotLightMap.length,numRectAreaLights:A.rectArea.length,numHemiLights:A.hemi.length,numSunLightShadows:A.sunShadowMap.length,numDirLightShadows:A.directionalShadowMap.length,numPointLightShadows:A.pointShadowMap.length,numSpotLightShadows:A.spotShadowMap.length,numSpotLightShadowsWithMaps:A.numSpotLightShadowsWithMaps,numLightProbes:A.numLightProbes,numLightProbeGrids:V.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:y.dithering,shadowMapEnabled:i.shadowMap.enabled&&L.length>0,shadowMapType:i.shadowMap.type,toneMapping:Ft,decodeVideoTexture:Gt&&y.map.isVideoTexture===!0&&ce.getTransfer(y.map.colorSpace)===xe,decodeVideoTextureEmissive:mn&&y.emissiveMap.isVideoTexture===!0&&ce.getTransfer(y.emissiveMap.colorSpace)===xe,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===kn,flipSided:y.side===Nn,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:at&&y.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(at&&y.extensions.multiDraw===!0||ht)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return Dt.vertexUv1s=c.has(1),Dt.vertexUv2s=c.has(2),Dt.vertexUv3s=c.has(3),c.clear(),Dt}function g(y){let A=[];if(y.shaderID?A.push(y.shaderID):(A.push(y.customVertexShaderID),A.push(y.customFragmentShaderID)),y.defines!==void 0)for(let L in y.defines)A.push(L),A.push(y.defines[L]);return y.isRawShaderMaterial===!1&&(m(A,y),M(A,y),A.push(i.outputColorSpace)),A.push(y.customProgramCacheKey),A.join()}function m(y,A){y.push(A.precision),y.push(A.outputColorSpace),y.push(A.envMapMode),y.push(A.envMapCubeUVHeight),y.push(A.mapUv),y.push(A.alphaMapUv),y.push(A.lightMapUv),y.push(A.aoMapUv),y.push(A.bumpMapUv),y.push(A.normalMapUv),y.push(A.displacementMapUv),y.push(A.emissiveMapUv),y.push(A.metalnessMapUv),y.push(A.roughnessMapUv),y.push(A.anisotropyMapUv),y.push(A.clearcoatMapUv),y.push(A.clearcoatNormalMapUv),y.push(A.clearcoatRoughnessMapUv),y.push(A.iridescenceMapUv),y.push(A.iridescenceThicknessMapUv),y.push(A.sheenColorMapUv),y.push(A.sheenRoughnessMapUv),y.push(A.specularMapUv),y.push(A.specularColorMapUv),y.push(A.specularIntensityMapUv),y.push(A.transmissionMapUv),y.push(A.thicknessMapUv),y.push(A.combine),y.push(A.fogExp2),y.push(A.sizeAttenuation),y.push(A.morphTargetsCount),y.push(A.morphAttributeCount),y.push(A.numSunLights),y.push(A.numDirLights),y.push(A.numPointLights),y.push(A.numSpotLights),y.push(A.numSpotLightMaps),y.push(A.numHemiLights),y.push(A.numRectAreaLights),y.push(A.numSunLightShadows),y.push(A.numDirLightShadows),y.push(A.numPointLightShadows),y.push(A.numSpotLightShadows),y.push(A.numSpotLightShadowsWithMaps),y.push(A.numLightProbes),y.push(A.shadowMapType),y.push(A.toneMapping),y.push(A.numClippingPlanes),y.push(A.numClipIntersection),y.push(A.depthPacking)}function M(y,A){o.disableAll(),A.instancing&&o.enable(0),A.instancingColor&&o.enable(1),A.instancingMorph&&o.enable(2),A.matcap&&o.enable(3),A.envMap&&o.enable(4),A.normalMapObjectSpace&&o.enable(5),A.normalMapTangentSpace&&o.enable(6),A.clearcoat&&o.enable(7),A.iridescence&&o.enable(8),A.alphaTest&&o.enable(9),A.vertexColors&&o.enable(10),A.vertexAlphas&&o.enable(11),A.vertexUv1s&&o.enable(12),A.vertexUv2s&&o.enable(13),A.vertexUv3s&&o.enable(14),A.vertexTangents&&o.enable(15),A.anisotropy&&o.enable(16),A.alphaHash&&o.enable(17),A.batching&&o.enable(18),A.dispersion&&o.enable(19),A.retroreflection&&o.enable(24),A.batchingColor&&o.enable(20),A.gradientMap&&o.enable(21),A.packedNormalMap&&o.enable(22),A.vertexNormals&&o.enable(23),y.push(o.mask),o.disableAll(),A.fog&&o.enable(0),A.useFog&&o.enable(1),A.flatShading&&o.enable(2),A.logarithmicDepthBuffer&&o.enable(3),A.reversedDepthBuffer&&o.enable(4),A.skinning&&o.enable(5),A.morphTargets&&o.enable(6),A.morphNormals&&o.enable(7),A.morphColors&&o.enable(8),A.premultipliedAlpha&&o.enable(9),A.shadowMapEnabled&&o.enable(10),A.doubleSided&&o.enable(11),A.flipSided&&o.enable(12),A.useDepthPacking&&o.enable(13),A.dithering&&o.enable(14),A.transmission&&o.enable(15),A.sheen&&o.enable(16),A.opaque&&o.enable(17),A.pointsUvs&&o.enable(18),A.decodeVideoTexture&&o.enable(19),A.decodeVideoTextureEmissive&&o.enable(20),A.alphaToCoverage&&o.enable(21),A.numLightProbeGrids>0&&o.enable(22),A.hasPositionAttribute&&o.enable(23),y.push(o.mask)}function w(y){let A=f[y.type],L;if(A){let N=On[A];L=ir.clone(N.uniforms)}else L=y.uniforms;return L}function _(y,A){let L=h.get(A);return L!==void 0?++L.usedTimes:(L=new zM(i,A,y,s),l.push(L),h.set(A,L)),L}function E(y){if(--y.usedTimes===0){let A=l.indexOf(y);l[A]=l[l.length-1],l.pop(),h.delete(y.cacheKey),y.destroy()}}function T(y){a.remove(y)}function I(){a.dispose()}return{getParameters:b,getProgramCacheKey:g,getUniforms:w,acquireProgram:_,releaseProgram:E,releaseShaderCache:T,programs:l,dispose:I}}function GM(){let i=new WeakMap;function t(o){return i.has(o)}function e(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,c){i.get(o)[a]=c}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function WM(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function xg(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function yg(){let i=[],t=0,e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function o(d){let f=0;return d.isInstancedMesh&&(f+=2),d.isSkinnedMesh&&(f+=1),f}function a(d,f,p,b,g,m){let M=i[t];return M===void 0?(M={id:d.id,object:d,geometry:f,material:p,materialVariant:o(d),groupOrder:b,renderOrder:d.renderOrder,z:g,group:m},i[t]=M):(M.id=d.id,M.object=d,M.geometry=f,M.material=p,M.materialVariant=o(d),M.groupOrder=b,M.renderOrder=d.renderOrder,M.z=g,M.group=m),t++,M}function c(d,f,p,b,g,m,M){M.reversedDepth===!0&&(g=-g);let w=a(d,f,p,b,g,m);p.transmission>0?n.push(w):p.transparent===!0?s.push(w):e.push(w)}function l(d,f,p,b,g,m){let M=a(d,f,p,b,g,m);p.transmission>0?n.unshift(M):p.transparent===!0?s.unshift(M):e.unshift(M)}function h(d,f){e.length>1&&e.sort(d||WM),n.length>1&&n.sort(f||xg),s.length>1&&s.sort(f||xg)}function u(){for(let d=t,f=i.length;d<f;d++){let p=i[d];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:c,unshift:l,finish:u,sort:h}}function XM(){let i=new WeakMap;function t(n,s){let r=i.get(n),o;return r===void 0?(o=new yg,i.set(n,[o])):s>=r.length?(o=new yg,r.push(o)):o=r[s],o}function e(){i=new WeakMap}return{get:t,dispose:e}}function qM(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new R,color:new kt};break;case"SpotLight":e={position:new R,direction:new R,color:new kt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new R,color:new kt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new R,skyColor:new kt,groundColor:new kt};break;case"RectAreaLight":e={color:new kt,position:new R,halfWidth:new R,halfHeight:new R};break}return i[t.id]=e,e}}}function YM(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var ZM=0;function $M(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function jM(i){let t=new qM,e=YM(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new R);let s=new R,r=new jt,o=new jt;function a(l){let h=0,u=0,d=0;for(let k=0;k<9;k++)n.probe[k].set(0,0,0);let f=0,p=0,b=0,g=0,m=0,M=0,w=0,_=0,E=0,T=0,I=0,y=0,A=0,L=0;l.sort($M);for(let k=0,V=l.length;k<V;k++){let O=l[k],H=O.color,U=O.intensity,W=O.distance,K=null;if(O.shadow&&O.shadow.map&&(O.shadow.map.texture.format===Cs?K=O.shadow.map.texture:K=O.shadow.map.depthTexture||O.shadow.map.texture),O.isAmbientLight)h+=H.r*U,u+=H.g*U,d+=H.b*U;else if(O.isLightProbe){for(let G=0;G<9;G++)n.probe[G].addScaledVector(O.sh.coefficients[G],U);L++}else if(O.isSunLight){let G=t.get(O);if(G.color.copy(O.color).multiplyScalar(O.intensity),O.castShadow){let D=O.shadow,Z=e.get(O);Z.shadowIntensity=D.intensity,Z.shadowBias=D.bias,Z.shadowNormalBias=D.normalBias,Z.shadowRadius=D.radius,Z.shadowMapSize.copy(D.mapSize).multiply(D.getFrameExtents()),n.sunShadow[p]=Z,n.sunShadowMap[p]=K;let ct=D.getViewportCount();for(let Mt=0;Mt<ct;Mt++)n.sunShadowMatrix[b+Mt]=D.getMatrix(Mt),n.sunShadowCascade[b+Mt]=D._cascadeData[Mt];b+=ct,p++}n.sun[f]=G,f++}else if(O.isDirectionalLight){let G=t.get(O);if(G.color.copy(O.color).multiplyScalar(O.intensity),O.castShadow){let D=O.shadow,Z=e.get(O);Z.shadowIntensity=D.intensity,Z.shadowBias=D.bias,Z.shadowNormalBias=D.normalBias,Z.shadowRadius=D.radius,Z.shadowMapSize=D.mapSize,n.directionalShadow[g]=Z,n.directionalShadowMap[g]=K,n.directionalShadowMatrix[g]=O.shadow.matrix,E++}n.directional[g]=G,g++}else if(O.isSpotLight){let G=t.get(O);G.position.setFromMatrixPosition(O.matrixWorld),G.color.copy(H).multiplyScalar(U),G.distance=W,G.coneCos=Math.cos(O.angle),G.penumbraCos=Math.cos(O.angle*(1-O.penumbra)),G.decay=O.decay,n.spot[M]=G;let D=O.shadow;if(O.map&&(n.spotLightMap[y]=O.map,y++,D.updateMatrices(O),O.castShadow&&A++),n.spotLightMatrix[M]=D.matrix,O.castShadow){let Z=e.get(O);Z.shadowIntensity=D.intensity,Z.shadowBias=D.bias,Z.shadowNormalBias=D.normalBias,Z.shadowRadius=D.radius,Z.shadowMapSize=D.mapSize,n.spotShadow[M]=Z,n.spotShadowMap[M]=K,I++}M++}else if(O.isRectAreaLight){let G=t.get(O);G.color.copy(H).multiplyScalar(U),G.halfWidth.set(O.width*.5,0,0),G.halfHeight.set(0,O.height*.5,0),n.rectArea[w]=G,w++}else if(O.isPointLight){let G=t.get(O);if(G.color.copy(O.color).multiplyScalar(O.intensity),G.distance=O.distance,G.decay=O.decay,O.castShadow){let D=O.shadow,Z=e.get(O);Z.shadowIntensity=D.intensity,Z.shadowBias=D.bias,Z.shadowNormalBias=D.normalBias,Z.shadowRadius=D.radius,Z.shadowMapSize=D.mapSize,Z.shadowCameraNear=D.camera.near,Z.shadowCameraFar=D.camera.far,n.pointShadow[m]=Z,n.pointShadowMap[m]=K,n.pointShadowMatrix[m]=O.shadow.matrix,T++}n.point[m]=G,m++}else if(O.isHemisphereLight){let G=t.get(O);G.skyColor.copy(O.color).multiplyScalar(U),G.groundColor.copy(O.groundColor).multiplyScalar(U),n.hemi[_]=G,_++}}w>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ft.LTC_FLOAT_1,n.rectAreaLTC2=ft.LTC_FLOAT_2):(n.rectAreaLTC1=ft.LTC_HALF_1,n.rectAreaLTC2=ft.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;let N=n.hash;(N.sunLength!==f||N.directionalLength!==g||N.pointLength!==m||N.spotLength!==M||N.rectAreaLength!==w||N.hemiLength!==_||N.numSunShadows!==p||N.numDirectionalShadows!==E||N.numPointShadows!==T||N.numSpotShadows!==I||N.numSpotMaps!==y||N.numLightProbes!==L)&&(n.sun.length=f,n.directional.length=g,n.spot.length=M,n.rectArea.length=w,n.point.length=m,n.hemi.length=_,n.sunShadow.length=p,n.sunShadowMap.length=p,n.sunShadowMatrix.length=b,n.sunShadowCascade.length=b,n.directionalShadow.length=E,n.directionalShadowMap.length=E,n.directionalShadowMatrix.length=E,n.pointShadow.length=T,n.pointShadowMap.length=T,n.pointShadowMatrix.length=T,n.spotShadow.length=I,n.spotShadowMap.length=I,n.spotLightMatrix.length=I+y-A,n.spotLightMap.length=y,n.numSpotLightShadowsWithMaps=A,n.numLightProbes=L,N.sunLength=f,N.directionalLength=g,N.pointLength=m,N.spotLength=M,N.rectAreaLength=w,N.hemiLength=_,N.numSunShadows=p,N.numDirectionalShadows=E,N.numPointShadows=T,N.numSpotShadows=I,N.numSpotMaps=y,N.numLightProbes=L,n.version=ZM++)}function c(l,h){let u=0,d=0,f=0,p=0,b=0,g=0,m=h.matrixWorldInverse;for(let M=0,w=l.length;M<w;M++){let _=l[M];if(_.isSunLight){let E=n.sun[u];E.direction.setFromMatrixPosition(_.matrixWorld),E.direction.transformDirection(m),u++}else if(_.isDirectionalLight){let E=n.directional[d];E.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),E.direction.sub(s),E.direction.transformDirection(m),d++}else if(_.isSpotLight){let E=n.spot[p];E.position.setFromMatrixPosition(_.matrixWorld),E.position.applyMatrix4(m),E.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),E.direction.sub(s),E.direction.transformDirection(m),p++}else if(_.isRectAreaLight){let E=n.rectArea[b];E.position.setFromMatrixPosition(_.matrixWorld),E.position.applyMatrix4(m),o.identity(),r.copy(_.matrixWorld),r.premultiply(m),o.extractRotation(r),E.halfWidth.set(_.width*.5,0,0),E.halfHeight.set(0,_.height*.5,0),E.halfWidth.applyMatrix4(o),E.halfHeight.applyMatrix4(o),b++}else if(_.isPointLight){let E=n.point[f];E.position.setFromMatrixPosition(_.matrixWorld),E.position.applyMatrix4(m),f++}else if(_.isHemisphereLight){let E=n.hemi[g];E.direction.setFromMatrixPosition(_.matrixWorld),E.direction.transformDirection(m),g++}}}return{setup:a,setupView:c,state:n}}function vg(i){let t=new jM(i),e=[],n=[],s=[];function r(d){u.camera=d,e.length=0,n.length=0,s.length=0}function o(d){e.push(d)}function a(d){n.push(d)}function c(d){s.push(d)}function l(){t.setup(e)}function h(d){t.setupView(e,d)}let u={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:u,setupLights:l,setupLightsView:h,pushLight:o,pushShadow:a,pushLightProbeGrid:c}}function KM(i){let t=new WeakMap;function e(s,r=0){let o=t.get(s),a;return o===void 0?(a=new vg(i),t.set(s,[a])):r>=o.length?(a=new vg(i),o.push(a)):a=o[r],a}function n(){t=new WeakMap}return{get:e,dispose:n}}var JM=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,QM=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,tw=[new R(1,0,0),new R(-1,0,0),new R(0,1,0),new R(0,-1,0),new R(0,0,1),new R(0,0,-1)],ew=[new R(0,-1,0),new R(0,-1,0),new R(0,0,1),new R(0,0,-1),new R(0,-1,0),new R(0,-1,0)],Sg=new jt,Ha=new R,wf=new R;function nw(i,t,e){let n=new Cn,s=new ut,r=new ut,o=new ye,a=new yc,c=new vc,l={},h=e.maxTextureSize,u={[ri]:Nn,[Nn]:ri,[kn]:kn},d=new xn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ut},radius:{value:4}},vertexShader:JM,fragmentShader:QM}),f=d.clone();f.defines.HORIZONTAL_PASS=1;let p=new Be;p.setAttribute("position",new Ie(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let b=new Re(p,d),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Ca;let m=this.type;this.render=function(T,I,y){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||T.length===0)return;this.type===pm&&(Xt("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Ca);let A=i.getRenderTarget(),L=i.getActiveCubeFace(),N=i.getActiveMipmapLevel(),k=i.state;k.setBlending(Ni),k.buffers.depth.getReversed()===!0?k.buffers.color.setClear(0,0,0,0):k.buffers.color.setClear(1,1,1,1),k.buffers.depth.setTest(!0),k.setScissorTest(!1);let V=m!==this.type;V&&I.traverse(function(O){O.material&&(Array.isArray(O.material)?O.material.forEach(H=>H.needsUpdate=!0):O.material.needsUpdate=!0)});for(let O=0,H=T.length;O<H;O++){let U=T[O],W=U.shadow;if(W===void 0){Xt("WebGLShadowMap:",U,"has no shadow.");continue}if(W.autoUpdate===!1&&W.needsUpdate===!1)continue;s.copy(W.mapSize);let K=W.getFrameExtents();s.multiply(K),r.copy(W.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/K.x),s.x=r.x*K.x,W.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/K.y),s.y=r.y*K.y,W.mapSize.y=r.y));let G=i.state.buffers.depth.getReversed();if(W.camera._reversedDepth=G,W.map===null||V===!0){if(W.map!==null&&(W.map.depthTexture!==null&&(W.map.depthTexture.dispose(),W.map.depthTexture=null),W.map.dispose()),this.type===oo){if(U.isPointLight){Xt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}W.map=new zn(s.x,s.y,{format:Cs,type:Mi,minFilter:bn,magFilter:bn,generateMipmaps:!1}),W.map.texture.name=U.name+".shadowMap",W.map.depthTexture=new vs(s.x,s.y,Si),W.map.depthTexture.name=U.name+".shadowMapDepth",W.map.depthTexture.format=Pi,W.map.depthTexture.compareFunction=null,W.map.depthTexture.minFilter=un,W.map.depthTexture.magFilter=un}else U.isPointLight?(W.map=new Ah(s.x),W.map.depthTexture=new dc(s.x,vi)):(W.map=new zn(s.x,s.y),W.map.depthTexture=new vs(s.x,s.y,vi)),W.map.depthTexture.name=U.name+".shadowMap",W.map.depthTexture.format=Pi,this.type===Ca?(W.map.depthTexture.compareFunction=G?Mh:Sh,W.map.depthTexture.minFilter=bn,W.map.depthTexture.magFilter=bn):(W.map.depthTexture.compareFunction=null,W.map.depthTexture.minFilter=un,W.map.depthTexture.magFilter=un);W.camera.updateProjectionMatrix()}W.map.isWebGLCubeRenderTarget!==!0&&(W.map.width!==s.x||W.map.height!==s.y)&&W.map.setSize(s.x,s.y);let D=W.map.isWebGLCubeRenderTarget?6:W.getViewportCount();U.isPointLight!==!0&&W.updateMatrices(U,y);for(let Z=0;Z<D;Z++){let ct=W.getCamera(Z);if(U.isPointLight){let Mt=W.camera,Wt=W.matrix,It=U.distance||Mt.far;It!==Mt.far&&(Mt.far=It,Mt.updateProjectionMatrix()),Ha.setFromMatrixPosition(U.matrixWorld),Mt.position.copy(Ha),wf.copy(Mt.position),wf.add(tw[Z]),Mt.up.copy(ew[Z]),Mt.lookAt(wf),Mt.updateMatrixWorld(),Wt.makeTranslation(-Ha.x,-Ha.y,-Ha.z),Sg.multiplyMatrices(Mt.projectionMatrix,Mt.matrixWorldInverse),W._frustum.setFromProjectionMatrix(Sg,Mt.coordinateSystem,Mt.reversedDepth)}if(W.map.isWebGLCubeRenderTarget)i.setRenderTarget(W.map,Z),i.clear();else{Z===0&&(i.setRenderTarget(W.map),i.clear());let Mt=W.getViewport(Z);o.set(r.x*Mt.x,r.y*Mt.y,r.x*Mt.z,r.y*Mt.w),k.viewport(o)}n=W.getFrustum(Z),_(I,y,ct,U,this.type)}W.isPointLightShadow!==!0&&this.type===oo&&M(W,y),W.needsUpdate=!1}m=this.type,g.needsUpdate=!1,i.setRenderTarget(A,L,N)};function M(T,I){let y=t.update(b);d.defines.VSM_SAMPLES!==T.blurSamples&&(d.defines.VSM_SAMPLES=T.blurSamples,f.defines.VSM_SAMPLES=T.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),T.mapPass===null?T.mapPass=new zn(s.x,s.y,{format:Cs,type:Mi}):(T.mapPass.width!==T.map.width||T.mapPass.height!==T.map.height)&&T.mapPass.setSize(T.map.width,T.map.height),d.uniforms.shadow_pass.value=T.map.depthTexture,d.uniforms.resolution.value.set(T.map.width,T.map.height),d.uniforms.radius.value=T.radius,i.setRenderTarget(T.mapPass),i.clear(),i.renderBufferDirect(I,null,y,d,b,null),f.uniforms.shadow_pass.value=T.mapPass.texture,f.uniforms.resolution.value.set(T.map.width,T.map.height),f.uniforms.radius.value=T.radius,i.setRenderTarget(T.map),i.clear(),i.renderBufferDirect(I,null,y,f,b,null)}function w(T,I,y,A){let L=null,N=y.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(N!==void 0)L=N;else if(L=y.isPointLight===!0?c:a,i.localClippingEnabled&&I.clipShadows===!0&&Array.isArray(I.clippingPlanes)&&I.clippingPlanes.length!==0||I.displacementMap&&I.displacementScale!==0||I.alphaMap&&I.alphaTest>0||I.map&&I.alphaTest>0||I.alphaToCoverage===!0){let k=L.uuid,V=I.uuid,O=l[k];O===void 0&&(O={},l[k]=O);let H=O[V];H===void 0&&(H=L.clone(),O[V]=H,I.addEventListener("dispose",E)),L=H}if(L.visible=I.visible,L.wireframe=I.wireframe,A===oo?L.side=I.shadowSide!==null?I.shadowSide:I.side:L.side=I.shadowSide!==null?I.shadowSide:u[I.side],L.alphaMap=I.alphaMap,L.alphaTest=I.alphaToCoverage===!0?.5:I.alphaTest,L.map=I.map,L.clipShadows=I.clipShadows,L.clippingPlanes=I.clippingPlanes,L.clipIntersection=I.clipIntersection,L.displacementMap=I.displacementMap,L.displacementScale=I.displacementScale,L.displacementBias=I.displacementBias,L.wireframeLinewidth=I.wireframeLinewidth,L.linewidth=I.linewidth,y.isPointLight===!0&&L.isMeshDistanceMaterial===!0){let k=i.properties.get(L);k.light=y}return L}function _(T,I,y,A,L){if(T.visible===!1)return;if(T.layers.test(I.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&L===oo)&&(!T.frustumCulled||T.intersectsFrustum(n))){T.modelViewMatrix.multiplyMatrices(y.matrixWorldInverse,T.matrixWorld);let V=t.update(T),O=T.material;if(Array.isArray(O)){let H=V.groups;for(let U=0,W=H.length;U<W;U++){let K=H[U],G=O[K.materialIndex];if(G&&G.visible){let D=w(T,G,A,L);T.onBeforeShadow(i,T,I,y,V,D,K),i.renderBufferDirect(y,null,V,D,T,K),T.onAfterShadow(i,T,I,y,V,D,K)}}}else if(O.visible){let H=w(T,O,A,L);T.onBeforeShadow(i,T,I,y,V,H,null),i.renderBufferDirect(y,null,V,H,T,null),T.onAfterShadow(i,T,I,y,V,H,null)}}let k=T.children;for(let V=0,O=k.length;V<O;V++)_(k[V],I,y,A,L)}function E(T){T.target.removeEventListener("dispose",E);for(let y in l){let A=l[y],L=T.target.uuid;L in A&&(A[L].dispose(),delete A[L])}}}function iw(i,t){function e(){let B=!1,_t=new ye,it=null,xt=new ye(0,0,0,0);return{setMask:function(wt){it!==wt&&!B&&(i.colorMask(wt,wt,wt,wt),it=wt)},setLocked:function(wt){B=wt},setClear:function(wt,at,Ft,Dt,Ae){Ae===!0&&(wt*=Dt,at*=Dt,Ft*=Dt),_t.set(wt,at,Ft,Dt),xt.equals(_t)===!1&&(i.clearColor(wt,at,Ft,Dt),xt.copy(_t))},reset:function(){B=!1,it=null,xt.set(-1,0,0,0)}}}function n(){let B=!1,_t=!1,it=null,xt=null,wt=null;return{setReversed:function(at){if(_t!==at){let Ft=t.get("EXT_clip_control");at?Ft.clipControlEXT(Ft.LOWER_LEFT_EXT,Ft.ZERO_TO_ONE_EXT):Ft.clipControlEXT(Ft.LOWER_LEFT_EXT,Ft.NEGATIVE_ONE_TO_ONE_EXT),_t=at;let Dt=wt;wt=null,this.setClear(Dt)}},getReversed:function(){return _t},setTest:function(at){at?nt(i.DEPTH_TEST):mt(i.DEPTH_TEST)},setMask:function(at){it!==at&&!B&&(i.depthMask(at),it=at)},setFunc:function(at){if(_t&&(at=Zm[at]),xt!==at){switch(at){case Zl:i.depthFunc(i.NEVER);break;case $l:i.depthFunc(i.ALWAYS);break;case jl:i.depthFunc(i.LESS);break;case Yr:i.depthFunc(i.LEQUAL);break;case Kl:i.depthFunc(i.EQUAL);break;case Jl:i.depthFunc(i.GEQUAL);break;case Ql:i.depthFunc(i.GREATER);break;case tc:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}xt=at}},setLocked:function(at){B=at},setClear:function(at){wt!==at&&(wt=at,_t&&(at=1-at),i.clearDepth(at))},reset:function(){B=!1,it=null,xt=null,wt=null,_t=!1}}}function s(){let B=!1,_t=null,it=null,xt=null,wt=null,at=null,Ft=null,Dt=null,Ae=null;return{setTest:function(ue){B||(ue?nt(i.STENCIL_TEST):mt(i.STENCIL_TEST))},setMask:function(ue){_t!==ue&&!B&&(i.stencilMask(ue),_t=ue)},setFunc:function(ue,ie,Fn){(it!==ue||xt!==ie||wt!==Fn)&&(i.stencilFunc(ue,ie,Fn),it=ue,xt=ie,wt=Fn)},setOp:function(ue,ie,Fn){(at!==ue||Ft!==ie||Dt!==Fn)&&(i.stencilOp(ue,ie,Fn),at=ue,Ft=ie,Dt=Fn)},setLocked:function(ue){B=ue},setClear:function(ue){Ae!==ue&&(i.clearStencil(ue),Ae=ue)},reset:function(){B=!1,_t=null,it=null,xt=null,wt=null,at=null,Ft=null,Dt=null,Ae=null}}}let r=new e,o=new n,a=new s,c=new WeakMap,l=new WeakMap,h={},u={},d={},f=new WeakMap,p=[],b=null,g=!1,m=null,M=null,w=null,_=null,E=null,T=null,I=null,y=new kt(0,0,0),A=0,L=!1,N=null,k=null,V=null,O=null,H=null,U=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),W=!1,K=0,G=i.getParameter(i.VERSION);G.indexOf("WebGL")!==-1?(K=parseFloat(/^WebGL (\d)/.exec(G)[1]),W=K>=1):G.indexOf("OpenGL ES")!==-1&&(K=parseFloat(/^OpenGL ES (\d)/.exec(G)[1]),W=K>=2);let D=null,Z={},ct=i.getParameter(i.SCISSOR_BOX),Mt=i.getParameter(i.VIEWPORT),Wt=new ye().fromArray(ct),It=new ye().fromArray(Mt);function Ht(B,_t,it,xt){let wt=new Uint8Array(4),at=i.createTexture();i.bindTexture(B,at),i.texParameteri(B,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(B,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ft=0;Ft<it;Ft++)B===i.TEXTURE_3D||B===i.TEXTURE_2D_ARRAY?i.texImage3D(_t,0,i.RGBA,1,1,xt,0,i.RGBA,i.UNSIGNED_BYTE,wt):i.texImage2D(_t+Ft,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,wt);return at}let $={};$[i.TEXTURE_2D]=Ht(i.TEXTURE_2D,i.TEXTURE_2D,1),$[i.TEXTURE_CUBE_MAP]=Ht(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),$[i.TEXTURE_2D_ARRAY]=Ht(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),$[i.TEXTURE_3D]=Ht(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),nt(i.DEPTH_TEST),o.setFunc(Yr),re(!1),Ce(Bu),nt(i.CULL_FACE),le(Ni);function nt(B){h[B]!==!0&&(i.enable(B),h[B]=!0)}function mt(B){h[B]!==!1&&(i.disable(B),h[B]=!1)}function Tt(B,_t){return d[B]!==_t?(i.bindFramebuffer(B,_t),d[B]=_t,B===i.DRAW_FRAMEBUFFER&&(d[i.FRAMEBUFFER]=_t),B===i.FRAMEBUFFER&&(d[i.DRAW_FRAMEBUFFER]=_t),!0):!1}function ht(B,_t){let it=p,xt=!1;if(B){it=f.get(_t),it===void 0&&(it=[],f.set(_t,it));let wt=B.textures;if(it.length!==wt.length||it[0]!==i.COLOR_ATTACHMENT0){for(let at=0,Ft=wt.length;at<Ft;at++)it[at]=i.COLOR_ATTACHMENT0+at;it.length=wt.length,xt=!0}}else it[0]!==i.BACK&&(it[0]=i.BACK,xt=!0);xt&&i.drawBuffers(it)}function Gt(B){return b!==B?(i.useProgram(B),b=B,!0):!1}let Ve={[tr]:i.FUNC_ADD,[gm]:i.FUNC_SUBTRACT,[_m]:i.FUNC_REVERSE_SUBTRACT};Ve[bm]=i.MIN,Ve[xm]=i.MAX;let ee={[ym]:i.ZERO,[vm]:i.ONE,[Sm]:i.SRC_COLOR,[Hu]:i.SRC_ALPHA,[Im]:i.SRC_ALPHA_SATURATE,[Tm]:i.DST_COLOR,[wm]:i.DST_ALPHA,[Mm]:i.ONE_MINUS_SRC_COLOR,[Gu]:i.ONE_MINUS_SRC_ALPHA,[Am]:i.ONE_MINUS_DST_COLOR,[Em]:i.ONE_MINUS_DST_ALPHA,[Rm]:i.CONSTANT_COLOR,[Cm]:i.ONE_MINUS_CONSTANT_COLOR,[Pm]:i.CONSTANT_ALPHA,[Lm]:i.ONE_MINUS_CONSTANT_ALPHA};function le(B,_t,it,xt,wt,at,Ft,Dt,Ae,ue){if(B===Ni){g===!0&&(mt(i.BLEND),g=!1);return}if(g===!1&&(nt(i.BLEND),g=!0),B!==mm){if(B!==m||ue!==L){if((M!==tr||E!==tr)&&(i.blendEquation(i.FUNC_ADD),M=tr,E=tr),ue)switch(B){case ao:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case zu:i.blendFunc(i.ONE,i.ONE);break;case Vu:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case ku:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Zt("WebGLState: Invalid blending: ",B);break}else switch(B){case ao:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case zu:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Vu:Zt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case ku:Zt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Zt("WebGLState: Invalid blending: ",B);break}w=null,_=null,T=null,I=null,y.set(0,0,0),A=0,m=B,L=ue}return}wt=wt||_t,at=at||it,Ft=Ft||xt,(_t!==M||wt!==E)&&(i.blendEquationSeparate(Ve[_t],Ve[wt]),M=_t,E=wt),(it!==w||xt!==_||at!==T||Ft!==I)&&(i.blendFuncSeparate(ee[it],ee[xt],ee[at],ee[Ft]),w=it,_=xt,T=at,I=Ft),(Dt.equals(y)===!1||Ae!==A)&&(i.blendColor(Dt.r,Dt.g,Dt.b,Ae),y.copy(Dt),A=Ae),m=B,L=!1}function ve(B,_t){B.side===kn?mt(i.CULL_FACE):nt(i.CULL_FACE);let it=B.side===Nn;_t&&(it=!it),re(it),B.blending===ao&&B.transparent===!1?le(Ni):le(B.blending,B.blendEquation,B.blendSrc,B.blendDst,B.blendEquationAlpha,B.blendSrcAlpha,B.blendDstAlpha,B.blendColor,B.blendAlpha,B.premultipliedAlpha),o.setFunc(B.depthFunc),o.setTest(B.depthTest),o.setMask(B.depthWrite),r.setMask(B.colorWrite);let xt=B.stencilWrite;a.setTest(xt),xt&&(a.setMask(B.stencilWriteMask),a.setFunc(B.stencilFunc,B.stencilRef,B.stencilFuncMask),a.setOp(B.stencilFail,B.stencilZFail,B.stencilZPass)),mn(B.polygonOffset,B.polygonOffsetFactor,B.polygonOffsetUnits),B.alphaToCoverage===!0?nt(i.SAMPLE_ALPHA_TO_COVERAGE):mt(i.SAMPLE_ALPHA_TO_COVERAGE)}function re(B){N!==B&&(B?i.frontFace(i.CW):i.frontFace(i.CCW),N=B)}function Ce(B){B!==um?(nt(i.CULL_FACE),B!==k&&(B===Bu?i.cullFace(i.BACK):B===fm?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):mt(i.CULL_FACE),k=B}function je(B){B!==V&&(W&&i.lineWidth(B),V=B)}function mn(B,_t,it){B?(nt(i.POLYGON_OFFSET_FILL),(O!==_t||H!==it)&&(O=_t,H=it,o.getReversed()&&(_t=-_t),i.polygonOffset(_t,it))):mt(i.POLYGON_OFFSET_FILL)}function Oe(B){B?nt(i.SCISSOR_TEST):mt(i.SCISSOR_TEST)}function ke(B){B===void 0&&(B=i.TEXTURE0+U-1),D!==B&&(i.activeTexture(B),D=B)}function z(B,_t,it){it===void 0&&(D===null?it=i.TEXTURE0+U-1:it=D);let xt=Z[it];xt===void 0&&(xt={type:void 0,texture:void 0},Z[it]=xt),(xt.type!==B||xt.texture!==_t)&&(D!==it&&(i.activeTexture(it),D=it),i.bindTexture(B,_t||$[B]),xt.type=B,xt.texture=_t)}function an(){let B=Z[D];B!==void 0&&B.type!==void 0&&(i.bindTexture(B.type,null),B.type=void 0,B.texture=void 0)}function me(){try{i.compressedTexImage2D(...arguments)}catch(B){Zt("WebGLState:",B)}}function C(){try{i.compressedTexImage3D(...arguments)}catch(B){Zt("WebGLState:",B)}}function x(){try{i.texSubImage2D(...arguments)}catch(B){Zt("WebGLState:",B)}}function X(){try{i.texSubImage3D(...arguments)}catch(B){Zt("WebGLState:",B)}}function j(){try{i.compressedTexSubImage2D(...arguments)}catch(B){Zt("WebGLState:",B)}}function tt(){try{i.compressedTexSubImage3D(...arguments)}catch(B){Zt("WebGLState:",B)}}function dt(){try{i.texStorage2D(...arguments)}catch(B){Zt("WebGLState:",B)}}function pt(){try{i.texStorage3D(...arguments)}catch(B){Zt("WebGLState:",B)}}function et(){try{i.texImage2D(...arguments)}catch(B){Zt("WebGLState:",B)}}function st(){try{i.texImage3D(...arguments)}catch(B){Zt("WebGLState:",B)}}function gt(B){return u[B]!==void 0?u[B]:i.getParameter(B)}function Ot(B,_t){u[B]!==_t&&(i.pixelStorei(B,_t),u[B]=_t)}function vt(B){Wt.equals(B)===!1&&(i.scissor(B.x,B.y,B.z,B.w),Wt.copy(B))}function bt(B){It.equals(B)===!1&&(i.viewport(B.x,B.y,B.z,B.w),It.copy(B))}function Ut(B,_t){let it=l.get(_t);it===void 0&&(it=new WeakMap,l.set(_t,it));let xt=it.get(B);xt===void 0&&(xt=i.getUniformBlockIndex(_t,B.name),it.set(B,xt))}function Vt(B,_t){let xt=l.get(_t).get(B);c.get(_t)!==xt&&(i.uniformBlockBinding(_t,xt,B.__bindingPointIndex),c.set(_t,xt))}function Qt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},u={},D=null,Z={},d={},f=new WeakMap,p=[],b=null,g=!1,m=null,M=null,w=null,_=null,E=null,T=null,I=null,y=new kt(0,0,0),A=0,L=!1,N=null,k=null,V=null,O=null,H=null,Wt.set(0,0,i.canvas.width,i.canvas.height),It.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:nt,disable:mt,bindFramebuffer:Tt,drawBuffers:ht,useProgram:Gt,setBlending:le,setMaterial:ve,setFlipSided:re,setCullFace:Ce,setLineWidth:je,setPolygonOffset:mn,setScissorTest:Oe,activeTexture:ke,bindTexture:z,unbindTexture:an,compressedTexImage2D:me,compressedTexImage3D:C,texImage2D:et,texImage3D:st,pixelStorei:Ot,getParameter:gt,updateUBOMapping:Ut,uniformBlockBinding:Vt,texStorage2D:dt,texStorage3D:pt,texSubImage2D:x,texSubImage3D:X,compressedTexSubImage2D:j,compressedTexSubImage3D:tt,scissor:vt,viewport:bt,reset:Qt}}function sw(i,t,e,n,s,r,o){let a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new ut,h=new WeakMap,u=new Set,d,f=new WeakMap,p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function b(C,x){return p?new OffscreenCanvas(C,x):Ko("canvas")}function g(C,x,X){let j=1,tt=me(C);if((tt.width>X||tt.height>X)&&(j=X/Math.max(tt.width,tt.height)),j<1)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap||typeof VideoFrame<"u"&&C instanceof VideoFrame){let dt=Math.floor(j*tt.width),pt=Math.floor(j*tt.height);d===void 0&&(d=b(dt,pt));let et=x?b(dt,pt):d;return et.width=dt,et.height=pt,et.getContext("2d").drawImage(C,0,0,dt,pt),Xt("WebGLRenderer: Texture has been resized from ("+tt.width+"x"+tt.height+") to ("+dt+"x"+pt+")."),et}else return"data"in C&&Xt("WebGLRenderer: Image in DataTexture is too big ("+tt.width+"x"+tt.height+")."),C;return C}function m(C){return C.generateMipmaps}function M(C){i.generateMipmap(C)}function w(C){return C.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:C.isWebGL3DRenderTarget?i.TEXTURE_3D:C.isWebGLArrayRenderTarget||C.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function _(C,x,X,j,tt,dt=!1){if(C!==null){if(i[C]!==void 0)return i[C];Xt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let pt;j&&(pt=t.get("EXT_texture_norm16"),pt||Xt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let et=x;if(x===i.RED&&(X===i.FLOAT&&(et=i.R32F),X===i.HALF_FLOAT&&(et=i.R16F),X===i.UNSIGNED_BYTE&&(et=i.R8),X===i.UNSIGNED_SHORT&&pt&&(et=pt.R16_EXT),X===i.SHORT&&pt&&(et=pt.R16_SNORM_EXT)),x===i.RED_INTEGER&&(X===i.UNSIGNED_BYTE&&(et=i.R8UI),X===i.UNSIGNED_SHORT&&(et=i.R16UI),X===i.UNSIGNED_INT&&(et=i.R32UI),X===i.BYTE&&(et=i.R8I),X===i.SHORT&&(et=i.R16I),X===i.INT&&(et=i.R32I)),x===i.RG&&(X===i.FLOAT&&(et=i.RG32F),X===i.HALF_FLOAT&&(et=i.RG16F),X===i.UNSIGNED_BYTE&&(et=i.RG8),X===i.UNSIGNED_SHORT&&pt&&(et=pt.RG16_EXT),X===i.SHORT&&pt&&(et=pt.RG16_SNORM_EXT)),x===i.RG_INTEGER&&(X===i.UNSIGNED_BYTE&&(et=i.RG8UI),X===i.UNSIGNED_SHORT&&(et=i.RG16UI),X===i.UNSIGNED_INT&&(et=i.RG32UI),X===i.BYTE&&(et=i.RG8I),X===i.SHORT&&(et=i.RG16I),X===i.INT&&(et=i.RG32I)),x===i.RGB_INTEGER&&(X===i.UNSIGNED_BYTE&&(et=i.RGB8UI),X===i.UNSIGNED_SHORT&&(et=i.RGB16UI),X===i.UNSIGNED_INT&&(et=i.RGB32UI),X===i.BYTE&&(et=i.RGB8I),X===i.SHORT&&(et=i.RGB16I),X===i.INT&&(et=i.RGB32I)),x===i.RGBA_INTEGER&&(X===i.UNSIGNED_BYTE&&(et=i.RGBA8UI),X===i.UNSIGNED_SHORT&&(et=i.RGBA16UI),X===i.UNSIGNED_INT&&(et=i.RGBA32UI),X===i.BYTE&&(et=i.RGBA8I),X===i.SHORT&&(et=i.RGBA16I),X===i.INT&&(et=i.RGBA32I)),x===i.RGB&&(X===i.UNSIGNED_SHORT&&pt&&(et=pt.RGB16_EXT),X===i.SHORT&&pt&&(et=pt.RGB16_SNORM_EXT),X===i.UNSIGNED_INT_5_9_9_9_REV&&(et=i.RGB9_E5),X===i.UNSIGNED_INT_10F_11F_11F_REV&&(et=i.R11F_G11F_B10F)),x===i.RGBA){let st=dt?jo:ce.getTransfer(tt);X===i.FLOAT&&(et=i.RGBA32F),X===i.HALF_FLOAT&&(et=i.RGBA16F),X===i.UNSIGNED_BYTE&&(et=st===xe?i.SRGB8_ALPHA8:i.RGBA8),X===i.UNSIGNED_SHORT&&pt&&(et=pt.RGBA16_EXT),X===i.SHORT&&pt&&(et=pt.RGBA16_SNORM_EXT),X===i.UNSIGNED_SHORT_4_4_4_4&&(et=i.RGBA4),X===i.UNSIGNED_SHORT_5_5_5_1&&(et=i.RGB5_A1)}return(et===i.R16F||et===i.R32F||et===i.RG16F||et===i.RG32F||et===i.RGBA16F||et===i.RGBA32F)&&t.get("EXT_color_buffer_float"),et}function E(C,x){let X;return C?x===null||x===vi||x===co?X=i.DEPTH24_STENCIL8:x===Si?X=i.DEPTH32F_STENCIL8:x===lo&&(X=i.DEPTH24_STENCIL8,Xt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):x===null||x===vi||x===co?X=i.DEPTH_COMPONENT24:x===Si?X=i.DEPTH_COMPONENT32F:x===lo&&(X=i.DEPTH_COMPONENT16),X}function T(C,x){return m(C)===!0||C.isFramebufferTexture&&C.minFilter!==un&&C.minFilter!==bn?Math.log2(Math.max(x.width,x.height))+1:C.mipmaps!==void 0&&C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?x.mipmaps.length:1}function I(C){let x=C.target;x.removeEventListener("dispose",I),A(x),x.isVideoTexture&&h.delete(x),x.isHTMLTexture&&u.delete(x)}function y(C){let x=C.target;x.removeEventListener("dispose",y),N(x)}function A(C){let x=n.get(C);if(x.__webglInit===void 0)return;let X=C.source,j=f.get(X);if(j){let tt=j[x.__cacheKey];tt.usedTimes--,tt.usedTimes===0&&L(C),Object.keys(j).length===0&&f.delete(X)}n.remove(C)}function L(C){let x=n.get(C);i.deleteTexture(x.__webglTexture);let X=C.source,j=f.get(X);delete j[x.__cacheKey],o.memory.textures--}function N(C){let x=n.get(C);if(C.depthTexture&&(C.depthTexture.dispose(),n.remove(C.depthTexture)),C.isWebGLCubeRenderTarget)for(let j=0;j<6;j++){if(Array.isArray(x.__webglFramebuffer[j]))for(let tt=0;tt<x.__webglFramebuffer[j].length;tt++)i.deleteFramebuffer(x.__webglFramebuffer[j][tt]);else i.deleteFramebuffer(x.__webglFramebuffer[j]);x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer[j])}else{if(Array.isArray(x.__webglFramebuffer))for(let j=0;j<x.__webglFramebuffer.length;j++)i.deleteFramebuffer(x.__webglFramebuffer[j]);else i.deleteFramebuffer(x.__webglFramebuffer);if(x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer),x.__webglMultisampledFramebuffer&&i.deleteFramebuffer(x.__webglMultisampledFramebuffer),x.__webglColorRenderbuffer)for(let j=0;j<x.__webglColorRenderbuffer.length;j++)x.__webglColorRenderbuffer[j]&&i.deleteRenderbuffer(x.__webglColorRenderbuffer[j]);x.__webglDepthRenderbuffer&&i.deleteRenderbuffer(x.__webglDepthRenderbuffer)}let X=C.textures;for(let j=0,tt=X.length;j<tt;j++){let dt=n.get(X[j]);dt.__webglTexture&&(i.deleteTexture(dt.__webglTexture),o.memory.textures--),n.remove(X[j])}n.remove(C)}let k=0;function V(){k=0}function O(){return k}function H(C){k=C}function U(){let C=k;return C>=s.maxTextures&&Xt("WebGLTextures: Trying to use "+(C+1)+" texture units while this GPU supports only "+s.maxTextures),k+=1,C}function W(C){let x=[];return x.push(C.wrapS),x.push(C.wrapT),x.push(C.wrapR||0),x.push(C.magFilter),x.push(C.minFilter),x.push(C.anisotropy),x.push(C.internalFormat),x.push(C.format),x.push(C.type),x.push(C.generateMipmaps),x.push(C.premultiplyAlpha),x.push(C.flipY),x.push(C.unpackAlignment),x.push(C.colorSpace),x.join()}function K(C,x){let X=n.get(C);if(C.isVideoTexture&&z(C),C.isRenderTargetTexture===!1&&C.isExternalTexture!==!0&&C.version>0&&X.__version!==C.version){let j=C.image;if(j===null)Xt("WebGLRenderer: Texture marked for update but no image data found.");else if(j.complete===!1)Xt("WebGLRenderer: Texture marked for update but image is incomplete");else{mt(X,C,x);return}}else C.isExternalTexture&&(X.__webglTexture=C.sourceTexture?C.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,X.__webglTexture,i.TEXTURE0+x)}function G(C,x){let X=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&X.__version!==C.version){mt(X,C,x);return}else C.isExternalTexture&&(X.__webglTexture=C.sourceTexture?C.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,X.__webglTexture,i.TEXTURE0+x)}function D(C,x){let X=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&X.__version!==C.version){mt(X,C,x);return}e.bindTexture(i.TEXTURE_3D,X.__webglTexture,i.TEXTURE0+x)}function Z(C,x){let X=n.get(C);if(C.isCubeDepthTexture!==!0&&C.version>0&&X.__version!==C.version){Tt(X,C,x);return}e.bindTexture(i.TEXTURE_CUBE_MAP,X.__webglTexture,i.TEXTURE0+x)}let ct={[ec]:i.REPEAT,[Ri]:i.CLAMP_TO_EDGE,[nc]:i.MIRRORED_REPEAT},Mt={[un]:i.NEAREST,[Om]:i.NEAREST_MIPMAP_NEAREST,[Da]:i.NEAREST_MIPMAP_LINEAR,[bn]:i.LINEAR,[zc]:i.LINEAR_MIPMAP_NEAREST,[Is]:i.LINEAR_MIPMAP_LINEAR},Wt={[zm]:i.NEVER,[Wm]:i.ALWAYS,[Vm]:i.LESS,[Sh]:i.LEQUAL,[km]:i.EQUAL,[Mh]:i.GEQUAL,[Hm]:i.GREATER,[Gm]:i.NOTEQUAL};function It(C,x){if(x.type===Si&&t.has("OES_texture_float_linear")===!1&&(x.magFilter===bn||x.magFilter===zc||x.magFilter===Da||x.magFilter===Is||x.minFilter===bn||x.minFilter===zc||x.minFilter===Da||x.minFilter===Is)&&Xt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(C,i.TEXTURE_WRAP_S,ct[x.wrapS]),i.texParameteri(C,i.TEXTURE_WRAP_T,ct[x.wrapT]),(C===i.TEXTURE_3D||C===i.TEXTURE_2D_ARRAY)&&i.texParameteri(C,i.TEXTURE_WRAP_R,ct[x.wrapR]),i.texParameteri(C,i.TEXTURE_MAG_FILTER,Mt[x.magFilter]),i.texParameteri(C,i.TEXTURE_MIN_FILTER,Mt[x.minFilter]),x.compareFunction&&(i.texParameteri(C,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(C,i.TEXTURE_COMPARE_FUNC,Wt[x.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(x.magFilter===un||x.minFilter!==Da&&x.minFilter!==Is||x.type===Si&&t.has("OES_texture_float_linear")===!1)return;if(x.anisotropy>1||n.get(x).__currentAnisotropy){let X=t.get("EXT_texture_filter_anisotropic");i.texParameterf(C,X.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,s.getMaxAnisotropy())),n.get(x).__currentAnisotropy=x.anisotropy}}}function Ht(C,x){let X=!1;C.__webglInit===void 0&&(C.__webglInit=!0,x.addEventListener("dispose",I));let j=x.source,tt=f.get(j);tt===void 0&&(tt={},f.set(j,tt));let dt=W(x);if(dt!==C.__cacheKey){tt[dt]===void 0&&(tt[dt]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,X=!0),tt[dt].usedTimes++;let pt=tt[C.__cacheKey];pt!==void 0&&(tt[C.__cacheKey].usedTimes--,pt.usedTimes===0&&L(x)),C.__cacheKey=dt,C.__webglTexture=tt[dt].texture}return X}function $(C,x,X){return Math.floor(Math.floor(C/X)/x)}function nt(C,x,X,j){let dt=C.updateRanges;if(dt.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,x.width,x.height,X,j,x.data);else{dt.sort((Ot,vt)=>Ot.start-vt.start);let pt=0;for(let Ot=1;Ot<dt.length;Ot++){let vt=dt[pt],bt=dt[Ot],Ut=vt.start+vt.count,Vt=$(bt.start,x.width,4),Qt=$(vt.start,x.width,4);bt.start<=Ut+1&&Vt===Qt&&$(bt.start+bt.count-1,x.width,4)===Vt?vt.count=Math.max(vt.count,bt.start+bt.count-vt.start):(++pt,dt[pt]=bt)}dt.length=pt+1;let et=e.getParameter(i.UNPACK_ROW_LENGTH),st=e.getParameter(i.UNPACK_SKIP_PIXELS),gt=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,x.width);for(let Ot=0,vt=dt.length;Ot<vt;Ot++){let bt=dt[Ot],Ut=Math.floor(bt.start/4),Vt=Math.ceil(bt.count/4),Qt=Ut%x.width,B=Math.floor(Ut/x.width),_t=Vt,it=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,Qt),e.pixelStorei(i.UNPACK_SKIP_ROWS,B),e.texSubImage2D(i.TEXTURE_2D,0,Qt,B,_t,it,X,j,x.data)}C.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,et),e.pixelStorei(i.UNPACK_SKIP_PIXELS,st),e.pixelStorei(i.UNPACK_SKIP_ROWS,gt)}}function mt(C,x,X){let j=i.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(j=i.TEXTURE_2D_ARRAY),x.isData3DTexture&&(j=i.TEXTURE_3D);let tt=Ht(C,x),dt=x.source;e.bindTexture(j,C.__webglTexture,i.TEXTURE0+X);let pt=n.get(dt);if(dt.version!==pt.__version||tt===!0){if(e.activeTexture(i.TEXTURE0+X),(typeof ImageBitmap<"u"&&x.image instanceof ImageBitmap)===!1){let it=ce.getPrimaries(ce.workingColorSpace),xt=x.colorSpace===Ji?null:ce.getPrimaries(x.colorSpace),wt=x.colorSpace===Ji||it===xt?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,wt)}e.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment);let st=g(x.image,!1,s.maxTextureSize);st=an(x,st);let gt=r.convert(x.format,x.colorSpace),Ot=r.convert(x.type),vt=_(x.internalFormat,gt,Ot,x.normalized,x.colorSpace,x.isVideoTexture);It(j,x);let bt,Ut=x.mipmaps,Vt=x.isVideoTexture!==!0,Qt=pt.__version===void 0||tt===!0,B=dt.dataReady,_t=T(x,st);if(x.isDepthTexture)vt=E(x.format===Rs,x.type),Qt&&(Vt?e.texStorage2D(i.TEXTURE_2D,1,vt,st.width,st.height):e.texImage2D(i.TEXTURE_2D,0,vt,st.width,st.height,0,gt,Ot,null));else if(x.isDataTexture)if(Ut.length>0){Vt&&Qt&&e.texStorage2D(i.TEXTURE_2D,_t,vt,Ut[0].width,Ut[0].height);for(let it=0,xt=Ut.length;it<xt;it++)bt=Ut[it],Vt?B&&e.texSubImage2D(i.TEXTURE_2D,it,0,0,bt.width,bt.height,gt,Ot,bt.data):e.texImage2D(i.TEXTURE_2D,it,vt,bt.width,bt.height,0,gt,Ot,bt.data);x.generateMipmaps=!1}else Vt?(Qt&&e.texStorage2D(i.TEXTURE_2D,_t,vt,st.width,st.height),B&&nt(x,st,gt,Ot)):e.texImage2D(i.TEXTURE_2D,0,vt,st.width,st.height,0,gt,Ot,st.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){Vt&&Qt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,_t,vt,Ut[0].width,Ut[0].height,st.depth);for(let it=0,xt=Ut.length;it<xt;it++)if(bt=Ut[it],x.format!==oi)if(gt!==null)if(Vt){if(B)if(x.layerUpdates.size>0){let wt=ff(bt.width,bt.height,x.format,x.type);for(let at of x.layerUpdates){let Ft=bt.data.subarray(at*wt/bt.data.BYTES_PER_ELEMENT,(at+1)*wt/bt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,it,0,0,at,bt.width,bt.height,1,gt,Ft)}}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,it,0,0,0,bt.width,bt.height,st.depth,gt,bt.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,it,vt,bt.width,bt.height,st.depth,0,bt.data,0,0);else Xt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Vt?B&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,it,0,0,0,bt.width,bt.height,st.depth,gt,Ot,bt.data):e.texImage3D(i.TEXTURE_2D_ARRAY,it,vt,bt.width,bt.height,st.depth,0,gt,Ot,bt.data);x.layerUpdates.size>0&&x.clearLayerUpdates()}else{Vt&&Qt&&e.texStorage2D(i.TEXTURE_2D,_t,vt,Ut[0].width,Ut[0].height);for(let it=0,xt=Ut.length;it<xt;it++)bt=Ut[it],x.format!==oi?gt!==null?Vt?B&&e.compressedTexSubImage2D(i.TEXTURE_2D,it,0,0,bt.width,bt.height,gt,bt.data):e.compressedTexImage2D(i.TEXTURE_2D,it,vt,bt.width,bt.height,0,bt.data):Xt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Vt?B&&e.texSubImage2D(i.TEXTURE_2D,it,0,0,bt.width,bt.height,gt,Ot,bt.data):e.texImage2D(i.TEXTURE_2D,it,vt,bt.width,bt.height,0,gt,Ot,bt.data)}else if(x.isDataArrayTexture)if(Vt){if(Qt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,_t,vt,st.width,st.height,st.depth),B)if(x.layerUpdates.size>0){let it=ff(st.width,st.height,x.format,x.type);for(let xt of x.layerUpdates){let wt=st.data.subarray(xt*it/st.data.BYTES_PER_ELEMENT,(xt+1)*it/st.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,xt,st.width,st.height,1,gt,Ot,wt)}x.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,st.width,st.height,st.depth,gt,Ot,st.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,vt,st.width,st.height,st.depth,0,gt,Ot,st.data);else if(x.isData3DTexture)Vt?(Qt&&e.texStorage3D(i.TEXTURE_3D,_t,vt,st.width,st.height,st.depth),B&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,st.width,st.height,st.depth,gt,Ot,st.data)):e.texImage3D(i.TEXTURE_3D,0,vt,st.width,st.height,st.depth,0,gt,Ot,st.data);else if(x.isFramebufferTexture){if(Qt)if(Vt)e.texStorage2D(i.TEXTURE_2D,_t,vt,st.width,st.height);else{let it=st.width,xt=st.height;for(let wt=0;wt<_t;wt++)e.texImage2D(i.TEXTURE_2D,wt,vt,it,xt,0,gt,Ot,null),it>>=1,xt>>=1}}else if(x.isHTMLTexture){if("texElementImage2D"in i){let it=i.canvas;if(it.hasAttribute("layoutsubtree")||it.setAttribute("layoutsubtree","true"),st.parentNode!==it){it.appendChild(st),u.add(x),it.onpaint=xt=>{let wt=xt.changedElements;for(let at of u)wt.includes(at.image)&&(at.needsUpdate=!0)},it.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,st);else{let wt=i.RGBA,at=i.RGBA,Ft=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,wt,at,Ft,st)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Ut.length>0){if(Vt&&Qt){let it=me(Ut[0]);e.texStorage2D(i.TEXTURE_2D,_t,vt,it.width,it.height)}for(let it=0,xt=Ut.length;it<xt;it++)bt=Ut[it],Vt?B&&e.texSubImage2D(i.TEXTURE_2D,it,0,0,gt,Ot,bt):e.texImage2D(i.TEXTURE_2D,it,vt,gt,Ot,bt);x.generateMipmaps=!1}else if(Vt){if(Qt){let it=me(st);e.texStorage2D(i.TEXTURE_2D,_t,vt,it.width,it.height)}B&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,gt,Ot,st)}else e.texImage2D(i.TEXTURE_2D,0,vt,gt,Ot,st);m(x)&&M(j),pt.__version=dt.version,x.onUpdate&&x.onUpdate(x)}C.__version=x.version}function Tt(C,x,X){if(x.image.length!==6)return;let j=Ht(C,x),tt=x.source;e.bindTexture(i.TEXTURE_CUBE_MAP,C.__webglTexture,i.TEXTURE0+X);let dt=n.get(tt);if(tt.version!==dt.__version||j===!0){e.activeTexture(i.TEXTURE0+X);let pt=ce.getPrimaries(ce.workingColorSpace),et=x.colorSpace===Ji?null:ce.getPrimaries(x.colorSpace),st=x.colorSpace===Ji||pt===et?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,st);let gt=x.isCompressedTexture||x.image[0].isCompressedTexture,Ot=x.image[0]&&x.image[0].isDataTexture,vt=[];for(let at=0;at<6;at++)!gt&&!Ot?vt[at]=g(x.image[at],!0,s.maxCubemapSize):vt[at]=Ot?x.image[at].image:x.image[at],vt[at]=an(x,vt[at]);let bt=vt[0],Ut=r.convert(x.format,x.colorSpace),Vt=r.convert(x.type),Qt=_(x.internalFormat,Ut,Vt,x.normalized,x.colorSpace),B=x.isVideoTexture!==!0,_t=dt.__version===void 0||j===!0,it=tt.dataReady,xt=T(x,bt);It(i.TEXTURE_CUBE_MAP,x);let wt;if(gt){B&&_t&&e.texStorage2D(i.TEXTURE_CUBE_MAP,xt,Qt,bt.width,bt.height);for(let at=0;at<6;at++){wt=vt[at].mipmaps;for(let Ft=0;Ft<wt.length;Ft++){let Dt=wt[Ft];x.format!==oi?Ut!==null?B?it&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+at,Ft,0,0,Dt.width,Dt.height,Ut,Dt.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+at,Ft,Qt,Dt.width,Dt.height,0,Dt.data):Xt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):B?it&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+at,Ft,0,0,Dt.width,Dt.height,Ut,Vt,Dt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+at,Ft,Qt,Dt.width,Dt.height,0,Ut,Vt,Dt.data)}}}else{if(wt=x.mipmaps,B&&_t){wt.length>0&&xt++;let at=me(vt[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,xt,Qt,at.width,at.height)}for(let at=0;at<6;at++)if(Ot){B?it&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+at,0,0,0,vt[at].width,vt[at].height,Ut,Vt,vt[at].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+at,0,Qt,vt[at].width,vt[at].height,0,Ut,Vt,vt[at].data);for(let Ft=0;Ft<wt.length;Ft++){let Ae=wt[Ft].image[at].image;B?it&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+at,Ft+1,0,0,Ae.width,Ae.height,Ut,Vt,Ae.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+at,Ft+1,Qt,Ae.width,Ae.height,0,Ut,Vt,Ae.data)}}else{B?it&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+at,0,0,0,Ut,Vt,vt[at]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+at,0,Qt,Ut,Vt,vt[at]);for(let Ft=0;Ft<wt.length;Ft++){let Dt=wt[Ft];B?it&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+at,Ft+1,0,0,Ut,Vt,Dt.image[at]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+at,Ft+1,Qt,Ut,Vt,Dt.image[at])}}}m(x)&&M(i.TEXTURE_CUBE_MAP),dt.__version=tt.version,x.onUpdate&&x.onUpdate(x)}C.__version=x.version}function ht(C,x,X,j,tt,dt){let pt=r.convert(X.format,X.colorSpace),et=r.convert(X.type),st=_(X.internalFormat,pt,et,X.normalized,X.colorSpace),gt=n.get(x),Ot=n.get(X);if(Ot.__renderTarget=x,!gt.__hasExternalTextures){let vt=Math.max(1,x.width>>dt),bt=Math.max(1,x.height>>dt);tt===i.TEXTURE_3D||tt===i.TEXTURE_2D_ARRAY?e.texImage3D(tt,dt,st,vt,bt,x.depth,0,pt,et,null):e.texImage2D(tt,dt,st,vt,bt,0,pt,et,null)}e.bindFramebuffer(i.FRAMEBUFFER,C),ke(x)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,j,tt,Ot.__webglTexture,0,Oe(x)):(tt===i.TEXTURE_2D||tt>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&tt<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,j,tt,Ot.__webglTexture,dt),e.bindFramebuffer(i.FRAMEBUFFER,null)}function Gt(C,x,X){if(i.bindRenderbuffer(i.RENDERBUFFER,C),x.depthBuffer){let j=x.depthTexture,tt=j&&j.isDepthTexture?j.type:null,dt=E(x.stencilBuffer,tt),pt=x.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;ke(x)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Oe(x),dt,x.width,x.height):X?i.renderbufferStorageMultisample(i.RENDERBUFFER,Oe(x),dt,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,dt,x.width,x.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,pt,i.RENDERBUFFER,C)}else{let j=x.textures;for(let tt=0;tt<j.length;tt++){let dt=j[tt],pt=r.convert(dt.format,dt.colorSpace),et=r.convert(dt.type),st=_(dt.internalFormat,pt,et,dt.normalized,dt.colorSpace);ke(x)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Oe(x),st,x.width,x.height):X?i.renderbufferStorageMultisample(i.RENDERBUFFER,Oe(x),st,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,st,x.width,x.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Ve(C,x,X){let j=x.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,C),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let tt=n.get(x.depthTexture);if(tt.__renderTarget=x,(!tt.__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),j){if(tt.__webglInit===void 0&&(tt.__webglInit=!0,x.depthTexture.addEventListener("dispose",I)),tt.__webglTexture===void 0){tt.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,tt.__webglTexture),It(i.TEXTURE_CUBE_MAP,x.depthTexture);let gt=r.convert(x.depthTexture.format),Ot=r.convert(x.depthTexture.type),vt;x.depthTexture.format===Pi?vt=i.DEPTH_COMPONENT24:x.depthTexture.format===Rs&&(vt=i.DEPTH24_STENCIL8);for(let bt=0;bt<6;bt++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+bt,0,vt,x.width,x.height,0,gt,Ot,null)}}else K(x.depthTexture,0);let dt=tt.__webglTexture,pt=Oe(x),et=j?i.TEXTURE_CUBE_MAP_POSITIVE_X+X:i.TEXTURE_2D,st=x.depthTexture.format===Rs?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(x.depthTexture.format===Pi)ke(x)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,st,et,dt,0,pt):i.framebufferTexture2D(i.FRAMEBUFFER,st,et,dt,0);else if(x.depthTexture.format===Rs)ke(x)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,st,et,dt,0,pt):i.framebufferTexture2D(i.FRAMEBUFFER,st,et,dt,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function ee(C){let x=n.get(C),X=C.isWebGLCubeRenderTarget===!0;if(x.__boundDepthTexture!==C.depthTexture){let j=C.depthTexture;if(x.__depthDisposeCallback&&x.__depthDisposeCallback(),j){let tt=()=>{delete x.__boundDepthTexture,delete x.__depthDisposeCallback,j.removeEventListener("dispose",tt)};j.addEventListener("dispose",tt),x.__depthDisposeCallback=tt}x.__boundDepthTexture=j}if(C.depthTexture&&!x.__autoAllocateDepthBuffer)if(X)for(let j=0;j<6;j++)Ve(x.__webglFramebuffer[j],C,j);else{let j=C.texture.mipmaps;j&&j.length>0?Ve(x.__webglFramebuffer[0],C,0):Ve(x.__webglFramebuffer,C,0)}else if(X){x.__webglDepthbuffer=[];for(let j=0;j<6;j++)if(e.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[j]),x.__webglDepthbuffer[j]===void 0)x.__webglDepthbuffer[j]=i.createRenderbuffer(),Gt(x.__webglDepthbuffer[j],C,!1);else{let tt=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,dt=x.__webglDepthbuffer[j];i.bindRenderbuffer(i.RENDERBUFFER,dt),i.framebufferRenderbuffer(i.FRAMEBUFFER,tt,i.RENDERBUFFER,dt)}}else{let j=C.texture.mipmaps;if(j&&j.length>0?e.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer===void 0)x.__webglDepthbuffer=i.createRenderbuffer(),Gt(x.__webglDepthbuffer,C,!1);else{let tt=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,dt=x.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,dt),i.framebufferRenderbuffer(i.FRAMEBUFFER,tt,i.RENDERBUFFER,dt)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function le(C,x,X){let j=n.get(C);x!==void 0&&ht(j.__webglFramebuffer,C,C.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),X!==void 0&&ee(C)}function ve(C){let x=C.texture,X=n.get(C),j=n.get(x);C.addEventListener("dispose",y);let tt=C.textures,dt=C.isWebGLCubeRenderTarget===!0,pt=tt.length>1;if(pt||(j.__webglTexture===void 0&&(j.__webglTexture=i.createTexture()),j.__version=x.version,o.memory.textures++),dt){X.__webglFramebuffer=[];for(let et=0;et<6;et++)if(x.mipmaps&&x.mipmaps.length>0){X.__webglFramebuffer[et]=[];for(let st=0;st<x.mipmaps.length;st++)X.__webglFramebuffer[et][st]=i.createFramebuffer()}else X.__webglFramebuffer[et]=i.createFramebuffer()}else{if(x.mipmaps&&x.mipmaps.length>0){X.__webglFramebuffer=[];for(let et=0;et<x.mipmaps.length;et++)X.__webglFramebuffer[et]=i.createFramebuffer()}else X.__webglFramebuffer=i.createFramebuffer();if(pt)for(let et=0,st=tt.length;et<st;et++){let gt=n.get(tt[et]);gt.__webglTexture===void 0&&(gt.__webglTexture=i.createTexture(),o.memory.textures++)}if(C.samples>0&&ke(C)===!1){X.__webglMultisampledFramebuffer=i.createFramebuffer(),X.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,X.__webglMultisampledFramebuffer);for(let et=0;et<tt.length;et++){let st=tt[et];X.__webglColorRenderbuffer[et]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,X.__webglColorRenderbuffer[et]);let gt=r.convert(st.format,st.colorSpace),Ot=r.convert(st.type),vt=_(st.internalFormat,gt,Ot,st.normalized,st.colorSpace,C.isXRRenderTarget===!0),bt=Oe(C);i.renderbufferStorageMultisample(i.RENDERBUFFER,bt,vt,C.width,C.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+et,i.RENDERBUFFER,X.__webglColorRenderbuffer[et])}i.bindRenderbuffer(i.RENDERBUFFER,null),C.depthBuffer&&(X.__webglDepthRenderbuffer=i.createRenderbuffer(),Gt(X.__webglDepthRenderbuffer,C,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(dt){e.bindTexture(i.TEXTURE_CUBE_MAP,j.__webglTexture),It(i.TEXTURE_CUBE_MAP,x);for(let et=0;et<6;et++)if(x.mipmaps&&x.mipmaps.length>0)for(let st=0;st<x.mipmaps.length;st++)ht(X.__webglFramebuffer[et][st],C,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+et,st);else ht(X.__webglFramebuffer[et],C,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+et,0);m(x)&&M(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(pt){for(let et=0,st=tt.length;et<st;et++){let gt=tt[et],Ot=n.get(gt),vt=i.TEXTURE_2D;(C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(vt=C.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(vt,Ot.__webglTexture),It(vt,gt),ht(X.__webglFramebuffer,C,gt,i.COLOR_ATTACHMENT0+et,vt,0),m(gt)&&M(vt)}e.unbindTexture()}else{let et=i.TEXTURE_2D;if((C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(et=C.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(et,j.__webglTexture),It(et,x),x.mipmaps&&x.mipmaps.length>0)for(let st=0;st<x.mipmaps.length;st++)ht(X.__webglFramebuffer[st],C,x,i.COLOR_ATTACHMENT0,et,st);else ht(X.__webglFramebuffer,C,x,i.COLOR_ATTACHMENT0,et,0);m(x)&&M(et),e.unbindTexture()}C.depthBuffer&&ee(C)}function re(C){let x=C.textures;for(let X=0,j=x.length;X<j;X++){let tt=x[X];if(m(tt)){let dt=w(C),pt=n.get(tt).__webglTexture;e.bindTexture(dt,pt),M(dt),e.unbindTexture()}}}let Ce=[],je=[];function mn(C){if(C.samples>0){if(ke(C)===!1){let x=C.textures,X=C.width,j=C.height,tt=i.COLOR_BUFFER_BIT,dt=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,pt=n.get(C),et=x.length>1;if(et)for(let gt=0;gt<x.length;gt++)e.bindFramebuffer(i.FRAMEBUFFER,pt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+gt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,pt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+gt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,pt.__webglMultisampledFramebuffer);let st=C.texture.mipmaps;st&&st.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,pt.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,pt.__webglFramebuffer);for(let gt=0;gt<x.length;gt++){if(C.resolveDepthBuffer&&(C.depthBuffer&&(tt|=i.DEPTH_BUFFER_BIT),C.stencilBuffer&&C.resolveStencilBuffer&&(tt|=i.STENCIL_BUFFER_BIT)),et){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,pt.__webglColorRenderbuffer[gt]);let Ot=n.get(x[gt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Ot,0)}i.blitFramebuffer(0,0,X,j,0,0,X,j,tt,i.NEAREST),c===!0&&(Ce.length=0,je.length=0,Ce.push(i.COLOR_ATTACHMENT0+gt),C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&(Ce.push(dt),je.push(dt),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,je)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Ce))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),et)for(let gt=0;gt<x.length;gt++){e.bindFramebuffer(i.FRAMEBUFFER,pt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+gt,i.RENDERBUFFER,pt.__webglColorRenderbuffer[gt]);let Ot=n.get(x[gt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,pt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+gt,i.TEXTURE_2D,Ot,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,pt.__webglMultisampledFramebuffer)}else if(C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&c){let x=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[x])}}}function Oe(C){return Math.min(s.maxSamples,C.samples)}function ke(C){let x=n.get(C);return C.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function z(C){let x=o.render.frame;h.get(C)!==x&&(h.set(C,x),C.update())}function an(C,x){let X=C.colorSpace,j=C.format,tt=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||X!==$o&&X!==Ji&&(ce.getTransfer(X)===xe?(j!==oi||tt!==Hn)&&Xt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Zt("WebGLTextures: Unsupported texture color space:",X)),x}function me(C){return typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement?(l.width=C.naturalWidth||C.width,l.height=C.naturalHeight||C.height):typeof VideoFrame<"u"&&C instanceof VideoFrame?(l.width=C.displayWidth,l.height=C.displayHeight):(l.width=C.width,l.height=C.height),l}this.allocateTextureUnit=U,this.resetTextureUnits=V,this.getTextureUnits=O,this.setTextureUnits=H,this.setTexture2D=K,this.setTexture2DArray=G,this.setTexture3D=D,this.setTextureCube=Z,this.rebindTextures=le,this.setupRenderTarget=ve,this.updateRenderTargetMipmap=re,this.updateMultisampleRenderTarget=mn,this.setupDepthRenderbuffer=ee,this.setupFrameBufferTexture=ht,this.useMultisampledRTT=ke,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function rw(i,t){function e(n,s=Ji){let r,o=ce.getTransfer(s);if(n===Hn)return i.UNSIGNED_BYTE;if(n===kc)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Hc)return i.UNSIGNED_SHORT_5_5_5_1;if(n===tf)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===ef)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Ju)return i.BYTE;if(n===Qu)return i.SHORT;if(n===lo)return i.UNSIGNED_SHORT;if(n===Vc)return i.INT;if(n===vi)return i.UNSIGNED_INT;if(n===Si)return i.FLOAT;if(n===Mi)return i.HALF_FLOAT;if(n===nf)return i.ALPHA;if(n===sf)return i.RGB;if(n===oi)return i.RGBA;if(n===Pi)return i.DEPTH_COMPONENT;if(n===Rs)return i.DEPTH_STENCIL;if(n===rf)return i.RED;if(n===Gc)return i.RED_INTEGER;if(n===Cs)return i.RG;if(n===Wc)return i.RG_INTEGER;if(n===Xc)return i.RGBA_INTEGER;if(n===Na||n===Oa||n===Ua||n===Fa)if(o===xe)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Na)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Oa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Ua)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Fa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Na)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Oa)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Ua)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Fa)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===qc||n===Yc||n===Zc||n===$c)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===qc)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Yc)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Zc)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===$c)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===jc||n===Kc||n===Jc||n===Qc||n===th||n===Ba||n===eh)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===jc||n===Kc)return o===xe?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Jc)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===Qc)return r.COMPRESSED_R11_EAC;if(n===th)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Ba)return r.COMPRESSED_RG11_EAC;if(n===eh)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===nh||n===ih||n===sh||n===rh||n===oh||n===ah||n===lh||n===ch||n===hh||n===dh||n===uh||n===fh||n===ph||n===mh)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===nh)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===ih)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===sh)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===rh)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===oh)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===ah)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===lh)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===ch)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===hh)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===dh)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===uh)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===fh)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===ph)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===mh)return o===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===gh||n===_h||n===bh)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===gh)return o===xe?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===_h)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===bh)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===xh||n===yh||n===za||n===vh)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===xh)return r.COMPRESSED_RED_RGTC1_EXT;if(n===yh)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===za)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===vh)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===co?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var ow=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,aw=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Lf=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new la(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new xn({vertexShader:ow,fragmentShader:aw,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Re(new _a(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Df=class extends _i{constructor(t,e){super();let n=this,s=null,r=1,o=null,a="local-floor",c=1,l=null,h=null,u=null,d=null,f=null,p=null,b=typeof XRWebGLBinding<"u",g=new Lf,m={},M=e.getContextAttributes(),w=null,_=null,E=[],T=[],I=new ut,y=null,A=null,L=new dn;L.viewport=new ye;let N=new dn;N.viewport=new ye;let k=[L,N],V=new Nc,O=null,H=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function($){let nt=E[$];return nt===void 0&&(nt=new Qr,E[$]=nt),nt.getTargetRaySpace()},this.getControllerGrip=function($){let nt=E[$];return nt===void 0&&(nt=new Qr,E[$]=nt),nt.getGripSpace()},this.getHand=function($){let nt=E[$];return nt===void 0&&(nt=new Qr,E[$]=nt),nt.getHandSpace()};function U($){let nt=T.indexOf($.inputSource);if(nt===-1)return;let mt=E[nt];mt!==void 0&&(mt.update($.inputSource,$.frame,l||o),mt.dispatchEvent({type:$.type,data:$.inputSource}))}function W(){s.removeEventListener("select",U),s.removeEventListener("selectstart",U),s.removeEventListener("selectend",U),s.removeEventListener("squeeze",U),s.removeEventListener("squeezestart",U),s.removeEventListener("squeezeend",U),s.removeEventListener("end",W),s.removeEventListener("inputsourceschange",K);for(let $=0;$<E.length;$++){let nt=T[$];nt!==null&&(T[$]=null,E[$].disconnect(nt))}O=null,H=null,g.reset();for(let $ in m)delete m[$];if(t.setRenderTarget(w),f=null,d=null,u=null,s=null,_=null,Ht.stop(),n.isPresenting=!1,t.setPixelRatio(y),t.setSize(I.width,I.height,!1),A!==null){let $=A.camera;$.fov=A.fov,$.zoom=A.zoom,$.updateProjectionMatrix(),A=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function($){r=$,n.isPresenting===!0&&Xt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function($){a=$,n.isPresenting===!0&&Xt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function($){l=$},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u===null&&b&&(u=new XRWebGLBinding(s,e)),u},this.getFrame=function(){return p},this.getSession=function(){return s},this.setSession=async function($){if(s=$,s!==null){if(w=t.getRenderTarget(),s.addEventListener("select",U),s.addEventListener("selectstart",U),s.addEventListener("selectend",U),s.addEventListener("squeeze",U),s.addEventListener("squeezestart",U),s.addEventListener("squeezeend",U),s.addEventListener("end",W),s.addEventListener("inputsourceschange",K),M.xrCompatible!==!0&&await e.makeXRCompatible(),y=t.getPixelRatio(),t.getSize(I),b&&"createProjectionLayer"in XRWebGLBinding.prototype){let mt=null,Tt=null,ht=null;M.depth&&(ht=M.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,mt=M.stencil?Rs:Pi,Tt=M.stencil?co:vi);let Gt={colorFormat:e.RGBA8,depthFormat:ht,scaleFactor:r};u=this.getBinding(),d=u.createProjectionLayer(Gt),s.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),_=new zn(d.textureWidth,d.textureHeight,{format:oi,type:Hn,depthTexture:new vs(d.textureWidth,d.textureHeight,Tt,void 0,void 0,void 0,void 0,void 0,void 0,mt),stencilBuffer:M.stencil,colorSpace:t.outputColorSpace,samples:M.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{let mt={antialias:M.antialias,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,e,mt),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),_=new zn(f.framebufferWidth,f.framebufferHeight,{format:oi,type:Hn,colorSpace:t.outputColorSpace,stencilBuffer:M.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}_.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await s.requestReferenceSpace(a),Ht.setContext(s),Ht.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function K($){for(let nt=0;nt<$.removed.length;nt++){let mt=$.removed[nt],Tt=T.indexOf(mt);Tt>=0&&(T[Tt]=null,E[Tt].disconnect(mt))}for(let nt=0;nt<$.added.length;nt++){let mt=$.added[nt],Tt=T.indexOf(mt);if(Tt===-1){for(let Gt=0;Gt<E.length;Gt++)if(Gt>=T.length){T.push(mt),Tt=Gt;break}else if(T[Gt]===null){T[Gt]=mt,Tt=Gt;break}if(Tt===-1)break}let ht=E[Tt];ht&&ht.connect(mt)}}let G=new R,D=new R;function Z($,nt,mt){G.setFromMatrixPosition(nt.matrixWorld),D.setFromMatrixPosition(mt.matrixWorld);let Tt=G.distanceTo(D),ht=nt.projectionMatrix.elements,Gt=mt.projectionMatrix.elements,Ve=ht[14]/(ht[10]-1),ee=ht[14]/(ht[10]+1),le=(ht[9]+1)/ht[5],ve=(ht[9]-1)/ht[5],re=(ht[8]-1)/ht[0],Ce=(Gt[8]+1)/Gt[0],je=Ve*re,mn=Ve*Ce,Oe=Tt/(-re+Ce),ke=Oe*-re;if(nt.matrixWorld.decompose($.position,$.quaternion,$.scale),$.translateX(ke),$.translateZ(Oe),$.matrixWorld.compose($.position,$.quaternion,$.scale),$.matrixWorldInverse.copy($.matrixWorld).invert(),ht[10]===-1)$.projectionMatrix.copy(nt.projectionMatrix),$.projectionMatrixInverse.copy(nt.projectionMatrixInverse);else{let z=Ve+Oe,an=ee+Oe,me=je-ke,C=mn+(Tt-ke),x=le*ee/an*z,X=ve*ee/an*z;$.projectionMatrix.makePerspective(me,C,x,X,z,an),$.projectionMatrixInverse.copy($.projectionMatrix).invert()}}function ct($,nt){nt===null?$.matrixWorld.copy($.matrix):$.matrixWorld.multiplyMatrices(nt.matrixWorld,$.matrix),$.matrixWorldInverse.copy($.matrixWorld).invert()}this.updateCamera=function($){if(s===null)return;let nt=$.near,mt=$.far;g.texture!==null&&(g.depthNear>0&&(nt=g.depthNear),g.depthFar>0&&(mt=g.depthFar)),V.near=N.near=L.near=nt,V.far=N.far=L.far=mt,(O!==V.near||H!==V.far)&&(s.updateRenderState({depthNear:V.near,depthFar:V.far}),O=V.near,H=V.far),V.layers.mask=$.layers.mask|6,L.layers.mask=V.layers.mask&-5,N.layers.mask=V.layers.mask&-3;let Tt=$.parent,ht=V.cameras;ct(V,Tt);for(let Gt=0;Gt<ht.length;Gt++)ct(ht[Gt],Tt);ht.length===2?Z(V,L,N):V.projectionMatrix.copy(L.projectionMatrix),A===null&&$.isPerspectiveCamera&&(A={camera:$,fov:$.fov,zoom:$.zoom}),Mt($,V,Tt)};function Mt($,nt,mt){mt===null?$.matrix.copy(nt.matrixWorld):($.matrix.copy(mt.matrixWorld),$.matrix.invert(),$.matrix.multiply(nt.matrixWorld)),$.matrix.decompose($.position,$.quaternion,$.scale),$.updateMatrixWorld(!0),$.projectionMatrix.copy(nt.projectionMatrix),$.projectionMatrixInverse.copy(nt.projectionMatrixInverse),$.isPerspectiveCamera&&($.fov=jr*2*Math.atan(1/$.projectionMatrix.elements[5]),$.zoom=1)}this.getCamera=function(){return V},this.getFoveation=function(){if(!(d===null&&f===null))return c},this.setFoveation=function($){c=$,d!==null&&(d.fixedFoveation=$),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=$)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(V)},this.getCameraTexture=function($){return m[$]};let Wt=null;function It($,nt){if(h=nt.getViewerPose(l||o),p=nt,h!==null){let mt=h.views;f!==null&&(t.setRenderTargetFramebuffer(_,f.framebuffer),t.setRenderTarget(_));let Tt=!1;mt.length!==V.cameras.length&&(V.cameras.length=0,Tt=!0);for(let ee=0;ee<mt.length;ee++){let le=mt[ee],ve=null;if(f!==null)ve=f.getViewport(le);else{let Ce=u.getViewSubImage(d,le);ve=Ce.viewport,ee===0&&(t.setRenderTargetTextures(_,Ce.colorTexture,Ce.depthStencilTexture),t.setRenderTarget(_))}let re=k[ee];re===void 0&&(re=new dn,re.layers.enable(ee),re.viewport=new ye,k[ee]=re),re.matrix.fromArray(le.transform.matrix),re.matrix.decompose(re.position,re.quaternion,re.scale),re.projectionMatrix.fromArray(le.projectionMatrix),re.projectionMatrixInverse.copy(re.projectionMatrix).invert(),re.viewport.set(ve.x,ve.y,ve.width,ve.height),ee===0&&(V.matrix.copy(re.matrix),V.matrix.decompose(V.position,V.quaternion,V.scale)),Tt===!0&&V.cameras.push(re)}let ht=s.enabledFeatures;if(ht&&ht.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&b){u=n.getBinding();let ee=u.getDepthInformation(mt[0]);ee&&ee.isValid&&ee.texture&&g.init(ee,s.renderState)}if(ht&&ht.includes("camera-access")&&b){t.state.unbindTexture(),u=n.getBinding();for(let ee=0;ee<mt.length;ee++){let le=mt[ee].camera;if(le){let ve=m[le];ve||(ve=new la,m[le]=ve);let re=u.getCameraImage(le);ve.sourceTexture=re}}}}for(let mt=0;mt<E.length;mt++){let Tt=T[mt],ht=E[mt];Tt!==null&&ht!==void 0&&ht.update(Tt,nt,l||o)}Wt&&Wt($,nt),nt.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:nt}),p=null}let Ht=new Mg;Ht.setAnimationLoop(It),this.setAnimationLoop=function($){Wt=$},this.dispose=function(){}}},lw=new jt,Rg=new Kt;Rg.set(-1,0,0,0,1,0,0,0,1);function cw(i,t){function e(g,m){g.matrixAutoUpdate===!0&&g.updateMatrix(),m.value.copy(g.matrix)}function n(g,m){m.color.getRGB(g.fogColor.value,hf(i)),m.isFog?(g.fogNear.value=m.near,g.fogFar.value=m.far):m.isFogExp2&&(g.fogDensity.value=m.density)}function s(g,m,M,w,_){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?r(g,m):m.isMeshLambertMaterial?(r(g,m),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(r(g,m),u(g,m)):m.isMeshPhongMaterial?(r(g,m),h(g,m),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(r(g,m),d(g,m),m.isMeshPhysicalMaterial&&f(g,m,_)):m.isMeshMatcapMaterial?(r(g,m),p(g,m)):m.isMeshDepthMaterial?r(g,m):m.isMeshDistanceMaterial?(r(g,m),b(g,m)):m.isMeshNormalMaterial?r(g,m):m.isLineBasicMaterial?(o(g,m),m.isLineDashedMaterial&&a(g,m)):m.isPointsMaterial?c(g,m,M,w):m.isSpriteMaterial?l(g,m):m.isShadowMaterial?(g.color.value.copy(m.color),g.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(g,m){g.opacity.value=m.opacity,m.color&&g.diffuse.value.copy(m.color),m.emissive&&g.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(g.map.value=m.map,e(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.bumpMap&&(g.bumpMap.value=m.bumpMap,e(m.bumpMap,g.bumpMapTransform),g.bumpScale.value=m.bumpScale,m.side===Nn&&(g.bumpScale.value*=-1)),m.normalMap&&(g.normalMap.value=m.normalMap,e(m.normalMap,g.normalMapTransform),g.normalScale.value.copy(m.normalScale),m.side===Nn&&g.normalScale.value.negate()),m.displacementMap&&(g.displacementMap.value=m.displacementMap,e(m.displacementMap,g.displacementMapTransform),g.displacementScale.value=m.displacementScale,g.displacementBias.value=m.displacementBias),m.emissiveMap&&(g.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,g.emissiveMapTransform)),m.specularMap&&(g.specularMap.value=m.specularMap,e(m.specularMap,g.specularMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest);let M=t.get(m),w=M.envMap,_=M.envMapRotation;w&&(g.envMap.value=w,g.envMapRotation.value.setFromMatrix4(lw.makeRotationFromEuler(_)).transpose(),w.isCubeTexture&&w.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(Rg),g.reflectivity.value=m.reflectivity,g.ior.value=m.ior,g.refractionRatio.value=m.refractionRatio),m.lightMap&&(g.lightMap.value=m.lightMap,g.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,g.lightMapTransform)),m.aoMap&&(g.aoMap.value=m.aoMap,g.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,g.aoMapTransform))}function o(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,m.map&&(g.map.value=m.map,e(m.map,g.mapTransform))}function a(g,m){g.dashSize.value=m.dashSize,g.totalSize.value=m.dashSize+m.gapSize,g.scale.value=m.scale}function c(g,m,M,w){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.size.value=m.size*M,g.scale.value=w*.5,m.map&&(g.map.value=m.map,e(m.map,g.uvTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function l(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.rotation.value=m.rotation,m.map&&(g.map.value=m.map,e(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function h(g,m){g.specular.value.copy(m.specular),g.shininess.value=Math.max(m.shininess,1e-4)}function u(g,m){m.gradientMap&&(g.gradientMap.value=m.gradientMap)}function d(g,m){g.metalness.value=m.metalness,m.metalnessMap&&(g.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,g.metalnessMapTransform)),g.roughness.value=m.roughness,m.roughnessMap&&(g.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,g.roughnessMapTransform)),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)}function f(g,m,M){g.ior.value=m.ior,m.sheen>0&&(g.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),g.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(g.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,g.sheenColorMapTransform)),m.sheenRoughnessMap&&(g.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,g.sheenRoughnessMapTransform))),m.clearcoat>0&&(g.clearcoat.value=m.clearcoat,g.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(g.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,g.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(g.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===Nn&&g.clearcoatNormalScale.value.negate())),m.dispersion>0&&(g.dispersion.value=m.dispersion),m.retroreflectivity>0&&(g.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(g.iridescence.value=m.iridescence,g.iridescenceIOR.value=m.iridescenceIOR,g.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(g.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,g.iridescenceMapTransform)),m.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),m.transmission>0&&(g.transmission.value=m.transmission,g.transmissionSamplerMap.value=M.texture,g.transmissionSamplerSize.value.set(M.width,M.height),m.transmissionMap&&(g.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,g.transmissionMapTransform)),g.thickness.value=m.thickness,m.thicknessMap&&(g.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=m.attenuationDistance,g.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(g.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(g.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=m.specularIntensity,g.specularColor.value.copy(m.specularColor),m.specularColorMap&&(g.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,g.specularColorMapTransform)),m.specularIntensityMap&&(g.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,g.specularIntensityMapTransform))}function p(g,m){m.matcap&&(g.matcap.value=m.matcap)}function b(g,m){let M=t.get(m).light;g.referencePosition.value.setFromMatrixPosition(M.matrixWorld),g.nearDistance.value=M.shadow.camera.near,g.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function hw(i,t,e,n){let s={},r={},o=[],a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(_,E){let T=E.program;n.uniformBlockBinding(_,T)}function l(_,E){let T=s[_.id];T===void 0&&(g(_),T=h(_),s[_.id]=T,_.addEventListener("dispose",M));let I=E.program;n.updateUBOMapping(_,I);let y=t.render.frame;r[_.id]!==y&&(d(_),r[_.id]=y)}function h(_){let E=u();_.__bindingPointIndex=E;let T=i.createBuffer(),I=_.__size,y=_.usage;return i.bindBuffer(i.UNIFORM_BUFFER,T),i.bufferData(i.UNIFORM_BUFFER,I,y),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,E,T),T}function u(){for(let _=0;_<a;_++)if(o.indexOf(_)===-1)return o.push(_),_;return Zt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(_){let E=s[_.id],T=_.uniforms,I=_.__cache;i.bindBuffer(i.UNIFORM_BUFFER,E);for(let y=0,A=T.length;y<A;y++){let L=T[y];if(Array.isArray(L))for(let N=0,k=L.length;N<k;N++)f(L[N],y,N,I);else f(L,y,0,I)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(_,E,T,I){if(b(_,E,T,I)===!0){let y=_.__offset,A=_.value;if(Array.isArray(A)){let L=0;for(let N=0;N<A.length;N++){let k=A[N],V=m(k);p(k,_.__data,L),typeof k!="number"&&typeof k!="boolean"&&!k.isMatrix3&&!ArrayBuffer.isView(k)&&(L+=V.storage/Float32Array.BYTES_PER_ELEMENT)}}else p(A,_.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,y,_.__data)}}function p(_,E,T){typeof _=="number"||typeof _=="boolean"?E[0]=_:_.isMatrix3?(E[0]=_.elements[0],E[1]=_.elements[1],E[2]=_.elements[2],E[3]=0,E[4]=_.elements[3],E[5]=_.elements[4],E[6]=_.elements[5],E[7]=0,E[8]=_.elements[6],E[9]=_.elements[7],E[10]=_.elements[8],E[11]=0):ArrayBuffer.isView(_)?E.set(new _.constructor(_.buffer,_.byteOffset,E.length)):_.toArray(E,T)}function b(_,E,T,I){let y=_.value,A=E+"_"+T;if(I[A]===void 0)return typeof y=="number"||typeof y=="boolean"?I[A]=y:ArrayBuffer.isView(y)?I[A]=y.slice():I[A]=y.clone(),!0;{let L=I[A];if(typeof y=="number"||typeof y=="boolean"){if(L!==y)return I[A]=y,!0}else{if(ArrayBuffer.isView(y))return!0;if(L.equals(y)===!1)return L.copy(y),!0}}return!1}function g(_){let E=_.uniforms,T=0,I=16;for(let A=0,L=E.length;A<L;A++){let N=Array.isArray(E[A])?E[A]:[E[A]];for(let k=0,V=N.length;k<V;k++){let O=N[k],H=Array.isArray(O.value)?O.value:[O.value];for(let U=0,W=H.length;U<W;U++){let K=H[U],G=m(K),D=T%I,Z=D%G.boundary,ct=D+Z;T+=Z,ct!==0&&I-ct<G.storage&&(T+=I-ct),O.__data=new Float32Array(G.storage/Float32Array.BYTES_PER_ELEMENT),O.__offset=T,T+=G.storage}}}let y=T%I;return y>0&&(T+=I-y),_.__size=T,_.__cache={},this}function m(_){let E={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(E.boundary=4,E.storage=4):_.isVector2?(E.boundary=8,E.storage=8):_.isVector3||_.isColor?(E.boundary=16,E.storage=12):_.isVector4?(E.boundary=16,E.storage=16):_.isMatrix3?(E.boundary=48,E.storage=48):_.isMatrix4?(E.boundary=64,E.storage=64):_.isTexture?Xt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(_)?(E.boundary=16,E.storage=_.byteLength):Xt("WebGLRenderer: Unsupported uniform value type.",_),E}function M(_){let E=_.target;E.removeEventListener("dispose",M);let T=o.indexOf(E.__bindingPointIndex);o.splice(T,1),i.deleteBuffer(s[E.id]),delete s[E.id],delete r[E.id]}function w(){for(let _ in s)i.deleteBuffer(s[_]);o=[],s={},r={}}return{bind:c,update:l,dispose:w}}var dw=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Oi=null;function uw(){return Oi===null&&(Oi=new lc(dw,16,16,Cs,Mi),Oi.name="DFG_LUT",Oi.minFilter=bn,Oi.magFilter=bn,Oi.wrapS=Ri,Oi.wrapT=Ri,Oi.generateMipmaps=!1,Oi.needsUpdate=!0),Oi}var Ih=class{constructor(t={}){let{canvas:e=Xm(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=Hn}=t;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=n.getContextAttributes().alpha}else p=o;let b=f,g=new Set([Xc,Wc,Gc]),m=new Set([Hn,vi,lo,co,kc,Hc]),M=new Uint32Array(4),w=new Int32Array(4),_=new R,E=null,T=null,I=[],y=[],A=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=yi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let L=this,N=!1,k=null,V=null,O=null,H=null;this._outputColorSpace=_n;let U=0,W=0,K=null,G=-1,D=null,Z=new ye,ct=new ye,Mt=null,Wt=new kt(0),It=0,Ht=e.width,$=e.height,nt=1,mt=null,Tt=null,ht=new ye(0,0,Ht,$),Gt=new ye(0,0,Ht,$),Ve=!1,ee=new Cn,le=!1,ve=!1,re=new jt,Ce=new R,je=new ye,mn={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Oe=!1;function ke(){return K===null?nt:1}let z=n;function an(S,F){return e.getContext(S,F)}let me,C,x,X,j,tt,dt,pt,et,st,gt,Ot,vt,bt,Ut,Vt,Qt,B,_t,it,xt,wt,at;try{let S={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${Uc}`),e.addEventListener("webglcontextlost",Ae,!1),e.addEventListener("webglcontextrestored",ue,!1),e.addEventListener("webglcontextcreationerror",ie,!1),z===null){let F="webgl2";if(z=an(F,S),z===null)throw an(F)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Ft()}catch(S){throw e.removeEventListener("webglcontextlost",Ae,!1),e.removeEventListener("webglcontextrestored",ue,!1),e.removeEventListener("webglcontextcreationerror",ie,!1),Zt("WebGLRenderer: "+S.message),S}function Ft(){me=new xS(z),me.init(),xt=new rw(z,me),C=new cS(z,me,t,xt),x=new iw(z,me),C.reversedDepthBuffer&&d&&x.buffers.depth.setReversed(!0),V=z.createFramebuffer(),O=z.createFramebuffer(),H=z.createFramebuffer(),X=new SS(z),j=new GM,tt=new sw(z,me,x,j,C,xt,X),dt=new bS(L),pt=new wx(z),wt=new aS(z,pt),et=new yS(z,pt,X,wt),st=new wS(z,et,pt,wt,X),B=new MS(z,C,tt),Ut=new hS(j),gt=new HM(L,dt,me,C,wt,Ut),Ot=new cw(L,j),vt=new XM,bt=new KM(me),Qt=new oS(L,dt,x,st,p,c),Vt=new nw(L,st,C),at=new hw(z,X,C,x),_t=new lS(z,me,X),it=new vS(z,me,X),X.programs=gt.programs,L.capabilities=C,L.extensions=me,L.properties=j,L.renderLists=vt,L.shadowMap=Vt,L.state=x,L.info=X}b!==Hn&&(A=new TS(b,e.width,e.height,a,s,r));let Dt=new Df(L,z);this.xr=Dt,this.getContext=function(){return z},this.getContextAttributes=function(){return z.getContextAttributes()},this.forceContextLoss=function(){let S=me.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){let S=me.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return nt},this.setPixelRatio=function(S){S!==void 0&&(nt=S,this.setSize(Ht,$,!1))},this.getSize=function(S){return S.set(Ht,$)},this.setSize=function(S,F,J=!0){if(Dt.isPresenting){Xt("WebGLRenderer: Can't change size while VR device is presenting.");return}Ht=S,$=F,e.width=Math.floor(S*nt),e.height=Math.floor(F*nt),J===!0&&(e.style.width=S+"px",e.style.height=F+"px"),A!==null&&A.setSize(e.width,e.height),this.setViewport(0,0,S,F)},this.getDrawingBufferSize=function(S){return S.set(Ht*nt,$*nt).floor()},this.setDrawingBufferSize=function(S,F,J){Ht=S,$=F,nt=J,e.width=Math.floor(S*J),e.height=Math.floor(F*J),this.setViewport(0,0,S,F)},this.setEffects=function(S){if(b===Hn){Zt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(S){for(let F=0;F<S.length;F++)if(S[F].isOutputPass===!0){Xt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}A.setEffects(S||[])},this.getCurrentViewport=function(S){return S.copy(Z)},this.getViewport=function(S){return S.copy(ht)},this.setViewport=function(S,F,J,q){S.isVector4?ht.set(S.x,S.y,S.z,S.w):ht.set(S,F,J,q),x.viewport(Z.copy(ht).multiplyScalar(nt).round())},this.getScissor=function(S){return S.copy(Gt)},this.setScissor=function(S,F,J,q){S.isVector4?Gt.set(S.x,S.y,S.z,S.w):Gt.set(S,F,J,q),x.scissor(ct.copy(Gt).multiplyScalar(nt).round())},this.getScissorTest=function(){return Ve},this.setScissorTest=function(S){x.setScissorTest(Ve=S)},this.setOpaqueSort=function(S){mt=S},this.setTransparentSort=function(S){Tt=S},this.getClearColor=function(S){return S.copy(Qt.getClearColor())},this.setClearColor=function(){Qt.setClearColor(...arguments)},this.getClearAlpha=function(){return Qt.getClearAlpha()},this.setClearAlpha=function(){Qt.setClearAlpha(...arguments)},this.clear=function(S=!0,F=!0,J=!0){let q=0;if(S){let Y=!1;if(K!==null){let yt=K.texture.format;Y=g.has(yt)}if(Y){let yt=K.texture.type,At=m.has(yt),St=Qt.getClearColor(),Ct=Qt.getClearAlpha(),Nt=St.r,ne=St.g,oe=St.b;At?(M[0]=Nt,M[1]=ne,M[2]=oe,M[3]=Ct,z.clearBufferuiv(z.COLOR,0,M)):(w[0]=Nt,w[1]=ne,w[2]=oe,w[3]=Ct,z.clearBufferiv(z.COLOR,0,w))}else q|=z.COLOR_BUFFER_BIT}F&&(q|=z.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),J&&(q|=z.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),q!==0&&z.clear(q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(S){S.setRenderer(this),k=S},this.dispose=function(){e.removeEventListener("webglcontextlost",Ae,!1),e.removeEventListener("webglcontextrestored",ue,!1),e.removeEventListener("webglcontextcreationerror",ie,!1),Qt.dispose(),vt.dispose(),bt.dispose(),j.dispose(),dt.dispose(),st.dispose(),wt.dispose(),at.dispose(),gt.dispose(),Dt.dispose(),Dt.removeEventListener("sessionstart",Hs),Dt.removeEventListener("sessionend",Do),Ei.stop()};function Ae(S){S.preventDefault(),Jo("WebGLRenderer: Context Lost."),N=!0}function ue(){Jo("WebGLRenderer: Context Restored."),N=!1;let S=X.autoReset,F=Vt.enabled,J=Vt.autoUpdate,q=Vt.needsUpdate,Y=Vt.type;Ft(),X.autoReset=S,Vt.enabled=F,Vt.autoUpdate=J,Vt.needsUpdate=q,Vt.type=Y}function ie(S){Zt("WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function Fn(S){let F=S.target;F.removeEventListener("dispose",Fn),Po(F)}function Po(S){Mr(S),j.remove(S)}function Mr(S){let F=j.get(S).programs;F!==void 0&&(F.forEach(function(J){gt.releaseProgram(J)}),S.isShaderMaterial&&gt.releaseShaderCache(S))}this.renderBufferDirect=function(S,F,J,q,Y,yt){F===null&&(F=mn);let At=Y.isMesh&&Y.matrixWorld.determinantAffine()<0,St=Kd(S,F,J,q,Y);x.setMaterial(q,At);let Ct=J.index,Nt=1;if(q.wireframe===!0){if(Ct=et.getWireframeAttribute(J),Ct===void 0)return;Nt=2}let ne=J.drawRange,oe=J.attributes.position,Pt=ne.start*Nt,fe=(ne.start+ne.count)*Nt;yt!==null&&(Pt=Math.max(Pt,yt.start*Nt),fe=Math.min(fe,(yt.start+yt.count)*Nt)),Ct!==null?(Pt=Math.max(Pt,0),fe=Math.min(fe,Ct.count)):oe!=null&&(Pt=Math.max(Pt,0),fe=Math.min(fe,oe.count));let Xe=fe-Pt;if(Xe<0||Xe===1/0)return;wt.setup(Y,q,St,J,Ct);let Pe,ge=_t;if(Ct!==null&&(Pe=pt.get(Ct),ge=it,ge.setIndex(Pe)),Y.isMesh)q.wireframe===!0?(x.setLineWidth(q.wireframeLinewidth*ke()),ge.setMode(z.LINES)):ge.setMode(z.TRIANGLES);else if(Y.isLine){let ln=q.linewidth;ln===void 0&&(ln=1),x.setLineWidth(ln*ke()),Y.isLineSegments?ge.setMode(z.LINES):Y.isLineLoop?ge.setMode(z.LINE_LOOP):ge.setMode(z.LINE_STRIP)}else Y.isPoints?ge.setMode(z.POINTS):Y.isSprite&&ge.setMode(z.TRIANGLES);if(Y.isBatchedMesh)if(me.get("WEBGL_multi_draw"))ge.renderMultiDraw(Y._multiDrawStarts,Y._multiDrawCounts,Y._multiDrawCount);else{let ln=Y._multiDrawStarts,Et=Y._multiDrawCounts,tn=Y._multiDrawCount,ae=Ct?pt.get(Ct).bytesPerElement:1,gn=j.get(q).currentProgram.getUniforms();for(let Ln=0;Ln<tn;Ln++)gn.setValue(z,"_gl_DrawID",Ln),ge.render(ln[Ln]/ae,Et[Ln])}else if(Y.isInstancedMesh)ge.renderInstances(Pt,Xe,Y.count);else if(J.isInstancedBufferGeometry){let ln=J._maxInstanceCount!==void 0?J._maxInstanceCount:1/0,Et=Math.min(J.instanceCount,ln);ge.renderInstances(Pt,Xe,Et)}else ge.render(Pt,Xe)};function wr(S,F,J,q){k!==null&&S.isNodeMaterial&&k.setObject(q,S),le===!0&&Ut.setState(S,J,!1),S.transparent===!0&&S.side===kn&&S.forceSinglePass===!1?(S.side=Nn,S.needsUpdate=!0,Tr(S,F,q),S.side=ri,S.needsUpdate=!0,Tr(S,F,q),S.side=kn):Tr(S,F,q)}this.compile=function(S,F,J=null){J===null&&(J=S),k!==null&&k.renderStart(S,F,J),T=bt.get(J),T.init(F),y.push(T),J.traverseVisible(function(Y){Y.isLight&&Y.layers.test(F.layers)&&(T.pushLight(Y),Y.castShadow&&T.pushShadow(Y))}),S!==J&&S.traverseVisible(function(Y){Y.isLight&&Y.layers.test(F.layers)&&(T.pushLight(Y),Y.castShadow&&T.pushShadow(Y))}),T.setupLights(),k!==null&&k.updateLights(T.state.lightsArray),ve=this.localClippingEnabled,le=Ut.init(this.clippingPlanes,ve),le===!0&&Ut.setGlobalState(this.clippingPlanes,F),k!==null&&Vt.render(T.state.shadowsArray,J,F);let q=new Set;return S.traverse(function(Y){if(!(Y.isMesh||Y.isPoints||Y.isLine||Y.isSprite))return;let yt=Y.material;if(yt)if(Array.isArray(yt))for(let At=0;At<yt.length;At++){let St=yt[At];wr(St,J,F,Y),q.add(St)}else wr(yt,J,F,Y),q.add(yt)}),T=y.pop(),k!==null&&k.renderEnd(),q},this.compileAsync=function(S,F,J=null){let q=this.compile(S,F,J);return new Promise(Y=>{function yt(){if(q.forEach(function(At){let Ct=j.get(At).currentProgram;(Ct===void 0||Ct.isReady())&&q.delete(At)}),q.size===0){Y(S);return}setTimeout(yt,10)}me.get("KHR_parallel_shader_compile")!==null?yt():setTimeout(yt,10)})};let fs=null;function Lo(S){fs&&fs(S)}function Hs(){Ei.stop()}function Do(){Ei.start()}let Ei=new Mg;Ei.setAnimationLoop(Lo),typeof self<"u"&&Ei.setContext(self),this.setAnimationLoop=function(S){fs=S,Dt.setAnimationLoop(S),S===null?Ei.stop():Ei.start()},Dt.addEventListener("sessionstart",Hs),Dt.addEventListener("sessionend",Do),this.render=function(S,F){if(F!==void 0&&F.isCamera!==!0){Zt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(N===!0)return;k!==null&&k.renderStart(S,F);let J=Dt.enabled===!0&&Dt.isPresenting===!0,q=A!==null&&(K===null||J)&&A.begin(L,K);if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),F.parent===null&&F.matrixWorldAutoUpdate===!0&&F.updateMatrixWorld(),Dt.enabled===!0&&Dt.isPresenting===!0&&(A===null||A.isCompositing()===!1)&&(Dt.cameraAutoUpdate===!0&&Dt.updateCamera(F),F=Dt.getCamera()),S.isScene===!0&&S.onBeforeRender(L,S,F,K),T=bt.get(S,y.length),T.init(F),T.state.textureUnits=tt.getTextureUnits(),y.push(T),re.multiplyMatrices(F.projectionMatrix,F.matrixWorldInverse),ee.setFromProjectionMatrix(re,gi,F.reversedDepth),ve=this.localClippingEnabled,le=Ut.init(this.clippingPlanes,ve),E=vt.get(S,I.length),E.init(),I.push(E),Dt.enabled===!0&&Dt.isPresenting===!0){let At=L.xr.getDepthSensingMesh();At!==null&&Er(At,F,-1/0,L.sortObjects)}Er(S,F,0,L.sortObjects),E.finish(),k!==null&&k.updateLights(T.state.lightsArray),L.sortObjects===!0&&E.sort(mt,Tt),Oe=Dt.enabled===!1||Dt.isPresenting===!1||Dt.hasDepthSensing()===!1,Oe&&Qt.addToRenderList(E,S),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),le===!0&&Ut.beginShadows();let Y=T.state.shadowsArray;if(Vt.render(Y,S,F),le===!0&&Ut.endShadows(),(q&&A.hasRenderPass())===!1){let At=E.opaque,St=E.transmissive;if(T.setupLights(),F.isArrayCamera){let Ct=F.cameras;if(St.length>0)for(let Nt=0,ne=Ct.length;Nt<ne;Nt++){let oe=Ct[Nt];Oo(At,St,S,oe)}Oe&&Qt.render(S);for(let Nt=0,ne=Ct.length;Nt<ne;Nt++){let oe=Ct[Nt];No(E,S,oe,oe.viewport)}}else St.length>0&&Oo(At,St,S,F),Oe&&Qt.render(S),No(E,S,F)}K!==null&&W===0&&(tt.updateMultisampleRenderTarget(K),tt.updateRenderTargetMipmap(K)),q&&A.end(L),S.isScene===!0&&S.onAfterRender(L,S,F),wt.resetDefaultState(),G=-1,D=null,y.pop(),y.length>0?(T=y[y.length-1],tt.setTextureUnits(T.state.textureUnits),le===!0&&Ut.setGlobalState(L.clippingPlanes,T.state.camera)):T=null,I.pop(),I.length>0?E=I[I.length-1]:E=null,k!==null&&k.renderEnd()};function Er(S,F,J,q){if(S.visible===!1)return;if(S.layers.test(F.layers)){if(S.isGroup)J=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(F);else if(S.isLightProbeGrid)T.pushLightProbeGrid(S);else if(S.isLight)T.pushLight(S),S.castShadow&&T.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||S.intersectsFrustum(ee)){q&&je.setFromMatrixPosition(S.matrixWorld).applyMatrix4(re);let At=st.update(S),St=S.material;St.visible&&E.push(S,At,St,J,je.z,null,F)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||S.intersectsFrustum(ee))){let At=st.update(S),St=S.material;if(q&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),je.copy(S.boundingSphere.center)):(At.boundingSphere===null&&At.computeBoundingSphere(),je.copy(At.boundingSphere.center)),je.applyMatrix4(S.matrixWorld).applyMatrix4(re)),Array.isArray(St)){let Ct=At.groups;for(let Nt=0,ne=Ct.length;Nt<ne;Nt++){let oe=Ct[Nt],Pt=St[oe.materialIndex];Pt&&Pt.visible&&E.push(S,At,Pt,J,je.z,oe,F)}}else St.visible&&E.push(S,At,St,J,je.z,null,F)}}let yt=S.children;for(let At=0,St=yt.length;At<St;At++)Er(yt[At],F,J,q)}function No(S,F,J,q){let{opaque:Y,transmissive:yt,transparent:At}=S;T.setupLightsView(J),le===!0&&Ut.setGlobalState(L.clippingPlanes,J),q&&x.viewport(Z.copy(q)),Y.length>0&&rt(Y,F,J),yt.length>0&&rt(yt,F,J),At.length>0&&rt(At,F,J),x.buffers.depth.setTest(!0),x.buffers.depth.setMask(!0),x.buffers.color.setMask(!0),x.setPolygonOffset(!1)}function Oo(S,F,J,q){if((J.isScene===!0?J.overrideMaterial:null)!==null)return;if(T.state.transmissionRenderTarget[q.id]===void 0){let Pt=me.has("EXT_color_buffer_half_float")||me.has("EXT_color_buffer_float");T.state.transmissionRenderTarget[q.id]=new zn(1,1,{generateMipmaps:!0,type:Pt?Mi:Hn,minFilter:Is,samples:Math.max(4,C.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:ce.workingColorSpace})}let yt=T.state.transmissionRenderTarget[q.id],At=q.viewport||Z;yt.setSize(At.z*L.transmissionResolutionScale,At.w*L.transmissionResolutionScale);let St=L.getRenderTarget(),Ct=L.getActiveCubeFace(),Nt=L.getActiveMipmapLevel();L.setRenderTarget(yt),L.getClearColor(Wt),It=L.getClearAlpha(),It<1&&L.setClearColor(16777215,.5),L.clear(),Oe&&Qt.render(J);let ne=L.toneMapping;L.toneMapping=yi;let oe=q.viewport;if(q.viewport!==void 0&&(q.viewport=void 0),T.setupLightsView(q),le===!0&&Ut.setGlobalState(L.clippingPlanes,q),rt(S,J,q),tt.updateMultisampleRenderTarget(yt),tt.updateRenderTargetMipmap(yt),me.has("WEBGL_multisampled_render_to_texture")===!1){let Pt=!1;for(let fe=0,Xe=F.length;fe<Xe;fe++){let Pe=F[fe],{object:ge,geometry:ln,material:Et,group:tn}=Pe;if(Et.side===kn&&ge.layers.test(q.layers)){let ae=Et.side;Et.side=Nn,Et.needsUpdate=!0,Gs(ge,J,q,ln,Et,tn),Et.side=ae,Et.needsUpdate=!0,Pt=!0}}Pt===!0&&(tt.updateMultisampleRenderTarget(yt),tt.updateRenderTargetMipmap(yt))}L.setRenderTarget(St,Ct,Nt),L.setClearColor(Wt,It),oe!==void 0&&(q.viewport=oe),L.toneMapping=ne}function rt(S,F,J){let q=F.isScene===!0?F.overrideMaterial:null;for(let Y=0,yt=S.length;Y<yt;Y++){let At=S[Y],{object:St,geometry:Ct,group:Nt}=At,ne=At.material;ne.allowOverride===!0&&q!==null&&(ne=q),St.layers.test(J.layers)&&Gs(St,F,J,Ct,ne,Nt)}}function Gs(S,F,J,q,Y,yt){k!==null&&Y.isNodeMaterial&&k.setObject(S,Y),S.onBeforeRender(L,F,J,q,Y,yt),S.modelViewMatrix.multiplyMatrices(J.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),Y.onBeforeRender(L,F,J,q,S,yt),Y.transparent===!0&&Y.side===kn&&Y.forceSinglePass===!1?(Y.side=Nn,Y.needsUpdate=!0,L.renderBufferDirect(J,F,q,Y,S,yt),Y.side=ri,Y.needsUpdate=!0,L.renderBufferDirect(J,F,q,Y,S,yt),Y.side=kn):L.renderBufferDirect(J,F,q,Y,S,yt),S.onAfterRender(L,F,J,q,Y,yt)}function Tr(S,F,J){F.isScene!==!0&&(F=mn);let q=j.get(S),Y=T.state.lights,yt=T.state.shadowsArray,At=Y.state.version,St=gt.getParameters(S,Y.state,yt,F,J,T.state.lightProbeGridArray),Ct=gt.getProgramCacheKey(St),Nt=q.programs;q.environment=S.isMeshStandardMaterial||S.isMeshLambertMaterial||S.isMeshPhongMaterial?F.environment:null,q.fog=F.fog;let ne=S.isMeshStandardMaterial||S.isMeshLambertMaterial&&!S.envMap||S.isMeshPhongMaterial&&!S.envMap;q.envMap=dt.get(S.envMap||q.environment,ne),q.envMapRotation=q.environment!==null&&S.envMap===null?F.environmentRotation:S.envMapRotation,Nt===void 0&&(S.addEventListener("dispose",Fn),Nt=new Map,q.programs=Nt);let oe=Nt.get(Ct);if(oe!==void 0){if(q.currentProgram===oe&&q.lightsStateVersion===At)return gl(S,St),oe}else St.uniforms=gt.getUniforms(S),k!==null&&S.isNodeMaterial&&k.build(S,J,St),S.onBeforeCompile(St,L),oe=gt.acquireProgram(St,Ct),Nt.set(Ct,oe),q.uniforms=St.uniforms;let Pt=q.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Pt.clippingPlanes=Ut.uniform),gl(S,St),q.needsLights=Uo(S),q.lightsStateVersion=At,q.needsLights&&(Pt.ambientLightColor.value=Y.state.ambient,Pt.lightProbe.value=Y.state.probe,Pt.sunLights.value=Y.state.sun,Pt.sunLightShadows.value=Y.state.sunShadow,Pt.directionalLights.value=Y.state.directional,Pt.directionalLightShadows.value=Y.state.directionalShadow,Pt.spotLights.value=Y.state.spot,Pt.spotLightShadows.value=Y.state.spotShadow,Pt.rectAreaLights.value=Y.state.rectArea,Pt.ltc_1.value=Y.state.rectAreaLTC1,Pt.ltc_2.value=Y.state.rectAreaLTC2,Pt.pointLights.value=Y.state.point,Pt.pointLightShadows.value=Y.state.pointShadow,Pt.hemisphereLights.value=Y.state.hemi,Pt.sunShadowMatrix.value=Y.state.sunShadowMatrix,Pt.sunShadowCascade.value=Y.state.sunShadowCascade,Pt.directionalShadowMatrix.value=Y.state.directionalShadowMatrix,Pt.spotLightMatrix.value=Y.state.spotLightMatrix,Pt.spotLightMap.value=Y.state.spotLightMap,Pt.pointShadowMatrix.value=Y.state.pointShadowMatrix),q.lightProbeGrid=T.state.lightProbeGridArray.length>0,q.currentProgram=oe,q.uniformsList=null,oe}function Ws(S){if(S.uniformsList===null){let F=S.currentProgram.getUniforms();S.uniformsList=fo.seqWithValue(F.seq,S.uniforms)}return S.uniformsList}function gl(S,F){let J=j.get(S);J.outputColorSpace=F.outputColorSpace,J.batching=F.batching,J.batchingColor=F.batchingColor,J.instancing=F.instancing,J.instancingColor=F.instancingColor,J.instancingMorph=F.instancingMorph,J.skinning=F.skinning,J.morphTargets=F.morphTargets,J.morphNormals=F.morphNormals,J.morphColors=F.morphColors,J.morphTargetsCount=F.morphTargetsCount,J.numClippingPlanes=F.numClippingPlanes,J.numIntersection=F.numClipIntersection,J.vertexAlphas=F.vertexAlphas,J.vertexTangents=F.vertexTangents,J.toneMapping=F.toneMapping}function Ar(S,F){if(S.length===0)return null;if(S.length===1)return S[0].texture!==null?S[0]:null;_.setFromMatrixPosition(F.matrixWorld);for(let J=0,q=S.length;J<q;J++){let Y=S[J];if(Y.texture!==null&&Y.boundingBox.containsPoint(_))return Y}return null}function Kd(S,F,J,q,Y){F.isScene!==!0&&(F=mn),tt.resetTextureUnits();let yt=F.fog,At=q.isMeshStandardMaterial||q.isMeshLambertMaterial||q.isMeshPhongMaterial?F.environment:null,St=K===null?L.outputColorSpace:K.isXRRenderTarget===!0?K.texture.colorSpace:ce.workingColorSpace,Ct=q.isMeshStandardMaterial||q.isMeshLambertMaterial&&!q.envMap||q.isMeshPhongMaterial&&!q.envMap,Nt=dt.get(q.envMap||At,Ct),ne=q.vertexColors===!0&&!!J.attributes.color&&J.attributes.color.itemSize===4,oe=!!J.attributes.tangent&&(!!q.normalMap||q.anisotropy>0),Pt=!!J.morphAttributes.position,fe=!!J.morphAttributes.normal,Xe=!!J.morphAttributes.color,Pe=yi;q.toneMapped&&(K===null||K.isXRRenderTarget===!0)&&(Pe=L.toneMapping);let ge=J.morphAttributes.position||J.morphAttributes.normal||J.morphAttributes.color,ln=ge!==void 0?ge.length:0,Et=j.get(q),tn=T.state.lights;if(le===!0&&(ve===!0||S!==D)){let Se=S===D&&q.id===G;Ut.setState(q,S,Se)}let ae=!1;q.version===Et.__version?(Et.needsLights&&Et.lightsStateVersion!==tn.state.version||Et.outputColorSpace!==St||Y.isBatchedMesh&&Et.batching===!1||!Y.isBatchedMesh&&Et.batching===!0||Y.isBatchedMesh&&Et.batchingColor===!0&&Y._colorsTexture===null||Y.isBatchedMesh&&Et.batchingColor===!1&&Y._colorsTexture!==null||Y.isInstancedMesh&&Et.instancing===!1||!Y.isInstancedMesh&&Et.instancing===!0||Y.isSkinnedMesh&&Et.skinning===!1||!Y.isSkinnedMesh&&Et.skinning===!0||Y.isInstancedMesh&&Et.instancingColor===!0&&Y.instanceColor===null||Y.isInstancedMesh&&Et.instancingColor===!1&&Y.instanceColor!==null||Y.isInstancedMesh&&Et.instancingMorph===!0&&Y.morphTexture===null||Y.isInstancedMesh&&Et.instancingMorph===!1&&Y.morphTexture!==null||Et.envMap!==Nt||q.fog===!0&&Et.fog!==yt||Et.numClippingPlanes!==void 0&&(Et.numClippingPlanes!==Ut.numPlanes||Et.numIntersection!==Ut.numIntersection)||Et.vertexAlphas!==ne||Et.vertexTangents!==oe||Et.morphTargets!==Pt||Et.morphNormals!==fe||Et.morphColors!==Xe||Et.toneMapping!==Pe||Et.morphTargetsCount!==ln||!!Et.lightProbeGrid!=T.state.lightProbeGridArray.length>0)&&(ae=!0):(ae=!0,Et.__version=q.version);let gn=Et.currentProgram;ae===!0&&(gn=Tr(q,F,Y),k&&q.isNodeMaterial&&k.onUpdateProgram(q,gn,Et));let Ln=!1,di=!1,ps=!1,_e=gn.getUniforms(),He=Et.uniforms;if(x.useProgram(gn.program)&&(Ln=!0,di=!0,ps=!0),q.id!==G&&(G=q.id,di=!0),Et.needsLights){let Se=Ar(T.state.lightProbeGridArray,Y);Et.lightProbeGrid!==Se&&(Et.lightProbeGrid=Se,di=!0)}if(Ln||D!==S){x.buffers.depth.getReversed()&&S.reversedDepth!==!0&&(S._reversedDepth=!0,S.updateProjectionMatrix()),_e.setValue(z,"projectionMatrix",S.projectionMatrix),_e.setValue(z,"viewMatrix",S.matrixWorldInverse);let Ai=_e.map.cameraPosition;Ai!==void 0&&Ai.setValue(z,Ce.setFromMatrixPosition(S.matrixWorld)),C.logarithmicDepthBuffer&&_e.setValue(z,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(q.isMeshPhongMaterial||q.isMeshToonMaterial||q.isMeshLambertMaterial||q.isMeshBasicMaterial||q.isMeshStandardMaterial||q.isShaderMaterial)&&_e.setValue(z,"isOrthographic",S.isOrthographicCamera===!0),D!==S&&(D=S,di=!0,ps=!0)}if(Et.needsLights&&(tn.state.sunShadowMap.length>0&&_e.setValue(z,"sunShadowMap",tn.state.sunShadowMap,tt),tn.state.directionalShadowMap.length>0&&_e.setValue(z,"directionalShadowMap",tn.state.directionalShadowMap,tt),tn.state.spotShadowMap.length>0&&_e.setValue(z,"spotShadowMap",tn.state.spotShadowMap,tt),tn.state.pointShadowMap.length>0&&_e.setValue(z,"pointShadowMap",tn.state.pointShadowMap,tt)),Y.isSkinnedMesh){_e.setOptional(z,Y,"bindMatrix"),_e.setOptional(z,Y,"bindMatrixInverse");let Se=Y.skeleton;Se&&(Se.boneTexture===null&&Se.computeBoneTexture(),_e.setValue(z,"boneTexture",Se.boneTexture,tt))}Y.isBatchedMesh&&(_e.setOptional(z,Y,"batchingTexture"),_e.setValue(z,"batchingTexture",Y._matricesTexture,tt),_e.setOptional(z,Y,"batchingIdTexture"),_e.setValue(z,"batchingIdTexture",Y._indirectTexture,tt),_e.setOptional(z,Y,"batchingColorTexture"),Y._colorsTexture!==null&&_e.setValue(z,"batchingColorTexture",Y._colorsTexture,tt));let Ti=J.morphAttributes;if((Ti.position!==void 0||Ti.normal!==void 0||Ti.color!==void 0)&&B.update(Y,J,gn),(di||Et.receiveShadow!==Y.receiveShadow)&&(Et.receiveShadow=Y.receiveShadow,_e.setValue(z,"receiveShadow",Y.receiveShadow)),(q.isMeshStandardMaterial||q.isMeshLambertMaterial||q.isMeshPhongMaterial)&&q.envMap===null&&F.environment!==null&&(He.envMapIntensity.value=F.environmentIntensity),He.dfgLUT!==void 0&&(He.dfgLUT.value=uw()),di){if(_e.setValue(z,"toneMappingExposure",L.toneMappingExposure),Et.needsLights&&Ir(He,ps),yt&&q.fog===!0&&Ot.refreshFogUniforms(He,yt),Ot.refreshMaterialUniforms(He,q,nt,$,T.state.transmissionRenderTarget[S.id]),Et.needsLights&&Et.lightProbeGrid){let Se=Et.lightProbeGrid;He.probesSH.value=Se.texture,He.probesMin.value.copy(Se.boundingBox.min),He.probesMax.value.copy(Se.boundingBox.max),He.probesResolution.value.copy(Se.resolution)}fo.upload(z,Ws(Et),He,tt)}if(q.isShaderMaterial&&q.uniformsNeedUpdate===!0&&(fo.upload(z,Ws(Et),He,tt),q.uniformsNeedUpdate=!1),q.isSpriteMaterial&&_e.setValue(z,"center",Y.center),_e.setValue(z,"modelViewMatrix",Y.modelViewMatrix),_e.setValue(z,"normalMatrix",Y.normalMatrix),_e.setValue(z,"modelMatrix",Y.matrixWorld),q.uniformsGroups!==void 0){let Se=q.uniformsGroups;for(let Ai=0,ms=Se.length;Ai<ms;Ai++){let _l=Se[Ai];at.update(_l,gn),at.bind(_l,gn)}}return gn}function Ir(S,F){S.ambientLightColor.needsUpdate=F,S.lightProbe.needsUpdate=F,S.sunLights.needsUpdate=F,S.sunLightShadows.needsUpdate=F,S.directionalLights.needsUpdate=F,S.directionalLightShadows.needsUpdate=F,S.pointLights.needsUpdate=F,S.pointLightShadows.needsUpdate=F,S.spotLights.needsUpdate=F,S.spotLightShadows.needsUpdate=F,S.rectAreaLights.needsUpdate=F,S.hemisphereLights.needsUpdate=F}function Uo(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return U},this.getActiveMipmapLevel=function(){return W},this.getRenderTarget=function(){return K},this.setRenderTargetTextures=function(S,F,J){let q=j.get(S);q.__autoAllocateDepthBuffer=S.resolveDepthBuffer===!1,q.__autoAllocateDepthBuffer===!1&&(q.__useRenderToTexture=!1),j.get(S.texture).__webglTexture=F,j.get(S.depthTexture).__webglTexture=q.__autoAllocateDepthBuffer?void 0:J,q.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(S,F){let J=j.get(S);J.__webglFramebuffer=F,J.__useDefaultFramebuffer=F===void 0},this.setRenderTarget=function(S,F=0,J=0){K=S,U=F,W=J;let q=null,Y=!1,yt=!1;if(S){let St=j.get(S);if(St.__useDefaultFramebuffer!==void 0){x.bindFramebuffer(z.FRAMEBUFFER,St.__webglFramebuffer),Z.copy(S.viewport),ct.copy(S.scissor),Mt=S.scissorTest,x.viewport(Z),x.scissor(ct),x.setScissorTest(Mt),G=-1;return}else if(St.__webglFramebuffer===void 0)tt.setupRenderTarget(S);else if(St.__hasExternalTextures)tt.rebindTextures(S,j.get(S.texture).__webglTexture,j.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){let ne=S.depthTexture;if(St.__boundDepthTexture!==ne){if(ne!==null&&j.has(ne)&&(S.width!==ne.image.width||S.height!==ne.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");tt.setupDepthRenderbuffer(S)}}let Ct=S.texture;(Ct.isData3DTexture||Ct.isDataArrayTexture||Ct.isCompressedArrayTexture)&&(yt=!0);let Nt=j.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Nt[F])?q=Nt[F][J]:q=Nt[F],Y=!0):S.samples>0&&tt.useMultisampledRTT(S)===!1?q=j.get(S).__webglMultisampledFramebuffer:Array.isArray(Nt)?q=Nt[J]:q=Nt,Z.copy(S.viewport),ct.copy(S.scissor),Mt=S.scissorTest}else Z.copy(ht).multiplyScalar(nt).floor(),ct.copy(Gt).multiplyScalar(nt).floor(),Mt=Ve;if(J!==0&&(q=V),x.bindFramebuffer(z.FRAMEBUFFER,q)&&x.drawBuffers(S,q),x.viewport(Z),x.scissor(ct),x.setScissorTest(Mt),Y){let St=j.get(S.texture);z.framebufferTexture2D(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_CUBE_MAP_POSITIVE_X+F,St.__webglTexture,J)}else if(yt){let St=F;for(let Ct=0;Ct<S.textures.length;Ct++){let Nt=j.get(S.textures[Ct]);z.framebufferTextureLayer(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0+Ct,Nt.__webglTexture,J,St)}}else if(S!==null&&J!==0){let St=j.get(S.texture);z.framebufferTexture2D(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,St.__webglTexture,J)}G=-1};function Rr(S){let F=j.get(S);return(F.__readFormat!==S.format||F.__readType!==S.type)&&(F.__readFormat=S.format,F.__readType=S.type,F.__formatReadable=C.textureFormatReadable(S.format),F.__typeReadable=C.textureTypeReadable(S.type)),F}this.readRenderTargetPixels=function(S,F,J,q,Y,yt,At,St=0){if(!(S&&S.isWebGLRenderTarget)){Zt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ct=j.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&At!==void 0&&(Ct=Ct[At]),Ct){x.bindFramebuffer(z.FRAMEBUFFER,Ct);try{let Nt=S.textures[St],ne=Nt.format,oe=Nt.type;S.textures.length>1&&z.readBuffer(z.COLOR_ATTACHMENT0+St);let Pt=Rr(Nt);if(Pt.__formatReadable===!1){Zt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Pt.__typeReadable===!1){Zt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}F>=0&&F<=S.width-q&&J>=0&&J<=S.height-Y&&z.readPixels(F,J,q,Y,xt.convert(ne),xt.convert(oe),yt)}finally{let Nt=K!==null?j.get(K).__webglFramebuffer:null;x.bindFramebuffer(z.FRAMEBUFFER,Nt)}}},this.readRenderTargetPixelsAsync=async function(S,F,J,q,Y,yt,At,St=0){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ct=j.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&At!==void 0&&(Ct=Ct[At]),Ct)if(F>=0&&F<=S.width-q&&J>=0&&J<=S.height-Y){x.bindFramebuffer(z.FRAMEBUFFER,Ct);let Nt=S.textures[St],ne=Nt.format,oe=Nt.type;S.textures.length>1&&z.readBuffer(z.COLOR_ATTACHMENT0+St);let Pt=Rr(Nt);if(Pt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Pt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let fe=z.createBuffer();z.bindBuffer(z.PIXEL_PACK_BUFFER,fe),z.bufferData(z.PIXEL_PACK_BUFFER,yt.byteLength,z.STREAM_READ),z.readPixels(F,J,q,Y,xt.convert(ne),xt.convert(oe),0),z.bindBuffer(z.PIXEL_PACK_BUFFER,null);let Xe=K!==null?j.get(K).__webglFramebuffer:null;x.bindFramebuffer(z.FRAMEBUFFER,Xe);let Pe=z.fenceSync(z.SYNC_GPU_COMMANDS_COMPLETE,0);return z.flush(),await Ym(z,Pe,4),z.bindBuffer(z.PIXEL_PACK_BUFFER,fe),z.getBufferSubData(z.PIXEL_PACK_BUFFER,0,yt),z.bindBuffer(z.PIXEL_PACK_BUFFER,null),z.deleteBuffer(fe),z.deleteSync(Pe),yt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(S,F=null,J=0){let q=Math.pow(2,-J),Y=Math.floor(S.image.width*q),yt=Math.floor(S.image.height*q),At=F!==null?F.x:0,St=F!==null?F.y:0;tt.setTexture2D(S,0),z.copyTexSubImage2D(z.TEXTURE_2D,J,0,0,At,St,Y,yt),x.unbindTexture()},this.copyTextureToTexture=function(S,F,J=null,q=null,Y=0,yt=0){let At,St,Ct,Nt,ne,oe,Pt,fe,Xe,Pe=S.isCompressedTexture?S.mipmaps[yt]:S.image;if(J!==null)At=J.max.x-J.min.x,St=J.max.y-J.min.y,Ct=J.isBox3?J.max.z-J.min.z:1,Nt=J.min.x,ne=J.min.y,oe=J.isBox3?J.min.z:0;else{let He=Math.pow(2,-Y);At=Math.floor(Pe.width*He),St=Math.floor(Pe.height*He),S.isDataArrayTexture?Ct=Pe.depth:S.isData3DTexture?Ct=Math.floor(Pe.depth*He):Ct=1,Nt=0,ne=0,oe=0}q!==null?(Pt=q.x,fe=q.y,Xe=q.z):(Pt=0,fe=0,Xe=0);let ge=xt.convert(F.format),ln=xt.convert(F.type),Et;F.isData3DTexture?(tt.setTexture3D(F,0),Et=z.TEXTURE_3D):F.isDataArrayTexture||F.isCompressedArrayTexture?(tt.setTexture2DArray(F,0),Et=z.TEXTURE_2D_ARRAY):(tt.setTexture2D(F,0),Et=z.TEXTURE_2D),x.activeTexture(z.TEXTURE0),x.pixelStorei(z.UNPACK_FLIP_Y_WEBGL,F.flipY),x.pixelStorei(z.UNPACK_PREMULTIPLY_ALPHA_WEBGL,F.premultiplyAlpha),x.pixelStorei(z.UNPACK_ALIGNMENT,F.unpackAlignment);let tn=x.getParameter(z.UNPACK_ROW_LENGTH),ae=x.getParameter(z.UNPACK_IMAGE_HEIGHT),gn=x.getParameter(z.UNPACK_SKIP_PIXELS),Ln=x.getParameter(z.UNPACK_SKIP_ROWS),di=x.getParameter(z.UNPACK_SKIP_IMAGES);x.pixelStorei(z.UNPACK_ROW_LENGTH,Pe.width),x.pixelStorei(z.UNPACK_IMAGE_HEIGHT,Pe.height),x.pixelStorei(z.UNPACK_SKIP_PIXELS,Nt),x.pixelStorei(z.UNPACK_SKIP_ROWS,ne),x.pixelStorei(z.UNPACK_SKIP_IMAGES,oe);let ps=S.isDataArrayTexture||S.isData3DTexture,_e=F.isDataArrayTexture||F.isData3DTexture;if(S.isDepthTexture){let He=j.get(S),Ti=j.get(F),Se=j.get(He.__renderTarget),Ai=j.get(Ti.__renderTarget);x.bindFramebuffer(z.READ_FRAMEBUFFER,Se.__webglFramebuffer),x.bindFramebuffer(z.DRAW_FRAMEBUFFER,Ai.__webglFramebuffer);for(let ms=0;ms<Ct;ms++)ps&&(z.framebufferTextureLayer(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,j.get(S).__webglTexture,Y,oe+ms),z.framebufferTextureLayer(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,j.get(F).__webglTexture,yt,Xe+ms)),z.blitFramebuffer(Nt,ne,At,St,Pt,fe,At,St,z.DEPTH_BUFFER_BIT,z.NEAREST);x.bindFramebuffer(z.READ_FRAMEBUFFER,null),x.bindFramebuffer(z.DRAW_FRAMEBUFFER,null)}else if(Y!==0||S.isRenderTargetTexture||j.has(S)){let He=j.get(S),Ti=j.get(F);x.bindFramebuffer(z.READ_FRAMEBUFFER,O),x.bindFramebuffer(z.DRAW_FRAMEBUFFER,H);for(let Se=0;Se<Ct;Se++)ps?z.framebufferTextureLayer(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,He.__webglTexture,Y,oe+Se):z.framebufferTexture2D(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,He.__webglTexture,Y),_e?z.framebufferTextureLayer(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,Ti.__webglTexture,yt,Xe+Se):z.framebufferTexture2D(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,Ti.__webglTexture,yt),Y!==0?z.blitFramebuffer(Nt,ne,At,St,Pt,fe,At,St,z.COLOR_BUFFER_BIT,z.NEAREST):_e?z.copyTexSubImage3D(Et,yt,Pt,fe,Xe+Se,Nt,ne,At,St):z.copyTexSubImage2D(Et,yt,Pt,fe,Nt,ne,At,St);x.bindFramebuffer(z.READ_FRAMEBUFFER,null),x.bindFramebuffer(z.DRAW_FRAMEBUFFER,null)}else _e?S.isDataTexture||S.isData3DTexture?z.texSubImage3D(Et,yt,Pt,fe,Xe,At,St,Ct,ge,ln,Pe.data):F.isCompressedArrayTexture?z.compressedTexSubImage3D(Et,yt,Pt,fe,Xe,At,St,Ct,ge,Pe.data):z.texSubImage3D(Et,yt,Pt,fe,Xe,At,St,Ct,ge,ln,Pe):S.isDataTexture?z.texSubImage2D(z.TEXTURE_2D,yt,Pt,fe,At,St,ge,ln,Pe.data):S.isCompressedTexture?z.compressedTexSubImage2D(z.TEXTURE_2D,yt,Pt,fe,Pe.width,Pe.height,ge,Pe.data):z.texSubImage2D(z.TEXTURE_2D,yt,Pt,fe,At,St,ge,ln,Pe);x.pixelStorei(z.UNPACK_ROW_LENGTH,tn),x.pixelStorei(z.UNPACK_IMAGE_HEIGHT,ae),x.pixelStorei(z.UNPACK_SKIP_PIXELS,gn),x.pixelStorei(z.UNPACK_SKIP_ROWS,Ln),x.pixelStorei(z.UNPACK_SKIP_IMAGES,di),yt===0&&F.generateMipmaps&&z.generateMipmap(Et),x.unbindTexture()},this.initRenderTarget=function(S){j.get(S).__webglFramebuffer===void 0&&tt.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?tt.setTextureCube(S,0):S.isData3DTexture?tt.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?tt.setTexture2DArray(S,0):tt.setTexture2D(S,0),x.unbindTexture()},this.resetState=function(){U=0,W=0,K=null,x.reset(),wt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return gi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=ce._getDrawingBufferColorSpace(t),e.unpackColorSpace=ce._getUnpackColorSpace()}};var Cg={type:"change"},Of={type:"start"},Lg={type:"end"},Ph=new jn,Pg=new De,fw=Math.cos(70*Qi.DEG2RAD),on=new R,Gn=2*Math.PI,Ee={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Nf=1e-6,Lh=class extends Ra{constructor(t,e=null){super(t,e),this.state=Ee.NONE,this.target=new R,this.cursor=new R,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Ts.ROTATE,MIDDLE:Ts.DOLLY,RIGHT:Ts.PAN},this.touches={ONE:xi.ROTATE,TWO:xi.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new R,this._lastQuaternion=new $n,this._lastTargetPosition=new R,this._quat=new $n().setFromUnitVectors(t.up,new R(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new ro,this._sphericalDelta=new ro,this._scale=1,this._panOffset=new R,this._rotateStart=new ut,this._rotateEnd=new ut,this._rotateDelta=new ut,this._panStart=new ut,this._panEnd=new ut,this._panDelta=new ut,this._dollyStart=new ut,this._dollyEnd=new ut,this._dollyDelta=new ut,this._dollyDirection=new R,this._mouse=new ut,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=mw.bind(this),this._onPointerDown=pw.bind(this),this._onPointerUp=gw.bind(this),this._onContextMenu=Mw.bind(this),this._onMouseWheel=xw.bind(this),this._onKeyDown=yw.bind(this),this._onTouchStart=vw.bind(this),this._onTouchMove=Sw.bind(this),this._onMouseDown=_w.bind(this),this._onMouseMove=bw.bind(this),this._interceptControlDown=ww.bind(this),this._interceptControlUp=Ew.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(t){this._cursorStyle=t,t==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=Ee.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents();let t=this.domElement.getRootNode();t.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),t.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Cg),this.update(),this.state=Ee.NONE}pan(t,e){this._pan(t,e),this.update()}dollyIn(t){this._dollyIn(t),this.update()}dollyOut(t){this._dollyOut(t),this.update()}rotateLeft(t){this._rotateLeft(t),this.update()}rotateUp(t){this._rotateUp(t),this.update()}update(t=null){let e=this.object.position;on.copy(e).sub(this.target),on.applyQuaternion(this._quat),this._spherical.setFromVector3(on),this.autoRotate&&this.state===Ee.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=Gn:n>Math.PI&&(n-=Gn),s<-Math.PI?s+=Gn:s>Math.PI&&(s-=Gn),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(on.setFromSpherical(this._spherical),on.applyQuaternion(this._quatInverse),e.copy(this.target).add(on),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){let a=on.length();o=this._clampDistance(a*this._scale);let c=a-o;this.object.position.addScaledVector(this._dollyDirection,c),this.object.updateMatrixWorld(),r=!!c}else if(this.object.isOrthographicCamera){let a=new R(this._mouse.x,this._mouse.y,0);a.unproject(this.object);let c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=c!==this.object.zoom;let l=new R(this._mouse.x,this._mouse.y,0);l.unproject(this.object),this.object.position.sub(l).add(a),this.object.updateMatrixWorld(),o=on.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(Ph.origin.copy(this.object.position),Ph.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Ph.direction))<fw?this.object.lookAt(this.target):(Pg.setFromNormalAndCoplanarPoint(this.object.up,this.target),Ph.intersectPlane(Pg,this.target))))}else if(this.object.isOrthographicCamera){let o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Nf||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Nf||this._lastTargetPosition.distanceToSquared(this.target)>Nf?(this.dispatchEvent(Cg),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?Gn/60*this.autoRotateSpeed*t:Gn/60/60*this.autoRotateSpeed}_getZoomScale(t){let e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){on.setFromMatrixColumn(e,0),on.multiplyScalar(-t),this._panOffset.add(on)}_panUp(t,e){this.screenSpacePanning===!0?on.setFromMatrixColumn(e,1):(on.setFromMatrixColumn(e,0),on.crossVectors(this.object.up,on)),on.multiplyScalar(t),this._panOffset.add(on)}_pan(t,e){let n=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;on.copy(s).sub(this.target);let r=on.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/n.clientHeight,this.object.matrix),this._panUp(2*e*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),s=t-n.left,r=e-n.top,o=n.width,a=n.height;this._mouse.x=s/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(Gn*this._rotateDelta.x/e.clientHeight),this._rotateUp(Gn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(Gn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-Gn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(Gn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-Gn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(n,s)}}_handleTouchStartDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(Gn*this._rotateDelta.x/e.clientHeight),this._rotateUp(Gn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let o=(t.pageX+e.x)*.5,a=(t.pageY+e.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new ut,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){let e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function pw(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function mw(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function gw(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Lg),this.state=Ee.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function _w(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Ts.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=Ee.DOLLY;break;case Ts.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Ee.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Ee.ROTATE}break;case Ts.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Ee.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Ee.PAN}break;default:this.state=Ee.NONE}this.state!==Ee.NONE&&this.dispatchEvent(Of)}function bw(i){switch(this.state){case Ee.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case Ee.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case Ee.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function xw(i){this.enabled===!1||this.enableZoom===!1||this.state!==Ee.NONE||(i.preventDefault(),this.dispatchEvent(Of),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Lg))}function yw(i){this.enabled!==!1&&this._handleKeyDown(i)}function vw(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case xi.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=Ee.TOUCH_ROTATE;break;case xi.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=Ee.TOUCH_PAN;break;default:this.state=Ee.NONE}break;case 2:switch(this.touches.TWO){case xi.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=Ee.TOUCH_DOLLY_PAN;break;case xi.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=Ee.TOUCH_DOLLY_ROTATE;break;default:this.state=Ee.NONE}break;default:this.state=Ee.NONE}this.state!==Ee.NONE&&this.dispatchEvent(Of)}function Sw(i){switch(this._trackPointer(i),this.state){case Ee.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case Ee.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case Ee.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case Ee.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=Ee.NONE}}function Mw(i){this.enabled!==!1&&i.preventDefault()}function ww(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Ew(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var yn=class{constructor(){v(this,"enabled",!0);v(this,"trigger",t=>{if(!this.enabled)return;let e=this.handlers.slice(0);for(let n of e)n(t)});v(this,"handlers",[])}add(t){this.handlers.push(t)}remove(t){this.handlers=this.handlers.filter(e=>e!==t)}reset(){this.handlers.length=0}};var Dh=class{constructor(){v(this,"_list",new Map);v(this,"_communicationKey",0)}setupInput(t){t.requestId=this._communicationKey++}set(t,e,n){let s=this.newHandler(e,n);this._list.set(t,s)}run(t){let e=this._list.get(t.requestId);this._list.delete(t.requestId),e(t)}newHandler(t,e){return n=>{if(n.errorInfo){t(n.errorInfo);return}e(n)}}};var rr=(i=>(i[i.LINE=0]="LINE",i[i.SHELL=1]="SHELL",i))(rr||{}),Ke=(i=>(i[i.UPDATE=0]="UPDATE",i[i.CREATE=1]="CREATE",i[i.DELETE=2]="DELETE",i[i.FINISH=3]="FINISH",i))(Ke||{}),Ui=(i=>(i[i.GEOMETRY=0]="GEOMETRY",i[i.WIRES=1]="WIRES",i[i.INVISIBLE=2]="INVISIBLE",i))(Ui||{}),Je=(i=>(i[i.CREATE_MODEL=0]="CREATE_MODEL",i[i.DELETE_MODEL=1]="DELETE_MODEL",i[i.EXECUTE=2]="EXECUTE",i[i.RAYCAST=3]="RAYCAST",i[i.FETCH_BOXES=4]="FETCH_BOXES",i[i.REFRESH_VIEW=5]="REFRESH_VIEW",i[i.RECOMPUTE_MESHES=6]="RECOMPUTE_MESHES",i[i.CREATE_MATERIAL=7]="CREATE_MATERIAL",i[i.THROW_ERROR=8]="THROW_ERROR",i[i.LOAD_PROGRESS=9]="LOAD_PROGRESS",i[i.ABORT_MODEL=10]="ABORT_MODEL",i))(Je||{});var or=(i=>(i[i.NONE=0]="NONE",i[i.LINES=1]="LINES",i[i.CLOTHOID=2]="CLOTHOID",i[i.ELLIPSE_ARC=3]="ELLIPSE_ARC",i[i.PARABOLA=4]="PARABOLA",i))(or||{});var vn=class vn{static newThread(t,e){return e?new Worker(t):new Worker(t,{type:"module"})}static newUpdater(t,e){return setInterval(t,e)}static getMeshComputeRequest(t,e){return{class:Je.RECOMPUTE_MESHES,modelId:t,list:e}}static planeSet(t){let e=[];for(let n of t){let s=this.array(n.normal),r=n.constant,o=new De(s,r);e.push(o)}return e}static data(t){if(t?.elements!==void 0)return vn.transform(t);if(t?.origin!==void 0&&t?.direction!==void 0)return vn.beam(t);if(t?.planes!==void 0)return vn.frustum(t);let r=t?.normal!==void 0,o=t?.constant!==void 0;if(r&&o)return vn.plane(t);let c=t[0]?.normal!==void 0,l=t[0]?.constant!==void 0;if(c&&l)return vn.planeSet(t);let u=t?.x!==void 0,d=t?.y!==void 0,f=t?.z!==void 0;return u&&d&&f?vn.array(t):t}static get lastDispatchedSeq(){return vn._seq}static nextSeq(){return vn._seq+=1,vn._seq}static getExecuteRequest(t,e,n){let s=Array.from(n);return{class:Je.EXECUTE,modelId:t,function:e,parameters:s}}static plane(t){let e=this.array(t.normal),n=t.constant;return new De(e,n)}static getRequestContent(t){let e=[];for(let n of t.list)vn.setupCreateRequest(n,e),vn.setupUpdateRequest(n,e);return e}static array(t){let e=new R;return e.set(t.x,t.y,t.z),e}static cleanRequests(t){let e=[],n=vn;for(let s of t)n.isFinishRequest(s)||e.push(s);return e}static frustum(t){let e=this.planeSet(t.planes),[n,s,r,o,a,c]=e;return new Cn(n,s,r,o,a,c)}static beam(t){let e=this.array(t.origin),n=this.array(t.direction);return new jn(e,n)}static transform(t){let e=new jt;return e.copy(t),e}static deleteUpdater(t){clearInterval(t)}static areCoresAvailable(t){let e=vn.getCpuCapacity(),n=Math.max(e,2);return t<n}static getMaxWorkers(t){if(t!==void 0){if(!Number.isFinite(t)||t<2)throw new Error(`Fragments: maxWorkers must be a finite number >= 2 (got ${t}).`);return Math.floor(t)}let e=vn.getCpuCapacity();return Math.max(e,2)}static isFinishRequest(t){return t.tileRequestClass===Ke.FINISH}static setupUpdateRequest(t,e){t.tileRequestClass===Ke.UPDATE&&this.addAllTileData(t,e)}static getCpuCapacity(){return globalThis.navigator?.hardwareConcurrency?navigator.hardwareConcurrency-3:0}static addAllTileData(t,e){this.addRequestTileData(t,e,"visibilityData");let n=["highlightIds"];this.addRequestTileData(t,e,"highlightData",n)}static addRequestContent(t,e,n){if(!e[t])return;let s=e[t].buffer;n.push(s)}static addRequestTileData(t,e,n,s=[]){let r=t.tileData[n];if(r){e.push(r.position.buffer),e.push(r.size.buffer);for(let o of s)e.push(t.tileData[o].buffer)}}static setupCreateRequest(t,e){if(t.tileRequestClass!==Ke.CREATE)return;let n=this.getCreateRequestIds();for(let s of n)this.addRequestContent(s,t,e);this.addAllTileData(t,e)}static getCreateRequestIds(){return["positions","indices","normals","itemIds"]}};v(vn,"_seq",0);var wi=vn;var Nh=class{constructor(t){v(this,"_handlers",new Dh);v(this,"_handleInput");v(this,"_port");v(this,"onInput",t=>{if(t.data.toMainThread){this._handlers.run(t.data);return}this.manageInput(t.data)});this._handleInput=t}fetchMeshCompute(t,e){let n=wi,s=n.getMeshComputeRequest(t,e),r=n.getRequestContent(s);this.fetch(s,r)}fetch(t,e){return this._handlers.setupInput(t),new Promise((n,s)=>{this._handlers.set(t.requestId,s,n),this.executeConnection(t,e)})}init(t){this._port=t,this.initConnection(t)}initConnection(t){t.onmessage=this.onInput}async fetchConnection(t){if(!this._port)throw new Error("Fragments: Connection not initialized");return this._port}async executeConnection(t,e){(await this.fetchConnection(t)).postMessage(t,e)}async manageOutput(t){let e=await this.fetchConnection(t);t.toMainThread=!0,e.postMessage(t)}async manageConnection(t){try{await this._handleInput(t)}catch(e){t.errorInfo=e.toString(),e?.name!=="LoadAbortedError"&&console.error(e)}}async manageInput(t){await this.manageConnection(t),await this.manageOutput(t)}};var Oh="__default__",Uh=class{constructor(t){v(this,"_modelThread",new Map);v(this,"_threadsModelAmount",new Map);v(this,"_threadPort",new Map);v(this,"_threadPath");v(this,"_placeholder");v(this,"_threadGroup",new Map);v(this,"_modelGroup",new Map);this._placeholder={},this._threadPath=t}get path(){return this._threadPath}usePlaceholder(t){this._modelThread.set(t,this._placeholder)}getAmount(t){return this._threadsModelAmount.get(t)}getThread(t){return this._modelThread.get(t)}getAndCheckThread(t){let e=this._modelThread.get(t);if(e===this._placeholder)throw new Error("Fragments: Error fetching thread!");return e}set(t,e){this._modelThread.set(t,e)}setModelGroup(t,e){this._modelGroup.set(t,e)}getModelGroup(t){return this._modelGroup.get(t)}setThreadGroup(t,e){this._threadGroup.set(t,e??Oh)}getThreadGroup(t){let e=this._threadGroup.get(t);if(!(e===void 0||e===Oh))return e}getThreadAmountForGroup(t){let e=t??Oh,n=0;for(let s of this._threadGroup.values())s===e&&n++;return n}deleteModel(t){let e=this.getThreadSafe(t),s=this.getAmountSafe(e)-1;this.setAmount(e,s),this._modelThread.delete(t),this._modelGroup.delete(t)}getThreadSafe(t){let e=this.getThread(t);if(!e)throw new Error(`Fragments: Thread for model ${t} not found`);return e}deleteThread(t){this._threadsModelAmount.delete(t),this._threadPort.delete(t),this._threadGroup.delete(t),t.terminate()}getThreadAmount(){return this._threadsModelAmount.size}balanceThreadLoad(t,e){let n=e??Oh,s=null,r=Number.MAX_VALUE;for(let[o,a]of this._threadsModelAmount)this._threadGroup.get(o)===n&&a<r&&(r=a,s=o);if(!s)throw new Error(`Fragments: no worker available for thread group "${n}".`);return this._threadsModelAmount.set(s,r+1),this._modelThread.set(t.modelId,s),this._threadPort.get(s)}getAmountSafe(t){let e=this.getAmount(t);if(!e)throw new Error(`Fragments: Amount for thread ${t} not found`);return e}setPort(t,e){this._threadPort.set(t,e)}setAmount(t,e){this._threadsModelAmount.set(t,e)}getPort(t){return this._threadPort.get(t)}};var Fh=class extends Nh{constructor(e,n,s){super(e);v(this,"_data");v(this,"_classicWorker");v(this,"_maxWorkers");v(this,"_threadGroups");v(this,"_defaultCap");this._classicWorker=s?.classicWorker??!1,this._data=new Uh(n),this._maxWorkers=wi.getMaxWorkers(s?.maxWorkers);let r=s?.threadGroups??{},o=0;this._threadGroups=new Map;for(let[a,c]of Object.entries(r)){if(!Number.isFinite(c)||c<1||!Number.isInteger(c))throw new Error(`Fragments: threadGroup "${a}" must have an integer size >= 1 (got ${c}).`);this._threadGroups.set(a,c),o+=c}if(o>=this._maxWorkers)throw new Error(`Fragments: declared threadGroups reserve ${o} workers but maxWorkers is ${this._maxWorkers}. The default pool needs at least one slot. Either lower a group size or raise maxWorkers.`);this._defaultCap=this._maxWorkers-o}get maxWorkers(){return this._maxWorkers}get threadGroups(){return Object.fromEntries(this._threadGroups)}get activeThreadCount(){return this._data.getThreadAmount()}delete(e){let n=this._data.getThreadSafe(e),s=this._data.getAmountSafe(n)-1;this._data.deleteModel(e),s===0&&this._data.deleteThread(n)}getModelThreadGroup(e){return this._data.getModelGroup(e)}setModelThreadGroup(e,n){if(n!==void 0&&!this._threadGroups.has(n))throw new Error(`Fragments: thread group "${n}" was not declared at init time. Declared groups: ${[...this._threadGroups.keys()].join(", ")||"(none)"}.`);this._data.setModelGroup(e,n)}async invoke(e,n,s=[]){let o=wi.getExecuteRequest(e,n,s);return(await this.fetch(o)).result}fetch(e,n){return e.seq===void 0&&(e.seq=wi.nextSeq()),super.fetch(e,n)}async fetchConnection(e){let n=this._data.getAndCheckThread(e.modelId);return n?this._data.getPort(n):this.setupNewThread(e)}setupNewThread(e){this._data.usePlaceholder(e.modelId);let n=this._data.getModelGroup(e.modelId),s=n===void 0?this._defaultCap:this._threadGroups.get(n);return this._data.getThreadAmountForGroup(n)<s?this.newThread(e,this._data.path,n):this._data.balanceThreadLoad(e,n)}setupThread(e){let n=new MessageChannel,s=n.port1,r=n.port2;this.initConnection(s),this._data.setPort(e,s),e.postMessage(r,[r])}newThread(e,n,s){let r=wi.newThread(n,this._classicWorker);return this.setupThread(r),this._data.setAmount(r,1),this._data.setThreadGroup(r,s),this._data.set(e.modelId,r),this._data.getPort(r)}};function Dg(){return new URL("./Worker/worker.mjs",import.meta.url).href}var Tw="@thatopen/fragments",Uf="3.4.8";function Ng(){return{generator:Tw,version:Uf}}var ot=(i=>(i[i.CREATE_MATERIAL=0]="CREATE_MATERIAL",i[i.CREATE_REPRESENTATION=1]="CREATE_REPRESENTATION",i[i.CREATE_SAMPLE=2]="CREATE_SAMPLE",i[i.CREATE_GLOBAL_TRANSFORM=3]="CREATE_GLOBAL_TRANSFORM",i[i.CREATE_LOCAL_TRANSFORM=4]="CREATE_LOCAL_TRANSFORM",i[i.CREATE_ITEM=5]="CREATE_ITEM",i[i.CREATE_RELATION=6]="CREATE_RELATION",i[i.UPDATE_MATERIAL=7]="UPDATE_MATERIAL",i[i.UPDATE_REPRESENTATION=8]="UPDATE_REPRESENTATION",i[i.UPDATE_SAMPLE=9]="UPDATE_SAMPLE",i[i.UPDATE_GLOBAL_TRANSFORM=10]="UPDATE_GLOBAL_TRANSFORM",i[i.UPDATE_LOCAL_TRANSFORM=11]="UPDATE_LOCAL_TRANSFORM",i[i.UPDATE_ITEM=12]="UPDATE_ITEM",i[i.UPDATE_MAX_LOCAL_ID=13]="UPDATE_MAX_LOCAL_ID",i[i.UPDATE_RELATION=14]="UPDATE_RELATION",i[i.UPDATE_METADATA=15]="UPDATE_METADATA",i[i.UPDATE_SPATIAL_STRUCTURE=16]="UPDATE_SPATIAL_STRUCTURE",i[i.DELETE_MATERIAL=17]="DELETE_MATERIAL",i[i.DELETE_REPRESENTATION=18]="DELETE_REPRESENTATION",i[i.DELETE_SAMPLE=19]="DELETE_SAMPLE",i[i.DELETE_GLOBAL_TRANSFORM=20]="DELETE_GLOBAL_TRANSFORM",i[i.DELETE_LOCAL_TRANSFORM=21]="DELETE_LOCAL_TRANSFORM",i[i.DELETE_ITEM=22]="DELETE_ITEM",i[i.DELETE_RELATION=23]="DELETE_RELATION",i[i.CREATE_INDEX=24]="CREATE_INDEX",i[i.UPDATE_INDEX=25]="UPDATE_INDEX",i[i.DELETE_INDEX=26]="DELETE_INDEX",i))(ot||{});function ar(i){return i.type===24||i.type===25||i.type===26}var ts=new Int32Array(2),Ff=new Float32Array(ts.buffer),Bf=new Float64Array(ts.buffer),Wa=new Uint16Array(new Uint8Array([1,0]).buffer)[0]===1;var Bh;(function(i){i[i.UTF8_BYTES=1]="UTF8_BYTES",i[i.UTF16_STRING=2]="UTF16_STRING"})(Bh||(Bh={}));var lr=class i{constructor(t){this.bytes_=t,this.position_=0,this.text_decoder_=new TextDecoder}static allocate(t){return new i(new Uint8Array(t))}clear(){this.position_=0}bytes(){return this.bytes_}position(){return this.position_}setPosition(t){this.position_=t}capacity(){return this.bytes_.length}readInt8(t){return this.readUint8(t)<<24>>24}readUint8(t){return this.bytes_[t]}readInt16(t){return this.readUint16(t)<<16>>16}readUint16(t){return this.bytes_[t]|this.bytes_[t+1]<<8}readInt32(t){return this.bytes_[t]|this.bytes_[t+1]<<8|this.bytes_[t+2]<<16|this.bytes_[t+3]<<24}readUint32(t){return this.readInt32(t)>>>0}readInt64(t){return BigInt.asIntN(64,BigInt(this.readUint32(t))+(BigInt(this.readUint32(t+4))<<BigInt(32)))}readUint64(t){return BigInt.asUintN(64,BigInt(this.readUint32(t))+(BigInt(this.readUint32(t+4))<<BigInt(32)))}readFloat32(t){return ts[0]=this.readInt32(t),Ff[0]}readFloat64(t){return ts[Wa?0:1]=this.readInt32(t),ts[Wa?1:0]=this.readInt32(t+4),Bf[0]}writeInt8(t,e){this.bytes_[t]=e}writeUint8(t,e){this.bytes_[t]=e}writeInt16(t,e){this.bytes_[t]=e,this.bytes_[t+1]=e>>8}writeUint16(t,e){this.bytes_[t]=e,this.bytes_[t+1]=e>>8}writeInt32(t,e){this.bytes_[t]=e,this.bytes_[t+1]=e>>8,this.bytes_[t+2]=e>>16,this.bytes_[t+3]=e>>24}writeUint32(t,e){this.bytes_[t]=e,this.bytes_[t+1]=e>>8,this.bytes_[t+2]=e>>16,this.bytes_[t+3]=e>>24}writeInt64(t,e){this.writeInt32(t,Number(BigInt.asIntN(32,e))),this.writeInt32(t+4,Number(BigInt.asIntN(32,e>>BigInt(32))))}writeUint64(t,e){this.writeUint32(t,Number(BigInt.asUintN(32,e))),this.writeUint32(t+4,Number(BigInt.asUintN(32,e>>BigInt(32))))}writeFloat32(t,e){Ff[0]=e,this.writeInt32(t,ts[0])}writeFloat64(t,e){Bf[0]=e,this.writeInt32(t,ts[Wa?0:1]),this.writeInt32(t+4,ts[Wa?1:0])}getBufferIdentifier(){if(this.bytes_.length<this.position_+4+4)throw new Error("FlatBuffers: ByteBuffer is too short to contain an identifier.");let t="";for(let e=0;e<4;e++)t+=String.fromCharCode(this.readInt8(this.position_+4+e));return t}__offset(t,e){let n=t-this.readInt32(t);return e<this.readInt16(n)?this.readInt16(n+e):0}__union(t,e){return t.bb_pos=e+this.readInt32(e),t.bb=this,t}__string(t,e){t+=this.readInt32(t);let n=this.readInt32(t);t+=4;let s=this.bytes_.subarray(t,t+n);return e===Bh.UTF8_BYTES?s:this.text_decoder_.decode(s)}__union_with_string(t,e){return typeof t=="string"?this.__string(e):this.__union(t,e)}__indirect(t){return t+this.readInt32(t)}__vector(t){return t+this.readInt32(t)+4}__vector_len(t){return this.readInt32(t+this.readInt32(t))}__has_identifier(t){if(t.length!=4)throw new Error("FlatBuffers: file identifier must be length "+4);for(let e=0;e<4;e++)if(t.charCodeAt(e)!=this.readInt8(this.position()+4+e))return!1;return!0}createScalarList(t,e){let n=[];for(let s=0;s<e;++s){let r=t(s);r!==null&&n.push(r)}return n}createObjList(t,e){let n=[];for(let s=0;s<e;++s){let r=t(s);r!==null&&n.push(r.unpack())}return n}};var mo=class i{constructor(t){this.minalign=1,this.vtable=null,this.vtable_in_use=0,this.isNested=!1,this.object_start=0,this.vtables=[],this.vector_num_elems=0,this.force_defaults=!1,this.string_maps=null,this.text_encoder=new TextEncoder;let e;t?e=t:e=1024,this.bb=lr.allocate(e),this.space=e}clear(){this.bb.clear(),this.space=this.bb.capacity(),this.minalign=1,this.vtable=null,this.vtable_in_use=0,this.isNested=!1,this.object_start=0,this.vtables=[],this.vector_num_elems=0,this.force_defaults=!1,this.string_maps=null}forceDefaults(t){this.force_defaults=t}dataBuffer(){return this.bb}asUint8Array(){return this.bb.bytes().subarray(this.bb.position(),this.bb.position()+this.offset())}prep(t,e){t>this.minalign&&(this.minalign=t);let n=~(this.bb.capacity()-this.space+e)+1&t-1;for(;this.space<n+t+e;){let s=this.bb.capacity();this.bb=i.growByteBuffer(this.bb),this.space+=this.bb.capacity()-s}this.pad(n)}pad(t){for(let e=0;e<t;e++)this.bb.writeInt8(--this.space,0)}writeInt8(t){this.bb.writeInt8(this.space-=1,t)}writeInt16(t){this.bb.writeInt16(this.space-=2,t)}writeInt32(t){this.bb.writeInt32(this.space-=4,t)}writeInt64(t){this.bb.writeInt64(this.space-=8,t)}writeFloat32(t){this.bb.writeFloat32(this.space-=4,t)}writeFloat64(t){this.bb.writeFloat64(this.space-=8,t)}addInt8(t){this.prep(1,0),this.writeInt8(t)}addInt16(t){this.prep(2,0),this.writeInt16(t)}addInt32(t){this.prep(4,0),this.writeInt32(t)}addInt64(t){this.prep(8,0),this.writeInt64(t)}addFloat32(t){this.prep(4,0),this.writeFloat32(t)}addFloat64(t){this.prep(8,0),this.writeFloat64(t)}addFieldInt8(t,e,n){(this.force_defaults||e!=n)&&(this.addInt8(e),this.slot(t))}addFieldInt16(t,e,n){(this.force_defaults||e!=n)&&(this.addInt16(e),this.slot(t))}addFieldInt32(t,e,n){(this.force_defaults||e!=n)&&(this.addInt32(e),this.slot(t))}addFieldInt64(t,e,n){(this.force_defaults||e!==n)&&(this.addInt64(e),this.slot(t))}addFieldFloat32(t,e,n){(this.force_defaults||e!=n)&&(this.addFloat32(e),this.slot(t))}addFieldFloat64(t,e,n){(this.force_defaults||e!=n)&&(this.addFloat64(e),this.slot(t))}addFieldOffset(t,e,n){(this.force_defaults||e!=n)&&(this.addOffset(e),this.slot(t))}addFieldStruct(t,e,n){e!=n&&(this.nested(e),this.slot(t))}nested(t){if(t!=this.offset())throw new TypeError("FlatBuffers: struct must be serialized inline.")}notNested(){if(this.isNested)throw new TypeError("FlatBuffers: object serialization must not be nested.")}slot(t){this.vtable!==null&&(this.vtable[t]=this.offset())}offset(){return this.bb.capacity()-this.space}static growByteBuffer(t){let e=t.capacity();if(e&3221225472)throw new Error("FlatBuffers: cannot grow buffer beyond 2 gigabytes.");let n=e<<1,s=lr.allocate(n);return s.setPosition(n-e),s.bytes().set(t.bytes(),n-e),s}addOffset(t){this.prep(4,0),this.writeInt32(this.offset()-t+4)}startObject(t){this.notNested(),this.vtable==null&&(this.vtable=[]),this.vtable_in_use=t;for(let e=0;e<t;e++)this.vtable[e]=0;this.isNested=!0,this.object_start=this.offset()}endObject(){if(this.vtable==null||!this.isNested)throw new Error("FlatBuffers: endObject called without startObject");this.addInt32(0);let t=this.offset(),e=this.vtable_in_use-1;for(;e>=0&&this.vtable[e]==0;e--);let n=e+1;for(;e>=0;e--)this.addInt16(this.vtable[e]!=0?t-this.vtable[e]:0);let s=2;this.addInt16(t-this.object_start);let r=(n+s)*2;this.addInt16(r);let o=0,a=this.space;t:for(e=0;e<this.vtables.length;e++){let c=this.bb.capacity()-this.vtables[e];if(r==this.bb.readInt16(c)){for(let l=2;l<r;l+=2)if(this.bb.readInt16(a+l)!=this.bb.readInt16(c+l))continue t;o=this.vtables[e];break}}return o?(this.space=this.bb.capacity()-t,this.bb.writeInt32(this.space,o-t)):(this.vtables.push(this.offset()),this.bb.writeInt32(this.bb.capacity()-t,this.offset()-t)),this.isNested=!1,t}finish(t,e,n){let s=n?4:0;if(e){let r=e;if(this.prep(this.minalign,8+s),r.length!=4)throw new TypeError("FlatBuffers: file identifier must be length "+4);for(let o=3;o>=0;o--)this.writeInt8(r.charCodeAt(o))}this.prep(this.minalign,4+s),this.addOffset(t),s&&this.addInt32(this.bb.capacity()-this.space),this.bb.setPosition(this.space)}finishSizePrefixed(t,e){this.finish(t,e,!0)}requiredField(t,e){let n=this.bb.capacity()-t,s=n-this.bb.readInt32(n);if(!(e<this.bb.readInt16(s)&&this.bb.readInt16(s+e)!=0))throw new TypeError("FlatBuffers: field "+e+" must be set")}startVector(t,e,n){this.notNested(),this.vector_num_elems=e,this.prep(4,t*e),this.prep(n,t*e)}endVector(){return this.writeInt32(this.vector_num_elems),this.offset()}createSharedString(t){if(!t)return 0;if(this.string_maps||(this.string_maps=new Map),this.string_maps.has(t))return this.string_maps.get(t);let e=this.createString(t);return this.string_maps.set(t,e),e}createString(t){if(t==null)return 0;let e;return t instanceof Uint8Array?e=t:e=this.text_encoder.encode(t),this.addInt8(0),this.startVector(1,e.length,1),this.bb.setPosition(this.space-=e.length),this.bb.bytes().set(e,this.space),this.endVector()}createByteVector(t){return t==null?0:(this.startVector(1,t.length,1),this.bb.setPosition(this.space-=t.length),this.bb.bytes().set(t,this.space),this.endVector())}createObjectOffset(t){return t===null?0:typeof t=="string"?this.createString(t):t.pack(this)}createObjectOffsetList(t){let e=[];for(let n=0;n<t.length;++n){let s=t[n];if(s!==null)e.push(this.createObjectOffset(s));else throw new TypeError("FlatBuffers: Argument for createObjectOffsetList cannot contain null.")}return e}createStructOffsetList(t,e){return e(this,t.length),this.createObjectOffsetList(t.slice().reverse()),this.endVector()}};function vo(i){let t=i.length;for(;--t>=0;)i[t]=0}var Aw=0,y_=1,Iw=2,Rw=3,Cw=258,lp=29,rl=256,Ka=rl+1+lp,bo=30,cp=19,v_=2*Ka+1,cr=15,zf=16,Pw=7,hp=256,S_=16,M_=17,w_=18,Qf=new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]),Wh=new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]),Lw=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]),E_=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),Dw=512,is=new Array((Ka+2)*2);vo(is);var Za=new Array(bo*2);vo(Za);var Ja=new Array(Dw);vo(Ja);var Qa=new Array(Cw-Rw+1);vo(Qa);var dp=new Array(lp);vo(dp);var Xh=new Array(bo);vo(Xh);function Vf(i,t,e,n,s){this.static_tree=i,this.extra_bits=t,this.extra_base=e,this.elems=n,this.max_length=s,this.has_stree=i&&i.length}var T_,A_,I_;function kf(i,t){this.dyn_tree=i,this.max_code=0,this.stat_desc=t}var R_=i=>i<256?Ja[i]:Ja[256+(i>>>7)],tl=(i,t)=>{i.pending_buf[i.pending++]=t&255,i.pending_buf[i.pending++]=t>>>8&255},Xn=(i,t,e)=>{i.bi_valid>zf-e?(i.bi_buf|=t<<i.bi_valid&65535,tl(i,i.bi_buf),i.bi_buf=t>>zf-i.bi_valid,i.bi_valid+=e-zf):(i.bi_buf|=t<<i.bi_valid&65535,i.bi_valid+=e)},Bi=(i,t,e)=>{Xn(i,e[t*2],e[t*2+1])},C_=(i,t)=>{let e=0;do e|=i&1,i>>>=1,e<<=1;while(--t>0);return e>>>1},Nw=i=>{i.bi_valid===16?(tl(i,i.bi_buf),i.bi_buf=0,i.bi_valid=0):i.bi_valid>=8&&(i.pending_buf[i.pending++]=i.bi_buf&255,i.bi_buf>>=8,i.bi_valid-=8)},Ow=(i,t)=>{let e=t.dyn_tree,n=t.max_code,s=t.stat_desc.static_tree,r=t.stat_desc.has_stree,o=t.stat_desc.extra_bits,a=t.stat_desc.extra_base,c=t.stat_desc.max_length,l,h,u,d,f,p,b=0;for(d=0;d<=cr;d++)i.bl_count[d]=0;for(e[i.heap[i.heap_max]*2+1]=0,l=i.heap_max+1;l<v_;l++)h=i.heap[l],d=e[e[h*2+1]*2+1]+1,d>c&&(d=c,b++),e[h*2+1]=d,!(h>n)&&(i.bl_count[d]++,f=0,h>=a&&(f=o[h-a]),p=e[h*2],i.opt_len+=p*(d+f),r&&(i.static_len+=p*(s[h*2+1]+f)));if(b!==0){do{for(d=c-1;i.bl_count[d]===0;)d--;i.bl_count[d]--,i.bl_count[d+1]+=2,i.bl_count[c]--,b-=2}while(b>0);for(d=c;d!==0;d--)for(h=i.bl_count[d];h!==0;)u=i.heap[--l],!(u>n)&&(e[u*2+1]!==d&&(i.opt_len+=(d-e[u*2+1])*e[u*2],e[u*2+1]=d),h--)}},P_=(i,t,e)=>{let n=new Array(cr+1),s=0,r,o;for(r=1;r<=cr;r++)s=s+e[r-1]<<1,n[r]=s;for(o=0;o<=t;o++){let a=i[o*2+1];a!==0&&(i[o*2]=C_(n[a]++,a))}},Uw=()=>{let i,t,e,n,s,r=new Array(cr+1);for(e=0,n=0;n<lp-1;n++)for(dp[n]=e,i=0;i<1<<Qf[n];i++)Qa[e++]=n;for(Qa[e-1]=n,s=0,n=0;n<16;n++)for(Xh[n]=s,i=0;i<1<<Wh[n];i++)Ja[s++]=n;for(s>>=7;n<bo;n++)for(Xh[n]=s<<7,i=0;i<1<<Wh[n]-7;i++)Ja[256+s++]=n;for(t=0;t<=cr;t++)r[t]=0;for(i=0;i<=143;)is[i*2+1]=8,i++,r[8]++;for(;i<=255;)is[i*2+1]=9,i++,r[9]++;for(;i<=279;)is[i*2+1]=7,i++,r[7]++;for(;i<=287;)is[i*2+1]=8,i++,r[8]++;for(P_(is,Ka+1,r),i=0;i<bo;i++)Za[i*2+1]=5,Za[i*2]=C_(i,5);T_=new Vf(is,Qf,rl+1,Ka,cr),A_=new Vf(Za,Wh,0,bo,cr),I_=new Vf(new Array(0),Lw,0,cp,Pw)},L_=i=>{let t;for(t=0;t<Ka;t++)i.dyn_ltree[t*2]=0;for(t=0;t<bo;t++)i.dyn_dtree[t*2]=0;for(t=0;t<cp;t++)i.bl_tree[t*2]=0;i.dyn_ltree[hp*2]=1,i.opt_len=i.static_len=0,i.sym_next=i.matches=0},D_=i=>{i.bi_valid>8?tl(i,i.bi_buf):i.bi_valid>0&&(i.pending_buf[i.pending++]=i.bi_buf),i.bi_buf=0,i.bi_valid=0},Ug=(i,t,e,n)=>{let s=t*2,r=e*2;return i[s]<i[r]||i[s]===i[r]&&n[t]<=n[e]},Hf=(i,t,e)=>{let n=i.heap[e],s=e<<1;for(;s<=i.heap_len&&(s<i.heap_len&&Ug(t,i.heap[s+1],i.heap[s],i.depth)&&s++,!Ug(t,n,i.heap[s],i.depth));)i.heap[e]=i.heap[s],e=s,s<<=1;i.heap[e]=n},Fg=(i,t,e)=>{let n,s,r=0,o,a;if(i.sym_next!==0)do n=i.pending_buf[i.sym_buf+r++]&255,n+=(i.pending_buf[i.sym_buf+r++]&255)<<8,s=i.pending_buf[i.sym_buf+r++],n===0?Bi(i,s,t):(o=Qa[s],Bi(i,o+rl+1,t),a=Qf[o],a!==0&&(s-=dp[o],Xn(i,s,a)),n--,o=R_(n),Bi(i,o,e),a=Wh[o],a!==0&&(n-=Xh[o],Xn(i,n,a)));while(r<i.sym_next);Bi(i,hp,t)},tp=(i,t)=>{let e=t.dyn_tree,n=t.stat_desc.static_tree,s=t.stat_desc.has_stree,r=t.stat_desc.elems,o,a,c=-1,l;for(i.heap_len=0,i.heap_max=v_,o=0;o<r;o++)e[o*2]!==0?(i.heap[++i.heap_len]=c=o,i.depth[o]=0):e[o*2+1]=0;for(;i.heap_len<2;)l=i.heap[++i.heap_len]=c<2?++c:0,e[l*2]=1,i.depth[l]=0,i.opt_len--,s&&(i.static_len-=n[l*2+1]);for(t.max_code=c,o=i.heap_len>>1;o>=1;o--)Hf(i,e,o);l=r;do o=i.heap[1],i.heap[1]=i.heap[i.heap_len--],Hf(i,e,1),a=i.heap[1],i.heap[--i.heap_max]=o,i.heap[--i.heap_max]=a,e[l*2]=e[o*2]+e[a*2],i.depth[l]=(i.depth[o]>=i.depth[a]?i.depth[o]:i.depth[a])+1,e[o*2+1]=e[a*2+1]=l,i.heap[1]=l++,Hf(i,e,1);while(i.heap_len>=2);i.heap[--i.heap_max]=i.heap[1],Ow(i,t),P_(e,c,i.bl_count)},Bg=(i,t,e)=>{let n,s=-1,r,o=t[0*2+1],a=0,c=7,l=4;for(o===0&&(c=138,l=3),t[(e+1)*2+1]=65535,n=0;n<=e;n++)r=o,o=t[(n+1)*2+1],!(++a<c&&r===o)&&(a<l?i.bl_tree[r*2]+=a:r!==0?(r!==s&&i.bl_tree[r*2]++,i.bl_tree[S_*2]++):a<=10?i.bl_tree[M_*2]++:i.bl_tree[w_*2]++,a=0,s=r,o===0?(c=138,l=3):r===o?(c=6,l=3):(c=7,l=4))},zg=(i,t,e)=>{let n,s=-1,r,o=t[0*2+1],a=0,c=7,l=4;for(o===0&&(c=138,l=3),n=0;n<=e;n++)if(r=o,o=t[(n+1)*2+1],!(++a<c&&r===o)){if(a<l)do Bi(i,r,i.bl_tree);while(--a!==0);else r!==0?(r!==s&&(Bi(i,r,i.bl_tree),a--),Bi(i,S_,i.bl_tree),Xn(i,a-3,2)):a<=10?(Bi(i,M_,i.bl_tree),Xn(i,a-3,3)):(Bi(i,w_,i.bl_tree),Xn(i,a-11,7));a=0,s=r,o===0?(c=138,l=3):r===o?(c=6,l=3):(c=7,l=4)}},Fw=i=>{let t;for(Bg(i,i.dyn_ltree,i.l_desc.max_code),Bg(i,i.dyn_dtree,i.d_desc.max_code),tp(i,i.bl_desc),t=cp-1;t>=3&&i.bl_tree[E_[t]*2+1]===0;t--);return i.opt_len+=3*(t+1)+5+5+4,t},Bw=(i,t,e,n)=>{let s;for(Xn(i,t-257,5),Xn(i,e-1,5),Xn(i,n-4,4),s=0;s<n;s++)Xn(i,i.bl_tree[E_[s]*2+1],3);zg(i,i.dyn_ltree,t-1),zg(i,i.dyn_dtree,e-1)},zw=i=>{let t=4093624447,e;for(e=0;e<=31;e++,t>>>=1)if(t&1&&i.dyn_ltree[e*2]!==0)return 0;if(i.dyn_ltree[9*2]!==0||i.dyn_ltree[10*2]!==0||i.dyn_ltree[13*2]!==0)return 1;for(e=32;e<rl;e++)if(i.dyn_ltree[e*2]!==0)return 1;return 0},Vg=!1,Vw=i=>{Vg||(Uw(),Vg=!0),i.l_desc=new kf(i.dyn_ltree,T_),i.d_desc=new kf(i.dyn_dtree,A_),i.bl_desc=new kf(i.bl_tree,I_),i.bi_buf=0,i.bi_valid=0,L_(i)},N_=(i,t,e,n)=>{Xn(i,(Aw<<1)+(n?1:0),3),D_(i),tl(i,e),tl(i,~e),e&&i.pending_buf.set(i.window.subarray(t,t+e),i.pending),i.pending+=e},kw=i=>{Xn(i,y_<<1,3),Bi(i,hp,is),Nw(i)},Hw=(i,t,e,n)=>{let s,r,o=0;i.level>0?(i.strm.data_type===2&&(i.strm.data_type=zw(i)),tp(i,i.l_desc),tp(i,i.d_desc),o=Fw(i),s=i.opt_len+3+7>>>3,r=i.static_len+3+7>>>3,r<=s&&(s=r)):s=r=e+5,e+4<=s&&t!==-1?N_(i,t,e,n):i.strategy===4||r===s?(Xn(i,(y_<<1)+(n?1:0),3),Fg(i,is,Za)):(Xn(i,(Iw<<1)+(n?1:0),3),Bw(i,i.l_desc.max_code+1,i.d_desc.max_code+1,o+1),Fg(i,i.dyn_ltree,i.dyn_dtree)),L_(i),n&&D_(i)},Gw=(i,t,e)=>(i.pending_buf[i.sym_buf+i.sym_next++]=t,i.pending_buf[i.sym_buf+i.sym_next++]=t>>8,i.pending_buf[i.sym_buf+i.sym_next++]=e,t===0?i.dyn_ltree[e*2]++:(i.matches++,t--,i.dyn_ltree[(Qa[e]+rl+1)*2]++,i.dyn_dtree[R_(t)*2]++),i.sym_next===i.sym_end),Ww=Vw,Xw=N_,qw=Hw,Yw=Gw,Zw=kw,$w={_tr_init:Ww,_tr_stored_block:Xw,_tr_flush_block:qw,_tr_tally:Yw,_tr_align:Zw},jw=(i,t,e,n)=>{let s=i&65535|0,r=i>>>16&65535|0,o=0;for(;e!==0;){o=e>2e3?2e3:e,e-=o;do s=s+t[n++]|0,r=r+s|0;while(--o);s%=65521,r%=65521}return s|r<<16|0},el=jw,Kw=()=>{let i,t=[];for(var e=0;e<256;e++){i=e;for(var n=0;n<8;n++)i=i&1?3988292384^i>>>1:i>>>1;t[e]=i}return t},Jw=new Uint32Array(Kw()),Qw=(i,t,e,n)=>{let s=Jw,r=n+e;i^=-1;for(let o=n;o<r;o++)i=i>>>8^s[(i^t[o])&255];return i^-1},fn=Qw,ur={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},ol={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_MEM_ERROR:-4,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8},{_tr_init:tE,_tr_stored_block:ep,_tr_flush_block:eE,_tr_tally:Ns,_tr_align:nE}=$w,{Z_NO_FLUSH:Os,Z_PARTIAL_FLUSH:iE,Z_FULL_FLUSH:sE,Z_FINISH:ai,Z_BLOCK:kg,Z_OK:Sn,Z_STREAM_END:Hg,Z_STREAM_ERROR:zi,Z_DATA_ERROR:rE,Z_BUF_ERROR:Gf,Z_DEFAULT_COMPRESSION:oE,Z_FILTERED:aE,Z_HUFFMAN_ONLY:zh,Z_RLE:lE,Z_FIXED:cE,Z_DEFAULT_STRATEGY:hE,Z_UNKNOWN:dE,Z_DEFLATED:Zh}=ol,uE=9,fE=15,pE=8,mE=29,gE=256,np=gE+1+mE,_E=30,bE=19,xE=2*np+1,yE=15,he=3,Ds=258,Vi=Ds+he+1,vE=32,xo=42,up=57,ip=69,sp=73,rp=91,op=103,hr=113,qa=666,Un=1,So=2,fr=3,Mo=4,SE=3,dr=(i,t)=>(i.msg=ur[t],t),Gg=i=>i*2-(i>4?9:0),Ls=i=>{let t=i.length;for(;--t>=0;)i[t]=0},ME=i=>{let t,e,n,s=i.w_size;t=i.hash_size,n=t;do e=i.head[--n],i.head[n]=e>=s?e-s:0;while(--t);t=s,n=t;do e=i.prev[--n],i.prev[n]=e>=s?e-s:0;while(--t)},wE=(i,t,e)=>(t<<i.hash_shift^e)&i.hash_mask,Us=wE,Qn=i=>{let t=i.state,e=t.pending;e>i.avail_out&&(e=i.avail_out),e!==0&&(i.output.set(t.pending_buf.subarray(t.pending_out,t.pending_out+e),i.next_out),i.next_out+=e,t.pending_out+=e,i.total_out+=e,i.avail_out-=e,t.pending-=e,t.pending===0&&(t.pending_out=0))},ti=(i,t)=>{eE(i,i.block_start>=0?i.block_start:-1,i.strstart-i.block_start,t),i.block_start=i.strstart,Qn(i.strm)},be=(i,t)=>{i.pending_buf[i.pending++]=t},Xa=(i,t)=>{i.pending_buf[i.pending++]=t>>>8&255,i.pending_buf[i.pending++]=t&255},ap=(i,t,e,n)=>{let s=i.avail_in;return s>n&&(s=n),s===0?0:(i.avail_in-=s,t.set(i.input.subarray(i.next_in,i.next_in+s),e),i.state.wrap===1?i.adler=el(i.adler,t,s,e):i.state.wrap===2&&(i.adler=fn(i.adler,t,s,e)),i.next_in+=s,i.total_in+=s,s)},O_=(i,t)=>{let e=i.max_chain_length,n=i.strstart,s,r,o=i.prev_length,a=i.nice_match,c=i.strstart>i.w_size-Vi?i.strstart-(i.w_size-Vi):0,l=i.window,h=i.w_mask,u=i.prev,d=i.strstart+Ds,f=l[n+o-1],p=l[n+o];i.prev_length>=i.good_match&&(e>>=2),a>i.lookahead&&(a=i.lookahead);do if(s=t,!(l[s+o]!==p||l[s+o-1]!==f||l[s]!==l[n]||l[++s]!==l[n+1])){n+=2,s++;do;while(l[++n]===l[++s]&&l[++n]===l[++s]&&l[++n]===l[++s]&&l[++n]===l[++s]&&l[++n]===l[++s]&&l[++n]===l[++s]&&l[++n]===l[++s]&&l[++n]===l[++s]&&n<d);if(r=Ds-(d-n),n=d-Ds,r>o){if(i.match_start=t,o=r,r>=a)break;f=l[n+o-1],p=l[n+o]}}while((t=u[t&h])>c&&--e!==0);return o<=i.lookahead?o:i.lookahead},yo=i=>{let t=i.w_size,e,n,s;do{if(n=i.window_size-i.lookahead-i.strstart,i.strstart>=t+(t-Vi)&&(i.window.set(i.window.subarray(t,t+t-n),0),i.match_start-=t,i.strstart-=t,i.block_start-=t,i.insert>i.strstart&&(i.insert=i.strstart),ME(i),n+=t),i.strm.avail_in===0)break;if(e=ap(i.strm,i.window,i.strstart+i.lookahead,n),i.lookahead+=e,i.lookahead+i.insert>=he)for(s=i.strstart-i.insert,i.ins_h=i.window[s],i.ins_h=Us(i,i.ins_h,i.window[s+1]);i.insert&&(i.ins_h=Us(i,i.ins_h,i.window[s+he-1]),i.prev[s&i.w_mask]=i.head[i.ins_h],i.head[i.ins_h]=s,s++,i.insert--,!(i.lookahead+i.insert<he)););}while(i.lookahead<Vi&&i.strm.avail_in!==0)},U_=(i,t)=>{let e=i.pending_buf_size-5>i.w_size?i.w_size:i.pending_buf_size-5,n,s,r,o=0,a=i.strm.avail_in;do{if(n=65535,r=i.bi_valid+42>>3,i.strm.avail_out<r||(r=i.strm.avail_out-r,s=i.strstart-i.block_start,n>s+i.strm.avail_in&&(n=s+i.strm.avail_in),n>r&&(n=r),n<e&&(n===0&&t!==ai||t===Os||n!==s+i.strm.avail_in)))break;o=t===ai&&n===s+i.strm.avail_in?1:0,ep(i,0,0,o),i.pending_buf[i.pending-4]=n,i.pending_buf[i.pending-3]=n>>8,i.pending_buf[i.pending-2]=~n,i.pending_buf[i.pending-1]=~n>>8,Qn(i.strm),s&&(s>n&&(s=n),i.strm.output.set(i.window.subarray(i.block_start,i.block_start+s),i.strm.next_out),i.strm.next_out+=s,i.strm.avail_out-=s,i.strm.total_out+=s,i.block_start+=s,n-=s),n&&(ap(i.strm,i.strm.output,i.strm.next_out,n),i.strm.next_out+=n,i.strm.avail_out-=n,i.strm.total_out+=n)}while(o===0);return a-=i.strm.avail_in,a&&(a>=i.w_size?(i.matches=2,i.window.set(i.strm.input.subarray(i.strm.next_in-i.w_size,i.strm.next_in),0),i.strstart=i.w_size,i.insert=i.strstart):(i.window_size-i.strstart<=a&&(i.strstart-=i.w_size,i.window.set(i.window.subarray(i.w_size,i.w_size+i.strstart),0),i.matches<2&&i.matches++,i.insert>i.strstart&&(i.insert=i.strstart)),i.window.set(i.strm.input.subarray(i.strm.next_in-a,i.strm.next_in),i.strstart),i.strstart+=a,i.insert+=a>i.w_size-i.insert?i.w_size-i.insert:a),i.block_start=i.strstart),i.high_water<i.strstart&&(i.high_water=i.strstart),o?Mo:t!==Os&&t!==ai&&i.strm.avail_in===0&&i.strstart===i.block_start?So:(r=i.window_size-i.strstart,i.strm.avail_in>r&&i.block_start>=i.w_size&&(i.block_start-=i.w_size,i.strstart-=i.w_size,i.window.set(i.window.subarray(i.w_size,i.w_size+i.strstart),0),i.matches<2&&i.matches++,r+=i.w_size,i.insert>i.strstart&&(i.insert=i.strstart)),r>i.strm.avail_in&&(r=i.strm.avail_in),r&&(ap(i.strm,i.window,i.strstart,r),i.strstart+=r,i.insert+=r>i.w_size-i.insert?i.w_size-i.insert:r),i.high_water<i.strstart&&(i.high_water=i.strstart),r=i.bi_valid+42>>3,r=i.pending_buf_size-r>65535?65535:i.pending_buf_size-r,e=r>i.w_size?i.w_size:r,s=i.strstart-i.block_start,(s>=e||(s||t===ai)&&t!==Os&&i.strm.avail_in===0&&s<=r)&&(n=s>r?r:s,o=t===ai&&i.strm.avail_in===0&&n===s?1:0,ep(i,i.block_start,n,o),i.block_start+=n,Qn(i.strm)),o?fr:Un)},Wf=(i,t)=>{let e,n;for(;;){if(i.lookahead<Vi){if(yo(i),i.lookahead<Vi&&t===Os)return Un;if(i.lookahead===0)break}if(e=0,i.lookahead>=he&&(i.ins_h=Us(i,i.ins_h,i.window[i.strstart+he-1]),e=i.prev[i.strstart&i.w_mask]=i.head[i.ins_h],i.head[i.ins_h]=i.strstart),e!==0&&i.strstart-e<=i.w_size-Vi&&(i.match_length=O_(i,e)),i.match_length>=he)if(n=Ns(i,i.strstart-i.match_start,i.match_length-he),i.lookahead-=i.match_length,i.match_length<=i.max_lazy_match&&i.lookahead>=he){i.match_length--;do i.strstart++,i.ins_h=Us(i,i.ins_h,i.window[i.strstart+he-1]),e=i.prev[i.strstart&i.w_mask]=i.head[i.ins_h],i.head[i.ins_h]=i.strstart;while(--i.match_length!==0);i.strstart++}else i.strstart+=i.match_length,i.match_length=0,i.ins_h=i.window[i.strstart],i.ins_h=Us(i,i.ins_h,i.window[i.strstart+1]);else n=Ns(i,0,i.window[i.strstart]),i.lookahead--,i.strstart++;if(n&&(ti(i,!1),i.strm.avail_out===0))return Un}return i.insert=i.strstart<he-1?i.strstart:he-1,t===ai?(ti(i,!0),i.strm.avail_out===0?fr:Mo):i.sym_next&&(ti(i,!1),i.strm.avail_out===0)?Un:So},go=(i,t)=>{let e,n,s;for(;;){if(i.lookahead<Vi){if(yo(i),i.lookahead<Vi&&t===Os)return Un;if(i.lookahead===0)break}if(e=0,i.lookahead>=he&&(i.ins_h=Us(i,i.ins_h,i.window[i.strstart+he-1]),e=i.prev[i.strstart&i.w_mask]=i.head[i.ins_h],i.head[i.ins_h]=i.strstart),i.prev_length=i.match_length,i.prev_match=i.match_start,i.match_length=he-1,e!==0&&i.prev_length<i.max_lazy_match&&i.strstart-e<=i.w_size-Vi&&(i.match_length=O_(i,e),i.match_length<=5&&(i.strategy===aE||i.match_length===he&&i.strstart-i.match_start>4096)&&(i.match_length=he-1)),i.prev_length>=he&&i.match_length<=i.prev_length){s=i.strstart+i.lookahead-he,n=Ns(i,i.strstart-1-i.prev_match,i.prev_length-he),i.lookahead-=i.prev_length-1,i.prev_length-=2;do++i.strstart<=s&&(i.ins_h=Us(i,i.ins_h,i.window[i.strstart+he-1]),e=i.prev[i.strstart&i.w_mask]=i.head[i.ins_h],i.head[i.ins_h]=i.strstart);while(--i.prev_length!==0);if(i.match_available=0,i.match_length=he-1,i.strstart++,n&&(ti(i,!1),i.strm.avail_out===0))return Un}else if(i.match_available){if(n=Ns(i,0,i.window[i.strstart-1]),n&&ti(i,!1),i.strstart++,i.lookahead--,i.strm.avail_out===0)return Un}else i.match_available=1,i.strstart++,i.lookahead--}return i.match_available&&(n=Ns(i,0,i.window[i.strstart-1]),i.match_available=0),i.insert=i.strstart<he-1?i.strstart:he-1,t===ai?(ti(i,!0),i.strm.avail_out===0?fr:Mo):i.sym_next&&(ti(i,!1),i.strm.avail_out===0)?Un:So},EE=(i,t)=>{let e,n,s,r,o=i.window;for(;;){if(i.lookahead<=Ds){if(yo(i),i.lookahead<=Ds&&t===Os)return Un;if(i.lookahead===0)break}if(i.match_length=0,i.lookahead>=he&&i.strstart>0&&(s=i.strstart-1,n=o[s],n===o[++s]&&n===o[++s]&&n===o[++s])){r=i.strstart+Ds;do;while(n===o[++s]&&n===o[++s]&&n===o[++s]&&n===o[++s]&&n===o[++s]&&n===o[++s]&&n===o[++s]&&n===o[++s]&&s<r);i.match_length=Ds-(r-s),i.match_length>i.lookahead&&(i.match_length=i.lookahead)}if(i.match_length>=he?(e=Ns(i,1,i.match_length-he),i.lookahead-=i.match_length,i.strstart+=i.match_length,i.match_length=0):(e=Ns(i,0,i.window[i.strstart]),i.lookahead--,i.strstart++),e&&(ti(i,!1),i.strm.avail_out===0))return Un}return i.insert=0,t===ai?(ti(i,!0),i.strm.avail_out===0?fr:Mo):i.sym_next&&(ti(i,!1),i.strm.avail_out===0)?Un:So},TE=(i,t)=>{let e;for(;;){if(i.lookahead===0&&(yo(i),i.lookahead===0)){if(t===Os)return Un;break}if(i.match_length=0,e=Ns(i,0,i.window[i.strstart]),i.lookahead--,i.strstart++,e&&(ti(i,!1),i.strm.avail_out===0))return Un}return i.insert=0,t===ai?(ti(i,!0),i.strm.avail_out===0?fr:Mo):i.sym_next&&(ti(i,!1),i.strm.avail_out===0)?Un:So};function Fi(i,t,e,n,s){this.good_length=i,this.max_lazy=t,this.nice_length=e,this.max_chain=n,this.func=s}var Ya=[new Fi(0,0,0,0,U_),new Fi(4,4,8,4,Wf),new Fi(4,5,16,8,Wf),new Fi(4,6,32,32,Wf),new Fi(4,4,16,16,go),new Fi(8,16,32,32,go),new Fi(8,16,128,128,go),new Fi(8,32,128,256,go),new Fi(32,128,258,1024,go),new Fi(32,258,258,4096,go)],AE=i=>{i.window_size=2*i.w_size,Ls(i.head),i.max_lazy_match=Ya[i.level].max_lazy,i.good_match=Ya[i.level].good_length,i.nice_match=Ya[i.level].nice_length,i.max_chain_length=Ya[i.level].max_chain,i.strstart=0,i.block_start=0,i.lookahead=0,i.insert=0,i.match_length=i.prev_length=he-1,i.match_available=0,i.ins_h=0};function IE(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=Zh,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new Uint16Array(xE*2),this.dyn_dtree=new Uint16Array((2*_E+1)*2),this.bl_tree=new Uint16Array((2*bE+1)*2),Ls(this.dyn_ltree),Ls(this.dyn_dtree),Ls(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new Uint16Array(yE+1),this.heap=new Uint16Array(2*np+1),Ls(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new Uint16Array(2*np+1),Ls(this.depth),this.sym_buf=0,this.lit_bufsize=0,this.sym_next=0,this.sym_end=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}var al=i=>{if(!i)return 1;let t=i.state;return!t||t.strm!==i||t.status!==xo&&t.status!==up&&t.status!==ip&&t.status!==sp&&t.status!==rp&&t.status!==op&&t.status!==hr&&t.status!==qa?1:0},F_=i=>{if(al(i))return dr(i,zi);i.total_in=i.total_out=0,i.data_type=dE;let t=i.state;return t.pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap===2?up:t.wrap?xo:hr,i.adler=t.wrap===2?0:1,t.last_flush=-2,tE(t),Sn},B_=i=>{let t=F_(i);return t===Sn&&AE(i.state),t},RE=(i,t)=>al(i)||i.state.wrap!==2?zi:(i.state.gzhead=t,Sn),z_=(i,t,e,n,s,r)=>{if(!i)return zi;let o=1;if(t===oE&&(t=6),n<0?(o=0,n=-n):n>15&&(o=2,n-=16),s<1||s>uE||e!==Zh||n<8||n>15||t<0||t>9||r<0||r>cE||n===8&&o!==1)return dr(i,zi);n===8&&(n=9);let a=new IE;return i.state=a,a.strm=i,a.status=xo,a.wrap=o,a.gzhead=null,a.w_bits=n,a.w_size=1<<a.w_bits,a.w_mask=a.w_size-1,a.hash_bits=s+7,a.hash_size=1<<a.hash_bits,a.hash_mask=a.hash_size-1,a.hash_shift=~~((a.hash_bits+he-1)/he),a.window=new Uint8Array(a.w_size*2),a.head=new Uint16Array(a.hash_size),a.prev=new Uint16Array(a.w_size),a.lit_bufsize=1<<s+6,a.pending_buf_size=a.lit_bufsize*4,a.pending_buf=new Uint8Array(a.pending_buf_size),a.sym_buf=a.lit_bufsize,a.sym_end=(a.lit_bufsize-1)*3,a.level=t,a.strategy=r,a.method=e,B_(i)},CE=(i,t)=>z_(i,t,Zh,fE,pE,hE),PE=(i,t)=>{if(al(i)||t>kg||t<0)return i?dr(i,zi):zi;let e=i.state;if(!i.output||i.avail_in!==0&&!i.input||e.status===qa&&t!==ai)return dr(i,i.avail_out===0?Gf:zi);let n=e.last_flush;if(e.last_flush=t,e.pending!==0){if(Qn(i),i.avail_out===0)return e.last_flush=-1,Sn}else if(i.avail_in===0&&Gg(t)<=Gg(n)&&t!==ai)return dr(i,Gf);if(e.status===qa&&i.avail_in!==0)return dr(i,Gf);if(e.status===xo&&e.wrap===0&&(e.status=hr),e.status===xo){let s=Zh+(e.w_bits-8<<4)<<8,r=-1;if(e.strategy>=zh||e.level<2?r=0:e.level<6?r=1:e.level===6?r=2:r=3,s|=r<<6,e.strstart!==0&&(s|=vE),s+=31-s%31,Xa(e,s),e.strstart!==0&&(Xa(e,i.adler>>>16),Xa(e,i.adler&65535)),i.adler=1,e.status=hr,Qn(i),e.pending!==0)return e.last_flush=-1,Sn}if(e.status===up){if(i.adler=0,be(e,31),be(e,139),be(e,8),e.gzhead)be(e,(e.gzhead.text?1:0)+(e.gzhead.hcrc?2:0)+(e.gzhead.extra?4:0)+(e.gzhead.name?8:0)+(e.gzhead.comment?16:0)),be(e,e.gzhead.time&255),be(e,e.gzhead.time>>8&255),be(e,e.gzhead.time>>16&255),be(e,e.gzhead.time>>24&255),be(e,e.level===9?2:e.strategy>=zh||e.level<2?4:0),be(e,e.gzhead.os&255),e.gzhead.extra&&e.gzhead.extra.length&&(be(e,e.gzhead.extra.length&255),be(e,e.gzhead.extra.length>>8&255)),e.gzhead.hcrc&&(i.adler=fn(i.adler,e.pending_buf,e.pending,0)),e.gzindex=0,e.status=ip;else if(be(e,0),be(e,0),be(e,0),be(e,0),be(e,0),be(e,e.level===9?2:e.strategy>=zh||e.level<2?4:0),be(e,SE),e.status=hr,Qn(i),e.pending!==0)return e.last_flush=-1,Sn}if(e.status===ip){if(e.gzhead.extra){let s=e.pending,r=(e.gzhead.extra.length&65535)-e.gzindex;for(;e.pending+r>e.pending_buf_size;){let a=e.pending_buf_size-e.pending;if(e.pending_buf.set(e.gzhead.extra.subarray(e.gzindex,e.gzindex+a),e.pending),e.pending=e.pending_buf_size,e.gzhead.hcrc&&e.pending>s&&(i.adler=fn(i.adler,e.pending_buf,e.pending-s,s)),e.gzindex+=a,Qn(i),e.pending!==0)return e.last_flush=-1,Sn;s=0,r-=a}let o=new Uint8Array(e.gzhead.extra);e.pending_buf.set(o.subarray(e.gzindex,e.gzindex+r),e.pending),e.pending+=r,e.gzhead.hcrc&&e.pending>s&&(i.adler=fn(i.adler,e.pending_buf,e.pending-s,s)),e.gzindex=0}e.status=sp}if(e.status===sp){if(e.gzhead.name){let s=e.pending,r;do{if(e.pending===e.pending_buf_size){if(e.gzhead.hcrc&&e.pending>s&&(i.adler=fn(i.adler,e.pending_buf,e.pending-s,s)),Qn(i),e.pending!==0)return e.last_flush=-1,Sn;s=0}e.gzindex<e.gzhead.name.length?r=e.gzhead.name.charCodeAt(e.gzindex++)&255:r=0,be(e,r)}while(r!==0);e.gzhead.hcrc&&e.pending>s&&(i.adler=fn(i.adler,e.pending_buf,e.pending-s,s)),e.gzindex=0}e.status=rp}if(e.status===rp){if(e.gzhead.comment){let s=e.pending,r;do{if(e.pending===e.pending_buf_size){if(e.gzhead.hcrc&&e.pending>s&&(i.adler=fn(i.adler,e.pending_buf,e.pending-s,s)),Qn(i),e.pending!==0)return e.last_flush=-1,Sn;s=0}e.gzindex<e.gzhead.comment.length?r=e.gzhead.comment.charCodeAt(e.gzindex++)&255:r=0,be(e,r)}while(r!==0);e.gzhead.hcrc&&e.pending>s&&(i.adler=fn(i.adler,e.pending_buf,e.pending-s,s))}e.status=op}if(e.status===op){if(e.gzhead.hcrc){if(e.pending+2>e.pending_buf_size&&(Qn(i),e.pending!==0))return e.last_flush=-1,Sn;be(e,i.adler&255),be(e,i.adler>>8&255),i.adler=0}if(e.status=hr,Qn(i),e.pending!==0)return e.last_flush=-1,Sn}if(i.avail_in!==0||e.lookahead!==0||t!==Os&&e.status!==qa){let s=e.level===0?U_(e,t):e.strategy===zh?TE(e,t):e.strategy===lE?EE(e,t):Ya[e.level].func(e,t);if((s===fr||s===Mo)&&(e.status=qa),s===Un||s===fr)return i.avail_out===0&&(e.last_flush=-1),Sn;if(s===So&&(t===iE?nE(e):t!==kg&&(ep(e,0,0,!1),t===sE&&(Ls(e.head),e.lookahead===0&&(e.strstart=0,e.block_start=0,e.insert=0))),Qn(i),i.avail_out===0))return e.last_flush=-1,Sn}return t!==ai?Sn:e.wrap<=0?Hg:(e.wrap===2?(be(e,i.adler&255),be(e,i.adler>>8&255),be(e,i.adler>>16&255),be(e,i.adler>>24&255),be(e,i.total_in&255),be(e,i.total_in>>8&255),be(e,i.total_in>>16&255),be(e,i.total_in>>24&255)):(Xa(e,i.adler>>>16),Xa(e,i.adler&65535)),Qn(i),e.wrap>0&&(e.wrap=-e.wrap),e.pending!==0?Sn:Hg)},LE=i=>{if(al(i))return zi;let t=i.state.status;return i.state=null,t===hr?dr(i,rE):Sn},DE=(i,t)=>{let e=t.length;if(al(i))return zi;let n=i.state,s=n.wrap;if(s===2||s===1&&n.status!==xo||n.lookahead)return zi;if(s===1&&(i.adler=el(i.adler,t,e,0)),n.wrap=0,e>=n.w_size){s===0&&(Ls(n.head),n.strstart=0,n.block_start=0,n.insert=0);let c=new Uint8Array(n.w_size);c.set(t.subarray(e-n.w_size,e),0),t=c,e=n.w_size}let r=i.avail_in,o=i.next_in,a=i.input;for(i.avail_in=e,i.next_in=0,i.input=t,yo(n);n.lookahead>=he;){let c=n.strstart,l=n.lookahead-(he-1);do n.ins_h=Us(n,n.ins_h,n.window[c+he-1]),n.prev[c&n.w_mask]=n.head[n.ins_h],n.head[n.ins_h]=c,c++;while(--l);n.strstart=c,n.lookahead=he-1,yo(n)}return n.strstart+=n.lookahead,n.block_start=n.strstart,n.insert=n.lookahead,n.lookahead=0,n.match_length=n.prev_length=he-1,n.match_available=0,i.next_in=o,i.input=a,i.avail_in=r,n.wrap=s,Sn},NE=CE,OE=z_,UE=B_,FE=F_,BE=RE,zE=PE,VE=LE,kE=DE,HE="pako deflate (from Nodeca project)",$a={deflateInit:NE,deflateInit2:OE,deflateReset:UE,deflateResetKeep:FE,deflateSetHeader:BE,deflate:zE,deflateEnd:VE,deflateSetDictionary:kE,deflateInfo:HE},GE=(i,t)=>Object.prototype.hasOwnProperty.call(i,t),WE=function(i){let t=Array.prototype.slice.call(arguments,1);for(;t.length;){let e=t.shift();if(e){if(typeof e!="object")throw new TypeError(e+"must be non-object");for(let n in e)GE(e,n)&&(i[n]=e[n])}}return i},XE=i=>{let t=0;for(let n=0,s=i.length;n<s;n++)t+=i[n].length;let e=new Uint8Array(t);for(let n=0,s=0,r=i.length;n<r;n++){let o=i[n];e.set(o,s),s+=o.length}return e},$h={assign:WE,flattenChunks:XE},V_=!0;try{String.fromCharCode.apply(null,new Uint8Array(1))}catch{V_=!1}var nl=new Uint8Array(256);for(let i=0;i<256;i++)nl[i]=i>=252?6:i>=248?5:i>=240?4:i>=224?3:i>=192?2:1;nl[254]=nl[254]=1;var qE=i=>{if(typeof TextEncoder=="function"&&TextEncoder.prototype.encode)return new TextEncoder().encode(i);let t,e,n,s,r,o=i.length,a=0;for(s=0;s<o;s++)e=i.charCodeAt(s),(e&64512)===55296&&s+1<o&&(n=i.charCodeAt(s+1),(n&64512)===56320&&(e=65536+(e-55296<<10)+(n-56320),s++)),a+=e<128?1:e<2048?2:e<65536?3:4;for(t=new Uint8Array(a),r=0,s=0;r<a;s++)e=i.charCodeAt(s),(e&64512)===55296&&s+1<o&&(n=i.charCodeAt(s+1),(n&64512)===56320&&(e=65536+(e-55296<<10)+(n-56320),s++)),e<128?t[r++]=e:e<2048?(t[r++]=192|e>>>6,t[r++]=128|e&63):e<65536?(t[r++]=224|e>>>12,t[r++]=128|e>>>6&63,t[r++]=128|e&63):(t[r++]=240|e>>>18,t[r++]=128|e>>>12&63,t[r++]=128|e>>>6&63,t[r++]=128|e&63);return t},YE=(i,t)=>{if(t<65534&&i.subarray&&V_)return String.fromCharCode.apply(null,i.length===t?i:i.subarray(0,t));let e="";for(let n=0;n<t;n++)e+=String.fromCharCode(i[n]);return e},ZE=(i,t)=>{let e=t||i.length;if(typeof TextDecoder=="function"&&TextDecoder.prototype.decode)return new TextDecoder().decode(i.subarray(0,t));let n,s,r=new Array(e*2);for(s=0,n=0;n<e;){let o=i[n++];if(o<128){r[s++]=o;continue}let a=nl[o];if(a>4){r[s++]=65533,n+=a-1;continue}for(o&=a===2?31:a===3?15:7;a>1&&n<e;)o=o<<6|i[n++]&63,a--;if(a>1){r[s++]=65533;continue}o<65536?r[s++]=o:(o-=65536,r[s++]=55296|o>>10&1023,r[s++]=56320|o&1023)}return YE(r,s)},$E=(i,t)=>{t=t||i.length,t>i.length&&(t=i.length);let e=t-1;for(;e>=0&&(i[e]&192)===128;)e--;return e<0||e===0?t:e+nl[i[e]]>t?e:t},il={string2buf:qE,buf2string:ZE,utf8border:$E};function jE(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}var k_=jE,H_=Object.prototype.toString,{Z_NO_FLUSH:KE,Z_SYNC_FLUSH:JE,Z_FULL_FLUSH:QE,Z_FINISH:tT,Z_OK:qh,Z_STREAM_END:eT,Z_DEFAULT_COMPRESSION:nT,Z_DEFAULT_STRATEGY:iT,Z_DEFLATED:sT}=ol;function ll(i){this.options=$h.assign({level:nT,method:sT,chunkSize:16384,windowBits:15,memLevel:8,strategy:iT},i||{});let t=this.options;t.raw&&t.windowBits>0?t.windowBits=-t.windowBits:t.gzip&&t.windowBits>0&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new k_,this.strm.avail_out=0;let e=$a.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(e!==qh)throw new Error(ur[e]);if(t.header&&$a.deflateSetHeader(this.strm,t.header),t.dictionary){let n;if(typeof t.dictionary=="string"?n=il.string2buf(t.dictionary):H_.call(t.dictionary)==="[object ArrayBuffer]"?n=new Uint8Array(t.dictionary):n=t.dictionary,e=$a.deflateSetDictionary(this.strm,n),e!==qh)throw new Error(ur[e]);this._dict_set=!0}}ll.prototype.push=function(i,t){let e=this.strm,n=this.options.chunkSize,s,r;if(this.ended)return!1;for(t===~~t?r=t:r=t===!0?tT:KE,typeof i=="string"?e.input=il.string2buf(i):H_.call(i)==="[object ArrayBuffer]"?e.input=new Uint8Array(i):e.input=i,e.next_in=0,e.avail_in=e.input.length;;){if(e.avail_out===0&&(e.output=new Uint8Array(n),e.next_out=0,e.avail_out=n),(r===JE||r===QE)&&e.avail_out<=6){this.onData(e.output.subarray(0,e.next_out)),e.avail_out=0;continue}if(s=$a.deflate(e,r),s===eT)return e.next_out>0&&this.onData(e.output.subarray(0,e.next_out)),s=$a.deflateEnd(this.strm),this.onEnd(s),this.ended=!0,s===qh;if(e.avail_out===0){this.onData(e.output);continue}if(r>0&&e.next_out>0){this.onData(e.output.subarray(0,e.next_out)),e.avail_out=0;continue}if(e.avail_in===0)break}return!0};ll.prototype.onData=function(i){this.chunks.push(i)};ll.prototype.onEnd=function(i){i===qh&&(this.result=$h.flattenChunks(this.chunks)),this.chunks=[],this.err=i,this.msg=this.strm.msg};function fp(i,t){let e=new ll(t);if(e.push(i,!0),e.err)throw e.msg||ur[e.err];return e.result}function rT(i,t){return t=t||{},t.raw=!0,fp(i,t)}function oT(i,t){return t=t||{},t.gzip=!0,fp(i,t)}var aT=ll,lT=fp,cT=rT,hT=oT,dT={Deflate:aT,deflate:lT,deflateRaw:cT,gzip:hT},Vh=16209,uT=16191,fT=function(t,e){let n,s,r,o,a,c,l,h,u,d,f,p,b,g,m,M,w,_,E,T,I,y,A,L,N=t.state;n=t.next_in,A=t.input,s=n+(t.avail_in-5),r=t.next_out,L=t.output,o=r-(e-t.avail_out),a=r+(t.avail_out-257),c=N.dmax,l=N.wsize,h=N.whave,u=N.wnext,d=N.window,f=N.hold,p=N.bits,b=N.lencode,g=N.distcode,m=(1<<N.lenbits)-1,M=(1<<N.distbits)-1;t:do{p<15&&(f+=A[n++]<<p,p+=8,f+=A[n++]<<p,p+=8),w=b[f&m];e:for(;;){if(_=w>>>24,f>>>=_,p-=_,_=w>>>16&255,_===0)L[r++]=w&65535;else if(_&16){E=w&65535,_&=15,_&&(p<_&&(f+=A[n++]<<p,p+=8),E+=f&(1<<_)-1,f>>>=_,p-=_),p<15&&(f+=A[n++]<<p,p+=8,f+=A[n++]<<p,p+=8),w=g[f&M];n:for(;;){if(_=w>>>24,f>>>=_,p-=_,_=w>>>16&255,_&16){if(T=w&65535,_&=15,p<_&&(f+=A[n++]<<p,p+=8,p<_&&(f+=A[n++]<<p,p+=8)),T+=f&(1<<_)-1,T>c){t.msg="invalid distance too far back",N.mode=Vh;break t}if(f>>>=_,p-=_,_=r-o,T>_){if(_=T-_,_>h&&N.sane){t.msg="invalid distance too far back",N.mode=Vh;break t}if(I=0,y=d,u===0){if(I+=l-_,_<E){E-=_;do L[r++]=d[I++];while(--_);I=r-T,y=L}}else if(u<_){if(I+=l+u-_,_-=u,_<E){E-=_;do L[r++]=d[I++];while(--_);if(I=0,u<E){_=u,E-=_;do L[r++]=d[I++];while(--_);I=r-T,y=L}}}else if(I+=u-_,_<E){E-=_;do L[r++]=d[I++];while(--_);I=r-T,y=L}for(;E>2;)L[r++]=y[I++],L[r++]=y[I++],L[r++]=y[I++],E-=3;E&&(L[r++]=y[I++],E>1&&(L[r++]=y[I++]))}else{I=r-T;do L[r++]=L[I++],L[r++]=L[I++],L[r++]=L[I++],E-=3;while(E>2);E&&(L[r++]=L[I++],E>1&&(L[r++]=L[I++]))}}else if(_&64){t.msg="invalid distance code",N.mode=Vh;break t}else{w=g[(w&65535)+(f&(1<<_)-1)];continue n}break}}else if(_&64)if(_&32){N.mode=uT;break t}else{t.msg="invalid literal/length code",N.mode=Vh;break t}else{w=b[(w&65535)+(f&(1<<_)-1)];continue e}break}}while(n<s&&r<a);E=p>>3,n-=E,p-=E<<3,f&=(1<<p)-1,t.next_in=n,t.next_out=r,t.avail_in=n<s?5+(s-n):5-(n-s),t.avail_out=r<a?257+(a-r):257-(r-a),N.hold=f,N.bits=p},_o=15,Wg=852,Xg=592,qg=0,Xf=1,Yg=2,pT=new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0]),mT=new Uint8Array([16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78]),gT=new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0]),_T=new Uint8Array([16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64]),bT=(i,t,e,n,s,r,o,a)=>{let c=a.bits,l=0,h=0,u=0,d=0,f=0,p=0,b=0,g=0,m=0,M=0,w,_,E,T,I,y=null,A,L=new Uint16Array(_o+1),N=new Uint16Array(_o+1),k=null,V,O,H;for(l=0;l<=_o;l++)L[l]=0;for(h=0;h<n;h++)L[t[e+h]]++;for(f=c,d=_o;d>=1&&L[d]===0;d--);if(f>d&&(f=d),d===0)return s[r++]=1<<24|64<<16|0,s[r++]=1<<24|64<<16|0,a.bits=1,0;for(u=1;u<d&&L[u]===0;u++);for(f<u&&(f=u),g=1,l=1;l<=_o;l++)if(g<<=1,g-=L[l],g<0)return-1;if(g>0&&(i===qg||d!==1))return-1;for(N[1]=0,l=1;l<_o;l++)N[l+1]=N[l]+L[l];for(h=0;h<n;h++)t[e+h]!==0&&(o[N[t[e+h]]++]=h);if(i===qg?(y=k=o,A=20):i===Xf?(y=pT,k=mT,A=257):(y=gT,k=_T,A=0),M=0,h=0,l=u,I=r,p=f,b=0,E=-1,m=1<<f,T=m-1,i===Xf&&m>Wg||i===Yg&&m>Xg)return 1;for(;;){V=l-b,o[h]+1<A?(O=0,H=o[h]):o[h]>=A?(O=k[o[h]-A],H=y[o[h]-A]):(O=96,H=0),w=1<<l-b,_=1<<p,u=_;do _-=w,s[I+(M>>b)+_]=V<<24|O<<16|H|0;while(_!==0);for(w=1<<l-1;M&w;)w>>=1;if(w!==0?(M&=w-1,M+=w):M=0,h++,--L[l]===0){if(l===d)break;l=t[e+o[h]]}if(l>f&&(M&T)!==E){for(b===0&&(b=f),I+=u,p=l-b,g=1<<p;p+b<d&&(g-=L[p+b],!(g<=0));)p++,g<<=1;if(m+=1<<p,i===Xf&&m>Wg||i===Yg&&m>Xg)return 1;E=M&T,s[E]=f<<24|p<<16|I-r|0}}return M!==0&&(s[I+M]=l-b<<24|64<<16|0),a.bits=f,0},ja=bT,xT=0,G_=1,W_=2,{Z_FINISH:Zg,Z_BLOCK:yT,Z_TREES:kh,Z_OK:pr,Z_STREAM_END:vT,Z_NEED_DICT:ST,Z_STREAM_ERROR:li,Z_DATA_ERROR:X_,Z_MEM_ERROR:q_,Z_BUF_ERROR:MT,Z_DEFLATED:$g}=ol,jh=16180,jg=16181,Kg=16182,Jg=16183,Qg=16184,t_=16185,e_=16186,n_=16187,i_=16188,s_=16189,Yh=16190,ns=16191,qf=16192,r_=16193,Yf=16194,o_=16195,a_=16196,l_=16197,c_=16198,Hh=16199,Gh=16200,h_=16201,d_=16202,u_=16203,f_=16204,p_=16205,Zf=16206,m_=16207,g_=16208,ze=16209,Y_=16210,Z_=16211,wT=852,ET=592,TT=15,AT=TT,__=i=>(i>>>24&255)+(i>>>8&65280)+((i&65280)<<8)+((i&255)<<24);function IT(){this.strm=null,this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new Uint16Array(320),this.work=new Uint16Array(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}var mr=i=>{if(!i)return 1;let t=i.state;return!t||t.strm!==i||t.mode<jh||t.mode>Z_?1:0},$_=i=>{if(mr(i))return li;let t=i.state;return i.total_in=i.total_out=t.total=0,i.msg="",t.wrap&&(i.adler=t.wrap&1),t.mode=jh,t.last=0,t.havedict=0,t.flags=-1,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new Int32Array(wT),t.distcode=t.distdyn=new Int32Array(ET),t.sane=1,t.back=-1,pr},j_=i=>{if(mr(i))return li;let t=i.state;return t.wsize=0,t.whave=0,t.wnext=0,$_(i)},K_=(i,t)=>{let e;if(mr(i))return li;let n=i.state;return t<0?(e=0,t=-t):(e=(t>>4)+5,t<48&&(t&=15)),t&&(t<8||t>15)?li:(n.window!==null&&n.wbits!==t&&(n.window=null),n.wrap=e,n.wbits=t,j_(i))},J_=(i,t)=>{if(!i)return li;let e=new IT;i.state=e,e.strm=i,e.window=null,e.mode=jh;let n=K_(i,t);return n!==pr&&(i.state=null),n},RT=i=>J_(i,AT),b_=!0,$f,jf,CT=i=>{if(b_){$f=new Int32Array(512),jf=new Int32Array(32);let t=0;for(;t<144;)i.lens[t++]=8;for(;t<256;)i.lens[t++]=9;for(;t<280;)i.lens[t++]=7;for(;t<288;)i.lens[t++]=8;for(ja(G_,i.lens,0,288,$f,0,i.work,{bits:9}),t=0;t<32;)i.lens[t++]=5;ja(W_,i.lens,0,32,jf,0,i.work,{bits:5}),b_=!1}i.lencode=$f,i.lenbits=9,i.distcode=jf,i.distbits=5},Q_=(i,t,e,n)=>{let s,r=i.state;return r.window===null&&(r.wsize=1<<r.wbits,r.wnext=0,r.whave=0,r.window=new Uint8Array(r.wsize)),n>=r.wsize?(r.window.set(t.subarray(e-r.wsize,e),0),r.wnext=0,r.whave=r.wsize):(s=r.wsize-r.wnext,s>n&&(s=n),r.window.set(t.subarray(e-n,e-n+s),r.wnext),n-=s,n?(r.window.set(t.subarray(e-n,e),0),r.wnext=n,r.whave=r.wsize):(r.wnext+=s,r.wnext===r.wsize&&(r.wnext=0),r.whave<r.wsize&&(r.whave+=s))),0},PT=(i,t)=>{let e,n,s,r,o,a,c,l,h,u,d,f,p,b,g=0,m,M,w,_,E,T,I,y,A=new Uint8Array(4),L,N,k=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);if(mr(i)||!i.output||!i.input&&i.avail_in!==0)return li;e=i.state,e.mode===ns&&(e.mode=qf),o=i.next_out,s=i.output,c=i.avail_out,r=i.next_in,n=i.input,a=i.avail_in,l=e.hold,h=e.bits,u=a,d=c,y=pr;t:for(;;)switch(e.mode){case jh:if(e.wrap===0){e.mode=qf;break}for(;h<16;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}if(e.wrap&2&&l===35615){e.wbits===0&&(e.wbits=15),e.check=0,A[0]=l&255,A[1]=l>>>8&255,e.check=fn(e.check,A,2,0),l=0,h=0,e.mode=jg;break}if(e.head&&(e.head.done=!1),!(e.wrap&1)||(((l&255)<<8)+(l>>8))%31){i.msg="incorrect header check",e.mode=ze;break}if((l&15)!==$g){i.msg="unknown compression method",e.mode=ze;break}if(l>>>=4,h-=4,I=(l&15)+8,e.wbits===0&&(e.wbits=I),I>15||I>e.wbits){i.msg="invalid window size",e.mode=ze;break}e.dmax=1<<e.wbits,e.flags=0,i.adler=e.check=1,e.mode=l&512?s_:ns,l=0,h=0;break;case jg:for(;h<16;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}if(e.flags=l,(e.flags&255)!==$g){i.msg="unknown compression method",e.mode=ze;break}if(e.flags&57344){i.msg="unknown header flags set",e.mode=ze;break}e.head&&(e.head.text=l>>8&1),e.flags&512&&e.wrap&4&&(A[0]=l&255,A[1]=l>>>8&255,e.check=fn(e.check,A,2,0)),l=0,h=0,e.mode=Kg;case Kg:for(;h<32;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}e.head&&(e.head.time=l),e.flags&512&&e.wrap&4&&(A[0]=l&255,A[1]=l>>>8&255,A[2]=l>>>16&255,A[3]=l>>>24&255,e.check=fn(e.check,A,4,0)),l=0,h=0,e.mode=Jg;case Jg:for(;h<16;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}e.head&&(e.head.xflags=l&255,e.head.os=l>>8),e.flags&512&&e.wrap&4&&(A[0]=l&255,A[1]=l>>>8&255,e.check=fn(e.check,A,2,0)),l=0,h=0,e.mode=Qg;case Qg:if(e.flags&1024){for(;h<16;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}e.length=l,e.head&&(e.head.extra_len=l),e.flags&512&&e.wrap&4&&(A[0]=l&255,A[1]=l>>>8&255,e.check=fn(e.check,A,2,0)),l=0,h=0}else e.head&&(e.head.extra=null);e.mode=t_;case t_:if(e.flags&1024&&(f=e.length,f>a&&(f=a),f&&(e.head&&(I=e.head.extra_len-e.length,e.head.extra||(e.head.extra=new Uint8Array(e.head.extra_len)),e.head.extra.set(n.subarray(r,r+f),I)),e.flags&512&&e.wrap&4&&(e.check=fn(e.check,n,f,r)),a-=f,r+=f,e.length-=f),e.length))break t;e.length=0,e.mode=e_;case e_:if(e.flags&2048){if(a===0)break t;f=0;do I=n[r+f++],e.head&&I&&e.length<65536&&(e.head.name+=String.fromCharCode(I));while(I&&f<a);if(e.flags&512&&e.wrap&4&&(e.check=fn(e.check,n,f,r)),a-=f,r+=f,I)break t}else e.head&&(e.head.name=null);e.length=0,e.mode=n_;case n_:if(e.flags&4096){if(a===0)break t;f=0;do I=n[r+f++],e.head&&I&&e.length<65536&&(e.head.comment+=String.fromCharCode(I));while(I&&f<a);if(e.flags&512&&e.wrap&4&&(e.check=fn(e.check,n,f,r)),a-=f,r+=f,I)break t}else e.head&&(e.head.comment=null);e.mode=i_;case i_:if(e.flags&512){for(;h<16;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}if(e.wrap&4&&l!==(e.check&65535)){i.msg="header crc mismatch",e.mode=ze;break}l=0,h=0}e.head&&(e.head.hcrc=e.flags>>9&1,e.head.done=!0),i.adler=e.check=0,e.mode=ns;break;case s_:for(;h<32;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}i.adler=e.check=__(l),l=0,h=0,e.mode=Yh;case Yh:if(e.havedict===0)return i.next_out=o,i.avail_out=c,i.next_in=r,i.avail_in=a,e.hold=l,e.bits=h,ST;i.adler=e.check=1,e.mode=ns;case ns:if(t===yT||t===kh)break t;case qf:if(e.last){l>>>=h&7,h-=h&7,e.mode=Zf;break}for(;h<3;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}switch(e.last=l&1,l>>>=1,h-=1,l&3){case 0:e.mode=r_;break;case 1:if(CT(e),e.mode=Hh,t===kh){l>>>=2,h-=2;break t}break;case 2:e.mode=a_;break;case 3:i.msg="invalid block type",e.mode=ze}l>>>=2,h-=2;break;case r_:for(l>>>=h&7,h-=h&7;h<32;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}if((l&65535)!==(l>>>16^65535)){i.msg="invalid stored block lengths",e.mode=ze;break}if(e.length=l&65535,l=0,h=0,e.mode=Yf,t===kh)break t;case Yf:e.mode=o_;case o_:if(f=e.length,f){if(f>a&&(f=a),f>c&&(f=c),f===0)break t;s.set(n.subarray(r,r+f),o),a-=f,r+=f,c-=f,o+=f,e.length-=f;break}e.mode=ns;break;case a_:for(;h<14;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}if(e.nlen=(l&31)+257,l>>>=5,h-=5,e.ndist=(l&31)+1,l>>>=5,h-=5,e.ncode=(l&15)+4,l>>>=4,h-=4,e.nlen>286||e.ndist>30){i.msg="too many length or distance symbols",e.mode=ze;break}e.have=0,e.mode=l_;case l_:for(;e.have<e.ncode;){for(;h<3;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}e.lens[k[e.have++]]=l&7,l>>>=3,h-=3}for(;e.have<19;)e.lens[k[e.have++]]=0;if(e.lencode=e.lendyn,e.lenbits=7,L={bits:e.lenbits},y=ja(xT,e.lens,0,19,e.lencode,0,e.work,L),e.lenbits=L.bits,y){i.msg="invalid code lengths set",e.mode=ze;break}e.have=0,e.mode=c_;case c_:for(;e.have<e.nlen+e.ndist;){for(;g=e.lencode[l&(1<<e.lenbits)-1],m=g>>>24,M=g>>>16&255,w=g&65535,!(m<=h);){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}if(w<16)l>>>=m,h-=m,e.lens[e.have++]=w;else{if(w===16){for(N=m+2;h<N;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}if(l>>>=m,h-=m,e.have===0){i.msg="invalid bit length repeat",e.mode=ze;break}I=e.lens[e.have-1],f=3+(l&3),l>>>=2,h-=2}else if(w===17){for(N=m+3;h<N;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}l>>>=m,h-=m,I=0,f=3+(l&7),l>>>=3,h-=3}else{for(N=m+7;h<N;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}l>>>=m,h-=m,I=0,f=11+(l&127),l>>>=7,h-=7}if(e.have+f>e.nlen+e.ndist){i.msg="invalid bit length repeat",e.mode=ze;break}for(;f--;)e.lens[e.have++]=I}}if(e.mode===ze)break;if(e.lens[256]===0){i.msg="invalid code -- missing end-of-block",e.mode=ze;break}if(e.lenbits=9,L={bits:e.lenbits},y=ja(G_,e.lens,0,e.nlen,e.lencode,0,e.work,L),e.lenbits=L.bits,y){i.msg="invalid literal/lengths set",e.mode=ze;break}if(e.distbits=6,e.distcode=e.distdyn,L={bits:e.distbits},y=ja(W_,e.lens,e.nlen,e.ndist,e.distcode,0,e.work,L),e.distbits=L.bits,y){i.msg="invalid distances set",e.mode=ze;break}if(e.mode=Hh,t===kh)break t;case Hh:e.mode=Gh;case Gh:if(a>=6&&c>=258){i.next_out=o,i.avail_out=c,i.next_in=r,i.avail_in=a,e.hold=l,e.bits=h,fT(i,d),o=i.next_out,s=i.output,c=i.avail_out,r=i.next_in,n=i.input,a=i.avail_in,l=e.hold,h=e.bits,e.mode===ns&&(e.back=-1);break}for(e.back=0;g=e.lencode[l&(1<<e.lenbits)-1],m=g>>>24,M=g>>>16&255,w=g&65535,!(m<=h);){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}if(M&&!(M&240)){for(_=m,E=M,T=w;g=e.lencode[T+((l&(1<<_+E)-1)>>_)],m=g>>>24,M=g>>>16&255,w=g&65535,!(_+m<=h);){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}l>>>=_,h-=_,e.back+=_}if(l>>>=m,h-=m,e.back+=m,e.length=w,M===0){e.mode=p_;break}if(M&32){e.back=-1,e.mode=ns;break}if(M&64){i.msg="invalid literal/length code",e.mode=ze;break}e.extra=M&15,e.mode=h_;case h_:if(e.extra){for(N=e.extra;h<N;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}e.length+=l&(1<<e.extra)-1,l>>>=e.extra,h-=e.extra,e.back+=e.extra}e.was=e.length,e.mode=d_;case d_:for(;g=e.distcode[l&(1<<e.distbits)-1],m=g>>>24,M=g>>>16&255,w=g&65535,!(m<=h);){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}if(!(M&240)){for(_=m,E=M,T=w;g=e.distcode[T+((l&(1<<_+E)-1)>>_)],m=g>>>24,M=g>>>16&255,w=g&65535,!(_+m<=h);){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}l>>>=_,h-=_,e.back+=_}if(l>>>=m,h-=m,e.back+=m,M&64){i.msg="invalid distance code",e.mode=ze;break}e.offset=w,e.extra=M&15,e.mode=u_;case u_:if(e.extra){for(N=e.extra;h<N;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}e.offset+=l&(1<<e.extra)-1,l>>>=e.extra,h-=e.extra,e.back+=e.extra}if(e.offset>e.dmax){i.msg="invalid distance too far back",e.mode=ze;break}e.mode=f_;case f_:if(c===0)break t;if(f=d-c,e.offset>f){if(f=e.offset-f,f>e.whave&&e.sane){i.msg="invalid distance too far back",e.mode=ze;break}f>e.wnext?(f-=e.wnext,p=e.wsize-f):p=e.wnext-f,f>e.length&&(f=e.length),b=e.window}else b=s,p=o-e.offset,f=e.length;f>c&&(f=c),c-=f,e.length-=f;do s[o++]=b[p++];while(--f);e.length===0&&(e.mode=Gh);break;case p_:if(c===0)break t;s[o++]=e.length,c--,e.mode=Gh;break;case Zf:if(e.wrap){for(;h<32;){if(a===0)break t;a--,l|=n[r++]<<h,h+=8}if(d-=c,i.total_out+=d,e.total+=d,e.wrap&4&&d&&(i.adler=e.check=e.flags?fn(e.check,s,d,o-d):el(e.check,s,d,o-d)),d=c,e.wrap&4&&(e.flags?l:__(l))!==e.check){i.msg="incorrect data check",e.mode=ze;break}l=0,h=0}e.mode=m_;case m_:if(e.wrap&&e.flags){for(;h<32;){if(a===0)break t;a--,l+=n[r++]<<h,h+=8}if(e.wrap&4&&l!==(e.total&4294967295)){i.msg="incorrect length check",e.mode=ze;break}l=0,h=0}e.mode=g_;case g_:y=vT;break t;case ze:y=X_;break t;case Y_:return q_;case Z_:default:return li}return i.next_out=o,i.avail_out=c,i.next_in=r,i.avail_in=a,e.hold=l,e.bits=h,(e.wsize||d!==i.avail_out&&e.mode<ze&&(e.mode<Zf||t!==Zg))&&Q_(i,i.output,i.next_out,d-i.avail_out),u-=i.avail_in,d-=i.avail_out,i.total_in+=u,i.total_out+=d,e.total+=d,e.wrap&4&&d&&(i.adler=e.check=e.flags?fn(e.check,s,d,i.next_out-d):el(e.check,s,d,i.next_out-d)),i.data_type=e.bits+(e.last?64:0)+(e.mode===ns?128:0)+(e.mode===Hh||e.mode===Yf?256:0),(u===0&&d===0||t===Zg)&&y===pr&&(y=MT),y},LT=i=>{if(mr(i))return li;let t=i.state;return t.window&&(t.window=null),i.state=null,pr},DT=(i,t)=>{if(mr(i))return li;let e=i.state;return e.wrap&2?(e.head=t,t.done=!1,pr):li},NT=(i,t)=>{let e=t.length,n,s,r;return mr(i)||(n=i.state,n.wrap!==0&&n.mode!==Yh)?li:n.mode===Yh&&(s=1,s=el(s,t,e,0),s!==n.check)?X_:(r=Q_(i,t,e,e),r?(n.mode=Y_,q_):(n.havedict=1,pr))},OT=j_,UT=K_,FT=$_,BT=RT,zT=J_,VT=PT,kT=LT,HT=DT,GT=NT,WT="pako inflate (from Nodeca project)",ss={inflateReset:OT,inflateReset2:UT,inflateResetKeep:FT,inflateInit:BT,inflateInit2:zT,inflate:VT,inflateEnd:kT,inflateGetHeader:HT,inflateSetDictionary:GT,inflateInfo:WT};function XT(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}var qT=XT,t0=Object.prototype.toString,{Z_NO_FLUSH:YT,Z_FINISH:ZT,Z_OK:sl,Z_STREAM_END:Kf,Z_NEED_DICT:Jf,Z_STREAM_ERROR:$T,Z_DATA_ERROR:x_,Z_MEM_ERROR:jT}=ol;function cl(i){this.options=$h.assign({chunkSize:1024*64,windowBits:15,to:""},i||{});let t=this.options;t.raw&&t.windowBits>=0&&t.windowBits<16&&(t.windowBits=-t.windowBits,t.windowBits===0&&(t.windowBits=-15)),t.windowBits>=0&&t.windowBits<16&&!(i&&i.windowBits)&&(t.windowBits+=32),t.windowBits>15&&t.windowBits<48&&(t.windowBits&15||(t.windowBits|=15)),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new k_,this.strm.avail_out=0;let e=ss.inflateInit2(this.strm,t.windowBits);if(e!==sl)throw new Error(ur[e]);if(this.header=new qT,ss.inflateGetHeader(this.strm,this.header),t.dictionary&&(typeof t.dictionary=="string"?t.dictionary=il.string2buf(t.dictionary):t0.call(t.dictionary)==="[object ArrayBuffer]"&&(t.dictionary=new Uint8Array(t.dictionary)),t.raw&&(e=ss.inflateSetDictionary(this.strm,t.dictionary),e!==sl)))throw new Error(ur[e])}cl.prototype.push=function(i,t){let e=this.strm,n=this.options.chunkSize,s=this.options.dictionary,r,o,a;if(this.ended)return!1;for(t===~~t?o=t:o=t===!0?ZT:YT,t0.call(i)==="[object ArrayBuffer]"?e.input=new Uint8Array(i):e.input=i,e.next_in=0,e.avail_in=e.input.length;;){for(e.avail_out===0&&(e.output=new Uint8Array(n),e.next_out=0,e.avail_out=n),r=ss.inflate(e,o),r===Jf&&s&&(r=ss.inflateSetDictionary(e,s),r===sl?r=ss.inflate(e,o):r===x_&&(r=Jf));e.avail_in>0&&r===Kf&&e.state.wrap>0&&i[e.next_in]!==0;)ss.inflateReset(e),r=ss.inflate(e,o);switch(r){case $T:case x_:case Jf:case jT:return this.onEnd(r),this.ended=!0,!1}if(a=e.avail_out,e.next_out&&(e.avail_out===0||r===Kf))if(this.options.to==="string"){let c=il.utf8border(e.output,e.next_out),l=e.next_out-c,h=il.buf2string(e.output,c);e.next_out=l,e.avail_out=n-l,l&&e.output.set(e.output.subarray(c,c+l),0),this.onData(h)}else this.onData(e.output.length===e.next_out?e.output:e.output.subarray(0,e.next_out));if(!(r===sl&&a===0)){if(r===Kf)return r=ss.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,!0;if(e.avail_in===0)break}}return!0};cl.prototype.onData=function(i){this.chunks.push(i)};cl.prototype.onEnd=function(i){i===sl&&(this.options.to==="string"?this.result=this.chunks.join(""):this.result=$h.flattenChunks(this.chunks)),this.chunks=[],this.err=i,this.msg=this.strm.msg};function pp(i,t){let e=new cl(t);if(e.push(i),e.err)throw e.msg||ur[e.err];return e.result}function KT(i,t){return t=t||{},t.raw=!0,pp(i,t)}var JT=cl,QT=pp,t1=KT,e1=pp,n1={Inflate:JT,inflate:QT,inflateRaw:t1,ungzip:e1},{Deflate:i1,deflate:s1,deflateRaw:r1,gzip:o1}=dT,{Inflate:a1,inflate:l1,inflateRaw:c1,ungzip:h1}=n1,d1=i1,u1=s1,f1=r1,p1=o1,m1=a1,g1=l1,_1=c1,b1=h1,x1=ol,wo={Deflate:d1,deflate:u1,deflateRaw:f1,gzip:p1,Inflate:m1,inflate:g1,inflateRaw:_1,ungzip:b1,constants:x1};var Kh=class{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}x(){return this.bb.readFloat64(this.bb_pos)}mutate_x(t){return this.bb.writeFloat64(this.bb_pos+0,t),!0}y(){return this.bb.readFloat64(this.bb_pos+8)}mutate_y(t){return this.bb.writeFloat64(this.bb_pos+8,t),!0}z(){return this.bb.readFloat64(this.bb_pos+16)}mutate_z(t){return this.bb.writeFloat64(this.bb_pos+16,t),!0}static sizeOf(){return 24}static createDoubleVector(t,e,n,s){return t.prep(8,24),t.writeFloat64(s),t.writeFloat64(n),t.writeFloat64(e),t.offset()}};var Fe=class{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}x(){return this.bb.readFloat32(this.bb_pos)}mutate_x(t){return this.bb.writeFloat32(this.bb_pos+0,t),!0}y(){return this.bb.readFloat32(this.bb_pos+4)}mutate_y(t){return this.bb.writeFloat32(this.bb_pos+4,t),!0}z(){return this.bb.readFloat32(this.bb_pos+8)}mutate_z(t){return this.bb.writeFloat32(this.bb_pos+8,t),!0}static sizeOf(){return 12}static createFloatVector(t,e,n,s){return t.prep(4,12),t.writeFloat32(s),t.writeFloat32(n),t.writeFloat32(e),t.offset()}};var qn=class{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}position(t){return(t||new Kh).__init(this.bb_pos,this.bb)}xDirection(t){return(t||new Fe).__init(this.bb_pos+24,this.bb)}yDirection(t){return(t||new Fe).__init(this.bb_pos+36,this.bb)}static sizeOf(){return 48}static createTransform(t,e,n,s,r,o,a,c,l,h){return t.prep(8,48),t.prep(4,12),t.writeFloat32(h),t.writeFloat32(l),t.writeFloat32(c),t.prep(4,12),t.writeFloat32(a),t.writeFloat32(o),t.writeFloat32(r),t.prep(8,24),t.writeFloat64(s),t.writeFloat64(n),t.writeFloat64(e),t.offset()}};function gr(i,t){let e=i.position,n=i.xDirection,s=i.yDirection;return qn.createTransform(t,e[0],e[1],e[2],n[0],n[1],n[2],s[0],s[1],s[2])}function Jh(i,t){let e=t.position(),n=t.xDirection(),s=t.yDirection();return qn.createTransform(i,e.x(),e.y(),e.z(),n.x(),n.y(),n.z(),s.x(),s.y(),s.z())}function e0(i,t){return Fe.createFloatVector(i,t.x(),t.y(),t.z())}var rs=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsBigShellHole(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsBigShellHole(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}indices(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}indicesLength(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}indicesArray(){let t=this.bb.__offset(this.bb_pos,4);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}profileId(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint16(this.bb_pos+t):0}mutate_profile_id(t){let e=this.bb.__offset(this.bb_pos,6);return e===0?!1:(this.bb.writeUint16(this.bb_pos+e,t),!0)}static startBigShellHole(t){t.startObject(2)}static addIndices(t,e){t.addFieldOffset(0,e,0)}static createIndicesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startIndicesVector(t,e){t.startVector(4,e,4)}static addProfileId(t,e){t.addFieldInt16(1,e,0)}static endBigShellHole(t){let e=t.endObject();return t.requiredField(e,4),e}static createBigShellHole(t,e,n){return i.startBigShellHole(t),i.addIndices(t,e),i.addProfileId(t,n),i.endBigShellHole(t)}};var os=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsBigShellProfile(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsBigShellProfile(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}indices(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}indicesLength(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}indicesArray(){let t=this.bb.__offset(this.bb_pos,4);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}static startBigShellProfile(t){t.startObject(1)}static addIndices(t,e){t.addFieldOffset(0,e,0)}static createIndicesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startIndicesVector(t,e){t.startVector(4,e,4)}static endBigShellProfile(t){let e=t.endObject();return t.requiredField(e,4),e}static createBigShellProfile(t,e){return i.startBigShellProfile(t),i.addIndices(t,e),i.endBigShellProfile(t)}};var as=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsShellHole(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsShellHole(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}indices(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readUint16(this.bb.__vector(this.bb_pos+e)+t*2):0}indicesLength(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}indicesArray(){let t=this.bb.__offset(this.bb_pos,4);return t?new Uint16Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}profileId(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint16(this.bb_pos+t):0}mutate_profile_id(t){let e=this.bb.__offset(this.bb_pos,6);return e===0?!1:(this.bb.writeUint16(this.bb_pos+e,t),!0)}static startShellHole(t){t.startObject(2)}static addIndices(t,e){t.addFieldOffset(0,e,0)}static createIndicesVector(t,e){t.startVector(2,e.length,2);for(let n=e.length-1;n>=0;n--)t.addInt16(e[n]);return t.endVector()}static startIndicesVector(t,e){t.startVector(2,e,2)}static addProfileId(t,e){t.addFieldInt16(1,e,0)}static endShellHole(t){let e=t.endObject();return t.requiredField(e,4),e}static createShellHole(t,e,n){return i.startShellHole(t),i.addIndices(t,e),i.addProfileId(t,n),i.endShellHole(t)}};var ls=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsShellProfile(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsShellProfile(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}indices(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readUint16(this.bb.__vector(this.bb_pos+e)+t*2):0}indicesLength(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}indicesArray(){let t=this.bb.__offset(this.bb_pos,4);return t?new Uint16Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}static startShellProfile(t){t.startObject(1)}static addIndices(t,e){t.addFieldOffset(0,e,0)}static createIndicesVector(t,e){t.startVector(2,e.length,2);for(let n=e.length-1;n>=0;n--)t.addInt16(e[n]);return t.endVector()}static startIndicesVector(t,e){t.startVector(2,e,2)}static endShellProfile(t){let e=t.endObject();return t.requiredField(e,4),e}static createShellProfile(t,e){return i.startShellProfile(t),i.addIndices(t,e),i.endShellProfile(t)}};var Fs=(i=>(i[i.NONE=0]="NONE",i[i.BIG=1]="BIG",i))(Fs||{});var Ze=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsShell(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsShell(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}profiles(t,e){let n=this.bb.__offset(this.bb_pos,4);return n?(e||new ls).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+n)+t*4),this.bb):null}profilesLength(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}holes(t,e){let n=this.bb.__offset(this.bb_pos,6);return n?(e||new as).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+n)+t*4),this.bb):null}holesLength(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}points(t,e){let n=this.bb.__offset(this.bb_pos,8);return n?(e||new Fe).__init(this.bb.__vector(this.bb_pos+n)+t*12,this.bb):null}pointsLength(){let t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}bigProfiles(t,e){let n=this.bb.__offset(this.bb_pos,10);return n?(e||new os).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+n)+t*4),this.bb):null}bigProfilesLength(){let t=this.bb.__offset(this.bb_pos,10);return t?this.bb.__vector_len(this.bb_pos+t):0}bigHoles(t,e){let n=this.bb.__offset(this.bb_pos,12);return n?(e||new rs).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+n)+t*4),this.bb):null}bigHolesLength(){let t=this.bb.__offset(this.bb_pos,12);return t?this.bb.__vector_len(this.bb_pos+t):0}type(){let t=this.bb.__offset(this.bb_pos,14);return t?this.bb.readInt8(this.bb_pos+t):Fs.NONE}mutate_type(t){let e=this.bb.__offset(this.bb_pos,14);return e===0?!1:(this.bb.writeInt8(this.bb_pos+e,t),!0)}profilesFaceIds(t){let e=this.bb.__offset(this.bb_pos,16);return e?this.bb.readUint16(this.bb.__vector(this.bb_pos+e)+t*2):0}profilesFaceIdsLength(){let t=this.bb.__offset(this.bb_pos,16);return t?this.bb.__vector_len(this.bb_pos+t):0}profilesFaceIdsArray(){let t=this.bb.__offset(this.bb_pos,16);return t?new Uint16Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}static startShell(t){t.startObject(7)}static addProfiles(t,e){t.addFieldOffset(0,e,0)}static createProfilesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startProfilesVector(t,e){t.startVector(4,e,4)}static addHoles(t,e){t.addFieldOffset(1,e,0)}static createHolesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startHolesVector(t,e){t.startVector(4,e,4)}static addPoints(t,e){t.addFieldOffset(2,e,0)}static startPointsVector(t,e){t.startVector(12,e,4)}static addBigProfiles(t,e){t.addFieldOffset(3,e,0)}static createBigProfilesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startBigProfilesVector(t,e){t.startVector(4,e,4)}static addBigHoles(t,e){t.addFieldOffset(4,e,0)}static createBigHolesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startBigHolesVector(t,e){t.startVector(4,e,4)}static addType(t,e){t.addFieldInt8(5,e,Fs.NONE)}static addProfilesFaceIds(t,e){t.addFieldOffset(6,e,0)}static createProfilesFaceIdsVector(t,e){t.startVector(2,e.length,2);for(let n=e.length-1;n>=0;n--)t.addInt16(e[n]);return t.endVector()}static startProfilesFaceIdsVector(t,e){t.startVector(2,e,2)}static endShell(t){let e=t.endObject();return t.requiredField(e,4),t.requiredField(e,6),t.requiredField(e,8),t.requiredField(e,10),t.requiredField(e,12),t.requiredField(e,16),e}static createShell(t,e,n,s,r,o,a,c){return i.startShell(t),i.addProfiles(t,e),i.addHoles(t,n),i.addPoints(t,s),i.addBigProfiles(t,r),i.addBigHoles(t,o),i.addType(t,a),i.addProfilesFaceIds(t,c),i.endShell(t)}};function Qh(i,t){let e=t.type,n=[],s=[],r=[],o=[],a=t.points.length;Ze.startPointsVector(i,a);for(let b=0;b<a;b++){let g=a-1-b,m=t.points[g];Fe.createFloatVector(i,m[0],m[1],m[2])}let c=i.endVector();for(let[,b]of t.profiles){let g=ls.createIndicesVector(i,b),m=ls.createShellProfile(i,g);n.push(m)}let l=Ze.createProfilesVector(i,n);for(let[b,g]of t.holes)for(let m of g){let M=as.createIndicesVector(i,m),w=as.createShellHole(i,M,b);s.push(w)}let h=Ze.createHolesVector(i,s);for(let[,b]of t.bigProfiles){let g=os.createIndicesVector(i,b),m=os.createBigShellProfile(i,g);r.push(m)}let u=Ze.createBigProfilesVector(i,r);for(let[b,g]of t.bigHoles)for(let m of g){let M=rs.createIndicesVector(i,m),w=rs.createBigShellHole(i,M,b);o.push(w)}let d=Ze.createBigHolesVector(i,o),f=Ze.createProfilesFaceIdsVector(i,t.profilesFaceIds);return Ze.createShell(i,l,h,c,u,d,e,f)}function n0(i,t){let e=t.type(),n=[],s=[],r=[],o=[],a=t.pointsLength();Ze.startPointsVector(i,a);for(let w=0;w<a;w++){let _=a-1-w,E=t.points(_);e0(i,E)}let c=i.endVector(),l=t.profilesLength();for(let w=0;w<l;w++){let E=t.profiles(w).indicesArray(),T=ls.createIndicesVector(i,E),I=ls.createShellProfile(i,T);n.push(I)}let h=Ze.createProfilesVector(i,n),u=t.holesLength();for(let w=0;w<u;w++){let _=t.holes(w),E=_.indicesArray(),T=_.profileId(),I=as.createIndicesVector(i,E),y=as.createShellHole(i,I,T);s.push(y)}let d=Ze.createHolesVector(i,s),f=t.bigProfilesLength();for(let w=0;w<f;w++){let E=t.bigProfiles(w).indicesArray(),T=os.createIndicesVector(i,E),I=os.createBigShellProfile(i,T);r.push(I)}let p=Ze.createBigProfilesVector(i,r),b=t.bigHolesLength();for(let w=0;w<b;w++){let _=t.bigHoles(w),E=_.indicesArray(),T=_.profileId(),I=rs.createIndicesVector(i,E),y=rs.createBigShellHole(i,I,T);o.push(y)}let g=Ze.createBigHolesVector(i,o),m=Ze.createProfilesFaceIdsVector(i,t.profilesFaceIdsArray()||[]);return Ze.createShell(i,h,d,c,p,g,e,m)}var _r=class{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}aperture(){return this.bb.readFloat32(this.bb_pos)}mutate_aperture(t){return this.bb.writeFloat32(this.bb_pos+0,t),!0}position(t){return(t||new Fe).__init(this.bb_pos+4,this.bb)}radius(){return this.bb.readFloat32(this.bb_pos+16)}mutate_radius(t){return this.bb.writeFloat32(this.bb_pos+16,t),!0}xDirection(t){return(t||new Fe).__init(this.bb_pos+20,this.bb)}yDirection(t){return(t||new Fe).__init(this.bb_pos+32,this.bb)}static sizeOf(){return 44}static createCircleCurve(t,e,n,s,r,o,a,c,l,h,u,d){return t.prep(4,44),t.prep(4,12),t.writeFloat32(d),t.writeFloat32(u),t.writeFloat32(h),t.prep(4,12),t.writeFloat32(l),t.writeFloat32(c),t.writeFloat32(a),t.writeFloat32(o),t.prep(4,12),t.writeFloat32(r),t.writeFloat32(s),t.writeFloat32(n),t.writeFloat32(e),t.offset()}};var br=class{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}p1(t){return(t||new Fe).__init(this.bb_pos,this.bb)}p2(t){return(t||new Fe).__init(this.bb_pos+12,this.bb)}static sizeOf(){return 24}static createWire(t,e,n,s,r,o,a){return t.prep(4,24),t.prep(4,12),t.writeFloat32(a),t.writeFloat32(o),t.writeFloat32(r),t.prep(4,12),t.writeFloat32(s),t.writeFloat32(n),t.writeFloat32(e),t.offset()}};var cs=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsWireSet(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsWireSet(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}ps(t,e){let n=this.bb.__offset(this.bb_pos,4);return n?(e||new Fe).__init(this.bb.__vector(this.bb_pos+n)+t*12,this.bb):null}psLength(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}static startWireSet(t){t.startObject(1)}static addPs(t,e){t.addFieldOffset(0,e,0)}static startPsVector(t,e){t.startVector(12,e,4)}static endWireSet(t){return t.endObject()}static createWireSet(t,e){return i.startWireSet(t),i.addPs(t,e),i.endWireSet(t)}};var Te=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsAxis(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsAxis(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}wires(t,e){let n=this.bb.__offset(this.bb_pos,4);return n?(e||new br).__init(this.bb.__vector(this.bb_pos+n)+t*24,this.bb):null}wiresLength(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}order(t){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}orderLength(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}orderArray(){let t=this.bb.__offset(this.bb_pos,6);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}parts(t){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.readInt8(this.bb.__vector(this.bb_pos+e)+t):0}partsLength(){let t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}partsArray(){let t=this.bb.__offset(this.bb_pos,8);return t?new Int8Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}wireSets(t,e){let n=this.bb.__offset(this.bb_pos,10);return n?(e||new cs).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+n)+t*4),this.bb):null}wireSetsLength(){let t=this.bb.__offset(this.bb_pos,10);return t?this.bb.__vector_len(this.bb_pos+t):0}circleCurves(t,e){let n=this.bb.__offset(this.bb_pos,12);return n?(e||new _r).__init(this.bb.__vector(this.bb_pos+n)+t*44,this.bb):null}circleCurvesLength(){let t=this.bb.__offset(this.bb_pos,12);return t?this.bb.__vector_len(this.bb_pos+t):0}static startAxis(t){t.startObject(5)}static addWires(t,e){t.addFieldOffset(0,e,0)}static startWiresVector(t,e){t.startVector(24,e,4)}static addOrder(t,e){t.addFieldOffset(1,e,0)}static createOrderVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startOrderVector(t,e){t.startVector(4,e,4)}static addParts(t,e){t.addFieldOffset(2,e,0)}static createPartsVector(t,e){t.startVector(1,e.length,1);for(let n=e.length-1;n>=0;n--)t.addInt8(e[n]);return t.endVector()}static startPartsVector(t,e){t.startVector(1,e,1)}static addWireSets(t,e){t.addFieldOffset(3,e,0)}static createWireSetsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startWireSetsVector(t,e){t.startVector(4,e,4)}static addCircleCurves(t,e){t.addFieldOffset(4,e,0)}static startCircleCurvesVector(t,e){t.startVector(44,e,4)}static endAxis(t){let e=t.endObject();return t.requiredField(e,4),t.requiredField(e,6),t.requiredField(e,8),t.requiredField(e,10),t.requiredField(e,12),e}static createAxis(t,e,n,s,r,o){return i.startAxis(t),i.addWires(t,e),i.addOrder(t,n),i.addParts(t,s),i.addWireSets(t,r),i.addCircleCurves(t,o),i.endAxis(t)}};var Mn=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsCircleExtrusion(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsCircleExtrusion(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}radius(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readFloat64(this.bb.__vector(this.bb_pos+e)+t*8):0}radiusLength(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}radiusArray(){let t=this.bb.__offset(this.bb_pos,4);return t?new Float64Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}axes(t,e){let n=this.bb.__offset(this.bb_pos,6);return n?(e||new Te).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+n)+t*4),this.bb):null}axesLength(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}static startCircleExtrusion(t){t.startObject(2)}static addRadius(t,e){t.addFieldOffset(0,e,0)}static createRadiusVector(t,e){t.startVector(8,e.length,8);for(let n=e.length-1;n>=0;n--)t.addFloat64(e[n]);return t.endVector()}static startRadiusVector(t,e){t.startVector(8,e,8)}static addAxes(t,e){t.addFieldOffset(1,e,0)}static createAxesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startAxesVector(t,e){t.startVector(4,e,4)}static endCircleExtrusion(t){let e=t.endObject();return t.requiredField(e,4),t.requiredField(e,6),e}static createCircleExtrusion(t,e,n){return i.startCircleExtrusion(t),i.addRadius(t,e),i.addAxes(t,n),i.endCircleExtrusion(t)}};function i0(i,t){let e=t.radiusArray(),n=Mn.createRadiusVector(i,e),s=t.axesLength(),r=[];for(let c=0;c<s;c++){let l=t.axes(c),h=l.circleCurvesLength();Te.startCircleCurvesVector(i,h);for(let _=0;_<h;_++){let E=h-1-_,T=l.circleCurves(E),I=T.position(),y=T.radius(),A=T.aperture(),L=T.xDirection(),N=T.yDirection(),k=I.x(),V=I.y(),O=I.z(),H=L.x(),U=L.y(),W=L.z(),K=N.x(),G=N.y(),D=N.z();_r.createCircleCurve(i,A,k,V,O,y,H,U,W,K,G,D)}let u=i.endVector(),d=l.wiresLength();Te.startWiresVector(i,d);for(let _=0;_<d;_++){let E=d-1-_,T=l.wires(E),I=T.p1(),y=T.p2();br.createWire(i,I.x(),I.y(),I.z(),y.x(),y.y(),y.z())}let f=i.endVector();Te.startWireSetsVector(i,0);let p=i.endVector(),b=l.orderArray(),g=Te.createOrderVector(i,b),m=Array.from(l.partsArray()),M=Te.createPartsVector(i,m);Te.startAxis(i),Te.addCircleCurves(i,u),Te.addOrder(i,g),Te.addWires(i,f),Te.addWireSets(i,p),Te.addParts(i,M);let w=Te.endAxis(i);r.push(w)}let o=Mn.createAxesVector(i,r);return Mn.startCircleExtrusion(i),Mn.addAxes(i,o),Mn.addRadius(i,n),Mn.endCircleExtrusion(i)}function td(i,t){let e=t.radius,n=Mn.createRadiusVector(i,e),s=[];for(let a of t.axes){let c=a.circleCurves.length;Te.startCircleCurvesVector(i,c);for(let m of a.circleCurves)_r.createCircleCurve(i,m.aperture,m.position[0],m.position[1],m.position[2],m.radius,m.xDirection[0],m.xDirection[1],m.xDirection[2],m.yDirection[0],m.yDirection[1],m.yDirection[2]);let l=i.endVector(),h=a.wires.length;Te.startWiresVector(i,h);for(let m of a.wires)br.createWire(i,m[0],m[1],m[2],m[3],m[4],m[5]);let u=i.endVector(),d=[];for(let m of a.wireSets){cs.startPsVector(i,m.length/3);for(let _=0;_<m.length-2;_+=3)Fe.createFloatVector(i,m[_],m[_+1],m[_+2]);let M=i.endVector();cs.startWireSet(i),cs.addPs(i,M);let w=cs.endWireSet(i);d.push(w)}let f=Te.createWireSetsVector(i,d),p=Te.createOrderVector(i,a.order),b=Te.createPartsVector(i,a.parts);Te.startAxis(i),Te.addCircleCurves(i,l),Te.addOrder(i,p),Te.addWires(i,u),Te.addWireSets(i,f),Te.addParts(i,b);let g=Te.endAxis(i);s.push(g)}let r=Mn.createAxesVector(i,s);return Mn.startCircleExtrusion(i),Mn.addAxes(i,r),Mn.addRadius(i,n),Mn.endCircleExtrusion(i)}var We=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsSpatialStructure(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsSpatialStructure(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}localId(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readUint32(this.bb_pos+t):null}mutate_local_id(t){let e=this.bb.__offset(this.bb_pos,4);return e===0?!1:(this.bb.writeUint32(this.bb_pos+e,t),!0)}category(t){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__string(this.bb_pos+e,t):null}children(t,e){let n=this.bb.__offset(this.bb_pos,8);return n?(e||new i).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+n)+t*4),this.bb):null}childrenLength(){let t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}static startSpatialStructure(t){t.startObject(3)}static addLocalId(t,e){t.addFieldInt32(0,e,null)}static addCategory(t,e){t.addFieldOffset(1,e,0)}static addChildren(t,e){t.addFieldOffset(2,e,0)}static createChildrenVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startChildrenVector(t,e){t.startVector(4,e,4)}static endSpatialStructure(t){return t.endObject()}static createSpatialStructure(t,e,n,s){return i.startSpatialStructure(t),e!==null&&i.addLocalId(t,e),i.addCategory(t,n),i.addChildren(t,s),i.endSpatialStructure(t)}};function mp(i,t){if(!t)return null;let e=t.childrenLength(),n=[];for(let a=0;a<e;a++){let c=t.children(a),l=mp(i,c);l!==null&&n.push(l)}let s=We.createChildrenVector(i,n),r=t.localId(),o=t.category();if(r!==null)return We.startSpatialStructure(i),We.addLocalId(i,r),We.addChildren(i,s),We.endSpatialStructure(i);if(o!==null){let a=i.createSharedString(o);return We.startSpatialStructure(i),We.addCategory(i,a),We.addChildren(i,s),We.endSpatialStructure(i)}throw new Error("Spatial structure must have a local id or a category")}function gp(i,t){let e=t.children??[],n=e?e.length:0,s=[];for(let c=0;c<n;c++){let l=e[c],h=gp(i,l);h!==null&&s.push(h)}let r=We.createChildrenVector(i,s),o=t.localId,a=t.category;if(o!==null)return We.startSpatialStructure(i),We.addLocalId(i,o),We.addChildren(i,r),We.endSpatialStructure(i);if(a!==null){let c=i.createSharedString(a);return We.startSpatialStructure(i),We.addCategory(i,c),We.addChildren(i,r),We.endSpatialStructure(i)}throw new Error("Spatial structure must have a local id or a category")}var Bs=class{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}item(){return this.bb.readUint32(this.bb_pos)}mutate_item(t){return this.bb.writeUint32(this.bb_pos+0,t),!0}material(){return this.bb.readUint32(this.bb_pos+4)}mutate_material(t){return this.bb.writeUint32(this.bb_pos+4,t),!0}representation(){return this.bb.readUint32(this.bb_pos+8)}mutate_representation(t){return this.bb.writeUint32(this.bb_pos+8,t),!0}localTransform(){return this.bb.readUint32(this.bb_pos+12)}mutate_local_transform(t){return this.bb.writeUint32(this.bb_pos+12,t),!0}static sizeOf(){return 16}static createSample(t,e,n,s,r){return t.prep(4,16),t.writeInt32(r),t.writeInt32(s),t.writeInt32(n),t.writeInt32(e),t.offset()}};function ed(i,t,e,n,s,r){if(!t.has(e))throw new Error("Invalid sample: item id not found");if(!t.has(n))throw new Error("Invalid sample: mat id not found");if(!t.has(s))throw new Error("Invalid sample: repr id not found");if(!t.has(r))throw new Error("Invalid sample: lt id not found");let o=t.get(e),a=t.get(n),c=t.get(s),l=t.get(r);Bs.createSample(i,o,a,c,l)}var Qe=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsModelIndex(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsModelIndex(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}name(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__string(this.bb_pos+e,t):null}stringKeys(t,e){let n=this.bb.__offset(this.bb_pos,6);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+t*4,e):null}stringKeysLength(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}numberKeys(t){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}numberKeysLength(){let t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}numberKeysArray(){let t=this.bb.__offset(this.bb_pos,8);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}stringValues(t,e){let n=this.bb.__offset(this.bb_pos,10);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+t*4,e):null}stringValuesLength(){let t=this.bb.__offset(this.bb_pos,10);return t?this.bb.__vector_len(this.bb_pos+t):0}numberValues(t){let e=this.bb.__offset(this.bb_pos,12);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}numberValuesLength(){let t=this.bb.__offset(this.bb_pos,12);return t?this.bb.__vector_len(this.bb_pos+t):0}numberValuesArray(){let t=this.bb.__offset(this.bb_pos,12);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}end(t){let e=this.bb.__offset(this.bb_pos,14);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}endLength(){let t=this.bb.__offset(this.bb_pos,14);return t?this.bb.__vector_len(this.bb_pos+t):0}endArray(){let t=this.bb.__offset(this.bb_pos,14);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}start(t){let e=this.bb.__offset(this.bb_pos,16);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}startLength(){let t=this.bb.__offset(this.bb_pos,16);return t?this.bb.__vector_len(this.bb_pos+t):0}startArray(){let t=this.bb.__offset(this.bb_pos,16);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}static startModelIndex(t){t.startObject(7)}static addName(t,e){t.addFieldOffset(0,e,0)}static addStringKeys(t,e){t.addFieldOffset(1,e,0)}static createStringKeysVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startStringKeysVector(t,e){t.startVector(4,e,4)}static addNumberKeys(t,e){t.addFieldOffset(2,e,0)}static createNumberKeysVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startNumberKeysVector(t,e){t.startVector(4,e,4)}static addStringValues(t,e){t.addFieldOffset(3,e,0)}static createStringValuesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startStringValuesVector(t,e){t.startVector(4,e,4)}static addNumberValues(t,e){t.addFieldOffset(4,e,0)}static createNumberValuesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startNumberValuesVector(t,e){t.startVector(4,e,4)}static addEnd(t,e){t.addFieldOffset(5,e,0)}static createEndVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startEndVector(t,e){t.startVector(4,e,4)}static addStart(t,e){t.addFieldOffset(6,e,0)}static createStartVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startStartVector(t,e){t.startVector(4,e,4)}static endModelIndex(t){return t.endObject()}static createModelIndex(t,e,n,s,r,o,a,c){return i.startModelIndex(t),i.addName(t,e),i.addStringKeys(t,n),i.addNumberKeys(t,s),i.addStringValues(t,r),i.addNumberValues(t,o),i.addEnd(t,a),i.addStart(t,c),i.endModelIndex(t)}};function _p(i,t){let e=i.createString(t.name),{keysOffset:n,isStringKey:s}=v1(i,t.keys),{valuesOffset:r,isStringValue:o}=S1(i,t.values),a=t.end?.length?Qe.createEndVector(i,t.end):null,c=t.start?.length?Qe.createStartVector(i,t.start):null;return Qe.startModelIndex(i),Qe.addName(i,e),s?Qe.addStringKeys(i,n):Qe.addNumberKeys(i,n),r!==null&&(o?Qe.addStringValues(i,r):Qe.addNumberValues(i,r)),a!==null&&Qe.addEnd(i,a),c!==null&&Qe.addStart(i,c),Qe.endModelIndex(i)}function s0(i,t){let e=y1(t);return _p(i,e)}function y1(i){let t=i.name()??"",e=i.stringKeysLength(),n=i.stringValuesLength(),s=i.numberValuesLength(),r=i.endLength(),o=i.startLength(),a;if(e>0){let u=new Array(e);for(let d=0;d<e;d++)u[d]=i.stringKeys(d)??"";a=u}else{let u=i.numberKeysArray();a=u?Array.from(u):[]}let c;if(n>0){let u=new Array(n);for(let d=0;d<n;d++)u[d]=i.stringValues(d)??"";c=u}else if(s>0){let u=i.numberValuesArray();c=u?Array.from(u):[]}let l;if(r>0){let u=i.endArray();l=u?Array.from(u):[]}let h;if(o>0){let u=i.startArray();h=u?Array.from(u):[]}return{name:t,keys:a,values:c,end:l,start:h}}function v1(i,t){if(t.length===0)return{keysOffset:Qe.createNumberKeysVector(i,[]),isStringKey:!1};if(typeof t[0]=="string"){let e=t.map(n=>i.createString(n));return{keysOffset:Qe.createStringKeysVector(i,e),isStringKey:!0}}return{keysOffset:Qe.createNumberKeysVector(i,t),isStringKey:!1}}function S1(i,t){if(!t||t.length===0)return{valuesOffset:null,isStringValue:!1};if(typeof t[0]=="string"){let e=t.map(n=>i.createString(n));return{valuesOffset:Qe.createStringValuesVector(i,e),isStringValue:!0}}return{valuesOffset:Qe.createNumberValuesVector(i,t),isStringValue:!1}}var de=(i=>(i[i.NONE=0]="NONE",i[i.SHELL=1]="SHELL",i[i.CIRCLE_EXTRUSION=2]="CIRCLE_EXTRUSION",i))(de||{});function r0(i,t){let e=new Set,n=new Set,s=new Set,r=new Set,o=new Set,a=new Set,c=new Set,l=new Set,h=!1,u=0,d=0,f=0,p=0,b=0,g=0,m=0,M=new Set,w=new Set,_=new Set,E=new Set,T=new Set,I=new Set,y=new Set,A=i.meshes(),L=new Set(A.globalTransformIdsArray()),N=new Set(A.localTransformIdsArray()),k=new Set(A.materialIdsArray()),V=new Set(A.representationIdsArray()),O=new Set(i.localIdsArray()),H=new Set(A.sampleIdsArray()),U=new Set;for(let D of t){if(D.type===ot.CREATE_SAMPLE&&(h=!0),D.type===ot.UPDATE_LOCAL_TRANSFORM){s.add(D.localId);continue}if(D.type===ot.UPDATE_MATERIAL){o.add(D.localId);continue}if(D.type===ot.UPDATE_REPRESENTATION){a.add(D.localId);continue}if(D.type===ot.UPDATE_ITEM){e.add(D.localId);continue}if(D.type===ot.CREATE_GLOBAL_TRANSFORM){O.has(D.data.itemId)&&e.add(D.data.itemId);continue}if(D.type===ot.UPDATE_GLOBAL_TRANSFORM){n.add(D.localId),O.has(D.data.itemId)&&e.add(D.data.itemId);continue}if(D.type===ot.UPDATE_SAMPLE){U.has(D.localId)||r.add(D.localId),L.has(D.data.item)&&n.add(D.data.item),N.has(D.data.localTransform)&&_.add(D.data.localTransform),k.has(D.data.material)&&E.add(D.data.material),V.has(D.data.representation)&&T.add(D.data.representation);continue}if(D.type===ot.CREATE_SAMPLE){U.add(D.localId),L.has(D.data.item)&&n.add(D.data.item),N.has(D.data.localTransform)&&_.add(D.data.localTransform),k.has(D.data.material)&&E.add(D.data.material),V.has(D.data.representation)&&T.add(D.data.representation);continue}}let W=new Set;for(let D of t){if(D.type===ot.DELETE_GLOBAL_TRANSFORM){n.delete(D.localId),L.has(D.localId)||u++;continue}if(D.type===ot.DELETE_LOCAL_TRANSFORM){s.delete(D.localId),N.has(D.localId)||d++;continue}if(D.type===ot.DELETE_SAMPLE){r.delete(D.localId),M.add(D.localId),H.has(D.localId)||f++;continue}if(D.type===ot.DELETE_MATERIAL){o.delete(D.localId),k.has(D.localId)||p++;continue}if(D.type===ot.DELETE_REPRESENTATION){a.delete(D.localId),W.add(D.localId),V.has(D.localId)||b++;continue}if(D.type===ot.DELETE_ITEM){e.delete(D.localId);continue}}let K=Jt.getRepresentations(i,W);for(let[D,Z]of K)if(!V.has(D))if(Z.representationClass===de.SHELL)g++;else if(Z.representationClass===de.CIRCLE_EXTRUSION)m++;else throw new Error("Unsupported representation class");for(let D of t)if(D.type===ot.CREATE_REPRESENTATION&&W.has(D.localId))if(D.data.representationClass===de.SHELL)g++;else if(D.data.representationClass===de.CIRCLE_EXTRUSION)m++;else throw new Error("Unsupported representation class");for(let D=0;D<A.samplesLength();D++){let Z=A.samples(D),ct=Z.item(),Mt=Z.localTransform(),Wt=Z.material(),It=Z.representation(),Ht=A.globalTransformIds(ct),$=A.localTransformIds(Mt),nt=A.materialIds(Wt),mt=A.representationIds(It),Tt=A.meshesItems(ct),ht=i.localIds(Tt);(n.has(Ht)||s.has($)||o.has(nt)||a.has(mt)||e.has(ht))&&O.has(ht)&&e.add(ht)}for(let D=0;D<A.samplesLength();D++){let Z=A.sampleIds(D);if(M.has(Z))continue;let ct=A.samples(D),Mt=ct.item(),Wt=ct.localTransform(),It=ct.material(),Ht=ct.representation(),$=A.globalTransformIds(Mt),nt=A.localTransformIds(Wt),mt=A.materialIds(It),Tt=A.representationIds(Ht),ht=A.meshesItems(Mt),Gt=i.localIds(ht);(n.has($)||s.has(nt)||o.has(mt)||a.has(Tt)||e.has(Gt))&&(L.has($)&&w.add($),N.has(nt)&&_.add(nt),k.has(mt)&&E.add(mt),V.has(Tt)&&T.add(Tt),O.has(Gt)&&y.add(Gt),I.add(Z))}L.clear(),N.clear(),k.clear(),V.clear(),O.clear(),H.clear();for(let D of w)n.add(D);for(let D of _)s.add(D);for(let D of E)o.add(D);for(let D of T)a.add(D);for(let D of I)r.add(D);for(let D of y)e.add(D);w.clear(),_.clear(),E.clear(),T.clear(),I.clear(),y.clear();let G=Jt.getGeometryIndicesFromRepresentations(i,a);for(let D of G.shellsIndices)c.add(D);for(let D of G.rebarsIndices)l.add(D);return{itemIds:e,globalTranforms:n,localTransforms:s,samples:r,materials:o,representations:a,shells:c,circleExtrusions:l,detaDeletedGts:u,detaDeletedLts:d,detaDeletedSamples:f,detaDeletedMaterials:p,detaDeletedRepresentations:b,detaDeletedShells:g,detaDeletedCircleExtrusions:m,createNewSample:h}}var ki=class{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}r(){return this.bb.readUint8(this.bb_pos)}mutate_r(t){return this.bb.writeUint8(this.bb_pos+0,t),!0}g(){return this.bb.readUint8(this.bb_pos+1)}mutate_g(t){return this.bb.writeUint8(this.bb_pos+1,t),!0}b(){return this.bb.readUint8(this.bb_pos+2)}mutate_b(t){return this.bb.writeUint8(this.bb_pos+2,t),!0}a(){return this.bb.readUint8(this.bb_pos+3)}mutate_a(t){return this.bb.writeUint8(this.bb_pos+3,t),!0}renderedFaces(){return this.bb.readInt8(this.bb_pos+4)}mutate_rendered_faces(t){return this.bb.writeInt8(this.bb_pos+4,t),!0}stroke(){return this.bb.readInt8(this.bb_pos+5)}mutate_stroke(t){return this.bb.writeInt8(this.bb_pos+5,t),!0}static sizeOf(){return 6}static createMaterial(t,e,n,s,r,o,a){return t.prep(1,6),t.writeInt8(a),t.writeInt8(o),t.writeInt8(r),t.writeInt8(s),t.writeInt8(n),t.writeInt8(e),t.offset()}};var nd=class{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}min(t){return(t||new Fe).__init(this.bb_pos,this.bb)}max(t){return(t||new Fe).__init(this.bb_pos+12,this.bb)}static sizeOf(){return 24}static createBoundingBox(t,e,n,s,r,o,a){return t.prep(4,24),t.prep(4,12),t.writeFloat32(a),t.writeFloat32(o),t.writeFloat32(r),t.prep(4,12),t.writeFloat32(s),t.writeFloat32(n),t.writeFloat32(e),t.offset()}};var ei=class{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}id(){return this.bb.readUint32(this.bb_pos)}mutate_id(t){return this.bb.writeUint32(this.bb_pos+0,t),!0}bbox(t){return(t||new nd).__init(this.bb_pos+4,this.bb)}representationClass(){return this.bb.readInt8(this.bb_pos+28)}mutate_representation_class(t){return this.bb.writeInt8(this.bb_pos+28,t),!0}static sizeOf(){return 32}static createRepresentation(t,e,n,s,r,o,a,c,l){return t.prep(4,32),t.pad(3),t.writeInt8(l),t.prep(4,24),t.prep(4,12),t.writeFloat32(c),t.writeFloat32(a),t.writeFloat32(o),t.prep(4,12),t.writeFloat32(r),t.writeFloat32(s),t.writeFloat32(n),t.writeInt32(e),t.offset()}};var Lt=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsMeshes(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsMeshes(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}coordinates(t){let e=this.bb.__offset(this.bb_pos,4);return e?(t||new qn).__init(this.bb_pos+e,this.bb):null}meshesItems(t){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}meshesItemsLength(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}meshesItemsArray(){let t=this.bb.__offset(this.bb_pos,6);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}samples(t,e){let n=this.bb.__offset(this.bb_pos,8);return n?(e||new Bs).__init(this.bb.__vector(this.bb_pos+n)+t*16,this.bb):null}samplesLength(){let t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}representations(t,e){let n=this.bb.__offset(this.bb_pos,10);return n?(e||new ei).__init(this.bb.__vector(this.bb_pos+n)+t*32,this.bb):null}representationsLength(){let t=this.bb.__offset(this.bb_pos,10);return t?this.bb.__vector_len(this.bb_pos+t):0}materials(t,e){let n=this.bb.__offset(this.bb_pos,12);return n?(e||new ki).__init(this.bb.__vector(this.bb_pos+n)+t*6,this.bb):null}materialsLength(){let t=this.bb.__offset(this.bb_pos,12);return t?this.bb.__vector_len(this.bb_pos+t):0}circleExtrusions(t,e){let n=this.bb.__offset(this.bb_pos,14);return n?(e||new Mn).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+n)+t*4),this.bb):null}circleExtrusionsLength(){let t=this.bb.__offset(this.bb_pos,14);return t?this.bb.__vector_len(this.bb_pos+t):0}shells(t,e){let n=this.bb.__offset(this.bb_pos,16);return n?(e||new Ze).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+n)+t*4),this.bb):null}shellsLength(){let t=this.bb.__offset(this.bb_pos,16);return t?this.bb.__vector_len(this.bb_pos+t):0}localTransforms(t,e){let n=this.bb.__offset(this.bb_pos,18);return n?(e||new qn).__init(this.bb.__vector(this.bb_pos+n)+t*48,this.bb):null}localTransformsLength(){let t=this.bb.__offset(this.bb_pos,18);return t?this.bb.__vector_len(this.bb_pos+t):0}globalTransforms(t,e){let n=this.bb.__offset(this.bb_pos,20);return n?(e||new qn).__init(this.bb.__vector(this.bb_pos+n)+t*48,this.bb):null}globalTransformsLength(){let t=this.bb.__offset(this.bb_pos,20);return t?this.bb.__vector_len(this.bb_pos+t):0}materialIds(t){let e=this.bb.__offset(this.bb_pos,22);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}materialIdsLength(){let t=this.bb.__offset(this.bb_pos,22);return t?this.bb.__vector_len(this.bb_pos+t):0}materialIdsArray(){let t=this.bb.__offset(this.bb_pos,22);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}representationIds(t){let e=this.bb.__offset(this.bb_pos,24);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}representationIdsLength(){let t=this.bb.__offset(this.bb_pos,24);return t?this.bb.__vector_len(this.bb_pos+t):0}representationIdsArray(){let t=this.bb.__offset(this.bb_pos,24);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}sampleIds(t){let e=this.bb.__offset(this.bb_pos,26);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}sampleIdsLength(){let t=this.bb.__offset(this.bb_pos,26);return t?this.bb.__vector_len(this.bb_pos+t):0}sampleIdsArray(){let t=this.bb.__offset(this.bb_pos,26);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}localTransformIds(t){let e=this.bb.__offset(this.bb_pos,28);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}localTransformIdsLength(){let t=this.bb.__offset(this.bb_pos,28);return t?this.bb.__vector_len(this.bb_pos+t):0}localTransformIdsArray(){let t=this.bb.__offset(this.bb_pos,28);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}globalTransformIds(t){let e=this.bb.__offset(this.bb_pos,30);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}globalTransformIdsLength(){let t=this.bb.__offset(this.bb_pos,30);return t?this.bb.__vector_len(this.bb_pos+t):0}globalTransformIdsArray(){let t=this.bb.__offset(this.bb_pos,30);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}static startMeshes(t){t.startObject(14)}static addCoordinates(t,e){t.addFieldStruct(0,e,0)}static addMeshesItems(t,e){t.addFieldOffset(1,e,0)}static createMeshesItemsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startMeshesItemsVector(t,e){t.startVector(4,e,4)}static addSamples(t,e){t.addFieldOffset(2,e,0)}static startSamplesVector(t,e){t.startVector(16,e,4)}static addRepresentations(t,e){t.addFieldOffset(3,e,0)}static startRepresentationsVector(t,e){t.startVector(32,e,4)}static addMaterials(t,e){t.addFieldOffset(4,e,0)}static startMaterialsVector(t,e){t.startVector(6,e,1)}static addCircleExtrusions(t,e){t.addFieldOffset(5,e,0)}static createCircleExtrusionsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startCircleExtrusionsVector(t,e){t.startVector(4,e,4)}static addShells(t,e){t.addFieldOffset(6,e,0)}static createShellsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startShellsVector(t,e){t.startVector(4,e,4)}static addLocalTransforms(t,e){t.addFieldOffset(7,e,0)}static startLocalTransformsVector(t,e){t.startVector(48,e,8)}static addGlobalTransforms(t,e){t.addFieldOffset(8,e,0)}static startGlobalTransformsVector(t,e){t.startVector(48,e,8)}static addMaterialIds(t,e){t.addFieldOffset(9,e,0)}static createMaterialIdsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startMaterialIdsVector(t,e){t.startVector(4,e,4)}static addRepresentationIds(t,e){t.addFieldOffset(10,e,0)}static createRepresentationIdsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startRepresentationIdsVector(t,e){t.startVector(4,e,4)}static addSampleIds(t,e){t.addFieldOffset(11,e,0)}static createSampleIdsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startSampleIdsVector(t,e){t.startVector(4,e,4)}static addLocalTransformIds(t,e){t.addFieldOffset(12,e,0)}static createLocalTransformIdsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startLocalTransformIdsVector(t,e){t.startVector(4,e,4)}static addGlobalTransformIds(t,e){t.addFieldOffset(13,e,0)}static createGlobalTransformIdsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startGlobalTransformIdsVector(t,e){t.startVector(4,e,4)}static endMeshes(t){let e=t.endObject();return t.requiredField(e,4),t.requiredField(e,6),t.requiredField(e,8),t.requiredField(e,10),t.requiredField(e,12),t.requiredField(e,14),t.requiredField(e,16),t.requiredField(e,18),t.requiredField(e,20),e}static createMeshes(t,e,n,s,r,o,a,c,l,h,u,d,f,p,b){return i.startMeshes(t),i.addCoordinates(t,e),i.addMeshesItems(t,n),i.addSamples(t,s),i.addRepresentations(t,r),i.addMaterials(t,o),i.addCircleExtrusions(t,a),i.addShells(t,c),i.addLocalTransforms(t,l),i.addGlobalTransforms(t,h),i.addMaterialIds(t,u),i.addRepresentationIds(t,d),i.addSampleIds(t,f),i.addLocalTransformIds(t,p),i.addGlobalTransformIds(t,b),i.endMeshes(t)}};var hs=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsAttribute(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsAttribute(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}data(t,e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+t*4,e):null}dataLength(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}static startAttribute(t){t.startObject(1)}static addData(t,e){t.addFieldOffset(0,e,0)}static createDataVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startDataVector(t,e){t.startVector(4,e,4)}static endAttribute(t){let e=t.endObject();return t.requiredField(e,4),e}static createAttribute(t,e){return i.startAttribute(t),i.addData(t,e),i.endAttribute(t)}};var xr=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsRelation(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsRelation(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}data(t,e){let n=this.bb.__offset(this.bb_pos,4);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+t*4,e):null}dataLength(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}static startRelation(t){t.startObject(1)}static addData(t,e){t.addFieldOffset(0,e,0)}static createDataVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startDataVector(t,e){t.startVector(4,e,4)}static endRelation(t){let e=t.endObject();return t.requiredField(e,4),e}static createRelation(t,e){return i.startRelation(t),i.addData(t,e),i.endRelation(t)}};var zt=class i{constructor(){v(this,"bb",null);v(this,"bb_pos",0)}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsModel(t,e){return(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsModel(t,e){return t.setPosition(t.position()+4),(e||new i).__init(t.readInt32(t.position())+t.position(),t)}static bufferHasIdentifier(t){return t.__has_identifier("0001")}metadata(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__string(this.bb_pos+e,t):null}guids(t,e){let n=this.bb.__offset(this.bb_pos,6);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+t*4,e):null}guidsLength(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}guidsItems(t){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}guidsItemsLength(){let t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}guidsItemsArray(){let t=this.bb.__offset(this.bb_pos,8);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}maxLocalId(){let t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readUint32(this.bb_pos+t):0}mutate_max_local_id(t){let e=this.bb.__offset(this.bb_pos,10);return e===0?!1:(this.bb.writeUint32(this.bb_pos+e,t),!0)}localIds(t){let e=this.bb.__offset(this.bb_pos,12);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+t*4):0}localIdsLength(){let t=this.bb.__offset(this.bb_pos,12);return t?this.bb.__vector_len(this.bb_pos+t):0}localIdsArray(){let t=this.bb.__offset(this.bb_pos,12);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}categories(t,e){let n=this.bb.__offset(this.bb_pos,14);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+t*4,e):null}categoriesLength(){let t=this.bb.__offset(this.bb_pos,14);return t?this.bb.__vector_len(this.bb_pos+t):0}meshes(t){let e=this.bb.__offset(this.bb_pos,16);return e?(t||new Lt).__init(this.bb.__indirect(this.bb_pos+e),this.bb):null}attributes(t,e){let n=this.bb.__offset(this.bb_pos,18);return n?(e||new hs).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+n)+t*4),this.bb):null}attributesLength(){let t=this.bb.__offset(this.bb_pos,18);return t?this.bb.__vector_len(this.bb_pos+t):0}relations(t,e){let n=this.bb.__offset(this.bb_pos,20);return n?(e||new xr).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+n)+t*4),this.bb):null}relationsLength(){let t=this.bb.__offset(this.bb_pos,20);return t?this.bb.__vector_len(this.bb_pos+t):0}relationsItems(t){let e=this.bb.__offset(this.bb_pos,22);return e?this.bb.readInt32(this.bb.__vector(this.bb_pos+e)+t*4):0}relationsItemsLength(){let t=this.bb.__offset(this.bb_pos,22);return t?this.bb.__vector_len(this.bb_pos+t):0}relationsItemsArray(){let t=this.bb.__offset(this.bb_pos,22);return t?new Int32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}guid(t){let e=this.bb.__offset(this.bb_pos,24);return e?this.bb.__string(this.bb_pos+e,t):null}spatialStructure(t){let e=this.bb.__offset(this.bb_pos,26);return e?(t||new We).__init(this.bb.__indirect(this.bb_pos+e),this.bb):null}uniqueAttributes(t,e){let n=this.bb.__offset(this.bb_pos,28);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+t*4,e):null}uniqueAttributesLength(){let t=this.bb.__offset(this.bb_pos,28);return t?this.bb.__vector_len(this.bb_pos+t):0}relationNames(t,e){let n=this.bb.__offset(this.bb_pos,30);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+t*4,e):null}relationNamesLength(){let t=this.bb.__offset(this.bb_pos,30);return t?this.bb.__vector_len(this.bb_pos+t):0}indexes(t,e){let n=this.bb.__offset(this.bb_pos,32);return n?(e||new Qe).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+n)+t*4),this.bb):null}indexesLength(){let t=this.bb.__offset(this.bb_pos,32);return t?this.bb.__vector_len(this.bb_pos+t):0}static startModel(t){t.startObject(15)}static addMetadata(t,e){t.addFieldOffset(0,e,0)}static addGuids(t,e){t.addFieldOffset(1,e,0)}static createGuidsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startGuidsVector(t,e){t.startVector(4,e,4)}static addGuidsItems(t,e){t.addFieldOffset(2,e,0)}static createGuidsItemsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startGuidsItemsVector(t,e){t.startVector(4,e,4)}static addMaxLocalId(t,e){t.addFieldInt32(3,e,0)}static addLocalIds(t,e){t.addFieldOffset(4,e,0)}static createLocalIdsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startLocalIdsVector(t,e){t.startVector(4,e,4)}static addCategories(t,e){t.addFieldOffset(5,e,0)}static createCategoriesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startCategoriesVector(t,e){t.startVector(4,e,4)}static addMeshes(t,e){t.addFieldOffset(6,e,0)}static addAttributes(t,e){t.addFieldOffset(7,e,0)}static createAttributesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startAttributesVector(t,e){t.startVector(4,e,4)}static addRelations(t,e){t.addFieldOffset(8,e,0)}static createRelationsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startRelationsVector(t,e){t.startVector(4,e,4)}static addRelationsItems(t,e){t.addFieldOffset(9,e,0)}static createRelationsItemsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startRelationsItemsVector(t,e){t.startVector(4,e,4)}static addGuid(t,e){t.addFieldOffset(10,e,0)}static addSpatialStructure(t,e){t.addFieldOffset(11,e,0)}static addUniqueAttributes(t,e){t.addFieldOffset(12,e,0)}static createUniqueAttributesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startUniqueAttributesVector(t,e){t.startVector(4,e,4)}static addRelationNames(t,e){t.addFieldOffset(13,e,0)}static createRelationNamesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startRelationNamesVector(t,e){t.startVector(4,e,4)}static addIndexes(t,e){t.addFieldOffset(14,e,0)}static createIndexesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startIndexesVector(t,e){t.startVector(4,e,4)}static endModel(t){let e=t.endObject();return t.requiredField(e,6),t.requiredField(e,8),t.requiredField(e,12),t.requiredField(e,14),t.requiredField(e,16),t.requiredField(e,24),e}static finishModelBuffer(t,e){t.finish(e,"0001")}static finishSizePrefixedModelBuffer(t,e){t.finish(e,"0001",!0)}};function id(i){let t=new mo(1024);Lt.startGlobalTransformsVector(t,0);let e=t.endVector(),n=Lt.createShellsVector(t,[]);Lt.startRepresentationsVector(t,0);let s=t.endVector();Lt.startSamplesVector(t,0);let r=t.endVector();Lt.startLocalTransformsVector(t,0);let o=t.endVector();Lt.startMaterialsVector(t,0);let a=t.endVector(),c=Lt.createCircleExtrusionsVector(t,[]),l=Lt.createMeshesItemsVector(t,[]),h=Lt.createRepresentationIdsVector(t,[]),u=Lt.createSampleIdsVector(t,[]),d=Lt.createMaterialIdsVector(t,[]),f=Lt.createLocalTransformIdsVector(t,[]),p=Lt.createGlobalTransformIdsVector(t,[]);Lt.startMeshes(t);let b=gr({position:[0,0,0],xDirection:[1,0,0],yDirection:[0,1,0]},t);Lt.addCoordinates(t,b),Lt.addGlobalTransforms(t,e),Lt.addShells(t,n),Lt.addRepresentations(t,s),Lt.addSamples(t,r),Lt.addLocalTransforms(t,o),Lt.addMaterials(t,a),Lt.addCircleExtrusions(t,c),Lt.addMeshesItems(t,l),Lt.addRepresentationIds(t,h),Lt.addSampleIds(t,u),Lt.addMaterialIds(t,d),Lt.addLocalTransformIds(t,f),Lt.addGlobalTransformIds(t,p);let g=Lt.endMeshes(t),m=t.createString(JSON.stringify(Ng())),M=zt.createAttributesVector(t,[]),w=zt.createUniqueAttributesVector(t,[]),_=zt.createRelationNamesVector(t,[]),E=zt.createLocalIdsVector(t,[]),T=zt.createCategoriesVector(t,[]),I=zt.createRelationsItemsVector(t,[]),y=zt.createRelationsVector(t,[]),A=zt.createGuidsItemsVector(t,[]),L=zt.createGuidsVector(t,[]),N=t.createString(Qi.generateUUID());zt.startModel(t),zt.addMeshes(t,g),zt.addMetadata(t,m),zt.addAttributes(t,M),zt.addUniqueAttributes(t,w),zt.addRelationNames(t,_),zt.addLocalIds(t,E),zt.addCategories(t,T),zt.addRelationsItems(t,I),zt.addRelations(t,y),zt.addGuidsItems(t,A),zt.addGuids(t,L),zt.addGuid(t,N),zt.addMaxLocalId(t,1);let k=zt.endModel(t);t.finish(k);let V=t.asUint8Array();return t.clear(),i.raw?V:wo.deflate(V)}function o0(i,t,e,n,s){for(let r of i)(r.type===ot.UPDATE_SAMPLE||r.type===ot.DELETE_SAMPLE)&&t.add(r.localId);for(let r=0;r<e.sampleIdsLength();r++){let o=e.sampleIds(r);if(t.has(o)){let c=e.samples(r).item(),l=e.meshesItems(c),h=n.localIds(l);s.add(h)}}}function a0(i,t,e){let n=i.meshes(),s=e?.raw??!1,r=e?.delta??!1,o=new Set,a=new Set,c=new Set,l=new Set,h=new Set,u=new Set,d=new Set,f=new Set,p=0,b=0,g=0,m=0,M=0,w=0,_=0;if(r){let P=r0(i,t);if(o=P.itemIds,a=P.globalTranforms,c=P.localTransforms,l=P.samples,h=P.materials,u=P.representations,d=P.shells,f=P.circleExtrusions,p=P.detaDeletedGts,b=P.detaDeletedLts,g=P.detaDeletedSamples,m=P.detaDeletedMaterials,M=P.detaDeletedRepresentations,w=P.detaDeletedShells,_=P.detaDeletedCircleExtrusions,!P.createNewSample&&o.size===0&&a.size===0&&c.size===0&&l.size===0&&h.size===0&&u.size===0&&d.size===0&&f.size===0){let lt=new Set;return o0(t,new Set,n,i,lt),{model:id({raw:s}),items:Array.from(lt)}}}let E=new Map,T=new Map,I=new Map,y=new Map,A=new Map,L=new Map,N=new Map,k=new Map,V=new Map,O=null,H=null,U=new Map,W=new Map,K=new Map,G=new Map,D=new Map,Z=new Map,ct=new Map,Mt=new Map,Wt=new Map,It=new Set,Ht=new Set,$=new Set,nt=new Set,mt=new Set,Tt=new Set,ht=new Set,Gt=new Set,Ve=new Set,ee=new Map,le=new Set,ve=new Set(n.materialIdsArray()),re=new Set(n.representationIdsArray()),Ce=new Set(n.sampleIdsArray()),je=new Set(n.globalTransformIdsArray()),mn=new Set(n.localTransformIdsArray()),Oe=new Set(i.localIdsArray()),ke=i.maxLocalId();for(let P of t){if(P.type===ot.UPDATE_MATERIAL){E.set(P.localId,P.data);continue}if(P.type===ot.UPDATE_REPRESENTATION){T.set(P.localId,P.data);continue}if(P.type===ot.UPDATE_SAMPLE){I.set(P.localId,P.data);continue}if(P.type===ot.UPDATE_GLOBAL_TRANSFORM){y.set(P.localId,P.data);continue}if(P.type===ot.UPDATE_LOCAL_TRANSFORM){A.set(P.localId,P.data);continue}if(P.type===ot.UPDATE_ITEM){k.set(P.localId,P.data);continue}if(P.type===ot.UPDATE_RELATION){V.set(P.localId,P.data);continue}if(P.type===ot.UPDATE_METADATA){O=P.data;continue}if(P.type===ot.UPDATE_SPATIAL_STRUCTURE){H=P.data;continue}if(P.type===ot.CREATE_MATERIAL){let Q=P.localId;if(ve.has(Q))continue;U.set(Q,P.data);continue}if(P.type===ot.CREATE_REPRESENTATION){let Q=P.localId;if(re.has(Q))continue;W.set(Q,P.data),P.data.representationClass===de.SHELL?K.set(Q,P.data.geometry):P.data.representationClass===de.CIRCLE_EXTRUSION&&G.set(Q,P.data.geometry);continue}if(P.type===ot.CREATE_SAMPLE){let Q=P.localId;if(Ce.has(Q))continue;D.set(Q,P.data);continue}if(P.type===ot.CREATE_GLOBAL_TRANSFORM){let Q=P.localId;if(je.has(Q))continue;Z.set(Q,P.data);continue}if(P.type===ot.CREATE_LOCAL_TRANSFORM){let Q=P.localId;if(mn.has(Q))continue;ct.set(Q,P.data);continue}if(P.type===ot.CREATE_ITEM){let Q=P.localId;if(Oe.has(Q))continue;Mt.set(Q,P.data)}if(P.type===ot.CREATE_RELATION){let Q=P.localId;Wt.set(Q,P.data)}if(P.type===ot.DELETE_MATERIAL){It.add(P.localId);continue}if(P.type===ot.DELETE_REPRESENTATION){$.add(P.localId);continue}if(P.type===ot.DELETE_SAMPLE){Ht.add(P.localId);continue}if(P.type===ot.DELETE_GLOBAL_TRANSFORM){Tt.add(P.localId);continue}if(P.type===ot.DELETE_LOCAL_TRANSFORM){ht.add(P.localId);continue}if(P.type===ot.DELETE_ITEM){Gt.add(P.localId);continue}if(P.type===ot.UPDATE_MAX_LOCAL_ID){ke=P.localId;continue}if(P.type===ot.DELETE_RELATION){Ve.add(P.localId);continue}if(P.type===ot.CREATE_INDEX||P.type===ot.UPDATE_INDEX){let{keys:Q,values:lt,end:Rt,start:Bt}=P.data,qt=(Yt,te)=>{if(!Yt||Yt.length===0||typeof Yt[0]!="number")return;let pe=[];for(let Le=0;Le<Yt.length;Le++){let cn=Yt[Le];(!Number.isInteger(cn)||cn<0||cn>4294967295)&&pe.push({index:Le,value:cn})}if(pe.length)throw new Error(`Invalid index request: ${te} must be non-negative 32-bit integers`,{cause:{type:"invalid-number",key:te,errors:pe}})};if(qt(Q,"keys"),qt(lt,"values"),lt&&!Rt&&lt.length!==Q.length)throw new Error("Invalid index request: unexpected values vector length",{cause:{type:"invalid-length",key:"values",expected:Q.length,actual:lt.length}});if(lt&&Rt){if(Rt.length!==Q.length)throw new Error("Invalid index request: unexpected end vector length",{cause:{type:"invalid-length",key:"end",expected:Q.length,actual:Rt.length}});if(Bt&&Bt.length!==Q.length)throw new Error("Invalid index request: unexpected start vector length",{cause:{type:"invalid-length",key:"start",expected:Q.length,actual:Bt.length}});let Yt=[];for(let te=0;te<Q.length;te++){let pe=Bt?.[te]??Rt[te-1]??0,Le=Rt[te];(pe<0||Le>lt.length||pe>Le)&&Yt.push({index:te,start:pe,end:Le})}if(Yt.length)throw new Error("Invalid index request: out of bounds value slices",{cause:{type:"invalid-bounds",errors:Yt}})}ee.set(P.data.name,P.data),le.delete(P.data.name);continue}if(P.type===ot.DELETE_INDEX){le.add(P.name),ee.delete(P.name);continue}}for(let P=0;P<n.representationsLength();P++){let Q=n.representations(P),lt=Q.id(),Rt=n.representationIds(P);if(r&&!u.has(Rt))continue;if($.has(Rt)){if(Q.representationClass()===de.SHELL)nt.add(lt);else if(Q.representationClass()===de.CIRCLE_EXTRUSION)mt.add(lt);else throw new Error("Representation class is not supported");continue}if(!T.has(Rt))continue;let Bt=Q.representationClass();if(Bt===de.SHELL)L.set(lt,Rt);else if(Bt===de.CIRCLE_EXTRUSION)N.set(lt,Rt);else throw new Error("Representation class is not supported")}ve.clear(),re.clear(),Ce.clear(),je.clear(),mn.clear(),Oe.clear();let z=n.materialsLength(),an=r?h.size:z,me=r?m:It.size,C=an+U.size-me,x=n.representationsLength(),X=r?u.size:x,j=r?M:$.size,tt=0;if(r)for(let[P]of W)u.has(P)&&tt++;let dt=X+W.size-j-tt,pt=n.shellsLength(),et=r?d.size:pt,st=r?w:nt.size,gt=et+K.size-st,Ot=n.circleExtrusionsLength(),vt=r?f.size:Ot,bt=r?_:mt.size,Ut=vt+G.size-bt,Vt=n.samplesLength(),Qt=r?l.size:Vt,B=r?g:Ht.size,_t=Qt+D.size-B,it=n.globalTransformsLength(),xt=r?a.size:it,wt=r?p:Tt.size,at=xt+Z.size-wt,Ft=n.localTransformsLength(),Dt=r?c.size:Ft,Ae=r?b:ht.size,ue=Dt+ct.size-Ae;if(at<0||dt<0||_t<0||ue<0||C<0||gt<0||Ut<0)throw new Error("Invalid number of elements");let ie=new Map,Fn=[],Po=[],Mr=[],wr=[],fs=[],Lo=[],Hs=[],Do=0;for(let P=0;P<n.globalTransformsLength();P++){let Q=n.globalTransformIds(P);if(!Tt.has(Q)&&!(r&&!a.has(Q))){if(ie.has(Q))throw new Error("Local id already exists");ie.set(Q,Do++),wr.push(Q)}}for(let[P]of Z)if(!Tt.has(P)){if(ie.has(P))throw new Error("Local id already exists");ie.set(P,Do++),wr.push(P)}let Ei=0;for(let P=0;P<n.materialIdsLength();P++){let Q=n.materialIds(P);if(!It.has(Q)&&!(r&&!h.has(Q))){if(ie.has(Q))throw new Error("Local id already exists");ie.set(Q,Ei++),Fn.push(Q)}}for(let[P]of U)if(!It.has(P)){if(ie.has(P))throw new Error("Local id already exists");ie.set(P,Ei++),Fn.push(P)}let Er=0;for(let P=0;P<n.localTransformIdsLength();P++){let Q=n.localTransformIds(P);if(!ht.has(Q)&&!(r&&!c.has(Q))){if(ie.has(Q))throw new Error("Local id already exists");ie.set(Q,Er++),Lo.push(Q)}}for(let[P]of ct)if(!ht.has(P)){if(ie.has(P))throw new Error("Local id already exists");ie.set(P,Er++),Lo.push(P)}let No=0;for(let P=0;P<n.representationIdsLength();P++){let Q=n.representationIds(P);if(!$.has(Q)&&!(r&&!u.has(Q))){if(ie.has(Q))throw new Error("Local id already exists");ie.set(Q,No++),Po.push(Q)}}for(let[P]of W)if(!$.has(P)){if(ie.has(P))throw new Error("Local id already exists");ie.set(P,No++),Po.push(P)}for(let P=0;P<n.sampleIdsLength();P++){let Q=n.sampleIds(P);Ht.has(Q)||r&&!l.has(Q)||Mr.push(Q)}for(let[P]of D)Ht.has(P)||Mr.push(P);let Oo=0;for(let P=0;P<i.localIdsLength();P++){let Q=i.localIds(P);Gt.has(Q)||r&&!o.has(Q)||(ie.set(Q,Oo++),Hs.push(Q))}for(let[P]of Mt)Gt.has(P)||(ie.set(P,Oo++),Hs.push(P));let rt=new mo(1024);Lt.startGlobalTransformsVector(rt,at);let Gs=Array.from(Z.keys());for(let P=0;P<Gs.length;P++){let Q=Gs.length-1-P,lt=Gs[Q],Bt=y.has(lt)?y.get(lt):Z.get(lt);if(!Bt)throw new Error(`Global transform not found: ${lt}`);if(Tt.has(lt))continue;let qt=Bt.itemId;if(!ie.has(qt))throw new Error("Item id not found for global transform");let Yt=ie.get(qt);fs.unshift(Yt),gr(Bt,rt)}Gs.length=0;for(let P=0;P<it;P++){let Q=it-1-P,lt=n.globalTransforms(Q),Rt=n.globalTransformIds(Q);if(Tt.has(Rt)||r&&!a.has(Rt))continue;if(y.has(Rt)){let qt=y.get(Rt),Yt=qt.itemId;if(!ie.has(Yt))throw new Error(`Item id not found for global transform: ${Rt}`);let te=ie.get(Yt);fs.unshift(te),gr(qt,rt)}else{let qt=n.meshesItems(Q),Yt=i.localIds(qt);if(!ie.has(Yt))throw new Error(`Item id not found for global transform: ${Rt}`);let te=ie.get(Yt);fs.unshift(te),Jh(rt,lt)}}let Tr=rt.endVector(),Ws=[];for(let P=0;P<pt;P++){if(nt.has(P)||r&&!d.has(P))continue;if(L.has(P)){let Rt=L.get(P),qt=T.get(Rt).geometry,Yt=Qh(rt,qt);Ws.push(Yt);continue}let Q=n.shells(P),lt=n0(rt,Q);Ws.push(lt)}for(let[P]of K){if($.has(P))continue;let Q=T.has(P),lt=0;if(Q){let Bt=T.get(P).geometry;lt=Qh(rt,Bt)}else{let Rt=K.get(P);lt=Qh(rt,Rt)}Ws.push(lt)}let gl=Lt.createShellsVector(rt,Ws),Ar=[];for(let P=0;P<Ot;P++){if(mt.has(P)||r&&!f.has(P))continue;if(N.has(P)){let Rt=N.get(P),qt=T.get(Rt).geometry,Yt=td(rt,qt);Ar.push(Yt);continue}let Q=n.circleExtrusions(P),lt=i0(rt,Q);Ar.push(lt)}for(let[P]of G){if(mt.has(P))continue;let Q=T.has(P),lt=0;if(Q){let Bt=T.get(P).geometry;lt=td(rt,Bt)}else{let Rt=G.get(P);lt=td(rt,Rt)}Ar.push(lt)}let Kd=Lt.createCircleExtrusionsVector(rt,Ar);Lt.startRepresentationsVector(rt,dt);let Ir=Array.from(W.keys()),Uo=gt-1,Rr=Ut-1;for(let P=0;P<Ir.length;P++){let Q=Ir.length-1-P,lt=Ir[Q];if($.has(lt))continue;let Bt=T.has(lt)?T.get(lt):W.get(lt);if(!Bt)throw new Error(`Representation not found: ${lt}`);let qt=Bt.bbox,Yt=Bt.representationClass,te=0;if(Bt.representationClass===de.SHELL)te=Uo--;else if(Bt.representationClass===de.CIRCLE_EXTRUSION)te=Rr--;else throw new Error("Representation class is not supported");ei.createRepresentation(rt,te,qt[0],qt[1],qt[2],qt[3],qt[4],qt[5],Yt)}Ir.length=0;for(let P=0;P<x;P++){let Q=x-1-P,lt=n.representations(Q),Rt=n.representationIds(Q);if($.has(Rt)||r&&!u.has(Rt))continue;if(T.has(Rt)){let qt=T.get(Rt),Yt=qt.bbox,te=0;if(qt.representationClass===de.SHELL)te=Uo--;else if(qt.representationClass===de.CIRCLE_EXTRUSION)te=Rr--;else throw new Error("Representation class is not supported");let pe=qt.representationClass;ei.createRepresentation(rt,te,Yt[0],Yt[1],Yt[2],Yt[3],Yt[4],Yt[5],pe)}else{let qt=lt.bbox(),Yt=0;if(lt.representationClass()===de.SHELL)Yt=Uo--;else if(lt.representationClass()===de.CIRCLE_EXTRUSION)Yt=Rr--;else throw new Error("Representation class is not supported");let te=lt.representationClass(),pe=qt.min(),Le=qt.max();ei.createRepresentation(rt,Yt,pe.x(),pe.y(),pe.z(),Le.x(),Le.y(),Le.z(),te)}}let S=rt.endVector();Lt.startSamplesVector(rt,_t);let F=Array.from(D.keys());for(let P=0;P<F.length;P++){let Q=F.length-1-P,lt=F[Q];if(Ht.has(lt))continue;let Bt=I.has(lt)?I.get(lt):D.get(lt);if(!Bt)throw new Error(`Sample not found: ${lt}`);if(It.has(Bt.material))throw new Error(`Material to delete found in sample ${lt}`);if($.has(Bt.representation))throw new Error(`Representation to delete found in sample ${lt}`);let qt=Bt.item,Yt=Bt.material,te=Bt.representation,pe=Bt.localTransform;ed(rt,ie,qt,Yt,te,pe)}F.length=0;for(let P=0;P<Vt;P++){let Q=Vt-1-P,lt=n.samples(Q),Rt=n.sampleIds(Q);if(Ht.has(Rt)||r&&!l.has(Rt))continue;if(I.has(Rt)){let Le=I.get(Rt),cn=Le.item,Xi=Le.material,Fo=Le.representation,J0=Le.localTransform;ed(rt,ie,cn,Xi,Fo,J0);continue}let qt=n.globalTransformIds(lt.item()),Yt=n.materialIds(lt.material()),te=n.representationIds(lt.representation()),pe=n.localTransformIds(lt.localTransform());if(It.has(Yt))throw new Error(`Material to delete found in sample ${Rt}`);ed(rt,ie,qt,Yt,te,pe)}let J=rt.endVector();Lt.startLocalTransformsVector(rt,ue);let q=Array.from(ct.keys());for(let P=0;P<q.length;P++){let Q=q.length-1-P,lt=q[Q];if(ht.has(lt))continue;let Bt=A.has(lt)?A.get(lt):ct.get(lt);if(!Bt)throw new Error(`Local transform not found: ${lt}`);gr(Bt,rt)}q.length=0;for(let P=0;P<Ft;P++){let Q=Ft-1-P,lt=n.localTransforms(Q),Rt=n.localTransformIds(Q),Bt=A.has(Rt);if(!ht.has(Rt)&&!(r&&!c.has(Rt)))if(Bt){let qt=A.get(Rt);gr(qt,rt)}else Jh(rt,lt)}let Y=rt.endVector();Lt.startMaterialsVector(rt,C);let yt=Array.from(U.keys());for(let P=0;P<yt.length;P++){let Q=yt.length-1-P,lt=yt[Q];if(It.has(lt))continue;let Bt=E.has(lt)?E.get(lt):U.get(lt);if(!Bt)throw new Error(`Material not found: ${lt}`);let qt=Bt.r,Yt=Bt.g,te=Bt.b,pe=Bt.a,Le=Bt.stroke,cn=Bt.renderedFaces;ki.createMaterial(rt,qt,Yt,te,pe,cn,Le)}yt.length=0;for(let P=0;P<z;P++){let Q=z-1-P,lt=n.materials(Q),Rt=n.materialIds(Q);if(It.has(Rt)||r&&!h.has(Rt))continue;let Bt=E.has(Rt),qt=E.get(Rt),Yt=Bt?qt.r:lt.r(),te=Bt?qt.g:lt.g(),pe=Bt?qt.b:lt.b(),Le=Bt?qt.a:lt.a(),cn=Bt?qt.stroke:lt.stroke(),Xi=Bt?qt.renderedFaces:lt.renderedFaces();ki.createMaterial(rt,Yt,te,pe,Le,Xi,cn)}let At=rt.endVector(),St=Lt.createMeshesItemsVector(rt,fs),Ct=Lt.createRepresentationIdsVector(rt,Po),Nt=Lt.createSampleIdsVector(rt,Mr),ne=Lt.createMaterialIdsVector(rt,Fn),oe=Lt.createLocalTransformIdsVector(rt,Lo),Pt=Lt.createGlobalTransformIdsVector(rt,wr);Lt.startMeshes(rt);let fe=n.coordinates(),Xe=Jh(rt,fe);Lt.addCoordinates(rt,Xe),Lt.addGlobalTransforms(rt,Tr),Lt.addShells(rt,gl),Lt.addRepresentations(rt,S),Lt.addSamples(rt,J),Lt.addLocalTransforms(rt,Y),Lt.addMaterials(rt,At),Lt.addCircleExtrusions(rt,Kd),Lt.addMeshesItems(rt,St),Lt.addRepresentationIds(rt,Ct),Lt.addSampleIds(rt,Nt),Lt.addMaterialIds(rt,ne),Lt.addLocalTransformIds(rt,oe),Lt.addGlobalTransformIds(rt,Pt);let Pe=Lt.endMeshes(rt),ge;if(O){let P=JSON.stringify(O);ge=rt.createString(P)}else{let P=i.metadata();ge=rt.createString(P)}let ln=i.attributesLength(),Et=[],tn=new Set,ae=[],gn=[],Ln=[],di=new Map;for(let P=0;P<i.guidsItemsLength();P++){let Q=i.guidsItems(P);di.set(Q,P)}for(let P=0;P<ln;P++){let Q=i.localIds(P);if(Gt.has(Q))continue;let lt=i.attributes(P),Rt=[];if(k.has(Q)){let te=k.get(Q);ae.push(rt.createSharedString(te.category)),te.guid&&(gn.push(rt.createSharedString(te.guid)),Ln.push(Q));for(let pe in te.data){let{value:Le,type:cn}=te.data[pe],Xi=JSON.stringify([pe,Le,cn]);tn.add(Xi);let Fo=rt.createSharedString(Xi);Rt.push(Fo)}}else{let te=i.categories(P);ae.push(rt.createSharedString(te));let pe=di.get(Q);if(pe!==void 0){let cn=i.guids(pe);gn.push(rt.createSharedString(cn)),Ln.push(Q)}let Le=lt.dataLength();for(let cn=0;cn<Le;cn++){let Xi=lt.data(cn);tn.add(Xi);let Fo=rt.createSharedString(Xi);Rt.push(Fo)}}let qt=hs.createDataVector(rt,Rt),Yt=hs.createAttribute(rt,qt);Et.push(Yt)}for(let[P,Q]of Mt){if(Gt.has(P))continue;ae.push(rt.createSharedString(Q.category)),Q.guid&&(gn.push(rt.createSharedString(Q.guid)),Ln.push(P));let lt=[];for(let qt in Q.data){let{value:Yt,type:te}=Q.data[qt],pe=JSON.stringify([qt,Yt,te]);tn.add(pe);let Le=rt.createSharedString(pe);lt.push(Le)}let Rt=hs.createDataVector(rt,lt),Bt=hs.createAttribute(rt,Rt);Et.push(Bt)}let ps=zt.createAttributesVector(rt,Et),_e=[];for(let P of tn){let Q=rt.createSharedString(P);_e.push(Q)}let He=zt.createUniqueAttributesVector(rt,_e),Ti=i.relationNamesLength(),Se=[];for(let P=0;P<Ti;P++){let Q=i.relationNames(P),lt=rt.createSharedString(Q);Se.push(lt)}let Ai=zt.createRelationNamesVector(rt,Se),ms=zt.createLocalIdsVector(rt,Hs),_l=zt.createCategoriesVector(rt,ae),wp=[],Jd=[],Qd=new Set,k0=i.relationsItemsLength(),Ep=P=>{let Q=[];for(let Bt in P.data){let Yt=P.data[Bt].filter(pe=>!Gt.has(pe));if(!Yt.length)continue;let te=rt.createSharedString(JSON.stringify([Bt,...Yt]));Q.push(te)}let lt=xr.createDataVector(rt,Q),Rt=xr.createRelation(rt,lt);wp.push(Rt)};for(let P=0;P<k0;P++){let Q=i.relationsItems(P);if(Qd.add(Q),Gt.has(Q)||Ve.has(Q)||!ie.has(Q))continue;let lt;if(V.has(Q))lt=V.get(Q);else{let Rt=i.relations(P);lt=Jt.getRelationData(Rt)}Ep(lt),Jd.push(Q)}for(let[P,Q]of Wt){if(Gt.has(P)||Ve.has(P)||Qd.has(P))continue;let lt;V.has(P)?lt=V.get(P):lt=Q,Ep(lt),Jd.push(P)}Qd.clear();let H0=zt.createRelationsVector(rt,wp),G0=zt.createRelationsItemsVector(rt,Jd),W0=zt.createGuidsItemsVector(rt,Ln),X0=zt.createGuidsVector(rt,gn),bl=null;if(H)bl=gp(rt,H);else{let P=i.spatialStructure();bl=mp(rt,P)}let q0=i.guid(),Y0=rt.createString(q0),xl=[],Z0=new Set(ee.keys());for(let P=0;P<i.indexesLength();P++){let Q=i.indexes(P);if(!Q)continue;let lt=Q.name();lt&&(le.has(lt)||Z0.has(lt)||xl.push(s0(rt,Q)))}for(let P of ee.values())xl.push(_p(rt,P));let Tp=xl.length>0?zt.createIndexesVector(rt,xl):null;zt.startModel(rt),zt.addMeshes(rt,Pe),zt.addMetadata(rt,ge),zt.addAttributes(rt,ps),zt.addUniqueAttributes(rt,He),zt.addRelationNames(rt,Ai),zt.addLocalIds(rt,ms),zt.addCategories(rt,_l),zt.addRelationsItems(rt,G0),zt.addRelations(rt,H0),zt.addGuidsItems(rt,W0),zt.addGuids(rt,X0),bl!==null&&zt.addSpatialStructure(rt,bl),zt.addGuid(rt,Y0),zt.addMaxLocalId(rt,ke),Tp!==null&&zt.addIndexes(rt,Tp);let $0=zt.endModel(rt);rt.finish($0);let Ap=rt.asUint8Array();rt.clear();let j0=s?Ap:wo.deflate(Ap),Ip=new Set(Hs),K0=new Set(Mr);return o0(t,K0,n,i,Ip),{model:j0,items:Array.from(Ip)}}var sd="-DELTA-MODEL-";function l0(i){return i.includes(sd)?i.substring(0,i.indexOf(sd)):i}function c0(i,t){let e=new lr(t?i:wo.inflate(i));return zt.getRootAsModel(e)}function bp(i){return{item:i.item(),localTransform:i.localTransform(),material:i.material(),representation:i.representation()}}function zs(i){let t=i.position(),e=i.xDirection(),n=i.yDirection();return{position:[t.x(),t.y(),t.z()],xDirection:[e.x(),e.y(),e.z()],yDirection:[n.x(),n.y(),n.z()]}}function h0(i){let t={data:{}},e=i.dataLength();for(let n=0;n<e;n++){let s=i.data(n),[r,...o]=JSON.parse(s);t.data[r]=o}return t}function rd(i){return{r:i.r(),g:i.g(),b:i.b(),a:i.a(),renderedFaces:i.renderedFaces(),stroke:i.stroke()}}function Eo(i){let t=i.bbox(),e=t.min(),n=t.max();return{id:i.id(),bbox:[e.x(),e.y(),e.z(),n.x(),n.y(),n.z()],representationClass:i.representationClass()}}function hl(i){let t=[];for(let a=0;a<i.pointsLength();a++){let c=i.points(a);t.push([c.x(),c.y(),c.z()])}let e=new Map;for(let a=0;a<i.profilesLength();a++){let c=i.profiles(a),l=Array.from(c.indicesArray()||[]);e.set(a,l)}let n=new Map;for(let a=0;a<i.holesLength();a++){let c=i.holes(a),l=Array.from(c.indicesArray()||[]),h=c.profileId();n.has(h)||n.set(h,[]),n.get(h).push(l)}let s=new Map;for(let a=0;a<i.bigProfilesLength();a++){let c=i.bigProfiles(a),l=Array.from(c.indicesArray()||[]);s.set(a,l)}let r=new Map;for(let a=0;a<i.bigHolesLength();a++){let c=i.bigHoles(a),l=Array.from(c.indicesArray()||[]),h=c.profileId();r.has(h)||r.set(h,[]),r.get(h).push(l)}let o=Array.from(i.profilesFaceIdsArray()||[]);return{points:t,profiles:e,holes:n,bigProfiles:s,bigHoles:r,type:i.type(),profilesFaceIds:o}}function M1(i){let t={radius:[],axes:[]},e=i.radiusArray();t.radius=Array.from(e);let n=i.axesLength();for(let s=0;s<n;s++){let r=i.axes(s),o=r.wiresLength(),a=[];for(let g=0;g<o;g++){let m=r.wires(g),M=m.p1(),w=m.p2();a.push([M.x(),M.y(),M.z(),w.x(),w.y(),w.z()])}let c=r.orderLength(),l=[];for(let g=0;g<c;g++)l.push(r.order(g));let h=r.partsLength(),u=[];for(let g=0;g<h;g++)u.push(r.parts(g));let d=r.wireSetsLength(),f=[];for(let g=0;g<d;g++){let m=r.wireSets(g),M=m.psLength(),w=[];for(let _=0;_<M;_++){let E=m.ps(_);w.push(E.x(),E.y(),E.z())}f.push(w)}let p=r.circleCurvesLength(),b=[];for(let g=0;g<p;g++){let m=r.circleCurves(g),M=m.aperture(),w=m.position(),_=w.x(),E=w.y(),T=w.z(),I=m.radius(),y=m.xDirection(),A=y.x(),L=y.y(),N=y.z(),k=m.yDirection(),V=k.x(),O=k.y(),H=k.z();b.push({aperture:M,position:[_,E,T],radius:I,xDirection:[A,L,N],yDirection:[V,O,H]})}t.axes.push({wires:a,order:l,parts:u,wireSets:f,circleCurves:b})}return t}function d0(i){return i.meshes().materialIdsArray()||[]}function u0(i,t){let e=i.meshes(),n=t||e.materialIdsArray(),s=new Set(n),r=new ki,o=new Map;for(let a=0;a<e.materialsLength();a++){let c=e.materialIds(a);if(!s.has(c))continue;e.materials(a,r);let l=rd(r);o.set(c,l)}return o}function f0(i){return i.meshes().representationIdsArray()||[]}function p0(i,t){let e=i.meshes(),n=t||e.representationIdsArray(),s=new Set(n),r=new Map,o=new ei;for(let a=0;a<e.representationsLength();a++){let c=e.representationIds(a);if(!s.has(c))continue;e.representations(a,o);let l=Eo(o);if(l.representationClass===de.SHELL){let h=e.shells(l.id),u=hl(h);l.geometry=u}else if(l.representationClass===de.CIRCLE_EXTRUSION){let h=e.circleExtrusions(l.id),u=M1(h);l.geometry=u}r.set(c,l)}return r}function m0(i,t){let e=i.meshes(),n=t||e.representationIdsArray(),s=new Set(n),r=new ei,o=new Set,a=new Set;for(let c=0;c<e.representationsLength();c++){let l=e.representationIds(c);if(!s.has(l))continue;e.representations(c,r);let h=Eo(r);if(h.representationClass===de.SHELL)o.add(h.id);else if(h.representationClass===de.CIRCLE_EXTRUSION)a.add(h.id);else throw new Error("Rebars not supported yet")}return{shellsIndices:o,rebarsIndices:a}}function g0(i){let t=[];for(let e in i){if(e[0]==="_")continue;let n=i[e];if(Array.isArray(n))continue;let s=n.value,r=n.type,o=JSON.stringify([e,s,r]);t.push(o)}return t}function _0(i){let t=i._category;if(!t)throw new Error("Category is required");let e=t.value,n=i._guid,s={};for(let o in i){if(o[0]==="_")continue;let a=i[o];Array.isArray(a)||(s[o]=a)}let r=n?n.value:void 0;return{data:s,category:e,guid:r}}function b0(i){return i.meshes().localTransformIdsArray()||[]}function x0(i,t){let e=i.meshes(),n=t||e.localTransformIdsArray(),s=new Set(n),r=new Map,o=new qn;for(let a=0;a<e.localTransformsLength();a++){let c=e.localTransformIds(a);if(!s.has(c))continue;e.localTransforms(a,o);let l=zs(o);r.set(c,l)}return r}function y0(i){return i.meshes().globalTransformIdsArray()||[]}function v0(i,t){let e=i.meshes(),n=null;t?n=new Set(t):n=new Set(e.globalTransformIdsArray());let s=new Map,r=new qn,o=e.globalTransformsLength();for(let a=0;a<o;a++){e.globalTransforms(a,r);let c=e.globalTransformIds(a),l=e.meshesItems(a),h=i.localIds(l);if(!n.has(c))continue;let u=zs(r);s.set(c,{...u,itemId:h})}return s}function S0(i){return i.meshes().sampleIdsArray()||[]}function M0(i,t){let e=i.meshes(),n=t||e.sampleIdsArray(),s=new Set(n),r=new Map,o=new Bs;for(let a=0;a<e.samplesLength();a++){let c=e.sampleIds(a);if(!s.has(c))continue;e.samples(a,o);let l=bp(o);l.item=e.globalTransformIds(l.item),l.material=e.materialIds(l.material),l.representation=e.representationIds(l.representation),l.localTransform=e.localTransformIds(l.localTransform),r.set(c,l)}return r}function w0(i){return i.localIdsArray()}function E0(i,t){let e=new Set;if(t)e=new Set(t);else for(let s=0;s<i.localIdsLength();s++)e.add(s);let n=new Map;for(let s of e){let r=i.localIds(s),o=i.categories(s),a=i.guids(s),c=i.attributes(s),l={};for(let h=0;h<c.dataLength();h++){let u=c.data(h),[d,f,p]=JSON.parse(u);l[d]={value:f,type:p}}n.set(r,{data:l,category:o,guid:a})}return n}function T0(i,t){let e=i.meshes(),n=new Set(t),s=new Set;for(let r=0;r<e.meshesItemsLength();r++){let o=e.meshesItems(r),a=i.localIds(o);n.has(a)&&s.add(e.globalTransformIds(r))}return Array.from(s)}function A0(i,t){let e=i.data,n=e.meshes(),s={},r=new Set(t),o=new qn,a=new ki,c=new ei,l=new Ze;for(let d=0;d<n.samplesLength();d++){let f=n.samples(d),p=f.item(),b=n.meshesItems(p),g=e.localIds(b);if(!r.has(g))continue;s[g]||(s[g]={samples:{},localTransforms:{},globalTransforms:{},representations:{},materials:{}});let m=s[g],M=f.localTransform(),w=f.material(),_=f.representation(),E=n.sampleIds(d),T=n.globalTransformIds(p),I=n.localTransformIds(M),y=n.materialIds(w),A=n.representationIds(_);m.samples[E]={item:T,localTransform:I,material:y,representation:A},n.localTransforms(M,o),m.localTransforms[I]=zs(o),n.globalTransforms(p,o);let L=zs(o);m.globalTransforms[T]={...L,itemId:g},n.materials(w,a),m.materials[y]=rd(a),n.representations(_,c);let N=Eo(c);if(N.representationClass===de.SHELL){n.shells(N.id,l);let k=hl(l);N.geometry=k}m.representations[A]=N}let h=new Map;for(let d=0;d<e.relationsItemsLength();d++){let f=e.relationsItems(d);h.set(f,d)}let u=new Map;for(let d=0;d<e.localIdsLength();d++){let f=e.localIds(d);u.set(f,d)}return s}function I0(i,t){let e=i.data,n=e.meshes(),s=i.boxes.sampleOf(t);if(!s||s.length===0)return null;let r={samples:{},localTransforms:{},globalTransforms:{},representations:{},materials:{}},o=n.meshesItems(t),a=o!==null?e.localIds(o)??t:t,c=new qn;n.globalTransforms(t,c);let l=zs(c),h=n.globalTransformIds(t);r.globalTransforms[h]={...l,itemId:a};let u=new ei,d=new Ze;for(let f of s){let p=n.samples(f),b=p.localTransform(),g=p.representation(),m=n.sampleIds(f),M=n.localTransformIds(b),w=n.representationIds(g);if(r.samples[m]={item:h,localTransform:M,material:0,representation:w},n.localTransforms(b,c),r.localTransforms[M]=zs(c),r.representations[w])continue;n.representations(g,u);let _=Eo(u);if(_.representationClass===de.SHELL){n.shells(_.id,d);let E=hl(d);_.geometry=E}r.representations[w]=_}return r}function R0(i,t,e){let n=i[t];if(typeof n=="string"){let s=e.get(n);if(s===void 0)throw new Error(`Malformed request: temp id ${i[t]} not found`);i[t]=s}}function dl(i,t,e){let n=i[t];if(typeof n=="string"){let s=e.get(n);if(s===void 0)throw new Error(`Malformed request: temp id ${i[t]} not found`);i[t]=s}}function C0(i,t,e){let n=i[t];if(typeof n=="string"){let s=e.get(n);if(s===void 0)throw new Error(`Malformed request: temp id ${i[t]} not found`);i[t]=s}}function P0(i,t){let e=new Map,n=[];for(let s of i){if(ar(s)||s.localId!==void 0)continue;let r=t++;s.tempId&&e.set(s.tempId,r),s.localId=r,n.push(r)}for(let s of i)if(!ar(s)){if(s.type===ot.UPDATE_SAMPLE||s.type===ot.CREATE_SAMPLE){let r=s.data;dl(r,"item",e),dl(r,"material",e),dl(r,"representation",e),dl(r,"localTransform",e);continue}if(s.type===ot.UPDATE_GLOBAL_TRANSFORM||s.type===ot.CREATE_GLOBAL_TRANSFORM){let r=s.data;R0(r,"itemId",e);continue}C0(s,"localId",e)}return e.clear(),n}function L0(i,t,e,n){let s=ot[`CREATE_${e}`],r=ot[`UPDATE_${e}`],o=ot[`DELETE_${e}`];if(i)for(let a of i){if(a.type===s||a.type===r){if(n&&!n.has(a.localId))continue;t.set(a.localId,a.data);continue}a.type===o&&t.delete(a.localId)}}function D0(i,t){let e=ot[`UPDATE_${t}`];if(i)for(let n=i.length-1;n>=0;n--){let s=i[n];if(s.type===e)return JSON.parse(JSON.stringify(s.data))}return null}function N0(i,t,e,n){let s=new Set(t),r=ot[`DELETE_${e}`],o=ot[`CREATE_${e}`];for(let a of i){if(a.type===r){s.delete(a.localId);continue}n&&a.type===o&&s.add(a.localId)}return Array.from(s)}var Jt=class{};v(Jt,"edit",a0),v(Jt,"solveIds",P0),v(Jt,"newModel",id),v(Jt,"applyChangesToRawData",L0),v(Jt,"applyChangesToSpecialData",D0),v(Jt,"applyChangesToIds",N0),v(Jt,"getModelFromBuffer",c0),v(Jt,"getSampleData",bp),v(Jt,"getTransformData",zs),v(Jt,"getRelationData",h0),v(Jt,"getMaterialData",rd),v(Jt,"getRepresentationData",Eo),v(Jt,"getShellData",hl),v(Jt,"getMaterialsIds",d0),v(Jt,"getMaterials",u0),v(Jt,"getRepresentationsIds",f0),v(Jt,"getRepresentations",p0),v(Jt,"getLocalTransformsIds",b0),v(Jt,"getLocalTransforms",x0),v(Jt,"getGlobalTransformsIds",y0),v(Jt,"getGlobalTransforms",v0),v(Jt,"getSamplesIds",S0),v(Jt,"getSamples",M0),v(Jt,"getItemsIds",w0),v(Jt,"getItems",E0),v(Jt,"getGlobalTranformsIdsOfItems",T0),v(Jt,"getElementsData",A0),v(Jt,"getItemSnapData",I0),v(Jt,"getGeometryIndicesFromRepresentations",m0),v(Jt,"getRootModelId",l0),v(Jt,"getSerializedAttributes",g0),v(Jt,"itemDataToRawItemData",_0),v(Jt,"DELTA_MODEL_ID",sd);var O0=new we,od=new R,To=class extends Qs{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";let t=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],e=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new qe(t,3)),this.setAttribute("uv",new qe(e,2))}applyMatrix4(t){let e=this.attributes.instanceStart,n=this.attributes.instanceEnd;return e!==void 0&&(e.applyMatrix4(t),n.applyMatrix4(t),e.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(t){let e;t instanceof Float32Array?e=t:Array.isArray(t)&&(e=new Float32Array(t));let n=new Di(e,6,1);return this.setAttribute("instanceStart",new Vn(n,3,0)),this.setAttribute("instanceEnd",new Vn(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(t){let e;t instanceof Float32Array?e=t:Array.isArray(t)&&(e=new Float32Array(t));let n=new Di(e,6,1);return this.setAttribute("instanceColorStart",new Vn(n,3,0)),this.setAttribute("instanceColorEnd",new Vn(n,3,3)),this}fromWireframeGeometry(t){return this.setPositions(t.attributes.position.array),this}fromEdgesGeometry(t){return this.setPositions(t.attributes.position.array),this}fromMesh(t){return this.fromWireframeGeometry(new xa(t.geometry)),this}fromLineSegments(t){let e=t.geometry;return this.setPositions(e.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new we);let t=this.attributes.instanceStart,e=this.attributes.instanceEnd;t!==void 0&&e!==void 0&&(this.boundingBox.setFromBufferAttribute(t),O0.setFromBufferAttribute(e),this.boundingBox.union(O0))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Rn),this.boundingBox===null&&this.computeBoundingBox();let t=this.attributes.instanceStart,e=this.attributes.instanceEnd;if(t!==void 0&&e!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let s=0;for(let r=0,o=t.count;r<o;r++)od.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(od)),od.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(od));this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}};ft.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new ut},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};On.line={uniforms:ir.merge([ft.common,ft.fog,ft.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		float trimSegmentAlpha( const in vec4 start, const in vec4 end ) {

			// compute the interpolation factor needed to trim the segment so it terminates
			// between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column

			// we need different nearEstimate formula for reversed and default depth buffer
			// a is positive with a reversed depth buffer so it can be used for controlling the code flow
			float nearEstimate = ( a > 0.0 ) ? ( - b / ( a + 1.0 ) ) : ( - 0.5 * b / a );

			return ( nearEstimate - start.z ) / ( end.z - start.z );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef USE_DASH

				float lineDistanceStart = dashScale * instanceDistanceStart;
				float lineDistanceEnd = dashScale * instanceDistanceEnd;

			#endif

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( start, end );
					end.xyz = mix( start.xyz, end.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceEnd = mix( lineDistanceStart, lineDistanceEnd, alpha );

					#endif

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( end, start );
					start.xyz = mix( end.xyz, start.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceStart = mix( lineDistanceEnd, lineDistanceStart, alpha );

					#endif

				}

			}

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? lineDistanceStart : lineDistanceEnd;
				vUv = uv;

			#endif

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			float alpha = opacity;
			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};var ci=class extends xn{constructor(t){super({type:"LineMaterial",uniforms:ir.clone(On.line.uniforms),vertexShader:On.line.vertexShader,fragmentShader:On.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(t)}get color(){return this.uniforms.diffuse.value}set color(t){this.uniforms.diffuse.value=t}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(t){t===!0!==this.worldUnits&&(this.needsUpdate=!0),t===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(t){this.uniforms.linewidth&&(this.uniforms.linewidth.value=t)}get dashed(){return"USE_DASH"in this.defines}set dashed(t){t===!0!==this.dashed&&(this.needsUpdate=!0),t===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(t){this.uniforms.dashScale.value=t}get dashSize(){return this.uniforms.dashSize.value}set dashSize(t){this.uniforms.dashSize.value=t}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(t){this.uniforms.dashOffset.value=t}get gapSize(){return this.uniforms.gapSize.value}set gapSize(t){this.uniforms.gapSize.value=t}get opacity(){return this.uniforms.opacity.value}set opacity(t){this.uniforms&&(this.uniforms.opacity.value=t)}get resolution(){return this.uniforms.resolution.value}set resolution(t){this.uniforms.resolution.value.copy(t)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(t){this.defines&&(t===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),t===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}};var xp=new ye,U0=new R,F0=new R,wn=new ye,En=new ye,Hi=new ye,yp=new R,vp=new jt,Tn=new Ia,B0=new R,ad=new we,ld=new Rn,Gi=new ye,Wi,yr;function z0(i,t,e){return Gi.set(0,0,-t,1).applyMatrix4(i.projectionMatrix),Gi.multiplyScalar(1/Gi.w),Gi.x=yr/e.width,Gi.y=yr/e.height,Gi.applyMatrix4(i.projectionMatrixInverse),Gi.multiplyScalar(1/Gi.w),Math.abs(Math.max(Gi.x,Gi.y))}function w1(i,t){let e=i.matrixWorld,n=i.geometry,s=n.attributes.instanceStart,r=n.attributes.instanceEnd,o=Math.min(n.instanceCount,s.count);for(let a=0,c=o;a<c;a++){Tn.start.fromBufferAttribute(s,a),Tn.end.fromBufferAttribute(r,a),Tn.applyMatrix4(e);let l=new R,h=new R;Wi.distanceSqToSegment(Tn.start,Tn.end,h,l),h.distanceTo(l)<yr*.5&&t.push({point:h,pointOnLine:l,distance:Wi.origin.distanceTo(h),object:i,face:null,faceIndex:a,uv:null,uv1:null})}}function E1(i,t,e){let n=t.projectionMatrix,r=i.material.resolution,o=i.matrixWorld,a=i.geometry,c=a.attributes.instanceStart,l=a.attributes.instanceEnd,h=Math.min(a.instanceCount,c.count),u=-t.near;Wi.at(1,Hi),Hi.w=1,Hi.applyMatrix4(t.matrixWorldInverse),Hi.applyMatrix4(n),Hi.multiplyScalar(1/Hi.w),Hi.x*=r.x/2,Hi.y*=r.y/2,Hi.z=0,yp.copy(Hi),vp.multiplyMatrices(t.matrixWorldInverse,o);for(let d=0,f=h;d<f;d++){if(wn.fromBufferAttribute(c,d),En.fromBufferAttribute(l,d),wn.w=1,En.w=1,wn.applyMatrix4(vp),En.applyMatrix4(vp),wn.z>u&&En.z>u)continue;if(wn.z>u){let w=wn.z-En.z,_=(wn.z-u)/w;wn.lerp(En,_)}else if(En.z>u){let w=En.z-wn.z,_=(En.z-u)/w;En.lerp(wn,_)}wn.applyMatrix4(n),En.applyMatrix4(n),wn.multiplyScalar(1/wn.w),En.multiplyScalar(1/En.w),wn.x*=r.x/2,wn.y*=r.y/2,En.x*=r.x/2,En.y*=r.y/2,Tn.start.copy(wn),Tn.start.z=0,Tn.end.copy(En),Tn.end.z=0;let b=Tn.closestPointToPointParameter(yp,!0);Tn.at(b,B0);let g=Qi.lerp(wn.z,En.z,b),m=g>=-1&&g<=1,M=yp.distanceTo(B0)<yr*.5;if(m&&M){Tn.start.fromBufferAttribute(c,d),Tn.end.fromBufferAttribute(l,d),Tn.start.applyMatrix4(o),Tn.end.applyMatrix4(o);let w=new R,_=new R;Wi.distanceSqToSegment(Tn.start,Tn.end,_,w),e.push({point:_,pointOnLine:w,distance:Wi.origin.distanceTo(_),object:i,face:null,faceIndex:d,uv:null,uv1:null})}}}var cd=class extends Re{constructor(t=new To,e=new ci({color:Math.random()*16777215})){super(t,e),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let t=this.geometry,e=t.attributes.instanceStart,n=t.attributes.instanceEnd,s=new Float32Array(2*e.count);for(let o=0,a=0,c=e.count;o<c;o++,a+=2)U0.fromBufferAttribute(e,o),F0.fromBufferAttribute(n,o),s[a]=a===0?0:s[a-1],s[a+1]=s[a]+U0.distanceTo(F0);let r=new Di(s,2,1);return t.setAttribute("instanceDistanceStart",new Vn(r,1,0)),t.setAttribute("instanceDistanceEnd",new Vn(r,1,1)),this}raycast(t,e){let n=this.material.worldUnits,s=t.camera;if(s===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.'),n===!1&&(this.material.resolution.x===0||this.material.resolution.y===0))return;let r=t.params.Line2!==void 0&&t.params.Line2.threshold||0;Wi=t.ray;let o=this.matrixWorld,a=this.geometry,c=this.material;yr=c.linewidth+r,a.boundingSphere===null&&a.computeBoundingSphere(),ld.copy(a.boundingSphere).applyMatrix4(o);let l;if(n)l=yr*.5;else{let u=Math.max(s.near,ld.distanceToPoint(Wi.origin));l=z0(s,u,c.resolution)}if(ld.radius+=l,Wi.intersectsSphere(ld)===!1)return;a.boundingBox===null&&a.computeBoundingBox(),ad.copy(a.boundingBox).applyMatrix4(o);let h;if(n)h=yr*.5;else{let u=Math.max(s.near,ad.distanceToPoint(Wi.origin));h=z0(s,u,c.resolution)}ad.expandByScalar(h),Wi.intersectsBox(ad)!==!1&&(n?w1(this,e):E1(this,s,e))}onBeforeRender(t){let e=this.material.uniforms;e&&e.resolution&&(t.getViewport(xp),this.material.uniforms.resolution.value.set(xp.z,xp.w))}};var Ao=class extends To{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(t){let e=t.length-3,n=new Float32Array(2*e);for(let s=0;s<e;s+=3)n[2*s]=t[s],n[2*s+1]=t[s+1],n[2*s+2]=t[s+2],n[2*s+3]=t[s+3],n[2*s+4]=t[s+4],n[2*s+5]=t[s+5];return super.setPositions(n),this}setColors(t){let e=t.length-3,n=new Float32Array(2*e);for(let s=0;s<e;s+=3)n[2*s]=t[s],n[2*s+1]=t[s+1],n[2*s+2]=t[s+2],n[2*s+3]=t[s+3],n[2*s+4]=t[s+4],n[2*s+5]=t[s+5];return super.setColors(n),this}setFromPoints(t){let e=t.length-1,n=new Float32Array(6*e);for(let s=0;s<e;s++)n[6*s]=t[s].x,n[6*s+1]=t[s].y,n[6*s+2]=t[s].z||0,n[6*s+3]=t[s+1].x,n[6*s+4]=t[s+1].y,n[6*s+5]=t[s+1].z||0;return super.setPositions(n),this}fromLine(t){let e=t.geometry;return this.setPositions(e.attributes.position.array),this}};var hd=class extends cd{constructor(t=new Ao,e=new ci({color:Math.random()*16777215})){super(t,e),this.isLine2=!0,this.type="Line2"}};var dd=class{constructor(t){v(this,"model");v(this,"_endpointsMaterials",{interior:new js({color:15658734,size:8,sizeAttenuation:!1,depthTest:!1}),exterior:new js({color:16777215,size:16,sizeAttenuation:!1,depthTest:!1})});v(this,"_absoluteAlignments",new nn);v(this,"_horizontalAlignments",new nn);v(this,"_verticalAlignments",new nn);v(this,"_alignmentMaterials",new Map([[or.NONE,new ci({color:16777215,linewidth:5,depthTest:!1})],[or.LINES,new ci({color:16711935,linewidth:5,depthTest:!1})],[or.CLOTHOID,new ci({color:16711680,linewidth:5,depthTest:!1})],[or.ELLIPSE_ARC,new ci({color:65535,linewidth:5,depthTest:!1})],[or.PARABOLA,new ci({color:255,linewidth:5,depthTest:!1})]]));this.model=t}async getAlignments(){return this._absoluteAlignments.children.length||await this.constructAlignments(),this._absoluteAlignments}async getHorizontalAlignments(){return this._horizontalAlignments.children.length||await this.constructAlignments(),this._horizontalAlignments}async getVerticalAlignments(){return this._verticalAlignments.children.length||await this.constructAlignments(),this._verticalAlignments}async getAlignmentStyles(){return{...this._alignmentMaterials,...this._endpointsMaterials}}async constructAlignments(){let t=await this.model.threads.invoke(this.model.modelId,"getAlignments");for(let e of t)this.constructLine(e.absolute,this._absoluteAlignments),this.constructLine(e.horizontal,this._horizontalAlignments),this.constructLine(e.vertical,this._verticalAlignments)}constructLine(t,e){if(!t.length)return;let n=[],s=[],r=new nn;e.add(r);let o=t[0].points,a=t[t.length-1].points;s.push(a[0],a[1],a[2]),s.push(o[o.length-3],o[o.length-2],o[o.length-1]);for(let h of t){let u=h.points;n.push(u[0],u[1],u[2]),n.push(u[u.length-3],u[u.length-2],u[u.length-1]);let d=new Ao;d.setPositions(u);let f=this._alignmentMaterials.get(h.type),p=new hd(d,f);r.add(p),p.renderOrder=1,p.userData.points=u}let{interior:c,exterior:l}=this._endpointsMaterials;this.constructPoints(n,c,r),this.constructPoints(s,l,r)}constructPoints(t,e,n){let s=new oa,r=new Be,o=new Float32Array(t),a=new Ie(o,3);r.setAttribute("position",a),s.geometry=r,s.material=e,n.add(s),s.renderOrder=2}dispose(){let t=[this._absoluteAlignments,this._horizontalAlignments,this._verticalAlignments];for(let e of t)e.traverse(n=>{let s=n;s.geometry&&(s.geometry.dispose(),s.geometry=void 0,s.material=void 0)}),e.clear(),e.removeFromParent();for(let e of this._alignmentMaterials.values())e.dispose();this._alignmentMaterials.clear();for(let e of Object.values(this._endpointsMaterials))e.dispose()}};var ud=class{async getBoxes(t,e){let n=this.getIndividualBoxesIds(e),s=this.getBoxRequest(t,n),r=await t.threads.fetch(s);return this.getAllBoxes(r,t)}async getMergedBox(t,e){let n=this.getBoxRequest(t,[e]),{boxes:s}=await t.threads.fetch(n),[r]=s;return this.getAbsoluteBox(r,t)}getAbsoluteBox(t,e){let n=new we;return n.copy(t),n.applyMatrix4(e.object.matrixWorld),n}getIndividualBoxesIds(t){if(!t)return;let e=[];for(let n of t)e.push([n]);return e}getAllBoxes(t,e){let n=t.boxes,s=[];for(let r of n){let o=new we;o.copy(r),o.applyMatrix4(e.object.matrixWorld),s.push(o)}return s}getBoxRequest(t,e){return{class:Je.FETCH_BOXES,modelId:t.modelId,localIds:e}}};var fd=class{constructor(){v(this,"_coordinationMatrices",new Map)}async getCoordinationMatrix(t){let e=this._coordinationMatrices.get(t.modelId);if(e)return e;e=new jt,this._coordinationMatrices.set(t.modelId,e);let[n,s,r,o,a,c,l,h,u]=await this.getCoordinates(t),d=new R(o,a,c),f=new R(l,h,u),p=new R().crossVectors(d,f);return e.set(o,l,p.x,n,a,h,p.y,s,c,u,p.z,r,0,0,0,1),e}async getCoordinates(t){let e=t.modelId;return t.threads.invoke(e,"getCoordinates")}async getPositions(t,e){let n=[e],s=await t.threads.invoke(t.modelId,"getPositions",n);return this.getAbsolutePositions(s,t)}getAbsolutePositions(t,e){let n=[];for(let s of t){let{x:r,y:o,z:a}=s,c=new R(r,o,a);c.applyMatrix4(e.object.matrixWorld),n.push(c)}return n}};var pd=class{async dispose(t,e,n,s,r){if(e.list.delete(t.modelId),await this.requestModelDelete(t),t.threads.delete(t.modelId),r?.keepInScene){e.materials.releaseModelSlot(t.modelId);return}t.object.removeFromParent(),this.deleteAllTiles(t),e.materials.dispose(t.modelId),n.dispose(),s.dispose()}async getBuffer(t,e){return t.threads.invoke(t.modelId,"getBuffer",[e])}async getCategories(t){return t.threads.invoke(t.modelId,"getCategories")}async getIndexNames(t){return t.threads.invoke(t.modelId,"getIndexNames")}async getIndexInfo(t,e){return t.threads.invoke(t.modelId,"getIndexInfo",[e])}async getIndexKeys(t,e){return t.threads.invoke(t.modelId,"getIndexKeys",[e])}async getIndexKey(t,e,n){return t.threads.invoke(t.modelId,"getIndexKey",[e,n])}async getIndexValues(t,e){return t.threads.invoke(t.modelId,"getIndexValues",[e])}async hasIndexEntry(t,e,n){return t.threads.invoke(t.modelId,"hasIndexEntry",[e,n])}async getIndexEntry(t,e,n){return t.threads.invoke(t.modelId,"getIndexEntry",[e,n])}async getInverseIndexEntry(t,e,n){return t.threads.invoke(t.modelId,"getInverseIndexEntry",[e,n])}async getMaxLocalId(t){return t.threads.invoke(t.modelId,"getMaxLocalId")}async getLocalIdsByGuids(t,e){return t.threads.invoke(t.modelId,"getLocalIdsByGuids",[e])}async getLocalIdsFromItemIds(t,e){return t.threads.invoke(t.modelId,"getLocalIdsFromItemIds",[e])}async getSpatialStructure(t){return t.threads.invoke(t.modelId,"getSpatialStructure")}async getItemsWithGeometry(t){return(await t.threads.invoke(t.modelId,"getItemsWithGeometry",[])).map(s=>t.getItem(s))}async getItemsWithGeometryCategories(t){return t.threads.invoke(t.modelId,"getItemsWithGeometryCategories",[])}async getItemsIdsWithGeometry(t){return t.threads.invoke(t.modelId,"getItemsWithGeometry",[])}async getItemDrawChunks(t,e){return t.threads.invoke(t.modelId,"getItemDrawChunks",[e])}async getItemsOfCategories(t,e){let n=[e];return await t.threads.invoke(t.modelId,"getItemsOfCategories",n)}async getItemsByQuery(t,e,n){let s=[e,n];return await t.threads.invoke(t.modelId,"getItemsByQuery",s)}async getMetadata(t){return t.threads.invoke(t.modelId,"getMetadata",[])}async getCRS(t){return t.threads.invoke(t.modelId,"getCRS",[])}async getGuidsByLocalIds(t,e){return t.threads.invoke(t.modelId,"getGuidsByLocalIds",[e])}async requestModelDelete(t){await t.threads.fetch({class:Je.DELETE_MODEL,modelId:t.modelId})}deleteAllTiles(t){for(let[e]of t.tiles)t.tiles.delete(e)}};var md=class{constructor(t,e,n,s){v(this,"x");v(this,"y");v(this,"z");v(this,"hash");v(this,"id");this.x=$e.round(t[e*3],s),this.y=$e.round(t[e*3+1],s),this.z=$e.round(t[e*3+2],s),this.hash=`${this.x}/${this.y}/${this.z}`,this.id=n}};var gd=class{constructor(t){v(this,"list",new Map);v(this,"tempV1",new R);v(this,"tempV2",new R);v(this,"tempV3",new R);v(this,"precision");this.precision=t}create(t,e){let n=new md(t,e,this.list.size,this.precision);return this.list.has(n.hash)||this.list.set(n.hash,n),this.list.get(n.hash)}get(){return Array.from(this.list.values()).map(t=>[t.x,t.y,t.z])}isValidTriangle(t,e,n,s){this.tempV1.set(t[e*3],t[e*3+1],t[e*3+2]),this.tempV2.set(t[n*3],t[n*3+1],t[n*3+2]),this.tempV3.set(t[s*3],t[s*3+1],t[s*3+2]);let r=1/this.precision*10,o=this.tempV1.distanceTo(this.tempV2)>r,a=this.tempV1.distanceTo(this.tempV3)>r,c=this.tempV2.distanceTo(this.tempV3)>r;return o&&a&&c}};var _d=class{constructor(t,e){v(this,"edges",new Map);v(this,"openEdges",new Set);v(this,"id");v(this,"plane");this.id=t,this.plane=e}add(t){if(this.edges.size===0){for(let e of t)this.openEdges.add(e.hash),this.edges.set(e.hash,e);return}for(let e of t)this.openEdges.has(e.hash)?this.openEdges.delete(e.hash):this.openEdges.add(e.hash),this.edges.set(e.hash,e)}match(t,e){if(e.id!==this.plane.id)return!1;for(let n of t)if(this.openEdges.has(n.hash))return!0;return!1}getOpenEdges(){let t=[];for(let e of this.openEdges)t.push(this.edges.get(e));return t}merge(t){for(let[e,n]of t.edges)this.edges.set(e,n);for(let e of t.openEdges)this.openEdges.has(e)?this.openEdges.delete(e):this.openEdges.add(e)}};var bd=class{constructor(){v(this,"list",new Map);v(this,"nextFaceID",0)}add(t,e){let n=this.match(t,e);if(n.length===0){let s=this.nextFaceID++,r=new _d(s,e);r.add(t),this.list.set(r.id,r);return}if(n.length===1){this.list.get(n[0]).add(t);return}if(n.length>1){let s=this.list.get(n[0]);s.add(t);for(let r=1;r<n.length;r++){let o=n[r],a=this.list.get(o);s.merge(a),this.list.delete(o)}}}match(t,e){let n=[];for(let s of this.list.values())s.match(t,e)&&n.push(s.id);return n}};var ds=class{constructor(t,e){v(this,"p1");v(this,"p2");v(this,"hash");this.p1=t,this.p2=e;let n=[this.p1,this.p2];n.sort((s,r)=>s.x-r.x||s.y-r.y||s.z-r.z),this.hash=`${n[0].hash}_${n[1].hash}`}};var xd=class{constructor(t){v(this,"closed",!1);v(this,"openStartPoint",null);v(this,"openEndPoint",null);v(this,"plane");v(this,"orderedPoints",[]);this.plane=t}getEdges(t=!1){let e=[];if(t)for(let n=this.orderedPoints.length-1;n>0;n--)e.push(new ds(this.orderedPoints[n],this.orderedPoints[n-1]));else for(let n=0;n<this.orderedPoints.length-1;n++)e.push(new ds(this.orderedPoints[n],this.orderedPoints[n+1]));return e}getIndices(){return this.orderedPoints.map(t=>t.id)}add(t){if(this.orderedPoints.length===0){this.openStartPoint=t.p1.hash,this.openEndPoint=t.p2.hash,this.orderedPoints.push(t.p1,t.p2);return}let e=this.match(t);if(e===0)throw new Error("Fragments: Edge doesn't match with any open point");if(e>2)throw new Error("Fragments: Edge matches with more than 2 open points");if(e===2){this.closed=!0,this.openEndPoint=null,this.openStartPoint=null;return}this.openStartPoint===t.p1.hash?(this.orderedPoints.unshift(t.p2),this.openStartPoint=t.p2.hash):this.openEndPoint===t.p1.hash?(this.orderedPoints.push(t.p2),this.openEndPoint=t.p2.hash):this.openStartPoint===t.p2.hash?(this.orderedPoints.unshift(t.p1),this.openStartPoint=t.p1.hash):this.openEndPoint===t.p2.hash&&(this.orderedPoints.push(t.p1),this.openEndPoint=t.p1.hash)}match(t){if(this.closed)return 0;let e=0;return this.openStartPoint===t.p1.hash&&e++,this.openStartPoint===t.p2.hash&&e++,this.openEndPoint===t.p1.hash&&e++,this.openEndPoint===t.p2.hash&&e++,e}merge(t){if(t.closed||this.closed)throw new Error("Fragments: Cannot merge closed profiles");if(t.openStartPoint===this.openEndPoint&&t.openEndPoint===this.openStartPoint)throw new Error("Fragments: Cannot merge profiles that close each other");if(t.openEndPoint===this.openEndPoint&&t.openStartPoint===this.openStartPoint)throw new Error("Fragments: Cannot merge profiles that close each other");let e=!1;(t.openEndPoint===this.openStartPoint||t.openEndPoint===this.openEndPoint)&&(e=!0);let n=t.getEdges(e);for(let s of n)this.add(s)}getArea(){let t=this.orderedPoints.map(l=>[l.x,l.y,l.z]),e=0,n=1,s=Math.abs(this.plane.normal.x),r=Math.abs(this.plane.normal.y),o=Math.abs(this.plane.normal.z);s>=r&&s>=o?(e=1,n=2):r>=s&&r>=o?(e=0,n=2):(e=0,n=1);let a=[];for(let l of t)a.push(new ut(l[e],l[n]));let c=0;for(let l=0,h=a.length;l<h;l++){let u=a[l].x,d=a[l===a.length-1?0:l+1].y,f=a[l===a.length-1?0:l+1].x,p=a[l].y;c+=u*d*.5,c-=f*p*.5}return Math.abs(c)}};var yd=class{constructor(t){v(this,"list",new Map);v(this,"plane");v(this,"nextProfileID",0);this.plane=t}add(t){let e=this.match(t);if(e.length===0){let n=this.nextProfileID++,s=new xd(this.plane);s.add(t),this.list.set(n,s);return}if(e.length===1){this.list.get(e[0]).add(t);return}if(e.length>1){let n=this.list.get(e[0]);n.add(t);let s=this.list.get(e[1]);n.merge(s),this.list.delete(e[1])}}getProfiles(){let t=null,e=0;for(let[r,o]of this.list){let a=o.getArea();a>e&&(e=a,t=r)}if(t===null)return null;let n=this.list.get(t).getIndices(),s=[];for(let[r,o]of this.list)r!==t&&s.push(o.getIndices());return{profile:n,holes:s}}match(t){let e=[];for(let[n,s]of this.list)s.match(t)>0&&e.push(n);return e}};var vd=class{constructor(t,e,n){v(this,"normal");v(this,"constant");v(this,"id");v(this,"faces",[]);let s=$e.round(t.normal.x,n),r=$e.round(t.normal.y,n),o=$e.round(t.normal.z,n),a=$e.round(t.constant,e);this.normal=new R(s,r,o),this.constant=a;let c="||";this.id=`${s}${c}${r}${c}${o}${c}${a}`}};var ul=class ul{static round(t,e){return Math.round(t*e)/e}static floor(t,e){return Math.floor(t*e)/e}static ceil(t,e){return Math.ceil(t*e)/e}static getAABB(t,e){let n=Number.POSITIVE_INFINITY,s=Number.POSITIVE_INFINITY,r=Number.POSITIVE_INFINITY,o=Number.NEGATIVE_INFINITY,a=Number.NEGATIVE_INFINITY,c=Number.NEGATIVE_INFINITY;for(let l=0;l<t.length;l+=3){let h=t[l],u=t[l+1],d=t[l+2];h<n&&(n=h),u<s&&(s=u),d<r&&(r=d),h>o&&(o=h),u>a&&(a=u),d>c&&(c=d)}return e?{min:{x:this.floor(n,e),y:this.floor(s,e),z:this.floor(r,e)},max:{x:this.ceil(o,e),y:this.ceil(a,e),z:this.ceil(c,e)}}:{min:{x:n,y:s,z:r},max:{x:o,y:a,z:c}}}static transformFromMatrix(t,e={position:[0,0,0],xDirection:[1,0,0],yDirection:[0,1,0]}){let n=t.elements[12],s=t.elements[13],r=t.elements[14],o=t.elements[0],a=t.elements[1],c=t.elements[2],l=t.elements[4],h=t.elements[5],u=t.elements[6];return e.position[0]=n,e.position[1]=s,e.position[2]=r,e.xDirection[0]=o,e.xDirection[1]=a,e.xDirection[2]=c,e.yDirection[0]=l,e.yDirection[1]=h,e.yDirection[2]=u,e}static matrixFromTransform(t){let e=new jt,[n,s,r]=t.position,[o,a,c]=t.xDirection,[l,h,u]=t.yDirection,d=new R(o,a,c),f=new R(l,h,u),{x:p,y:b,z:g}=d.cross(f);return e.fromArray([o,a,c,0,l,h,u,0,p,b,g,0,n,s,r,1]),e}static bboxFromCircleExtrusion(t){let e=new we,n=[];for(let h of t.axes)for(let u of h.wires)for(let d=0;d<u.length-2;d+=3){let f=u[d],p=u[d+1],b=u[d+2];n.push(new R(f,p,b))}e.setFromPoints(n);let s=e.min.x,r=e.min.y,o=e.min.z,a=e.max.x,c=e.max.y,l=e.max.z;return[s,r,o,a,c,l]}static representationFromGeometry(t,e={bbox:[0,0,0,0,0,0],representationClass:de.SHELL,geometry:{points:[],type:Fs.NONE,profiles:new Map,holes:new Map,bigHoles:new Map,bigProfiles:new Map,profilesFaceIds:[]}},n={threshold:3e3,precision:1e6,normalPrecision:1e7,planePrecision:1e3,faceThreshold:.6,forceTransparentSpaces:!0}){let r=t.getAttribute("position").array,a=t.getAttribute("normal").array,l=t.index.array,h=ul.getShellData({position:r,normals:a,index:l,raw:!1,settings:n}),{min:u,max:d}=h.bbox;if(e.bbox=[u.x,u.y,u.z,d.x,d.y,d.z],e.representationClass===de.CIRCLE_EXTRUSION)throw new Error("Circle extrusions can't be represented as shells");let f=e.geometry,p=h.points,b=p.length>ul.ushortMaxValue;return f.type=b?Fs.BIG:Fs.NONE,f.points=p,f.profilesFaceIds=h.profilesFaceIds,b?(f.profiles=new Map,f.holes=new Map,f.bigHoles=h.holes,f.bigProfiles=h.profiles):(f.profiles=h.profiles,f.holes=h.holes,f.bigHoles=new Map,f.bigProfiles=new Map),e}static getRawShellData(t,e,n,s,r){let o=new Map,a=new Map,{precision:c}=s,l=(d,f,p)=>{let b=`${d},${f},${p}`;if(o.has(b))return o.get(b)[0];let g=o.size;return o.set(b,[g,this.round(d,c),this.round(f,c),this.round(p,c)]),g};for(let d=0;d<t.length-2;d+=3){let f=t[d],p=t[d+1],b=t[d+2],g=e[f*3],m=e[f*3+1],M=e[f*3+2],w=e[p*3],_=e[p*3+1],E=e[p*3+2],T=e[b*3],I=e[b*3+1],y=e[b*3+2],A=l(g,m,M),L=l(w,_,E),N=l(T,I,y);a.set(a.size,[A,L,N])}let h=[];for(let[,[,d,f,p]]of o)h.push([d,f,p]);let u={bbox:n,type:de.SHELL,profiles:a,holes:new Map,points:h,profilesFaceIds:[]};if(r&&s.categoryFaceThresholds?.has(r))this.computeShellFaceIds(u,s,r);else for(let d=0;d<a.size;d++)u.profilesFaceIds.push(0);return u}static getShellData(t){let{position:e,normals:n,index:s,raw:r,settings:o,category:a}=t,{threshold:c,precision:l,normalPrecision:h,planePrecision:u}=o,f=e.length/3>c,p=this.getAABB(e,l);if(p.min.x===0&&p.min.y===0&&p.min.z===0&&p.max.x===0&&p.max.y===0&&p.max.z===0)throw new Error("Fragments: Bbox is not valid");if(r||f)return this.getRawShellData(s,e,p,o,a);let b=new De,g=new R,m=new R,M=new Map;for(let V=0;V<s.length-2;V+=3){let O=s[V];g.set(n[O*3],n[O*3+1],n[O*3+2]),m.set(e[O*3],e[O*3+1],e[O*3+2]),b.setFromNormalAndCoplanarPoint(g,m);let H=new vd(b,u,h);M.has(H.id)||M.set(H.id,H),M.get(H.id).faces.push(V)}let w=new gd(l),_=new bd;for(let[,V]of M)for(let O of V.faces){let H=s[O],U=s[O+1],W=s[O+2];if(!w.isValidTriangle(e,H,U,W))continue;let K=w.create(e,H),G=w.create(e,U),D=w.create(e,W),Z=new ds(K,G),ct=new ds(G,D),Mt=new ds(D,K),Wt=[Z,ct,Mt];_.add(Wt,V)}let E=new Map,T=new Map,I=0;for(let[,V]of _.list){let O=new yd(V.plane),H=V.getOpenEdges();if(H.length===0)return this.getRawShellData(s,e,p,o,a);for(let W of H)O.add(W);let U=O.getProfiles();E.set(I,U?.profile||[]),T.set(I,U?.holes||[]),I++}let y=0,A=new Map,L=new Map;for(let[V,O]of E)O.length&&(A.set(V,y),L.set(y,O),y++);let N=new Map;for(let[V,O]of T)if(O.length){let H=A.get(V);N.set(H,O)}let k={bbox:p,type:de.SHELL,profiles:L,holes:N,points:w.get(),profilesFaceIds:[]};return this.computeShellFaceIds(k,o,a),k}static computeShellFaceIds(t,e,n){let s=e.faceThreshold;n&&e.categoryFaceThresholds?.has(n)&&(s=e.categoryFaceThresholds.get(n));let r=new Map,o=0,a=new Map,c=new Map,l=new Map,h=new R,u=new R,d=new R,f=new R,p=new si,b=t.profiles.size;for(let m=0;m<b;m++){let M=t.profiles.get(m),w=M.length;for(let I=0;I<w;I++){let y=M[I],L=I===w-1?M[0]:M[I+1],N=Math.min(y,L),k=Math.max(y,L),V=N+this.makeDecimal(k);c.has(m)?c.get(m).push(V):c.set(m,[V]),a.has(V)?a.get(V).push(m):a.set(V,[m])}let _=0,E=1,T=2;for(;T<w;){let I=M[_],y=M[E],A=M[T];if(h.set(t.points[I][0],t.points[I][1],t.points[I][2]),u.set(t.points[y][0],t.points[y][1],t.points[y][2]),d.set(t.points[A][0],t.points[A][1],t.points[A][2]),p.set(h,u,d),p.getNormal(f),f.x!==0||f.y!==0||f.z!==0)break;_++,E++,T++}l.set(m,[f.x,f.y,f.z])}for(let[m,M]of c){let w=r.get(m);w===void 0&&(w=o++,r.set(m,w));let[_,E,T]=l.get(m);for(let I of M){let y=a.get(I);for(let A of y){if(A===m)continue;let[L,N,k]=l.get(A),O=Math.abs(_*L+E*N+T*k)<s;if(r.has(A)){if(!O){let H=r.get(A);for(let[U,W]of r)W===H&&r.set(U,w)}}else{let H=O?o++:w;r.set(A,H)}}}}for(let m=0;m<t.profiles.size;m++)if(!r.has(m))throw new Error(`Face id not found for profile ${m}`);let g=Array.from(r.keys()).sort((m,M)=>m-M);for(let m of g){let M=r.get(m);t.profilesFaceIds.push(M)}}static makeDecimal(t){let e=1;for(;e<=t;)e*=10;return t/e}};v(ul,"ushortMaxValue",65e3);var $e=ul;var Sd=class{constructor(t,e,n){v(this,"localId");v(this,"model");v(this,"core");v(this,"config",{data:{attributesDefault:!0,relations:{IsDefinedBy:{attributes:!0,relations:!0},DefinesOccurrence:{attributes:!1,relations:!1}}}});v(this,"updateRequests",{});v(this,"createRequests",{});v(this,"removeRequests",{});v(this,"_elementChanged",!1);this.localId=t,this.core=e,this.model=n}get elementChanged(){return this._elementChanged}getRequests(){let t=Object.values(this.createRequests);this.createRequests={};let e=Object.values(this.updateRequests);this.updateRequests={};let n=Object.values(this.removeRequests);this.removeRequests={};let s=[...n,...t,...e];return s.length>0?s:null}delete(){this.createRequests[this.localId]?delete this.createRequests[this.localId]:this.removeRequests[this.localId]={type:ot.DELETE_ITEM,localId:this.localId};for(let t in this.core.samples){let e=this.core.samples[t],n=parseInt(t,10);this.createRequests[e.localTransform]?delete this.createRequests[e.localTransform]:this.removeRequests[e.localTransform]={type:ot.DELETE_LOCAL_TRANSFORM,localId:e.localTransform},this.createRequests[e.representation]?delete this.createRequests[e.representation]:this.removeRequests[e.representation]={type:ot.DELETE_REPRESENTATION,localId:e.representation},this.createRequests[e.material]?delete this.createRequests[e.material]:this.removeRequests[e.material]={type:ot.DELETE_MATERIAL,localId:e.material},this.createRequests[e.item]?delete this.createRequests[e.item]:this.removeRequests[e.item]={type:ot.DELETE_GLOBAL_TRANSFORM,localId:e.item},this.createRequests[n]?delete this.createRequests[n]:this.removeRequests[n]={type:ot.DELETE_SAMPLE,localId:n}}}async getData(){return(await this.model.getItemsData([this.localId],this.config.data))[0]}getGlobalTransformId(){return parseInt(Object.keys(this.core.globalTransforms)[0],10)}disposeMeshes(t,e){let n=e?.disposeGeometry??!0,s=e?.disposeMaterial??!0;t.removeFromParent(),t.traverse(r=>{r instanceof Re&&(n&&r.geometry.dispose(),s&&r.material.dispose())})}async getMeshes(){let t=new nn,e=Object.values(this.core.globalTransforms)[0],n=$e.matrixFromTransform(e);t.applyMatrix4(n);let s=new Map,r=new Map,o=Object.keys(this.core.representations).map(Number),a=await this.model.getGeometries(o),c=new Map;for(let l of a){let h=l.representationId;c.set(h,l)}for(let l in this.core.samples){let h=parseInt(l,10),u=this.core.samples[h],d=c.get(u.representation);if(!d)throw new Error(`No geometry found for representation ${u.representation}`);let{indices:f,positions:p,normals:b}=d;if(!f||!p||!b)continue;if(!s.has(u.material)){let{r:T,g:I,b:y,a:A}=this.core.materials[u.material],L=new kt().setRGB(T/255,I/255,y/255,_n),N=new Js({color:L,transparent:!0,opacity:A/255});N.userData.localId=u.material,s.set(u.material,N)}let g=s.get(u.material),m=this.core.localTransforms[u.localTransform],M=$e.matrixFromTransform(m);if(!r.has(u.representation)){let T=new Be;T.setIndex(Array.from(f)),T.setAttribute("position",new Ie(p,3)),T.setAttribute("normal",new Ie(b,3)),T.userData.localId=u.representation,r.set(u.representation,T)}let w=r.get(u.representation),_=new nn;_.userData.localId=u.localTransform,t.add(_),_.applyMatrix4(M);let E=new Re(w,g);E.userData.sampleId=h,_.add(E)}return t}async setMeshes(t){let e=await this.getMeshes(),n=!0;t.updateMatrix();let s=1e3;for(let u=0;u<t.matrix.elements.length;u++){let d=Math.trunc(t.matrix.elements[u]*s)/s,f=Math.trunc(e.matrix.elements[u]*s)/s;if(d!==f){n=!1;break}}if(!n){let u=parseInt(Object.keys(this.core.globalTransforms)[0],10),d=this.core.globalTransforms[u];$e.transformFromMatrix(t.matrix,d),this._elementChanged=!0,this.updateRequests[u]={type:ot.UPDATE_GLOBAL_TRANSFORM,localId:u,data:d}}let r=new Map,o=new Map;e.traverse(u=>{u instanceof Re&&r.set(u.material.userData.localId,u.material)}),t.traverse(u=>{u instanceof Re&&o.set(u.material.userData.localId,u.material)});for(let[u,d]of r){let f=o.get(u);if(!f)continue;let p=d.color.r,b=d.color.g,g=d.color.b,m=d.opacity,M=f.color.r,w=f.color.g,_=f.color.b,E=f.opacity,T=this.core.materials[u];T.r=M*255,T.g=w*255,T.b=_*255,T.a=E*255,(p!==M||b!==w||g!==_||m!==E)&&(this._elementChanged=!0,this.updateRequests[u]={type:ot.UPDATE_MATERIAL,localId:u,data:T})}r.clear(),o.clear();let a=new Map,c=new Map;for(let u of t.children)u.updateMatrix(),c.set(u.userData.localId,u.matrix);for(let u of e.children)a.set(u.userData.localId,u.matrix);for(let[u,d]of a){let f=c.get(u);if(f&&!d.equals(f)){let p=this.core.localTransforms[u];$e.transformFromMatrix(f,p),this._elementChanged=!0,this.updateRequests[u]={type:ot.UPDATE_LOCAL_TRANSFORM,localId:u,data:p}}}a.clear(),c.clear();let l=new Map,h=new Map;t.traverse(u=>{if(u instanceof Re){let d=u.geometry;h.set(d.userData.localId,d)}}),e.traverse(u=>{if(u instanceof Re){let d=u.geometry;l.set(d.userData.localId,d)}});for(let[u,d]of l){let f=this.core.representations[u];if(f.representationClass===de.CIRCLE_EXTRUSION)continue;let p=h.get(u);if(!p)continue;let b=!0,g=d.getAttribute("position"),m=p.getAttribute("position");if(g&&m)if(g.count===m.count){for(let M=0;M<g.array.length;M++)if(g.array[M]!==m.array[M]){b=!1;break}}else b=!1;b||($e.representationFromGeometry(p,f),this._elementChanged=!0,this.updateRequests[u]={type:ot.UPDATE_REPRESENTATION,localId:u,data:f})}}createSamples(t){for(let e of t){let n=Math.trunc(performance.now());this.core.samples[n]=e,this.createRequests[n]={type:ot.CREATE_SAMPLE,data:e}}}deleteSamples(t){this._elementChanged=!0;for(let e of t)Object.keys(this.core.samples).length!==1&&(delete this.core.samples[e],delete this.updateRequests[e],this.createRequests[e]?delete this.createRequests[e]:this.removeRequests[e]={type:ot.DELETE_SAMPLE,localId:e})}async updateSamples(){let t=new Set(Object.keys(this.core.materials).map(Number)),e=new Set(Object.keys(this.core.localTransforms).map(Number)),n=new Set(Object.keys(this.core.globalTransforms).map(Number)),s=new Set(Object.keys(this.core.representations).map(Number)),r=new Set,o=new Set,a=new Set,c=new Set,l=new Set;for(let p in this.core.samples){let b=parseInt(p,10),g=this.core.samples[b];t.delete(g.material),n.delete(g.item),e.delete(g.localTransform),s.delete(g.representation),this.core.materials[g.material]||(l.add(b),r.add(g.material)),this.core.globalTransforms[g.item]||(l.add(b),o.add(g.item)),this.core.localTransforms[g.localTransform]||(l.add(b),a.add(g.localTransform)),this.core.representations[g.representation]||(l.add(b),c.add(g.representation))}for(let p of t)delete this.core.materials[p];for(let p of n)delete this.core.globalTransforms[p];for(let p of e)delete this.core.localTransforms[p];for(let p of s)delete this.core.representations[p];let h=new Map;r.size&&(h=await this.model.getMaterials(r));let u=new Map;o.size&&(u=await this.model.getGlobalTransforms(o));let d=new Map;a.size&&(d=await this.model.getLocalTransforms(a));let f=new Map;c.size&&(f=await this.model.getRepresentations(c));for(let[p,b]of h)this.core.materials[p]=b;for(let[p,b]of u)this.core.globalTransforms[p]=b;for(let[p,b]of d)this.core.localTransforms[p]=b;for(let[p,b]of f)this.core.representations[p]=b;for(let p of l){if(this.createRequests[p]){let b=this.createRequests[p];b.data=this.core.samples[p];continue}this._elementChanged=!0,this.updateRequests[p]={type:ot.UPDATE_SAMPLE,localId:p,data:this.core.samples[p]}}}};var Md=class{async edit(t,e){return t.threads.invoke(t.modelId,"edit",[e])}async reset(t){return t.threads.invoke(t.modelId,"reset",[])}async save(t){return t.threads.invoke(t.modelId,"save",[])}async getItemsGeometry(t,e,n){let s=await t.threads.invoke(t.modelId,"getItemsGeometry",[e,n]),r=t.deltaModelId;if(!r)return s;let o=await t.threads.invoke(r,"getItemsGeometry",[e]),a=new Map;for(let c of s){let l=c[0].localId;a.set(l,c)}for(let c of o){let l=c[0].localId;a.set(l,c)}return Array.from(a.values())}async getGeometries(t,e){let n=await t.threads.invoke(t.modelId,"getGeometries",[e]),s=t.deltaModelId;if(!s)return n;let r=await t.threads.invoke(s,"getGeometries",[e]),o=new Map;for(let a of n){let c=a.representationId;o.set(c,a)}for(let a of r){let c=a.representationId;o.set(c,a)}return Array.from(o.values())}async getMaterialsIds(t){return t.threads.invoke(t.modelId,"getMaterialsIds",[])}async getMaterials(t,e){return t.threads.invoke(t.modelId,"getMaterials",[e])}async getSamplesIds(t){return t.threads.invoke(t.modelId,"getSamplesIds",[])}async getSamples(t,e){return t.threads.invoke(t.modelId,"getSamples",[e])}async getRepresentationsIds(t){return t.threads.invoke(t.modelId,"getRepresentationsIds",[])}async getRepresentations(t,e){return t.threads.invoke(t.modelId,"getRepresentations",[e])}async getLocalTransformsIds(t){return t.threads.invoke(t.modelId,"getLocalTransformsIds",[])}async getLocalTransforms(t,e){return t.threads.invoke(t.modelId,"getLocalTransforms",[e])}async getGlobalTransformsIds(t){return t.threads.invoke(t.modelId,"getGlobalTransformsIds",[])}async getGlobalTransforms(t,e){return t.threads.invoke(t.modelId,"getGlobalTransforms",[e])}async getItemsIds(t){return t.threads.invoke(t.modelId,"getItemsIds",[])}async getItems(t,e){return t.threads.invoke(t.modelId,"getItems",[e])}async getRelations(t,e){return t.threads.invoke(t.modelId,"getRelations",[e])}async getGlobalTranformsIdsOfItems(t,e){return await t.threads.invoke(t.modelId,"getGlobalTranformsIdsOfItems",[e])}async getEditedElements(t){return t.deltaModelId?t.threads.invoke(t.deltaModelId,"getItemsWithGeometry",[]):[]}async getItemSnapData(t,e){return t.threads.invoke(t.modelId,"getItemSnapData",[e])}async getElements(t,e){let n=await t.threads.invoke(t.modelId,"getElementsData",[e]);if(t.deltaModelId){let r=await t.threads.invoke(t.deltaModelId,"getElementsData",[e]);for(let o in r)n[o]=r[o]}let s=[];for(let r in n){let o=new Sd(Number(r),n[r],t);s.push(o)}return s}async getRequests(t){return t.threads.invoke(t.modelId,"getRequests",[])}async setRequests(t,e){return t.threads.invoke(t.modelId,"setRequests",[e])}async selectRequest(t,e){return t.threads.invoke(t.modelId,"selectRequest",[e])}};var wd=class{constructor(t){v(this,"model");v(this,"_grids",new nn);v(this,"_gridMaterial",new va({color:16777215,linewidth:5,depthTest:!1,dashSize:1,gapSize:.3}));v(this,"_labelMaterial",new ya({color:16777215,flatShading:!0,side:ri,depthTest:!1}));v(this,"_labelConfig");v(this,"_labelMap",new Map);this.model=t}async getGrids({labels:t}={}){let e=!1,n=!1;if(t?.show){let r={size:.2,direction:"ltr",curveSegments:12,offset:.5,...t.config,font:t.font};this._labelConfig&&this._labelConfig.offset!==r.offset&&(this._labelConfig.offset=r.offset,n=!0),!!this._labelConfig&&this._labelConfig.font===r.font&&this._labelConfig.size===r.size&&this._labelConfig.direction===r.direction&&this._labelConfig.curveSegments===r.curveSegments||(e=!0,this._labelConfig=r)}else this._labelConfig&&(e=!0,delete this._labelConfig);this._grids.children.length||(await this.constructGrids(),e=!0);let s=[];if(e){let r=[...this._labelMap];this._labelMap.clear();let o=[];this._grids.traverse(a=>{if(a.userData.kind==="label")a.removeFromParent();else if(this._labelConfig&&a.userData.kind==="axis"){let c=a,{tag:l,axis:h}=c.userData,u=this.createGridLabels({tag:l,axis:h,config:this._labelConfig});o.push([c,u]),s.push(c)}});for(let[a,c]of o)a.add(...c);for(let[,a]of r)a.dispose()}else n&&this._grids.traverse(r=>{if(r.userData.kind==="axis"){let o=r;s.push(o)}});for(let r of s){let[o,a,c]=r.children,l=o?.geometry.getAttribute("position").array;if(!l)continue;let[h,u]=this.getGridLabelMatrices(l,this._labelConfig?.offset??.5);a&&(a.matrix.copy(h),a.matrix.decompose(a.position,a.quaternion,a.scale)),c&&(c.matrix.copy(u),c.matrix.decompose(c.position,c.quaternion,c.scale))}return this._grids}getGridMaterial(){return this._gridMaterial}setGridMaterial(t){let e=this._gridMaterial;this._gridMaterial=t,this._grids.traverse(n=>{n instanceof eo&&(n.material=t)}),e!==t&&e.dispose()}getLabelMaterial(){return this._labelMaterial}setLabelMaterial(t){let e=this._labelMaterial;this._labelMaterial=t,this._grids.traverse(n=>{n.userData.kind==="label"&&(n.material=t)}),e!==t&&e.dispose()}async constructGrids(){let t=await this.model.threads.invoke(this.model.modelId,"getGrids"),e=new jt;for(let n of t){let s=new nn;this._grids.add(s),s.userData.id=n.id,s.userData.kind="grid",e.fromArray(n.transform),s.applyMatrix4(e),this.getGridAxis(n,s,"uAxes"),this.getGridAxis(n,s,"vAxes"),this.getGridAxis(n,s,"wAxes"),this._grids.add(s)}}getGridAxis(t,e,n){for(let{curve:s,tag:r}of t[n]){let o=new Float32Array(s),a=new Be;a.setAttribute("position",new Ie(o,3));let c=new eo(a,this._gridMaterial);c.computeLineDistances(),c.userData.tag=r,c.userData.kind="line",c.userData.axis=n,c.renderOrder=1;let l=new nn;l.userData.tag=r,l.userData.kind="axis",l.userData.axis=n,l.renderOrder=1,l.add(c),e.add(l)}}createGridLabels({tag:t,axis:e,config:n}){let s=this._labelMap.get(t);if(!s){let{font:a,size:c,direction:l,curveSegments:h}=n,u=a.generateShapes(t,c,l);s=new ba(u,h),s.computeBoundingBox(),s.center(),s.computeBoundingSphere(),this._labelMap.set(t,s)}let r=new Re(s,this._labelMaterial);r.userData.kind="label",r.userData.tag=t,r.userData.axis=e,r.userData.index=0,r.renderOrder=1;let o=new Re(s,this._labelMaterial);return o.userData.kind="label",o.userData.tag=t,o.userData.axis=e,o.userData.index=1,o.renderOrder=1,[r,o]}getGridLabelMatrices(t,e){let n=new R().fromArray(t.slice(0,3)),s=new R().fromArray(t.slice(-3)),r=new R().subVectors(s,n).normalize().multiplyScalar(e),o=n.clone().sub(r),a=s.clone().add(r),c=new R(0,0,1),l=new jt().setPosition(o).lookAt(o,s,c),h=new jt().setPosition(a).lookAt(a,n,c);return[l,h]}dispose(){this._grids.removeFromParent();for(let t of this._grids.children){let e=t;e.geometry.dispose(),e.geometry=void 0,e.material=void 0}this._gridMaterial.dispose(),this._gridMaterial=void 0,this._labelMaterial.dispose(),this._labelMaterial=void 0,delete this._labelConfig,this._labelMap.forEach(t=>t.dispose()),this._labelMap.clear()}};var Vs=class extends Map{constructor(e){super(e);v(this,"onBeforeSet",new yn);v(this,"onItemSet",new yn);v(this,"onItemUpdated",new yn);v(this,"onBeforeDelete",new yn);v(this,"onItemDeleted",new yn);v(this,"onCleared",new yn);v(this,"guard",()=>!0);v(this,"deleteGuard",()=>!0);v(this,"updateGuard",()=>!0)}set eventsEnabled(e){this.onItemSet.enabled=e,this.onItemUpdated.enabled=e,this.onItemDeleted.enabled=e,this.onBeforeDelete.enabled=e,this.onCleared.enabled=e}clear(){for(let[e,n]of this)this.onBeforeDelete.trigger({key:e,value:n});super.clear(),this.onCleared.trigger()}set(e,n){let s=this.has(e);if(!(this.guard??(()=>!0))(e,n))return this;s||this.onBeforeSet.trigger({key:e,value:n});let a=super.set(e,n);return s?(this.onItemUpdated||(this.onItemUpdated=new yn),this.onItemUpdated.trigger({key:e,value:n})):(this.onItemSet||(this.onItemSet=new yn),this.onItemSet.trigger({key:e,value:n})),a}delete(e){let n=this.get(e);if(!n||!this.deleteGuard(e,n))return!1;this.onBeforeDelete.trigger({key:e,value:n});let s=super.delete(e);return s&&this.onItemDeleted.trigger(e),s}getKey(e){for(let[n,s]of this)if(s===e)return n}add(e){let n=Qi.generateUUID().toLowerCase();return this.set(n,e),n}update(e){let n=this.getKey(e);n&&this.updateGuard(n,e)&&this.set(n,e)}deleteIf(e){for(let[n,s]of this)e(s,n)&&this.delete(n)}replaceKey(e,n,s=!1){let r=this.get(e);return!r||this.get(n)&&!s?!1:(this.eventsEnabled=!1,this.delete(e),this.eventsEnabled=!0,this.set(n,r),!0)}dispose(){this.clear(),this.onItemSet.reset(),this.onItemDeleted.reset(),this.onItemUpdated.reset(),this.onCleared.reset(),this.onBeforeDelete.reset()}};var Ed=class{constructor(){v(this,"int");v(this,"float");v(this,"buffer");v(this,"s1",4);v(this,"s2",8);let{intBuffer:t,floatBuffer:e,buffer:n}=this.newBuffers();this.int=t,this.float=e,this.buffer=n}newBuffers(){let t=new Int32Array(1),e=t.buffer,n=new Float32Array(e),s=new Uint8Array(e);return{intBuffer:t,floatBuffer:n,buffer:s}}};var Io=class{static check(t){let e=Number.isInteger(t),n=t<this._max,s=t>this._min;return e&&n&&s}};v(Io,"_max",2147483647),v(Io,"_min",-2147483648);var Sp=(i=>(i[i.ONE=0]="ONE",i[i.TWO=1]="TWO",i))(Sp||{});var Td=class{static isSame(t,e){return this.getKey(t)===this.getKey(e)}static getKey(t){let{color:e,_explicitProps:n,...s}=t;return t.preserveOriginalMaterial||(s.opacity??(s.opacity=1),s.renderedFaces??(s.renderedFaces=Sp.ONE)),JSON.stringify([e&&[e.r,e.g,e.b,e.isColor===!0],[...new Set(n??[])].sort(),Object.entries(s).filter(([,r])=>r!==void 0).sort(([r],[o])=>r.localeCompare(o))])}};var Id=class Id{constructor(){v(this,"_core",new Ed);v(this,"_handlers");v(this,"_result",-1);v(this,"handleObject",t=>{let e=Object.keys(t);for(let n of e)t.hasOwnProperty(n)&&this.compute(t[n])});v(this,"handleString",t=>{let e=t.length;for(let n=0;n<e;++n){let s=t.codePointAt(n);this._core.int[0]=s,this.update()}});v(this,"handleBoolean",t=>{t?this._core.int[0]=1:this._core.int[0]=0,this.update()});v(this,"handleNumber",t=>{let n=Io.check(t)?this._core.int:this._core.float;n[0]=t,this.update()});this._handlers=this.newHandlers()}get value(){return~this._result}fromMaterialData(t){let{modelId:e,objectClass:n,currentLod:s,templateId:r,...o}=t;this.reset(),this.compute(e),this.compute(n),this.compute(Td.getKey(o)),this.compute(s),this.compute(r!==void 0)}generate(t){this.reset();for(let e of t)this.compute(e);return this.value}compute(t){return this.getHandler(t)(t),this}reset(){return this._result=-1,this}getHandler(t){let e=typeof t,n=this._handlers[e];if(!n)throw new Error("Fragments: Unsupported input type");return n}newHandlers(){return{number:this.handleNumber,boolean:this.handleBoolean,string:this.handleString,object:this.handleObject}}update(){for(let t=0;t<this._core.s1;++t){this._result^=this._core.buffer[t];for(let e=0;e<this._core.s2;++e)this._result&1?this._result=this._result>>1^Id._polynomial:this._result>>=1}}};v(Id,"_polynomial",2197175160);var Ad=Id;var vr=class{};v(vr,"vertex",`
            #include <common>
            #include <clipping_planes_pars_vertex>

            attribute float itemFilter;
            uniform vec2 lodSize;
            attribute vec3 itemFirst;
            attribute vec3 itemLast;
            attribute vec3 itemHighlightColor;

            float lodWidth = 2.0;
            
            void cutLodLine(const in vec4 first, inout vec4 second ) {
                float projValue1 = projectionMatrix[2][2];
                float projValue2 = projectionMatrix[3][2];
                float approxResult = -(projValue2 / projValue1) / 2.0;
                float diff1 = approxResult - first.z;
                float diff2 = second.z - first.z;
                float cutFilter = diff1 / diff2;
                second.xyz = mix(first.xyz, second.xyz, cutFilter);
            }
                
            varying float vHighlight;
            varying vec3 vHighlightColor;

            void main() {
                if (itemFilter == 0.0) {
                    gl_Position = vec4(0,0,0,0);
                    return;
                }

                vHighlight = itemFilter > 1.5 ? 1.0 : 0.0;
                vHighlightColor = itemHighlightColor;

                vec4 rawFirst = vec4(itemFirst, 1.0);
                vec4 rawLast = vec4(itemLast, 1.0);
                vec4 first = modelViewMatrix * rawFirst;
                vec4 last = modelViewMatrix * rawLast;
                
                bool lodPerspective = projectionMatrix[2][3] == -1.0;
                if (lodPerspective) {
                    bool firstCut = first.z < 0.0 && last.z >= 0.0;
                    bool lastCut = last.z < 0.0 && first.z >= 0.0;
                    if (firstCut) {
                        cutLodLine( first, last );
                    } else if (lastCut) {
                        cutLodLine( last, first );
                    }
                }

                vec4 firstCut = projectionMatrix * first;
                vec4 lastCut = projectionMatrix * last;
                vec3 firstNdc = firstCut.xyz / firstCut.w;
                vec3 lastNdc = lastCut.xyz / lastCut.w;

                vec2 lodOrientation = lastNdc.xy - firstNdc.xy;

                float lodRatio = lodSize.x / lodSize.y;
                lodOrientation.x *= lodRatio;
                lodOrientation = normalize(lodOrientation);
                
                vec2 lodDistance = vec2(lodOrientation.y, - lodOrientation.x);
                lodOrientation.x /= lodRatio;
                lodDistance.x /= lodRatio;

                if (position.x < 0.0) { 
                    lodDistance *= - 1.0;
                }

                if (position.y < 0.0) {
                    lodDistance += -lodOrientation;
                } else if (position.y > 1.0) {
                    lodDistance += lodOrientation;
                }

                lodDistance *= lodWidth;
                lodDistance /= lodSize.y;

                bool isFirst = position.y < 0.5;
                vec4 lodPosition = isFirst ? firstCut : lastCut;
                lodDistance *= lodPosition.w;
                lodPosition.xy += lodDistance;
                gl_Position = lodPosition;

                vec4 mvPosition = isFirst ? first : last;
                #include <clipping_planes_vertex>
            }
    `),v(vr,"fragment",`
            #include <common>
            #include <clipping_planes_pars_fragment>

            uniform vec3 lodColor;
            uniform float lodOpacity;
            uniform vec3 highlightColor;
            uniform float highlightOpacity;

            varying float vHighlight;
            varying vec3 vHighlightColor;

            void main() {
                #include <clipping_planes_fragment>
                // Per-instance highlight color (carried via the itemHighlightColor
                // instanced attribute) so that, at LOD/WIRES distance, each item keeps
                // its own color instead of all collapsing to a single uniform. See #230.
                vec3 color = mix(lodColor, vHighlightColor, vHighlight);
                float alpha = mix(lodOpacity, highlightOpacity, vHighlight);
                gl_FragColor = vec4(color, alpha);
                #include <colorspace_fragment>
            }
    `);var ni=class ni{static setupLodMeshResize(t){t.onBeforeRender=e=>{e.getSize(t.material[0].lodSize)}}static setupLodAttributes(t){t.setIndex(ni.indices),t.setAttribute("position",ni.vertices)}static setLodBuffer(t,e,n){let s=t.getItemFirst(),r=t.getItemLast(),o=this.setItemFirst(t,s,e,r);({itemFirst:s,dataBuffer:o,itemLast:r}=this.resetAttributes(s,o,e,r)),this.setupFinish(n,o),t.setAttribute("itemFirst",s),t.setAttribute("itemLast",r)}static setLodVisibility(t,e){let n=this.setupItemFilter(t);this.applyVisibilityState(t,e,n),n.needsUpdate=!0}static getInterAttribute(t,e){return t.getAttribute(e)}static computeLodSphere(t){if(!t.boundingSphere)return;let e=t.getItemFirst();if(e){let n=ni.getLodMidPoint(t,e),s=ni.getLodRadius(n,e);t.boundingSphere.radius=s}}static newLodMaterialParams(t){let e={lodColor:{value:new kt(t.color)},lodSize:{value:new ut(1,1)},lodOpacity:{value:t.opacity??1},highlightColor:{value:new kt(1,1,1)},highlightOpacity:{value:1}},n=ir.merge([ft.common,e]),s=t.transparent??!1;return{uniforms:n,transparent:s,vertexShader:vr.vertex,fragmentShader:vr.fragment}}static setLodFilter(t,e){let n=t.getItemFilter(),s=n.array;for(let r=0;r<e.position.length;++r){let o=e.position[r]/2,a=e.size[r]/2;a===4294967295?s.fill(1,o):s.fill(1,o,o+a)}n.needsUpdate=!0}static setLodHighlight(t,e){let n=t.getItemFilter(),s=n.array;for(let r=0;r<e.position.length;++r){let o=e.position[r]/2,a=e.size[r]/2;a===4294967295?s.fill(2,o):s.fill(2,o,o+a)}n.needsUpdate=!0}static setLodHighlightColors(t,e,n){let s=t.getItemFilter();if(!s)return;let r=s.count,o=this.getInstancedAttribute(t,"itemHighlightColor");(!o||o.count!==r)&&(o=new to(new Float32Array(r*3).fill(1),3),t.setAttribute("itemHighlightColor",o));let a=o.array;for(let c=0;c<e.position.length;++c){let l=n[c];if(!l)continue;let h=Math.floor(e.position[c]/2),u=e.size[c]/2,d=u===4294967295?r:Math.min(h+u,r);for(let f=h;f<d;++f)a[f*3]=l.r,a[f*3+1]=l.g,a[f*3+2]=l.b}o.needsUpdate=!0}static getInstancedAttribute(t,e){return t.getAttribute(e)}static computeLodBox(t){if(!t.boundingBox)return;let e=t.getItemFirst();if(e){let n=e.data.array;t.boundingBox.setFromArray(n);return}t.boundingBox.makeEmpty()}static setDataBuffer(t,e,n){return t=e.data,t.array=n,t.needsUpdate=!0,t}static disposeAllData(t){delete t.attributes.itemFilter,delete t.attributes.itemHighlightColor,delete t.attributes.position,t.index=null,t.dispose(),ni.setupLodAttributes(t)}static setItemFirst(t,e,n,s){let r=null;return e&&(n.length===e.data.array.length?r=this.setDataBuffer(r,e,n):(e=void 0,this.disposeAllData(t))),r}static setupFinish(t,e){t&&(e.onUploadCallback=t)}static resetAttributes(t,e,n,s){return t||(e=new Di(n,6,1),t=new Vn(e,3,0),s=new Vn(e,3,3)),{itemFirst:t,dataBuffer:e,itemLast:s}}static setupItemFilter(t){let n=t.getItemFirst().count,s=t.getItemFilter();return s?s.array.fill(0):(s=new to(new Uint8Array(n),1),t.setAttribute("itemFilter",s)),s}static applyVisibilityState(t,e,n){if(e===!0){n.array.fill(1);return}e&&this.setLodFilter(t,e)}static getLodMidPoint(t,e){let n=t.boundingSphere.center;return this.tempBox.setFromArray(e.data.array),this.tempBox.getCenter(n),n}static getLodRadius(t,e){let n=0,s=e.data.array.length;for(let r=0;r<s;r+=3){let o=e.data.array;ni.tempVec.fromArray(o,r);let a=t.distanceToSquared(ni.tempVec);n=Math.max(n,a)}return Math.sqrt(n)}};v(ni,"tempVec",new R),v(ni,"tempBox",new we),v(ni,"vertices",new qe([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),v(ni,"indices",new ea([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5],1));var pn=ni;var Rd=class extends xn{constructor(e){super(pn.newLodMaterialParams(e));v(this,"isLodMaterial",!0);v(this,"isLineMaterial",!0);this.clipping=!0,this.lights=!1,this.needsUpdate=!0}get lodSize(){return this.uniforms.lodSize.value}set lodColor(e){this.uniforms.lodColor.value=e}set lodSize(e){this.uniforms.lodSize.value.copy(e)}get lodColor(){return this.uniforms.lodColor.value}set lodOpacity(e){this.uniforms.lodOpacity.value=e}get lodOpacity(){return this.uniforms.lodOpacity.value}set highlightColor(e){this.uniforms.highlightColor.value=e}get highlightColor(){return this.uniforms.highlightColor.value}set highlightOpacity(e){this.uniforms.highlightOpacity.value=e}get highlightOpacity(){return this.uniforms.highlightOpacity.value}};var ks=class{constructor(){v(this,"list",new Vs);v(this,"_modelMaterialMapping",new Map);v(this,"_definitions",new Map);v(this,"_idGenerator",new Ad);v(this,"white",4294967295)}static resetColors(t){for(let e of t){if(!(e&&e.color))continue;let{color:n}=e;if(n.isColor)continue;let{r:s,g:r,b:o}=n;e.color=new kt().setRGB(s,r,o,_n)}}dispose(t){this._definitions.delete(t);let e=this._modelMaterialMapping.get(t);if(e){for(let n of e){let s=this.list.get(n);s&&(s.dispose(),this.list.delete(n))}this._modelMaterialMapping.delete(t)}}releaseModelSlot(t){this._definitions.delete(t),this._modelMaterialMapping.delete(t)}get(t,e){let{modelId:n,objectClass:s,currentLod:r,templateId:o}=e;if(!(n&&s!==void 0&&r!==void 0))throw new Error("Fragments: material definition information is missing to create the material.");this._idGenerator.fromMaterialData({modelId:n,objectClass:s,currentLod:r,templateId:o,...t});let{value:a}=this._idGenerator;return this.getUniqueMaterial(a,t,e)}addDefinitions(t,e,n){let s=this._definitions.get(t);s?(n!==void 0&&n<s.length&&(s.length=n),s.push(...e)):this._definitions.set(t,e)}createHighlights(t,e){let{tileData:{highlightData:n,highlightIds:s},modelId:r,material:o}=e,{geometry:a}=t,c=t.material.slice(0,2),l=new Map,h=this._definitions.get(r);if(!h)return c;for(let u=0;u<n.position.length;u++){let d=s[u];this.processHighlight(l,d,h,o,e,c);let f=n.position[u],p=n.size[u],g=p===this.white?1/0:p;a.addGroup(f,g,l.get(s[u]))}return c}getHighlightProps(t,e,n){let s=this._definitions.get(n);if(!s)return;let r=s[e],o=s[t];if(!o||!r)return;let{preserveOriginalMaterial:a,_explicitProps:c,...l}=o,h={...r};if(a)for(let u of c??[])l[u]!==void 0&&(h[u]=l[u]);else Object.assign(h,l);return h}getFromRequest(t){let{material:e,modelId:n}=t,r=this._definitions.get(n)?.[e];if(!r)throw new Error(`Fragments: Missing mesh material for index ${e}`);return this.get(r,t)}newLODMaterial(t,e){let{data:n}=t,s=new kt(n.color);e.currentLod===Ui.WIRES&&s.multiplyScalar(.85);let r={color:s,...this.getParameters(n)},o=new Rd(r);return o.userData={customId:n.customId},o}getParameters(t){let{opacity:e,transparent:n}=t,s=e<1;return{opacity:e,transparent:n||s,clipIntersection:!1}}new(t,e){let{objectClass:n,templateId:s}=e,r;if(n===rr.SHELL)r=new Js({color:t.color,transparent:t.opacity<1,opacity:t.opacity,userData:{customId:t.customId,localId:t.localId},depthTest:t.depthTest??!0,depthWrite:t.depthWrite??!0,polygonOffset:(t.polygonOffsetFactor??0)!==0||(t.polygonOffsetUnits??0)!==0,polygonOffsetFactor:t.polygonOffsetFactor??0,polygonOffsetUnits:t.polygonOffsetUnits??0,side:t.renderedFaces===1?kn:ri});else if(n===rr.LINE)r=this.newLODMaterial({data:t,instancing:s!==void 0},e);else throw new Error("Fragments: Unsupported object class");return r}addMaterialToModel(t,e){let n=this._modelMaterialMapping.get(t);n||(n=new Set,this._modelMaterialMapping.set(t,n)),n.add(e)}processHighlight(t,e,n,s,r,o){if(!t.has(e)){let a=n[s],c=n[e],{preserveOriginalMaterial:l,_explicitProps:h,...u}=c,d={...a};if(l)for(let p of h??[])u[p]!==void 0&&(d[p]=u[p]);else Object.assign(d,u);let f=this.get(d,r);o.push(f),t.set(e,o.length-1)}}getUniqueMaterial(t,e,n){let s=n.modelId,r=this.list.get(t);if(r)return r;let o=this.new(e,n);return this.list.set(t,o),this.addMaterialToModel(s,t),this.list.get(t)}};var Cd=class{async getHighlight(t,e){let n=await t.threads.invoke(t.modelId,"getHighlight",[e]);return ks.resetColors(n),n}async highlight(t,e,n){await t.threads.invoke(t.modelId,"highlight",[e,n])}async setColor(t,e,n){await t.threads.invoke(t.modelId,"setColor",[e,n])}async resetColor(t,e){await t.threads.invoke(t.modelId,"resetColor",[e])}async setOpacity(t,e,n){await t.threads.invoke(t.modelId,"setOpacity",[e,n])}async resetOpacity(t,e){await t.threads.invoke(t.modelId,"resetOpacity",[e])}async getHighlightItemIds(t){return t.threads.invoke(t.modelId,"getHighlightItemIds")}async resetHighlight(t,e){await t.threads.invoke(t.modelId,"resetHighlight",[e])}};var Pd=class extends Map{constructor(e,n){super(n);v(this,"tracker",null);v(this,"localId");v(this,"guard",()=>!0);this.localId=e}get object(){let e={};for(let[n,s]of this.entries())e[n]=s.value;return e}set(e,n){if(!(this.guard??(()=>!0))(e,n))return this;let o=n.type!==void 0?n:{value:n.value,type:this.getType(e)};if(!this.tracker)return super.set(e,o);if(this.localId===null)return console.warn("Item attributes are missing a valid localId. Changes can't be tracked."),super.set(e,o);let a=this.tracker.get(this.localId);return a||(a={type:"modified",added:{},deleted:[],modified:{}},this.tracker.set(this.localId,a)),a.type==="added"?a.data[e]=o:a.type==="modified"&&(this.has(e)?a.modified[e]=o:a.deleted.includes(e)?(a.deleted=a.deleted.filter(c=>c!==e),a.modified[e]=o):a.added[e]=o),super.set(e,o)}setValue(e,n){return this.set(e,{value:n,type:this.getType(e)})}setType(e,n){let s=this.getValue(e);return s?this.set(e,{value:s,type:n}):this}delete(e){if(!this.tracker)return super.delete(e);let n=this.get("localId");if(n===void 0||typeof n!="number")return console.warn("Item attributes are missing a valid localId. Changes can't be tracked."),e==="localId"?!1:super.delete(e);if(e==="localId"||!this.has(e))return!1;let s=this.tracker.get(n);return s||(s={type:"modified",added:{},deleted:[],modified:{}},this.tracker.set(n,s)),s.type==="added"?delete s.data[e]:s.type==="modified"&&(e in s.added?delete s.added[e]:(e in s.modified&&delete s.modified[e],s.deleted.push(e))),super.delete(e)}getValue(e){let n=this.get(e);return n?n.value:null}getType(e){return this.get(e)?.type}};var Ld=class extends Map{constructor(e,n){super(n);v(this,"tracker",null);v(this,"localId");v(this,"guard",()=>!0);v(this,"onItemsRequested",null);this.localId=e}get itemChanges(){if(!this.tracker)return null;if(!this.localId)return console.warn("Item relations can't be tracked."),null;let e=this.tracker.get(this.localId);return e||(e={type:"modified",added:{},deleted:new Set,removed:{},modified:{}},this.tracker.set(this.localId,e)),e}set(e,n){let s=this.has(e);if(!(this.guard??(()=>!0))(e,n))return this;let a=this.itemChanges;return a?(s?a.modified[e]=n:a.added[e]=n,super.set(e,n)):super.set(e,n)}add(e,n){let s=this.has(e),r=this.get(e);if(!r)return r=new Set([n]),this.set(e,r),!0;if(!r||r.has(n))return!1;let o=this.itemChanges;if(!o)return r.add(n),!0;if(s)if(o.removed[e]?.has(n))o.removed[e].delete(n),o.removed[e].size===0&&delete o.removed[e];else{let a=o.modified[e];a||(a=new Set,o.modified[e]=a),a.add(n)}else{let a=o.added[e];a||(a=new Set,o.added[e]=a),a.add(n)}return r.add(n),!0}remove(e,n){let s=this.get(e);if(!s||!s.has(n))return!1;let r=this.itemChanges;if(!r)return s.delete(n);if(r.modified[e]?.has(n))r.modified[e].delete(n),r.modified[e].size===0&&delete r.modified[e];else{let o=r.removed[e];o||(o=new Set,r.removed[e]=o),o.add(n)}return s.delete(n)}delete(e){if(!this.has(e))return!1;let n=this.itemChanges;return n?(n.deleted.add(e),super.delete(e)):super.delete(e)}async getItems(e){if(!this.onItemsRequested)return null;let n=this.get(e);return n?await this.onItemsRequested([...n]):null}};var Dd=class{constructor(t,e){v(this,"model");v(this,"localId");v(this,"_indices",null);v(this,"_transform",null);v(this,"_normals",null);v(this,"_positions",null);v(this,"_vertices",null);v(this,"_triangles",null);v(this,"_position",null);v(this,"_box",null);this.model=t,this.localId=e}async get(){let[t]=await this.model.threads.invoke(this.model.modelId,"getItemsGeometry",[[this.localId]]);for(let e of t){e.transform=new jt().fromArray(e.transform.elements);let{indices:n,normals:s,positions:r,transform:o}=e;this._indices||(this._indices=[]),this._normals||(this._normals=[]),this._positions||(this._positions=[]),this._transform||(this._transform=[]),this._indices.push(n),this._normals.push(s),this._positions.push(r),this._transform.push(o)}return t}async getIndices(){return this._indices!==null?this._indices:(await this.get(),this._indices)}async getTransform(){return this._transform!==null?this._transform:(await this.get(),this._transform)}async getNormals(){return this._normals!==null?this._normals:(await this.get(),this._normals)}async getPositions(){return this._positions!==null?this._positions:(await this.get(),this._positions)}async getVertices(){if(this._vertices)return this._vertices;let t=await this.getPositions(),e=await this.getTransform();if(!t||!e)return this._vertices;this._vertices=[];for(let n=0;n<t.length;n++){let s=t[n],r=e[n];if(!s||!r)continue;let o=[];this._vertices.push(o);let a=Object.keys(s).length/3,c=[];for(let l=0;l<a;l++){let h=s[l*3],u=s[l*3+1],d=s[l*3+2];if(typeof h!="number"||typeof u!="number"||typeof d!="number")continue;let f=`${h},${u},${d}`;if(c.includes(f))continue;c.push(f);let p=new R(h,u,d);p.applyMatrix4(r),o.push(p)}}return this._vertices}async getTriangles(){if(this._triangles)return this._triangles;let t=await this.getIndices(),e=await this.getPositions(),n=await this.getTransform();if(!t||!e||!n)return this._triangles;this._triangles=[];for(let s=0;s<t.length;s++){let r=t[s],o=e[s],a=n[s];if(!r||!o||!a)continue;let c=[];this._triangles.push(c);for(let l=0;l<r.length;l+=3){let h=r[l],u=r[l+1],d=r[l+2],f=new R(o[h*3],o[h*3+1],o[h*3+2]),p=new R(o[u*3],o[u*3+1],o[u*3+2]),b=new R(o[d*3],o[d*3+1],o[d*3+2]);f.applyMatrix4(a),p.applyMatrix4(a),b.applyMatrix4(a),c.push(new si(f,p,b))}}return this._triangles}async getPosition(){if(!this._position){if(this.localId===null)return null;this._position=await this.model.getPositions([this.localId])}return this._position}async getBox(){if(!this._box){if(this.localId===null)return null;this._box=await this.model.getBoxes([this.localId])}return this._box}async setVisibility(t){await this.model.setVisible([this.localId],t)}async getVisibility(){let[t]=await this.model.getVisible([this.localId]);return t}};var Nd=class{constructor(t,e){v(this,"model");v(this,"_localId",null);v(this,"_attributes",null);v(this,"_relations",null);v(this,"_guid",null);v(this,"_category",null);v(this,"_geometry",null);this.model=t,typeof e=="number"&&(this._localId=e),typeof e=="string"&&(this._guid=e)}async getLocalId(){if(!this._localId)if(this._guid)[this._localId]=await this.model.threads.invoke(this.model.modelId,"getLocalIdsByGuids",[[this._guid]]);else throw new Error("Fragments: Item localId couldn't be get.");return this._localId}async getAttributes(){if(this._attributes)return this._attributes;let t=await this.getLocalId();if(t===null)return null;let e=await this.model.threads.invoke(this.model.modelId,"getItemAttributes",[t]);if(this._attributes=new Pd(t),!e){let s=this.model.attrsChanges.get(t);if(!(s&&s.type==="added"))return null;this._attributes.localId=t;for(let[r,o]of Object.entries(s.data))this._attributes.set(r,o);return this._attributes}let n=this.model.attrsChanges.get(t);if(n&&n.type==="modified")for(let[s,r]of Object.entries(n.added))this._attributes.set(s,r);for(let s in e){let{value:r,type:o}=e[s];n?.type==="modified"&&n.deleted.includes(s)||(n?.type==="modified"&&s in n.modified?this._attributes.set(s,n.modified[s]):this._attributes.set(s,{value:r,type:o}))}return this._attributes.tracker=this.model.attrsChanges,this._attributes}async getRelations(){if(this._relations)return this._relations;let t=await this.getLocalId();if(t===null)return null;let e=await this.model.threads.invoke(this.model.modelId,"getItemRelations",[t]);if(!e)return null;this._relations=new Ld(t),this._relations.onItemsRequested=async s=>{let r=[];for(let o of s){let a=this.model.getItem(o);a&&r.push(a)}return r};let n=this.model.relsChanges.get(t);if(n&&n.type==="modified")for(let[s,r]of Object.entries(n.added))this._relations.set(s,r);for(let[s,r]of Object.entries(e))if(!(n?.type==="modified"&&n.deleted.has(s)))if(n?.type==="modified"&&s in n.modified){let o=new Set([...n.modified[s],...r]);this._relations.set(s,new Set(o))}else this._relations.set(s,new Set(r));return this._relations.tracker=this.model.relsChanges,this._relations}async getGuid(){if(!this._guid){let t=await this.getLocalId();if(t===null)return null;[this._guid]=await this.model.threads.invoke(this.model.modelId,"getGuidsByLocalIds",[[t]])}return this._guid}async getCategory(){if(!this._category){let t=await this.getLocalId();if(t===null)return null;this._category=await this.model.threads.invoke(this.model.modelId,"getItemCategory",[t])}return this._category}async getGeometry(){if(this._geometry)return this._geometry;let t=await this.getLocalId();return t===null?null:new Dd(this.model,t)}async getData(t=[]){let e=await this.getLocalId();if(e==null)return{};t.push(e);let n=(await this.getAttributes())?.object,s=await this.getRelations(),r={};if(s)for(let a of s.keys()){let c=[];r[a]=c;let l=await s.getItems(a);if(l)for(let h of l){let u=await h.getLocalId();if(!u||t.find(f=>f===u)!==void 0)continue;t.push(u);let d=await h.getData(t);d&&c.push(d)}}return{...n,...r}}};var Od=class{getItem(t,e){return new Nd(t,e)}async getItemsData(t,e,n){return t.threads.invoke(t.modelId,"getItemsData",[e,n])}async getItemsChildren(t,e){return t.threads.invoke(t.modelId,"getItemsChildren",[e])}};var Sr=class{static containedInParallelPlanes(t,e){let n=!0;for(let s of t){let o=s.distanceToPoint(e)>=0;n=n&&o}return n}static collides(t,e,n){for(let s of e)if(this.getPointDistance(s,n,t)<0)return!1;return!0}static getPointDistance(t,e,n){let s=t.normal;for(let r of this.dimensions)s[r]>=0!==e?this.tempPoint[r]=n.max[r]:this.tempPoint[r]=n.min[r];return t.distanceToPoint(this.tempPoint)}};v(Sr,"tempPoint",new R),v(Sr,"dimensions",["x","y","z"]);var us=class{static containing(t,e=new Cn){let n=t.isEmpty()?{x:-1,y:-1,z:-1}:t.min,s=t.isEmpty()?{x:1,y:1,z:1}:t.max,r=t.isEmpty()?this.tempSize.set(2,2,2):t.getSize(this.tempSize),o=Math.max(r.x,r.y,r.z)||1,a=[-n.x+o,s.x+o,-n.y+o,s.y+o,-n.z+o,s.z+o];for(let c=0;c<e.planes.length;c++){let[l,h,u]=this.axisNormals[c];e.planes[c].normal.set(l,h,u),e.planes[c].constant=a[c]}return e}static transform(t,e,n=new Cn){for(let s=0;s<n.planes.length;s++){let r=n.planes[s],o=t.planes[s];r.copy(o),r.applyMatrix4(e)}return n}static isIncluded(t,e){return Sr.collides(t,e,!0)}static collides(t,e){return Sr.collides(t,e,!1)}};v(us,"tempSize",new R),v(us,"axisNormals",[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]);var Ud=class{constructor(){v(this,"_caster",new Aa);v(this,"_ray",new jn);v(this,"_frustum",new Cn);v(this,"_inverseTransform",new jt);v(this,"_t",new De);v(this,"_r",new De);v(this,"_b",new De);v(this,"_l",new De);v(this,"_n",new De);v(this,"_f",new De);v(this,"_tl",new R);v(this,"_tr",new R);v(this,"_bl",new R);v(this,"_br",new R);v(this,"_tln",new R);v(this,"_brn",new R);v(this,"_tlp",new ut);v(this,"_brp",new ut);v(this,"distance",10)}async raycast(t,e){let{frustum:n,ray:s}=this.getRayAndFrustum(e),r=this.getRequest(t,n,s);if(!r)return null;let o=await t.threads.fetch(r);if(o.results&&o.results.length){let[a]=o.results;return this.getResult({hit:a,frustum:n,ray:s,model:t})}return null}async raycastAll(t,e){let{frustum:n,ray:s}=this.getRayAndFrustum(e),r=this.getRequest(t,n,s);if(!r)return null;r.returnAll=!0;let o=[],a=await t.threads.fetch(r);if(a.results&&a.results.length){for(let c of a.results)o.push(this.getResult({hit:c,frustum:n,ray:s,model:t}));return o}return null}async rectangleRaycast(t,e,n){let s=this.getFrustum(n),r=this.getRequest(t,s);if(!r)return null;r.fullyIncluded=n.fullyIncluded;let o=await t.threads.fetch(r);return o.localIds&&o.localIds.length?this.newRectangleCastResponse(o,e):null}async raycastWithSnapping(t,e){let{frustum:n,ray:s}=this.getRayAndFrustum(e),r=this.getRequest(t,n,s);if(!r)return null;r.snappingClass=e.snappingClasses;let o=await t.threads.fetch(r);return o.results?this.newRaycastSnapResult(o,n,s,t):null}screenRectToFrustum(t,e,n,s){return this.screenToCast(t,n,this._tlp),this.screenToCast(e,n,this._brp),this.setVectors(s),this.setPlanes(s),this.newFrustum()}screenToCasterPoint(t,e,n){let s=this.screenToCast(t,e);return this._caster.setFromCamera(s,n),this._caster.ray.clone()}setPlanes(t){this.setBasePoints(),t.getWorldDirection(this._n.normal),this.setEnds(t)}setVectors(t){this.setVector(this._tl,this._tlp,this._tlp,1,t),this.setVector(this._tr,this._brp,this._tlp,1,t),this.setVector(this._bl,this._tlp,this._brp,1,t),this.setVector(this._br,this._brp,this._brp,1,t),this.setVector(this._tln,this._tlp,this._tlp,0,t),this.setVector(this._brn,this._brp,this._brp,0,t)}newFrustum(){return new Cn(this._t,this._b,this._l,this._r,this._f,this._n)}setEnds(t){if(t instanceof Es){let e=t.position,n=this._n.normal.dot(e);this._n.constant=-(n+t.near),this._f.constant=-(n-t.far)}else this._n.constant=t.position.length(),this._f.constant=1/0;this._f.normal=this._n.normal}screenToCast(t,e,n=new ut){let s=e.getBoundingClientRect(),r=s.width/e.clientWidth,o=s.height/e.clientHeight,a=(t.x-s.left)/r,c=(t.y-s.top)/o;return n.x=a/e.clientWidth*2-1,n.y=-(c/e.clientHeight)*2+1,n}setVector(t,e,n,s,r){t.set(e.x,n.y,s),t.unproject(r)}setPlane(t,e,n,s){t.setFromCoplanarPoints(e,n,s)}setBasePoints(){this.setPlane(this._t,this._tln,this._tl,this._tr),this.setPlane(this._r,this._brn,this._tr,this._br),this.setPlane(this._b,this._brn,this._br,this._bl),this.setPlane(this._l,this._tln,this._bl,this._tl)}setupRay(t,e){t&&(this._ray.copy(t),this._ray.applyMatrix4(this._inverseTransform),e.ray=this._ray)}setupMatrix(t){this._inverseTransform.copy(t.matrixWorld),this._inverseTransform.invert()}getRequest(t,e,n){let{object:s,box:r,modelId:o}=t;return e.intersectsBox(r)?this.newCastRequest(s,o,n,e):null}getRayAndFrustum(t){this.updateCamera(t.camera);let{bottomLeft:e,topRight:n}=this.getCorners(t.mouse),s=this.screenToCasterPoint(t.mouse,t.dom,t.camera),r=this.screenRectToFrustum(e,n,t.dom,t.camera);return{ray:s,frustum:r}}getFrustum(t){return this.updateCamera(t.camera),this.screenRectToFrustum(t.topLeft,t.bottomRight,t.dom,t.camera)}getCorners(t){let e=t.clone().subScalar(this.distance),n=t.clone().addScalar(this.distance);return{bottomLeft:e,topRight:n}}getResult(t){let{hit:e,frustum:n,ray:s,model:r}=t,o={};return this.setPoint(r,e,o),this.setNormal(r,e,o),this.setDistance(r,e,o),this.setRayDistance(r,e,o),this.setBasicHitData(r,e,o,s,n),this.setSnapEdge(r,e,o,"snappedEdgeP1"),this.setSnapEdge(r,e,o,"snappedEdgeP2"),o.facePoints=e.facePoints,o.faceIndices=e.faceIndices,o}updateCamera(t){t.updateProjectionMatrix(),t.updateWorldMatrix(!0,!0)}newCastRequest(t,e,n,s){this.setupMatrix(t);let r={};return r.class=Je.RAYCAST,r.modelId=e,this.setupRay(n,r),us.transform(s,this._inverseTransform,this._frustum),r.frustum=this._frustum,r}setSnapEdge(t,e,n,s){if(e[s]){let r=new R;r.copy(e[s]),r.applyMatrix4(t.object.matrixWorld),n[s]=r}else n[s]=void 0}setNormal(t,e,n){if(e.normal){let s=new R;s.copy(e.normal),s.transformDirection(t.object.matrixWorld),s.normalize(),n.normal=s;return}n.normal=void 0}setDistance(t,e,n){let s=Math.sqrt(e.cameraSquaredDistance),r=t.object.matrixWorld.getMaxScaleOnAxis();n.distance=s*r}setPoint(t,e,n){let s=new R;s.copy(e.point),s.applyMatrix4(t.object.matrixWorld),n.point=s}newRaycastSnapResult(t,e,n,s){let r=[];for(let o of t.results){let a=this.getResult({hit:o,frustum:e,ray:n,model:s});r.push(a)}return r}newRectangleCastResponse(t,e){return{localIds:t.localIds,fragments:e.list.get(t.modelId)}}setRayDistance(t,e,n){if(e.raySquaredDistance!==void 0){let s=t.object.matrixWorld.getMaxScaleOnAxis(),r=Math.sqrt(e.raySquaredDistance);n.rayDistance=r*s;return}n.rayDistance=void 0}setBasicHitData(t,e,n,s,r){n.itemId=e.itemId,n.localId=e.localId,n.object=t.object,n.fragments=t,n.ray=s,n.frustum=r,n.representationClass=e.representationClass,n.snappingClass=e.snappingClass}};var Fd=class{async getSection(t,e,n){let s=[e,n];return await t.threads.invoke(t.modelId,"getSection",s)}};var Bd=class{async getSequenced(t,e,n,s){let r=[e,n,s];return await t.threads.invoke(t.modelId,"getSequenced",r)}};var zd=class{async setup(t,e,n,s,r){let o=this.getCreateModelMessage(t,n,s,r),a=this.formatModelData(n),c=await t.threads.fetch(o,a);this.updateBox(e,c)}formatModelData(t){if(t instanceof ArrayBuffer)return[t];if(t instanceof Uint8Array)return[t.buffer]}updateBox(t,e){t.min.copy(e.boundingBox.min),t.max.copy(e.boundingBox.max)}getCreateModelMessage(t,e,n,s){return{class:Je.CREATE_MODEL,modelId:t.modelId,modelData:e,raw:n,config:s}}};var Ro=class{static estimateCapacity(){let t=this.capacityFactor,e=window.screen.width,n=window.screen.height,s=window.devicePixelRatio,r=Math.trunc(e*n*s*s*t);return Math.min(r,this.maxCapacity)}};v(Ro,"capacityFactor",200),v(Ro,"maxCapacity",1e9);var Vd=class{constructor(){v(this,"getClippingPlanesEvent",()=>[]);v(this,"currentCamera",null);v(this,"_noCameraWarned",!1);v(this,"_tempMatrix",new jt);v(this,"_tempVec",new R);v(this,"_tempFrustum",new Cn);v(this,"_lastViewSignature",null);v(this,"_updateCameraPositionEvent",()=>{});v(this,"_updateCameraFrustumEvent",()=>{});v(this,"_updateFOVEvent",()=>{});v(this,"_updateOrthoSizeEvent",()=>{})}async refreshView(t,e,n=!1){let s=this.setup(t),r;if(this.currentCamera)r=us.transform(this._tempFrustum,this._tempMatrix);else{this.warnNoCameraOnce(t);let l=t.box;l.isEmpty()||l.applyMatrix4(this._tempMatrix),r=us.containing(l,this._tempFrustum)}let o=this.newViewRequest(r,s,t),a=this.computeViewSignature(o.view,t);if(!n&&this.signatureEquals(a))return!1;this._lastViewSignature=a,e.requests.clean(t.modelId);let c=t.threads.fetch(o);return e.viewDispatched(t.modelId,o.seq),await c,!0}useCamera(t){let e=new jt;this.setCameraPosition(t),this.setCameraFrustum(t,e),this.setFov(t),this.setOrtho(),this.currentCamera=t}async setLodMode(t,e){return t.threads.invoke(t.modelId,"setLodMode",[e])}getOrthoSize(){let t=this._updateOrthoSizeEvent();if(t){let e=this._tempMatrix.getMaxScaleOnAxis();t*=e}return t}setup(t){return this._tempMatrix.copy(t.object.matrixWorld).invert(),this._updateCameraPositionEvent(this._tempVec),this._updateCameraFrustumEvent(this._tempFrustum),this._updateFOVEvent()}warnNoCameraOnce(t){this._noCameraWarned||(console.warn(`Fragments: model "${t.modelId}" is being rendered before useCamera() has been called. Frustum culling is disabled until a camera is set.`),this._noCameraWarned=!0)}computeViewSignature(t,e){let n=[],s=t.cameraFrustum;for(let o of s.planes)n.push(o.normal.x,o.normal.y,o.normal.z),n.push(o.constant);let r=t.cameraPosition;n.push(r.x,r.y,r.z),n.push(t.fov??NaN),n.push(t.orthogonalDimension??NaN),n.push(t.viewSize),n.push(t.graphicQuality);for(let o of t.clippingPlanes)n.push(o.normal.x,o.normal.y,o.normal.z),n.push(o.constant);for(let o of e.object.matrixWorld.elements)n.push(o);return n}signatureEquals(t){let e=this._lastViewSignature;if(!e||e.length!==t.length)return!1;for(let n=0;n<t.length;n++)if(t[n]!==e[n]&&!(Number.isNaN(t[n])&&Number.isNaN(e[n])))return!1;return!0}newViewRequest(t,e,n){let s=this.newView(t,e,n),r={};return r.class=Je.REFRESH_VIEW,r.modelId=n.modelId,r.cameraFrustum=t,r.view=s,r}newView(t,e,n){let s={};s.cameraFrustum=t,s.cameraPosition=this._tempVec.applyMatrix4(this._tempMatrix),s.fov=e,s.orthogonalDimension=this.getOrthoSize(),s.viewSize=Math.max(window.innerWidth,window.innerHeight);let r=Math.max(1,n.threads.activeThreadCount);return s.graphicThreshold=Ro.estimateCapacity()/r,s.graphicQuality=n.graphicsQuality*-1.5+2,s.clippingPlanes=this.getPlanes(),s.modelPlacement=n.object.matrixWorld,s}setOrtho(){this._updateOrthoSizeEvent=()=>{}}setFov(t){this._updateFOVEvent=()=>{if(t instanceof dn)return t.fov}}getPlanes(){let t=[],e=this.getClippingPlanesEvent();for(let n of e){let s=n.clone();s.applyMatrix4(this._tempMatrix),t.push(s)}return t}setCameraPosition(t){this._updateCameraPositionEvent=e=>{e.copy(t.position)}}setCameraFrustum(t,e){this._updateCameraFrustumEvent=n=>{t.updateProjectionMatrix(),t.updateWorldMatrix(!0,!0);let{projectionMatrix:s,matrixWorldInverse:r}=t;e.multiplyMatrices(s,r),n.setFromProjectionMatrix(e)}}};var kd=class{async resetVisible(t){await t.threads.invoke(t.modelId,"resetVisible")}async getItemsByVisibility(t,e){return t.threads.invoke(t.modelId,"getItemsByVisibility",[e])}async getVisible(t,e){return t.threads.invoke(t.modelId,"getVisible",[e])}};var Hd=class{static fixNumber(t){return Number.isNaN(t)||!Number.isFinite(t)?0:t}static forEach(t,e){if(Array.isArray(t)){let n=0;for(let s of t)e(s,n++);return}e(t,0)}};var fl=class fl{constructor(t,e,n,s,r){v(this,"attrsChanges",new Map);v(this,"relsChanges",new Map);v(this,"threads");v(this,"tiles",new Vs);v(this,"onViewUpdated",new yn);v(this,"visibleItems",new Set);v(this,"object",new Ye);v(this,"graphicsQuality",0);v(this,"deltaModelId",null);v(this,"_boxManager",new ud);v(this,"_itemsManager",new Od);v(this,"_coordinatesManager",new fd);v(this,"_setupManager",new zd);v(this,"_viewManager",new Vd);v(this,"_raycastManager",new Ud);v(this,"_visibilityManager",new kd);v(this,"_highlightManager",new Cd);v(this,"_sectionManager",new Fd);v(this,"_dataManager",new pd);v(this,"_sequenceManager",new Bd);v(this,"_bbox",new we);v(this,"_alignmentsManager");v(this,"_gridsManager");v(this,"_meshManager");v(this,"_editManager",new Md);v(this,"_editor");v(this,"_isProcessing",!1);v(this,"_isLoaded",!1);v(this,"_frozen",!1);v(this,"_isSetup",!1);v(this,"_parentModelId",null);v(this,"threadGroup");this.object.name=t,this.object.up.set(0,0,1),this._meshManager=e,this.threads=n,this._editor=s,this.threadGroup=r,this._alignmentsManager=new dd(this),this._gridsManager=new wd(this),this.tiles.onItemSet.add(({value:o})=>this.object.add(o)),this.tiles.onBeforeDelete.add(({value:o})=>{this.object.remove(o),o.geometry.dispose(),Hd.forEach(o.material,a=>a.dispose())})}get modelId(){return this.object.name}get box(){return this._bbox.clone().applyMatrix4(this.object.matrixWorld)}get isBusy(){let t=this._meshManager.requests.arePending;return!this._isLoaded||this._isProcessing||t}get frozen(){return!!this._frozen}set frozen(t){t!==this._frozen&&(this._frozen=t,!t&&this._refreshView())}get getClippingPlanesEvent(){return this._viewManager.getClippingPlanesEvent}set getClippingPlanesEvent(t){this._viewManager.getClippingPlanesEvent=t}get clippingPlanes(){return this._viewManager.getClippingPlanesEvent()}get camera(){return this._viewManager.currentCamera}get isDeltaModel(){return this.object.userData[fl._deltaModelId]}get parentModelId(){return this._parentModelId}async dispose(t){this._isLoaded=!1,this.visibleItems.clear(),this.onViewUpdated.reset(),await this._dataManager.dispose(this,this._meshManager,this._alignmentsManager,this._gridsManager,t)}finalizeDispose(){this.object.removeFromParent(),this.tiles.eventsEnabled=!1;for(let[,t]of this.tiles)this.object.remove(t),t.geometry.dispose();this.tiles.clear(),this._alignmentsManager.dispose(),this._gridsManager.dispose()}getSpatialStructure(){return this._dataManager.getSpatialStructure(this)}getLocalIdsByGuids(t){return this._dataManager.getLocalIdsByGuids(this,t)}getLocalIdsFromItemIds(t){return this._dataManager.getLocalIdsFromItemIds(this,t)}getCategories(){return this._dataManager.getCategories(this)}getIndexNames(){return this._dataManager.getIndexNames(this)}getIndexInfo(t){return this._dataManager.getIndexInfo(this,t)}getIndexKeys(t){return this._dataManager.getIndexKeys(this,t)}getIndexKey(t,e){return this._dataManager.getIndexKey(this,t,e)}getIndexValues(t){return this._dataManager.getIndexValues(this,t)}hasIndexEntry(t,e){return this._dataManager.hasIndexEntry(this,t,e)}getIndexEntry(t,e){return this._dataManager.getIndexEntry(this,t,e)}getInverseIndexEntry(t,e){return this._dataManager.getInverseIndexEntry(this,t,e)}getItemsWithGeometryCategories(){return this._dataManager.getItemsWithGeometryCategories(this)}getItemsWithGeometry(){return this._dataManager.getItemsWithGeometry(this)}getItemsIdsWithGeometry(){return this._dataManager.getItemsIdsWithGeometry(this)}getMetadata(){return this._dataManager.getMetadata(this)}getCRS(){return this._dataManager.getCRS(this)}getGuidsByLocalIds(t){return this._dataManager.getGuidsByLocalIds(this,t)}getBuffer(t=!1){return this._dataManager.getBuffer(this,t)}getSubsetBuffer(t,e=!1){return this.threads.invoke(this.modelId,"getSubsetBuffer",[t,e])}getItemsOfCategories(t){return this._dataManager.getItemsOfCategories(this,t)}async getGuids(){return await this.threads.invoke(this.modelId,"getGuids",[])}async getLocalIds(){return await this.threads.invoke(this.modelId,"getLocalIds",[])}getItemsByQuery(t,e){return this._dataManager.getItemsByQuery(this,t,e)}async getItemsMaterialDefinition(t){return await this.threads.invoke(this.modelId,"getItemsMaterialDefinition",[t])}getItemsGeometry(t,e=Ui.GEOMETRY){return this._editManager.getItemsGeometry(this,t,e)}getGeometries(t){return this._editManager.getGeometries(this,t)}async getItemsVolume(t){return await this.threads.invoke(this.modelId,"getItemsVolume",[t])}async getAttributeNames(){return await this.threads.invoke(this.modelId,"getAttributeNames",[])}async getAttributeValues(){return await this.threads.invoke(this.modelId,"getAttributeValues",[])}async getAttributesUniqueValues(t){return await this.threads.invoke(this.modelId,"getAttributesUniqueValues",[t])}async getAttributeTypes(){return await this.threads.invoke(this.modelId,"getAttributeTypes",[])}async getRelationNames(){return await this.threads.invoke(this.modelId,"getRelationNames",[])}getMaxLocalId(){return this._dataManager.getMaxLocalId(this)}getItem(t){return this._itemsManager.getItem(this,t)}getItemsChildren(t){return this._itemsManager.getItemsChildren(this,t)}getItemsData(t,e){return this._itemsManager.getItemsData(this,t,e)}getPositions(t){return this._coordinatesManager.getPositions(this,t)}getCoordinates(){return this._coordinatesManager.getCoordinates(this)}getCoordinationMatrix(){return this._coordinatesManager.getCoordinationMatrix(this)}getMergedBox(t){return this._boxManager.getMergedBox(this,t)}getBoxes(t){return this._boxManager.getBoxes(this,t)}getAlignments(){return this._alignmentsManager.getAlignments()}getHorizontalAlignments(){return this._alignmentsManager.getHorizontalAlignments()}getVerticalAlignments(){return this._alignmentsManager.getVerticalAlignments()}getAlignmentStyles(){return this._alignmentsManager.getAlignmentStyles()}getGrids(t){return this._gridsManager.getGrids(t)}getGridMaterial(){return this._gridsManager.getGridMaterial()}setGridMaterial(t){this._gridsManager.setGridMaterial(t)}getGridLabelMaterial(){return this._gridsManager.getLabelMaterial()}setGridLabelMaterial(t){this._gridsManager.setLabelMaterial(t)}useCamera(t){this._viewManager.useCamera(t)}useClippingPlanes(t){this._viewManager.getClippingPlanesEvent=()=>t}setLodMode(t){return this._viewManager.setLodMode(this,t)}rectangleRaycast(t){return this._raycastManager.rectangleRaycast(this,this._meshManager,t)}raycast(t){return this._raycastManager.raycast(this,t)}raycastAll(t){return this._raycastManager.raycastAll(this,t)}raycastWithSnapping(t){return this._raycastManager.raycastWithSnapping(this,t)}async setVisible(t,e){let n=[t,e];await this.threads.invoke(this.modelId,"setVisible",n)}async toggleVisible(t){let e=[t];await this.threads.invoke(this.modelId,"toggleVisible",e)}getItemsByVisibility(t){return this._visibilityManager.getItemsByVisibility(this,t)}getVisible(t){return this._visibilityManager.getVisible(this,t)}resetVisible(){return this._visibilityManager.resetVisible(this)}highlight(t,e){return this._highlightManager.highlight(this,t,e)}setColor(t,e){return this._highlightManager.setColor(this,t,e)}resetColor(t){return this._highlightManager.resetColor(this,t)}setOpacity(t,e){return this._highlightManager.setOpacity(this,t,e)}resetOpacity(t){return this._highlightManager.resetOpacity(this,t)}getHighlight(t){return this._highlightManager.getHighlight(this,t)}resetHighlight(t){return this._highlightManager.resetHighlight(this,t)}getHighlightItemIds(){return this._highlightManager.getHighlightItemIds(this)}getSection(t,e){return this._sectionManager.getSection(this,t,e)}getMaterialsIds(){return this._editManager.getMaterialsIds(this)}getMaterials(t){return this._editManager.getMaterials(this,t)}getRepresentationsIds(){return this._editManager.getRepresentationsIds(this)}getRepresentations(t){return this._editManager.getRepresentations(this,t)}getLocalTransformsIds(){return this._editManager.getLocalTransformsIds(this)}getLocalTransforms(t){return this._editManager.getLocalTransforms(this,t)}getGlobalTransformsIds(){return this._editManager.getGlobalTransformsIds(this)}getGlobalTransforms(t){return this._editManager.getGlobalTransforms(this,t)}getSamplesIds(){return this._editManager.getSamplesIds(this)}getSamples(t){return this._editManager.getSamples(this,t)}getItemDrawChunks(t){return this._dataManager.getItemDrawChunks(this,t)}getItemsIds(){return this._editManager.getItemsIds(this)}getItems(t){return this._editManager.getItems(this,t)}getRelations(t){return this._editManager.getRelations(this,t)}getGlobalTranformsIdsOfItems(t){return this._editManager.getGlobalTranformsIdsOfItems(this,t)}getEditedElements(){return this._editManager.getEditedElements(this)}getSequenced(t,e,n){return this._sequenceManager.getSequenced(this,t,e,n)}async handleRequest(t){await this._meshManager.requests.handleRequest(this._meshManager,t)}_getElements(t){return this._editManager.getElements(this,t)}_getItemSnapData(t){return this._editManager.getItemSnapData(this,t)}_finishProcessing(){this._isProcessing=!1,this.onViewUpdated.trigger(this)}_setDeltaModel(t){this.object.userData[fl._deltaModelId]=!0,this._parentModelId=t}async _refreshView(t=!1){if(this.frozen)return;let e=this._viewManager.refreshView(this,this._meshManager,t).then(s=>{s&&(this._isProcessing=!0)}),n=this._editor._update(this.modelId);await Promise.all([e,n])}async _setup(t,e,n){this._isSetup||(await this._setupManager.setup(this,this._bbox,t,e,n),this._isLoaded=!0,this._isProcessing=!0,this._isSetup=!0)}_edit(t){return this._editManager.edit(this,t)}_reset(){return this._editManager.reset(this)}_save(){return this._editManager.save(this)}_getRequests(){return this._editManager.getRequests(this)}_setRequests(t){return this._editManager.setRequests(this,t)}_selectRequest(t){return this._editManager.selectRequest(this,t)}};v(fl,"_deltaModelId","isDeltaModel");var Co=fl;var T1=new Set([ot.CREATE_MATERIAL,ot.CREATE_REPRESENTATION,ot.CREATE_SAMPLE,ot.CREATE_GLOBAL_TRANSFORM,ot.CREATE_LOCAL_TRANSFORM,ot.UPDATE_MATERIAL,ot.UPDATE_REPRESENTATION,ot.UPDATE_SAMPLE,ot.UPDATE_GLOBAL_TRANSFORM,ot.UPDATE_LOCAL_TRANSFORM,ot.DELETE_MATERIAL,ot.DELETE_REPRESENTATION,ot.DELETE_SAMPLE,ot.DELETE_GLOBAL_TRANSFORM,ot.DELETE_LOCAL_TRANSFORM,ot.DELETE_ITEM]),Gd=class{constructor(t,e){v(this,"_deltaModels",{});v(this,"_fragments");v(this,"_connection");this._fragments=t,this._connection=e}async edit(t,e,n={removeRedo:!0}){let s=this._fragments.models.list.get(t);if(!s)throw new Error(`Model ${t} not found`);let r=e.length>0&&e.every(d=>!T1.has(d.type)),o=this._deltaModels[t]||[];this._deltaModels[t]=null,n.removeRedo&&s._setRequests({undoneRequests:[]});let{deltaModelBuffer:a,ids:c}=await s._edit(e),l=0;for(let d=0;d<e.length;d++){let f=e[d];ar(f)||f.localId===void 0&&(f.localId=c[l++])}if(r)return this._deltaModels[t]=o.length?o:null,c;let h=await this.load(a,s);this._deltaModels[t]=[h],s.deltaModelId=h.modelId;for(let d of o)d.object.visible=!1;let u=[];for(let d of o)u.push(d.dispose()),this._fragments.models.list.delete(d.modelId);return await Promise.all(u),c}async save(t){let e=this._fragments.models.list.get(t);if(!e)return console.log(`Model ${t} not found`),null;let n=e.object.parent,s=await e._getRequests(),r=e.camera||void 0,o=await e._save();await e.dispose({keepInScene:!0});let a=await this._fragments.load(o,{modelId:t,raw:!0,camera:r});return await a._setRequests({undoneRequests:s.undoneRequests}),n&&n.add(a.object),e.finalizeDispose(),s}async reset(t){let e=this._fragments.models.list.get(t);if(!e){console.log(`Model ${t} not found`);return}await e._reset(),await this.disposeDeltaModels(t)}async getRequests(t){let e=this._fragments.models.list.get(t);if(!e)throw new Error(`Model ${t} not found`);return e._getRequests()}async selectRequest(t,e){let n=this._fragments.models.list.get(t);if(!n)throw new Error(`Model ${t} not found`);return n._selectRequest(e)}async _update(t){let e=this._deltaModels[t];if(e){let n=[];for(let s of e)n.push(s._refreshView());await Promise.all(n)}}async disposeDeltaModels(t){let e=this._deltaModels[t];if(e){for(let n of e)await n.dispose();this._deltaModels[t]=[]}}async load(t,e){let n=Jt.DELTA_MODEL_ID,s=`${e.modelId}${n}${performance.now()}`,r=new Co(s,this._fragments.models,this._connection,this._fragments.editor);r._setDeltaModel(e.modelId),r.frozen=!0,r.graphicsQuality=this._fragments.settings.graphicsQuality;let o={multithreading:{meshConnectionRate:this._fragments.settings.meshConnectionRate,meshConnectionThreshold:this._fragments.settings.meshConnectionThreshold,threadUpdaterDelay:this._fragments.settings.threadUpdaterDelay}};try{this._fragments.models.list.set(r.modelId,r),await r._setup(t,!0,o),e.object.add(r.object)}catch(c){throw this._fragments.models.list.delete(r.modelId),c}let a=e.camera;return a&&r.useCamera(a),r._frozen=!1,await r._refreshView(),await this._fragments.models.forceUpdateFinish(),r}};var Wd=class{constructor(t){v(this,"_nextTempIds",{});v(this,"_requests",{});v(this,"_fragments");v(this,"_indexRequests",{});this._fragments=t}getRequests(t){let e=this.getModelRequests(t);this._requests[t]=this.newRequests();let{create:n,update:s,remove:r,relations:{create:o,update:a,remove:c}}=e,l=Object.values(n),h=Object.values(s),u=Object.values(r),d=Object.values(o),f=Object.values(a),p=Object.values(c),b=this._indexRequests[t]??[];this._indexRequests[t]=[];let g=[...u,...l,...h,...d,...f,...p,...b];return g.length>0?g:null}createIndex(t,e){this.queueIndexRequest(t,{type:ot.CREATE_INDEX,data:e})}updateIndex(t,e){this.queueIndexRequest(t,{type:ot.UPDATE_INDEX,data:e})}deleteIndex(t,e){this.queueIndexRequest(t,{type:ot.DELETE_INDEX,name:e})}queueIndexRequest(t,e){this._indexRequests[t]||(this._indexRequests[t]=[]),this._indexRequests[t].push(e)}createMaterial(t,e){let n=this.getNextTempId(t),s={r:e.color.r*255,g:e.color.g*255,b:e.color.b*255,a:e.opacity*255,renderedFaces:e.side===kn?1:0,stroke:0};return this.addRequest(t,n,"create",{type:ot.CREATE_MATERIAL,tempId:n,data:s}),n}createLocalTransform(t,e){let n=this.getNextTempId(t),s=$e.transformFromMatrix(e);return this.addRequest(t,n,"create",{type:ot.CREATE_LOCAL_TRANSFORM,tempId:n,data:s}),n}createShell(t,e){let n=this.getNextTempId(t),s=$e.representationFromGeometry(e);return this.addRequest(t,n,"create",{type:ot.CREATE_REPRESENTATION,tempId:n,data:s}),n}createCircleExtrusion(t,e){let n=$e.bboxFromCircleExtrusion(e),s=this.getNextTempId(t);return this.addRequest(t,s,"create",{type:ot.CREATE_REPRESENTATION,tempId:s,data:{representationClass:de.CIRCLE_EXTRUSION,bbox:n,geometry:e}}),s}createGlobalTransform(t,e,n){let s=this.getNextTempId(t),r=$e.transformFromMatrix(e);return this.addRequest(t,s,"create",{type:ot.CREATE_GLOBAL_TRANSFORM,tempId:s,data:{itemId:n,...r}}),s}createSample(t,e){let{localTransform:n,representation:s,material:r,globalTransform:o}=e,a=this.getNextTempId(t);return this.addRequest(t,a,"create",{type:ot.CREATE_SAMPLE,tempId:a,data:{localTransform:n,representation:s,material:r,item:o}}),a}createItem(t,e){let n=this.getNextTempId(t);return this.addRequest(t,n,"create",{type:ot.CREATE_ITEM,tempId:n,data:e}),n}setItem(t,e){let n=e._localId;if(!n)throw new Error("No local id provided for the item to set");let s=n.value,r=Jt.itemDataToRawItemData(e);this.addRequest(t,n.value,"update",{type:ot.UPDATE_ITEM,localId:s,data:r})}async relate(t,e,n,s){let r=this._fragments.models.list.get(t);if(!r)throw new Error(`Model ${t} not found`);let a=(await r.getRelations([e])).get(e);if(!a){this.addRelationRequest(t,e,"create",{type:ot.CREATE_RELATION,localId:e,data:{data:{[n]:s}}});return}if(!a.data[n])a.data[n]=s;else{let c=new Set(a.data[n]);for(let l of s)c.add(l);a.data[n]=Array.from(c)}this.addRelationRequest(t,e,"update",{type:ot.UPDATE_RELATION,localId:e,data:a})}async unrelate(t,e,n,s){let r=this._fragments.models.list.get(t);if(!r)throw new Error(`Model ${t} not found`);let a=(await r.getRelations([e])).get(e);if(!a||!a.data[n])return;let c=new Set(a.data[n]);for(let l of s)c.delete(l);a.data[n]=Array.from(c),this.addRelationRequest(t,e,"update",{type:ot.UPDATE_RELATION,localId:e,data:a})}async get(t,e){let n=this._fragments.models.list.get(t);if(!n)throw new Error(`Model ${t} not found`);return n._getElements(e)}async create(t,e){for(let a of e){let{attributes:c,samples:l,globalTransform:h}=a,u=this.getNextTempId(t),d=Jt.itemDataToRawItemData(c);this.addRequest(t,u,"create",{type:ot.CREATE_ITEM,tempId:u,data:d});let f=this.createGlobalTransform(t,h,u);for(let p of l){let{localTransform:b,representation:g,material:m}=p,M;typeof b!="number"&&typeof b!="string"?M=this.createLocalTransform(t,b):M=b;let w;typeof g!="number"&&typeof g!="string"?w=this.createShell(t,g):w=g;let _;typeof m!="number"&&typeof m!="string"?_=this.createMaterial(t,m):_=m,this.createSample(t,{localTransform:M,representation:w,material:_,globalTransform:f})}}let n=this.getRequests(t);if(!n)return console.log("Something went wrong, no requests sent"),null;let s=[];for(let a=0;a<n.length;a++)n[a].type===ot.CREATE_ITEM&&s.push(a);let r=await this._fragments.editor.edit(t,n),o=s.map(a=>r[a]);return this.get(t,o)}delete(t,e){for(let n of e){n.delete();let s=n.getRequests();if(s)for(let r of s){if(ar(r))continue;let o=r.localId;o&&this.addRequest(t,o,"remove",r)}}}async applyChanges(t,e=[]){let n=[];for(let r of e){let o=r.getRequests();o&&n.push(...o)}let s=this.getRequests(t);return s&&n.push(...s),n.length>0?this._fragments.editor.edit(t,n):[]}async deleteData(t,e){let n=this._fragments.models.list.get(t);if(!n)throw new Error(`Model ${t} not found`);let s=e.filterInUse??!0,{itemIds:r,materialIds:o,localTransformIds:a,representationIds:c,sampleIds:l}=e,h=new Set,u=new Set,d=new Set,f=new Set;if(s){let p=await n.getSamples();for(let b of p.values())h.add(b.material),u.add(b.localTransform),d.add(b.item),f.add(b.representation)}if(o)for(let p of o){if(s&&h.has(p)){console.log(`Material ${p} is used, skipping`);continue}if(this.isBeingCreated(t,p)){delete this._requests[t].create[p];continue}this.addRequest(t,p,"remove",{type:ot.DELETE_MATERIAL,localId:p})}if(a)for(let p of a){if(s&&u.has(p)){console.log(`Local transform ${p} is used, skipping`);continue}if(this.isBeingCreated(t,p)){delete this._requests[t].create[p];continue}this.addRequest(t,p,"remove",{type:ot.DELETE_LOCAL_TRANSFORM,localId:p})}if(c)for(let p of c){if(s&&f.has(p)){console.log(`Representation ${p} is used, skipping`);continue}if(this.isBeingCreated(t,p)){delete this._requests[t].create[p];continue}this.addRequest(t,p,"remove",{type:ot.DELETE_REPRESENTATION,localId:p})}if(l)for(let p of l){if(this.isBeingCreated(t,p)){delete this._requests[t].create[p];continue}this.addRequest(t,p,"remove",{type:ot.DELETE_SAMPLE,localId:p})}if(r)for(let p of r){if(this.isBeingCreated(t,p)){delete this._requests[t].create[p];continue}this.addRequest(t,p,"remove",{type:ot.DELETE_ITEM,localId:p})}}getNextTempId(t){return this._nextTempIds[t]||(this._nextTempIds[t]=0),(this._nextTempIds[t]++).toString()}addRelationRequest(t,e,n,s){let a=this.getModelRequests(t).relations[n],c=e;a[c]=s}addRequest(t,e,n,s){let o=this.getModelRequests(t)[n],a=e;o[a]=s}getModelRequests(t){return this._requests[t]||(this._requests[t]=this.newRequests()),this._requests[t]}isBeingCreated(t,e){return this._requests[t]?this._requests[t].create[e]!==void 0:!1}newRequests(){return{update:{},create:{},remove:{},relations:{create:{},update:{},remove:{}}}}};var Xd=class{constructor(t,e){v(this,"onEdit",new yn);v(this,"_editHelper");v(this,"_elementsHelper");this._editHelper=new Gd(t,e),this._elementsHelper=new Wd(t)}async edit(t,e,n={removeRedo:!0}){let s=await this._editHelper.edit(t,e,n);return this.onEdit.trigger(),s}async save(t){return this._editHelper.save(t)}async reset(t){await this._editHelper.reset(t)}async getModelRequests(t){return this._editHelper.getRequests(t)}async selectRequest(t,e){return this._editHelper.selectRequest(t,e)}clearElementsRequests(t){return this._elementsHelper.getRequests(t)}createMaterial(t,e){return this._elementsHelper.createMaterial(t,e)}createLocalTransform(t,e){return this._elementsHelper.createLocalTransform(t,e)}createShell(t,e){return this._elementsHelper.createShell(t,e)}createCircleExtrusion(t,e){return this._elementsHelper.createCircleExtrusion(t,e)}createGlobalTransform(t,e,n){return this._elementsHelper.createGlobalTransform(t,e,n)}createSample(t,e){return this._elementsHelper.createSample(t,e)}createItem(t,e){return this._elementsHelper.createItem(t,e)}createIndex(t,e){this._elementsHelper.createIndex(t,e)}updateIndex(t,e){this._elementsHelper.updateIndex(t,e)}deleteIndex(t,e){this._elementsHelper.deleteIndex(t,e)}setItem(t,e){return this._elementsHelper.setItem(t,e)}async relate(t,e,n,s){return this._elementsHelper.relate(t,e,n,s)}async unrelate(t,e,n,s){return this._elementsHelper.unrelate(t,e,n,s)}async getElements(t,e){return this._elementsHelper.get(t,e)}async createElements(t,e){return this._elementsHelper.create(t,e)}deleteElements(t,e){return this._elementsHelper.delete(t,e)}async applyChanges(t,e=[]){return this._elementsHelper.applyChanges(t,e)}async deleteData(t,e){return this._elementsHelper.deleteData(t,e)}async _update(t){await this._editHelper._update(t)}};var qd=class{constructor(){v(this,"list",[]);v(this,"onFinish",()=>{})}get arePending(){return this.list.length>0}async handleRequest(t,e){if(e.class===Je.RECOMPUTE_MESHES)this.add(e.list),e.list=void 0;else if(e.class===Je.CREATE_MATERIAL){let{materialDefinitions:n,modelId:s,firstId:r}=e;ks.resetColors(n),t.materials.addDefinitions(s,n,r),e.materialDefinitions=void 0}else e.class===Je.THROW_ERROR&&console.error(e)}add(t){for(let e of t)this.insert(e)||this.list.push(e),e.tileRequestClass===Ke.FINISH&&this.onFinish(e.seq,e.modelId)}clean(t){let e=this.list.filter(n=>n.modelId!==t||n.tileRequestClass!==Ke.FINISH);this.list=e}insert(t){let{modelId:e,tileId:n,tileRequestClass:s,tileData:r}=t;if(n===void 0)return!1;if(s===Ke.DELETE){let o=this.list.filter(a=>!((a.tileRequestClass===Ke.CREATE||a.tileRequestClass===Ke.DELETE)&&a.modelId===e&&a.tileId===n));this.list=o}if(s===Ke.CREATE){let o=this.list.filter(a=>!(a.tileRequestClass===Ke.CREATE&&a.modelId===e&&a.tileId===n));this.list=o}if(s===Ke.UPDATE){let o=this.list.find(a=>a.modelId===e&&a.tileId===n);if(o)return(o.tileRequestClass===Ke.CREATE||o.tileRequestClass===Ke.UPDATE)&&(o.tileData=r),!0}return!1}};var Yd=class extends Qs{constructor(){super();v(this,"isLODGeometry",!0);pn.setupLodAttributes(this)}isFiltered(){return!!this.getItemFilter()}computeBoundingBox(){this.boundingBox||(this.boundingBox=new we),pn.computeLodBox(this)}applyMatrix4(e){return this.applyTransformToBuffers(e),this.updateBounds(),this}computeBoundingSphere(){this.boundingSphere||(this.boundingSphere=new Rn),pn.computeLodSphere(this)}getItemFilter(){return pn.getInstancedAttribute(this,"itemFilter")}getItemLast(){return pn.getInterAttribute(this,"itemLast")}getItemFirst(){return pn.getInterAttribute(this,"itemFirst")}applyTransformToBuffers(e){this.getItemFirst().applyMatrix4(e),this.getItemLast().applyMatrix4(e)}updateBounds(){this.boundingBox&&this.computeBoundingBox(),this.boundingSphere&&this.computeBoundingSphere()}};var pl=class extends Re{constructor(t,e){super(t,e),this.geometry=t,this.material=e,pn.setupLodMeshResize(this)}};var Zd=class{constructor(t){v(this,"_materials");v(this,"white",4294967295);this._materials=t}createMesh(t,e){let n=this._materials.getFromRequest(e);if(!("isLodMaterial"in n&&n.isLodMaterial))throw new Error("Fragments: material is not an instance of LodMaterial.");let{positions:s}=e;if(!s)throw new Error("Fragments: no positions provided to create the LOD mesh.");let r=new Yd,o=this.deleteAttributeEvent(t);return pn.setLodBuffer(r,s,o),new pl(r,[n])}updateVisibility(t,e){let{geometry:n}=t,{visibilityData:s,highlightData:r}=e;pn.setLodVisibility(n,s),r&&pn.setLodHighlight(n,r),n.addGroup(0,1/0,0)}applyHighlight(t,e){let{tileData:{highlightIds:n,highlightData:s},modelId:r,material:o}=e;if(!s||!n)return;let a=t.material[0],c=[],l=a.highlightOpacity,h=a.transparent,u=!1;for(let d=0;d<n.length;++d){let f=this._materials.getHighlightProps(n[d],o,r);if(!f){c.push(void 0);continue}c.push(f.color?new kt(f.color):void 0),u||(l=f.opacity,u=!0),h=f.opacity<1||h}pn.setLodHighlightColors(t.geometry,s,c),a.highlightOpacity=l,a.transparent=h}processMesh(t,e){let{geometry:n}=t,{tileData:{visibilityData:s},currentLod:r}=e;if(r===Ui.WIRES&&t instanceof pl)this.updateVisibility(t,e.tileData);else if(s&&s.position.length>0)for(let o=0;o<s.position.length;++o){let a=s.size[o]===this.white,c=s.position[o],l=a?1/0:s.size[o];n.addGroup(c,l,0)}}deleteAttributeEvent(t){function e(){delete this.array}return e}};function A1(i,t){Ye.prototype.updateWorldMatrix.call(this,i,t,!0)}var jd=class jd{constructor(t){v(this,"list",new Vs);v(this,"materials",new ks);v(this,"lod",new Zd(this.materials));v(this,"requests",new qd);v(this,"updateThreshold",4);v(this,"_lastSettledSeq",0);v(this,"_fenceWaiters",[]);v(this,"_viewSeq",new Map);v(this,"_finishSeq",new Map);v(this,"_onUpdate");v(this,"white",4294967295);this._onUpdate=t,this.requests.onFinish=(e,n)=>this.handleFinish(e,n),this.list.onItemDeleted.add(e=>{this._viewSeq.delete(e),this._finishSeq.delete(e),this.finishEmptyScene(),this.resolveReadyWaiters()}),this.list.onCleared.add(()=>{this._viewSeq.clear(),this._finishSeq.clear(),this.finishEmptyScene()})}viewDispatched(t,e){typeof e=="number"&&this._viewSeq.set(t,e)}async forceUpdateFinish(){let t=wi.lastDispatchedSeq,e=new Map;for(let[s,r]of this._viewSeq)(this._finishSeq.get(s)??0)<r&&e.set(s,r);let n={targetSeq:t,views:e,resolve:()=>{}};if(this.list.size===0||this.isSettled(n)){this.drainAll();return}await new Promise(s=>{n.resolve=s,this._fenceWaiters.push(n)})}isSettled(t){if(t.targetSeq>this._lastSettledSeq)return!1;for(let[e,n]of t.views)if(this.list.has(e)&&(this._finishSeq.get(e)??0)<n)return!1;return!0}finishEmptyScene(){if(this.list.size!==0)return;this.drainAll();let t=this._fenceWaiters;this._fenceWaiters=[];for(let e of t)e.resolve()}handleFinish(t,e){typeof t=="number"&&t>this._lastSettledSeq&&(this._lastSettledSeq=t),typeof t=="number"&&e!==void 0&&t>(this._finishSeq.get(e)??0)&&this._finishSeq.set(e,t),this.drainAll(),this.resolveReadyWaiters()}resolveReadyWaiters(){if(this._fenceWaiters.length===0)return;let t=[],e=[];for(let n of this._fenceWaiters)this.isSettled(n)?t.push(n.resolve):e.push(n);if(t.length!==0){this._fenceWaiters=e;for(let n of t)n()}}drainAll(){for(;this.requests.arePending;){let t=this.requests.list.shift();t&&(this.processTileRequest(t),this._onUpdate())}}update(){let t=performance.now();for(;this.requests.arePending;){let e=this.requests.list.shift();if(e&&(this.processTileRequest(e),this._onUpdate(),performance.now()-t>this.updateThreshold))return}}setTileData(t,e){let{tileId:n,itemId:s,matrix:r,aabb:o}=e;this.setMeshData(t,n,s,r),this.setupBoundings(t,o),this.updateStatus(t,e)}processTileRequest(t){let{tileRequestClass:e,tileId:n,modelId:s}=t,r=this.list.get(s);if(r)if(e===Ke.CREATE){if(t.objectClass===void 0)return;let o=this.create(t);this.setTileData(o,t);let a=this.extractUniqueItemIds(t.itemIds);o.userData.itemIds=a,this.trackVisibleItems(r,a,!0),r.tiles.set(o.userData.tileId,o)}else if(e===Ke.DELETE){let o=r.tiles.get(n);o?.userData.itemIds&&this.trackVisibleItems(r,o.userData.itemIds,!1),r.tiles.delete(n)}else if(e===Ke.UPDATE){let o=r.tiles.get(n);o&&this.updateStatus(o,t)}else e===Ke.FINISH&&r._finishProcessing()}extractUniqueItemIds(t){let e=new Set;if(!t)return e;for(let n=0;n<t.length;n++)e.add(t[n]);return e}trackVisibleItems(t,e,n){for(let s of e)n?t.visibleItems.add(s):t.visibleItems.delete(s)}createMesh(t){let{indices:e,positions:n,normals:s,itemIds:r,faceIds:o}=t,a=new Be;this.setIndex(a,e),this.setPositions(n,a),this.setNormals(s,a),this.setItemIds(r,a),this.setFaceIds(o,a);let c=this.materials.getFromRequest(t);return new Re(a,[c])}setupBoundings(t,e){let{geometry:n}=t,s=new we().copy(e),r=new Rn;s.getBoundingSphere(r),n.boundingBox=s,n.boundingSphere=r}create(t){if(t.objectClass===rr.SHELL)return this.createMesh(t);if(t.objectClass===rr.LINE){let e=new Be;return this.lod.createMesh(e,t)}throw new Error(`Fragments: object class ${t.objectClass} is not supported.`)}updateStatus(t,e){let{tileData:{highlightData:n,visibilityData:s},currentLod:r}=e,{geometry:o}=t;if(o.clearGroups(),r!==Ui.WIRES&&this.applyCompactIndex(o,s,!!n)||(this.lod.processMesh(t,e),!n))return;if(r===Ui.WIRES){this.lod.applyHighlight(t,e);return}let a=this.materials.createHighlights(t,e);t.material=a}applyCompactIndex(t,e,n){let s=t.userData.fullIndex,r=t.index;if(!s||!r)return!1;let o=e?e.position.length:0;if(n||o<jd.compactMinRuns)return this.restoreFullIndex(t,s),!1;let a=r.array,{position:c,size:l}=e,h=0;for(let u=0;u<o;u++){let d=c[u],p=l[u]===this.white?s.length:Math.min(s.length,d+l[u]);p<=d||(a.set(s.subarray(d,p),h),h+=p-d)}return r.needsUpdate=!0,t.setDrawRange(0,h),t.addGroup(0,h,0),t.userData.compactIndex=!0,!0}restoreFullIndex(t,e){if(!t.userData.compactIndex)return;let n=t.index;n.array.set(e),n.needsUpdate=!0,t.setDrawRange(0,1/0),t.userData.compactIndex=!1}cleanAttributeMemory(t,e){t.attributes[e].onUpload(this.deleteAttribute(t))}setPositions(t,e){if(!t)throw new Error("Fragments: no positions provided to create the mesh.");e.setAttribute("position",new Ie(t,3)),this.cleanAttributeMemory(e,"position")}setFaceIds(t,e){t&&(e.setAttribute("color",new Ie(t,3)),this.cleanAttributeMemory(e,"color"))}setIndex(t,e){if(!e)throw new Error("Fragments: no indices provided to create the mesh.");let n=e,s=n.slice();t.setIndex(new Ie(s,1)),t.userData.fullIndex=n,t.userData.compactIndex=!1}setNormals(t,e){t&&e.setAttribute("normal",new Ie(t,3,!0)),this.cleanAttributeMemory(e,"normal")}setItemIds(t,e){t&&(e.setAttribute("id",new Ie(t,4,!1)),this.cleanAttributeMemory(e,"id"))}deleteAttribute(t){function e(){delete this.array}return e}setMeshData(t,e,n,s){t.userData={tileId:e,itemId:n},t.matrixAutoUpdate=!1,t.applyMatrix4(s),t.matrix.copy(s),t.matrixWorldNeedsUpdate=!0,t.updateWorldMatrix=A1}};v(jd,"compactMinRuns",3);var $d=jd;function V0(i){if(i.length<2)return!0;let t=(i[0]&15)===8,e=(i[0]<<8|i[1])%31===0;return!(t&&e)}var hi=class hi{constructor(t,e){v(this,"onModelLoaded",new yn);v(this,"models");v(this,"settings",{autoCoordinate:!0,maxUpdateRate:100,graphicsQuality:0,forceUpdateRate:200,forceUpdateBuffer:200,meshConnectionRate:16,meshConnectionThreshold:4,threadUpdaterDelay:32});v(this,"baseCoordinates",null);v(this,"editor");v(this,"_connection");v(this,"_progressCallbacks",new Map);v(this,"_isDisposed",!1);v(this,"_autoRedrawInterval",null);v(this,"_lastUpdate",0);v(this,"_pendingForcedUpdate",null);v(this,"_pendingForcedTimer",null);v(this,"_pendingForcedResolve",null);let n=t??Dg(),s=this.newRequestEvent(),r=this.newUpdateEvent();this._connection=new Fh(s,n,{classicWorker:e?.classicWorker,maxWorkers:e?.maxWorkers,threadGroups:e?.threadGroups}),this.editor=new Xd(this,this._connection),this.models=new $d(r),this.models.list.onItemDeleted.add(()=>{this.models.list.size===0&&(this.baseCoordinates=null)})}static async getWorker(){if(hi._workerURL)return hi._workerURL;if(hi._workerPromise)return hi._workerPromise;hi._workerPromise=(async()=>{let t=`https://unpkg.com/@thatopen/fragments@${Uf}/dist/Worker/worker.mjs`,e=await fetch(t);if(!e.ok)throw new Error(`Failed to fetch fragments worker from ${t}: ${e.status} ${e.statusText}`);let n=await e.blob(),s=new File([n],"worker.mjs",{type:"text/javascript"}),r=URL.createObjectURL(s);return hi._workerURL=r,r})();try{return await hi._workerPromise}catch(t){throw hi._workerPromise=null,t}}get maxWorkers(){return this._connection.maxWorkers}get threadGroups(){return this._connection.threadGroups}async load(t,e){this._connection.setModelThreadGroup(e.modelId,e.threadGroup);let n={...e.virtualModelConfig,multithreading:{meshConnectionRate:this.settings.meshConnectionRate,meshConnectionThreshold:this.settings.meshConnectionThreshold,threadUpdaterDelay:this.settings.threadUpdaterDelay,...e.virtualModelConfig?.multithreading}},s=new Co(e.modelId,this.models,this._connection,this.editor,e.threadGroup);e.userData&&(s.object.userData=e.userData),s.frozen=!0,s.graphicsQuality=this.settings.graphicsQuality,e.onProgress&&this._progressCallbacks.set(e.modelId,e.onProgress);let r=t instanceof Uint8Array?t:new Uint8Array(t),o=e.raw??V0(r);try{if(this.models.list.set(s.modelId,s),await s._setup(t,o,n),this.settings.autoCoordinate){let l=await s.getCoordinates();if(this.baseCoordinates===null)this.baseCoordinates=l;else{let[h,u,d]=l,[f,p,b]=this.baseCoordinates,g=new R(f-h,p-u,b-d);s.object.position.add(g)}}}catch(l){this._progressCallbacks.delete(e.modelId);try{await s.dispose()}catch{this.models.list.delete(s.modelId)}throw l}finally{this._progressCallbacks.delete(e.modelId)}let{camera:a,clippingPlanes:c}=e;return a&&s.useCamera(a),c&&s.useClippingPlanes(c),s.frozen=!1,this.onModelLoaded.trigger(s),s}async dispose(){this._isDisposed=!0,this._autoRedrawInterval&&(clearTimeout(this._autoRedrawInterval),this._autoRedrawInterval=null),this._pendingForcedTimer&&(clearTimeout(this._pendingForcedTimer),this._pendingForcedTimer=null),this._pendingForcedResolve&&(this._pendingForcedResolve(),this._pendingForcedResolve=null),this._pendingForcedUpdate=null;let t=Array.from(this.models.list.values()),e=[];for(let n of t)e.push(n.dispose());await Promise.all(e),this.onModelLoaded.reset()}async disposeModel(t){let e=this.models.list.get(t);e&&await e.dispose()}abort(t){this._connection.fetch({class:Je.ABORT_MODEL,modelId:t})}async update(t=!1){if(this._isDisposed)return;let n=performance.now()-this._lastUpdate;if(n<this.settings.maxUpdateRate){if(!t){this.scheduleNextUpdate();return}if(!this._pendingForcedUpdate){let s=this.settings.maxUpdateRate-n+1;this._pendingForcedUpdate=new Promise(r=>{this._pendingForcedResolve=r,this._pendingForcedTimer=setTimeout(()=>{this._pendingForcedTimer=null,this._pendingForcedResolve=null,this._pendingForcedUpdate=null,this.performUpdate(!0).then(r,()=>r())},s)})}return this._pendingForcedUpdate}return this.performUpdate(t)}async performUpdate(t){if(this._isDisposed)return;this._lastUpdate=performance.now();let e=[];for(let n of this.models.list.values())e.push(n._refreshView(t));await Promise.all(e),t?await this.models.forceUpdateFinish():this.models.update(),this.scheduleNextUpdate()}scheduleNextUpdate(){if(this._isDisposed||this.models.list.size===0)return;this._autoRedrawInterval&&clearTimeout(this._autoRedrawInterval);let t=this.settings.maxUpdateRate+1;this._autoRedrawInterval=setTimeout(()=>{this._autoRedrawInterval=null,this.update()},t)}async manageRequest(t){if(t.class===Je.LOAD_PROGRESS){let n=this._progressCallbacks.get(t.modelId);n&&n({modelId:t.modelId,stage:t.stage,progress:t.progress});return}let e=this.models.list.get(t.modelId);e&&await e.handleRequest(t)}newUpdateEvent(){return()=>{if(this._isDisposed)return;this._autoRedrawInterval&&clearTimeout(this._autoRedrawInterval);let t=this.settings.maxUpdateRate+1;this._autoRedrawInterval=setTimeout(()=>{this._autoRedrawInterval=null,this.update()},t)}}newRequestEvent(){return t=>{this.manageRequest(t)}}};v(hi,"_workerURL",null),v(hi,"_workerPromise",null);var ml=hi;var Mp=new URL(".",import.meta.url).href;async function I1(i,t){return(await import(Mp+"ifc-import.js")).convert(i,t,Mp)}function R1(i,t={}){let e=new Ih({antialias:!0,powerPreference:"high-performance"});e.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),e.localClippingEnabled=!0,i.appendChild(e.domElement),e.domElement.style.cssText="display:block;width:100%;height:100%;touch-action:none";let n=new ta;n.background=new kt(t.bg||15659507);let s=new dn(45,1,.3,3e3);n.add(new wa(16777215,8952234,2.2));let r=new Ta(16777215,1.5);r.position.set(60,120,40),n.add(r);let o=new Lh(s,e.domElement);o.enableDamping=!0,o.dampingFactor=.12,o.screenSpacePanning=!0,o.touches={ONE:xi.ROTATE,TWO:xi.DOLLY_PAN};let a=new ml(Mp+"visor3d-worker.js"),c=new Map,l=new De(new R(0,-1,0),0),h=!1,u=!0,d="",f=!0,p=null,b=new we,g=()=>{let U=i.clientWidth||1,W=i.clientHeight||1;e.setSize(U,W,!1),s.aspect=U/W,s.updateProjectionMatrix(),u=!0},m=new ResizeObserver(g);m.observe(i),g(),o.addEventListener("change",()=>{u=!0});let M=0,w=()=>{if(h)return;requestAnimationFrame(w);let U=o.update(),W=performance.now();(u||U)&&(e.render(n,s),W-M>120&&(M=W,a.update()),u=!1)};w();async function _(U){let W=await U.getSpatialStructure(),K=[],G=Wt=>{if(Wt.category==="IFCBUILDINGSTOREY"){(Wt.children||[]).forEach(It=>{It.localId!=null&&K.push(It)});return}(Wt.children||[]).forEach(G)};G(W);let D=Wt=>{let It=[],Ht=$=>{$.localId!=null&&It.push($.localId),($.children||[]).forEach(Ht)};return(Wt.children||[]).forEach(Ht),It},Z=[],ct=new Set;try{let Wt=await U.getItemsOfCategories([/IFCSLAB/]);ct=new Set(Object.values(Wt).flat())}catch{}let Mt=async Wt=>{let It=Wt.filter(Tt=>ct.has(Tt));if(!It.length)return null;let Ht=await U.getBoxes(It),$=new Map;for(let Tt of Ht){let ht=Math.round(Tt.max.y*20)/20,Gt=(Tt.max.x-Tt.min.x)*(Tt.max.z-Tt.min.z);$.set(ht,($.get(ht)||0)+Gt)}let nt=null,mt=0;for(let[Tt,ht]of $)ht>mt&&(mt=ht,nt=Tt);return nt};U.__slabs=ct.size;for(let Wt of K){let It=D(Wt);if(!It.length)continue;let Ht=(await U.getItemsData([Wt.localId],{attributesDefault:!0}))[0]||{},$=Ht.Name&&Ht.Name.value||"Nivel "+Wt.localId,nt=await U.getMergedBox(It),mt=Ht.Elevation&&typeof Ht.Elevation.value=="number"?Ht.Elevation.value:null,Tt=U.object.position.y,ht=await Mt(It).catch(()=>null);Z.push({name:$,key:E($),ids:It,y0:nt.min.y+Tt,elev:mt,floor:ht==null?null:ht+Tt})}return Z}function E(U){return String(U).replace(/^\s*\d+\s*[.-]\s*/,"").trim().toUpperCase()}let T=U=>/FL$/.test(U);function I(){let U=null;for(let{levels:W}of c.values()){let K=-1/0;for(let G of W)G.elev!=null&&(K=Math.max(K,G.y0-G.elev));K>-1/0&&(U==null||K<U)&&(U=K)}return U??0}function y(){let U=new Map;for(let{levels:D}of c.values())for(let Z of D)U.get(Z.key)||U.set(Z.key,{key:Z.key,name:Z.key,elev:Z.elev});let W=[...U.values()].sort((D,Z)=>(D.elev??0)-(Z.elev??0)),K=W.filter(D=>!T(D.key)),G=new Map;for(let D of W){if(!T(D.key)){G.set(D.key,D.key);continue}let Z=K.find(ct=>(ct.elev??0)>=(D.elev??0)-.01&&(ct.elev??0)-(D.elev??0)<.8);G.set(D.key,Z?Z.key:D.key)}return{main:W.filter(D=>G.get(D.key)===D.key),map:G}}let A=U=>{let{main:W,map:K}=y(),G=[...c.values()].sort((D,Z)=>(Z.slabs||0)-(D.slabs||0));for(let{levels:D}of G)for(let Z of D)if(K.get(Z.key)===U&&Z.key===U&&Z.floor!=null)return Z.floor;return L(U,W,K)},L=(U,W,K)=>{let G=W.find(Z=>Z.key===U);if(!G||G.elev==null)return null;let D=[];for(let{levels:Z}of c.values())for(let ct of Z)ct.floor!=null&&ct.elev!=null&&K.get(ct.key)===ct.key&&D.push(ct.floor-ct.elev);return D.sort((Z,ct)=>Z-ct),G.elev+(D.length?D[D.length>>1]:I())};function N(){let U=d?A(d):null;U!=null&&(l.constant=U+1.3),e.clippingPlanes=d&&f&&U!=null?[l]:[],u=!0}async function k(){let{map:U}=y();for(let{model:W,levels:K}of c.values()){if(!d){await W.setVisible(void 0,!0);continue}await W.setVisible(void 0,!1);let G=K.filter(D=>U.get(D.key)===d).flatMap(D=>D.ids);G.length&&await W.setVisible(G,!0)}N(),await a.update(!0),u=!0}function V(U){let W=U.getCenter(new R),K=U.getSize(new R),G=Math.max(K.x,K.z)||50;s.position.set(W.x+G*.55,W.y+G*.75,W.z+G*.75),o.target.copy(W),s.near=G/500,s.far=G*20,s.updateProjectionMatrix(),o.update(),u=!0}let O={async add(U,W){let K=await a.load(W,{modelId:U,camera:s});n.add(K.object),await a.update(!0);let G=await _(K).catch(()=>[]);c.set(U,{model:K,levels:G,slabs:K.__slabs||0});let D=new we().setFromObject(K.object);if(!D.isEmpty()){let Z=b.isEmpty();b.union(D),Z&&V(b)}return d&&await k(),u=!0,{levels:G.map(Z=>Z.name)}},async visible(U,W){let K=c.get(U);K&&(K.model.object.visible=W,await a.update(!0),u=!0)},has:U=>c.has(U),levels:()=>y().main.map(U=>U.key),async setLevel(U){d=U||"",await k();let W=d?A(d):null;if(W!=null){let K=b.getCenter(new R),G=b.getSize(new R),D=W+1.3;s.position.set(K.x,D+Math.max(G.x,G.z)*.55,K.z+Math.max(G.x,G.z)*.35),o.target.set(K.x,D-1.3,K.z),o.update()}else V(b)},cut(U){f=!!U,N()},cutAt(U){l.constant=U,e.clippingPlanes=[l],u=!0},reset(){V(b)},pick(U){p=U},destroy(){h=!0,m.disconnect(),o.dispose();try{a.dispose()}catch{}e.dispose(),i.innerHTML=""},lv:()=>({off:I(),main:y().main.map(U=>[U.key,A(U.key)])}),stats:()=>({models:c.size,calls:e.info.render.calls,tris:e.info.render.triangles})},H=null;return e.domElement.addEventListener("pointerdown",U=>{H={x:U.clientX,y:U.clientY,t:performance.now()}}),e.domElement.addEventListener("pointerup",async U=>{if(!H||!p||Math.hypot(U.clientX-H.x,U.clientY-H.y)>6||performance.now()-H.t>400)return;let W=new ut(U.clientX,U.clientY),K=e.clippingPlanes.length?l.constant:1/0,G=null;for(let[ct,{model:Mt}]of c){if(!Mt.object.visible)continue;let Wt=await Mt.raycastAll({camera:s,mouse:W,dom:e.domElement}).catch(()=>null)||[];for(let It of Wt)(!It.point||It.point.y<=K+.01)&&(!G||It.distance<G.hit.distance)&&(G={id:ct,hit:It,model:Mt})}if(!G){p(null);return}let D=(await G.model.getItemsData([G.hit.localId],{attributesDefault:!0}))[0]||{},Z=ct=>D[ct]&&D[ct].value;p({modelo:G.id,nombre:Z("Name"),tipo:Z("ObjectType"),categoria:D._category&&D._category.value,tag:Z("Tag")})}),O}window.Visor3D={convert:I1,create:R1};
