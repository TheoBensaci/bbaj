export class InputKey{

    constructor(keys){
        this.keys=keys;
        this.pressed=false;
    }

    setPress(value){
        this.pressed=value;
    }

}


export class Input{

    static left = new InputKey(['a']);
    static right = new InputKey(['d']);
    static up = new InputKey(['w']);
    static down = new InputKey(['s']);
    static jump = new InputKey([' ','k']);
    static action = new InputKey(['j','shift']);



    static init(window){
        window.addEventListener("keydown", (event) =>
            {
                for (const key in Input) {
                    if (Object.hasOwnProperty.call(Input, key)) {
                        const el = Input[key];
                        if(el instanceof InputKey){
                            if(el.keys.includes(event.key))el.setPress(true);
                        }
                    }
                }
            }
        );

        window.addEventListener("keyup", (event) =>
            {
                for (const key in Input) {
                    if (Object.hasOwnProperty.call(Input, key)) {
                        const el = Input[key];
                        if(el instanceof InputKey){
                            if(el.keys.includes(event.key))el.setPress(false);
                        }
                    }
                }
            }
        );
    }

    static getInputs(){
        const buffer = [];
        for (const key in Input) {
            if (Object.hasOwnProperty.call(Input, key)) {
                const el = Input[key];
                if(el instanceof InputKey){
                    buffer.push({name : key,keys : el.keys});
                }
            }
        }
        return buffer;
    }

    static setInput(name,key){

    }

}