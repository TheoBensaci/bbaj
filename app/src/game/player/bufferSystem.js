/**
 * @ Autheur: Theo Bensaci
 * @ Date: 13:13 13.05.2026
 * @ Description: Buffer system
 */

export class Buffer{
    /**
     * Make a new buffer entry
     * @param {Callback} checkFunction function use to check if the buffer is resolve
     * @param {number} lifeTime max life time of the buffer
     */
    constructor(checkFunction,lifeTime){
        this.check=checkFunction;
        this.lifeTime=lifeTime;
        this.actualLifeTime=0;
        this.state=false;
    }

    /**
     * Rest the buffer
     */
    reset(){
        this.actualLifeTime=this.lifeTime;
        this.state=false;
    }

    /**
     * Consume the buffer
     * @returns {boolean} true if the buffer asn't bean consume and has resolve, else false
     */
    consume(){
        if(!this.state)return false;
        this.clear();
        return true;
    }

    /**
     * Clear the buffer
     */
    clear(){
        this.actualLifeTime=0;
        this.state=false;
    }
}

export class BufferSystem{
    constructor(){
        this.buffer={}
    }

    /**
     * Buffer system update
     * @param {number} t delta t
     */
    update(t){
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


    /**
     * register new buffer to this system
     * @param {string} name name of the buffer
     * @param {Buffer} buffer
     */
    register(name,buffer){
        this.buffer[name]=buffer;
    }

    /**
     * Start a specific buffer
     * @param {string} name buffer name
     */
    init(name){
        if(this.buffer[name]!==undefined){
            this.buffer[name].reset();
        }
    }

    /**
     * Consume a specific buffer
     * @param {string} name buffer name
     * @returns {boolean} consume result
     */
    consume(name){
        if(this.buffer[name]!==undefined){
            return this.buffer[name].consume();
        }
        return false;
    }

    /**
     * clear a specific buffer
     * @param {string} name buffer name
     */
    clear(name){
        if(this.buffer[name]!==undefined){
            this.buffer[name].clear();
        }
    }

    /**
     * check if a specific the buffer is running
     * @param {string} name buffer name
     */
    has(name){
        if(this.buffer[name]!==undefined){
            return this.buffer[name].state || this.buffer[name].actualLifeTime>0;
        }
        return false;
    }

    clearAll(){
        for (const key in this.buffer) {
            if (Object.hasOwnProperty.call(this.buffer, key)) {
                this.buffer[key].clear();
            }
        }
    }
}