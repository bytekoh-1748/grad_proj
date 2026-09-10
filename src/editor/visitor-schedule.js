/** Seedable irregular visits: a quiet interval, then one to three individual departures. */
export class VisitorSchedule {
  constructor(seed=Date.now()){this.seed=seed>>>0;this.time=0;this.remaining=0;this.batchOpen=false;this.nextAt=1.5+this.random()*2;}
  random(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
  tick(dt,active,mouthBusy,available=true){
    this.time+=Math.max(0,dt);
    if(this.batchOpen&&active===0&&this.remaining===0){this.batchOpen=false;this.nextAt=this.time+5+this.random()*12;}
    if(this.time<this.nextAt||mouthBusy||active>=3||!available)return false;
    if(!this.batchOpen){const n=this.random();this.remaining=n<.45?1:n<.8?2:3;this.batchOpen=true;}
    if(!this.remaining)return false;
    this.remaining--;this.nextAt=this.time+5+this.random()*12;return true;
  }
}
