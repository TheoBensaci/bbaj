/**
 * @ Autheur: Theo Bensaci
 * @ Date: 12:15 02.06.2026
 * @ Description: manage save data
 */


/**
 * Get a save data
 * @param {*} name name of the data
 * @returns {Object}
 */
export function getSaveItem(name){
    if(localStorage.getItem(name)===undefined)return null;
    return JSON.parse(localStorage.getItem(name));
}

/**
 * Save a save data
 * @param {*} name name of the data
 * @param {*} value value of the data
 * @returns {Object}
 */
export function setSaveItem(name,value){
    return localStorage.setItem(name,JSON.stringify(value));
}

/**
 * If the save item is existing
 * @param {*} name
 * @returns
 */
export function hasSaveItem(name){
    return localStorage.getItem(name)!==null;
}

/**
 * Get a input save item name
 * @param {*} contextName input context name
 * @param {*} action action name
 * @returns name of the save item
 */
function getInputKeyName(contextName,action){
    return contextName+":"+action;
}

/**
 * Get input keys settings of a input action from saves items
 * @param {*} contextName input context name
 * @param {*} action action name
 * @returns
 */
export function getSaveInputKey(contextName,action){
    return getSaveItem(getInputKeyName(contextName,action));
}

/**
 * Save input keys settings of a input action into a save item
 * @param {*} contextName input context name
 * @param {*} action action name
 * @returns
 */
export function setSaveInputKey(contextName,action,keys){
    return setSaveItem(getInputKeyName(contextName,action),keys);
}