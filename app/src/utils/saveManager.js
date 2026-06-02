

export function getSaveItem(name){
    return JSON.parse(localStorage.getItem(name));
}

export function setSaveItem(name,value){
    return localStorage.setItem(name,JSON.stringify(value));
}

export function hasSaveItem(name){
    return localStorage.getItem(name)!==null;
}

function getInputKeyName(contextName,action){
    return contextName+":"+action;
}

export function getSaveInputKey(contextName,action){
    return getSaveItem(getInputKeyName(contextName,action));
}

export function setSaveInputKey(contextName,action,keys){
    return setSaveItem(getInputKeyName(contextName,action),keys);
}