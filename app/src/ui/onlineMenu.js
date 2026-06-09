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



const createBnt = document.getElementById('createCreate');
createBnt.onclick=(e)=>{
    const baseText = createBnt.innerHTML;
    createBnt.disabled=true;
    // ... try to join room
    createBnt.innerHTML='Creating ...';
    Director.network().createRoom(1,(data)=>{
        console.log(data);
        createBnt.innerHTML=baseText;
        createBnt.disabled=false;
        Director.network().joinRoom(data.roomId,(errorMessage)=>{
            Director.setSceen("main",null);
        });
    });
};