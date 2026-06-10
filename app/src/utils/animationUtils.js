import { MathUtils } from "./utils.js";
import { Vector } from "./vector.js";


export function animationLerp(values,source,target,t){
    let result={};
    for (const key in values) {
        if (Object.hasOwnProperty.call(values, key)) {
            if(!Object.hasOwnProperty.call(target, key)){
                continue;
            }
            if(!Object.hasOwnProperty.call(source, key)){
                result[key]=target[key];
                continue;
            }

            let type = typeof values[key];
            if(type === "object"){
                type = values[key].constructor.name;
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


export class AnimationSystem{
    constructor(values){
        this.values=values;
        this.t = 0;
        this.states = [];
        this.actualState=null;
        this.lastState=null;
        this.transitionT=0;
        this.pause=false;
        this.addTransition={};
    }

    addState(name,fnc,duration,stepInTime,loop,onfinish=()=>{}){
        this.states[name]={
            name:name,
            fnc : fnc,
            t : 0,
            duration:duration,
            stepInTime:stepInTime,
            loop:loop,
            finish:false,
            onfinish:onfinish
        }
    }

    setTransitionTime(from,to,duration){
        const name = this.#getTransitionName(from,to);
        this.addTransition[name]=duration;
    }

    #getTransitionName(from,to){
        return from+"-"+to;
    }

    #getTransitionTime(from,to){
        if(this.addTransition[this.#getTransitionName(from,to)]!==undefined)return this.addTransition[this.#getTransitionName(from,to)];
        return this.states[to].stepInTime;
    }


    setState(name){
        if(this.states[name]===undefined)return;
        if(this.actualState!==null && name===this.actualState.name){
            return;
        }

        this.lastState=this.actualState;
        this.actualState=this.states[name];
        this.actualState.t=0;
        this.transitionT=0;
        this.actualState.finish=false;
    }

    #updateState(state,t){

        const v = state.t+t;
        if(!state.finish && v>=state.duration){
            state.onfinish();
            state.finish=!state.loop;
        }

        if(state.loop){
            state.t=v%state.duration;
            return;
        }
        else {
            state.t=MathUtils.clamp(v,0,state.duration);
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
        return(this.lastState!==null && this.transitionT<this.#getTransitionTime(this.lastState.name,this.actualState.name));
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
            targetValue = animationLerp(
                this.values,
                this.#getStateValue(this.lastState),
                this.#getStateValue(this.actualState),
                this.transitionT/this.#getTransitionTime(this.lastState.name,this.actualState.name)
            );
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




/**
 * Values
 * @param {*} values [{value:values,t:t}]
 * @param {*} t
 */
export function keyFames(values,t){
    if(values.length===0)return {};
    if(values.length<2)return values[0];
    for (let index = 0; index < values.length; index++) {
        const element = values[index];
        if(element.t<t && index<values.length-1 && values[index+1].t>t){
            const delta = values[index+1].t-element.t;
            return animationLerp(element.value,element.value,values[index+1].value,(t-element.t)/delta);
        }
    }
    return values[values.length-1].value;
}