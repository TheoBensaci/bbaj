export class RessourceLoader{
    static #instance = null;

    constructor() {
        this.map = new Map();
    }

    static getInstance() {
        if (RessourceLoader.#instance === null) {
            RessourceLoader.#instance = new RessourceLoader();
        }
        return RessourceLoader.#instance;
    }

    /**
     * get the ressource from the path
     * @param {string} path
     */
    get(path) {
        if (!this.map.has(path)) return null;
        return this.map.get(path);
    }

    /**
     * set the ressource at the path set
     * @param {*} path
     * @param {*} value
     */
    set(path, value) {
        this.map.set(path, value);
    }

    /**
     *
     * @param {path} paths list image path
     * @param {*} callback
     */
    preloadImage(paths, callback){
        let count = paths.length;
        for (const path of paths) {
            const img = new Image();
            img.onload=()=>{
                count--;
                if(count===0){
                    callback();
                }
            };
            img.src=path;
            this.set(path,img);
        }
    }
}
