import { MathUtils } from "./utils.js";
import { Vector } from "./vector.js";
export class AnimationSystem{
    constructor(values){
        this.values=values;
        this.t = 0;
        this.states = [];
        this.actualState=null;
        this.lastState=null;
        this.transitionT=0;
        this.pause=false;
    }

    addState(name,fnc,duration,stepInTime,loop){
        this.states[name]={
            name:name,
            fnc : fnc,
            t : 0,
            duration:duration,
            stepInTime:stepInTime,
            loop:loop
        }
    }

    #transition(source,target,t){
        let result={};
        for (const key in this.values) {
            if (Object.hasOwnProperty.call(this.values, key)) {
                if(!Object.hasOwnProperty.call(target, key)){
                    continue;
                }
                if(!Object.hasOwnProperty.call(source, key)){
                    result[key]=target[key];
                    continue;
                }

                let type = typeof this.values[key];
                if(type === "object"){
                    type = this.values[key].constructor.name;
                }

                switch(type){
                    case "Vector" :
                        result[key]=Vector.lerp(source[key],target[key],t);
                    break;

                    case "number" :
                        result[key] = MathUtils.lerp(source[key],target[key],t);
                    break;

                    default:

                        result[key]=target[key];
                    break;
                }
            }
        }
        return result;
    }

    setState(name){
        if(this.states[name]===undefined)return;
        if(this.actualState!==null && name===this.actualState.name)return;
        this.lastState=this.actualState;
        this.actualState=this.states[name];
        this.actualState.t=0;
        this.transitionT=0;
    }

    #updateState(state,t){


        if(state.loop){
            state.t=(state.t+t)%state.duration;
            return;
        }

        if(state.t>state.duration){
            state.t=state.duration;
        }else if(state.t<state.duration){
            state.t=+state.t + t;
        }
    }

    #getStateValue(state){
        return state.fnc(state.t/state.duration);
    }

    #setValue(key,newValue){
        if(!Object.hasOwnProperty.call(this.values, key))return;
        if(this.values[key] instanceof Vector){
            this.values[key].set(newValue);
            return;
        }
        this.values[key]=newValue;
    }

    inTransition(){
        return(this.lastState!==null && this.transitionT<this.actualState.stepInTime);
    }


    update(t){
        if(this.pause)return;
        if(this.actualState===null)return;
        this.#updateState(this.actualState,t);

        let targetValue = null;
        // transition ?
        if(this.inTransition()){
            this.#updateState(this.lastState,t);
            this.transitionT+=t;
            console.log("transition : "+this.transitionT);
            targetValue = this.#transition(this.#getStateValue(this.lastState),this.#getStateValue(this.actualState),this.transitionT/this.actualState.stepInTime);
        }
        else{
            targetValue = this.#getStateValue(this.actualState);
        }

        for (const key in this.values) {
            if (Object.hasOwnProperty.call(this.values, key) && Object.hasOwnProperty.call(targetValue, key)) {
                this.#setValue(key,targetValue[key]);
            }
        }
    }

    get(){
        return this.values;
    }
}