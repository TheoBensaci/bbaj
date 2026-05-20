/**
 * @ Autheur: Theo Bensaci
 * @ Date: 13:38 17.05.2026
 * @ Description: The tile index is use to map tile to a specique id, this is to for parsing a level into actual game object
 */


export class TileIndex{
    static #data = new Map();

    /**
     * Create a new group of tile
     * @param {*} groupID
     */
    static createGroup(groupID){
        if(TileIndex.#data.has(groupID)){
            throw new Error("Group ID '"+groupID+"' all ready exist");
        }

        TileIndex.#data.set(groupID,[]);
    }

    /**
     * Register a tile
     * @param {string} groupID group id
     * @param {Class} TileClass Tile class
     * @returns
     */
    static registerTile(groupID,TileClass){
        if(!TileIndex.#data.has(groupID)){
            throw new Error("Group ID '"+groupID+"' dosn't exist");
        }

        const id = TileIndex.#data.get(groupID).length;
        TileIndex.#data.get(groupID).push(TileClass);
        return id;
    }

    /**
     * Create a tile with parameters
     * @param {*} groupID
     * @param {*} id
     * @param {*} params
     * @returns
     */
    static createTile(groupID,id,params=[]){
        if(!TileIndex.#data.has(groupID)){
            throw new Error("Group ID '"+groupID+"' dosn't exist");
        }
        const tileGroup = TileIndex.#data.get(groupID);
        if(id<0 || tileGroup.length <= id ){
            console.log(tileGroup);
            throw new Error("ID '"+id+"' dosn't exist in the group '"+groupID+"'");
        }
        return tileGroup[id].createTile(params);
    }
}

