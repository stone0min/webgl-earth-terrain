const canvas=document.querySelector('#gl');
const gl=canvas.getContext('webgl2',{antialias:true});
if(!gl){document.querySelector('#status').textContent='이 브라우저는 WebGL2를 지원하지 않습니다.';throw new Error('WebGL2 unavailable')}

const vs=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in float aHeight;
layout(location=3) in float aLand;
uniform mat4 uMvp;
uniform mat4 uModel;
uniform mat3 uNormal;
uniform float uScale;
out vec3 vPos;
out vec3 vNormal;
out float vHeight;
out float vLand;
void main(){
  vec3 p=normalize(aPos)*(1.0+aHeight*uScale);
  vec4 world=uModel*vec4(p,1.0);
  vPos=world.xyz;
  vNormal=normalize(uNormal*aNormal);
  vHeight=aHeight;
  vLand=aLand;
  gl_Position=uMvp*vec4(p,1.0);
}`;

const fs=`#version 300 es
precision highp float;
in vec3 vPos;
in vec3 vNormal;
in float vHeight;
in float vLand;
uniform vec3 uLight;
uniform vec3 uEye;
out vec4 outColor;
void main(){
  float h=clamp(vHeight/0.045,0.0,1.0);
  vec3 deep=vec3(0.018,0.10,0.28);
  vec3 shallow=vec3(0.03,0.34,0.62);
  vec3 low=vec3(0.10,0.43,0.12);
  vec3 high=vec3(0.46,0.31,0.14);
  vec3 snow=vec3(0.92,0.94,0.92);
  float depth=clamp(-vHeight/0.012,0.0,1.0);
  vec3 ocean=mix(shallow,deep,depth);
  vec3 land=mix(low,high,smoothstep(0.08,0.56,h));
  land=mix(land,snow,smoothstep(0.58,0.88,h));
  vec3 base=mix(ocean,land,smoothstep(0.42,0.58,vLand));
  vec3 n=normalize(vNormal);
  vec3 l=normalize(uLight-vPos);
  vec3 v=normalize(uEye-vPos);
  vec3 r=reflect(-l,n);
  float diff=max(dot(n,l),0.0);
  float spec=pow(max(dot(r,v),0.0),32.0)*(0.12+0.35*(1.0-vLand));
  float rim=pow(1.0-max(dot(n,v),0.0),3.0);
  vec3 color=base*(0.16+0.84*diff)+vec3(spec)+vec3(0.03,0.13,0.22)*rim;
  outColor=vec4(color,1.0);
}`;

function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog));

const rad=d=>d*Math.PI/180;
function decodeHeight(){const raw=atob(ETOPO.values),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Int16Array(bytes.buffer)}
const heights=decodeHeight();
function sample(lon,lat){
  const gx=((lon<0?lon+360:lon)-ETOPO.lon0)/ETOPO.step;
  const gy=(Math.max(ETOPO.lat0,Math.min(89.0083333333,lat))-ETOPO.lat0)/ETOPO.step;
  const x0=((Math.floor(gx)%ETOPO.cols)+ETOPO.cols)%ETOPO.cols,x1=(x0+1)%ETOPO.cols;
  const y0=Math.max(0,Math.min(ETOPO.rows-1,Math.floor(gy))),y1=Math.min(ETOPO.rows-1,y0+1);
  const tx=gx-Math.floor(gx),ty=gy-y0;
  const a=heights[y0*ETOPO.cols+x0]*(1-tx)+heights[y0*ETOPO.cols+x1]*tx;
  const b=heights[y1*ETOPO.cols+x0]*(1-tx)+heights[y1*ETOPO.cols+x1]*tx;
  const meters=a*(1-ty)+b*ty,land=meters>=0?1:0;
  const h=land?Math.min(meters/8849*0.052,0.052):Math.max(meters/11000*0.012,-0.012);
  return [h,land];
}

function sphere(rows=180,cols=360){
  const v=[],idx=[];
  for(let y=0;y<=rows;y++){
    const lat=90-y*180/rows,phi=rad(lat);
    for(let x=0;x<=cols;x++){
      const lon=-180+x*360/cols,th=rad(lon);
      const cp=Math.cos(phi),px=cp*Math.sin(th),py=Math.sin(phi),pz=cp*Math.cos(th);
      const [h,land]=sample(lon,lat);
      v.push(px,py,pz,px,py,pz,h,land);
    }
  }
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const a=y*(cols+1)+x,b=a+cols+1;
    idx.push(a,b,a+1,b,a+1,b+1);
  }
  return [new Float32Array(v),new Uint32Array(idx)];
}
const [verts,inds]=sphere();
const vao=gl.createVertexArray();gl.bindVertexArray(vao);
const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STATIC_DRAW);
const stride=8*4;
gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,stride,0);
gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,stride,12);
gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,1,gl.FLOAT,false,stride,24);
gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,1,gl.FLOAT,false,stride,28);
const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,inds,gl.STATIC_DRAW);

const mat4={
  id:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
  mul:(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o},
  rotX:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1])},
  rotY:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1])},
  persp:(f,asp,n,fa)=>{const q=1/Math.tan(f/2),nf=1/(n-fa);return new Float32Array([q/asp,0,0,0,0,q,0,0,0,0,(fa+n)*nf,-1,0,0,2*fa*n*nf,0])},
  trans:(x,y,z)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1])
};

const spin=document.querySelector('#spin'),height=document.querySelector('#height'),light=document.querySelector('#light');
for(const el of [spin,height,light])el.addEventListener('input',()=>document.querySelector('#'+el.id+'Value').value=el.value);
let paused=false,yaw=-0.55,pitch=-0.22,drag=false,lastX=0,lastY=0,t0=performance.now(),earth=0,lightAngle=0;
document.querySelector('#pause').onclick=()=>{paused=!paused;document.querySelector('#pause').textContent=paused?'회전 시작':'회전 정지'};
document.querySelector('#reset').onclick=()=>{yaw=-0.55;pitch=-0.22;earth=0;lightAngle=0;spin.value=18;height.value=55;light.value=12;for(const el of [spin,height,light])document.querySelector('#'+el.id+'Value').value=el.value};
canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-lastX)*0.008;pitch=Math.max(-1.35,Math.min(1.35,pitch+(e.clientY-lastY)*0.008));lastX=e.clientX;lastY=e.clientY});
canvas.addEventListener('pointerup',()=>drag=false);

const loc=n=>gl.getUniformLocation(prog,n),uMvp=loc('uMvp'),uModel=loc('uModel'),uNormal=loc('uNormal'),uScale=loc('uScale'),uLight=loc('uLight'),uEye=loc('uEye');
gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0.018,0.026,0.052,1);
function draw(now){
  const dt=Math.min((now-t0)/1000,.05);t0=now;
  if(!paused)earth+=dt*(+spin.value)*0.012;
  lightAngle+=dt*(+light.value)*0.009;
  const dpr=Math.min(devicePixelRatio,2),w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientWidth*620/900*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(prog);gl.bindVertexArray(vao);
  let model=mat4.mul(mat4.rotY(yaw+earth),mat4.rotX(pitch));
  const view=mat4.trans(0,0,-3.1),proj=mat4.persp(rad(42),w/h,.1,20),mvp=mat4.mul(proj,mat4.mul(view,model));
  gl.uniformMatrix4fv(uMvp,false,mvp);gl.uniformMatrix4fv(uModel,false,model);
  gl.uniformMatrix3fv(uNormal,false,new Float32Array([model[0],model[1],model[2],model[4],model[5],model[6],model[8],model[9],model[10]]));
  gl.uniform1f(uScale,+height.value/100*1.8);
  gl.uniform3f(uLight,3.2*Math.cos(lightAngle),1.3,3.2*Math.sin(lightAngle));gl.uniform3f(uEye,0,0,3.1);
  gl.drawElements(gl.TRIANGLES,inds.length,gl.UNSIGNED_INT,0);requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
