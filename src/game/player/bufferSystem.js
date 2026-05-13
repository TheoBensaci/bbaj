export class Buffer{
    constructor(checkFunction,lifeTime){
        this.check=checkFunction;
        this.lifeTime=lifeTime;
        this.actualLifeTime=0;
        this.state=false;
    }

    reset(){
        this.actualLifeTime=this.lifeTime;
        this.state=false;
    }

    consume(){
        if(!this.state)return false;
        this.clear();
        return true;
    }

    clear(){
        this.actualLifeTime=0;
        this.state=false;
    }
}

export class BufferSystem{
    constructor(lenght){
        this.buffer={}
    }

    step(t){
        for (const key in this.buffer) {
            if (Object.hasOwnProperty.call(this.buffer, key)) {
                const value = this.buffer[key];
                if(value.actualLifeTime<=0)continue;
                if(value.check()){
                    value.actualLifeTime=0;
                    value.state=true;
                }
                else{
                    value.actualLifeTime-=t;
                }
            }
        }
    }


    register(name,buffer){
        this.buffer[name]=buffer;
    }

    init(name){
        if(this.buffer[name]!==undefined){
            this.buffer[name].reset();
        }
    }

    consume(name){
        if(this.buffer[name]!==undefined){
            return this.buffer[name].consume();
        }
        return false;
    }

    clear(name){
        if(this.buffer[name]!==undefined){
            return this.buffer[name].clear();
        }
    }

    has(name){
        if(this.buffer[name]!==undefined){
            return this.buffer[name].state || this.buffer[name].actualLifeTime>0;
        }
        return false;
    }
}