/**
 * set all canavas of the canvas container to the correct width/height
 * @param {Node} canvas_container
 * @param {number} width in px
 * @param {number} height in px
 * @returns list of canavas found in the canvas container
 */
export function init_canvas(canvas_container,width,height){
    const buffer = [];

    if(canvas_container.hasChildNodes()){
        const children = canvas_container.childNodes;
        for (const node of children) {
            if(node instanceof HTMLCanvasElement){
                node.width=width;
                node.height=height;
                buffer.push(node);
            }
        }
    }

    canvas_container.style.height=height+"px";
    canvas_container.style.width=width+"px";

    return buffer;
}