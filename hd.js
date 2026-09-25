
(
    function()
    {
  var $=function(i){return document.getElementById(i)};
  var drop=$('drop'),box=$('stagebox'),file=$('file'),info,stage,out,orig,cmp;
  var img=null,name='photo',scale=2,timer=null,busy=false,again=false,MAXPX=16e6;

  function pick(){file.click()}
  drop.addEventListener('click',pick);
  drop.addEventListener('keydown',
    function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();pick()}});
  $('new').addEventListener('click',pick);
  file.addEventListener('change',function(){if(file.files[0])load(file.files[0]);file.value=''});
  ['dragover','dragenter'].forEach(function(t){box.addEventListener(t,function(e){e.preventDefault();drop.classList.add('over')})});
  ['dragleave','drop'].forEach(function(t){box.addEventListener(t,function(e){e.preventDefault();drop.classList.remove('over')})});
  box.addEventListener('drop',function(e){var f=e.dataTransfer.files[0];if(f)load(f)});

  function load(f){
    if(!f.type||f.type.indexOf('image/')!==0){setInfo('That file is not an image. Choose a JPG, PNG or WebP file.');return}
    name=(f.name||'photo').replace(/\.[^.]+$/,'');
    var url=URL.createObjectURL(f),im=new Image();
    im.onload=function(){img=im;buildStage(url);$('dl').disabled=false;$('new').disabled=false;run()};
    im.onerror=function(){setInfo('This image could not be read. Try another file.')};
    im.src=url;
  }

  function buildStage(url){
    box.innerHTML='<div class="stage" id="stage"><canvas id="out"></canvas><img id="orig" alt="Original photo"><div class="bar"></div><span class="tag l">Before</span><span class="tag r">After</span></div>'+
      '<input class="cmp" id="cmp" type="range" min="0" max="100" value="50" aria-label="Compare before and after"><p class="info" id="info"></p>';
    stage=$('stage');out=$('out');orig=$('orig');cmp=$('cmp');info=$('info');
    orig.src=url;
    stage.style.setProperty('--r',img.naturalWidth/img.naturalHeight);
    cmp.addEventListener('input',function(){stage.style.setProperty('--p',cmp.value+'%')});
  }
  function setInfo(t){if(info)info.textContent=t;else{var p=box.querySelector('.drop span');if(p)p.textContent=t}}

  function schedule(){clearTimeout(timer);timer=setTimeout(run,250)}
  ['sharp','contrast','sat'].forEach(function(id){
    $(id).addEventListener('input',function(){$('o_'+id).textContent=$(id).value;if(img)schedule()});
  });
  document.querySelectorAll('#seg button').forEach(function(b){
    b.addEventListener('click',function(){
      scale=+b.dataset.s;
      document.querySelectorAll('#seg button').forEach(function(x){x.setAttribute('aria-pressed',x===b)});
      if(img)schedule();
    });
  });

  function run(){
    if(busy){again=true;return}
    busy=true;setInfo('Enhancing…');
    setTimeout(function(){try{enhance()}catch(e){setInfo('Not enough memory for this size. Try a smaller size or photo.')}busy=false;if(again){again=false;run()}},30);
  }

  function enhance(){
    var w=img.naturalWidth,h=img.naturalHeight,s=scale;
    while(s>1&&w*s*h*s>MAXPX)s--;
    var tw=Math.round(w*s),th=Math.round(h*s);
    var cur=document.createElement('canvas');cur.width=w;cur.height=h;cur.getContext('2d').drawImage(img,0,0);
    while(cur.width<tw){
      var nw=Math.min(cur.width*2,tw),nh=Math.min(cur.height*2,th),c=document.createElement('canvas');
      c.width=nw;c.height=nh;var x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(cur,0,0,nw,nh);cur=c;
    }
    var amt=+$('sharp').value,k=+$('contrast').value,sat=+$('sat').value;
    var id=cur.getContext('2d').getImageData(0,0,tw,th),src=id.data,dst=new Uint8ClampedArray(src.length);
    var r=Math.max(1,Math.round(s/2)),W=tw,H=th,a=amt*0.5;
    for(var y=0;y<H;y++){
      var yu=(y-r<0?0:y-r)*W,yd=(y+r>=H?H-1:y+r)*W,yc=y*W;
      for(var xx=0;xx<W;xx++){
        var xl=xx-r<0?0:xx-r,xr=xx+r>=W?W-1:xx+r,i=(yc+xx)*4,
            iu=(yu+xx)*4,idn=(yd+xx)*4,il=(yc+xl)*4,ir=(yc+xr)*4,R,G,B;
        R=src[i]+a*(4*src[i]-src[iu]-src[idn]-src[il]-src[ir]);
        G=src[i+1]+a*(4*src[i+1]-src[iu+1]-src[idn+1]-src[il+1]-src[ir+1]);
        B=src[i+2]+a*(4*src[i+2]-src[iu+2]-src[idn+2]-src[il+2]-src[ir+2]);
        var g=0.299*R+0.587*G+0.114*B;
        dst[i]=(g+(R-g)*sat-128)*k+128;
        dst[i+1]=(g+(G-g)*sat-128)*k+128;
        dst[i+2]=(g+(B-g)*sat-128)*k+128;
        dst[i+3]=src[i+3];
      }
    }
    out.width=tw;out.height=th;out.getContext('2d').putImageData(new ImageData(dst,tw,th),0,0);
    var capped=s<scale?' (reduced from '+scale+'x to fit the size limit)':'';
    setInfo(w+' × '+h+' → '+tw+' × '+th+' px'+capped);
  }

  $('dl').addEventListener('click',async function(){
    if(!out)return;
    var blob=await new Promise(function(r){out.toBlob(r,'image/png')});
    if(!blob){setInfo('Could not create the file.');return}
    try{
      var d=window.claude&&await window.claude.use('downloads');
      if(d){await d.save({filename:name+'-hd.png',data:blob});setInfo('Saved '+name+'-hd.png');return}
    }catch(e){if(e&&e.code==='declined')return}
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name+'-hd.png';document.body.appendChild(a);a.click();a.remove();
    setInfo('If nothing downloaded, right-click or long-press the enhanced image to save it.');
  });
})();