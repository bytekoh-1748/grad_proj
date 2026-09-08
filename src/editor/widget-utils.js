export function monthCells(year,month){
  const first=new Date(year,month,1),days=new Date(year,month+1,0).getDate();
  return Array.from({length:42},(_,i)=>{const day=i-first.getDay()+1;return day>0&&day<=days?day:null;});
}
/** A small four-function calculator; input is handled as data, never evaluated. */
export class Calculator {
  constructor(){this.clear();}
  clear(){this.display='0';this.left=null;this.operator=null;this.fresh=true;this.last=null;}
  input(key){
    if(key==='AC'){this.clear();return this.display;}
    if(/^\d$/.test(key)){if(this.fresh&&!this.operator)this.last=null;if(this.fresh||this.display==='0'||this.display==='Error')this.display=key;else if(this.display.replace(/[-.]/g,'').length<12)this.display+=key;this.fresh=false;}
    else if(key==='.'){if(this.fresh||this.display==='Error')this.display='0';if(!this.display.includes('.'))this.display+='.';this.fresh=false;}
    else if(key==='⌫'){if(!this.fresh){this.display=this.display.slice(0,-1);if(!this.display||this.display==='-')this.display='0';}}
    else if(key==='±'){if(this.display!=='0'&&this.display!=='Error')this.display=this.display.startsWith('-')?this.display.slice(1):'-'+this.display;}
    else if(key==='%'){this.display=this.format(Number(this.display)/100);}
    else if(['+','−','×','÷','='].includes(key)){
      const right=Number(this.display);
      if(this.display==='Error')return this.display;
      if(this.operator&&(!this.fresh||key==='=')){
        this.display=this.calculate(this.left,right,this.operator);this.last={right,operator:this.operator};
      }else if(key==='='&&this.last&&!this.operator)this.display=this.calculate(right,this.last.right,this.last.operator);
      if(this.display==='Error'){this.left=null;this.operator=null;this.last=null;}
      else{this.left=Number(this.display);this.operator=key==='='?null:key;}
      this.fresh=true;
    }
    return this.display;
  }
  format(value){return Number.isFinite(value)?String(Number(value.toPrecision(12))):'Error';}
  calculate(a,b,op){return this.format(op==='+'?a+b:op==='−'?a-b:op==='×'?a*b:b===0?NaN:a/b);}
}
export const PIXEL_COLORS=['#111418','#ecebd7','#edff52','#c2b3ed','#ff7353'];
export function initialPixels(){return Array.from({length:256},(_,i)=>{const x=i%16,y=Math.floor(i/16),dx=x-7.5,dy=y-6;return Math.abs(dx)<1&&y>7?2:Math.hypot(dx,dy)<2?2:Math.hypot(dx,dy)<4.8?3:0;});}
export function decodePixels(content){return /^[0-4]{256}$/.test(content)?[...content].map(Number):initialPixels();}
