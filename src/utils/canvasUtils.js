export function init_canvas(canvas_container,width,height){
    const buffer = [];

    if(canvas_container.hasChildNodes()){
        const children = canvas_container.childNodes;
        for (const node of children) {
            console.log(node)
            node.width=width;
            node.height=height;
            if(node instanceof HTMLCanvasElement)buffer.push(node);
        }
    }

    canvas_container.style.height=height+"px";
    canvas_container.style.width=width+"px";
    console.log(canvas_container);

    return buffer;
}