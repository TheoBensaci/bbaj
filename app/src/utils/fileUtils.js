
/**
 * Export a object to json and download it
 * @param {string} filename
 * @param {object} data
 */
export function downloadJsonFile(filename, data) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(data)));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}


export function importFile(callback,targetFile='*',mode='text'){
    const buffer = document.createElement("input");
    buffer.type = "file";
    buffer.click();
    buffer.accept=targetFile;
    buffer.onchange=(e)=>{
        const fl = new FileReader();
        fl.addEventListener("load",(e)=>{
            callback(e);
        })

        const file = e.target.files[0];
        switch(mode){
            case 'array':fl.readAsArrayBuffer(file);break;
            case 'url':fl.readAsDataURL(file);break;
            default:fl.readAsText(file);break;
        }
    }
}


export function loadLevelFromFile(callback){
    importFile((e)=>{
        try{
            const data = JSON.parse(e.target.result);
            callback(data);
            return;
        }
        catch(e){
            callback(null);
        }
    },"application/JSON","text");
}
