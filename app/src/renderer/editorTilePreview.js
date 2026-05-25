/**
 * @ Autheur: Theo Bensaci
 * @ Date: 13:25 25.05.2026
 * @ Description: Tile preview, can be use for the editor, handle showing tile + can be use to show state like remove like a kind of cursor
 */


export class EditorTilePreview{
    constructor(previewDiv,render){
        this.render=render;
        this.div = previewDiv;


        const children = previewDiv.childNodes;
        for (const node of children) {
            if (node instanceof HTMLCanvasElement) {
                this.width = node.width;
                this.height = node.height;
                this.canvas=node;
                break;
            }
        }

        this.context=this.canvas.getContext('2d');
        this.context.imageSmoothingEnabled = false;
    }


    /**
     * Set a tile by tile data
     * @param {*} data
     */
    setTile(data){
        this.setState("");
        this.render.exportTileSprite(this.context,120, 120, data);
    }

    /**
     * Set the tile preview state
     * @param {*} state "" = none, "remove" = remove icon
     */
    setState(state){
        if(state===""){
            this.canvas.hidden=false;
            this.div.className ="";
            return;
        }
        this.canvas.hidden=true;
        if(state==="remove"){
            this.div.classList.add("removeIcon");
        }
    }

    /**
     * Hide the tile preview
     * @param {*} state
     */
    hide(state){
        this.div.hidden=state;
    }

}