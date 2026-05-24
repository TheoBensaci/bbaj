/**
 * set all canavas of the canvas container to the correct width/height
 * @param {Node} canvasContainer
 * @param {number} width in px
 * @param {number} height in px
 * @returns list of canavas found in the canvas container
 */
export function initCanvas(canvasContainer, width, height) {
    const buffer = [];

    if (canvasContainer.hasChildNodes()) {
        const children = canvasContainer.childNodes;
        for (const node of children) {
            if (node instanceof HTMLCanvasElement) {
                node.width = width;
                node.height = height;
                buffer.push(node);
            }
        }
    }

    canvasContainer.style.height = height + 'px';
    canvasContainer.style.width = width + 'px';

    return buffer;
}
