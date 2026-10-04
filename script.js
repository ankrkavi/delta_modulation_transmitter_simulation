const $=id=>document.getElementById(id);
const controls=['signalType','amplitude','frequency','sampling','stepSize','samples','speed'];
let data={input:[],stair:[],bits:[],times:[],errors:[],idx:-1,running:false,timer:null};

function params(){return{type:$('signalType').value,A:+$('amplitude').value,f:+$('frequency').value,fs:+$('sampling').value,d:+$('stepSize').value,N:+$('samples').value,speed:+$('speed').value}}
function signal(t,p){
  const phase=(p.f*t)%1;
  if(p.type==='sine') return p.A*Math.sin(2*Math.PI*p.f*t);
  if(p.type==='triangle') return p.A*(4*Math.abs(phase-.5)-1);
  return phase<.5?p.A:-p.A;
}
function build(){
  stop();
  const p=params(), T=p.N/p.fs;
  data={input:[],stair:[],bits:[],times:[],errors:[],idx:-1,running:false,timer:null};
  let prev=0;
  for(let n=0;n<p.N;n++){
    const t=n/p.fs, x=signal(t,p), bit=x>prev?1:0;
    const next=prev+(bit?p.d:-p.d);
    data.input.push(x); data.times.push(t); data.bits.push(bit); data.stair.push(next);
    data.errors.push(Math.abs(x-next)); prev=next;
  }
  drawAll(); updateStats(); updateDecision();
  $('bitString').textContent='—';
  $('statusBadge').textContent='READY';
}
function setupCanvas(c){
  const dpr=devicePixelRatio||1, r=c.getBoundingClientRect(), w=Math.max(300,r.width), h=Math.max(180,r.height);
  c.width=w*dpr;c.height=h*dpr;const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return{ctx,w,h};
}
function axes(ctx,w,h,minY,maxY){
  ctx.strokeStyle='#1b3147';ctx.lineWidth=1;
  for(let i=0;i<=8;i++){let x=45+(w-60)*i/8;ctx.beginPath();ctx.moveTo(x,10);ctx.lineTo(x,h-28);ctx.stroke()}
  for(let i=0;i<=4;i++){let y=10+(h-38)*i/4;ctx.beginPath();ctx.moveTo(45,y);ctx.lineTo(w-15,y);ctx.stroke()}
  const y0=10+(h-38)*(maxY/(maxY-minY));ctx.strokeStyle='#37506a';ctx.beginPath();ctx.moveTo(45,y0);ctx.lineTo(w-15,y0);ctx.stroke()
}
function mapY(v,min,max,h){return 10+(h-38)*(max-v)/(max-min)}
function drawWave(id,arr,opts={}){
  const c=$(id),{ctx,w,h}=setupCanvas(c),p=params(), all=data.input.concat(data.stair), max=Math.max(p.A*1.25,...all.map(Math.abs),.3), min=-max;
  axes(ctx,w,h,min,max);
  const left=45,right=w-15,top=10,bottom=h-28;
  const xmap=i=>left+(right-left)*(i/(Math.max(1,p.N-1)));
  if(opts.continuous){
    ctx.strokeStyle='#58b8ff';ctx.lineWidth=2;ctx.beginPath();
    const points=Math.max(250,p.N*5);
    for(let k=0;k<points;k++){let t=(p.N/p.fs)*k/(points-1),x=signal(t,p),px=left+(right-left)*k/(points-1),py=mapY(x,min,max,h);k?ctx.lineTo(px,py):ctx.moveTo(px,py)}
    ctx.stroke();
  }else{
    ctx.strokeStyle=opts.color||'#5ee0b5';ctx.lineWidth=2;ctx.beginPath();
    arr.forEach((v,i)=>{let x=xmap(i),y=mapY(v,min,max,h);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
  }
  if(data.idx>=0){
    const x=xmap(data.idx);ctx.strokeStyle='#ffcc66';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(x,8);ctx.lineTo(x,h-25);ctx.stroke();ctx.setLineDash([]);
    const v=arr[data.idx]??data.input[data.idx],y=mapY(v,min,max,h);ctx.fillStyle='#ffcc66';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle='#637c96';ctx.font='10px Segoe UI';ctx.fillText('time →',w-55,h-8);ctx.fillText(max.toFixed(1),8,14);ctx.fillText(min.toFixed(1),8,h-29);
}
function drawSamples(){
  const c=$('sampleCanvas'),{ctx,w,h}=setupCanvas(c),p=params(),max=Math.max(p.A*1.25,...data.input.map(Math.abs),.3),min=-max;axes(ctx,w,h,min,max);
  const left=45,right=w-15,xmap=i=>left+(right-left)*i/(p.N-1);
  ctx.strokeStyle='#31506a';ctx.lineWidth=1;ctx.beginPath();
  data.input.forEach((v,i)=>{let x=xmap(i),y=mapY(v,min,max,h);ctx.moveTo(x,mapY(0,min,max,h));ctx.lineTo(x,y)});ctx.stroke();
  data.input.forEach((v,i)=>{let x=xmap(i),y=mapY(v,min,max,h);ctx.fillStyle=i===data.idx?'#ffcc66':'#58b8ff';ctx.beginPath();ctx.arc(x,y,i===data.idx?5:2.5,0,Math.PI*2);ctx.fill()});
}
function drawBits(){
  const c=$('bitCanvas'),{ctx,w,h}=setupCanvas(c),p=params();ctx.clearRect(0,0,w,h);
  const left=45,right=w-15,mid=h/2, step=(right-left)/p.N;
  ctx.strokeStyle='#1b3147';ctx.beginPath();ctx.moveTo(left,mid);ctx.lineTo(right,mid);ctx.stroke();
  data.bits.forEach((b,i)=>{let x=left+i*step,y=b?mid-55:mid+15;ctx.strokeStyle=i===data.idx?'#ffcc66':'#5ee0b5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,mid);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle=i===data.idx?'#ffcc66':'#5ee0b5';ctx.font='bold 11px monospace';ctx.fillText(String(b),x+2,b?y-5:y+15)});
  ctx.fillStyle='#637c96';ctx.font='10px Segoe UI';ctx.fillText('1 = UP',8,mid-58);ctx.fillText('0 = DOWN',8,mid+28);
}
function drawAll(){drawWave('inputCanvas',data.input,{continuous:true});drawSamples();drawWave('stairCanvas',data.stair,{color:'#5ee0b5'});drawBits()}
function updateLabels(){const p=params();$('ampVal').textContent=p.A.toFixed(2)+' V';$('freqVal').textContent=p.f+' Hz';$('fsVal').textContent=p.fs+' Hz';$('stepVal').textContent=p.d.toFixed(2)+' V';$('samplesVal').textContent=p.N;$('speedVal').textContent=p.speed+' ms'}
function updateStats(){
  const p=params();$('sFs').textContent=p.fs+' Hz';$('sFreq').textContent=p.f+' Hz';$('sAmp').textContent=p.A.toFixed(2)+' V';$('sDelta').textContent=p.d.toFixed(2)+' V';$('sBitRate').textContent=p.fs+' bit/s';$('sBits').textContent=Math.max(0,data.idx+1);
  const e=data.idx>=0?data.errors.slice(0,data.idx+1):[];if(e.length){$('sAvgErr').textContent=(e.reduce((a,b)=>a+b,0)/e.length).toFixed(3)+' V';$('sMaxErr').textContent=Math.max(...e).toFixed(3)+' V';$('sMse').textContent=(e.reduce((a,b)=>a+b*b,0)/e.length).toFixed(4)}else{$('sAvgErr').textContent='—';$('sMaxErr').textContent='—';$('sMse').textContent='—'}
}
function updateDecision(){
  const i=data.idx;if(i<0){['dSample','dInput','dPrev','dCompare','dBit','dNew'].forEach(x=>$(x).textContent='—');$('liveBit').textContent='—';$('sampleTime').textContent='t = 0.000 s';return}
  const p=params(),x=data.input[i],prev=i?data.stair[i-1]:0,b=data.bits[i],next=data.stair[i];
  $('dSample').textContent='#'+(i+1);$('dInput').textContent=x.toFixed(3)+' V';$('dPrev').textContent=prev.toFixed(3)+' V';$('dCompare').textContent=x>prev?x.toFixed(3)+' > '+prev.toFixed(3):x.toFixed(3)+' ≤ '+prev.toFixed(3);$('dBit').textContent=b;$('dBit').style.color=b?'#5ee0b5':'#ff9eaa';$('dNew').textContent=next.toFixed(3)+' V';$('liveBit').textContent=b;$('sampleTime').textContent='t = '+data.times[i].toFixed(3)+' s';
  $('explanationText').innerHTML=b?`Input is <b>greater</b> than the previous staircase value, so the transmitter sends <b>1</b> and increases the staircase by Δ (${p.d.toFixed(2)} V).`:`Input is <b>smaller than or equal to</b> the previous staircase value, so the transmitter sends <b>0</b> and decreases the staircase by Δ (${p.d.toFixed(2)} V).`;
  $('bitString').textContent=data.bits.slice(0,i+1).join('');
}
function analysis(){
  const p=params(), completed=data.idx>=0?data.idx+1:0;
  if(!completed){$('overloadBox').className='warning neutral';$('overloadBox').querySelector('span').textContent='Not detected';$('granularBox').className='warning neutral';$('granularBox').querySelector('span').textContent='Not detected';return}
  let overload=0,gran=0;
  for(let i=1;i<completed;i++){const inputSlope=Math.abs(data.input[i]-data.input[i-1]);if(inputSlope>p.d*1.15)overload++;const err=data.errors[i];if(inputSlope<p.d*.35 && err>p.d*.45)gran++}
  const op=overload/Math.max(1,completed-1),gp=gran/Math.max(1,completed-1);
  $('overloadBox').className='warning '+(op>.08?'bad':'neutral');$('overloadBox').querySelector('span').textContent=op>.08?'Detected: input is changing faster than ±Δ can follow.':'Not detected';
  $('granularBox').className='warning '+(gp>.12?'warn':'neutral');$('granularBox').querySelector('span').textContent=gp>.12?'Detected: Δ is large relative to local signal changes.':'Not detected';
}
function highlight(block){['blockInput','blockComp','blockQuant','blockInt'].forEach(id=>$(id).classList.remove('active'));if(block)$(block).classList.add('active')}
function render(){drawAll();updateStats();updateDecision();analysis()}
function stepOnce(){
  if(data.idx>=params().N-1){stop();$('statusBadge').textContent='COMPLETE';highlight(null);return}
  data.idx++;highlight('blockComp');setTimeout(()=>{highlight('blockQuant');setTimeout(()=>{highlight('blockInt');render();setTimeout(()=>highlight(null),180)},90)},90);render();
}
function start(){if(data.running)return;data.running=true;$('statusBadge').textContent='RUNNING';data.timer=setInterval(()=>{if(data.idx>=params().N-1){stop();$('statusBadge').textContent='COMPLETE';return}stepOnce()},params().speed)}
function stop(){data.running=false;if(data.timer){clearInterval(data.timer);data.timer=null}}
function reset(){stop();build()}
function preset(name){
  const set=(id,v)=>$(id).value=v;
  if(name==='normal'){set('signalType','sine');set('amplitude',1);set('frequency',2);set('sampling',40);set('stepSize',.15)}
  if(name==='overload'){set('signalType','sine');set('amplitude',1);set('frequency',8);set('sampling',30);set('stepSize',.05)}
  if(name==='granular'){set('signalType','sine');set('amplitude',1);set('frequency',1);set('sampling',40);set('stepSize',.5)}
  if(name==='highfs'){set('signalType','sine');set('amplitude',1);set('frequency',3);set('sampling',160);set('stepSize',.1)}
  if(name==='lowfs'){set('signalType','sine');set('amplitude',1);set('frequency',4);set('sampling',20);set('stepSize',.15)}
  if(name==='smalldelta'){set('signalType','sine');set('amplitude',1);set('frequency',2);set('sampling',80);set('stepSize',.04)}
  if(name==='largedelta'){set('signalType','sine');set('amplitude',1);set('frequency',2);set('sampling',40);set('stepSize',.5)}
  updateLabels();build()
}
controls.forEach(id=>$(id).addEventListener('input',()=>{updateLabels();build()}));
$('start').onclick=start;$('pause').onclick=()=>{stop();$('statusBadge').textContent='PAUSED'};$('step').onclick=()=>{stop();$('statusBadge').textContent='STEP';stepOnce()};$('reset').onclick=reset;
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>preset(b.dataset.preset));
$('learning').onchange=e=>$('formulaPanel').classList.toggle('hidden',!e.target.checked);
window.addEventListener('resize',()=>{if(data)render()});
updateLabels();build();