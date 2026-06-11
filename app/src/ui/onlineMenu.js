import { Director } from "../director.js";

document.getElementById('joinCode').addEventListener("input",(e)=>{
    const value = e.target.value;
    joinBnt.disabled = value.length===0;
});


const joinBnt = document.getElementById('joinJoin');
joinBnt.onclick=(e)=>{
    const baseText = joinBnt.innerHTML;
    joinBnt.disabled=true;
    // ... try to join room
    joinBnt.innerHTML='Joining ...';
    const id = document.getElementById("joinCode").value;
    Director.network().checkRoom(
        id,
        (data)=>{
            joinBnt.disabled=false;
            joinBnt.innerHTML=baseText;
            if(data!==null){
                Director.network().joinRoom(id,(errorMessage)=>{
                    Director.setSceen("main",null);
                });
            }
        }
    );
};


const mapIdInput = document.getElementById('createMapId');

const createBnt = document.getElementById('createCreate');
createBnt.onclick=(e)=>{
    const baseText = createBnt.innerHTML;
    createBnt.disabled=true;
    // ... try to join room
    createBnt.innerHTML='Creating ...';
    Director.network().createRoom(mapIdInput.value,(data)=>{
        createBnt.innerHTML=baseText;
        createBnt.disabled=false;
        if(data===null)return;
        Director.network().joinRoom(data.roomId,(errorMessage)=>{
            Director.setSceen("main",null);
        });
    });
};


export function genMapList(maps){
    mapIdInput.value="";
    const mapContainer = document.getElementById('mapContainer');
    mapContainer.innerHTML="";
    createBnt.disabled=true;

    for (const iterator of maps) {
        const el = document.createElement("div");
        el.className="mapEntry";

        const name = document.createElement("label");
        name.innerText=iterator.name;
        name.className="mapName";
        el.appendChild(name);

        const mapId = document.createElement("label");
        mapId.innerText=iterator.id;
        mapId.className="mapId";
        el.appendChild(mapId);

        el.onclick=()=>{
            mapIdInput.value=iterator.id;
            createBnt.disabled=mapIdInput.value.length===0;
        }

        mapContainer.appendChild(el);
    }
}



mapIdInput.addEventListener("input",(e)=>{
    const value = e.target.value;
    createBnt.disabled = value.length===0;
});