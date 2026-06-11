
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


/**
 * Import a file from client
 * @param {*} callback callback with the file data
 * @param {*} targetFile target file type
 * @param {*} mode mode of data traitment
 */
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

/**
 * Load a level file from client
 * @param {*} callback
 */
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


/**
 * Fetech a level file from a url
 * @param {*} callback
 * @param {*} path path (url)
 */
export function fetchLevelFile(callback,path){
    fetch(path)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {callback(data)})
    .catch(error => callback(null));
}
