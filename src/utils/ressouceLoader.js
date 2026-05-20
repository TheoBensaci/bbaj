export class RessourceLoader{

    static #instance=null;

    constructor(){
        this.map=new Map();
    }

    static getRessourceLoader(){
        if(RessourceLoader.#instance===null){
            RessourceLoader.#instance=new RessourceLoader();
        }
        return RessourceLoader.#instance;
    }


    /**
     * get the ressource from the path
     * @param {string} path
     */
    get(path){
        if(!this.map.has(path))return null;
        return this.map.get(path);
    }

    /**
     * set the ressource at the path set
     * @param {*} path
     * @param {*} value
     */
    set(path,value){
        this.map.set(path,value);
    }

    /**
     *
     * @param {path} paths list image path
     * @param {*} callback
     */
    preload_Image(paths, callback){
        this.loadNext_Image(paths,0,callback);
    }

    loadNext_Image(paths,index,callback){
        const img = new Image();
        img.onload=(index===paths.length-1)?callback:()=>{
            return this.loadNext_Image(paths,index+1,callback);
        };
        img.src=paths[index];
        this.set(paths[index],img);
    }

}